# El Santo Oficio de Cuyo — diseño acordado (decimocuarta aventura)

Continuación directa de *La Merced de las Ánimas*. **Estado: diseño aprobado,
contenido sin escribir.** Este archivo existe para que las decisiones no
dependan de una conversación; cuando la aventura se publique, pasa a ser una
entrada de `ROADMAP.md` y esto se archiva.

Punto de partida de las ideas: `aventura13.md` (borrador de otra IA, sin
acceso al canon). Lo aprovechable está abajo; lo que chocaba con el canon se
corrigió (ver «Correcciones»).

## Forma

- **Catálogo:** `cuando: '1930-02-10'` (misma fecha que Zonda y Merced, para
  que la Exposición no decaiga), `requiere: ['la-merced-de-las-animas']`,
  `continuacion: true`.
- **Duración en ficción:** 2-3 semanas desde el amanecer siguiente.
- **Tamaño:** ~28 lugares, tres actos.
- **Dos aperturas que convergen**, según el final de Merced:
  - `firmar-actas` (Iglesia): amanecer en el zanjón, con Fray Ignacio.
    Sospecha inicial 35.
  - `fuga-final` (huarpe): la misma noche, en el totoral, con Takillpa y la
    Rastrillería atrás. Sospecha inicial más baja, pero con persecución
    activa (otro tipo de presión, no el mismo número).
- **Acto I (días 1-3), cada rama en su mundo.** Iglesia: convento de Santo
  Domingo, cripta, archivo. Huarpe: totorales, ranchada, altar del sauce.
- **Acto II (días 4-12), cazado por las dos partes.** Villa de San Juan
  (Cabildo, cárcel, pulpería, casa de Josefa Sosa) y las lagunas. Las ramas SE
  CRUZAN acá: la Iglesia puede llegar a Takillpa y los huarpes a Fray Ignacio.
  Escena central: interrogatorio/juicio con el medidor de sospecha y riesgo
  real de hoguera.
- **Acto III (días 13-18): Hualilán.** Campamento, bocamina, socavón, cripta
  de la veta, núcleo del yacimiento. El ingrediente para reforzar el sello es
  algo de la geología real (caliza, almagre, plata), NO un «metal primordial».

## Mecánicas nuevas (ya construidas, commit `0396572`)

- **Sospecha 0-100**, visible en la ficha. `efecto.sospecha`,
  `{op:'sospecha'}`. Llegar a 100 = hoguera: `bloqueoDecision` + un desenlace
  con esa condición. No cruza entre aventuras.
- **Kit de 1930**: `it-encendedor-1930`, `it-reloj-pulsera`, `it-linterna-1930`
  (`scenario/kit1930.ts`). Cada uso delante de españoles sube la sospecha —eso
  lo decide cada escena, no el ítem: *el encendedor ~+15, el reloj ~+20, la
  linterna ~+30* (valores del borrador, a calibrar jugando).
- **Hechizos huarpes**: `manto-de-la-cienaga`, `cantar-de-las-sombras-de-sal`,
  y `cerrarle-el-paso-huarpe` (ya existía).

## Personajes

- **Fray Bartolomé de Albornoz.** Comisario del Santo Oficio de Lima y, a la
  vez, cargo alto del aparato del Círculo Rojo. Nivel igual o superior a
  Bernardo, pero de OTRO tipo: Bernardo lee mal el Umbral; Albornoz sabe que
  es un límite y lo administra. Su poder es de conocimiento e institución,
  no cósmico. **No se pelea de frente**: se lo vence con lógica, sospecha y
  trampas; sólo se lo puede matar si se preparó algo antes.
  - Qué quiere: el investigador es la prueba viva de un futuro que quiere
    explotar. Con sospecha baja y valor mostrado, **te recluta**; con sospecha
    alta o si te negaste, **te usa** como prisionero-oráculo. Lo decide la
    conducta, se ve en escenas, no en un menú.
- **Fray Ignacio de la Cruz.** Agente de menor rango del mismo aparato,
  subordinado de Albornoz. Puede **obedecer, protegerte o morir** (por
  Albornoz o por tu culpa). Lo decide su actitud hacia vos + tres momentos
  clave (protegerlo, mentirle, abandonarlo).
- Takillpa, Josefa Sosa (y el niño zurdo: el linaje del que sale Eusebio),
  Don Gonzalo de Estrada. Nuevos por definir: un alcalde del Cabildo, una
  anciana huarpe de las lagunas, un capataz de Hualilán, un arriero, el
  sargento mayor de la Rastrillería, el prior dominico.

## Las salidas y el regreso

El sello acumula tensión y revienta el 15 de enero de 1944 (guiño al terremoto
real de San Juan). **El jugador llega a la fecha al final del recorrido, no en
el Nodo 01**: se infiere, no se regala tras una tirada.

- **1930, liberación controlada:** aflojar el sello a propósito; el agua se
  pierde de golpe, como en el fenómeno original.
- **1944, dejarlo reventar:** se cruza en el terremoto. La más peligrosa.
- **Quedarse:** reforzar el sello con el ingrediente de Hualilán. Qué pasa con
  el 1944 histórico queda deliberadamente sin resolver (regla de oro del canon).

Cada final deja **consecuencias permanentes** de alcance campaña; las aventuras
siguientes (1944, quedarse, etc.) se escriben después y las leen. Ése es el
«árbol barato»: la ramificación entre aventuras se paga cuando se escribe cada
una, no ahora. El motor ya soporta varias continuaciones
(`siguientesDe`/`requiere`), pero la rama que aparece debe depender de lo que
se hizo (`{op:'consecuencia'}`), no de un menú — es exactamente el error que
hubo con *El Vigésimo* y se corrigió.

Diferencia entre sellos: el almagre (rama Iglesia) se degrada antes y avisa
con temblores; lo grabado (rama huarpe) acumula sin avisar. Ambos llegan a 1944.

## Correcciones al borrador de origen

- Zippo → **encendedor de bencina** (el Zippo es de 1933).
- El cadáver de la mina con un envoltorio de 1930 rompía la excepción de canon
  («el Umbral sólo transporta en San Juan»). Se resuelve haciendo que el
  cuerpo sea **el propio investigador de otro bucle**, no un fraile anónimo.
- «Metal primordial» → algo de la geología real.
- La fecha 1944 no se revela en el Nodo 01.
- Ninguna tirada gatea información con Ocultismo/Geología: para esas
  habilidades (base 0-1, sin asignar en ningún pregenerado) el éxito profundiza
  y el fallo igual da algo (ver «No gatea nada» en `ROADMAP.md`).
- **Lo sellado NO se nombra**: Primer Rostro, Puddock, Archivista, constructores
  del anillo. La identidad del Círculo se muestra por su función administrativa
  («corrige», «inscribe»), como ya hace el resto del catálogo.

## Pendiente de hacer, en orden

1. ~~Recortar los epílogos de Merced que saltan en el tiempo~~ (hecho).
2. Esqueleto de contenido: lugares, NPCs, ítems, final de cada rama.
3. Acto I, rama Iglesia → rama huarpe.
4. Acto II (cruce de ramas, juicio, sospecha).
5. Acto III (Hualilán) y los tres finales con sus consecuencias.
6. `catalogo.ts`, auditoría (`prueba-auditoria.ts`), `prueba:todo`.
7. Jugar las dos aperturas en el navegador.
8. Entrada en `ROADMAP.md`.
