// Pantallas de la app y el recorrido: tutorial → video → análisis → resultado.

import { prepararCuadros } from "./geometria.js";
import { revisarToma } from "./calidad.js";
import { EJERCICIOS } from "./ejercicios.js";
import { estimarPoses } from "./pose.js";
import { dibujar } from "./dibujo.js";

const $ = (id) => document.getElementById(id);
const PANTALLAS = ["inicio", "tutorial", "analizando", "resultado"];
let historial = ["inicio"];
let ejercicio = EJERCICIOS.sentadilla;

function mostrar(id, { volviendo = false } = {}) {
  for (const p of PANTALLAS) $(p).hidden = p !== id;
  if (!volviendo && historial.at(-1) !== id) historial.push(id);
  $("volver").hidden = id === "inicio" || id === "analizando";
  window.scrollTo(0, 0);
}

$("volver").addEventListener("click", () => {
  $("video").pause();
  historial.pop();
  // "analizando" no es un lugar al que tenga sentido volver.
  while (historial.at(-1) === "analizando") historial.pop();
  mostrar(historial.at(-1) ?? "inicio", { volviendo: true });
});
document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.ir)));

$("tarjetas").innerHTML = Object.entries(EJERCICIOS).map(([id, e]) => `
  <button class="tarjeta" data-ejercicio="${id}">
    <span class="tarjeta-titulo">${e.nombre}</span>
    <span class="tarjeta-texto">${e.resumen}</span>
  </button>`).join("");
$("tarjetas").querySelectorAll("[data-ejercicio]").forEach((b) => b.addEventListener("click", () => {
  elegirEjercicio(b.dataset.ejercicio);
  mostrar("tutorial");
}));

function elegirEjercicio(id) {
  ejercicio = EJERCICIOS[id];
  $("tutorial-titulo").textContent = ejercicio.nombre;
  $("pasos").innerHTML = ejercicio.pasos.map((p) => `<li>${p}</li>`).join("");
  // Los errores que revisamos salen de la misma lista que usa el análisis.
  $("lista-errores").innerHTML = Object.values(ejercicio.problemas)
    .map((p) => `<li><strong>${p.titulo}</strong>${p.consejo}</li>`).join("");
  $("no-revisamos").innerHTML = `<strong>No revisamos:</strong> ${ejercicio.noRevisamos}`;
  $("consejos-filmacion").innerHTML = ejercicio.consejosFilmacion.map((c) => `<li>${c}</li>`).join("");
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
  $("progreso").style.width = "0%";
  $("estado").textContent = "Cargando el modelo…";
  const video = $("video");
  if (video.src) URL.revokeObjectURL(video.src);
  video.src = URL.createObjectURL(archivo);
  try {
    const poses = await estimarPoses(video, (f) => {
      $("progreso").style.width = `${Math.round(f * 100)}%`;
      $("estado").textContent = `Revisando tu movimiento… ${Math.round(f * 100)} %`;
    });
    const { cuadros, lado } = prepararCuadros(poses, video.videoWidth, video.videoHeight);
    const toma = revisarToma(cuadros);
    const analisis = ejercicio.analizar(cuadros);
    mostrarResultado({ poses, lado, toma, analisis });
    window.ultimoAnalisis = { ejercicio: ejercicio.nombre, toma, analisis, lado }; // para las pruebas y para depurar
  } catch (error) {
    console.error(error);
    $("estado").textContent = `No se pudo analizar el video: ${error.message}. Probá con otro archivo.`;
    $("volver").hidden = false;
  }
}

function claseDePuntaje(p) {
  return p == null ? "" : p >= 80 ? "bien" : p >= 55 ? "regular" : "mal";
}

function mostrarResultado({ poses, lado, toma, analisis }) {
  const { repeticiones, principales, puntaje } = analisis;
  const PROBLEMAS = ejercicio.problemas;
  const video = $("video");
  video.currentTime = 0;

  const circulo = $("puntaje");
  circulo.textContent = puntaje ?? "–";
  circulo.className = `puntaje ${claseDePuntaje(puntaje)}`;
  if (!repeticiones.length) {
    $("resumen-titulo").textContent = "No encontramos repeticiones";
    $("resumen-texto").textContent = ejercicio.sinRepeticiones;
  } else {
    const limpias = repeticiones.filter((r) => !r.problemas.length).length;
    $("resumen-titulo").textContent = `${repeticiones.length} repeticiones`;
    $("resumen-texto").textContent = limpias === repeticiones.length
      ? "¡Muy bien! No encontramos errores."
      : `${limpias} sin errores, ${repeticiones.length - limpias} para corregir.`;
  }

  $("avisos").hidden = toma.ok && !analisis.avisos.length;
  $("avisos").innerHTML = [...toma.avisos, ...analisis.avisos].map((a) => `<p>${a}</p>`).join("")
    + (toma.ok ? "" : "<p><strong>Los resultados pueden no ser exactos.</strong></p>");

  $("consejos-principales").innerHTML = principales.slice(0, 2).map(({ tipo, veces }) => `
    <div class="consejo-principal">
      <strong>${PROBLEMAS[tipo].titulo} (${veces} de ${repeticiones.length})</strong>
      ${PROBLEMAS[tipo].consejo}
    </div>`).join("");

  $("repeticiones").innerHTML = repeticiones.map((r) => `
    <li><button class="repeticion ${r.problemas.length ? "con-errores" : ""}" data-t="${r.tFondo}">
      <span class="repeticion-cabecera"><span>Repetición ${r.numero}</span><span>${r.puntaje}</span></span>
      ${r.problemas.length
        ? `<ul>${r.problemas.map((p) => `<li><strong>${PROBLEMAS[p.tipo].titulo}.</strong> ${p.detalle}</li>`).join("")}</ul>`
        : "<ul><li>Bien hecha.</li></ul>"}
    </button></li>`).join("");
  $("repeticiones").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    video.pause();
    video.currentTime = Number(b.dataset.t);
    video.scrollIntoView({ behavior: "smooth", block: "center" });
  }));

  // Esqueleto verde en las repeticiones bien hechas, rojo en las que tienen errores.
  const colorDe = (t) => {
    const r = repeticiones.find((x) => t >= x.tInicio && t <= x.tFin);
    if (!r) return "#22d3ee";
    return r.problemas.length ? "#ef4444" : "#22c55e";
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
