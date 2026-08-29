/**
 * PRUEBA DEL ANILLO — `npm run prueba:anillo`
 *
 * `RingBond` estuvo en `shared/types.ts` desde el principio del proyecto, con
 * su comentario citando v0.7 §5.3, y nunca lo escribió nadie: los pregenerados
 * nacían con `ringBond: null` y ahí se quedaba. La séptima aventura lo usa —
 * ponerse el anillo es uno de sus desenlaces— así que la herramienta se
 * escribe y se prueba ANTES que el contenido que se va a apoyar en ella.
 *
 * Lo que esta prueba protege es un vínculo que, por canon, no se puede
 * deshacer sin matar a quien lo lleva. Un bug acá no se nota jugando: la ficha
 * muestra un investigador plausible y el anillo simplemente no está, o está
 * dos veces, o se perdió al cambiar de aventura.
 *
 * Las cinco cosas que tienen que ser ciertas:
 *   1. Se arranca sin anillo.
 *   2. Sólo se puede poner uno que se lleve encima.
 *   3. Puesto, queda en la ficha y anclado al evento que lo puso.
 *   4. No se puede poner un segundo.
 *   5. Cruza a la aventura siguiente. Es lo que lo hace permanente de verdad.
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LA_LEGUA } from './scenario/legua.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;

/** El reloj de bolsillo de Agua Quieta: arranca en el patio, no encima. */
const ANILLO = 'it-reloj';

async function main() {
  const id = await createCampaign(AGUA_QUIETA, 'ANILLO', 'a'.repeat(64));

  console.log('\n1. SE ARRANCA SIN ANILLO');
  const inicial = (await Turn.open(id)).state;
  check('ringBond es null al empezar', invDe(inicial).ringBond === null,
    JSON.stringify(invDe(inicial).ringBond));

  console.log('\n2. SÓLO SE PUEDE PONER UNO QUE SE LLEVE ENCIMA');
  {
    const t = await Turn.open(id);
    check('rechaza un objeto que no existe',
      !t.executeTool('bind_ring', { item_id: 'it-inventado', cause: 'x' }).ok);

    // El reloj existe pero está en el patio, no en la mano. Ponerse algo es un
    // gesto, no un traslado: si hay que ir a buscarlo, eso es otra escena.
    const lejos = t.executeTool('bind_ring', { item_id: ANILLO, cause: 'x' });
    check('rechaza un objeto que existe pero no lleva encima', !lejos.ok,
      lejos.message.replace('RECHAZADO POR EL MOTOR: ', ''));
  }

  console.log('\n   ...y con el objeto en la mano, sigue exigiendo una causa');
  {
    const t = await Turn.open(id);
    t.executeTool('transfer_item', {
      item_id: ANILLO, to: t.investigator.id, carried: 'true', cause: 'lo levanta del brocal',
    });
    const sinCausa = t.executeTool('bind_ring', { item_id: ANILLO, cause: '   ' });
    check('rechaza ponérselo sin decir por qué', !sinCausa.ok,
      sinCausa.message.replace('RECHAZADO POR EL MOTOR: ', ''));
    await t.commit();
  }

  console.log('\n3. PUESTO, QUEDA EN LA FICHA Y ANCLADO A SU EVENTO');
  {
    const t = await Turn.open(id);
    const r = t.executeTool('bind_ring', {
      item_id: ANILLO, cause: 'se lo puso él mismo, sabiendo lo que hacía',
    });
    check('la herramienta acepta', r.ok, r.message);
    await t.commit();
  }

  // Se relee del log: el reducer sólo corre reconstruyendo desde los eventos,
  // así que si el vínculo aparece acá es porque el evento se persistió de
  // verdad y no quedó en memoria del turno.
  const puesto = (await Turn.open(id)).state;
  const bond = invDe(puesto).ringBond;
  check('ringBond quedó escrito', Boolean(bond), JSON.stringify(bond));
  check('apunta al objeto correcto', bond?.itemId === ANILLO, bond?.itemId);
  check('quedó anclado a un evento real del log',
    typeof bond?.bondedAt === 'string' && bond.bondedAt.length > 0, bond?.bondedAt);
  check('retirarlo es letal por defecto (v0.7 §5.3)', bond?.removalLethal === true,
    String(bond?.removalLethal));

  console.log('\n4. NO SE PUEDE PONER UN SEGUNDO');
  {
    const t = await Turn.open(id);
    t.executeTool('transfer_item', {
      item_id: 'it-espejo', to: t.investigator.id, carried: 'true', cause: 'lo agarra',
    });
    const otro = t.executeTool('bind_ring', { item_id: 'it-espejo', cause: 'probarse otro' });
    check('rechaza el segundo anillo', !otro.ok,
      otro.message.replace('RECHAZADO POR EL MOTOR: ', ''));
    check('y el primero sigue intacto',
      invDe((await Turn.open(id)).state).ringBond?.itemId === ANILLO);
  }

  console.log('\n5. CRUZA A LA AVENTURA SIGUIENTE');
  const antes = (await loadState(id)).state;
  const idDos = await createCampaign(LA_LEGUA, 'ANILLO 2', 'b'.repeat(64), {
    estadoAnterior: antes,
    mesesTranscurridos: 5,
  });
  const bondDos = invDe((await loadState(idDos)).state).ringBond;
  check('el vínculo cruza entero', bondDos?.itemId === ANILLO, JSON.stringify(bondDos));
  check('y sigue siendo letal del otro lado', bondDos?.removalLethal === true);
  check('conserva el ancla del evento original',
    bondDos?.bondedAt === invDe(antes).ringBond?.bondedAt,
    `${bondDos?.bondedAt} vs ${invDe(antes).ringBond?.bondedAt}`);

  console.log('\nLA AVENTURA DECIDE SI RETIRARLO MATA — EL MOTOR NO SUPONE');
  {
    const idTres = await createCampaign(AGUA_QUIETA, 'ANILLO 3', 'c'.repeat(64));
    const t = await Turn.open(idTres);
    t.executeTool('transfer_item', {
      item_id: ANILLO, to: t.investigator.id, carried: 'true', cause: 'lo levanta',
    });
    t.executeTool('bind_ring', {
      item_id: ANILLO, cause: 'un anillo que se saca sin consecuencias', removal_lethal: 'false',
    });
    await t.commit();
    const b = invDe((await Turn.open(idTres)).state).ringBond;
    check('`removal_lethal: false` se respeta', b?.removalLethal === false, String(b?.removalLethal));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
