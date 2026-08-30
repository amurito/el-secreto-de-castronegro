/**
 * COMBATE — la pelea de verdad, en su propia pantalla.
 *
 * Existe porque un botón más en la lista de acciones ("Enfrentar a Cirilo")
 * resolvía un asalto entero de texto plano por click, y quien jugó esperaba
 * que la interfaz cambiara, como en el Simulador. Es justamente eso: el
 * mismo layout, las mismas `RollCard`s — pero corriendo contra el NPC real
 * de la aventura, no contra un roster sintético, y sin aislar al resto del
 * cuarto (acá el motor pelea con todos los presentes, como corresponde).
 *
 * Dos diferencias de fondo con el Simulador, no cosméticas:
 *   · El arma se elige entre lo que el investigador REALMENTE tiene encima
 *     (`armas`, ya filtrado por la API), no el catálogo entero.
 *   · Nunca se muestra el PV exacto del rival: los mismos cuatro escalones
 *     de `EstadoDeCombate` que ya rigen para cualquier NPC en el resto del
 *     juego. En la mesa nadie ve la ficha del rival.
 *
 * Se monta y se desmonta solo, según `GameState.activeCombat` — no hay
 * botón de «salir»: de acá no se sale por decisión de interfaz, se sale
 * peleando, huyendo, o cayendo.
 */

import React, { useEffect, useState } from 'react';
import type { GameApi, CombateResult, RivalReal, ArmaDisponible, IntimidarDisponible } from '../app/api.ts';
import type { Opcion } from '../scenario/acciones.ts';
import { ARMA_POR_ID } from '../rules/armas.ts';
import { Sheet, RollCard } from './components.tsx';

const ETIQUETA_ESTADO: Record<string, string> = {
  entero: 'entero',
  lastimado: 'lastimado',
  malherido: 'malherido',
  fuera_de_combate: 'fuera de combate',
};

interface Entrada { id: string; kind: string; text: string }

export function Combate({
  api, campaignId, onFin,
}: {
  api: GameApi;
  campaignId: string;
  onFin: (state: any, options: Opcion[], entradas: Entrada[]) => void;
}) {
  const [estado, setEstado] = useState<any>(null);
  const [rivales, setRivales] = useState<RivalReal[]>([]);
  const [armas, setArmas] = useState<ArmaDisponible[]>([]);
  const [intimidar, setIntimidar] = useState<IntimidarDisponible>(null);
  const [rivalId, setRivalId] = useState('');
  const [arma, setArma] = useState('desarmado');
  const [registro, setRegistro] = useState<Array<{ mensaje: string; tiradas: any[]; ok: boolean }>>([]);
  // Pedido después de jugarlo: una pelea larga —maniobras, ataques, dos o
  // tres rivales— deja el registro imposible de leer de un vistazo.
  // `registro` está en orden del más nuevo al más viejo (ver `agregarAlRegistro`):
  // el más nuevo queda siempre visible, y el resto se puede colapsar.
  const [verAnteriores, setVerAnteriores] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apuntando, setApuntando] = useState(false);
  const [puntoBlanco, setPuntoBlanco] = useState(false);
  const [cubierto, setCubierto] = useState(false);
  const [blancoMovil, setBlancoMovil] = useState(false);

  // Cuántas entradas de narrativa ya existían al entrar: sólo lo que se
  // agrega DESPUÉS de este punto viaja de vuelta a la historia principal al
  // terminar. Lo anterior a esto ya lo narró el turno que abrió el combate,
  // por el camino normal —no hace falta (ni conviene) repetirlo acá.
  const [desde, setDesde] = useState(0);
  const [entradas, setEntradas] = useState<Entrada[]>([]);

  useEffect(() => {
    api.combateEstado(campaignId)
      .then((r) => {
        setEstado(r.state);
        setRivales(r.rivales);
        setArmas(r.armas);
        setIntimidar(r.intimidar);
        setRivalId(r.rivales[0]?.id ?? '');
        setDesde((r.state as any).narrative?.length ?? 0);
      })
      .catch((e) => setError(e.message));
  }, [campaignId]);

  function aplicar(r: CombateResult) {
    setEstado(r.state);
    setIntimidar(r.intimidar);
    setRivales(r.rivales);
    const nuevas: Entrada[] = (r.state.narrative as Entrada[]).slice(desde);
    setDesde(r.state.narrative.length);
    setEntradas((prev) => [...prev, ...nuevas]);
    if (!r.combateActivo) {
      onFin(r.state, r.options, [...entradas, ...nuevas]);
      return;
    }
  }

  function agregarAlRegistro(r: CombateResult) {
    setRegistro((prev) => [{ mensaje: r.mensaje, tiradas: r.tiradas as any[], ok: r.ok }, ...prev]);
    aplicar(r);
  }

  async function atacar(alPuntoDebil = false) {
    setOcupado(true);
    setError(null);
    try {
      agregarAlRegistro(await api.combateAtacar(campaignId, rivalId, arma, { apuntando, puntoBlanco, cubierto, blancoMovil, alPuntoDebil }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  /**
   * Pedido después de jugarlo: pelear asalto por asalto contra alguien que
   * ya se sabe cómo se gana (el punto débil ya descubierto, o un rival que
   * ya no da pelea real) es repetir el mismo click hasta el cansancio. Esto
   * hace exactamente los mismos llamados que un click manual, uno atrás de
   * otro, así que los dados siguen siendo los de siempre —no hay atajo en
   * las reglas, sólo en la cantidad de clicks—. Se corta solo si termina el
   * combate, si el rival elegido cae, si el investigador cae, o a los 30
   * asaltos por si algo quedó mal declarado y esto nunca termina.
   */
  async function resolverTodo() {
    setOcupado(true);
    setError(null);
    try {
      for (let n = 0; n < 30; n++) {
        const alPuntoDebil = Boolean(rivales.find((r) => r.id === rivalId)?.puntoDebil?.descubierto);
        const r = await api.combateAtacar(campaignId, rivalId, arma, { apuntando, puntoBlanco, cubierto, blancoMovil, alPuntoDebil });
        agregarAlRegistro(r);
        if (!r.combateActivo) break;
        const rivalAhora = r.rivales.find((x) => x.id === rivalId);
        const invAhora = (r.state as any)?.investigator?.derived?.hp ?? 1;
        if (!rivalAhora || rivalAhora.estadoCombate === 'fuera_de_combate' || invAhora <= 0) break;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function huir() {
    setOcupado(true);
    setError(null);
    try {
      agregarAlRegistro(await api.combateHuir(campaignId, arma));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function maniobra(tipo: 'desarmar' | 'derribar' | 'sujetar') {
    setOcupado(true);
    setError(null);
    try {
      agregarAlRegistro(await api.combateManiobra(campaignId, rivalId, tipo));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function intimidarClick() {
    setOcupado(true);
    setError(null);
    try {
      agregarAlRegistro(await api.combateIntimidar(campaignId, rivalId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const inv = estado?.investigator;
  const elegido = rivales.find((r) => r.id === rivalId);
  const enPie = elegido ? elegido.estadoCombate !== 'fuera_de_combate' : false;
  const investigadorEnPie = (inv?.derived?.hp ?? 1) > 0;
  const armaActual = ARMA_POR_ID[arma];

  return (
    <div className="sim">
      <aside className="sim-ficha">
        <Sheet inv={inv} />
      </aside>

      <main className="sim-main">
        <header className="sim-head">
          <div>
            <h2>Combate</h2>
            <p className="sim-sub">
              Esto es de verdad: los dados que salgan acá son los que valen para la historia.
            </p>
            {estado?.activeCombat?.reason && estado.activeCombat.reason !== 'lo dispuso la escena' && (
              <p className="sim-sub">{estado.activeCombat.reason}</p>
            )}
            {/* Contra QUÉ se pelea. Sin esto se entraba a decidir entre pelear,
                huir o intimidar viendo sólo un nombre y una barra. */}
            {elegido?.descripcion && (
              <p className="sim-sub"><b>{elegido.name}.</b> {elegido.descripcion}</p>
            )}
            {elegido?.puntoDebil?.descubierto && (
              <p className="sim-sub">
                A {elegido.name} no se le gana a golpes: las heridas se le cierran solas.
                Hay que ir por {elegido.puntoDebil.nombre}
                {elegido.puntoDebil.requiereCortante ? ', y con algo que corte' : ''}.
                Apuntar cuesta un dado de penalización.
              </p>
            )}
          </div>
        </header>

        <section className="sim-controles">
          <div className="sim-campo">
            <label>Con qué peleás</label>
            <select value={arma} onChange={(e) => setArma(e.target.value)} disabled={ocupado}>
              {armas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre} — {a.dano}</option>
              ))}
            </select>
            {armaActual?.nota && <div className="sim-ayuda">{armaActual.nota}</div>}
            {armaActual?.habilidad === 'armas_fuego' && (
              <div className="sim-fuego">
                <label className="sim-check">
                  <input type="checkbox" checked={apuntando} onChange={(e) => setApuntando(e.target.checked)} />
                  Venía apuntando (bonificación)
                </label>
                <label className="sim-check">
                  <input type="checkbox" checked={puntoBlanco} onChange={(e) => setPuntoBlanco(e.target.checked)} />
                  A quemarropa (bonificación)
                </label>
                <label className="sim-check">
                  <input type="checkbox" checked={cubierto} onChange={(e) => setCubierto(e.target.checked)} />
                  El blanco se cubre (penalización)
                </label>
                <label className="sim-check">
                  <input type="checkbox" checked={blancoMovil} onChange={(e) => setBlancoMovil(e.target.checked)} />
                  El blanco se mueve rápido (penalización)
                </label>
              </div>
            )}
          </div>

          {rivales.length > 1 && (
            <div className="sim-campo">
              <label>Contra quién</label>
              <div className="sim-rivales">
                {rivales.map((r) => (
                  <button
                    key={r.id}
                    className={`sim-rival ${rivalId === r.id ? 'sim-rival-on' : ''} ${r.estadoCombate === 'fuera_de_combate' ? 'sim-rival-caido' : ''}`}
                    onClick={() => setRivalId(r.id)}
                    disabled={ocupado}
                  >
                    <b>{r.name}</b>
                    <span className="sim-rival-arma">{r.arma}</span>
                    <span className="sim-rival-hp">{ETIQUETA_ESTADO[r.estadoCombate]}</span>
                    {(r.derribado || r.agarrado) && (
                      <span className="sim-rival-marca">
                        {r.derribado ? 'derribado' : ''}{r.derribado && r.agarrado ? ' · ' : ''}{r.agarrado ? 'sujeto' : ''}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="sim-acciones">
          <button
            className="primary"
            onClick={() => atacar(false)}
            disabled={ocupado || !enPie || !investigadorEnPie}
          >
            {ocupado ? 'Tirando…' : 'Atacar'}
          </button>
          {/* Aparece recién cuando el jugador vio con sus propios dados que
              las heridas comunes se cierran solas: enterarse es parte de la
              pelea, no un dato que la interfaz regala de entrada. */}
          {elegido?.puntoDebil?.descubierto && (
            <button
              className="primary"
              onClick={() => atacar(true)}
              disabled={ocupado || !enPie || !investigadorEnPie}
            >
              Ir por {elegido.puntoDebil.nombre}
            </button>
          )}
          <button className="ghost" onClick={resolverTodo} disabled={ocupado || !enPie || !investigadorEnPie}>
            Resolver el combate
          </button>
          <button className="ghost" onClick={huir} disabled={ocupado || !investigadorEnPie}>
            Huir
          </button>
          {intimidar && intimidar.npcId === rivalId && (
            <button className="ghost" onClick={intimidarClick} disabled={ocupado || !enPie || !investigadorEnPie}>
              Intimidar
            </button>
          )}
        </div>

        <div className="sim-maniobras">
          <span className="sim-maniobras-label">Maniobras contra {elegido?.name ?? 'el rival'}:</span>
          <button className="ghost" onClick={() => maniobra('desarmar')} disabled={ocupado || !enPie || !investigadorEnPie}>
            Desarmar
          </button>
          <button className="ghost" onClick={() => maniobra('derribar')} disabled={ocupado || !enPie || !investigadorEnPie}>
            Derribar
          </button>
          <button className="ghost" onClick={() => maniobra('sujetar')} disabled={ocupado || !enPie || !investigadorEnPie}>
            Sujetar
          </button>
        </div>

        {!investigadorEnPie && (
          <div className="sim-aviso">Tu investigador está fuera de combate.</div>
        )}
        {!enPie && investigadorEnPie && rivales.length > 1 && (
          <div className="sim-aviso">Ese ya está en el piso. Elegí otro.</div>
        )}
        {error && <div className="error">{error}</div>}

        <section className="sim-registro">
          {registro.length === 0 && (
            <p className="sim-vacio">Elegí qué hacer.</p>
          )}
          {registro.length > 0 && (
            <article className={`sim-asalto ${registro[0]!.ok ? '' : 'sim-asalto-rechazado'}`}>
              <pre className="sim-texto">{registro[0]!.mensaje}</pre>
              {registro[0]!.tiradas.map((t: any, n: number) => <RollCard key={n} roll={t} />)}
            </article>
          )}
          {registro.length > 1 && (
            <button className="ghost sim-registro-toggle" onClick={() => setVerAnteriores((v) => !v)}>
              {verAnteriores ? 'Ocultar asaltos anteriores' : `Ver los ${registro.length - 1} asaltos anteriores`}
            </button>
          )}
          {verAnteriores && registro.slice(1).map((linea, i) => (
            <article key={i} className={`sim-asalto ${linea.ok ? '' : 'sim-asalto-rechazado'}`}>
              <pre className="sim-texto">{linea.mensaje}</pre>
              {linea.tiradas.map((t: any, n: number) => <RollCard key={n} roll={t} />)}
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
