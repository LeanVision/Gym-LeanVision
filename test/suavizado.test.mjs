import { test } from "node:test";
import assert from "node:assert/strict";

import { suavizarPoses, rellenarHuecos } from "../js/suavizado.js";

/** Poses de un punto que sube en línea recta (y = t), con o sin temblor y huecos. */
function poses({ fps = 15, segundos = 2, temblor = 0, huecos = [] } = {}) {
  let semilla = 1;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647) - 0.5;
  return Array.from({ length: fps * segundos }, (_, i) => {
    const t = i / fps;
    if (huecos.some(([a, b]) => t >= a && t <= b)) return { t, landmarks: null, mundo: null };
    const p = { x: 0.5 + temblor * azar(), y: t / 4 + temblor * azar(), z: 0, visibility: 0.9 };
    return { t, landmarks: [p], mundo: [{ ...p }] };
  });
}

const desvio = (v) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};

test("baja el temblor sin correr el punto", () => {
  const crudas = poses({ temblor: 0.02 });
  const suaves = suavizarPoses(crudas);
  const errorX = (ps) => desvio(ps.map((p) => p.landmarks[0].x));
  assert.ok(errorX(suaves) < errorX(crudas) * 0.7, `${errorX(suaves)} contra ${errorX(crudas)}`);
  // El movimiento de verdad (y sube con t) se mantiene.
  const medio = suaves[15].landmarks[0].y;
  assert.ok(Math.abs(medio - 15 / 15 / 4) < 0.02, `y = ${medio}`);
});

test("un movimiento sin temblor queda igual", () => {
  const limpias = poses();
  const suaves = suavizarPoses(limpias);
  for (let i = 1; i < suaves.length - 1; i++) {
    assert.ok(Math.abs(suaves[i].landmarks[0].y - limpias[i].landmarks[0].y) < 1e-9);
  }
});

test("rellena huecos cortos y deja los largos", () => {
  const conHuecos = poses({ huecos: [[0.4, 0.55], [1.0, 1.6]] });
  const r = rellenarHuecos(conHuecos);
  const corto = r.find((p) => p.t >= 0.4 && p.t <= 0.55);
  assert.ok(corto.landmarks && corto.relleno, "el hueco corto se rellena");
  assert.ok(Math.abs(corto.landmarks[0].y - corto.t / 4) < 1e-9, "interpolando entre los vecinos");
  assert.ok(r.filter((p) => p.t >= 1.0 && p.t <= 1.6).every((p) => !p.landmarks), "el hueco largo queda vacío");
});
