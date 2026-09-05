/**
 * EL HOMBRE QUE MIRABA EL AGUA — lógica de escenas.
 *
 * Ver `hombreagua.ts` para el marco entero. Dos reglas que esta aventura no
 * puede romper y que están citadas escena por escena:
 *
 *   · Bernardo NO fabricó el anillo: lo encontró ya hecho (invariante dura,
 *     y ya dicho en contenido publicado — elvigesimo, tema `b-anillo`).
 *   · Quiénes construyeron el primer anillo, y si existe un primero, está
 *     SELLADO (CANON.md, "Lo sellado"). Los papeles del baúl dicen que se
 *     recuperó y se copió, y NO dicen de quién.
 */

import type { LogicaDeEscenas } from './cargarAventura.ts';

/** El agua devuelve algo distinto según lo que haya quedado en la mano. */
const CIERRE_AGUA =
  'Te agachás y mirás de cerca. La costra del borde es sal, el fondo es barro, ' +
  'el agua es agua. De cerca es agua nomás, y eso es lo peor: no hay nada acá ' +
  'que explique por qué estás parado en 1679.';

export const EL_HOMBRE_QUE_MIRABA_EL_AGUA_LOGICA: LogicaDeEscenas = [
  {
    // Rama del anillo puesto. La visión llegó por el rubí, así que el agua
    // le devuelve algo que tiene que ver con lo que lleva en el dedo.
    id: 'mirar-agua-anillo',
    resolver: () => ({
      texto: [
        'El agua está quieta de una manera que ya conocés, y ya sabés que no vale la pena buscarle viento.',
        'Tu reflejo llega tarde —lo que tarda un eco a media legua— y cuando llega, la mano del reflejo tiene el anillo. La tuya también. Pero el rubí del reflejo está del otro lado del dedo, como si la mano que ves fuera la izquierda de otro y no la derecha tuya.',
        CIERRE_AGUA,
      ],
      exposicion: { amount: 6, source: 'hombreagua:agua', cause: 'mirar de cerca el agua que te trajo' },
      pistas: [{
        description: 'En la laguna de 1679 el reflejo del investigador llega tarde y devuelve el anillo en la mano equivocada. La visión entró por el rubí.',
        kind: 'experiential',
        source: 'la orilla, 1679',
        reliability: 'unknown',
      }],
    }),
  },
  {
    // Rama del anillo destruido: entró por el agua, no por el rubí.
    id: 'mirar-agua-sin-anillo',
    resolver: () => ({
      texto: [
        'El agua está quieta de una manera que ya conocés, y ya sabés que no vale la pena buscarle viento.',
        'Tu reflejo llega tarde —lo que tarda un eco a media legua— y cuando llega, tiene las manos vacías, igual que vos. Lo que no está en su lugar es el horno: atrás del reflejo tuyo, donde no hay más que campo, hay una pared con un horno de piedra prendido, y vos sabés perfectamente cuál es ese horno y qué tiraste adentro.',
        CIERRE_AGUA,
      ],
      exposicion: { amount: 6, source: 'hombreagua:agua', cause: 'mirar de cerca el agua que te trajo' },
      pistas: [{
        description: 'En la laguna de 1679 el reflejo del investigador llega tarde y devuelve, detrás de él, el horno del laboratorio de Bernardo prendido — el mismo donde se destruyó el anillo, doscientos cincuenta años después.',
        kind: 'experiential',
        source: 'la orilla, 1679',
        reliability: 'unknown',
      }],
    }),
  },
  {
    // Ninguno de los dos finales: entró igual, más ciego. Nadie queda afuera.
    id: 'mirar-agua-ciego',
    resolver: () => ({
      texto: [
        'El agua está quieta de una manera que no te gusta, y no hay viento que explique ninguna de las dos cosas.',
        'Tu reflejo llega tarde. Eso es todo lo que hace: llega tarde. No te muestra nada que no seas vos, y de alguna manera eso es peor que si te mostrara algo, porque significa que lo que sea que te trajo acá no tenía nada que decirte en particular.',
        CIERRE_AGUA,
      ],
      exposicion: { amount: 5, source: 'hombreagua:agua', cause: 'mirar de cerca el agua que te trajo' },
      pistas: [{
        description: 'En la laguna de 1679 el reflejo del investigador llega tarde y no muestra nada más. Lo que lo trajo no parecía tener nada que decirle en particular.',
        kind: 'experiential',
        source: 'la orilla, 1679',
        reliability: 'unknown',
      }],
    }),
  },
  {
    // Los papeles: acá entra TODO el período 1650-1675, como documentos, y
    // acá se aprende el hechizo más viejo de los tres. Lo sellado queda
    // sellado: el inventario dice "recuperado", nunca "hecho por".
    id: 'leer-papeles',
    prueba: () => ({
      skill: 'buscar_libros', difficulty: 'regular',
      reason: 'ordenar dos manos distintas de papeles ajenos en el tiempo que te dejen',
      stakes_success: 'entendés qué vino de dónde',
      stakes_failure: 'leés lo que alcanza a leerse',
    }),
    resolver: ({ tirada }) => {
      const numero = tirada?.numero ?? 1;
      const perdidaSiFalla = tirada?.grado === 'fumble' ? 4 : 1 + (numero % 4);
      // Dos efectos porque `documento` entrega UNO por efecto, y acá hay dos
      // papeles distintos: el inventario y la instrucción copiada. El motor
      // aplica la lista en orden (ver `EfectoEscena` en escena.ts).
      return [{
        texto: [
          'Son dos manos, y ninguna de las dos es la de la libreta de la orilla.',
          'La primera hizo un inventario: aros, piedras, hojas contadas. La palabra que repite no es «hecho» ni «fabricado»: es **recuperado**. Recuperaron cosas de una casa del sur, y de quién eran esas cosas antes no lo anotó nadie, ni parece que lo hayan sabido.',
          'La segunda mano es más vieja y está copiada de otra: se nota porque el que copiaba dudaba en las abreviaturas. Es una instrucción. Dice dónde mirar, dice marcar el límite grabado y no pintado —porque la pintura se va y el asunto no—, y dice anotar lo que no se pueda anotar en otro lado.',
          tirada?.exito
            ? 'Y hay una cosa más, que sale de comparar las dos manos y no de leer ninguna: la instrucción es anterior al inventario. Los que recuperaron los aros estaban siguiendo un papel que ya existía, copiado de otro que ya existía. En algún punto de esa cadena alguien escribió el primero. Ese alguien no dejó nombre, ni fecha, ni la más mínima intención de dejarlos.'
            : 'Alcanzás a leer las dos, pero no a ponerlas en orden entre ellas: cuál copió a cuál, y cuántas copias hay entre esa instrucción y la primera que existió, se te escapa.',
        ],
        documento: { id: 'doc-inventario', how: 'entre los papeles del baúl del campamento' },
        mitos: { amount: tirada?.exito ? 2 : 1, source: 'las hojas de instrucción copiadas, en el campamento de 1679' },
        cordura: { amount: tirada?.exito ? 2 : perdidaSiFalla, cause: 'leer una instrucción que ya era copia de una copia' },
        aprenderHechizo: {
          id: 'contar-lo-que-no-se-anota',
          source: 'las hojas de instrucción del baúl, en el campamento de 1679',
        },
        pistas: [{
          description: 'Los papeles del campamento son de dos manos anteriores a Bernardo: un inventario de cosas RECUPERADAS —nunca fabricadas— de una casa del sur, y una instrucción copiada de otra instrucción. Nadie anotó de quién eran las cosas ni quién escribió la primera hoja.',
          kind: 'documentary',
          source: 'el baúl del campamento, 1679',
          reliability: 'reliable',
        }],
        exposicion: { amount: 4, source: 'hombreagua:papeles', cause: 'leer instrucciones escritas para que las siga otro' },
      }, {
        documento: { id: 'doc-instruccion', how: 'copiada de mano de Bernardo, en el mismo baúl' },
      }];
    },
  },
  {
    // El puente con el Círculo Rojo de 1926. NO se gatea por estado: las
    // pistas no cruzan entre aventuras, así que la conexión la hace el
    // jugador y no el motor — por eso va como `jugadorNota`.
    id: 'mirar-circulos',
    // SÍ tira, y la tirada decide la PROFUNDIDAD, no el acceso: contar ocho
    // marcas superpuestas y notar que el pulso se afirma de una a la otra es
    // percepción de verdad. Fallar deja igual lo básico —están grabados, no
    // pintados— y deja igual la nota del jugador, porque el puente con el
    // Círculo Rojo de 1926 no puede depender de un dado. Mismo criterio que
    // el mausoleo de El Vigésimo: la placa se ve pase lo que pase, lo que
    // cambia es lo que cuesta y lo que se entiende.
    prueba: () => ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'contar cuántas veces se repitió la marca, y con qué pulso',
      stakes_success: 'ves la cuenta entera',
      stakes_failure: 'ves que están, y nada más',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'La piedra está picada, no cortada, por gente que no tenía metal — y eso es lo más viejo que hay acá. Lo que no es tan viejo está más abajo, a la altura de la rodilla.',
        tirada?.exito
          ? 'Alguien grabó un círculo cerrado que da toda la vuelta a la piedra. Y arriba de ése, otro. Y arriba, otro. Contás ocho círculos grabados, uno encima del otro, con el pulso cada vez más firme: el primero tembló, el octavo no.'
          : 'Alguien grabó un círculo cerrado que da toda la vuelta a la piedra, y no es el único: hay más, encimados, pero la luz de esta hora no te deja separarlos ni contarlos.',
        'No están pintados. Están grabados, hondos, hechos para que no se los lleve nada.',
      ],
      exposicion: { amount: 5, source: 'hombreagua:circulos', cause: 'una marca repetida encima de sí misma en la piedra' },
      estabilidad: { amount: -4, cause: 'una marca que alguien repite hace años sin que nadie le explique por qué' },
      pistas: [{
        description: tirada?.exito
          ? 'La base de la piedra tiene ocho círculos grabados uno encima del otro, hondos, no pintados. El pulso del primero tiembla; el del octavo no. Alguien viene repitiendo la marca, año tras año, siguiendo una instrucción que no entiende.'
          : 'La base de la piedra tiene círculos grabados encimados, hondos y no pintados: alguien viene repitiendo la misma marca desde hace años.',
        kind: 'physical',
        source: 'la piedra marcada, 1679',
        reliability: 'reliable',
      }],
      jugadorNota: {
        statement: 'Doscientos cincuenta años después, dos familias de Villa Requena repintan en almagre un círculo en la semana de San Juan, sin que nadie sepa explicar por qué. Debajo de esa pintura hay un círculo grabado, más viejo, más hondo, que no es de ningún invierno que nadie recuerde. Es éste. El investigador no tiene forma de saberlo.',
        source: 'la piedra marcada, 1679',
        reliability: 'unknown',
      },
    }),
  },
  {
    // Bernardo encuentra el anillo. NO lo fabrica: lo saca del fondo. Y lo
    // importante no es que lo encuentre: es POR QUÉ entra a buscarlo.
    id: 'el-encuentro',
    resolver: () => ({
      texto: [
        'No hace nada durante una hora. Mide, anota, mira. Después, sin ningún aviso, deja la libreta sobre la costra seca y se mete al agua vestido.',
        'Camina hasta que le da por el pecho, en línea recta, exactamente hacia el punto donde estuvo mirando toda la tarde. Se agacha. Se hunde. El agua se cierra sin una onda, que no es lo que hace el agua cuando alguien se hunde en ella.',
        'Sale con la mano cerrada.',
        'Desde donde estás no se ve qué tiene en el puño, y no hace falta: la cara le cambió de una manera que no le va a volver a cambiar en trescientos años. Es la cara de alguien a quien le acaban de contestar que sí.',
        'Y lo que pasó, si lo mirás sin ponerle nada encima, fue esto: un hombre vio una imagen en el agua, decidió que la imagen era una indicación dirigida a él, y fue a buscar lo que la imagen mostraba. La imagen nunca dijo de quién era la mano.',
      ],
      exposicion: { amount: 9, source: 'hombreagua:encuentro', cause: 'ver a alguien recibir la respuesta que se venía diciendo solo' },
      pistas: [{
        description: 'Bernardo no fabricó el anillo: lo sacó del fondo de la laguna, once días después de que el agua le mostrara una mano tomando un anillo. Interpretó la imagen como una indicación dirigida a él. La imagen nunca dijo de quién era la mano.',
        kind: 'experiential',
        source: 'la orilla, 1679',
        reliability: 'reliable',
      }],
      consecuencia: {
        description: 'El investigador vio, en una visión de 1679, cómo Bernardo Díaz encontró el anillo en el fondo de la laguna: no lo fabricó, y entró a buscarlo porque leyó un reflejo como una orden.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Alguien vio el primer error de Bernardo con sus propios ojos. El error no fue encontrar el anillo: fue creer que el agua se lo estaba ofreciendo.',
      },
    }),
  },
  {
    // El beat al que apunta toda la aventura: Reciprocidad (canon §2)
    // entregada literal, y el bucle canónico §6 desde el otro lado.
    id: 'te-ve',
    prueba: () => ({
      skill: 'COR', difficulty: 'regular',
      reason: 'quedarte parado donde te puede ver el hombre que acaba de salir del agua',
      stakes_success: 'te cuesta menos de lo que podría',
      stakes_failure: 'te cuesta más de lo que esperabas',
    }),
    resolver: ({ tirada }) => {
      const numero = tirada?.numero ?? 1;
      const perdidaSiFalla = tirada?.grado === 'fumble' ? 8 : 1 + (numero % 8);
      return {
        texto: [
          'Se queda en la orilla con el agua hasta las rodillas y abre la mano. Mira lo que tiene. Después, despacio, sube la vista de la mano al agua.',
          'Y de golpe deja de mirar el agua y te mira a vos.',
          'No con la cara de quien descubre a un intruso: con la cara de quien confirma algo. Te mira como se mira una cuenta que da. Y después mira alrededor tuyo —a los costados, un poco más atrás— como si además de vos hubiera otros, más de uno, un grupo entero parado en su orilla en el que vos sos apenas el que quedó más cerca.',
          'Mueve los labios. No sabés si dice algo o si está contando.',
          'Lo último que hace antes de que la tarde empiece a irse es bajar otra vez la vista al puño cerrado, y sonreír. No te sonríe a vos: sonríe porque acaba de encontrar la prueba de que la promesa que él leyó en el agua era una promesa, y la prueba sos vos.',
          'No sabe tu nombre. Eso también lo ves: te mira como se mira una fecha, no como se mira a una persona.',
        ],
        cordura: {
          amount: tirada?.exito ? 2 : perdidaSiFalla,
          cause: 'que te vea, y que verte le sirva de confirmación',
          crisis: {
            nombre: 'La cuenta que da',
            descripcion: 'Volvés sobre la idea de que alguien, doscientos cincuenta años antes, ya contaba con que ibas a estar parado ahí. No podés terminar la idea y no podés dejarla.',
            tipo: 'mania' as const,
            afecta: [{ skill: 'psicologia', dados: 1 }],
          },
        },
        exposicion: { amount: 14, source: 'hombreagua:te-ve', cause: 'ser mirado desde el otro momento' },
        estabilidad: { amount: -10, cause: 'que la mirada llegue en la dirección equivocada' },
        pistas: [{
          description: 'En 1679 Bernardo levantó la vista del anillo recién sacado del agua y miró directamente al investigador, y alrededor de él, como si viera un grupo entero. No lo miró como a un intruso: lo miró como a una confirmación. No sabía su nombre.',
          kind: 'experiential',
          source: 'la orilla, 1679',
          reliability: 'reliable',
        }],
        consecuencia: {
          description: 'En una visión de 1679, Bernardo Díaz vio al investigador parado en su orilla y lo tomó como la confirmación de que lo que había leído en el agua era una promesa.',
          scope: 'world',
          permanent: true,
          worldReminder: 'Bernardo lo vio a él. Doscientos cincuenta años antes de conocerlo, y le sirvió para convencerse.',
        },
      };
    },
  },
  {
    id: 'fin-dejarlo',
    resolver: () => ({
      consecuencia: {
        description: 'El investigador miró la tarde de 1679 sin meterse en nada, y dejó que la visión se cerrara sola.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Miró y no tocó. Es lo único que se puede decir con seguridad de esa tarde.',
      },
      desenlace: {
        id: 'dejarlo',
        title: 'Lo que se mira sin tocar',
        text: [
          'No hacés nada. Es más difícil de lo que parece y es lo único que estabas en condiciones de hacer bien.',
          'La tarde de 1679 se va como se va cualquier tarde: sin apuro y sin avisar. En algún momento el agua deja de estar delante tuyo y hay una pared, o un techo, o el borde de un aljibe, y ya es 1928 otra vez y tenés la ropa seca.',
          'Lo que te queda no es una prueba. Es haber visto a un hombre que todavía no había hecho nada, decidir hacerlo.',
        ],
      },
    }),
  },
  {
    id: 'fin-intervenir',
    resolver: () => ({
      texto: [
        'Le gritás. Le gritás lo que sabés: que eso no es una promesa, que la mano del reflejo puede ser cualquier mano, que va a pasar trescientos años preguntándole a un agua que no contesta.',
        'Algo pasa. Eso es lo peor de todo: algo pasa. Levanta la cabeza a mitad de tu frase, con la cara del que oyó un ruido en el campo de noche, y se queda quieto un segundo largo.',
        'Después mira el puño cerrado y sigue.',
      ],
      cordura: { amount: 3, cause: 'hablarle a alguien que capaz te oyó y siguió igual' },
      consecuencia: {
        description: 'El investigador trató de advertirle a Bernardo Díaz, en 1679, que estaba leyendo mal lo que el agua le mostraba. Bernardo levantó la cabeza a mitad de la frase. Después siguió.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Alguien le habló a Bernardo antes de que fundara nada. Nadie puede decir si lo oyó, y el pueblo se fundó igual.',
      },
      desenlace: {
        id: 'intervenir',
        title: 'Lo que se dice y no se oye',
        text: [
          'Volvés a 1928 con la garganta como si hubieras gritado de verdad, que es un detalle que no le vas a poder explicar a nadie.',
          'Castronegro sigue donde estaba. El pueblo se fundó en 1680, la Casa de Díaz está en la loma, y todo lo que pasó siguió pasando exactamente como pasó.',
          'Lo que no podés decidir —ni esa noche, ni después— es si eso significa que no te oyó, o si significa que te oyó y no le alcanzó, o si significa que oírte era parte de lo que siempre había pasado. Las tres explicaciones alcanzan para lo mismo. Ninguna se puede probar.',
        ],
      },
    }),
  },
  {
    id: 'fin-quedarse',
    resolver: () => ({
      texto: [
        'Te quedás. La tarde no se termina: se estira, y en algún punto deja de ser la misma tarde sin que puedas señalar dónde.',
        'Ves el invierno. Ves las carretas del socio yéndose y volviendo con más gente. Ves el rectángulo de estacas del alto convertirse en un rectángulo de zanjas, y después en una plaza. Ves a Bernardo dictarle a alguien un libro con nueve apellidos en la primera hoja, y ves que la mano que escribe no es la suya.',
        'Y en algún momento de todo eso, sin ceremonia, el hombre le pone nombre al lugar: le dice el nombre de lo que ve todos los días desde la loma. Agua Blanca. Por la sal del borde. Por nada más que la sal del borde.',
      ],
      mitos: { amount: 1, source: 'ver la fundación entera de 1680 desde adentro' },
      cordura: { amount: 4, cause: 'ver un año entero pasar sin poder salirte' },
      exposicion: { amount: 12, source: 'hombreagua:fundacion', cause: 'quedarse del otro lado más tiempo del que nadie debería' },
      consecuencia: {
        description: 'El investigador se quedó en la visión hasta la fundación de 1680, y vio a Bernardo Díaz ponerle Agua Blanca al lugar por la sal del borde de la laguna.',
        scope: 'world',
        permanent: true,
        worldReminder: 'El nombre viejo del pueblo no era una metáfora ni una advertencia: era una descripción. La sal del borde de una laguna que ya no está.',
      },
      desenlace: {
        id: 'quedarse',
        title: 'Lo que se queda hasta el final',
        text: [
          'Volvés a 1928 con un año encima que no viviste y que no le vas a poder contar a nadie.',
          'Sabés cosas que no se pueden probar: que el pueblo se llamó Agua Blanca por la sal de una laguna que hoy no existe, que la laguna es la misma agua que sigue abajo de cada aljibe del partido, y que la primera hoja de un libro con nueve apellidos la escribió una mano que no era la de Bernardo.',
          'Y sabés una que no querías: que el hombre que fundó todo esto no era un brujo cuando llegó. Era un tipo con plata, con libros ajenos y con una idea equivocada, y tuvo doscientos cincuenta años para volverse lo otro sin morirse en el camino. Eso es peor. Un brujo se entiende. Esto no.',
        ],
      },
    }),
  },
];
