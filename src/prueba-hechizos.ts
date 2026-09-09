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
 *   3. Retrocompatibilidad: una campaña guardada antes de esta feature no
 *      tiene estos campos en su CAMPAIGN_CREATED persistido, y el motor
 *      tiene que rellenarlos al plegar el log en vez de reventar.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LO_QUE_BERNARDO_SABIA } from './scenario/loquebernardosabia.ts';
import { INVIERNO_DEBIDO } from './scenario/inviernodebido.ts';
import { EL_VIGESIMO } from './scenario/elvigesimo.ts';
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
    const t = await Turn.open(id);
    // Hay que dejar pasar la espera del hechizo: desde que existe, no se
    // puede volver a lanzar el mismo en el mismo rato (ver bloque 9-bis).
    t.executeTool('advance_time', { minutes: 60, reason: 'dejar pasar la espera del hechizo' });
    // Los PM se miden DESPUÉS de avanzar el tiempo: pasar una hora recupera
    // 1 PM (p. 172), y medirlos antes hacía que la cuenta no cerrara por uno.
    const mp2Antes = t.state.investigators[t.state.activeInvestigator]!.derived.mp;
    const hp2Antes = t.state.investigators[t.state.activeInvestigator]!.derived.hp;
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

  console.log('\n9-bis. LA ESPERA ENTRE LANZAMIENTOS');
  {
    // Reportado jugando: cuatro intentos del mismo hechizo en la misma
    // pantalla, todos fallidos, todos gratis. El manual dice que fallar no
    // cuesta Puntos de Magia, no que se pueda insistir sin límite.
    const id = await createCampaign(AGUA_QUIETA, 'ESPERA', 'v'.repeat(64));
    let t = await Turn.open(id);
    t.executeTool('learn_spell', { spell_id: 'sostener-el-aire', source: 'prueba' });
    await t.commit();

    // Un turno por intento, como en el juego real: `castSpell` (api.local.ts)
    // abre su propio Turn en cada clic. Meter los dos en el mismo turno
    // chocaría antes contra «una tirada por intención», que es otra regla.
    t = await Turn.open(id);
    const primero = t.executeTool('cast_spell', { spell_id: 'sostener-el-aire' });
    await t.commit();

    t = await Turn.open(id);
    const segundo = t.executeTool('cast_spell', { spell_id: 'sostener-el-aire' });
    await t.commit();
    check('el primer intento se acepta (salga o no el hechizo)', primero.ok, primero.message.slice(0, 60));
    check('el segundo intento seguido se rechaza por la espera',
      !segundo.ok && /esperar/.test(segundo.message), segundo.message.slice(0, 90));

    // Y la espera corre contra el reloj DEL MUNDO: si pasa el tiempo, se puede.
    t = await Turn.open(id);
    t.executeTool('advance_time', { minutes: 120, reason: 'prueba' });
    const tercero = t.executeTool('cast_spell', { spell_id: 'sostener-el-aire' });
    await t.commit();
    check('pasado el tiempo del mundo, vuelve a poder lanzarse', tercero.ok, tercero.message.slice(0, 60));
  }

  console.log('\n9-ter. «CONTAR LO QUE NO SE PUEDE ANOTAR» BAJA EXPOSICIÓN');
  {
    const id = await createCampaign(AGUA_QUIETA, 'EXPOSICION', 'w'.repeat(64));
    let t = await Turn.open(id);
    t.executeTool('learn_spell', { spell_id: 'contar-lo-que-no-se-anota', source: 'prueba' });
    // Se sube la Exposición desde varias fuentes distintas: con una sola, los
    // rendimientos decrecientes no dejarían llegar lo bastante alto.
    for (const f of ['a', 'b', 'c', 'd', 'e', 'f']) {
      t.executeTool('apply_umbral_exposure', { amount: 12, source: `prueba:${f}`, cause: 'prueba' });
    }
    await t.commit();
    const antes = invDe((await loadState(id)).state);
    const expAntes = antes.umbral.exposure;
    const picoAntes = antes.umbral.peakExposure;
    const umbralesAntes = antes.umbral.thresholdsCrossed.length;
    check('la Exposición subió lo suficiente para poder bajarla', expAntes > 20, `${expAntes}`);

    // Se insiste con semillas hasta que la tirada de PODER de la primera vez
    // salga: no se puede fijar el resultado de una tirada con una semilla.
    let lanzo = false;
    for (let i = 0; i < 12 && !lanzo; i++) {
      const t2 = await Turn.open(id);
      t2.executeTool('advance_time', { minutes: 400, reason: 'esperar la espera del hechizo' });
      const r = t2.executeTool('cast_spell', { spell_id: 'contar-lo-que-no-se-anota' });
      await t2.commit();
      lanzo = r.ok && /Exposición al Umbral/.test(r.message);
    }
    check('el hechizo llega a lanzarse en algún intento', lanzo);

    const desp = invDe((await loadState(id)).state);
    check('la Exposición BAJÓ', desp.umbral.exposure < expAntes, `${expAntes} → ${desp.umbral.exposure}`);
    check('el pico histórico NO se tocó', desp.umbral.peakExposure === picoAntes,
      `${picoAntes} → ${desp.umbral.peakExposure}`);
    check('los umbrales ya cruzados siguen cruzados',
      desp.umbral.thresholdsCrossed.length >= umbralesAntes,
      `${umbralesAntes} → ${desp.umbral.thresholdsCrossed.length}`);
    check('nunca baja del piso que dejó el pico',
      desp.umbral.exposure >= Math.round(desp.umbral.peakExposure * 0.35) - 1,
      `exp ${desp.umbral.exposure} · pico ${desp.umbral.peakExposure}`);
  }

  console.log('\n9-quater. «CERRARLE EL PASO»: EL PRIMER HECHIZO QUE LE PEGA A ALGUIEN');
  {
    // El único hechizo con efecto 'dano', y el único que necesita objetivo y
    // combate activo. El daño se aplica con el MISMO `danarNpc` que un tajo
    // cualquiera, así que hereda el comportamiento contra un rival con
    // punto débil sin ningún caso especial. Ver «El Círculo Rojo».
    const idBase = await createCampaign(AGUA_QUIETA, 'DANO', 'r'.repeat(64));
    let t = await Turn.open(idBase);
    t.executeTool('learn_spell', { spell_id: 'cerrarle-el-paso', source: 'prueba' });
    await t.commit();

    // Fuera de combate no se puede: sería matar NPCs sin que el motor de
    // combate se entere.
    t = await Turn.open(idBase);
    const sinCombate = t.executeTool('cast_spell', { spell_id: 'cerrarle-el-paso', npc_id: 'npc-rosa' });
    await t.commit();
    check('sin combate activo, lo rechaza', !sinCombate.ok, sinCombate.message.slice(0, 90));

    t = await Turn.open(idBase);
    const sinObjetivo = t.executeTool('cast_spell', { spell_id: 'cerrarle-el-paso' });
    await t.commit();
    check('sin objetivo, lo rechaza', !sinObjetivo.ok, sinObjetivo.message.slice(0, 90));

    // Con combate real contra un NPC con ficha de pelea, sí: baja PV.
    // Se buscan semillas hasta que la tirada de PODER de la primera vez
    // salga —no se puede fijar el resultado de una tirada—.
    let bajoPv: { antes: number; despues: number; mensaje: string } | null = null;
    for (const letra of 'abcdefghijklmnop') {
      const id = await createCampaign(INVIERNO_DEBIDO, `DANO-${letra}`, letra.repeat(64));
      const t2 = await Turn.open(id);
      t2.executeTool('learn_spell', { spell_id: 'cerrarle-el-paso', source: 'prueba' });
      t2.executeTool('start_combat', { npc_ids: 'npc-cirilo', reason: 'prueba' });
      const antes = t2.state.npcs['npc-cirilo']?.combate?.hp ?? 0;
      const r = t2.executeTool('cast_spell', { spell_id: 'cerrarle-el-paso', npc_id: 'npc-cirilo' });
      await t2.commit();
      const despues = (await Turn.open(id)).state.npcs['npc-cirilo']?.combate?.hp ?? 0;
      if (r.ok && despues < antes) { bajoPv = { antes, despues, mensaje: r.message }; break; }
    }
    check('con combate activo y objetivo, baja los PV del rival de verdad',
      bajoPv !== null, bajoPv ? `${bajoPv.antes} → ${bajoPv.despues}` : '(no salió en ninguna semilla)');

    // Contra un rival con `invulnerabilidad`, el daño mágico se cierra igual
    // que un tajo común salvo que vaya dirigido al punto débil — se hereda
    // de `danarNpc`, sin ninguna línea especial para hechizos.
    let seCerro = false;
    for (const letra of 'abcdefghijklmnop') {
      const id = await createCampaign(EL_VIGESIMO, `DANO-INVUL-${letra}`, letra.repeat(64));
      const t3 = await Turn.open(id);
      t3.executeTool('learn_spell', { spell_id: 'cerrarle-el-paso', source: 'prueba' });
      t3.executeTool('start_combat', { npc_ids: 'npc-bernardo', reason: 'prueba' });
      const r = t3.executeTool('cast_spell', { spell_id: 'cerrarle-el-paso', npc_id: 'npc-bernardo' });
      await t3.commit();
      const hp = (await Turn.open(id)).state.npcs['npc-bernardo']?.combate?.hp ?? 0;
      if (r.ok && /se detiene sola/.test(r.message) && hp === 17) { seCerro = true; break; }
    }
    check('contra un rival invulnerable, el hechizo se cierra igual que un tajo', seCerro);
  }

  console.log('\n10. RETROCOMPATIBILIDAD: campaña guardada antes de que existieran spellsKnown/pendingLuckBonus');
  {
    // Bug real, reportado jugando el 2026-09-14: una campaña vieja no tiene
    // estos dos campos en el CAMPAIGN_CREATED que ya está persistido — el
    // fold es del log crudo, no del tipo actual. Simula ese log viejo
    // borrando los campos del evento ya escrito en disco, y confirma que
    // `initFromCreation` (reducers.ts) los rellena en vez de reventar.
    const idVieja = await createCampaign(AGUA_QUIETA, 'CAMPAÑA-VIEJA', 'o'.repeat(64));
    const log = join(process.cwd(), 'partidas', idVieja, 'eventos.jsonl');
    const lineas = readFileSync(log, 'utf8').split('\n').filter((l) => l.trim());
    const creado = JSON.parse(lineas[0]!);
    for (const inv of creado.payload.investigators) {
      delete inv.spellsKnown;
      delete inv.pendingLuckBonus;
    }
    lineas[0] = JSON.stringify(creado);
    writeFileSync(log, lineas.join('\n') + '\n', 'utf8');

    const { state } = await loadState(idVieja);
    const inv = invDe(state);
    check('spellsKnown se rellena con [] en vez de romper', Array.isArray(inv.spellsKnown) && inv.spellsKnown.length === 0);
    check('pendingLuckBonus se rellena con 0', inv.pendingLuckBonus === 0);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
