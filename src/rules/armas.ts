/**
 * CATÁLOGO DE ARMAS — CoC 7e, Tabla XVII (verificado contra el manual).
 *
 * PURO: son datos y una función que suma dados ya tirados. No tira nada.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE SUBCONJUNTO Y NO LA TABLA ENTERA
 *
 * La tabla del manual cubre desde una piedra hasta un cañón de 120mm. Este
 * juego pasa en estancias de la provincia de Buenos Aires en 1924-25 —lo que
 * hay a mano es lo que hay en un galpón, y en el peor caso el revólver que
 * alguien guarda en un cajón— y, desde *La Merced de las Ánimas* (1710), en
 * el Corregimiento de Cuyo colonial, con sus propias armas de época (mosquete
 * y pistola de chispa, espada) y las de un par de criaturas de esa aventura.
 * Un subfusil Thompson o un lanzacohetes no van a aparecer, y meterlos «por
 * completitud» sería invitar a escribir una escena que el juego no quiere
 * tener.
 *
 * Cuando haga falta más, se agrega una fila acá y nada más: el resolvedor de
 * combate no conoce ningún arma en particular.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE FALTA A PROPÓSITO
 *
 * Escopetas y rifles largos siguen sin entrar, aunque el motor ya tiene
 * distancia real (`nivelDeAlcance`, más abajo). No es lo mismo que faltaba
 * antes: antes faltaba la distancia entera; ahora lo que falta es una
 * mecánica aparte que el manual sí describe para la escopeta en particular
 * (p. 116) y que nada más usa —el daño se tira en D6 sueltos (4D6/2D6/1D6
 * según el tramo) y la ARMADURA se descuenta POR CADA DADO, no una vez del
 * total, porque cada perdigón tiene que atravesar por su cuenta—. Meterla
 * junto con esto sería resolver dos diseños distintos de una vez. Entra
 * cuando haga falta, con su propio caso.
 */

import type { Difficulty, SkillId } from '../shared/types.ts';

/** Cuánto de la bonificación de daño (STR+SIZ) se suma a esta arma. */
export type AporteBonificacion = 'completa' | 'mitad' | 'ninguna';

export interface Arma {
  id: string;
  nombre: string;
  /** Con qué habilidad se ataca. */
  habilidad: SkillId;
  /** Dados de daño: `cantidad`d`caras` + `suma`. */
  dano: { cantidad: number; caras: number; suma: number };
  aporteBonificacion: AporteBonificacion;
  /**
   * Puede empalar: con éxito extremo atraviesa en vez de golpear. Marcadas
   * con «(i)» en la tabla del manual. Cambia cómo se calcula el daño
   * excepcional — ver `danoDeAtaque`.
   */
  empala: boolean;
  /** Alcance base en metros. `0` es cuerpo a cuerpo («Touch» en la tabla). */
  alcance: number;
  /** Para la ficha y la prosa: de dónde sale un arma así. */
  nota?: string;
}

/**
 * Las armas, por id. Los valores de daño salen de la Tabla XVII; los nombres
 * y las notas son nuestros —un «facón» no está en un manual escrito en
 * inglés, pero mecánicamente es el cuchillo grande de esa tabla—.
 */
export const ARMAS: Arma[] = [
  // ── Sin arma ──────────────────────────────────────────────────────────────
  {
    id: 'desarmado', nombre: 'Puños y patadas', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 3, suma: 0 },
    aporteBonificacion: 'completa', empala: false, alcance: 0,
    nota: 'Lo que queda cuando no queda nada.',
  },

  // ── Lo que hay en un galpón ───────────────────────────────────────────────
  {
    id: 'palo-grande', nombre: 'Palo grande', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 8, suma: 0 },
    aporteBonificacion: 'completa', empala: false, alcance: 0,
    nota: 'Un cabo de pala, un atizador, una tranca de portón.',
  },
  {
    id: 'palo-chico', nombre: 'Palo corto', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 6, suma: 0 },
    aporteBonificacion: 'completa', empala: false, alcance: 0,
    nota: 'Un mango roto, una cachiporra, algo que entra en una mano.',
  },
  {
    id: 'piedra', nombre: 'Piedra', habilidad: 'arrojar',
    dano: { cantidad: 1, caras: 4, suma: 0 },
    aporteBonificacion: 'mitad', empala: false, alcance: 10,
    nota: 'Se tira. El alcance depende de la fuerza de quien la tira.',
  },
  {
    id: 'rebenque', nombre: 'Rebenque', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 3, suma: 0 },
    aporteBonificacion: 'mitad', empala: false, alcance: 3,
    nota: 'Duele mucho más de lo que hiere.',
  },
  {
    id: 'antorcha', nombre: 'Antorcha encendida', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 6, suma: 0 },
    aporteBonificacion: 'completa', empala: false, alcance: 0,
    nota: 'Además quema: la ropa y el pelo prenden y siguen ardiendo.',
  },

  // ── Filo ──────────────────────────────────────────────────────────────────
  {
    id: 'navaja', nombre: 'Navaja', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 4, suma: 0 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'Chica, se guarda en el bolsillo, nadie la registra como un arma.',
  },
  {
    id: 'cuchillo-carnear', nombre: 'Cuchillo de carnear', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 4, suma: 2 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'De cocina o de campo. En una estancia hay uno en cada cuarto.',
  },
  {
    id: 'bisturi', nombre: 'Bisturí', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 4, suma: 0 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'Filo fino, pensado para cortar con precisión, no para pelear.',
  },
  {
    id: 'facon', nombre: 'Facón', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 8, suma: 0 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'Hoja larga, a la cintura. Herramienta antes que arma, hasta que no.',
  },
  {
    id: 'hacha-mano', nombre: 'Hacha de mano', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 6, suma: 1 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'También una hoz. Cuelga de un clavo en cualquier galpón.',
  },
  {
    id: 'hacha-lena', nombre: 'Hacha de leña', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 8, suma: 2 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'A dos manos. Pesada, lenta y terminante.',
  },

  // ── Piedra trabajada, siglo XVII ──────────────────────────────────────────
  // La lasca del monolito, tallada a golpes hasta darle filo — «picada, no
  // cortada, herramienta de piedra contra piedra», que es la técnica que el
  // propio contenido de 1928 ya le atribuye al monolito y a la estatua
  // (`agua-blanca.contenido.json`). Es de El Círculo Rojo (c. 1674) y de paso
  // explica de dónde salió `it-lasca-monolito`, la lasca suelta que sigue
  // tirada al pie de la piedra doscientos cincuenta años después.
  //
  // Arma física normal, con Pelea: el nicho de «arma que se usa con otra
  // habilidad» ya lo ocupa el punzón más abajo, y duplicarlo le sacaría
  // sentido a los dos.
  {
    id: 'lasca-tallada', nombre: 'Lasca tallada del monolito', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 6, suma: 0 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota:
      'Un pedazo de la piedra negra, desprendido de la base y trabajado a golpes. Corta mejor de lo que ' +
      'debería cortar una piedra, y pesa menos de lo que debería pesar.',
  },

  // ── Fuera de catálogo: objeto de una aventura concreta ────────────────────
  // Único caso del catálogo con `habilidad` distinta de 'pelea'/'armas_fuego':
  // el motor no sabe nada de esto —`toolResolveAttack` sólo lee
  // `arma.habilidad` para decidir con qué tirar (engine.ts)—, así que un
  // arma que se usa con otra habilidad es, mecánicamente, gratis: no hizo
  // falta tocar el motor ni la pantalla de combate para que exista una
  // segunda vía de vencer a un rival con Ocultismo en vez de Pelea. Ver "El
  // Vigésimo" (elvigesimo.contenido.json, it-punzon-circulo) y ROADMAP
  // §3.2-duoquadragies para el porqué.
  {
    id: 'punzon-circulo', nombre: 'El punzón del Círculo', habilidad: 'ocultismo',
    dano: { cantidad: 1, caras: 4, suma: 0 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota:
      'Del grupo que recuperó conocimiento del anillo entre 1650 y 1675, antes de Bernardo — el mismo ' +
      'gesto de grabar un límite, no pintarlo (ver "El Hombre que Miraba el Agua"). No corta por la fuerza ' +
      'del brazo: corta porque sabe dónde grabar. Usarlo bien es saber, no pegar.',
  },

  // ── Armas de fuego de mano, época ─────────────────────────────────────────
  // La bonificación de daño NO se aplica a armas de fuego (Tabla 1, nota).
  {
    id: 'derringer-25', nombre: 'Derringer .25', habilidad: 'armas_fuego',
    dano: { cantidad: 1, caras: 6, suma: 0 },
    aporteBonificacion: 'ninguna', empala: true, alcance: 3,
    nota: 'Dos tiros y a quemarropa. Se lleva donde no se busca.',
  },
  {
    id: 'revolver-32', nombre: 'Revólver .32', habilidad: 'armas_fuego',
    dano: { cantidad: 1, caras: 8, suma: 0 },
    aporteBonificacion: 'ninguna', empala: true, alcance: 14,
    nota: 'El de cajón de escritorio. Seis tiros.',
  },
  {
    id: 'revolver-38', nombre: 'Revólver .38', habilidad: 'armas_fuego',
    dano: { cantidad: 1, caras: 10, suma: 0 },
    aporteBonificacion: 'ninguna', empala: true, alcance: 14,
    nota: 'El de policía y el de comisaría de pueblo. Seis tiros.',
  },
  {
    id: 'pistola-45', nombre: 'Pistola automática .45', habilidad: 'armas_fuego',
    dano: { cantidad: 1, caras: 10, suma: 2 },
    aporteBonificacion: 'ninguna', empala: true, alcance: 14,
    nota: 'De la guerra. Siete tiros y un culatazo que se siente.',
  },

  // ── Armas coloniales, San Juan de la Frontera, 1710 ───────────────────────
  // Sin número de recarga ni de atasco: el catálogo no modela balas (tampoco
  // lo hace con el revólver de arriba), y este motor no tiene ningún campo
  // para eso todavía. «Tarda en recargar» queda como sabor de la nota y, si
  // hace falta que pese en una escena puntual (Don Gonzalo, en *La Merced de
  // las Ánimas*), lo resuelve el `.logica.ts` de esa aventura cambiándole el
  // arma a mitad de combate (`NPC_COMBATE_CHANGED` con `armaId` nuevo), no el
  // motor. Alcance de mosquete y pistola tomados del análogo histórico del
  // manual (Tabla XVII, apéndice de armas históricas: mosquete de chispa ≈ 30
  // yardas, pistola de chispa ≈ 10 yardas — misma conversión ya usada arriba,
  // yardas reales del manual vueltas metros de este catálogo). Los dados de
  // daño son originales, no transcriptos de esa tabla: un proyectil de
  // avancarga de calibre grande pega más fuerte que un revólver moderno chico
  // pero es mucho más lento e impreciso, que es la relación que importa acá.
  {
    id: 'mosquete-chispa', nombre: 'Mosquete español de chispa', habilidad: 'armas_fuego',
    dano: { cantidad: 2, caras: 6, suma: 0 },
    aporteBonificacion: 'ninguna', empala: true, alcance: 30,
    nota: 'De avancarga. Tarda en recargar — un tiro, y después toca acercarse o repensar.',
  },
  {
    id: 'pistola-chispa', nombre: 'Pistola española de chispa', habilidad: 'armas_fuego',
    dano: { cantidad: 1, caras: 8, suma: 0 },
    aporteBonificacion: 'ninguna', empala: true, alcance: 10,
    nota: 'Más corta que el mosquete. Igual de lenta para recargar.',
  },
  {
    id: 'espada-ropera', nombre: 'Espada', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 8, suma: 0 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'La de Don Gonzalo, cuando se le acaba la pólvora o se le acaba la paciencia.',
  },

  // ── Armas de criatura, sin ficha de investigador ──────────────────────────
  // No necesitan estar pensadas para que un investigador las empuñe —nadie va
  // a elegirlas de un inventario—; sólo necesitan un `id` que un `CombateNpc`
  // pueda declarar en `armaId`, igual que `rebenque` para Cirilo Sosa.
  {
    id: 'rafaga-viento', nombre: 'Ráfaga de viento', habilidad: 'pelea',
    // 1D6, no 2D6. Bajado tras jugarlo: contra un investigador de 11 PV
    // máximos, cualquier golpe de 6 o más es HERIDA GRAVE (p. 119) y obliga
    // a una tirada de CON para no perder el conocimiento — y un investigador
    // inconsciente no puede seguir jugando, porque el motor todavía no tiene
    // con qué reanimarlo. Con 2D6 eso pasaba en más de la mitad de los
    // golpes: entrar al combate que la propia aventura abre terminaba, casi
    // siempre, en una partida trabada.
    //
    // Lo que hace temible al Pólipo no es el daño: son sus 6 de armadura y
    // sus 20 PV, que lo vuelven imposible de matar con lo que se consigue en
    // 1710. La amenaza es que no se le puede ganar, no que ejecute.
    dano: { cantidad: 1, caras: 6, suma: 0 },
    aporteBonificacion: 'completa', empala: false, alcance: 0,
    nota: 'Del Pólipo Septentrional. No hay filo que esquivar, sólo presión que empuja y arranca.',
  },
  {
    id: 'garras-vagabundo', nombre: 'Garras', habilidad: 'pelea',
    dano: { cantidad: 1, caras: 6, suma: 0 },
    aporteBonificacion: 'completa', empala: true, alcance: 0,
    nota: 'Del Vagabundo Dimensional. Piel arrugada, garras que parecen momificadas y no lo están.',
  },
];

export const ARMA_POR_ID: Record<string, Arma> = Object.fromEntries(
  ARMAS.map((a) => [a.id, a]),
);

/**
 * Convierte la bonificación de daño de la ficha (`'+1D4'`, `'-1'`, `'0'`) en
 * dados y suma fija, según cuánto aporte el arma.
 *
 * La bonificación es negativa para gente chica (-1, -2), un dado para gente
 * grande (+1D4, +1D6…). Las armas arrojadizas aportan la mitad; las de fuego,
 * nada (Tabla 1, nota al pie).
 */
export function bonificacionAplicada(
  bonificacion: string,
  aporte: AporteBonificacion,
): { cantidad: number; caras: number; suma: number } {
  if (aporte === 'ninguna') return { cantidad: 0, caras: 0, suma: 0 };
  const mitad = aporte === 'mitad';

  const conDado = bonificacion.match(/^\+(\d+)D(\d+)$/i);
  if (conDado) {
    const cantidad = Number(conDado[1]);
    const caras = Number(conDado[2]);
    // La mitad de «+2D6» es «+1D6»; la mitad de «+1D4» es un solo dado igual
    // —no existe medio dado— y el manual no reparte fracciones de dado.
    return { cantidad: mitad ? Math.max(1, Math.floor(cantidad / 2)) : cantidad, caras, suma: 0 };
  }

  const fija = Number(bonificacion);
  if (!Number.isFinite(fija) || fija === 0) return { cantidad: 0, caras: 0, suma: 0 };
  return { cantidad: 0, caras: 0, suma: mitad ? Math.trunc(fija / 2) : fija };
}

/** Cuántos dados de cada tipo hace falta tirar para resolver este ataque. */
export function dadosQuePide(
  arma: Arma,
  bonificacion: string,
): Array<{ caras: number; cantidad: number }> {
  const bon = bonificacionAplicada(bonificacion, arma.aporteBonificacion);
  const pedidos: Array<{ caras: number; cantidad: number }> = [
    { caras: arma.dano.caras, cantidad: arma.dano.cantidad },
  ];
  if (bon.cantidad > 0) pedidos.push({ caras: bon.caras, cantidad: bon.cantidad });
  return pedidos;
}

/** El máximo posible del arma sola, sin bonificación. Para el empalamiento. */
export const maximoDelArma = (arma: Arma): number =>
  arma.dano.cantidad * arma.dano.caras + arma.dano.suma;

/**
 * Qué tan lejos está el blanco, traducido a lo único que el manual dice que
 * cambia con la distancia: la dificultad del tiro (p. 112, «Range and
 * Firearms Difficulty Levels») y si hay bonificación por quemarropa (p. 113,
 * «Point-Blank Range»). El daño del arma NO varía con la distancia —esa es
 * la excepción de la escopeta, que a propósito no está en este catálogo
 * (ver el comentario de cabecera).
 *
 * No depende de `arma.habilidad`: se basa en `arma.alcance`, que ya es un
 * campo genérico de cualquier arma —incluye la piedra arrojadiza, no sólo
 * las de fuego—. Un arma con `alcance: 0` (cuerpo a cuerpo, «Touch» en la
 * tabla) sólo puede pegar a distancia 0; a cualquier otra distancia es
 * `necesita_cerrar` —hay que acercarse primero, no es un tiro imposible—.
 * `fuera_de_alcance` es un caso distinto, propio de las armas con alcance
 * real: ni el tiro más desesperado llega tan lejos. Conviene no confundir
 * los dos: un rival cuerpo a cuerpo lejos tiene que CERRAR distancia en su
 * propio turno (ver `ataqueDeNpcContraInvestigador` en engine.ts); uno que
 * dispara y ya está fuera de su cuádruple alcance, en cambio, no tiene nada
 * que cerrar, sólo puede acercarse o esperar.
 */
export type NivelDeAlcance =
  | { tipo: 'cuerpo_a_cuerpo' }
  | { tipo: 'necesita_cerrar' }
  | { tipo: 'fuera_de_alcance' }
  | { tipo: 'a_distancia'; dificultad: Difficulty; quemarropa: boolean };

export function nivelDeAlcance(
  arma: Arma,
  distanciaMetros: number,
  dexTirador: number,
): NivelDeAlcance {
  if (arma.alcance === 0) {
    return distanciaMetros <= 0 ? { tipo: 'cuerpo_a_cuerpo' } : { tipo: 'necesita_cerrar' };
  }

  // «Point-blank range--within a fifth of the shooter's DEX in feet» (p. 113).
  // La DEX es un puntaje 0-100, no una distancia: se toma el número tal cual
  // fueran pies, se lo divide 5 y se convierte a metros porque este catálogo
  // ya declara `alcance` en metros, no en las yardas del manual original.
  const quemarropaMetros = (dexTirador / 5) * 0.3048;
  const quemarropa = distanciaMetros <= quemarropaMetros;

  if (distanciaMetros <= arma.alcance) return { tipo: 'a_distancia', dificultad: 'regular', quemarropa };
  if (distanciaMetros <= arma.alcance * 2) return { tipo: 'a_distancia', dificultad: 'hard', quemarropa };
  if (distanciaMetros <= arma.alcance * 4) return { tipo: 'a_distancia', dificultad: 'extreme', quemarropa };
  return { tipo: 'fuera_de_alcance' };
}
