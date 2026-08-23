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

### 3.3 La aventura original publicada

Hueco M. El MVP no la toca, por decisión tuya. Cuando la toques, el material de
Chaosium sigue sin poder entrar al repositorio público — eso no cambia.

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

Ninguna de las tres aventuras publicadas tiene todavía un personaje con
estadísticas de combate — ninguna es una aventura de pelear. El sistema se
verifica con rivales armados dentro de `prueba-combate.ts`, igual que
`prueba-desacople.ts` arma «El campanario» para probar el motor sin tocar el
contenido real, y con un **simulador jugable en el navegador**
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
