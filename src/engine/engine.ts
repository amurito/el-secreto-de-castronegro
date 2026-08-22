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
  Clue, Npc, Condition, MechanicalEffect, WorldTime, SkillId, CharacteristicId, Investigator,
  SuccessDegree,
} from '../shared/types.ts';
import { fold, apply } from './reducers.ts';
import { store, type CampaignIndexEntry } from './store.ts';
import { dieValues, damageDice, generateSeed, commitmentOf } from './rng.ts';
import { ARMAS, ARMA_POR_ID, dadosQuePide, type Arma } from '../rules/armas.ts';
import { resolverEnfrentamiento, danoDeAtaque } from '../rules/combate.ts';
import {
  combineD100, degreeFor, meetsDifficulty, tensDiceNeeded, thresholdsFor,
  DEGREE_LABEL, DIFFICULTY_LABEL, canPush,
} from '../rules/dice.ts';
import { isCharacteristic, labelFor, SKILL_BY_ID } from '../rules/skills.ts';
import {
  applyExposure, applyStabilityLoss, applyStabilityRecovery,
  stabilityPenaltyDice, extraSanLossFromExposure, thresholdInfo,
  extraExposureFromPermeability, permeabilityFromMinutes, exposicionTrasMeses,
} from '../rules/umbral.ts';
import { PACIENCIA_INICIAL, PACIENCIA_MAXIMA, RECUPERACION } from '../rules/social.config.ts';
import { STABILITY_RECOVERY, techoDeEstabilidad, EXPOSURE_THRESHOLDS } from '../rules/umbral.config.ts';
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
 *   EXPOSICIÓN AL UMBRAL → decae hacia un piso permanente, y los umbrales
 *   cruzados cruzan enteros. El canon (v0.9 §7) sólo fija que la exposición
 *   no baja con descanso DENTRO de una partida; entre aventuras, meses lejos
 *   del fenómeno SÍ la aflojan, pero nunca por debajo de una fracción del
 *   pico histórico (`peakExposure`, que en sí nunca baja) — ver
 *   `exposicionTrasMeses` en rules/umbral.ts. Cruzar un umbral sigue siendo
 *   irreversible: `thresholdsCrossed` no se toca acá.
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
  // La Exposición decae primero: el techo de Estabilidad se calcula sobre la
  // que queda DESPUÉS de los meses lejos del fenómeno, no sobre la de cierre
  // de la aventura anterior — menos contacto activo, más margen para anclarse.
  const exposicion = exposicionTrasMeses(inv.umbral.exposure, inv.umbral.peakExposure, meses);
  const techo = techoDeEstabilidad(exposicion);
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
      exposure: exposicion,
      // peakExposure y thresholdsCrossed intactos, a propósito: son la
      // memoria permanente, no el nivel actual.
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

/**
 * Bug real, reportado jugando: terminar Agua Quieta con un investigador
 * armado a mano y continuar a La Legua Perdida devolvía a Elena, sin jugar.
 *
 * La causa: esto recorría `scenario.investigators` —el elenco de la aventura
 * NUEVA, que son siempre Elena y Tomás— y buscaba en la campaña vieja a
 * alguien con el MISMO id que esos pregenerados. Un investigador propio tiene
 * un id que no coincide con ningún pregenerado de ninguna aventura (`inv-` +
 * nombre + timestamp), así que quedaba invisible para esta función enterita,
 * y `activoDe` —que sólo mira lo que esto devuelve— no tenía forma de
 * encontrarlo y caía en el primero de la lista: Elena, fresca.
 *
 * El arreglo: primero se heredan los DOS slots de siempre por coincidencia de
 * id (mismo comportamiento que había, y sigue sirviendo para Tomás de
 * reserva). Después se agrega, aparte, cualquiera de la campaña anterior que
 * siga vivo y no tenga slot —es decir, un investigador propio—, con la MISMA
 * herencia que recibiría un pregenerado. No importa si la aventura nueva lo
 * conoce: un investigador es genérico, no específico de la aventura que lo
 * vio nacer.
 */
function investigadoresDe(scenario: Scenario, herencia?: Herencia): Investigator[] {
  if (!herencia) return scenario.investigators;
  const previos = herencia.estadoAnterior.investigators;

  const porSlot = scenario.investigators.map((base) => {
    const antes = previos[base.id];
    // Sólo hereda quien sobrevivió. Un investigador muerto sigue muerto: es la
    // regla más vieja del proyecto y el encadenado no la puede ablandar.
    if (!antes || antes.status !== 'alive') return base;
    return heredarInvestigador(antes, herencia.mesesTranscurridos);
  });

  const idsDeSlot = new Set(scenario.investigators.map((i) => i.id));
  const sinSlot = Object.values(previos)
    .filter((i) => i.status === 'alive' && !idsDeSlot.has(i.id))
    .map((i) => heredarInvestigador(i, herencia.mesesTranscurridos));

  return [...porSlot, ...sinSlot];
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
        case 'resolve_attack': return this.toolResolveAttack(raw);
        case 'resolve_flee': return this.toolResolveFlee(raw);
        case 'resolve_maneuver': return this.toolResolveManeuver(raw);
        case 'apply_sanity_loss': return this.toolApplySanityLoss(raw);
        case 'apply_mythos_knowledge': return this.toolApplyMythos(raw);
        case 'apply_umbral_exposure': return this.toolApplyExposure(raw);
        case 'apply_stability_shift': return this.toolApplyStability(raw);
        case 'apply_condition': return this.toolApplyCondition(raw);
        case 'discover_property': return this.toolDiscoverProperty(raw);
        case 'add_clue': return this.toolAddClue(raw);
        case 'note_contradiction': return this.toolNoteContradiction(raw);
        case 'raise_question': return this.toolRaiseQuestion(raw);
        case 'note_player_knowledge': return this.toolNotePlayerKnowledge(raw);
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
    if (inv.derived.hp <= 0 || inv.status !== 'alive') {
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

    // ★ Fobias y manías activas también se aplican solas. `mechanicalEffect`
    //   está en el tipo desde el principio y hasta acá nada lo leía: una
    //   condición que sólo cambiaba la prosa no era una fobia, era una
    //   etiqueta. Positivo penaliza, negativo bonifica (ver `MechanicalEffect`).
    for (const cond of inv.conditions) {
      const mod = cond.mechanicalEffect?.skillModifiers?.find((m) => m.skill === skill);
      if (!mod || mod.dice === 0) continue;
      const count = clamp(Math.abs(mod.dice), 0, 2);
      modifiers.push({
        kind: mod.dice > 0 ? 'penalty_die' : 'bonus_die',
        count,
        reason: cond.name,
      });
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

  // ── COMBATE ────────────────────────────────────────────────────────────────

  /**
   * Una tirada que el motor fuerza, sin pasar por `toolRequestRoll` — por
   * eso no cuenta contra el límite de «una tirada por intención». La usan
   * las tiradas del rival en una tirada enfrentada, y las tiradas forzadas
   * del propio investigador que no pidió el modelo (la CON de una Herida
   * Grave, el contraataque contra un segundo agresor en la misma ronda).
   *
   * Va a la MISMA cadena verificable y al mismo registro público que
   * cualquier otra: en una tirada enfrentada el motor tira por las dos
   * partes, y si sólo una quedara registrada no habría manera de comprobar
   * que no le regaló el resultado a la que le convenía. El jugador ve los
   * dos dados, como en la mesa.
   */
  private tiradaInterna(
    actorId: string, actorName: string, etiqueta: string, valor: number, razon: string,
    modifiers: RollModifier[] = [],
  ) {
    const rollId = id();
    const index = this.state.rng.nextIndex;
    const stakes = { onSuccess: '', onFailure: '' };
    this.emit('ROLL_REQUESTED', {
      rollId, investigatorId: actorId, skill: etiqueta, skillLabel: `${actorName}: ${etiqueta}`,
      baseValue: valor, difficulty: 'regular' as Difficulty, modifiers,
      reason: razon, stakes, visibility: 'public',
    });

    const { count, mode } = tensDiceNeeded(modifiers);
    const { dice, hmac } = dieValues(this.meta.seed, index, count + 1);
    const rawResult = combineD100(dice[0]!, dice.slice(1), mode);
    const degree = degreeFor(rawResult, valor);
    const record: RollRecord = {
      id: rollId,
      seq: this.state.rolls.length + 1,
      investigatorId: actorId,
      playerId: null,
      commitment: {
        reason: razon, skill: etiqueta, skillLabel: `${actorName}: ${etiqueta}`,
        baseValue: valor, difficulty: 'regular', modifiers, stakes,
        committedAt: new Date().toISOString(),
      },
      execution: {
        dice, rawResult, degree, thresholds: thresholdsFor(valor),
        executedAt: new Date().toISOString(), proof: { index, hmac },
      },
      visibility: 'public',
      narratedIn: null,
    };
    this.emit('ROLL_EXECUTED', { roll: record });
    return { degree, rawResult };
  }

  /** Base de una habilidad o característica del investigador activo. */
  private valorHabilidadInv(skill: string): number {
    const inv = this.investigator;
    if (isCharacteristic(skill)) return inv.characteristics[skill];
    return inv.skills[skill]?.base ?? SKILL_BY_ID[skill]?.defaultBase ?? 0;
  }

  /**
   * Los dados de daño de un golpe que ya entró. Salen de la cadena, con el
   * índice de la tirada que produjo el golpe y una ranura por tipo de dado
   * —ver `damageDice`— para que el arma y la corpulencia no saquen el mismo
   * número.
   */
  private tirarDano(arma: Arma, bonificacion: string, index: number, extremo: boolean) {
    const pedidos = dadosQuePide(arma, bonificacion);
    const dadosArma = damageDice(
      this.meta.seed, index, 'arma', arma.dano.caras, arma.dano.cantidad).dice;
    const bon = pedidos[1];
    const dadosBon = bon
      ? damageDice(this.meta.seed, index, 'bonif', bon.caras, bon.cantidad).dice
      : [];
    return danoDeAtaque(arma, bonificacion, dadosArma, dadosBon, extremo);
  }

  /** Aplica el daño a un NPC y arma el cierre del mensaje. Lo usan el ataque
   * principal y los intercambios extra del mismo asalto: es la misma
   * consecuencia, sea quien sea el que la produjo. */
  private danarNpc(npc: Npc, total: number, cause: string): string {
    const c = npc.combate!;
    const desde = c.hp;
    const hasta = clamp(desde - total, 0, c.maxHp);
    const heridaGrave = total >= Math.floor(c.maxHp / 2);
    this.emit('NPC_DAMAGED', { npcId: npc.id, from: desde, to: hasta, heridaGrave, cause });
    const cierre = hasta <= 0
      ? ` ${npc.name} deja de pelear. Si muere, si queda tirado o si alguien lo levanta después ` +
        'lo decidís narrando: el motor sólo dice que no puede seguir.'
      : heridaGrave
        ? ` Es una herida grave: ${npc.name} sigue en pie, pero eso se nota en todo lo que haga después.`
        : '';
    return `${npc.name}: ${desde} → ${hasta} PV.${cierre}`;
  }

  /**
   * El ataque de UN rival contra el investigador, fuera del intercambio
   * declarado. La usan dos casos: los rivales presentes más rápidos que el
   * investigador —les toca antes de que el golpe declarado siquiera
   * ocurra— y los más lentos —les toca después—. Es lo que hace que
   * enfrentar a más de uno sea de verdad más peligroso: cada rival en el
   * cuarto pelea, no sólo el que se eligió como blanco.
   *
   * Ninguna maniobra (derribado/agarrado) se aplica acá: esas marcas son
   * del intercambio principal. Extenderlas a los rivales de fondo queda
   * para cuando haga falta, y hoy no hace falta.
   */
  private ataqueDeNpcContraInvestigador(
    atacante: Npc, armaInvId: string, modificadores: RollModifier[] = [],
  ): string {
    const inv = this.investigator;
    if (inv.derived.hp <= 0 || inv.status !== 'alive') return '';
    const c = atacante.combate!;
    const arma = ARMA_POR_ID[c.armaId] ?? ARMA_POR_ID['desarmado']!;

    const ataque = this.tiradaInterna(
      atacante.id, atacante.name, 'Pelea', c.pelea, `atacar a ${inv.name}`, modificadores);
    const indice = this.state.rng.nextIndex - 1;
    const defensa = this.tiradaInterna(
      inv.id, inv.name, 'Pelea', this.valorHabilidadInv('pelea'), 'defenderse');

    const fallo = resolverEnfrentamiento({ atacante: ataque.degree, defensor: defensa.degree, defensa: 'contraataca' });
    const encabezado =
      `${atacante.name} ataca a ${inv.name} con ${arma.nombre.toLowerCase()}. ` +
      `${DEGREE_LABEL[ataque.degree]} contra ${DEGREE_LABEL[defensa.degree]}. ${fallo.razon}`;

    if (fallo.golpea === null) return `${encabezado}\nNadie sale lastimado en este cruce.`;
    if (fallo.golpea === 'defensor') {
      const dano = this.tirarDano(arma, c.bonificacionDano, indice, fallo.extremo);
      const golpe = this.toolApplyDamage({ amount: dano.total, cause: `${arma.nombre} de ${atacante.name}` });
      return `${encabezado}\n${dano.total} de daño (${dano.detalle}). ${golpe.message}`;
    }
    const armaInv = ARMA_POR_ID[armaInvId] ?? ARMA_POR_ID['desarmado']!;
    const dano = this.tirarDano(armaInv, inv.derived.damageBonus, indice, false);
    return `${encabezado}\n${inv.name} lo contraataca: ${dano.total} de daño (${dano.detalle}). ` +
      `${this.danarNpc(atacante, dano.total, `${armaInv.nombre} de ${inv.name}`)}`;
  }

  /**
   * Quién pelea en el cuarto, aparte del blanco declarado: cualquier
   * presente con estadísticas de combate y PV, sin importar si el
   * investigador lo eligió como blanco. Separados en más rápidos y más
   * lentos que el investigador (p. 102, orden de ataque por DES): a los
   * primeros les toca ANTES del intercambio principal —pueden interrumpirlo—
   * y a los segundos, después.
   */
  private ordenDeAsalto(excluirId: string): { masRapidos: Npc[]; masLentos: Npc[] } {
    const dexInv = this.investigator.characteristics.DEX;
    const otros = Object.values(this.state.npcs).filter((n) =>
      n.id !== excluirId && n.combate && n.combate.hp > 0 && n.present && n.status !== 'dead');
    const porDex = (a: Npc, b: Npc) => (b.combate!.dex ?? 0) - (a.combate!.dex ?? 0);
    return {
      masRapidos: otros.filter((n) => (n.combate!.dex ?? 0) > dexInv).sort(porDex),
      masLentos: otros.filter((n) => (n.combate!.dex ?? 0) <= dexInv).sort(porDex),
    };
  }

  /**
   * Un asalto entero: el investigador ataca, el otro se defiende, y el daño
   * cae donde corresponda. Si hay más gente peleando en el cuarto, también
   * actúa, en el orden que le toque por DES.
   *
   * Es una sola herramienta y no tres («tirar», «comparar», «aplicar») a
   * propósito. Una tirada enfrentada que se pueda pedir a pedazos es una
   * tirada que se puede abandonar a la mitad cuando el primer dado sale mal,
   * y ese es exactamente el tipo de cosa que este motor existe para impedir.
   */
  private toolResolveAttack(raw: Record<string, unknown>): ToolOutcome {
    const npcId = String(raw.npc_id ?? '').trim();
    const armaId = String(raw.weapon_id ?? 'desarmado').trim();
    const razon = String(raw.reason ?? '').trim();

    const npc = this.state.npcs[npcId];
    if (!npc) return this.reject('resolve_attack', raw, `El personaje «${npcId}» no existe.`);
    if (!npc.combate) {
      return this.reject('resolve_attack', raw,
        `${npc.name} no tiene estadísticas de combate. Esta aventura no contempla pelear con ` +
        'esta persona: no le inventes puntos de vida. Narrá el intento y su consecuencia social, ' +
        'que es lo que la escena sí puede resolver.');
    }
    if (!npc.present || npc.status === 'dead') {
      return this.reject('resolve_attack', raw, `${npc.name} no está acá para pelear.`);
    }
    if (npc.combate.hp <= 0) {
      return this.reject('resolve_attack', raw,
        `${npc.name} ya está fuera de combate. Ensañarse no es una tirada: es una decisión, y ` +
        'se narra como tal.');
    }

    const arma = ARMA_POR_ID[armaId];
    if (!arma) {
      return this.reject('resolve_attack', raw,
        `No existe el arma «${armaId}». Disponibles: ${ARMAS.map((a) => a.id).join(', ')}.`);
    }

    const bloques: string[] = [];

    // ── 0. El resto del cuarto, si hay más de dos peleando ──
    const { masRapidos, masLentos } = this.ordenDeAsalto(npc.id);
    for (const otro of masRapidos) {
      const texto = this.ataqueDeNpcContraInvestigador(otro, armaId);
      if (texto) bloques.push(texto);
    }

    if (this.investigator.derived.hp <= 0 || this.investigator.status !== 'alive') {
      return {
        ok: true,
        message: `${bloques.join('\n\n')}\n\nMás rápido no le llegó a atacar a ${npc.name}: ya no está en pie.`,
      };
    }

    const inv = this.investigator;
    const defensa = npc.combate.defensaPorDefecto;

    // ── Modificadores de armas de fuego (sólo si el arma es de fuego) ──
    // «Apuntando» confía en que ya se declaró el turno anterior — el motor
    // no tiene un estado de «apuntando desde cuándo», así que lo toma como
    // viene. Es una simplificación conocida, no un error.
    let bonusFuego = 0, penaltyFuego = 0;
    const notasFuego: string[] = [];
    if (arma.habilidad === 'armas_fuego') {
      if (String(raw.apuntando ?? 'false') === 'true') { bonusFuego++; notasFuego.push('apuntando'); }
      if (String(raw.punto_blanco ?? 'false') === 'true') { bonusFuego++; notasFuego.push('a quemarropa'); }
      if (String(raw.cubierto ?? 'false') === 'true') { penaltyFuego++; notasFuego.push('el blanco se cubre'); }
      if (String(raw.blanco_movil ?? 'false') === 'true') { penaltyFuego++; notasFuego.push('el blanco se mueve'); }
    }

    // Un derribo previo (de una maniobra) da un dado de bonificación a quien
    // ataque después, y se gasta con este golpe.
    const derribado = Boolean(npc.combate.derribado);
    if (derribado) {
      bonusFuego++; // mismo contador: bonus y penalty ya se netean en request_roll
      notasFuego.push(`${npc.name} está en el piso`);
      this.emit('NPC_COMBATE_CHANGED', { npcId: npc.id, changes: { derribado: false }, cause: 'se levanta o se defiende como puede' });
    }

    // ── 1. El investigador ataca ──
    const ataque = this.toolRequestRoll({
      skill: arma.habilidad,
      difficulty: 'regular',
      reason: razon || `atacar a ${npc.name} con ${arma.nombre.toLowerCase()}`,
      stakes_success: 'el golpe llega',
      stakes_failure: 'el golpe no llega',
      bonus_dice: bonusFuego,
      penalty_dice: penaltyFuego,
      modifier_reason: notasFuego.join(', '),
    });
    if (!ataque.ok) return ataque;
    const gradoAtacante = this.ctx.lastRollDegree as SuccessDegree;
    const indiceAtaque = this.state.rng.nextIndex - 1;

    // ── 2. El otro se defiende ── (agarrado penaliza su propia tirada)
    const npcAhora = this.state.npcs[npc.id]!;
    const agarrado = Boolean(npcAhora.combate!.agarrado);
    const modDefensa: RollModifier[] = agarrado
      ? [{ kind: 'penalty_die', count: 1, reason: 'está sujeto' }] : [];
    if (agarrado) {
      this.emit('NPC_COMBATE_CHANGED', { npcId: npc.id, changes: { agarrado: false }, cause: 'se zafa como puede' });
    }
    const valorDefensa = defensa === 'esquiva' ? npc.combate.esquivar : npc.combate.pelea;
    const defensor = this.tiradaInterna(
      npc.id, npc.name,
      defensa === 'esquiva' ? 'Esquivar' : 'Pelea',
      valorDefensa,
      defensa === 'esquiva' ? 'quitarse de en medio' : 'devolver el golpe',
      modDefensa,
    );
    const indiceDefensa = this.state.rng.nextIndex - 1;

    // ── 3. Quién le pega a quién ──
    const fallo = resolverEnfrentamiento({
      atacante: gradoAtacante, defensor: defensor.degree, defensa,
    });

    const encabezado =
      `ASALTO — ${inv.name} con ${arma.nombre.toLowerCase()} contra ${npc.name}, que ` +
      `${defensa === 'esquiva' ? 'intenta esquivar' : 'devuelve el golpe'}.\n` +
      `${DEGREE_LABEL[gradoAtacante]} contra ${DEGREE_LABEL[defensor.degree]}. ${fallo.razon}`;

    if (fallo.golpea === null) {
      bloques.push(`${encabezado}\nNadie sale lastimado. Narralo como el intercambio que fue, no como una pausa.`);
    } else if (fallo.golpea === 'defensor') {
      const dano = this.tirarDano(arma, inv.derived.damageBonus, indiceAtaque, fallo.extremo);
      bloques.push(
        `${encabezado}\n${fallo.extremo ? (arma.empala ? 'ENTRÓ DE LLENO: ' : 'GOLPE CERTERO: ') : ''}` +
        `${dano.total} de daño (${dano.detalle}). ${this.danarNpc(npc, dano.total, `${arma.nombre} de ${inv.name}`)}`,
      );
    } else {
      // El contraataque: le pega a quien empezó, con el arma del NPC.
      const armaNpc = ARMA_POR_ID[npc.combate.armaId] ?? ARMA_POR_ID['desarmado']!;
      const dano = this.tirarDano(armaNpc, npc.combate.bonificacionDano, indiceDefensa, false);
      const golpe = this.toolApplyDamage({
        amount: dano.total, cause: `${armaNpc.nombre} de ${npc.name}`,
      });
      bloques.push(
        `${encabezado}\n${npc.name} se la devuelve con ${armaNpc.nombre.toLowerCase()}: ` +
        `${dano.total} de daño (${dano.detalle}).\n${golpe.message}`,
      );
    }

    // ── 4. El resto del cuarto que era más lento ──
    for (const otro of masLentos) {
      const texto = this.ataqueDeNpcContraInvestigador(otro, armaId);
      if (texto) bloques.push(texto);
    }

    return { ok: true, message: bloques.join('\n\n') };
  }

  /**
   * Salir de una pelea a mitad de asalto. El manual no da vuelta de esquivar
   * gratis: irse cuesta el turno entero (no se ataca) y cada rival presente
   * que todavía pueda pelear se lleva un golpe de oportunidad, con ventaja,
   * porque quien huye no se está defendiendo. Es la decisión difícil real:
   * a veces sale más caro que quedarse a terminar.
   */
  private toolResolveFlee(raw: Record<string, unknown>): ToolOutcome {
    const inv = this.investigator;
    const armaId = String(raw.weapon_id ?? 'desarmado').trim();
    const hostiles = Object.values(this.state.npcs).filter((n) =>
      n.combate && n.combate.hp > 0 && n.present && n.status !== 'dead');

    if (hostiles.length === 0) {
      return { ok: true, message: `${inv.name} se retira. No hay nadie peleando que se lo impida.` };
    }

    const bonusPorHuir: RollModifier[] = [{ kind: 'bonus_die', count: 1, reason: 'le da la espalda' }];
    const bloques = [`${inv.name} intenta salir de la pelea, dándole la espalda a quien siga en pie.`];
    for (const h of hostiles) {
      const texto = this.ataqueDeNpcContraInvestigador(h, armaId, bonusPorHuir);
      if (texto) bloques.push(texto);
    }

    const logro = this.investigator.derived.hp > 0 && this.investigator.status === 'alive';
    bloques.push(logro
      ? `${inv.name} logra salir.`
      : `${inv.name} no llega a irse.`);
    return { ok: true, message: bloques.join('\n\n') };
  }

  /**
   * Maniobras de combate (p. 105): desarmar, derribar, sujetar. Se resuelven
   * como un Contraataque —tirada enfrentada, Pelea contra Pelea— pero en vez
   * de hacer daño, si la maniobra gana, aplica su efecto. Si el que se
   * defiende gana, no maniobra nada: conecta un golpe normal, con su arma,
   * igual que cualquier Contraataque exitoso.
   *
   * La Corpulencia decide si es posible antes de tirar nada: con 3 puntos o
   * más de diferencia en contra, ni se intenta.
   */
  private toolResolveManeuver(raw: Record<string, unknown>): ToolOutcome {
    const npcId = String(raw.npc_id ?? '').trim();
    const tipo = String(raw.type ?? '').trim();
    const razon = String(raw.reason ?? '').trim();

    if (!['desarmar', 'derribar', 'sujetar'].includes(tipo)) {
      return this.reject('resolve_maneuver', raw, 'El tipo tiene que ser "desarmar", "derribar" o "sujetar".');
    }

    const npc = this.state.npcs[npcId];
    if (!npc) return this.reject('resolve_maneuver', raw, `El personaje «${npcId}» no existe.`);
    if (!npc.combate) {
      return this.reject('resolve_maneuver', raw, `${npc.name} no tiene estadísticas de combate: no hay con qué forcejear.`);
    }
    if (!npc.present || npc.status === 'dead') {
      return this.reject('resolve_maneuver', raw, `${npc.name} no está acá.`);
    }
    if (npc.combate.hp <= 0) {
      return this.reject('resolve_maneuver', raw, `${npc.name} ya está fuera de combate.`);
    }

    const inv = this.investigator;
    const buildInv = inv.derived.build;
    const buildNpc = npc.combate.build ?? 0;
    const diff = buildNpc - buildInv;
    if (diff >= 3) {
      return this.reject('resolve_maneuver', raw,
        `${npc.name} es demasiado más grande: con 3 o más puntos de diferencia en Corpulencia, ` +
        'la maniobra es imposible. No la ofrezcas como opción.');
    }

    const bonus = diff < 0 ? Math.min(2, -diff) : 0;
    const penalty = diff > 0 ? Math.min(2, diff) : 0;

    const ataque = this.toolRequestRoll({
      skill: 'pelea',
      difficulty: 'regular',
      reason: razon || `${tipo} a ${npc.name}`,
      stakes_success: 'la maniobra funciona',
      stakes_failure: 'no funciona, y queda expuesto',
      bonus_dice: bonus,
      penalty_dice: penalty,
      modifier_reason: diff !== 0 ? `diferencia de corpulencia (${diff > 0 ? npc.name : inv.name} es más grande)` : '',
    });
    if (!ataque.ok) return ataque;
    const gradoInv = this.ctx.lastRollDegree as SuccessDegree;

    const defensor = this.tiradaInterna(npc.id, npc.name, 'Pelea', npc.combate.pelea, 'resistir la maniobra');
    const indiceDefensa = this.state.rng.nextIndex - 1;

    const fallo = resolverEnfrentamiento({ atacante: gradoInv, defensor: defensor.degree, defensa: 'contraataca' });
    const encabezado =
      `MANIOBRA — ${inv.name} intenta ${tipo} a ${npc.name}.\n` +
      `${DEGREE_LABEL[gradoInv]} contra ${DEGREE_LABEL[defensor.degree]}. ${fallo.razon}`;

    if (fallo.golpea === null) {
      return { ok: true, message: `${encabezado}\nNo pasa nada: ni la maniobra ni un golpe.` };
    }

    if (fallo.golpea === 'atacante') {
      // Se defendió mejor de lo que forcejearon: conecta un golpe normal.
      const armaNpc = ARMA_POR_ID[npc.combate.armaId] ?? ARMA_POR_ID['desarmado']!;
      const dano = this.tirarDano(armaNpc, npc.combate.bonificacionDano, indiceDefensa, false);
      const golpe = this.toolApplyDamage({ amount: dano.total, cause: `${armaNpc.nombre} de ${npc.name}, al resistir la maniobra` });
      return {
        ok: true,
        message: `${encabezado}\nLa maniobra falla y ${npc.name} conecta: ${dano.total} de daño (${dano.detalle}).\n${golpe.message}`,
      };
    }

    // La maniobra funciona.
    if (tipo === 'desarmar') {
      this.emit('NPC_COMBATE_CHANGED', {
        npcId: npc.id, changes: { armaId: 'desarmado' }, cause: `desarmado por ${inv.name}`,
      });
      return { ok: true, message: `${encabezado}\nLe vuela el arma de la mano. Ahora pelea desarmado, hasta que la recupere.` };
    }
    if (tipo === 'derribar') {
      this.emit('NPC_COMBATE_CHANGED', {
        npcId: npc.id, changes: { derribado: true }, cause: `derribado por ${inv.name}`,
      });
      return { ok: true, message: `${encabezado}\nQueda en el piso. El próximo golpe que reciba tiene ventaja.` };
    }
    // sujetar
    this.emit('NPC_COMBATE_CHANGED', {
      npcId: npc.id, changes: { agarrado: true }, cause: `sujeto por ${inv.name}`,
    });
    return { ok: true, message: `${encabezado}\nQueda sujeto: su próximo intento de pelear o de escapar sale con desventaja.` };
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
    const major = amount >= Math.floor(inv.derived.maxHp / 2);

    let extra = '';
    if (to <= 0 && from > 0) {
      if (to <= -1 || major) {
        this.emit('INVESTIGATOR_DIED', { investigatorId: inv.id, cause });
        extra = ' EL INVESTIGADOR HA MUERTO. La muerte es permanente: no la deshagas, no la suavices, no la conviertas en desmayo. Narrá el final de esta vida.';
      } else {
        extra = ' El investigador queda inconsciente.';
      }
    } else if (to > 0 && major) {
      // HERIDA GRAVE (p. 119): perder la mitad o más de los PV MÁXIMOS de un
      // solo golpe obliga a tirar CON, aunque queden PV. Antes esto sólo se
      // narraba como una frase suelta cuando el golpe además tumbaba a 0; la
      // regla real no depende de llegar a 0, depende de CUÁNTO pegó de una.
      const con = this.tiradaInterna(
        inv.id, inv.name, 'CON (herida grave)', inv.characteristics.CON,
        'no perder el conocimiento por la fuerza del golpe',
      );
      if (!meetsDifficulty(con.degree, 'regular')) {
        this.emit('INVESTIGATOR_UNCONSCIOUS', {
          investigatorId: inv.id,
          cause: `herida grave (${amount} de ${inv.derived.maxHp} PV de un golpe): ${cause}`,
        });
        extra = ' HERIDA GRAVE: falló la tirada de CON y queda inconsciente, aunque le quedan PV. ' +
          'No puede actuar hasta que algo lo reanime — el juego todavía no tiene esa herramienta, así ' +
          'que tratalo con el mismo peso que quedar fuera de combate.';
      } else {
        extra = ' Herida grave: el golpe fue de la mitad o más de sus PV máximos, pero la CON aguanta y sigue consciente.';
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

    // CoC 7e p. 166: cinco o más puntos de Cordura en un solo golpe es una
    // crisis de locura temporal, automática. En modo IA el Keeper podía
    // narrarla y olvidarse de aplicarla; en modo motor no hay nadie que la
    // note si el motor no la aplica. Se aplica sola, igual que ★ arriba.
    if (to === 0 && from > 0) {
      this.emit('INVESTIGATOR_WENT_INSANE', {
        investigatorId: inv.id,
        cause: `Cordura en 0. ${cause}`,
      });
      note = ' CORDURA EN 0: LOCURA INDEFINIDA. El investigador queda fuera de juego como personaje jugable — ' +
        'es el mismo cierre que la muerte, aunque no lo sea. No lo deshagas, no lo suavices.';
    } else if (from - to >= 5) {
      // Si quien pidió la pérdida declaró una fobia o manía concreta, se
      // lleva esa en vez de la genérica. El motor decide SI cruza el piso
      // —la Exposición alta suma de más y quien pide la pérdida no puede
      // saber cuánto de antemano— pero QUÉ se lleva puede venir declarado.
      const nombre = String(raw.crisis_name ?? '').trim() || 'Crisis de locura temporal';
      const descripcion = String(raw.crisis_description ?? '').trim()
        || `Perdió ${from - to} puntos de Cordura de golpe: ${cause}. La crisis dura hasta el final de la ` +
           'escena, y lo que haga durante ella no es enteramente decisión suya.';
      const tipo = String(raw.crisis_kind ?? 'mental') as Condition['kind'];
      const skillModifiers: NonNullable<MechanicalEffect['skillModifiers']> = [];
      for (const n of [1, 2] as const) {
        const skill = String(raw[`crisis_skill_${n}`] ?? '').trim();
        const dice = Number(raw[`crisis_dice_${n}`] ?? 0);
        if (skill && dice !== 0) skillModifiers.push({ skill: skill as SkillId, dice });
      }
      this.aplicarCondicion({
        name: nombre,
        description: descripcion,
        kind: tipo,
        temporary: true,
        ...(skillModifiers.length ? { mechanicalEffect: { skillModifiers } } : {}),
      });
      note = skillModifiers.length
        ? ` Pérdida de 5 o más en un golpe: se lleva «${nombre}», con efecto real en tiradas futuras — ver la ficha.`
        : ' Pérdida de 5 o más en un golpe: crisis de locura temporal aplicada — ver la condición en la ficha.';
    }

    return { ok: true, message: `Cordura ${from} → ${to} de ${inv.derived.maxSan}${extraNote}.${note}` };
  }

  /**
   * MITOS DE CTHULHU — la única habilidad que cuesta tenerla.
   *
   * CoC 7e p. 169: la Cordura máxima es 99 menos Mitos. Subir Mitos baja ese
   * techo PARA SIEMPRE, y si la Cordura actual queda por encima del techo
   * nuevo, baja con él — sin eso la ficha mostraría «82 de 79».
   *
   * No emite `SKILL_IMPROVED`, que es para las mejoras por uso de la fase de
   * desarrollo: Mitos no se compra en la creación (`rules/creacion.ts`) ni se
   * marca por uso (`NUNCA_SE_MARCAN`). Entra por acá y sólo por acá.
   *
   * Deliberadamente NO tira dados: no es una tirada fallida, es el precio de
   * una decisión que el jugador tomó sabiendo. Quien la pide tiene que haber
   * avisado antes.
   */
  private toolApplyMythos(raw: Record<string, unknown>): ToolOutcome {
    const amount = Math.abs(Number(raw.amount ?? 0));
    const source = String(raw.source ?? '').trim();
    const inv = this.investigator;

    if (amount <= 0) return { ok: false, message: 'Mitos de Cthulhu sube de a puntos positivos.' };
    if (!source) return { ok: false, message: 'Decí qué leyó o entendió: queda en el log y en la narración.' };

    const from = inv.skills['mitos' as SkillId]?.base ?? 0;
    const to = clamp(from + amount, 0, 99);
    if (to === from) {
      return { ok: false, message: `Mitos de Cthulhu ya está en ${from} y no puede subir más.` };
    }

    const maxSanFrom = inv.derived.maxSan;
    const maxSanTo = 99 - to;
    const sanFrom = inv.derived.san;
    const sanTo = Math.min(sanFrom, maxSanTo);

    this.emit('MYTHOS_GAINED', {
      investigatorId: inv.id, from, to, maxSanFrom, maxSanTo, sanFrom, sanTo, source,
    });

    const recorte = sanTo < sanFrom
      ? ` La Cordura actual bajó con el techo: ${sanFrom} → ${sanTo}.`
      : '';
    return {
      ok: true,
      message:
        `Mitos de Cthulhu ${from} → ${to}: ${source}. El techo de Cordura baja de ${maxSanFrom} a ${maxSanTo}, ` +
        `y no vuelve a subir nunca.${recorte}`,
    };
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

    // ★ El mundo más permeable agrava CUALQUIER contacto, igual que la
    //   Exposición alta ya agravaba la pérdida de Cordura. Regla, no
    //   decisión de la escena: se aplica DESPUÉS de los rendimientos
    //   decrecientes de la fuente, sobre lo que de verdad se aplicó, no
    //   sobre lo declarado — repetir la misma fuente sigue rindiendo cada
    //   vez menos aunque el mundo esté más abierto.
    const extraPermeabilidad = res.applied > 0
      ? extraExposureFromPermeability(this.state.world.umbralPermeability)
      : 0;
    const aplicadoFinal = clamp(res.applied + extraPermeabilidad, 0, 100 - res.from);
    const to = res.from + aplicadoFinal;
    // Recalculado sobre `to` final, no sobre `res.to`: el extra por
    // permeabilidad puede ser lo que empuja a cruzar un umbral que la
    // fuente sola no alcanzaba a cruzar.
    const nuevosUmbrales = EXPOSURE_THRESHOLDS.filter(
      (t) => to >= t.at && res.from < t.at && !inv.umbral.thresholdsCrossed.includes(t.threshold),
    ).map((t) => t.threshold);

    this.ctx.exposureThisTurn += aplicadoFinal;
    this.emit('UMBRAL_EXPOSURE', {
      investigatorId: inv.id, amount: aplicadoFinal, from: res.from, to, cause,
      source, amountBeforeDecay: res.beforeDecay,
    });

    if (aplicadoFinal === 0) {
      return {
        ok: true,
        message:
          `Exposición sin cambio: ${res.from} de 100. Es la vez ${res.timesBefore + 1} que ` +
          `«${source}» produce contacto, y esa fuente ya no aporta nada nuevo. ` +
          'No lo narres como que no pasó nada: narralo como que ya no le hace mella.',
      };
    }

    const permNote = extraPermeabilidad > 0
      ? ` (${res.applied} de la fuente + ${extraPermeabilidad} extra porque el mundo está permeable — ` +
        `Permeabilidad ${this.state.world.umbralPermeability}/100: el tiempo que pasó ya cambió el terreno)`
      : '';
    let msg = `Exposición al Umbral ${res.from} → ${to} de 100.${permNote}`;
    if (res.applied < res.beforeDecay) {
      msg += ` (${res.beforeDecay} reducidos a ${res.applied}: «${source}» ya produjo contacto ${res.timesBefore} vez/veces.)`;
    }
    for (const t of nuevosUmbrales) {
      this.emit('THRESHOLD_CROSSED', { investigatorId: inv.id, threshold: t, atExposure: to });
      const info = thresholdInfo(t);
      msg += `\n★ UMBRAL CRUZADO — ${info.label}: ${info.description} Esto es irreversible y cambia lo que el investigador puede percibir a partir de ahora. Tenelo en cuenta al narrar.`;
      // El cuarto umbral (Disolución) es el único de los cuatro con efecto
      // mecánico propio, y se aplica solo, igual que la crisis de locura
      // temporal de toolApplySanityLoss: en modo motor no hay Keeper en vivo
      // que decida aplicarla si el motor no lo hace.
      if (t === 'DISSOLUTION') {
        this.aplicarCondicion({
          name: 'La secuencia no es una sola',
          description:
            'Desde que cruzó Disolución, el investigador ya no puede confiar del todo en que lo que percibe ' +
            'pertenece a un único momento. Un ruido, una cara, un dato pueden ser de ahora o de otra parte de ' +
            'la secuencia, y notarlo cuesta tanto como no notarlo.',
          kind: 'mental',
          temporary: true,
          mechanicalEffect: {
            skillModifiers: [
              { skill: 'orientarse', dice: 1 },
              { skill: 'descubrir', dice: -1 },
            ],
          },
        });
        msg += '\n★ Se lleva «La secuencia no es una sola», permanente — ver la ficha.';
      }
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
    const condition = this.aplicarCondicion({
      name: String(raw.name ?? ''),
      description: String(raw.description ?? ''),
      kind: String(raw.kind ?? 'status') as Condition['kind'],
      temporary: String(raw.temporary ?? 'true') === 'true',
    });
    return { ok: true, message: `Condición aplicada: ${condition.name}.` };
  }

  /**
   * Registra una condición sin pasar por la herramienta pública. La usa
   * `toolApplySanityLoss` para la crisis de locura temporal (p. 166: pérdida
   * de 5 o más de Cordura en un solo golpe): en modo motor no hay un Keeper
   * en vivo que reciba el aviso y decida aplicarla, así que la regla se
   * aplica sola en vez de quedar pendiente de que alguien la note.
   */
  private aplicarCondicion(datos: Omit<Condition, 'id' | 'since'>): Condition {
    const inv = this.investigator;
    const condition: Condition = {
      ...datos,
      id: id(),
      since: this.pending[this.pending.length - 1]?.id ?? 'inicio',
    };
    this.emit('CONDITION_APPLIED', { investigatorId: inv.id, condition });
    return condition;
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

  /**
   * `knowledge.playerObserved` estaba en el tipo desde el principio del
   * proyecto y nada escribía ahí — ni siquiera `knowledge.investigator` tiene
   * una herramienta que lo llene durante la partida; sólo se llena al
   * heredar entre aventuras. Esta es la primera herramienta que escribe acá,
   * y a propósito NO toca `knowledge.investigator`: la distancia entre lo que
   * el jugador nota y lo que su investigador tiene registrado ES el
   * mecanismo, no un detalle de implementación.
   *
   * `sanitize.ts` lo manda al cliente por separado, en su propio lugar de la
   * interfaz — nunca mezclado con el conocimiento oficial del investigador—.
   * Y no cruza al Keeper IA (ver el comentario en `shared/types.ts`): un
   * Keeper que supiera lo que el jugador nota podría narrar en consecuencia,
   * y ahí el meta-horror deja de ser del jugador y pasa a ser del modelo.
   */
  private toolNotePlayerKnowledge(raw: Record<string, unknown>): ToolOutcome {
    const statement = String(raw.statement ?? '').trim();
    if (!statement) return this.reject('note_player_knowledge', raw, 'Falta `statement`.');
    const source = String(raw.source ?? '').trim();
    const reliability = String(raw.reliability ?? 'unknown') as
      'reliable' | 'unreliable' | 'false' | 'unknown';
    const inv = this.investigator;

    if (inv.knowledge.playerObserved.some((k) => k.statement === statement)) {
      return { ok: true, message: 'Eso ya lo había notado.' };
    }
    this.emit('PLAYER_KNOWLEDGE_NOTED', {
      investigatorId: inv.id, id: id(), statement, source, reliability,
    });
    return {
      ok: true,
      message:
        'Anotado para quien juega, NO para el investigador: esto no aparece en su ficha ni en su ' +
        'conocimiento oficial. Narrá la escena sin que el investigador dé señales de haberlo entendido.',
    };
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
    this.abrirElMundo(minutes);
  }

  /**
   * El mundo se abre solo con las horas, pase lo que pase. No es una cuenta
   * regresiva visible: es que el mismo contacto con el fenómeno rinde más
   * Exposición cuanto más tiempo lleva transcurrido (`toolApplyExposure`).
   * Investigar con calma sigue siendo gratis —la mayoría de acciones cuestan
   * minutos, no horas—; lo que deja de ser gratis es quedarse parado o los
   * tramos largos, que ya de por sí eran las escenas más caras.
   */
  private abrirElMundo(minutes: number) {
    const puntos = permeabilityFromMinutes(minutes);
    if (puntos <= 0) return;
    const from = this.state.world.umbralPermeability;
    const to = clamp(from + puntos, 0, 100);
    if (to === from) return;
    this.emit('WORLD_PERMEABILITY_SHIFT', {
      amount: to - from, from, to, cause: `pasaron ${minutes} minutos`,
    });
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
