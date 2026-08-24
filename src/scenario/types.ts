import type {
  Investigator, Item, NpcSeed, DiegeticDocument, GameLocation,
  WorldTime, TemporalEvent, LocationId, GameState,
} from '../shared/types.ts';
import type { Conversaciones } from './conversacion.ts';
import type { Escenas } from './escena.ts';
import type { AccionDef } from './acciones.ts';

export interface ScenarioEnding {
  id: string;
  title: string;
  condition: string;
}

/**
 * Instrucciones que existen SÓLO para el Keeper IA.
 *
 * Viven en un módulo aparte a propósito. En el build estático el motor corre en
 * el navegador y no hay Keeper IA, así que este texto no se usa — y al no
 * importarse, el empaquetador lo descarta. Eso saca del bundle público la prosa
 * más cargada de spoilers: la verdad de la aventura, lo que está prohibido
 * revelar, y las notas de dirección de cada localización.
 *
 * No es ofuscación. Es no enviar lo que no se usa, y da la ventaja de paso.
 */
export interface KeeperBriefing {
  /** La verdad de la aventura. SECRETO DEL KEEPER. */
  deepTruth: string;
  /** Qué NO puede revelarse todavía, pase lo que pase. */
  sealedFromKeeper: string[];
  /** Cómo dirigir esta aventura. */
  guidance: string;
  /** Notas de dirección por localización. */
  locationNotes: Record<LocationId, string>;
}

export interface Scenario {
  id: string;
  title: string;
  /** Qué creen los investigadores que deben resolver (v0.8 §2). */
  surfacePremise: string;
  investigators: Investigator[];
  items: Item[];
  npcs: NpcSeed[];
  documents: DiegeticDocument[];
  locations: Record<LocationId, GameLocation>;
  startLocation: LocationId;
  startTime: WorldTime;
  startUmbralPermeability: number;
  timeline: TemporalEvent[];
  /**
   * Lo que se le puede preguntar a cada NPC. Es dato, no código: el motor
   * resuelve temas sin saber de qué aventura son, así que una aventura nueva
   * trae los suyos y funciona sin tocar el resolvedor.
   */
  conversations: Conversaciones;
  /**
   * Las escenas escritas a mano: la prosa y las ramas propias de esta
   * aventura. El motor las recorre sin saber de qué tratan.
   */
  scenes: Escenas;
  /**
   * Los botones que ofrece la aventura. También es dato: si viviera en el
   * motor, cada aventura nueva heredaría los botones de la primera.
   */
  actions: AccionDef[];
  endings: ScenarioEnding[];
  /** Texto de apertura. Se muestra tal cual, sin pasar por el modelo. */
  opening: string;
  /**
   * Cuando esta condición es cierta, `accionesDisponibles` deja de ofrecer
   * mirar, hablar, hacer e ir: sólo quedan los desenlaces.
   *
   * Nace de un bug de diseño, no de motor: El Sueño Debido dejaba al
   * investigador «en el fondo del brocal, del otro lado del agua, con
   * Aurelio sentado enfrente» y en el mismo turno seguía ofreciendo mirar
   * el catre o irse a la escuela, como si estar soñando no cambiara nada de
   * lo que se puede hacer. Sin este campo, cualquier clímax que quiera
   * forzar la decisión ahí mismo tenía que simularlo a mano —vaciando el
   * catálogo de acciones no-`decidir` con `visible` uno por uno, y sin poder
   * tocar los botones que el motor genera solo (mirar detalles, llevarse
   * objetos, salidas del mapa)—. Opcional: sin declararlo, una aventura se
   * comporta exactamente como antes.
   */
  bloqueoDecision?: (s: GameState) => boolean;
}
