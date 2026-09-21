import React, { useState } from 'react';
import { DadosPercentiles, useRevelacionTardia } from './dados.tsx';
import { pisoDeExposicion } from '../rules/umbral.ts';
import { meetsDifficulty } from '../rules/dice.ts';
import type { SuccessDegree, Difficulty } from '../shared/types.ts';
import type { Opcion } from '../scenario/acciones.ts';

// ─────────────────────────────────────────────────────────────────────────────
// FICHA
// ─────────────────────────────────────────────────────────────────────────────

/** `Investigator['status']` distinto de 'alive', en español. */
const ETIQUETA_STATUS: Record<string, string> = {
  dead: 'MUERTO',
  insane: 'LOCURA INDEFINIDA',
  missing: 'DESAPARECIDO',
  retired: 'RETIRADO',
  unconscious: 'INCONSCIENTE',
};

const UMBRAL_LABEL: Record<string, string> = {
  FIRST_CONTACT: 'PRIMER CONTACTO',
  RECIPROCITY: 'RECIPROCIDAD',
  CONTAMINATION: 'CONTAMINACIÓN',
  DISSOLUTION: 'DISOLUCIÓN',
};

export function Sheet({ inv }: { inv: any }) {
  if (!inv) return null;
  const d = inv.derived;
  return (
    <div className="panel">
      <h2 className="panel-title">Ficha</h2>

      <div className="sheet-id">
        <div className="sheet-name">{inv.name}</div>
        <div className="sheet-sub">{inv.age} años · {inv.occupation}</div>
        {/* Reportado jugando: para `status: 'insane'` esto mostraba el nombre
            del status en inglés tal cual («INSANE»), único lugar de toda la
            interfaz que no estaba en español. */}
        {inv.status !== 'alive' && (
          <div className="dead-badge">{ETIQUETA_STATUS[inv.status] ?? inv.status.toUpperCase()}</div>
        )}
      </div>

      <div className="stat-grid">
        <Stat label="PV" value={d.hp} max={d.maxHp} tone="hp" />
        <Stat label="SAN" value={d.san} max={d.maxSan} tone="san" />
        <Stat label="PM" value={d.mp} max={d.maxMp} tone="mp" />
        <Stat label="Suerte" value={d.luck} max={99} tone="luck" />
      </div>
      {/* El efectivo va aparte de la grilla y sin barra: no tiene máximo
          contra el cual medirlo, y ponerle uno sugeriría que hay una meta.
          Sólo aparece si hay algo — una partida guardada de antes de que
          existiera la plata no muestra un cero que no significa nada. */}
      {typeof d.efectivo === 'number' && d.efectivo > 0 && (
        <div className="efectivo">
          <span className="efectivo-label">Efectivo</span>
          <span className="efectivo-valor">{d.efectivo} pesos</span>
        </div>
      )}
      {/* La sospecha, a diferencia del efectivo, SÍ tiene barra: llegar al
          100 es la hoguera, y ver cuánto falta es el punto. Sólo aparece
          cuando hay alguna. */}
      {(d.sospecha ?? 0) > 0 && (
        <div className={`sospecha${(d.sospecha ?? 0) >= 70 ? ' sospecha-alta' : ''}`}>
          <span className="sospecha-label">Sospecha</span>
          <span className="sospecha-barra"><span style={{ width: `${d.sospecha}%` }} /></span>
          <span className="sospecha-valor">{d.sospecha}</span>
        </div>
      )}
      {inv.pendingLuckBonus > 0 && (
        <div className="luck-pending">
          {/* Mismo campo tanto si viene de gastar Suerte como de lanzar
              "Adivinar la forma" (rules/hechizos.ts): es, mecánicamente, la
              misma cosa —un dado comprado de antemano—, así que el aviso no
              le atribuye un origen que puede no ser el que fue. */}
          {inv.pendingLuckBonus === 1
            ? 'Un dado de bonificación listo para tu próxima tirada.'
            : `${inv.pendingLuckBonus} dados de bonificación listos para tu próxima tirada.`}
        </div>
      )}

      <h3 className="sub-title">Umbral</h3>
      <Bar
        label="Exposición" value={inv.umbral.exposure} max={100} tone="exposure" invert
        title="Lo que el investigador ya vio y no se puede desver — no baja mientras dura la aventura. Pasado cierto punto, fallar una tirada de Cordura pierde más de lo que perdería sola."
      />
      {inv.umbral.peakExposure > 0 && (
        <div className="umbral-peak">
          Entre aventuras nunca baja de {pisoDeExposicion(inv.umbral.peakExposure)} — llegó a {inv.umbral.peakExposure} alguna vez.
        </div>
      )}
      <Bar
        label="Estabilidad" value={inv.umbral.stability} max={100} tone="stability"
        title="Qué tan firme sigue pisando lo que es real. Por debajo de 40 empieza a sumar dados de penalización a Descubrir, Escuchar, Psicología, Historia y Orientarse — y peor todavía por debajo de 20."
      />
      {inv.umbral.thresholdsCrossed.length > 0 && (
        <div className="thresholds">
          {inv.umbral.thresholdsCrossed.map((t: string) => (
            <span key={t} className="threshold-chip">{UMBRAL_LABEL[t] ?? t}</span>
          ))}
        </div>
      )}

      <h3 className="sub-title">Características</h3>
      <div className="char-grid">
        {Object.entries(inv.characteristics).map(([k, v]) => (
          <div key={k} className="char"><span>{k}</span><b>{String(v)}</b></div>
        ))}
      </div>

      <h3 className="sub-title">Habilidades</h3>
      <div className="skill-list">
        {Object.entries(inv.skills)
          .sort((a: any, b: any) => b[1] - a[1])
          .map(([k, v]) => (
            <div key={k} className="skill"><span>{k}</span><b>{String(v)}%</b></div>
          ))}
      </div>

      {inv.conditions.length > 0 && (
        <>
          <h3 className="sub-title">Condiciones</h3>
          {inv.conditions.map((c: any, i: number) => (
            <div key={i} className="condition"><b>{c.name}</b> — {c.description}</div>
          ))}
        </>
      )}

      {inv.knowledge.length > 0 && (
        <>
          <h3 className="sub-title">Lo que sabe</h3>
          {inv.knowledge.map((k: string, i: number) => <div key={i} className="known">· {k}</div>)}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}<span className="stat-max">/{max}</span></div>
    </div>
  );
}

function Bar({
  label, value, max, tone, invert, title,
}: {
  label: string; value: number; max: number; tone: string; invert?: boolean; title?: string;
}) {
  const pct = Math.round((value / max) * 100);
  const danger = invert ? pct >= 55 : pct <= 40;
  return (
    <div className="bar-wrap" title={title}>
      <div className="bar-head"><span>{label}</span><b>{value}/{max}</b></div>
      <div className="bar-track">
        <div className={`bar-fill bar-${tone} ${danger ? 'bar-danger' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIRADA
// ─────────────────────────────────────────────────────────────────────────────

const DEGREE_LABEL: Record<string, string> = {
  critical: 'ÉXITO CRÍTICO',
  extreme: 'ÉXITO EXTREMO',
  hard: 'ÉXITO DIFÍCIL',
  regular: 'ÉXITO REGULAR',
  failure: 'FRACASO',
  fumble: 'PIFIA',
};

export const DIFF_LABEL: Record<string, string> = { regular: 'Regular', hard: 'Difícil', extreme: 'Extrema' };

/**
 * Los dados de la fase de desarrollo van al mismo registro que las tiradas de
 * habilidad —tienen que ir, o la cadena verificable se bifurca— pero no son lo
 * mismo. Un 1D6 no tiene porcentaje ni dificultad, y mostrarle al jugador
 * «1D6 · 6% · Dificultad Regular» se lee como un error del programa.
 */
const esDadoDeDesarrollo = (roll: any) => /^1D\d+$/.test(String(roll?.skill ?? ''));

/**
 * `animar` sólo lo enciende la tirada VIVA, la del turno que acaba de pasar.
 * En el historial nunca: doce fichas girando a la vez cada vez que se abre la
 * pestaña no es una animación, es una pantalla rota.
 */
export function RollCard({ roll, big, animar }: { roll: any; big?: boolean; animar?: boolean }) {
  // Antes de cualquier return: los hooks no admiten salidas anticipadas.
  const revelado = useRevelacionTardia(!!animar, String(roll?.id ?? ''));
  // La ficha del panel central arranca PLEGADA. Reportado jugando: el cuadro
  // de la tirada era tan alto que empujaba fuera de pantalla el texto de la
  // escena que esa misma tirada había resuelto — se leía el resultado y no lo
  // que el resultado produjo. Plegada dice lo único que importa en el momento
  // (qué se tiró, cuánto salió, si alcanzó) en una fila; el detalle completo
  // vive donde ya vivía, en la pestaña de tiradas, y acá se puede abrir.
  const [abierta, setAbierta] = useState(false);

  // Una tirada mal formada no puede tumbar la partida entera: la interfaz
  // degrada, el motor sigue teniendo el registro correcto.
  if (!roll || !Array.isArray(roll.dice) || !roll.thresholds) return null;

  if (esDadoDeDesarrollo(roll)) {
    return (
      <div className="roll roll-dev">
        <span className="roll-dice-icon">🎲</span>
        <span className="roll-skill">{roll.skill}</span>
        <span className="roll-result-inline">{roll.result}</span>
        <span className="roll-reason-inline">{roll.reason}</span>
      </div>
    );
  }

  // NO alcanza con que el grado no sea un fracaso liso: una tirada que dio
  // «regular» contra una dificultad pedida «hard» sigue siendo un fracaso de
  // ESE chequeo puntual —CoC 7e real—, y la tarjeta lo mostraba en verde como
  // si hubiera pasado. `meetsDifficulty` es la misma comparación que ya usa
  // el motor para decidir «SUPERA la dificultad» en el mensaje. Reportado
  // jugando: un DES 30% a dificultad Difícil dio 17 —«ÉXITO REGULAR»— y la
  // tarjeta lo pintaba de éxito mientras la escena, correctamente, narraba
  // que el candado no cedía.
  const good = meetsDifficulty(roll.degree as SuccessDegree, roll.difficulty as Difficulty);
  // Sin animación no se toca nada: ni tapado, ni fundido, ni clase de más.
  const tardio = !animar ? '' : revelado ? ' roll-visible' : ' roll-tapado';

  const notaDificultad = !good && !['failure', 'fumble'].includes(roll.degree)
    ? ` — no alcanza para ${DIFF_LABEL[roll.difficulty] ?? roll.difficulty}` : '';

  // ── La ficha compacta del panel central ────────────────────────────────
  // Una fila: qué se tiró, cuánto salió, si alcanzó. Lo demás, al desplegar.
  if (big && !abierta) {
    return (
      <div className={`roll roll-big roll-fila ${good ? 'roll-ok' : 'roll-bad'}`}>
        <span className="roll-dice-icon">🎲</span>
        <span className="roll-skill">{roll.skill}</span>
        <span className="roll-base">{roll.base}%</span>
        {animar
          ? <DadosPercentiles roll={roll} compacto />
          : <span className="roll-fila-dados">{roll.dice.join(' · ')}</span>}
        <span className={`roll-fila-result${tardio}`}>{roll.result}</span>
        <span className={`roll-fila-grado ${good ? 'deg-ok' : 'deg-bad'}${tardio}`}>
          {DEGREE_LABEL[roll.degree] ?? roll.degree}{notaDificultad}
        </span>
        <button className="roll-desplegar" onClick={() => setAbierta(true)}
          title="Ver el detalle de la tirada">
          detalle
        </button>
      </div>
    );
  }

  return (
    <div className={`roll ${big ? 'roll-big' : ''} ${good ? 'roll-ok' : 'roll-bad'}`}>
      <div className="roll-head">
        <span className="roll-dice-icon">🎲</span>
        <span className="roll-skill">{roll.skill}</span>
        <span className="roll-base">{roll.base}%</span>
        <span className="roll-diff">Dificultad: {DIFF_LABEL[roll.difficulty] ?? roll.difficulty}</span>
        {big && (
          <button className="roll-desplegar" onClick={() => setAbierta(false)} title="Plegar">
            plegar
          </button>
        )}
      </div>
      <div className="roll-reason">{roll.reason}</div>
      {animar && <DadosPercentiles roll={roll} />}
      <div className="roll-body">
        {/* Con animación, el número y el grado esperan a que los dados frenen:
            verlos antes es saber el final mientras todavía giran. */}
        <div className={`roll-result${tardio}`}>{roll.result}</div>
        <div className="roll-detail">
          {!animar && <div>dados: {roll.dice.join(' · ')}</div>}
          <div>umbrales: ≤{roll.thresholds.regular} · ≤{roll.thresholds.hard} · ≤{roll.thresholds.extreme}</div>
          {roll.modifiers?.length > 0 && <Modificadores modifiers={roll.modifiers} />}
        </div>
      </div>
      <div className={`roll-degree ${good ? 'deg-ok' : 'deg-bad'}${tardio}`}>
        {DEGREE_LABEL[roll.degree] ?? roll.degree}
        {/* El grado de la tirada es absoluto (ver rules/dice.ts): un «éxito
            regular» sigue siendo ese grado aunque se haya pedido «Difícil».
            Sin esta aclaración, la tarjeta decía «ÉXITO REGULAR» en rojo, que
            lee como una contradicción — se aclara qué faltó. */}
        {notaDificultad && <span className="roll-degree-nota">{notaDificultad}</span>}
      </div>
    </div>
  );
}

/**
 * Los modificadores de una tirada, con el NETO adelante.
 *
 * Reportado jugando: una tirada de Descubrir mostraba tres líneas de
 * bonificación y una de penalización, y se leía como si se hubieran tirado
 * cuatro dados de ventaja. No es lo que pasa —CoC 7e netea los modificadores
 * y topea en 2, y el motor ya lo hace en `tensDiceNeeded`—, pero la ficha
 * listaba los pedidos sin decir en qué quedaron. Ahora dice primero el saldo
 * real, y las líneas de abajo quedan como lo que son: de dónde salió cada uno.
 */
function Modificadores({ modifiers }: { modifiers: any[] }) {
  const neto = modifiers.reduce(
    (n: number, m: any) => n + (m.kind === 'bonus_die' ? m.count : -m.count), 0);
  const extra = Math.min(Math.abs(neto), 2);
  const resumen = neto === 0
    ? 'se anulan entre sí: ningún dado extra'
    : `${extra} dado${extra === 1 ? '' : 's'} de ${neto > 0 ? 'bonificación' : 'penalización'}` +
      (Math.abs(neto) > extra ? ` (el tope de las reglas son 2; se pidieron ${Math.abs(neto)})` : '');
  return (
    <div className="roll-mods">
      <div className="roll-mods-neto">Neto: {resumen}</div>
      {modifiers.map((m: any, i: number) => (
        <div key={i} className="roll-mods-item">
          {m.kind === 'bonus_die' ? '+' : '−'}{m.count} — {m.reason}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIVALES EN PELEA — combate de verdad, dentro de la historia (no el simulador)
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  entero: 'Entero', lastimado: 'Lastimado', malherido: 'Malherido', fuera_de_combate: 'Fuera de combate',
};

/**
 * Cuatro escalones, no una barra de PV. El servidor nunca manda el número
 * —`sanitize.ts` lo recorta a propósito, misma decisión que ya regía para
 * la paciencia de un NPC—: en la mesa nadie ve la ficha del rival, ve cómo
 * se mueve. Esto es la versión visual de esa regla, no una excepción.
 */
export function Rivales({ npcs }: { npcs: any[] }) {
  // `present` además de `aqui`: un rival listado en el lugar pero que todavía no
  // «entró en la historia» (`present: false`, lo hace aparecer una escena) no
  // se muestra. Sin esto, «Rastreador del Cabildo · Mosquete español de chispa ·
  // ENTERO» aparecía en el primer turno de El Santo Oficio de Cuyo, antes de
  // que nadie lo persiguiera. Mismo bug que el Pólipo de Merced, en la interfaz.
  const enPelea = npcs.filter((n) => n.aqui && n.present && n.status === 'alive' && n.estadoCombate);
  if (!enPelea.length) return null;
  return (
    <div className="rivales">
      {enPelea.map((n) => (
        <div key={n.id} className={`rival rival-${n.estadoCombate}`}>
          <div className="rival-nombre">{n.name}</div>
          {n.arma && <div className="rival-arma">{n.arma}</div>}
          <div className="rival-estado-fila">
            {(['entero', 'lastimado', 'malherido', 'fuera_de_combate'] as const).map((tramo, i) => (
              <span
                key={tramo}
                className={`rival-tramo ${
                  ['entero', 'lastimado', 'malherido', 'fuera_de_combate'].indexOf(n.estadoCombate) >= i
                    ? 'rival-tramo-on' : ''
                }`}
              />
            ))}
            <span className="rival-estado-label">{ESTADO_LABEL[n.estadoCombate] ?? n.estadoCombate}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PESTAÑAS DE LA DERECHA
// ─────────────────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  physical: 'física', documentary: 'documental',
  testimonial: 'testimonial', experiential: 'experiencial',
};

export function Board({ board }: { board: any }) {
  if (!board) return null;
  const empty = board.facts.length + board.clues.length + board.hypotheses.length +
    board.contradictions.length + board.questions.length === 0;
  if (empty) return <div className="empty">El tablero está vacío. Todavía no hay nada que sostener.</div>;
  return (
    <div className="board">
      <Group title="Hechos" count={board.facts.length}>
        {board.facts.map((f: any) => <div key={f.id} className="card card-fact">{f.statement}</div>)}
      </Group>
      <Group title="Pistas" count={board.clues.length}>
        {board.clues.map((c: any) => (
          <div key={c.id} className="card card-clue">
            <div className="card-tag">{KIND_LABEL[c.kind] ?? c.kind}</div>
            <div>{c.description}</div>
            <div className="card-source">{c.source}</div>
          </div>
        ))}
      </Group>
      <Group title="Contradicciones" count={board.contradictions.length}>
        {board.contradictions.map((c: any) => (
          <div key={c.id} className="card card-contra">
            <div>{c.description}</div>
            <div className="card-source">{c.between.join('  ✕  ')}</div>
          </div>
        ))}
      </Group>
      <Group title="Hipótesis" count={board.hypotheses.length}>
        {board.hypotheses.map((h: any) => (
          <div key={h.id} className="card card-hyp">
            <div>{h.statement}</div>
            <div className="card-source">{h.supporting} a favor · {h.contradicting} en contra · {h.status}</div>
          </div>
        ))}
      </Group>
      <Group title="Preguntas abiertas" count={board.questions.length}>
        {board.questions.map((q: any) => <div key={q.id} className="card card-q">{q.question}</div>)}
      </Group>
    </div>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="group">
      <h3 className="group-title">{title} <span className="group-count">{count}</span></h3>
      {children}
    </div>
  );
}

/**
 * El orden en que se muestran los cajones, y cómo se llaman en pantalla.
 * Fijo y no alfabético: se lee de lo que se usa peleando a lo que todavía no
 * se sabe qué es.
 */
const CATEGORIAS: Array<{ id: string; titulo: string }> = [
  { id: 'arma', titulo: 'Armas' },
  { id: 'documento', titulo: 'Papeles' },
  { id: 'herramienta', titulo: 'Herramientas' },
  { id: 'material', titulo: 'Materiales' },
  { id: 'personal', titulo: 'Efectos personales' },
  { id: 'hallazgo', titulo: 'Hallazgos' },
];

const GLIFO_CATEGORIA: Record<string, string> = {
  arma: '⚔', documento: '✎', herramienta: '⚒', material: '◈', personal: '❖', hallazgo: '✦',
};

/** Detalle de UN objeto: lo que antes era la tarjeta, más lo que se puede hacer con él. */
function ItemDetalle({ i, dejar, tirar, busy, onPick, onCerrar }: {
  i: any; dejar?: Opcion; tirar?: Opcion; busy: boolean;
  onPick: (intencion: string, id: string) => void; onCerrar: () => void;
}) {
  // Deshacerse es para siempre y no tiene marcha atrás: dos clicks, como los
  // desenlaces. Antes era un botón más entre los de la acción y se apretaba
  // sin querer.
  const [seguro, setSeguro] = useState(false);
  return (
    <div className="card card-item inv-detalle">
      <div className="item-head">
        <span className="inv-glifo">{GLIFO_CATEGORIA[i.categoria ?? 'hallazgo'] ?? '✦'}</span>
        <b>{i.name}</b>
        {i.carried && <span className="carried-tag">encima</span>}
        {i.roto && <span className="broken-tag">rota</span>}
        <button className="inv-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </div>
      <div className="item-desc">{i.shortDescription}</div>
      {i.properties.map((p: any, n: number) => (
        <div key={n} className={`prop ${p.discovered ? 'prop-found' : ''}`}>
          {p.discovered && <span className="prop-tag">descubierto</span>}
          {p.description}
        </div>
      ))}
      {i.hasUndiscovered && <div className="prop-hint">Este objeto no ha terminado de decir lo que tiene para decir.</div>}
      {(dejar || tirar) && (
        <div className="inv-acciones">
          {dejar && (
            <button disabled={busy} onClick={() => onPick(dejar.intencion, dejar.id)}>Dejar acá</button>
          )}
          {tirar && (
            <button
              disabled={busy}
              className={`inv-tirar ${seguro ? 'inv-tirar-seguro' : ''}`}
              onClick={() => { if (seguro) onPick(tirar.intencion, tirar.id); else setSeguro(true); }}
              onBlur={() => setSeguro(false)}
            >
              {seguro ? '¿Seguro? Es para siempre' : 'Deshacerte (para siempre)'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Una grilla de fichas, no una lista de tarjetas. Con lo juntado en siete
 * aventuras la lista larga obligaba a scrollear para llegar a cualquier
 * objeto, y la descripción de cada uno —el 90% del alto— casi nunca se lee.
 * Ahora se ve todo de un vistazo, agrupado por cajón, y la descripción y los
 * botones de soltar/descartar aparecen sólo del objeto que se toca.
 *
 * `acciones` trae los `dejar:`/`tirar:` que antes ensuciaban el panel
 * principal: viven acá, junto al objeto al que se refieren.
 */
export function Inventory({ items, acciones = [], busy = false, onPick = () => {} }: {
  items: any[]; acciones?: Opcion[]; busy?: boolean;
  onPick?: (intencion: string, id: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  if (!items?.length) return <div className="empty">Nada al alcance.</div>;
  const encima = items.filter((i) => i.carried);
  const alrededor = items.filter((i) => !i.carried);
  const elegido = items.find((i) => i.id === sel) ?? null;

  const ficha = (i: any) => (
    <button
      key={i.id}
      className={`inv-ficha ${i.carried ? 'inv-ficha-encima' : ''} ${sel === i.id ? 'inv-ficha-sel' : ''}`}
      onClick={() => setSel(sel === i.id ? null : i.id)}
      title={i.name}
    >
      <span className="inv-glifo">{GLIFO_CATEGORIA[i.categoria ?? 'hallazgo'] ?? '✦'}</span>
      <span className="inv-nombre">{i.name}</span>
      {i.roto && <span className="broken-tag">rota</span>}
    </button>
  );

  return (
    <div className="board inventario">
      {elegido && (
        <ItemDetalle
          key={elegido.id}
          i={elegido}
          dejar={acciones.find((o) => o.id === `dejar:${elegido.id}`)}
          tirar={acciones.find((o) => o.id === `tirar:${elegido.id}`)}
          busy={busy}
          onPick={(intencion, id) => { setSel(null); onPick(intencion, id); }}
          onCerrar={() => setSel(null)}
        />
      )}
      {CATEGORIAS.map(({ id, titulo }) => {
        const delCajon = encima.filter((i) => (i.categoria ?? 'hallazgo') === id);
        if (!delCajon.length) return null;
        return (
          <div key={id} className="inv-grupo">
            <div className="inv-grupo-titulo">{titulo} <span className="inv-grupo-cuenta">{delCajon.length}</span></div>
            <div className="inv-grilla">{delCajon.map(ficha)}</div>
          </div>
        );
      })}
      {alrededor.length > 0 && (
        <div className="inv-grupo">
          <div className="inv-grupo-titulo">Acá cerca <span className="inv-grupo-cuenta">{alrededor.length}</span></div>
          <div className="inv-grilla">{alrededor.map(ficha)}</div>
        </div>
      )}
      {!elegido && <div className="inv-pista">Tocá un objeto para verlo.</div>}
    </div>
  );
}

export function Documents({ docs }: { docs: any[] }) {
  if (!docs?.length) return <div className="empty">Ningún documento todavía.</div>;
  return (
    <div className="board">
      {docs.map((d) => (
        <details key={d.id} className="doc">
          <summary><b>{d.title}</b><span className="doc-meta">{d.author} · {d.date}</span></summary>
          <pre className="doc-body">{d.content}</pre>
        </details>
      ))}
    </div>
  );
}

export function RollHistory({ rolls, commitment, seed }: { rolls: any[]; commitment: string; seed: string | null }) {
  return (
    <div className="board">
      <div className="audit">
        <div className="audit-title">Auditoría del azar</div>
        <div className="audit-line">Compromiso de semilla (SHA-256):</div>
        <code className="audit-hash">{commitment}</code>
        {seed ? (
          <>
            <div className="audit-line">Semilla revelada:</div>
            <code className="audit-hash">{seed}</code>
            <div className="audit-note">
              Verificá: SHA-256 de la semilla debe dar el compromiso de arriba, y cada tirada debe
              reproducirse con HMAC-SHA256(semilla, "roll:" + índice).
            </div>
          </>
        ) : (
          <div className="audit-note">
            La semilla se revela al cerrar la campaña. Antes no, porque permitiría predecir las tiradas
            que faltan. El compromiso publicado al empezar garantiza que no puede cambiarse.
          </div>
        )}
      </div>
      {rolls.length === 0 && <div className="empty">Ninguna tirada todavía.</div>}
      {[...rolls].reverse().map((r) => <RollCard key={r.id} roll={r} />)}
    </div>
  );
}
