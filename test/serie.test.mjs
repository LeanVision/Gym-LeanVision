import { test } from "node:test";
import assert from "node:assert/strict";

import { resumirSerie, ritmo } from "../js/serie.js";

/** Repeticiones de `ida` + `vuelta` segundos, una detrás de otra, con esos puntajes. */
function reps(puntajes, ida = 1.2, vuelta = 1, rapidasDesde = Infinity) {
  let t = 0;
  return puntajes.map((puntaje, i) => {
    const f = i >= rapidasDesde ? 0.5 : 1;
    const r = { tInicio: t, tFondo: t + ida * f, tFin: t + (ida + vuelta) * f, puntaje };
    t = r.tFin + 0.5;
    return r;
  });
}

test("ritmo de una repetición", () => {
  const r = ritmo({ tInicio: 1, tFondo: 2.5, tFin: 3.5 });
  assert.equal(r.ida, 1.5);
  assert.equal(r.vuelta, 1);
});

test("serie pareja: ritmo promedio y sin avisos", () => {
  const s = resumirSerie(reps([100, 100, 90, 100, 100, 90]));
  assert.ok(Math.abs(s.ida - 1.2) < 1e-9);
  assert.ok(Math.abs(s.vuelta - 1) < 1e-9);
  assert.deepEqual(s.avisos, []);
});

test("avisa si las últimas salen peor o más rápidas", () => {
  assert.match(resumirSerie(reps([100, 100, 100, 60, 60, 60])).avisos.join(" "), /cansancio/);
  assert.match(resumirSerie(reps([100, 100, 100, 100, 100, 100], 1.2, 1, 3)).avisos.join(" "), /más rápidas/);
});

test("con pocas repeticiones no compara", () => {
  assert.deepEqual(resumirSerie(reps([100, 40, 40])).avisos, []);
  assert.equal(resumirSerie([]).ida, null);
});
