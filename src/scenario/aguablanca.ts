/**
 * AGUA BLANCA — séptima aventura, primer acto. ~1 hora y media.
 *
 * El contenido vive en `agua-blanca.contenido.json` y la lógica de sus escenas
 * en `aguablanca.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DÓNDE PASA: en Castronegro pueblo. No en el partido, no en el borde: en el
 * pueblo. Es el Séptimo Umbral (realidad) y a la vez el centro del Primero,
 * que es de donde la campaña salió en octubre de 1924 sin llegar a tocarlo.
 *
 * POR QUÉ ES DOS AVENTURAS: ver ROADMAP §3.2-terdecies. La 7a es el pueblo y
 * todo lo averiguable desde afuera; la 7b es la Casa de Díaz, y arranca la
 * misma noche que termina ésta. El corte es geográfico y no dramático para
 * que cada una tenga su propio centro: acá, un pueblo que no mira.
 *
 * LO QUE YA ESTABA ESCRITO SIN SABERLO: en *El Orden Debido*, Remigia dice
 * que su madre iba a misa a Del Valle, treinta leguas de ida, teniendo
 * iglesia a tres, «porque allá la iglesia está, pero no es para nosotros»; y
 * que en setenta y cuatro años no conoció a nadie del pueblo del oeste, que
 * está a tres leguas. Ese pueblo es éste. La sexta lo describió entero desde
 * afuera, por boca de alguien que no quería ir.
 *
 * NO revela, por diseño:
 *   · la identidad del Primer Rostro
 *   · qué es Puddock, qué es el Archivista
 *   · quiénes construyeron el primer anillo, ni si existe
 *   · a Bernardo, que no aparece en este acto
 *
 * EL NOMBRE: v0.7 §12 fija que «Agua Blanca» es como figura el lugar en los
 * registros coloniales. En *Agua Quieta* aparece UNA vez, en un asiento
 * catastral, y el escribiente que lo explica cree que habla de un mineral.
 * Acá es el título, y está debajo de una mano de cal en el cartel de la
 * entrada: tapado, no borrado.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { AGUA_BLANCA_LOGICA } from './aguablanca.logica.ts';
import contenido from './agua-blanca.contenido.json' with { type: 'json' };

export const AGUA_BLANCA: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  AGUA_BLANCA_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
);
