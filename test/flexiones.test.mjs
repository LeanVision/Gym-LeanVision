import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarFlexiones } from "../js/flexiones.js";
import { revisarToma } from "../js/calidad.js";
import { plancha, serieFlexiones } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const ARRIBA = { codo: 5 };
const ABAJO = { codo: 95 };

/** Una flexión: baja en 1 s, sube en 0,8 s, se queda arriba 0,5 s y se acomoda (vuelve a la plancha neutra, sin mover los codos). */
const flexion = (abajo = ABAJO, arriba = ARRIBA) =>
  [[abajo, 1], [arriba, 0.8], [arriba, 0.5], [{ ...ARRIBA, codo: arriba.codo }, 0.8]];
const serie = (...reps) => cuadrosDe(serieFlexiones([[ARRIBA, 1], ...reps.flat()]));

test("mide el codo, la cadera y la cabeza, mire hacia donde mire", () => {
  for (const miraDerecha of [true, false]) {
    const a = angulos(plancha({ codo: 90, cadera: 20, cabeza: 25, miraDerecha }), "der");
    cerca(a.codo, 90);
    cerca(a.lineaCadera, 20);
    cerca(a.cabeza, 25, 3);
    cerca(angulos(plancha({ cadera: -25, miraDerecha }), "der").lineaCadera, -25);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(flexion())).ok);
});

test("cuenta las flexiones y una bien hecha no tiene errores", () => {
  const r = analizarFlexiones(serie(flexion(), flexion(), flexion()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
});

test("detecta cada error en su repetición", () => {
  const r = analizarFlexiones(serie(
    flexion(),
    flexion({ codo: 95, cadera: 25 }, { codo: 5, cadera: 25 }),    // cadera caída
    flexion({ codo: 95, cadera: -30 }, { codo: 5, cadera: -30 }),  // cadera arriba
    flexion({ codo: 55 }),                                          // poca profundidad
    flexion(ABAJO, { codo: 35 }),                                   // no estira arriba
    flexion({ codo: 95, cabeza: 45 }, { codo: 5, cabeza: 45 }),    // cabeza colgando
  ));
  assert.deepEqual(tipos(r), [[], ["caderaCaida"], ["caderaArriba"], ["profundidad"], ["sinExtender"], ["cabeza"]]);
});

test("un instante con la cadera caída no alcanza", () => {
  const cuadros = serie(flexion());
  const medio = Math.floor(cuadros.length / 2);
  cuadros[medio].a.lineaCadera = 40;
  assert.deepEqual(tipos(analizarFlexiones(cuadros)), [[]]);
});
