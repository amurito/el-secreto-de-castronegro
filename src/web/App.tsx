import React, { useEffect, useRef, useState } from 'react';
import { Sheet, RollCard, Board, Inventory, Documents, RollHistory, Rivales } from './components.tsx';
import type { GameApi, StatusInfo, DevelopmentOffer } from '../app/api.ts';
import { createLocalApi } from '../app/api.local.ts';
import { ETIQUETA_GRUPO, type Opcion, type GrupoAccion } from '../scenario/acciones.ts';
import { CATALOGO, entradaDe, siguienteDe } from '../scenario/catalogo.ts';
import { Creacion } from './Creacion.tsx';
import { Simulador } from './Simulador.tsx';
import { Combate } from './Combate.tsx';
import { listarPlantillas, guardarPlantilla, borrarPlantilla, type Plantilla } from '../app/plantillas.ts';
import type { Investigator } from '../shared/types.ts';
import { leerPreferenciaDados, guardarPreferenciaDados, prefiereMenosMovimiento } from './dados.tsx';
import { HECHIZO_POR_ID } from '../rules/hechizos.ts';

type Tab =
  | 'tablero' | 'inventario' | 'documentos' | 'tiradas' | 'hechizos'
  // Segunda fila: consulta ocasional, no de cada turno.
  | 'recuerda' | 'aparte' | 'finales';

/** Las que necesitan un rótulo más largo que su propio id. */
const ETIQUETA_TAB: Partial<Record<Tab, string>> = {
  recuerda: 'el mundo recuerda',
  aparte: 'usted lo nota',
  finales: 'finales',
};

interface Line { id: string; kind: string; text: string }

const ORDEN_GRUPOS: GrupoAccion[] = ['observar', 'hablar', 'usar', 'mover', 'decidir'];

/**
 * Dónde corre el motor: en la pestaña, siempre.
 *
 * Antes esto elegía entre un servidor Node —que existía para que narrara
 * Claude con la clave a salvo del lado del servidor— y el motor local. Esa
 * rama se eliminó junto con el servidor: el juego es determinístico, la prosa
 * está escrita a mano en el contenido de cada aventura, y todo corre en el
 * navegador con el log en IndexedDB. No hace falta servidor ni clave de API.
 */
async function elegirApi(): Promise<GameApi> {
  return createLocalApi();
}

/**
 * Alto de `.narrative` dentro de `.col-center`, como % del alto disponible.
 * Reportado jugando: el historial de la conversación previa se quedaba con
 * casi todo el panel del medio, y lo que aparece DEBAJO —la tirada, el
 * desenlace— quedaba apretado en el resto, aunque el `scrollIntoView` ya lo
 * lleve a la vista. Arrastrable para que cada jugador reparta el espacio
 * como le sirve, y se recuerda entre partidas.
 */
const CLAVE_ALTO_NARRATIVA = 'castronegro:alto-narrativa';
const ALTO_NARRATIVA_MIN = 20;
const ALTO_NARRATIVA_MAX = 85;
const ALTO_NARRATIVA_DEFECTO = 55;

function leerPreferenciaAltoNarrativa(): number {
  try {
    const v = Number(localStorage.getItem(CLAVE_ALTO_NARRATIVA));
    if (Number.isFinite(v) && v >= ALTO_NARRATIVA_MIN && v <= ALTO_NARRATIVA_MAX) return v;
  } catch { /* sin storage, se usa el valor por defecto */ }
  return ALTO_NARRATIVA_DEFECTO;
}

function guardarPreferenciaAltoNarrativa(pct: number): void {
  try { localStorage.setItem(CLAVE_ALTO_NARRATIVA, String(Math.round(pct))); } catch { /* sin storage, se juega igual */ }
}

/**
 * Aviso de consentimiento de meta-horror (ROADMAP §2.3), una sola vez por
 * navegador y ANTES de arrancar cualquier campaña — no dentro de una, donde
 * ya sería tarde para elegir con esto en la cabeza. `knowledge.playerObserved`
 * (ver engine.ts) hace que el juego, alguna vez, te haga notar A VOS algo que
 * tu investigador todavía no tiene registrado en su ficha; se muestra aparte,
 * en la sección "Aparte" de la ficha. Mismo patrón de preferencia que
 * `CLAVE_ALTO_PIE`: una clave `castronegro:*`, try/catch, se juega igual sin
 * storage —sólo que el aviso reaparecería cada vez, lo cual es un peor default
 * que mostrarlo de más, no un bug—.
 */
const CLAVE_AVISO_METAHORROR = 'castronegro:aviso-metahorror-visto';

function leerAvisoMetahorrorVisto(): boolean {
  try { return localStorage.getItem(CLAVE_AVISO_METAHORROR) === '1'; } catch { return false; }
}

function guardarAvisoMetahorrorVisto(): void {
  try { localStorage.setItem(CLAVE_AVISO_METAHORROR, '1'); } catch { /* sin storage, se juega igual */ }
}

/**
 * Minutos que faltan para poder volver a lanzar un hechizo, contra el reloj
 * DEL MUNDO. Espeja `minutosHastaPoderLanzar` del motor: acá sólo apaga el
 * botón y explica por qué — quien decide de verdad sigue siendo el motor.
 */
function esperaRestante(
  lastAttemptAt: string | undefined, esperaMinutos: number, worldIso: string | undefined,
): number {
  if (!lastAttemptAt || !worldIso || !esperaMinutos) return 0;
  const desde = new Date(lastAttemptAt).getTime();
  const ahora = new Date(worldIso).getTime();
  if (!Number.isFinite(desde) || !Number.isFinite(ahora)) return 0;
  return Math.max(0, esperaMinutos - Math.floor((ahora - desde) / 60000));
}

function textoEspera(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h <= 0) return `${m} min`;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
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
  // Las tiradas de ESTE turno, no la última. Reportado jugando: cuando el
  // motor tira por su cuenta —la INT de crisis de Cordura, la CON de una
  // Herida Grave, la defensa de un NPC— esas tiradas iban sólo a la pestaña
  // de auditoría, porque `tiradaInterna` no devuelve `emit` al cliente y acá
  // había un único slot que además se pisaba. Se calculan por diferencia
  // contra `state.rolls`, que ya las trae todas: así entra cualquier tirada
  // que el motor haga, sin que el motor tenga que acordarse de avisar.
  const [rollsDelTurno, setRollsDelTurno] = useState<any[]>([]);
  const rollsAntes = useRef(0);
  /** Pistas que había la última vez que se miró el tablero. Para el aviso. */
  const [pistasVistas, setPistasVistas] = useState(0);
  // Aprender un hechizo se contaba sólo en el párrafo de la escena, mezclado
  // con el resto del texto — reportado jugando: "aprender hechizos se siente
  // banal". Esto marca la pestaña HECHIZOS hasta que el jugador la abre, y
  // agrega una línea aparte, corta y sin mezclar, al hilo de la historia.
  const [hayHechizoNuevo, setHayHechizoNuevo] = useState(false);
  // El banner flotante en sí — el nombre del hechizo, o null si no hay que
  // mostrar nada. Aparte de la línea en el historial y de la pestaña
  // pulsando: reportado jugando que ninguna de las dos se notaba lo
  // suficiente, así que esto es la señal que no se puede pasar por alto.
  const [tostadaHechizo, setTostadaHechizo] = useState<string | null>(null);
  const spellsAntes = useRef<number | null>(null);
  const [tab, setTab] = useState<Tab>('tablero');
  const [error, setError] = useState<string | null>(null);
  /** Escenario elegido para crear personaje propio. null = no estamos creando. */
  const [creando, setCreando] = useState<string | null>(null);
  /** Campaña del simulador de combate. null = no estamos en el galpón. */
  const [simulando, setSimulando] = useState<string | null>(null);
  /** Personajes guardados, reusables para el simulador o para una aventura real. Viven en localStorage. */
  const [plantillas, setPlantillas] = useState<Plantilla[]>(() => listarPlantillas());
  /** Id de la aventura cuyo selector de «Cargar personaje» está desplegado, o null si ninguno. */
  const [cargandoEn, setCargandoEn] = useState<string | null>(null);
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
  /** Aviso de meta-horror ya visto y descartado, en este navegador. */
  const [avisoMetahorrorVisto, setAvisoMetahorrorVisto] = useState(leerAvisoMetahorrorVisto);
  /** Alto de `.narrative` dentro de `.col-center`, en %. Arrastrable. */
  const [altoNarrativa, setAltoNarrativa] = useState(leerPreferenciaAltoNarrativa);
  const colCenterRef = useRef<HTMLDivElement>(null);
  const arrastrandoNarrativa = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // A dónde hay que scrollear cuando aparece el desenlace. Reportado jugando:
  // `.narrative` tiene SU PROPIO scroll interno (autoscrollea a la última
  // línea, más abajo), pero el título y el texto del final viven DEBAJO de
  // `.narrative`, como hermanos dentro de `.col-center` —que también scrollea,
  // por afuera—. Nada movía ESE scroll exterior cuando el desenlace
  // aparecía: `.narrative` seguía mostrando el final de la conversación
  // previa y el texto del final quedaba tapado, abajo, fuera de vista.
  const endingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    elegirApi().then(async (a) => {
      setApi(a);
      setStatus(await a.status());
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, streaming]);

  useEffect(() => {
    if (state?.ending) endingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [state?.ending?.title]);

  // Al cargar o crear una campaña, lo que ya sabe no es "nuevo": sólo avisa
  // cuando el número de hechizos SUBE durante la sesión ya abierta.
  useEffect(() => { spellsAntes.current = null; }, [campaignId]);

  useEffect(() => {
    const known = state?.investigator?.spellsKnown ?? [];
    if (spellsAntes.current === null) { spellsAntes.current = known.length; return; }
    if (known.length > spellsAntes.current) {
      const nuevo = known[known.length - 1];
      const def = nuevo && HECHIZO_POR_ID[nuevo.id];
      setHayHechizoNuevo(true);
      setLines((l) => [...l, {
        id: `hechizo-nuevo-${Date.now()}`, kind: 'system',
        text: def ? `✦ Aprendiste un hechizo nuevo: «${def.nombre}».` : '✦ Aprendiste un hechizo nuevo.',
      }]);
      setTostadaHechizo(def?.nombre ?? 'un hechizo nuevo');
    }
    spellsAntes.current = known.length;
  }, [state?.investigator?.spellsKnown?.length]);

  // La tostada se borra sola. 5 segundos alcanza para leerla sin que
  // obligue a hacer nada — no es un diálogo que haya que cerrar.
  useEffect(() => {
    if (!tostadaHechizo) return;
    const t = window.setTimeout(() => setTostadaHechizo(null), 5000);
    return () => clearTimeout(t);
  }, [tostadaHechizo]);

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
      setRollsDelTurno([]); setStreaming('');
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
  async function abrirSimulador(
    investigador?: unknown, guardar = false, armaInicialId: string | null = null, ocupacionId: string | null = null,
  ) {
    if (!api) return;
    setBusy(true); setError(null);
    try {
      const data = investigador
        ? await api.createCampaignConFicha('simulador', investigador, armaInicialId, ocupacionId)
        : await api.createCampaign('simulador');
      if (guardar && investigador) {
        guardarPlantilla(investigador as Investigator, armaInicialId, ocupacionId);
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

  /**
   * `guardar` sólo es true cuando el investigador viene RECIÉN armado por el
   * formulario de creación —mismo criterio que `abrirSimulador`—: cargar una
   * plantilla ya guardada para otra aventura no tiene que dejar una copia
   * nueva cada vez.
   */
  async function newCampaignConFicha(
    scenarioId: string, investigador: unknown, armaInicialId: string | null = null, guardar = false,
    ocupacionId: string | null = null,
  ) {
    if (!api) return;
    setBusy(true); setError(null);
    try {
      const data = await api.createCampaignConFicha(scenarioId, investigador, armaInicialId, ocupacionId);
      if (guardar) {
        guardarPlantilla(investigador as Investigator, armaInicialId, ocupacionId);
        setPlantillas(listarPlantillas());
      }
      setCreando(null);
      setCargandoEn(null);
      setCampaignId(data.campaignId);
      setState(data.state);
      setLines([{ id: 'opening', kind: 'keeper', text: data.opening }]);
      aplicarOpciones(data.options ?? [], data.campaignId);
      setRollsDelTurno([]); setStreaming('');
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
      // Al abrir una partida ya empezada se muestra sólo la última tirada: las
      // de "este turno" todavía no existen, el turno no lo jugó esta sesión.
      const previas = data.state.rolls ?? [];
      rollsAntes.current = previas.length;
      setRollsDelTurno(previas.length ? [previas[previas.length - 1]] : []);
      aplicarOpciones(data.options ?? [], id);
    } catch (e) {
      setError(`No se pudo abrir la partida: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Arrastre del divisor entre `.narrative` (el historial) y lo que viene
   * después en el mismo panel —la tirada del turno, el desenlace—. Mide
   * desde ARRIBA de `.col-center`, porque lo que se está fijando es cuánto
   * mide `.narrative`, no cuánto mide el resto.
   */
  function empezarArrastreNarrativa(e: React.MouseEvent) {
    e.preventDefault();
    arrastrandoNarrativa.current = true;
    const contenedor = colCenterRef.current;
    function mover(ev: MouseEvent) {
      if (!arrastrandoNarrativa.current || !contenedor) return;
      const rect = contenedor.getBoundingClientRect();
      const desdeArriba = ev.clientY - rect.top;
      const pct = (desdeArriba / rect.height) * 100;
      setAltoNarrativa(Math.min(ALTO_NARRATIVA_MAX, Math.max(ALTO_NARRATIVA_MIN, pct)));
    }
    function soltar() {
      arrastrandoNarrativa.current = false;
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
      setAltoNarrativa((actual) => { guardarPreferenciaAltoNarrativa(actual); return actual; });
    }
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  }

  async function send(text: string, idOpcion?: string) {
    if (!api || !campaignId || !text.trim() || busy) return;
    if (idOpcion) tocar(idOpcion);
    // Limpiar la tirada anterior es obligatorio, no cosmético. La mayoría de
    // las acciones no tiran dados —hablar, agarrar, caminar—, y sin esto la
    // ficha de la tirada anterior seguía en pantalla debajo de la narración
    // nueva. Se lee como si esa tirada hubiera resuelto también esta acción.
    rollsAntes.current = state?.rolls?.length ?? 0;
    setBusy(true); setError(null); setStreaming(''); setOptions([]); setRollsDelTurno([]);
    // En móvil la respuesta llega a la historia: si el jugador tocó una opción
    // desde otro panel, hay que llevarlo a donde va a pasar algo.
    setPanel('historia');
    setLines((l) => [...l, { id: `p-${Date.now()}`, kind: 'player', text }]);

    let acc = '';
    try {
      await api.submitIntent(campaignId, text, (msg) => {
        switch (msg.kind) {
          case 'narration_delta': acc += msg.data as string; setStreaming(acc); break;
          case 'narration_replace': acc = msg.data as string; setStreaming(acc); break;
          // `roll` sigue llegando para la tirada que pidió el jugador —es la
          // que aparece primero, mientras el estado todavía no llegó—, pero
          // el estado de abajo es el que manda: trae también las que tiró el
          // motor solo.
          case 'roll': setRollsDelTurno((r) => (r.length ? r : [msg.data])); break;
          case 'state': {
            const s = msg.data as { rolls?: any[] };
            setState(msg.data);
            const nuevas = (s.rolls ?? []).slice(rollsAntes.current);
            if (nuevas.length) setRollsDelTurno(nuevas);
            break;
          }
          case 'options': aplicarOpciones((msg.data as Opcion[]) ?? []); break;
          case 'error': setError(String(msg.data)); break;
          default: break;
        }
      });
    } catch (e) {
      setError((e as Error).message);
    }

    if (acc) setLines((l) => [...l, { id: `k-${Date.now()}`, kind: 'keeper', text: acc }]);
    setStreaming(''); setBusy(false);
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

  // ── HECHIZOS ────────────────────────────────────────────────────────────
  // Mismo camino que el combate real: llama al motor directo (bypasea el
  // clasificador de intención) y narra el resultado al historial permanente,
  // pero sin pantalla exclusiva —lanzar no bloquea el resto del juego como sí
  // lo hace entrar en combate—, así que es una pestaña más, no un modo aparte.
  async function lanzarHechizo(spellId: string) {
    if (!api || !campaignId) return;
    setBusy(true); setError(null);
    try {
      const r = await api.castSpell(campaignId, spellId);
      setState(r.state);
      // La tirada de PODER de la primera vez llegaba en `r.tiradas` y esta
      // pantalla la tiraba a la basura: el jugador veía «no consigue que
      // responda» sin ver contra qué había tirado. Reportado jugando.
      setRollsDelTurno(r.tiradas ?? []);
      setLines((l) => [...l, {
        id: `hechizo-${Date.now()}`, kind: 'keeper',
        text: r.mensaje.replace('RECHAZADO POR EL MOTOR: ', ''),
      }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── COMBATE REAL ────────────────────────────────────────────────────────
  // Antes que el simulador y que todo lo demás: si `GameState.activeCombat`
  // está puesto (viene del motor, no de un estado local), la pantalla entera
  // pasa a ser el combate hasta que termine solo —no hay botón de salir—.
  // Sobrevive un refresh sin nada especial: `state` ya viene de la campaña
  // cargada, y este chequeo se evalúa igual en el primer render.
  if (state?.activeCombat && api && campaignId) {
    return (
      <Combate
        // `startedAt` es el id del evento que abrió ESTE combate en particular
        // (ver reducers.ts, caso COMBAT_STARTED). Sin esta key, dos combates
        // reales seguidos en la misma campaña —el guardián del sótano y
        // Bernardo, en El Vigésimo— reutilizan el mismo componente montado:
        // React no ve cambiar ningún prop entre uno y otro (`campaignId` es
        // el mismo), así que el `useEffect` que trae rivales/armas del
        // combate nuevo nunca se vuelve a disparar, y la pantalla se queda
        // peleando contra los datos del combate anterior. Bug real, reportado
        // jugando: el guardián y Bernardo aparecían mezclados en el mismo
        // combate.
        key={state.activeCombat.startedAt}
        api={api}
        campaignId={campaignId}
        onFin={(nuevoEstado, nuevasOpciones, entradas) => {
          setState(nuevoEstado);
          aplicarOpciones(nuevasOpciones);
          setLines((l) => [...l, ...entradas]);
        }}
      />
    );
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
            onListo={(inv, arma, ocupacionId) => (alGalpon
              ? abrirSimulador(inv, true, arma, ocupacionId)
              : newCampaignConFicha(creando, inv, arma, true, ocupacionId))}
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
          <p className="subtitle">La Llamada de Cthulhu · motor narrativo interactivo</p>
          {!status && <div className="mode">Iniciando…</div>}
          {status && (
            <div className="mode mode-motor">
              Todo corre en esta pestaña. Sin servidor, sin cuentas y sin costo.
              Los dados, el estado y el guardado son reales, y tu partida queda
              en este navegador.
            </div>
          )}
          {status && !avisoMetahorrorVisto && (
            <div className="aviso-metahorror">
              <p>
                Este juego a veces te hace notar a VOS, jugador, algo que tu
                investigador todavía no tiene registrado en su ficha. Cuando
                pasa, aparece aparte del resto —nunca mezclado con lo que tu
                personaje sabe— y es intencional: es parte de cómo se juega acá.
              </p>
              <button
                className="ghost"
                onClick={() => { guardarAvisoMetahorrorVisto(); setAvisoMetahorrorVisto(true); }}
              >
                Entendido
              </button>
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
                <div className={`scenario-antes${e.continuacion ? ' scenario-continuacion' : ''}`}>
                  {e.continuacion
                    ? <>Continúa directamente después de{' '}
                      {e.requiere.map((id) => entradaDe(id)?.scenario.title ?? id).join(', ')}.
                      Se puede empezar acá, pero está escrita para quien ya estuvo.</>
                    : <>Se puede jugar sola. Se lee distinto después de{' '}
                      {e.requiere.map((id) => entradaDe(id)?.scenario.title ?? id).join(', ')}.</>}
                </div>
              ) : null}
              <div className="scenario-botones">
                <button className="primary" onClick={() => newCampaign(e.scenario.id)} disabled={busy || !api}>
                  {busy ? 'Abriendo…' : 'Empezar con Elena'}
                </button>
                <button className="ghost" onClick={() => setCreando(e.scenario.id)} disabled={busy || !api}>
                  Crear investigador
                </button>
                {plantillas.length > 0 && (
                  <button
                    className="ghost"
                    onClick={() => setCargandoEn(cargandoEn === e.scenario.id ? null : e.scenario.id)}
                    disabled={busy || !api}
                  >
                    Cargar personaje
                  </button>
                )}
              </div>

              {cargandoEn === e.scenario.id && (
                <div className="sim-plantillas">
                  <div className="sim-plantillas-titulo">Personajes guardados</div>
                  {plantillas.map((p) => (
                    <div className="sim-plantilla-row" key={p.id}>
                      <button
                        className="sim-plantilla-usar"
                        onClick={() => newCampaignConFicha(
                          e.scenario.id, p.investigador, p.armaInicialId ?? null, false, p.ocupacionId ?? null,
                        )}
                        disabled={busy || !api}
                      >
                        {p.nombre}
                        <span className="sim-plantilla-datos">{p.investigador.occupation}</span>
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
                <div className="sim-plantillas-titulo">Personajes guardados</div>
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
      {tostadaHechizo && (
        <div className="tostada-hechizo" role="status">
          <span className="tostada-icono">✦</span>
          <div>
            <div className="tostada-titulo">Hechizo nuevo</div>
            <div className="tostada-nombre">{tostadaHechizo}</div>
          </div>
        </div>
      )}
      <aside className="col col-left"><Sheet inv={inv} /></aside>

      <main className="col col-center" ref={colCenterRef}>
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

        <div className="narrative" ref={scrollRef} style={{ flex: `0 0 ${altoNarrativa}%` }}>
          {lines.map((l) => (
            <div key={l.id} className={`line line-${l.kind}`}>
              {l.kind === 'player' && <span className="line-mark">▸ </span>}
              {l.text}
            </div>
          ))}
          {streaming && <div className="line line-keeper line-streaming">{streaming}</div>}
          {busy && !streaming && <div className="thinking">El Keeper está resolviendo…</div>}
        </div>

        {/* Pedido jugando: un desplazable entre el historial y lo que viene
            después (la tirada, el desenlace), para regular en el momento
            cuánto espacio se lleva cada uno — sin esto, `.narrative` con
            `flex:1` se quedaba con todo lo que sobraba y lo de abajo quedaba
            apretado en el resto, aunque `scrollIntoView` ya lo lleve a la
            vista. */}
        <div
          className="resizer-narrativa"
          onMouseDown={empezarArrastreNarrativa}
          title="Arrastrar para cambiar cuánto espacio ocupa el historial"
        />

        {state?.npcs && <Rivales npcs={state.npcs} />}

        {rollsDelTurno.length > 0 && (
          <div className="rolls-turno">
            {rollsDelTurno.map((r, i) => (
              // Sólo la primera anima: con dos o tres tiradas en el turno,
              // animarlas todas a la vez es ruido, no suspenso.
              <RollCard key={r?.id ?? i} roll={r} big animar={animarDados && i === 0} />
            ))}
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {ended ? (
          <div className="ending" ref={endingRef}>
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
                  setRollsDelTurno([]); setStreaming(''); setTab('tablero');
                }}
              />
            )}
            <button className="primary" onClick={() => setTab('tiradas')}>Ver la auditoría del azar</button>
            <button className="ghost" onClick={() => { setCampaignId(null); setState(null); }}>Nueva partida</button>
          </div>
        ) : dead ? (
          <div className="death">
            {/* Reportado jugando: esto decía "ha muerto" también para la
                locura indefinida, contradiciendo al propio motor —cuyo
                mensaje dice explícitamente "es el mismo cierre que la
                muerte, AUNQUE NO LO SEA"—. Un investigador loco no está
                muerto: está fuera de juego. */}
            {inv.status === 'insane' ? (
              <>
                <div className="death-title">{inv.name} cruzó a locura indefinida.</div>
                <p>
                  No murió: quedó fuera de juego como personaje jugable, con la misma definición que la
                  muerte pero sin serlo. El mundo conserva todas las consecuencias, pistas y relaciones
                  que dejó. Podés continuar con otro investigador.
                </p>
              </>
            ) : (
              <>
                <div className="death-title">{inv.name} ha muerto.</div>
                <p>
                  La muerte es permanente. El mundo conserva todas las consecuencias, pistas y relaciones
                  que dejó. Podés continuar con otro investigador.
                </p>
              </>
            )}
            {state.reserveAvailable.map((r: any) => (
              <button key={r.id} className="primary" onClick={() => continueWith(r.id)}>
                Continuar como {r.name}, {r.occupation.toLowerCase()}
              </button>
            ))}
          </div>
        ) : (
          <div className="input-area">
            <Acciones
              options={options}
              nuevas={marcas.pendientes}
              busy={busy}
              onPick={send}
              cuantosFinales={
                entradaDe(state?.scenarioId ?? '')?.scenario.endings.length ?? 5
              }
            />

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

            {/* Sin escritura libre, a propósito. El repertorio del motor es
                acotado —lo define el contenido de cada aventura— así que un
                cuadro de texto prometería una libertad que no hay. Esta caja
                ya estaba oculta salvo con Claude narrando; al eliminarse ese
                modo, se eliminó también. */}

          </div>
        )}
      </main>

      <aside className="col col-right">
        <div className="tabs">
          {(
            [
              'tablero', 'inventario', 'documentos', 'tiradas',
              // Sólo aparece si el investigador sabe al menos un hechizo —
              // no hay nada que mostrar ahí para quien nunca aprendió magia.
              ...(state?.investigator?.spellsKnown?.length ? ['hechizos'] : []),
            ] as Tab[]
          ).map((t) => (
            <button
              key={t}
              className={`tab ${tab === t ? 'tab-on' : ''} ${t === 'hechizos' && hayHechizoNuevo ? 'tab-nuevo' : ''}`}
              onClick={() => { setTab(t); if (t === 'hechizos') setHayHechizoNuevo(false); }}
            >
              {t}
            </button>
          ))}
        </div>
        {/* Segunda fila: lo que se consulta de vez en cuando, no en cada
            turno. «El mundo recuerda» y «usted lo nota» vivían abajo, fijos y
            de altura libre, y con una campaña larga encima le comían la
            pantalla al tablero — reportado jugando. Acá abren y cierran. */}
        <div className="tabs tabs-secundarias">
          {(
            [
              ...((state?.consequences?.length ?? 0) > 0 ? ['recuerda'] : []),
              ...((inv?.playerKnowledge?.length ?? 0) > 0 ? ['aparte'] : []),
              'finales',
            ] as Tab[]
          ).map((t) => (
            <button key={t} className={`tab ${tab === t ? 'tab-on' : ''}`} onClick={() => setTab(t)}>
              {ETIQUETA_TAB[t] ?? t}
            </button>
          ))}
        </div>
        <div className="tab-body">
          {tab === 'tablero' && <Board board={state?.board} />}
          {tab === 'inventario' && <Inventory items={state?.items ?? []} />}
          {tab === 'documentos' && <Documents docs={state?.documents ?? []} />}
          {tab === 'hechizos' && (
            <div className="hechizos">
              {(state?.investigator?.spellsKnown ?? []).map((h: { id: string; proven: boolean; lastAttemptAt?: string; source?: string }) => {
                const def = HECHIZO_POR_ID[h.id];
                if (!def) return null;
                const pm = state?.investigator?.derived?.mp ?? 0;
                // Cuánto falta para poder volver a lanzarlo. Se mide contra el
                // reloj del MUNDO, igual que en el motor (`toolCastSpell`):
                // acá sólo se muestra, la decisión la toma el motor igual.
                const espera = esperaRestante(h.lastAttemptAt, def.esperaMinutos, state?.worldTime?.iso);
                return (
                  <div className="hechizo" key={h.id}>
                    <div className="hechizo-titulo">
                      {def.nombre}
                      {!h.proven && <span className="hechizo-sin-probar">sin probar — pide Poder difícil</span>}
                    </div>
                    {/* De dónde salió. El motor lo pedía como obligatorio desde
                        el principio y no se mostraba en ningún lado —
                        reportado jugando: "no dice de qué libro sale". */}
                    {h.source && <p className="hechizo-fuente">Aprendido de: {h.source}</p>}
                    <p className="hechizo-desc">{def.descripcion}</p>
                    <div className="hechizo-costo">
                      {def.costoPM} PM{def.costoCordura ? ` · ${def.costoCordura} de Cordura` : ''}
                      {pm < def.costoPM && ' · sin PM suficientes: el resto sale de tus Puntos de Vida'}
                    </div>
                    <button className="primary" disabled={busy || espera > 0} onClick={() => lanzarHechizo(h.id)}>
                      {espera > 0 ? `Todavía no — faltan ${textoEspera(espera)}` : 'Lanzar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {tab === 'recuerda' && (
            <div className="consequences">
              {(state?.consequences ?? []).map((c: any, i: number) => (
                <div key={i} className="cons">{c.permanent ? '● ' : '○ '}{c.description}</div>
              ))}
            </div>
          )}
          {/* A propósito distinto de la ficha: esto no es lo que el
              investigador sabe, es lo que USTED —quien lee— nota. El
              investigador no da señales de haberlo entendido. */}
          {tab === 'aparte' && (
            <div className="aparte">
              <div className="aparte-title">Usted lo nota. Su investigador, todavía no.</div>
              {(inv?.playerKnowledge ?? []).map((k: string, i: number) => (
                <div key={i} className="aparte-item">{k}</div>
              ))}
            </div>
          )}
          {tab === 'finales' && <Finales api={api} campaignId={campaignId} estadoActual={state} />}
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
 * Las comprobaciones de mejora de la fase de desarrollo, UNA POR UNA.
 *
 * Pedido jugando dos veces seguidas: aparecían las diez de golpe, ya
 * resueltas, y era una tabla de resultados en vez de una tirada. La primera
 * vuelta de esto las revelaba solas, con un timer — y a ojo eso se sigue
 * viendo como «todas juntas» si son pocas o si el timer corre rápido. Ahora
 * el avance es DEL JUGADOR, no del reloj: cada habilidad tira su dado —gira
 * un momento, solo— y se queda mostrada hasta que el jugador pide ver la
 * siguiente. No hay forma de que esto se lea como una tabla: sólo se puede
 * ver de a una.
 *
 * El resultado ya estaba firmado en la cadena mucho antes de que esto
 * girara: es presentación, igual que `DadosPercentiles`.
 *
 * Con la animación apagada (o con `prefers-reduced-motion`), se muestran
 * todas reveladas de entrada, sin esperas ni clicks — apagar la animación
 * significa eso.
 */
function MejorasAnimadas({ mejoras, animar }: { mejoras: any[]; animar: boolean }) {
  const activa = animar && !prefiereMenosMovimiento();
  // Cuántas ya se revelaron y quedaron fijas en pantalla.
  const [indice, setIndice] = useState(0);
  // La que está girando AHORA, antes de que el jugador la vea resuelta.
  const [girando, setGirando] = useState(() => activa && mejoras.length > 0);
  const [cara, setCara] = useState(1);

  // Cada vez que el jugador avanza el índice, la nueva fila arranca girando.
  useEffect(() => {
    if (activa && indice < mejoras.length) setGirando(true);
  }, [activa, indice, mejoras.length]);

  // El giro es sólo un momento —no hace falta esperar al jugador para verlo
  // girar, sólo para AVANZAR una vez que ya paró—.
  useEffect(() => {
    if (!activa || !girando) return;
    const tic = window.setInterval(() => setCara(1 + Math.floor(Math.random() * 100)), 70);
    const para = window.setTimeout(() => setGirando(false), 700);
    return () => { clearInterval(tic); clearTimeout(para); };
  }, [activa, girando]);

  const fila = (m: any) => (
    <div key={m.skill} className={`desarrollo-fila ${m.gain > 0 ? 'sube' : ''}`}>
      <span className="d-label">{m.label}</span>
      <span className="d-num">{m.antes}%</span>
      <span className="d-dado">tirada {m.check}</span>
      <span className="d-res">
        {m.gain > 0 ? `+${m.gain} → ${m.despues}%` : 'ya lo sabía demasiado bien'}
      </span>
    </div>
  );

  if (!activa) return <>{mejoras.map(fila)}</>;

  return (
    <>
      {mejoras.slice(0, indice).map(fila)}
      {indice < mejoras.length && (
        girando ? (
          <div className="desarrollo-fila desarrollo-fila-tirando">
            <span className="d-label">{mejoras[indice].label}</span>
            <span className="d-num">{mejoras[indice].antes}%</span>
            <span className="d-dado d-dado-girando">tirada {cara}</span>
            <span className="d-res">…</span>
          </div>
        ) : (
          <>
            {fila(mejoras[indice])}
            {indice + 1 < mejoras.length && (
              <button className="ghost desarrollo-siguiente" onClick={() => setIndice(indice + 1)}>
                Ver la siguiente comprobación →
              </button>
            )}
          </>
        )
      )}
    </>
  );
}

/**
 * EL ARCHIVO DE FINALES.
 *
 * Reportado jugando: el texto del desenlace se lee una sola vez —y a veces ni
 * eso, porque lo que sigue en la narración lo empuja fuera de pantalla— y no
 * había forma de volver a leerlo, ni el de esta aventura ni el de las
 * anteriores, que viven en otra campaña del navegador.
 *
 * Se leen del log de cada campaña terminada, no de un registro aparte, así
 * que funciona igual para las partidas jugadas antes de que esto existiera.
 * El final de la campaña ABIERTA sale del estado en memoria: todavía no
 * necesariamente está en el índice cuando se abre esta pestaña.
 */
function Finales({ api, campaignId, estadoActual }: {
  api: GameApi | null; campaignId: string | null; estadoActual: any;
}) {
  const [finales, setFinales] = useState<any[] | null>(null);

  useEffect(() => {
    let vivo = true;
    if (!api) return;
    api.finalesArchivados()
      .then((f) => { if (vivo) setFinales(f); })
      .catch(() => { if (vivo) setFinales([]); });
    return () => { vivo = false; };
  }, [api, campaignId, estadoActual?.ending?.title]);

  if (finales === null) return <div className="finales-vacio">Buscando en las partidas de este navegador…</div>;

  // El de la campaña abierta puede no estar todavía en lo que devolvió el
  // índice: se agrega acá si falta, marcado como el de ahora.
  const conActual = [...finales];
  if (estadoActual?.ending && !conActual.some((f) => f.campaignId === campaignId)) {
    const e = entradaDe(estadoActual.scenarioId);
    conActual.push({
      campaignId, scenarioId: estadoActual.scenarioId,
      aventura: e?.scenario.title ?? estadoActual.title,
      epoca: e?.epoca ?? '',
      title: estadoActual.ending.title,
      text: Array.isArray(estadoActual.ending.text)
        ? estadoActual.ending.text.join('\n\n') : String(estadoActual.ending.text),
      cuando: e?.cuando ?? '',
      actual: true,
    });
  }
  const marcados = conActual.map((f) => ({ ...f, actual: f.campaignId === campaignId }));

  if (marcados.length === 0) {
    return (
      <div className="finales-vacio">
        Todavía no cerraste ninguna aventura. Cuando cierres una, su desenlace queda acá para releerlo.
      </div>
    );
  }

  return (
    <div className="finales">
      <div className="finales-intro">
        {marcados.length === 1 ? 'Un desenlace' : `${marcados.length} desenlaces`} · en orden de cuándo pasaron
      </div>
      {marcados.map((f, i) => (
        <div key={`${f.campaignId}-${i}`} className={`final-item ${f.actual ? 'final-actual' : ''}`}>
          <div className="final-aventura">{f.aventura}{f.actual && <span className="final-chip">esta partida</span>}</div>
          {f.epoca && <div className="final-epoca">{f.epoca}</div>}
          <div className="final-titulo">{f.title}</div>
          {String(f.text).split('\n\n').filter(Boolean).map((p: string, j: number) => (
            <p key={j} className="final-parrafo">{p}</p>
          ))}
        </div>
      ))}
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
          <MejorasAnimadas mejoras={informe.mejoras} animar={leerPreferenciaDados()} />
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

/** Para el pie del bloque de desenlaces, que antes decía «cinco» a mano. */
const EN_LETRAS: Record<number, string> = {
  2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete',
};

function Acciones({
  options, nuevas, busy, onPick, cuantosFinales,
}: {
  options: Opcion[];
  nuevas: Set<string>;
  busy: boolean;
  onPick: (intencion: string, id: string) => void;
  /** Cuántos desenlaces tiene ESTA aventura. No son cinco en todas. */
  cuantosFinales: number;
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
            {cuantosFinales > 1 ? (
              <>Hay {EN_LETRAS[cuantosFinales] ?? cuantosFinales} desenlaces. Ninguno es perder:
                {' '}son {EN_LETRAS[cuantosFinales] ?? cuantosFinales} maneras distintas de que esto termine.</>
            ) : (
              <>Elegir un desenlace cierra la aventura. No hay rebobinado.</>
            )}
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
