// Datos de la serie entera: ritmo de cada repetición (ida y vuelta) y si
// las últimas repeticiones empeoran (cansancio).

// Desde cuántas repeticiones tiene sentido comparar el principio con el final.
export const MINIMO_REPS = 4;
// Cuánto tiene que bajar el puntaje promedio de la segunda mitad para avisar.
export const CAIDA_PUNTAJE = 15;
// Cuánto más rápidas (fracción) tienen que ser las últimas para avisar.
export const ACELERACION = 0.25;

const promedio = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

/** Ida (del principio al punto más bajo/alto) y vuelta de una repetición, en segundos. */
export function ritmo(rep) {
  return { ida: rep.tFondo - rep.tInicio, vuelta: rep.tFin - rep.tFondo };
}

/**
 * Resumen de la serie: ritmo promedio y avisos de cansancio.
 * Devuelve {ida, vuelta, avisos: [texto]} (ida/vuelta null sin repeticiones).
 */
export function resumirSerie(repeticiones) {
  const ritmos = repeticiones.map(ritmo);
  const avisos = [];
  if (repeticiones.length >= MINIMO_REPS) {
    const mitad = Math.floor(repeticiones.length / 2);
    const primeras = repeticiones.slice(0, mitad), ultimas = repeticiones.slice(-mitad);
    const caida = promedio(primeras.map((r) => r.puntaje)) - promedio(ultimas.map((r) => r.puntaje));
    if (caida >= CAIDA_PUNTAJE) {
      avisos.push("Las últimas repeticiones salieron peor que las primeras: puede ser cansancio. Probá cortar la serie antes o bajar el peso.");
    }
    const duracion = (rs) => promedio(rs.map((r) => r.tFin - r.tInicio));
    if (duracion(ultimas) < duracion(primeras) * (1 - ACELERACION)) {
      avisos.push("Las últimas repeticiones fueron bastante más rápidas que las primeras: mantené el mismo ritmo controlado hasta el final.");
    }
  }
  return {
    ida: promedio(ritmos.map((r) => r.ida)),
    vuelta: promedio(ritmos.map((r) => r.vuelta)),
    avisos,
  };
}
