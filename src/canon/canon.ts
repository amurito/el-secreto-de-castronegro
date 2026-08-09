/**
 * CANON INDEXADO — Biblia de Canon v0.7 + reglas de dirección v0.8.
 *
 * Este archivo es el prefijo estable del contexto del Keeper. NO CAMBIA NUNCA
 * durante una partida: cualquier modificación invalida el caché de prompt y
 * multiplica el costo por seis (Análisis Técnico v1.1 §4.3).
 *
 * Cada entrada lleva los dos ejes aprobados: truth × disclosure.
 * Lo marcado SEALED no se serializa jamás hacia el modelo.
 */

import type { CanonRef } from '../shared/types.ts';

export interface CanonEntry {
  id: string;
  statement: string;
  canon: CanonRef;
}

const U = (citation: string): CanonRef => ({
  truth: 'CANON_UNIVERSE', disclosure: 'KEEPER_SECRET', source: 'v0.7', citation,
});
const SEALED = (citation: string): CanonRef => ({
  truth: 'CANON_UNIVERSE', disclosure: 'SEALED', source: 'v0.7', citation,
});

/** Canon que el Keeper SÍ recibe: lo necesita para arbitrar. */
export const CANON_ENTRIES: CanonEntry[] = [
  {
    id: 'convergencia',
    statement:
      'Antes de la historia humana, en el lugar que después será Agua Blanca, ocurre la Primera Convergencia: ' +
      'dos estados o regiones del espacio-tiempo se superponen de un modo que la percepción humana no puede ' +
      'describir correctamente. Cuando la superposición termina queda una condición persistente: el Umbral. ' +
      'NO está establecido que Yog-Sothoth la haya causado deliberadamente.',
    canon: U('v0.7 §1.1'),
  },
  {
    id: 'umbral',
    statement:
      'El Umbral es una condición de permeabilidad entre puntos del espacio-tiempo y, potencialmente, entre ' +
      'estados de realidad. NO es una puerta física convencional ni un lugar que pueda encontrarse excavando.',
    canon: U('v0.7 §1.2'),
  },
  {
    id: 'agua_blanca',
    statement:
      'Agua Blanca es el primer punto CONOCIDO de nuestra historia donde esta condición puede manifestarse de ' +
      'forma natural y observable. El agua no tiene magia propia: funciona como superficie de manifestación ' +
      'porque refleja. En ciertas condiciones puede reflejar otros momentos, lugares o estados de realidad.',
    canon: U('v0.7 §1.3'),
  },
  {
    id: 'yog_sothoth',
    statement:
      'Yog-Sothoth se relaciona con la totalidad del espacio-tiempo, las puertas y los límites entre realidades. ' +
      'NO es el propietario del Umbral ni un monstruo que espera del otro lado. La relación exacta es ' +
      'deliberadamente ambigua y la campaña NO debe fijar cuál formulación es literalmente cierta. ' +
      'Su presencia debe AMPLIAR el misterio, nunca cerrarlo.',
    canon: U('v0.7 §1.4'),
  },
  {
    id: 'reciprocidad',
    statement:
      'REGLA NARRATIVA FUNDAMENTAL: la observación a través del Umbral puede ser recíproca. Quien mira ' +
      'puede ser mirado desde el otro momento.',
    canon: U('v0.7 §2'),
  },
  {
    id: 'memoria_futura',
    statement:
      'El Umbral puede producir recuerdos de acontecimientos que todavía no ocurrieron desde el punto de vista ' +
      'del receptor. Pueden ser incompletos, desordenados o mal interpretados. NO hay regla canónica que ' +
      'garantice que todo futuro observado sea inevitable.',
    canon: U('v0.7 §4'),
  },
  {
    id: 'bernardo',
    statement:
      'Bernardo Díaz funda Castronegro en 1680. Su error central no es descubrir el Umbral sino interpretarlo: ' +
      'cree haber encontrado una fuente de poder y a Yog-Sothoth como su llave. Confunde observar con controlar, ' +
      'una frontera con una puerta, una visión con una promesa. Sus textos son útiles y peligrosos a la vez: ' +
      'dicen verdades reales mezcladas con conclusiones falsas.',
    canon: U('v0.7 §7 / v0.8 §8'),
  },
  {
    id: 'obelisco',
    statement:
      'El obelisco desciende de una estructura mucho más antigua. Sus constructores originales NO intentaban ' +
      'invocar a Yog-Sothoth: marcaban el límite de una zona donde el agua y el cielo se comportaban de forma ' +
      'anómala. Bernardo lo reutilizó e interpretó mal.',
    canon: U('v0.7 §8'),
  },
  {
    id: 'anillo_limites',
    statement:
      'El anillo NO controla el tiempo, NO permite elegir una fecha, NO muestra el futuro completo y NO ' +
      'garantiza que una visión sea el único futuro posible. Las visiones pueden estar fuera de orden. ' +
      'Retirarlo puede matar al portador.',
    canon: U('v0.7 §5.3'),
  },
  {
    id: 'escalera',
    statement:
      'ESCALERA DE REVELACIÓN — I Anomalía: algo normal presenta una contradicción pequeña. II Imposibilidad: ' +
      'dos evidencias no pueden ser ciertas a la vez. III Reciprocidad: el fenómeno responde a la observación. ' +
      'IV Contaminación: aparecen recuerdos u objetos de otro momento. V Umbral: no es una anomalía aislada ' +
      'sino una propiedad de la realidad. VI Yog-Sothoth: el lenguaje de los Mitos ofrece un marco posible, ' +
      'no una explicación completa.',
    canon: { truth: 'CANON_SETTING', disclosure: 'KEEPER_SECRET', source: 'v0.8', citation: 'v0.8 §3' },
  },
  {
    id: 'agua_recurrente',
    statement:
      'ELEMENTOS RECURRENTES del agua anómala: superficie completamente inmóvil sin causa meteorológica; ' +
      'reflejos que tardan una fracción de segundo en imitar al observador; un reflejo que hace algo distinto; ' +
      'un objeto reflejado que no existe en el presente; una persona que sólo aparece en el reflejo; ' +
      'la superficie mostrando otro estado del mismo lugar; el observador descubriendo que del otro lado ' +
      'también lo están mirando.',
    canon: { truth: 'CANON_SETTING', disclosure: 'KEEPER_SECRET', source: 'v0.8', citation: 'v0.8 §5' },
  },
  {
    id: 'tono',
    statement:
      'REGLA DE TONO: primero extrañeza, después peligro, finalmente horror cósmico. No expliques una anomalía ' +
      'antes de que el jugador haya formulado una hipótesis. Preferí contradicciones pequeñas y acumulativas a ' +
      'grandes exposiciones. Los documentos antiguos pueden ser verdaderos y estar equivocados al mismo tiempo. ' +
      'Comprender algo tiene que tener un precio.',
    canon: { truth: 'CANON_SETTING', disclosure: 'KEEPER_SECRET', source: 'v0.8', citation: 'v0.8 §19' },
  },
  {
    id: 'regla_de_oro',
    statement:
      'REGLA DE ORO: cuanto más cerca estén los investigadores de la verdad, MÁS información deben obtener y ' +
      'MENOS seguridad deben tener sobre lo que esa información significa.',
    canon: U('v0.7 §15'),
  },
];

/**
 * SELLADO — nunca entra al contexto del modelo en esta etapa de la campaña.
 * Está acá documentado para que el equipo humano lo tenga presente, y para que
 * el checker pueda detectar si el Keeper se acercó demasiado por su cuenta.
 * Lo que no está en la ventana de contexto no puede filtrarse.
 */
export const SEALED_CANON: CanonEntry[] = [
  {
    id: 'primer_rostro_identidad',
    statement: 'La identidad del Primer Rostro permanece sin resolver. No se revela hasta etapa final de campaña.',
    canon: SEALED('v0.7 §3 / v0.8 §6'),
  },
  {
    id: 'puddock_naturaleza',
    statement: 'Qué es realmente Puddock. Sin canonizar.',
    canon: SEALED('v0.7 §9'),
  },
  {
    id: 'archivista_naturaleza',
    statement: 'Qué es realmente el Archivista. Sin canonizar.',
    canon: SEALED('v0.7 §10'),
  },
  {
    id: 'creadores_anillo',
    statement: 'Quiénes construyeron el primer anillo, y si existe un primer anillo. Sin canonizar.',
    canon: SEALED('v0.7 §5.1 / §14'),
  },
];

/**
 * INVARIANTES DURAS — v0.7 §13 y v0.9 §23.
 * El checker de continuidad corre sobre cada propuesta del Keeper. Si una
 * afirmación viola alguna de estas, se rechaza.
 */
export const HARD_INVARIANTS: string[] = [
  'Bernardo NO creó el anillo.',
  'Yog-Sothoth NO entrega personalmente el anillo a los humanos.',
  'Agua Blanca NO fue creada por Bernardo.',
  'El obelisco NO fue construido originalmente para invocar a Yog-Sothoth.',
  'NO existe una única tribu histórica que haya custodiado Agua Blanca durante milenios.',
  'El Umbral NO es una puerta física convencional.',
  'Yog-Sothoth NO es un jefe final de combate.',
  'El anillo NO permite controlar libremente el tiempo.',
  'NO se confirma que las visiones sean siempre futuros inevitables.',
  'NO se confirma la identidad del Primer Rostro.',
  'NO se usa a Yog-Sothoth como explicación universal de cualquier fenómeno.',
  'NO se revela al Primer Rostro antes de la etapa prevista.',
  'NO se borran consecuencias de decisiones anteriores.',
  'NO se crea retroactivamente una pista que el jugador nunca recibió.',
  'NO se alteran tiradas ya resueltas.',
];

/** Los siete Umbrales. Los nombres geográficos NO son canon definitivo. */
export const SEVEN_THRESHOLDS = [
  'Agua Blanca / Castronegro — tiempo, observación y memoria',
  'Segundo Umbral — espacio',
  'Tercer Umbral — identidad',
  'Cuarto Umbral — muerte',
  'Quinto Umbral — sueño',
  'Sexto Umbral — causalidad',
  'Séptimo Umbral — realidad',
];

/** Texto del canon para el prefijo cacheado del Keeper. */
export function canonBlock(): string {
  const entries = CANON_ENTRIES.map((e) => `[${e.canon.citation}] ${e.statement}`).join('\n\n');
  const invariants = HARD_INVARIANTS.map((i) => `· ${i}`).join('\n');
  return (
    `## CANON DEL UNIVERSO (Biblia v0.7 + Operativa v0.8)\n\n${entries}\n\n` +
    `## LOS SIETE UMBRALES\n${SEVEN_THRESHOLDS.map((t) => `· ${t}`).join('\n')}\n\n` +
    `## PROHIBICIONES ABSOLUTAS\nEstas NO son sugerencias. Violarlas rompe el canon del proyecto:\n${invariants}`
  );
}
