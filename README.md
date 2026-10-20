# Técnica Gym

Web app que corrige la técnica en el gimnasio: te grabás haciendo el
ejercicio con el celular y te dice qué corregir, repetición por repetición.
Por ahora: **sentadilla**.

- Se abre desde el navegador del celular, sin instalar nada.
- El video se analiza **en el celular** (MediaPipe Pose): no se sube a ningún servidor.
- Tutorial del ejercicio: cómo se hace, qué revisamos y cómo filmarse.

## Qué revisa en la sentadilla

Desde una toma de costado, en el punto más bajo de cada repetición:

| Error | Cómo se mide | Umbral |
|---|---|---|
| Poca profundidad | Ángulo del muslo con el piso | más de 15° por encima del paralelo |
| Tronco muy inclinado | Ángulo del tronco con la vertical | más de 50° |
| Se levantan los talones | Altura del talón respecto de la punta del pie, comparada con la posición de pie | más de 6 % del largo de la tibia |
| Bajada muy rápida | Tiempo desde que empieza a bajar hasta el punto más bajo | menos de 0,7 s |

Los umbrales están en `js/sentadilla.js` (`UMBRALES`) y conviene que los
revise un profesional (kinesiólogo, entrenador) con videos reales. Las
rodillas que se van hacia adentro sólo se ven **de frente**: queda para una
segunda toma.

Antes de corregir, revisa la toma (`js/calidad.js`): si la persona no está de
costado o no se ve entera, avisa que los resultados pueden no ser exactos.
Son los mismos criterios que se validaron con videos reales en
[Ergonomia-LeanVision](https://github.com/LeanVision/Ergonomia-LeanVision).

## Estructura

- `index.html`, `css/estilos.css`: las pantallas (inicio, tutorial, análisis, resultado).
- `js/app.js`: el recorrido entre pantallas y el resultado.
- `js/pose.js`: MediaPipe Pose en el navegador; recorre el video cuadro a cuadro.
- `js/geometria.js`: ángulos del cuerpo a partir de los puntos del esqueleto.
- `js/sentadilla.js`: separa las repeticiones y revisa cada una.
- `js/calidad.js`: si la toma sirve para corregir.
- `js/dibujo.js`: el esqueleto sobre el video (verde = bien, rojo = con errores).

## Probarla en la computadora

```bash
python3 -m http.server 8000   # y abrir http://localhost:8000
```

Para usarla desde el celular hace falta HTTPS: lo más simple es publicarla
con **GitHub Pages** (Settings → Pages → Deploy from a branch → `main`, carpeta raíz).

## Pruebas

```bash
npm install
npm test        # lógica: ángulos, repeticiones y errores, con esqueletos sintéticos
MODELO_POSE=pose_landmarker_full.task VIDEO=sentadilla.webm npm run test:e2e   # la app entera en Chromium
```

La prueba de punta a punta usa MediaPipe de `node_modules` y el modelo de un
archivo local (se baja de la [página de MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker#models)).
Chromium sin códecs propietarios no lee H.264: convertir el video a `.webm`.
