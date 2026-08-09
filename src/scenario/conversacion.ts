/**
 * CONVERSACIÓN COMO DATO.
 *
 * Antes, hablar con Rosa era un `switch` de doscientas líneas dentro del
 * resolvedor del motor. Funcionaba para una aventura y sólo para una: la
 * segunda habría necesitado un segundo `switch` al lado del primero, y el
 * motor habría quedado casado con Agua Quieta.
 *
 * Acá una conversación es una lista de temas declarados. El motor no sabe
 * quién es Rosa ni qué esconde: sabe resolver un tema contra un estado. Una
 * aventura nueva trae sus temas y funciona sin tocar el motor.
 *
 * Lo que un tema declara:
 *   · cuándo se puede preguntar y cuándo se agotó
 *   · qué resistencia opone —qué habilidad, qué dificultad, qué actitud pide—
 *   · qué contesta si cede, y qué contesta si esquiva
 *   · qué deja: pistas, preguntas abiertas, actitud, secretos
 *
 * Todo declarativo a propósito. Un tema no ejecuta código del escenario: si
 * hiciera falta eso, el escenario podría hacer cualquier cosa al estado y las
 * garantías del motor dejarían de valer.
 */

import type { GameState, NpcId, SkillId, Clue } from '../shared/types.ts';

export type Dificultad = 'regular' | 'hard' | 'extreme';

/** Lo que deja un tema cuando se contesta. Todo opcional. */
export interface EfectoTema {
  /** Variantes de prosa. Se elige la que no se dijo todavía. */
  texto: string[];
  /** Cambio de actitud del NPC hacia quien pregunta. */
  actitud?: number;
  pista?: {
    description: string;
    kind: Clue['kind'];
    reliability: Clue['reliability'];
  };
  /** Pregunta abierta que queda en el tablero. */
  pregunta?: string;
  /**
   * Revela un secreto declarado del NPC. El motor lo busca por id en
   * `npc.secrets`: el texto del secreto vive con el NPC, no acá.
   */
  revelaSecreto?: string;
  /** Exposición al Umbral, si oír esto es en sí mismo un contacto. */
  exposicion?: number;
}

export interface TemaConversacion {
  id: string;
  npc: NpcId;
  /** Lo que ve el jugador en el botón. */
  etiqueta: string;
  /** Cómo se pregunta. Lo consume el resolvedor y lo lee el clasificador. */
  intencion: string;
  /** Palabras que lo detectan cuando el jugador escribe libremente. */
  claves: string[];
  /** Orden de aparición entre los temas del mismo NPC. */
  orden?: number;

  /** Cuándo existe el tema. Sin esto, desde el principio. */
  disponible?: (s: GameState) => boolean;
  /** Cuándo deja de ofrecerse. Sin esto, se puede repetir. */
  agotado?: (s: GameState) => boolean;

  /**
   * La resistencia del tema.
   *
   * Sin `prueba`, el tema se contesta sin dados: no todo lo que se pregunta se
   * resiste, y pedir una tirada para algo que no puede fallar es ruido.
   *
   * Con `prueba`, hace falta superarla. La actitud del NPC modifica la tirada,
   * y `actitudMinima` es un piso por debajo del cual ni siquiera se intenta:
   * hay preguntas que a un desconocido no se le contestan por más labia que
   * tenga.
   */
  prueba?: {
    skill: SkillId;
    difficulty: Dificultad;
    actitudMinima?: number;
    /** Qué se juega. Va en la ficha de la tirada. */
    razon: string;
  };

  /** Lo que pasa si cede —o si no había prueba. */
  cede: EfectoTema;
  /** Lo que pasa si esquiva. Sin esto, una esquiva genérica. */
  esquiva?: EfectoTema;
  /**
   * Qué contesta cuando la actitud no llega al piso. Es distinto de esquivar:
   * acá ni siquiera hubo tirada.
   */
  cerrado?: EfectoTema;
}

/** Todos los temas de una aventura, en un solo lugar. */
export type Conversaciones = TemaConversacion[];

export const temasDe = (todos: Conversaciones, npc: NpcId): Conversaciones =>
  todos.filter((t) => t.npc === npc).sort((a, b) => (a.orden ?? 50) - (b.orden ?? 50));
