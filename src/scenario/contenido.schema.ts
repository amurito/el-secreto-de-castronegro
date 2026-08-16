/**
 * LA FORMA DEL CONTENIDO EN JSON.
 *
 * Es `Scenario` menos las dos partes que tienen lógica de verdad
 * (`conversations`, `scenes`) más las mismas partes con sus funciones
 * reemplazadas por `Condicion` (ver `condiciones.ts`). Todo lo demás —lugares,
 * objetos, NPCs, documentos, línea de tiempo, finales— ya era dato puro en
 * `Scenario`, así que no cambia de forma: sólo de archivo.
 *
 * `investigators` NO está acá. Los pregenerados (Elena, Tomás) viven en
 * `pregens.ts` y se comparten entre aventuras; duplicarlos en cada JSON
 * significaría dos copias de la misma persona que alguien tendría que
 * mantener iguales a mano. `cargarAventura` los recibe aparte.
 */

import type {
  Item, NpcSeed, DiegeticDocument, GameLocation, WorldTime, TemporalEvent, LocationId,
} from '../shared/types.ts';
import type { ScenarioEnding } from './types.ts';
import type { Dificultad, EfectoTema } from './conversacion.ts';
import type { EfectoEscena } from './escena.ts';
import type { GrupoAccion } from './acciones.ts';
import type { Condicion } from './condiciones.ts';

export interface TemaJSON {
  id: string;
  npc: string;
  etiqueta: string;
  intencion: string;
  claves: string[];
  orden?: number;
  disponible?: Condicion;
  agotado?: Condicion;
  prueba?: {
    skill: string;
    difficulty: Dificultad;
    actitudMinima?: number;
    razon: string;
  };
  cede: EfectoTema;
  esquiva?: EfectoTema;
  cerrado?: EfectoTema;
  critico?: EfectoTema;
  pifia?: EfectoTema;
}

/**
 * `resolver`/`antes`/`prueba` NO están acá: son lógica de verdad —prosa que
 * cambia según el grado de la tirada o qué se descubrió antes— y las provee
 * el companion `*.logica.ts` por id. Si un id está en el JSON y no en la
 * lógica (o al revés), `validarContenido` lo rechaza: mismo espíritu que
 * `prueba-auditoria.ts` con "declarado sin camino".
 */
export interface EscenaJSON {
  id: string;
  prioridad?: number;
  tambienAlAgarrar?: true;
  cuando: Condicion;
}

export interface AccionJSON {
  id: string;
  /**
   * Texto fijo, o variantes que se prueban de arriba abajo. La primera que
   * matchea gana; una sin `cuando` matchea siempre y hace de default, así que
   * va última.
   */
  etiqueta: string | Array<{ cuando?: Condicion; texto: string }>;
  intencion: string;
  grupo: GrupoAccion;
  lugar?: LocationId | LocationId[];
  visible?: Condicion;
  hecha?: Condicion;
  final?: true;
  orden?: number;
}

export interface ContenidoAventura {
  id: string;
  title: string;
  surfacePremise: string;
  items: Item[];
  npcs: NpcSeed[];
  documents: DiegeticDocument[];
  locations: Record<LocationId, GameLocation>;
  startLocation: LocationId;
  startTime: WorldTime;
  startUmbralPermeability: number;
  timeline: TemporalEvent[];
  conversations: TemaJSON[];
  scenes: EscenaJSON[];
  actions: AccionJSON[];
  endings: ScenarioEnding[];
  opening: string;
}

/** Re-exportado para que el companion de lógica no tenga que importar de dos lugares. */
export type { EfectoEscena };
