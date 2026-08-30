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
import { ESCENARIOS, mesesEntre } from '../scenario/catalogo.ts';
import { SIMULADOR } from '../scenario/simulador.ts';
import { ARMA_POR_ID } from '../rules/armas.ts';
import { toClientRoll } from '../shared/protocol.ts';
import { runOfflineTurn } from '../keeper/offline.ts';
import { accionesDisponibles } from '../scenario/acciones.ts';
import { sanitizeForClient, estadoDeCombate } from './sanitize.ts';
import { conTrato } from '../rules/tratamiento.ts';
import type { GameState } from '../shared/types.ts';
import type { GameApi, StatusInfo, TurnEvent, RivalReal, ArmaDisponible, CombateResult } from './api.ts';

const activo = (state: GameState) => state.investigators[state.activeInvestigator];

/**
 * El catálogo es la única fuente de AVENTURAS. El simulador se suma acá y no
 * allá porque no es una aventura: si estuviera en el catálogo aparecería
 * como una más en la pantalla de inicio, entre dos historias, y no es eso.
 */
const SCENARIOS = { ...ESCENARIOS, [SIMULADOR.id]: SIMULADOR };

/** Los rivales del galpón, con sus PV. Sólo para el simulador. */
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
 * Los rivales de un combate real, para la pantalla dedicada. A diferencia de
 * `rivalesDe` (sólo el simulador): nunca el PV exacto, los mismos cuatro
 * escalones que ya usa `sanitizeForClient` para cualquier NPC.
 */
function rivalesReales(state: GameState): RivalReal[] {
  const ac = state.activeCombat;
  if (!ac) return [];
  return ac.npcIds
    .map((id) => state.npcs[id])
    .filter((n): n is NonNullable<typeof n> => Boolean(n?.combate))
    .map((n) => ({
      id: n.id, name: n.name,
      // La descripción del NPC, que el resto del juego ya muestra al
      // encontrarse con alguien, no llegaba a la pantalla de combate: se
      // entraba a pelear contra un nombre y una barra, sin saber contra qué.
      // Decidir entre pelear, huir o intimidar sin eso es decidir a ciegas.
      // Reportado jugando.
      descripcion: n.description,
      estadoCombate: estadoDeCombate(n.combate!.hp, n.combate!.maxHp),
      arma: ARMA_POR_ID[n.combate!.armaId]?.nombre ?? n.combate!.armaId,
      derribado: n.combate!.derribado, agarrado: n.combate!.agarrado,
    }));
}

/**
 * Las armas que el investigador activo realmente tiene encima, más
 * «desarmado» —siempre disponible—. A diferencia del simulador, que ofrece
 * el catálogo entero: acá sólo lo que el personaje trae puesto.
 */
function armasDelInvestigador(state: GameState): ArmaDisponible[] {
  const propias = Object.values(state.items)
    .filter((i) => i.owner === state.activeInvestigator && i.carried && i.armaId && !i.roto)
    .map((i) => ARMA_POR_ID[i.armaId!])
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const armas = [ARMA_POR_ID['desarmado']!, ...propias];
  // El daño va con el arma: elegir entre «puños y patadas» y «cuchillo de
  // carnear» sin saber que uno hace 1D3 y el otro 1D4+2 es elegir a ciegas,
  // y es un dato que en la mesa está a la vista en la hoja de personaje.
  // Reportado jugando.
  return armas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    nota: a.nota,
    dano: `${a.dano.cantidad}D${a.dano.caras}${a.dano.suma ? `+${a.dano.suma}` : ''}`
      + (a.aporteBonificacion === 'completa' ? ' + corpulencia' : ''),
  }));
}

/**
 * Contra quién se puede intentar Intimidar ahora mismo. `null` si la escena
 * no configuró una salida de palabra para este combate, o si ya se cerró
 * porque el investigador sacó un arma de fuego.
 */
function intimidarDisponible(state: GameState): { npcId: string } | null {
  const sp = state.activeCombat?.salidaPacifica;
  if (!sp) return null;
  const yaDisparo = state.consequences.some((c) => c.description.includes(sp.consecuenciaDisparo.description));
  return yaDisparo ? null : { npcId: sp.npcId };
}

/** Un turno por vez, igual que el lock del servidor. */
const enCurso = new Set<string>();

/**
 * Deja presente SÓLO al rival elegido. Los otros dos están en el galpón
 * como opciones del menú, no como una emboscada: sin esto, el motor —que
 * desde el orden de asalto por DES hace pelear a TODO combatiente presente,
 * no sólo al blanco declarado— los sumaba a la pelea aunque el jugador
 * hubiera elegido pelear con uno solo. Es lo mismo que ya hace el motor
 * para una aventura de verdad, sólo que acá «presente» lo decide el menú,
 * no la escena.
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

export function createLocalApi(): GameApi {
  useStore(browserStore);

  return {
    async status(): Promise<StatusInfo> {
      return {
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
        campaignId, opening: conTrato(scenario.opening, activo(state)),
        state: sanitizeForClient(state), options: accionesDisponibles(state, scenario),
      };
    },

    async createCampaignConFicha(scenarioId, investigador, armaInicialId, ocupacionId) {
      const scenario = SCENARIOS[scenarioId as keyof typeof SCENARIOS];
      if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`);
      const campaignId = await createCampaign(
        scenario, undefined, undefined, undefined, investigador as never, armaInicialId ?? null,
        ocupacionId ?? null,
      );
      const { state } = await loadState(campaignId);
      return {
        campaignId, opening: conTrato(scenario.opening, activo(state)),
        state: sanitizeForClient(state), options: accionesDisponibles(state, scenario),
      };
    },

    async getCampaign(id) {
      const { state } = await loadState(id);
      const scenario = SCENARIOS[state.scenarioId as keyof typeof SCENARIOS];
      return {
        state: sanitizeForClient(state),
        opening: scenario ? conTrato(scenario.opening, activo(state)) : '',
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
        onEvent({ kind: 'done', data: {} });
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

    async continuarCampana(fromId, scenarioId) {
      const scenario = SCENARIOS[scenarioId as keyof typeof SCENARIOS];
      if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`);
      const { state: anterior } = await loadState(fromId);
      if (!anterior.ending) {
        throw new Error('La aventura anterior todavía no terminó.');
      }
      const campaignId = await createCampaign(scenario, undefined, undefined, {
        estadoAnterior: anterior,
        mesesTranscurridos: mesesEntre(anterior.scenarioId, scenarioId),
      });
      const { state } = await loadState(campaignId);
      return {
        campaignId, opening: conTrato(scenario.opening, activo(state)),
        state: sanitizeForClient(state), options: accionesDisponibles(state, scenario),
      };
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

    async atacar(id, npcId, armaId, mods) {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        aislarRival(turn, npcId);
        const antes = turn.state.rolls.length;
        const r = turn.executeTool('resolve_attack', {
          npc_id: npcId, weapon_id: armaId,
          apuntando: String(Boolean(mods?.apuntando)),
          punto_blanco: String(Boolean(mods?.puntoBlanco)),
          cubierto: String(Boolean(mods?.cubierto)),
          blanco_movil: String(Boolean(mods?.blancoMovil)),
        });
        await turn.commit();
        const { state } = await loadState(id);
        return {
          ok: r.ok,
          mensaje: r.message,
          state: sanitizeForClient(state),
          tiradas: state.rolls.slice(antes).map(toClientRoll),
          rivales: rivalesDe(state),
        };
      } finally {
        enCurso.delete(id);
      }
    },

    async huir(id, armaId, npcId) {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        aislarRival(turn, npcId);
        const antes = turn.state.rolls.length;
        const r = turn.executeTool('resolve_flee', { weapon_id: armaId });
        await turn.commit();
        const { state } = await loadState(id);
        return {
          ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
          tiradas: state.rolls.slice(antes).map(toClientRoll), rivales: rivalesDe(state),
        };
      } finally {
        enCurso.delete(id);
      }
    },

    async maniobra(id, npcId, tipo) {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        aislarRival(turn, npcId);
        const antes = turn.state.rolls.length;
        const r = turn.executeTool('resolve_maneuver', { npc_id: npcId, type: tipo });
        await turn.commit();
        const { state } = await loadState(id);
        return {
          ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
          tiradas: state.rolls.slice(antes).map(toClientRoll), rivales: rivalesDe(state),
        };
      } finally {
        enCurso.delete(id);
      }
    },

    async reiniciarSimulador(id) {
      // Se descarta la campaña y se abre otra: el log es append-only a
      // propósito —no hay «deshacer» en este motor— así que reiniciar es
      // empezar de nuevo, no rebobinar. Por eso devuelve el id nuevo.
      const { state: viejo } = await loadState(id);
      const inv = activo(viejo);
      await store().deleteCampaign(id);
      const campaignId = await createCampaign(
        SIMULADOR, undefined, undefined, undefined,
        // Se conserva el investigador con el que estaba probando, curado.
        inv ? ({ ...inv, derived: { ...inv.derived, hp: inv.derived.maxHp } } as never) : undefined,
      );
      const { state } = await loadState(campaignId);
      return {
        campaignId,
        ok: true,
        mensaje: 'Galpón reiniciado. Todos enteros.',
        state: sanitizeForClient(state),
        tiradas: [],
        rivales: rivalesDe(state),
      };
    },

    async estadoSimulador(id) {
      const { state } = await loadState(id);
      return { state: sanitizeForClient(state), rivales: rivalesDe(state) };
    },

    async combateEstado(id) {
      const { state } = await loadState(id);
      return {
        state: sanitizeForClient(state),
        rivales: rivalesReales(state),
        armas: armasDelInvestigador(state),
        intimidar: intimidarDisponible(state),
      };
    },

    async combateAtacar(id, npcId, armaId, mods): Promise<CombateResult> {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        const scenario = SCENARIOS[turn.state.scenarioId as keyof typeof SCENARIOS];
        const antes = turn.state.rolls.length;
        // A diferencia del simulador: NO se aísla al resto del cuarto —el
        // motor ya hace pelear a todo NPC de combate presente— y el mensaje
        // del motor se narra al historial de la aventura, no se pierde en
        // un registro local.
        const r = turn.executeTool('resolve_attack', {
          npc_id: npcId, weapon_id: armaId,
          apuntando: String(Boolean(mods?.apuntando)),
          punto_blanco: String(Boolean(mods?.puntoBlanco)),
          cubierto: String(Boolean(mods?.cubierto)),
          blanco_movil: String(Boolean(mods?.blancoMovil)),
        });
        turn.narrate(r.message.replace('RECHAZADO POR EL MOTOR: ', ''), []);
        await turn.commit();
        const { state } = await loadState(id);
        return {
          ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
          tiradas: state.rolls.slice(antes).map(toClientRoll),
          combateActivo: Boolean(state.activeCombat),
          options: scenario ? accionesDisponibles(state, scenario) : [],
          intimidar: intimidarDisponible(state),
        };
      } finally {
        enCurso.delete(id);
      }
    },

    async combateHuir(id, armaId): Promise<CombateResult> {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        const scenario = SCENARIOS[turn.state.scenarioId as keyof typeof SCENARIOS];
        const antes = turn.state.rolls.length;
        const r = turn.executeTool('resolve_flee', { weapon_id: armaId });
        turn.narrate(r.message.replace('RECHAZADO POR EL MOTOR: ', ''), []);
        await turn.commit();
        const { state } = await loadState(id);
        return {
          ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
          tiradas: state.rolls.slice(antes).map(toClientRoll),
          combateActivo: Boolean(state.activeCombat),
          options: scenario ? accionesDisponibles(state, scenario) : [],
          intimidar: intimidarDisponible(state),
        };
      } finally {
        enCurso.delete(id);
      }
    },

    async combateManiobra(id, npcId, tipo): Promise<CombateResult> {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        const scenario = SCENARIOS[turn.state.scenarioId as keyof typeof SCENARIOS];
        const antes = turn.state.rolls.length;
        const r = turn.executeTool('resolve_maneuver', { npc_id: npcId, type: tipo });
        turn.narrate(r.message.replace('RECHAZADO POR EL MOTOR: ', ''), []);
        await turn.commit();
        const { state } = await loadState(id);
        return {
          ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
          tiradas: state.rolls.slice(antes).map(toClientRoll),
          combateActivo: Boolean(state.activeCombat),
          options: scenario ? accionesDisponibles(state, scenario) : [],
          intimidar: intimidarDisponible(state),
        };
      } finally {
        enCurso.delete(id);
      }
    },

    async combateIntimidar(id, npcId): Promise<CombateResult> {
      if (enCurso.has(id)) throw new Error('Ya hay una acción en curso.');
      enCurso.add(id);
      try {
        const turn = await Turn.open(id);
        const scenario = SCENARIOS[turn.state.scenarioId as keyof typeof SCENARIOS];
        const antes = turn.state.rolls.length;
        const r = turn.executeTool('resolve_intimidate', { npc_id: npcId });
        turn.narrate(r.message.replace('RECHAZADO POR EL MOTOR: ', ''), []);
        await turn.commit();
        const { state } = await loadState(id);
        return {
          ok: r.ok, mensaje: r.message, state: sanitizeForClient(state),
          tiradas: state.rolls.slice(antes).map(toClientRoll),
          combateActivo: Boolean(state.activeCombat),
          options: scenario ? accionesDisponibles(state, scenario) : [],
          intimidar: intimidarDisponible(state),
        };
      } finally {
        enCurso.delete(id);
      }
    },
  };
}
