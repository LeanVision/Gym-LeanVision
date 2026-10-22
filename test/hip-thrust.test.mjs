import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarHipThrust } from "../js/hip-thrust.js";
import { revisarToma } from "../js/calidad.js";
import { hipThrust, serieHipThrust } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const ABAJO = { cadera: 60, tibia: -15 };
const ARRIBA = { cadera: 0, tibia: 0 };

/** Una repetición: sube en 1 s, baja en 1,2 s y queda abajo 0,5 s. */
const rep = (arriba = ARRIBA, bajada = 1.2) => [[arriba, 1], [ABAJO, bajada], [ABAJO, 0.5]];
const serie = (...reps) => cuadrosDe(serieHipThrust([[ABAJO, 1], ...reps.flat()]));

test("mide la cadera y las tibias mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    cerca(angulos(hipThrust({ cadera: 40, tibia: 10, miraDerecha }), "der").caderaHombroRodilla, 40);
    cerca(angulos(hipThrust({ cadera: -20, miraDerecha }), "der").caderaHombroRodilla, -20);
    cerca(angulos(hipThrust({ tibia: 25, miraDerecha }), "der").tibia, 25);
    cerca(angulos(hipThrust({ tibia: -25, miraDerecha }), "der").tibia, -25);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(rep())).ok);
});

test("cuenta las repeticiones y una bien hecha no tiene errores", () => {
  const r = analizarHipThrust(serie(rep(), rep(), rep()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
  assert.deepEqual(r.avisos, []);
});

test("detecta cada error en su repetición", () => {
  const r = analizarHipThrust(serie(
    rep(),
    rep({ ...ARRIBA, cadera: 28 }),          // no extiende la cadera
    rep({ ...ARRIBA, cadera: -28 }),         // sube la cadera de más
    rep({ ...ARRIBA, tibia: 30 }),           // pies muy cerca
    rep({ ...ARRIBA, tibia: -30 }),          // pies muy lejos
    rep(ARRIBA, 0.4),                        // baja de golpe
  ));
  assert.deepEqual(tipos(r), [[], ["recorrido"], ["arqueo"], ["piesCerca"], ["piesLejos"], ["bajada"]]);
});
