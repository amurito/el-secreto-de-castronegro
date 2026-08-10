/**
 * PRUEBA DE LA FASE DE DESARROLLO — `npm run prueba:desarrollo`
 *
 * Verifica las reglas de CoC 7e (pp. 94-95, 167-169) tal como las implementamos,
 * y sobre todo las dos que son fáciles de implementar mal:
 *
 *   · NO se marca una habilidad si la tirada usó dado de bonificación (p. 94).
 *     En la mesa se olvida la mitad de las veces; acá se deriva del registro,
 *     así que no se puede olvidar — pero sí se puede programar mal.
 *
 *   · Cerrar la fase BORRA las marcas. Sin eso, lo hecho en la primera aventura
 *     seguiría mejorando habilidades en la segunda, para siempre.
 *
 * Y la propiedad que hace que esto pertenezca a este proyecto y no a otro: las
 * tiradas de la fase salen de la misma cadena verificable que las de la
 * partida, así que el progreso se audita igual que el azar.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { verifyRollChain } from './engine/rng.ts';
import { mejora, maxCordura, marcasDe } from './rules/desarrollo.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

async function jugarHastaElFinal(id: string, turnos = 40) {
  const usadas = new Set<string>();
  for (let n = 0; n < turnos; n++) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    const disp = accionesDisponibles(t.state, AGUA_QUIETA);
    const sig = disp.find((o) => !o.final && !usadas.has(o.id))
      ?? disp.find((o) => o.final && o.id === 'irse')
      ?? disp[0];
    if (!sig) break;
    usadas.add(sig.id);
    t.submitIntent(sig.intencion, 'p1');
    const r = await runOfflineTurn(t, AGUA_QUIETA, sig.intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
}

async function main() {
  // ── La regla de mejora, en aislamiento ───────────────────────────────────
  console.log('\nLA REGLA DE MEJORA (p. 94)');
  check('con habilidad 40, un 41 mejora', mejora(40, 41));
  check('con habilidad 40, un 40 NO mejora', !mejora(40, 40));
  check('con habilidad 99, un 96 mejora igual (regla del 95+)', mejora(99, 96));
  check('con habilidad 99, un 50 no mejora', !mejora(99, 50));

  // ── Partida completa, después fase ───────────────────────────────────────
  const id = await createCampaign(AGUA_QUIETA, 'DESARROLLO', 'x'.repeat(64));
  await jugarHastaElFinal(id);

  const antes = await Turn.open(id);
  const estadoAntes: GameState = antes.state;
  const invAntes = estadoAntes.investigators[estadoAntes.activeInvestigator]!;
  const marcas = antes.developmentMarks();

  console.log(`\nDESPUÉS DE LA AVENTURA (${estadoAntes.rolls.length} tiradas)`);
  console.log(`  Cordura ${invAntes.derived.san}/${maxCordura(invAntes)} · ${marcas.length} habilidades marcadas`);
  for (const m of marcas) console.log(`   · ${m.label} ${m.valor}% (${m.exitos} éxito/s)`);

  console.log('\nEL MARCADO SALE DEL REGISTRO');
  check('hay al menos una habilidad marcada', marcas.length > 0, `${marcas.length}`);

  // La regla del dado de bonificación: ninguna marca puede venir de una tirada
  // que lo usó, salvo que esa habilidad también acertara sin él.
  const conBonif = new Set(
    estadoAntes.rolls
      .filter((r) => r.commitment.modifiers.some((m) => m.kind === 'bonus_die' && m.count > 0))
      .filter((r) => !['failure', 'fumble'].includes(r.execution.degree))
      .map((r) => String(r.commitment.skill)),
  );
  const sinBonif = new Set(
    estadoAntes.rolls
      .filter((r) => !r.commitment.modifiers.some((m) => m.kind === 'bonus_die' && m.count > 0))
      .filter((r) => !['failure', 'fumble'].includes(r.execution.degree))
      .map((r) => String(r.commitment.skill)),
  );
  const soloConBonificacion = [...conBonif].filter((s) => !sinBonif.has(s));
  check('ninguna marca viene sólo de tiradas con dado de bonificación',
    marcas.every((m) => !soloConBonificacion.includes(m.skill)),
    soloConBonificacion.length ? `candidatas: ${soloConBonificacion.join(', ')}` : 'no hubo casos');

  check('los fracasos no marcan',
    marcas.every((m) => estadoAntes.rolls.some(
      (r) => String(r.commitment.skill) === m.skill && !['failure', 'fumble'].includes(r.execution.degree))));

  check('las características no se marcan',
    marcas.every((m) => !['STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU'].includes(m.skill)),
    marcas.map((m) => m.skill).join(', '));

  // ── Ejecutar la fase ─────────────────────────────────────────────────────
  console.log('\nLA FASE');
  const turno = await Turn.open(id);
  const inv = turno.investigator;
  const aspecto = inv.backstory.keyConnection ?? inv.backstory.aspects[0]!.id;
  const informe = turno.runDevelopmentPhase({
    autoayuda: { aspectId: aspecto, usarConexionClave: true },
  });
  await turno.commit();

  for (const m of informe.mejoras) {
    console.log(`   ${m.label}: ${m.antes}% · tirada ${m.check} → ${m.gain > 0 ? `+${m.gain} = ${m.despues}%` : 'sin cambio'}`);
  }
  console.log(`   premio del Keeper: ${informe.premio.dados}D${informe.premio.caras} = ${informe.premio.total} (${informe.premio.razon})`);
  if (informe.autoayuda) {
    const a = informe.autoayuda;
    console.log(`   auto-ayuda: tirada ${a.tirada} contra ${a.objetivo} → ${a.exito ? 'éxito' : 'fracaso'} (${a.sanDelta >= 0 ? '+' : ''}${a.sanDelta} COR)`);
  }
  console.log(`   ${informe.resumen}`);

  const despues = await Turn.open(id);
  const invDespues = despues.investigator;

  check('se comprobó una habilidad por marca', informe.mejoras.length === marcas.length,
    `${informe.mejoras.length} de ${marcas.length}`);
  check('las que mejoraron subieron entre 1 y 10',
    informe.mejoras.filter((m) => m.gain > 0).every((m) => m.gain >= 1 && m.gain <= 10));
  check('la mejora coincide con la regla',
    informe.mejoras.every((m) => (m.gain > 0) === mejora(m.antes, m.check)));
  check('la ficha quedó con los valores nuevos',
    informe.mejoras.every((m) => (invDespues.skills[m.skill]?.base ?? 0) === m.despues));
  check('la Cordura no pasó del techo', invDespues.derived.san <= maxCordura(invDespues),
    `${invDespues.derived.san}/${maxCordura(invDespues)}`);

  console.log('\nCERRAR LA FASE BORRA LAS MARCAS');
  const marcasDespues = despues.developmentMarks();
  check('no quedan marcas', marcasDespues.length === 0, `${marcasDespues.length}`);
  check('la frontera se movió', invDespues.experience.lastDevelopmentSeq > 0,
    `seq ${invDespues.experience.lastDevelopmentSeq}`);
  check('cuenta una sesión sobrevivida', invDespues.experience.sessionsSurvived === 1,
    String(invDespues.experience.sessionsSurvived));
  // Y lo importante: correr la fase otra vez no debe regalar nada.
  const turno2 = await Turn.open(id);
  const informe2 = turno2.runDevelopmentPhase();
  check('correr la fase de nuevo no mejora nada', informe2.mejoras.length === 0,
    `${informe2.mejoras.length} mejoras`);

  console.log('\nEL AZAR DE LA FASE SIGUE SIENDO AUDITABLE');
  const final = await Turn.open(id);
  const verif = verifyRollChain(final.meta.seed, final.state.rolls);
  check('toda la cadena de tiradas verifica contra la semilla', verif.ok,
    verif.ok ? `${final.state.rolls.length} tiradas` : JSON.stringify(verif).slice(0, 120));

  console.log('\nAUTO-AYUDA');
  if (informe.autoayuda && !informe.autoayuda.exito) {
    const asp = invDespues.backstory.aspects.find((a) => a.id === informe.autoayuda!.aspectId)!;
    check('al fallar, el trasfondo quedó revisado', asp.text !== informe.autoayuda.texto);
  } else {
    check('al salir bien, sumó Cordura', (informe.autoayuda?.sanDelta ?? 0) > 0,
      String(informe.autoayuda?.sanDelta));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
