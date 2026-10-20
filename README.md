# Técnica Gym

Web app que corrige la técnica en el gimnasio: te grabás haciendo el
ejercicio con el celular y te dice qué corregir, repetición por repetición.
Por ahora: **sentadilla** y **peso muerto**.

- Se abre desde el navegador del celular, sin instalar nada.
- El video se analiza **en el celular** (MediaPipe Pose): no se sube a ningún servidor.
- Tutorial del ejercicio: cómo se hace, qué revisamos y cómo filmarse.

## Qué revisa en la sentadilla

Desde una toma de costado, en el punto más bajo de cada repetición:

| Error | Cómo se mide | Umbral |
|---|---|---|
| Poca profundidad | Ángulo del muslo con el piso | más de 15° por encima del paralelo |
| Tronco muy inclinado | Ángulo del tronco con la vertical | más de 50° |
| Se levantan los talones | Cuánto sube el tobillo respecto de la punta del pie, comparado con la posición de pie (mediana de ±0,3 s alrededor del punto más bajo) | más de 7 % del largo de la tibia |
| Bajada muy rápida | Tiempo desde que empieza a bajar hasta el punto más bajo | menos de 0,7 s |

Los umbrales están en `js/sentadilla.js` (`UMBRALES`) y conviene que los
revise un profesional (kinesiólogo, entrenador) con videos reales. Las
rodillas que se van hacia adentro sólo se ven **de frente**: queda para una
segunda toma.

Los talones se miden con el tobillo y no con el punto del talón: en una
sentadilla profunda la cola tapa el talón y el modelo lo ubica más arriba de
donde está. Si la persona sale muy chica en la imagen (tibia de menos de 80
píxeles, por poca resolución o por estar lejos), los talones no se revisan y
la app lo avisa: a ese tamaño el temblor del modelo es como un despegue real.

Antes de corregir, revisa la toma (`js/calidad.js`): si la persona no está de
costado o no se ve entera, avisa que los resultados pueden no ser exactos.
Son los mismos criterios que se validaron con videos reales en
[Ergonomia-LeanVision](https://github.com/LeanVision/Ergonomia-LeanVision).

## Qué revisa en el peso muerto

Desde una toma de costado; las repeticiones se cuentan con la flexión de cadera.

| Error | Cómo se mide | Umbral |
|---|---|---|
| La cadera sube antes que el pecho | Cuánto se acuesta el tronco en la primera mitad de la subida | más de 10° |
| La barra se aleja del cuerpo | Manos respecto de la mitad del pie, mediana de la subida | más de 0,25 largos de tronco adelante |
| Cadera muy baja (como una sentadilla) | Flexión de rodilla abajo de todo | más de 100° |
| Piernas demasiado rectas | Flexión de rodilla abajo de todo | menos de 15° |
| No terminás derecho | Flexión de cadera arriba de todo | más de 20° |
| Te tirás hacia atrás arriba | Tronco arriba de todo | más de 15° hacia atrás |

Los umbrales están en `js/peso-muerto.js` (`UMBRALES`). **No revisa la
espalda redondeada**: MediaPipe no tiene puntos en la columna, así que una
espalda curva y una recta dan el mismo ángulo. El tutorial lo explica.

## Estructura

- `index.html`, `css/estilos.css`: las pantallas (inicio, tutorial, análisis, resultado).
- `js/app.js`: el recorrido entre pantallas y el resultado.
- `js/ejercicios.js`: los ejercicios de la app (tutorial, errores y análisis de cada uno). Para agregar uno: su módulo de análisis y una entrada acá.
- `js/repeticiones.js`: separa la serie en repeticiones (común a todos los ejercicios).
- `js/pose.js`: MediaPipe Pose en el navegador; recorre el video cuadro a cuadro.
- `js/geometria.js`: ángulos del cuerpo a partir de los puntos del esqueleto.
- `js/sentadilla.js`, `js/peso-muerto.js`: revisan cada repetición de su ejercicio.
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
npm test        # lógica de cada ejercicio, con esqueletos sintéticos
MODELO_POSE=pose_landmarker_full.task VIDEO=sentadilla.webm npm run test:e2e   # la app entera en Chromium
EJERCICIO="Peso muerto" MODELO_POSE=pose_landmarker_full.task VIDEO=peso-muerto.webm npm run test:e2e
```

La prueba de punta a punta usa MediaPipe de `node_modules` y el modelo de un
archivo local (se baja de la [página de MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker#models)).
Chromium sin códecs propietarios no lee H.264: convertir el video a `.webm`.
