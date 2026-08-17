/**
 * LA LEGUA PERDIDA — segunda aventura. Marzo de 1925. ~1 hora y media.
 *
 * El contenido vive en `la-legua-perdida.contenido.json` y la lógica de sus
 * escenas en `legua.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Conexión con el universo: canon v0.7 §11 reserva el Segundo Umbral para el
 * ESPACIO, y aclara que los nombres geográficos de los otros Umbrales no son
 * canon definitivo. Esta aventura usa ese margen.
 *
 * DÓNDE PASA: LEJOS DE CASTRONEGRO, y eso es estructural, no decorativo. §11
 * asigna a Agua Blanca / Castronegro el eje «tiempo, observación y memoria» —
 * que es Agua Quieta— y al Segundo Umbral el del espacio, que es esto. Los
 * Siete «no son siete puertas independientes que conducen a una habitación
 * común»: son puntos distintos de una misma estructura. Traer esta aventura al
 * partido de Castronegro fusionaría dos Umbrales en uno y rompería esa idea.
 *
 * Las dos son historias PARALELAS: mismo lustro, ningún personaje en común
 * salvo el investigador si encadenás campaña, y ninguna explica a la otra.
 *
 * NO confirma, por diseño:
 *   · que esto SEA el Segundo Umbral — se comporta como uno, nadie lo confirma
 *   · la relación con Agua Blanca, que desde acá no se puede establecer
 *   · nada del Primer Rostro, el anillo, Puddock ni el Archivista
 *
 * La aventura aplica la regla de oro (§15): cuanto más cerca de la verdad, más
 * información y menos certeza. Al final el jugador puede DEMOSTRAR que el campo
 * no cierra, y esa demostración no le sirve para nada.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS } from './pregens.ts';
import { LEGUA_LOGICA } from './legua.logica.ts';
import contenido from './la-legua-perdida.contenido.json' with { type: 'json' };

export const LA_LEGUA: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  LEGUA_LOGICA,
  [ELENA, TOMAS],
);
