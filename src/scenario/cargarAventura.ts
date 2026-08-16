/**
 * DE JSON A `Scenario`.
 *
 * Arma en memoria exactamente el mismo objeto que antes se escribía a mano en
 * TypeScript, así que nada de lo que consume un escenario —el motor, el
 * resolvedor offline, la auditoría, el catálogo— se entera de que ahora viene
 * de un archivo de datos. Ése es el punto: la migración no puede cambiar el
 * comportamiento, y la forma de comprobarlo es que las suites existentes
 * pasen sin tocarlas.
 *
 * Lo que hace de verdad es COMPILAR las condiciones: una `Condicion` de JSON
 * se envuelve en la función `(s, i) => boolean` que el motor espera. La
 * función resultante es un cierre sobre datos inmutables, sin estado propio.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import type { EscenaAutoral, Escenas, IntencionLeida } from './escena.ts';
import type { TemaConversacion, Conversaciones } from './conversacion.ts';
import type { AccionDef } from './acciones.ts';
import type { GameState, Investigator, SkillId } from '../shared/types.ts';
import { evaluarCondicion, type Condicion } from './condiciones.ts';
import { validarContenido } from './validarContenido.ts';

/**
 * Lo único que no puede ser dato: la prosa que se arma según el resultado de
 * la tirada y lo que ya se descubrió. Un companion de TypeScript aporta esto,
 * y el `id` de cada entrada la casa con su declaración en el JSON.
 *
 * Es una lista y no un mapa para que cada entrada lleve su id adentro: leyendo
 * el archivo de lógica se ve de qué escena es cada `resolver` sin tener que
 * mirar la llave desde afuera.
 */
export type LogicaDeEscena =
  { id: string }
  & Pick<EscenaAutoral, 'resolver'>
  & Partial<Pick<EscenaAutoral, 'antes' | 'prueba'>>;

export type LogicaDeEscenas = LogicaDeEscena[];

const conEstado = (cond: Condicion) => (s: GameState) => evaluarCondicion(cond, { estado: s });
const conIntencion = (cond: Condicion) => (s: GameState, i: IntencionLeida) =>
  evaluarCondicion(cond, { estado: s, intencion: i });

export function cargarAventura(
  contenido: ContenidoAventura,
  logica: LogicaDeEscenas,
  investigadores: Investigator[],
): Scenario {
  validarContenido(contenido, logica.map((l) => l.id));

  const porId = new Map(logica.map((l) => [l.id, l]));
  const scenes: Escenas = contenido.scenes.map((e): EscenaAutoral => {
    const impl = porId.get(e.id)!; // validarContenido ya garantizó que está
    return {
      id: e.id,
      ...(e.prioridad !== undefined ? { prioridad: e.prioridad } : {}),
      ...(e.tambienAlAgarrar ? { tambienAlAgarrar: e.tambienAlAgarrar } : {}),
      cuando: conIntencion(e.cuando),
      ...(impl.antes ? { antes: impl.antes } : {}),
      ...(impl.prueba ? { prueba: impl.prueba } : {}),
      resolver: impl.resolver,
    };
  });

  const conversations: Conversaciones = contenido.conversations.map((t): TemaConversacion => ({
    id: t.id,
    npc: t.npc,
    etiqueta: t.etiqueta,
    intencion: t.intencion,
    claves: t.claves,
    ...(t.orden !== undefined ? { orden: t.orden } : {}),
    ...(t.disponible ? { disponible: conEstado(t.disponible) } : {}),
    ...(t.agotado ? { agotado: conEstado(t.agotado) } : {}),
    ...(t.prueba ? { prueba: { ...t.prueba, skill: t.prueba.skill as SkillId } } : {}),
    cede: t.cede,
    ...(t.esquiva ? { esquiva: t.esquiva } : {}),
    ...(t.cerrado ? { cerrado: t.cerrado } : {}),
    ...(t.critico ? { critico: t.critico } : {}),
    ...(t.pifia ? { pifia: t.pifia } : {}),
  }));

  const actions: AccionDef[] = contenido.actions.map((a): AccionDef => {
    // Una etiqueta condicional se resuelve de arriba abajo; si ninguna
    // matchea, gana la última, que hace de default. Cubre los 3 casos reales
    // donde hoy la etiqueta es una función.
    const variantes = a.etiqueta;
    const etiqueta: AccionDef['etiqueta'] = typeof variantes === 'string'
      ? variantes
      : (s: GameState) =>
        variantes.find((v) => !v.cuando || evaluarCondicion(v.cuando, { estado: s }))?.texto
        ?? variantes[variantes.length - 1]!.texto;
    return {
      id: a.id,
      etiqueta,
      intencion: a.intencion,
      grupo: a.grupo,
      ...(a.lugar !== undefined ? { lugar: a.lugar } : {}),
      ...(a.visible ? { visible: conEstado(a.visible) } : {}),
      ...(a.hecha ? { hecha: conEstado(a.hecha) } : {}),
      ...(a.final ? { final: a.final } : {}),
      ...(a.orden !== undefined ? { orden: a.orden } : {}),
    };
  });

  return {
    id: contenido.id,
    title: contenido.title,
    surfacePremise: contenido.surfacePremise,
    investigators: investigadores,
    items: contenido.items,
    npcs: contenido.npcs,
    documents: contenido.documents,
    locations: contenido.locations,
    startLocation: contenido.startLocation,
    startTime: contenido.startTime,
    startUmbralPermeability: contenido.startUmbralPermeability,
    timeline: contenido.timeline,
    conversations,
    scenes,
    actions,
    endings: contenido.endings,
    opening: contenido.opening,
  };
}
