// Abdominales (encogimientos), vistos de costado con la persona acostada
// boca arriba: separa las repeticiones y revisa la técnica de cada una.
//
// Lo que NO se revisa: si la zona lumbar se despega del piso. El modelo no
// tiene puntos en la columna. Se explica en el tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: el tronco se despega del piso al menos esto (ver repeticiones.js).
  inicioRep: 15,
  duracionMinimaRep: 0.5, // s
  // Cuello: la cabeza doblada hacia el pecho, respecto de la línea del tronco.
  // Un poco es normal (un puño entre el mentón y el pecho); más es tirar del cuello.
  cuelloMaximo: 35,
  // Pies: cuánto suben los tobillos respecto del principio, en largos de tibia.
  piesMaximo: 0.3,
  // Ritmo: una repetición entera (subir y bajar) en menos de esto es impulso.
  duracionControlada: 1, // s
};

export const PROBLEMAS = {
  cuello: {
    titulo: "Tirás del cuello",
    consejo: "Mirá hacia el techo, con un puño de espacio entre el mentón y el pecho. Las manos apenas tocan la cabeza: subí con el abdomen, no tirando de la nuca.",
    peso: 25,
  },
  pies: {
    titulo: "Despegás los pies",
    consejo: "Dejá los pies apoyados en el piso todo el tiempo. Si se levantan, estás subiendo con las piernas y no con el abdomen.",
    peso: 20,
  },
  impulso: {
    titulo: "Muy rápido, con impulso",
    consejo: "Subí en un segundo y bajá en otro, despacio y sin rebotar contra el piso: el trabajo está en controlar el movimiento.",
    peso: 20,
  },
};

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);

/** Revisa una repetición: la cabeza arriba de todo, los pies y el ritmo en toda la repetición. */
export function revisarRepeticion(cuadros, rep, u = UMBRALES) {
  const tramo = cuadros.slice(rep.inicio, rep.fin + 1);
  // `cabeza` es positiva cuando cuelga: doblarla hacia el pecho da negativo.
  const cuellos = valores(tramo, "cabeza").map((c) => -c);
  const pies = valores(tramo, "tobilloSobreCadera");
  const piesAlPrincipio = cuadros[rep.inicio].a.tobilloSobreCadera;
  const medidas = {
    elevacion: cuadros[rep.fondo].a.elevacionTronco,
    // Lo que pasa buena parte de la repetición, no un cuadro suelto.
    cuello: cuellos.length ? percentil(cuellos, 75) : null,
    pies: pies.length ? percentil(pies, 90) - piesAlPrincipio : null,
    duracion: cuadros[rep.fin].t - cuadros[rep.inicio].t,
  };
  const problemas = [];
  if (medidas.cuello != null && medidas.cuello > u.cuelloMaximo) {
    problemas.push({ tipo: "cuello", detalle: `La cabeza se dobló ${medidas.cuello.toFixed(0)}° hacia el pecho (conviene menos de ${u.cuelloMaximo}°).` });
  }
  if (medidas.pies != null && medidas.pies > u.piesMaximo) {
    problemas.push({ tipo: "pies", detalle: "Los pies se despegaron del piso." });
  }
  if (medidas.duracion < u.duracionControlada) {
    problemas.push({ tipo: "impulso", detalle: `La repetición duró ${medidas.duracion.toFixed(1).replace(".", ",")} s (conviene unos 2 s).` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarAbdominales(cuadros, u = UMBRALES) {
  const reps = separarRepeticiones(cuadros, "elevacionTronco", u);
  const repeticiones = reps.map((rep, i) => {
    const r = revisarRepeticion(cuadros, rep, u);
    return {
      numero: i + 1,
      tInicio: cuadros[rep.inicio].t,
      tFondo: cuadros[rep.fondo].t,
      tFin: cuadros[rep.fin].t,
      ...r,
      puntaje: puntaje(r.problemas),
    };
  });
  const avisos = [];
  const elevaciones = valores(cuadros, "elevacionTronco");
  if (elevaciones.length && percentil(elevaciones, 10) > 45) {
    avisos.push("Parece que no estás acostado: los abdominales se hacen boca arriba, con las rodillas dobladas y los pies en el piso.");
  }
  if (cuadros.some((c) => c.a) && !cuadros.some((c) => c.a?.cabeza != null)) {
    avisos.push("No vimos bien tu cabeza, así que no revisamos el cuello. Revisá que entre en el cuadro.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
