/**
 * GAME ENGINE — dueño del estado, del azar y de las reglas.
 *
 * El Keeper IA propone; este módulo dispone. Toda herramienta pasa por acá,
 * se valida, y si sobrevive produce eventos. Si no sobrevive, el rechazo
 * también produce un evento (KEEPER_PROPOSAL_REJECTED): así se puede medir si
 * el sistema anti-alucinación funciona.
 *
 * Nada en este archivo importa de src/keeper/. Si esa flecha alguna vez se
 * invierte, el modelo pasó a ser dueño del estado y el proyecto perdió su tesis.
 */

import { uuid } from './crypto.ts';
import type { GameEvent, Actor, GameEventType } from '../shared/events.ts';
import type {
  GameState, InvestigatorId, RollRecord, RollModifier, Difficulty,
  Clue, Npc, Condition, WorldTime, SkillId, CharacteristicId, Investigator,
} from '../shared/types.ts';
import { fold, apply } from './reducers.ts';
import { store, type CampaignIndexEntry } from './store.ts';
import { dieValues, generateSeed, commitmentOf } from './rng.ts';
import {
  combineD100, degreeFor, meetsDifficulty, tensDiceNeeded, thresholdsFor,
  DEGREE_LABEL, DIFFICULTY_LABEL, canPush,
} from '../rules/dice.ts';
import { isCharacteristic, labelFor, SKILL_BY_ID } from '../rules/skills.ts';
import {
  applyExposure, applyStabilityLoss, applyStabilityRecovery,
  stabilityPenaltyDice, extraSanLossFromExposure, thresholdInfo,
} from '../rules/umbral.ts';
import { PACIENCIA_INICIAL, PACIENCIA_MAXIMA, RECUPERACION } from '../rules/social.config.ts';
import { STABILITY_RECOVERY, techoDeEstabilidad } from '../rules/umbral.config.ts';
import {
  marcasDe, mejora, alcanzaMaestria, maxCordura, premioDelKeeper,
  DADOS_SAN_POR_MAESTRIA, AUTOAYUDA, type Marca,
} from '../rules/desarrollo.ts';
import { canDiscoverProperty, canPromoteHypothesis } from './gates.ts';
import { toClientRoll } from '../shared/protocol.ts';
import type { Scenario } from '../scenario/types.ts';

export interface SelfHelpResult {
  aspectId: string;
  texto: string;
  exito: boolean;
  sanDelta: number;
  tirada: number;
  objetivo: number;
  usoConexionClave: boolean;
  perdioConexionClave: boolean;
  nota: string;
}

export interface DevelopmentReport {
  mejoras: Array<{
    skill: string; label: string;
    antes: number; despues: number;
    /** El 1D100 de la comprobación. Sube si supera el valor previo. */
    check: number;
    gain: number;
  }>;
  premio: { dados: number; caras: number; razon: string; total: number };
  autoayuda: SelfHelpResult | null;
  sanGanada: number;
  sanFinal: number;
  maxSan: number;
  resumen: string;
}

export interface ToolOutcome {
  ok: boolean;
  /** Lo que se le devuelve al modelo como tool_result. */
  message: string;
  /** Para la UI, cuando hay algo que mostrar en vivo. */
  emit?: { kind: string; data: unknown };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const id = uuid;

// ─────────────────────────────────────────────────────────────────────────────
// CREACIÓN Y CARGA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `seedOverride` sirve para partidas reproducibles: pruebas, depuración y
 * reproducir el informe de un bug con las mismas tiradas. En una partida real
 * NUNCA se pasa: la semilla tiene que ser impredecible para que el compromiso
 * criptográfico signifique algo.
 */
/**
 * Lo que una aventura le pasa a la siguiente.
 *
 * Es el estado final de la campaña anterior, entero. Acá se decide qué de eso
 * cruza, y esa decisión es de diseño, no técnica — está documentada abajo, en
 * `heredarInvestigador`.
 */
export interface Herencia {
  estadoAnterior: GameState;
  /** Meses diegéticos entre una aventura y la otra. */
  mesesTranscurridos: number;
}

export async function createCampaign(
  scenario: Scenario,
  title?: string,
  seedOverride?: string,
  herencia?: Herencia,
  /**
   * Investigador creado por el jugador. Reemplaza al primero de los
   * pregenerados; los demás quedan de reserva, porque el proyecto tiene muerte
   * permanente y quedarse sin nadie a quien continuar sería un callejón.
   */
  propio?: Investigator,
): Promise<string> {
  const campaignId = id();
  const seed = seedOverride ?? generateSeed();
  const commitment = commitmentOf(seed);
  const now = new Date().toISOString();

  const meta: CampaignIndexEntry = {
    campaignId,
    title: title ?? scenario.title,
    scenarioId: scenario.id,
    createdAt: now,
    lastPlayedAt: now,
    headSeq: 0,
    seed,
    seedCommitment: commitment,
    saveIntegrity: 'sealed',
  };
  await store().createCampaign(meta);

  const creation: GameEvent = {
    seq: 1,
    id: id(),
    campaignId,
    session: 1,
    type: 'CAMPAIGN_CREATED',
    actor: { type: 'system' },
    occurredAt: now,
    worldTime: scenario.startTime,
    schemaVer: 1,
    payload: {
      title: title ?? scenario.title,
      scenarioId: scenario.id,
      rngCommitment: commitment,
      investigators: propio
        ? [propio, ...scenario.investigators.slice(1)]
        : investigadoresDe(scenario, herencia),
      activeInvestigator: propio ? propio.id : activoDe(scenario, herencia),
      reserveInvestigators: propio
        ? scenario.investigators.slice(1).map((i) => i.id)
        : investigadoresDe(scenario, herencia)
            .map((i) => i.id)
            .filter((x) => x !== activoDe(scenario, herencia)),
      items: scenario.items,
      npcs: scenario.npcs,
      documents: scenario.documents,
      locations: scenario.locations,
      startLocation: scenario.startLocation,
      worldTime: scenario.startTime,
      umbralPermeability: scenario.startUmbralPermeability,
      timeline: scenario.timeline,
    },
  };
  await store().append(campaignId, [creation]);

  if (herencia) await sembrarHerencia(campaignId, scenario, herencia);
  return campaignId;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCADENADO DE CAMPAÑA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QUÉ CRUZA DE UNA AVENTURA A LA SIGUIENTE, Y POR QUÉ.
 *
 *   Habilidades, Cordura y trasfondo → SÍ. Son lo que la fase de desarrollo
 *   acaba de producir; si no cruzaran, la fase no serviría para nada.
 *
 *   Cicatrices y trastornos → SÍ. El proyecto tiene muerte permanente; sería
 *   incoherente que una fobia se curara al empezar capítulo.
 *
 *   EXPOSICIÓN AL UMBRAL → SÍ, ENTERA, y los umbrales cruzados también. El
 *   canon dice que la exposición no baja con descanso (v0.9 §7) y que cruzar un
 *   umbral es un hecho irreversible. Bajarla entre aventuras sería una
 *   ampliación de canon, y ésa no se toma de contrabando dentro de un refactor.
 *
 *   ESTABILIDAD → se recupera. Es lo que el canon SÍ permite: se recupera por
 *   anclaje, y meses de rutina son anclaje. Usa `STABILITY_RECOVERY.betweenSessions`,
 *   que estaba declarado en la configuración y no lo usaba nadie.
 *
 *   Puntos de vida → se curan. Meses.
 *
 *   Objetos, pistas y tablero → NO. Son de la investigación anterior. Lo que
 *   sobrevive de aquello es CONOCIMIENTO, que cruza como tal.
 */
function heredarInvestigador(inv: Investigator, meses: number): Investigator {
  const tramos = Math.max(1, Math.floor(meses));
  // El techo baja con la exposición: quien más contacto tuvo con el fenómeno
  // menos puede volver a anclarse del todo. Sin techo, la Estabilidad se
  // recupera siempre al 100 y la campaña deja de acumular daño.
  const techo = techoDeEstabilidad(inv.umbral.exposure);
  const estabilidad = clamp(
    inv.umbral.stability + STABILITY_RECOVERY.betweenSessions * tramos,
    0,
    Math.max(inv.umbral.stability, techo),
  );
  return {
    ...inv,
    derived: { ...inv.derived, hp: inv.derived.maxHp },
    umbral: {
      ...inv.umbral,
      stability: estabilidad,
      // exposure y thresholdsCrossed intactos, a propósito.
      exposureEvents: [...inv.umbral.exposureEvents],
      thresholdsCrossed: [...inv.umbral.thresholdsCrossed],
      perceptualAnomalies: [...inv.umbral.perceptualAnomalies],
    },
    // Las heridas temporales cierran; lo mental y lo permanente queda.
    conditions: inv.conditions.filter((c) => !c.temporary || c.kind !== 'wound'),
    knowledge: {
      investigator: [...inv.knowledge.investigator],
      withheld: [...inv.knowledge.withheld],
      playerObserved: [...inv.knowledge.playerObserved],
    },
  };
}

function investigadoresDe(scenario: Scenario, herencia?: Herencia): Investigator[] {
  if (!herencia) return scenario.investigators;
  const previos = herencia.estadoAnterior.investigators;
  return scenario.investigators.map((base) => {
    const antes = previos[base.id];
    // Sólo hereda quien sobrevivió. Un investigador muerto sigue muerto: es la
    // regla más vieja del proyecto y el encadenado no la puede ablandar.
    if (!antes || antes.status !== 'alive') return base;
    return heredarInvestigador(antes, herencia.mesesTranscurridos);
  });
}

function activoDe(scenario: Scenario, herencia?: Herencia): InvestigatorId {
  const vivos = investigadoresDe(scenario, herencia).filter((i) => i.status === 'alive');
  // El activo de la aventura anterior, si sigue vivo; si no, el primero que sí.
  const preferido = herencia?.estadoAnterior.activeInvestigator;
  return vivos.find((i) => i.id === preferido)?.id ?? vivos[0]?.id ?? scenario.investigators[0]!.id;
}

/**
 * Siembra lo que el mundo recuerda: las consecuencias permanentes de la
 * aventura anterior y el desenlace al que se llegó.
 *
 * Van como eventos normales, después de la creación, para que el estado siga
 * siendo el pliegue del log y no haya un camino especial de «estado inicial
 * distinto». El pasado de la campaña anterior entra como pasado de ésta.
 */
async function sembrarHerencia(
  campaignId: string, scenario: Scenario, herencia: Herencia,
): Promise<void> {
  const previo = herencia.estadoAnterior;
  const eventos: GameEvent[] = [];
  let seq = 1;
  const nuevo = (type: GameEventType, payload: unknown): void => {
    eventos.push({
      seq: ++seq, id: id(), campaignId, session: 1, type, payload,
      actor: { type: 'system' },
      occurredAt: new Date().toISOString(),
      worldTime: scenario.startTime,
      schemaVer: 1,
    });
  };

  if (previo.ending) {
    nuevo('CAMPAIGN_CANON_ADDED', {
      id: id(),
      statement: `Lo anterior terminó así: ${previo.ending.title}.`,
      canon: { truth: 'CAMPAIGN_CANON', disclosure: 'PUBLIC', source: 'campaign' },
    });
  }

  // Sólo lo permanente y de alcance campaña o mundo. Lo de escena murió con
  // la escena, y arrastrarlo sería llenar la aventura nueva de ruido viejo.
  const perduran = previo.consequences.filter(
    (c) => c.permanent && (c.scope === 'campaign' || c.scope === 'world'),
  );
  for (const c of perduran) {
    nuevo('CONSEQUENCE_RECORDED', {
      id: id(),
      description: c.description,
      scope: c.scope,
      permanent: true,
      worldReminder: c.worldReminder,
      investigatorId: activoDe(scenario, herencia),
    });
  }

  if (eventos.length) await store().append(campaignId, eventos);
}

export async function loadState(
  campaignId: string,
): Promise<{ state: GameState; meta: CampaignIndexEntry }> {
  const meta = await store().getMeta(campaignId);
  if (!meta) throw new Error(`Campaña ${campaignId} no encontrada.`);
  const events = await store().readAll(campaignId);
  return { state: fold(events), meta };
}

// ─────────────────────────────────────────────────────────────────────────────
// TURNO
// ─────────────────────────────────────────────────────────────────────────────

interface TurnContext {
  rollsThisIntent: number;
  lastRollSucceeded: boolean;
  lastRollSkill: string | null;
  lastRollId: string | null;
  lastRollDegree: string | null;
  comparedItems: string[];
  exposureThisTurn: number;
}

/**
 * Un turno: recibe una intención, ejecuta herramientas validadas, narra, y
 * escribe al log de una sola vez al final. Si algo explota a mitad de camino,
 * no queda un estado a medias en disco.
 *
 * La carga y el guardado son asíncronos porque IndexedDB lo es; TODO lo de
 * adentro —tiradas, gates, reducers— sigue siendo síncrono. Lo asíncrono vive
 * en los bordes y no se filtra al reglamento.
 */
export class Turn {
  state: GameState;
  readonly meta: CampaignIndexEntry;
  private pending: GameEvent[] = [];
  private seqCursor: number;
  private ctx: TurnContext = {
    rollsThisIntent: 0,
    lastRollSucceeded: false,
    lastRollSkill: null,
    lastRollId: null,
    lastRollDegree: null,
    comparedItems: [],
    exposureThisTurn: 0,
  };

  private constructor(state: GameState, meta: CampaignIndexEntry) {
    this.state = state;
    this.meta = meta;
    this.seqCursor = state.headSeq;
  }

  /** Abre un turno cargando el log completo y plegándolo. */
  static async open(campaignId: string): Promise<Turn> {
    const { state, meta } = await loadState(campaignId);
    return new Turn(state, meta);
  }

  get investigator() {
    return this.state.investigators[this.state.activeInvestigator]!;
  }

  private emit(type: GameEventType, payload: unknown, actor: Actor = { type: 'keeper' }): GameEvent {
    const ev: GameEvent = {
      seq: ++this.seqCursor,
      id: id(),
      campaignId: this.state.campaignId,
      session: this.state.session,
      type,
      payload,
      actor,
      occurredAt: new Date().toISOString(),
      worldTime: this.state.world.time,
      schemaVer: 1,
    };
    this.pending.push(ev);
    this.state = apply(this.state, ev);
    return ev;
  }

  private reject(tool: string, args: unknown, reason: string): ToolOutcome {
    this.emit('KEEPER_PROPOSAL_REJECTED', { tool, args, reason }, { type: 'system' });
    return { ok: false, message: `RECHAZADO POR EL MOTOR: ${reason}` };
  }

  submitIntent(text: string, playerId: string) {
    this.emit('INTENT_SUBMITTED', { text, investigatorId: this.state.activeInvestigator },
      { type: 'player', playerId, investigatorId: this.state.activeInvestigator });
    this.ctx.rollsThisIntent = 0;
    this.ctx.comparedItems = [];
    this.ctx.exposureThisTurn = 0;
  }

  /** Las opciones se guardan en el log como etiquetas: es lo que vio el jugador. */
  narrate(text: string, options: Array<{ etiqueta: string }> = []) {
    this.emit('NARRATION_EMITTED', { text, options: options.map((o) => o.etiqueta) });
  }

  async commit(): Promise<void> {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    await store().append(this.state.campaignId, batch);
  }

  get pendingEvents(): readonly GameEvent[] {
    return this.pending;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FASE DE DESARROLLO — CoC 7e pp. 94-95, 167-169
  //
  // NO es una herramienta del Keeper. El modelo no participa: son reglas del
  // libro aplicadas sobre el registro de tiradas, y las decisiones que quedan
  // —qué hace el investigador con sus meses libres— las toma el jugador.
  //
  // Los dados salen de la MISMA cadena verificable que el resto de la partida.
  // Una mejora de habilidad se audita igual que una tirada de Descubrir: si no,
  // habría una parte del progreso que el jugador tendría que creer sin poder
  // comprobar, que es justo lo que este proyecto no quiere.
  // ───────────────────────────────────────────────────────────────────────────

  /** Lo que la fase encontraría ahora mismo, sin ejecutar nada. */
  developmentMarks(): Marca[] {
    const inv = this.investigator;
    return marcasDe(this.state, inv.id, inv.experience.lastDevelopmentSeq);
  }

  /** Un dado de N caras de la cadena determinista. */
  private rollDie(faces: number): { value: number; proof: { index: number; hmac: string } } {
    const index = this.state.rng.nextIndex;
    const { dice, hmac } = dieValues(this.meta.seed, index, 2);
    // Dos d10 combinados dan 0-99; se mapea al rango pedido. Alcanza para
    // 1D3, 1D6, 1D10 y 1D100 sin sesgo perceptible.
    const cruudo = dice[0]! * 10 + dice[1]!;
    this.emit('ROLL_EXECUTED', {
      roll: this.syntheticRoll(faces, cruudo, index, hmac),
    });
    return { value: (cruudo % faces) + 1, proof: { index, hmac } };
  }

  /**
   * Un `RollRecord` para las tiradas de la fase.
   *
   * Van al mismo registro que las de la partida a propósito: si estuvieran
   * aparte, el índice de la cadena se bifurcaría y la verificación contra la
   * semilla dejaría de cerrar.
   */
  private syntheticRoll(faces: number, crudo: number, index: number, hmac: string): RollRecord {
    return {
      id: id(),
      seq: this.state.rolls.length + 1,
      investigatorId: this.investigator.id,
      playerId: this.investigator.playerId,
      commitment: {
        reason: `fase de desarrollo — 1D${faces}`,
        skill: 'desarrollo' as SkillId,
        skillLabel: `1D${faces}`,
        baseValue: faces,
        difficulty: 'regular',
        modifiers: [],
        stakes: { onSuccess: '', onFailure: '' },
        committedAt: new Date().toISOString(),
      },
      execution: {
        dice: [crudo % 10, Math.floor(crudo / 10)],
        rawResult: (crudo % faces) + 1,
        // Un dado de desarrollo no tiene grado de éxito: la regla lo interpreta
        // después. Marcarlo como fracaso lo contaría mal en el propio marcado.
        degree: 'regular',
        thresholds: { regular: faces, hard: faces, extreme: faces },
        executedAt: new Date().toISOString(),
        proof: { index, hmac },
      },
      visibility: 'public',
      narratedIn: null,
    };
  }

  private changeSanity(delta: number, cause: string): number {
    const inv = this.investigator;
    const from = inv.derived.san;
    const to = clamp(from + delta, 0, maxCordura(inv));
    if (to === from) return 0;
    this.emit('STAT_CHANGED', { investigatorId: inv.id, stat: 'san', from, to, delta: to - from, cause });
    return to - from;
  }

  /**
   * Ejecuta la fase completa.
   *
   * `autoayuda` es la única decisión del jugador: qué aspecto del trasfondo
   * usa el investigador en sus meses libres, y si se apoya en su conexión
   * clave. Es la parte más interesante del libro y la que no se puede
   * automatizar sin vaciarla.
   */
  runDevelopmentPhase(opciones: {
    autoayuda?: { aspectId: string; usarConexionClave: boolean };
  } = {}): DevelopmentReport {
    const inv0 = this.investigator;
    const marcas = this.developmentMarks();
    const mejoras: DevelopmentReport['mejoras'] = [];
    let sanGanada = 0;

    // ── 1. Una comprobación por habilidad marcada ──────────────────────────
    for (const marca of marcas) {
      const antes = this.investigator.skills[marca.skill]?.base ?? 0;
      const check = this.rollDie(100).value;
      if (!mejora(antes, check)) {
        mejoras.push({ skill: marca.skill, label: marca.label, antes, despues: antes, check, gain: 0 });
        continue;
      }
      const gain = this.rollDie(10).value;
      const despues = antes + gain;
      this.emit('SKILL_IMPROVED', {
        investigatorId: inv0.id, skill: marca.skill, label: marca.label,
        from: antes, to: despues, check, gain,
        proof: { index: this.state.rng.nextIndex - 1, hmac: '' },
      });
      mejoras.push({ skill: marca.skill, label: marca.label, antes, despues, check, gain });

      // Llegar a 90% premia con Cordura (p. 94).
      if (alcanzaMaestria(antes, despues)) {
        let total = 0;
        for (let d = 0; d < DADOS_SAN_POR_MAESTRIA.cantidad; d++) {
          total += this.rollDie(DADOS_SAN_POR_MAESTRIA.caras).value;
        }
        sanGanada += this.changeSanity(total, `dominar ${marca.label} al ${despues}%`);
      }
    }

    // ── 2. Premio del Keeper, proporcional al peligro ──────────────────────
    const premio = premioDelKeeper(this.state);
    let premioTotal = 0;
    for (let d = 0; d < premio.dados; d++) premioTotal += this.rollDie(premio.caras).value;
    if (premioTotal > 0) sanGanada += this.changeSanity(premioTotal, `fin de la aventura: ${premio.razon}`);

    // ── 3. Auto-ayuda ──────────────────────────────────────────────────────
    let autoayuda: DevelopmentReport['autoayuda'] = null;
    if (opciones.autoayuda) {
      autoayuda = this.runSelfHelp(opciones.autoayuda);
      sanGanada += autoayuda.sanDelta;
    }

    const resumen =
      `${marcas.length} habilidad(es) comprobada(s), ` +
      `${mejoras.filter((m) => m.gain > 0).length} mejorada(s), ` +
      `${sanGanada >= 0 ? '+' : ''}${sanGanada} de Cordura.`;

    this.emit('DEVELOPMENT_PHASE_COMPLETED', {
      investigatorId: inv0.id,
      atRollSeq: this.state.rolls.length,
      skillsChecked: marcas.length,
      skillsImproved: mejoras.filter((m) => m.gain > 0).length,
      sanityGained: sanGanada,
      summary: resumen,
    });

    return {
      mejoras,
      premio: { ...premio, total: premioTotal },
      autoayuda,
      sanGanada,
      sanFinal: this.investigator.derived.san,
      maxSan: maxCordura(this.investigator),
      resumen,
    };
  }

  /**
   * Auto-ayuda (p. 169): tirada de Cordura contra el propio trasfondo.
   * Éxito: +1D6. Fallo: −1 y ese aspecto del trasfondo se revisa — el retiro
   * espiritual termina en pérdida de fe, las vacaciones familiares en ruptura.
   */
  private runSelfHelp(op: { aspectId: string; usarConexionClave: boolean }): SelfHelpResult {
    const inv = this.investigator;
    const aspecto = inv.backstory.aspects.find((a) => a.id === op.aspectId);
    if (!aspecto) {
      return { aspectId: op.aspectId, texto: '', exito: false, sanDelta: 0, tirada: 0,
        objetivo: 0, usoConexionClave: false, perdioConexionClave: false,
        nota: 'Ese aspecto del trasfondo no existe.' };
    }

    const usaClave = op.usarConexionClave && inv.backstory.keyConnection === op.aspectId;
    // La conexión clave da dado de bonificación: se tira dos veces y vale la
    // mejor. Acá "mejor" es la más baja, porque se tira POR DEBAJO de Cordura.
    const t1 = this.rollDie(100).value;
    const t2 = usaClave ? this.rollDie(100).value : null;
    const tirada = t2 === null ? t1 : Math.min(t1, t2);
    const objetivo = inv.derived.san;
    const exito = tirada <= objetivo;

    let sanDelta = 0;
    let perdioClave = false;

    if (exito) {
      let gana = 0;
      for (let d = 0; d < AUTOAYUDA.ganaDados.cantidad; d++) {
        gana += this.rollDie(AUTOAYUDA.ganaDados.caras).value;
      }
      sanDelta = this.changeSanity(gana, `auto-ayuda: ${aspecto.text.slice(0, 40)}`);
    } else {
      sanDelta = this.changeSanity(-AUTOAYUDA.pierdeSiFalla, 'auto-ayuda fallida');
      perdioClave = usaClave;
      this.emit('BACKSTORY_REVISED', {
        investigatorId: inv.id,
        aspectId: aspecto.id,
        from: aspecto.text,
        to: `${aspecto.text} — y eso se rompió en los meses que siguieron.`,
        reason: 'la auto-ayuda falló',
        lostKeyConnection: perdioClave,
      });
    }

    return {
      aspectId: aspecto.id, texto: aspecto.text, exito, sanDelta,
      tirada, objetivo, usoConexionClave: usaClave, perdioConexionClave: perdioClave,
      nota: exito
        ? 'Los meses sirvieron.'
        : 'No sirvieron, y algo del trasfondo quedó distinto.',
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EJECUCIÓN DE HERRAMIENTAS
  // ───────────────────────────────────────────────────────────────────────────

  executeTool(name: string, raw: Record<string, unknown>): ToolOutcome {
    try {
      switch (name) {
        case 'request_roll': return this.toolRequestRoll(raw);
        case 'apply_damage': return this.toolApplyDamage(raw);
        case 'apply_sanity_loss': return this.toolApplySanityLoss(raw);
        case 'apply_umbral_exposure': return this.toolApplyExposure(raw);
        case 'apply_stability_shift': return this.toolApplyStability(raw);
        case 'apply_condition': return this.toolApplyCondition(raw);
        case 'discover_property': return this.toolDiscoverProperty(raw);
        case 'add_clue': return this.toolAddClue(raw);
        case 'note_contradiction': return this.toolNoteContradiction(raw);
        case 'raise_question': return this.toolRaiseQuestion(raw);
        case 'propose_fact': return this.toolProposeFact(raw);
        case 'create_npc': return this.toolCreateNpc(raw);
        case 'change_npc_state': return this.toolChangeNpcState(raw);
        case 'use_item': return this.toolUseItem(raw);
        case 'reveal_document': return this.toolRevealDocument(raw);
        case 'transfer_item': return this.toolTransferItem(raw);
        case 'move_to_location': return this.toolMoveToLocation(raw);
        case 'advance_time': return this.toolAdvanceTime(raw);
        case 'record_consequence': return this.toolRecordConsequence(raw);
        case 'temporal_echo': return this.toolTemporalEcho(raw);
        case 'reach_ending': return this.toolReachEnding(raw);
        default:
          return this.reject(name, raw, `La herramienta "${name}" no existe.`);
      }
    } catch (err) {
      return this.reject(name, raw, `Error al ejecutar: ${(err as Error).message}`);
    }
  }

  // ── TIRADA ─────────────────────────────────────────────────────────────────

  private toolRequestRoll(raw: Record<string, unknown>): ToolOutcome {
    const skill = String(raw.skill ?? '');
    const difficultyRaw = String(raw.difficulty ?? 'regular');
    const reason = String(raw.reason ?? '');

    // Una dificultad mal escrita NO puede pasar en silencio. `meetsDifficulty`
    // compara contra un rango indefinido y da siempre falso: la tirada se
    // ejecuta, se registra, se audita, y falla pase lo que pase. Un ÉXITO
    // EXTREMO sale como fracaso y nada en la pantalla lo delata.
    // Pasó de verdad: `dificil` en vez de `hard` en el desenlace de la mirada.
    if (!['regular', 'hard', 'extreme'].includes(difficultyRaw)) {
      return this.reject('request_roll', raw,
        `Dificultad desconocida: «${difficultyRaw}». Las válidas son regular, hard y extreme.`);
    }
    const difficulty = difficultyRaw as Difficulty;

    if (this.ctx.rollsThisIntent >= 1) {
      return this.reject('request_roll', raw,
        'Ya se ejecutó una tirada para esta intención. Una tirada por intención. ' +
        'Para repetir hace falta la mecánica de Push, con su justificación y su costo agravado.');
    }

    const inv = this.investigator;
    if (inv.derived.hp <= 0) {
      return this.reject('request_roll', raw, 'El investigador está inconsciente o peor: no puede actuar.');
    }

    let baseValue: number;
    if (isCharacteristic(skill)) {
      baseValue = inv.characteristics[skill];
    } else if (inv.skills[skill]) {
      baseValue = inv.skills[skill]!.base;
    } else if (SKILL_BY_ID[skill]) {
      baseValue = SKILL_BY_ID[skill]!.defaultBase;
    } else {
      const available = Object.keys(inv.skills).join(', ');
      return this.reject('request_roll', raw,
        `"${skill}" no existe en la ficha. Habilidades disponibles: ${available}. Características: STR, CON, SIZ, DEX, APP, INT, POW, EDU.`);
    }

    // Modificadores propuestos por el Keeper.
    const modifiers: RollModifier[] = [];
    const bonus = Number(raw.bonus_dice ?? 0);
    const penalty = Number(raw.penalty_dice ?? 0);
    const modReason = String(raw.modifier_reason ?? '');
    if (bonus > 0) modifiers.push({ kind: 'bonus_die', count: clamp(bonus, 0, 2), reason: modReason || 'circunstancia favorable' });
    if (penalty > 0) modifiers.push({ kind: 'penalty_die', count: clamp(penalty, 0, 2), reason: modReason || 'circunstancia adversa' });

    // ★ El motor agrega la penalización por baja Estabilidad. El Keeper no
    //   tiene que acordarse: es una regla, no una decisión narrativa.
    const stabPenalty = stabilityPenaltyDice(inv.umbral, skill as SkillId | CharacteristicId);
    if (stabPenalty > 0) {
      modifiers.push({ kind: 'penalty_die', count: stabPenalty, reason: `Estabilidad ${inv.umbral.stability}/100` });
    }

    const stakes = {
      onSuccess: String(raw.stakes_success ?? ''),
      onFailure: String(raw.stakes_failure ?? ''),
    };

    // ── 1. COMPROMISO: se congela ANTES de tocar el RNG ──
    const rollId = id();
    this.emit('ROLL_REQUESTED', {
      rollId,
      investigatorId: inv.id,
      skill,
      skillLabel: labelFor(skill as SkillId | CharacteristicId),
      baseValue,
      difficulty,
      modifiers,
      reason,
      stakes,
      visibility: 'public',
    });

    // ── 2. EJECUCIÓN: el RNG del motor, jamás el modelo ──
    const { count, mode } = tensDiceNeeded(modifiers);
    const index = this.state.rng.nextIndex;
    const { dice, hmac } = dieValues(this.meta.seed, index, count + 1);
    const unitsDie = dice[0]!;
    const tensDice = dice.slice(1);
    const rawResult = combineD100(unitsDie, tensDice, mode);
    const degree = degreeFor(rawResult, baseValue);
    const success = meetsDifficulty(degree, difficulty);

    const record: RollRecord = {
      id: rollId,
      seq: this.state.rolls.length + 1,
      investigatorId: inv.id,
      playerId: inv.playerId,
      commitment: {
        reason,
        skill,
        skillLabel: labelFor(skill as SkillId | CharacteristicId),
        baseValue,
        difficulty,
        modifiers,
        stakes,
        committedAt: new Date().toISOString(),
      },
      execution: {
        dice,
        rawResult,
        degree,
        thresholds: thresholdsFor(baseValue),
        executedAt: new Date().toISOString(),
        proof: { index, hmac },
      },
      visibility: 'public',
      narratedIn: null,
    };

    this.emit('ROLL_EXECUTED', { roll: record });
    this.ctx.rollsThisIntent += 1;
    this.ctx.lastRollSucceeded = success;
    this.ctx.lastRollSkill = skill;
    this.ctx.lastRollId = rollId;
    this.ctx.lastRollDegree = degree;

    const t = thresholdsFor(baseValue);
    const modText = modifiers.length
      ? ` Modificadores: ${modifiers.map((m) => `${m.count} dado(s) de ${m.kind === 'bonus_die' ? 'bonificación' : 'penalización'} (${m.reason})`).join('; ')}.`
      : '';

    return {
      ok: true,
      // Misma forma que la del estado sanitizado: ver shared/protocol.ts
      emit: { kind: 'roll', data: toClientRoll(record) },
      message:
        `TIRADA EJECUTADA POR EL MOTOR — este resultado es definitivo y ya está en el registro inmutable.\n` +
        `Habilidad: ${record.commitment.skillLabel} ${baseValue}% · Dificultad ${DIFFICULTY_LABEL[difficulty]}\n` +
        `Umbrales: regular ≤${t.regular}, difícil ≤${t.hard}, extremo ≤${t.extreme}\n` +
        `D100 = ${rawResult} (dados: ${dice.join(', ')})${modText}\n` +
        `Grado: ${DEGREE_LABEL[degree]} — ${success ? 'SUPERA' : 'NO SUPERA'} la dificultad exigida.\n` +
        `Apuesta declarada: ${success ? stakes.onSuccess : stakes.onFailure}\n` +
        `Narrá esta consecuencia. No cambies el número, no lo suavices, no lo contradigas.`,
    };
  }

  // ── ESTADO DEL INVESTIGADOR ────────────────────────────────────────────────

  private toolApplyDamage(raw: Record<string, unknown>): ToolOutcome {
    const amount = Math.abs(Number(raw.amount ?? 0));
    const cause = String(raw.cause ?? '');
    if (amount === 0) return this.reject('apply_damage', raw, 'El daño debe ser mayor que cero.');

    const inv = this.investigator;
    const from = inv.derived.hp;
    const to = clamp(from - amount, -10, inv.derived.maxHp);
    this.emit('STAT_CHANGED', { investigatorId: inv.id, stat: 'hp', from, to, delta: to - from, cause });

    let extra = '';
    if (to <= 0 && from > 0) {
      const major = amount >= Math.floor(inv.derived.maxHp / 2);
      if (to <= -1 || (major && to <= 0)) {
        this.emit('INVESTIGATOR_DIED', { investigatorId: inv.id, cause });
        extra = ' EL INVESTIGADOR HA MUERTO. La muerte es permanente: no la deshagas, no la suavices, no la conviertas en desmayo. Narrá el final de esta vida.';
      } else {
        extra = ' El investigador queda inconsciente.';
      }
    }
    return { ok: true, message: `Daño aplicado. PV ${from} → ${to} de ${inv.derived.maxHp}.${extra}` };
  }

  private toolApplySanityLoss(raw: Record<string, unknown>): ToolOutcome {
    const base = Math.abs(Number(raw.amount ?? 0));
    const cause = String(raw.cause ?? '');
    const inv = this.investigator;

    // ★ El motor suma la pérdida extra por Exposición alta. Regla, no decisión.
    const extra = extraSanLossFromExposure(inv.umbral);
    const total = base + extra;

    const from = inv.derived.san;
    const to = clamp(from - total, 0, inv.derived.maxSan);
    this.emit('STAT_CHANGED', { investigatorId: inv.id, stat: 'san', from, to, delta: to - from, cause });

    const extraNote = extra > 0
      ? ` (${base} de la fuente + ${extra} extra porque su Exposición al Umbral es ${inv.umbral.exposure}: el horror tiene dónde agarrarse)`
      : '';
    let note = '';
    if (to === 0) note = ' SAN en 0: locura permanente. El investigador queda fuera de juego como personaje jugable.';
    else if (from - to >= 5) note = ' Pérdida de 5 o más en un golpe: corresponde una crisis de locura temporal.';

    return { ok: true, message: `Cordura ${from} → ${to} de ${inv.derived.maxSan}${extraNote}.${note}` };
  }

  private toolApplyExposure(raw: Record<string, unknown>): ToolOutcome {
    const amount = Math.abs(Number(raw.amount ?? 0));
    const cause = String(raw.cause ?? '');
    const source = String(raw.source ?? '').trim();
    const inv = this.investigator;

    // Sin fuente no hay manera de contar repeticiones, y sin contar
    // repeticiones vuelve la fuga: asomarse veinte veces al mismo aljibe daba
    // exposición completa las veinte. Se rechaza en vez de inventar una fuente
    // a partir de la prosa, que cambia de una vez a la otra y no agruparía.
    if (!source) {
      return this.reject('apply_umbral_exposure', raw,
        'Falta `source`: el identificador estable de DÓNDE viene el contacto ' +
        '(por ejemplo "fuente-principal" o "detalle:un-id"). Sin él no se pueden ' +
        'aplicar rendimientos decrecientes y repetir la misma acción rendiría siempre igual.');
    }

    const res = applyExposure(inv.umbral, amount, source);
    this.ctx.exposureThisTurn += res.applied;
    this.emit('UMBRAL_EXPOSURE', {
      investigatorId: inv.id, amount: res.applied, from: res.from, to: res.to, cause,
      source, amountBeforeDecay: res.beforeDecay,
    });

    if (res.applied === 0) {
      return {
        ok: true,
        message:
          `Exposición sin cambio: ${res.from} de 100. Es la vez ${res.timesBefore + 1} que ` +
          `«${source}» produce contacto, y esa fuente ya no aporta nada nuevo. ` +
          'No lo narres como que no pasó nada: narralo como que ya no le hace mella.',
      };
    }

    let msg = `Exposición al Umbral ${res.from} → ${res.to} de 100.`;
    if (res.applied < res.beforeDecay) {
      msg += ` (${res.beforeDecay} reducidos a ${res.applied}: «${source}» ya produjo contacto ${res.timesBefore} vez/veces.)`;
    }
    for (const t of res.newThresholds) {
      this.emit('THRESHOLD_CROSSED', { investigatorId: inv.id, threshold: t, atExposure: res.to });
      const info = thresholdInfo(t);
      msg += `\n★ UMBRAL CRUZADO — ${info.label}: ${info.description} Esto es irreversible y cambia lo que el investigador puede percibir a partir de ahora. Tenelo en cuenta al narrar.`;
    }
    return { ok: true, message: msg };
  }

  private toolApplyStability(raw: Record<string, unknown>): ToolOutcome {
    const amount = Number(raw.amount ?? 0);
    const cause = String(raw.cause ?? '');
    const inv = this.investigator;

    const res = amount < 0
      ? applyStabilityLoss(inv.umbral, amount)
      : applyStabilityRecovery(inv.umbral, amount);

    this.emit('STABILITY_SHIFT', {
      investigatorId: inv.id,
      amount: res.to - res.from,
      from: res.from, to: res.to, cause,
    });

    const penalty = stabilityPenaltyDice({ ...inv.umbral, stability: res.to }, 'descubrir');
    const note = penalty > 0
      ? ` A esta estabilidad, las tiradas que dependen de distinguir el presente de una visión reciben ${penalty} dado(s) de penalización. El motor los aplica solo.`
      : '';
    return { ok: true, message: `Estabilidad ${res.from} → ${res.to} de 100.${note}` };
  }

  private toolApplyCondition(raw: Record<string, unknown>): ToolOutcome {
    const inv = this.investigator;
    const condition: Condition = {
      id: id(),
      name: String(raw.name ?? ''),
      description: String(raw.description ?? ''),
      kind: String(raw.kind ?? 'status') as Condition['kind'],
      temporary: String(raw.temporary ?? 'true') === 'true',
      since: this.pending[this.pending.length - 1]?.id ?? 'inicio',
    };
    this.emit('CONDITION_APPLIED', { investigatorId: inv.id, condition });
    return { ok: true, message: `Condición aplicada: ${condition.name}.` };
  }

  // ── OBJETOS Y DESCUBRIMIENTO ───────────────────────────────────────────────

  private toolDiscoverProperty(raw: Record<string, unknown>): ToolOutcome {
    const itemId = String(raw.item_id ?? '');
    const propertyId = String(raw.property_id ?? '');
    const how = String(raw.how ?? '');
    const comparedWith = String(raw.compared_with ?? '').trim();
    if (comparedWith) this.ctx.comparedItems.push(comparedWith);

    const gate = canDiscoverProperty(this.state, itemId, propertyId, this.investigator.id, {
      rollSucceeded: this.ctx.lastRollSucceeded,
      rollSkill: this.ctx.lastRollSkill ?? undefined,
      comparedWith: this.ctx.comparedItems,
    });

    if (!gate.allowed) {
      return this.reject('discover_property', raw,
        `${gate.reason} No reveles esta propiedad. Narrá lo que el investigador SÍ puede percibir.`);
    }

    const item = this.state.items[itemId]!;
    const prop =
      item.hiddenProperties.find((p) => p.id === propertyId) ??
      item.conditionalProperties.find((p) => p.id === propertyId)!;

    this.emit('PROPERTY_DISCOVERED', {
      itemId, propertyId, description: prop.description, how,
      investigatorId: this.investigator.id,
    });

    return {
      ok: true,
      emit: { kind: 'property', data: { itemId, itemName: item.name, description: prop.description } },
      message:
        `Propiedad revelada en «${item.name}»: ${prop.description}\n` +
        `Narrá el descubrimiento con ese contenido exacto. No lo amplíes ni lo interpretes por el investigador.`,
    };
  }

  private toolTransferItem(raw: Record<string, unknown>): ToolOutcome {
    const itemId = String(raw.item_id ?? '');
    const to = String(raw.to ?? '');
    const item = this.state.items[itemId];
    if (!item) return this.reject('transfer_item', raw, `El objeto ${itemId} no existe.`);

    const dest = to === 'perdido' ? null : to;
    if (dest && !this.state.investigators[dest] && !this.state.npcs[dest] && !this.state.world.locations[dest]) {
      return this.reject('transfer_item', raw, `El destino "${to}" no es un investigador, NPC ni localización válida.`);
    }

    this.emit('ITEM_TRANSFERRED', {
      itemId, from: item.owner, to: dest,
      carried: String(raw.carried ?? 'false') === 'true',
      cause: String(raw.cause ?? ''),
    });
    return { ok: true, message: `«${item.name}» ahora está en: ${dest ?? 'perdido'}.` };
  }

  // ── TABLERO ────────────────────────────────────────────────────────────────

  private toolAddClue(raw: Record<string, unknown>): ToolOutcome {
    const clue: Clue = {
      id: id(),
      description: String(raw.description ?? ''),
      kind: String(raw.kind ?? 'physical') as Clue['kind'],
      discoveredBy: this.investigator.id,
      discoveredAt: this.pending[this.pending.length - 1]?.id ?? 'inicio',
      source: String(raw.source ?? ''),
      reliability: String(raw.reliability ?? 'unknown') as Clue['reliability'],
      reliabilityKnown: false,
      disclosure: 'PUBLIC',
    };
    if (!clue.description.trim()) {
      return this.reject('add_clue', raw, 'Una pista necesita descripción.');
    }
    this.emit('CLUE_DISCOVERED', { clue });
    return {
      ok: true,
      emit: { kind: 'clue', data: clue },
      message: `Pista agregada al tablero (${clue.kind}). El jugador NO ve su fiabilidad real.`,
    };
  }

  private toolNoteContradiction(raw: Record<string, unknown>): ToolOutcome {
    this.emit('CONTRADICTION_NOTED', {
      id: id(),
      description: String(raw.description ?? ''),
      between: String(raw.between ?? '').split('|').map((s) => s.trim()).filter(Boolean),
    });
    return { ok: true, message: 'Contradicción registrada en el tablero.' };
  }

  private toolRaiseQuestion(raw: Record<string, unknown>): ToolOutcome {
    const question = String(raw.question ?? '');
    if (this.state.board.questions.some((q) => q.question === question)) {
      return { ok: true, message: 'Esa pregunta ya estaba en el tablero.' };
    }
    this.emit('QUESTION_RAISED', { id: id(), question });
    return { ok: true, message: 'Pregunta abierta agregada.' };
  }

  private toolProposeFact(raw: Record<string, unknown>): ToolOutcome {
    const hypothesisId = String(raw.hypothesis_id ?? '');
    const h = this.state.board.hypotheses.find((x) => x.id === hypothesisId);
    if (!h) return this.reject('propose_fact', raw, `No existe la hipótesis ${hypothesisId}.`);

    const gate = canPromoteHypothesis(this.state, h);
    if (!gate.allowed) {
      return this.reject('propose_fact', raw,
        `${gate.reason} Sigue siendo una hipótesis. No la trates como verdad establecida en la narración.`);
    }
    this.emit('HYPOTHESIS_PROMOTED', {
      hypothesisId, factId: id(),
      statement: String(raw.statement ?? h.statement),
      supportingClues: h.supportingClues,
    });
    return { ok: true, message: 'Hipótesis promovida a hecho: la evidencia alcanzaba.' };
  }

  // ── MUNDO ──────────────────────────────────────────────────────────────────

  private toolCreateNpc(raw: Record<string, unknown>): ToolOutcome {
    const npcId = id();
    const npc: Npc = {
      id: npcId,
      name: String(raw.name ?? 'Desconocido'),
      // ★ El motor fuerza el nivel de canon. El modelo no puede elegirlo.
      canon: { truth: 'CAMPAIGN_CANON', disclosure: 'PUBLIC', source: 'campaign' },
      status: 'alive',
      description: String(raw.description ?? ''),
      motivation: String(raw.motivation ?? ''),
      fears: [String(raw.fears ?? '')].filter(Boolean),
      refusals: [],
      knowledge: [{
        id: id(),
        statement: String(raw.knows ?? ''),
        acquiredAt: 'previo',
        source: 'trasfondo',
        reliability: 'unknown',
      }],
      secrets: [],
      relationships: [],
      attitude: { [this.investigator.id]: 0 },
      patience: PACIENCIA_INICIAL,
      dodgedTopics: [],
      present: true,
      isCompanion: false,
      createdAt: this.pending[this.pending.length - 1]?.id ?? 'inicio',
    };
    this.emit('NPC_CREATED', { npc });
    this.emit('CAMPAIGN_CANON_ADDED', {
      id: id(),
      statement: `Existe ${npc.name}: ${npc.description}`,
      canon: npc.canon,
    });
    return {
      ok: true,
      message: `NPC creado con ID ${npcId}, registrado como CANON DE CAMPAÑA (no modifica el canon global). Usá ese ID en adelante.`,
    };
  }

  private toolChangeNpcState(raw: Record<string, unknown>): ToolOutcome {
    const npcId = String(raw.npc_id ?? '');
    const npc = this.state.npcs[npcId];
    if (!npc) {
      const ids = Object.values(this.state.npcs).map((n) => `${n.id} (${n.name})`).join(', ');
      return this.reject('change_npc_state', raw, `No existe el NPC ${npcId}. Existentes: ${ids || 'ninguno'}.`);
    }
    const changes: Partial<Npc> = {};
    const status = String(raw.status ?? 'unchanged');
    if (status !== 'unchanged') changes.status = status as Npc['status'];
    const present = String(raw.present ?? 'unchanged');
    if (present !== 'unchanged') changes.present = present === 'true';

    const delta = Number(raw.attitude_delta ?? 0);
    const paciencia = Number(raw.patience_delta ?? 0);
    const esquivado = String(raw.dodged_topic ?? '').trim();
    this.emit('NPC_STATE_CHANGED', {
      npcId, changes,
      attitudeDelta: delta !== 0 ? { investigatorId: this.investigator.id, delta } : undefined,
      patienceDelta: paciencia !== 0 ? paciencia : undefined,
      dodgedTopic: esquivado || undefined,
      cause: String(raw.cause ?? ''),
    });
    const now = this.state.npcs[npcId]!;
    return {
      ok: true,
      message:
        `${now.name}: estado ${now.status}, presente ${now.present}, ` +
        `actitud ${now.attitude[this.investigator.id] ?? 0}, paciencia ${now.patience}.`,
    };
  }

  /**
   * `ITEM_USED` existía en los eventos y en el reducer desde el principio, y
   * NINGUNA herramienta lo emitía: `usageCount` no subía nunca, así que toda
   * propiedad con condición de descubrimiento «usado N veces» era inalcanzable.
   * Lo encontró la segunda aventura, que es exactamente para lo que sirve una
   * segunda aventura.
   */
  private toolUseItem(raw: Record<string, unknown>): ToolOutcome {
    const itemId = String(raw.item_id ?? '');
    const item = this.state.items[itemId];
    if (!item) {
      return this.reject('use_item', raw, `No existe el objeto ${itemId}.`);
    }
    const times = clamp(Number(raw.times ?? 1), 1, 5);
    for (let n = 0; n < times; n++) this.emit('ITEM_USED', { itemId });
    const ahora = this.state.items[itemId]!;
    return { ok: true, message: `${ahora.name}: ${ahora.usageCount} uso(s) registrado(s).` };
  }

  private toolRevealDocument(raw: Record<string, unknown>): ToolOutcome {
    const docId = String(raw.document_id ?? '');
    const doc = this.state.documents[docId];
    if (!doc) {
      const ids = Object.values(this.state.documents).map((d) => `${d.id} (${d.title})`).join(', ');
      return this.reject('reveal_document', raw, `No existe el documento ${docId}. Documentos del escenario: ${ids || 'ninguno'}.`);
    }
    if (doc.obtainedAt) return { ok: true, message: 'El investigador ya tiene ese documento.' };

    this.emit('DOCUMENT_OBTAINED', { document: doc });
    return {
      ok: true,
      emit: { kind: 'document', data: doc },
      message:
        `Documento entregado: «${doc.title}». Su texto completo ya se le mostró al jugador, no lo repitas entero. ` +
        `Autenticidad: ${doc.authenticity}. Exactitud: ${doc.accuracy}. ` +
        `Si es "misinterpreted" o "false", el documento puede ser sincero y estar equivocado — no lo corrijas por el investigador.`,
    };
  }

  private toolMoveToLocation(raw: Record<string, unknown>): ToolOutcome {
    const locId = String(raw.location_id ?? '');
    const cur = this.state.world.locations[this.state.world.currentLocation];
    const dest = this.state.world.locations[locId];
    if (!dest) {
      const ids = Object.values(this.state.world.locations).map((l) => `${l.id} (${l.name})`).join(', ');
      return this.reject('move_to_location', raw, `No existe la localización ${locId}. Disponibles: ${ids}.`);
    }
    if (cur && !cur.connections.includes(locId)) {
      return this.reject('move_to_location', raw,
        `${dest.name} no está conectada con ${cur.name}. Conexiones: ${cur.connections.join(', ')}.`);
    }
    const minutes = Number(raw.minutes ?? 0);
    if (minutes > 0) this.advanceTimeBy(minutes, `traslado a ${dest.name}`);
    this.emit('LOCATION_ENTERED', { locationId: locId, investigatorId: this.investigator.id });
    // Las notas de dirección NO se devuelven acá: se las entrega el ensamblado
    // de contexto al Keeper IA. Meterlas en un tool_result las obligaría a
    // vivir en el estado, y por lo tanto a viajar al navegador.
    return {
      ok: true,
      message: `Ahora en: ${dest.name}. ${dest.description}\nObjetos presentes: ${dest.itemsPresent.join(', ') || 'ninguno registrado'}.`,
    };
  }

  private toolAdvanceTime(raw: Record<string, unknown>): ToolOutcome {
    const minutes = Number(raw.minutes ?? 0);
    if (minutes <= 0) return this.reject('advance_time', raw, 'El tiempo sólo avanza hacia adelante.');
    this.advanceTimeBy(minutes, String(raw.reason ?? ''));
    return { ok: true, message: `Ahora son las ${this.state.world.time.display}.` };
  }

  private advanceTimeBy(minutes: number, reason: string) {
    const from = this.state.world.time;
    const d = new Date(from.iso);
    d.setMinutes(d.getMinutes() + minutes);
    const iso = d.toISOString().slice(0, 19);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const to: WorldTime = { iso, precision: 'minute', display: `${hh}:${mm}` };
    this.emit('TIME_ADVANCED', { from, to, minutes, reason });
    this.recoverPatience(minutes);
  }

  /**
   * La paciencia vuelve con el tiempo del MUNDO, no con el del jugador.
   *
   * Es la diferencia entre un recurso y un temporizador: no se espera mirando
   * la pantalla, se recupera yendo a hacer otra cosa y volviendo más tarde.
   * Que sea lo mismo que haría cualquiera en la mesa es la señal de que la
   * mecánica está bien puesta.
   */
  private recoverPatience(minutes: number) {
    const puntos = Math.floor(minutes / RECUPERACION.minutosPorPunto);
    if (puntos <= 0) return;
    for (const npc of Object.values(this.state.npcs)) {
      if (npc.patience >= PACIENCIA_MAXIMA) continue;
      this.emit('NPC_STATE_CHANGED', {
        npcId: npc.id, changes: {},
        patienceDelta: puntos,
        cause: 'pasó el tiempo y se le fue el fastidio',
      });
    }
  }

  private toolRecordConsequence(raw: Record<string, unknown>): ToolOutcome {
    const description = String(raw.description ?? '');
    if (!description.trim()) return this.reject('record_consequence', raw, 'La consecuencia necesita descripción.');
    this.emit('CONSEQUENCE_RECORDED', {
      id: id(),
      description,
      scope: String(raw.scope ?? 'scene') as 'scene' | 'location' | 'campaign' | 'world',
      permanent: String(raw.permanent ?? 'false') === 'true',
      worldReminder: String(raw.world_reminder ?? description),
      investigatorId: this.investigator.id,
    });
    return {
      ok: true,
      message: 'Consecuencia registrada. Va a aparecer en tu contexto en todos los turnos futuros, incluso si este investigador muere.',
    };
  }

  private toolTemporalEcho(raw: Record<string, unknown>): ToolOutcome {
    const description = String(raw.description ?? '');
    this.emit('TEMPORAL_ECHO_RECEIVED', {
      temporalEventId: null, description, investigatorId: this.investigator.id,
    });
    const exp = this.toolApplyExposure({ amount: raw.exposure ?? 9, cause: `eco temporal: ${description}` });
    return {
      ok: true,
      message: `Eco temporal registrado. ${exp.message}\nRecordá: toda manifestación del Umbral tiene un costo o una limitación. No la uses para resolver la trama.`,
    };
  }

  private toolReachEnding(raw: Record<string, unknown>): ToolOutcome {
    if (this.state.ending) return { ok: false, message: 'La aventura ya tiene un final registrado.' };
    this.emit('ENDING_REACHED', {
      id: String(raw.ending_id ?? 'propio'),
      title: String(raw.title ?? 'Final'),
      text: String(raw.text ?? ''),
    });
    return { ok: true, message: 'Final registrado. La campaña queda cerrada; la semilla del RNG puede revelarse para auditoría.' };
  }

  // ── MUERTE Y CONTINUIDAD ───────────────────────────────────────────────────

  /** El mundo conserva todo. El investigador nuevo no hereda recuerdos ajenos. */
  introduceInvestigator(investigatorId: InvestigatorId, playerId: string) {
    const inv = this.state.investigators[investigatorId];
    if (!inv) throw new Error('Investigador inexistente.');
    this.emit('INVESTIGATOR_INTRODUCED', { investigatorId, inheritedKnowledge: [] },
      { type: 'player', playerId });
  }

  /** Push Roll: sólo sobre una tirada fallida, con justificación. */
  canPushLast(): boolean {
    const last = this.state.rolls[this.state.rolls.length - 1];
    if (!last) return false;
    return canPush(last.execution.degree, Boolean(last.push));
  }
}
