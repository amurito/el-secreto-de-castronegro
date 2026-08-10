/**
 * PRUEBA DE DESACOPLE — `npm run prueba:desacople`
 *
 * La promesa del refactor: **la tercera aventura no toca el motor.**
 *
 * Una promesa así se rompe sola con el tiempo: alguien tiene apuro, mete un
 * `if` con el id de un objeto adentro del resolvedor, y nadie se entera hasta
 * que escribir la aventura siguiente cuesta el doble. Esta prueba la sostiene
 * de dos maneras.
 *
 *   1. ESTÁTICA. Busca identificadores de Agua Quieta —ids de objetos, de NPC,
 *      de documentos, de localizaciones— dentro de los archivos del motor.
 *
 *   2. FUNCIONAL. Arma una aventura inventada de cero, con sus propias escenas,
 *      y la juega. Si el motor supiera algo de Agua Quieta, esto fallaría.
 */

import { readFileSync } from 'node:fs';
import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { Scenario } from './scenario/types.ts';
import type { Escenas } from './scenario/escena.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/** Archivos que NO deben saber de qué aventura se trata. */
const MOTOR = [
  'src/keeper/offline.ts',
  'src/keeper/escenas.ts',
  'src/keeper/social.ts',
  'src/keeper/intent.ts',
  'src/keeper/narrator.ts',
  'src/engine/engine.ts',
  'src/engine/reducers.ts',
  'src/engine/gates.ts',
];

/**
 * Identificadores propios de Agua Quieta. Si alguno aparece en el motor, hay
 * contenido de una aventura concreta metido donde no va.
 */
const IDS_DE_LA_AVENTURA = [
  'it-espejo', 'it-farol', 'it-reloj', 'it-foto1897', 'it-fotoreciente',
  'npc-rosa', 'doc-cuaderno', 'doc-carta',
  'p-espejo-indirecto', 'p-reloj-atras', 'p-rec-figura', 'p-1897-rostro',
  'f-brocal', 'f-roldana', 'f-tierra', 'f-alamos', 'f-galpon',
  "'patio'", "'cuarto'", "'orilla'", "'casa'",
];

function main() {
  console.log('\n1. EL MOTOR NO NOMBRA A LA AVENTURA');
  let sucios = 0;
  for (const archivo of MOTOR) {
    const texto = readFileSync(archivo, 'utf8');
    // Los comentarios pueden mencionar el aljibe para explicar POR QUÉ algo es
    // como es; lo que no puede haber es código que dependa de esos ids.
    const codigo = texto
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
      .join('\n');
    const encontrados = IDS_DE_LA_AVENTURA.filter((id) => codigo.includes(id));
    if (encontrados.length) {
      sucios++;
      console.log(`   ✗ ${archivo}: ${encontrados.join(', ')}`);
    }
  }
  check('ningún archivo del motor depende de ids de Agua Quieta', sucios === 0,
    sucios ? `${sucios} archivo(s)` : `${MOTOR.length} archivos limpios`);

  return sucios;
}

// ── 2. Una aventura inventada, jugada de punta a punta ─────────────────────

const ESCENAS_INVENTADAS: Escenas = [
  {
    id: 'tocar-la-campana', prioridad: 90,
    cuando: (_s, i) => /campana/.test(i.norm),
    antes: () => ({ texto: ['Ponés la mano en el bronce.'] }),
    prueba: () => ({
      skill: 'escuchar', difficulty: 'regular',
      reason: 'oír lo que la campana sigue sonando por dentro',
      stakes_success: 'lo oís', stakes_failure: 'no oís nada',
    }),
    resolver: ({ tirada }) => tirada?.exito
      ? {
          texto: ['CAMPANA-SUENA'],
          pistas: [{
            description: 'La campana sigue sonando por dentro mucho después de que dejó de sonar por fuera.',
            kind: 'experiential', source: 'la campana', reliability: 'reliable',
          }],
          exposicion: { amount: 4, source: 'campana:tocar', cause: 'la campana que no termina' },
          estabilidad: { amount: -3, cause: 'un sonido que no decae' },
        }
      : { texto: ['CAMPANA-CALLADA'] },
  },
  {
    id: 'fin-inventado', prioridad: 95,
    cuando: (_s, i) => /me voy del campanario/.test(i.norm),
    resolver: () => ({
      texto: ['Bajás.'],
      consecuencia: {
        description: 'El investigador se fue del campanario.', scope: 'world', permanent: true,
        worldReminder: 'La campana quedó sonando sola.',
      },
      desenlace: {
        id: 'irse-inventado', title: 'Lo que quedó sonando',
        text: 'Y desde el camino, a media legua, todavía se escucha. '.repeat(6),
      },
    }),
  },
];

function aventuraInventada(): Scenario {
  return {
    ...AGUA_QUIETA,
    id: 'prueba-desacople',
    title: 'El campanario',
    conversations: [],
    scenes: ESCENAS_INVENTADAS,
    endings: [{ id: 'irse-inventado', title: 'Lo que quedó sonando', condition: 'se va' }],
  };
}

async function funcional() {
  console.log('\n2. UNA AVENTURA INVENTADA, JUGADA DE VERDAD');
  const escenario = aventuraInventada();
  const id = await createCampaign(escenario, 'DESACOPLE', 'c'.repeat(64));

  async function turno(intencion: string) {
    const t = await Turn.open(id);
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, escenario, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
    return { texto: r.narration, estado: (await Turn.open(id)).state };
  }

  // Repetir hasta que la tirada salga: lo que importa es que la escena de una
  // aventura desconocida se resuelva, no que acierte al primer intento.
  let campana = await turno('Toco la campana');
  for (let n = 0; n < 8 && !/CAMPANA-SUENA/.test(campana.texto); n++) {
    campana = await turno('Toco la campana');
  }

  check('una escena de otra aventura se resuelve', /CAMPANA-(SUENA|CALLADA)/.test(campana.texto),
    campana.texto.slice(0, 40));
  check('su tirada se ejecutó', campana.estado.rolls.length > 0,
    `${campana.estado.rolls.length} tiradas`);
  check('sus pistas entran al tablero',
    campana.estado.board.clues.some((c) => c.description.includes('campana')),
    `${campana.estado.board.clues.length} pistas`);
  check('su exposición usa la fuente que declaró',
    campana.estado.investigators[campana.estado.activeInvestigator]!.umbral.exposureEvents
      .some((e) => e.source === 'campana:tocar'));
  check('NO se disparó ninguna escena de Agua Quieta',
    !/aljibe|Rosa|brocal/.test(campana.texto), campana.texto.slice(0, 60));

  const fin = await turno('Me voy del campanario');
  check('su desenlace cierra la aventura', fin.estado.ending?.id === 'irse-inventado',
    fin.estado.ending?.title ?? 'sin final');
  check('después del final no quedan acciones',
    accionesDisponibles(fin.estado, escenario.conversations).length === 0);
}

async function todo() {
  main();
  await funcional();
  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

todo().catch((e) => { console.error(e); process.exit(1); });
