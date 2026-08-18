/**
 * SERVIDOR — Fastify + SSE.
 *
 * Un lock por campaña: una intención a la vez. El log es append-only y de una
 * sola escritura por turno, así que no puede quedar un estado a medias en disco.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import Fastify from 'fastify';
import { createCampaign, loadState, Turn } from '../engine/engine.ts';
import { useStore, store } from '../engine/store.ts';
import { fileStore } from '../engine/store.node.ts';
import { verifyRollChain } from '../engine/rng.ts';
import { AGUA_QUIETA } from '../scenario/aguaquieta.ts';
import { ESCENARIOS, mesesEntre } from '../scenario/catalogo.ts';
import { SIMULADOR } from '../scenario/simulador.ts';
import { ARMA_POR_ID } from '../rules/armas.ts';
import { toClientRoll } from '../shared/protocol.ts';
import { accionesDisponibles } from '../scenario/acciones.ts';
// Sólo el servidor importa el briefing: en el build estático nadie lo hace y
// el empaquetador lo descarta, así que la solución de la aventura no viaja al
// navegador. Ver scenario/types.ts → KeeperBriefing.
import { AGUA_QUIETA_KEEPER } from '../scenario/aguaquieta.keeper.ts';
import { sanitizeForClient } from './sanitize.ts';
import { runKeeperTurn, hasApiKey } from '../keeper/keeper.ts';
import { runOfflineTurn } from '../keeper/offline.ts';
import { conTrato } from '../rules/tratamiento.ts';
import type { GameState } from '../shared/types.ts';

const activo = (state: GameState) => state.investigators[state.activeInvestigator];

// ── .env casero: sin dependencias ─────────────────────────────────────────────
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
}

// En el servidor, el log vive en archivos JSONL.
useStore(fileStore);

// El simulador no es una aventura y por eso no está en el catálogo, pero el
// servidor tiene que saber cargarlo igual.
const SCENARIOS = { ...ESCENARIOS, [SIMULADOR.id]: SIMULADOR };

/** Los rivales del galpón con sus PV. Sólo lo usa el simulador. */
const rivalesDe = (state: GameState) =>
  Object.values(state.npcs)
    .filter((n) => n.combate)
    .map((n) => ({
      id: n.id, name: n.name,
      hp: n.combate!.hp, maxHp: n.combate!.maxHp,
      arma: ARMA_POR_ID[n.combate!.armaId]?.nombre ?? n.combate!.armaId,
      derribado: n.combate!.derribado, agarrado: n.combate!.agarrado,
    }));

/**
 * Deja presente SÓLO al rival elegido — ver el mismo comentario en
 * `app/api.local.ts`. Los otros dos rivales del galpón son opciones del
 * menú, no una emboscada; sin esto, el orden de asalto por DES los suma a
 * la pelea aunque el jugador haya elegido pelear con uno solo.
 */
function aislarRival(turn: Turn, npcId: string): void {
  for (const n of Object.values(turn.state.npcs)) {
    if (!n.combate) continue;
    const debeEstar = n.id === npcId;
    if (n.present !== debeEstar) {
      turn.executeTool('change_npc_state', {
        npc_id: n.id, present: String(debeEstar), cause: 'sólo pelea el elegido en el simulador',
      });
    }
  }
}

const BRIEFINGS = { 'agua-quieta': AGUA_QUIETA_KEEPER };
const app = Fastify({ logger: false });
const locks = new Set<string>();

app.get('/api/status', async () => ({
  keeperMode: hasApiKey() ? 'ia' : 'motor',
  model: process.env.KEEPER_MODEL ?? 'claude-opus-5',
  effort: process.env.KEEPER_EFFORT ?? 'medium',
  scenarios: Object.values(SCENARIOS).map((s) => ({ id: s.id, title: s.title, premise: s.surfacePremise })),
}));

app.get('/api/campaigns', async () =>
  (await store().listCampaigns()).map((c) => ({
    campaignId: c.campaignId, title: c.title, scenarioId: c.scenarioId,
    createdAt: c.createdAt, lastPlayedAt: c.lastPlayedAt,
    saveIntegrity: c.saveIntegrity,
  })),
);

app.delete<{ Params: { id: string } }>('/api/campaigns/:id', async (req) => {
  await store().deleteCampaign(req.params.id);
  return { ok: true };
});

app.post<{ Body: { scenarioId?: string } }>('/api/campaigns', async (req) => {
  const scenarioId = req.body?.scenarioId ?? 'agua-quieta';
  const scenario = SCENARIOS[scenarioId as keyof typeof SCENARIOS];
  if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`);
  const campaignId = await createCampaign(scenario);
  const { state } = await loadState(campaignId);
  return {
    campaignId, opening: conTrato(scenario.opening, activo(state)),
    state: sanitizeForClient(state), options: accionesDisponibles(state, scenario),
  };
});

app.get<{ Params: { id: string } }>('/api/campaigns/:id', async (req) => {
  const { state } = await loadState(req.params.id);
  const scenario = SCENARIOS[state.scenarioId as keyof typeof SCENARIOS];
  return {
    state: sanitizeForClient(state),
    opening: scenario ? conTrato(scenario.opening, activo(state)) : '',
    options: scenario ? accionesDisponibles(state, scenario) : [],
  };
});

/** Auditoría: revela la semilla sólo si la campaña llegó a un final. */
/** Crear campaña con un investigador armado por el jugador. */
app.post<{ Body: { scenarioId: string; investigador: unknown } }>(
  '/api/campaigns/ficha',
  async (req) => {
    const scenario = SCENARIOS[req.body.scenarioId as keyof typeof SCENARIOS];
    if (!scenario) throw new Error(`Escenario desconocido: ${req.body.scenarioId}`);
    const campaignId = await createCampaign(
      scenario, undefined, undefined, undefined, req.body.investigador as never,
    );
    const { state } = await loadState(campaignId);
    return {
      campaignId, opening: conTrato(scenario.opening, activo(state)),
      state: sanitizeForClient(state), options: accionesDisponibles(state, scenario),
    };
  },
);

/** Encadenado de campaña: la aventura siguiente hereda de la anterior. */
app.post<{ Params: { id: string }; Body: { scenarioId: string } }>(
  '/api/campaigns/:id/continuar',
  async (req) => {
    const scenario = SCENARIOS[req.body.scenarioId as keyof typeof SCENARIOS];
    if (!scenario) throw new Error(`Escenario desconocido: ${req.body.scenarioId}`);
    const { state: anterior } = await loadState(req.params.id);
    if (!anterior.ending) throw new Error('La aventura anterior todavía no terminó.');
    const campaignId = await createCampaign(scenario, undefined, undefined, {
      estadoAnterior: anterior,
      mesesTranscurridos: mesesEntre(anterior.scenarioId, req.body.scenarioId),
    });
    const { state } = await loadState(campaignId);
    return {
      campaignId, opening: conTrato(scenario.opening, activo(state)),
      state: sanitizeForClient(state), options: accionesDisponibles(state, scenario),
    };
  },
);

/** Fase de desarrollo: lo que encontraría, sin ejecutar nada. */
app.get<{ Params: { id: string } }>('/api/campaigns/:id/desarrollo', async (req) => {
  const turn = await Turn.open(req.params.id);
  const inv = turn.investigator;
  return {
    marcas: turn.developmentMarks(),
    aspectos: inv.backstory.aspects.map((a) => ({
      id: a.id, kind: a.kind, text: a.text,
      esConexionClave: inv.backstory.keyConnection === a.id,
    })),
    cordura: inv.derived.san,
    maxCordura: inv.derived.maxSan,
  };
});

/** Ejecuta la fase. El modelo no participa: son reglas del libro. */
app.post<{
  Params: { id: string };
  Body: { autoayuda?: { aspectId: string; usarConexionClave: boolean } };
}>('/api/campaigns/:id/desarrollo', async (req) => {
  const turn = await Turn.open(req.params.id);
  const report = turn.runDevelopmentPhase(req.body?.autoayuda ? { autoayuda: req.body.autoayuda } : {});
  await turn.commit();
  return { report, state: sanitizeForClient(turn.state) };
});

app.get<{ Params: { id: string } }>('/api/campaigns/:id/auditoria', async (req) => {
  const { state, meta } = await loadState(req.params.id);
  if (!state.ending) {
    return {
      revealed: false,
      commitment: state.rng.commitment,
      message:
        'La semilla se revela al cerrar la campaña. Revelarla antes permitiría predecir las tiradas futuras. ' +
        'Mientras tanto, el compromiso publicado al empezar garantiza que la semilla no puede cambiarse.',
    };
  }
  const check = verifyRollChain(meta.seed, state.rolls);
  return {
    revealed: true,
    seed: meta.seed,
    commitment: meta.seedCommitment,
    verification: check,
    message:
      'Verificá vos mismo: SHA-256 de la semilla debe coincidir con el compromiso que viste al empezar, y ' +
      'cada tirada debe reproducirse con HMAC-SHA256(semilla, "roll:" + índice).',
  };
});

/** Un asalto del simulador. Sin narración: dados y números crudos. */
app.post<{
  Params: { id: string };
  Body: { npcId: string; armaId: string; mods?: { apuntando?: boolean; puntoBlanco?: boolean; cubierto?: boolean; blancoMovil?: boolean } };
}>(
  '/api/campaigns/:id/atacar',
  async (req) => {
    const turn = await Turn.open(req.params.id);
    aislarRival(turn, req.body.npcId);
    const antes = turn.state.rolls.length;
    const m = req.body.mods;
    const r = turn.executeTool('resolve_attack', {
      npc_id: req.body.npcId, weapon_id: req.body.armaId,
      apuntando: String(Boolean(m?.apuntando)),
      punto_blanco: String(Boolean(m?.puntoBlanco)),
      cubierto: String(Boolean(m?.cubierto)),
      blanco_movil: String(Boolean(m?.blancoMovil)),
    });
    await turn.commit();
    const { state } = await loadState(req.params.id);
    return {
      ok: r.ok, mensaje: r.message,
      state: sanitizeForClient(state),
      tiradas: state.rolls.slice(antes).map(toClientRoll),
      rivales: rivalesDe(state),
    };
  },
);

/** Salir de una pelea a mitad de asalto. */
app.post<{ Params: { id: string }; Body: { armaId: string; npcId: string } }>(
  '/api/campaigns/:id/huir',
  async (req) => {
    const turn = await Turn.open(req.params.id);
    aislarRival(turn, req.body.npcId);
    const antes = turn.state.rolls.length;
    const r = turn.executeTool('resolve_flee', { weapon_id: req.body.armaId });
    await turn.commit();
    const { state } = await loadState(req.params.id);
    return {
      ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
      tiradas: state.rolls.slice(antes).map(toClientRoll), rivales: rivalesDe(state),
    };
  },
);

/** Desarmar, derribar o sujetar. */
app.post<{ Params: { id: string }; Body: { npcId: string; tipo: string } }>(
  '/api/campaigns/:id/maniobra',
  async (req) => {
    const turn = await Turn.open(req.params.id);
    aislarRival(turn, req.body.npcId);
    const antes = turn.state.rolls.length;
    const r = turn.executeTool('resolve_maneuver', { npc_id: req.body.npcId, type: req.body.tipo });
    await turn.commit();
    const { state } = await loadState(req.params.id);
    return {
      ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
      tiradas: state.rolls.slice(antes).map(toClientRoll), rivales: rivalesDe(state),
    };
  },
);

/** Vuelve a empezar con todos enteros. El log es append-only: se abre otra. */
app.post<{ Params: { id: string } }>(
  '/api/campaigns/:id/reiniciar-simulador',
  async (req) => {
    const { state: viejo } = await loadState(req.params.id);
    const inv = activo(viejo);
    await store().deleteCampaign(req.params.id);
    const campaignId = await createCampaign(
      SIMULADOR, undefined, undefined, undefined,
      inv ? ({ ...inv, derived: { ...inv.derived, hp: inv.derived.maxHp } } as never) : undefined,
    );
    const { state } = await loadState(campaignId);
    return {
      campaignId,
      ok: true, mensaje: 'Galpón reiniciado. Todos enteros.',
      state: sanitizeForClient(state), tiradas: [], rivales: rivalesDe(state),
    };
  },
);

/** Estado del galpón al entrar: quién está en pie y con qué. */
app.get<{ Params: { id: string } }>('/api/campaigns/:id/simulador', async (req) => {
  const { state } = await loadState(req.params.id);
  return { state: sanitizeForClient(state), rivales: rivalesDe(state) };
});

/** Continuar con otro investigador tras una muerte. */
app.post<{ Params: { id: string }; Body: { investigatorId: string } }>(
  '/api/campaigns/:id/investigador',
  async (req) => {
    const turn = await Turn.open(req.params.id);
    turn.introduceInvestigator(req.body.investigatorId, 'jugador-local');
    await turn.commit();
    return { state: sanitizeForClient(turn.state) };
  },
);

/** El turno. Stream SSE. */
app.post<{ Params: { id: string }; Body: { action: string } }>(
  '/api/campaigns/:id/intent',
  async (req, reply) => {
    const campaignId = req.params.id;
    const action = (req.body?.action ?? '').trim();

    if (!action) { reply.code(400); return { error: 'Acción vacía.' }; }
    if (locks.has(campaignId)) { reply.code(409); return { error: 'Ya hay una acción en curso.' }; }
    locks.add(campaignId);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (kind: string, data: unknown) => {
      reply.raw.write(`data: ${JSON.stringify({ kind, data })}\n\n`);
    };

    try {
      const turn = await Turn.open(campaignId);
      const scenario = SCENARIOS[turn.state.scenarioId as keyof typeof SCENARIOS];
      if (!scenario) throw new Error('Escenario no encontrado.');

      if (turn.state.ending) {
        send('error', 'La aventura ya terminó. Abrí una campaña nueva para volver a jugar.');
        send('done', {});
        return;
      }
      if (turn.investigator.status !== 'alive') {
        send('error', 'El investigador activo no puede actuar. Elegí otro investigador para continuar.');
        send('done', {});
        return;
      }

      turn.submitIntent(action, 'jugador-local');

      const briefing = BRIEFINGS[turn.state.scenarioId as keyof typeof BRIEFINGS];
      const result = hasApiKey() && briefing
        ? await runKeeperTurn(turn, scenario, briefing, action, (e) => send(e.kind, e.data))
        : await runOfflineTurn(turn, scenario, action, (e) => send(e.kind, e.data));

      turn.narrate(result.narration, result.options);
      await turn.commit();

      send('state', sanitizeForClient(turn.state));
      send('options', result.options);
      if (result.cost) send('cost', result.cost);
      send('done', { usedModel: result.usedModel });
    } catch (err) {
      console.error('[turno]', err);
      send('error', (err as Error).message);
      send('done', {});
    } finally {
      locks.delete(campaignId);
      reply.raw.end();
    }
  },
);

// Variable propia a propósito: `PORT` la pisan demasiadas herramientas
// (Vite, harnesses de preview, hosts) y el servidor terminaría escuchando
// donde escucha la interfaz.
const port = Number(process.env.CASTRONEGRO_PORT ?? 8787);
app.listen({ port, host: '127.0.0.1' }).then(() => {
  const mode = hasApiKey()
    ? `KEEPER IA (${process.env.KEEPER_MODEL ?? 'claude-opus-5'}, effort ${process.env.KEEPER_EFFORT ?? 'medium'})`
    : 'MODO MOTOR (sin clave de API — el juego funciona igual)';
  console.log(`\n  El Secreto de Castronegro — API en http://localhost:${port}`);
  console.log(`  Keeper: ${mode}`);
  console.log(`  ▶ Jugá en: http://localhost:5173\n`);
});
