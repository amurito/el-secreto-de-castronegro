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

Regla que ya nos sirvió tres veces: **nada entra sin una prueba que falle si se
rompe.** `prueba-desenlaces.ts` existe porque dos finales estaban declarados y
eran inalcanzables, y nadie se había dado cuenta.

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

### 1.2 Auditar todo lo que se ofrece contra lo que se puede alcanzar

`prueba-desenlaces.ts` hace esto con los finales. Falta el mismo barrido para
pistas, propiedades ocultas y documentos: recorrer el escenario y verificar que
cada cosa declarada tiene al menos un camino que la entrega.

Los dos bugs que te bloquearon —el final inalcanzable y la pista del retardo
atada al primer intento— eran el mismo error de fondo: **algo declarado en los
datos sin camino real en el código.** Una prueba genérica los habría encontrado
a los dos antes que vos.

### 1.3 Repaso de las tiradas que no existen

Hoy tiran dados: mirar de cerca, registrar un lugar, mirar el agua, examinar la
placa, comparar fotos, trepar, cavar. No tiran: hablar, usar objetos sobre
otros, gritar, escuchar en algunos casos.

Hay que decidir caso por caso cuál merece dado. No todo lo merece —pedir una
tirada para algo que no puede fallar es ruido— pero hoy la línea está puesta por
accidente, no por criterio.

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
- ¿La Estabilidad se recupera con descanso, y cuánto?
- El arrastre entre aventuras: la Exposición no baja con descanso por canon,
  pero cinco meses lejos de un Umbral no son descanso. Si se decide que baje,
  es una ampliación de canon y hay que aprobarla.

### 2.2 Qué pasa después de Disolución

Cruzar el cuarto umbral hoy no hace nada mecánicamente. Es el único de los
cuatro sin efecto propio.

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

### 4.1 Contenido fuera del código

Hoy la aventura es TypeScript. Está bien para una; para cinco no. Datos en
archivos, validación al cargar, y el escenario deja de necesitar compilación.

Depende de 3.2: sin una segunda aventura no sabés qué forma tiene que tener.

### 4.2 CI de verdad

`.github/workflows/publicar.yml` está escrito y sin usar. Necesita, de tu lado:

```bash
gh auth refresh -s workflow
```

Después commitear el workflow y poner Settings → Pages → Source: GitHub Actions.
Mientras tanto `npm run desplegar` hace lo mismo desde tu máquina.

### 4.3 Tablas propietarias de CoC 7e

Marcadas con `⚠` en el código: bonificación de daño, Corpulencia, umbral de
pifia, pérdidas de COR, locura. Están implementadas de memoria del sistema, no
copiadas. Hay que verificarlas contra tu manual con licencia, una por una.

### 4.4 Móvil

Tres columnas fijas. En un teléfono no entra. No es difícil, es trabajo.

---

## Orden sugerido

1. ~~1.1 tiradas sociales~~ ✔
2. ~~2.1 escalas del Umbral~~ ✔
3. **1.2 auditoría de alcanzabilidad** — evita el próximo bug de esta familia
4. **3.2 segunda aventura** — dice si la arquitectura sirve
5. **3.1 creación de personaje**
6. lo demás, según lo que salga de 4

## Agregar una aventura, hoy

Después del refactor social, el camino es:

1. Escribir `src/scenario/<nombre>.ts` — un `Scenario`.
2. Escribir `src/scenario/<nombre>.dialogo.ts` — los temas de sus NPC.
3. Escribir `src/scenario/<nombre>.keeper.ts` — el briefing, que sólo importa
   el servidor y por eso no entra al bundle público.
4. Sumar una línea a `src/scenario/catalogo.ts` con su fecha diegética.

El catálogo se ordena solo por fecha, así que una aventura escrita después
puede transcurrir antes y encajar en su lugar sin renumerar nada. `requiere`
está listo para encadenar cuando haya dos.

Ya no queda nada de Agua Quieta en el motor: los desenlaces, las escenas con
prosa propia y hasta la regla de que Rosa no habla de noche en el patio viven
en `aguaquieta.escenas.ts`. `offline.ts` pasó de 1153 a 599 líneas.

## Cómo se mantiene

Cada partida que jugás produce candidatos. El criterio para meter algo acá:
**¿te hizo desconfiar del juego?** Eso va al carril 1. ¿Te dio ganas de algo que
no estaba? Carril 3. ¿Te faltó un número? Carril 2.

Este archivo se edita cuando pasa eso, no en una reunión de planificación.
