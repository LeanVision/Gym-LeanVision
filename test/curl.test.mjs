import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarCurl } from "../js/curl.js";
import { revisarToma } from "../js/calidad.js";
import { curlBiceps, serieCurl } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const ABAJO = { codo: 5, tronco: 0, brazo: 0 };
const ARRIBA = { codo: 140, tronco: 0, brazo: 10 };

/** Un curl: sube en 1 s, baja en 1,2 s y queda abajo 0,5 s. */
const rep = (arriba = ARRIBA, abajo = ABAJO, bajada = 1.2) => [[arriba, 1], [abajo, bajada], [abajo, 0.5]];
const serie = (...reps) => cuadrosDe(serieCurl([[ABAJO, 1], ...reps.flat()]));

test("mide el codo, el brazo y el tronco mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    const a = angulos(curlBiceps({ codo: 120, tronco: 8, brazo: 30, miraDerecha }), "der");
    cerca(a.codo, 120);
    cerca(a.brazo, 30);
    cerca(a.tronco, 8);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(rep())).ok);
});

test("cuenta los curls y uno bien hecho no tiene errores", () => {
  const r = analizarCurl(serie(rep(), rep(), rep()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
  assert.deepEqual(r.avisos, []);
});

test("detecta cada error en su repetición", () => {
  const r = analizarCurl(serie(
    rep(),
    rep({ ...ARRIBA, tronco: -15 }),          // se tira hacia atrás
    rep({ ...ARRIBA, brazo: 45 }),            // lleva el codo adelante
    rep({ ...ARRIBA, codo: 95 }),             // no sube del todo
    rep(ARRIBA, { ...ABAJO, codo: 40 }),      // no estira abajo
    rep(ARRIBA, ABAJO, 0.4),                  // baja de golpe
  ));
  assert.deepEqual(tipos(r), [[], ["balanceo"], ["codoAdelante"], ["recorrido"], ["sinExtender"], ["bajada"]]);
});
