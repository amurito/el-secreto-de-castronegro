/**
 * MODELO DE ESTADO — El Secreto de Castronegro
 *
 * Deriva de: Canon v0.7, Keeper v0.8, Motor v0.9, Prompt Maestro v1.0
 * y del Análisis Técnico v1.1 §5.
 *
 * REGLA ESTRUCTURAL: nada de esto se muta. El estado es el resultado de plegar
 * el log de eventos (append-only). Ver src/engine/reducers.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// IDs
// ─────────────────────────────────────────────────────────────────────────────

export type CampaignId = string;
export type PlayerId = string;
export type InvestigatorId = string;
export type EventId = string;
export type RollId = string;
export type ItemId = string;
export type PropertyId = string;
export type NpcId = string;
export type ClueId = string;
export type FactId = string;
export type HypothesisId = string;
export type DocumentId = string;
export type LocationId = string;
export type ConsequenceId = string;
export type TemporalEventId = string;
export type SkillId = string;

// ─────────────────────────────────────────────────────────────────────────────
// VERDAD Y REVELACIÓN — dos ejes independientes
// Resuelve las contradicciones A y B del Análisis Técnico v1.1 §2.
// ─────────────────────────────────────────────────────────────────────────────

/** Qué tan verdadero es. Reemplaza las tres taxonomías incompatibles. */
export type TruthLevel =
  /** v0.7 marcado CANON. Inmutable sin retcon aprobado. */
  | 'CANON_UNIVERSE'
  /** Hechos de la aventura publicada original. */
  | 'CANON_ORIGINAL'
  /** v0.7 / v0.8 "CANON DEL ESCENARIO". */
  | 'CANON_SETTING'
  /** Generado durante la partida. Vincula a esta campaña, NO al universo. */
  | 'CAMPAIGN_CANON'
  /** v0.8 PROPUESTA. Disponible para una aventura, no confirmado. */
  | 'PROPOSAL'
  /** v0.8 HIPÓTESIS. Debe producir pistas contradictorias. */
  | 'HYPOTHESIS';

/** Quién puede saberlo. Eje independiente del anterior. */
export type Disclosure =
  /** Conocido por los investigadores. */
  | 'PUBLIC'
  /** El motor lo tiene; se revela por mecánica. */
  | 'DISCOVERABLE'
  /** El Keeper IA lo recibe para arbitrar; no lo revela sin gate. */
  | 'KEEPER_SECRET'
  /** NUNCA entra al contexto del modelo hasta que un gate del motor lo abra.
   *  Es la garantía dura: lo que no está en la ventana no puede filtrarse. */
  | 'SEALED';

export interface CanonRef {
  truth: TruthLevel;
  disclosure: Disclosure;
  source: 'v0.7' | 'v0.8' | 'original_adventure' | 'scenario' | 'campaign';
  /** p. ej. "v0.7 §5.3" */
  citation?: string;
  /** Condición del motor que lo destraba. */
  revealGate?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIEMPO
// ─────────────────────────────────────────────────────────────────────────────

export interface WorldTime {
  /** Fecha diegética. "1924-10-17T21:40:00" */
  iso: string;
  precision: 'minute' | 'hour' | 'day' | 'vague';
  /** Cómo se le muestra al jugador. "una noche de octubre de 1924" */
  display: string;
}

export type TemporalCategory =
  | 'STABLE'
  | 'ALTERABLE'
  | 'SELF_FULFILLING'
  | 'UNKNOWN'
  | 'ECHO';

export interface TemporalEvent {
  id: TemporalEventId;
  description: string;
  when: WorldTime;
  category: TemporalCategory;
  /** Cada cambio de categoría es un evento del log. Nunca una edición. */
  categoryHistory: Array<{ category: TemporalCategory; at: EventId; reason: string }>;
  knownTo: InvestigatorId[];
  altered: boolean;
  alterationAttempts: AlterationAttempt[];
  canon: CanonRef;
}

export interface AlterationAttempt {
  by: InvestigatorId;
  at: EventId;
  intent: string;
  outcome: 'prevented' | 'caused' | 'unchanged' | 'transformed' | 'unresolved';
}

// ─────────────────────────────────────────────────────────────────────────────
// INVESTIGADOR
// ─────────────────────────────────────────────────────────────────────────────

export type CharacteristicId =
  | 'STR' | 'CON' | 'SIZ' | 'DEX' | 'APP' | 'INT' | 'POW' | 'EDU';

export type Characteristics = Record<CharacteristicId, number>;

export interface DerivedStats {
  hp: number;
  maxHp: number;
  san: number;
  maxSan: number;
  mp: number;
  maxMp: number;
  luck: number;
  move: number;
  /** Tabla propietaria de CoC 7e — verificar contra el manual licenciado. */
  damageBonus: string;
  build: number;
}

export interface SkillValue {
  base: number;
  /** Marcada por éxito para desarrollo entre sesiones (CoC 7e). */
  markedForGrowth: boolean;
  origin: 'occupation' | 'personal' | 'growth' | 'granted';
}

/**
 * Las tres variables de cordura. v0.9 §7.
 * Una persona puede tener SAN alta y estar profundamente contaminada.
 * SAN vive en DerivedStats; Exposición y Estabilidad viven acá.
 *
 * ⚠ ESCALAS PROVISIONALES — todas las constantes están en
 *   src/rules/umbral.config.ts, en un solo lugar, para que las ajustes
 *   después de jugar.
 */
export interface UmbralState {
  /** 0-100, ASCENDENTE. Contacto acumulado con el Umbral. No baja con descanso. */
  exposure: number;
  /** 0-100, DESCENDENTE desde 100. Coherencia de la percepción temporal. */
  stability: number;
  exposureEvents: ExposureRecord[];
  /** Cruzar un umbral es un hecho irreversible, no un estado reversible. */
  thresholdsCrossed: UmbralThreshold[];
  perceptualAnomalies: Anomaly[];
}

export type UmbralThreshold =
  /** Algo no encaja. */
  | 'FIRST_CONTACT'
  /** Descubre que la observación puede ser recíproca. */
  | 'RECIPROCITY'
  /** Recuerdos que no le pertenecen. */
  | 'CONTAMINATION'
  /** Presente y visión dejan de distinguirse con fiabilidad. */
  | 'DISSOLUTION';

export interface ExposureRecord {
  at: EventId;
  amount: number;
  cause: string;
  worldTime: WorldTime;
}

export interface Anomaly {
  id: string;
  description: string;
  since: EventId;
  persistent: boolean;
}

export interface Condition {
  id: string;
  name: string;
  description: string;
  kind: 'wound' | 'mental' | 'status' | 'phobia' | 'mania';
  temporary: boolean;
  since: EventId;
  mechanicalEffect?: MechanicalEffect;
}

export interface MechanicalEffect {
  /** Dados de penalización/bonificación aplicados a estas habilidades. */
  skillModifiers?: Array<{ skill: SkillId | CharacteristicId; dice: number }>;
  note?: string;
}

export interface KnowledgeEntry {
  id: string;
  statement: string;
  acquiredAt: EventId;
  source: string;
  /** Puede ser falso: el investigador cree cosas equivocadas. */
  reliability: 'reliable' | 'unreliable' | 'false' | 'unknown';
}

export interface Relationship {
  with: NpcId | InvestigatorId;
  name: string;
  kind: string;
  /** -100..100 */
  attitude: number;
  notes: string[];
}

export interface RingBond {
  itemId: ItemId;
  bondedAt: EventId;
  /** Retirarlo puede matar al portador (v0.7 §5.3). */
  removalLethal: boolean;
}

export interface Investigator {
  id: InvestigatorId;
  playerId: PlayerId | null;
  status: 'alive' | 'dead' | 'missing' | 'insane' | 'retired';

  name: string;
  age: number;
  occupation: string;
  nationality: string;
  description: string;
  birthplace?: string;

  characteristics: Characteristics;
  derived: DerivedStats;
  skills: Record<SkillId, SkillValue>;
  umbral: UmbralState;

  conditions: Condition[];

  /**
   * Tres conocimientos separados. Resuelve la contradicción D del Análisis v1.1.
   * El Keeper recibe SOLO `investigator` y `withheld`. `playerObserved` nunca
   * cruza al modelo: existe para que el motor pueda detectar metagaming y para
   * el meta-horror consentido.
   */
  knowledge: {
    investigator: KnowledgeEntry[];
    withheld: KnowledgeEntry[];
    playerObserved: KnowledgeEntry[];
  };

  relationships: Relationship[];
  experience: { markedSkills: SkillId[]; sessionsSurvived: number };
  ringBond: RingBond | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTARIO — fuente única de verdad (resuelve la contradicción C)
// ─────────────────────────────────────────────────────────────────────────────

export type DiscoveryCondition =
  | { kind: 'skill_check'; skill: SkillId | CharacteristicId; difficulty: Difficulty }
  | { kind: 'comparison'; withItem: ItemId }
  | { kind: 'usage'; times: number }
  | { kind: 'umbral_exposure'; min: number }
  | { kind: 'location'; at: LocationId }
  | { kind: 'world_time'; after: string }
  | { kind: 'never' };

export interface ItemProperty {
  id: PropertyId;
  description: string;
  mechanicalEffect?: MechanicalEffect;
  discoveryCondition?: DiscoveryCondition;
  disclosure: Disclosure;
}

export interface ConditionalProperty extends ItemProperty {
  trigger: DiscoveryCondition;
  active: boolean;
}

export interface TemporalProperty extends ItemProperty {
  variants: Array<{
    when: { umbralPermeabilityMin?: number; worldTimeAfter?: string };
    description: string;
  }>;
}

export interface Item {
  id: ItemId;
  name: string;
  shortDescription: string;
  /** null = perdido o destruido. */
  owner: InvestigatorId | NpcId | LocationId | null;
  locationDetail?: string;
  /** Si es false, está en el mundo pero el investigador no lo tiene encima. */
  carried: boolean;

  publicProperties: ItemProperty[];
  hiddenProperties: ItemProperty[];
  discoveredProperties: Array<{ propertyId: PropertyId; at: EventId; how: string }>;
  conditionalProperties: ConditionalProperty[];
  temporalProperties: TemporalProperty[];

  canon: CanonRef;
  usageCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIRADAS
// ─────────────────────────────────────────────────────────────────────────────

export type Difficulty = 'regular' | 'hard' | 'extreme';

export type SuccessDegree =
  | 'critical'
  | 'extreme'
  | 'hard'
  | 'regular'
  | 'failure'
  | 'fumble';

export interface RollModifier {
  kind: 'bonus_die' | 'penalty_die';
  count: number;
  reason: string;
}

export type RollVisibility = 'public' | 'hidden_result' | 'hidden_full';

export interface RollRecord {
  id: RollId;
  /** Índice en la cadena determinista. Verificable contra la semilla. */
  seq: number;
  investigatorId: InvestigatorId;
  playerId: PlayerId | null;

  /** COMPROMISO — fijado ANTES de conocer el resultado. */
  commitment: {
    reason: string;
    skill: SkillId | CharacteristicId;
    skillLabel: string;
    baseValue: number;
    difficulty: Difficulty;
    modifiers: RollModifier[];
    stakes: { onSuccess: string; onFailure: string };
    committedAt: string;
  };

  /** EJECUCIÓN — del RNG del motor, nunca del modelo. */
  execution: {
    /** Todos los d10 lanzados: [decenas..., unidades] */
    dice: number[];
    rawResult: number;
    degree: SuccessDegree;
    thresholds: { regular: number; hard: number; extreme: number };
    executedAt: string;
    proof: { index: number; hmac: string };
  };

  visibility: RollVisibility;
  push?: { pushedFrom: RollId; justification: string };
  narratedIn: EventId | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLERO DE INVESTIGACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export interface Clue {
  id: ClueId;
  description: string;
  kind: 'physical' | 'documentary' | 'testimonial' | 'experiential';
  discoveredBy: InvestigatorId;
  discoveredAt: EventId;
  source: string;
  /** El motor lo sabe. El jugador no, salvo que lo determine. */
  reliability: 'reliable' | 'unreliable' | 'false' | 'unknown';
  reliabilityKnown: boolean;
  disclosure: Disclosure;
}

export interface Fact {
  id: FactId;
  statement: string;
  establishedAt: EventId;
  supportingClues: ClueId[];
  canon: CanonRef;
}

export interface Hypothesis {
  id: HypothesisId;
  statement: string;
  proposedBy: InvestigatorId;
  proposedAt: EventId;
  /** ★ NUNCA se serializa hacia el cliente ni hacia el modelo. */
  actualTruth: 'true' | 'partially_true' | 'false' | 'undetermined';
  supportingClues: ClueId[];
  contradictingClues: ClueId[];
  status: 'open' | 'promoted_to_fact' | 'refuted' | 'abandoned';
}

export interface Contradiction {
  id: string;
  description: string;
  between: string[];
  notedAt: EventId;
  resolved: boolean;
}

export interface OpenQuestion {
  id: string;
  question: string;
  raisedAt: EventId;
  answered: boolean;
  answer?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  proposedBy: 'player' | 'keeper';
}

export interface InvestigationBoard {
  facts: Fact[];
  clues: Clue[];
  hypotheses: Hypothesis[];
  contradictions: Contradiction[];
  questions: OpenQuestion[];
  connections: Connection[];
}

/** Precondición del MOTOR para promover hipótesis → hecho. v0.8 §13. */
export const PROMOTION_RULE = {
  minSupportingClues: 3,
  minDistinctKinds: 2,
  maxContradictingClues: 0,
  requiresReliableSource: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// NPCs, DOCUMENTOS, CONSECUENCIAS
// ─────────────────────────────────────────────────────────────────────────────

export interface Secret {
  id: string;
  content: string;
  disclosure: Disclosure;
  revealGate?: string;
  revealed: boolean;
}

export interface Npc {
  id: NpcId;
  name: string;
  canon: CanonRef;
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  description: string;
  motivation: string;
  /** Miedos y límites propios: no es marioneta del protagonista (v1.0 §11). */
  fears: string[];
  refusals: string[];
  knowledge: KnowledgeEntry[];
  secrets: Secret[];
  relationships: Relationship[];
  attitude: Record<InvestigatorId, number>;
  present: boolean;
  isCompanion: boolean;
  stats?: { hp: number; skills: Record<SkillId, number> };
  createdAt: EventId;
}

export interface DiegeticDocument {
  id: DocumentId;
  title: string;
  author: string;
  date: string;
  location: string;
  kind:
    | 'diary' | 'letter' | 'report' | 'clipping'
    | 'manuscript' | 'photograph' | 'transcript' | 'file';
  content: string;
  /** Un documento puede ser auténtico y estar equivocado (v0.8 §19). */
  authenticity: 'authentic' | 'uncertain' | 'forged' | 'unknown';
  accuracy: 'accurate' | 'partially_accurate' | 'misinterpreted' | 'false';
  cluesContained: ClueId[];
  obtainedAt: EventId | null;
  canon: CanonRef;
}

export interface Consequence {
  id: ConsequenceId;
  description: string;
  causedBy: { investigator: InvestigatorId; event: EventId };
  scope: 'scene' | 'location' | 'campaign' | 'world';
  permanent: boolean;
  /** Texto que el Keeper DEBE tener en cuenta en turnos futuros. */
  worldReminder: string;
}

/** Las seis variables de continuidad de v0.8 §16. */
export interface ContinuityLedger {
  ringBearer: InvestigatorId | NpcId | null;
  ringState: 'intact' | 'altered' | 'lost' | 'bonded' | 'unknown' | 'absent';
  groupKnowledge: KnowledgeEntry[];
  costPaid: ConsequenceId[];
  activeEntities: Array<{ id: NpcId; name: string; state: string }>;
  temporalChange: TemporalEventId[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCALIZACIONES Y ESCENAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Algo examinable que NO es un objeto que se pueda llevar: el brocal, la
 * roldana, la tierra del patio, una ventana, un sombrero colgado.
 *
 * Existen para que la acción libre tenga superficie. Un escenario con cinco
 * objetos y nada más deja al jugador sin nada que mirar; con veinte detalles
 * examinables, "miro la tierra alrededor del brocal" tiene respuesta.
 */
export interface LocationFeature {
  id: string;
  /** Palabras con las que el jugador puede referirse a esto. */
  names: string[];
  /** Lo que se ve sin esfuerzo. */
  description: string;
  /** Lo que se ve con una tirada superada. Opcional. */
  closerLook?: string;
  /** Habilidad para la mirada atenta. Por defecto, Descubrir. */
  examineSkill?: SkillId;
  /** Exposición al Umbral que produce mirarlo con atención. */
  exposure?: number;
  /** Pista que se agrega al tablero si se examina con éxito. */
  clue?: { description: string; kind: Clue['kind']; reliability: Clue['reliability'] };
}

export interface GameLocation {
  id: LocationId;
  name: string;
  description: string;
  /** Descripción que cambia según el estado del mundo. */
  atmosphere: string[];
  connections: LocationId[];
  itemsPresent: ItemId[];
  npcsPresent: NpcId[];
  visited: boolean;
  /**
   * Notas de dirección — nunca al cliente. Opcional porque en el build
   * estático no existen: viven en el KeeperBriefing, que sólo se importa
   * cuando hay Keeper IA. Ver scenario/types.ts.
   */
  keeperNotes?: string;
  umbralIntensity: number;
  /** Detalles examinables. Ver LocationFeature. */
  features?: LocationFeature[];
  /** Qué se oye, se huele y se siente acá. Para acciones sensoriales libres. */
  senses?: { sound?: string[]; smell?: string[]; touch?: string[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// MUNDO Y CAMPAÑA
// ─────────────────────────────────────────────────────────────────────────────

export interface WorldState {
  time: WorldTime;
  currentLocation: LocationId;
  locations: Record<LocationId, GameLocation>;
  /** 0-100. 0 = imperceptible, 100 = manifestación abierta. */
  umbralPermeability: number;
  lastManifestation: WorldTime | null;
  /** 0-10. Presión de amenazas activas. */
  threatLevel: number;
  timeline: TemporalEvent[];
}

export interface CampaignMeta {
  previousCampaignIds: CampaignId[];
  newGamePlus: boolean;
  crosscampaignConsent: {
    allowMetaHorror: boolean;
    allowPreviousCampaignEchoes: boolean;
    grantedAt: string | null;
  };
  /** IRONMAN: un import marca la campaña y anula la garantía criptográfica. */
  saveIntegrity: 'sealed' | 'imported';
}

export interface RngCommitment {
  /** SHA-256 de la semilla. Se muestra al jugador desde el inicio. */
  commitment: string;
  /** Se revela al cerrar la campaña. null mientras esté en curso. */
  revealedSeed: string | null;
  nextIndex: number;
}

/** Estado completo de la campaña: la proyección del log de eventos. */
export interface GameState {
  campaignId: CampaignId;
  title: string;
  scenarioId: string;
  canonVersion: '0.7';
  keeperVersion: '0.8';
  engineVersion: '0.9';
  createdAt: string;
  session: number;
  headSeq: number;

  rng: RngCommitment;
  meta: CampaignMeta;

  investigators: Record<InvestigatorId, Investigator>;
  activeInvestigator: InvestigatorId;
  /** Investigadores disponibles para continuar tras una muerte. */
  reserveInvestigators: InvestigatorId[];

  world: WorldState;
  items: Record<ItemId, Item>;
  npcs: Record<NpcId, Npc>;
  documents: Record<DocumentId, DiegeticDocument>;
  board: InvestigationBoard;
  rolls: RollRecord[];
  consequences: Consequence[];
  continuity: ContinuityLedger;
  campaignCanon: Array<{ id: string; statement: string; addedAt: EventId }>;

  /** Narrativa acumulada de la sesión, para mostrar y para contexto. */
  narrative: NarrativeEntry[];
  /** Fin de partida, si llegó. */
  ending: { id: string; title: string; text: string } | null;
}

export interface NarrativeEntry {
  id: string;
  kind: 'keeper' | 'player' | 'system' | 'document';
  text: string;
  at: string;
  eventId: EventId;
}
