/**
 * VALIDACIÓN DEL CONTENIDO — al cargar, no en un test aparte.
 *
 * Lo que gana el JSON sobre el TypeScript a mano no es que sea más lindo: es
 * que se puede recorrer. Un id mal escrito dentro de una función
 * —`propiedadVista(s, 'it-relog')`— compila perfecto y recién se nota jugando,
 * o corriendo la auditoría completa, o nunca. Acá se nota al abrir el juego,
 * con el campo y el id inválido en el mensaje.
 *
 * Es una capa DISTINTA de `rules/auditoria.ts`, y las dos hacen falta:
 *   · esto pregunta «¿esto tiene la forma correcta y sus referencias existen?»
 *   · la auditoría pregunta «¿todo lo declarado tiene camino real en el juego?»
 * Un escenario puede pasar ésta y fallar aquélla (un final bien escrito que
 * ninguna escena alcanza), y al revés no, porque la auditoría necesita cargar
 * el escenario primero.
 */

import type { ContenidoAventura, AccionJSON, TemaJSON, EscenaJSON } from './contenido.schema.ts';
import type { Condicion } from './condiciones.ts';
import { ARMA_POR_ID } from '../rules/armas.ts';

export class ContenidoInvalido extends Error {
  constructor(public readonly problemas: string[]) {
    super(`El contenido de la aventura tiene ${problemas.length} problema(s):\n  · ${problemas.join('\n  · ')}`);
    this.name = 'ContenidoInvalido';
  }
}

/** Ids que una condición referencia, con el campo donde aparece cada uno. */
function referenciasDe(cond: Condicion, donde: string): Array<{ tipo: string; id: string; donde: string }> {
  switch (cond.op) {
    case 'documento': return [{ tipo: 'documento', id: cond.id, donde }];
    case 'propiedad': return [{ tipo: 'item', id: cond.item, donde }];
    case 'lleva': return [{ tipo: 'item', id: cond.item, donde }];
    case 'alcanzable': return [{ tipo: 'item', id: cond.item, donde }];
    case 'lugar': return cond.es.map((id) => ({ tipo: 'lugar', id, donde }));
    case 'destino': return [{ tipo: 'lugar', id: cond.id, donde }];
    case 'detalleVisto': return [{ tipo: 'lugar', id: cond.lugar, donde }];
    case 'npcFuera': return [{ tipo: 'npc', id: cond.npc, donde }];
    case 'y': case 'o': return cond.de.flatMap((c) => referenciasDe(c, donde));
    case 'no': return referenciasDe(cond.de, donde);
    default: return [];
  }
}

/** Una condición mal formada tiene que verse acá, no explotar al evaluarla. */
function formaDeCondicion(cond: unknown, donde: string, out: string[]): void {
  if (!cond || typeof cond !== 'object' || !('op' in cond)) {
    out.push(`${donde}: la condición no tiene \`op\`.`);
    return;
  }
  const c = cond as Condicion;
  switch (c.op) {
    case 'verbo':
      if (!Array.isArray(c.es) || c.es.length === 0) out.push(`${donde}: \`verbo\` necesita al menos un verbo en \`es\`.`);
      break;
    case 'lugar':
      if (!Array.isArray(c.es) || c.es.length === 0) out.push(`${donde}: \`lugar\` necesita al menos un id en \`es\`.`);
      break;
    case 'texto':
      try { new RegExp(c.patron); } catch { out.push(`${donde}: \`texto\` tiene un patrón que no compila: «${c.patron}».`); }
      break;
    case 'objetivo':
      if (c.kind === undefined && c.id === undefined) out.push(`${donde}: \`objetivo\` sin \`kind\` ni \`id\` no filtra nada.`);
      break;
    case 'hora':
      if (c.minimo === undefined && c.maximo === undefined) out.push(`${donde}: \`hora\` sin \`minimo\` ni \`maximo\` no filtra nada.`);
      break;
    // Los tres buscan un fragmento dentro de un texto. Con `contiene` vacío
    // `String.includes('')` da true SIEMPRE, así que la condición se cumple
    // sola y la escena se dispara desde el primer turno: el peor tipo de bug
    // de contenido, porque no rompe nada — sólo pasa antes de tiempo.
    case 'pista': case 'narrado': case 'consecuencia':
      if (!c.contiene) out.push(`${donde}: \`${c.op}\` necesita un fragmento en \`contiene\`; vacío se cumple siempre.`);
      break;
    case 'y': case 'o':
      if (!Array.isArray(c.de) || c.de.length === 0) out.push(`${donde}: \`${c.op}\` necesita al menos una condición en \`de\`.`);
      else c.de.forEach((sub, n) => formaDeCondicion(sub, `${donde} → ${c.op}[${n}]`, out));
      break;
    case 'no':
      formaDeCondicion(c.de, `${donde} → no`, out);
      break;
    default:
      break;
  }
}

const duplicados = (ids: string[]): string[] => {
  const vistos = new Set<string>();
  const repes = new Set<string>();
  for (const id of ids) {
    if (vistos.has(id)) repes.add(id);
    vistos.add(id);
  }
  return [...repes];
};

/**
 * Valida forma y referencias. `idsDeLogica` son los ids que trae el companion
 * de TypeScript: se cruzan con los del JSON para que ninguna escena quede
 * declarada sin código ni con código sin declarar.
 */
export function validarContenido(
  contenido: ContenidoAventura,
  idsDeLogica: string[] = [],
): void {
  const problemas: string[] = [];

  // ── Ids únicos ──────────────────────────────────────────────────────────
  for (const [nombre, ids] of [
    ['items', contenido.items.map((i) => i.id)],
    ['npcs', contenido.npcs.map((n) => n.id)],
    ['documents', contenido.documents.map((d) => d.id)],
    ['scenes', contenido.scenes.map((e) => e.id)],
    ['conversations', contenido.conversations.map((t) => t.id)],
    ['actions', contenido.actions.map((a) => a.id)],
    ['endings', contenido.endings.map((e) => e.id)],
  ] as const) {
    for (const id of duplicados([...ids])) problemas.push(`${nombre}: el id «${id}» está dos veces.`);
  }

  // ── Los conjuntos contra los que se validan las referencias ─────────────
  const lugares = new Set(Object.keys(contenido.locations));
  const items = new Set(contenido.items.map((i) => i.id));
  const npcs = new Set(contenido.npcs.map((n) => n.id));
  const documentos = new Set(contenido.documents.map((d) => d.id));

  const existe = (tipo: string, id: string, donde: string) => {
    const conjunto = tipo === 'lugar' ? lugares : tipo === 'item' ? items
      : tipo === 'npc' ? npcs : documentos;
    if (!conjunto.has(id)) problemas.push(`${donde}: no existe el ${tipo} «${id}».`);
  };

  // ── El mapa ─────────────────────────────────────────────────────────────
  if (!lugares.has(contenido.startLocation)) {
    problemas.push(`startLocation: no existe el lugar «${contenido.startLocation}».`);
  }
  for (const [id, loc] of Object.entries(contenido.locations)) {
    if (loc.id !== id) problemas.push(`locations.${id}: su campo \`id\` dice «${loc.id}».`);
    for (const destino of loc.connections) existe('lugar', destino, `locations.${id}.connections`);
    for (const it of loc.itemsPresent ?? []) existe('item', it, `locations.${id}.itemsPresent`);
    for (const np of loc.npcsPresent ?? []) existe('npc', np, `locations.${id}.npcsPresent`);
  }

  // ── Todo NPC del escenario vive en algún lado ───────────────────────────
  // Un NPC declarado y ausente de todos los `npcsPresent` no es sólo
  // contenido dormido: es contenido ROTO POR PARTIDA DOBLE. `acciones.ts`
  // exige `npcsPresent.includes(npc.id)` para ofrecer un tema, así que no se
  // le puede hablar en ninguna parte; y `narrator.ts` trata al NPC sin lugar
  // propio como presente EN TODAS —esa excepción existe para los NPC creados
  // en partida con `create_npc`, que no figuran en ningún lugar porque
  // aparecen donde está el investigador—. Resultado: el narrador lo anuncia
  // en cada localización y ningún botón deja hablarle.
  //
  // Encontrado jugando, en La Legua Perdida: Eusebio Roldán, que el `opening`
  // pone explícitamente en la galería del casco, no estaba en el
  // `npcsPresent` de ninguna localización. Sus cinco temas —incluido el que
  // revela el muerto de 1911— eran inalcanzables, y a la vez el juego decía
  // «Eusebio Roldán está acá» en las seis localizaciones, el alambrado del
  // oeste incluido. Nada fallaba: simplemente no había cómo hablarle.
  //
  // Nada del motor muta `npcsPresent` en ningún momento, así que esto no se
  // puede arreglar solo más tarde: si no está declarado, no pasa nunca.
  const conLugarPropio = new Set(
    Object.values(contenido.locations).flatMap((l) => l.npcsPresent ?? []),
  );
  for (const npc of contenido.npcs) {
    if (conLugarPropio.has(npc.id)) continue;
    const temas = contenido.conversations.filter((t) => t.npc === npc.id).length;
    problemas.push(
      `npcs.${npc.id}: no figura en el \`npcsPresent\` de ninguna localización, ` +
      `así que no se le puede hablar en ninguna parte` +
      (temas > 0 ? ` y sus ${temas} temas de conversación son inalcanzables` : '') +
      `. Agregalo al lugar donde esté.`,
    );
  }

  // ── Objetos: su dueño es un lugar o un NPC ──────────────────────────────
  for (const item of contenido.items) {
    if (item.owner && !lugares.has(item.owner) && !npcs.has(item.owner)) {
      problemas.push(`items.${item.id}.owner: «${item.owner}» no es un lugar ni un NPC.`);
    }
  }

  // ── Estadísticas de combate: el arma tiene que existir ──────────────────
  // Sin esto, un id mal escrito caía en «desarmado» al resolver el ataque y
  // el matón peleaba a puño limpio con el facón declarado en la mano. Es la
  // familia de bug que este proyecto ya encontró seis veces: algo declarado
  // en los datos que el código no encuentra y reemplaza por un defecto.
  for (const npc of contenido.npcs) {
    const c = npc.combate;
    if (!c) continue;
    if (!ARMA_POR_ID[c.armaId]) {
      problemas.push(
        `npcs.${npc.id}.combate.armaId: no existe el arma «${c.armaId}». ` +
        `Disponibles: ${Object.keys(ARMA_POR_ID).join(', ')}.`,
      );
    }
    if (c.maxHp <= 0) problemas.push(`npcs.${npc.id}.combate.maxHp: tiene que ser mayor que cero.`);
    if (c.hp > c.maxHp) problemas.push(`npcs.${npc.id}.combate.hp: arranca por encima de su máximo.`);
  }

  // ── Condiciones: forma y referencias ────────────────────────────────────
  const revisar = (cond: Condicion | undefined, donde: string) => {
    if (!cond) return;
    formaDeCondicion(cond, donde, problemas);
    for (const ref of referenciasDe(cond, donde)) existe(ref.tipo, ref.id, ref.donde);
  };

  for (const escena of contenido.scenes as EscenaJSON[]) {
    revisar(escena.cuando, `scenes.${escena.id}.cuando`);
  }
  for (const tema of contenido.conversations as TemaJSON[]) {
    existe('npc', tema.npc, `conversations.${tema.id}.npc`);
    revisar(tema.disponible, `conversations.${tema.id}.disponible`);
    revisar(tema.agotado, `conversations.${tema.id}.agotado`);
    // Un tema que revela un secreto tiene que nombrar uno que el NPC tenga.
    for (const [rama, efecto] of Object.entries({
      cede: tema.cede, esquiva: tema.esquiva, cerrado: tema.cerrado,
      critico: tema.critico, pifia: tema.pifia,
    })) {
      if (!efecto?.revelaSecreto) continue;
      const npc = contenido.npcs.find((n) => n.id === tema.npc);
      if (npc && !npc.secrets?.some((s) => s.id === efecto.revelaSecreto)) {
        problemas.push(
          `conversations.${tema.id}.${rama}.revelaSecreto: «${efecto.revelaSecreto}» no está en los secretos de ${tema.npc}.`,
        );
      }
    }
  }
  for (const accion of contenido.actions as AccionJSON[]) {
    revisar(accion.visible, `actions.${accion.id}.visible`);
    revisar(accion.hecha, `actions.${accion.id}.hecha`);
    for (const lugar of accion.lugar ? [accion.lugar].flat() : []) {
      existe('lugar', lugar, `actions.${accion.id}.lugar`);
    }
    if (Array.isArray(accion.etiqueta)) {
      accion.etiqueta.forEach((v, n) => revisar(v.cuando, `actions.${accion.id}.etiqueta[${n}].cuando`));
    }
  }

  // ── Documentos: los que una escena entrega tienen que existir ───────────
  for (const doc of contenido.documents) {
    if (doc.obtainedAt !== null) {
      problemas.push(`documents.${doc.id}.obtainedAt: tiene que arrancar en null, lo llena el motor al entregarlo.`);
    }
  }

  // ── Escenas declaradas vs. lógica provista ──────────────────────────────
  if (idsDeLogica.length > 0) {
    const enJson = new Set(contenido.scenes.map((e) => e.id));
    const enLogica = new Set(idsDeLogica);
    for (const id of enJson) {
      if (!enLogica.has(id)) problemas.push(`scenes.${id}: declarada en el JSON y sin \`resolver\` en la lógica.`);
    }
    for (const id of enLogica) {
      if (!enJson.has(id)) problemas.push(`lógica.${id}: tiene \`resolver\` y no está declarada en el JSON.`);
    }
  }

  if (problemas.length > 0) throw new ContenidoInvalido(problemas);
}
