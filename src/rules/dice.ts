/**
 * REGLAS DE TIRADA — Call of Cthulhu 7ª edición como sistema de referencia.
 *
 * Este módulo es PURO: no tira dados, no toca disco, no llama a nada.
 * Recibe los dados ya lanzados (por el RNG del motor) y calcula el resultado.
 * Esa pureza es lo que permite testear el reglamento entero sin infraestructura.
 *
 * ⚠ VERIFICAR CONTRA EL MANUAL LICENCIADO antes de dar por buenos:
 *   - el umbral exacto de pifia según el valor de habilidad
 *   - la tabla de bonificación de daño por STR+SIZ
 *   - la tabla de Build
 * El Análisis Técnico v1.1 §8.1 lo detalla. Acá se implementa la MECÁNICA;
 * ninguna tabla propietaria se transcribe.
 */

import type { Difficulty, SuccessDegree, RollModifier } from '../shared/types.ts';

export interface Thresholds {
  regular: number;
  hard: number;
  extreme: number;
}

/** Umbrales de éxito para un valor de habilidad. */
export function thresholdsFor(baseValue: number): Thresholds {
  return {
    regular: baseValue,
    hard: Math.floor(baseValue / 2),
    extreme: Math.floor(baseValue / 5),
  };
}

/**
 * Combina el dado de unidades con uno o más dados de decenas.
 * Bonificación → se toma el resultado más bajo. Penalización → el más alto.
 *
 * `unitsDie` y cada `tensDie` van de 0 a 9.
 * 0 decenas + 0 unidades = 100.
 */
export function combineD100(
  unitsDie: number,
  tensDice: number[],
  mode: 'none' | 'bonus' | 'penalty',
): number {
  const candidates = tensDice.map((t) => {
    const v = t * 10 + unitsDie;
    return v === 0 ? 100 : v;
  });
  if (candidates.length === 0) return unitsDie === 0 ? 100 : unitsDie;
  if (mode === 'bonus') return Math.min(...candidates);
  if (mode === 'penalty') return Math.max(...candidates);
  return candidates[0]!;
}

/** Cuántos dados de decenas hacen falta y en qué modo, según los modificadores. */
export function tensDiceNeeded(modifiers: RollModifier[]): {
  count: number;
  mode: 'none' | 'bonus' | 'penalty';
} {
  let net = 0;
  for (const m of modifiers) {
    net += m.kind === 'bonus_die' ? m.count : -m.count;
  }
  if (net === 0) return { count: 1, mode: 'none' };
  const mode = net > 0 ? 'bonus' : 'penalty';
  // CoC 7e: máximo 2 dados de bonificación o penalización.
  const extra = Math.min(Math.abs(net), 2);
  return { count: 1 + extra, mode };
}

/** ¿Es pifia? Con habilidad < 50, 96-99 también pifian. 100 siempre pifia. */
export function isFumble(result: number, baseValue: number): boolean {
  if (result === 100) return true;
  if (baseValue < 50 && result >= 96) return true;
  return false;
}

/** Grado alcanzado por el resultado bruto, con independencia de la dificultad pedida. */
export function degreeFor(result: number, baseValue: number): SuccessDegree {
  if (result === 1) return 'critical';
  if (isFumble(result, baseValue)) return 'fumble';
  const t = thresholdsFor(baseValue);
  if (result <= t.extreme) return 'extreme';
  if (result <= t.hard) return 'hard';
  if (result <= t.regular) return 'regular';
  return 'failure';
}

const DEGREE_RANK: Record<SuccessDegree, number> = {
  fumble: -1,
  failure: 0,
  regular: 1,
  hard: 2,
  extreme: 3,
  critical: 4,
};

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  regular: 1,
  hard: 2,
  extreme: 3,
};

/** ¿El grado alcanzado satisface la dificultad exigida? */
export function meetsDifficulty(degree: SuccessDegree, difficulty: Difficulty): boolean {
  return DEGREE_RANK[degree] >= DIFFICULTY_RANK[difficulty];
}

export const DEGREE_LABEL: Record<SuccessDegree, string> = {
  critical: 'ÉXITO CRÍTICO',
  extreme: 'ÉXITO EXTREMO',
  hard: 'ÉXITO DIFÍCIL',
  regular: 'ÉXITO REGULAR',
  failure: 'FRACASO',
  fumble: 'PIFIA',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  regular: 'Regular',
  hard: 'Difícil',
  extreme: 'Extrema',
};

/**
 * Un Push Roll sólo es legal sobre una tirada fallida que no haya sido
 * pusheada antes, y exige una justificación diegética. CoC 7e: fallar el push
 * tiene consecuencias agravadas — eso lo decide la escena, no este módulo.
 */
export function canPush(previousDegree: SuccessDegree, alreadyPushed: boolean): boolean {
  if (alreadyPushed) return false;
  return previousDegree === 'failure';
}
