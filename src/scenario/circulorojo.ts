/**
 * EL CÍRCULO ROJO — undécima aventura. ~una hora.
 *
 * El contenido vive en `circulorojo.contenido.json` y la lógica de sus
 * escenas en `circulorojo.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ ES: la única aventura del proyecto que NO se juega en el siglo XX.
 * Agua Blanca en 1674 —seis años antes de que Bernardo Díaz baje del barco
 * y le ponga nombre al lugar—, con el grupo que el canon nombra desde hace
 * tiempo y nunca se había mostrado: el Círculo Rojo.
 *
 * SE JUEGA CON ELENCO PROPIO (`JUANA` y `FRAY_MATEO`, en `pregens.ts`), y
 * es por eso una campaña suelta: no hereda de ninguna aventura ni le hereda
 * a ninguna. Un investigador de 1674 no puede continuar en 1924, y forzar
 * ese encadenamiento habría exigido cambiar qué significa «empezar campaña»
 * en el proyecto entero. Los cabos con las otras diez los ata el JUGADOR
 * leyendo, no el motor: van por `jugadorNota`, el mismo mecanismo con el
 * que "El Hombre que Miraba el Agua" ya conecta con "El Invierno Debido".
 *
 * LO QUE ENTREGA, y que ninguna otra aventura entrega:
 *   · El obelisco explicado, una sola vez y bien: no es un altar, es un
 *     cartel. Lo pusieron para MARCAR UN LÍMITE que ya estaba (CANON.md
 *     §8), y quien lo puso no dejó nombre ni fecha ni la intención de
 *     dejarlos. Doscientos años después Bernardo va a leerlo como una
 *     puerta, y doscientos cincuenta después un pueblo entero va a
 *     repintarle un círculo sin saber para qué: la tragedia de esta
 *     aventura es que el entendimiento correcto no sobrevive a quienes lo
 *     tuvieron.
 *   · El origen de tres cosas ya publicadas: el punzón escondido en el
 *     sótano de la Casa de Díaz, el primero de los ocho círculos grabados
 *     que se ven en 1679, y la costumbre de «anotar lo que la parroquia no
 *     puede» que en 1895 sigue vigente en un libro parroquial.
 *   · El único hechizo de daño del juego («Cerrarle el paso»), sacado de
 *     haber entendido para qué está puesta la piedra.
 *
 * NO revela, por diseño y por CANON.md § "Lo sellado":
 *   · quiénes construyeron el primer aro, ni si existe un primero — el
 *     inventario dice «recuperado», nunca «hecho», y la única línea que se
 *     acerca está tachada: «no sé si es el primero»
 *   · quiénes levantaron la piedra negra: sin nombre, sin fecha, y sobre
 *     otra piedra más vieja todavía
 *   · la identidad del Primer Rostro, qué es el Archivista, qué es Puddock
 *
 * Nivel de canon: CANON_SETTING. Amplía sin cerrar (v0.7 §15): más
 * información, menos certeza.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { JUANA, FRAY_MATEO } from './pregens.ts';
import { EL_CIRCULO_ROJO_LOGICA } from './circulorojo.logica.ts';
import contenido from './circulorojo.contenido.json' with { type: 'json' };

export const EL_CIRCULO_ROJO: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  EL_CIRCULO_ROJO_LOGICA,
  [JUANA, FRAY_MATEO],
);
