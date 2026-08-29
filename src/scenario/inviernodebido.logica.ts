/**
 * LA LÓGICA DE LAS ESCENAS DE EL INVIERNO DEBIDO — lo único que no puede ser dato.
 *
 * Todo lo demás vive en `invierno-debido.contenido.json`.
 *
 * Dos cosas propias de esta aventura, que no tenía ninguna de las tres
 * anteriores:
 *
 *   1. `leer-procedimiento` es la primera escena del juego que entrega puntos
 *      de MITOS DE CTHULHU, y con ellos baja el techo de Cordura para siempre.
 *      Sólo se dispara si el jugador escribe que da vuelta la tercera hoja
 *      DESPUÉS de que Aurelio le pidiera que no lo hiciera. El aviso no es
 *      decorativo: es la condición para que el costo sea justo.
 *
 *   2. La pregunta central —¿sirve de algo?— no se contesta en ninguna rama.
 *      Los cinco desenlaces están escritos para que ninguno confirme ni
 *      desmienta. Es la regla de oro del canon (§15) aplicada a la mecánica de
 *      los finales, no sólo a la prosa.
 */

import type { GameState } from '../shared/types.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';
import { evaluarCondicion } from './condiciones.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const propiedadVista = (s: GameState, item: string) =>
  (s.items[item]?.discoveredProperties.length ?? 0) > 0;
const oculta = (s: GameState, item: string) => s.items[item]?.hiddenProperties[0]?.description ?? '';
/** Lleva su propia cámara —Tomás, o quien haya nacido con `Ocupacion.itemInicial` de fotógrafo/periodista. */
const conCamara = (s: GameState) =>
  evaluarCondicion({ op: 'lleva', item: 'it-camara-fotografica' }, { estado: s });
/** Lleva su propia lupa de joyero —`Ocupacion.itemInicial` de anticuario. */
const conLupa = (s: GameState) =>
  evaluarCondicion({ op: 'lleva', item: 'it-lupa-anticuario' }, { estado: s });
const documento = (s: GameState, id: string) => Boolean(s.documents[id]?.obtainedAt);
/** Cuántas de las tres marcas de las aventuras anteriores trae encima. */
const marcasPrevias = (s: GameState) =>
  s.consequences.filter((c) => c.description.includes('del Círculo Rojo')).length;

/**
 * La Firma Ajena: quemó la carta de 1917 y la fotografía, o sea eligió, con
 * sus propias manos, que una pregunta se quedara para siempre sin con qué
 * contestarse.
 *
 * Las dos salidas de esta aventura que no resuelven nada —soltar la
 * obligación, o postergarla un año— son la misma decisión con otro nombre, y
 * quien ya la tomó una vez merece que el texto lo diga. Narrativo y nada más:
 * no cambia qué desenlaces están disponibles ni cómo salen las tiradas.
 */
const quemoLaPruebaAntes = (s: GameState) =>
  s.consequences.some((c) => c.description.includes('La carta de 1917 y la fotografía'));

export const INVIERNO_DEBIDO_LOGICA: LogicaDeEscenas = [
  // ══ LA CARTA ════════════════════════════════════════════════════════════════

  {
    id: 'leer-carta',
    resolver: ({ estado }) => {
      if (documento(estado, 'doc-carta')) {
        return { texto: ['La volvés a leer. Dice lo mismo: tres avisos con tu nombre, y «venga antes de fin de mes».'] };
      }
      const marcas = marcasPrevias(estado);
      // El único lugar del juego donde una aventura le habla de vuelta a lo
      // que el jugador hizo en las otras. Sin marcas la carta sigue llegando
      // —la aventura se puede jugar sola— pero suena a otra cosa.
      const comentario = marcas >= 3
        ? ['Tres avisos. Vos sabés cuáles son los tres, y sabés que en ninguno de los tres le dijiste tu nombre a nadie que lo estuviera anotando.']
        : marcas === 2
          ? ['Dice tres. Vos te acordás de dos. La tercera no sabés cuál es, y ésa es la que preocupa.']
          : marcas === 1
            ? ['Dice tres avisos. Vos preguntaste una vez, en un solo lugar, hace más de un año, y nadie tomó nota delante tuyo.']
            : ['Dice tres avisos con tu nombre. No se te ocurre de qué tres avisos podría estar hablando, y eso no es tranquilizador: significa que el registro no depende de que vos te enteres.'];
      return {
        texto: [
          'La sacás del bolsillo del sobretodo, donde la venís llevando desde que la recibiste.',
          ...comentario,
        ],
        documento: { id: 'doc-carta', how: 'la venías trayendo encima desde que llegó' },
      };
    },
  },

  // ══ EL CAJÓN ════════════════════════════════════════════════════════════════
  //
  // Existe como escena y no como parte del tema `a-procedimiento` porque un
  // tema de conversación puede dejar una pista y cambiar una actitud, pero NO
  // puede entregar un documento. Aurelio abre el cajón hablando; lo que hay
  // adentro se lo lleva quien lo mira.

  {
    id: 'abrir-cajon',
    // El libro sale igual: mirar adentro de un cajón abierto no se falla. Lo
    // que decide el dado es si notás que la cuarta hoja está menos manoseada
    // que las otras tres — que es la única pista que existe, antes de leerla,
    // de que ahí hay algo distinto.
    prueba: (s) => s.documents['doc-turnos']?.obtainedAt ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'ver si el papel de las cuatro hojas está gastado parejo',
      stakes_success: 'notás cuál de las cuatro se leyó menos',
      stakes_failure: 'cuatro hojas cosidas, todas iguales',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'El cajón está abierto y Aurelio se corrió medio paso, que en él es una invitación.',
        'Arriba, el libro de tapas de cartón: rayado como un libro de cuentas, con el lomo reforzado dos veces con tela distinta.',
        tirada?.exito
          ? 'Debajo, cuatro hojas cosidas con hilo de bramante. Y hay algo que no cierra en cómo están gastadas: las tres primeras tienen el borde oscuro de tanto pulgar, y la cuarta está casi limpia. En ochenta años, alguien dio vuelta esa hoja muchas menos veces de las que leyó las otras tres. No porque no supieran que estaba.'
          : 'Debajo, cuatro hojas cosidas con hilo de bramante, con el nudo viejo y el hilo flojo. Papel amarillo, las cuatro iguales.',
      ],
      documento: { id: 'doc-turnos', how: 'estaba arriba de todo, en el cajón que Aurelio abrió' },
      exposicion: { amount: 2, source: 'cajon:contenido', cause: 'un cajón que no se abre hace años' },
      ...(tirada?.exito ? {
        pistas: [{
          description: 'De las cuatro hojas del procedimiento, las tres primeras están gastadas de manosearlas y la cuarta está casi limpia: en ochenta años se dio vuelta muy pocas veces.',
          kind: 'physical' as const, source: 'las cuatro hojas del cajón', reliability: 'reliable' as const,
        }],
      } : {}),
    }),
  },

  {
    id: 'agarrar-procedimiento',
    resolver: () => ({
      // Entrega las CUATRO hojas, pero la cuarta se lee aparte: tener el papel
      // en la mano y darlo vuelta son dos actos distintos, y el segundo cuesta.
      texto: [
        'Levantás las cuatro hojas. Pesan lo que pesan cuatro hojas.',
        'Las tres primeras se leen de corrido: cuándo, con qué, dónde, cuánto, quién. Instrucciones. La última línea de la tercera es la única rara, y es una línea de manual: «No se dice nada mientras se pinta. Lo que se diga se anota igual».',
        'La cuarta está del otro lado. Aurelio no se sentó en ningún momento.',
        // EL AVISO VA ACÁ Y NO EN UN TEMA DE CONVERSACIÓN, a propósito. Hay dos
        // caminos para abrir el cajón y el jugador puede no haber pasado por
        // el tema donde Aurelio avisa. El costo de la cuarta hoja —Mitos, y el
        // techo de Cordura bajo para siempre— sólo es justo si el aviso llegó
        // SIEMPRE. Ésta es la única escena por la que hay que pasar sí o sí
        // antes de poder darla vuelta.
        '—Antes de que la dé vuelta —dice, y no se acerca—. Las tres primeras no le van a hacer nada. La cuarta es la explicación, y se lo digo una sola vez porque después voy a hacer como que no se lo dije: si da vuelta la tercera hoja, no hay manera de volver atrás.',
        '—Yo la di vuelta a los veintiséis años y desde entonces duermo distinto. Usted vino de afuera. Todavía puede irse de acá sin haberla dado vuelta.',
      ],
      documento: { id: 'doc-procedimiento', how: 'debajo del libro, cosidas con hilo de bramante' },
    }),
  },

  // ══ LAS MARCAS ══════════════════════════════════════════════════════════════

  {
    id: 'examinar-brocal',
    // El círculo se ve sin tirada: está ahí. Lo que hay que notar —y por eso
    // hay dado— es que la pintura tiene DOS edades, que es todo lo que hace
    // falta para saber que este año alguien no terminó su trabajo.
    prueba: (s) => pista(s, 'repintado a medias') ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'distinguir la pintura fresca de la vieja con luz de invierno',
      stakes_success: 'ves que tiene dos edades',
      stakes_failure: 'un círculo rojo, viejo, en la cara de adentro',
    }),
    resolver: ({ estado, tirada }) => {
      if (pista(estado, 'repintado a medias')) {
        return { texto: ['El círculo sigue ahí, con el tramo fresco y el resto gastado. Nadie lo terminó desde que lo miraste.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [
            'La chapa pesa menos de lo que parece. Debajo, el aljibe está seco desde el año diecinueve: se ve el fondo, y el fondo es tierra.',
            'La cara interna del brocal —la que sólo se ve desde arriba— tiene un círculo pintado en almagre, del ancho de dos manos abiertas. Está gastado y es viejo. Con esta luz no sacás nada más.',
          ],
          exposicion: { amount: 2, source: 'brocal:circulo', cause: 'un círculo pintado donde nadie lo ve' },
        };
      }
      return {
        texto: [
          'La chapa pesa menos de lo que parece. Debajo, el aljibe está seco desde el año diecinueve: se ve el fondo, y el fondo es tierra.',
          'La cara interna del brocal —la que sólo se ve desde arriba, la que queda tapada cuando la chapa está en su lugar— tiene un círculo pintado en almagre, del ancho de dos manos abiertas.',
          'Un tramo está fresco. El resto está desvaído de varios inviernos. Quien lo repasó este año empezó por arriba, siguió hasta poco más de la mitad, y no terminó.',
        ],
        pistas: [{
          description: 'El círculo del brocal de la plaza está repintado a medias: un tramo fresco de este invierno y el resto gastado de varios. Quien lo hizo trabajó apurado y a oscuras.',
          kind: 'physical', source: 'el brocal de la plaza', reliability: 'reliable',
        }],
        exposicion: { amount: 3, source: 'brocal:circulo', cause: 'un círculo pintado donde nadie lo ve' },
        pregunta: '¿Por qué se pinta del lado que queda tapado?',
      };
    },
  },

  {
    id: 'examinar-mojon',
    prueba: (s) => pista(s, 'otro círculo grabado') ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'mirar debajo de la pintura saltada',
      stakes_success: 'ves lo que hay abajo',
      stakes_failure: 'una piedra con un círculo pintado, y nada más',
    }),
    resolver: ({ estado, tirada }) => {
      if (pista(estado, 'otro círculo grabado')) {
        return { texto: ['Volvés a pasarle la mano. El grabado de abajo sigue estando, y sigue sin explicarse.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [
            'Una piedra parada donde no hace falta ninguna piedra parada, con un círculo en almagre en la cara norte. La pintura es de este invierno.',
            'El viento te obliga a entrecerrar los ojos. No sacás nada más en limpio.',
          ],
          exposicion: { amount: 2, source: 'mojon:piedra', cause: 'una piedra que no marca ningún límite' },
        };
      }
      return {
        texto: [
          'Le pasás la mano por la cara norte, que es la lisa, la que tiene ochenta años de manos encima.',
          'La pintura saltó en dos o tres lugares, y debajo de la pintura la piedra no está lisa: hay un círculo grabado. Más chico que el pintado, y bastante más hondo.',
          'Metés la uña en el surco. No es un rayón hecho con un cuchillo ni con un formón: es una canaleta pareja, de fondo redondeado, del tipo que deja el agua o el tiempo, no una herramienta de mano.',
          'El círculo pintado de arriba es de este invierno. El de abajo no es de ningún invierno que este pueblo pueda recordar.',
        ],
        pistas: [{
          description: 'Debajo del círculo pintado del mojón hay otro círculo grabado en la piedra, mucho más viejo y más profundo que cualquier marca hecha con herramienta de mano.',
          kind: 'physical', source: 'el mojón viejo', reliability: 'reliable',
        }],
        exposicion: { amount: 5, source: 'mojon:grabado', cause: 'un grabado más viejo que la pintura que lo tapa' },
        estabilidad: { amount: -4, cause: 'una marca anterior a quienes la repintan' },
        pregunta: '¿Quién grabó el círculo de abajo, y a quién estaban copiando los Requena y los Sosa?',
      };
    },
  },

  {
    // Vía alternativa a `examinar-mojon`, no un reemplazo: el chequeo de
    // Descubrir encuentra el grabado (es táctil, es notar una textura bajo la
    // pintura). Éste, en cambio, es para quien ya lo encontró y pregunta qué
    // ES, no qué hay. Por eso pide la pista del grabado como condición y no
    // repite el trabajo de encontrarlo.
    id: 'interpretar-mojon',
    prueba: (s) => pista(s, 'no es un adorno') ? null : ({
      skill: 'ocultismo', difficulty: 'regular',
      reason: 'reconocer de qué clase de marca se trata, no sólo que hay una',
      stakes_success: 'sabés para qué sirve un dibujo así',
      stakes_failure: 'un círculo grabado, y ninguna idea de qué es',
    }),
    resolver: ({ estado, tirada }) => {
      if (pista(estado, 'no es un adorno')) {
        return { texto: ['Ya lo pensaste. Sigue siendo lo mismo: un círculo cerrado, sin entrada.'] };
      }
      if (!tirada?.exito && !conLupa(estado)) {
        return { texto: ['Un círculo grabado en piedra. Podría ser cualquier cosa: una marca de cantera, un juego de niños, una casualidad de la erosión. No hay manera de saber cuál, mirándolo.'] };
      }
      return {
        texto: [
          'No es un adorno, y no es casual: un círculo grabado sin ninguna abertura, sin punto de entrada ni de salida, es una forma que se usa a propósito y con una sola intención. No para dejar pasar algo. Para que algo se quede adentro, o se quede afuera, y desde acá no hay manera de saber cuál de las dos.',
          'El círculo pintado de arriba —el de todos los inviernos— lo copia línea por línea. Quien empezó esta costumbre no inventó nada: repitió un dibujo que ya sabía para qué servía.',
        ],
        pistas: [{
          description: 'El grabado del mojón no es decorativo: es un círculo cerrado sin abertura, la forma que se usa para contener algo —adentro o afuera, sin poder saber cuál—. El círculo que se repinta cada invierno lo copia exactamente.',
          kind: 'physical', source: 'el grabado del mojón, leído como lo que es', reliability: 'reliable',
        }],
        estabilidad: { amount: -3, cause: 'entender para qué sirve un dibujo, no sólo verlo' },
      };
    },
  },

  {
    id: 'examinar-retrato',
    // Con cámara propia, un paso más fácil: sabe qué mirar en una imagen.
    prueba: (s) => propiedadVista(s, 'it-retrato') ? null : ({
      skill: 'fotografia', difficulty: conCamara(s) ? 'regular' : 'hard',
      reason: 'leer un retrato de estudio de 1887 con ojo de fotógrafo, no sólo mirarlo',
      stakes_success: 'notás lo que tiene en el dorso de la mano',
      stakes_failure: 'un escribano de patillas, de 1887',
    }),
    resolver: ({ estado, tirada }) => {
      if (propiedadVista(estado, 'it-retrato')) return { texto: [oculta(estado, 'it-retrato')] };
      if (!tirada?.exito) {
        return { texto: ['Un hombre de patillas junto a una mesa con un libro abierto. «E. R., escribano, 1887». No mira a la cámara.'] };
      }
      return [
        { descubre: { itemId: 'it-retrato', propertyId: 'p-retrato-mano', how: 'mirando la mano y no la cara' } },
        {
          texto: [oculta(estado, 'it-retrato')],
          pistas: [{
            description: 'Evaristo Requena se hizo retratar en 1887 con almagre todavía en el dorso de la mano derecha, apoyada sobre un libro abierto.',
            kind: 'physical', source: 'retrato de Evaristo Requena', reliability: 'reliable',
          }],
          exposicion: { amount: 2, source: 'retrato:mano', cause: 'un hombre que se hizo retratar con la marca puesta' },
        },
      ];
    },
  },

  {
    id: 'examinar-almagre',
    prueba: (s) => propiedadVista(s, 'it-almagre') ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'mirar la costra del fondo y la cerda de la brocha',
      stakes_success: 'te das cuenta de que no se abrió',
      stakes_failure: 'un tarro de pintura y una brocha',
    }),
    resolver: ({ estado, tirada }) => {
      if (propiedadVista(estado, 'it-almagre')) return { texto: [oculta(estado, 'it-almagre')] };
      if (!tirada?.exito) {
        return { texto: ['Un tarro de lata con tierra roja seca y una brocha encima. Está en un estante, entre legajos, como si fuera un objeto de oficina más.'] };
      }
      return [
        { descubre: { itemId: 'it-almagre', propertyId: 'p-almagre-seco', how: 'mirando la costra del fondo y la cerda de la brocha' } },
        {
          texto: [oculta(estado, 'it-almagre')],
          pistas: [{
            description: 'El tarro de almagre de la escribanía tiene una costra seca sin marcas de brocha y la brocha está limpia: no se usó el invierno pasado.',
            kind: 'physical', source: 'el tarro del estante de la escribanía', reliability: 'reliable',
          }],
        },
      ];
    },
  },

  // ══ LOS PAPELES DEL CAJÓN ═══════════════════════════════════════════════════

  {
    id: 'leer-turnos',
    resolver: ({ estado }) => {
      if (pista(estado, 'nueve apellidos')) {
        return { texto: ['Volvés sobre el libro. Los renglones no cambiaron, y la primera página tampoco.'] };
      }
      return {
        texto: [
          'Ochenta y cuatro renglones. Un año y un apellido, alternándose sin fallar: REQUENA, SOSA, REQUENA, SOSA.',
          'Tres renglones están tachados y reescritos con el otro apellido: 1852, 1878, 1904. Alguien no pudo, y el otro fue.',
          'Y después están los dos últimos. 1924: SOSA. 1925: SOSA. Dos años seguidos, cuando en ochenta y cuatro renglones no había pasado nunca.',
          'La primera página está antes de 1841 y no tiene años. Es una lista de nueve apellidos con una letra más vieja que el libro, y de los nueve, siete no existen en este pueblo ni existieron nunca. Al pie: «Los que quedan. Que se sepa que quedaron pocos y que ninguno quiso».',
        ],
        pistas: [
          {
            description: 'El libro de turnos anota SOSA dos años seguidos, 1924 y 1925, rompiendo una alternancia que no había fallado en ochenta y cuatro renglones.',
            kind: 'documentary', source: 'libro de turnos de la escribanía', reliability: 'reliable',
          },
          {
            description: 'La primera página del libro, anterior a 1841 y con otra letra, lista nueve apellidos —siete de los cuales nunca existieron en el pueblo— bajo la frase «Los que quedan».',
            kind: 'documentary', source: 'libro de turnos de la escribanía', reliability: 'reliable',
          },
        ],
        exposicion: { amount: 4, source: 'libro:primera-pagina', cause: 'una lista de los que quedan, anterior al pueblo' },
        estabilidad: { amount: -3, cause: 'un libro que empieza cuarenta años antes que el pueblo' },
        pregunta: '¿Quiénes eran los otros siete apellidos, y qué les pasó a los que no quisieron?',
      };
    },
  },

  {
    id: 'leer-procedimiento',
    resolver: ({ estado }) => {
      if (pista(estado, 'leyó la cuarta hoja')) {
        return {
          texto: [
            'No hace falta volver a leerla. Ése es exactamente el problema con la cuarta hoja: se lee una sola vez.',
          ],
        };
      }
      return {
        texto: [
          'Las tres primeras hojas son instrucciones y las leés de corrido, casi con alivio: cuándo, con qué, dónde, cuánto, quién. La única línea que se sale del tono es la última, y es una línea de manual: «No se dice nada mientras se pinta. Lo que se diga se anota igual».',
          'Después está el borde de la tercera hoja, entre el pulgar y el índice.',
          'Aurelio te dijo que no la dieras vuelta. Te lo dijo una vez y después hizo como que no te lo había dicho, que es exactamente lo que te avisó que iba a hacer.',
          'La das vuelta.',
          'La cuarta hoja está escrita más apretada, sin renglones, con la letra de alguien que escribió esto de una sentada y no lo releyó nunca. No es larga. Se lee en menos de dos minutos.',
          'Cuando terminás, lo que te queda no es miedo. Es algo más incómodo que el miedo, y es esto: entendés por qué se pinta del lado que queda tapado, entendés por qué se hace de noche y en silencio, y entendés por qué el que lo escribió pidió perdón antes de explicarlo.',
          'Y entendés, sobre todo, que la pregunta que trajiste —si sirve o no sirve— está mal formulada, y que la manera correcta de formularla es bastante peor.',
          'Levantás la vista. Aurelio no te está mirando. Está mirando el brasero, con la cara de alguien que acaba de perder algo y sabía desde hace media hora que lo iba a perder.',
          '—Bueno —dice—. Ya somos dos.',
        ],
        // La única entrega de Mitos del juego, y detrás de un aviso explícito
        // que el jugador tuvo que ignorar a propósito. Cuatro puntos: baja el
        // techo de Cordura a 95, para siempre y para todas las aventuras que
        // vengan después.
        mitos: { amount: 4, source: 'la cuarta hoja del procedimiento, que Aurelio le pidió que no diera vuelta' },
        cordura: {
          amount: 4,
          cause: 'entender para qué sirve',
          crisis: {
            nombre: 'Lo que se lee una sola vez',
            descripcion: 'Volvés sobre la cuarta hoja mentalmente, sin querer, en los momentos muertos. No te acordás de las palabras exactas y eso lo empeora.',
            tipo: 'mania',
            afecta: [{ skill: 'psicologia', dados: 1 }],
          },
        },
        exposicion: { amount: 9, source: 'procedimiento:cuarta-hoja', cause: 'la explicación completa, leída a propósito' },
        estabilidad: { amount: -8, cause: 'una explicación que no deja la pregunta donde estaba' },
        pistas: [{
          description: 'El investigador leyó la cuarta hoja del procedimiento, contra el pedido expreso de Aurelio. Lo que dice no se puede resumir sin volver a decirlo entero.',
          kind: 'experiential', source: 'la cuarta hoja', reliability: 'unknown',
        }],
        consecuencia: {
          description: 'Leyó la cuarta hoja del procedimiento del Círculo Rojo, y entendió para qué se repinta.',
          scope: 'world',
          permanent: true,
          worldReminder: 'Sabe para qué sirve. Eso no lo vuelve más capaz de decidir: lo vuelve una de las pocas personas vivas que no puede fingir que no sabe.',
        },
        jugadorNota: {
          statement: 'El texto de la cuarta hoja no se transcribe en ninguna parte de esta aventura. No es un olvido ni una promesa para más adelante: es la regla de oro del canon —más cerca de la verdad, más información y menos certeza— aplicada al único lugar donde el juego podría haber contestado.',
          source: 'la cuarta hoja',
          reliability: 'unknown',
        },
      };
    },
  },

  // ══ LO QUE SE LE CUENTA A QUIÉN ═════════════════════════════════════════════

  {
    id: 'contarle-a-ramona',
    resolver: ({ estado }) => {
      const sabe = pista(estado, 'Aurelio no repintó el círculo el invierno pasado');
      if (!sabe) {
        return {
          texto: [
            'Se lo decís sin tenerlo confirmado, a ver qué cara pone.',
            'Ramona te mira sin apuro.\n\n—Usted no sabe eso —dice—. Usted lo está probando conmigo.',
            'Y tiene razón, y las dos lo saben.',
          ],
          npc: { id: 'npc-ramona', attitudeDelta: -2, patienceDelta: -1, cause: 'le tiraron un anzuelo sin carnada' },
        };
      }
      return {
        texto: [
          'Se lo decís derecho: que Aurelio no lo pintó el año pasado, y que él mismo lo admitió.',
          'Ramona no se sorprende. Ni un músculo. Se queda mirándote el tiempo que hace falta para que quede claro que no se sorprende.\n\n—Ya sé —dice—. ¿Quién le parece que lo pintó?',
          'Mira hacia la puerta de la casa antes de seguir, para saber dónde está el hijo.\n\n—Le voy a pedir una cosa, y no se la voy a pedir dos veces: si esto sale de este patio, no sale de acá para el pueblo. Sale para adentro de mi casa. Y adentro de mi casa hay un hombre de treinta y tres años con un rebenque y con razón.',
        ],
        npc: { id: 'npc-ramona', attitudeDelta: 2, cause: 'le confirmaron lo que ella ya sabía y venía tapando' },
        pistas: [{
          description: 'Ramona ya sabía que Aurelio no cumplió, porque fue ella quien lo cubrió. Su preocupación no es el círculo: es que se entere su hijo.',
          kind: 'testimonial', source: 'Ramona Sosa', reliability: 'reliable',
        }],
      };
    },
  },

  {
    id: 'contarle-a-cirilo',
    resolver: () => ({
      texto: [
        'Se lo decís a Cirilo, con la madre sentada a tres metros.',
        'No grita. Eso es lo peor: no grita. Se queda quieto un segundo entero, mirando a Ramona, que no levanta la vista de la falda.\n\n—¿Vos fuiste el año pasado? —le pregunta a la madre. Y después, más bajo—: ¿Vos fuiste sola, de noche, en junio, a hacerle el trabajo a ése?',
        'Ramona no contesta, y no contestar es contestar.',
        'Cirilo se da vuelta hacia vos y el rebenque ya no le golpea la bota: lo tiene quieto en la mano, que es distinto.\n\n—Usted vino a arreglar algo, ¿no? —dice—. A usted no lo dejo salir de este patio hasta que sepa qué va a hacer con lo que acaba de averiguar.',
        'No es una amenaza gritada. Es peor: la dice bajito, como quien ya lo decidió.',
      ],
      npc: { id: 'npc-cirilo', attitudeDelta: -4, patienceDelta: -2, cause: 'se enteró de que su madre viene haciendo los dos turnos' },
      estabilidad: { amount: -2, cause: 'haber sido quien lo dijo' },
      consecuencia: {
        description: 'Cirilo Sosa se enteró de que su madre cumplió el turno de Aurelio Requena, y fue el investigador quien se lo dijo.',
        scope: 'campaign',
        permanent: true,
        worldReminder: 'Cirilo bloqueó la salida del patio. No va a dejar pasar al investigador hasta que la situación se resuelva de una de tres maneras: hablando, peleando, o huyendo.',
      },
      pistas: [{
        description: 'Cirilo bloqueó la salida del patio: no deja pasar al investigador hasta que la situación se resuelva de una manera u otra.',
        kind: 'experiential', source: 'el patio de los Sosa', reliability: 'reliable',
      }],
    }),
  },

  // ══ CIRILO BLOQUEA LA SALIDA: EL ÚNICO COMBATE DE LA AVENTURA ═══════════════
  //
  // Hasta acá, `resolve_attack`/`resolve_flee`/`resolve_maneuver` sólo los
  // llamaba el simulador: ninguna aventura los conectaba. Cirilo tenía
  // estadísticas de combate declaradas y ningún camino real para pelearlas.
  // Estas dos escenas son el cable que faltaba —usan `efecto.combate`, que
  // termina en las MISMAS herramientas del motor, con dados reales—.

  {
    id: 'combate-cirilo',
    resolver: ({ variante, estado }) => ({
      // Con Cirilo hostil, este botón se puede tocar varias veces seguidas
      // —cada click es un asalto entero—; sin variar el texto, la MISMA
      // frase de arranque se repetía asalto tras asalto y leía robótico.
      texto: [variante([
        'Da un paso, y no es para atrás.',
        'No hay más para hablar. Vas.',
        'Otra vez. Esta vez de verdad.',
        'No queda otra que seguir.',
      ])],
      // A mano limpia: nadie en esta historia le puso un arma al
      // investigador, y no corresponde que la escena le invente una.
      combate: { accion: 'atacar', npcId: 'npc-cirilo', armaId: 'desarmado' },
      // A partir de este primer asalto, la interfaz cambia a la pantalla
      // dedicada de combate: los asaltos siguientes no vuelven a pasar por
      // este botón. Idempotente por diseño (ver `toolStartCombat`).
      iniciaCombate: {
        npcIds: ['npc-cirilo'],
        salidaPacifica: {
          npcId: 'npc-cirilo',
          pistaCalma: {
            // MISMO texto que ya usa el tema «Tratar de calmarlo»
            // (`c-calmar`, en el JSON): los gates de «enfrentar-cirilo» y
            // «huir-cirilo» ya buscan este fragmento exacto para saber si
            // Cirilo se apartó, y no hay que tocarlos.
            description: 'Cirilo se aparta y deja pasar sin pelear: la enojada era la situacion, no el investigador.',
            kind: 'experiential',
            source: 'Cirilo Sosa',
            reliability: 'reliable',
          },
          // Distinta de la de mano limpia a propósito —ningún fragmento en
          // común— para que El Sueño Debido pueda discriminar entre las dos.
          consecuenciaDisparo: {
            description: 'En el patio de los Sosa, el investigador sacó un arma de fuego y le disparó a Cirilo Sosa, delante de la madre.',
            scope: 'campaign',
            permanent: true,
            worldReminder: 'Ramona Sosa vio al investigador sacar un arma y dispararle a su hijo en su propio patio. No es lo mismo que un golpe de puño, y ella lo sabe.',
          },
        },
      },
      // HABER DECIDIDO PELEAR ES LO QUE QUEDA, no quién ganó el asalto. Se
      // registra en el primero y sólo en el primero: cada click es un asalto
      // y sin este chequeo quedaban ocho copias de la misma consecuencia.
      //
      // Existe porque una aventura POSTERIOR la lee —El Sueño Debido vuelve a
      // este patio un año después, y Ramona no le habla igual a alguien que
      // le levantó la mano al hijo—. Antes de esto, elegir pelear no dejaba
      // ningún rastro que cruzara el puente entre aventuras: se agotaba en
      // los PV de esa tarde.
      ...(estado.consequences.some((c) => c.description.includes('le fue encima a Cirilo Sosa'))
        ? {}
        : {
          consecuencia: {
            description: 'En el patio de los Sosa, el investigador le fue encima a Cirilo Sosa a mano limpia, delante de la madre.',
            scope: 'campaign' as const,
            permanent: true,
            worldReminder: 'Ramona Sosa vio al investigador pelearse con su hijo en su propio patio. Eso no se descuenta con el tiempo.',
          },
        }),
    }),
  },

  {
    id: 'huir-de-cirilo',
    resolver: () => ({
      texto: ['Le das la espalda a la tranquera y corrés.'],
      combate: { accion: 'huir' },
    }),
  },

  // ══ LOS CINCO DESENLACES ════════════════════════════════════════════════════
  //
  // Ninguno contesta si sirve. Es deliberado y es la decisión de diseño más
  // importante de la aventura: hay evidencia para las dos lecturas en todas
  // las ramas, y ninguna concluyente.

  {
    id: 'pintar-circulo',
    resolver: ({ estado }) => ({
      texto: [
        'Le pedís el tarro. Aurelio no pregunta para qué: va hasta el estante y te lo alcanza con las dos manos, como se alcanza algo pesado que no pesa.',
        'Esperás a que se ponga el sol, que en julio es a las seis y cuarto. La plaza está vacía. Levantás la chapa, apoyás el tarro en el borde y empezás por donde Ramona dejó, que se nota perfectamente dónde es.',
        'La cerda de la brocha está dura y el almagre no tiene aceite: hay que apretar. Tardás más de lo que pensabas. En algún momento te das cuenta de que no estás diciendo nada, y de que no decidiste no decir nada.',
        'Cuando terminás el brocal caminás media legua hasta el mojón, con el tarro, en el frío, y hacés el otro. Volvés al pueblo pasada la medianoche por poco.',
        'Aurelio te está esperando en la escribanía con el libro abierto y la pluma cargada. No te felicita. No te agradece. Escribe el año, y al lado escribe tu apellido, y la letra le sale despareja.',
        '—Ahora hay tres —dice.',
        'Y ésa es la parte que no habías pensado: que el libro no registra quién lo hizo una vez. Registra quién lo hace.',
      ],
      exposicion: { amount: 6, source: 'pintar:turno', cause: 'cumplir el procedimiento en persona' },
      consecuencia: {
        description: 'El investigador cumplió el turno de 1926 y quedó anotado en el libro de la escribanía Requena.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Su apellido está en un libro que se lleva desde 1841. El año que viene le va a llegar una carta, y el otro también.',
      },
      desenlace: {
        id: 'pintar',
        title: 'Lo que se repinta',
        text: [
          'El invierno de 1926 quedó cumplido, y lo cumplió alguien que no es de ninguna de las dos familias.',
          'Aurelio Requena durmió esa noche por primera vez en un año. Ramona Sosa se enteró tres días después y no dijo nada, pero mandó a Cirilo con una bolsa de nueces que nadie había pedido.',
          'No pasó nada. Tampoco pasó nada el año que Aurelio no lo pintó.',
          'Las dos cosas son ciertas al mismo tiempo, y ninguna de las dos prueba nada, y ahora eso es problema tuyo.',
          pista(estado, 'leyó la cuarta hoja')
            ? 'Con una diferencia: vos leíste la cuarta hoja. Así que sabés exactamente qué es lo que no se puede probar, y por qué no se puede probar, y cuánto tarda.'
            : 'Con una ventaja, si es que es una ventaja: nunca diste vuelta la tercera hoja. Podés seguir creyendo que es una superstición de campo. Podés.',
        ].join('\n\n'),
      },
    }),
  },

  {
    id: 'ayudar-a-irse',
    resolver: ({ estado }) => ({
      texto: [
        'Se lo decís con todas las letras: que no lo pinte. Ni este año ni el que viene. Que se termine con él.',
        'Aurelio se queda quieto tanto tiempo que llegás a pensar que no te escuchó.\n\n—¿Usted se da cuenta de que se lo estoy haciendo decir a usted porque yo no me animo? —dice—. Se da cuenta, ¿no? No es una pregunta con trampa. Necesito saber si se da cuenta.',
        'Le decís que sí.\n\n—Bueno. Entonces está bien.',
        'Cierra el cajón con llave y —esto es lo raro— deja la llave sobre el escritorio en vez de guardarla en el bolsillo del chaleco. La mira un segundo, ahí, suelta sobre el roble, como si fuera un objeto que nunca hubiera visto.',
        quemoLaPruebaAntes(estado)
          ? 'Y hay una parte de esto que reconocés de otro lado, aunque tardes en admitir de cuál: la sensación exacta de decidir que una pregunta deje de tener con qué contestarse. Aquella vez fue una carta y una fotografía en un brasero de cocina. Ésta es un tarro que nadie va a volver a abrir. Se parecen bastante más de lo que te gustaría.'
          : '',
        '—Cincuenta y cuatro años —dice—. Le agradezco. De verdad le agradezco.',
        'Y entonces mira por la ventana hacia la última cuadra, donde el pueblo se termina, donde hay una mujer de setenta y uno sentada bajo un alero.\n\n—Habría que avisarle a Ramona —dice—. ¿Le aviso yo, o le avisa usted?',
      ].filter(Boolean),
      estabilidad: { amount: -3, cause: 'haber decidido por otro lo que otro no podía decidir' },
      consecuencia: {
        description: 'El investigador convenció a Aurelio Requena de abandonar la obligación del Círculo Rojo.',
        scope: 'world',
        permanent: true,
        worldReminder: 'La línea Requena se cortó por consejo del investigador. Queda una sola familia, y en esa familia queda una sola persona que crea.',
      },
      desenlace: {
        id: 'soltar',
        title: 'Lo que se suelta',
        text: [
          'Aurelio Requena no repintó el círculo en 1926, ni volvió a hacerlo, y murió en 1934 sin turno y sin hijos.',
          'La obligación no se terminó. Se concentró.',
          'Ramona Sosa pintó los dos círculos sola cada junio hasta el invierno de 1929, en que no pudo levantarse de la cama y mandó a su hijo. Cirilo Sosa fue esa noche puteando, con el tarro bajo el brazo, sin creer una sola palabra de nada.',
          'Volvió a ir el año siguiente. Y el otro.',
          'No pasó nada en ninguno de esos años. Tampoco habría manera de saber si pasó, que es exactamente lo que Ramona te dijo el primer día y vos escuchaste como si fuera una frase de vieja.',
          pista(estado, 'leyó la cuarta hoja')
            ? 'Vos leíste la cuarta hoja, así que sabés qué le pasaste a Cirilo Sosa cuando le sacaste el peso a Aurelio Requena. Él no lo sabe. Ésa es la diferencia entre los dos, y no está a tu favor.'
            : 'Vos no leíste la cuarta hoja, así que nunca vas a saber qué le pasaste a Cirilo Sosa. Podés llamarlo suerte.',
        ].join('\n\n'),
      },
    }),
  },

  {
    id: 'convencer-un-ano',
    resolver: ({ estado }) => ({
      texto: [
        'Le decís que lo pinte. Este año. Uno más.',
        'Aurelio asiente antes de que termines la frase, y ahí te das cuenta de que era lo que estaba esperando: no una razón, un permiso.\n\n—Sí —dice—. Sí, tiene razón. Un año más no es nada.',
        'Se levanta con una energía que no le viste en todo el día, va hasta el estante, baja el tarro y lo apoya sobre el escritorio. Le sacude el polvo con la manga.',
        '—Un año más y después vemos. Total, el año que viene lo hablamos con más tiempo. Usted podría volver.',
        'Y en cómo lo dice —«usted podría volver»— está toda la aventura: no resolviste nada, le pusiste fecha.',
        quemoLaPruebaAntes(estado)
          ? 'Ya hiciste esto antes, con otro papel y otro brasero: elegir que la cosa se quede sin resolver, y ponerle un nombre que suene a decisión tomada. Aquella vez lo llamaste cerrar el asunto. Ésta lo llamás un año más.'
          : '',
        'Afuera empieza a bajar el sol de las seis y cuarto.',
      ].filter(Boolean),
      estabilidad: { amount: -2, cause: 'haber elegido no decidir y llamarlo decisión' },
      consecuencia: {
        description: 'El investigador convenció a Aurelio Requena de cumplir un año más la obligación del Círculo Rojo.',
        scope: 'campaign',
        permanent: true,
        worldReminder: 'Aurelio va a esperar que el investigador vuelva el invierno que viene. Se lo dijo en voz alta y no era una cortesía.',
      },
      desenlace: {
        id: 'otro-ano',
        title: 'Lo que se posterga',
        text: [
          'El círculo del brocal quedó repintado entero la noche del 9 de julio de 1926, dos semanas tarde, por el hombre a quien le tocaba.',
          'En el libro, el renglón de 1926 dice REQUENA con la letra firme.',
          'Aurelio Requena murió en 1931 habiendo cumplido cada año hasta el último, incluido el invierno en que ya no caminaba y fue igual.',
          'No pasó nada en ninguno de esos años, que es lo mismo que había pasado el año en que no lo pintó.',
          'Vos te subiste al tren del mediodía siguiente. La carta que te trajo decía «después de fin de mes ya no va a servir de nada», y llegaste a tiempo, y arreglaste que las cosas siguieran exactamente igual que antes de que te llamaran.',
          'Es un final. No estás seguro de que sea el tuyo.',
        ].join('\n\n'),
      },
    }),
  },

  {
    id: 'llevar-el-libro',
    resolver: ({ estado }) => {
      // El libro no sale del pueblo sin pasar por Cirilo. Está avisado en el
      // tema `c-libro` y en su `refusals`: si el jugador lo intenta sin haber
      // hablado con él, se entera acá, que es peor.
      const avisado = pista(estado, 'Cirilo avisó de frente');
      return {
        texto: [
          'Te llevás el libro. Ochenta y cuatro renglones y una primera página con nueve apellidos, envuelto en el sobretodo, camino a la estación.',
          avisado
            ? 'Sabías que ibas a encontrártelo, porque te lo dijo él mismo. Está parado en el andén, a caballo, del lado por el que se sube.'
            : 'Lo que no sabías —porque no se lo preguntaste a nadie— es que en este pueblo el que ve pasar a alguien con un bulto bajo el brazo se lo cuenta a los Sosa. Cirilo está en el andén, a caballo, del lado por el que se sube.',
          '—Ese libro tiene el apellido de mi madre ochenta y cuatro veces —dice, y no baja del caballo.',
          'Lo que pasa después depende de lo que hagas ahora, y es una de las pocas veces en este pueblo en que algo depende de eso.',
        ],
        npc: { id: 'npc-cirilo', attitudeDelta: -3, patienceDelta: -2, cause: 'lo encontró llevándose el libro' },
        consecuencia: {
          description: 'El investigador sacó el libro de turnos de Villa Requena para llevarlo a un juzgado.',
          scope: 'world',
          permanent: true,
          worldReminder: 'El registro de ochenta y cuatro años dejó de ser privado. Lo que pase con esa información ya no lo controla nadie del pueblo.',
        },
        desenlace: {
          id: 'denunciar',
          title: 'Lo que se lleva al juzgado',
          text: [
            'El libro llegó al juzgado de paz del partido en julio de 1926, con una exposición escrita de puño y letra del investigador.',
            'El juez lo leyó, o dijo que lo leyó. Lo que sí está documentado es lo que hizo: lo mandó al archivo como pieza de una causa que nunca se abrió, con una carátula que dice «Costumbre local. Sin delito».',
            'Ochenta y cuatro renglones y una lista de nueve apellidos anteriores al pueblo, en una caja, en un sótano de mampostería, junto a expedientes de arreo y de medianera.',
            'Villa Requena se enteró en tres días. Ramona Sosa no volvió a saludar a Aurelio Requena, y Aurelio Requena, que quería que alguien decidiera por él, se pasó los cinco años que le quedaban explicándole a quien se lo preguntara que él no había tenido nada que ver.',
            'El círculo del brocal se siguió repintando. Sin libro, sin turno anotado, sin nadie que llevara la cuenta: se seguía repintando igual, porque una de las dos formas de que algo dure ochenta y cinco años es que esté escrito, y la otra es que no haga falta.',
            pista(estado, 'leyó la cuarta hoja')
              ? 'Y vos, que leíste la cuarta hoja, sos ahora la única persona fuera de este pueblo que sabe qué había en esa caja. Eso no es una victoria. Es un inventario.'
              : 'Y vos nunca leíste la cuarta hoja, así que hiciste público un procedimiento cuyo sentido no conocés. Puede que hayas hecho lo correcto. Nunca vas a tener manera de saberlo.',
          ].join('\n\n'),
        },
      };
    },
  },

  {
    id: 'irse-del-pueblo',
    resolver: ({ estado }) => {
      const marcas = marcasPrevias(estado);
      const leyo = pista(estado, 'leyó la cuarta hoja');
      return {
        texto: [
          'Hay un tren a las seis y diez que va para el lado del que viniste. Te subís.',
          'Aurelio Requena no sale a la puerta de la escribanía. Se queda adentro, detrás del vidrio, que es donde estaba cuando llegaste.',
        ],
        desenlace: {
          id: 'irse',
          title: 'Lo que no se toca',
          text: [
            'Te fuiste de Villa Requena sin decidir nada, que era una de las cinco cosas que podías hacer y no es la peor.',
            'Aurelio Requena repintó el círculo esa misma noche. No porque lo hubieras convencido —no le dijiste nada— sino porque haber tenido enfrente a alguien de afuera durante una mañana entera fue suficiente para que le diera vergüenza no hacerlo.',
            'Le duró seis años más. Murió en 1932 con el turno cumplido.',
            leyo
              ? 'Vos leíste la cuarta hoja y te fuiste igual. De todas las maneras de irse de este pueblo, ésa es la única que no se puede deshacer: el tren te sacó del partido, no de la lista.'
              : 'Vos no leíste la cuarta hoja, y ésa es la única cosa que te llevaste de Villa Requena: no saber. Con el tiempo va a dejar de parecerte poca cosa.',
            marcas >= 3
              ? 'La escribanía siguió anotando quién pregunta por un círculo. Tu nombre ya figuraba tres veces antes de este viaje. Ahora figura cuatro, y la cuarta anotación la hizo un hombre que te tuvo enfrente y te dejó ir.'
              : 'La escribanía siguió anotando quién pregunta por un círculo, y tu nombre quedó otra vez en una carpeta sin año, en un estante alto, atada con cinta roja.',
          ].join('\n\n'),
        },
      };
    },
  },
];
