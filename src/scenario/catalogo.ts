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
    epoca: 'Octubre de 1924',
    duracion: 'Una hora aproximadamente',
  },
  {
    scenario: LA_LEGUA,
    cuando: '1925-03-11',
    epoca: 'Marzo de 1925',
    duracion: 'Una hora y media aproximadamente',
    // No es un requisito duro: se puede jugar sola. Pero Elena llega distinta
    // si ya vio el aljibe, y algunas cosas se leen de otra manera.
    requiere: ['agua-quieta'],
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

/** El primero en la línea de tiempo: el que se ofrece por defecto. */
export const ESCENARIO_INICIAL = CATALOGO[0]!.scenario;
