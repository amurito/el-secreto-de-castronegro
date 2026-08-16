/**
 * CÓMO SE DIRIGEN A EL/LA INVESTIGADOR/A — un token, no una regla de género
 * repartida por todo el escenario.
 *
 * Nace de un bug real: la prosa de Agua Quieta y La Legua Perdida tenía
 * «doctora» escrito a mano en cada línea donde un NPC se dirige al
 * investigador. Funcionaba mientras el único investigador posible era Elena,
 * la médica. En cuanto hubo creación de personaje, siguió diciendo «doctora»
 * aunque el investigador fuera Nico, anticuario — mal en género Y en
 * profesión, porque nadie en el campo llama doctor a un anticuario.
 *
 * La solución NO es que cada escena calcule el tratamiento: es que la prosa
 * escriba el token `{trato}` y este archivo lo resuelva una sola vez, en el
 * único lugar por el que pasa toda la narración antes de llegar a pantalla
 * (ver el uso en `keeper/offline.ts` y `app/api.local.ts`).
 */

import type { Investigator } from '../shared/types.ts';
import type { Ocupacion } from './creacion.ts';

/**
 * Nombre de pila, para el «don»/«doña» de las ocupaciones sin tratamiento
 * profesional propio. Frida Kahlo → Frida.
 */
function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? nombreCompleto;
}

/**
 * El tratamiento de un investigador recién armado, antes de que exista el
 * objeto `Investigator` completo. La ocupación decide el tratamiento
 * profesional si lo tiene («doctora», «comisario»); si no, el campo trata a
 * cualquiera con respeto y sin título con «don»/«doña» + el nombre de pila.
 */
export function calcularTratamiento(
  nombre: string, genero: 'm' | 'f', ocupacion: Ocupacion,
): string {
  if (ocupacion.tratamiento) return ocupacion.tratamiento[genero];
  return `${genero === 'm' ? 'don' : 'doña'} ${primerNombre(nombre)}`;
}

/**
 * Reemplaza `{trato}` por el tratamiento del investigador activo. Sin el
 * token, no toca nada — así es seguro pasarle cualquier texto, no sólo el que
 * se sabe que se dirige al jugador.
 */
export function conTrato(texto: string, inv: Investigator | null | undefined): string {
  if (!texto.includes('{trato}')) return texto;
  return texto.replaceAll('{trato}', inv?.treatment ?? 'usted');
}
