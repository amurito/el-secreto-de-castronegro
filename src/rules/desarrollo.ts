/**
 * FASE DE DESARROLLO DEL INVESTIGADOR — CoC 7e, pp. 94-95 y 167-169.
 *
 * PURO: acá no se tira nada ni se toca estado. Sólo decide QUÉ corresponde,
 * dado el log. Los dados los pone el motor, con la misma cadena verificable
 * que el resto de la partida — una mejora de habilidad es tan auditable como
 * una tirada de Descubrir.
 *
 * LAS REGLAS, EN MIS PALABRAS (verificar contra el manual con licencia):
 *
 *   MARCADO (p. 94). Una habilidad se marca al usarse CON ÉXITO en juego. No se
 *   marca si la tirada usó dado de bonificación. Una marca por habilidad, por
 *   más veces que se use. Mitos de Cthulhu y Crédito nunca se marcan.
 *
 *   MEJORA (p. 94). Por cada marcada, 1D100. Si sale POR ENCIMA del valor
 *   actual —o por encima de 95— sube 1D10. Puede pasar de 100. Al revés de lo
 *   intuitivo: cuanto mejor sos, menos aprendés.
 *
 *   90% (p. 94). Llegar a 90 o más en la fase da +2D6 de Cordura.
 *
 *   PREMIO DEL KEEPER (p. 167). Al terminar el escenario, proporcional al
 *   peligro real; explícitamente reducible si el grupo fue cobarde o brutal.
 *
 *   AUTO-AYUDA (p. 169). Dedicar tiempo a algo del trasfondo, tirar Cordura:
 *   éxito +1D6; fallo −1 y ese trasfondo se revisa. La conexión clave da dado
 *   de bonificación, y su éxito además cura la locura indefinida.
 *
 *   TECHO. La Cordura nunca pasa de 99 menos Mitos de Cthulhu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ EL MARCADO SE DERIVA DEL LOG Y NO ES UNA CASILLA
 *
 * `SkillValue.markedForGrowth` existía en el modelo desde el día uno y no lo
 * escribía nadie: la misma familia que los dos desenlaces inalcanzables. En
 * vez de empezar a escribirlo, se calcula del registro de tiradas, que ya
 * guarda grado de éxito y modificadores. Así la regla del dado de bonificación
 * —la que en la mesa se pasa por alto la mitad de las veces— se aplica sola, y
 * no hay una casilla que pueda desincronizarse de lo que de verdad pasó.
 */

import type { GameState, Investigator, RollRecord, SkillId } from '../shared/types.ts';
import { isCharacteristic, labelFor } from './skills.ts';

/** Habilidades que nunca se marcan (p. 94). */
export const NUNCA_SE_MARCAN: string[] = ['mitos', 'mitos_de_cthulhu', 'credito'];

/** A partir de acá, dominar la habilidad premia con Cordura. */
export const MAESTRIA = 90;
export const DADOS_SAN_POR_MAESTRIA = { cantidad: 2, caras: 6 };

/** Auto-ayuda: lo que se gana y lo que se pierde. */
export const AUTOAYUDA = {
  ganaDados: { cantidad: 1, caras: 6 },
  pierdeSiFalla: 1,
};

export interface Marca {
  skill: SkillId;
  label: string;
  valor: number;
  /** Cuántas veces se usó con éxito. Sólo informativo: se marca una vez. */
  exitos: number;
}

const usoDadoDeBonificacion = (r: RollRecord) =>
  r.commitment.modifiers.some((m) => m.kind === 'bonus_die' && m.count > 0);

const fueExito = (r: RollRecord) =>
  !['failure', 'fumble'].includes(r.execution.degree);

/**
 * Las habilidades marcadas desde la última fase de desarrollo.
 *
 * `desdeSeq` es la frontera: al cerrar una fase, las marcas se borran (p. 94),
 * y acá eso es «no mirar más atrás de ese punto». Sin la frontera, las marcas
 * de la primera aventura seguirían contando en la segunda.
 */
export function marcasDe(
  state: GameState,
  investigatorId: string,
  desdeSeq: number,
): Marca[] {
  const inv = state.investigators[investigatorId];
  if (!inv) return [];

  const conteo = new Map<SkillId, number>();
  for (const r of state.rolls) {
    if (r.investigatorId !== investigatorId) continue;
    if (r.seq <= desdeSeq) continue;
    if (!fueExito(r)) continue;
    // La regla que más se olvida en la mesa: con dado de bonificación no se
    // marca. Acá no se puede olvidar porque el registro guarda los modificadores.
    if (usoDadoDeBonificacion(r)) continue;

    const id = String(r.commitment.skill);
    // Las características (FUE, POD…) no se marcan: no son habilidades.
    if (isCharacteristic(id)) continue;
    if (NUNCA_SE_MARCAN.includes(id)) continue;
    if (!(id in inv.skills)) continue;

    conteo.set(id as SkillId, (conteo.get(id as SkillId) ?? 0) + 1);
  }

  return [...conteo.entries()]
    .map(([skill, exitos]) => ({
      skill,
      label: labelFor(skill),
      valor: inv.skills[skill]?.base ?? 0,
      exitos,
    }))
    .sort((a, b) => b.exitos - a.exitos || a.label.localeCompare(b.label));
}

/**
 * ¿Mejora esta habilidad con esta tirada de 1D100?
 * Sube si el dado supera el valor actual, o si pasa de 95 (p. 94).
 */
export function mejora(valorActual: number, d100: number): boolean {
  return d100 > valorActual || d100 > 95;
}

/** ¿Este salto lleva la habilidad a maestría, con derecho a Cordura? */
export function alcanzaMaestria(antes: number, despues: number): boolean {
  return antes < MAESTRIA && despues >= MAESTRIA;
}

/** Techo de Cordura: 99 menos Mitos de Cthulhu (p. 169). */
export function maxCordura(inv: Investigator): number {
  const mitos = inv.skills['mitos' as SkillId]?.base ?? 0;
  return Math.max(0, 99 - mitos);
}

/**
 * Premio de Cordura del Keeper, proporcional al peligro (p. 167).
 *
 * El libro deja el valor a criterio del Keeper. Acá lo decide el estado, que es
 * lo único que el motor puede saber sin inventar: cuánto se descubrió, si se
 * llegó a un desenlace, y cuánto costó. Y sostiene la parte del libro que
 * importa —«si fueron cobardes, reducilo o quitalo»— sin juzgar moralmente:
 * irse sin entender nada rinde menos que quedarse a mirar.
 */
export function premioDelKeeper(state: GameState): { dados: number; caras: number; razon: string } {
  const pistas = state.board.clues.length;
  const final = state.ending?.id ?? null;

  // Los desenlaces que exigen mirar de frente el fenómeno valen más que los
  // que consisten en no mirarlo. `cortar`/`heredar` (El Vigésimo) son la
  // versión de esta aventura de "mirar de frente": las dos exigen haber
  // vencido a Bernardo de verdad, no sólo haber sobrevivido a la audiencia.
  // `irse-vigesimo` es su «se fue» —salir sin pelear—. `denunciar` queda
  // afuera a propósito: huyó de la pelea pero volvió a hacer algo con lo que
  // vio, ni una cosa ni la otra.
  const miroDeFrente = final === 'mirar' || final === 'bajar' || final === 'cortar' || final === 'heredar';
  const seFue = final === 'llevarse' || final === 'irse-vigesimo';

  if (!final) return { dados: 0, caras: 6, razon: 'la aventura no se cerró' };
  if (seFue && pistas < 5) {
    return { dados: 1, caras: 3, razon: 'se fue temprano y con poco' };
  }
  if (miroDeFrente && pistas >= 8) {
    return { dados: 1, caras: 10, razon: 'llegó hasta el fondo y lo entendió' };
  }
  if (pistas >= 8) return { dados: 1, caras: 8, razon: 'entendió casi todo' };
  if (pistas >= 5) return { dados: 1, caras: 6, razon: 'entendió lo esencial' };
  return { dados: 1, caras: 4, razon: 'cerró la aventura sin entenderla' };
}
