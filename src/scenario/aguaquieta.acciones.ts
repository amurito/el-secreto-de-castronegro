/**
 * LAS ACCIONES DE AGUA QUIETA.
 *
 * Vivían en `acciones.ts`, que es del motor. Mientras estuvieran ahí, cualquier
 * aventura nueva heredaba los botones de ésta: la segunda aventura arrancaba
 * ofreciendo asomarse a un aljibe que no existe en su mapa.
 *
 * Ahora el catálogo es del escenario, como la conversación y las escenas.
 */

import type { GameState, LocationId, LocationFeature } from '../shared/types.ts';
import type { AccionDef } from './acciones.ts';
import { detalleExaminado } from './acciones.ts';

// ─────────────────────────────────────────────────────────────────────────────
// AYUDAS DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────

const narrado = (s: GameState, fragmento: string) =>
  s.narrative.some((n) => n.kind === 'keeper' && n.text.includes(fragmento));

const pista = (s: GameState, fragmento: string) =>
  s.board.clues.some((c) => c.description.includes(fragmento));

const propiedad = (s: GameState, item: string, prop: string) =>
  Boolean(s.items[item]?.discoveredProperties.some((d) => d.propertyId === prop));

const documento = (s: GameState, id: string) => Boolean(s.documents[id]?.obtainedAt);

const lleva = (s: GameState, item: string) => s.items[item]?.owner === s.activeInvestigator;

/** Al alcance: encima del investigador, o acá en el lugar. */
const alcanzable = (s: GameState, item: string) => {
  const o = s.items[item]?.owner;
  return o === s.activeInvestigator || o === s.world.currentLocation;
};

const actitud = (s: GameState, npc: string) => s.npcs[npc]?.attitude[s.activeInvestigator] ?? 0;

const pistas = (s: GameState) => s.board.clues.length;

const exposicion = (s: GameState) => s.investigators[s.activeInvestigator]?.umbral.exposure ?? 0;

// Local a propósito: el catálogo del escenario no debe depender del narrador.
const horaDe = (s: GameState) => Number(s.world.time.iso.slice(11, 13));

/**
 * Rosa presente ACÁ. `npc.present` es una bandera global; sin cruzarla con la
 * localización, el juego ofrecía hablarle desde el cuarto y desde la laguna,
 * donde no está.
 */
const rosaPresente = (s: GameState) => {
  const npc = s.npcs['npc-rosa'];
  if (!npc?.present || npc.status !== 'alive') return false;
  return Boolean(s.world.locations[s.world.currentLocation]?.npcsPresent.includes('npc-rosa'));
};

const detalleVisto = (s: GameState, lugar: LocationId, featureId: string): boolean => {
  const f = s.world.locations[lugar]?.features?.find((x) => x.id === featureId);
  return f ? detalleExaminado(s, f) : false;
};

/**
 * ¿Se puede sostenerle la mirada al reflejo hasta que responda?
 *
 * Vive acá, exportada, y la usan TANTO el catálogo —para mostrar el botón—
 * COMO el resolvedor —para decidir si es un desenlace—. Si cada uno tuviera su
 * copia, tarde o temprano se separarían y la opción se ofrecería sin hacer lo
 * que promete. Ya nos pasó con la lista de temas de conversación duplicada.
 */
export function listoParaSostener(s: GameState): boolean {
  if (!pista(s, 'retardo perceptible')) return false;
  return exposicion(s) >= 25
    || propiedad(s, 'it-fotoreciente', 'p-rec-figura')
    || pista(s, 'dos luces');
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO
// ─────────────────────────────────────────────────────────────────────────────

export const AGUA_QUIETA_ACCIONES: AccionDef[] = [
  // ── PATIO ──────────────────────────────────────────────────────────────────
  {
    id: 'asomarse', grupo: 'observar', lugar: 'patio', orden: 1,
    intencion: 'Me asomo al aljibe y miro el reflejo un rato largo',
    etiqueta: (s) =>
      !pista(s, 'retardo perceptible')
        ? 'Asomarte al aljibe y mirar el reflejo'
        : !pista(s, 'aumenta con la velocidad')
          ? 'Probar el retardo moviéndote rápido frente al agua'
          : 'Volver a asomarte al agua',
  },
  {
    id: 'reloj-agua', grupo: 'usar', lugar: 'patio', orden: 2,
    etiqueta: 'Sostener el reloj de Ignacio sobre el agua',
    intencion: 'Sostengo el reloj sobre el agua del aljibe',
    visible: (s) => alcanzable(s, 'it-reloj'),
    hecha: (s) => propiedad(s, 'it-reloj', 'p-reloj-atras'),
  },
  {
    id: 'espejo-aljibe', grupo: 'usar', lugar: 'patio', orden: 3,
    etiqueta: 'Mirar el aljibe a través del espejo',
    intencion: 'Uso el espejo para mirar el aljibe',
    visible: (s) => lleva(s, 'it-espejo'),
    hecha: (s) => propiedad(s, 'it-espejo', 'p-espejo-indirecto'),
  },
  {
    id: 'gritar', grupo: 'usar', lugar: 'patio', orden: 4,
    etiqueta: 'Llamar a Ignacio hacia el aljibe',
    intencion: 'Grito el nombre de Ignacio hacia el aljibe',
    visible: (s) => pista(s, 'salió al patio a fumar') || documento(s, 'doc-cuaderno'),
    hecha: (s) => pista(s, 'no devuelve eco'),
  },
  {
    id: 'escuchar-patio', grupo: 'observar', lugar: 'patio', orden: 22,
    etiqueta: 'Escuchar el aljibe',
    intencion: 'Escucho el aljibe con atención',
    hecha: (s) => narrado(s, 'Un aljibe hace ruido'),
  },
  {
    id: 'cavar', grupo: 'usar', lugar: 'patio', orden: 23,
    etiqueta: 'Cavar junto al aljibe para llegar a la napa',
    intencion: 'Cavo al lado del aljibe',
    visible: (s) => documento(s, 'doc-cuaderno'),
    hecha: (s) => pista(s, 'napa está a sesenta'),
  },

  // ── CASA ───────────────────────────────────────────────────────────────────
  {
    id: 'foto1897', grupo: 'observar', lugar: 'casa', orden: 5,
    etiqueta: 'Mirar la fotografía enmarcada de 1897',
    intencion: 'Examino la fotografía enmarcada de 1897',
    hecha: (s) => narrado(s, 'Nueve personas delante del aljibe') || propiedad(s, 'it-foto1897', 'p-1897-rostro'),
  },

  // ── ROSA ───────────────────────────────────────────────────────────────────
  // Ya no están acá. Las ocho preguntas escritas a mano se generan ahora desde
  // `scenario.conversations`, en `accionesDisponibles`. Una aventura nueva trae
  // sus temas y sus botones aparecen solos.

  // ── CUARTO ─────────────────────────────────────────────────────────────────
  {
    id: 'cuaderno', grupo: 'observar', lugar: 'cuarto', orden: 6,
    etiqueta: 'Leer el cuaderno de Ignacio',
    intencion: 'Leo el cuaderno de Ignacio',
    hecha: (s) => documento(s, 'doc-cuaderno'),
  },
  {
    id: 'paginas', grupo: 'observar', lugar: 'cuarto', orden: 7,
    etiqueta: 'Revisar el cuaderno hoja por hoja',
    intencion: 'Reviso el cuaderno hoja por hoja',
    visible: (s) => documento(s, 'doc-cuaderno'),
    hecha: (s) => documento(s, 'doc-carta'),
  },
  {
    id: 'placa', grupo: 'observar', lugar: 'cuarto', orden: 8,
    etiqueta: 'Examinar la fotografía que Ignacio dejó dada vuelta',
    intencion: 'Examino la fotografía dada vuelta',
    hecha: (s) => propiedad(s, 'it-fotoreciente', 'p-rec-figura'),
  },
  {
    id: 'comparar', grupo: 'usar', lugar: ['casa', 'cuarto'], orden: 9,
    etiqueta: 'Comparar las dos fotografías',
    intencion: 'Comparo las dos fotografías',
    // Hace falta haber visto la figura en la placa Y tener las dos a mano.
    // Traer el retrato de la cocina al cuarto es parte del descubrimiento.
    visible: (s) =>
      propiedad(s, 'it-fotoreciente', 'p-rec-figura') &&
      alcanzable(s, 'it-foto1897') && alcanzable(s, 'it-fotoreciente'),
    hecha: (s) => propiedad(s, 'it-foto1897', 'p-1897-rostro'),
  },

  // ── GLOBALES ───────────────────────────────────────────────────────────────
  {
    id: 'pensar', grupo: 'decidir', orden: 50,
    etiqueta: 'Ordenar lo que sabés',
    intencion: 'Pienso en lo que sé hasta ahora',
    visible: (s) => pistas(s) >= 2,
  },
  {
    id: 'anotar', grupo: 'decidir', orden: 51,
    etiqueta: 'Anotar todo en la libreta',
    intencion: 'Anoto todo lo que tengo en la libreta',
    visible: (s) => pistas(s) >= 3,
    hecha: (s) => narrado(s, 'Sacás la libreta'),
  },
  {
    id: 'esperar', grupo: 'decidir', orden: 52,
    etiqueta: 'Esperar y no hacer nada',
    intencion: 'Espero un rato largo sin hacer nada',
    visible: (s) => pistas(s) >= 1,
  },

  // ── DESENLACES ─────────────────────────────────────────────────────────────
  // Los cinco cierran la aventura. Ninguno es «perder»: son cinco maneras
  // distintas de que termine, y tres de ellas requieren haber entendido algo
  // que las otras dos no piden.
  {
    id: 'bajar', grupo: 'decidir', lugar: 'patio', orden: 90, final: true,
    etiqueta: 'Bajar al aljibe',
    intencion: 'Bajo al aljibe',
    visible: (s) => pistas(s) >= 4,
  },
  {
    id: 'sellar', grupo: 'decidir', lugar: 'patio', orden: 91, final: true,
    etiqueta: 'Sellar el aljibe con las tablas del galpón',
    intencion: 'Sello el aljibe con las tablas del galpón',
    visible: (s) => pistas(s) >= 5 && detalleVisto(s, 'patio', 'f-galpon'),
  },
  {
    id: 'irse', grupo: 'decidir', orden: 92, final: true,
    etiqueta: 'Irte de Los Álamos con lo que tenés',
    intencion: 'Me voy de Los Álamos',
    visible: (s) => pistas(s) >= 4,
  },
  {
    // El desenlace que la aventura declaraba y el motor no ofrecía. Es el
    // único que llega hasta el fondo, y por eso pide exposición alta: hay que
    // haberse asomado bastante para que el fenómeno tenga a quién responderle.
    id: 'sostener', grupo: 'decidir', lugar: 'patio', orden: 93, final: true,
    etiqueta: 'Sostenerle la mirada al reflejo hasta que responda',
    intencion: 'Le sostengo la mirada al reflejo del aljibe hasta el final',
    // Tres caminos, no uno.
    //
    // Antes pedía sólo exposición >= 30, y eso se conseguía asomándose muchas
    // veces. Desde que las fuentes rinden cada vez menos, la exposición de una
    // partida a fondo va de 21 a 37 según cómo salgan los dados — casi todas
    // las fuentes están detrás de una tirada. Con una sola puerta, el final más
    // profundo de la aventura pasaba a depender de la suerte, que es el mismo
    // problema que ya dejó a un jugador sin poder llegar.
    //
    // Lo que el desenlace pide de verdad no es un número: es SABER que el
    // fenómeno devuelve la mirada. A eso se llega por exposición acumulada, por
    // la figura de la placa, o porque Rosa contó lo de las dos luces.
    visible: (s) => listoParaSostener(s),
  },
  {
    id: 'quedarse', grupo: 'decidir', orden: 94, final: true,
    etiqueta: 'Quedarte en la casa a pasar la noche',
    intencion: 'Me quedo en Los Álamos a pasar la noche',
    visible: (s) => pistas(s) >= 4 && horaDe(s) >= 18,
  },
];

