// Ángulos del cuerpo a partir de los puntos de MediaPipe Pose (33 puntos).
//
// Todo en 2D y en píxeles (x a la derecha, y hacia ABAJO): las coordenadas
// normalizadas de MediaPipe se multiplican por el ancho y el alto del video,
// si no un video vertical deforma los ángulos. Supone la cámara de costado.

export const P = {
  nariz: 0, oreja_izq: 7, oreja_der: 8,
  hombro_izq: 11, hombro_der: 12, codo_izq: 13, codo_der: 14,
  muneca_izq: 15, muneca_der: 16, cadera_izq: 23, cadera_der: 24,
  rodilla_izq: 25, rodilla_der: 26, tobillo_izq: 27, tobillo_der: 28,
  talon_izq: 29, talon_der: 30, punta_izq: 31, punta_der: 32,
};

// Por debajo de esta visibilidad el punto se toma como no visto.
export const VISIBILIDAD_MINIMA = 0.5;

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
    // Talón sobre la punta del pie, en largos de tibia (sube si se despega).
    talon: visto("talon") && visto("punta") ? (p["punta" + s].y - p["talon" + s].y) / largoPierna : null,
    // De costado los dos hombros se superponen; de frente quedan separados.
    separacionHombros: null,
    largoTronco,
  };
  const hi = p.hombro_izq, hd = p.hombro_der;
  if (hi && hd && hi.v >= VISIBILIDAD_MINIMA && hd.v >= VISIBILIDAD_MINIMA && largoTronco > 0) {
    a.separacionHombros = Math.abs(hi.x - hd.x) / largoTronco;
  }
  return a;
}

/** Convierte las poses crudas ([{t, landmarks}]) en ángulos por cuadro, del lado que mejor se ve. */
export function prepararCuadros(poses, ancho, alto) {
  const puntos = poses.map((p) => (p.landmarks ? aPixeles(p.landmarks, ancho, alto) : null));
  const lado = elegirLado(puntos);
  const cuadros = poses.map((p, i) => ({ t: p.t, a: puntos[i] ? angulos(puntos[i], lado) : null }));
  return { cuadros, lado };
}
