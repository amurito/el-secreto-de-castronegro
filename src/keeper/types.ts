/**
 * Tipos del turno que resuelve el motor.
 *
 * Antes se llamaban «tipos compartidos entre los dos Keepers»: había un
 * segundo Keeper que narraba con Claude, y estos tipos vivían acá para que
 * `offline.ts` no tuviera ninguna arista con el SDK de Anthropic. Ese camino
 * se eliminó por completo —el juego es determinístico y la prosa está escrita
 * a mano en el contenido de cada aventura— así que hoy queda un solo Keeper y
 * estos son sus tipos.
 */

import type { Opcion } from '../scenario/acciones.ts';

export type { Opcion };

export interface KeeperEmit {
  (event: { kind: string; data: unknown }): void;
}

export interface KeeperResult {
  narration: string;
  /**
   * Las acciones disponibles después de este turno. Las calcula el MOTOR desde
   * el estado (scenario/acciones.ts): por eso nunca ofrecen algo ya hecho y
   * por eso aparecen solas al desbloquearse.
   */
  options: Opcion[];
}
