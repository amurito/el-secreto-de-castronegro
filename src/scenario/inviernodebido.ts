/**
 * EL INVIERNO DEBIDO — cuarta aventura. Julio de 1926. ~1 hora y media.
 *
 * El contenido vive en `invierno-debido.contenido.json` y la lógica de sus
 * escenas en `inviernodebido.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ TRAE DE NUEVO, Y POR QUÉ ESTA ES LA CUARTA Y NO OTRA:
 *
 * 1. ES LA PRIMERA QUE SABE LO QUE HICISTE EN LAS ANTERIORES. Las tres marcas
 *    del Círculo Rojo sembradas en Agua Quieta, La Legua Perdida y La Firma
 *    Ajena dejan cada una una consecuencia permanente de alcance mundo, y
 *    ésta las lee con el operador `consecuencia`. La carta que trae al
 *    investigador dice «llegaron tres avisos con su nombre», y la escena
 *    `leer-carta` se escribe distinta según cuántas encontró de verdad —de
 *    cero a tres—. Sin ninguna la aventura se juega igual; con las tres, la
 *    primera línea que lee ya es una respuesta a algo que hizo en 1924.
 *
 * 2. ES LA PRIMERA QUE COBRA MITOS DE CTHULHU. `leer-procedimiento` entrega
 *    cuatro puntos, que bajan el techo de Cordura a 95 para siempre y para
 *    todas las aventuras que vengan después. Está detrás de un aviso
 *    explícito que el jugador tiene que ignorar a propósito: Aurelio le pide
 *    que no dé vuelta la tercera hoja y le avisa que después va a hacer como
 *    que no se lo pidió. El costo sólo es justo si hubo aviso.
 *
 * 3. ES LA PRIMERA CON COMBATE POSIBLE Y EVITABLE. Cirilo Sosa tiene
 *    estadísticas (Pelea 50, rebenque) y una razón legítima: ve a la madre de
 *    setenta y uno saliendo sola de noche a hacer el trabajo de otro. Se lo
 *    puede desactivar hablando, se le puede huir, y se puede pelear. Ninguna
 *    de las tres es la correcta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CANON. El Círculo Rojo aparece en la Biblia v0.7 una sola vez, en la línea
 * temporal (c. 1650–1675, «recuperación de conocimientos/componentes
 * asociados al anillo») y con el estatus más blando: CAMPAÑA PROPUESTA. Esta
 * aventura no lo asciende a organización viva: lo baja a lo que queda de una
 * cuando pasan doscientos setenta años. Dos familias de un pueblo con una
 * obligación heredada que cumplen sin entender, alternando turnos y anotando.
 *
 * Se apoya en §5.1 —el anillo es creación humana, y la identidad de sus
 * creadores «permanece sin resolver»— y NO contesta §14 («¿quiénes
 * construyeron el primer anillo?»): la primera página del libro de turnos
 * lista nueve apellidos anteriores al pueblo, de los cuales siete no existen,
 * y ésa es toda la respuesta que da.
 *
 * NO confirma, por diseño:
 *   · si repintar el círculo sirve de algo. Aurelio salteó un año y no pasó
 *     nada; Ramona sostiene que si sirviera, el daño no se notaría a tiempo.
 *     Hay evidencia para las dos lecturas en las cinco ramas y ninguna
 *     concluyente. Es la regla de oro (§15) aplicada a los desenlaces.
 *   · qué dice la cuarta hoja. El texto no se transcribe en ninguna parte del
 *     juego: se narran sus efectos y nunca su contenido.
 *   · qué son los otros cuatro puntos que Delfina marcó en el mapa.
 *   · nada del Primer Rostro, Yog-Sothoth, el anillo, Puddock ni el Archivista.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS } from './pregens.ts';
import { INVIERNO_DEBIDO_LOGICA } from './inviernodebido.logica.ts';
import contenido from './invierno-debido.contenido.json' with { type: 'json' };

export const INVIERNO_DEBIDO: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  INVIERNO_DEBIDO_LOGICA,
  [ELENA, TOMAS],
);
