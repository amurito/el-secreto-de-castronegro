/**
 * EL SANTO OFICIO DE CUYO — ensamblado. EN CONSTRUCCIÓN, NO REGISTRADA.
 *
 * Decimocuarta aventura: continuación directa de *La Merced de las Ánimas*.
 * Todavía no está en `catalogo.ts`: sólo el Acto I de la rama Iglesia está
 * escrito. El diseño completo vive en `docs/SANTO-OFICIO-DISENO.md` y se ve en
 * el mapa de campaña (`npm run mapa`).
 *
 * Los ítems de 1930 le llegan a quien juegue por `KIT_DE_1930`. Cruzan de
 * Merced por herencia, y esta aventura se los da sólo a quien nunca los tuvo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { KIT_DE_1930 } from './kit1930.ts';
import { EL_SANTO_OFICIO_DE_CUYO_LOGICA } from './santooficio.logica.ts';
import contenido from './santooficio.contenido.json' with { type: 'json' };

export const EL_SANTO_OFICIO_DE_CUYO: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  EL_SANTO_OFICIO_DE_CUYO_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
  KIT_DE_1930,
);
