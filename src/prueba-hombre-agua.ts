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
    // El encuentro pide Sigilo, y la tirada decide QUIÉN maneja el encuentro:
    // con éxito el jugador elige cuándo dejarse ver, y con fallo lo ve
    // Bernardo primero y esa decisión ya no existe. No se puede afirmar cuál
    // de las dos sale con una semilla fija (ver `prueba-cordura.ts` para el
    // mismo criterio), así que se comprueba la propiedad que vale en las dos:
    // la cadena sigue, y las dos ramas dicen que no sabe su nombre.
    const loVioAntes = narrado(s, 'sale del agua con la cara ya girada');
    check('te-ve se ofrece si NO te vio, y no se ofrece si te vio',
      ids().includes('te-ve') === !loVioAntes,
      loVioAntes ? 'lo vio primero' : 'no lo vio');
    check('en las dos ramas la cadena avanza hasta los finales del encuentro',
      ids().includes('fin-intervenir'), ids().join(', '));

    if (!loVioAntes) {
      s = await jugar(id, 'Me quedo donde puede verme');
      check('te ve, y no sabe tu nombre', narrado(s, 'No sabe tu nombre'));
    } else {
      check('te ve igual, y tampoco sabe tu nombre', narrado(s, 'No sabe tu nombre'));
    }
    check('cuesta Cordura de verdad', invDe(s).derived.san < 99);
    check('...y recién ahí aparece quedarse hasta la fundación', ids().includes('fin-quedarse'), ids().join(', '));
  }

  console.log('\n2-bis. LAS DOS RAMAS DEL SIGILO EXISTEN Y SE DISTINGUEN');
  {
    // Se recorren semillas hasta encontrar una de cada lado. Fijar una sola
    // haría que la suite dejara de cubrir la rama que esa semilla no toca.
    let conSigilo = false, sinSigilo = false;
    for (const letra of 'fghijklmnopq') {
      const idS = await visionTras(CON_ANILLO, 'heredar', letra);
      await jugar(idS, 'Le pregunto a Bernardo qué vio en el agua');
      const s = await jugar(idS, 'Me quedo a ver qué hace Bernardo');
      const visto = narrado(s, 'sale del agua con la cara ya girada');
      if (visto && !sinSigilo) {
        sinSigilo = true;
        check('si te descubre: te mira como a un testigo, no como a una confirmación',
          narrado(s, 'Te mira como se mira un testigo') || narrado(s, 'como se mira un testigo'));
        check('...y cuesta más Exposición que hacerlo bien',
          invDe(s).umbral.exposure >= 15, `${invDe(s).umbral.exposure}`);
      }
      if (!visto && !conSigilo) {
        conSigilo = true;
        check('si no te descubre: le cambia la cara y no te nombra a vos',
          narrado(s, 'le acaban de contestar que sí'));
      }
      if (conSigilo && sinSigilo) break;
    }
    check('las dos ramas del sigilo son alcanzables', conSigilo && sinSigilo,
      `sigilo ok: ${conSigilo} · descubierto: ${sinSigilo}`);
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

  console.log('\n4-bis. LA AVENTURA NO REGALA EL AÑO: HAY QUE UBICARSE');
  {
    const idU = await visionTras(CON_ANILLO, 'heredar', 'r');
    let s = (await loadState(idU)).state;
    // El encabezado sale del rótulo del tiempo del mundo. Antes decía «1679»
    // desde el primer segundo y contestaba solo la pregunta de la aventura.
    check('el rótulo del tiempo NO nombra el año al empezar',
      !/16\d\d/.test(s.world.time.display), s.world.time.display);
    const ids = () => accionesDisponibles(s, EL_HOMBRE_QUE_MIRABA_EL_AGUA).map((o) => o.id);
    check('ubicarse no se ofrece antes de tener con qué', !ids().includes('ubicarse'), ids().join(', '));

    await jugar(idU, 'Voy al campamento');
    s = await jugar(idU, 'Miro la carreta');
    check('la carreta se puede mirar y deja rastro de época',
      narrado(s, 'con las varas apoyadas en el suelo'));

    s = (await loadState(idU)).state;
    const puedeUbicarse = ids().includes('ubicarse');
    check('con evidencia de época ya se puede intentar ubicarse', puedeUbicarse, ids().join(', '));

    if (puedeUbicarse) {
      s = await jugar(idU, 'Trato de ubicarme en el tiempo');
      check('ubicarse cambia el rótulo del tiempo', s.world.time.display !== 'una tarde de calor, en ninguna parte',
        s.world.time.display);
      // Con éxito sale el año; fallando, sólo el siglo. Las dos son válidas y
      // no se puede fijar cuál con una semilla, así que se comprueba que el
      // rótulo diga UNA de las dos cosas y nunca siga en «ninguna parte».
      check('el rótulo nuevo dice el año o el siglo',
        /1679/.test(s.world.time.display) || /siglo que no es el tuyo/.test(s.world.time.display),
        s.world.time.display);
      check('...y deja pista de cuándo está parado',
        s.board.clues.some((c) => /siglo XVII|noviembre de 1679/.test(c.description)));
    }
  }

  console.log('\n4-ter. EL AGUA CONTESTA SI LA TOCÁS');
  {
    const idT = await visionTras(SIN_ANILLO, 'cortar', 's');
    const s = await jugar(idT, 'Meto la mano en el agua');
    check('se puede meter la mano y el agua no se porta como agua',
      narrado(s, 'metés la mano hasta la muñeca'));
    check('cuesta Exposición', invDe(s).umbral.exposure > 0, `${invDe(s).umbral.exposure}`);
  }

  console.log('\n4-quater. EL LIBRO DE BERNARDO CIERRA SU PISTA EN LOS PAPELES');
  {
    // Sólo si el investigador leyó el libro sin título en «Lo que Bernardo
    // sabía»: ahí el libro citaba un nombre y un lugar sin explicarlos, y
    // este baúl es el único lugar de la campaña donde eso se cierra.
    const conLibro = await visionTras(
      'El investigador volvió a la Casa de Díaz y leyó de punta a punta el libro sin título que Bernardo dejó en su laboratorio.',
      'cortar', 't');
    await jugar(conLibro, 'Voy al campamento');
    const s = await jugar(conLibro, 'Leo los papeles del baúl');
    check('reconoce el nombre y el lugar que el libro citaba',
      narrado(s, 'ya las leíste antes'), 'la conexión con el libro sale');
    check('deja pista propia de la conexión',
      s.board.clues.some((c) => c.description.includes('la fuente de Bernardo no era un maestro')));
    check('y consecuencia permanente',
      s.consequences.some((c) => c.description.includes('identificó la fuente que el libro de Bernardo citaba')));

    // Sin haber leído el libro, ese párrafo NO puede aparecer.
    const sinLibro = await visionTras(NI_UNO_NI_OTRO, 'irse-vigesimo', 'u');
    await jugar(sinLibro, 'Voy al campamento');
    const s2 = await jugar(sinLibro, 'Leo los papeles del baúl');
    check('sin haber leído el libro, no se menciona ninguna conexión',
      !narrado(s2, 'ya las leíste antes'));
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
