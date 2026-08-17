/**
 * VALORES DERIVADOS — CoC 7e.
 * PURO. Bonificación de daño y Build (STR+SIZ), verificadas contra el manual
 * licenciado (Tabla 1: Damage Bonus and Build) — ya no son de memoria.
 */

import type { Characteristics, DerivedStats } from '../shared/types.ts';
import { efectoEdad } from './creacion.ts';

export function computeDerived(
  ch: Characteristics,
  opts: { luck: number; mythos?: number; edad?: number } = { luck: 50 },
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
    move: computeMove(ch, opts.edad ?? 30),
    damageBonus: damageBonus(ch.STR + ch.SIZ),
    build: build(ch.STR + ch.SIZ),
  };
}

/**
 * MOV base (p. 34) menos la resta por edad, que antes no se aplicaba nunca:
 * `computeDerived` no recibía la edad, así que un investigador de sesenta
 * corría igual que uno de treinta. Sin edad conocida (pregenerados viejos,
 * llamadas sin `opts.edad`) se asume treinta: sin resta, que es el valor por
 * defecto más seguro cuando no se sabe.
 */
function computeMove(ch: Characteristics, edad: number): number {
  let base: number;
  if (ch.DEX < ch.SIZ && ch.STR < ch.SIZ) base = 7;
  else if (ch.STR > ch.SIZ && ch.DEX > ch.SIZ) base = 9;
  else base = 8;
  return Math.max(1, base - efectoEdad(edad).restaMovimiento);
}

/**
 * Bonificación de daño y Build por STR+SIZ (Tabla 1). Comparten los mismos
 * tramos, así que una sola tabla evita que las dos funciones puedan
 * desincronizarse entre sí.
 *
 * Por encima de 524 no hay un tramo fijo: se suma +1D6 al daño y +1 a Build
 * por cada 80 puntos adicionales o fracción — regla del propio manual, no
 * una extrapolación nuestra.
 */
const DAMAGE_BONUS_TABLE: Array<{ hasta: number; db: string; build: number }> = [
  { hasta: 64, db: '-2', build: -2 },
  { hasta: 84, db: '-1', build: -1 },
  { hasta: 124, db: '0', build: 0 },
  { hasta: 164, db: '+1D4', build: 1 },
  { hasta: 204, db: '+1D6', build: 2 },
  { hasta: 284, db: '+2D6', build: 3 },
  { hasta: 364, db: '+3D6', build: 4 },
  { hasta: 444, db: '+4D6', build: 5 },
  { hasta: 524, db: '+5D6', build: 6 },
];

function tramoDeDano(strPlusSiz: number): { db: string; build: number } {
  for (const tramo of DAMAGE_BONUS_TABLE) {
    if (strPlusSiz <= tramo.hasta) return tramo;
  }
  const extra = Math.ceil((strPlusSiz - 524) / 80);
  return { db: `+${5 + extra}D6`, build: 6 + extra };
}

function damageBonus(strPlusSiz: number): string {
  return tramoDeDano(strPlusSiz).db;
}

function build(strPlusSiz: number): number {
  return tramoDeDano(strPlusSiz).build;
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
