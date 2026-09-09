/**
 * PRUEBA DE EL CÍRCULO ROJO — `npm run prueba:circulorojo`
 *
 * Undécima aventura, y la única que no transcurre en el siglo XX. Lo que
 * esta suite protege es lo suyo, no lo que ya cubren la auditoría y las
 * suites del motor:
 *
 *   1. Arranca con SU PROPIO elenco (Juana y fray Mateo), no con Elena y
 *      Tomás — es una campaña suelta, sin herencia hacia ni desde nadie.
 *   2. Los cuatro desenlaces se alcanzan, y cada uno deja su consecuencia
 *      permanente distinta.
 *   3. Los dos hechizos se aprenden acá, en su origen: el que ya existía
 *      («Contar lo que no se puede anotar») y el nuevo de daño
 *      («Cerrarle el paso»).
 *   4. LO SELLADO SIGUE SELLADO: por más que la aventura entera trate de
 *      qué recuperaron y de quién puso la piedra, en ningún texto suyo se
 *      contesta quién hizo el primer aro ni quién levantó la piedra.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { EL_CIRCULO_ROJO } from './scenario/circulorojo.ts';
import { EL_CIRCULO_ROJO_LOGICA } from './scenario/circulorojo.logica.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import contenido from './scenario/circulorojo.contenido.json' with { type: 'json' };
import type { GameState } from './shared/types.ts';

useStore(fileStore);

const noop = () => {};
let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

const invDe = (s: GameState) => s.investigators[s.activeInvestigator]!;

async function jugar(titulo: string, semilla: string, guion: string[]) {
  const id = await createCampaign(EL_CIRCULO_ROJO, titulo, semilla.repeat(64).slice(0, 64));
  for (const intencion of guion) {
    const t = await Turn.open(id);
    if (t.state.ending) break;
    t.submitIntent(intencion, 'p1');
    const r = await runOfflineTurn(t, EL_CIRCULO_ROJO, intencion, noop);
    t.narrate(r.narration, r.options);
    await t.commit();
  }
  return { id, state: (await Turn.open(id)).state };
}

/** Lo mínimo para que los desenlaces estén ofrecidos: piden 3 pistas. */
const JUNTAR_PISTAS = [
  'Leo la instrucción vieja, las dos hojas cosidas',
  'Leo el inventario, los renglones de tres años',
  'Examino el aro recuperado',
  'Voy a la orilla de la laguna',
  'Mirar junco de cerca',
];

async function main() {
  console.log('\nARRANCA CON SU PROPIO ELENCO, NO CON EL DE 1924');
  {
    const { state } = await jugar('CR-ELENCO', 'a', []);
    const nombres = Object.values(state.investigators).map((i) => i.name);
    check('el investigador activo es del Círculo, no Elena ni Tomás',
      /Juana|Mateo/.test(invDe(state).name), invDe(state).name);
    check('ningún investigador de 1924 entró de contrabando',
      !nombres.some((n) => /Elena|Tomás/.test(n)), nombres.join(', '));
    check('la nacionalidad es de la época, no "Argentina"',
      !/Argentina/.test(invDe(state).nationality), invDe(state).nationality);
  }

  console.log('\nLA PIEDRA NEGRA SE PUEDE ENTENDER, Y ENTENDERLA DEJA CONSECUENCIA');
  {
    // La tirada es difícil y depende del d100: se prueban semillas hasta que
    // salga, que es la convención del proyecto para tiradas no determinísticas.
    let entendida: GameState | null = null;
    for (const letra of 'abcdefghijklmnopqrstuvwxyz') {
      const { state } = await jugar(`CR-PIEDRA-${letra}`, letra, [
        'Voy a la orilla de la laguna',
        'Voy al claro de la piedra negra',
        'Qué es esta piedra y para qué la pusieron',
      ]);
      const narrado = state.narrative.map((n) => n.text).join('\n');
      if (/no es un altar/.test(narrado)) { entendida = state; break; }
    }
    check('alguna semilla la entiende bien', entendida !== null);
    if (entendida) {
      const narrado = entendida.narrative.map((n) => n.text).join('\n');
      check('lo dice sin ambigüedad: es un cartel, no un altar', /Es un cartel/.test(narrado));
      check('deja consecuencia permanente de mundo',
        entendida.consequences.some((c) => c.permanent && /no es un altar sino una marca de límite/.test(c.description)),
        entendida.consequences.map((c) => c.description.slice(0, 40)).join(' | '));
      check('y una nota para el jugador que ata con 1679 y con 1926',
        invDe(entendida).knowledge.playerObserved.some((k) => /doscientos cinco años después/i.test(k.statement)),
        JSON.stringify(invDe(entendida).knowledge.playerObserved).slice(0, 120));
    }
  }

  console.log('\nLOS DOS HECHIZOS SE APRENDEN ACÁ, EN SU ORIGEN');
  {
    let conAnotar = false;
    for (const letra of 'abcdefghijklmnopqrstuvwxyz') {
      const { state } = await jugar(`CR-ANOTAR-${letra}`, letra, [
        'Leo la instrucción vieja, las dos hojas cosidas',
        'Sigo los ocho renglones de la instrucción, uno por uno',
      ]);
      if (invDe(state).spellsKnown.some((h) => h.id === 'contar-lo-que-no-se-anota')) { conAnotar = true; break; }
    }
    check('«Contar lo que no se puede anotar» se aprende de la instrucción', conAnotar);

    let conCerrar = false;
    for (const letra of 'abcdefghijklmnopqrstuvwxyz') {
      const { state } = await jugar(`CR-CERRAR-${letra}`, letra, [
        'Leo la instrucción vieja, las dos hojas cosidas',
        'Voy a la orilla de la laguna',
        'Voy al claro de la piedra negra',
        'Qué es esta piedra y para qué la pusieron',
        'Si la piedra marca un borde, el borde se cierra: cerrarle el paso',
      ]);
      if (invDe(state).spellsKnown.some((h) => h.id === 'cerrarle-el-paso')) { conCerrar = true; break; }
    }
    check('«Cerrarle el paso» —el hechizo de daño— se saca de haber entendido la piedra', conCerrar);
  }

  console.log('\nEL PUNZÓN Y EL PRIMER CÍRCULO GRABADO');
  {
    let hecho: GameState | null = null;
    for (const letra of 'abcdefghijklmnopqrstuvwxyz') {
      const { state } = await jugar(`CR-PUNZON-${letra}`, letra, [
        'Voy a la orilla de la laguna',
        'Voy al claro de la piedra negra',
        'Qué es esta piedra y para qué la pusieron',
        'Voy al puesto',
        'Preparo el punzón para grabar',
        'Voy a la orilla de la laguna',
        'Voy a la piedra marcada',
        'Grabo el círculo en la piedra del alto',
      ]);
      const narrado = state.narrative.map((n) => n.text).join('\n');
      if (/El primero tiembla/.test(narrado)) { hecho = state; break; }
    }
    check('se puede fabricar el punzón y grabar con él el primer círculo', hecho !== null);
    if (hecho) {
      check('el punzón queda en manos del investigador',
        Object.values(hecho.items).some((i) => i.armaId === 'punzon-circulo' && i.carried));
      check('el primer círculo deja consecuencia permanente',
        hecho.consequences.some((c) => c.permanent && /primer círculo/.test(c.description)));
    }
  }

  console.log('\nLOS CUATRO DESENLACES SE ALCANZAN');
  {
    const finales: Array<{ intencion: string; id: string }> = [
      { intencion: 'Lo devuelvo al agua, donde estaba', id: 'guardar' },
      { intencion: 'Dejo la costumbre escrita para los que vengan', id: 'anotar' },
      { intencion: 'Se termina el Círculo: nos separamos y no queda nada escrito', id: 'dispersar' },
    ];
    for (const f of finales) {
      const { state } = await jugar(`CR-FIN-${f.id}`, 'f', [...JUNTAR_PISTAS, f.intencion]);
      check(`«${f.id}» se alcanza`, state.ending?.id === f.id, JSON.stringify(state.ending?.title));
      check(`«${f.id}» deja consecuencia permanente de mundo`,
        state.consequences.some((c) => c.permanent && c.scope === 'world'),
        state.consequences.map((c) => c.scope).join(', '));
    }

    // El de la corrección pide además haber visto al chico.
    const { state } = await jugar('CR-FIN-corregir', 'g', [
      ...JUNTAR_PISTAS,
      'Voy al puesto',
      'Voy al rancho de los Quiroga',
      'Mirar cuna de cerca',
      'Dejo escrito lo del chico, y cómo se corrige',
    ]);
    check('«corregir» se alcanza tras ver al chico', state.ending?.id === 'corregir', JSON.stringify(state.ending?.title));
    check('«corregir» cierra el cabo de 1895 en el texto del desenlace',
      /M\. de F\./.test(JSON.stringify(state.ending?.text ?? '')));
  }

  console.log('\nLO SELLADO SIGUE SELLADO');
  {
    // El texto entero de la aventura —contenido y prosa de escenas— no puede
    // contestar quién hizo el primer aro ni quién levantó la piedra. Se
    // revisa el JSON crudo y también la prosa que producen las escenas.
    const crudo = JSON.stringify(contenido);
    const prosa = EL_CIRCULO_ROJO_LOGICA
      .map((e) => {
        try {
          const efecto = e.resolver({
            estado: { activeInvestigator: 'inv-juana' } as unknown as GameState,
            tirada: { exito: true, grado: 'regular', numero: 50 },
            intencion: {} as never,
          } as never);
          return JSON.stringify(efecto);
        } catch { return ''; }
      })
      .join('\n');
    const todo = `${crudo}\n${prosa}`;

    check('no nombra al Primer Rostro', !/[Pp]rimer [Rr]ostro/.test(todo));
    check('no nombra a Puddock ni al Archivista', !/Puddock|Archivista/.test(todo));
    check('no afirma quién hizo el primer aro',
      !/(hizo|fabric|forj|constru)\w*\s+el\s+primer\s+(aro|anillo)/i.test(todo));
    check('lo que dice del origen del aro es que NO se sabe',
      /no sé si es el primero/.test(todo) || /no dice de quién/.test(todo));
    check('los que levantaron la piedra quedan sin nombre',
      /sin nombre|no dejó nombre|no dejaron nombre/.test(todo));
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
