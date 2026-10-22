# Técnica Gym

Web app que corrige la técnica en el gimnasio: te grabás haciendo el
ejercicio con el celular y te dice qué corregir, repetición por repetición.
Por ahora: **sentadilla**, **peso muerto**, **flexiones de brazos** y **estocadas**.

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

## Qué revisa en las flexiones de brazos

Desde una toma de costado y con el celular bajo; las repeticiones se cuentan con la flexión de codo.

| Error | Cómo se mide | Umbral |
|---|---|---|
| Cadera caída | Cadera respecto de la línea hombro-tobillo (cuartil de la repetición) | más de 15° por debajo |
| Cadera muy arriba | Ídem | más de 20° por encima |
| Poca profundidad | Flexión de codo abajo de todo | menos de 75° |
| No estirás los brazos arriba | Flexión de codo arriba de todo | más de 25° |
| Cabeza colgando | Oreja respecto de la prolongación cadera-hombro (mediana) | más de 30° hacia abajo |

Los umbrales están en `js/flexiones.js` (`UMBRALES`). No revisa los codos
abiertos hacia los costados (no se ve de costado) ni las flexiones con las
rodillas apoyadas.

## Qué revisa en las estocadas

Desde una toma de costado, con las dos piernas a la vista; la pierna de
adelante es la que tiene el tobillo más adelante, así que sirve alternando
piernas. Las repeticiones se cuentan con la flexión de la rodilla de adelante.

| Error | Cómo se mide | Umbral |
|---|---|---|
| Poca profundidad | Flexión de la rodilla de adelante abajo de todo | menos de 75° |
| Rodilla muy adelante | Tibia de adelante respecto de la vertical | más de 30° |
| Torso inclinado | Tronco respecto de la vertical abajo de todo | más de 25° |

Los umbrales están en `js/estocadas.js` (`UMBRALES`). No revisa la rodilla
que se va hacia adentro (no se ve de costado).

## Qué revisa en las dominadas

Colgado de una barra, filmado de costado con la barra, las manos y los pies a
la vista; las repeticiones se cuentan con la flexión de codo.

| Error | Cómo se mide | Umbral |
|---|---|---|
| No pasás la barbilla | Nariz respecto de las manos (la barra) arriba de todo; sin la cara, flexión de codo | menos de 0,15 largos de tronco por encima / menos de 120° |
| No estirás los brazos abajo | Flexión de codo al terminar la repetición | más de 25° |
| Te balanceás | Cuánto va y viene el tronco, o cuánto suben las rodillas | más de 20° / cadera doblada más de 45° |
| Te dejás caer | Tiempo de bajada | menos de 0,8 s |

Los umbrales están en `js/dominadas.js` (`UMBRALES`). No revisa los hombros
que suben hacia las orejas (las escápulas): de costado no se distingue bien.

## Qué revisa en el press de banca

Acostado en banco plano con barra, filmado de costado a la altura del banco;
las repeticiones se cuentan con la flexión de codo.

| Error | Cómo se mide | Umbral |
|---|---|---|
| Despegás la cola del banco | Cuánto sube la cadera respecto de los hombros, comparado con el principio de la repetición | más de 0,12 largos de tronco |
| No llegás al pecho | Flexión de codo abajo de todo | menos de 75° |
| No estirás arriba | Flexión de codo al terminar la repetición | más de 25° |
| Bajás de golpe | Tiempo de bajada | menos de 0,6 s |

Los umbrales están en `js/press-banca.js` (`UMBRALES`). No revisa los codos
abiertos a 90° ni la barra torcida (se ven de frente o desde arriba).

## Qué revisa en el press militar

Parado, con barra, filmado de costado con la barra arriba de la cabeza a la
vista; las repeticiones se cuentan con la extensión del codo (sube al empujar).

| Error | Cómo se mide | Umbral |
|---|---|---|
| Te tirás hacia atrás | Torso respecto de la vertical (p10 de la repetición) | más de 12° hacia atrás |
| Usás las piernas | Cuánto se doblan las rodillas en la repetición | más de 15° |
| No estirás arriba | Flexión de codo arriba de todo | más de 20° |
| No bajás hasta los hombros | Manos sobre los hombros al terminar la repetición | más de 0,3 largos de tronco |
| La barra termina adelante | Manos respecto de la mitad del pie, arriba de todo | más de 0,25 largos de tronco adelante |

Los umbrales están en `js/press-militar.js` (`UMBRALES`). No revisa los codos
abiertos ni la barra torcida (se ven de frente).

## Qué revisa en el hip thrust

Con la espalda apoyada en un banco, la barra sobre la cadera y los pies en el
piso; las repeticiones se cuentan con cuánto sube la cadera (90° menos su
desvío de la línea hombro-rodilla, que sigue subiendo aunque pase la línea).
Todo se mide arriba de todo, salvo la bajada.

| Error | Cómo se mide | Umbral |
|---|---|---|
| No extendés la cadera | Cadera respecto de la línea hombro-rodilla | más de 15° por debajo |
| Subís la cadera de más | Ídem | más de 15° por encima |
| Pies muy cerca / muy lejos | Tibia respecto de la vertical | más de 20° adelante / atrás |
| Bajás de golpe | Tiempo de bajada | menos de 0,6 s |

Los umbrales están en `js/hip-thrust.js` (`UMBRALES`). No revisa la zona
lumbar arqueada por su cuenta (sí la cadera que sube de más) ni las rodillas
hacia adentro.

## Qué revisa en el curl de bíceps

Parado, con mancuernas o barra, filmado de costado; las repeticiones se
cuentan con la flexión de codo (del brazo del lado de la cámara).

| Error | Cómo se mide | Umbral |
|---|---|---|
| Te balanceás | Cuánto va y viene el tronco en la repetición | más de 10° |
| Llevás el codo adelante | Brazo (hombro-codo) respecto del tronco | más de 25° adelante |
| No subís del todo | Flexión de codo arriba de todo | menos de 110° |
| No estirás los brazos abajo | Flexión de codo al terminar la repetición | más de 30° |
| Bajás de golpe | Tiempo de bajada | menos de 0,8 s |

Los umbrales están en `js/curl.js` (`UMBRALES`). No revisa las muñecas
dobladas ni si un brazo trabaja más que el otro.

## Qué revisa en el remo

El remo se hace de varias formas, así que en el inicio "Remo" lleva a elegir
la forma (`js/remo.js`), igual que los abdominales. Si el video parece de
otra forma, el resultado lo avisa: parado (muslos casi verticales) es con
barra; sentado con las rodillas bien dobladas, la máquina; sentado con las
piernas más estiradas, la polea. En las tres las repeticiones se cuentan con
la flexión de codo.

| Forma | Error | Cómo se mide | Umbral |
|---|---|---|---|
| Todas | Poco recorrido | Flexión de codo al tirar | menos de 75° |
| | No estirás los brazos | Flexión de codo al volver | más de 30° |
| Con barra | Torso muy erguido | Torso respecto de la vertical (mediana de la repetición) | menos de 30° |
| | Usás impulso con el torso | Cuánto se mueve el torso en la repetición | más de 15° |
| En polea | Te tirás hacia atrás | Torso al tirar, respecto de la vertical | más de 15° hacia atrás |
| | Te balanceás | Cuánto se mueve el torso en la repetición | más de 25° |
| En máquina | Despegás el pecho del apoyo | Cuánto se mueve el torso en la repetición | más de 10° |
| | Soltás el peso de golpe | Tiempo de vuelta | menos de 0,6 s |

Sentado, "adelante" se toma hacia el lado de los pies (los pies apuntan para
arriba y no sirven). No revisa la espalda redondeada ni los codos abiertos.
Todavía no están el remo con mancuerna a una mano ni el remo al mentón.

## Qué revisa en los abdominales

Hay muchas variantes y cada una se hace distinto, así que en el inicio
"Abdominales" lleva a elegir la variante, y cada una tiene su tutorial y su
análisis (`js/abdominales.js`). Si el video parece de otra variante, el
resultado lo avisa y ofrece analizarlo como esa, sin volver a procesar el
video. La variante se reconoce por lo que se mueve: el tronco (encogimiento o
abdominal completo, según cuánto sube), las piernas (elevación si van
estiradas, crunch inverso si van dobladas) o nada (plancha).

| Variante | Error | Cómo se mide | Umbral |
|---|---|---|---|
| Encogimiento | Tirás del cuello | Cabeza doblada hacia el pecho respecto del tronco | más de 35° |
| | Despegás los pies | Cuánto suben los tobillos respecto de la cadera | más de 0,3 largos de tibia |
| | Muy rápido, con impulso | Duración de la repetición | menos de 1 s |
| Abdominal completo | No llegás arriba | Tronco respecto del piso arriba de todo | menos de 60° |
| | Despegás los pies | Igual que en el encogimiento | más de 0,3 largos de tibia |
| | Muy rápido, con impulso | Duración de la repetición | menos de 1,5 s |
| Elevación de piernas | Doblás las rodillas | Flexión de rodilla | más de 30° |
| | Poco recorrido | Muslo respecto del piso arriba de todo | menos de 70° |
| | Bajás de golpe | Tiempo de bajada | menos de 0,8 s |
| Crunch inverso | La cadera no se despega | Ángulo tronco-muslo arriba de todo | menos de 120° de flexión |
| | Estirás las piernas | Flexión de rodilla | menos de 60° |
| | Muy rápido, con impulso | Duración de la repetición | menos de 1,2 s |
| Plancha | Cadera caída / muy arriba | Cadera respecto de la línea hombro-tobillo | más de 15° abajo / 20° arriba |
| | Cabeza colgando | Cabeza respecto de la línea del cuerpo | más de 30° |

La plancha no tiene repeticiones: se mide cuánto se aguanta (la plancha más
larga del video, de al menos 3 s). Ninguna variante revisa si la zona lumbar
se despega del piso (el modelo no tiene puntos en la columna); las de giro
(bicicleta, oblicuos, russian twist) no se ven de costado y no se revisan.
Los umbrales son un punto de partida y los está revisando un kinesiólogo; la
app lo avisa en cada tutorial.

## Cómo se recorre el video

`js/pose.js` salta por el video a 15 cuadros por segundo (`currentTime` y el
evento `seeked`) y analiza cada cuadro. En iPhone (Safari, y Chrome, que usa
el mismo motor) hay que cuidar dos cosas:

- El video tiene que estar en la página y visible para el navegador: con
  `display: none` no carga cuadros. Mientras se analiza, `app.js` lo pasa a un
  lugar fijo y transparente, y antes de empezar se lo reproduce y pausa una
  vez (sin sonido) para que cargue.
- Si un salto no avisa en 4 s, se pasa al plan B: reproducir el video y, en
  cada cuadro a analizar, pausar, analizar y seguir. Da los mismos
  resultados; `SIN_SALTOS=1 npm run test:e2e` lo prueba simulando un
  navegador que nunca avisa al saltar.

## Suavizado y modo preciso

Antes de calcular ángulos, `js/suavizado.js` limpia los puntos del modelo:
rellena los huecos de hasta 0,3 s (cuando el modelo pierde a la persona unos
cuadros) interpolando entre el cuadro anterior y el siguiente, y suaviza el
temblor con un promedio triangular de ±0,07 s (±1 cuadro a 15 cuadros/s).
Como se analiza el video entero, no atrasa nada.

En el tutorial se elige el modo de análisis (se recuerda en el celular):

| Modo | Modelo | Cuadros por segundo | Tiempo |
|---|---|---|---|
| Rápido (por defecto) | `pose_landmarker_full` (~9 MB) | 15 | 1× |
| Preciso | `pose_landmarker_heavy` (~30 MB) | 30 | ~4× |

## Cámara de costado o en diagonal

La cámara no tiene que estar justo de costado. Además de los puntos en la
imagen, MediaPipe devuelve los mismos 33 puntos en 3D, en metros y centrados
en la cadera (`worldLandmarks`). Con ellos `prepararCuadros` (geometria.js):

1. Calcula el eje izquierda-derecha del cuerpo (caderas y hombros, en el
   piso) y de ahí el ángulo de la cámara: 0° = de costado, 90° = de frente.
2. Hasta 25° usa los puntos de la imagen, como siempre: de costado son los
   más precisos.
3. Con más ángulo arma una **vista de costado virtual**: proyecta los puntos
   3D sobre el plano del cuerpo, que es lo que vería una cámara puesta justo
   al costado, y en la escala de píxeles del video. Todos los análisis
   corren igual sobre esa vista.
4. Desde 70° (casi de frente) avisa que la profundidad se ve mal.

Pruebas: un esqueleto conocido "filmado" a 0°, 30°, 45°, 60° y 80° da los
mismos ángulos (±1°), y una serie de sentadillas da los mismos errores que de
costado (`test/vista-camara.test.mjs`); con la imagen sola, a 60° la rodilla
sale con más de 10° de error. En el video real de sentadilla (de costado) la
app mide la cámara a 7° y usa la imagen; forzando el 3D (`VISTA=3d npm run
test:e2e`) el resultado es el mismo (3 repeticiones, sin errores) con medidas
que difieren unos grados. Falta validarlo con videos reales en diagonal.

## Cómo se separan las repeticiones

`js/repeticiones.js`, común a los tres ejercicios: una repetición arranca
cuando el ángulo del ejercicio (rodilla, cadera o codo) empieza a moverse
desde su mínimo, cuenta si sube al menos `inicioRep` grados, y termina en el
mínimo siguiente, cuando volvió al menos el 60 % y empieza a subir otra vez.
No exige volver exactamente a la posición inicial: así una repetición que
no termina arriba (sin estirar los brazos, sin pararse derecho) igual se
cierra y se marca como error.

## Estructura

- `index.html`, `css/estilos.css`: las pantallas (inicio, tutorial, análisis, resultado).
- `js/app.js`: el recorrido entre pantallas y el resultado.
- `js/ejercicios.js`: los ejercicios de la app (tutorial, errores y análisis de cada uno). Para agregar uno: su módulo de análisis y una entrada acá.
- `js/repeticiones.js`: separa la serie en repeticiones (común a todos los ejercicios).
- `js/pose.js`: MediaPipe Pose en el navegador; recorre el video cuadro a cuadro.
- `js/geometria.js`: ángulos del cuerpo a partir de los puntos del esqueleto.
- `js/sentadilla.js`, `js/peso-muerto.js`, `js/flexiones.js`, `js/estocadas.js`: revisan cada repetición de su ejercicio.
- `js/calidad.js`: si la toma sirve para corregir.
- `js/dibujo.js`: el esqueleto sobre el video (verde = bien, rojo = con errores).

## Versiones

La versión se ve en la app (arriba a la derecha y al pie). Está en
`js/version.js`, en `package.json` y en los `?v=` de `index.html`: el CSS, la
app y cada módulo (con un *import map*) se piden con la versión, así el
navegador baja los archivos nuevos en vez de usar los guardados. Al publicar
cambios hay que subirla en los tres lugares; `npm test` falla si no coinciden
o si falta un módulo en el import map.

| Versión | Cambios |
|---|---|
| 1.0 | Sentadilla |
| 1.1 | Talones medidos con el tobillo; sin revisarlos con poca resolución |
| 1.2 | Peso muerto |
| 1.3 | Flexiones de brazos |
| 1.4 | Diseño nuevo (petróleo y mandarina) y número de versión |
| 1.5 | Estocadas |
| 1.6 | Abdominales; muñequito animado mientras analiza; los títulos no cortan palabras |
| 1.7 | Cinco variantes de abdominales, con aviso si el video parece de otra |
| 1.8 | Dominadas |
| 1.9 | Press de banca |
| 1.10 | Remo: con barra, en polea y en máquina, con aviso si el video parece de otra forma |
| 1.11 | Inicio y elección de variantes en grilla de dos columnas |
| 1.12 | Curl de bíceps |
| 1.13 | Press militar |
| 1.14 | Vista 3D del esqueleto en el resultado (se sacó en 1.15) |
| 1.14.1 | Arreglo para iPhone: el análisis se quedaba en 0 % |
| 1.14.2 | En iPhone, los .mp4 de Archivos se pueden elegir |
| 1.15 | Cámara en diagonal: los ángulos salen del 3D si no está de costado; se saca la vista 3D aparte |
| 1.16 | Hip thrust |
| 1.17 | Suavizado de los puntos y modo de análisis preciso |

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
