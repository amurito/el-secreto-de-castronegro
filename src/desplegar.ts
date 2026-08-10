/**
 * DESPLIEGUE — `npm run desplegar`
 *
 * Construye, audita y publica en GitHub Pages con un solo comando.
 *
 * No usa GitHub Actions porque el token de `gh` de esta máquina no tiene el
 * permiso `workflow` y ese permiso no se puede conceder sin intervención del
 * usuario. Esto hace lo mismo desde acá: mismo resultado, sin depender de él.
 *
 * Si algo falla —una prueba, la auditoría del bundle— NO publica nada.
 *
 * Para pasar a CI algún día:
 *   gh auth refresh -s workflow
 *   git add .github/workflows/publicar.yml && git commit && git push
 *   Settings → Pages → Source: GitHub Actions
 */

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const SALIDA = join(RAIZ, 'dist', 'web');
const REPO = 'https://github.com/amurito/el-secreto-de-castronegro.git';
const RAMA = 'gh-pages';
const URL = 'https://amurito.github.io/el-secreto-de-castronegro/';

/**
 * Nada de `npx`: en Windows es un `.cmd`, y Node 20 se niega a ejecutar
 * archivos por lotes sin shell (mitigación de CVE-2024-27980). Usar `shell:
 * true` funcionaría pero mete comillas y escapes en el medio. Llamar a los
 * puntos de entrada de cada herramienta con el propio Node no necesita shell
 * y se comporta igual en Windows, Linux y macOS.
 */
const TSX = join(RAIZ, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const VITE = join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js');

function correr(cmd: string, args: string[], cwd = RAIZ): string {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const node = (script: string, args: string[] = []) =>
  correr(process.execPath, [script, ...args]);

const paso = (n: number, texto: string) => console.log(`\n[${n}/5] ${texto}`);

try {
  paso(1, 'Verificando el motor…');
  node(TSX, ['src/prueba.ts']);
  node(TSX, ['src/prueba-libre.ts']);
  node(TSX, ['src/prueba-opciones.ts']);
  node(TSX, ['src/prueba-desenlaces.ts']);
  node(TSX, ['src/prueba-social.ts']);
  node(TSX, ['src/prueba-umbral.ts']);
  node(TSX, ['src/prueba-desarrollo.ts']);
  console.log('      motor, acción libre, opciones, desenlaces, social, Umbral y fase de desarrollo en verde');

  paso(2, 'Construyendo…');
  if (existsSync(join(RAIZ, 'dist'))) rmSync(join(RAIZ, 'dist'), { recursive: true, force: true });
  node(VITE, ['build']);
  console.log(`      ${readdirSync(join(SALIDA, 'assets')).length + 1} archivos en dist/web`);

  paso(3, 'Auditando el bundle público…');
  node(TSX, ['src/revisar-bundle.ts']);
  console.log('      no filtra la solución de la aventura');

  paso(4, 'Publicando en la rama gh-pages…');
  // .nojekyll evita que GitHub Pages procese el sitio con Jekyll.
  writeFileSync(join(SALIDA, '.nojekyll'), '');
  // Repositorio efímero dentro de dist/: se descarta junto con la carpeta.
  correr('git', ['init', '-q', '-b', RAMA], SALIDA);
  correr('git', ['add', '-A'], SALIDA);
  correr('git', [
    '-c', 'user.name=Nicolas Maure',
    '-c', 'user.email=nicolasmaure99@gmail.com',
    'commit', '-q', '-m', `Publicar ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  ], SALIDA);
  correr('git', ['push', '-q', '-f', REPO, RAMA], SALIDA);
  console.log('      subido');

  paso(5, 'Listo.');
  console.log(`\n  ▶ ${URL}\n`);
  console.log('  GitHub Pages tarda entre 30 segundos y 2 minutos en servir la versión nueva.');
  console.log('  Si ves la anterior, recargá con Ctrl+F5.\n');
} catch (err) {
  const e = err as { stderr?: Buffer | string; stdout?: Buffer | string; message: string };
  console.error('\n✗ El despliegue se detuvo. NO se publicó nada.\n');
  const salida = String(e.stdout ?? '').trim();
  if (salida) console.error(salida);
  console.error(String(e.stderr ?? '').trim() || e.message);
  process.exit(1);
}
