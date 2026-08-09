/**
 * VALORES DERIVADOS — CoC 7e.
 * PURO. Las tablas propietarias (bonificación de daño, Build) están marcadas
 * para verificación contra el manual licenciado.
 */

import type { Characteristics, DerivedStats } from '../shared/types.ts';

export function computeDerived(
  ch: Characteristics,
  opts: { luck: number; mythos?: number } = { luck: 50 },
): DerivedStats {
  const maxHp = Math.floor((ch.CON + ch.SIZ) / 10);
  const maxMp = Math.floor(ch.POW / 5);
  const mythos = opts.mythos ?? 0;
  const maxSan = 99 - mythos;

  return {
    hp: maxHp,
    maxHp,
    san: ch.POW,
    maxSan,
    mp: maxMp,
    maxMp,
    luck: opts.luck,
    move: computeMove(ch),
    damageBonus: damageBonus(ch.STR + ch.SIZ),
    build: build(ch.STR + ch.SIZ),
  };
}

function computeMove(ch: Characteristics): number {
  if (ch.DEX < ch.SIZ && ch.STR < ch.SIZ) return 7;
  if (ch.STR > ch.SIZ && ch.DEX > ch.SIZ) return 9;
  return 8;
}

/** ⚠ Tabla de referencia de CoC 7e — verificar contra el manual licenciado. */
function damageBonus(strPlusSiz: number): string {
  if (strPlusSiz <= 64) return '-2';
  if (strPlusSiz <= 84) return '-1';
  if (strPlusSiz <= 124) return '0';
  if (strPlusSiz <= 164) return '+1D4';
  return '+1D6';
}

/** ⚠ Tabla de referencia de CoC 7e — verificar contra el manual licenciado. */
function build(strPlusSiz: number): number {
  if (strPlusSiz <= 64) return -2;
  if (strPlusSiz <= 84) return -1;
  if (strPlusSiz <= 124) return 0;
  if (strPlusSiz <= 164) return 1;
  return 2;
}

/** Estado físico legible, para la ficha. */
export function describeHealth(d: DerivedStats): string {
  if (d.hp <= 0) return 'Inconsciente o peor';
  const ratio = d.hp / d.maxHp;
  if (ratio <= 0.5) return 'Herida grave';
  if (ratio < 1) return 'Herido';
  return 'Ileso';
}

/** Estado mental legible, para la ficha. */
export function describeSanity(d: DerivedStats): string {
  if (d.san <= 0) return 'Locura permanente';
  const ratio = d.san / d.maxSan;
  if (ratio <= 0.2) return 'Al borde';
  if (ratio <= 0.5) return 'Sacudido';
  if (ratio <= 0.8) return 'Tenso';
  return 'Entero';
}
