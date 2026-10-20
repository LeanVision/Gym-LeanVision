import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarAbdominales } from "../js/abdominales.js";
import { revisarToma } from "../js/calidad.js";
import { encogimiento, serieAbdominales } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const ACOSTADO = { elevacion: 2, cuello: 5, pies: 0 };
const ARRIBA = { elevacion: 35, cuello: 20, pies: 0 };

/** Un abdominal: sube en 1 s, baja en 1 s y se queda acostado 0,5 s. */
const rep = (arriba = ARRIBA, subida = 1, bajada = 1) => [[arriba, subida], [ACOSTADO, bajada], [ACOSTADO, 0.5]];
const serie = (...reps) => cuadrosDe(serieAbdominales([[ACOSTADO, 1], ...reps.flat()]));

test("mide el tronco, el cuello y los pies mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    const a = angulos(encogimiento({ elevacion: 30, cuello: 40, pies: 0.5, miraDerecha }), "der");
    cerca(a.elevacionTronco, 30);
    cerca(-a.cabeza, 40);
    cerca(a.tobilloSobreCadera, 0.5 * 200 / a.largoTibiaPx, 0.01);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(rep())).ok);
});

test("cuenta los abdominales y uno bien hecho no tiene errores", () => {
  const r = analizarAbdominales(serie(rep(), rep(), rep()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
  assert.deepEqual(r.avisos, []);
});

test("detecta cada error en su repetición", () => {
  const r = analizarAbdominales(serie(
    rep(),
    rep({ ...ARRIBA, cuello: 55 }),   // tira del cuello
    rep({ ...ARRIBA, pies: 0.6 }),    // despega los pies
    rep(ARRIBA, 0.35, 0.35),          // con impulso
  ));
  assert.deepEqual(tipos(r), [[], ["cuello"], ["pies"], ["impulso"]]);
});

test("si está parado, avisa", () => {
  const cuadros = serie(rep());
  for (const c of cuadros) if (c.a) c.a.elevacionTronco += 80;
  assert.match(analizarAbdominales(cuadros).avisos.join(" "), /acostado/);
});
