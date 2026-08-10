/**
 * CUÁNDO SE TIRA UN DADO.
 *
 * Este archivo existe porque la línea estaba puesta por accidente. Medido
 * sobre las dos aventuras, 57 acciones ofrecidas: 27 tiraban y 30 no, y entre
 * las que no tiraban estaban los dos descubrimientos centrales de Agua Quieta
 * —el reloj sobre el agua y el espejo—, que se conseguían con sólo estar
 * parado en el lugar correcto. Mientras tanto, examinar una fotografía pedía
 * Descubrir. Nadie decidió eso: quedó así.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL CRITERIO
 *
 * Se tira cuando se cumplen LAS DOS:
 *
 *   1. El resultado es incierto. Si no puede fallar, no hay nada que resolver.
 *   2. **Fallar es interesante.** Si el fracaso sólo produce «no pasa nada»,
 *      el dado es ruido: hace más lenta la partida y no agrega tensión.
 *
 * La segunda es la que se olvida. Un fracaso que no deja nada no es un
 * fracaso, es una demora.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE **NO** SE TIRA, Y POR QUÉ
 *
 *   Agarrar un objeto que está ahí ....... no puede fallar
 *   Caminar a una habitación contigua .... no puede fallar
 *   Esperar .............................. no puede fallar
 *   Anotar lo que uno vio ................ no puede fallar
 *   Repasar el propio tablero ............ NUNCA se le niega al jugador el
 *                                          acceso a lo que ya descubrió
 *   Medir con una rueda de agrimensor .... una rueda cuenta vueltas; el
 *                                          horror es que dé dos números, no
 *                                          que uno mida mal
 *   Preguntar algo que cualquiera contesta ... no hay resistencia que vencer
 *   Gritar y no recibir eco .............. la ausencia de eco es inequívoca
 *
 * LO QUE SÍ
 *
 *   Notar un detalle que no salta a la vista ....... Descubrir
 *   Sostener la mirada sobre algo que devuelve ..... POD
 *   Que alguien cuente lo que preferiría callar .... Psicología o Persuasión
 *   Encontrar un papel entre doscientos ............ Investigar
 *   Establecer causa y tiempo de muerte ............ Medicina
 *   Descolgarse por un brocal sin soga ............. Trepar
 */

import type { Item, ItemProperty } from '../shared/types.ts';

/**
 * La propiedad oculta de este objeto que se destraba con una tirada, si la hay.
 *
 * Sirve para que examinar un objeto CON algo que ver pida el dado que
 * corresponde, en vez de dejar la propiedad declarada y sin camino — que es la
 * familia de bug que este proyecto ya encontró cinco veces.
 */
export function propiedadPorTirada(item: Item): ItemProperty | null {
  const yaVistas = new Set(item.discoveredProperties.map((d) => d.propertyId));
  for (const p of item.hiddenProperties) {
    if (yaVistas.has(p.id)) continue;
    if (p.discoveryCondition?.kind === 'skill_check') return p;
  }
  return null;
}

/** ¿Le queda algo por revelar a este objeto? */
export const tieneAlgoMas = (item: Item): boolean => {
  const yaVistas = new Set(item.discoveredProperties.map((d) => d.propertyId));
  return [...item.hiddenProperties, ...item.conditionalProperties]
    .some((p) => !yaVistas.has(p.id));
};
