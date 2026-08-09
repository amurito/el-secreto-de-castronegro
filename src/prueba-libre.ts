/**
 * PRUEBA DE ACCIÓN LIBRE — `npm run prueba:libre`
 *
 * Dispara 40 acciones escritas como las escribiría una persona y verifica:
 *
 *   1. NINGUNA se queda sin respuesta útil.
 *   2. NINGUNA respuesta se repite palabra por palabra.
 *
 * Es la prueba de que el modo gratuito es jugable de verdad.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;

const ACCIONES = [
  'Me acerco al agua y miro el reflejo durante un minuto.',
  'seguí entonces',
  'Miro el brocal de cerca',
  'Examino la roldana',
  'Miro la tierra alrededor del aljibe',
  'Escucho con atención',
  'Huelo el aire',
  'Toco el agua',
  'Miro los álamos',
  'Grito el nombre de Ignacio hacia el aljibe',
  'Le pregunto a Rosa por la soga',
  'Le pregunto qué vio ella esa noche',
  'Le pregunto por el hermano de Ignacio',
  'Entro a la casa',
  'Miro el sombrero colgado',
  'Examino el reloj de pared',
  'Miro la mesa',
  'Le pregunto a Rosa por la fotografía vieja',
  'Voy al cuarto de Ignacio',
  'Leo el cuaderno',
  'Reviso el cuaderno hoja por hoja',
  'Miro debajo del colchón',
  'Examino la ventana',
  'Reviso el cajón',
  'Examino la fotografía dada vuelta',
  'Comparo las dos fotografías',
  'Anoto todo lo que tengo',
  'Pienso en lo que sé hasta ahora',
  'Agarro el farol',
  'Vuelvo a la cocina',
  'Salgo al patio',
  'Uso el espejo para mirar el aljibe',
  'Cavo al lado del aljibe',
  'Espero un rato largo',
  'Voy a la laguna',
  'Miro el barro de la orilla',
  'Observo los pájaros',
  'Miro la superficie del agua',
  'bailo un malambo arriba del brocal',
  'Vuelvo al patio',
];

async function main() {
  const id = await createCampaign(AGUA_QUIETA, 'PRUEBA LIBRE', 'b'.repeat(64));
  const vistos = new Map<string, string>();
  let sinRespuesta = 0;
  let repetidas = 0;

  for (const accion of ACCIONES) {
    const t = await Turn.open(id);
    t.submitIntent(accion, 'p1');
    const r = await runOfflineTurn(t, AGUA_QUIETA, accion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();

    const n = r.narration.trim();
    const corta = n.length < 40;
    const meta = /MODO MOTOR|no entiendo|no reconozco/i.test(n);
    const prev = vistos.get(n);

    let marca = '  ';
    if (corta || meta) { marca = '✗ '; sinRespuesta++; }
    else if (prev) { marca = '≡ '; repetidas++; }
    vistos.set(n, accion);

    console.log(`${marca}“${accion}”`);
    console.log(`   → ${n.replace(/\n+/g, ' ').slice(0, 118)}${n.length > 118 ? '…' : ''}`);
    if (prev) console.log(`   ⚠ idéntica a la respuesta de “${prev}”`);
  }

  const t = await Turn.open(id);
  console.log('\n─────────────────────────────────────────────');
  console.log(`Acciones probadas:        ${ACCIONES.length}`);
  console.log(`Sin respuesta útil:       ${sinRespuesta}`);
  console.log(`Respuestas repetidas:     ${repetidas}`);
  console.log(`Pistas descubiertas:      ${t.state.board.clues.length}`);
  console.log(`Contradicciones:          ${t.state.board.contradictions.length}`);
  console.log(`Preguntas abiertas:       ${t.state.board.questions.length}`);
  console.log(`Tiradas ejecutadas:       ${t.state.rolls.length}`);
  console.log(`Exposición / Estabilidad: ${t.investigator.umbral.exposure} / ${t.investigator.umbral.stability}`);
  console.log(`Umbrales cruzados:        ${t.investigator.umbral.thresholdsCrossed.join(', ') || 'ninguno'}`);

  if (sinRespuesta > 0) { console.log(`\n✗ ${sinRespuesta} acciones sin respuesta útil`); fallos++; }
  if (repetidas > 2) { console.log(`\n✗ ${repetidas} respuestas repetidas (tolerancia: 2)`); fallos++; }
  if (t.state.board.clues.length < 12) { console.log(`\n✗ pocas pistas: ${t.state.board.clues.length}`); fallos++; }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
