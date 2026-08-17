/**
 * PRUEBA DE LAS REGLAS DE COMBATE — `npm run prueba:combate`
 *
 * Verifica las reglas del cap. 6 de CoC 7e contra el manual, en aislamiento:
 * la tirada enfrentada (quién gana los empates según qué eligió el defensor),
 * el éxito extremo (empalar vs. golpear), y la tabla de armas.
 *
 * NO prueba un combate jugado de punta a punta: eso todavía no existe —los
 * NPC no tienen puntos de vida ni turnos—. Lo que existe hoy son las reglas
 * puras y el catálogo, y es lo que se verifica acá. Cuando el motor sepa
 * resolver un asalto entero, esta prueba crece con él.
 */

import { ARMAS, ARMA_POR_ID, bonificacionAplicada, dadosQuePide, maximoDelArma } from './rules/armas.ts';
import { resolverEnfrentamiento, danoDeAtaque } from './rules/combate.ts';
import { damageDice, hmacForIndex } from './engine/rng.ts';
import { SKILL_BY_ID } from './rules/skills.ts';
import type { SuccessDegree } from './shared/types.ts';

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

function main() {
  // ── La tirada enfrentada ─────────────────────────────────────────────────
  console.log('\nCONTRA QUIEN ESQUIVA: EL EMPATE LO GANA EL QUE ESQUIVA');
  const esq = (atacante: SuccessDegree, defensor: SuccessDegree) =>
    resolverEnfrentamiento({ atacante, defensor, defensa: 'esquiva' });

  check('mejor grado del atacante: entra', esq('hard', 'regular').golpea === 'defensor');
  check('mejor grado del defensor: esquivó', esq('regular', 'hard').golpea === null);
  check('empate: gana el que esquiva', esq('regular', 'regular').golpea === null);
  check('los dos fallan: no pasa nada', esq('failure', 'failure').golpea === null);
  check('esquivar nunca lastima al atacante',
    esq('failure', 'extreme').golpea === null,
    'quien esquiva evita, no devuelve');

  console.log('\nCONTRA QUIEN DEVUELVE EL GOLPE: EL EMPATE LO GANA EL ATACANTE');
  const con = (atacante: SuccessDegree, defensor: SuccessDegree) =>
    resolverEnfrentamiento({ atacante, defensor, defensa: 'contraataca' });

  check('mejor grado del atacante: entra', con('hard', 'regular').golpea === 'defensor');
  check('empate: gana quien empezó', con('regular', 'regular').golpea === 'defensor');
  check('mejor grado del defensor: LE PEGA AL ATACANTE',
    con('regular', 'hard').golpea === 'atacante',
    'contraatacar arriesga más y paga más');
  check('los dos fallan: no pasa nada', con('failure', 'failure').golpea === null);
  check('el atacante falla y el defensor acierta: contraataque',
    con('failure', 'regular').golpea === 'atacante');

  // ── El éxito extremo ─────────────────────────────────────────────────────
  console.log('\nEL ÉXITO EXTREMO ES DE QUIEN INICIA, NO DE QUIEN REACCIONA');
  check('el atacante con extremo, empala', con('extreme', 'regular').extremo);
  check('el crítico también', con('critical', 'regular').extremo);
  check('un éxito difícil NO', con('hard', 'regular').extremo === false);
  check('el defensor que contraataca con extremo NO empala',
    con('failure', 'extreme').extremo === false,
    'es una reacción, no un momento propio');

  // ── El daño ──────────────────────────────────────────────────────────────
  console.log('\nEL DAÑO NORMAL SUMA ARMA + CORPULENCIA');
  const facon = ARMA_POR_ID['facon']!;
  const normal = danoDeAtaque(facon, '+1D4', [5], [3], false);
  check('facón 1D8 sacando 5, con +1D4 sacando 3 → 8', normal.total === 8, `${normal.total}`);

  const revolver = ARMA_POR_ID['revolver-38']!;
  const conFuego = danoDeAtaque(revolver, '+1D6', [7], [], false);
  check('un revólver NO suma corpulencia, por más grande que sea el que dispara',
    conFuego.total === 7, `${conFuego.total}`);

  const debil = danoDeAtaque(ARMA_POR_ID['desarmado']!, '-2', [3], [], false);
  check('un investigador chico resta al daño de sus propios puños',
    debil.total === 1, `${debil.total}`);
  check('pero el daño nunca baja de cero',
    danoDeAtaque(ARMA_POR_ID['desarmado']!, '-2', [1], [], false).total === 0);

  console.log('\nEL EXTREMO: EMPALAR NO ES LO MISMO QUE GOLPEAR FUERTE');
  // Facón: 1D8, empala. Máximo 8 + máximo de +1D4 (4) + una tirada entera.
  const empalado = danoDeAtaque(facon, '+1D4', [6], [], true);
  check('facón: 8 (máx) + 4 (máx corpulencia) + 6 (la tirada extra) = 18',
    empalado.total === 18, `${empalado.total}`);

  // Palo grande: 1D8, NO empala. Máximo 8 + máximo de +1D4 (4), sin extra.
  const palo = ARMA_POR_ID['palo-grande']!;
  const golpeado = danoDeAtaque(palo, '+1D4', [6], [], true);
  check('palo: 8 (máx) + 4 (máx corpulencia), sin tirada extra = 12',
    golpeado.total === 12, `${golpeado.total}`);
  check('con la misma tirada, empalar duele más que golpear',
    empalado.total > golpeado.total, `${empalado.total} vs ${golpeado.total}`);

  const balaExtrema = danoDeAtaque(revolver, '+1D6', [8], [], true);
  check('una bala empala y no suma corpulencia: 10 (máx) + 8 = 18',
    balaExtrema.total === 18, `${balaExtrema.total}`);

  // ── La bonificación de daño según el arma ────────────────────────────────
  console.log('\nCADA ARMA APORTA LO SUYO DE CORPULENCIA');
  check('cuerpo a cuerpo: completa', bonificacionAplicada('+1D6', 'completa').caras === 6);
  check('arrojadiza: la mitad de los dados',
    bonificacionAplicada('+2D6', 'mitad').cantidad === 1);
  check('arrojadiza con un solo dado: sigue siendo un dado, no medio',
    bonificacionAplicada('+1D4', 'mitad').cantidad === 1);
  check('arma de fuego: nada', bonificacionAplicada('+2D6', 'ninguna').cantidad === 0);
  check('la resta también se parte a la mitad al arrojar',
    bonificacionAplicada('-2', 'mitad').suma === -1, `${bonificacionAplicada('-2', 'mitad').suma}`);

  // ── El catálogo ──────────────────────────────────────────────────────────
  console.log('\nEL CATÁLOGO DE ARMAS');
  console.log(`  ${ARMAS.length} armas`);
  check('ninguna id repetida', new Set(ARMAS.map((a) => a.id)).size === ARMAS.length);
  check('todas usan una habilidad que existe en la ficha',
    ARMAS.every((a) => Boolean(SKILL_BY_ID[a.habilidad])),
    ARMAS.filter((a) => !SKILL_BY_ID[a.habilidad]).map((a) => a.habilidad).join(', ') || 'todas');
  check('ninguna arma de fuego suma corpulencia (Tabla 1, nota al pie)',
    ARMAS.filter((a) => a.habilidad === 'armas_fuego').every((a) => a.aporteBonificacion === 'ninguna'));
  check('las balas y los filos empalan; los palos y los puños no',
    ARMA_POR_ID['navaja']!.empala && ARMA_POR_ID['revolver-32']!.empala
    && !ARMA_POR_ID['palo-chico']!.empala && !ARMA_POR_ID['desarmado']!.empala);
  check('el cuerpo a cuerpo tiene alcance 0 y lo arrojadizo no',
    ARMA_POR_ID['facon']!.alcance === 0 && ARMA_POR_ID['piedra']!.alcance > 0);

  // Lo que se dejó afuera a propósito: si alguien agrega una escopeta sin
  // resolver antes el alcance, esta prueba se pone roja y explica por qué.
  check('no hay escopetas ni rifles todavía —su daño depende de la distancia—',
    !ARMAS.some((a) => /escopeta|rifle|fusil/i.test(a.nombre)),
    'entran cuando el motor tenga distancias');
  check('tampoco armas fuera de época o de guerra',
    !ARMAS.some((a) => /thompson|lanzacohetes|granada|ametralladora/i.test(a.nombre)));

  console.log('\nQUÉ DADOS PIDE CADA ATAQUE');
  const pideFacon = dadosQuePide(facon, '+1D4');
  check('facón con corpulencia: pide 1D8 y 1D4',
    pideFacon.length === 2 && pideFacon[0]!.caras === 8 && pideFacon[1]!.caras === 4,
    JSON.stringify(pideFacon));
  const pideRevolver = dadosQuePide(revolver, '+1D4');
  check('revólver: pide sólo 1D10, la corpulencia no entra',
    pideRevolver.length === 1 && pideRevolver[0]!.caras === 10);
  check('el máximo del arma sale de sus propios dados',
    maximoDelArma(ARMA_POR_ID['cuchillo-carnear']!) === 6, '1D4+2 → 6');

  // ── Los dados de daño salen de la cadena verificable ─────────────────────
  console.log('\nLOS DADOS DE DAÑO SON AUDITABLES Y NO SE PISAN CON LAS TIRADAS');
  const semilla = 'a'.repeat(64);
  const d1 = damageDice(semilla, 7, 8, 1);
  const d2 = damageDice(semilla, 7, 8, 1);
  check('mismo seed y mismo índice: mismo dado, siempre',
    d1.dice[0] === d2.dice[0], `${d1.dice[0]} y ${d2.dice[0]}`);
  check('deja constancia del HMAC, como cualquier tirada', d1.hmac.length === 64);

  let fuera = 0;
  for (const caras of [3, 4, 6, 8, 10]) {
    for (let i = 0; i < 400; i++) {
      const [v] = damageDice(semilla, i, caras, 1).dice;
      if (v === undefined || v < 1 || v > caras) fuera++;
    }
  }
  check('un D3 da 1-3, un D10 da 1-10, y nunca un 0', fuera === 0, `${fuera} fuera de rango`);

  // El sesgo importa acá: el daño se acumula tirada tras tirada.
  const cuenta = new Map<number, number>();
  for (let i = 0; i < 6000; i++) {
    const [v] = damageDice(semilla, i, 3, 1).dice;
    cuenta.set(v!, (cuenta.get(v!) ?? 0) + 1);
  }
  const valores = [1, 2, 3].map((v) => cuenta.get(v) ?? 0);
  const desvio = Math.max(...valores) / Math.min(...valores);
  console.log(`  un D3 seis mil veces: ${valores.join(' / ')}`);
  check('el rechazo por muestreo mantiene el D3 parejo', desvio < 1.1, `desvío ${desvio.toFixed(3)}`);

  // El HMAC del daño en el índice N tiene que ser DISTINTO del de la tirada
  // de habilidad en el índice N: si fueran el mismo, el daño de un ataque
  // estaría correlacionado con la tirada que lo produjo.
  const hmacDano = damageDice(semilla, 3, 10, 1).hmac;
  const hmacTirada = hmacForIndex(semilla, 3);
  check('el flujo de daño NO es el mismo que el de las tiradas de habilidad',
    hmacDano !== hmacTirada, 'mismo índice, etiqueta distinta');

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main();
