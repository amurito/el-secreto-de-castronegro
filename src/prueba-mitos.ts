/**
 * PRUEBA DE MITOS DE CTHULHU — `npm run prueba:mitos`
 *
 * Mitos es la única habilidad del juego que cuesta tenerla. No se compra en la
 * creación, no se marca por uso, y subirla baja PARA SIEMPRE el techo de
 * Cordura (p. 169: máxima = 99 − Mitos).
 *
 * Lo que esta prueba protege es justamente lo irreversible. Un bug que deje el
 * techo sin bajar convierte la decisión más cara del juego en gratis, y —peor—
 * no se nota jugando: la ficha muestra un número plausible y nadie sospecha
 * nada hasta que alguien compara dos partidas.
 *
 * Las cinco cosas que tienen que ser ciertas:
 *   1. Sube, y el techo baja con ella.
 *   2. Si la Cordura actual queda por encima del techo nuevo, baja con él.
 *   3. Si quedaba por debajo, no se la toca.
 *   4. Acumula: dos lecturas suman, no se pisan.
 *   5. Cruza a la aventura siguiente. Es lo que la hace permanente de verdad.
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LA_LEGUA } from './scenario/legua.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { NUNCA_SE_MARCAN } from './rules/desarrollo.ts';
import type { GameState, SkillId } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;
const mitosDe = (s: GameState) => invDe(s).skills['mitos' as SkillId]?.base ?? 0;

/** Ejecuta la herramienta y devuelve el estado ya reconstruido del log. */
async function leer(id: string, amount: number, source: string) {
  const t = await Turn.open(id);
  const r = t.executeTool('apply_mythos_knowledge', { amount, source });
  await t.commit();
  return { r, estado: (await Turn.open(id)).state };
}

async function main() {
  const id = await createCampaign(AGUA_QUIETA, 'MITOS', 'm'.repeat(64));
  const inicial = (await Turn.open(id)).state;
  const invIni = invDe(inicial);

  console.log('\nARRANCA EN CERO, Y EL TECHO ARRANCA EN 99');
  check('Mitos en 0 al empezar', mitosDe(inicial) === 0, String(mitosDe(inicial)));
  check('el techo de Cordura es 99', invIni.derived.maxSan === 99, String(invIni.derived.maxSan));

  console.log('\n1. SUBE, Y EL TECHO BAJA CON ELLA');
  const uno = await leer(id, 4, 'el procedimiento del Círculo Rojo, entero');
  check('la herramienta acepta', uno.r.ok, uno.r.message);
  check('Mitos quedó en 4', mitosDe(uno.estado) === 4, String(mitosDe(uno.estado)));
  check('el techo bajó a 95 (99 − 4)', invDe(uno.estado).derived.maxSan === 95,
    String(invDe(uno.estado).derived.maxSan));
  check('el mensaje dice que no vuelve a subir', /no vuelve a subir nunca/.test(uno.r.message));

  console.log('\n3. CON EL TECHO TODAVÍA ARRIBA, LA CORDURA NO SE TOCA');
  check('la Cordura actual quedó igual',
    invDe(uno.estado).derived.san === invIni.derived.san,
    `${invIni.derived.san} → ${invDe(uno.estado).derived.san}`);

  console.log('\n4. ACUMULA: LA SEGUNDA LECTURA SUMA, NO PISA');
  const dos = await leer(id, 3, 'las anotaciones al margen');
  check('Mitos 4 + 3 = 7', mitosDe(dos.estado) === 7, String(mitosDe(dos.estado)));
  check('el techo acompaña: 92', invDe(dos.estado).derived.maxSan === 92,
    String(invDe(dos.estado).derived.maxSan));

  console.log('\n2. CUANDO EL TECHO PASA POR DEBAJO DE LA CORDURA, SE LA LLEVA PUESTA');
  // Hace falta bajar el techo por debajo de la Cordura actual. Va de a 10, que
  // es el tope por llamada, hasta cruzarla: así la prueba no depende de cuánto
  // POW le haya tocado a la investigadora.
  let ultimo = dos;
  for (let n = 0; n < 9; n++) {
    const inv = invDe(ultimo.estado);
    if (inv.derived.maxSan <= inv.derived.san) break;
    ultimo = await leer(id, 10, `otra cosa que no convenía entender (${n})`);
  }
  const invFinal = invDe(ultimo.estado);
  check('el techo terminó igual o por debajo de la Cordura',
    invFinal.derived.maxSan <= invIni.derived.san,
    `techo ${invFinal.derived.maxSan} vs Cordura inicial ${invIni.derived.san}`);
  check('la Cordura NUNCA queda por encima de su techo',
    invFinal.derived.san <= invFinal.derived.maxSan,
    `${invFinal.derived.san}/${invFinal.derived.maxSan}`);
  check('y el techo es exactamente 99 − Mitos',
    invFinal.derived.maxSan === 99 - mitosDe(ultimo.estado),
    `${invFinal.derived.maxSan} vs 99 − ${mitosDe(ultimo.estado)}`);

  console.log('\nLO QUE RECHAZA');
  const t = await Turn.open(id);
  check('rechaza cero puntos', !t.executeTool('apply_mythos_knowledge', { amount: 0, source: 'nada' }).ok);
  check('rechaza sin decir qué leyó',
    !t.executeTool('apply_mythos_knowledge', { amount: 2, source: '   ' }).ok);

  console.log('\nNI SE COMPRA NI SE MEJORA POR USO');
  check('la fase de desarrollo nunca marca Mitos', NUNCA_SE_MARCAN.includes('mitos'));

  console.log('\n5. CRUZA A LA AVENTURA SIGUIENTE — ES LO QUE LO HACE PERMANENTE');
  const antes = (await loadState(id)).state;
  const idDos = await createCampaign(LA_LEGUA, 'MITOS 2', 'n'.repeat(64), {
    estadoAnterior: antes,
    mesesTranscurridos: 5,
  });
  const dosEstado = (await loadState(idDos)).state;
  const invDos = invDe(dosEstado);
  check('los Mitos cruzan enteros',
    (invDos.skills['mitos' as SkillId]?.base ?? 0) === mitosDe(antes),
    `${mitosDe(antes)} → ${invDos.skills['mitos' as SkillId]?.base ?? 0}`);
  check('y el techo de Cordura sigue bajo del otro lado',
    invDos.derived.maxSan === 99 - mitosDe(antes),
    `${invDos.derived.maxSan}`);
  check('la Cordura recuperada entre aventuras respeta ese techo',
    invDos.derived.san <= invDos.derived.maxSan,
    `${invDos.derived.san}/${invDos.derived.maxSan}`);

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
