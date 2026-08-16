/**
 * NARRADOR DEL MOTOR — composición de prosa sin modelo de lenguaje.
 *
 * No sustituye a Claude: sustituye al silencio. La diferencia entre un motor
 * que dice "no entiendo eso" y uno que resuelve la acción y narra algo con
 * sentido es la diferencia entre una demo y un juego.
 *
 * Tres principios:
 *
 *   1. NUNCA repetir el mismo texto dos veces. Si una acción se repite, la
 *      respuesta cambia — o dice explícitamente que ya se hizo.
 *   2. La prosa se COMPONE del estado: hora, lugar, exposición, qué se
 *      descubrió ya, qué dijo Rosa. No son cadenas fijas.
 *   3. Una acción no reconocida NO es un error. Es la quinta categoría de
 *      v0.9 §11: "requiere aclaración", y se responde dentro de la ficción.
 */

import type { GameState } from '../shared/types.ts';

/**
 * Elige la variante que todavía no se usó. Cuenta cuántas de las variantes ya
 * aparecen en la narrativa de la campaña y devuelve la siguiente; si se
 * agotaron, devuelve la última (que por convención es la de "ya hiciste esto").
 *
 * Esto resuelve la queja concreta: repetir una acción deja de dar el mismo
 * párrafo dos veces.
 */
export function pickVariant(state: GameState, variants: string[]): string {
  if (variants.length === 0) return '';
  const said = state.narrative.filter((n) => n.kind === 'keeper').map((n) => n.text);
  for (const v of variants) {
    // `includes`, no `startsWith`: una variante puede haberse emitido en medio
    // de un texto compuesto. Comparar sólo el prefijo hacía que las líneas de
    // atmósfera —que nunca van primeras— parecieran siempre nuevas.
    const head = v.slice(0, Math.min(60, v.length));
    if (!said.some((s) => s.includes(head))) return v;
  }
  return variants[variants.length - 1]!;
}

/** Cuántas veces el jugador ya intentó algo parecido, por palabra clave. */
export function timesTried(state: GameState, ...keywords: string[]): number {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return state.narrative.filter(
    (n) => n.kind === 'player' && keywords.some((k) => norm(n.text).includes(norm(k))),
  ).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSICIÓN SEGÚN ESTADO
// ─────────────────────────────────────────────────────────────────────────────

export function hourOf(state: GameState): number {
  return Number(state.world.time.iso.slice(11, 13));
}

export function isNight(state: GameState): boolean {
  const h = hourOf(state);
  return h >= 19 || h < 6;
}

export function lightNote(state: GameState): string {
  const h = hourOf(state);
  if (h >= 19 || h < 6) return 'Ya es de noche.';
  if (h >= 18) return 'La luz se está yendo.';
  if (h >= 17) return 'La tarde se está cayendo.';
  return '';
}

/**
 * Detalle sensorial calibrado por la exposición del investigador.
 * A exposición baja el mundo es raro; a exposición alta empieza a fallar.
 */
export function umbralFlavour(state: GameState): string {
  const inv = state.investigators[state.activeInvestigator]!;
  const e = inv.umbral.exposure;
  const s = inv.umbral.stability;

  const pool: string[] = [];
  if (e >= 10) pool.push('Hay un momento en que te parece que el ruido de fondo del campo se detuvo, y después vuelve.');
  if (e >= 30) pool.push('Por un segundo tenés la certeza de que ya estuviste parada exactamente acá, en esta postura, mirando esto mismo.');
  if (e >= 30) pool.push('Sentís la atención de algo. No la mirada: la atención. No es lo mismo.');
  if (e >= 55) pool.push('Te acordás con nitidez de algo que no puede haber pasado todavía, y la memoria se disuelve antes de que puedas mirarla de frente.');
  if (s <= 60) pool.push('Perdés el hilo de la hora. Cuando lo recuperás, no sabrías decir cuánto pasó.');
  if (s <= 35) pool.push('Por un instante el orden de las cosas que acabás de hacer se te desarma, como una baraja mal cortada.');

  if (pool.length === 0) return '';
  return pickVariant(state, pool) === pool[pool.length - 1] && pool.length === 1 ? pool[0]! : pickVariant(state, pool);
}

/**
 * Descripción de la escena. Volver a un lugar conocido NO repite el párrafo de
 * llegada: nadie vuelve a su cocina y la ve por primera vez.
 */
export function describeScene(state: GameState, detailed: boolean): string {
  const loc = state.world.locations[state.world.currentLocation]!;
  const yaDescripto = state.narrative.some(
    (n) => n.kind === 'keeper' && n.text.includes(loc.description.slice(0, 50)),
  );

  const parts: string[] = [];
  if (yaDescripto && !detailed) {
    parts.push(pickVariant(state, [
      `Volvés a ${loc.name.toLowerCase()}.`,
      `${loc.name} otra vez.`,
      `De vuelta en ${loc.name.toLowerCase()}, que no cambió nada mientras no estabas.`,
      `Volvés. Todo donde estaba.`,
    ]));
  } else {
    parts.push(loc.description);
  }

  const light = lightNote(state);
  if (light) parts.push(light);

  if (detailed) {
    parts.push(loc.atmosphere.join(' '));
  } else {
    const a = pickVariant(state, loc.atmosphere);
    if (a) parts.push(a);
  }

  const items = Object.values(state.items).filter((i) => i.owner === loc.id);
  if (items.length) {
    parts.push(`A la vista: ${items.map((i) => i.name.toLowerCase()).join(', ')}.`);
  }

  const npcs = Object.values(state.npcs).filter((n) => n.present && n.status === 'alive');
  if (npcs.length) {
    parts.push(`${npcs.map((n) => n.name).join(' y ')} ${npcs.length > 1 ? 'están' : 'está'} acá.`);
    const reaccion = reaccionANPCsPresentes(state, npcs[0]!.name.split(' ')[0]!);
    if (reaccion) parts.push(reaccion);
  }

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Un NPC nota cómo llega el investigador, no sólo lo que le pregunta.
 *
 * Antes esto no existía: la interfaz con el mundo era enteramente el diálogo,
 * así que un investigador con una crisis de locura temporal en la ficha
 * seguía recibiendo exactamente las mismas líneas de ambiente que uno
 * perfectamente entero. La ficha existía y nadie la miraba.
 *
 * No es específico de ningún NPC —el motor no sabe quién es Rosa ni quién es
 * Eusebio— así que la reacción es genérica a propósito: cualquier persona que
 * ve entrar a alguien temblando reacciona más o menos así. Lo escrito acá es
 * lo mínimo verificable; una aventura que quiera algo más propio de su NPC
 * puede declarar su propia escena de mayor prioridad y esta ni se ofrece.
 */
function reaccionANPCsPresentes(state: GameState, primerNombre: string): string {
  const inv = state.investigators[state.activeInvestigator];
  // 'mental' es la crisis genérica; 'phobia'/'mania' son las que se llevan
  // sabor propio (ver `keeper/crisis.ts`). Las tres son la misma crisis de
  // locura temporal contada distinto, y las tres ameritan que alguien lo note.
  const crisis = inv?.conditions.find(
    (c) => c.temporary && (c.kind === 'mental' || c.kind === 'phobia' || c.kind === 'mania'),
  );
  if (!crisis) return '';
  return pickVariant(state, [
    `${primerNombre} lo nota apenas entra —algo en cómo se mueve, o en cómo no lo hace— y no dice nada todavía, ` +
    'pero deja de hacer lo que estaba haciendo.',
    `${primerNombre} sigue mirándolo un momento más largo de lo normal antes de volver a lo suyo. No pregunta. ` +
    'Alguien que pregunta espera una respuesta, y por la cara que trae, mejor no.',
    // Última variante: se asienta como estado, no como sobresalto repetido.
    `${primerNombre} ya se acostumbró a la cara que trae desde hace un rato y actúa con normalidad, que es su ` +
    'manera de no hacer más difícil lo que ya es difícil.',
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPUESTAS GENÉRICAS PERO CON SENTIDO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quinta categoría de v0.9 §11: "requiere aclaración".
 * No es un error del motor ni un mensaje de sistema: es el Keeper pidiendo
 * precisión, dentro de la ficción. Nunca rompe la inmersión.
 */
export function needsClarification(state: GameState, whatWasWritten: string): string {
  const loc = state.world.locations[state.world.currentLocation]!;
  const cosas: string[] = [];
  for (const f of loc.features ?? []) cosas.push(f.names[0]!);
  for (const i of Object.values(state.items)) if (i.owner === loc.id) cosas.push(i.name.toLowerCase());
  const npcs = Object.values(state.npcs).filter((n) => n.present).map((n) => n.name);

  const opciones: string[] = [];
  if (cosas.length) opciones.push(`mirar ${cosas.slice(0, 3).join(', ')}`);
  if (npcs.length) opciones.push(`hablar con ${npcs[0]}`);
  const salidas = loc.connections.map((c) => state.world.locations[c]?.name?.toLowerCase()).filter(Boolean);
  if (salidas.length) opciones.push(`ir hacia ${salidas.join(' o ')}`);

  const variantes = [
    `Te quedás un momento sin decidir. ${loc.name} sigue exactamente igual que hace un segundo, esperando.`,
    `El impulso se te queda a mitad de camino. Nada en ${loc.name.toLowerCase()} se mueve para ayudarte.`,
    `Hacés el gesto y lo dejás. Todavía no sabés bien qué estás buscando.`,
  ];

  const cierre = opciones.length
    ? `\n\n(Podrías ${opciones.join(', ')}. O escribí con más detalle qué querés hacer: el motor resuelve lo que pueda ubicar en la escena.)`
    : '';

  return pickVariant(state, variantes) + cierre;
}

/** Acción físicamente imposible en esta escena. Se explica en lenguaje del mundo. */
export function impossible(reason: string): string {
  return reason;
}

/** Acción trivial: ocurre, sin tirada, y el mundo la acusa. */
export function trivial(state: GameState, text: string): string {
  const flavour = umbralFlavour(state);
  return flavour ? `${text}\n\n${flavour}` : text;
}
