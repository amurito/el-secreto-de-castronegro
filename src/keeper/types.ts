/**
 * Tipos compartidos entre los dos Keepers.
 *
 * Viven acá y no en keeper.ts a propósito: `offline.ts` no debe tener ninguna
 * arista con el SDK de Anthropic. Si estos tipos siguieran en keeper.ts, un
 * `import type` mal escrito bastaría para que el empaquetador del navegador
 * arrastrara el SDK entero a un bundle que no lo usa.
 */

export interface KeeperEmit {
  (event: { kind: string; data: unknown }): void;
}

export interface KeeperCost {
  inputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  outputTokens: number;
}

export interface KeeperResult {
  narration: string;
  options: string[];
  /** false = lo resolvió y narró el motor; true = narró Claude. */
  usedModel: boolean;
  cost?: KeeperCost;
}
