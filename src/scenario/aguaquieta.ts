/**
 * AGUA QUIETA — miniaventura de prueba del motor. ~1 hora.
 *
 * El contenido vive en `agua-quieta.contenido.json` y la lógica de sus
 * escenas en `aguaquieta.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DÓNDE PASA: Los Álamos es una fracción del partido de Castronegro, campo
 * afuera. No es el pueblo y no es el obelisco: es el borde. La aventura
 * sucede dentro del alcance del Umbral de Castronegro sin tocar nunca su
 * centro.
 *
 * POR QUÉ ACÁ Y NO EN OTRO LADO: v0.7 §11 asigna a Agua Blanca / Castronegro
 * el eje «tiempo, observación y memoria». Eso es exactamente esta aventura —
 * un nivel de agua que no baja en dos meses, dos relojes parados a la misma
 * hora, un reflejo que llega tarde. Ponerla en otro punto sería usar el
 * fenómeno equivocado. El Segundo Umbral, el del espacio, es La Legua
 * Perdida, y por eso pasa lejos de acá.
 *
 * NO revela, por diseño:
 *   · la identidad del Primer Rostro
 *   · la verdad completa del Umbral
 *   · la naturaleza de Yog-Sothoth
 *   · la historia del anillo
 *
 * EL NOMBRE VIEJO: v0.7 §12 fija que «Agua Blanca» es como figura el lugar en
 * los registros coloniales, y que Castronegro es lo que Bernardo funda encima
 * en 1680. En 1924 nadie dice Agua Blanca: está escrito en el papel y nada
 * más. Aparece UNA vez, en el asiento catastral que copia Ignacio, y el
 * escribiente que se lo explica cree que habla de un mineral. Esa es toda la
 * conexión, y es de sólo lectura: ningún NPC lo pronuncia y el Keeper no
 * puede desarrollarlo.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { AGUA_QUIETA_LOGICA } from './aguaquieta.logica.ts';
import contenido from './agua-quieta.contenido.json' with { type: 'json' };

export const AGUA_QUIETA: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  AGUA_QUIETA_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
);
