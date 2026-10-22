// Hip thrust (empuje de cadera con barra, la espalda apoyada en un banco),
// visto de costado: separa las repeticiones y revisa la técnica de cada una.
//
// Lo que NO se revisa: si la zona lumbar se arquea por su cuenta (el modelo
// no tiene puntos en la columna; sí se ve si la cadera sube de más) ni si
// las rodillas se van hacia adentro (se ve de frente). Se explica en el
// tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: la cadera sube al menos esto (ver repeticiones.js), medido
  // como 90° menos el desvío de la cadera respecto de la línea hombro-rodilla.
  inicioRep: 20,
  duracionMinimaRep: 0.6, // s
  // Arriba: hombros, cadera y rodillas en línea. Más abajo que esto es no
  // extender; más arriba, arquear la espalda.
  caderaAbajoMaxima: 15,
  caderaArribaMaxima: 15,
  // Tibias arriba de todo, respecto de la vertical (+ = rodilla adelante del tobillo).
  tibiaMaxima: 20,
  // Bajada más rápida que esto = dejar caer la cadera.
  bajadaMinima: 0.6, // s
};

export const PROBLEMAS = {
  recorrido: {
    titulo: "No extendés la cadera",
    consejo: "Subí hasta que los hombros, la cadera y las rodillas queden en línea, apretando los glúteos arriba.",
    peso: 25,
  },
  arqueo: {
    titulo: "Subís la cadera de más",
    consejo: "Arriba, el cuerpo en línea recta: si la cadera sube más que eso, arqueás la zona lumbar. Mirá hacia adelante, con el mentón apenas hacia el pecho.",
    peso: 20,
  },
  piesCerca: {
    titulo: "Pies muy cerca",
    consejo: "Alejá un poco los pies: arriba, las tibias tienen que quedar verticales, con las rodillas sobre los tobillos.",
    peso: 15,
  },
  piesLejos: {
    titulo: "Pies muy lejos",
    consejo: "Acercá un poco los pies: con las tibias inclinadas hacia atrás trabajan más los isquiotibiales que los glúteos.",
    peso: 15,
  },
  bajada: {
    titulo: "Bajás de golpe",
    consejo: "Bajá la cadera despacio, en uno o dos segundos, sin dejarla caer.",
    peso: 15,
  },
};

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);

/** Revisa una repetición. */
export function revisarRepeticion(cuadros, rep, u = UMBRALES) {
  const arriba = cuadros[rep.fondo].a;
  const medidas = {
    cadera: arriba.caderaHombroRodilla,
    tibia: arriba.tibia,
    bajada: cuadros[rep.fin].t - cuadros[rep.fondo].t,
  };
  const problemas = [];
  if (medidas.cadera > u.caderaAbajoMaxima) {
    problemas.push({ tipo: "recorrido", detalle: `Arriba, la cadera quedó ${medidas.cadera.toFixed(0)}° por debajo de la línea hombros-rodillas.` });
  } else if (medidas.cadera < -u.caderaArribaMaxima) {
    problemas.push({ tipo: "arqueo", detalle: `Arriba, la cadera subió ${(-medidas.cadera).toFixed(0)}° por encima de la línea hombros-rodillas.` });
  }
  if (medidas.tibia > u.tibiaMaxima) {
    problemas.push({ tipo: "piesCerca", detalle: `Arriba, las tibias quedaron inclinadas ${medidas.tibia.toFixed(0)}° hacia adelante.` });
  } else if (medidas.tibia < -u.tibiaMaxima) {
    problemas.push({ tipo: "piesLejos", detalle: `Arriba, las tibias quedaron inclinadas ${(-medidas.tibia).toFixed(0)}° hacia atrás.` });
  }
  if (medidas.bajada < u.bajadaMinima) {
    problemas.push({ tipo: "bajada", detalle: `Bajaste en ${medidas.bajada.toFixed(1).replace(".", ",")} s (conviene más de 1 s).` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarHipThrust(cuadros, u = UMBRALES) {
  // Las repeticiones se separan con cuánto sube la cadera: 90° menos su
  // desvío de la línea hombro-rodilla (sigue subiendo aunque pase la línea).
  const conSubida = cuadros.map((c) => (c.a?.caderaHombroRodilla != null
    ? { ...c, a: { ...c.a, subida: 90 - c.a.caderaHombroRodilla } } : c));
  const reps = separarRepeticiones(conSubida, "subida", u);
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
  if (tronco.length && Math.min(...tronco) > 60) {
    avisos.push("Parece que estás parado: el hip thrust se hace con la espalda apoyada en un banco y los pies en el piso.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
