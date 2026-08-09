/**
 * PRUEBA DE DESENLACES — `npm run prueba:desenlaces`
 *
 * El escenario declara cinco finales. Antes, el motor sólo sabía llegar a
 * tres: «Lo que devuelve la mirada» y «Lo que se queda» estaban declarados y
 * eran inalcanzables. Un jugador que buscara el final que resuelve el misterio
 * no lo encontraba, y con razón: no existía.
 *
 * Esta prueba juega una partida por cada final declarado y comprueba que se
 * llega. Si mañana alguien agrega un final a `endings` y no lo implementa, esto
 * falla, que es exactamente lo que tiene que pasar.
 *
 * Comprueba además la invariante que hace que un final sea un final: después de
 * llegar, no quedan acciones ofrecidas.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/** Juega una lista de intenciones y devuelve el estado final. */
async function jugar(titulo: string, semilla: string, guion: string[]) {
  const id = await createCampaign(AGUA_QUIETA, titulo, semilla.repeat(64).slice(0, 64));
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, AGUA_QUIETA, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return (await Turn.open(id)).state;
}

/**
 * Camino común hasta tener con qué decidir. Repetir la mirada al agua sube la
 * exposición, que es lo que pide el final de la mirada sostenida.
 */
const INVESTIGAR = [
  'Me asomo al aljibe y miro el reflejo un rato largo',
  'Voy a la casa',
  'Examino la fotografía enmarcada de 1897',
  'Voy al cuarto',
  'Leo el cuaderno de Ignacio',
  'Examino la fotografía dada vuelta',
  'Voy al patio',
  'Me asomo al aljibe y miro el reflejo un rato largo',
  'Me asomo al aljibe y miro el reflejo un rato largo',
];

async function main() {
  console.log('\nDESENLACES DECLARADOS POR EL ESCENARIO');
  for (const e of AGUA_QUIETA.endings) console.log(`   · ${e.id} — ${e.title}`);

  const casos: Array<{ id: string; guion: string[]; semilla: string }> = [
    { id: 'bajar',    semilla: 'd', guion: [...INVESTIGAR, 'Bajo al aljibe'] },
    { id: 'sellar',   semilla: 'e', guion: [...INVESTIGAR, 'Sello el aljibe con las tablas del galpón'] },
    { id: 'llevarse', semilla: 'f', guion: [...INVESTIGAR, 'Me voy de Los Álamos'] },
    {
      id: 'mirar', semilla: '1',
      // Hace falta exposición alta: el reflejo no le contesta a cualquiera.
      guion: [
        ...INVESTIGAR,
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Me asomo al aljibe y miro el reflejo un rato largo',
        'Le sostengo la mirada al reflejo del aljibe hasta el final',
      ],
    },
    { id: 'quedarse', semilla: '2', guion: [...INVESTIGAR, 'Me quedo en Los Álamos a pasar la noche'] },
  ];

  console.log('\nALCANZABILIDAD');
  const alcanzados = new Set<string>();

  for (const caso of casos) {
    const s = await jugar(`FINAL ${caso.id}`, caso.semilla, caso.guion);
    const llego = s.ending?.id === caso.id;
    if (llego) alcanzados.add(caso.id);
    check(
      `se llega a «${AGUA_QUIETA.endings.find((e) => e.id === caso.id)?.title}»`,
      llego,
      s.ending ? `${s.ending.id}` : 'sin final',
    );
    if (llego) {
      check('  · después del final no quedan acciones', accionesDisponibles(s, AGUA_QUIETA.conversations).length === 0);
      check('  · el final tiene texto', (s.ending?.text.length ?? 0) > 200);
    }
  }

  // ── El bug que dejó a un jugador real sin el quinto final ─────────────────
  // La pista del retardo abre «Lo que devuelve la mirada», y se entregaba sólo
  // si la PRIMERA tirada de POD acertaba: el código miraba cuántas veces se
  // había intentado, no si ya se había descubierto. Con la primera fallada, la
  // pista quedaba inalcanzable por muchos éxitos extremos que vinieran después.
  console.log('\nLA PISTA DEL RETARDO NO DEPENDE DE ACERTAR AL PRIMER INTENTO');
  const mirarOchoVeces = Array(8).fill('Me asomo al aljibe y miro el reflejo un rato largo');
  for (const semilla of ['3', '4', '5', '6']) {
    const s = await jugar(`RETARDO ${semilla}`, semilla, mirarOchoVeces);
    const tiene = s.board.clues.some((c) => c.description.includes('retardo perceptible'));
    check(`semilla ${semilla}: ocho miradas dan la pista`, tiene, `${s.board.clues.length} pistas`);
  }

  console.log('\nCOBERTURA');
  const faltan = AGUA_QUIETA.endings.filter((e) => !alcanzados.has(e.id));
  check(
    'todos los finales declarados son alcanzables',
    faltan.length === 0,
    faltan.length ? `faltan: ${faltan.map((e) => e.id).join(', ')}` : `${alcanzados.size}/${AGUA_QUIETA.endings.length}`,
  );

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
