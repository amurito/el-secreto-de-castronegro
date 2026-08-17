/**
 * SIMULADOR DE COMBATE — un galpón vacío para probar las reglas con las manos.
 *
 * NO es una aventura y por eso NO está en el catálogo: no tiene misterio, ni
 * pistas, ni desenlaces, ni nada que descubrir. Es un banco de pruebas
 * jugable, para ver cómo se siente el combate antes de meterlo en una
 * historia — que es una pregunta que ninguna prueba automática contesta.
 *
 * Corre sobre el motor de verdad, con la misma cadena verificable y la misma
 * herramienta `resolve_attack` que usaría una aventura. Lo que se prueba acá
 * es exactamente lo que va a pasar allá; si fuera una simulación aparte no
 * probaría nada.
 *
 * Los tres rivales cubren el rango que importa:
 *
 *   DÉBIL    alguien que no quiere pelear y trata de zafar. Esquiva, así que
 *            no devuelve golpes: se le puede ganar sin cobrar nada.
 *   NORMAL   un hombre grande con un palo. Devuelve. Contra un investigador
 *            que no es peleador, la pelea está pareja y duele.
 *   FUERTE   alguien que sabe pelear y tiene un cuchillo. Contra la mayoría
 *            de los investigadores esto NO es una pelea: es una mala idea, y
 *            la idea es que se note en el primer asalto.
 */

import type { Scenario } from './types.ts';
import type { GameLocation, NpcSeed, WorldTime } from '../shared/types.ts';
import { ELENA, TOMAS } from './pregens.ts';

const CANON = { truth: 'CANON_SETTING' as const, disclosure: 'PUBLIC' as const, source: 'scenario' as const };

const rival = (
  id: string,
  name: string,
  description: string,
  combate: NonNullable<NpcSeed['combate']>,
): NpcSeed => ({
  id, name, canon: CANON, status: 'alive', description,
  motivation: 'Estar acá para que alguien practique.',
  fears: [], refusals: [], knowledge: [], secrets: [], relationships: [],
  attitude: {}, present: true, isCompanion: false, createdAt: 'inicio',
  combate,
});

const galpon: GameLocation = {
  id: 'galpon',
  name: 'Un galpón vacío',
  aliases: ['galpón', 'el galpón'],
  description:
    'Piso de tierra apisonada, chapa arriba, y luz que entra por donde falta una chapa. No hay nada ' +
    'que investigar acá: hay gente parada esperando que alguien empiece.',
  atmosphere: ['Nadie dice nada. Están esperando.'],
  connections: [],
  itemsPresent: [],
  npcsPresent: ['npc-debil', 'npc-normal', 'npc-fuerte'],
  visited: false,
  umbralIntensity: 0,
  features: [],
};

export const SIMULADOR: Scenario = {
  id: 'simulador',
  title: 'Simulador de combate',
  surfacePremise:
    'Un galpón vacío y tres personas dispuestas a que las golpeen. No hay nada que descubrir: ' +
    'es para probar las reglas de pelea con las manos.',
  investigators: [ELENA, TOMAS],
  items: [],
  npcs: [
    rival('npc-debil', 'Un muchacho asustado',
      'Flaco, joven, y evidentemente preferiría estar en cualquier otro lado. Trata de zafar, no de pelear.',
      {
        hp: 6, maxHp: 6, pelea: 15, esquivar: 30,
        armaId: 'palo-chico', bonificacionDano: '0', defensaPorDefecto: 'esquiva',
      }),
    rival('npc-normal', 'Un hombre grande',
      'Ancho de espaldas, con un palo en la mano y la cara de quien ya hizo esto otras veces.',
      {
        hp: 12, maxHp: 12, pelea: 50, esquivar: 25,
        armaId: 'palo-grande', bonificacionDano: '+1D4', defensaPorDefecto: 'contraataca',
      }),
    rival('npc-fuerte', 'Un hombre con un cuchillo',
      'No es más grande que el otro. Se para distinto, y tiene un facón que no es para carnear.',
      {
        hp: 15, maxHp: 15, pelea: 75, esquivar: 40,
        armaId: 'facon', bonificacionDano: '+1D4', defensaPorDefecto: 'contraataca',
      }),
  ],
  documents: [],
  locations: { galpon },
  startLocation: 'galpon',
  startTime: { iso: '1925-01-01T12:00:00', precision: 'minute', display: 'el mediodía' } as WorldTime,
  startUmbralPermeability: 0,
  timeline: [],
  conversations: [],
  scenes: [],
  actions: [],
  endings: [],
  opening:
    'Un galpón con piso de tierra. Tres personas esperando, cada una a su manera.\n\n' +
    'Esto no es una aventura: no hay nada que averiguar acá. Es para probar cómo se siente pelear ' +
    'antes de que pelear importe. Elegí con qué, elegí contra quién, y mirá los dados.',
};
