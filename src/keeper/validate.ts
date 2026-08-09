/**
 * VALIDADORES DE SALIDA.
 *
 * El fallo más dañino para la credibilidad del proyecto es que la narración
 * diga "fallás por poco" cuando el dado dio 89 contra 30. Este módulo contrasta
 * el texto generado contra el registro inmutable de tiradas del turno.
 *
 * Análisis Técnico v1.1 §12.2.
 */

import type { RollRecord } from '../shared/types.ts';
import { HARD_INVARIANTS } from '../canon/canon.ts';

export interface ValidationIssue {
  severity: 'hard' | 'soft';
  message: string;
}

/** Términos que no pueden aparecer en una aventura que no llegó a ese punto. */
const FORBIDDEN_TERMS: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /yog[\s-]?sothoth/i, why: 'Yog-Sothoth no puede nombrarse en esta aventura.' },
  { pattern: /\bcastronegro\b/i, why: 'Castronegro no puede nombrarse en esta aventura.' },
  { pattern: /\bbernardo\b/i, why: 'Bernardo no puede nombrarse en esta aventura.' },
  { pattern: /primer rostro/i, why: 'El Primer Rostro no puede nombrarse: está sellado.' },
  { pattern: /\bel umbral\b/i, why: 'El Umbral no puede nombrarse como tal en esta aventura.' },
  { pattern: /los mitos|mitos de cthulhu/i, why: 'El marco de los Mitos no se nombra en esta etapa.' },
];

/**
 * Contrasta los números de la narración contra las tiradas reales del turno.
 * Sólo mira números de 1 a 100 presentados como resultado de dados.
 */
export function validateNarration(
  text: string,
  rollsThisTurn: RollRecord[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Términos prohibidos por la etapa de la campaña.
  for (const f of FORBIDDEN_TERMS) {
    if (f.pattern.test(text)) {
      issues.push({ severity: 'hard', message: f.why });
    }
  }

  // 2. Números presentados como tirada que no coinciden con ninguna real.
  const dicePhrases = text.match(/\b(?:saca[s]?|obten[eé]s|tir[aá]s|resultado de|d100 de)\s+(\d{1,3})\b/gi);
  if (dicePhrases) {
    const realResults = new Set(rollsThisTurn.map((r) => r.execution.rawResult));
    for (const phrase of dicePhrases) {
      const n = Number(phrase.match(/(\d{1,3})$/)?.[1]);
      if (!Number.isNaN(n) && n >= 1 && n <= 100 && !realResults.has(n)) {
        issues.push({
          severity: 'hard',
          message:
            `La narración menciona un resultado de dados (${n}) que no corresponde a ninguna tirada ejecutada ` +
            `este turno. Tiradas reales: ${[...realResults].join(', ') || 'ninguna'}.`,
        });
      }
    }
  }

  // 3. Contradicción explícita del grado de éxito.
  for (const r of rollsThisTurn) {
    const failed = ['failure', 'fumble'].includes(r.execution.degree);
    if (failed && /\b(lo lográs|lo consegu[ií]s|con éxito|acertás|lo superás)\b/i.test(text)) {
      issues.push({
        severity: 'soft',
        message: `La tirada de ${r.commitment.skillLabel} fue ${r.execution.degree} pero la narración parece describir un éxito.`,
      });
    }
    if (!failed && /\b(fracasás|no lo lográs|fallás|no consegu[ií]s)\b/i.test(text)) {
      issues.push({
        severity: 'soft',
        message: `La tirada de ${r.commitment.skillLabel} fue ${r.execution.degree} (éxito) pero la narración parece describir un fracaso.`,
      });
    }
  }

  return issues;
}

/** Chequeo de invariantes duras sobre una afirmación que el Keeper quiere fijar. */
export function checkCanonInvariants(statement: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const s = statement.toLowerCase();
  const violations: Array<[RegExp, string]> = [
    [/bernardo\s+(cre[oó]|fabric[oó]|hizo)\s+el\s+anillo/, HARD_INVARIANTS[0]!],
    [/yog[\s-]?sothoth\s+(entreg|dio|regal)/, HARD_INVARIANTS[1]!],
    [/bernardo\s+cre[oó]\s+agua\s+blanca/, HARD_INVARIANTS[2]!],
    [/el\s+anillo\s+(controla|permite controlar)\s+el\s+tiempo/, HARD_INVARIANTS[7]!],
    [/el\s+primer\s+rostro\s+es\s+/, HARD_INVARIANTS[9]!],
  ];
  for (const [pattern, invariant] of violations) {
    if (pattern.test(s)) {
      issues.push({ severity: 'hard', message: `Viola una prohibición absoluta del canon: ${invariant}` });
    }
  }
  return issues;
}

/** Mensaje correctivo para reinyectar al modelo cuando la validación falla. */
export function correctionMessage(issues: ValidationIssue[]): string {
  return (
    'Tu narración fue rechazada por el validador del motor. Problemas:\n' +
    issues.map((i) => `· [${i.severity}] ${i.message}`).join('\n') +
    '\n\nVolvé a escribir SÓLO la narración, corrigiendo esos puntos. ' +
    'No cambies los resultados de las tiradas: son definitivos.'
  );
}
