/**
 * LAS ACCIONES DE LA LEGUA PERDIDA.
 *
 * El verbo central de esta aventura es MEDIR, como en Agua Quieta era mirar.
 * Y hay un botón que la primera aventura no tenía y que es donde se resuelve
 * ésta: cotejar los tres testimonios.
 */

import type { GameState } from '../shared/types.ts';
import type { AccionDef } from './acciones.ts';
import { puedeDemostrar } from './legua.escenas.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const doc = (s: GameState, id: string) => Boolean(s.documents[id]?.obtainedAt);
const lleva = (s: GameState, item: string) => s.items[item]?.owner === s.activeInvestigator;
const propiedadVista = (s: GameState, item: string) =>
  (s.items[item]?.discoveredProperties.length ?? 0) > 0;
const pistas = (s: GameState) => s.board.clues.length;
const contradicciones = (s: GameState) => s.board.contradictions.length;

export const LEGUA_ACCIONES: AccionDef[] = [
  // ── GALPÓN ─────────────────────────────────────────────────────────────────
  {
    id: 'certificar', grupo: 'observar', lugar: 'galpon', orden: 1,
    etiqueta: 'Examinar el cuerpo como corresponde',
    intencion: 'Examino a Fermín para certificar la causa',
    hecha: (s) => pista(s, 'cinco o seis días de caminata'),
  },
  {
    id: 'cantimplora', grupo: 'observar', lugar: 'galpon', orden: 2,
    etiqueta: 'Revisar la cantimplora',
    intencion: 'Examino la cantimplora de Fermín',
    hecha: (s) => propiedadVista(s, 'it-cantimplora'),
  },

  // ── ESCRITORIO ─────────────────────────────────────────────────────────────
  {
    id: 'mensuras', grupo: 'observar', lugar: 'escritorio', orden: 3,
    etiqueta: 'Buscar las mensuras entre los papeles',
    intencion: 'Busco las mensuras entre los papeles',
    hecha: (s) => doc(s, 'doc-mensura1903'),
  },
  {
    id: 'libreta', grupo: 'observar', lugar: 'escritorio', orden: 4,
    etiqueta: 'Leer la libreta de campo de Roldán',
    intencion: 'Leo la libreta de campo de Roldán',
    visible: (s) => doc(s, 'doc-mensura1903'),
    hecha: (s) => propiedadVista(s, 'it-libreta'),
  },

  // ── EL CAMPO ───────────────────────────────────────────────────────────────
  {
    id: 'medir', grupo: 'usar', lugar: ['alambrado', 'molino', 'rastro'], orden: 5,
    etiqueta: (s) => propiedadVista(s, 'it-rueda')
      ? 'Volver a medir con la rueda'
      : 'Medir la línea con la rueda, de ida y de vuelta',
    intencion: 'Mido la línea con la rueda de ida y de vuelta',
    visible: (s) => lleva(s, 'it-rueda'),
  },
  {
    id: 'caminar-tanque', grupo: 'usar', lugar: ['rastro', 'molino'], orden: 6,
    etiqueta: 'Caminar los doscientos metros hasta el tanque, con reloj',
    intencion: 'Camino hasta el tanque contando los pasos y mirando el reloj',
    visible: (s) => pista(s, 'boca arriba, mirando el tanque') || pista(s, 'diecisiete kilómetros'),
    hecha: (s) => pista(s, 'llevan veinticinco minutos'),
  },

  // ── GLOBALES ───────────────────────────────────────────────────────────────
  {
    id: 'cotejar', grupo: 'decidir', orden: 20,
    etiqueta: (s) => contradicciones(s) > 0
      ? 'Volver sobre lo que dice cada uno'
      : 'Cotejar lo que dice cada uno',
    intencion: 'Cotejo lo que dice cada uno',
    visible: (s) => pista(s, 'Herminia: veinte minutos') || pista(s, 'Casimiro: media hora'),
  },
  {
    id: 'pensar', grupo: 'decidir', orden: 21,
    etiqueta: 'Ordenar lo que sabés',
    intencion: 'Pienso en lo que sé hasta ahora',
    visible: (s) => pistas(s) >= 2,
  },
  {
    id: 'anotar', grupo: 'decidir', orden: 22,
    etiqueta: 'Anotar todo en la libreta',
    intencion: 'Anoto todo lo que tengo en la libreta',
    visible: (s) => pistas(s) >= 3,
    hecha: (s) => s.narrative.some((n) => n.text.includes('Sacás la libreta')),
  },
  {
    id: 'esperar', grupo: 'decidir', orden: 23,
    etiqueta: 'Esperar y no hacer nada',
    intencion: 'Espero un rato largo sin hacer nada',
    visible: (s) => pistas(s) >= 1,
  },

  // ── DESENLACES ─────────────────────────────────────────────────────────────
  // Cinco maneras de cerrar. La de medir pide haber medido de verdad; la de
  // caminar pide saber en qué se está metiendo.
  {
    id: 'fin-firmar', grupo: 'decidir', orden: 90, final: true,
    etiqueta: 'Firmar el certificado y terminar con esto',
    intencion: 'Firmo el certificado de defunción',
    visible: (s) => pistas(s) >= 3,
  },
  {
    id: 'fin-medir', grupo: 'decidir', orden: 91, final: true,
    etiqueta: 'Levantar un acta de la medición, con testigos',
    intencion: 'Demuestro que el campo no cierra y levanto acta',
    visible: puedeDemostrar,
  },
  {
    id: 'fin-caminar', grupo: 'decidir', lugar: ['alambrado', 'molino', 'rastro'], orden: 92, final: true,
    etiqueta: 'Caminar el alambrado del oeste de punta a punta',
    intencion: 'Camino el alambrado del oeste de punta a punta',
    visible: (s) => pistas(s) >= 5,
  },
  {
    id: 'fin-borrar', grupo: 'decidir', lugar: ['escritorio', 'galpon'], orden: 93, final: true,
    etiqueta: 'Quemar la mensura de 1903 y que el pleito muera con ella',
    intencion: 'Quemo la mensura de 1903',
    visible: (s) => doc(s, 'doc-mensura1903') && pistas(s) >= 4,
  },
  {
    id: 'fin-irse', grupo: 'decidir', orden: 94, final: true,
    etiqueta: 'Irte de La Perseverancia sin firmar',
    intencion: 'Me voy de La Perseverancia',
    visible: (s) => pistas(s) >= 4,
  },
];
