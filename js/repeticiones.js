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
 * `u`: {inicioRep, duracionMinimaRep}.
 *
 * Una repetición empieza en el punto más bajo del ángulo (de pie, brazos
 * estirados), cuenta si el ángulo sube al menos `inicioRep` grados, y termina
 * en el mínimo siguiente: cuando volvió al menos el 60 % de lo que subió y
 * empieza a subir otra vez. No exige volver exactamente a la posición del
 * principio: así una repetición sin terminar arriba (sin estirar los brazos,
 * sin pararse derecho) igual se cierra y se puede marcar como error.
 * Devuelve [{inicio, fondo, fin}] como índices de `cuadros`.
 */
export const VUELTA = 0.6;
const REPUNTE = 5; // grados que tiene que volver a subir para dar por cerrado el mínimo
// La repetición arranca en el último cuadro a menos de esto del mínimo: el
// momento en que empieza a moverse, no el principio de la pausa anterior.
const TOLERANCIA = 3;

export function separarRepeticiones(cuadros, campo, u) {
  const fps = cuadros.length > 1 ? (cuadros.length - 1) / (cuadros.at(-1).t - cuadros[0].t) : 15;
  const angulo = suavizar(cuadros.map((c) => c.a?.[campo] ?? null), Math.max(1, Math.round(fps * 0.1)));
  const reps = [];
  // valle: el mínimo antes de la repetición; arranque: cuándo empieza a
  // moverse desde ahí; fondo: el máximo; fin: el mínimo siguiente.
  let valle = null, arranque = null, fondo = null, fin = null, finArranque = null;
  angulo.forEach((r, i) => {
    // El suavizado rellena los cuadros sin cuerpo; esos no pueden ser
    // inicio, fondo ni fin, porque no tienen ángulos para revisar.
    if (r == null || !cuadros[i].a) return;
    if (fondo == null) {
      if (valle == null || r < angulo[valle]) valle = i;
      if (r <= angulo[valle] + TOLERANCIA) arranque = i;
      if (r - angulo[valle] >= u.inicioRep) fondo = i;
      return;
    }
    if (fin == null) {
      if (r > angulo[fondo]) fondo = i;
      else if (r <= angulo[fondo] - VUELTA * (angulo[fondo] - angulo[valle])) fin = finArranque = i;
      return;
    }
    if (r < angulo[fin]) fin = i;
    if (r <= angulo[fin] + TOLERANCIA) { finArranque = i; return; }
    if (r - angulo[fin] >= REPUNTE) {
      if (cuadros[fin].t - cuadros[arranque].t >= u.duracionMinimaRep) reps.push({ inicio: arranque, fondo, fin });
      valle = fin;
      arranque = finArranque;
      fondo = r - angulo[valle] >= u.inicioRep ? i : null;
      fin = null;
    }
  });
  if (fondo != null && fin != null && cuadros[fin].t - cuadros[arranque].t >= u.duracionMinimaRep) {
    reps.push({ inicio: arranque, fondo, fin });
  }
  return reps;
}
