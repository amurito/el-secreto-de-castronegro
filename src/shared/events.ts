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
  | 'NPC_CREATED'
  | 'NPC_STATE_CHANGED'
  | 'RELATIONSHIP_CHANGED'
  | 'DOCUMENT_OBTAINED'
  | 'LOCATION_ENTERED'
  | 'TIME_ADVANCED'
  | 'EVENT_CATEGORIZED'
  | 'EVENT_ALTERED'
  | 'TEMPORAL_ECHO_RECEIVED'
  | 'UMBRAL_EXPOSURE'
  | 'STABILITY_SHIFT'
  | 'THRESHOLD_CROSSED'
  | 'VISION_RECEIVED'
  | 'INVESTIGATOR_DIED'
  | 'INVESTIGATOR_INTRODUCED'
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
