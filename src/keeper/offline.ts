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

type Runner = (tool: string, args: Record<string, unknown>) => { ok: boolean; message: string };

export async function runOfflineTurn(
  turn: Turn,
  _scenario: Scenario,
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

  resolve(turn, intent, out, run);

  const narration = out.filter(Boolean).join('\n\n');
  emit({ kind: 'narration_delta', data: narration });
  // Las opciones las calcula el motor desde el estado ya actualizado.
  return { narration, options: accionesDisponibles(turn.state), usedModel: false };
}

/** ¿La tirada que acaba de ejecutarse superó la dificultad? */
function succeeded(msg: string): boolean {
  return /SUPERA la dificultad/.test(msg) && !/NO SUPERA/.test(msg);
}

// ─────────────────────────────────────────────────────────────────────────────
// ENRUTADO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

function resolve(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;

  // ── Desenlaces por frase ─────────────────────────────────────────────────
  // Van ANTES que cualquier otra lectura, y no dependen del verbo. El
  // clasificador no tiene verbo para "me quedo a pasar la noche": lo leía como
  // verbo desconocido sobre un objetivo real y lo resolvía mirando algo, así
  // que el final quedaba declarado en el escenario y era inalcanzable.
  if (/sosten[eg]/.test(i.norm) && /mirada|vista|reflejo/.test(i.norm)) {
    // Con poca exposición no es un desenlace: el reflejo no le contesta a
    // cualquiera. Es asomarse fuerte, y cae en la observación sostenida.
    if (exposureOf(s) >= 30) return endStare(turn, out, run);
    return lookAtWater(turn, { ...i, sustained: true }, out, run);
  }
  if (/me quedo|quedarme|paso la noche|pasar la noche/.test(i.norm)) {
    return endStay(turn, out, run);
  }

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

  // ── Desenlaces: se comprueban primero porque cierran la aventura ─────────
  if (i.verb === 'tapar' && (i.target.kind === 'water' || i.norm.includes('aljibe'))) return endSeal(turn, out, run);
  if (i.verb === 'irse') return endLeave(turn, out, run);
  if (i.verb === 'bajar' && (i.target.kind === 'water' || i.norm.includes('aljibe') || i.norm.includes('pozo'))) {
    return descendWell(turn, out, run);
  }
  // "Bajar" sobre otra cosa es mirar debajo de esa cosa.
  if (i.verb === 'bajar') return examine(turn, i, out, run);

  // ── Casos con contenido autoral ──────────────────────────────────────────
  if (isComparison(i)) return comparePhotos(turn, out, run);
  if (isClockOverWater(turn.state, i)) return clockOverWater(turn, out, run);
  if (i.target.kind === 'water' && ['mirar', 'examinar', 'usar', 'tocar'].includes(i.verb)) {
    return lookAtWater(turn, i, out, run);
  }
  if (isReadingNotebook(i)) return readNotebook(turn, out, run);
  if (isSearchingPages(turn.state, i)) return searchPages(turn, out, run);
  if (i.target.kind === 'item' && i.target.item.id === 'it-fotoreciente' && ['mirar', 'examinar', 'buscar'].includes(i.verb)) {
    return examinePlate(turn, out, run);
  }
  if (i.target.kind === 'npc') return talkTo(turn, i, out, run);
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
    if (!found.length && (item.hiddenProperties.length || item.conditionalProperties.length)) {
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
    if (f.exposure) run('apply_umbral_exposure', { amount: f.exposure, cause: `atención sostenida en ${f.names[0]}` });
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
    if (f.exposure) run('apply_umbral_exposure', { amount: f.exposure, cause: `mirar de cerca ${f.names[0]}` });
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
      if (loc.umbralIntensity >= 5) {
        run('apply_umbral_exposure', { amount: 2, cause: 'escuchar el silencio del agua' });
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

  if (which === 'touch' && i.target.kind === 'water') {
    run('apply_umbral_exposure', { amount: 5, cause: 'contacto físico con el agua quieta' });
    out.push('El agua no opone nada. Ni frío de más, ni corriente, ni el tironeo mínimo que tiene siempre el agua de un pozo. Sacás la mano seca antes de darte cuenta de que la sacaste seca.');
    run('apply_stability_shift', { amount: -4, cause: 'sacar la mano seca del agua' });
  }
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
      'Ahora es tuyo, con lo que eso signifique en esta casa.',
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
  const s = turn.state;

  // El espejo sobre el aljibe: mirar el fenómeno de forma indirecta.
  if (i.target.kind === 'item' && i.target.item.id === 'it-espejo' && s.world.currentLocation === 'patio') {
    const espejo = s.items['it-espejo']!;
    if (espejo.discoveredProperties.length) { out.push(espejo.conditionalProperties[0]!.description); return; }
    const r = run('discover_property', {
      item_id: 'it-espejo', property_id: 'p-espejo-indirecto',
      how: 'mirando el aljibe a través del espejo en vez de asomarse', compared_with: '',
    });
    if (r.ok) {
      out.push('Te parás de espaldas al brocal y levantás el espejo hasta que el agua aparece adentro del marco.');
      out.push(espejo.conditionalProperties[0]!.description);
      run('add_clue', {
        description: 'El retardo del reflejo se hace evidente al comparar el aljibe con un espejo. El agua parece no registrar a quien no la mira de frente.',
        kind: 'experiential', source: 'experimento con el espejo de mano', reliability: 'reliable',
      });
      run('apply_umbral_exposure', { amount: 2, cause: 'observar el aljibe de forma indirecta' });
    } else out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', ''));
    return;
  }

  if (i.target.kind === 'item' && i.target.item.id === 'it-farol') {
    run('advance_time', { minutes: 1, reason: 'encender el farol' });
    out.push(isNight(s)
      ? 'Encendés el farol. El círculo de luz llega hasta el brocal y ahí se detiene, más nítido de lo que la física recomienda.'
      : 'Encendés el farol, aunque todavía hay luz. La llama se queda perfectamente vertical.');
    return;
  }

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
    run('apply_umbral_exposure', { amount: 2, cause: 'permanecer junto al agua sin hacer nada' });
    out.push(pickVariant(s, [
      'En algún momento te das cuenta de que estuviste mirando el agua sin decidir mirarla.',
      'El agua sigue sin moverse. Vos sí te moviste, aunque no te acordás de haberlo hecho.',
    ]));
  }
  const f = umbralFlavour(turn.state);
  if (f) out.push(f);
}

function shout(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  const loc = s.world.locations[s.world.currentLocation]!;
  const rosa = s.npcs['npc-rosa'];

  if (loc.id === 'patio') {
    out.push(pickVariant(s, [
      'Gritás el nombre hacia el aljibe. La voz sale, cruza el patio y se va al campo.\n\nEl aljibe no devuelve eco. Un pozo de dos metros con agua abajo devuelve eco. Este no.',
      'Volvés a llamar. Nada. Ni siquiera el eco que te devolvió la primera vez, que tampoco fue.',
    ]));
    run('apply_umbral_exposure', { amount: 3, cause: 'gritar hacia el aljibe y no recibir eco' });
    if (timesTried(s, 'grit', 'llam') <= 1) {
      run('add_clue', {
        description: 'El aljibe no devuelve eco, aunque tiene la profundidad y el agua para hacerlo.',
        kind: 'experiential', source: 'llamar hacia el aljibe', reliability: 'reliable',
      });
    }
    if (rosa?.present) {
      run('change_npc_state', {
        npc_id: 'npc-rosa', status: 'unchanged', present: 'unchanged',
        attitude_delta: -5, cause: 'gritarle al aljibe delante de ella',
      });
      out.push('Rosa se mete en la casa sin decir nada y cierra la puerta con el hombro.');
    }
    return;
  }
  out.push('Tu voz llena la habitación y no contesta nadie que no estuviera ya.');
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

  if (i.target.kind === 'item' && i.target.item.id === 'it-espejo') {
    run('transfer_item', { item_id: 'it-espejo', to: 'perdido', carried: 'false', cause: 'el investigador lo rompe' });
    run('record_consequence', {
      description: 'El investigador rompió el espejo de mano de Rosa.', scope: 'location', permanent: 'true',
      world_reminder: 'El espejo de Rosa está roto. Ella lo notó y no lo dijo.',
    });
    run('change_npc_state', { npc_id: 'npc-rosa', status: 'unchanged', present: 'unchanged', attitude_delta: -15, cause: 'le rompieron el espejo' });
    out.push('El espejo se parte contra el ladrillo. Los pedazos quedan boca arriba en la tierra, cada uno con su porción de cielo, y todos con la misma fracción de segundo de retraso.');
    run('apply_umbral_exposure', { amount: 4, cause: 'ver el fenómeno multiplicado en los fragmentos' });
    return;
  }

  if (i.target.kind === 'water' || i.norm.includes('brocal') || i.norm.includes('aljibe')) {
    const roll = run('request_roll', {
      skill: 'STR', difficulty: 'hard',
      reason: 'romper el brocal a golpes',
      stakes_success: 'saltan lascas de piedra',
      stakes_failure: 'la piedra aguanta y vos no',
      bonus_dice: 0, penalty_dice: 0, modifier_reason: '',
    });
    if (succeeded(roll.message)) {
      out.push('Saltan un par de lascas y se te va el brazo. El brocal tiene doscientos años de estar ahí y piensa quedarse.');
      run('apply_damage', { amount: 1, cause: 'golpearse la mano contra la piedra' });
    } else {
      out.push('La piedra no cede. Te queda la mano ardiendo y la sensación ridícula de haberle pegado a una pared.');
      run('apply_damage', { amount: 1, cause: 'golpearse la mano contra la piedra' });
    }
    return;
  }

  out.push('No hay nada acá que romper valga la pena, y romperlo no cambiaría lo que el agua hace.');
}

function dig(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  if (s.world.currentLocation !== 'patio') { out.push('Acá no hay tierra para cavar.'); return; }
  run('advance_time', { minutes: 45, reason: 'cavar en el patio' });
  const roll = run('request_roll', {
    skill: 'STR', difficulty: 'regular',
    reason: 'cavar junto al aljibe',
    stakes_success: 'llegás a lo que hay abajo',
    stakes_failure: 'tierra apisonada y nada más',
    bonus_dice: 0, penalty_dice: 0, modifier_reason: '',
  });
  if (succeeded(roll.message)) {
    out.push(
      'Cuarenta y cinco minutos de pala. A medio metro la tierra se pone húmeda, y a los sesenta centímetros ' +
      'aparece agua: la misma napa. Se queda quieta en el pozo que acabás de hacer, en el acto, sin decantar.',
    );
    run('add_clue', {
      description: 'La napa está a sesenta centímetros y el agua se queda inmóvil apenas aflora, incluso en un pozo recién cavado.',
      kind: 'physical', source: 'excavación en el patio', reliability: 'reliable',
    });
    run('apply_umbral_exposure', { amount: 5, cause: 'ver el fenómeno en agua recién descubierta' });
  } else {
    out.push('Cuarenta y cinco minutos de pala para nada. Tierra apisonada, un pedazo de loza, la ampolla del pulgar.');
  }
}

function sleep(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  run('advance_time', { minutes: 300, reason: 'dormir' });
  run('apply_stability_shift', { amount: 5, cause: 'descanso' });
  const exposure = s.investigators[s.activeInvestigator]!.umbral.exposure;
  out.push(
    exposure >= 20
      ? 'Dormís mal. Soñás con el patio de día, con la luz exacta de esta tarde, y en el sueño el aljibe está tapado ' +
        'con tablas que todavía no pusiste. Te despertás con la certeza de haberlo visto, no de haberlo soñado.'
      : 'Dormís unas horas en el catre del cuarto de al lado. Sin sueños que valga la pena contar.',
  );
  if (exposure >= 20) run('apply_umbral_exposure', { amount: 3, cause: 'un sueño con contenido que no le pertenece' });
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

const isComparison = (i: Intent) =>
  i.norm.includes('compar') && /foto|retrato|imagen|placa/.test(i.norm);

const isReadingNotebook = (i: Intent) =>
  /cuaderno|diario|anotacion|apunte/.test(i.norm) && !/hoja por hoja|entre las pagina|paginas/.test(i.norm);

const isSearchingPages = (s: GameState, i: Intent) =>
  Boolean(s.documents['doc-cuaderno']?.obtainedAt) &&
  (/carta|sobre|papel doblado/.test(i.norm) || /hoja por hoja|pagina/.test(i.norm));

function isClockOverWater(s: GameState, i: Intent): boolean {
  return /reloj/.test(i.norm) && /agua|aljibe|sobre|encima|pozo/.test(i.norm) && s.world.currentLocation === 'patio';
}

function lookAtWater(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  const loc = s.world.currentLocation;

  if (loc !== 'patio' && loc !== 'orilla') {
    out.push('Desde acá no ves el agua. El aljibe está en el patio; la laguna, más allá del pastizal.');
    return;
  }

  const veces = timesTried(s, 'reflejo', 'agua', 'aljibe');
  const roll = run('request_roll', {
    skill: 'POW', difficulty: 'regular',
    reason: i.sustained ? 'sostener la mirada sobre el agua quieta' : 'asomarte al agua y observar el reflejo',
    stakes_success: 'ves lo que hay que ver y podés apartar la vista cuando querés',
    stakes_failure: 'la mirada se te va sola, y tardás en volver',
    bonus_dice: 0,
    penalty_dice: i.sustained ? 1 : 0,
    modifier_reason: i.sustained ? 'mirar sostenidamente es exponerse más' : '',
  });
  const ok = succeeded(roll.message);

  if (loc === 'patio') {
    out.push(pickVariant(s, [
      'Te inclinás sobre el brocal. El agua está a menos de dos metros y se ve el fondo, el musgo en los ladrillos, ' +
      'una moneda vieja. No hay una sola onda. Ni siquiera donde debería haberla, alrededor de tu propio aliento.\n\n' +
      'Tu cara está ahí abajo, mirándote.',

      'Volvés al brocal. Ahí está tu cara otra vez, esperándote con la paciencia de quien no tiene otra cosa que hacer.',

      'Te asomás de nuevo. A esta altura ya sabés qué vas a ver y lo ves igual, que es lo peor.',
    ]));

    if (ok) {
      out.push(veces === 0
        ? 'Y entonces lo notás, porque estabas atento: cuando ladeás la cabeza, la cara del agua ladea la cabeza una fracción de segundo después. Poco. Lo que tarda un vidrio de tren. Pero un vidrio de tren tiene una excusa.'
        : pickVariant(s, [
            'El retardo sigue ahí. Lo medís contra tu propio pulso: uno, y la cara de abajo llega en el uno y medio.',
            'Probás a moverte rápido, a ver si el retraso se agranda. Se agranda. La cara del agua completa el gesto que vos ya dejaste de hacer.',
            'Cerrás los ojos y contás hasta cinco. Cuando los abrís, la cara del agua todavía los tiene cerrados. No mucho tiempo. El suficiente.',
          ]));
      if (veces === 0) {
        run('add_clue', {
          description: 'El reflejo del aljibe imita al observador con un retardo perceptible, constante, de una fracción de segundo.',
          kind: 'experiential', source: 'observación directa del aljibe', reliability: 'reliable',
        });
      } else if (veces === 2) {
        run('add_clue', {
          description: 'El retardo del reflejo aumenta con la velocidad del movimiento: no es un efecto óptico constante.',
          kind: 'experiential', source: 'observación repetida del aljibe', reliability: 'reliable',
        });
        run('apply_stability_shift', { amount: -5, cause: 'comprobar que el retardo responde al movimiento' });
      }
    } else {
      out.push(pickVariant(s, [
        'Pasa un rato. No sabrías decir cuánto. Cuando te enderezás tenés las manos frías y la sensación incómoda de haber estado por entender algo que se te fue.',
        'Perdés el hilo. Volvés en vos con la nuca dura y el sol en otro lugar del cielo.',
      ]));
      run('apply_stability_shift', { amount: -5, cause: 'perder la cuenta del tiempo sobre el agua' });
    }
    run('apply_umbral_exposure', {
      amount: i.sustained ? 6 : 3,
      cause: i.sustained ? 'observación deliberada y sostenida del agua del aljibe' : 'asomarse al agua del aljibe',
    });
  } else {
    out.push(pickVariant(s, [
      'La laguna es ancha y baja, y no tiene olas. Los pájaros de la orilla caminan paralelos al agua, nunca hacia ella. ' +
      'El cielo está entero ahí adentro, del derecho, sin una arruga.\n\n' +
      'Es la misma quietud del aljibe, pero repartida en cien hectáreas: más grande, y por eso más fácil de no ver.',
      'Volvés a mirar la laguna. Sigue sin tener olas. Cien hectáreas de agua sin una sola onda es una cosa que uno mira dos veces y sigue sin poder sostener.',
    ]));
    run('apply_umbral_exposure', { amount: i.sustained ? 3 : 2, cause: 'observar la superficie de la Laguna Mansa' });
  }
}

function examinePlate(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  const item = s.items['it-fotoreciente']!;
  if (item.discoveredProperties.length > 0) {
    out.push(`Volvés sobre la placa. ${item.hiddenProperties[0]!.description}`);
    return;
  }
  const roll = run('request_roll', {
    skill: 'descubrir', difficulty: 'regular',
    reason: 'examinar la placa que Ignacio dejó dada vuelta',
    stakes_success: 'notás lo que hay en el círculo de agua',
    stakes_failure: 'sólo ves un aljibe fotografiado con demasiado cuidado',
    bonus_dice: 0, penalty_dice: 0, modifier_reason: '',
  });
  if (succeeded(roll.message)) {
    const r = run('discover_property', {
      item_id: 'it-fotoreciente', property_id: 'p-rec-figura',
      how: 'estudiando la placa contra la luz', compared_with: '',
    });
    out.push('Levantás la placa contra la ventana. El encuadre es de alguien que sabía exactamente qué quería fotografiar, y eso ya dice algo.');
    out.push(r.ok ? item.hiddenProperties[0]!.description : r.message.replace('RECHAZADO POR EL MOTOR: ', ''));
    if (r.ok) {
      run('add_clue', {
        description: 'En la placa que tomó Ignacio hay un hombre reflejado en el agua del aljibe, mirando hacia la cámara. No había nadie en el patio.',
        kind: 'physical', source: 'placa fotográfica de Ignacio Vera', reliability: 'reliable',
      });
      run('apply_umbral_exposure', { amount: 4, cause: 'ver la figura en el reflejo de la placa' });
    }
  } else {
    out.push(pickVariant(s, [
      'La levantás contra la luz y la mirás un buen rato. Un aljibe. El brocal, la roldana sin soga, el círculo del agua abajo.\n\nAlguien se tomó el trabajo de encuadrar esto con mucho cuidado, y después de darla vuelta contra la pared.',
      'La mirás otra vez. Sigue siendo un aljibe fotografiado con una atención que no le corresponde a un aljibe.',
    ]));
  }
}

function comparePhotos(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  if (!s.items['it-fotoreciente']!.discoveredProperties.length) {
    out.push(
      'Ponés las dos imágenes una al lado de la otra. La de 1897 muestra a la familia delante del aljibe recién ' +
      'levantado. La de Ignacio muestra el mismo brocal, veintisiete años después, vacío.\n\n' +
      'Vacío, salvo por el agua. Y en el agua todavía no viste nada, porque no miraste la placa con atención.',
    );
    return;
  }
  const r = run('discover_property', {
    item_id: 'it-foto1897', property_id: 'p-1897-rostro',
    how: 'comparando las dos fotografías bajo la misma luz', compared_with: 'it-fotoreciente',
  });
  if (!r.ok) { out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', '')); return; }
  out.push('Acercás las dos imágenes hasta que se tocan por el borde y las inclinás para que les dé la misma luz.');
  out.push(s.items['it-foto1897']!.hiddenProperties[0]!.description);
  run('add_clue', {
    description: 'El hombre del fondo de la fotografía de 1897 y la figura reflejada en la placa de Ignacio son la misma persona.',
    kind: 'physical', source: 'comparación de las dos fotografías', reliability: 'reliable',
  });
  run('apply_stability_shift', { amount: -8, cause: 'dos imágenes separadas por veintisiete años que no pueden mostrar a la misma persona' });
  run('apply_umbral_exposure', { amount: 4, cause: 'reconocer el rostro repetido' });
  run('note_contradiction', {
    description: 'La misma persona aparece en dos fotografías separadas por veintisiete años, sin haber envejecido.',
    between: 'Fotografía de 1897 | Placa de Ignacio, octubre de 1924',
  });
}

function clockOverWater(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  const reloj = s.items['it-reloj']!;
  if (reloj.discoveredProperties.length) {
    out.push(`Volvés a sostenerlo sobre el agua. ${reloj.hiddenProperties[0]!.description}`);
    return;
  }
  const r = run('discover_property', {
    item_id: 'it-reloj', property_id: 'p-reloj-atras',
    how: 'sosteniendo el reloj sobre la boca del aljibe', compared_with: '',
  });
  if (!r.ok) { out.push(r.message.replace('RECHAZADO POR EL MOTOR: ', '')); return; }
  out.push('Te asomás lo justo y extendés el brazo con el reloj colgando de la cadena, encima del círculo de agua.');
  out.push(reloj.hiddenProperties[0]!.description);
  run('add_clue', {
    description: 'El reloj de Ignacio retrocede seis o siete segundos cuando está sobre el agua del aljibe, y vuelve a detenerse en las cuatro y veinte.',
    kind: 'experiential', source: 'experimento directo sobre el aljibe', reliability: 'reliable',
  });
  run('apply_stability_shift', { amount: -8, cause: 'un mecanismo que retrocede sobre el agua y no fuera de ella' });
  run('apply_umbral_exposure', { amount: 6, cause: 'presenciar una anomalía inequívoca en el aljibe' });
  run('raise_question', { question: '¿Por qué las cuatro y veinte, y por qué siempre el mismo tramo?' });
}

function readNotebook(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  if (s.documents['doc-cuaderno']!.obtainedAt) {
    out.push('Volvés sobre el cuaderno. Ya lo leíste entero; está en tus documentos.');
    return;
  }
  if (s.world.currentLocation !== 'cuarto') {
    out.push('El cuaderno estaba en el cuarto de Ignacio, sobre el cajón que le hacía de mesa.');
    return;
  }
  const r = run('reveal_document', { document_id: 'doc-cuaderno', how: 'lo levantás del cajón y lo leés de principio a fin' });
  if (!r.ok) { out.push(r.message); return; }
  out.push('Es un cuaderno de tapas de hule, de los que se venden en el almacén. La letra empieza prolija y se va apurando. Lo leés entero de pie, sin sentarte.');
  run('add_clue', {
    description: 'Ignacio medía el nivel del aljibe y no bajaba, aunque sacara dos baldes por día durante diecinueve días.',
    kind: 'documentary', source: 'cuaderno de Ignacio Vera', reliability: 'reliable',
  });
  run('add_clue', {
    description: 'Ignacio concluyó que el agua "guarda" como una placa fotográfica, por un fenómeno mineral de la napa.',
    kind: 'documentary', source: 'cuaderno de Ignacio Vera', reliability: 'false',
  });
  run('raise_question', { question: '¿Qué quiso decir Ignacio con "tengo que ver si estoy"?' });
  run('apply_stability_shift', { amount: -5, cause: 'la última entrada del cuaderno' });
}

function searchPages(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  if (s.documents['doc-carta']!.obtainedAt) {
    out.push('Ya encontraste lo que había entre las hojas. Está en tus documentos.');
    return;
  }
  const roll = run('request_roll', {
    skill: 'descubrir', difficulty: 'regular',
    reason: 'revisar el cuaderno hoja por hoja',
    stakes_success: 'encontrás algo que Ignacio guardó entre las páginas',
    stakes_failure: 'sólo cuentas de almacén y una lista de nombres de vacas',
    bonus_dice: 0, penalty_dice: 0, modifier_reason: '',
  });
  if (succeeded(roll.message)) {
    const r = run('reveal_document', { document_id: 'doc-carta', how: 'estaba doblada en cuatro entre las últimas hojas' });
    if (r.ok) {
      out.push('Entre las últimas hojas hay un papel doblado en cuatro, de otro papel y de otra tinta.');
      run('add_clue', {
        description: 'En 1897 desapareció un hombre en el mismo aljibe. No hubo cuerpo. La viuda sostuvo que siguió viéndolo tres días, con la cara más vieja.',
        kind: 'documentary', source: 'carta del Dr. Emilio Rausch, 1911', reliability: 'reliable',
      });
      run('apply_stability_shift', { amount: -5, cause: 'un testimonio de 1911 que describe lo mismo' });
    }
  } else {
    out.push(pickVariant(s, [
      'Lo sacudís por el lomo y lo hojeás dos veces. Cuentas del almacén. Una lista de nombres de vacas. Nada más.',
      'Otra pasada, hoja por hoja, con más paciencia. Nada todavía. Podés seguir intentando.',
    ]));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROSA
// ─────────────────────────────────────────────────────────────────────────────

function talkTo(turn: Turn, i: Intent, out: string[], run: Runner): void {
  const s = turn.state;
  const rosa = s.npcs['npc-rosa'];
  if (!rosa || !rosa.present) { out.push('No hay nadie acá con quien hablar.'); return; }

  const inv = s.investigators[s.activeInvestigator]!;
  const attitude = rosa.attitude[inv.id] ?? 0;

  if (s.world.currentLocation === 'patio' && isNight(s)) {
    out.push('—Adentro —dice Rosa desde el umbral, sin salir—. Yo acá afuera de noche no hablo.');
    return;
  }

  const bump = (d: number, cause: string) =>
    run('change_npc_state', { npc_id: 'npc-rosa', status: 'unchanged', present: 'unchanged', attitude_delta: d, cause });

  switch (i.topic) {
    case 'soga': {
      bump(5, 'la pregunta correcta');
      out.push('Rosa deja de doblar el repasador.\n\n—La saqué yo —dice—. Tres días después. —Y como no decís nada, agrega—: Antes no. Después.');
      if (!hasClue(s, 'soga de la roldana tres días')) {
        run('add_clue', {
          description: 'Rosa retiró la soga de la roldana tres días DESPUÉS de la desaparición de Ignacio, no antes.',
          kind: 'testimonial', source: 'Rosa Quintana', reliability: 'reliable',
        });
      }
      const nueva = turn.state.npcs['npc-rosa']!.attitude[inv.id] ?? 0;
      if (nueva >= 40) revealRosaSecret(turn, out, run);
      else out.push('Se queda callada. Es evidente que hay una segunda parte y que todavía no se la ganaste.');
      return;
    }
    case 'ignacio': {
      bump(3, 'conversación');
      out.push(pickVariant(s, [
        '—Cenó. Guiso. Comió poco, que ya venía comiendo poco. —Rosa habla mirando la mesa—. Salió al patio a fumar, ' +
        'como todas las noches. Yo levanté los platos, me acosté. A la mañana no estaba.\n\n' +
        '—El reloj apareció ahí, en el brocal. Seco. Y esa noche llovió.\n\n' +
        'Se queda un momento. Después dice, más rápido, como quien cierra un tema:\n\n—Debía plata en el pueblo. Eso es lo que pasó.',

        '—Ya le conté todo lo que sé de esa noche. —Se seca las manos aunque las tiene secas—. No hay más.\n\n' +
        'Pero no se va. Se queda parada al lado de la mesa, esperando otra pregunta que no sea esa.',
      ]));
      if (!hasClue(s, 'salió al patio a fumar')) {
        run('add_clue', {
          description: 'Ignacio salió al patio a fumar la noche del 15 y no volvió. El reloj apareció seco en el brocal a la mañana siguiente, después de una noche de lluvia.',
          kind: 'testimonial', source: 'Rosa Quintana', reliability: 'reliable',
        });
      }
      return;
    }
    case 'aljibe': {
      bump(2, 'conversación');
      out.push(pickVariant(s, [
        'Rosa vuelve a doblar el repasador.\n\n—El agua está buena —dice—. Nunca se secó, ni en el veinte, que se secó todo. ' +
        '—Una pausa—. Él la miraba mucho. Yo le decía que era el cansancio.\n\n' +
        'Se levanta a mover una olla que no necesita que la muevan.\n\n—Yo de noche al patio no salgo. Por si le interesa.',

        '—¿Otra vez el aljibe? —Rosa no levanta la vista—. Es un pozo con agua, doctora. Hay uno en cada casa de este campo.\n\n' +
        'Y sin embargo no dice "vaya y mire". Nunca dice eso.',
      ]));
      return;
    }
    case 'reloj': {
      bump(3, 'conversación');
      out.push('—Estaba seco —dice—. Eso es lo que no me sale de la cabeza. Llovió toda la noche y el reloj estaba seco arriba del brocal, como si alguien lo hubiera puesto ahí a la mañana.\n\n—Y la casa estaba cerrada por dentro. Yo la cerré.');
      if (!hasClue(s, 'casa estaba cerrada por dentro')) {
        run('add_clue', {
          description: 'La casa estaba cerrada por dentro esa noche, y el reloj apareció seco sobre el brocal tras una noche de lluvia.',
          kind: 'testimonial', source: 'Rosa Quintana', reliability: 'reliable',
        });
      }
      return;
    }
    case '1897': {
      bump(2, 'conversación');
      out.push('—Esa es de cuando hicieron el aljibe. Los patrones viejos, los Vera de antes. —Se acerca a mirarla ella también, y es la primera vez que se acerca a algo por su cuenta—.\n\n—Mi madre trabajó para ellos. Decía que a la señora se le murió el marido en el pozo y que después se le fue la cabeza.\n\nSe da vuelta y vuelve a la olla.\n\n—Cosas de antes.');
      run('raise_question', { question: '¿Qué le pasó exactamente a la familia Vera en 1897?' });
      return;
    }
    case 'hermano': {
      if (attitude < 30) {
        out.push('—Del hermano no hablo —dice, y es la primera vez que le sale cortante—. Eso es de familia y usted vino por otra cosa.');
        bump(-3, 'preguntar por el hermano antes de tiempo');
      } else {
        bump(2, 'confianza suficiente');
        out.push('—Se pelearon por el campo hace años. No se hablaban. —Se encoge de hombros—. Ya sé lo que está pensando, y no. El hermano está en Rosario y hace ocho años que no viene.\n\n—No todo lo raro de esta casa es de la familia, doctora.');
        run('add_clue', {
          description: 'El hermano de Ignacio vive en Rosario y no visita el campo hace ocho años. La disputa familiar no tiene relación con la desaparición.',
          kind: 'testimonial', source: 'Rosa Quintana', reliability: 'reliable',
        });
      }
      return;
    }
    case 'deuda': {
      bump(1, 'conversación');
      out.push('—Debía en el almacén, como todos. —Rosa lo dice rápido—. Cuarenta pesos, capaz sesenta.\n\nSesenta pesos no es una cifra por la que un hombre abandone un campo arrendado, un sombrero y un reloj. Ella lo sabe también, y por eso lo dijo rápido.');
      return;
    }
    case 'ella': {
      // Con confianza suficiente confiesa. Si no, esquiva — y esquivar
      // desbloquea la acción de insistir, que es otra cosa.
      if (attitude >= 40 || hasClue(s, 'dos luces')) { revealRosaSecret(turn, out, run); return; }
      bump(4, 'preguntarle por ella y no por Ignacio');
      out.push('Rosa se queda quieta con el repasador en las manos.\n\n—Yo no vi nada —dice, y es la primera cosa que dice que suena ensayada—. Yo estaba durmiendo.\n\nDespués, más bajo, casi para ella:\n\n—Y desde entonces duermo con la luz prendida, que es un gasto.');
      return;
    }
    default: {
      bump(1, 'conversación');
      out.push(pickVariant(s, [
        `Rosa contesta lo justo. ${attitude < 20 ? 'Todavía no confía en usted, y no lo disimula.' : 'Empieza a contestar sin medir tanto cada palabra.'}\n\n—Pregunte lo que tenga que preguntar, doctora. Yo tengo que hacer la cena igual.`,
        '—Mmm —dice Rosa, que es lo que dice cuando no piensa contestar.\n\nSigue con lo suyo. Pero no se va de la cocina, que también es una forma de contestar.',
        'Rosa te mira de frente por primera vez en un rato.\n\n—¿Usted qué cree que pasó? —pregunta—. Dígame usted, que vino de afuera.',
      ]));
      out.push('(Podés preguntarle por la soga, por Ignacio, por el aljibe, por el reloj, por la fotografía vieja, o por ella misma.)');
      return;
    }
  }
}

function revealRosaSecret(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  if (hasClue(s, 'dos luces')) {
    out.push('—Ya se lo dije —dice Rosa—. No me lo haga decir otra vez.');
    return;
  }
  out.push(
    'Se queda callada un momento más largo de lo cómodo.\n\n' +
    '—La noche siguiente vine con el farol. A llamarlo. —Se mira las manos—. El farol tarda en aparecer en el agua, ' +
    '¿sabe? Uno se asoma y la luz llega después. Y cuando llegó… —se detiene—. Había dos luces. Yo tenía una sola.\n\n' +
    '—Por eso saqué la soga.',
  );
  run('add_clue', {
    description: 'Rosa vio dos luces reflejadas en el aljibe cuando bajó con un solo farol, la noche siguiente a la desaparición.',
    kind: 'testimonial', source: 'Rosa Quintana', reliability: 'reliable',
  });
  run('apply_umbral_exposure', { amount: 3, cause: 'el testimonio de Rosa sobre las dos luces' });
  run('record_consequence', {
    description: 'Rosa contó lo que vio la noche siguiente a la desaparición.',
    scope: 'campaign', permanent: 'false',
    world_reminder: 'Rosa ya confesó lo de las dos luces. Habla con más franqueza a partir de ahora, y está más asustada.',
  });
}

const exposureOf = (s: GameState) => s.investigators[s.activeInvestigator]?.umbral.exposure ?? 0;

const hasClue = (s: GameState, fragment: string) =>
  s.board.clues.some((c) => c.description.includes(fragment));

// ─────────────────────────────────────────────────────────────────────────────
// DESENLACES
// ─────────────────────────────────────────────────────────────────────────────

function descendWell(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  if (s.world.currentLocation !== 'patio') { out.push('El aljibe está en el patio.'); return; }

  out.push(
    'Apoyás las manos en el brocal. La roldana no tiene soga: Rosa la sacó, y ya sabés por qué o estás por saberlo.\n\n' +
    'Son poco más de dos metros hasta el agua, y el agua tiene menos de un metro. Se puede bajar. ' +
    'Bajar es fácil. Lo que no está claro es lo otro.',
  );
  const roll = run('request_roll', {
    skill: 'trepar', difficulty: 'regular',
    reason: 'descolgarte por el brocal sin soga',
    stakes_success: 'bajás controlando el descenso',
    stakes_failure: 'te resbalás en el ladrillo húmedo',
    bonus_dice: 0, penalty_dice: 1, modifier_reason: 'sin soga y con ladrillo húmedo',
  });
  if (!succeeded(roll.message)) {
    run('apply_damage', { amount: 3, cause: 'caída de dos metros contra el fondo del aljibe' });
    out.push('El musgo cede. Caés los dos metros de golpe y el agua no amortigua casi nada.');
  }
  run('apply_umbral_exposure', { amount: 12, cause: 'entrar en contacto físico con el agua del aljibe' });
  run('apply_stability_shift', { amount: -10, cause: 'estar dentro del agua quieta' });
  run('record_consequence', {
    description: 'El investigador bajó al aljibe de Los Álamos.', scope: 'campaign', permanent: 'true',
    world_reminder: 'El investigador estuvo dentro del agua del aljibe. Sea lo que sea que el agua registra, lo registró a él.',
  });
  out.push(
    'El agua te llega a la cintura y está más fría de lo que corresponde a octubre. Desde acá abajo, el círculo de ' +
    'cielo en la boca del aljibe se ve chico y muy lejos.\n\n' +
    'No hay cuerpo. No hay ropa. No hay nada más que ladrillo, musgo y una moneda vieja.\n\n' +
    'Y sin embargo el agua alrededor de tus piernas sigue completamente quieta.',
  );
  run('reach_ending', {
    ending_id: 'bajar', title: 'Lo que está abajo',
    text:
      'Salís sola, con las manos peladas de agarrarte del ladrillo, y Rosa está arriba con el farol aunque es de día ' +
      'y aunque juró que no se acercaba.\n\n' +
      'Te ayuda a pasar la pierna por el brocal. Cuando estás afuera te mira la ropa mojada y no dice nada de la ropa.\n\n' +
      '—¿Se vio? —pregunta.\n\n' +
      'Y es una pregunta rarísima, y las dos entienden perfectamente lo que quiere decir.',
  });
}

function endSeal(turn: Turn, out: string[], run: Runner): void {
  run('record_consequence', {
    description: 'El aljibe de Los Álamos quedó sellado.', scope: 'world', permanent: 'true',
    world_reminder: 'El aljibe de Los Álamos está sellado por decisión del investigador. Nadie volvió a mirar esa agua. Lo que estuviera ahí sigue estando.',
  });
  run('reach_ending', {
    ending_id: 'sellar', title: 'Lo que se tapa',
    text:
      'Tablas del galpón, los clavos que había, y encima las piedras del cerco viejo. Rosa te alcanza las cosas sin ' +
      'que se lo pidas y no dice una palabra en las dos horas que lleva.\n\n' +
      'Cuando terminás ya es de noche. El patio se ve más grande sin el brocal a la vista.\n\n' +
      'Rosa se queda mirando el montón de tablas un rato largo. Después dice: «¿Y si él está ahí?».\n\n' +
      'No es una pregunta que quiera respuesta. Es una pregunta que se va a quedar en la casa después de que usted ' +
      'se vaya, y también después de que se vaya ella.',
  });
}

function endLeave(turn: Turn, out: string[], run: Runner): void {
  run('record_consequence', {
    description: 'El investigador se fue de Los Álamos sin resolver la desaparición.', scope: 'world', permanent: 'true',
    world_reminder: 'El aljibe de Los Álamos quedó abierto y sin vigilancia. Rosa Quintana se quedó sola en la casa.',
  });
  run('reach_ending', {
    ending_id: 'llevarse', title: 'Lo que se lleva',
    text:
      'La chata del correo pasa a las siete. Rosa no sale a despedirla.\n\n' +
      'En el bolso llevás el cuaderno, la carta de Rausch y las dos fotografías, que Rosa te dio sin discutir, ' +
      'como si se sacara algo de encima.\n\n' +
      'A los seis meses vas a volver a abrir la carpeta, y las fotografías van a seguir mostrando lo mismo. ' +
      'Esa es la parte que no te vas a poder explicar: que sigan mostrando lo mismo.',
  });
}

/**
 * «Lo que devuelve la mirada». El desenlace que el escenario declaraba y el
 * motor no ofrecía: mirar sostenidamente hasta que el fenómeno responde.
 *
 * Pide exposición alta porque el reflejo no le responde a cualquiera: le
 * responde a quien ya se asomó lo suficiente como para que haya algo del otro
 * lado que lo reconozca.
 */
function endStare(turn: Turn, out: string[], run: Runner): void {
  const s = turn.state;
  if (s.world.currentLocation !== 'patio') { out.push('El aljibe está en el patio.'); return; }

  out.push(
    'Apoyás los codos en el brocal y decidís no apartar la vista. Es una decisión, no un descuido: ' +
    'las dos cosas se parecen desde afuera y no se parecen en nada por dentro.\n\n' +
    'El primer minuto no pasa nada. El segundo tampoco.',
  );

  const roll = run('request_roll', {
    skill: 'POW', difficulty: 'dificil',
    reason: 'sostener la mirada sobre el agua hasta que el agua conteste',
    stakes_success: 'seguís siendo quien mira cuando termina',
    stakes_failure: 'para cuando termina, ya no está claro quién miraba a quién',
    bonus_dice: 0, penalty_dice: 1, modifier_reason: 'nadie sostiene esto sin pagarlo',
  });
  const firme = succeeded(roll.message);

  run('apply_umbral_exposure', { amount: 18, cause: 'sostener la mirada hasta que el reflejo respondió' });
  run('apply_stability_shift', { amount: firme ? -12 : -22, cause: 'que el reflejo dejara de imitar' });
  run('add_clue', {
    description: 'El reflejo del aljibe dejó de imitar y se movió por su cuenta. No es un efecto óptico: hay algo que usa el agua para mirar.',
    kind: 'experiential', source: 'observación sostenida hasta la respuesta', reliability: 'reliable',
  });
  run('record_consequence', {
    description: 'El investigador sostuvo la mirada hasta que el fenómeno del aljibe respondió.',
    scope: 'campaign', permanent: 'true',
    world_reminder: 'El agua respondió a este investigador. Lo que sea que mira desde el aljibe ahora sabe qué cara tiene.',
  });

  out.push(
    'En algún momento del tercero, la cara del agua deja de copiarte.\n\n' +
    'No hace nada espectacular. Simplemente sigue ahí, con tu cara, quieta, mientras vos parpadeás. ' +
    'Y después, sin apuro, ladea la cabeza hacia un lado al que vos no la ladeaste.',
  );

  run('reach_ending', {
    ending_id: 'mirar', title: 'Lo que devuelve la mirada',
    text: firme
      ? 'Te apartás del brocal por decisión propia, que es más de lo que la mayoría podría decir.\n\n' +
        'Rosa está en la puerta de la cocina con el repasador en las manos y no pregunta nada, porque te vio la cara ' +
        'y ya sabe. Adentro pone la pava, y las dos toman mate sin hablar hasta que se hace de noche.\n\n' +
        'Vos entendiste qué es el aljibe. No lo vas a poder escribir en el informe de una manera que sirva, ' +
        'y vas a volver a Buenos Aires con eso adentro.\n\n' +
        'Lo que no vas a saber nunca es si el aljibe entendió qué sos vos, o si le alcanzó con verte.'
      : 'No sabés cómo llegaste al suelo del patio. Rosa te está sacudiendo el hombro y el sol está en otro lado del cielo, ' +
        'mucho más abajo, y ella dice que estuviste tres horas asomada sin contestarle.\n\n' +
        'Te levantás. Te lavás la cara en el balde, no en el aljibe, y esa distinción te parece la cosa más importante ' +
        'que decidiste en tu vida.\n\n' +
        'Entendiste qué es el aljibe. También entendiste, con la misma claridad, que el aljibe tuvo tres horas ' +
        'para entenderte a vos, y que vos no te acordás de ninguna.',
  });
}

/**
 * «Lo que se queda». Quedarse a pasar la noche en Los Álamos.
 * El escenario lo marca como consecuencia grave y lo es: acá el precio no es
 * la cordura del investigador, es Rosa.
 */
function endStay(turn: Turn, out: string[], run: Runner): void {
  run('advance_time', { minutes: 8 * 60, reason: 'pasar la noche en Los Álamos' });
  run('apply_umbral_exposure', { amount: 14, cause: 'dormir a veinte metros del aljibe' });
  run('apply_stability_shift', { amount: -15, cause: 'una noche entera de agua quieta al lado' });
  run('record_consequence', {
    description: 'El investigador pasó la noche en Los Álamos. Rosa Quintana no estaba a la mañana.',
    scope: 'world', permanent: 'true',
    world_reminder: 'Rosa Quintana desapareció la noche que el investigador se quedó en la casa. El aljibe quedó abierto.',
  });

  out.push(
    'Rosa te arma el catre en la cocina, que es el cuarto más lejos del patio, y no dice que lo eligió por eso.\n\n' +
    'Te dormís tarde. Un aljibe hace ruido y este no hace ninguno, y resulta que el silencio de una cosa que ' +
    'debería sonar es más difícil de tolerar que el ruido.',
  );

  run('reach_ending', {
    ending_id: 'quedarse', title: 'Lo que se queda',
    text:
      'A las cuatro y veinte de la mañana te despierta el frío, porque la puerta de la cocina está abierta de par en par.\n\n' +
      'El catre de Rosa está hecho. Sus zapatos están al lado de la cama, los dos, prolijos.\n\n' +
      'En el patio no hay nadie. El brocal está mojado en todo el borde, como si alguien se hubiera apoyado con ' +
      'las dos manos y después con todo el cuerpo, y el agua abajo está perfectamente quieta.\n\n' +
      'Gritás el nombre de ella hasta que se te va la voz. El aljibe no devuelve eco. Eso ya lo sabías.\n\n' +
      'La chata del correo pasa a las siete. Subís sola, con el cuaderno y las fotografías en el bolso, y ' +
      'con dos desaparecidos donde antes había uno.',
  });
}

// ─────────────────────────────────────────────────────────────────────────────

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

