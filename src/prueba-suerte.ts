/**
 * PRUEBA DE SUERTE — `npm run prueba:suerte`
 *
 * §2.3-adyacente del ROADMAP: hasta esta sesión, `derived.luck` era un
 * número decorativo — se tiraba en la creación, se mostraba en la ficha, y
 * nada del motor lo tocaba. Esta prueba protege la variante simplificada que
 * se implementó: gastar Suerte ANTES de tirar, a cambio de un dado de
 * bonificación en la tirada siguiente (no la regla del manual de bajar el
 * resultado YA tirado — `toolRequestRoll` compromete y ejecuta en la misma
 * llamada, sin pausa donde reaccionar al número; ver el comentario en
 * `LuckSpentPayload`).
 *
 * Lo que tiene que ser cierto:
 *   1. Gastarla baja la Suerte y deja un dado de bonificación pendiente.
 *   2. Ese dado se aplica a la PRÓXIMA tirada propia, y se consume — no
 *      sobrevive a una segunda tirada.
 *   3. Rechaza sin Suerte suficiente, y rechaza pasado el tope de 2 dados.
 *   4. El botón («Apelo a mi suerte») sólo se ofrece cuando hay Suerte para
 *      pagarlo y no se llegó al tope.
 *   5. El clasificador de intención reconoce la frase sin free text real.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { classify } from './keeper/intent.ts';
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

async function main() {
  const id = await createCampaign(AGUA_QUIETA, 'SUERTE', 's'.repeat(64));
  const inicial = (await Turn.open(id)).state;
  const invIni = invDe(inicial);

  console.log('\n1. GASTARLA BAJA LA SUERTE Y DEJA UN DADO PENDIENTE');
  check('empieza sin dados pendientes', invIni.pendingLuckBonus === 0);

  let t = await Turn.open(id);
  const luckAntes = invDe(t.state).derived.luck;
  const r1 = t.executeTool('spend_luck', {});
  await t.commit();
  let s = (await Turn.open(id)).state;

  if (luckAntes >= 10) {
    check('la herramienta acepta', r1.ok, r1.message);
    check('la Suerte bajó 10', invDe(s).derived.luck === luckAntes - 10,
      `${luckAntes} → ${invDe(s).derived.luck}`);
    check('queda 1 dado de bonificación pendiente', invDe(s).pendingLuckBonus === 1,
      String(invDe(s).pendingLuckBonus));
  } else {
    check('sin 10 de Suerte, la rechaza', !r1.ok, r1.message);
  }

  console.log('\n2. EL DADO SE APLICA A LA PRÓXIMA TIRADA, Y SE CONSUME');
  if (invDe(s).pendingLuckBonus > 0) {
    const antesDeRolls = s.rolls.length;
    t = await Turn.open(id);
    const r2 = t.executeTool('request_roll', {
      skill: 'DEX', difficulty: 'regular', reason: 'prueba',
      stakes_success: 'ok', stakes_failure: 'no',
    });
    await t.commit();
    s = (await Turn.open(id)).state;
    check('la tirada se ejecutó', r2.ok, r2.message);
    const tirada = s.rolls[antesDeRolls];
    check('hay una tirada nueva', Boolean(tirada));
    check('sus modificadores incluyen el dado comprado con Suerte',
      Boolean(tirada?.commitment.modifiers.some((m) => m.reason === 'dado comprado con Suerte')),
      JSON.stringify(tirada?.commitment.modifiers));
    check('el dado pendiente se consumió: vuelve a 0', invDe(s).pendingLuckBonus === 0,
      String(invDe(s).pendingLuckBonus));

    console.log('\n   Una segunda tirada, sin haber gastado Suerte de nuevo, NO trae el modificador');
    const antesDeRolls2 = s.rolls.length;
    t = await Turn.open(id);
    const r3 = t.executeTool('request_roll', {
      skill: 'INT', difficulty: 'regular', reason: 'prueba dos',
      stakes_success: 'ok', stakes_failure: 'no',
    });
    await t.commit();
    s = (await Turn.open(id)).state;
    const tirada2 = s.rolls[antesDeRolls2];
    check('sin el modificador de Suerte',
      !tirada2?.commitment.modifiers.some((m) => m.reason === 'dado comprado con Suerte'));
  } else {
    console.log('   (se saltea: la investigadora arrancó sin Suerte suficiente para la parte 1)');
  }

  console.log('\n3. RECHAZA SIN SUERTE SUFICIENTE, Y PASADO EL TOPE');
  // Gasta de a un dado hasta topar con uno de los dos límites —Suerte
  // insuficiente o el tope de 2 dados pendientes—, sin asumir cuánta Suerte
  // le tocó a la investigadora en la creación.
  let ultimoEstado = (await Turn.open(id)).state;
  let guardas = 0;
  while (invDe(ultimoEstado).derived.luck >= 10 && invDe(ultimoEstado).pendingLuckBonus < 2 && guardas < 5) {
    const tt = await Turn.open(id);
    tt.executeTool('spend_luck', {});
    await tt.commit();
    ultimoEstado = (await Turn.open(id)).state;
    guardas++;
  }
  const invTope = invDe(ultimoEstado);
  if (invTope.pendingLuckBonus >= 2) {
    const tt = await Turn.open(id);
    const rTope = tt.executeTool('spend_luck', {});
    check('rechaza pasado el tope de 2 dados pendientes', !rTope.ok, rTope.message);
  } else {
    const tt = await Turn.open(id);
    const rSinSuerte = tt.executeTool('spend_luck', {});
    check('rechaza sin Suerte suficiente', !rSinSuerte.ok, rSinSuerte.message);
  }

  console.log('\n4. EL BOTÓN SÓLO APARECE CUANDO CORRESPONDE');
  const finalState = (await Turn.open(id)).state;
  const opciones = accionesDisponibles(finalState, AGUA_QUIETA);
  const hayBoton = opciones.some((o) => o.id === 'suerte:gastar');
  const invFinal = invDe(finalState);
  const deberiaAparecer = invFinal.derived.luck >= 10 && invFinal.pendingLuckBonus < 2;
  check('el botón coincide con la condición de disponibilidad',
    hayBoton === deberiaAparecer,
    `botón=${hayBoton} suerte=${invFinal.derived.luck} pendientes=${invFinal.pendingLuckBonus}`);

  console.log('\n5. EL CLASIFICADOR RECONOCE LA FRASE DEL BOTÓN');
  check('«Apelo a mi suerte» clasifica como verbo «suerte»',
    classify(finalState, 'Apelo a mi suerte').verb === 'suerte');

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
