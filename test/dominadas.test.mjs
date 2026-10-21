import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarDominadas } from "../js/dominadas.js";
import { revisarToma } from "../js/calidad.js";
import { colgado, serieDominadas } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const COLGADO = { codo: 5, tronco: 0, cadera: 0 };
const ARRIBA = { codo: 150, tronco: 0, cadera: 0 };

/** Una dominada: sube en 1 s, baja en 1,2 s y queda colgado 0,5 s. */
const rep = (arriba = ARRIBA, abajo = COLGADO, subida = 1, bajada = 1.2) => [[arriba, subida], [abajo, bajada], [abajo, 0.5]];
const serie = (...reps) => cuadrosDe(serieDominadas([[COLGADO, 1], ...reps.flat()]));

test("mide el codo, la barbilla y el cuerpo mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    const a = angulos(colgado({ codo: 150, tronco: 10, cadera: 30, miraDerecha }), "der");
    cerca(a.codo, 150);
    cerca(Math.abs(a.tronco), 10);
    cerca(a.cadera, 30);
    assert.ok(a.barbilla > 0.15, `barbilla ${a.barbilla}`);
    assert.ok(angulos(colgado({ codo: 100, miraDerecha }), "der").barbilla < 0.15);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(rep())).ok);
});

test("cuenta las dominadas y una bien hecha no tiene errores", () => {
  const r = analizarDominadas(serie(rep(), rep(), rep()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
  assert.deepEqual(r.avisos, []);
});

test("detecta cada error en su repetición", () => {
  const r = analizarDominadas(serie(
    rep(),
    rep({ ...ARRIBA, codo: 100 }),                       // no pasa la barbilla
    rep(ARRIBA, { ...COLGADO, codo: 50 }),              // no estira los brazos abajo
    rep({ ...ARRIBA, cadera: 70 }),                      // patea (sube las rodillas)
    rep(ARRIBA, COLGADO, 1, 0.4),                        // se deja caer
  ));
  assert.deepEqual(tipos(r), [[], ["recorrido"], ["sinExtender"], ["balanceo"], ["bajada"]]);
});

test("sin la cara, estima la barbilla con los codos y avisa", () => {
  const cuadros = serie(rep(), rep({ ...ARRIBA, codo: 100 }));
  for (const c of cuadros) if (c.a) c.a.barbilla = null;
  const r = analizarDominadas(cuadros);
  assert.deepEqual(tipos(r), [[], ["recorrido"]]);
  assert.match(r.avisos.join(" "), /cara/);
});
