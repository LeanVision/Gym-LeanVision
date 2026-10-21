// Pantallas de la app y el recorrido: inicio → tutorial → video → análisis → resultado.

import { prepararCuadros } from "./geometria.js";
import { revisarToma } from "./calidad.js";
import { EJERCICIOS, GRUPOS } from "./ejercicios.js";
import { estimarPoses } from "./pose.js";
import { dibujar } from "./dibujo.js";
import { animar } from "./animacion.js";
import { VERSION } from "./version.js";

const $ = (id) => document.getElementById(id);
const PANTALLAS = ["inicio", "variantes", "tutorial", "analizando", "resultado"];
const COLOR_ESQUELETO = { fuera: "#FFB5C8", bien: "#7CF2C0", conErrores: "#FF9F1C" };
let historial = ["inicio"];
let ejercicio = EJERCICIOS.sentadilla;
let idEjercicio = "sentadilla";
let pararAnimacion = () => {};
let ultimo = null; // el último video analizado, para analizarlo como otra variante

document.querySelectorAll("[data-version]").forEach((e) => { e.textContent = `v${VERSION}`; });

function mostrar(id, { volviendo = false } = {}) {
  for (const p of PANTALLAS) $(p).hidden = p !== id;
  if (!volviendo && historial.at(-1) !== id) historial.push(id);
  document.body.dataset.pantalla = id;
  $("volver").hidden = id === "inicio" || id === "analizando";
  if (id !== "analizando") pararAnimacion();
  ajustarTitulos();
  window.scrollTo(0, 0);
}

// Los títulos grandes no cortan palabras: si una no entra en el ancho, se
// achica el título hasta que entre.
const TITULO_MINIMO = 22; // px
function ajustarTitulos() {
  document.querySelectorAll(".pantalla:not([hidden]) .titulo-grande").forEach((h) => {
    h.style.fontSize = "";
    let tamano = parseFloat(getComputedStyle(h).fontSize);
    while (h.scrollWidth > h.clientWidth && tamano > TITULO_MINIMO) {
      tamano -= 2;
      h.style.fontSize = `${tamano}px`;
    }
  });
}
addEventListener("resize", ajustarTitulos);
document.fonts?.ready.then(ajustarTitulos); // la letra ancha llega después y ocupa más

$("volver").addEventListener("click", () => {
  $("video").pause();
  historial.pop();
  // "analizando" no es un lugar al que tenga sentido volver.
  while (historial.at(-1) === "analizando") historial.pop();
  mostrar(historial.at(-1) ?? "inicio", { volviendo: true });
});
document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.ir)));

// Inicio: un bloque de color por ejercicio; los que tienen variantes
// (abdominales) van en un solo bloque que lleva a elegir la variante.
const tarjeta = (dato, valor, e) => `
  <button class="tarjeta" data-${dato}="${valor}" style="background: ${e.color}">
    <span>
      <span class="tarjeta-titulo">${e.nombre}</span>
      <span class="tarjeta-texto">${e.resumen}</span>
    </span>
    <svg width="58" height="58" viewBox="${e.icono.caja}" fill="none" stroke="currentColor" stroke-width="5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${e.icono.trazos}</svg>
  </button>`;
const gruposPuestos = new Set();
$("tarjetas").innerHTML = Object.entries(EJERCICIOS).map(([id, e]) => {
  if (!e.grupo) return tarjeta("ejercicio", id, e);
  if (gruposPuestos.has(e.grupo)) return "";
  gruposPuestos.add(e.grupo);
  return tarjeta("grupo", e.grupo, GRUPOS[e.grupo]);
}).join("");

function elegirGrupo(idGrupo) {
  const g = GRUPOS[idGrupo];
  document.body.style.setProperty("--ejercicio", g.color);
  $("variantes-titulo").textContent = g.nombre;
  $("variantes-intro").textContent = g.intro;
  $("variantes-nota").textContent = g.noSeRevisan;
  $("tarjetas-variantes").innerHTML = Object.entries(EJERCICIOS)
    .filter(([, e]) => e.grupo === idGrupo).map(([id, e]) => tarjeta("ejercicio", id, e)).join("");
}

document.addEventListener("click", (ev) => {
  const b = ev.target.closest(".tarjeta");
  if (!b) return;
  if (b.dataset.grupo) {
    elegirGrupo(b.dataset.grupo);
    mostrar("variantes");
  } else {
    elegirEjercicio(b.dataset.ejercicio);
    mostrar("tutorial");
  }
});

// Tutorial: pestañas.
const PESTANAS = ["pasos", "errores", "filmar"];
function elegirPestana(nombre) {
  for (const p of PESTANAS) {
    $(`tab-${p}`).setAttribute("aria-selected", String(p === nombre));
    $(`panel-${p}`).hidden = p !== nombre;
  }
}
PESTANAS.forEach((p) => $(`tab-${p}`).addEventListener("click", () => elegirPestana(p)));

function elegirEjercicio(id) {
  idEjercicio = id;
  ejercicio = EJERCICIOS[id];
  document.body.style.setProperty("--ejercicio", ejercicio.color);
  $("tutorial-titulo").textContent = ejercicio.nombre;
  $("pasos").innerHTML = ejercicio.pasos.map((p, i) => `
    <li class="${i === ejercicio.pasoClave ? "clave" : ""}"><span class="paso-numero">${i + 1}</span><span>${p}</span></li>`).join("");
  // Los errores que revisamos salen de la misma lista que usa el análisis.
  $("lista-errores").innerHTML = Object.values(ejercicio.problemas)
    .map((p) => `<li><strong>${p.titulo}</strong>${p.consejo}</li>`).join("");
  $("no-revisamos").innerHTML = `<strong>No revisamos:</strong> ${ejercicio.noRevisamos}`;
  $("consejos-filmacion").innerHTML = ejercicio.consejosFilmacion.map((c) => `<li>${c}</li>`).join("");
  elegirPestana("pasos");
}
elegirEjercicio("sentadilla");

for (const id of ["grabar", "elegir"]) {
  $(id).addEventListener("change", (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite elegir el mismo archivo otra vez
    if (archivo) analizar(archivo);
  });
}

async function analizar(archivo) {
  mostrar("analizando");
  pararAnimacion();
  pararAnimacion = animar($("animacion"), idEjercicio);
  $("progreso").style.width = "0%";
  $("porcentaje").hidden = true;
  $("estado").textContent = "Cargando el modelo…";
  const video = $("video");
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(archivo);
  try {
    const poses = await estimarPoses(video, (f) => {
      $("progreso").style.width = `${Math.round(f * 100)}%`;
      $("porcentaje").hidden = false;
      $("porcentaje").textContent = `${Math.round(f * 100)} %`;
      $("estado").textContent = "Revisando tu movimiento cuadro por cuadro…";
    });
    const { cuadros, lado } = prepararCuadros(poses, video.videoWidth, video.videoHeight);
    ultimo = { poses, lado, cuadros, toma: revisarToma(cuadros) };
    analizarUltimo();
  } catch (error) {
    console.error(error);
    $("estado").textContent = `No se pudo analizar el video: ${error.message}. Probá con otro archivo.`;
    $("volver").hidden = false;
    pararAnimacion();
  }
}

/** Analiza el último video con el ejercicio elegido (sin volver a buscar las poses). */
function analizarUltimo() {
  const { poses, lado, cuadros, toma } = ultimo;
  const analisis = ejercicio.analizar(cuadros);
  // Variantes: si el video parece de otra, se avisa y se ofrece analizarlo como esa.
  const parecida = ejercicio.grupo ? GRUPOS[ejercicio.grupo].detectar(cuadros) : null;
  const otraVariante = parecida && parecida !== idEjercicio ? parecida : null;
  mostrarResultado({ poses, lado, toma, analisis, otraVariante });
  window.ultimoAnalisis = { ejercicio: ejercicio.nombre, toma, analisis, lado, otraVariante }; // para las pruebas y para depurar
}

$("analizar-como").addEventListener("click", (ev) => {
  elegirEjercicio(ev.currentTarget.dataset.ejercicio);
  analizarUltimo();
});

function mostrarResultado({ poses, lado, toma, analisis, otraVariante }) {
  const { repeticiones, principales, puntaje } = analisis;
  const PROBLEMAS = ejercicio.problemas;
  const video = $("video");
  video.currentTime = 0;

  $("resultado-ejercicio").textContent = ejercicio.nombre;
  $("puntaje").textContent = puntaje ?? "–";
  const conErrores = repeticiones.filter((r) => r.problemas.length).length;
  $("chip-reps").textContent = ejercicio.isometrico
    ? `${analisis.segundos} s`
    : `${repeticiones.length} ${repeticiones.length === 1 ? "rep" : "reps"}`;
  $("titulo-reps").textContent = ejercicio.isometrico ? "Tu plancha" : "Repetición por repetición";
  $("chip-corregir").hidden = !conErrores;
  $("chip-corregir").textContent = `${conErrores} a corregir`;
  $("resumen-texto").textContent = !repeticiones.length
    ? (ejercicio.isometrico ? ejercicio.sinRepeticiones : `No encontramos repeticiones. ${ejercicio.sinRepeticiones}`)
    : conErrores ? "" : "¡Muy bien! No encontramos errores.";

  $("avisos").hidden = toma.ok && !analisis.avisos.length;
  $("avisos").innerHTML = [...toma.avisos, ...analisis.avisos].map((a) => `<p>${a}</p>`).join("")
    + (toma.ok ? "" : "<p><strong>Los resultados pueden no ser exactos.</strong></p>");

  $("otra-variante").hidden = !otraVariante;
  if (otraVariante) {
    $("otra-variante-texto").textContent = `Parece que hiciste ${EJERCICIOS[otraVariante].nombre.toLowerCase()}, no ${ejercicio.nombre.toLowerCase()}.`;
    $("analizar-como").textContent = `Analizar como ${EJERCICIOS[otraVariante].nombre.toLowerCase()}`;
    $("analizar-como").dataset.ejercicio = otraVariante;
  }

  $("consejos-principales").innerHTML = principales.slice(0, 2).map(({ tipo, veces }) => `
    <div class="consejo-principal">
      <span class="consejo-titulo">${PROBLEMAS[tipo].titulo}</span>
      ${PROBLEMAS[tipo].consejo} <strong>(${veces} de ${repeticiones.length})</strong>
    </div>`).join("");

  const detalle = $("detalle-rep");
  detalle.hidden = true;
  $("repeticiones").innerHTML = repeticiones.map((r, i) => `
    <button class="repeticion ${r.problemas.length ? "con-errores" : ""}" data-i="${i}" aria-pressed="false">
      ${ejercicio.isometrico ? `${analisis.segundos} s` : `Rep ${r.numero}`}<strong>${r.puntaje}</strong>
    </button>`).join("");
  $("repeticiones").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    const r = repeticiones[Number(b.dataset.i)];
    $("repeticiones").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    detalle.hidden = false;
    detalle.innerHTML = `<h3>${ejercicio.isometrico ? ejercicio.nombre : `Repetición ${r.numero}`}</h3>` + (r.problemas.length
      ? `<ul>${r.problemas.map((p) => `<li><strong>${PROBLEMAS[p.tipo].titulo}.</strong> ${p.detalle}</li>`).join("")}</ul>`
      : "Bien hecha.");
    video.pause();
    video.currentTime = r.tFondo;
    video.scrollIntoView({ behavior: "smooth", block: "center" });
  }));

  // Esqueleto: verde en las repeticiones bien hechas, mandarina en las que tienen errores.
  const colorDe = (t) => {
    const r = repeticiones.find((x) => t >= x.tInicio && t <= x.tFin);
    if (!r) return COLOR_ESQUELETO.fuera;
    return r.problemas.length ? COLOR_ESQUELETO.conErrores : COLOR_ESQUELETO.bien;
  };
  const canvas = $("esqueleto");
  const redibujar = () => dibujar(canvas, video, poses, lado, colorDe);
  const bucle = () => {
    redibujar();
    if (!video.paused && !video.ended) {
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(bucle);
      else requestAnimationFrame(bucle);
    }
  };
  video.onplay = bucle;
  video.onseeked = redibujar;
  video.onloadeddata = redibujar;
  mostrar("resultado");
  redibujar();
}
