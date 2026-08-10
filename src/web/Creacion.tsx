/**
 * PANTALLA DE CREACIÓN DE INVESTIGADOR.
 *
 * Cuatro pasos, en el orden en que las decisiones dependen unas de otras:
 * quién es → qué le tocó en los dados → qué sabe hacer → de qué se agarra.
 *
 * La edad va PRIMERO y no al final, aunque cueste: decide si se tira Suerte
 * dos veces y cuántas comprobaciones de EDU hay. Preguntarla después obligaría
 * a re-tirar, y re-tirar por un dato administrativo se siente a error.
 *
 * Los errores que se muestran acá vienen del validador de reglas, no de la
 * interfaz. La interfaz ayuda a no equivocarse; quien decide si una ficha
 * existe es el reglamento.
 */

import React, { useMemo, useState } from 'react';
import type { CharacteristicId, BackstoryAspect } from '../shared/types.ts';
import { SKILLS, SKILL_BY_ID } from '../rules/skills.ts';
import { TOPE_CREACION } from '../rules/creacion.ts';
import {
  tirarCaracteristicasDe, presupuesto, armar, catalogoCreacion, efectoEdad,
  type TiradaInicial,
} from '../app/creacion.ts';

const ETIQUETA_CAR: Record<CharacteristicId, string> = {
  STR: 'FUE', CON: 'CON', SIZ: 'TAM', DEX: 'DES',
  APP: 'APA', INT: 'INT', POW: 'POD', EDU: 'EDU',
};

const CLASES_TRASFONDO: Array<{ kind: BackstoryAspect['kind']; label: string; ayuda: string }> = [
  { kind: 'personas', label: 'Alguien que le importa', ayuda: 'Un nombre y una relación. Es lo que mejor funciona como conexión clave.' },
  { kind: 'ideologia', label: 'Algo que cree', ayuda: 'Una convicción que el juego va a poner a prueba.' },
  { kind: 'lugares', label: 'Un lugar que significa algo', ayuda: 'Dónde vuelve cuando necesita ordenarse.' },
  { kind: 'posesiones', label: 'Algo que guarda', ayuda: 'Un objeto con historia.' },
  { kind: 'rasgos', label: 'Cómo es', ayuda: 'Una costumbre, una manía, una manera.' },
];

type Paso = 'quien' | 'dados' | 'puntos' | 'trasfondo';

export function Creacion({
  scenarioTitulo, onListo, onCancelar, ocupado,
}: {
  scenarioTitulo: string;
  onListo: (investigador: unknown) => void;
  onCancelar: () => void;
  ocupado: boolean;
}) {
  const catalogo = useMemo(catalogoCreacion, []);
  const [paso, setPaso] = useState<Paso>('quien');

  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState(34);
  const [descripcion, setDescripcion] = useState('');
  const [ocupacionId, setOcupacionId] = useState(catalogo.ocupaciones[0]!.id);
  const [elegida, setElegida] = useState<CharacteristicId | undefined>(undefined);

  const [tirada, setTirada] = useState<TiradaInicial | null>(null);
  const [restaFisica, setRestaFisica] = useState<Record<string, number>>({});
  const [restaJuventud, setRestaJuventud] = useState<Record<string, number>>({});

  const [ocupPuntos, setOcupPuntos] = useState<Record<string, number>>({});
  const [persPuntos, setPersPuntos] = useState<Record<string, number>>({});

  const [trasfondo, setTrasfondo] = useState<Record<string, string>>({});
  const [conexion, setConexion] = useState<string>('personas');

  const [problemas, setProblemas] = useState<Array<{ campo: string; mensaje: string }>>([]);

  const ocupacion = catalogo.ocupaciones.find((o) => o.id === ocupacionId)!;
  const efecto = efectoEdad(edad);
  const bolsa = tirada ? presupuesto(ocupacionId, tirada, elegida) : { ocupacion: 0, personal: 0 };
  const gastadoOcup = Object.values(ocupPuntos).reduce((a, b) => a + b, 0);
  const gastadoPers = Object.values(persPuntos).reduce((a, b) => a + b, 0);

  function tirar() {
    setTirada(tirarCaracteristicasDe(edad));
    setRestaFisica({}); setRestaJuventud({});
    setOcupPuntos({}); setPersPuntos({}); setProblemas([]);
  }

  function crear() {
    if (!tirada) return;
    const aspectos: BackstoryAspect[] = CLASES_TRASFONDO
      .filter((c) => (trasfondo[c.kind] ?? '').trim())
      .map((c) => ({ id: c.kind, kind: c.kind, text: trasfondo[c.kind]!.trim() }));

    const r = armar(tirada, {
      nombre, edad, descripcion, ocupacionId,
      caracteristicaElegida: elegida,
      restaFisica: restaFisica as never,
      restaJuventud: restaJuventud as never,
      reparto: { ocupacion: ocupPuntos, personal: persPuntos },
      trasfondo: aspectos,
      conexionClave: aspectos.some((a) => a.id === conexion) ? conexion : (aspectos[0]?.id ?? null),
    });
    if (!r.ok) { setProblemas(r.problemas); return; }
    onListo(r.investigador);
  }

  const ajustar = (
    mapa: Record<string, number>, set: (v: Record<string, number>) => void,
    skill: string, delta: number, restante: number,
  ) => {
    const actual = mapa[skill] ?? 0;
    const paso = Math.min(Math.abs(delta), delta > 0 ? restante : actual);
    if (paso === 0) return;
    set({ ...mapa, [skill]: actual + (delta > 0 ? paso : -paso) });
  };

  return (
    <div className="creacion">
      <div className="creacion-cabeza">
        <h2>Crear investigador</h2>
        <div className="creacion-sub">para {scenarioTitulo}</div>
        <div className="creacion-pasos">
          {(['quien', 'dados', 'puntos', 'trasfondo'] as Paso[]).map((p, i) => (
            <span key={p} className={`creacion-paso ${paso === p ? 'on' : ''}`}>
              {i + 1}. {{ quien: 'Quién es', dados: 'Los dados', puntos: 'Qué sabe', trasfondo: 'De qué se agarra' }[p]}
            </span>
          ))}
        </div>
      </div>

      {/* ── 1. QUIÉN ES ─────────────────────────────────────────────────── */}
      {paso === 'quien' && (
        <div className="creacion-cuerpo">
          <label className="campo">
            <span>Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Casilda Ferreyra" />
          </label>

          <label className="campo">
            <span>Edad — {efecto.etiqueta}</span>
            <input
              type="number" min={catalogo.edadMin} max={catalogo.edadMax}
              value={edad} onChange={(e) => setEdad(Number(e.target.value))}
            />
          </label>

          <label className="campo">
            <span>Una línea sobre quién es</span>
            <textarea
              rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Se recibió en Buenos Aires y eligió el campo."
            />
          </label>

          <div className="campo-titulo">Ocupación</div>
          <div className="ocupaciones">
            {catalogo.ocupaciones.map((o) => (
              <button
                key={o.id}
                className={`ocupacion ${ocupacionId === o.id ? 'ocupacion-on' : ''}`}
                onClick={() => { setOcupacionId(o.id); setElegida(undefined); setOcupPuntos({}); }}
              >
                <div className="ocupacion-nombre">{o.nombre}</div>
                <div className="ocupacion-desc">{o.descripcion}</div>
                <div className="ocupacion-datos">
                  puntos: {o.puntosDescriptos} · crédito {o.credito.min}–{o.credito.max}
                </div>
                {o.nota && <div className="ocupacion-nota">{o.nota}</div>}
              </button>
            ))}
          </div>

          {ocupacion.formula.eleccion && (
            <div className="campo">
              <span>Esta ocupación deja elegir de dónde salen la mitad de los puntos:</span>
              <div className="eleccion">
                {ocupacion.formula.eleccion.entre.map((c) => (
                  <button
                    key={c} className={`chip ${elegida === c ? 'chip-on' : ''}`}
                    onClick={() => setElegida(c)}
                  >
                    {ETIQUETA_CAR[c]} × {ocupacion.formula.eleccion!.multiplicador}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="creacion-pie">
            <button className="ghost" onClick={onCancelar}>Volver</button>
            <button className="primary" onClick={() => { tirar(); setPaso('dados'); }} disabled={!nombre.trim()}>
              Tirar las características
            </button>
          </div>
        </div>
      )}

      {/* ── 2. LOS DADOS ────────────────────────────────────────────────── */}
      {paso === 'dados' && tirada && (
        <div className="creacion-cuerpo">
          <div className="caracteristicas">
            {(Object.keys(ETIQUETA_CAR) as CharacteristicId[]).map((c) => (
              <div className="car" key={c}>
                <span className="car-label">{ETIQUETA_CAR[c]}</span>
                <span className="car-valor">{tirada.caracteristicas[c]}</span>
              </div>
            ))}
            <div className="car">
              <span className="car-label">SUERTE</span>
              <span className="car-valor">{tirada.suerte}</span>
            </div>
          </div>

          {tirada.suerteAlternativa !== undefined && (
            <div className="creacion-nota">
              Por ser joven tiraste Suerte dos veces: {tirada.suerte} y {tirada.suerteAlternativa}. Se queda la mejor.
            </div>
          )}

          <div className="creacion-nota">
            Si no te gustan, tirá de nuevo: el reglamento lo permite y por eso estos dados no están en la
            auditoría. Desde el primer turno de juego, todo el azar vuelve a ser verificable.
          </div>
          <button className="ghost" onClick={tirar}>Tirar de nuevo</button>

          {(efecto.restaFisica > 0 || efecto.restaJuventud > 0) && (
            <>
              <div className="campo-titulo">Lo que cobra la edad</div>
              {efecto.restaFisica > 0 && (
                <Reparto
                  titulo={`Restar ${efecto.restaFisica} puntos entre FUE, CON y DES`}
                  claves={['STR', 'CON', 'DEX']}
                  total={efecto.restaFisica} valores={restaFisica} set={setRestaFisica}
                  etiqueta={(k) => ETIQUETA_CAR[k as CharacteristicId]}
                />
              )}
              {efecto.restaJuventud > 0 && (
                <Reparto
                  titulo={`Restar ${efecto.restaJuventud} puntos entre FUE y TAM`}
                  claves={['STR', 'SIZ']}
                  total={efecto.restaJuventud} valores={restaJuventud} set={setRestaJuventud}
                  etiqueta={(k) => ETIQUETA_CAR[k as CharacteristicId]}
                />
              )}
            </>
          )}
          {efecto.chequeosEdu > 0 && (
            <div className="creacion-nota">
              Además, {efecto.chequeosEdu} comprobación{efecto.chequeosEdu > 1 ? 'es' : ''} de EDU: los años que
              pasaron también enseñaron algo. Se tiran al crear la ficha.
            </div>
          )}

          <div className="creacion-pie">
            <button className="ghost" onClick={() => setPaso('quien')}>Atrás</button>
            <button className="primary" onClick={() => setPaso('puntos')}>Repartir habilidades</button>
          </div>
        </div>
      )}

      {/* ── 3. QUÉ SABE ─────────────────────────────────────────────────── */}
      {paso === 'puntos' && tirada && (
        <div className="creacion-cuerpo">
          <div className="bolsas">
            <div className={`bolsa ${gastadoOcup > bolsa.ocupacion ? 'bolsa-mal' : ''}`}>
              <span>De {ocupacion.nombre}</span>
              <b>{bolsa.ocupacion - gastadoOcup}</b>
              <span>de {bolsa.ocupacion}</span>
            </div>
            <div className={`bolsa ${gastadoPers > bolsa.personal ? 'bolsa-mal' : ''}`}>
              <span>Intereses personales</span>
              <b>{bolsa.personal - gastadoPers}</b>
              <span>de {bolsa.personal}</span>
            </div>
          </div>

          <div className="campo-titulo">
            Habilidades de la ocupación — acá van los puntos profesionales
          </div>
          <div className="creacion-nota">
            Crédito no se tira: se tiene. {ocupacion.nombre} vive entre {ocupacion.credito.min} y{' '}
            {ocupacion.credito.max}, y hay que ponerle puntos dentro de ese rango o la ficha no cierra.
          </div>
          <div className="skills">
            {ocupacion.habilidades.map((s) => (
              <FilaSkill
                key={s} skill={s}
                tope={s === 'credito' ? ocupacion.credito.max : TOPE_CREACION}
                ocup={ocupPuntos[s] ?? 0} pers={persPuntos[s] ?? 0}
                restanteOcup={bolsa.ocupacion - gastadoOcup}
                restantePers={bolsa.personal - gastadoPers}
                onOcup={(d) => ajustar(ocupPuntos, setOcupPuntos, s, d, bolsa.ocupacion - gastadoOcup)}
                onPers={(d) => ajustar(persPuntos, setPersPuntos, s, d, bolsa.personal - gastadoPers)}
              />
            ))}
          </div>

          <div className="campo-titulo">Todo lo demás — sólo intereses personales</div>
          <div className="skills">
            {SKILLS.filter((d) => !ocupacion.habilidades.includes(d.id) && d.id !== 'mitos').map((d) => (
              <FilaSkill
                key={d.id} skill={d.id} tope={TOPE_CREACION}
                ocup={0} pers={persPuntos[d.id] ?? 0} soloPersonal
                restanteOcup={0} restantePers={bolsa.personal - gastadoPers}
                onOcup={() => {}}
                onPers={(delta) => ajustar(persPuntos, setPersPuntos, d.id, delta, bolsa.personal - gastadoPers)}
              />
            ))}
          </div>

          <div className="creacion-pie">
            <button className="ghost" onClick={() => setPaso('dados')}>Atrás</button>
            <button className="primary" onClick={() => setPaso('trasfondo')}>Seguir</button>
          </div>
        </div>
      )}

      {/* ── 4. TRASFONDO ────────────────────────────────────────────────── */}
      {paso === 'trasfondo' && (
        <div className="creacion-cuerpo">
          <div className="creacion-nota">
            No es color. De acá sale la Cordura que se recupera entre aventuras, y cada fracaso obliga a
            reescribir una de estas líneas. Con tres alcanza.
          </div>
          {CLASES_TRASFONDO.map((c) => (
            <label className="campo" key={c.kind}>
              <span>{c.label} — <i>{c.ayuda}</i></span>
              <input
                value={trasfondo[c.kind] ?? ''}
                onChange={(e) => setTrasfondo({ ...trasfondo, [c.kind]: e.target.value })}
              />
            </label>
          ))}

          <div className="campo-titulo">¿Cuál es lo que lo sostiene?</div>
          <div className="eleccion">
            {CLASES_TRASFONDO.filter((c) => (trasfondo[c.kind] ?? '').trim()).map((c) => (
              <button
                key={c.kind} className={`chip ${conexion === c.kind ? 'chip-on' : ''}`}
                onClick={() => setConexion(c.kind)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="creacion-nota">
            Apoyarse en ello da ventaja para recuperar Cordura. Si el intento falla, deja de sostenerlo.
          </div>

          {problemas.length > 0 && (
            <div className="creacion-problemas">
              <div className="creacion-problemas-titulo">El reglamento no acepta esta ficha:</div>
              {problemas.map((p, i) => <div key={i}>· {p.mensaje}</div>)}
            </div>
          )}

          <div className="creacion-pie">
            <button className="ghost" onClick={() => setPaso('puntos')}>Atrás</button>
            <button className="primary" onClick={crear} disabled={ocupado}>
              {ocupado ? 'Empezando…' : 'Empezar la aventura'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaSkill({
  skill, ocup, pers, soloPersonal, restanteOcup, restantePers, onOcup, onPers, tope,
}: {
  skill: string; ocup: number; pers: number; soloPersonal?: boolean;
  restanteOcup: number; restantePers: number;
  onOcup: (d: number) => void; onPers: (d: number) => void;
  /** Tope propio de esta habilidad. Crédito tiene el de la ocupación. */
  tope: number;
}) {
  const def = SKILL_BY_ID[skill];
  const total = (def?.defaultBase ?? 0) + ocup + pers;
  const pasado = total > tope;
  // La interfaz no deja construir una ficha ilegal. El validador la rechazaría
  // igual —esa es la garantía— pero enterarse recién al final es maltrato.
  const margen = tope - total;
  return (
    <div className={`skill-fila ${pasado ? 'skill-pasado' : ''}`}>
      <span className="skill-nombre" title={def?.useWhen}>{def?.label ?? skill}</span>
      <span className="skill-total">{total}%</span>
      {!soloPersonal && (
        <span className="skill-grupo">
          <button onClick={() => onOcup(-5)} disabled={ocup === 0}>−</button>
          <b>{ocup}</b>
          <button onClick={() => onOcup(5)} disabled={restanteOcup < 5 || margen < 5}>+</button>
        </span>
      )}
      <span className="skill-grupo skill-personal">
        <button onClick={() => onPers(-5)} disabled={pers === 0}>−</button>
        <b>{pers}</b>
        <button onClick={() => onPers(5)} disabled={restantePers < 5 || margen < 5}>+</button>
      </span>
    </div>
  );
}

function Reparto({
  titulo, claves, total, valores, set, etiqueta,
}: {
  titulo: string; claves: string[]; total: number;
  valores: Record<string, number>; set: (v: Record<string, number>) => void;
  etiqueta: (k: string) => string;
}) {
  const puesto = Object.values(valores).reduce((a, b) => a + b, 0);
  return (
    <div className="reparto">
      <div className="reparto-titulo">
        {titulo} — quedan <b>{total - puesto}</b>
      </div>
      <div className="reparto-filas">
        {claves.map((k) => (
          <span className="skill-grupo" key={k}>
            <span className="reparto-label">{etiqueta(k)}</span>
            <button onClick={() => set({ ...valores, [k]: Math.max(0, (valores[k] ?? 0) - 1) })}
              disabled={(valores[k] ?? 0) === 0}>−</button>
            <b>{valores[k] ?? 0}</b>
            <button onClick={() => set({ ...valores, [k]: (valores[k] ?? 0) + 1 })}
              disabled={puesto >= total}>+</button>
          </span>
        ))}
      </div>
    </div>
  );
}
