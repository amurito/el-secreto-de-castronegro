/**
 * AUDITORÍA DE ALCANZABILIDAD.
 *
 * Este proyecto tiene una familia de bug que ya apareció seis veces, siempre
 * igual: **algo declarado en los datos sin camino real en el código.**
 *
 *   · dos desenlaces declarados que el motor no sabía alcanzar
 *   · la pista del retardo, atada a acertar en el primer intento
 *   · `markedForGrowth`, un campo que no escribía nadie
 *   · `ITEM_USED`, un evento que ninguna herramienta emitía
 *   · dos descubrimientos que se conseguían con sólo estar parado en un lugar
 *   · las contradicciones, que no se deduplicaban
 *
 * Cada una se encontró jugando, tarde, y una la encontró el jugador. Este
 * módulo cierra la fuente en vez del goteo: recorre TODO lo que un escenario
 * declara y verifica que exista al menos un camino que lo entregue.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÓMO SE AUDITA UNA ESCENA, QUE ES UNA FUNCIÓN
 *
 * Las escenas ramifican en código, así que no se pueden leer como datos. Pero
 * lo que DEVUELVEN sí es declarativo —ésa fue la decisión de diseño del
 * contrato de escenas— así que se las ejecuta en un banco de pruebas: con la
 * tirada en éxito y en fracaso, y contra varios estados. Los efectos que
 * devuelven son el catálogo de lo que esa escena puede entregar.
 *
 * Es más honesto que leer el código y más barato que jugar mil partidas.
 */

import type { GameState, Item, Npc } from '../shared/types.ts';
import type { Scenario } from '../scenario/types.ts';
import type { EfectoEscena, EscenaAutoral, IntencionLeida } from '../scenario/escena.ts';

// ─────────────────────────────────────────────────────────────────────────────
// QUÉ DECLARA UN ESCENARIO
// ─────────────────────────────────────────────────────────────────────────────

export interface Declarado {
  /** Descripciones de pistas que alguna feature, escena o tema promete. */
  pistas: Array<{ que: string; donde: string }>;
  /** `itemId:propertyId` de propiedades ocultas y condicionales. */
  propiedades: Array<{ que: string; donde: string; condicion: string }>;
  documentos: Array<{ que: string; donde: string }>;
  secretos: Array<{ que: string; donde: string }>;
  desenlaces: Array<{ que: string; donde: string }>;
  /** Localizaciones, para verificar que se llega a todas. */
  lugares: Array<{ que: string; donde: string }>;
}

export function loQueDeclara(esc: Scenario): Declarado {
  const d: Declarado = {
    pistas: [], propiedades: [], documentos: [], secretos: [], desenlaces: [], lugares: [],
  };

  for (const [id, loc] of Object.entries(esc.locations)) {
    d.lugares.push({ que: id, donde: `localización «${loc.name}»` });
    for (const f of loc.features ?? []) {
      if (f.clue) d.pistas.push({ que: f.clue.description, donde: `detalle ${f.id} de ${id}` });
    }
  }

  for (const item of esc.items) {
    for (const p of item.hiddenProperties) {
      d.propiedades.push({
        que: `${item.id}:${p.id}`, donde: `objeto «${item.name}»`,
        condicion: p.discoveryCondition?.kind ?? 'sin condición',
      });
    }
    for (const p of item.conditionalProperties) {
      d.propiedades.push({
        que: `${item.id}:${p.id}`, donde: `objeto «${item.name}» (condicional)`,
        condicion: p.trigger?.kind ?? 'sin trigger',
      });
    }
  }

  for (const doc of esc.documents) {
    d.documentos.push({ que: doc.id, donde: `documento «${doc.title}»` });
  }

  for (const npc of esc.npcs as Npc[]) {
    for (const s of npc.secrets ?? []) {
      d.secretos.push({ que: s.id, donde: `secreto de ${npc.name}` });
    }
  }

  for (const e of esc.endings) {
    d.desenlaces.push({ que: e.id, donde: `desenlace «${e.title}»` });
  }

  for (const tema of esc.conversations) {
    if (tema.cede.pista) {
      d.pistas.push({ que: tema.cede.pista.description, donde: `tema «${tema.id}» al ceder` });
    }
    if (tema.esquiva?.pista) {
      d.pistas.push({ que: tema.esquiva.pista.description, donde: `tema «${tema.id}» al esquivar` });
    }
  }

  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUÉ PUEDE ENTREGAR
// ─────────────────────────────────────────────────────────────────────────────

export interface Entregable {
  pistas: Set<string>;
  propiedades: Set<string>;
  documentos: Set<string>;
  secretos: Set<string>;
  desenlaces: Set<string>;
  /** Escenas que explotaron al ejecutarse en el banco. Es un bug en sí mismo. */
  escenasRotas: Array<{ escena: string; error: string }>;
}

const INTENCION_VACIA: IntencionLeida = {
  raw: '', norm: '', verb: 'mirar', verbExplicit: true, sustained: false,
  objetivo: { kind: 'none', id: null }, destino: null,
};

function recolectar(e: EfectoEscena | EfectoEscena[], out: Entregable): void {
  for (const efecto of Array.isArray(e) ? e : [e]) {
    if (!efecto) continue;
    for (const p of efecto.pistas ?? []) out.pistas.add(p.description);
    if (efecto.descubre) out.propiedades.add(`${efecto.descubre.itemId}:${efecto.descubre.propertyId}`);
    if (efecto.documento) out.documentos.add(efecto.documento.id);
    if (efecto.desenlace) out.desenlaces.add(efecto.desenlace.id);
  }
}

/**
 * Ejecuta cada escena en un banco: éxito y fracaso, contra los estados que se
 * le den. No toca nada — las escenas no pueden tocar el estado, por contrato.
 */
export function loQuePuedeEntregar(esc: Scenario, estados: GameState[]): Entregable {
  const out: Entregable = {
    pistas: new Set(), propiedades: new Set(), documentos: new Set(),
    secretos: new Set(), desenlaces: new Set(), escenasRotas: [],
  };

  // Las features entregan su pista al examinarse.
  for (const loc of Object.values(esc.locations)) {
    for (const f of loc.features ?? []) {
      if (f.clue) out.pistas.add(f.clue.description);
    }
  }

  // Los temas entregan pistas y secretos.
  for (const tema of esc.conversations) {
    for (const efecto of [tema.cede, tema.esquiva, tema.cerrado]) {
      if (!efecto) continue;
      if (efecto.pista) out.pistas.add(efecto.pista.description);
      if (efecto.revelaSecreto) out.secretos.add(efecto.revelaSecreto);
    }
  }

  // Las escenas: se las ejecuta con las dos ramas de la tirada.
  for (const escena of esc.scenes as EscenaAutoral[]) {
    for (const estado of estados) {
      for (const exito of [true, false]) {
        try {
          const antes = escena.antes?.(estado, INTENCION_VACIA);
          if (antes) recolectar(antes, out);
          recolectar(escena.resolver({
            estado,
            intencion: INTENCION_VACIA,
            tirada: { exito, mensaje: exito ? 'SUPERA la dificultad' : 'NO SUPERA la dificultad' },
            variante: (o) => o[0] ?? '',
          }), out);
        } catch (err) {
          const msg = (err as Error).message;
          if (!out.escenasRotas.some((r) => r.escena === escena.id && r.error === msg)) {
            out.escenasRotas.push({ escena: escena.id, error: msg });
          }
        }
      }
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// EL MAPA: ¿SE LLEGA A TODAS LAS LOCALIZACIONES?
// ─────────────────────────────────────────────────────────────────────────────

/** Localizaciones que NO se alcanzan caminando desde el inicio. */
export function lugaresInalcanzables(esc: Scenario): string[] {
  const vistos = new Set<string>([esc.startLocation]);
  const cola = [esc.startLocation];
  while (cola.length) {
    const aqui = cola.shift()!;
    for (const destino of esc.locations[aqui]?.connections ?? []) {
      if (!vistos.has(destino)) { vistos.add(destino); cola.push(destino); }
    }
  }
  return Object.keys(esc.locations).filter((id) => !vistos.has(id));
}

/**
 * Conexiones de un solo sentido: se puede ir y no volver.
 *
 * No siempre es un error —una aventura puede querer un pasaje sin retorno—
 * pero nunca es un accidente aceptable: o se declara la vuelta, o se sabe.
 */
export function conexionesDeIda(esc: Scenario): Array<{ desde: string; hasta: string }> {
  const sueltas: Array<{ desde: string; hasta: string }> = [];
  for (const [id, loc] of Object.entries(esc.locations)) {
    for (const destino of loc.connections) {
      if (!esc.locations[destino]?.connections.includes(id)) {
        sueltas.push({ desde: id, hasta: destino });
      }
    }
  }
  return sueltas;
}

/** Objetos que no están en ningún lado: nadie los puede encontrar. */
export function objetosPerdidos(esc: Scenario): string[] {
  const lugares = new Set(Object.keys(esc.locations));
  const investigadores = new Set(esc.investigators.map((i) => i.id));
  const npcs = new Set(esc.npcs.map((n) => n.id));
  return esc.items
    .filter((i: Item) => {
      const o = i.owner;
      if (o === null) return true;
      return !lugares.has(o) && !investigadores.has(o) && !npcs.has(o);
    })
    .map((i) => `${i.id} (owner: ${i.owner ?? 'null'})`);
}
