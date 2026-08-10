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

### 3.1 Creación de personaje

Dijiste "por ahora pregenerado, luego va a haber creación". Elena y Tomás están
escritos a mano en `pregens.ts`.

Antes de construirla hay que decidir si es CoC 7e por el libro —tiradas de
características, ocupaciones, puntos de habilidad— o algo más corto. La primera
es varias veces más trabajo y trae la duda de derechos que ya conocés.

### 3.2 Segunda aventura

La prueba de fuego de la arquitectura. Si escribir otra aventura es sobre todo
llenar un `Scenario` y un `KeeperBriefing`, el motor sirve. Si hay que tocar
`offline.ts` en veinte lugares, el motor está acoplado a Agua Quieta y conviene
saberlo pronto.

Recomendación: hacer esto **antes** que creación de personaje. Es el que más
información devuelve por lo que cuesta.

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

Lo que **todavía** vive escrito a mano en `offline.ts` y habría que mover a
datos cuando llegue la segunda aventura: los desenlaces, las escenas con prosa
propia (mirar el agua, comparar las fotos) y la regla de que Rosa no habla en el
patio de noche. Nada de eso bloquea escribir una aventura nueva — bloquea que la
nueva tenga escenas igual de escritas.

## Cómo se mantiene

Cada partida que jugás produce candidatos. El criterio para meter algo acá:
**¿te hizo desconfiar del juego?** Eso va al carril 1. ¿Te dio ganas de algo que
no estaba? Carril 3. ¿Te faltó un número? Carril 2.

Este archivo se edita cuando pasa eso, no en una reunión de planificación.
