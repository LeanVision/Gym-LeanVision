// Ángulos del cuerpo a partir de los puntos de MediaPipe Pose (33 puntos).
//
// Todo en 2D y en píxeles (x a la derecha, y hacia ABAJO): las coordenadas
// normalizadas de MediaPipe se multiplican por el ancho y el alto del video,
// si no un video vertical deforma los ángulos. Los ángulos se calculan como
// si la cámara estuviera de costado: si el video está filmado en diagonal o
// de frente, `prepararCuadros` arma esa vista de costado con los puntos 3D
// (ver `aVistaDeCostado`).

export const P = {
  nariz: 0, oreja_izq: 7, oreja_der: 8,
  hombro_izq: 11, hombro_der: 12, codo_izq: 13, codo_der: 14,
  muneca_izq: 15, muneca_der: 16, cadera_izq: 23, cadera_der: 24,
  rodilla_izq: 25, rodilla_der: 26, tobillo_izq: 27, tobillo_der: 28,
  talon_izq: 29, talon_der: 30, punta_izq: 31, punta_der: 32,
};

// Por debajo de esta visibilidad el punto se toma como no visto.
export const VISIBILIDAD_MINIMA = 0.5;
// Para la pierna del lado opuesto a la cámara, que el propio cuerpo tapa a medias.
export const VISIBILIDAD_PIERNA_TAPADA = 0.3;

const LADO = ["hombro", "cadera", "rodilla", "tobillo", "talon", "punta"];

/** Puntos de un cuadro en píxeles: nombre -> {x, y, v}. */
export function aPixeles(landmarks, ancho, alto) {
  const puntos = {};
  for (const [nombre, i] of Object.entries(P)) {
    const l = landmarks[i];
    if (l) puntos[nombre] = { x: l.x * ancho, y: l.y * alto, v: l.visibility ?? 1 };
  }
  return puntos;
}

/** El lado del cuerpo que mejor ve la cámara, promediando todo el video. */
export function elegirLado(cuadros) {
  let izq = 0, der = 0;
  for (const p of cuadros) {
    if (!p) continue;
    for (const n of LADO) {
      izq += p[`${n}_izq`]?.v ?? 0;
      der += p[`${n}_der`]?.v ?? 0;
    }
  }
  return izq >= der ? "izq" : "der";
}

const grados = (rad) => (rad * 180) / Math.PI;

/** Ángulo con signo para girar el vector a hasta b, en grados (-180..180). */
function anguloFirmado(a, b) {
  return grados(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y));
}

const resta = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

/** 180 menos el ángulo interior en el vértice: 0 = segmentos alineados. */
function flexion(a, vertice, b) {
  return 180 - Math.abs(anguloFirmado(resta(a, vertice), resta(b, vertice)));
}

/** Normal unitaria a `u` que apunta hacia abajo en la imagen (y crece hacia abajo). */
function normalAbajo(u) {
  const n = { x: -u.y, y: u.x };
  return n.y >= 0 ? n : { x: -n.x, y: -n.y };
}

const punto = (v, w) => v.x * w.x + v.y * w.y;

/**
 * Cuánto se sale `medio` de la recta entre `a` y `b`, como el ángulo que se
 * forma en `medio` (0 = alineados). Positivo = por debajo de la recta.
 * En las flexiones: la cadera respecto de la línea hombro-tobillo.
 */
function desvioDeLinea(a, medio, b) {
  const d = resta(b, a);
  const largo = Math.hypot(d.x, d.y);
  if (!largo) return null;
  const n = normalAbajo({ x: d.x / largo, y: d.y / largo });
  return grados(2 * Math.atan(punto(resta(medio, a), n) / (largo / 2)));
}

/** Ángulo de `extremo` respecto de la prolongación de la recta `desde`→`vertice`; positivo = hacia abajo. */
function anguloBajoLinea(desde, vertice, extremo) {
  const d = resta(vertice, desde);
  const largo = Math.hypot(d.x, d.y);
  if (!largo) return null;
  const u = { x: d.x / largo, y: d.y / largo };
  const v = resta(extremo, vertice);
  return grados(Math.atan2(punto(v, normalAbajo(u)), punto(v, u)));
}

/**
 * Ángulos de un cuadro, de un lado. Devuelve null si falta algo esencial.
 *
 * Convención: "adelante" es hacia donde apuntan los pies; flexión positiva =
 * hacia adelante. En la sentadilla los pies están quietos y apuntan siempre
 * para el mismo lado, así que es más estable que mirar la cara.
 */
export function angulos(p, lado) {
  const s = `_${lado}`;
  const visto = (n) => p[n + s] && p[n + s].v >= VISIBILIDAD_MINIMA;
  if (!["hombro", "cadera", "rodilla", "tobillo"].every(visto)) return null;

  let adelante = 1;
  if (visto("punta") && visto("talon")) adelante = Math.sign(p["punta" + s].x - p["talon" + s].x) || 1;
  // Se espeja en x para que "adelante" sea siempre +x.
  const q = (n) => (p[n + s] ? { x: p[n + s].x * adelante, y: p[n + s].y } : null);
  const hombro = q("hombro"), cadera = q("cadera"), rodilla = q("rodilla"), tobillo = q("tobillo");
  const arriba = { x: 0, y: -1 };

  const largoTronco = Math.hypot(hombro.x - cadera.x, hombro.y - cadera.y);
  const largoPierna = Math.hypot(rodilla.x - tobillo.x, rodilla.y - tobillo.y);
  const a = {
    // Inclinación del tronco respecto de la vertical (positiva = hacia adelante).
    tronco: anguloFirmado(arriba, resta(hombro, cadera)),
    // Inclinación de la tibia respecto de la vertical (rodilla hacia adelante = positiva).
    tibia: anguloFirmado(arriba, resta(rodilla, tobillo)),
    rodilla: flexion(cadera, rodilla, tobillo),
    cadera: flexion(hombro, cadera, rodilla),
    // Muslo respecto de la horizontal: positivo = cadera por encima de la
    // rodilla, 0 = muslo paralelo al piso, negativo = por debajo.
    muslo: grados(Math.atan2(rodilla.y - cadera.y, Math.abs(rodilla.x - cadera.x))),
    // Altura del tobillo sobre la punta del pie, en largos de tibia: con el
    // talón apoyado no cambia; si el talón se despega, el pie pivotea sobre
    // la punta y el tobillo sube. No se usa el punto del talón: en una
    // sentadilla profunda la cola lo tapa y el modelo lo ubica más arriba de
    // donde está (en un video real daba "talón levantado" con el pie apoyado).
    alturaTobillo: visto("punta") ? (p["punta" + s].y - p["tobillo" + s].y) / largoPierna : null,
    largoTibiaPx: largoPierna,
    // Manos (la barra) respecto de la mitad del pie, en largos de tronco:
    // positivo = adelante. En el peso muerto la barra tiene que subir pegada
    // a las piernas, sobre la mitad del pie.
    barra: null,
    // De costado los dos hombros se superponen; de frente quedan separados.
    separacionHombros: null,
    largoTronco,
  };
  if (visto("muneca") && largoTronco > 0) {
    const mitadPie = visto("punta") ? (tobillo.x + q("punta").x) / 2 : tobillo.x;
    a.barra = (q("muneca").x - mitadPie) / largoTronco;
  }
  // Flexiones de brazos (cuerpo horizontal). Con los puntos sin espejar: no
  // dependen de hacia dónde mira la persona, sólo de "arriba" y "abajo".
  const sin = (n) => p[n + s];
  a.codo = visto("codo") && visto("muneca") ? flexion(sin("hombro"), sin("codo"), sin("muneca")) : null;
  // Press militar: las manos (la barra) por encima de los hombros, en largos de tronco.
  a.alturaManos = visto("muneca") && largoTronco > 0 ? (sin("hombro").y - sin("muneca").y) / largoTronco : null;
  // Curl de bíceps: el brazo (hombro-codo) respecto del tronco, positivo =
  // el codo adelante del cuerpo. Con los puntos espejados ("adelante" = +x).
  a.brazo = visto("codo") ? -anguloFirmado(resta(cadera, hombro), resta(q("codo"), hombro)) : null;
  // Dominadas: la nariz respecto de las manos (la barra), en largos de
  // tronco: positivo = la nariz por encima de las manos.
  a.barbilla = visto("muneca") && p.nariz?.v >= VISIBILIDAD_MINIMA && largoTronco > 0
    ? (sin("muneca").y - p.nariz.y) / largoTronco : null;

  // Estocadas: las dos piernas. La de adelante es la que tiene el tobillo más
  // adelante. La pierna del otro lado queda tapada a medias, así que se acepta
  // con menos visibilidad (MediaPipe la estima bien igual).
  const pierna = (l) => {
    const pt = (n) => p[`${n}_${l}`];
    if (!["cadera", "rodilla", "tobillo"].every((n) => pt(n) && pt(n).v >= VISIBILIDAD_PIERNA_TAPADA)) return null;
    const m = (n) => ({ x: pt(n).x * adelante, y: pt(n).y });
    return {
      rodilla: flexion(m("cadera"), m("rodilla"), m("tobillo")),
      tibia: anguloFirmado(arriba, resta(m("rodilla"), m("tobillo"))),
      tobilloX: m("tobillo").x,
    };
  };
  const pi = pierna("izq"), pd = pierna("der");
  a.rodillaDelantera = a.tibiaDelantera = a.rodillaTrasera = null;
  if (pi && pd) {
    const [delantera, trasera] = pi.tobilloX >= pd.tobilloX ? [pi, pd] : [pd, pi];
    a.rodillaDelantera = delantera.rodilla;
    a.tibiaDelantera = delantera.tibia;
    a.rodillaTrasera = trasera.rodilla;
  }
  // Abdominales (acostado boca arriba). Tronco respecto del piso: 0 =
  // acostado, positivo = hombros despegados. Y altura del tobillo sobre la
  // cadera, en largos de tibia: crece si los pies se despegan del piso.
  a.elevacionTronco = grados(Math.atan2(cadera.y - hombro.y, Math.abs(hombro.x - cadera.x)));
  a.tobilloSobreCadera = (cadera.y - tobillo.y) / largoPierna;
  // Sentado (remo en polea o máquina): el tronco respecto de la vertical,
  // positivo = inclinado hacia los pies. Sentado los pies no sirven para
  // saber dónde es "adelante" (apuntan para arriba), así que se usa de qué
  // lado de la cadera están los tobillos.
  {
    const haciaPies = Math.sign(p["tobillo" + s].x - p["cadera" + s].x) || 1;
    a.troncoHaciaPies = anguloFirmado(arriba, { x: (p["hombro" + s].x - p["cadera" + s].x) * haciaPies, y: p["hombro" + s].y - p["cadera" + s].y });
  }
  // Press de banca: la cadera respecto de los hombros, en largos de tronco
  // (acostado en el banco ~0; positivo = la cola se despega hacia arriba).
  a.alturaCadera = largoTronco > 0 ? (hombro.y - cadera.y) / largoTronco : null;
  // Piernas respecto del piso, con el muslo (así doblar las rodillas no
  // cambia la medida): 0 = en el piso, 90 = verticales.
  a.elevacionPiernas = grados(Math.atan2(cadera.y - rodilla.y, Math.abs(rodilla.x - cadera.x)));
  // Plancha: el cuerpo (hombro-tobillo) respecto del piso, y los hombros por
  // encima de los tobillos en largos de tronco (acostado boca arriba dan ~0).
  a.inclinacionCuerpo = grados(Math.atan2(Math.abs(tobillo.y - hombro.y), Math.abs(hombro.x - tobillo.x)));
  a.alturaHombros = largoTronco > 0 ? (tobillo.y - hombro.y) / largoTronco : null;
  // Cadera respecto de la línea hombro-tobillo: positivo = caída (panza abajo).
  a.lineaCadera = desvioDeLinea(sin("hombro"), sin("cadera"), sin("tobillo"));
  // Hip thrust: cadera respecto de la línea hombro-rodilla: positivo = abajo
  // (sin extender), negativo = por encima (espalda arqueada de más).
  a.caderaHombroRodilla = desvioDeLinea(sin("hombro"), sin("cadera"), sin("rodilla"));
  // Cabeza respecto de la prolongación cadera-hombro: positivo = colgando.
  a.cabeza = visto("oreja") ? anguloBajoLinea(sin("cadera"), sin("hombro"), sin("oreja")) : null;
  const hi = p.hombro_izq, hd = p.hombro_der;
  if (hi && hd && hi.v >= VISIBILIDAD_MINIMA && hd.v >= VISIBILIDAD_MINIMA && largoTronco > 0) {
    a.separacionHombros = Math.abs(hi.x - hd.x) / largoTronco;
  }
  return a;
}

// Cámara de costado o en diagonal: hasta este ángulo (0° = de costado, 90° =
// de frente) se usan los puntos de la imagen, que de costado son los más
// precisos; con más ángulo, la vista de costado armada con los puntos 3D.
// Desde `frenteMinimo` la toma es casi de frente y se avisa.
export const VISTA = { lateralMaxima: 25, frenteMinimo: 70 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
const mediana = (v) => {
  const o = [...v].sort((a, b) => a - b);
  return o.length ? o[Math.floor(o.length / 2)] : null;
};

/**
 * El eje de izquierda a derecha del cuerpo, en el piso (x, z de los puntos
 * 3D), promediando todo el video: cadera izquierda − derecha más hombro
 * izquierdo − derecho. null si no hay puntos 3D.
 */
export function ejeLateral(poses) {
  let x = 0, z = 0;
  for (const { mundo: m } of poses) {
    if (!m) continue;
    const lx = m[23].x - m[24].x + m[11].x - m[12].x;
    const lz = m[23].z - m[24].z + m[11].z - m[12].z;
    const largo = Math.hypot(lx, lz);
    if (largo) { x += lx / largo; z += lz / largo; }
  }
  const largo = Math.hypot(x, z);
  return largo ? { x: x / largo, z: z / largo } : null;
}

/** Desde dónde filmó la cámara: 0° = de costado, 90° = de frente (o de espaldas). */
export function anguloDeCamara(eje) {
  return (Math.atan2(Math.abs(eje.x), Math.abs(eje.z)) * 180) / Math.PI;
}

/**
 * Vista de costado armada con los puntos 3D (en metros, y hacia abajo): se
 * proyectan sobre el plano del cuerpo (el perpendicular al eje lateral), que
 * es lo que vería una cámara puesta justo al costado. `escala` pasa de metros
 * a píxeles del video, para que los largos sigan siendo comparables (la
 * resolución mínima de los talones, por ejemplo). La visibilidad de cada
 * punto sale de los puntos de la imagen.
 */
export function aVistaDeCostado(mundo, landmarks, eje, escala) {
  const puntos = {};
  for (const [nombre, i] of Object.entries(P)) {
    const m = mundo[i];
    if (!m) continue;
    // "Adelante" en el piso, perpendicular al eje lateral.
    const adelante = -m.x * eje.z + m.z * eje.x;
    puntos[nombre] = { x: adelante * escala, y: m.y * escala, v: landmarks?.[i]?.visibility ?? 1 };
  }
  return puntos;
}

/** Píxeles del video por metro: el largo de la tibia en la imagen sobre su largo en 3D. */
function pixelesPorMetro(poses, ancho, alto) {
  const razones = [];
  for (const p of poses) {
    if (!p.landmarks || !p.mundo) continue;
    for (const [r, t] of [[25, 27], [26, 28]]) {
      const enImagen = Math.hypot((p.landmarks[r].x - p.landmarks[t].x) * ancho, (p.landmarks[r].y - p.landmarks[t].y) * alto);
      const en3d = dist(p.mundo[r], p.mundo[t]);
      if (en3d > 0.1) razones.push(enImagen / en3d);
    }
  }
  return mediana(razones) ?? 1000;
}

/**
 * Convierte las poses crudas ([{t, landmarks, mundo}]) en ángulos por
 * cuadro, del lado que mejor se ve. Si la cámara no estaba de costado, arma
 * la vista de costado con los puntos 3D. `forzar` ("2d" o "3d") es para
 * pruebas. Devuelve {cuadros, lado, vista: {angulo, desde3d}}.
 */
export function prepararCuadros(poses, ancho, alto, { forzar } = {}) {
  const eje = ejeLateral(poses);
  const angulo = eje ? anguloDeCamara(eje) : null;
  const desde3d = eje != null && (forzar === "3d" || (forzar !== "2d" && angulo > VISTA.lateralMaxima));
  const escala = desde3d ? pixelesPorMetro(poses, ancho, alto) : null;
  const puntos = poses.map((p) => {
    if (!p.landmarks) return null;
    return desde3d && p.mundo ? aVistaDeCostado(p.mundo, p.landmarks, eje, escala) : aPixeles(p.landmarks, ancho, alto);
  });
  const lado = elegirLado(puntos);
  const cuadros = poses.map((p, i) => ({ t: p.t, a: puntos[i] ? angulos(puntos[i], lado) : null }));
  return { cuadros, lado, vista: { angulo, desde3d } };
}
