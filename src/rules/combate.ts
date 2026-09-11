/**
 * COMBATE — CoC 7e, cap. 6 (verificado contra el manual).
 *
 * PURO: recibe grados de éxito y dados YA TIRADOS, y devuelve quién le pega a
 * quién y cuánto. No tira nada, no toca el estado. Eso lo hace el motor, con
 * su cadena verificable, igual que cualquier otra tirada.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA REGLA CENTRAL, Y POR QUÉ NO ES «TIRAR PARA PEGAR»
 *
 * En CoC 7e un ataque no es una tirada contra una dificultad: es una tirada
 * ENFRENTADA. Quien ataca tira su habilidad; quien es atacado elige esquivar
 * (Esquivar) o devolver el golpe (Pelea), y tira la suya. Gana el grado de
 * éxito más alto, y quién gana los empates depende de qué eligió el defensor:
 *
 *   · Si ESQUIVA, el empate lo gana el defensor —esquivar es más fácil que
 *     acertar, y el manual lo dice así de explícito.
 *   · Si DEVUELVE EL GOLPE, el empate lo gana el atacante, pero el defensor
 *     que gana no sólo evita el golpe: se lo devuelve. Contraatacar arriesga
 *     más y paga más.
 *
 * Nadie puede «pushear» una tirada de combate (recuadro del manual): el
 * segundo intento de pegarle a alguien es el ataque del turno siguiente, no
 * una repetición del mismo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL ÉXITO EXTREMO NO ES «UN POCO MÁS DE DAÑO»
 *
 * Con éxito extremo el arma encuentra dónde entrar. Cómo, depende del arma:
 *
 *   · Un arma que EMPALA (cuchillo, bala, lanza) atraviesa: daño máximo del
 *     arma + máximo de la bonificación + una tirada entera de daño del arma
 *     encima.
 *   · Un arma que no empala (puño, palo, hacha de plano) golpea donde más
 *     duele: daño máximo del arma + máximo de la bonificación, sin tirada
 *     extra.
 *
 * Y sólo lo consigue QUIEN INICIA el ataque en su turno. El defensor que
 * contraataca y gana hace daño normal, por bueno que haya sido su resultado:
 * es un golpe de reacción, no un momento propio.
 */

import type { Difficulty, SuccessDegree } from '../shared/types.ts';
import { DEGREE_RANK, meetsDifficulty } from './dice.ts';
import { bonificacionAplicada, maximoDelArma, type Arma } from './armas.ts';

/** Qué hace quien es atacado. Es una elección, no una tirada distinta. */
export type Defensa = 'esquiva' | 'contraataca';

export interface Enfrentamiento {
  atacante: SuccessDegree;
  defensor: SuccessDegree;
  defensa: Defensa;
  /**
   * Qué grado necesitaba alcanzar el ATACANTE para que su tirada cuente
   * como acierto. Por defecto `'regular'` —el caso de siempre—: un disparo a
   * largo o muy largo alcance (p. 112, `nivelDeAlcance` en rules/armas.ts)
   * exige `'hard'`/`'extreme'`, y ahí un éxito regular deja de ser un
   * acierto, por más que su rango le gane al del defensor. La dificultad del
   * DEFENSOR nunca cambia por esto: esquivar o devolver el golpe sigue
   * midiéndose contra `'regular'`, sea cual sea la distancia del tirador.
   */
  dificultadAtacante?: Difficulty;
}

export interface ResultadoEnfrentamiento {
  /** Quién sufre daño. `null` es que no lo sufre nadie. */
  golpea: 'atacante' | 'defensor' | null;
  /** Sólo el que inicia puede empalar/golpear de más. */
  extremo: boolean;
  /** Para la prosa: por qué salió así. */
  razon: string;
}

const exito = (g: SuccessDegree, dificultad: Difficulty = 'regular') => meetsDifficulty(g, dificultad);

/**
 * Resuelve la tirada enfrentada. `golpea: 'defensor'` significa que el daño
 * lo recibe el defensor —es decir, el atacante acertó—; `'atacante'` es el
 * contraataque que le entra a quien empezó.
 */
export function resolverEnfrentamiento(e: Enfrentamiento): ResultadoEnfrentamiento {
  const a = DEGREE_RANK[e.atacante];
  const d = DEGREE_RANK[e.defensor];
  const dificultadAtacante = e.dificultadAtacante ?? 'regular';
  const atacanteAcerto = exito(e.atacante, dificultadAtacante);
  const defensorLogro = exito(e.defensor);

  // Un éxito extremo es «de más» salvo que la dificultad exigida YA fuera
  // extrema: ahí un éxito extremo es apenas lo mínimo para pegar, no un
  // golpe de más —hace falta un crítico para además empalar/rematar (p. 112:
  // «At very long range, when only an Extreme success will hit the target,
  // an impale only occurs with a critical hit»).
  const esExtremo = (g: SuccessDegree) =>
    dificultadAtacante === 'extreme' ? g === 'critical' : (g === 'extreme' || g === 'critical');

  if (!atacanteAcerto && !defensorLogro) {
    return { golpea: null, extremo: false, razon: 'Los dos fallan: nadie toca a nadie.' };
  }

  if (e.defensa === 'esquiva') {
    // Esquivar no lastima a nadie: sólo evita. Por eso el defensor nunca
    // aparece como `golpea: 'atacante'` en esta rama.
    if (atacanteAcerto && a > d) {
      return {
        golpea: 'defensor',
        extremo: esExtremo(e.atacante),
        razon: 'El ataque llega antes de que el otro termine de moverse.',
      };
    }
    return {
      golpea: null, extremo: false,
      razon: !atacanteAcerto && a > d
        ? 'El tiro no alcanza el nivel de éxito que exige la distancia: no llega, aunque en otro alcance hubiera bastado.'
        : 'Esquivó. En un empate, esquivar gana.',
    };
  }

  // Contraatacar: el que gana pega, sea quien sea.
  if (atacanteAcerto && a >= d) {
    return {
      golpea: 'defensor',
      extremo: esExtremo(e.atacante),
      razon: a === d
        ? 'Los dos aciertan igual de bien, y en ese empate gana quien empezó.'
        : 'Le gana de mano al que quiso devolvérsela.',
    };
  }
  if (defensorLogro && d > a) {
    return {
      // El defensor que contraataca y gana NO empala aunque saque extremo:
      // no es su turno, es una reacción.
      golpea: 'atacante', extremo: false,
      razon: 'Bloqueó y devolvió el golpe en el mismo movimiento.',
    };
  }
  return { golpea: null, extremo: false, razon: 'Se estorban mutuamente y ninguno conecta.' };
}

export interface DanoCalculado {
  total: number;
  /** Desglose para la prosa y para la auditoría de la tirada. */
  detalle: string;
}

/**
 * Suma el daño de un golpe que ya se sabe que entró.
 *
 * `dadosArma` y `dadosBonificacion` vienen tirados de afuera (por el motor,
 * de la cadena verificable). En un golpe normal se usan tal cual; en uno
 * extremo, `dadosArma` sólo se usa si el arma empala —es la tirada EXTRA que
 * se suma al máximo—.
 */
export function danoDeAtaque(
  arma: Arma,
  bonificacion: string,
  dadosArma: number[],
  dadosBonificacion: number[],
  extremo: boolean,
): DanoCalculado {
  const bon = bonificacionAplicada(bonificacion, arma.aporteBonificacion);
  const sumaDados = (ds: number[]) => ds.reduce((t, d) => t + d, 0);

  if (!extremo) {
    const arm = sumaDados(dadosArma) + arma.dano.suma;
    const b = sumaDados(dadosBonificacion) + bon.suma;
    const total = Math.max(0, arm + b);
    const tirada = `${arma.dano.cantidad}D${arma.dano.caras}` +
      (arma.dano.suma ? `+${arma.dano.suma}` : '');
    return {
      total,
      detalle: b === 0
        ? `${tirada} sacó ${arm}`
        : `${tirada} sacó ${arm}, ${b >= 0 ? '+' : ''}${b} de corpulencia`,
    };
  }

  // Extremo: máximo del arma + máximo de la bonificación.
  const maxArma = maximoDelArma(arma);
  const maxBon = bon.cantidad * bon.caras + bon.suma;

  if (!arma.empala) {
    const total = Math.max(0, maxArma + maxBon);
    return { total, detalle: `${maxArma} (máximo del arma)${maxBon ? ` + ${maxBon} de corpulencia` : ''}, sin fallar el punto débil` };
  }

  const extra = sumaDados(dadosArma) + arma.dano.suma;
  const total = Math.max(0, maxArma + maxBon + extra);
  return {
    total,
    detalle: `${maxArma} (máximo del arma)${maxBon ? ` + ${maxBon} de corpulencia` : ''} + ${extra} porque atravesó`,
  };
}

/**
 * «Armor reduces the damage received: deduct the number of armor points from
 * the damage» (p. 108). Una resta simple, pero con nombre propio porque el
 * motor la aplica en varios lugares (NPC golpeado, investigador golpeado por
 * distintos caminos) y todos tienen que coincidir en no dejar daño negativo.
 */
export const aplicarArmadura = (dano: number, armadura: number): number =>
  Math.max(0, dano - armadura);
