import type {
  Investigator, Item, Npc, DiegeticDocument, GameLocation,
  WorldTime, TemporalEvent, LocationId,
} from '../shared/types.ts';

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
  npcs: Npc[];
  documents: DiegeticDocument[];
  locations: Record<LocationId, GameLocation>;
  startLocation: LocationId;
  startTime: WorldTime;
  startUmbralPermeability: number;
  timeline: TemporalEvent[];
  endings: ScenarioEnding[];
  /** Texto de apertura. Se muestra tal cual, sin pasar por el modelo. */
  opening: string;
}
