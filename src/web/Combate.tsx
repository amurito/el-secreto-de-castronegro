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
import type { GameApi, CombateResult, RivalReal, ArmaDisponible } from '../app/api.ts';
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
  const [rivalId, setRivalId] = useState('');
  const [arma, setArma] = useState('desarmado');
  const [registro, setRegistro] = useState<Array<{ mensaje: string; tiradas: any[]; ok: boolean }>>([]);
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
        setRivalId(r.rivales[0]?.id ?? '');
        setDesde((r.state as any).narrative?.length ?? 0);
      })
      .catch((e) => setError(e.message));
  }, [campaignId]);

  function aplicar(r: CombateResult) {
    setEstado(r.state);
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

  async function atacar() {
    setOcupado(true);
    setError(null);
    try {
      agregarAlRegistro(await api.combateAtacar(campaignId, rivalId, arma, { apuntando, puntoBlanco, cubierto, blancoMovil }));
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
          </div>
        </header>

        <section className="sim-controles">
          <div className="sim-campo">
            <label>Con qué peleás</label>
            <select value={arma} onChange={(e) => setArma(e.target.value)} disabled={ocupado}>
              {armas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
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
            onClick={atacar}
            disabled={ocupado || !enPie || !investigadorEnPie}
          >
            {ocupado ? 'Tirando…' : 'Atacar'}
          </button>
          <button className="ghost" onClick={huir} disabled={ocupado || !investigadorEnPie}>
            Huir
          </button>
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
          {registro.map((linea, i) => (
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
