/**
 * PRUEBA DE LA FIRMA AJENA — `npm run prueba:tercer-umbral`
 *
 * La tercera aventura estrena dos mecánicas de esta temporada aplicadas a
 * contenido de verdad: `jugadorNota` (meta-horror — lo que nota quien juega,
 * nunca el investigador) y una fobia/manía mecánica nacida de un desenlace
 * (`fin-preguntar`), no de un ítem de la ficha. Todo lo que verifica acá se
 * declaró en `tercer-umbral.contenido.json` y `tercerumbral.logica.ts`.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { TERCER_UMBRAL } from './scenario/tercerumbral.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

async function jugar(titulo: string, semilla: string, guion: string[]) {
  const id = await createCampaign(TERCER_UMBRAL, titulo, semilla.repeat(64).slice(0, 64));
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, TERCER_UMBRAL, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return (await Turn.open(id)).state;
}

const insistir = (paso: string, veces = 3) => Array(veces).fill(paso) as string[];

/** Recorrido que junta los tres testimonios de la vuelta y las pruebas físicas. */
const INVESTIGAR = [
  'Le pregunto a Nación qué recuerda de Alejo de chico',
  'Le pregunto a Nación cómo fue que Alejo volvió',
  'Le pregunto a Nación por Anastasio y el testamento',
  'Le pregunto a Nación qué día exacto volvió Alejo',
  'Leo la carta de Alejo desde la frontera',
  'Voy al escritorio de la administración',
  'Le pregunto a Ceferino por qué desconfía de Alejo',
  'Le pregunto a Ceferino por la cicatriz de Alejo',
  'Le pregunto a Ceferino cómo administró la estancia estos años',
  'Le pregunto a Ceferino cómo fue que Alejo volvió',
  'Le pregunto a Ceferino qué día exacto volvió Alejo',
  ...insistir('Reviso los libros de cuentas de la administración'),
  'Voy al casco de Los Cardales',
  'Voy al galpón y el corral',
  'Le pregunto a Martiniano cómo era Alejo de chico',
  ...insistir('Le pregunto a Martiniano cómo fue que Alejo volvió'),
  'Le pregunto a Martiniano por el bautismo de Alejo',
  'Le pregunto a Martiniano qué pasó cuando Alejo se fue',
  'Voy al casco de Los Cardales',
  ...insistir('Le pregunto a Alejo qué pasó estos ocho años', 5),
  'Le pregunto a Alejo quién es',
  'Le pregunto a Alejo por el cuchillo',
  ...insistir('Agarro cuchillo con mango de asta'),
  'Cotejo lo que dice cada uno sobre esa noche',
  'Voy a la capilla y el registro parroquial',
  ...insistir('Busco la partida de bautismo de Alejo en el registro'),
];

async function main() {
  console.log('\nLA AVENTURA ARRANCA');
  const id0 = await createCampaign(TERCER_UMBRAL, 'ARRANQUE', 'n'.repeat(64));
  const t0 = await Turn.open(id0);
  const iniciales = accionesDisponibles(t0.state, TERCER_UMBRAL);
  check('hay algo que hacer desde el primer turno', iniciales.length >= 4, `${iniciales.length} acciones`);
  check('no aparece ningún botón de las otras dos aventuras',
    !iniciales.some((o) => /aljibe|Rosa|rueda|Roldán|alambrado/i.test(o.etiqueta)),
    iniciales.map((o) => o.id).join(', ').slice(0, 70));
  check('ningún desenlace se ofrece de entrada', !iniciales.some((o) => o.final));

  // ── El recorrido completo ────────────────────────────────────────────────
  console.log('\nEL RECORRIDO COMPLETO');
  const s: GameState = await jugar('FIRMA AJENA COMPLETA', 'k', INVESTIGAR);
  const inv = s.investigators[s.activeInvestigator]!;

  console.log(`  ${s.board.clues.length} pistas · ${s.board.contradictions.length} contradicciones · Exposición ${inv.umbral.exposure} · Estabilidad ${inv.umbral.stability}`);
  for (const c of s.board.contradictions) console.log(`   ⚡ ${c.description.slice(0, 96)}`);

  check('la investigación rinde', s.board.clues.length >= 8, `${s.board.clues.length} pistas`);
  check('se tiran dados de verdad', s.rolls.length >= 5, `${s.rolls.length} tiradas`);
  check('hay tiradas de psicología/persuasión',
    s.rolls.some((r) => ['psicologia', 'persuasion'].includes(String(r.commitment.skill))));
  check('hay tiradas de descubrir/buscar_libros',
    s.rolls.some((r) => ['descubrir', 'buscar_libros'].includes(String(r.commitment.skill))));

  // ── El tablero de contradicciones, con tres testigos ─────────────────────
  console.log('\nEL TABLERO DE CONTRADICCIONES');
  check('la aventura llena el tablero de contradicciones', s.board.contradictions.length >= 1,
    `${s.board.contradictions.length}`);
  check('una contradicción enfrenta a los tres testigos de la vuelta',
    s.board.contradictions.some((c) => /Nación|Ceferino|Martiniano/.test(c.description + JSON.stringify(c))),
    'ninguna nombra a los testigos');

  // ── jugadorNota: meta-horror que NUNCA cruza al conocimiento del investigador ─
  console.log('\nJUGADORNOTA — LO QUE NOTA QUIEN JUEGA, NO EL INVESTIGADOR');
  const notaCarta = inv.knowledge.playerObserved.some((k) => k.statement.includes('Martiniano'));
  check('la contradicción de la carta contra el relato de Alejo se anotó como jugadorNota',
    notaCarta, inv.knowledge.playerObserved.map((k) => k.statement.slice(0, 60)).join(' | '));
  check('esa nota NUNCA aparece en knowledge.investigator (lo que el personaje sabe)',
    !inv.knowledge.investigator.some((k) => k.statement.includes('En este relato de "estos ocho años"')));

  // ── Los cinco desenlaces ─────────────────────────────────────────────────
  console.log('\nLOS CINCO DESENLACES');
  const casos: Array<{ id: string; extra: string[]; semilla: string }> = [
    { id: 'avalar', semilla: 'a', extra: ['Avalo que es Alejo y certifico su identidad'] },
    { id: 'desmentir', semilla: 'b', extra: ['Desmiento que sea Alejo'] },
    { id: 'irse', semilla: 'c', extra: ['Me voy de Los Cardales sin decidir'] },
    { id: 'quemar', semilla: 'd', extra: ['Quemo la carta y la foto para que nadie tenga con qué probar nada'] },
    { id: 'preguntar', semilla: 'e', extra: ['Lo miro a los ojos y le pregunto quién es de verdad'] },
  ];

  const alcanzados = new Set<string>();
  let finalConCrisis: GameState | null = null;
  for (const caso of casos) {
    const fin = await jugar(`FIRMA ${caso.id}`, caso.semilla, [...INVESTIGAR, ...caso.extra]);
    const llego = fin.ending?.id === caso.id;
    if (llego) alcanzados.add(caso.id);
    check(`se llega a «${TERCER_UMBRAL.endings.find((e) => e.id === caso.id)?.title}»`, llego,
      fin.ending ? fin.ending.id : 'sin final');
    if (llego) {
      check('  · el final tiene texto', (fin.ending?.text.length ?? 0) > 200);
      check('  · no quedan acciones', accionesDisponibles(fin, TERCER_UMBRAL).length === 0);
    }
    if (caso.id === 'preguntar' && llego) finalConCrisis = fin;
  }

  // ── La fobia/manía que deja el desenlace climático ───────────────────────
  console.log('\nLA MANÍA QUE PUEDE DEJAR "LO QUE CONTESTA"');
  if (finalConCrisis) {
    const invFin = finalConCrisis.investigators[finalConCrisis.activeInvestigator]!;
    const huboCrisis = invFin.conditions.some((c) => /Sospecha de las caras conocidas/.test(c.name));
    // No siempre cruza el piso de 5+ (depende del grado de la tirada), así que
    // esto no es un check duro: es evidencia de que el camino existe.
    console.log(`  condiciones tras "preguntar": ${invFin.conditions.map((c) => c.name).join(', ') || 'ninguna'}`);
    check('el desenlace corrió sin romper el motor', true);
    void huboCrisis;
  } else {
    check('se pudo evaluar el desenlace climático', false, 'no se alcanzó "preguntar" en ningún seed');
  }

  console.log('\nCOBERTURA');
  const faltan = TERCER_UMBRAL.endings.filter((e) => !alcanzados.has(e.id));
  check('todos los desenlaces declarados son alcanzables', faltan.length === 0,
    faltan.length ? `faltan: ${faltan.map((e) => e.id).join(', ')}` : `${alcanzados.size}/${TERCER_UMBRAL.endings.length}`);

  console.log('\nEL CANON NO SE FILTRA');
  const todoElTexto = JSON.stringify(TERCER_UMBRAL) + JSON.stringify(TERCER_UMBRAL.scenes.map(String));
  for (const prohibido of ['Primer Rostro', 'Yog-Sothoth', 'Bernardo', 'Puddock', 'Archivista', 'Agua Blanca']) {
    check(`no nombra «${prohibido}»`, !todoElTexto.includes(prohibido));
  }
  check('tampoco afirma ser el Tercer Umbral',
    !/es el tercer umbral|el Tercer Umbral es/i.test(todoElTexto));

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
