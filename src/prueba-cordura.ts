/**
 * PRUEBA DE CORDURA DE VERDAD — `npm run prueba:cordura`
 *
 * Hasta acá ninguna escena de ninguna aventura perdía Cordura nunca: todo el
 * horror pasaba por Exposición y Estabilidad, que son la mecánica PROPIA del
 * proyecto. Es una variable de CoC 7e real, con sus dos reglas automáticas
 * (p. 166): cinco o más puntos de golpe OBLIGA A TIRAR INT —no es automática,
 * es el Keeper pidiendo esa tirada— para decidir si la crisis de locura
 * temporal se manifiesta ahora mismo, y llegar a 0 es locura indefinida — el
 * investigador queda fuera de juego, igual que la muerte.
 *
 * La tirada de INT (`tiradaInterna`, mismo camino que ya usa la CON de Herida
 * Grave) depende de la semilla: no se puede afirmar de antemano si un intento
 * dado la va a aguantar o no —ver la memoria de pruebas no determinísticas—,
 * así que esta suite prueba las DOS ramas probando varias semillas hasta
 * encontrar una de cada resultado, en vez de asumir cuál da cada letra.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { describeScene } from './keeper/narrator.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { Investigator } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const SEMILLAS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Prueba una pérdida de 7 en campañas sucesivas hasta que la INT dé el resultado pedido. */
async function golpeDeSiete(
  quiereCrisis: boolean,
): Promise<{ mensaje: string; antes: number; despues: Investigator } | null> {
  for (const letra of SEMILLAS) {
    const id = await createCampaign(AGUA_QUIETA, `CORDURA-INT-${letra}`, letra.repeat(64));
    const t = await Turn.open(id);
    const antes = t.investigator.conditions.length;
    const r = t.executeTool('apply_sanity_loss', { amount: 7, cause: 'prueba' });
    await t.commit();
    const despues = (await Turn.open(id)).investigator;
    const huboCrisis = despues.conditions.length > antes;
    if (huboCrisis === quiereCrisis) return { mensaje: r.message, antes, despues };
  }
  return null;
}

async function main() {
  // ── Cinco o más de golpe, y la INT no aguanta: crisis temporal ───────────
  console.log('\nCINCO O MÁS DE GOLPE, SI LA INT NO AGUANTA: CRISIS DE LOCURA TEMPORAL');
  {
    const r = await golpeDeSiete(true);
    check('alguna semilla dio una INT que no aguanta (para poder probar la rama)', r !== null);
    if (r) {
      check('el motor avisa en el mensaje', /crisis de locura temporal/i.test(r.mensaje), r.mensaje);
      check('la condición queda en la ficha', r.despues.conditions.length === r.antes + 1,
        `${r.antes} → ${r.despues.conditions.length}`);
      check('es de tipo mental', r.despues.conditions.at(-1)?.kind === 'mental');
      check('sigue jugable: menos de 5 no alcanza para sacarlo de juego', r.despues.status === 'alive');
    }
  }

  // ── Cinco o más de golpe, y la INT SÍ aguanta: sin crisis inmediata ──────
  console.log('\nCINCO O MÁS DE GOLPE, SI LA INT AGUANTA: SIN CRISIS INMEDIATA');
  {
    const r = await golpeDeSiete(false);
    check('alguna semilla dio una INT que aguanta (para poder probar la rama)', r !== null);
    if (r) {
      check('el motor avisa que la INT aguantó', /la INT aguanta/i.test(r.mensaje), r.mensaje);
      check('no se agregó ninguna condición nueva', r.despues.conditions.length === r.antes,
        `${r.antes} → ${r.despues.conditions.length}`);
      check('la Cordura de todos modos bajó', r.despues.derived.san < 99, String(r.despues.derived.san));
    }
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
    let vista: string | null = null;
    for (const letra of SEMILLAS) {
      const id = await createCampaign(AGUA_QUIETA, `CORDURA-NPC-${letra}`, letra.repeat(64));
      const t = await Turn.open(id);
      const sinCrisis = describeScene(t.state, false);
      if (letra === SEMILLAS[0]) {
        check('sin crisis, la descripción no menciona nada especial',
          !/nota apenas entra|no pregunta|ya se acostumbró/.test(sinCrisis));
      }
      t.executeTool('apply_sanity_loss', { amount: 7, cause: 'prueba' });
      await t.commit();
      const t2 = await Turn.open(id);
      const conCrisis = describeScene(t2.state, false);
      if (/nota apenas entra|no pregunta|ya se acostumbró/.test(conCrisis)) { vista = conCrisis; break; }
    }
    check('con la crisis en la ficha, Rosa reacciona sin que se le pregunte (alguna semilla la dispara)',
      vista !== null, vista?.slice(-160) ?? '(la INT aguantó en todas las semillas probadas)');
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
