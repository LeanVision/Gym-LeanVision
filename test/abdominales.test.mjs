import { test } from "node:test";
import assert from "node:assert/strict";

import { angulos } from "../js/geometria.js";
import { encogimiento, abdominalCompleto, elevacionPiernas, crunchInverso, plancha, detectarVariante } from "../js/abdominales.js";
import { revisarToma } from "../js/calidad.js";
import { encogimiento as acostado, serieAbdominales, serieFlexiones, sentadillas } from "./esqueletos.mjs";

const cerca = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const cuadrosDe = (serie) => serie.map(({ t, p }) => ({ t, a: angulos(p, "der") }));
const tipos = (r) => r.repeticiones.map((rep) => rep.problemas.map((p) => p.tipo));

/** Serie que arranca en `quieto` y hace cada repetición: [arriba, subida, bajada]. */
function serie(quieto, ...reps) {
  const claves = [[quieto, 1]];
  for (const [arriba, subida = 1, bajada = 1] of reps) claves.push([arriba, subida], [quieto, bajada], [quieto, 0.5]);
  return cuadrosDe(serieAbdominales(claves));
}

// Encogimiento
const ACOSTADO = { elevacion: 2, cuello: 5, pies: 0 };
const ARRIBA = { elevacion: 35, cuello: 20, pies: 0 };
// Abdominal completo
const SENTADO = { elevacion: 75, cuello: 10, pies: 0 };
// Elevación de piernas: piernas estiradas en el piso → verticales.
const PIERNAS_PISO = { elevacion: 0, cuello: 5, muslo: 5, rodilla: 5 };
const PIERNAS_ARRIBA = { ...PIERNAS_PISO, muslo: 85 };
// Crunch inverso: muslos verticales con las rodillas a 90° → rodillas al pecho.
const MESA = { elevacion: 0, cuello: 5, muslo: 90, rodilla: 90 };
const AL_PECHO = { ...MESA, muslo: 135 };

test("mide el tronco, el cuello, los pies y las piernas mirando a cada lado", () => {
  for (const miraDerecha of [true, false]) {
    const a = angulos(acostado({ elevacion: 30, cuello: 40, pies: 0.5, miraDerecha }), "der");
    cerca(a.elevacionTronco, 30);
    cerca(-a.cabeza, 40);
    cerca(a.tobilloSobreCadera, (0.5 * 200) / a.largoTibiaPx, 0.01);
    const b = angulos(acostado({ muslo: 60, rodilla: 0, miraDerecha }), "der");
    cerca(b.elevacionPiernas, 60);
    cerca(b.rodilla, 0);
    cerca(angulos(acostado({ ...MESA, miraDerecha }), "der").cadera, 90);
  }
});

test("de costado, la toma es buena", () => {
  assert.ok(revisarToma(serie(ACOSTADO, [ARRIBA])).ok);
});

test("encogimiento: bien hecho no tiene errores y detecta cada error", () => {
  const bien = encogimiento.analizar(serie(ACOSTADO, [ARRIBA], [ARRIBA], [ARRIBA]));
  assert.deepEqual(tipos(bien), [[], [], []]);
  assert.equal(bien.puntaje, 100);
  assert.deepEqual(bien.avisos, []);
  const r = encogimiento.analizar(serie(ACOSTADO,
    [ARRIBA],
    [{ ...ARRIBA, cuello: 55 }],   // tira del cuello
    [{ ...ARRIBA, pies: 0.6 }],    // despega los pies
    [ARRIBA, 0.35, 0.35],          // con impulso
  ));
  assert.deepEqual(tipos(r), [[], ["cuello"], ["pies"], ["impulso"]]);
});

test("abdominal completo: bien hecho y cada error", () => {
  const r = abdominalCompleto.analizar(serie(ACOSTADO,
    [SENTADO, 1.5, 1.5],
    [{ ...SENTADO, elevacion: 45 }, 1.5, 1.5],  // no llega arriba
    [{ ...SENTADO, pies: 0.6 }, 1.5, 1.5],      // despega los pies
    [SENTADO, 0.5, 0.5],                        // con impulso
  ));
  assert.deepEqual(tipos(r), [[], ["recorrido"], ["pies"], ["impulso"]]);
});

test("elevación de piernas: bien hecha y cada error", () => {
  const r = elevacionPiernas.analizar(serie(PIERNAS_PISO,
    [PIERNAS_ARRIBA, 1, 1.5],
    [{ ...PIERNAS_ARRIBA, rodilla: 50 }, 1, 1.5],  // rodillas dobladas
    [{ ...PIERNAS_ARRIBA, muslo: 55 }, 1, 1.5],    // poco recorrido
    [PIERNAS_ARRIBA, 1, 0.4],                      // baja de golpe
  ));
  assert.deepEqual(tipos(r), [[], ["rodillas"], ["recorrido"], ["bajada"]]);
});

test("crunch inverso: bien hecho y cada error", () => {
  const r = crunchInverso.analizar(serie(MESA,
    [AL_PECHO],
    [{ ...AL_PECHO, muslo: 112 }],              // la cadera no se despega
    [{ ...AL_PECHO, rodilla: 30 }],             // estira las piernas
    [AL_PECHO, 0.4, 0.4],                       // con impulso
  ));
  assert.deepEqual(tipos(r), [[], ["recorrido"], ["rodillas"], ["impulso"]]);
});

test("plancha: mide cuánto aguanta y revisa la cadera y la cabeza", () => {
  const bien = plancha.analizar(cuadrosDe(serieFlexiones([[{ codo: 5 }, 0.5], [{ codo: 5 }, 20]])));
  assert.equal(bien.repeticiones.length, 1);
  assert.ok(Math.abs(bien.segundos - 20) <= 1, `${bien.segundos} s`);
  assert.equal(bien.puntaje, 100);
  const caida = plancha.analizar(cuadrosDe(serieFlexiones([[{ codo: 5, cadera: 30 }, 10]])));
  assert.deepEqual(tipos(caida), [["caderaCaida"]]);
  const cabeza = plancha.analizar(cuadrosDe(serieFlexiones([[{ codo: 5, cabeza: 45 }, 10]])));
  assert.deepEqual(tipos(cabeza), [["cabeza"]]);
  const corta = plancha.analizar(cuadrosDe(serieFlexiones([[{ codo: 5 }, 2]])));
  assert.equal(corta.repeticiones.length, 0);
});

test("detecta la variante por lo que se mueve", () => {
  assert.equal(detectarVariante(serie(ACOSTADO, [ARRIBA], [ARRIBA])), "encogimiento");
  assert.equal(detectarVariante(serie(ACOSTADO, [SENTADO, 1.5, 1.5], [SENTADO, 1.5, 1.5])), "abdominalCompleto");
  assert.equal(detectarVariante(serie(PIERNAS_PISO, [PIERNAS_ARRIBA], [PIERNAS_ARRIBA])), "elevacionPiernas");
  assert.equal(detectarVariante(serie(MESA, [AL_PECHO], [AL_PECHO])), "crunchInverso");
  assert.equal(detectarVariante(cuadrosDe(serieFlexiones([[{ codo: 5 }, 10]]))), "plancha");
  // Parado (sentadillas) no es ninguna.
  assert.equal(detectarVariante(cuadrosDe(sentadillas([{ fondo: { rodilla: 100, tibia: 30, tronco: 35 } }]))), null);
});

test("si está parado, avisa", () => {
  const cuadros = serie(ACOSTADO, [ARRIBA]);
  for (const c of cuadros) if (c.a) c.a.elevacionTronco += 80;
  assert.match(encogimiento.analizar(cuadros).avisos.join(" "), /no estás en el piso/);
});
