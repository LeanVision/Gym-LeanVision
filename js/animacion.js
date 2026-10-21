// Muñequito de palitos que hace el ejercicio mientras se analiza el video.
//
// Cada ejercicio tiene dos posturas (arriba y abajo) descritas con unos
// pocos números; la animación va y viene entre las dos. Los puntos apoyados
// (pies, manos en las flexiones) quedan fijos y las rodillas y los codos se
// calculan para que los huesos no cambien de largo.
//
// Dibujo en un viewBox de 120 × 100, con el piso en y = 96 y mirando a +x.

const PISO = 96;
const L = { tronco: 30, cuello: 11, cabeza: 6, brazo: 16, antebrazo: 15, muslo: 22, tibia: 22 };
const PERIODO = 2.4; // s por repetición

const rad = (g) => (g * Math.PI) / 180;
/** Punto a `largo` de `o`, en la dirección `g` grados (0 = +x, 90 = arriba). */
const polar = (o, largo, g) => [o[0] + largo * Math.cos(rad(g)), o[1] - largo * Math.sin(rad(g))];

/**
 * Articulación del medio entre `a` y `b` (rodilla, codo) con huesos de largo
 * l1 y l2. De las dos posibles, la que queda más hacia `hacia` ([x, y]).
 */
function articulacion(a, b, l1, l2, hacia) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
  const base = [a[0] + ux * x, a[1] + uy * x];
  const c1 = [base[0] - uy * h, base[1] + ux * h];
  const c2 = [base[0] + uy * h, base[1] - ux * h];
  const hacia1 = (c1[0] - base[0]) * hacia[0] + (c1[1] - base[1]) * hacia[1];
  return hacia1 >= 0 ? c1 : c2;
}

/** Brazo recto desde el hombro en la dirección `g`. */
const brazoRecto = (hombro, g) => {
  const codo = polar(hombro, L.brazo, g);
  return [hombro, codo, polar(codo, L.antebrazo, g)];
};

/** Cabeza y tronco desde la cadera: [huesos, cabeza, hombro]. */
function torso(cadera, gTronco, gCuello) {
  const hombro = polar(cadera, L.tronco, gTronco);
  const cabeza = polar(hombro, L.cuello, gCuello);
  return { hombro, cabeza, hueso: [cadera, hombro, polar(hombro, L.cuello - L.cabeza, gCuello)] };
}

/** De pie: el tobillo fijo y la rodilla hacia adelante. */
function piernaDePie(cadera, tobillo, hacia = [1, 0]) {
  return [cadera, articulacion(cadera, tobillo, L.muslo, L.tibia, hacia), tobillo, [tobillo[0] + 8, PISO]];
}

// Cada ejercicio: { arriba, abajo, figura(p) } con p = postura interpolada.
// figura devuelve { lineas: [[puntos…]], cabeza: [x, y], discos?: [{x, y, r}] }.
// Opcionales: muebles (banco, barra: más claros que el cuerpo), caja (viewBox,
// si la figura no entra en el normal) y sinPiso.
const FIGURAS = {
  sentadilla: {
    arriba: { cx: 57, cy: 53, tronco: 5, brazo: -70 },
    abajo: { cx: 43, cy: 76, tronco: 38, brazo: 0 },
    figura: (p) => {
      const cadera = [p.cx, p.cy];
      const t = torso(cadera, 90 - p.tronco, 90 - p.tronco * 0.4);
      return {
        lineas: [piernaDePie(cadera, [60, PISO - 3]), t.hueso, brazoRecto(t.hombro, p.brazo)],
        cabeza: t.cabeza,
      };
    },
  },
  pesoMuerto: {
    arriba: { cx: 57, cy: 53, tronco: 0 },
    abajo: { cx: 38, cy: 73, tronco: 60 },
    figura: (p) => {
      const cadera = [p.cx, p.cy];
      const t = torso(cadera, 90 - p.tronco, 90 - p.tronco * 0.8);
      const brazo = brazoRecto(t.hombro, -90);
      const mano = brazo[2];
      return {
        lineas: [piernaDePie(cadera, [60, PISO - 3]), t.hueso, brazo, [[mano[0] - 2, mano[1]], [mano[0] + 2, mano[1]]]],
        cabeza: t.cabeza,
        discos: [{ x: mano[0], y: mano[1], r: 7 }],
      };
    },
  },
  flexiones: {
    // Cuerpo recto que gira sobre los pies; las manos quedan fijas en el piso.
    arriba: { cuerpo: 21.5, cuello: 18 },
    abajo: { cuerpo: 7, cuello: 7 },
    figura: (p) => {
      const tobillo = [14, PISO - 4];
      const rodilla = polar(tobillo, L.tibia, p.cuerpo);
      const cadera = polar(rodilla, L.muslo, p.cuerpo);
      const t = torso(cadera, p.cuerpo, p.cuello);
      const mano = [86, PISO - 1];
      const codo = articulacion(t.hombro, mano, L.brazo, L.antebrazo, [-1, -0.3]);
      return {
        lineas: [[[tobillo[0] - 4, PISO], tobillo, rodilla, cadera], t.hueso, [t.hombro, codo, mano]],
        cabeza: t.cabeza,
      };
    },
  },
  estocadas: {
    arriba: { cy: 59, tronco: 3 },
    abajo: { cy: 77, tronco: 6 },
    figura: (p) => {
      const cadera = [52, p.cy];
      const t = torso(cadera, 90 - p.tronco, 90 - p.tronco);
      const tobilloAtras = [33, PISO - 5];
      const rodillaAtras = articulacion(cadera, tobilloAtras, L.muslo, L.tibia, [0.3, 1]);
      return {
        lineas: [
          piernaDePie(cadera, [72, PISO - 3]),
          [cadera, rodillaAtras, tobilloAtras, [tobilloAtras[0] - 5, PISO]],
          t.hueso,
          brazoRecto(t.hombro, -95),
        ],
        cabeza: t.cabeza,
      };
    },
  },
  dominadas: {
    // Colgado de la barra (sin piso): las manos quedan fijas y sube el cuerpo.
    caja: "0 -6 120 106",
    sinPiso: true,
    arriba: { hy: 12, inc: 8 },
    abajo: { hy: 37, inc: 2 },
    figura: (p) => {
      const mano = [70, 6];
      const hombro = [57, p.hy];
      const codo = articulacion(hombro, mano, L.brazo, L.antebrazo, [1, 0.6]);
      // El tronco cuelga del hombro, apenas inclinado hacia atrás arriba (pecho a la barra).
      const cadera = polar(hombro, L.tronco, 270 - p.inc);
      // La cabeza apenas hacia atrás, para que el brazo no la tape.
      const t = torso(cadera, 90 - p.inc, 104);
      const rodilla = polar(cadera, L.muslo, 280);
      const tobillo = polar(rodilla, L.tibia, 190); // rodillas dobladas, pies atrás
      return {
        muebles: [[[38, 6], [100, 6]]],
        lineas: [[hombro, codo, mano], t.hueso, [cadera, rodilla, tobillo]],
        cabeza: t.cabeza,
      };
    },
  },
  pressBanca: {
    // Acostado en el banco: los hombros y la cadera quietos, la barra sube y baja.
    arriba: { manoY: 38 },
    abajo: { manoY: 58 },
    figura: (p) => {
      const banco = PISO - 24;
      const cadera = [36, banco - 5];
      const t = torso(cadera, 0, 0);
      const mano = [t.hombro[0] - 2, p.manoY];
      const codo = articulacion(t.hombro, mano, L.brazo, L.antebrazo, [-1, 0.3]);
      const tobillo = [10, PISO - 3];
      const rodilla = articulacion(cadera, tobillo, L.muslo, L.tibia, [-0.3, -1]);
      return {
        muebles: [[[24, banco], [92, banco]], [[30, banco], [30, PISO]], [[86, banco], [86, PISO]]],
        lineas: [[cadera, rodilla, tobillo, [tobillo[0] + 7, PISO]], t.hueso, [t.hombro, codo, mano]],
        cabeza: t.cabeza,
        discos: [{ x: mano[0], y: mano[1], r: 8 }],
      };
    },
  },
  curl: {
    // Parado: el codo queda quieto al costado y el antebrazo sube con la mancuerna.
    arriba: { antebrazo: -78 },
    abajo: { antebrazo: 68 },
    figura: (p) => {
      const cadera = [58, 53];
      const t = torso(cadera, 90, 90);
      const codo = [t.hombro[0] - 1, t.hombro[1] + L.brazo];
      const mano = polar(codo, L.antebrazo, p.antebrazo);
      return {
        lineas: [piernaDePie(cadera, [60, PISO - 3]), t.hueso, [t.hombro, codo, mano]],
        cabeza: t.cabeza,
        discos: [{ x: mano[0], y: mano[1], r: 4 }],
      };
    },
  },
  // Remo: la mano va de los brazos estirados (arriba) al abdomen (abajo).
  remoBarra: {
    arriba: { mx: 0, my: 31, tronco: 50 },
    abajo: { mx: -11, my: 15, tronco: 50 },
    figura: (p) => {
      const cadera = [44, 56];
      const t = torso(cadera, 90 - p.tronco, 90 - p.tronco);
      const mano = [t.hombro[0] + p.mx, t.hombro[1] + p.my];
      const codo = articulacion(t.hombro, mano, L.brazo, L.antebrazo, [-1, -0.6]);
      return {
        lineas: [piernaDePie(cadera, [58, PISO - 3]), t.hueso, [t.hombro, codo, mano]],
        cabeza: t.cabeza,
        discos: [{ x: mano[0], y: mano[1], r: 7 }],
      };
    },
  },
  remoPolea: {
    arriba: { mx: 30, my: 6, tronco: 80 },
    abajo: { mx: 9, my: 14, tronco: 94 },
    figura: (p) => {
      const asiento = PISO - 14;
      const cadera = [30, asiento - 3];
      const tobillo = [72, asiento - 4];
      const rodilla = articulacion(cadera, tobillo, L.muslo, L.tibia, [0, -1]);
      const t = torso(cadera, p.tronco, p.tronco);
      const mano = [t.hombro[0] + p.mx, t.hombro[1] + p.my];
      const codo = articulacion(t.hombro, mano, L.brazo, L.antebrazo, [-0.5, 1]);
      return {
        muebles: [[[14, asiento], [44, asiento]], [[29, asiento], [29, PISO]], [[78, asiento - 16], [78, PISO]], [mano, [104, PISO - 6]]],
        lineas: [[cadera, rodilla, tobillo, [tobillo[0] + 3, tobillo[1] - 7]], t.hueso, [t.hombro, codo, mano]],
        cabeza: t.cabeza,
      };
    },
  },
  remoMaquina: {
    arriba: { mx: 30, my: 2 },
    abajo: { mx: 6, my: 8 },
    figura: (p) => {
      const asiento = PISO - 22;
      const cadera = [30, asiento - 3];
      const rodilla = [52, asiento - 3];
      const tobillo = [52, PISO - 3];
      const t = torso(cadera, 82, 86);
      const mano = [t.hombro[0] + p.mx, t.hombro[1] + p.my];
      const codo = articulacion(t.hombro, mano, L.brazo, L.antebrazo, [-0.4, 1]);
      return {
        muebles: [[[16, asiento], [42, asiento]], [[28, asiento], [28, PISO]], [[t.hombro[0] + 7, t.hombro[1] - 6], [t.hombro[0] + 7, t.hombro[1] + 16], [t.hombro[0] + 7, PISO]]],
        lineas: [[cadera, rodilla, tobillo, [tobillo[0] + 8, PISO]], t.hueso, [t.hombro, codo, mano]],
        cabeza: t.cabeza,
      };
    },
  },
  encogimiento: {
    // Acostado boca arriba: la cadera y los pies quedan en el piso.
    arriba: { tronco: 38, cuello: 30 },
    abajo: { tronco: 4, cuello: 8 },
    figura: (p) => {
      const cadera = [50, PISO - 4];
      const tobillo = [24, PISO - 3];
      const rodilla = articulacion(cadera, tobillo, L.muslo, L.tibia, [0, -1]);
      const t = torso(cadera, p.tronco, p.tronco + p.cuello);
      return {
        lineas: [[cadera, rodilla, tobillo, [tobillo[0] - 8, PISO]], t.hueso, brazoRecto(t.hombro, 160 + p.tronco * 0.6)],
        cabeza: t.cabeza,
      };
    },
  },
  abdominalCompleto: {
    // Como el encogimiento, pero sube hasta quedar sentado; brazos cruzados.
    arriba: { tronco: 78, cuello: 15 },
    abajo: { tronco: 4, cuello: 6 },
    figura: (p) => {
      const cadera = [56, PISO - 4];
      const tobillo = [30, PISO - 3];
      const rodilla = articulacion(cadera, tobillo, L.muslo, L.tibia, [0, -1]);
      const t = torso(cadera, p.tronco, p.tronco + p.cuello);
      // Brazos cruzados sobre el pecho: del hombro hacia la mitad del tronco.
      const codo = polar(t.hombro, L.brazo * 0.8, p.tronco + 150);
      return {
        lineas: [[cadera, rodilla, tobillo, [tobillo[0] - 8, PISO]], t.hueso, [t.hombro, codo, polar(codo, 9, p.tronco + 10)]],
        cabeza: t.cabeza,
      };
    },
  },
  elevacionPiernas: {
    // Acostado con la cabeza a la derecha: las piernas estiradas suben hasta la vertical.
    arriba: { piernas: 92 },
    abajo: { piernas: 174 },
    figura: (p) => {
      const cadera = [50, PISO - 4];
      const rodilla = polar(cadera, L.muslo, p.piernas);
      const tobillo = polar(rodilla, L.tibia, p.piernas);
      const t = torso(cadera, 0, 0);
      return {
        lineas: [[cadera, rodilla, tobillo, polar(tobillo, 7, p.piernas - 90)], t.hueso, brazoRecto(t.hombro, 182)],
        cabeza: t.cabeza,
      };
    },
  },
  crunchInverso: {
    // Rodillas dobladas a 90°: de los muslos verticales a las rodillas al pecho.
    arriba: { muslo: 88, cy: PISO - 4, tronco: 0 },
    abajo: { muslo: 38, cy: PISO - 9, tronco: -9 },
    figura: (p) => {
      const cadera = [46, p.cy];
      const rodilla = polar(cadera, L.muslo, p.muslo);
      const tobillo = polar(rodilla, L.tibia, p.muslo + 90);
      const t = torso(cadera, p.tronco, 0);
      return {
        lineas: [[cadera, rodilla, tobillo, polar(tobillo, 7, p.muslo + 180)], t.hueso, brazoRecto(t.hombro, 180)],
        cabeza: t.cabeza,
      };
    },
  },
  plancha: {
    // Quieta, apoyada en los antebrazos; sólo respira (la cabeza apenas se mueve).
    arriba: { cuerpo: 10.1, cuello: 9 },
    abajo: { cuerpo: 10.3, cuello: 6 },
    figura: (p) => {
      const tobillo = [14, PISO - 4];
      const rodilla = polar(tobillo, L.tibia, p.cuerpo);
      const cadera = polar(rodilla, L.muslo, p.cuerpo);
      const t = torso(cadera, p.cuerpo, p.cuello);
      const codo = [t.hombro[0], PISO - 1];
      return {
        lineas: [[[tobillo[0] - 4, PISO], tobillo, rodilla, cadera], t.hueso, [t.hombro, codo, [codo[0] + L.antebrazo, PISO - 1]]],
        cabeza: t.cabeza,
      };
    },
  },
};

// La animación arranca en la primera postura: de pie (o arriba) en casi
// todos; el encogimiento, el abdominal completo y la elevación de piernas
// empiezan acostados.
const ORDEN = { dominadas: ["abajo", "arriba"], encogimiento: ["abajo", "arriba"], abdominalCompleto: ["abajo", "arriba"], elevacionPiernas: ["abajo", "arriba"] };

function interpolar(a, b, f) {
  const r = {};
  for (const k of Object.keys(a)) r[k] = a[k] + (b[k] - a[k]) * f;
  return r;
}

const SVG = "http://www.w3.org/2000/svg";

/**
 * Empieza la animación de `idEjercicio` en `svg`. Devuelve una función para
 * pararla. Con "reducir movimiento" deja el muñequito quieto en la postura de abajo.
 */
export function animar(svg, idEjercicio) {
  const def = FIGURAS[idEjercicio] ?? FIGURAS.sentadilla;
  const [desde, hasta] = (ORDEN[idEjercicio] ?? ["arriba", "abajo"]).map((k) => def[k]);
  svg.setAttribute("viewBox", def.caja ?? "0 0 120 100");
  svg.innerHTML = `${def.sinPiso ? "" : `<path class="piso" d="M4 ${PISO + 1}h112"/>`}<g class="figura"></g>`;
  const grupo = svg.querySelector(".figura");

  const dibujar = (f) => {
    const { lineas, cabeza, discos = [], muebles = [] } = def.figura(interpolar(desde, hasta, f));
    const linea = (puntos, clase) => {
      const e = document.createElementNS(SVG, "polyline");
      e.setAttribute("points", puntos.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" "));
      if (clase) e.setAttribute("class", clase);
      return e;
    };
    grupo.replaceChildren(
      ...muebles.map((puntos) => linea(puntos, "mueble")),
      ...lineas.map((puntos) => linea(puntos)),
      ...[{ x: cabeza[0], y: cabeza[1], r: L.cabeza, clase: "cabeza" }, ...discos.map((d) => ({ ...d, clase: "disco" }))].map((c) => {
        const e = document.createElementNS(SVG, "circle");
        e.setAttribute("cx", c.x.toFixed(1));
        e.setAttribute("cy", c.y.toFixed(1));
        e.setAttribute("r", c.r);
        e.setAttribute("class", c.clase);
        return e;
      }),
    );
  };

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    dibujar(1);
    return () => {};
  }
  let pedido = 0;
  const inicio = performance.now();
  const cuadro = (ahora) => {
    // Va y viene con suavidad: 0 → 1 → 0 en cada período.
    const f = (1 - Math.cos((2 * Math.PI * (ahora - inicio)) / 1000 / PERIODO)) / 2;
    dibujar(f);
    pedido = requestAnimationFrame(cuadro);
  };
  pedido = requestAnimationFrame(cuadro);
  return () => cancelAnimationFrame(pedido);
}
