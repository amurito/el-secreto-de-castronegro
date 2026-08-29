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

import type { GameState, Clue, Consequence, SkillId, LocationId, SuccessDegree } from '../shared/types.ts';
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
  /**
   * Pérdida de Cordura de verdad (CoC 7e), distinta de Exposición/Estabilidad
   * —que son la mecánica propia del Umbral—. Ver `rules/umbral.config.ts` §
   * cabecera: SAN y Exposición NO se convierten una en otra; esto es la
   * tercera variable, la del reglamento base, y hasta ahora ninguna escena la
   * tocaba. `amount` es lo que decide ESTA escena; el motor le suma solo lo
   * que corresponda por Exposición alta (★ en `engine.ts`), y si el golpe es
   * de 5 o más aplica una crisis de locura temporal sin que la escena tenga
   * que pedirlo.
   */
  cordura?: {
    amount: number;
    cause: string;
    /**
     * Si ESTE golpe cruza el piso de 5+ que dispara una crisis de locura
     * temporal (el motor decide si lo cruza, no la escena: la Exposición alta
     * suma de más y la escena no puede saber cuánto de antemano), qué fobia o
     * manía se lleva en vez de la genérica «Crisis de locura temporal».
     *
     * Sin esto, la crisis sigue existiendo —el motor la aplica igual— sólo
     * que sin sabor propio. Con esto, lo que queda mal después de un aljibe
     * que mira de vuelta no es lo mismo que lo que queda mal después de
     * caminar un campo que no cierra, y la ficha lo dice.
     */
    crisis?: {
      nombre: string;
      descripcion: string;
      tipo?: 'phobia' | 'mania';
      /** Ver el signo en `MechanicalEffect`: positivo penaliza, negativo bonifica. */
      afecta: Array<{ skill: string; dados: number }>;
    };
  };
  /**
   * Puntos de Mitos de Cthulhu. Baja el techo de Cordura PARA SIEMPRE
   * (99 − Mitos) y recorta la Cordura actual si queda por encima — ver
   * `apply_mythos_knowledge` en `engine.ts`.
   *
   * Una escena sólo puede pedirlo cuando el jugador eligió deliberadamente
   * leer, mirar o escuchar algo que le fue advertido. Nunca por sorpresa y
   * nunca como castigo por investigar bien: es la única pérdida del juego
   * que no se recupera de ninguna manera.
   */
  mitos?: { amount: number; source: string };
  /**
   * Dispara un asalto de combate de verdad contra un NPC con estadísticas
   * de pelea, usando las mismas herramientas del motor que el simulador
   * (`resolve_attack`/`resolve_flee`/`resolve_maneuver`) — no una tirada de
   * mentira ni un coin-flip narrado a mano.
   *
   * Hasta ahora estas tres herramientas SÓLO las llamaba el simulador de
   * combate; ninguna aventura las conectaba. Un NPC podía tener PV y Pelea
   * declarados y ser, en la práctica, imposible de pelear de verdad dentro
   * de la historia. Este campo es el cable que faltaba.
   */
  combate?: {
    accion: 'atacar' | 'huir' | 'maniobra';
    /** Requerido para 'atacar' y 'maniobra'. 'huir' pelea contra todos los presentes. */
    npcId?: string;
    /** Arma del investigador. Por defecto, a mano limpia. */
    armaId?: string;
    /** Sólo para 'maniobra'. */
    tipo?: 'desarmar' | 'derribar' | 'sujetar';
    /** Sólo para 'atacar' con arma de fuego. */
    apuntando?: boolean;
    puntoBlanco?: boolean;
    cubierto?: boolean;
    blancoMovil?: boolean;
  };
  /**
   * Marca el arranque de un combate de verdad: a partir de acá la interfaz
   * cambia a la pantalla dedicada, y los asaltos siguientes se resuelven
   * ahí, no repitiendo esta escena. Idempotente: tocar el mismo botón de
   * nuevo mientras el combate sigue activo no reinicia nada.
   */
  iniciaCombate?: {
    npcIds: string[];
    reason?: string;
    /**
     * Si está, este combate admite terminar en paz: la escena decide si HAY
     * una salida de palabra, con qué pista queda si funciona, y qué
     * consecuencia distinta (más grave) deja usar un arma de fuego contra
     * este NPC en vez de pelear a mano limpia. Sin esto, el combate se pelea
     * como hasta ahora — es opcional a propósito.
     */
    salidaPacifica?: {
      npcId: string;
      pistaCalma: { description: string; kind: Clue['kind']; source: string; reliability: Clue['reliability'] };
      consecuenciaDisparo: { description: string; scope: Consequence['scope']; permanent: boolean; worldReminder: string };
    };
  };
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
  /**
   * Mueve un objeto a un nuevo dueño —investigador, NPC o lugar—, sin que
   * sea el investigador quien lo agarra con sus propias manos. Es el
   * `transfer_item` que la nota de `anillo` deja pendiente: para cuando un
   * objeto cambia de manos como consecuencia de lo que pasó en la escena
   * (se lo sacan a alguien, se lo entregan, queda tirado) y no porque el
   * jugador lo tomó de un estante.
   */
  traslada?: { itemId: string; a: string; carried?: boolean; cause: string };
  /**
   * El investigador se pone un anillo, y queda vinculado a él.
   *
   * Pide que ya lo lleve encima —el motor lo rechaza si no— porque ponerse
   * algo es un gesto, no un traslado: si hay que conseguirlo primero, eso es
   * un `transfer_item` y va antes, en su propia escena.
   *
   * Lo que cuesta ponérselo no va acá: se declara con `cordura`,
   * `estabilidad` o `exposicion` en el mismo efecto, como cualquier otra
   * cosa que duele.
   */
  anillo?: { itemId: string; cause: string; removalLethal?: boolean };
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
  /**
   * Cierra la aventura.
   *
   * `text` acepta el párrafo entero con `\n\n` o la lista de párrafos; el
   * motor une la lista con renglón en blanco. Las dos formas conviven en el
   * contenido publicado y ahora las dos salen igual — antes la lista se unía
   * con comas, ver `toolReachEnding`.
   */
  desenlace?: { id: string; title: string; text: string | string[] };
  /**
   * Algo que nota QUIEN JUEGA, no el investigador. No aparece en su ficha ni
   * en su tablero de conocimiento; la interfaz lo muestra aparte. Sirve para
   * la distancia entre lo que el lector arma leyendo y lo que el personaje
   * todavía no puede aceptar — ver `toolNotePlayerKnowledge` en `engine.ts`.
   */
  jugadorNota?: { statement: string; source: string; reliability?: 'reliable' | 'unreliable' | 'false' | 'unknown' };
}

export interface ContextoEscena {
  estado: GameState;
  intencion: IntencionLeida;
  /**
   * Resultado de `prueba`. `null` si la escena no pidió tirada.
   *
   * `grado` es el resultado CoC 7e tal cual lo dio el motor —crítico, extremo,
   * difícil, regular, fracaso o pifia— para que una escena pueda distinguir un
   * éxito cualquiera de uno excepcional, o un fracaso cualquiera de una pifia.
   * `exito` sigue existiendo para el caso común, que es la mayoría: sólo
   * importa si superó la dificultad o no.
   *
   * Reglamento (7e, sin tabla propietaria): 01 siempre es crítico y siempre
   * supera cualquier dificultad; 96-100 —o sólo 100 con habilidad ≥50— siempre
   * es pifia y siempre la pierde. Eso ya lo aplica `rules/dice.ts` antes de
   * que la escena vea nada. Lo que el manual deja a criterio del Keeper es QUÉ
   * pasa además de ganar o perder, y una escena que declara contenido para
   * `grado === 'critical'` o `'fumble'` es exactamente eso: la decisión del
   * Keeper, escrita de antemano porque acá no hay un Keeper en vivo.
   */
  tirada: { exito: boolean; grado: SuccessDegree; mensaje: string } | null;
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
  /**
   * Por defecto una escena NO se dispara al agarrar o soltar un objeto,
   * aunque su `cuando` coincida.
   *
   * Agarrar algo y usarlo son actos distintos, y las escenas suelen
   * reconocerse por palabras: «leo la libreta» y «agarro la libreta» comparten
   * la palabra que importa. Sin esta regla, levantar un objeto del suelo
   * disparaba la escena de leerlo —con su tirada y todo— y el jugador se
   * enteraba de lo que decía sin haberlo abierto.
   *
   * Una aventura que quiera una escena AL agarrar algo —un objeto que no se
   * puede soltar, por ejemplo— la pide explícitamente.
   */
  tambienAlAgarrar?: true;
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
