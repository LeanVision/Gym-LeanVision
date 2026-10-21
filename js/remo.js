// Remo, visto de costado. Se hace de varias formas y cada una tiene sus
// errores, así que cada forma tiene su análisis. La persona elige la forma y,
// si el video parece de otra, `detectarVariante` lo avisa.
//
// Formas: con barra (parado, inclinado), en polea baja (sentado, con cable)
// y en máquina con apoyo de pecho (sentado).
//
// Lo que NO se revisa: la espalda redondeada (el modelo no tiene puntos en la
// columna) ni si los codos se abren hacia los costados (se ve de frente).
//
// Los umbrales son un punto de partida; los tiene que revisar un
// kinesiólogo y conviene ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);
const rango = (v) => (v.length ? percentil(v, 90) - percentil(v, 10) : 0);
const segundos = (s) => `${s.toFixed(1).replace(".", ",")} s`;

// Lo que comparten las tres formas: hasta dónde tira y si estira los brazos.
const COMUNES = {
  // Repetición: el codo se flexiona al menos esto desde los brazos estirados (ver repeticiones.js).
  inicioRep: 40,
  duracionMinimaRep: 0.6, // s
  // Al tirar, el codo llega a ~90° o más (las manos al abdomen).
  codoMinimo: 75,
  // Al volver, los brazos estirados.
  codoAbajoMaximo: 30,
};

const PROBLEMAS_COMUNES = {
  recorrido: {
    titulo: "Poco recorrido",
    consejo: "Tirá hasta que las manos lleguen al abdomen, llevando los codos hacia atrás y juntando los omóplatos.",
    peso: 20,
  },
  sinExtender: {
    titulo: "No estirás los brazos",
    consejo: "Al volver, estirá los brazos por completo antes de tirar de nuevo: así trabaja todo el recorrido.",
    peso: 15,
  },
};

function revisarComunes(cuadros, rep, u) {
  const medidas = { codo: cuadros[rep.fondo].a.codo, codoAbajo: cuadros[rep.fin].a.codo };
  const problemas = [];
  if (medidas.codo < u.codoMinimo) {
    problemas.push({ tipo: "recorrido", detalle: `Los codos llegaron a ${medidas.codo.toFixed(0)}° (conviene unos 90° o más).` });
  }
  if (medidas.codoAbajo > u.codoAbajoMaximo) {
    problemas.push({ tipo: "sinExtender", detalle: `Al volver, los codos quedaron doblados ${medidas.codoAbajo.toFixed(0)}°.` });
  }
  return { problemas, medidas };
}

/** Separa las repeticiones con el codo, revisa cada una y arma el resultado. */
function analizarForma(forma, cuadros, u) {
  const puntaje = (problemas) => Math.max(0, 100 - problemas.reduce((s, p) => s + forma.PROBLEMAS[p.tipo].peso, 0));
  const repeticiones = separarRepeticiones(cuadros, "codo", u).map((rep, i) => {
    const r = forma.revisarRepeticion(cuadros, rep, u);
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

// ─── Con barra (parado, inclinado) ───────────────────────────────────────

export const conBarra = {
  UMBRALES: {
    ...COMUNES,
    // Torso inclinado hacia adelante, respecto de la vertical (la mediana de la repetición).
    troncoMinimo: 30,
    // Cuánto se endereza y vuelve a bajar el torso en la repetición (p90 − p10).
    impulsoMaximo: 15,
  },
  PROBLEMAS: {
    erguido: {
      titulo: "Torso muy erguido",
      consejo: "Inclinate hacia adelante desde la cadera, con la espalda recta, hasta que el torso quede a unos 45° o más: si estás muy derecho, tirás con los hombros y no con la espalda.",
      peso: 20,
    },
    impulso: {
      titulo: "Usás impulso con el torso",
      consejo: "Mantené el torso quieto y que se muevan solo los brazos. Si tenés que enderezarte para subir la barra, bajá el peso.",
      peso: 25,
    },
    ...PROBLEMAS_COMUNES,
  },
  revisarRepeticion(cuadros, rep, u = conBarra.UMBRALES) {
    const troncos = valores(cuadros.slice(rep.inicio, rep.fin + 1), "tronco");
    const comunes = revisarComunes(cuadros, rep, u);
    const medidas = { ...comunes.medidas, tronco: troncos.length ? percentil(troncos, 50) : null, impulso: rango(troncos) };
    const problemas = [];
    if (medidas.tronco != null && medidas.tronco < u.troncoMinimo) {
      problemas.push({ tipo: "erguido", detalle: `El torso estuvo a ${medidas.tronco.toFixed(0)}° de la vertical (conviene 45° o más).` });
    }
    if (medidas.impulso > u.impulsoMaximo) {
      problemas.push({ tipo: "impulso", detalle: `El torso se movió ${medidas.impulso.toFixed(0)}° durante la repetición.` });
    }
    return { problemas: [...problemas, ...comunes.problemas], medidas };
  },
  analizar: (cuadros, u = conBarra.UMBRALES) => analizarForma(conBarra, cuadros, u),
};

// ─── En polea baja (sentado, con cable) ──────────────────────────────────

export const polea = {
  UMBRALES: {
    ...COMUNES,
    // Al tirar, el torso no tendría que ir más atrás de la vertical que esto.
    atrasMaximo: 15,
    // Cuánto va y viene el torso en la repetición (p90 − p10).
    impulsoMaximo: 25,
  },
  PROBLEMAS: {
    atras: {
      titulo: "Te tirás hacia atrás",
      consejo: "Al tirar, quedate con el torso derecho (o apenas atrás): si te acostás hacia atrás, el peso lo mueve el cuerpo y no la espalda.",
      peso: 20,
    },
    impulso: {
      titulo: "Te balanceás",
      consejo: "Mantené el torso firme: no te inclines hacia adelante para tomar envión ni hacia atrás para tirar. Si no podés, bajá el peso.",
      peso: 20,
    },
    ...PROBLEMAS_COMUNES,
  },
  revisarRepeticion(cuadros, rep, u = polea.UMBRALES) {
    const troncos = valores(cuadros.slice(rep.inicio, rep.fin + 1), "troncoHaciaPies");
    const comunes = revisarComunes(cuadros, rep, u);
    const medidas = { ...comunes.medidas, troncoAlTirar: cuadros[rep.fondo].a.troncoHaciaPies, impulso: rango(troncos) };
    const problemas = [];
    if (medidas.troncoAlTirar < -u.atrasMaximo) {
      problemas.push({ tipo: "atras", detalle: `Al tirar, el torso se fue ${(-medidas.troncoAlTirar).toFixed(0)}° hacia atrás.` });
    }
    if (medidas.impulso > u.impulsoMaximo) {
      problemas.push({ tipo: "impulso", detalle: `El torso se movió ${medidas.impulso.toFixed(0)}° durante la repetición.` });
    }
    return { problemas: [...problemas, ...comunes.problemas], medidas };
  },
  analizar: (cuadros, u = polea.UMBRALES) => analizarForma(polea, cuadros, u),
};

// ─── En máquina con apoyo de pecho (sentado) ─────────────────────────────

export const maquina = {
  UMBRALES: {
    ...COMUNES,
    // Con el pecho en el apoyo el torso casi no se mueve.
    pechoMaximo: 10,
    // Volver en menos de esto es soltar el peso.
    vueltaMinima: 0.6, // s
  },
  PROBLEMAS: {
    pecho: {
      titulo: "Despegás el pecho del apoyo",
      consejo: "Dejá el pecho apoyado todo el tiempo y que se muevan solo los brazos y los omóplatos.",
      peso: 20,
    },
    vuelta: {
      titulo: "Soltás el peso de golpe",
      consejo: "Volvé despacio, en uno o dos segundos, sin que las placas choquen.",
      peso: 15,
    },
    ...PROBLEMAS_COMUNES,
  },
  revisarRepeticion(cuadros, rep, u = maquina.UMBRALES) {
    const troncos = valores(cuadros.slice(rep.inicio, rep.fin + 1), "troncoHaciaPies");
    const comunes = revisarComunes(cuadros, rep, u);
    const medidas = { ...comunes.medidas, pecho: rango(troncos), vuelta: cuadros[rep.fin].t - cuadros[rep.fondo].t };
    const problemas = [];
    if (medidas.pecho > u.pechoMaximo) {
      problemas.push({ tipo: "pecho", detalle: `El torso se movió ${medidas.pecho.toFixed(0)}° durante la repetición.` });
    }
    if (medidas.vuelta < u.vueltaMinima) {
      problemas.push({ tipo: "vuelta", detalle: `Volviste en ${segundos(medidas.vuelta)} (conviene más de 1 s).` });
    }
    return { problemas: [...problemas, ...comunes.problemas], medidas };
  },
  analizar: (cuadros, u = maquina.UMBRALES) => analizarForma(maquina, cuadros, u),
};

// ─── ¿Qué forma es? ──────────────────────────────────────────────────────

/**
 * La forma que parece el video, por la postura: parado (los muslos casi
 * verticales) es con barra; sentado con las rodillas bien dobladas es la
 * máquina; sentado con las piernas más estiradas es la polea. null si no se
 * puede saber.
 */
export function detectarVariante(cuadros) {
  const conCuerpo = cuadros.filter((c) => c.a);
  if (conCuerpo.length < 10) return null;
  const muslos = valores(conCuerpo, "elevacionPiernas");
  if (percentil(muslos, 50) < -45) return "remoBarra";
  return percentil(valores(conCuerpo, "rodilla"), 50) > 60 ? "remoMaquina" : "remoPolea";
}
