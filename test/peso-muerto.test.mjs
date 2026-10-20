import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { analizarPesoMuerto } from "../js/peso-muerto.js";
import { secuencia } from "./esqueletos.mjs";

const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));

const DE_PIE = { tibia: 2, rodilla: 5, tronco: 3, barra: 0 };
// Abajo: tibias algo inclinadas, rodillas a 70°, tronco a 50°, barra sobre la mitad del pie.
const ABAJO = { tibia: 20, rodilla: 70, tronco: 50, barra: 0 };
// Mitad de la subida bien hecha: cadera y hombros suben juntos (el tronco se endereza).
const MITAD = { tibia: 12, rodilla: 40, tronco: 35, barra: 0 };

/** Una repetición: baja, sube pasando por `mitad` y se queda en `arriba` (desde ahí arranca la siguiente). */
function repeticion({ abajo = ABAJO, mitad = MITAD, arriba = DE_PIE } = {}) {
  return [[abajo, 1.5], [abajo, 0.5], [mitad, 0.6], [arriba, 0.6], [arriba, 1]];
}
const serie = (...reps) => cuadrosDe(secuencia([[DE_PIE, 1], ...reps.flat()]));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

test("cuenta las repeticiones y una bien hecha no tiene errores", () => {
  const r = analizarPesoMuerto(serie(repeticion(), repeticion(), repeticion()));
  assert.deepEqual(tipos(r), [[], [], []]);
  assert.equal(r.puntaje, 100);
});

test("la cadera que sube antes que el pecho", () => {
  // Las rodillas se estiran pero el tronco se acuesta: la espalda levanta la barra.
  const r = analizarPesoMuerto(serie(repeticion({ mitad: { tibia: 5, rodilla: 25, tronco: 70, barra: 0 } })));
  assert.deepEqual(tipos(r), [["caderaPrimero"]]);
});

test("la barra lejos del cuerpo", () => {
  const lejos = (postura) => ({ ...postura, barra: 0.45 });
  const r = analizarPesoMuerto(serie(repeticion({ abajo: lejos(ABAJO), mitad: lejos(MITAD) })));
  assert.deepEqual(tipos(r), [["barraLejos"]]);
});

test("cadera muy baja o piernas rectas al arrancar", () => {
  const sentadilla = { tibia: 30, rodilla: 120, tronco: 30, barra: 0 };
  const rigidas = { tibia: 0, rodilla: 8, tronco: 75, barra: 0 };
  const r = analizarPesoMuerto(serie(
    repeticion({ abajo: sentadilla, mitad: { tibia: 15, rodilla: 60, tronco: 25, barra: 0 } }),
    repeticion({ abajo: rigidas, mitad: { tibia: 0, rodilla: 5, tronco: 40, barra: 0 } }),
  ));
  assert.deepEqual(tipos(r), [["caderaBaja"], ["piernasRectas"]]);
});

test("arriba: no terminar derecho o tirarse hacia atrás", () => {
  const r = analizarPesoMuerto(serie(
    repeticion({ arriba: { tibia: 2, rodilla: 5, tronco: 22, barra: 0 } }),
    repeticion({ arriba: { tibia: 2, rodilla: 5, tronco: -25, barra: 0 } }),
  ));
  assert.deepEqual(tipos(r), [["sinBloqueo"], ["haciaAtras"]]);
});

test("si no se ven las manos, no revisa la barra y avisa", () => {
  const cuadros = serie(repeticion());
  for (const c of cuadros) if (c.a) c.a.barra = null;
  const r = analizarPesoMuerto(cuadros);
  assert.deepEqual(tipos(r), [[]]);
  assert.match(r.avisos.join(" "), /manos/);
});
