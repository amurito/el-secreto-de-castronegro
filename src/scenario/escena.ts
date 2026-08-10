/**
 * ESCENAS DE AVENTURA — el contenido autoral, fuera del motor.
 *
 * Las escenas escritas a mano de Agua Quieta —mirar el agua, comparar las
 * fotografías, bajar al aljibe, los cinco desenlaces— vivían dentro del
 * resolvedor. Funcionaba para una aventura y sólo para una: la segunda habría
 * puesto sus propias funciones al lado, y el motor habría quedado con dos
 * aventuras adentro.
 *
 * Acá una escena declara CUÁNDO responde, QUÉ tirada pide y QUÉ deja. El motor
 * no sabe qué es un aljibe: sabe recorrer escenas, pedir la tirada y aplicar
 * efectos con las mismas herramientas validadas de siempre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ LOS EFECTOS SON DATOS Y LA RAMIFICACIÓN ES CÓDIGO
 *
 * Una escena de horror ramifica: por la tirada, por lo que ya se descubrió,
 * por la hora. Expresar eso en datos puros pedía inventar un mini-lenguaje de
 * condiciones, que es más trabajo y peor de leer que TypeScript.
 *
 * Así que `resolver` es una función —el escenario ya es TypeScript— pero lo que
 * DEVUELVE es declarativo. Una escena no puede tocar el estado: describe qué
 * debería pasar, y el motor lo ejecuta por herramientas que valida. La garantía
 * del proyecto se mantiene: el contenido propone, el motor dispone.
 */

import type { GameState, Clue, SkillId, LocationId } from '../shared/types.ts';
import type { Dificultad } from './conversacion.ts';

/**
 * Lo que el motor entendió, en forma mínima.
 *
 * A propósito NO es el `Intent` del clasificador: si una aventura dependiera
 * de los internos del keeper, cambiar el clasificador rompería el contenido.
 */
export interface IntencionLeida {
  raw: string;
  /** Minúsculas, sin acentos. */
  norm: string;
  verb: string;
  /** `false` si el verbo se dedujo del objetivo en vez de leerse. */
  verbExplicit: boolean;
  /** El jugador pidió hacerlo de forma sostenida o insistente. */
  sustained: boolean;
  objetivo: { kind: string; id: string | null };
  destino: LocationId | null;
}

export interface PruebaEscena {
  skill: SkillId | string;
  difficulty: Dificultad;
  reason: string;
  stakes_success: string;
  stakes_failure: string;
  bonus_dice?: number;
  penalty_dice?: number;
  modifier_reason?: string;
}

/** Todo opcional: una escena puede ser sólo prosa. */
export interface EfectoEscena {
  /** Párrafos. Se muestran en orden. */
  texto?: string[];
  pistas?: Array<{
    description: string;
    kind: Clue['kind'];
    source: string;
    reliability: Clue['reliability'];
  }>;
  exposicion?: { amount: number; source: string; cause: string };
  estabilidad?: { amount: number; cause: string };
  dano?: { amount: number; cause: string };
  tiempo?: { minutes: number; reason: string };
  pregunta?: string;
  descubre?: {
    itemId: string;
    propertyId: string;
    how: string;
    comparedWith?: string;
  };
  /** Registra que se usó un objeto. Destraba las propiedades por uso. */
  usa?: { itemId: string; times?: number; cause: string };
  /** Entrega un documento diegético que ya existe en el escenario. */
  documento?: { id: string; how: string };
  contradiccion?: { description: string; between: string };
  consecuencia?: {
    description: string;
    scope: 'scene' | 'location' | 'campaign' | 'world';
    permanent: boolean;
    worldReminder: string;
  };
  npc?: {
    id: string;
    attitudeDelta?: number;
    patienceDelta?: number;
    cause: string;
  };
  /** Cierra la aventura. */
  desenlace?: { id: string; title: string; text: string };
}

export interface ContextoEscena {
  estado: GameState;
  intencion: IntencionLeida;
  /**
   * Resultado de `prueba`. `null` si la escena no pidió tirada.
   * `mensaje` es lo que devolvió el motor, por si la escena quiere citarlo.
   */
  tirada: { exito: boolean; mensaje: string } | null;
  /** Elige una variante que no se haya usado todavía en esta partida. */
  variante: (opciones: string[]) => string;
}

export interface EscenaAutoral {
  id: string;
  /**
   * Mayor gana. Las escenas se comprueban en orden descendente, así que una
   * escena específica puede adelantarse a otra más general sin depender del
   * orden en que estén escritas en el archivo.
   */
  prioridad?: number;
  /** ¿Esta escena responde a esta intención, en este estado? */
  cuando: (s: GameState, i: IntencionLeida) => boolean;
  /** Prosa antes de la tirada: lo que se ve mientras se decide. */
  antes?: (s: GameState, i: IntencionLeida) => EfectoEscena | null;
  /** La tirada. Devolver `null` es no pedir ninguna. */
  prueba?: (s: GameState, i: IntencionLeida) => PruebaEscena | null;
  /** Qué deja la escena. Una lista se aplica en orden. */
  resolver: (ctx: ContextoEscena) => EfectoEscena | EfectoEscena[];
}

export type Escenas = EscenaAutoral[];

export const porPrioridad = (a: EscenaAutoral, b: EscenaAutoral) =>
  (b.prioridad ?? 50) - (a.prioridad ?? 50);
