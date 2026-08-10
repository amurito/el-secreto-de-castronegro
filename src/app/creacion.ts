/**
 * CREACIÓN DE INVESTIGADOR — la parte que conecta reglas con partida.
 *
 * Vive en `app/` y no en `engine/` porque no toca el log: la creación pasa
 * ANTES de que exista la campaña. El motor recibe el investigador ya armado y
 * validado, y de ahí en adelante manda él.
 *
 * Los dados de acá usan `Math.random`, no la cadena verificable, y eso es
 * deliberado: el manual permite repetir las tiradas de creación (p. 47), así
 * que protegerlas criptográficamente no protegería nada. Está explicado en
 * `rules/creacion.ts`.
 */

import type { CharacteristicId, Investigator } from '../shared/types.ts';
import { tirarFicha, crearInvestigador, type TiradaInicial, type DecisionesFicha } from '../rules/ficha.ts';
import { OCUPACION_POR_ID, OCUPACIONES } from '../scenario/ocupaciones.ts';
import { puntosDeOcupacion, puntosPersonales, efectoEdad, type Ocupacion } from '../rules/creacion.ts';

const d = (caras: number) => () => 1 + Math.floor(Math.random() * caras);

export const tirarCaracteristicasDe = (edad: number): TiradaInicial => tirarFicha(edad, d(6));

/** Cuánto tiene para repartir con estas características y esta ocupación. */
export function presupuesto(
  ocupacionId: string,
  tirada: TiradaInicial,
  elegida?: CharacteristicId,
): { ocupacion: number; personal: number } {
  const oc = OCUPACION_POR_ID[ocupacionId];
  if (!oc) return { ocupacion: 0, personal: 0 };
  return {
    ocupacion: puntosDeOcupacion(oc.formula, tirada.caracteristicas, elegida),
    personal: puntosPersonales(tirada.caracteristicas),
  };
}

export function armar(tirada: TiradaInicial, decisiones: DecisionesFicha) {
  const oc = OCUPACION_POR_ID[decisiones.ocupacionId];
  if (!oc) {
    return {
      ok: false as const,
      problemas: [{ campo: 'ocupacion', mensaje: 'Esa ocupación no existe.' }],
      chequeosEdu: [],
    };
  }
  return crearInvestigador(tirada, decisiones, oc, d(100), d(10));
}

/** Todo lo que la interfaz necesita saber para dibujar el formulario. */
export interface CatalogoCreacion {
  ocupaciones: Array<Ocupacion & { puntosDescriptos: string }>;
  edadMin: number;
  edadMax: number;
}

const describirFormula = (o: Ocupacion): string => {
  const fijos = Object.entries(o.formula.fijos)
    .map(([k, v]) => `${k} × ${v}`).join(' + ');
  if (!o.formula.eleccion) return fijos;
  const opciones = o.formula.eleccion.entre
    .map((c) => `${c} × ${o.formula.eleccion!.multiplicador}`).join(' o ');
  return `${fijos} + (${opciones})`;
};

export const catalogoCreacion = (): CatalogoCreacion => ({
  ocupaciones: OCUPACIONES.map((o) => ({ ...o, puntosDescriptos: describirFormula(o) })),
  edadMin: 15,
  edadMax: 79,
});

export { efectoEdad };
export type { Investigator, DecisionesFicha, TiradaInicial };
