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
import { resolveD100, combineD100 } from './rules/dice.ts';
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
  //
  // Las excepciones son todas de la MISMA familia y conviene decirlo en voz
  // alta, porque si no cada una parece un permiso suelto: son procedimientos
  // de resultado determinado. No se resuelven percibiendo mejor —que es lo
  // que un dado modela— sino ejecutando un procedimiento que da lo que da.
  // Pedirles tirada sería decir que a veces dos fotos no se parecen si el
  // investigador tuvo mala suerte.
  const examinarSinDado = filas.filter(
    (f) => ['examinar', 'mirar', 'buscar'].includes(f.verbo) && !f.skill
      // Comparar dos fotos no se resuelve mirando más: se resuelve comparando.
      && !/compar/i.test(f.etiqueta)
      // Mirar una fotografía cuyo secreto sale de la comparación tampoco.
      && !/fotograf/i.test(f.etiqueta)
      // Medir con una regla: la distancia entre dos puntos es la que es.
      // En El Orden Debido hay además una segunda razón, que es la regla de
      // diseño que este proyecto ya arregló dos veces por bug reportado
      // jugando: Delfina YA dijo en voz alta que los puntos avanzan al
      // oeste, así que una tirada acá podría ocultarle al jugador lo que un
      // NPC acaba de anunciarle. Lo que la escena agrega —el arco, y el
      // vacío en el centro— es el resultado de medir, no de mirar mejor.
      // OJO: esto no exime a nada que YA tire. «Medir la separación de los
      // pernos» pide Mecánica y la sigue pidiendo: ahí lo incierto no es la
      // medida, es saber qué torre la usa.
      && !/\bregla\b/i.test(f.etiqueta),
  );
  for (const f of examinarSinDado) console.log(`   ⚠ ${f.aventura}: «${f.etiqueta}» sin tirada`);
  check('examinar algo siempre pide un dado, salvo procedimientos de resultado determinado',
    examinarSinDado.length === 0, `${examinarSinDado.length}`);

  // ── 4. Qué dado de decenas queda en pie ──────────────────────────────────
  //
  // La interfaz señala cuál de los dados de decenas ganó cuando hay
  // bonificación o penalización. Si ese índice y el número que muestra el
  // motor discreparan, el jugador vería un dado marcado y un resultado que no
  // sale de él: exactamente la clase de incoherencia que este proyecto no se
  // puede permitir, porque el registro es auditable y la contradicción sería
  // visible. Se verifica que salgan del mismo cálculo.
  console.log('\n4. EL DADO DE DECENAS QUE QUEDA EN PIE');
  const casos: Array<[string, number, number[], 'none' | 'bonus' | 'penalty', number, number]> = [
    // nombre                        unidades, decenas,   modo,       result, chosen
    ['sin modificador usa el primero',      4, [5],        'none',        54, 0],
    ['bonificación toma el más bajo',       3, [6, 4],     'bonus',       43, 1],
    ['penalización toma el más alto',       3, [6, 4],     'penalty',     63, 0],
    ['dos de bonificación, gana el menor',  0, [9, 3, 7],  'bonus',       30, 1],
    ['dos de penalización, gana el mayor',  0, [9, 3, 7],  'penalty',     90, 0],
    // 00 + 0 vale 100, y eso no puede romper la elección del ganador.
    ['el cero doble vale 100 y se elige',   0, [0, 5],     'bonus',       50, 1],
    ['el cero doble es el peor resultado',  0, [0, 5],     'penalty',    100, 0],
  ];
  for (const [nombre, u, decenas, modo, esperado, ganador] of casos) {
    const r = resolveD100(u, decenas, modo);
    check(nombre, r.result === esperado && r.chosen === ganador,
      `${r.result} con el dado ${r.chosen} (${decenas[r.chosen]! * 10})`);
  }
  // Y que el atajo no se despegue nunca del cálculo completo.
  let coinciden = true;
  for (let u = 0; u <= 9; u++) {
    for (let a = 0; a <= 9; a++) {
      for (let b = 0; b <= 9; b++) {
        for (const modo of ['none', 'bonus', 'penalty'] as const) {
          const r = resolveD100(u, [a, b], modo);
          if (combineD100(u, [a, b], modo) !== r.result) coinciden = false;
          if (r.result !== (([a, b][r.chosen]! * 10 + u) || 100)) coinciden = false;
        }
      }
    }
  }
  check('en las 3.000 combinaciones, el ganador explica el resultado', coinciden);

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
