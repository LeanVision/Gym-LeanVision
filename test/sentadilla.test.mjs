import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { revisarToma } from "../js/calidad.js";
import { analizarSentadilla } from "../js/sentadilla.js";
import { perfil, sentadillas } from "./esqueletos.mjs";

const cerca = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));

// Sentadilla bien hecha: muslo paralelo (rodilla 90° con tibia vertical
// daría paralelo; con tibia 25° hace falta más flexión), tronco moderado.
const BUENA = { rodilla: 115, tibia: 25, tronco: 35 };

test("recupera los ángulos, mire hacia donde mire", () => {
  for (const miraDerecha of [true, false]) {
    const a = angulos(perfil({ rodilla: 90, tibia: 0, tronco: 40, miraDerecha }), "der");
    cerca(a.rodilla, 90);
    cerca(a.tronco, 40);
    cerca(a.tibia, 0);
    cerca(a.muslo, 0); // rodilla a 90° con la tibia vertical: muslo paralelo al piso
  }
});

test("el muslo por encima del paralelo da positivo", () => {
  assert.ok(angulos(perfil({ rodilla: 60, tibia: 10 }), "der").muslo > 30);
  assert.ok(angulos(perfil({ rodilla: 130, tibia: 20 }), "der").muslo < 0);
});

test("cuenta las repeticiones y una bien hecha no tiene errores", () => {
  const r = analizarSentadilla(cuadrosDe(sentadillas([{ fondo: BUENA }, { fondo: BUENA }, { fondo: BUENA }])));
  assert.equal(r.repeticiones.length, 3);
  for (const rep of r.repeticiones) assert.deepEqual(rep.problemas, []);
  assert.equal(r.puntaje, 100);
});

test("detecta cada error en su repetición", () => {
  const r = analizarSentadilla(cuadrosDe(sentadillas([
    { fondo: BUENA },
    { fondo: { rodilla: 60, tibia: 10, tronco: 20 } },        // corta
    { fondo: { ...BUENA, tronco: 65 } },                       // tronco muy inclinado
    { fondo: { ...BUENA, talon: 0.15 } },                      // talones arriba
    { fondo: BUENA, bajada: 0.4 },                             // bajada muy rápida
  ])));
  const tipos = r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));
  assert.deepEqual(tipos, [[], ["profundidad"], ["tronco"], ["talones"], ["rapida"]]);
  assert.equal(r.repeticiones[1].puntaje, 75);
});

test("los amagues cortos no cuentan como repetición", () => {
  const r = analizarSentadilla(cuadrosDe(sentadillas([{ fondo: { rodilla: 25 } }, { fondo: BUENA }])));
  assert.equal(r.repeticiones.length, 1);
});

test("tolera cuadros donde no se vio el cuerpo", () => {
  const cuadros = cuadrosDe(sentadillas([{ fondo: BUENA }, { fondo: BUENA }]));
  for (let i = 0; i < cuadros.length; i += 9) cuadros[i].a = null;
  assert.equal(analizarSentadilla(cuadros).repeticiones.length, 2);
});

test("avisa si la persona no está de costado o no se ve entera", () => {
  const deCostado = cuadrosDe(sentadillas([{ fondo: BUENA }]));
  assert.ok(revisarToma(deCostado).ok);

  const deFrente = sentadillas([{ fondo: BUENA }], { extra: { separacionHombros: 0.8 } })
    .map(({ t, p }) => ({ t, a: angulos(p, "der") }));
  const toma = revisarToma(deFrente);
  assert.equal(toma.ok, false);
  assert.match(toma.avisos.join(" "), /costado/);

  const cortado = deCostado.map((c, i) => ({ ...c, a: i % 2 ? null : c.a }));
  assert.match(revisarToma(cortado).avisos.join(" "), /cuerpo entero/);
});

test("el talón tapado por la cola no cuenta como talón levantado", () => {
  // Caso real: sentadilla profunda con el pie apoyado; el modelo ubicaba el
  // talón sobre la pierna, ~25 % de la tibia más arriba.
  const r = analizarSentadilla(cuadrosDe(sentadillas([{ fondo: { ...BUENA, talonTapado: 0.25 } }])));
  assert.deepEqual(r.repeticiones[0].problemas, []);
});

test("un cuadro suelto con el pie mal ubicado no alcanza para marcar los talones", () => {
  const cuadros = cuadrosDe(sentadillas([{ fondo: BUENA }]));
  const { tFondo } = analizarSentadilla(cuadros).repeticiones[0];
  const fondo = cuadros.findIndex((c) => c.t >= tFondo);
  cuadros[fondo].a.alturaTobillo += 0.3;
  assert.deepEqual(analizarSentadilla(cuadros).repeticiones[0].problemas, []);
});

test("con poca resolución no revisa los talones y avisa", () => {
  // Tibia de 40 px (como un video de 202x360): el temblor del modelo es del
  // tamaño de un despegue real.
  const r = analizarSentadilla(cuadrosDe(sentadillas([{ fondo: { ...BUENA, talon: 0.15 } }], { escala: 0.2 })));
  assert.equal(r.repeticiones.length, 1);
  assert.deepEqual(r.repeticiones[0].problemas, []);
  assert.match(r.avisos.join(" "), /talones/);
});
