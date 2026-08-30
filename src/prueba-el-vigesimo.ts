/**
 * PRUEBA DE EL VIGÉSIMO — `npm run prueba:el-vigesimo`
 *
 * Séptimo Umbral, segundo acto. Lo que esta suite protege es lo propio de
 * ella, no lo que ya cubren la auditoría y las suites del motor:
 *
 *   1. Los cuatro puentes desde Agua Blanca seleccionan el texto correcto
 *      según la consecuencia heredada — la campaña no arranca en blanco.
 *   2. El sigilo dentro de la Casa hace algo de verdad: falla dos veces
 *      distintas (ruido registrado, pifia con emboscada).
 *   3. La audiencia con Bernardo es acotada de verdad: no se puede agotar
 *      la lista completa de temas.
 *   4. El combate contra Bernardo es real y obligatorio, y de sus dos
 *      salidas (ganarlo o huir) se llega a los cuatro finales.
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { AGUA_BLANCA } from './scenario/aguablanca.ts';
import { EL_VIGESIMO } from './scenario/elvigesimo.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { ELENA } from './scenario/pregens.ts';
import { EL_VIGESIMO_LOGICA } from './scenario/elvigesimo.logica.ts';
import type { EfectoEscena, IntencionLeida } from './scenario/escena.ts';
import type { Clue, GameState, Investigator } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/** Una pista de tablero armada a mano, para probar umbrales sin jugar hasta que salga. */
const pistaFalsa = (description: string): Clue => ({
  id: `clue-test-${Math.random()}`,
  description,
  kind: 'physical',
  discoveredBy: 'inv-elena',
  discoveredAt: 'inicio',
  source: 'prueba',
  reliability: 'reliable',
  reliabilityKnown: false,
  disclosure: 'PUBLIC',
});

/**
 * Un investigador de combate, para las pruebas que tienen que llegar al
 * final de una pelea. Elena Sartori es médica rural (Pelea 25%) y muere en
 * tres asaltos contra Bernardo: con ella no se puede comprobar qué pasa
 * DESPUÉS del primer golpe que conecta. Esto no ablanda la pelea real —el
 * contenido no cambia—, es el equivalente de sentar a la mesa a alguien que
 * sí sabe pelear, que es exactamente quien la va a jugar.
 */
const PELEADOR: Investigator = {
  ...ELENA,
  skills: { ...ELENA.skills, pelea: { base: 85, origin: 'occupation' } },
  derived: { ...ELENA.derived, hp: 60, maxHp: 60 },
};

async function jugarEn(esc: typeof AGUA_BLANCA, titulo: string, semilla: string, guion: string[], herencia?: { estadoAnterior: GameState; mesesTranscurridos: number }, propio?: Investigator) {
  const id = await createCampaign(esc, titulo, semilla.repeat(64).slice(0, 64), herencia, propio);
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, esc, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return { id, state: (await Turn.open(id)).state };
}

/** Termina Agua Blanca en el final pedido, para heredarlo en El Vigésimo. */
async function terminarAguaBlanca(finalIntencion: string, semilla: string): Promise<GameState> {
  const RECORRIDO = [
    'Voy al granero',
    'Mirar mesa de cerca',
    'Reviso el piso del fondo, abajo de la mesa',
    'Agarro libreta de tapas negras',
    'Leo la libreta del profesor de arriba abajo',
    'Voy a la plaza',
  ];
  const { state } = await jugarEn(AGUA_BLANCA, `AB→7b ${finalIntencion.slice(0, 10)}`, semilla, [...RECORRIDO, finalIntencion]);
  return state;
}

/**
 * Cómo se llega al sótano ahora que la escalera es un hallazgo y no una
 * puerta más: hace falta encontrarla (Descubrir sobre el detalle de la
 * cocina) y traer al menos tres pistas de la planta baja. Ver
 * `conexionesOcultas` en el contenido — antes el sótano era una salida como
 * cualquier otra desde el vestíbulo, que es lo que se reportó jugando.
 */
const AL_SOTANO = [
  'Voy al salón', 'Examino retratos de cerca',
  'Voy al comedor', 'Examino mesa de cerca',
  'Voy a la cocina', 'Examino puerta de cerca',
  'Examino puerta de cerca', 'Examino puerta de cerca',
  'Voy al trastero del sótano',
];

async function main() {
  console.log('\nLOS CUATRO PUENTES LEEN EL FINAL DE AGUA BLANCA');
  {
    const finales: Array<[string, string]> = [
      ['Subo a la casa de la loma', 'sabíamos desde la tarde'],
      ['Voy a la cabecera a traer a la policía', 'sargento llega mañana'],
      ['Le escribo a Delfina lo que averigüé', 'no pudo dormir'],
      ['Me voy del pueblo', 'Dio la vuelta a tres leguas'],
    ];
    for (const [finalAB, fragmentoEsperado] of finales) {
      const previo = await terminarAguaBlanca(finalAB, 'p');
      check(`Agua Blanca terminó en «${previo.ending?.id}»`, !!previo.ending, previo.ending?.id);
      const { state } = await jugarEn(EL_VIGESIMO, `7b desde ${previo.ending?.id}`, 'q',
        ['Le pregunto a Ercilia qué está pasando'],
        { estadoAnterior: previo, mesesTranscurridos: 0 });
      const dicho = state.narrative.some((n) => n.kind === 'keeper' && n.text.includes(fragmentoEsperado));
      check(`el puente de «${previo.ending?.id}» dice lo que tiene que decir`, dicho, fragmentoEsperado);
    }
  }

  const subida = await terminarAguaBlanca('Subo a la casa de la loma', 'r');

  console.log('\nEL SIGILO EN LA CASA HACE ALGO DE VERDAD');
  {
    const { state } = await jugarEn(EL_VIGESIMO, '7b SIGILO OK', 's',
      ['Voy al primer piso', 'Voy al dormitorio principal', 'Registro el dormitorio sin hacer ruido'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });
    const ruidoso = state.consequences.some((c) => c.description.includes('hizo ruido en la Casa'));
    check('con sigilo puede salir limpio o hacer ruido, pero deja rastro de uno u otro',
      ruidoso || state.narrative.some((n) => n.kind === 'keeper' && n.text.includes('No hacía falta tanto cuidado')));
  }

  console.log('\nLA AUDIENCIA CON BERNARDO ES ACOTADA');
  {
    const { state } = await jugarEn(EL_VIGESIMO, '7b AUDIENCIA', 't',
      [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio',
        'Le pregunto a Bernardo quién es',
        'Le pregunto a Bernardo por el anillo que lleva puesto',
        'Le pregunto a Bernardo por qué nace un Bernardo Díaz nuevo cada treinta años',
        'Le pregunto a Bernardo por el profesor, el americano y Onésimo',
        'Le pregunto a Bernardo qué es el Umbral y quién es el Primer Rostro',
        'Le pregunto a Bernardo qué hay en el laberinto'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });
    const opciones = accionesDisponibles(state, EL_VIGESIMO).filter((o) => o.id.startsWith('tema:b-'));
    check('no todos los temas de Bernardo siguen ofrecidos al final de la lista',
      opciones.length < 6, `quedan: ${opciones.map((o) => o.id).join(', ')}`);

    // Bug reportado jugando: `temaPorFrase` elige, entre TODOS los temas del
    // NPC, el que tenga la clave que más caracteres matchea en la frase —no
    // el del botón que se tocó—. La clave «bernardo» (8 letras) en
    // `b-quien-sos` le ganaba a «onesimo» (7 letras) de
    // `b-tres-desaparecidos`, así que esa pregunta contestaba con la
    // presentación en vez de con lo que se preguntó.
    //
    // El tema tiene `prueba` (psicología, regular): con la semilla fija puede
    // ceder o ser esquivado, y las dos son ruteo correcto —lo único que
    // demuestra el bug real es que NO vuelva a salir la presentación de
    // `b-quien-sos`. Afirmar sólo el `cede` hacía flaky este chequeo contra
    // la tirada, no contra el ruteo.
    check('preguntar por Ferrari/Prewitt/Onésimo contesta ESO, no la presentación',
      state.narrative.some((n) => n.kind === 'keeper' && (
        n.text.includes('El profesor y el americano llegaron preguntando')
        || n.text.includes('Ya le dije lo que le iba a decir de ésos')
      )));
  }

  console.log('\nBERNARDO NO PELEA DESDE OTRO CUARTO');
  {
    // Bug reportado jugando dos veces: `ordenDeAsalto` metía en cada asalto a
    // TODO NPC con estadísticas de combate y `present: true` —que quiere decir
    // «sigue en la historia», no «está en este cuarto»—, así que Bernardo
    // repartía facazos desde el laboratorio durante la pelea del trastero.
    const { id } = await jugarEn(EL_VIGESIMO, '7b GUARDIAN SOLO', 'g',
      [...AL_SOTANO, 'Lo enfrento'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });
    const t = await Turn.open(id);
    const r = t.executeTool('resolve_attack', { npc_id: 'npc-guardian-sotano', weapon_id: 'desarmado' });
    await t.commit();
    check('peleando en el trastero, Bernardo no aparece en el asalto',
      !r.message.includes('Bernardo'), r.message.slice(0, 120));
    const s = (await Turn.open(id)).state;
    check('...y Bernardo sigue intacto', (s.npcs['npc-bernardo']?.combate?.hp ?? 0) === 17,
      `hp ${s.npcs['npc-bernardo']?.combate?.hp}`);
  }

  console.log('\nEL COMBATE CONTRA BERNARDO ES OBLIGATORIO Y REAL');
  {
    const { id, state } = await jugarEn(EL_VIGESIMO, '7b COMBATE', 'u',
      [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio', 'Enfrento a Bernardo'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });
    check('entrar en combate deja la consecuencia que abre denunciar/irse si se huye',
      state.consequences.some((c) => c.description.includes('entró en combate real contra Bernardo Díaz')));
    check('el combate se activa de verdad (activeCombat)', !!state.activeCombat, JSON.stringify(state.activeCombat?.npcIds ?? state.activeCombat));

    // Rama huir: usar la herramienta real del motor, como hace Combate.tsx.
    // El combate es real —con dados reales—, así que no siempre se huye al
    // primer intento; se prueban varias semillas, como probaría suerte un
    // jugador de verdad, y alcanza con que UNA cierre la rama.
    let huido = false;
    let idHuido = '';
    for (const s2 of ['w1', 'w2', 'w3', 'w4', 'w5']) {
      const { id: idIntento } = await jugarEn(EL_VIGESIMO, `7b HUIR ${s2}`, s2,
        [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio', 'Enfrento a Bernardo'],
        { estadoAnterior: subida, mesesTranscurridos: 0 });
      for (let n = 0; n < 10 && !huido; n++) {
        const t = await Turn.open(idIntento);
        if (!t.state.activeCombat) break;
        if (t.investigator.derived.hp <= 0 || t.investigator.status !== 'alive') break;
        t.executeTool('resolve_flee', { npc_id: 'npc-bernardo' });
        await t.commit();
        const s = (await Turn.open(idIntento)).state;
        huido = !s.activeCombat && s.investigators[s.activeInvestigator]?.status === 'alive';
      }
      if (huido) { idHuido = idIntento; break; }
    }
    if (huido) {
      const final = (await Turn.open(idHuido)).state;
      const opciones = accionesDisponibles(final, EL_VIGESIMO).map((o) => o.id);
      check('tras huir, «denunciar» está ofrecido', opciones.includes('denunciar'), opciones.join(', '));
      check('tras huir, «irse» está ofrecido', opciones.includes('irse-vigesimo'), opciones.join(', '));
      check('«cortar» y «heredar» NO están ofrecidos —Bernardo sigue vivo—',
        !opciones.includes('cortar') && !opciones.includes('heredar'));
    } else {
      check('huir del combate lleva a denunciar/irse, en alguna de varias semillas probadas', false);
    }
  }

  console.log('\nA BERNARDO NO SE LE GANA A GOLPES');
  {
    const { id } = await jugarEn(EL_VIGESIMO, '7b INVULNERABLE', 'k',
      [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio', 'Enfrento a Bernardo'],
      { estadoAnterior: subida, mesesTranscurridos: 0 }, PELEADOR);

    // Treinta golpes comunes, sin apuntar: ninguno le puede bajar los PV.
    let vioCerrarse = false;
    for (let n = 0; n < 30; n++) {
      const t = await Turn.open(id);
      const r = t.executeTool('resolve_attack', { npc_id: 'npc-bernardo', weapon_id: 'facon' });
      if (r.message.includes('se detiene sola')) vioCerrarse = true;
      await t.commit();
    }
    const s = (await Turn.open(id)).state;
    check('treinta golpes comunes no le bajan un solo PV',
      (s.npcs['npc-bernardo']?.combate?.hp ?? 0) === 17, `hp ${s.npcs['npc-bernardo']?.combate?.hp}`);
    check('y el jugador VE por qué: la herida se cierra y el anillo se enciende', vioCerrarse);
    check('el punto débil sigue entero', (s.npcs['npc-bernardo']?.combate?.invulnerabilidad?.hpPuntoDebil ?? 0) === 12);

    // Con los puños no se puede ir por la mano: hace falta filo.
    {
      const t = await Turn.open(id);
      const r = t.executeTool('resolve_attack', { npc_id: 'npc-bernardo', weapon_id: 'desarmado', punto_debil: 'true' });
      check('a mano limpia el motor rechaza ir por la mano', !r.ok, r.message.slice(0, 90));
    }

    // Con filo, apuntando, el daño se acumula en la mano hasta que cede.
    for (let n = 0; n < 40; n++) {
      const t = await Turn.open(id);
      const b = t.state.npcs['npc-bernardo'];
      if ((b?.combate?.hp ?? 0) <= 0) break;
      t.executeTool('resolve_attack', { npc_id: 'npc-bernardo', weapon_id: 'facon', punto_debil: 'true' });
      await t.commit();
    }
    const fin = (await Turn.open(id)).state;
    check('yendo por la mano, con filo, Bernardo cae',
      (fin.npcs['npc-bernardo']?.combate?.hp ?? 1) <= 0,
      `hp ${fin.npcs['npc-bernardo']?.combate?.hp} · mano ${fin.npcs['npc-bernardo']?.combate?.invulnerabilidad?.hpPuntoDebil}`);
  }

  console.log('\nCON BERNARDO VENCIDO SE ABREN CORTAR Y HEREDAR');
  {
    // Ganarle a Bernardo es PROBABILÍSTICO y depende muchísimo de la ficha:
    // medido sobre veinte peleas, Elena Sartori (médica rural, Pelea 25%)
    // gana ~3 de 20; un investigador de combate lo gana casi siempre. Por eso
    // esta prueba NO pelea hasta ganar —sería intermitente en CI, y estaría
    // midiendo la suerte y no el contenido—: baja a Bernardo con la misma
    // herramienta del motor que usaría un golpe afortunado y comprueba lo
    // que sí es determinístico, que son los gates y el desenlace.
    const { id } = await jugarEn(EL_VIGESIMO, '7b VENCIDO', 'v',
      [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio', 'Enfrento a Bernardo'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });

    // Bernardo en el piso, sin depender de los dados: mismo recurso que usa
    // `prueba-auditoria.ts` para comprobar gates —construir el estado que
    // interesa y preguntarle a `accionesDisponibles`, que es exactamente lo
    // que consulta la interfaz—.
    const enCurso = (await Turn.open(id)).state;
    const bern = enCurso.npcs['npc-bernardo']!;
    const vencido: GameState = {
      ...enCurso,
      npcs: { ...enCurso.npcs, 'npc-bernardo': { ...bern, combate: { ...bern.combate!, hp: 0 } } },
    };
    const opciones = accionesDisponibles(vencido, EL_VIGESIMO).map((o) => o.id);
    check('con Bernardo vencido, «cortar» está ofrecido', opciones.includes('cortar'), opciones.join(', '));
    check('con Bernardo vencido, «heredar» está ofrecido', opciones.includes('heredar'), opciones.join(', '));
    check('y el momento del anillo aparece antes de decidir', opciones.includes('mirar-anillo'), opciones.join(', '));

    const t = await Turn.open(id);
    t.submitIntent('Le saco el anillo y lo tiro al horno del laboratorio', 'p1');
    const r = await runOfflineTurn(t, EL_VIGESIMO, 'Le saco el anillo y lo tiro al horno del laboratorio', noop);
    t.narrate(r.narration, r.options);
    await t.commit();
    const cerrado = (await Turn.open(id)).state;
    check('«cortar» alcanza un desenlace real', cerrado.ending?.id === 'cortar', cerrado.ending?.id);
  }

  console.log('\nSI SE OLVIDA EL CUCHILLO, EL LABORATORIO TIENE UNA RED DE SEGURIDAD');
  {
    // Reportado jugando: hay que asegurarse de que el investigador llegue al
    // combate con un arma que le permita ganar. `it-cuchillo-cocina` es
    // opcional —hay que agarrarlo en la cocina, y de ahí en más el descenso
    // es de ida—, así que quien no lo agarró queda sin filo para siempre SI
    // no hay una segunda oportunidad. `it-bisturi-laboratorio` es esa
    // segunda oportunidad: está en el propio laboratorio, a la vista de
    // Bernardo, sin depender de haber pensado en el cuchillo antes.
    const { id } = await jugarEn(EL_VIGESIMO, '7b SIN CUCHILLO', 'x',
      [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio',
        'Agarro instrumental de piedra', 'Enfrento a Bernardo'],
      { estadoAnterior: subida, mesesTranscurridos: 0 }, PELEADOR);

    const conBisturi = (await Turn.open(id)).state;
    check('el instrumental del laboratorio se puede agarrar sin haber pasado por la cocina',
      conBisturi.items['it-bisturi-laboratorio']?.owner === conBisturi.activeInvestigator);

    const t = await Turn.open(id);
    const r = t.executeTool('resolve_attack', { npc_id: 'npc-bernardo', weapon_id: 'bisturi', punto_debil: 'true' });
    await t.commit();
    check('con el bisturí (tiene filo) el motor SÍ deja ir por la mano del anillo', r.ok, r.message.slice(0, 90));
  }

  console.log('\nEL CADÁVER DEL GUARDIÁN PUEDE LLEVAR NOMBRE, SI YA SE VIO EL RETRATO');
  {
    // Pedido después de jugarlo: examinar el cuerpo del que quedó en la
    // puerta le pone nombre SI el investigador ya reconoció la cara en uno
    // de los retratos del salón —ya no depende de una tirada, es una pista
    // cruzada como cualquier otra—. La única tirada de la escena es de
    // Cordura de verdad (skill: 'COR'), y decide cuánto cuesta mirar, no si
    // hay nombre.
    //
    // La tirada es real y depende de los dados —no tiene sentido ablandarla
    // para la prueba—, así que en vez de jugar hasta que salga se invoca el
    // `resolver` de la escena directamente, con un resultado armado a mano:
    // es la misma lógica que ejecutaría el motor, sin medir suerte (mismo
    // criterio que «CON BERNARDO VENCIDO…», un poco más arriba).
    const { state: conRetratos } = await jugarEn(EL_VIGESIMO, '7b RETRATOS SI', 'y1',
      AL_SOTANO, { estadoAnterior: subida, mesesTranscurridos: 0 });
    const { state: sinRetratos } = await jugarEn(EL_VIGESIMO, '7b RETRATOS NO', 'y2',
      ['Voy al salón', 'Voy al comedor', 'Examino mesa de cerca', 'Voy a la cocina',
        'Examino puerta de cerca', 'Examino puerta de cerca', 'Examino puerta de cerca',
        'Voy al trastero del sótano'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });

    const escena = EL_VIGESIMO_LOGICA.find((e) => e.id === 'examinar-cadaver-guardian')!;
    const intencion: IntencionLeida = {
      raw: 'examino el cuerpo del que quedo en la puerta', norm: 'examino el cuerpo del que quedo en la puerta',
      verb: 'examinar', verbExplicit: true, sustained: false,
      objetivo: { kind: 'npc', id: 'npc-guardian-sotano' }, destino: null,
    };
    const textoDe = (efecto: EfectoEscena | EfectoEscena[]) =>
      ([] as EfectoEscena[]).concat(efecto).flatMap((e) => e.texto ?? []).join('\n');

    const conNombre = textoDe(escena.resolver({
      estado: conRetratos, intencion, variante: (o) => o[0]!,
      tirada: { exito: true, grado: 'regular', mensaje: '' },
    }));
    check('con los retratos ya vistos, el cadáver revela nombre y apellido',
      conNombre.includes('Casimiro Díaz'));

    const sinNombre = textoDe(escena.resolver({
      estado: sinRetratos, intencion, variante: (o) => o[0]!,
      tirada: { exito: true, grado: 'regular', mensaje: '', numero: 12 },
    }));
    check('sin haber visto los retratos, reconoce el parentesco pero NO pone nombre',
      !sinNombre.includes('Casimiro Díaz'));

    // Pedido después de jugarlo: la identidad ya no depende de una tirada
    // —depende de haber visto el retrato, como cualquier otra pista
    // cruzada—, así que la ÚNICA tirada de la escena pasa a ser una de
    // Cordura de verdad. Superarla no cambia SI se reconoce el cuerpo, sólo
    // cuánto cuesta reconocerlo.
    const fallo = ([] as EfectoEscena[]).concat(escena.resolver({
      estado: conRetratos, intencion, variante: (o) => o[0]!,
      tirada: { exito: false, grado: 'regular', mensaje: '', numero: 47 },
    }));
    const textoFallo = fallo.flatMap((e) => e.texto ?? []).join('\n');
    check('la tirada ahora es de Cordura, no de Mitos: fallarla no le saca el nombre a Casimiro',
      textoFallo.includes('Casimiro Díaz'));
    check('...pero SÍ cuesta más Cordura que si se hubiera pasado la tirada',
      fallo.some((e) => e.cordura?.amount === 5));
    check('y de todos modos deja Mitos de Cthulhu ganado (el «1D3» pedido)',
      fallo.some((e) => (e.mitos?.amount ?? 0) >= 1 && (e.mitos?.amount ?? 0) <= 3));
  }

  console.log('\nEL MAUSOLEO: LA CÁMARA EMPIEZA CERRADA Y SE ABRE DE VERDAD');
  {
    const { state: enLaPuerta } = await jugarEn(EL_VIGESIMO, '7b MAUSOLEO', 'z1',
      ['Voy al mausoleo'], { estadoAnterior: subida, mesesTranscurridos: 0 });
    const antes = accionesDisponibles(enLaPuerta, EL_VIGESIMO).map((o) => o.id);
    check('antes de forzar el candado, no se puede ir a la cámara',
      !antes.includes('ir:el-mausoleo-camara'), antes.join(', '));

    // La tirada del candado es real (DEX a dificultad hard) y depende de los
    // dados — mismo criterio que el resto de la suite: se invoca el
    // `resolver` directo con una tirada armada a mano para probar la lógica,
    // no la suerte.
    const candado = EL_VIGESIMO_LOGICA.find((e) => e.id === 'mausoleo-forzar-candado')!;
    const intencionCandado: IntencionLeida = {
      raw: 'fuerzo el candado', norm: 'fuerzo el candado', verb: 'forzar', verbExplicit: true,
      sustained: false, objetivo: { kind: 'feature', id: null }, destino: null,
    };
    const cede = ([] as EfectoEscena[]).concat(candado.resolver({
      estado: enLaPuerta, intencion: intencionCandado, variante: (o) => o[0]!,
      tirada: { exito: true, grado: 'regular', mensaje: '' },
    }));
    const pistaCandado = cede.flatMap((e) => e.pistas ?? []).find((p) => p.description.includes('El candado del mausoleo cede'));
    check('al ceder, el candado deja la pista que destraba la cámara', Boolean(pistaCandado));

    const conCandadoAbierto: GameState = {
      ...enLaPuerta,
      board: { ...enLaPuerta.board, clues: [...enLaPuerta.board.clues, pistaFalsa(pistaCandado!.description)] },
    };
    const despues = accionesDisponibles(conCandadoAbierto, EL_VIGESIMO).map((o) => o.id);
    check('con el candado cedido, la cámara ya se puede visitar',
      despues.includes('ir:el-mausoleo-camara'), despues.join(', '));

    const noCede = ([] as EfectoEscena[]).concat(candado.resolver({
      estado: enLaPuerta, intencion: intencionCandado, variante: (o) => o[0]!,
      tirada: { exito: false, grado: 'regular', mensaje: '' },
    }));
    check('si no cede, no hay pista ni penalización: se puede reintentar',
      noCede.every((e) => !e.pistas?.length && !e.consecuencia));
  }

  console.log('\nEL MAUSOLEO: LA PLACA DE CASIMIRO SÓLO SE DISTINGUE SI SE SUPERA DESCUBRIR');
  {
    const { state: enLaPuerta } = await jugarEn(EL_VIGESIMO, '7b NICHOS', 'z2',
      ['Voy al mausoleo'], { estadoAnterior: subida, mesesTranscurridos: 0 });
    const nichos = EL_VIGESIMO_LOGICA.find((e) => e.id === 'mausoleo-examinar-nichos')!;
    const intencionNichos: IntencionLeida = {
      raw: 'examino los nichos', norm: 'examino los nichos', verb: 'examinar', verbExplicit: true,
      sustained: false, objetivo: { kind: 'feature', id: null }, destino: null,
    };
    const conExito = ([] as EfectoEscena[]).concat(nichos.resolver({
      estado: enLaPuerta, intencion: intencionNichos, variante: (o) => o[0]!,
      tirada: { exito: true, grado: 'regular', mensaje: '' },
    }));
    const textoExito = conExito.flatMap((e) => e.texto ?? []).join('\n');
    check('con Descubrir superado, se distingue la placa de Casimiro', textoExito.includes('Casimiro Díaz, 1889—1909'));
    check('y cuesta Cordura de verdad, no sólo Exposición',
      conExito.some((e) => e.cordura?.amount === 5) && conExito.some((e) => e.exposicion?.amount === 8));

    const sinExito = ([] as EfectoEscena[]).concat(nichos.resolver({
      estado: enLaPuerta, intencion: intencionNichos, variante: (o) => o[0]!,
      tirada: { exito: false, grado: 'regular', mensaje: '' },
    }));
    const textoSinExito = sinExito.flatMap((e) => e.texto ?? []).join('\n');
    check('sin superar Descubrir, ninguna placa se distingue', !textoSinExito.includes('Casimiro'));
    check('pero el costo de Cordura se paga igual: ver los nichos ya alcanza',
      sinExito.some((e) => e.cordura?.amount === 5));
  }

  console.log('\nPREPARACIÓN CONTRA BERNARDO: LAS PISTAS SUMAN DADOS, NO SUERTE');
  {
    // Llegar al laboratorio SIN examinar los retratos (a diferencia de
    // AL_SOTANO, que sí los examina) para poder probar el escalón de cero
    // hechos conocidos.
    const SIN_NADA = [
      'Voy al salón', 'Voy al comedor', 'Examino mesa de cerca', 'Voy a la cocina',
      'Examino puerta de cerca', 'Examino puerta de cerca', 'Examino puerta de cerca',
      'Voy al trastero del sótano', 'Trato de pasar sin que me vea',
      'Voy a la entrada al laberinto', 'Voy al laboratorio',
    ];
    const { state: sinNada } = await jugarEn(EL_VIGESIMO, '7b PREP 0', 'z3', SIN_NADA,
      { estadoAnterior: subida, mesesTranscurridos: 0 });

    const bernardoEnfrentar = EL_VIGESIMO_LOGICA.find((e) => e.id === 'bernardo-enfrentar')!;
    const intencionCombate: IntencionLeida = {
      raw: 'enfrento a bernardo', norm: 'enfrento a bernardo', verb: 'atacar', verbExplicit: true,
      sustained: false, objetivo: { kind: 'npc', id: 'npc-bernardo' }, destino: null,
    };
    const efectoCero = ([] as EfectoEscena[]).concat(bernardoEnfrentar.resolver({
      estado: sinNada, intencion: intencionCombate, variante: (o) => o[0]!, tirada: null,
    }));
    check('con cero hechos conocidos, no hay bonificación',
      !efectoCero.some((e) => (e.iniciaCombate?.preparacion?.dice ?? 0) > 0),
      JSON.stringify(efectoCero.find((e) => e.iniciaCombate)?.iniciaCombate?.preparacion));

    const conTres: GameState = {
      ...sinNada,
      board: { ...sinNada.board, clues: [
        ...sinNada.board.clues,
        pistaFalsa('La pared de retratos del salón repite un patrón: ...'),
        pistaFalsa('El ropero forzado del dormitorio principal guarda nueve recortes de diario ...'),
        pistaFalsa('Bernardo no fabricó el anillo: lo encontró ya hecho ...'),
      ] },
    };
    const efectoTres = ([] as EfectoEscena[]).concat(bernardoEnfrentar.resolver({
      estado: conTres, intencion: intencionCombate, variante: (o) => o[0]!, tirada: null,
    }));
    check('con tres hechos conocidos (2-4), un dado de bonificación',
      efectoTres.some((e) => e.iniciaCombate?.preparacion?.dice === 1),
      JSON.stringify(efectoTres.find((e) => e.iniciaCombate)?.iniciaCombate?.preparacion));

    const conSeis: GameState = {
      ...sinNada,
      board: { ...sinNada.board, clues: [
        ...sinNada.board.clues,
        pistaFalsa('La pared de retratos del salón repite un patrón: ...'),
        pistaFalsa('El ropero forzado del dormitorio principal guarda nueve recortes de diario ...'),
        pistaFalsa('Bernardo no fabricó el anillo: lo encontró ya hecho ...'),
        pistaFalsa('Bernardo no sabe si el ciclo de nacimientos cada treinta años ...'),
        pistaFalsa('El cuerpo de lo que custodiaba la puerta del sótano es Casimiro Díaz ...'),
        pistaFalsa('En el mausoleo de los Díaz, la placa ... tiene el bronce rayado desde adentro.'),
      ] },
    };
    const efectoSeis = ([] as EfectoEscena[]).concat(bernardoEnfrentar.resolver({
      estado: conSeis, intencion: intencionCombate, variante: (o) => o[0]!, tirada: null,
    }));
    check('con seis hechos conocidos (5-7), dos dados de bonificación',
      efectoSeis.some((e) => e.iniciaCombate?.preparacion?.dice === 2),
      JSON.stringify(efectoSeis.find((e) => e.iniciaCombate)?.iniciaCombate?.preparacion));

    // Y que el motor de verdad la aplique: con `activeCombat.preparacion`
    // seteado a mano, el asalto contra Bernardo tiene que mostrar el motivo
    // en la tirada — mismo criterio que ya se usa para comprobar «derribado».
    const { id } = await jugarEn(EL_VIGESIMO, '7b PREP MOTOR', 'z4',
      [...SIN_NADA, 'Enfrento a Bernardo'], { estadoAnterior: subida, mesesTranscurridos: 0 });
    const t = await Turn.open(id);
    // Se patchea `t.state` en memoria, sin persistir nada: alcanza para
    // comprobar que `toolResolveAttack` lee `activeCombat.preparacion`,
    // sin depender de que la escena real haya juntado seis pistas.
    t.state = {
      ...t.state,
      activeCombat: { ...t.state.activeCombat!, preparacion: { dice: 2, motivo: 'llegó sabiendo con qué se enfrentaba' } },
    };
    const r = t.executeTool('resolve_attack', { npc_id: 'npc-bernardo', weapon_id: 'desarmado' });
    await t.commit();
    const sTirada = (await Turn.open(id)).state;
    check('el asalto contra Bernardo muestra el motivo de la preparación',
      r.message.includes('llegó sabiendo con qué se enfrentaba') || sTirada.rolls.some((x) =>
        x.commitment.modifiers.some((m) => /llegó sabiendo/.test(m.reason))));
  }

  console.log('\nEL LABERINTO NUEVO ESTÁ OCULTO HASTA QUE BERNARDO CAE, Y NO BLOQUEA LOS FINALES');
  {
    const { state: bernardoVivo } = await jugarEn(EL_VIGESIMO, '7b LABERINTO ANTES', 'l1',
      [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });
    const antes = accionesDisponibles(bernardoVivo, EL_VIGESIMO).map((o) => o.id);
    check('con Bernardo vivo, el laberinto nuevo no aparece', !antes.includes('ir:laberinto-mas-alla'), antes.join(', '));

    const bern = bernardoVivo.npcs['npc-bernardo']!;
    const bernardoCaido: GameState = {
      ...bernardoVivo,
      npcs: { ...bernardoVivo.npcs, 'npc-bernardo': { ...bern, combate: { ...bern.combate!, hp: 0 } } },
    };
    const despues = accionesDisponibles(bernardoCaido, EL_VIGESIMO).map((o) => o.id);
    check('con Bernardo caído, el laberinto nuevo ya se puede visitar', despues.includes('ir:laberinto-mas-alla'), despues.join(', '));
    check('y "cortar"/"heredar" siguen ahí SIN haber pisado el laberinto —no quedó gateado por accidente—',
      despues.includes('cortar') && despues.includes('heredar'));
  }

  console.log('\nCADA ALA DEL LABERINTO: ESCUCHAR DECIDE ENTRE PASE LIMPIO Y ENCUENTRO');
  {
    // Mismo criterio que el resto de la suite: la tirada de Escuchar es real
    // y depende de los dados, así que se invoca el `resolver` de cada ala
    // directo, con el resultado armado a mano.
    const { state: cualquiera } = await jugarEn(EL_VIGESIMO, '7b LABERINTO ALAS', 'l2',
      [...AL_SOTANO, 'Trato de pasar sin que me vea', 'Voy a la entrada al laberinto', 'Voy al laboratorio'],
      { estadoAnterior: subida, mesesTranscurridos: 0 });
    const intencion: IntencionLeida = {
      raw: 'avanzo por el ala', norm: 'avanzo por el ala', verb: 'avanzar', verbExplicit: true,
      sustained: false, objetivo: { kind: 'none', id: null }, destino: null,
    };

    for (const [id, npcId, fragmentoPase] of [
      ['laberinto-avanzar-este', 'npc-pariente-abelardo', 'cruzás sin que la paja'],
      ['laberinto-avanzar-oeste', 'npc-pariente-felisa', 'cruzás sin que el canturreo'],
    ] as const) {
      const escena = EL_VIGESIMO_LOGICA.find((e) => e.id === id)!;
      const pase = ([] as EfectoEscena[]).concat(escena.resolver({
        estado: cualquiera, intencion, variante: (o) => o[0]!,
        tirada: { exito: true, grado: 'regular', mensaje: '' },
      }));
      check(`${id}: con Escuchar superado, cruza sin encuentro`,
        pase.flatMap((e) => e.texto ?? []).join('\n').includes(fragmentoPase) && !pase.some((e) => e.iniciaCombate));
      check(`${id}: y deja una pista propia del ala`, pase.some((e) => e.pistas?.length));

      const encuentro = ([] as EfectoEscena[]).concat(escena.resolver({
        estado: cualquiera, intencion, variante: (o) => o[0]!,
        tirada: { exito: false, grado: 'regular', mensaje: '' },
      }));
      check(`${id}: si falla, dispara combate contra el pariente de esa ala`,
        encuentro.some((e) => e.iniciaCombate?.npcIds.includes(npcId)));
      check(`${id}: y ese combate admite salida de palabra`,
        encuentro.some((e) => e.iniciaCombate?.salidaPacifica?.npcId === npcId));
    }
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
