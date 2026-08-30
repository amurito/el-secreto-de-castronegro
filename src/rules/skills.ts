/**
 * CATÁLOGO DE HABILIDADES — subconjunto necesario para el escenario del MVP.
 *
 * Los nombres y valores base de CoC 7e son datos del sistema; acá se usa un
 * subconjunto reducido con etiquetas propias en español. La lista completa de
 * habilidades y ocupaciones debe verificarse contra el manual licenciado antes
 * de ampliarse (Análisis Técnico v1.1 §8.1).
 */

import type { SkillId, CharacteristicId } from '../shared/types.ts';

export interface SkillDef {
  id: SkillId;
  label: string;
  defaultBase: number;
  /** Para el Keeper: cuándo tiene sentido pedir esta tirada. */
  useWhen: string;
}

export const SKILLS: SkillDef[] = [
  { id: 'descubrir', label: 'Descubrir', defaultBase: 25, useWhen: 'Notar un detalle físico que no salta a la vista.' },
  { id: 'escuchar', label: 'Escuchar', defaultBase: 20, useWhen: 'Percibir un sonido tenue, ambiguo o lejano.' },
  { id: 'psicologia', label: 'Psicología', defaultBase: 10, useWhen: 'Leer la intención o la sinceridad de alguien.' },
  { id: 'persuasion', label: 'Persuasión', defaultBase: 10, useWhen: 'Convencer con argumentos razonables.' },
  { id: 'labia', label: 'Labia', defaultBase: 5, useWhen: 'Convencer con encanto, rapidez o mentira breve.' },
  { id: 'intimidar', label: 'Intimidar', defaultBase: 15, useWhen: 'Forzar una respuesta por presión o amenaza.' },
  { id: 'biblioteca', label: 'Uso de Bibliotecas', defaultBase: 20, useWhen: 'Encontrar el dato correcto entre muchos papeles.' },
  { id: 'historia', label: 'Historia', defaultBase: 5, useWhen: 'Ubicar un objeto, estilo o costumbre en su época.' },
  // Arqueología y Geología entran por la séptima aventura, donde el obelisco
  // es una estructura anterior a Bernardo (v0.7 §8) y hasta ahora no había con
  // qué leerlo. Historia ubica un objeto en SU época; Arqueología fecha una
  // piedra trabajada y dice quién la trabajó, que no es lo mismo cuando lo que
  // hay que fechar es anterior a todo lo que el investigador sabe.
  { id: 'arqueologia', label: 'Arqueología', defaultBase: 1, useWhen: 'Fechar una construcción o una piedra trabajada, y decir quiénes la hicieron.' },
  { id: 'medicina', label: 'Medicina', defaultBase: 1, useWhen: 'Diagnóstico, causa de muerte, estado de un cuerpo.' },
  { id: 'primeros_auxilios', label: 'Primeros Auxilios', defaultBase: 30, useWhen: 'Estabilizar una herida en el momento.' },
  { id: 'ciencia_naturales', label: 'Ciencias Naturales', defaultBase: 10, useWhen: 'Agua, suelo, plantas, animales, química elemental.' },
  // En una llanura sin canteras, «esta piedra no es de acá» es media aventura.
  // Ciencias Naturales mira el suelo; Geología mira de dónde vino lo que está
  // apoyado encima.
  { id: 'geologia', label: 'Geología', defaultBase: 1, useWhen: 'Decir de dónde salió una piedra, y a qué distancia está su cantera.' },
  { id: 'ocultismo', label: 'Ocultismo', defaultBase: 5, useWhen: 'Reconocer símbolos, prácticas y literatura esotérica.' },
  { id: 'antropologia', label: 'Antropología', defaultBase: 1, useWhen: 'Interpretar costumbres, tabúes y marcadores de un grupo.' },
  { id: 'buscar_libros', label: 'Investigar', defaultBase: 25, useWhen: 'Rastrear información en registros y archivos.' },
  { id: 'trepar', label: 'Trepar', defaultBase: 20, useWhen: 'Subir o bajar por una superficie difícil.' },
  { id: 'saltar', label: 'Saltar', defaultBase: 20, useWhen: 'Salvar una distancia o una altura.' },
  { id: 'nadar', label: 'Nadar', defaultBase: 20, useWhen: 'Moverse o sostenerse en el agua.' },
  { id: 'sigilo', label: 'Sigilo', defaultBase: 20, useWhen: 'Moverse sin ser oído ni visto.' },
  { id: 'mecanica', label: 'Reparar (Mecánica)', defaultBase: 10, useWhen: 'Forzar, desarmar o arreglar un mecanismo.' },
  { id: 'fotografia', label: 'Arte/Oficio (Fotografía)', defaultBase: 5, useWhen: 'Leer, fechar o interpretar una imagen fotográfica.' },
  { id: 'orientarse', label: 'Orientarse', defaultBase: 10, useWhen: 'Ubicarse en el espacio o reconstruir un recorrido.' },
  // Orientarse es «reconstruir un recorrido»: se apoya en referencias que ya
  // existen. Navegación es cruzar donde no hay ninguna —de noche, a campo
  // abierto, sin caminos ni mojones—, que es lo que pide el partido cuando se
  // sale de las huellas.
  { id: 'navegacion', label: 'Navegación', defaultBase: 10, useWhen: 'Cruzar a campo abierto sin caminos ni referencias, y llegar a donde uno quería.' },
  { id: 'esquivar', label: 'Esquivar', defaultBase: 0, useWhen: 'Evitar un golpe o un peligro inmediato.' },
  // Combate. Esquivar ya estaba —se usa para más cosas que pelear— pero sin
  // estas tres no había con qué atacar: el motor podía aplicar daño y nadie
  // podía tirar para causarlo.
  { id: 'pelea', label: 'Pelea', defaultBase: 25, useWhen: 'Golpear a alguien de cerca, con o sin algo en la mano.' },
  { id: 'armas_fuego', label: 'Armas de Fuego (pistola)', defaultBase: 20, useWhen: 'Disparar un arma corta.' },
  { id: 'arrojar', label: 'Lanzar', defaultBase: 20, useWhen: 'Tirar algo con puntería: una piedra, un cuchillo, un farol.' },
  { id: 'mitos', label: 'Mitos de Cthulhu', defaultBase: 0, useWhen: 'Reconocer lo que no debería poder reconocerse.' },
  // Crédito es una habilidad rara: no se tira para hacer algo, se tiene. Mide
  // de qué vive el investigador y qué puertas se le abren por eso. Entra acá
  // porque la creación reparte puntos en ella como en cualquier otra.
  { id: 'credito', label: 'Crédito', defaultBase: 0, useWhen: 'Que a uno le fíen, le abran una puerta o le crean la ocupación que dice tener.' },
];

export const SKILL_BY_ID: Record<SkillId, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
);

export const CHARACTERISTIC_LABEL: Record<CharacteristicId, string> = {
  STR: 'Fuerza (FUE)',
  CON: 'Constitución (CON)',
  SIZ: 'Tamaño (TAM)',
  DEX: 'Destreza (DES)',
  APP: 'Apariencia (APA)',
  INT: 'Inteligencia (INT)',
  POW: 'Poder (POD)',
  EDU: 'Educación (EDU)',
};

export const CHARACTERISTIC_IDS: CharacteristicId[] = [
  'STR', 'CON', 'SIZ', 'DEX', 'APP', 'INT', 'POW', 'EDU',
];

export function isCharacteristic(id: string): id is CharacteristicId {
  return (CHARACTERISTIC_IDS as string[]).includes(id);
}

export function labelFor(id: SkillId | CharacteristicId): string {
  if (id === 'COR') return 'Cordura';
  if (isCharacteristic(id)) return CHARACTERISTIC_LABEL[id];
  return SKILL_BY_ID[id]?.label ?? id;
}
