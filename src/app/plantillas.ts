/**
 * PLANTILLAS DE INVESTIGADOR PARA EL SIMULADOR.
 *
 * Personajes de prueba, no de campaña: no llevan partida guardada, no
 * cruzan entre aventuras, no importan para la muerte permanente. Sólo
 * necesitan existir de nuevo la próxima vez que alguien quiera probar un
 * facón en manos de alguien con Pelea 60 en vez de en las de Elena.
 *
 * `localStorage` alcanza: son pocos, chicos, y no comparten nada con el
 * log de campañas (que vive en IndexedDB vía `engine/store.browser.ts`).
 * Mezclarlos ahí sugeriría que son el mismo tipo de dato, y no lo son —
 * uno es un registro append-only con muerte permanente, el otro es una
 * ficha que se puede pisar y volver a usar.
 */

import type { Investigator } from '../shared/types.ts';

export interface Plantilla {
  id: string;
  nombre: string;
  creadoEn: string;
  investigador: Investigator;
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

export function guardarPlantilla(investigador: Investigator): Plantilla {
  const p: Plantilla = {
    id: `plantilla-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: investigador.name,
    creadoEn: new Date().toISOString(),
    investigador,
  };
  escribir([p, ...leer()]);
  return p;
}

export function borrarPlantilla(id: string): void {
  escribir(leer().filter((p) => p.id !== id));
}
