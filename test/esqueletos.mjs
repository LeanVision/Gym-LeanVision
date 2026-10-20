// Esqueletos sintéticos de perfil, en píxeles, con ángulos conocidos.

const rad = (g) => (g * Math.PI) / 180;
// Gira hacia adelante (+x) en coordenadas de imagen (y hacia abajo).
const rot = (v, g) => ({
  x: v.x * Math.cos(rad(g)) - v.y * Math.sin(rad(g)),
  y: v.x * Math.sin(rad(g)) + v.y * Math.cos(rad(g)),
});
const mas = (p, v, largo) => ({ x: p.x + v.x * largo, y: p.y + v.y * largo });
const ARRIBA = { x: 0, y: -1 };

/**
 * rodilla: flexión de rodilla; tibia: inclinación de la tibia hacia adelante;
 * tronco: inclinación del tronco; talon: cuánto se despega el talón (en largos de tibia).
 */
export function perfil({ rodilla = 0, tibia = 0, tronco = 0, talon = 0, miraDerecha = true,
  separacionHombros = 0, visibilidad = 0.9, escala = 1, talonTapado = 0, barra = null } = {}) {
  const tobillo = { x: 300, y: 800 };
  const rod = mas(tobillo, rot(ARRIBA, tibia), 200);
  const cadera = mas(rod, rot(ARRIBA, tibia - rodilla), 200);
  const hombro = mas(cadera, rot(ARRIBA, tronco), 250);
  const codo = mas(hombro, { x: 0.3, y: 0.95 }, 120);
  const puntos = {
    hombro_der: hombro, cadera_der: cadera, rodilla_der: rod, tobillo_der: tobillo,
    // Talón despegado: el pie pivotea sobre la punta y el tobillo queda más
    // alto respecto de ella (acá, bajando la punta: es lo mismo para la medida).
    // talonTapado: el modelo ubica el talón más arriba de donde está (pasa
    // cuando la cola lo tapa en el fondo de la sentadilla).
    talon_der: { x: tobillo.x - 20, y: tobillo.y + 30 - talonTapado * 200 },
    punta_der: { x: tobillo.x + 60, y: tobillo.y + 30 + talon * 200 },
    codo_der: codo, muneca_der: mas(codo, { x: 1, y: 0 }, 100),
  };
  // barra: las manos (la barra) a esa distancia de la mitad del pie, en
  // largos de tronco (250 px), a la altura de la rodilla.
  if (barra != null) puntos.muneca_der = { x: (tobillo.x + puntos.punta_der.x) / 2 + barra * 250, y: rod.y };
  const p = {};
  for (const [n, q] of Object.entries(puntos)) {
    p[n] = { x: (miraDerecha ? q.x : 1000 - q.x) * escala, y: q.y * escala, v: visibilidad };
    // El lado tapado: en el mismo lugar (de costado se superponen) y menos visible.
    const otro = n.replace("_der", "_izq");
    p[otro] = { ...p[n], v: 0.3 };
  }
  if (separacionHombros) {
    p.hombro_izq = { x: p.hombro_der.x + separacionHombros * 250, y: p.hombro_der.y, v: 0.9 };
  }
  return p;
}

const DE_PIE = { rodilla: 5, tibia: 2, tronco: 3, talon: 0 };

function mezcla(a, b, f) {
  const r = { ...b };
  for (const k of ["rodilla", "tibia", "tronco", "talon", "talonTapado", "barra"]) r[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * f;
  return r;
}

/**
 * Serie de sentadillas a `fps` cuadros por segundo. Cada repetición es
 * {fondo: postura en el punto más bajo, bajada, subida (s)}; entre una y otra
 * la persona queda de pie `pausa` segundos. Devuelve [{t, p}].
 */
export function sentadillas(reps, { fps = 15, pausa = 1, extra = {}, escala = 1 } = {}) {
  const posturas = [];
  const quieto = (s) => { for (let i = 0; i < s * fps; i++) posturas.push({ ...DE_PIE, ...extra }); };
  quieto(pausa);
  for (const { fondo, bajada = 1.5, subida = 1 } of reps) {
    const abajo = { ...DE_PIE, ...extra, ...fondo };
    for (let i = 1; i <= bajada * fps; i++) posturas.push(mezcla(DE_PIE, abajo, i / (bajada * fps)));
    for (let i = 1; i <= subida * fps; i++) posturas.push(mezcla(abajo, DE_PIE, i / (subida * fps)));
    quieto(pausa);
  }
  return posturas.map((postura, i) => ({ t: i / fps, p: perfil({ ...postura, escala }) }));
}

/**
 * Serie a partir de posturas clave: [[postura, segundos]], pasando de una a
 * la siguiente en esos segundos (la primera se mantiene quieta).
 */
export function secuencia(claves, { fps = 15, escala = 1 } = {}) {
  const posturas = [];
  let anterior = claves[0][0];
  for (const [postura, segundos] of claves) {
    const n = Math.round(segundos * fps);
    for (let i = 1; i <= n; i++) posturas.push(mezcla(anterior, postura, i / n));
    anterior = postura;
  }
  return posturas.map((postura, i) => ({ t: i / fps, p: perfil({ ...postura, escala }) }));
}

/**
 * Esqueleto en posición de flexión de brazos, de perfil (cabeza hacia +x).
 * codo: flexión del codo; cadera: desvío de la cadera respecto de la línea
 * hombro-tobillo (+ = caída, - = arriba); cabeza: caída de la cabeza
 * respecto de la línea del cuerpo (+ = colgando).
 */
export function plancha({ codo = 5, cadera = 0, cabeza = 0, miraDerecha = true, visibilidad = 0.9 } = {}) {
  const PISO = 720;
  const medio = rad(codo / 2);
  // Brazo hacia abajo y algo hacia los pies; antebrazo hacia abajo y algo hacia la cabeza.
  const brazo = { x: -Math.sin(medio), y: Math.cos(medio) };
  const antebrazo = { x: Math.sin(medio), y: Math.cos(medio) };
  const hombro = { x: 600, y: PISO - 230 * Math.cos(medio) };
  const codoP = mas(hombro, brazo, 120);
  const muneca = mas(codoP, antebrazo, 110);
  const tobillo = { x: hombro.x - 600, y: PISO - 40 };
  // Cadera a mitad de camino, corrida hacia abajo (caída) o arriba según `cadera`.
  const d = { x: tobillo.x - hombro.x, y: tobillo.y - hombro.y };
  const largo = Math.hypot(d.x, d.y);
  let n = { x: -d.y / largo, y: d.x / largo };
  if (n.y < 0) n = { x: -n.x, y: -n.y };
  const cad = mas({ x: (hombro.x + tobillo.x) / 2, y: (hombro.y + tobillo.y) / 2 }, n, (largo / 2) * Math.tan(rad(cadera / 2)));
  const rod = { x: (cad.x + tobillo.x) / 2, y: (cad.y + tobillo.y) / 2 };
  // Oreja: prolongando la línea cadera-hombro, girada hacia abajo `cabeza` grados.
  const linea = { x: hombro.x - cad.x, y: hombro.y - cad.y };
  const lc = Math.hypot(linea.x, linea.y);
  const u = { x: linea.x / lc, y: linea.y / lc };
  const abajo = n; // la misma normal "hacia abajo" sirve: el cuerpo está casi horizontal
  const oreja = mas(hombro, { x: u.x * Math.cos(rad(cabeza)) + abajo.x * Math.sin(rad(cabeza)),
    y: u.y * Math.cos(rad(cabeza)) + abajo.y * Math.sin(rad(cabeza)) }, 60);
  const puntos = {
    hombro_der: hombro, codo_der: codoP, muneca_der: muneca, cadera_der: cad, rodilla_der: rod,
    tobillo_der: tobillo, talon_der: { x: tobillo.x - 15, y: tobillo.y - 10 }, punta_der: { x: tobillo.x + 5, y: PISO },
    oreja_der: oreja,
  };
  const p = {};
  for (const [nombre, q] of Object.entries(puntos)) {
    p[nombre] = { x: miraDerecha ? q.x : 1000 - q.x, y: q.y, v: visibilidad };
    p[nombre.replace("_der", "_izq")] = { ...p[nombre], v: 0.3 };
  }
  return p;
}

/** Serie de flexiones: [[postura de plancha, segundos]], interpolando entre posturas. */
export function serieFlexiones(claves, fps = 15) {
  const campos = ["codo", "cadera", "cabeza"];
  const posturas = [];
  let anterior = claves[0][0];
  for (const [postura, segundos] of claves) {
    const n = Math.round(segundos * fps);
    for (let i = 1; i <= n; i++) {
      const r = { ...postura };
      for (const k of campos) r[k] = (anterior[k] ?? 0) + ((postura[k] ?? 0) - (anterior[k] ?? 0)) * (i / n);
      posturas.push(r);
    }
    anterior = postura;
  }
  return posturas.map((postura, i) => ({ t: i / fps, p: plancha(postura) }));
}
