/**
 * PRUEBA DE AGUA BLANCA — `npm run prueba:agua-blanca`
 *
 * Séptima aventura, primer acto. Lo que esta suite protege es lo propio de
 * ella, no lo que ya cubren la auditoría y las suites del motor:
 *
 *   1. El recorrido de investigación llega a lo que la aventura promete: el
 *      nombre viejo debajo de la cal, y la cuenta que el cura no mandó.
 *   2. Los cuatro desenlaces se alcanzan jugando, y no sólo están declarados.
 *   3. El texto de cada final tiene párrafos de verdad. Es contenido real
 *      corriendo contra el arreglo de §3.2-sedecies: las tres aventuras
 *      anteriores escriben el final como lista de párrafos y salían con comas.
 *   4. Arqueología y Geología se piden de verdad. Se agregaron para esta
 *      aventura (§3.2-quaterdecies) y una habilidad que se agrega y no se
 *      pide es peor que no agregarla.
 *   5. El círculo del monolito deja su contradicción en el tablero: es el
 *      corazón de la aventura y es lo único que no se puede explicar por
 *      ninguna vía.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_BLANCA } from './scenario/aguablanca.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
const insistir = (paso: string, veces = 4) => Array(veces).fill(paso) as string[];
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

async function jugar(titulo: string, semilla: string, guion: string[]): Promise<GameState> {
  const id = await createCampaign(AGUA_BLANCA, titulo, semilla.repeat(64).slice(0, 64));
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, AGUA_BLANCA, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return (await Turn.open(id)).state;
}

/**
 * El recorrido de investigación, sin llegar a ningún final. Toca las cuatro
 * cosas que gatean los desenlaces —el nombre viejo, los cráneos del granero,
 * la última hoja de la libreta y seis pistas reales— para que los cuatro
 * finales sigan siendo alcanzables después de subir la vara (ver el bug de
 * `pistas: minimo 3` reportado jugando: dos conversaciones alcanzaban para
 * desbloquear «ir a la cabecera» y «escribirle a Delfina»).
 */
const RECORRIDO = [
  'Mirar cartel de cerca',
  'Rasco la cal del cartel para leer el nombre de abajo',
  'Mirar loma de cerca',
  'Hablo con Sixto, el muchacho de la plaza',
  'Voy al almacén',
  'Le pregunto a Faustino por los tres que desaparecieron',
  'Mirar padron de cerca',
  'Agarro libreta de tapas negras',
  'Leo la libreta del profesor de arriba abajo',
  'Voy a la plaza',
  'Voy al granero de los shephard',
  'Mirar mesa de cerca',
  'Reviso el piso del fondo, abajo de la mesa',
  'Voy a la plaza',
  'Voy a la capilla',
  'Le pregunto al padre Anselmo por qué no va nadie a misa',
  'Mirar estatua de cerca',
  'Le pregunto por la hoja del libro de bautismos',
];

async function main() {
  // ── El bug reportado jugando ─────────────────────────────────────────────
  //
  // `llamar` y `escribir` estaban gateadas con `{op:'pistas', minimo:3}` —
  // TRES PISTAS CUALESQUIERA. Rascar el cartel, mirar la loma y hablar una
  // vez con Sixto ya daban cuatro, así que los cuatro desenlaces aparecían
  // después de una sola conversación, sin haber pisado el granero ni leído
  // una línea de la libreta del profesor. Reportado jugando, con captura.
  //
  // El arreglo no es «más pistas»: es pistas CONCRETAS. Denunciar necesita
  // algo que denunciar —los cráneos—, y escribirle a Delfina necesita haber
  // llegado hasta donde llegó el que vino antes.
  console.log('\nHABLAR UNA VEZ NO ALCANZA PARA CERRAR LA AVENTURA');
  {
    const s = await jugar('AB SUPERFICIAL', 'a', [
      'Mirar cartel de cerca',
      'Rasco la cal del cartel para leer el nombre de abajo',
      'Mirar loma de cerca',
      'Hablo con Sixto, el muchacho de la plaza',
    ]);
    const opciones = accionesDisponibles(s, AGUA_BLANCA).map((o) => o.id);
    check('con cuatro pistas de ambiente, «llamar» sigue sin aparecer',
      !opciones.includes('llamar'), opciones.join(', '));
    check('con cuatro pistas de ambiente, «escribir» sigue sin aparecer',
      !opciones.includes('escribir'), opciones.join(', '));
    check('«subir» e «irse» siguen ofrecidos —no dependen de investigar—',
      opciones.includes('subir') && opciones.includes('irse'));
  }

  console.log('\nEL RECORRIDO DE INVESTIGACIÓN');
  const s = await jugar('AB RECORRIDO', 'a', RECORRIDO);
  check('el pueblo revela su nombre viejo',
    s.board.clues.some((c) => c.description.includes('Agua Blanca')),
    `${s.board.clues.length} pistas`);
  check('se entrega la cuenta del cura', Boolean(s.documents['doc-bautismos']?.obtainedAt));
  check('la aventura sigue abierta después de investigar', !s.ending);

  console.log('\nLOS CUATRO DESENLACES SE ALCANZAN');
  const finales: Array<[string, string]> = [
    ['subir', 'Subo a la casa de la loma'],
    ['llamar', 'Voy a la cabecera a traer a la policía'],
    ['escribir', 'Le escribo a Delfina lo que averigüé'],
    ['irse', 'Me voy del pueblo'],
  ];
  for (const [esperado, intencion] of finales) {
    const fin = await jugar(`AB ${esperado}`, 'b', [...RECORRIDO, intencion]);
    check(`«${esperado}» se alcanza`, fin.ending?.id === esperado,
      fin.ending ? `${fin.ending.id} · ${fin.ending.title}` : 'sin final');
    const texto = fin.ending?.text ?? '';
    check(`  ...y su texto tiene párrafos de verdad`,
      texto.includes('\n\n') && !texto.includes('.,'),
      `${texto.length} caracteres`);
    check('  ...y después del final no quedan acciones',
      accionesDisponibles(fin, AGUA_BLANCA).length === 0);
  }

  console.log('\nLAS HABILIDADES NUEVAS SE PIDEN DE VERDAD');
  const conObjetos = await jugar('AB OBJETOS', 'c', [
    'Voy al granero',
    'Mirar mesa de cerca',
    'Reviso el piso del fondo, abajo de la mesa',
    'Agarro estatuilla de piedra',
    'Miro de cerca la estatuilla y trato de fecharla',
    'Voy al claro del monolito',
    'Agarro lasca del monolito',
    'Miro la lasca y trato de decir de dónde salió esa piedra',
    'Fecho el monolito y trato de decir quién lo hizo',
    'Doy la vuelta al monolito contando los pasos',
  ]);
  const pedidas = new Set(conObjetos.rolls.map((r) => r.commitment.skill));
  for (const hab of ['arqueologia', 'geologia']) {
    check(`la aventura pide ${hab}`, pedidas.has(hab), [...pedidas].join(', '));
  }
  check('el círculo del monolito deja su contradicción',
    conObjetos.board.contradictions.some((c) => c.description.includes('cuarenta y cuatro')),
    `${conObjetos.board.contradictions.length} contradicciones`);

  console.log('\nLA GRIETA TIENE ALGO MÁS QUE TRES CRÁNEOS, Y ES OPCIONAL');
  {
    const AL_GRANERO = [
      'Voy al granero',
      ...insistir('Mirar mesa de cerca'),
      ...insistir('Reviso el piso del fondo, abajo de la mesa'),
    ];
    const sinTocar = await jugar('AB SIN GRIETA', 'c', AL_GRANERO);
    const botones = accionesDisponibles(sinTocar, AGUA_BLANCA).map((o) => o.id);
    check('«meter el brazo más adentro» es un botón real, y no obliga a nadie',
      botones.includes('granero-grieta-mas'), botones.join(', '));

    async function jugarConId(titulo: string, semilla: string, guion: string[]) {
      const id = await createCampaign(AGUA_BLANCA, titulo, semilla.repeat(64).slice(0, 64));
      for (const intencion of guion) {
        const t = await Turn.open(id);
        if (t.state.ending) break;
        t.submitIntent(intencion, 'p1');
        const r = await runOfflineTurn(t, AGUA_BLANCA, intencion, noop);
        t.narrate(r.narration, r.options);
        await t.commit();
      }
      return { id, state: (await Turn.open(id)).state };
    }

    const primerAsalto = await jugarConId('AB GRIETA ASALTO', 'c', [...AL_GRANERO, 'Meto el brazo más adentro de la grieta']);
    check('el primer asalto deja activeCombat con salida de palabra',
      primerAsalto.state.activeCombat?.salidaPacifica?.npcId === 'npc-cosa-grieta',
      JSON.stringify(primerAsalto.state.activeCombat?.salidaPacifica));
    check('deja la consecuencia del cruce, para que la lea El Vigésimo',
      primerAsalto.state.consequences.some((c) => c.description.includes('se cruzó cuerpo a cuerpo con algo')));

    const inicioCalma = await jugarConId('AB GRIETA CALMA', 'c', [...AL_GRANERO, 'Meto el brazo más adentro de la grieta']);
    let calmado = false;
    for (let n = 0; n < 30 && !calmado; n++) {
      const t = await Turn.open(inicioCalma.id);
      if (!t.state.activeCombat) break;
      if (t.investigator.derived.hp <= 0 || t.investigator.status !== 'alive') break;
      t.executeTool('resolve_intimidate', { npc_id: 'npc-cosa-grieta' });
      await t.commit();
      const s = (await Turn.open(inicioCalma.id)).state;
      calmado = !s.activeCombat;
    }
    check('se puede espantarlo sin pelear a muerte', calmado);
  }

  // ── Bug real, reportado jugando ──────────────────────────────────────────
  //
  // `npc-cosa-grieta` nacía con `present: true` en la ficha del escenario, así
  // que ya figuraba entre los presentes del granero —y en el panel de
  // rivales, `Rivales` en `components.tsx`— desde el primer paso que se daba
  // ahí, antes de meter la mano en la grieta. El reveal de la escena
  // (`granero-grieta-mas`) nunca hacía falta para que "apareciera": ya
  // estaba. Mismo bug de fondo que el Pólipo de Merced, pero en el dato en
  // vez de en el texto.
  console.log('\nALGO QUE SALIÓ DE LA GRIETA NO ESTÁ ANTES DE SALIR');
  {
    const AL_GRANERO = [
      'Voy al granero',
      ...insistir('Mirar mesa de cerca'),
      ...insistir('Reviso el piso del fondo, abajo de la mesa'),
    ];
    const enElGranero = await jugar('AB COSA ANTES', 'c', AL_GRANERO);
    check('antes de meter el brazo, la cosa de la grieta no está presente',
      enElGranero.npcs['npc-cosa-grieta']?.present !== true);
    const trasElReveal = await jugar('AB COSA DESPUES', 'c', [...AL_GRANERO, 'Meto el brazo más adentro de la grieta']);
    check('recién al meter el brazo, la escena la hace aparecer',
      trasElReveal.npcs['npc-cosa-grieta']?.present === true);
  }

  // ── Bug real, reportado jugando ──────────────────────────────────────────
  //
  // Herminio no tenía `comercio` declarado, así que sus tres objetos en
  // venta se ofrecían con el botón genérico de "Llevarte…" —gratis— en vez
  // de "Comprar…", y no había forma de venderle nada. El bazar existía en el
  // mapa y en la prosa, pero no como comercio de verdad.
  console.log('\nEL BAZAR DE HERMINIO ES UN COMERCIO DE VERDAD, NO UN ESTANTE GRATIS');
  {
    const idH = await createCampaign(AGUA_BLANCA, 'AB BAZAR', 'd'.repeat(64));
    let t = await Turn.open(idH);
    t.executeTool('move_to_location', { location_id: 'tienda', reason: 'prueba' });
    await t.commit();
    let s = (await Turn.open(idH)).state;
    const opciones = accionesDisponibles(s, AGUA_BLANCA).map((o) => o.id);
    check('se ofrece comprar los tres objetos del bazar',
      ['it-talla-verde', 'it-cilindro-cera', 'it-cuaderno-tachado'].every((id) => opciones.includes(`comprar:${id}`)),
      opciones.join(', '));
    check('y NO se pueden llevar gratis con el botón genérico',
      !opciones.some((o) => o.startsWith('tomar:it-talla-verde') || o.startsWith('tomar:it-cilindro-cera') || o.startsWith('tomar:it-cuaderno-tachado')));

    const antes = s.investigators[s.activeInvestigator]!.derived.efectivo;
    t = await Turn.open(idH);
    const compra = t.executeTool('buy_item', { item_id: 'it-cilindro-cera', npc_id: 'npc-herminio' });
    await t.commit();
    s = (await Turn.open(idH)).state;
    check('comprarle a Herminio descuenta el precio y entrega el objeto',
      compra.ok && s.items['it-cilindro-cera']?.owner === s.activeInvestigator
      && s.investigators[s.activeInvestigator]!.derived.efectivo === antes - 22,
      `${antes} → ${s.investigators[s.activeInvestigator]!.derived.efectivo}`);

    t = await Turn.open(idH);
    const venta = t.executeTool('sell_item', { item_id: 'it-cilindro-cera', npc_id: 'npc-herminio' });
    await t.commit();
    s = (await Turn.open(idH)).state;
    check('y Herminio también compra de vuelta',
      venta.ok && s.items['it-cilindro-cera']?.owner === 'npc-herminio');
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
