/**
 * RESOLVEDOR SOCIAL — genérico.
 *
 * No conoce a Rosa. No conoce Agua Quieta. Sabe resolver un `TemaConversacion`
 * contra un estado, y eso vale para cualquier NPC de cualquier aventura.
 *
 * El orden de las comprobaciones es el diseño:
 *
 *   1. ¿Tiene paciencia? Si no, no hay conversación. Ni tirada, ni tema.
 *   2. ¿Llega la actitud al piso del tema? Si no, cierra —sin tirada.
 *   3. ¿El tema opone resistencia? Si no, contesta.
 *   4. Tirada. La actitud modifica; insistir sobre algo esquivado penaliza.
 *
 * Que el gasto de paciencia ocurra ANTES de la tirada es deliberado: preguntar
 * cuesta, salga o no salga. Si sólo costara fallar, reintentar sería gratis
 * mientras hubiera suerte, que es justo lo que hay que evitar.
 */

import type { Turn } from '../engine/engine.ts';
import type { GameState, Npc } from '../shared/types.ts';
import type { TemaConversacion, EfectoTema } from '../scenario/conversacion.ts';
import { pickVariant } from './narrator.ts';
import { ACTITUD, COSTO, REINTENTO, ACTITUD_POR_AGOTAR } from '../rules/social.config.ts';
import { gradoDeLaTirada, huboExito } from './grado.ts';

type Runner = (tool: string, args: Record<string, unknown>) =>
  { ok: boolean; message: string; emit?: { kind: string; data: unknown } };

export const actitudDe = (s: GameState, npc: Npc) => npc.attitude[s.activeInvestigator] ?? 0;

/** ¿Se le puede preguntar algo a este NPC ahora mismo? */
export function puedeHablar(npc: Npc): boolean {
  return npc.patience > 0;
}

/**
 * Los temas que tiene sentido ofrecer ahora. Un tema se ofrece si existe, no
 * se agotó, y el NPC todavía aguanta que le pregunten.
 */
export function temasDisponibles(s: GameState, npc: Npc, temas: TemaConversacion[]): TemaConversacion[] {
  if (!puedeHablar(npc)) return [];
  return temas.filter((t) => {
    if (t.npc !== npc.id) return false;
    if (t.disponible && !t.disponible(s)) return false;
    if (t.agotado?.(s)) return false;
    return true;
  });
}

/** Aplica lo que deja un tema: prosa, actitud, pista, pregunta, secreto. */
function aplicar(
  turn: Turn, npc: Npc, efecto: EfectoTema, out: string[], run: Runner,
  causa: string, temaId: string,
): void {
  out.push(pickVariant(turn.state, efecto.texto));

  if (efecto.actitud) {
    run('change_npc_state', {
      npc_id: npc.id, status: 'unchanged', present: 'unchanged',
      attitude_delta: efecto.actitud, patience_delta: 0, dodged_topic: '', cause: causa,
    });
  }
  if (efecto.pista) {
    const yaEsta = turn.state.board.clues.some((c) => c.description === efecto.pista!.description);
    if (!yaEsta) {
      run('add_clue', {
        description: efecto.pista.description,
        kind: efecto.pista.kind,
        source: npc.name,
        reliability: efecto.pista.reliability,
      });
    }
  }
  if (efecto.pregunta) run('raise_question', { question: efecto.pregunta });
  if (efecto.exposicion) {
    run('apply_umbral_exposure', {
      amount: efecto.exposicion, cause: `lo que dijo ${npc.name}`,
      // Por NPC y por tema: dos revelaciones distintas de la misma persona son
      // dos contactos distintos, y volver sobre la misma no vuelve a tocar.
      source: `testimonio:${npc.id}:${temaId}`,
    });
  }
  if (efecto.revelaSecreto) {
    // OJO: no se imprime `secret.content`. Ese texto está escrito para el
    // Keeper —incluye las condiciones para revelarlo— y volcarlo en pantalla
    // le mostraría al jugador las tripas del guion. La prosa que ve el jugador
    // es `texto`; acá sólo se registra que el secreto salió a la luz.
    const secreto = npc.secrets.find((x) => x.id === efecto.revelaSecreto);
    // Si el escenario nombra un secreto que no existe es un error del
    // escenario y tiene que verse. Callarlo deja un hueco silencioso, que es
    // exactamente la familia de bug que ya nos costó dos finales.
    if (!secreto) {
      out.push(`[ERROR DE ESCENARIO: ${npc.name} no tiene el secreto «${efecto.revelaSecreto}».]`);
    } else {
      run('record_consequence', {
        description: `${npc.name} reveló uno de sus secretos.`,
        scope: 'campaign', permanent: 'false',
        world_reminder: `${npc.name} ya contó esto. Habla con más franqueza a partir de ahora, y está más asustada.`,
      });
    }
  }
}

const gastar = (run: Runner, npc: Npc, costo: number, causa: string, esquivado = '') =>
  run('change_npc_state', {
    npc_id: npc.id, status: 'unchanged', present: 'unchanged',
    attitude_delta: 0, patience_delta: -costo, dodged_topic: esquivado, cause: causa,
  });

/**
 * Resuelve un tema. Devuelve la prosa por `out`; el estado lo cambia por
 * herramientas validadas, igual que todo lo demás.
 */
export function resolverTema(
  turn: Turn, npc: Npc, tema: TemaConversacion, out: string[], run: Runner,
): void {
  const s = turn.state;
  const actitud = actitudDe(s, npc);

  // ── 1. Paciencia ─────────────────────────────────────────────────────────
  if (!puedeHablar(npc)) {
    out.push(agotado(s, npc));
    return;
  }

  // ── 2. Piso de actitud: hay preguntas que a un desconocido no se le hacen ─
  const piso = tema.prueba?.actitudMinima ?? -100;
  if (actitud < piso) {
    gastar(run, npc, COSTO.cerrado, `preguntar por «${tema.id}» antes de tiempo`);
    if (tema.cerrado) aplicar(turn, npc, tema.cerrado, out, run, `tema cerrado: ${tema.id}`, tema.id);
    else out.push(`—De eso no hablo —dice ${npc.name.split(' ')[0]}, y no agrega nada más.`);
    avisarSiSeAgota(turn, npc, out, run);
    return;
  }

  // ── 3. Sin resistencia: contesta y listo ─────────────────────────────────
  if (!tema.prueba) {
    gastar(run, npc, COSTO.tema, `conversación: ${tema.id}`);
    aplicar(turn, npc, tema.cede, out, run, `tema: ${tema.id}`, tema.id);
    avisarSiSeAgota(turn, npc, out, run);
    return;
  }

  // ── 4. Tirada ────────────────────────────────────────────────────────────
  const insiste = npc.dodgedTopics.includes(tema.id);
  // Insistir penaliza, salvo que hayas ganado confianza desde la esquivada.
  // Es "no se repite una tirada sin circunstancia nueva", con la confianza
  // como circunstancia.
  const limpio = actitud >= piso + REINTENTO.actitudQueLimpia;
  const penaliza = (insiste && !limpio ? REINTENTO.penalizacionDados : 0)
    + (actitud < ACTITUD.penalizaBajo ? 1 : 0);
  const bonifica = actitud >= ACTITUD.bonificaDesde ? 1 : 0;

  gastar(run, npc, insiste ? COSTO.insistir : COSTO.tema, `preguntar por «${tema.id}»`);

  const razones: string[] = [];
  if (insiste && !limpio) razones.push('ya esquivó esta pregunta una vez');
  if (actitud < ACTITUD.penalizaBajo) razones.push('no confía en usted');
  if (bonifica) razones.push('a esta altura confía en usted');

  const tirada = run('request_roll', {
    skill: tema.prueba.skill,
    difficulty: tema.prueba.difficulty,
    reason: tema.prueba.razon,
    stakes_success: 'contesta de verdad',
    stakes_failure: 'contesta cualquier otra cosa',
    bonus_dice: bonifica,
    penalty_dice: penaliza,
    modifier_reason: razones.join(' y '),
  });

  const grado = gradoDeLaTirada(tirada);
  if (huboExito(tirada)) {
    // Un crítico (01) cede igual que cualquier éxito, pero si el tema declaró
    // algo especial para ese caso, gana. No es distinto EN LA REGLA —un
    // crítico siempre supera cualquier dificultad, como cualquier éxito— es
    // distinto en lo que cuenta el NPC.
    const efecto = grado === 'critical' && tema.critico ? tema.critico : tema.cede;
    aplicar(turn, npc, efecto, out, run, `cedió en: ${tema.id}`, tema.id);
  } else {
    run('change_npc_state', {
      npc_id: npc.id, status: 'unchanged', present: 'unchanged',
      attitude_delta: 0, patience_delta: 0, dodged_topic: tema.id,
      cause: `esquivó la pregunta sobre ${tema.id}`,
    });
    // Una pifia (96-100, o sólo 100 con habilidad ≥50) también pierde la
    // pregunta, pero puede costar más que una esquiva cualquiera: es la
    // diferencia entre «no contestó» y «contestó mal, y ahora hay que
    // arreglarlo». Ver `pifia` en `scenario/conversacion.ts`.
    const especial = grado === 'fumble' ? tema.pifia : undefined;
    if (especial) aplicar(turn, npc, especial, out, run, `pifió: ${tema.id}`, tema.id);
    else if (tema.esquiva) aplicar(turn, npc, tema.esquiva, out, run, `esquivó: ${tema.id}`, tema.id);
    else {
      out.push(pickVariant(s, [
        `${npc.name.split(' ')[0]} contesta al lado de la pregunta, y se nota que es a propósito.`,
        `—No sé —dice—. Le estoy diciendo que no sé.\n\nY sigue con lo suyo, que es una manera de terminar la frase.`,
      ]));
    }
  }
  avisarSiSeAgota(turn, npc, out, run);
}

/**
 * Cuando la paciencia llega a cero se avisa en la prosa, no en un cartel. Que
 * el jugador se entere de que agotó a alguien por cómo lo trata esa persona es
 * mejor que enterarse por una barra.
 */
function avisarSiSeAgota(turn: Turn, npc: Npc, out: string[], run: Runner): void {
  const ahora = turn.state.npcs[npc.id]!;
  if (ahora.patience > 0) return;
  if (npc.patience === 0) return; // ya estaba agotado: no repetir el aviso
  run('change_npc_state', {
    npc_id: npc.id, status: 'unchanged', present: 'unchanged',
    attitude_delta: ACTITUD_POR_AGOTAR, patience_delta: 0, dodged_topic: '',
    cause: 'lo agotaron a preguntas',
  });
  out.push(pickVariant(turn.state, [
    `\n${ahora.name.split(' ')[0]} deja lo que está haciendo y se queda mirándote.\n\n` +
    // {trato} en minúscula a propósito y no al principio de la frase: `conTrato`
    // hace un reemplazo literal, así que si el token abriera la oración
    // quedaría con minúscula donde iría mayúscula («doctora.» en vez de
    // «Doctora.»). Está armada para que la sustitución caiga siempre a mitad
    // de frase.
    '—Ya está, {trato}. Tengo que hacer la cena. —No lo dice con enojo, que sería más fácil—. Después seguimos.',
    `\n—Ya está —dice ${ahora.name.split(' ')[0]}—. Por hoy ya está.\n\n` +
    'Y se pone a lavar algo que no está sucio, que es lo que hace cuando se termina una conversación.',
  ]));
}

function agotado(s: GameState, npc: Npc): string {
  const nombre = npc.name.split(' ')[0];
  return pickVariant(s, [
    `${nombre} levanta la mano sin darse vuelta.\n\n—Después —dice—. Ahora no.\n\n` +
    'No es que no quiera contestar. Es que ya contestó todo lo que le entra de una vez, y usted lleva ' +
    'un rato largo en su cocina. Volvé más tarde.',
    `${nombre} sigue con lo suyo y no contesta.\n\nYa le preguntaste bastante por ahora. ` +
    'Andá a hacer otra cosa y volvé; el tiempo que pase juega a favor.',
  ]);
}
