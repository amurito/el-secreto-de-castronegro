/**
 * EL DINERO, Y POR QUÉ ACÁ HAY UN NÚMERO DONDE EL MANUAL NO LO TIENE.
 *
 * CoC 7e no lleva la cuenta de monedas. Resuelve el dinero con Crédito: una
 * habilidad que dice de qué nivel social sos, cuánto podés gastar sin que
 * nadie pregunte, y si te fían. No hay saldo que restar, y es deliberado —
 * contar pesos en la mesa distrae de lo que la partida está tratando.
 *
 * Este proyecto necesita, además, VENDER. Y una venta que no cambia ningún
 * número no es una venta: es regalar algo con una frase amable. Así que acá
 * el Crédito sigue siendo lo que es —de dónde sale el efectivo inicial, y
 * qué puertas te abre— pero encima se lleva un saldo real.
 *
 * Los números están calibrados para 1930 argentino y son propios, no de
 * ninguna tabla licenciada: un peón de obra ganaba unos pocos pesos al día,
 * un farol de querosén costaba unos pocos pesos, y un médico rural con
 * Crédito 50 tiene que poder comprar lo que necesite sin pensarlo y aun así
 * no poder comprar un campo.
 */

/**
 * Con cuánto efectivo arranca alguien con este Crédito.
 *
 * Diez pesos por punto: Crédito 0 arranca sin un peso —que es exactamente lo
 * que Crédito 0 significa en el manual, «indigente»—, un boxeador de Crédito
 * 15 arranca con 150, y un médico rural de 50 con 500. La progresión es
 * lineal a propósito: una curva haría que los extremos del reparto
 * significaran cosas muy distintas de las que el manual les asigna, y no hay
 * ninguna aventura que necesite esa precisión.
 */
export const PESOS_POR_PUNTO_DE_CREDITO = 10;

export function efectivoInicial(credito: number): number {
  return Math.max(0, Math.floor(credito)) * PESOS_POR_PUNTO_DE_CREDITO;
}

/**
 * Lo que alguien PAGA por algo que le llevan a vender, contra su valor de
 * referencia. Nadie compra al precio que vende: la diferencia es de quien
 * tiene el mostrador.
 *
 * 50% por defecto, y el contenido puede subirlo o bajarlo por comerciante
 * (`Npc.comercio.margen`) — a Petrona le podés sacar más que a un
 * anticuario de ciudad, no porque sea generosa sino porque no sabe.
 */
export const MARGEN_POR_DEFECTO = 0.5;

export function loQuePagan(valor: number, margen = MARGEN_POR_DEFECTO): number {
  return Math.max(1, Math.round(valor * margen));
}

/**
 * Qué se ve escrito cuando el juego habla de plata. Una función y no un
 * `${n} pesos` suelto por ahí, para que el día que una aventura pase en un
 * lugar donde la moneda se llama distinto haya UN lugar que tocar.
 */
export function enPesos(n: number): string {
  return `${n} peso${n === 1 ? '' : 's'}`;
}
