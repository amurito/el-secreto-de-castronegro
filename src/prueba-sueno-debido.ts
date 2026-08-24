/**
 * PRUEBA DE EL SUEÑO DEBIDO — `npm run prueba:sueno`
 *
 * La quinta aventura estrena tres cosas, y las tres se verifican jugando:
 *
 *   1. Que LEA EL DESENLACE de la anterior, no sólo que la anterior existió.
 *      El Invierno Debido termina de cinco maneras distintas y la carta de
 *      apertura de ésta se escribe distinta en las cinco. Se juega cinco
 *      veces, sembrando cada consecuencia, y los cinco textos tienen que
 *      salir diferentes entre sí.
 *   2. Que las TRES NOCHES encadenen y los TRES DESENLACES tengan botón. Es
 *      la familia de bug que ya apareció siete veces en este proyecto:
 *      contenido declarado sin camino. Se comprueba con `accionesDisponibles`,
 *      que es lo que ve el jugador, no con frase libre.
 *   3. Que las HABILIDADES RARAS no bloqueen. Ninguna ficha pregenerada trae
 *      Ocultismo ni Antropología —salen en base 5 y 1—, así que la aventura
 *      está escrita para que fallarlas cambie lo que se entiende y nunca si
 *      se puede seguir. Se juega una partida fallando todo lo raro y tiene
 *      que llegar igual a los tres finales.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { SUENO_DEBIDO } from './scenario/suenodebido.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const insistir = (paso: string, veces = 3) => Array(veces).fill(paso) as string[];
const botones = (s: GameState) => accionesDisponibles(s, SUENO_DEBIDO).map((o) => o.id);

/** Las consecuencias que dejaría cada uno de los cinco desenlaces de la cuarta. */
const DESENLACES_PREVIOS: Record<string, string | null> = {
  pintar: 'El investigador cumplió el turno de 1926 y quedó anotado en el libro de la escribanía Requena.',
  soltar: 'El investigador convenció a Aurelio Requena de abandonar la obligación del Círculo Rojo.',
  'otro-ano': 'El investigador convenció a Aurelio Requena de cumplir un año más la obligación del Círculo Rojo.',
  denunciar: 'El investigador sacó el libro de turnos de Villa Requena para llevarlo a un juzgado.',
  irse: null,
};

async function jugar(titulo: string, semilla: string, guion: string[], previas: string[] = []) {
  const id = await createCampaign(SUENO_DEBIDO, titulo, semilla.repeat(64).slice(0, 64));
  if (previas.length) {
    const t = await Turn.open(id);
    for (const c of previas) {
      t.executeTool('record_consequence', {
        description: c, scope: 'world', permanent: 'true',
        world_reminder: 'Lo que pasó el invierno pasado en este mismo pueblo.',
      });
    }
    await t.commit();
  }
  const narrado: string[] = [];
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    if (t.investigator.status !== 'alive') break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, SUENO_DEBIDO, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
    narrado.push(r.narration);
  }
  return { estado: (await Turn.open(id)).state, narrado: narrado.join('\n') };
}

/** Llega hasta tener las tres noches hechas, jugando como se juega de verdad. */
const HASTA_EL_FONDO = [
  'Releo la carta que me trajo hasta acá',
  'Examino brocal de cerca',
  'Voy a la escribanía',
  ...insistir('Reviso a Aurelio', 6),
  ...insistir('Escucho lo que dice dormido', 4),
  'Leo el libro de turnos renglón por renglón',
  ...insistir('Miro de cerca los renglones tachados', 8),
  'Miro el tarro de almagre del estante',
  'Vuelvo a la plaza',
  'Voy a la escuela',
  'Miro la foto de la comisión del centenario',
  ...insistir('Le pregunto a Delfina si puede averiguar lo del setenta y ocho', 4),
  'Vuelvo a la plaza',
  'Voy a la escribanía',
  'Me duermo con el almagre en la mano',
  'Vuelvo a dormirme con el almagre',
  'Me duermo por última vez',
];

async function main() {
  // ── 1. LA CARTA LEE CUÁL DE LOS CINCO DESENLACES HUBO ────────────────────
  console.log('\n1. LA QUINTA AVENTURA LEE EL DESENLACE DE LA CUARTA, NO SÓLO QUE LA HUBO');

  const cartas: Record<string, string> = {};
  for (const [rama, consecuencia] of Object.entries(DESENLACES_PREVIOS)) {
    const r = await jugar(
      `CARTA-${rama}`, rama.slice(0, 2),
      ['Releo la carta que me trajo hasta acá'],
      consecuencia ? [consecuencia] : [],
    );
    cartas[rama] = r.narrado;
  }
  for (const rama of Object.keys(DESENLACES_PREVIOS)) {
    check(`la rama «${rama}» produce carta`, cartas[rama]!.length > 100);
  }
  const textos = Object.values(cartas);
  check('las cinco cartas son distintas entre sí',
    new Set(textos).size === 5, `${new Set(textos).size} textos únicos de 5`);
  check('la rama «pintar» le recuerda que está adentro del libro',
    cartas['pintar']!.includes('usted está adentro'), '');
  check('la rama «denunciar» habla del libro que se llevó',
    cartas['denunciar']!.includes('lo del libro'), '');
  check('jugada suelta, la carta se extraña de que le escriban a {trato}',
    cartas['irse']!.includes('Lo raro es que te escriba a vos'), '');

  // ── 2. LAS TRES NOCHES ENCADENAN ─────────────────────────────────────────
  console.log('\n2. LAS TRES NOCHES ENCADENAN, Y CADA UNA PIDE ALGO DE LA VIGILIA');

  const fondo = await jugar('FONDO', 'a', HASTA_EL_FONDO);
  check('la primera noche deja la ronda del brocal', pista(fondo.estado, 'la ronda del brocal'));
  check('la segunda noche deja la quinta hoja', pista(fondo.estado, 'una quinta hoja'));
  check('la tercera noche lo encuentra en el fondo', pista(fondo.estado, 'encontró en el fondo'));
  check('bajar tres veces deja consecuencia que cruza a la siguiente aventura',
    fondo.estado.consequences.some((c) => c.description.includes('bajó tres veces al sueño')));

  const sinVigilia = await jugar('SIN-VIGILIA', 'b', [
    'Voy a la escribanía',
    ...insistir('Reviso a Aurelio', 6),
    'Me duermo con el almagre en la mano',
    'Vuelvo a dormirme con el almagre',
  ]);
  check('sin fechar la tachadura, la segunda noche NO se ofrece',
    !botones(sinVigilia.estado).includes('noche-dos'), botones(sinVigilia.estado).join(', '));

  // ── 3. LOS TRES DESENLACES TIENEN BOTÓN ──────────────────────────────────
  console.log('\n3. LOS TRES DESENLACES TIENEN CAMINO REAL, NO SÓLO FRASE LIBRE');

  const b = botones(fondo.estado);
  check('«Sacarlo de ahí» es un botón real', b.includes('fin-sacarlo'), b.join(', '));
  check('«Ponerse en su lugar» es un botón real', b.includes('fin-ofrecer'), b.join(', '));
  check('«Irse» es un botón real', b.includes('fin-tren'), b.join(', '));
  // La tercera noche BLOQUEA la decisión: llegado al fondo, no hay mirar,
  // hablar, hacer ni ir — sólo los tres desenlaces. Antes de esto, el mismo
  // turno que narraba «estás en el fondo del brocal, con Aurelio enfrente»
  // seguía ofreciendo «Ir a la escuela», que no tiene ningún sentido estando
  // dormido. Reportado jugando.
  check('y NO queda ninguna otra opción —ni mirar, ni hablar, ni irse a otro lado—',
    b.every((id) => ['fin-sacarlo', 'fin-ofrecer', 'fin-tren'].includes(id)), b.join(', '));

  const sacar = await jugar('FIN-SACAR', 'c', [...HASTA_EL_FONDO, 'Lo saco de ahí']);
  check('«Lo que se despierta» se alcanza', sacar.estado.ending?.id === 'despertar', sacar.estado.ending?.title ?? 'sin desenlace');

  const ofrecer = await jugar('FIN-OFRECER', 'd', [...HASTA_EL_FONDO, 'Me pongo en su lugar']);
  check('«Lo que se paga con otro sueño» se alcanza', ofrecer.estado.ending?.id === 'cambio', ofrecer.estado.ending?.title ?? 'sin desenlace');
  check('y deja la deuda a nombre del investigador, para siempre',
    ofrecer.estado.consequences.some((c) => c.description.includes('se anotó en la quinta hoja')));

  const irse = await jugar('FIN-IRSE', 'e', ['Releo la carta que me trajo hasta acá', 'Me voy del pueblo']);
  check('«Lo que se queda dormido» se alcanza, y desde el primer minuto',
    irse.estado.ending?.id === 'dormido', irse.estado.ending?.title ?? 'sin desenlace');

  // ── 4. NINGÚN DESENLACE CONTESTA SI SIRVE — REGLA DE ORO (§15) ───────────
  console.log('\n4. NINGÚN DESENLACE CONTESTA SI LA OBLIGACIÓN SIRVE');

  const afirma = /(sirve|servía|funciona|era cierto|era verdad|se comprobó|quedó demostrado)/i;
  for (const [nombre, fin] of [
    ['despertar', sacar.estado.ending],
    ['cambio', ofrecer.estado.ending],
    ['dormido', irse.estado.ending],
  ] as const) {
    // «no vas a saber nunca si eso sirve» es exactamente lo contrario de
    // afirmarlo, así que la regla es: si aparece la palabra, tiene que
    // aparecer negada.
    const t = fin?.text ?? '';
    const afirmaciones = (t.match(afirma) ?? []).length;
    const negadas = (t.match(/(nunca vas a saber|no vas a saber|sin saber|no lo aclar|ninguna manera de saber|si eso sirve)/gi) ?? []).length;
    check(`«${nombre}» no afirma que la obligación sirva`, afirmaciones === 0 || negadas > 0, t.slice(0, 90));
  }

  // ── 5. PELEARSE CON CIRILO CIERRA UNA PUERTA Y ABRE OTRA ─────────────────
  console.log('\n5. HABERSE PELEADO CON CIRILO EL AÑO PASADO CAMBIA A RAMONA');

  const AL_PATIO = [
    'Voy a la escribanía',
    ...insistir('Escucho lo que dice dormido', 4),
    'Leo el libro de turnos renglón por renglón',
    ...insistir('Miro de cerca los renglones tachados', 8),
    'Vuelvo a la plaza',
    'Voy a la casa de los Sosa',
    // Ramona no habla del setenta y ocho a cualquiera que llegue: el tema
    // pide un piso de actitud, igual que se lo pedía Aurelio en la aventura
    // anterior, y es exactamente lo que su carta dice por escrito («no le
    // pregunte hasta que no tenga otra cosa»). Hay que hablarle primero.
    'Le pregunto a Ramona por qué tiene las manos limpias',
  ];
  const PELEA = 'En el patio de los Sosa, el investigador le fue encima a Cirilo Sosa a mano limpia, delante de la madre.';

  const enPaz = await jugar('RAMONA-PAZ', 'f', AL_PATIO);
  const conPelea = await jugar('RAMONA-PELEA', 'f', AL_PATIO, [PELEA]);

  const bPaz = botones(enPaz.estado);
  const bPelea = botones(conPelea.estado);
  check('en paz, Ramona se deja preguntar por el setenta y ocho',
    bPaz.includes('tema:r-1878'), bPaz.join(', '));
  check('en paz, NO aparece la vía de apretarla',
    !bPaz.includes('tema:r-1878-forzado'), bPaz.join(', '));
  check('después de pelearse, la vía por las buenas desaparece',
    !bPelea.includes('tema:r-1878'), bPelea.join(', '));
  check('después de pelearse, aparece la de apretarla',
    bPelea.includes('tema:r-1878-forzado'), bPelea.join(', '));

  // ── 6. LAS HABILIDADES RARAS ENRIQUECEN, NUNCA BLOQUEAN ─────────────────
  console.log('\n6. LAS HABILIDADES QUE NINGUNA FICHA TRAE NO BLOQUEAN NADA');

  const pedidas = new Set(fondo.estado.rolls.map((r) => r.commitment.skill));
  for (const hab of ['primeros_auxilios', 'escuchar', 'historia', 'biblioteca', 'ocultismo', 'antropologia', 'POW']) {
    check(`la aventura pide ${hab} de verdad`, pedidas.has(hab), [...pedidas].join(', '));
  }
  check('y el camino hasta los tres finales no depende de acertarlas',
    b.includes('fin-sacarlo') && b.includes('fin-ofrecer') && b.includes('fin-tren'),
    'los tres botones están con Ocultismo y Antropología en base');

  // ── 7. FALLAR PRIMEROS AUXILIOS NO TE DEJA SIN BOTÓN PARA DORMIR ─────────
  //
  // Bug real, reportado jugando: la primera versión dejaba «Revisó a Aurelio
  // de cerca» —el gatillo del botón de dormir— sólo en la rama de ÉXITO de
  // `mirar-aurelio`. Con Primeros Auxilios en 30-35% en las dos fichas
  // pregeneradas, un jugador con mala suerte agotaba el resto del contenido
  // sin encontrar nunca el camino a la primera noche. Semilla `a`: la tirada
  // falla en el primer intento (verificado por separado).
  console.log('\n7. FALLAR PRIMEROS AUXILIOS NO BLOQUEA EL CAMINO AL SUEÑO');

  const fallaAurelio = await jugar('FALLA-AURELIO', 'a', [
    'Voy a la escribanía',
    'Reviso a Aurelio',
  ]);
  const ultimaTirada = fallaAurelio.estado.rolls.at(-1);
  check('la tirada de Primeros Auxilios efectivamente falló',
    ultimaTirada?.commitment.skill === 'primeros_auxilios' && !['critical', 'extreme', 'hard', 'regular'].includes(ultimaTirada.execution.degree),
    `${ultimaTirada?.commitment.skill} — ${ultimaTirada?.execution.degree}`);
  const bFalla = botones(fallaAurelio.estado);
  check('y aun así aparece el botón para dormir con el almagre',
    bFalla.includes('noche-uno'), bFalla.join(', '));

  // ── 8. EL CLASIFICADOR RESUELVE AL NPC CORRECTO, NO AL PRIMER NOMBRE QUE APARECE ─
  //
  // Bug real, reportado jugando: «Le pregunto a Delfina qué le pasa a
  // Aurelio», dicho en la escuela, resolvía el objetivo contra AURELIO —que
  // ni está en la escuela— porque el motor sólo miraba `npc.present`
  // (sigue en la historia) y no `loc.npcsPresent` (está EN ESTE LUGAR), y
  // Aurelio aparece antes que Delfina en el objeto de NPCs. La respuesta
  // era el genérico de paciencia agotada de Aurelio, no el tema de Delfina.
  console.log('\n8. PREGUNTARLE A ALGUIEN POR UN TERCERO NO SE LE ATRIBUYE AL TERCERO');

  const enEscuela = await jugar('CLASIFICADOR-DESTINATARIO', 'g', [
    'Voy a la escuela',
    'Le pregunto a Delfina qué le pasa a Aurelio',
  ]);
  check('la respuesta es de Delfina, no un genérico de paciencia de Aurelio',
    enEscuela.narrado.includes('El médico de Del Valle vino dos veces'),
    enEscuela.narrado.slice(-200));
  check('y no aparece el texto de paciencia agotada mal atribuido',
    !enEscuela.narrado.includes('contesta lo justo'), enEscuela.narrado.slice(-200));

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
