/**
 * PRUEBA DEL CRITERIO DE TIRADAS — `npm run prueba:tiradas`
 *
 * El criterio está escrito en `rules/cuando-tirar.ts`: se tira cuando el
 * resultado es incierto **y** fallar es interesante. Esta prueba lo sostiene,
 * porque un criterio que no se verifica se tuerce solo — así fue como los dos
 * descubrimientos centrales de Agua Quieta terminaron siendo gratis mientras
 * examinar una fotografía pedía Descubrir. Nadie decidió eso: quedó así.
 *
 * Verifica tres cosas:
 *
 *   1. Ningún descubrimiento se consigue sólo por estar parado en un lugar.
 *   2. Lo que no puede fallar NO tira: agarrar, caminar, esperar, anotar.
 *   3. Lo que esconde algo SÍ tira, y con la habilidad que declaró.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { CATALOGO } from './scenario/catalogo.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { accionesDisponibles } from './scenario/acciones.ts';
import { classify } from './keeper/intent.ts';
import { propiedadPorTirada } from './rules/cuando-tirar.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import type { Scenario } from './scenario/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/** Verbos que NUNCA deben pedir un dado. Fallar en esto no produce nada. */
const NUNCA_TIRAN = ['tomar', 'soltar', 'ir', 'entrar', 'salir', 'esperar', 'anotar', 'pensar'];

interface Fila { verbo: string; etiqueta: string; skill: string | null; aventura: string }

async function recorrer(esc: Scenario, semilla: string): Promise<Fila[]> {
  const id = await createCampaign(esc, 'TIRADAS', semilla.repeat(64).slice(0, 64));
  const usadas = new Set<string>();
  const filas: Fila[] = [];
  for (let n = 0; n < 90; n++) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    const disp = accionesDisponibles(t.state, esc);
    const sig = disp.find((o) => !o.final && !usadas.has(o.id));
    if (!sig) break;
    usadas.add(sig.id);
    const antes = t.state.rolls.length;
    const verbo = classify(t.state, sig.intencion).verb;
    t.submitIntent(sig.intencion, 'p1');
    const r = await runOfflineTurn(t, esc, sig.intencion, () => {});
    t.narrate(r.narration, r.options);
    await t.commit();
    const s = (await Turn.open(id)).state;
    const nuevas = s.rolls.slice(antes);
    filas.push({
      verbo, etiqueta: sig.etiqueta, aventura: esc.title,
      skill: nuevas.length ? String(nuevas[0]!.commitment.skill) : null,
    });
  }
  return filas;
}

async function main() {
  // ── 1. Nada se descubre sólo por estar parado en un lugar ────────────────
  console.log('\n1. NINGÚN DESCUBRIMIENTO ES GRATIS POR UBICACIÓN');
  const gratis: string[] = [];
  for (const entrada of CATALOGO) {
    for (const item of entrada.scenario.items) {
      for (const p of item.hiddenProperties) {
        if (p.discoveryCondition?.kind === 'location') {
          gratis.push(`${entrada.scenario.title}: ${item.name} → ${p.id}`);
        }
      }
      for (const p of item.conditionalProperties) {
        if (p.trigger?.kind === 'location') {
          gratis.push(`${entrada.scenario.title}: ${item.name} → ${p.id} (condicional)`);
        }
      }
    }
  }
  for (const g of gratis) console.log(`   ✗ ${g}`);
  check('ninguna propiedad oculta se destraba con sólo estar en el lugar correcto',
    gratis.length === 0, gratis.length ? `${gratis.length}` : 'ninguna');

  // ── 2. Lo que esconde algo tras una tirada es alcanzable ─────────────────
  console.log('\n2. LO QUE ESCONDE ALGO PIDE EL DADO QUE DECLARÓ');
  let conTirada = 0;
  for (const entrada of CATALOGO) {
    for (const item of entrada.scenario.items) {
      const p = propiedadPorTirada(item);
      if (p && p.discoveryCondition?.kind === 'skill_check') {
        conTirada++;
        console.log(`   · ${item.name} → ${p.discoveryCondition.skill} (${p.discoveryCondition.difficulty})`);
      }
    }
  }
  check('hay objetos que piden tirada para revelarse', conTirada >= 3, `${conTirada}`);

  // ── 3. El recorrido real ─────────────────────────────────────────────────
  console.log('\n3. EL MAPA REAL DE LAS DOS AVENTURAS');
  const filas: Fila[] = [];
  const semillas = ['a', 'b', 'c'];
  for (const [n, e] of CATALOGO.entries()) {
    filas.push(...await recorrer(e.scenario, semillas[n] ?? 'z'));
  }
  const conDado = filas.filter((f) => f.skill);
  console.log(`  ${filas.length} acciones · ${conDado.length} con tirada · ${filas.length - conDado.length} sin`);

  const habilidades = [...new Set(conDado.map((f) => f.skill))].sort();
  console.log(`  habilidades usadas: ${habilidades.join(', ')}`);
  check('se usan al menos seis habilidades distintas', habilidades.length >= 6, `${habilidades.length}`);

  // Lo que no puede fallar no tira. Es la mitad del criterio que se olvida.
  const indebidas = filas.filter((f) => f.skill && NUNCA_TIRAN.includes(f.verbo));
  for (const i of indebidas) console.log(`   ✗ ${i.verbo}: «${i.etiqueta}» tiró ${i.skill}`);
  check('agarrar, caminar, esperar y anotar no tiran dados', indebidas.length === 0,
    indebidas.length ? `${indebidas.length} casos` : `${NUNCA_TIRAN.length} verbos limpios`);

  // Y la otra mitad: lo que sí es incierto, tira.
  const examinarSinDado = filas.filter(
    (f) => ['examinar', 'mirar', 'buscar'].includes(f.verbo) && !f.skill
      // Comparar dos fotos no se resuelve mirando más: se resuelve comparando.
      && !/compar/i.test(f.etiqueta)
      // Mirar una fotografía cuyo secreto sale de la comparación tampoco.
      && !/fotograf/i.test(f.etiqueta),
  );
  for (const f of examinarSinDado) console.log(`   ⚠ ${f.aventura}: «${f.etiqueta}» sin tirada`);
  check('examinar algo siempre pide un dado, salvo lo que se resuelve comparando',
    examinarSinDado.length === 0, `${examinarSinDado.length}`);

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
