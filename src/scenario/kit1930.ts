/**
 * EL KIT DE 1930 — lo que un investigador de esta época lleva en los
 * bolsillos y que, cuando la Grieta del Zonda lo tira a 1710, deja de ser
 * cotidiano.
 *
 * No es equipo de ocupación (`ITEMS_DE_OCUPACION`: el maletín de Elena, la
 * cámara de Tomás, que dependen de quién sea) sino equipo de ÉPOCA: lo lleva
 * quien juegue, sea pregenerado o creado a mano. Por eso no tiene dueño acá:
 * el motor se lo da al investigador activo al abrir la aventura que lo
 * declara en `Scenario.kitDeEpoca` (ver `createCampaign`).
 *
 * Reglas que el motor aplica y que importan para quien retoque esto:
 *  - Si ya cruzó de la aventura anterior (lo llevaba encima), NO se vuelve a
 *    dar: sería duplicarlo.
 *  - Si la campaña anterior ya lo conoció y lo perdió o lo descartó, tampoco.
 *    «Soltar» es para siempre y regalarlo de nuevo en la aventura siguiente
 *    contradiría el botón. Sólo se da a quien nunca lo tuvo: la partida
 *    guardada de antes de que existiera el kit.
 *
 * Nota de época: se nombra «encendedor de bencina» y no «Zippo» a propósito.
 * El Zippo sale a la venta en 1933; en 1930 se llevaba de otra marca.
 */

import type { Item } from '../shared/types.ts';

/** Sin propiedades: lo que cada objeto hace lo decide la escena, no el ítem. */
const base = (
  id: string, name: string, shortDescription: string, categoria: Item['categoria'],
): Item => ({
  id, name, shortDescription, categoria,
  owner: null,
  carried: true,
  roto: false,
  publicProperties: [],
  hiddenProperties: [],
  discoveredProperties: [],
  conditionalProperties: [],
  temporalProperties: [],
  canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
  usageCount: 0,
});

export const KIT_DE_1930: Item[] = [
  base(
    'it-encendedor-1930', 'Encendedor de bencina',
    'De metal, con tapa a bisagra y una rueda que raspa el pedernal. Da fuego en el viento, ' +
    'a cualquier hora, sin brasa previa. Nadie de por acá lo sabría explicar.',
    'herramienta',
  ),
  base(
    'it-reloj-pulsera', 'Reloj de pulsera',
    'Cuerda que se da a mano, cristal, un segundero que no se detiene. Marca la hora con una ' +
    'exactitud que a tu alrededor nadie tiene motivos para creer posible.',
    'personal',
  ),
  base(
    'it-linterna-1930', 'Linterna eléctrica',
    'Cuerpo de latón, pilas secas, un vidrio grueso. Da una luz blanca y fija, sin llama ni ' +
    'humo, y se apaga apretando un botón. Las pilas no van a durar para siempre.',
    'herramienta',
  ),
];
