// Esqueleto en 3D que se puede girar, con los puntos 3D de MediaPipe
// ("worldLandmarks": en metros, centrados en la cadera, y hacia abajo y z
// hacia la cámara). Es una estimación desde un solo video: sirve para mirar
// el movimiento desde otro ángulo; las correcciones siguen saliendo del 2D.

// Huesos entre los 33 puntos de MediaPipe. El lado derecho del cuerpo va
// primero en cada par para poder pintarlo distinto del izquierdo.
const HUESOS = [
  [12, 11], [12, 24], [11, 23], [24, 23],
  [12, 14], [14, 16], [11, 13], [13, 15],
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
];
const IZQUIERDA = new Set([11, 13, 15, 23, 25, 27, 29, 31]);
const rad = (g) => (g * Math.PI) / 180;
const medio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });

/**
 * Gira un punto: primero `giro` grados alrededor del eje vertical, después
 * `inclinacion` grados alrededor del eje horizontal (mirar desde arriba).
 * Devuelve {x, y, z} con z = profundidad (negativo = más cerca).
 */
export function proyectar(p, giro, inclinacion) {
  const g = rad(giro), i = rad(inclinacion);
  const x = p.x * Math.cos(g) - p.z * Math.sin(g);
  const z1 = p.x * Math.sin(g) + p.z * Math.cos(g);
  return { x, y: p.y * Math.cos(i) - z1 * Math.sin(i), z: p.y * Math.sin(i) + z1 * Math.cos(i) };
}

/**
 * Giro para ver a la persona de frente: hacia dónde mira la nariz respecto
 * del centro de la cadera, en el plano del piso (promedio de todo el video).
 */
export function giroDeFrente(poses) {
  let fx = 0, fz = 0;
  for (const p of poses) {
    const m = p.mundo;
    if (!m) continue;
    const cadera = medio(m[23], m[24]);
    fx += m[0].x - cadera.x;
    fz += m[0].z - cadera.z;
  }
  const largo = Math.hypot(fx, fz);
  if (!largo) return 0;
  // El giro que lleva el frente de la persona hacia la cámara (z negativo).
  return (Math.atan2(-fx / largo, -fz / largo) * 180) / Math.PI;
}

/**
 * Vista 3D sobre un canvas. Se gira arrastrando; `ver(nombre)` pone una vista
 * fija ("frente", "costado", "arriba"). `dibujar(mundo, color)` dibuja un cuadro.
 */
export function crearVista3D(canvas, giroFrente = 0) {
  const VISTAS = {
    // Apenas desde arriba (−12°), para que se vea la grilla del piso.
    frente: { giro: giroFrente, inclinacion: -12 },
    costado: { giro: giroFrente + 90, inclinacion: -12 },
    arriba: { giro: giroFrente, inclinacion: -75 },
  };
  let { giro, inclinacion } = VISTAS.costado;
  let ultimo = { mundo: null, color: "#FFF8EE" };
  let arrastre = null;

  // Con on…= (no addEventListener): cada video nuevo crea otra vista sobre el
  // mismo canvas y reemplaza los manejadores de la anterior.
  canvas.style.touchAction = "none"; // arrastrar gira el esqueleto, no mueve la página
  canvas.onpointerdown = (e) => {
    arrastre = { x: e.clientX, y: e.clientY, giro, inclinacion };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!arrastre) return;
    giro = arrastre.giro + (e.clientX - arrastre.x) * 0.6;
    inclinacion = Math.max(-85, Math.min(85, arrastre.inclinacion - (e.clientY - arrastre.y) * 0.4));
    dibujar(ultimo.mundo, ultimo.color);
  };
  canvas.onpointerup = canvas.onpointercancel = () => { arrastre = null; };

  function dibujar(mundo, color = ultimo.color) {
    ultimo = { mundo, color };
    const dpr = window.devicePixelRatio || 1;
    const lado = canvas.clientWidth * dpr;
    canvas.width = lado;
    canvas.height = lado;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, lado, lado);
    if (!mundo) return;
    // 2 m entran en el cuadro. El centro del piso (bajo la cadera) va abajo
    // en las vistas de costado y al medio mirando desde arriba, así la
    // persona queda parada sobre la grilla y ocupa casi todo el alto.
    const escala = lado / 2;
    const piso = Math.max(...[27, 28, 29, 30, 31, 32].map((i) => mundo[i].y));
    const centro = proyectar({ x: 0, y: piso, z: 0 }, giro, inclinacion);
    const altoPiso = lado * (0.5 + 0.38 * Math.cos(rad(inclinacion)));
    const aPantalla = (p) => {
      const q = proyectar(p, giro, inclinacion);
      return { x: lado / 2 + (q.x - centro.x) * escala, y: altoPiso + (q.y - centro.y) * escala, z: q.z };
    };

    // Piso: una grilla a la altura de los pies.
    ctx.strokeStyle = "rgba(255, 248, 238, 0.18)";
    ctx.lineWidth = dpr;
    for (let k = -1; k <= 1.001; k += 0.25) {
      for (const [a, b] of [[{ x: k, z: -1 }, { x: k, z: 1 }], [{ x: -1, z: k }, { x: 1, z: k }]]) {
        const pa = aPantalla({ ...a, y: piso }), pb = aPantalla({ ...b, y: piso });
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
    }

    // Huesos, de atrás para adelante: los de atrás más transparentes.
    const pts = mundo.map(aPantalla);
    const hombros = aPantalla(medio(mundo[11], mundo[12]));
    const orejas = aPantalla(medio(mundo[7], mundo[8]));
    const huesos = [...HUESOS.map(([a, b]) => [pts[a], pts[b], IZQUIERDA.has(a) && IZQUIERDA.has(b)]), [hombros, orejas, false]]
      .sort((h1, h2) => (h2[0].z + h2[1].z) - (h1[0].z + h1[1].z));
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    for (const [a, b, izquierda] of huesos) {
      ctx.globalAlpha = izquierda ? 0.55 : 1;
      ctx.lineWidth = 5 * dpr;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(orejas.x, orejas.y, 0.09 * escala, 0, 2 * Math.PI); ctx.fill();
  }

  return {
    dibujar,
    ver(nombre) {
      ({ giro, inclinacion } = VISTAS[nombre]);
      dibujar(ultimo.mundo, ultimo.color);
    },
  };
}
