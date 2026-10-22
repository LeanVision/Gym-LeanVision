// Flexiones de brazos (push-ups), vistas de costado: separa las
// repeticiones y revisa la técnica de cada una.
//
// Lo que NO se revisa: los codos abiertos hacia los costados. Eso se ve de
// frente o desde arriba, no de costado. Se explica en el tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: el codo se flexiona al menos esto por encima de los brazos estirados (ver repeticiones.js).
  inicioRep: 35,
  duracionMinimaRep: 0.5, // s
  // Profundidad: abajo de todo el codo debería llegar a ~90°.
  codoMinimo: 75,
  // Arriba de todo: los brazos estirados (codo casi recto).
  codoArribaMaximo: 25,
  // Cadera respecto de la línea hombro-tobillo, en grados: caída (+) o arriba (-).
  caderaCaidaMaxima: 15,
  caderaArribaMaxima: 20,
  // Cabeza colgando respecto de la línea del cuerpo.
  cabezaMaxima: 30,
};

export const PROBLEMAS = {
  caderaCaida: {
    titulo: "Cadera caída",
    partes: ["tronco", "muslo"],
    consejo: "Apretá el abdomen y los glúteos para que el cuerpo quede en línea recta de la cabeza a los talones, sin que la panza se hunda.",
    peso: 25,
  },
  caderaArriba: {
    titulo: "Cadera muy arriba",
    partes: ["tronco", "muslo"],
    consejo: "Bajá la cola hasta que el cuerpo quede en línea recta: con la cadera arriba el ejercicio pierde trabajo de pecho y abdomen.",
    peso: 20,
  },
  profundidad: {
    titulo: "Poca profundidad",
    partes: ["brazo", "antebrazo"],
    consejo: "Bajá hasta que los codos queden a unos 90° y el pecho cerca del piso. Si no llegás, hacé menos repeticiones pero completas.",
    peso: 25,
  },
  sinExtender: {
    titulo: "No estirás los brazos arriba",
    partes: ["brazo", "antebrazo"],
    momento: "fin",
    consejo: "Subí hasta estirar los brazos por completo antes de bajar de nuevo.",
    peso: 10,
  },
  cabeza: {
    titulo: "Cabeza colgando",
    partes: ["cuello"],
    consejo: "Mantené el cuello en línea con la espalda: mirá al piso un poco adelante de las manos, sin dejar caer la cabeza.",
    peso: 10,
  },
};

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);

/** Revisa una repetición. `hasta`: índice hasta donde buscar la posición de arriba (la próxima bajada). */
export function revisarRepeticion(cuadros, rep, hasta, u = UMBRALES) {
  const tramo = cuadros.slice(rep.inicio, rep.fin + 1);
  const lineas = valores(tramo, "lineaCadera");
  const cabezas = valores(tramo, "cabeza");
  const arriba = valores(cuadros.slice(rep.fondo, hasta + 1), "codo");
  const medidas = {
    codo: cuadros[rep.fondo].a.codo,
    codoArriba: arriba.length ? Math.min(...arriba) : null,
    // La línea del cuerpo tiene que sostenerse toda la repetición: se mira
    // lo que pasa la mayor parte del tiempo (cuartiles), no un cuadro suelto.
    caderaCaida: lineas.length ? percentil(lineas, 75) : null,
    caderaArriba: lineas.length ? percentil(lineas, 25) : null,
    cabeza: cabezas.length ? percentil(cabezas, 50) : null,
  };
  const problemas = [];
  if (medidas.caderaCaida != null && medidas.caderaCaida > u.caderaCaidaMaxima) {
    problemas.push({ tipo: "caderaCaida", detalle: `La cadera cayó ${medidas.caderaCaida.toFixed(0)}° por debajo de la línea del cuerpo.` });
  } else if (medidas.caderaArriba != null && medidas.caderaArriba < -u.caderaArribaMaxima) {
    problemas.push({ tipo: "caderaArriba", detalle: `La cadera quedó ${(-medidas.caderaArriba).toFixed(0)}° por encima de la línea del cuerpo.` });
  }
  if (medidas.codo != null && medidas.codo < u.codoMinimo) {
    problemas.push({ tipo: "profundidad", detalle: `Los codos llegaron a ${medidas.codo.toFixed(0)}° (conviene unos 90°).` });
  }
  if (medidas.codoArriba != null && medidas.codoArriba > u.codoArribaMaximo) {
    problemas.push({ tipo: "sinExtender", detalle: `Arriba los codos quedaron doblados ${medidas.codoArriba.toFixed(0)}°.` });
  }
  if (medidas.cabeza != null && medidas.cabeza > u.cabezaMaxima) {
    problemas.push({ tipo: "cabeza", detalle: `La cabeza cayó ${medidas.cabeza.toFixed(0)}° respecto de la espalda.` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarFlexiones(cuadros, u = UMBRALES) {
  const reps = separarRepeticiones(cuadros, "codo", u);
  const repeticiones = reps.map((rep, i) => {
    const hasta = i + 1 < reps.length ? reps[i + 1].inicio : cuadros.length - 1;
    const r = revisarRepeticion(cuadros, rep, hasta, u);
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
  if (!valores(cuadros, "codo").length) {
    avisos.push("No vimos bien tus brazos (hombro, codo y muñeca): revisá que se vean de costado durante toda la serie.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
