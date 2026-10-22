// Historial de sesiones, guardado solo en este celular (localStorage).
// Nada se sube a ningún lado. Si el navegador no deja guardar (modo
// privado), la app funciona igual, sin historial.

const CLAVE = "historial";
export const MAXIMO = 200;

function leerTodo() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function guardarTodo(sesiones) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesiones.slice(-MAXIMO)));
    return true;
  } catch {
    return false;
  }
}

/** Las sesiones guardadas, de la más nueva a la más vieja. */
export function sesiones() {
  return leerTodo().reverse();
}

/**
 * Guarda una sesión ({ejercicio, nombre, puntaje, reps, errores}) con la
 * fecha. Con `id` reemplaza esa sesión (cuando se reanaliza el mismo video
 * como otra variante). Devuelve el id.
 */
export function guardar(sesion, id = null) {
  const todas = leerTodo();
  const nueva = { ...sesion, id: id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, fecha: new Date().toISOString() };
  const i = id ? todas.findIndex((s) => s.id === id) : -1;
  if (i >= 0) todas[i] = { ...nueva, fecha: todas[i].fecha };
  else todas.push(nueva);
  guardarTodo(todas);
  return nueva.id;
}

/** La sesión anterior y el mejor puntaje de un ejercicio, sin contar la sesión `menosId`. */
export function comparar(ejercicio, menosId = null) {
  const previas = sesiones().filter((s) => s.ejercicio === ejercicio && s.id !== menosId && s.puntaje != null);
  if (!previas.length) return null;
  return { anterior: previas[0], mejor: Math.max(...previas.map((s) => s.puntaje)), cantidad: previas.length };
}

export function borrar() {
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}
