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

### 1.1 Hablar no tira dados ★ el más grande

Medido sobre una partida de 30 turnos: las ocho conversaciones con Rosa
resolvieron **cero tiradas**. Preguntarle a una testigo que esconde algo es
automático hoy. Persuasión, Psicología y Labia están en la ficha, con valores,
y no se usan nunca.

Esto rompe dos cosas a la vez: la mitad social del sistema no existe, y la
actitud de Rosa sube por temporizador en vez de por lo que hacés.

Alcance: tirada por tema según su resistencia, la actitud modifica la
dificultad, fallar cierra el tema por un rato en vez de para siempre.

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

### 2.1 Escalas del Umbral ★ bloquea el resto del balance

`src/rules/umbral.config.ts`. Todas las constantes en un archivo, a propósito,
porque dijiste "escalas no lo sé aún".

Tu partida terminó en **Exposición 100/100 con los cuatro umbrales cruzados en
una hora de juego**. O la escala es corta, o las ganancias son grandes, o
asomarse al agua debería costar menos que bajar. Ahora tenés el dato para
decidirlo; antes no.

Preguntas abiertas: ¿100 es alcanzable en una aventura corta o debería ser el
techo de una campaña? ¿La Estabilidad se recupera con descanso? ¿Cruzar
Disolución debería tener consecuencia mecánica, no sólo narrativa?

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

1. **1.1 tiradas sociales** — es la mitad del sistema que no existe
2. **2.1 escalas del Umbral** — ya tenés los datos para decidir
3. **1.2 auditoría de alcanzabilidad** — evita el próximo bug de esta familia
4. **3.2 segunda aventura** — dice si la arquitectura sirve
5. lo demás, según lo que salga de 4

## Cómo se mantiene

Cada partida que jugás produce candidatos. El criterio para meter algo acá:
**¿te hizo desconfiar del juego?** Eso va al carril 1. ¿Te dio ganas de algo que
no estaba? Carril 3. ¿Te faltó un número? Carril 2.

Este archivo se edita cuando pasa eso, no en una reunión de planificación.
