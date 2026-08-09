/**
 * CLASIFICADOR DE INTENCIÓN — sin modelo de lenguaje.
 *
 * Descompone lo que escribe el jugador en VERBO + OBJETIVO + MATICES, y lo
 * clasifica en las cinco categorías de v0.9 §11:
 *
 *   trivial · narrativa · con tirada · imposible · requiere aclaración
 *
 * No pretende entender lenguaje natural. Pretende cubrir el repertorio de
 * verbos con los que la gente juega un juego de investigación, que es un
 * conjunto sorprendentemente acotado.
 */

import type { GameState, LocationFeature, Item, Npc, LocationId } from '../shared/types.ts';

export type Verb =
  | 'mirar' | 'examinar' | 'buscar'
  | 'escuchar' | 'oler' | 'tocar'
  | 'tomar' | 'soltar' | 'usar'
  | 'hablar' | 'preguntar' | 'mostrar' | 'mentir'
  | 'ir' | 'entrar' | 'salir' | 'bajar' | 'subir'
  | 'romper' | 'forzar' | 'cavar' | 'tapar'
  | 'gritar' | 'llamar' | 'esperar' | 'dormir'
  | 'anotar' | 'pensar' | 'irse'
  | 'atacar' | 'meta' | 'desconocido';

export interface Intent {
  raw: string;
  norm: string;
  verb: Verb;
  /** A qué apunta la acción, si se pudo resolver. */
  target:
    | { kind: 'feature'; feature: LocationFeature }
    | { kind: 'item'; item: Item }
    | { kind: 'npc'; npc: Npc }
    | { kind: 'location'; id: LocationId }
    | { kind: 'water' }
    | { kind: 'self' }
    | { kind: 'none' };
  /**
   * `true` si el verbo se reconoció en el texto; `false` si se dedujo del
   * objetivo. "bailo un malambo arriba del brocal" nombra un lugar pero el
   * verbo no es de movimiento: sin esta distinción, el motor caminaría.
   */
  verbExplicit: boolean;
  /** El jugador pidió hacerlo de forma sostenida, insistente o cuidadosa. */
  sustained: boolean;
  /** Tema de conversación detectado. */
  topic: string | null;
  /**
   * Destino, calculado aparte del objetivo. "Voy a la laguna" tiene como
   * objetivo el agua Y como destino la orilla: si sólo se guarda uno, el
   * movimiento se pierde.
   */
  destination: LocationId | null;
}

/** Verbos que se dirigen a una persona: priorizan el NPC sobre cualquier cosa. */
const SPEECH: Verb[] = ['hablar', 'preguntar', 'mostrar', 'mentir'];

export function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

const anyOf = (t: string, words: string[]) => words.some((w) => t.includes(w));

/**
 * Los verbos se buscan por raíz, pero SÓLO al principio de una palabra.
 *
 * Sin esto, la raíz `baj` de "bajar" matchea dentro de "de·baj·o" y
 * "miro debajo del colchón" se interpreta como bajar al aljibe. Un bug real,
 * encontrado por la prueba de acción libre.
 */
function hasStem(t: string, stem: string): boolean {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}`).test(t);
}
const anyStem = (t: string, stems: string[]) => stems.some((s) => hasStem(t, s));

const VERBS: Array<[Verb, string[]]> = [
  ['meta', ['segui', 'seguir', 'continua', 'continuar', 'y despues', 'que pasa', 'dale', 'ok', 'listo']],
  // 'con atención', 'detenidamente' y 'de cerca' NO van acá: son marcadores de
  // intensidad (ver SUSTAINED), no verbos. Tenerlos como verbo hacía que
  // "escucho con atención" se resolviera como examinar el lugar.
  ['examinar', ['examin', 'inspeccion', 'estudi', 'reviso', 'revisar', 'analiz']],
  ['buscar', ['busc', 'rastre', 'registr', 'hurg', 'revuelv']],
  ['escuchar', ['escuch', 'oigo', 'oir', 'presto atencion al sonido', 'agudizo el oido']],
  ['oler', ['huel', 'oler', 'olfate', 'aroma']],
  ['tocar', ['toc', 'palp', 'tante', 'acaricio', 'paso la mano', 'siento la textura']],
  ['tomar', ['agarr', 'tom', 'llev', 'guard', 'levanto', 'recojo', 'me quedo con', 'alzo']],
  ['soltar', ['suelto', 'dejo', 'devuelvo', 'apoyo']],
  ['mostrar', ['muestro', 'mostrar', 'le enseño', 'le ense']],
  ['mentir', ['mien', 'engan', 'le digo que no', 'oculto']],
  ['preguntar', ['pregunt', 'le consulto', 'indago', 'interrog']],
  ['hablar', ['habl', 'converso', 'le digo', 'le cuento', 'charl', 'dialog', 'saludo']],
  ['bajar', ['baj', 'descend', 'me meto en el aljibe', 'entro al aljibe', 'entro al agua', 'me sumerjo']],
  ['subir', ['sub', 'trep', 'escalo']],
  ['irse', ['me voy', 'irme', 'abandono', 'me marcho', 'vuelvo al pueblo', 'me retiro', 'huyo', 'escapo']],
  ['ir', ['voy', 'ir a', 'camino', 'me dirijo', 'avanzo', 'vuelvo', 'regreso']],
  ['entrar', ['entro', 'paso a', 'ingreso']],
  ['salir', ['salgo', 'me asomo afuera']],
  ['tapar', ['tap', 'sell', 'clausur', 'cubro', 'relleno', 'lleno el', 'cierro el']],
  ['romper', ['romp', 'destroz', 'quiebro', 'parto', 'hago pedazos']],
  ['forzar', ['fuerzo', 'forzar', 'abro a la fuerza', 'palanque']],
  ['cavar', ['cav', 'excav', 'escarb']],
  ['gritar', ['grit', 'chillo', 'vociferar']],
  ['llamar', ['llam', 'lo llamo', 'la llamo', 'digo su nombre']],
  ['esperar', ['esper', 'aguardo', 'me quedo quieto', 'no hago nada', 'dejo pasar']],
  ['dormir', ['duerm', 'dormir', 'me acuesto', 'descanso']],
  ['anotar', ['anot', 'escrib', 'apunto', 'registro en mi']],
  ['pensar', ['pienso', 'reflexion', 'razono', 'deduzco', 'ato cabos']],
  ['atacar', ['atac', 'golpe', 'pego', 'disparo', 'agredo']],
  ['usar', ['uso', 'utilizo', 'empleo', 'aplico', 'pruebo con', 'sostengo', 'acerco']],
  ['mirar', ['mir', 'observ', 'veo', 'ver ', 'contempl', 'me asom', 'echo un vistazo', 'atisbo']],
];

const SUSTAINED = ['minuto', 'rato', 'largo', 'fijamente', 'sostenid', 'un buen', 'sin parpad',
  'hasta que', 'detenidamente', 'con atencion', 'de cerca', 'insisto', 'otra vez', 'de nuevo'];

const WATER = ['agua', 'reflejo', 'aljibe', 'pozo', 'laguna', 'superficie', 'espejo de agua'];

const LOCATIONS: Array<[LocationId, string[]]> = [
  ['patio', ['patio', 'afuera', 'aljibe', 'pozo', 'brocal']],
  ['casa', ['casa', 'cocina', 'adentro', 'comedor']],
  ['cuarto', ['cuarto', 'habitacion', 'pieza', 'dormitorio']],
  ['orilla', ['laguna', 'orilla', 'costa', 'pastizal']],
];

const TOPICS: Array<[string, string[]]> = [
  ['soga', ['soga', 'roldana', 'cuerda', 'polea']],
  ['ignacio', ['ignacio', 'desaparic', 'esa noche', 'ultima vez', 'que paso', 'el marido', 'el hombre']],
  ['aljibe', ['aljibe', 'agua', 'pozo', 'reflejo']],
  ['reloj', ['reloj', 'cuatro y veinte', 'hora']],
  ['1897', ['1897', 'foto vieja', 'fotografia vieja', 'la familia', 'antes', 'los viejos']],
  ['hermano', ['hermano', 'familia de ignacio', 'pariente']],
  ['ella', ['usted', 'vos que', 'que vio', 'lo que vio', 'tiene miedo', 'por que no sale']],
  ['deuda', ['plata', 'deuda', 'debia', 'dinero']],
];

export function classify(state: GameState, raw: string): Intent {
  const t = norm(raw);
  const loc = state.world.locations[state.world.currentLocation]!;

  // ── VERBO ────────────────────────────────────────────────────────────────
  let verb: Verb = 'desconocido';
  for (const [v, keys] of VERBS) {
    if (anyStem(t, keys)) { verb = v; break; }
  }

  // ── DESTINO (independiente del objetivo) ─────────────────────────────────
  let destination: LocationId | null = null;
  for (const [id, names] of LOCATIONS) {
    if (id !== state.world.currentLocation && anyOf(t, names)) { destination = id; break; }
  }

  // ── OBJETIVO ─────────────────────────────────────────────────────────────
  let target: Intent['target'] = { kind: 'none' };

  // 0. Hablarle a alguien apunta a la persona, aunque el tema nombre un objeto.
  //    "Le pregunto a Rosa por la soga" es hablar con Rosa, no mirar la soga.
  if (SPEECH.includes(verb)) {
    const present = Object.values(state.npcs).filter((n) => n.present && n.status === 'alive');
    const named = present.find((n) => t.includes(norm(n.name.split(' ')[0]!)));
    if (named) target = { kind: 'npc', npc: named };
    else if (present.length === 1) target = { kind: 'npc', npc: present[0]! };
  }

  // 1. Detalles examinables de esta localización (lo más específico primero).
  if (target.kind === 'none') {
    for (const f of loc.features ?? []) {
      if (f.names.some((n) => t.includes(norm(n)))) { target = { kind: 'feature', feature: f }; break; }
    }
  }

  // 2. Objetos al alcance.
  if (target.kind === 'none') {
    const inv = state.investigators[state.activeInvestigator]!;
    const reachable = Object.values(state.items).filter((i) => i.owner === loc.id || i.owner === inv.id);
    const byName: Array<[string[], string]> = [
      [['reloj de bolsillo', 'reloj'], 'it-reloj'],
      [['espejo de mano', 'espejo'], 'it-espejo'],
      [['farol', 'lampara', 'lámpara'], 'it-farol'],
      [['placa', 'fotografia de ignacio', 'foto de ignacio', 'foto dada vuelta', 'fotografia dada vuelta'], 'it-fotoreciente'],
      [['retrato', 'foto vieja', 'fotografia vieja', 'fotografia enmarcada', '1897', 'foto de la familia'], 'it-foto1897'],
    ];
    for (const [names, id] of byName) {
      if (names.some((n) => t.includes(norm(n)))) {
        const item = reachable.find((i) => i.id === id) ?? state.items[id];
        if (item) { target = { kind: 'item', item }; break; }
      }
    }
    // Genérico: "fotografía" a secas.
    if (target.kind === 'none' && anyOf(t, ['foto', 'fotografia', 'imagen'])) {
      const item = state.items['it-fotoreciente'];
      if (item) target = { kind: 'item', item };
    }
  }

  // 3. Personajes presentes.
  if (target.kind === 'none') {
    for (const n of Object.values(state.npcs)) {
      if (!n.present) continue;
      const first = norm(n.name.split(' ')[0]!);
      if (t.includes(first) || anyOf(t, ['ella', 'la mujer', 'la casera', 'la señora', 'la senora'])) {
        target = { kind: 'npc', npc: n };
        break;
      }
    }
  }

  // 4. El agua, que es su propia categoría en esta aventura.
  if (target.kind === 'none' && anyOf(t, WATER)) target = { kind: 'water' };

  // 5. Otra localización.
  if (target.kind === 'none' && destination) target = { kind: 'location', id: destination };

  // 6. Uno mismo.
  if (target.kind === 'none' && anyOf(t, ['mis manos', 'me miro', 'mi cara', 'mi reflejo', 'mi ficha', 'mi estado'])) {
    target = { kind: 'self' };
  }

  // ── MATICES ──────────────────────────────────────────────────────────────
  const sustained = anyOf(t, SUSTAINED);
  let topic: string | null = null;
  for (const [id, keys] of TOPICS) {
    if (anyOf(t, keys)) { topic = id; break; }
  }

  // Verbo implícito según el objetivo, cuando no se reconoció ninguno.
  const verbExplicit = verb !== 'desconocido';
  if (verb === 'desconocido') {
    if (target.kind === 'location') verb = 'ir';
    else if (target.kind === 'npc') verb = 'hablar';
    else if (target.kind === 'feature' || target.kind === 'item' || target.kind === 'water') verb = 'mirar';
  }

  return { raw, norm: t, verb, verbExplicit, target, sustained, topic, destination };
}
