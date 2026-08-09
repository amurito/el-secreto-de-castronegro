/**
 * EVENT STORE — interfaz y registro.
 *
 * Este archivo NO importa nada de Node ni del navegador: sólo declara el
 * contrato. Las implementaciones viven aparte y se registran al arrancar:
 *
 *   store.node.ts     archivos JSONL   (servidor, pruebas)
 *   store.browser.ts  IndexedDB        (juego 100% en el navegador)
 *
 * Esa separación es lo que permite que el mismo motor se empaquete para el
 * navegador sin arrastrar `node:fs`.
 *
 * IRONMAN: una campaña = un log = un autoguardado autoritativo. Sin ranuras.
 * Es lo único coherente con muerte permanente y "no rebobinar" (v0.9 §14-15).
 */

import type { GameEvent } from '../shared/events.ts';
import type { CampaignId } from '../shared/types.ts';

export interface CampaignIndexEntry {
  campaignId: CampaignId;
  title: string;
  scenarioId: string;
  createdAt: string;
  lastPlayedAt: string;
  headSeq: number;
  /** La semilla nunca se serializa hacia la interfaz antes del final. */
  seed: string;
  seedCommitment: string;
  saveIntegrity: 'sealed' | 'imported';
}

/**
 * Todas las operaciones son asíncronas porque IndexedDB lo es. El motor sigue
 * siendo síncrono: carga el log una vez, opera en memoria, y persiste al final
 * del turno. Lo asíncrono queda en los bordes.
 */
export interface EventStore {
  createCampaign(entry: CampaignIndexEntry): Promise<void>;
  /** Sólo agrega. No existe update. No existe delete. La ausencia es la garantía. */
  append(campaignId: CampaignId, events: GameEvent[]): Promise<void>;
  readAll(campaignId: CampaignId): Promise<GameEvent[]>;
  getMeta(campaignId: CampaignId): Promise<CampaignIndexEntry | null>;
  updateMeta(campaignId: CampaignId, patch: Partial<CampaignIndexEntry>): Promise<void>;
  listCampaigns(): Promise<CampaignIndexEntry[]>;
  deleteCampaign(campaignId: CampaignId): Promise<void>;
}

let active: EventStore | null = null;

export function useStore(store: EventStore): void {
  active = store;
}

export function store(): EventStore {
  if (!active) {
    throw new Error(
      'No hay almacenamiento configurado. Llamá a useStore() con la implementación ' +
      'de Node (store.node.ts) o la del navegador (store.browser.ts) antes de usar el motor.',
    );
  }
  return active;
}
