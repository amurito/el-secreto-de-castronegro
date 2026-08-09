/**
 * ALMACENAMIENTO EN ARCHIVOS — Node. Servidor y pruebas.
 *
 * Un log de eventos es literalmente un archivo al que sólo se le agregan
 * líneas, así que JSONL es la forma correcta y además evita dependencias
 * nativas (better-sqlite3 necesita compilador de C++ en Windows).
 *
 * Este archivo NO debe importarse desde código que se empaquete para el
 * navegador: arrastra `node:fs`.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { GameEvent } from '../shared/events.ts';
import type { CampaignId } from '../shared/types.ts';
import type { CampaignIndexEntry, EventStore } from './store.ts';

const DATA_DIR = join(process.cwd(), 'partidas');

const ensureDir = (p: string) => { if (!existsSync(p)) mkdirSync(p, { recursive: true }); };
const logPath = (id: CampaignId) => join(DATA_DIR, id, 'eventos.jsonl');
const metaPath = (id: CampaignId) => join(DATA_DIR, id, 'campana.json');

function readMeta(id: CampaignId): CampaignIndexEntry | null {
  const p = metaPath(id);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')) as CampaignIndexEntry; } catch { return null; }
}

export const fileStore: EventStore = {
  async createCampaign(entry) {
    ensureDir(join(DATA_DIR, entry.campaignId));
    writeFileSync(metaPath(entry.campaignId), JSON.stringify(entry, null, 2), 'utf8');
    if (!existsSync(logPath(entry.campaignId))) writeFileSync(logPath(entry.campaignId), '', 'utf8');
  },

  async append(campaignId, events) {
    if (events.length === 0) return;
    const p = logPath(campaignId);
    ensureDir(dirname(p));
    appendFileSync(p, events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    const last = events[events.length - 1]!;
    await this.updateMeta(campaignId, { headSeq: last.seq, lastPlayedAt: new Date().toISOString() });
  },

  async readAll(campaignId) {
    const p = logPath(campaignId);
    if (!existsSync(p)) return [];
    const raw = readFileSync(p, 'utf8');
    if (!raw.trim()) return [];
    const out: GameEvent[] = [];
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      // Una línea corrupta no puede tirar abajo la campaña entera.
      try { out.push(JSON.parse(t) as GameEvent); }
      catch { console.error(`[store] línea ilegible en ${campaignId}, se omite`); }
    }
    return out;
  },

  async getMeta(campaignId) { return readMeta(campaignId); },

  async updateMeta(campaignId, patch) {
    const cur = readMeta(campaignId);
    if (!cur) return;
    writeFileSync(metaPath(campaignId), JSON.stringify({ ...cur, ...patch }, null, 2), 'utf8');
  },

  async listCampaigns() {
    ensureDir(DATA_DIR);
    const out: CampaignIndexEntry[] = [];
    for (const e of readdirSync(DATA_DIR, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const meta = readMeta(e.name);
      if (meta) out.push(meta);
    }
    return out.sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));
  },

  async deleteCampaign(campaignId) {
    rmSync(join(DATA_DIR, campaignId), { recursive: true, force: true });
  },
};
