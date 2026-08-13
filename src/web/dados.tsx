/**
 * LOS DADOS QUE SE VEN — animación opcional de la tirada porcentual.
 *
 * NADA DE ACÁ TOCA EL RESULTADO. Cuando este componente se dibuja, la tirada
 * ya está ejecutada, firmada y guardada en el registro inmutable: el motor la
 * resolvió antes de que existiera el primer cuadro. Esto muestra con retraso
 * lo que ya pasó.
 *
 * Las caras intermedias —las que giran— salen de Math.random() y son
 * puramente cosméticas. Es la única aparición de Math.random en todo el
 * proyecto y está acá a propósito: si alguien alguna vez la confunde con la
 * fuente del resultado, el HMAC de la tirada lo desmiente en la pestaña de
 * auditoría. El número final siempre viene de `roll.dice`.
 *
 * POR QUÉ DOS DADOS Y NO UNO: CoC 7e tira percentiles con un d10 de decenas
 * (00, 10 … 90) y un d10 de unidades (0 … 9). Mostrar «92» pierde el gesto
 * físico de la mesa. Mostrar 90 + 2 lo devuelve.
 *
 * Y POR QUÉ IMPORTA CON BONIFICACIÓN: un dado de bonificación no es un
 * modificador numérico, es OTRO dado de decenas del que se toma el mejor.
 * Con la animación eso se ve —tres dados en la mesa, dos se apagan— en lugar
 * de tener que leerlo en una línea de texto que nadie lee.
 */

import React, { useEffect, useRef, useState } from 'react';
import { resolveD100, tensDiceNeeded } from '../rules/dice.ts';

/** Cada cuánto cambia de cara mientras gira. Más rápido se lee como parpadeo. */
const MS_POR_CARA = 55;
/** Cuándo se planta el dado de decenas, y cuándo el de unidades. */
const MS_DECENAS = 480;
const MS_UNIDADES = 700;
/**
 * Cuándo puede aparecer el número grande y el grado: si salen antes, el
 * jugador ya sabe el final mientras los dados todavía giran.
 */
const MS_HASTA_EL_NUMERO = MS_UNIDADES;

/**
 * ¿Ya se puede mostrar el resultado?
 *
 * Esto es un temporizador de JS y NO una animación de CSS, por un motivo que
 * costó una prueba descubrir: una animación con `fill: both` que empieza en
 * opacidad 0 se queda en el primer fotograma si nunca llega a correr —pestaña
 * en segundo plano, ventana que no compone, una extensión que las desactiva—
 * y entonces el número del dado no aparece NUNCA. El jugador ve dos dados y
 * ningún resultado.
 *
 * Con un temporizador, el peor caso es el contrario: el número aparece de
 * inmediato y se pierde el efecto. Una animación puede fallar; el resultado
 * de una tirada, no.
 */
export function useRevelacionTardia(activa: boolean, clave: string): boolean {
  const [revelado, setRevelado] = useState(!activa);
  useEffect(() => {
    if (!activa) { setRevelado(true); return; }
    setRevelado(false);
    const t = window.setTimeout(() => setRevelado(true), MS_HASTA_EL_NUMERO);
    return () => clearTimeout(t);
  }, [activa, clave]);
  return revelado;
}
/** Y cuándo se apagan los descartados, si hubo bonificación o penalización. */
const MS_DESCARTE = 980;

type Fase = 'girando' | 'decenas' | 'unidades' | 'listo';

const cara = () => Math.floor(Math.random() * 10);

/**
 * La preferencia es global y no por campaña: es del jugador, no de la partida.
 * Arranca apagada si el sistema pide menos movimiento — quien configuró eso ya
 * dijo lo que quería y no hace falta volvérselo a preguntar. Si además lo
 * enciende a mano, mandará su elección explícita.
 */
const CLAVE = 'castronegro:animar-dados';

export function prefiereMenosMovimiento(): boolean {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function leerPreferenciaDados(): boolean {
  try {
    const v = localStorage.getItem(CLAVE);
    if (v === null) return !prefiereMenosMovimiento();
    return v === 'si';
  } catch {
    return !prefiereMenosMovimiento();
  }
}

export function guardarPreferenciaDados(activa: boolean): void {
  try { localStorage.setItem(CLAVE, activa ? 'si' : 'no'); } catch { /* sin storage, se juega igual */ }
}

/**
 * Los dados de una tirada concreta.
 *
 * `roll.dice` es [unidades, decenas...] — ese orden lo fija el motor y está
 * documentado en shared/types.ts. Si alguna vez se invierte, acá se vería al
 * instante: el dado de decenas mostraría el número equivocado.
 */
export function DadosPercentiles({ roll }: { roll: any }) {
  const unidadReal: number = roll.dice[0] ?? 0;
  const decenasReales: number[] = roll.dice.slice(1);

  const { mode } = tensDiceNeeded(roll.modifiers ?? []);
  const { chosen } = resolveD100(unidadReal, decenasReales, mode);

  const [fase, setFase] = useState<Fase>('girando');
  const [giroDecenas, setGiroDecenas] = useState<number[]>(() => decenasReales.map(cara));
  const [giroUnidad, setGiroUnidad] = useState(cara);
  const tic = useRef<number | null>(null);
  const plazos = useRef<number[]>([]);

  // Se reinicia con cada tirada nueva. La clave es roll.id: dos tiradas
  // distintas con el mismo resultado tienen que animarse las dos.
  useEffect(() => {
    setFase('girando');
    setGiroDecenas(decenasReales.map(cara));
    setGiroUnidad(cara());

    tic.current = window.setInterval(() => {
      setGiroDecenas((d) => d.map(cara));
      setGiroUnidad(cara());
    }, MS_POR_CARA);

    plazos.current = [
      window.setTimeout(() => setFase('decenas'), MS_DECENAS),
      window.setTimeout(() => setFase('unidades'), MS_UNIDADES),
      // Nada gira ya: parar el intervalo evita repintar la pantalla para siempre.
      window.setTimeout(() => {
        setFase('listo');
        if (tic.current !== null) { clearInterval(tic.current); tic.current = null; }
      }, MS_DESCARTE),
    ];

    return () => {
      if (tic.current !== null) { clearInterval(tic.current); tic.current = null; }
      plazos.current.forEach(clearTimeout);
      plazos.current = [];
    };
  }, [roll.id]);

  const decenasQuietas = fase !== 'girando';
  const unidadQuieta = fase === 'unidades' || fase === 'listo';
  // Los descartados sólo se apagan si de verdad hubo algo que descartar.
  const señalarElegido = fase === 'listo' && decenasReales.length > 1;

  const decenasEnPantalla = decenasQuietas ? decenasReales : giroDecenas;
  const unidadEnPantalla = unidadQuieta ? unidadReal : giroUnidad;

  return (
    <div className="dados" aria-hidden="true">
      <div className="dados-grupo">
        {decenasEnPantalla.map((d, i) => (
          <div
            key={i}
            className={
              'dado dado-decenas'
              + (decenasQuietas ? ' dado-quieto' : ' dado-girando')
              + (señalarElegido ? (i === chosen ? ' dado-elegido' : ' dado-descartado') : '')
            }
          >
            {d === 0 ? '00' : d * 10}
          </div>
        ))}
      </div>
      <div className="dados-grupo">
        <div className={`dado dado-unidades ${unidadQuieta ? 'dado-quieto' : 'dado-girando'}`}>
          {unidadEnPantalla}
        </div>
      </div>
      {señalarElegido && (
        <div className="dados-nota">
          {mode === 'bonus' ? 'bonificación: el más bajo' : 'penalización: el más alto'}
        </div>
      )}
    </div>
  );
}
