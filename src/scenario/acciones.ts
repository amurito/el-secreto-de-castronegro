/**
 * ACCIONES — el contrato, y la resolución genérica.
 *
 * Lo que el jugador puede hacer AHORA. Tres reglas:
 *
 *   1. Una acción ya hecha NO se vuelve a ofrecer. Si mirar el brocal ya
 *      reveló lo que tenía, desaparece de la lista.
 *   2. Las acciones se DESBLOQUEAN según el estado.
 *   3. Las que se pueden repetir cambian de etiqueta, para que insistir se
 *      sienta como insistir y no como no haber hecho nada.
 *
 * El CATÁLOGO no está acá: lo trae cada aventura. Estuvo acá hasta que hubo una
 * segunda aventura y quedó claro el problema — heredaba los botones de la
 * primera, y arrancaba ofreciendo asomarse a un aljibe que no existía en su mapa.
 *
 * El catálogo describe QUÉ se ofrece; `intencion` es el texto que consume el
 * resolvedor. Así la interfaz y el motor siguen desacoplados: el mismo
 * resolvedor atiende una opción y una frase escrita a mano.
 */

import type { GameState, LocationId, LocationFeature } from '../shared/types.ts';
import type { Scenario } from './types.ts';

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/**
 * «Voy a el patio» → «Voy al patio».
 *
 * Los nombres de las localizaciones llevan artículo, así que pegarles una
 * preposición delante produce castellano roto. En un juego cuya prosa es el
 * punto, eso se lee peor que un bug.
 */
const conA = (nombre: string) => {
  const n = nombre.toLowerCase();
  if (n.startsWith('el ')) return `al ${n.slice(3)}`;
  return `a ${n}`;
};

const narrado = (s: GameState, fragmento: string) =>
  s.narrative.some((n) => n.kind === 'keeper' && n.text.includes(fragmento));

/** Un detalle está examinado si su texto de detalle ya se narró. */
export function detalleExaminado(s: GameState, f: LocationFeature): boolean {
  return narrado(s, (f.closerLook ?? f.description).slice(0, 45));
}

export type GrupoAccion = 'observar' | 'hablar' | 'usar' | 'mover' | 'decidir';

export const ETIQUETA_GRUPO: Record<GrupoAccion, string> = {
  observar: 'Mirar',
  hablar: 'Hablar',
  usar: 'Hacer',
  mover: 'Ir',
  decidir: 'Decidir',
};

export interface AccionDef {
  id: string;
  /** Lo que ve el jugador. Puede cambiar según el estado. */
  etiqueta: string | ((s: GameState) => string);
  /** Lo que recibe el resolvedor. */
  intencion: string;
  grupo: GrupoAccion;
  /** Dónde se ofrece. Sin esto, en cualquier lado. */
  lugar?: LocationId | LocationId[];
  /** Condición de desbloqueo. Sin esto, visible desde el principio. */
  visible?: (s: GameState) => boolean;
  /** Ya realizada: deja de ofrecerse. Sin esto, se puede repetir siempre. */
  hecha?: (s: GameState) => boolean;
  /**
   * Cierra la aventura. La interfaz las separa y pide confirmación: elegir un
   * desenlace sin saber que lo era es la peor sorpresa que puede dar un juego
   * sin rebobinado.
   */
  final?: true;
  orden?: number;
}

/** Lo que viaja a la interfaz. */
export interface Opcion {
  id: string;
  etiqueta: string;
  intencion: string;
  grupo: GrupoAccion;
  final?: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUCIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las acciones disponibles ahora mismo.
 *
 * Además del catálogo, genera tres familias desde el estado — no escritas a
 * mano, así que agregar un detalle o un objeto al escenario alcanza para que
 * aparezcan solas:
 *   · los detalles del lugar que todavía no se miraron
 *   · los objetos del lugar que se pueden levantar
 *   · las salidas
 */
// `conversaciones` es obligatorio a propósito: con un valor por defecto, un
// sitio que se olvidara de pasarlo se quedaría sin botones de hablar y sin
// error. Exigirlo hace que el compilador señale cada lugar que hay que decidir.
// Toma el ESCENARIO entero y no sus partes sueltas: con dos parámetros —temas
// y catálogo— era cuestión de tiempo que alguien pasara uno y olvidara el otro,
// y el resultado habría sido una aventura sin botones de hablar, sin error.
export function accionesDisponibles(s: GameState, escenario: Scenario): Opcion[] {
  const conversaciones = escenario.conversations;
  const catalogo = escenario.actions;
  if (s.ending) return [];
  if (s.investigators[s.activeInvestigator]?.status !== 'alive') return [];

  const aqui = s.world.currentLocation;
  const out: Array<Opcion & { orden: number }> = [];

  // ── Preguntas, desde el catálogo de conversación de la aventura ───────────
  // Sólo de los NPC que están ACÁ y que todavía aguantan que les pregunten.
  // Cuando alguien se queda sin paciencia sus temas desaparecen enteros: es el
  // mismo principio que el resto de las opciones, aplicado a las personas.
  for (const npc of Object.values(s.npcs)) {
    if (npc.status !== 'alive' || !npc.present) continue;
    if (!s.world.locations[aqui]?.npcsPresent.includes(npc.id)) continue;
    if (npc.patience <= 0) continue;
    for (const tema of conversaciones) {
      if (tema.npc !== npc.id) continue;
      if (tema.disponible && !tema.disponible(s)) continue;
      if (tema.agotado?.(s)) continue;
      // Un tema cuyo piso de actitud no se alcanza NO se ofrece. Ofrecerlo lo
      // convertía en una trampa: el botón seguía ahí, la respuesta era siempre
      // «de eso no hablo», y cada intento cobraba paciencia. La lista tiene que
      // ser lo que se puede hacer, no lo que se puede intentar en vano.
      const piso = tema.prueba?.actitudMinima;
      if (piso !== undefined && (npc.attitude[s.activeInvestigator] ?? 0) < piso) continue;
      out.push({
        id: `tema:${tema.id}`,
        // Insistir sobre algo que ya esquivó es otra acción, y se dice.
        etiqueta: npc.dodgedTopics.includes(tema.id)
          ? `Insistirle: ${lowerFirst(tema.etiqueta.replace(/^Preguntarle /, ''))}`
          : tema.etiqueta,
        intencion: tema.intencion,
        grupo: 'hablar',
        orden: 10 + (tema.orden ?? 50) / 10,
      });
    }
  }

  for (const a of catalogo) {
    if (a.lugar) {
      const lugares = Array.isArray(a.lugar) ? a.lugar : [a.lugar];
      if (!lugares.includes(aqui)) continue;
    }
    if (a.visible && !a.visible(s)) continue;
    if (a.hecha?.(s)) continue;
    out.push({
      id: a.id,
      etiqueta: typeof a.etiqueta === 'function' ? a.etiqueta(s) : a.etiqueta,
      intencion: a.intencion,
      grupo: a.grupo,
      ...(a.final ? { final: a.final } : {}),
      orden: a.orden ?? 40,
    });
  }

  const loc = s.world.locations[aqui];

  let n = 0;
  for (const f of loc?.features ?? []) {
    if (detalleExaminado(s, f)) continue;
    out.push({
      id: `ver:${f.id}`,
      etiqueta: `Mirar ${f.names[0]} de cerca`,
      intencion: `Examino ${f.names[0]} de cerca`,
      grupo: 'observar',
      orden: 60 + n++,
    });
  }

  for (const item of Object.values(s.items)) {
    if (item.owner !== aqui) continue;
    out.push({
      id: `tomar:${item.id}`,
      etiqueta: `Llevarte ${item.name.toLowerCase()}`,
      intencion: `Agarro ${item.name.toLowerCase()}`,
      grupo: 'usar',
      orden: 70,
    });
  }

  for (const destino of loc?.connections ?? []) {
    const d = s.world.locations[destino];
    if (!d) continue;
    out.push({
      id: `ir:${destino}`,
      etiqueta: `${d.visited ? 'Volver' : 'Ir'} ${conA(d.name)}`,
      intencion: `Voy ${conA(d.name)}`,
      grupo: 'mover',
      orden: 80,
    });
  }

  out.sort((a, b) => a.orden - b.orden);
  return out.map(({ orden: _o, ...resto }) => resto);
}
