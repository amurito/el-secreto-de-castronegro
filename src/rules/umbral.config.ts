/**
 * ★★★ ESCALAS DE EXPOSICIÓN Y ESTABILIDAD — TODAS LAS CONSTANTES ACÁ ★★★
 *
 * Nicolás dejó estas escalas abiertas ("no lo sé aún"), así que van valores
 * PROVISIONALES, todos juntos en este archivo, para que los ajustes después de
 * jugar — que es cuando vas a saber qué querés.
 *
 * Si algo se siente demasiado rápido o demasiado lento, se toca ACÁ y sólo acá.
 * Ningún otro archivo del proyecto tiene números de Umbral hardcodeados.
 *
 * Las dos variables (v0.9 §7):
 *
 *   EXPOSICIÓN  0 → 100, ASCENDENTE.
 *     Contacto acumulado con el Umbral. NO baja con descanso ni con tiempo.
 *     Mide cuánto te tocó el fenómeno, no cuánto te asustaste.
 *
 *   ESTABILIDAD 100 → 0, DESCENDENTE.
 *     Coherencia de la percepción temporal y de realidad. SÍ se recupera
 *     parcialmente por anclaje: rutina, testigos que confirman tu versión,
 *     objetos con fecha verificable.
 *
 * La regla que estas escalas tienen que preservar (v0.9 §7):
 *   un investigador puede tener SAN alta y estar profundamente contaminado.
 *   SAN y Exposición NO se convierten una en otra.
 */

import type { UmbralThreshold } from '../shared/types.ts';

// ─────────────────────────────────────────────────────────────────────────────
// UMBRALES DE EXPOSICIÓN — irreversibles. Cruzarlos es un hecho, no un estado.
// ─────────────────────────────────────────────────────────────────────────────

export const EXPOSURE_THRESHOLDS: Array<{
  threshold: UmbralThreshold;
  at: number;
  label: string;
  description: string;
}> = [
  {
    threshold: 'FIRST_CONTACT',
    at: 10,
    label: 'PRIMER CONTACTO',
    description:
      'Algo no encaja. Todavía puede explicarse con cansancio, mala luz o memoria imprecisa.',
  },
  {
    threshold: 'RECIPROCITY',
    at: 30,
    label: 'RECIPROCIDAD',
    description:
      'La sospecha de que el fenómeno responde a la observación. Mirar es ser mirado.',
  },
  {
    threshold: 'CONTAMINATION',
    at: 55,
    label: 'CONTAMINACIÓN',
    description:
      'Recuerdos que no le pertenecen. Objetos, nombres y rostros que llegan sin origen.',
  },
  {
    threshold: 'DISSOLUTION',
    at: 80,
    label: 'DISOLUCIÓN',
    description:
      'Presente y visión dejan de distinguirse con fiabilidad. La secuencia deja de ser una sola.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CUÁNTO SUBE LA EXPOSICIÓN — por tipo de contacto
// ─────────────────────────────────────────────────────────────────────────────

export const EXPOSURE_GAIN = {
  /** Mirar una superficie anómala sin que pase nada evidente. */
  passiveObservation: 2,
  /** Mirar sostenidamente, a propósito, buscando algo. */
  deliberateObservation: 4,
  /** Presenciar una anomalía inequívoca. */
  witnessAnomaly: 6,
  /** Recibir un eco temporal: información de otro momento. */
  temporalEcho: 9,
  /** Recibir una visión completa. */
  vision: 14,
  /** Contacto físico con una manifestación. */
  physicalContact: 18,
  /** Portar un objeto vinculado al Umbral, por escena. */
  bearingArtifact: 3,
} as const;

/** Tope de exposición ganable en un solo turno. Evita saltos abruptos. */
export const MAX_EXPOSURE_PER_TURN = 20;

// ─────────────────────────────────────────────────────────────────────────────
// RENDIMIENTOS DECRECIENTES POR FUENTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La misma fuente rinde cada vez menos.
 *
 * EL PROBLEMA QUE RESUELVE. Medido sobre dos partidas del mismo motor:
 *
 *   jugando a lo ancho, cada acción una vez, 40 turnos → Exposición 26
 *   asomándose al aljibe veinte veces y nada más       → Exposición 100
 *
 * La escala no era corta: una acción repetible entregaba exposición completa
 * cada vez, sin tope y para siempre. El que investigaba a fondo terminaba en
 * 26 y el que apretaba el mismo botón terminaba en 100, que es exactamente al
 * revés de lo que un juego de investigación quiere premiar.
 *
 * POR QUÉ ESTO Y NO BAJAR LOS NÚMEROS. La justificación no es de balance sino
 * de qué mide la variable. La Exposición mide cuánto te TOCÓ el fenómeno, y la
 * décima mirada al mismo reflejo no te toca más que la segunda. Mirar otra
 * cosa, sí. Bajar la escala habría castigado por igual al que explora.
 *
 * No contradice el canon: el canon dice que la Exposición no baja con
 * descanso, y esto no la baja. Sólo deja de subir por lo mismo.
 *
 * El índice es la cantidad de veces que ESA fuente ya dio exposición. Pasado
 * el final del array se aplica el último valor.
 */
export const RENDIMIENTO_POR_REPETICION = [1, 0.5, 0.25, 0];

/**
 * Piso: si la fuente todavía rinde algo, rinde al menos esto. Sin el piso, una
 * fuente de 2 puntos se apagaría en la segunda repetición por redondeo, y las
 * fuentes chicas dejarían de existir antes que las grandes sin que eso lo haya
 * decidido nadie.
 */
export const RENDIMIENTO_MINIMO = 1;

// ─────────────────────────────────────────────────────────────────────────────
// ESTABILIDAD — pérdida y recuperación
// ─────────────────────────────────────────────────────────────────────────────

export const STABILITY_LOSS = {
  /** Dos evidencias que no pueden ser ciertas al mismo tiempo. */
  contradiction: 5,
  /** Un objeto o dato fuera de su tiempo. */
  anachronism: 8,
  /** Un recuerdo propio que resulta ser falso o ajeno. */
  falseMemory: 12,
  /** Una visión que el investigador no puede ubicar en el tiempo. */
  unplaceableVision: 15,
  /** Ver el mismo acontecimiento dos veces de forma distinta. */
  doubledEvent: 20,
} as const;

export const STABILITY_RECOVERY = {
  /** Descanso en un lugar sin anomalías. */
  rest: 4,
  /** Un testigo confirma la versión del investigador. */
  corroboration: 7,
  /** Verificar una fecha o un hecho contra un registro externo. */
  externalRecord: 6,
  /** Rutina prolongada, entre sesiones. */
  betweenSessions: 10,
} as const;

/**
 * TECHO DE ESTABILIDAD SEGÚN EXPOSICIÓN.
 *
 * Entre una aventura y la siguiente pasan meses, y meses de rutina recuperan
 * Estabilidad: eso el canon lo permite —se recupera por anclaje— y es lo que
 * hace jugable una campaña.
 *
 * Pero sin techo se recupera SIEMPRE al 100, y entonces ninguna de las dos
 * variables del Umbral arrastra daño de una aventura a la otra: la Exposición
 * porque no baja, la Estabilidad porque se restaura entera. La campaña dejaría
 * de acumular, que es justamente lo que una campaña tiene que hacer.
 *
 * El techo baja con la exposición: cuanto más te tocó el fenómeno, menos podés
 * volver a anclarte del todo. Un cuarto de la exposición, redondeado.
 *
 * Es una decisión de diseño sobre mecánica propia, no una ampliación de canon
 * —el canon no dice nada del techo de la Estabilidad— y se revierte poniendo
 * este divisor en 0.
 */
export const TECHO_ESTABILIDAD_POR_EXPOSICION: number = 4;

export const techoDeEstabilidad = (exposicion: number): number =>
  TECHO_ESTABILIDAD_POR_EXPOSICION === 0
    ? 100
    : Math.max(20, 100 - Math.round(exposicion / TECHO_ESTABILIDAD_POR_EXPOSICION));

/** Tope de recuperación por escena. La estabilidad no se restaura de golpe. */
export const MAX_STABILITY_RECOVERY_PER_SCENE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// EFECTOS MECÁNICOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Con estabilidad por debajo de estos valores, las tiradas que dependen de
 * distinguir el presente de una visión reciben dados de penalización.
 * Habilidades afectadas: Descubrir, Escuchar, Psicología, Historia, Orientarse.
 */
export const STABILITY_PENALTY_TIERS = [
  { below: 40, penaltyDice: 1 },
  { below: 20, penaltyDice: 2 },
];

export const STABILITY_AFFECTED_SKILLS = [
  'descubrir',
  'escuchar',
  'psicologia',
  'historia',
  'orientarse',
];

/**
 * Interacción SAN ↔ Exposición.
 * Con exposición alta, un fallo de SAN duele más: el horror tiene dónde agarrarse.
 * NO es conversión: la exposición no consume SAN por sí sola.
 */
export const SAN_EXTRA_LOSS_BY_EXPOSURE = [
  { aboveExposure: 30, extraSanLoss: 1 },
  { aboveExposure: 55, extraSanLoss: 2 },
  { aboveExposure: 80, extraSanLoss: 3 },
];

/** Permeabilidad del mundo: cuánto sube al ocurrir una manifestación. */
export const WORLD_PERMEABILITY_GAIN = {
  minorAnomaly: 2,
  majorAnomaly: 5,
  manifestation: 10,
} as const;
