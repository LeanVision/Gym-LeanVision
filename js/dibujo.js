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

/** `colorDe(t)` devuelve el color del esqueleto en ese momento (por ejemplo, rojo en una repetición con errores). */
export function dibujar(canvas, video, poses, lado, colorDe = () => "#22d3ee") {
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
}
