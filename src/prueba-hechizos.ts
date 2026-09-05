/**
 * PRUEBA DE HECHIZOS — `npm run prueba:hechizos`
 *
 * CoC 7e trae Puntos de Magia desde el principio del proyecto (`derived.mp`
 * = POD/5), y hasta esta sesión ninguna aventura los usaba: era un número
 * decorativo en la ficha. Esta suite protege el sistema que los pone a
 * trabajar (ver ROADMAP §4, "Magia", y `rules/hechizos.ts` sobre por qué los
 * dos hechizos son originales) en dos capas:
 *
 *   1. El motor: aprender, la tirada de PODER difícil de la primera vez
 *      (p. 174 — nunca más se pide una vez que sale bien), el costo en PM
 *      con desborde a PV, el costo de Cordura, y los dos efectos genéricos.
 *   2. El contenido nuevo, "Lo que Bernardo sabía": las tres ramas según
 *      cómo terminó El Vigésimo (Ahijado, libro, ninguna), y que el segundo
 *      hechizo y el cierre respondan a lo que ya se aprendió.
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LO_QUE_BERNARDO_SABIA } from './scenario/loquebernardosabia.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { HECHIZO_POR_ID } from './rules/hechizos.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;

async function jugar(id: string, intencion: string, scenario = AGUA_QUIETA) {
  const t = await Turn.open(id);
  t.submitIntent(intencion, 'p1');
  const r = await runOfflineTurn(t, scenario, intencion, () => {});
  t.narrate(r.narration, r.options);
  await t.commit();
  return (await Turn.open(id)).state;
}

async function main() {
  // ══ 1. EL MOTOR, GENÉRICO — cualquier aventura sirve de sandbox ══════════
  const id = await createCampaign(AGUA_QUIETA, 'HECHIZOS', 'h'.repeat(64));

  console.log('\n1. APRENDER');
  {
    const t = await Turn.open(id);
    check('rechaza un hechizo que no existe',
      !t.executeTool('learn_spell', { spell_id: 'inventado', source: 'x' }).ok);
    check('rechaza sin decir de dónde lo aprendió',
      !t.executeTool('learn_spell', { spell_id: 'adivinar-la-forma', source: '   ' }).ok);
    const r = t.executeTool('learn_spell', { spell_id: 'adivinar-la-forma', source: 'prueba' });
    check('acepta y avisa que todavía no está probado', r.ok && /Poder difícil/.test(r.message), r.message);
    await t.commit();
  }
  let s = (await Turn.open(id)).state;
  check('queda en spellsKnown, sin probar',
    invDe(s).spellsKnown.some((h) => h.id === 'adivinar-la-forma' && !h.proven),
    JSON.stringify(invDe(s).spellsKnown));

  console.log('\n2. LANZAR SIN SABERLO, RECHAZADO');
  {
    const t = await Turn.open(id);
    check('rechaza un hechizo que no sabe',
      !t.executeTool('cast_spell', { spell_id: 'sostener-el-aire' }).ok);
  }

  console.log('\n3. LA PRIMERA VEZ PIDE PODER DIFÍCIL, Y SÓLO LA PRIMERA — Y COBRA PM/PV/CORDURA');
  // El resultado depende del d100: reintenta en turnos sucesivos —cada uno
  // abre un Turn nuevo, así que no compite con el límite de una tirada por
  // intención— hasta que salga. Con POD típico (15-90) veinte intentos
  // agotan la probabilidad de fallar todos por casualidad. Un intento
  // fallido no cuesta nada (p. 174), así que mp/hp/san sólo se mueven en el
  // intento que sale bien: comparar antes/después del lazo entero alcanza,
  // sin necesitar forzar los PM a mano.
  const defForma = HECHIZO_POR_ID['adivinar-la-forma']!;
  let probado = false;
  let intentos = 0;
  const rollsAntes = s.rolls.length;
  const mpAntes = invDe(s).derived.mp;
  const hpAntes = invDe(s).derived.hp;
  const sanAntes0 = invDe(s).derived.san;
  for (; intentos < 20 && !probado; intentos++) {
    const t = await Turn.open(id);
    const r = t.executeTool('cast_spell', { spell_id: 'adivinar-la-forma' });
    check(`intento ${intentos + 1}: la herramienta acepta la llamada`, r.ok, r.message);
    await t.commit();
    s = (await Turn.open(id)).state;
    probado = invDe(s).spellsKnown.find((h) => h.id === 'adivinar-la-forma')!.proven;
  }
  check('termina probado dentro de 20 intentos', probado, `${intentos} intento(s)`);
  check('cada intento dejó una tirada real en el registro', s.rolls.length > rollsAntes,
    `${s.rolls.length - rollsAntes} tiradas`);
  const tiradaPow = s.rolls.find((r) => r.commitment.skill === 'POW' && r.commitment.difficulty === 'hard');
  check('la tirada de la primera vez es Poder, difícil', Boolean(tiradaPow));

  const pagadoConMp1 = Math.min(defForma.costoPM, mpAntes);
  const resto1 = defForma.costoPM - pagadoConMp1;
  check('cobra los PM de la única tirada que salió bien (y el resto de PV si no alcanzaban)',
    invDe(s).derived.mp === mpAntes - pagadoConMp1 && invDe(s).derived.hp === Math.max(0, hpAntes - resto1),
    `PM ${mpAntes}→${invDe(s).derived.mp} (esperado ${mpAntes - pagadoConMp1}); ` +
    `PV ${hpAntes}→${invDe(s).derived.hp} (esperaba restar ${resto1})`);
  check('cobra la Cordura que declara el hechizo',
    invDe(s).derived.san === sanAntes0 - (defForma.costoCordura ?? 0),
    `${sanAntes0} → ${invDe(s).derived.san}`);

  console.log('\n   Y el efecto de "adivinar la forma" quedó aplicado: un dado de bonificación pendiente');
  check('pendingLuckBonus quedó en 1', invDe(s).pendingLuckBonus === 1, String(invDe(s).pendingLuckBonus));

  console.log('\n4. UNA SEGUNDA VEZ, YA PROBADO, NO PIDE TIRADA — Y COBRA DE NUEVO');
  {
    const antesDeRolls = s.rolls.length;
    const mp2Antes = invDe(s).derived.mp;
    const hp2Antes = invDe(s).derived.hp;
    const t = await Turn.open(id);
    const r = t.executeTool('cast_spell', { spell_id: 'adivinar-la-forma' });
    check('acepta', r.ok, r.message);
    await t.commit();
    s = (await Turn.open(id)).state;
    check('no agregó ninguna tirada nueva', s.rolls.length === antesDeRolls,
      `${antesDeRolls} → ${s.rolls.length}`);
    check('el mensaje no dice que quedó probado esta vez (ya lo estaba)',
      !/Queda probado/.test(r.message), r.message);
    const pagado2 = Math.min(defForma.costoPM, mp2Antes);
    const resto2 = defForma.costoPM - pagado2;
    check('vuelve a cobrar PM/PV aunque ya esté probado',
      invDe(s).derived.mp === mp2Antes - pagado2 && invDe(s).derived.hp === Math.max(0, hp2Antes - resto2),
      `PM ${mp2Antes}→${invDe(s).derived.mp}; PV ${hp2Antes}→${invDe(s).derived.hp}`);
  }

  console.log('\n5. "SOSTENER EL AIRE" RESTAURA ESTABILIDAD, SIN COSTO DE CORDURA');
  {
    const t = await Turn.open(id);
    t.executeTool('apply_stability_shift', { amount: -20, cause: 'prueba: bajarla para poder verla subir' });
    t.executeTool('learn_spell', { spell_id: 'sostener-el-aire', source: 'prueba' });
    await t.commit();
  }
  s = (await Turn.open(id)).state;
  const sanAntes = invDe(s).derived.san;
  const estAntes = invDe(s).umbral.stability;
  let probado2 = false;
  for (let n = 0; n < 20 && !probado2; n++) {
    const t = await Turn.open(id);
    t.executeTool('cast_spell', { spell_id: 'sostener-el-aire' });
    await t.commit();
    s = (await Turn.open(id)).state;
    probado2 = invDe(s).spellsKnown.find((h) => h.id === 'sostener-el-aire')!.proven;
  }
  check('quedó probado', probado2);
  check('la Estabilidad subió', invDe(s).umbral.stability > estAntes,
    `${estAntes} → ${invDe(s).umbral.stability}`);
  check('la Cordura no se tocó ("sostener el aire" no cuesta Cordura)',
    invDe(s).derived.san === sanAntes, `${sanAntes} → ${invDe(s).derived.san}`);

  console.log('\n6. LOS PM SE RECUPERAN CON EL TIEMPO, 1 POR HORA, SIN PASAR DEL MÁXIMO');
  {
    const t = await Turn.open(id);
    // Los deja bien abajo para no depender de cuánto quedó de las secciones
    // anteriores. `apply_sanity_loss`/etc. no tocan PM; se fuerza gastando.
    t.executeTool('cast_spell', { spell_id: 'sostener-el-aire' });
    await t.commit();
    let ss = (await Turn.open(id)).state;
    const mpAntes = invDe(ss).derived.mp;
    const maxMp = invDe(ss).derived.maxMp;

    const t2 = await Turn.open(id);
    t2.executeTool('advance_time', { minutes: 59, reason: 'prueba: menos de una hora' });
    await t2.commit();
    ss = (await Turn.open(id)).state;
    check('menos de una hora no recupera nada', invDe(ss).derived.mp === mpAntes,
      `${mpAntes} → ${invDe(ss).derived.mp}`);

    const t3 = await Turn.open(id);
    t3.executeTool('advance_time', { minutes: 121, reason: 'prueba: dos horas y monedas' });
    await t3.commit();
    ss = (await Turn.open(id)).state;
    check('dos horas recuperan 2 PM, no más', invDe(ss).derived.mp === Math.min(maxMp, mpAntes + 2),
      `${mpAntes} → ${invDe(ss).derived.mp} (máximo ${maxMp})`);

    const t4 = await Turn.open(id);
    t4.executeTool('advance_time', { minutes: 60 * 100, reason: 'prueba: mucho tiempo' });
    await t4.commit();
    ss = (await Turn.open(id)).state;
    check('con tiempo de sobra, no pasa del máximo', invDe(ss).derived.mp === maxMp,
      String(invDe(ss).derived.mp));
  }

  // ══ 2. EL CONTENIDO: "LO QUE BERNARDO SABÍA" ═════════════════════════════
  console.log('\n7. RAMA DEL AHIJADO (heredar el anillo)');
  {
    const idPrevio = await createCampaign(AGUA_QUIETA, 'PREVIA-HEREDAR', 'i'.repeat(64));
    let t = await Turn.open(idPrevio);
    t.executeTool('record_consequence', {
      description: 'El investigador se puso el anillo de rubí de Bernardo Díaz en el laboratorio de la Casa, y quedó vinculado a él.',
      scope: 'world', permanent: 'true',
    });
    t.executeTool('reach_ending', { ending_id: 'heredar', title: 'Prueba', text: 'x' });
    await t.commit();
    const previo = (await loadState(idPrevio)).state;

    const idEpilogo = await createCampaign(LO_QUE_BERNARDO_SABIA, 'EPILOGO-AHIJADO', 'j'.repeat(64), {
      estadoAnterior: previo, mesesTranscurridos: 1,
    });
    let e = (await loadState(idEpilogo)).state;
    e = await jugar(idEpilogo, 'Reviso lo que Bernardo dejó', LO_QUE_BERNARDO_SABIA);
    check('narra al Ahijado', e.narrative.some((n) => n.kind === 'keeper' && n.text.includes('Ahijado')));
    check('aprende "adivinar la forma"',
      invDe(e).spellsKnown.some((h) => h.id === 'adivinar-la-forma'),
      JSON.stringify(invDe(e).spellsKnown));

    e = await jugar(idEpilogo, 'Aprendo el segundo hechizo', LO_QUE_BERNARDO_SABIA);
    check('aprende también "sostener el aire"',
      invDe(e).spellsKnown.some((h) => h.id === 'sostener-el-aire'),
      JSON.stringify(invDe(e).spellsKnown));

    e = await jugar(idEpilogo, 'Cierro este capítulo', LO_QUE_BERNARDO_SABIA);
    check('llega a un desenlace con los dos hechizos aprendidos',
      Boolean(e.ending) && /dos cosas/.test(String(e.ending?.text ?? '')),
      JSON.stringify(e.ending));
  }

  console.log('\n8. RAMA DEL LIBRO (cortar el anillo)');
  {
    const idPrevio = await createCampaign(AGUA_QUIETA, 'PREVIA-CORTAR', 'k'.repeat(64));
    let t = await Turn.open(idPrevio);
    t.executeTool('record_consequence', {
      description: 'El investigador le sacó el anillo a Bernardo Díaz y lo destruyó en el horno del laboratorio, cortando el ciclo sin saber si hacía falta que siguiera.',
      scope: 'world', permanent: 'true',
    });
    t.executeTool('reach_ending', { ending_id: 'cortar', title: 'Prueba', text: 'x' });
    await t.commit();
    const previo = (await loadState(idPrevio)).state;
    const mitosAntes = invDe(previo).skills['mitos' as never]?.base ?? 0;

    const idEpilogo = await createCampaign(LO_QUE_BERNARDO_SABIA, 'EPILOGO-LIBRO', 'l'.repeat(64), {
      estadoAnterior: previo, mesesTranscurridos: 1,
    });
    const e = await jugar(idEpilogo, 'Busco lo que Bernardo dejó', LO_QUE_BERNARDO_SABIA);
    check('narra el libro sin título', e.narrative.some((n) => n.kind === 'keeper' && n.text.includes('sin título')));
    check('aprende "adivinar la forma" leyendo el libro',
      invDe(e).spellsKnown.some((h) => h.id === 'adivinar-la-forma'));
    check('leer el libro también sube Mitos',
      (invDe(e).skills['mitos' as never]?.base ?? 0) > mitosAntes);
  }

  console.log('\n9. NI ANILLO NI LIBRO (denunciar/irse): sin magia');
  {
    const idPrevio = await createCampaign(AGUA_QUIETA, 'PREVIA-NADA', 'm'.repeat(64));
    let t = await Turn.open(idPrevio);
    t.executeTool('record_consequence', {
      description: 'El investigador escapó de la Casa de Díaz sin el anillo y sin denunciar nada, la misma noche que se enfrentó a Bernardo.',
      scope: 'world', permanent: 'true',
    });
    t.executeTool('reach_ending', { ending_id: 'irse-vigesimo', title: 'Prueba', text: 'x' });
    await t.commit();
    const previo = (await loadState(idPrevio)).state;

    const idEpilogo = await createCampaign(LO_QUE_BERNARDO_SABIA, 'EPILOGO-NADA', 'n'.repeat(64), {
      estadoAnterior: previo, mesesTranscurridos: 1,
    });
    let e = await jugar(idEpilogo, 'Reviso lo que Bernardo dejó', LO_QUE_BERNARDO_SABIA);
    check('no aprende nada', invDe(e).spellsKnown.length === 0, JSON.stringify(invDe(e).spellsKnown));

    e = await jugar(idEpilogo, 'Cierro este capítulo', LO_QUE_BERNARDO_SABIA);
    check('el desenlace reconoce que no hay nada que llevarse',
      Boolean(e.ending) && /Sin nada que llevarse/.test(String(e.ending?.title ?? '')),
      JSON.stringify(e.ending));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
