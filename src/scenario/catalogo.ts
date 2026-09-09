/**
 * CATÁLOGO DE AVENTURAS.
 *
 * El único lugar donde hay que tocar código para agregar una aventura: escribir
 * el escenario y sumar una línea acá. Todo lo demás —botones de hablar, temas,
 * desenlaces, opciones— sale de los datos del escenario.
 *
 * ORDEN CRONOLÓGICO. Las aventuras del universo pasan en un orden, y ese orden
 * no es el orden en que se escriben ni en que se juegan. `cuando` es la fecha
 * diegética; el catálogo se ordena por ella. Una aventura escrita después puede
 * transcurrir antes y encajar en su lugar sin renumerar nada.
 *
 * `requiere` deja declarar que una aventura da por vistas las cosas de otra
 * puntual — es sólo texto informativo en la tarjeta, nunca bloquea nada.
 * `desbloqueaCon` es distinto: bloquea de verdad en la interfaz hasta que
 * haya AL MENOS UN final archivado de cualquier otra aventura (ver su doc
 * en `EntradaCatalogo` más abajo).
 */

import type { Scenario } from './types.ts';
import { AGUA_QUIETA } from './aguaquieta.ts';
import { LA_LEGUA } from './legua.ts';
import { TERCER_UMBRAL } from './tercerumbral.ts';
import { INVIERNO_DEBIDO } from './inviernodebido.ts';
import { SUENO_DEBIDO } from './suenodebido.ts';
import { ORDEN_DEBIDO } from './ordendebido.ts';
import { AGUA_BLANCA } from './aguablanca.ts';
import { EL_VIGESIMO } from './elvigesimo.ts';
import { LO_QUE_BERNARDO_SABIA } from './loquebernardosabia.ts';
import { EL_HOMBRE_QUE_MIRABA_EL_AGUA } from './hombreagua.ts';
import { EL_CIRCULO_ROJO } from './circulorojo.ts';

export interface EntradaCatalogo {
  scenario: Scenario;
  /** Fecha diegética ISO. Ordena el catálogo. */
  cuando: string;
  /** Cómo se muestra la fecha. */
  epoca: string;
  /** Duración aproximada, para que el jugador sepa en qué se mete. */
  duracion: string;
  /** IDs de aventuras que conviene haber jugado antes. */
  requiere?: string[];
  /**
   * Es una CONTINUACIÓN DIRECTA, no una historia suelta que se lee distinto.
   *
   * La diferencia importa en la tarjeta del inicio: hasta la cuarta, «se puede
   * jugar sola» era literalmente cierto en todas, y la interfaz lo daba por
   * hecho para cualquier aventura con `requiere`. La quinta vuelve al mismo
   * pueblo un año después de un desenlace concreto, así que esa frase pasaría
   * a ser mentira — y una promesa falsa en la pantalla de entrada es peor que
   * no decir nada.
   */
  continuacion?: true;
  /**
   * Se recomienda —y por defecto se BLOQUEA en la interfaz, con un escape a
   * mano— hasta que el navegador tenga archivado al menos un final de
   * cualquier otra aventura del catálogo.
   *
   * Sólo lo usa El Círculo Rojo. No es lo mismo que `requiere`: `requiere`
   * apunta a aventuras puntuales y es sólo texto informativo; esto es un
   * bloqueo real (`App.tsx`, pantalla de inicio) y no señala una aventura
   * concreta sino «cualquiera de las diez». Motivo, jugándola en 2026-09-09:
   * escrita para leerse DESPUÉS —el jugadorNota que conecta el obelisco con
   * Bernardo y con 1928 cae plano si todavía no se conoce a ninguno de los
   * dos— pero por fecha diegética aparecía primera en la lista, así que
   * quien entraba a jugar por primera vez la tenía como opción más visible.
   */
  desbloqueaCon?: 'algun-final-archivado';
}

const ENTRADAS: EntradaCatalogo[] = [
  {
    scenario: EL_CIRCULO_ROJO,
    // La ÚNICA fechada de verdad fuera del siglo XX, y la única a la que no
    // hace falta la fecha-trampa de «El Hombre que Miraba el Agua»: aquélla
    // es una visión recibida en 1928 y se ordena por cuándo se recibe; ésta
    // se juega con gente de 1674, así que su fecha diegética es 1674 y punto.
    // Queda primera en la pantalla de inicio, que es donde va: es un prólogo,
    // y se puede jugar antes o después del resto sin romper nada.
    cuando: '1674-09-21',
    epoca: 'Septiembre de 1674 · el paraje, seis años antes del pueblo',
    duracion: 'Una hora aproximadamente',
    // Sin `requiere` y sin `continuacion`: no depende de nada y no encadena
    // investigador con nadie —su elenco es de doscientos cincuenta años antes
    // que Elena—. Los cabos con las otras diez los ata el jugador leyendo
    // (`jugadorNota`), no el motor. Sí lleva `desbloqueaCon`: aparece primera
    // por fecha, pero se juega mejor sabiendo ya quién es Bernardo.
    desbloqueaCon: 'algun-final-archivado',
  },
  {
    scenario: AGUA_QUIETA,
    cuando: '1924-10-26',
    epoca: 'Octubre de 1924 · partido de Castronegro',
    duracion: 'Una hora aproximadamente',
  },
  {
    scenario: LA_LEGUA,
    cuando: '1925-03-11',
    epoca: 'Marzo de 1925 · lejos de Castronegro',
    duracion: 'Una hora y media aproximadamente',
    // No es un requisito duro: se puede jugar sola. Pero Elena llega distinta
    // si ya vio el aljibe, y algunas cosas se leen de otra manera.
    requiere: ['agua-quieta'],
  },
  {
    scenario: TERCER_UMBRAL,
    cuando: '1925-08-14',
    epoca: 'Agosto de 1925 · estancia Los Cardales',
    duracion: 'Una hora aproximadamente',
    // Tampoco es requisito duro: es historia paralela a La Legua, mismo
    // lustro, sin personajes en común salvo el investigador encadenado.
    requiere: ['legua-perdida'],
  },
  {
    scenario: INVIERNO_DEBIDO,
    cuando: '1926-07-09',
    epoca: 'Julio de 1926 · Villa Requena',
    duracion: 'Una hora y media aproximadamente',
    // La única de las cuatro que de verdad LEE lo que pasó en las anteriores:
    // las tres marcas del Círculo Rojo dejan consecuencia permanente y la
    // carta de apertura cambia según cuántas encontró el investigador. Se
    // puede jugar sola —la carta llega igual— pero es la primera vez que
    // «recomendamos jugar la anterior» tiene una consecuencia mecánica y no
    // sólo narrativa.
    requiere: ['tercer-umbral'],
  },
  {
    scenario: SUENO_DEBIDO,
    cuando: '1927-07-11',
    epoca: 'Julio de 1927 · Villa Requena',
    duracion: 'Una hora y media aproximadamente',
    // La primera que NO se puede jugar suelta del todo. Se juega igual —la
    // carta llega en las cinco ramas, incluida la de no haber jugado la
    // anterior— pero es la primera vez que la aventura previa no es una
    // lectura opcional sino el punto de partida: vuelve al mismo pueblo, con
    // la misma gente, un año después de lo que el investigador haya decidido.
    requiere: ['invierno-debido'],
    continuacion: true,
  },
  {
    scenario: ORDEN_DEBIDO,
    cuando: '1928-03-12',
    epoca: 'Marzo de 1928 · cruzando el partido',
    duracion: 'Una hora y media aproximadamente',
    // La primera que VUELVE en vez de ir, y la que paga cinco hilos que las
    // dos anteriores dejaron colgando: los puntos del mapa de Delfina Arce.
    // Se puede jugar suelta —la carta llega igual y Delfina explica el mapa
    // desde cero— pero es la que más rinde encadenada: es la única aventura
    // cuyo tema ES la cadena de consecuencias, y los ecos de las cinco
    // anteriores aparecen en casi todas sus escenas.
    requiere: ['sueno-debido'],
    continuacion: true,
  },
  {
    scenario: AGUA_BLANCA,
    cuando: '1928-10-01',
    epoca: 'Octubre de 1928 · el pueblo de Castronegro',
    duracion: 'Una hora y media aproximadamente',
    // Séptimo Umbral, primer acto: el centro del que la campaña salió en la
    // primera aventura sin llegar a tocarlo. La sexta terminó a la vista del
    // obelisco, sin entrar; ésta entra al pueblo y termina sabiendo que hay
    // que subir a la casa de la loma.
    //
    // `continuacion` y no «se puede jugar sola» a propósito: es la única
    // aventura de la campaña escrita sabiendo que hay seis atrás. Sus cuatro
    // desenlaces leen lo que el investigador viene arrastrando desde 1924, y
    // el que se ofrece primero —subir— sólo se entiende habiendo visto lo que
    // hay abajo.
    requiere: ['orden-debido'],
    continuacion: true,
  },
  {
    scenario: EL_VIGESIMO,
    cuando: '1928-10-01',
    epoca: 'La misma noche · la Casa de Díaz',
    duracion: 'Una hora y media aproximadamente',
    // Séptimo Umbral, segundo acto. La única transición de la campaña que se
    // mide en horas y no en meses —`mesesEntre` devuelve 0 acá a propósito,
    // ver el comentario de esa función— porque es la misma noche que terminó
    // Agua Blanca. Los cuatro finales de la 7a llevan acá, cada uno con su
    // propio puente de apertura.
    requiere: ['agua-blanca'],
    continuacion: true,
  },
  {
    scenario: LO_QUE_BERNARDO_SABIA,
    cuando: '1928-10-22',
    epoca: 'Octubre de 1928 · tres semanas después · la Casa de Díaz',
    duracion: 'Veinte a treinta minutos',
    // Epílogo corto: cierra el hueco de Magia del ROADMAP (§4) leyendo el
    // desenlace de El Vigésimo, no encadena nada de contenido nuevo más allá
    // de eso. `continuacion: true` porque literalmente retoma dónde quedó,
    // no es una historia que se lea suelta.
    requiere: ['el-vigesimo'],
    continuacion: true,
  },
  {
    scenario: EL_HOMBRE_QUE_MIRABA_EL_AGUA,
    // FECHADA EN 1928, NO EN 1679, a propósito. Lo que se juega transcurre en
    // 1679, pero el HECHO —recibir la visión— pasa en 1928, y el catálogo
    // ordena por esta fecha: una entrada de 1679 aparecería antes que Agua
    // Quieta en la pantalla de inicio, que es un spoiler estructural y además
    // rompería `mesesEntre` (da 0 con fechas hacia atrás).
    cuando: '1928-11-12',
    // Sin el año de la visión, a propósito: averiguar CUÁNDO está parado es
    // una de las cosas que la aventura le pide al jugador (acción «ubicarse»,
    // tirada de Historia). Decirlo en la pantalla de inicio contestaba la
    // pregunta antes de hacerla.
    epoca: 'Noviembre de 1928 · una visión',
    duracion: 'Treinta a cuarenta minutos',
    requiere: ['el-vigesimo'],
    continuacion: true,
  },
];

/** El catálogo, en orden cronológico del universo. */
export const CATALOGO: EntradaCatalogo[] =
  [...ENTRADAS].sort((a, b) => a.cuando.localeCompare(b.cuando));

/** Índice por id, que es como lo pide todo lo demás. */
export const ESCENARIOS: Record<string, Scenario> = Object.fromEntries(
  CATALOGO.map((e) => [e.scenario.id, e.scenario]),
);

export const entradaDe = (id: string): EntradaCatalogo | undefined =>
  CATALOGO.find((e) => e.scenario.id === id);

/**
 * Las aventuras que siguen a ésta en la línea del universo — casi siempre
 * una sola, pero El Vigésimo se bifurca en dos epílogos independientes
 * («Lo que Bernardo sabía» y «El Hombre que Miraba el Agua», los dos con
 * `requiere: ['el-vigesimo']` y ninguno requiriéndose entre sí).
 *
 * Por RELACIÓN (`requiere`), no por posición en el array. Antes se tomaba
 * la posición siguiente en el orden por fecha, y eso coincidía con la
 * relación real mientras la campaña fue una sola cadena lineal — hasta que
 * «El Círculo Rojo» se sumó fechada en 1674 y quedó primera del array:
 * terminarla ofrecía «Continuar a Agua Quieta» y heredaba a Juana Ossorio
 * (1674) al elenco de Elena en 1924. Encontrado armando la ruta visual de
 * campaña, 2026-09-09.
 */
export function siguientesDe(id: string): EntradaCatalogo[] {
  return CATALOGO.filter((e) => e.requiere?.includes(id));
}

/**
 * La única continuación, para cuando no hay bifurcación — es lo que usa el
 * encadenado real de campaña (`Turn`/`continuarCampana`). Donde SÍ hay
 * bifurcación, se ofrecen las dos (`Continuar` en `App.tsx`).
 */
export function siguienteDe(id: string): EntradaCatalogo | null {
  return siguientesDe(id)[0] ?? null;
}

/**
 * Un nodo del árbol de campaña: una aventura y por qué caminos sigue desde
 * ahí. `hijos` casi siempre tiene longitud 1; más de uno es una bifurcación
 * de verdad (hoy, sólo El Vigésimo).
 */
export interface RutaNodo {
  entrada: EntradaCatalogo;
  hijos: RutaNodo[];
}

/**
 * Una aventura APARTE de la campaña principal: no depende de nada y nada
 * depende de ella. Hoy sólo El Círculo Rojo — un prólogo suelto, no un
 * eslabón de la cadena de 1920. Si el día de mañana se agrega otro one-shot
 * del mismo tipo, cae acá solo, sin tocar esta función.
 */
function esAparte(e: EntradaCatalogo): boolean {
  return !e.requiere?.length && !CATALOGO.some((o) => o.requiere?.includes(e.scenario.id));
}

function construirNodo(id: string, visitados: Set<string>): RutaNodo | null {
  // Corte de ciclos por las dudas — el catálogo de hoy no tiene ninguno,
  // pero `requiere` es texto libre y un ciclo ahí colgaría esto para siempre.
  if (visitados.has(id)) return null;
  visitados.add(id);
  const entrada = entradaDe(id);
  if (!entrada) return null;
  const hijos = siguientesDe(id)
    .map((h) => construirNodo(h.scenario.id, visitados))
    .filter((n): n is RutaNodo => n !== null);
  return { entrada, hijos };
}

/**
 * La(s) raíz(ces) de la campaña principal, para dibujar la ruta visual de
 * la pantalla de inicio: todo lo que no es «aparte» y no depende de nada.
 * Hoy es una sola —Agua Quieta— pero la función no asume esa cardinalidad.
 */
export function raicesDeCampana(): RutaNodo[] {
  const visitados = new Set<string>();
  return CATALOGO
    .filter((e) => !e.requiere?.length && !esAparte(e))
    .map((e) => construirNodo(e.scenario.id, visitados))
    .filter((n): n is RutaNodo => n !== null);
}

/** Las aventuras aparte de la campaña principal (ver `esAparte`). */
export function aventurasAparte(): EntradaCatalogo[] {
  return CATALOGO.filter(esAparte);
}

/**
 * Meses diegéticos entre una aventura y la siguiente.
 *
 * El piso de 1 mes vale para toda transición real —la más corta de las
 * siete anteriores son varios meses— pero El Vigésimo (§3.2-terdecies) es la
 * primera vez que dos aventuras se pegan por horas, no por meses: forzar el
 * piso ahí decaería la Exposición de Agua Blanca por un mes que no pasó.
 * Por debajo de un día de diferencia se devuelve 0 —lo que `heredarInvestigador`
 * ya trata como «sin decaimiento», ver `exposicionTrasMeses`— y arriba de eso
 * se mantiene el piso de siempre.
 */
export function mesesEntre(desde: string, hasta: string): number {
  const a = entradaDe(desde), b = entradaDe(hasta);
  if (!a || !b) return 1;
  const ms = new Date(b.cuando).getTime() - new Date(a.cuando).getTime();
  const dias = ms / (1000 * 60 * 60 * 24);
  if (dias < 1) return 0;
  return Math.max(1, Math.round(dias / 30));
}

/** El primero en la línea de tiempo: el que se ofrece por defecto. */
export const ESCENARIO_INICIAL = CATALOGO[0]!.scenario;
