// Sentadilla: separa las repeticiones y revisa la técnica de cada una.
//
// Los umbrales son un punto de partida razonable para una sentadilla con
// barra o sin peso vista de costado; conviene que los revise un profesional
// (kinesiólogo, entrenador) y ajustarlos con videos reales.

export const UMBRALES = {
  // Repetición: la rodilla se flexiona al menos esto por encima de la posición de pie...
  inicioRep: 35,
  // ...y termina cuando vuelve a quedar a menos de esto.
  finRep: 15,
  duracionMinimaRep: 0.6, // s: más corto es ruido o un amague
  // Profundidad: el muslo debería llegar al paralelo (0°). Hasta 15° por
  // encima se acepta; más, es una sentadilla corta.
  musloMaximo: 15,
  // Inclinación del tronco en el punto más bajo.
  troncoMaximo: 50,
  // Talón despegado: cuánto sube el tobillo respecto de la posición de pie,
  // en largos de tibia. Un despegue claro (4-5 cm) lo sube ~8 %.
  talonMaximo: 0.07,
  // Se mira la mediana alrededor del punto más bajo (±s), no el peor cuadro:
  // un cuadro suelto con el pie mal ubicado no tiene que bastar.
  ventanaTalon: 0.3,
  // Con la tibia más chica que esto en la imagen, el temblor del modelo
  // (2-5 px) es del tamaño de un despegue real: los talones no se revisan.
  tibiaMinimaPx: 80,
  // Bajada más rápida que esto = sin control.
  bajadaMinima: 0.7, // s
};

export const PROBLEMAS = {
  profundidad: {
    titulo: "Poca profundidad",
    consejo: "Bajá hasta que el muslo quede paralelo al piso (la cadera a la altura de la rodilla), si tu movilidad te lo permite sin dolor.",
    peso: 25,
  },
  tronco: {
    titulo: "Tronco muy inclinado",
    consejo: "Mantené el pecho arriba y el peso en el medio del pie. Pensá en sentarte entre los talones, no en llevar la cola muy atrás.",
    peso: 25,
  },
  talones: {
    titulo: "Se levantan los talones",
    consejo: "Apoyá todo el pie y empujá el piso con los talones. Si no podés, abrí un poco más los pies o trabajá la movilidad de tobillo.",
    peso: 20,
  },
  rapida: {
    titulo: "Bajada muy rápida",
    consejo: "Controlá la bajada: unos 2 segundos para bajar y subí con fuerza.",
    peso: 10,
  },
};

function percentil(valores, p) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.max(0, Math.round((p / 100) * (v.length - 1))))];
}

function suavizar(serie, ventana) {
  return serie.map((_, i) => {
    let suma = 0, n = 0;
    for (let j = i - ventana; j <= i + ventana; j++) {
      if (j >= 0 && j < serie.length && serie[j] != null) { suma += serie[j]; n++; }
    }
    return n ? suma / n : null;
  });
}

/**
 * Separa las repeticiones a partir de la flexión de rodilla.
 * `cuadros`: [{t, a}] con `a` = ángulos del cuadro o null.
 * Devuelve [{inicio, fondo, fin}] como índices de `cuadros`.
 */
export function separarRepeticiones(cuadros, u = UMBRALES) {
  const fps = cuadros.length > 1 ? (cuadros.length - 1) / (cuadros.at(-1).t - cuadros[0].t) : 15;
  const rodilla = suavizar(cuadros.map((c) => c.a?.rodilla ?? null), Math.max(1, Math.round(fps * 0.1)));
  const deFondo = percentil(rodilla.filter((r) => r != null), 10);
  if (deFondo == null) return [];

  const reps = [];
  let inicio = null, fondo = null, ultimoParado = 0;
  rodilla.forEach((r, i) => {
    // El suavizado rellena los cuadros sin cuerpo; esos no pueden ser el
    // punto más bajo ni el inicio, porque no tienen ángulos para revisar.
    if (r == null || !cuadros[i].a) return;
    if (inicio == null) {
      if (r <= deFondo + u.finRep) ultimoParado = i;
      if (r >= deFondo + u.inicioRep) { inicio = ultimoParado; fondo = i; }
      return;
    }
    if (r > rodilla[fondo]) fondo = i;
    if (r <= deFondo + u.finRep) {
      if (cuadros[i].t - cuadros[inicio].t >= u.duracionMinimaRep) reps.push({ inicio, fondo, fin: i });
      inicio = null;
      ultimoParado = i;
    }
  });
  return reps;
}

/** Revisa una repetición. Devuelve {problemas: [{tipo, detalle}], medidas}. */
export function revisarRepeticion(cuadros, rep, tobilloDePie, u = UMBRALES) {
  const fondo = cuadros[rep.fondo].a;
  const tFondo = cuadros[rep.fondo].t;
  const alrededor = cuadros
    .filter((c) => c.a?.alturaTobillo != null && Math.abs(c.t - tFondo) <= u.ventanaTalon)
    .map((c) => c.a.alturaTobillo - tobilloDePie);
  const medidas = {
    muslo: fondo.muslo,
    tronco: fondo.tronco,
    rodilla: fondo.rodilla,
    talon: tobilloDePie == null || !alrededor.length ? null : percentil(alrededor, 50),
    bajada: cuadros[rep.fondo].t - cuadros[rep.inicio].t,
    subida: cuadros[rep.fin].t - cuadros[rep.fondo].t,
  };
  const problemas = [];
  if (medidas.muslo > u.musloMaximo) {
    problemas.push({ tipo: "profundidad", detalle: `El muslo quedó ${medidas.muslo.toFixed(0)}° por encima del paralelo.` });
  }
  if (medidas.tronco > u.troncoMaximo) {
    problemas.push({ tipo: "tronco", detalle: `El tronco se inclinó ${medidas.tronco.toFixed(0)}° (conviene menos de ${u.troncoMaximo}°).` });
  }
  if (medidas.talon != null && medidas.talon > u.talonMaximo) {
    problemas.push({ tipo: "talones", detalle: "El talón se despegó del piso en el punto más bajo." });
  }
  if (medidas.bajada < u.bajadaMinima) {
    problemas.push({ tipo: "rapida", detalle: `Bajaste en ${medidas.bajada.toFixed(1)} s.` });
  }
  return { problemas, medidas };
}

/** Puntaje 0-100 de una repetición según sus problemas. */
export function puntaje(problemas) {
  return Math.max(0, 100 - problemas.reduce((s, p) => s + PROBLEMAS[p.tipo].peso, 0));
}

/** Analiza la serie completa. */
export function analizarSentadilla(cuadros, u = UMBRALES) {
  const reps = separarRepeticiones(cuadros, u);
  // Referencia de pie: antes de la primera bajada (o todo el video si no hay).
  const dePie = cuadros.slice(0, reps[0]?.inicio + 1 || cuadros.length).filter((c) => c.a);
  const tobillo = dePie.map((c) => c.a.alturaTobillo).filter((v) => v != null);
  const tibiaPx = percentil(dePie.map((c) => c.a.largoTibiaPx), 50);
  const avisos = [];
  let tobilloDePie = tobillo.length ? percentil(tobillo, 50) : null;
  if (tibiaPx != null && tibiaPx < u.tibiaMinimaPx) {
    tobilloDePie = null;
    avisos.push("No revisamos los talones: en el video te vemos muy chica o chico (o tiene poca resolución). "
      + "Grabá en mayor calidad o acercá un poco el celular.");
  }
  const repeticiones = reps.map((rep, i) => {
    const r = revisarRepeticion(cuadros, rep, tobilloDePie, u);
    return {
      numero: i + 1,
      tInicio: cuadros[rep.inicio].t,
      tFondo: cuadros[rep.fondo].t,
      tFin: cuadros[rep.fin].t,
      ...r,
      puntaje: puntaje(r.problemas),
    };
  });
  // Lo que más se repite, para el resumen.
  const conteo = {};
  for (const r of repeticiones) for (const p of r.problemas) conteo[p.tipo] = (conteo[p.tipo] || 0) + 1;
  const principales = Object.entries(conteo).sort((a, b) => b[1] - a[1]).map(([tipo, veces]) => ({ tipo, veces }));
  const total = repeticiones.length
    ? Math.round(repeticiones.reduce((s, r) => s + r.puntaje, 0) / repeticiones.length) : null;
  return { repeticiones, principales, puntaje: total, avisos };
}
