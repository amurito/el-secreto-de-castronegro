/**
 * LO QUE BERNARDO SABÍA — lógica de escenas.
 *
 * Ver `loquebernardosabia.ts` para de dónde sale la aventura entera.
 */

import type { LogicaDeEscenas } from './cargarAventura.ts';

export const LO_QUE_BERNARDO_SABIA_LOGICA: LogicaDeEscenas = [
  {
    // Rama del anillo: el Ahijado enseña. Es la tercera vía del manual para
    // aprender un hechizo —de una entidad de los Mitos, p. 175— y acá es
    // literal: el Ahijado es esa entidad, ya vinculada al investigador desde
    // `fin-heredar` de El Vigésimo.
    id: 'revelacion-ahijado',
    resolver: () => ({
      texto: [
        'Volvés a la Casa de Díaz tres semanas después, y no hace falta golpear: el Ahijado ya sabe que llegaste antes de que llegues.',
        'Se te enrosca en el brazo, como siempre, y por primera vez hace algo que no había hecho hasta ahora: te muestra una forma. No con palabras —no tiene, o no las usa con vos todavía— sino con el peso exacto que hay que ponerle a mirar algo para que ese algo responda.',
        'Aprender de él no es gratis: cada vez que te enseña algo, algo tuyo se acomoda para hacerle lugar, y lo que se acomoda no vuelve a su forma anterior.',
        'No hay más que buscar en este laboratorio, no por ahora. El primer hechizo ya es tuyo.',
      ],
      aprenderHechizo: { id: 'adivinar-la-forma', source: 'el Ahijado, en el laboratorio' },
      cordura: { amount: 3, cause: 'dejar que el Ahijado le enseñe algo que no tiene palabras' },
      consecuencia: {
        description: 'El investigador volvió a la Casa de Díaz y dejó que el Ahijado le enseñara a lanzar el primero de sus hechizos.',
        scope: 'world',
        permanent: true,
        worldReminder: 'El Ahijado enseña. Nadie más sabe todavía qué más sabe enseñar.',
      },
    }),
  },
  {
    // Rama del libro: aprender de un tomo de Mitos, p. 174 — lectura +
    // tiempo, sin tirada (la tirada de INT difícil es opcional en el
    // manual; se deja afuera para no exigir un segundo dado donde el
    // resultado no está en duda, mismo criterio que `prueba-tiradas.ts`
    // ya protege para el resto del contenido: lo que no puede fallar de
    // forma interesante no tira). El costo real es la Cordura y las
    // semanas que se compensan con `advance_time` en vez de jugarse turno
    // a turno.
    id: 'revelacion-libro',
    resolver: () => ({
      texto: [
        'Volvés al laboratorio tres semanas después. El horno sigue frío —lo apagaste vos mismo, esa noche— y nadie más tocó nada: no hay nadie más que sepa que este cuarto existe.',
        'En un cajón que no habías mirado hay un libro sin título en el lomo, la letra de Bernardo apretada de margen a margen. No es un diario: es una lista de instrucciones, escritas para alguien que iba a necesitarlas después de él.',
        'Leerlo entero te lleva más de lo que pensabas —semanas, no una tarde— y cuando termina, sabés dos cosas que no sabías antes: una es mecánica, y aprendés a usarla. La otra no tiene nombre todavía, y no hace falta que lo tenga para que pese.',
        'Lo que más te queda, después, no es lo que el libro explica: es lo que da por sabido. Cita dos veces un nombre que no es el de Bernardo —una vez como fuente, otra vez como advertencia— y una vez un lugar que no es Castronegro, con una letra más vieja que la del resto, como copiada y no recordada. Bernardo no inventó nada de esto. Lo aprendió de alguien, en algún lado, y ese alguien tuvo que aprenderlo de otro más.',
        'No hay más que buscar en este laboratorio, no por ahora. El primer hechizo ya es tuyo.',
      ],
      aprenderHechizo: { id: 'adivinar-la-forma', source: 'el libro sin título de Bernardo' },
      cordura: { amount: 2, cause: 'leer, de punta a punta, algo escrito para que alguien más lo entendiera' },
      mitos: { amount: 1, source: 'libro-bernardo:lectura-completa' },
      tiempo: { minutes: 60 * 24 * 21, reason: 'leer el libro de Bernardo de punta a punta' },
      pistas: [{
        description: 'El libro sin título de Bernardo no es un texto original: cita, con letra más vieja que el resto, un nombre que no es el suyo y un lugar que no es Castronegro. Bernardo aprendió esto de alguien, en algún lado, y ese alguien tuvo que aprenderlo de otro más.',
        kind: 'documentary',
        source: 'el libro sin título de Bernardo',
        reliability: 'unknown',
      }],
      consecuencia: {
        description: 'El investigador volvió a la Casa de Díaz y leyó de punta a punta el libro sin título que Bernardo dejó en su laboratorio.',
        scope: 'world',
        permanent: true,
        worldReminder: 'El libro de Bernardo tiene un lector nuevo. El horno del laboratorio sigue frío. Y el libro cita a alguien que no es Bernardo.',
      },
    }),
  },
  {
    // Denunciar/irse-vigésimo, o cualquier otro caso no previsto: no hay
    // nada que aprender. Prioridad más baja que las dos de arriba, así que
    // sólo responde cuando ninguna de las dos coincidió.
    id: 'revelacion-nada',
    resolver: () => ({
      texto: [
        'Volvés al lugar donde todo pasó, y no hay nada que buscar: lo que sabías esa noche es lo mismo que sabés ahora.',
        'Bernardo no dejó nada al alcance de quien no se quedó a mirar. La Casa de Díaz sigue en la loma, y va a seguir ahí, con o sin vos adentro.',
        'No hay más que buscar en este laboratorio, no por ahora.',
      ],
      consecuencia: {
        description: 'El investigador volvió a la Casa de Díaz y no encontró nada que Bernardo hubiera dejado para él.',
        scope: 'world',
        permanent: true,
        worldReminder: 'No hay magia de este lado. Lo que pasó esa noche fue lo único que iba a pasar.',
      },
    }),
  },
  {
    // Segundo hechizo, ambas ramas de magia por igual: sólo visible después
    // de la primera revelación (ver `visible` en el JSON), así que no hace
    // falta volver a distinguir Ahijado de libro acá.
    id: 'revelacion-segundo',
    resolver: () => ({
      texto: [
        'Con el primero ya adentro, el segundo cuesta menos encontrarlo: sea el Ahijado o el libro, algo en vos ya sabe dónde mirar.',
        '«Sostener el aire» no aparta lo que asusta. Sostiene la respiración el tiempo justo para que el miedo no gane la mano —que, a esta altura, ya sabés que no es lo mismo que no tener miedo.',
        'El segundo también es tuyo.',
      ],
      aprenderHechizo: { id: 'sostener-el-aire', source: 'lo que ya habías empezado a aprender' },
      cordura: { amount: 2, cause: 'la segunda vez cuesta menos, y eso también da miedo' },
    }),
  },
  {
    id: 'cerrar',
    resolver: ({ estado }) => {
      const inv = estado.investigators[estado.activeInvestigator]!;
      const sabe = inv.spellsKnown.length;
      if (sabe === 0) {
        return {
          desenlace: {
            id: 'cerrar',
            title: 'Sin nada que llevarse',
            text: [
              'No hay hechizo, no hay libro, no hay Ahijado enroscándose en el brazo. Lo que pasó en la Casa de Díaz pasó una sola vez, y ahora es historia, no herramienta.',
              'Tal vez sea lo mejor. Tal vez no haya forma de saberlo sin la otra mitad de esta noche, la que no vas a tener.',
            ],
          },
        };
      }
      return {
        desenlace: {
          id: 'cerrar',
          title: 'Lo que Bernardo sabía',
          text: [
            `Salís del laboratorio sabiendo ${sabe === 1 ? 'una cosa' : 'dos cosas'} que no sabías la primera vez que entraste a la Casa de Díaz.`,
            'No es un arma. Es un peso nuevo, del tamaño exacto de lo que costó, y va a seguir ahí la próxima vez que haga falta.',
            'Bernardo enseñó lo que sabía, o dejó quien lo hiciera. Lo que se hace con eso, de acá en más, ya no es cosa suya.',
          ],
        },
      };
    },
  },
];
