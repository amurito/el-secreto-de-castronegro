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

/**
 * `dano` es el único que necesita un OBJETIVO y combate activo: los otros
 * tres le pasan algo al que lanza. Ver `toolCastSpell` en engine.ts — el
 * daño se aplica con el mismo `danarNpc` que usa un tajo cualquiera, así
 * que un rival con `invulnerabilidad` declarada se cura igual de un hechizo
 * que de un facón salvo que vaya dirigido a su punto débil.
 */
export type EfectoHechizo = 'bono_dado' | 'estabilidad' | 'exposicion' | 'dano';

export interface Hechizo {
  id: string;
  nombre: string;
  costoPM: number;
  /** Cordura que cuesta LANZARLO. Sin esto, no cuesta Cordura. */
  costoCordura?: number;
  descripcion: string;
  efecto: EfectoHechizo;
  /**
   * Cuánto vale el efecto: dados de bonificación, puntos de Estabilidad,
   * puntos de Exposición que se BAJAN (nunca por debajo del piso que deja el
   * pico histórico, y sin tocar los umbrales ya cruzados: ésos son memoria
   * permanente y no los devuelve nada), o puntos de daño.
   *
   * Es un número fijo a propósito, no una tirada de dados: los cuatro
   * efectos son planos, y agregar un dado adentro del lanzamiento metería
   * una segunda tirada en una acción que ya tiene la suya (la de PODER de
   * la primera vez).
   */
  magnitud: number;
  /**
   * Minutos que hay que esperar antes de volver a lanzar ESTE hechizo, salga
   * o no salga. Sin esto no habría nada que impidiera apretar el botón hasta
   * que la tirada saliera bien —reportado jugando: cuatro intentos seguidos
   * en el mismo minuto, sin costo— ni encadenar el mismo efecto hasta
   * llenar la barra que repara. Ver `toolCastSpell`.
   */
  esperaMinutos: number;
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
    // Media hora: el más barato de los tres y el que menos descoloca, pero
    // igual no se puede encadenar dentro de la misma escena.
    esperaMinutos: 30,
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
    // Una hora, que es lo mismo que tarda en volver 1 Punto de Magia: sin
    // esto, con la ficha llena se podía subir la Estabilidad de a ocho hasta
    // quedarse sin PM, esperar, y repetir. Estabilidad infinita.
    esperaMinutos: 60,
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
      'cabeza tenga tiempo de acomodarlo en algo más fácil de recordar. Lo ' +
      'que queda en el papel deja de estar solamente adentro: baja la ' +
      'Exposición al Umbral, que es lo que pesa. No devuelve ningún umbral ya ' +
      'cruzado —eso no lo devuelve nada— ni baja del piso que dejó el pico. ' +
      'Cuesta un punto de Cordura escribirlo tal cual fue.',
    // Baja Exposición, no repara Estabilidad. Es lo que el gesto DICE que
    // hace —sacárselo de la cabeza y ponerlo en un papel— y además es el
    // único de los tres que toca la barra que ninguna otra cosa del juego
    // puede bajar dentro de una aventura. Que exista una salida, cara y con
    // espera larga, hace que la Exposición sea una decisión y no sólo un
    // contador que sube.
    efecto: 'exposicion',
    magnitud: 8,
    // Seis horas: es el más poderoso de los tres por lejos. Con esta espera,
    // usarlo cuesta media jornada diegética — y el tiempo, en este motor,
    // abre el mundo (sube la Permeabilidad). Nunca es gratis.
    esperaMinutos: 360,
  },
  {
    // El único de los cuatro que le pega a alguien, y el único que necesita
    // un objetivo y combate activo. Sale de haber entendido el obelisco en
    // «El Círculo Rojo» (c. 1674): si la piedra marca un borde, el borde se
    // puede cerrar sobre algo que ya lo cruzó. No es fuego ni rayo — es el
    // límite haciendo lo que un límite hace, con doscientos años de retraso
    // y sobre la cosa equivocada.
    id: 'cerrarle-el-paso',
    nombre: 'Cerrarle el paso',
    costoPM: 6,
    costoCordura: 2,
    // La descripción se imprime tal cual en el relato al lanzarlo, así que
    // dice qué pasa y no cómo funciona: lo mecánico —que se lanza peleando y
    // que contra lo invulnerable hay que ir al punto débil— lo dice la
    // interfaz, no el texto de la escena.
    descripcion:
      'Se le cierra encima el borde que ya cruzó. No hay fuego ni luz: hay ' +
      'algo que estaba abierto y deja de estarlo, con lo que sea que haya ' +
      'quedado adentro.',
    efecto: 'dano',
    magnitud: 6,
    // Dos horas: en la práctica, UNA SOLA VEZ por pelea. Es a propósito —un
    // hechizo de daño repetible sería la manera obvia de ganar cualquier
    // combate, y el combate de este proyecto está calibrado sin él.
    esperaMinutos: 120,
  },
];

export const HECHIZO_POR_ID: Record<string, Hechizo> = Object.fromEntries(
  HECHIZOS.map((h) => [h.id, h]),
);
