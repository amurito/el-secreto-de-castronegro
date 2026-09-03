/**
 * LO QUE BERNARDO SABÍA — epílogo corto tras El Vigésimo. ~20-30 minutos.
 *
 * El contenido vive en `loquebernardosabia.contenido.json` y la lógica de sus
 * escenas en `loquebernardosabia.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DÓNDE PASA: el laboratorio de la Casa de Díaz, tres semanas después de
 * El Vigésimo. Cierra el hueco de ROADMAP §4 (Magia): hasta acá, los Puntos
 * de Magia existían en la ficha desde el principio del proyecto sin que
 * ninguna aventura enseñara a usarlos.
 *
 * DOS RAMAS, SEGÚN CÓMO TERMINÓ EL VIGÉSIMO: `fin-heredar` (se puso el
 * anillo) lleva a que el Ahijado enseñe; `fin-cortar` (lo destruyó) lleva al
 * libro sin título que Bernardo dejó. `fin-denunciar-vigesimo` y
 * `fin-irse-vigesimo` no llevan a nada de esto —esos dos investigadores
 * escaparon sin quedarse a buscar— y tienen su propia rama sin magia.
 *
 * Los dos hechizos son ORIGINALES, no los del manual con nombre: ver la
 * cabecera de `rules/hechizos.ts` sobre por qué.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo, y no
 * revela nada de lo que El Vigésimo dejó sin revelar (el Primer Rostro, el
 * Archivista, quién construyó el primer anillo).
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { LO_QUE_BERNARDO_SABIA_LOGICA } from './loquebernardosabia.logica.ts';
import contenido from './loquebernardosabia.contenido.json' with { type: 'json' };

export const LO_QUE_BERNARDO_SABIA: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  LO_QUE_BERNARDO_SABIA_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
);
