/**
 * EL SUEÑO DEBIDO — quinta aventura. Julio de 1927. Villa Requena, otra vez.
 *
 * El contenido vive en `sueno-debido.contenido.json` y la lógica de sus escenas
 * en `suenodebido.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ TRAE DE NUEVO, Y POR QUÉ ESTA ES LA QUINTA Y NO OTRA:
 *
 * 1. ES LA PRIMERA CONTINUACIÓN DIRECTA. Las cuatro anteriores se podían jugar
 *    sueltas y la cuarta, además, LEÍA lo que había pasado en las tres previas
 *    —cuántas marcas del Círculo Rojo traía el investigador—. Ésta va un paso
 *    más lejos: lee CUÁL de los cinco desenlaces de El Invierno Debido eligió,
 *    y la carta de apertura y el libro de turnos se escriben distintos en las
 *    cinco ramas. Se puede jugar suelta; entonces cae en la rama de irse sin
 *    decidir nada, que para Villa Requena es la misma cosa que no haber venido.
 *
 * 2. ES LA PRIMERA CON DOS MUNDOS. Tres noches, tres escenas de sueño, y lo
 *    que se trae de cada una sólo cierra contra algo de la vigilia: la ronda
 *    del brocal no significa nada hasta fechar una tachadura de 1878, y la
 *    quinta hoja no significa nada hasta haber visto quién está movido en una
 *    foto de 1880. El rompecabezas se arma cruzando los dos lados, no
 *    avanzando por uno.
 *
 * 3. REPARTE LAS TIRADAS, QUE ERA UNA DEUDA. Las cuatro aventuras anteriores
 *    pidieron `descubrir` doce veces y dejaron CATORCE habilidades del sistema
 *    sin usar una sola vez. Acá entran, por primera vez en el proyecto,
 *    Primeros Auxilios, Escuchar, Historia, Uso de Bibliotecas, Fotografía,
 *    Ocultismo, Antropología, Intimidar y Labia. Si la campaña nunca pone a
 *    prueba lo que el jugador eligió al repartir puntos, la creación de
 *    personaje es un formulario y no una decisión.
 *
 * 4. LA RAMA HOSTIL EXISTE DE VERDAD. Si el año pasado le fue encima a Cirilo
 *    Sosa, Ramona no colabora: el tema por Persuasión desaparece y en su lugar
 *    aparece uno por Intimidar, que da la misma información y cuesta actitud
 *    en vez de ganarla. No es un castigo por haber peleado —la información se
 *    consigue igual— es que no se consigue del mismo modo ni sale gratis.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CANON. Quinto Umbral — sueño (Biblia v0.7 §11). Los siete Umbrales son
 * manifestaciones de una misma estructura y su TEMA es canon aunque los
 * nombres geográficos no lo sean; las cuatro aventuras anteriores ya venían
 * calzando en orden —tiempo/observación, espacio, identidad, muerte— sin que
 * el catálogo lo dijera en voz alta.
 *
 * Se apoya además en §4 (la memoria futura puede ser incompleta, desordenada
 * o mal interpretada) y en §2 (la observación a través del Umbral puede ser
 * recíproca: quien mira puede ser mirado). El reflejo que tarda en alcanzar
 * al observador es §5 de la Operativa v0.8, elemento recurrente del agua
 * anómala, y acá vuelve por tercera vez en la campaña.
 *
 * NO ASCIENDE NADA A CANON NUEVO. La quinta hoja no se transcribe, la lista no
 * se explica, y la hipótesis central —que lo que ata no es pintar sino quedar
 * anotado— tiene evidencia a favor y en contra en las tres ramas. §15: más
 * cerca de la verdad, más información y menos certeza.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS, ITEMS_DE_OCUPACION } from './pregens.ts';
import { SUENO_DEBIDO_LOGICA } from './suenodebido.logica.ts';
import contenido from './sueno-debido.contenido.json' with { type: 'json' };

export const SUENO_DEBIDO: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  SUENO_DEBIDO_LOGICA,
  [ELENA, TOMAS],
  ITEMS_DE_OCUPACION,
);
