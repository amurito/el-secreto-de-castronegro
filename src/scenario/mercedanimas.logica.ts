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
    id: 'manuscrito-fisico',
    prueba: () => ({
      skill: 'historia', difficulty: 'regular',
      reason: 'ubicar el papel, la tinta y la costura del legajo en su época y su origen',
      stakes_success: 'confirmás que el material es lo que Fray Ignacio dice que es',
      stakes_failure: 'no sabés distinguir esto de una falsificación reciente',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'El papel es viejo, la tinta también, la costura no se ve nueva. Más allá de eso, no hay con qué comparar: nunca tuvo en las manos otro legajo de este siglo para saber qué es normal y qué no.',
          ],
        };
      }
      return {
        texto: [
          'El papel tiene la textura y el gramaje de una manufactura andina de comienzos de siglo, no la de nada hecho en los últimos años. La tinta es de agalla, envejecida de verdad, no ennegrecida a propósito. La costura del lomo es la de un taller, no la de alguien imitando un taller.',
          'Esto no es un cuento que Fray Ignacio armó para impresionar a un forastero: viajó de verdad 1300 leguas en treinta y seis años, de mano en mano, hasta llegar a esta mesa.',
        ],
        descubre: {
          itemId: 'it-manuscrito-1674', propertyId: 'p-manuscrito-autentico',
          how: 'comparando el papel, la tinta y la costura con lo que se sabe de manufactura de la época',
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
        'La pala de un peón se hunde más de lo que debería. No sale barro: sale aire, de golpe, con un ruido que no es de aire, y el agua de las zanjas de alrededor se levanta entera medio metro sin que nada la empuje.',
        'Lo que sube después no tiene forma que se pueda sostener con la vista. Es presión. Es viento con demasiado peso. Es algo que se mueve por dentro de la tierra removida como si la tierra fuera agua, y donde pasa, la luz de la mañana llega tarde.',
        'Un peón que no alcanzó a soltar la pala se va con ella hacia arriba, y arriba se acaba antes de lo que debería. No grita. Eso es lo peor: que no grita.',
        'Los demás sueltan las herramientas y corren. Fray Ignacio no corre. Grita que no se puede parar ahora, que el círculo tiene que pintarse mientras la cosa siga afuera, no después.',
      ],
      // El Pólipo arranca `present: false` y aparece ACÁ. Antes estaba
      // presente desde que se llegaba a `obras-cofradia`: el jugador leía
      // «Pólipo Septentrional está acá» junto al botón de pedirle a la
      // guardia que le enseñe a disparar, con la barra de combate llena,
      // media hora antes de que la aventura lo hiciera emerger. Mismo bug
      // —y mismo arreglo— que el Vagabundo Dimensional (ROADMAP
      // §3.2-septquadragies): se corrigió uno de los dos y no el otro.
      npc: { id: 'npc-polipo', present: true, cause: 'emergió del barro removido de la desecación' },
      // Ver esto cuesta, y hasta ahora no costaba nada: la escena abría el
      // combate sin una sola tirada de Cordura de por medio. Reportado
      // jugando: «la aparición debería ser algo épico, que necesita su
      // tirada de cordura también».
      cordura: {
        amount: 5,
        cause: 'ver salir de la tierra algo que no tiene forma que la vista pueda sostener, y llevarse a un hombre sin que alcance a gritar',
        crisis: {
          nombre: 'Pánico al aire que se mueve mal',
          descripcion: 'Una ráfaga que levanta polvo en círculo, una puerta que sopla al abrirse, el aire caliente subiendo de una chapa: por un instante es otra vez la mañana de la ciénaga, y algo está por salir del suelo.',
          tipo: 'phobia',
          afecta: [{ skill: 'esquivar', dados: 1 }],
        },
      },
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
        'Esa misma noche, con el Zonda en su apogeo, vuelve al zanjón partido a buscar la grieta.',
        'No está.',
        'Donde el aire se plegaba sobre sí mismo hay ahora piedra y barro seco, y una capa de almagre todavía fresca sobre la cara que mira contra el viento. El borde quedó cerrado. Eso era, exactamente, lo que había que hacer.',
        'Fray Ignacio lo encuentra ahí cuando ya aclara, sentado en el fondo del zanjón, con la mano apoyada en la piedra pintada como quien espera que algo la vuelva a abrir desde el otro lado.\n\n—Sabía que iba a pasar esto —dice, y no suena a triunfo—. Se lo habría dicho, si me hubiera creído que yo también leí el legajo entero.',
      ],
      exposicion: { amount: 6, source: 'mercedanimas:firmar', cause: 'dejar, a propósito, un rastro de sí mismo doscientos veinte años antes de nacer' },
      consecuencia: {
        description: 'En 1710, el investigador firmó las actas del Cabildo de San Juan como testigo, ayudó al Círculo Rojo temprano a sellar el borde de la Ciénaga de las Ánimas con almagre colonial, y al cerrarlo se quedó de este lado: la grieta por la que había cruzado ya no existe.',
        scope: 'campaign', permanent: true,
        worldReminder: 'Cerró el borde y se quedó en 1710, del lado del Círculo. La grieta del Zonda no está más.',
      },
      desenlace: {
        id: 'firmar-actas',
        title: 'Lo que queda escrito',
        text: [
          'Nadie le explicó nunca —ni Eusebio, ni Fray Ignacio, ni el legajo— que el borde es uno solo, y que cerrarlo lo cierra en las dos direcciones. Era la única forma de salvar el valle, y era también la única forma de no volver.',
'El Cabildo de San Juan archiva las actas sin que a nadie le llame la atención una firma más entre tantas. Fray Ignacio guarda el legajo bajo el brazo, convencido de haber corregido un error que en realidad cometió él mismo, y mira el camino de la villa con la cara de quien acaba de recordar que aún falta rendir cuentas ante alguien.',
          'El borde queda sellado —del modo controlador y a medias que el Círculo entendió, no del modo que Takillpa hubiera preferido— y eso alcanza, por ahora. Por ahora.',
          'Doscientos veinte años más tarde, en un archivo de San Juan que casi nadie visita, hay un libro de actas de 1710 con una firma escrita con una letra que en 1710 no debería haber existido. Nadie la mira dos veces.',
          'Y en el Valle de Zonda, en 1930, un pozo de acequia vuelve a secarse sin que nadie recuerde por qué hubo que pintarlo todos esos años.',
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
      // Estaba `present: false` desde el arranque de la escena: hasta este
      // momento no había forma de que el jugador lo viera ni le hablara,
      // aunque figurara en `npcsPresent` de `cienaga-sabotaje` (lo exige el
      // validador: un NPC de combate necesita lugar propio antes de existir).
      // Reportado jugando: aparecía ya sentado junto a Don Gonzalo desde que
      // se llega a la ciénaga, mucho antes del sabotaje.
      npc: { id: 'npc-vagabundo', present: true, cause: 'apareció atraído por la perturbación en la piedra' },
      consecuencia: {
        description: 'En 1710, en la Ciénaga de las Ánimas, un investigador entró en combate real contra el Vagabundo Dimensional.',
        scope: 'scene', permanent: false, worldReminder: '',
      },
    }),
  },

  {
    id: 'atender-takillpa',
    prueba: () => ({
      skill: 'primeros_auxilios', difficulty: 'regular',
      reason: 'contener el sangrado de Takillpa sin herramientas y sin poder detenerse del todo',
      stakes_success: 'el sangrado para antes de que importe',
      stakes_failure: 'no alcanza el tiempo para hacer más que un vendaje improvisado',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'Takillpa se sienta apenas termina la pelea, con la mano prensada contra el costado. No se quejó ni una vez mientras duró.',
            'No hay tiempo para hacer más que un vendaje improvisado con lo que hay a mano, y no alcanza para saber si va a aguantar la carrera que falta. No es nada que vaya a impedirle grabar el resto de la marca — ahora mismo, al menos.',
          ],
        };
      }
      return {
        texto: [
          'Takillpa se sienta apenas termina la pelea, con la mano prensada contra el costado. No se quejó ni una vez mientras duró.',
          'El corte es superficial, más susto que herida, y el sangrado para en cuanto se le hace presión donde corresponde. No es nada que vaya a impedirle grabar el resto de la marca, ni la carrera que falta después.',
        ],
      };
    },
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
        'La fosa está exactamente donde Takillpa dijo que iba a estar. Pero ya no respira.',
        'El aire que sale de ella es aire de acá, de esta noche, con olor a barro y a perro mojado. Nada se pliega. Nada llega tarde. El investigador se para al borde con los gritos de la rastrillería acercándose por atrás, y lo entiende sin que nadie se lo diga: la marca que acaba de grabar hace exactamente lo que tenía que hacer.',
        'Takillpa lo agarra del brazo y lo tira hacia las cañas antes de que los faroles doblen el recodo.\n\n—Cerrar es cerrar —dice—. De los dos lados. Nadie le prometió otra cosa.',
      ],
      exposicion: { amount: 6, source: 'mercedanimas:fuga', cause: 'entender, parado al borde de la fosa, que la cerró con uno mismo de este lado' },
      consecuencia: {
        description: 'En 1710, el investigador se alió con Takillpa y los guardianes huarpes, grabó la marca en la piedra caliza de la Ciénaga de las Ánimas, y al cerrar el borde se quedó de este lado: la fosa por la que había cruzado dejó de respirar.',
        scope: 'campaign', permanent: true,
        worldReminder: 'Cerró el borde y se quedó en 1710, prófugo, del lado de los guardianes huarpes.',
      },
      desenlace: {
        id: 'fuga-final',
        title: 'Lo que queda grabado',
        text: [
          'Nadie le explicó nunca —ni Eusebio, ni Takillpa, ni la piedra— que el borde es uno solo, y que cerrarlo lo cierra en las dos direcciones. Era la única forma de salvar el valle, y era también la única forma de no volver.',
          'Antes de que aclare, el Cabildo de San Juan ya declaró prófugo a un forastero de ropa extraña, sin nombre completo que anotar. Los perros de la rastrillería siguen el rastro hasta el cauce y ahí se enredan un rato en el barro. Es lo único que Takillpa necesitaba: un rato.',
          'La ciénaga queda contenida del modo que Takillpa entendía que había que contenerla: sin papel, sin firma, sin nadie que la use para predecir cosechas. Y queda, por primera vez en tres generaciones, alguien más a quien enseñarle cómo se hace.',
          'Doscientos veinte años más tarde, en el mismo Valle de Zonda, en una piedra caliza que nadie mira dos veces, hay una marca grabada erosionada por dos siglos de viento Zonda. La hizo alguien que en 1930 todavía no había nacido, y que no llegó a verla envejecer desde el otro lado.',
        ],
      },
    }),
  },
];
