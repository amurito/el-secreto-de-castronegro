/**
 * MAPA DE CAMPAÑA — genera `docs/mapa-de-campana.html`.
 *
 * Un solo archivo, sin dependencias ni servidor, que muestra:
 *   1. La campaña como línea de tiempo: qué aventura sigue a cuál, y qué
 *      consecuencias de una las lee otra (flechas punteadas).
 *   2. De cada aventura: el mapa de lugares, la cadena de causa y efecto
 *      (qué pista o consecuencia habilita qué escena o tema, hasta los
 *      finales), y las consecuencias que deja y las que recibe.
 *
 * Se arma LEYENDO los datos reales —el catálogo, los `*.contenido.json` y el
 * código de las escenas— para que no pueda quedar desactualizado como un
 * diagrama dibujado a mano. Correrlo de nuevo cuando cambie una aventura:
 *
 *   npm run mapa
 *
 * LÍMITE CONOCIDO, y por qué es aceptable: las consecuencias y las pistas de
 * las escenas viven dentro de funciones `resolver` (código, no dato), así que
 * se leen del TEXTO fuente con expresiones regulares en vez de ejecutarse.
 * Eso funciona para el estilo que usa todo el catálogo (literales de texto,
 * incluso concatenados con `+`) y falla en silencio, mostrando menos, si una
 * escena armara la descripción con una variable. Es una herramienta de
 * diseño, no una prueba: un hueco acá no rompe nada, sólo se ve menos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGO } from './scenario/catalogo.ts';

const aca = path.dirname(fileURLToPath(import.meta.url));
const dirScenario = path.join(aca, 'scenario');
const salida = path.join(aca, '..', 'docs', 'mapa-de-campana.html');

// ─────────────────────────────────────────────────────────────────────────────
// Lectura de texto fuente
// ─────────────────────────────────────────────────────────────────────────────

const RE_LITERAL = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;

/** Todos los literales de texto de un fragmento, pegados (resuelve `'a' + 'b'`). */
function literales(t: string): string {
  const out: string[] = [];
  for (const m of t.matchAll(RE_LITERAL)) out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\\n/g, ' ').replace(/\\(.)/g, '$1'));
  return out.join('');
}

/** El texto entre la llave (o corchete) que abre en `desde` y su cierre, contando anidados y respetando strings. */
function balanceado(t: string, desde: number): string {
  const abre = t[desde]!;
  const cierra = abre === '{' ? '}' : abre === '[' ? ']' : ')';
  let prof = 0;
  let cadena: string | null = null;
  for (let i = desde; i < t.length; i++) {
    const c = t[i]!;
    if (cadena) {
      if (c === '\\') i++;
      else if (c === cadena) cadena = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { cadena = c; continue; }
    if (c === abre) prof++;
    else if (c === cierra && --prof === 0) return t.slice(desde, i + 1);
  }
  return t.slice(desde);
}

const corto = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

// ─────────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────────

interface Req { k: 'pista' | 'consecuencia' | 'narrado' | 'lleva' | 'exposicion' | 'sospecha' | 'lugar' | 'otro'; frag: string }
interface Nodo {
  id: string;
  kind: 'escena' | 'tema' | 'final';
  label: string;
  sub: string;
  req: Req[];
  pistas: string[];
  cons: Array<{ desc: string; scope: string }>;
  chips: string[];
  /** A qué lugares, objetos, detalles o NPCs apunta (para ubicarlo en el mapa). */
  refs: string[];
  npc?: string;
  texto: string; // sólo para resolver `narrado`; no se serializa
}

/** Recorre una Condicion y junta lo que EXIGE del estado del juego. */
function requisitos(c: any, out: Req[] = [], negado = false): Req[] {
  if (!c || typeof c !== 'object') return out;
  switch (c.op) {
    case 'y': case 'o': for (const x of c.de) requisitos(x, out, negado); break;
    case 'no': requisitos(c.de, out, !negado); break;
    case 'pista': out.push({ k: 'pista', frag: (negado ? '¬ ' : '') + c.contiene }); break;
    case 'consecuencia': out.push({ k: 'consecuencia', frag: (negado ? '¬ ' : '') + c.contiene }); break;
    case 'narrado': out.push({ k: 'narrado', frag: (negado ? '¬ ' : '') + c.contiene }); break;
    case 'lleva': case 'alcanzable': out.push({ k: 'lleva', frag: c.item }); break;
    case 'exposicion': out.push({ k: 'exposicion', frag: '≥ ' + c.minimo }); break;
    case 'sospecha': out.push({ k: 'sospecha', frag: `${c.minimo ?? 0}-${c.maximo ?? 100}` }); break;
    case 'lugar': out.push({ k: 'lugar', frag: c.es.join(' / ') }); break;
    default: break;
  }
  return out;
}

/** Ids a los que apunta una condición: lugares y objetivos (objeto, detalle, NPC). */
function refsDe(c: any, out: string[] = []): string[] {
  if (!c || typeof c !== 'object') return out;
  if (c.op === 'y' || c.op === 'o') c.de.forEach((x: any) => refsDe(x, out));
  else if (c.op === 'lugar') out.push(...c.es);
  else if (c.op === 'objetivo' && c.id) out.push(c.id);
  else if (c.op === 'alcanzable' || c.op === 'lleva') out.push(c.item);
  else if (c.op === 'detalleVisto') out.push(c.lugar, c.feature);
  return out;
}

function etiquetaDeCuando(c: any): string {
  if (!c) return '';
  if (c.op === 'y' || c.op === 'o') return c.de.map(etiquetaDeCuando).filter(Boolean).slice(0, 2).join(c.op === 'y' ? ' · ' : ' | ');
  if (c.op === 'texto') return String(c.patron).split('|')[0]!.replace(/[\\^$()?]/g, '').slice(0, 40);
  if (c.op === 'verbo') return c.es.join('/');
  if (c.op === 'objetivo') return c.id ?? c.kind ?? '';
  return '';
}

/** Entrada del catálogo → archivos de contenido y lógica, leyendo los `import` del ensamblador. */
function archivosDe(scenarioId: string): { json: any; logica: string } {
  for (const f of fs.readdirSync(dirScenario)) {
    if (!f.endsWith('.ts') || f.includes('.logica.')) continue;
    const src = fs.readFileSync(path.join(dirScenario, f), 'utf8');
    const j = src.match(/from '\.\/([^']+\.contenido\.json)'/);
    if (!j) continue;
    const json = JSON.parse(fs.readFileSync(path.join(dirScenario, j[1]!), 'utf8'));
    if (json.id !== scenarioId) continue;
    const l = src.match(/from '\.\/([^']+\.logica\.ts)'/);
    return { json, logica: l ? fs.readFileSync(path.join(dirScenario, l[1]!), 'utf8') : '' };
  }
  throw new Error(`No encontré el contenido de ${scenarioId}`);
}

/** Parte el archivo de lógica en un trozo por escena (`  {` a 2 espacios, con su `id:`). */
function escenasDeLogica(src: string): Map<string, string> {
  const m = new Map<string, string>();
  const partes = src.split(/\n  \{\s*\n/);
  for (const p of partes.slice(1)) {
    const id = p.match(/^\s*(?:\/\/[^\n]*\n\s*)*id:\s*'([^']+)'/)?.[1];
    if (id) m.set(id, p);
  }
  return m;
}

function leerConsecuencias(trozo: string): Array<{ desc: string; scope: string }> {
  const out: Array<{ desc: string; scope: string }> = [];
  for (const m of trozo.matchAll(/consecuencia(?:Disparo)?\s*:\s*\{/g)) {
    const bloque = balanceado(trozo, m.index! + m[0].length - 1);
    const d = bloque.match(/description:\s*([\s\S]*?),\s*\n?\s*scope:/);
    const scope = bloque.match(/scope:\s*'(\w+)'/)?.[1] ?? 'scene';
    if (d) out.push({ desc: literales(d[1]!), scope });
  }
  return out;
}

function leerPistasDeLogica(trozo: string): string[] {
  const out: string[] = [];
  for (const m of trozo.matchAll(/pistas:\s*\[/g)) {
    const bloque = balanceado(trozo, m.index! + m[0].length - 1);
    for (const d of bloque.matchAll(/description:\s*([\s\S]*?),\s*\n?\s*kind:/g)) out.push(literales(d[1]!));
  }
  return out;
}

function fxDe(trozo: string): string[] {
  const c: string[] = [];
  const pr = trozo.match(/skill:\s*'(\w+)',\s*difficulty:\s*'(\w+)'/);
  if (pr) c.push(`🎲 ${pr[1]} ${pr[2]}`);
  const cor = trozo.match(/cordura:\s*\{\s*amount:\s*(\d+)/);
  if (cor) c.push(`SAN −${cor[1]}`);
  if (/exposicion:\s*\{/.test(trozo)) c.push('Exposición');
  if (/sospecha:\s*\{/.test(trozo)) c.push('Sospecha');
  if (/mitos:\s*\{/.test(trozo)) c.push('Mitos');
  if (/aprenderHechizo/.test(trozo)) c.push('hechizo');
  if (/combate:\s*\{/.test(trozo)) c.push('combate');
  if (/estabilidad:\s*\{/.test(trozo)) c.push('Estabilidad');
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracción por aventura
// ─────────────────────────────────────────────────────────────────────────────

const aventuras: Record<string, any> = {};
const campania: any[] = [];

for (const e of CATALOGO) {
  const sc = e.scenario;
  const { json, logica } = archivosDe(sc.id);
  const trozos = escenasDeLogica(logica);
  const nodos: Nodo[] = [];

  for (const esc of json.scenes as any[]) {
    const t = trozos.get(esc.id) ?? '';
    nodos.push({
      id: 'e:' + esc.id, kind: 'escena', label: esc.id,
      sub: etiquetaDeCuando(esc.cuando),
      req: requisitos(esc.cuando),
      pistas: leerPistasDeLogica(t),
      cons: leerConsecuencias(t),
      chips: fxDe(t),
      refs: refsDe(esc.cuando),
      texto: literales(t),
    });
    // Lo que la escena exige y está escrito en código (`consequences.some(...)`).
    const n = nodos[nodos.length - 1]!;
    for (const m of t.matchAll(/consequences\.some\([\s\S]*?includes\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) {
      n.req.push({ k: 'consecuencia', frag: literales(m[1]!) });
    }
    for (const m of t.matchAll(/clues\.some\([\s\S]*?includes\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) {
      n.req.push({ k: 'pista', frag: literales(m[1]!) });
    }
  }

  const npcNombre: Record<string, string> = Object.fromEntries((json.npcs as any[]).map((n) => [n.id, n.name]));
  for (const t of json.conversations as any[]) {
    const efectos = [t.cede, t.esquiva, t.cerrado, t.critico, t.pifia].filter(Boolean);
    const chips: string[] = [];
    if (t.prueba) chips.push(`🎲 ${t.prueba.skill} ${t.prueba.difficulty}${t.prueba.actitudMinima ? ` · confianza ≥${t.prueba.actitudMinima}` : ''}`);
    if (efectos.some((x: any) => x.revelaSecreto)) chips.push('secreto');
    if (efectos.some((x: any) => x.cordura)) chips.push('SAN');
    nodos.push({
      id: 't:' + t.id, kind: 'tema', label: t.etiqueta, sub: npcNombre[t.npc] ?? t.npc,
      req: requisitos(t.disponible),
      pistas: efectos.map((x: any) => x.pista?.description).filter(Boolean),
      cons: [], chips, refs: [], npc: t.npc,
      texto: efectos.flatMap((x: any) => x.texto ?? []).join(' '),
    });
  }

  for (const f of sc.endings) {
    const esc = nodos.find((n) => n.id === 'e:' + f.id);
    nodos.push({
      id: 'f:' + f.id, kind: 'final', label: f.title, sub: 'desenlace',
      req: esc ? [{ k: 'otro', frag: '@' + esc.id }] : [],
      pistas: [], cons: [], chips: [], refs: [], texto: '',
    });
  }

  aventuras[sc.id] = {
    nodos,
    locations: Object.values(sc.locations).map((l: any) => ({
      id: l.id, name: l.name, start: l.id === sc.startLocation, conn: l.connections,
      npcs: (l.npcsPresent ?? []).length,
      npcIds: l.npcsPresent ?? [], itemIds: l.itemsPresent ?? [],
      featIds: (l.features ?? []).map((f: any) => f.id),
      desc: l.description ?? '',
    })),
    npcs: Object.fromEntries((json.npcs as any[]).map((n) => [n.id, n.name])),
    items: Object.fromEntries((json.items as any[]).map((i) => [i.id, i.name])),
    ocultas: (json.conexionesOcultas ?? []).map((c: any) => ({
      desde: c.desde, hasta: c.hasta, cond: requisitos(c.hastaQue).map((r) => r.frag).join(', '),
    })),
    finales: sc.endings.map((f) => ({ id: f.id, title: f.title, condition: f.condition })),
  };

  campania.push({
    id: sc.id, title: sc.title, cuando: e.cuando, epoca: e.epoca, duracion: e.duracion,
    requiere: e.requiere ?? [], continuacion: !!e.continuacion,
    lugares: Object.keys(sc.locations).length, npcs: sc.npcs.length,
    escenas: json.scenes.length, temas: json.conversations.length, finales: sc.endings.length,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Aristas: adentro de cada aventura, y entre aventuras
// ─────────────────────────────────────────────────────────────────────────────

const aristas: Record<string, Array<{ de: string; a: string; por: string }>> = {};
const cruces: Array<{ de: string; a: string; frag: string; scope: string; desde: string; hasta: string }> = [];

const limpio = (f: string) => f.replace(/^¬ /, '');
for (const id of Object.keys(aventuras)) {
  const { nodos } = aventuras[id];
  const ar: Array<{ de: string; a: string; por: string }> = [];
  for (const n of nodos as Nodo[]) {
    for (const r of n.req) {
      if (r.k === 'otro' && r.frag.startsWith('@')) { ar.push({ de: r.frag.slice(1), a: n.id, por: 'desenlace' }); continue; }
      if (r.frag.startsWith('¬ ')) continue; // «que NO haya pasado» no es una flecha de causa
      const frag = limpio(r.frag);
      if (r.k === 'pista') {
        for (const p of nodos as Nodo[]) if (p.id !== n.id && p.pistas.some((d) => d.includes(frag))) ar.push({ de: p.id, a: n.id, por: 'pista' });
      } else if (r.k === 'consecuencia') {
        for (const p of nodos as Nodo[]) if (p.id !== n.id && p.cons.some((c) => c.desc.includes(frag))) ar.push({ de: p.id, a: n.id, por: 'consecuencia' });
        // ¿la produce OTRA aventura?
        for (const otra of Object.keys(aventuras)) {
          if (otra === id) continue;
          for (const p of aventuras[otra].nodos as Nodo[]) {
            const c = p.cons.find((x) => (x.scope === 'campaign' || x.scope === 'world') && x.desc.includes(frag));
            if (c) cruces.push({ de: otra, a: id, frag, scope: c.scope, desde: p.id, hasta: n.id });
          }
        }
      } else if (r.k === 'narrado') {
        for (const p of nodos as Nodo[]) if (p.id !== n.id && p.texto.includes(frag)) ar.push({ de: p.id, a: n.id, por: 'narrado' });
      }
    }
  }
  // sin duplicados
  const visto = new Set<string>();
  aristas[id] = ar.filter((x) => { const k = x.de + '>' + x.a + '>' + x.por; if (visto.has(k)) return false; visto.add(k); return true; });
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialización (sin el texto crudo, que sólo servía para cruzar)
// ─────────────────────────────────────────────────────────────────────────────

for (const id of Object.keys(aventuras)) {
  for (const n of aventuras[id].nodos as Nodo[]) {
    n.pistas = n.pistas.map((p) => corto(p, 260));
    n.cons = n.cons.map((c) => ({ ...c, desc: corto(c.desc, 300) }));
    n.req = n.req.map((r) => ({ ...r, frag: corto(r.frag, 140) }));
    (n as any).texto = undefined;
  }
  aventuras[id].aristas = aristas[id];
}
const crucesUnicos = [...new Map(cruces.map((c) => [c.de + '>' + c.a + '>' + c.frag, { ...c, frag: corto(c.frag, 140) }])).values()];

/**
 * La aventura en diseño, para verla en el árbol antes de que exista. Se
 * mantiene a mano en sincronía con `docs/SANTO-OFICIO-DISENO.md`; cuando se
 * publique en el catálogo, esto se borra y aparece sola.
 */
const enDiseno = CATALOGO.some((e) => e.scenario.id === 'santo-oficio-de-cuyo') ? null : {
  id: 'santo-oficio-de-cuyo', title: 'El Santo Oficio de Cuyo', requiere: ['la-merced-de-las-animas'],
  epoca: 'Noviembre de 1710 · 2-3 semanas', estado: 'diseño aprobado, sin escribir',
  aperturas: [
    { id: 'firmar-actas', nombre: 'Iglesia', detalle: 'Amanecer en el zanjón con Fray Ignacio. Sospecha inicial 35.' },
    { id: 'fuga-final', nombre: 'Huarpe', detalle: 'La misma noche, en el totoral, con la Rastrillería atrás.' },
  ],
  actos: ['Acto I · cada rama en su mundo', 'Acto II · cazado por las dos partes', 'Acto III · Hualilán'],
  salidas: [
    { id: 'salida-1930', nombre: '1930 · liberación controlada', detalle: 'Aflojar el sello a propósito: el agua se pierde de golpe.' },
    { id: 'salida-1944', nombre: '1944 · dejarlo reventar', detalle: 'Cruzar en el terremoto del 15 de enero. La más peligrosa.' },
    { id: 'salida-quedarse', nombre: 'Quedarse · reforzar el sello', detalle: 'Con el ingrediente de Hualilán. El 1944 queda sin resolver.' },
  ],
};

// El esqueleto acordado (src/santo-oficio.esqueleto.json), pasado a la misma forma que un lugar real
// para reusar el dibujo de mapa. Si el archivo ya no existe, la aventura ya se escribió.
const rutaEsqueleto = path.join(aca, 'santo-oficio.esqueleto.json');
if (enDiseno && fs.existsSync(rutaEsqueleto)) {
  const e = JSON.parse(fs.readFileSync(rutaEsqueleto, 'utf8'));
  const npcNombre: Record<string, string> = Object.fromEntries(e.npcs.map((n: any) => [n.id, n.name]));
  (enDiseno as any).esqueleto = {
    ...e,
    locations: e.lugares.map((l: any) => ({
      id: l.id, name: l.name, start: l.id === e.startLocation, tag: l.tag, conn: l.conn,
      npcs: l.npcs.length, npcIds: l.npcs, itemIds: [], featIds: [], desc: l.desc,
    })),
    npcNombre,
  };
}

const datos = { campania, aventuras, cruces: crucesUnicos, enDiseno, generado: new Date().toISOString().slice(0, 16).replace('T', ' ') };

// ─────────────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────────────

const plantilla = fs.readFileSync(path.join(aca, 'mapa-campana.plantilla.html'), 'utf8');
fs.writeFileSync(
  salida,
  plantilla.replace('/*__DATOS__*/null', JSON.stringify(datos).replace(/</g, '\\u003c')),
);

const totalNodos = Object.values(aventuras).reduce((s: number, a: any) => s + a.nodos.length, 0);
const totalAristas = Object.values(aristas).reduce((s, a) => s + a.length, 0);
console.log(`Mapa escrito en ${path.relative(process.cwd(), salida)}`);
console.log(`  ${campania.length} aventuras · ${totalNodos} nodos · ${totalAristas} flechas de causa · ${crucesUnicos.length} enlaces entre aventuras`);
