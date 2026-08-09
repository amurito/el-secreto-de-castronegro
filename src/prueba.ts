/**
 * PRUEBA DE HUMO DEL MOTOR — `npm run prueba`
 *
 * Ejecuta una partida completa SIN servidor y SIN modelo de lenguaje.
 * Si esto pasa, la arquitectura está bien: el motor es dueño del estado, los
 * dados y las reglas, y la IA es reemplazable.
 *
 * Cubre el criterio de aceptación del prototipo (Análisis Técnico v1.1 §10.3).
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { verifyRollChain } from './engine/rng.ts';
import { useStore, store } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';

useStore(fileStore);

const log = (...a: unknown[]) => console.log(...a);
const noop = () => {};
let fallos = 0;
function check(nombre: string, ok: boolean, detalle = '') {
  log(`  ${ok ? '✓' : '✗'} ${nombre}${detalle ? ' — ' + detalle : ''}`);
  if (!ok) fallos++;
}

async function main() {
  // Semilla fija: la partida es reproducible tirada por tirada.
  const id = await createCampaign(AGUA_QUIETA, 'PRUEBA DE HUMO', 'a'.repeat(64));
  log(`\nCampaña ${id} (semilla fija)\n`);

  async function act(text: string) {
    const t = await Turn.open(id);
    t.submitIntent(text, 'p1');
    const r = await runOfflineTurn(t, AGUA_QUIETA, text, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
    return t;
  }

  log('1. ACCIÓN LIBRE CON TIRADA REAL');
  let t = await act('Me acerco al agua y miro el reflejo durante un minuto.');
  const r1 = t.state.rolls[0];
  check('se ejecutó una tirada', Boolean(r1));
  if (r1) {
    check('el resultado está en 1..100', r1.execution.rawResult >= 1 && r1.execution.rawResult <= 100,
      `${r1.commitment.skillLabel} ${r1.commitment.baseValue}% → D100=${r1.execution.rawResult} ${r1.execution.degree}`);
    check('el compromiso se fijó antes que la ejecución',
      r1.commitment.committedAt <= r1.execution.executedAt);
    check('la tirada tiene prueba criptográfica', r1.execution.proof.hmac.length === 64);
  }
  check('la exposición al Umbral subió', t.investigator.umbral.exposure > 0,
    `exposición ${t.investigator.umbral.exposure}, estabilidad ${t.investigator.umbral.stability}`);

  log('\n2. GATE — revelar propiedad oculta sin cumplir la condición');
  // (a) El objeto ni siquiera está al alcance: el retrato está en la cocina.
  t = await Turn.open(id);
  const lejos = t.executeTool('discover_property', {
    item_id: 'it-foto1897', property_id: 'p-1897-rostro', how: 'porque sí', compared_with: '',
  });
  check('rechaza si el objeto no está al alcance', !lejos.ok && lejos.message.includes('alcance'),
    lejos.message.slice(0, 80) + '…');

  // (b) Al alcance, pero sin cumplir la condición de comparación.
  await act('Entro a la casa');
  t = await Turn.open(id);
  const sinCumplir = t.executeTool('discover_property', {
    item_id: 'it-foto1897', property_id: 'p-1897-rostro', how: 'porque sí', compared_with: '',
  });
  check('rechaza si no se cumple la condición', !sinCumplir.ok && sinCumplir.message.includes('comparar'),
    sinCumplir.message.slice(0, 80) + '…');

  log('\n3. GATE — promover hipótesis sin evidencia');
  const bad2 = t.executeTool('propose_fact', { hypothesis_id: 'inexistente', statement: 'X' });
  check('el motor rechaza la promoción', !bad2.ok);

  log('\n4. GATE — una tirada por intención');
  t = await Turn.open(id);
  t.submitIntent('miro', 'p1');
  const args = { difficulty: 'regular', reason: 'a', stakes_success: 'a', stakes_failure: 'b', bonus_dice: 0, penalty_dice: 0, modifier_reason: '' };
  t.executeTool('request_roll', { skill: 'descubrir', ...args });
  const dup = t.executeTool('request_roll', { skill: 'escuchar', ...args });
  check('la segunda tirada se rechaza', !dup.ok);

  log('\n5. GATE — habilidad inexistente');
  t = await Turn.open(id);
  t.submitIntent('x', 'p1');
  const badSkill = t.executeTool('request_roll', { skill: 'telepatia', ...args });
  check('rechaza una habilidad que no está en la ficha', !badSkill.ok);

  log('\n6. INVESTIGACIÓN — recorrido completo');
  await act('Entro a la casa');
  await act('Voy al cuarto de Ignacio');
  await act('Leo el cuaderno');
  await act('Reviso el cuaderno hoja por hoja');
  // La tirada de Descubrir puede fallar: cada reintento es una intención nueva
  // y por lo tanto una tirada nueva, igual que en la mesa. La prueba comprueba
  // que el MECANISMO funciona, no que un dado concreto salga bien.
  for (let i = 0; i < 8; i++) {
    t = await act('Examino la fotografía dada vuelta');
    if (t.state.items['it-fotoreciente']!.discoveredProperties.length > 0) break;
  }
  check('la propiedad oculta se descubre al superar la tirada',
    t.state.items['it-fotoreciente']!.discoveredProperties.length > 0);
  t = await act('Comparo las dos fotografías');
  const props = Object.values(t.state.items).reduce((n, i) => n + i.discoveredProperties.length, 0);
  const docs = Object.values(t.state.documents).filter((d) => d.obtainedAt).length;
  check('se acumularon pistas', t.state.board.clues.length >= 3, `${t.state.board.clues.length} pistas`);
  check('se entregaron documentos', docs >= 1, `${docs} documentos`);
  check('se descubrieron propiedades ocultas', props >= 1, `${props} propiedades`);
  check('la estabilidad bajó', t.investigator.umbral.stability < 100,
    `exposición ${t.investigator.umbral.exposure}, estabilidad ${t.investigator.umbral.stability}`);
  check('se cruzó al menos un umbral', t.investigator.umbral.thresholdsCrossed.length > 0,
    t.investigator.umbral.thresholdsCrossed.join(', ') || 'ninguno');

  log('\n7. CONECTIVIDAD — el motor no deja teletransportarse');
  // El MOTOR rechaza el salto directo: cuarto y patio no están conectados.
  t = await Turn.open(id);
  const salto = t.executeTool('move_to_location', { location_id: 'patio', minutes: 0 });
  check('el motor rechaza el salto directo cuarto → patio', !salto.ok, salto.message.slice(0, 80));
  // El NARRADOR, en cambio, resuelve el trayecto pasando por la cocina.
  t = await act('Voy al patio');
  check('el narrador rutea por la cocina en vez de rendirse',
    t.state.world.currentLocation === 'patio');

  log('\n8. CONSECUENCIA PERSISTENTE');
  t = await act('Bajo al aljibe');
  check('se registró una consecuencia', t.state.consequences.length > 0);
  for (const c of t.state.consequences) log(`      · ${c.worldReminder}`);

  log('\n9. PERSISTENCIA — recarga desde disco');
  const antes = JSON.stringify(t.state);
  const reloaded = await Turn.open(id);
  const eventos = await store().readAll(id);
  check('el estado sobrevive a la recarga', JSON.stringify(reloaded.state) === antes,
    `${eventos.length} eventos en el log`);

  log('\n10. RNG VERIFICABLE');
  const meta = (await store().getMeta(id))!;
  const chain = verifyRollChain(meta.seed, reloaded.state.rolls);
  check(`la cadena de ${reloaded.state.rolls.length} tiradas verifica contra la semilla`, chain.ok,
    chain.ok ? '' : `fallan ${chain.failures.join(', ')}`);

  log('\n11. MUERTE PERMANENTE Y CONTINUIDAD');
  t = await Turn.open(id);
  const cluesAntes = t.state.board.clues.length;
  const consAntes = t.state.consequences.length;
  check('hay consecuencias antes de morir (si no, la prueba siguiente es vacía)', consAntes > 0);
  t.executeTool('apply_damage', { amount: 99, cause: 'prueba de muerte' });
  await t.commit();
  t = await Turn.open(id);
  check('el investigador quedó muerto', t.investigator.status === 'dead');
  t.introduceInvestigator('inv-tomas', 'p1');
  await t.commit();
  t = await Turn.open(id);
  check('se continúa con otro investigador', t.investigator.name === 'Tomás Belgrano');
  check('el mundo conserva las pistas', t.state.board.clues.length === cluesAntes, `${t.state.board.clues.length}`);
  check('el mundo conserva las consecuencias', t.state.consequences.length === consAntes, `${t.state.consequences.length}`);
  check('el nuevo investigador NO hereda la exposición', t.investigator.umbral.exposure === 0);

  log('\n12. DETERMINISMO DEL REPLAY');
  const a = await Turn.open(id);
  const b = await Turn.open(id);
  check('dos folds del mismo log dan el mismo estado',
    JSON.stringify(a.state) === JSON.stringify(b.state));

  log(`\n${fallos === 0 ? 'TODO OK' : `${fallos} COMPROBACIONES FALLARON`}\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
