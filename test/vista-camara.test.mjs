// La cámara no tiene que estar justo de costado: en diagonal (o casi de
// frente) los ángulos salen de la vista de costado armada con los puntos 3D.

import { test } from "node:test";
import assert from "node:assert/strict";

import { P, angulos, aPixeles, prepararCuadros } from "../js/geometria.js";
import { revisarToma } from "../js/calidad.js";
import { analizarSentadilla } from "../js/sentadilla.js";
import { perfil, sentadillas } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const rad = (g) => (g * Math.PI) / 180;

/**
 * Un esqueleto de perfil (en píxeles, de esqueletos.mjs) filmado con la
 * cámara girada `giro` grados alrededor de la persona (0 = de costado,
 * 90 = de frente): devuelve los puntos 3D (en metros) y los de la imagen.
 * Cada lado del cuerpo se separa 12 cm del centro.
 */
function filmado(p, giro) {
  const mundo = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const g = rad(giro);
  for (const [nombre, i] of Object.entries(P)) {
    const q = p[nombre];
    if (!q) continue;
    const lado = nombre.endsWith("_izq") ? 0.12 : nombre.endsWith("_der") ? -0.12 : 0;
    const adelante = (q.x - 500) / 1000, abajo = (q.y - 500) / 1000;
    const x = adelante * Math.cos(g) - lado * Math.sin(g);
    const z = adelante * Math.sin(g) + lado * Math.cos(g);
    mundo[i] = { x, y: abajo, z };
    landmarks[i] = { x: x + 0.5, y: abajo + 0.5, visibility: Math.max(q.v, 0.6) };
  }
  return { landmarks, mundo };
}

const POSTURA = { rodilla: 100, tibia: 30, tronco: 35 };

test("desde cualquier ángulo de cámara mide lo mismo que de costado", () => {
  for (const giro of [0, 30, 45, 60, 80]) {
    for (const miraDerecha of [true, false]) {
      const poses = [{ t: 0, ...filmado(perfil({ ...POSTURA, miraDerecha }), giro) }];
      const { cuadros, vista } = prepararCuadros(poses, 1000, 1000, { forzar: "3d" });
      cerca(vista.angulo, giro);
      cerca(cuadros[0].a.rodilla, 100);
      cerca(cuadros[0].a.tibia, 30);
      cerca(cuadros[0].a.tronco, 35);
    }
  }
});

test("en diagonal, mirar solo la imagen daría ángulos equivocados", () => {
  const { landmarks } = filmado(perfil(POSTURA), 60);
  const a = angulos(aPixeles(landmarks, 1000, 1000), "der");
  assert.ok(Math.abs(a.rodilla - 100) > 10, `la imagen sola dio ${a.rodilla}°`);
});

test("de costado usa la imagen; en diagonal, el 3D", () => {
  const vista = (giro) => prepararCuadros([{ t: 0, ...filmado(perfil(POSTURA), giro) }], 1000, 1000).vista;
  assert.equal(vista(0).desde3d, false);
  assert.equal(vista(15).desde3d, false);
  assert.equal(vista(45).desde3d, true);
});

test("una serie de sentadillas filmada en diagonal da el mismo resultado que de costado", () => {
  const reps = [
    { fondo: { rodilla: 120, tibia: 35, tronco: 40 } },
    { fondo: { rodilla: 60, tibia: 15, tronco: 20 } },     // poca profundidad
    { fondo: { rodilla: 120, tibia: 35, tronco: 60 } },    // tronco muy inclinado
  ];
  const serie = sentadillas(reps);
  const resultado = (giro) => {
    const poses = serie.map(({ t, p }) => ({ t, ...filmado(p, giro) }));
    const { cuadros, vista } = prepararCuadros(poses, 1000, 1000);
    return { analisis: analizarSentadilla(cuadros), toma: revisarToma(cuadros, vista) };
  };
  const tipos = (r) => r.analisis.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo).sort());
  const costado = resultado(0), diagonal = resultado(45), casiDeFrente = resultado(80);
  assert.deepEqual(tipos(diagonal), tipos(costado));
  assert.deepEqual(tipos(casiDeFrente), tipos(costado));
  assert.ok(diagonal.toma.ok, diagonal.toma.avisos.join(" "));
  assert.match(casiDeFrente.toma.avisos.join(" "), /casi de frente/);
});
