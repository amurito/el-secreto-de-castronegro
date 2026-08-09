/**
 * ESCALAS DEL SISTEMA SOCIAL — todas acá, como las del Umbral.
 *
 * Mismo criterio que `umbral.config.ts`: los números se ajustan jugando, y si
 * están repartidos por el código no se ajustan nunca.
 *
 * EL PROBLEMA QUE RESUELVE LA PACIENCIA
 *
 * Sin costo, preguntar es gratis y la estrategia óptima es agotar todos los
 * botones en orden. Eso no es conversar, es vaciar un menú. Y con tiradas
 * sociales sin límite es peor: alcanza con reintentar hasta que salga, así que
 * la habilidad del personaje deja de importar y sólo importa la paciencia del
 * jugador.
 *
 * La paciencia le pone precio a preguntar. No es una barra de maná: es que
 * Rosa tiene que hacer la cena, ya contestó eso, y usted lleva media hora en
 * su cocina. Se recupera con el tiempo del mundo, no con el del jugador —
 * irse y volver más tarde es la manera de recuperarla, y eso es exactamente lo
 * que haría alguien en la mesa.
 */

/** Con cuánta paciencia arranca un NPC. */
export const PACIENCIA_INICIAL = 6;

/** Techo. Volver más tarde recupera, pero no acumula de más. */
export const PACIENCIA_MAXIMA = 6;

export const COSTO = {
  /** Preguntar algo nuevo que el NPC contesta. */
  tema: 1,
  /** Preguntar algo que el NPC esquivó: insistir cansa más que preguntar. */
  insistir: 2,
  /** Tocar un tema cerrado por actitud: es la pregunta que no correspondía. */
  cerrado: 2,
} as const;

/** Paciencia que vuelve por cada tramo de tiempo del mundo. */
export const RECUPERACION = {
  minutosPorPunto: 20,
} as const;

/**
 * La actitud modifica la tirada social. Es la traducción mecánica de que a
 * alguien que confía en vos no hace falta convencerlo igual.
 */
export const ACTITUD = {
  /** A partir de acá, un dado de bonificación. */
  bonificaDesde: 40,
  /** Por debajo de acá, un dado de penalización. */
  penalizaBajo: 0,
} as const;

/**
 * Reintentar un tema que ya esquivó tiene penalización, salvo que haya
 * cambiado algo: más actitud, o una prueba nueva en la mano. Es la regla de
 * "no se repite una tirada sin circunstancia nueva", puesta en números.
 */
export const REINTENTO = {
  penalizacionDados: 1,
  /** Cuánta actitud hay que haber ganado para que el reintento sea limpio. */
  actitudQueLimpia: 10,
} as const;

/** Actitud que se pierde al quemarle la paciencia a alguien hasta el fondo. */
export const ACTITUD_POR_AGOTAR = -5;
