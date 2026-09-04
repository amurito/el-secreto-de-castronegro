/**
 * PRUEBA DE FOBIAS Y MANÍAS MECÁNICAS — `npm run prueba:fobias`
 *
 * `Condition.mechanicalEffect.skillModifiers` estaba en el tipo desde el
 * principio y nada lo leía: una fobia era una descripción en la ficha y
 * nada más, exactamente la familia de bug de «declarado y no entregado» que
 * este proyecto ya se topó muchas veces.
 *
 * Verifica dos capas:
 *   1. El motor: una condición con `mechanicalEffect` cambia de verdad los
 *      dados de una tirada futura, sin que nadie tenga que acordarse.
 *   2. El contenido: la crisis de locura temporal (5+ de golpe) se lleva la
 *      fobia o manía que declaró la escena, no una genérica — y esa fobia
 *      sigue afectando tiradas turnos después, en escenas completamente
 *      distintas.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LA_LEGUA } from './scenario/legua.ts';
import { ejecutarEscena, leerIntencion, escenaPara } from './keeper/escenas.ts';
import { classify } from './keeper/intent.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { SuccessDegree } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

type Runner = (tool: string, args: Record<string, unknown>) =>
  { ok: boolean; message: string; emit?: { kind: string; data: unknown } };

function forzando(turn: Turn, grado: SuccessDegree): Runner {
  const exitoso = grado !== 'failure' && grado !== 'fumble';
  return (tool, args) => {
    const r = turn.executeTool(tool, args);
    if (tool !== 'request_roll') return r;
    return {
      ...r,
      message: exitoso ? 'SUPERA la dificultad (forzado para prueba)' : 'NO SUPERA la dificultad (forzado para prueba)',
      emit: { kind: 'roll', data: { ...(r.emit?.data as object ?? {}), degree: grado } },
    };
  };
}

async function main() {
  // ── El mecanismo, aislado ─────────────────────────────────────────────────
  console.log('\nEL MOTOR: UNA CONDICIÓN CON mechanicalEffect CAMBIA LOS DADOS');
  {
    const id = await createCampaign(AGUA_QUIETA, 'FOBIA-MECANISMO', 'a'.repeat(64));
    const t = await Turn.open(id);
    t.executeTool('apply_condition', {
      name: 'Fobia de prueba', description: 'para verificar el mecanismo',
      kind: 'phobia', temporary: 'true',
    });
    await t.commit();
    // Sin mechanicalEffect declarado, apply_condition no lo agrega: hay que
    // fabricarlo con apply_sanity_loss + crisis_*, que es el camino real.
  }
  {
    // La crisis de 5+ ahora depende de una tirada de INT real (ver
    // engine.ts: `toolApplySanityLoss` la pide con `tiradaInterna` antes de
    // aplicar la fobia declarada), así que hay que probar semillas hasta
    // que esa INT no aguante — mismo criterio que el resto de esta suite.
    let id = '';
    for (const letra of 'bcdefghijklmnop') {
      id = await createCampaign(AGUA_QUIETA, `FOBIA-DADOS-${letra}`, letra.repeat(64));
      const t0 = await Turn.open(id);
      t0.executeTool('apply_sanity_loss', {
        amount: 7, cause: 'prueba',
        crisis_name: 'Fobia de prueba', crisis_description: 'una fobia inventada para esta prueba',
        crisis_kind: 'phobia',
        crisis_skill_1: 'escuchar', crisis_dice_1: 1,
        crisis_skill_2: 'descubrir', crisis_dice_2: -1,
      });
      await t0.commit();
      const tras = (await Turn.open(id)).investigator;
      if (tras.conditions.some((c) => c.name === 'Fobia de prueba')) break;
    }

    const t1 = await Turn.open(id);
    const penalizada = t1.executeTool('request_roll', {
      skill: 'escuchar', difficulty: 'regular', reason: 'prueba', stakes_success: 'x', stakes_failure: 'y',
    });
    await t1.commit();
    const rollPenalizado = (penalizada.emit!.data as { modifiers: Array<{ kind: string; count: number; reason: string }> }).modifiers;
    check('la habilidad penalizada recibe penalty_die de la fobia',
      rollPenalizado.some((m) => m.kind === 'penalty_die' && m.reason === 'Fobia de prueba'),
      JSON.stringify(rollPenalizado));

    const t2 = await Turn.open(id);
    const bonificada = t2.executeTool('request_roll', {
      skill: 'descubrir', difficulty: 'regular', reason: 'prueba', stakes_success: 'x', stakes_failure: 'y',
    });
    const rollBonificado = (bonificada.emit!.data as { modifiers: Array<{ kind: string; count: number; reason: string }> }).modifiers;
    check('la habilidad con dado negativo recibe bonus_die de la fobia (dice<0 = bonifica)',
      rollBonificado.some((m) => m.kind === 'bonus_die' && m.reason === 'Fobia de prueba'),
      JSON.stringify(rollBonificado));

    const t3 = await Turn.open(id);
    const sinRelacion = t3.executeTool('request_roll', {
      skill: 'medicina', difficulty: 'regular', reason: 'prueba', stakes_success: 'x', stakes_failure: 'y',
    });
    const rollSinRelacion = (sinRelacion.emit!.data as { modifiers: Array<{ reason: string }> }).modifiers;
    check('una habilidad que la fobia no menciona no se toca',
      !rollSinRelacion.some((m) => m.reason === 'Fobia de prueba'), JSON.stringify(rollSinRelacion));
  }

  // ── Menos de 5: ninguna fobia, aunque se haya declarado una ──────────────
  console.log('\nMENOS DE 5 NO SE LLEVA NINGUNA FOBIA, AUNQUE LA ESCENA HAYA DECLARADO UNA');
  {
    const id = await createCampaign(AGUA_QUIETA, 'FOBIA-CHICA', 'c'.repeat(64));
    const t = await Turn.open(id);
    const antes = t.investigator.conditions.length;
    t.executeTool('apply_sanity_loss', {
      amount: 2, cause: 'prueba', crisis_name: 'No debería aparecer', crisis_kind: 'phobia',
      crisis_skill_1: 'escuchar', crisis_dice_1: 1,
    });
    await t.commit();
    const despues = (await Turn.open(id)).investigator;
    check('ninguna condición nueva', despues.conditions.length === antes, `${antes} → ${despues.conditions.length}`);
  }

  // ── El contenido: la pifia del aljibe se lleva SU fobia, no una genérica ─
  // La pifia de la escena se fuerza (`forzando`), pero la crisis de 5+ ahora
  // pasa por una tirada de INT real (`tiradaInterna`, sin pasar por `run`, así
  // que `forzando` no la alcanza) — dos semillas distintas pueden dar INT
  // distinta para la MISMA fumble forzada. Se prueban varias hasta que la INT
  // no aguante, igual que `prueba-cordura.ts`.
  console.log('\nAGUA QUIETA: LA PIFIA SE LLEVA «HORROR A LAS SUPERFICIES QUIETAS»');
  {
    let fobia: { name: string; mechanicalEffect?: { skillModifiers?: unknown[] } } | undefined;
    let final: Turn | null = null;
    for (const letra of 'defghijklmnopqrstuvwxyz') {
      const id = await createCampaign(AGUA_QUIETA, `ALJIBE-FOBIA-${letra}`, letra.repeat(64));
      await jugar(AGUA_QUIETA, id, [
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Voy a la casa', 'Examino la fotografía enmarcada de 1897', 'Voy al cuarto',
        'Leo el cuaderno de Ignacio', 'Examino la fotografía dada vuelta', 'Voy al patio',
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Escucho el aljibe con atención', 'Toco el agua del aljibe',
        'Grito el nombre de Ignacio hacia el aljibe',
        'Examino el brocal de cerca', 'Examino los álamos de cerca',
        'Cavo al lado del aljibe',
        'Voy a la orilla de la laguna mansa', 'Miro la laguna un rato largo',
        'Miro la laguna un rato largo', 'Miro la laguna un rato largo',
        'Voy al patio', 'Toco el agua del aljibe', 'Escucho el aljibe con atención',
      ]);
      const t = await Turn.open(id);
      const i = leerIntencion(classify(t.state, 'Sostengo la mirada sobre el reflejo'));
      const escena = escenaPara(AGUA_QUIETA.scenes, t.state, i)!;
      const out: string[] = [];
      ejecutarEscena(t, escena, i, out, forzando(t, 'fumble'));
      await t.commit();

      final = await Turn.open(id);
      fobia = final.investigator.conditions.find((c) => c.name === 'Horror a las superficies quietas');
      if (fobia) break;
    }
    check('alguna semilla dio una INT que no aguanta (para poder probar la rama)', Boolean(fobia));
    check('la fobia está en la ficha, no la genérica', Boolean(fobia),
      final?.investigator.conditions.map((c) => c.name).join(', '));
    check('tiene efecto mecánico declarado',
      (fobia?.mechanicalEffect?.skillModifiers?.length ?? 0) === 2);

    // Y ese efecto pega en una escena COMPLETAMENTE distinta, turnos después.
    if (final && fobia) {
      const rTiro = final.executeTool('request_roll', {
        skill: 'psicologia', difficulty: 'regular', reason: 'prueba tardía', stakes_success: 'x', stakes_failure: 'y',
      });
      const mods = (rTiro.emit!.data as { modifiers: Array<{ reason: string }> }).modifiers;
      check('la fobia sigue pegando turnos después, en otra escena',
        mods.some((m) => m.reason === 'Horror a las superficies quietas'), JSON.stringify(mods));
    }
  }

  // ── La Legua: la pifia se lleva «Compulsión de contar» ───────────────────
  // `fin-caminar` pide `pistas(s) >= 5`: hace falta el recorrido real, no
  // basta con pararse en el alambrado. Mismo guion que prueba-legua.ts usa
  // para llegar al mismo final.
  console.log('\nLA LEGUA PERDIDA: LA PIFIA SE LLEVA «COMPULSIÓN DE CONTAR»');
  {
    const insistir = (paso: string, veces = 3) => Array(veces).fill(paso) as string[];
    let mania: { name: string } | undefined;
    let clues = 0;
    let encontroEscena = true;
    for (const letra of 'efghijklmnopqrstuvwxyz') {
      const id = await createCampaign(LA_LEGUA, `ALAMBRADO-MANIA-${letra}`, letra.repeat(64));
      await jugar(LA_LEGUA, id, [
        'Le pregunto a Herminia qué pasó con Fermín',
        'Le pregunto a Herminia cuánto hay del casco al molino',
        'Agarro rueda de agrimensor',
        'Voy al galpón',
        ...insistir('Examino a Fermín para certificar la causa'),
        ...insistir('Examino la cantimplora de Fermín'),
        'Voy al casco de la perseverancia',
        'Voy al escritorio de la estancia',
        ...insistir('Busco las mensuras entre los papeles'),
        ...insistir('Leo la libreta de campo de Roldán'),
        'Voy al casco de la perseverancia',
        'Le pregunto a Herminia por las mensuras',
        'Voy al molino y el tanque',
        'Le pregunto a Casimiro cómo encontró a Fermín',
        'Le pregunto a Casimiro cuánto hay del casco al molino',
        'Le pregunto a Casimiro por las huellas',
        'Voy a donde apareció fermín',
        'Examino las huellas de cerca',
        'Camino hasta el tanque contando los pasos y mirando el reloj',
        'Voy al alambrado del oeste',
        ...insistir('Examino los postes de cerca'),
        'Examino el mojón de cerca',
        'Mido la línea con la rueda de ida y de vuelta',
        'Cotejo lo que dice cada uno',
      ]);

      const t = await Turn.open(id);
      const i = leerIntencion(classify(t.state, 'Camino el alambrado del oeste de punta a punta'));
      const escena = escenaPara(LA_LEGUA.scenes, t.state, i);
      if (!escena) { encontroEscena = false; clues = t.state.board.clues.length; break; }
      const out: string[] = [];
      ejecutarEscena(t, escena, i, out, forzando(t, 'fumble'));
      await t.commit();
      const final = await Turn.open(id);
      mania = final.investigator.conditions.find((c) => c.name === 'Compulsión de contar');
      if (mania) break;
    }
    check('se encuentra la escena de caminar', encontroEscena, `${clues} pistas`);
    if (encontroEscena) {
      check('alguna semilla dio una INT que no aguanta (para poder probar la rama)', Boolean(mania));
      check('la manía está en la ficha', Boolean(mania));
    }
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

async function jugar(scenario: typeof AGUA_QUIETA, id: string, acciones: string[]): Promise<void> {
  for (const accion of acciones) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(accion, 'jugador-local');
    const r = await runOfflineTurn(t, scenario, accion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
