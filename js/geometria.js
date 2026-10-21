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
  // Cabeza respecto de la prolongación cadera-hombro: positivo = colgando.
  a.cabeza = visto("oreja") ? anguloBajoLinea(sin("cadera"), sin("hombro"), sin("oreja")) : null;
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
