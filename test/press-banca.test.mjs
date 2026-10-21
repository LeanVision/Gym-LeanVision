import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarPressBanca } from "../js/press-banca.js";
import { revisarToma } from "../js/calidad.js";
import { banca, serieBanca } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const ARRIBA = { codo: 5, cola: 0 };
const ABAJO = { codo: 95, cola: 0 };

/** Una repetición: baja en 1,2 s, sube en 1 s y queda arriba 0,5 s. */
const rep = (abajo = ABAJO, arriba = ARRIBA, bajada = 1.2) => [[abajo, bajada], [arriba, 1], [arriba, 0.5]];
const serie = (...reps) => cuadrosDe(serieBanca([[ARRIBA, 1], ...reps.flat()]));

test("mide el codo y la cadera mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    const a = angulos(banca({ codo: 90, cola: 0.2, miraDerecha }), "der");
    cerca(a.codo, 90);
    cerca(a.alturaCadera, 0.2, 0.01);
    cerca(a.elevacionTronco, 0, 15);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(rep())).ok);
});

test("cuenta las repeticiones y una bien hecha no tiene errores", () => {
  const r = analizarPressBanca(serie(rep(), rep(), rep()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
  assert.deepEqual(r.avisos, []);
});

test("detecta cada error en su repetición", () => {
  const r = analizarPressBanca(serie(
    rep(),
    rep({ ...ABAJO, cola: 0.25 }),           // despega la cola
    rep({ ...ABAJO, codo: 60 }),             // no llega al pecho
    rep(ABAJO, { ...ARRIBA, codo: 35 }),     // no estira arriba
    rep(ABAJO, ARRIBA, 0.3),                 // baja de golpe
  ));
  assert.deepEqual(tipos(r), [[], ["cola"], ["profundidad"], ["sinBloqueo"], ["rapida"]]);
});

test("si está parado, avisa", () => {
  const cuadros = serie(rep());
  for (const c of cuadros) if (c.a) c.a.elevacionTronco = 85;
  assert.match(analizarPressBanca(cuadros).avisos.join(" "), /acostado/);
});
