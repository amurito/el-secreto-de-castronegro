# EL SECRETO DE CASTRONEGRO

Motor narrativo interactivo de investigación y horror cósmico. Un **Keeper artificial**, no una novela con IA.

Deriva de: Canon **v0.7** · Operativa del Keeper **v0.8** · Motor **v0.9** · Prompt Maestro **v1.0** · Análisis Técnico **v1.1**.

---

## Empezar

```bash
npm install
npm run dev
```

Abrí **http://localhost:5173**. **Es gratis y no necesita clave de API.**

### Publicarlo en la web, gratis

```bash
npm run build      # deja el sitio en dist/web
```

El resultado es **100% estático**: el motor corre en el navegador del jugador y el log de eventos vive en su IndexedDB. No hay servidor, no hay clave, no hay costo de alojamiento. Subilo a GitHub Pages, Netlify, Cloudflare Pages o un pendrive.

Para GitHub Pages ya está el workflow en `.github/workflows/publicar.yml`: activá **Settings → Pages → Source: GitHub Actions** y cada push a `main` publica. El workflow corre las pruebas antes de publicar y **aborta si el bundle filtra la solución de la aventura**.

Para probar el build estático localmente: `npm run preview` → http://localhost:4173

El juego corre por defecto en **MODO MOTOR**: dados reales, estado real, reglas reales, gates reales, consecuencias reales, guardado real — y el propio motor clasifica la acción libre y compone la narración. No es un modo degradado: es el motor arbitrando solo. Si el juego no funcionara sin la IA, el modelo sería dueño del estado y la arquitectura estaría mal.

Opcionalmente, para que narre Claude:

```bash
cp .env.example .env
# poné tu clave en ANTHROPIC_API_KEY
```

Con clave cambia **quién escribe las oraciones**, nada más. Dados, gates, estado, guardado y auditoría son idénticos en los dos modos.

Comandos:

| | |
|---|---|
| `npm run dev` | servidor + interfaz |
| `npm run build` | sitio estático en `dist/web` |
| `npm run preview` | sirve el build estático, como quedaría publicado |
| `npm run prueba` | prueba de humo del motor, sin servidor ni IA |
| `npm run prueba:libre` | 40 acciones libres: ninguna sin respuesta, ninguna repetida |
| `npm run prueba:cripto` | SHA-256/HMAC propios contra `node:crypto` y vectores NIST |
| `npm run revisar:bundle` | audita que el bundle público no filtre la aventura |
| `npm run prueba:todo` | todo lo anterior |
| `npm run check` | typecheck |

---

## La tesis

Si mañana apagás el modelo de lenguaje, el estado del juego sigue siendo correcto, auditable y jugable. **El código es dueño del estado; el modelo es un cliente del motor** que pide permiso mediante herramientas validadas.

El estado no es un objeto que se muta: es el resultado de plegar un **log de eventos append-only**. Eso convierte ocho reglas de disciplina en una invariante estructural — no hay que confiar en que el modelo no reescriba el pasado, porque *no existe la operación de reescribir el pasado*.

### Lo que el modelo NO puede hacer, por construcción

| | |
|---|---|
| Generar azar que cuente | El RNG es del motor, con cadena HMAC verificable |
| Ver secretos sellados | No entran a su ventana de contexto |
| Revelar una propiedad oculta a voluntad | El motor verifica la condición de descubrimiento |
| Convertir una hipótesis en hecho | Exige 3 pistas, 2 tipos distintos, 0 contradicciones, 1 fuente fiable |
| Tirar dos veces la misma intención | Rechazado; requiere Push explícito |
| Inventar habilidades o NPCs con canon global | El motor asigna IDs y fuerza `CAMPAIGN_CANON` |
| Escribir en el estado | Sólo propone; el motor dispone |

No existen —y no deben existir— las herramientas `set_hp`, `set_san`, `roll_dice`, `edit_past_event`, `reveal_secret` ni `override_roll`. **La ausencia es la garantía.**

---

## Arquitectura

```
src/
  shared/     tipos + eventos + protocolo cliente/servidor
  rules/      CoC 7e + Umbral. PURO: sin I/O, sin azar, sin red
  engine/     event log · RNG · cripto · reducers · gates · herramientas
              store.ts (interfaz) + store.node.ts (JSONL) + store.browser.ts (IndexedDB)
  canon/      v0.7 indexado (truth × disclosure) + invariantes duras
  scenario/   "Agua Quieta" + investigadores
              aguaquieta.keeper.ts ← SPOILERS, sólo lo importa el Keeper IA
  keeper/     intent · narrator · offline (modo motor) · prompt · tool loop · validadores
  app/        api.ts (interfaz) + api.http.ts (servidor) + api.local.ts (navegador)
  server/     Fastify + SSE + sanitización
  web/        React
```

### Cómo corre sin servidor

Tres cambios lo hicieron posible, y ninguno es un parche:

**Criptografía propia y síncrona** (`engine/crypto.ts`). Web Crypto es asíncrono, y el motor de tiradas es síncrono a propósito: `request_roll` compromete la habilidad, tira y devuelve el resultado en una operación indivisible. Volverla async contagiaría todo el reglamento. Un SHA-256/HMAC de 90 líneas, sin dependencias, resuelve el problema y funciona igual en Node y navegador. `npm run prueba:cripto` lo verifica contra vectores NIST y contra `node:crypto` en 1.000 comparaciones: si divergiera, las campañas guardadas dejarían de verificar.

**Almacenamiento intercambiable** (`engine/store.ts`). La interfaz no importa nada de Node ni del navegador; las implementaciones se registran al arrancar. Por eso el bundle del navegador no arrastra `node:fs`. En IndexedDB los eventos se escriben con `add`, no con `put`: **la base de datos misma rechaza sobrescribir un evento pasado**. La invariante "el pasado es de sólo lectura" deja de depender de la disciplina del código.

**Una API, dos implementaciones** (`app/api.ts`). La interfaz reproduce el servidor; `App.tsx` no sabe cuál está usando.

**Regla de dependencias:** `rules` no importa nada · `engine` importa `rules` · `keeper` importa `engine` · **`engine` nunca importa `keeper`**. Si esa flecha se invierte, el modelo pasó a ser dueño del estado.

### Los dos ejes de canon

`truth_level` (qué tan verdadero) × `disclosure` (quién puede saberlo). Ejes independientes, porque un hecho puede ser **canon y secreto a la vez** — la existencia del Primer Rostro es exactamente eso.

`SEALED` es la garantía dura: nunca entra al contexto del modelo. Lo que no está en la ventana no puede filtrarse, ni por prompt injection ni por presión del jugador.

### El modo gratuito: cómo narra el motor

Tres piezas en `src/keeper/`:

**`intent.ts`** descompone lo que escribís en verbo + objetivo + matices, y lo clasifica en las cinco categorías de v0.9 §11: trivial, narrativa, con tirada, imposible, **requiere aclaración**. Esa última existe para que una acción no reconocida no sea un error: es el Keeper pidiendo precisión dentro de la ficción.

**`narrator.ts`** compone la prosa desde el estado, no desde cadenas fijas. Nunca repite el mismo párrafo: `pickVariant` lleva cuenta de lo dicho. La hora, la exposición al Umbral y la estabilidad tiñen las descripciones — a exposición alta el mundo empieza a fallar en el texto.

**`offline.ts`** enruta 30 verbos y ejecuta **exactamente las mismas herramientas validadas** que usaría el Keeper IA.

El escenario aporta la superficie: cada localización tiene **detalles examinables** (el brocal, la roldana, la tierra, el sombrero, la ventana, el barro de la orilla) con su propia tirada, su exposición y su pista. Sin eso, "miro la tierra alrededor del aljibe" no tendría dónde agarrarse.

`npm run prueba:libre` dispara 40 acciones escritas como las escribiría una persona y falla si alguna queda sin respuesta o si dos respuestas salen idénticas.

### RNG verificable

Al crear la campaña se genera una semilla y se te muestra su **SHA-256**. Cada tirada es `HMAC-SHA256(semilla, "roll:" + índice)`. Al cerrar la campaña se revela la semilla y podés recomputar todas las tiradas y verificar el hash.

La semilla se revela sólo al final: antes permitiría predecir las tiradas que faltan.

---

## Ajustar el juego

**Escalas de Exposición y Estabilidad:** todas las constantes están en un único archivo, [`src/rules/umbral.config.ts`](src/rules/umbral.config.ts). Son provisionales. Ningún otro archivo tiene números de Umbral hardcodeados: si algo se siente muy rápido o muy lento, se toca ahí y sólo ahí.

**Costo por turno:** con caché de prompt de 1 hora, ~US$0.06 por turno con Opus 5, ~US$2.40 por sesión de una hora. Sin caché serían ~US$6. La perilla es `KEEPER_EFFORT` en `.env` (`low` a `max`).

**Guardado:** ironman. Un autoguardado por campaña, sin ranuras, en `partidas/<id>/eventos.jsonl`. Es lo único coherente con muerte permanente y "no rebobinar".

---

## Estado

**Funciona:** motor completo · dados D100 con grados, dificultades y dados de bonificación/penalización · las tres variables de cordura · inventario con propiedades ocultas y gates · tablero de investigación · tiempo diegético · muerte permanente con continuidad · consecuencias persistentes · guardado · auditoría del azar · Keeper IA con tool loop y validadores · modo motor.

**Falta (post-MVP):** combate completo · bestiario · magia · los Siete Umbrales · multijugador · mapas · imágenes · Nueva Partida+ · generación procedural · creación de investigador.

## Una limitación honesta del build estático

Si el motor corre en el navegador, **el escenario tiene que estar en el navegador**. Un jugador que abra las herramientas de desarrollo y lea el JavaScript puede spoilearse la aventura. Eso es cierto de cualquier juego offline que existió jamás y no tiene arreglo real: cifrarlo sería teatro, porque la clave también tendría que estar ahí.

Lo que sí se puede hacer, y está hecho: **no enviar lo que no se usa**. El texto que existe sólo para instruir al Keeper IA —la verdad de la aventura, las notas de dirección de cada localización, la lista de lo que está prohibido revelar, la guía con las rutas y los falsos caminos— vive en `scenario/aguaquieta.keeper.ts`, que sólo importa el servidor. En el build estático nadie lo importa y el empaquetador lo descarta entero. `npm run revisar:bundle` lo comprueba, y el workflow de publicación aborta si alguna vez se cuela.

Resultado: para spoilearte hay que leer JavaScript minificado y reconstruir la solución desde los fragmentos de texto del escenario, no simplemente encontrar un párrafo que la explique. En el modo servidor no existe ni ese riesgo, porque el escenario nunca sale de la máquina.

**Pendiente de verificación:** las tablas propietarias de CoC 7e (bonificación de daño, Build, umbral exacto de pifia, pérdidas de SAN por criatura, locura temporal e indefinida) están marcadas con `⚠` en el código. Hay que verificarlas contra el manual licenciado antes de darlas por buenas. El código implementa la **mecánica**; ninguna tabla propietaria se transcribe.

## Lo que la primera aventura NO revela

Por diseño: la identidad del Primer Rostro · la verdad completa del Umbral · la naturaleza de Yog-Sothoth · la historia del anillo. El nombre "agua blanca" aparece una sola vez, en un registro catastral de 1874, y quien lo escribió creía que hablaba de un mineral. Esa es toda la conexión.
