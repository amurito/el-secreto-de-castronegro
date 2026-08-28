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

### 2.3 Consentimiento de meta-horror

Hueco L del análisis. `knowledge.playerObserved` existe en el estado y no se usa
todavía: el motor puede detectar cuándo el jugador sabe algo que su investigador
no. Está listo para cuando decidas si querés esa capa y con qué aviso previo.

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

**Pendiente: tres habilidades que el sistema no tiene y van a hacer falta.**
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
4. Escribir `src/scenario/<nombre>.keeper.ts` — el briefing, que sólo importa
   el servidor y por eso no entra al bundle público.
5. Sumar una línea a `src/scenario/catalogo.ts` con su fecha diegética.

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
