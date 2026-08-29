/**
 * OCUPACIONES — propias, para este mundo.
 *
 * El manual trae su lista y **no se transcribe acá**: es contenido de
 * Chaosium. Lo que se toma es la estructura, que es mecánica —ocho
 * habilidades, puntos según características, rango de Crédito—, y se la llena
 * con gente que puede aparecer en la provincia de Buenos Aires en 1924.
 *
 * Un piloto, un hacker o un misionero no ayudan a jugar esto. Un agrimensor
 * sí, y encima ya sabemos que el agrimensor es un personaje de esta campaña.
 *
 * REGLA AL AGREGAR UNA: ocho habilidades, ni más ni menos. El manual lo dice
 * bien — si una ocupación tiene doce habilidades, deja de ser una ocupación y
 * pasa a ser una lista de deseos.
 */

import type { Ocupacion } from '../rules/creacion.ts';

export const OCUPACIONES: Ocupacion[] = [
  {
    id: 'medico-rural',
    nombre: 'Médico rural',
    descripcion:
      'Se recibió en la ciudad y eligió el campo, o el campo lo eligió a él. Atiende partos, fracturas y ' +
      'certificados de defunción en cien kilómetros a la redonda, y es la única persona con formación ' +
      'científica que muchos van a conocer en su vida.',
    habilidades: ['medicina', 'primeros_auxilios', 'ciencia_naturales', 'psicologia',
      'biblioteca', 'buscar_libros', 'descubrir', 'credito'],
    credito: { min: 30, max: 80 },
    formula: { fijos: { EDU: 4 } },
    nota: 'La ocupación de Elena Sartori.',
    tratamiento: { m: 'doctor', f: 'doctora' },
    itemInicial: {
      id: 'it-maletin-medico', nombre: 'Maletín médico',
      shortDescription: 'Cuero gastado, instrumental básico y un frasco de láudano que nunca usó y no piensa tirar. ' +
        'Lo abre siempre de la misma manera, aunque nadie la esté mirando.',
    },
  },
  {
    id: 'periodista',
    nombre: 'Periodista',
    descripcion:
      'Escribe para un diario de Buenos Aires o de La Plata. Viaja a donde pasan las cosas, pregunta más de ' +
      'lo que le conviene y tiene la costumbre profesional de no creerle a nadie del todo.',
    habilidades: ['fotografia', 'buscar_libros', 'labia', 'persuasion',
      'psicologia', 'historia', 'descubrir', 'credito'],
    credito: { min: 9, max: 30 },
    formula: { fijos: { EDU: 4 } },
    nota: 'La ocupación de Tomás Belgrano.',
    itemInicial: {
      id: 'it-camara-fotografica', nombre: 'Cámara de placas',
      shortDescription: 'Heredada, más vieja que quien la carga y mejor que él. Placas de vidrio, no película: ' +
        'cada toma cuesta tiempo y no se repite fácil.',
    },
  },
  {
    id: 'agrimensor',
    nombre: 'Agrimensor',
    descripcion:
      'Mide la tierra y firma lo que midió, y esa firma después la lee un juez. Trabajo de anteojo, cadena y ' +
      'libreta, hecho a la intemperie y discutido en tribunales. Sabe que un número mal puesto dura un siglo.',
    // Geología en lugar de Historia: mide y firma terreno, no fecha épocas.
    // Saber de qué está hecho lo que pisa y de dónde salió una piedra es su
    // oficio; ubicar un mueble en su siglo no. Historia la tienen otras ocho.
    habilidades: ['orientarse', 'ciencia_naturales', 'buscar_libros', 'geologia',
      'descubrir', 'mecanica', 'persuasion', 'credito'],
    credito: { min: 20, max: 60 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['DEX', 'INT'], multiplicador: 2 } },
    tratamiento: { m: 'agrimensor', f: 'agrimensora' },
    // Mismo id que la rueda de Herminia en La Legua Perdida (`it-rueda`), a
    // propósito: si quien juega esa aventura es agrimensor, `createCampaign`
    // (engine.ts) no fabrica un objeto nuevo — RECLAMA el que ya declaró el
    // contenido, con sus propiedades intactas, en vez de a Herminia. En
    // cualquier otra aventura, donde `it-rueda` no existe, nace como objeto
    // de oficio genérico.
    itemInicial: {
      id: 'it-rueda', nombre: 'Rueda de agrimensor',
      shortDescription: 'Una rueda de medir con contador de vueltas, propia, de tanto uso que ya no hace falta ' +
        'mirarle el contador para saber si dio una vuelta entera o no.',
    },
  },
  {
    id: 'comisario',
    nombre: 'Comisario de campaña',
    descripcion:
      'La ley en un partido donde la ley llega tarde. Toma declaraciones, labra actas y decide, casi siempre ' +
      'solo, qué se investiga y qué se anota como "se ausentó del domicilio".',
    habilidades: ['intimidar', 'psicologia', 'descubrir', 'escuchar',
      'orientarse', 'persuasion', 'primeros_auxilios', 'credito'],
    credito: { min: 20, max: 50 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['STR', 'DEX'], multiplicador: 2 } },
    tratamiento: { m: 'comisario', f: 'comisaria' },
    armasPermitidas: ['revolver-38', 'revolver-32'],
    itemInicial: {
      id: 'it-libreta-actas', nombre: 'Libreta de actas',
      shortDescription: 'Declaraciones tomadas a mano, con la hora y el nombre del que declaró. ' +
        'Sirve en un juzgado y sirve para acordarse de quién mintió primero.',
    },
  },
  {
    id: 'maestra',
    nombre: 'Maestra rural',
    descripcion:
      'Escuela de una sola aula y treinta chicos de siete edades. Es también la que escribe las cartas del ' +
      'pueblo, la que lee las que llegan y, con frecuencia, la única que guarda un archivo de algo.',
    habilidades: ['biblioteca', 'historia', 'psicologia', 'persuasion',
      'ciencia_naturales', 'buscar_libros', 'escuchar', 'credito'],
    credito: { min: 9, max: 30 },
    formula: { fijos: { EDU: 4 } },
    tratamiento: { m: 'maestro', f: 'maestra' },
    itemInicial: {
      id: 'it-registro-escolar', nombre: 'Registro escolar',
      shortDescription: 'Treinta nombres, sus faltas y sus notas, más un fajo de cartas del pueblo que nadie más ' +
        'guardó nunca en ningún lado.',
    },
  },
  {
    id: 'escribano',
    nombre: 'Escribano',
    descripcion:
      'Guarda los papeles que dicen de quién es cada cosa. Títulos, mensuras, sucesiones, boletos. Sabe leer ' +
      'una escritura de 1887 y sabe, sobre todo, reconocer cuándo alguien la escribió con cuidado de más.',
    habilidades: ['buscar_libros', 'biblioteca', 'historia', 'persuasion',
      'psicologia', 'descubrir', 'antropologia', 'credito'],
    credito: { min: 40, max: 80 },
    formula: { fijos: { EDU: 4 } },
    tratamiento: { m: 'escribano', f: 'escribana' },
    itemInicial: {
      id: 'it-sello-notarial', nombre: 'Sello y protocolo notarial',
      shortDescription: 'El sello que hace válido lo que firma, y el libro donde queda copia de cada escritura ' +
        'que pasó por sus manos desde que se recibió.',
    },
  },
  {
    id: 'anticuario',
    nombre: 'Anticuario',
    descripcion:
      'Compra y vende lo que sobrevivió. Muebles de estancia, platería, libros de bibliotecas rematadas. ' +
      'Reconoce una fecha por la técnica y una falsificación por la prisa, y colecciona cosas que no vende.',
    // Arqueología en lugar de Antropología: éste no interpreta las costumbres
    // de un grupo, tasa objetos. «Reconoce una fecha por la técnica» es
    // literalmente fechar una pieza trabajada, que es Arqueología. La
    // Antropología le queda al escribano y al ocultista, que sí leen gente.
    habilidades: ['historia', 'biblioteca', 'ocultismo', 'arqueologia',
      'descubrir', 'persuasion', 'buscar_libros', 'credito'],
    credito: { min: 30, max: 70 },
    formula: { fijos: { EDU: 4 } },
    itemInicial: {
      id: 'it-lupa-anticuario', nombre: 'Lupa de joyero',
      shortDescription: 'Aumento suficiente para ver una fecha en el reverso de una hebilla, o la costura que ' +
        'delata una reparación mal disimulada.',
    },
  },
  {
    id: 'capataz',
    nombre: 'Capataz de estancia',
    descripcion:
      'Nació en el campo y no durmió afuera veinte noches en su vida. Conoce cada alambrado, cada aguada y ' +
      'cada peón, y lee el terreno como otros leen un diario.',
    // Navegación en lugar de Trepar: en la llanura no hay a qué subirse, y su
    // trabajo es cruzar campo abierto hasta una aguada que sabe dónde está sin
    // que haya camino. Se queda además con Orientarse, y no es redundante: una
    // es cruzar sin referencias, la otra reconstruir por dónde se pasó. Trepar
    // le queda al domador.
    habilidades: ['orientarse', 'ciencia_naturales', 'descubrir', 'navegacion',
      'intimidar', 'mecanica', 'escuchar', 'credito'],
    credito: { min: 9, max: 40 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['STR', 'DEX'], multiplicador: 2 } },
    itemInicial: {
      id: 'it-prismaticos-capataz', nombre: 'Prismáticos de campo',
      shortDescription: 'Rayados de tanto viaje en las alforjas, pero enfocan bien. Ven un jinete en el horizonte ' +
        'antes de que el jinete vea la estancia.',
    },
  },
  {
    id: 'fotografo',
    nombre: 'Fotógrafo ambulante',
    descripcion:
      'Va de pueblo en pueblo con la cámara de placas: retratos de familia, casamientos, muertos. Es el ' +
      'único oficio que consiste en fijar lo que se vio, y por eso es el que peor se lleva con un lugar ' +
      'donde lo que se ve no coincide con lo que hay.',
    habilidades: ['fotografia', 'descubrir', 'mecanica', 'labia',
      'persuasion', 'sigilo', 'historia', 'credito'],
    credito: { min: 9, max: 30 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['DEX', 'POW'], multiplicador: 2 } },
    // Mismo id que el de periodista: es el mismo objeto —una cámara propia—,
    // no dos ítems distintos que casualmente hacen lo mismo.
    itemInicial: {
      id: 'it-camara-fotografica', nombre: 'Cámara de placas',
      shortDescription: 'La lleva a todos lados, en una funda de cuero que ya tiene forma de cámara y no de otra ' +
        'cosa. La conoce a ciegas: sabe cuánto tarda cada revelado sin mirar el reloj.',
    },
  },
  {
    id: 'detective',
    nombre: 'Detective privado',
    descripcion:
      'Trabaja para quien pague: maridos que quieren pruebas, comercios con robos internos, familias que ' +
      'buscan a alguien que se fue sin avisar. Aprendió a hacer preguntas sin parecer que las está haciendo, ' +
      'y a las que no puede hacer sin parecerlo las hace igual.',
    habilidades: ['descubrir', 'escuchar', 'intimidar', 'pelea',
      'armas_fuego', 'psicologia', 'sigilo', 'credito'],
    credito: { min: 20, max: 45 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['STR', 'DEX'], multiplicador: 2 } },
    armasPermitidas: ['derringer-25', 'revolver-32'],
    itemInicial: {
      id: 'it-credencial-detective', nombre: 'Placa y credencial',
      shortDescription: 'No es policía, pero la placa se le parece lo suficiente como para que la mayoría no mire ' +
        'dos veces. Abre algunas puertas y le cierra otras, para siempre, si se descubre.',
    },
  },
  {
    id: 'ocultista',
    nombre: 'Ocultista',
    descripcion:
      'Coleccionó demasiados libros raros como para llamarlo afición. Corresponde con anticuarios de otras ' +
      'provincias, sabe leer un símbolo que nadie más reconoce en la mesa, y no siempre distingue con ' +
      'claridad dónde termina el estudio y empieza la obsesión.',
    habilidades: ['ocultismo', 'historia', 'biblioteca', 'buscar_libros',
      'antropologia', 'persuasion', 'descubrir', 'credito'],
    credito: { min: 9, max: 30 },
    formula: { fijos: { EDU: 4 } },
    itemInicial: {
      id: 'it-cuaderno-ocultista', nombre: 'Cuaderno de anotaciones ocultas',
      shortDescription: 'Copias de símbolos, direcciones de correspondencia con otras provincias, y notas al margen ' +
        'que ni él mismo firmaría delante de otra persona.',
    },
  },
  {
    id: 'boxeador',
    nombre: 'Boxeador',
    descripcion:
      'Pelea por plata en clubes de barrio y ferias de pueblo, a veces con reglas y a veces sin ellas. El ' +
      'cuerpo lleva la cuenta de cada pelea antes que la memoria, y eso también sirve para leer a un ' +
      'contrincante que todavía no levantó las manos.',
    habilidades: ['pelea', 'esquivar', 'intimidar', 'saltar',
      'psicologia', 'descubrir', 'arrojar', 'credito'],
    credito: { min: 9, max: 30 },
    formula: { fijos: { EDU: 2, STR: 2 } },
    itemInicial: {
      id: 'it-vendas-boxeador', nombre: 'Vendas de mano',
      shortDescription: 'Manchadas, remendadas, y más viejas que cualquier otra cosa que tenga encima. Se las venda ' +
        'siempre en el mismo orden, aunque no vaya a pelear.',
    },
  },
  {
    id: 'domador',
    nombre: 'Domador',
    descripcion:
      'Amansa lo que otros ya dieron por perdido: caballos, sobre todo, aunque en el campo eso incluye ' +
      'saber tratar con cualquier cosa que no quiere ser tocada. Conoce cada estancia de la zona por sus ' +
      'animales antes que por sus dueños.',
    habilidades: ['pelea', 'mecanica', 'trepar', 'orientarse',
      'ciencia_naturales', 'primeros_auxilios', 'escuchar', 'credito'],
    credito: { min: 9, max: 25 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['STR', 'DEX'], multiplicador: 2 } },
    tratamiento: { m: 'domador', f: 'domadora' },
    itemInicial: {
      id: 'it-lazo-domador', nombre: 'Lazo trenzado',
      shortDescription: 'Cuero sobado, trenzado a mano, sin un solo nudo flojo. No lo presta ni lo deja tirado, ' +
        'ni siquiera cuando no anda a caballo.',
    },
  },
  {
    id: 'cura',
    nombre: 'Cura de pueblo',
    descripcion:
      'Bautiza, casa y entierra. Escucha en confesión lo que nadie declara en la comisaría, y esa es a la ' +
      'vez su mejor herramienta y su límite más duro.',
    habilidades: ['psicologia', 'persuasion', 'historia', 'biblioteca',
      'ocultismo', 'escuchar', 'primeros_auxilios', 'credito'],
    credito: { min: 9, max: 60 },
    formula: { fijos: { EDU: 4 } },
    // Sólo varón: en el clero católico de 1920 no existe forma femenina de
    // esta ocupación. La pantalla de creación fuerza el género a 'm' cuando
    // se elige «cura de pueblo» — no es un error de esta tabla, es el mundo.
    soloGenero: 'm',
    tratamiento: { m: 'padre', f: 'padre' },
    itemInicial: {
      id: 'it-breviario-cura', nombre: 'Breviario y crucifijo de bolsillo',
      shortDescription: 'Tapas gastadas de tanto abrirse en el mismo punto, y un crucifijo de metal barato que ya no ' +
        'brilla. Los dos le pesan menos en la mano que en la conciencia.',
    },
  },
];

export const OCUPACION_POR_ID: Record<string, Ocupacion> = Object.fromEntries(
  OCUPACIONES.map((o) => [o.id, o]),
);
