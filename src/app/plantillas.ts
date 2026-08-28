/**
 * PLANTILLAS DE INVESTIGADOR — fichas guardadas, listas para reusar.
 *
 * Nacen en cualquier creación de personaje —para el simulador o para una
 * aventura real— y quedan disponibles para las dos cosas después: el mismo
 * investigador se puede probar en el galpón y, otro día, arrancar una
 * campaña de verdad. La ficha en sí no cambia entre un uso y otro; lo que sí
 * es propio de cada campaña es lo que le pase adentro —heridas, muerte
 * permanente, lo que descubrió—, que vive en el log de esa campaña, no acá.
 *
 * `localStorage` alcanza: son pocos, chicos, y no comparten nada con el log
 * de campañas (que vive en IndexedDB vía `engine/store.browser.ts`).
 * Mezclarlos ahí sugeriría que son el mismo tipo de dato, y no lo son — uno
 * es un registro append-only con muerte permanente, el otro es una ficha que
 * se puede pisar y volver a usar tantas veces como haga falta.
 */

import type { Investigator } from '../shared/types.ts';

export interface Plantilla {
  id: string;
  nombre: string;
  creadoEn: string;
  investigador: Investigator;
  /** El arma con la que se armó, si su ocupación ofrecía alguna. */
  armaInicialId?: string | null;
}

const CLAVE = 'castronegro:simulador:plantillas';

function leer(): Plantilla[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Plantilla[]) : [];
  } catch {
    return [];
  }
}

function escribir(plantillas: Plantilla[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(plantillas));
  } catch {
    // Almacenamiento no disponible (privado, lleno, deshabilitado): la
    // plantilla no se guarda, pero el simulador sigue jugándose igual.
  }
}

/** Las más nuevas primero: es lo último que se probó, lo más fácil de retomar. */
export function listarPlantillas(): Plantilla[] {
  return leer().sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export function guardarPlantilla(investigador: Investigator, armaInicialId?: string | null): Plantilla {
  const p: Plantilla = {
    id: `plantilla-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: investigador.name,
    creadoEn: new Date().toISOString(),
    investigador,
    armaInicialId: armaInicialId ?? null,
  };
  escribir([p, ...leer()]);
  return p;
}

export function borrarPlantilla(id: string): void {
  escribir(leer().filter((p) => p.id !== id));
}
