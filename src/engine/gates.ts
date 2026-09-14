/**
 * GATES — las condiciones que el MOTOR verifica.
 *
 * Acá vive la diferencia entre "le pedimos al modelo que no revele el secreto"
 * y "el modelo no puede revelar el secreto". Cuando el Keeper propone descubrir
 * una propiedad oculta o promover una hipótesis a hecho, esta capa decide.
 * Si la condición no se cumple, la propuesta se rechaza y el rechazo queda en
 * el log (KEEPER_PROPOSAL_REJECTED).
 */

import type {
  GameState, Item, ItemProperty, DiscoveryCondition,
  Hypothesis, InvestigatorId, PropertyId, ItemId,
} from '../shared/types.ts';
import { PROMOTION_RULE } from '../shared/types.ts';

export interface GateResult {
  allowed: boolean;
  reason: string;
}

/**
 * ¿Se puede descubrir esta propiedad oculta AHORA?
 * `context` describe cómo llegó el investigador hasta acá en este turno.
 */
export function canDiscoverProperty(
  state: GameState,
  itemId: ItemId,
  propertyId: PropertyId,
  investigatorId: InvestigatorId,
  context: {
    /** Grado alcanzado en la tirada de este turno, si hubo. */
    rollSucceeded?: boolean;
    rollSkill?: string;
    /** Objetos que el investigador comparó explícitamente este turno. */
    comparedWith?: ItemId[];
  },
): GateResult {
  const item = state.items[itemId];
  if (!item) return { allowed: false, reason: `El objeto ${itemId} no existe.` };

  if (item.discoveredProperties.some((d) => d.propertyId === propertyId)) {
    return { allowed: false, reason: 'Esa propiedad ya fue descubierta.' };
  }

  const prop = findProperty(item, propertyId);
  if (!prop) return { allowed: false, reason: `La propiedad ${propertyId} no existe en ${item.name}.` };

  if (prop.disclosure === 'SEALED') {
    return { allowed: false, reason: 'Propiedad sellada: no puede revelarse en esta etapa de la campaña.' };
  }

  const cond = prop.discoveryCondition;
  if (!cond) return { allowed: true, reason: 'Sin condición: descubrible por inspección.' };

  const inv = state.investigators[investigatorId];
  if (!inv) return { allowed: false, reason: 'Investigador inexistente.' };

  // No se puede descubrir nada de un objeto que no está al alcance.
  if (!isReachable(state, item, investigatorId)) {
    return { allowed: false, reason: `«${item.name}» no está al alcance del investigador.` };
  }

  switch (cond.kind) {
    case 'never':
      return { allowed: false, reason: 'Propiedad no descubrible por diseño del escenario.' };

    case 'skill_check': {
      if (!context.rollSucceeded) {
        return {
          allowed: false,
          reason: `Requiere una tirada exitosa de ${cond.skill} (${cond.difficulty}) en este turno. No la hubo o falló.`,
        };
      }
      if (context.rollSkill && context.rollSkill !== cond.skill) {
        return {
          allowed: false,
          reason: `La tirada exitosa fue de ${context.rollSkill}, pero esta propiedad requiere ${cond.skill}.`,
        };
      }
      return { allowed: true, reason: `Tirada de ${cond.skill} superada.` };
    }

    case 'comparison': {
      const compared = context.comparedWith ?? [];
      if (!compared.includes(cond.withItem)) {
        const other = state.items[cond.withItem];
        return {
          allowed: false,
          reason: `Requiere comparar explícitamente con «${other?.name ?? cond.withItem}». No ocurrió en este turno.`,
        };
      }
      const other = state.items[cond.withItem];
      if (!other || !isReachable(state, other, investigatorId)) {
        return { allowed: false, reason: 'El objeto de comparación no está al alcance.' };
      }
      return { allowed: true, reason: 'Comparación realizada.' };
    }

    case 'usage':
      return item.usageCount >= cond.times
        ? { allowed: true, reason: `Usado ${item.usageCount} veces.` }
        : { allowed: false, reason: `Requiere ${cond.times} usos; lleva ${item.usageCount}.` };

    case 'umbral_exposure':
      return inv.umbral.exposure >= cond.min
        ? { allowed: true, reason: `Exposición ${inv.umbral.exposure} ≥ ${cond.min}.` }
        : { allowed: false, reason: `Requiere exposición ≥ ${cond.min}; el investigador tiene ${inv.umbral.exposure}.` };

    case 'location':
      return state.world.currentLocation === cond.at
        ? { allowed: true, reason: 'En la localización requerida.' }
        : { allowed: false, reason: `Sólo descubrible en ${cond.at}.` };

    case 'world_time':
      return state.world.time.iso >= cond.after
        ? { allowed: true, reason: 'Momento alcanzado.' }
        : { allowed: false, reason: `Sólo descubrible después de ${cond.after}.` };
  }
}

function findProperty(item: Item, propertyId: PropertyId): ItemProperty | null {
  return (
    item.hiddenProperties.find((p) => p.id === propertyId) ??
    item.conditionalProperties.find((p) => p.id === propertyId) ??
    item.temporalProperties.find((p) => p.id === propertyId) ??
    item.publicProperties.find((p) => p.id === propertyId) ??
    null
  );
}

/**
 * ¿Está este objeto al alcance del investigador, a los fines de mirarlo con
 * atención? No es lo mismo que poder LLEVÁRSELO: el legajo que Fray Ignacio
 * tiene desplegado sobre la mesa, o la libreta que Adelmo lee en voz alta
 * sin soltarla, se pueden estudiar sin que cambien de dueño.
 *
 * El tercer caso —un objeto cuyo dueño es un NPC que está acá— faltaba, y
 * su ausencia era un bug de verdad: `descubre` (`EfectoEscena`) rebotaba
 * contra este gate y el rechazo terminaba NARRADO AL JUGADOR, con el texto
 * que se le escribía al Keeper-LLM que ya no existe («No reveles esta
 * propiedad. Narrá lo que el investigador SÍ puede percibir»). Reportado
 * jugando *La Merced de las Ánimas*: el manuscrito de Fray Ignacio, que él
 * tiene desplegado sobre la mesa del scriptorium, no se podía estudiar.
 *
 * Sin esto, además, el trato era incoherente: una propiedad SIN
 * `discoveryCondition` en manos de un NPC sí se descubría —ese caso sale
 * antes, por el `if (!cond)` de arriba, sin pasar por acá— y una CON
 * condición no. Es la diferencia entre `it-libreta` de *El Orden Debido*
 * (sin condición, siempre funcionó) y `it-manuscrito-1674` (con tirada de
 * Ocultismo, nunca funcionó). Ahora las dos se rigen por lo mismo.
 *
 * `prueba-auditoria.ts` no caza esta familia de bug porque mira lo que la
 * escena DECLARA entregar, no si el tool lo permite en tiempo real.
 */
function isReachable(state: GameState, item: Item, investigatorId: InvestigatorId): boolean {
  if (item.owner === investigatorId) return true;
  if (item.owner === state.world.currentLocation) return true;
  const dueno = item.owner ? state.npcs[item.owner] : undefined;
  if (dueno?.present && dueno.status !== 'dead') {
    const aqui = state.world.locations[state.world.currentLocation];
    if (aqui?.npcsPresent.includes(dueno.id)) return true;
  }
  return false;
}

/**
 * ¿Se puede promover esta hipótesis a hecho?
 * v0.9 §9 y v1.0 §9 prohíben la conversión automática. Ninguno define la
 * condición — la matriz de v0.8 §13 (pista física + documental + testimonial)
 * es la base de esta regla. Análisis Técnico v1.1 §2.3 K.
 */
export function canPromoteHypothesis(state: GameState, hypothesis: Hypothesis): GateResult {
  if (hypothesis.status !== 'open') {
    return { allowed: false, reason: `La hipótesis ya está ${hypothesis.status}.` };
  }

  const supporting = state.board.clues.filter((c) => hypothesis.supportingClues.includes(c.id));
  const contradicting = state.board.clues.filter((c) => hypothesis.contradictingClues.includes(c.id));

  if (contradicting.length > PROMOTION_RULE.maxContradictingClues) {
    return {
      allowed: false,
      reason: `Hay ${contradicting.length} pista(s) que la contradicen. Una hipótesis contradicha no se promueve: se registra la contradicción.`,
    };
  }

  if (supporting.length < PROMOTION_RULE.minSupportingClues) {
    return {
      allowed: false,
      reason: `Requiere ${PROMOTION_RULE.minSupportingClues} pistas de apoyo; tiene ${supporting.length}.`,
    };
  }

  const kinds = new Set(supporting.map((c) => c.kind));
  if (kinds.size < PROMOTION_RULE.minDistinctKinds) {
    return {
      allowed: false,
      reason: `Requiere pistas de al menos ${PROMOTION_RULE.minDistinctKinds} tipos distintos (física / documental / testimonial / experiencial); todas son del mismo tipo.`,
    };
  }

  if (PROMOTION_RULE.requiresReliableSource && !supporting.some((c) => c.reliability === 'reliable')) {
    return {
      allowed: false,
      reason: 'Ninguna de las pistas de apoyo proviene de una fuente fiable.',
    };
  }

  return { allowed: true, reason: 'Evidencia suficiente y sin contradicciones.' };
}

/**
 * Filtra el estado para el contexto del Keeper.
 * Lo que no está acá no puede filtrarse: no hay superficie de ataque.
 * Análisis Técnico v1.1 §7.1.
 */
export function visibleToKeeper<T extends { disclosure?: string }>(items: T[]): T[] {
  return items.filter((i) => i.disclosure !== 'SEALED');
}
