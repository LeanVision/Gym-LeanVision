// Lo que todos los ejercicios tienen que tener bien armado.

import { test } from "node:test";
import assert from "node:assert/strict";

import { EJERCICIOS } from "../js/ejercicios.js";
import { SEGMENTOS } from "../js/dibujo.js";

test("cada error dice qué partes del cuerpo marcar en el video", () => {
  for (const [id, e] of Object.entries(EJERCICIOS)) {
    for (const [tipo, p] of Object.entries(e.problemas)) {
      assert.ok(Array.isArray(p.partes) && p.partes.length, `${id}.${tipo} no tiene partes`);
      for (const parte of p.partes) assert.ok(SEGMENTOS[parte], `${id}.${tipo}: parte desconocida "${parte}"`);
      assert.ok(p.momento == null || p.momento === "fin", `${id}.${tipo}: momento "${p.momento}"`);
      assert.ok(p.titulo && p.consejo && p.peso > 0, `${id}.${tipo} incompleto`);
    }
  }
});
