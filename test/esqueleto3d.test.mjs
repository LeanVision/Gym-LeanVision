import { test } from "node:test";
import assert from "node:assert/strict";

import { proyectar, giroDeFrente } from "../js/esqueleto3d.js";

const cerca = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);

test("girar 90° alrededor del eje vertical pasa la profundidad al costado", () => {
  const q = proyectar({ x: 0, y: 0.5, z: 1 }, 90, 0);
  cerca(q.x, -1);
  cerca(q.y, 0.5);
  cerca(q.z, 0);
});

test("sin giro el punto queda igual", () => {
  const q = proyectar({ x: 0.3, y: -0.2, z: 0.1 }, 0, 0);
  cerca(q.x, 0.3); cerca(q.y, -0.2); cerca(q.z, 0.1);
});

/** Poses con la nariz hacia `frente` ({x, z}) respecto de la cadera. */
const posesMirando = (frente) => {
  const mundo = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
  mundo[0] = { x: frente.x * 0.1, y: -0.6, z: frente.z * 0.1 };
  return [{ mundo }, { mundo: null }];
};

test("de frente, la nariz queda hacia la cámara (z negativo) y centrada", () => {
  for (const frente of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0.6, z: -0.8 }]) {
    const poses = posesMirando(frente);
    const q = proyectar(poses[0].mundo[0], giroDeFrente(poses), 0);
    cerca(q.x, 0, 1e-9);
    assert.ok(q.z < 0, `la nariz tiene que quedar adelante (z=${q.z})`);
  }
});
