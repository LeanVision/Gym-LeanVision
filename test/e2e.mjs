// Prueba de punta a punta: abre la app en Chromium, le pasa un video y espera
// el resultado. Usa MediaPipe de node_modules (en vez del CDN) y el modelo de
// pose de un archivo local, así corre sin internet.
//
//   MODELO_POSE=pose_landmarker_full.task VIDEO=sentadilla.webm npm run test:e2e
//   EJERCICIO="Peso muerto" MODELO_POSE=... VIDEO=peso-muerto.webm npm run test:e2e
//
// Opcional: CHROMIUM=/ruta/a/chrome si playwright no encuentra uno instalado.
// MODO=preciso elige el análisis preciso (pasar el modelo heavy en MODELO_POSE).
// VISTA=2d o VISTA=3d fuerza de dónde salen los ángulos (si no, la app lo
// elige según el ángulo de la cámara).
// SIN_SALTOS=1 simula un iPhone que no avisa al saltar de cuadro ("seeked"):
// prueba el plan B, que recorre el video reproduciéndolo.
// Chromium sin códecs propietarios no lee H.264: usar un .webm (VP9).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright-core";

const RAIZ = resolve(new URL("..", import.meta.url).pathname);
const { MODELO_POSE, VIDEO, CHROMIUM } = process.env;
if (!MODELO_POSE || !VIDEO) {
  console.log("Falta MODELO_POSE o VIDEO: no se corre la prueba de punta a punta.");
  process.exit(0);
}

const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".wasm": "application/wasm" };
const servidor = createServer(async (pedido, respuesta) => {
  try {
    let ruta = join(RAIZ, decodeURIComponent(new URL(pedido.url, "http://x").pathname));
    if (ruta.endsWith("/")) ruta = join(ruta, "index.html");
    const archivo = await readFile(ruta);
    respuesta.writeHead(200, { "content-type": TIPOS[extname(ruta)] ?? "application/octet-stream" });
    respuesta.end(archivo);
  } catch {
    respuesta.writeHead(404).end();
  }
});
await new Promise((r) => servidor.listen(0, r));
const url = `http://localhost:${servidor.address().port}/`;

const navegador = await chromium.launch({ executablePath: CHROMIUM || undefined, args: ["--use-gl=swiftshader"] });
try {
  const pagina = await navegador.newPage();
  pagina.on("console", (m) => m.type() === "error" && console.log("[consola]", m.text()));
  if (process.env.VISTA) await pagina.addInitScript((v) => { window.forzarVista = v; }, process.env.VISTA);
  if (process.env.SIN_SALTOS) {
    await pagina.addInitScript(() => {
      const agregar = HTMLMediaElement.prototype.addEventListener;
      HTMLMediaElement.prototype.addEventListener = function (tipo, ...resto) {
        if (tipo !== "seeked") agregar.call(this, tipo, ...resto);
      };
    });
  }
  await pagina.route("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@*/**", async (ruta) => {
    const archivo = new URL(ruta.request().url()).pathname.split("/").slice(4).join("/");
    const cuerpo = await readFile(join(RAIZ, "node_modules/@mediapipe/tasks-vision", archivo));
    await ruta.fulfill({ body: cuerpo, contentType: TIPOS[extname(archivo)] ?? "application/octet-stream" });
  });
  await pagina.route("https://storage.googleapis.com/mediapipe-models/**", async (ruta) =>
    ruta.fulfill({ body: await readFile(MODELO_POSE), contentType: "application/octet-stream" }));

  await pagina.goto(url);
  await pagina.click(`.tarjeta-titulo:text-is("${process.env.EJERCICIO ?? "Sentadilla"}")`);
  // Los grupos (Abdominales) llevan a elegir la variante: VARIANTE=Plancha, etc.
  if (process.env.VARIANTE) await pagina.click(`#tarjetas-variantes .tarjeta-titulo:text-is("${process.env.VARIANTE}")`);
  if (process.env.MODO) await pagina.click(`[data-modo="${process.env.MODO}"]`);
  const inicio = Date.now();
  await pagina.setInputFiles("#elegir", VIDEO);
  // ESPERA_MINUTOS: cuánto esperar el resultado (sin placa gráfica, el modo preciso tarda).
  await pagina.waitForSelector("#resultado:not([hidden])", { timeout: Number(process.env.ESPERA_MINUTOS ?? 5) * 60_000 });
  const analisis = await pagina.evaluate(() => window.ultimoAnalisis);
  console.log(JSON.stringify({
    toma: analisis.toma,
    otraVariante: analisis.otraVariante,
    cuadros3d: analisis.cuadros3d,
    vista: analisis.vista,
    cuadros: analisis.cuadros,
    segundos: +((Date.now() - inicio) / 1000).toFixed(1),
    puntaje: analisis.analisis.puntaje,
    repeticiones: analisis.analisis.repeticiones.map((r) => ({
      numero: r.numero, tFondo: +r.tFondo.toFixed(1), puntaje: r.puntaje,
      problemas: r.problemas.map((p) => p.tipo),
      medidas: Object.fromEntries(Object.entries(r.medidas).map(([k, v]) => [k, v == null ? v : +v.toFixed(2)])),
    })),
  }, null, 2));
  if (process.env.CAPTURA) {
    await pagina.setViewportSize({ width: 412, height: 915 });
    await pagina.screenshot({ path: process.env.CAPTURA, fullPage: true });
    // La primera repetición con errores, tocada: el video en ese momento con la parte marcada.
    const conErrores = await pagina.$(".repeticion.con-errores");
    if (conErrores) {
      await conErrores.click();
      await pagina.waitForTimeout(800);
      await pagina.locator(".reproductor").screenshot({ path: process.env.CAPTURA.replace(/\.png$/, "-error.png") });
      await pagina.locator("#detalle-rep").screenshot({ path: process.env.CAPTURA.replace(/\.png$/, "-detalle.png") });
    }
  }
  if (!analisis.analisis.repeticiones.length) throw new Error("No se encontraron repeticiones");
} finally {
  await navegador.close();
  servidor.close();
}
