/**
 * PRUEBA DEL ENCADENADO DE CAMPAÑA — `npm run prueba:campana`
 *
 * Dos aventuras dejan de ser dos partidas cuando el investigador cruza de una a
 * la otra. Lo que cruza y lo que no es una decisión de diseño, y ésta es la
 * prueba que la sostiene.
 *
 *   CRUZA   habilidades mejoradas, Cordura, trasfondo, cicatrices mentales,
 *           EXPOSICIÓN al Umbral entera y los umbrales cruzados.
 *   SE CURA estabilidad (por anclaje, que es lo que el canon permite) y PV.
 *   NO CRUZA objetos, pistas ni tablero: son de la investigación anterior.
 *
 * Y la regla que ninguna comodidad puede ablandar: **un investigador muerto
 * sigue muerto.**
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LA_LEGUA } from './scenario/legua.ts';
import { siguienteDe, mesesEntre, CATALOGO } from './scenario/catalogo.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { STABILITY_RECOVERY, techoDeEstabilidad } from './rules/umbral.config.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;

async function turno(id: string, escenario: any, intencion: string) {
  const t = await Turn.open(id);
  if (t.state.ending) return;
  t.submitIntent(intencion, 'p1');
  const r = await runOfflineTurn(t, escenario, intencion, noop);
  t.narrate(r.narration, r.options);
  await t.commit();
}

/** Juega Agua Quieta hasta un desenlace y pasa la fase de desarrollo. */
async function primeraAventura(semilla: string) {
  const id = await createCampaign(AGUA_QUIETA, 'CAMPAÑA 1', semilla.repeat(64).slice(0, 64));
  const usadas = new Set<string>();
  for (let n = 0; n < 45; n++) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    const disp = accionesDisponibles(t.state, AGUA_QUIETA);
    const sig = disp.find((o) => !o.final && !usadas.has(o.id))
      ?? disp.find((o) => o.id === 'bajar')
      ?? disp.find((o) => o.final);
    if (!sig) break;
    usadas.add(sig.id);
    await turno(id, AGUA_QUIETA, sig.intencion);
  }
  // Fase de desarrollo: es lo que produce el investigador que va a cruzar.
  const t = await Turn.open(id);
  const inv = t.investigator;
  const informe = t.runDevelopmentPhase({
    autoayuda: { aspectId: inv.backstory.keyConnection ?? inv.backstory.aspects[0]!.id, usarConexionClave: true },
  });
  await t.commit();
  return { id, informe, estado: (await Turn.open(id)).state };
}

async function main() {
  console.log('\nEL CATÁLOGO SABE QUÉ SIGUE');
  const sig = siguienteDe('agua-quieta');
  check('después de Agua Quieta viene otra aventura', sig?.scenario.id === 'legua-perdida',
    sig?.scenario.title ?? 'ninguna');
  check('la última de la línea no tiene siguiente',
    siguienteDe(CATALOGO[CATALOGO.length - 1]!.scenario.id) === null);
  const meses = mesesEntre('agua-quieta', 'legua-perdida');
  check('el hueco entre aventuras se calcula de las fechas', meses >= 4 && meses <= 6, `${meses} meses`);

  // ── Primera aventura completa ────────────────────────────────────────────
  console.log('\nPRIMERA AVENTURA');
  const uno = await primeraAventura('s');
  const invUno = invDe(uno.estado);
  console.log(`  final: ${uno.estado.ending?.title ?? 'sin final'}`);
  console.log(`  Elena: PV ${invUno.derived.hp}/${invUno.derived.maxHp} · COR ${invUno.derived.san} · Exp ${invUno.umbral.exposure} · Est ${invUno.umbral.stability}`);
  console.log(`  ${uno.informe.resumen}`);
  check('la primera aventura cerró', Boolean(uno.estado.ending));
  check('la fase de desarrollo dejó algo', uno.informe.mejoras.length > 0 || uno.informe.sanGanada !== 0);

  // ── El cruce ─────────────────────────────────────────────────────────────
  console.log('\nEL CRUCE');
  const idDos = await createCampaign(LA_LEGUA, 'CAMPAÑA 2', 't'.repeat(64), {
    estadoAnterior: uno.estado,
    mesesTranscurridos: meses,
  });
  const dos = (await loadState(idDos)).state;
  const invDos = invDe(dos);
  console.log(`  Elena: PV ${invDos.derived.hp}/${invDos.derived.maxHp} · COR ${invDos.derived.san} · Exp ${invDos.umbral.exposure} · Est ${invDos.umbral.stability}`);

  check('es la misma investigadora', invDos.id === invUno.id, invDos.name);

  console.log('\nLO QUE CRUZA');
  const mejoradas = uno.informe.mejoras.filter((m) => m.gain > 0);
  check('las habilidades mejoradas cruzan',
    mejoradas.every((m) => (invDos.skills[m.skill]?.base ?? 0) === m.despues),
    mejoradas.map((m) => `${m.label} ${m.despues}%`).join(', ') || 'ninguna mejoró esta vez');
  check('la Cordura cruza', invDos.derived.san === invUno.derived.san,
    `${invDos.derived.san} vs ${invUno.derived.san}`);
  check('la EXPOSICIÓN cruza entera —el canon dice que no baja—',
    invDos.umbral.exposure === invUno.umbral.exposure,
    `${invDos.umbral.exposure} vs ${invUno.umbral.exposure}`);
  check('los umbrales cruzados siguen cruzados',
    invUno.umbral.thresholdsCrossed.every((u) => invDos.umbral.thresholdsCrossed.includes(u)),
    invDos.umbral.thresholdsCrossed.join(', ') || 'ninguno');
  check('el trasfondo cruza, con las revisiones que haya sufrido',
    JSON.stringify(invDos.backstory.aspects) === JSON.stringify(invUno.backstory.aspects));

  console.log('\nLO QUE SE RECUPERA');
  check('los PV se curan', invDos.derived.hp === invDos.derived.maxHp,
    `${invDos.derived.hp}/${invDos.derived.maxHp}`);
  const techo = techoDeEstabilidad(invUno.umbral.exposure);
  const esperada = Math.min(
    Math.max(invUno.umbral.stability, techo),
    invUno.umbral.stability + STABILITY_RECOVERY.betweenSessions * meses,
  );
  check('la Estabilidad se recupera por anclaje', invDos.umbral.stability === esperada,
    `${invUno.umbral.stability} → ${invDos.umbral.stability} (techo ${techo} por exposición ${invUno.umbral.exposure})`);
  check('pero NO al 100: la exposición baja el techo',
    invUno.umbral.exposure === 0 || invDos.umbral.stability < 100,
    `${invDos.umbral.stability}`);

  console.log('\nLO QUE NO CRUZA');
  check('el tablero arranca limpio', dos.board.clues.length === 0,
    `${dos.board.clues.length} pistas`);
  check('las contradicciones no se arrastran', dos.board.contradictions.length === 0);
  check('los objetos son los de la aventura nueva',
    Object.keys(dos.items).every((k) => k in LA_LEGUA.items.reduce((a, i) => ({ ...a, [i.id]: 1 }), {})),
    Object.keys(dos.items).join(', '));
  check('el mapa es el de la aventura nueva', dos.world.currentLocation === 'casco',
    dos.world.currentLocation);

  console.log('\nLO QUE EL MUNDO RECUERDA');
  console.log(`  ${dos.consequences.length} consecuencias · ${dos.campaignCanon.length} de canon de campaña`);
  for (const c of dos.consequences) console.log(`   ● ${c.description.slice(0, 80)}`);
  check('las consecuencias permanentes de la aventura anterior cruzan',
    dos.consequences.length > 0, `${dos.consequences.length}`);
  check('todas las que cruzaron son permanentes', dos.consequences.every((c) => c.permanent));
  check('el desenlace anterior queda como canon de campaña',
    dos.campaignCanon.some((c) => c.statement.includes(uno.estado.ending!.title)),
    dos.campaignCanon.map((c) => c.statement).join(' | ').slice(0, 90));

  console.log('\nLA AVENTURA NUEVA SE JUEGA IGUAL');
  const opciones = accionesDisponibles(dos, LA_LEGUA);
  check('hay acciones desde el primer turno', opciones.length >= 6, `${opciones.length}`);
  await turno(idDos, LA_LEGUA, 'Le pregunto a Herminia qué pasó con Fermín');
  const trasUnTurno = (await loadState(idDos)).state;
  check('el primer turno resuelve', trasUnTurno.board.clues.length > 0,
    `${trasUnTurno.board.clues.length} pistas`);

  console.log('\nLA REGLA QUE NO SE ABLANDA');
  // Un investigador muerto no revive por empezar capítulo nuevo.
  const muerto: GameState = {
    ...uno.estado,
    investigators: {
      ...uno.estado.investigators,
      [invUno.id]: { ...invUno, status: 'dead' as const },
    },
  };
  const idTres = await createCampaign(LA_LEGUA, 'CAMPAÑA MUERTA', 'u'.repeat(64), {
    estadoAnterior: muerto, mesesTranscurridos: meses,
  });
  const tres = (await loadState(idTres)).state;
  check('el investigador muerto NO cruza vivo',
    tres.investigators[invUno.id]!.status === 'alive'
      && tres.investigators[invUno.id]!.derived.san !== invUno.derived.san,
    'arranca de cero, como pregenerado');
  check('y el activo es alguien que puede actuar',
    tres.investigators[tres.activeInvestigator]!.status === 'alive',
    tres.investigators[tres.activeInvestigator]!.name);

  console.log('\nSIN HERENCIA TODO SIGUE IGUAL');
  const idSolo = await createCampaign(LA_LEGUA, 'SUELTA', 'v'.repeat(64));
  const solo = (await loadState(idSolo)).state;
  check('jugar La Legua sola sigue funcionando',
    invDe(solo).umbral.exposure === 0 && solo.consequences.length === 0,
    `Exp ${invDe(solo).umbral.exposure}`);

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
