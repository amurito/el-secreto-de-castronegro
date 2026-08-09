/**
 * PROTOCOLO CLIENTE ↔ SERVIDOR.
 *
 * Una tirada viaja al cliente por dos caminos: en vivo por SSE durante el turno,
 * y dentro del estado sanitizado al final. Los dos tienen que producir
 * EXACTAMENTE la misma forma, o la interfaz se rompe en uno de los dos.
 * Por eso el mapeo vive acá y lo importan ambos.
 */

import type { RollRecord } from './types.ts';

export interface ClientRoll {
  id: string;
  seq: number;
  skill: string;
  base: number;
  difficulty: string;
  modifiers: Array<{ kind: string; count: number; reason: string }>;
  reason: string;
  dice: number[];
  result: number;
  degree: string;
  thresholds: { regular: number; hard: number; extreme: number };
  proofIndex: number;
  hmac: string;
  at: string;
}

export function toClientRoll(r: RollRecord): ClientRoll {
  return {
    id: r.id,
    seq: r.seq,
    skill: r.commitment.skillLabel,
    base: r.commitment.baseValue,
    difficulty: r.commitment.difficulty,
    modifiers: r.commitment.modifiers,
    reason: r.commitment.reason,
    dice: r.execution.dice,
    result: r.execution.rawResult,
    degree: r.execution.degree,
    thresholds: r.execution.thresholds,
    proofIndex: r.execution.proof.index,
    hmac: r.execution.proof.hmac,
    at: r.execution.executedAt,
  };
}
