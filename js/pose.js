// Estimación de pose en el navegador con MediaPipe (corre en el celular: el
// video no se sube a ningún lado).

// Se puede cambiar desde la página (por ejemplo, para las pruebas).
export const CONFIG = {
  mediapipe: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1",
};

// Dos modos de análisis. "Preciso" usa el modelo más grande (heavy, ~30 MB
// contra ~9 MB) y el doble de cuadros por segundo, para movimientos rápidos:
// tarda unas 4 veces más.
export const MODOS = {
  rapido: {
    modelo: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    cuadrosPorSegundo: 15,
  },
  preciso: {
    modelo: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
    cuadrosPorSegundo: 30,
    // El heavy informa visibilidades más bajas que el full para los mismos
    // puntos (en el video real de sentadilla, la rodilla: mediana 0,58 contra
    // 0,97), y con el umbral de 0,5 se descartaban cuadros buenos. Se
    // reescalan para que los umbrales signifiquen lo mismo en los dos modos.
    escalaVisibilidad: 1.7,
  },
};

// Un detector por modo: el primero que se usa queda cargado.
const detectores = {};

async function crearDetector(modelo) {
  const { FilesetResolver, PoseLandmarker } = await import(`${CONFIG.mediapipe}/vision_bundle.mjs`);
  const archivos = await FilesetResolver.forVisionTasks(`${CONFIG.mediapipe}/wasm`);
  const opciones = (delegate) => ({
    baseOptions: { modelAssetPath: modelo, delegate },
    runningMode: "VIDEO",
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(archivos, opciones("GPU"));
  } catch {
    // Celulares o navegadores sin WebGL: más lento, pero anda.
    return await PoseLandmarker.createFromOptions(archivos, opciones("CPU"));
  }
}

// Si el navegador no avisa que terminó de saltar a un cuadro en este tiempo,
// se deja de saltar y se recorre el video reproduciéndolo.
const ESPERA_SALTO = 4000; // ms

/**
 * Espera un evento del video. Con `ms`, devuelve false si no llegó a tiempo
 * (sin `ms` espera siempre). Rechaza si el video da error.
 */
function esperar(video, evento, ms) {
  return new Promise((resolver, rechazar) => {
    let reloj = null;
    const ok = () => { limpiar(); resolver(true); };
    const error = () => { limpiar(); rechazar(new Error("No se pudo leer el video")); };
    const limpiar = () => {
      clearTimeout(reloj);
      video.removeEventListener(evento, ok);
      video.removeEventListener("error", error);
    };
    video.addEventListener(evento, ok, { once: true });
    video.addEventListener("error", error, { once: true });
    if (ms) reloj = setTimeout(() => { limpiar(); resolver(false); }, ms);
  });
}

/**
 * Deja el video listo para leer cuadros. En iPhone (Safari, y Chrome que
 * usa el mismo motor) el video no carga imágenes hasta reproducirlo una vez,
 * así que se lo reproduce y pausa enseguida (está sin sonido).
 */
async function prepararVideo(video) {
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  if (video.readyState < 1) await esperar(video, "loadedmetadata");
  if (video.readyState < 2) {
    try { await video.play(); } catch { /* si no deja reproducir, se sigue igual */ }
    video.pause();
    if (video.readyState < 2) await esperar(video, "loadeddata", ESPERA_SALTO);
  }
}

/**
 * Plan B: recorre el video reproduciéndolo, para navegadores que no avisan
 * al saltar. En cada cuadro a analizar pausa, analiza y sigue: así no se
 * saltea cuadros aunque el modelo sea lento. Sigue desde `desde` segundos.
 */
function recorrerReproduciendo(video, resultado, desde, paso, analizarCuadro, alAvanzar) {
  return new Promise((resolver, rechazar) => {
    let ultimo = desde - paso;
    let terminado = false;
    const seguir = () => video.play().catch((e) => rechazar(new Error(`No se pudo reproducir el video (${e.message})`)));
    const cuadro = (t) => {
      if (terminado) return;
      esperarCuadro();
      if (t - ultimo < paso * 0.9) return;
      ultimo = t;
      video.pause();
      analizarCuadro(t);
      alAvanzar(Math.min(1, t / video.duration));
      if (!video.ended) seguir();
    };
    let pedido = 0;
    const esperarCuadro = () => {
      pedido = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback((_, meta) => cuadro(meta.mediaTime))
        : requestAnimationFrame(() => cuadro(video.currentTime));
    };
    video.addEventListener("ended", () => {
      terminado = true;
      video.cancelVideoFrameCallback?.(pedido);
      cancelAnimationFrame(pedido);
      resolver(resultado);
    }, { once: true });
    video.currentTime = desde;
    esperarCuadro();
    seguir();
  });
}

/**
 * Recorre el video cuadro a cuadro y devuelve [{t, landmarks, mundo}]
 * (landmarks = los 33 puntos normalizados, mundo = los mismos en 3D, en
 * metros; null si no se vio a nadie).
 * `alAvanzar(fraccion)` informa el progreso; `modo`: "rapido" o "preciso" (ver MODOS).
 */
export async function estimarPoses(video, alAvanzar = () => {}, modo = "rapido") {
  const { modelo, cuadrosPorSegundo, escalaVisibilidad = 1 } = MODOS[modo] ?? MODOS.rapido;
  detectores[modo] ??= await crearDetector(modelo);
  const detector = detectores[modo];
  await prepararVideo(video);
  const duracion = video.duration;
  const paso = 1 / cuadrosPorSegundo;
  const resultado = [];
  // Cada análisis arranca con timestamps nuevos: MediaPipe exige que crezcan.
  const base = performance.now();
  let ultimaMarca = 0;
  const analizarCuadro = (t) => {
    ultimaMarca = Math.max(ultimaMarca + 1, Math.round(base + t * 1000));
    const r = detector.detectForVideo(video, ultimaMarca);
    // landmarks: en la imagen (2D, lo que usa el análisis); mundo: los mismos
    // puntos en 3D, en metros (para la vista 3D).
    const escalar = (puntos) => (puntos && escalaVisibilidad !== 1
      ? puntos.map((p) => ({ ...p, visibility: Math.min(1, (p.visibility ?? 1) * escalaVisibilidad) }))
      : puntos);
    resultado.push({ t, landmarks: escalar(r.landmarks?.[0] ?? null), mundo: escalar(r.worldLandmarks?.[0] ?? null) });
  };
  for (let t = 0; t < duracion; t += paso) {
    video.currentTime = t;
    if (!(await esperar(video, "seeked", ESPERA_SALTO))) {
      // Este navegador no avisa al saltar: se sigue reproduciendo el video.
      await recorrerReproduciendo(video, resultado, t, paso, analizarCuadro, alAvanzar);
      break;
    }
    analizarCuadro(t);
    alAvanzar(Math.min(1, t / duracion));
  }
  alAvanzar(1);
  return resultado;
}
