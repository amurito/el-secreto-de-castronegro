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

  // ── Locura indefinida por ACUMULACIÓN, aparte de la de "5 o más de golpe" ──
  // p. 156: si el total perdido EN LA AVENTURA llega a 5 o a un quinto de la
  // Cordura de arranque (lo que sea mayor), hay otra tirada de INT aparte, y
  // si no aguanta, es locura indefinida de verdad — igual que llegar a 0,
  // aunque el investigador esté lejos de 0. Reportado jugando: terminó una
  // aventura en 57 sin que esto se evaluara nunca, porque no existía.
  console.log('\nLOCURA INDEFINIDA POR ACUMULACIÓN (p. 156): SE MIDE EL TOTAL DE LA AVENTURA, NO UN GOLPE');
  {
    // Cinco pérdidas de 3 (ninguna llega a 5, así que el gatillo de "golpe
    // único" de arriba no se dispara ni una vez) hasta cruzar el umbral: con
    // 65 de arranque, el umbral es max(5, 65/5) = 13, así que cruza en la
    // quinta (15 acumulados).
    async function golpesChicosHastaCruzar(quiereAguante: boolean) {
      for (const letra of SEMILLAS) {
        const id = await createCampaign(AGUA_QUIETA, `CORDURA-ACUM-${letra}`, letra.repeat(64));
        const t = await Turn.open(id);
        const arranque = t.investigator.sanAtStartOfScenario ?? t.investigator.derived.san;
        let ultimo = { ok: true, message: '' };
        for (let i = 0; i < 5; i++) {
          ultimo = t.executeTool('apply_sanity_loss', { amount: 3, cause: 'prueba' });
        }
        await t.commit();
        const final = (await Turn.open(id)).investigator;
        const insano = final.status === 'insane';
        if (insano === !quiereAguante) return { mensaje: ultimo.message, arranque, final };
      }
      return null;
    }

    const aguanta = await golpesChicosHastaCruzar(true);
    check('alguna semilla hace que la INT aguante el acumulado', aguanta !== null);
    if (aguanta) {
      check('el umbral usado es un quinto de la Cordura de ARRANQUE, no de la máxima',
        Math.max(5, Math.floor(aguanta.arranque / 5)) === 13, `arranque ${aguanta.arranque}`);
      check('lo dice sin mezclarlo con el gatillo de golpe único',
        /cruzó el quinto/.test(aguanta.mensaje) && !/golpe único/.test(aguanta.mensaje), aguanta.mensaje);
      check('sigue jugable: la INT aguantó', aguanta.final.status === 'alive');
    }

    const noAguanta = await golpesChicosHastaCruzar(false);
    check('alguna semilla hace que la INT NO aguante el acumulado', noAguanta !== null);
    if (noAguanta) {
      check('queda fuera de juego, igual que llegar a 0', noAguanta.final.status === 'insane');
      check('el mensaje distingue esto de "Cordura en 0"',
        /LOCURA INDEFINIDA POR ACUMULACIÓN/.test(noAguanta.mensaje) && noAguanta.final.derived.san > 0,
        `${noAguanta.mensaje.slice(-140)} — Cordura final ${noAguanta.final.derived.san}`);
    }

    // No se evalúa dos veces: cruzar el umbral una vez y seguir perdiendo
    // después no debería disparar una segunda tirada de "INT (acumulada)".
    const id = await createCampaign(AGUA_QUIETA, 'CORDURA-ACUM-UNA-VEZ', 'q'.repeat(64));
    const t = await Turn.open(id);
    for (let i = 0; i < 8; i++) t.executeTool('apply_sanity_loss', { amount: 3, cause: 'prueba' });
    await t.commit();
    const s = (await Turn.open(id)).state;
    const acumuladas = s.rolls.filter((r) => /INT \(acumulada\)/.test(r.commitment.skillLabel));
    check('la tirada "INT (acumulada)" aparece como máximo una vez en toda la aventura',
      acumuladas.length <= 1, `${acumuladas.length}`);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
