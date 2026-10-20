// Lo que comparten los ejercicios: separar la serie en repeticiones a partir
// de un ángulo que sube al bajar y vuelve al subir (rodilla en la sentadilla,
// cadera en el peso muerto).

export function percentil(valores, p) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.max(0, Math.round((p / 100) * (v.length - 1))))];
}

function suavizar(serie, ventana) {
  return serie.map((_, i) => {
    let suma = 0, n = 0;
    for (let j = i - ventana; j <= i + ventana; j++) {
      if (j >= 0 && j < serie.length && serie[j] != null) { suma += serie[j]; n++; }
    }
    return n ? suma / n : null;
  });
}

/**
 * Separa las repeticiones a partir del ángulo `campo` de cada cuadro.
 * `cuadros`: [{t, a}] con `a` = ángulos del cuadro o null.
 * `u`: {inicioRep, finRep, duracionMinimaRep}: la repetición empieza cuando
 * el ángulo supera en `inicioRep` grados a la posición de pie, y termina
 * cuando vuelve a quedar a menos de `finRep`.
 * Devuelve [{inicio, fondo, fin}] como índices de `cuadros`.
 */
export function separarRepeticiones(cuadros, campo, u) {
  const fps = cuadros.length > 1 ? (cuadros.length - 1) / (cuadros.at(-1).t - cuadros[0].t) : 15;
  const angulo = suavizar(cuadros.map((c) => c.a?.[campo] ?? null), Math.max(1, Math.round(fps * 0.1)));
  const deFondo = percentil(angulo.filter((r) => r != null), 10);
  if (deFondo == null) return [];

  const reps = [];
  let inicio = null, fondo = null, ultimoParado = 0;
  angulo.forEach((r, i) => {
    // El suavizado rellena los cuadros sin cuerpo; esos no pueden ser el
    // punto más bajo ni el inicio, porque no tienen ángulos para revisar.
    if (r == null || !cuadros[i].a) return;
    if (inicio == null) {
      if (r <= deFondo + u.finRep) ultimoParado = i;
      if (r >= deFondo + u.inicioRep) { inicio = ultimoParado; fondo = i; }
      return;
    }
    if (r > angulo[fondo]) fondo = i;
    if (r <= deFondo + u.finRep) {
      if (cuadros[i].t - cuadros[inicio].t >= u.duracionMinimaRep) reps.push({ inicio, fondo, fin: i });
      inicio = null;
      ultimoParado = i;
    }
  });
  return reps;
}
