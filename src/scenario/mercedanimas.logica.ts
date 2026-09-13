/**
 * LA MERCED DE LAS ÁNIMAS — lógica de escenas.
 *
 * Bifurcación de un solo camino: `celda-convento` conecta a `scriptorium`
 * (Rama A) y a `canaverales-fuga` (Rama B), y ninguna de las dos vuelve a
 * ningún lugar compartido — mismo patrón que el sótano de El Vigésimo
 * (`trastero-sotano → entrada-laberinto`, sin conexión de vuelta declarada).
 * Elegir una escena aquí es elegir la rama entera.
 *
 * El gateo de "ya entró en combate, gane o pierda o huya" copia el patrón
 * real de El Vigésimo (`denunciar`/`irse-vigesimo`, visibles por
 * `{op:'consecuencia', contiene:'entró en combate real contra Bernardo
 * Díaz'}`, NO por `npcFuera`): la consecuencia se registra en la MISMA
 * escena que inicia el combate, así que "ya pasó por esto" no depende de
 * haber ganado.
 */

import type { LogicaDeEscenas } from './cargarAventura.ts';

export const LA_MERCED_DE_LAS_ANIMAS_LOGICA: LogicaDeEscenas = [
  {
    id: 'leer-carta-ignacio',
    resolver: () => ({
      texto: [
        'El sello de cera todavía está tibio. La letra es clara, la de un hombre acostumbrado a que lo obedezcan sin levantar la voz.',
        'No dice cómo supo que había cargos por archivar. No dice, tampoco, cómo llama a quien no conoce.',
      ],
      documento: { id: 'doc-carta-ignacio', how: 'un novicio la deslizó por debajo de la puerta' },
    }),
  },

  {
    id: 'manuscrito-hondo',
    prueba: () => ({
      skill: 'ocultismo', difficulty: 'hard',
      reason: 'notar dónde una letra distinta se metió entre las líneas de otra',
      stakes_success: 'ves el agregado al margen y de qué mano es',
      stakes_failure: 'lo lees entero y no notás nada raro',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'Treinta y seis años de letra apretada, en un latín eclesiástico que cuesta seguir. Lo que dice coincide, línea por línea, con lo que cabría esperar de una instrucción antigua sobre límites y marcas.',
            'Nada llama la atención en particular.',
          ],
        };
      }
      return {
        texto: [
          'La mayor parte del legajo es una sola letra, pareja, de treinta y seis años atrás. Pero en un margen, con tinta visiblemente más nueva, hay una línea que no está en el mismo pulso que el resto: «pintar alcanza, si se pinta con fe y con constancia».',
          'Es la misma letra que sella la carta de esta noche. Fray Ignacio no heredó un error: lo agregó él mismo, convencido de estar corrigiendo uno.',
        ],
        exposicion: { amount: 4, source: 'mercedanimas:manuscrito', cause: 'ver a alguien deformar una instrucción de siglos convencido de estar mejorándola' },
        descubre: {
          itemId: 'it-manuscrito-1674', propertyId: 'p-manuscrito-deformado',
          how: 'comparando el pulso de la letra del margen con el resto del legajo',
        },
      };
    },
  },

  {
    id: 'entrenar-mosquete',
    resolver: ({ estado }) => ({
      texto: [
        'Uno de los soldados de la guardia, aburrido de vigilar peones que no van a ninguna parte, se ofrece a enseñarle lo básico: cargar, apuntar, no cerrar los ojos antes del fogonazo. Le presta su propio mosquete para las prácticas, y no lo vuelve a pedir.',
        'Es lo que se puede aprender en tres tardes, ni una gota más.',
      ],
      traslada: {
        itemId: 'it-mosquete-guardia', a: estado.activeInvestigator, carried: true,
        cause: 'el soldado se lo presta para las prácticas y no lo vuelve a pedir',
      },
      entrenar: {
        skill: 'armas_fuego', checkCharacteristic: 'dex', sessions: 3, cap: 50,
        teacher: 'un soldado de la guardia de Don Gonzalo',
      },
    }),
  },

  {
    id: 'combate-polipo',
    resolver: () => ({
      texto: [
        'El último tramo del desagüe corta directo por el punto más bajo de la ciénaga, donde el barro lleva sin ver el sol más tiempo que cualquiera de los presentes.',
        'La pala de un peón se hunde más de lo que debería, y lo que sale a la superficie con el barro no es agua: es presión, viento con demasiado peso, algo que se mueve por dentro de la tierra removida como si la tierra fuera agua.',
        'Los peones sueltan las herramientas y corren. Fray Ignacio grita que no se puede parar ahora, que el círculo tiene que pintarse mientras la cosa siga afuera, no después.',
      ],
      iniciaCombate: { npcIds: ['npc-polipo'], reason: 'el Pólipo Septentrional emerge de la desecación' },
      consecuencia: {
        description: 'En 1710, en la desecación de la Ciénaga de las Ánimas, un investigador entró en combate real contra el Pólipo Septentrional.',
        scope: 'scene', permanent: false, worldReminder: '',
      },
    }),
  },

  {
    id: 'pintar-circulo',
    prueba: (s) => {
      const yaSabia = s.consequences.some(
        (c) => c.description.includes('Eusebio Sosa alcanzó a explicarle'),
      );
      return {
        skill: 'ocultismo', difficulty: 'hard',
        reason: 'trazar de memoria un procedimiento que nadie explicó del todo, con el viento tirando el brazo',
        stakes_success: 'el círculo queda trazado como corresponde, cara contra el viento',
        stakes_failure: 'queda trazado, pero torcido, apurado',
        ...(yaSabia
          ? { bonus_dice: 1, modifier_reason: 'Eusebio Sosa ya le había explicado la parte que importa, doscientos veinte años más adelante' }
          : {}),
      };
    },
    resolver: ({ tirada }) => ({
      texto: [
        'Fray Ignacio sostiene el frasco de almagre con las dos manos, y le hace repetir a él el gesto que treinta y seis años atrás alguien grabó, no pintó, en otra piedra.',
        tirada?.exito
          ? 'Sale bien: la cara que mira contra el viento, sin apuro, como si el que mira desde adentro tuviera todo el tiempo del mundo. El primero de este lado tiembla apenas, y después queda quieto.'
          : 'Sale apurado, con el viento tirándole del brazo en cada trazo. El primero de este lado tiembla, y sigue temblando cuando ya no hay viento que lo justifique.',
      ],
      exposicion: { amount: 5, source: 'mercedanimas:pintar', cause: 'trazar a propósito un límite en un lugar que ya demostró que no es sólo tierra' },
    }),
  },

  {
    id: 'firmar-actas',
    resolver: () => ({
      texto: [
        'Fray Ignacio no le pregunta si quiere firmar: se lo pone adelante, ya escrito, con un espacio en blanco al pie.',
        '—Testigo de lo actuado. Así, sin más nombre que ése, nadie que lea esto en cien años va a poder decir que no estuvo.',
        'Firma. La letra sale con el pulso de quien no durmió, pero es una letra del siglo veinte en un libro del Cabildo de 1710.',
        'Esa misma noche, con el Zonda en su apogeo, el investigador vuelve al zanjón partido y se arroja a la grieta.',
      ],
      exposicion: { amount: 6, source: 'mercedanimas:firmar', cause: 'dejar, a propósito, un rastro de sí mismo doscientos veinte años antes de nacer' },
      consecuencia: {
        description: 'En 1710, el investigador firmó las actas del Cabildo de San Juan como testigo, ayudando al Círculo Rojo temprano a sellar el borde de la Ciénaga de las Ánimas con almagre colonial.',
        scope: 'campaign', permanent: true,
        worldReminder: 'Firmó un libro del Cabildo en 1710. Esa firma sigue ahí, esperando que alguien la encuentre en 1930.',
      },
      desenlace: {
        id: 'firmar-actas',
        title: 'Lo que queda escrito',
        text: [
          'El Cabildo de San Juan archiva las actas sin que a nadie le llame la atención una firma más entre tantas. Fray Ignacio muere convencido de haber corregido un error que en realidad cometió él mismo, y nadie después de él vuelve a comparar la letra del margen con el resto del legajo.',
          'El borde queda sellado —del modo controlador y a medias que el Círculo entendió, no del modo que Takillpa hubiera preferido— y eso alcanza, por ahora.',
          'Doscientos veinte años más tarde, en un archivo de San Juan que casi nadie visita, hay un libro de actas de 1710 con una firma que un investigador de 1930 reconoce como propia, escrita con una letra que en 1710 no debería haber existido.',
        ],
      },
    }),
  },

  {
    id: 'sabotaje-obras',
    prueba: () => ({
      skill: 'sigilo', difficulty: 'hard',
      reason: 'alterar mediciones y herramientas de la obra sin que la guardia de Don Gonzalo lo note',
      stakes_success: 'lo hace sin que nadie lo vea',
      stakes_failure: 'lo hace, pero Don Gonzalo y sus hombres lo sorprenden a mitad de camino',
    }),
    resolver: ({ tirada }) => {
      const base = [
        'Takillpa le muestra dónde aflojar las estacas de medición y dónde volcar el aceite que va a arruinar la pólvora guardada, sin decir una palabra más de la necesaria.',
      ];
      if (tirada?.exito) {
        return {
          texto: [
            ...base,
            'Sale limpio. Para cuando alguien note que las mediciones no cierran, va a ser de día, y el investigador va a estar lejos.',
            'No queda tiempo para otro intento: lo que había que hacer, ya está hecho.',
          ],
        };
      }
      return {
        texto: [
          ...base,
          'Una linterna se prende del otro lado del zanjón antes de terminar. Don Gonzalo de Estrada grita una orden, y no hay caña lo bastante alta para esconderse de un hombre que ya sabe dónde mirar.',
          '—¡Ahí! ¡El forastero! —Don Gonzalo avanza con la pistola ya en la mano, sin darle tiempo a explicar nada.',
          'No queda tiempo para otro intento: lo que había que hacer, ya está hecho, y ahora hay que resolver esto.',
        ],
        iniciaCombate: {
          npcIds: ['npc-gonzalo'],
          reason: 'Don Gonzalo sorprende al investigador saboteando las obras',
          salidaPacifica: {
            npcId: 'npc-gonzalo',
            pistaCalma: {
              description: 'Don Gonzalo se retira sin dar la voz de alarma a cambio de que el investigador desaparezca del pueblo esa misma noche.',
              kind: 'experiential', source: 'la ciénaga, de noche', reliability: 'reliable',
            },
            consecuenciaDisparo: {
              description: 'El investigador le disparó a Don Gonzalo de Estrada en la Ciénaga de las Ánimas, en vez de huir o negociar.',
              scope: 'campaign', permanent: true, worldReminder: 'Hirió o mató a un capitán de la rastrillería colonial a tiros.',
            },
          },
        },
      };
    },
  },

  {
    id: 'combate-vagabundo',
    resolver: () => ({
      texto: [
        'La piedra caliza asoma justo donde Takillpa dijo que iba a estar, con marcas que ninguna herramienta de picapedrero podría haber dejado.',
        'Apenas el punzón toca la piedra, el aire alrededor se pliega sobre sí mismo, y algo con piel de cuero viejo y garras que parecen momificadas sin estarlo aparece parado sobre el barro removido, como si el barro fuera una puerta que no sabía que tenía.',
        'Takillpa no retrocede.\n\n—Siga grabando. Yo lo distraigo.',
      ],
      iniciaCombate: { npcIds: ['npc-vagabundo'], reason: 'el Vagabundo Dimensional aparece atraído por la perturbación' },
      consecuencia: {
        description: 'En 1710, en la Ciénaga de las Ánimas, un investigador entró en combate real contra el Vagabundo Dimensional.',
        scope: 'scene', permanent: false, worldReminder: '',
      },
    }),
  },

  {
    id: 'cerrarle-el-paso-ritual',
    prueba: (s) => {
      const yaSabe = s.investigators[s.activeInvestigator]?.spellsKnown
        ?.some((h) => h.id === 'cerrarle-el-paso' || h.id === 'cerrarle-el-paso-huarpe');
      return {
        skill: 'ocultismo', difficulty: 'hard',
        reason: 'terminar de grabar el símbolo antes de que el Vagabundo vuelva a cruzar',
        stakes_success: 'la marca cierra el borde de verdad',
        stakes_failure: 'la marca queda incompleta y hay que reforzarla a los golpes',
        ...(yaSabe
          ? { bonus_dice: 1, modifier_reason: 'ya conoce el gesto de cerrarle el paso a algo que cruzó, aunque nunca lo vio hecho así' }
          : {}),
      };
    },
    resolver: ({ tirada, estado: s }) => {
      const yaSabe = s.investigators[s.activeInvestigator]?.spellsKnown
        ?.some((h) => h.id === 'cerrarle-el-paso' || h.id === 'cerrarle-el-paso-huarpe');
      const reconocimiento = yaSabe
        ? 'El gesto le resulta familiar de un modo que no puede explicar en este siglo: es el mismo límite cerrándose sobre lo que ya lo cruzó, sólo que dicho con las manos y en allentiac, no con seis puntos de Magia y una palabra aprendida de un libro sin título.'
        : 'Takillpa le hace repetir la postura tres veces, sin apuro, aunque el Vagabundo siga ahí. No hace falta papel ni fuego: hace falta saber dónde está el borde y decirle, con las manos, que se cierre.';
      return {
        texto: [
          reconocimiento,
          tirada?.exito
            ? 'La marca queda cerrada, honda, terminante — grabada, no pintada, en la piedra caliza de la ciénaga. El Vagabundo se pliega sobre sí mismo hasta no estar, como si nunca hubiera cruzado.'
            : 'La marca queda cerrada, honda, terminante, pero incompleta en un tramo: alcanza para que el Vagabundo se retire, no para que deje de ser un peligro en otra noche de viento fuerte.',
        ],
        ...(yaSabe ? {} : {
          aprenderHechizo: { id: 'cerrarle-el-paso-huarpe', source: 'Takillpa, en la Ciénaga de las Ánimas, 1710' },
          cordura: { amount: 1, cause: 'aprender, de memoria y de mano en mano, algo que hasta ahora sólo conocía de un libro' },
        }),
      };
    },
  },

  {
    id: 'fuga-final',
    resolver: () => ({
      texto: [
        'Los perros de la rastrillería ya cruzaron el puente de troncos cuando Takillpa lo empuja hacia el cauce seco al pie de los cerros.',
        '—Por acá el viento ya está caliente. Va a alcanzar.',
        'La fosa se abre exactamente donde Takillpa dijo que iba a estar, respirando un aire que huele a antes de que hubiera acequias con nombre de santo. El investigador salta, perseguido por gritos que se van quedando atrás.',
      ],
      exposicion: { amount: 6, source: 'mercedanimas:fuga', cause: 'cruzar la fosa como fugitivo, sin el permiso ni la bendición de nadie' },
      consecuencia: {
        description: 'En 1710, el investigador se alió con Takillpa y los guardianes huarpes, grabó la marca en la piedra caliza de la Ciénaga de las Ánimas, y cruzó de vuelta como fugitivo de la justicia colonial.',
        scope: 'campaign', permanent: true,
        worldReminder: 'Grabó una marca con sus propias manos en 1710, y se fue de esa época como un prófugo, sin firmar nada.',
      },
      desenlace: {
        id: 'fuga-final',
        title: 'Lo que queda grabado',
        text: [
          'El Cabildo de San Juan declara prófugo a un forastero de ropa extraña, y la causa se cierra sola con el tiempo, sin sentencia y sin nombre completo que anotar.',
          'La ciénaga queda contenida del modo que Takillpa entendía que había que contenerla: sin papel, sin firma, sin nadie que la use para predecir cosechas.',
          'Doscientos veinte años más tarde, en el mismo Valle de Zonda, un investigador camina el cauce seco de una acequia y encuentra, en una piedra caliza que nadie más mira dos veces, una marca grabada que él mismo hizo con sus propias manos — erosionada por dos siglos de viento Zonda, pero todavía legible para quien sepa qué está mirando.',
        ],
      },
    }),
  },
];
