/**
 * PRUEBA DE EL INVIERNO DEBIDO — `npm run prueba:invierno`
 *
 * La cuarta aventura estrena tres cosas, y las tres se verifican jugando:
 *
 *   1. Que LEA LAS ANTERIORES. Las tres marcas del Círculo Rojo dejan
 *      consecuencia de alcance mundo, y la carta de apertura se escribe
 *      distinta según cuántas encontró el investigador. Se juega dos veces:
 *      sin ninguna marca y con las tres, y el texto tiene que salir distinto.
 *   2. Que COBRE MITOS. Leer la cuarta hoja sube Mitos de Cthulhu y baja el
 *      techo de Cordura para siempre. Se comprueba el número, no el texto.
 *   3. Que los CINCO DESENLACES sean alcanzables. Es la familia de bug que ya
 *      apareció seis veces en este proyecto: contenido declarado sin camino.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { INVIERNO_DEBIDO } from './scenario/inviernodebido.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import type { GameState, SkillId } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;
const mitosDe = (s: GameState) => invDe(s).skills['mitos' as SkillId]?.base ?? 0;
const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const insistir = (paso: string, veces = 3) => Array(veces).fill(paso) as string[];

/** Las tres marcas, como las dejarían las tres aventuras anteriores. */
const MARCAS = [
  'Leyó lo que Ignacio anotó sobre la marca del Círculo Rojo en el brocal de Los Álamos.',
  'Leyó lo que el agrimensor anotó sobre la marca del Círculo Rojo en el mojón del oeste.',
  'Encontró la hoja del Círculo Rojo suelta en el registro parroquial de Los Cardales.',
];

async function jugar(titulo: string, semilla: string, guion: string[], marcas: string[] = []) {
  const id = await createCampaign(INVIERNO_DEBIDO, titulo, semilla.repeat(64).slice(0, 64));
  if (marcas.length) {
    const t = await Turn.open(id);
    for (const m of marcas) {
      t.executeTool('record_consequence', {
        description: m, scope: 'world', permanent: 'true',
        world_reminder: 'Vio la marca y preguntó por ella.',
      });
    }
    await t.commit();
  }
  const narrado: string[] = [];
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, INVIERNO_DEBIDO, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
    narrado.push(r.narration);
  }
  return { estado: (await Turn.open(id)).state, narrado: narrado.join('\n') };
}

/**
 * Llega hasta tener el cajón abierto, jugando como se juega de verdad: la
 * paciencia de un NPC se recupera con TIEMPO DEL MUNDO (20 minutos por punto),
 * no insistiendo. Irse a mirar otra cosa y volver no es un truco de la prueba:
 * es el bucle que el sistema social está diseñado para premiar.
 */
const ABRIR_CAJON = [
  'Releo la carta que me trajo hasta acá',
  'Miro brocal de cerca',
  'Voy a la escribanía',
  'Le pregunto a Aurelio por la carta que me mandó',
  'Le pregunto a Aurelio en qué consiste la obligación',
  'Le pregunto a Aurelio qué es lo que quiere que yo haga',
  'Le pregunto a Aurelio si el invierno pasado cumplió su turno',
  'Vuelvo a la plaza',
  'Voy al mojón viejo',
  'Miro mojon de cerca',
  'Vuelvo al pueblo',
  'Voy a la escribanía',
  'Le pregunto a Aurelio si el invierno pasado cumplió su turno',
  'Le pido a Aurelio que me muestre lo que guarda bajo llave',
  'Le digo a Aurelio que ya no tiene nada que proteger',
  'Miro lo que hay adentro del cajón',
  'Levanto las cuatro hojas cosidas',
];

async function main() {
  // ── 1. LA CARTA CAMBIA SEGÚN LO QUE HAYA PASADO ANTES ────────────────────
  console.log('\n1. LA CUARTA AVENTURA LEE A LAS TRES ANTERIORES');
  const sinMarcas = await jugar('SIN MARCAS', 'a', ['Releo la carta que me trajo hasta acá']);
  const conMarcas = await jugar('CON MARCAS', 'a', ['Releo la carta que me trajo hasta acá'], MARCAS);

  check('sin marcas previas, la carta igual llega (se puede jugar sola)',
    Boolean(sinMarcas.estado.documents['doc-carta']?.obtainedAt));
  check('con las tres marcas, también',
    Boolean(conMarcas.estado.documents['doc-carta']?.obtainedAt));
  check('y el texto de la escena NO es el mismo',
    sinMarcas.narrado !== conMarcas.narrado);
  check('con las tres, el texto reconoce que son tres',
    /tres/.test(conMarcas.narrado) && /ninguno de los tres/.test(conMarcas.narrado),
    conMarcas.narrado.slice(-160));
  check('sin ninguna, el texto dice que no se le ocurre de qué tres habla',
    /no se te ocurre/i.test(sinMarcas.narrado));

  // ── 2. LA INVESTIGACIÓN LLEGA AL CAJÓN ───────────────────────────────────
  console.log('\n2. EL CAJÓN SE ABRE, Y ADENTRO ESTÁN LAS DOS COSAS');
  const abierto = await jugar('CAJON', 'b', ABRIR_CAJON, MARCAS);
  check('el libro de turnos se entrega',
    Boolean(abierto.estado.documents['doc-turnos']?.obtainedAt));
  check('el procedimiento también',
    Boolean(abierto.estado.documents['doc-procedimiento']?.obtainedAt));
  check('Aurelio avisó de no dar vuelta la tercera hoja',
    /no hay manera de volver atrás|no la dé vuelta|no la diera vuelta|si da vuelta la tercera/i.test(abierto.narrado));

  // ── 3. MITOS DE CTHULHU, CON SU PRECIO ───────────────────────────────────
  console.log('\n3. LA CUARTA HOJA COBRA, Y COBRA PARA SIEMPRE');
  const antesMitos = mitosDe(abierto.estado);
  const techoAntes = invDe(abierto.estado).derived.maxSan;
  const leido = await jugar('CUARTA HOJA', 'b',
    [...ABRIR_CAJON, 'Doy vuelta la tercera hoja y leo la cuarta'], MARCAS);
  check('antes de leerla, Mitos está en 0', antesMitos === 0, String(antesMitos));
  check('el techo de Cordura arrancaba en 99', techoAntes === 99, String(techoAntes));
  check('después de leerla, Mitos subió', mitosDe(leido.estado) > 0, String(mitosDe(leido.estado)));
  check('y el techo de Cordura bajó exactamente 99 − Mitos',
    invDe(leido.estado).derived.maxSan === 99 - mitosDe(leido.estado),
    `${invDe(leido.estado).derived.maxSan} con Mitos ${mitosDe(leido.estado)}`);
  check('la Cordura nunca queda por encima del techo',
    invDe(leido.estado).derived.san <= invDe(leido.estado).derived.maxSan);
  check('queda la pista de que la leyó', pista(leido.estado, 'leyó la cuarta hoja'));
  check('y una consecuencia que va a cruzar a la aventura siguiente',
    leido.estado.consequences.some((c) =>
      c.description.includes('entendió para qué se repinta') && c.scope === 'world' && c.permanent));
  check('el texto NO transcribe la cuarta hoja: narra el efecto, no el contenido',
    !/«[^»]{200,}»/.test(leido.narrado));

  // ── 4. LOS CINCO DESENLACES SON ALCANZABLES ──────────────────────────────
  console.log('\n4. LOS CINCO DESENLACES TIENEN CAMINO REAL');

  const irse = await jugar('IRSE', 'c', ['Me voy del pueblo']);
  check('«Lo que no se toca» se alcanza', irse.estado.ending?.id === 'irse',
    irse.estado.ending?.title ?? 'sin final');

  const posterga = await jugar('POSTERGAR', 'c',
    [...ABRIR_CAJON, 'Le digo que lo pinte este año, un año más']);
  check('«Lo que se posterga» se alcanza', posterga.estado.ending?.id === 'otro-ano',
    posterga.estado.ending?.title ?? 'sin final');

  const soltar = await jugar('SOLTAR', 'c',
    [...ABRIR_CAJON, 'Le digo que no lo pinte, que deje de hacerlo']);
  check('«Lo que se suelta» se alcanza', soltar.estado.ending?.id === 'soltar',
    soltar.estado.ending?.title ?? 'sin final');

  const pintar = await jugar('PINTAR', 'c', [...ABRIR_CAJON, 'Vuelvo a la plaza', 'Lo pinto yo']);
  check('«Lo que se repinta» se alcanza', pintar.estado.ending?.id === 'pintar',
    pintar.estado.ending?.title ?? 'sin final');
  check('y deja anotado al investigador en el libro, para siempre',
    pintar.estado.consequences.some((c) =>
      c.description.includes('quedó anotado en el libro') && c.permanent));

  const denuncia = await jugar('DENUNCIA', 'c', [...ABRIR_CAJON, 'Me llevo el libro al juzgado']);
  check('«Lo que se lleva al juzgado» se alcanza', denuncia.estado.ending?.id === 'denunciar',
    denuncia.estado.ending?.title ?? 'sin final');

  // Que las cinco frases funcionen NO alcanza: en modo motor —el modo
  // público, sin API— no hay caja de texto libre, así que un final que sólo
  // existe como patrón de texto es imposible de alcanzar de verdad. Bug
  // real, reportado jugando: la aventura entera quedaba sin salida.
  console.log('\n4-BIS. Y LOS CINCO TIENEN BOTÓN, NO SÓLO FRASE LIBRE');
  const idFinal = await createCampaign(INVIERNO_DEBIDO, 'BOTONES', 'd'.repeat(64));
  for (const intencion of ABRIR_CAJON) {
    const t = await Turn.open(idFinal);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, INVIERNO_DEBIDO, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  const conCajon = (await Turn.open(idFinal)).state;
  const botonesEscribania = accionesDisponibles(conCajon, INVIERNO_DEBIDO).map((o) => o.id);
  for (const id of ['fin-irse', 'fin-otro-ano', 'fin-soltar', 'fin-denunciar']) {
    check(`el botón «${id}» está entre las opciones reales`, botonesEscribania.includes(id), botonesEscribania.join(', '));
  }
  // `fin-pintar` sólo vale en la plaza o el mojón —ahí es donde se pinta—,
  // no en la escribanía: se comprueba en su propio lugar.
  {
    const t = await Turn.open(idFinal);
    t.submitIntent('Vuelvo a la plaza', 'p1');
    const r = await runOfflineTurn(t, INVIERNO_DEBIDO, 'Vuelvo a la plaza', noop);
    t.narrate(r.narration, r.options);
    await t.commit();
    const enPlaza = (await Turn.open(idFinal)).state;
    const botonesPlaza = accionesDisponibles(enPlaza, INVIERNO_DEBIDO).map((o) => o.id);
    check('el botón «fin-pintar» está entre las opciones de la plaza',
      botonesPlaza.includes('fin-pintar'), botonesPlaza.join(', '));
  }

  // ── 5. LA PREGUNTA CENTRAL NO SE CONTESTA EN NINGUNA RAMA ────────────────
  console.log('\n5. NINGÚN DESENLACE CONTESTA SI SIRVE — REGLA DE ORO (§15)');
  for (const [nombre, r] of [
    ['repintar', pintar], ['soltar', soltar], ['postergar', posterga],
    ['denunciar', denuncia], ['irse', irse],
  ] as const) {
    const t = r.estado.ending?.text ?? '';
    const afirmaQueSirve = /(sirve|servía|funcion(a|ó)|era cierto|era verdad)\b(?!.*\bno\b)/i.test(t)
      && !/no (se|hay) (puede|manera|forma)/i.test(t);
    check(`«${nombre}» no afirma que la obligación sirva`, !afirmaQueSirve, t.slice(0, 90));
  }

  // ── 6. CIRILO PUEDE PELEAR, PERO NO ES OBLIGATORIO ───────────────────────
  console.log('\n6. HAY COMBATE POSIBLE Y ES EVITABLE');
  const cirilo = irse.estado.npcs['npc-cirilo'];
  check('Cirilo tiene estadísticas de combate', Boolean(cirilo?.combate),
    cirilo?.combate ? `Pelea ${cirilo.combate.pelea}, ${cirilo.combate.armaId}` : 'ninguna');
  check('pero se puede terminar la aventura sin pelear',
    irse.estado.ending?.id === 'irse' && invDe(irse.estado).status === 'alive');
  check('los otros tres NPC no pelean: no todos tienen que tener PV',
    !irse.estado.npcs['npc-aurelio']?.combate
    && !irse.estado.npcs['npc-ramona']?.combate
    && !irse.estado.npcs['npc-delfina']?.combate);

  // ── 7. CIRILO SE PUEDE PELEAR DE VERDAD, NO SÓLO EN LA FICHA ─────────────
  //
  // Bug real, encontrado jugando: Cirilo tenía Pelea y PV declarados, pero
  // ningún camino de la aventura llamaba a `resolve_attack`/`resolve_flee`.
  // La escalada terminaba en «vamos a arreglarlo» y ahí se cortaba —ni
  // siquiera había manera de intentar evitarlo, porque tampoco había forma
  // de HABLARLE al respecto—. Estas pruebas verifican las tres salidas por
  // BOTÓN, con el motor de combate real.
  console.log('\n7. CIRILO SE PELEA DE VERDAD, Y TIENE TRES SALIDAS');

  const AL_CONFLICTO = [
    'Voy a la casa de los Sosa',
    'Le pregunto a Ramona por lo que se repinta cada invierno',
    'Le pregunto a Ramona por Cirilo',
    ...insistir('Le pregunto a Ramona quién lo pintó este año', 5),
    'Le cuento a Cirilo lo que hace su madre',
  ];

  const conflicto = await jugar('CONFLICTO', 'e', AL_CONFLICTO);
  check('Cirilo bloquea la salida', pista(conflicto.estado, 'Cirilo bloqueó la salida del patio'));
  const botonesConflicto = accionesDisponibles(conflicto.estado, INVIERNO_DEBIDO).map((o) => o.id);
  check('«Enfrentar a Cirilo» es un botón real', botonesConflicto.includes('enfrentar-cirilo'), botonesConflicto.join(', '));
  check('«Salir corriendo» es un botón real', botonesConflicto.includes('huir-cirilo'), botonesConflicto.join(', '));
  check('«Tratar de calmarlo» es un botón real', botonesConflicto.includes('tema:c-calmar'), botonesConflicto.join(', '));

  // Un solo intercambio puede salir en blanco —los dos fallan, o los dos se
  // estorban— sin que eso sea un bug; se insiste como en `prueba-combate.ts`
  // hasta que alguno de los dos PV se mueva de verdad.
  const pelea = await jugar('PELEAR-CIRILO', 'f', [...AL_CONFLICTO, ...insistir('Enfrento a Cirilo', 4)]);
  check('pelear tira dados de verdad', pelea.estado.rolls.some((r) => r.investigatorId === 'npc-cirilo'),
    `${pelea.estado.rolls.length} tiradas en total`);
  const pvCirilo = pelea.estado.npcs['npc-cirilo']?.combate?.hp ?? 13;
  const pvInvestigador = invDe(pelea.estado).derived.hp;
  check('y el combate deja daño de verdad en alguno de los dos lados',
    pvCirilo !== 13 || pvInvestigador !== invDe(pelea.estado).derived.maxHp,
    `Cirilo ${pvCirilo}/13 · investigador ${pvInvestigador}/${invDe(pelea.estado).derived.maxHp}`);

  const huida = await jugar('HUIR-CIRILO', 'g', [...AL_CONFLICTO, 'Me voy corriendo de la casa de los Sosa']);
  check('huir también tira: el golpe de oportunidad', huida.estado.rolls.length > conflicto.estado.rolls.length);

  // ── 8. GANAR LA PELEA TIENE CONSECUENCIA: CIRILO YA NO CONTESTA, Y RAMONA TAMPOCO ──
  console.log('\n8. DEJAR A CIRILO INCONSCIENTE CAMBIA LO QUE SE PUEDE HABLAR DESPUÉS');

  const ko = await jugar('KO-CIRILO', 'x', [...AL_CONFLICTO, ...insistir('Enfrento a Cirilo', 20)]);
  const pvFinal = ko.estado.npcs['npc-cirilo']?.combate?.hp ?? 13;
  const invKo = invDe(ko.estado);
  check('la insistencia alcanza para dejarlo fuera de combate —si no, subir la semilla o la cuenta—',
    pvFinal <= 0,
    `PV final de Cirilo: ${pvFinal} · investigador: ${invKo.status} ${invKo.derived.hp}/${invKo.derived.maxHp} · tiradas: ${ko.estado.rolls.length} · ending: ${ko.estado.ending ?? 'ninguno'}`);

  if (pvFinal <= 0) {
    const idKo = ko.estado.campaignId;
    const t1 = await Turn.open(idKo);
    t1.submitIntent('Le hablo a Cirilo', 'p1');
    const r1 = await runOfflineTurn(t1, INVIERNO_DEBIDO, 'Le hablo a Cirilo', noop);
    t1.narrate(r1.narration, r1.options);
    await t1.commit();
    check('a Cirilo inconsciente ya no se le puede hablar',
      r1.narration.toLowerCase().includes('fuera de combate'), r1.narration);

    const t2 = await Turn.open(idKo);
    t2.submitIntent('Le pregunto a Ramona por Cirilo', 'p1');
    const r2 = await runOfflineTurn(t2, INVIERNO_DEBIDO, 'Le pregunto a Ramona por Cirilo', noop);
    t2.narrate(r2.narration, r2.options);
    await t2.commit();
    check('Ramona ya no quiere hablar, con su hijo tirado en el piso',
      r2.narration.includes('Salga de mi casa'), r2.narration);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
