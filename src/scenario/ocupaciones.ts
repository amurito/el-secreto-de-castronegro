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
  },
  {
    id: 'agrimensor',
    nombre: 'Agrimensor',
    descripcion:
      'Mide la tierra y firma lo que midió, y esa firma después la lee un juez. Trabajo de anteojo, cadena y ' +
      'libreta, hecho a la intemperie y discutido en tribunales. Sabe que un número mal puesto dura un siglo.',
    habilidades: ['orientarse', 'ciencia_naturales', 'buscar_libros', 'historia',
      'descubrir', 'mecanica', 'persuasion', 'credito'],
    credito: { min: 20, max: 60 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['DEX', 'INT'], multiplicador: 2 } },
    tratamiento: { m: 'agrimensor', f: 'agrimensora' },
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
  },
  {
    id: 'anticuario',
    nombre: 'Anticuario',
    descripcion:
      'Compra y vende lo que sobrevivió. Muebles de estancia, platería, libros de bibliotecas rematadas. ' +
      'Reconoce una fecha por la técnica y una falsificación por la prisa, y colecciona cosas que no vende.',
    habilidades: ['historia', 'biblioteca', 'ocultismo', 'antropologia',
      'descubrir', 'persuasion', 'buscar_libros', 'credito'],
    credito: { min: 30, max: 70 },
    formula: { fijos: { EDU: 4 } },
  },
  {
    id: 'capataz',
    nombre: 'Capataz de estancia',
    descripcion:
      'Nació en el campo y no durmió afuera veinte noches en su vida. Conoce cada alambrado, cada aguada y ' +
      'cada peón, y lee el terreno como otros leen un diario.',
    habilidades: ['orientarse', 'ciencia_naturales', 'descubrir', 'trepar',
      'intimidar', 'mecanica', 'escuchar', 'credito'],
    credito: { min: 9, max: 40 },
    formula: { fijos: { EDU: 2 }, eleccion: { entre: ['STR', 'DEX'], multiplicador: 2 } },
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
    // «Padre» para los dos géneros: en el clero católico de 1920 no hay forma
    // femenina de esta ocupación. Elegir «cura de pueblo» siendo mujer es
    // anacrónico en los términos del propio mundo, no un error de esta tabla.
    tratamiento: { m: 'padre', f: 'padre' },
  },
];

export const OCUPACION_POR_ID: Record<string, Ocupacion> = Object.fromEntries(
  OCUPACIONES.map((o) => [o.id, o]),
);
