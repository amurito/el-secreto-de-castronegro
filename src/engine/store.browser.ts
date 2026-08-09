/**
 * ALMACENAMIENTO EN INDEXEDDB — navegador. Juego sin servidor.
 *
 * Dos almacenes:
 *   campanas  clave: campaignId          — metadatos, incluida la semilla
 *   eventos   clave: [campaignId, seq]   — el log
 *
 * Detalle que importa: los eventos se escriben con `add`, no con `put`.
 * `add` FALLA si la clave ya existe, así que la base de datos misma impide
 * sobrescribir un evento pasado. La invariante "el pasado es de sólo lectura"
 * deja de depender de la disciplina del código y pasa a estar en el motor de
 * almacenamiento.
 *
 * localStorage no servía: tope de ~5 MB y sin claves compuestas.
 */

import type { GameEvent } from '../shared/events.ts';
import type { CampaignId } from '../shared/types.ts';
import type { CampaignIndexEntry, EventStore } from './store.ts';

const DB_NAME = 'castronegro';
const DB_VERSION = 1;
const CAMPANAS = 'campanas';
const EVENTOS = 'eventos';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CAMPANAS)) {
        db.createObjectStore(CAMPANAS, { keyPath: 'campaignId' });
      }
      if (!db.objectStoreNames.contains(EVENTOS)) {
        db.createObjectStore(EVENTOS, { keyPath: ['campaignId', 'seq'] });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir IndexedDB'));
  });
  return dbPromise;
}

function tx<T>(
  stores: string[],
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(stores, mode);
        let result: T;
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error ?? new Error('Transacción fallida'));
        t.onabort = () => reject(t.error ?? new Error('Transacción abortada'));
        Promise.resolve(fn(t)).then((r) => { result = r; }).catch(reject);
      }),
  );
}

const wrap = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const browserStore: EventStore = {
  async createCampaign(entry) {
    await tx([CAMPANAS], 'readwrite', (t) => wrap(t.objectStore(CAMPANAS).put(entry)));
  },

  async append(campaignId, events) {
    if (events.length === 0) return;
    await tx([EVENTOS, CAMPANAS], 'readwrite', async (t) => {
      const ev = t.objectStore(EVENTOS);
      // `add`, no `put`: si el seq ya existe, la transacción falla entera.
      // Es la invariante append-only aplicada por la base de datos.
      for (const e of events) await wrap(ev.add({ ...e, campaignId }));

      const cs = t.objectStore(CAMPANAS);
      const meta = await wrap(cs.get(campaignId) as IDBRequest<CampaignIndexEntry | undefined>);
      if (meta) {
        meta.headSeq = events[events.length - 1]!.seq;
        meta.lastPlayedAt = new Date().toISOString();
        await wrap(cs.put(meta));
      }
    });
  },

  async readAll(campaignId) {
    return tx([EVENTOS], 'readonly', async (t) => {
      const range = IDBKeyRange.bound([campaignId, -Infinity], [campaignId, Infinity]);
      const all = await wrap(t.objectStore(EVENTOS).getAll(range) as IDBRequest<GameEvent[]>);
      return all.sort((a, b) => a.seq - b.seq);
    });
  },

  async getMeta(campaignId) {
    return tx([CAMPANAS], 'readonly', async (t) => {
      const m = await wrap(t.objectStore(CAMPANAS).get(campaignId) as IDBRequest<CampaignIndexEntry | undefined>);
      return m ?? null;
    });
  },

  async updateMeta(campaignId, patch) {
    await tx([CAMPANAS], 'readwrite', async (t) => {
      const cs = t.objectStore(CAMPANAS);
      const cur = await wrap(cs.get(campaignId) as IDBRequest<CampaignIndexEntry | undefined>);
      if (!cur) return;
      await wrap(cs.put({ ...cur, ...patch }));
    });
  },

  async listCampaigns() {
    return tx([CAMPANAS], 'readonly', async (t) => {
      const all = await wrap(t.objectStore(CAMPANAS).getAll() as IDBRequest<CampaignIndexEntry[]>);
      return all.sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));
    });
  },

  async deleteCampaign(campaignId) {
    await tx([EVENTOS, CAMPANAS], 'readwrite', async (t) => {
      await wrap(t.objectStore(CAMPANAS).delete(campaignId));
      const range = IDBKeyRange.bound([campaignId, -Infinity], [campaignId, Infinity]);
      await wrap(t.objectStore(EVENTOS).delete(range));
    });
  },
};

/** ¿Hay IndexedDB acá? (modo incógnito de algunos navegadores lo bloquea) */
export function indexedDbAvailable(): boolean {
  try { return typeof indexedDB !== 'undefined'; } catch { return false; }
}
