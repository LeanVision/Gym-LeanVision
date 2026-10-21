import { VISTA } from "./geometria.js";

// ¿La toma sirve para corregir? Mismos criterios que se validaron con videos
// reales en el módulo de ergonomía: de costado los hombros se superponen
// (separación 0-0,3 largos de tronco) y de frente quedan separados (0,6-1,1).

export const CALIDAD = {
  separacionPerfil: 0.35,
  perfilMinimo: 0.7,    // fracción de cuadros con persona que tienen que estar de costado
  detectadaMinima: 0.6, // fracción de cuadros con el cuerpo entero detectado
};

/**
 * `cuadros`: [{t, a}] (a = ángulos o null si no se vio el cuerpo entero).
 * `vista`: {angulo, desde3d} de prepararCuadros (opcional). Si los ángulos
 * salen de la vista de costado armada en 3D, la separación de los hombros
 * no dice nada (siempre da "de costado"): se mira el ángulo de la cámara.
 * Devuelve {ok, avisos: [texto], deCostado, detectada}.
 */
export function revisarToma(cuadros, vista = null, c = CALIDAD) {
  const conCuerpo = cuadros.filter((x) => x.a);
  const detectada = cuadros.length ? conCuerpo.length / cuadros.length : 0;
  const conHombros = conCuerpo.filter((x) => x.a.separacionHombros != null);
  const deCostado = conHombros.length
    ? conHombros.filter((x) => x.a.separacionHombros <= c.separacionPerfil).length / conHombros.length
    : 1;
  const avisos = [];
  if (detectada < c.detectadaMinima) {
    avisos.push("No se ve el cuerpo entero buena parte del video. Alejá el celular hasta que entres de la cabeza a los pies.");
  }
  if (vista?.desde3d) {
    if (vista.angulo >= VISTA.frenteMinimo) {
      avisos.push("Filmaste casi de frente: así cuesta ver la profundidad. Poné el celular de costado o en diagonal (a unos 45°).");
    }
  } else if (conCuerpo.length && deCostado < c.perfilMinimo) {
    avisos.push("No estás de costado a la cámara. Poné el celular a tu izquierda o derecha (o en diagonal), a la altura de la cadera.");
  }
  return { ok: avisos.length === 0, avisos, deCostado, detectada };
}
