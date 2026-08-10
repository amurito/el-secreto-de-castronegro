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
import type { DevelopmentReport } from '../engine/engine.ts';
import type { Marca } from '../rules/desarrollo.ts';

export interface DevelopmentOffer {
  marcas: Marca[];
  aspectos: Array<{ id: string; kind: string; text: string; esConexionClave: boolean }>;
  cordura: number;
  maxCordura: number;
}

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
  /** Qué encontraría la fase de desarrollo ahora. No ejecuta nada. */
  developmentOffer(id: string): Promise<DevelopmentOffer>;
  /** Ejecuta la fase. `autoayuda` es la única decisión del jugador. */
  runDevelopment(
    id: string,
    autoayuda?: { aspectId: string; usarConexionClave: boolean },
  ): Promise<{ report: DevelopmentReport; state: ClientState }>;
  audit(id: string): Promise<AuditInfo>;
  deleteCampaign(id: string): Promise<void>;
}
