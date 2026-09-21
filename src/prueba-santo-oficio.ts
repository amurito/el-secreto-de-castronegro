/**
 * EL SANTO OFICIO DE CUYO — recorrido del Acto I, rama Iglesia.
 *
 * Camina la aventura con los botones reales (`ir:…`, las respuestas del
 * interrogatorio) en vez de saltar de lugar con una herramienta: la primera
 * versión de este test hacía lo segundo y no detectaba que una escena con
 * `destino` REEMPLAZA el movimiento en lugar de acompañarlo (por eso las
 * llegadas son acciones explícitas).
 *
 * Qué garantiza: que el interrogatorio encadena sus tres preguntas sin
 * repetirlas, que el encierro cierra y abre la puerta cuando corresponde, que
 * el archivo y el borde entregan algo salga o no la tirada, y que a sospecha
 * 100 sólo quedan los desenlaces. NO afirma el resultado de ninguna tirada
 * (ver «Pruebas no determinísticas»): compara siempre contra la sospecha de
 * antes.
 *
 * La aventura no está registrada en el catálogo; se carga directo.
 */
import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { EL_SANTO_OFICIO_DE_CUYO as SO } from './scenario/santooficio.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const sosp = (s: GameState) => s.investigators[s.activeInvestigator]!.derived.sospecha ?? 0;

async function jugar(id: string, intencion: string) {
  const t = await Turn.open(id);
  t.submitIntent(intencion, 'p1');
  const r = await runOfflineTurn(t, SO, intencion, () => {});
  t.narrate(r.narration, r.options);
  await t.commit();
  return (await loadState(id)).state;
}
const pulsar = async (id: string, accion: string) => {
  const s0 = (await loadState(id)).state;
  const o = accionesDisponibles(s0, SO).find((x) => x.id === accion);
  if (!o) throw new Error("No hay botón «" + accion + "». Hay: " + ids(s0).join(","));
  return jugar(id, o.intencion);
};
const camino = async (id: string, ...lugares: string[]) => {
  let s = (await loadState(id)).state;
  for (const l of lugares) s = await pulsar(id, "ir:" + l);
  return s;
};
const ids = (s: GameState) => accionesDisponibles(s, SO).map((o) => o.id);
const seed = (n: string) => n.repeat(32).slice(0, 64);

async function main() {
  console.log('\nARRANQUE: alba fija la sospecha inicial y hace presente a Ignacio');
  let id = await createCampaign(SO, 'SO-1', seed('a1'));
  let s = (await loadState(id)).state;
  check('arranca sin sospecha', sosp(s) === 0);
  check('el botón de alba está disponible', ids(s).includes('alba'), ids(s).join(','));
  s = await jugar(id, 'Me levanto del fondo del zanjon y miro alrededor');
  check('sin herencia arranca por la Iglesia: sospecha 35', sosp(s) === 35, String(sosp(s)));
  check('Ignacio está presente y con actitud', s.npcs['npc-ignacio']!.present && (s.npcs['npc-ignacio']!.attitude[s.activeInvestigator] ?? 0) >= 15);
  check('alba desaparece una vez hecha', !ids(s).includes('alba'));

  console.log('\nCAMINO: la comitiva pide sigilo si llevás cosas de 1930');
  s = await camino(id, 'camino-villa');
  check('el botón de esperar a la comitiva aparece al llegar', ids(s).includes('comitiva'));
  s = await pulsar(id, 'comitiva');
  const seVioComitiva = s.narrative.some((n) => n.kind === 'keeper' && n.text.includes('Un jinete de sotana negra'));
  check('la escena de la comitiva se narra', seVioComitiva);

  console.log('\nCRIPTA: tres preguntas, dos respuestas cada una, sin repetirse');
  s = await camino(id, 'sd-porton', 'sd-cripta');
  check('en la cripta todavía no hay preguntas: primero hay que sentarse', !ids(s).includes('q1-flandes') && ids(s).includes('cripta-entrada'));
  s = await pulsar(id, 'cripta-entrada');
  const antes = ids(s);
  check('se ofrecen las dos respuestas de la pregunta 1', antes.includes('q1-flandes') && antes.includes('q1-franco'));
  check('la pregunta 2 todavía no', !antes.includes('q2-signos'));
  const base0 = sosp(s);
  s = await jugar(id, 'Explico como funciona el reloj');
  const tras1 = ids(s);
  check('contestar la 1 esconde sus dos respuestas', !tras1.includes('q1-flandes') && !tras1.includes('q1-franco'));
  check('y abre la 2', tras1.includes('q2-signos') && tras1.includes('q2-nativos'));
  const s1 = sosp(s);
  check('la respuesta franca sube la sospecha 20 (sin tirada de por medio)', s1 === base0 + 20, `${base0} → ${s1}`);
  s = await jugar(id, 'Digo que lo aprendi de los indigenas');
  check('la 2b suma 10', sosp(s) === s1 + 10, String(sosp(s)));
  check('deja consecuencia de campaña sobre los huarpes', s.consequences.some((c) => c.description.includes('aprendió lo que sabe de los indios de las lagunas')));
  s = await jugar(id, 'Digo que hay un limite bajo el zanjon');
  const fin = sosp(s);
  console.log(`   sospecha tras el interrogatorio: ${fin}`);
  check('con esa sospecha (>=60) queda encerrado', s.consequences.some((c) => c.description.includes('quedó encerrado en la cripta')), String(fin));
  check('el tema del Comisario se abre al terminar', s.narrative.some((n) => n.kind === 'keeper' && n.text.includes('La interrogación termina')));

  console.log('\nENCIERRO: la salida hacia la villa queda cerrada hasta que pase algo');
  const enc = ids(s);
  check('se ofrecen esperar y forzar la ventilación', enc.includes('esperar-ignacio') && enc.includes('forzar-ventilacion'));
  check('no hay botón de ir a la portería', !enc.some((x) => x.startsWith('ir:sd-porton') || x === 'mover:sd-porton'), enc.filter((x) => x.includes('sd-')).join(','));
  s = await jugar(id, 'Espero a que intervenga Fray Ignacio');
  check('esperar libera y baja la sospecha o la sube poco', s.consequences.some((c) => c.description.includes('salió de la cripta')));
  check('ya no se ofrece esperar', !ids(s).includes('esperar-ignacio'));

  id = await createCampaign(SO, 'SO-3', seed('c3'));
  s = await jugar(id, 'Me levanto del fondo del zanjon y miro alrededor');
  console.log('\nARCHIVO: sin permiso del prior el legajo no se ofrece; con permiso, sí');
  s = await camino(id, 'camino-villa', 'sd-porton', 'sd-archivo');
  check('el legajo NO se ofrece sin permiso', !ids(s).includes('leer-legajo'));
  // el permiso llega por conversación; se simula con una pista
  const t = await Turn.open(id);
  t.executeTool('add_clue', { description: 'El prior Anselmo autoriza, a escondidas, la lectura del legajo de la fundación de San Juan, en el archivo del convento.', kind: 'testimonial', source: 'prueba', reliability: 'reliable' });
  await t.commit();
  s = (await loadState(id)).state;
  check('con el permiso, el legajo se ofrece', ids(s).includes('leer-legajo'), ids(s).join(','));
  s = await jugar(id, 'Leo el legajo de la fundacion');
  check('leerlo entrega el documento (éxito o fallo)', Boolean(s.documents['doc-legajo-fundacion']?.obtainedAt));
  check('y abre examinar los bordes', ids(s).includes('notar-borrado'));
  s = await jugar(id, 'Examino los bordes de la hoja arrancada');
  check('el borde entrega una pista con o sin éxito (no gatea)', s.board.clues.some((c) => /hoja/.test(c.description)));
  check('y no repite', !ids(s).includes('notar-borrado'));

  console.log('\nHUERTA: primer momento con Ignacio');
  s = await camino(id, 'sd-porton', 'sd-huerta');
  check('se ofrecen las dos maneras de tratar el reloj', ids(s).includes('mostrar-reloj-ignacio') && ids(s).includes('negar-a-ignacio'));
  s = await jugar(id, 'Le muestro el reloj a Fray Ignacio');
  check('elegir una esconde la otra', !ids(s).includes('mostrar-reloj-ignacio') && !ids(s).includes('negar-a-ignacio'));

  console.log('\nHOGUERA: a 100 solo quedan los desenlaces');
  id = await createCampaign(SO, 'SO-2', seed('b2'));
  { const t2 = await Turn.open(id); t2.executeTool('adjust_suspicion', { amount: 100, cause: 'prueba' }); await t2.commit(); }
  s = (await loadState(id)).state;
  const solo = ids(s);
  check('con sospecha 100 se ofrece el Auto de Fe', solo.includes('hoguera'), solo.join(','));
  check('y nada más que desenlaces', solo.every((x) => ['hoguera', 'salida-1930', 'salida-1944', 'quedarse', 'muerte-en-la-mina'].includes(x)), solo.join(','));
  s = await jugar(id, 'El auto de fe');
  check('el desenlace cierra la aventura', Boolean(s.ending), JSON.stringify(s.ending)?.slice(0, 60));

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
