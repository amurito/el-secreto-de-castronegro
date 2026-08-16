/**
 * LO QUE SE LE PUEDE PREGUNTAR A ROSA — Agua Quieta.
 *
 * Esto era un `switch` de doscientas líneas dentro del resolvedor del motor.
 * Ahora es una lista de datos, y el motor no sabe que Rosa existe.
 *
 * Cada tema declara su propia resistencia. La regla que ordena cuál pide
 * tirada y cuál no: **se tira cuando el personaje tiene un motivo para no
 * contestar.** El aljibe lo cuenta cualquiera; lo que vio ella esa noche no lo
 * cuenta nadie sin que se lo ganen.
 */

import type { GameState } from '../shared/types.ts';
import type { Conversaciones } from './conversacion.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const propiedad = (s: GameState, item: string, prop: string) =>
  Boolean(s.items[item]?.discoveredProperties.some((d) => d.propertyId === prop));
const dicho = (s: GameState, frag: string) =>
  s.narrative.some((n) => n.kind === 'keeper' && n.text.includes(frag));

export const ROSA_TEMAS: Conversaciones = [
  // ── Sin resistencia: contesta porque no tiene motivo para callarse ────────
  {
    id: 'ignacio', npc: 'npc-rosa', orden: 10,
    etiqueta: 'Preguntarle qué pasó esa noche',
    intencion: 'Le pregunto a Rosa qué pasó esa noche con Ignacio',
    claves: ['esa noche', 'ultima vez', 'que paso', 'el marido', 'desaparic'],
    agotado: (s) => pista(s, 'salió al patio a fumar'),
    cede: {
      actitud: 3,
      texto: [
        '—Cenó. Guiso. Comió poco, que ya venía comiendo poco. —Rosa habla mirando la mesa—. Salió al patio a fumar, ' +
        'como todas las noches. Yo levanté los platos, me acosté. A la mañana no estaba.\n\n' +
        '—El reloj apareció ahí, en el brocal. Seco. Y esa noche llovió.\n\n' +
        'Se queda un momento. Después dice, más rápido, como quien cierra un tema:\n\n—Debía plata en el pueblo. Eso es lo que pasó.',
      ],
      pista: {
        description: 'Ignacio salió al patio a fumar la noche del 15 y no volvió. El reloj apareció seco en el brocal a la mañana siguiente, después de una noche de lluvia.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
  },
  {
    id: 'aljibe', npc: 'npc-rosa', orden: 20,
    etiqueta: 'Preguntarle por el aljibe',
    intencion: 'Le pregunto a Rosa por el aljibe',
    claves: ['aljibe', 'pozo', 'el agua'],
    agotado: (s) => dicho(s, 'El agua está buena'),
    cede: {
      actitud: 2,
      texto: [
        'Rosa vuelve a doblar el repasador.\n\n—El agua está buena —dice—. Nunca se secó, ni en el veinte, que se secó todo. ' +
        '—Una pausa—. Él la miraba mucho. Yo le decía que era el cansancio.\n\n' +
        'Se levanta a mover una olla que no necesita que la muevan.\n\n—Yo de noche al patio no salgo. Por si le interesa.',
      ],
    },
  },
  {
    id: '1897', npc: 'npc-rosa', orden: 40,
    etiqueta: 'Preguntarle por la fotografía vieja',
    intencion: 'Le pregunto a Rosa por la fotografía de 1897',
    claves: ['1897', 'foto vieja', 'fotografia vieja', 'los patrones'],
    disponible: (s) => dicho(s, 'Nueve personas delante del aljibe'),
    agotado: (s) => dicho(s, 'los patrones viejos'),
    cede: {
      actitud: 2,
      texto: [
        '—Esa es de cuando hicieron el aljibe. Los patrones viejos, los Vera de antes. —Se acerca a mirarla ella ' +
        'también, y es la primera vez que se acerca a algo por su cuenta—.\n\n' +
        '—Mi madre trabajó para ellos. Decía que a la señora se le murió el marido en el pozo y que después se le ' +
        'fue la cabeza.\n\nSe da vuelta y vuelve a la olla.\n\n—Cosas de antes.',
      ],
      pregunta: '¿Qué le pasó exactamente a la familia Vera en 1897?',
    },
  },

  // ── Con resistencia: hay un motivo para no contestar ──────────────────────
  {
    id: 'soga', npc: 'npc-rosa', orden: 15,
    etiqueta: 'Preguntarle por la soga cortada',
    intencion: 'Le pregunto a Rosa por la soga de la roldana',
    claves: ['soga', 'roldana', 'cuerda', 'polea'],
    disponible: (s) => pista(s, 'cortada a cuchillo'),
    agotado: (s) => pista(s, 'tres días DESPUÉS'),
    prueba: {
      skill: 'psicologia', difficulty: 'regular',
      razon: 'leerle la cara mientras explica por qué sacó la soga',
    },
    cede: {
      actitud: 5,
      texto: [
        'Rosa deja de doblar el repasador.\n\n—La saqué yo —dice—. Tres días después. —Y como no decís nada, ' +
        'agrega—: Antes no. Después.\n\nSe queda callada. Es evidente que hay una segunda parte y que todavía no ' +
        'se la ganaste.',
      ],
      pista: {
        description: 'Rosa retiró la soga de la roldana tres días DESPUÉS de la desaparición de Ignacio, no antes.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
    esquiva: {
      texto: [
        '—Estaba podrida —dice—. Se cortó sola.\n\nY vuelve al repasador. Una soga podrida no se corta a cuchillo, ' +
        'y las dos lo saben, pero ella lo dijo primero y ahora hay que desarmarlo.',
      ],
    },
  },
  {
    id: 'reloj', npc: 'npc-rosa', orden: 25,
    etiqueta: 'Preguntarle por el reloj que apareció seco',
    intencion: 'Le pregunto a Rosa por el reloj',
    claves: ['reloj', 'cuatro y veinte'],
    disponible: (s) => pista(s, 'cuatro y veinte') || propiedad(s, 'it-reloj', 'p-reloj-atras'),
    agotado: (s) => pista(s, 'cerrada por dentro'),
    prueba: {
      skill: 'persuasion', difficulty: 'regular',
      razon: 'convencerla de volver sobre la mañana que encontró el reloj',
    },
    cede: {
      actitud: 3,
      texto: [
        '—Estaba seco —dice—. Eso es lo que no me sale de la cabeza. Llovió toda la noche y el reloj estaba seco ' +
        'arriba del brocal, como si alguien lo hubiera puesto ahí a la mañana.\n\n' +
        '—Y la casa estaba cerrada por dentro. Yo la cerré.',
      ],
      pista: {
        description: 'La casa estaba cerrada por dentro esa noche, y el reloj apareció seco sobre el brocal tras una noche de lluvia.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
    esquiva: {
      texto: [
        '—Lo encontré y lo levanté. ¿Qué quiere que le diga? —Se encoge de hombros—. Un reloj arriba de un brocal.\n\n' +
        'Está saltando la parte que le importa a usted, y lo hace bien, sin ponerse nerviosa.',
      ],
    },
  },
  {
    id: 'deuda', npc: 'npc-rosa', orden: 30,
    etiqueta: 'Preguntarle por la plata que se debía',
    intencion: 'Le pregunto a Rosa por la plata que se debía',
    claves: ['plata', 'deuda', 'debia', 'dinero'],
    disponible: (s) => pista(s, 'salió al patio a fumar'),
    agotado: (s) => dicho(s, 'Cuarenta pesos'),
    prueba: {
      skill: 'psicologia', difficulty: 'regular',
      razon: 'medir si la deuda es su explicación o su excusa',
    },
    cede: {
      actitud: 1,
      texto: [
        '—Debía en el almacén, como todos. —Rosa lo dice rápido—. Cuarenta pesos, capaz sesenta.\n\n' +
        'Sesenta pesos no es una cifra por la que un hombre abandone un campo arrendado, un sombrero y un reloj. ' +
        'Ella lo sabe también, y por eso lo dijo rápido.',
      ],
    },
    esquiva: {
      texto: [
        '—Debía plata. Eso es lo que pasó. —Y lo dice como quien apoya una piedra sobre un papel para que no se ' +
        'vuele—. Los hombres se van por eso todo el tiempo, {trato}.',
      ],
    },
  },
  {
    id: 'hermano', npc: 'npc-rosa', orden: 35,
    etiqueta: 'Preguntarle por el hermano',
    intencion: 'Le pregunto a Rosa por el hermano',
    claves: ['hermano', 'pariente'],
    disponible: (s) => dicho(s, 'Cuarenta pesos'),
    agotado: (s) => pista(s, 'vive en Rosario'),
    prueba: {
      skill: 'persuasion', difficulty: 'regular', actitudMinima: 30,
      razon: 'meterse en un asunto de familia que no le corresponde',
    },
    cede: {
      actitud: 2,
      texto: [
        '—Se pelearon por el campo hace años. No se hablaban. —Se encoge de hombros—. Ya sé lo que está pensando, ' +
        'y no. El hermano está en Rosario y hace ocho años que no viene.\n\n' +
        '—No todo lo raro de esta casa es de la familia, {trato}.',
      ],
      pista: {
        description: 'El hermano de Ignacio vive en Rosario y no visita el campo hace ocho años. La disputa familiar no tiene relación con la desaparición.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
    cerrado: {
      actitud: -3,
      texto: [
        '—Del hermano no hablo —dice, y es la primera vez que le sale cortante—. Eso es de familia y usted vino ' +
        'por otra cosa.',
      ],
    },
  },

  // ── El secreto ───────────────────────────────────────────────────────────
  {
    id: 'ella', npc: 'npc-rosa', orden: 50,
    etiqueta: 'Preguntarle qué vio ella',
    intencion: 'Le pregunto a Rosa qué vio ella',
    claves: ['que vio ella', 'lo que vio', 'vio usted', 'tiene miedo', 'por que no sale'],
    disponible: (s) => pista(s, 'salió al patio a fumar'),
    agotado: (s) => pista(s, 'dos luces'),
    prueba: {
      skill: 'psicologia', difficulty: 'hard', actitudMinima: 12,
      razon: 'que deje de contar lo de Ignacio y cuente lo suyo',
    },
    cede: {
      actitud: 6,
      texto: [
        'Se queda callada un momento más largo de lo cómodo.\n\n' +
        '—La noche siguiente vine con el farol. A llamarlo. —Se mira las manos—. El farol tarda en aparecer en el ' +
        'agua, ¿sabe? Uno se asoma y la luz llega después. Y cuando llegó… —se detiene—. Había dos luces. Yo tenía ' +
        'una sola.\n\n—Por eso saqué la soga.',
      ],
      pista: {
        description: 'Rosa vio dos luces reflejadas en el aljibe cuando bajó con un solo farol, la noche siguiente a la desaparición.',
        kind: 'testimonial', reliability: 'reliable',
      },
      exposicion: 3,
      revelaSecreto: 's-rosa-vio',
    },
    esquiva: {
      actitud: 4,
      texto: [
        'Rosa se queda quieta con el repasador en las manos.\n\n—Yo no vi nada —dice, y es la primera cosa que ' +
        'dice que suena ensayada—. Yo estaba durmiendo.\n\nDespués, más bajo, casi para ella:\n\n' +
        '—Y desde entonces duermo con la luz prendida, que es un gasto.',
      ],
    },
    cerrado: {
      texto: [
        '—¿Yo? —Rosa se ríe sin ganas—. Yo cocino y limpio, {trato}. Pregúntele a alguien que sepa algo.\n\n' +
        'Todavía no confía en usted lo suficiente como para que esa pregunta signifique algo.',
      ],
    },
  },
];
