/**
 * ENSAMBLADO DE LA FICHA — de las tiradas y las decisiones a un investigador.
 *
 * Separado de `creacion.ts` a propósito: allá están las reglas puras (qué se
 * tira, qué es legal), acá el armado del objeto. Así las reglas se pueden
 * probar sin construir nada, y el armado no puede saltearse una validación
 * porque la pide explícitamente.
 */

import type {
  Characteristics, CharacteristicId, Investigator, BackstoryAspect,
} from '../shared/types.ts';
import { computeDerived } from './derived.ts';
import { emptyUmbralState } from './umbral.ts';
import {
  type Ocupacion, type Reparto, type Dado,
  armarHabilidades, validarReparto, efectoEdad, mejoraEdu,
  tirarCaracteristicas, tirarSuerte, EDAD_MINIMA, EDAD_MAXIMA,
} from './creacion.ts';
import { calcularTratamiento } from './tratamiento.ts';

/** Lo que salió de los dados, antes de que el jugador decida nada. */
export interface TiradaInicial {
  caracteristicas: Characteristics;
  suerte: number;
  /** Las dos tiradas de suerte, si la edad daba derecho a elegir la mejor. */
  suerteAlternativa?: number;
}

export function tirarFicha(edad: number, d6: Dado): TiradaInicial {
  const caracteristicas = tirarCaracteristicas(d6);
  const efecto = efectoEdad(edad);
  const a = tirarSuerte(d6);
  if (!efecto.dobleSuerte) return { caracteristicas, suerte: a };
  const b = tirarSuerte(d6);
  return {
    caracteristicas,
    suerte: Math.max(a, b),
    suerteAlternativa: Math.min(a, b),
  };
}

/** Lo que decide el jugador. */
export interface DecisionesFicha {
  nombre: string;
  edad: number;
  /**
   * Sólo decide dos cosas: la forma del tratamiento («doctor»/«doctora», o
   * «don»/«doña» cuando la ocupación no tiene uno propio) y nada más. No es
   * una casilla del reglamento de CoC 7e ni afecta ninguna tirada.
   */
  genero: 'm' | 'f';
  descripcion: string;
  ocupacionId: string;
  /** Para las fórmulas con elección: «EDU × 2 + o bien DES × 2 o bien FUE × 2». */
  caracteristicaElegida?: CharacteristicId;
  /** Cómo reparte la resta física de la edad entre FUE, CON y DES. */
  restaFisica?: Partial<Record<'STR' | 'CON' | 'DEX', number>>;
  /** Cómo reparte la resta de juventud entre FUE y TAM. */
  restaJuventud?: Partial<Record<'STR' | 'SIZ', number>>;
  reparto: Reparto;
  trasfondo: BackstoryAspect[];
  conexionClave: string | null;
}

export interface ResultadoCreacion {
  ok: boolean;
  investigador?: Investigator;
  problemas: Array<{ campo: string; mensaje: string }>;
  /** Las comprobaciones de EDU que hizo la edad, para mostrarlas. */
  chequeosEdu: Array<{ tirada: number; edu: number; sube: number }>;
}

/**
 * Arma el investigador. Devuelve problemas en vez de lanzar: la interfaz
 * necesita poder mostrar los cinco errores juntos, no el primero.
 */
export function crearInvestigador(
  tirada: TiradaInicial,
  decisiones: DecisionesFicha,
  ocupacion: Ocupacion,
  d100: Dado,
  d10: Dado,
): ResultadoCreacion {
  const problemas: Array<{ campo: string; mensaje: string }> = [];

  if (!decisiones.nombre.trim()) {
    problemas.push({ campo: 'nombre', mensaje: 'Un investigador necesita nombre.' });
  }
  if (decisiones.edad < EDAD_MINIMA || decisiones.edad > EDAD_MAXIMA) {
    problemas.push({
      campo: 'edad',
      mensaje: `La edad va de ${EDAD_MINIMA} a ${EDAD_MAXIMA}.`,
    });
  }

  // ── Modificadores de edad ───────────────────────────────────────────────
  const efecto = efectoEdad(decisiones.edad);
  const ch: Characteristics = { ...tirada.caracteristicas };

  const restaFisica = decisiones.restaFisica ?? {};
  const sumaFisica = Object.values(restaFisica).reduce((a, b) => a + (b || 0), 0);
  if (sumaFisica !== efecto.restaFisica) {
    problemas.push({
      campo: 'edad',
      mensaje: `A los ${decisiones.edad} hay que restar ${efecto.restaFisica} puntos entre FUE, CON y DES. Repartiste ${sumaFisica}.`,
    });
  }
  for (const [k, v] of Object.entries(restaFisica)) {
    ch[k as CharacteristicId] = Math.max(1, ch[k as CharacteristicId] - (v || 0));
  }

  const restaJuventud = decisiones.restaJuventud ?? {};
  const sumaJuventud = Object.values(restaJuventud).reduce((a, b) => a + (b || 0), 0);
  if (sumaJuventud !== efecto.restaJuventud) {
    problemas.push({
      campo: 'edad',
      mensaje: `A esa edad hay que restar ${efecto.restaJuventud} puntos entre FUE y TAM. Repartiste ${sumaJuventud}.`,
    });
  }
  for (const [k, v] of Object.entries(restaJuventud)) {
    ch[k as CharacteristicId] = Math.max(1, ch[k as CharacteristicId] - (v || 0));
  }

  ch.APP = Math.max(1, ch.APP - efecto.restaApariencia);
  // Los adolescentes pierden EDU: todavía no terminaron de estudiar.
  if (decisiones.edad < 20) ch.EDU = Math.max(1, ch.EDU - 5);

  // Comprobaciones de mejora de EDU: la misma regla que la fase de desarrollo.
  const chequeos: ResultadoCreacion['chequeosEdu'] = [];
  for (let n = 0; n < efecto.chequeosEdu; n++) {
    const t = d100();
    if (mejoraEdu(ch.EDU, t)) {
      const sube = d10();
      ch.EDU = Math.min(99, ch.EDU + sube);
      chequeos.push({ tirada: t, edu: ch.EDU, sube });
    } else {
      chequeos.push({ tirada: t, edu: ch.EDU, sube: 0 });
    }
  }

  // ── Reparto de puntos ───────────────────────────────────────────────────
  problemas.push(
    ...validarReparto(ocupacion, ch, decisiones.reparto, decisiones.caracteristicaElegida),
  );

  // ── Trasfondo ───────────────────────────────────────────────────────────
  if (decisiones.trasfondo.length < 3) {
    problemas.push({
      campo: 'trasfondo',
      mensaje: 'Hacen falta al menos tres cosas del trasfondo. Es de ahí que se recupera Cordura entre aventuras.',
    });
  }
  if (decisiones.conexionClave
    && !decisiones.trasfondo.some((a) => a.id === decisiones.conexionClave)) {
    problemas.push({ campo: 'trasfondo', mensaje: 'La conexión clave tiene que ser una de las entradas del trasfondo.' });
  }

  if (problemas.length) return { ok: false, problemas, chequeosEdu: chequeos };

  const skills = armarHabilidades(decisiones.reparto);
  // Esquivar arranca en DES/2 salvo que la ocupación la suba (regla de CoC 7e).
  const esquivarBase = Math.floor(ch.DEX / 2);
  skills['esquivar'] = {
    base: Math.max(esquivarBase, skills['esquivar']?.base ?? 0),
    origin: skills['esquivar']?.base ? 'occupation' : 'personal',
  };

  const investigador: Investigator = {
    id: `inv-${decisiones.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}-${Date.now().toString(36)}`,
    playerId: 'jugador-local',
    status: 'alive',
    name: decisiones.nombre.trim(),
    age: decisiones.edad,
    occupation: ocupacion.nombre,
    treatment: calcularTratamiento(decisiones.nombre.trim(), decisiones.genero, ocupacion),
    genero: decisiones.genero,
    nationality: 'Argentina',
    description: decisiones.descripcion.trim(),
    characteristics: ch,
    derived: computeDerived(ch, { luck: tirada.suerte }),
    skills,
    umbral: emptyUmbralState(),
    conditions: [],
    knowledge: { investigator: [], withheld: [], playerObserved: [] },
    relationships: [],
    backstory: {
      aspects: decisiones.trasfondo,
      keyConnection: decisiones.conexionClave,
    },
    experience: { sessionsSurvived: 0, lastDevelopmentSeq: 0 },
    ringBond: null,
  };

  return { ok: true, investigador, problemas: [], chequeosEdu: chequeos };
}
