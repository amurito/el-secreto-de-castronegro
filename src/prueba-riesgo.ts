/**
 * PRUEBA DE LA VISTA PREVIA DE RIESGO — `npm run prueba:riesgo`
 *
 * Reportado por el usuario jugando: `stakes_success`/`stakes_failure`
 * existen en el motor desde hace varias sesiones, pero la interfaz sólo se
 * enteraba de ellos DESPUÉS de tirar. `keeper/riesgo.ts` los adelanta a
 * ANTES del click, usando la MISMA clasificación que la resolución real.
 *
 * Lo que esta suite protege, específicamente:
 *
 *   1. Un tema de conversación con `prueba` llega con `riesgo` (skill,
 *      difficulty, razón) sin necesidad de clasificar nada.
 *   2. Una acción del catálogo cuya intención dispara una escena con
 *      `prueba` llega con `riesgo` (skill, difficulty, las dos apuestas).
 *   3. Una acción sin tirada —moverse, agarrar un objeto— NO lleva `riesgo`.
 *   4. LA GARANTÍA DE VERDAD: lo que la vista previa promete es EXACTAMENTE
 *      lo que la resolución real entrega —mismo skill, misma dificultad—,
 *      porque las dos pasan por `escenaPara`/`classify`. No hay una copia
 *      paralela que se pueda desincronizar.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { EL_CIRCULO_ROJO } from './scenario/circulorojo.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { previsualizarRiesgos } from './keeper/riesgo.ts';
import { runOfflineTurn } from './keeper/offline.ts';
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
  const id = await createCampaign(EL_CIRCULO_ROJO, 'RIESGO', 'r'.repeat(64));
  let t = await Turn.open(id);

  console.log('\nUN TEMA CON PRUEBA LLEGA CON SU RIESGO, SIN CLASIFICAR NADA');
  {
    // g-probo pide una pista/actitud que todavía no se da al arrancar —no
    // hace falta llegar hasta ahí: previsualizarRiesgos() sólo necesita el
    // id y la intención, no que la opción esté realmente ofrecida ahora.
    const opcionSintetica = {
      id: 'tema:g-probo', etiqueta: '', grupo: 'hablar' as const,
      intencion: 'Le pregunto a don Gaspar si ya se puso el aro',
    };
    const [tema] = previsualizarRiesgos(EL_CIRCULO_ROJO, t.state, [opcionSintetica]);
    check('trae riesgo con la habilidad correcta', tema?.riesgo?.skill === 'psicologia', tema?.riesgo?.skill);
    check('con la dificultad correcta', tema?.riesgo?.difficulty === 'hard', tema?.riesgo?.difficulty);
    check('con su razón, no un par de apuestas —los temas no tienen stakes_failure—',
      tema?.riesgo?.razon?.includes('leerle la cara') === true
        && tema?.riesgo?.stakesSuccess === undefined,
      JSON.stringify(tema?.riesgo));
  }

  console.log('\nUNA ACCIÓN DEL CATÁLOGO CON ESCENA-CON-PRUEBA LLEGA CON RIESGO');
  {
    // «Leer la instrucción vieja» está visible desde el arranque, en el puesto.
    const opciones = previsualizarRiesgos(
      EL_CIRCULO_ROJO, t.state, accionesDisponibles(t.state, EL_CIRCULO_ROJO),
    );
    const accion = opciones.find((o) => o.id === 'leer-instruccion');
    check('la acción está entre las del arranque', accion !== undefined,
      opciones.map((o) => o.id).join(', '));
    check('trae riesgo con la habilidad de la escena', accion?.riesgo?.skill === 'biblioteca', accion?.riesgo?.skill);
    check('con la dificultad de la escena', accion?.riesgo?.difficulty === 'regular', accion?.riesgo?.difficulty);
    check('con las dos apuestas, no una razón sola —es escena, no tema—',
      typeof accion?.riesgo?.stakesSuccess === 'string' && typeof accion?.riesgo?.stakesFailure === 'string'
        && accion?.riesgo?.razon === undefined,
      JSON.stringify(accion?.riesgo));
  }

  console.log('\nUNA ACCIÓN SIN TIRADA NO LLEVA RIESGO');
  {
    const opciones = previsualizarRiesgos(
      EL_CIRCULO_ROJO, t.state, accionesDisponibles(t.state, EL_CIRCULO_ROJO),
    );
    const ir = opciones.find((o) => o.id === 'ir:orilla');
    check('la salida hacia la orilla está entre las opciones', ir !== undefined,
      opciones.filter((o) => o.grupo === 'mover').map((o) => o.id).join(', '));
    check('y no lleva riesgo: moverse no tira nada', ir?.riesgo === undefined, JSON.stringify(ir?.riesgo));
  }

  console.log('\nLA GARANTÍA: LO QUE PROMETE LA VISTA PREVIA ES LO QUE ENTREGA LA TIRADA REAL');
  {
    const opciones = previsualizarRiesgos(
      EL_CIRCULO_ROJO, t.state, accionesDisponibles(t.state, EL_CIRCULO_ROJO),
    );
    const accion = opciones.find((o) => o.id === 'leer-instruccion')!;
    check('la vista previa existe antes de tirar', accion.riesgo !== undefined);

    t.submitIntent(accion.intencion, 'p1');
    const r = await runOfflineTurn(t, EL_CIRCULO_ROJO, accion.intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
    t = await Turn.open(id);

    const tirada = t.state.rolls.at(-1);
    check('la tirada real existe', tirada !== undefined);
    check('con la MISMA habilidad que prometió la vista previa',
      tirada?.commitment.skill === accion.riesgo?.skill,
      `previó ${accion.riesgo?.skill}, tiró ${tirada?.commitment.skill}`);
    check('con la MISMA dificultad que prometió la vista previa',
      tirada?.commitment.difficulty === accion.riesgo?.difficulty,
      `previó ${accion.riesgo?.difficulty}, tiró ${tirada?.commitment.difficulty}`);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
