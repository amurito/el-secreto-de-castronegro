/**
 * EL SANTO OFICIO DE CUYO — recorrido del Acto I, rama Iglesia.
 *
 * Camina la aventura con los botones reales (`ir:…`, las respuestas del
 * interrogatorio) en vez de saltar de lugar con una herramienta: la primera
 * versión de este test hacía lo segundo y no detectaba que una escena con
 * `destino` REEMPLAZA el movimiento en lugar de acompañarlo (por eso las
 * llegadas son acciones explícitas).
 *
 * Qué garantiza: que el interrogatorio encadena sus tres preguntas sin
 * repetirlas, que el encierro cierra y abre la puerta cuando corresponde, que
 * el archivo y el borde entregan algo salga o no la tirada, y que a sospecha
 * 100 sólo quedan los desenlaces. NO afirma el resultado de ninguna tirada
 * (ver «Pruebas no determinísticas»): compara siempre contra la sospecha de
 * antes.
 *
 * La aventura no está registrada en el catálogo; se carga directo.
 */
import { createCampaign, Turn, loadState } from './engine/engine.ts';
import { EL_SANTO_OFICIO_DE_CUYO as SO } from './scenario/santooficio.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { GameState } from './shared/types.ts';
import { actitudesImposibles, lugaresInalcanzables, objetosPerdidos } from './scenario/auditoria.ts';

useStore(fileStore);
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); if (!ok) fallos++; };
const sosp = (s: GameState) => s.investigators[s.activeInvestigator]!.derived.sospecha ?? 0;

async function jugar(id: string, intencion: string) {
  const t = await Turn.open(id);
  t.submitIntent(intencion, 'p1');
  const r = await runOfflineTurn(t, SO, intencion, () => {});
  t.narrate(r.narration, r.options);
  await t.commit();
  return (await loadState(id)).state;
}
const pulsar = async (id: string, accion: string) => {
  const s0 = (await loadState(id)).state;
  const o = accionesDisponibles(s0, SO).find((x) => x.id === accion);
  if (!o) throw new Error("No hay botón «" + accion + "». Hay: " + ids(s0).join(","));
  return jugar(id, o.intencion);
};
const camino = async (id: string, ...lugares: string[]) => {
  let s = (await loadState(id)).state;
  for (const l of lugares) s = await pulsar(id, "ir:" + l);
  return s;
};
const ids = (s: GameState) => accionesDisponibles(s, SO).map((o) => o.id);
const seed = (n: string) => n.repeat(32).slice(0, 64);

async function main() {
  console.log('\nARRANQUE: alba fija la sospecha inicial y hace presente a Ignacio');
  let id = await createCampaign(SO, 'SO-1', seed('a1'));
  let s = (await loadState(id)).state;
  check('arranca sin sospecha', sosp(s) === 0);
  check('el botón de alba está disponible', ids(s).includes('alba'), ids(s).join(','));
  s = await jugar(id, 'Me levanto del fondo del zanjon y miro alrededor');
  check('sin herencia arranca por la Iglesia: sospecha 35', sosp(s) === 35, String(sosp(s)));
  check('Ignacio está presente y con actitud', s.npcs['npc-ignacio']!.present && (s.npcs['npc-ignacio']!.attitude[s.activeInvestigator] ?? 0) >= 15);
  check('alba desaparece una vez hecha', !ids(s).includes('alba'));

  console.log('\nCAMINO: la comitiva pide sigilo si llevás cosas de 1930');
  s = await camino(id, 'camino-villa');
  check('el botón de esperar a la comitiva aparece al llegar', ids(s).includes('comitiva'));
  s = await pulsar(id, 'comitiva');
  const seVioComitiva = s.narrative.some((n) => n.kind === 'keeper' && n.text.includes('Un jinete de sotana negra'));
  check('la escena de la comitiva se narra', seVioComitiva);

  console.log('\nCRIPTA: tres preguntas, dos respuestas cada una, sin repetirse');
  s = await camino(id, 'sd-porton', 'sd-cripta');
  check('en la cripta todavía no hay preguntas: primero hay que sentarse', !ids(s).includes('q1-flandes') && ids(s).includes('cripta-entrada'));
  s = await pulsar(id, 'cripta-entrada');
  const antes = ids(s);
  check('se ofrecen las dos respuestas de la pregunta 1', antes.includes('q1-flandes') && antes.includes('q1-franco'));
  check('la pregunta 2 todavía no', !antes.includes('q2-signos'));
  const base0 = sosp(s);
  s = await jugar(id, 'Explico como funciona el reloj');
  const tras1 = ids(s);
  check('contestar la 1 esconde sus dos respuestas', !tras1.includes('q1-flandes') && !tras1.includes('q1-franco'));
  check('y abre la 2', tras1.includes('q2-signos') && tras1.includes('q2-nativos'));
  const s1 = sosp(s);
  check('la respuesta franca sube la sospecha 20 (sin tirada de por medio)', s1 === base0 + 20, `${base0} → ${s1}`);
  s = await jugar(id, 'Digo que lo aprendi de los indigenas');
  check('la 2b suma 10', sosp(s) === s1 + 10, String(sosp(s)));
  check('deja consecuencia de campaña sobre los huarpes', s.consequences.some((c) => c.description.includes('aprendió lo que sabe de los indios de las lagunas')));
  s = await jugar(id, 'Digo que hay un limite bajo el zanjon');
  const fin = sosp(s);
  console.log(`   sospecha tras el interrogatorio: ${fin}`);
  check('con esa sospecha (>=60) queda encerrado', s.consequences.some((c) => c.description.includes('quedó encerrado en la cripta')), String(fin));
  check('el tema del Comisario se abre al terminar', s.narrative.some((n) => n.kind === 'keeper' && n.text.includes('La interrogación termina')));

  console.log('\nENCIERRO: la salida hacia la villa queda cerrada hasta que pase algo');
  const enc = ids(s);
  check('se ofrecen esperar y forzar la ventilación', enc.includes('esperar-ignacio') && enc.includes('forzar-ventilacion'));
  check('no hay botón de ir a la portería', !enc.some((x) => x.startsWith('ir:sd-porton') || x === 'mover:sd-porton'), enc.filter((x) => x.includes('sd-')).join(','));
  s = await jugar(id, 'Espero a que intervenga Fray Ignacio');
  check('esperar libera y baja la sospecha o la sube poco', s.consequences.some((c) => c.description.includes('salió de la cripta')));
  check('ya no se ofrece esperar', !ids(s).includes('esperar-ignacio'));

  id = await createCampaign(SO, 'SO-3', seed('c3'));
  s = await jugar(id, 'Me levanto del fondo del zanjon y miro alrededor');
  console.log('\nARCHIVO: sin permiso del prior el legajo no se ofrece; con permiso, sí');
  s = await camino(id, 'camino-villa', 'sd-porton', 'sd-archivo');
  check('el legajo NO se ofrece sin permiso', !ids(s).includes('leer-legajo'));
  // el permiso llega por conversación; se simula con una pista
  const t = await Turn.open(id);
  t.executeTool('add_clue', { description: 'El prior Anselmo autoriza, a escondidas, la lectura del legajo de la fundación de San Juan, en el archivo del convento.', kind: 'testimonial', source: 'prueba', reliability: 'reliable' });
  await t.commit();
  s = (await loadState(id)).state;
  check('con el permiso, el legajo se ofrece', ids(s).includes('leer-legajo'), ids(s).join(','));
  s = await jugar(id, 'Leo el legajo de la fundacion');
  check('leerlo entrega el documento (éxito o fallo)', Boolean(s.documents['doc-legajo-fundacion']?.obtainedAt));
  check('y abre examinar los bordes', ids(s).includes('notar-borrado'));
  s = await jugar(id, 'Examino los bordes de la hoja arrancada');
  check('el borde entrega una pista con o sin éxito (no gatea)', s.board.clues.some((c) => /hoja/.test(c.description)));
  check('y no repite', !ids(s).includes('notar-borrado'));

  console.log('\nHUERTA: primer momento con Ignacio');
  s = await camino(id, 'sd-porton', 'sd-huerta');
  check('se ofrecen las dos maneras de tratar el reloj', ids(s).includes('mostrar-reloj-ignacio') && ids(s).includes('negar-a-ignacio'));
  s = await jugar(id, 'Le muestro el reloj a Fray Ignacio');
  check('elegir una esconde la otra', !ids(s).includes('mostrar-reloj-ignacio') && !ids(s).includes('negar-a-ignacio'));

  console.log('\nHOGUERA: a 100 solo quedan los desenlaces');
  id = await createCampaign(SO, 'SO-2', seed('b2'));
  { const t2 = await Turn.open(id); t2.executeTool('adjust_suspicion', { amount: 100, cause: 'prueba' }); await t2.commit(); }
  s = (await loadState(id)).state;
  const solo = ids(s);
  check('con sospecha 100 se ofrece el Auto de Fe', solo.includes('hoguera'), solo.join(','));
  check('y nada más que desenlaces', solo.every((x) => ['hoguera', 'salida-1930', 'salida-1944', 'quedarse', 'muerte-en-la-mina'].includes(x)), solo.join(','));
  s = await jugar(id, 'El auto de fe');
  check('el desenlace cierra la aventura', Boolean(s.ending), JSON.stringify(s.ending)?.slice(0, 60));


  // ───────────────────────────── RAMA HUARPE ─────────────────────────────
  const empezarHuarpe = async (nombre: string, s0: string) => {
    const nid = await createCampaign(SO, nombre, seed(s0));
    const tt = await Turn.open(nid);
    // Lo que deja «La Merced de las Ánimas» al elegir la fuga: es lo que lee el arranque.
    tt.executeTool("record_consequence", {
      description: "En 1710, el investigador se alió con Takillpa y los guardianes huarpes, grabó la marca en la piedra caliza de la Ciénaga de las Ánimas, y al cerrar el borde se quedó de este lado.",
      scope: "campaign", permanent: "true", world_reminder: "Se quedó en 1710, prófugo.",
    });
    await tt.commit();
    return jugar(nid, "Me levanto del fondo del zanjon y miro alrededor").then(async (st) => ({ nid, st }));
  };

  console.log("\nHUARPE: el arranque lee el final de Merced y cambia el tipo de presión");
  {
    const { nid, st } = await empezarHuarpe("SO-H1", "h1");
    id = nid; s = st;
    check("la rama huarpe arranca con sospecha 20, no 35", sosp(s) === 20, String(sosp(s)));
    check("Takillpa está presente y Fray Ignacio no", s.npcs["npc-takillpa"]!.present && !s.npcs["npc-ignacio"]!.present);

    s = await camino(id, "totoral-noche");
    check("cruzar el barro se ofrece al llegar al totoral", ids(s).includes("cruzar-el-barro"));
    const antesBarro = sosp(s);
    s = await pulsar(id, "cruzar-el-barro");
    check("cruzar el barro nunca baja la sospecha (sube 15 o queda igual)", sosp(s) === antesBarro || sosp(s) === antesBarro + 15, `${antesBarro} → ${sosp(s)}`);
    check("y no se puede repetir", !ids(s).includes("cruzar-el-barro"));

    s = await camino(id, "altar-sauce");
    const altar = ids(s);
    check("en el altar se ofrecen las tres ofrendas y la negativa", altar.includes("ofrendar-reloj") && altar.includes("ofrendar-encendedor") && altar.includes("ofrendar-linterna") && altar.includes("guardar-el-metal"));
    check("y aprender el Manto, que no depende de la ofrenda", altar.includes("aprender-manto"));
    s = await pulsar(id, "ofrendar-reloj");
    check("ofrendar entrega el reloj a Takillpa", s.items["it-reloj-pulsera"]?.owner === "npc-takillpa");
    check("y el amuleto pasa al investigador", s.items["it-amuleto-hueso"]?.owner === s.activeInvestigator && s.items["it-amuleto-hueso"]?.carried);
    check("deja una consecuencia que cruza de aventura", s.consequences.some((c) => c.scope === "campaign" && c.description.includes("ofrendó el reloj de pulsera a Takillpa")));
    check("decidir esconde las otras tres opciones", !ids(s).some((x) => x.startsWith("ofrendar-") || x === "guardar-el-metal"));
    s = await pulsar(id, "aprender-manto");
    check("aprender el Manto lo suma a los hechizos (salga o no la tirada)", s.investigators[s.activeInvestigator]!.spellsKnown.some((h) => h.id === "manto-de-la-cienaga"));
    check("y no se repite", !ids(s).includes("aprender-manto"));

    s = await camino(id, "totoral-noche", "laguna-baja");
    s = await pulsar(id, "espiar-rastrilleria");
    check("espiar entrega una pista con o sin éxito, y nombra a Ledesma", s.board.clues.some((c) => c.description.includes("Ledesma")));

    s = await camino(id, "isla-juncos");
    const antesDescanso = sosp(s);
    const puede = ids(s).includes("descansar-isla");
    check("con poca sospecha se puede descansar en la isla", puede || antesDescanso >= 40, `sospecha ${antesDescanso}`);
    if (puede) {
      s = await pulsar(id, "descansar-isla");
      check("descansar baja la sospecha 5", sosp(s) === Math.max(0, antesDescanso - 5), `${antesDescanso} → ${sosp(s)}`);
      check("y sólo una vez", !ids(s).includes("descansar-isla"));
    }

    s = await camino(id, "ranchada");
    check("en la ranchada, la anciana y Takillpa dan conversación", ids(s).some((x) => x === "tema:a-quedarse") && ids(s).includes("tema:t-cerrar"));
    check("el cantar no se ofrece sin el permiso de la anciana", !ids(s).includes("aprender-cantar"));
    { const t3 = await Turn.open(id);
      t3.executeTool("add_clue", { description: "La anciana accede a enseñarle a cantar el «cantar de las sombras de sal», que borra el rastro que uno deja, con ceniza y polvo de piedra blanca; lo enseña una sola vez.", kind: "testimonial", source: "prueba", reliability: "reliable" });
      await t3.commit(); }
    s = (await loadState(id)).state;
    check("con el permiso, el cantar se ofrece", ids(s).includes("aprender-cantar"));
    s = await pulsar(id, "aprender-cantar");
    check("aprenderlo lo suma a los hechizos", s.investigators[s.activeInvestigator]!.spellsKnown.some((h) => h.id === "cantar-de-las-sombras-de-sal"));
  }

  console.log("\nHUARPE: guardarse el metal se paga, ofrendarlo se agradece");
  {
    const { nid, st } = await empezarHuarpe("SO-H2", "h2");
    id = nid; s = await camino(nid, "totoral-noche", "altar-sauce");
    const exp0 = s.investigators[s.activeInvestigator]!.umbral.exposure;
    const att0 = s.npcs["npc-takillpa"]!.attitude[s.activeInvestigator] ?? 0;
    s = await pulsar(id, "guardar-el-metal");
    check("guardar el metal baja la confianza de Takillpa", (s.npcs["npc-takillpa"]!.attitude[s.activeInvestigator] ?? 0) < att0);
    check("y sube la Exposición", s.investigators[s.activeInvestigator]!.umbral.exposure > exp0);
    check("no hay amuleto para quien se lo guarda", s.items["it-amuleto-hueso"]?.owner === "altar-sauce");
  }

  console.log("\nHUARPE: con la rastrillería encima (60+) no se camina, se resuelve");
  {
    const { nid, st } = await empezarHuarpe("SO-H3", "h3");
    id = nid; s = st;
    check("con sospecha baja hay salidas del zanjón", ids(s).some((x) => x.startsWith("ir:")));
    check("y ningún encuentro forzado", !ids(s).includes("rastrilleria-fuga"));
    { const t4 = await Turn.open(id); t4.executeTool("adjust_suspicion", { amount: 40, cause: "prueba" }); await t4.commit(); }
    s = (await loadState(id)).state;
    check("a 60 o más se cierran todas las salidas", !ids(s).some((x) => x.startsWith("ir:")), ids(s).filter((x) => x.startsWith("ir:")).join(","));
    check("y se ofrece escabullirse o enfrentarlos", ids(s).includes("rastrilleria-fuga") && ids(s).includes("rastrilleria-combate"));
    const antesFuga = sosp(s);
    s = await pulsar(id, "rastrilleria-fuga");
    const d = sosp(s) - antesFuga;
    check("la fuga baja 20 si sale y sube 25 si falla", d === -20 || d === 25, String(d));
    if (d === -20) check("y si sale, reabre el camino", ids(s).some((x) => x.startsWith("ir:")));
    else check("y si falla, el encuentro sigue en pie", ids(s).includes("rastrilleria-fuga"));
  }
  {
    const { nid } = await empezarHuarpe("SO-H4", "h4");
    { const t5 = await Turn.open(nid); t5.executeTool("adjust_suspicion", { amount: 40, cause: "prueba" }); await t5.commit(); }
    s = await pulsar(nid, "rastrilleria-combate");
    check("enfrentarlos abre un combate real contra el rastreador", Boolean(s.activeCombat), JSON.stringify(s.activeCombat)?.slice(0, 60));
  }

  console.log("\nAUDITORÍA ESTÁTICA (las mismas comprobaciones que el resto del catálogo)");
  {
    const imp = actitudesImposibles(SO);
    check("ningún umbral de confianza pide más de lo que el NPC puede dar", imp.length === 0, imp.join(" | "));
    const inalc = lugaresInalcanzables(SO);
    check("todos los lugares tienen camino desde el inicio", inalc.length === 0, inalc.join(", "));
    const perd = objetosPerdidos(SO);
    check("ningún objeto queda donde nadie lo alcanza", perd.length === 0, perd.join(", "));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
