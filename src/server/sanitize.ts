/**
 * SANITIZACIÓN — qué puede cruzar al cliente.
 *
 * El navegador es territorio hostil: cualquier cosa que se serialice está a un
 * F12 de distancia. Todo lo que sea secreto del Keeper se recorta acá.
 *
 * NUNCA cruzan:
 *   · hypothesis.actualTruth        (el motor sabe si es cierta; el jugador no)
 *   · location.keeperNotes
 *   · npc.secrets / npc.knowledge / npc.fears / npc.refusals
 *   · item.hiddenProperties no descubiertas
 *   · clue.reliability mientras no se haya determinado
 *   · la semilla del RNG antes del final
 *   · scenario.deepTruth
 */

import type { GameState } from '../shared/types.ts';
import { toClientRoll } from '../shared/protocol.ts';

export interface ClientState {
  campaignId: string;
  title: string;
  session: number;
  worldTime: { display: string };
  scenarioId: string;
  location: { id: string; name: string; description: string; connections: string[] };
  investigator: unknown;
  reserveAvailable: Array<{ id: string; name: string; occupation: string }>;
  items: unknown[];
  npcs: Array<{
    id: string; name: string; description: string; present: boolean; status: string;
    aqui: boolean; sinPaciencia: boolean;
  }>;
  documents: unknown[];
  board: unknown;
  rolls: unknown[];
  consequences: Array<{ description: string; permanent: boolean }>;
  narrative: unknown[];
  rngCommitment: string;
  seedRevealed: string | null;
  ending: unknown;
  umbralPermeability: number;
}

export function sanitizeForClient(state: GameState): ClientState {
  const inv = state.investigators[state.activeInvestigator]!;
  const loc = state.world.locations[state.world.currentLocation]!;

  return {
    campaignId: state.campaignId,
    title: state.title,
    session: state.session,
    worldTime: { display: state.world.time.display },
    scenarioId: state.scenarioId,
    location: {
      id: loc.id,
      name: loc.name,
      description: loc.description,
      connections: loc.connections,
      // keeperNotes NO cruza.
    },
    investigator: {
      id: inv.id,
      name: inv.name,
      age: inv.age,
      occupation: inv.occupation,
      description: inv.description,
      status: inv.status,
      characteristics: inv.characteristics,
      derived: inv.derived,
      skills: Object.fromEntries(
        Object.entries(inv.skills).filter(([, v]) => v.base > 0).map(([k, v]) => [k, v.base]),
      ),
      umbral: {
        exposure: inv.umbral.exposure,
        stability: inv.umbral.stability,
        thresholdsCrossed: inv.umbral.thresholdsCrossed,
      },
      conditions: inv.conditions.map((c) => ({ name: c.name, description: c.description, kind: c.kind })),
      knowledge: inv.knowledge.investigator.map((k) => k.statement),
    },
    reserveAvailable: state.reserveInvestigators
      .map((id) => state.investigators[id])
      .filter((i): i is NonNullable<typeof i> => Boolean(i) && i!.status === 'alive')
      .map((i) => ({ id: i.id, name: i.name, occupation: i.occupation })),

    items: Object.values(state.items)
      .filter((i) => i.owner === inv.id || i.owner === loc.id)
      .map((i) => ({
        id: i.id,
        name: i.name,
        shortDescription: i.shortDescription,
        carried: i.owner === inv.id,
        // Sólo propiedades públicas + las YA descubiertas.
        properties: [
          ...i.publicProperties.map((p) => ({ description: p.description, discovered: false })),
          ...i.discoveredProperties.map((d) => {
            const all = [...i.hiddenProperties, ...i.conditionalProperties, ...i.temporalProperties];
            return { description: all.find((p) => p.id === d.propertyId)?.description ?? '', discovered: true };
          }),
        ],
        hasUndiscovered: i.hiddenProperties.length + i.conditionalProperties.length > i.discoveredProperties.length,
      })),

    // Se expone SI está sin paciencia, no cuánta le queda. El número exacto
    // convertiría la conversación en una barra que se administra; que ahora no
    // quiera hablar es información que el jugador ya tiene por la prosa, y la
    // interfaz sólo la confirma.
    npcs: Object.values(state.npcs).map((n) => ({
      id: n.id, name: n.name, description: n.description, present: n.present, status: n.status,
      aqui: loc.npcsPresent.includes(n.id),
      sinPaciencia: n.patience <= 0,
    })),

    documents: Object.values(state.documents)
      .filter((d) => d.obtainedAt)
      .map((d) => ({
        id: d.id, title: d.title, author: d.author, date: d.date, kind: d.kind, content: d.content,
      })),

    board: {
      facts: state.board.facts.map((f) => ({ id: f.id, statement: f.statement })),
      clues: state.board.clues.map((c) => ({
        id: c.id, description: c.description, kind: c.kind, source: c.source,
        reliability: c.reliabilityKnown ? c.reliability : null,
      })),
      hypotheses: state.board.hypotheses.map((h) => ({
        id: h.id, statement: h.statement, status: h.status,
        supporting: h.supportingClues.length, contradicting: h.contradictingClues.length,
      })),
      contradictions: state.board.contradictions.map((c) => ({ id: c.id, description: c.description, between: c.between })),
      questions: state.board.questions.map((q) => ({ id: q.id, question: q.question, answered: q.answered })),
    },

    // Mismo mapeo que el evento SSE en vivo: ver shared/protocol.ts
    rolls: state.rolls.map(toClientRoll),

    consequences: state.consequences.map((c) => ({ description: c.description, permanent: c.permanent })),
    narrative: state.narrative.map((n) => ({ id: n.id, kind: n.kind, text: n.text })),
    rngCommitment: state.rng.commitment,
    seedRevealed: state.rng.revealedSeed,
    ending: state.ending,
    umbralPermeability: state.world.umbralPermeability,
  };
}
