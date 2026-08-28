/**
 * EVENTOS — el log es append-only. Nunca se edita, nunca se borra.
 *
 * Esta es la invariante estructural del proyecto: no hay que confiar en que el
 * modelo no reescriba el pasado, porque NO EXISTE la operación de reescribir
 * el pasado. Análisis Técnico v1.1 §3.1.
 */

import type {
  CampaignId, EventId, InvestigatorId, PlayerId, ItemId, PropertyId,
  NpcId, ClueId, FactId, HypothesisId, DocumentId, LocationId,
  ConsequenceId, TemporalEventId, SkillId, CharacteristicId,
  WorldTime, RollRecord, TemporalCategory, UmbralThreshold,
  Condition, KnowledgeEntry, SuccessDegree, Difficulty, RollModifier,
  RollVisibility, CanonRef, Secret, DiegeticDocument, Npc, NpcSeed, Item,
  Investigator, Clue,
} from './types.ts';

export type Actor =
  | { type: 'player'; playerId: PlayerId; investigatorId?: InvestigatorId }
  | { type: 'keeper' }
  | { type: 'system' };

export interface GameEvent {
  seq: number;
  id: EventId;
  campaignId: CampaignId;
  session: number;
  type: GameEventType;
  payload: unknown;
  actor: Actor;
  /** Tiempo real. */
  occurredAt: string;
  /** Tiempo diegético en el momento del evento. */
  worldTime: WorldTime;
  causedBy?: EventId;
  /** Versionado para upcasting de esquema. */
  schemaVer: number;
}

export type GameEventType =
  | 'CAMPAIGN_CREATED'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'INTENT_SUBMITTED'
  | 'INTENT_CLASSIFIED'
  | 'ROLL_REQUESTED'
  | 'ROLL_EXECUTED'
  | 'ROLL_PUSHED'
  | 'STAT_CHANGED'
  | 'CONDITION_APPLIED'
  | 'CONDITION_REMOVED'
  | 'ITEM_ACQUIRED'
  | 'ITEM_TRANSFERRED'
  | 'ITEM_LOST'
  | 'ITEM_USED'
  | 'PROPERTY_DISCOVERED'
  | 'CLUE_DISCOVERED'
  | 'FACT_ESTABLISHED'
  | 'HYPOTHESIS_FORMED'
  | 'HYPOTHESIS_PROMOTED'
  | 'HYPOTHESIS_REFUTED'
  | 'CONTRADICTION_NOTED'
  | 'QUESTION_RAISED'
  | 'PLAYER_KNOWLEDGE_NOTED'
  | 'NPC_CREATED'
  | 'NPC_STATE_CHANGED'
  | 'NPC_DAMAGED'
  | 'NPC_COMBATE_CHANGED'
  | 'COMBAT_STARTED'
  | 'COMBAT_ENDED'
  | 'ITEM_BROKEN'
  | 'INVESTIGATOR_UNCONSCIOUS'
  | 'RELATIONSHIP_CHANGED'
  | 'DOCUMENT_OBTAINED'
  | 'LOCATION_ENTERED'
  | 'TIME_ADVANCED'
  | 'EVENT_CATEGORIZED'
  | 'EVENT_ALTERED'
  | 'TEMPORAL_ECHO_RECEIVED'
  | 'UMBRAL_EXPOSURE'
  | 'WORLD_PERMEABILITY_SHIFT'
  | 'STABILITY_SHIFT'
  | 'THRESHOLD_CROSSED'
  | 'VISION_RECEIVED'
  | 'INVESTIGATOR_DIED'
  | 'INVESTIGATOR_WENT_INSANE'
  | 'INVESTIGATOR_INTRODUCED'
  | 'SKILL_IMPROVED'
  | 'MYTHOS_GAINED'
  | 'BACKSTORY_REVISED'
  | 'DEVELOPMENT_PHASE_COMPLETED'
  | 'CONSEQUENCE_RECORDED'
  | 'CAMPAIGN_CANON_ADDED'
  | 'NARRATION_EMITTED'
  /** Telemetría del sistema anti-alucinación. Ver Análisis v1.1 §12.1-12.2. */
  | 'KEEPER_PROPOSAL_REJECTED'
  | 'ENDING_REACHED';

// ── Payloads ────────────────────────────────────────────────────────────────

export interface CampaignCreatedPayload {
  title: string;
  scenarioId: string;
  rngCommitment: string;
  investigators: Investigator[];
  activeInvestigator: InvestigatorId;
  reserveInvestigators: InvestigatorId[];
  items: Item[];
  npcs: NpcSeed[];
  documents: DiegeticDocument[];
  locations: Record<LocationId, import('./types.ts').GameLocation>;
  startLocation: LocationId;
  worldTime: WorldTime;
  umbralPermeability: number;
  timeline: import('./types.ts').TemporalEvent[];
}

export interface IntentSubmittedPayload {
  text: string;
  investigatorId: InvestigatorId;
}

export interface IntentClassifiedPayload {
  intentEventId: EventId;
  classification: 'trivial' | 'narrative' | 'roll_required' | 'impossible' | 'needs_clarification';
  rationale: string;
}

export interface RollRequestedPayload {
  rollId: string;
  investigatorId: InvestigatorId;
  skill: SkillId | CharacteristicId;
  skillLabel: string;
  baseValue: number;
  difficulty: Difficulty;
  modifiers: RollModifier[];
  reason: string;
  stakes: { onSuccess: string; onFailure: string };
  visibility: RollVisibility;
}

export interface RollExecutedPayload {
  roll: RollRecord;
}

export interface StatChangedPayload {
  investigatorId: InvestigatorId;
  stat: 'hp' | 'san' | 'mp' | 'luck';
  from: number;
  to: number;
  delta: number;
  cause: string;
}

export interface UmbralExposurePayload {
  investigatorId: InvestigatorId;
  /** Lo aplicado de verdad, ya con rendimientos decrecientes. Puede ser 0. */
  amount: number;
  from: number;
  to: number;
  cause: string;
  /** Identificador estable del origen. Es lo que permite contar repeticiones. */
  source: string;
  /** Lo que habría dado la primera vez. Para auditar el decaimiento. */
  amountBeforeDecay: number;
}

/**
 * El mundo se abre solo con las horas. No tiene investigatorId: es del
 * mundo, no de nadie en particular — a diferencia de `UmbralExposurePayload`.
 */
export interface WorldPermeabilityShiftPayload {
  amount: number;
  from: number;
  to: number;
  cause: string;
}

export interface StabilityShiftPayload {
  investigatorId: InvestigatorId;
  amount: number;
  from: number;
  to: number;
  cause: string;
}

export interface ThresholdCrossedPayload {
  investigatorId: InvestigatorId;
  threshold: UmbralThreshold;
  atExposure: number;
}

export interface PropertyDiscoveredPayload {
  itemId: ItemId;
  propertyId: PropertyId;
  description: string;
  how: string;
  investigatorId: InvestigatorId;
}

export interface ClueDiscoveredPayload {
  clue: Clue;
}

export interface HypothesisFormedPayload {
  id: HypothesisId;
  statement: string;
  proposedBy: InvestigatorId;
}

export interface HypothesisPromotedPayload {
  hypothesisId: HypothesisId;
  factId: FactId;
  statement: string;
  supportingClues: ClueId[];
}

export interface NpcCreatedPayload {
  npc: Npc;
}

export interface NpcStateChangedPayload {
  npcId: NpcId;
  changes: Partial<Pick<Npc, 'status' | 'present' | 'motivation'>>;
  attitudeDelta?: { investigatorId: InvestigatorId; delta: number };
  /** Gasto o recuperación de paciencia. Negativo cansa. */
  patienceDelta?: number;
  /** Tema que el NPC acaba de esquivar: insistir después cuesta más. */
  dodgedTopic?: string;
  cause: string;
}

export interface NpcDamagedPayload {
  npcId: NpcId;
  from: number;
  to: number;
  cause: string;
  /** El golpe llegó a la mitad de sus PV de una vez: herida grave. */
  heridaGrave: boolean;
}

/** Cambios directos a las estadísticas de combate: desarmar, derribar, sujetar. */
export interface NpcCombateChangedPayload {
  npcId: NpcId;
  changes: Partial<Pick<import('./types.ts').CombateNpc, 'armaId' | 'derribado' | 'agarrado'>>;
  cause: string;
}

/** Arranca un combate real (no el simulador): la interfaz cambia de pantalla. */
export interface CombatStartedPayload {
  npcIds: NpcId[];
  reason: string;
}

/** Cierra el combate real en curso, cualquiera sea el motivo. */
export interface CombatEndedPayload {
  reason: 'npc_derrotado' | 'huyo' | 'investigador_caido';
  npcIds: NpcId[];
}

/** Herida Grave (p. 119): pérdida de 5+ o mitad de los PV máximos de un golpe. */
export interface InvestigatorUnconsciousPayload {
  investigatorId: InvestigatorId;
  cause: string;
}

export interface DocumentObtainedPayload {
  document: DiegeticDocument;
}

export interface ItemTransferredPayload {
  itemId: ItemId;
  from: string | null;
  to: string | null;
  carried: boolean;
  cause: string;
}

/** Un arma queda inutilizada — típicamente por una pifia disparando. */
export interface ItemBrokenPayload {
  itemId: ItemId;
  cause: string;
}

export interface ConditionAppliedPayload {
  investigatorId: InvestigatorId;
  condition: Condition;
}

export interface LocationEnteredPayload {
  locationId: LocationId;
  investigatorId: InvestigatorId;
}

export interface TimeAdvancedPayload {
  from: WorldTime;
  to: WorldTime;
  minutes: number;
  reason: string;
}

export interface ConsequenceRecordedPayload {
  id: ConsequenceId;
  description: string;
  scope: 'scene' | 'location' | 'campaign' | 'world';
  permanent: boolean;
  worldReminder: string;
  investigatorId: InvestigatorId;
}

export interface CampaignCanonAddedPayload {
  id: string;
  statement: string;
  canon: CanonRef;
}

export interface NarrationEmittedPayload {
  text: string;
  options: string[];
}

export interface InvestigatorDiedPayload {
  investigatorId: InvestigatorId;
  cause: string;
}

/**
 * Cordura en 0 (CoC 7e p. 166): locura indefinida, el investigador queda
 * fuera de juego como personaje jugable. No es la muerte, pero cierra la
 * partida para él igual que la muerte: por eso el status y el flujo de
 * reserva son los mismos que en `INVESTIGATOR_DIED`.
 */
export interface InvestigatorWentInsanePayload {
  investigatorId: InvestigatorId;
  cause: string;
}

export interface InvestigatorIntroducedPayload {
  investigatorId: InvestigatorId;
  inheritedKnowledge: KnowledgeEntry[];
}

export interface KeeperProposalRejectedPayload {
  tool: string;
  args: unknown;
  reason: string;
}

export interface TemporalEchoPayload {
  temporalEventId: TemporalEventId | null;
  description: string;
  investigatorId: InvestigatorId;
}

export interface EventCategorizedPayload {
  temporalEventId: TemporalEventId;
  category: TemporalCategory;
  reason: string;
}

export interface SkillImprovedPayload {
  investigatorId: InvestigatorId;
  skill: SkillId;
  label: string;
  from: number;
  to: number;
  /** El 1D100 de la comprobación y el 1D10 de la subida. Auditable. */
  check: number;
  gain: number;
  proof: { index: number; hmac: string };
}

/**
 * Mitos de Cthulhu subió, y con él bajó el techo de Cordura (p. 169:
 * Cordura máxima = 99 − Mitos). Evento propio y no `SKILL_IMPROVED` porque
 * no es una mejora: es la única habilidad que cuesta algo tenerla, y el
 * recorte del techo tiene que quedar en el log al lado de su causa.
 */
export interface MythosGainedPayload {
  investigatorId: InvestigatorId;
  from: number;
  to: number;
  maxSanFrom: number;
  maxSanTo: number;
  /** La Cordura actual, recortada si quedó por encima del techo nuevo. */
  sanFrom: number;
  sanTo: number;
  /** Qué se leyó o se vio. Va a la narración y al log. */
  source: string;
}

export interface BackstoryRevisedPayload {
  investigatorId: InvestigatorId;
  aspectId: string;
  from: string;
  to: string;
  reason: string;
  /** Si además dejó de ser la conexión clave. */
  lostKeyConnection?: boolean;
}

export interface DevelopmentPhaseCompletedPayload {
  investigatorId: InvestigatorId;
  /** Frontera nueva: las marcas anteriores a esto quedan borradas. */
  atRollSeq: number;
  skillsChecked: number;
  skillsImproved: number;
  sanityGained: number;
  summary: string;
}

export interface EndingReachedPayload {
  id: string;
  title: string;
  text: string;
}

export interface RollDegreeInfo {
  degree: SuccessDegree;
}

export interface SecretRevealedPayload {
  secret: Secret;
}
