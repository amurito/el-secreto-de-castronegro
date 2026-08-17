/**
 * PRUEBA DE COMBATE — `npm run prueba:combate`
 *
 * Dos capas:
 *
 *   1. LAS REGLAS, en aislamiento: la tirada enfrentada del cap. 6 (quién
 *      gana los empates según qué eligió el defensor), el éxito extremo
 *      (empalar vs. golpear) y la tabla de armas.
 *   2. EL ASALTO JUGADO, con el motor: un personaje con estadísticas de
 *      combate, un ataque real, daño que baja PV de verdad, y las cosas que
 *      el motor tiene que RECHAZAR —pegarle a quien no tiene con qué
 *      defenderse, o ensañarse con alguien que ya está en el piso.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { ARMAS, ARMA_POR_ID, bonificacionAplicada, dadosQuePide, maximoDelArma } from './rules/armas.ts';
import { resolverEnfrentamiento, danoDeAtaque } from './rules/combate.ts';
import { damageDice, hmacForIndex } from './engine/rng.ts';
import { SKILL_BY_ID } from './rules/skills.ts';
import type { SuccessDegree, NpcSeed } from './shared/types.ts';
import type { Scenario } from './scenario/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/**
 * Un matón inventado para esta prueba. No se le agregan estadísticas de
 * combate a ningún personaje de las tres aventuras publicadas: ninguna de
 * las tres es una aventura de pelear, y darle puntos de vida a la viuda de
 * Agua Quieta sería sugerir que pegarle es una opción que el juego contempla.
 */
const MATON: NpcSeed = {
  id: 'npc-maton',
  name: 'Un hombre en el portón',
  canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
  status: 'alive',
  description: 'Grande, callado, y evidentemente esperando a alguien.',
  motivation: 'Que no pase.',
  fears: [], refusals: [], knowledge: [], secrets: [], relationships: [],
  attitude: {}, present: true, isCompanion: false, createdAt: 'inicio',
  combate: {
    hp: 12, maxHp: 12, pelea: 55, esquivar: 30,
    armaId: 'palo-grande', bonificacionDano: '+1D4',
    defensaPorDefecto: 'contraataca',
  },
};

async function main() {
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
  const d1 = damageDice(semilla, 7, 'arma', 8, 1);
  const d2 = damageDice(semilla, 7, 'arma', 8, 1);
  check('mismo seed y mismo índice: mismo dado, siempre',
    d1.dice[0] === d2.dice[0], `${d1.dice[0]} y ${d2.dice[0]}`);
  check('deja constancia del HMAC, como cualquier tirada', d1.hmac.length === 64);

  let fuera = 0;
  for (const caras of [3, 4, 6, 8, 10]) {
    for (let i = 0; i < 400; i++) {
      const [v] = damageDice(semilla, i, 'arma', caras, 1).dice;
      if (v === undefined || v < 1 || v > caras) fuera++;
    }
  }
  check('un D3 da 1-3, un D10 da 1-10, y nunca un 0', fuera === 0, `${fuera} fuera de rango`);

  // El sesgo importa acá: el daño se acumula tirada tras tirada.
  const cuenta = new Map<number, number>();
  for (let i = 0; i < 6000; i++) {
    const [v] = damageDice(semilla, i, 'arma', 3, 1).dice;
    cuenta.set(v!, (cuenta.get(v!) ?? 0) + 1);
  }
  const valores = [1, 2, 3].map((v) => cuenta.get(v) ?? 0);
  const desvio = Math.max(...valores) / Math.min(...valores);
  console.log(`  un D3 seis mil veces: ${valores.join(' / ')}`);
  check('el rechazo por muestreo mantiene el D3 parejo', desvio < 1.1, `desvío ${desvio.toFixed(3)}`);

  // El HMAC del daño en el índice N tiene que ser DISTINTO del de la tirada
  // de habilidad en el índice N: si fueran el mismo, el daño de un ataque
  // estaría correlacionado con la tirada que lo produjo.
  const hmacDano = damageDice(semilla, 3, 'arma', 10, 1).hmac;
  const hmacTirada = hmacForIndex(semilla, 3);
  check('el flujo de daño NO es el mismo que el de las tiradas de habilidad',
    hmacDano !== hmacTirada, 'mismo índice, etiqueta distinta');

  check('el arma y la corpulencia no sacan el mismo número aunque tengan las mismas caras',
    damageDice(semilla, 5, 'arma', 6, 1).dice[0] !== damageDice(semilla, 5, 'bonif', 6, 1).dice[0]
    || damageDice(semilla, 9, 'arma', 6, 1).dice[0] !== damageDice(semilla, 9, 'bonif', 6, 1).dice[0],
    'ranuras distintas, flujos distintos');

  // ═══════════════════════════════════════════════════════════════════════
  // EL ASALTO JUGADO, CON EL MOTOR
  // ═══════════════════════════════════════════════════════════════════════

  const conMaton: Scenario = {
    ...AGUA_QUIETA,
    id: 'prueba-combate',
    npcs: [...AGUA_QUIETA.npcs, MATON],
  };

  console.log('\nEL MOTOR RECHAZA LO QUE NO ES UNA PELEA');
  {
    const id = await createCampaign(conMaton, 'COMBATE-RECHAZOS', 'a'.repeat(64));
    const t = await Turn.open(id);

    const sinFicha = t.executeTool('resolve_attack', { npc_id: 'npc-rosa' });
    check('pegarle a alguien sin estadísticas de combate se rechaza',
      !sinFicha.ok && /no tiene estadísticas de combate/i.test(sinFicha.message),
      sinFicha.message.slice(0, 60));
    check('y el rechazo explica qué hacer en vez de eso',
      /narrá/i.test(sinFicha.message));

    const inexistente = t.executeTool('resolve_attack', { npc_id: 'npc-nadie' });
    check('atacar a alguien que no existe se rechaza', !inexistente.ok);

    const armaRara = t.executeTool('resolve_attack', { npc_id: 'npc-maton', weapon_id: 'bazuca' });
    check('un arma que no está en el catálogo se rechaza', !armaRara.ok);
    check('y el rechazo lista las que sí hay', /desarmado|facon/.test(armaRara.message));
  }

  console.log('\nUN ASALTO DE VERDAD');
  {
    const id = await createCampaign(conMaton, 'COMBATE-ASALTO', 'b'.repeat(64));
    const t = await Turn.open(id);
    const antesRolls = t.state.rolls.length;

    const r = t.executeTool('resolve_attack', {
      npc_id: 'npc-maton', weapon_id: 'facon', reason: 'sacármelo de encima',
    });
    await t.commit();
    const s = (await Turn.open(id)).state;

    check('el asalto se resuelve', r.ok, r.message.split('\n')[0]);
    console.log(`  ${r.message.replace(/\n/g, '\n  ')}`);

    check('tiró por los DOS: el que ataca y el que se defiende',
      s.rolls.length === antesRolls + 2, `${s.rolls.length - antesRolls} tiradas`);
    check('la tirada del rival quedó en el registro público, no escondida',
      s.rolls.some((x) => x.investigatorId === 'npc-maton'),
      s.rolls.map((x) => x.commitment.skillLabel).join(' | '));
    check('las dos tiradas tienen prueba criptográfica',
      s.rolls.slice(-2).every((x) => x.execution.proof.hmac.length === 64));
    check('y usan índices distintos de la cadena',
      s.rolls.at(-1)!.execution.proof.index !== s.rolls.at(-2)!.execution.proof.index);

    const maton = s.npcs['npc-maton']!;
    const inv = s.investigators[s.activeInvestigator]!;
    const alguienCobro = maton.combate!.hp < 12 || inv.derived.hp < inv.derived.maxHp;
    check('alguien terminó lastimado, o el motor dijo que nadie',
      alguienCobro || /Nadie sale lastimado/.test(r.message),
      `matón ${maton.combate!.hp}/12 · investigadora ${inv.derived.hp}/${inv.derived.maxHp}`);
  }

  console.log('\nEL DAÑO BAJA PV DE VERDAD, Y CERO ES FUERA DE COMBATE');
  {
    // Elena es médica: Pelea 25. Contra el matón de 55 que devuelve el golpe
    // cae antes de tumbarlo, que es como tiene que ser. Para medir el daño
    // hace falta un rival al que se le pueda ganar: uno que esquiva —y por
    // lo tanto no devuelve— y aguanta poco.
    const flojo: Scenario = {
      ...AGUA_QUIETA,
      id: 'prueba-combate-flojo',
      npcs: [...AGUA_QUIETA.npcs, {
        ...MATON, id: 'npc-flojo', name: 'Un muchacho asustado',
        combate: {
          ...MATON.combate!, pelea: 10, esquivar: 15, hp: 6, maxHp: 6,
          defensaPorDefecto: 'esquiva' as const,
        },
      }],
    };
    const id = await createCampaign(flojo, 'COMBATE-CAIDA', 'c'.repeat(64));
    let golpes = 0;
    let cayo = false;
    for (let n = 0; n < 40 && !cayo; n++) {
      const t = await Turn.open(id);
      if (t.state.npcs['npc-flojo']!.combate!.hp <= 0) { cayo = true; break; }
      if (t.investigator.derived.hp <= 0) break;
      t.executeTool('resolve_attack', { npc_id: 'npc-flojo', weapon_id: 'facon' });
      await t.commit();
      golpes++;
      cayo = (await Turn.open(id)).state.npcs['npc-flojo']!.combate!.hp <= 0;
    }
    const s = (await Turn.open(id)).state;
    console.log(`  ${golpes} asaltos · ${s.npcs['npc-flojo']!.combate!.hp}/6 PV`);
    check('insistiendo se lo tumba', cayo, `${golpes} asaltos`);
    check('los PV nunca quedan negativos', s.npcs['npc-flojo']!.combate!.hp >= 0);
    check('el registro dice que quedó fuera de combate',
      s.narrative.some((n) => /fuera de combate/i.test(n.text)));
    check('quien esquiva no devuelve el golpe: la investigadora sale entera',
      s.investigators[s.activeInvestigator]!.derived.hp
        === s.investigators[s.activeInvestigator]!.derived.maxHp);

    const t2 = await Turn.open(id);
    const ensanarse = t2.executeTool('resolve_attack', { npc_id: 'npc-flojo', weapon_id: 'facon' });
    check('ensañarse con alguien que ya está en el piso se rechaza',
      !ensanarse.ok && /fuera de combate/i.test(ensanarse.message),
      ensanarse.message.slice(0, 70));
    check('y el rechazo dice que eso se narra, no se tira',
      /se narra/i.test(ensanarse.message));
  }

  console.log('\nEL QUE DEVUELVE EL GOLPE PUEDE LASTIMAR AL QUE EMPEZÓ');
  {
    // Un matón mucho mejor peleador que la investigadora: tarde o temprano
    // gana un intercambio y le entra. Es el camino `golpea: 'atacante'`.
    const bruto: Scenario = {
      ...AGUA_QUIETA,
      id: 'prueba-combate-bruto',
      npcs: [...AGUA_QUIETA.npcs, {
        ...MATON, id: 'npc-bruto',
        combate: { ...MATON.combate!, pelea: 90, hp: 40, maxHp: 40 },
      }],
    };
    const id = await createCampaign(bruto, 'COMBATE-CONTRA', 'd'.repeat(64));
    let recibio = false;
    for (let n = 0; n < 25 && !recibio; n++) {
      const t = await Turn.open(id);
      if (t.investigator.derived.hp <= 0) break;
      t.executeTool('resolve_attack', { npc_id: 'npc-bruto', weapon_id: 'desarmado' });
      await t.commit();
      const s = (await Turn.open(id)).state;
      const inv = s.investigators[s.activeInvestigator]!;
      recibio = inv.derived.hp < inv.derived.maxHp;
    }
    const s = (await Turn.open(id)).state;
    const inv = s.investigators[s.activeInvestigator]!;
    check('un rival que devuelve el golpe termina lastimando a quien lo atacó',
      recibio, `investigadora ${inv.derived.hp}/${inv.derived.maxHp} PV`);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
