/**
 * QUÉ GRADO DIO LA TIRADA — leído del resultado real del motor, no adivinado.
 *
 * `request_roll` devuelve `emit: { kind: 'roll', data: ClientRoll }` con el
 * grado exacto que calculó `rules/dice.ts` — crítico, extremo, difícil,
 * regular, fracaso o pifia. Antes, el resolvedor social y el de escenas sólo
 * miraban si el mensaje de texto decía «SUPERA la dificultad», así que todo
 * lo que no fuera un fracaso liso y llano era invisible: un crítico y un éxito
 * regular se veían exactamente igual. Leer el dato en vez de parsear el
 * mensaje es lo que permite que una escena reaccione distinto a una pifia.
 *
 * Si por lo que sea el `emit` no viniera —una herramienta que cambia de forma,
 * un mock de prueba incompleto— se cae al mismo parseo de texto que había
 * antes, para no romper nada que ya funcionaba.
 */

import type { SuccessDegree } from '../shared/types.ts';

interface RespuestaConEmit {
  message: string;
  emit?: { kind: string; data: unknown };
}

export function huboExito(r: RespuestaConEmit): boolean {
  return /SUPERA la dificultad/.test(r.message) && !/NO SUPERA/.test(r.message);
}

const GRADOS: SuccessDegree[] = ['critical', 'extreme', 'hard', 'regular', 'failure', 'fumble'];

export function gradoDeLaTirada(r: RespuestaConEmit): SuccessDegree {
  if (r.emit?.kind === 'roll') {
    const d = (r.emit.data as { degree?: string }).degree;
    if (d && (GRADOS as string[]).includes(d)) return d as SuccessDegree;
  }
  // Reserva: el mensaje del motor dice «Grado: PIFIA», «Grado: ÉXITO CRÍTICO», etc.
  if (/Grado: PIFIA/.test(r.message)) return 'fumble';
  if (/Grado: ÉXITO CRÍTICO/.test(r.message)) return 'critical';
  if (/Grado: ÉXITO EXTREMO/.test(r.message)) return 'extreme';
  if (/Grado: ÉXITO DIFÍCIL/.test(r.message)) return 'hard';
  if (/Grado: ÉXITO REGULAR/.test(r.message)) return 'regular';
  return 'failure';
}
