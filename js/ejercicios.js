// Los ejercicios de la app: tutorial, errores que se revisan y análisis.
// Para agregar uno: su módulo de análisis (como sentadilla.js) y una entrada acá.

import * as sentadilla from "./sentadilla.js";
import * as pesoMuerto from "./peso-muerto.js";
import * as flexiones from "./flexiones.js";
import * as estocadas from "./estocadas.js";
import * as abdominales from "./abdominales.js";

export const EJERCICIOS = {
  sentadilla: {
    nombre: "Sentadilla",
    resumen: "Profundidad · tronco · talones",
    color: "#FF9F1C",
    // Dibujo de la tarjeta: viewBox y trazos del muñequito.
    icono: { caja: "0 0 54 64", trazos: '<circle cx="32" cy="9" r="6"/><path d="M30 17l-10 18 14 6-4 18M20 35l-7 22"/>' },
    pasoClave: 3, // el paso que se resalta en el tutorial (desde 0)
    pasos: [
      "Pies al ancho de los hombros, puntas un poco hacia afuera.",
      "Tomá aire, apretá el abdomen y mantené el pecho arriba.",
      "Bajá llevando la cadera hacia atrás y abajo, con las rodillas en la dirección de las puntas de los pies.",
      "Bajá hasta que el muslo quede paralelo al piso, con todo el pie apoyado.",
      "Subí empujando el piso con todo el pie, hasta quedar derecho.",
    ],
    noRevisamos: "Las rodillas que se van hacia adentro: eso se ve de frente, no de costado.",
    consejosFilmacion: [],
    sinRepeticiones: "Revisá que se vea todo el cuerpo de costado y que bajes al menos hasta la mitad.",
    problemas: sentadilla.PROBLEMAS,
    analizar: sentadilla.analizarSentadilla,
  },
  pesoMuerto: {
    nombre: "Peso muerto",
    resumen: "Cadera · barra · final",
    color: "#FFB5C8",
    icono: { caja: "0 0 58 60", trazos: '<circle cx="40" cy="10" r="6"/><path d="M36 17L18 28l6 9-4 17M18 28l12 4 2 22M4 46h50"/>' },
    pasoClave: 3,
    pasos: [
      "Pies al ancho de la cadera, con la barra arriba de la mitad del pie (a unos 3 cm de las tibias).",
      "Agachate y agarrá la barra apenas por fuera de las piernas, con los brazos estirados.",
      "Bajá la cadera hasta que las tibias toquen la barra, con los hombros apenas adelante de ella y la espalda recta.",
      "Tomá aire, apretá el abdomen y empujá el piso con las piernas: la barra sube pegada a las piernas, y la cadera y los hombros suben juntos.",
      "Terminá parado derecho, apretando los glúteos, sin tirarte hacia atrás. Bajá por el mismo camino.",
    ],
    noRevisamos: "Si la espalda se redondea: el modelo no tiene puntos en la columna y no lo puede medir bien. Mantenela recta, en especial al despegar la barra del piso.",
    consejosFilmacion: ["Que se vean tus manos y la barra durante todo el movimiento."],
    sinRepeticiones: "Revisá que se vea todo el cuerpo de costado y que bajes hasta la barra en cada repetición.",
    problemas: pesoMuerto.PROBLEMAS,
    analizar: pesoMuerto.analizarPesoMuerto,
  },
  flexiones: {
    nombre: "Flexiones de brazos",
    resumen: "Línea · codos · cabeza",
    color: "#FFF8EE",
    icono: { caja: "0 0 64 44", trazos: '<circle cx="54" cy="10" r="6"/><path d="M48 15L6 26M46 17l3 16M4 38h56"/>' },
    pasoClave: 1,
    pasos: [
      "Apoyá las manos en el piso un poco más abiertas que los hombros, justo debajo de ellos.",
      "Estirá las piernas y apoyá las puntas de los pies: el cuerpo en línea recta de la cabeza a los talones.",
      "Apretá el abdomen y los glúteos, y mirá al piso un poco adelante de las manos.",
      "Bajá doblando los codos, pegados al cuerpo (a unos 45°), hasta que el pecho quede cerca del piso.",
      "Empujá el piso hasta estirar los brazos, sin perder la línea del cuerpo.",
    ],
    noRevisamos: "Si los codos se abren hacia los costados: eso se ve de frente o desde arriba, no de costado. Tampoco las flexiones con las rodillas apoyadas: hacelas con las piernas estiradas.",
    consejosFilmacion: ["Para las flexiones, el celular más bajo: a unos 30-50 cm del piso, de costado."],
    sinRepeticiones: "Revisá que se vea todo el cuerpo de costado, con los brazos a la vista, y que bajes doblando los codos.",
    problemas: flexiones.PROBLEMAS,
    analizar: flexiones.analizarFlexiones,
  },
  estocadas: {
    nombre: "Estocadas",
    resumen: "Profundidad · rodilla · torso",
    color: "#7CF2C0",
    icono: { caja: "0 0 64 64", trazos: '<circle cx="34" cy="9" r="6"/><path d="M33 16l-1 20M32 36l14 8-2 16M32 36l-14 12-12 2"/>' },
    pasoClave: 2,
    pasos: [
      "Parate derecho, con los pies al ancho de la cadera y el abdomen firme.",
      "Dá un paso largo hacia adelante (o hacia atrás), con el pie de adelante bien apoyado.",
      "Bajá la cadera recto hacia abajo hasta que las dos rodillas queden a unos 90°, con la de atrás cerca del piso.",
      "Mantené el torso derecho y la rodilla de adelante en línea con el pie.",
      "Empujá con el talón de adelante para volver arriba. Alterná las piernas.",
    ],
    noRevisamos: "Si la rodilla de adelante se va hacia adentro: eso se ve de frente, no de costado.",
    consejosFilmacion: ["Hacé las estocadas en el lugar, sin avanzar caminando, para no salir del cuadro."],
    sinRepeticiones: "Revisá que se vea todo el cuerpo de costado, con las dos piernas, y que bajes la rodilla de atrás hacia el piso.",
    problemas: estocadas.PROBLEMAS,
    analizar: estocadas.analizarEstocadas,
  },
  abdominales: {
    nombre: "Abdominales",
    resumen: "Cuello · pies · ritmo",
    color: "#C3B1FF",
    icono: { caja: "0 0 64 44", trazos: '<circle cx="51" cy="14" r="6"/><path d="M30 38l14-16M30 38L18 22 8 38M44 22l-14 2M4 38h56"/>' },
    pasoClave: 2,
    pasos: [
      "Acostate boca arriba, con las rodillas dobladas y los pies apoyados en el piso, al ancho de la cadera.",
      "Cruzá los brazos sobre el pecho o apoyá apenas las manos detrás de las orejas, sin entrelazar los dedos.",
      "Apretá el abdomen y despegá los hombros del piso, mirando al techo, con un puño de espacio entre el mentón y el pecho.",
      "Arriba, la zona lumbar sigue apoyada y los pies también. Soltá el aire al subir.",
      "Bajá despacio, sin dejarte caer, y volvé a empezar.",
    ],
    noRevisamos: "Si la zona lumbar se despega del piso: el modelo no tiene puntos en la columna y no lo puede medir. Mantenela apoyada.",
    consejosFilmacion: ["Para los abdominales, el celular bajo: a unos 30-50 cm del piso, de costado, con la cabeza y los pies adentro del cuadro."],
    sinRepeticiones: "Revisá que se vea todo el cuerpo de costado, acostado, y que despegues los hombros del piso en cada repetición.",
    problemas: abdominales.PROBLEMAS,
    analizar: abdominales.analizarAbdominales,
  },
};
