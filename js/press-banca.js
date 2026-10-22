// Press de banca (con barra, acostado en banco plano), visto de costado:
// separa las repeticiones y revisa la técnica de cada una.
//
// Lo que NO se revisa: los codos abiertos a 90° del cuerpo ni la barra
// torcida. Eso se ve de frente o desde arriba, no de costado. Se explica en
// el tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: el codo se flexiona al menos esto desde los brazos estirados (ver repeticiones.js).
  inicioRep: 40,
  duracionMinimaRep: 0.6, // s
  // Abajo: la barra llega al pecho con los codos a ~90° o más.
  codoMinimo: 75,
  // Arriba: los brazos estirados (codo casi recto).
  codoArribaMaximo: 25,
  // Bajada más rápida que esto = sin control (y casi siempre rebote en el pecho).
  bajadaMinima: 0.6, // s
  // Cola despegada del banco: cuánto sube la cadera respecto del principio, en largos de tronco.
  colaMaxima: 0.12,
};

export const PROBLEMAS = {
  cola: {
    titulo: "Despegás la cola del banco",
    partes: ["tronco", "muslo"],
    consejo: "Dejá los glúteos apoyados en el banco todo el tiempo y empujá el piso con los pies: el arco es de la espalda alta, no de la cadera.",
    peso: 25,
  },
  profundidad: {
    titulo: "No llegás al pecho",
    partes: ["brazo", "antebrazo"],
    consejo: "Bajá la barra hasta tocar suavemente el pecho, a la altura de la parte baja del esternón. Si no llegás, bajá el peso.",
    peso: 20,
  },
  sinBloqueo: {
    titulo: "No estirás arriba",
    partes: ["brazo", "antebrazo"],
    momento: "fin",
    consejo: "Empujá hasta estirar los brazos por completo, con la barra arriba de los hombros, antes de bajar otra vez.",
    peso: 10,
  },
  rapida: {
    titulo: "Bajás de golpe",
    partes: ["brazo", "antebrazo"],
    consejo: "Bajá la barra en uno o dos segundos, controlando, sin rebotarla contra el pecho.",
    peso: 20,
  },
};

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);

/** Revisa una repetición. */
export function revisarRepeticion(cuadros, rep, u = UMBRALES) {
  const caderas = valores(cuadros.slice(rep.inicio, rep.fin + 1), "alturaCadera");
  const caderaAlPrincipio = cuadros[rep.inicio].a.alturaCadera;
  const medidas = {
    codo: cuadros[rep.fondo].a.codo,
    // Arriba de todo al terminar la repetición (antes de la siguiente).
    codoArriba: cuadros[rep.fin].a.codo,
    bajada: cuadros[rep.fondo].t - cuadros[rep.inicio].t,
    cola: caderas.length && caderaAlPrincipio != null ? percentil(caderas, 90) - caderaAlPrincipio : null,
  };
  const problemas = [];
  if (medidas.cola != null && medidas.cola > u.colaMaxima) {
    problemas.push({ tipo: "cola", detalle: "La cadera se despegó del banco." });
  }
  if (medidas.codo < u.codoMinimo) {
    problemas.push({ tipo: "profundidad", detalle: `Los codos llegaron a ${medidas.codo.toFixed(0)}° (conviene unos 90°, con la barra en el pecho).` });
  }
  if (medidas.codoArriba > u.codoArribaMaximo) {
    problemas.push({ tipo: "sinBloqueo", detalle: `Arriba los codos quedaron doblados ${medidas.codoArriba.toFixed(0)}°.` });
  }
  if (medidas.bajada < u.bajadaMinima) {
    problemas.push({ tipo: "rapida", detalle: `Bajaste en ${medidas.bajada.toFixed(1).replace(".", ",")} s (conviene más de 1 s).` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarPressBanca(cuadros, u = UMBRALES) {
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
  const tronco = valores(cuadros, "elevacionTronco");
  if (tronco.length && percentil(tronco, 10) > 45) {
    avisos.push("Parece que no estás acostado: el press de banca se hace acostado en un banco plano.");
  }
  if (cuadros.some((c) => c.a) && !valores(cuadros, "codo").length) {
    avisos.push("No vimos bien tus brazos (hombro, codo y muñeca): revisá que se vean de costado durante toda la serie.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
