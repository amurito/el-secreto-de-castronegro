/**
 * VISTA PREVIA DE RIESGO — qué tirada dispara cada opción, ANTES de tirarla.
 *
 * Reportado por el usuario jugando: `stakes_success`/`stakes_failure`
 * (`PruebaEscena`, `escena.ts`) y `EfectoTema.prueba` existen desde hace
 * varias sesiones, pero la interfaz sólo se enteraba de ellos DESPUÉS de
 * tirar —en el resultado—, nunca antes, cuando todavía se puede decidir no
 * arriesgar.
 *
 * La garantía de este archivo: la vista previa NUNCA puede prometer algo
 * distinto de lo que la resolución real entrega, porque usa exactamente la
 * misma clasificación (`classify`/`leerIntencion`/`escenaPara`) que
 * `runOfflineTurn` usa para resolver de verdad. Si el día de mañana esa
 * clasificación cambia, la vista previa cambia con ella sola — no hay una
 * copia paralela que se pueda desincronizar.
 */

import type { GameState } from '../shared/types.ts';
import type { Scenario } from '../scenario/types.ts';
import type { Opcion, RiesgoTirada } from '../scenario/acciones.ts';
import { classify } from './intent.ts';
import { escenaPara, leerIntencion } from './escenas.ts';

const PREFIJO_TEMA = 'tema:';

export function previsualizarRiesgos(scenario: Scenario, s: GameState, opciones: Opcion[]): Opcion[] {
  return opciones.map((o) => {
    const riesgo = riesgoDe(scenario, s, o);
    return riesgo ? { ...o, riesgo } : o;
  });
}

function riesgoDe(scenario: Scenario, s: GameState, o: Opcion): RiesgoTirada | undefined {
  // Temas de conversación: la resistencia ya está en el dato del tema —
  // `EfectoTema.prueba`, un objeto, no una función—, así que no hace falta
  // clasificar nada para leerla.
  if (o.id.startsWith(PREFIJO_TEMA)) {
    const temaId = o.id.slice(PREFIJO_TEMA.length);
    const tema = scenario.conversations.find((t) => t.id === temaId);
    if (!tema?.prueba) return undefined;
    return { skill: tema.prueba.skill, difficulty: tema.prueba.difficulty, razon: tema.prueba.razon };
  }

  // Todo lo demás —acciones del catálogo, mirar un detalle, etc.— viaja por
  // el mismo camino que la resolución real: clasificar el texto tal como lo
  // dispararía el click, encontrar la escena que responde ACÁ y AHORA, y
  // preguntarle su `prueba`. Sin escena que responda, o sin `prueba`
  // declarada, no hay nada que previsualizar — es exactamente lo que pasaría
  // al hacer click.
  const intent = classify(s, o.intencion);
  const leida = leerIntencion(intent);
  const escena = escenaPara(scenario.scenes, s, leida);
  const prueba = escena?.prueba?.(s, leida);
  if (!prueba) return undefined;
  return {
    skill: prueba.skill,
    difficulty: prueba.difficulty,
    stakesSuccess: prueba.stakes_success,
    stakesFailure: prueba.stakes_failure,
  };
}
