/**
 * PRUEBA DE PRESIÓN DE TIEMPO REAL — `npm run prueba:permeabilidad`
 *
 * El reloj diegético existía desde el principio (`advance_time`) y no le
 * costaba nada a nadie: nada competía por él salvo la curiosidad del
 * jugador. `world.umbralPermeability` también existía desde el principio y
 * no la leía nadie — subía sólo con un evento que ninguna aventura emite.
 *
 * Ahora las dos cosas se resuelven juntas: el mundo se abre solo con las
 * horas, pase lo que pase, y con el mundo más abierto CUALQUIER contacto con
 * el fenómeno —en cualquier aventura, sin que el contenido declare nada—
 * rinde más Exposición. Es la diferencia entre un recurso que compite contra
 * la curiosidad y uno que no compite contra nada.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { permeabilityFromMinutes, extraExposureFromPermeability } from './rules/umbral.ts';
import { PERMEABILIDAD_MINUTOS_POR_PUNTO } from './rules/umbral.config.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

async function main() {
  // ── La función pura ───────────────────────────────────────────────────────
  console.log('\nLA FUNCIÓN PURA');
  check(`menos de ${PERMEABILIDAD_MINUTOS_POR_PUNTO} minutos no dan ningún punto`,
    permeabilityFromMinutes(PERMEABILIDAD_MINUTOS_POR_PUNTO - 1) === 0);
  check(`${PERMEABILIDAD_MINUTOS_POR_PUNTO} minutos dan exactamente uno`,
    permeabilityFromMinutes(PERMEABILIDAD_MINUTOS_POR_PUNTO) === 1);
  check('once horas (la caminata del alambrado) dan un salto grande',
    permeabilityFromMinutes(11 * 60) === Math.floor(660 / PERMEABILIDAD_MINUTOS_POR_PUNTO),
    `${permeabilityFromMinutes(11 * 60)} puntos`);
  check('sin permeabilidad, ningún extra de exposición', extraExposureFromPermeability(0) === 0);
  check('con el mundo muy abierto, el extra es el mayor de los pisos cruzados',
    extraExposureFromPermeability(90) === 3, String(extraExposureFromPermeability(90)));

  // ── El motor: el tiempo sube la permeabilidad SOLO ───────────────────────
  console.log('\nEL MUNDO SE ABRE SOLO, PASE LO QUE PASE');
  {
    const id = await createCampaign(AGUA_QUIETA, 'PERMEABILIDAD-TIEMPO', 'p'.repeat(64));
    const t = await Turn.open(id);
    // Agua Quieta arranca en 12 (`startUmbralPermeability`), un número que
    // hasta ahora era decorativo. No hace falta que esta prueba conozca el
    // valor de memoria: sólo que SUBE con el tiempo y con nada más.
    const antes = t.state.world.umbralPermeability;
    t.executeTool('advance_time', { minutes: 45, reason: 'prueba' });
    await t.commit();
    const despues = (await Turn.open(id)).state.world.umbralPermeability;
    check('pasar 45 minutos sube la permeabilidad, sin que nadie haga nada más',
      despues === antes + Math.floor(45 / PERMEABILIDAD_MINUTOS_POR_PUNTO), `${antes} → ${despues}`);
  }

  // ── El motor: la exposición cuesta más con el mundo abierto ──────────────
  console.log('\nCON EL MUNDO ABIERTO, EL MISMO CONTACTO RINDE MÁS');
  {
    const id = await createCampaign(AGUA_QUIETA, 'PERMEABILIDAD-EXPOSICION', 'q'.repeat(64));
    const t0 = await Turn.open(id);
    // Empujar la permeabilidad bien arriba con tiempo, en una sola tacada,
    // como pasaría de verdad tras una caminata larga o mucho ir y venir.
    t0.executeTool('advance_time', { minutes: 20 * 65, reason: 'prueba' }); // ~65 puntos
    await t0.commit();
    const t1 = await Turn.open(id);
    const perm = t1.state.world.umbralPermeability;
    check('la permeabilidad quedó bien arriba', perm >= 60, `${perm}/100`);

    const r = t1.executeTool('apply_umbral_exposure', {
      amount: 3, source: 'prueba:contacto', cause: 'prueba',
    });
    await t1.commit();
    const t2 = await Turn.open(id);
    const exp = t2.investigator.umbral.exposure;
    check('la exposición aplicada es MÁS que los 3 declarados',
      exp > 3, `declarado 3, aplicado ${exp}`);
    check('el mensaje explica por qué', /el mundo está permeable/.test(r.message), r.message);
  }

  // ── Con el mundo en 0, ningún extra ───────────────────────────────────────
  console.log('\nSIN QUE PASE TIEMPO, NINGÚN EXTRA — NO ES UN IMPUESTO FIJO');
  {
    const id = await createCampaign(AGUA_QUIETA, 'PERMEABILIDAD-CERO', 'r'.repeat(64));
    const t = await Turn.open(id);
    const r = t.executeTool('apply_umbral_exposure', { amount: 3, source: 'prueba:x', cause: 'prueba' });
    await t.commit();
    const exp = (await Turn.open(id)).investigator.umbral.exposure;
    check('la exposición aplicada es EXACTAMENTE la declarada', exp === 3, `${exp}`);
    check('el mensaje no menciona permeabilidad', !/el mundo está permeable/.test(r.message));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
