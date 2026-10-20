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
  separacionHombros = 0, visibilidad = 0.9 } = {}) {
  const tobillo = { x: 300, y: 800 };
  const rod = mas(tobillo, rot(ARRIBA, tibia), 200);
  const cadera = mas(rod, rot(ARRIBA, tibia - rodilla), 200);
  const hombro = mas(cadera, rot(ARRIBA, tronco), 250);
  const codo = mas(hombro, { x: 0.3, y: 0.95 }, 120);
  const puntos = {
    hombro_der: hombro, cadera_der: cadera, rodilla_der: rod, tobillo_der: tobillo,
    talon_der: { x: tobillo.x - 20, y: tobillo.y + 30 - talon * 200 },
    punta_der: { x: tobillo.x + 60, y: tobillo.y + 30 },
    codo_der: codo, muneca_der: mas(codo, { x: 1, y: 0 }, 100),
  };
  const p = {};
  for (const [n, q] of Object.entries(puntos)) {
    p[n] = { x: miraDerecha ? q.x : 1000 - q.x, y: q.y, v: visibilidad };
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
  for (const k of ["rodilla", "tibia", "tronco", "talon"]) r[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * f;
  return r;
}

/**
 * Serie de sentadillas a `fps` cuadros por segundo. Cada repetición es
 * {fondo: postura en el punto más bajo, bajada, subida (s)}; entre una y otra
 * la persona queda de pie `pausa` segundos. Devuelve [{t, p}].
 */
export function sentadillas(reps, { fps = 15, pausa = 1, extra = {} } = {}) {
  const posturas = [];
  const quieto = (s) => { for (let i = 0; i < s * fps; i++) posturas.push({ ...DE_PIE, ...extra }); };
  quieto(pausa);
  for (const { fondo, bajada = 1.5, subida = 1 } of reps) {
    const abajo = { ...DE_PIE, ...extra, ...fondo };
    for (let i = 1; i <= bajada * fps; i++) posturas.push(mezcla(DE_PIE, abajo, i / (bajada * fps)));
    for (let i = 1; i <= subida * fps; i++) posturas.push(mezcla(abajo, DE_PIE, i / (subida * fps)));
    quieto(pausa);
  }
  return posturas.map((postura, i) => ({ t: i / fps, p: perfil(postura) }));
}
