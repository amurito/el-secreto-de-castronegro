/**
 * API DEL JUEGO — una interfaz, dos implementaciones.
 *
 *   api.http.ts    habla con el servidor Node   → puede narrar Claude
 *   api.local.ts   corre el motor en el navegador → gratis, sin servidor
 *
 * La interfaz es la misma para que `App.tsx` no sepa cuál está usando. Eso es
 * lo que permite publicar el juego como sitio estático sin tocar la interfaz.
 */

import type { ClientState } from './sanitize.ts';
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
  /** Crea la campaña con un investigador armado por el jugador. */
  createCampaignConFicha(scenarioId: string, investigador: unknown): Promise<{
    campaignId: string; opening: string; state: ClientState; options: Opcion[];
  }>;
  getCampaign(id: string): Promise<{ state: ClientState; opening: string; options: Opcion[] }>;
  /** Resuelve un turno. Los eventos llegan por callback, en vivo. */
  submitIntent(id: string, action: string, onEvent: (e: TurnEvent) => void): Promise<void>;
  introduceInvestigator(id: string, investigatorId: string): Promise<{ state: ClientState }>;
  /**
   * Encadena: crea la aventura siguiente heredando el investigador y lo que el
   * mundo recuerda de la anterior. Sólo tiene sentido sobre una campaña cerrada.
   */
  continuarCampana(fromId: string, scenarioId: string): Promise<{
    campaignId: string; opening: string; state: ClientState; options: Opcion[];
  }>;
  /** Qué encontraría la fase de desarrollo ahora. No ejecuta nada. */
  developmentOffer(id: string): Promise<DevelopmentOffer>;
  /** Ejecuta la fase. `autoayuda` es la única decisión del jugador. */
  runDevelopment(
    id: string,
    autoayuda?: { aspectId: string; usarConexionClave: boolean },
  ): Promise<{ report: DevelopmentReport; state: ClientState }>;
  audit(id: string): Promise<AuditInfo>;
  deleteCampaign(id: string): Promise<void>;
  /**
   * Un asalto contra alguien que puede pelear. Existe aparte de `submitIntent`
   * porque el simulador no narra: muestra los dados y los números crudos, que
   * es lo único que sirve para decidir si las reglas se sienten bien.
   */
  atacar(id: string, npcId: string, armaId: string, mods?: ModsDeFuego): Promise<AttackResult>;
  /**
   * Salir de la pelea a mitad de asalto: cada rival en pie se lleva un golpe
   * de oportunidad. `npcId` es contra quién se estaba peleando —en el
   * simulador, el elegido: los otros dos ni están en el cuarto.
   */
  huir(id: string, armaId: string, npcId: string): Promise<AttackResult>;
  /** Una maniobra contra alguien que puede pelear: desarmar, derribar, sujetar. */
  maniobra(id: string, npcId: string, tipo: 'desarmar' | 'derribar' | 'sujetar'): Promise<AttackResult>;
  /**
   * Deja el galpón como estaba: rivales enteros, investigador curado.
   *
   * DEVUELVE UN `campaignId` NUEVO, y quien llama tiene que quedárselo. El log
   * de este motor es append-only y no existe «deshacer»: reiniciar no rebobina
   * la campaña, abre otra. La anterior se borra, así que seguir usando el id
   * viejo después de esto no encuentra nada.
   */
  reiniciarSimulador(id: string): Promise<AttackResult & { campaignId: string }>;
  /** Los rivales del galpón y sus PV, para pintar la pantalla al entrar. */
  estadoSimulador(id: string): Promise<{ state: ClientState; rivales: Rival[] }>;
}

export interface Rival {
  id: string; name: string; hp: number; maxHp: number; arma: string;
  derribado?: boolean; agarrado?: boolean;
}

/** Sólo importan con arma de fuego; el motor los ignora en cuerpo a cuerpo. */
export interface ModsDeFuego {
  apuntando?: boolean;
  puntoBlanco?: boolean;
  cubierto?: boolean;
  blancoMovil?: boolean;
}

export interface AttackResult {
  ok: boolean;
  mensaje: string;
  state: ClientState;
  /** Las tiradas de ESTE asalto, para mostrarlas al lado del resultado. */
  tiradas: unknown[];
  rivales: Rival[];
}
