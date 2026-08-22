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

/** Meses diegéticos entre una aventura y la siguiente. */
export function mesesEntre(desde: string, hasta: string): number {
  const a = entradaDe(desde), b = entradaDe(hasta);
  if (!a || !b) return 1;
  const ms = new Date(b.cuando).getTime() - new Date(a.cuando).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 30)));
}

/** El primero en la línea de tiempo: el que se ofrece por defecto. */
export const ESCENARIO_INICIAL = CATALOGO[0]!.scenario;
