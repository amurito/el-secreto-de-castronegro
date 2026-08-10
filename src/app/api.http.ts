/**
 * API HTTP — habla con el servidor Node.
 *
 * Es el modo que permite que narre Claude: la clave de API vive en el `.env`
 * del servidor y nunca llega al navegador.
 */

import type { GameApi, StatusInfo, TurnEvent } from './api.ts';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

const post = (url: string, body?: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export function createHttpApi(): GameApi {
  return {
    async status() {
      const s = await json<Omit<StatusInfo, 'runtime'>>(await fetch('/api/status'));
      return { ...s, runtime: 'servidor' };
    },

    listCampaigns: async () => json(await fetch('/api/campaigns')),

    createCampaign: async (scenarioId) => json(await post('/api/campaigns', { scenarioId })),

    getCampaign: async (id) => json(await fetch(`/api/campaigns/${id}`)),

    async submitIntent(id, action, onEvent) {
      const res = await post(`/api/campaigns/${id}/intent`, { action });
      if (!res.body) throw new Error('Sin respuesta del servidor.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith('data: ')) continue;
          try { onEvent(JSON.parse(line.slice(6)) as TurnEvent); } catch { /* fragmento incompleto */ }
        }
      }
    },

    introduceInvestigator: async (id, investigatorId) =>
      json(await post(`/api/campaigns/${id}/investigador`, { investigatorId })),

    continuarCampana: async (fromId, scenarioId) =>
      json(await post(`/api/campaigns/${fromId}/continuar`, { scenarioId })),

    developmentOffer: async (id) => json(await fetch(`/api/campaigns/${id}/desarrollo`)),

    runDevelopment: async (id, autoayuda) =>
      json(await post(`/api/campaigns/${id}/desarrollo`, { autoayuda })),

    audit: async (id) => json(await fetch(`/api/campaigns/${id}/auditoria`)),

    async deleteCampaign(id) {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    },
  };
}

/**
 * ¿Hay servidor del otro lado? En un sitio estático (GitHub Pages) esto da 404
 * y el juego arranca con el motor local.
 */
export async function serverAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/status', { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}
