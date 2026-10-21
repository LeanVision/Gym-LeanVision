// Abdominales, vistos de costado. Hay muchas variantes y cada una se hace
// distinto, así que cada una tiene su análisis. La persona elige la variante
// y, si el video parece de otra, `detectarVariante` lo avisa.
//
// Variantes: encogimiento, abdominal completo, elevación de piernas, crunch
// inverso y plancha. Las de giro (bicicleta, oblicuos, russian twist) no se
// ven de costado y no se revisan.
//
// Lo que NO se revisa en ninguna: si la zona lumbar se despega del piso (el
// modelo no tiene puntos en la columna). Se explica en cada tutorial.
//
// Los umbrales son un punto de partida; los tiene que revisar un
// kinesiólogo y conviene ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

const valores = (cuadros, campo) => cuadros.map((c) => c.a?.[campo]).filter((v) => v != null);
const segundos = (s) => `${s.toFixed(1).replace(".", ",")} s`;

function puntajeCon(problemasPosibles) {
  return (problemas) => Math.max(0, 100 - problemas.reduce((s, p) => s + problemasPosibles[p.tipo].peso, 0));
}

/** Arma el resultado: puntaje, errores más repetidos y avisos. */
function resumir(repeticiones, avisos) {
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const puntaje = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje, avisos };
}

/** Separa las repeticiones con `campo` y revisa cada una con `revisar`. */
function analizarSerie(cuadros, campo, u, revisar, puntaje) {
  return separarRepeticiones(cuadros, campo, u).map((rep, i) => {
    const r = revisar(cuadros, rep, u);
    return {
      numero: i + 1,
      tInicio: cuadros[rep.inicio].t,
      tFondo: cuadros[rep.fondo].t,
      tFin: cuadros[rep.fin].t,
      ...r,
      puntaje: puntaje(r.problemas),
    };
  });
}

/** Aviso si casi todo el video la persona está parada (los abdominales se hacen en el piso). */
function avisoParado(cuadros) {
  const elevaciones = valores(cuadros, "elevacionTronco");
  return elevaciones.length && percentil(elevaciones, 10) > 45
    ? ["Parece que no estás en el piso: los abdominales se hacen acostado (o en plancha, apoyado en los antebrazos)."] : [];
}

/** Cuánto suben los tobillos respecto del principio de la repetición, en largos de tibia. */
function subidaPies(tramo) {
  const pies = valores(tramo, "tobilloSobreCadera");
  const alPrincipio = tramo[0].a?.tobilloSobreCadera;
  return pies.length && alPrincipio != null ? percentil(pies, 90) - alPrincipio : null;
}

// ─── Encogimiento (crunch) ───────────────────────────────────────────────

export const encogimiento = {
  UMBRALES: {
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
  },
  PROBLEMAS: {
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
  },
  revisarRepeticion(cuadros, rep, u = encogimiento.UMBRALES) {
    const tramo = cuadros.slice(rep.inicio, rep.fin + 1);
    // `cabeza` es positiva cuando cuelga: doblarla hacia el pecho da negativo.
    const cuellos = valores(tramo, "cabeza").map((c) => -c);
    const medidas = {
      elevacion: cuadros[rep.fondo].a.elevacionTronco,
      // Lo que pasa buena parte de la repetición, no un cuadro suelto.
      cuello: cuellos.length ? percentil(cuellos, 75) : null,
      pies: subidaPies(tramo),
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
      problemas.push({ tipo: "impulso", detalle: `La repetición duró ${segundos(medidas.duracion)} (conviene unos 2 s).` });
    }
    return { problemas, medidas };
  },
  analizar(cuadros, u = encogimiento.UMBRALES) {
    const reps = analizarSerie(cuadros, "elevacionTronco", u, encogimiento.revisarRepeticion, puntajeCon(encogimiento.PROBLEMAS));
    const avisos = avisoParado(cuadros);
    if (cuadros.some((c) => c.a) && !cuadros.some((c) => c.a?.cabeza != null)) {
      avisos.push("No vimos bien tu cabeza, así que no revisamos el cuello. Revisá que entre en el cuadro.");
    }
    return resumir(reps, avisos);
  },
};

// ─── Abdominal completo (sit-up) ─────────────────────────────────────────

export const abdominalCompleto = {
  UMBRALES: {
    inicioRep: 30,
    duracionMinimaRep: 0.6, // s
    // Arriba de todo el tronco tiene que quedar casi vertical.
    elevacionMinima: 60,
    piesMaximo: 0.3,
    duracionControlada: 1.5, // s
  },
  PROBLEMAS: {
    recorrido: {
      titulo: "No llegás arriba",
      consejo: "Subí hasta quedar sentado, con el tronco casi vertical. Si no llegás, podés hacer encogimientos, que suben menos.",
      peso: 20,
    },
    pies: {
      titulo: "Despegás los pies",
      consejo: "Dejá los pies apoyados (o sujetos debajo de algo). Si se levantan, estás tirando con las piernas en vez de subir con el abdomen.",
      peso: 20,
    },
    impulso: {
      titulo: "Muy rápido, con impulso",
      consejo: "No te tires hacia arriba con los brazos ni rebotes en el piso: subí y bajá despacio, enrollando la espalda.",
      peso: 20,
    },
  },
  revisarRepeticion(cuadros, rep, u = abdominalCompleto.UMBRALES) {
    const tramo = cuadros.slice(rep.inicio, rep.fin + 1);
    const medidas = {
      elevacion: cuadros[rep.fondo].a.elevacionTronco,
      pies: subidaPies(tramo),
      duracion: cuadros[rep.fin].t - cuadros[rep.inicio].t,
    };
    const problemas = [];
    if (medidas.elevacion < u.elevacionMinima) {
      problemas.push({ tipo: "recorrido", detalle: `El tronco subió hasta ${medidas.elevacion.toFixed(0)}° (conviene más de ${u.elevacionMinima}°).` });
    }
    if (medidas.pies != null && medidas.pies > u.piesMaximo) {
      problemas.push({ tipo: "pies", detalle: "Los pies se despegaron del piso." });
    }
    if (medidas.duracion < u.duracionControlada) {
      problemas.push({ tipo: "impulso", detalle: `La repetición duró ${segundos(medidas.duracion)} (conviene unos 3 s).` });
    }
    return { problemas, medidas };
  },
  analizar(cuadros, u = abdominalCompleto.UMBRALES) {
    const reps = analizarSerie(cuadros, "elevacionTronco", u, abdominalCompleto.revisarRepeticion, puntajeCon(abdominalCompleto.PROBLEMAS));
    return resumir(reps, avisoParado(cuadros));
  },
};

// ─── Elevación de piernas ────────────────────────────────────────────────

export const elevacionPiernas = {
  UMBRALES: {
    // Repetición: las piernas suben al menos esto desde el piso.
    inicioRep: 30,
    duracionMinimaRep: 0.8, // s
    // Rodillas: un poco dobladas está bien; más, el ejercicio pierde trabajo.
    rodillaMaxima: 30,
    // Arriba las piernas tienen que quedar casi verticales.
    elevacionMinima: 70,
    // Bajada: desde arriba hasta el piso en menos de esto es dejarlas caer.
    bajadaMinima: 0.8, // s
  },
  PROBLEMAS: {
    rodillas: {
      titulo: "Doblás las rodillas",
      consejo: "Mantené las piernas estiradas, con una flexión mínima. Si te cuesta, empezá con el crunch inverso (rodillas dobladas).",
      peso: 20,
    },
    recorrido: {
      titulo: "Poco recorrido",
      consejo: "Subí las piernas hasta que queden casi verticales, apuntando al techo.",
      peso: 20,
    },
    bajada: {
      titulo: "Bajás de golpe",
      consejo: "Bajá las piernas despacio, controlando, sin dejarlas caer. Si la zona lumbar se despega del piso, no bajes tanto.",
      peso: 25,
    },
  },
  revisarRepeticion(cuadros, rep, u = elevacionPiernas.UMBRALES) {
    const rodillas = valores(cuadros.slice(rep.inicio, rep.fin + 1), "rodilla");
    const medidas = {
      elevacion: cuadros[rep.fondo].a.elevacionPiernas,
      rodilla: rodillas.length ? percentil(rodillas, 75) : null,
      bajada: cuadros[rep.fin].t - cuadros[rep.fondo].t,
    };
    const problemas = [];
    if (medidas.rodilla != null && medidas.rodilla > u.rodillaMaxima) {
      problemas.push({ tipo: "rodillas", detalle: `Las rodillas se doblaron ${medidas.rodilla.toFixed(0)}° (conviene menos de ${u.rodillaMaxima}°).` });
    }
    if (medidas.elevacion < u.elevacionMinima) {
      problemas.push({ tipo: "recorrido", detalle: `Las piernas subieron hasta ${medidas.elevacion.toFixed(0)}° (conviene más de ${u.elevacionMinima}°).` });
    }
    if (medidas.bajada < u.bajadaMinima) {
      problemas.push({ tipo: "bajada", detalle: `Bajaste las piernas en ${segundos(medidas.bajada)} (conviene más de 1 s).` });
    }
    return { problemas, medidas };
  },
  analizar(cuadros, u = elevacionPiernas.UMBRALES) {
    const reps = analizarSerie(cuadros, "elevacionPiernas", u, elevacionPiernas.revisarRepeticion, puntajeCon(elevacionPiernas.PROBLEMAS));
    return resumir(reps, avisoParado(cuadros));
  },
};

// ─── Crunch inverso ──────────────────────────────────────────────────────

export const crunchInverso = {
  UMBRALES: {
    // Repetición: el ángulo entre el tronco y los muslos se cierra al menos esto.
    inicioRep: 20,
    duracionMinimaRep: 0.6, // s
    // Arriba: los muslos bien cerca del pecho (la cadera se despega del piso).
    caderaMinima: 120,
    // Las rodillas siguen dobladas: menos que esto es estirar las piernas (patear).
    rodillaMinima: 60,
    duracionControlada: 1.2, // s
  },
  PROBLEMAS: {
    recorrido: {
      titulo: "La cadera no se despega",
      consejo: "Llevá las rodillas hacia el pecho hasta que la cadera se despegue un poco del piso: ahí trabaja la parte baja del abdomen.",
      peso: 20,
    },
    rodillas: {
      titulo: "Estirás las piernas",
      consejo: "Mantené las rodillas dobladas a unos 90° todo el movimiento, sin patear hacia adelante.",
      peso: 20,
    },
    impulso: {
      titulo: "Muy rápido, con impulso",
      consejo: "Subí y bajá despacio, sin balancear las piernas: el movimiento lo hace el abdomen.",
      peso: 20,
    },
  },
  revisarRepeticion(cuadros, rep, u = crunchInverso.UMBRALES) {
    const rodillas = valores(cuadros.slice(rep.inicio, rep.fin + 1), "rodilla");
    const medidas = {
      cadera: cuadros[rep.fondo].a.cadera,
      rodilla: rodillas.length ? percentil(rodillas, 10) : null,
      duracion: cuadros[rep.fin].t - cuadros[rep.inicio].t,
    };
    const problemas = [];
    if (medidas.cadera < u.caderaMinima) {
      problemas.push({ tipo: "recorrido", detalle: "Las rodillas no llegaron cerca del pecho." });
    }
    if (medidas.rodilla != null && medidas.rodilla < u.rodillaMinima) {
      problemas.push({ tipo: "rodillas", detalle: `Las rodillas se abrieron hasta ${medidas.rodilla.toFixed(0)}° de flexión (conviene unos 90°).` });
    }
    if (medidas.duracion < u.duracionControlada) {
      problemas.push({ tipo: "impulso", detalle: `La repetición duró ${segundos(medidas.duracion)} (conviene unos 2 s).` });
    }
    return { problemas, medidas };
  },
  analizar(cuadros, u = crunchInverso.UMBRALES) {
    const reps = analizarSerie(cuadros, "cadera", u, crunchInverso.revisarRepeticion, puntajeCon(crunchInverso.PROBLEMAS));
    return resumir(reps, avisoParado(cuadros));
  },
};

// ─── Plancha (isométrica) ────────────────────────────────────────────────

/** ¿El cuadro es una plancha? Cuerpo casi horizontal, hombros arriba y piernas estiradas. */
const esPlancha = (a) => a && a.inclinacionCuerpo < 35 && a.alturaHombros > 0.25 && a.rodilla < 35;

export const plancha = {
  UMBRALES: {
    // Menos que esto no se cuenta como plancha.
    duracionMinima: 3, // s
    // Cortes de hasta esto (el modelo pierde el cuerpo un momento) no la cortan.
    pausaMaxima: 0.5, // s
    // Igual que en las flexiones: cadera respecto de la línea hombro-tobillo.
    caderaCaidaMaxima: 15,
    caderaArribaMaxima: 20,
    cabezaMaxima: 30,
  },
  PROBLEMAS: {
    caderaCaida: {
      titulo: "Cadera caída",
      consejo: "Apretá el abdomen y los glúteos para que el cuerpo quede en línea recta de la cabeza a los talones, sin que la panza se hunda.",
      peso: 30,
    },
    caderaArriba: {
      titulo: "Cadera muy arriba",
      consejo: "Bajá la cola hasta que el cuerpo quede en línea recta: con la cadera arriba el abdomen descansa.",
      peso: 20,
    },
    cabeza: {
      titulo: "Cabeza colgando",
      consejo: "Mantené el cuello en línea con la espalda, mirando al piso entre las manos.",
      peso: 10,
    },
  },
  /** La plancha más larga del video: {inicio, fin} como índices de `cuadros`, o null. */
  encontrar(cuadros, u = plancha.UMBRALES) {
    let mejor = null, inicio = null, ultimo = null;
    cuadros.forEach((c, i) => {
      if (!esPlancha(c.a)) return;
      if (inicio == null || c.t - cuadros[ultimo].t > u.pausaMaxima) inicio = i;
      ultimo = i;
      if (!mejor || c.t - cuadros[inicio].t > cuadros[mejor.fin].t - cuadros[mejor.inicio].t) mejor = { inicio, fin: i };
    });
    return mejor && cuadros[mejor.fin].t - cuadros[mejor.inicio].t >= u.duracionMinima ? mejor : null;
  },
  analizar(cuadros, u = plancha.UMBRALES) {
    const tramo = plancha.encontrar(cuadros, u);
    if (!tramo) return { ...resumir([], avisoParado(cuadros)), segundos: 0 };
    const enPlancha = cuadros.slice(tramo.inicio, tramo.fin + 1).filter((c) => esPlancha(c.a));
    const lineas = valores(enPlancha, "lineaCadera");
    const cabezas = valores(enPlancha, "cabeza");
    const medidas = {
      segundos: cuadros[tramo.fin].t - cuadros[tramo.inicio].t,
      // Lo que pasa la mayor parte del tiempo (cuartiles), no un cuadro suelto.
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
    if (medidas.cabeza != null && medidas.cabeza > u.cabezaMaxima) {
      problemas.push({ tipo: "cabeza", detalle: `La cabeza colgó ${medidas.cabeza.toFixed(0)}° respecto de la línea del cuerpo.` });
    }
    // La plancha entera cuenta como una sola "repetición".
    const unica = {
      numero: 1,
      tInicio: cuadros[tramo.inicio].t,
      tFondo: (cuadros[tramo.inicio].t + cuadros[tramo.fin].t) / 2,
      tFin: cuadros[tramo.fin].t,
      problemas,
      medidas,
      puntaje: puntajeCon(plancha.PROBLEMAS)(problemas),
    };
    return { ...resumir([unica], []), segundos: Math.round(medidas.segundos) };
  },
};

// ─── ¿Qué variante es? ───────────────────────────────────────────────────

/**
 * La variante que parece el video, mirando qué se mueve: el tronco
 * (encogimiento o abdominal completo, según cuánto sube), las piernas
 * (elevación de piernas si van estiradas, crunch inverso si van dobladas) o
 * nada (plancha). null si no se puede saber (poco cuerpo, poco movimiento o
 * la persona parada).
 */
export function detectarVariante(cuadros) {
  const conCuerpo = cuadros.filter((c) => c.a);
  if (conCuerpo.length < 10) return null;
  const rango = (campo) => {
    const v = valores(conCuerpo, campo);
    return v.length ? percentil(v, 90) - percentil(v, 10) : 0;
  };
  const rangoTronco = rango("elevacionTronco");
  const rangoPiernas = rango("elevacionPiernas");
  const enPlancha = conCuerpo.filter((c) => esPlancha(c.a)).length / conCuerpo.length;
  if (enPlancha > 0.6 && Math.max(rangoTronco, rangoPiernas) < 15) return "plancha";

  const tronco = valores(conCuerpo, "elevacionTronco");
  if (percentil(tronco, 10) > 30) return null; // nunca se acostó
  if (Math.max(rangoTronco, rangoPiernas) < 15) return null; // casi no se movió
  if (rangoTronco >= rangoPiernas) return percentil(tronco, 95) > 55 ? "abdominalCompleto" : "encogimiento";
  return percentil(valores(conCuerpo, "rodilla"), 50) < 40 ? "elevacionPiernas" : "crunchInverso";
}
