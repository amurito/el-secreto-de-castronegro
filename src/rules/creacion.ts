/**
 * CREACIÓN DE INVESTIGADOR — CoC 7e, cap. 3 (pp. 30-47).
 *
 * PURO. Las decisiones las toma el jugador, los dados los pone quien llame, y
 * acá sólo viven las reglas: qué se tira, qué modifica la edad, cuántos puntos
 * de habilidad dan las características, y —lo más importante— **si un reparto
 * de puntos es legal**.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTOS DADOS NO VAN A LA CADENA VERIFICABLE
 *
 * Todo el azar de este proyecto es auditable: semilla comprometida al empezar,
 * cada tirada reproducible con HMAC. Los dados de creación NO.
 *
 * No es una excepción cómoda: es que la cadena protege las tiradas que **no se
 * pueden repetir**, y éstas sí se pueden. El manual lo dice explícitamente
 * (p. 47, «Option 1: Start Over»): si no te gustan tus tiradas, las tirás de
 * nuevo. Proteger criptográficamente un dado que el reglamento te deja repetir
 * sería teatro, y este proyecto ya decidió una vez no hacer teatro.
 *
 * Desde el primer turno de juego, todo vuelve a la cadena.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ LAS OCUPACIONES SON NUESTRAS
 *
 * La lista de ocupaciones del manual es contenido de Chaosium, y además está
 * escrita para otro mundo: un piloto, un hacker y un misionero no ayudan a
 * jugar en la provincia de Buenos Aires en 1924. Las nuestras viven en
 * `src/scenario/ocupaciones.ts`. Lo que se toma del libro es la ESTRUCTURA
 * —ocho habilidades, puntos según características, rango de Crédito—, que es
 * mecánica.
 */

import type {
  Characteristics, CharacteristicId, SkillId, SkillValue,
} from '../shared/types.ts';
import { SKILLS, SKILL_BY_ID } from './skills.ts';

// ─────────────────────────────────────────────────────────────────────────────
// CARACTERÍSTICAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cómo se tira cada característica (p. 31).
 *   3D6 × 5           → FUE, CON, DES, APA, POD
 *   (2D6 + 6) × 5     → TAM, INT, EDU
 * Las segundas no bajan de 40: son las que no admiten un desastre.
 */
export const FORMULA: Record<CharacteristicId, '3d6' | '2d6+6'> = {
  STR: '3d6', CON: '3d6', DEX: '3d6', APP: '3d6', POW: '3d6',
  SIZ: '2d6+6', INT: '2d6+6', EDU: '2d6+6',
};

export type Dado = () => number;

export function tirarCaracteristica(formula: '3d6' | '2d6+6', d6: Dado): number {
  const tres = d6() + d6() + d6();
  return formula === '3d6' ? tres * 5 : (d6() + d6() + 6) * 5;
}

export function tirarCaracteristicas(d6: Dado): Characteristics {
  const out = {} as Characteristics;
  for (const id of Object.keys(FORMULA) as CharacteristicId[]) {
    out[id] = tirarCaracteristica(FORMULA[id], d6);
  }
  return out;
}

/** Suerte: 3D6 × 5 (p. 34). */
export const tirarSuerte = (d6: Dado) => (d6() + d6() + d6()) * 5;

// ─────────────────────────────────────────────────────────────────────────────
// EDAD
// ─────────────────────────────────────────────────────────────────────────────

export interface EfectoEdad {
  /** Puntos a repartir entre FUE, CON y DES. Ya en negativo. */
  restaFisica: number;
  /** Resta directa a APA. */
  restaApariencia: number;
  /** Resta a repartir entre FUE y TAM (sólo adolescentes). */
  restaJuventud: number;
  /** Comprobaciones de mejora de EDU. */
  chequeosEdu: number;
  /** Resta directa a Movimiento (p. 34: -1 en los 40, -2 en los 50, ... -5 en los 80). */
  restaMovimiento: number;
  /** Los adolescentes tiran Suerte dos veces y se quedan con la mejor. */
  dobleSuerte: boolean;
  etiqueta: string;
}

/**
 * Modificadores por edad (p. 34, Quick Reference: Investigator Generation).
 * Verificado contra el manual licenciado — antes el tramo de 70 hacía de
 * catch-all para 70+ y el de 80 nunca se distinguía; con EDAD_MAXIMA en 79
 * era inalcanzable en la práctica, pero estaba mal declarado igual.
 */
export function efectoEdad(edad: number): EfectoEdad {
  const base = {
    restaFisica: 0, restaApariencia: 0, restaJuventud: 0,
    chequeosEdu: 0, restaMovimiento: 0, dobleSuerte: false, etiqueta: '',
  };
  if (edad < 20) {
    return { ...base, restaJuventud: 5, chequeosEdu: 0, dobleSuerte: true,
      etiqueta: 'Joven: fuerte de ánimo y flojo de todo lo demás. Tira Suerte dos veces.' };
  }
  if (edad < 40) return { ...base, chequeosEdu: 1, etiqueta: 'En su mejor momento.' };
  if (edad < 50) {
    return { ...base, restaFisica: 5, restaApariencia: 5, chequeosEdu: 2, restaMovimiento: 1,
      etiqueta: 'Cuarenta: se nota en el cuerpo y se nota en lo que sabe.' };
  }
  if (edad < 60) {
    return { ...base, restaFisica: 10, restaApariencia: 10, chequeosEdu: 3, restaMovimiento: 2,
      etiqueta: 'Cincuenta: ya no corre, pero leyó mucho.' };
  }
  if (edad < 70) {
    return { ...base, restaFisica: 20, restaApariencia: 15, chequeosEdu: 4, restaMovimiento: 3,
      etiqueta: 'Sesenta: el cuerpo cobra y la cabeza cobra a favor.' };
  }
  if (edad < 80) {
    return { ...base, restaFisica: 40, restaApariencia: 20, chequeosEdu: 4, restaMovimiento: 4,
      etiqueta: 'Setenta: cada escalera es una tirada.' };
  }
  return { ...base, restaFisica: 80, restaApariencia: 25, chequeosEdu: 4, restaMovimiento: 5,
    etiqueta: 'Ochenta o más: lo que queda, queda a fuerza de terquedad.' };
}

export const EDAD_MINIMA = 15;
export const EDAD_MAXIMA = 79;

/**
 * Comprobación de mejora de EDU (p. 34): 1D100; si supera el valor actual,
 * sube 1D10. Misma regla que la fase de desarrollo, y no es casualidad: en
 * CoC aprender es siempre lo mismo.
 */
export const mejoraEdu = (edu: number, d100: number) => d100 > edu;

// ─────────────────────────────────────────────────────────────────────────────
// PUNTOS DE HABILIDAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fórmula de puntos de ocupación. El manual las escribe como «EDU × 4» o
 * «EDU × 2 + DES × 2»; acá se representa igual pero como datos, para que una
 * ocupación nueva no necesite código.
 */
export interface FormulaPuntos {
  /** Multiplicadores fijos. */
  fijos: Partial<Record<CharacteristicId, number>>;
  /**
   * Multiplicador que el jugador elige entre varias características.
   * «EDU × 2 + o bien DES × 2 o bien FUE × 2».
   */
  eleccion?: { entre: CharacteristicId[]; multiplicador: number };
}

export function puntosDeOcupacion(
  f: FormulaPuntos, ch: Characteristics, elegida?: CharacteristicId,
): number {
  let total = 0;
  for (const [id, mult] of Object.entries(f.fijos)) {
    total += ch[id as CharacteristicId] * (mult as number);
  }
  if (f.eleccion) {
    const c = elegida && f.eleccion.entre.includes(elegida) ? elegida : f.eleccion.entre[0]!;
    total += ch[c] * f.eleccion.multiplicador;
  }
  return total;
}

/** Intereses personales: INT × 2, a lo que sea (p. 36). */
export const puntosPersonales = (ch: Characteristics) => ch.INT * 2;

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DEL REPARTO
// ─────────────────────────────────────────────────────────────────────────────

export interface Reparto {
  /** Puntos de ocupación asignados, por habilidad. */
  ocupacion: Record<SkillId, number>;
  /** Puntos de interés personal asignados, por habilidad. */
  personal: Record<SkillId, number>;
}

export interface Ocupacion {
  id: string;
  nombre: string;
  descripcion: string;
  /** Las ocho habilidades profesionales. */
  habilidades: SkillId[];
  /** Rango de Crédito. Hay que poner puntos dentro de ese rango. */
  credito: { min: number; max: number };
  formula: FormulaPuntos;
  /** Época en que la ocupación tiene sentido, para el sabor. */
  nota?: string;
  /**
   * Cómo se dirige a esta persona alguien de campo, en 1920. Con qué se cubre
   * un investigador cuya ocupación no tiene tratamiento propio: «don»/«doña» +
   * el nombre, que es lo que se usa en el campo con cualquiera al que se le
   * debe respeto y no título.
   */
  tratamiento?: { m: string; f: string };
  /** Si está, esta ocupación sólo admite ese género en el mundo de 1920. */
  soloGenero?: 'm' | 'f';
  /**
   * Ids de `rules/armas.ts` con los que esta ocupación puede empezar armada.
   * El primero no se preselecciona en la interfaz: elegir es siempre
   * explícito. Ausente o vacío = esta ocupación no ofrece arma inicial.
   */
  armasPermitidas?: string[];
  /**
   * El objeto con el que esta ocupación siempre empieza — a diferencia del
   * arma, no es una elección del jugador. `id` es fijo y compartido entre
   * ocupaciones que dan «el mismo objeto» (p. ej. periodista y fotógrafo
   * ambulante comparten cámara): así una escena que lo busca por id no le
   * importa qué ocupación se lo dio.
   */
  itemInicial?: { id: string; nombre: string; shortDescription: string };
}

export interface ProblemaReparto {
  campo: string;
  mensaje: string;
}

/**
 * ¿Es legal este reparto?
 *
 * Esto lo valida el MOTOR, no la interfaz. Es el mismo principio que rige todo
 * el proyecto aplicado a la ficha: el cliente propone un reparto y el motor
 * decide si existe. Una ficha inventada por el navegador entraría a la campaña
 * como cualquier otra y arruinaría todas las garantías de más adelante.
 */
export function validarReparto(
  ocupacion: Ocupacion, ch: Characteristics, reparto: Reparto,
  elegida?: CharacteristicId,
): ProblemaReparto[] {
  const problemas: ProblemaReparto[] = [];
  const disponiblesOcup = puntosDeOcupacion(ocupacion.formula, ch, elegida);
  const disponiblesPers = puntosPersonales(ch);

  const suma = (r: Record<SkillId, number>) =>
    Object.values(r).reduce((a, b) => a + (b || 0), 0);

  const gastadosOcup = suma(reparto.ocupacion);
  const gastadosPers = suma(reparto.personal);

  if (gastadosOcup > disponiblesOcup) {
    problemas.push({
      campo: 'ocupacion',
      mensaje: `Gastaste ${gastadosOcup} puntos de ocupación y tenés ${disponiblesOcup}.`,
    });
  }
  if (gastadosPers > disponiblesPers) {
    problemas.push({
      campo: 'personal',
      mensaje: `Gastaste ${gastadosPers} puntos personales y tenés ${disponiblesPers}.`,
    });
  }

  // Los puntos de ocupación SÓLO van a las habilidades de la ocupación.
  for (const [skill, puntos] of Object.entries(reparto.ocupacion)) {
    if (!puntos) continue;
    if (!ocupacion.habilidades.includes(skill) && skill !== 'credito') {
      problemas.push({
        campo: skill,
        mensaje: `«${SKILL_BY_ID[skill]?.label ?? skill}» no es una habilidad de ${ocupacion.nombre}.`,
      });
    }
  }

  for (const r of [reparto.ocupacion, reparto.personal]) {
    for (const [skill, puntos] of Object.entries(r)) {
      if (!puntos) continue;
      if (puntos < 0) problemas.push({ campo: skill, mensaje: 'No se pueden asignar puntos negativos.' });
      if (!SKILL_BY_ID[skill]) problemas.push({ campo: skill, mensaje: `No existe la habilidad «${skill}».` });
    }
  }

  // Mitos de Cthulhu nunca se compra (p. 36).
  if ((reparto.ocupacion['mitos'] ?? 0) + (reparto.personal['mitos'] ?? 0) > 0) {
    problemas.push({ campo: 'mitos', mensaje: 'Mitos de Cthulhu no se compra en la creación. Se paga entendiendo.' });
  }

  // Crédito dentro del rango de la ocupación.
  const credito = (reparto.ocupacion['credito'] ?? 0) + (reparto.personal['credito'] ?? 0);
  if (credito < ocupacion.credito.min || credito > ocupacion.credito.max) {
    problemas.push({
      campo: 'credito',
      mensaje: `Crédito de ${ocupacion.nombre}: entre ${ocupacion.credito.min} y ${ocupacion.credito.max}. Pusiste ${credito}.`,
    });
  }

  // Ninguna habilidad puede superar 90 en la creación: llegar a experta lleva
  // años, y el juego tiene una fase de desarrollo para eso.
  const total = totalDe(reparto);
  for (const [skill, valor] of Object.entries(total)) {
    const base = SKILL_BY_ID[skill]?.defaultBase ?? 0;
    if (base + valor > TOPE_CREACION) {
      problemas.push({
        campo: skill,
        mensaje: `«${SKILL_BY_ID[skill]?.label ?? skill}» quedaría en ${base + valor}%. En la creación el tope es ${TOPE_CREACION}%.`,
      });
    }
  }

  return problemas;
}

/** Tope por habilidad en la creación. No es del manual: es decisión nuestra. */
export const TOPE_CREACION = 80;

const totalDe = (r: Reparto): Record<SkillId, number> => {
  const out: Record<SkillId, number> = {};
  for (const fuente of [r.ocupacion, r.personal]) {
    for (const [k, v] of Object.entries(fuente)) out[k] = (out[k] ?? 0) + (v || 0);
  }
  return out;
};

/** La ficha de habilidades final: base del sistema + lo repartido. */
export function armarHabilidades(reparto: Reparto): Record<SkillId, SkillValue> {
  const asignado = totalDe(reparto);
  const out: Record<SkillId, SkillValue> = {};
  for (const def of SKILLS) {
    const extra = asignado[def.id] ?? 0;
    out[def.id] = {
      base: def.defaultBase + extra,
      origin: extra > 0 ? (reparto.ocupacion[def.id] ? 'occupation' : 'personal') : 'personal',
    };
  }
  return out;
}
