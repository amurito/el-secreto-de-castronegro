/**
 * PRUEBA DEL VALIDADOR DE CONTENIDO — `npm run prueba:contenido`
 *
 * Misma idea que `auditarLaAuditoria` en `prueba-auditoria.ts`: un validador
 * que pasa a la primera no demostró nada — puede estar mirando para otro
 * lado. Acá se le rompe una cosa por vez a una copia del contenido real y se
 * verifica que la encuentre, con el campo nombrado en el mensaje.
 *
 * Cada caso es un error que HOY, con el contenido en TypeScript, compilaría
 * perfecto y se descubriría jugando: un id mal tipeado dentro de una función
 * es una cadena, y a una cadena nadie la revisa.
 */

import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { validarContenido, ContenidoInvalido } from './scenario/validarContenido.ts';
import { cargarAventura } from './scenario/cargarAventura.ts';
import { AGUA_QUIETA_LOGICA } from './scenario/aguaquieta.logica.ts';
import { ELENA, TOMAS } from './scenario/pregens.ts';
import type { ContenidoAventura } from './scenario/contenido.schema.ts';
import crudo from './scenario/agua-quieta.contenido.json' with { type: 'json' };

const SANO = crudo as unknown as ContenidoAventura;

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

/** Copia profunda: romper una copia no puede ensuciar el contenido real. */
const copia = (): ContenidoAventura => JSON.parse(JSON.stringify(SANO)) as ContenidoAventura;

/**
 * Rompe algo y verifica que el validador se queje, nombrando el campo. Que el
 * mensaje sea útil importa tanto como que rechace: un «contenido inválido» a
 * secas obliga a buscar a ojo en 1900 líneas de JSON.
 */
function rompe(nombre: string, romper: (c: ContenidoAventura) => void, esperaEnMensaje: string): void {
  const c = copia();
  romper(c);
  try {
    validarContenido(c, AGUA_QUIETA_LOGICA.map((l) => l.id));
    check(nombre, false, 'NO lo rechazó');
  } catch (e) {
    if (!(e instanceof ContenidoInvalido)) { check(nombre, false, `tiró ${String(e)}`); return; }
    const dice = e.problemas.some((p) => p.includes(esperaEnMensaje));
    check(nombre, dice, dice ? e.problemas.find((p) => p.includes(esperaEnMensaje)) : e.problemas.join(' | '));
  }
}

function main() {
  console.log('\nEL CONTENIDO REAL PASA');
  try {
    validarContenido(SANO, AGUA_QUIETA_LOGICA.map((l) => l.id));
    check('agua-quieta.contenido.json es válido', true);
  } catch (e) {
    check('agua-quieta.contenido.json es válido', false, String(e));
  }
  check('y se carga a un Scenario completo',
    AGUA_QUIETA.scenes.length === 20 && AGUA_QUIETA.conversations.length === 8
    && AGUA_QUIETA.actions.length === 19 && AGUA_QUIETA.endings.length === 5,
    `${AGUA_QUIETA.scenes.length} escenas · ${AGUA_QUIETA.conversations.length} temas · ${AGUA_QUIETA.actions.length} acciones · ${AGUA_QUIETA.endings.length} desenlaces`);

  console.log('\nEL VALIDADOR ENCUENTRA LO QUE DICE ENCONTRAR');

  rompe('un lugar de arranque que no existe',
    (c) => { c.startLocation = 'no-existe'; }, 'startLocation');

  rompe('una conexión a un lugar que no existe',
    (c) => { c.locations['patio']!.connections.push('el-mas-alla'); }, 'connections');

  rompe('un objeto cuyo dueño no es un lugar ni un NPC',
    (c) => { c.items[0]!.owner = 'ningun-lado'; }, 'owner');

  rompe('un NPC declarado presente en un lugar y que no existe',
    (c) => { c.locations['patio']!.npcsPresent.push('npc-fantasma'); }, 'npcsPresent');

  rompe('un id de item repetido',
    (c) => { c.items.push({ ...c.items[0]! }); }, 'está dos veces');

  rompe('una condición que apunta a un objeto inexistente',
    (c) => { c.actions.find((a) => a.id === 'reloj-agua')!.visible = { op: 'lleva', item: 'it-relog' }; },
    'it-relog');

  rompe('una condición que apunta a un documento inexistente',
    (c) => { c.actions.find((a) => a.id === 'cavar')!.visible = { op: 'documento', id: 'doc-que-no-esta' }; },
    'doc-que-no-esta');

  rompe('una condición que apunta a un lugar inexistente',
    (c) => { c.scenes[0]!.cuando = { op: 'lugar', es: ['sotano'] }; }, 'sotano');

  rompe('una condición anidada rota (dentro de un `y`)',
    (c) => {
      c.scenes[0]!.cuando = {
        op: 'y',
        de: [{ op: 'lugar', es: ['patio'] }, { op: 'propiedad', item: 'it-inventado' }],
      };
    }, 'it-inventado');

  rompe('un patrón de texto que no compila',
    (c) => { c.scenes[0]!.cuando = { op: 'texto', patron: '(sin cerrar' }; }, 'no compila');

  rompe('un tema que le habla a un NPC que no existe',
    (c) => { c.conversations[0]!.npc = 'npc-nadie'; }, 'npc-nadie');

  rompe('un tema que revela un secreto que el NPC no tiene',
    (c) => { c.conversations[0]!.cede.revelaSecreto = 's-inventado'; }, 's-inventado');

  rompe('un documento que arranca ya obtenido',
    (c) => { c.documents[0]!.obtainedAt = 'evento-falso'; }, 'obtainedAt');

  rompe('una escena declarada en el JSON y sin lógica',
    (c) => { c.scenes.push({ id: 'escena-sin-codigo', cuando: { op: 'verbo', es: ['mirar'] } }); },
    'sin `resolver` en la lógica');

  rompe('una escena con lógica y sin declarar en el JSON',
    (c) => { c.scenes = c.scenes.filter((e) => e.id !== 'dormir'); },
    'no está declarada en el JSON');

  // ── Y que cargar de verdad también falle, no sólo validar suelto ────────
  console.log('\nCARGAR UNA AVENTURA ROTA TAMBIÉN FALLA');
  const rota = copia();
  rota.items[0]!.owner = 'ningun-lado';
  try {
    cargarAventura(rota, AGUA_QUIETA_LOGICA, [ELENA, TOMAS]);
    check('cargarAventura rechaza contenido inválido', false, 'lo cargó igual');
  } catch (e) {
    check('cargarAventura rechaza contenido inválido', e instanceof ContenidoInvalido);
  }

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main();
