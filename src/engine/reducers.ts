/**
 * REDUCERS — el estado es el resultado de plegar el log.
 *
 * `fold(events)` es determinista y total: los mismos eventos producen siempre
 * el mismo estado. Eso da replay, debugging, tests sin infraestructura, y la
 * garantía de que el pasado es de sólo lectura.
 */

import type { GameEvent } from '../shared/events.ts';
import type * as P from '../shared/events.ts';
import type {
  GameState, Investigator, Item, Npc, DiegeticDocument, GameLocation,
  Clue, Fact, InvestigationBoard, ContinuityLedger, NarrativeEntry,
} from '../shared/types.ts';
import { thresholdInfo } from '../rules/umbral.ts';
import { PACIENCIA_INICIAL, PACIENCIA_MAXIMA } from '../rules/social.config.ts';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function emptyBoard(): InvestigationBoard {
  return { facts: [], clues: [], hypotheses: [], contradictions: [], questions: [], connections: [] };
}

function emptyContinuity(): ContinuityLedger {
  return {
    ringBearer: null,
    ringState: 'absent',
    groupKnowledge: [],
    costPaid: [],
    activeEntities: [],
    temporalChange: [],
  };
}

/** Pliega el log completo. Nunca muta los eventos. */
export function fold(events: GameEvent[]): GameState {
  let state: GameState | null = null;
  for (const ev of events) {
    state = apply(state, ev);
  }
  if (!state) throw new Error('Log vacío: no se puede reconstruir el estado.');
  return state;
}

export function apply(prev: GameState | null, ev: GameEvent): GameState {
  if (ev.type === 'CAMPAIGN_CREATED') {
    return initFromCreation(ev);
  }
  if (!prev) throw new Error(`Evento ${ev.type} antes de CAMPAIGN_CREATED`);

  // Copia superficial + copias profundas selectivas por rama.
  const s: GameState = {
    ...prev,
    headSeq: ev.seq,
    investigators: { ...prev.investigators },
    items: { ...prev.items },
    npcs: { ...prev.npcs },
    documents: { ...prev.documents },
    world: { ...prev.world, locations: { ...prev.world.locations } },
    board: {
      facts: [...prev.board.facts],
      clues: [...prev.board.clues],
      hypotheses: [...prev.board.hypotheses],
      contradictions: [...prev.board.contradictions],
      questions: [...prev.board.questions],
      connections: [...prev.board.connections],
    },
    rolls: [...prev.rolls],
    consequences: [...prev.consequences],
    campaignCanon: [...prev.campaignCanon],
    narrative: [...prev.narrative],
    continuity: { ...prev.continuity },
    rng: { ...prev.rng },
    meta: { ...prev.meta },
  };

  switch (ev.type) {
    case 'SESSION_STARTED': {
      s.session = (ev.payload as { session: number }).session;
      break;
    }

    case 'INTENT_SUBMITTED': {
      const p = ev.payload as P.IntentSubmittedPayload;
      s.narrative.push(entry(ev, 'player', p.text));
      break;
    }

    case 'ROLL_EXECUTED': {
      const p = ev.payload as P.RollExecutedPayload;
      s.rolls.push(p.roll);
      s.rng.nextIndex = Math.max(s.rng.nextIndex, p.roll.execution.proof.index + 1);
      break;
    }

    case 'STAT_CHANGED': {
      const p = ev.payload as P.StatChangedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.derived = { ...inv.derived, [p.stat]: p.to } as typeof inv.derived;
      break;
    }

    case 'UMBRAL_EXPOSURE': {
      const p = ev.payload as P.UmbralExposurePayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.umbral = {
        ...inv.umbral,
        exposure: p.to,
        peakExposure: Math.max(inv.umbral.peakExposure, p.to),
        exposureEvents: [
          ...inv.umbral.exposureEvents,
          {
            at: ev.id,
            amount: p.amount,
            cause: p.cause,
            source: p.source,
            amountBeforeDecay: p.amountBeforeDecay,
            worldTime: ev.worldTime,
          },
        ],
      };
      break;
    }

    case 'SKILL_IMPROVED': {
      const p = ev.payload as P.SkillImprovedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.skills = { ...inv.skills, [p.skill]: { base: p.to, origin: 'growth' } };
      break;
    }

    case 'MYTHOS_GAINED': {
      const p = ev.payload as P.MythosGainedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      // `origin: 'granted'` y no `'growth'`: Mitos no se compra en la creación
      // ni se marca por uso (`NUNCA_SE_MARCAN`, rules/desarrollo.ts). Entra
      // sólo por entender algo que no convenía entender.
      inv.skills = { ...inv.skills, mitos: { base: p.to, origin: 'granted' } };
      // El techo de Cordura baja con Mitos, y si la Cordura actual queda por
      // encima del techo nuevo, baja con él. Sin esto la ficha mostraría
      // «82/79», que además de imposible haría mentir a la barra.
      inv.derived = { ...inv.derived, maxSan: p.maxSanTo, san: p.sanTo };
      break;
    }

    case 'RING_BONDED': {
      const p = ev.payload as P.RingBondedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      // `bondedAt` es el id de ESTE evento: el vínculo queda anclado al punto
      // exacto del log en que se produjo, que es lo único que después permite
      // reconstruir cuándo empezó a contar.
      inv.ringBond = { itemId: p.itemId, bondedAt: ev.id, removalLethal: p.removalLethal };
      break;
    }

    case 'BACKSTORY_REVISED': {
      const p = ev.payload as P.BackstoryRevisedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.backstory = {
        aspects: inv.backstory.aspects.map((a) =>
          a.id === p.aspectId ? { ...a, text: p.to } : a),
        keyConnection: p.lostKeyConnection ? null : inv.backstory.keyConnection,
      };
      break;
    }

    case 'DEVELOPMENT_PHASE_COMPLETED': {
      const p = ev.payload as P.DevelopmentPhaseCompletedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      // Mover la frontera ES borrar las marcas: de acá en adelante, sólo
      // cuentan las tiradas nuevas.
      inv.experience = {
        sessionsSurvived: inv.experience.sessionsSurvived + 1,
        lastDevelopmentSeq: p.atRollSeq,
      };
      break;
    }

    case 'WORLD_PERMEABILITY_SHIFT': {
      const p = ev.payload as P.WorldPermeabilityShiftPayload;
      s.world = { ...s.world, umbralPermeability: p.to };
      break;
    }

    case 'STABILITY_SHIFT': {
      const p = ev.payload as P.StabilityShiftPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.umbral = { ...inv.umbral, stability: p.to };
      break;
    }

    case 'THRESHOLD_CROSSED': {
      const p = ev.payload as P.ThresholdCrossedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      if (!inv.umbral.thresholdsCrossed.includes(p.threshold)) {
        inv.umbral = {
          ...inv.umbral,
          thresholdsCrossed: [...inv.umbral.thresholdsCrossed, p.threshold],
        };
      }
      s.narrative.push(
        entry(ev, 'system', `⚠ UMBRAL CRUZADO — ${thresholdInfo(p.threshold).label}: ${thresholdInfo(p.threshold).description}`),
      );
      break;
    }

    case 'CONDITION_APPLIED': {
      const p = ev.payload as P.ConditionAppliedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.conditions = [...inv.conditions, p.condition];
      break;
    }

    case 'CONDITION_REMOVED': {
      const p = ev.payload as { investigatorId: string; conditionId: string };
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.conditions = inv.conditions.filter((c) => c.id !== p.conditionId);
      break;
    }

    case 'PROPERTY_DISCOVERED': {
      const p = ev.payload as P.PropertyDiscoveredPayload;
      const item = s.items[p.itemId];
      if (!item) break;
      if (item.discoveredProperties.some((d) => d.propertyId === p.propertyId)) break;
      s.items[p.itemId] = {
        ...item,
        discoveredProperties: [
          ...item.discoveredProperties,
          { propertyId: p.propertyId, at: ev.id, how: p.how },
        ],
      };
      break;
    }

    case 'ITEM_TRANSFERRED': {
      const p = ev.payload as P.ItemTransferredPayload;
      const item = s.items[p.itemId];
      if (!item) break;
      s.items[p.itemId] = { ...item, owner: p.to, carried: p.carried };
      break;
    }

    case 'ITEM_USED': {
      const p = ev.payload as { itemId: string };
      const item = s.items[p.itemId];
      if (!item) break;
      s.items[p.itemId] = { ...item, usageCount: item.usageCount + 1 };
      break;
    }

    case 'ITEM_BROKEN': {
      const p = ev.payload as P.ItemBrokenPayload;
      const item = s.items[p.itemId];
      if (!item) break;
      s.items[p.itemId] = { ...item, roto: true };
      break;
    }

    case 'CLUE_DISCOVERED': {
      const p = ev.payload as P.ClueDiscoveredPayload;
      if (!s.board.clues.some((c) => c.id === p.clue.id)) s.board.clues.push(p.clue);
      break;
    }

    case 'HYPOTHESIS_FORMED': {
      const p = ev.payload as P.HypothesisFormedPayload;
      s.board.hypotheses.push({
        id: p.id,
        statement: p.statement,
        proposedBy: p.proposedBy,
        proposedAt: ev.id,
        // El motor no sabe si es cierta hasta que el escenario lo determine.
        actualTruth: 'undetermined',
        supportingClues: [],
        contradictingClues: [],
        status: 'open',
      });
      break;
    }

    case 'HYPOTHESIS_PROMOTED': {
      const p = ev.payload as P.HypothesisPromotedPayload;
      s.board.hypotheses = s.board.hypotheses.map((h) =>
        h.id === p.hypothesisId ? { ...h, status: 'promoted_to_fact' as const } : h,
      );
      const fact: Fact = {
        id: p.factId,
        statement: p.statement,
        establishedAt: ev.id,
        supportingClues: p.supportingClues,
        canon: { truth: 'CAMPAIGN_CANON', disclosure: 'PUBLIC', source: 'campaign' },
      };
      s.board.facts.push(fact);
      break;
    }

    case 'HYPOTHESIS_REFUTED': {
      const p = ev.payload as { hypothesisId: string };
      s.board.hypotheses = s.board.hypotheses.map((h) =>
        h.id === p.hypothesisId ? { ...h, status: 'refuted' as const } : h,
      );
      break;
    }

    case 'CONTRADICTION_NOTED': {
      const p = ev.payload as { id: string; description: string; between: string[] };
      s.board.contradictions.push({
        id: p.id, description: p.description, between: p.between,
        notedAt: ev.id, resolved: false,
      });
      break;
    }

    case 'QUESTION_RAISED': {
      const p = ev.payload as { id: string; question: string };
      if (!s.board.questions.some((q) => q.id === p.id)) {
        s.board.questions.push({ id: p.id, question: p.question, raisedAt: ev.id, answered: false });
      }
      break;
    }

    case 'PLAYER_KNOWLEDGE_NOTED': {
      // Va a `playerObserved`, NUNCA a `knowledge.investigator`: es lo que
      // nota QUIEN LEE, no lo que su investigador tiene registrado. La
      // distinción es el mecanismo entero — ver `toolNotePlayerKnowledge`.
      const p = ev.payload as {
        investigatorId: string; id: string; statement: string; source: string;
        reliability: 'reliable' | 'unreliable' | 'false' | 'unknown';
      };
      const inv = cloneInvestigator(s, p.investigatorId);
      if (!inv) break;
      inv.knowledge = {
        ...inv.knowledge,
        playerObserved: [
          ...inv.knowledge.playerObserved,
          { id: p.id, statement: p.statement, acquiredAt: ev.id, source: p.source, reliability: p.reliability },
        ],
      };
      break;
    }

    case 'FACT_ESTABLISHED': {
      const p = ev.payload as { fact: Fact };
      s.board.facts.push(p.fact);
      break;
    }

    case 'NPC_CREATED': {
      const p = ev.payload as P.NpcCreatedPayload;
      s.npcs[p.npc.id] = p.npc;
      break;
    }

    case 'NPC_STATE_CHANGED': {
      const p = ev.payload as P.NpcStateChangedPayload;
      const npc = s.npcs[p.npcId];
      if (!npc) break;
      const next: Npc = {
        ...npc, ...p.changes,
        attitude: { ...npc.attitude },
        dodgedTopics: [...(npc.dodgedTopics ?? [])],
      };
      if (p.attitudeDelta) {
        const cur = next.attitude[p.attitudeDelta.investigatorId] ?? 0;
        next.attitude[p.attitudeDelta.investigatorId] = clamp(cur + p.attitudeDelta.delta, -100, 100);
      }
      if (p.patienceDelta) {
        next.patience = clamp((npc.patience ?? PACIENCIA_INICIAL) + p.patienceDelta, 0, PACIENCIA_MAXIMA);
      }
      // Insistir en un tema esquivado cuesta más, así que hay que recordar
      // cuáles esquivó. Sin duplicados: esquivar dos veces no cuenta doble.
      if (p.dodgedTopic && !next.dodgedTopics.includes(p.dodgedTopic)) {
        next.dodgedTopics.push(p.dodgedTopic);
      }
      s.npcs[p.npcId] = next;
      break;
    }

    case 'NPC_DAMAGED': {
      const p = ev.payload as P.NpcDamagedPayload;
      const npc = s.npcs[p.npcId];
      if (!npc?.combate) break;
      // Llegar a 0 no lo mata: lo saca de la pelea. Si muere, si queda
      // tirado o si lo llevan al pueblo en una chata lo decide quien narra —
      // una resta no debería poder matar a nadie sola. Lo único que el motor
      // fija es que ya no puede seguir peleando.
      s.npcs[p.npcId] = { ...npc, combate: { ...npc.combate, hp: p.to } };
      // En combate real, el propio mensaje del asalto ya narra la caída
      // ("Ahijado: 3 → 0 PV. Ahijado deja de pelear.") — y ese mensaje se
      // agrega DESPUÉS, con `turn.narrate()`, una vez que la herramienta ya
      // terminó de resolver el asalto entero. Este aviso, en cambio, se
      // emite ACÁ, a mitad de esa resolución: sin esta excepción quedaba
      // primero en `state.narrative` y se leía "queda fuera de combate"
      // antes que el daño que lo dejó así. Reportado jugando. Fuera de
      // combate (daño aplicado por una escena, no por un asalto) sigue
      // narrándose acá, porque ahí no hay otro mensaje que lo cuente.
      if (p.to <= 0 && !s.activeCombat) {
        s.narrative.push(entry(ev, 'system', `${npc.name} queda fuera de combate.`));
      }
      break;
    }

    case 'DOCUMENT_OBTAINED': {
      const p = ev.payload as P.DocumentObtainedPayload;
      s.documents[p.document.id] = { ...p.document, obtainedAt: ev.id };
      s.narrative.push(entry(ev, 'document', renderDocument(p.document)));
      break;
    }

    case 'LOCATION_ENTERED': {
      const p = ev.payload as P.LocationEnteredPayload;
      s.world.currentLocation = p.locationId;
      const loc = s.world.locations[p.locationId];
      if (loc) s.world.locations[p.locationId] = { ...loc, visited: true };
      break;
    }

    case 'TIME_ADVANCED': {
      const p = ev.payload as P.TimeAdvancedPayload;
      s.world.time = p.to;
      break;
    }

    case 'EVENT_CATEGORIZED': {
      const p = ev.payload as P.EventCategorizedPayload;
      s.world.timeline = s.world.timeline.map((t) =>
        t.id === p.temporalEventId
          ? {
              ...t,
              category: p.category,
              categoryHistory: [...t.categoryHistory, { category: p.category, at: ev.id, reason: p.reason }],
            }
          : t,
      );
      break;
    }

    case 'TEMPORAL_ECHO_RECEIVED': {
      const p = ev.payload as P.TemporalEchoPayload;
      s.world.umbralPermeability = clamp(s.world.umbralPermeability + 2, 0, 100);
      s.narrative.push(entry(ev, 'system', `Eco temporal: ${p.description}`));
      break;
    }

    case 'CONSEQUENCE_RECORDED': {
      const p = ev.payload as P.ConsequenceRecordedPayload;
      s.consequences.push({
        id: p.id,
        description: p.description,
        causedBy: { investigator: p.investigatorId, event: ev.id },
        scope: p.scope,
        permanent: p.permanent,
        worldReminder: p.worldReminder,
      });
      if (p.permanent) s.continuity.costPaid = [...s.continuity.costPaid, p.id];
      break;
    }

    case 'CAMPAIGN_CANON_ADDED': {
      const p = ev.payload as P.CampaignCanonAddedPayload;
      s.campaignCanon.push({ id: p.id, statement: p.statement, addedAt: ev.id });
      break;
    }

    case 'NARRATION_EMITTED': {
      const p = ev.payload as P.NarrationEmittedPayload;
      s.narrative.push(entry(ev, 'keeper', p.text));
      break;
    }

    case 'INVESTIGATOR_DIED': {
      const p = ev.payload as P.InvestigatorDiedPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (inv) inv.status = 'dead';
      s.narrative.push(entry(ev, 'system', `${inv?.name ?? 'El investigador'} ha muerto. ${p.cause}`));
      break;
    }

    case 'INVESTIGATOR_WENT_INSANE': {
      const p = ev.payload as P.InvestigatorWentInsanePayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (inv) inv.status = 'insane';
      s.narrative.push(entry(ev, 'system',
        `${inv?.name ?? 'El investigador'} pierde la razón por completo. ${p.cause}`));
      break;
    }

    case 'INVESTIGATOR_UNCONSCIOUS': {
      const p = ev.payload as P.InvestigatorUnconsciousPayload;
      const inv = cloneInvestigator(s, p.investigatorId);
      if (inv) inv.status = 'unconscious';
      s.narrative.push(entry(ev, 'system', `${inv?.name ?? 'El investigador'} pierde el conocimiento. ${p.cause}`));
      break;
    }

    case 'NPC_COMBATE_CHANGED': {
      const p = ev.payload as P.NpcCombateChangedPayload;
      const npc = s.npcs[p.npcId];
      if (!npc?.combate) break;
      s.npcs[p.npcId] = { ...npc, combate: { ...npc.combate, ...p.changes } };
      break;
    }

    case 'COMBAT_STARTED': {
      const p = ev.payload as P.CombatStartedPayload;
      s.activeCombat = {
        npcIds: p.npcIds, startedAt: ev.id, reason: p.reason,
        salidaPacifica: p.salidaPacifica, preparacion: p.preparacion,
      };
      break;
    }

    case 'COMBAT_ENDED': {
      s.activeCombat = null;
      break;
    }

    case 'INVESTIGATOR_INTRODUCED': {
      const p = ev.payload as P.InvestigatorIntroducedPayload;
      s.activeInvestigator = p.investigatorId;
      s.reserveInvestigators = s.reserveInvestigators.filter((id) => id !== p.investigatorId);
      const inv = cloneInvestigator(s, p.investigatorId);
      if (inv && p.inheritedKnowledge.length) {
        // El mundo conserva las consecuencias; el investigador nuevo NO hereda
        // los recuerdos del muerto, sólo lo que pudo aprender por otra vía.
        inv.knowledge = {
          ...inv.knowledge,
          investigator: [...inv.knowledge.investigator, ...p.inheritedKnowledge],
        };
      }
      break;
    }

    case 'ENDING_REACHED': {
      const p = ev.payload as P.EndingReachedPayload;
      s.ending = { id: p.id, title: p.title, text: p.text };
      s.narrative.push(entry(ev, 'system', `— ${p.title} —\n\n${p.text}`));
      break;
    }

    case 'KEEPER_PROPOSAL_REJECTED':
    case 'INTENT_CLASSIFIED':
    case 'ROLL_REQUESTED':
    case 'ROLL_PUSHED':
    case 'SESSION_ENDED':
      // Registrados para auditoría; no alteran la proyección.
      break;
  }

  return s;
}

// ── helpers ────────────────────────────────────────────────────────────────

function entry(ev: GameEvent, kind: NarrativeEntry['kind'], text: string): NarrativeEntry {
  return { id: `${ev.id}:n`, kind, text, at: ev.occurredAt, eventId: ev.id };
}

/** Clona el investigador dentro de `s` y devuelve la referencia mutable. */
function cloneInvestigator(s: GameState, id: string): Investigator | null {
  const cur = s.investigators[id];
  if (!cur) return null;
  const copy: Investigator = {
    ...cur,
    derived: { ...cur.derived },
    umbral: { ...cur.umbral, thresholdsCrossed: [...cur.umbral.thresholdsCrossed] },
    conditions: [...cur.conditions],
    knowledge: {
      investigator: [...cur.knowledge.investigator],
      withheld: [...cur.knowledge.withheld],
      playerObserved: [...cur.knowledge.playerObserved],
    },
    relationships: [...cur.relationships],
    skills: { ...cur.skills },
    backstory: { ...cur.backstory, aspects: [...cur.backstory.aspects] },
    experience: { ...cur.experience },
  };
  s.investigators[id] = copy;
  return copy;
}

function renderDocument(d: DiegeticDocument): string {
  return `【 ${d.title} 】\n${d.author} · ${d.date} · ${d.location}\n\n${d.content}`;
}

function initFromCreation(ev: GameEvent): GameState {
  const p = ev.payload as P.CampaignCreatedPayload;
  const investigators: Record<string, Investigator> = {};
  for (const inv of p.investigators) investigators[inv.id] = inv;
  const items: Record<string, Item> = {};
  for (const it of p.items) items[it.id] = it;
  const npcs: Record<string, Npc> = {};
  // La paciencia se rellena acá y no en cada escenario: es una regla del
  // sistema, no una decisión de la aventura. Un escenario puede pisarla si un
  // personaje concreto aguanta más o menos que el resto.
  for (const n of p.npcs) {
    npcs[n.id] = {
      ...n,
      patience: n.patience ?? PACIENCIA_INICIAL,
      dodgedTopics: n.dodgedTopics ?? [],
    };
  }
  const documents: Record<string, DiegeticDocument> = {};
  for (const d of p.documents) documents[d.id] = d;

  const locations: Record<string, GameLocation> = {};
  for (const [k, v] of Object.entries(p.locations)) locations[k] = { ...v };
  const start = locations[p.startLocation];
  if (start) start.visited = true;

  return {
    campaignId: ev.campaignId,
    title: p.title,
    scenarioId: p.scenarioId,
    canonVersion: '0.7',
    keeperVersion: '0.8',
    engineVersion: '0.9',
    createdAt: ev.occurredAt,
    session: 1,
    headSeq: ev.seq,
    rng: { commitment: p.rngCommitment, revealedSeed: null, nextIndex: 0 },
    meta: {
      previousCampaignIds: [],
      newGamePlus: false,
      crosscampaignConsent: {
        allowMetaHorror: false,
        allowPreviousCampaignEchoes: false,
        grantedAt: null,
      },
      saveIntegrity: 'sealed',
    },
    investigators,
    activeInvestigator: p.activeInvestigator,
    reserveInvestigators: p.reserveInvestigators,
    world: {
      time: p.worldTime,
      currentLocation: p.startLocation,
      locations,
      umbralPermeability: p.umbralPermeability,
      lastManifestation: null,
      threatLevel: 0,
      timeline: p.timeline,
    },
    items,
    npcs,
    documents,
    board: emptyBoard(),
    rolls: [],
    consequences: [],
    continuity: emptyContinuity(),
    campaignCanon: [],
    narrative: [],
    ending: null,
    activeCombat: null,
  };
}
