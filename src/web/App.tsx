import React, { useEffect, useRef, useState } from 'react';
import { Sheet, RollCard, Board, Inventory, Documents, RollHistory } from './components.tsx';
import type { GameApi, StatusInfo } from '../app/api.ts';
import { createHttpApi, serverAvailable } from '../app/api.http.ts';
import { createLocalApi } from '../app/api.local.ts';

type Tab = 'tablero' | 'inventario' | 'documentos' | 'tiradas';

interface Line { id: string; kind: string; text: string }

/**
 * Elige dónde corre el motor.
 *
 * Con `npm run dev` hay servidor Node detrás del proxy de Vite: se usa, y así
 * puede narrar Claude con la clave a salvo del lado del servidor. Publicado
 * como sitio estático no hay servidor y el motor corre entero en la pestaña,
 * con el log en IndexedDB.
 *
 * Sólo se sondea el servidor cuando puede haberlo. En el build estático el
 * sondeo fallaría siempre y dejaría un error en la consola en cada carga, que
 * en un juego publicado se lee como si algo estuviera roto.
 *
 * Para servir el build detrás del servidor Node y conservar el Keeper IA:
 *   VITE_MODO=servidor npm run build
 */
async function elegirApi(): Promise<GameApi> {
  const puedeHaberServidor =
    import.meta.env.DEV || import.meta.env.VITE_MODO === 'servidor';
  if (puedeHaberServidor && (await serverAvailable())) return createHttpApi();
  return createLocalApi();
}

export function App() {
  const [api, setApi] = useState<GameApi | null>(null);
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [state, setState] = useState<any>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [lastRoll, setLastRoll] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('tablero');
  const [error, setError] = useState<string | null>(null);
  const [cost, setCost] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    elegirApi().then(async (a) => {
      setApi(a);
      setStatus(await a.status());
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, streaming]);

  async function newCampaign() {
    if (!api) return;
    setBusy(true); setError(null);
    try {
      const data = await api.createCampaign('agua-quieta');
      setCampaignId(data.campaignId);
      setState(data.state);
      setLines([{ id: 'opening', kind: 'keeper', text: data.opening }]);
      setOptions(['Mirar el aljibe', 'Hablar con la mujer', 'Entrar a la casa']);
      setLastRoll(null); setStreaming('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      setError(`No se pudo crear la partida: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadCampaign(id: string) {
    if (!api) return;
    setBusy(true);
    try {
      const data = await api.getCampaign(id);
      setCampaignId(id);
      setState(data.state);
      setLines([
        { id: 'opening', kind: 'keeper', text: data.opening },
        ...data.state.narrative.map((n: any) => ({ id: n.id, kind: n.kind, text: n.text })),
      ]);
      setLastRoll(data.state.rolls[data.state.rolls.length - 1] ?? null);
    } catch (e) {
      setError(`No se pudo abrir la partida: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    if (!api || !campaignId || !text.trim() || busy) return;
    setBusy(true); setError(null); setStreaming(''); setOptions([]);
    setLines((l) => [...l, { id: `p-${Date.now()}`, kind: 'player', text }]);
    setAction('');

    let acc = '';
    try {
      await api.submitIntent(campaignId, text, (msg) => {
        switch (msg.kind) {
          case 'narration_delta': acc += msg.data as string; setStreaming(acc); break;
          case 'narration_replace': acc = msg.data as string; setStreaming(acc); break;
          case 'roll': setLastRoll(msg.data); break;
          case 'state': setState(msg.data); break;
          case 'options': setOptions((msg.data as string[]) ?? []); break;
          case 'cost': setCost(msg.data); break;
          case 'error': setError(String(msg.data)); break;
          default: break;
        }
      });
    } catch (e) {
      setError((e as Error).message);
    }

    if (acc) setLines((l) => [...l, { id: `k-${Date.now()}`, kind: 'keeper', text: acc }]);
    setStreaming(''); setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function continueWith(investigatorId: string) {
    if (!api || !campaignId) return;
    const data = await api.introduceInvestigator(campaignId, investigatorId);
    setState(data.state);
    setLines((l) => [...l, {
      id: `sys-${Date.now()}`, kind: 'system',
      text: 'El mundo conserva todo lo que hizo el investigador anterior. Continuás con otro.',
    }]);
  }

  // ── PANTALLA DE INICIO ─────────────────────────────────────────────────────
  if (!campaignId) {
    return (
      <div className="start">
        <div className="start-inner">
          <h1 className="title">El Secreto de Castronegro</h1>
          <p className="subtitle">Motor narrativo interactivo · Keeper artificial</p>
          {!status && <div className="mode">Iniciando…</div>}
          {status && (
            <div className={`mode ${status.keeperMode === 'ia' ? 'mode-ia' : 'mode-motor'}`}>
              {status.keeperMode === 'ia'
                ? `Keeper IA — ${status.model}, esfuerzo ${status.effort}. La clave vive en el servidor.`
                : status.runtime === 'navegador'
                  ? 'MODO MOTOR · todo corre en esta pestaña. Sin servidor, sin clave, sin costo. Los dados, el estado y el guardado son reales; la narración la compone el motor. Tu partida se guarda en este navegador.'
                  : 'MODO MOTOR — sin clave de API. Dados reales, estado real, reglas reales; la narración la genera el motor. Poné ANTHROPIC_API_KEY en .env para que narre Claude.'}
            </div>
          )}
          <div className="scenario-card">
            <h2>Agua Quieta</h2>
            <p>
              Ignacio Vera, arrendatario de la estancia Los Álamos, desapareció hace once noches. No hay
              cuerpo, no hay nota, no hay rastro. La policía de campaña anotó «se ausentó del domicilio»
              y cerró el asunto. Alguien tiene que ir a mirar.
            </p>
            <div className="scenario-meta">1924 · Una hora aproximadamente · Muerte permanente</div>
            <button className="primary" onClick={newCampaign} disabled={busy || !api}>Empezar</button>
          </div>
          {api && <PreviousCampaigns api={api} onLoad={loadCampaign} />}
        </div>
      </div>
    );
  }

  const inv = state?.investigator;
  const dead = inv && inv.status !== 'alive';
  const ended = Boolean(state?.ending);

  return (
    <div className="app">
      <aside className="col col-left"><Sheet inv={inv} /></aside>

      <main className="col col-center">
        <header className="scene-head">
          <div className="scene-name">{state?.location?.name}</div>
          <div className="scene-time">{state?.worldTime?.display}</div>
        </header>

        <div className="narrative" ref={scrollRef}>
          {lines.map((l) => (
            <div key={l.id} className={`line line-${l.kind}`}>
              {l.kind === 'player' && <span className="line-mark">▸ </span>}
              {l.text}
            </div>
          ))}
          {streaming && <div className="line line-keeper line-streaming">{streaming}</div>}
          {busy && !streaming && <div className="thinking">El Keeper está resolviendo…</div>}
        </div>

        {lastRoll && <RollCard roll={lastRoll} big />}

        {error && <div className="error">{error}</div>}

        {ended ? (
          <div className="ending">
            <div className="ending-title">{state.ending.title}</div>
            <div className="ending-text">{state.ending.text}</div>
            <button className="primary" onClick={() => setTab('tiradas')}>Ver la auditoría del azar</button>
            <button className="ghost" onClick={() => { setCampaignId(null); setState(null); }}>Nueva partida</button>
          </div>
        ) : dead ? (
          <div className="death">
            <div className="death-title">{inv.name} ha muerto.</div>
            <p>
              La muerte es permanente. El mundo conserva todas las consecuencias, pistas y relaciones
              que dejó. Podés continuar con otro investigador.
            </p>
            {state.reserveAvailable.map((r: any) => (
              <button key={r.id} className="primary" onClick={() => continueWith(r.id)}>
                Continuar como {r.name}, {r.occupation.toLowerCase()}
              </button>
            ))}
          </div>
        ) : (
          <div className="input-area">
            {options.length > 0 && (
              <div className="options">
                {options.map((o, i) => (
                  <button key={i} className="option" onClick={() => send(o)} disabled={busy}>{o}</button>
                ))}
              </div>
            )}
            <div className="input-row">
              <textarea
                ref={inputRef}
                className="action-input"
                placeholder="¿Qué hacés? Escribí cualquier cosa: las opciones son sugerencias, no una lista cerrada."
                value={action}
                rows={2}
                disabled={busy}
                onChange={(e) => setAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(action); }
                }}
              />
              <button className="primary send" onClick={() => send(action)} disabled={busy || !action.trim()}>
                {busy ? '…' : 'Actuar'}
              </button>
            </div>
            {cost && (
              <div className="cost">
                caché leído {cost.cacheRead} · escrito {cost.cacheWrite} · entrada {cost.inputTokens} · salida {cost.outputTokens} tokens
              </div>
            )}
          </div>
        )}
      </main>

      <aside className="col col-right">
        <div className="tabs">
          {(['tablero', 'inventario', 'documentos', 'tiradas'] as Tab[]).map((t) => (
            <button key={t} className={`tab ${tab === t ? 'tab-on' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="tab-body">
          {tab === 'tablero' && <Board board={state?.board} />}
          {tab === 'inventario' && <Inventory items={state?.items ?? []} />}
          {tab === 'documentos' && <Documents docs={state?.documents ?? []} />}
          {tab === 'tiradas' && (
            <RollHistory rolls={state?.rolls ?? []} commitment={state?.rngCommitment ?? ''} seed={state?.seedRevealed ?? null} />
          )}
        </div>
        {state?.consequences?.length > 0 && (
          <div className="consequences">
            <div className="cons-title">El mundo recuerda</div>
            {state.consequences.map((c: any, i: number) => (
              <div key={i} className="cons">{c.permanent ? '● ' : '○ '}{c.description}</div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function PreviousCampaigns({ api, onLoad }: { api: GameApi; onLoad: (id: string) => void }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { api.listCampaigns().then(setList).catch(() => setList([])); }, [api]);
  if (!list.length) return null;
  return (
    <div className="saves">
      <h3>Partidas guardadas</h3>
      <p className="saves-note">
        Un autoguardado por campaña, sin ranuras. Es lo único coherente con muerte permanente.
      </p>
      {list.map((c) => (
        <div key={c.campaignId} className="save-row-wrap">
          <button className="save-row" onClick={() => onLoad(c.campaignId)}>
            <span>{c.title}</span>
            <span className="save-date">{new Date(c.lastPlayedAt).toLocaleString('es')}</span>
          </button>
          <button
            className="save-del"
            title="Borrar esta partida"
            onClick={async () => {
              await api.deleteCampaign(c.campaignId);
              setList((l) => l.filter((x) => x.campaignId !== c.campaignId));
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
}
