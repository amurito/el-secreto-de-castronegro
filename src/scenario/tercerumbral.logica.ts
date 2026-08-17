/**
 * LA LÓGICA DE LAS ESCENAS DE LA FIRMA AJENA — lo único que no puede ser dato.
 *
 * Todo lo demás vive en `tercer-umbral.contenido.json`: lugares, objetos,
 * NPC, documentos, temas de conversación, botones, desenlaces, y las
 * condiciones de CUÁNDO responde cada escena.
 *
 * Acá queda `resolver` —con sus `antes`/`prueba`—, que es prosa que se arma
 * distinto según cómo salió la tirada y qué se descubrió antes. El `id` de
 * cada entrada la casa con su declaración en el JSON.
 */

import type { GameState } from '../shared/types.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const propiedadVista = (s: GameState, item: string) =>
  (s.items[item]?.discoveredProperties.length ?? 0) > 0;
const oculta = (s: GameState, item: string) => s.items[item]?.hiddenProperties[0]?.description ?? '';

export const TERCER_UMBRAL_LOGICA: LogicaDeEscenas = [
  // ══ INVESTIGACIÓN ═══════════════════════════════════════════════════════════

  {
    id: 'examinar-foto',
    prueba: (s) => propiedadVista(s, 'it-foto') ? null : ({
      skill: 'descubrir', difficulty: 'hard',
      reason: 'notar algo en la foto que no salta a la vista',
      stakes_success: 'notás el detalle',
      stakes_failure: 'un chico y un hombre mayor, nada más',
    }),
    resolver: ({ estado, tirada }) => {
      if (propiedadVista(estado, 'it-foto')) {
        return { texto: [oculta(estado, 'it-foto')] };
      }
      if (!tirada?.exito) {
        return { texto: ['Un chico serio, el hombre con la mano en su hombro. Los dos miran a la cámara. Nada que no se vea a simple vista.'] };
      }
      return [
        { descubre: { itemId: 'it-foto', propertyId: 'p-foto-oreja', how: 'mirando de cerca la oreja del chico en la foto' } },
        {
          texto: [oculta(estado, 'it-foto')],
          pistas: [{
            description: 'El chico de la foto de 1905 tiene el lóbulo de la oreja izquierda pegado, sin separación: un rasgo de familia, chico pero real.',
            kind: 'physical', source: 'fotografía de Alejo con Anastasio, 1905', reliability: 'reliable',
          }],
        },
      ];
    },
  },

  {
    id: 'examinar-cuchillo',
    prueba: (s) => propiedadVista(s, 'it-cuchillo') ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'notar cómo está afilado el filo',
      stakes_success: 'notás el detalle',
      stakes_failure: 'un cuchillo de mango de asta, nada más',
    }),
    resolver: ({ estado, tirada }) => {
      if (propiedadVista(estado, 'it-cuchillo')) {
        return { texto: [oculta(estado, 'it-cuchillo')] };
      }
      if (!tirada?.exito) {
        return { texto: ['Un cuchillo de hoja corta, mango de asta gastado, con una M grabada cerca de la virola. Nada que no se vea a simple vista.'] };
      }
      return [
        { descubre: { itemId: 'it-cuchillo', propertyId: 'p-cuchillo-filo', how: 'pasando el pulgar por los dos lados del filo' } },
        {
          texto: [oculta(estado, 'it-cuchillo')],
          pistas: [{
            description: 'El filo del cuchillo está afilado parejo de los dos lados, como lo afila alguien diestro. Todos coinciden en que Alejo era zurdo de chico.',
            kind: 'physical', source: 'cuchillo con mango de asta', reliability: 'reliable',
          }],
        },
      ];
    },
  },

  {
    id: 'leer-carta',
    resolver: ({ estado }) => {
      if (estado.documents['doc-carta']?.obtainedAt) {
        return { texto: ['Volvés a leer la carta. Ya la tenés entre tus documentos.'] };
      }
      return [
        {
          texto: [
            'Nación la saca de un cajón envuelta en un pañuelo, como si envolverla fuera parte de guardarla. ' +
            'Papel fino, tinta que ya vira a marrón, dobleces gastados de releerla muchas veces.',
          ],
          documento: { id: 'doc-carta', how: 'Nación la guardaba envuelta en un pañuelo, en su cuarto' },
        },
        {
          texto: [
            'Se la lleva a los labios, no para leerla otra vez —ya se la sabe de memoria— sino como quien besa ' +
            'algo antes de guardarlo. —Tenía diecinueve años cuando la escribió —dice—. Todavía le tenía miedo a la ' +
            'oscuridad y no me lo iba a admitir nunca, así que lo escribía disfrazado de otras cosas.',
          ],
        },
      ];
    },
  },

  {
    id: 'buscar-partida',
    prueba: (s) => s.documents['doc-partida']?.obtainedAt ? null : ({
      skill: 'buscar_libros', difficulty: 'regular',
      reason: 'seguir el orden del registro parroquial hasta 1895',
      stakes_success: 'encontrás la partida de Alejo',
      stakes_failure: 'bautismos y defunciones de otras familias',
    }),
    resolver: ({ estado, tirada, variante }) => {
      if (estado.documents['doc-partida']?.obtainedAt) {
        return { texto: ['Volvés sobre la partida de Alejo. Ya la tenés entre tus documentos.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [variante([
            'El registro va por año y por mes, con la misma letra pareja durante décadas. Encontrás bautismos, ' +
            'casamientos y defunciones de otras familias de la zona. Todavía no el que buscás.',
            'Otra pasada por 1895. Se puede seguir buscando: el libro es grueso y la letra, chica.',
          ])],
        };
      }
      return [
        {
          texto: [
            'Marzo de 1895. La partida está donde tiene que estar, con la firma del cura de la época y dos ' +
            'padrinos: Anastasio Ferreyra y Encarnación Suárez de Ferreyra.',
          ],
          documento: { id: 'doc-partida', how: 'en el registro parroquial, en el folio de marzo de 1895' },
        },
        {
          texto: [
            'Y hay una nota al margen, con otra letra y otra tinta, sin fecha: zurdo de nacimiento, se le corrigió ' +
            'la mano para escribir. La misma corrección que contó Nación, escrita por alguien más, en otro momento, ' +
            'sin que nadie se la pidiera.',
          ],
          exposicion: { amount: 3, source: 'partida:margen', cause: 'una nota al margen que confirma un detalle nadie fue a buscar' },
        },
      ];
    },
  },

  {
    id: 'cotejar-testimonios',
    resolver: ({ estado }) => {
      const n = pista(estado, 'golpeó el portón un miércoles');
      const c = pista(estado, 'llegó de tarde, no de noche');
      const m = pista(estado, 'llegó casi a medianoche');

      if (!(n && c)) {
        return {
          texto: [
            'Ponés en una columna lo que dijo cada uno sobre esa noche. Todavía falta gente por escuchar: con un ' +
            'solo relato no hay nada que cotejar, y con dos que no chocan, tampoco.',
          ],
        };
      }

      const efectos: any[] = [{
        texto: [
          'Ponés los tres relatos en fila, con la letra prolija de quien anota para no olvidar.\n\n' +
          'NACIÓN: miércoles a la noche, solo, con una valija chica.\n' +
          'CEFERINO: viernes de tarde, acompañado por alguien que no bajó del sulky.\n' +
          (m ? 'MARTINIANO: casi medianoche, a pie, solo, sin valija.\n' : '') +
          '\nTres personas, un mismo hombre entrando por el mismo portón, y ni el día ni la hora ni la compañía ' +
          'coinciden entre ninguna de las tres versiones. No es que se contradigan en un detalle chico: cada una ' +
          'describe una llegada distinta, completa, con su propia lógica.\n\n' +
          'Y ninguna de las tres suena a que esté mintiendo. Cada uno cuenta lo que recuerda con la misma ' +
          'seguridad con la que contaría cualquier otra cosa de su vida.',
        ],
        estabilidad: { amount: -6, cause: 'tres testigos seguros, cada uno de una llegada distinta' },
        exposicion: { amount: 6, source: 'testimonios:cotejar', cause: 'entender que ninguno de los tres miente y aun así no coinciden' },
        contradiccion: {
          description: 'Tres testigos describen tres llegadas distintas y completas —día, hora, compañía— para la misma noche de vuelta, cada uno con total seguridad.',
          between: 'Encarnación Ferreyra | Ceferino Bracamonte | Martiniano Ibarra',
        },
        pistas: [{
          description: 'Imposible que los tres cuenten lo mismo: la noche en que Alejo volvió tiene tres versiones completas, distintas, y ninguna suena a mentira.',
          kind: 'experiential', source: 'cotejo de los tres testimonios', reliability: 'reliable',
        }],
      }];
      return efectos;
    },
  },

  {
    id: 'mostrar-foto-a-alejo',
    resolver: () => ({
      texto: [
        'Le mostrás la fotografía. La toma con las dos manos, despacio, y la mira un rato largo —más tiempo del ' +
        'que hacía falta para reconocer una foto propia.\n\n' +
        '—Éramos así —dice, al final, y se la devuelve sin apuro—. Chiquito y con miedo de que se me note el ' +
        'miedo. Tenía diez años y todavía le tenía terror a la noche, hasta que el tío me convenció de que no ' +
        'había nada ahí adentro peor que lo de afuera.\n\n' +
        'No mira la foto de nuevo. La mira a usted, esperando ver qué hace con lo que acaba de decir.',
      ],
      pistas: [{
        description: 'Alejo miró la fotografía mucho más tiempo del que hacía falta para reconocerla, antes de decir algo sobre ella.',
        kind: 'testimonial', source: 'reacción de Alejo ante la fotografía', reliability: 'unknown',
      }],
    }),
  },

  {
    id: 'romper-foto',
    resolver: () => ({
      texto: [
        'La rompés. No cuesta nada romper una foto vieja: el papel cede al primer tirón y quedan dos mitades, ' +
        'un chico de un lado y un hombre mayor del otro.\n\n' +
        'Nación lo ve desde la puerta. No grita. Se queda mirando las dos mitades en el piso con una cara que no ' +
        'es de furia: es de alguien que acaba de entender que usted no vino a ayudar.',
      ],
      estabilidad: { amount: -4, cause: 'destruir a propósito la única prueba tierna que había' },
      npc: { id: 'npc-nacion', attitudeDelta: -15, patienceDelta: -20, cause: 'romperle la fotografía delante de ella' },
      consecuencia: {
        description: 'El investigador rompió la fotografía de Alejo con Anastasio.',
        scope: 'campaign', permanent: true,
        worldReminder: 'La fotografía de Alejo con Anastasio está rota en dos mitades. Nación no volvió a mencionarla.',
      },
    }),
  },

  {
    id: 'dormir',
    resolver: ({ estado }) => {
      const exp = estado.investigators[estado.activeInvestigator]?.umbral.exposure ?? 0;
      const base = { tiempo: { minutes: 300, reason: 'dormir' }, estabilidad: { amount: 5, cause: 'descanso' } };
      if (exp < 15) {
        return { ...base, texto: ['Dormís unas horas en el cuarto que le dieron. Sin sueños que valga la pena contar.'] };
      }
      return {
        ...base,
        texto: [
          'Dormís mal. Soñás con el zaguán, con el espejo de marco oscuro, y en el sueño hay dos personas paradas ' +
          'ahí, una atrás de la otra, tan juntas que ocupan el mismo lugar. Las dos lo miran salir del sueño con la ' +
          'misma cara, todavía sin decidir cuál de las dos es la que se queda.',
        ],
        exposicion: { amount: 3, source: 'sueno', cause: 'un sueño con contenido que no le pertenece' },
      };
    },
  },

  // ══ DESENLACES ══════════════════════════════════════════════════════════════

  {
    id: 'fin-avalar',
    resolver: () => ({
      texto: [
        'Firmás la declaración. Alejo Ferreyra, hijo de Custodio Ferreyra y Rosa Miqueo, identidad reconocida ' +
        'por quien suscribe.',
      ],
      estabilidad: { amount: -6, cause: 'certificar algo que no pudo probarse del todo' },
      consecuencia: {
        description: 'El investigador avaló la identidad de Alejo Ferreyra ante el juzgado.',
        scope: 'world', permanent: true,
        worldReminder: 'Existe un papel firmado que certifica que ese hombre es Alejo Ferreyra. Nadie más volvió a preguntarlo.',
      },
      desenlace: {
        id: 'avalar', title: 'Lo que se avala',
        text:
          'El juez recibe la declaración en octubre y no hace preguntas de más: tiene un papel firmado por alguien ' +
          'de afuera, sin interés en el resultado, y con eso alcanza para todo lo que la ley necesita.\n\n' +
          'Nación llora al enterarse, del alivio, no de otra cosa. Ceferino sigue llevando los libros, ahora con un ' +
          'patrón encima que firma lo que le ponen adelante. Martiniano no dice nada, ni a favor ni en contra: ' +
          'sigue con los caballos que ya no trabajan.\n\n' +
          'Y Alejo Ferreyra —o quien sea que ahora se llama así de manera oficial y para siempre— hereda Los ' +
          'Cardales, se para en el espejo del zaguán las mañanas que se afeita, y con los años nadie, ni él mismo, ' +
          'vuelve a hacer la pregunta que usted vino a contestar. Se contestó. Eso es lo único que quedó firme.',
      },
    }),
  },

  {
    id: 'fin-desmentir',
    resolver: () => ({
      texto: [
        'Escribís la declaración contraria: no hay elementos suficientes para reconocer a este hombre como Alejo ' +
        'Ferreyra. Se la das a Ceferino, que la lee dos veces antes de guardarla.',
      ],
      estabilidad: { amount: -8, cause: 'desconocer a un hombre que puede, después de todo, ser quien dice ser' },
      consecuencia: {
        description: 'El investigador desmintió la identidad del hombre que dice ser Alejo Ferreyra.',
        scope: 'world', permanent: true,
        worldReminder: 'Existe una declaración que desconoce a ese hombre como heredero. Los Cardales queda sin dueño resuelto.',
      },
      desenlace: {
        id: 'desmentir', title: 'Lo que se desmiente',
        text:
          'El hombre no discute cuando se lo dicen. Junta lo poco que trajo, la misma valija chica de la que habló ' +
          'Nación, y se va una madrugada sin despedirse de nadie más que de ella.\n\n' +
          'Nación no vuelve a hablarle a usted en su vida, y tiene razón en no hacerlo: usted mismo, {trato}, no ' +
          'terminó de estar seguro. Tenía un antebrazo equivocado y un filo que no debería tener, y con eso alcanzó, ' +
          'porque alcanzar es lo único que la ley necesita.\n\n' +
          'Los Cardales queda sin heredero confirmado. Ceferino sigue administrando, ahora sin nadie que le pida ' +
          'cuentas, que es exactamente lo que él quería desde el principio.\n\n' +
          'Y en algún pueblo del sur, un hombre que se llamaba Alejo Ferreyra —o que decidió que se llamaba así— ' +
          'sigue, en algún lado, sin que nadie vuelva a preguntarle nada.',
      },
    }),
  },

  {
    id: 'fin-quemar',
    resolver: () => ({
      texto: [
        'Quemás la carta y la fotografía en el brasero de la cocina, hoja por hoja, hasta que no queda nada ' +
        'legible ni reconocible.',
      ],
      estabilidad: { amount: -6, cause: 'elegir que la pregunta no tenga con qué contestarse nunca' },
      consecuencia: {
        description: 'La carta de 1917 y la fotografía de Alejo con Anastasio dejaron de existir.',
        scope: 'world', permanent: true,
        worldReminder: 'No queda ninguna prueba física sobre la identidad de Alejo. La pregunta quedó, literalmente, sin con qué contestarse.',
      },
      desenlace: {
        id: 'quemar', title: 'Lo que se quema',
        text:
          'Sin la carta y sin la foto, lo único que queda son testimonios que se contradicen entre sí y una M ' +
          'grabada en un cuchillo que puede significar dos apellidos distintos.\n\n' +
          'El juzgado, sin nada que pesar, termina fallando a favor de la posesión de hecho: dos años viviendo en ' +
          'Los Cardales como Alejo Ferreyra bastan, a falta de algo que los contradiga en papel.\n\n' +
          'Nación nunca sabe qué pasó con la carta. Pregunta un par de veces, al principio, y después deja de ' +
          'preguntar, como si entendiera —sin que se lo digan— que hay respuestas que dejaron de estar disponibles ' +
          'a propósito.\n\n' +
          'Usted se va de Los Cardales con la certeza más incómoda de todas: no que no sabe quién es ese hombre, ' +
          'sino que decidió, con sus propias manos, que nadie lo vuelva a saber nunca.',
      },
    }),
  },

  {
    id: 'fin-irse',
    resolver: () => ({
      consecuencia: {
        description: 'El investigador se fue de Los Cardales sin certificar nada.',
        scope: 'world', permanent: true,
        worldReminder: 'Los Cardales quedó sin declaración de identidad. La herencia sigue trabada.',
      },
      desenlace: {
        id: 'irse', title: 'Lo que no se firma',
        text:
          'Junta sus cosas y pide que la lleven a la estación. Nadie discute la decisión de irse sin contestar: en ' +
          'este oficio, a veces no contestar es la única respuesta honesta que hay.\n\n' +
          'Los Cardales sigue sin heredero confirmado. Nación sigue esperando algo que ya tiene, sin poder ' +
          'demostrarlo. Ceferino administra sin que nadie lo audite. Martiniano vuelve a los caballos que ya no ' +
          'trabajan, y guarda para siempre lo que vio esa noche por el rabillo del ojo.\n\n' +
          'Y el hombre que dice llamarse Alejo Ferreyra sigue en la casa donde nació —o donde no— sin que nadie, ' +
          'nunca, termine de decidir cuál de las dos cosas es cierta.',
      },
    }),
  },

  {
    id: 'fin-preguntar',
    antes: () => ({
      texto: [
        'Le pide que se quede quieto un momento y lo mira, de verdad, sin la cortesía de mirar para otro lado ' +
        'cuando la pregunta empieza a doler.\n\n' +
        '—¿Quién es usted? —Lo dice despacio, para que no quede ninguna palabra de esa pregunta sin que la haya ' +
        'escuchado bien.',
      ],
    }),
    prueba: () => ({
      skill: 'POW', difficulty: 'hard',
      reason: 'sostenerle la mirada hasta que conteste algo que no sea un hábito de contestar',
      stakes_success: 'la pregunta llega entera, sin que él encuentre por dónde escaparle',
      stakes_failure: 'para cuando termina de hablar, no está claro quién le sacó algo a quién',
      penalty_dice: 1, modifier_reason: 'nadie pregunta esto sin pagarlo, ni siquiera el que pregunta',
    }),
    resolver: ({ tirada }) => {
      const firme = tirada?.exito ?? false;
      const grado = tirada?.grado;
      const pifio = grado === 'fumble';
      const critico = grado === 'critical';
      return [
        {
          exposicion: { amount: pifio ? 22 : 16, source: 'alejo:pregunta', cause: 'sostener la pregunta hasta que él contestara algo de verdad' },
          estabilidad: { amount: pifio ? -28 : critico ? -8 : firme ? -14 : -20, cause: 'lo que contestó, o lo que no pudo contestar' },
          cordura: {
            amount: pifio ? 6 : critico ? 2 : firme ? 3 : 4,
            cause: 'ver de cerca, sin poder mirar para otro lado, que alguien no sabe quién es',
            crisis: {
              nombre: 'Sospecha de las caras conocidas', tipo: 'mania',
              descripcion:
                'Desde Los Cardales, cualquier cara conocida —un pariente, un vecino de toda la vida, la propia ' +
                'en el espejo— pide, aunque sea un segundo, ser verificada de nuevo antes de confiar en ella. No ' +
                'es que dude de la gente: es que dejó de confiar en que reconocer sea lo mismo que saber.',
              afecta: [{ skill: 'persuasion', dados: 1 }, { skill: 'psicologia', dados: -1 }],
            },
          },
          pistas: [{
            description: 'Al preguntarle directamente quién es, algo en su respuesta —lo que dijo, o lo que no pudo decir— cambió lo que se sabe de él para siempre.',
            kind: 'experiential', source: 'confrontación directa', reliability: 'reliable',
          }],
          texto: pifio
            ? [
                '—Soy quien tengo que ser. —Y la voz le sale distinta, más de una persona hablando a la vez, o eso ' +
                'le parece a usted por un instante que no puede volver a comprobar—. ¿Usted no? ¿Usted está tan ' +
                'seguro de quién es, {trato}, cuando nadie lo está mirando?\n\n' +
                'No contesta más que eso. No hace falta: la pregunta que le devolvió se le queda pegada a usted ' +
                'de una manera que la respuesta original nunca se le iba a pegar.',
              ]
            : critico
              ? [
                  'Se queda callado un momento largo, y cuando contesta, contesta de verdad: —No sé si soy Alejo ' +
                  'porque me acuerdo de serlo, o si me acuerdo de serlo porque hace ocho años decidí que no tenía ' +
                  'otra opción. Un hombre solo, en la frontera, sin papeles y sin nadie que lo esperara con ese ' +
                  'nombre: usted no sabe lo fácil que es, en esas condiciones, terminar de convencerse.\n\n' +
                  'Es lo más cerca de la verdad que va a estar en toda la aventura, y usted lo sabe reconocer en el ' +
                  'momento en que lo dice.',
                ]
              : firme
                ? [
                    '—Soy Alejo —dice, otra vez, pero esta vez algo le tiembla debajo de la calma habitual, apenas ' +
                    'lo suficiente para que usted lo note—. Y si no lo soy, {trato}, hace ocho años que soy la ' +
                    'única persona que tengo con quien vivir, así que a esta altura ya no sé qué diferencia haría.',
                  ]
                : [
                    '—Ya contesté eso. —Se levanta, y esta vez usted no logra que se quede: la pregunta llegó, pero ' +
                    'no logró quedarse el tiempo suficiente para sacarle algo más que lo que ya tenía.',
                  ],
        },
        {
          desenlace: {
            id: 'preguntar', title: 'Lo que contesta',
            text: pifio
              ? 'No hay declaración, no hay papel, no hay juzgado esa semana. Hay usted, {trato}, sentado en la ' +
                'galería de Los Cardales, mirando al hombre que se llama Alejo y preguntándose, por primera vez en ' +
                'su carrera, si la pregunta que le devolvieron tiene mejor respuesta que la que usted vino a hacer.\n\n' +
                'Vuelve al pueblo sin firmar nada. Los Cardales sigue sin heredero confirmado, y usted sigue, ' +
                'durante mucho más tiempo del que le gustaría admitir, revisando caras conocidas en busca de algo ' +
                'que ya no sabe nombrar.'
              : critico
                ? 'Lo que Alejo le dijo esa tarde no entra en ninguna declaración jurada: no es un hecho, es una ' +
                  'confesión sin delito. Usted igual escribe su informe —avala, o no, según lo que decida hacer con ' +
                  'lo que acaba de escuchar— pero lo escribe sabiendo algo que ningún papel va a poder contener: que ' +
                  'la pregunta «¿quién es usted?» tiene, a veces, una sola respuesta honesta, y es «ya no estoy ' +
                  'seguro», dicha por alguien que de verdad la está intentando contestar.\n\n' +
                  'Eso no resuelve la herencia. Resuelve algo más difícil de nombrar, y usted se va de Los Cardales ' +
                  'sabiendo que fue eso, y no el papel, lo que vino a buscar de verdad.'
                : firme
                  ? 'No consigue una confesión ni una prueba. Consigue, en cambio, algo que no esperaba: verlo dudar, ' +
                    'un segundo, de sí mismo, con la misma cara con la que dudaría cualquiera al que le preguntan algo ' +
                    'demasiado grande.\n\n' +
                    'Con eso usted escribe su informe, {trato}, y en algún lugar del texto —sin decirlo del todo— ' +
                    'queda constancia de que la pregunta importó más que la respuesta que consiguió.'
                  : 'Se queda con la pregunta hecha y sin nada más que hacer con ella. Alejo —o quien sea— vuelve a ' +
                    'la rutina de la estancia como si la conversación no hubiera pasado, y usted entiende que no va a ' +
                    'sacarle más que eso, por más que insista.\n\n' +
                    'Escribe su informe con lo que ya tenía antes de preguntar. La pregunta, al final, sólo le costó a ' +
                    'usted.',
          },
        },
      ];
    },
  },
];
