/**
 * PRUEBA DE CRÍTICO Y PIFIA — `npm run prueba:critico`
 *
 * Antes, una escena o un tema sólo veían `tirada.exito`: un crítico (01) y un
 * éxito regular se veían exactamente igual, y una pifia (96-100, o sólo 100
 * con habilidad ≥50) se veía exactamente igual que un fracaso cualquiera. El
 * reglamento dice que ganan y pierden igual —eso ya lo aplicaba
 * `rules/dice.ts` antes de que la escena viera nada— pero deja a criterio del
 * Keeper qué pasa ADEMÁS. Sin un Keeper en vivo en modo motor, esa decisión
 * tiene que estar escrita de antemano, y esta prueba verifica que llegue.
 *
 * Fuerza el GRADO sin tocar el dado real: la tirada se ejecuta de verdad
 * —el registro verificable queda intacto, con su dado real— y sólo se le
 * hace creer a la escena que el grado fue otro, que es la única pieza que le
 * corresponde a la escena mirar.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { LA_LEGUA } from './scenario/legua.ts';
import { ejecutarEscena, leerIntencion, escenaPara } from './keeper/escenas.ts';
import { resolverTema } from './keeper/social.ts';
import { classify } from './keeper/intent.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { SuccessDegree } from './shared/types.ts';

const noop = () => {};

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

type Runner = (tool: string, args: Record<string, unknown>) =>
  { ok: boolean; message: string; emit?: { kind: string; data: unknown } };

/**
 * Ejecuta la tirada de verdad —queda en el registro, con su dado real— y le
 * hace creer a quien la lee que el grado fue el que se le pide. El resto de
 * las herramientas (add_clue, apply_umbral_exposure, change_npc_state, etc.)
 * pasan derecho, sin tocar.
 */
function forzando(turn: Turn, grado: SuccessDegree): Runner {
  const exitoso = grado !== 'failure' && grado !== 'fumble';
  return (tool, args) => {
    const r = turn.executeTool(tool, args);
    if (tool !== 'request_roll') return r;
    return {
      ...r,
      message: exitoso ? 'SUPERA la dificultad (forzado para prueba)' : 'NO SUPERA la dificultad (forzado para prueba)',
      emit: { kind: 'roll', data: { ...(r.emit?.data as object ?? {}), degree: grado } },
    };
  };
}

/**
 * Los pasos de PREPARACIÓN se juegan con el pipeline real —dados reales,
 * `runOfflineTurn` de punta a punta— igual que jugaría cualquiera. Sólo el
 * paso DECISIVO, el que la prueba quiere forzar, pasa por `forzando()`.
 */
async function jugar(scenario: typeof AGUA_QUIETA, id: string, acciones: string[]): Promise<void> {
  for (const accion of acciones) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(accion, 'jugador-local');
    const r = await runOfflineTurn(t, scenario, accion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
}

async function main() {
  // ── AGUA QUIETA: mirar el aljibe ─────────────────────────────────────────
  console.log('\nMIRAR EL ALJIBE: LA PIFIA Y EL CRÍTICO TIENEN PROSA PROPIA');
  for (const [grado, fragmento] of [
    ['fumble', 'segunda o tercera vez'] as const,
    ['critical', 'sin esfuerzo'] as const,
  ]) {
    const id = await createCampaign(AGUA_QUIETA, `MIRAR-${grado}`, 'm'.repeat(64));
    const t = await Turn.open(id);
    const i = leerIntencion(classify(t.state, 'Miro el agua fijamente'));
    const escena = escenaPara(AGUA_QUIETA.scenes, t.state, i)!;
    const out: string[] = [];
    ejecutarEscena(t, escena, i, out, forzando(t, grado));
    const texto = out.join('\n');
    check(`«${grado}» dice algo que un ${grado === 'fumble' ? 'fracaso' : 'éxito'} regular no dice`,
      texto.includes(fragmento), texto.slice(0, 90));
  }

  // ── AGUA QUIETA: sostener la mirada — el desenlace ───────────────────────
  console.log('\nSOSTENER LA MIRADA: EL DESENLACE Y LA ESTABILIDAD CAMBIAN CON EL GRADO');
  const estabilidadPorGrado: Partial<Record<SuccessDegree, number>> = {};
  for (const grado of ['fumble', 'failure', 'regular', 'critical'] as const) {
    const id = await createCampaign(AGUA_QUIETA, `SOSTENER-${grado}`, 's'.repeat(64));
    // `listoParaSostener` vive en `aguaquieta.acciones.ts` y pide exposición
    // ≥25: no alcanza con asomarse (rinde cada vez menos), hace falta tocar
    // el fenómeno por varios lados. Mismo guion que prueba-desenlaces.ts usa
    // para el mismo final, probado ahí.
    await jugar(AGUA_QUIETA, id, [
      'Me asomo al aljibe y miro el reflejo un rato largo',
      'Voy a la casa', 'Examino la fotografía enmarcada de 1897', 'Voy al cuarto',
      'Leo el cuaderno de Ignacio', 'Examino la fotografía dada vuelta', 'Voy al patio',
      'Me asomo al aljibe y miro el reflejo un rato largo',
      'Me asomo al aljibe y miro el reflejo un rato largo',
      'Me asomo al aljibe y miro el reflejo un rato largo',
      'Me asomo al aljibe y miro el reflejo un rato largo',
      'Me asomo al aljibe y miro el reflejo un rato largo',
      'Me asomo al aljibe y miro el reflejo un rato largo',
      'Escucho el aljibe con atención', 'Toco el agua del aljibe',
      'Grito el nombre de Ignacio hacia el aljibe',
      'Examino el brocal de cerca', 'Examino los álamos de cerca',
      'Cavo al lado del aljibe',
      'Voy a la orilla de la laguna mansa', 'Miro la laguna un rato largo',
      'Miro la laguna un rato largo', 'Miro la laguna un rato largo',
      'Voy al patio', 'Toco el agua del aljibe', 'Escucho el aljibe con atención',
    ]);

    const t = await Turn.open(id);
    const antes = t.state.investigators[t.state.activeInvestigator]!.umbral.stability;
    const i = leerIntencion(classify(t.state, 'Sostengo la mirada sobre el reflejo'));
    const escena = escenaPara(AGUA_QUIETA.scenes, t.state, i);
    if (!escena) { check(`la escena de sostener se encuentra (${grado})`, false); continue; }
    const out: string[] = [];
    ejecutarEscena(t, escena, i, out, forzando(t, grado));
    await t.commit();

    const final = await Turn.open(id);
    const despues = final.state.investigators[final.state.activeInvestigator]!.umbral.stability;
    estabilidadPorGrado[grado] = antes - despues;
    check(`llega al desenlace «mirar» (${grado})`, final.state.ending?.id === 'mirar');
  }
  check('la pifia cuesta más Estabilidad que el fracaso',
    estabilidadPorGrado.fumble! > estabilidadPorGrado.failure!,
    `pifia -${estabilidadPorGrado.fumble} vs fracaso -${estabilidadPorGrado.failure}`);
  check('el crítico cuesta menos Estabilidad que un éxito regular',
    estabilidadPorGrado.critical! < estabilidadPorGrado.regular!,
    `crítico -${estabilidadPorGrado.critical} vs regular -${estabilidadPorGrado.regular}`);

  // ── AGUA QUIETA: el secreto de Rosa ──────────────────────────────────────
  console.log('\nEL SECRETO DE ROSA: LA PIFIA NO ES UNA ESQUIVA CUALQUIERA');
  for (const [grado, esperaSecreto] of [['critical', true], ['fumble', false]] as const) {
    const id = await createCampaign(AGUA_QUIETA, `ROSA-${grado}`, 'r'.repeat(64));
    await jugar(AGUA_QUIETA, id, [
      'Voy a la casa', 'Le pregunto qué pasó esa noche', 'Le pregunto por el aljibe',
      'Le pregunto a Rosa por el hermano',
    ]);
    const t = await Turn.open(id);
    const npc = t.state.npcs['npc-rosa']!;
    const tema = AGUA_QUIETA.conversations.find((x) => x.id === 'ella')!;
    const out: string[] = [];
    const antesDeClues = t.state.board.clues.length;
    resolverTema(t, npc, tema, out, forzando(t, grado));
    await t.commit();
    const texto = out.join('\n');
    const secretoSalio = /dos luces|otra luz/.test(texto);
    check(`«${grado}»: ${esperaSecreto ? 'revela' : 'NO revela'} el secreto de Rosa`,
      secretoSalio === esperaSecreto, texto.slice(0, 90));

    const despues = (await Turn.open(id)).state.board.clues.length;
    if (grado === 'fumble') {
      // Una pifia no es «no pasó nada»: deja su propia pista, distinta de la
      // que hubiera dejado esquivar sin más. Ver `pifia` en aguaquieta.dialogo.ts.
      check('la pifia deja una pista propia (que Rosa mintió)', despues > antesDeClues,
        `${antesDeClues} → ${despues}`);
    }
  }

  // ── LA LEGUA PERDIDA: el secreto de Eusebio ──────────────────────────────
  // Llegar a actitud 25 jugando la ruta real depende de números que pueden
  // cambiar con el balance social; se sube la actitud con la MISMA
  // herramienta validada que usa el resolvedor —`change_npc_state`— en vez de
  // truchar el estado a mano. Es exactamente lo que pasaría si el jugador
  // insistiera lo suficiente en la mesa.
  console.log('\nEL SECRETO DE EUSEBIO: MISMO MECANISMO, OTRA AVENTURA');
  for (const [grado, esperaSecreto] of [['critical', true], ['fumble', false]] as const) {
    const id = await createCampaign(LA_LEGUA, `EUSEBIO-${grado}`, 'x'.repeat(64));
    await jugar(LA_LEGUA, id, ['Le pregunto a Eusebio por qué mide']);
    const t0 = await Turn.open(id);
    t0.executeTool('change_npc_state', {
      npc_id: 'npc-eusebio', status: 'unchanged', present: 'unchanged',
      attitude_delta: 30, patience_delta: 0, dodged_topic: '', cause: 'preparación de la prueba',
    });
    await t0.commit();

    const t = await Turn.open(id);
    const npc = t.state.npcs['npc-eusebio']!;
    const tema = LA_LEGUA.conversations.find((x) => x.id === 'e-tercera')!;
    const out: string[] = [];
    resolverTema(t, npc, tema, out, forzando(t, grado));
    await t.commit();
    const texto = out.join('\n');
    const secretoSalio = /nueve mil once|9\.011/.test(texto);
    check(`«${grado}»: ${esperaSecreto ? 'revela' : 'NO revela'} la cuarta medición de Eusebio`,
      secretoSalio === esperaSecreto, texto.slice(0, 90));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
