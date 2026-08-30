/**
 * APLICADOR DE ESCENAS — genérico.
 *
 * Recorre las escenas que declara la aventura, encuentra la que responde a la
 * intención, pide su tirada y aplica sus efectos con las mismas herramientas
 * validadas que usa todo lo demás.
 *
 * No conoce Agua Quieta. No sabe qué es un aljibe, una placa fotográfica ni un
 * desenlace concreto. Si alguna vez hace falta tocar este archivo para agregar
 * una aventura, el contrato de `EscenaAutoral` se quedó corto y hay que
 * ampliarlo ahí, no acá.
 */

import type { Turn } from '../engine/engine.ts';
import type { GameState } from '../shared/types.ts';
import type {
  EscenaAutoral, EfectoEscena, IntencionLeida, ContextoEscena,
} from '../scenario/escena.ts';
import { porPrioridad } from '../scenario/escena.ts';
import { pickVariant } from './narrator.ts';
import type { Intent } from './intent.ts';
import { gradoDeLaTirada, huboExito } from './grado.ts';
import { argsDeCrisis } from './crisis.ts';

type Runner = (tool: string, args: Record<string, unknown>) =>
  { ok: boolean; message: string; emit?: { kind: string; data: unknown } };

/**
 * Traduce lo que entendió el clasificador a lo que ve la aventura.
 *
 * Existe para que el contenido NO dependa de los internos del keeper: si
 * mañana el clasificador cambia de forma, se arregla esta función y ninguna
 * aventura se entera.
 */
export function leerIntencion(i: Intent): IntencionLeida {
  const t = i.target;
  const id =
    t.kind === 'item' ? t.item.id
      : t.kind === 'feature' ? t.feature.id
        : t.kind === 'npc' ? t.npc.id
          : t.kind === 'location' ? t.id
            : null;
  return {
    raw: i.raw,
    norm: i.norm,
    verb: i.verb,
    verbExplicit: i.verbExplicit,
    sustained: i.sustained,
    objetivo: { kind: t.kind, id },
    destino: i.destination,
  };
}

/** La escena que responde ahora, si hay alguna. */
export function escenaPara(
  escenas: EscenaAutoral[],
  s: GameState,
  i: IntencionLeida,
): EscenaAutoral | null {
  // Sólo cuando se agarra UN OBJETO CONCRETO. El clasificador lee «levanto
  // acta» como el verbo agarrar —«levanto» es raíz de tomar— y sin la
  // condición del objetivo esa frase dejaba de encontrar su escena, que además
  // era un desenlace. La regla existe para que agarrar la libreta no dispare
  // la escena de leerla; no para vetar toda frase que contenga un verbo de
  // tomar.
  const agarrando = (i.verb === 'tomar' || i.verb === 'soltar')
    && i.objetivo.kind === 'item';
  return [...escenas].sort(porPrioridad).find(
    (e) => (!agarrando || e.tambienAlAgarrar) && e.cuando(s, i),
  ) ?? null;
}

/** Aplica un efecto declarado. Todo pasa por herramientas validadas. */
function aplicarEfecto(
  turn: Turn, efecto: EfectoEscena, out: string[], run: Runner,
): void {
  if (efecto.texto) for (const p of efecto.texto) if (p) out.push(p);

  if (efecto.tiempo) {
    run('advance_time', { minutes: efecto.tiempo.minutes, reason: efecto.tiempo.reason });
  }
  // Antes que `descubre`: si la propiedad se destraba por uso, el uso tiene
  // que estar registrado cuando el gate lo consulte.
  if (efecto.usa) {
    run('use_item', {
      item_id: efecto.usa.itemId, times: efecto.usa.times ?? 1, cause: efecto.usa.cause,
    });
  }
  if (efecto.traslada) {
    run('transfer_item', {
      item_id: efecto.traslada.itemId,
      to: efecto.traslada.a,
      carried: String(efecto.traslada.carried ?? false),
      cause: efecto.traslada.cause,
    });
  }
  if (efecto.anillo) {
    const r = run('bind_ring', {
      item_id: efecto.anillo.itemId,
      cause: efecto.anillo.cause,
      removal_lethal: String(efecto.anillo.removalLethal ?? true),
    });
    // Mismo criterio que `descubre`: si el motor lo rechazó, el jugador tiene
    // que enterarse. Una prosa que da por puesto un anillo que el motor no
    // dejó poner es el juego contradiciéndose en la misma pantalla.
    if (!r.ok) out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', ''));
  }
  if (efecto.descubre) {
    const r = run('discover_property', {
      item_id: efecto.descubre.itemId,
      property_id: efecto.descubre.propertyId,
      how: efecto.descubre.how,
      compared_with: efecto.descubre.comparedWith ?? '',
    });
    // Si el gate lo rechaza, el jugador tiene que enterarse: un descubrimiento
    // que el motor bloqueó y la prosa da por hecho es la peor incoherencia
    // posible, porque el juego se contradice a sí mismo en la misma pantalla.
    if (!r.ok) out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', ''));
  }
  if (efecto.documento) {
    const r = run('reveal_document', {
      document_id: efecto.documento.id, how: efecto.documento.how,
    });
    if (!r.ok) out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', ''));
  }
  if (efecto.contradiccion) {
    // Se deduplica igual que las pistas. Sin esto, reintentar una escena
    // —que el motor permite, y que es lo que haría cualquiera si la tirada
    // salió mal— llenaba el tablero con la misma contradicción tres veces.
    const yaEsta = turn.state.board.contradictions.some(
      (c) => c.description === efecto.contradiccion!.description,
    );
    if (!yaEsta) {
      run('note_contradiction', {
        description: efecto.contradiccion.description,
        between: efecto.contradiccion.between,
      });
    }
  }
  for (const pista of efecto.pistas ?? []) {
    const yaEsta = turn.state.board.clues.some((c) => c.description === pista.description);
    if (!yaEsta) {
      run('add_clue', {
        description: pista.description, kind: pista.kind,
        source: pista.source, reliability: pista.reliability,
      });
    }
  }
  if (efecto.exposicion) {
    run('apply_umbral_exposure', {
      amount: efecto.exposicion.amount,
      source: efecto.exposicion.source,
      cause: efecto.exposicion.cause,
    });
  }
  if (efecto.estabilidad) {
    run('apply_stability_shift', {
      amount: efecto.estabilidad.amount, cause: efecto.estabilidad.cause,
    });
  }
  if (efecto.cordura) {
    run('apply_sanity_loss', {
      amount: efecto.cordura.amount, cause: efecto.cordura.cause,
      ...argsDeCrisis(efecto.cordura.crisis),
    });
  }
  if (efecto.jugadorNota) {
    run('note_player_knowledge', {
      statement: efecto.jugadorNota.statement,
      source: efecto.jugadorNota.source,
      reliability: efecto.jugadorNota.reliability ?? 'unknown',
    });
  }
  if (efecto.mitos) {
    run('apply_mythos_knowledge', {
      amount: efecto.mitos.amount, source: efecto.mitos.source,
    });
  }
  if (efecto.iniciaCombate) {
    // Antes de resolver el asalto de acá abajo, para que `activeCombat` ya
    // esté puesto cuando el jugador vea la respuesta de este mismo turno:
    // es lo que hace que la interfaz cambie de pantalla en el acto.
    run('start_combat', {
      npc_ids: efecto.iniciaCombate.npcIds.join(','),
      reason: efecto.iniciaCombate.reason ?? 'lo dispuso la escena',
      salida_pacifica: efecto.iniciaCombate.salidaPacifica,
      preparacion: efecto.iniciaCombate.preparacion,
    });
  }
  if (efecto.combate) {
    // A diferencia de `descubre`/`documento` —donde el resultado exitoso ya
    // lo cuenta la prosa de la escena y sólo hace falta mostrar un rechazo—,
    // acá el MENSAJE DEL MOTOR ES la narración: los dados y el daño no los
    // puede predecir ningún texto escrito de antemano. Se muestra siempre.
    const c = efecto.combate;
    let r: ReturnType<Runner>;
    if (c.accion === 'atacar') {
      r = run('resolve_attack', {
        npc_id: c.npcId ?? '', weapon_id: c.armaId ?? 'desarmado',
        reason: 'lo dispuso la escena',
        apuntando: String(Boolean(c.apuntando)),
        punto_blanco: String(Boolean(c.puntoBlanco)),
        cubierto: String(Boolean(c.cubierto)),
        blanco_movil: String(Boolean(c.blancoMovil)),
      });
    } else if (c.accion === 'huir') {
      r = run('resolve_flee', { weapon_id: c.armaId ?? 'desarmado' });
    } else {
      r = run('resolve_maneuver', {
        npc_id: c.npcId ?? '', type: c.tipo ?? 'derribar', reason: 'lo dispuso la escena',
      });
    }
    out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', ''));
  }
  if (efecto.dano) {
    run('apply_damage', { amount: efecto.dano.amount, cause: efecto.dano.cause });
  }
  if (efecto.pregunta) run('raise_question', { question: efecto.pregunta });
  if (efecto.npc) {
    run('change_npc_state', {
      npc_id: efecto.npc.id, status: 'unchanged', present: 'unchanged',
      attitude_delta: efecto.npc.attitudeDelta ?? 0,
      patience_delta: efecto.npc.patienceDelta ?? 0,
      dodged_topic: '', cause: efecto.npc.cause,
    });
  }
  if (efecto.consecuencia) {
    run('record_consequence', {
      description: efecto.consecuencia.description,
      scope: efecto.consecuencia.scope,
      permanent: String(efecto.consecuencia.permanent),
      world_reminder: efecto.consecuencia.worldReminder,
    });
  }
  // El desenlace va ÚLTIMO: cierra la aventura, y lo que se aplicara después
  // caería sobre una partida ya terminada.
  if (efecto.desenlace) {
    run('reach_ending', {
      ending_id: efecto.desenlace.id,
      title: efecto.desenlace.title,
      text: efecto.desenlace.text,
    });
  }
}

/**
 * Ejecuta una escena entera: prosa previa, tirada, efectos.
 *
 * El orden importa y es el de la mesa: primero se ve la situación, después se
 * tira, después se sabe. Invertirlo dejaría al jugador leyendo el resultado
 * antes de entender qué estaba en juego.
 */
export function ejecutarEscena(
  turn: Turn, escena: EscenaAutoral, i: IntencionLeida, out: string[], run: Runner,
): void {
  const antes = escena.antes?.(turn.state, i);
  if (antes) aplicarEfecto(turn, antes, out, run);

  let tirada: ContextoEscena['tirada'] = null;
  const prueba = escena.prueba?.(turn.state, i);
  if (prueba) {
    const r = run('request_roll', {
      skill: prueba.skill,
      difficulty: prueba.difficulty,
      reason: prueba.reason,
      stakes_success: prueba.stakes_success,
      stakes_failure: prueba.stakes_failure,
      bonus_dice: prueba.bonus_dice ?? 0,
      penalty_dice: prueba.penalty_dice ?? 0,
      modifier_reason: prueba.modifier_reason ?? '',
    });
    const numero = r.emit?.kind === 'roll' ? (r.emit.data as { result?: number }).result : undefined;
    tirada = { exito: huboExito(r), grado: gradoDeLaTirada(r), mensaje: r.message, numero };
  }

  const ctx: ContextoEscena = {
    estado: turn.state,
    intencion: i,
    tirada,
    variante: (opciones) => pickVariant(turn.state, opciones),
  };

  const efectos = escena.resolver(ctx);
  for (const e of Array.isArray(efectos) ? efectos : [efectos]) {
    aplicarEfecto(turn, e, out, run);
  }
}
