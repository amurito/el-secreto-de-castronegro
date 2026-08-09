/**
 * AGUA QUIETA — miniaventura de prueba del motor. ~1 hora.
 *
 * Conexión con el universo: INDIRECTA y deliberadamente incompleta.
 * v0.7 §1.3 dice que Agua Blanca es el primer punto CONOCIDO donde el Umbral
 * se manifiesta de forma natural — "conocido" deja lugar para otros. Este
 * escenario usa ese margen: un agua que se comporta de la misma manera, en otro
 * sitio, sin que nadie pueda todavía explicar por qué.
 *
 * NO revela, por diseño:
 *   · la identidad del Primer Rostro
 *   · la verdad completa del Umbral
 *   · la naturaleza de Yog-Sothoth
 *   · la historia del anillo
 * El nombre "agua blanca" aparece UNA vez, en un registro catastral viejo, y
 * quien lo escribió creía que hablaba de un mineral. Esa es toda la conexión.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { Item, Npc, DiegeticDocument, GameLocation, TemporalEvent } from '../shared/types.ts';
import { ELENA, TOMAS } from './pregens.ts';

const SET = { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' } as const;

// ─────────────────────────────────────────────────────────────────────────────
// LOCALIZACIONES
// ─────────────────────────────────────────────────────────────────────────────

const locations: Record<string, GameLocation> = {
  patio: {
    id: 'patio',
    name: 'El patio y el aljibe',
    description:
      'Un patio de tierra apisonada entre la casa y el galpón. En el centro, un aljibe de ladrillo ' +
      'con brocal de piedra y una roldana sin soga. Tres álamos flacos dan una sombra que no alcanza.',
    atmosphere: [
      'El agua del aljibe está completamente inmóvil. Ni siquiera cuando sopla viento.',
      'La soga de la roldana no está. Rosa dice que la sacó ella. No dice cuándo.',
      'Alrededor del brocal, la tierra está más pisada de un lado que del otro.',
    ],
    connections: ['casa', 'orilla'],
    itemsPresent: ['it-reloj'],
    npcsPresent: ['npc-rosa'],
    visited: false,
    umbralIntensity: 6,
    senses: {
      sound: [
        'No se oye nada del agua. Un aljibe hace ruido — gotea, respira, devuelve el eco de tu voz. Este no.',
        'Los álamos suenan arriba. El patio, abajo, está en silencio.',
      ],
      smell: ['Huele a tierra seca y a ladrillo mojado, que son dos olores que no deberían convivir en octubre.'],
      touch: ['La piedra del brocal está fría de un lado y tibia del otro, y el sol le da parejo a los dos.'],
    },
    features: [
      {
        id: 'f-brocal', names: ['brocal', 'piedra', 'borde del aljibe'],
        description: 'Piedra gastada por generaciones de sogas. Hay un surco profundo de un solo lado.',
        closerLook:
          'El surco de la soga está de un lado nomás, y del otro lado la piedra está lisa. Alguien usó este aljibe ' +
          'durante décadas parándose siempre en el mismo sitio. Sobre el borde interior, a unos centímetros del agua, ' +
          'hay una marca a cuchillo: una raya y una fecha, 14/8. La marca de nivel de Ignacio. El agua está exactamente ahí.',
        exposure: 2,
        clue: {
          description: 'La marca de nivel que Ignacio talló el 14 de agosto coincide exactamente con el nivel actual del agua, dos meses después.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-roldana', names: ['roldana', 'polea', 'soga', 'cuerda'],
        description: 'Una roldana de hierro, oxidada pero entera. No tiene soga.',
        closerLook:
          'La roldana gira sin trabarse: alguien la usó hace poco. En el gancho quedan tres fibras de soga nueva, ' +
          'cortadas limpio con cuchillo, no gastadas. La cortaron a propósito y sin apuro.',
        clue: {
          description: 'La soga del aljibe fue cortada a cuchillo, deliberadamente y sin apuro, no se gastó ni se rompió.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-tierra', names: ['tierra', 'suelo', 'piso', 'huellas', 'pisadas'],
        description: 'Tierra apisonada. Alrededor del brocal está más pisada de un lado que del otro.',
        closerLook:
          'Las pisadas de un lado son de bota de hombre y están viejas, muchas, superpuestas: semanas de venir al ' +
          'mismo sitio a pararse en el mismo lugar. Las del otro lado son de mujer, de alpargata, y son de ir y venir, ' +
          'nunca de quedarse. Salvo una: hay un par de alpargatas quietas, mirando al aljibe, y al lado la marca ' +
          'redonda de algo apoyado en el piso. Un farol.',
        clue: {
          description: 'Rosa estuvo parada frente al aljibe, quieta, con un farol apoyado en el piso, aunque dice que no se acerca de noche.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-alamos', names: ['álamos', 'alamos', 'árboles', 'arboles', 'sombra'],
        description: 'Tres álamos flacos. La sombra que dan no alcanza a cubrir el patio.',
        closerLook:
          'Los tres están secos del lado que mira al aljibe y verdes del lado que mira al campo. No es el sol: ' +
          'el sol les da del otro lado.',
        exposure: 2,
      },
      {
        id: 'f-galpon', names: ['galpón', 'galpon', 'depósito'],
        description: 'Un galpón de chapa con la puerta entornada. Herramienta de campo, tablas, un cerco viejo desarmado.',
        closerLook: 'Hay tablas, clavos y piedra del cerco viejo. Alcanzaría para tapar algo del tamaño de un aljibe.',
      },
    ],
  },
  casa: {
    id: 'casa',
    name: 'La casa',
    description:
      'Cocina de piso de ladrillo, una mesa larga, un aparador con loza desparejada. Huele a humedad y a ' +
      'yerba vieja. Del gancho de la pared cuelga un sombrero de hombre que nadie descolgó en once días.',
    atmosphere: [
      'Rosa cocina de más. Sirve dos platos por costumbre y después retira uno.',
      'El reloj de pared está parado. Rosa no lo da cuerda desde que Ignacio no está.',
    ],
    connections: ['patio', 'cuarto'],
    itemsPresent: ['it-foto1897', 'it-espejo', 'it-farol'],
    npcsPresent: ['npc-rosa'],
    visited: false,
    umbralIntensity: 1,
    senses: {
      sound: ['La casa cruje como cruje una casa vieja. Nada más.', 'Del patio no llega ningún sonido. Ninguno.'],
      smell: ['Humedad, yerba vieja y guiso de hace rato.'],
      touch: ['El piso de ladrillo está frío incluso donde da el sol.'],
    },
    features: [
      {
        id: 'f-sombrero', names: ['sombrero', 'gancho', 'percha'],
        description: 'Un sombrero de hombre colgado del gancho. Tiene once días de polvo encima.',
        closerLook:
          'Es un sombrero de trabajo, sudado en la badana, muy usado. Nadie que salga a fumar al patio y piense ' +
          'volver se lleva el sombrero. Pero nadie que se vaya del campo debiendo plata lo deja colgado tampoco.',
        clue: {
          description: 'Ignacio dejó el sombrero colgado. No se lo llevó, lo que contradice la idea de que se fue del campo por su voluntad.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-reloj-pared', names: ['reloj de pared', 'reloj parado', 'péndulo', 'pendulo'],
        description: 'Un reloj de pared, parado. Rosa no le da cuerda desde que Ignacio no está.',
        closerLook:
          'Está parado a las cuatro y veinte. Como el reloj de bolsillo que apareció en el brocal. ' +
          'Rosa dice que ella no lo tocó.',
        exposure: 3,
        clue: {
          description: 'El reloj de pared de la cocina está parado a las cuatro y veinte, la misma hora que el reloj de bolsillo hallado en el brocal.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-mesa', names: ['mesa', 'platos', 'aparador', 'loza'],
        description: 'Mesa larga de madera. Rosa pone dos platos por costumbre y después retira uno.',
        closerLook:
          'El segundo plato está puesto y limpio. Lo pone, lo mira, lo levanta. Hace once días que repite eso ' +
          'y todavía no se dio cuenta de que lo hace.',
      },
      {
        id: 'f-ventana-cocina', names: ['ventana'],
        description: 'La ventana de la cocina da al patio. Desde la mesa se ve el brocal.',
        closerLook: 'El vidrio está limpio de un solo lado: el de adentro, y sólo en el rectángulo desde donde se ve el aljibe.',
      },
    ],
  },
  cuarto: {
    id: 'cuarto',
    name: 'El cuarto de Ignacio',
    description:
      'Un catre, una silla, un cajón de manzanas dado vuelta que hace de mesa. Sobre el cajón, un cuaderno ' +
      'de tapas de hule y una fotografía apoyada contra la pared, cara al revés.',
    atmosphere: [
      'La cama está hecha. Ignacio no era de hacer la cama, dice Rosa.',
      'La ventana da al patio. Desde el catre se ve el brocal del aljibe.',
    ],
    connections: ['casa'],
    itemsPresent: ['it-fotoreciente'],
    npcsPresent: [],
    visited: false,
    umbralIntensity: 3,
    senses: {
      sound: ['Silencio. El cuarto da al patio y del patio no viene nada.'],
      smell: ['Huele a tabaco frío y a ropa guardada.'],
      touch: ['El catre está tendido con las esquinas metidas, prolijo hasta lo raro.'],
    },
    features: [
      {
        id: 'f-catre', names: ['catre', 'cama', 'colchón', 'colchon'],
        description: 'Un catre de una plaza, tendido con una prolijidad que no encaja con nada más del cuarto.',
        closerLook:
          'Debajo del colchón, contra el elástico, hay una hoja doblada: un plano a lápiz del patio, con el aljibe ' +
          'marcado y una serie de números alrededor, en círculo. Son horas. De las cuatro y cuarto a las cuatro y ' +
          'media, cada dos minutos, anotadas durante varios días. Y una sola de esas anotaciones está subrayada: 4:20.',
        exposure: 3,
        clue: {
          description: 'Ignacio cronometró el fenómeno del aljibe durante días y subrayó una hora concreta: las cuatro y veinte.',
          kind: 'documentary', reliability: 'reliable',
        },
      },
      {
        id: 'f-ventana-cuarto', names: ['ventana', 'vidrio'],
        description: 'La ventana da al patio. Desde el catre se ve el brocal del aljibe.',
        closerLook:
          'En el vidrio, del lado de adentro, hay marcas de dedos. Muchas, superpuestas, todas a la misma altura: ' +
          'la de alguien acostado que se incorpora para mirar el patio. Algunas están a la altura de la almohada.',
        clue: {
          description: 'Ignacio miraba el aljibe desde la cama, de forma repetida, incluso acostado.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-cajon', names: ['cajón', 'cajon', 'mesa de manzanas', 'caja'],
        description: 'Un cajón de manzanas dado vuelta que hace de mesa. Encima, el cuaderno y la fotografía.',
        closerLook: 'Dentro del cajón hay un frasco de vidrio con agua, tapado y sellado con cera. El agua está perfectamente quieta.',
        exposure: 4,
        clue: {
          description: 'Ignacio guardó una muestra de agua del aljibe en un frasco sellado. Dentro del frasco, el agua también está inmóvil.',
          kind: 'physical', reliability: 'reliable',
        },
      },
    ],
  },
  orilla: {
    id: 'orilla',
    name: 'La orilla de la Laguna Mansa',
    description:
      'Doscientos metros de pastizal y después el agua, ancha y baja, del color del cielo cuando el cielo ' +
      'no tiene nada que decir. La laguna se llama Mansa porque nunca tiene olas. Nadie recuerda un día con olas.',
    atmosphere: [
      'Los pájaros de la orilla no se acercan al agua. Caminan paralelos.',
      'El barro de la orilla conserva huellas viejas mejor de lo que debería.',
    ],
    connections: ['patio'],
    itemsPresent: [],
    npcsPresent: [],
    visited: false,
    umbralIntensity: 3,
    senses: {
      sound: ['Pájaros, viento en el pastizal, y del agua nada. Una laguna de esta superficie tendría que sonar.'],
      smell: ['Huele a juncos y a barro. Un olor honesto, por una vez.'],
      touch: ['El agua está fría y no opone resistencia. Ni una corriente, ni un tironeo.'],
    },
    features: [
      {
        id: 'f-barro', names: ['barro', 'orilla', 'huellas', 'pisadas'],
        description: 'El barro de la orilla conserva huellas viejas mejor de lo que debería.',
        closerLook:
          'Hay huellas de bota que entran al agua y no salen. Están intactas, con el borde nítido, y por el estado ' +
          'del barro tendrían que tener semanas. Once días de lluvia y viento no las tocaron.',
        exposure: 4,
        clue: {
          description: 'En la orilla hay huellas de bota que entran a la laguna y no salen, conservadas de forma imposible después de once días.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-pajaros', names: ['pájaros', 'pajaros', 'aves', 'chorlo'],
        description: 'Los pájaros caminan paralelos al agua, nunca hacia ella.',
        closerLook:
          'Los mirás un rato largo. Ninguno baja a beber. Ninguno cruza volando por encima: bordean. ' +
          'Un chorlo se acerca a un metro, se queda quieto mirando la superficie, y retrocede caminando para atrás ' +
          'sin darle la espalda.',
        examineSkill: 'ciencia_naturales',
        exposure: 3,
        clue: {
          description: 'Ningún ave bebe de la laguna ni la sobrevuela. La bordean, y retroceden sin darle la espalda al agua.',
          kind: 'experiential', reliability: 'reliable',
        },
      },
      {
        id: 'f-superficie', names: ['superficie', 'juncos', 'pastizal'],
        description: 'Ancha, baja, del color del cielo. Sin una arruga en cien hectáreas.',
        closerLook:
          'Tirás una piedra: entra sin ruido, y las ondas salen, se abren un metro y se detienen. No se apagan ' +
          'de a poco. Se detienen, como si alguien las hubiera apoyado.',
        exposure: 5,
        clue: {
          description: 'Las ondas en la Laguna Mansa no se disipan: se abren un metro y se detienen de golpe.',
          kind: 'experiential', reliability: 'reliable',
        },
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// OBJETOS — dos con propiedad oculta, con condición verificada por el motor
// ─────────────────────────────────────────────────────────────────────────────

const items: Item[] = [
  {
    id: 'it-foto1897',
    name: 'Fotografía enmarcada (1897)',
    shortDescription: 'Una familia posando delante del aljibe recién construido. Al dorso, a lápiz: "Los Álamos, 1897".',
    owner: 'casa',
    carried: false,
    publicProperties: [
      {
        id: 'p-1897-basico',
        description:
          'Nueve personas delante del aljibe. Ropa de fin de siglo. La calidad es mala pero los rostros se distinguen. ' +
          'Uno de los hombres del fondo está apenas fuera de foco, como si se hubiera movido.',
        disclosure: 'PUBLIC',
      },
    ],
    hiddenProperties: [
      {
        id: 'p-1897-rostro',
        description:
          'El hombre del fondo, el que está fuera de foco, tiene la misma cara que la figura reflejada en la ' +
          'fotografía que Ignacio tomó hace tres semanas. No es un parecido de familia. Es la misma cara, ' +
          'con la misma cicatriz corta sobre la ceja izquierda, en dos imágenes separadas por veintisiete años.',
        discoveryCondition: { kind: 'comparison', withItem: 'it-fotoreciente' },
        disclosure: 'DISCOVERABLE',
      },
    ],
    discoveredProperties: [],
    conditionalProperties: [],
    temporalProperties: [],
    canon: SET,
    usageCount: 0,
  },
  {
    id: 'it-fotoreciente',
    name: 'Fotografía del aljibe (tomada por Ignacio)',
    shortDescription: 'Una placa reciente del brocal del aljibe, a plena luz. Estaba apoyada contra la pared, cara al revés.',
    owner: 'cuarto',
    carried: false,
    publicProperties: [
      {
        id: 'p-rec-basico',
        description:
          'El aljibe de frente, tomado desde poco más de un metro. Se ve el brocal, la roldana sin soga y, ' +
          'abajo, el círculo del agua. El encuadre es de alguien que sabía lo que quería fotografiar.',
        disclosure: 'PUBLIC',
      },
    ],
    hiddenProperties: [
      {
        id: 'p-rec-figura',
        description:
          'En el círculo de agua hay un reflejo. No es el de Ignacio: la posición no corresponde con la del que ' +
          'sostiene la cámara. Es un hombre, de pie, mirando hacia arriba. Hacia la cámara. Y no hay nadie más ' +
          'en el patio: la sombra de los álamos cae sobre tierra vacía.',
        discoveryCondition: { kind: 'skill_check', skill: 'descubrir', difficulty: 'regular' },
        disclosure: 'DISCOVERABLE',
      },
    ],
    discoveredProperties: [],
    conditionalProperties: [],
    temporalProperties: [],
    canon: SET,
    usageCount: 0,
  },
  {
    id: 'it-reloj',
    name: 'Reloj de bolsillo',
    shortDescription: 'De níquel, con la tapa abollada. Apareció en el brocal del aljibe. Estaba seco.',
    owner: 'patio',
    carried: false,
    publicProperties: [
      {
        id: 'p-reloj-basico',
        description:
          'Un reloj de bolsillo corriente, con las iniciales I.V. grabadas sin oficio en la tapa. Está parado ' +
          'a las cuatro y veinte. Rosa lo encontró sobre el brocal la mañana después de la desaparición: ' +
          'estaba completamente seco, y esa noche había llovido.',
        disclosure: 'PUBLIC',
      },
    ],
    hiddenProperties: [
      {
        id: 'p-reloj-atras',
        description:
          'Sostenido sobre el agua del aljibe, el segundero se mueve. Va hacia atrás, seis o siete segundos, ' +
          'y se detiene otra vez en las cuatro y veinte. Repite el mismo tramo cada vez. Retirado del brocal, ' +
          'vuelve a estar parado y nada indica que se haya movido nunca.',
        discoveryCondition: { kind: 'location', at: 'patio' },
        disclosure: 'DISCOVERABLE',
      },
    ],
    discoveredProperties: [],
    conditionalProperties: [],
    temporalProperties: [],
    canon: SET,
    usageCount: 0,
  },
  {
    id: 'it-espejo',
    name: 'Espejo de mano',
    shortDescription: 'De Rosa. Marco de hojalata, azogue picado en un borde.',
    owner: 'casa',
    carried: false,
    publicProperties: [
      { id: 'p-espejo-basico', description: 'Un espejo de mano gastado. Rosa lo tiene sobre el aparador, boca abajo.', disclosure: 'PUBLIC' },
    ],
    hiddenProperties: [],
    discoveredProperties: [],
    conditionalProperties: [
      {
        id: 'p-espejo-indirecto',
        description:
          'Mirando el aljibe a través del espejo, en lugar de asomarse, el retardo del reflejo se vuelve evidente: ' +
          'lo que devuelve el agua llega tarde respecto de lo que devuelve el espejo. Ver el fenómeno de esta ' +
          'manera protege: el agua no parece registrar a quien no la mira de frente.',
        trigger: { kind: 'location', at: 'patio' },
        active: false,
        disclosure: 'DISCOVERABLE',
      },
    ],
    temporalProperties: [],
    canon: SET,
    usageCount: 0,
  },
  {
    id: 'it-farol',
    name: 'Farol de querosén',
    shortDescription: 'Con combustible para unas cuantas horas.',
    owner: 'casa',
    carried: false,
    publicProperties: [
      { id: 'p-farol-basico', description: 'Un farol de querosén en buen estado. Da luz suficiente para el patio o para bajar a alguna parte.', disclosure: 'PUBLIC' },
    ],
    hiddenProperties: [],
    discoveredProperties: [],
    conditionalProperties: [],
    temporalProperties: [],
    canon: SET,
    usageCount: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NPC COMPAÑERA — con miedos y límites propios (v1.0 §11)
// ─────────────────────────────────────────────────────────────────────────────

const npcs: Npc[] = [
  {
    id: 'npc-rosa',
    name: 'Rosa Quintana',
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
    status: 'alive',
    description:
      'Cincuenta y ocho años, casera de Los Álamos desde antes de que Ignacio arrendara el campo. ' +
      'Habla poco y mira mucho. Tiene las manos siempre ocupadas: si no hay nada que hacer, dobla y desdobla un repasador.',
    motivation:
      'Que alguien resuelva esto y se vaya. No quiere justicia ni verdad: quiere volver a dormir. ' +
      'Ayuda porque la ayuda apura el final, no porque confíe.',
    fears: [
      'El aljibe después de la caída del sol. No se acerca. Si la obligan, se va de la casa.',
      'Que le pregunten qué vio ella, y no qué vio Ignacio.',
    ],
    refusals: [
      'No baja al aljibe. Bajo ninguna circunstancia, con ninguna recompensa, con ningún argumento.',
      'No se queda sola en el patio de noche.',
      'No habla del hermano de Ignacio hasta que la confianza sea alta.',
    ],
    knowledge: [
      { id: 'k-rosa-1', statement: 'Ignacio desapareció hace once noches. Cenó, salió al patio a fumar y no volvió.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-rosa-2', statement: 'El reloj apareció seco sobre el brocal a la mañana siguiente, y esa noche había llovido.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-rosa-3', statement: 'Las últimas semanas Ignacio se pasaba horas mirando el aljibe. Ella creía que era por el agua, por la sequía.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-rosa-4', statement: 'Ella cree que Ignacio se fue por su propia voluntad, porque debía plata en el pueblo. Es su explicación y se aferra a ella.', acquiredAt: 'previo', source: 'interpretación propia', reliability: 'false' },
      { id: 'k-rosa-5', statement: 'La soga de la roldana la sacó ella, tres días DESPUÉS de que Ignacio desapareciera. No lo va a ofrecer: hay que preguntarle por qué.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
    ],
    secrets: [
      {
        id: 's-rosa-vio',
        content:
          'Rosa se asomó al aljibe la noche siguiente a la desaparición, con un farol, llamando a Ignacio. ' +
          'El reflejo del farol tardó en aparecer. Cuando apareció, había dos luces. ' +
          'Por eso sacó la soga: para que nadie pudiera bajar. Sólo lo cuenta si la actitud hacia el investigador ' +
          'llega a 40 o más, o si el investigador le cuenta primero algo que ella pueda reconocer.',
        disclosure: 'KEEPER_SECRET',
        revealGate: 'actitud>=40',
        revealed: false,
      },
    ],
    relationships: [],
    attitude: { 'inv-elena': 10, 'inv-tomas': 0 },
    present: true,
    isCompanion: true,
    createdAt: 'inicio',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS — verdaderos y equivocados a la vez (v0.8 §19)
// ─────────────────────────────────────────────────────────────────────────────

const documents: DiegeticDocument[] = [
  {
    id: 'doc-cuaderno',
    title: 'Cuaderno de Ignacio Vera',
    author: 'Ignacio Vera',
    date: 'agosto – octubre de 1924',
    location: 'El cuarto de Ignacio',
    kind: 'diary',
    content:
      '14 de agosto.\n' +
      'Se secó el pozo del fondo. Queda el aljibe. El agua está buena, pero no baja de nivel aunque saque. ' +
      'Dos baldes por día y sigue igual. Anoté la marca en el ladrillo para estar seguro.\n\n' +
      '2 de septiembre.\n' +
      'La marca sigue donde la puse. Diecinueve días. Es imposible.\n\n' +
      '19 de septiembre.\n' +
      'Fui al juzgado de paz por lo del arriendo y aproveché para pedir los papeles viejos del campo. ' +
      'En el registro de 1874 la fracción figura como «Los Álamos, aguada blanca». Le pregunté al escribiente ' +
      'y me dijo que se le decía así a las aguadas con sales, que dejan el borde blanco al secarse. ' +
      'Acá el borde no queda blanco. Nunca quedó. Pero el nombre está escrito.\n\n' +
      '30 de septiembre.\n' +
      'Es el reflejo. Tarda. No es mucho, es como cuando uno se ve en un vidrio de tren, que la cara va un ' +
      'poco atrás. Se lo mostré a Rosa y me dijo que era el cansancio.\n\n' +
      '6 de octubre.\n' +
      'Saqué una placa. Necesito que quede en algo que no sea mi memoria.\n\n' +
      '11 de octubre.\n' +
      'En la placa hay alguien más. No estaba en el patio. Estuve toda la tarde comparando con el retrato de ' +
      'los viejos que está en la cocina, el de cuando hicieron el aljibe. Es él. Es el mismo hombre. ' +
      'No entiendo cómo pero lo entiendo: el agua guarda. Es una napa de sales, retiene lo que pasa por encima ' +
      'como una placa fotográfica retiene la luz. Todo lo que se refleje ahí queda ahí. Eso es todo. ' +
      'Es un fenómeno del suelo, no es otra cosa. Voy a escribirle al doctor Miralles a La Plata, que entiende de minas.\n\n' +
      '15 de octubre.\n' +
      'Si el agua guarda, entonces me está guardando a mí también. Y si me guarda a mí, entonces yo ya estoy ' +
      'ahí abajo desde antes de esta noche. Tengo que verlo. Tengo que ver si estoy.',
    authenticity: 'authentic',
    /** Ignacio observó bien y concluyó mal. Ese es el punto. */
    accuracy: 'misinterpreted',
    cluesContained: [],
    obtainedAt: null,
    canon: SET,
  },
  {
    id: 'doc-carta',
    title: 'Carta del Dr. Emilio Rausch (1911)',
    author: 'Emilio Rausch, médico',
    date: '3 de marzo de 1911',
    location: 'Entre las páginas del cuaderno',
    kind: 'letter',
    content:
      'Estimado colega:\n\n' +
      'Respondo a su consulta sobre el caso de Los Álamos. Atendí a la señora Vera en el 97 y puedo ' +
      'confirmarle lo que le contaron, con la salvedad de que lo que a usted le contaron ya pasó por ' +
      'demasiadas bocas.\n\n' +
      'No fue un ahogado. El aljibe tenía en ese momento poco más de un metro de agua y el hombre medía ' +
      'un metro setenta y cinco. Tampoco hubo cuerpo, cosa que el comisario resolvió escribiendo «se ausentó ' +
      'del domicilio», que es la manera que tenemos en el campo de no escribir nada.\n\n' +
      'Lo que sí le puedo decir, y le pido discreción: la mujer sostuvo hasta el final que su marido siguió ' +
      'estando en el patio tres días más. Que lo veía cuando sacaba agua. Que él la miraba y que ella no ' +
      'podía sostenerle la mirada porque no era la cara de él, era la cara de él más vieja.\n\n' +
      'La traté por delirio de duelo, que es lo que correspondía. Murió en el 4 sin retractarse.\n\n' +
      'No repita esto por escrito. Yo mismo dudé si escribirlo.\n\n' +
      'Suyo,\nE. Rausch',
    authenticity: 'authentic',
    accuracy: 'accurate',
    cluesContained: [],
    obtainedAt: null,
    canon: SET,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LÍNEA TEMPORAL — categorías de v0.9 §14
// ─────────────────────────────────────────────────────────────────────────────

const timeline: TemporalEvent[] = [
  {
    id: 'te-1897',
    description: 'Desaparición del marido de la señora Vera en el aljibe de Los Álamos.',
    when: { iso: '1897-06-01T00:00:00', precision: 'vague', display: 'invierno de 1897' },
    category: 'STABLE',
    categoryHistory: [],
    knownTo: [],
    altered: false,
    alterationAttempts: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'DISCOVERABLE', source: 'scenario' },
  },
  {
    id: 'te-ignacio',
    description: 'Desaparición de Ignacio Vera. Salió al patio a fumar y no volvió.',
    when: { iso: '1924-10-15T22:30:00', precision: 'hour', display: 'la noche del 15 de octubre' },
    category: 'STABLE',
    categoryHistory: [],
    knownTo: [],
    altered: false,
    alterationAttempts: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
  },
  {
    id: 'te-reflejo',
    description:
      'Lo que el agua devuelve. Si es memoria, presencia, o algo para lo que ninguna de las dos palabras sirve, ' +
      'no está determinado — y esta aventura no lo determina.',
    when: { iso: '1924-10-26T00:00:00', precision: 'vague', display: 'ahora' },
    category: 'UNKNOWN',
    categoryHistory: [],
    knownTo: [],
    altered: false,
    alterationAttempts: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'KEEPER_SECRET', source: 'scenario' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EL ESCENARIO
// ─────────────────────────────────────────────────────────────────────────────

export const AGUA_QUIETA: Scenario = {
  id: 'agua-quieta',
  title: 'Agua Quieta',

  surfacePremise:
    'Ignacio Vera, arrendatario de la estancia Los Álamos, desapareció hace once noches. No hay cuerpo, ' +
    'no hay nota, no hay rastro. La policía de campaña anotó "se ausentó del domicilio" y cerró el asunto. ' +
    'Alguien tiene que ir a mirar.',


  investigators: [ELENA, TOMAS],
  items,
  npcs,
  documents,
  locations,
  startLocation: 'patio',
  startTime: {
    iso: '1924-10-26T17:40:00',
    precision: 'minute',
    display: 'las seis menos veinte de la tarde',
  },
  startUmbralPermeability: 12,
  timeline,

  endings: [
    { id: 'sellar', title: 'Lo que se tapa', condition: 'El investigador sella, tapa o llena el aljibe sin haber mirado hasta el final.' },
    { id: 'mirar', title: 'Lo que devuelve la mirada', condition: 'El investigador mira sostenidamente hasta que el fenómeno responde. Exposición alta.' },
    { id: 'llevarse', title: 'Lo que se lleva', condition: 'El investigador se va con la evidencia y sin la explicación.' },
    { id: 'bajar', title: 'Lo que está abajo', condition: 'El investigador baja al aljibe.' },
    { id: 'quedarse', title: 'Lo que se queda', condition: 'El investigador decide quedarse a esperar. Consecuencia grave.' },
  ],

  opening:
    'La chata del correo la dejó en el portón a las cinco y media y siguió viaje sin apagar el motor.\n\n' +
    'Los Álamos es una casa baja, un galpón y tres árboles que le dan el nombre, todo en medio de un campo ' +
    'que en octubre debería estar más verde. El portón estaba abierto. Nadie salió a recibirla.\n\n' +
    'En el patio hay un aljibe de ladrillo con brocal de piedra, y una mujer parada al lado del galpón con ' +
    'un repasador en las manos, mirándola llegar desde hace un rato. Cuando usted está a diez metros, ' +
    'la mujer habla primero.\n\n' +
    '—¿Usted es la doctora? —dice—. Pase por adentro. Por acá no.\n\n' +
    'Y señala el patio, que está vacío, y en cuyo centro el agua del aljibe está completamente inmóvil.',

};
