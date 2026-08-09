/**
 * AUDITORÍA DEL BUNDLE PÚBLICO — `npm run revisar:bundle`
 *
 * El build estático corre el motor en el navegador, así que el escenario
 * jugable tiene que viajar entero. Lo que NO tiene que viajar es el texto que
 * existe sólo para instruir al Keeper IA: la verdad de la aventura, las notas
 * de dirección y la lista de lo sellado.
 *
 * Esta comprobación es la que garantiza que la separación de
 * `aguaquieta.keeper.ts` sigue funcionando después de cualquier refactor.
 *
 * Ojo: el minificador escapa los caracteres no-ASCII, así que hay que
 * desescapar antes de buscar o cualquier cadena con tilde da falso negativo.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'dist', 'web', 'assets');

if (!existsSync(DIR)) {
  console.error('No hay build. Corré `npm run build` primero.');
  process.exit(1);
}

const archivo = readdirSync(DIR).find((f) => f.endsWith('.js'));
if (!archivo) { console.error('No se encontró el bundle JS.'); process.exit(1); }

const crudo = readFileSync(join(DIR, archivo), 'utf8');
const js = crudo
  .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const PROHIBIDO: Array<[string, string]> = [
  ['la verdad de la aventura', 'mirado de vuelta'],
  ['la lista de lo sellado', 'La identidad del Primer Rostro'],
  ['notas de dirección por lugar', 'centro de gravedad'],
  ['guía de dirección', 'FALSOS CAMINOS'],
  ['dónde está la ruta testimonial', 'actitud ≥ 40'],
  ['system prompt del Keeper IA', 'Sos el KEEPER'],
  ['SDK de Anthropic', 'anthropic-ai'],
  ['módulos de Node', 'node:fs'],
  ['servidor', 'fastify'],
];

const REQUERIDO: Array<[string, string]> = [
  ['el escenario jugable', 'aljibe de ladrillo'],
  ['las propiedades ocultas', 'misma cicatriz corta'],
  ['el secreto de Rosa', 'Había dos luces'],
  ['la narración del motor', 'Gritás el nombre hacia el aljibe'],
  ['los documentos diegéticos', 'tengo que ver si estoy'],
];

let fallos = 0;
console.log(`\nBundle: ${archivo} (${(crudo.length / 1024).toFixed(0)} KB)\n`);

console.log('NO debe estar en el bundle público:');
for (const [nombre, aguja] of PROHIBIDO) {
  const presente = js.includes(aguja);
  if (presente) fallos++;
  console.log(`  ${presente ? '✗ PRESENTE' : '✓ ausente '}   ${nombre}`);
}

console.log('\nSÍ debe estar (el motor lo necesita para jugar):');
for (const [nombre, aguja] of REQUERIDO) {
  const presente = js.includes(aguja);
  if (!presente) fallos++;
  console.log(`  ${presente ? '✓ está    ' : '✗ FALTA   '}   ${nombre}`);
}

console.log(fallos === 0 ? '\nBUNDLE CORRECTO\n' : `\n${fallos} PROBLEMAS\n`);
process.exit(fallos === 0 ? 0 : 1);
