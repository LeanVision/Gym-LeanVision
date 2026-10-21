import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarPressMilitar } from "../js/press-militar.js";
import { revisarToma } from "../js/calidad.js";
import { pressMilitar, seriePressMilitar } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const HOMBROS = { codo: 110, arriba: 175, tronco: 0, rodilla: 3 };
const ARRIBA = { ...HOMBROS, codo: 5 };

/** Una repetición: sube en 1 s, baja en 1,2 s y queda en los hombros 0,5 s. */
const rep = (arriba = ARRIBA, abajo = HOMBROS) => [[arriba, 1], [abajo, 1.2], [abajo, 0.5]];
const serie = (...reps) => cuadrosDe(seriePressMilitar([[HOMBROS, 1], ...reps.flat()]));

test("mide el codo, las manos y el torso mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    const abajo = angulos(pressMilitar({ ...HOMBROS, miraDerecha }), "der");
    cerca(abajo.codo, 110);
    assert.ok(Math.abs(abajo.alturaManos) < 0.15, `manos abajo ${abajo.alturaManos}`);
    const arriba = angulos(pressMilitar({ ...ARRIBA, tronco: -15, miraDerecha }), "der");
    cerca(arriba.codo, 5);
    cerca(arriba.tronco, -15);
    assert.ok(arriba.alturaManos > 0.8, `manos arriba ${arriba.alturaManos}`);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(rep())).ok);
});

test("cuenta las repeticiones y una bien hecha no tiene errores", () => {
  const r = analizarPressMilitar(serie(rep(), rep(), rep()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
  assert.deepEqual(r.avisos, []);
});

test("detecta cada error en su repetición", () => {
  const r = analizarPressMilitar(serie(
    rep(),
    rep({ ...ARRIBA, tronco: -20 }),               // se tira hacia atrás
    rep({ ...ARRIBA, codo: 35, arriba: 190 }),     // no estira arriba
    rep(ARRIBA, { ...HOMBROS, codo: 75 }),         // no baja hasta los hombros
    rep({ ...ARRIBA, arriba: 135 }),               // barra adelante
    rep(ARRIBA, { ...HOMBROS, rodilla: 30 }),      // impulsa con las piernas (al final: las rodillas quedan dobladas)
  ));
  assert.deepEqual(tipos(r), [[], ["atras"], ["sinBloqueo"], ["recorrido"], ["barraAdelante"], ["piernas"]]);
});
