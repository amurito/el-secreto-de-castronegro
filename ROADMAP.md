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
  debajo de un piso permanente — la mitad del pico histórico que ese
  investigador alcanzó alguna vez (`peakExposure`, que en sí nunca baja).
  Los umbrales cruzados (`thresholdsCrossed`) siguen siendo irreversibles y
  no se tocan. Números en `EXPOSURE_DECAY_PER_MONTH` / `EXPOSURE_FLOOR_FRACTION`
  (`rules/umbral.config.ts`), lógica en `exposicionTrasMeses`/`pisoDeExposicion`
  (`rules/umbral.ts`), aplicado en `heredarInvestigador` (`engine/engine.ts`).
  Verificado por `prueba-campana.ts`.

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
puntos según características, rango de Crédito—, que es mecánica. Diez
ocupaciones propias, en `src/scenario/ocupaciones.ts`.

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

### 4.2 CI de verdad

`.github/workflows/publicar.yml` está escrito y sin usar. Necesita, de tu lado:

```bash
gh auth refresh -s workflow
```

Después commitear el workflow y poner Settings → Pages → Source: GitHub Actions.
Mientras tanto `npm run desplegar` hace lo mismo desde tu máquina.

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
