import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// localStorage de mentira (en node no existe).
const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
};
const { guardar, sesiones, comparar, borrar, MAXIMO } = await import("../js/historial.js");

beforeEach(() => memoria.clear());

test("guarda y lee las sesiones, la más nueva primero", () => {
  guardar({ ejercicio: "sentadilla", puntaje: 70 });
  guardar({ ejercicio: "sentadilla", puntaje: 90 });
  assert.deepEqual(sesiones().map((s) => s.puntaje), [90, 70]);
  assert.ok(sesiones()[0].fecha);
});

test("compara con la sesión anterior y la mejor", () => {
  guardar({ ejercicio: "sentadilla", puntaje: 100 });
  guardar({ ejercicio: "flexiones", puntaje: 50 });
  guardar({ ejercicio: "sentadilla", puntaje: 80 });
  const id = guardar({ ejercicio: "sentadilla", puntaje: 90 });
  const c = comparar("sentadilla", id);
  assert.equal(c.anterior.puntaje, 80);
  assert.equal(c.mejor, 100);
  assert.equal(c.cantidad, 2);
  assert.equal(comparar("remoBarra"), null);
});

test("reanalizar el mismo video reemplaza la sesión", () => {
  const id = guardar({ ejercicio: "encogimiento", puntaje: 60 });
  guardar({ ejercicio: "abdominalCompleto", puntaje: 80 }, id);
  assert.equal(sesiones().length, 1);
  assert.equal(sesiones()[0].ejercicio, "abdominalCompleto");
});

test("guarda como mucho MAXIMO sesiones y se puede borrar", () => {
  for (let i = 0; i < MAXIMO + 5; i++) guardar({ ejercicio: "sentadilla", puntaje: i });
  assert.equal(sesiones().length, MAXIMO);
  assert.equal(sesiones()[0].puntaje, MAXIMO + 4);
  borrar();
  assert.equal(sesiones().length, 0);
});

test("sin almacenamiento, no falla", () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error("no"); }, setItem() { throw new Error("no"); }, removeItem() { throw new Error("no"); } };
  try {
    guardar({ ejercicio: "sentadilla", puntaje: 1 });
    assert.deepEqual(sesiones(), []);
  } finally {
    globalThis.localStorage = original;
  }
});
