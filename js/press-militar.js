// Press militar (press de hombros con barra, parado), visto de costado:
// separa las repeticiones y revisa la técnica de cada una.
//
// Lo que NO se revisa: los codos abiertos hacia los costados ni la barra
// torcida (se ven de frente). Se explica en el tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: la extensión del codo (180° − flexión) sube al menos esto
  // desde los hombros hasta arriba (ver repeticiones.js).
  inicioRep: 50,
  duracionMinimaRep: 0.6, // s
  // Torso hacia atrás (arquear la espalda): p10 de la inclinación del tronco.
  atrasMaximo: 12,
  // Piernas: cuánto se doblan las rodillas para impulsar la barra (p90 − p10).
  piernasMaximo: 15,
  // Arriba: los brazos estirados (codo casi recto).
  codoArribaMaximo: 20,
  // Abajo: la barra vuelve a la altura de los hombros (manos sobre los hombros, en largos de tronco).
  manosAbajoMaxima: 0.3,
  // Arriba: la barra sobre la mitad del pie; más adelante que esto, en largos de tronco.
  barraAdelanteMaxima: 0.25,
};

export const PROBLEMAS = {
  atras: {
    titulo: "Te tirás hacia atrás",
    partes: ["tronco"],
    consejo: "Apretá el abdomen y los glúteos para que el torso quede derecho: arquear la espalda para subir la barra carga la zona lumbar.",
    peso: 25,
  },
  piernas: {
    titulo: "Usás las piernas",
    partes: ["muslo", "tibia"],
    consejo: "Dejá las rodillas firmes: si las doblás para impulsar la barra, el trabajo deja de ser de los hombros. Si no sube, bajá el peso.",
    peso: 20,
  },
  sinBloqueo: {
    titulo: "No estirás arriba",
    partes: ["brazo", "antebrazo"],
    consejo: "Empujá hasta estirar los brazos por completo, con la barra arriba de la cabeza.",
    peso: 15,
  },
  recorrido: {
    titulo: "No bajás hasta los hombros",
    partes: ["brazo", "antebrazo"],
    momento: "fin",
    consejo: "Bajá la barra hasta la altura del mentón o la parte alta del pecho antes de volver a subir.",
    peso: 15,
  },
  barraAdelante: {
    titulo: "La barra termina adelante",
    partes: ["brazo", "antebrazo"],
    consejo: "Arriba, la barra tiene que quedar sobre la mitad del pie, con la cabeza pasando un poco adelante entre los brazos.",
    peso: 15,
  },
};

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);

/** Revisa una repetición. */
export function revisarRepeticion(cuadros, rep, u = UMBRALES) {
  const tramo = cuadros.slice(rep.inicio, rep.fin + 1);
  const troncos = valores(tramo, "tronco");
  const rodillas = valores(tramo, "rodilla");
  const arriba = cuadros[rep.fondo].a;
  const medidas = {
    tronco: troncos.length ? percentil(troncos, 10) : null,
    piernas: rodillas.length ? percentil(rodillas, 90) - percentil(rodillas, 10) : null,
    codoArriba: arriba.codo,
    // Abajo de todo al terminar la repetición (antes de la siguiente).
    manosAbajo: cuadros[rep.fin].a.alturaManos,
    barra: arriba.barra,
  };
  const problemas = [];
  if (medidas.tronco != null && medidas.tronco < -u.atrasMaximo) {
    problemas.push({ tipo: "atras", detalle: `El torso se fue ${(-medidas.tronco).toFixed(0)}° hacia atrás.` });
  }
  if (medidas.piernas > u.piernasMaximo) {
    problemas.push({ tipo: "piernas", detalle: `Las rodillas se doblaron ${medidas.piernas.toFixed(0)}° para impulsar la barra.` });
  }
  if (medidas.codoArriba > u.codoArribaMaximo) {
    problemas.push({ tipo: "sinBloqueo", detalle: `Arriba los codos quedaron doblados ${medidas.codoArriba.toFixed(0)}°.` });
  }
  if (medidas.manosAbajo != null && medidas.manosAbajo > u.manosAbajoMaxima) {
    problemas.push({ tipo: "recorrido", detalle: "La barra no volvió a la altura de los hombros." });
  }
  if (medidas.barra != null && medidas.barra > u.barraAdelanteMaxima) {
    problemas.push({ tipo: "barraAdelante", detalle: "Arriba, la barra quedó adelante de la mitad del pie." });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarPressMilitar(cuadros, u = UMBRALES) {
  // Las repeticiones se separan con la extensión del codo: sube al empujar.
  const conExtension = cuadros.map((c) => (c.a?.codo != null ? { ...c, a: { ...c.a, extension: 180 - c.a.codo } } : c));
  const reps = separarRepeticiones(conExtension, "extension", u);
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
    avisos.push("No vimos bien tus brazos (hombro, codo y muñeca): revisá que se vean de costado durante toda la serie.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
