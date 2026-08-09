/**
 * CATÁLOGO DE ACCIONES — lo que el jugador puede hacer AHORA.
 *
 * Reemplaza la lista casi fija por lugar que hacía sentir estático el juego.
 * Tres reglas:
 *
 *   1. Una acción ya hecha NO se vuelve a ofrecer. Si mirar el brocal ya
 *      reveló lo que tenía, desaparece de la lista.
 *   2. Las acciones se DESBLOQUEAN. Comparar las fotografías no existe hasta
 *      que viste la figura en la placa Y tenés las dos a mano. Preguntarle a
 *      Rosa por la soga no existe hasta que notaste que la cortaron.
 *   3. Las que se pueden repetir cambian de etiqueta, para que insistir se
 *      sienta como insistir y no como no haber hecho nada.
 *
 * Una acción desaparece cuando `hecha(estado)` da verdadero. Las que no tienen
 * `hecha` quedan disponibles siempre: son las repetibles.
 *
 * El catálogo describe QUÉ se ofrece; `intencion` es el texto que consume el
 * resolvedor. Así la interfaz y el motor siguen desacoplados: el mismo
 * resolvedor atiende una opción y una frase escrita a mano.
 */

import type { GameState, LocationId, LocationFeature } from '../shared/types.ts';

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
// AYUDAS DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────

const narrado = (s: GameState, fragmento: string) =>
  s.narrative.some((n) => n.kind === 'keeper' && n.text.includes(fragmento));

/** Un detalle está examinado si su texto de detalle ya se narró. */
export function detalleExaminado(s: GameState, f: LocationFeature): boolean {
  return narrado(s, (f.closerLook ?? f.description).slice(0, 45));
}

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

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO
// ─────────────────────────────────────────────────────────────────────────────

export const ACCIONES: AccionDef[] = [
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
  {
    id: 'rosa-ignacio', grupo: 'hablar', orden: 10,
    etiqueta: 'Preguntarle a Rosa qué pasó esa noche',
    intencion: 'Le pregunto a Rosa qué pasó esa noche con Ignacio',
    visible: rosaPresente,
    hecha: (s) => pista(s, 'salió al patio a fumar'),
  },
  {
    id: 'rosa-soga', grupo: 'hablar', orden: 11,
    etiqueta: 'Preguntarle por la soga cortada',
    intencion: 'Le pregunto a Rosa por la soga de la roldana',
    visible: (s) => rosaPresente(s) && pista(s, 'cortada a cuchillo'),
    hecha: (s) => pista(s, 'tres días DESPUÉS'),
  },
  {
    id: 'rosa-aljibe', grupo: 'hablar', orden: 12,
    etiqueta: 'Preguntarle por el aljibe',
    intencion: 'Le pregunto a Rosa por el aljibe',
    visible: rosaPresente,
    hecha: (s) => narrado(s, 'El agua está buena') || narrado(s, '¿Otra vez el aljibe?'),
  },
  {
    id: 'rosa-reloj', grupo: 'hablar', orden: 13,
    etiqueta: 'Preguntarle por el reloj que apareció seco',
    intencion: 'Le pregunto a Rosa por el reloj',
    visible: (s) =>
      rosaPresente(s) && (pista(s, 'cuatro y veinte') || propiedad(s, 'it-reloj', 'p-reloj-atras')),
    hecha: (s) => pista(s, 'cerrada por dentro'),
  },
  {
    id: 'rosa-1897', grupo: 'hablar', orden: 14,
    etiqueta: 'Preguntarle por la fotografía vieja',
    intencion: 'Le pregunto a Rosa por la fotografía de 1897',
    visible: (s) => rosaPresente(s) && narrado(s, 'Nueve personas delante del aljibe'),
    hecha: (s) => narrado(s, 'los patrones viejos') || narrado(s, 'Cosas de antes'),
  },
  {
    // Sin "Ignacio" en la intención: el detector de temas lo leería como una
    // pregunta sobre él y nunca llegaría al tema de la deuda.
    id: 'rosa-deuda', grupo: 'hablar', orden: 15,
    etiqueta: 'Preguntarle por la plata que se debía',
    intencion: 'Le pregunto a Rosa por la plata que se debía',
    visible: (s) => rosaPresente(s) && pista(s, 'salió al patio a fumar'),
    hecha: (s) => narrado(s, 'Cuarenta pesos'),
  },
  {
    id: 'rosa-hermano', grupo: 'hablar', orden: 16,
    etiqueta: 'Preguntarle por el hermano',
    intencion: 'Le pregunto a Rosa por el hermano',
    visible: (s) => rosaPresente(s) && narrado(s, 'Cuarenta pesos'),
    hecha: (s) => pista(s, 'vive en Rosario') || narrado(s, 'Del hermano no hablo'),
  },
  {
    id: 'rosa-ella', grupo: 'hablar', orden: 17,
    etiqueta: 'Preguntarle qué vio ella',
    intencion: 'Le pregunto a Rosa qué vio ella',
    visible: (s) => rosaPresente(s) && actitud(s, 'npc-rosa') >= 12,
    // Se cierra tanto si confiesa como si esquiva: insistir es otra acción,
    // que se desbloquea cuando la confianza alcanza.
    hecha: (s) => pista(s, 'dos luces') || narrado(s, 'Yo no vi nada'),
  },
  {
    id: 'rosa-insistir', grupo: 'hablar', orden: 18,
    etiqueta: 'Insistirle a Rosa: ella vio algo esa noche',
    intencion: 'Le insisto a Rosa con lo que vio ella',
    visible: (s) =>
      rosaPresente(s) && narrado(s, 'Yo no vi nada') && actitud(s, 'npc-rosa') >= 40,
    hecha: (s) => pista(s, 'dos luces'),
  },

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
    visible: (s) =>
      exposicion(s) >= 30 && pista(s, 'retardo perceptible'),
  },
  {
    id: 'quedarse', grupo: 'decidir', orden: 94, final: true,
    etiqueta: 'Quedarte en la casa a pasar la noche',
    intencion: 'Me quedo en Los Álamos a pasar la noche',
    visible: (s) => pistas(s) >= 4 && horaDe(s) >= 18,
  },
];

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
export function accionesDisponibles(s: GameState): Opcion[] {
  if (s.ending) return [];
  if (s.investigators[s.activeInvestigator]?.status !== 'alive') return [];

  const aqui = s.world.currentLocation;
  const out: Array<Opcion & { orden: number }> = [];

  for (const a of ACCIONES) {
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
      etiqueta: d.visited ? `Volver a ${d.name.toLowerCase()}` : `Ir a ${d.name.toLowerCase()}`,
      intencion: `Voy a ${d.name.toLowerCase()}`,
      grupo: 'mover',
      orden: 80,
    });
  }

  out.sort((a, b) => a.orden - b.orden);
  return out.map(({ orden: _o, ...resto }) => resto);
}
