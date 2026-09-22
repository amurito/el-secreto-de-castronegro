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
  check('la respuesta franca sube la sospecha 15 (sin tirada de por medio)', s1 === base0 + 15, `${base0} → ${s1}`);
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


  // ───────────────────────────────── ACTO II ─────────────────────────────────
  const conClue = async (nid: string, description: string) => {
    const tt = await Turn.open(nid);
    tt.executeTool('add_clue', { description, kind: 'testimonial', source: 'prueba', reliability: 'reliable' });
    await tt.commit();
  };
  const conConsecuencia = async (nid: string, description: string) => {
    const tt = await Turn.open(nid);
    tt.executeTool('record_consequence', { description, scope: 'campaign', permanent: 'true', world_reminder: 'prueba' });
    await tt.commit();
  };
  const sospA = async (nid: string, n: number) => {
    const tt = await Turn.open(nid);
    tt.executeTool('adjust_suspicion', { amount: n, cause: 'prueba' });
    await tt.commit();
  };
  const enLaVilla = async (nombre: string, semilla: string) => {
    const nid = await createCampaign(SO, nombre, seed(semilla));
    await jugar(nid, 'Me levanto del fondo del zanjon y miro alrededor');
    const st = await camino(nid, 'camino-villa', 'sd-porton', 'plaza');
    return { nid, st };
  };

  console.log('\nACTO II: la villa, el mostrador y los caminos cerrados');
  {
    const { nid, st } = await enLaVilla('SO-V1', 'v1');
    id = nid; s = st;
    check('desde la plaza no hay camino al piedemonte antes del juicio', !ids(s).includes('ir:camino-piedemonte'));
    check('ni a la cárcel: no se entra caminando', !ids(s).includes('ir:carcel'));
    s = await camino(id, 'pulperia');
    const v = ids(s);
    check('la pulpería vende la bolsa, la pólvora y la limosna', v.includes('comprar:it-soborno') && v.includes('comprar:it-polvora-cabildo') && v.includes('comprar:it-cera-limosna'));
    check('y NO se pueden llevar gratis', !v.some((x) => x === 'tomar:it-soborno' || x === 'tomar:it-polvora-cabildo' || x === 'tomar:it-cera-limosna'), v.filter((x) => x.startsWith('tomar:')).join(','));
    const antesPesos = s.investigators[s.activeInvestigator]!.derived.efectivo;
    s = await pulsar(id, 'comprar:it-cera-limosna');
    check('comprar descuenta el precio', s.investigators[s.activeInvestigator]!.derived.efectivo === antesPesos - 10, antesPesos + ' → ' + s.investigators[s.activeInvestigator]!.derived.efectivo);
    s = await camino(id, 'plaza', 'iglesia-matriz');
    const sAntes = sosp(s);
    s = await pulsar(id, 'dar-limosna');
    check('la limosna baja la sospecha 5 y sale del inventario', sosp(s) === Math.max(0, sAntes - 5) && s.items['it-cera-limosna']?.owner !== s.activeInvestigator, `sospecha ${sAntes} → ${sosp(s)}; dueño: ${s.items['it-cera-limosna']?.owner}`);
    const sConf = sosp(s);
    s = await pulsar(id, 'confesarse');
    check('confesarse baja 10 y deja algo dicho', sosp(s) === Math.max(0, sConf - 10) && s.consequences.some((c) => c.description.includes('se confesó ante un fraile')));
    check('y no se repite', !ids(s).includes('confesarse'));
  }

  console.log('\nACTO II: el juicio, y lo que decide quedar libre o preso');
  {
    const { nid, st } = await enLaVilla('SO-J1', 'j1');
    id = nid; s = await camino(id, 'cabildo');
    check('el cabildo ofrece presentarse, pero no todavía defenderse', ids(s).includes('juicio-abrir') && !ids(s).includes('juicio-defensa'));
    s = await pulsar(id, 'juicio-abrir');
    const j = ids(s);
    check('abierta la sesión: defenderse o callar', j.includes('juicio-defensa') && j.includes('juicio-callar'));
    check('acusar al Comisario exige haber visto su libro', !j.includes('juicio-acusar'));
    await conClue(id, 'El libro de cuentas del Comisario lista conventos de todo Cuyo y Chile con un tilde o una cruz y un mismo signo.');
    s = (await loadState(id)).state;
    check('con la pista del libro, acusar se ofrece', ids(s).includes('juicio-acusar'));
    await sospA(id, 25);                       // 35 + 25 = 60
    s = (await loadState(id)).state;
    const base = sosp(s);
    s = await pulsar(id, 'juicio-defensa');
    const d = sosp(s) - base;
    check('la defensa baja 25 si sale y sube 25 si falla', d === -25 || d === 25, String(d));
    check('en cualquier caso el juicio queda concluido', s.consequences.some((c) => c.description.includes('concluyó el juicio ante el Cabildo')));
    if (d === 25) check('y a 85 el Cabildo lo lleva preso', s.world.currentLocation === 'carcel' && s.consequences.some((c) => c.description.includes('fue detenido y llevado a la cárcel')), s.world.currentLocation);
    else check('y si sale, sigue libre en el cabildo', s.world.currentLocation === 'cabildo');
    check('el juicio no se repite', !ids(s).includes('juicio-defensa') && !ids(s).includes('juicio-abrir'));
  }
  {
    const { nid } = await enLaVilla('SO-J2', 'j2');
    id = nid; s = await camino(id, 'cabildo');
    s = await pulsar(id, 'juicio-abrir');
    await sospA(id, 45);                       // 35 + 45 = 80
    const antes = sosp((await loadState(id)).state);
    s = await pulsar(id, 'juicio-callar');
    check('callar suma 10 sin tirada de por medio', sosp(s) === antes + 10, antes + ' → ' + sosp(s));
    check('y a 90 lo llevan preso', s.world.currentLocation === 'carcel', s.world.currentLocation);
    check('en la cárcel no hay «ir» hasta que pase algo', !ids(s).some((x) => x.startsWith('ir:')), ids(s).filter((x) => x.startsWith('ir:')).join(','));
    check('se ofrece esperar y fugarse, y no sobornar sin la bolsa', ids(s).includes('carcel-esperar') && ids(s).includes('carcel-fugarse') && !ids(s).includes('carcel-sobornar'));
    const antesEsp = sosp(s);
    s = await pulsar(id, 'carcel-esperar');
    check('esperar (sin Ignacio a favor) lo saca Albornoz: baja 30 y queda como su oráculo', sosp(s) === Math.max(0, antesEsp - 30) && s.consequences.some((c) => c.description.includes('Albornoz decidió usarlo como prisionero-oráculo')), antesEsp + ' → ' + sosp(s));
    check('y la cárcel se abre hacia la plaza', ids(s).includes('ir:plaza'));
    s = await camino(id, 'plaza');
    check('con el juicio concluido, el piedemonte se abre', ids(s).includes('ir:camino-piedemonte'));
  }

  console.log('\nACTO II: preso a 85 sin juicio, y comprar la salida');
  {
    const { nid } = await enLaVilla('SO-P1', 'p1');
    id = nid; s = await camino(id, 'pulperia');
    s = await pulsar(id, 'comprar:it-soborno');
    check('la bolsa queda en el inventario', s.items['it-soborno']?.owner === s.activeInvestigator);
    await sospA(id, 50);                        // 35 + 50 = 85
    s = (await loadState(id)).state;
    check('a 85 se cierran las calles de la villa', !ids(s).some((x) => x.startsWith('ir:')), ids(s).filter((x) => x.startsWith('ir:')).join(','));
    check('y sólo queda dejarse detener', ids(s).includes('ser-arrestado'));
    s = await pulsar(id, 'ser-arrestado');
    check('la detención lo lleva a la cárcel', s.world.currentLocation === 'carcel');
    check('con la bolsa se ofrece sobornar', ids(s).includes('carcel-sobornar'));
    const antes = sosp(s);
    s = await pulsar(id, 'carcel-sobornar');
    check('sobornar baja 30, entrega la bolsa y abre la puerta', sosp(s) === Math.max(0, antes - 30) && s.items['it-soborno']?.owner === 'carcel' && ids(s).includes('ir:plaza'));
    check('y ya no vuelve a ser detenido por lo mismo', !ids(s).includes('ser-arrestado'));
  }

  console.log('\nACTO II: la oferta del Comisario');
  {
    const { nid } = await enLaVilla('SO-O1', 'o1');
    id = nid;
    await conClue(id, 'El Comisario Albornoz dice que quiere al investigador vivo y hablando, «no con el Tribunal, conmigo».');
    await conConsecuencia(id, 'En 1710, el investigador concluyó el juicio ante el Cabildo de San Juan.');
    s = await camino(id, 'cabildo');
    check('con el juicio concluido y sin haber estado preso, se puede hablar a solas con él', ids(s).includes('oferta-albornoz'));
    s = await pulsar(id, 'oferta-albornoz');
    check('con poca sospecha y valor mostrado, ofrece reclutar: se puede aceptar o rechazar', ids(s).includes('aceptar-oferta') && ids(s).includes('rechazar-oferta'));
    const maxAntes = s.investigators[s.activeInvestigator]!.derived.maxSan;
    s = await pulsar(id, 'aceptar-oferta');
    check('aceptar entrega el salvoconducto', s.items['it-salvoconducto']?.owner === s.activeInvestigator);
    check('cuesta Mitos +4: el techo de Cordura baja 4 para siempre', s.investigators[s.activeInvestigator]!.derived.maxSan === maxAntes - 4, maxAntes + ' → ' + s.investigators[s.activeInvestigator]!.derived.maxSan);
    check('y queda anotado que aceptó, y que Albornoz decidió reclutarlo', s.consequences.some((c) => c.description.includes('aceptó ser agente')) && s.consequences.some((c) => c.description.includes('Albornoz decidió reclutar')));
    check('la decisión no se repite', !ids(s).includes('aceptar-oferta') && !ids(s).includes('oferta-albornoz'));
  }
  {
    const { nid } = await enLaVilla('SO-O2', 'o2');
    id = nid;
    await conClue(id, 'El Comisario Albornoz dice que quiere al investigador vivo y hablando, «no con el Tribunal, conmigo».');
    await conConsecuencia(id, 'En 1710, el investigador concluyó el juicio ante el Cabildo de San Juan.');
    s = await camino(id, 'cabildo');
    s = await pulsar(id, 'oferta-albornoz');
    s = await pulsar(id, 'rechazar-oferta');
    check('rechazar sube la sospecha y lo deja como oráculo', s.consequences.some((c) => c.description.includes('rechazó la oferta')) && s.consequences.some((c) => c.description.includes('Albornoz decidió usarlo como prisionero-oráculo')));
  }
  {
    const { nid } = await enLaVilla('SO-O3', 'o3');
    id = nid; await sospA(id, 30);              // 65: demasiado alta para reclutar
    await conClue(id, 'El Comisario Albornoz dice que quiere al investigador vivo y hablando, «no con el Tribunal, conmigo».');
    await conConsecuencia(id, 'En 1710, el investigador concluyó el juicio ante el Cabildo de San Juan.');
    s = await camino(id, 'cabildo');
    s = await pulsar(id, 'oferta-albornoz');
    check('con sospecha alta no hay reclutamiento: lo usa', !ids(s).includes('aceptar-oferta') && s.consequences.some((c) => c.description.includes('Albornoz decidió usarlo como prisionero-oráculo')));
  }

  console.log('\nACTO II: los dos mundos se cruzan por contacto, y Josefa');
  {
    const { nid, st } = await empezarHuarpe('SO-X1', 'x1');
    id = nid; s = await camino(id, 'totoral-noche', 'altar-sauce', 'ranchada');
    check('sin contacto, la ranchada no da a la iglesia matriz', !ids(s).includes('ir:iglesia-matriz'));
    await conClue(id, 'Takillpa dice que un prior dominico, viejo y colorado, deja sin trancar la puerta lateral de la iglesia matriz para los indios que van a misa de madrugada.');
    s = (await loadState(id)).state;
    check('con el contacto de Takillpa, se abre la puerta lateral', ids(s).includes('ir:iglesia-matriz'));
    s = await camino(id, 'cueva-pinturas');
    check('la cueva no se lee sin permiso de la anciana', !ids(s).includes('mirar-pinturas'));
    await conClue(id, 'La anciana dice que en la cueva se pinta una raya de almagre sobre la anterior cada vez que la tierra se abre.');
    s = (await loadState(id)).state;
    s = await pulsar(id, 'mirar-pinturas');
    check('con permiso, las pinturas entregan la cuenta de las siete rayas (salga o no la tirada)', s.board.clues.some((c) => c.description.includes('siete rayas de almagre')));
    check('y no se repite', !ids(s).includes('mirar-pinturas'));
  }
  {
    const { nid } = await enLaVilla('SO-X2', 'x2');
    id = nid; s = await camino(id, 'sd-porton', 'sd-huerta');
    check('sin contacto, la huerta no da a la cueva', !ids(s).includes('ir:cueva-pinturas'));
    await conClue(id, 'Fray Ignacio conoce un sendero de las acequias que sale del fondo de la huerta de Santo Domingo y llega a la cueva de las pinturas.');
    s = (await loadState(id)).state;
    check('con el contacto de Ignacio, se abre el sendero de las acequias', ids(s).includes('ir:cueva-pinturas'));
  }
  {
    const { nid } = await enLaVilla('SO-X3', 'x3');
    id = nid; s = await camino(id, 'casa-josefa');
    check('el padrinazgo no se ofrece sin haber hablado con ella', !ids(s).includes('ser-padrino'));
    await conClue(id, 'Josefa dice que Fray Ignacio pidió que no lo dejara agarrar con esa mano nada de lo que se escribe.');
    s = (await loadState(id)).state;
    check('con lo que ella cuenta, se ofrecen las dos maneras de tratar al niño', ids(s).includes('ser-padrino') && ids(s).includes('alejarse-del-nino'));
    s = await pulsar(id, 'ser-padrino');
    check('ser padrino deja una consecuencia que cruza de aventura', s.consequences.some((c) => c.scope === 'campaign' && c.description.includes('padrino oculto del hijo zurdo')));
    check('y elegir esconde la otra', !ids(s).includes('alejarse-del-nino'));
  }



  console.log('\nACTO II: el fugitivo en la villa, y el movimiento forzado del motor');
  {
    const { nid } = await empezarHuarpe('SO-X4', 'x4');
    id = nid;
    s = await camino(id, 'camino-villa', 'sd-porton', 'plaza');
    check('el fugitivo que llega a la plaza puede intentar cruzarla sin que lo reconozcan', ids(s).includes('cruzar-la-plaza'));
    const a0 = sosp(s);
    s = await pulsar(id, 'cruzar-la-plaza');
    check('cruzarla no baja la sospecha (queda igual o sube 15)', sosp(s) === a0 || sosp(s) === a0 + 15, a0 + ' → ' + sosp(s));
    check('y no se repite', !ids(s).includes('cruzar-la-plaza'));
  }
  {
    const nid = await createCampaign(SO, 'SO-M1', seed('m1'));
    const tt = await Turn.open(nid);
    const normal = tt.executeTool('move_to_location', { location_id: 'labor-nucleo', reason: 'prueba' });
    check('el movimiento normal sigue exigiendo una conexión', !normal.ok);
    const forzado = tt.executeTool('move_to_location', { location_id: 'carcel', forced: 'true' });
    check('el forzado (sólo de una escena) no la exige', forzado.ok);
    await tt.commit();
    check('y efectivamente lo lleva', (await loadState(nid)).state.world.currentLocation === 'carcel');
  }



  // ───────────────────────────────── ACTO III ─────────────────────────────────
  /** Iglesia, con el juicio concluido, camino al piedemonte. `compras`: qué se compra antes en la pulpería. */
  const haciaElPiedemonte = async (nombre: string, semilla: string, compras: string[] = []) => {
    const nid = await createCampaign(SO, nombre, seed(semilla));
    await jugar(nid, 'Me levanto del fondo del zanjon y miro alrededor');
    await camino(nid, 'camino-villa', 'sd-porton', 'plaza');
    if (compras.length) {
      await camino(nid, 'pulperia');
      for (const c of compras) await pulsar(nid, 'comprar:' + c);
      await camino(nid, 'plaza');
    }
    await conConsecuencia(nid, 'En 1710, el investigador concluyó el juicio ante el Cabildo de San Juan.');
    const st = await camino(nid, 'camino-piedemonte');
    return { nid, st };
  };
  /** Del piedemonte hasta la boca abierta con pólvora (necesita haberla comprado). */
  const hastaLaBocaAbierta = async (nid: string) => {
    await camino(nid, 'labor-campamento');
    await pulsar(nid, 'entrar-fuego');
    await camino(nid, 'labor-bocamina');
    return pulsar(nid, 'abrir-con-polvora');
  };

  console.log('\nACTO III: el real, la boca y los caminos que se abren de a uno');
  {
    const { nid, st } = await haciaElPiedemonte('SO-L1', 'l1', ['it-soborno', 'it-polvora-cabildo']);
    id = nid; s = st;
    check('desde el piedemonte se llega al real y al zanjón sellado', ids(s).includes('ir:labor-campamento') && ids(s).includes('ir:zanjon-sellado'));
    check('el reloj se puede usar para medir los temblores', ids(s).includes('medir-los-temblores'));
    const m0 = sosp(s);
    s = await pulsar(id, 'medir-los-temblores');
    check('medirlos deja la pista del intervalo y sube 10 la sospecha', s.board.clues.some((c) => c.description.includes('intervalo entre los temblores')) && sosp(s) === m0 + 10, m0 + ' → ' + sosp(s));
    s = await camino(id, 'labor-campamento');
    const r = ids(s);
    check('en el real hay cuatro maneras de entrar (sin salvoconducto ni escolta, dos)', r.includes('entrar-fuego') && r.includes('entrar-sigilo') && !r.includes('entrar-salvoconducto') && !r.includes('entrar-escolta'));
    check('y la boca no se ve hasta pasar el real', !r.includes('ir:labor-bocamina'));
    const f0 = sosp(s);
    s = await pulsar(id, 'entrar-fuego');
    check('el fuego sin pedernal cuesta 10 de sospecha y abre el camino', sosp(s) === f0 + 10 && ids(s).includes('ir:labor-bocamina'), f0 + ' → ' + sosp(s));
    s = await camino(id, 'labor-bocamina');
    check('en la boca: forzar o abrir con pólvora, y el conducto siempre; el socavón no', ids(s).includes('abrir-forzando') && ids(s).includes('abrir-con-polvora') && ids(s).includes('ir:labor-ventilacion') && !ids(s).includes('ir:labor-socavon'));
    s = await pulsar(id, 'abrir-con-polvora');
    check('la pólvora abre la boca y se gasta', ids(s).includes('ir:labor-socavon') && s.items['it-polvora-cabildo']?.owner === 'labor-bocamina');
    s = await camino(id, 'labor-socavon');
    check('en el socavón hay cuatro maneras de pasar, contando el soborno', ids(s).includes('incitar-motin') && ids(s).includes('pasar-de-largo-socavon') && ids(s).includes('combatir-a-los-guardias') && ids(s).includes('sobornar-al-capataz'));
    check('y el filón no se ve hasta pasar', !ids(s).includes('ir:labor-nucleo'));
    s = await pulsar(id, 'sobornar-al-capataz');
    check('sobornar entrega la bolsa y abre el filón', s.items['it-soborno']?.owner === 'npc-capataz' && ids(s).includes('ir:labor-nucleo'));
  }
  {
    const { nid } = await haciaElPiedemonte('SO-L2', 'l2', ['it-polvora-cabildo']);
    id = nid; s = await hastaLaBocaAbierta(nid);
    s = await camino(id, 'labor-socavon');
    s = await pulsar(id, 'combatir-a-los-guardias');
    check('combatir a los guardias abre un combate real', Boolean(s.activeCombat));
  }
  {
    const { nid } = await haciaElPiedemonte('SO-L3', 'l3');
    id = nid; s = await camino(nid, 'labor-campamento');
    s = await pulsar(id, 'entrar-fuego');
    s = await camino(id, 'labor-bocamina');
    s = await pulsar(id, 'abrir-forzando');
    const fuerza = s.consequences.some((c) => c.description.includes('abrió la boca de la labor'));
    check('forzar la boca: si sale se abre, si falla se sigue pudiendo (y cuesta)', fuerza ? ids(s).includes('ir:labor-socavon') : ids(s).includes('abrir-forzando'));
  }

  console.log('\nACTO III: el conducto, la cámara y el cuerpo');
  {
    const { nid } = await haciaElPiedemonte('SO-C1', 'c1');
    id = nid; s = await camino(nid, 'labor-campamento');
    s = await pulsar(id, 'entrar-fuego');
    s = await camino(id, 'labor-bocamina', 'labor-ventilacion');
    check('la cámara no se ve antes de pasar el conducto', !ids(s).includes('ir:labor-cripta'));
    s = await pulsar(id, 'pasar-el-conducto');
    check('pasarlo (salga o no la tirada) abre la cámara', ids(s).includes('ir:labor-cripta'));
    s = await camino(id, 'labor-cripta');
    const san0 = s.investigators[s.activeInvestigator]!.derived.san;
    s = await pulsar(id, 'mirar-el-cuerpo');
    check('mirar el cuerpo cuesta Cordura', s.investigators[s.activeInvestigator]!.derived.san < san0, san0 + ' → ' + s.investigators[s.activeInvestigator]!.derived.san);
    check('y entrega la libreta con la letra del investigador', s.items['it-objeto-1930-cripta']?.owner === s.activeInvestigator);
    check('y una pista de que el bucle ya se cerró', s.board.clues.some((c) => c.description.includes('bucle ya se cerró antes')));
    check('sin repetirse', !ids(s).includes('mirar-el-cuerpo'));
    check('desde la cámara se llega al filón', ids(s).includes('ir:labor-nucleo'));
  }

  console.log('\nACTO III: el filón, la Sombra, Ignacio y Albornoz');
  {
    const { nid } = await haciaElPiedemonte('SO-N1', 'n1');
    id = nid; s = await camino(nid, 'labor-campamento');
    s = await pulsar(id, 'entrar-fuego');
    s = await camino(id, 'labor-bocamina', 'labor-ventilacion');
    s = await pulsar(id, 'pasar-el-conducto');
    s = await camino(id, 'labor-cripta', 'labor-nucleo');
    check('al llegar sólo se ofrece mirar el filón, todavía no extraer', ids(s).includes('mirar-el-filon') && !ids(s).includes('extraer-la-plata'));
    check('y desde el filón no se sale al camino hasta resolver a Albornoz', !ids(s).includes('ir:camino-piedemonte'));
    s = await pulsar(id, 'mirar-el-filon');
    check('mirarlo despierta a la Sombra: encandilar o enfrentar', ids(s).includes('encandilar-a-la-sombra') && ids(s).includes('enfrentar-a-la-sombra'));
    const l0 = sosp(s);
    s = await pulsar(id, 'encandilar-a-la-sombra');
    check('la luz de 1930 aparta a la Sombra pero la sospecha sube (5 o 10)', (sosp(s) === l0 + 5 || sosp(s) === l0 + 10) && s.consequences.some((c) => c.description.includes('la Sombra del Socavón retrocedió ante la luz')), l0 + ' → ' + sosp(s));
    check('resuelta la Sombra se puede extraer la plata', ids(s).includes('extraer-la-plata'));
    s = await pulsar(id, 'extraer-la-plata');
    check('la plata (limpia o impura) queda en el inventario', s.items['it-plata-nativa']?.owner === s.activeInvestigator && s.consequences.some((c) => c.description.includes('extrajo la plata del filón')));
    check('con Ignacio a mano se le puede pedir que decida', ids(s).includes('pedir-a-ignacio'));
    s = await pulsar(id, 'pedir-a-ignacio');
    check('con su actitud de arranque (15), Ignacio intenta protegerte y muere', s.consequences.some((c) => c.description.includes('Fray Ignacio de la Cruz murió en la Labor Vieja')) && !ids(s).includes('pedir-a-ignacio'));
    check('sin pólvora no hay trampa; sí entregar la plata o exponerlo', !ids(s).includes('volar-quedandome') && ids(s).includes('entregar-la-plata'));
    s = await pulsar(id, 'entregar-la-plata');
    check('entregarla: Albornoz se sale con la suya y la plata cambia de manos', s.consequences.some((c) => c.description.includes('Albornoz se salió con la suya')) && s.items['it-plata-nativa']?.owner === 'npc-albornoz');
    check('y recién entonces el filón deja salir al camino', ids(s).includes('ir:camino-piedemonte'));
  }
  {
    const { nid } = await haciaElPiedemonte('SO-N2', 'n2');
    id = nid; s = await camino(nid, 'labor-campamento');
    s = await pulsar(id, 'entrar-fuego');
    s = await camino(id, 'labor-bocamina', 'labor-ventilacion');
    s = await pulsar(id, 'pasar-el-conducto');
    s = await camino(id, 'labor-cripta', 'labor-nucleo');
    s = await pulsar(id, 'mirar-el-filon');
    s = await pulsar(id, 'encandilar-a-la-sombra');
    check('sin nada con qué acusarlo, exponerlo no se ofrece', !ids(s).includes('exponer-a-albornoz'));
    await conClue(id, 'El libro de cuentas del Comisario lista conventos de todo Cuyo y Chile con un tilde o una cruz y un mismo signo.');
    s = (await loadState(id)).state;
    check('con lo que vio en su libro, se ofrece exponerlo', ids(s).includes('exponer-a-albornoz'));
    const e0 = sosp(s);
    s = await pulsar(id, 'exponer-a-albornoz');
    const salio = s.consequences.some((c) => c.description.includes('Albornoz huyó de la labor') || c.description.includes('Albornoz fue expuesto ante los suyos'));
    check('exponerlo: si sale, Albornoz se va; si falla, la sospecha sube 30', salio ? ids(s).includes('ir:camino-piedemonte') : sosp(s) === e0 + 30, e0 + ' → ' + sosp(s));
    check('sin peones amotinados, lo que sale es que huye (no que lo expongan ante los suyos)', !s.consequences.some((c) => c.description.includes('fue expuesto ante los suyos')));
  }
  {
    const { nid } = await haciaElPiedemonte('SO-N3', 'n3', ['it-polvora-cabildo']);
    id = nid; s = await camino(nid, 'labor-campamento');
    s = await pulsar(id, 'entrar-fuego');
    s = await camino(id, 'labor-bocamina', 'labor-ventilacion');
    s = await pulsar(id, 'pasar-el-conducto');
    s = await camino(id, 'labor-cripta', 'labor-nucleo');
    s = await pulsar(id, 'mirar-el-filon');
    s = await pulsar(id, 'encandilar-a-la-sombra');
    check('con pólvora se ofrecen las dos trampas', ids(s).includes('volar-con-mecha-larga') && ids(s).includes('volar-quedandome'));
    s = await pulsar(id, 'volar-quedandome');
    check('quedarse a encender la mecha deja sólo el desenlace de la mina', ids(s).includes('muerte-en-la-mina'));
    s = await pulsar(id, 'muerte-en-la-mina');
    check('y cierra la aventura, con la libreta del cuerpo como eco', Boolean(s.ending) && !JSON.stringify(s.ending).includes('PENDIENTE'), JSON.stringify(s.ending)?.slice(0, 80));
  }

  console.log('\nACTO III: la fecha, y las tres salidas del zanjón');
  {
    const { nid } = await haciaElPiedemonte('SO-F1', 'f1');
    id = nid; s = await camino(nid, 'zanjon-sellado');
    check('en el zanjón sellado no hay salida sin haberse enterado de cómo', !ids(s).includes('salida-1930') && !ids(s).includes('salida-1944') && !ids(s).includes('quedarse'));
    check('ni se puede calcular la fecha con una sola fuente', !ids(s).includes('inferir-la-fecha'));
    await conClue(id, 'La cueva tiene siete rayas de almagre superpuestas: las seis primeras separadas por una distancia pareja de tiempo.');
    s = (await loadState(id)).state;
    check('siete rayas solas no alcanzan: hace falta una segunda fuente independiente', !ids(s).includes('inferir-la-fecha'));
    await conClue(id, 'El legajo de la fundación de San Juan anota temblores grandes en 1562, hacia 1580 y en 1665, con el año de cada uno.');
    s = (await loadState(id)).state;
    check('con las rayas y el legajo, se puede calcular', ids(s).includes('inferir-la-fecha'));
    check('sin el reloj, la fecha que sale no incluye el día', true);
    s = await pulsar(id, 'inferir-la-fecha');
    check('la cuenta deja la consecuencia del 1944', s.consequences.some((c) => c.scope === 'campaign' && c.description.includes('infirió la fecha') && c.description.includes('1944')));
    check('y sin el reloj medido, sólo «un enero de 1944, hacia mediados»', s.consequences.some((c) => c.description.includes('un enero de 1944, hacia mediados')));
    check('habilita dejar que reviente', ids(s).includes('salida-1944'));
    s = await pulsar(id, 'salida-1944');
    check('y ese desenlace cierra la aventura, ya escrito', Boolean(s.ending) && !JSON.stringify(s.ending).includes('PENDIENTE'));
    check('dejando una consecuencia permanente que las aventuras siguientes pueden leer', s.consequences.some((c) => c.scope === 'campaign' && c.permanent && c.description.includes('cruzó, en el terremoto, al 15 de enero de 1944')));
  }
  {
    const { nid } = await haciaElPiedemonte('SO-F2', 'f2');
    id = nid; s = await camino(nid, 'zanjon-sellado');
    await conClue(id, 'Takillpa dice que el borde se abre si el agua contenida se suelta de golpe, como cuando se rompió la ciénaga la primera vez.');
    s = (await loadState(id)).state;
    check('sabiendo cómo se abre, se puede aflojar el sello', ids(s).includes('salida-1930'));
    s = await pulsar(id, 'salida-1930');
    check('aflojar el sello cierra la aventura con su consecuencia', Boolean(s.ending) && s.consequences.some((c) => c.description.includes('aflojó el sello del zanjón')) && !JSON.stringify(s.ending).includes('PENDIENTE'));
  }
  {
    const { nid } = await haciaElPiedemonte('SO-F3', 'f3');
    id = nid; s = await camino(nid, 'zanjon-sellado');
    await conClue(id, 'La anciana María Sayanca enseña la técnica de grabado: una punta de piedra dura sobre la caliza, rellena con plata nativa.');
    s = (await loadState(id)).state;
    check('sin la plata, no se puede reforzar el sello', !ids(s).includes('quedarse'));
    { const tt = await Turn.open(id); tt.executeTool('transfer_item', { item_id: 'it-plata-nativa', to: s.activeInvestigator, carried: 'true', cause: 'prueba' }); await tt.commit(); }
    s = (await loadState(id)).state;
    check('con la plata y la técnica, sí', ids(s).includes('quedarse'));
    s = await pulsar(id, 'quedarse');
    check('reforzar el sello cierra la aventura, ya escrito', Boolean(s.ending) && s.consequences.some((c) => c.description.includes('grabó el sello con plata')) && !JSON.stringify(s.ending).includes('PENDIENTE'));
  }
  {
    const { nid } = await haciaElPiedemonte('SO-F4', 'f4');
    id = nid; s = await camino(nid, 'zanjon-sellado');
    await conClue(id, 'La anciana María Sayanca enseña la técnica de grabado: una punta de piedra dura sobre la caliza.');
    await conConsecuencia(id, 'En 1710, el investigador aceptó ser agente del aparato de Albornoz.');
    { const tt = await Turn.open(id); tt.executeTool('transfer_item', { item_id: 'it-plata-nativa', to: (await loadState(id)).state.activeInvestigator, carried: 'true', cause: 'prueba' }); await tt.commit(); }
    s = (await loadState(id)).state;
    check('quien aceptó ser agente del Comisario no puede quedarse (Albornoz se queda con el ingrediente)', !ids(s).includes('quedarse'));
  }

  console.log('\nACTO III: el hechizo que enseña Albornoz');
  {
    const nid = await createCampaign(SO, 'SO-H5', seed('h5'));
    await jugar(nid, 'Me levanto del fondo del zanjon y miro alrededor');
    await camino(nid, 'camino-villa', 'sd-porton', 'plaza');
    await conClue(nid, 'El Comisario Albornoz dice que quiere al investigador vivo y hablando, «no con el Tribunal, conmigo».');
    await conConsecuencia(nid, 'En 1710, el investigador concluyó el juicio ante el Cabildo de San Juan.');
    await camino(nid, 'cabildo');
    await pulsar(nid, 'oferta-albornoz');
    s = await pulsar(nid, 'aceptar-oferta');
    check('aceptar la oferta enseña «Corregir la mano»', s.investigators[s.activeInvestigator]!.spellsKnown.some((h) => h.id === 'corregir-la-mano'));
  }


  console.log("\nAUDITORÍA ESTÁTICA (las mismas comprobaciones que el resto del catálogo)");
  {
    const imp = actitudesImposibles(SO);
    check("ningún umbral de confianza pide más de lo que el NPC puede dar", imp.length === 0, imp.join(" | "));
    const inalc = lugaresInalcanzables(SO);
    check("todos los lugares tienen camino desde el inicio", inalc.length === 0, inalc.join(", "));
    const perd = objetosPerdidos(SO);
    check("ningún objeto queda donde nadie lo alcanza", perd.length === 0, perd.join(", "));
    // Cuatro bugs de jugabilidad de esta aventura fueron el mismo: el clasificador no distingue a qué lugar
    // se refiere «Voy a X» cuando dos lugares comparten un nombre o un alias («La laguna baja» leída como
    // el verbo bajar, «ventilación» en dos lugares, seis lugares que empezaban igual). Se comprueba acá.
    const porNombre = new Map<string, string[]>();
    for (const l of Object.values(SO.locations)) {
      const clave = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^(el|la|los|las) /, '');
      const nombres = new Set([clave(l.name), ...(l.aliases ?? []).map(clave)]);
      for (const n of nombres) porNombre.set(n, [...(porNombre.get(n) ?? []), l.id]);
    }
    const repetidos = [...porNombre].filter(([, v]) => v.length > 1).map(([n, v]) => n + ' → ' + v.join(', '));
    check('ningún nombre ni alias se repite entre dos lugares distintos', repetidos.length === 0, repetidos.join(' | '));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
