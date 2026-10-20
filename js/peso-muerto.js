// Peso muerto (convencional, desde el piso): separa las repeticiones y
// revisa la técnica de cada una, vista de costado.
//
// Lo que NO se revisa: la espalda redondeada. MediaPipe no tiene puntos en
// la columna, así que una espalda curva y una recta dan el mismo ángulo
// entre hombro y cadera. Se explica en el tutorial.
//
// Los umbrales son un punto de partida; conviene que los revise un
// profesional y ajustarlos con videos reales.

import { percentil, separarRepeticiones } from "./repeticiones.js";

export const UMBRALES = {
  // Repetición: la cadera se flexiona al menos esto por encima de la posición de pie...
  inicioRep: 40,
  // ...y termina cuando vuelve a quedar a menos de esto.
  // Más holgado que en la sentadilla: si no termina derecho (cadera
  // flexionada ~25°), la repetición igual tiene que cerrarse.
  finRep: 25,
  duracionMinimaRep: 0.8, // s
  // Rodillas abajo de todo: más que esto es una sentadilla con la barra,
  // menos es tirar con las piernas rectas (eso es otro ejercicio: el peso
  // muerto rumano o con piernas rígidas).
  rodillaMaxima: 100,
  rodillaMinima: 15,
  // La cadera sube antes que el pecho: en la primera mitad de la subida el
  // tronco se acuesta más de esto respecto del punto más bajo.
  troncoSubeDeMas: 10,
  // Barra lejos: manos más adelante de la mitad del pie que esto (en largos
  // de tronco), mediana de la subida.
  barraMaxima: 0.25,
  // Arriba de todo: la cadera tiene que quedar extendida...
  caderaArribaMaxima: 20,
  // ...sin tirarse hacia atrás.
  troncoAtrasMaximo: -15,
};

export const PROBLEMAS = {
  caderaPrimero: {
    titulo: "La cadera sube antes que el pecho",
    consejo: "Al despegar la barra, empujá el piso con las piernas y subí cadera y hombros juntos. Si la cadera se adelanta, la espalda hace todo el trabajo.",
    peso: 25,
  },
  barraLejos: {
    titulo: "La barra se aleja del cuerpo",
    consejo: "Llevá la barra pegada a las piernas, casi rozándolas, siempre arriba de la mitad del pie. Apretá los dorsales como si quisieras doblar la barra.",
    peso: 25,
  },
  caderaBaja: {
    titulo: "Cadera muy baja (como una sentadilla)",
    consejo: "En el peso muerto la cadera arranca más alta que en la sentadilla: los hombros apenas adelante de la barra y las tibias casi verticales.",
    peso: 15,
  },
  piernasRectas: {
    titulo: "Piernas demasiado rectas",
    consejo: "Flexioná un poco las rodillas para llegar a la barra. Con las piernas rectas toda la carga va a la espalda baja.",
    peso: 15,
  },
  sinBloqueo: {
    titulo: "No terminás derecho",
    consejo: "Arriba de todo, extendé la cadera por completo: apretá los glúteos hasta quedar parado derecho.",
    peso: 10,
  },
  haciaAtras: {
    titulo: "Te tirás hacia atrás arriba",
    consejo: "Al terminar quedate derecho, sin arquear la espalda hacia atrás: los glúteos terminan el movimiento, no la cintura.",
    peso: 10,
  },
};

const mediana = (v) => percentil(v, 50);

/** Revisa una repetición. `hasta`: índice hasta donde buscar el final de la subida (la próxima bajada). */
export function revisarRepeticion(cuadros, rep, hasta, u = UMBRALES) {
  const fondo = cuadros[rep.fondo].a;
  const subida = cuadros.slice(rep.fondo, rep.fin + 1).filter((c) => c.a);
  // Primera mitad de la subida: hasta que la cadera recuperó la mitad de su flexión.
  const mitad = subida.filter((c) => c.a.cadera >= fondo.cadera / 2);
  // Arriba de todo = el cuadro con el tronco más derecho (o más atrás). La
  // flexión de cadera no sirve para buscarlo: no tiene signo, así que
  // tirarse hacia atrás también la hace crecer.
  const arriba = cuadros.slice(rep.fondo, hasta + 1).filter((c) => c.a)
    .reduce((m, c) => (!m || c.a.tronco < m.a.tronco ? c : m), null);
  const barras = subida.map((c) => c.a.barra).filter((v) => v != null);
  const medidas = {
    cadera: fondo.cadera,
    rodilla: fondo.rodilla,
    tronco: fondo.tronco,
    troncoSubida: Math.max(...mitad.map((c) => c.a.tronco)) - fondo.tronco,
    barra: barras.length ? mediana(barras) : null,
    caderaArriba: arriba?.a.cadera ?? null,
    troncoArriba: arriba?.a.tronco ?? null,
  };
  const problemas = [];
  if (medidas.troncoSubida > u.troncoSubeDeMas) {
    problemas.push({ tipo: "caderaPrimero", detalle: `Al empezar a subir, el tronco se acostó ${medidas.troncoSubida.toFixed(0)}° más.` });
  }
  if (medidas.barra != null && medidas.barra > u.barraMaxima) {
    problemas.push({ tipo: "barraLejos", detalle: "Las manos subieron por delante de la mitad del pie." });
  }
  if (medidas.rodilla > u.rodillaMaxima) {
    problemas.push({ tipo: "caderaBaja", detalle: `Las rodillas se flexionaron ${medidas.rodilla.toFixed(0)}° (conviene menos de ${u.rodillaMaxima}°).` });
  } else if (medidas.rodilla < u.rodillaMinima) {
    problemas.push({ tipo: "piernasRectas", detalle: `Las rodillas casi no se flexionaron (${medidas.rodilla.toFixed(0)}°).` });
  }
  if (medidas.troncoArriba != null && medidas.troncoArriba < u.troncoAtrasMaximo) {
    problemas.push({ tipo: "haciaAtras", detalle: `Arriba el tronco quedó ${(-medidas.troncoArriba).toFixed(0)}° hacia atrás.` });
  } else if (medidas.caderaArriba != null && medidas.caderaArriba > u.caderaArribaMaxima) {
    problemas.push({ tipo: "sinBloqueo", detalle: `Arriba la cadera quedó flexionada ${medidas.caderaArriba.toFixed(0)}°.` });
  }
  return { problemas, medidas };
}

export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

export function analizarPesoMuerto(cuadros, u = UMBRALES) {
  const reps = separarRepeticiones(cuadros, "cadera", u);
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
  if (repeticiones.length && repeticiones.every((r) => r.medidas.barra == null)) {
    avisos.push("No vimos tus manos, así que no revisamos el recorrido de la barra.");
  }
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
