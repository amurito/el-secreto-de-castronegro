/**
 * PRUEBA DE CORDURA DE VERDAD — `npm run prueba:cordura`
 *
 * Hasta acá ninguna escena de ninguna aventura perdía Cordura nunca: todo el
 * horror pasaba por Exposición y Estabilidad, que son la mecánica PROPIA del
 * proyecto. Es una variable de CoC 7e real, con sus dos reglas automáticas
 * (p. 166): cinco o más puntos de golpe es una crisis de locura temporal, y
 * llegar a 0 es locura indefinida — el investigador queda fuera de juego,
 * igual que la muerte.
 *
 * Antes, esas dos reglas eran una NOTA en el mensaje del motor, para que un
 * Keeper en vivo las leyera y decidiera aplicarlas. Sin Keeper en vivo —modo
 * motor, que es el foco actual del proyecto— esa nota no la lee nadie. Ahora
 * las aplica el motor mismo, en el mismo lugar donde ya aplicaba la regla
 * análoga para HP y muerte.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { describeScene } from './keeper/narrator.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

async function main() {
  // ── Cinco o más de golpe: crisis temporal automática ─────────────────────
  console.log('\nCINCO O MÁS DE GOLPE ES UNA CRISIS DE LOCURA TEMPORAL, SOLA');
  {
    const id = await createCampaign(AGUA_QUIETA, 'CORDURA-CRISIS', 'k'.repeat(64));
    const t = await Turn.open(id);
    const antes = t.investigator.conditions.length;
    const r = t.executeTool('apply_sanity_loss', { amount: 7, cause: 'prueba' });
    await t.commit();
    const despues = (await Turn.open(id)).investigator;
    check('el motor avisa en el mensaje', /crisis de locura temporal/i.test(r.message), r.message);
    check('la condición queda en la ficha', despues.conditions.length === antes + 1,
      `${antes} → ${despues.conditions.length}`);
    check('es de tipo mental', despues.conditions.at(-1)?.kind === 'mental');
    check('sigue jugable: menos de 5 no alcanza para sacarlo de juego', despues.status === 'alive');
  }

  // ── Menos de cinco: ninguna condición nueva ───────────────────────────────
  console.log('\nMENOS DE CINCO NO DISPARA NADA AUTOMÁTICO');
  {
    const id = await createCampaign(AGUA_QUIETA, 'CORDURA-CHICA', 'j'.repeat(64));
    const t = await Turn.open(id);
    const antes = t.investigator.conditions.length;
    t.executeTool('apply_sanity_loss', { amount: 2, cause: 'prueba' });
    await t.commit();
    const despues = (await Turn.open(id)).investigator;
    check('ninguna condición nueva', despues.conditions.length === antes, `${antes} → ${despues.conditions.length}`);
  }

  // ── Cordura en 0: locura indefinida, fuera de juego ──────────────────────
  console.log('\nCORDURA EN 0 ES LOCURA INDEFINIDA — FUERA DE JUEGO, COMO LA MUERTE');
  {
    const id = await createCampaign(AGUA_QUIETA, 'CORDURA-CERO', 'l'.repeat(64));
    const t = await Turn.open(id);
    const san = t.investigator.derived.san;
    const r = t.executeTool('apply_sanity_loss', { amount: san, cause: 'prueba' });
    await t.commit();
    const final = await Turn.open(id);
    check('la Cordura llega a 0', final.investigator.derived.san === 0, String(final.investigator.derived.san));
    check('el status pasa a insane', final.investigator.status === 'insane', final.investigator.status);
    check('el mensaje lo dice sin ambigüedad', /LOCURA INDEFINIDA/.test(r.message));
    check('deja de tener acciones disponibles, igual que un muerto',
      accionesDisponibles(final.state, AGUA_QUIETA).length === 0);
  }

  // ── Exposición alta agrava la pérdida — regla, no decisión de escena ─────
  console.log('\nCON EXPOSICIÓN ALTA, LA MISMA PÉRDIDA DECLARADA DUELE MÁS');
  {
    const id = await createCampaign(AGUA_QUIETA, 'CORDURA-EXPUESTO', 'x'.repeat(64));
    const t = await Turn.open(id);
    // `apply_umbral_exposure` topea 20 por turno (MAX_EXPOSURE_PER_TURN): para
    // pasar el piso de 55 hacen falta varias fuentes DISTINTAS, no una sola
    // grande, porque la misma fuente decae.
    t.executeTool('apply_umbral_exposure', { amount: 20, source: 'prueba:a', cause: 'prueba' });
    t.executeTool('apply_umbral_exposure', { amount: 20, source: 'prueba:b', cause: 'prueba' });
    t.executeTool('apply_umbral_exposure', { amount: 20, source: 'prueba:c', cause: 'prueba' });
    const sanAntes = t.investigator.derived.san;
    const r = t.executeTool('apply_sanity_loss', { amount: 2, cause: 'prueba' });
    await t.commit();
    const sanDespues = (await Turn.open(id)).investigator.derived.san;
    check('perdió más de los 2 declarados', sanAntes - sanDespues > 2, `${sanAntes} → ${sanDespues}`);
    check('el mensaje explica por qué', /el horror tiene dónde agarrarse/.test(r.message));
  }

  // ── Un NPC nota la crisis sin que se lo pregunten ────────────────────────
  console.log('\nUN NPC REACCIONA A LA FICHA, NO SÓLO AL DIÁLOGO');
  {
    const id = await createCampaign(AGUA_QUIETA, 'CORDURA-NPC', 'q'.repeat(64));
    const t = await Turn.open(id);
    const sinCrisis = describeScene(t.state, false);
    check('sin crisis, la descripción no menciona nada especial',
      !/nota apenas entra|no pregunta|ya se acostumbró/.test(sinCrisis));

    t.executeTool('apply_sanity_loss', { amount: 7, cause: 'prueba' });
    await t.commit();
    const t2 = await Turn.open(id);
    const conCrisis = describeScene(t2.state, false);
    check('con la crisis en la ficha, Rosa reacciona sin que se le pregunte',
      /nota apenas entra|no pregunta|ya se acostumbró/.test(conCrisis), conCrisis.slice(-160));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
