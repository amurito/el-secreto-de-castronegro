/**
 * PRUEBA DE CRIPTOGRAFÍA — `npm run prueba:cripto`
 *
 * La implementación propia de SHA-256/HMAC tiene que producir EXACTAMENTE los
 * mismos bytes que `node:crypto`. Si divergiera, las campañas ya guardadas
 * dejarían de verificar y la promesa de auditoría del proyecto se caería.
 *
 * Se comprueba contra: vectores NIST, la implementación de Node, y la cadena
 * completa de tiradas tal como la usa el motor.
 */

import { createHash, createHmac } from 'node:crypto';
import { sha256, hmacSha256, utf8, toHex, randomHex, uuid } from './engine/crypto.ts';

let fallos = 0;
const check = (nombre: string, ok: boolean, detalle = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
};

console.log('\n1. VECTORES CONOCIDOS (NIST)');
const vectores: Array<[string, string]> = [
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
   '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
];
for (const [entrada, esperado] of vectores) {
  check(`sha256("${entrada.slice(0, 20)}${entrada.length > 20 ? '…' : ''}")`,
    toHex(sha256(utf8(entrada))) === esperado);
}

console.log('\n2. SHA-256 CONTRA node:crypto — 500 entradas aleatorias');
{
  let iguales = 0;
  for (let i = 0; i < 500; i++) {
    // Largos variados: cruzan los límites de bloque de 64 bytes y de relleno.
    const largo = i % 200;
    const s = randomHex(largo);
    const mio = toHex(sha256(utf8(s)));
    const node = createHash('sha256').update(s, 'utf8').digest('hex');
    if (mio === node) iguales++;
    else if (iguales === i) console.log(`      primera divergencia con largo ${s.length}: "${s.slice(0, 40)}"`);
  }
  check('las 500 coinciden', iguales === 500, `${iguales}/500`);
}

console.log('\n3. SHA-256 EN LOS LÍMITES DE RELLENO (54–66 bytes)');
{
  let ok = true;
  for (let n = 50; n <= 130; n++) {
    const s = 'a'.repeat(n);
    if (toHex(sha256(utf8(s))) !== createHash('sha256').update(s, 'utf8').digest('hex')) {
      ok = false;
      console.log(`      falla en largo ${n}`);
    }
  }
  check('todos los largos de 50 a 130 coinciden', ok);
}

console.log('\n4. HMAC-SHA256 CONTRA node:crypto');
{
  let iguales = 0;
  const total = 300;
  for (let i = 0; i < total; i++) {
    // Claves cortas, del largo del bloque, y más largas que el bloque (se hashean).
    const clave = randomHex(i % 90);
    const msg = `roll:${i}`;
    const mio = toHex(hmacSha256(utf8(clave), utf8(msg)));
    const node = createHmac('sha256', Buffer.from(clave, 'utf8')).update(msg, 'utf8').digest('hex');
    if (mio === node) iguales++;
  }
  check(`las ${total} coinciden (claves de 0 a 178 caracteres)`, iguales === total, `${iguales}/${total}`);
}

console.log('\n5. LA CADENA REAL DEL MOTOR');
{
  // Exactamente lo que hace rng.ts: semilla de 32 bytes en hex, HMAC por índice.
  const semilla = randomHex(32);
  const compromisoMio = toHex(sha256(utf8(semilla)));
  const compromisoNode = createHash('sha256').update(semilla, 'utf8').digest('hex');
  check('el compromiso de semilla coincide', compromisoMio === compromisoNode);

  let iguales = 0;
  for (let i = 0; i < 200; i++) {
    const mio = toHex(hmacSha256(utf8(semilla), utf8(`roll:${i}`)));
    const node = createHmac('sha256', Buffer.from(semilla, 'utf8')).update(`roll:${i}`, 'utf8').digest('hex');
    if (mio === node) iguales++;
  }
  check('las 200 tiradas derivadas coinciden', iguales === 200, `${iguales}/200`);
}

console.log('\n6. AZAR DEL SISTEMA');
{
  const a = randomHex(32), b = randomHex(32);
  check('randomHex da 64 caracteres hex', /^[0-9a-f]{64}$/.test(a));
  check('dos llamadas no coinciden', a !== b);
  const u = uuid();
  check('uuid tiene forma v4', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(u), u);
  check('dos uuid no coinciden', uuid() !== uuid());
}

console.log('\n7. RENDIMIENTO (una partida larga tira cientos de veces)');
{
  const semilla = randomHex(32);
  const t0 = performance.now();
  for (let i = 0; i < 2000; i++) hmacSha256(utf8(semilla), utf8(`roll:${i}`));
  const ms = performance.now() - t0;
  check('2000 tiradas en menos de 200 ms', ms < 200, `${ms.toFixed(1)} ms`);
}

console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} FALLARON\n`);
process.exit(fallos === 0 ? 0 : 1);
