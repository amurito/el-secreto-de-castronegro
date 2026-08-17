/**
 * SIMULADOR DE COMBATE — el galpón, en la pantalla.
 *
 * No narra. Muestra los dos dados, la comparación de grados, la cuenta del
 * daño y los PV de los dos lados, porque lo único que este banco de pruebas
 * tiene que contestar es «¿esto se siente bien?», y para eso hacen falta los
 * números, no la prosa.
 *
 * Corre contra el motor de verdad, con la misma herramienta `resolve_attack`
 * que usaría una aventura: lo que se prueba acá es lo que va a pasar allá.
 */

import React, { useEffect, useState } from 'react';
import type { GameApi, AttackResult, Rival } from '../app/api.ts';
import { ARMAS } from '../rules/armas.ts';
import { Sheet, RollCard } from './components.tsx';

const NOTA_RIVAL: Record<string, string> = {
  'npc-debil': 'Esquiva en vez de devolver: se le puede ganar sin cobrar nada.',
  'npc-normal': 'Devuelve el golpe. Contra alguien que no es peleador, duele.',
  'npc-fuerte': 'Sabe pelear y tiene un facón. Para casi cualquier investigador, esto no es una pelea.',
};

export function Simulador({
  api, campaignId: inicial, onSalir,
}: {
  api: GameApi;
  campaignId: string;
  onSalir: () => void;
}) {
  // El id vive acá y no en el padre porque reiniciar ABRE OTRA CAMPAÑA: el
  // log es append-only y no hay «deshacer». Si el padre se quedara con el id
  // viejo, el primer ataque después de reiniciar buscaría una campaña
  // borrada.
  const [campaignId, setCampaignId] = useState(inicial);
  const [estado, setEstado] = useState<any>(null);
  const [rivales, setRivales] = useState<Rival[]>([]);
  const [rival, setRival] = useState('npc-normal');
  const [arma, setArma] = useState('desarmado');
  const [registro, setRegistro] = useState<Array<{ mensaje: string; tiradas: any[]; ok: boolean }>>([]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.estadoSimulador(campaignId)
      .then((r) => { setEstado(r.state); setRivales(r.rivales); })
      .catch((e) => setError(e.message));
  }, [campaignId]);

  function aplicar(r: AttackResult) {
    setEstado(r.state);
    setRivales(r.rivales);
  }

  async function atacar() {
    setOcupado(true);
    setError(null);
    try {
      const r = await api.atacar(campaignId, rival, arma);
      aplicar(r);
      setRegistro((prev) => [{ mensaje: r.mensaje, tiradas: r.tiradas as any[], ok: r.ok }, ...prev]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function reiniciar() {
    setOcupado(true);
    try {
      const r = await api.reiniciarSimulador(campaignId);
      setCampaignId(r.campaignId);
      aplicar(r);
      setRegistro([]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const inv = estado?.investigator;
  const elegido = rivales.find((r) => r.id === rival);
  const enPie = (elegido?.hp ?? 1) > 0;
  const investigadorEnPie = (inv?.derived?.hp ?? 1) > 0;

  return (
    <div className="sim">
      <aside className="sim-ficha">
        <Sheet inv={inv} />
      </aside>

      <main className="sim-main">
        <header className="sim-head">
          <div>
            <h2>Simulador de combate</h2>
            <p className="sim-sub">
              El motor de verdad, sin historia alrededor. Elegí con qué y contra quién, y mirá los dados.
            </p>
          </div>
          <button className="ghost" onClick={onSalir}>Salir</button>
        </header>

        <section className="sim-controles">
          <div className="sim-campo">
            <label>Con qué peleás</label>
            <select value={arma} onChange={(e) => setArma(e.target.value)} disabled={ocupado}>
              {ARMAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} — {a.dano.cantidad}D{a.dano.caras}
                  {a.dano.suma ? `+${a.dano.suma}` : ''}
                  {a.empala ? ' · empala' : ''}
                </option>
              ))}
            </select>
            <div className="sim-ayuda">
              {ARMAS.find((a) => a.id === arma)?.nota}
              {ARMAS.find((a) => a.id === arma)?.aporteBonificacion === 'ninguna'
                && ' No suma corpulencia: las armas de fuego nunca la suman.'}
            </div>
          </div>

          <div className="sim-campo">
            <label>Contra quién</label>
            <div className="sim-rivales">
              {rivales.map((r) => (
                <button
                  key={r.id}
                  className={`sim-rival ${rival === r.id ? 'sim-rival-on' : ''} ${r.hp <= 0 ? 'sim-rival-caido' : ''}`}
                  onClick={() => setRival(r.id)}
                  disabled={ocupado}
                >
                  <b>{r.name}</b>
                  <span className="sim-rival-arma">{r.arma}</span>
                  <span className="sim-rival-hp">
                    {r.hp <= 0 ? 'en el piso' : `${r.hp}/${r.maxHp} PV`}
                  </span>
                </button>
              ))}
            </div>
            <div className="sim-ayuda">{NOTA_RIVAL[rival]}</div>
          </div>
        </section>

        <div className="sim-acciones">
          <button
            className="primary"
            onClick={atacar}
            disabled={ocupado || !enPie || !investigadorEnPie}
          >
            {ocupado ? 'Tirando…' : 'Atacar'}
          </button>
          <button className="ghost" onClick={reiniciar} disabled={ocupado}>
            Reiniciar el galpón
          </button>
        </div>

        {!investigadorEnPie && (
          <div className="sim-aviso">
            Tu investigador está fuera de combate. Reiniciá el galpón para volver a probar.
          </div>
        )}
        {!enPie && investigadorEnPie && (
          <div className="sim-aviso">
            Ese ya está en el piso. Elegí otro, o reiniciá.
          </div>
        )}
        {error && <div className="error">{error}</div>}

        <section className="sim-registro">
          {registro.length === 0 && (
            <p className="sim-vacio">Todavía no pasó nada. Apretá «Atacar».</p>
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
