/**
 * PRUEBA DE LAS ESCALAS DEL UMBRAL — `npm run prueba:umbral`
 *
 * LA INVARIANTE: investigar a fondo tiene que exponerte MÁS que repetir una
 * sola acción muchas veces.
 *
 * Antes era al revés, y está medido:
 *
 *   a lo ancho, cada acción una vez, 40 turnos → Exposición 26
 *   asomándose al aljibe veinte veces          → Exposición 100, 4 umbrales
 *
 * No era que la escala fuera corta: una acción repetible entregaba exposición
 * completa cada vez, sin tope y para siempre. Esta prueba juega las dos
 * partidas y falla si la estrecha vuelve a ganarle a la ancha.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { decayedAmount, timesExposedTo } from './rules/umbral.ts';
import { RENDIMIENTO_POR_REPETICION, RENDIMIENTO_MINIMO } from './rules/umbral.config.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const umbralDe = (s: GameState) => s.investigators[s.activeInvestigator]!.umbral;

async function jugar(titulo: string, semilla: string, elegir: (s: GameState) => string | null, turnos: number) {
  const id = await createCampaign(AGUA_QUIETA, titulo, semilla.repeat(64).slice(0, 64));
  let n = 0;
  for (; n < turnos; n++) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    const intencion = elegir(t.state);
    if (!intencion) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, AGUA_QUIETA, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return { estado: (await Turn.open(id)).state, turnos: n };
}

async function main() {
  // ── La regla, en aislamiento ─────────────────────────────────────────────
  console.log('\nLA REGLA DE RENDIMIENTOS DECRECIENTES');
  const serie = [0, 1, 2, 3, 4, 5].map((v) => decayedAmount(6, v));
  console.log(`  una fuente de 6, repetida: ${serie.join(' → ')}`);
  check('la primera vez rinde completo', serie[0] === 6, String(serie[0]));
  check('rinde cada vez menos o igual', serie.every((v, i) => i === 0 || v <= serie[i - 1]!));
  check('termina en cero', serie[serie.length - 1] === 0);
  check('mientras rinde, rinde al menos el piso',
    serie.filter((v) => v > 0).every((v) => v >= RENDIMIENTO_MINIMO));
  const chica = [0, 1, 2, 3].map((v) => decayedAmount(2, v));
  console.log(`  una fuente de 2, repetida: ${chica.join(' → ')}`);
  check('una fuente chica no se apaga antes que una grande',
    chica.filter((v) => v > 0).length >= RENDIMIENTO_POR_REPETICION.filter((f) => f > 0).length,
    chica.join('/'));

  // ── Partida ESTRECHA: la misma acción, muchas veces ──────────────────────
  console.log('\nPARTIDA ESTRECHA — asomarse al aljibe 25 veces');
  const estrecha = await jugar('UMBRAL ESTRECHA', 'y',
    () => 'Me asomo al aljibe y miro el reflejo un rato largo', 25);
  const uEstrecha = umbralDe(estrecha.estado);
  console.log(`  Exposición ${uEstrecha.exposure} · umbrales ${uEstrecha.thresholdsCrossed.length}/4`);

  // ── Partida ANCHA: cada acción una vez ───────────────────────────────────
  // Elegir siempre la primera opción sin usar recorre mucho pero NO hace las
  // cosas caras: no lleva las fotos de un cuarto al otro, no cava, no toca el
  // agua. Mide el piso de una partida honesta, no el techo.
  console.log('\nPARTIDA ANCHA — cada acción una vez, sin desenlaces');
  const usadas = new Set<string>();
  const ancha = await jugar('UMBRAL ANCHA', 'z', (s) => {
    const disp = accionesDisponibles(s, AGUA_QUIETA.conversations).filter((o) => !o.final);
    const sig = disp.find((o) => !usadas.has(o.id)) ?? disp[0];
    if (!sig) return null;
    usadas.add(sig.id);
    return sig.intencion;
  }, 90);
  const uAncha = umbralDe(ancha.estado);
  console.log(`  Exposición ${uAncha.exposure} · umbrales ${uAncha.thresholdsCrossed.length}/4`);

  // ── Partida EXHAUSTIVA: el recorrido que hace todo lo caro ───────────────
  // Es el techo real de la aventura, y es contra este que hay que medir si el
  // quinto desenlace sigue siendo alcanzable.
  console.log('\nPARTIDA EXHAUSTIVA — el recorrido completo');
  const GUION = [
    'Me asomo al aljibe y miro el reflejo un rato largo',
    'Escucho el aljibe con atención',
    'Toco el agua del aljibe',
    'Examino el brocal de cerca',
    'Examino la roldana de cerca',
    'Examino la tierra de cerca',
    'Examino los álamos de cerca',
    'Agarro reloj de bolsillo',
    'Sostengo el reloj sobre el agua del aljibe',
    'Grito el nombre de Ignacio hacia el aljibe',
    'Voy a la casa',
    'Examino la fotografía enmarcada de 1897',
    'Agarro fotografía enmarcada (1897)',
    'Agarro espejo de mano',
    'Examino el reloj de pared de cerca',
    'Le pregunto a Rosa qué pasó esa noche con Ignacio',
    'Le pregunto a Rosa por la plata que se debía',
    'Voy al cuarto',
    'Leo el cuaderno de Ignacio',
    'Examino la fotografía dada vuelta',
    'Agarro fotografía del aljibe (tomada por ignacio)',
    'Comparo las dos fotografías',
    'Voy a la casa',
    'Voy al patio',
    'Uso el espejo para mirar el aljibe',
    'Cavo al lado del aljibe',
    'Voy a la orilla de la laguna mansa',
    'Miro la laguna un rato largo',
    'Voy al patio',
    'Me asomo al aljibe y miro el reflejo un rato largo',
    'Me asomo al aljibe y miro el reflejo un rato largo',
  ];
  let paso = 0;
  const exhaustiva = await jugar('UMBRAL EXHAUSTIVA', 'w', () => GUION[paso++] ?? null, GUION.length);
  const uExh = umbralDe(exhaustiva.estado);
  console.log(`  Exposición ${uExh.exposure} · umbrales ${uExh.thresholdsCrossed.length}/4 · ${uExh.exposureEvents.length} contactos`);

  console.log('\nLA INVARIANTE');
  check('investigar a fondo expone más que repetir una acción',
    uAncha.exposure > uEstrecha.exposure,
    `ancha ${uAncha.exposure} vs estrecha ${uEstrecha.exposure}`);
  check('repetir una sola acción no cruza los cuatro umbrales',
    uEstrecha.thresholdsCrossed.length < 4,
    `${uEstrecha.thresholdsCrossed.length} umbrales`);
  check('repetir una sola acción no llega al techo', uEstrecha.exposure < 100,
    String(uEstrecha.exposure));

  console.log('\nEL QUINTO DESENLACE SIGUE SIENDO ALCANZABLE');
  // Pide exposición >= 30. Si el arreglo lo dejó fuera de alcance, rompimos
  // un final para tapar una fuga, que sería un mal negocio.
  check('una partida exhaustiva llega a 30 de exposición', uExh.exposure >= 30,
    `${uExh.exposure}/30`);

  console.log('\nEL DECAIMIENTO QUEDA AUDITADO EN EL LOG');
  const eventos = uEstrecha.exposureEvents;
  const reducidos = eventos.filter((e) => (e.amountBeforeDecay ?? e.amount) > e.amount);
  check('los eventos guardan cuánto se redujo', reducidos.length > 0,
    `${reducidos.length} de ${eventos.length} reducidos`);
  check('todos los eventos tienen fuente', eventos.every((e) => Boolean(e.source)));
  check('la fuente repetida se contó bien',
    timesExposedTo(uEstrecha, 'aljibe:mirar') === eventos.filter((e) => e.source === 'aljibe:mirar').length);

  console.log('\nDE DÓNDE SALIÓ LA EXPOSICIÓN EN LA PARTIDA EXHAUSTIVA');
  const porFuente = new Map<string, number>();
  for (const e of uExh.exposureEvents) {
    porFuente.set(e.source, (porFuente.get(e.source) ?? 0) + e.amount);
  }
  [...porFuente.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
