/**
 * EL VIGÉSIMO — séptima aventura, segundo acto. ~1 hora y media.
 *
 * El contenido vive en `elvigesimo.contenido.json` y la lógica de sus escenas
 * en `elvigesimo.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DÓNDE PASA: la Casa de Díaz, la misma noche que termina Agua Blanca. Es el
 * cierre del Séptimo Umbral (realidad) y de la campaña entera: el lugar del
 * que salió en 1924 sin tocarlo.
 *
 * POR QUÉ ROMPE EL FORMATO: ver ROADMAP §3.2-terdecies y §3.2-duovicies. La
 * planta baja y el primer piso se caminan libres, como toda la campaña. El
 * sótano no: una vez que se baja no hay vuelta, y la secuencia es fija hasta
 * el laboratorio. Es la primera aventura que hace esto, y lo hace porque ya
 * dejó de ser una investigación.
 *
 * LOS CUATRO PUENTES: Agua Blanca tiene cuatro finales (subir/llamar/
 * escribir/irse) y los cuatro llevan acá, cada uno con su propia apertura —
 * ninguno es un requisito duro, ninguno cierra el paso.
 *
 * `mesesEntre('agua-blanca', 'el-vigesimo')` da 0 a propósito: es la única
 * transición de la campaña que no deja decaer la Exposición.
 *
 * NO revela, por diseño:
 *   · la identidad del Primer Rostro
 *   · qué es el Archivista
 *   · quiénes construyeron el primer anillo, ni si existe
 *   · qué es el Umbral, más allá de lo que Bernardo cree que es
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { EL_VIGESIMO_LOGICA } from './elvigesimo.logica.ts';
import contenido from './elvigesimo.contenido.json' with { type: 'json' };

export const EL_VIGESIMO: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  EL_VIGESIMO_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
);
