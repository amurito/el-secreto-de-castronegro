import React from 'react';
import { DadosPercentiles, useRevelacionTardia } from './dados.tsx';
import { pisoDeExposicion } from '../rules/umbral.ts';

// ─────────────────────────────────────────────────────────────────────────────
// FICHA
// ─────────────────────────────────────────────────────────────────────────────

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
        {inv.status !== 'alive' && <div className="dead-badge">{inv.status === 'dead' ? 'MUERTO' : inv.status.toUpperCase()}</div>}
      </div>

      <div className="stat-grid">
        <Stat label="PV" value={d.hp} max={d.maxHp} tone="hp" />
        <Stat label="SAN" value={d.san} max={d.maxSan} tone="san" />
        <Stat label="PM" value={d.mp} max={d.maxMp} tone="mp" />
        <Stat label="Suerte" value={d.luck} max={99} tone="luck" />
      </div>

      <h3 className="sub-title">Umbral</h3>
      <Bar label="Exposición" value={inv.umbral.exposure} max={100} tone="exposure" invert />
      {inv.umbral.peakExposure > 0 && (
        <div className="umbral-peak">
          Entre aventuras nunca baja de {pisoDeExposicion(inv.umbral.peakExposure)} — llegó a {inv.umbral.peakExposure} alguna vez.
        </div>
      )}
      <Bar label="Estabilidad" value={inv.umbral.stability} max={100} tone="stability" />
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

function Bar({ label, value, max, tone, invert }: { label: string; value: number; max: number; tone: string; invert?: boolean }) {
  const pct = Math.round((value / max) * 100);
  const danger = invert ? pct >= 55 : pct <= 40;
  return (
    <div className="bar-wrap">
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

const DIFF_LABEL: Record<string, string> = { regular: 'Regular', hard: 'Difícil', extreme: 'Extrema' };

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

  const good = ['critical', 'extreme', 'hard', 'regular'].includes(roll.degree);
  // Sin animación no se toca nada: ni tapado, ni fundido, ni clase de más.
  const tardio = !animar ? '' : revelado ? ' roll-visible' : ' roll-tapado';
  return (
    <div className={`roll ${big ? 'roll-big' : ''} ${good ? 'roll-ok' : 'roll-bad'}`}>
      <div className="roll-head">
        <span className="roll-dice-icon">🎲</span>
        <span className="roll-skill">{roll.skill}</span>
        <span className="roll-base">{roll.base}%</span>
        <span className="roll-diff">Dificultad: {DIFF_LABEL[roll.difficulty] ?? roll.difficulty}</span>
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
          {roll.modifiers?.length > 0 && (
            <div className="roll-mods">
              {roll.modifiers.map((m: any, i: number) => (
                <div key={i}>{m.count} dado(s) de {m.kind === 'bonus_die' ? 'bonificación' : 'penalización'} — {m.reason}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={`roll-degree ${good ? 'deg-ok' : 'deg-bad'}${tardio}`}>
        {DEGREE_LABEL[roll.degree] ?? roll.degree}
      </div>
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
  const enPelea = npcs.filter((n) => n.aqui && n.status === 'alive' && n.estadoCombate);
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

export function Inventory({ items }: { items: any[] }) {
  if (!items?.length) return <div className="empty">Nada al alcance.</div>;
  return (
    <div className="board">
      {items.map((i) => (
        <div key={i.id} className={`card card-item ${i.carried ? 'carried' : ''}`}>
          <div className="item-head">
            <b>{i.name}</b>
            {i.carried && <span className="carried-tag">encima</span>}
            {i.roto && <span className="broken-tag">rota</span>}
          </div>
          <div className="item-desc">{i.shortDescription}</div>
          {i.properties.map((p: any, n: number) => (
            <div key={n} className={`prop ${p.discovered ? 'prop-found' : ''}`}>
              {p.discovered && <span className="prop-tag">descubierto</span>}
              {p.description}
            </div>
          ))}
          {i.hasUndiscovered && <div className="prop-hint">Este objeto no ha terminado de decir lo que tiene para decir.</div>}
        </div>
      ))}
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
