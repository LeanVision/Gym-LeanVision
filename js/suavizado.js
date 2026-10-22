// Suavizado de los puntos del modelo antes de calcular ángulos.
//
// El modelo ubica cada punto cuadro por cuadro, con un temblor de unos
// píxeles que mueve los ángulos y puede inventar errores. Como el análisis
// se hace con el video entero (no en vivo), se puede suavizar mirando el
// cuadro anterior y el siguiente sin atrasar nada.
//
// 1. Huecos cortos (el modelo pierde a la persona unos cuadros): se rellenan
//    interpolando entre el cuadro anterior y el siguiente.
// 2. Temblor: promedio ponderado (triangular) de cada punto con sus vecinos,
//    solo dentro de tramos continuos.

// Huecos de hasta este largo se rellenan; más largos se dejan vacíos.
export const HUECO_MAXIMO = 0.3; // s
// Radio del suavizado, en segundos (a 15 cuadros/s es ±1 cuadro; a 30, ±2).
export const RADIO = 0.07; // s

const CAMPOS = ["x", "y", "z", "visibility"];

function mezclar(a, b, f) {
  if (!a || !b) return null;
  return a.map((p, i) => {
    const q = b[i];
    const r = {};
    for (const c of CAMPOS) if (p[c] != null && q?.[c] != null) r[c] = p[c] + (q[c] - p[c]) * f;
    return r;
  });
}

/** Rellena los huecos cortos interpolando landmarks y puntos 3D. */
export function rellenarHuecos(poses, huecoMaximo = HUECO_MAXIMO) {
  const r = poses.map((p) => ({ ...p }));
  let anterior = -1;
  r.forEach((p, i) => {
    if (!p.landmarks) return;
    if (anterior >= 0 && i - anterior > 1 && p.t - r[anterior].t <= huecoMaximo) {
      const a = r[anterior], b = p;
      for (let k = anterior + 1; k < i; k++) {
        const f = (r[k].t - a.t) / (b.t - a.t);
        r[k] = { ...r[k], landmarks: mezclar(a.landmarks, b.landmarks, f), mundo: mezclar(a.mundo, b.mundo, f), relleno: true };
      }
    }
    anterior = i;
  });
  return r;
}

function suavizarSerie(serie, radio) {
  // serie: arreglo de arreglos de puntos (o null), todos del mismo tramo continuo.
  return serie.map((_, i) => {
    const base = serie[i];
    if (!base) return base;
    return base.map((_, j) => {
      const r = {};
      for (const c of CAMPOS) {
        let suma = 0, peso = 0;
        for (let k = -radio; k <= radio; k++) {
          const v = serie[i + k]?.[j]?.[c];
          if (v == null) continue;
          const w = radio + 1 - Math.abs(k);
          suma += v * w;
          peso += w;
        }
        if (peso) r[c] = suma / peso;
      }
      return r;
    });
  });
}

/**
 * Devuelve las poses ([{t, landmarks, mundo}]) con los huecos cortos
 * rellenados y los puntos suavizados. No modifica las originales.
 */
export function suavizarPoses(poses, { radio = RADIO, huecoMaximo = HUECO_MAXIMO } = {}) {
  const r = rellenarHuecos(poses, huecoMaximo);
  if (r.length < 2) return r;
  const fps = (r.length - 1) / (r.at(-1).t - r[0].t || 1);
  const cuadros = Math.max(1, Math.round(radio * fps));
  // Tramos continuos con persona: se suavizan por separado.
  let inicio = 0;
  for (let i = 0; i <= r.length; i++) {
    if (i < r.length && r[i].landmarks) continue;
    if (i - inicio > 1) {
      const tramo = r.slice(inicio, i);
      const landmarks = suavizarSerie(tramo.map((p) => p.landmarks), cuadros);
      const mundo = tramo.every((p) => p.mundo) ? suavizarSerie(tramo.map((p) => p.mundo), cuadros) : null;
      tramo.forEach((p, k) => {
        r[inicio + k] = { ...p, landmarks: landmarks[k], mundo: mundo ? mundo[k] : p.mundo };
      });
    }
    inicio = i + 1;
  }
  return r;
}
