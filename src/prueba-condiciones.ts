/**
 * PRUEBA DEL LENGUAJE DE CONDICIONES — `npm run prueba:condiciones`
 *
 * El DSL reemplazó ~50 funciones escritas a mano. La pregunta que esta prueba
 * contesta no es «¿el evaluador anda?» sino la de verdad: **¿evalúa lo mismo
 * que evaluaban las funciones que reemplazó?** Una traducción silenciosamente
 * distinta —un `o` donde iba un `y`, un fragmento de pista mal copiado— haría
 * que una escena deje de dispararse, y eso en este proyecto es exactamente la
 * familia de bug que ya apareció seis veces: algo declarado sin camino real.
 *
 * Dos capas:
 *   1. Cada operador, contra un estado real, en su caso positivo Y negativo.
 *      El negativo importa tanto como el positivo: una condición que devuelve
 *      `true` siempre pasaría cualquier prueba que sólo mire el caso bueno.
 *   2. Las condiciones REALES de Agua Quieta ya cargadas desde JSON, contra
 *      una partida jugada de verdad.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { evaluarCondicion, type Condicion } from './scenario/condiciones.ts';
import { leerIntencion } from './keeper/escenas.ts';
import { classify } from './keeper/intent.ts';
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

/** Evalúa contra un estado, con la intención que produciría escribir `frase`. */
const evalCon = (cond: Condicion, s: GameState, frase?: string) =>
  evaluarCondicion(cond, {
    estado: s,
    ...(frase ? { intencion: leerIntencion(classify(s, frase)) } : {}),
  });

async function jugar(id: string, acciones: string[]): Promise<GameState> {
  for (const accion of acciones) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(accion, 'p1');
    const r = await runOfflineTurn(t, AGUA_QUIETA, accion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return (await Turn.open(id)).state;
}

async function main() {
  const id = await createCampaign(AGUA_QUIETA, 'CONDICIONES', 'c'.repeat(64));
  const inicial = (await Turn.open(id)).state;

  // ── 1. Cada operador, en positivo y en negativo ─────────────────────────
  console.log('\nCADA OPERADOR, EN SU CASO BUENO Y EN SU CASO MALO');

  check('verbo: reconoce el suyo', evalCon({ op: 'verbo', es: ['mirar'] }, inicial, 'Miro el aljibe'));
  check('verbo: rechaza otro', !evalCon({ op: 'verbo', es: ['cavar'] }, inicial, 'Miro el aljibe'));

  check('objetivo por kind', evalCon({ op: 'objetivo', kind: 'water' }, inicial, 'Miro el agua'));
  check('objetivo por kind: rechaza', !evalCon({ op: 'objetivo', kind: 'npc' }, inicial, 'Miro el agua'));
  check('objetivo por id', evalCon({ op: 'objetivo', id: 'npc-rosa' }, inicial, 'Le hablo a Rosa'));

  check('texto: matchea su patrón', evalCon({ op: 'texto', patron: 'aljibe' }, inicial, 'Miro el aljibe'));
  check('texto: rechaza lo que no', !evalCon({ op: 'texto', patron: 'molino' }, inicial, 'Miro el aljibe'));

  check('lugar: acierta donde está', evalCon({ op: 'lugar', es: ['patio'] }, inicial));
  check('lugar: rechaza donde no está', !evalCon({ op: 'lugar', es: ['cuarto'] }, inicial));

  check('pistas: 0 al empezar', evalCon({ op: 'pistas', minimo: 0 }, inicial));
  check('pistas: no hay 3 al empezar', !evalCon({ op: 'pistas', minimo: 3 }, inicial));

  check('documento: no obtenido al empezar', !evalCon({ op: 'documento', id: 'doc-cuaderno' }, inicial));
  check('propiedad: nada descubierto al empezar', !evalCon({ op: 'propiedad', item: 'it-reloj' }, inicial));
  check('lleva: no lo lleva al empezar', !evalCon({ op: 'lleva', item: 'it-reloj' }, inicial));
  check('alcanzable: el reloj está en el patio', evalCon({ op: 'alcanzable', item: 'it-reloj' }, inicial));
  check('alcanzable: el espejo NO está en el patio', !evalCon({ op: 'alcanzable', item: 'it-espejo' }, inicial));

  check('exposicion: arranca en 0', !evalCon({ op: 'exposicion', minimo: 1 }, inicial));
  check('contradicciones: arranca sin ninguna', !evalCon({ op: 'contradicciones', minimo: 1 }, inicial));

  // La aventura arranca a las 17:40.
  check('hora: después de las 17', evalCon({ op: 'hora', minimo: 17 }, inicial));
  check('hora: no es de noche todavía', !evalCon({ op: 'hora', minimo: 19 }, inicial));

  check('narrado: nada narrado al empezar', !evalCon({ op: 'narrado', contiene: 'Un aljibe hace ruido' }, inicial));

  // Compuestos
  const verdadero: Condicion = { op: 'lugar', es: ['patio'] };
  const falso: Condicion = { op: 'lugar', es: ['cuarto'] };
  check('y: exige las dos', evalCon({ op: 'y', de: [verdadero, verdadero] }, inicial)
    && !evalCon({ op: 'y', de: [verdadero, falso] }, inicial));
  check('o: alcanza con una', evalCon({ op: 'o', de: [falso, verdadero] }, inicial)
    && !evalCon({ op: 'o', de: [falso, falso] }, inicial));
  check('no: invierte', evalCon({ op: 'no', de: falso }, inicial)
    && !evalCon({ op: 'no', de: verdadero }, inicial));

  // Sin intención, los operadores que la necesitan dan false en vez de romper.
  console.log('\nSIN INTENCIÓN NO EXPLOTA: LOS DE INTENCIÓN DAN false');
  check('verbo sin intención', !evalCon({ op: 'verbo', es: ['mirar'] }, inicial));
  check('objetivo sin intención', !evalCon({ op: 'objetivo', kind: 'water' }, inicial));
  check('texto sin intención', !evalCon({ op: 'texto', patron: 'aljibe' }, inicial));
  check('sostenido sin intención', !evalCon({ op: 'sostenido' }, inicial));

  // ── 2. Las condiciones REALES, contra una partida de verdad ─────────────
  console.log('\nLAS CONDICIONES REALES DE AGUA QUIETA, JUGANDO');
  const s = await jugar(id, [
    'Me asomo al aljibe y miro el reflejo un rato largo',
    'Voy a la casa',
    'Voy al cuarto',
    'Leo el cuaderno de Ignacio',
  ]);

  const escena = (id: string) => AGUA_QUIETA.scenes.find((e) => e.id === id)!;
  const accion = (id: string) => AGUA_QUIETA.actions.find((a) => a.id === id)!;
  const tema = (id: string) => AGUA_QUIETA.conversations.find((t) => t.id === id)!;

  const i = (frase: string) => leerIntencion(classify(s, frase));

  check('el cuaderno quedó obtenido, y su acción se marca hecha',
    Boolean(accion('cuaderno').hecha?.(s)), 'hecha = true');
  check('«revisar hoja por hoja» ya es visible (depende del cuaderno)',
    Boolean(accion('paginas').visible?.(s)));
  check('«cavar» todavía NO está hecha', !accion('cavar').hecha?.(s));

  check('la escena de leer el cuaderno responde a su frase',
    escena('leer-cuaderno').cuando(s, i('Leo el cuaderno de Ignacio')));
  check('...y NO responde a «reviso el cuaderno hoja por hoja»',
    !escena('leer-cuaderno').cuando(s, i('Reviso el cuaderno hoja por hoja')),
    'la negación del patrón sobrevivió a la traducción');
  check('la escena de revisar páginas SÍ responde a esa otra frase',
    escena('revisar-paginas').cuando(s, i('Reviso el cuaderno hoja por hoja')));

  check('«tocar el agua» responde a tocar el agua',
    escena('tocar-el-agua').cuando(s, i('Toco el agua del aljibe')));
  check('«tocar el agua» NO responde a mirar el agua',
    !escena('tocar-el-agua').cuando(s, i('Miro el agua del aljibe')));

  check('el desenlace de sostener la mirada todavía NO está disponible',
    !accion('sostener').visible?.(s), 'faltan las condiciones de listoParaSostener');

  check('el tema de Rosa sobre el aljibe existe desde el principio',
    !tema('aljibe').disponible || tema('aljibe').disponible!(s));
  check('el tema del hermano todavía NO (pide haber oído lo de la deuda)',
    !tema('hermano').disponible!(s));

  // Etiqueta condicional: la de `asomarse` cambia con lo descubierto.
  const etiqueta = accion('asomarse').etiqueta;
  check('la etiqueta condicional es función y devuelve texto',
    typeof etiqueta === 'function' && typeof etiqueta(s) === 'string',
    typeof etiqueta === 'function' ? etiqueta(s) : String(etiqueta));

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
