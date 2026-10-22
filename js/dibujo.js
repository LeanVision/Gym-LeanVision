// Dibuja el esqueleto sobre el video, sincronizado con la reproducción.

import { P } from "./geometria.js";

const HUESOS = [
  ["hombro", "cadera"], ["cadera", "rodilla"], ["rodilla", "tobillo"],
  ["tobillo", "talon"], ["talon", "punta"], ["tobillo", "punta"],
  ["hombro", "codo"], ["codo", "muneca"], ["hombro", "oreja"],
];

/** Índice del cuadro analizado más cercano al tiempo t (los cuadros están ordenados). */
export function cuadroEn(poses, t) {
  let lo = 0, hi = poses.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (poses[m].t < t) lo = m + 1; else hi = m;
  }
  if (lo > 0 && Math.abs(poses[lo - 1].t - t) < Math.abs(poses[lo].t - t)) lo--;
  return lo;
}

// Las partes del cuerpo que puede marcar un error (las `partes` de cada
// error en PROBLEMAS), con los puntos que las forman.
export const SEGMENTOS = {
  tronco: ["hombro", "cadera"], muslo: ["cadera", "rodilla"], tibia: ["rodilla", "tobillo"],
  pie: ["tobillo", "punta"], brazo: ["hombro", "codo"], antebrazo: ["codo", "muneca"], cuello: ["hombro", "oreja"],
};
const COLOR_MARCA = "#FF3B30";

/**
 * `colorDe(t)` devuelve el color del esqueleto en ese momento (por ejemplo,
 * mandarina en una repetición con errores). `marcasEn(t)` devuelve los errores
 * a marcar en ese momento: [{partes: ["muslo", …], texto}]; esas partes se
 * pintan en rojo y el texto va en una etiqueta al lado.
 */
export function dibujar(canvas, video, poses, lado, colorDe = () => "#22d3ee", marcasEn = () => []) {
  const ctx = canvas.getContext("2d");
  const ancho = (canvas.width = video.videoWidth);
  const alto = (canvas.height = video.videoHeight);
  ctx.clearRect(0, 0, ancho, alto);
  if (!poses.length) return;
  const { landmarks } = poses[cuadroEn(poses, video.currentTime)];
  if (!landmarks) return;
  const punto = (n) => landmarks[P[`${n}_${lado}`]];
  ctx.lineWidth = Math.max(3, ancho / 120);
  ctx.lineCap = "round";
  ctx.strokeStyle = colorDe(video.currentTime);
  for (const [a, b] of HUESOS) {
    const pa = punto(a), pb = punto(b);
    if (!pa || !pb || (pa.visibility ?? 1) < 0.5 || (pb.visibility ?? 1) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * ancho, pa.y * alto);
    ctx.lineTo(pb.x * ancho, pb.y * alto);
    ctx.stroke();
  }

  // Errores: la parte del cuerpo en rojo, más gruesa, y una etiqueta.
  const grosor = ctx.lineWidth;
  const etiquetas = [];
  for (const { partes, texto } of marcasEn(video.currentTime)) {
    let marcada = false;
    for (const parte of partes) {
      const [a, b] = SEGMENTOS[parte] ?? [];
      const pa = a && punto(a), pb = b && punto(b);
      if (!pa || !pb) continue;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = grosor * 3.4;
      ctx.beginPath(); ctx.moveTo(pa.x * ancho, pa.y * alto); ctx.lineTo(pb.x * ancho, pb.y * alto); ctx.stroke();
      ctx.strokeStyle = COLOR_MARCA;
      ctx.lineWidth = grosor * 2.2;
      ctx.beginPath(); ctx.moveTo(pa.x * ancho, pa.y * alto); ctx.lineTo(pb.x * ancho, pb.y * alto); ctx.stroke();
      marcada = true;
    }
    if (marcada && texto) etiquetas.push({ texto });
  }
  // Las etiquetas arriba del video, una debajo de otra, para no tapar la
  // parte marcada; si una no entra a lo ancho, se achica la letra.
  ctx.textBaseline = "middle";
  let y = 8;
  for (const e of etiquetas) {
    let tamano = Math.max(12, Math.round(alto / 48));
    ctx.font = `700 ${tamano}px Archivo, system-ui, sans-serif`;
    const maximo = ancho - 16;
    if (ctx.measureText(e.texto).width + tamano > maximo) {
      tamano = Math.max(8, Math.floor(tamano * maximo / (ctx.measureText(e.texto).width + tamano)));
      ctx.font = `700 ${tamano}px Archivo, system-ui, sans-serif`;
    }
    const w = ctx.measureText(e.texto).width + tamano;
    const h = tamano * 1.7;
    const x = 8;
    ctx.fillStyle = COLOR_MARCA;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(e.texto, x + tamano / 2, y + h / 2);
    y += h + 6;
  }
}
