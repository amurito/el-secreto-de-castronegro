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
 * `requiere` deja declarar que una aventura da por vistas las cosas de otra.
 * Todavía no lo usa nadie —con una sola aventura no hay qué encadenar— pero
 * está acá para que la segunda no obligue a inventar el mecanismo con apuro.
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
}

const ENTRADAS: EntradaCatalogo[] = [
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
 * La aventura que sigue a ésta en la línea del universo.
 *
 * Es lo que hace que una campaña sea una campaña y no una lista de partidas:
 * al cerrar una aventura y pasar la fase de desarrollo, el juego sabe adónde
 * sigue el investigador.
 */
export function siguienteDe(id: string): EntradaCatalogo | null {
  const i = CATALOGO.findIndex((e) => e.scenario.id === id);
  if (i < 0) return null;
  return CATALOGO[i + 1] ?? null;
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
