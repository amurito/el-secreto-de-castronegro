/**
 * PRUEBA DEL ENCADENADO DE CAMPAÑA — `npm run prueba:campana`
 *
 * Dos aventuras dejan de ser dos partidas cuando el investigador cruza de una a
 * la otra. Lo que cruza y lo que no es una decisión de diseño, y ésta es la
 * prueba que la sostiene.
 *
 *   CRUZA   habilidades mejoradas, Cordura, trasfondo, cicatrices mentales,
 *           y los umbrales cruzados —eso sí, entero e irreversible—.
 *   DECAE   la EXPOSICIÓN al Umbral, hacia un piso permanente (una fracción
 *           del pico histórico, que nunca baja).
 *   SE CURA estabilidad (por anclaje, que es lo que el canon permite) y PV.
 *   NO CRUZA objetos, pistas ni tablero: son de la investigación anterior.
 *
 * Y la regla que ninguna comodidad puede ablandar: **un investigador muerto
 * sigue muerto.**
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LA_LEGUA } from './scenario/legua.ts';
import { siguienteDe, mesesEntre, CATALOGO } from './scenario/catalogo.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { STABILITY_RECOVERY, techoDeEstabilidad } from './rules/umbral.config.ts';
import { exposicionTrasMeses, pisoDeExposicion } from './rules/umbral.ts';
import { evaluarCondicion } from './scenario/condiciones.ts';
import { OCUPACION_POR_ID } from './scenario/ocupaciones.ts';
import { crearInvestigador } from './rules/ficha.ts';
import type { GameState, Characteristics, Investigator } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;

async function turno(id: string, escenario: any, intencion: string) {
  const t = await Turn.open(id);
  if (t.state.ending) return;
  t.submitIntent(intencion, 'p1');
  const r = await runOfflineTurn(t, escenario, intencion, noop);
  t.narrate(r.narration, r.options);
  await t.commit();
}

/** Juega Agua Quieta hasta un desenlace y pasa la fase de desarrollo. */
async function primeraAventura(semilla: string) {
  const id = await createCampaign(AGUA_QUIETA, 'CAMPAÑA 1', semilla.repeat(64).slice(0, 64));

  // Una consecuencia de alcance MUNDO y permanente: el único mecanismo por el
  // que una aventura le puede contar algo concreto a la siguiente. Es lo que
  // usa el Círculo Rojo para que la cuarta aventura sepa qué marcas encontró
  // el investigador en las tres anteriores, sin que el jugador lo declare.
  {
    const t = await Turn.open(id);
    t.executeTool('record_consequence', {
      description: 'El investigador reconoció la marca en almagre del brocal.',
      scope: 'world', permanent: 'true',
      world_reminder: 'Sabe qué es ese círculo, y no lo va a poder desver.',
    });
    await t.commit();
  }

  const usadas = new Set<string>();
  for (let n = 0; n < 45; n++) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    const disp = accionesDisponibles(t.state, AGUA_QUIETA);
    const sig = disp.find((o) => !o.final && !usadas.has(o.id))
      ?? disp.find((o) => o.id === 'bajar')
      ?? disp.find((o) => o.final);
    if (!sig) break;
    usadas.add(sig.id);
    await turno(id, AGUA_QUIETA, sig.intencion);
  }
  // Fase de desarrollo: es lo que produce el investigador que va a cruzar.
  const t = await Turn.open(id);
  const inv = t.investigator;
  const informe = t.runDevelopmentPhase({
    autoayuda: { aspectId: inv.backstory.keyConnection ?? inv.backstory.aspects[0]!.id, usarConexionClave: true },
  });
  await t.commit();
  return { id, informe, estado: (await Turn.open(id)).state };
}

async function main() {
  console.log('\nEL CATÁLOGO SABE QUÉ SIGUE');
  const sig = siguienteDe('agua-quieta');
  check('después de Agua Quieta viene otra aventura', sig?.scenario.id === 'legua-perdida',
    sig?.scenario.title ?? 'ninguna');
  check('la última de la línea no tiene siguiente',
    siguienteDe(CATALOGO[CATALOGO.length - 1]!.scenario.id) === null);
  const meses = mesesEntre('agua-quieta', 'legua-perdida');
  check('el hueco entre aventuras se calcula de las fechas', meses >= 4 && meses <= 6, `${meses} meses`);

  // ── Primera aventura completa ────────────────────────────────────────────
  console.log('\nPRIMERA AVENTURA');
  const uno = await primeraAventura('s');
  const invUno = invDe(uno.estado);
  console.log(`  final: ${uno.estado.ending?.title ?? 'sin final'}`);
  console.log(`  Elena: PV ${invUno.derived.hp}/${invUno.derived.maxHp} · COR ${invUno.derived.san} · Exp ${invUno.umbral.exposure} · Est ${invUno.umbral.stability}`);
  console.log(`  ${uno.informe.resumen}`);
  check('la primera aventura cerró', Boolean(uno.estado.ending));
  check('la fase de desarrollo dejó algo', uno.informe.mejoras.length > 0 || uno.informe.sanGanada !== 0);

  // ── El cruce ─────────────────────────────────────────────────────────────
  console.log('\nEL CRUCE');
  const idDos = await createCampaign(LA_LEGUA, 'CAMPAÑA 2', 't'.repeat(64), {
    estadoAnterior: uno.estado,
    mesesTranscurridos: meses,
  });
  const dos = (await loadState(idDos)).state;
  const invDos = invDe(dos);
  console.log(`  Elena: PV ${invDos.derived.hp}/${invDos.derived.maxHp} · COR ${invDos.derived.san} · Exp ${invDos.umbral.exposure} · Est ${invDos.umbral.stability}`);

  check('es la misma investigadora', invDos.id === invUno.id, invDos.name);

  console.log('\nLO QUE CRUZA');
  const mejoradas = uno.informe.mejoras.filter((m) => m.gain > 0);
  check('las habilidades mejoradas cruzan',
    mejoradas.every((m) => (invDos.skills[m.skill]?.base ?? 0) === m.despues),
    mejoradas.map((m) => `${m.label} ${m.despues}%`).join(', ') || 'ninguna mejoró esta vez');
  check('la Cordura cruza', invDos.derived.san === invUno.derived.san,
    `${invDos.derived.san} vs ${invUno.derived.san}`);
  const exposicionEsperada = exposicionTrasMeses(invUno.umbral.exposure, invUno.umbral.peakExposure, meses);
  const piso = pisoDeExposicion(invUno.umbral.peakExposure);
  check('la EXPOSICIÓN decae hacia el piso permanente, no se queda igual sola',
    invDos.umbral.exposure === exposicionEsperada,
    `${invUno.umbral.exposure} → ${invDos.umbral.exposure} (esperada ${exposicionEsperada}, piso ${piso})`);
  check('nunca baja del piso —una fracción del pico histórico—',
    invDos.umbral.exposure >= piso, `${invDos.umbral.exposure} vs piso ${piso}`);
  check('el pico histórico no baja', invDos.umbral.peakExposure === invUno.umbral.peakExposure,
    `${invDos.umbral.peakExposure} vs ${invUno.umbral.peakExposure}`);
  check('los umbrales cruzados siguen cruzados —eso sí es irreversible—',
    invUno.umbral.thresholdsCrossed.every((u) => invDos.umbral.thresholdsCrossed.includes(u)),
    invDos.umbral.thresholdsCrossed.join(', ') || 'ninguno');
  check('el trasfondo cruza, con las revisiones que haya sufrido',
    JSON.stringify(invDos.backstory.aspects) === JSON.stringify(invUno.backstory.aspects));

  // Bug real, reportado jugando: `lastDevelopmentSeq` es un índice en la
  // cadena de tiradas de LA CAMPAÑA ANTERIOR — acá tiene que ser mayor a 0,
  // o esta prueba no demuestra nada—, y cada campaña nueva arranca su propia
  // cadena desde cero. Heredarlo tal cual dejaba a la fase de desarrollo de
  // la SEGUNDA aventura sin ninguna tirada que contar por encima de esa
  // frontera importada: nunca reconocía nada, sin importar cuánto se
  // jugara. La frontera tiene que resetearse a 0 en cada campaña nueva.
  check('la campaña anterior cerró con una frontera de desarrollo real (>0)',
    invUno.experience.lastDevelopmentSeq > 0, `${invUno.experience.lastDevelopmentSeq}`);
  check('...pero esa frontera NO cruza tal cual: arranca en 0 en la campaña nueva',
    invDos.experience.lastDevelopmentSeq === 0, `${invDos.experience.lastDevelopmentSeq}`);

  // Esto es la tesis del proyecto: que una aventura pueda afectar a la
  // siguiente de una manera que el CONTENIDO pueda consultar, no sólo que el
  // Keeper lea de refilón. Sin las dos mitades —que la consecuencia cruce Y
  // que una condición la pueda mirar— la cuarta aventura no puede reaccionar
  // a las marcas del Círculo Rojo que el investigador encontró en las otras.
  check('la consecuencia de alcance mundo cruza a la aventura siguiente',
    dos.consequences.some((c) => c.description.includes('la marca en almagre')),
    `${dos.consequences.length} consecuencia(s) del otro lado`);
  check('y el operador `consecuencia` la ve desde la aventura nueva',
    evaluarCondicion({ op: 'consecuencia', contiene: 'la marca en almagre' }, { estado: dos }));
  check('una consecuencia que nadie registró sigue sin verse',
    !evaluarCondicion({ op: 'consecuencia', contiene: 'el anillo de rubí' }, { estado: dos }));

  console.log('\nLO QUE SE RECUPERA');
  check('los PV se curan', invDos.derived.hp === invDos.derived.maxHp,
    `${invDos.derived.hp}/${invDos.derived.maxHp}`);
  // El techo de Estabilidad se calcula sobre la Exposición YA decaída: menos
  // contacto activo con el fenómeno deja más margen para anclarse.
  const techo = techoDeEstabilidad(exposicionEsperada);
  const esperada = Math.min(
    Math.max(invUno.umbral.stability, techo),
    invUno.umbral.stability + STABILITY_RECOVERY.betweenSessions * meses,
  );
  check('la Estabilidad se recupera por anclaje', invDos.umbral.stability === esperada,
    `${invUno.umbral.stability} → ${invDos.umbral.stability} (techo ${techo} por exposición decaída ${exposicionEsperada})`);
  check('pero NO al 100: la exposición baja el techo',
    exposicionEsperada === 0 || invDos.umbral.stability < 100,
    `${invDos.umbral.stability}`);

  console.log('\nLO QUE NO CRUZA');
  check('el tablero arranca limpio', dos.board.clues.length === 0,
    `${dos.board.clues.length} pistas`);
  check('las contradicciones no se arrastran', dos.board.contradictions.length === 0);
  check('los objetos son los de la aventura nueva',
    Object.keys(dos.items).every((k) => k in LA_LEGUA.items.reduce((a, i) => ({ ...a, [i.id]: 1 }), {})),
    Object.keys(dos.items).join(', '));
  check('el mapa es el de la aventura nueva', dos.world.currentLocation === 'casco',
    dos.world.currentLocation);

  console.log('\nLO QUE EL MUNDO RECUERDA');
  console.log(`  ${dos.consequences.length} consecuencias · ${dos.campaignCanon.length} de canon de campaña`);
  for (const c of dos.consequences) console.log(`   ● ${c.description.slice(0, 80)}`);
  check('las consecuencias permanentes de la aventura anterior cruzan',
    dos.consequences.length > 0, `${dos.consequences.length}`);
  check('todas las que cruzaron son permanentes', dos.consequences.every((c) => c.permanent));
  check('el desenlace anterior queda como canon de campaña',
    dos.campaignCanon.some((c) => c.statement.includes(uno.estado.ending!.title)),
    dos.campaignCanon.map((c) => c.statement).join(' | ').slice(0, 90));

  console.log('\nLA AVENTURA NUEVA SE JUEGA IGUAL');
  const opciones = accionesDisponibles(dos, LA_LEGUA);
  check('hay acciones desde el primer turno', opciones.length >= 6, `${opciones.length}`);
  await turno(idDos, LA_LEGUA, 'Le pregunto a Herminia qué pasó con Fermín');
  const trasUnTurno = (await loadState(idDos)).state;
  check('el primer turno resuelve', trasUnTurno.board.clues.length > 0,
    `${trasUnTurno.board.clues.length} pistas`);

  console.log('\nLA REGLA QUE NO SE ABLANDA');
  // Un investigador muerto no revive por empezar capítulo nuevo.
  const muerto: GameState = {
    ...uno.estado,
    investigators: {
      ...uno.estado.investigators,
      [invUno.id]: { ...invUno, status: 'dead' as const },
    },
  };
  const idTres = await createCampaign(LA_LEGUA, 'CAMPAÑA MUERTA', 'u'.repeat(64), {
    estadoAnterior: muerto, mesesTranscurridos: meses,
  });
  const tres = (await loadState(idTres)).state;
  check('el investigador muerto NO cruza vivo',
    tres.investigators[invUno.id]!.status === 'alive'
      && tres.investigators[invUno.id]!.derived.san !== invUno.derived.san,
    'arranca de cero, como pregenerado');
  check('y el activo es alguien que puede actuar',
    tres.investigators[tres.activeInvestigator]!.status === 'alive',
    tres.investigators[tres.activeInvestigator]!.name);

  console.log('\nSIN HERENCIA TODO SIGUE IGUAL');
  const idSolo = await createCampaign(LA_LEGUA, 'SUELTA', 'v'.repeat(64));
  const solo = (await loadState(idSolo)).state;
  check('jugar La Legua sola sigue funcionando',
    invDe(solo).umbral.exposure === 0 && solo.consequences.length === 0,
    `Exp ${invDe(solo).umbral.exposure}`);

  // ── Un investigador propio no se pierde al encadenar ─────────────────────
  // Bug real, reportado jugando: terminar Agua Quieta con un investigador
  // armado a mano y seguir a La Legua Perdida devolvía a Elena, sin jugar.
  // La causa estaba en `investigadoresDe`: recorría el elenco de la aventura
  // NUEVA (siempre Elena y Tomás) y buscaba coincidencias de id contra la
  // campaña vieja. Un id como «inv-nico-abc123» no coincide con ningún
  // pregenerado de ninguna aventura, así que desaparecía enterito.
  console.log('\nUN INVESTIGADOR PROPIO CRUZA, NO SE PIERDE');
  {
    const ch: Characteristics = { STR: 50, CON: 60, SIZ: 55, DEX: 60, APP: 55, INT: 70, POW: 60, EDU: 75 };
    const ocupacion = OCUPACION_POR_ID['medico-rural']!;
    const r = crearInvestigador(
      { caracteristicas: ch, suerte: 55 },
      {
        nombre: 'Nico', genero: 'm', edad: 44, descripcion: 'Un investigador armado a mano.',
        ocupacionId: 'medico-rural', restaFisica: { STR: 3, CON: 2 },
        reparto: {
          ocupacion: { medicina: 60, primeros_auxilios: 40, psicologia: 40, biblioteca: 40,
            buscar_libros: 40, descubrir: 30, ciencia_naturales: 20, credito: 30 },
          personal: { escuchar: 40, historia: 30, orientarse: 30, trepar: 20, nadar: 20 },
        },
        trasfondo: [
          { id: 'a1', kind: 'personas', text: 'Un socio en Buenos Aires.' },
          { id: 'a2', kind: 'lugares', text: 'Su consultorio.' },
          { id: 'a3', kind: 'rasgos', text: 'Desconfiado.' },
        ],
        conexionClave: 'a1',
      },
      ocupacion, () => 99, () => 4,
    );
    if (!r.ok) throw new Error(`No se pudo armar a Nico: ${r.problemas.map((p) => p.mensaje).join(' | ')}`);
    const nico = r.investigador as Investigator;

    const idNico = await createCampaign(AGUA_QUIETA, 'CON NICO', 'w'.repeat(64), undefined, nico);
    const usadas = new Set<string>();
    for (let n = 0; n < 45; n++) {
      const t = await Turn.open(idNico);
      if (t.state.ending) break;
      const disp = accionesDisponibles(t.state, AGUA_QUIETA);
      const sig = disp.find((o) => !o.final && !usadas.has(o.id))
        ?? disp.find((o) => o.id === 'bajar') ?? disp.find((o) => o.final);
      if (!sig) break;
      usadas.add(sig.id);
      await turno(idNico, AGUA_QUIETA, sig.intencion);
    }
    const estadoNico = (await Turn.open(idNico)).state;
    check('Nico terminó la primera aventura como activo', estadoNico.activeInvestigator === nico.id,
      estadoNico.activeInvestigator);

    const idContinua = await createCampaign(LA_LEGUA, 'CON NICO 2', 'y'.repeat(64), {
      estadoAnterior: estadoNico, mesesTranscurridos: meses,
    });
    const continuado = (await loadState(idContinua)).state;
    check('sigue siendo Nico, no una Elena nueva', continuado.activeInvestigator === nico.id,
      `activo: ${continuado.investigators[continuado.activeInvestigator]?.name}`);
    check('con lo que jugó, no de cero —decae hacia el piso, no se resetea—',
      continuado.investigators[nico.id]!.umbral.exposure >=
        pisoDeExposicion(estadoNico.investigators[nico.id]!.umbral.peakExposure)
      && continuado.investigators[nico.id]!.umbral.exposure > 0,
      `Exposición: ${estadoNico.investigators[nico.id]?.umbral.exposure} → ${continuado.investigators[nico.id]?.umbral.exposure}`);
    check('y Tomás sigue disponible de reserva, fresco',
      continuado.investigators['inv-tomas']?.status === 'alive'
      && continuado.reserveInvestigators.includes('inv-tomas'));
  }

  console.log('\nEL INVENTARIO ES DE LA CAMPAÑA, NO DE LA AVENTURA');
  {
    // Hasta acá se heredaba todo del investigador menos lo que llevaba en
    // las manos: el punzón que se saca del sótano en El Vigésimo desaparecía
    // al empezar la aventura siguiente, sin que nadie lo dejara en ningún
    // lado. Pedido después de jugarlo.
    const idA = await createCampaign(AGUA_QUIETA, 'INV-A', 'v1'.repeat(32));
    const tA = await Turn.open(idA);
    const inv = tA.state.activeInvestigator;
    tA.executeTool('transfer_item', { item_id: 'it-espejo', to: inv, carried: 'true', cause: 'prueba' });
    // Y uno que se queda en el piso: ése NO tiene que cruzar.
    tA.executeTool('transfer_item', { item_id: 'it-farol', to: tA.state.world.currentLocation, carried: 'false', cause: 'prueba' });
    await tA.commit();
    const previo = (await loadState(idA)).state;

    const idB = await createCampaign(LA_LEGUA, 'INV-B', 'v2'.repeat(32), {
      estadoAnterior: previo, mesesTranscurridos: 5,
    });
    const sB = (await loadState(idB)).state;
    check('lo que llevaba encima cruza a la aventura siguiente',
      sB.items['it-espejo']?.owner === inv && sB.items['it-espejo']?.carried === true);
    check('lo que dejó tirado en un cuarto NO cruza', !sB.items['it-farol']);

    // Un id repetido entre aventuras no puede pisar al de la aventura nueva:
    // `it-libreta` existe de verdad en dos aventuras publicadas.
    const libretaLegua = sB.items['it-libreta'];
    check('un objeto de la aventura nueva no queda pisado por uno heredado con el mismo id',
      !libretaLegua || libretaLegua.name.includes('Roldán'),
      libretaLegua?.name ?? '(no existe acá)');
  }

  console.log('\nDESHACERSE DE ALGO ES DEFINITIVO, Y SOLTARLO NO');
  {
    const id = await createCampaign(AGUA_QUIETA, 'DESCARTE', 'v3'.repeat(32));
    const t = await Turn.open(id);
    const inv = t.state.activeInvestigator;
    t.executeTool('transfer_item', { item_id: 'it-espejo', to: inv, carried: 'true', cause: 'prueba' });
    await t.commit();

    const t2 = await Turn.open(id);
    const ofrecidas = accionesDisponibles(t2.state, AGUA_QUIETA).map((o) => o.id);
    check('se ofrece dejarlo y también deshacerse de él',
      ofrecidas.includes('dejar:it-espejo') && ofrecidas.includes('tirar:it-espejo'));

    const intencion = accionesDisponibles(t2.state, AGUA_QUIETA).find((o) => o.id === 'tirar:it-espejo')!.intencion;
    t2.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t2, AGUA_QUIETA, intencion, () => {});
    t2.narrate(r.narration, r.options);
    await t2.commit();

    const s = (await loadState(id)).state;
    check('tras deshacerse, el objeto no tiene dueño', s.items['it-espejo']?.owner === null);
    const despues = accionesDisponibles(s, AGUA_QUIETA).map((o) => o.id);
    check('y ya no se ofrece ni para agarrarlo ni para soltarlo',
      !despues.some((x) => x.endsWith(':it-espejo')));
  }

  console.log('\nLA PLATA: SALE DEL CRÉDITO, SE GASTA, SE COBRA Y CRUZA DE AVENTURA');
  {
    const { LA_GRIETA_DEL_ZONDA } = await import('./scenario/grietadelzonda.ts');
    const id = await createCampaign(LA_GRIETA_DEL_ZONDA, 'PLATA', 'v4'.repeat(32));
    let t = await Turn.open(id);
    const inv = t.state.activeInvestigator;
    const credito = t.investigator.skills['credito']?.base ?? 0;
    check('el efectivo inicial sale del Crédito, no de la nada',
      t.investigator.derived.efectivo === credito * 10,
      `crédito ${credito} → ${t.investigator.derived.efectivo} pesos`);

    t.executeTool('move_to_location', { location_id: 'pulperia-zonda', reason: 'prueba' });
    await t.commit();

    // Comprar: sale plata, entra el objeto.
    t = await Turn.open(id);
    const antes = t.investigator.derived.efectivo;
    const rc = t.executeTool('buy_item', { item_id: 'it-farol-pulperia', npc_id: 'npc-petrona' });
    await t.commit();
    let s = (await loadState(id)).state;
    check('comprar descuenta el precio y entrega el objeto',
      rc.ok && s.items['it-farol-pulperia']?.owner === inv
      && s.investigators[inv]!.derived.efectivo === antes - 12,
      `${antes} → ${s.investigators[inv]!.derived.efectivo}`);

    // No se le compra a quien no tiene mostrador.
    const t2 = await Turn.open(id);
    const rEusebio = t2.executeTool('buy_item', { item_id: 'it-farol-pulperia', npc_id: 'npc-eusebio' });
    check('no se le compra a quien no comercia', !rEusebio.ok, rEusebio.message.slice(0, 70));

    // Vender algo CARGADO deja una consecuencia permanente, además de la plata.
    const t3 = await Turn.open(id);
    t3.executeTool('move_to_location', { location_id: 'rancho-eusebio', reason: 'prueba' });
    t3.executeTool('transfer_item', { item_id: 'it-pincel-eusebio', to: inv, carried: 'true', cause: 'prueba' });
    t3.executeTool('move_to_location', { location_id: 'pulperia-zonda', reason: 'prueba' });
    const conPlata = t3.investigator.derived.efectivo;
    const rv = t3.executeTool('sell_item', { item_id: 'it-pincel-eusebio', npc_id: 'npc-petrona' });
    await t3.commit();
    s = (await loadState(id)).state;
    check('vender cobra y entrega el objeto al comerciante',
      rv.ok && s.items['it-pincel-eusebio']?.owner === 'npc-petrona'
      && s.investigators[inv]!.derived.efectivo > conPlata);
    check('y vender algo que toca el Umbral deja consecuencia permanente',
      s.consequences.some((c) => c.permanent && /vendió «El pincel de Eusebio»/.test(c.description)));

    // La plata cruza a la aventura siguiente, como el inventario.
    const previo = (await loadState(id)).state;
    const quedaba = previo.investigators[inv]!.derived.efectivo;
    const idB = await createCampaign(AGUA_QUIETA, 'PLATA-B', 'v5'.repeat(32), {
      estadoAnterior: previo, mesesTranscurridos: 3,
    });
    const sB = (await loadState(idB)).state;
    check('el efectivo cruza a la aventura siguiente',
      sB.investigators[inv]?.derived.efectivo === quedaba, `${quedaba} pesos`);
  }

  console.log('\nEL KIT DE 1930: LO RECIBE QUIEN JUEGUE, UNA SOLA VEZ, Y SOLTAR ES PARA SIEMPRE');
  {
    const { LA_GRIETA_DEL_ZONDA } = await import('./scenario/grietadelzonda.ts');
    const { LA_MERCED_DE_LAS_ANIMAS } = await import('./scenario/mercedanimas.ts');
    const { TOMAS } = await import('./scenario/pregens.ts');
    const KIT = ['it-encendedor-1930', 'it-reloj-pulsera', 'it-linterna-1930'];
    const llevaTodo = (s: GameState, quien: string) =>
      KIT.every((k) => s.items[k]?.owner === quien && s.items[k]?.carried);

    // Pregenerado: lo recibe el activo, no el de reserva.
    const idA = await createCampaign(LA_GRIETA_DEL_ZONDA, 'KIT-A', 'k1'.repeat(32));
    const sA = (await loadState(idA)).state;
    check('el investigador activo arranca con el kit', llevaTodo(sA, sA.activeInvestigator));

    // Investigador creado por el jugador (camino `propio`): también.
    const idP = await createCampaign(LA_GRIETA_DEL_ZONDA, 'KIT-P', 'k2'.repeat(32), undefined, TOMAS);
    const sP = (await loadState(idP)).state;
    check('un investigador propio también lo recibe', llevaTodo(sP, TOMAS.id));

    // Cruza a la aventura siguiente por herencia, sin duplicarse.
    const idM = await createCampaign(LA_MERCED_DE_LAS_ANIMAS, 'KIT-M', 'k3'.repeat(32), {
      estadoAnterior: sA, mesesTranscurridos: 0,
    });
    const sM = (await loadState(idM)).state;
    check('cruza a Merced, una sola copia de cada uno',
      llevaTodo(sM, sM.activeInvestigator)
      && Object.values(sM.items).filter((i) => KIT.includes(i.id)).length === KIT.length);

    // Quien lo soltó en la aventura anterior no lo recupera.
    const tirado: GameState = {
      ...sA, items: { ...sA.items, 'it-reloj-pulsera': { ...sA.items['it-reloj-pulsera']!, owner: null, carried: false } },
    };
    const idT = await createCampaign(LA_MERCED_DE_LAS_ANIMAS, 'KIT-T', 'k4'.repeat(32), {
      estadoAnterior: tirado, mesesTranscurridos: 0,
    });
    const sT = (await loadState(idT)).state;
    check('lo que se descartó para siempre no se regala de nuevo',
      sT.items['it-reloj-pulsera']?.owner !== sT.activeInvestigator);

    // Una partida guardada de antes de que existiera el kit, que llega a Merced sin él.
    const sinKit: GameState = {
      ...sA, items: Object.fromEntries(Object.entries(sA.items).filter(([k]) => !KIT.includes(k))),
    };
    const idV = await createCampaign(LA_MERCED_DE_LAS_ANIMAS, 'KIT-V', 'k5'.repeat(32), {
      estadoAnterior: sinKit, mesesTranscurridos: 0,
    });
    const sV = (await loadState(idV)).state;
    check('quien viene de una partida sin kit lo recibe al llegar a Merced',
      llevaTodo(sV, sV.activeInvestigator));
  }

  console.log('\nLA SOSPECHA: SUBE, BAJA, TIENE TOPE, SE LEE COMO CONDICIÓN Y NO CRUZA');
  {
    const { LA_GRIETA_DEL_ZONDA } = await import('./scenario/grietadelzonda.ts');
    const id = await createCampaign(LA_GRIETA_DEL_ZONDA, 'SOSPECHA', 'v6'.repeat(32));
    const t = await Turn.open(id);
    const inv = t.state.activeInvestigator;
    check('arranca en cero', (t.investigator.derived.sospecha ?? 0) === 0);

    const r1 = t.executeTool('adjust_suspicion', { amount: 35, cause: 'prueba' });
    check('sube y lo dice', r1.ok && /0 → 35/.test(r1.message), r1.message);
    t.executeTool('adjust_suspicion', { amount: 90, cause: 'prueba' });
    check('tiene tope en 100', t.investigator.derived.sospecha === 100);
    t.executeTool('adjust_suspicion', { amount: -30, cause: 'prueba' });
    check('baja con amount negativo', t.investigator.derived.sospecha === 70);
    const rCero = t.executeTool('adjust_suspicion', { amount: 0, cause: 'prueba' });
    check('rechaza un movimiento nulo', !rCero.ok);
    t.executeTool('adjust_suspicion', { amount: -500, cause: 'prueba' });
    check('y no baja de cero', t.investigator.derived.sospecha === 0);

    t.executeTool('adjust_suspicion', { amount: 70, cause: 'prueba' });
    await t.commit();
    const s = (await loadState(id)).state;
    const ctx = { estado: s };
    check('la condición lee el rango',
      evaluarCondicion({ op: 'sospecha', minimo: 60 }, ctx)
      && !evaluarCondicion({ op: 'sospecha', minimo: 80 }, ctx)
      && evaluarCondicion({ op: 'sospecha', maximo: 70 }, ctx));

    const idB = await createCampaign(AGUA_QUIETA, 'SOSPECHA-B', 'v7'.repeat(32), {
      estadoAnterior: s, mesesTranscurridos: 0,
    });
    const sB = (await loadState(idB)).state;
    check('no cruza a la aventura siguiente (es de la situación, no de la persona)',
      (sB.investigators[inv]?.derived.sospecha ?? 0) === 0);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
