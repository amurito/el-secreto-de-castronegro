/**
 * RNG VERIFICABLE — Análisis Técnico v1.1 §8.5
 *
 * El motor es el ÚNICO dueño del azar. El modelo de lenguaje nunca genera un
 * número que cuente. Además, cada tirada es reproducible y auditable:
 *
 *   Al crear la campaña:
 *     seed       = 32 bytes aleatorios   (servidor, nunca al cliente)
 *     commitment = SHA-256(seed)         (SÍ al cliente, se muestra)
 *
 *   En cada tirada N:
 *     hmac = HMAC-SHA256(seed, "roll:" + N)
 *     d10  = bytes del hmac
 *
 *   Al cerrar la campaña:
 *     se revela seed → el jugador recomputa TODAS las tiradas
 *     y verifica que SHA-256(seed) === commitment
 *
 * Esto convierte "confiá en mí" en "verificalo". Para un juego cuya tesis es
 * que el dado es real, es la afirmación más fuerte disponible.
 *
 * La semilla se revela SÓLO al final: revelarla antes permitiría predecir
 * tiradas futuras.
 */

import { sha256, hmacSha256, utf8, toHex, fromHex, randomHex } from './crypto.ts';

export function generateSeed(): string {
  return randomHex(32);
}

export function commitmentOf(seedHex: string): string {
  return toHex(sha256(utf8(seedHex)));
}

export function verifyCommitment(seedHex: string, commitment: string): boolean {
  return commitmentOf(seedHex) === commitment;
}

/** HMAC determinista para el índice de tirada dado. */
export function hmacForIndex(seedHex: string, index: number): string {
  return toHex(hmacSha256(utf8(seedHex), utf8(`roll:${index}`)));
}

/**
 * Deriva `count` dados de 10 caras (0-9) del HMAC del índice.
 * Determinista: mismo seed + mismo índice → mismos dados, siempre.
 */
export function dieValues(seedHex: string, index: number, count: number): {
  dice: number[];
  hmac: string;
} {
  const hmac = hmacForIndex(seedHex, index);
  const buf = fromHex(hmac);
  const dice: number[] = [];
  for (let i = 0; i < count; i++) {
    // Un byte por dado. 256 no es múltiplo de 10, pero el sesgo resultante
    // (~0.4% sobre los valores 0-5) es irrelevante frente al ruido de una mesa.
    // Si alguna vez importa, acá va rechazo por muestreo.
    dice.push(buf[i % buf.length]! % 10);
  }
  return { dice, hmac };
}

/**
 * Dados de daño de caras arbitrarias (D3, D4, D6, D8, D10), de la MISMA
 * cadena verificable que las tiradas de habilidad.
 *
 * Va por una etiqueta propia (`damage:` en vez de `roll:`) para que los dos
 * flujos no se pisen: el índice N de una tirada de habilidad y el índice N de
 * un daño derivan de HMAC distintos. Sin eso, dos dados del mismo índice
 * darían el mismo número, y el daño de un ataque estaría correlacionado con
 * la tirada que lo produjo — un sesgo invisible y difícil de encontrar.
 *
 * Rechazo por muestreo: a diferencia de `dieValues`, acá el sesgo sí importa.
 * Un D3 sacado de `byte % 3` favorece el 1 casi un 1% sobre el 3, y el daño
 * se acumula tirada tras tirada. Se descartan los bytes de la cola que no
 * entran en un múltiplo exacto de `caras`.
 */
export function damageDice(
  seedHex: string, index: number, ranura: string, caras: number, count: number,
): { dice: number[]; hmac: string } {
  // `ranura` separa los dados que se tiran en el MISMO índice: el del arma y
  // el de la corpulencia. Sin ella, un facón 1D8 con bonificación +1D8
  // sacaría dos veces el mismo número, siempre.
  const hmac = toHex(hmacSha256(utf8(seedHex), utf8(`damage:${index}:${ranura}:${caras}`)));
  const buf = fromHex(hmac);
  const limite = Math.floor(256 / caras) * caras;
  const dice: number[] = [];
  let i = 0;
  while (dice.length < count) {
    const b = buf[i % buf.length]!;
    // Reetiquetar al agotar el buffer evita repetir la misma secuencia de
    // bytes cuando un arma pide más dados de los que entran en un HMAC.
    if (i > 0 && i % buf.length === 0) {
      const extra = fromHex(toHex(hmacSha256(utf8(seedHex), utf8(`damage:${index}:${i}`))));
      buf.set(extra.subarray(0, buf.length));
    }
    i++;
    if (b >= limite) continue;
    dice.push((b % caras) + 1);
  }
  return { dice, hmac };
}

/**
 * Aleatoriedad NO auditada, para cosas que no son tiradas de juego:
 * variación de texto, orden de opciones, selección de detalle ambiental.
 * Nunca usar esto para resolver una acción.
 */
export function flavourPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Verificación completa de una campaña cerrada, para la pantalla de auditoría. */
export function verifyRollChain(
  seedHex: string,
  rolls: Array<{ seq: number; execution: { proof: { index: number; hmac: string } } }>,
): { ok: boolean; failures: number[] } {
  const failures: number[] = [];
  for (const r of rolls) {
    const expected = hmacForIndex(seedHex, r.execution.proof.index);
    if (expected !== r.execution.proof.hmac) failures.push(r.seq);
  }
  return { ok: failures.length === 0, failures };
}
