/**
 * API LOCAL — el motor corriendo dentro del navegador.
 *
 * Sin servidor, sin red, sin clave de API. Todo pasa en la pestaña:
 * el log de eventos vive en IndexedDB, los dados salen del RNG del motor,
 * y el Keeper del motor narra.
 *
 * Este archivo NO importa `keeper.ts` ni el SDK de Anthropic. Con una clave en
 * el navegador cualquiera que abra la consola se la lleva, así que la narración
 * por Claude vive sólo del lado del servidor, donde la clave está a salvo.
 */

import { createCampaign, loadState, Turn } from '../engine/engine.ts';
import { useStore, store } from '../engine/store.ts';
import { browserStore } from '../engine/store.browser.ts';
import { verifyRollChain } from '../engine/rng.ts';
import { ESCENARIOS } from '../scenario/catalogo.ts';
import { runOfflineTurn } from '../keeper/offline.ts';
import { accionesDisponibles } from '../scenario/acciones.ts';
import { sanitizeForClient } from '../server/sanitize.ts';
import type { GameApi, StatusInfo, TurnEvent } from './api.ts';

// El catálogo es la única fuente. Agregar una aventura es sumarla allá.
const SCENARIOS = ESCENARIOS;

/** Un turno por vez, igual que el lock del servidor. */
const enCurso = new Set<string>();

export function createLocalApi(): GameApi {
  useStore(browserStore);

  return {
    async status(): Promise<StatusInfo> {
      return {
        keeperMode: 'motor',
        runtime: 'navegador',
        scenarios: Object.values(SCENARIOS).map((s) => ({
          id: s.id, title: s.title, premise: s.surfacePremise,
        })),
      };
    },

    async listCampaigns() {
      const all = await store().listCampaigns();
      return all.map((c) => ({
        campaignId: c.campaignId, title: c.title, scenarioId: c.scenarioId,
        createdAt: c.createdAt, lastPlayedAt: c.lastPlayedAt, saveIntegrity: c.saveIntegrity,
      }));
    },

    async createCampaign(scenarioId) {
      const scenario = SCENARIOS[scenarioId as keyof typeof SCENARIOS];
      if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`);
      const campaignId = await createCampaign(scenario);
      const { state } = await loadState(campaignId);
      return {
        campaignId, opening: scenario.opening,
        state: sanitizeForClient(state), options: accionesDisponibles(state, scenario),
      };
    },

    async getCampaign(id) {
      const { state } = await loadState(id);
      const scenario = SCENARIOS[state.scenarioId as keyof typeof SCENARIOS];
      return {
        state: sanitizeForClient(state), opening: scenario?.opening ?? '',
        options: scenario ? accionesDisponibles(state, scenario) : [],
      };
    },

    async submitIntent(id, action, onEvent) {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        const scenario = SCENARIOS[turn.state.scenarioId as keyof typeof SCENARIOS];
        if (!scenario) throw new Error('Escenario no encontrado.');

        if (turn.state.ending) {
          onEvent({ kind: 'error', data: 'La aventura ya terminó. Abrí una campaña nueva para volver a jugar.' });
          return;
        }
        if (turn.investigator.status !== 'alive') {
          onEvent({ kind: 'error', data: 'El investigador activo no puede actuar. Elegí otro para continuar.' });
          return;
        }

        turn.submitIntent(action, 'jugador-local');
        const result = await runOfflineTurn(turn, scenario, action, (e: TurnEvent) => onEvent(e));
        turn.narrate(result.narration, result.options);
        await turn.commit();

        onEvent({ kind: 'state', data: sanitizeForClient(turn.state) });
        onEvent({ kind: 'options', data: result.options });
        onEvent({ kind: 'done', data: { usedModel: false } });
      } catch (err) {
        onEvent({ kind: 'error', data: (err as Error).message });
        onEvent({ kind: 'done', data: {} });
      } finally {
        enCurso.delete(id);
      }
    },

    async introduceInvestigator(id, investigatorId) {
      const turn = await Turn.open(id);
      turn.introduceInvestigator(investigatorId, 'jugador-local');
      await turn.commit();
      return { state: sanitizeForClient(turn.state) };
    },

    async developmentOffer(id) {
      const turn = await Turn.open(id);
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
    },

    async runDevelopment(id, autoayuda) {
      // Mismo candado que un turno: la fase escribe al log y no puede correr
      // dos veces a la vez, o se duplicarían las mejoras.
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        const report = turn.runDevelopmentPhase(autoayuda ? { autoayuda } : {});
        await turn.commit();
        return { report, state: sanitizeForClient(turn.state) };
      } finally {
        enCurso.delete(id);
      }
    },

    async audit(id) {
      const { state, meta } = await loadState(id);
      if (!state.ending) {
        return {
          revealed: false,
          commitment: state.rng.commitment,
          message:
            'La semilla se revela al cerrar la campaña. Antes no, porque permitiría predecir las tiradas ' +
            'que faltan. El compromiso publicado al empezar garantiza que no puede cambiarse.',
        };
      }
      return {
        revealed: true,
        seed: meta.seed,
        commitment: meta.seedCommitment,
        verification: verifyRollChain(meta.seed, state.rolls),
        message:
          'Verificalo vos: SHA-256 de la semilla tiene que dar el compromiso, y cada tirada tiene que ' +
          'reproducirse con HMAC-SHA256(semilla, "roll:" + índice).',
      };
    },

    async deleteCampaign(id) {
      await store().deleteCampaign(id);
    },
  };
}
