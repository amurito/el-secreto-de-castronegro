/**
 * PRUEBA DE LA LEGUA PERDIDA — `npm run prueba:legua`
 *
 * La segunda aventura es la prueba de fuego, y lo que prueba es esto: que
 * escribir una aventura sea escribir, no programar. Todo lo que verifica acá se
 * declaró en `la-legua-perdida.contenido.json` y `legua.logica.ts`, sin tocar
 * una línea del motor.
 *
 * Verifica además la mecánica que la aventura vino a estrenar: **el tablero de
 * contradicciones**, que existía en el estado desde el día uno y no lo usaba
 * nadie. Acá tres testigos consistentes y mutuamente imposibles lo llenan.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { LA_LEGUA } from './scenario/legua.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
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
  const id = await createCampaign(LA_LEGUA, titulo, semilla.repeat(64).slice(0, 64));
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, LA_LEGUA, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return (await Turn.open(id)).state;
}

/**
 * Repetir un paso que depende de una tirada.
 *
 * No es tolerancia a fallas: reintentar una búsqueda que salió mal es lo que
 * haría cualquiera en la mesa, y el motor lo permite. Sin esto la prueba mide
 * la suerte de la semilla en vez de medir la aventura.
 */
const insistir = (paso: string, veces = 3) => Array(veces).fill(paso) as string[];

/** Recorrido que junta los tres testimonios y las pruebas físicas. */
const INVESTIGAR = [
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
];

async function main() {
  console.log('\nLA AVENTURA ARRANCA');
  const id0 = await createCampaign(LA_LEGUA, 'ARRANQUE', 'n'.repeat(64));
  const t0 = await Turn.open(id0);
  const iniciales = accionesDisponibles(t0.state, LA_LEGUA);
  check('hay algo que hacer desde el primer turno', iniciales.length >= 6, `${iniciales.length} acciones`);
  check('no aparece ningún botón de Agua Quieta',
    !iniciales.some((o) => /aljibe|Rosa|brocal|roldana/i.test(o.etiqueta)),
    iniciales.map((o) => o.id).join(', ').slice(0, 70));
  check('ningún desenlace se ofrece de entrada', !iniciales.some((o) => o.final));

  // ── El recorrido completo ────────────────────────────────────────────────
  console.log('\nEL RECORRIDO COMPLETO');
  const s: GameState = await jugar('LEGUA COMPLETA', 'k', INVESTIGAR);
  const inv = s.investigators[s.activeInvestigator]!;

  console.log(`  ${s.board.clues.length} pistas · ${s.board.contradictions.length} contradicciones · Exposición ${inv.umbral.exposure} · Estabilidad ${inv.umbral.stability}`);
  for (const c of s.board.contradictions) console.log(`   ⚡ ${c.description.slice(0, 96)}`);

  check('la investigación rinde', s.board.clues.length >= 10, `${s.board.clues.length} pistas`);
  check('se tiran dados de verdad', s.rolls.length >= 8, `${s.rolls.length} tiradas`);
  check('hay tiradas sociales',
    s.rolls.some((r) => ['psicologia', 'persuasion', 'labia'].includes(String(r.commitment.skill))));
  check('hay tiradas de la ocupación de Elena',
    s.rolls.some((r) => ['medicina', 'ciencia_naturales', 'buscar_libros'].includes(String(r.commitment.skill))));

  // ── LA MECÁNICA NUEVA ────────────────────────────────────────────────────
  console.log('\nEL TABLERO DE CONTRADICCIONES, POR FIN USADO');
  check('la aventura llena el tablero de contradicciones', s.board.contradictions.length >= 2,
    `${s.board.contradictions.length}`);
  check('una contradicción enfrenta a los tres testigos',
    s.board.contradictions.some((c) => /Herminia|Casimiro|Roldán/.test(c.description + JSON.stringify(c))),
    'ninguna nombra a los testigos');
  check('otra enfrenta medición contra medición',
    s.board.contradictions.some((c) => /metros|pasos|minutos/.test(c.description)));

  // Agua Quieta no llenaba el tablero: es la diferencia que la aventura aporta.
  const idAQ = await createCampaign(AGUA_QUIETA, 'COMPARAR', 'k'.repeat(64));
  const sAQ = (await Turn.open(idAQ)).state;
  check('Agua Quieta arrancaba con el tablero vacío', sAQ.board.contradictions.length === 0);

  // ── Los cinco desenlaces ─────────────────────────────────────────────────
  console.log('\nLOS CINCO DESENLACES');
  const casos: Array<{ id: string; extra: string[]; semilla: string }> = [
    { id: 'firmar', semilla: 'a', extra: ['Firmo el certificado de defunción'] },
    { id: 'llevarse', semilla: 'b', extra: ['Me voy de La Perseverancia'] },
    {
      id: 'borrar', semilla: 'c',
      // Desde el alambrado no se llega al escritorio de un salto: hay que
      // volver. Que el mapa obligue a caminar es parte de la aventura.
      extra: ['Voy al molino y el tanque', 'Voy al casco de la perseverancia', 'Voy al escritorio de la estancia', 'Quemo la mensura de 1903'],
    },
    { id: 'medir', semilla: 'd', extra: ['Demuestro que el campo no cierra y levanto acta'] },
    { id: 'caminar', semilla: 'e', extra: ['Camino el alambrado del oeste de punta a punta'] },
  ];

  const alcanzados = new Set<string>();
  for (const caso of casos) {
    const fin = await jugar(`LEGUA ${caso.id}`, caso.semilla, [...INVESTIGAR, ...caso.extra]);
    const llego = fin.ending?.id === caso.id;
    if (llego) alcanzados.add(caso.id);
    check(`se llega a «${LA_LEGUA.endings.find((e) => e.id === caso.id)?.title}»`, llego,
      fin.ending ? fin.ending.id : 'sin final');
    if (llego) {
      check('  · el final tiene texto', (fin.ending?.text.length ?? 0) > 300);
      check('  · no quedan acciones', accionesDisponibles(fin, LA_LEGUA).length === 0);
    }
  }

  // ── Un objeto llamado «de alguien» no es ese alguien ─────────────────────
  // Bug real, reportado jugando: «cantimplora de Fermín» resolvía el objetivo
  // contra la feature del cadáver (alias «fermín») en vez del ítem, porque las
  // features se miraban antes que los objetos sin comparar qué nombre era más
  // largo. El jugador pedía llevarse la cantimplora y el motor contestaba
  // «Fermín no es algo que puedas llevarte».
  console.log('\nUN OBJETO "DE ALGUIEN" NO ES ESE ALGUIEN');
  const sCant = await jugar('LEGUA CANTIMPLORA', 'z', [
    ...INVESTIGAR.slice(0, 4), // hasta «Voy al galpón»
    'Agarro cantimplora de fermín', 'Agarro alpargatas de fermín',
  ]);
  const invCant = sCant.investigators[sCant.activeInvestigator]!;
  check('la cantimplora se lleva, no el cadáver',
    sCant.items['it-cantimplora']?.owner === invCant.id,
    `dueño: ${sCant.items['it-cantimplora']?.owner}`);
  check('las alpargatas se llevan, no el cadáver',
    sCant.items['it-botas']?.owner === invCant.id,
    `dueño: ${sCant.items['it-botas']?.owner}`);

  console.log('\nCOBERTURA');
  const faltan = LA_LEGUA.endings.filter((e) => !alcanzados.has(e.id));
  check('todos los desenlaces declarados son alcanzables', faltan.length === 0,
    faltan.length ? `faltan: ${faltan.map((e) => e.id).join(', ')}` : `${alcanzados.size}/${LA_LEGUA.endings.length}`);

  console.log('\nEL CANON NO SE FILTRA');
  const todoElTexto = JSON.stringify(LA_LEGUA) + JSON.stringify(LA_LEGUA.scenes.map(String));
  for (const prohibido of ['Primer Rostro', 'Yog-Sothoth', 'Bernardo', 'Puddock', 'Archivista', 'Agua Blanca']) {
    check(`no nombra «${prohibido}»`, !todoElTexto.includes(prohibido));
  }
  check('tampoco afirma ser el Segundo Umbral',
    !/es el segundo umbral|el Segundo Umbral es/i.test(todoElTexto));

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
