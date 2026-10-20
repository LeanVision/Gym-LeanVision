// Prueba de punta a punta: abre la app en Chromium, le pasa un video y espera
// el resultado. Usa MediaPipe de node_modules (en vez del CDN) y el modelo de
// pose de un archivo local, así corre sin internet.
//
//   MODELO_POSE=pose_landmarker_full.task VIDEO=sentadilla.webm npm run test:e2e
//   EJERCICIO="Peso muerto" MODELO_POSE=... VIDEO=peso-muerto.webm npm run test:e2e
//
// Opcional: CHROMIUM=/ruta/a/chrome si playwright no encuentra uno instalado.
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
  await pagina.route("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@*/**", async (ruta) => {
    const archivo = new URL(ruta.request().url()).pathname.split("/").slice(4).join("/");
    const cuerpo = await readFile(join(RAIZ, "node_modules/@mediapipe/tasks-vision", archivo));
    await ruta.fulfill({ body: cuerpo, contentType: TIPOS[extname(archivo)] ?? "application/octet-stream" });
  });
  await pagina.route("https://storage.googleapis.com/mediapipe-models/**", async (ruta) =>
    ruta.fulfill({ body: await readFile(MODELO_POSE), contentType: "application/octet-stream" }));

  await pagina.goto(url);
  await pagina.click(`.tarjeta-titulo:text-is("${process.env.EJERCICIO ?? "Sentadilla"}")`);
  await pagina.setInputFiles("#elegir", VIDEO);
  await pagina.waitForSelector("#resultado:not([hidden])", { timeout: 5 * 60_000 });
  const analisis = await pagina.evaluate(() => window.ultimoAnalisis);
  console.log(JSON.stringify({
    toma: analisis.toma,
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
  }
  if (!analisis.analisis.repeticiones.length) throw new Error("No se encontraron repeticiones");
} finally {
  await navegador.close();
  servidor.close();
}
