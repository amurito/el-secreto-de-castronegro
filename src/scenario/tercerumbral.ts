/**
 * LA FIRMA AJENA — tercera aventura. Agosto de 1925. ~1 hora.
 *
 * El contenido vive en `tercer-umbral.contenido.json` y la lógica de sus
 * escenas en `tercerumbral.logica.ts`. Este archivo sólo los junta.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Conexión con el universo: canon v0.7 §11 reserva el Tercer Umbral para la
 * IDENTIDAD, y aclara que los nombres geográficos de los otros Umbrales no
 * son canon definitivo. Esta aventura usa ese margen: Los Cardales no se
 * declara EL Tercer Umbral, se comporta como uno.
 *
 * DÓNDE PASA Y CUÁNDO: unos meses después de La Legua Perdida, mismo lustro.
 * Historia paralela a las dos anteriores —ningún personaje en común salvo el
 * investigador, si encadenás campaña— y ninguna explica a la otra.
 *
 * QUÉ HACE DISTINTO A ESTA AVENTURA: no hay un fenómeno físico que medir ni
 * un lugar que se comporte mal. Hay un hombre, y la pregunta de si es quien
 * dice ser no tiene una respuesta que un instrumento pueda dar. Por eso la
 * mecánica central no es una tirada contra el mundo: es sostenerle a alguien
 * una pregunta hasta el final (`fin-preguntar`), con Poder en juego en vez de
 * cualquier otra característica.
 *
 * Usa las dos capas que se sumaron esta temporada: una escena puede dejar
 * algo que SÓLO nota quien juega, no el investigador (`jugadorNota` en
 * `a-anos`, comparando la carta de 1917 con el relato de Alejo) — el
 * jugador arma la sospecha antes de que el personaje pueda admitirla. Y las
 * fobias/manías mecánicas no son sólo ficha: la que deja `fin-preguntar`
 * («Sospecha de las caras conocidas») penaliza Persuasión y bonifica
 * Psicología mientras dure, así que un final elegido en esta aventura puede
 * cambiar cómo se juega la siguiente.
 *
 * NO confirma, por diseño:
 *   · que Los Cardales SEA el Tercer Umbral
 *   · qué es, en verdad, el hombre que dice llamarse Alejo
 *   · nada del Primer Rostro, el anillo, Puddock ni el Archivista
 *
 * La aventura aplica la regla de oro (§15): cuanto más cerca de la verdad,
 * más información y menos certeza. Ni siquiera el desenlace más completo
 * (`fin-preguntar`, tirada crítica) da una respuesta que se pueda escribir
 * en un papel.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { ContenidoAventura } from './contenido.schema.ts';
import { cargarAventura } from './cargarAventura.ts';
import { ELENA, TOMAS } from './pregens.ts';
import { TERCER_UMBRAL_LOGICA } from './tercerumbral.logica.ts';
import contenido from './tercer-umbral.contenido.json' with { type: 'json' };

export const TERCER_UMBRAL: Scenario = cargarAventura(
  contenido as unknown as ContenidoAventura,
  TERCER_UMBRAL_LOGICA,
  [ELENA, TOMAS],
);
