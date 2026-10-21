// Curl de bíceps (con mancuernas o barra, parado), visto de costado: separa
// las repeticiones y revisa la técnica de cada una.
//
// Lo que NO se revisa: las muñecas dobladas ni si un brazo trabaja más que el
// otro (de costado se ve bien un solo brazo). Se explica en el tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: el codo se flexiona al menos esto desde los brazos estirados (ver repeticiones.js).
  inicioRep: 50,
  duracionMinimaRep: 0.6, // s
  // Balanceo: cuánto va y viene el tronco en la repetición (p90 − p10).
  balanceoMaximo: 10,
  // Codo adelante: el brazo respecto del tronco (p90 de la repetición).
  codoAdelanteMaximo: 25,
  // Arriba: el codo flexionado al menos esto.
  codoArribaMinimo: 110,
  // Abajo: los brazos estirados.
  codoAbajoMaximo: 30,
  // Bajada más rápida que esto = soltar el peso.
  bajadaMinima: 0.8, // s
};

export const PROBLEMAS = {
  balanceo: {
    titulo: "Te balanceás",
    consejo: "Mantené el torso quieto, con el abdomen firme: si tenés que tirarte hacia atrás para subir, el peso es mucho.",
    peso: 25,
  },
  codoAdelante: {
    titulo: "Llevás el codo adelante",
    consejo: "Dejá los codos pegados al costado del cuerpo: que se mueva solo el antebrazo. Si el codo se va adelante, trabaja el hombro.",
    peso: 20,
  },
  recorrido: {
    titulo: "No subís del todo",
    consejo: "Subí hasta que el antebrazo quede casi vertical, apretando el bíceps arriba.",
    peso: 15,
  },
  sinExtender: {
    titulo: "No estirás los brazos abajo",
    consejo: "Bajá hasta estirar los brazos por completo antes de volver a subir: las medias repeticiones trabajan la mitad.",
    peso: 15,
  },
  bajada: {
    titulo: "Bajás de golpe",
    consejo: "Bajá despacio, en uno o dos segundos: la bajada controlada también trabaja el bíceps.",
    peso: 15,
  },
};

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);

/** Revisa una repetición. */
export function revisarRepeticion(cuadros, rep, u = UMBRALES) {
  const tramo = cuadros.slice(rep.inicio, rep.fin + 1);
  const troncos = valores(tramo, "tronco");
  const brazos = valores(tramo, "brazo");
  const medidas = {
    balanceo: troncos.length ? percentil(troncos, 90) - percentil(troncos, 10) : null,
    codoAdelante: brazos.length ? percentil(brazos, 90) : null,
    codoArriba: cuadros[rep.fondo].a.codo,
    // Abajo de todo al terminar la repetición (antes de la siguiente).
    codoAbajo: cuadros[rep.fin].a.codo,
    bajada: cuadros[rep.fin].t - cuadros[rep.fondo].t,
  };
  const problemas = [];
  if (medidas.balanceo > u.balanceoMaximo) {
    problemas.push({ tipo: "balanceo", detalle: `El torso se movió ${medidas.balanceo.toFixed(0)}° durante la repetición.` });
  }
  if (medidas.codoAdelante > u.codoAdelanteMaximo) {
    problemas.push({ tipo: "codoAdelante", detalle: `El codo se fue ${medidas.codoAdelante.toFixed(0)}° adelante del cuerpo.` });
  }
  if (medidas.codoArriba < u.codoArribaMinimo) {
    problemas.push({ tipo: "recorrido", detalle: `Arriba el codo llegó a ${medidas.codoArriba.toFixed(0)}° (conviene más de ${u.codoArribaMinimo}°).` });
  }
  if (medidas.codoAbajo > u.codoAbajoMaximo) {
    problemas.push({ tipo: "sinExtender", detalle: `Abajo los codos quedaron doblados ${medidas.codoAbajo.toFixed(0)}°.` });
  }
  if (medidas.bajada < u.bajadaMinima) {
    problemas.push({ tipo: "bajada", detalle: `Bajaste en ${medidas.bajada.toFixed(1).replace(".", ",")} s (conviene más de 1 s).` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarCurl(cuadros, u = UMBRALES) {
  const reps = separarRepeticiones(cuadros, "codo", u);
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
  if (cuadros.some((c) => c.a) && !valores(cuadros, "codo").length) {
    avisos.push("No vimos bien tu brazo (hombro, codo y muñeca): revisá que el brazo del lado de la cámara se vea durante toda la serie.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
