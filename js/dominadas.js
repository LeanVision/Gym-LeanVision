// Dominadas (pull-ups) en barra, vistas de costado: separa las repeticiones
// y revisa la técnica de cada una.
//
// Lo que NO se revisa: los hombros que suben hacia las orejas (las
// escápulas): de costado el modelo no lo distingue bien. Se explica en el
// tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: el codo se flexiona al menos esto desde los brazos estirados (ver repeticiones.js).
  inicioRep: 40,
  duracionMinimaRep: 0.6, // s
  // Arriba: la nariz por encima de las manos, en largos de tronco. La
  // muñeca queda unos cm debajo de la barra y el mentón unos cm debajo de la
  // nariz: con ~0,15 el mentón llega a la barra.
  barbillaMinima: 0.15,
  // Si no se ve la nariz, se usa el codo: arriba tendría que doblarse al menos esto.
  codoArribaMinimo: 120,
  // Abajo: los brazos estirados (codo casi recto).
  codoAbajoMaximo: 25,
  // Balanceo: cuánto va y viene el tronco durante la repetición, o cuánto
  // suben las rodillas (patear para impulsarse).
  balanceoMaximo: 20,
  caderaMaxima: 45,
  // Bajada: desde arriba hasta abajo en menos de esto es dejarse caer.
  bajadaMinima: 0.8, // s
};

export const PROBLEMAS = {
  recorrido: {
    titulo: "No pasás la barbilla",
    consejo: "Subí hasta que el mentón pase por encima de la barra, llevando el pecho hacia ella. Si no llegás, ayudate con una banda elástica.",
    peso: 25,
  },
  sinExtender: {
    titulo: "No estirás los brazos abajo",
    consejo: "Bajá hasta estirar los brazos por completo antes de volver a subir: las medias dominadas trabajan la mitad.",
    peso: 20,
  },
  balanceo: {
    titulo: "Te balanceás",
    consejo: "Subí con el cuerpo firme, sin patear ni balancearte: apretá el abdomen y los glúteos, con las piernas juntas.",
    peso: 20,
  },
  bajada: {
    titulo: "Te dejás caer",
    consejo: "Bajá despacio, controlando, hasta estirar los brazos. La bajada también trabaja la espalda y cuida los hombros.",
    peso: 15,
  },
};

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);

/** Revisa una repetición. */
export function revisarRepeticion(cuadros, rep, u = UMBRALES) {
  const tramo = cuadros.slice(rep.inicio, rep.fin + 1);
  const barbillas = valores(tramo, "barbilla");
  const troncos = valores(tramo, "tronco");
  const caderas = valores(tramo, "cadera");
  const medidas = {
    barbilla: barbillas.length ? Math.max(...barbillas) : null,
    codoArriba: cuadros[rep.fondo].a.codo,
    // Abajo de todo al terminar la repetición (antes de la siguiente).
    codoAbajo: cuadros[rep.fin].a.codo,
    balanceo: troncos.length ? percentil(troncos, 90) - percentil(troncos, 10) : null,
    cadera: caderas.length ? percentil(caderas, 90) : null,
    bajada: cuadros[rep.fin].t - cuadros[rep.fondo].t,
  };
  const problemas = [];
  if (medidas.barbilla != null ? medidas.barbilla < u.barbillaMinima : medidas.codoArriba < u.codoArribaMinimo) {
    problemas.push({ tipo: "recorrido", detalle: "La barbilla no llegó a la altura de la barra." });
  }
  if (medidas.codoAbajo != null && medidas.codoAbajo > u.codoAbajoMaximo) {
    problemas.push({ tipo: "sinExtender", detalle: `Abajo los codos quedaron doblados ${medidas.codoAbajo.toFixed(0)}°.` });
  }
  if ((medidas.balanceo ?? 0) > u.balanceoMaximo || (medidas.cadera ?? 0) > u.caderaMaxima) {
    problemas.push({ tipo: "balanceo", detalle: medidas.cadera > u.caderaMaxima
      ? `Subiste las rodillas (cadera doblada ${medidas.cadera.toFixed(0)}°) para impulsarte.`
      : `El cuerpo se balanceó ${medidas.balanceo.toFixed(0)}° durante la repetición.` });
  }
  if (medidas.bajada < u.bajadaMinima) {
    problemas.push({ tipo: "bajada", detalle: `Bajaste en ${medidas.bajada.toFixed(1).replace(".", ",")} s (conviene más de 1 s).` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarDominadas(cuadros, u = UMBRALES) {
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
    avisos.push("No vimos bien tus brazos (hombro, codo y muñeca): revisá que se vean de costado durante toda la serie.");
  } else if (repeticiones.length && !valores(cuadros, "barbilla").length) {
    avisos.push("No vimos bien tu cara, así que la altura de la barbilla la estimamos con los codos.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
