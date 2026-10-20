// Los ejercicios de la app: tutorial, errores que se revisan y análisis.
// Para agregar uno: su módulo de análisis (como sentadilla.js) y una entrada acá.

import * as sentadilla from "./sentadilla.js";
import * as pesoMuerto from "./peso-muerto.js";

export const EJERCICIOS = {
  sentadilla: {
    nombre: "Sentadilla",
    resumen: "Profundidad, inclinación del tronco, talones y control de la bajada",
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
    resumen: "Cadera y pecho juntos, barra pegada al cuerpo, posición de arranque y final",
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
};
