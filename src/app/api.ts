/**
 * API DEL JUEGO — una interfaz, dos implementaciones.
 *
 *   api.http.ts    habla con el servidor Node   → puede narrar Claude
 *   api.local.ts   corre el motor en el navegador → gratis, sin servidor
 *
 * La interfaz es la misma para que `App.tsx` no sepa cuál está usando. Eso es
 * lo que permite publicar el juego como sitio estático sin tocar la interfaz.
 */

import type { ClientState } from '../server/sanitize.ts';
import type { Opcion } from '../scenario/acciones.ts';

export interface StatusInfo {
  /** 'ia' = narra Claude · 'motor' = narra el motor */
  keeperMode: 'ia' | 'motor';
  /** Dónde corre el motor. */
  runtime: 'servidor' | 'navegador';
  model?: string;
  effort?: string;
  scenarios: Array<{ id: string; title: string; premise: string }>;
}

export interface CampaignSummary {
  campaignId: string;
  title: string;
  scenarioId: string;
  createdAt: string;
  lastPlayedAt: string;
  saveIntegrity: 'sealed' | 'imported';
}

export interface AuditInfo {
  revealed: boolean;
  commitment: string;
  seed?: string;
  verification?: { ok: boolean; failures: number[] };
  message: string;
}

export interface TurnEvent {
  kind: string;
  data: unknown;
}

export interface GameApi {
  status(): Promise<StatusInfo>;
  listCampaigns(): Promise<CampaignSummary[]>;
  createCampaign(scenarioId: string): Promise<{
    campaignId: string; opening: string; state: ClientState; options: Opcion[];
  }>;
  getCampaign(id: string): Promise<{ state: ClientState; opening: string; options: Opcion[] }>;
  /** Resuelve un turno. Los eventos llegan por callback, en vivo. */
  submitIntent(id: string, action: string, onEvent: (e: TurnEvent) => void): Promise<void>;
  introduceInvestigator(id: string, investigatorId: string): Promise<{ state: ClientState }>;
  audit(id: string): Promise<AuditInfo>;
  deleteCampaign(id: string): Promise<void>;
}
