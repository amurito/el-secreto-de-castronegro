# Roadmap

Estado: **MVP jugable y publicado.** Una aventura corta, cinco desenlaces, motor
propio sin costo por partida.

## Cómo se ordena esto

Cuatro carriles, y el orden entre ellos importa:

1. **Deuda de credibilidad** — cosas que el juego promete y no cumple. Van
   primero siempre: cada una le enseña al jugador a desconfiar del sistema.
2. **Decisiones tuyas pendientes** — bloqueadas por criterio de diseño, no por
   código. Salen de jugar, no de programar.
3. **Contenido** — más aventura.
4. **Sistema** — lo que hace falta para que el contenido escale.

Regla del proyecto: **nada entra sin una prueba que falle si se rompe.**
`prueba-desenlaces.ts` existe porque dos finales estaban declarados y eran
inalcanzables. `prueba-auditoria.ts` existe porque eso pasó seis veces, y ahora
recorre todo lo declarado en todas las aventuras buscando lo mismo.

---

## 1. Deuda de credibilidad

### 1.1 Hablar no tira dados ✔ HECHO

Cada tema declara su resistencia; la actitud modifica la tirada; insistir sobre
algo esquivado penaliza y cuesta el doble. Un tema cuyo piso de actitud no se
alcanza directamente no se ofrece — ofrecerlo era una trampa que sólo servía
para cobrar paciencia.

**Paciencia** es el presupuesto: preguntar cuesta, salga o no salga, y se
recupera con el tiempo del mundo. Irse y volver más tarde es la manera, que es
lo que haría cualquiera en la mesa.

La conversación pasó a ser **dato**: `src/scenario/aguaquieta.dialogo.ts`. El
resolvedor no sabe quién es Rosa. Lo verifica `prueba-social.ts` armando una
aventura falsa con un tema inventado.

Escalas en `src/rules/social.config.ts`, para ajustar jugando.

### 1.2 Auditoría de alcanzabilidad ✔ HECHA

`prueba-auditoria.ts` recorre **todo** lo que cada aventura declara y verifica
que exista camino: pistas, propiedades ocultas, documentos, secretos,
desenlaces, localizaciones y objetos. Corre sobre el catálogo entero, así que
una aventura nueva queda auditada por existir.

Cierra la fuente de la familia de bug que apareció seis veces —algo declarado
en los datos sin camino real en el código— y de la que una la encontró el
jugador.

Tres capas:
1. **Estática** sobre el mapa y los objetos. Certeza, instantánea.
2. **Banco de escenas.** Las escenas son funciones, así que se las ejecuta con
   la tirada en éxito y en fracaso, contra cada estado y **parado en cada
   localización**, y se recolecta lo que devuelven. Se puede porque el contrato
   de escenas obliga a que los efectos sean declarativos.
3. **Recorrido real**, que agota lo que hay en cada lugar y después camina.

**Y una prueba de la prueba.** Una auditoría que pasa a la primera no demostró
nada: puede estar mirando para otro lado. Al final se le rompen siete cosas a
propósito a una copia del escenario —un lugar sin acceso, una conexión sin
vuelta, un objeto en ninguna parte, un documento huérfano, un desenlace
declarado sin implementar, un secreto que nadie revela, una escena que
explota— y se verifica que las encuentre todas.

### 1.3 Repaso de las tiradas que no existen ✔ HECHO

Medido sobre las dos aventuras: 57 acciones ofrecidas, 27 con tirada y 30 sin.
Entre las que NO tiraban estaban los dos descubrimientos centrales de Agua
Quieta —el reloj sobre el agua y el espejo—, que se conseguían con sólo estar
parado en el patio, mientras examinar una fotografía pedía Descubrir.

**El criterio está escrito en `src/rules/cuando-tirar.ts`:** se tira cuando el
resultado es incierto **y fallar es interesante**. La segunda mitad es la que
se olvida: un fracaso que no deja nada no es un fracaso, es una demora.

Qué cambió:
- El reloj y el espejo piden Descubrir. Ya no alcanza con estar en el lugar.
- Examinar un objeto que esconde algo tras una tirada la pide solo, sin que la
  aventura tenga que escribir una escena. Antes esa propiedad quedaba declarada
  y sin camino — la familia de bug que este proyecto encontró seis veces.
- **Agarrar un objeto ya no dispara la escena de usarlo.** «Leo la libreta» y
  «agarro la libreta» comparten la palabra que importa, así que levantarla del
  suelo disparaba la lectura, con tirada y todo, y el jugador se enteraba de lo
  que decía sin haberla abierto.

Lo que sigue sin tirar, y con razón: agarrar, caminar, esperar, anotar, repasar
el propio tablero, medir con una rueda de agrimensor, preguntar algo que
cualquiera contesta, y gritar hacia un pozo que no devuelve eco.

---

## 2. Decisiones tuyas

### 2.1 Escalas del Umbral ✔ HECHO (la fuga, no la escala)

Medido: jugando a lo ancho, 40 turnos, Exposición 26. Asomándose al aljibe
veinte veces, Exposición 100 y los cuatro umbrales. **La escala no era corta:
una acción repetible entregaba exposición completa cada vez.**

Ahora cada fuente rinde 100% / 50% / 25% / 0% según cuántas veces ya te tocó,
con un piso de 1 mientras siga rindiendo. Las fuentes se identifican con un id
estable (`aljibe:mirar`, `detalle:f-alamos`, `testimonio:npc-rosa:ella`), y el
motor rechaza una exposición sin fuente en vez de tragarla.

Los umbrales quedan en 10/30/55/80: con la fuga tapada no hizo falta moverlos.

Números en `src/rules/umbral.config.ts`. Verificado por `prueba-umbral.ts`, que
juega las tres partidas —estrecha, ancha, exhaustiva— y falla si la estrecha
vuelve a ganarle a la ancha.

**Lo que queda por observar jugando:** una partida exhaustiva da entre 21 y 37
de Exposición según cómo salgan los dados, porque casi todas las fuentes están
detrás de una tirada. Es mucha varianza. Si al jugar se siente arbitrario, la
salida es dar algo de exposición también al fallar —el contacto ocurrió
igual— y no subir los números.

### 2.1-bis Preguntas de escala que siguen abiertas

Con la fuga tapada, las que quedan son de diseño y salen de jugar:

- ¿100 debería alcanzarse en una aventura corta, o ser el techo de una campaña
  entera? Hoy una partida exhaustiva llega a ~37.
- ¿La Estabilidad se recupera con descanso, y cuánto? (Ya tiene respuesta:
  sí, por anclaje, con techo — ver 3.2-ter.)
- **El arrastre entre aventuras ✔ DECIDIDO.** Ampliación de canon aprobada
  explícitamente: la Exposición SÍ decae entre aventuras (meses lejos de un
  Umbral no son descanso cualquiera, pero tampoco son nada), pero nunca por
  debajo de un piso permanente — una fracción del pico histórico que ese
  investigador alcanzó alguna vez (`peakExposure`, que en sí nunca baja).
  Los umbrales cruzados (`thresholdsCrossed`) siguen siendo irreversibles y
  no se tocan. Números en `EXPOSURE_DECAY_PER_MONTH` / `EXPOSURE_FLOOR_FRACTION`
  (`rules/umbral.config.ts`), lógica en `exposicionTrasMeses`/`pisoDeExposicion`
  (`rules/umbral.ts`), aplicado en `heredarInvestigador` (`engine/engine.ts`).
  Verificado por `prueba-campana.ts`.
  **Piso bajado al 10% del pico ✔ AJUSTADO tras jugarlo** (era 50%): con el
  pico en 60, medio piso quedaba en 30 —el propio umbral de RECIPROCIDAD—, así
  que un solo cruce dejaba al investigador «contaminado» de por vida a los
  ojos de esta variable sola, sin que ninguna cantidad de meses lo aflojara
  más. Al 10% el mismo pico deja un piso de 6: una marca chica y permanente
  («ya lo vivió»), no media vida cargando la mitad de lo peor que le pasó.
  De paso se corrigió el texto de la ficha, que mostraba el PICO justo
  después de decir «nunca baja de», leyéndose como si el pico fuera el piso
  —ahora muestra el piso real, calculado con `pisoDeExposicion`.

### 2.2 Qué pasa después de Disolución ✔ HECHO

Cruzar el cuarto umbral deja una condición permanente y real, igual que una
fobia/manía: **«La secuencia no es una sola»** (kind `mental`), con efecto
mecánico —penaliza Orientarse, bonifica Descubrir— igual que la crisis de
locura temporal de `apply_sanity_loss`. Se aplica sola en `toolApplyExposure`
(`engine/engine.ts`) apenas se cruza `DISSOLUTION`, sin depender de un Keeper
en vivo que la note. Los otros tres umbrales (Primer Contacto, Reciprocidad,
Contaminación) siguen sin efecto mecánico propio — son irreversibles y
cambian lo que se narra, pero no tocan dados. Verificado por `prueba-umbral.ts`.

### 2.3 Consentimiento de meta-horror ✔ HECHO

Hueco L del análisis. `knowledge.playerObserved` deja de ser un campo sin uso:
lo llena `toolNotePlayerKnowledge` (`engine.ts`) vía el efecto `jugadorNota` de
una escena, y ya lo usan cinco aventuras (Agua Blanca, El Invierno Debido, El
Sueño Debido, El Orden Debido, Tercer Umbral) — se muestra aparte de la ficha
del investigador, en la sección "Aparte" de `styles.css`, con tipografía propia
para que se lea como lo que nota quien juega y no como lo que sabe su
personaje. Esta entrada quedó sin tachar por un tiempo después de construirse
el mecanismo; verificado el 2026-09-02.

Lo único que quedaba —"con qué aviso previo"— se decidió el 2026-09-02: SÍ va
aviso, una sola vez al arrancar la primera campaña de cada navegador. Ver
entrada de esa fecha más abajo con la implementación.

---

## 3. Contenido

### 3.0 Fase de desarrollo ✔ HECHO

CoC 7e pp. 94-95 y 167-169, verificado contra tu manual. Se abre al terminar
la aventura, con pantalla propia.

El **marcado sale del registro de tiradas**, no de una casilla: una habilidad
se gana el derecho a mejorar si se usó con éxito y **sin dado de bonificación**,
y esa última regla —la que en la mesa se olvida siempre— no se puede olvidar
porque el log guarda los modificadores. De paso murió `markedForGrowth`, otro
campo declarado que no escribía nadie.

Los dados de la fase salen de la **misma cadena verificable** que los de la
partida: el progreso se audita igual que el azar.

La única decisión del jugador es la **auto-ayuda**: a qué dedica el
investigador sus meses. Si sale, recupera Cordura; si no sale, esa parte de su
vida queda escrita distinta, y si se apoyó en su conexión clave, la pierde.

Falta, para cuando haya segunda aventura: psicoterapia (1D100 contra
Psicoanálisis, una vez por mes), entrenamiento (1D10 cada cuatro meses de
tiempo diegético) y «acostumbrarse a lo horrible».

### 3.1 Creación de personaje ✔ HECHA

CoC 7e cap. 3, verificado contra el manual. Cuatro pasos: quién es → los dados →
qué sabe → de qué se agarra. Elena y Tomás siguen como opción rápida y como
reserva para la muerte permanente.

**Las ocupaciones son nuestras.** La lista del manual es contenido de Chaosium y
además está escrita para otro mundo: un piloto y un hacker no ayudan a jugar en
la provincia de Buenos Aires en 1924. Se toma la estructura —ocho habilidades,
puntos según características, rango de Crédito—, que es mecánica. Trece
ocupaciones propias, en `src/scenario/ocupaciones.ts`, verificadas contra el
manual (Investigator Handbook, cap. 4, pp. 68–93) para elegir cuáles tenían
sentido en este mundo: se sumaron **detective privado**, **ocultista**
(sabor Mythos directo, buen contraste con el anticuario), **boxeador** y
**domador**, las cuatro armadas sólo con habilidades que ya existían en el
catálogo reducido del proyecto, sin agregar ninguna nueva.

**Género es una elección del jugador, con una excepción de mundo.** Cada
ocupación tiene tratamiento en los dos géneros, salvo **cura de pueblo**: en
el clero católico de 1920 no hay forma femenina de esa ocupación, así que
`Ocupacion.soloGenero` la fija en masculino. La interfaz lo aplica solo
—elegir «cura de pueblo» fuerza el género y deshabilita el otro botón—, pero
la garantía real está en `crearInvestigador` (`rules/ficha.ts`): si de
alguna manera llegara un género que no corresponde, el reglamento rechaza la
ficha igual que rechaza cualquier otro reparto ilegal.

**La validación es del motor.** Es el único momento en que el jugador propone
números y el juego los acepta; si la validación viviera en la interfaz,
alcanzaría con abrir la consola para entrar con Medicina 95, y a partir de ahí
ninguna garantía posterior significaría nada porque el punto de partida sería
falso. `prueba-creacion.ts` ataca ocho maneras de hacer trampa.

**Los dados de creación NO están en la cadena verificable**, y es a propósito: el
manual permite repetir las tiradas de creación (p. 47), así que protegerlas
criptográficamente sería teatro. Desde el primer turno de juego, todo vuelve a
la cadena.

Falta: armas y equipo (el juego no tiene combate todavía), y Crédito no se
traduce a dinero porque no hay economía.

### 3.2 Segunda aventura ✔ HECHA — *La Legua Perdida*

Marzo de 1925. Un campo que mide más por adentro que por afuera, tres personas
que lo midieron, tres números, y ninguna miente. Cinco desenlaces.

Se escribió **sin tocar el motor**, en cuatro archivos de escenario. Lo que sí
hizo falta tocar fue lo que la aventura destapó, que es para lo que sirve una
segunda aventura:

- `ACCIONES` era el catálogo de Agua Quieta y vivía en el motor: la segunda
  aventura arrancaba ofreciendo asomarse a un aljibe que no está en su mapa.
  Ahora `Scenario.actions`.
- `ITEM_USED` existía en los eventos y en el reducer y **ninguna herramienta lo
  emitía**: `usageCount` no subía nunca, así que toda propiedad con condición
  «usado N veces» era inalcanzable. Nueva herramienta `use_item`.
- Las contradicciones no se deduplicaban (las pistas sí).
- El epílogo mostraba siempre los desenlaces de Agua Quieta.

### 3.2-ter Encadenado de campaña ✔ HECHO

Al terminar la fase de desarrollo aparece la aventura siguiente. Qué cruza:

| | |
|---|---|
| Habilidades mejoradas, Cordura, trasfondo | cruzan |
| Exposición al Umbral y umbrales cruzados | cruzan **enteros** |
| Fobias, manías, cicatrices mentales | cruzan |
| Estabilidad | se recupera por anclaje, con techo |
| Puntos de vida | se curan |
| Objetos, pistas, tablero | no cruzan |
| Consecuencias permanentes de alcance campaña o mundo | cruzan |
| Un investigador muerto | **sigue muerto** |

El techo de Estabilidad baja con la Exposición (`TECHO_ESTABILIDAD_POR_EXPOSICION`).
Sin él la Estabilidad se recuperaba siempre al 100 y la campaña dejaba de
acumular daño: la Exposición no baja, la Estabilidad volvía entera, y ninguna de
las dos variables arrastraba nada. Es decisión de diseño sobre mecánica propia,
no ampliación de canon, y se revierte poniendo ese divisor en 0.

Lo verifica `prueba-campana.ts`, incluido el caso del investigador muerto y el
de jugar la segunda aventura suelta.

### 3.2-bis (referencia) Segunda aventura — cómo quedó

El motor ya no conoce Agua Quieta. `prueba-desacople.ts` lo sostiene de dos
maneras: busca ids de la aventura dentro de los archivos del motor, y arma una
aventura inventada de cero —«El campanario»— y la juega hasta su desenlace.

Sigue siendo la prueba de fuego, pero ahora de la ESCRITURA, no de la
arquitectura: cuánto cuesta escribir una aventura buena, no cuánto cuesta
hacerla funcionar.

### 3.2-quater Profundidad de culto ✔ HECHO — el Círculo Rojo

El canon (Biblia §5.1, §7, línea temporal) ya nombraba «El Círculo Rojo» como
el grupo que recuperó conocimiento del anillo hacia 1650–1675, y decía que el
linaje Díaz «deformó las prácticas» en los siglos siguientes. Eso nunca había
llegado a una aventura jugable. Esta pasada lo siembra como hilo abierto, no
como revelación: un símbolo distinto del círculo-con-raya del Primer Rostro
—un círculo pintado en almagre, sin explicación— que aparece tres veces,
cada vez un poco más cerca de nombrarse, exactamente como pide la regla de
oro del canon (§15: más cerca de la verdad, más información y menos certeza):

- **Agua Quieta** (`doc-cuaderno`): Rosa repinta el círculo en el brocal
  todos los inviernos, «para que el agua se quede quieta», herencia de su
  madre y de la madre de su madre. Ni ella sabe qué significa.
- **La Legua Perdida** (`doc-mensura1924`): el agrimensor encuentra el mismo
  círculo, ya viejo, pintado sobre el mojón imposible del oeste. Un peón dice
  que «lo cuidan los del Círculo desde antes que hubiera alambre» y los otros
  lo hacen callar.
- **La Firma Ajena** (`doc-partida`): primera vez que el nombre completo
  aparece en el juego, en una hoja suelta metida en un registro parroquial:
  el Círculo Rojo «corrige» a quienes nacen zurdos en cierta sangre, «para
  que la mano que escribe sea la mano que el resto del mundo espera ver» —no
  es la primera vez que se anota, ni va a ser la última.

Ningún NPC lo explica, ninguna escena lo resuelve: es contenido de documento
puro, alcanzable con el mismo camino que ya usaba cada aventura, así que no
tocó el motor ni el validador. Verificado con `npm run check` y
`npm run prueba:todo` (22 suites en verde, bundle correcto) sin cambiar
ninguna aserción existente.

**Después: las tres marcas dejan rastro (para la cuarta aventura).** Cada una
de las tres escenas donde aparece la marca registra ahora una consecuencia
`permanent` de alcance `world`, que es lo único que `sembrarHerencia` deja
cruzar a la aventura siguiente. Las tres comparten el fragmento «del Círculo
Rojo», así que una condición puede preguntar por cualquiera (`o`), por todas
(`y`), o por una en particular.

Lo que se registra **no es «aprendiste algo»: es que quedaste anotado.** Rosa
se calló cuando le preguntaron, al peón lo hicieron callar, y la hoja del
registro la puso alguien que sigue vivo. Es la premisa de la cuarta aventura
—llamaste la atención— convertida en estado del mundo en vez de en una
suposición del guion.

### 3.2-quinquies Cuarta aventura ✔ HECHA — *El Invierno Debido*

Julio de 1926, Villa Requena: un pueblo de cuatro manzanas con juzgado,
escribanía, parroquia y dos familias que heredaron una obligación. Se repinta
un círculo en almagre, una vez por año, en la semana de San Juan. Este año
lleva dos semanas de atraso.

**Es la primera que sabe lo que hiciste en las otras.** Las tres marcas del
Círculo Rojo dejan consecuencia de alcance mundo (§3.2-quater), y la escena
`leer-carta` se escribe distinta según cuántas encontró el investigador —de
cero a tres—. Sin ninguna la aventura se juega igual; con las tres, la primera
línea que lee es una respuesta a algo que hizo en 1924. `prueba-invierno-debido.ts`
juega las dos partidas y verifica que el texto salga distinto.

**Es la primera que cobra Mitos de Cthulhu.** Leer la cuarta hoja del
procedimiento da cuatro puntos y baja el techo de Cordura a 95, para siempre y
para toda la campaña. Está detrás de un aviso que el jugador tiene que ignorar
a propósito, y ese aviso vive en la escena por la que hay que pasar sí o sí
—no en un tema de conversación—, porque hay dos caminos para abrir el cajón y
el costo sólo es justo si el aviso llegó siempre.

**Es la primera con combate evitable.** Cirilo Sosa tiene estadísticas (Pelea
50, rebenque) y una razón legítima: ve a la madre de setenta y uno saliendo
sola de noche a hacer el trabajo de otro. Se lo puede desactivar hablando,
huir, o pelear.

**La pregunta central no se contesta en ninguna de las cinco ramas.** Aurelio
salteó un año y no pasó nada; Ramona sostiene que si sirviera, el daño no se
notaría a tiempo. Las dos cosas son ciertas y ninguna prueba nada. La suite
tiene una comprobación explícita de que ningún desenlace afirma que la
obligación sirva — la regla de oro (§15) como aserción, no como intención.

**Bugs de contenido que destapó, todos de la misma familia** («declarado sin
camino», §1.2):

- El narrador listaba a los NPC por `present`, que es global: con cuatro
  personajes en cinco lugares los ponía a los cuatro en cada lugar, y
  contradecía a los botones, que sí filtran por `npcsPresent`. **Afectaba
  también a La Firma Ajena.** Arreglado en `keeper/narrator.ts`.
- Ninguno de los 19 temas tenía `agotado`, así que se podían volver a
  preguntar para siempre y gastaban la paciencia del NPC antes de llegar a los
  temas siguientes. Se los generó a partir de la primera línea de cada
  respuesta.
- Un tema de conversación **no puede entregar un documento**. El cajón se abría
  hablando y adentro no había nada: hizo falta una escena aparte (`abrir-cajon`).
- Un detalle se marca como examinado aunque la tirada falle, así que da UNA
  sola oportunidad. Dos pistas obligatorias colgaban de un dado único; ahora
  salen de preguntarle a la persona, que además es mejor investigación.
- Y el más caro: el contenido central —el libro, el procedimiento, los Mitos y
  dos de los cinco desenlaces— dependía de una sola tirada de Persuasión que,
  fallada una vez, cerraba media aventura. Ahora el cajón tiene dos llaves y
  ninguna es un dado.
- Dos botones para el mismo detalle (`legajos`, `barranca`, `manos`, `mapa`
  duplicaban lo que ya generaba solo su `feature`). Consolidados en uno.

**Un bug de MOTOR, no de contenido, encontrado jugando de verdad.**
`runOfflineTurn` calculaba las opciones de respuesta ANTES de que la
narración de ESE MISMO turno quedara aplicada al estado —eso lo hacía recién
quien llama, después, con `turn.narrate()`—. Cualquier condición `narrado`
(la que usa `agotado` en sus 19 temas) veía el estado de un turno atrás: el
botón que se acababa de contestar se seguía ofreciendo una vez más, y recién
desaparecía al turno siguiente. **Ya afectaba a 3 temas de Agua Quieta y 5 de
La Legua Perdida** —invisible hasta ahora porque ningún tema anterior
dependía tanto de `narrado`—.

Arreglado en `keeper/offline.ts`: se simula el estado post-narración sólo
para calcular las opciones (`apply()` sobre una copia, sin tocar `turn.state`
ni emitir nada de más). Verificado con un caso mínimo en `prueba-social.ts`
§7 —un tema inventado, sin nada de Invierno Debido de por medio— para que la
prueba sobreviva aunque el contenido que lo destapó cambie.

**Segunda ronda, jugada por vos: la aventura no tenía salida.** El más grave
de los tres hallazgos. Los cinco desenlaces existían sólo como patrones de
texto libre —`{op:'texto', patron:'pinto|pintar|...'}`— y ninguno tenía un
botón registrado. El modo motor (el modo público, sin API) no muestra caja de
texto libre a propósito, así que la aventura entera era imposible de terminar
jugando como se juega de verdad: agotaste los 19 temas y no quedó nada que
hacer. Se agregaron los cinco botones (`fin-pintar`, `fin-soltar`,
`fin-otro-ano`, `fin-denunciar`, `fin-irse`), cada uno con la misma
`intencion` exacta que ya reconocía la escena, y una comprobación nueva en
`prueba-invierno-debido.ts` que verifica —con `accionesDisponibles`, no con
texto libre disparado a mano— que los cinco están entre los botones reales.
Ningún otro `prueba-*` de las cuatro aventuras revisaba esto: probaban que la
FRASE resolvía bien, nunca que hubiera un BOTÓN para escribirla.

De paso, `grupo: "hacer"` en 17 acciones no era un valor válido —el real es
`"usar"`—; funcionaba de pura casualidad porque nada valida `grupo` al cargar
y el CSS pone el título en mayúsculas. Corregido.

**Y una narración duplicada, también encontrada jugando.** El cajón se puede
abrir por dos llaves (pedírselo a Aurelio, o que ya haya dicho que quiere
dejarlo). La primera llave (`a-procedimiento`, tema de conversación) narraba
la apertura completa Y el aviso de la cuarta hoja entero; la escena que
entrega el documento (`agarrar-procedimiento`) volvía a narrar lo mismo. Si
el jugador entraba por la SEGUNDA llave primero, después el tema seguía
ofreciéndose y repetía la apertura como si fuera la primera vez. Se recortó
el tema a sólo la apertura (sin adelantar el aviso, que ahora vive en un solo
lugar: el momento de tocar la hoja de verdad) y se le agregó la condición de
no ofrecerse si el cajón ya se abrió por la otra vía.

**Tercera ronda: el combate nunca estuvo conectado a ninguna historia.**
Preguntaste por qué nunca llegabas a pelear con Cirilo, y la respuesta fue
peor que un bug de contenido: `resolve_attack`/`resolve_flee`/`resolve_maneuver`
—las herramientas de combate reales, con dados, PV y todo— **sólo las
llamaba el simulador**. Ninguna de las cuatro aventuras las conectaba a su
propia narrativa. Cirilo tenía Pelea y PV declarados y la escena que lo
ponía hostil terminaba en «vamos a arreglarlo» sin ningún lado adonde ir.

Se construyó el cable que faltaba: `EfectoEscena.combate` (nuevo campo en
`scenario/escena.ts`), wireado en `keeper/escenas.ts` a las mismas tres
herramientas del simulador. A diferencia de `descubre`/`documento` —donde el
resultado ya lo cuenta la prosa de la escena—, acá el MENSAJE DEL MOTOR ES
la narración: los dados no los puede predecir ningún texto escrito de
antemano, así que se muestra siempre, éxito o fracaso.

Contenido nuevo en Los Sosa: Cirilo bloquea la salida del patio (en vez de
«vamos a la escribanía», que no llevaba a ningún lado) y ofrece tres salidas
reales — **hablarle** (persuasión, tema `c-calmar`), **huir** (`resolve_flee`,
golpe de oportunidad incluido) o **pelear** (`resolve_attack`, a mano
limpia). Un operador nuevo del DSL, `npcFuera` (mira `combate.hp` de un NPC
directamente, más robusto que tirar de texto narrado), cierra el conflicto
cuando corresponde. Encontrados y corregidos en el camino, todos jugando:

- Otras DOS escenas sin botón —`contarle-a-ramona` y `contarle-a-cirilo`—,
  mismo bug que los cinco desenlaces: existían sólo como patrón de texto.
- La primera versión de «Trato de calmar a Cirilo» no tenía un verbo de
  habla explícito (ningún stem de `hablar` en el texto), así que ni
  llegaba al tema: cayó en el genérico «hacés eso, el campo no tiene
  opinión». Y «Me voy corriendo **de la casa de los Sosa**» se clasificaba
  como intento de IR a la casa de los Sosa —el lugar donde ya se está—, no
  como huida: el nombre del lugar en la frase le ganaba al verbo. Las dos
  reescritas para calzar con cómo clasifica el motor, no con cómo suena
  mejor en español.
- La pista que abría los tres caminos («Cirilo bloqueó la salida») sólo
  vivía en el `worldReminder` de una consecuencia, nunca en una pista de
  verdad: nada la encontraba nunca. Corregido.
- El primer intento de «hablarle» pedía Persuasión difícil, y con la actitud
  de Cirilo recién hundida (-4 por la revelación) eso resultó casi
  imposible: 0 éxitos en 15 semillas seguidas. Bajado a Persuasión regular
  —sigue siendo dura, con penalización por la actitud, pero deja de ser
  teórica—.

Un efecto colateral esperado, no un bug: `prueba-auditoria.ts`'s andador
—que prueba TODO lo que encuentra, insistiendo— ahora puede morir de
verdad peleando con Cirilo (semilla fija `j`), exactamente como le pasaría
a un jugador real. Se le enseñó a cortar el recorrido ahí (mismo criterio
que ya usa el juego real para bloquear las acciones de un investigador
muerto) y a no exigir cobertura completa del mapa cuando eso pasa: no es
que algo esté mal declarado, es que el personaje se murió en el intento.

**Y de paso, un arma de fuego dejó de contraatacarse a mano.** Encontrado en
el simulador, no en esta aventura: un NPC con `defensaPorDefecto: 'contraataca'`
le devolvía el golpe con un palo a un balazo tirado desde lejos.
`defensaPorDefecto` era una preferencia fija por NPC que nunca miraba el
arma de quien atacaba. Ahora, si el arma es de fuego y no es a quemarropa,
la defensa se fuerza a Esquivar; a quemarropa —que ya es forcejeo, no
distancia— la preferencia normal vuelve a valer. Verificado en
`prueba-combate.ts` en los tres casos.

24 suites en verde. Verificado contra el servidor real (HTTP), no sólo el
motor en Node — con la salvedad de que el servidor de desarrollo usa una
semilla aleatoria por campaña, así que una tirada social difícil puede
fallar varias veces seguidas en una corrida y no en otra; el motor
determinista (`prueba-invierno-debido.ts`, semillas fijas) es la
verificación de fondo.

**Cuarta ronda: el combate en la historia se ve como el combate, y ganarlo
pesa.** Dos pedidos, jugando: que el enfrentamiento con Cirilo no se
mostrara como texto plano repetido sino con la misma cara del simulador
(dados, ficha del rival), y que noquearlo tuviera consecuencia real, no
cosmética.

La ficha del rival (`Rivales`, nuevo en `web/components.tsx`, montado en
`App.tsx` arriba del `RollCard`) muestra nombre, arma y un estado en
CUATRO escalones —entero / lastimado / malherido / fuera de combate—, sin
un solo número. Es la misma decisión que ya regía en `sanitize.ts` desde
antes de este MVP («en la mesa nadie ve la ficha del rival»): el cliente
nunca recibe el PV exacto de un NPC, sólo `estadoCombate` (nuevo,
`server/sanitize.ts`) calculado en el servidor. Confirmada por vos mismo,
explícitamente, contra la alternativa de exponer el número: **barra
cualitativa, sin números**.

Ganar la pelea ahora corta dos conversaciones, no una sola:

- **Hablar con Cirilo inconsciente ya no funciona.** El motor —no esta
  aventura puntual— nunca chequeaba `combate.hp`: `talkTo()` en
  `keeper/offline.ts` sólo miraba `status !== 'alive'` (muerto/loco), así
  que un NPC tirado en el piso seguía contestando preguntas como si nada.
  Corregido a nivel motor, agnóstico de aventura: cualquier NPC con
  `combate.hp <= 0` corta la conversación con un aviso, antes de que se
  evalúe ningún tema.
- **Ramona deja de hablar de lo que sea que tenga que ver con su hijo.**
  Sus cuatro temas existentes (`r-obligacion`, `r-para-que`,
  `r-dos-turnos`, `r-cirilo`) y los tres de Cirilo (`c-madre`, `c-aurelio`,
  `c-libro`) se gatearon con el operador `npcFuera` para dejar de estar
  disponibles en cuanto Cirilo cae; en su lugar, un tema nuevo
  (`r-cirilo-inconsciente`) la muestra arrodillada al lado de él,
  pidiéndote que te vayas. Cirilo mismo no necesitó un tema de reemplazo:
  el corte de `talkTo()` ya lo intercepta antes de llegar a clasificar
  ningún tema suyo.

Verificado jugando de punta a punta, con semilla fija (`x`, 20 asaltos):
Cirilo cae, hablarle narra que está fuera de combate, y preguntarle
cualquier cosa a Ramona narra su negativa — la misma secuencia que jugaste
vos mismo y mandaste por captura.

### 3.2-sexies Quinta aventura ✔ HECHA — *El Sueño Debido*

Julio de 1927, Villa Requena otra vez, un año y dos días después. Aurelio
Requena cumplió lo que había prometido —la carta llega— pero no pide que
alguien pinte nada: pide que alguien venga a mirarlo, porque hace catorce
días que no se despierta y sigue levantándose de noche.

**El tema no lo elegí yo: estaba escrito.** La Biblia de Canon v0.7 §11 fija
los Siete Umbrales con un tema cada uno, y las cuatro aventuras ya venían
calzando en orden sin que el catálogo lo dijera —tiempo y observación en Agua
Quieta, espacio en La Legua Perdida, identidad en La Firma Ajena, muerte en El
Invierno Debido—. El quinto es **sueño**. Los nombres geográficos de los otros
Umbrales no son canon definitivo; el tema sí.

**Lo que estrena, y por qué es la quinta y no otra:**

1. **Es la primera continuación directa.** La cuarta leía CUÁNTAS marcas del
   Círculo Rojo traías; ésta lee CUÁL de los cinco desenlaces elegiste, y la
   carta de apertura y el renglón de 1926 del libro se escriben distintos en
   las cinco ramas. La de «se lo llevó al juzgado» es la más trabajosa: el
   libro no está, así que lo que se lee es la copia a mano que sacó Delfina
   Arce antes de que el original saliera del pueblo. Se puede empezar acá:
   entonces cae en la rama de irse sin decidir, que para Villa Requena es
   indistinguible de no haber venido nunca.
2. **Dos mundos que sólo cierran cruzados.** Tres noches, tres escenas de
   sueño, y lo que se trae de cada una no significa nada hasta que se apoya en
   algo de la vigilia: la ronda del brocal no dice nada hasta fechar una
   tachadura de 1878, y la quinta hoja no dice nada hasta ver quién salió
   movido en una foto de 1880.
3. **Reparte las tiradas, que era una deuda tuya y tenías razón.** Un conteo
   sobre las cuatro aventuras publicadas daba `descubrir` doce veces,
   `psicologia` y `buscar_libros` tres, `persuasion` dos, y **catorce
   habilidades del sistema sin usar ni una sola vez**. Acá entran por primera
   vez Primeros Auxilios, Escuchar, Historia, Uso de Bibliotecas, Fotografía,
   Ocultismo, Antropología, Intimidar y Labia, más POD para el clímax. Si la
   campaña nunca pone a prueba lo que el jugador eligió al repartir puntos, la
   creación de personaje es un formulario.
4. **Las habilidades caras enriquecen y NUNCA bloquean.** Ninguna ficha
   pregenerada trae Ocultismo ni Antropología —salen en base 5 y 1—, así que
   gatear contenido detrás de ellas habría sido peor que no usarlas. Fallarlas
   cambia qué se entiende, jamás si se puede seguir; los tres desenlaces se
   alcanzan con las dos en base, y hay una prueba que lo verifica. Lo que sí
   hacen es pagar el trabajo de vigilia: haber mirado el polvo del tarro
   contra la luz y el grano de la foto da dados de bonificación en el sueño.
5. **La rama hostil existe de verdad.** Si el año pasado le fuiste encima a
   Cirilo, Ramona no colabora: el tema por Persuasión desaparece y aparece uno
   por Intimidar, que da la misma información, cuesta actitud en vez de
   ganarla y termina con ella parándose y echándote. Eso obligó a un arreglo
   retroactivo en El Invierno Debido: **elegir pelear no dejaba ningún rastro
   que cruzara el puente entre aventuras**, se agotaba en los PV de esa tarde.
   Ahora deja consecuencia de alcance campaña, registrada una sola vez por más
   asaltos que se peleen.

**Tres desenlaces, no cinco.** «Lo que se despierta» (vuelve, y se trae
puesto algo que no era suyo), «Lo que se queda dormido» (te vas, y el pueblo
queda con un hombre que respira y no está) y «Lo que se paga con otro sueño»
(te ponés en su lugar: él despierta entero y la deuda cambia de dueño, que
sos vos). Ninguno contesta si la obligación sirve —§15 otra vez—, y hay una
prueba automática que lo verifica sobre el texto de los tres.

**Los cuatro puntos a lápiz del mapa de la escuela, resueltos.** Estaban
plantados en la cuarta como atmósfera. Ahora son cinco, Delfina explica de
dónde salen —tres años anotando rumores de viajeros en un almacén, por manía
de no dormir— y tres de ellos caen donde estuvo el investigador en las tres
primeras aventuras. El cuarto y el quinto quedan sin resolver a propósito.

**Bugs encontrados construyéndola, todos jugando o auditando:**

- **Un tema de conversación no puede entregar un documento.** `EfectoTema`
  deja cambiar actitud, dejar pista y revelar secreto, y nada más. La partida
  parroquial de 1878 estaba declarada, Delfina la contaba, y el papel no
  llegaba nunca a la carpeta —y su `agotado`, que chequeaba justamente ese
  documento, no se cumplía jamás—. Lo encontró la auditoría de
  alcanzabilidad, no una partida. Se le escribió escena propia.
- **La auditoría no sembraba las pistas de las conversaciones.** Su banco de
  estados hipotéticos sólo cargaba las pistas de los detalles de lugar, así
  que una escena que ramifica por algo que contó un NPC se veía siempre por
  su rama pobre, y un desenlace que sólo existe en la rama rica quedaba
  reportado como inalcanzable aunque una partida lo alcanzara sin problema.
  Falso positivo, que en una prueba es tan malo como un falso negativo.
  Arreglado en `prueba-auditoria.ts`: ahora siembra también lo que dejan los
  temas, en sus cuatro salidas.
- **«Hay cinco desenlaces» estaba escrito a mano en la interfaz.** Con una
  aventura de tres, mentía. Ahora cuenta los del escenario.
- **La tarjeta del inicio prometía «se puede jugar sola» a cualquier aventura
  con `requiere`.** En una continuación directa eso es falso, y una promesa
  falsa en la pantalla de entrada es peor que no decir nada. Entrada nueva de
  catálogo (`continuacion`) y un texto distinto.
- **El reloj del mundo y el reloj de la pantalla se contradecían por el huso
  horario.** `advanceTimeBy` guardaba el `iso` con `toISOString()` —UTC— y
  armaba el display con `getHours()` —local—, así que en Argentina el estado
  iba tres horas adelantado respecto del reloj visible. Sobrevivió cuatro
  aventuras porque todas empiezan a las diez de la mañana y el corrimiento no
  cruzaba ningún umbral. La quinta arranca 16:20, el ISO decía 19:20, y el
  motor narraba «ya es de noche» a media tarde. Afectaba a todo lo que lee la
  hora: `isNight`, `lightNote` y el operador `hora` del DSL. Arreglado y con
  prueba de regresión en `prueba-permeabilidad.ts`.

**Una decisión de ingeniería, explicada porque se ve poco:** el sueño son
escenas y no localizaciones. `move_to_location` exige conexión declarada y el
motor genera un botón «Ir a» por cada conexión, así que un mapa onírico
navegable pedía dos features de motor —conexiones ocultas y un efecto
`mueve`— para conseguir algo además peor de narrar. Un sueño no se recorre:
te lleva. Cada visita es una escena con tirada propia que ramifica por GRADO
y no sólo por éxito, que es más control del que daría una sala.

26 suites en verde, incluida la auditoría de alcanzabilidad sobre las cinco
aventuras. Verificado además en el navegador real.

**Segunda ronda, jugando de verdad: cuatro bugs más, dos de motor.**

- **El clasificador le atribuía la pregunta al NPC equivocado.** «Le pregunto
  a Delfina qué le pasa a Aurelio», dicho en la escuela, resolvía el
  objetivo contra AURELIO —que ni está ahí— y devolvía su genérico de
  paciencia agotada en vez del tema de Delfina. La causa: el bloque 0 de
  `classify()` (`keeper/intent.ts`) filtraba candidatos a destinatario por
  `npc.present` —«sigue en la historia», nunca se murió ni se fue— y no por
  `loc.npcsPresent` —«está EN ESTE LUGAR»—, así que cualquier NPC nombrado
  en la frase, estuviera donde estuviera, competía por el objetivo. Con
  cuatro NPCs y una sola aventura previa por escenario nunca había hecho
  falta nombrar a un segundo personaje dentro de una pregunta a un tercero;
  la quinta lo hizo por primera vez y el bug salió a la luz. Corregido en
  los dos bloques de `intent.ts` que buscan destinatario por nombre —el de
  hablarle directo y el de reconocimiento genérico—, con prueba de
  regresión jugando la escena exacta donde apareció.
- **El botón para dormir dependía de acertar una tirada.** `noche-uno`
  exigía la pista rica de `mirar-aurelio`, y esa pista sólo se agregaba en
  la rama de ÉXITO de Primeros Auxilios —30-35% en las dos fichas
  pregeneradas—. Fallarla, sin insistir lo suficiente, dejaba a un jugador
  sin ningún camino a las tres noches después de agotar el resto del
  contenido: la aventura entera depende de esa puerta. Va exactamente en
  contra de la regla que el propio diseño se había puesto («las habilidades
  raras enriquecen, nunca bloquean») y se me pasó en el propio mecanismo
  central. Arreglado separando una pista incondicional —la que abre la
  puerta— de la pista rica —la que sólo llega acertando, y que sigue
  premiando la tirada con más detalle—, con regresión sobre una semilla que
  falla la tirada en el primer intento.
- **El texto de Delfina prometía un viaje sin dueño mecánico.** «Vuelve al
  día siguiente antes de que salga el sol» narraba una noche de por medio
  que el juego nunca hacía pasar: la pista y el documento estaban
  disponibles en el mismo turno. Reescrito para que ella entregue lo que ya
  tenía copiado —consistente con que ya se estableció como archivista por
  costumbre—, sin prometer una espera que la mecánica no cumple.
- **«PISTAS» quedaba más chico que «el mundo recuerda» y «usted lo nota».**
  `.tab-body` (el tablero, con `overflow-y:auto`) tiene mínimo automático
  cero por CSS; `.consequences` y `.aparte`, sin `overflow` propio, tienen
  mínimo igual a su contenido. En una campaña larga —varias consecuencias
  más una nota de jugador— esas dos secciones de altura libre se comían
  casi toda la columna y dejaban el tablero reducido a dos tarjetas.
  Envueltas juntas en `.col-right-pie` con techo propio (38% de la columna,
  scroll interno) y un piso explícito en `.tab-body` (40%), para que ninguna
  de las dos se lleve puesto a la otra.

**Tercera ronda: llegar al fondo te obliga a decidir, y las tres noches
dejan de ser tres clicks con un dado detrás.**

Dos pedidos tuyos, jugando la aventura después de publicada:

1. La tercera noche narraba «estás en el fondo del brocal, con Aurelio
   enfrente» y en el mismo turno seguía ofreciendo mirar el catre o irse a
   la escuela, como si soñar no cambiara nada de lo que se puede hacer.
2. Cada noche era un solo botón con una tirada automática detrás —«literal
   hacer 3 clicks seguidos con tiradas automáticas muy difíciles»—, sin
   nada que decidir salvo mirar el resultado.

**El bloqueo de decisión, nuevo en el motor.** `Scenario.bloqueoDecision`
(opcional, `contenido.schema.ts` → `cargarAventura.ts` → `acciones.ts`): con
la condición cierta, `accionesDisponibles()` deja de ofrecer mirar, hablar,
hacer e ir, y sólo quedan los desenlaces. Genérico, no atado a esta
aventura —cualquier clímax futuro con el mismo problema lo declara sin
tocar el motor—. El auditor de alcanzabilidad necesitó el mismo ajuste que
ya tenía para la muerte en combate de El Invierno Debido: el andador
determinista nunca elige un desenlace (eso lo audita por otro lado), así
que el bloqueo lo deja sin nada que hacer y corta el recorrido antes de
agotar el mapa —no es un defecto de cobertura, es la aventura negándose a
dejar seguir explorando desde ahí, a propósito—.

**Las tres noches, partidas en dos pasos cada una.** Antes: un botón, una
tirada, un párrafo. Ahora: una escena de ENTRADA sin tirada que planta al
jugador en el sueño y ofrece dos ángulos, y dos escenas de ACERCAMIENTO —
cada una con su propia habilidad— que convergen en la misma pista de
cierre. Ninguna de las dos bloquea a la otra ni cambia si se avanza: cambia
CÓMO se avanza y qué parte de la ficha entra en juego.

- **Primera noche.** Acercarse a mirar la fila (Antropología, la de
  siempre) o quedarse quieto y buscar el propio lugar en ella (Poder,
  nueva: ¿hay un hueco ahí que sea tuyo?).
- **Segunda noche.** Agarrar la quinta hoja y leerla (Ocultismo, la de
  siempre) o preguntarle quién es al que escribe antes de tocar nada
  (Psicología, nueva: no juzga si miente, juzga qué quedó de alguien que
  dejó de tener adónde ir).
- **Tercera noche.** Hablarle a Aurelio aunque no se sepa si escucha (Poder,
  la de siempre) o bajar en silencio, sin llamarlo (Sigilo, nueva —y la
  primera vez que esta habilidad se usa en la aventura—).

Sigilo, Poder-como-característica y Psicología se suman así al reparto de
la quinta aventura sin restarle nada a las cuatro habilidades raras que ya
tenía: los ángulos nuevos tampoco gatean nada, fallan y la noche cierra
igual.

**Un bug encontrado escribiendo esto, no jugando: comas dentro del
patrón.** El motor normaliza minúsculas y acentos pero NO saca comas
(`keeper/intent.ts`, `norm()`), y el patrón de «Le hablo, aunque no sé si
me escucha» estaba escrito sin la coma que la intención sí tenía —
`new RegExp(patron).test(i.norm)` nunca cruza esa coma—. La tercera noche
caía en el genérico de acción ambiental («El campo. Viento en los
álamos…») en vez de resolver la escena. Ninguna otra intención nueva tenía
el problema porque, por casualidad, sus comas quedaban después del
fragmento que hacía falta matchear, no en el medio.

26 suites en verde, con dos secciones nuevas dentro de
`prueba-sueno-debido.ts`: que el bloqueo apague todo menos los desenlaces,
y que la rama alternativa de cada noche encadene exactamente igual que la
principal. Verificado además jugando las dos ramas en el navegador real.

**Cuarta ronda: la vigilia entre sueño y sueño tiene que pesar de verdad.**
Reportado jugando, otra vez, después de la tercera ronda: pedirle a Delfina
que investigue 1878 seguía sin esperar que pasara un día —contestaba en el
mismo turno—, y del sueño 2 se pasaba derecho al sueño 3 y al desenlace,
tres clicks seguidos sin ninguna vigilia real entre medio. El pedido:
llegar al pueblo, investigar, soñar, volver a la vigilia con pistas nuevas,
volver a soñar, y que algunas de esas pistas cuesten más que otras.

**`EfectoTema.tiempo`, nuevo en el motor.** Hasta ahora sólo las escenas
podían hacer pasar el reloj del mundo (`EfectoEscena.tiempo`); un tema de
conversación no tenía manera de hacerlo, así que cualquier «vuelvo mañana»
dicho por un NPC en cualquier aventura era una promesa sin dueño mecánico.
Se agregó el campo, se conectó en `keeper/social.ts` con el mismo
`advance_time` que ya usan las escenas, y queda disponible para cualquier
tema futuro de cualquier aventura, no sólo ésta.

**Pedirle a Delfina que investigue ahora cuesta un día de verdad —y una
segunda visita.** `d-1878` avanza el reloj 8 horas y NO entrega ya nada:
sólo dice que ella se ofreció a buscar, sin prometer cuándo. Lo que
encontró se entrega en un tema nuevo, `parroquial`, servido como una
pregunta aparte («¿ya volvió del curato?»), que exige haber vuelto a la
escuela después de que el tiempo pasara. Antes, la pista y el documento
llegaban en la misma frase que el pedido.

**La tercera noche ya no cuelga directamente de la segunda.** Su gate pasó
de exigir sólo «una quinta hoja» (lo que deja el sueño 2) a exigir además
saber quién es Benicio Requena — por el camino de Delfina (arriba) o por
el camino más difícil de Ramona (`r-1878`/`r-1878-forzado`, una tirada de
Persuasión o Intimidar contra alguien que no quiere hablar de esto). Es la
«pista más difícil o escondida» que pediste: no agrega una habilidad
nueva, usa la que ya estaba ahí y la vuelve obligatoria en vez de opcional.

26 suites en verde, con una sección nueva en `prueba-sueno-debido.ts` que
verifica las tres partes por separado: que preguntarle a Delfina no
entrega nada en el mismo turno pero sí adelanta el reloj, que sin volver a
preguntarle (ni hablar con Ramona) la tercera noche no se ofrece, y que
con cualquiera de los dos caminos hecho sí se ofrece.

**Quinta ronda: el propio arreglo de la cuarta rompió el primer sueño.**
Reportado jugando, el mismo día que salió la cuarta ronda: «agoté todos los
diálogos y no puedo llegar al primer sueño», y la Permeabilidad del mundo
en 96/100 después de una sesión de investigación normal.

La causa era el arreglo anterior. `PERMEABILIDAD_MINUTOS_POR_PUNTO = 20`
(`rules/umbral.config.ts`): un punto de Permeabilidad cada veinte minutos
de reloj. Las 26 horas (1560 minutos) que le puse a `d-1878` para que
Delfina viajara a Del Valle eran **78 puntos de Permeabilidad en un solo
click** —el medidor entero casi de una vez—, y la Permeabilidad alta
encarece CADA tirada siguiente vía `extraExposureFromPermeability`: más
Exposición por cada contacto, lo que empuja la Estabilidad hacia abajo, lo
que mete dados de penalización en TODO lo que se tire después —incluida
la de Primeros Auxilios que abre la primera noche—. Un jugador con mala
suerte en esa tirada, después de pedirle a Delfina que investigara,
quedaba con odds mucho peor que las publicadas y sin saber por qué.

Bajado a 8 horas (480 minutos, 24 puntos), el mismo orden de magnitud que
ya usan las escenas de «dormir» en otras aventuras (`aguaquieta.logica.ts`,
`tercerumbral.logica.ts`): un salto de tiempo real, sin desproporcionar el
medidor que después condiciona toda la partida. Verificado jugando una
sesión larga y comparable a la que reportó el problema: Permeabilidad
pasó de 96 a 42, Estabilidad se mantuvo en 100, y «Me duermo con el
almagre en la mano» quedó disponible.

**Sexta ronda: la misma regla, olvidada una segunda vez, en la puerta de
la segunda noche.** Pregunta directa, jugando: «¿acceder al segundo sueño
es sí o sí pasando la tirada de Historia? debería haber otra forma». Tenía
razón — `fechar-tachadura` dejaba la pista que abre `noche-dos` («once
años después») únicamente en la rama de éxito, exactamente el mismo bug
que ya se había corregido para Primeros Auxilios y la primera noche, pero
sin aplicar el mismo criterio acá.

Mismo arreglo: la pista que destraba la puerta pasó a ser INCONDICIONAL
—lo que se ve a simple vista, sin fechar tinta ni letra, alcanza para
seguir—, y el fechado exacto (los once años, la letra de 1889) sigue
siendo success-only, la parte que de verdad premia acertar. La acción
sigue ofreciéndose después de fallar, así que insistir sigue teniendo
sentido para quien quiera la versión completa.

De paso, otro bug encontrado por la propia batería de pruebas: la
intención de la acción nueva de la segunda noche empezaba con «Agarro»,
que el clasificador lee como el verbo `tomar` —agarrar un objeto—, y
`prueba-tiradas.ts` tiene una regla de todo el proyecto, no sólo de esta
aventura: agarrar algo nunca puede pedir un dado, porque levantar un papel
del escritorio no es lo que puede fallar; leerlo sí. Reescrita a «Leo la
hoja que no está cosida», que clasifica como `leer` y no rompe la regla.

**Séptima ronda: la vigilia entre el sueño 2 y el 3, esta vez de verdad.**
El arreglo de la cuarta ronda no alcanzaba, y el motivo es instructivo: el
gate de la tercera noche exigía saber quién era Benicio Requena, pero eso
se puede averiguar ANTES de dormir. Un jugador que investigara todo
primero —que es lo que hace cualquiera— llegaba al sueño 2 con el
requisito ya cumplido y encadenaba igual 2 → 3 → desenlace de tres clicks.
El gate era real; lo que no era real era el ORDEN.

La lección: para forzar vigilia entre dos sueños no alcanza con pedir algo
del mundo despierto. Hay que pedir algo que **no se pueda hacer antes**.

`foto-otra-vez`, nueva: volver a la escuela a mirar la foto de la comisión
de 1880 sabiendo, ahora sí, a quién buscar — porque recién en el sueño 2
se le ve la cara al que escribe el libro. Es la misma cara que la del
hombre movido de la fila de atrás. No se puede hacer antes (hace falta
haber estado en el sueño 2), obliga a un viaje real de ida y vuelta (la
foto está en la escuela, los sueños pasan en la escribanía), y deja una
pista y una contradicción nuevas. Sin tirada, a propósito: reconocer una
cara que se acaba de ver es memoria, no habilidad. Lo que cambia según lo
que ya se sabe no es si se reconoce, sino qué significa: quien averiguó lo
de Benicio le pone nombre y fecha —1880, dos años después de su turno,
puesto en la fila igual, saliendo movido—; quien no, se queda con la cara
y sin el nombre.

La prueba nueva es la que cierra el asunto: juega un guion que investiga
TODO antes de dormir —Delfina, Ramona, el libro, las tachaduras— y
verifica que aun así la tercera noche no se ofrece, y que sí sabe lo de
Benicio (o sea: no le falta información, le falta la vigilia).

**Octava ronda: mirar un detalle daba por hecha una acción que nunca corrió.**
Éste es el que costó tres reportes seguidos encontrar, y la razón por la que
costó tanto es que las dos piezas eran correctas por separado.

En la escribanía hay un detalle, `f-catre`, que se mira con Primeros
Auxilios y deja una pista: «Aurelio no está enfermo de nada que se pueda
diagnosticar…». Y hay una acción, «Revisarlo como se revisa a un enfermo»,
que usaba ese mismo fragmento como su condición `hecha`. Mirar el catre
—cosa que hace cualquiera, es el primer botón de la lista— marcaba la
acción como ya realizada, el botón desaparecía, y la escena nunca se
ejecutaba. Y como el marcador que abre la primera noche («Revisó a Aurelio
de cerca») sólo lo deja esa escena, la aventura quedaba trabada ahí, sin
ningún síntoma visible: ni error, ni botón roto, sólo una opción que no
aparecía nunca. Reportado tres veces —incluso después de borrar todo,
Ctrl+F5 y empezar de cero, que es exactamente lo que hacía falta para
descartar caché y partidas viejas.

Arreglado por los dos lados: `revisar-aurelio.hecha` ahora busca su propio
marcador (que sólo produce su escena), y `noche-uno.visible` acepta
CUALQUIERA de los dos caminos —la acción o el detalle—, porque quien miró
el catre de cerca averiguó lo mismo y no tiene por qué quedar afuera.

**Y una prueba nueva en la auditoría, porque esto es una familia, no un
caso.** Para cada aventura se arma un estado con SÓLO las pistas de los
detalles del lugar y se comprueba que ninguna acción se dé por `hecha` con
eso. Un gate `visible` satisfecho por un detalle está bien —es un
desbloqueo legítimo, y La Legua lo usa a propósito en dos lugares—; el que
no puede pasar es `hecha`, porque marca como hecho algo que no ocurrió.
Verificada revirtiendo el arreglo a mano: la prueba lo detecta. Las cinco
aventuras pasan.

**Novena ronda: terminada la aventura, dos pulidos de después de jugarla
entera.** Con las ocho rondas anteriores resueltas, la campaña se completó
de punta a punta —28 pistas, desenlace «Lo que se despierta»— y lo que
quedó fue pulido de UX, no bugs de progreso.

Primero, la etiqueta de la tercera noche. Las otras dos entradas al sueño
dicen «Quedarse a dormir…» y «Volver a pasar la noche ahí»: ambas nombran
el dormir. La tercera decía sólo «Bajar a buscarlo», que describe lo que
pasa DENTRO del sueño pero no avisa que hay que dormirse para llegar ahí.
Renombrada a «Dormirse otra vez, esta vez a bajar a buscarlo», consistente
con las otras dos.

De paso, qué cambia acertar las tiradas dentro de las tres noches: en las
dos primeras, nada que bloquee —la pista de cierre sale falle o acierte
(ver Sexta ronda)— y lo que cambia es CUÁNTO se entiende: en la primera,
si la ronda del brocal se lee como una guardia con turnos o queda como una
fila sin sentido; en la segunda, si la quinta hoja se lee como una lista de
nombres con marcas agrupadas o se queda en «no hay manera de decir qué es»
(y eso además cambia el texto del desenlace). En la tercera sí hay una
diferencia real, no sólo de texto: fallar la tirada de POD o Sigilo frente
a Aurelio duplica el costo —Exposición, Estabilidad y Cordura— aunque el
jugador baja igual y llega igual al desenlace. Es la única tirada de la
aventura que castiga la falla en fichas, no en prosa, y a propósito: es la
única que no se puede preparar invirtiendo puntos en la ficha de antemano.

Segundo, el panel derecho. Con veintiséis pistas o más, el reparto fijo
entre el tablero y «el mundo recuerda»/«usted lo nota» (38% de tope,
puesto en la Séptima ronda del sistema) dejaba a veces esa sección
invisible igual, sólo que ahora por el motivo contrario: apretada contra
el mínimo en vez de comerse todo. Un porcentaje fijo no le sirve a todas
las partidas por igual. Se cambió por un divisor arrastrable
(`.resizer-pie` en `App.tsx`): el jugador elige el alto con el mouse entre
un 10% y un 70% del panel, y la elección se guarda en `localStorage`
(`castronegro:alto-pie`) igual que la preferencia de animar los dados, así
que no hay que volver a ajustarlo en cada partida.

### 3.2-septies Ecos entre aventuras — EN CURSO (primeros tres)

La idea, tal como la trajo el jugador: que un final de una aventura deje
algo reconocible en otra que no es necesariamente la siguiente —al estilo
de la transición de estadio en *Spore*, donde lo que hiciste en una etapa
vuelve como algo concreto en la próxima—, para que cada partida de la
campaña se sienta distinta según lo que pasó antes, no sólo en la aventura
inmediatamente anterior.

**El motor ya tenía casi toda la pieza construida.** `sembrarHerencia`
(`engine.ts`) reenvía a la aventura siguiente toda consecuencia permanente
de alcance `campaign` o `world` de la aventura anterior, y como cada
aventura vuelve a reenviar lo que heredó, una consecuencia de la PRIMERA
aventura de la campaña sigue viva cuatro aventuras después sin que nadie
la copie a mano en cada paso — encadena sola, no hace falta un registro
nuevo. Y ya existía el operador `{op:'consecuencia', contiene:'...'}` para
que cualquier escena pregunte «¿pasó tal cosa antes?». Lo que faltaba no
era sistema: era contenido, escrito con esa pregunta en la cabeza.

**Regla de diseño para cada gancho:** narrativo primero, mecánico chico
después —nunca un stat permanente que reescriba el balance ya calibrado de
la aventura destino—, y sólo donde el roce temático es real, no en todos
los pares posibles. Y una regla que casi se pisa: `fondo-hablar`/
`fondo-bajar`, en El Sueño Debido, están comentadas a propósito como «la
única tirada que no se puede preparar invirtiendo puntos en la ficha, en
cualquiera de sus dos ángulos» — ahí el gancho de *Agua Quieta* se quedó
en narrativo puro, sin `bonus_dice`, precisamente para no romper esa
invariante.

- **Agua Quieta → El Sueño Debido** (`suenodebido.logica.ts`,
  `dormir-tres`). El brocal de Los Álamos y el brocal del sueño en Villa
  Requena son la misma clase de imagen —agua quieta, un reflejo que tarda—,
  así que si el investigador sostuvo la mirada o bajó al aljibe en *Agua
  Quieta*, la primera vez que el reflejo tarda en el sueño lo reconoce.
  Si en cambio lo selló, la línea es irónica en vez de tranquilizadora.
  Puramente narrativo, sin mecánica.

- **La Legua Perdida → La Firma Ajena** (`tercerumbral.logica.ts`,
  `buscar-partida`). Firmar un certificado con un lugar que se sabe falso,
  o quemar una mensura para que un problema deje de existir en el papel,
  deja el mismo instinto: saber cómo se ve, desde adentro, un registro al
  que le falta o le sobra algo. Un dado de bonificación en Uso de
  Bibliotecas al buscar la partida de Alejo, y una nota de jugador —sólo
  para quien lee, el investigador no nota el parecido— cuando aparece la
  corrección al margen.

- **La Firma Ajena → El Sueño Debido** (`suenodebido.logica.ts`,
  `hoja-agarrar`). Avalar o desmentir la identidad de Alejo Ferreyra es la
  misma pregunta que hace la quinta hoja del sueño: ¿este papel dice la
  verdad sobre quién es esta persona? Un dado de bonificación en Ocultismo
  —sumado a los dos que ya daba el trabajo de vigilia, aunque el tope del
  motor sigue en dos— y una línea de reconocimiento en el texto de éxito.

- **Agua Quieta → La Legua Perdida** (`la-legua-perdida.contenido.json`,
  tema `c-otro-lado` de Casimiro). El rumor de fondo: si Rosa Quintana
  desapareció (fin-quedarse), Casimiro —que ya tiene establecido que «el
  campo se acostumbra a cosas raras»— cuenta que un capataz de un campo
  cerca de Los Álamos le habló una vez de una mujer perdida de noche sin
  rastro, en un patio con aljibe, como acá hay un tanque. Encadenado
  además a que el jugador ya haya destrabado el miedo de Casimiro al
  oeste (`c-miedo`), para que no aparezca de la nada. Puramente
  ambiental: no pistas nuevas de peso, ni mecánica.

**Un bug real, encontrado haciendo este último.** Al armar el gancho lo
enganché primero a Eusebio Roldán (el agrimensor jubilado de *La Legua
Perdida*, que ya tiene cinco temas de conversación escritos) porque
encajaba mejor —es quien lee el diario del pueblo—. Al verificarlo con
una campaña real, ninguno de sus temas aparecía nunca, ni siquiera los
que ya existían. Roldán no figura en el `npcsPresent` de NINGUNA
localización del escenario, y el motor no tiene ningún mecanismo para que
un NPC «llegue» a un lugar a mitad de partida —`npcsPresent` es estático,
fijado en el JSON, y nada lo muta en todo el motor—. Sus cinco temas son
inalcanzables en juego real. No es este gancho el que lo rompió: ya
estaba roto. Reubicado el gancho en Casimiro, que sí está presente desde
el arranque. **Arreglado aparte en 3.2-octies**, más abajo.

**Segunda tanda de ganchos.** Cuatro más, con el mismo criterio: el roce
temático tiene que ser real, no basta con que dos aventuras compartan
campaña.

- **La Legua Perdida → El Sueño Debido** (`suenodebido.logica.ts`,
  `ronda-mirar` y `ronda-buscar`). El final de caminar la línea del oeste
  (`fin-caminar`) deja una manía mecánica de verdad —«Compulsión de
  contar», +1 dado en Persuasión, −1 en Descubrir— que ya cruza sola por
  ser cicatriz mental. Así que acá NO se agrega mecánica: se agrega que la
  primera noche la nombre, porque la ronda del brocal es literalmente una
  fila de gente dando la vuelta, y alguien con esa manía no podría no
  ponerse a contarla. Lo que descubre contando es la parte que importa: en
  una fila que gira no hay un primero, y una cuenta sin primero no se
  puede ni empezar. Aparece falle o acierte la tirada: no gatea nada.

- **Irse antes → El Sueño Debido** (`suenodebido.logica.ts`,
  `fondo-hablar` y `fondo-bajar`). El primer gancho que no mira UN final
  sino un patrón: cuenta cuántas veces el investigador eligió irse sin
  contestar —Agua Quieta, La Legua, La Firma Ajena escriben esa decisión
  igual, «El investigador se fue de X sin…», así que se cuentan por el
  prefijo común— y al pie del brocal, cuando todavía se puede elegir otra
  cosa, lo dice. Va como `jugadorNota` y no como pista a propósito: el
  investigador no lleva esa cuenta y no debería. El texto escala con el
  número, y con tres nombra los tres lugares. El final de irse de El
  Invierno Debido no registra consecuencia —a propósito, ver
  `desenlacePrevio`— así que no entra en la cuenta y el tope real es tres.

- **La Firma Ajena → El Invierno Debido** (`inviernodebido.logica.ts`,
  `ayudar-a-irse` y `convencer-un-ano`). Quemar la carta y la fotografía
  (`fin-quemar`) es elegir, con las propias manos, que una pregunta se
  quede sin con qué contestarse. Las dos salidas de El Invierno Debido que
  no resuelven nada son la misma decisión con otro nombre, y el texto lo
  dice: «aquella vez lo llamaste cerrar el asunto; ésta lo llamás un año
  más». Narrativo y nada más.

- **La Legua Perdida → La Firma Ajena** (`tercerumbral.logica.ts`,
  `cotejar-testimonios`). El contrapunto exacto del gancho de la ronda
  anterior: aquél premiaba haber torcido un papel, éste mira al que hizo
  el trabajo honesto. Levantar el acta del lado oeste (`fin-medir`) fue
  medir tres veces, con testigos y firma, demostrar que el campo no cierra
  — y que la demostración no le sirviera a nadie. Poner los tres
  testimonios de Los Cardales en columnas es repetir ese gesto. Nota de
  jugador, no pista: el investigador no está en condiciones de sacar esa
  conclusión sobre sí mismo mientras la está repitiendo.

Verificados igual que los cuatro anteriores —`resolver` llamado directo
con un `GameState` mínimo— y comprobando en cada uno las dos direcciones:
que el eco aparece con el antecedente y que NO aparece sin él. En los dos
de El Invierno Debido se comprueba además que no queda un párrafo vacío
cuando el antecedente falta, que es el modo en que este patrón
(`cond ? texto : ''`) se rompe si alguien olvida el `.filter(Boolean)`.

**Quedan pendientes** cualquier otro que surja jugando. La lista crece con
la campaña, no de una sentada.

### 3.2-octies Eusebio Roldán no estaba en ninguna parte ✔ ARREGLADO

Encontrado de rebote, armando el gancho del rumor: el tema nuevo que le
había colgado a Eusebio Roldán no aparecía nunca, y al mirar por qué
resultó que **ninguno** de sus temas aparecía nunca, en ninguna
localización, desde que la aventura existe.

**El bug era doble, y las dos mitades se tapaban entre sí.** `npc-eusebio`
no figuraba en el `npcsPresent` de ninguna localización de *La Legua
Perdida*. Eso, por un lado, hacía que `acciones.ts` —que exige
`npcsPresent.includes(npc.id)` para ofrecer un tema— no ofreciera ninguno
de sus cinco, en ningún lado. Y por el otro, `narrator.ts` tiene una
excepción deliberada para los NPC creados en partida con `create_npc`, que
no figuran en ningún lugar porque aparecen donde está el investigador: un
NPC «sin lugar propio» se cuenta como presente EN TODAS. Eusebio caía en
esa excepción sin ser uno de ésos.

Resultado en la partida publicada: el juego decía «Eusebio Roldán está
acá» en las seis localizaciones —el alambrado del oeste y el pastizal
donde apareció Fermín incluidos— y no había manera de hablarle en ninguna.
Cinco temas escritos e inalcanzables, entre ellos `e-tercera` —el de la
tercera medición hecha de noche, con su rama crítica que revela una cuarta
al amanecer que Roldán no le contó nunca a nadie— y `e-mojon`, el único
que dice desde cuándo está grabado el círculo. Nada fallaba, nada aparecía
en rojo: simplemente no había botón.

**El arreglo es de una línea, y el `opening` ya decía cuál.** El texto de
apertura pone explícitamente TRES personas en la galería del casco: «una
mujer de vestido oscuro, un hombre de alpargatas parado en el escalón más
bajo, y un viejo de traje que llegó por su cuenta y que nadie llamó». Ese
tercero es Roldán, y el casco ya listaba sólo a Herminia. Agregado
`npc-eusebio` a `casco.npcsPresent`. Eso arregla las dos mitades de una
vez: al tener lugar propio deja de contar como omnipresente para el
narrador, y pasa a tener sus temas ofrecidos donde corresponde.

**Y una validación nueva, porque esto no se puede arreglar solo.** Nada
del motor muta `npcsPresent` en ningún momento —no existe ningún efecto ni
herramienta que meta a un NPC declarado en una localización a mitad de
partida—, así que un NPC sin lugar no es contenido dormido que despierte
más tarde: es contenido muerto para siempre. `validarContenido.ts` ahora
lo rechaza al cargar, nombrando el NPC y cuántos temas quedan
inalcanzables, igual que el resto de las referencias rotas. Verificada
revirtiendo el arreglo a mano: el juego se niega a cargar con el mensaje
exacto. Auditadas las cinco aventuras: Eusebio era el único caso.

Comprobado además, con campañas reales, que los cinco temas son
alcanzables cumpliendo cada uno su condición, y que la matemática social
cierra: arranca en actitud 15, `e-tercera` pide un piso de 25, y los otros
temas suman +12 entre todos.

**Nota sobre `create_npc`:** la excepción del narrador queda como está y
ahora es correcta por construcción — con la validación puesta, el único
caso que puede caer ahí es el que la excepción documenta.

**El barrido de las cinco, y lo que salió al ampliar la red.** Pedido
explícito después del arreglo: ¿hay otro Eusebio escondido en alguna de
las otras cuatro? Auditadas las cinco con la validación nueva: no lo hay.
Eusebio era el único NPC de todo el catálogo sin lugar propio.

Para ir más allá de eso —no sólo «¿tiene lugar el NPC?» sino «¿el
recorrido real llega a cada tema?»— se sumó un chequeo a
`prueba-auditoria.ts` que compara la pista que cada tema cede contra lo
que el recorrido de verdad consigue, el mismo control que ya existía para
los detalles del mapa pero que nunca se había aplicado a los temas de
conversación. Es, con precisión, el chequeo que habría encontrado a
Eusebio sin que hiciera falta tropezar con él por accidente.

Con esa red más fina salió algo distinto, no otro Eusebio: en **La Firma
Ajena**, `a-quien` —la PRIMERA de sólo tres preguntas que admite
Alejo— pide Psicología con dificultad *hard*. Insistir después de fallar
cuesta 2 de paciencia sobre un total de 6 (`social.config.ts`); fallar esa
tirada varias veces seguidas —nada raro con una dificultad dura— puede
agotarle la paciencia a Alejo antes de llegar a `a-anos`, y hasta bloquea
`a-cuchillo`, que no pide tirada y por sí solo siempre cedería. Un patrón
parecido, más leve, en `n-duda` con Nación. Comprobado con diez semillas y
tres estrategias de recorrido distintas: ninguna garantiza las tres.

**Se revisaron las tres y se las deja así, a propósito.** Ninguna de las
tres pistas —la calma de Alejo al contestar, los ocho años que dice haber
andado, quién grabó la M del cuchillo— la usa después ninguna otra escena
como condición: son testimonio, no llave. Perderlas por mala suerte
empobrece una conversación, no traba la aventura. Y el costo de insistir
(2, contra 1 de preguntar por primera vez) está puesto a propósito para
desalentar exactamente la conducta que dispara esto —`social.config.ts`
lo dice en su propio comentario—, así que suavizarlo ahora sería
resolverle el riesgo justo a quien el diseño quiere que lo sienta. Bajar
`a-quien`/`n-duda` de *hard* a *regular* seguiría siendo la opción más
chica si algún día se decide tocarlo; no se tocó.

**Por eso el chequeo nuevo NO hace fallar la prueba.** Un recorrido de 260
turnos con semilla fija puede no cerrar un tema por motivos que no son
bugs —una tirada dura, una paciencia agotada, una cadena de requisitos que
el andador no encadena a tiempo, con una estrategia fija que no es cómo
jugaría una persona—. Convertir eso en luz roja habría dejado la batería
en rojo por una decisión de diseño ya tomada, y entrenaría a ignorar la
prueba la próxima vez que sí importe. Queda como lista para mirar: imprime
qué tema no cedió en cada aventura, y si algo aparece ahí siempre —como
apareció Eusebio, antes de tener nombre—, es la señal de que vale la pena
investigarlo a mano.

### 3.2-nonies Sexta aventura ✔ HECHA — *El Orden Debido*, el viaje de vuelta

**Sexto Umbral — causalidad.** El eje lo fija `canon.ts`, no yo. Y por primera
vez en la campaña la aventura no va hacia afuera: vuelve. Los puntos que hay
que cerrar están desparramados por el partido y seguirlos camina hacia
adentro, hacia Castronegro.

#### De dónde sale: cinco hilos que quedaron colgando

No hubo que inventarle un gancho. Estaban escritos desde 1926, cada uno
mencionado UNA sola vez y nunca pagado. Delfina Arce tiene dos colecciones de
puntos, y son distintas entre sí:

**El mapa de la escuela** (`d-puntos`, *El Invierno Debido*) — cuatro lugares
«que se pintan y no se tocan», contados por chicos de los campos de alrededor,
sin conocerse entre ellos:

| | |
|---|---|
| un aljibe | cerrado — Los Álamos, *Agua Quieta* |
| un mojón | cerrado — La Perseverancia, *La Legua Perdida* |
| **la base de un molino** | **abierto** |
| **el marco de una puerta que ya no tiene puerta** | **abierto** |

**Los rumores de viajeros** (`d-mapa`, *El Sueño Debido*) — cinco cosas raras
que Delfina anotó en tres años preguntándole a quien parara en el almacén. De
los cinco nombra tres:

| | |
|---|---|
| un alambrado que mide distinto según de qué lado lo caminás | cerrado — *La Legua Perdida* |
| un velorio de alguien que después apareció | cerrado — *La Firma Ajena* |
| **un campo donde no crece el pasto en una vuelta** | **abierto** |
| **los dos que no nombra** | **abiertos, a propósito** |

Delfina cierra las dos charlas con la misma frase, que es el pie de la sexta:
*«nunca supe qué hacer con eso»*.

#### El corazón: un umbral, literalmente

**El marco de una puerta que ya no tiene puerta.** Está en el contenido desde
la cuarta aventura y nadie lo visitó nunca. Es la palabra que le da nombre a
toda la campaña, hecha objeto físico: un marco parado solo en un campo donde
ya no hay casa alrededor, pintado de rojo cada año y no tocado.

Que la imagen central de la aventura del Sexto Umbral sea un umbral de
albañilería no es un chiste: es la escalera de revelación de v0.8 §3 aplicada
a un objeto. Nivel I, una anomalía chica —¿por qué lo pintan?—. Nivel V, que
no es una anomalía aislada sino una propiedad de la realidad.

Segunda locación: **la base de un molino** sin molino encima.

#### Por qué causalidad, y no otro tema

La pregunta de la aventura no es *qué son* estos lugares. Es **cuál fue
primero, y si los primeros causaron los últimos o al revés.** Delfina los juntó
«sin conectarlos entre sí»; el investigador llega con cinco aventuras de
consecuencias encima y es el único que puede ordenarlos.

Y ahí está lo que la vuelve la sexta y no otra: **el motor ya es una máquina de
causalidad.** `sembrarHerencia` viene arrastrando consecuencias permanentes de
aventura en aventura desde la primera, y los ecos de 3.2-septies las leen. La
aventura convierte esa mecánica en tema. El horror no es que pase algo raro:
es descubrir en qué orden pasó, y que el orden no es el que uno supone.

#### Cómo termina, y qué deja armado

El último punto del mapa —el campo donde no crece el pasto en una vuelta— es
el más cercano al pueblo. La aventura **termina a la vista del obelisco, sin
entrar**. Eso es todo el guiño al módulo: se ve, no se toca, no se explica.

#### Y entonces la séptima

`suenodebido.ts` fija que los siete Umbrales son **manifestaciones de una misma
estructura**, y en `canon.ts` sólo el Primero tiene nombre geográfico. Ya hay
precedente de que no es un lugar por Umbral: el Cuarto y el Quinto son los dos
Villa Requena. Así que el Séptimo no necesita pueblo propio.

**La séptima es el módulo original**, y cierra la espiral:

| # | Umbral | Aventura |
|---|---|---|
| 1 | tiempo, observación y memoria | *Agua Quieta* toca su **borde** |
| 2 | espacio | *La Legua Perdida* |
| 3 | identidad | *La Firma Ajena* |
| 4 | muerte | *El Invierno Debido* |
| 5 | sueño | *El Sueño Debido* |
| 6 | **causalidad** | ésta — el viaje de vuelta |
| 7 | **realidad** | el módulo, que es además el **centro del Primero** |

«Realidad» como eje del Séptimo encaja con lo que el módulo es de verdad: no un
monstruo, sino un pueblo donde una familia lleva trescientos años editando qué
cosas son ciertas y administrándolo como un trámite. Cruzar ese umbral es
entender que los siete eran uno.

Ver [CANON-MODULO-ORIGINAL.md](CANON-MODULO-ORIGINAL.md) para el puente
completo con el módulo publicado.

#### Deuda de tiradas, contada de verdad

Misma cuenta que se hizo para la quinta, ahora sobre las cinco publicadas. El
sistema tiene 27 habilidades. Reparto real:

```
16 psicologia · 16 descubrir · 10 persuasion · 8 fotografia · 5 POW
 4 ocultismo · 3 biblioteca · 2 buscar_libros · 2 ciencia_naturales
 2 intimidar · 2 STR · 1 cada una: orientarse, trepar, medicina,
 primeros_auxilios, escuchar, historia, antropologia, sigilo, labia, CON
```

**Sin pedirse NUNCA en toda la campaña:** `saltar`, `nadar`, `mecanica`,
`esquivar`, `pelea`, `armas_fuego`, `arrojar`, `mitos`, `credito`.

De ésas, las que esta aventura puede estrenar sin forzar nada:

- **`mecanica`** — la base del molino sin molino: qué se desarmó, cuándo, y si
  lo desarmaron o se cayó. Es la única de las nueve que pide una escena de
  investigación y no una pelea.
- **`credito`** — cruzar el partido preguntando en campos ajenos. Quién le abre
  la tranquera a un forastero y quién no depende de cómo viene vestido, y eso
  en 1928 se llama Crédito.
- **`orientarse`** — existe pero se pidió UNA sola vez en cinco aventuras, y
  esta aventura es literalmente ir de un punto a otro del partido con un mapa
  dibujado por una maestra. Debería ser un pilar acá, no una curiosidad.

Las otras seis son de combate o de Mitos y no son asunto de esta aventura.
`mitos` no se tira nunca por decisión de diseño.

**Tres habilidades que el sistema no tiene y van a hacer falta ✔ AGREGADAS**
(agosto de 2026, antes de escribir la séptima — ver §3.2-quaterdecies).
Al buscarlas para esta aventura resultó que no existen en `rules/skills.ts`
(son 27 y ninguna de éstas está). No se agregan ahora —agregar una habilidad
toca las fichas pregeneradas, las ocupaciones y el reparto de puntos de la
creación, y no hay que hacerlo en medio de escribir contenido— pero quedan
anotadas con su caso de uso ya identificado:

| Habilidad | Base sugerida | Para qué, concretamente |
|---|---|---|
| `arqueologia` | 1 | Fechar una piedra trabajada y decir quién la trabajó. El obelisco es una estructura anterior a Bernardo (v0.7 §8) y hoy no hay con qué leerlo |
| `geologia` | 1 | De dónde salió esa piedra. En una llanura sin canteras la pregunta «esto no es de acá» es media aventura |
| `navegacion` | 10 | Ubicarse a campo abierto sin caminos ni mojones. Hoy lo cubre `orientarse`, que es más «reconstruir un recorrido» que «cruzar sin referencias» |

Las tres son de CoC 7e, así que no inventan nada. La sexta se escribe con lo
que hay —`orientarse` cubre lo esencial— y cuando se agreguen se revisa si
alguna escena de acá conviene repartirla mejor.

### 3.2-decies "Pedir" no es un verbo del motor ✔ ARREGLADO

Encontrado escribiendo la sexta, y resultó estar agazapado en dos aventuras
ya publicadas. Un tema de conversación cuya `intencion` dice «Le pido a
X…» no se puede preguntar nunca, **ni apretando el botón** —el jugador
hace clic, y el motor contesta «Hacés eso» y describe el lugar, como si
hubiera escrito una frase sin sentido.

**La causa exacta, en dos archivos.** `intent.ts` recorre una tabla de
verbos reconocidos —`preguntar` está, con «pregunt», «le consulto»,
«indago», «interrog»; «pedir» no está en ningún lado de la tabla— y fija
`verbExplicit = verb !== 'desconocido'` **antes** de asignarle un verbo
de compromiso a una frase sin verbo reconocido. Con «le pido…», ningún
verbo matchea, así que `verbExplicit` queda en `false` para siempre,
aunque dos líneas más abajo el motor le ponga `verb = 'hablar'` porque el
objetivo es un NPC. Y `offline.ts` tiene una rama —con un comentario que
básicamente describe este caso al pie de la letra, «el jugador escribió
un verbo que el motor no tiene, apuntando a algo que sí existe»— que
desvía toda frase con `verbExplicit: false` hacia la respuesta genérica
de observar, **antes** de llegar al `if (target.kind === 'npc') return
talkTo(...)` que resolvería la conversación. La rama existe a propósito,
para que «el aljibe» sin verbo se mire en vez de ignorarse; el problema
es que no distingue esa frase de una que sí tenía verbo, sólo uno que no
está en la tabla.

**Se encontró en tres, no en una.** `e-medir` (La Legua Perdida, «Le pido
a Eusebio que mida conmigo») y `r-para-que` (El Invierno Debido, «Le
insisto a Ramona con para qué sirve pintar el círculo» — el verbo
`insistir` tampoco está en la tabla) estaban rotos desde que se
escribieron esas aventuras, publicados y sin que nada lo notara. Los tres
se reescribieron con un verbo de la tabla, conservando alguna `clave` que
la nueva frase siguiera conteniendo.

**No se arregló el motor.** Cambiar el orden de esas dos líneas en
`intent.ts`, o hacer que la rama de `offline.ts` chequee `target.kind`
antes que `verbExplicit`, es la reparación real y de más alcance —
arreglaría cualquier frase futura con «pedir», «solicitar», «insistir» o
cualquier otro sinónimo fuera de la tabla, no sólo las tres que se
encontraron—. No se tocó en esta ronda porque cambia cómo se clasifica
TODA frase del juego, no sólo la de un tema, y ese es un cambio que pide
su propia ronda de verificación, no un apurón al final de escribir una
aventura.

**Lo que sí queda, permanente: una prueba en la auditoría.** Por cada
tema, en el lugar donde su NPC está, `prueba-auditoria.ts` clasifica la
`intencion` exacta con el motor real y exige que resuelva `target.kind:
'npc'` del NPC correcto **y** `verbExplicit: true`. No hace falta jugar
para encontrarlo —es una propiedad de la frase, no del estado— así que
corre en la capa estática, instantánea, sobre el catálogo entero. Verificada
revirtiendo a mano la frase de `d-curato` a su forma rota: la prueba la
caza con el motivo exacto. Las 86 intenciones de tema de las seis
aventuras publicadas pasan.

### 3.2-duodecies Un botón que no se reconocía a sí mismo ✔ ARREGLADO

Reportado jugando El Invierno Debido: dejar a Cirilo Sosa fuera de combate y
después tocar «Preguntarle algo» —el único botón que quedaba para hablar con
Ramona en ese momento— contestaba con el genérico de no-entendí («Pregunte
lo que tenga que preguntar…») en vez de la escena escrita para eso (Ramona
arrodillada al lado del hijo, «Salga de mi casa»).

**La causa, prima hermana de la de 3.2-decies pero no la misma.**
`temaPorFrase` (offline.ts) selecciona un tema buscando alguna de sus
`claves` DENTRO de la intención ya clasificada. El tema `r-cirilo-
inconsciente` tenía `intencion: 'Le pregunto algo a Ramona'` y sus claves
eran `["lo que se repinta", "cada invierno", ..., "cirilo", "el
muchacho"]` — ninguna aparecía en esa frase. El tema no se podía
seleccionar **ni con su propio botón**: caía siempre al `sinTema()`
genérico, con el estado de Cirilo inconsciente y todo. Arreglado sumando
`"algo"` a sus claves.

**Sumada una segunda prueba permanente**, al lado de la de 3.2-decies:
para cada tema, `classify()` real sobre su propia `intencion` tiene que
contener alguna de sus propias `claves` —réplica exacta de
`i.norm.includes(clave)`, sin normalizar la clave, porque `temaPorFrase`
tampoco lo hace—. Verificada revirtiendo el arreglo a mano: la caza con el
motivo exacto. Barridas las seis aventuras: era el único caso.

**De paso**, una constante huérfana en `suenodebido.logica.ts`:
`peleoConCirilo` estaba declarada y nunca se usaba —el mecanismo real de
«si le pegaste a Cirilo, Ramona no colabora» vive directo en el
`disponible` de los temas `r-1878`/`r-1878-forzado` del JSON, y funciona
bien; se verificó jugando (simulado) las dos ramas: sin pelea sale
`r-1878` por Persuasión, con pelea sale `r-1878-forzado` por Intimidar, y
las dos piden actitudes y dan texto distintos—. La constante no hacía
nada. Borrada.

### 3.2-undecies Se eliminó el Keeper IA ✔ HECHO

Decisión del jugador, marzo de 2026: **quedan los botones y el motor; se va
todo lo que existía para que narrara Claude.**

**Por qué se pudo hacer sin romper nada.** El modelo nunca fue dueño del
estado. La regla de dependencias del proyecto —`engine` jamás importa
`keeper`— existía precisamente para esto: el Keeper IA escribía las
oraciones y el motor decidía tiradas, gates, consecuencias, desenlaces y
guardado. Sacarlo no cambió **una sola regla ni un solo desenlace**, y la
batería completa pasó en verde a la primera.

**Qué se borró:** `src/server/` entero (Fastify + SSE), `keeper/keeper.ts`
(el tool loop contra el SDK), `keeper/prompt.ts`, `keeper/validate.ts`,
`keeper/context.ts`, `app/api.http.ts`, `scenario/aguaquieta.keeper.ts`
(el briefing con spoilers), `.env.example`, y las dependencias
`@anthropic-ai/sdk`, `fastify`, `@fastify/static` y `concurrently` —110
paquetes menos en `node_modules`—. `npm run dev` ahora es sólo Vite, y
`vite.config.ts` perdió el proxy a `/api`.

**Dos cosas que NO eran de la IA aunque lo parecieran, y se conservaron:**

- `server/sanitize.ts` lo importaban `api.local.ts` y `api.ts` —es del modo
  local, vivía en la carpeta equivocada—. Movido a `app/sanitize.ts`.
- `canon/canon.ts` era el prefijo de contexto del Keeper, pero **contenía la
  biblia de canon entera**: los siete Umbrales, las invariantes duras, la
  escalera de revelación y la lista de lo sellado. El ROADMAP y
  `CANON-MODULO-ORIGINAL.md` la citan como autoridad. Se conservó como
  [CANON.md](CANON.md), que ya no lee ningún programa: la leen las personas
  que escriben aventuras.

**Y una corrección a algo que se dijo antes en este archivo.** Al documentar
el bug de los verbos se dijo que el riesgo remanente era «sobre texto libre
que un jugador tipee con sus propias palabras». Eso era falso: el cuadro de
escritura libre estaba gateado detrás de `status.keeperMode === 'ia'`, así
que **en el sitio publicado nunca hubo entrada libre**, sólo botones. El
clasificador de verbos sólo vio jamás las intenciones que escribimos
nosotros en el contenido, que es exactamente lo que la prueba nueva de
3.2-decies cubre por completo. Al eliminarse el modo IA, esa caja quedó como
código muerto y se eliminó también.

**Qué queda, entonces:** un juego determinístico que corre entero en la
pestaña, sin servidor, sin cuentas, sin clave y sin costo, con el log en
IndexedDB. Que es, exactamente, como se venía jugando.

### 3.2-terdecies Séptima aventura — el diseño, en dos actos

El Séptimo Umbral (**realidad**) es el módulo original, y es además el centro
del Primero. No es «la octava»: es volver al lugar del que la campaña salió,
con seis aventuras de consecuencias encima.

Esto es el diseño. La aventura no está escrita todavía — mismo orden que se
usó con la sexta, donde el diseño fue un paso propio y anterior.

#### Lo que ya estaba decidido, y no se volvió a abrir

De [CANON.md](CANON.md) y [CANON-MODULO-ORIGINAL.md](CANON-MODULO-ORIGINAL.md):
el eje es realidad; el pueblo es Castronegro en la pampa (no hay dos); Bernardo
tiene el anillo y el ciclo de nacimientos cada treinta años; el obelisco es
anterior a él y lo leyó mal; y lo sellado sigue sellado. Los desenlaces tienen
que leer las consecuencias de las seis anteriores: **ése es el pago de toda la
campaña**, y es la única aventura escrita sabiendo que hay seis atrás.

#### Lo que se decidió ahora

| Pregunta | Decisión |
|---|---|
| Tamaño | **Dos aventuras**, 7a y 7b, cada una del tamaño normal |
| Dónde corta | 7a el pueblo · 7b la Casa de Díaz |
| Bernardo | **Se habla con él.** Es la pieza central de la 7b |
| Intervalo | **Horas.** La 7b arranca la misma noche que termina la 7a |
| El laberinto | Se baja, **no se recorre** |
| El anillo | Entra, y **ponérselo es un desenlace** |
| El cierre | Se puede cortar el ciclo, **sin saber si sirvió** |
| El gancho | Los dos cosidos: el mapa de Delfina lleva al pueblo, y en el pueblo faltan tres personas |
| Los títulos | **Rompen la fórmula «Debido»**, a propósito |
| Greedygut | Se conserva el nombre, como `Puddock` |

#### El corte, y por qué es geográfico y no dramático

**7a — el pueblo.** Todo lo averiguable desde afuera: la capilla que un pueblo
de seiscientos no usa, la biblioteca popular con su salita cerrada, el almacén,
el granero, el obelisco. Termina sabiendo que hay que subir a la casa de la
colina, y sin haber subido.

**7b — la Casa.** Bernardo, el mausoleo, la entrada al laberinto, el anillo.

El corte es geográfico porque el dramático —«7a termina al conocerlo»— hacía
que toda la primera aventura fuera una antesala, y una aventura entera que
consiste en conseguir una entrevista se lee como trámite. Así cada una tiene su
propio centro: la 7a es **un pueblo que no mira**, la 7b es **un hombre que
lleva la cuenta**.

**Horas, no meses.** Es la única vez en la campaña que dos aventuras se pegan.
Todas las anteriores dejan pasar meses —y `exposicionTrasMeses` los usa para
que la Exposición decaiga hasta su piso—. Acá no: se sube esa noche, con lo
puesto y con la Exposición de la 7a intacta. La mecánica dice lo mismo que la
ficción: esto ya no se puede dejar para mañana.

#### Los títulos

| | Título propuesto | Por qué |
|---|---|---|
| 7a | **Agua Blanca** | El nombre viejo del lugar (v0.7 §12), que hasta ahora apareció UNA vez en toda la campaña, en un asiento catastral, y que el escribiente que lo explica cree que habla de un mineral. Que sea el título es el descubrimiento: el pueblo se llamaba de otra manera |
| 7b | **El Vigésimo** | El mausoleo tiene veinte sarcófagos: diecinueve con momias y el vigésimo dice «Bernardo de Díaz 1580-», sin fecha de cierre, y está vacío. El título significa dos cosas y no se sabe cuál hasta el final — porque si el investigador se pone el anillo, el vigésimo puede ser él |

Las cuatro anteriores son la familia «Debido». Éstas dos se salen a propósito:
avisan que se cambió de régimen.

#### Lo que ya estaba escrito sin saberlo

Igual que en §4 del puente de canon, la campaña **ya venía escribiendo el
módulo**. Tres cosas que no hay que inventar porque ya existen en el contenido
publicado:

- **Del Valle ya es el pueblo de la misa.** El módulo dice que los buenos
  católicos viajan treinta kilómetros a otro pueblo a misa teniendo iglesia
  propia. En *El Orden Debido*, Remigia ya lo dijo: «Mi madre iba a misa a Del
  Valle. Treinta leguas de ida. Teniendo iglesia a tres». No hay que nombrar
  nada nuevo.
- **Y ya dijo por qué**: «allá la iglesia está, pero no es para nosotros».
- **El pueblo del oeste es Castronegro.** Remigia, en setenta y cuatro años, no
  conoció a nadie de un pueblo que está a tres leguas. Ése es el pueblo de la
  7a, ya descrito desde afuera, por alguien que no quiere ir.

**Los ojos verdes** son lo único de la firma del módulo que la campaña todavía
no gastó (regla 4 del puente). En la 7a valen un solo renglón, en un solo NPC,
sin comentario. En la 7b ya son la mitad del pueblo.

#### Bernardo, y el problema de escribirlo

La regla vigente era «Bernardo no aparece, ni de lejos, ni en sueños». Se
levanta acá porque acá es su lugar, pero el riesgo es real y es de tono: un
personaje que sabe todo y contesta, explica; y la regla de oro (v0.7 §15) dice
que cuanto más cerca de la verdad, **más información y menos certeza**.

La salida es la que ya funcionó dos veces en esta campaña. Aurelio Requena
sabe muchísimo y lo que dice no cierra; Ramona sostiene una obligación de
cuarenta años y admite de entrada que no sabe para qué sirve. Bernardo se
escribe igual, un escalón más arriba: **contesta todo lo que se le pregunta, y
lo que contesta no alcanza**. No miente por ocultar — miente porque interpretó
mal hace trescientos años y nunca tuvo con quién comprobarlo. Sus textos ya
son, por canon, «verdades reales mezcladas con conclusiones falsas» (v0.7 §7);
él en persona es eso mismo, hablando.

Lo que **no** puede pasar: que confirme qué es el Umbral, quién es el Primer
Rostro, o que Yog-Sothoth sea la explicación de algo. Sigue sellado, y él
tampoco lo sabe.

#### El laberinto: se baja y no se recorre

El módulo pone ~300 caníbales en kilómetros de túnel. Este motor no hace
dungeon crawl, y hacerlo sería la única parte de la campaña que se juega como
otro juego. Se entra a la primera cámara y se entiende qué hay más adentro sin
ir a contarlo: el ruido, el olor, las marcas en las paredes, algo que contesta.
Una o dos escenas. **El horror es saber que sigue, no medirlo** — que es el
mismo criterio con que la sexta terminó a la vista del obelisco sin entrar.

#### El anillo: `RingBond` deja de ser código muerto

`RingBond { itemId, bondedAt, removalLethal }` está en `shared/types.ts` desde
el principio, con un comentario que cita v0.7 §5.3, y **nunca se usó**: los
siete pregenerados nacen con `ringBond: null` y nada lo escribe jamás.

Acá se usa, y paga literalmente lo que sembró la quinta. *El Sueño Debido*
termina, en una de sus ramas, con «el investigador se anotó en la quinta hoja
en lugar de Aurelio Requena, y salió del brocal con algo que antes no traía».
Ponerse el anillo es esa misma decisión tomada despierto y con el nombre
puesto: **anotarse en lugar de otro**.

Tres cosas que el canon ya fija y hay que respetar: quitarlo puede matar al
portador; no controla el tiempo ni permite elegir fecha; y Bernardo **no** lo
creó. La herramienta nueva del motor tendrá que emitir su propio evento —igual
que `apply_mythos_knowledge` emite `MYTHOS_GAINED` y no `SKILL_IMPROVED`—
porque ponerse el anillo no es equipar un objeto.

#### Cómo cierra: se puede cortar, sin saber si sirvió

Al menos un desenlace corta el ciclo de verdad. **Ninguno confirma que eso
haya estado bien, ni que haya terminado algo.** Es la regla de oro aplicada al
final de toda la campaña, y rima con la cuarta, cuya pregunta central —¿sirve
de algo?— no se contesta en ninguna rama.

Las familias de desenlace, a desarrollar al escribir la 7b:

| | |
|---|---|
| **Cortar** | El ciclo se detiene. No se sabe si hacía falta que siguiera |
| **Heredar** | El investigador se pone el anillo. La cuenta sigue, con otra mano |
| **Denunciar** | Se saca del pueblo lo que se averiguó. Ya se probó en la cuarta que un juzgado no es una respuesta |
| **Irse** | La quinta vez que este investigador puede subir sin hacer nada. `vecesQueSeFue` ya lleva la cuenta desde la quinta |

#### Prerrequisito: tres habilidades que el sistema no tiene

Decidido: **se agregan antes de escribir**, como paso propio y probado. Es el
mismo criterio con que se escribieron el operador `consecuencia` y
`apply_mythos_knowledge` antes de la cuarta — la mecánica va antes que el
contenido que se apoya en ella.

| Habilidad | Base | Para qué, acá |
|---|---|---|
| `arqueologia` | 1 | Fechar el obelisco y decir quién lo trabajó. Es anterior a Bernardo (v0.7 §8) y hoy no hay con qué leerlo |
| `geologia` | 1 | De dónde salió esa piedra. En una llanura sin canteras, «esto no es de acá» es media aventura |
| `navegacion` | 10 | Cruzar a campo abierto sin caminos ni mojones. `orientarse` es «reconstruir un recorrido», que no es lo mismo |

Las tres son de CoC 7e. Tocan `rules/skills.ts`, las fichas pregeneradas, las
ocupaciones y el reparto de puntos de la creación, así que van solas, con su
prueba, y sin contenido nuevo encima.

#### Orden de trabajo

1. ~~Las tres habilidades, con prueba propia.~~ ✔ HECHO — §3.2-quaterdecies
2. ~~La herramienta del anillo (`RingBond`), con prueba propia.~~ ✔ HECHO —
   §3.2-quindecies
3. ~~**7a — Agua Blanca.**~~ ✔ HECHA — §3.2-septdecies
4. **7b — El Vigésimo**, que lee los desenlaces de la 7a igual que la quinta
   lee a la cuarta.

Y una restricción que no cambia: el material de Chaosium sigue sin entrar al
repositorio. Esto son notas y mapeo propios, no transcripción.

### 3.2-quaterdecies Arqueología, Geología y Navegación ✔ AGREGADAS

Primer paso del orden de trabajo de la séptima, y se hizo solo: **la mecánica
va antes que el contenido que se apoya en ella**, igual que el operador
`consecuencia` y `apply_mythos_knowledge` se escribieron antes de la cuarta.

| Habilidad | Base | Contra qué se distingue de la que ya había |
|---|---|---|
| `arqueologia` | 1 | `historia` ubica un objeto en SU época. Arqueología fecha una piedra trabajada y dice quiénes la hicieron — que no es lo mismo cuando lo que hay que fechar es anterior a todo lo que el investigador sabe |
| `geologia` | 1 | `ciencia_naturales` mira el suelo. Geología mira de dónde vino lo que está apoyado encima |
| `navegacion` | 10 | `orientarse` es reconstruir un recorrido, apoyándose en referencias que ya existen. Navegación es cruzar donde no hay ninguna |

Las tres son de CoC 7e con sus bases del manual, así que no inventan nada.

**Y quién las tiene de oficio.** La regla del proyecto es ocho habilidades por
ocupación, ni más ni menos, así que cada una entró sacando otra. Los tres
canjes, con su razón:

| Ocupación | Gana | Suelta | Por qué |
|---|---|---|---|
| Anticuario | `arqueologia` | `antropologia` | No interpreta las costumbres de un grupo: tasa objetos. «Reconoce una fecha por la técnica» es literalmente fechar una pieza trabajada |
| Agrimensor | `geologia` | `historia` | Mide y firma terreno, no fecha épocas. De qué está hecho lo que pisa es su oficio; ubicar un mueble en su siglo no |
| Capataz | `navegacion` | `trepar` | En la llanura no hay a qué subirse, y su trabajo es cruzar campo abierto hasta una aguada sin que haya camino |

El capataz queda con **Orientarse y Navegación a la vez**, y no es redundante:
una es cruzar sin referencias, la otra reconstruir por dónde se pasó. Es
exactamente el tipo que «lee el terreno como otros leen un diario».

Ninguna de las tres que se soltaron queda huérfana —Antropología le queda al
escribano y al ocultista, Historia a otras siete, Trepar al domador—, y eso
ahora lo comprueba una prueba, porque es la clase de agujero que no se nota:
sacarle una habilidad a la ÚLTIMA ocupación que la tenía la deja sin dueño
profesional, y las aventuras que la piden pasan a tirarla siempre en base.
`nadar` y `mitos` siguen siendo las dos huérfanas a propósito.

Además se pueden comprar con interés personal, como cualquier otra que no sea
`mitos`: verificado en el navegador, 75 puntos llevan Arqueología de 1% a 76%
y bajan el presupuesto personal de 130 a 55.

**Qué se actualizó solo, y por qué eso era el punto.** La ficha se arma
recorriendo `SKILLS` (`pregens.ts`, `rules/creacion.ts`) y la pantalla de
creación filtra sobre `SKILLS`, así que Elena y Tomás recibieron las tres en
su base sin tocar sus fichas, y las tres aparecen en el reparto sin tocar la
interfaz. Cero archivos de contenido modificados.

Las pruebas nuevas van en `prueba-creacion.ts` y no en una suite propia,
porque el lugar donde una habilidad nueva se nota es la creación. Cubren lo
que se propaga en silencio si se rompe: ids repetidos, bases fuera de rango,
etiquetas vacías, que la ficha recién creada las traiga, las dos mitades de
cada canje, y que ninguna habilidad quede sin ocupación que la tenga.

### 3.2-quindecies El anillo: `RingBond` deja de ser código muerto ✔ HECHO

Segundo paso del orden de trabajo de la séptima.

`RingBond { itemId, bondedAt, removalLethal }` estaba en `shared/types.ts`
**desde el principio del proyecto**, con su comentario citando v0.7 §5.3, y no
lo escribía nadie: los pregenerados nacían con `ringBond: null` y ahí se
quedaba. Era la pieza más vieja de plomería sin usar del repositorio.

**La cadena entera, que es lo que hacía falta:** payload `RingBondedPayload` +
evento `RING_BONDED` (`shared/events.ts`) → reducer que escribe el vínculo
(`engine/reducers.ts`) → herramienta `bind_ring` (`engine/engine.ts`) → campo
`anillo` en `EfectoEscena` (`scenario/escena.ts`) → traducción a llamada de
herramienta (`keeper/escenas.ts`). Sin el último eslabón la herramienta existía
y ninguna aventura podía llamarla, que es exactamente cómo `RingBond` terminó
sin usarse durante todo el proyecto.

**Evento propio y no `ITEM_TRANSFERRED`**, por la misma razón que
`apply_mythos_knowledge` emite `MYTHOS_GAINED` y no `SKILL_IMPROVED`: no es
equipar un objeto —el objeto ya lo llevaba encima—, lo que cambia es el
investigador. De ahí que el estado viva en `Investigator.ringBond` y no en el
ítem.

**Qué rechaza, y por qué cada uno:**

| Rechazo | Por qué |
|---|---|
| El objeto no existe | Lo de siempre: un id mal escrito no puede pasar en silencio |
| No lo lleva encima | Ponerse algo es un gesto, no un traslado. Si hay que ir a buscarlo, eso es un `transfer_item` y va antes, en su propia escena |
| Ya lleva uno | `ringBond` es uno o ninguno. Sobrescribirlo perdería el primero sin dejar rastro |
| Sin `cause` | Un vínculo permanente sin causa en el log no se puede auditar después |

**Lo que la herramienta NO hace: cobrar.** Cordura, Estabilidad y Exposición
los aplica la escena que la llama, con los campos que ya existen. El motor
registra el vínculo; la aventura decide lo que cuesta. Mismo reparto que
`record_consequence`.

**`removalLethal` lo declara la aventura, no el motor.** El canon dice que
retirarlo *puede* matar al portador — «puede», no «mata». Por defecto es
`true`, que es el caso del anillo de rubí, pero el motor no lo supone.

Cruza a la aventura siguiente sin tocar nada: `heredarInvestigador` hace
`...inv`, así que el vínculo viaja solo. Es lo correcto para algo que no se
puede sacar sin morir, y ahora hay una prueba que lo fija.

`prueba-anillo.ts` (suite 26) — precedente exacto: `prueba-mitos.ts` también
es una suite entera para una sola herramienta con evento propio. Cubre las
cinco cosas que tienen que ser ciertas, incluido que el vínculo se relea
**desde el log** y no de la memoria del turno.

### 3.2-sedecies Doce finales que se leían con comas ✔ ARREGLADO

Encontrado escribiendo la séptima, al ir a fijarme qué forma tenía que darle a
sus desenlaces. Es de la familia de bug que este proyecto ya encontró seis
veces: **algo declarado en los datos que el código no interpreta como
esperaba, y que no rompe nada**.

`EfectoEscena.desenlace.text` estaba tipado `string`, y las tres primeras
aventuras lo escriben así, con `\n\n` entre párrafos. Las tres últimas —El
Invierno Debido, El Sueño Debido y El Orden Debido— lo escriben como **lista de
párrafos**, que es más cómodo de leer en el código y permite meter una línea
condicional en el medio. TypeScript no lo detectó porque el valor viaja hasta
la herramienta dentro de un `Record<string, unknown>`, y ahí
`toolReachEnding` hacía `String(raw.text ?? '')`.

`String(['a','b'])` es `'a,b'`.

Así que los **doce desenlaces** de esas tres aventuras salían como un solo
párrafo corrido, con una coma donde iba cada punto y aparte:

```
Llegás con la última luz.,Hay un pueblo. Tiene calles,…
```

En el texto que cierra la historia, que es el último que el jugador lee y el
que se queda pensando después.

**El arreglo va en la herramienta y no en el contenido**, por dos razones: son
doce lugares contra uno, y las dos formas son legítimas —una lista de párrafos
es más legible cuando uno de ellos es condicional—. `toolReachEnding` une la
lista con renglón en blanco, que es exactamente lo que las tres primeras
aventuras escriben a mano; el tipo pasa a `string | string[]` para que la forma
que ya usaba la mitad del contenido deje de ser un accidente.

Lo fija `prueba-desenlaces.ts`: que la lista se una con `\n\n`, que no queden
comas pegando dos párrafos, y que el string con `\n\n` siga pasando intacto.

### 3.2-septdecies Séptima aventura, primer acto ✔ HECHA — *Agua Blanca*

Seis lugares, catorce escenas, cuatro NPC, catorce temas, tres documentos y
cuatro desenlaces. Octubre de 1928, seis meses después de la sexta — y el 1º
de octubre porque ésa es la fecha con la que arranca el módulo original.

**Permeabilidad 22**, la más alta de la campaña (las otras seis van de 8 a 18),
y el claro del monolito en intensidad 9. Es el centro: tenía que notarse en el
número y no sólo en la prosa. Queda 10 para el segundo acto.

#### Lo que la aventura hace y ninguna anterior hacía

- **Estrena Arqueología y Geología**, agregadas para ella. El monolito se
  fecha con una y se ubica con la otra, y las dos preguntas son distintas: de
  cuándo es, y de dónde salió la piedra. La respuesta de la segunda es que el
  basalto más cercano está a ochenta leguas.
- **El círculo que no cierra.** El corazón de la aventura es medir a pasos el
  anillo de pasto enfermo: ocho de radio en cualquier dirección, cuarenta y
  cuatro de vuelta, cuando con ese radio tendrían que ser cincuenta. Se mide
  dos veces. Es la única cosa del pueblo que no tiene explicación por ninguna
  vía, y es la que deja contradicción en el tablero.
- **Lee las seis anteriores**, que es el pago de la campaña: las marcas del
  Círculo Rojo cambian qué se reconoce al leer el nombre viejo; la compulsión
  de contar de *La Legua* vuelve sola al medir el círculo; el acta que no le
  sirvió a nadie aparece como nota de jugador al medirlo; y haber cumplido un
  turno, haberse llevado el libro o haberse anotado en la quinta hoja cambia
  qué significa la última palabra que escribió el profesor desaparecido.

#### El gancho, cosido de los dos lados

Se llega por el último punto del mapa de Delfina y, ya en el pueblo, faltan
tres personas desde julio. El módulo aporta el caso; la campaña, la razón de
estar ahí. Nadie tiene que fingir una casualidad.

Los tres desaparecidos son el dispositivo del que vino antes: la libreta del
profesor quedó en el almacén y se puede leer entera. Llegó exactamente hasta
donde llega el investigador, y su última anotación es «no es una familia, es
un turno». La sala cerrada de la biblioteca tiene un registro de consultas con
dos renglones en dieciocho años, y son él y el otro, con tres días de
diferencia, la semana que desaparecieron los dos.

#### Tres bugs que encontró escribirla

1. **Doce finales se leían con comas** — §3.2-sedecies. Salió de ir a fijarse
   qué forma darle a los desenlaces de ésta.
2. **«Pedir» no es un verbo del motor, otra vez.** Un tema escrito «Le pido a
   Prudencio que abra la sala» no se podía preguntar nunca. Ya había pasado en
   §3.2-decies, y la prueba de auditoría que quedó de aquella vez lo cazó acá
   antes de que existiera una partida. Funcionó exactamente como se esperaba.
3. **`detalleVisto` sin `feature` es falso para siempre.** La condición hace
   `features.find(f => f.id === cond.feature)`; sin `feature` no encuentra
   nada y devuelve falso, así que el botón que gatea no aparece nunca. Tres
   botones quedaron invisibles. **Lo encontró jugar, no las pruebas** — un
   botón que no aparece no deja rastro de haber faltado, que es lo contrario
   del bug de `contiene` vacío (§4.6), que se cumple siempre. Ahora el
   validador rechaza las dos formas, y `prueba-carga-contenido.ts` lo fija.

#### Lo que NO tiene, a propósito

Bernardo no aparece. Nada de Mitos: `apply_mythos_knowledge` no se llama ni
una vez, y el precio de entender se paga en Cordura, Estabilidad y Exposición.
La casa de la loma se ve desde todas partes, se sabe que se sube caminando y
que abren la puerta, y no se sube: los cuatro desenlaces son subir, denunciar,
contárselo a Delfina, o irse. El que sigue es el primero.

Suite propia en `prueba-agua-blanca.ts` (suite 27), que además corre el
arreglo de los párrafos contra contenido real.

#### Un cuarto bug, reportado jugando después de publicada: los finales se
   desbloqueaban con una sola conversación ✔ ARREGLADO

`llamar` («ir a la cabecera») y `escribir` («escribirle a Delfina») estaban
gateadas con `{op:'pistas', minimo:3}` — **tres pistas cualesquiera**. Rascar
el cartel, mirar la loma de cerca y hablar una vez con Sixto ya daban cuatro,
así que los cuatro desenlaces aparecían juntos después de una sola
conversación, sin haber pisado el granero ni leído una línea de la libreta del
profesor. Reportado jugando, con captura de pantalla.

El arreglo no es «más pistas»: es pistas CONCRETAS, distintas para cada una,
porque las dos acciones significan cosas distintas.

- **`llamar`** ahora pide `{op:'pista', contiene:'tres cráneos recientes'}`.
  Denunciar necesita algo que denunciar, y «vi un cartel raro» no es una
  denuncia — los cráneos del granero sí.
- **`escribir`** ahora pide haber descubierto la última hoja de la libreta de
  Ferrari (`p-libreta-ultima`) Y seis pistas, no tres. Contarle a Delfina lo
  que averiguaste tiene que significar haber llegado adonde llegó el que vino
  antes, no simplemente haber caminado por la plaza.
- **`subir`** se dejó igual, a propósito: es la salida de quien tiene coraje y
  poca evidencia, y su propio texto lo dice («sabiendo lo poco que sabe»). Ya
  pedía una tirada de Descubrir real sobre un detalle concreto, no una cuenta
  de pistas genérica.

`prueba-agua-blanca.ts` fija el caso exacto reportado —esa misma secuencia de
cuatro acciones— y comprueba que después de ella `llamar` y `escribir` NO
están en `accionesDisponibles`, mientras que `subir` e `irse` siguen
ofrecidos. El recorrido de investigación completo se actualizó para seguir
alcanzando los cuatro finales con la vara nueva.

### 3.2-octodecies Unificación de canon — el bucle de Bernardo, y una corrección ✔ HECHO

Aparecieron dos documentos nuevos para consultar, ninguno de los dos para el
repositorio: una versión más vieja y más completa de la biblia de canon
(`biblia.md`, v0.7 sin condensar) y el texto completo del módulo original
traducido (`castronegro.md`). Los dos quedan fuera de git (`.gitignore`,
sección de documentos de diseño) por la misma razón que ya sacaba a `*.docx`:
son spoiler total o son de Chaosium, y el repo es público.

**Se usaron para tres cosas, sin transcribir nada:**

1. **Verificar la tabla de hechos duros de [CANON-MODULO-ORIGINAL.md](CANON-MODULO-ORIGINAL.md)
   contra el texto real.** Casi todo cerraba exacto —incluidas las cifras del
   laberinto (~300, kilómetros de túnel), que venían de una crítica de una IA
   sin fuente que yo mismo había puesto en duda y resultaron ciertas—, con una
   excepción: **«lenguas arrancadas» no aparece en el módulo.** Entró a la
   tabla por esa misma crítica sin fuente. Se sacó de las dos tablas que lo
   tenían (hechos duros y transposición pampa).
2. **Encontrar contenido de `biblia.md` que `CANON.md` (la versión vigente,
   condensada en marzo de 2026 al eliminarse el Keeper IA) había dejado
   afuera al resumir.** El más importante: el anillo tiene afinidad por sus
   futuros portadores (§5.2), y antes de fundar Castronegro Bernardo ya ve,
   en fragmentos sueltos, a quien más adelante se lo va a llevar (§6, "el
   bucle Bernardo → futuro portador"). No es una idea nueva: es canon v0.7
   que no había sobrevivido a la condensación. **Se adoptó** — decisión
   tuya, preguntada porque cambia qué puede insinuar Bernardo en *El
   Vigésimo*. Reincorporado a `CANON.md` como §5.2 y §6.
3. **Descartar, a propósito, lo que `biblia.md` marca como "CAMPAÑA
   PROPUESTA" y no como canon firme** — un §12 con una línea de tiempo previa
   a Bernardo (un "Círculo Rojo" c.1650-1675 recuperando conocimiento del
   anillo, "El Hombre que Miraba el Agua" c.1670-1680) y una lista de futuras
   aventuras con títulos que no son los que se terminaron escribiendo (*Las
   Cosas que Quedaron Despiertas*, *Los Siete Umbrales*, *El Último
   Observador*). No se adopta ninguna de las dos cosas: son un borrador de
   diseño anterior, superado por lo que el ROADMAP ya documenta en
   §3.2-terdecies. Dejarlas afuera evita además un choque de nombre: el
   "Círculo Rojo" de ese borrador (una secta pre-Bernardo) no tiene nada que
   ver con el Círculo Rojo real de esta campaña —el aparato administrativo
   que "anota lo que la parroquia no puede", inventado para *El Invierno
   Debido* (§3.2-quater) y ya en el contenido publicado—; al no traer el
   primero, el nombre sigue significando una sola cosa.

Ningún cambio de código. Sólo `CANON.md`, `CANON-MODULO-ORIGINAL.md` y este
ROADMAP.

### 3.2-novodecies Antagonismo activo en Agua Blanca ✔ HECHO — el cabo Restituto Ledesma

Quedó pendiente de la vez pasada: "si después de jugar la 7a sentís que sigue
faltando presión activa". La respuesta llegó junto con `castronegro.md`, y es
que el módulo original sí tiene una autoridad local que hostiga al
investigador — un hecho real, no una invención de la crítica sin fuente que
ya se descartó en §3.2-octodecies. Se adapta la IDEA —no hay una sola línea
transcripta del módulo—: nombre nuevo, pueblo nuevo, motivo nuevo.

**Restituto Ledesma**, cabo de la sub-comisaría, es la única autoridad que
vive en Castronegro —la policía de verdad está en la cabecera y ya archivó
las tres desapariciones sin pisar el pueblo—. Nuevo NPC en la plaza, con
cuatro temas de conversación:

- **`c-quien-es`** — se presenta y avisa, desde el minuto uno, que no va a
  ayudar. Es la primera cara hostil que ve el investigador, no una más.
- **`c-desaparecidos`** — pide explícitamente que no se reabra el caso, sin
  explicar por qué le importa a él.
- **`c-amenaza`** — gateado a haber encontrado los tres cráneos del granero:
  amenaza con anotar «merodeo» en su libro, lo que alcanza para una noche
  presa y perder el próximo tren. Es la primera amenaza concreta de toda la
  aventura, y viene de la única autoridad que hay.
- **`c-plata`** — tirada dura de Persuasión, gateada a la amenaza anterior:
  revela que cobra un sobre trimestral de la administración de la casa de la
  loma a cambio de anotar novedades. Nuevo secreto (`s-comisario-paga`) y
  nueva pista.

**Ninguna de las cuatro toca las condiciones de los cuatro finales.** Sólo
suma una pista más al conteo de `escribir` (que ya pedía seis, y las sigue
pidiendo) — no ablanda nada de lo que arregló §3.2-septdecies. `subir`,
`llamar` e `irse` no lo mencionan para nada.

**Dos bugs de la auditoría, atrapados antes de publicar:**

1. La intención de los tres primeros temas decía «le pregunto al cabo», y en
   la plaza ahora hay dos NPC (Sixto y Restituto): sin el nombre propio en la
   frase, el clasificador no sabía a quién de los dos le estaba hablando el
   jugador. Se corrigió agregando «Restituto» a cada intención — el mismo
   patrón que ya usan los temas de Sixto.
2. `c-amenaza` decía «voy a seguir preguntando», y `seguir` es una palabra
   reservada del clasificador (verbo `meta`, primero en la lista de verbos):
   ganaba antes de que el clasificador llegara a `hablar`. Se sacó la palabra
   de la intención y se ajustaron sus claves para que sigan coincidiendo.

Los dos son el mismo tipo de bug que ya cazó `prueba-auditoria.ts` en otras
aventuras (§3.2-decies, y el «pedir» de §3.2-septdecies): el validador de
contenido no los puede ver —la intención es una frase válida—, pero la
auditoría sí, porque de verdad clasifica cada una contra el motor real antes
de que exista una partida.

`npm run prueba:todo` completo, incluida la suite de Agua Blanca, la
auditoría de las siete aventuras y el build + `revisar:bundle`.

### 3.2-vicies La fonda: séptimo lugar de Agua Blanca ✔ HECHO

Segunda cosa real del módulo que faltaba en la 7a: un lugar donde dormir, con
hostigamiento nocturno que drena Cordura de verdad. Otra vez, se adapta la
IDEA —quedarse a dormir cuesta algo— y no una sola línea de `castronegro.md`:
el hecho concreto que ocurre de noche es invención propia, elegida para atar
el eje del **Primero** Umbral (tiempo, observación, memoria — la tabla de
[CANON.md](CANON.md)) a un objeto físico del pueblo, cosa que Agua Blanca
todavía no había hecho de forma jugable.

**Séptimo lugar: la fonda**, atendida por **Encarnación Zambrano**, viuda,
la única persona del pueblo que vive de que lleguen forasteros. Tiene un
patio con un aljibe que se usa para los caballos y que hace treinta años que
nadie del pueblo toma, sin que nadie lo haya prohibido nunca — su único tema
de conversación (`e-aljibe`) lo cuenta y revela su secreto
(`s-encarnacion-aljibe`).

**La escena (`noche-posada`).** Acción nueva, visible sólo de noche
(`{op:'hora', minimo:19}`) y sólo en la fonda: tratar de dormir. Un ruido de
agua a medianoche, el aljibe que queda perfectamente inmóvil justo después de
que algo cayera adentro, un cielo reflejado que no es el de esta noche, y una
forma del otro lado del reflejo que saluda antes de que el investigador haga
ningún gesto. Dos puntos de Cordura reales, exposición, una contradicción
para el tablero y una pista más —de las experienciales, `reliability:
unknown`— que suma al piso de seis de `escribir` sin ablandarlo: sigue
pidiendo las mismas seis pistas de siempre, ahora con una fuente más posible.

**No toca ningún final.** `subir`, `llamar` e `irse` no la mencionan, y
`escribir` sigue pidiendo exactamente lo que pedía después de §3.2-septdecies.
Es la primera aventura de la campaña con siete lugares en vez de seis.

`npm run prueba:todo` completo otra vez, incluida la auditoría (mapa
simétrico de 7 lugares, secreto de Encarnación con camino, escena sin
explotar) y el build + `revisar:bundle`. Verificación en navegador: la app
carga y el menú responde: llegar a Agua Blanca por la interfaz real exige
haber terminado las seis aventuras anteriores, así que la prueba de la escena
en sí se apoya en la suite determinística, que corre exactamente el mismo
`Turn.executeTool` / `accionesDisponibles` que usa la UI.

### 3.2-unvicies El bazar de Herminio y la segunda entrega de Mitos ✔ HECHO

Tercera cosa real del módulo original que se adapta a Agua Blanca —después
del cabo (§3.2-novodecies) y la fonda (§3.2-vicies)—: una tienda de
curiosidades que no debería poder sostenerse en un pueblo de seiscientas
personas, y que en realidad es un tercer nodo de la misma red de la casa de
la loma que ya usan la salita de la biblioteca (§`s-prudencio-donante`) y el
cabo (§`s-comisario-paga`). Esta vez, a pedido explícito tuyo, con Mitos de
Cthulhu de verdad — pero **objeto, dueño y textos son invención propia,
ninguna línea es del módulo**, ni siquiera cuando la pegaste directo en el
chat: esa restricción no se negocia, la pidas como la pidas.

**Octavo lugar: el bazar**, atendido por **Herminio Díaz** —primo lejano de
la familia fundadora, con los mismos ojos verdes que ya lleva Sixto (regla 4
de [CANON-MODULO-ORIGINAL.md](CANON-MODULO-ORIGINAL.md) §5, usada por primera
vez del lado Díaz)—. Un tema de conversación (`h-negocio`, Persuasión difícil)
revela que reenvía sin abrir la mitad de sus cajones a la casa de la loma.

**Tres objetos, cada uno con su propio mecanismo:**

- **La talla verde** — Arqueología revela que está tallada con la misma
  técnica que el monolito. Ahí se abre `talla-girar`, la única acción nueva
  con aviso explícito: el propio hallazgo dice que conviene no seguir
  mirando, y la acción está para quien decide mirar igual.
- **El cilindro de cera** — sin tirada, como la convención real de este tipo
  de objeto en la mesa: escucharlo cuesta Cordura por el solo hecho de
  escucharlo, no por fallar nada.
- **El cuaderno de cuentas tachado** — Buscar Libros (difícil) revela, contra
  la luz, una segunda cuenta de nacimientos que no lleva el cura. Deja una
  contradicción con el registro de la parroquia (`doc-bautismos`).

**`girar-talla` es la segunda y última entrega de Mitos del juego.** La
primera es El Invierno Debido (§4.6, "la cuarta hoja"): un punto de Mitos,
detrás del mismo patrón —aviso explícito dentro de la propia ficción, sin
tirada que lo evite, el jugador elige igual—. Se actualizó el comentario de
esa escena, que decía "la única", porque dejó de serlo.

**No toca ningún final** — igual que el cabo y la fonda, sólo suma piso a
`escribir`.

**Un bug de infraestructura, no de contenido, que encontró la auditoría al
crecer el mapa a ocho lugares:** `prueba-auditoria.ts` camina cada aventura
sola, y su tope de reintentos por acción (4) contaba `ir:plaza` como UN SOLO
id sin importar desde qué punta del mapa se volviera. Con seis puntas
saliendo de la plaza —capilla, almacén, biblioteca, granero, fonda y ahora el
bazar—, el cupo de vueltas se gastaba antes de terminar de explorar, y el
andador quedaba varado en la fonda sin poder volver a buscar el bazar. No era
que el bazar fuera inalcanzable: era que el propio andador se quedaba corto
de piernas. Subido a 6. Es un ajuste del test genérico, no de esta aventura
en particular, y no esconde una acción rota: una que de verdad no se pueda
completar sigue fallando igual, la reintente seis veces o sesenta.

`npm run prueba:todo` completo, incluida `prueba:mitos` (para confirmar que
la segunda entrega acumula bien con la primera) y la auditoría con el cupo
nuevo, en las siete aventuras.

### 3.2-duovicies El Vigésimo — el diseño se cierra

Cuarto y último punto del orden de trabajo de §3.2-terdecies. Cuatro
preguntas que quedaban abiertas, resueltas en dos rondas:

| Pregunta | Decisión |
|---|---|
| Puente 7a→7b | **Los cuatro finales de Agua Blanca llevan a la Casa**, cada uno con su propio marco: `subir` ya está adentro; `llamar` vuelve al otro día con el sargento; `escribir` no puede dormir y sube igual esa noche; `irse` da la vuelta a tres leguas —el propio texto de ese final ya lo dejó sembrado: «no vas a volver a saber de Castronegro hasta que Castronegro sepa de vos»—. Mismo criterio que usa toda la campaña: la aventura siguiente lee la consecuencia real, sea cual sea, nunca exige una específica |
| Formato de la Casa | **Rompe el molde.** Nada de lugares libres con botones de ir: una secuencia fija de escenas, una lleva a la siguiente. Es la primera vez que la campaña lo hace, y marca que esto ya no es una investigación |
| Cómo se habla con Bernardo | **Audiencia acotada**, no temas libres. Un límite real de preguntas antes de que dé la charla por terminada — obliga a elegir, no a agotar la lista |
| Puddock y Greedygut | **Nombres propios nuevos para los dos**, mismo rol narrativo (el familiar de Bernardo; la entidad que aparece tras un cambio de portador). El equivalente de Puddock no aparece hasta que alguien herede el anillo, que es cuando el canon ya dice que aparece |
| Cómo se corta el ciclo | **Combate real**, con el motor de combate que ya existe (el mismo que usa Cirilo en *El Invierno Debido*) — sin que ganarlo confirme que sirvió de algo |

**Lo que esto implica construir, en orden:**

1. Nombres propios para los dos roles heredados del módulo (el familiar de
   Bernardo, la entidad post-cambio-de-portador).
2. Cuatro escenas puente, una por final de Agua Blanca, que narran cómo cada
   investigador llega esa noche (o al otro día) a la puerta de la Casa.
3. El mecanismo de audiencia acotada con Bernardo — previsiblemente
   extendiendo `patienceDelta` (`EfectoEscena.npc`, ya existe en el motor
   para otro propósito) en vez de inventar un campo nuevo.
4. La secuencia lineal: mausoleo (veinte sarcófagos, el vigésimo vacío),
   la entrada al laberinto (una o dos escenas, no se recorre), el cuarto de
   Bernardo.
5. Ficha de combate propia para Bernardo — inventada para esta campaña, no
   la del módulo: sólo se respetan los hechos ya fijados por canon (el
   anillo lo sostiene, sacárselo es letal, no controla el tiempo).
6. Los cuatro desenlaces (Cortar / Heredar / Denunciar / Irse), cada uno
   leyendo lo que corresponda de las seis aventuras anteriores.

Sigue sin escribirse. Es el paso que sigue.

### 3.2-trevicies Retrofit del granero — el primer combate de Agua Blanca ✔ HECHO

Antes de escribir la Casa, un pendiente de Agua Blanca (7a) que quedó
anotado en la ronda de preguntas del Vigésimo: un combate opcional en el
granero, con una criatura propia —no la del módulo—, y un arma real
disponible para quien llega a la Casa sin una.

- **`it-hacha-granero`**, apoyada contra un poste, libre de tomar sin pelear
  nada.
- **`npc-cosa-grieta`**: algo que sale de la grieta si alguien mete el brazo
  más allá de los tres cráneos. Sin nombre, sin confirmar si es un Díaz, un
  Villeira-Pereira o algo que aprendió de cerca a parecerse a los dos.
  Bernardo y el laberinto siguen sin aparecer en la 7a — esto es un pariente
  suelto, no una confirmación de nada más grande.
- **`grieta-mas-alla`**: la escena, con `iniciaCombate` + `salidaPacifica`
  real (mismas herramientas que ya usa Cirilo en *El Invierno Debido*).
  Totalmente opcional: quien se conforma con los tres cráneos nunca la
  encuentra, y la suite de la HABLAR UNA VEZ... y el recorrido normal no la
  tocan.
- Deja una consecuencia (`scope: 'world'`) con el cruce cuerpo a cuerpo, para
  que **El Vigésimo** la lea al empezar y regrant el arma sin necesitar un
  mecanismo nuevo de inventario entre aventuras.

**Un bug de scene-bank, no de contenido:** la nueva escena competía por
prioridad con `granero-craneos` —las dos matcheaban la palabra «grieta»— y
en un empate de prioridad gana la que está antes en el array, así que
«Meto el brazo más adentro de la grieta» seguía repitiendo el texto de los
tres cráneos en vez de disparar el combate. Subida la prioridad de
`grieta-mas-alla` de 74 a 76 para que gane el empate. Encontrado por la
propia suite nueva, no por jugar.

`npm run prueba:todo` completo, incluida la auditoría de las siete
aventuras con el nuevo combate en el mapa.

### 3.2-quatervicies El Vigésimo, escrita ✔ HECHA — séptimo Umbral, segundo acto

Cierra el orden de trabajo de §3.2-terdecies. La Casa de Díaz, la misma
noche que termina Agua Blanca — doce lugares, tres NPC nuevos, once temas de
conversación, un combate obligatorio y cuatro finales que leen lo que pasó
en la 7a. Adaptación por idea, no transcripción: ni el plano de la casa que
se pegó en el chat ni el texto del módulo entraron a ningún archivo.

**La planta baja y el primer piso se caminan libres**: vestíbulo, salón,
comedor, cocina, despensa y biblioteca en la planta baja; pasillo,
habitaciones de huéspedes y dormitorio de Bernardo en el primer piso.
**El sótano rompe el molde**, como ya se había decidido:
trastero → entrada al laberinto → laboratorio, sin conexión de vuelta
declarada — la primera vez que la campaña usa un pasaje sin retorno a
propósito, y por eso `prueba-auditoria.ts` ahora tiene una lista chica y
explícita de conexiones de ida conocidas, sólo para esta aventura.

**Los cuatro puentes.** Cada final de Agua Blanca abre El Vigésimo con su
propio marco —`subir` ya está adentro, `llamar` vuelve con el sargento al
otro día, `escribir` no puede dormir y sube igual, `irse` da la vuelta a
tres leguas, pagando la frase que el propio final de `irse` ya había
sembrado—. Implementado con cuatro temas de conversación de Ercilia,
mutuamente excluyentes por `{op:'consecuencia', contiene:...}`; no hizo
falta ningún campo nuevo del motor, sólo entender que la herencia entre
campañas (`Herencia`/`sembrarHerencia`, que ya existía) hace exactamente
este trabajo.

**El sigilo hace algo de verdad.** Registrar el dormitorio de Bernardo y
pasar al lado de lo que custodia el sótano son tiradas reales: fallar dega
ruido (una consecuencia que se puede contar), y una pifia en el dormitorio
manda al guardián arriba a ver qué fue ese golpe.

**La audiencia con Bernardo es acotada de verdad**, sin inventar mecanismo
nuevo: arranca en actitud 0, cada tema cuesta -10, y seis de los siete
temas piden un piso de -30 —a los cuatro reales, la actitud ya está en -40
y el resto queda cerrado—. Contesta todo (fundación, el anillo, el ciclo de
treinta años, los tres desaparecidos de la 7a, el laberinto) y no confirma
lo sellado (ni el Primer Rostro, ni qué es el Umbral, ni a Yog-Sothoth como
explicación de nada), tal como fija v0.7 §7.

**El combate es real y obligatorio.** Mismo motor que ya usa Cirilo en *El
Invierno Debido*. Bernardo empezó con una ficha demasiado dura —25 PV,
Pelea 65%, contraataque por defecto— y una investigadora de 11 PV moría en
dos o tres asaltos casi siempre; bajado a 16 PV, Pelea 45%, esquiva por
defecto, hasta que ganar o huir dejaron de ser un accidente de suerte y
pasaron a ser una posibilidad real. `resolve_flee` (ya existente, sin
salida de palabra para éste en particular) abre Denunciar/Irse; ganarle
abre Cortar/Heredar.

**Nombres propios, no los del módulo.** El familiar de Bernardo se llama
Ahijado (sin "el" adelante, a propósito — con "el Ahijado" el clasificador
lo confundía con Bernardo cada vez que una frase decía "el anillo" o "el
laberinto", porque "el" es la primera palabra de su nombre y una de las más
comunes del idioma). La entidad que aparece recién si alguien hereda el
anillo no tiene nombre todavía en el texto — aparece una sola vez, en el
desenlace de Heredar, sin confirmarse a sí misma.

**Bugs que encontró escribirla, todos antes de jugar:**

1. `{op:'no', de:[...]}` no es un array: es una condición sola. Cuatro
   condiciones rotas, mismo error las cuatro veces.
2. Una clave con tilde (`"cada treinta años"`) nunca matchea contra el texto
   ya normalizado, que le sacó la tilde — el propio comentario de
   `prueba-auditoria.ts` ya avisaba de este error exacto, y pasó igual.
3. El familiar llamado "el Ahijado" secuestraba el objetivo de cualquier
   pregunta a Bernardo que contuviera la palabra "el" —la mayoría—, porque
   los dos están presentes en el mismo lugar y el clasificador prioriza el
   primer nombre que aparece en el texto.
4. Una frase propia («…es mirado de vuelta desde otro momento») coincidía
   por casualidad con la cadena que `revisar:bundle` usa para cazar canon
   sellado que se filtró al bundle público — no había ningún secreto
   filtrándose, era una paráfrasis nueva de la Reciprocidad (que no está
   sellada) tropezando con el detector. Reescrita.
5. El combate contra Bernardo, tal como se diseñó la primera vez, era
   letal en dos asaltos para una investigadora pregenerada. No lo encontró
   ningún validador: lo encontró jugarlo de verdad con las herramientas
   reales de combate, en la suite nueva.

Suite propia en `prueba-el-vigesimo.ts`. `npm run prueba:todo` completo,
incluida la auditoría con las conexiones de ida ya conocidas, y el build +
`revisar:bundle`.

### 3.2-quinvicies Dos bugs reportados jugando en el navegador ✔ ARREGLADOS

El primer playtest real de El Vigésimo desplegado encontró dos cosas que
ningún validador ni suite había cazado, porque las dos son de interfaz, no
de contenido.

1. **El hacha del granero no aparecía como arma en el combate.** Se agregó
   como ítem cuando se escribió el retrofit del granero (§3.2-trevicies),
   pero un `Item` sólo cuenta como arma jugable si declara `armaId` —el id
   de `rules/armas.ts` con el que se pelea—, y esa línea faltaba. El motor
   no rechaza nada raro acá: el ítem simplemente no calificaba como arma, y
   `Combate.tsx` filtra las opciones exactamente por eso. Agregado
   `armaId: 'hacha-lena'`.
2. **Cualquier combate real arrancaba sin mostrar el texto que lo motiva.**
   `App.tsx` cambia a la pantalla de `Combate` en cuanto
   `GameState.activeCombat` está puesto, y esto pasa en el MISMO turno que
   la escena narra por qué empezó la pelea — React nunca llega a pintar esa
   narración antes de reemplazar toda la pantalla. No es nuevo de esta
   sesión: el mismo mecanismo ya lo tenía el combate de Cirilo en *El
   Invierno Debido*, sólo que nadie lo había reportado jugando hasta ahora.
   `iniciaCombate` ya tenía un campo `reason` sin usar en ningún escenario;
   se le puso un texto real a los tres combates de la campaña (la grieta del
   granero, el guardián del sótano, Bernardo) y `Combate.tsx` ahora lo
   muestra debajo del título, en vez de arrancar en blanco.

`npm run prueba:todo` completo otra vez, incluidas las dos suites de Agua
Blanca y El Vigésimo.

### 3.2-sexvicies El bug grave del segundo playtest: los dos combates se mezclaban

Jugando de verdad en el navegador —guardián del sótano, después Bernardo—
apareció el bug más serio de toda la séptima: al ganarle al guardián y
entrar en combate con Bernardo, la pantalla de Combate seguía mostrando al
guardián mezclado con Bernardo en el mismo registro, con las armas y los PV
del combate anterior. **Imposible de ganar**, porque ni siquiera se estaba
peleando lo que la pantalla decía.

La causa: `App.tsx` monta `<Combate>` cuando `GameState.activeCombat` se
pone, y lo desmonta cuando se limpia. Entre el fin del combate del guardián
y el arranque del de Bernardo, los dos montajes usan el mismo
`campaignId` —ningún prop cambia— así que React reutilizó el mismo
componente en vez de desmontar y volver a montar, y el `useEffect` que trae
rivales/armas/estado del combate nuevo nunca se disparó otra vez. La
pantalla se quedó peleando contra los datos viejos.

Es un bug de motor genérico, no de El Vigésimo: **le pasaba a cualquier
aventura con dos combates reales seguidos**, sólo que hasta ahora ninguna
los tenía —Cirilo, en *El Invierno Debido*, es el único combate de su
aventura—. Arreglado con una `key={state.activeCombat.startedAt}` en el
`<Combate>` de `App.tsx`: cada combate real tiene su propio id de evento
de arranque, así que React ahora sí remonta entre uno y otro.

**Otros tres, del mismo playtest:**

- **El cuchillo de cocina tampoco tenía `armaId`** —mismo error que el hacha
  del granero (§3.2-quinvicies), esta vez en El Vigésimo. Arreglado.
- **Bernardo agotaba la paciencia y decía la frase genérica de "tengo que
  hacer la cena"** —el aviso de paciencia en cero (`social.ts`) nunca tuvo
  forma de personalizarse por NPC: es un genérico pensado para alguien como
  Rosa, y le quedaba absurdo a un personaje central de otra escala. Se
  agregó `Npc.patienceExhaustedText` (opcional, sin romper a nadie que no
  lo declare) y Bernardo ya tiene el suyo.
- **Las cinco preguntas con tirada de Bernardo compartían la misma esquiva
  genérica** ("—No sé —dice—. Le estoy diciendo que no sé.") cuando la
  tirada de Psicología fallaba. Cada una tiene ahora su propia esquiva.
- **La apertura de Ercilia en el puente de `subir` prometía acompañar al
  sótano y no lo hacía** —el sótano era, de hecho, una salida más de la
  lista, sin nada que descubrir—. Se sacó la promesa falsa; queda pendiente
  (ver más abajo) convertir el acceso en algo que de verdad haya que
  encontrar.

**Lo que queda para una vuelta próxima, no resuelto todavía:**

- **Hacer secreto el acceso al sótano.** El motor no tiene hoy manera de
  ocultar una conexión: los botones «ir» se generan solos desde
  `connections`, sin gate, y `move_to_location` exige que el destino ya
  esté en esa lista aunque el movimiento lo dispare una escena. Hacerlo bien
  pide una función nueva —una conexión que exista para el motor pero no
  genere botón hasta que se cumpla una condición— y no una parchada de una
  tarde.
- **Cordura sin aviso en el momento.** La pérdida de Cordura es real —baja
  el número, cuenta para el techo de después de los Mitos, puede disparar
  fobias/manías— pero no hay ningún aviso visual puntual cuando pasa, sólo
  el número de la ficha que cambió. Es así en toda la campaña, no sólo acá.
- **Sin economía en el bazar.** Se puede llevar cualquier cosa de la tienda
  de Herminio sin pagar nada; no hay ningún sistema de plata o Crédito
  implementado todavía en ningún lado del motor.

### 3.2-septvicies Tercer playtest: el sótano se busca, Bernardo pelea, y el anillo tiene su momento

#### Conexiones ocultas: función nueva del motor

Lo que en §3.2-sexvicies quedó anotado como «pide una función nueva» se
construyó: **`Scenario.conexionOculta`**. Hasta acá toda conexión declarada
generaba su botón de «ir» desde el primer turno —el mapa no tenía forma de
esconder nada— y por eso el sótano de la Casa de Díaz, que la ficción trata
como secreto, se ofrecía en la lista como cualquier puerta.

Ahora el contenido puede declarar `conexionesOcultas: [{desde, hasta,
hastaQue}]`, y `accionesDisponibles` no genera el botón hasta que la
condición se cumpla. La localización sigue conectada para la auditoría de
alcanzabilidad: lo único que cambia es cuándo aparece.

**En El Vigésimo**: la escalera al sótano se mudó del vestíbulo a la cocina
—detrás de una puerta angosta sin picaporte, con su propio detalle
examinable y tirada de Descubrir— y sólo se abre con esa pista MÁS tres
pistas de la planta baja. El sótano dejó de ser una salida y pasó a ser un
hallazgo.

#### Bernardo peleaba de mentira

Reportado: «lo derroté muy fácilmente derribándolo y atacando». La causa no
era el balance sino una regla del motor que no se había mirado al escribirlo:
`ordenDeAsalto` excluye al NPC objetivo, así que **el rival de un combate
sólo devuelve el golpe si su `defensaPorDefecto` es `contraataca`**. Bernardo
estaba en `esquiva` —puesto ahí en §3.2-quatervicies justamente porque en
`contraataca` mataba a una investigadora en dos asaltos— y en `esquiva` no
podía tocar a nadie nunca: la pelea era un saco de arena.

Vuelto a `contraataca`, con los números medidos y no adivinados: **veinte
peleas simuladas por configuración**. Con el original (25 PV, Pelea 65%)
Elena Sartori moría 19 de 20; con el actual (14 PV, Pelea 30%) gana 3 de 20.
Ver más abajo lo que esto deja abierto.

#### Lo demás del reporte

- **El Ahijado no se explicaba.** Aparecía en la descripción del laboratorio
  y en un desenlace, sin que nadie dijera nunca qué es. Ahora la descripción
  aclara el nombre y hay un tema propio (`b-ahijado`): Bernardo cuenta que
  apareció el mismo año y en el mismo lugar que el anillo, que no come, que
  no envejece, y que se compromete a criarlo «porque el que tenía que
  criarlo ya no puede» —una pregunta abierta más, no una respuesta cerrada—.
- **«Lo que se saca de la casa» era inalcanzable si ganabas.** `denunciar` e
  `irse-vigesimo` pedían que Bernardo siguiera en pie, así que vencerlo
  borraba dos de los cuatro finales. Ahora los cuatro conviven: ganar agrega
  `cortar` y `heredar`, no reemplaza nada.
- **No había ningún momento del anillo.** Se pasaba del último asalto a los
  botones de desenlace, sin que el objeto del que trata la aventura entera
  llegara a estar en cuadro. Nueva escena `bernardo-caido`: en el piso, con
  la mano abierta, ofreciéndote las dos salidas con la misma voz.
- **No se sabía contra qué se peleaba.** La pantalla de combate mostraba
  nombre, arma y una barra. Ahora muestra también la descripción del NPC, la
  misma que el juego ya da al encontrárselo fuera del combate.

#### Dos arreglos de la propia auditoría

1. **El cupo de reintentos del andador no puede aplicarse a caminar.**
   `ir:vestibulo` es un solo id sin importar desde qué cuarto se vuelva, así
   que en un mapa con hub el cupo se gastaba yendo y viniendo. Ya se había
   parcheado subiendo el número dos veces (§3.2-unvicies); el problema no era
   el número. Los movimientos quedan fuera del cupo: el techo del recorrido
   es la cuenta de turnos.
2. **Un pasaje sin retorno no es un mapa mal conectado.** El andador prefiere
   lo no visitado, así que baja al sótano apenas se destraba y desde ahí el
   resto de la casa deja de existir para él —exactamente lo que le pasaría a
   un jugador que baje temprano—. La auditoría ahora lo detecta sola, con un
   BFS desde donde terminó el recorrido, y deja de exigir cobertura total en
   ese caso, igual que ya hacía cuando el investigador se muere.

#### Lo que esto deja abierto, y es decisión de diseño

**La pelea contra Bernardo no se puede balancear con un solo número.** Los
datos medidos: Elena Sartori (médica rural, Pelea 25%) gana 3 de 20; un
investigador de combate con Pelea 70% lo gana casi siempre. No hay valor de
PV que haga la pelea difícil para el segundo y posible para la primera —eso
es CoC funcionando como funciona—, y como `cortar` y `heredar` dependen de
ganarla, **hoy dos de los cuatro finales son prácticamente inalcanzables
para un investigador que no sea de combate**.

La salida no es tunear: es dar una segunda vía para quitarle el anillo que
no pase por Pelea, que es además lo que dice el canon (v0.7 §5.3: quitarlo
mata al portador). Sin escribir todavía.

Sigue pendiente de §3.2-sexvicies: aviso de pérdida de Cordura en el momento,
y economía para el bazar de Herminio.

### 3.2-duodetricies Cuarto playtest: Bernardo peleaba desde otro cuarto

#### El bug de motor, que era el mismo de siempre en otro lugar

Reportado: «otra vez está junto el enfrentamiento de la cosa con Bernardo».
No era el arreglo de la `key` de React de §3.2-sexvicies, que funcionó: era
un segundo bug, independiente y más profundo.

`ordenDeAsalto` —lo que decide quién más pelea en cada asalto— filtraba por
`npc.present`, que en este motor significa **«sigue en la historia»**, no
«está en este cuarto». Bernardo Díaz, esperando en el laboratorio dos cuartos
más abajo, cumplía la condición: repartía facazos durante toda la pelea del
trastero contra el que custodia la puerta. Por eso la pelea era imposible y
por eso Bernardo llegaba ya herido al enfrentamiento que debía ser el primero.

Es **exactamente la misma confusión** que ya estaba documentada en
`keeper/intent.ts` —el bug de «Le pregunto a Delfina qué le pasa a Aurelio»,
que resolvía el objetivo contra un Aurelio dormido en otro edificio— y en
`keeper/narrator.ts`, que ponía a los cuatro NPC de una aventura en los cinco
lugares a la vez. Tres lugares distintos del motor, la misma trampa. Ahora
`ordenDeAsalto` filtra además por `loc.npcsPresent`, con la misma excepción
que ya usaba el narrador: los NPC creados en partida (`create_npc`, que es
como nacen los rivales del simulador) no figuran en ninguna localización y
siguen contando, porque aparecen donde está el investigador.

Fijado en `prueba-el-vigesimo.ts` con un asalto real en el trastero que
comprueba que Bernardo no aparece en el mensaje y sigue con los PV intactos.

#### Lo demás del reporte

- **La frase de ambiente se repetía en cada botón.** `umbralFlavour` usa
  `pickVariant`, que cuando se le agotan las variantes devuelve siempre la
  última —lo correcto para una respuesta, que siempre tiene que decir algo, y
  lo peor posible para una nota de ambiente—. Con la Exposición en 100 el
  pool se agota en cuatro turnos y a partir de ahí «Te acordás con nitidez de
  algo que no puede haber pasado todavía» salía en todos. Ahora, agotado el
  pool, se calla: el silencio es una salida válida para el ambiente.
- **No se veía contra qué se peleaba.** El narrador anunciaba «El que quedó
  en la puerta está acá.» y nada más: el nombre spoileaba que había algo y no
  decía qué se estaba viendo. Ahora la primera vez que se cruza a un NPC se
  narra su descripción, que ya estaba escrita y no la leía nadie. Y la del
  guardián se reescribió para que sea lo que se ve —la espalda, las muñecas,
  los dientes, y los ojos del mismo verde que los de Sixto en la plaza— y no
  una etiqueta.
- **Las armas no decían cuánto pegan.** Elegir entre «puños y patadas» y
  «cuchillo de carnear» sin saber que uno hace 1D3 y el otro 1D4+2 es elegir
  a ciegas, y es un dato que en la mesa está a la vista. El selector ahora
  muestra el daño y si el arma suma corpulencia.
- **El ropero pedía Mecánica.** Un candado de latón nuevo sobre madera vieja
  no se estudia: se revienta. Pasado a **FUE** —el motor ya aceptaba tiradas
  de característica y ninguna aventura las usaba— y, sobre todo, ahora
  **revela algo que importa**: nueve recortes de diario sobre desapariciones
  de chicos, de 1874 a julio de este año, el último el de Ferrari, ordenados
  y anotados al margen con la letra del cuaderno del atril. Antes la tirada
  daba un traje viejo y una caja, que era exactamente la queja.
- **El guardián se recalibró** contra las magnitudes de los degenerados del
  módulo original convertidas de 6ª a 7ª edición (características ×5): 13 PV,
  Pelea 55%, 1D3+1D4 de daño, corpulencia 0. Antes tenía 16 PV y una
  bonificación de daño de 1D6 puesta a ojo.

Sigue abierto, sin cambios: la pelea contra Bernardo no se puede balancear
para un investigador de combate y uno que no lo es a la vez (§3.2-septvicies),
el aviso de Cordura en el momento, y la economía del bazar.

### 3.2-undetricies El clímax: invulnerabilidad con punto débil

Pedido después de jugarlo: «el combate con Bernardo debería ser épico», «a
los puñetazos no debería poder ganársele», «debería haber pistas para saber
que el punto débil es el anillo», «el Ahijado no hace nada».

Lo que se adapta del módulo original es la **mecánica**, que es funcional y
no prosa: un enemigo al que el daño común no le hace nada, y un objetivo
concreto que hay que declarar antes de golpear, que pide un arma que corte,
que tira con penalización y que acumula daño propio. Los números, el texto y
el nombre del punto débil son de esta campaña.

#### La función nueva: `CombateNpc.invulnerabilidad`

Genérica —el motor no sabe qué es un anillo—. El escenario declara qué hay
que atacar, cuánto aguanta, si hace falta filo, y **qué se ve cuando una
herida común se cierra sola**, que es la pista:

- Mientras el punto débil aguante, el daño normal no baja los PV: `danarNpc`
  devuelve el texto de `seCierra` y no pasa nada más.
- `resolve_attack` acepta `punto_debil: 'true'`: un dado de penalización,
  rechazo si el arma no empala y `requiereCortante`, y el daño se acumula en
  el punto débil.
- Cuando el punto débil llega a cero, el NPC cae en el acto.

**Bernardo**: 17 PV que no sirven de nada, la mano del anillo con 12 de daño
acumulable, filo obligatorio. Y cuando una herida se le cierra, el rubí se
enciende por dentro y se apaga cuando la piel termina de juntarse.

#### Que el jugador se entere, por dos caminos

1. **Antes**, preguntándole: el tema `b-anillo` ahora es explícito —«a mí no
   me mata un cuchillo, ni un tiro, ni una caída… si alguna vez le hace falta
   terminar conmigo, es la mano»—. Se lo dice él, porque su motivación es que
   alguien le confirme si valió la pena, no ganar.
2. **Durante**, peleando: el botón «Ir por la mano del anillo» **no existe
   hasta que el jugador ve con sus propios dados que una herida se cerró**.
   Enterarse es parte de la pelea; la interfaz no lo regala de entrada.

#### El Ahijado ahora pelea

Tenía `combate: null`, así que estaba de adorno. Ahora tiene ficha: 6 PV,
Pelea 35%, Esquivar 90%, DES 90, corpulencia −2. No es un rival: es una
molestia rápida que esquiva casi todo y ataca mientras uno trata de apuntarle
a la mano. Entra solo al asalto por el arreglo de §3.2-duodetricies —está en
`npcsPresent` del laboratorio— sin que haga falta nada más.

#### Lo que además muestra la interfaz

La pantalla de combate dice, una vez descubierto, que a este rival no se le
gana a golpes, qué hay que atacar, que hace falta filo y que apuntar cuesta
un dado.

Fijado en `prueba-el-vigesimo.ts`: treinta golpes comunes con facón no le
bajan un PV y el jugador ve por qué; a mano limpia el motor rechaza ir por la
mano; con filo y apuntando, cae. Esa prueba usa un investigador de combate
explícito —Elena Sartori, médica rural, muere antes de conectar el primer
golpe—, que es la misma tensión de diseño ya anotada en §3.2-septvicies y que
esta mecánica **no** resuelve: sigue habiendo que decidir qué hace un
investigador que no sabe pelear cuando llega al laboratorio.

### 3.2-tricies Quinto playtest: la respuesta de Ferrari/Prewitt/Onésimo «seguía fallando» — no era un bug

Reportado jugando, otra vez sobre la audiencia con Bernardo: «sigue el bug de
la respuesta a la pregunta por Ferrari, Prewitt y Onésimo». El arreglo de
§3.2-septvicies (sacar la clave «bernardo» de `b-quien-sos`) ya estaba
aplicado, y el ruteo de `temaPorFrase` es correcto: se comprobó armando un
guion que sí navega hasta el laboratorio (el primer intento de depurar no lo
hacía, y por eso mostraba a Ercilia contestando cualquier cosa desde el
vestíbulo — un error del script de prueba, no del juego).

Con navegación real, las cuatro preguntas de la audiencia rutean cada una a
su propio tema (`b-quien-sos`, `b-anillo`, `b-turno`, `b-tres-desaparecidos`).
Lo que pasaba con la semilla fija de la prueba es que `b-anillo`, `b-turno` y
`b-tres-desaparecidos` tienen `prueba: {skill: psicologia, difficulty:
regular}` — y Elena Sartori tiene psicología 35%. Fallar tres tiradas
regulares seguidas con esa semilla es mala suerte (≈27% de chance), no un
bug: cuando la tirada no supera la dificultad, `resolverTema` cede el texto
de `esquiva` del tema correcto («Ya le dije lo que le iba a decir de
ésos…»), que es exactamente el diseño descrito en `keeper/social.ts`.

El chequeo de regresión en `prueba-el-vigesimo.ts` (agregado en
§3.2-septvicies) estaba escrito para aceptar sólo el texto de `cede`, así que
con esa semilla salía en falso pese a que el ruteo era correcto. Se corrigió
para aceptar `cede` **o** `esquiva` de `b-tres-desaparecidos` — lo único que
demuestra el bug original es que NO vuelva a salir la presentación de
`b-quien-sos`, y las dos ramas prueban eso igual de bien.

Ningún desenlace ni condición depende de que este tema en particular haya
cedido —es confirmación/color, no un gate—, así que no hace falta ablandar la
tirada: es psicología social funcionando como se espera, con una investigadora
que no es fuerte en esa habilidad.

### 3.2-untricies El bisturí del laboratorio, y el cadáver del guardián con nombre

Dos pedidos después de jugarlo, ninguno tocó el motor: los dos son contenido
nuevo sobre mecanismos que ya existían.

**El bisturí, como red de seguridad.** `it-cuchillo-cocina` es el arma
correcta contra la mano del anillo —filo, 1D4+2—, pero es opcional: hay que
pensar en agarrarlo en la cocina, y de ahí en más el descenso al sótano es de
ida (`cocina → trastero-sotano → entrada-laberinto → laboratorio`, sin
conexión de vuelta en ninguno de los tres tramos — ver §3.2-septvicies). Quien
no lo agarró llegaba al laboratorio sin ningún objeto cortante y sin forma de
volver por uno: el motor ya rechaza ir por la mano del anillo a mano limpia
(§3.2-undetricies), así que olvidarse el cuchillo cerraba `cortar`/`heredar`
para siempre en esa partida, sin aviso.

Arreglo: `it-bisturi-laboratorio`, en la propia mesa de instrumentos del
laboratorio (que la descripción del cuarto ya mencionaba: «instrumentos que
no son de ninguna farmacia ni de ningún hospital»), con un arma nueva en el
catálogo (`bisturi`, 1D4, filo) — más débil que el cuchillo de cocina a
propósito: sigue siendo mejor haber venido preparado, pero ya no es
obligatorio. Medido con un investigador de combate y el cuchillo de cocina,
sobre 30 semillas: ~27% de victorias contra Bernardo+Ahijado peleando juntos.
No es un empate parejo —CoC 7e no lo es—, pero tampoco es la lotería que
sugería la nota de §3.2-undetricies: esa nota describía a Elena peleando
DESARMADA, de antes de que `it-cuchillo-cocina` tuviera `armaId` asignado
(§3.2, «el hacha sin armaId»). Con el arma bien conectada, ganar es difícil y
posible — que es lo que tiene que ser.

**El cadáver, con nombre si se lo reconoce.** Nueva acción en el trastero del
sótano, visible una vez que el guardián cae (`npcFuera`): «Examinar el
cuerpo», con una tirada de Mitos de Cthulhu. Si se supera Y el investigador ya
miró de cerca los retratos del salón, reconoce la arquitectura de hueso bajo
la deformidad como la del marco más viejo de la pared —un dato nuevo que se
agregó ahí, «Casimiro Díaz, 1889—1909»— y la escena dice, con nombre y
apellido, que Casimiro no murió a los veinte años como dice la placa: lo
dejaron en la puerta. Sin haber visto los retratos, el mismo éxito reconoce
el parentesco familiar pero no puede ponerle nombre. Sin superar la tirada, no
hay revelación de ningún tipo — a 0% de Mitos de base, sólo un investigador
que ya acumuló puntos de Mitos en aventuras anteriores tiene una tirada real
que hacer, que es la lectura correcta del género: esto no se reconoce por
tener buenos ojos.

No hizo falta tocar el motor para el nombre: la revelación es prosa de la
propia escena (`resolver` en `elvigesimo.logica.ts`), no un campo que cambie
el `Npc.name` en ningún lado — para cuando se examina el cuerpo, el combate ya
terminó, así que no hay pantalla en vivo (ficha, cabecera de Combate.tsx) que
necesite mostrar el nombre nuevo. Si una revelación de identidad futura
necesitara cambiar cómo se nombra a alguien MIENTRAS sigue vivo y en pantalla,
eso sí pediría una función genérica nueva; éste no era ese caso.

Probado con `resolver` invocado directo, con una tirada armada a mano —igual
criterio que «CON BERNARDO VENCIDO…»: la tirada de Mitos es real y depende de
los dados, y no tiene sentido escribir una prueba que juegue hasta que salga.

### 3.2-duotricies El mausoleo de los Díaz, y la bonificación de preparación contra Bernardo

Dos pedidos sobre el mismo tramo final de la aventura.

**El mausoleo.** El usuario compartió el mausoleo de la aventura original de
Chaosium (veinte sarcófagos con nombre y fecha, candado, follaje muerto
alrededor) y preguntó si valía la pena adaptarlo. La respuesta fue que sí vale
la pena adaptar la idea, no el texto —y de hecho ya teníamos la pieza central
sin usar: el "vigésimo lugar" que Bernardo menciona en `b-turno` (diecinueve
lugares ocupados, uno vacío) es el mismo concepto, escrito con palabras
propias. Se construyó como contenido nuevo, sin tocar el motor:

- Dos locaciones (`el-mausoleo-puerta`, exterior; `el-mausoleo-camara`,
  interior), conectadas entre sí y con el vestíbulo **en los dos sentidos** —
  a diferencia del sótano, esto nunca es de ida: es contenido secundario,
  explorable en cualquier momento de la aventura.
- La entrada a la cámara empieza oculta con `conexionesOcultas` (el mismo
  mecanismo ya construido en §3.2-septvicies para el sótano), destrabada por
  una pista que deja la escena `mausoleo-forzar-candado` al forzar el
  candado. **Encontrado escribiendo la prueba, no por el validador**: el
  validador de contenido no recorre `conexionesOcultas` en absoluto, así que
  un fragmento de pista mal tipeado (una mayúscula de más o de menos) no da
  ningún error — sólo deja la conexión sin destrabar nunca, en silencio.
  Pasó exactamente eso en un primer intento (`"el candado..."` minúscula en
  la condición contra `"El candado..."` mayúscula en la pista real); lo
  agarró el primer test de la conexión, no el motor.
- El candado se abre con `DEX` a dificultad `hard` —pedido explícito del
  usuario en vez de Mecánica, una habilidad que casi ninguna ficha tiene
  alta—. `hard` en CoC 7e ya significa "la mitad de la característica", así
  que `skill:'DEX', difficulty:'hard'` **es** "DES/2" sin escribir ninguna
  fórmula nueva ni tocar el motor.
- Adentro, `mausoleo-examinar-nichos` revela con Descubrir una placa
  específica —«Casimiro Díaz, 1889—1909», con el bronce rayado desde
  adentro—, el mismo nombre ya usado en el retrato del salón
  (`f-retratos`, §3.2-septvicies) y en el cadáver del guardián del sótano
  (`examinar-cadaver-guardian`, §3.2-untricies): tres pistas independientes
  que apuntan al mismo hecho, ninguna condicionada a haber visto las otras
  dos. Cuesta Cordura real además de Exposición —pedido explícito del
  usuario—: `amount: 5`, siguiendo el precedente de este mismo proyecto
  (`aguablanca.logica.ts`: 1 y 4 en dos escenas; `elvigesimo.logica.ts`: 8 al
  ponerse el anillo), aplicado en las dos ramas de la tirada de Descubrir —el
  golpe es haber entrado y visto diecinueve cuerpos, se distinga o no una
  placa en particular.

**La bonificación de preparación.** El usuario pidió que llegar al combate
final sin haber investigado nada sea más difícil que llegar con pistas
juntadas. Extensión genérica de `iniciaCombate`, exactamente el patrón ya
usado para `salidaPacifica` (cuatro archivos: `ActiveCombat` en
`shared/types.ts`, `CombatStartedPayload` en `shared/events.ts`, el reducer
`COMBAT_STARTED`, y `toolStartCombat`) más un quinto punto en
`toolResolveAttack`, junto al bono ya existente por `derribado`: si
`activeCombat.preparacion` existe, sus dados se suman al ataque del
investigador durante TODO el combate —a diferencia del derribo, que se
consume en el primer golpe: esto es lo que el investigador ya sabe, no una
ventaja táctica de un asalto—. El motor no sabe qué es Bernardo: sólo lee un
número opcional que la escena declara, y no hace nada si no está.

`bernardo-enfrentar` cuenta cuántos de siete hechos ya conoce el investigador
al llegar (retratos del salón, ropero de Bernardo, la lista del diario, el
anillo y el ciclo revelados en diálogo, el cadáver del guardián, el
mausoleo) —seis vía pistas de tablero con `evaluarCondicion({op:'pista', ...})`,
uno vía `discoveredProperties` porque el diario no pasa por el tablero— y
traduce el conteo a dados: 0-1 hechos → nada, 2-4 → un dado, 5-7 → dos. Los
umbrales viven como constante local en `elvigesimo.logica.ts`, no en
`rules/social.config.ts`: es afinación de una sola pelea de una sola
aventura, no una regla genérica del sistema social.

Probado con los `resolver` de las tres escenas nuevas invocados directo, con
tiradas armadas a mano (mismo criterio que ya usa esta suite contra rolls que
dependen de dados reales), más un caso que patchea `Turn.state` en memoria
para comprobar que `toolResolveAttack` aplica de verdad el bono declarado.

### 3.2-tretricies La tarjeta de tirada mentía en verde cuando la dificultad era Difícil o Extrema

Reportado jugando, probando el candado del mausoleo (§3.2-duotricies, DEX a
dificultad Difícil): un investigador con DES 30% tiró 17 —«ÉXITO REGULAR»,
tarjeta en verde— y la escena, correctamente, narró que el candado no cedía.
Confusión razonable: la tarjeta decía éxito, el texto decía fracaso.

Causa real, en `RollCard` (`src/web/components.tsx`): `good` se calculaba
como `['critical', 'extreme', 'hard', 'regular'].includes(roll.degree)` —o
sea, «¿el grado de la tirada no fue un fracaso liso?»— sin mirar para nada
qué dificultad se había pedido. Un grado `regular` contra una dificultad
`hard` pedida es un FRACASO de ese chequeo puntual (CoC 7e real: hay que
igualar o superar el grado pedido), pero la tarjeta lo pintaba de éxito
igual. El motor ya tenía la comparación correcta —`meetsDifficulty(degree,
difficulty)` en `rules/dice.ts`, la misma que arma el «SUPERA la
dificultad» del mensaje— pero la tarjeta nunca la usaba: calculaba su
propio criterio, más simple y equivocado, en paralelo.

No es un bug nuevo de esta sesión ni exclusivo del mausoleo: cualquier
tirada a dificultad Difícil o Extrema en toda la partida mostraba esta
misma tarjeta engañosa. El candado sólo lo hizo visible porque es la
primera tirada de la aventura que pide `hard` contra una característica que
razonablemente puede rondar el 30-40%, la zona exacta donde un «regular»
(que no alcanza) es un resultado frecuente.

Arreglo: `RollCard` importa `meetsDifficulty` de `rules/dice.ts` en vez de
reinventar el criterio. Además, cuando el grado no alcanza pero tampoco es
un fracaso liso, la insignia ahora aclara qué faltó («ÉXITO REGULAR — no
alcanza para Difícil») en vez de dejar sólo el color como única pista de la
contradicción aparente.

### 3.2-quatertricies El cadáver cuesta Cordura, y el premio final distingue vencer de huir

Dos preguntas después de jugar el mausoleo.

**«El examen del cadáver debería costar Cordura, no sólo pedir Mitos.»**
Cierto: `examinar-cadaver-guardian` (§3.2-untricies) sólo aplicaba
`exposicion`; la tirada de Mitos decidía QUÉ se aprende (si hay nombre o
no), pero nunca costaba Cordura real por el simple hecho de arrodillarse
junto a un cuerpo así. Se agregó `cordura: { amount: 3, ... }` a la parte
común de la escena —se paga en las dos ramas, se reconozca o no el cuerpo—,
mismo criterio flat (sin dado propio) que ya usan el resto de las escenas
con Cordura real de este proyecto (mausoleo: 5, anillo: 8): la escena
decide el número; el motor no tira un dado aparte para la pérdida.

**«¿Las recompensas por vencer a Bernardo están aplicadas?»** A medias.
`premioDelKeeper` (`rules/desarrollo.ts`, p. 167) YA existe como mecanismo
genérico —Cordura al cerrar cualquier aventura, proporcional a cuánto se
investigó— pero sus dos categorías especiales («miró de frente el
fenómeno», «se fue temprano») sólo reconocían los desenlaces de Agua Quieta
(`mirar`/`bajar`/`llevarse`, escritos cuando esa era la única aventura). Los
cuatro desenlaces de El Vigésimo caían siempre al tramo genérico por
cantidad de pistas, sin que importara si Bernardo cayó o si el investigador
huyó sin pelear. Se agregaron `cortar`/`heredar` a «miró de frente» —vencer
a Bernardo es, si acaso, más de frente que mirar un aljibe— y
`irse-vigesimo` a «se fue temprano»; `denunciar` queda deliberadamente
afuera de las dos categorías especiales, como un tercer caso intermedio.

Sigue sin extenderse a las otras cuatro aventuras (Legua, Sueño Debido,
Invierno Debido, Tercer Umbral): cada una tiene sus propios ids de
desenlace y ninguno está reconocido todavía, así que las cinco aventuras
que no son Agua Quieta o El Vigésimo siguen premiándose sólo por cantidad
de pistas. Queda anotado como hueco conocido, no resuelto esta vez.

### 3.2-quinquatricies El laberinto, epílogo opcional tras Bernardo

Pedido: que la aventura no termine en el mismo golpe que derriba a Bernardo.
Dos parientes degenerados propios (Abelardo y Felisa Díaz, sin
`invulnerabilidad` —esa firma es sólo de Bernardo—) en dos alas nuevas
colgando de un vestíbulo (`laberinto-mas-alla`), destrabado con
`conexionesOcultas` apenas Bernardo cae (`{op:'npcFuera', npc:'npc-bernardo'}`,
sin pista intermedia). "Cortar"/"Ponerse el anillo" siguen disponibles desde
el primer momento, sin depender de esto —confirmado con el usuario:
`toolReachEnding` es definitivo, no hay forma de ofrecer nada después de un
final, así que el laberinto es contenido opcional, no un gate—.

"Cada tanto aparece algo" se resolvió con una tirada de Escuchar por ala
(éxito: cruza y deja una pista propia; fracaso: `iniciaCombate` contra el
pariente de esa ala, con `salidaPacifica` como en el guardián del sótano) —
mismo vocabulario ya usado dos veces esta sesión, sin subsistema nuevo.

**Encontrado por la propia auditoría, no por el validador**: agregar
`laberinto-mas-alla` como conexión real (aunque oculta) de `laboratorio`
—antes `connections: []`— rompía la excepción de `sinRetorno` en
`prueba-auditoria.ts`: esa función hace BFS sobre `connections` crudo, sin
filtrar `conexionOculta`, así que un cuarto sin salida FUNCIONAL (el
laboratorio, con Bernardo vivo y el andador sin forma de progresar la pelea
por el sistema de texto) dejaba de contar como "sin retorno" apenas tenía
CUALQUIER conexión declarada, aunque estuviera bloqueada. Arreglado
filtrando `esc.conexionOculta?.(state, actual, v)` en el BFS —mismo criterio
que ya usa `acciones.ts` para esconder el botón real—. No es un bug de
contenido: es la segunda vez que un `conexionOculta` nuevo pasa por acá
(la primera, el mausoleo, no lo disparó porque no cambiaba la conectividad
cruda de ningún cuarto ya sin salida).

### 3.2-sextricies Cordura de verdad, dos bugs de navegación, y compresión de combate

Cinco pedidos del sexto playtest.

**Tirada de Cordura real, `skill: 'COR'`.** `toolRequestRoll` (`engine.ts`)
ahora acepta `'COR'` como pseudo-habilidad, leyendo `inv.derived.san`
directo —primera vez que este proyecto tira contra la Cordura actual en vez
de aplicarla como número fijo—. `examinar-cadaver-guardian` y
`mausoleo-examinar-nichos` la usan como su única tirada (el motor no admite
dos por intención): la identidad de Casimiro ya no depende de acertar un
chequeo, depende de haber visto el retrato del salón —una pista cruzada,
como cualquier otra de esta aventura—; lo que decide la tirada de Cordura es
CUÁNTO cuesta mirar (2 si se pasa, 5 si no). El cadáver además deja Mitos de
Cthulhu ganado (`EfectoEscena.mitos`, ya existía en el motor y nadie lo
usaba): sin pedir una segunda tirada, el "1D3" sale de acotar a 1-3 el mismo
d100 que ya tiró para la Cordura (`ContextoEscena.tirada.numero`, campo
nuevo, expuesto desde `keeper/escenas.ts`).

**La pérdida ahora tiene peso mecánico, no sólo narrativo.** Los 5 puntos
del mausoleo y los 5 del cadáver (en la rama que falla) ya cruzaban el piso
de crisis automática de CoC 7e (p.166), pero salían con el nombre genérico
porque ninguna escena declaraba `cordura.crisis`. Ahora las dos tienen fobia
o manía propia con efecto real en tiradas futuras ("Manía de contar",
"Horror a los cadáveres") — pedido explícito: que se sienta, no que baje un
número en silencio.

**Dos bugs de navegación reales, en las salas nuevas del laberinto.** El
nombre de una locación se parte en palabras ≥4 letras para reconocerla en
una frase (`keeper/intent.ts`, `nombresDe`), y gana la palabra más larga que
coincida. "El ala este del laberinto" y "el resto del laberinto" (alias de
`entrada-laberinto`) empatan en la palabra "laberinto" (9 letras), y por
orden de inserción ganaba SIEMPRE `entrada-laberinto` — cualquier intento de
ir a un ala terminaba de vuelta en la entrada. Peor: "Más allá del
laboratorio" empataba con "laboratorio" contra la sala del propio
laboratorio, así que ni siquiera se podía LLEGAR al laberinto nuevo. Las dos
salas se renombraron ("El ala este"/"El ala oeste"/"Más allá") para sacarse
la palabra colisionante de encima — mismo tipo de bug ya visto tres veces
este proyecto con nombres de NPC, ahora con nombres de lugar.

**Compresión de combate.** Nuevo botón "Resolver el combate" en
`Combate.tsx`: repite el mismo `combateAtacar` que un click manual, uno
atrás de otro (apuntando al punto débil en cuanto se descubre), hasta que el
combate termina, el rival elegido cae, el investigador cae, o a los 30
asaltos. No hay atajo de reglas —los mismos dados de siempre, en el mismo
orden—, sólo de clicks.

**La línea de "decida rápido"** de Bernardo se reescribió (pedido: la
anterior "no convencía"), y la primera línea de `bernardo-caido` ahora
describe la herida cerrándose, para que el golpe que le ganó la mano quede
en cuadro antes del resto de la escena.

### 3.2-septricies Formato real "1/1DX" en la Cordura, el pasadizo se busca, y loot permanente

Tres pedidos del séptimo playtest.

**"1/1DX", no dos números fijos.** El rework anterior (§3.2-sextricies) ya
tiraba contra Cordura, pero pasar costaba 2 (cadáver) o 5 (nichos) fijos, y
fallar costaba otro número fijo (5) — ni el formato real de CoC 7e ("pasar
cuesta un mínimo fijo, fallar tira un dado") ni visible en la narración:
`efecto.cordura` llamaba `apply_sanity_loss` pero nunca mostraba su mensaje
(`keeper/escenas.ts`), así que la pérdida bajaba en silencio salvo por el
número en la ficha. Arreglado: pasar cuesta 1 punto fijo; fallar tira un
dado derivado del mismo d100 ya usado para la Cordura (`tirada.numero`,
sin pedir una segunda tirada) — 1D4 para el cadáver, 1D6 para los nichos,
acorde a que diecinueve cuerpos pesan más que uno—, y el mensaje del motor
("Cordura X → Y", con el aviso de crisis si corresponde) ahora se narra,
no se aplica en silencio. De paso, la placa de Casimiro en el mausoleo ya
no depende de una tirada de Descubrir separada —se ve siempre—, mismo
criterio que ya tenía el cadáver: la única tirada de cada escena es la de
Cordura.

**El pasadizo hay que encontrarlo.** "Ir a más allá" era un botón ambiguo
que aparecía solo, apenas caía Bernardo. Ahora hay que buscarlo
(`buscar-pasadizo`, Descubrir regular, reintentable) antes de que el botón
de ir aparezca — la locación se renombró "El pasadizo" para que el botón
diga, literalmente, "Ir al pasadizo". La `conexionOculta` que lo destraba
pasó de depender sólo de `npcFuera(bernardo)` a depender ADEMÁS de la pista
que deja encontrarlo.

**Sigilo antes que Escuchar, en dos botones separados.** Cada ala pasó de
una sola acción con tirada automática (Escuchar) a repetir el patrón EXACTO
del guardián del sótano: "Tratar de cruzar sin que me vea" (Sigilo) y
"Enfrentarlo" (combate directo, sin tirada), como dos botones separados en
vez de uno solo. Antes, fallar la tirada disparaba combate en el mismo
click; ahora fallar Sigilo sólo avisa que lo despertaste —el jugador decide
si pelea o insiste con el sigilo—, igual que ya funcionaba en el sótano
desde el principio. Debería haberse escrito así desde el principio de
laberinto-avanzar-este/oeste; no se hizo, y esta vez sí.

**Recompensa permanente por ganar la pelea, no sólo pista.** Nuevo par de
acciones "Revisar el cuerpo" (visibles sólo si el pariente cayó de verdad
en combate — `npcFuera`, que sigilo exitoso nunca deja en true), que
trasladan un ítem nuevo y propio al investigador: una figurita de piedra
—la misma forma repetida en cada nicho del mausoleo, otro hilo más que
conecta las tres piezas nuevas de esta sesión— y un alfiler de plata.
Esquivar con sigilo sigue dejando su pista de todos modos; sólo el combate
ganado deja loot.

### 3.2-octricies Bernardo muere de verdad, sigilo con bono de sorpresa, y dos bugs de orden

Cinco pedidos del octavo playtest.

**Bernardo muere, explícito, al cortarle la mano.** Pedido dos veces
seguidas: antes seguía "vivo, y respira", ofreciendo la elección de
cortar/heredar con su propia voz. Ahora el mensaje genérico de
invulnerabilidad (`engine.ts`, reusable para cualquier NPC futuro con punto
débil) dice que cae y no se levanta, y `bernardo-caido` describe un cuerpo,
no una conversación: "no respira, y no va a volver a hacerlo". No hizo
falta perder la elección en el cambio —Bernardo ya había dicho, en
`b-anillo`, antes de la pelea, exactamente lo que iba a decir acá ("es la
mano... las dos cosas terminan conmigo")—, así que la escena lo cita en vez
de hacerlo hablar desde el piso. `fin-heredar` tenía una frase que asumía
que todavía respiraba ("se lo sacás mientras todavía respira"); corregida.

**Dos bugs de orden, los dos por el mismo motivo:** un mensaje se agregaba
a `state.narrative` en un punto de la ejecución distinto del texto que lo
explicaba.
- `NPC_DAMAGED` (`reducers.ts`) empujaba "X queda fuera de combate" a mitad
  de la resolución del asalto, mientras que el mensaje completo del asalto
  ("Ahijado: 3 → 0 PV. Ahijado deja de pelear.") se agrega DESPUÉS, con
  `turn.narrate()`, una vez que la herramienta ya terminó. El resultado:
  el aviso salía ANTES que el daño que lo causaba. Arreglado excluyendo
  el aviso cuando hay un combate real en curso —ahí el propio mensaje del
  asalto ya lo cuenta—; fuera de combate sigue narrándose igual, porque ahí
  no hay otro mensaje que lo haga.
- El `hecha` de las dos acciones de Sigilo del laberinto (§3.2-septricies)
  comparaba contra un fragmento de texto que el `resolver` real nunca
  escribió (`"cruzás sin que la paja"` contra el texto real, `"cruzás sin
  que vuelva a moverse"`) — la tirada de éxito no se registraba nunca como
  hecha, así que el botón quedaba disponible para siempre y se podía repetir
  sin límite. Arreglado con una pista dedicada en vez de un fragmento de
  prosa (más robusto: sobrevive a que se retoque el texto después).

**El sigilo ahora sirve para pelear mejor, no sólo para evitar pelear.**
Pasar la tirada de Sigilo ya no es sólo "cruzás sin que te vea": deja una
pista de sorpresa que, si después se elige "Enfrentarlo" en vez de seguir
de largo, entra como `iniciaCombate.preparacion` (mismo campo genérico de
§3.2-quatertricies) — un dado de bonificación en todo el combate, por
haberle llegado encima antes de que te viera venir.

**La figurita de piedra ahora da algo.** Nueva escena "Examinar la
figurita" (tirada de Mitos de Cthulhu, formato de una sola tirada por
intención): si se supera, conecta la figura sin rostro con lo que Bernardo
ya dijo sobre el Primer Rostro en `b-primer-rostro` ("lo que mira desde
otro momento, no desde otro lugar") y deja Mitos de Cthulhu ganado.

**Ítems con valor de referencia.** Nuevo campo `Item.value` (opcional, sin
ningún tool que lo lea todavía: es sólo el dato, declarado ahora para no
volver a cada ítem cuando exista una economía). Puesto en la figurita (5) y
el alfiler de Felisa (15).

**Log de combate colapsable.** El registro de `Combate.tsx` mostraba cada
asalto entero, uno debajo del otro, y una pelea larga con maniobras se
volvía imposible de leer de un vistazo. Ahora sólo el asalto más reciente
queda siempre visible; el resto se colapsa detrás de un botón ("Ver los N
asaltos anteriores").

### 3.2-novicies La fase de desarrollo nunca reconocía nada, en la segunda aventura en adelante

Reportado jugando: "siempre que termino no me reconoce que haya pasado
ninguna tirada de habilidad con éxito para mejorar" — con tiradas exitosas
y sin modificadores bien visibles en la pestaña de Tiradas, la fase de
desarrollo cerraba diciendo "Nada se aprendió esta vez" de todos modos.

Causa: `marcasDe` (`rules/desarrollo.ts`) cuenta como marcable toda tirada
con `seq` por ENCIMA de `investigator.experience.lastDevelopmentSeq` —la
frontera que se mueve al cerrar la fase, para no volver a contar lo mismo—.
Esa frontera se fija como `atRollSeq: this.state.rolls.length` al cerrar
(`engine.ts`), un número que sólo tiene sentido DENTRO de la cadena de
tiradas de ESA campaña. El problema es que `heredarInvestigador` —la
función que lleva a un investigador de una aventura a la siguiente—
copiaba `experience` completo sin tocarlo, así que esa frontera vieja
cruzaba tal cual a la campaña nueva. Cada campaña arranca su propia cadena
de tiradas desde cero (`headSeq: 0`), así que la frontera heredada —casi
siempre un número más alto que cualquier tirada de la aventura nueva—
dejaba a `marcasDe` sin nada por encima que contar: la fase de desarrollo
de la SEGUNDA aventura en adelante nunca reconocía una sola tirada, sin
importar cuánto se jugara. La primera aventura de una campaña nunca lo
sufría —arranca con la frontera en 0, recién creada—, lo que explica por
qué costó encontrarlo: hacía falta encadenar dos aventuras para verlo.

Arreglado reseteando `lastDevelopmentSeq` a 0 en `heredarInvestigador`,
la misma función que ya resetea PV al máximo y cierra heridas temporales al
cruzar de campaña. `sessionsSurvived` (el otro campo de `experience`) sigue
cruzando intacto: ese sí es un conteo legítimo entre campañas, no un índice
de una cadena que ya no existe. Nueva prueba de regresión en
`prueba-campana.ts`: confirma que la campaña anterior cierra con una
frontera real (mayor a 0) y que la campaña nueva arranca en 0 de todos
modos.

### 3.2-trigies El gasto de Suerte, y el aviso de meta-horror antes de arrancar

Dos piezas de diseño que quedaban pendientes de una sesión anterior (ver
§2.3 y el punto "sistema" de §4), resueltas juntas el 2026-09-02.

**Suerte deja de ser decorativa.** `derived.luck` se tiraba en la creación,
se mostraba en la ficha, y nada del motor la tocaba. Ahora hay un botón
siempre disponible, generado desde el estado igual que "salidas" u
"objetos" en `accionesDisponibles` (`scenario/acciones.ts`) — no del
catálogo de ninguna aventura, porque es un recurso del investigador, no del
lugar—: "Apelar a mi suerte" gasta 10 puntos y deja un dado de
bonificación pendiente para la PRÓXIMA tirada propia (`toolSpendLuck` +
`Investigator.pendingLuckBonus`, tope 2 dados acumulados).

No es la regla del manual (p. 44: gastar Suerte para bajar el resultado YA
tirado). Se descartó esa versión a propósito: `toolRequestRoll` compromete
y ejecuta la tirada en la misma llamada, sin ninguna pausa entre tirar y
narrar donde el jugador pueda reaccionar al número — implementarla tal
cual exigía meter una pantalla intermedia nueva en medio de cualquier
turno, parecida a cómo el combate abre la suya. La variante elegida gastar
ANTES, por un dado de bonificación reutiliza el sistema de `modifiers` que
`request_roll` ya tenía (el mismo camino que usan Estabilidad baja y las
fobias), y no toca el flujo de turno para nada.

El clasificador de intención (`keeper/intent.ts`) suma el verbo `suerte`
con una frase propia ("apelo a mi suerte") para no chocar con nada que
mencione la palabra de pasada. Se prueba de punta a punta en
`prueba-suerte.ts` (suite nueva, `npm run prueba:suerte`): que gastarla
baje la Suerte y deje el dado pendiente, que ese dado se aplique a la
tirada siguiente y se consuma (no sobrevive a una segunda tirada), que
rechace sin Suerte suficiente y pasado el tope, y que el botón sólo se
ofrezca cuando corresponde.

**El aviso de meta-horror, resuelto: sí va, una vez, antes de arrancar.**
§2.3 dejaba pendiente "con qué aviso previo". Se decidió que el juego
avise, no que sea sorpresa pura: un cuadro en la pantalla de inicio
(`App.tsx`, antes de las tarjetas de aventura), visible una sola vez por
navegador —mismo patrón de preferencia que `CLAVE_ALTO_PIE`, una clave
`castronegro:*` en `localStorage` con try/catch—, que explica que el juego
a veces hace notar al JUGADOR algo que su investigador todavía no tiene
registrado, aparte del resto de la ficha. Se pone ANTES de elegir aventura
y no dentro de una partida en curso: adentro ya sería tarde para decidir
con eso en la cabeza.

### 3.2-untrigies Magia: Puntos de Magia dejan de ser decorativos, y una novena aventura

Puntos de Magia (`derived.mp` = POD/5) estaba en la ficha desde el
principio del proyecto sin que ninguna aventura lo usara. Se cierra con
**dos piezas nuevas**, planificadas en modo plan y verificadas contra las
reglas reales de CoC 7e (Core Rulebook p.170-178, no de memoria) antes de
escribir nada: la primera vez que se lanza un hechizo pide una tirada de
PODER difícil; si sale bien, queda "probado" y nunca más la vuelve a
pedir; cuesta PM, y lo que falte se descuenta de PV uno a uno; un
lanzamiento fallido no cobra nada.

**El motor: `toolLearnSpell`/`toolCastSpell` (engine.ts), catálogo en
`rules/hechizos.ts`.** `toolCastSpell` es autocontenido, mismo patrón que
`toolResolveAttack`: llama a `this.toolRequestRoll(...)` DIRECTO cuando
hace falta la tirada de la primera vez, en la misma llamada — no hay, hoy,
una pantalla intermedia donde pausar entre tirar y cobrar (mismo motivo
por el que se descartó la regla canónica de Suerte, §3.2-trigies). Por
eso Push (`ROLL_PUSHED`/`canPushLast`, resto sin terminar de la época del
Keeper IA, nunca usado por ningún tool) sigue sin implementarse: un
hechizo fallido simplemente no pasa nada, sin reintento.

Los dos hechizos (`adivinar-la-forma`, `sostener-el-aire`) son
**originales**, no los del manual con nombre — esos son propiedad de
Chaosium, mismo motivo por el que `castronegro.md`/`adaptacion.md` nunca
se subieron a git. Cada uno reusa un mecanismo GENÉRICO que ya existía en
vez de inventar uno: "adivinar la forma" compra un dado de bonificación
—literalmente el mismo `pendingLuckBonus` que ya usa Suerte, un hechizo y
Suerte son mecánicamente la misma cosa—, y "sostener el aire" llama a
`toolApplyStability`, ya genérico. `Investigator.spellsKnown` es
permanente como Mitos: sobrevive a `heredarInvestigador` por el mismo
spread que ya hacía permanentes al anillo y a Mitos.

**El contenido: "Lo que Bernardo sabía", novena entrada del catálogo,
epílogo corto (20-30 minutos) tras El Vigésimo.** Dos ramas según cómo
terminó esa aventura, leídas por fragmento de `consecuencia` —mismo
patrón que ya usaba El Vigésimo para los cuatro finales de Agua Blanca—:
`fin-heredar` (se puso el anillo) lleva a que el Ahijado enseñe —la
tercera vía del manual para aprender un hechizo, de una entidad de los
Mitos, y acá es literal—; `fin-cortar` (lo destruyó) lleva al libro sin
título que Bernardo dejó en el laboratorio, que además sube Mitos al
leerlo entero (reusa `apply_mythos_knowledge`). `fin-denunciar-vigesimo`
y `fin-irse-vigesimo` no llevan a nada de esto —esos dos investigadores
escaparon sin quedarse a buscar— y tienen su propia rama de cierre sin
magia, para que la campaña no quede en un callejón.

Se prueba de punta a punta en `prueba-hechizos.ts` (suite nueva): el
motor genérico primero (aprender, la tirada de la primera vez y sólo esa,
el costo con desborde a PV, los dos efectos), después las tres ramas del
contenido nuevo completas —incluida la de "sin magia"— usando
`record_consequence`+`reach_ending` para fabricar el final anterior sin
tener que jugar El Vigésimo entero.

**Interfaz: pestaña "Hechizos" nueva** (`App.tsx`), visible sólo si el
investigador sabe al menos un hechizo — no una pantalla exclusiva como
Combate, porque lanzar no bloquea el resto del juego como sí lo hace
entrar en combate. `castSpell` en `api.local.ts` llama al motor DIRECTO,
mismo camino que ya usa el combate real (bypasea el clasificador de
intención). De paso, el aviso de "dado de bonificación pendiente" en la
ficha —agregado con Suerte, §3.2-trigies— decía siempre "comprado con
Suerte"; ahora que un hechizo también lo deja pendiente, el aviso pasó a
ser genérico.

**Hueco encontrado el mismo día, jugándolo: los PM no se restauran en
ningún lado.** El manual dice 1 PM por hora sin pasar de POD/5
(`derived.maxMp`); acá `advanceTimeBy` no toca `mp`, `sleep()` (el verbo
"dormir", casi vestigial: ningún botón de ninguna aventura lo dispara)
tampoco, y `heredarInvestigador` resetea PV al máximo al pasar de aventura
pero deja los PM tal cual quedaron. Hoy es un recurso de una sola
dirección: sólo baja. No se anotó como simplificación consciente en el
plan original —se pasó—; queda pendiente para cuando se retome Magia.

### 3.2-duotrigies `rules/auditoria.ts` se muda, y la Cordura se acerca más al manual

Tres arreglos puntuales, el mismo día que Magia, a partir de repasar el
mecanismo de Cordura contra el texto real del manual (p. 155-156).

**`auditoria.ts` se muda de `rules/` a `scenario/`.** Vivía en `rules/`
desde siempre, pero auditaba ESCENARIOS —necesitaba `Scenario`,
`EfectoEscena`, `EscenaAutoral`, `IntencionLeida`, todos de `scenario/`—,
un salto (`rules → scenario`) que ni siquiera está en la cadena de
dependencias del proyecto (`rules → engine → keeper`). Eran `import type`,
así que no armaba un ciclo real en tiempo de ejecución, pero conceptualmente
"mecánica pura de CoC 7e" no debería depender de la capa de contenido.
Un solo importador (`prueba-auditoria.ts`), migración sin riesgo.

**Pifiar una tirada de Cordura ahora da la pérdida MÁXIMA del dado, no un
número derivado del mismo d100.** El manual (p. 156) es explícito: "a
fumbled Sanity roll results in the character losing the maximum Sanity
points". Las dos escenas que ya usaban el formato real "1/1DX" (el cadáver
del guardián y los nichos del mausoleo, ambas en El Vigésimo) calculaban
la pérdida del fallo con `numero % 4`/`% 6` —una forma de evitar una
segunda tirada, ya que el motor sólo admite una por intención— pero eso
trataba una pifia igual que cualquier fallo mediocre. Ahora, si
`tirada.grado === 'fumble'`, la pérdida es directamente el máximo (4 o 6).

**La crisis de 5+ deja de ser automática: pide una tirada de INT real,
como dice el manual (p. 166).** Antes, perder 5 o más de un golpe aplicaba
la crisis de locura temporal sola —documentado a propósito como
simplificación, "no hay Keeper en vivo que la note si el motor no la
aplica"—. Ahora `toolApplySanityLoss` tira INT con `tiradaInterna` (mismo
camino que ya usa la CON de Herida Grave: la tirada la fuerza el motor,
no cuenta contra el límite de una tirada por intención). Si la INT
aguanta, no hay crisis inmediata —el golpe igual bajó la Cordura—; si no
aguanta, se aplica la crisis como antes, con la fobia/manía que la escena
haya declarado. **Deliberadamente no se tocó nada más de la página**: la
"pérdida de control" genérica en CUALQUIER tirada fallida (saltar, gritar,
soltar algo) se dejó afuera a pedido explícito —la prosa de cada escena ya
cubre su propio fallo, y una línea de sabor automática sonaría repetida
sin un Keeper narrando en vivo.

Esto rompió tres suites que asumían la crisis de 5+ como incondicional con
semilla fija (`prueba-cordura.ts`, `prueba-fobias.ts` dos veces): se
arreglaron probando varias semillas hasta encontrar una de cada resultado
—INT aguanta / INT no aguanta—, mismo criterio que ya usaba
`prueba-suerte.ts` para no depender de qué toca en un d100 concreto.

**Sigue pendiente, y es más grande:** de las ~17 pérdidas de Cordura de
todo el juego, sólo estas dos usan una tirada de Cordura real —el resto
son automáticas o escaladas por el grado de otra tirada—. Convertir más
de esas a tiradas reales fue pedido explícitamente y queda para una
sesión de plan mode dedicada: toca contenido ya publicado de ocho
aventuras, escena por escena, con criterio propio en cada una.

### 3.2-tretrigies Cinco pérdidas de Cordura más pasan a tirada real

Continúa §3.2-duotrigies, mismo día: de las ~17 pérdidas de Cordura de
todo el juego, sólo 2 (El Vigésimo) usaban una tirada de Cordura real.
Se convirtieron cinco más, con criterio explícito por caso —confirmado
con el usuario antes de tocar contenido ya publicado de tres aventuras—:

**Se convirtieron (formato real "X/YDZ", con la pifia = máximo del dado
ya arreglada en §3.2-duotrigies):**
- `girar-talla` (Agua Blanca): 3 fijo → 1/1D4. El `mitos: {amount: 1}` de
  la misma escena sigue automático, sin tocar.
- `noche-posada` (Agua Blanca): 4 fijo → 1/1D6.
- `leer-procedimiento` (El Invierno Debido): 4 fijo → 2/1D6 —el éxito
  paga más que en las otras dos porque el peso de la escena no cambia
  con la tirada: el `mitos: {amount: 4}` con recorte PERMANENTE del techo
  de Cordura (99 − Mitos, para toda campaña futura) y la `crisis` ya
  declarada siguen exactamente igual.
- `hoja-agarrar` y `hoja-preguntar` (El Sueño Debido): estas dos YA tiraban
  un dado propio (Ocultismo y Psicología) pero cobraban 3 de Cordura fijos
  pasara lo que pasara. El motor sólo admite una tirada por intención, así
  que no se les podía sumar una tirada de Cordura aparte: se reusó la
  MISMA tirada para escalar el monto (éxito 1 / fallo 1D4), mismo patrón
  que ya usaban `fin-preguntar` (Tercer Umbral) y `cruzar` (El Orden
  Debido) desde antes. En `hoja-preguntar` la escala usa `tirada?.exito`
  crudo, no el `exito` combinado con el breviario que la escena ya usaba
  para las pistas: el breviario ayuda a ENTENDER, no cambia cuánto golpea
  psicológicamente la escena.

**Se dejaron como están, a propósito:**
- `mano` (El Orden Debido) y `escuchar-cilindro` (Agua Blanca): las dos
  tienen un comentario EXPLÍCITO de una sesión anterior diciendo que la
  falta de tirada es deliberada ("a propósito NO tiene tirada" / "el
  costo no depende de entender bien, sólo de escuchar"). Pisar esa
  decisión sin motivo nuevo no correspondía.
- `granero-craneos` (Agua Blanca): la Cordura sólo se cobra si la tirada
  de Descubrir YA declarada tiene éxito —fallarla no expone al
  investigador a los cráneos en absoluto, así que no es el mismo caso que
  una pérdida flat—. Convertirla exigiría partir la escena en dos
  acciones (buscar, después mirar), fuera de alcance de esta pasada.
- El costo del anillo (El Vigésimo, 8 fijo) y los tres costos de aprender
  hechizos (Lo que Bernardo sabía, §3.2-untrigies): precio de una
  decisión ya tomada, no percepción de horror — mismo criterio que
  Mitos, que tampoco tira dados.

Probado en `prueba:agua-blanca`, `prueba:invierno`, `prueba:sueno` y
`prueba:auditoria`; ninguna de las tres suites necesitó tocarse.

### 3.2-quatrigies PM se recuperan solos, Disolución deja de ser un buff, y el libro de Bernardo cita a alguien más

Tres ajustes puntuales, pedidos jugando la sesión anterior.

**Los PM se recuperan 1 por hora, sin pasar del máximo (p. 172).**
`recoverMagicPoints` (engine.ts), enganchado en `advanceTimeBy` al lado de
`recoverPatience` — mismo patrón, mismo lugar. Alcanza para las dos
situaciones a la vez: dentro de una aventura (cualquier `advance_time` los
va acercando al máximo) y ENTRE aventuras (`continuarCampana` siempre
salta semanas o meses, muchas más que las horas que hacen falta para
llenar cualquier PM máximo real), sin necesitar un reseteo aparte en
`heredarInvestigador` como sí tiene PV.

**Disolución (cuarto umbral) dejó de sentirse como un regalo.** Su
condición mecánica («La secuencia no es una sola») penalizaba Orientarse
Y BONIFICABA Descubrir. Reportado jugando: como Descubrir se pide todo el
tiempo y Orientarse casi nunca, cruzar el umbral más grave de los cuatro
se sentía como un buff neto, justo lo contrario de lo que dice su propia
descripción ("notarlo cuesta tanto como no notarlo"). Ahora las dos
penalizan.

**El libro sin título de Bernardo, en "Lo que Bernardo sabía", ahora cita
a alguien más.** Un nombre que no es el de Bernardo, un lugar que no es
Castronegro, con letra distinta al resto —copiada, no recordada—. Deja
una pista documentaria nueva: Bernardo no inventó nada de esto, lo
aprendió de alguien que a su vez lo aprendió de otro. No resuelve nada
—nadie tiene nombre todavía—, sólo dice que existe algo más grande detrás
de Bernardo, siguiendo la regla de oro del canon (v0.7 §15: más cerca de
la verdad, más información y menos certeza).

### 3.3 La aventura original publicada

Hueco M. El MVP no la toca, por decisión tuya. Cuando la toques, el material de
Chaosium sigue sin poder entrar al repositorio público — eso no cambia.

**Actualización:** ahora tiene número y lugar en la estructura —es la séptima,
el Séptimo Umbral (realidad) y a la vez el centro del Primero— y el puente de
canon está escrito en [CANON-MODULO-ORIGINAL.md](CANON-MODULO-ORIGINAL.md),
con la tabla de transposición Nuevo México → pampa y las reglas para sembrar
sin spoilear. La restricción de copyright no cambia: ese documento es notas y
mapeo propios, no transcripción, y el material de Chaosium sigue afuera.

---

## 4. Sistema

### 4.1 Contenido fuera del código ✔ HECHO — las dos aventuras

Agua Quieta y La Legua Perdida viven en `agua-quieta.contenido.json` /
`la-legua-perdida.contenido.json`: lugares, objetos, NPC, documentos, línea de
tiempo, temas de conversación, botones, desenlaces, y las condiciones de
CUÁNDO responde cada escena. Juntas pasaron de ocho archivos TypeScript
(~2200 líneas) a dos JSON más `aguaquieta.logica.ts` / `legua.logica.ts`.

La Legua se migró segunda, con la receta ya probada en Agua Quieta, y salió
mecánico: el mismo lenguaje de condiciones alcanzó sin agregar NINGÚN
operador nuevo. `contradicciones` —la mecánica que La Legua vino a estrenar—
ya estaba en el catálogo desde que se diseñó, junto a `exposicion`, que Agua
Quieta ya usaba para el desenlace de sostener la mirada. Esa reutilización
sin fricción es la confirmación de que el catálogo salió de mirar el uso
real y no de adivinar.

**Qué sigue siendo código, y por qué.** `resolver` —la prosa que se arma
distinto según el grado de la tirada y lo que ya se descubrió— no es una
pregunta de sí/no que un árbol de condiciones pueda expresar: es composición
de texto con estado. Convertirlo a datos sería inventar un lenguaje de guion
completo. Se queda en TypeScript, en un archivo que ahora sólo tiene eso.

**El lenguaje de condiciones** (`condiciones.ts`) tiene 18 operadores y sale
de catalogar las ~50 comprobaciones reales de las dos aventuras: verbo,
objetivo, lugar, texto, pista, documento, propiedad, hora, y los compuestos
`y`/`o`/`no`. Antes cada aventura reescribía sus propias `pista()`,
`documento()`, `aqui()` casi al carácter; ahora están una sola vez.

**Lo que se gana no es que el JSON sea más lindo: es que se puede recorrer.**
Un id mal tipeado dentro de una función —`propiedadVista(s, 'it-relog')`—
compila perfecto y se descubre jugando, o nunca. `validarContenido` corre AL
CARGAR y lo rechaza nombrando el campo. `prueba-carga-contenido.ts` le rompe
quince cosas distintas a propósito y verifica que las encuentre todas — misma
idea que `auditarLaAuditoria`.

Es una capa distinta de `prueba-auditoria.ts` y las dos hacen falta: ésta
pregunta «¿la forma es correcta y las referencias existen?», aquélla «¿todo
lo declarado tiene camino real en el juego?».

No queda contenido jugable en TypeScript: las dos aventuras son datos. Lo
único que sigue en código es lo que genuinamente tiene que serlo —`resolver`
de cada escena, en `aguaquieta.logica.ts` / `legua.logica.ts`— y la
infraestructura que lo carga (`condiciones.ts`, `contenido.schema.ts`,
`validarContenido.ts`, `cargarAventura.ts`), que no crece con cada aventura
nueva: ya está escrita.

### 4.2 CI de verdad ✔ HECHO — verifica, no publica

`.github/workflows/verificar.yml` corre el typecheck y **las 22 suites** en cada
push a `main` y en cada pull request. Reemplaza a `publicar.yml`, que estaba
escrito, commiteado y **nunca corrió una sola vez**.

**Por qué nunca corrió.** No era un problema del workflow: `main` nunca se había
pusheado. `npm run desplegar` empuja el sitio *construido* a la rama `gh-pages`
—que es de donde Pages sirve— y nunca toca `main`. El resultado era que el sitio
publicado estaba al día y el código fuente en GitHub estaba doce commits atrás,
en «La Legua Perdida también pasa a contenido en datos»: la tercera aventura, el
combate, el simulador y el Círculo Rojo existían sólo en la máquina de Nicolás y
dentro del bundle minificado.

**Verifica y no publica**, por decisión. `publicar.yml` terminaba en
`deploy-pages@v4`, que exige Settings → Pages → Source: *GitHub Actions*; hoy
apunta a la rama `gh-pages` (`build_type: legacy`), así que su paso de
publicación habría fallado igual. Separar las dos cosas significa que si el CI se
cae un martes, se puede seguir publicando con `npm run desplegar`.

**Una sola lista de suites.** El workflow corre `npm run prueba:todo`, no
veintidós pasos nombrados. Los pasos nombrados dan mejores tildes en la interfaz
de GitHub a cambio de dos listas que se desincronizan la primera vez que alguien
agregue una suite y toque sólo una de las dos. `prueba:todo` termina en `build` +
`revisar:bundle`, así que la auditoría que impide publicar la solución de la
aventura también corre en CI.

**Requiere, de tu lado, una sola vez:**

```bash
gh auth refresh -s workflow
```

El token actual tiene `gist`, `read:org` y `repo`; sin el scope `workflow`,
GitHub rechaza cualquier push que toque `.github/workflows/`.

### 4.3 Tablas propietarias de CoC 7e ✔ VERIFICADAS

Contra capturas del manual con licencia (Tabla 1, Quick Reference: Investigator
Generation). Se encontraron y corrigieron tres diferencias reales, ninguna
copiada del manual —los números se transcriben, el formato de tabla no—:

- **Bonificación de daño / Corpulencia** (`rules/derived.ts`): la tabla de
  memoria sólo distinguía hasta STR+SIZ 164 y metía todo lo demás en un único
  «+1D6». La real tiene tramos hasta 524 (+2D6 a 284, +3D6 a 364, +4D6 a 444,
  +5D6 a 524) y una regla de extrapolación más allá: +1D6 y +1 Build cada 80
  puntos adicionales o fracción. Ya no es de memoria: es la tabla completa.
- **Movimiento por edad** (`rules/derived.ts`, `rules/creacion.ts`): el MOV
  nunca restaba por edad —`computeDerived` ni siquiera recibía la edad—. Ahora
  resta 1/2/3/4/5 en los 40/50/60/70/80, como dice la tabla.
- **El tramo de 80 años** (`rules/creacion.ts`): «setenta o más» hacía de
  catch-all para 70 y 80 juntos, con los números de 70. Inalcanzable en la
  práctica (`EDAD_MAXIMA` es 79) pero estaba mal declarado; ahora tiene su
  propio tramo (resta 80, APA -25) por si el tope de edad se mueve algún día.

El umbral de pifia (`rules/dice.ts`) no es una tabla con formato propietario,
es una regla numérica (01 crítico, 100 pifia, <50% también pifia en 96-100) y
coincide con lo conocido del sistema — no necesitó captura.

Verificado por `prueba-creacion.ts`. No hay hoy una tabla genérica de pérdida
de Cordura por tipo de horror —cada escena declara la suya— así que no hay
nada que verificar ahí todavía.

La **Tabla XVII (armas)** también está verificada, en el subconjunto que el
juego usa — ver 4.4.

### 4.4 Combate ✔ HECHO — reglas, armas y asalto jugado

**HECHO: las reglas puras y el catálogo.**

- `rules/armas.ts` — quince armas, verificadas contra la Tabla XVII: lo que
  hay en un galpón (palo, piedra, antorcha, rebenque), filos (navaja,
  cuchillo de carnear, facón, hacha de mano, hacha de leña) y armas de fuego
  cortas de época (Derringer .25, revólver .32 y .38, pistola .45). Los
  nombres son nuestros —un «facón» no está en un manual en inglés, pero
  mecánicamente es el cuchillo grande de esa tabla—; los números son del
  manual.
- `rules/combate.ts` — la tirada enfrentada del cap. 6: quién gana los
  empates según el defensor esquive o devuelva el golpe, y el éxito extremo
  (empalar suma una tirada entera encima del máximo; golpear sólo llega al
  máximo), que sólo consigue quien inicia el ataque.
- `engine/rng.ts` — dados de daño (D3 a D10) de la misma cadena verificable,
  con etiqueta propia para que el daño no quede correlacionado con la tirada
  que lo produjo, y con rechazo por muestreo porque acá el sesgo sí se
  acumula.
- Tres habilidades nuevas: Pelea, Armas de Fuego (pistola) y Lanzar. Antes el
  motor podía aplicar daño y nadie podía tirar para causarlo.

Lo verifica `prueba-combate.ts`, incluida la regla que más se olvida en la
mesa: el defensor que contraataca y saca un extremo NO empala.

**HECHO TAMBIÉN: el asalto jugado.**

- `Npc.combate` — PV, Pelea, Esquivar, arma, bonificación de daño y qué hace
  cuando lo atacan. Es **opcional y ausente en casi todos**: una viuda en su
  cocina no tiene estadísticas de combate, y dárselas «por las dudas» sería
  sugerir que pegarle es una opción que el juego contempla. Sin ellas el
  motor rechaza el ataque y explica que esa pelea no está prevista.
- `resolve_attack` — una herramienta, no tres. Tira por el investigador, tira
  por el que se defiende, compara y aplica el daño a quien corresponda. Es
  una sola a propósito: una tirada enfrentada que se pueda pedir a pedazos es
  una tirada que se puede abandonar cuando el primer dado sale mal.
- **La tirada del rival va al registro público**, con su HMAC, igual que las
  del investigador. En una tirada enfrentada el motor tira por las dos
  partes; si sólo una quedara registrada no habría manera de comprobar que
  no le regaló el resultado a la que le convenía.
- Llegar a 0 PV **no mata a nadie**: lo saca de la pelea. Si muere, si queda
  tirado o si lo levantan después lo decide quien narra — una resta no
  debería poder matar sola. Y ensañarse con alguien que ya está en el piso el
  motor lo rechaza: eso se narra, no se tira.
- El validador rechaza un arma mal escrita en la ficha de un NPC. Antes caía
  en «desarmado» y el personaje peleaba a puño limpio con el facón declarado
  en la mano — la misma familia de bug de siempre.
- Al cliente cruza **si puede pelear y si ya está en el piso, nunca cuántos
  PV le quedan**. En la mesa nadie ve la ficha del rival: se ve cómo se mueve.

De las aventuras publicadas, sólo Cirilo Sosa (*El Invierno Debido*) tiene
estadísticas de combate — ver más abajo, «pantalla de combate táctico». El
sistema se verifica con rivales armados dentro de `prueba-combate.ts`, igual
que `prueba-desacople.ts` arma «El campanario» para probar el motor sin tocar
el contenido real, y con un **simulador jugable en el navegador**
(`scenario/simulador.ts` + `web/Simulador.tsx`): un galpón sin historia, con
tres rivales de dificultad creciente, para probar las reglas con las manos
antes de meterlas en una aventura de verdad.

**Creación rápida y plantillas** (`Creacion.tsx` con `rapido`, `app/plantillas.ts`):
crear un investigador para el simulador ya no pasa por trasfondo ni conexión
clave —un personaje de prueba no tiene campaña de la que recuperar Cordura,
y preguntárselo era pedirle al jugador que inventara una historia para tirar
un dado—. Quedan sólo los tres pasos que sí cambian un asalto: quién es, los
dados, y el reparto de habilidades. Por dentro se le arma un trasfondo de
relleno que nunca se muestra —`crearInvestigador` lo exige igual, es el
mismo validador para cualquier ficha— y se guarda solo, sin pedirlo, en
`localStorage` (aparte del log de campañas, que vive en IndexedDB: uno es un
registro con muerte permanente, el otro una ficha que se puede pisar y
reusar). La próxima vez que se abre el galpón, ese personaje está ahí, con
un botón para entrar directo y otro para borrarlo.

**HECHO TAMBIÉN: orden de turno, huir, maniobras y modificadores de fuego.**

- **Herida Grave** (p. 119, no estaba pedida pero es la mitad de la pregunta
  «¿perder mucha vida en un turno no debería penalizar?»): perder la mitad o
  más de los PV MÁXIMOS de un solo golpe obliga a tirar CON, aunque no se
  llegue a 0. Si falla, `status: 'unconscious'` —estado nuevo, bloquea
  acciones por el mismo camino que ya bloqueaba `dead`/`insane`— con PV por
  encima de 0: no es lo mismo que quedar fuera por daño acumulado, es un
  golpe que aturde de una sola vez.
- **Orden de asalto por DES** (`CombateNpc.dex`, opcional): con más de dos
  peleando, cualquier otro presente con estadísticas de combate también
  actúa ese asalto — los más rápidos que el investigador ANTES del golpe
  declarado (pueden interrumpirlo), los más lentos DESPUÉS. Enfrentar a más
  de uno es de verdad más peligroso, no sólo una etiqueta.
- **`resolve_flee`** — salir de una pelea cuesta el turno entero y cada rival
  en pie se lleva un golpe de oportunidad con ventaja, porque quien huye no
  se está defendiendo. Puede fallar: si el golpe de oportunidad tumba al
  investigador, no llega a irse.
- **`resolve_maneuver`** — desarmar, derribar, sujetar. Se resuelve como un
  Contraataque (Pelea contra Pelea): si gana la maniobra, aplica su efecto
  en vez de daño; si pierde, el otro conecta un golpe normal. La Corpulencia
  de los dos decide si es posible antes de tirar nada —3 puntos o más de
  diferencia en contra, imposible—. Derribar y sujetar dejan una marca de
  UN SOLO USO (`derribado`/`agarrado`) que se gasta con la próxima tirada
  que corresponda.
- **Modificadores de armas de fuego** (`apuntando`, `punto_blanco`,
  `cubierto`, `blanco_movil`) — sólo aplican con `armas_fuego`; en cuerpo a
  cuerpo el motor los ignora aunque se los pasen. «Apuntando» confía en que
  se declaró el turno anterior: no hay un estado de «desde cuándo apunta»,
  simplificación conocida.

Todo verificado por `prueba-combate.ts` y probado a mano en el simulador del
navegador antes de darlo por bueno.

**Corregido: el simulador ya no mezclaba a los tres rivales en la misma
pelea.** Los tres matones del galpón están siempre `present: true` —son
opciones de menú, no una emboscada—, pero la regla nueva de orden de asalto
hace actuar a cualquier presente con estadísticas de combate. Resultado: al
atacar al muchacho asustado, el hombre con cuchillo (más rápido por DES)
también atacaba y podía matar al investigador sin que el jugador lo hubiera
elegido. `aislarRival()` (en `api.local.ts` y `server/index.ts`, duplicado a
propósito porque son dos entornos de ejecución separados) deja presente sólo
al rival elegido en la pantalla antes de cada `atacar`/`huir`/`maniobra`: en
el simulador, «presente» pasa a significar «seleccionado en la interfaz».
La regla del motor en sí —cualquier presente pelea— queda intacta, porque es
correcta para una escena real con varios enemigos.

**Corregido: un arma de fuego ya no se contraataca a mano, salvo a
quemarropa.** `defensaPorDefecto` era una preferencia FIJA por NPC —«esquiva»
o «contraataca»— sin mirar nunca con qué lo estaban atacando. Un NPC con
`contraataca` le devolvía el golpe con un palo a un disparo hecho desde
lejos, que no es una regla de CoC 7e: es que el motor no distinguía el arma
de quien ataca. Reportado jugando el simulador. Ahora, si el arma que ataca
es de fuego y NO es a quemarropa (`punto_blanco`), la defensa se fuerza a
Esquivar sin importar la preferencia del NPC; a quemarropa —que ya es
forcejeo, no distancia— vuelve a valer la preferencia normal. Verificado en
`prueba-combate.ts` contra el matón de siempre, en los tres casos: lejos,
a quemarropa, y cuerpo a cuerpo (sin cambios).

**HECHO TAMBIÉN: pantalla de combate táctico dentro de una aventura real.**

Reportado jugando: pelear con Cirilo Sosa en *El Invierno Debido* era tocar
el mismo botón («Enfrentar a Cirilo») una y otra vez, cada click un asalto de
texto plano en medio de la lista normal de acciones — nada que ver con el
simulador, con selector de arma, tarjetas de rival y `RollCard`s. El motor de
combate era el mismo de siempre (`resolve_attack`, `ordenDeAsalto`…); lo que
faltaba era conectarlo a una pantalla de verdad dentro de una aventura, no
sólo en el galpón aislado.

- `GameState.activeCombat` (`{npcIds, startedAt, reason} | null`) — nuevo,
  persistido en el log (`COMBAT_STARTED`/`COMBAT_ENDED`). Lo arranca
  `EfectoEscena.iniciaCombate` (una línea nueva en la escena de Cirilo, junto
  al `combate` que ya existía) y lo cierra solo `cerrarCombateSiTerminado`,
  llamado al final de `resolve_attack`/`resolve_flee`/`resolve_maneuver`:
  todos los NPC de `activeCombat` en el piso, el investigador caído, o una
  huida exitosa. Genérico sobre el/los NPC — no sabe nada de Cirilo en
  particular, así que cualquier aventura futura con un rival puede usarlo
  con la misma línea.
- `web/Combate.tsx` (nuevo), montado por `App.tsx` con un `if` temprano sobre
  `state.activeCombat` —antes que el simulador, antes que todo lo demás—: en
  cuanto el motor pone la marca, la pantalla entera pasa a ser el combate, y
  vuelve sola a la narración cuando `activeCombat` se apaga. No hay botón de
  «salir»: de ahí no se sale por decisión de interfaz.
- Dos diferencias de fondo con el simulador, no cosméticas: **el arma que se
  puede elegir es la que el investigador realmente tiene encima**
  (`Item.armaId`, `armasDelInvestigador` en `api.local.ts` — Cirilo se pelea
  a mano limpia porque ningún ítem de la aventura declara un arma, no porque
  esté hardcodeado); y **nunca se muestra el PV exacto del rival**, los
  mismos cuatro escalones de `EstadoDeCombate` que ya rige para cualquier NPC
  en el resto del juego —el simulador sí muestra el número, porque ahí no
  hay nada que la mesa deba esconder—.
- A diferencia del simulador (que aísla al rival elegido con `aislarRival`
  para que los otros dos matones del galpón no se sumen), acá el motor pelea
  con **todo** NPC de combate presente, sin aislar a nadie — la regla de
  «el resto del cuarto» (orden por DES) que ya existía queda intacta y en
  uso real por primera vez.
- Cada asalto se narra al historial de la aventura (`turn.narrate(...)`) al
  resolverse, no sólo se muestra en la pantalla de combate: volver a la
  narración deja el intercambio entero, asalto por asalto, en la historia —
  se puede scrollear hacia atrás y leerlo como cualquier otro tramo de la
  partida.

Probado a mano en el navegador contra Cirilo, con los tres caminos: ganar la
pelea a golpes, una maniobra (Derribar) que no cambia nada cuando empata, y
—por las tiradas que tocaron esa corrida— el investigador cayendo inconsciente
y **muriendo** en el intercambio: la pantalla volvió sola a la narración con
el cierre correcto (`reason: 'investigador_caido'`), el historial completo
del combate quedó escrito, y el juego pasó a ofrecer continuar con un
investigador de la reserva — exactamente el camino que ya existía para
cualquier muerte, sin nada especial para el combate.

**No entra por ahora, a propósito:** escopetas y rifles largos, porque su
daño depende del tramo de distancia y el motor no tiene distancias dentro de
una escena; meterlas con un solo número sería inventar una regla. Armas de
guerra (Thompson, granadas, lanzacohetes), que no van a aparecer en una
estancia bonaerense en 1925. Y una herramienta de reanimar a un inconsciente
—hoy no existe ninguna, ni para Herida Grave ni para llegar a 0 PV—.

### 4.5 Móvil ✔ HECHO

Medido antes, en 375×812: la ficha ocupaba 325 píxeles arriba y **la narración
—el juego— quedaba en 48.** Dos renglones. El media query que había apilaba las
tres columnas, que es peor que no tener ninguno: entraba, y no se podía jugar.

Ahora en teléfono se ve **un panel por vez**, con barra abajo: Ficha · Historia ·
Tablero. La narración pasó de 48 a 228 píxeles con una ficha de tirada en
pantalla, y a 330 sin ella.

Lo que salió de medir y no de suponer:
- La lista de acciones ocupaba 550 px con trece opciones. Ahora scrollea en su
  propio cajón con tope de 34vh, y el texto no se va de la pantalla.
- La ficha de tirada medía 208 px: **más que la narración**. Compactada.
- En horizontal quedaban **cero** botones visibles. El bloque de altura corta
  estaba antes del de teléfono en el archivo y lo pisaba la cascada: va al
  final, y está comentado para que no vuelva a moverse.
- Los botones ± de la creación medían 32 px. Ahora 44, que es la referencia de
  área táctil, y se aprietan cuarenta veces seguidas repartiendo puntos.

El tablero avisa con un contador cuando aparecen pistas nuevas y el jugador
está leyendo, y tocar una acción devuelve a la historia — que es donde va a
pasar algo.

### 4.6 Las dos piezas que pedía la cuarta aventura ✔ HECHAS

Se escribieron antes que la aventura, a propósito: son mecánica, y la mecánica
tiene que existir y estar probada antes de que el contenido se apoye en ella.

**El operador `consecuencia` — que una aventura pueda mirar a la anterior.**
El proyecto decía tener continuidad entre aventuras, pero el CONTENIDO no podía
consultarla: `sembrarHerencia` cruza el desenlace anterior y las consecuencias
`permanent` de alcance `campaign`/`world`, y el lenguaje de condiciones tenía
18 operadores, ninguno capaz de mirar una consecuencia. Ahora son 19. Busca por
fragmento de la descripción y no por id, porque al reemitirlas el motor les
genera un id nuevo y lo único que sobrevive intacto es el texto.

Con eso, la cuarta aventura puede preguntar «¿esta persona ya vio la marca en
otro campo?» sin que el jugador lo declare — que es la tesis del proyecto
(«¿una aventura puede afectar de verdad a la siguiente?») probada de punta a
punta y no sólo afirmada. `prueba-campana.ts` verifica las dos mitades: que la
consecuencia cruce, y que el operador la vea del otro lado.

De paso, el validador ahora rechaza `pista`/`narrado`/`consecuencia` con
`contiene` vacío: `String.includes('')` da `true` siempre, así que la escena se
dispararía desde el primer turno. Es el peor tipo de bug de contenido, porque
no rompe nada — sólo pasa antes de tiempo.

**`apply_mythos_knowledge` — la única habilidad que cuesta tenerla.**
`mitos` existía en el catálogo desde el principio con base 0, con la Cordura
máxima ya atada a ella (`99 − Mitos`, `rules/derived.ts`), prohibida de comprar
en la creación y excluida de las marcas de desarrollo… y **sin ninguna forma de
subir**. Era una mecánica completa a la que le faltaba la puerta de entrada.

La herramienta nueva la sube, baja el techo de Cordura y **recorta la Cordura
actual si quedó por encima del techo nuevo** — sin ese recorte la ficha
mostraría «82 de 79». Emite su propio evento (`MYTHOS_GAINED`) en vez de
`SKILL_IMPROVED`, porque no es una mejora por uso y el recorte del techo tiene
que quedar en el log al lado de su causa. No tira dados a propósito: no es una
tirada fallida, es el precio de una decisión que el jugador tomó sabiendo, y su
descripción le exige a quien la usa haber avisado antes.

Se prueba en `prueba-mitos.ts` (suite 23), incluido lo que la hace permanente
de verdad: que los puntos y el techo bajo **crucen a la aventura siguiente**.

**Sobre nombrar los Mitos:** `keeper/validate.ts` prohíbe la frase «los Mitos»
en la narración, y no hace falta levantar esa restricción. La prosa describe lo
que el investigador leyó; «Mitos de Cthulhu» es la etiqueta mecánica de la
ficha, no una palabra que nadie diga en 1925.

---

## Orden sugerido

1. ~~1.1 tiradas sociales~~ ✔
2. ~~2.1 escalas del Umbral~~ ✔
3. **1.2 auditoría de alcanzabilidad** — evita el próximo bug de esta familia
4. **3.2 segunda aventura** — dice si la arquitectura sirve
5. **3.1 creación de personaje**
6. lo demás, según lo que salga de 4

## Agregar una aventura, hoy

Después del paso a contenido en datos, el camino es:

1. Escribir `src/scenario/<nombre>.contenido.json` — lugares, objetos, NPC,
   documentos, temas, botones, desenlaces, y el `cuando` de cada escena en el
   lenguaje de condiciones. Es el 90% del trabajo y no se toca TypeScript.
2. Escribir `src/scenario/<nombre>.logica.ts` — sólo el `resolver` de cada
   escena declarada, casado por `id` con el JSON.
3. Escribir `src/scenario/<nombre>.ts` — tres líneas: `cargarAventura(json,
   logica, pregens)`.
4. Sumar una línea a `src/scenario/catalogo.ts` con su fecha diegética.

(Esta lista tenía un cuarto paso, `<nombre>.keeper.ts` con el briefing del
Keeper IA — arrastre de antes de que ese modo se sacara del todo, ver
cabecera de CLAUDE.md. Ninguna aventura real tiene ese archivo desde
entonces; corregido acá el 2026-09-02, al escribir la novena.)

Si el JSON tiene una referencia rota —un objeto que no existe, un secreto que
el NPC no tiene, una escena declarada sin `resolver`— el juego lo dice al
cargar, con el campo nombrado. Antes eso compilaba y se descubría jugando.

El catálogo se ordena solo por fecha, así que una aventura escrita después
puede transcurrir antes y encajar en su lugar sin renumerar nada. `requiere`
está listo para encadenar cuando haya dos.

Ya no queda nada de Agua Quieta en el motor: los desenlaces, las escenas con
prosa propia y hasta la regla de que Rosa no habla de noche en el patio viven
con la aventura. `offline.ts` pasó de 1153 a 631 líneas.

## Cómo se mantiene

Cada partida que jugás produce candidatos. El criterio para meter algo acá:
**¿te hizo desconfiar del juego?** Eso va al carril 1. ¿Te dio ganas de algo que
no estaba? Carril 3. ¿Te faltó un número? Carril 2.

Este archivo se edita cuando pasa eso, no en una reunión de planificación.
