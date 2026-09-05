/**
 * EL HOMBRE QUE MIRABA EL AGUA — décima aventura. ~30-40 minutos.
 *
 * El contenido vive en `hombreagua.contenido.json` y la lógica de sus escenas
 * en `hombreagua.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ ES: una VISIÓN EXTENDIDA, recibida en 1928 tres semanas después de la
 * Casa de Díaz, de una tarde de noviembre de 1679 en la orilla de la laguna
 * donde al año siguiente va a fundarse el pueblo.
 *
 * NO es viaje en el tiempo. El Umbral **no** es una puerta física
 * (invariante dura de CANON.md); lo que sí hace, y está en el canon, es
 * dejar «recibir fragmentos de otros puntos temporales» (v0.7 §5.2) y
 * «reflejar otros momentos» (§1.3). Por eso la aventura está fechada en el
 * catálogo en 1928 —cuando se recibe— y no en 1679: el catálogo ordena por
 * fecha diegética y una entrada de 1679 aparecería antes que Agua Quieta en
 * la pantalla de inicio.
 *
 * SE JUEGA CON EL PROPIO INVESTIGADOR, dentro de la visión, con su ficha y
 * su inventario. No en el cuerpo de Bernardo: `investigadoresDe`
 * (engine.ts) hace que al continuar campaña gane el investigador anterior,
 * así que una aventura encadenada no puede imponer protagonista propio sin
 * tocar el motor — y no hacía falta tocarlo.
 *
 * LO QUE ENTREGA, y que ninguna otra aventura entrega:
 *   · Bernardo antes de ser Bernardo: un letrado con plata y papeles
 *     ajenos, no un brujo. El brujo de trescientos años es el RESULTADO.
 *   · Su primer error, en vivo: lee un reflejo como una orden dirigida a él.
 *   · El origen del gesto que en 1926 sobrevive degradado como el Círculo
 *     Rojo — grabar el límite y anotar lo que no se puede anotar en otro
 *     lado. El jugador ata ese cabo, no el motor (va por `jugadorNota`).
 *   · Reciprocidad (v0.7 §2) literal: él te ve, y verte le sirve de prueba.
 *
 * NO revela, por diseño y por CANON.md § "Lo sellado":
 *   · quiénes construyeron el primer anillo, ni si existe un primero — los
 *     papeles dicen «recuperado», nunca «hecho por», y la cadena de copias
 *     no tiene principio anotado
 *   · la identidad del Primer Rostro
 *   · qué es el Archivista, ni qué es Puddock
 *
 * Nivel de canon: CANON_SETTING. Amplía sin cerrar, que es la regla de oro
 * (v0.7 §15): más información, menos certeza.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { EL_HOMBRE_QUE_MIRABA_EL_AGUA_LOGICA } from './hombreagua.logica.ts';
import contenido from './hombreagua.contenido.json' with { type: 'json' };

export const EL_HOMBRE_QUE_MIRABA_EL_AGUA: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  EL_HOMBRE_QUE_MIRABA_EL_AGUA_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
);
