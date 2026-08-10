/**
 * PRUEBA DEL SISTEMA SOCIAL — `npm run prueba:social`
 *
 * Verifica las dos cosas que motivaron el sistema:
 *
 *   1. HABLAR TIRA DADOS. Medido sobre una partida de 30 turnos, las ocho
 *      conversaciones con Rosa resolvían cero tiradas: Persuasión y Psicología
 *      estaban en la ficha y no se usaban nunca.
 *
 *   2. PREGUNTAR CUESTA. Sin costo, la estrategia óptima es agotar todos los
 *      botones y reintentar cada tirada hasta que salga, con lo cual la
 *      habilidad del personaje no importa y sólo importa la insistencia del
 *      jugador.
 *
 * Y una tercera que importa para lo que viene: que el motor resuelve
 * conversaciones SIN saber de qué aventura son. La prueba arma una aventura
 * falsa con un NPC inventado y comprueba que funciona igual.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { PACIENCIA_INICIAL, COSTO } from './rules/social.config.ts';
import type { Scenario } from './scenario/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

async function turno(id: string, escenario: Scenario, intencion: string) {
  const t = await Turn.open(id);
  t.submitIntent(intencion, 'p1');
  const r = await runOfflineTurn(t, escenario, intencion, noop);
  t.narrate(r.narration, r.options);
  await t.commit();
  return { narracion: r.narration, estado: (await Turn.open(id)).state };
}

const rosaDe = (s: any) => s.npcs['npc-rosa'];

async function main() {
  // ── 1. Hablar tira dados ─────────────────────────────────────────────────
  console.log('\n1. HABLAR RESUELVE TIRADAS');
  const id = await createCampaign(AGUA_QUIETA, 'SOCIAL', 'p'.repeat(64));

  // Primero destrabar los temas que necesitan contexto.
  await turno(id, AGUA_QUIETA, 'Le pregunto a Rosa qué pasó esa noche con Ignacio');
  const antes = (await Turn.open(id)).state.rolls.length;
  const r1 = await turno(id, AGUA_QUIETA, 'Le pregunto a Rosa por la plata que se debía');
  const despues = r1.estado.rolls.length;

  check('preguntar algo que se resiste tira dados', despues > antes,
    `${despues - antes} tirada(s)`);
  const ultima = r1.estado.rolls[r1.estado.rolls.length - 1];
  check('la tirada es de una habilidad social',
    ['psicologia', 'persuasion', 'labia'].includes(String(ultima?.commitment.skill)),
    String(ultima?.commitment.skill));

  // ── 2. Preguntar cuesta paciencia ────────────────────────────────────────
  console.log('\n2. PREGUNTAR CUESTA');
  const paciencia = rosaDe(r1.estado).patience;
  check('la paciencia bajó al preguntar', paciencia < PACIENCIA_INICIAL,
    `${paciencia}/${PACIENCIA_INICIAL}`);

  // Insistir sobre un tema esquivado tiene que costar más que preguntar algo
  // nuevo. Es lo que impide que reintentar sea gratis.
  check('insistir cuesta más que preguntar', COSTO.insistir > COSTO.tema,
    `${COSTO.insistir} vs ${COSTO.tema}`);

  // ── 3. La paciencia se agota y corta la conversación ─────────────────────
  console.log('\n3. LA PACIENCIA SE AGOTA');
  // Se pregunta lo que el juego ESTÁ ofreciendo, no siempre lo mismo: un tema
  // ya contestado deja de existir y preguntarlo no cuesta nada, que es
  // correcto —nadie se cansa de una pregunta que no le hicieron— pero no
  // agotaría a nadie nunca.
  let estado = r1.estado;
  for (let n = 0; n < 12 && rosaDe(estado).patience > 0; n++) {
    const tema = accionesDisponibles(estado, AGUA_QUIETA)
      .find((o) => o.id.startsWith('tema:'));
    if (!tema) break;
    estado = (await turno(id, AGUA_QUIETA, tema.intencion)).estado;
  }
  check('se le puede agotar la paciencia a un NPC', rosaDe(estado).patience === 0,
    `paciencia ${rosaDe(estado).patience}`);

  const opciones = accionesDisponibles(estado, AGUA_QUIETA);
  const temasOfrecidos = opciones.filter((o) => o.id.startsWith('tema:'));
  check('agotado, no se le ofrece ningún tema', temasOfrecidos.length === 0,
    `${temasOfrecidos.length} temas`);
  check('agotado, todavía quedan otras cosas que hacer', opciones.length > 0,
    `${opciones.length} opciones`);

  // ── 4. Se recupera con el tiempo del mundo ───────────────────────────────
  console.log('\n4. SE RECUPERA CON EL TIEMPO DEL MUNDO');
  const tras = await turno(id, AGUA_QUIETA, 'Espero un rato largo sin hacer nada');
  check('esperar le devuelve paciencia', rosaDe(tras.estado).patience > 0,
    `paciencia ${rosaDe(tras.estado).patience}`);
  const luego = accionesDisponibles(tras.estado, AGUA_QUIETA)
    .filter((o) => o.id.startsWith('tema:'));
  check('y vuelve a haber temas para preguntarle', luego.length > 0, `${luego.length} temas`);

  // ── 5. El motor no sabe de qué aventura son los temas ────────────────────
  // Esta es la que importa para poder cargar más aventuras: si el resolvedor
  // supiera algo de Agua Quieta, esto fallaría.
  console.log('\n5. EL RESOLVEDOR ES AGNÓSTICO DE LA AVENTURA');
  const inventada: Scenario = {
    ...AGUA_QUIETA,
    id: 'prueba-inventada',
    conversations: [
      {
        id: 'tema-inventado', npc: 'npc-rosa',
        etiqueta: 'Preguntarle por el molino',
        intencion: 'Le pregunto a Rosa por el molino',
        claves: ['molino'],
        prueba: { skill: 'persuasion', difficulty: 'regular', razon: 'que hable del molino' },
        cede: { texto: ['MOLINO-CEDE'], actitud: 1 },
        esquiva: { texto: ['MOLINO-ESQUIVA'] },
      },
    ],
  };
  const id2 = await createCampaign(inventada, 'INVENTADA', 'q'.repeat(64));
  const inv = await turno(id2, inventada, 'Le pregunto a Rosa por el molino');
  check('un tema declarado por otra aventura se resuelve igual',
    /MOLINO-(CEDE|ESQUIVA)/.test(inv.narracion),
    inv.narracion.slice(0, 40));
  check('y tira dados como cualquier otro', inv.estado.rolls.length === 1,
    `${inv.estado.rolls.length} tiradas`);

  const opcionesInv = accionesDisponibles(inv.estado, inventada);
  check('sus botones se generan solos',
    opcionesInv.some((o) => o.id === 'tema:tema-inventado')
      || inv.estado.npcs['npc-rosa']!.dodgedTopics.includes('tema-inventado'),
    'ofrecido o ya esquivado');
  check('y NO aparecen los temas de Agua Quieta',
    !opcionesInv.some((o) => o.id === 'tema:soga' || o.id === 'tema:ella'));

  // ── 6. Un tema cerrado por actitud no se ofrece ──────────────────────────
  // Se ofrecía, y cada intento contestaba «de eso no hablo» y cobraba
  // paciencia. Era un botón que sólo servía para castigar al que lo apretaba.
  console.log('\n6. LOS TEMAS QUE NO VAN A FUNCIONAR NO SE OFRECEN');
  const id3 = await createCampaign(AGUA_QUIETA, 'PISO', 'r'.repeat(64));
  let e3 = (await turno(id3, AGUA_QUIETA, 'Le pregunto a Rosa qué pasó esa noche con Ignacio')).estado;
  e3 = (await turno(id3, AGUA_QUIETA, 'Le pregunto a Rosa por la plata que se debía')).estado;

  const hermano = AGUA_QUIETA.conversations.find((t) => t.id === 'hermano')!;
  const piso = hermano.prueba!.actitudMinima!;
  const actitud = e3.npcs['npc-rosa']!.attitude[e3.activeInvestigator] ?? 0;
  const ofrecido = accionesDisponibles(e3, AGUA_QUIETA)
    .some((o) => o.id === 'tema:hermano');
  check('con la actitud por debajo del piso, el tema no aparece',
    actitud >= piso || !ofrecido, `actitud ${actitud}, piso ${piso}, ofrecido ${ofrecido}`);

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
