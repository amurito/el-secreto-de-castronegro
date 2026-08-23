/**
 * AUDITORÍA DE ALCANZABILIDAD — `npm run prueba:auditoria`
 *
 * La prueba que este proyecto necesitaba desde hace siete iteraciones.
 *
 * Recorre TODO lo que cada aventura declara —pistas, propiedades ocultas,
 * documentos, secretos, desenlaces, localizaciones, objetos— y verifica que
 * exista al menos un camino que lo entregue. Corre sobre el catálogo entero,
 * así que una aventura nueva queda auditada por el solo hecho de existir.
 *
 * Es la prueba que habría encontrado, antes que el jugador:
 *   · los dos desenlaces declarados y sin implementar
 *   · las propiedades que se destrababan con sólo estar en un lugar
 *   · `ITEM_USED`, que ninguna herramienta emitía
 *
 * Tres capas, de más barata a más cara:
 *   1. ESTÁTICA sobre el mapa y los objetos: certeza, instantánea.
 *   2. BANCO DE ESCENAS: ejecuta cada escena con éxito y fracaso y recolecta
 *      lo que puede entregar. Certeza sobre el contenido autoral.
 *   3. RECORRIDO REAL: juega y confirma que en la práctica se llega.
 */

import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { CATALOGO } from './scenario/catalogo.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import {
  loQueDeclara, loQuePuedeEntregar, lugaresInalcanzables,
  conexionesDeIda, objetosPerdidos,
} from './rules/auditoria.ts';
import type { Scenario } from './scenario/types.ts';
import type { GameState } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/**
 * Estados de banco: uno recién creado, uno con TODO descubierto, y una copia
 * de cada uno **parado en cada localización**.
 *
 * Las tres dimensiones hacen falta y las tres las aprendí de fallar:
 *
 *   · lo ya descubierto, porque muchas escenas ramifican por eso;
 *   · el LUGAR, porque «leer el cuaderno» sólo entrega el cuaderno estando en
 *     el cuarto, y con el banco parado en el patio la auditoría lo daba por
 *     inalcanzable — un falso positivo, que en una prueba es tan malo como un
 *     falso negativo porque enseña a ignorarla.
 *
 * Las pistas del banco salen de DOS fuentes, y la segunda se agregó tarde: los
 * detalles de cada lugar, y lo que dejan los temas de conversación. Sin la
 * segunda, una escena que ramifica por algo que contó un NPC —«esto ya pasó
 * una vez, hace cuarenta y nueve años»— se veía siempre por su rama pobre, y
 * un desenlace que sólo existe en la rama rica quedaba reportado como
 * inalcanzable aunque una partida de verdad lo alcanzara sin problema. Otro
 * falso positivo, encontrado escribiendo la quinta aventura.
 */
function estadosDeBanco(s: GameState, esc: Scenario): GameState[] {
  const pistasDeDetalles = Object.values(esc.locations).flatMap((l) =>
    (l.features ?? []).filter((f) => f.clue).map((f) => ({
      id: `banco-${l.id}-${f.id}`, description: f.clue!.description,
      kind: f.clue!.kind, reliability: f.clue!.reliability,
    })));
  // Un tema puede dejar pista en cualquiera de sus salidas, no sólo al ceder.
  const pistasDeTemas = esc.conversations.flatMap((t) =>
    [t.cede, t.esquiva, t.critico, t.pifia]
      .flatMap((e) => (e?.pista ? [e.pista] : []))
      .map((p, n) => ({
        id: `banco-tema-${t.id}-${n}`, description: p.description,
        kind: p.kind, reliability: p.reliability,
      })));

  const todoVisto: GameState = {
    ...s,
    items: Object.fromEntries(Object.entries(s.items).map(([k, i]) => [k, {
      ...i,
      owner: s.activeInvestigator,
      usageCount: 9,
      discoveredProperties: [...i.hiddenProperties, ...i.conditionalProperties]
        .map((p) => ({ propertyId: p.id, at: 'banco', how: 'banco de auditoría' })),
    }])),
    documents: Object.fromEntries(Object.entries(s.documents)
      .map(([k, d]) => [k, { ...d, obtainedAt: 'banco' }])),
    board: {
      ...s.board,
      clues: [...pistasDeDetalles, ...pistasDeTemas].map((p) => ({
        ...p,
        discoveredBy: s.activeInvestigator, discoveredAt: 'banco', source: 'banco',
        reliabilityKnown: false, disclosure: 'PUBLIC' as const,
      })),
    },
  };
  // Cada base, parada en cada lugar del mapa.
  const enCadaLugar = (base: GameState) =>
    Object.keys(esc.locations).map((id) => ({
      ...base, world: { ...base.world, currentLocation: id },
    }));

  return [...enCadaLugar(s), ...enCadaLugar(todoVisto)];
}

/**
 * Juega intentando todo lo que se ofrezca, con reintentos, y caminando.
 *
 * La estrategia importa: la primera versión elegía siempre la primera acción
 * sin agotar, y las de movimiento están al final del orden — así que se
 * quedaba en el patio agotando opciones y visitaba 3 de 6 lugares. Un
 * recorrido que no camina no audita un mapa.
 *
 * Ahora agota lo que hay ACÁ y recién entonces se mueve, con preferencia por
 * lo que no visitó.
 */
async function recorrerAFondo(esc: Scenario, semilla: string, turnos = 260) {
  const id = await createCampaign(esc, 'AUDIT', semilla.repeat(64).slice(0, 64));
  const veces = new Map<string, number>();
  const REINTENTOS = 4;

  let murio = false;
  for (let n = 0; n < turnos; n++) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    // Con combate de verdad en el mapa (Invierno Debido, Cirilo), el
    // recorrido puede morir de verdad — el andador prueba TODO lo que
    // encuentra, insistiendo, y eso incluye pelear hasta que alguien pierde.
    // Es exactamente lo que le podría pasar a un jugador real. Cuando pasa,
    // el investigador no puede seguir actuando —mismo criterio que usa
    // `api.local.ts` para bloquear el juego real— así que el recorrido se
    // corta acá, y la cobertura del mapa deja de ser un requisito: no es que
    // algo esté mal declarado, es que el personaje se murió en el intento.
    if (t.investigator.status !== 'alive') { murio = true; break; }
    const disp = accionesDisponibles(t.state, esc).filter((o) => !o.final);
    const sinAgotar = (o: { id: string }) => (veces.get(o.id) ?? 0) < REINTENTOS;

    const aqui = disp.filter((o) => o.grupo !== 'mover' && sinAgotar(o));
    let sig: (typeof disp)[number] | undefined = aqui[0];

    if (!sig) {
      // Nada nuevo acá: caminar, prefiriendo lo no visitado.
      const salidas = disp.filter((o) => o.grupo === 'mover');
      const noVisitado = salidas.find((o) => {
        const destino = o.id.replace(/^ir:/, '');
        return !t.state.world.locations[destino]?.visited;
      });
      sig = noVisitado ?? salidas.find(sinAgotar);
    }
    if (!sig) break;

    veces.set(sig.id, (veces.get(sig.id) ?? 0) + 1);
    t.submitIntent(sig.intencion, 'p1');
    const r = await runOfflineTurn(t, esc, sig.intencion, () => {});
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return { state: (await loadState(id)).state, murio };
}

async function auditar(esc: Scenario) {
  console.log(`\n${'═'.repeat(66)}\n${esc.title.toUpperCase()}\n${'═'.repeat(66)}`);

  // ── 1. Estática: el mapa y los objetos ───────────────────────────────────
  console.log('\nEL MAPA');
  const sueltos = lugaresInalcanzables(esc);
  for (const l of sueltos) console.log(`   ✗ «${l}» no se alcanza caminando desde el inicio`);
  check('se llega a todas las localizaciones', sueltos.length === 0,
    `${Object.keys(esc.locations).length} lugares`);

  const ida = conexionesDeIda(esc);
  for (const c of ida) console.log(`   ⚠ ${c.desde} → ${c.hasta} sin vuelta`);
  check('ninguna conexión es de ida sin vuelta declarada', ida.length === 0,
    ida.length ? `${ida.length}` : 'todas simétricas');

  const perdidos = objetosPerdidos(esc);
  for (const o of perdidos) console.log(`   ✗ ${o}`);
  check('todos los objetos están en algún lado', perdidos.length === 0,
    `${esc.items.length} objetos`);

  // ── 2. Banco de escenas ──────────────────────────────────────────────────
  const id = await createCampaign(esc, 'BANCO', 'z'.repeat(64));
  const base = (await loadState(id)).state;
  const declarado = loQueDeclara(esc);
  const entregable = loQuePuedeEntregar(esc, estadosDeBanco(base, esc));

  console.log('\nEL BANCO DE ESCENAS');
  for (const r of entregable.escenasRotas) console.log(`   ✗ «${r.escena}»: ${r.error}`);
  check('ninguna escena explota al ejecutarse', entregable.escenasRotas.length === 0,
    `${esc.scenes.length} escenas`);

  console.log('\nLO DECLARADO TIENE CAMINO');

  const docsHuerfanos = declarado.documentos.filter((d) => !entregable.documentos.has(d.que));
  for (const d of docsHuerfanos) console.log(`   ✗ ${d.donde}: ninguna escena lo entrega`);
  check('todos los documentos los entrega alguna escena', docsHuerfanos.length === 0,
    `${declarado.documentos.length} documentos`);

  const secretosHuerfanos = declarado.secretos.filter((s) => !entregable.secretos.has(s.que));
  for (const s of secretosHuerfanos) console.log(`   ✗ ${s.donde} («${s.que}»): ningún tema lo revela`);
  check('todos los secretos los revela algún tema', secretosHuerfanos.length === 0,
    `${declarado.secretos.length} secretos`);

  const finalesHuerfanos = declarado.desenlaces.filter((e) => !entregable.desenlaces.has(e.que));
  for (const e of finalesHuerfanos) console.log(`   ✗ ${e.donde}: ninguna escena lo alcanza`);
  check('todos los desenlaces los alcanza alguna escena', finalesHuerfanos.length === 0,
    `${declarado.desenlaces.length} desenlaces`);

  // Propiedades: `never` es intencional; el resto tiene que tener camino.
  const propsSinCamino = declarado.propiedades.filter(
    (p) => p.condicion !== 'never' && !entregable.propiedades.has(p.que),
  );
  for (const p of propsSinCamino) {
    console.log(`   ✗ ${p.donde} → ${p.que}: ninguna escena la descubre (condición: ${p.condicion})`);
  }
  check('todas las propiedades ocultas tienen quién las descubra',
    propsSinCamino.length === 0, `${declarado.propiedades.length} propiedades`);

  const pistasHuerfanas = declarado.pistas.filter((p) => !entregable.pistas.has(p.que));
  for (const p of pistasHuerfanas) console.log(`   ✗ ${p.donde}: «${p.que.slice(0, 60)}…»`);
  check('todas las pistas declaradas las entrega alguien', pistasHuerfanas.length === 0,
    `${declarado.pistas.length} pistas`);

  // ── 3. Recorrido real ────────────────────────────────────────────────────
  console.log('\nEL RECORRIDO REAL');
  const { state: final, murio } = await recorrerAFondo(esc, 'j');
  if (murio) {
    console.log('  el investigador murió en el intento —recorrido cortado ahí, a propósito—');
  }
  const conseguidas = new Set(final.board.clues.map((c) => c.description));
  const docsObtenidos = Object.values(final.documents).filter((d) => d.obtainedAt).length;
  const propsVistas = Object.values(final.items)
    .reduce((a, i) => a + i.discoveredProperties.length, 0);
  const lugaresVisitados = Object.values(final.world.locations).filter((l) => l.visited).length;

  console.log(`  ${conseguidas.size} pistas · ${docsObtenidos}/${esc.documents.length} documentos · ${propsVistas} propiedades · ${lugaresVisitados}/${Object.keys(esc.locations).length} lugares`);

  check('el recorrido visita todo el mapa',
    murio || lugaresVisitados === Object.keys(esc.locations).length,
    `${lugaresVisitados}/${Object.keys(esc.locations).length}`);
  check('el recorrido obtiene todos los documentos',
    murio || docsObtenidos === esc.documents.length, `${docsObtenidos}/${esc.documents.length}`);

  // Las pistas de features son las más fáciles de romper: dependen de que el
  // detalle se ofrezca y de que la tirada salga alguna de las tres veces.
  const pistasDeFeature = Object.values(esc.locations)
    .flatMap((l) => (l.features ?? []).filter((f) => f.clue).map((f) => f.clue!.description));
  const faltantes = pistasDeFeature.filter((p) => !conseguidas.has(p));
  for (const p of faltantes) console.log(`   ⚠ no salió: «${p.slice(0, 70)}…»`);
  check('el recorrido consigue las pistas de los detalles del mapa',
    murio || faltantes.length === 0, `${pistasDeFeature.length - faltantes.length}/${pistasDeFeature.length}`);
}

/**
 * LA PRUEBA DE LA PRUEBA.
 *
 * Una auditoría que pasa a la primera no demostró nada: puede estar mirando
 * para otro lado. Acá se le rompen cosas a propósito a una copia del escenario
 * y se verifica que las encuentre.
 *
 * Si algún día alguien afloja una comprobación «porque molesta», esto se pone
 * rojo antes que el juego.
 */
async function auditarLaAuditoria() {
  console.log(`\n${'═'.repeat(66)}\nLA AUDITORÍA DETECTA LO QUE DICE DETECTAR\n${'═'.repeat(66)}\n`);
  const sano = CATALOGO[0]!.scenario;
  const id = await createCampaign(sano, 'CONTROL', 'y'.repeat(64));
  const base = (await loadState(id)).state;

  // ── Un lugar al que no lleva ninguna conexión ────────────────────────────
  const islaSuelta: Scenario = {
    ...sano,
    locations: Object.fromEntries(Object.entries(sano.locations).map(([k, l]) => [k, {
      ...l, connections: l.connections.filter((c) => c !== 'orilla'),
    }])),
  };
  check('caza una localización a la que no se llega',
    lugaresInalcanzables(islaSuelta).includes('orilla'),
    lugaresInalcanzables(islaSuelta).join(', ') || 'no la vio');

  // ── Conexión de una sola dirección ───────────────────────────────────────
  const sinVuelta: Scenario = {
    ...sano,
    locations: { ...sano.locations, casa: { ...sano.locations['casa']!, connections: ['cuarto'] } },
  };
  check('caza una conexión sin vuelta', conexionesDeIda(sinVuelta).length > 0,
    conexionesDeIda(sinVuelta).map((c) => `${c.desde}→${c.hasta}`).join(', ') || 'no la vio');

  // ── Objeto que no está en ningún lado ────────────────────────────────────
  const objetoPerdido: Scenario = {
    ...sano,
    items: sano.items.map((i, n) => (n === 0 ? { ...i, owner: 'un-lugar-que-no-existe' } : i)),
  };
  check('caza un objeto que no está en ningún lado',
    objetosPerdidos(objetoPerdido).length === 1,
    objetosPerdidos(objetoPerdido).join(', ') || 'no lo vio');

  // ── Documento que ninguna escena entrega ─────────────────────────────────
  const docHuerfano: Scenario = {
    ...sano,
    documents: [...sano.documents, { ...sano.documents[0]!, id: 'doc-fantasma', title: 'Sin camino' }],
  };
  const entDoc = loQuePuedeEntregar(docHuerfano, estadosDeBanco(base, docHuerfano));
  check('caza un documento que nadie entrega', !entDoc.documentos.has('doc-fantasma'));

  // ── Desenlace declarado y sin implementar: EL BUG ORIGINAL ───────────────
  const finalHuerfano: Scenario = {
    ...sano,
    endings: [...sano.endings, { id: 'fin-fantasma', title: 'Final sin camino', condition: 'nunca' }],
  };
  const entFin = loQuePuedeEntregar(finalHuerfano, estadosDeBanco(base, finalHuerfano));
  check('caza un desenlace declarado que ninguna escena alcanza',
    !entFin.desenlaces.has('fin-fantasma'));

  // ── Secreto que ningún tema revela ───────────────────────────────────────
  const secretoHuerfano: Scenario = {
    ...sano,
    npcs: sano.npcs.map((n, i) => (i === 0 ? {
      ...n,
      secrets: [...(n.secrets ?? []), {
        id: 's-fantasma', content: 'Nadie pregunta esto.',
        disclosure: 'KEEPER_SECRET' as const, revealed: false,
      }],
    } : n)),
  };
  const entSec = loQuePuedeEntregar(secretoHuerfano, estadosDeBanco(base, secretoHuerfano));
  const declSec = loQueDeclara(secretoHuerfano);
  check('caza un secreto que ningún tema revela',
    declSec.secretos.some((s) => s.que === 's-fantasma') && !entSec.secretos.has('s-fantasma'));

  // ── Escena que explota al ejecutarse ─────────────────────────────────────
  const escenaRota: Scenario = {
    ...sano,
    scenes: [...sano.scenes, {
      id: 'escena-rota', cuando: () => true,
      resolver: () => { throw new Error('el estado no traía lo que la escena esperaba'); },
    }],
  };
  const entRota = loQuePuedeEntregar(escenaRota, estadosDeBanco(base, escenaRota));
  check('caza una escena que explota al ejecutarse',
    entRota.escenasRotas.some((r) => r.escena === 'escena-rota'));

  // ── Y que el inventario no esté vacío, que sería la peor manera de pasar ─
  const decl = loQueDeclara(sano);
  check('el inventario de lo declarado no está vacío',
    decl.pistas.length > 5 && decl.propiedades.length > 0 && decl.desenlaces.length > 0,
    `${decl.pistas.length} pistas · ${decl.propiedades.length} propiedades · ${decl.desenlaces.length} desenlaces`);
}

async function main() {
  console.log('\nAUDITORÍA DE ALCANZABILIDAD');
  console.log(`${CATALOGO.length} aventuras en el catálogo`);
  for (const entrada of CATALOGO) await auditar(entrada.scenario);
  await auditarLaAuditoria();

  console.log(`\n${'═'.repeat(66)}`);
  console.log(fallos === 0 ? '\nTODO ALCANZABLE\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
