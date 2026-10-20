// La versión tiene que coincidir en todos lados, y cada módulo tiene que
// pedirse con ella: si no, el navegador puede seguir usando archivos viejos.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import { VERSION } from "../js/version.js";

const raiz = new URL("..", import.meta.url);
const html = readFileSync(new URL("index.html", raiz), "utf8");

test("package.json tiene la misma versión", () => {
  const paquete = JSON.parse(readFileSync(new URL("package.json", raiz), "utf8"));
  assert.equal(paquete.version, VERSION);
});

test("index.html pide la hoja de estilos y la app con la versión", () => {
  assert.match(html, new RegExp(`css/estilos\\.css\\?v=${VERSION.replaceAll(".", "\\.")}"`));
  assert.match(html, new RegExp(`js/app\\.js\\?v=${VERSION.replaceAll(".", "\\.")}"`));
});

test("el import map tiene todos los módulos, con la versión", () => {
  const mapa = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const modulos = readdirSync(new URL("js/", raiz)).filter((f) => f.endsWith(".js"));
  for (const m of modulos) {
    assert.equal(mapa[`./js/${m}`], `./js/${m}?v=${VERSION}`, `falta ${m} en el import map o tiene otra versión`);
  }
  assert.equal(Object.keys(mapa).length, modulos.length, "el import map tiene módulos que ya no existen");
});
