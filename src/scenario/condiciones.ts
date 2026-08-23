/**
 * EL LENGUAJE DE CONDICIONES — «cuándo se dispara esto» como dato, no como código.
 *
 * Las ~50 comprobaciones reales de `cuando`/`visible`/`hecha`/`disponible`/
 * `agotado` de las dos aventuras se repiten en un puñado de formas: qué verbo
 * se usó, a qué apunta, en qué lugar, si hay tal pista o tal documento, si tal
 * propiedad de un objeto ya se descubrió. Antes cada aventura reescribía sus
 * propias `pista()`, `documento()`, `propiedad()`, `aqui()` casi al carácter
 * —duplicadas entre Agua Quieta y La Legua—. Acá quedan una sola vez.
 *
 * `evaluarCondicion` es PURA: no toca el estado, sólo lo lee. Eso es lo que
 * permite que una condición sea JSON en vez de una función: JSON no puede
 * tener efectos secundarios, así que expresar la lógica como árbol de
 * condiciones no pierde la garantía que ya tenía el proyecto —el contenido
 * propone, el motor dispone— la vuelve imposible de romper por accidente.
 *
 * Lo que NO entra acá es la prosa que se arma distinto según el resultado de
 * una tirada (crítico, pifia, descubrimiento secuencial). Eso es lógica de
 * verdad —composición de texto con estado, no una pregunta de sí/no— y se
 * queda en los archivos `*.logica.ts`, como `resolver`.
 */

import type { GameState } from '../shared/types.ts';
import type { IntencionLeida } from './escena.ts';

export type Condicion =
  /** El verbo leído es alguno de éstos. */
  | { op: 'verbo'; es: string[] }
  /** A qué apunta la intención: por tipo, por id, o los dos. */
  | { op: 'objetivo'; kind?: string; id?: string }
  /** Adónde se dirige (independiente del objetivo: "voy a la laguna"). */
  | { op: 'destino'; id: string }
  /** Se pidió de forma sostenida o insistente ("de cerca", "otra vez"). */
  | { op: 'sostenido' }
  /** El texto normalizado de la intención matchea este patrón (regex, sin flags). */
  | { op: 'texto'; patron: string }
  /** El investigador está parado en uno de estos lugares. */
  | { op: 'lugar'; es: string[] }
  /** Hay una pista en el tablero cuya descripción contiene este fragmento. */
  | { op: 'pista'; contiene: string }
  /** Hay al menos esta cantidad de pistas en el tablero. */
  | { op: 'pistas'; minimo: number }
  /** Exposición al Umbral del investigador activo. */
  | { op: 'exposicion'; minimo: number }
  /** Contradicciones en el tablero (la mecánica que estrenó La Legua). */
  | { op: 'contradicciones'; minimo: number }
  /** Este documento ya se obtuvo. */
  | { op: 'documento'; id: string }
  /**
   * Una propiedad de un objeto ya se descubrió. Sin `prop`, cualquiera de sus
   * propiedades ocultas (equivalente a "ya se examinó a fondo").
   */
  | { op: 'propiedad'; item: string; prop?: string }
  /** El objeto lo lleva encima el investigador activo. */
  | { op: 'lleva'; item: string }
  /** El objeto está al alcance: encima, o en el lugar donde está parado. */
  | { op: 'alcanzable'; item: string }
  /** Un detalle examinable de un lugar ya se miró de cerca. */
  | { op: 'detalleVisto'; lugar: string; feature: string }
  /** La hora del mundo (0-23). Cruza medianoche componiendo con `o`. */
  | { op: 'hora'; minimo?: number; maximo?: number }
  /** Un NPC con estadísticas de combate quedó fuera de pelea (PV en 0). */
  | { op: 'npcFuera'; npc: string }
  /**
   * Ya se narró un párrafo que contiene este fragmento. Frágil a propósito
   * como último recurso —comparar contra texto ya emitido es del tipo de
   * cosa que `prueba-desacople.ts` señala para evitar— pero un par de escenas
   * reales lo necesitan y no vale la pena rediseñarlas para esta migración.
   */
  | { op: 'narrado'; contiene: string }
  /**
   * Ya hay registrada una consecuencia cuya descripción contiene este
   * fragmento.
   *
   * Es el ÚNICO operador que puede ver algo de una aventura ANTERIOR.
   * `sembrarHerencia` (engine.ts) vuelve a emitir, al abrir la aventura
   * siguiente, las consecuencias marcadas `permanent` con alcance `campaign`
   * o `world`. Se busca por texto y no por id a propósito: al reemitirlas el
   * motor les genera un id nuevo, y lo único que sobrevive intacto es la
   * descripción.
   *
   * Con esto una aventura puede preguntar «¿esta persona ya vio la marca en
   * otro campo?» sin que el jugador tenga que declararlo.
   */
  | { op: 'consecuencia'; contiene: string }
  | { op: 'y'; de: Condicion[] }
  | { op: 'o'; de: Condicion[] }
  | { op: 'no'; de: Condicion };

export interface ContextoCondicion {
  estado: GameState;
  /** Ausente al evaluar `visible`/`hecha`/`disponible`/`agotado`, que no tienen intención. */
  intencion?: IntencionLeida;
}

const clueContiene = (s: GameState, frag: string) =>
  s.board.clues.some((c) => c.description.includes(frag));

const documentoObtenido = (s: GameState, id: string) => Boolean(s.documents[id]?.obtainedAt);

const propiedadDescubierta = (s: GameState, item: string, prop?: string) => {
  const descubiertas = s.items[item]?.discoveredProperties ?? [];
  if (prop) return descubiertas.some((d) => d.propertyId === prop);
  return descubiertas.length > 0;
};

const narradoContiene = (s: GameState, frag: string) =>
  s.narrative.some((n) => n.kind === 'keeper' && n.text.includes(frag));

const horaDelMundo = (s: GameState) => Number(s.world.time.iso.slice(11, 13));

export function evaluarCondicion(cond: Condicion, ctx: ContextoCondicion): boolean {
  const { estado: s, intencion: i } = ctx;

  switch (cond.op) {
    case 'verbo':
      return Boolean(i) && cond.es.includes(i!.verb);
    case 'objetivo':
      if (!i) return false;
      if (cond.kind !== undefined && i.objetivo.kind !== cond.kind) return false;
      if (cond.id !== undefined && i.objetivo.id !== cond.id) return false;
      return true;
    case 'destino':
      return Boolean(i) && i!.destino === cond.id;
    case 'sostenido':
      return Boolean(i?.sustained);
    case 'texto':
      return Boolean(i) && new RegExp(cond.patron).test(i!.norm);
    case 'lugar':
      return cond.es.includes(s.world.currentLocation);
    case 'pista':
      return clueContiene(s, cond.contiene);
    case 'pistas':
      return s.board.clues.length >= cond.minimo;
    case 'exposicion':
      return (s.investigators[s.activeInvestigator]?.umbral.exposure ?? 0) >= cond.minimo;
    case 'contradicciones':
      return s.board.contradictions.length >= cond.minimo;
    case 'documento':
      return documentoObtenido(s, cond.id);
    case 'propiedad':
      return propiedadDescubierta(s, cond.item, cond.prop);
    case 'lleva':
      return s.items[cond.item]?.owner === s.activeInvestigator;
    case 'alcanzable': {
      const o = s.items[cond.item]?.owner;
      return o === s.activeInvestigator || o === s.world.currentLocation;
    }
    case 'detalleVisto': {
      // Un detalle está examinado si su texto de cerca ya se narró — mismo
      // criterio que `detalleExaminado` en `acciones.ts` (no hay una bandera
      // aparte: el rastro es el propio párrafo emitido).
      const feature = s.world.locations[cond.lugar]?.features?.find((f) => f.id === cond.feature);
      if (!feature) return false;
      return narradoContiene(s, (feature.closerLook ?? feature.description).slice(0, 45));
    }
    case 'hora': {
      const h = horaDelMundo(s);
      if (cond.minimo !== undefined && h < cond.minimo) return false;
      if (cond.maximo !== undefined && h > cond.maximo) return false;
      return true;
    }
    case 'npcFuera':
      return (s.npcs[cond.npc]?.combate?.hp ?? 1) <= 0;
    case 'narrado':
      return narradoContiene(s, cond.contiene);
    case 'consecuencia':
      return s.consequences.some((c) => c.description.includes(cond.contiene));
    case 'y':
      return cond.de.every((c) => evaluarCondicion(c, ctx));
    case 'o':
      return cond.de.some((c) => evaluarCondicion(c, ctx));
    case 'no':
      return !evaluarCondicion(cond.de, ctx);
  }
}
