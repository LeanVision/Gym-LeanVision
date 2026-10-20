// Estimación de pose en el navegador con MediaPipe (corre en el celular: el
// video no se sube a ningún lado).

// Se puede cambiar desde la página (por ejemplo, para las pruebas).
export const CONFIG = {
  mediapipe: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1",
  modelo: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
  cuadrosPorSegundo: 15,
};

let detector = null;

async function crearDetector() {
  const { FilesetResolver, PoseLandmarker } = await import(`${CONFIG.mediapipe}/vision_bundle.mjs`);
  const archivos = await FilesetResolver.forVisionTasks(`${CONFIG.mediapipe}/wasm`);
  const opciones = (delegate) => ({
    baseOptions: { modelAssetPath: CONFIG.modelo, delegate },
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

function esperar(video, evento) {
  return new Promise((resolver, rechazar) => {
    const ok = () => { limpiar(); resolver(); };
    const error = () => { limpiar(); rechazar(new Error("No se pudo leer el video")); };
    const limpiar = () => { video.removeEventListener(evento, ok); video.removeEventListener("error", error); };
    video.addEventListener(evento, ok, { once: true });
    video.addEventListener("error", error, { once: true });
  });
}

/**
 * Recorre el video cuadro a cuadro y devuelve [{t, landmarks}] (landmarks =
 * los 33 puntos normalizados, o null si no se vio a nadie).
 * `alAvanzar(fraccion)` informa el progreso.
 */
export async function estimarPoses(video, alAvanzar = () => {}) {
  detector ??= await crearDetector();
  if (video.readyState < 1) await esperar(video, "loadedmetadata");
  const duracion = video.duration;
  const paso = 1 / CONFIG.cuadrosPorSegundo;
  const resultado = [];
  // Cada análisis arranca con timestamps nuevos: MediaPipe exige que crezcan.
  const base = performance.now();
  for (let t = 0; t < duracion; t += paso) {
    video.currentTime = t;
    await esperar(video, "seeked");
    const r = detector.detectForVideo(video, Math.round(base + t * 1000));
    resultado.push({ t, landmarks: r.landmarks?.[0] ?? null });
    alAvanzar(Math.min(1, t / duracion));
  }
  alAvanzar(1);
  return resultado;
}
