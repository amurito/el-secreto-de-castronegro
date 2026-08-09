/**
 * PRUEBA DE OPCIONES — `npm run prueba:opciones`
 *
 * Verifica las dos quejas concretas que motivaron el catálogo de acciones:
 *
 *   1. Las opciones seguían ofreciendo cosas ya hechas.
 *   2. El juego se sentía estático: la lista casi no cambiaba.
 *
 * Juega una partida eligiendo siempre la primera opción no probada, como haría
 * una persona, y comprueba que la oferta cambia, que nada se repite después de
 * hecho, y que hay desbloqueos reales.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles, ACCIONES } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

async function main() {
  const id = await createCampaign(AGUA_QUIETA, 'PRUEBA OPCIONES', 'c'.repeat(64));

  let t = await Turn.open(id);
  const inicial = accionesDisponibles(t.state, AGUA_QUIETA.conversations);
  console.log(`\nAl empezar: ${inicial.length} acciones`);
  for (const o of inicial) console.log(`   · [${o.grupo}] ${o.etiqueta}`);

  // ── Juega eligiendo siempre algo que no probó antes ────────────────────────
  const elegidas: string[] = [];
  const desbloqueos: Array<{ turno: number; etiqueta: string }> = [];
  let ofrecidasAntes = new Set(inicial.map((o) => o.id));
  let repetidaYaHecha = 0;
  const historialTamanos: number[] = [inicial.length];

  for (let turno = 1; turno <= 30; turno++) {
    t = await Turn.open(id);
    const disponibles = accionesDisponibles(t.state, AGUA_QUIETA.conversations);
    if (disponibles.length === 0) break;

    // LA INVARIANTE: nunca ofrecer algo cuya condición de "hecha" ya se cumple.
    //
    // Volver a ofrecer una acción elegida NO es un error en sí: si la tirada
    // falló, reintentar es correcto y es lo que haría cualquiera en la mesa.
    // El error es ofrecer algo que YA DIO su resultado.
    for (const o of disponibles) {
      const def = ACCIONES.find((a) => a.id === o.id);
      if (def?.hecha?.(t.state)) {
        repetidaYaHecha++;
        console.log(`   ⚠ turno ${turno}: ofrece "${o.etiqueta}" con su condición de hecha cumplida`);
      }
    }

    const siguiente = disponibles.find((o) => !elegidas.includes(o.id)) ?? disponibles[0]!;
    elegidas.push(siguiente.id);

    t.submitIntent(siguiente.intencion, 'p1');
    const r = await runOfflineTurn(t, AGUA_QUIETA, siguiente.intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();

    const ahora = new Set(r.options.map((o) => o.id));
    for (const o of r.options) {
      if (!ofrecidasAntes.has(o.id)) desbloqueos.push({ turno, etiqueta: o.etiqueta });
    }
    ofrecidasAntes = new Set([...ofrecidasAntes, ...ahora]);
    historialTamanos.push(r.options.length);

    if (t.state.ending) break;
  }

  const fin = await Turn.open(id);

  console.log(`\n${elegidas.length} turnos jugados\n`);
  console.log('DESBLOQUEOS (acciones que no existían al empezar):');
  for (const d of desbloqueos.slice(0, 14)) console.log(`   turno ${String(d.turno).padStart(2)} → ${d.etiqueta}`);
  if (desbloqueos.length > 14) console.log(`   … y ${desbloqueos.length - 14} más`);

  // Ninguna acción del catálogo debería seguir ofreciéndose muchos turnos
  // seguidos sin dar resultado: eso es exactamente la sensación de estancado.
  const conteo = new Map<string, number>();
  for (const id of elegidas) conteo.set(id, (conteo.get(id) ?? 0) + 1);
  const insistidas = [...conteo.entries()].filter(([, n]) => n >= 4);

  console.log('\nRESULTADOS');
  check('nunca ofrece algo cuya condición de hecha ya se cumple', repetidaYaHecha === 0, `${repetidaYaHecha} casos`);
  check('ninguna acción se elige 4+ veces sin resolverse', insistidas.length === 0,
    insistidas.map(([id, n]) => `${id}×${n}`).join(', ') || 'ninguna');
  check('hay desbloqueos reales', desbloqueos.length >= 8, `${desbloqueos.length} acciones nuevas`);
  check('la oferta cambia turno a turno', new Set(historialTamanos).size >= 4,
    `tamaños: ${historialTamanos.join(', ')}`);
  check('nunca se queda sin nada que hacer', historialTamanos.every((n) => n > 0 || fin.state.ending));
  check('la investigación avanza', fin.state.board.clues.length >= 8,
    `${fin.state.board.clues.length} pistas`);
  check('se llegó a un desenlace o quedan opciones', Boolean(fin.state.ending) || elegidas.length >= 25,
    fin.state.ending ? `final: ${fin.state.ending.title}` : `${elegidas.length} turnos`);

  console.log(`\nExposición ${fin.investigator.umbral.exposure} · Estabilidad ${fin.investigator.umbral.stability}`);
  console.log(`Umbrales: ${fin.investigator.umbral.thresholdsCrossed.join(', ') || 'ninguno'}`);
  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
