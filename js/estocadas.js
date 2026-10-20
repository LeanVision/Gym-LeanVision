// Estocadas (zancadas), vistas de costado: separa las repeticiones y revisa
// la técnica de cada una. Sirve tanto para estocadas en el lugar como
// alternando piernas: la repetición se cuenta con la rodilla que quedó adelante.
//
// Lo que NO se revisa: la rodilla de adelante que se va hacia adentro. Eso
// se ve de frente, no de costado. Se explica en el tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: la rodilla de adelante se flexiona al menos esto (ver repeticiones.js).
  inicioRep: 35,
  duracionMinimaRep: 0.6, // s
  // Profundidad: abajo de todo la rodilla de adelante debería llegar a ~90°.
  rodillaMinima: 75,
  // Tibia de adelante respecto de la vertical: más que esto, la rodilla se
  // fue muy adelante y el peso a la punta del pie (casi siempre, paso corto).
  tibiaMaxima: 30,
  // Torso respecto de la vertical en el punto más bajo.
  troncoMaximo: 25,
};

export const PROBLEMAS = {
  profundidad: {
    titulo: "Poca profundidad",
    consejo: "Bajá la cadera recto hacia abajo hasta que las dos rodillas queden a unos 90°, con la de atrás cerca del piso.",
    peso: 25,
  },
  rodillaAdelante: {
    titulo: "Rodilla muy adelante",
    consejo: "Dá un paso más largo y bajá la cadera hacia abajo, no hacia adelante: el peso en el talón de la pierna de adelante.",
    peso: 25,
  },
  tronco: {
    titulo: "Torso inclinado",
    consejo: "Mantené el pecho arriba y el torso derecho, con el abdomen firme: la estocada baja la cadera, no inclina la espalda.",
    peso: 20,
  },
};

/** Revisa una repetición en su punto más bajo. */
export function revisarRepeticion(cuadros, rep, u = UMBRALES) {
  const fondo = cuadros[rep.fondo].a;
  const medidas = {
    rodillaDelantera: fondo.rodillaDelantera,
    rodillaTrasera: fondo.rodillaTrasera,
    tibiaDelantera: fondo.tibiaDelantera,
    tronco: fondo.tronco,
  };
  const problemas = [];
  if (medidas.rodillaDelantera < u.rodillaMinima) {
    problemas.push({ tipo: "profundidad", detalle: `La rodilla de adelante llegó a ${medidas.rodillaDelantera.toFixed(0)}° (conviene unos 90°).` });
  }
  if (medidas.tibiaDelantera > u.tibiaMaxima) {
    problemas.push({ tipo: "rodillaAdelante", detalle: `La tibia de adelante se inclinó ${medidas.tibiaDelantera.toFixed(0)}° hacia adelante.` });
  }
  if (medidas.tronco > u.troncoMaximo) {
    problemas.push({ tipo: "tronco", detalle: `El torso se inclinó ${medidas.tronco.toFixed(0)}° (conviene menos de ${u.troncoMaximo}°).` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarEstocadas(cuadros, u = UMBRALES) {
  const reps = separarRepeticiones(cuadros, "rodillaDelantera", u);
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
  if (!cuadros.some((c) => c.a?.rodillaDelantera != null)) {
    avisos.push("No vimos bien tus dos piernas: revisá que estés de costado y con el cuerpo entero en cuadro.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
