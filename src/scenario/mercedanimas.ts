/**
 * LA MERCED DE LAS ÁNIMAS — Acto II/III. San Juan colonial, 1710.
 *
 * El contenido vive en `mercedanimas.contenido.json` y la lógica de sus
 * escenas en `mercedanimas.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DÓNDE PASA: San Juan de la Frontera, Corregimiento de Cuyo, Capitanía
 * General de Chile, 1710 — treinta y seis años después de *El Círculo Rojo*
 * y a 1300 km del paraje original. Continúa directamente de *La Grieta del
 * Zonda* (cruzar la grieta transporta físicamente, excepción de canon
 * acotada — ver CANON.md).
 *
 * BIFURCACIÓN DE UN SOLO CAMINO. La escena de la celda del convento, a
 * medianoche, ofrece dos salidas — el scriptorium de Fray Ignacio (Rama A)
 * o la ventana hacia los cañaverales con Takillpa (Rama B) — y ninguna
 * vuelve a un lugar compartido. Mismo patrón de mapa asimétrico que el
 * sótano de *El Vigésimo*.
 *
 * RAMA A: Fray Ignacio es agente temprano del Círculo Rojo real (no una
 * "Cofradía" inventada — ver ROADMAP.md §3.2-quattuorquadragies y la entrada
 * de esta aventura). Combate contra el Pólipo Septentrional, clímax
 * pintando el primer círculo de almagre de este lado, cierre firmando las
 * actas del Cabildo.
 *
 * RAMA B: Takillpa enseña la versión huarpe de «Cerrarle el paso»
 * (`cerrarle-el-paso-huarpe`, `rules/hechizos.ts`) — mismo hechizo en
 * espíritu que el de 1674, sin confirmar el vínculo (sigue sellado quién
 * levantó la piedra original). Combate contra el Vagabundo Dimensional,
 * clímax grabando la marca, cierre como fugitivo.
 *
 * La familia Sosa de esta aventura (Josefa, su hijo recién nacido) es la
 * misma sangre que Eusebio Sosa (*La Grieta del Zonda*, 1930) y Ramona/
 * Cirilo Sosa (*El Invierno Debido*, Villa Requena, 1926) — migrada
 * generaciones atrás. «Corregir a quienes nacen zurdos en cierta sangre»
 * pasa acá, en su origen.
 *
 * Nivel de canon: pista parcial, no revelación final. Ninguna escena
 * confirma la identidad del Círculo Rojo, quién levantó la piedra de 1674,
 * ni si hay más nodos que Castronegro y San Juan — eso sigue sellado.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { KIT_DE_1930 } from './kit1930.ts';
import { LA_MERCED_DE_LAS_ANIMAS_LOGICA } from './mercedanimas.logica.ts';
import contenido from './mercedanimas.contenido.json' with { type: 'json' };

export const LA_MERCED_DE_LAS_ANIMAS: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  LA_MERCED_DE_LAS_ANIMAS_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
  // Por si la partida viene de una Grieta del Zonda jugada antes de que
  // existiera el kit: el motor se lo da sólo a quien nunca lo tuvo.
  KIT_DE_1930,
);
