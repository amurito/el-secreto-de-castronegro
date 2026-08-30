/**
 * CATÁLOGO DE ARMAS — CoC 7e, Tabla XVII (verificado contra el manual).
 *
 * PURO: son datos y una función que suma dados ya tirados. No tira nada.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE SUBCONJUNTO Y NO LA TABLA ENTERA
 *
 * La tabla del manual cubre desde una piedra hasta un cañón de 120mm. Este
 * juego pasa en estancias de la provincia de Buenos Aires en 1924-25: lo que
 * hay a mano es lo que hay en un galpón —un hacha, un facón, un palo— y, en
 * el peor caso, el revólver que alguien guarda en un cajón. Un subfusil
 * Thompson o un lanzacohetes no van a aparecer, y meterlos «por completitud»
 * sería invitar a escribir una escena que el juego no quiere tener.
 *
 * Cuando haga falta más, se agrega una fila acá y nada más: el resolvedor de
 * combate no conoce ningún arma en particular.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LO QUE FALTA A PROPÓSITO
 *
 * Escopetas y rifles largos NO están todavía. No es olvido: el daño de una
 * escopeta depende del tramo de distancia (4D6 / 2D6 / 1D6 según a cuántos
 * metros esté el blanco) y este motor no tiene posiciones ni distancias
 * dentro de una escena. Meterla con un solo número sería declarar una regla
 * que el manual no dice. Entra cuando exista el alcance.
 */

import type { SkillId } from '../shared/types.ts';

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
