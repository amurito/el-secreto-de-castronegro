import React, { useEffect, useRef, useState } from 'react';
import { Sheet, RollCard, Board, Inventory, Documents, RollHistory } from './components.tsx';
import type { GameApi, StatusInfo, DevelopmentOffer } from '../app/api.ts';
import { createHttpApi, serverAvailable } from '../app/api.http.ts';
import { createLocalApi } from '../app/api.local.ts';
import { ETIQUETA_GRUPO, type Opcion, type GrupoAccion } from '../scenario/acciones.ts';
import { CATALOGO, entradaDe, siguienteDe } from '../scenario/catalogo.ts';
import { Creacion } from './Creacion.tsx';
import { Simulador } from './Simulador.tsx';
import { listarPlantillas, guardarPlantilla, borrarPlantilla, type Plantilla } from '../app/plantillas.ts';
import type { Investigator } from '../shared/types.ts';
import { leerPreferenciaDados, guardarPreferenciaDados, prefiereMenosMovimiento } from './dados.tsx';

type Tab = 'tablero' | 'inventario' | 'documentos' | 'tiradas';

interface Line { id: string; kind: string; text: string }

const ORDEN_GRUPOS: GrupoAccion[] = ['observar', 'hablar', 'usar', 'mover', 'decidir'];

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

/** Qué opciones vio el jugador y cuáles todavía no tocó. Ver `aplicarOpciones`. */
interface Marcas { vistas: Set<string>; pendientes: Set<string> }

/**
 * El resalte de las opciones nuevas vive en localStorage, no en el log de
 * eventos: es información de presentación, no del mundo. Si se pierde —otro
 * navegador, modo privado, el jugador limpió el almacenamiento— se pierde el
 * resalte y nada más; la partida está entera en IndexedDB.
 *
 * Por campaña, porque «nueva» significa nueva en esta partida.
 */
const claveMarcas = (campaignId: string) => `castronegro:opciones-nuevas:${campaignId}`;

function leerMarcas(campaignId: string): { vistas: string[]; pendientes: string[] } {
  try {
    const crudo = localStorage.getItem(claveMarcas(campaignId));
    if (!crudo) return { vistas: [], pendientes: [] };
    const datos = JSON.parse(crudo) as { vistas?: string[]; pendientes?: string[] };
    return { vistas: datos.vistas ?? [], pendientes: datos.pendientes ?? [] };
  } catch {
    return { vistas: [], pendientes: [] };
  }
}

function guardarMarcas(campaignId: string, m: Marcas): void {
  try {
    localStorage.setItem(claveMarcas(campaignId), JSON.stringify({
      vistas: [...m.vistas], pendientes: [...m.pendientes],
    }));
  } catch {
    // Sin almacenamiento el juego funciona igual. No vale interrumpir por esto.
  }
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
  const [options, setOptions] = useState<Opcion[]>([]);
  /**
   * Marcado de opciones nuevas. Dos conjuntos:
   *
   *   vistas     — todo id que alguna vez se ofreció. Distingue «recién
   *                desbloqueada» de «estaba desde el principio».
   *   pendientes — las desbloqueadas que el jugador todavía no tocó.
   *
   * Antes el resalte duraba un turno, y eso castigaba al que se detenía a
   * leer: una opción nueva podía aparecer y apagarse sin que la registrara.
   * Ahora dura hasta que la usa.
   */
  const [marcas, setMarcas] = useState<Marcas>({ vistas: new Set(), pendientes: new Set() });
  const [lastRoll, setLastRoll] = useState<any>(null);
  /** Pistas que había la última vez que se miró el tablero. Para el aviso. */
  const [pistasVistas, setPistasVistas] = useState(0);
  const [tab, setTab] = useState<Tab>('tablero');
  const [error, setError] = useState<string | null>(null);
  const [cost, setCost] = useState<any>(null);
  /** Escenario elegido para crear personaje propio. null = no estamos creando. */
  const [creando, setCreando] = useState<string | null>(null);
  /** Campaña del simulador de combate. null = no estamos en el galpón. */
  const [simulando, setSimulando] = useState<string | null>(null);
  /** Personajes de prueba guardados para el simulador. Viven en localStorage. */
  const [plantillas, setPlantillas] = useState<Plantilla[]>(() => listarPlantillas());
  /**
   * Qué panel se ve EN MÓVIL. En pantalla grande no se usa: las tres columnas
   * están a la vista y este estado lo ignora el CSS.
   *
   * Un juego de texto en un teléfono tiene que ser texto a pantalla completa.
   * Apilar las tres columnas dejaba la narración —el juego— en 48 píxeles,
   * medidos, con la ficha del personaje ocupando 325 arriba.
   */
  const [panel, setPanel] = useState<'historia' | 'ficha' | 'tablero'>('historia');
  /** Animar los dados al tirar. Preferencia del jugador, no de la partida. */
  const [animarDados, setAnimarDados] = useState(leerPreferenciaDados);
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

  /**
   * Marca las opciones recién desbloqueadas. Se calcula en el cliente a
   * propósito: es información de presentación, no del mundo, y no tiene por
   * qué ensuciar el log de eventos.
   *
   * `cargaDe` es el id de campaña cuando esta llamada es la apertura de una
   * partida. Va explícito porque `setCampaignId` acaba de correr y el estado
   * de React todavía no lo refleja.
   */
  function aplicarOpciones(opciones: Opcion[], cargaDe?: string) {
    setOptions(opciones);
    const ids = opciones.map((o) => o.id);

    if (cargaDe) {
      const guardado = leerMarcas(cargaDe);
      // Partida nueva: lo que hay ahora es el punto de partida, así que nada
      // está «recién desbloqueado». Partida que se retoma: se recupera lo que
      // quedó sin tocar, y si el motor ofrece algo que no estaba, se suma.
      const arranca = guardado.vistas.length === 0;
      const m: Marcas = arranca
        ? { vistas: new Set(ids), pendientes: new Set() }
        : { vistas: new Set(guardado.vistas), pendientes: new Set(guardado.pendientes) };
      if (!arranca) {
        for (const id of ids) if (!m.vistas.has(id)) { m.vistas.add(id); m.pendientes.add(id); }
      }
      setMarcas(m);
      guardarMarcas(cargaDe, m);
      return;
    }

    setMarcas((prev) => {
      const m: Marcas = { vistas: new Set(prev.vistas), pendientes: new Set(prev.pendientes) };
      for (const id of ids) if (!m.vistas.has(id)) { m.vistas.add(id); m.pendientes.add(id); }
      if (campaignId) guardarMarcas(campaignId, m);
      return m;
    });
  }

  /** El jugador usó una opción: deja de estar resaltada, para siempre. */
  function tocar(id: string) {
    setMarcas((prev) => {
      if (!prev.pendientes.has(id)) return prev;
      const pendientes = new Set(prev.pendientes);
      pendientes.delete(id);
      const m: Marcas = { vistas: prev.vistas, pendientes };
      if (campaignId) guardarMarcas(campaignId, m);
      return m;
    });
  }

  async function newCampaign(scenarioId: string) {
    if (!api) return;
    setBusy(true); setError(null);
    try {
      const data = await api.createCampaign(scenarioId);
      setCampaignId(data.campaignId);
      setState(data.state);
      setLines([{ id: 'opening', kind: 'keeper', text: data.opening }]);
      aplicarOpciones(data.options ?? [], data.campaignId);
      setLastRoll(null); setStreaming('');
    } catch (e) {
      setError(`No se pudo crear la partida: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Abre el galpón. `creando === 'simulador'` significa que el jugador quiso
   * probarlo con un investigador propio; sin eso, va con Elena.
   *
   * `guardar` sólo es true cuando el investigador viene RECIÉN armado por el
   * formulario rápido: reabrir con Elena o con una plantilla ya guardada no
   * tiene que volver a guardar nada, o cada partida dejaría una copia nueva.
   */
  async function abrirSimulador(investigador?: unknown, guardar = false) {
    if (!api) return;
    setBusy(true); setError(null);
    try {
      const data = investigador
        ? await api.createCampaignConFicha('simulador', investigador)
        : await api.createCampaign('simulador');
      if (guardar && investigador) {
        guardarPlantilla(investigador as Investigator);
        setPlantillas(listarPlantillas());
      }
      setCreando(null);
      setSimulando(data.campaignId);
    } catch (e) {
      setError(`No se pudo abrir el simulador: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function newCampaignConFicha(scenarioId: string, investigador: unknown) {
    if (!api) return;
    setBusy(true); setError(null);
    try {
      const data = await api.createCampaignConFicha(scenarioId, investigador);
      setCreando(null);
      setCampaignId(data.campaignId);
      setState(data.state);
      setLines([{ id: 'opening', kind: 'keeper', text: data.opening }]);
      aplicarOpciones(data.options ?? [], data.campaignId);
      setLastRoll(null); setStreaming('');
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
      aplicarOpciones(data.options ?? [], id);
    } catch (e) {
      setError(`No se pudo abrir la partida: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string, idOpcion?: string) {
    if (!api || !campaignId || !text.trim() || busy) return;
    if (idOpcion) tocar(idOpcion);
    // Limpiar la tirada anterior es obligatorio, no cosmético. La mayoría de
    // las acciones no tiran dados —hablar, agarrar, caminar—, y sin esto la
    // ficha de la tirada anterior seguía en pantalla debajo de la narración
    // nueva. Se lee como si esa tirada hubiera resuelto también esta acción.
    setBusy(true); setError(null); setStreaming(''); setOptions([]); setLastRoll(null);
    // En móvil la respuesta llega a la historia: si el jugador tocó una opción
    // desde otro panel, hay que llevarlo a donde va a pasar algo.
    setPanel('historia');
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
          case 'options': aplicarOpciones((msg.data as Opcion[]) ?? []); break;
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

  // ── SIMULADOR DE COMBATE ───────────────────────────────────────────────────
  // Va antes que todo lo demás: es una pantalla propia, sin narración ni
  // tablero, y no comparte nada con la de jugar salvo la ficha.
  if (simulando && api) {
    return <Simulador api={api} campaignId={simulando} onSalir={() => setSimulando(null)} />;
  }

  // ── PANTALLA DE CREACIÓN ───────────────────────────────────────────────────
  if (!campaignId && creando) {
    const alGalpon = creando === 'simulador';
    return (
      <div className="start">
        <div className="start-inner start-ancho">
          <Creacion
            scenarioTitulo={alGalpon ? 'Simulador de combate' : entradaDe(creando)?.scenario.title ?? ''}
            ocupado={busy}
            rapido={alGalpon}
            onCancelar={() => setCreando(null)}
            onListo={(inv) => (alGalpon ? abrirSimulador(inv, true) : newCampaignConFicha(creando, inv))}
          />
          {error && <div className="error error-inicio">{error}</div>}
        </div>
      </div>
    );
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
          {/* Una tarjeta por aventura, en el orden cronológico del universo y
              no en el orden en que se escribieron. Agregar una aventura al
              catálogo la hace aparecer acá sin tocar la interfaz. */}
          {CATALOGO.map((e) => (
            <div className="scenario-card" key={e.scenario.id}>
              <h2>{e.scenario.title}</h2>
              <p>{e.scenario.surfacePremise}</p>
              <div className="scenario-meta">
                {e.epoca} · {e.duracion} · Muerte permanente
              </div>
              {e.requiere?.length ? (
                <div className="scenario-antes">
                  Se puede jugar sola. Se lee distinto después de{' '}
                  {e.requiere.map((id) => entradaDe(id)?.scenario.title ?? id).join(', ')}.
                </div>
              ) : null}
              <div className="scenario-botones">
                <button className="primary" onClick={() => newCampaign(e.scenario.id)} disabled={busy || !api}>
                  {busy ? 'Abriendo…' : 'Empezar con Elena'}
                </button>
                <button className="ghost" onClick={() => setCreando(e.scenario.id)} disabled={busy || !api}>
                  Crear investigador
                </button>
              </div>
            </div>
          ))}

          {/* El banco de pruebas. Va DESPUÉS de las aventuras y con otro
              aspecto a propósito: no es una historia, y ponerlo entre ellas
              haría dudar de si lo es. */}
          <div className="scenario-card scenario-card-sim">
            <h2>Simulador de combate</h2>
            <p>
              Un galpón vacío y tres personas dispuestas a que las golpeen. No hay nada que descubrir:
              es para probar las reglas de pelea con las manos, con el motor de verdad y los dados a la vista.
            </p>
            <div className="scenario-meta">Sin historia · Sin muerte permanente · Reiniciable</div>
            <div className="scenario-botones">
              <button className="primary" onClick={() => abrirSimulador()} disabled={busy || !api}>
                {busy ? 'Abriendo…' : 'Entrar con Elena'}
              </button>
              <button className="ghost" onClick={() => setCreando('simulador')} disabled={busy || !api}>
                Crear investigador
              </button>
            </div>

            {plantillas.length > 0 && (
              <div className="sim-plantillas">
                <div className="sim-plantillas-titulo">Personajes de prueba guardados</div>
                {plantillas.map((p) => (
                  <div className="sim-plantilla-row" key={p.id}>
                    <button
                      className="sim-plantilla-usar"
                      onClick={() => abrirSimulador(p.investigador)}
                      disabled={busy || !api}
                    >
                      {p.nombre}
                      <span className="sim-plantilla-datos">
                        {p.investigador.occupation} · Pelea {p.investigador.skills['pelea']?.base ?? 25}%
                      </span>
                    </button>
                    <button
                      className="sim-plantilla-borrar"
                      onClick={() => { borrarPlantilla(p.id); setPlantillas(listarPlantillas()); }}
                      disabled={busy}
                      title="Borrar esta plantilla"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sin esto, un fallo del almacenamiento dejaba el botón muerto y sin
              explicación: el jugador clickeaba y no pasaba nada. */}
          {error && <div className="error error-inicio">{error}</div>}
          {api && <PreviousCampaigns api={api} onLoad={loadCampaign} />}
        </div>
      </div>
    );
  }

  const inv = state?.investigator;
  const dead = inv && inv.status !== 'alive';
  const ended = Boolean(state?.ending);

  const pistasAhora = state?.board?.clues?.length ?? 0;
  const pistasNuevas = Math.max(0, pistasAhora - pistasVistas);

  const irA = (p: 'historia' | 'ficha' | 'tablero') => {
    setPanel(p);
    if (p === 'tablero') setPistasVistas(pistasAhora);
  };

  return (
    <div className="app" data-panel={panel}>
      <aside className="col col-left"><Sheet inv={inv} /></aside>

      <main className="col col-center">
        <header className="scene-head">
          <div className="scene-name">{state?.location?.name}</div>
          <div className="scene-time">{state?.worldTime?.display}</div>
          {/* Sólo aparece cuando ya importa: en 0 sería ruido desde el primer
              turno. El mundo se abre solo con las horas, pase lo que pase —
              quedarse parado no es gratis, aunque la escena no lo diga. */}
          {(state?.umbralPermeability ?? 0) > 0 && (
            <div
              className={`scene-permeability ${state.umbralPermeability >= 60 ? 'permeability-alta' : ''}`}
              title="Cuánto tiempo pasó, sin que importe qué se hizo con él. Con el mundo más abierto, cualquier contacto con el fenómeno cuesta más Exposición."
            >
              Permeabilidad {state.umbralPermeability}/100
            </div>
          )}
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

        {lastRoll && <RollCard roll={lastRoll} big animar={animarDados} />}

        {error && <div className="error">{error}</div>}

        {ended ? (
          <div className="ending">
            <div className="ending-title">{state.ending.title}</div>
            <div className="ending-text">{state.ending.text}</div>
            <Epilogo ending={state.ending} board={state.board} scenarioId={state.scenarioId} />
            {api && campaignId && (
              <Desarrollo
                api={api}
                campaignId={campaignId}
                scenarioId={state.scenarioId}
                onEstado={setState}
                onContinuar={(r) => {
                  setCampaignId(r.campaignId);
                  setState(r.state);
                  setLines([{ id: 'opening', kind: 'keeper', text: r.opening }]);
                  aplicarOpciones(r.options ?? [], r.campaignId);
                  setLastRoll(null); setStreaming(''); setTab('tablero');
                }}
              />
            )}
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
            <Acciones options={options} nuevas={marcas.pendientes} busy={busy} onPick={send} />

            {/* Sin esto, los temas desaparecían de golpe y parecía un bug.
                Ahora la interfaz dice lo que la prosa ya dijo: no es que no
                quede nada que preguntar, es que ahora no quiere hablar. */}
            {(state?.npcs ?? []).filter((n: any) => n.aqui && n.sinPaciencia && n.status === 'alive')
              .map((n: any) => (
                <div key={n.id} className="nota-social">
                  {n.name.split(' ')[0]} no quiere hablar más por ahora. Dale tiempo: andá a hacer otra
                  cosa y volvé.
                </div>
              ))}

            {/* La escritura libre sólo aparece con Claude narrando: es el único
                modo donde una frase cualquiera se resuelve bien. En modo motor
                el repertorio es acotado y prometer libertad total mentiría. */}
            {status?.keeperMode === 'ia' && (
              <div className="input-row">
                <textarea
                  ref={inputRef}
                  className="action-input"
                  placeholder="O escribí lo que quieras hacer."
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
            )}

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
            <>
              {/* El interruptor vive acá porque acá es donde el jugador viene a
                  mirar los dados. Al lado del compromiso de la semilla queda
                  claro de qué es y de qué NO es: cambia cómo se ven, no lo que
                  sale. */}
              <label className="opcion-dados">
                <input
                  type="checkbox"
                  checked={animarDados}
                  onChange={(e) => { setAnimarDados(e.target.checked); guardarPreferenciaDados(e.target.checked); }}
                />
                <span>
                  Animar los dados al tirar
                  <em>
                    Decenas y unidades, como en la mesa. Es sólo presentación: el resultado ya está
                    firmado antes de que empiecen a girar.
                    {prefiereMenosMovimiento() && ' Tu sistema pide menos movimiento, así que viene apagada.'}
                  </em>
                </span>
              </label>
              <RollHistory rolls={state?.rolls ?? []} commitment={state?.rngCommitment ?? ''} seed={state?.seedRevealed ?? null} />
            </>
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
        {/* Aparte, y a propósito distinto de la ficha: esto no es lo que el
            investigador sabe, es lo que USTED —quien lee— nota. El
            investigador no da señales de haberlo entendido. */}
        {inv?.playerKnowledge?.length > 0 && (
          <div className="aparte">
            <div className="aparte-title">Usted lo nota. Su investigador, todavía no.</div>
            {inv.playerKnowledge.map((k: string, i: number) => (
              <div key={i} className="aparte-item">{k}</div>
            ))}
          </div>
        )}
      </aside>

      {/* Sólo en móvil: el CSS la esconde en pantalla grande. */}
      <nav className="barra-movil">
        <button className={panel === 'ficha' ? 'on' : ''} onClick={() => irA('ficha')}>
          Ficha
        </button>
        <button className={panel === 'historia' ? 'on' : ''} onClick={() => irA('historia')}>
          Historia
        </button>
        <button className={panel === 'tablero' ? 'on' : ''} onClick={() => irA('tablero')}>
          Tablero
          {pistasNuevas > 0 && panel !== 'tablero' && <span className="pip">{pistasNuevas}</span>}
        </button>
      </nav>
    </div>
  );
}

/**
 * Panel de acciones. Las agrupa por tipo y marca las recién desbloqueadas.
 *
 * La lista viene del motor y ya está filtrada: lo que se ve acá es lo que se
 * puede hacer ahora, nunca algo ya hecho.
 */
/**
 * Cierre de partida. Existe porque un desenlace de Cthulhu se parece a perder
 * si el juego no dice lo contrario: no hay final feliz, hay finales distintos.
 * Mostrar los cinco convierte «perdí» en «llegué a uno de cinco».
 */
function Epilogo({
  ending, board, scenarioId,
}: { ending: { id: string; title: string }; board: any; scenarioId: string }) {
  // Los desenlaces son los de LA AVENTURA QUE SE JUGÓ. Estaban fijos en los de
  // Agua Quieta, así que la segunda aventura habría mostrado «Desenlace — de 5»
  // con los títulos de la primera.
  const todos = entradaDe(scenarioId)?.scenario.endings ?? [];
  const n = todos.findIndex((e) => e.id === ending.id) + 1;
  const pistas = board?.clues?.length ?? 0;

  return (
    <div className="epilogo">
      <div className="epilogo-linea">
        Desenlace {n > 0 ? n : '—'} de {todos.length} · {pistas} pista{pistas === 1 ? '' : 's'} reunida
        {pistas === 1 ? '' : 's'}
      </div>
      <div className="epilogo-lista">
        {todos.map((e) => (
          <div key={e.id} className={`epilogo-final ${e.id === ending.id ? 'epilogo-final-on' : ''}`}>
            {e.id === ending.id ? '● ' : '○ '}{e.title}
          </div>
        ))}
      </div>
      <p className="epilogo-nota">
        Ninguno de los cinco es ganar y ninguno es perder. Los Álamos sigue ahí en todos.
      </p>
    </div>
  );
}

/**
 * FASE DE DESARROLLO — CoC 7e pp. 94-95, 167-169.
 *
 * Es una escena, no una pantalla de estadísticas. Lo que se ve primero son las
 * habilidades que se aprendieron usando —derivadas del registro de tiradas, no
 * de una casilla— y la decisión de qué hace el investigador con sus meses
 * libres. Los dados salen de la misma cadena verificable que el resto.
 */
function Desarrollo({
  api, campaignId, scenarioId, onEstado, onContinuar,
}: {
  api: GameApi; campaignId: string; scenarioId: string;
  onEstado: (s: any) => void;
  onContinuar: (r: any) => void;
}) {
  const [oferta, setOferta] = useState<DevelopmentOffer | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);
  const [usarClave, setUsarClave] = useState(true);
  const [informe, setInforme] = useState<any>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || oferta) return;
    api.developmentOffer(campaignId)
      .then((o) => {
        setOferta(o);
        setElegido(o.aspectos.find((a) => a.esConexionClave)?.id ?? o.aspectos[0]?.id ?? null);
      })
      .catch((e) => setError((e as Error).message));
  }, [abierto, oferta, api, campaignId]);

  async function correr() {
    if (!elegido) return;
    setOcupado(true); setError(null);
    try {
      const r = await api.runDevelopment(campaignId, { aspectId: elegido, usarConexionClave: usarClave });
      setInforme(r.report);
      onEstado(r.state);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  if (!abierto) {
    return (
      <button className="primary" onClick={() => setAbierto(true)}>
        Fase de desarrollo — qué aprendió, qué le costó
      </button>
    );
  }

  if (informe) {
    const clave = oferta?.aspectos.find((a) => a.id === informe.autoayuda?.aspectId);
    return (
      <div className="desarrollo">
        <div className="desarrollo-titulo">Los meses que siguieron</div>

        <div className="desarrollo-bloque">
          <div className="desarrollo-sub">Lo que aprendió usándolo</div>
          {informe.mejoras.length === 0 && (
            <div className="desarrollo-nada">
              Nada se aprendió esta vez. Hace falta usar una habilidad con éxito —y sin ayuda— para tener
              derecho a la comprobación.
            </div>
          )}
          {informe.mejoras.map((m: any) => (
            <div key={m.skill} className={`desarrollo-fila ${m.gain > 0 ? 'sube' : ''}`}>
              <span className="d-label">{m.label}</span>
              <span className="d-num">{m.antes}%</span>
              <span className="d-dado">tirada {m.check}</span>
              <span className="d-res">
                {m.gain > 0 ? `+${m.gain} → ${m.despues}%` : 'ya lo sabía demasiado bien'}
              </span>
            </div>
          ))}
          <div className="desarrollo-regla">
            Se mejora sacando POR ENCIMA del valor actual. Cuanto mejor sos en algo, menos te queda por
            aprender de la experiencia.
          </div>
        </div>

        <div className="desarrollo-bloque">
          <div className="desarrollo-sub">Cordura</div>
          <div className="desarrollo-fila">
            <span className="d-label">Por lo que enfrentó</span>
            <span className="d-dado">{informe.premio.dados}D{informe.premio.caras}</span>
            <span className="d-res">+{informe.premio.total} · {informe.premio.razon}</span>
          </div>
          {informe.autoayuda && (
            <div className={`desarrollo-fila ${informe.autoayuda.exito ? 'sube' : 'baja'}`}>
              <span className="d-label">{informe.autoayuda.exito ? 'Los meses sirvieron' : 'No sirvieron'}</span>
              <span className="d-dado">
                {informe.autoayuda.tirada} vs {informe.autoayuda.objetivo}
                {informe.autoayuda.usoConexionClave ? ' (con su conexión)' : ''}
              </span>
              <span className="d-res">
                {informe.autoayuda.sanDelta >= 0 ? '+' : ''}{informe.autoayuda.sanDelta}
              </span>
            </div>
          )}
          <div className="desarrollo-total">
            Cordura {informe.sanFinal} de {informe.maxSan}
          </div>
        </div>

        {informe.autoayuda && !informe.autoayuda.exito && (
          <div className="desarrollo-revision">
            «{clave?.text}» — y eso se rompió en los meses que siguieron.
            {informe.autoayuda.perdioConexionClave && ' Ya no es lo que la sostiene.'}
          </div>
        )}

        <div className="desarrollo-nota">
          Todas estas tiradas están en la auditoría, con la misma cadena verificable que las de la partida.
        </div>

        <Continuar api={api} campaignId={campaignId} scenarioId={scenarioId} onContinuar={onContinuar} />
      </div>
    );
  }

  if (error) return <div className="error">{error}</div>;
  if (!oferta) return <div className="thinking">Contando los meses…</div>;

  return (
    <div className="desarrollo">
      <div className="desarrollo-titulo">Los meses que siguieron</div>

      <div className="desarrollo-bloque">
        <div className="desarrollo-sub">
          Habilidades que se ganaron el derecho a mejorar
        </div>
        {oferta.marcas.length === 0 ? (
          <div className="desarrollo-nada">
            Ninguna. Sólo cuenta usar una habilidad con éxito y sin dado de bonificación.
          </div>
        ) : (
          oferta.marcas.map((m) => (
            <div key={m.skill} className="desarrollo-fila">
              <span className="d-label">{m.label}</span>
              <span className="d-num">{m.valor}%</span>
              <span className="d-res">{m.exitos === 1 ? 'un éxito' : `${m.exitos} éxitos`}</span>
            </div>
          ))
        )}
      </div>

      <div className="desarrollo-bloque">
        <div className="desarrollo-sub">¿A qué dedica estos meses?</div>
        <div className="desarrollo-explica">
          Se tira Cordura. Si sale, recupera; si no sale, esa parte de su vida queda distinta.
        </div>
        {oferta.aspectos.map((a) => (
          <label key={a.id} className={`aspecto ${elegido === a.id ? 'aspecto-on' : ''}`}>
            <input
              type="radio" name="aspecto" checked={elegido === a.id}
              onChange={() => setElegido(a.id)}
            />
            <span>
              {a.text}
              {a.esConexionClave && <em className="aspecto-clave"> — lo que la sostiene</em>}
            </span>
          </label>
        ))}
        {oferta.aspectos.find((a) => a.id === elegido)?.esConexionClave && (
          <label className="aspecto-check">
            <input type="checkbox" checked={usarClave} onChange={(e) => setUsarClave(e.target.checked)} />
            <span>
              Apoyarse en ello — dado de bonificación, pero si falla deja de ser lo que la sostiene.
            </span>
          </label>
        )}
      </div>

      <button className="primary" onClick={correr} disabled={ocupado || !elegido}>
        {ocupado ? 'Pasando los meses…' : 'Dejar pasar los meses'}
      </button>
    </div>
  );
}

/**
 * El puente entre una aventura y la siguiente.
 *
 * Aparece recién DESPUÉS de la fase de desarrollo, y no antes: lo que cruza es
 * el investigador que la fase acaba de dejar, con sus habilidades nuevas y su
 * Cordura recuperada. Ofrecerlo antes haría que la fase no sirviera de nada.
 */
function Continuar({
  api, campaignId, scenarioId, onContinuar,
}: {
  api: GameApi; campaignId: string; scenarioId: string;
  onContinuar: (r: any) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const siguiente = siguienteDe(scenarioId);

  if (!siguiente) {
    return (
      <div className="continuar-nada">
        Hasta acá llega la línea de tiempo, por ahora. Lo que aprendió el investigador queda guardado
        en esta partida.
      </div>
    );
  }

  async function ir() {
    setOcupado(true); setError(null);
    try {
      onContinuar(await api.continuarCampana(campaignId, siguiente!.scenario.id));
    } catch (e) {
      setError((e as Error).message);
      setOcupado(false);
    }
  }

  return (
    <div className="continuar">
      <div className="continuar-titulo">{siguiente.epoca}</div>
      <div className="continuar-nombre">{siguiente.scenario.title}</div>
      <p className="continuar-premisa">{siguiente.scenario.surfacePremise}</p>
      <div className="continuar-lleva">
        Se lleva lo que aprendió, lo que le quedó encima y lo que el mundo recuerda. La Exposición al
        Umbral no baja: cruzar un umbral es irreversible.
      </div>
      {error && <div className="error">{error}</div>}
      <button className="primary" onClick={ir} disabled={ocupado}>
        {ocupado ? 'Cruzando los meses…' : `Continuar a ${siguiente.scenario.title}`}
      </button>
    </div>
  );
}

function Acciones({
  options, nuevas, busy, onPick,
}: {
  options: Opcion[];
  nuevas: Set<string>;
  busy: boolean;
  onPick: (intencion: string, id: string) => void;
}) {
  // Un desenlace cierra la aventura y no hay rebobinado. Elegirlo sin saber
  // que lo era es la peor sorpresa posible, así que van aparte y piden un
  // segundo click. No es un diálogo modal: es la misma decisión, dos veces.
  const [confirmando, setConfirmando] = useState<string | null>(null);

  if (options.length === 0) {
    return <div className="sin-acciones">No queda nada por hacer acá.</div>;
  }
  const corrientes = options.filter((o) => !o.final);
  const finales = options.filter((o) => o.final);
  const porGrupo = ORDEN_GRUPOS
    .map((g) => [g, corrientes.filter((o) => o.grupo === g)] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <div className="acciones">
      {porGrupo.map(([grupo, lista]) => (
        <div key={grupo} className="grupo-acciones">
          <div className="grupo-titulo">{ETIQUETA_GRUPO[grupo]}</div>
          <div className="grupo-botones">
            {lista.map((o) => (
              <button
                key={o.id}
                className={`option option-${grupo} ${nuevas.has(o.id) ? 'option-nueva' : ''}`}
                onClick={() => onPick(o.intencion, o.id)}
                disabled={busy}
              >
                {nuevas.has(o.id) && <span className="chispa">◆</span>}
                {o.etiqueta}
              </button>
            ))}
          </div>
        </div>
      ))}

      {finales.length > 0 && (
        <div className="grupo-acciones grupo-final">
          <div className="grupo-titulo grupo-titulo-final">
            Desenlace <span className="aviso-final">— cierran la aventura</span>
          </div>
          <div className="grupo-botones">
            {finales.map((o) => (
              <button
                key={o.id}
                className={`option option-final ${confirmando === o.id ? 'option-confirmar' : ''} ${nuevas.has(o.id) ? 'option-nueva' : ''}`}
                onClick={() => {
                  if (confirmando === o.id) { setConfirmando(null); onPick(o.intencion, o.id); }
                  else setConfirmando(o.id);
                }}
                onBlur={() => setConfirmando((c) => (c === o.id ? null : c))}
                disabled={busy}
              >
                {nuevas.has(o.id) && <span className="chispa">◆</span>}
                {confirmando === o.id ? `${o.etiqueta} — confirmar` : o.etiqueta}
              </button>
            ))}
          </div>
          <div className="nota-final">
            Hay cinco desenlaces. Ninguno es perder: son cinco maneras distintas de que esto termine.
          </div>
        </div>
      )}
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
