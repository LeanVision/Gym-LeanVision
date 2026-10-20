import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarEstocadas } from "../js/estocadas.js";
import { revisarToma } from "../js/calidad.js";
import { estocada, serieEstocadas } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

const DE_PIE = { delantera: 5, tibia: 2, muslo: 0, trasera: 5, tronco: 3 };
const ABAJO = { delantera: 95, tibia: 10, muslo: 10, trasera: 90, tronco: 10 };

/** Una estocada: baja en 1,2 s, sube en 1 s y se queda de pie 0,6 s. */
const rep = (abajo = ABAJO) => [[abajo, 1.2], [DE_PIE, 1], [DE_PIE, 0.6]];
const serie = (...reps) => cuadrosDe(serieEstocadas([[DE_PIE, 1], ...reps.flat()]));

test("mide las dos piernas, con cualquiera adelante y mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    for (const adelanteIzq of [false, true]) {
      const a = angulos(estocada({ ...ABAJO, miraDerecha, adelanteIzq }), "der");
      cerca(a.rodillaDelantera, 95);
      cerca(a.rodillaTrasera, 90);
      cerca(a.tibiaDelantera, 10);
      cerca(a.tronco, 10);
    }
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(rep())).ok);
});

test("cuenta las estocadas y una bien hecha no tiene errores", () => {
  const r = analizarEstocadas(serie(rep(), rep(), rep()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
});

test("detecta cada error en su repetición", () => {
  const r = analizarEstocadas(serie(
    rep(),
    rep({ delantera: 55, tibia: 5, muslo: 25, trasera: 40, tronco: 8 }),   // poca profundidad
    rep({ ...ABAJO, tibia: 40, delantera: 100 }),                          // rodilla muy adelante
    rep({ ...ABAJO, tronco: 40 }),                                         // torso inclinado
  ));
  assert.deepEqual(tipos(r), [[], ["profundidad"], ["rodillaAdelante"], ["tronco"]]);
});

test("si no se ven las dos piernas, avisa", () => {
  const cuadros = serie(rep());
  for (const c of cuadros) if (c.a) c.a.rodillaDelantera = null;
  const r = analizarEstocadas(cuadros);
  assert.equal(r.repeticiones.length, 0);
  assert.match(r.avisos.join(" "), /dos piernas/);
});
