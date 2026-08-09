/**
 * MECÁNICA DEL UMBRAL — extensión propia sobre CoC 7e (v0.9 §7).
 * PURO. Todas las constantes viven en umbral.config.ts.
 */

import type { UmbralState, UmbralThreshold, SkillId, CharacteristicId } from '../shared/types.ts';
import {
  EXPOSURE_THRESHOLDS,
  MAX_EXPOSURE_PER_TURN,
  MAX_STABILITY_RECOVERY_PER_SCENE,
  STABILITY_PENALTY_TIERS,
  STABILITY_AFFECTED_SKILLS,
  SAN_EXTRA_LOSS_BY_EXPOSURE,
  RENDIMIENTO_POR_REPETICION,
  RENDIMIENTO_MINIMO,
} from './umbral.config.ts';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface ExposureResult {
  from: number;
  to: number;
  applied: number;
  /** Lo que habría dado sin rendimientos decrecientes. */
  beforeDecay: number;
  /** Cuántas veces esta fuente ya había dado exposición antes de ésta. */
  timesBefore: number;
  /** Umbrales cruzados por este incremento. Irreversibles. */
  newThresholds: UmbralThreshold[];
}

/** Cuántas veces esta fuente ya rindió exposición. */
export function timesExposedTo(state: UmbralState, source: string): number {
  return state.exposureEvents.filter((e) => e.source === source).length;
}

/**
 * Cuánto rinde una fuente que ya rindió `veces` veces.
 *
 * Redondea hacia arriba y respeta un piso mientras el factor no sea cero: si
 * la fuente todavía cuenta, cuenta al menos un punto. Sin eso, una fuente de 2
 * se apagaría antes que una de 18 sólo por redondeo, y ese orden no lo habría
 * decidido nadie.
 */
export function decayedAmount(amount: number, veces: number): number {
  const tabla = RENDIMIENTO_POR_REPETICION;
  const factor = tabla[Math.min(veces, tabla.length - 1)] ?? 0;
  if (factor <= 0) return 0;
  return Math.max(RENDIMIENTO_MINIMO, Math.ceil(amount * factor));
}

export function applyExposure(
  state: UmbralState,
  amount: number,
  source: string,
): ExposureResult {
  const beforeDecay = clamp(amount, 0, MAX_EXPOSURE_PER_TURN);
  const timesBefore = timesExposedTo(state, source);
  const applied = clamp(decayedAmount(beforeDecay, timesBefore), 0, MAX_EXPOSURE_PER_TURN);

  const from = state.exposure;
  const to = clamp(from + applied, 0, 100);

  const newThresholds = EXPOSURE_THRESHOLDS.filter(
    (t) => to >= t.at && from < t.at && !state.thresholdsCrossed.includes(t.threshold),
  ).map((t) => t.threshold);

  return { from, to, applied, beforeDecay, timesBefore, newThresholds };
}

export interface StabilityResult {
  from: number;
  to: number;
  applied: number;
}

export function applyStabilityLoss(state: UmbralState, amount: number): StabilityResult {
  const from = state.stability;
  const to = clamp(from - Math.abs(amount), 0, 100);
  return { from, to, applied: from - to };
}

export function applyStabilityRecovery(state: UmbralState, amount: number): StabilityResult {
  const capped = clamp(Math.abs(amount), 0, MAX_STABILITY_RECOVERY_PER_SCENE);
  const from = state.stability;
  const to = clamp(from + capped, 0, 100);
  return { from, to, applied: to - from };
}

/** Dados de penalización por baja estabilidad, para habilidades afectadas. */
export function stabilityPenaltyDice(
  state: UmbralState,
  skill: SkillId | CharacteristicId,
): number {
  if (!STABILITY_AFFECTED_SKILLS.includes(String(skill).toLowerCase())) return 0;
  let dice = 0;
  for (const tier of STABILITY_PENALTY_TIERS) {
    if (state.stability < tier.below) dice = Math.max(dice, tier.penaltyDice);
  }
  return dice;
}

/**
 * Pérdida extra de SAN por exposición alta.
 * NO es conversión de exposición en SAN: es que el horror tiene dónde agarrarse.
 */
export function extraSanLossFromExposure(state: UmbralState): number {
  let extra = 0;
  for (const tier of SAN_EXTRA_LOSS_BY_EXPOSURE) {
    if (state.exposure > tier.aboveExposure) extra = Math.max(extra, tier.extraSanLoss);
  }
  return extra;
}

export function thresholdInfo(t: UmbralThreshold) {
  return EXPOSURE_THRESHOLDS.find((x) => x.threshold === t)!;
}

/** Descripción textual del estado, para la ficha y para el contexto del Keeper. */
export function describeUmbral(state: UmbralState): string {
  const crossed = state.thresholdsCrossed.map((t) => thresholdInfo(t).label);
  const parts: string[] = [
    `Exposición ${state.exposure}/100`,
    `Estabilidad ${state.stability}/100`,
  ];
  if (crossed.length) parts.push(`Umbrales cruzados: ${crossed.join(', ')}`);
  if (state.perceptualAnomalies.length) {
    parts.push(`Anomalías activas: ${state.perceptualAnomalies.map((a) => a.description).join('; ')}`);
  }
  return parts.join(' · ');
}

export function emptyUmbralState(): UmbralState {
  return {
    exposure: 0,
    stability: 100,
    exposureEvents: [],
    thresholdsCrossed: [],
    perceptualAnomalies: [],
  };
}
