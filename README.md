# EL SECRETO DE CASTRONEGRO

Motor narrativo interactivo de investigación y horror cósmico, para *La Llamada de Cthulhu* 7ª edición. **Determinístico: sin IA, sin servidor y sin cuentas.**

Deriva de: Canon **v0.7** · Operativa **v0.8** · Motor **v0.9** · Análisis Técnico **v1.1**. El canon de la campaña está en [CANON.md](CANON.md).

---

## Empezar

```bash
npm install
npm run dev
```

Abrí **http://localhost:5173**. No hace falta nada más: ni clave, ni cuenta, ni servidor.

### Publicado

**https://amurito.github.io/el-secreto-de-castronegro/**

```bash
npm run desplegar
```

Un comando: corre las pruebas, construye, audita el bundle y publica. **Si algo falla, no publica nada.**

El sitio es **100% estático**: el motor corre en el navegador del jugador y el log de eventos vive en su IndexedDB. No hay servidor, no hay clave, no hay costo de alojamiento.

Para probarlo localmente antes de publicar: `npm run preview` → http://localhost:4173

> El despliegue no usa GitHub Actions porque el token de `gh` no tiene el permiso `workflow`. El workflow está escrito en `.github/workflows/publicar.yml` por si querés pasarlo a CI: `gh auth refresh -s workflow`, commiteá el archivo, y poné **Settings → Pages → Source: GitHub Actions**.

El juego es **determinístico de punta a punta**: dados reales, estado real, reglas reales, gates reales, consecuencias reales, guardado real, y la prosa escrita a mano en el contenido de cada aventura. El motor arbitra y narra solo.

> **Hubo un Keeper que narraba con Claude, y se eliminó** (marzo de 2026). El estado del juego nunca dependió de él —el modelo escribía las oraciones, el motor decidía todo lo demás— así que sacarlo no cambió una sola regla ni un solo desenlace. Lo que se fue con él: el servidor Node, el SDK de Anthropic, la necesidad de una clave, y el cuadro de escritura libre, que sólo aparecía en ese modo. El canon que le servía de contexto se conservó como documento en [CANON.md](CANON.md).
>
> Quedan **botones**: el repertorio lo calcula el motor desde el estado, así que nunca ofrece algo que las reglas todavía no permiten.

Comandos:

| | |
|---|---|
| `npm run dev` | interfaz en modo desarrollo |
| `npm run build` | sitio estático en `dist/web` |
| `npm run preview` | sirve el build estático, como quedaría publicado |
| `npm run prueba` | prueba de humo del motor |
| `npm run prueba:libre` | 40 acciones libres: ninguna sin respuesta, ninguna repetida |
| `npm run prueba:opciones` | 30 turnos: nada ya hecho se reofrece, hay desbloqueos reales |
| `npm run desplegar` | prueba, construye, audita y publica |
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
  scenario/   las seis aventuras + investigadores
              <aventura>.contenido.json ← lugares, NPC, temas, escenas, desenlaces
              <aventura>.logica.ts      ← sólo el `resolver` de cada escena
  keeper/     intent · narrator · offline (el motor que arbitra y narra)
  app/        api.ts (interfaz) + api.local.ts (navegador) + sanitize.ts
  web/        React
```

### Cómo corre sin servidor

Tres cambios lo hicieron posible, y ninguno es un parche:

**Criptografía propia y síncrona** (`engine/crypto.ts`). Web Crypto es asíncrono, y el motor de tiradas es síncrono a propósito: `request_roll` compromete la habilidad, tira y devuelve el resultado en una operación indivisible. Volverla async contagiaría todo el reglamento. Un SHA-256/HMAC de 90 líneas, sin dependencias, resuelve el problema y funciona igual en Node y navegador. `npm run prueba:cripto` lo verifica contra vectores NIST y contra `node:crypto` en 1.000 comparaciones: si divergiera, las campañas guardadas dejarían de verificar.

**Almacenamiento intercambiable** (`engine/store.ts`). La interfaz no importa nada de Node ni del navegador; las implementaciones se registran al arrancar. Por eso el bundle del navegador no arrastra `node:fs`. En IndexedDB los eventos se escriben con `add`, no con `put`: **la base de datos misma rechaza sobrescribir un evento pasado**. La invariante "el pasado es de sólo lectura" deja de depender de la disciplina del código.

**Una sola API** (`app/api.ts`). Hubo dos implementaciones —una contra el servidor, otra en la pestaña— y quedó la local cuando se eliminó el servidor.

**Regla de dependencias:** `rules` no importa nada · `engine` importa `rules` · `keeper` importa `engine` · **`engine` nunca importa `keeper`**. La flecha se mantiene: quien narra depende del estado, nunca al revés.

### Los dos ejes de canon

`truth_level` (qué tan verdadero) × `disclosure` (quién puede saberlo). Ejes independientes, porque un hecho puede ser **canon y secreto a la vez** — la existencia del Primer Rostro es exactamente eso.

Lo marcado `SEALED` no se escribe en el contenido de ninguna aventura publicada, y `npm run revisar:bundle` lo comprueba antes de publicar. Ver [CANON.md](CANON.md).

### Las acciones

El juego se juega **eligiendo acciones**, no escribiendo. La lista sale del motor, no de una tabla fija por lugar, y responde a tres reglas ([`scenario/acciones.ts`](src/scenario/acciones.ts)):

1. **Una acción que ya dio su resultado desaparece.** Si mirar el brocal reveló la marca de nivel, deja de ofrecerse. Pero si la tirada de Descubrir *falló*, la acción sigue ahí: reintentar es correcto, y es lo que haría cualquiera en la mesa.
2. **Se desbloquean desde el estado.** Mirar la roldana abre preguntarle a Rosa por la soga. Ver la figura en la placa —y tener las dos fotografías a mano— abre compararlas. Examinar las pisadas abre bajar al aljibe. Las recién desbloqueadas se marcan con ◆.
3. **Las repetibles cambian de etiqueta** según lo que ya descubriste, para que insistir se sienta como insistir.

Tres familias se generan solas desde el estado —detalles sin mirar, objetos que se pueden levantar, salidas—, así que agregar un detalle al escenario alcanza para que aparezca como opción.

**No hay escritura libre, a propósito.** El repertorio del motor lo define el contenido de cada aventura, así que un cuadro de texto prometería una libertad que no hay. Los botones salen del estado: nunca ofrecen algo que las reglas todavía no permiten.

`npm run prueba:opciones` juega 30 turnos y falla si alguna acción se ofrece con su condición de "hecha" ya cumplida, si no hay desbloqueos, o si la lista deja de cambiar.

### Cómo narra el motor

Tres piezas en `src/keeper/`:

**`intent.ts`** descompone la intención de cada botón en verbo + objetivo + matices, contra una tabla de ~31 verbos con sus raíces en español. Es una lista cerrada y a mano: un verbo que no está ahí no se reconoce. `npm run prueba:auditoria` comprueba que las intenciones de todos los temas de conversación de las seis aventuras clasifiquen bien — un bug real, encontrado escribiendo la sexta y presente en dos aventuras ya publicadas.

**`narrator.ts`** compone la prosa desde el estado, no desde cadenas fijas. Nunca repite el mismo párrafo: `pickVariant` lleva cuenta de lo dicho. La hora, la exposición al Umbral y la estabilidad tiñen las descripciones — a exposición alta el mundo empieza a fallar en el texto.

**`offline.ts`** enruta los verbos y ejecuta las herramientas validadas del motor: las mismas que registran eventos, tiran dados y mueven el estado.

El escenario aporta la superficie: cada localización tiene **detalles examinables** (el brocal, la roldana, la tierra, el sombrero, la ventana, el barro de la orilla) con su propia tirada, su exposición y su pista. De ahí salen solos los botones de "mirar X de cerca".

`npm run prueba:libre` dispara 40 acciones escritas como las escribiría una persona y falla si alguna queda sin respuesta o si dos respuestas salen idénticas. Es la red que sostiene el clasificador.

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

**Funciona:** motor completo · dados D100 con grados, dificultades y dados de bonificación/penalización · las tres variables de cordura · inventario con propiedades ocultas y gates · tablero de investigación · tiempo diegético · muerte permanente con continuidad · consecuencias persistentes · guardado · auditoría del azar · seis aventuras encadenadas.

**Falta (post-MVP):** combate completo · bestiario · magia · los Siete Umbrales · multijugador · mapas · imágenes · Nueva Partida+ · generación procedural · creación de investigador.

## Una limitación honesta del build estático

Si el motor corre en el navegador, **el escenario tiene que estar en el navegador**. Un jugador que abra las herramientas de desarrollo y lea el JavaScript puede spoilearse la aventura. Eso es cierto de cualquier juego offline que existió jamás y no tiene arreglo real: cifrarlo sería teatro, porque la clave también tendría que estar ahí.

Lo que sí se puede hacer, y está hecho: **no enviar lo que no se usa**. `npm run revisar:bundle` audita el JavaScript publicado y aborta el despliegue si encuentra la verdad de una aventura, la lista de lo sellado o cualquier otro texto que el jugador no debería poder leer sin jugar.

Resultado: para spoilearte hay que leer JavaScript minificado y reconstruir la solución desde los fragmentos de texto del escenario, no simplemente encontrar un párrafo que la explique.

**Pendiente de verificación:** las tablas propietarias de CoC 7e (bonificación de daño, Build, umbral exacto de pifia, pérdidas de SAN por criatura, locura temporal e indefinida) están marcadas con `⚠` en el código. Hay que verificarlas contra el manual licenciado antes de darlas por buenas. El código implementa la **mecánica**; ninguna tabla propietaria se transcribe.

## Lo que la primera aventura NO revela

Por diseño: la identidad del Primer Rostro · la verdad completa del Umbral · la naturaleza de Yog-Sothoth · la historia del anillo. El nombre "agua blanca" aparece una sola vez, en un registro catastral de 1874, y quien lo escribió creía que hablaba de un mineral. Esa es toda la conexión.
