/**
 * KEEPER DEL MOTOR — el modo gratuito, y el modo por defecto.
 *
 * Esto NO es un sustituto degradado de Claude. Es el motor arbitrando y
 * narrando por su cuenta: clasifica la intención en las cinco categorías de
 * v0.9 §11, ejecuta EXACTAMENTE las mismas herramientas validadas que usaría
 * el Keeper IA, y compone la prosa desde el estado.
 *
 * Dados, gates, consecuencias, guardado y auditoría son idénticos en los dos
 * modos. Lo único que cambia es quién escribe las oraciones.
 *
 * Regla de oro de este archivo: NINGUNA acción se queda sin respuesta, y
 * ninguna respuesta se repite dos veces igual.
 */

import type { Turn } from '../engine/engine.ts';
import type { Scenario } from '../scenario/types.ts';
// De types.ts, NO de keeper.ts: este archivo no debe tener ninguna arista con
// el SDK de Anthropic. Es el que corre en el navegador.
import type { KeeperEmit, KeeperResult } from './types.ts';
import type { GameState, LocationFeature } from '../shared/types.ts';
import { classify, type Intent } from './intent.ts';
import {
  pickVariant, timesTried, describeScene, umbralFlavour,
  needsClarification, isNight, lightNote,
} from './narrator.ts';
import { accionesDisponibles, detalleExaminado } from '../scenario/acciones.ts';
import { resolverTema, temasDisponibles } from './social.ts';
import { propiedadPorTirada, tieneAlgoMas } from '../rules/cuando-tirar.ts';
import { escenaPara, ejecutarEscena, leerIntencion } from './escenas.ts';
import { conTrato } from '../rules/tratamiento.ts';

type Runner = (tool: string, args: Record<string, unknown>) => { ok: boolean; message: string };

export async function runOfflineTurn(
  turn: Turn,
  scenario: Scenario,
  action: string,
  emit: KeeperEmit,
): Promise<KeeperResult> {
  const run: Runner = (tool, args) => {
    const r = turn.executeTool(tool, args);
    if (r.emit) emit(r.emit);
    return r;
  };

  const intent = classify(turn.state, action);
  const out: string[] = [];

  resolve(turn, intent, out, run, scenario);

  // `conTrato` resuelve el token `{trato}` que la prosa autoral usa para
  // dirigirse al investigador — «doctora», «comisario», «don Tomás» — según
  // quién esté jugando de verdad, y no según quién estaba pensado al escribir
  // la escena. Un solo lugar para toda la narración de un turno.
  const narration = conTrato(out.filter(Boolean).join('\n\n'), turn.investigator);
  emit({ kind: 'narration_delta', data: narration });
  // Las opciones las calcula el motor desde el estado ya actualizado.
  return {
    narration,
    options: accionesDisponibles(turn.state, scenario),
    usedModel: false,
  };
}

/** ¿La tirada que acaba de ejecutarse superó la dificultad? */
function succeeded(msg: string): boolean {
  return /SUPERA la dificultad/.test(msg) && !/NO SUPERA/.test(msg);
}

// ─────────────────────────────────────────────────────────────────────────────
// ENRUTADO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

function resolve(turn: Turn, i: Intent, out: string[], run: Runner, scenario: Scenario): void {
  const s = turn.state;

  // ── LAS ESCENAS DE LA AVENTURA VAN PRIMERO ───────────────────────────────
  // Desenlaces y contenido autoral viven en el escenario, no acá. Se
  // comprueban antes que cualquier lectura genérica porque son más
  // específicas: si «bajo al aljibe» cayera en el verbo `bajar` genérico, el
  // motor lo resolvería mirando debajo de algo.
  const leida = leerIntencion(i);
  const escena = escenaPara(scenario.scenes, s, leida);
  if (escena) return ejecutarEscena(turn, escena, leida, out, run);

  // ── Acción rara sobre algo real ──────────────────────────────────────────
  // El jugador escribió un verbo que el motor no tiene, apuntando a algo que
  // sí existe. No lo movemos ni lo ignoramos: se lo reconoce y se resuelve
  // como observación, que es lo que casi siempre quería.
  if (!i.verbExplicit && i.target.kind !== 'none') {
    out.push(pickVariant(s, [
      'Hacés eso. El campo no tiene opinión al respecto, y Rosa —si mira— tampoco la va a dar.',
      'Lo hacés. Nada se opone, y nada cambia por hacerlo.',
      'Bueno. Ya está hecho, y seguís donde estabas.',
    ]));
    if (i.target.kind === 'location') { out.push(describeScene(s, false)); return; }
    return examine(turn, i, out, run);
  }

  // ── Movimiento explícito: gana sobre cualquier otra lectura ──────────────
  // "Voy a la laguna" apunta al agua Y a la orilla; el destino manda.
  if (['ir', 'entrar', 'salir'].includes(i.verb) && i.destination) {
    return move(turn, { ...i, target: { kind: 'location', id: i.destination } }, out, run);
  }

  // "Bajar" sobre algo que no es el aljibe es mirar debajo de esa cosa.
  if (i.verb === 'bajar') return examine(turn, i, out, run);

  if (i.target.kind === 'npc') return talkTo(turn, i, out, run, scenario);
  if (['hablar', 'preguntar', 'mostrar', 'mentir'].includes(i.verb)) {
    out.push('No hay nadie acá a quien preguntarle eso.');
    return;
  }

  // ── Resolución genérica: es acá donde el motor deja de rendirse ──────────
  switch (i.verb) {
    case 'mirar':
    case 'examinar':
    case 'buscar':   return examine(turn, i, out, run);
    case 'escuchar': return sense(turn, i, out, run, 'sound');
    case 'oler':     return sense(turn, i, out, run, 'smell');
    case 'tocar':    return sense(turn, i, out, run, 'touch');
    case 'tomar':    return takeItem(turn, i, out, run);
    case 'soltar':   return dropItem(turn, i, out, run);
    case 'ir':
    case 'entrar':
    case 'salir':    return move(turn, i, out, run);
    case 'esperar':  return wait(turn, i, out, run);
    case 'gritar':
    case 'llamar':   return shout(turn, i, out, run);
    case 'anotar':   return takeNotes(turn, out, run);
    case 'pensar':   return think(turn, out);
    case 'romper':
    case 'forzar':
    case 'atacar':   return breakThing(turn, i, out, run);
    case 'cavar':    return dig(turn, out, run);
    case 'dormir':   return sleep(turn, out, run);
    case 'subir':    return climb(turn, i, out, run);
    case 'usar':     return useItem(turn, i, out, run);
    case 'meta':     return nudge(turn, out);
    default:
      // Verbo desconocido PERO objetivo reconocido: el jugador señaló algo
      // real con un verbo que el motor no tiene. Se resuelve mirándolo, que es
      // lo que casi siempre quería. Mejor que pedir aclaración.
      if (i.target.kind !== 'none') {
        out.push(pickVariant(s, [
          'No es exactamente lo que se puede hacer acá, pero sí podés mirarlo bien.',
          'Eso no va a llevarte a ningún lado. Mirarlo con atención, en cambio, quizá sí.',
        ]));
        return examine(turn, i, out, run);
      }
      out.push(needsClarification(s, i.raw));
      return;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMINAR — el verbo más importante de un juego de investigación
// ─────────────────────────────────────────────────────────────────────────────

function examine(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;

  // Un detalle concreto de la localización.
  if (i.target.kind === 'feature') return examineFeature(turn, i.target.feature, i, out, run);

  // Un objeto.
  if (i.target.kind === 'item') {
    const item = s.items[i.target.item.id]!;
    const known = item.publicProperties.map((p) => p.description).join(' ');
    const found = item.discoveredProperties
      .map((d) => [...item.hiddenProperties, ...item.conditionalProperties].find((p) => p.id === d.propertyId)?.description)
      .filter(Boolean);
    out.push(`${known}${found.length ? '\n\n' + found.join('\n\n') : ''}`);

    // Si el objeto esconde algo que se destraba con una tirada, se tira ACÁ.
    // Antes esa propiedad quedaba declarada y sin camino salvo que la aventura
    // escribiera una escena a mano — la familia de bug que este proyecto ya
    // encontró cinco veces. El criterio está en `rules/cuando-tirar.ts`.
    const porTirada = propiedadPorTirada(item);
    const cond = porTirada?.discoveryCondition;
    if (porTirada && cond?.kind === 'skill_check') {
      const roll = run('request_roll', {
        skill: cond.skill, difficulty: cond.difficulty,
        reason: `examinar ${item.name.toLowerCase()} con atención`,
        stakes_success: 'notás lo que no salta a la vista',
        stakes_failure: 'nada que no hayas visto ya',
        bonus_dice: i.sustained ? 1 : 0, penalty_dice: 0,
        modifier_reason: i.sustained ? 'te tomás el tiempo de mirarlo bien' : '',
      });
      if (succeeded(roll.message)) {
        const r = run('discover_property', {
          item_id: item.id, property_id: porTirada.id,
          how: 'examinándolo con atención', compared_with: '',
        });
        out.push(r.ok ? porTirada.description : r.message.replace('RECHAZADO POR EL MOTOR: ', ''));
        return;
      }
      out.push(pickVariant(s, [
        'Lo mirás por todos lados. La sensación de que falta algo no se va.',
        'Nada nuevo esta vez. Podés volver a intentarlo con más calma.',
      ]));
      return;
    }

    if (!found.length && tieneAlgoMas(item)) {
      out.push(pickVariant(s, [
        'Hay algo en este objeto que todavía no terminaste de ver. Quizá no acá, o no así.',
        'Lo mirás por todos lados. La sensación de que falta algo no se va.',
        'Nada más. Por ahora.',
      ]));
    }
    return;
  }

  // Uno mismo.
  if (i.target.kind === 'self') {
    const inv = s.investigators[s.activeInvestigator]!;
    out.push(
      `Te mirás las manos. ${inv.derived.hp < inv.derived.maxHp ? 'Estás lastimada.' : 'Enteras.'} ` +
      (inv.umbral.exposure >= 30
        ? 'Y por un momento te cuesta creer que sean tuyas, aunque hacen lo que les pedís.'
        : 'Son tus manos, con la cicatriz vieja del pulgar donde siempre estuvo.'),
    );
    return;
  }

  // Registrar el lugar entero: tirada de Descubrir, y el éxito revela un detalle
  // no examinado en vez de repetir la atmósfera.
  const loc = s.world.locations[s.world.currentLocation]!;
  const roll = run('request_roll', {
    skill: 'descubrir', difficulty: 'regular',
    reason: `registrar ${loc.name.toLowerCase()}`,
    stakes_success: 'algo que no salta a la vista se te hace visible',
    stakes_failure: 'nada que no hayas visto ya',
    bonus_dice: 0, penalty_dice: 0, modifier_reason: '',
  });

  out.push(describeScene(s, false));

  if (succeeded(roll.message)) {
    const pending = (loc.features ?? []).filter((f) => !detalleExaminado(s, f));
    if (pending.length) {
      const f = pending[0]!;
      out.push(`Y algo más, porque estabas mirando: ${lowerFirst(f.description)}`);
    } else {
      out.push(pickVariant(s, [
        'Ya viste todo lo que este lugar tiene para mostrar sin que lo desarmes.',
        'Nada nuevo. El lugar ya te dio lo que tenía.',
      ]));
    }
  } else {
    out.push(pickVariant(s, [
      'Mirás sin encontrar. A veces pasa: el ojo se acostumbra a lo que espera ver.',
      'Nada. O nada que puedas ubicar todavía.',
    ]));
  }
}

function examineFeature(turn: Turn, f: LocationFeature, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;

  if (detalleExaminado(s, f)) {
    out.push(`${f.description}\n\n${f.closerLook ?? ''}`.trim());
    out.push(pickVariant(s, [
      'Ya lo miraste con todo el cuidado que da mirar.',
      'No hay más que sacarle a esto.',
    ]));
    return;
  }

  out.push(f.description);

  if (!f.closerLook) {
    if (f.exposure) run('apply_umbral_exposure', { amount: f.exposure, cause: `atención sostenida en ${f.names[0]}`, source: `detalle:${f.id}` });
    return;
  }

  const skill = f.examineSkill ?? 'descubrir';
  const roll = run('request_roll', {
    skill, difficulty: 'regular',
    reason: `mirar ${f.names[0]} de cerca`,
    stakes_success: 'notás lo que hay que notar',
    stakes_failure: 'no ves más de lo evidente',
    bonus_dice: i.sustained ? 1 : 0,
    penalty_dice: 0,
    modifier_reason: i.sustained ? 'te tomás el tiempo de mirar bien' : '',
  });

  if (succeeded(roll.message)) {
    out.push(f.closerLook);
    if (f.exposure) run('apply_umbral_exposure', { amount: f.exposure, cause: `mirar de cerca ${f.names[0]}`, source: `detalle:${f.id}` });
    if (f.clue) {
      run('add_clue', {
        description: f.clue.description, kind: f.clue.kind,
        source: `observación directa: ${f.names[0]}`, reliability: f.clue.reliability,
      });
    }
  } else {
    out.push(pickVariant(s, [
      'Lo mirás un rato. Es lo que parece ser y nada más, o eso te devuelve.',
      'Te falta luz, o te falta paciencia, o te falta saber qué estás buscando.',
      'Nada. Podés volver a intentarlo con más calma.',
    ]));
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SENTIDOS
// ─────────────────────────────────────────────────────────────────────────────

function sense(turn: Turn, i: Intent, out: string[], run: Runner, which: 'sound' | 'smell' | 'touch'): void {
  const s = turn.state;
  const loc = s.world.locations[s.world.currentLocation]!;
  const pool = loc.senses?.[which] ?? [];

  if (which === 'sound') {
    const roll = run('request_roll', {
      skill: 'escuchar', difficulty: 'regular',
      reason: 'aguzar el oído',
      stakes_success: 'distinguís lo que hay debajo del ruido de fondo',
      stakes_failure: 'sólo el campo, el viento y tu propia respiración',
      bonus_dice: 0, penalty_dice: 0, modifier_reason: '',
    });
    if (succeeded(roll.message) && pool.length) {
      out.push(pickVariant(s, pool));
      // La exposición por escuchar un lugar cargado la declara el LUGAR con su
      // `umbralIntensity`, no una rama escrita a mano por aventura.
      if (loc.umbralIntensity >= 5) {
        run('apply_umbral_exposure', {
          amount: 2, source: `lugar:${loc.id}:escuchar`,
          cause: `escuchar lo que suena —o lo que no— en ${loc.name.toLowerCase()}`,
        });
      }
    } else {
      out.push(pickVariant(s, [
        'El campo. Viento en los álamos. Un perro lejos que ladra dos veces y se calla.',
        'Nada que puedas separar del resto.',
      ]));
    }
    return;
  }

  if (pool.length) out.push(pickVariant(s, pool));
  else out.push(which === 'smell'
    ? 'Nada en particular. Tierra, y el fondo de olor que tiene cualquier casa de campo.'
    : 'Frío, seco, lo esperable.');
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVIMIENTO
// ─────────────────────────────────────────────────────────────────────────────

function move(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  const here = s.world.locations[s.world.currentLocation]!;

  const destId = i.target.kind === 'location' ? i.target.id : i.destination;

  if (!destId) {
    const salidas = here.connections.map((c) => s.world.locations[c]?.name?.toLowerCase()).filter(Boolean);
    out.push(
      `Ya estás en ${here.name.toLowerCase()}.\n\n` +
      `Desde acá se puede ir hacia ${salidas.join(' o ')}. ¿A dónde?`,
    );
    return;
  }
  if (destId === here.id) {
    out.push(`Ya estás acá.\n\n${describeScene(s, false)}`);
    return;
  }
  const dest = s.world.locations[destId];
  if (!dest) { out.push(needsClarification(s, i.raw)); return; }

  if (!here.connections.includes(destId)) {
    // Ruta indirecta: el motor la resuelve en vez de rechazarla.
    const bridge = here.connections.find((c) => s.world.locations[c]?.connections.includes(destId));
    if (bridge) {
      run('move_to_location', { location_id: bridge, minutes: 1 });
      const r2 = run('move_to_location', { location_id: destId, minutes: 2 });
      if (r2.ok) {
        const via = s.world.locations[bridge]!;
        out.push(`Cruzás ${via.name.toLowerCase()} sin detenerte.\n\n${describeScene(turn.state, false)}`);
        return;
      }
    }
    out.push(`Desde ${here.name.toLowerCase()} no se llega directamente ahí. Tendrías que pasar por ${here.connections.map((c) => s.world.locations[c]?.name?.toLowerCase()).filter(Boolean).join(' o ')}.`);
    return;
  }

  const r = run('move_to_location', { location_id: destId, minutes: 2 });
  if (!r.ok) { out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', '')); return; }
  out.push(describeScene(turn.state, false));

  const flavour = umbralFlavour(turn.state);
  if (flavour) out.push(flavour);
}

// ─────────────────────────────────────────────────────────────────────────────
// OBJETOS
// ─────────────────────────────────────────────────────────────────────────────

function takeItem(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  if (i.target.kind !== 'item') {
    if (i.target.kind === 'feature') { out.push(`${i.target.feature.names[0]} no es algo que puedas llevarte.`); return; }
    out.push(needsClarification(s, i.raw));
    return;
  }
  const inv = s.investigators[s.activeInvestigator]!;
  const item = s.items[i.target.item.id]!;
  if (item.owner === inv.id) {
    out.push(`Ya lo llevás encima. ${item.shortDescription}`);
    return;
  }
  const r = run('transfer_item', { item_id: item.id, to: inv.id, carried: 'true', cause: 'lo toma el investigador' });
  if (!r.ok) { out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', '')); return; }
  out.push(
    `Lo guardás. ${item.shortDescription}\n\n` +
    pickVariant(s, [
      'Pesa lo que tiene que pesar, que a esta altura ya es algo.',
      'Queda en tu bolsillo. Vas a acordarte de que lo tenés en el peor momento posible.',
      // Sin «en esta casa»: era la variante genérica de agarrar CUALQUIER
      // objeto, en CUALQUIER aventura, y «esta casa» sólo tenía sentido en
      // Los Álamos. Agarrar la cantimplora de un muerto en un galpón de
      // estancia con esa frase leía como si la estancia fuera una casa de
      // familia. Genérico de verdad: sirve en cualquier lugar.
      'Ahora es tuyo, con lo que eso signifique.',
    ]),
  );
}

function dropItem(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  if (i.target.kind !== 'item') { out.push(needsClarification(s, i.raw)); return; }
  const r = run('transfer_item', {
    item_id: i.target.item.id, to: s.world.currentLocation, carried: 'false', cause: 'lo deja el investigador',
  });
  out.push(r.ok ? `Dejás ${i.target.item.name.toLowerCase()}.` : r.message);
}

function useItem(turn: Turn, i: Intent, out: string[], run: Runner): void {
  // Usar un objeto de una manera que la aventura previó ya se resolvió antes:
  // esas escenas viven en el escenario. Lo que llega acá es usar algo sin que
  // la aventura tenga nada escrito, y mirarlo bien es la mejor respuesta.
  return examine(turn, i, out, run);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCIONES QUE ANTES NO TENÍAN RESPUESTA
// ─────────────────────────────────────────────────────────────────────────────

function wait(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  const mins = i.sustained ? 30 : 10;
  run('advance_time', { minutes: mins, reason: 'esperar' });
  const loc = s.world.locations[s.world.currentLocation]!;

  out.push(pickVariant(s, [
    `Te quedás quieta. Pasan ${mins} minutos que se sienten más largos.`,
    `Esperás otra vez. El campo tiene su propia idea del tiempo y no la comparte.`,
    `Dejás pasar el rato sin hacer nada. ${lightNote(turn.state)}`.trim(),
  ]));

  if (loc.umbralIntensity >= 5) {
    run('apply_umbral_exposure', { amount: 2, cause: 'permanecer junto al agua sin hacer nada', source: 'aljibe:presencia' });
    out.push(pickVariant(s, [
      'En algún momento te das cuenta de que estuviste mirando el agua sin decidir mirarla.',
      'El agua sigue sin moverse. Vos sí te moviste, aunque no te acordás de haberlo hecho.',
    ]));
  }
  const f = umbralFlavour(turn.state);
  if (f) out.push(f);
}

function shout(turn: Turn, i: Intent, out: string[], run: Runner): void {
  // Gritar donde la aventura tiene algo que decir ya se resolvió como escena.
  // Esto es el caso genérico: gritar donde no pasa nada.
  out.push(pickVariant(turn.state, [
    'Tu voz llena el lugar y no contesta nadie que no estuviera ya.',
    'Gritás. El sonido se va y no vuelve nada que valga la pena escribir.',
  ]));
}

function think(turn: Turn, out: string[]): void {
  const s = turn.state;
  const b = s.board;
  if (!b.clues.length) {
    out.push('Todavía no tenés con qué pensar. Tenés una mujer que no quiere hablar y un agua que no se mueve.');
    return;
  }
  const parts = [`Ordenás lo que tenés.`];
  parts.push(b.clues.slice(-4).map((c) => `— ${c.description}`).join('\n'));
  if (b.contradictions.length) {
    parts.push(`Y el problema: ${b.contradictions[b.contradictions.length - 1]!.description}`);
  } else {
    parts.push('Nada se contradice todavía. Eso es lo que más te inquieta: que todo pueda ser cierto al mismo tiempo.');
  }
  out.push(parts.join('\n\n'));
}

function takeNotes(turn: Turn, out: string[], run: Runner): void {
  run('advance_time', { minutes: 10, reason: 'tomar notas' });
  run('apply_stability_shift', { amount: 4, cause: 'poner por escrito lo que se sabe: anclaje' });
  out.push(
    'Sacás la libreta y anotás con fecha y hora, como te enseñaron a anotar una historia clínica: primero lo que ' +
    'observás, después lo que interpretás, y una raya entre las dos cosas.\n\n' +
    'Escribirlo ayuda. Mientras la letra sea tuya y la fecha esté arriba, hay un orden.',
  );
}

function breakThing(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  // Romper algo que la aventura previó ya se resolvió como escena. Acá queda
  // romper cualquier otra cosa: se puede, no sirve, y el objeto se pierde.
  if (i.target.kind === 'item') {
    run('transfer_item', {
      item_id: i.target.item.id, to: 'perdido', carried: 'false',
      cause: 'el investigador lo rompe',
    });
    out.push(`Rompés ${i.target.item.name.toLowerCase()}. No cambia nada de lo que está pasando acá.`);
    return;
  }
  out.push(pickVariant(s, [
    'No hay nada acá que romper valga la pena, y romperlo no cambiaría lo que está pasando.',
    'Le pegás a algo que no tiene la culpa. Te queda la mano ardiendo y el problema intacto.',
  ]));
}

function dig(turn: Turn, out: string[], run: Runner): void {
  // Cavar donde la aventura tiene algo enterrado es una escena suya.
  run('advance_time', { minutes: 30, reason: 'cavar' });
  out.push('Media hora de pala. Tierra, una raíz, un pedazo de loza. Nada que ayude.');
}

function sleep(turn: Turn, out: string[], run: Runner): void {
  run('advance_time', { minutes: 300, reason: 'dormir' });
  run('apply_stability_shift', { amount: 5, cause: 'descanso' });
  out.push('Dormís unas horas. Sin sueños que valga la pena contar.');
}

function climb(turn: Turn, i: Intent, out: string[], run: Runner): void {
  out.push('No hay nada que valga la pena escalar acá. Si querés bajar al aljibe, decilo así.');
}

function nudge(turn: Turn, out: string[]): void {
  const s = turn.state;
  out.push(
    pickVariant(s, [
      'El mundo espera a que hagas algo. No avanza solo.',
      'Nada se mueve mientras no te muevas vos.',
    ]) +
    '\n\n' + needsClarification(s, ''),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENIDO AUTORAL (los momentos que llevan escritura propia)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ROSA
// ─────────────────────────────────────────────────────────────────────────────

function talkTo(turn: Turn, i: Intent, out: string[], run: Runner, scenario: Scenario): void {
  const s = turn.state;
  if (i.target.kind !== 'npc') { out.push('No hay nadie acá con quien hablar.'); return; }
  const npc = s.npcs[i.target.npc.id];
  if (!npc || !npc.present || npc.status !== 'alive') {
    out.push('No hay nadie acá con quien hablar.');
    return;
  }

  const tema = temaPorFrase(scenario.conversations, npc.id, i.norm, s);
  if (!tema) {
    // Sin tema reconocido no se gasta paciencia: preguntar mal no cansa a nadie.
    out.push(sinTema(turn, npc.id, scenario));
    return;
  }
  resolverTema(turn, npc, tema, out, run);
}

/**
 * Qué tema es el que se preguntó.
 *
 * Gana la clave MÁS LARGA que coincida, no la primera. Con "la primera" el
 * catálogo tenía que estar ordenado de específico a genérico a mano, y bastaba
 * agregar un tema en el lugar equivocado para que "por la deuda de Ignacio"
 * se leyera como una pregunta sobre Ignacio. Con la más larga, el orden del
 * catálogo deja de importar — que es lo que hace falta para que una aventura
 * nueva no tenga que conocer estas trampas.
 */
function temaPorFrase(
  conversaciones: Scenario['conversations'], npcId: string, norm: string, s: GameState,
) {
  let mejor: { tema: (typeof conversaciones)[number]; largo: number } | null = null;
  for (const tema of conversaciones) {
    if (tema.npc !== npcId) continue;
    if (tema.disponible && !tema.disponible(s)) continue;
    if (tema.agotado?.(s)) continue;
    for (const clave of tema.claves) {
      if (norm.includes(clave) && (!mejor || clave.length > mejor.largo)) {
        mejor = { tema, largo: clave.length };
      }
    }
  }
  return mejor?.tema ?? null;
}

/** Habló pero no se entendió por qué. Se le ofrece el repertorio real. */
function sinTema(turn: Turn, npcId: string, scenario: Scenario): string {
  const s = turn.state;
  const npc = s.npcs[npcId]!;
  if (npc.patience <= 0) {
    return `${npc.name.split(' ')[0]} ya te contestó todo lo que le entra de una vez. Volvé más tarde.`;
  }
  const abiertos = temasDisponibles(s, npc, scenario.conversations);
  const lista = abiertos.map((t) => `«${t.etiqueta.replace(/^Preguntarle /, '')}»`).join(', ');
  return pickVariant(s, [
    `${npc.name.split(' ')[0]} contesta lo justo.

—Pregunte lo que tenga que preguntar, {trato}. ` +
    'Yo tengo que hacer la cena igual.',
    `—Mmm —dice ${npc.name.split(' ')[0]}, que es lo que dice cuando no piensa contestar.

` +
    'Sigue con lo suyo. Pero no se va, que también es una forma de contestar.',
  ]) + (lista ? `

(Podés preguntarle por: ${lista}.)` : '');
}


// ─────────────────────────────────────────────────────────────────────────────

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

