/**
 * PRUEBA DE EL HOMBRE QUE MIRABA EL AGUA — `npm run prueba:hombre-agua`
 *
 * Décima aventura: una visión de 1679 recibida en 1928. Lo que esta suite
 * protege es lo propio de ella, no lo que ya cubren la auditoría y las
 * suites del motor:
 *
 *   1. Las tres ramas de apertura leen el desenlace de El Vigésimo — con
 *      anillo, sin anillo, y ninguno de los dos — y ninguna deja al jugador
 *      afuera.
 *   2. La cadena completa está encadenada de verdad: sin hablar del agua no
 *      se puede ver el encuentro, sin el encuentro no se puede dejar que te
 *      vea, y el desenlace más caro exige haber llegado hasta el final.
 *   3. Los papeles entregan los dos documentos, Mitos, y el hechizo más
 *      viejo de los tres — que cruza a la campaña siguiente.
 *   4. LO SELLADO SIGUE SELLADO: ninguna escena dice quién construyó el
 *      primer anillo, ni que Bernardo lo fabricó.
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { EL_HOMBRE_QUE_MIRABA_EL_AGUA } from './scenario/hombreagua.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { GameState, SkillId } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;
const narrado = (s: GameState, frag: string) =>
  s.narrative.some((n) => n.kind === 'keeper' && n.text.includes(frag));

async function jugar(id: string, intencion: string) {
  const t = await Turn.open(id);
  t.submitIntent(intencion, 'p1');
  const r = await runOfflineTurn(t, EL_HOMBRE_QUE_MIRABA_EL_AGUA, intencion, () => {});
  t.narrate(r.narration, r.options);
  await t.commit();
  return (await Turn.open(id)).state;
}

/** Fabrica el final de El Vigésimo sin jugarlo, y encadena la visión. */
async function visionTras(descripcion: string, endingId: string, semilla: string): Promise<string> {
  const idPrevio = await createCampaign(AGUA_QUIETA, `PREVIA-${endingId}`, semilla.repeat(64).slice(0, 64));
  const t = await Turn.open(idPrevio);
  t.executeTool('record_consequence', { description: descripcion, scope: 'world', permanent: 'true' });
  t.executeTool('reach_ending', { ending_id: endingId, title: 'Prueba', text: 'x' });
  await t.commit();
  const previo = (await loadState(idPrevio)).state;
  return createCampaign(EL_HOMBRE_QUE_MIRABA_EL_AGUA, `VISION-${endingId}`, semilla.repeat(64).slice(0, 64), {
    estadoAnterior: previo, mesesTranscurridos: 1,
  });
}

const CON_ANILLO = 'El investigador se puso el anillo de rubí de Bernardo Díaz en el laboratorio de la Casa, y quedó vinculado a él.';
const SIN_ANILLO = 'El investigador le sacó el anillo a Bernardo Díaz y lo destruyó en el horno del laboratorio, cortando el ciclo sin saber si hacía falta que siguiera.';
const NI_UNO_NI_OTRO = 'El investigador escapó de la Casa de Díaz sin el anillo y sin denunciar nada, la misma noche que se enfrentó a Bernardo.';

async function main() {
  console.log('\n1. LAS TRES RAMAS DE APERTURA LEEN EL FINAL DE EL VIGÉSIMO');
  {
    const conAnillo = await jugar(await visionTras(CON_ANILLO, 'heredar', 'a'), 'Miro el agua');
    check('con el anillo, el reflejo devuelve el anillo',
      narrado(conAnillo, 'la mano del reflejo tiene el anillo'));

    const sinAnillo = await jugar(await visionTras(SIN_ANILLO, 'cortar', 'b'), 'Miro el agua');
    check('sin el anillo, el reflejo devuelve el horno',
      narrado(sinAnillo, 'un horno de piedra prendido'));

    const ciego = await jugar(await visionTras(NI_UNO_NI_OTRO, 'irse-vigesimo', 'c'), 'Miro el agua');
    check('sin ninguno de los dos, la visión llega igual pero más ciega',
      narrado(ciego, 'No te muestra nada que no seas vos'));
    check('las tres ramas dejan pista propia',
      conAnillo.board.clues.length > 0 && sinAnillo.board.clues.length > 0 && ciego.board.clues.length > 0);
  }

  console.log('\n2. LA CADENA ESTÁ ENCADENADA DE VERDAD');
  const id = await visionTras(CON_ANILLO, 'heredar', 'd');
  {
    let s = (await loadState(id)).state;
    const ids = () => accionesDisponibles(s, EL_HOMBRE_QUE_MIRABA_EL_AGUA).map((o) => o.id);
    check('al empezar no se puede quedarse a ver el encuentro', !ids().includes('el-encuentro'), ids().join(', '));
    check('ni dejar que te vea', !ids().includes('te-ve'));
    check('ni quedarse hasta la fundación', !ids().includes('fin-quedarse'));

    s = await jugar(id, 'Le pregunto a Bernardo qué vio en el agua');
    check('preguntarle por el agua deja la pista de la mano',
      s.board.clues.some((c) => c.description.includes('una mano tomando un anillo')));
    check('...y recién ahí aparece quedarse a ver el encuentro', ids().includes('el-encuentro'), ids().join(', '));

    s = await jugar(id, 'Me quedo a ver qué hace Bernardo');
    check('el encuentro narra que sale con la mano cerrada', narrado(s, 'Sale con la mano cerrada'));
    check('NO dice que lo haya fabricado', !narrado(s, 'fabricó el anillo'));
    check('...y recién ahí aparece dejar que te vea', ids().includes('te-ve'), ids().join(', '));

    s = await jugar(id, 'Me quedo donde puede verme');
    check('te ve, y no sabe tu nombre', narrado(s, 'No sabe tu nombre'));
    check('cuesta Cordura de verdad', invDe(s).derived.san < 99);
    check('...y recién ahí aparece quedarse hasta la fundación', ids().includes('fin-quedarse'), ids().join(', '));
  }

  console.log('\n3. LOS PAPELES: DOS DOCUMENTOS, MITOS Y EL HECHIZO MÁS VIEJO');
  {
    const idP = await visionTras(CON_ANILLO, 'heredar', 'e');
    const antes = (await loadState(idP)).state;
    const mitosAntes = invDe(antes).skills['mitos' as SkillId]?.base ?? 0;
    await jugar(idP, 'Voy al campamento');
    const s = await jugar(idP, 'Leo los papeles del baúl');
    check('entrega el inventario', s.documents['doc-inventario']?.obtainedAt != null);
    check('entrega la instrucción copiada', s.documents['doc-instruccion']?.obtainedAt != null);
    check('sube Mitos de Cthulhu', (invDe(s).skills['mitos' as SkillId]?.base ?? 0) > mitosAntes,
      `${mitosAntes} → ${invDe(s).skills['mitos' as SkillId]?.base ?? 0}`);
    check('enseña «Contar lo que no se puede anotar»',
      invDe(s).spellsKnown.some((h) => h.id === 'contar-lo-que-no-se-anota'),
      JSON.stringify(invDe(s).spellsKnown));
    check('el hechizo arranca sin probar',
      invDe(s).spellsKnown.find((h) => h.id === 'contar-lo-que-no-se-anota')?.proven === false);
  }

  console.log('\n4. LOS TRES DESENLACES SE ALCANZAN');
  {
    const idA = await visionTras(CON_ANILLO, 'heredar', 'f');
    const a = await jugar(idA, 'Dejo que la visión se cierre');
    check('«Lo que se mira sin tocar» se alcanza', a.ending?.id === 'dejarlo', JSON.stringify(a.ending?.title));

    const idB = await visionTras(CON_ANILLO, 'heredar', 'g');
    await jugar(idB, 'Le pregunto a Bernardo qué vio en el agua');
    await jugar(idB, 'Me quedo a ver qué hace Bernardo');
    const b = await jugar(idB, 'Trato de advertirle');
    check('«Lo que se dice y no se oye» se alcanza', b.ending?.id === 'intervenir', JSON.stringify(b.ending?.title));
    check('...y no afirma que algo haya cambiado',
      /no podés decidir|Ninguna se puede probar/.test(String(b.ending?.text ?? '')));

    const idC = await visionTras(CON_ANILLO, 'heredar', 'h');
    await jugar(idC, 'Le pregunto a Bernardo qué vio en el agua');
    await jugar(idC, 'Me quedo a ver qué hace Bernardo');
    await jugar(idC, 'Me quedo donde puede verme');
    const c = await jugar(idC, 'Me quedo hasta la fundación');
    check('«Lo que se queda hasta el final» se alcanza', c.ending?.id === 'quedarse', JSON.stringify(c.ending?.title));
    check('...y explica el nombre viejo del pueblo por la sal, sin misticismo',
      /por la sal/.test(String(c.ending?.text ?? '')));
  }

  console.log('\n5. LO SELLADO SIGUE SELLADO');
  {
    const textos = [
      ...EL_HOMBRE_QUE_MIRABA_EL_AGUA.documents.map((d) => d.content),
      ...Object.values(EL_HOMBRE_QUE_MIRABA_EL_AGUA.locations).flatMap((l) => [
        l.description, ...(l.atmosphere ?? []),
        ...(l.features ?? []).flatMap((f) => [f.description, f.closerLook ?? '']),
      ]),
      EL_HOMBRE_QUE_MIRABA_EL_AGUA.opening,
    ].join('\n').toLowerCase();
    check('ningún texto dice quién construyó el primer anillo',
      !/(construy|fabric|hicier|hizo)[a-zé ]*el (primer )?anillo/.test(textos));
    check('ningún texto nombra al Primer Rostro', !textos.includes('primer rostro'));
    check('ningún texto nombra al Archivista', !textos.includes('archivista'));
    check('el inventario dice «recuperado», no «hecho»',
      EL_HOMBRE_QUE_MIRABA_EL_AGUA.documents
        .find((d) => d.id === 'doc-inventario')!.content.toLowerCase().includes('recuperado'));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
