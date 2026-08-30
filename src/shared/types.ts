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
  origin: 'occupation' | 'personal' | 'growth' | 'granted';
}

/**
 * NO hay `markedForGrowth`.
 *
 * Lo hubo: un campo que existía desde el día uno y no escribía nadie —la misma
 * familia que los desenlaces declarados sin camino—. Las marcas se derivan del
 * registro de tiradas, que ya guarda grado de éxito y modificadores, así que
 * la regla de CoC 7e «no se marca si usaste dado de bonificación» se aplica
 * sola y no hay casilla que pueda desincronizarse de lo que de verdad pasó.
 * Ver `src/rules/desarrollo.ts`.
 */

/** Una pieza del trasfondo. Es lo que la auto-ayuda usa para recuperar Cordura. */
export interface BackstoryAspect {
  id: string;
  kind:
    | 'ideologia' | 'personas' | 'lugares' | 'posesiones' | 'rasgos'
    | 'heridas' | 'fobias' | 'encuentros';
  text: string;
  /**
   * Las heridas, fobias y encuentros con entidades no se editan libremente
   * (CoC 7e p. 95): son registro de lo que pasó, no decoración.
   */
  locked?: boolean;
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
  /**
   * 0-100, ASCENDENTE dentro de una aventura. No baja con descanso DURANTE
   * una partida. Entre aventuras SÍ puede decaer, pero nunca por debajo del
   * piso que fija `peakExposure` — ver `pisoDeExposicion` en umbral.config.ts.
   */
  exposure: number;
  /** 0-100, DESCENDENTE desde 100. Coherencia de la percepción temporal. */
  stability: number;
  /**
   * El máximo de `exposure` que este investigador alcanzó alguna vez. NUNCA
   * baja — es la memoria permanente de cuán hondo estuvo, incluso si la
   * Exposición visible decae entre aventuras. Fija el piso de esa decadencia.
   */
  peakExposure: number;
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
  /**
   * De DÓNDE vino el contacto, como identificador estable.
   *
   * Es distinto de `cause`, que es prosa para el registro y cambia de una vez
   * a la otra. La fuente es lo que permite contar repeticiones: sin ella, el
   * motor no puede saber que ésta es la décima vez que mirás la misma agua.
   */
  source: string;
  /** Lo que habría dado sin rendimientos decrecientes. Para auditar. */
  amountBeforeDecay?: number;
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
  /**
   * Dados aplicados a estas habilidades mientras la condición esté activa.
   * `dice` POSITIVO es penalización, NEGATIVO es bonificación — igual que se
   * lee «+1 dado en contra» o «-1 dado a favor» en la mesa. El motor los suma
   * a los que ya traiga la tirada y los topa en 2, igual que cualquier otro
   * modificador (`toolRequestRoll`).
   *
   * Estuvo declarado sin que nada lo leyera hasta que las fobias y manías
   * necesitaron un efecto real: una condición que sólo cambia la prosa no es
   * una fobia, es una etiqueta.
   */
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
  /**
   * `unconscious` es de la Herida Grave (p. 119): perder la mitad o más de
   * los PV máximos DE UN GOLPE obliga a tirar CON o desmayarse, aunque
   * queden PV. No es lo mismo que `dead`: es temporario, y el juego hoy no
   * tiene una herramienta de reanimar — igual que llegar a 0 PV, que
   * tampoco la tenía antes de esto. Bloquea acciones por el mismo camino
   * que ya bloqueaba `dead`/`insane`: todo lo que compara `status !==
   * 'alive'` ya lo respeta sin cambios.
   */
  status: 'alive' | 'dead' | 'missing' | 'insane' | 'retired' | 'unconscious';

  name: string;
  age: number;
  occupation: string;
  /**
   * Cómo se dirige a este investigador la gente de campo: «doctora»,
   * «comisario», «don Tomás». Un solo campo en vez de género + ocupación
   * porque quien escribe una escena no tiene por qué resolver esa gramática:
   * la prosa pone el token `{trato}` y listo. Nace de un bug real — la prosa
   * decía «doctora» sin mirar quién jugaba. Ver `rules/tratamiento.ts`.
   */
  treatment: string;
  /**
   * Sólo para concordancia gramatical —«lo»/«la», «cansado»/«cansada»—, vía
   * los tokens `{lo}`/`{Lo}` en `rules/tratamiento.ts`. `treatment` alcanzaba
   * para el tratamiento en sí, pero no para el resto de la oración: la
   * apertura de las dos aventuras tenía «la dejó en el portón» fijo, mismo
   * bug que «doctora» en una posición gramatical distinta.
   */
  genero: 'm' | 'f';
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
  /**
   * Trasfondo. `keyConnection` apunta al id del aspecto que más le importa:
   * usarlo en la auto-ayuda da dado de bonificación, y su éxito además cura la
   * locura indefinida (p. 169).
   */
  backstory: { aspects: BackstoryAspect[]; keyConnection: string | null };

  experience: {
    sessionsSurvived: number;
    /**
     * Frontera de las marcas de habilidad. Cerrar una fase de desarrollo borra
     * las marcas (p. 94); acá eso es «no mirar tiradas anteriores a este
     * punto». Sin la frontera, lo hecho en la primera aventura seguiría
     * contando en la segunda.
     */
    lastDevelopmentSeq: number;
  };
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
  /**
   * Cómo lo puede nombrar el jugador, además del nombre.
   *
   * Lo declara la aventura porque es la aventura la que sabe que a su placa
   * fotográfica se la puede llamar «la foto dada vuelta». Antes esta lista
   * estaba escrita a mano dentro del clasificador, que es como el motor
   * terminaba conociendo los objetos de una aventura concreta.
   */
  aliases?: string[];
  shortDescription: string;
  /** null = perdido o destruido. */
  owner: InvestigatorId | NpcId | LocationId | null;
  locationDetail?: string;
  /** Si es false, está en el mundo pero el investigador no lo tiene encima. */
  carried: boolean;
  /** Si está definido, este objeto ES un arma: el id de `rules/armas.ts` con el que se puede pelear. */
  armaId?: string;
  /** Si es true, este ítem ya no sirve como arma —se rompió, típicamente por una pifia con arma de fuego—. `armaId` se conserva a propósito: sigue siendo, narrativamente, esa arma, sólo que inútil. */
  roto?: boolean;
  /**
   * Valor de referencia, en la moneda del momento (pesos de 1928 o el que
   * corresponda). No hay economía todavía —nadie compra ni vende nada—, así
   * que hoy es sólo un dato declarado en el contenido, sin ningún tool que
   * lo lea. Existe para no tener que volver a cada ítem cuando esa economía
   * se construya.
   */
  value?: number;

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
    /** Todos los d10 lanzados: [unidades, decenas...]. El orden importa. */
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
  /**
   * Cuánto más aguanta que le pregunten ahora mismo. Es el presupuesto que
   * hace que preguntar cueste: sin él, la estrategia óptima es agotar todos
   * los temas en orden y reintentar cada tirada hasta que salga.
   *
   * No es actitud. Rosa puede confiar en usted y estar harta de usted al mismo
   * tiempo, y eso es exactamente lo que pasa después de media hora de
   * preguntas. Se recupera con el tiempo del mundo: irse y volver más tarde.
   */
  patience: number;
  /** Temas que esquivó. Insistir cuesta más y tira con penalización. */
  dodgedTopics: string[];
  /**
   * Variantes propias para cuando la paciencia llega a cero. Sin esto, el
   * motor usa un genérico de personaje doméstico («tengo que hacer la
   * cena»), que le queda bien a alguien como Rosa y mal a un NPC central de
   * otra escala —a Bernardo Díaz, en El Vigésimo, ese genérico le sonaba
   * ajeno del todo—. Reportado jugando.
   */
  patienceExhaustedText?: string[];
  /**
   * Con qué pelea, si es que pelea. Ausente en la enorme mayoría: una viuda
   * en su cocina no tiene estadísticas de combate, y dárselas «por las
   * dudas» sería sugerir que pegarle es una opción que el juego contempla.
   * Sin esto, el motor rechaza cualquier ataque contra este personaje.
   */
  combate?: CombateNpc;
  present: boolean;
  isCompanion: boolean;
  stats?: { hp: number; skills: Record<SkillId, number> };
  createdAt: EventId;
}

/**
 * Un NPC tal como lo escribe una aventura.
 *
 * `patience` y `dodgedTopics` son del sistema social, no de la ficción: quien
 * escribe una aventura no tiene por qué conocerlos. El motor los rellena al
 * crear la campaña, y un escenario puede fijarlos si un personaje concreto
 * aguanta más o menos preguntas que el resto.
 */
/**
 * Lo que hace falta para que alguien pueda devolver un golpe.
 *
 * Es deliberadamente chico: no es una ficha de investigador. Un NPC no
 * necesita ocho características ni veinte habilidades para pelear —necesita
 * aguantar, acertar y hacer daño—, y pedirle más al contenido sería pedirle
 * que llene casillas que nadie va a leer.
 */
export interface CombateNpc {
  hp: number;
  maxHp: number;
  /** Habilidad de Pelea, 0-100. Con la que ataca y con la que devuelve. */
  pelea: number;
  /** Habilidad de Esquivar, 0-100. */
  esquivar: number;
  /** Con qué pelea. Un id de `rules/armas.ts`. */
  armaId: string;
  /** Bonificación de daño, escrita como en la ficha: `+1D4`, `0`, `-1`. */
  bonificacionDano: string;
  /**
   * Qué hace cuando lo atacan. El manual (recuadro «Does the Monster Fight
   * Back or Dodge?») dice que lo normal es devolver el golpe: hace el
   * combate más rápido y más simple de dirigir. Esquivar es de quien quiere
   * escapar, no de quien quiere ganar.
   */
  defensaPorDefecto: 'esquiva' | 'contraataca';
  /**
   * Destreza, 0-100. Sólo decide el orden de un asalto con más de dos
   * peleando: quién actúa antes de que el investigador termine su propio
   * ataque, y quién actúa después. Opcional porque un rival solo —el caso de
   * casi toda esta aventura— no necesita orden de nada.
   */
  dex?: number;
  /**
   * Corpulencia (Build), para las maniobras (desarmar, derribar, sujetar):
   * el manual compara Build contra Build para decidir si la maniobra es
   * posible y con qué dados. Sin esto se asume 0 (un tamaño medio).
   */
  build?: number;
  /**
   * Marcas de UN SOLO USO que deja una maniobra y que consume el próximo
   * ataque que corresponda. `derribado` da un dado de bonificación a quien
   * lo ataque después; `agarrado` da un dado de penalización a sus propios
   * ataques. Se limpian solas al consumirse — no son un estado permanente,
   * son «esto vale hasta la próxima tirada».
   */
  derribado?: boolean;
  agarrado?: boolean;
  /**
   * Este rival NO se gana a golpes: las heridas normales se le cierran solas
   * y hay que atacar un punto concreto, declarándolo antes.
   *
   * Existe porque el clímax de El Vigésimo lo pedía y el motor sólo sabía
   * restar PV: contra alguien que lleva trescientos años sostenido por un
   * objeto, bajarle una barra de vida a puñetazos convierte la escena en
   * cualquier otra pelea. Es genérico —el motor no sabe qué es un anillo—:
   * el escenario declara qué hay que atacar, cuánto aguanta y qué se ve
   * cuando una herida normal se cierra.
   *
   * Mientras `hpPuntoDebil > 0`, el daño común no baja `hp`: se narra
   * `seCierra` y no pasa nada más. El ataque dirigido al punto débil tira
   * con un dado de penalización —hay que apuntar—, y sólo cuenta con un arma
   * que corte o empale si `requiereCortante`.
   */
  invulnerabilidad?: {
    /** Qué hay que atacar, dicho como lo diría un jugador: «la mano del anillo». */
    puntoDebil: string;
    hpPuntoDebil: number;
    maxHpPuntoDebil: number;
    /** Qué se ve cuando una herida común se cierra sola. Es la pista. */
    seCierra: string;
    requiereCortante?: boolean;
  };
}

export type NpcSeed =
  Omit<Npc, 'patience' | 'dodgedTopics'>
  & Partial<Pick<Npc, 'patience' | 'dodgedTopics'>>;

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

/**
 * Marca que hay un combate de verdad en curso, distinto del simulador: a
 * partir de acá la interfaz cambia a la pantalla dedicada. Vive en el
 * GameState (no en un estado local de React) para sobrevivir un refresh.
 */
export interface ActiveCombat {
  npcIds: NpcId[];
  startedAt: EventId;
  reason: string;
  /**
   * Configurado por la escena que abrió el combate. Sin esto, no hay botón
   * de Intimidar ni consecuencia distinta por disparar: el combate se pelea
   * igual que hoy — así queda el simulador, que nunca lo setea.
   */
  salidaPacifica?: {
    npcId: NpcId;
    pistaCalma: { description: string; kind: Clue['kind']; source: string; reliability: Clue['reliability'] };
    consecuenciaDisparo: { description: string; scope: Consequence['scope']; permanent: boolean; worldReminder: string };
  };
  /**
   * Configurado por la escena que abrió el combate, según lo que el
   * investigador ya sabía al llegar. Sin esto, ningún bono — así queda el
   * simulador, que nunca lo setea. Se lee en cada asalto (no se consume
   * como el bono por derribo): es lo que el investigador ya sabe, no un
   * recurso de un solo uso.
   */
  preparacion?: { dice: number; motivo: string };
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
  /** Cómo la puede nombrar el jugador. Ver `Item.aliases`. */
  aliases?: string[];
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
  /** No-nulo mientras haya un combate real en curso (no el simulador). */
  activeCombat: ActiveCombat | null;

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
