# El Santo Oficio de Cuyo — diseño acordado (decimocuarta aventura)

Continuación directa de *La Merced de las Ánimas* (noviembre de 1710: la Merced arranca el 3 y ésta, el amanecer del 4). **Estado: diseño aprobado,
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
- **Tamaño:** 27 lugares, tres actos (el esqueleto los detalla).
- **Arranque único:** las dos ramas empiezan en el mismo lugar (`zanjon`); una
  escena de apertura lee el final de Merced, fija la sospecha inicial y manda a
  cada una a su mundo. El motor sólo admite un `startLocation`.
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
- **Acto III (días 13-18): La Labor Vieja.** Campamento de cateadores, boca de la labor,
  socavón de los peones de mita, tiro de ventilación, cámara de los antiguos y el
  filón. **Hualilán se descartó**: no era mina en 1710 (fue estancia ganadera hasta
  que un arriero la descubrió en 1751). La Labor Vieja es ficticia y se apoya en
  geología real: las calizas ordovícicas de la Precordillera sanjuanina, con plata
  nativa y calcita. El ingrediente que refuerza el sello sale de ahí, NO es un
  «metal primordial».

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
  anciana huarpe de las lagunas, un capataz de la Labor Vieja, un arriero, el
  sargento mayor de la Rastrillería, el prior dominico.

## Las salidas y el regreso

El sello acumula tensión y revienta el 15 de enero de 1944 (guiño al terremoto
real de San Juan). **El jugador llega a la fecha al final del recorrido, no en
el Nodo 01**: se infiere, no se regala tras una tirada.

- **1930, liberación controlada:** aflojar el sello a propósito; el agua se
  pierde de golpe, como en el fenómeno original.
- **1944, dejarlo reventar:** se cruza en el terremoto. La más peligrosa.
- **Quedarse:** reforzar el sello con el ingrediente de la Labor Vieja. Qué pasa con
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
2. ~~Esqueleto de contenido~~ (hecho): `src/santo-oficio.esqueleto.json` — 27 lugares,
   12 NPCs, escalones de sospecha, los tres destinos de Ignacio, los caminos de
   Albornoz, 5 desenlaces y las consecuencias que dejará. Se ve en el mapa
   (`npm run mapa`, clic en el nodo punteado). Los nombres ya salen de fuentes de época (ver «Ajustes»); los
   nombres de pila son inventados a propósito. Ítems y tiradas: ya propuestos en el esqueleto
   (7 ítems propios, 10 tiradas clave); falta que los apruebes.
3. Acto I: **las dos ramas escritas**. Huarpe: barro con tirada de sigilo, altar del sauce (tres ofrendas o quedarse con el metal, y el Manto), espionaje a Ledesma, descanso en la isla, ranchada con 6 temas y el cantar, y la rastrillería encima a 60+ (se cierran las salidas: fuga por el agua o combate real). Iglesia: (`santooficio.contenido.json` + `.logica.ts`, suite `prueba-santo-oficio.ts`: interrogatorio de 3 preguntas, encierro y dos salidas, archivo, primer momento con Ignacio, hoguera). 5. Acto III (La Labor Vieja) y los tres finales con sus consecuencias.
6. `catalogo.ts`, auditoría (`prueba-auditoria.ts`), `prueba:todo`.
7. Jugar las dos aperturas en el navegador.
8. Entrada en `ROADMAP.md`.

## Ajustes tras la revisión (2026-09-21)

Aplicados desde los comentarios de una segunda lectura, más una investigación de
época. El detalle vive en `src/santo-oficio.esqueleto.json` y se ve en el mapa.

- **Sospecha en la rama huarpe = cerco, no interrogatorio.** Un solo medidor con
  dos tablas de consecuencias: la Iglesia dispara interrogatorios al cruzar 35 y
  60; los huarpes disparan cerco y fugas anticipadas (20 rastro fresco, 40 cerco,
  60 encima, 85 capturado). En la villa rige la tabla de la villa.
- **Cada salida necesita una cadena de pistas alcanzable.** 1930: lo vivido en
  Zonda + el legajo de Ignacio. 1944: DOS fuentes independientes (pinturas de la
  cueva + intervalos de temblores medidos con el reloj). Quedarse: la técnica de
  grabado de la anciana + el filón.
- **Ocultismo/Geología no entregan el plazo.** El fallo da el dato básico (la
  piedra tiene fisuras por presión); el éxito, el mecanismo (la presión se
  acumula). El «poco más de dos siglos» se deduce cruzando fuentes: si una tirada
  lo diera, regalaría la fecha del 1944. Tratar el terremoto real con seriedad.
- **Josefa y el niño zurdo, acotado.** No se toca la costumbre de «corregir» al
  zurdo (ya publicada en 1926). Sólo se elige cómo relacionarse con el niño, y se
  guarda como consecuencia que únicamente una aventura posterior puede leer.
- **Reclutamiento.** Da: salvoconducto (tope de sospecha 30), acceso a un archivo
  del aparato, pesos y una mula, y un hechizo. Cuesta: Mitos +4 (permanente),
  Cordura por cada colaboración y una fobia o manía al tercer acto, una
  consecuencia de campaña (el aparato lo tiene anotado) y cierra «quedarse».
- **Nombres.** Apellidos documentados en Cuyo (Videla, Oro, Quiroga, Lucero,
  Sayanca) con nombres de pila inventados, para no tocar a ninguna persona real.
  Los comisarios reales de Cuyo (Corbalán, Peláez) no se usan. Cuyo dependía de la
  Capitanía General de Chile y, en lo inquisitorial, del tribunal de Lima.

## Estado de la rama huarpe del Acto I (2026-09-21)

- **La sospecha en las lagunas se paga con el cerco**: a 60 o más se cierran las
  salidas de la zona y sólo quedan escabullirse (orientarse difícil: −20 si sale,
  +25 si falla) o enfrentar a un rastreador (combate real). A 85 o más debería
  llevar a la cárcel del Cabildo: **eso es del Acto II y todavía no está**.
- **Ofrendar el reloj cuesta una de las dos fuentes del 1944** (los intervalos de
  temblores se miden con él). Es a propósito: obliga a completar la fecha con las
  pinturas de la cueva y el legajo de Santo Domingo, o sea a cruzar de rama.
- **Bug de contenido encontrado jugándolo**: un lugar llamado «La laguna baja»
  rompía el movimiento, porque el botón dice «Voy a la laguna baja» y el
  clasificador lee «baja» como el verbo *bajar*. Se renombró «La laguna somera».
  Los nombres de lugar no deben contener verbos de acción.
- Cruces de rama pendientes del Acto II: `ranchada → iglesia-matriz` y
  `sd-huerta → cueva-pinturas` (conexiones ocultas por contacto).

## Estado del Acto II (2026-09-21)

Escrito y probado (`prueba-santo-oficio.ts`): la plaza y sus lugares, el juicio
del Cabildo, la cárcel, la oferta de Albornoz y los dos cruces entre ramas.

- **El juicio abre el Acto III.** El camino del piedemonte está cerrado (en las
  dos direcciones, también desde la cueva) hasta que se concluye el juicio ante
  el Cabildo. Tres argumentos: defenderse (persuasión difícil), acusar al
  Comisario (extrema; sólo si se vio su libro) o callar (+10, sin tirada). Cada
  apoyo previo —Ignacio, el testimonio de Don Gonzalo, la intercesión del
  prior— es un dado de bonificación; cada cosa dicha de más, una penalización.
- **Preso.** A 85–99 de sospecha se cierran todas las calles y sólo queda
  «dejar que te detengan» (100 es la hoguera y deja sólo los desenlaces). La
  cárcel se abre por soborno (bolsa comprada en la pulpería), fuga, o esperando:
  Ignacio con una orden si lo tenés a favor, si no, Albornoz te saca para
  llevarte a la sierra. Nunca queda sin salida.
- **Reclutar o usar.** Con sospecha ≤ 50 y algo del futuro mostrado, Albornoz
  ofrece reclutar. Aceptar entrega el salvoconducto y cuesta Mitos +4 (el techo
  de Cordura baja 4 para siempre) y 1 de Cordura; rechazar sube la sospecha y
  pasa a «te usa». El hechizo «Corregir la mano» **no está escrito todavía**
  (sólo se lo menciona): queda para el Acto III.
- **Cruces.** `ranchada ↔ iglesia-matriz` se abre con el contacto de Takillpa
  (la puerta lateral que deja el prior Anselmo); `sd-huerta ↔ cueva-pinturas`, con
  el de Ignacio (el sendero de las acequias).
- **Cueva de las pinturas.** Siete rayas de almagre: la primera fuente del 1944.
  La tirada de Ocultismo sólo agrega el mecanismo (lo que se cierra se junta); la
  cuenta de las rayas se entrega salga o no.
- **Josefa.** Padrino oculto o alejarse: sólo una consecuencia de campaña.
- **Motor.** Nuevo efecto de escena `llevaA` (movimiento forzado, sin conexión)
  para la detención. Y se cerró un agujero de la economía: el botón «Llevarte…»
  ofrecía gratis lo que un comerciante vende; ahora sólo se compra.
- **Trampa del clasificador**: una escena cuya frase empieza con un verbo de
  soltar o tomar sobre un ítem (`Dejo una limosna…`) pierde contra el genérico si
  no declara `tambienAlAgarrar`.

## Estado del Acto III (2026-09-21) — el contenido está completo

Escrito y probado (`prueba-santo-oficio.ts`, ~190 comprobaciones): La Labor Vieja
de punta a punta y los desenlaces. **Sin pendientes de contenido.**

- **Entrar al real:** salvoconducto, escolta del Comisario, fuego sin pedernal
  (+15) o colarse de noche (sigilo difícil; si falla te llevan ante Albornoz).
- **La boca:** forzar (mecánica difícil), o pólvora (se gasta, +25). El conducto
  siempre está. **El socavón:** motín (persuasión difícil; el cantar da un
  dado), pasar de largo, combatir a los guardias o sobornar al capataz.
- **La cámara de los antiguos:** el cuerpo con ropa de 1930 y la libreta con la
  letra del investigador («Cerré yo también»). Cordura −3. Es el bucle de otro
  —o el propio futuro—: nada lo confirma ni lo niega.
- **El filón:** la Sombra se aparta con la luz de 1930 (linterna +20 de
  sospecha, encendedor +10) o se pelea de verdad. La plata sale limpia o impura
  (el cantar da un dado; el fallo también la entrega: no gatea).
- **Ignacio (M3)** según su actitud: ≥20 te protege, 5–19 intenta protegerte y
  muere, <5 te entrega.
- **Albornoz nunca se pelea de frente** y hay que resolverlo para salir del
  filón: muere (volar el filón con mecha larga, mecánica difícil), huye (lo
  exponés sin peones amotinados), es expuesto ante los suyos (lo exponés con los
  peones amotinados) o se sale con la suya (le entregás la plata).
- **La fecha del 1944** se calcula en el zanjón con DOS fuentes independientes:
  las siete rayas de la cueva y (los temblores medidos con el reloj o las fechas
  del legajo). Con el reloj sale «el 15 de enero de 1944»; sin él, «un enero de
  1944, hacia mediados». Ninguna tirada la entrega.
- **Los cinco desenlaces**, con consecuencias de campaña que las aventuras
  siguientes leerán: aflojar el sello (1930), dejar que reviente (1944, en el
  terremoto real), reforzar el sello (quedarse; imposible para quien aceptó ser
  agente), morir en la mina, y la hoguera. Cada epílogo se compone según lo que
  pasó con Albornoz, Ignacio y el hijo de Josefa.
- **Hechizo nuevo:** «Corregir la mano» (lo enseña Albornoz al reclutar).

### Cuatro bugs de nombres de lugar (y un chequeo que ya los ata)

El clasificador no distingue a qué lugar apunta «Voy a X» si dos lugares
comparten un nombre o un alias. Aparecieron cuatro veces: «La laguna baja»
(«baja» leído como el verbo *bajar*), «huerta y ventilación» (alias que chocaba
con «El conducto de ventilación»), seis lugares que empezaban con «La Labor
Vieja:», y aliases repetidos entre `zanjon`/`zanjon-sellado`,
`camino-villa`/`camino-piedemonte`, `ranchada`/`labor-campamento`. La suite
ahora falla si un nombre o alias se repite entre lugares.

### Lo que falta para publicarla

1. Registrarla en `catalogo.ts` (`requiere: ['la-merced-de-las-animas']`,
   `continuacion: true`, fecha `1930-02-10`) y correr `prueba-auditoria.ts`
   sobre ella con el resto.
2. Jugarla en el navegador, las dos aperturas de punta a punta.
3. Calibrar la sospecha jugando (los valores +10/+15/+20/+25 son de borrador).
4. Entrada en `ROADMAP.md` y borrar `santo-oficio.esqueleto.json`.
