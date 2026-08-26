/**
 * EL ORDEN DEBIDO — sexta aventura. ~hora y media.
 *
 * El contenido vive en `orden-debido.contenido.json` y la lógica de sus
 * escenas en `ordendebido.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DÓNDE PASA: cruzando el partido de este a oeste. Arranca en Villa Requena,
 * donde terminaron las dos anteriores, y cada locación queda más al oeste que
 * la anterior. Es la primera aventura de la campaña que VUELVE en vez de ir.
 *
 * DE DÓNDE SALE: de cinco hilos que quedaron colgando y que el jugador
 * reclamó. Delfina Arce tiene dos colecciones de puntos —el mapa de la escuela
 * en El Invierno Debido y los rumores de viajeros en El Sueño Debido— y entre
 * las dos hay cinco lugares mencionados UNA sola vez y nunca visitados. Dos de
 * ellos son las locaciones centrales de acá: el marco de una puerta que ya no
 * tiene puerta, y la base de un molino.
 *
 * POR QUÉ ACÁ Y NO EN OTRO LADO: `canon.ts` reserva el Sexto Umbral para la
 * CAUSALIDAD. Y el motor ya era una máquina de causalidad antes de que esta
 * aventura existiera —`sembrarHerencia` viene arrastrando consecuencias
 * permanentes desde Agua Quieta y los ecos entre aventuras las leen—, así que
 * acá esa mecánica pasa a ser el tema: la pregunta no es qué son estos
 * lugares, es cuál fue primero.
 *
 * LA IMAGEN CENTRAL ES UN CHISTE QUE NO ES UN CHISTE. El marco de una puerta
 * sin casa es un umbral, literalmente, y estaba escrito en el contenido desde
 * la cuarta aventura sin que nadie lo visitara. Está pintado en las cuatro
 * caras de las jambas con la misma mano y la misma vejez, incluidas las dos
 * que en 1902 todavía estaban adentro de una casa: se pintó para cómo está
 * ahora, cuando todavía no estaba así.
 *
 * ESTRENA TRES HABILIDADES, y no por variedad decorativa. `mecanica` y
 * `credito` no se habían pedido NUNCA en cinco aventuras publicadas, y
 * `orientarse` se había pedido una sola vez. Acá son los tres pilares: medir
 * una base y decir qué torre la gastó, conseguir que una mujer de setenta y
 * cuatro te muestre los papeles del campo, y reconstruir en qué orden pasó lo
 * que acaba de pasar cuando salís del otro lado del vano.
 *
 * NO revela, por diseño:
 *   · qué es lo que asoma por encima de la arboleda del oeste
 *   · cuál de las dos lecturas del orden es la verdadera
 *   · quién manda el almagre, quién paga el giro, quién exige la cláusula
 *   · nada del pueblo del oeste más allá de que existe y que no se nombra
 *
 * NO ENTRA AL PUEBLO. El obelisco se ve a tres leguas, con el sol bajo, y no
 * se puede decir si es un campanario, un molino sin aspas o una piedra parada.
 * Ése es todo el guiño. El módulo original es la séptima aventura y es a la
 * vez el centro del Primer Umbral: ver `CANON-MODULO-ORIGINAL.md`.
 *
 * CANON. Sexto Umbral — causalidad (Biblia v0.7 §11 y `canon.ts`). Se apoya en
 * §4 (memoria futura: incompleta, desordenada o mal interpretada) y en §2
 * (reciprocidad). El reflejo que tarda de Agua Quieta —v0.8 §5, elemento
 * recurrente del agua anómala— vuelve acá con el signo invertido: lo que cruza
 * el vano no llega tarde, llega temprano.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo y no
 * asciende nada nuevo. Regla de oro v0.7 §15: más cerca de la verdad, más
 * información y menos certeza — los cuatro desenlaces tienen las dos lecturas
 * completas y ninguno decide cuál vale.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS } from './pregens.ts';
import { ORDEN_DEBIDO_LOGICA } from './ordendebido.logica.ts';
import contenido from './orden-debido.contenido.json' with { type: 'json' };

export const ORDEN_DEBIDO: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  ORDEN_DEBIDO_LOGICA,
  [ELENA, TOMAS],
);
