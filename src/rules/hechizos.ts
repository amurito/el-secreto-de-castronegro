/**
 * CATÁLOGO DE HECHIZOS — CoC 7e, mecánica verificada contra el manual
 * (Core Rulebook p.170-178: tirada de PODER difícil sólo la primera vez,
 * cuesta Puntos de Magia, desborda a Puntos de Vida si no alcanzan).
 *
 * PURO: son datos, nada tira dados ni toca estado acá.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ SON ORIGINALES Y NO LOS DEL MANUAL
 *
 * Los hechizos con nombre del manual —su texto de reglas, su efecto exacto—
 * son propiedad de Chaosium, el mismo motivo por el que `castronegro.md` y
 * `adaptacion.md` nunca se subieron a git (ver CLAUDE.md). Éstos son
 * originales, dos por ahora, cada uno resuelto con un mecanismo GENÉRICO que
 * el motor ya tenía antes de que existiera la magia: un hechizo y comprar un
 * dado de bonificación con Suerte son, mecánicamente, la misma cosa.
 *
 * `efecto` es un conjunto CERRADO a propósito —mismo criterio que
 * `condiciones.ts`—: el motor conoce estos dos tipos, no conoce qué aventura
 * enseña cada hechizo. Lanzar hoy pasa por una pantalla dedicada que no pasa
 * por el resolvedor de ninguna aventura (ver `toolCastSpell` en engine.ts),
 * así que el efecto no puede vivir en contenido: tiene que ser una de estas
 * dos cosas o nada.
 */

export type EfectoHechizo = 'bono_dado' | 'estabilidad';

export interface Hechizo {
  id: string;
  nombre: string;
  costoPM: number;
  /** Cordura que cuesta LANZARLO. Sin esto, no cuesta Cordura. */
  costoCordura?: number;
  descripcion: string;
  efecto: EfectoHechizo;
  /** Cuánto vale el efecto: dados de bonificación, o puntos de Estabilidad. */
  magnitud: number;
}

export const HECHIZOS: Hechizo[] = [
  {
    id: 'adivinar-la-forma',
    nombre: 'Adivinar la forma',
    costoPM: 3,
    costoCordura: 2,
    descripcion:
      'Un segundo de más antes de mirar, y lo que se mira deja de tener sólo ' +
      'una forma. Un dado de bonificación en la próxima tirada, al precio de ' +
      'saber por un instante que hay más de una forma para elegir.',
    efecto: 'bono_dado',
    magnitud: 1,
  },
  {
    id: 'sostener-el-aire',
    nombre: 'Sostener el aire',
    costoPM: 4,
    descripcion:
      'No aparta lo que asusta: sostiene la respiración de quien lo lanza el ' +
      'tiempo suficiente para que el miedo no gane la mano. Recupera algo de ' +
      'Estabilidad de inmediato, sin costo de Cordura propio.',
    efecto: 'estabilidad',
    magnitud: 8,
  },
  {
    // El más viejo de los tres y el único que no se aprende de Bernardo sino
    // de los papeles que Bernardo consiguió de otro. Es, literalmente, el
    // gesto del que baja —degradado, sin nadie que sepa por qué— el Círculo
    // Rojo de 1926: anotar lo que no se puede anotar en otro lado.
    id: 'contar-lo-que-no-se-anota',
    nombre: 'Contar lo que no se puede anotar',
    costoPM: 3,
    costoCordura: 1,
    descripcion:
      'Se escribe lo que se acaba de ver, con la mano firme, antes de que la ' +
      'cabeza tenga tiempo de acomodarlo en algo más fácil de recordar. No ' +
      'sirve para entender: sirve para no perder el hilo. Recupera bastante ' +
      'Estabilidad, y cuesta un punto de Cordura escribirlo tal cual fue.',
    efecto: 'estabilidad',
    magnitud: 14,
  },
];

export const HECHIZO_POR_ID: Record<string, Hechizo> = Object.fromEntries(
  HECHIZOS.map((h) => [h.id, h]),
);
