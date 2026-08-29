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
import { classify } from './keeper/intent.ts';
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
  // El cupo de reintentos existe para que el andador no se cuelgue insistiendo
  // en una acción que nunca cede, y vale sólo para eso: para las acciones.
  //
  // Los MOVIMIENTOS quedan fuera a propósito. `ir:vestibulo` es un solo id sin
  // importar desde qué cuarto se vuelva, así que en un mapa con un hub —la
  // planta baja de la Casa de Díaz, con cinco puertas al vestíbulo— el cupo se
  // gastaba nada más que yendo y viniendo, y el andador se quedaba sin poder
  // volver a cruzar el mapa aunque todavía le faltaran cuartos por ver.
  // Pasó dos veces (Agua Blanca con la fonda y el bazar; El Vigésimo con el
  // primer piso y el sótano) y las dos veces se parcheó subiendo el número:
  // el problema no era el número. Caminar no puede agotarse; el techo real de
  // este recorrido es `turnos`.
  const REINTENTOS = 6;
  const esMovimiento = (id: string) => id.startsWith('ir:');

  let murio = false;
  let atrapado = false;
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
    const todas = accionesDisponibles(t.state, esc);
    const disp = todas.filter((o) => !o.final);
    const sinAgotar = (o: { id: string }) =>
      esMovimiento(o.id) || (veces.get(o.id) ?? 0) < REINTENTOS;

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
    if (!sig) {
      // Mismo espíritu que `murio`: si lo único que queda es elegir un
      // desenlace —`Scenario.bloqueoDecision` apagó mirar, hablar, hacer e
      // ir a propósito—, el andador no lo va a tocar (nunca elige un
      // `final`, eso lo audita `entregable.desenlaces` aparte) y se queda
      // sin nada que hacer ahí mismo, aunque el mapa no esté agotado. No es
      // que algo esté mal declarado: es que la aventura, a propósito, no
      // deja seguir explorando desde ese punto.
      if (todas.length > 0 && todas.every((o) => o.final)) atrapado = true;
      break;
    }

    veces.set(sig.id, (veces.get(sig.id) ?? 0) + 1);
    t.submitIntent(sig.intencion, 'p1');
    const r = await runOfflineTurn(t, esc, sig.intencion, () => {});
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  const state = (await loadState(id)).state;

  // ¿Quedó del otro lado de un pasaje sin retorno?
  //
  // El Vigésimo baja al sótano de la Casa de Díaz y ya no se puede volver
  // —está declarado así a propósito, ver ROADMAP §3.2-duovicies—. El andador
  // prefiere lo no visitado, así que apenas se destraba la escalera baja, y
  // desde abajo el resto de la casa deja de existir para él. Eso NO es un
  // lugar mal conectado: es la aventura haciendo lo que dice que hace, y le
  // podría pasar igual a cualquier jugador que baje temprano.
  //
  // Se calcula sin listas escritas a mano: BFS desde donde terminó, y si
  // ninguno de los lugares que le faltan se alcanza desde ahí, la cobertura
  // del mapa deja de ser exigible —mismo criterio que ya se usa con `murio`.
  const alcanzables = new Set<string>([state.world.currentLocation]);
  const cola = [state.world.currentLocation];
  while (cola.length) {
    const actual = cola.shift()!;
    for (const v of state.world.locations[actual]?.connections ?? []) {
      if (!alcanzables.has(v)) { alcanzables.add(v); cola.push(v); }
    }
  }
  const faltan = Object.values(state.world.locations).filter((l) => !l.visited);
  const sinRetorno = faltan.length > 0 && faltan.every((l) => !alcanzables.has(l.id));

  return { state, murio, atrapado, sinRetorno };
}

async function auditar(esc: Scenario) {
  console.log(`\n${'═'.repeat(66)}\n${esc.title.toUpperCase()}\n${'═'.repeat(66)}`);

  // ── 1. Estática: el mapa y los objetos ───────────────────────────────────
  console.log('\nEL MAPA');
  const sueltos = lugaresInalcanzables(esc);
  for (const l of sueltos) console.log(`   ✗ «${l}» no se alcanza caminando desde el inicio`);
  check('se llega a todas las localizaciones', sueltos.length === 0,
    `${Object.keys(esc.locations).length} lugares`);

  // El Vigésimo tiene tres pasajes sin vuelta a propósito: el sótano de la
  // Casa de Díaz es la única parte de la campaña que rompe el formato libre
  // (ROADMAP §3.2-duovicies) — una vez que se baja, no hay caminar de vuelta.
  // No es un lugar inalcanzable ni un accidente: está declarado así porque
  // la aventura decide que ya dejó de ser una investigación en ese punto.
  const IDA_CONOCIDA = new Set(esc.id === 'el-vigesimo'
    ? ['cocina→trastero-sotano', 'trastero-sotano→entrada-laberinto', 'entrada-laberinto→laboratorio']
    : []);
  const ida = conexionesDeIda(esc).filter((c) => !IDA_CONOCIDA.has(`${c.desde}→${c.hasta}`));
  for (const c of ida) console.log(`   ⚠ ${c.desde} → ${c.hasta} sin vuelta`);
  check('ninguna conexión es de ida sin vuelta declarada (fuera de las conocidas)', ida.length === 0,
    ida.length ? `${ida.length}` : 'todas simétricas o ya conocidas');

  const perdidos = objetosPerdidos(esc);
  for (const o of perdidos) console.log(`   ✗ ${o}`);
  check('todos los objetos están en algún lado', perdidos.length === 0,
    `${esc.items.length} objetos`);

  // ── 2. Banco de escenas ──────────────────────────────────────────────────
  const id = await createCampaign(esc, 'BANCO', 'z'.repeat(64));
  const base = (await loadState(id)).state;

  // Todo tema, escrito con la intención exacta, tiene que llegar a `talkTo`.
  //
  // Encontrado jugando la sexta aventura, y ya había dos casos idénticos en
  // aventuras publicadas (`e-medir` en La Legua Perdida, `r-para-que` en El
  // Invierno Debido): `intent.ts` fija `verbExplicit = verb !== 'desconocido'`
  // ANTES de asignarle un verbo de compromiso a una frase sin verbo
  // reconocido, así que «le pido que…» —"pedir" no está en la tabla de
  // verbos— queda con `verbExplicit: false` aunque el motor termine
  // clasificándolo como `hablar`. Y `offline.ts` desvía toda frase con
  // `verbExplicit: false` y un objetivo resuelto hacia la respuesta genérica
  // «Hacés eso», ANTES de llegar al chequeo de `target.kind === 'npc'` que
  // dispara `talkTo`. El tema nunca cede, ni con el botón: la etiqueta ofrece
  // exactamente la frase rota.
  //
  // No hace falta jugar para encontrarlo: es una propiedad de la frase, no
  // del estado. Se prueba una vez por tema, parado en el lugar donde su NPC
  // está.
  console.log('\nLOS TEMAS SE PUEDEN PREGUNTAR');
  const temasRotos: string[] = [];
  for (const t of esc.conversations) {
    const loc = Object.values(esc.locations).find((l) => l.npcsPresent.includes(t.npc));
    if (!loc) continue; // ya lo caza la validación de carga: NPC sin lugar.
    const s: GameState = { ...base, world: { ...base.world, currentLocation: loc.id } };
    const i = classify(s, t.intencion);
    const idNpc = i.target.kind === 'npc' ? i.target.npc.id : null;
    if (i.target.kind === 'npc' && idNpc === t.npc && i.verbExplicit) continue;
    temasRotos.push(
      `«${t.id}»: «${t.intencion}» clasifica verbo=${i.verb}${i.verbExplicit ? '' : ' (implícito)'}` +
      `, target=${i.target.kind}${idNpc ? ' ' + idNpc : ''} — nunca llega a hablarle a ${t.npc}`,
    );
  }
  for (const m of temasRotos) console.log(`   ✗ ${m}`);
  check('la intención de cada tema clasifica como hablarle explícitamente a su NPC',
    temasRotos.length === 0, `${esc.conversations.length} temas`);

  // El botón de cada tema tiene que reconocerse A SÍ MISMO.
  //
  // Encontrado jugando: `r-cirilo-inconsciente` en El Invierno Debido tenía
  // `intencion: 'Le pregunto algo a Ramona'` y ninguna de sus `claves`
  // aparecía en esa frase. `temaPorFrase` (offline.ts) busca `norm.includes(
  // clave)` sobre el texto YA CLASIFICADO —nunca sobre el `id` del tema—, así
  // que sin coincidencia el tema no se selecciona NI CON SU PROPIO BOTÓN: cae
  // al `sinTema()` genérico («Pregunte lo que tenga que preguntar…»), y el
  // jugador nunca ve la escena que escribiste para ese momento, aunque haga
  // exactamente lo que el botón le pedía.
  //
  // Réplica exacta del matching real: `i.norm` sale de `classify()`, `clave`
  // se usa cruda —temaPorFrase no la normaliza—, así que una clave con tilde
  // o mayúscula rompe en silencio aunque este chequeo la vea «parecida».
  const sinClave: string[] = [];
  for (const t of esc.conversations) {
    const loc = Object.values(esc.locations).find((l) => l.npcsPresent.includes(t.npc));
    if (!loc) continue;
    const s: GameState = { ...base, world: { ...base.world, currentLocation: loc.id } };
    const i = classify(s, t.intencion);
    const matchea = (t.claves ?? []).some((c) => i.norm.includes(c));
    if (!matchea) {
      sinClave.push(`«${t.id}»: «${t.intencion}» no contiene ninguna de sus claves ${JSON.stringify(t.claves)}`);
    }
  }
  for (const m of sinClave) console.log(`   ✗ ${m}`);
  check('la intención de cada tema contiene alguna de sus propias claves',
    sinClave.length === 0, `${esc.conversations.length} temas`);
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

  // Mirar un DETALLE del lugar no puede dar por hecha una ACCIÓN.
  //
  // Bug real, reportado jugando tres veces seguidas antes de encontrarlo: el
  // detalle `f-catre` de El Sueño Debido dejaba una pista cuyo texto contenía
  // el fragmento que la acción «Revisarlo como se revisa a un enfermo» usaba
  // como `hecha`. Mirar el catre marcaba la acción como ya hecha —el botón
  // desaparecía— sin ejecutar nunca su escena, y por lo tanto sin dejar el
  // marcador que destrababa la primera noche. Callejón sin salida, invisible
  // desde el contenido: las dos piezas son correctas por separado.
  //
  // Un gate `visible` satisfecho por un detalle está BIEN —es un desbloqueo,
  // y La Legua lo usa a propósito—. El que no puede pasar es `hecha`.
  const pistasDeDetalle = Object.values(esc.locations).flatMap((l) =>
    (l.features ?? []).filter((f) => f.clue).map((f) => ({
      donde: `${l.id}/${f.id}`, texto: f.clue!.description,
    })));
  const soloDetalles: GameState = {
    ...base,
    board: {
      ...base.board,
      clues: pistasDeDetalle.map((p, n) => ({
        id: `detalle-${n}`, description: p.texto, kind: 'physical' as const,
        discoveredBy: base.activeInvestigator, discoveredAt: 'auditoría', source: 'auditoría',
        reliability: 'reliable' as const, reliabilityKnown: false, disclosure: 'PUBLIC' as const,
      })),
    },
  };
  const hechasPorDetalle = esc.actions.filter((a) => a.hecha?.(soloDetalles));
  for (const a of hechasPorDetalle) {
    console.log(`   ✗ «${a.id}»: mirar un detalle del lugar la da por hecha sin haberla ejecutado`);
  }
  check('ningún detalle del lugar da por hecha una acción que nunca corrió',
    hechasPorDetalle.length === 0, `${esc.actions.length} acciones`);

  // ── 3. Recorrido real ────────────────────────────────────────────────────
  console.log('\nEL RECORRIDO REAL');
  const { state: final, murio, atrapado, sinRetorno } = await recorrerAFondo(esc, 'j');
  if (murio) {
    console.log('  el investigador murió en el intento —recorrido cortado ahí, a propósito—');
  }
  if (atrapado) {
    console.log('  la aventura obligó a decidir un desenlace ahí mismo —recorrido cortado a propósito, no exploró más—');
  }
  if (sinRetorno) {
    console.log('  el recorrido cruzó un pasaje sin retorno y lo que le falta quedó del otro lado —a propósito, no es un lugar mal conectado—');
  }
  const cortado = murio || atrapado || sinRetorno;
  const conseguidas = new Set(final.board.clues.map((c) => c.description));
  const docsObtenidos = Object.values(final.documents).filter((d) => d.obtainedAt).length;
  const propsVistas = Object.values(final.items)
    .reduce((a, i) => a + i.discoveredProperties.length, 0);
  const lugaresVisitados = Object.values(final.world.locations).filter((l) => l.visited).length;

  console.log(`  ${conseguidas.size} pistas · ${docsObtenidos}/${esc.documents.length} documentos · ${propsVistas} propiedades · ${lugaresVisitados}/${Object.keys(esc.locations).length} lugares`);

  check('el recorrido visita todo el mapa',
    cortado || lugaresVisitados === Object.keys(esc.locations).length,
    `${lugaresVisitados}/${Object.keys(esc.locations).length}`);
  check('el recorrido obtiene todos los documentos',
    cortado || docsObtenidos === esc.documents.length, `${docsObtenidos}/${esc.documents.length}`);

  // Las pistas de features son las más fáciles de romper: dependen de que el
  // detalle se ofrezca y de que la tirada salga alguna de las tres veces.
  const pistasDeFeature = Object.values(esc.locations)
    .flatMap((l) => (l.features ?? []).filter((f) => f.clue).map((f) => f.clue!.description));
  const faltantes = pistasDeFeature.filter((p) => !conseguidas.has(p));
  for (const p of faltantes) console.log(`   ⚠ no salió: «${p.slice(0, 70)}…»`);
  check('el recorrido consigue las pistas de los detalles del mapa',
    cortado || faltantes.length === 0, `${pistasDeFeature.length - faltantes.length}/${pistasDeFeature.length}`);

  // Las pistas de TEMAS son el punto ciego que dejó pasar a Eusebio Roldán:
  // `loQuePuedeEntregar` (capa 2, arriba) marca `tema.cede.pista` como
  // entregable con sólo leer el dato, sin comprobar que el tema se pueda
  // ofrecer nunca —ni el `disponible`, ni sobre todo que el NPC dueño esté
  // en el `npcsPresent` de algún lugar—. `validarContenido` ahora exige lo
  // segundo al cargar —ESE es el chequeo duro, la garantía real—. Esto de
  // acá es más débil a propósito y NO hace fallar la prueba: un tema puede
  // no salir en un recorrido de 260 turnos con semilla fija por motivos que
  // no son bugs —una tirada dura, una paciencia que se agota, una cadena de
  // requisitos que el andador (que explora con una estrategia fija, no como
  // jugaría una persona) no alcanza a encadenar—. Es una lista para mirar,
  // no una luz roja: si algo aparece acá siempre, vale la pena investigarlo
  // a mano, como se investigó Eusebio.
  const pistasDeTema = esc.conversations
    .filter((t) => t.cede.pista)
    .map((t) => ({ tema: t.id, texto: t.cede.pista!.description }));
  const temasFaltantes = pistasDeTema.filter((p) => !conseguidas.has(p.texto));
  for (const p of temasFaltantes) console.log(`   ⚠ tema «${p.tema}» no cedió en este recorrido: «${p.texto.slice(0, 55)}…»`);
  console.log(`  temas que cedieron: ${pistasDeTema.length - temasFaltantes.length}/${pistasDeTema.length}`);
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
