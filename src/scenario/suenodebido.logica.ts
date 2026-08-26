/**
 * LA LÓGICA DE LAS ESCENAS DE EL SUEÑO DEBIDO — lo único que no puede ser dato.
 *
 * Todo lo demás vive en `sueno-debido.contenido.json`.
 *
 * Lo propio de esta quinta aventura, que no tenía ninguna de las cuatro
 * anteriores:
 *
 *   1. ES LA PRIMERA CONTINUACIÓN DIRECTA. No arranca de cero: arranca de un
 *      desenlace concreto de El Invierno Debido, y lee CUÁL fue. La carta que
 *      trae al investigador está escrita distinta en las cinco ramas —las
 *      cuatro que dejaron consecuencia registrada más la de irse sin decidir,
 *      que no dejó ninguna—. Se puede jugar suelta: entonces cae en la quinta
 *      variante, que es la de alguien a quien Aurelio le escribe sin haberlo
 *      tratado nunca.
 *
 *   2. EL SUEÑO NO ES UN LUGAR AL QUE SE CAMINA. Las tres visitas son escenas
 *      autorales, no localizaciones: el motor exige conexión declarada para
 *      mover a alguien (`move_to_location`) y genera un botón «Ir a» por cada
 *      conexión, así que un mapa onírico navegable pedía dos cambios de motor
 *      —conexiones ocultas y un efecto `mueve`— para conseguir algo que además
 *      es peor de narrar. Un sueño no se recorre: te lleva. Cada visita es una
 *      escena con su propia tirada, que ramifica por GRADO y no sólo por
 *      éxito/fracaso.
 *
 *   3. REPARTE LAS TIRADAS. Las cuatro aventuras anteriores usaron `descubrir`
 *      doce veces y catorce habilidades del sistema, cero. Acá entran por
 *      primera vez Primeros Auxilios, Escuchar, Historia, Uso de Bibliotecas,
 *      Fotografía, Ocultismo, Antropología, Intimidar y Labia. No es variedad
 *      decorativa: si la campaña nunca pone a prueba lo que el jugador eligió
 *      al repartir puntos, la creación de personaje no significa nada.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CANON. Quinto Umbral — sueño (Biblia v0.7 §11). El tema del Umbral es dato
 * canónico aunque los nombres geográficos no lo sean. Se apoya además en §4
 * (memoria futura: recuerdos incompletos, desordenados o mal interpretados) y
 * en §2 (reciprocidad: quien mira puede ser mirado).
 *
 * NINGUNA RAMA CONTESTA SI LA OBLIGACIÓN SIRVE. Igual que en El Invierno
 * Debido, y por el mismo motivo: §15. Lo que esta aventura agrega es una
 * hipótesis con evidencia a favor y en contra —que lo que ata no es pintar
 * sino quedar anotado—, y ninguna manera de confirmarla.
 */

import type { GameState } from '../shared/types.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const consecuencia = (s: GameState, frag: string) =>
  s.consequences.some((c) => c.description.includes(frag));
const documento = (s: GameState, id: string) => Boolean(s.documents[id]?.obtainedAt);

/**
 * Cuál de los cinco desenlaces de El Invierno Debido trae encima.
 *
 * Cuatro dejaron consecuencia permanente de alcance campaña o mundo, así que
 * cruzan solas por el puente entre aventuras (ver `engine.ts`: sólo lo
 * permanente y de alcance campaña o mundo perdura). El quinto —irse sin
 * decidir nada— no dejó ninguna a propósito, y es indistinguible de no haber
 * jugado la aventura: las dos cosas son, para Villa Requena, la misma.
 */
type DesenlacePrevio = 'pintar' | 'soltar' | 'otro-ano' | 'denunciar' | 'ninguno';

const desenlacePrevio = (s: GameState): DesenlacePrevio => {
  if (consecuencia(s, 'cumplió el turno de 1926')) return 'pintar';
  if (consecuencia(s, 'abandonar la obligación')) return 'soltar';
  if (consecuencia(s, 'cumplir un año más')) return 'otro-ano';
  if (consecuencia(s, 'para llevarlo a un juzgado')) return 'denunciar';
  return 'ninguno';
};

/** Si el año pasado le fue encima a Cirilo. Cierra puertas y abre otras. */
const peleoConCirilo = (s: GameState) => consecuencia(s, 'le fue encima a Cirilo Sosa');

/**
 * ECOS DE OTRAS AVENTURAS DE LA CAMPAÑA.
 *
 * `sembrarHerencia` (engine.ts) reenvía, de una aventura a la siguiente,
 * toda consecuencia permanente de alcance campaña o mundo — y como cada
 * aventura vuelve a reenviar lo que heredó, una consecuencia de la PRIMERA
 * aventura de la campaña puede seguir viva acá, cuatro aventuras después,
 * sin que nadie tenga que copiarla a mano en cada paso. Estos son ecos
 * concretos de eso: no hacen falta para entender la aventura ni para
 * terminarla, son reconocimiento.
 */

/** Agua Quieta: sostuvo la mirada al aljibe de Los Álamos hasta que respondió, o bajó dentro de él. */
const enfrentoElAljibeAntes = (s: GameState) =>
  consecuencia(s, 'sostuvo la mirada hasta que el fenómeno del aljibe respondió')
  || consecuencia(s, 'bajó al aljibe de Los Álamos');

/** Agua Quieta: lo tapó en vez de volver a mirarlo. */
const selloElAljibeAntes = (s: GameState) => consecuencia(s, 'aljibe de Los Álamos quedó sellado');

/** La Firma Ajena: tuvo que decidir, con lo que tenía, si un papel decía la verdad sobre quién era alguien. */
const juzgoUnaIdentidadAntes = (s: GameState) =>
  consecuencia(s, 'avaló la identidad de Alejo Ferreyra')
  || consecuencia(s, 'desmintió la identidad del hombre que dice ser Alejo Ferreyra');

/**
 * La Legua Perdida: caminó la línea del oeste de punta a punta y volvió
 * contando postes. Ese final deja una manía mecánica —«Compulsión de
 * contar»— que ya cruza sola por ser cicatriz mental del investigador, así
 * que acá no hace falta agregar mecánica: hace falta que la primera noche
 * la NOMBRE, porque la ronda del brocal es literalmente una fila de gente
 * en la que alguien así no podría no ponerse a contar.
 */
const caminoLaLineaAntes = (s: GameState) =>
  consecuencia(s, 'caminó el alambrado del oeste de punta a punta');

/**
 * Cuántas veces, en aventuras anteriores de esta campaña, eligió irse sin
 * contestar nada. Las tres que registran esa decisión la escriben igual
 * —«El investigador se fue de X sin…»—, así que se cuentan por el prefijo
 * común. El final de irse de El Invierno Debido no deja consecuencia a
 * propósito (ver `desenlacePrevio`) y por eso no entra en la cuenta.
 */
const vecesQueSeFue = (s: GameState) =>
  s.consequences.filter((c) => c.description.includes('El investigador se fue de')).length;

/**
 * Lo que ve QUIEN JUEGA al pie del brocal, si ya eligió irse antes.
 *
 * Va como `jugadorNota` y no como pista a propósito: el investigador no
 * lleva esta cuenta, y no debería. Es un patrón que sólo existe desde
 * afuera, mirando la campaña entera, y nombrarlo justo acá —cuando todavía
 * se puede elegir otra cosa— es el único momento en que sirve de algo.
 */
const notaDeLasVecesQueSeFue = (s: GameState) => {
  const veces = vecesQueSeFue(s);
  if (veces === 0) return {};
  return {
    jugadorNota: {
      statement: veces >= 3
        ? 'Es la cuarta vez que su investigador llega hasta acá y puede subir sin haber hecho nada. Las tres anteriores eligió eso: Los Álamos, La Perseverancia, Los Cardales. Nadie se lo reprochó ninguna de las tres veces, y ése es exactamente el problema. Usted está llevando la cuenta; él no.'
        : veces === 2
          ? 'Su investigador ya eligió dos veces irse sin contestar, en dos lugares distintos, por dos razones que en el momento parecieron buenas. Ésta sería la tercera. Él no está llevando esa cuenta.'
          : 'Su investigador ya eligió una vez irse sin contestar nada, y le funcionó: no pasó nada malo, o no pasó nada que se le pudiera atribuir. Es exactamente la clase de precedente que hace más fácil la segunda vez.',
      source: 'el pie del brocal, la tercera noche',
      reliability: 'unknown' as const,
    },
  };
};

/**
 * Los cierres compartidos de cada noche.
 *
 * Las dos escenas de acercamiento de una misma noche difieren en ángulo y en
 * tirada, pero terminan en el MISMO lugar —ver a Aurelio en la fila, la
 * pregunta del joven, la decisión al pie del brocal—, porque de ahí sale la
 * pista de cierre que destraba la noche siguiente y no puede depender de cuál
 * de las dos ramas se jugó. Vivir esto en una sola constante evita que las
 * dos ramas se desincronicen con el tiempo.
 */
const cierreNocheUno: string[] = [
  'En algún momento uno de los que se agachan tiene la altura y la manera de agacharse de Aurelio Requena. Le hablás. No levanta la cabeza. Del otro lado de la fila hay alguien parado que no camina y que no se agacha, y ése sí está de frente, y ése sí te está mirando a vos, y es lo último que ves.',
];

const cierreNocheDos: string[] = [
  'El joven del escritorio termina el renglón, apoya la pluma y por primera vez levanta la cabeza. Tiene la cara de la punta izquierda de la fila de atrás.\n\n—Usted es del año que viene —dice, sin sorpresa—. ¿Ya está anotado?',
];

const cierreNocheTres = (estado: GameState): string[] => {
  const leyoLista = pista(estado, 'una lista de nombres con una marca al lado');
  return [
    leyoLista
      ? 'Y ahí ves lo que tiene en las manos: la quinta hoja. La de la lista. La está sosteniendo abierta como se sostiene un libro de misa, y hay un renglón nuevo abajo de todo, todavía fresco, y el trazo del costado es un círculo.'
      : 'Y tiene algo en las manos que no llegás a ver bien, y por el modo en que lo sostiene —abierto, con las dos manos, como un libro de misa— sabés que lo está leyendo y no que lo está usando.',
    'Se puede bajar. Eso es lo peor de todo: se ve claramente que se puede bajar, que el agua da a un palmo y que hay dónde apoyar el pie, y que subir es otro asunto.',
  ];
};

export const SUENO_DEBIDO_LOGICA: LogicaDeEscenas = [
  // ══ LA CARTA ════════════════════════════════════════════════════════════════
  //
  // El único lugar del juego donde una aventura le contesta al desenlace exacto
  // de la anterior. En El Invierno Debido la carta variaba por CUÁNTAS marcas
  // traía el investigador —de cero a tres—; acá varía por QUÉ hizo, que es una
  // pregunta distinta y más incómoda.

  {
    id: 'leer-carta',
    resolver: ({ estado }) => {
      if (documento(estado, 'doc-carta')) {
        return { texto: ['La volvés a leer. Dice lo mismo, y la línea agregada al pie sigue estando: no le preguntes a Ramona por el setenta y ocho hasta no tener otra cosa.'] };
      }
      const rama = desenlacePrevio(estado);
      const comentario: Record<DesenlacePrevio, string> = {
        pintar: 'Hay una línea que no estaba en el borrador y que la letra escribió más grande que el resto: «Usted vio el libro y usted está adentro». No es una acusación. Es un dato, puesto ahí para que lo tengas presente mientras leés el resto.',
        soltar: 'Aurelio escribe como si te debiera algo y no supiera cuánto. En un renglón dice: «Le hice caso. No repinté más, ni ese año ni éste». Y dos renglones abajo, sin conectarlo con nada: «Y sin embargo acá estamos».',
        'otro-ano': 'Está la línea que esperabas y no querías: «Usted me dijo un año más. El año más lo hice. Le escribo desde el año siguiente, que es adonde usted me mandó».',
        denunciar: 'La letra es correcta y fría hasta la mitad, que es donde se le rompe el pulso. «No le guardo rencor por lo del libro. Le voy a decir algo peor: desde que el libro no está, esto no mejoró ni empeoró, y yo esperaba cualquiera de las dos cosas menos ésa».',
        ninguno: 'Lo raro es que te escriba a vos. Habla como si se hubieran tratado, y hasta donde recordás no se trataron: «Usted es la única persona que preguntó por el brocal y después se fue del pueblo entera». Eso último lo subrayó.',
      };
      return {
        texto: [
          'La sacás del bolsillo del sobretodo, donde la venís trayendo desde que llegó.',
          comentario[rama],
          'Y después la línea del pie, con el pulso peor, que es la que te va a dar vueltas todo el día: que no le preguntes a Ramona por el setenta y ocho hasta no tener otra cosa. Se lo pide él.',
        ],
        documento: { id: 'doc-carta', how: 'la venías trayendo encima desde que llegó' },
        pistas: [{
          description: 'Aurelio pidió por escrito que no se le pregunte a Ramona Sosa por el año 1878 hasta no tener otra cosa. No explica por qué, y escribió esa línea con el pulso ya cambiado.',
          kind: 'documentary' as const, source: 'la carta de Aurelio', reliability: 'reliable' as const,
        }],
      };
    },
  },

  // ══ LA VIGILIA ══════════════════════════════════════════════════════════════

  {
    id: 'examinar-brocal',
    prueba: () => ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'mirar cómo está dada la pintura de este año',
      stakes_success: 'ver de qué mano salió',
      stakes_failure: 'un círculo entero, que ya es raro',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Corrés la piedra y levantás la chapa. Adentro huele a piedra mojada y a nada más.',
        'El círculo está entero. Toda la vuelta, sin un tramo desvaído, cosa que no pasaba desde antes de que vos llegaras la primera vez.',
        tirada?.exito
          ? 'Y está mal hecho. La línea arranca gruesa y se adelgaza donde el pulso se cansó, y en dos lugares se pisa a sí misma porque el que lo pintó no sabía por dónde había empezado. Se hizo de una sola vez, de noche, por alguien que nunca lo había hecho antes. Y lo terminó igual, que es la parte que importa.'
          : 'Rojo parejo, de este invierno, dado hasta el final. Quién lo dio no se lee en la pintura, o no se lee con esta luz.',
      ],
      exposicion: { amount: 2, source: 'brocal:1927', cause: 'el círculo entero, por primera vez en años' },
      ...(tirada?.exito ? {
        pistas: [{
          description: 'El círculo de 1927 está completo, pintado de una sola vez y por una mano sin práctica: no lo hizo ninguno de los dos que lo vinieron haciendo siempre.',
          kind: 'physical' as const, source: 'el brocal de la plaza', reliability: 'reliable' as const,
        }],
      } : {}),
    }),
  },

  {
    id: 'mirar-aurelio',
    // PRIMEROS AUXILIOS, y no Medicina: no hace falta un diagnóstico, hace
    // falta descartar lo que cualquiera con las manos entrenadas descartaría
    // en dos minutos al lado de un catre. Que el resultado sea «no es nada de
    // lo que sé mirar» es lo que convierte esto en la aventura que es.
    prueba: () => ({
      skill: 'primeros_auxilios', difficulty: 'regular',
      reason: 'descartar apoplejía, fiebre y todo lo que se descarta con las manos',
      stakes_success: 'saber qué NO es, y ver lo que sí',
      stakes_failure: 'un hombre dormido, y nada más que eso',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Le levantás un párpado con el pulgar. La pupila responde. Le buscás el pulso en el cuello y lo encontrás enseguida: lento, firme, aburrido.',
        tirada?.exito
          ? 'No hay fiebre. No hay rigidez de un lado ni caída de la boca: la apoplejía que todo el pueblo da por hecha no está. La lengua está húmeda, así que alguien lo hidrata y lo hidrata bien. En catorce días acostado debería haber empezado a marcarse en los talones y no se marcó.'
          : 'Duerme. Duerme como duerme cualquiera, y eso es todo lo que sacás en limpio, que en un hombre que lleva catorce días sin despertarse es exactamente ninguna información.',
        tirada?.exito
          ? 'Y hay dos cosas que no van con estar acostado dos semanas. La primera: tiene las plantas de los pies sucias de tierra fresca. La segunda: tiene almagre metido abajo de las uñas de las dos manos, del lado de la carne, donde entra cuando se raspa una superficie con los dedos.'
          : 'Le mirás las manos porque sí, sin buscar nada, y las volvés a apoyar donde estaban.',
      ],
      exposicion: { amount: 3, source: 'aurelio:catre', cause: 'catorce días dormido y los pies sucios' },
      // La primera pista es INCONDICIONAL, a propósito: es la que abre la
      // puerta de dormir con el almagre, y esa puerta no puede depender de
      // acertar una tirada de Primeros Auxilios al 30-35%. Fallarla cambia
      // qué se entiende —nada, en vez de dos detalles concretos— y nunca si
      // se puede seguir. Antes de este arreglo, un jugador con mala suerte se
      // quedaba sin botón para dormir después de agotar el resto del
      // contenido: bug real, reportado jugando.
      pistas: [
        {
          description: 'Revisó a Aurelio de cerca, buscando algo que lo explicara.',
          kind: 'physical' as const, source: 'el catre de la escribanía', reliability: 'reliable' as const,
        },
        ...(tirada?.exito ? [{
          description: 'Aurelio no está enfermo de nada que se pueda diagnosticar: no hay apoplejía ni fiebre, y no tiene las marcas que deja estar acostado dos semanas. Tiene tierra fresca en las plantas de los pies y almagre bajo las uñas.',
          kind: 'physical' as const, source: 'el catre de la escribanía', reliability: 'reliable' as const,
        }] : []),
      ],
    }),
  },

  {
    id: 'escuchar-aurelio',
    // ESCUCHAR. Un murmullo tenue y ambiguo es literalmente lo que dice el
    // manual que resuelve esta habilidad, y hasta esta aventura no se había
    // pedido una sola vez en cuatro historias.
    prueba: () => ({
      skill: 'escuchar', difficulty: 'regular',
      reason: 'sacar palabras de un murmullo que no está dirigido a nadie',
      stakes_success: 'entender qué es lo que repite',
      stakes_failure: 'aire, y una consonante cada tanto',
    }),
    resolver: ({ tirada, estado }) => ({
      texto: [
        'Acercás la oreja hasta que te queda a un palmo de su boca. Huele a agua, no a enfermo.',
        tirada?.exito
          ? 'No habla. Cuenta. Es una lista, dicha bajísimo y sin ninguna emoción, y son años: mil ochocientos cincuenta y dos, mil ochocientos setenta y ocho, mil novecientos cuatro. Después se queda callado unos segundos exactos y vuelve a empezar por el primero.'
          : 'Hay palabras ahí abajo, pero no llegan enteras: una consonante, una vocal larga, aire. Podría estar rezando. Podría estar contando ovejas. No hay manera de saberlo con esta respiración encima.',
        tirada?.exito
          ? 'Tres años, en orden, en bucle. Y ninguno de los tres es el año en que estamos ni el año pasado.'
          : '',
      ].filter(Boolean),
      exposicion: { amount: 2, source: 'aurelio:murmullo', cause: 'lo que dice cuando no le habla a nadie' },
      ...(tirada?.exito ? {
        pistas: [{
          description: 'Aurelio, dormido, repite una secuencia de tres años en bucle y en orden: 1852, 1878 y 1904. No dice nada más.',
          kind: 'testimonial' as const, source: 'Aurelio Requena, dormido', reliability: 'unknown' as const,
        }],
        // Sólo si ya vio el libro puede saber que esos tres números no son
        // cualquier cosa. Si no, es una lista de años sin sentido — y el
        // jugador, que quizá se acuerde del libro del año pasado, sabe más que
        // su propio investigador, que es exactamente el efecto buscado.
        ...(documento(estado, 'doc-turnos') ? {
          contradiccion: {
            description: 'Aurelio repite dormido los tres años cuyos renglones están tachados en el libro, y esos renglones los escribieron cuatro manos que no son la suya, cincuenta años antes de que él naciera.',
            between: 'lo que dice dormido / lo que dice el libro',
          },
        } : {}),
      } : {}),
    }),
  },

  {
    id: 'leer-libro',
    resolver: ({ estado }) => {
      const rama = desenlacePrevio(estado);
      // El libro se lee distinto según qué se hizo con él el año pasado. En la
      // rama en que se lo llevaron a un juzgado, lo que hay para leer no es el
      // libro: es la copia que hizo a mano una maestra antes de que se fuera.
      const procedencia = rama === 'denunciar'
        ? [
          'El libro no está: está donde vos lo dejaste, en una caja de un sótano de mampostería, con una carátula que dice «Costumbre local. Sin delito».',
          'Lo que hay arriba del escritorio es un cuaderno escolar de tapa dura con ochenta y seis renglones copiados a mano, prolijos, sin abreviar, con letra de maestra. Delfina Arce lo copió entero en las tres semanas que el libro tardó en salir del pueblo. No se lo dijo a nadie y no pidió permiso.',
        ]
        : [
          'El cajón del medio está entreabierto: este año nadie lo cerró con llave, y la llave está arriba del escritorio a la vista de cualquiera.',
          'El libro de tapas de cartón, rayado como un libro de cuentas. Dos columnas, un año y un apellido, ochenta y seis renglones.',
        ];

      const renglon1926: Record<DesenlacePrevio, string> = {
        pintar: 'El renglón de 1926 no dice REQUENA ni dice SOSA. Dice tu apellido, con la letra de Aurelio salida despareja, y es el único renglón del libro escrito con la mano temblando.',
        soltar: 'El renglón de 1926 está vacío. La raya del año está trazada y al lado no hay nada, y el de 1927 tampoco tiene nada, y ver dos renglones en blanco seguidos en un libro de ochenta y seis es más incómodo de lo que parece por escrito.',
        'otro-ano': 'El renglón de 1926 dice REQUENA con la letra firme, la última vez que esa letra salió firme. El de 1927 está en blanco.',
        denunciar: 'La copia llega hasta 1925 y ahí se termina, porque el libro se fue antes de que hubiera un renglón de 1926 que copiar. Delfina dejó los dos renglones siguientes rayados y vacíos, por las dudas.',
        ninguno: 'El renglón de 1926 dice REQUENA. Aurelio lo pintó esa misma noche, después de que vos te subieras al tren, y no porque lo hubieras convencido: no le dijiste nada. El de 1927 está en blanco.',
      };

      return {
        texto: [
          ...procedencia,
          renglon1926[rama],
          'Y arriba de todo eso, lo de siempre, que este año se lee distinto: tres renglones tachados y reescritos con el otro apellido —1852, 1878, 1904—. Alguien no pudo, y el otro fue.',
          'Y la primera página, antes de 1841, sin años: nueve apellidos con letra más vieja que el libro, siete de los cuales no existen en este pueblo ni existieron nunca. «Los que quedan. Que se sepa que quedaron pocos y que ninguno quiso».',
        ],
        documento: {
          id: 'doc-turnos',
          how: rama === 'denunciar'
            ? 'copiado a mano por Delfina Arce antes de que el original saliera del pueblo'
            : 'estaba en el cajón, que este año no tiene llave',
        },
        exposicion: { amount: 2, source: 'libro:1927', cause: 'ochenta y seis renglones y una página anterior a todos' },
      };
    },
  },

  {
    id: 'fechar-tachadura',
    // HISTORIA. Ubicar un objeto, un estilo o una costumbre en su época es la
    // definición exacta de la habilidad, y acá lo que hay que fechar no es el
    // renglón —el renglón trae el año escrito— sino la TACHADURA: cuándo se
    // hizo, con qué tinta, y si la hizo la misma mano que escribió abajo.
    // Haberlo oído contar los tres años dormido da un dado: ya no hay que
    // revisar ochenta y seis renglones buscando cuál mirar, hay que mirar
    // tres. Es el primer eslabón del bucle que sostiene la aventura: lo que
    // se averigua despierto hace más fácil lo que se averigua dormido, y al
    // revés.
    prueba: (s) => ({
      skill: 'historia', difficulty: 'regular',
      reason: 'fechar tres tachaduras por la tinta y el trazo, no por lo que dicen',
      stakes_success: 'saber cuándo se tachó cada una y con qué mano',
      stakes_failure: 'tres renglones tachados, y la fecha que ellos mismos declaran',
      ...(pista(s, 'repite una secuencia')
        ? { bonus_dice: 1, modifier_reason: 'sabés exactamente qué tres renglones mirar' }
        : {}),
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Ponés la hoja contra la ventana. Las tachaduras no son iguales entre sí, y eso ya es una información antes de mirar ninguna.',
        tirada?.exito
          ? 'La de 1852 se tachó de inmediato: misma tinta, mismo día, misma mano. Alguien se equivocó al anotar y lo corrigió antes de que se secara.'
          : 'Tres renglones tachados con tinta parecida y reescritos con el otro apellido. Los años que declaran son 1852, 1878 y 1904, y no hay mucho más que sacarle a una tachadura mirándola así, a simple vista.',
        tirada?.exito
          ? 'La de 1904 se tachó después, con tinta de otro frasco, pero con la misma letra que escribió los renglones de esa década: alguien enmendó su propia anotación semanas o meses más tarde, sin apuro, como quien corrige un asiento.'
          : '',
        tirada?.exito
          ? 'La de 1878 no se parece a ninguna de las dos. La tinta es más negra y más nueva que todo lo que la rodea: se tachó años después, no meses. Y la mano que la tachó no es la mano que llevaba el libro en 1878. Es la segunda letra, la que arranca en 1889. Alguien esperó once años y recién entonces volvió a esa página a cambiar el apellido de un renglón que ya estaba escrito.'
          : '',
      ].filter(Boolean),
      // Misma regla que Primeros Auxilios: la pista que abre la puerta de la
      // segunda noche no puede depender de acertar Historia. La primera es
      // INCONDICIONAL —lo que se ve a simple vista, sin instrumental— y
      // alcanza para seguir. La segunda, con el fechado exacto de la tinta,
      // sólo llega acertando, y es la que de verdad premia la tirada.
      pistas: [
        {
          description: 'Vio de cerca los tres renglones tachados del libro —1852, 1878 y 1904— reescritos con el otro apellido.',
          kind: 'physical' as const, source: 'el libro de turnos', reliability: 'reliable' as const,
        },
        ...(tirada?.exito ? [{
          description: 'La tachadura de 1878 se hizo once años después, con otra tinta y con la mano que empezó a llevar el libro en 1889. Las de 1852 y 1904 son correcciones normales, hechas en el momento o poco después. La de 1878 es alguien volviendo a esa página a propósito.',
          kind: 'documentary' as const, source: 'el libro de turnos', reliability: 'reliable' as const,
        }] : []),
      ],
      ...(tirada?.exito ? {
        contradiccion: {
          description: 'Un renglón de 1878 que estaba bien escrito se corrigió recién en 1889, cuando ya nadie podía discutir quién había ido esa noche.',
          between: 'la fecha del renglón / la fecha de la tinta',
        },
      } : {}),
    }),
  },

  {
    // UN TEMA DE CONVERSACIÓN NO PUEDE ENTREGAR UN DOCUMENTO: `EfectoTema` deja
    // cambiar la actitud, dejar una pista y revelar un secreto, y nada más. Que
    // Delfina cuente lo que encontró y que el papel quede en la carpeta del
    // investigador son dos actos distintos, y el segundo necesita una escena.
    // Sin esto, el documento existía declarado y no se entregaba nunca —lo
    // encontró la auditoría de alcanzabilidad, no una partida—.
    id: 'leer-parroquial',
    // La respuesta no puede llegar en el mismo turno en que se pidió —eso era
    // el bug: «vuelva mañana» y la información ya estaba en la mano—. Esta
    // escena es la visita SIGUIENTE, aparte de aquella en que se le pidió que
    // investigara, y sólo entonces entrega lo que encontró. `d-1878` hizo
    // pasar el reloj del mundo; esta escena es la que hace pasar al jugador
    // por el gesto de volver a preguntar.
    resolver: () => ({
      texto: [
        'Delfina levanta la vista de la carpeta antes de que termines de preguntar.\n\n—Fui. Encontré algo, no sé si es lo que busca, pero es algo.',
        'Desata el hilo y te da dos hojas copiadas a mano para que las leas vos, que es su manera de no leerlas otra vez.',
        'Un bautismo de 1856 y una nota al margen de 1881 que no es un acta de defunción y que está escrita como se escriben las cosas que hay que dejar dichas y no tienen casillero.',
        'Y al pie, con lápiz y con la letra de ella, la línea que no está en el original: que en el padrón de 1881 la casa de los Requena figura con una persona más de las que declara.',
      ],
      documento: { id: 'doc-parroquial', how: 'copiado del curato de Del Valle por Delfina Arce' },
      exposicion: { amount: 2, source: 'parroquial:1881', cause: 'un hombre sin defunción y sin ausencia' },
      pistas: [{
        description: 'Delfina copió del curato de Del Valle el bautismo de Benicio Requena y una nota marginal de 1881: no consta defunción, la familia lo da por ausente desde junio de 1878, y el padrón de 1881 declara una persona menos de las que hay en la casa.',
        kind: 'documentary' as const, source: 'la carpeta de Delfina, después del viaje a Del Valle', reliability: 'reliable' as const,
      }],
    }),
  },

  {
    // LA VIGILIA QUE SÓLO EXISTE DESPUÉS DE LA SEGUNDA NOCHE.
    //
    // Es el eslabón que faltaba: entre el sueño 2 y el sueño 3 no había NADA
    // obligatorio del mundo despierto, así que quien había investigado todo
    // antes de dormir encadenaba 2 → 3 → desenlace de tres clicks seguidos.
    // Reportado jugando, dos veces.
    //
    // No se puede hacer antes: hay que haberle visto la cara al que escribe
    // en la escribanía del sueño para poder buscarla en una foto de 1880. Y
    // obliga a un viaje real —la foto está en la escuela, el sueño pasa en la
    // escribanía—, que es exactamente la ida y vuelta que se pidió.
    //
    // Sin tirada, a propósito: reconocer una cara que se acaba de ver no es
    // una habilidad, es memoria. Lo que cambia con lo que ya se sabe no es si
    // se reconoce, sino qué significa haberlo reconocido.
    id: 'foto-otra-vez',
    resolver: ({ estado }) => {
      const sabeDeBenicio = pista(estado, 'Benicio Requena') || pista(estado, 'volvió a despertarse bien');
      return {
        texto: [
          'Volvés a la escuela con una sola cosa en la cabeza, y Delfina te deja la pared para vos sin preguntar nada.',
          'La foto de la comisión del centenario, catorce hombres formados en dos filas delante de una escuela recién levantada. La punta izquierda de la fila de atrás. El movido.',
          'Es la misma cara. No parecida: la misma. La del hombre de veintiún años que corrió la silla medio paso y te preguntó si ya estabas anotado, hace unas horas, en una escribanía que tenía cintas de colores que todavía no existen.',
          sabeDeBenicio
            ? 'Y ahora el nombre también entra donde va. Benicio Requena, veintiuno en 1878, dos años y medio levantándose de noche, y después una familia que dijo que se había ido a Bahía. La foto es de 1880: la sacaron cuando él ya llevaba dos años sin despertarse bien, y lo pusieron en la fila igual, con los otros trece, y salió movido de la única manera en que puede salir movido alguien que está y no está.'
            : 'De quién es la cara, no sabés. Sabés que es de 1880, que estaba en esa fila, y que anoche te habló. Falta el nombre, y el nombre no está en la foto: al pie sólo dice «Comisión pro-templo y escuela, Villa Requena, 1880».',
          'Delfina te mira la cara y no pregunta. Te dice, nada más: —Vuelva a la noche, entonces.',
        ],
        exposicion: { amount: 4, source: 'foto:reconocimiento', cause: 'reconocer en 1880 una cara vista anoche' },
        estabilidad: { amount: -3, cause: 'que la cara de un sueño esté en una fotografía de hace cuarenta y siete años' },
        pistas: [{
          description: sabeDeBenicio
            ? 'El de la punta izquierda de la foto de 1880 es la misma cara del que escribe en la escribanía del sueño: Benicio Requena, que en 1880 ya llevaba dos años sin despertarse bien y salió movido igual.'
            : 'El de la punta izquierda de la foto de 1880 es la misma cara del que escribe en la escribanía del sueño. Falta ponerle nombre.',
          kind: 'physical' as const, source: 'la foto de la comisión, mirada de nuevo', reliability: 'reliable' as const,
        }],
        contradiccion: {
          description: 'Un hombre fotografiado en 1880 en Villa Requena tiene la misma cara, y la misma edad, que el que escribe el libro en el sueño de 1927.',
          between: 'la foto de 1880 / la segunda noche',
        },
      };
    },
  },

  {
    id: 'mirar-foto',
    // FOTOGRAFÍA. Leer, fechar o interpretar una imagen. Sin la habilidad se
    // ve un borroso; con ella se ve QUÉ CLASE de borroso, que es otra cosa.
    prueba: () => ({
      skill: 'fotografia', difficulty: 'regular',
      reason: 'distinguir un movimiento de un defecto de placa',
      stakes_success: 'saber qué clase de borroso es',
      stakes_failure: 'catorce hombres quietos y uno movido',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Catorce hombres de galera en dos filas, delante de una escuela recién levantada. Al pie, a mano: «Comisión pro-templo y escuela, Villa Requena, 1880».',
        tirada?.exito
          ? 'El de la punta izquierda de la fila de atrás está movido, y no es la placa: los otros trece tienen el mismo grano y él tiene el contorno abierto hacia un solo lado. Eso no lo hace alguien que respira. Lo hace alguien que cambió de lugar y volvió durante la exposición.'
          : 'El de la punta izquierda de la fila de atrás salió movido. Con veinte segundos de pose siempre sale alguno movido; eso lo sabe cualquiera que haya posado alguna vez.',
        tirada?.exito
          ? 'Y hay un detalle que da vuelta el asunto: los pies le salieron nítidos. Perfectamente firmes, los dos, plantados en el mismo pasto que los otros trece. Lo que se movió fue todo lo que está más arriba de los tobillos.'
          : '',
      ].filter(Boolean),
      exposicion: tirada?.exito
        ? { amount: 4, source: 'foto:1880', cause: 'lo que hizo un hombre durante veinte segundos en 1880' }
        : { amount: 1, source: 'foto:1880', cause: 'una foto de comisión de 1880' },
      ...(tirada?.exito ? {
        descubre: {
          itemId: 'it-foto', propertyId: 'p-foto-borroso',
          how: 'mirando el grano de la placa hombre por hombre',
        },
        pistas: [{
          description: 'En la foto de la comisión de 1880 hay un hombre cuyo cuerpo salió movido y cuyos pies salieron nítidos. No es un defecto de la placa: durante los veinte segundos de exposición estuvo firme y no estuvo.',
          kind: 'physical' as const, source: 'la foto de la comisión', reliability: 'reliable' as const,
        }],
      } : {}),
    }),
  },

  {
    id: 'mirar-almagre',
    // OCULTISMO, no Ciencias Naturales: lo que hay que reconocer no es de qué
    // está hecha la mezcla —eso pide un laboratorio— sino que la mezcla ES una
    // preparación, que alguien la compone a propósito y que la proporción se
    // sostiene sin cambiar desde antes del pueblo.
    prueba: (s) => (s.items['it-almagre']?.discoveredProperties.length ?? 0) > 0 ? null : ({
      skill: 'ocultismo', difficulty: 'regular',
      reason: 'reconocer si esto es tierra colorada o una preparación',
      stakes_success: 'ver que alguien la compone, y con qué criterio',
      stakes_failure: 'un tarro de tierra roja con una brocha adentro',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'El tarro está abierto y la brocha tiene la cerda apelmazada de este invierno. Nadie lo guardó bien.',
        tirada?.exito
          ? 'Contra la luz de la ventana, el polvo rojo no es un solo polvo. Hay una fracción más clara y más fina, molida aparte y mezclada después, y no está repartida al azar: está en la misma proporción en la costra vieja del fondo que en la cerda de este año.'
          : 'Tierra colorada molida, del color de la sangre vieja. Nada que un tarro de pintura de campo no tenga.',
        tirada?.exito
          ? 'Eso quiere decir que la mezcla no se improvisa. Que alguien la compone, que la compuso siempre igual, y que la receta sobrevivió a las cuatro manos que llevaron el libro y a los nueve apellidos de la primera página. La costumbre no es pintar. La costumbre es preparar esto y después pintar con esto.'
          : '',
      ].filter(Boolean),
      ...(tirada?.exito ? {
        descubre: {
          itemId: 'it-almagre', propertyId: 'p-almagre-molido',
          how: 'mirando el polvo contra la luz en vez de mirar el color',
        },
        exposicion: { amount: 3, source: 'almagre:mezcla', cause: 'una receta que no cambió en ochenta y seis años' },
        pistas: [{
          description: 'El almagre no es sólo tierra colorada: lleva mezclado un mineral más fino, molido aparte, en una proporción que es la misma en la costra vieja del fondo que en la brocha de este año.',
          kind: 'physical' as const, source: 'el tarro de la escribanía', reliability: 'reliable' as const,
        }],
      } : {}),
    }),
  },

  // ══ LAS TRES NOCHES ═════════════════════════════════════════════════════════
  //
  // Tres escenas, no tres localizaciones. Ver la cabecera del archivo: un sueño
  // no se recorre con botones de «ir a», y hacerlo así habría pedido cambios de
  // motor para conseguir algo peor.
  //
  // Cada noche se parte en DOS pasos, no uno —dormir ya no es «un click, un
  // párrafo, un dado»—: primero una escena de entrada, sin tirada, que planta
  // al jugador en el sueño y ofrece dos ángulos distintos; después una de dos
  // escenas de acercamiento, cada una con su propia tirada y su propia
  // habilidad, que convergen en la MISMA pista de cierre. Reportado jugando:
  // la versión de un solo botón por noche era, literalmente, tres clicks
  // seguidos con una tirada automática de por medio —no había nada que
  // decidir, sólo mirar el resultado—. Elegir el ángulo no cambia si se
  // avanza (ninguna de las dos opciones bloquea a la otra), cambia CÓMO se
  // avanza y qué habilidad del investigador entra en juego.

  {
    id: 'dormir-uno',
    resolver: () => ({
      texto: [
        'Apoyás la mano en el tarro abierto —no hace falta más que eso, y no sabés cómo lo sabés— y te sentás en el piso, contra la pared del archivo, al lado del catre. El brasero se apaga en algún momento y no lo ves apagarse.',
        'La plaza está ahí. Es la plaza: las dos tipas, el almacén, la escribanía en la esquina. Lo que no está es la hora. No es de noche ni de día; es la luz que hay cuando todavía no se decidió.',
        'Alrededor del brocal hay gente dando la vuelta caminando, uno atrás del otro, en fila, sin apuro. Son muchos más de los que entran en este pueblo. Cada uno se agacha, hace algo en el ladrillo, y sigue caminando para que se agache el que viene atrás.',
        'Ninguno tiene cara. No es que estén borrosos: es que no los estás mirando de frente ni una sola vez, por más que gires la cabeza.',
        'Podés acercarte a mirarlos de cerca, o quedarte donde estás y buscar tu propio lugar en la fila.',
      ],
      pistas: [{
        description: 'Entró al sueño y ve la fila dar la vuelta, sin haberse acercado todavía.',
        kind: 'experiential' as const, source: 'la primera noche', reliability: 'unknown' as const,
      }],
    }),
  },

  {
    id: 'ronda-mirar',
    // ANTROPOLOGÍA. Lo que hay que leer no es un objeto ni una persona: es una
    // costumbre en acto. Interpretar tabúes y marcadores de un grupo es la
    // definición de la habilidad, y acá el grupo lleva ochenta y seis años
    // haciendo lo mismo sin explicárselo a nadie.
    // ANTROPOLOGÍA es cara —ninguna ficha pregenerada la trae, así que sale
    // en base 1— y por eso NO GATEA NADA: la pista de cierre se entrega
    // igual, falle o acierte. Lo que cambia con el éxito es qué se entendió,
    // no si se puede seguir. Haber leído el libro antes da un dado, porque
    // saber que hay ochenta y seis renglones cambia lo que significa una fila.
    prueba: (s) => ({
      skill: 'antropologia', difficulty: 'regular',
      reason: 'leer una costumbre mientras se está haciendo, sin nadie a quien preguntarle',
      stakes_success: 'entender qué clase de acto es el que estás viendo',
      stakes_failure: 'gente dando vueltas alrededor de un pozo',
      ...(documento(s, 'doc-turnos')
        ? { bonus_dice: 1, modifier_reason: 'leíste los ochenta y seis renglones antes de ver la fila' }
        : {}),
    }),
    resolver: ({ tirada, estado }) => ({
      texto: [
        'Te acercás a la fila.',
        caminoLaLineaAntes(estado)
          ? 'Y antes de decidir nada ya los estás contando, porque desde el alambrado del oeste no podés tener una fila delante y no contarla. Llegás a ciento y pico y perdés la cuenta, y esta vez no es por distracción: es que los que ya pasaron vuelven a pasar, y no hay manera de decidir si el que viene es uno nuevo o el mismo otra vez.'
          : '',
        tirada?.exito
          ? 'Y ahí lo entendés, porque lo tenés delante: esto no es un rito. No hay canto, no hay orden de precedencia, nadie mira a nadie, nadie corrige a nadie. Es una GUARDIA. Es gente haciendo un turno, uno atrás del otro, y la fila no avanza hacia ningún lado: da la vuelta y vuelve a empezar, y el que terminó se vuelve a poner al final.'
          : 'Mirás la fila un rato largo tratando de encontrarle el orden. No se lo encontrás. Van, se agachan, siguen, vuelven a pasar. Podría ser una procesión, podría ser una cola de gente esperando algo.',
        tirada?.grado === 'extreme' || tirada?.grado === 'critical'
          ? 'Y hay una cosa más, que en la fila se ve y despierto no se vería nunca: no todos van hacia el mismo lado. Una parte de la fila viene de atrás y otra parte viene de adelante, y en el punto donde se cruzan nadie se choca porque no están del todo en el mismo lugar. Los que vienen de adelante todavía no nacieron.'
          : '',
        ...cierreNocheUno,
      ].filter(Boolean),
      exposicion: { amount: 7, source: 'sueno:ronda', cause: 'la ronda del brocal, del lado de adentro' },
      estabilidad: { amount: -4, cause: 'una fila que no avanza hacia ningún lado' },
      pistas: [{
        description: tirada?.exito
          ? 'En la ronda del brocal la gente no celebra nada: hace una guardia. Se turnan, uno atrás del otro, y el que termina vuelve a ponerse al final de la fila. Son muchos más de los que caben en el pueblo, y ninguno se deja ver la cara.'
          : 'En la ronda del brocal hay una fila de gente dando la vuelta al aljibe, agachándose de a uno. Son muchos más de los que caben en el pueblo, y ninguno se deja ver la cara.',
        kind: 'experiential' as const, source: 'la primera noche', reliability: 'unknown' as const,
      }],
      // Sólo si ya escuchó los tres años puede atar la fila con el libro. Si
      // no, la ronda es una imagen suelta y espantosa y nada más.
      ...(pista(estado, 'repite una secuencia') ? {
        jugadorNota: {
          statement: 'La fila da la vuelta y el que terminó se pone al final. Un turno que vuelve a empezar es exactamente lo que registra el libro de la escribanía, renglón por renglón, desde 1841. Su investigador todavía no dijo eso en voz alta.',
          source: 'la primera noche',
          reliability: 'unknown' as const,
        },
      } : {}),
    }),
  },

  {
    id: 'ronda-buscar',
    // El ángulo alternativo: en vez de leer la costumbre desde afuera
    // (Antropología), la pregunta se vuelve personal. VOLUNTAD/POD, no una
    // habilidad —el investigador ya está anotado en un libro real, y buscarse
    // en éste es la primera vez que el sueño le pregunta algo A ÉL, no sobre
    // el pueblo—.
    prueba: () => ({
      skill: 'POW', difficulty: 'regular',
      reason: 'sostener la pregunta de si hay un lugar ahí que sea el tuyo',
      stakes_success: 'encontrar un hueco que te queda',
      stakes_failure: 'no encontrar nada, y no saber qué significa eso',
    }),
    resolver: ({ tirada, estado }) => ({
      texto: [
        'Te quedás donde estás y mirás la fila buscando un hueco que te quede. No tiene ningún sentido —es gente dando vueltas, no hay lugares fijos en una fila que gira— y buscás igual.',
        caminoLaLineaAntes(estado)
          ? 'Y contás mientras buscás, porque desde el alambrado del oeste contás siempre. Acá la cuenta falla de una manera nueva: la fila da la vuelta, así que no hay un primero ni hay un último, y una cuenta sin primero no se puede ni empezar. Es la primera vez desde La Perseverancia que no podés contar algo, y por un segundo eso te alivia.'
          : '',
        tirada?.exito
          ? 'Y lo encontrás. Entre el séptimo y el octavo de la fila hay un hueco del ancho exacto de tus hombros, y nadie lo ocupa, como si estuviera guardado. No sabés desde cuándo. No sabés si desde antes de que llegaras al pueblo la primera vez, o desde esta tarde.'
          : 'No encontrás nada. Ningún hueco, ningún lugar que sea el tuyo. Debería tranquilizarte y no te tranquiliza: no saber si estás afuera de esto, o si todavía no te tocó.',
        ...cierreNocheUno,
      ].filter(Boolean),
      exposicion: { amount: 7, source: 'sueno:ronda', cause: 'la ronda del brocal, buscando su propio lugar' },
      estabilidad: { amount: -5, cause: 'preguntarse si hay un lugar ahí que sea suyo' },
      pistas: [
        {
          description: 'En la ronda del brocal hay una fila de gente dando la vuelta al aljibe, agachándose de a uno. Son muchos más de los que caben en el pueblo, y ninguno se deja ver la cara.',
          kind: 'experiential' as const, source: 'la primera noche', reliability: 'unknown' as const,
        },
        ...(tirada?.exito ? [{
          description: 'Buscó su propio lugar en la fila del sueño y lo encontró: un hueco del ancho de sus hombros, que nadie ocupa, guardado.',
          kind: 'experiential' as const, source: 'la primera noche', reliability: 'unknown' as const,
        }] : []),
      ],
      ...(pista(estado, 'repite una secuencia') ? {
        jugadorNota: {
          statement: 'La fila da la vuelta y el que terminó se pone al final. Un turno que vuelve a empezar es exactamente lo que registra el libro de la escribanía, renglón por renglón, desde 1841. Su investigador todavía no dijo eso en voz alta.',
          source: 'la primera noche',
          reliability: 'unknown' as const,
        },
      } : {}),
    }),
  },

  {
    id: 'dormir-dos',
    resolver: () => ({
      texto: [
        'La segunda vez es más rápido. Apoyás la mano y ya está: no hay plaza, hay escribanía.',
        'Es ésta y no es ésta. El mostrador está, el roble está, el brasero está encendido con un fuego que no calienta. Los legajos de las paredes son los mismos legajos y las cintas son de colores que no existen todavía.',
        'Detrás del escritorio hay un hombre joven escribiendo en el libro. Veintiún años, la ropa de otro siglo, y el pulso perfecto de alguien descansado. No levanta la vista cuando entrás, pero corre la silla medio paso, que en esta familia es una invitación.',
        'El cajón del medio está abierto y adentro están las cuatro hojas cosidas con hilo de bramante. Y hay una quinta, suelta, que no está cosida a las otras y que nunca estuvo en ningún cajón del mundo despierto.',
        'Podés estirar la mano y agarrar la hoja para leerla, o preguntarle quién es antes de tocar nada.',
      ],
      pistas: [{
        description: 'Entró a la escribanía del sueño y ve al joven escribiendo, sin haber tocado la hoja todavía.',
        kind: 'experiential' as const, source: 'la segunda noche', reliability: 'unknown' as const,
      }],
    }),
  },

  {
    id: 'hoja-agarrar',
    // OCULTISMO otra vez, y a propósito: es la segunda vez que se le pide, y
    // la primera fue el tarro. Quien invirtió en esta habilidad la ve rendir
    // dos veces en la misma historia; quien no, pierde las dos y llega igual
    // al final, con menos en la mano.
    // Acertar acá no abre el desenlace de cambiarse por él —eso lo abre saber
    // lo de Benicio, que se consigue con Persuasión, Intimidar o Uso de
    // Bibliotecas, que sí están en las fichas—; lo que abre es SABER QUÉ ESTÁS
    // FIRMANDO cuando llegue el momento, que es otra cosa y se nota en el
    // texto del final.
    //
    // Los dos dados de bonificación son el pago del trabajo de vigilia: haber
    // mirado el polvo del tarro contra la luz, y haber visto qué clase de
    // borroso hay en la foto de 1880. El motor los capea en dos (CoC 7e).
    //
    // Un tercer origen posible, de otra aventura: en La Firma Ajena hubo que
    // decidir si un papel decía la verdad sobre quién era alguien. Es la
    // misma pregunta que hace la quinta hoja, y ese ojo no se desentrena
    // entre aventuras. Con los dos de vigilia ya puestos, este tercero no
    // suma nada mecánico —el tope sigue en dos— pero le da a alguien que no
    // hizo el trabajo de vigilia una razón distinta para llegar igual.
    prueba: (s) => {
      const razones: string[] = [];
      let bonus = 0;
      if ((s.items['it-almagre']?.discoveredProperties.length ?? 0) > 0) {
        bonus += 1; razones.push('venís de mirar de cerca lo que nadie mira de cerca');
      }
      if ((s.items['it-foto']?.discoveredProperties.length ?? 0) > 0) {
        bonus += 1; razones.push('ya viste qué clase de borroso hay en la foto');
      }
      if (juzgoUnaIdentidadAntes(s)) {
        bonus += 1; razones.push('ya tuviste que decidir, una vez, si un papel decía la verdad sobre quién era alguien');
      }
      return {
        skill: 'ocultismo', difficulty: 'regular',
        reason: 'reconocer si lo que hay escrito en la quinta hoja es una lista, una fórmula o un dibujo',
        stakes_success: 'saber qué clase de cosa estás leyendo',
        stakes_failure: 'una hoja más, y no poder decir de qué',
        ...(bonus > 0
          ? { bonus_dice: bonus, modifier_reason: razones.join('; ') }
          : {}),
      };
    },
    resolver: ({ tirada, estado }) => ({
      texto: [
        'La levantás.',
        tirada?.exito
          ? 'No es una explicación ni una instrucción: es una LISTA. Nombres, en columnas, con una marca al lado de cada uno, en la misma letra que escribió los nueve apellidos de la primera página del libro. Es larguísima. Sigue en el reverso y sigue después del reverso, de una manera que una hoja no puede seguir.'
          : 'Está escrita de arriba abajo y no podés decir qué es. Las letras son letras. Las palabras podrían ser palabras. Lo mirás el tiempo suficiente como para saber que mirarlo más no va a servir de nada.',
        tirada?.exito
          ? 'Y las marcas del costado no son todas iguales. La mayoría es un trazo simple. Unas pocas son un trazo cerrado sobre sí mismo, un círculo, y ésas están agrupadas: no salteadas, agrupadas, como si en ciertos años hubiera pasado algo distinto varias veces seguidas.'
          : '',
        tirada?.exito && juzgoUnaIdentidadAntes(estado)
          ? 'Y algo en el modo en que se agrupan esas marcas te resulta conocido de una manera que no tiene nada que ver con el sueño: ya tuviste que mirar así de cerca un papel, una vez, para decidir si decía la verdad sobre quién era alguien.'
          : '',
        tirada?.grado === 'extreme' || tirada?.grado === 'critical'
          ? 'Y muy abajo, tan abajo que llegar ahí te lleva un tiempo que no tenés, hay tres renglones seguidos con el círculo al lado, y uno de los tres es un apellido que conocés. Los otros dos no. Todavía no.'
          : '',
        ...cierreNocheDos,
      ].filter(Boolean),
      exposicion: { amount: 8, source: 'sueno:quinta-hoja', cause: 'una hoja que no está cosida a las otras' },
      estabilidad: { amount: -5, cause: 'que alguien de 1878 pregunte si uno ya está anotado' },
      cordura: {
        amount: 3,
        cause: 'la quinta hoja, y la pregunta del que la estaba escribiendo',
      },
      pistas: [{
        description: tirada?.exito
          ? 'En el sueño de la escribanía hay una quinta hoja, la que no está cosida a las otras cuatro: una lista de nombres con una marca al lado de cada uno, en la letra de la primera página del libro. Unas pocas marcas son un círculo, y esas pocas están agrupadas.'
          : 'En el sueño de la escribanía hay una quinta hoja, la que no está cosida a las otras cuatro. Está escrita entera y no hay manera de decir qué es lo que dice.',
        kind: 'experiential' as const, source: 'la segunda noche', reliability: 'unknown' as const,
      }, {
        description: 'El que escribe el libro en el sueño es un hombre de veintiún años con ropa de otro siglo, y tiene la cara del hombre movido de la foto de 1880. Pregunta si uno ya está anotado.',
        kind: 'experiential' as const, source: 'la segunda noche', reliability: 'unknown' as const,
      }],
      ...(documento(estado, 'doc-parroquial') || pista(estado, 'Benicio Requena')
        ? {
          contradiccion: {
            description: 'Benicio Requena está en un asiento de 1856 como bautizado, en una nota de 1881 como ausente sin defunción, en una foto de 1880 movido de una manera que no hace un cuerpo, y en la escribanía del sueño escribiendo con pulso de descansado.',
            between: 'lo que dice el curato / lo que hay en la segunda noche',
          },
        }
        : {}),
    }),
  },

  {
    id: 'hoja-preguntar',
    // El ángulo alternativo: en vez de leer el papel (Ocultismo), leer a la
    // PERSONA. Psicología —leer intención y sinceridad— nunca se había usado
    // en esta aventura todavía y encaja mejor acá que en cualquier otro lado:
    // lo que hay que juzgar no es si miente, es qué clase de cosa quedó de
    // alguien que dejó de tener adónde ir.
    prueba: () => ({
      skill: 'psicologia', difficulty: 'regular',
      reason: 'leer qué clase de respuesta es un silencio, o una frase sin rencor',
      stakes_success: 'entender qué quedó de él, más allá de lo que dice',
      stakes_failure: 'un silencio que dura demasiado, y nada más',
    }),
    resolver: ({ tirada, estado }) => ({
      texto: [
        'Le preguntás quién es, antes de tocar nada. La pluma no se detiene.',
        tirada?.exito
          ? 'Pero contesta, sin levantar la vista.\n\n—Eso ya lo sabe usted, si llegó hasta acá —dice—. Lo raro no es quién soy yo. Lo raro es que a usted todavía le importe.\n\nY algo en cómo lo dice —sin rencor, sin tristeza, sin nada que se le parezca— te dice más de lo que dice: no es que esté enojado ni resignado. Es, simplemente, lo que quedó de alguien que dejó de tener adónde ir.'
          : 'No contesta nada. Sigue escribiendo, y el silencio dura tanto que empezás a preguntarte si dijiste algo en voz alta.',
        ...cierreNocheDos,
      ].filter(Boolean),
      exposicion: { amount: 8, source: 'sueno:quinta-hoja', cause: 'una hoja que no está cosida a las otras' },
      estabilidad: { amount: -5, cause: 'que alguien de 1878 pregunte si uno ya está anotado' },
      cordura: {
        amount: 3,
        cause: 'la quinta hoja, y la pregunta del que la estaba escribiendo',
      },
      pistas: [
        {
          description: 'En el sueño de la escribanía hay una quinta hoja, la que no está cosida a las otras cuatro. Está escrita entera y no hay manera de decir qué es lo que dice.',
          kind: 'experiential' as const, source: 'la segunda noche', reliability: 'unknown' as const,
        },
        {
          description: 'El que escribe el libro en el sueño es un hombre de veintiún años con ropa de otro siglo, y tiene la cara del hombre movido de la foto de 1880. Pregunta si uno ya está anotado.',
          kind: 'experiential' as const, source: 'la segunda noche', reliability: 'unknown' as const,
        },
        ...(tirada?.exito ? [{
          description: 'El joven de la escribanía del sueño no contesta con rencor ni con tristeza: contesta como quien dejó de tener adónde ir. No parece sufrir estar ahí, y eso es peor que si sufriera.',
          kind: 'experiential' as const, source: 'la segunda noche', reliability: 'unknown' as const,
        }] : []),
      ],
      ...(documento(estado, 'doc-parroquial') || pista(estado, 'Benicio Requena')
        ? {
          contradiccion: {
            description: 'Benicio Requena está en un asiento de 1856 como bautizado, en una nota de 1881 como ausente sin defunción, en una foto de 1880 movido de una manera que no hace un cuerpo, y en la escribanía del sueño escribiendo con pulso de descansado.',
            between: 'lo que dice el curato / lo que hay en la segunda noche',
          },
        }
        : {}),
    }),
  },

  {
    id: 'dormir-tres',
    resolver: ({ estado }) => ({
      texto: [
        'La tercera vez no te dormís: te acostás al lado del catre con la mano en el tarro y esperás, y en algún momento la espera es otra cosa sin que haya habido un límite.',
        'La plaza otra vez, y la fila otra vez, pero esta vez la fila se abre. No para dejarte pasar: se abre porque vos vas hacia el brocal y ellos no.',
        'La chapa no está. El brocal está destapado y el agua está arriba, a un palmo del borde, perfectamente quieta. En un aljibe que no se usa desde 1919 y que tiene el fondo seco.',
        'Te asomás. El reflejo tarda. Es una fracción de segundo, la que hay entre que movés la cabeza y que la cabeza del agua se mueve, y en esa fracción tu reflejo se queda mirando el lugar donde estabas y después te alcanza.'
          + (enfrentoElAljibeAntes(estado)
            ? ' No es la primera vez que le conocés esa fracción a un agua quieta: la de Los Álamos tardaba lo mismo en devolverte el gesto. Esta vez, al menos, sabés qué es lo que tarda.'
            : selloElAljibeAntes(estado)
              ? ' Tapaste un aljibe una vez para no tener que volver a mirar esa agua. Este no tiene tapa que le puedas poner.'
              : ''),
        'Y abajo, del otro lado del agua, sentado en el borde interno del brocal como quien se sienta en el cordón de una vereda, está Aurelio Requena. Vestido. Con los zapatos puestos. Con las manos ocupadas.',
        'Podés hablarle, aunque no sepas si te escucha, o bajar en silencio, sin llamarlo.',
      ],
      exposicion: { amount: 5, source: 'sueno:fondo', cause: 'el fondo del brocal, visto desde arriba' },
      pistas: [{
        description: 'Bajó al brocal del sueño y ve a Aurelio del otro lado del agua, sin haber llegado hasta él todavía.',
        kind: 'experiential' as const, source: 'la tercera noche', reliability: 'unknown' as const,
      }],
    }),
  },

  {
    id: 'fondo-hablar',
    // PODER. No una habilidad: la característica. Lo que se pone en juego acá
    // no es saber ni notar ni convencer —eso ya se jugó en las dos noches
    // anteriores y en toda la vigilia— sino aguantar parado sabiendo lo que
    // ya sabés. Es la única tirada de la aventura que no se puede preparar
    // invirtiendo puntos en la ficha, en cualquiera de sus dos ángulos.
    prueba: () => ({
      skill: 'POW', difficulty: 'regular',
      reason: 'bajar sabiendo lo que sabés, y volver a subir',
      stakes_success: 'llegar hasta él y poder decidir',
      stakes_failure: 'llegar igual, y pagarlo',
    }),
    resolver: ({ tirada, estado }) => {
      const duro = !tirada?.exito;
      return {
        texto: [
          tirada?.exito
            ? 'Le hablás y esta vez sí levanta la cabeza. Tarda en enfocarte y cuando te enfoca hace un gesto raro, de vergüenza, como alguien a quien encuentran haciendo algo doméstico.\n\n—Ah —dice—. Vino. Le agradezco. —Y enseguida—: No baje.'
            : 'Le hablás y no levanta la cabeza, y el que la levanta es tu propio reflejo, que estaba mirando para otro lado y ahora te está mirando a vos con un interés que no le pusiste. Se te va el aire de una manera que no tiene que ver con el aire.',
          tirada?.exito
            ? '—Yo estoy bien acá. Está el turno hecho y no hay que discutir con nadie. Cincuenta y cuatro años preguntándome si servía, y acá abajo no hay que preguntarse nada, hay que hacerlo nomás.'
            : 'Aurelio dice algo sin levantar la cabeza. Le llegás a entender dos palabras de cada cinco y una de las dos es «anotado».',
          ...cierreNocheTres(estado),
        ].filter(Boolean),
        exposicion: { amount: duro ? 12 : 9, source: 'sueno:fondo', cause: 'el fondo del brocal, y lo que hay sentado ahí' },
        estabilidad: { amount: duro ? -9 : -6, cause: 'que se pueda bajar' },
        cordura: {
          amount: duro ? 6 : 4,
          cause: 'el reflejo que te alcanza tarde, y Aurelio sentado del otro lado',
          crisis: {
            nombre: 'El retardo del reflejo',
            descripcion: 'Desde entonces, cualquier superficie que refleje te obliga a comprobar. No es que creas que va a pasar: es que ya no podés pasar al lado de un vidrio sin darle a tu propia imagen el tiempo de llegar.',
            tipo: 'phobia' as const,
            afecta: [{ skill: 'descubrir', dados: 1 }],
          },
        },
        pistas: [{
          description: 'Lo encontró en el fondo del brocal, del otro lado del agua, sentado en el borde interno con el turno hecho y algo abierto entre las manos. Dice que está bien ahí. Se puede bajar; subir es otro asunto.',
          kind: 'experiential' as const, source: 'la tercera noche', reliability: 'unknown' as const,
        }],
        ...notaDeLasVecesQueSeFue(estado),
        consecuencia: {
          description: 'El investigador bajó tres veces al sueño de Villa Requena usando el almagre, y la tercera vez llegó hasta el fondo del brocal.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Sabe cómo se entra. Eso no se olvida y no hace falta el tarro dos veces.',
        },
      };
    },
  },

  {
    id: 'fondo-bajar',
    // El ángulo alternativo: no hablarle, bajar. SIGILO —nunca usado antes en
    // esta aventura— en vez de POD: la apuesta no es sostener la mirada, es
    // no perturbar nada mientras te acercás. El riesgo cambia de forma, no de
    // tamaño: fallar acá no es que te vea de lejos, es que note que llegaste
    // sin haber dicho nada, que es peor.
    prueba: () => ({
      skill: 'sigilo', difficulty: 'regular',
      reason: 'bajar sin que la fila de arriba reaccione y sin que él se sobresalte',
      stakes_success: 'llegar cerca sin que nada cambie todavía',
      stakes_failure: 'que note que llegaste sin haber dicho nada',
    }),
    resolver: ({ tirada, estado }) => {
      const duro = !tirada?.exito;
      return {
        texto: [
          'No le decís nada. Bajás despacio, probando el pie antes de apoyarlo, como quien no quiere despertar a alguien que de todos modos no está durmiendo del todo.',
          tirada?.exito
            ? 'Y funciona, en el sentido en que cualquier cosa funciona acá: llegás hasta él sin que se sobresalte, sin que la fila de arriba reaccione, y desde cerca ves algo que de lejos no se veía. Tiene los ojos abiertos. Siempre los tuvo abiertos. Lo que faltaba no era que durmiera: era que alguien bajara a verlo con los ojos abiertos y no le tuviera miedo.'
            : 'El agua se mueve antes de que llegues, un círculo que no hiciste vos, y cuando volvés a mirar Aurelio ya te está mirando a vos. No hizo ruido. Vos tampoco. Y aun así los dos saben que ya no es un secreto que estás ahí.',
          ...cierreNocheTres(estado),
        ].filter(Boolean),
        exposicion: { amount: duro ? 12 : 9, source: 'sueno:fondo', cause: 'el fondo del brocal, y lo que hay sentado ahí' },
        estabilidad: { amount: duro ? -9 : -6, cause: 'que se pueda bajar' },
        cordura: {
          amount: duro ? 6 : 4,
          cause: 'el reflejo que te alcanza tarde, y Aurelio sentado del otro lado',
          crisis: {
            nombre: 'El retardo del reflejo',
            descripcion: 'Desde entonces, cualquier superficie que refleje te obliga a comprobar. No es que creas que va a pasar: es que ya no podés pasar al lado de un vidrio sin darle a tu propia imagen el tiempo de llegar.',
            tipo: 'phobia' as const,
            afecta: [{ skill: 'descubrir', dados: 1 }],
          },
        },
        pistas: [{
          description: 'Lo encontró en el fondo del brocal, del otro lado del agua, sentado en el borde interno con el turno hecho y algo abierto entre las manos. Dice que está bien ahí. Se puede bajar; subir es otro asunto.',
          kind: 'experiential' as const, source: 'la tercera noche', reliability: 'unknown' as const,
        }],
        ...notaDeLasVecesQueSeFue(estado),
        consecuencia: {
          description: 'El investigador bajó tres veces al sueño de Villa Requena usando el almagre, y la tercera vez llegó hasta el fondo del brocal.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Sabe cómo se entra. Eso no se olvida y no hace falta el tarro dos veces.',
        },
      };
    },
  },

  // ══ LOS TRES DESENLACES ═════════════════════════════════════════════════════
  //
  // Ninguno contesta si la obligación sirve (§15). Lo que cambia entre los tres
  // no es cuánto se averiguó: es quién termina cargando con lo averiguado.

  {
    id: 'fin-despertarlo',
    resolver: ({ estado }) => {
      const leyoLista = pista(estado, 'una lista de nombres con una marca al lado');
      const sabe1878 = pista(estado, 'Benicio Requena') || pista(estado, 'volvió a despertarse bien');
      return {
        texto: [
          'Le agarrás la muñeca y tirás para arriba, que es la única idea que se te ocurre y que no es ninguna idea.',
          'Pesa lo que pesa un hombre y después, un segundo entero, pesa muchísimo más. Y después deja de pesar.',
        ],
        estabilidad: { amount: -4, cause: 'haber decidido por otro que valía la pena volver' },
        consecuencia: {
          description: 'El investigador sacó a Aurelio Requena del sueño de Villa Requena. Aurelio despertó, y no volvió solo.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Aurelio Requena está despierto y sabe algo que ningún Requena supo en tres generaciones. No lo pidió y no puede devolverlo.',
        },
        desenlace: {
          id: 'despertar',
          title: 'Lo que se despierta',
          text: [
            'Aurelio Requena abrió los ojos a las cuatro y diez de la mañana del 12 de julio de 1927, en un catre armado en su propia escribanía, y lo primero que hizo fue pedir disculpas por el desorden.',
            'Comió esa mañana. Caminó a la semana. Volvió a atender en septiembre y firmó escrituras hasta 1939, que es mucho más de lo que dan las estadísticas de un hombre de cincuenta y cinco años que estuvo catorce días sin despertarse.',
            'Nunca más se levantó de noche.',
            leyoLista
              ? 'Lo que se trajo puesto tardó unos meses en notarse, y se notó primero en el trabajo: empezó a anotar. No los turnos —de eso no habló más— sino todo lo demás. Quién preguntaba por una marca, dónde, con qué palabras. Llenó cuatro carpetas finitas con cinta roja entre 1928 y 1939, y cuando le preguntaban para qué contestaba que para que quede, y cuando le preguntaban para que quede dónde no contestaba.'
              : 'Lo que se trajo puesto no se dejó ver de una vez. Se dejó ver en cosas chicas: en que sabía el nombre de gente que no conoció, en que fechaba los documentos sin mirar el almanaque, en que una vez, sin darse cuenta, corrigió a Delfina Arce sobre lo que decía una nota parroquial de 1881 que él nunca había leído.',
            sabe1878
              ? 'Ramona Sosa fue a verlo dos veces. La primera en agosto, con nueces. La segunda en octubre, sola, y estuvieron encerrados en la escribanía dos horas y media. Lo único que se supo de esa conversación lo dijo ella al salir, a nadie en particular: «Cuarenta y nueve años tarde».'
              : 'Ramona Sosa fue a verlo una sola vez, en agosto, con una bolsa de nueces que nadie había pedido, y no entró: se la dejó a Delfina en la puerta.',
            'A vos te agradeció por escrito, en una carta que llegó tres semanas después y que es la carta más incómoda que recibiste en tu vida, porque agradece de más y explica de menos y en el medio, sin conectarlo con nada, tiene una línea sola que dice: «El de veintiuno también quiso que lo sacaran. A mí me consta.»',
            'No aclara cómo le consta. Nunca lo aclaró.',
          ].join('\n\n'),
        },
      };
    },
  },

  {
    id: 'fin-cambiarlo',
    // Requiere haber leído la quinta hoja: no se puede ofrecer lo que no se
    // sabe que se puede ofrecer. El botón está gateado en el JSON; la escena
    // igual lo comprueba, porque una escena no debe confiar en que el único
    // camino hasta ella fue el que se diseñó.
    resolver: ({ estado }) => {
      const sabeDeBenicio = pista(estado, 'Benicio Requena') || pista(estado, 'volvió a despertarse bien');
      if (!sabeDeBenicio) {
        return {
          texto: [
            'Te ponés al lado de él y decís en voz alta que te cambiás, que vaya él y te quedes vos.',
            'No pasa nada. El agua no se mueve, Aurelio no levanta la cabeza, la fila sigue dando la vuelta arriba.',
            'Y ahí te das cuenta del problema: no sabés a quién se lo estás diciendo. Ofrecerse en voz alta no es lo mismo que ponerse, esto no funciona con la buena voluntad de nadie, y vos no tenés ningún motivo para creer que un turno se pueda pasar de una persona a otra. Nunca averiguaste si eso pasó alguna vez.',
          ],
          estabilidad: { amount: -3, cause: 'ofrecer algo y descubrir que no alcanzaba con ofrecerlo' },
        };
      }
      // Saber lo de Benicio alcanza para intentarlo: es la prueba de que un
      // turno se puede pasar de una persona a otra, porque ya se pasó una
      // vez. Haber leído la lista no hace falta para hacerlo —hace falta para
      // saber qué se está haciendo, y eso cambia el texto y no el resultado.
      const leyoLista = pista(estado, 'una lista de nombres con una marca al lado');
      return {
        texto: [
          'Bajás. Hay dónde apoyar el pie, tal como se veía, y el agua no está fría ni está mojada: está a la temperatura de nada.',
          'Hace cuarenta y nueve años un pibe de veintiuno bajó a hacer el turno de otro y no volvió a subir del todo. Eso es lo único que sabés con certeza, y es suficiente para saber que la cosa se puede pasar de mano.',
          leyoLista
            ? 'Le sacás la hoja de las manos, que no la suelta pero tampoco la retiene, y hacés lo único que se puede hacer con un papel y una lista: buscás el renglón fresco de abajo de todo, el que tiene el círculo al lado.\n\nNo hay pluma. Resulta que no hace falta.'
            : 'Le sacás de las manos eso que estaba leyendo, que no lo suelta pero tampoco lo retiene. Está escrito de arriba abajo con algo que no llegás a leer y que igual entendés lo suficiente como para saber dónde hay que poner el nombre de uno.\n\nNo hay pluma. Resulta que no hace falta, y no saber cómo funciona no te salva de que funcione.',
        ],
        exposicion: { amount: 15, source: 'sueno:cambio', cause: 'escribir el propio apellido en la quinta hoja' },
        estabilidad: { amount: -12, cause: 'haber entendido cómo se anota y haberlo usado' },
        consecuencia: {
          description: 'El investigador se anotó en la quinta hoja en lugar de Aurelio Requena, y salió del brocal con algo que antes no traía.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Su apellido está en una lista que no está cosida a ningún libro. Duerme, pero no vuelve descansado, y sabe exactamente por qué.',
        },
        desenlace: {
          id: 'cambio',
          title: 'Lo que se paga con otro sueño',
          text: [
            'Aurelio Requena se despertó de golpe, entero, sin secuelas y sin recuerdos: para él fueron catorce días de nada, como una anestesia. Vivió hasta 1944 y llegó a ser el escribano más viejo del partido.',
            'Nunca supo lo que hiciste. Preguntó, al principio, y como las respuestas no cerraban dejó de preguntar, que es lo que hace la gente.',
            'Vos volviste a tomar el tren del mediodía y llegaste a tu casa sin novedad, y esa noche dormiste ocho horas seguidas y te despertaste con los pies sucios.',
            'No siempre. Al principio fue una vez cada tantas semanas. Hay meses enteros en que no pasa nada y uno se convence de que era el cansancio del viaje.',
            'Pero cada tanto amanecés con las plantas de los pies con tierra que no es la tierra del lugar donde estás, y con las uñas de las dos manos con una raya de rojo abajo, del lado de la carne, que tarda cuatro días en salir.',
            'Y hay algo peor, que no se puede contar en una mesa: no te molesta. Los días que amanecés así son los días en que te levantás descansado. La obligación del Círculo Rojo no se terminó ni cambió de forma: cambió de dueño, y el dueño nuevo no es de ninguna de las dos familias, y no vive en Villa Requena, y no tiene a quién pasársela.',
            'Ochenta y seis renglones y una lista más larga. Vos sabés en cuál de las dos estás. Lo que no vas a saber nunca es si eso sirve para algo, que era exactamente la pregunta con la que llegaste al pueblo la primera vez.',
          ].join('\n\n'),
        },
      };
    },
  },

  {
    id: 'fin-dejarlo',
    resolver: ({ estado }) => {
      const bajo = pista(estado, 'lo encontró en el fondo');
      const sabe1878 = pista(estado, 'Benicio Requena') || pista(estado, 'volvió a despertarse bien');
      return {
        texto: [
          bajo
            ? 'Subís. Se sube peor que se baja, tal como se veía desde arriba, y arriba es la escribanía y el brasero apagado y las seis de la mañana.'
            : 'Juntás las cosas antes de que se haga de noche otra vez, que es la manera de no tener que decidir si te quedás.',
          'Hay un tren a las seis y diez.',
        ],
        estabilidad: { amount: -2, cause: 'haberse ido pudiendo quedarse' },
        desenlace: {
          id: 'dormido',
          title: 'Lo que se queda dormido',
          text: [
            'Aurelio Requena no murió. Ése es el problema, y el pueblo tardó como dos años en entender que era un problema.',
            'Siguió respirando en el catre de la escribanía, con buen color, sin escaras, hidratado. De día no había manera de despertarlo. De noche se levantaba, caminaba hasta la plaza, se sentaba en la silla de paja y hacía algo con las manos durante horas, y a la mañana estaba otra vez en el catre y nadie lo había llevado.',
            'Delfina Arce lo cuidó dos años más. En 1929 pidió el traslado y se lo dieron, y el aula quedó cerrada catorce meses hasta que mandaron a otra maestra, que no anotó nada en ningún mapa.',
            'Cirilo Sosa siguió pintando el círculo cada junio, sin creer una palabra, hasta que se murió en el cincuenta y uno. Ramona no llegó a ver el segundo invierno.',
            'Y el escribano siguió ahí. En algún momento de los años treinta el pueblo dejó de nombrarlo. No por respeto ni por miedo: por costumbre, del mismo modo en que no se nombra un mueble.',
            sabe1878
              ? 'Vos sabías lo de Benicio Requena. Sabías que había durado dos años y medio y que después la familia dijo que se había ido a Bahía y todo el mundo dijo qué bien. Con Aurelio nadie llegó a decir que se había ido a ninguna parte, porque quedó a la vista de todos, en una escribanía con la puerta abierta, respirando durante años.'
              : 'Vos nunca averiguaste si esto ya había pasado antes en Villa Requena. La respuesta es que sí, y que la vez anterior duró dos años y medio, y que después la familia dijo que se había ido a Bahía y todo el pueblo dijo qué bien. Pero eso no lo averiguaste, así que no lo sabés, y no saberlo es lo único que te llevaste del viaje.',
            'La silla de paja siguió apoyada contra el brocal, del lado del viento, hasta bastante después de que ya no hiciera falta. Nadie la retiró. Retirarla habría sido decir algo.',
          ].join('\n\n'),
        },
      };
    },
  },
];
