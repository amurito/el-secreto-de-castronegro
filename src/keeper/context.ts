/**
 * ENSAMBLADO DE CONTEXTO POR PERMISOS.
 *
 * El Keeper no recibe "el estado": recibe una VISTA construida por el motor.
 * Lo que no está acá no puede filtrarse — no hay superficie de ataque.
 * Análisis Técnico v1.1 §7.1.
 *
 * NUNCA se incluye:
 *   · nada con disclosure === 'SEALED'
 *   · investigator.knowledge.playerObserved
 *   · hypothesis.actualTruth
 *   · la semilla del RNG
 */

import type { GameState } from '../shared/types.ts';
import type { Scenario, KeeperBriefing } from '../scenario/types.ts';
import { describeUmbral } from '../rules/umbral.ts';
import { describeHealth, describeSanity } from '../rules/derived.ts';
import { labelFor } from '../rules/skills.ts';

export function buildVolatileContext(
  state: GameState,
  scenario: Scenario,
  briefing: KeeperBriefing,
): string {
  const inv = state.investigators[state.activeInvestigator]!;
  const loc = state.world.locations[state.world.currentLocation]!;

  const sections: string[] = [];

  // ── ESCENARIO (secreto del Keeper) ──
  sections.push(
    `## ESCENARIO EN CURSO — «${scenario.title}»\n` +
    `CASO VISIBLE: ${scenario.surfacePremise}\n\n` +
    `SECRETO DEL KEEPER — la verdad de esta aventura. Es para que arbitres, no para narrar:\n${briefing.deepTruth}\n\n` +
    `NO PUEDE APARECER EN ESTA AVENTURA, bajo ninguna circunstancia:\n` +
    briefing.sealedFromKeeper.map((s) => `· ${s}`).join('\n') + '\n\n' +
    `GUÍA DE DIRECCIÓN:\n${briefing.guidance}`,
  );

  // ── FICHA ──
  const skills = Object.entries(inv.skills)
    .filter(([, v]) => v.base > 0)
    .sort((a, b) => b[1].base - a[1].base)
    .map(([k, v]) => `${k} ${v.base}%`)
    .join(' · ');

  const chars = Object.entries(inv.characteristics).map(([k, v]) => `${k} ${v}`).join(' · ');

  sections.push(
    `## INVESTIGADOR ACTIVO — valores autoritativos del motor\n` +
    `${inv.name}, ${inv.age}, ${inv.occupation}. ${inv.description}\n` +
    `Características: ${chars}\n` +
    `PV ${inv.derived.hp}/${inv.derived.maxHp} (${describeHealth(inv.derived)}) · ` +
    `SAN ${inv.derived.san}/${inv.derived.maxSan} (${describeSanity(inv.derived)}) · ` +
    `PM ${inv.derived.mp}/${inv.derived.maxMp} · Suerte ${inv.derived.luck}\n` +
    `${describeUmbral(inv.umbral)}\n` +
    `Habilidades: ${skills}\n` +
    (inv.conditions.length
      ? `Condiciones activas: ${inv.conditions.map((c) => `${c.name} (${c.description})`).join('; ')}\n`
      : '') +
    `\nEstos números son los reales. No los cites en tu narración: la interfaz ya los muestra.`,
  );

  // ── ESCENA ──
  const itemsHere = Object.values(state.items).filter(
    (i) => i.owner === loc.id || (i.owner === inv.id && i.carried),
  );
  const itemLines = itemsHere.map((i) => {
    const where = i.owner === inv.id ? 'LLEVA ENCIMA' : 'en la escena';
    const known = i.publicProperties.map((p) => p.description).join(' ');
    const discovered = i.discoveredProperties
      .map((d) => {
        const all = [...i.hiddenProperties, ...i.conditionalProperties, ...i.temporalProperties];
        return all.find((p) => p.id === d.propertyId)?.description;
      })
      .filter(Boolean);
    const hidden = [...i.hiddenProperties, ...i.conditionalProperties]
      .filter((p) => !i.discoveredProperties.some((d) => d.propertyId === p.id))
      .filter((p) => p.disclosure !== 'SEALED')
      .map((p) => {
        const c = p.discoveryCondition ?? (p as { trigger?: unknown }).trigger;
        return `      [OCULTA · id=${p.id}] ${p.description}\n      condición: ${JSON.stringify(c)}`;
      });
    return (
      `  · ${i.name} [id=${i.id}] (${where})\n` +
      `    ${known}\n` +
      (discovered.length ? `    YA DESCUBIERTO: ${discovered.join(' ')}\n` : '') +
      (hidden.length ? `${hidden.join('\n')}\n` : '')
    );
  });

  const npcsHere = Object.values(state.npcs).filter((n) => n.present);
  const npcLines = npcsHere.map((n) => {
    const secrets = n.secrets
      .filter((s) => s.disclosure !== 'SEALED' && !s.revealed)
      .map((s) => `      [SECRETO · gate: ${s.revealGate ?? 'ninguno'}] ${s.content}`);
    return (
      `  · ${n.name} [id=${n.id}] — actitud hacia el investigador: ${n.attitude[inv.id] ?? 0}\n` +
      `    ${n.description}\n` +
      `    Quiere: ${n.motivation}\n` +
      `    Teme: ${n.fears.join(' | ')}\n` +
      `    SE NIEGA A: ${n.refusals.join(' | ')}\n` +
      `    Sabe: ${n.knowledge.map((k) => `${k.statement} [${k.reliability}]`).join(' // ')}\n` +
      (secrets.length ? `${secrets.join('\n')}\n` : '')
    );
  });

  sections.push(
    `## ESCENA ACTUAL\n` +
    `Lugar: ${loc.name} [id=${loc.id}]\n${loc.description}\n` +
    `Atmósfera disponible (usá lo que sirva, no todo): ${loc.atmosphere.join(' | ')}\n` +
    `Conexiones: ${loc.connections.join(', ')}\n` +
    `NOTAS DEL KEEPER SOBRE ESTE LUGAR: ${briefing.locationNotes[loc.id] ?? loc.keeperNotes ?? '—'}\n` +
    `Intensidad del fenómeno acá: ${loc.umbralIntensity}/10\n` +
    `Hora: ${state.world.time.display} · Permeabilidad del mundo: ${state.world.umbralPermeability}/100\n\n` +
    `OBJETOS AL ALCANCE:\n${itemLines.join('') || '  (ninguno)'}\n` +
    `PERSONAJES PRESENTES:\n${npcLines.join('') || '  (ninguno)'}`,
  );

  // ── DOCUMENTOS DISPONIBLES ──
  const docs = Object.values(state.documents);
  const docLines = docs.map((d) =>
    `  · «${d.title}» [id=${d.id}] — ${d.obtainedAt ? 'YA ENTREGADO al jugador' : 'todavía no entregado'} · ` +
    `autenticidad ${d.authenticity} · exactitud ${d.accuracy}`,
  );
  sections.push(`## DOCUMENTOS DEL ESCENARIO\n${docLines.join('\n')}`);

  // ── TABLERO (sólo lo que el investigador puede saber) ──
  const b = state.board;
  sections.push(
    `## TABLERO DE INVESTIGACIÓN\n` +
    `HECHOS (${b.facts.length}): ${b.facts.map((f) => f.statement).join(' // ') || '—'}\n` +
    `PISTAS (${b.clues.length}): ${b.clues.map((c) => `[${c.kind}] ${c.description}`).join(' // ') || '—'}\n` +
    `HIPÓTESIS (${b.hypotheses.length}): ${b.hypotheses.map((h) => `${h.statement} [${h.status}]`).join(' // ') || '—'}\n` +
    `CONTRADICCIONES (${b.contradictions.length}): ${b.contradictions.map((c) => c.description).join(' // ') || '—'}\n` +
    `PREGUNTAS ABIERTAS (${b.questions.length}): ${b.questions.map((q) => q.question).join(' // ') || '—'}`,
  );

  // ── CONSECUENCIAS: lo que el mundo recuerda ──
  if (state.consequences.length) {
    sections.push(
      `## ★ EL MUNDO RECUERDA — consecuencias en vigor\n` +
      `Esto ya ocurrió y sigue siendo cierto. Tenelo en cuenta en todo lo que narres:\n` +
      state.consequences.map((c) => `· ${c.worldReminder}`).join('\n'),
    );
  }

  // ── TIRADAS RECIENTES ──
  const recentRolls = state.rolls.slice(-4);
  if (recentRolls.length) {
    sections.push(
      `## TIRADAS RECIENTES (registro inmutable — no las contradigas)\n` +
      recentRolls.map((r) =>
        `· ${r.commitment.skillLabel} ${r.commitment.baseValue}% ${r.commitment.difficulty} → ` +
        `D100=${r.execution.rawResult} ${r.execution.degree} — ${r.commitment.reason}`,
      ).join('\n'),
    );
  }

  // ── CONOCIMIENTO DEL INVESTIGADOR ──
  if (inv.knowledge.investigator.length) {
    sections.push(
      `## LO QUE SABE EL INVESTIGADOR\n` +
      inv.knowledge.investigator.map((k) => `· ${k.statement}`).join('\n') +
      `\n\nSólo esto. Lo que sepa el jugador y no esté en esta lista, el personaje NO lo sabe.`,
    );
  }

  // ── LÍNEA TEMPORAL ──
  const knownEvents = state.world.timeline.filter((t) => t.canon.disclosure !== 'SEALED');
  if (knownEvents.length) {
    sections.push(
      `## LÍNEA TEMPORAL\n` +
      knownEvents.map((t) => `· [${t.category}] ${t.when.display}: ${t.description}`).join('\n'),
    );
  }

  return sections.join('\n\n');
}

/** Historial narrativo reciente, para la ventana de mensajes. */
export function recentNarrative(state: GameState, n = 12): Array<{ role: 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const entry of state.narrative.slice(-n)) {
    if (entry.kind === 'player') out.push({ role: 'user', content: entry.text });
    else if (entry.kind === 'keeper') out.push({ role: 'assistant', content: entry.text });
  }
  // La API exige que el primer mensaje sea del usuario.
  while (out.length && out[0]!.role === 'assistant') out.shift();
  return out;
}
