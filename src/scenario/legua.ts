/**
 * LA LEGUA PERDIDA — segunda aventura. Marzo de 1925. ~1 hora y media.
 *
 * Conexión con el universo: canon v0.7 §11 reserva el Segundo Umbral para el
 * ESPACIO, y aclara que los nombres geográficos de los otros Umbrales no son
 * canon definitivo. Esta aventura usa ese margen.
 *
 * DÓNDE PASA: LEJOS DE CASTRONEGRO, y eso es estructural, no decorativo. §11
 * asigna a Agua Blanca / Castronegro el eje «tiempo, observación y memoria» —
 * que es Agua Quieta— y al Segundo Umbral el del espacio, que es esto. Los
 * Siete «no son siete puertas independientes que conducen a una habitación
 * común»: son puntos distintos de una misma estructura. Traer esta aventura al
 * partido de Castronegro fusionaría dos Umbrales en uno y rompería esa idea.
 *
 * Las dos son historias PARALELAS: mismo lustro, ningún personaje en común
 * salvo el investigador si encadenás campaña, y ninguna explica a la otra.
 *
 * NO confirma, por diseño:
 *   · que esto SEA el Segundo Umbral — se comporta como uno, nadie lo confirma
 *   · la relación con Agua Blanca, que desde acá no se puede establecer
 *   · nada del Primer Rostro, el anillo, Puddock ni el Archivista
 *
 * La aventura aplica la regla de oro (§15): cuanto más cerca de la verdad, más
 * información y menos certeza. Al final el jugador puede DEMOSTRAR que el campo
 * no cierra, y esa demostración no le sirve para nada.
 *
 * Nivel de canon: CANON_SETTING. No modifica el canon del universo.
 */

import type { Scenario } from './types.ts';
import type { Item, NpcSeed, DiegeticDocument, GameLocation, TemporalEvent } from '../shared/types.ts';
import { ELENA, TOMAS } from './pregens.ts';
import { LEGUA_TEMAS } from './legua.dialogo.ts';
import { LEGUA_ESCENAS } from './legua.escenas.ts';
import { LEGUA_ACCIONES } from './legua.acciones.ts';

const SET = { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' } as const;

// ─────────────────────────────────────────────────────────────────────────────
// LOCALIZACIONES — dos grupos con viaje entre medio
// ─────────────────────────────────────────────────────────────────────────────

const locations: Record<string, GameLocation> = {
  casco: {
    id: 'casco',
    name: 'El casco de La Perseverancia',
    aliases: ['casco', 'casa grande', 'patio del casco', 'estancia'],
    description:
      'Una casa larga de ladrillo revocado, con galería al norte y tres eucaliptos que le dan sombra a la ' +
      'mitad. Desde la galería se ve el molino, chico y nítido, del otro lado del potrero. Se ve tan cerca ' +
      'que uno calcula veinte minutos, y todos los que viven acá calculan distinto.',
    atmosphere: [
      'Desde la galería el molino se ve nítido. Demasiado nítido para la distancia que dicen que hay.',
      'Nadie sale a caminar por gusto. Se anda a caballo, o no se anda.',
      'En la pared de la galería hay un mapa del campo clavado con cuatro tachuelas, y está corregido a lápiz.',
    ],
    connections: ['escritorio', 'galpon', 'molino'],
    itemsPresent: ['it-rueda'],
    npcsPresent: ['npc-herminia'],
    visited: false,
    umbralIntensity: 2,
    senses: {
      sound: [
        'El molino. Se oye clarísimo, con el chirrido de la veleta y todo, como si estuviera a cincuenta metros.',
        'Viento en los eucaliptos. Y abajo, el molino, siempre el molino.',
      ],
      smell: ['Eucalipto, tierra seca, y el olor dulce del maíz que se está pasando en la troja.'],
      touch: ['El ladrillo de la galería guarda el calor de la tarde hasta bien entrada la noche.'],
    },
    features: [
      {
        id: 'f-mapa', names: ['mapa', 'plano en la pared', 'mapa clavado', 'tachuelas'],
        description: 'Un mapa del campo clavado a la pared con cuatro tachuelas. Tiene correcciones a lápiz.',
        closerLook:
          'Es una copia de la mensura de 1903, con el alambrado del oeste corregido a lápiz tres veces, cada ' +
          'una un poco más adentro que la anterior. Las tres correcciones son de la misma mano y de tres lápices ' +
          'distintos. Nadie corrige un plano tres veces si el plano está bien la primera.',
        examineSkill: 'descubrir',
        clue: {
          description: 'El mapa del casco tiene el alambrado del oeste corregido a lápiz tres veces, cada una más adentro que la anterior.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-eucaliptos', names: ['eucaliptos', 'árboles', 'arboles', 'sombra'],
        description: 'Tres eucaliptos viejos al norte de la casa. La sombra cubre media galería.',
        closerLook:
          'Los tres se plantaron el mismo año, se ve por el diámetro. Pero el del medio está a doce pasos del ' +
          'primero y a nueve del tercero, y en la foto de 1903 que cuelga adentro los tres están parejos. ' +
          'Un árbol no camina. Un árbol tampoco se corre nueve pasos en veintidós años.',
        exposure: 3,
      },
      {
        id: 'f-galeria', names: ['galería', 'galeria', 'vista', 'horizonte'],
        description: 'La galería mira al sur. Desde acá se ve el molino, y detrás la línea del alambrado.',
        closerLook:
          'Te apoyás en la columna y mirás. El molino se ve entero: las aspas, el tanque, la escalerita. ' +
          'A la distancia que dicen que hay tendría que verse como una cruz borrosa, y se ve como una fotografía. ' +
          'El aire de marzo es limpio, sí. No tanto.',
        exposure: 4,
        clue: {
          description: 'Desde el casco, el molino se ve con más detalle del que permite la distancia que todos declaran.',
          kind: 'experiential', reliability: 'reliable',
        },
      },
    ],
  },

  escritorio: {
    id: 'escritorio',
    name: 'El escritorio de la estancia',
    aliases: ['escritorio', 'oficina', 'papeles'],
    description:
      'Un cuarto chico con un escritorio de roble, un fichero de metal y las paredes cubiertas de estantes. ' +
      'Acá está todo el papel de La Perseverancia desde 1887: títulos, mensuras, boletos, cuentas.',
    atmosphere: [
      'Huele a papel viejo y a tinta ferrogálica.',
      'El fichero de metal está abierto en la letra M. Alguien estuvo buscando acá hace poco.',
    ],
    connections: ['casco'],
    itemsPresent: ['it-libreta'],
    npcsPresent: [],
    visited: false,
    umbralIntensity: 1,
    senses: {
      sound: ['Nada. El cuarto no tiene ventana al sur y el molino no llega.'],
      smell: ['Papel, tinta, y el polvo particular que hace el papel al envejecer.'],
      touch: ['Los legajos están fríos, como está frío el papel guardado.'],
    },
    features: [
      {
        id: 'f-fichero', names: ['fichero', 'archivo', 'cajones', 'legajos'],
        description: 'Un fichero de metal, abierto en la letra M. Alguien buscó acá hace poco.',
        closerLook:
          'En la M están las mensuras. Hay dos carpetas: 1903 y 1924. La de 1903 tiene el lomo gastado de tanto ' +
          'sacarla y volverla a poner. La de 1924 está impecable, salvo por una esquina doblada en la última hoja, ' +
          'que es donde va el número total.',
        clue: {
          description: 'La carpeta de la mensura de 1903 está gastada de tanto consultarla. Alguien volvió sobre ella muchas veces en veintidós años.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-estantes', names: ['estantes', 'libros', 'biblioteca', 'boletos'],
        description: 'Estantes con los libros de campo, boletos de marca y cuentas del almacén.',
        closerLook:
          'Entre los libros de cuentas hay uno que no es de cuentas: un registro catastral impreso, de 1874, ' +
          'del que alguien arrancó la hoja de esta sección. El corte es limpio, hecho con cuchilla y con tiempo.',
        clue: {
          description: 'Del registro catastral de 1874 alguien arrancó, con cuchilla y sin apuro, exactamente la hoja de esta fracción.',
          kind: 'physical', reliability: 'reliable',
        },
      },
    ],
  },

  galpon: {
    id: 'galpon',
    name: 'El galpón',
    aliases: ['galpon', 'deposito', 'velatorio'],
    description:
      'Chapa y tirantes de quebracho. Adentro hace más fresco que afuera, que es la razón por la que pusieron ' +
      'acá a Fermín Arce, sobre una puerta apoyada en dos caballetes, tapado con una lona.',
    atmosphere: [
      'Alguien le puso una vela a los pies y la vela está entera: la encendieron y se apagó sola.',
      'Los perros no entran. Se quedan en la puerta, mirando, sin ladrar.',
    ],
    connections: ['casco'],
    itemsPresent: ['it-cantimplora', 'it-botas'],
    npcsPresent: [],
    visited: false,
    umbralIntensity: 3,
    senses: {
      sound: ['Chapa que se dilata con el sol. Nada más, y es un alivio.'],
      smell: ['Grasa de máquina, cuero, y por debajo lo que hay que esperar que haya.'],
      touch: ['El aire de adentro está varios grados más fresco de lo que la chapa permite.'],
    },
    features: [
      {
        id: 'f-fermin', names: ['fermín', 'fermin', 'cuerpo', 'muerto', 'cadáver', 'cadaver', 'lona'],
        description: 'Fermín Arce, treinta y cuatro años, peón. Lo encontraron anteayer a la mañana.',
        closerLook:
          'Deshidratación severa: la piel no vuelve, la lengua está pegada, los riñones dejaron de trabajar antes ' +
          'que el corazón. Murió de sed, y murió de sed despacio, en no menos de dos días.\n\n' +
          'Lo encontraron a doscientos metros del tanque australiano, que estaba lleno.\n\n' +
          'Y tiene las plantas de los pies como las tiene alguien que caminó mucho: ampollas reventadas y vueltas ' +
          'a hacer encima, capas, de días.',
        examineSkill: 'medicina',
        exposure: 5,
        clue: {
          description: 'Fermín Arce murió de sed, despacio, en no menos de dos días, a doscientos metros de un tanque lleno. Los pies muestran días de caminata.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-vela', names: ['vela', 'cirio', 'llama'],
        description: 'Una vela a los pies del cuerpo, entera, apagada.',
        closerLook:
          'Está entera y el pabilo está negro: se encendió y se apagó. Pero no hay cera derramada, ni una gota, ' +
          'y una vela que arde aunque sea un minuto derrama. Ésta ardió sin gastarse.',
        exposure: 4,
      },
    ],
  },

  molino: {
    id: 'molino',
    name: 'El molino y el tanque',
    aliases: ['molino', 'tanque', 'aguada', 'australiano'],
    description:
      'Un molino de viento de doce pies, un tanque australiano lleno hasta el borde y un bebedero largo de ' +
      'cemento. Desde acá el casco se ve chiquito y lejísimos, y uno se pregunta cómo hizo para llegar tan rápido.',
    atmosphere: [
      'El tanque está lleno. Rebalsa despacio por el este y hace un charco que no se seca.',
      'Desde acá el casco se ve mucho más lejos de lo que se veía el molino desde el casco.',
    ],
    connections: ['casco', 'rastro', 'alambrado'],
    itemsPresent: [],
    npcsPresent: ['npc-casimiro'],
    visited: false,
    umbralIntensity: 6,
    senses: {
      sound: [
        'El molino chirría. Es el mismo chirrido que se oye desde la galería, con la misma nitidez, y eso ' +
        'ahora que estás al lado es exactamente igual de fuerte que allá.',
      ],
      smell: ['Agua, óxido, y la bosta seca de la hacienda alrededor del bebedero.'],
      touch: ['El agua del tanque está fresca y se mueve. Se mueve normal.'],
    },
    features: [
      {
        id: 'f-tanque', names: ['tanque', 'agua', 'australiano', 'bebedero'],
        description: 'El tanque australiano, lleno hasta el borde. Rebalsa por el este.',
        closerLook:
          'Lleno, limpio, con el agua moviéndose como se mueve el agua. Nada raro. Lo raro es lo otro: que un ' +
          'hombre haya muerto de sed a doscientos metros de acá, y que esos doscientos metros, mirados desde el ' +
          'suelo, se vean como doscientos metros.',
      },
      {
        id: 'f-veleta', names: ['veleta', 'aspas', 'torre', 'escalerita'],
        description: 'La torre del molino, con la escalerita de mantenimiento y la veleta arriba.',
        closerLook:
          'Subís tres escalones y mirás al norte. El casco se ve chico y borroso, a la distancia que corresponde ' +
          'a un cuarto de hora a caballo.\n\nDesde la galería del casco, este molino se veía nítido.\n\n' +
          'Dos puntos no pueden estar a distancias distintas según cuál de los dos mire.',
        exposure: 6,
        clue: {
          description: 'La distancia entre el casco y el molino es distinta según desde cuál de los dos se mire. Dos puntos no pueden estar a dos distancias.',
          kind: 'experiential', reliability: 'reliable',
        },
      },
    ],
  },

  rastro: {
    id: 'rastro',
    name: 'Donde apareció Fermín',
    aliases: ['rastro', 'huellas', 'donde lo encontraron', 'pastizal'],
    description:
      'Un pastizal bajo, a doscientos metros del tanque. Hay una mancha de pasto aplastado con forma de hombre, ' +
      'y alrededor, en la tierra pelada, las huellas.',
    atmosphere: [
      'Las huellas están frescas y son muchas. Demasiadas para dos días.',
      'Desde acá se ve el tanque. Se ve perfectamente. Un hombre lo vería aunque estuviera de rodillas.',
    ],
    connections: ['molino', 'alambrado'],
    itemsPresent: [],
    npcsPresent: [],
    visited: false,
    umbralIntensity: 7,
    senses: {
      sound: ['El molino, desde acá, se oye igual que desde el casco. Igual de fuerte. Igual.'],
      smell: ['Pasto seco. Nada más.'],
      touch: ['La tierra está dura y las huellas están hundidas: quien las hizo pesaba y arrastraba los pies.'],
    },
    features: [
      {
        id: 'f-huellas', names: ['huellas', 'rastro', 'pisadas', 'tierra'],
        description: 'Huellas de alpargata en la tierra pelada. Muchas, superpuestas.',
        closerLook:
          'Casimiro las midió antes que vos, y las midió bien: dieciséis mil quinientos pasos, contados por el ' +
          'largo de la zancada y la cantidad de tramos. Diecisiete kilómetros.\n\n' +
          'Las huellas van y vienen en línea recta, siempre hacia el tanque, y vuelven a empezar a doscientos ' +
          'metros del tanque. Una y otra vez. Como si cada vez que se acercaba, estuviera arrancando de nuevo.',
        examineSkill: 'orientarse',
        exposure: 8,
        clue: {
          description: 'Fermín caminó diecisiete kilómetros en línea recta hacia el tanque, en un campo donde no se pueden caminar diecisiete kilómetros en línea recta.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-marca', names: ['pasto aplastado', 'marca', 'donde cayó', 'donde cayo'],
        description: 'Una mancha de pasto aplastado con forma de hombre. Ahí lo encontraron.',
        closerLook:
          'El pasto está aplastado en una sola dirección: se acostó y no se movió. Y está aplastado de más, ' +
          'como si hubiera estado ahí mucho más tiempo del que estuvo.\n\n' +
          'Alrededor, a un metro, el pasto está intacto. Nadie se le acercó antes de encontrarlo.',
        exposure: 5,
      },
    ],
  },

  alambrado: {
    id: 'alambrado',
    name: 'El alambrado del oeste',
    aliases: ['alambrado', 'alambre', 'linde', 'mojón', 'mojon', 'límite', 'limite'],
    description:
      'La línea del oeste, la que las dos mensuras no ponen en el mismo lugar. Postes de ñandubay cada diez ' +
      'metros, siete hilos, y en la punta un mojón de mampostería con la fecha 1887 grabada.',
    atmosphere: [
      'La línea es recta. Se ve recta y es recta: no hay nada torcido acá.',
      'El campo del vecino empieza del otro lado y se ve igual que éste, que es lo que uno espera de un campo.',
    ],
    connections: ['molino', 'rastro'],
    itemsPresent: [],
    npcsPresent: [],
    visited: false,
    umbralIntensity: 5,
    senses: {
      sound: ['Viento en el alambre. Un sonido largo y bajo que no termina de repetirse igual.'],
      smell: ['Ñandubay, alambre caliente.'],
      touch: ['Los postes están firmes. Nadie los movió nunca.'],
    },
    features: [
      {
        id: 'f-postes', names: ['postes', 'ñandubay', 'nandubay', 'hilos'],
        description: 'Postes cada diez metros. Se pueden contar.',
        closerLook:
          'Los contás. Son ochocientos cuarenta y tres postes desde el mojón hasta la esquina, cada diez metros: ' +
          'ocho mil cuatrocientos treinta metros.\n\n' +
          'La mensura de 1903 dice que esa línea mide cinco mil doscientos.\n\n' +
          'Los postes están firmes, parejos, y la tierra alrededor de cada uno tiene veintidós años de no ' +
          'moverse. Nadie agregó postes. Están todos desde el principio.',
        examineSkill: 'descubrir',
        exposure: 7,
        clue: {
          description: 'El alambrado del oeste tiene 843 postes cada diez metros: 8.430 metros. La mensura de 1903 le da 5.200. Ningún poste fue agregado.',
          kind: 'physical', reliability: 'reliable',
        },
      },
      {
        id: 'f-mojon', names: ['mojón', 'mojon', 'mampostería', 'mamposteria', '1887'],
        description: 'Un mojón de mampostería con 1887 grabado en el frente.',
        closerLook:
          'La fecha está grabada a cincel y debajo hay una segunda inscripción, más chica, que no es una fecha: ' +
          'una circunferencia atravesada por una línea vertical.\n\n' +
          'El agrimensor de 1887 no tenía por qué poner eso ahí, y el que grabó la fecha no fue el mismo que ' +
          'grabó el círculo: la piedra tiene dos desgastes distintos.',
        exposure: 6,
        clue: {
          description: 'En el mojón de 1887 hay grabada, por otra mano y en otro momento, una circunferencia atravesada por una línea vertical.',
          kind: 'physical', reliability: 'reliable',
        },
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// OBJETOS
// ─────────────────────────────────────────────────────────────────────────────

const items: Item[] = [
  {
    id: 'it-rueda',
    name: 'Rueda de agrimensor',
    aliases: ['rueda', 'odómetro', 'odometro', 'rueda de medir'],
    shortDescription:
      'Una rueda de medir con contador de vueltas, apoyada contra la columna de la galería. Es de Herminia: ' +
      'la compró en Buenos Aires para medir ella misma, porque no le cree a ninguno de los dos.',
    owner: 'casco',
    carried: false,
    publicProperties: [
      {
        id: 'p-rueda-basico',
        description:
          'Una rueda de hierro de un metro de circunferencia con un contador mecánico en el eje. Se empuja ' +
          'caminando y cuenta las vueltas. Es simple, es precisa y no se equivoca.',
        disclosure: 'PUBLIC',
      },
    ],
    hiddenProperties: [
      {
        id: 'p-rueda-dos-numeros',
        description:
          'Medís la misma línea dos veces, ida y vuelta, sin levantar la rueda del suelo.\n\n' +
          'A la ida: seis mil cien metros. A la vuelta, sobre las mismas huellas de la rueda, en sentido ' +
          'contrario: cinco mil cuatrocientos.\n\n' +
          'La rueda no se equivoca. La rueda cuenta vueltas. Para que dé dos números tiene que haber girado ' +
          'una cantidad distinta de veces sobre el mismo tramo de suelo, en la misma tarde.',
        discoveryCondition: { kind: 'usage', times: 2 },
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
    id: 'it-libreta',
    name: 'Libreta de campo de Roldán, 1903',
    aliases: ['libreta', 'libreta de campo', 'cuaderno de roldan', 'anotaciones'],
    shortDescription:
      'La libreta de trabajo del agrimensor Eusebio Roldán, del verano de 1903. Tapas de hule, hojas ' +
      'cuadriculadas, la letra chiquita y prolija de quien anota números para otros.',
    owner: 'escritorio',
    carried: false,
    publicProperties: [
      {
        id: 'p-libreta-basico',
        description:
          'Columnas de números: rumbos, distancias, ángulos. Todo prolijo, todo firmado al pie de cada jornada. ' +
          'Es el trabajo de alguien que sabía lo que hacía.',
        disclosure: 'PUBLIC',
      },
    ],
    hiddenProperties: [
      {
        id: 'p-libreta-doble',
        description:
          'La jornada del 11 de febrero de 1903 está anotada dos veces.\n\n' +
          'La primera anotación está tachada con una sola línea, sin ensañamiento, de manera que se siga leyendo: ' +
          'seis mil ciento veinte metros. Debajo, la segunda: cinco mil doscientos.\n\n' +
          'Entre las dos, con la misma letra pero más chica, una frase que no es un número:\n\n' +
          '«Medí tres veces. Anoto la que coincide con el título. Que la corrija otro.»',
        discoveryCondition: { kind: 'skill_check', skill: 'buscar_libros', difficulty: 'regular' },
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
    id: 'it-cantimplora',
    name: 'Cantimplora de Fermín',
    aliases: ['cantimplora', 'caramañola', 'caramanola'],
    shortDescription: 'Una cantimplora de aluminio abollada, con la correa cortada. Estaba a un metro del cuerpo.',
    owner: 'galpon',
    carried: false,
    publicProperties: [
      {
        id: 'p-cant-basico',
        description: 'Vacía. Seca por dentro y por fuera. La correa está cortada limpio, no reventada.',
        disclosure: 'PUBLIC',
      },
    ],
    hiddenProperties: [
      {
        id: 'p-cant-seca',
        description:
          'La destapás y la olés. No hay olor a nada: ni a agua estancada, ni a metal mojado, ni al moho que ' +
          'deja una cantimplora que se vació hace dos días.\n\n' +
          'Esta cantimplora no está vacía desde hace dos días. Está seca como si nunca hubiera tenido agua ' +
          'adentro, y Fermín salió del casco con ella llena. Lo vieron llenarla.',
        discoveryCondition: { kind: 'skill_check', skill: 'ciencia_naturales', difficulty: 'regular' },
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
    id: 'it-botas',
    name: 'Alpargatas de Fermín',
    aliases: ['alpargatas', 'botas', 'calzado'],
    shortDescription: 'Un par de alpargatas de yute, gastadas hasta la lona, puestas prolijamente bajo la puerta que le hace de camilla.',
    owner: 'galpon',
    carried: false,
    publicProperties: [
      {
        id: 'p-botas-basico',
        description:
          'La suela de yute está gastada hasta el hilo, con el desgaste parejo de quien camina en llano. ' +
          'Son alpargatas de dos meses de uso, y a Fermín se las dieron nuevas la semana pasada. Rufino, el ' +
          'del almacén, lo puede confirmar.',
        disclosure: 'PUBLIC',
      },
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
// PERSONAJES — tres que midieron, tres números, ninguno miente
// ─────────────────────────────────────────────────────────────────────────────

const npcs: NpcSeed[] = [
  {
    id: 'npc-herminia',
    name: 'Herminia Lastra',
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
    status: 'alive',
    description:
      'Cuarenta y seis años, viuda, dueña de La Perseverancia desde hace cuatro. No se crió en el campo y lo ' +
      'compensa con método: anota, compara y desconfía. Fue ella la que hizo hacer la mensura de 1924, y la que ' +
      'compró la rueda cuando el resultado no cerró.',
    motivation:
      'Vender el campo. Tiene comprador y tiene precio, y el precio depende de una superficie que nadie le puede ' +
      'certificar. Quiere un número, uno solo, firmado por alguien.',
    fears: [
      'Que la muerte de Fermín se convierta en una causa judicial y frene la venta.',
      'Que el problema no sea de los papeles.',
    ],
    refusals: [
      'No va al alambrado del oeste. Dice que no tiene por qué ir. Fue una vez y no volvió.',
      'No habla del comprador hasta que la confianza sea alta.',
    ],
    knowledge: [
      { id: 'k-h-1', statement: 'Mandó a hacer la mensura de 1924 porque la de 1903 no coincidía con el título.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-h-2', statement: 'Midió ella misma con la rueda el tramo del oeste y le dio un tercer número, distinto de los dos.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-h-3', statement: 'Del casco al molino son veinte minutos a caballo. Lo cronometró, dos veces.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-h-4', statement: 'Cree que Roldán falseó la mensura de 1903 para favorecer al dueño anterior. Es su explicación y es falsa.', acquiredAt: 'previo', source: 'interpretación propia', reliability: 'false' },
      { id: 'k-h-5', statement: 'Fue una sola vez al alambrado del oeste, con la rueda. Volvió caminando y no habla de eso.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
    ],
    secrets: [
      {
        id: 's-h-vuelta',
        content:
          'Herminia midió el tramo del oeste con la rueda un mediodía y volvió al casco de noche. Para ella fueron ' +
          'dos horas; en la casa la esperaron nueve. Nadie le cree y ella tampoco se cree a sí misma, y por eso ' +
          'quiere vender antes de tener que entenderlo. Sólo lo cuenta con actitud alta.',
        disclosure: 'KEEPER_SECRET',
        revealGate: 'actitud>=40',
        revealed: false,
      },
    ],
    relationships: [],
    attitude: { 'inv-elena': 5, 'inv-tomas': 5 },
    present: true,
    isCompanion: false,
    createdAt: 'inicio',
  },
  {
    id: 'npc-casimiro',
    name: 'Casimiro Pinto',
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
    status: 'alive',
    description:
      'Cincuenta y siete años, capataz. Nació en este campo y no durmió afuera más de veinte noches en su vida. ' +
      'Habla despacio, contesta lo que se le pregunta y no una palabra más. Fue él quien encontró a Fermín, y fue ' +
      'él quien contó las huellas.',
    motivation:
      'Que no manden a nadie más a caminar el campo. No sabe explicar por qué, y cuando lo intenta se le nota que ' +
      'ya lo intentó otras veces y le fue mal.',
    fears: [
      'Que alguien camine el alambrado del oeste de punta a punta.',
      'Que le pidan que él lo camine.',
    ],
    refusals: [
      'No discute los números de nadie. Da el suyo y se calla.',
      'No va al oeste después del mediodía.',
    ],
    knowledge: [
      { id: 'k-c-1', statement: 'Encontró a Fermín anteayer a la mañana, a doscientos metros del tanque.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-c-2', statement: 'Contó las huellas: dieciséis mil quinientos pasos. Diecisiete kilómetros.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-c-3', statement: 'Del casco al molino son treinta minutos a caballo. Lo sabe desde chico y no lo discute.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-c-4', statement: 'Cree que Fermín se emborrachó y se perdió. No lo cree del todo, pero es lo que dice.', acquiredAt: 'previo', source: 'interpretación propia', reliability: 'false' },
      { id: 'k-c-5', statement: 'Hubo otro antes: un peón, en 1911, que apareció igual. Nadie hizo actas. No lo va a ofrecer.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
    ],
    secrets: [
      {
        id: 's-c-1911',
        content:
          'En 1911 apareció otro peón igual, muerto de sed cerca del agua. El patrón de entonces mandó enterrarlo ' +
          'sin acta y le dijo a Casimiro que si hablaba se quedaba sin trabajo. Casimiro tenía veinte años y no habló. ' +
          'Lleva catorce años esperando que alguien pregunte bien.',
        disclosure: 'KEEPER_SECRET',
        revealGate: 'actitud>=40',
        revealed: false,
      },
    ],
    relationships: [],
    attitude: { 'inv-elena': 0, 'inv-tomas': 0 },
    present: true,
    isCompanion: false,
    createdAt: 'inicio',
  },
  {
    id: 'npc-eusebio',
    name: 'Eusebio Roldán',
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
    status: 'alive',
    description:
      'Setenta y un años, agrimensor jubilado. Vino en el break del pueblo apenas supo lo de Fermín, sin que ' +
      'nadie lo llamara. Tiene las manos manchadas de tinta vieja y la cabeza intacta, que es su desgracia: ' +
      'se acuerda perfectamente de febrero de 1903.',
    motivation:
      'Que alguien más lo mida y le diga que él no estaba loco. Vino para eso. No lo va a decir así.',
    fears: [
      'Morirse siendo el agrimensor que falseó una mensura.',
      'Que le den la razón, que es peor.',
    ],
    refusals: [
      'No firma nada. Ni un certificado, ni una declaración, ni un croquis.',
      'No dice qué anotó primero hasta que alguien le muestre que midió distinto.',
    ],
    knowledge: [
      { id: 'k-e-1', statement: 'Midió el tramo del oeste tres veces en febrero de 1903 y le dio tres números.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-e-2', statement: 'Anotó el número que coincidía con el título porque los otros dos no le servían a nadie.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-e-3', statement: 'Su libreta de campo quedó en el escritorio de la estancia. Sabe exactamente en qué estante.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
      { id: 'k-e-4', statement: 'Cree que el instrumento estaba mal calibrado. Lo repitió veintidós años y ya no se lo cree.', acquiredAt: 'previo', source: 'interpretación propia', reliability: 'false' },
      { id: 'k-e-5', statement: 'El mojón de 1887 tenía el círculo grabado ya en 1903. Lo anotó y después tachó la anotación.', acquiredAt: 'previo', source: 'testigo', reliability: 'reliable' },
    ],
    secrets: [
      {
        id: 's-e-tercera',
        content:
          'La tercera medición de Roldán, la que no anotó en ningún lado, la hizo de noche con lámpara. Le dio ' +
          'ocho mil cuatrocientos treinta metros: exactamente lo que da contar los postes hoy. Entendió que el ' +
          'número dependía de la luz y decidió que eso no se podía escribir en una mensura. Sólo lo cuenta si le ' +
          'muestran que alguien más midió distinto.',
        disclosure: 'KEEPER_SECRET',
        revealGate: 'actitud>=40',
        revealed: false,
      },
    ],
    relationships: [],
    attitude: { 'inv-elena': 15, 'inv-tomas': 15 },
    present: true,
    isCompanion: false,
    createdAt: 'inicio',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTOS
// ─────────────────────────────────────────────────────────────────────────────

const documents: DiegeticDocument[] = [
  {
    id: 'doc-mensura1903',
    title: 'Mensura de La Perseverancia, 1903',
    author: 'Agrim. Eusebio Roldán',
    date: 'febrero de 1903',
    location: 'El escritorio de la estancia',
    kind: 'report',
    content:
      'MENSURA Y DESLINDE DE LA FRACCIÓN DENOMINADA «LA PERSEVERANCIA»\n' +
      'Practicada en febrero de 1903 a pedido de don Aurelio Lastra.\n\n' +
      'LADO NORTE ........ 5.200 m\n' +
      'LADO ESTE ......... 5.200 m\n' +
      'LADO SUR .......... 5.200 m\n' +
      'LADO OESTE ........ 5.200 m\n' +
      'SUPERFICIE ........ 2.704 hectáreas, equivalentes a una legua cuadrada.\n\n' +
      'Los cuatro lados resultaron iguales, lo que concuerda con el título de 1887 y con la costumbre de la ' +
      'zona de fraccionar en leguas cuadradas.\n\n' +
      'OBSERVACIONES: Se hicieron mediciones repetidas del lado oeste por presentar el terreno una leve ' +
      'ondulación. Se adopta la primera.\n\n' +
      'Firmado, Eusebio Roldán, agrimensor nacional.',
    authenticity: 'authentic',
    accuracy: 'partially_accurate',
    cluesContained: [],
    obtainedAt: null,
    canon: { truth: 'CANON_SETTING', disclosure: 'DISCOVERABLE', source: 'scenario' },
  },
  {
    id: 'doc-mensura1924',
    title: 'Mensura de La Perseverancia, 1924',
    author: 'Agrim. Nicolás Bermúdez',
    date: 'noviembre de 1924',
    location: 'El escritorio de la estancia',
    kind: 'report',
    content:
      'MENSURA DE ACTUALIZACIÓN — «LA PERSEVERANCIA»\n' +
      'Practicada en noviembre de 1924 a pedido de doña Herminia Lastra.\n\n' +
      'LADO NORTE ........ 5.210 m\n' +
      'LADO ESTE ......... 5.198 m\n' +
      'LADO SUR .......... 5.204 m\n' +
      'LADO OESTE ........ 8.430 m\n' +
      'SUPERFICIE ........ no se consigna.\n\n' +
      'OBSERVACIONES DEL PROFESIONAL:\n' +
      'El lado oeste fue medido en cuatro oportunidades, en días distintos y con dos instrumentos, arrojando ' +
      'siempre el mismo valor. Dicho valor es incompatible con los otros tres lados: un cuadrilátero cerrado no ' +
      'admite estas medidas.\n\n' +
      'No obstante, el polígono CIERRA en el terreno. El alambrado existe, es continuo, y las cuatro esquinas ' +
      'son ángulos rectos verificados.\n\n' +
      'El suscripto declara no poder consignar superficie y sugiere se practique nueva mensura por profesional ' +
      'distinto. Se abstiene de firmar plano.\n\n' +
      'N. Bermúdez.',
    authenticity: 'authentic',
    accuracy: 'accurate',
    cluesContained: [],
    obtainedAt: null,
    canon: { truth: 'CANON_SETTING', disclosure: 'DISCOVERABLE', source: 'scenario' },
  },
  {
    id: 'doc-titulo',
    title: 'Título de propiedad, 1887',
    author: 'Escribanía Requena',
    date: '3 de mayo de 1887',
    location: 'El escritorio de la estancia',
    kind: 'file',
    content:
      'ESCRITURA DE COMPRAVENTA\n\n' +
      '…una legua cuadrada de campo, más o menos, en el paraje conocido por los antiguos como «la legua que ' +
      'no se acaba», hoy denominado La Perseverancia, lindando al oeste con terrenos fiscales…\n\n' +
      '…el comprador declara conocer que el deslinde del oeste ha sido cuestionado con anterioridad y renuncia ' +
      'a reclamo por diferencia de superficie…',
    authenticity: 'authentic',
    accuracy: 'accurate',
    cluesContained: [],
    obtainedAt: null,
    canon: { truth: 'CANON_SETTING', disclosure: 'DISCOVERABLE', source: 'scenario' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LÍNEA DE TIEMPO
// ─────────────────────────────────────────────────────────────────────────────

const timeline: TemporalEvent[] = [
  {
    id: 'te-1887',
    description: 'Se escritura la fracción como «la legua que no se acaba». El comprador renuncia a reclamo por superficie.',
    when: { iso: '1887-05-03T00:00:00', precision: 'day', display: 'mayo de 1887' },
    category: 'STABLE',
    categoryHistory: [], knownTo: [], altered: false, alterationAttempts: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'DISCOVERABLE', source: 'scenario' },
  },
  {
    id: 'te-1903',
    description: 'Roldán mide el lado oeste tres veces y obtiene tres números. Anota el que coincide con el título.',
    when: { iso: '1903-02-11T00:00:00', precision: 'day', display: '11 de febrero de 1903' },
    category: 'STABLE',
    categoryHistory: [], knownTo: [], altered: false, alterationAttempts: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'DISCOVERABLE', source: 'scenario' },
  },
  {
    id: 'te-1911',
    description: 'Un peón aparece muerto de sed cerca del agua. Lo entierran sin acta.',
    when: { iso: '1911-01-01T00:00:00', precision: 'vague', display: 'el verano de 1911' },
    category: 'STABLE',
    categoryHistory: [], knownTo: [], altered: false, alterationAttempts: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'KEEPER_SECRET', source: 'scenario' },
  },
  {
    id: 'te-fermin',
    description: 'Fermín Arce sale del casco con la cantimplora llena y no vuelve.',
    when: { iso: '1925-03-09T06:00:00', precision: 'hour', display: 'la mañana del 9 de marzo' },
    category: 'STABLE',
    categoryHistory: [], knownTo: [], altered: false, alterationAttempts: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export const LA_LEGUA: Scenario = {
  id: 'legua-perdida',
  title: 'La Legua Perdida',

  surfacePremise:
    'Fermín Arce, peón de la estancia La Perseverancia, apareció muerto de sed a doscientos metros de un tanque ' +
    'australiano lleno. Hay que firmar un certificado de defunción, y para firmarlo hay que decir dónde murió. ' +
    'Nadie en el campo se pone de acuerdo sobre dónde queda nada.',

  investigators: [ELENA, TOMAS],
  items,
  npcs,
  documents,
  locations,
  startLocation: 'casco',
  startTime: {
    iso: '1925-03-11T09:20:00',
    precision: 'minute',
    display: 'las nueve y veinte de la mañana',
  },
  startUmbralPermeability: 18,
  timeline,

  conversations: LEGUA_TEMAS,
  scenes: LEGUA_ESCENAS,
  actions: LEGUA_ACCIONES,

  endings: [
    { id: 'firmar', title: 'Lo que se firma', condition: 'Firma el certificado con una causa que la ley acepta y los hechos no.' },
    { id: 'medir', title: 'Lo que no cierra', condition: 'Mide hasta demostrarlo. La demostración no sirve para nada.' },
    { id: 'caminar', title: 'Lo que camina', condition: 'Camina el alambrado del oeste de punta a punta. Exposición muy alta.' },
    { id: 'llevarse', title: 'Lo que se lleva', condition: 'Se va con los papeles y sin la explicación.' },
    { id: 'borrar', title: 'Lo que se borra', condition: 'Hace desaparecer la mensura de 1903 para que el pleito muera con ella.' },
  ],

  opening:
    'El break del pueblo la deja en el portón a las nueve y cuarto y el cochero no baja del pescante.\n\n' +
    '—La esperan —dice, y señala con la barbilla la galería, donde hay tres personas que no están juntas: ' +
    'una mujer de vestido oscuro, un hombre de alpargatas parado en el escalón más bajo, y un viejo de traje ' +
    'que llegó por su cuenta y que nadie llamó.\n\n' +
    'La Perseverancia es una casa larga, tres eucaliptos y un campo que desde acá parece un campo. ' +
    'Del otro lado del potrero, chiquito y nítido, se ve un molino.\n\n' +
    'A usted la mandaron a firmar un certificado de defunción. Fermín Arce, treinta y cuatro años, muerto ' +
    'de sed a doscientos metros de un tanque lleno. Para firmarlo hay que consignar el lugar del hecho.\n\n' +
    'Y ése, va a descubrir en las próximas horas, es el problema.',
};
