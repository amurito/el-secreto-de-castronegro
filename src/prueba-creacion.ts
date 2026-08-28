/**
 * PRUEBA DE CREACIÓN DE INVESTIGADOR — `npm run prueba:creacion`
 *
 * Lo que verifica no es que se pueda armar una ficha: es que **no se pueda
 * armar una ficha inventada**.
 *
 * La creación es el único momento en que el jugador propone números y el juego
 * los acepta. Si la validación vive en la interfaz, alcanza con abrir la
 * consola para entrar a la campaña con Medicina 95 y Suerte 99, y a partir de
 * ahí todas las garantías del motor —dados verificables, gates, muerte
 * permanente— dejan de significar nada, porque el punto de partida era falso.
 *
 * Así que la validación es del motor y esta prueba la ataca.
 */

import { createCampaign, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { OCUPACION_POR_ID, OCUPACIONES } from './scenario/ocupaciones.ts';
import {
  tirarCaracteristicas, tirarSuerte, efectoEdad, puntosDeOcupacion,
  puntosPersonales, validarReparto, TOPE_CREACION, FORMULA,
} from './rules/creacion.ts';
import { tirarFicha, crearInvestigador } from './rules/ficha.ts';
import { computeDerived } from './rules/derived.ts';
import type { Characteristics } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/** Dados deterministas, para que la prueba no dependa de la suerte. */
const fijo = (v: number) => () => v;
const secuencia = (vs: number[]) => { let i = 0; return () => vs[i++ % vs.length]!; };

const TRASFONDO = [
  { id: 'a1', kind: 'personas' as const, text: 'Su hermana, en Rosario.' },
  { id: 'a2', kind: 'ideologia' as const, text: 'Cree en lo que se puede medir.' },
  { id: 'a3', kind: 'rasgos' as const, text: 'Anota antes de opinar.' },
];

function main() {
  // ── Las tiradas están en rango ───────────────────────────────────────────
  console.log('\nLAS TIRADAS DAN LO QUE EL MANUAL DICE');
  const d6 = () => 1 + Math.floor(Math.random() * 6);
  let fuera3d6 = 0, fuera2d6 = 0;
  for (let n = 0; n < 500; n++) {
    const ch = tirarCaracteristicas(d6);
    for (const [id, formula] of Object.entries(FORMULA)) {
      const v = ch[id as keyof Characteristics];
      if (formula === '3d6' && (v < 15 || v > 90)) fuera3d6++;
      if (formula === '2d6+6' && (v < 40 || v > 90)) fuera2d6++;
    }
  }
  check('3D6×5 cae siempre entre 15 y 90', fuera3d6 === 0, `${fuera3d6} fuera`);
  check('(2D6+6)×5 cae siempre entre 40 y 90', fuera2d6 === 0, `${fuera2d6} fuera`);
  check('la Suerte también', (() => {
    for (let n = 0; n < 300; n++) { const s = tirarSuerte(d6); if (s < 15 || s > 90) return false; }
    return true;
  })());

  // ── La edad cobra ────────────────────────────────────────────────────────
  console.log('\nLA EDAD COBRA Y PAGA');
  check('a los 20 no hay resta física', efectoEdad(25).restaFisica === 0);
  check('a los 45 hay resta y dos chequeos de EDU',
    efectoEdad(45).restaFisica === 5 && efectoEdad(45).chequeosEdu === 2);
  check('a los 75 la resta es fuerte', efectoEdad(75).restaFisica === 40);
  check('a los 85 la resta es la máxima de la tabla —tramo distinto del de 75—',
    efectoEdad(85).restaFisica === 80 && efectoEdad(85).restaApariencia === 25);
  check('el adolescente tira Suerte dos veces', efectoEdad(17).dobleSuerte);
  const joven = tirarFicha(17, fijo(3));
  check('y se queda con la mejor',
    joven.suerteAlternativa === undefined || joven.suerte >= joven.suerteAlternativa);

  // ── El Movimiento resta con la edad (antes no lo hacía nunca) ────────────
  console.log('\nEL MOVIMIENTO RESTA CON LA EDAD');
  const chJoven: Characteristics = { STR: 70, CON: 60, SIZ: 50, DEX: 70, APP: 55, INT: 60, POW: 55, EDU: 60 };
  check('sin resta en la juventud: STR y DEX > SIZ da MOV 9',
    computeDerived(chJoven, { luck: 50, edad: 25 }).move === 9);
  check('a los 45 resta 1 —dos tramos de edad después sigue restando más—',
    computeDerived(chJoven, { luck: 50, edad: 45 }).move === 8);
  check('a los 65 resta 3', computeDerived(chJoven, { luck: 50, edad: 65 }).move === 6);
  check('a los 78 resta 4, nunca por debajo de 1',
    computeDerived(chJoven, { luck: 50, edad: 78 }).move === 5);

  // ── La tabla de Daño y Corpulencia, verificada contra el manual ──────────
  console.log('\nLA TABLA DE DAÑO Y CORPULENCIA (VERIFICADA CONTRA EL MANUAL)');
  // STR+SIZ es lo único que le importa a esta tabla; se pone todo en STR y SIZ en 0.
  const dbYBuild = (strMasSiz: number) =>
    computeDerived({ ...chJoven, STR: strMasSiz, SIZ: 0 } as Characteristics, { luck: 50 });
  check('64: -2 / Build -2', dbYBuild(64).damageBonus === '-2' && dbYBuild(64).build === -2);
  check('124: sin bonificación / Build 0', dbYBuild(124).damageBonus === '0' && dbYBuild(124).build === 0);
  check('164: +1D4 / Build 1', dbYBuild(164).damageBonus === '+1D4' && dbYBuild(164).build === 1);
  check('204: +1D6 / Build 2 —tramo que antes no distinguía de +1D4—',
    dbYBuild(204).damageBonus === '+1D6' && dbYBuild(204).build === 2);
  check('284: +2D6 / Build 3', dbYBuild(284).damageBonus === '+2D6' && dbYBuild(284).build === 3);
  check('524: +5D6 / Build 6 —el último tramo fijo de la tabla—',
    dbYBuild(524).damageBonus === '+5D6' && dbYBuild(524).build === 6);
  check('604 (80 más allá del tope): +6D6 / Build 7 —regla de extrapolación del manual—',
    dbYBuild(604).damageBonus === '+6D6' && dbYBuild(604).build === 7);

  // ── El presupuesto sale de las características ───────────────────────────
  console.log('\nEL PRESUPUESTO SALE DE LA FICHA');
  const ch: Characteristics = { STR: 50, CON: 60, SIZ: 55, DEX: 60, APP: 55, INT: 70, POW: 60, EDU: 75 };
  const medico = OCUPACION_POR_ID['medico-rural']!;
  check('médico rural: EDU × 4', puntosDeOcupacion(medico.formula, ch) === 300, String(puntosDeOcupacion(medico.formula, ch)));
  const agrim = OCUPACION_POR_ID['agrimensor']!;
  check('agrimensor con DES: EDU×2 + DES×2',
    puntosDeOcupacion(agrim.formula, ch, 'DEX') === 75 * 2 + 60 * 2,
    String(puntosDeOcupacion(agrim.formula, ch, 'DEX')));
  check('agrimensor con INT da distinto',
    puntosDeOcupacion(agrim.formula, ch, 'INT') === 75 * 2 + 70 * 2);
  check('intereses personales: INT × 2', puntosPersonales(ch) === 140);

  // ── LO QUE IMPORTA: no se puede hacer trampa ─────────────────────────────
  console.log('\nNO SE PUEDE ENTRAR CON UNA FICHA INVENTADA');

  const legal = {
    ocupacion: { medicina: 60, primeros_auxilios: 40, psicologia: 40, biblioteca: 40,
      buscar_libros: 40, descubrir: 30, ciencia_naturales: 20, credito: 30 },
    personal: { escuchar: 40, historia: 30, orientarse: 30, trepar: 20, nadar: 20 },
  };
  check('un reparto legal pasa', validarReparto(medico, ch, legal).length === 0,
    validarReparto(medico, ch, legal).map((p) => p.mensaje).join(' | '));

  const gastarDeMas = { ...legal, ocupacion: { ...legal.ocupacion, medicina: 400 } };
  check('gastar más puntos de los que hay se rechaza',
    validarReparto(medico, ch, gastarDeMas).some((p) => p.campo === 'ocupacion'));

  const fueraDeOcupacion = { ...legal, ocupacion: { ...legal.ocupacion, sigilo: 40 } };
  check('meter puntos de ocupación en una habilidad ajena se rechaza',
    validarReparto(medico, ch, fueraDeOcupacion).some((p) => p.campo === 'sigilo'));

  const mitos = { ...legal, personal: { ...legal.personal, mitos: 20 } };
  check('comprar Mitos de Cthulhu se rechaza',
    validarReparto(medico, ch, mitos).some((p) => p.campo === 'mitos'));

  const creditoAlto = { ...legal, ocupacion: { ...legal.ocupacion, credito: 95 } };
  check('crédito fuera del rango de la ocupación se rechaza',
    validarReparto(medico, ch, creditoAlto).some((p) => p.campo === 'credito'));

  const creditoCero = { ...legal, ocupacion: { ...legal.ocupacion, credito: 0 } };
  check('crédito por debajo del rango también se rechaza',
    validarReparto(medico, ch, creditoCero).some((p) => p.campo === 'credito'));

  const experta = {
    ocupacion: { medicina: 90, credito: 30 },
    personal: {},
  };
  check(`ninguna habilidad puede pasar de ${TOPE_CREACION}% al crear`,
    validarReparto(medico, ch, experta).some((p) => p.campo === 'medicina'));

  const negativos = { ...legal, personal: { ...legal.personal, escuchar: -50 } };
  check('puntos negativos se rechazan',
    validarReparto(medico, ch, negativos).some((p) => p.mensaje.includes('negativos')));

  // ── El armado completo ───────────────────────────────────────────────────
  console.log('\nEL ARMADO COMPLETO');
  const tirada = { caracteristicas: ch, suerte: 55 };
  const r = crearInvestigador(
    tirada,
    {
      nombre: 'Casilda Ferreyra', genero: 'f', edad: 44, descripcion: 'Médica de pueblo.',
      ocupacionId: 'medico-rural',
      restaFisica: { STR: 3, CON: 2 },
      reparto: legal, trasfondo: TRASFONDO, conexionClave: 'a1',
    },
    medico, secuencia([99, 5]), fijo(4),
  );
  check('la ficha se arma', r.ok, r.problemas.map((p) => p.mensaje).join(' | '));
  const inv = r.investigador!;
  if (inv) {
    console.log(`  ${inv.name}, ${inv.age}, ${inv.occupation} · PV ${inv.derived.maxHp} · COR ${inv.derived.san} · Suerte ${inv.derived.luck}`);
    check('la edad restó lo que tenía que restar',
      inv.characteristics.STR === 47 && inv.characteristics.CON === 58,
      `FUE ${inv.characteristics.STR}, CON ${inv.characteristics.CON}`);
    check('la apariencia también', inv.characteristics.APP === 50, String(inv.characteristics.APP));
    check('hubo chequeos de EDU por la edad', r.chequeosEdu.length === 2, `${r.chequeosEdu.length}`);
    check('la Cordura arranca en POD', inv.derived.san === ch.POW);
    check('los PV salen de CON y TAM', inv.derived.maxHp === Math.floor((inv.characteristics.CON + ch.SIZ) / 10));
    check('las habilidades suman base + repartido',
      inv.skills['medicina']!.base === 1 + 60, String(inv.skills['medicina']!.base));
    check('Esquivar arranca en DES/2 si no se compró',
      inv.skills['esquivar']!.base === Math.floor(inv.characteristics.DEX / 2),
      String(inv.skills['esquivar']!.base));
    check('el trasfondo y la conexión clave quedan',
      inv.backstory.aspects.length === 3 && inv.backstory.keyConnection === 'a1');
    check('arranca sin exposición y sin marcas',
      inv.umbral.exposure === 0 && inv.experience.lastDevelopmentSeq === 0);
    check('sin elegir arma inicial, el resultado queda en null', r.armaInicialId === null);
  }

  // ── El arma inicial, sólo para las ocupaciones que la ofrecen ────────────
  console.log('\nEL ARMA INICIAL POR OCUPACIÓN');
  const comisarioOc = OCUPACION_POR_ID['comisario']!;
  const repartoComisario = {
    ocupacion: {
      intimidar: 40, psicologia: 30, descubrir: 30, escuchar: 30,
      orientarse: 20, persuasion: 30, primeros_auxilios: 20, credito: 30,
    },
    personal: {},
  };
  const conArma = crearInvestigador(
    tirada,
    {
      nombre: 'Casilda Ferreyra', genero: 'f', edad: 44, descripcion: 'Comisaria de campaña.',
      ocupacionId: 'comisario', caracteristicaElegida: 'DEX',
      restaFisica: { STR: 3, CON: 2 },
      reparto: repartoComisario, trasfondo: TRASFONDO, conexionClave: 'a1',
      armaInicialId: 'revolver-38',
    },
    comisarioOc, secuencia([99, 5]), fijo(4),
  );
  check('la comisaria puede elegir revólver .38 al crear',
    conArma.ok && conArma.armaInicialId === 'revolver-38',
    conArma.ok ? String(conArma.armaInicialId) : conArma.problemas.map((p) => p.mensaje).join(' | '));

  const armaIlegal = crearInvestigador(
    tirada,
    {
      nombre: 'Casilda Ferreyra', genero: 'f', edad: 44, descripcion: 'Comisaria de campaña.',
      ocupacionId: 'comisario', caracteristicaElegida: 'DEX',
      restaFisica: { STR: 3, CON: 2 },
      reparto: repartoComisario, trasfondo: TRASFONDO, conexionClave: 'a1',
      armaInicialId: 'pistola-45',
    },
    comisarioOc, secuencia([99, 5]), fijo(4),
  );
  check('una pistola .45 no es una opción legal para el comisario',
    !armaIlegal.ok && armaIlegal.problemas.some((p) => p.campo === 'arma'),
    armaIlegal.problemas.map((p) => p.mensaje).join(' | '));

  const medicoArmada = crearInvestigador(
    tirada,
    {
      nombre: 'Casilda Ferreyra', genero: 'f', edad: 44, descripcion: 'Médica de pueblo.',
      ocupacionId: 'medico-rural',
      restaFisica: { STR: 3, CON: 2 },
      reparto: legal, trasfondo: TRASFONDO, conexionClave: 'a1',
      armaInicialId: 'revolver-32',
    },
    medico, secuencia([99, 5]), fijo(4),
  );
  check('una médica rural no puede empezar armada —su ocupación no ofrece nada—',
    !medicoArmada.ok && medicoArmada.problemas.some((p) => p.campo === 'arma'),
    medicoArmada.problemas.map((p) => p.mensaje).join(' | '));

  const malaEdad = crearInvestigador(
    tirada,
    { nombre: 'X', genero: 'f', edad: 44, descripcion: '', ocupacionId: 'medico-rural',
      restaFisica: { STR: 1 }, reparto: legal, trasfondo: TRASFONDO, conexionClave: null },
    medico, fijo(50), fijo(4),
  );
  check('no repartir la resta de la edad se rechaza', !malaEdad.ok,
    malaEdad.problemas.map((p) => p.campo).join(','));

  const sinTrasfondo = crearInvestigador(
    tirada,
    { nombre: 'X', genero: 'f', edad: 30, descripcion: '', ocupacionId: 'medico-rural',
      reparto: legal, trasfondo: [], conexionClave: null },
    medico, fijo(50), fijo(4),
  );
  check('sin trasfondo se rechaza', !sinTrasfondo.ok);

  // ── Las ocupaciones están bien formadas ──────────────────────────────────
  console.log('\nLAS OCUPACIONES');
  console.log(`  ${OCUPACIONES.length} ocupaciones`);
  for (const o of OCUPACIONES) {
    if (o.habilidades.length !== 8) {
      check(`«${o.nombre}» tiene ocho habilidades`, false, `${o.habilidades.length}`);
    }
  }
  check('todas tienen exactamente ocho habilidades',
    OCUPACIONES.every((o) => o.habilidades.length === 8));
  check('todas incluyen Crédito', OCUPACIONES.every((o) => o.habilidades.includes('credito')));
  check('los rangos de crédito son coherentes',
    OCUPACIONES.every((o) => o.credito.min < o.credito.max && o.credito.max <= 99));
  check('ninguna copia el nombre de una ocupación del manual',
    !OCUPACIONES.some((o) => /hacker|piloto|misionero|parapsic/i.test(o.nombre)));

  return { inv, invArmada: conArma.investigador };
}

async function conCampana() {
  const armado = main();
  const inv = armado?.inv;
  if (!inv) { console.log('\nsin ficha, no se puede seguir\n'); process.exit(1); }

  console.log('\nLA FICHA ENTRA A UNA PARTIDA');
  const id = await createCampaign(AGUA_QUIETA, 'CREADA', 'w'.repeat(64), undefined, inv);
  const { state } = await loadState(id);
  check('el investigador activo es el creado', state.activeInvestigator === inv.id,
    state.investigators[state.activeInvestigator]!.name);
  check('conserva sus números', state.investigators[inv.id]!.derived.luck === inv.derived.luck);
  check('quedan pregenerados de reserva para la muerte permanente',
    state.reserveInvestigators.length > 0, state.reserveInvestigators.join(', '));

  console.log('\nEL ARMA INICIAL NACE COMO ÍTEM REAL');
  const invArmada = armado.invArmada;
  if (!invArmada) {
    check('el investigador armado se pudo crear', false);
  } else {
    const idArmada = await createCampaign(
      AGUA_QUIETA, 'CON ARMA', 'x'.repeat(64), undefined, invArmada, 'revolver-38',
    );
    const { state: estadoArmada } = await loadState(idArmada);
    const items = Object.values(estadoArmada.items);
    const revolver = items.find((i) => i.armaId === 'revolver-38' && i.owner === invArmada.id);
    check('el revólver existe, es del investigador y lo lleva encima',
      Boolean(revolver) && revolver!.carried === true,
      revolver ? `owner=${revolver.owner} carried=${revolver.carried}` : 'no se encontró el ítem');
    check('nace sin roturas', revolver?.roto === false, String(revolver?.roto));

    const sinArma = await createCampaign(AGUA_QUIETA, 'SIN ARMA', 'y'.repeat(64), undefined, invArmada, null);
    const { state: estadoSinArma } = await loadState(sinArma);
    check('sin elegir arma, no nace ningún ítem de más',
      Object.values(estadoSinArma.items).length === AGUA_QUIETA.items.length,
      `${Object.values(estadoSinArma.items).length} vs ${AGUA_QUIETA.items.length} del escenario`);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

conCampana().catch((e) => { console.error(e); process.exit(1); });
