import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { conBarra, polea, maquina, detectarVariante } from "../js/remo.js";
import { revisarToma } from "../js/calidad.js";
import { remando, serieRemo, sentadillas } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

/** Una repetición: tira en 1 s, vuelve en 1,2 s y queda 0,5 s con los brazos estirados. */
const rep = (tirado, estirado, vuelta = 1.2) => [[tirado, 1], [estirado, vuelta], [estirado, 0.5]];
const serie = (estirado, ...reps) => cuadrosDe(serieRemo([[estirado, 1], ...reps.flat()]));

const BARRA = { forma: "parado", tronco: 50, codo: 5 };
const POLEA = { forma: "polea", tronco: 5, codo: 5 };
const MAQUINA = { forma: "maquina", tronco: 10, codo: 5 };
const tira = (postura, cambios = {}) => ({ ...postura, codo: 100, ...cambios });

test("mide el codo y el torso en las tres formas, mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    for (const forma of ["parado", "polea", "maquina"]) {
      const a = angulos(remando({ forma, tronco: 20, codo: 90, miraDerecha }), "der");
      cerca(a.codo, 90);
      cerca(a.troncoHaciaPies, 20);
    }
    cerca(angulos(remando({ ...BARRA, miraDerecha }), "der").tronco, 50);
    cerca(angulos(remando({ forma: "polea", tronco: -20, miraDerecha }), "der").troncoHaciaPies, -20);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(BARRA, rep(tira(BARRA), BARRA))).ok);
});

test("con barra: bien hecho y cada error", () => {
  const r = conBarra.analizar(serie(BARRA,
    rep(tira(BARRA), BARRA),
    rep(tira(BARRA, { tronco: 30 }), BARRA),                     // se endereza al tirar
    rep(tira(BARRA, { codo: 60 }), BARRA),                       // poco recorrido
    rep(tira(BARRA), { ...BARRA, codo: 35 }),                    // no estira los brazos
  ));
  assert.deepEqual(tipos(r), [[], ["impulso"], ["recorrido"], ["sinExtender"]]);
  const erguido = { ...BARRA, tronco: 15 };
  assert.deepEqual(tipos(conBarra.analizar(serie(erguido, rep(tira(erguido), erguido)))), [["erguido"]]);
});

test("en polea: bien hecho y cada error", () => {
  const r = polea.analizar(serie(POLEA,
    rep(tira(POLEA), POLEA),
    rep(tira(POLEA, { tronco: -22 }), POLEA),                   // se tira hacia atrás
    rep(tira(POLEA), { ...POLEA, tronco: 35 }),                 // se balancea hacia adelante
    rep(tira(POLEA, { codo: 60 }), POLEA),                      // poco recorrido
  ));
  assert.deepEqual(tipos(r), [[], ["atras"], ["impulso"], ["recorrido"]]);
});

test("en máquina: bien hecho y cada error", () => {
  const r = maquina.analizar(serie(MAQUINA,
    rep(tira(MAQUINA), MAQUINA),
    rep(tira(MAQUINA, { tronco: -8 }), MAQUINA),                // despega el pecho
    rep(tira(MAQUINA), MAQUINA, 0.3),                           // suelta el peso
    rep(tira(MAQUINA), { ...MAQUINA, codo: 35 }),               // no estira los brazos
  ));
  assert.deepEqual(tipos(r), [[], ["pecho"], ["vuelta"], ["sinExtender"]]);
});

test("detecta la forma por la postura", () => {
  assert.equal(detectarVariante(serie(BARRA, rep(tira(BARRA), BARRA))), "remoBarra");
  assert.equal(detectarVariante(serie(POLEA, rep(tira(POLEA), POLEA))), "remoPolea");
  assert.equal(detectarVariante(serie(MAQUINA, rep(tira(MAQUINA), MAQUINA))), "remoMaquina");
  // Una sentadilla de pie se ve como remo con barra (parado): la detección
  // sólo elige entre formas de remo.
  assert.equal(detectarVariante(cuadrosDe(sentadillas([{ fondo: { rodilla: 30, tibia: 10, tronco: 20 } }]))), "remoBarra");
});
