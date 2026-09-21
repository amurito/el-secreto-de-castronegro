/**
 * LA GRIETA DEL ZONDA — Acto I. ~Una hora.
 *
 * El contenido vive en `grietadelzonda.contenido.json` y la lógica de sus
 * escenas en `grietadelzonda.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DÓNDE PASA: Valle de Zonda, San Juan, febrero de 1930. Primera vez que la
 * campaña sale de Castronegro y su partido — a propósito: es la pista de que
 * Castronegro es un nodo entre varios, no el único lugar donde el Umbral se
 * manifiesta (pista parcial, no revelación final — ver CANON.md).
 *
 * FINAL ÚNICO, A PROPÓSITO. Es la primera aventura de la campaña sin
 * bifurcación de desenlace: la voladura de la acequia pasa sí o no, gane o
 * pierda el investigador cada intento. Lo que sí varía con el juego son las
 * dos consecuencias de textura que arrastra a *La Merced de las Ánimas*
 * (si Eusebio alcanzó a enseñarle algo antes de quedarse sin fuerzas, y si
 * Valenzuela terminó dudando o lo trató de curioso) — mismo criterio que
 * toda la campaña: la aventura siguiente lee lo que pasó de verdad, nunca
 * exige un resultado específico.
 *
 * EXCEPCIÓN DE CANON: acá el Umbral transporta físicamente por primera vez
 * en la campaña. Es una excepción acotada y fechada a la invariante general
 * («el Umbral NO es una puerta física convencional»), no una revisión de la
 * regla — ver CANON.md, sección Invariantes duras.
 *
 * Continúa directamente en *La Merced de las Ánimas* (mismo `cuando` en
 * `catalogo.ts`: la fractura transporta al instante, sin meses de por
 * medio — mismo criterio que *Agua Blanca → El Vigésimo*).
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { KIT_DE_1930 } from './kit1930.ts';
import { LA_GRIETA_DEL_ZONDA_LOGICA } from './grietadelzonda.logica.ts';
import contenido from './grietadelzonda.contenido.json' with { type: 'json' };

export const LA_GRIETA_DEL_ZONDA: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  LA_GRIETA_DEL_ZONDA_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
  KIT_DE_1930,
);
