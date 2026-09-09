/**
 * INVESTIGADORES PREGENERADOS.
 *
 * Decisión aprobada: pregenerados en el MVP, creación de personaje después.
 * La estructura ya soporta creación completa — sólo falta la UI y el método
 * de generación de características de CoC 7e.
 *
 * El segundo investigador existe para demostrar la continuidad tras la muerte:
 * el mundo conserva todo lo que hizo el primero.
 */

import type { Investigator, SkillValue, SkillId, Characteristics, Item } from '../shared/types.ts';
import { computeDerived } from '../rules/derived.ts';
import { emptyUmbralState } from '../rules/umbral.ts';
import { SKILLS } from '../rules/skills.ts';

function buildSkills(overrides: Record<SkillId, number>): Record<SkillId, SkillValue> {
  const out: Record<SkillId, SkillValue> = {};
  for (const def of SKILLS) {
    const value = overrides[def.id];
    out[def.id] = {
      base: value ?? def.defaultBase,
      origin: value !== undefined ? 'occupation' : 'personal',
    };
  }
  return out;
}

function make(
  id: string,
  name: string,
  age: number,
  occupation: string,
  treatment: string,
  genero: 'm' | 'f',
  description: string,
  ch: Characteristics,
  luck: number,
  skills: Record<SkillId, number>,
  backstory: Investigator['backstory'],
  /**
   * Opcional y con default, para no tocar a Elena ni a Tomás: hasta «El
   * Círculo Rojo» (c. 1674) todos los investigadores del proyecto eran
   * argentinos de 1920, y "Argentina" alcanzaba. Un pregenerado de 1674 no
   * puede ser argentino: el país no existe todavía.
   */
  nationality = 'Argentina',
): Investigator {
  const derived = computeDerived(ch, { luck, edad: age });
  // Esquivar = DEX/2 salvo que la ocupación lo suba.
  const finalSkills = buildSkills({ ...skills, esquivar: skills.esquivar ?? Math.floor(ch.DEX / 2) });
  return {
    id,
    playerId: 'jugador-local',
    status: 'alive',
    name,
    age,
    occupation,
    treatment,
    genero,
    nationality,
    description,
    characteristics: ch,
    derived,
    skills: finalSkills,
    umbral: emptyUmbralState(),
    conditions: [],
    knowledge: { investigator: [], withheld: [], playerObserved: [] },
    relationships: [],
    backstory,
    experience: { sessionsSurvived: 0, lastDevelopmentSeq: 0 },
    ringBond: null,
    pendingLuckBonus: 0,
    spellsKnown: [],
    sanityLostThisScenario: 0,
    sanAtStartOfScenario: derived.san,
  };
}

export const ELENA: Investigator = make(
  'inv-elena',
  'Elena Sartori',
  34,
  'Médica rural',
  'doctora', 'f',
  'Se recibió en Buenos Aires y eligió el campo, cosa que su familia todavía no le perdona. ' +
    'Escucha más de lo que habla. Tiene la costumbre de anotar todo lo que ve antes de opinar sobre ello, ' +
    'y la costumbre peor de volver a leer sus notas hasta encontrarles un defecto.',
  { STR: 45, CON: 60, SIZ: 55, DEX: 65, APP: 60, INT: 80, POW: 65, EDU: 85 },
  55,
  {
    medicina: 65,
    primeros_auxilios: 60,
    ciencia_naturales: 45,
    psicologia: 35,
    persuasion: 40,
    biblioteca: 50,
    buscar_libros: 45,
    descubrir: 40,
    escuchar: 30,
    historia: 20,
    orientarse: 20,
    trepar: 25,
    nadar: 25,
    sigilo: 20,
    mecanica: 15,
    fotografia: 10,
    intimidar: 20,
    labia: 15,
  },
  {
    // Trasfondo. No es color: es de acá que sale la Cordura que se recupera
    // entre aventuras, y cada fracaso de auto-ayuda obliga a reescribir uno.
    aspects: [
      { id: 'e-conexion', kind: 'personas',
        text: 'Su hermana Amalia, en Rosario, que le escribe todas las semanas y a la que le contesta una de cada tres.' },
      { id: 'e-ideologia', kind: 'ideologia',
        text: 'Cree que casi todo lo que la gente llama misterio es una historia clínica mal tomada.' },
      { id: 'e-lugar', kind: 'lugares',
        text: 'El anfiteatro de la Facultad de Medicina, donde entendió por primera vez que un cuerpo se puede leer.' },
      { id: 'e-posesion', kind: 'posesiones',
        text: 'La libreta de tapas duras. Va por la novena; guarda las ocho anteriores.' },
      { id: 'e-rasgo', kind: 'rasgos',
        text: 'Escucha más de lo que habla, y anota antes de opinar.' },
    ],
    keyConnection: 'e-conexion',
  },
);

export const TOMAS: Investigator = make(
  'inv-tomas',
  'Tomás Belgrano',
  29,
  'Periodista de policiales',
  'don Tomás', 'm',
  'Trabaja para un diario de provincia que le paga tarde y mal. Llegó a Los Álamos porque una desaparición ' +
    'en el campo es media columna, y porque le debe favores a demasiada gente en la ciudad. ' +
    'Fotografía todo. Cree que una imagen es una prueba, lo cual es su virtud y va a ser su problema.',
  { STR: 55, CON: 55, SIZ: 60, DEX: 70, APP: 70, INT: 75, POW: 55, EDU: 70 },
  60,
  {
    fotografia: 55,
    buscar_libros: 60,
    labia: 55,
    persuasion: 50,
    psicologia: 45,
    descubrir: 55,
    escuchar: 45,
    biblioteca: 45,
    historia: 35,
    sigilo: 35,
    trepar: 30,
    orientarse: 30,
    mecanica: 20,
    primeros_auxilios: 35,
    intimidar: 30,
    nadar: 30,
  },
  {
    aspects: [
      { id: 't-conexion', kind: 'personas',
        text: 'Su editor en el diario, que le banca los viajes y le corta las notas a la mitad.' },
      { id: 't-ideologia', kind: 'ideologia',
        text: 'Cree que una fotografía es una prueba. No ha encontrado todavía el caso que lo desmienta.' },
      { id: 't-lugar', kind: 'lugares',
        text: 'El cuarto oscuro del diario, de noche, con la luz roja y nadie más en el edificio.' },
      { id: 't-posesion', kind: 'posesiones',
        text: 'Una cámara de placas heredada, más vieja que él y mejor que él.' },
      { id: 't-rasgo', kind: 'rasgos',
        text: 'Pregunta de más y anota de menos, porque confía en la imagen.' },
    ],
    keyConnection: 't-conexion',
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// EL CÍRCULO ROJO, c. 1674
//
// Elenco propio de la undécima aventura. NO se encadenan con Elena ni con
// Tomás —son de doscientos cincuenta años antes—, así que esa aventura es su
// propia campaña, sin herencia hacia ni desde ninguna otra. Misma función
// `make()` que los otros dos, con la nacionalidad de la época.
// ─────────────────────────────────────────────────────────────────────────────

export const JUANA: Investigator = make(
  'inv-juana',
  'Juana Ossorio',
  41,
  'Comadre y curandera',
  'la comadre', 'f',
  'Nació de este lado del mar, de madre india y padre que no la reconoció. Atiende partos, huesos rotos y ' +
    'lo que la gente no cuenta en confesión. Conoce el agua de la laguna desde chica y no le tuvo miedo ' +
    'nunca, que no es lo mismo que no respetarla. La escuchan cuando hace falta y la olvidan cuando no.',
  { STR: 50, CON: 70, SIZ: 50, DEX: 60, APP: 50, INT: 70, POW: 80, EDU: 40 },
  50,
  {
    ocultismo: 55,
    medicina: 40,
    primeros_auxilios: 65,
    ciencia_naturales: 45,
    escuchar: 55,
    descubrir: 50,
    psicologia: 50,
    orientarse: 55,
    persuasion: 35,
    sigilo: 40,
    nadar: 40,
    trepar: 35,
    pelea: 30,
    intimidar: 25,
    historia: 15,
  },
  {
    aspects: [
      { id: 'j-conexion', kind: 'personas',
        text: 'Los chicos que ayudó a nacer en veinte años, que ya son gente grande y la saludan de lejos.' },
      { id: 'j-ideologia', kind: 'ideologia',
        text: 'Que hay cosas que se cuidan sin entenderlas, y que entenderlas de más es una manera de romperlas.' },
      { id: 'j-lugar', kind: 'lugares',
        text: 'La orilla de la laguna a la hora en que el agua se queda quieta del todo.' },
      { id: 'j-posesion', kind: 'posesiones',
        text: 'Un atado de hierbas y una piedra de río que le dio su madre, y que no sirve para nada.' },
      { id: 'j-rasgo', kind: 'rasgos',
        text: 'No discute con nadie que no vaya a cambiar de idea.' },
    ],
    keyConnection: 'j-conexion',
  },
  'Virreinato del Perú',
);

export const FRAY_MATEO: Investigator = make(
  'inv-mateo',
  'Fray Mateo de Anguix',
  36,
  'Fraile y escribiente',
  'fray Mateo', 'm',
  'Vino de Sevilla a llevar cuentas y bautismos, y hace tres años que anota cosas que no van en ningún libro ' +
    'que se pueda mandar a España. Lee latín y una lengua más que no admite en voz alta. No es un hombre de fe ' +
    'perdida: es un hombre de fe que encontró algo que su fe no explica y decidió no mentir sobre eso.',
  { STR: 45, CON: 55, SIZ: 60, DEX: 55, APP: 55, INT: 80, POW: 60, EDU: 80 },
  45,
  {
    biblioteca: 65,
    buscar_libros: 60,
    persuasion: 55,
    historia: 50,
    ocultismo: 35,
    psicologia: 45,
    descubrir: 45,
    escuchar: 40,
    labia: 40,
    intimidar: 30,
    pelea: 35,
    orientarse: 25,
    sigilo: 25,
    primeros_auxilios: 25,
    nadar: 20,
  },
  {
    aspects: [
      { id: 'm-conexion', kind: 'personas',
        text: 'Juana Ossorio, la comadre, que sabe más que él y no tiene con quién decirlo.' },
      { id: 'm-ideologia', kind: 'ideologia',
        text: 'Que lo que no se anota se pierde, y que perder algo por comodidad es una forma de mentir.' },
      { id: 'm-lugar', kind: 'lugares',
        text: 'La mesa del puesto, de noche, con la vela hasta el final y la tinta cerca del fuego para que no espese.' },
      { id: 'm-posesion', kind: 'posesiones',
        text: 'Un cuaderno cosido a mano, de hojas desparejas, que no le mostró a su superior.' },
      { id: 'm-rasgo', kind: 'rasgos',
        text: 'Escribe todo dos veces: una como pasó y otra como se podría contar.' },
    ],
    keyConnection: 'm-conexion',
  },
  'Reino de Sevilla, Corona de Castilla',
);

/**
 * El ítem de oficio de cada pregenerado, listo para sumarse a `Scenario.items`
 * en cualquier aventura (ver `cargarAventura`).
 *
 * No puede venir del JSON de cada aventura: el validador de contenido exige
 * que `Item.owner` sea un lugar o un NPC (`validarContenido.ts`), así que un
 * ítem que arranca en manos de un investigador tiene que sumarse DESPUÉS de
 * validar — mismo momento en que `engine.ts` suma el arma y el ítem de
 * ocupación de un investigador creado a mano. Comparten id con
 * `Ocupacion.itemInicial` (`medico-rural`, `periodista`/`fotografo` en
 * `scenario/ocupaciones.ts`) a propósito: si algún día alguien reemplaza a
 * Elena o a Tomás por un médico o un fotógrafo creado en la pantalla de
 * personaje, el mismo id sigue enganchando en las mismas escenas.
 */
export const ITEMS_DE_OCUPACION: Item[] = [
  {
    id: 'it-maletin-medico',
    name: 'Maletín médico',
    shortDescription: 'Cuero gastado, instrumental básico y un frasco de láudano que nunca usó y no piensa tirar. ' +
      'Lo abre siempre de la misma manera, aunque nadie la esté mirando.',
    owner: ELENA.id,
    carried: true,
    roto: false,
    publicProperties: [],
    hiddenProperties: [],
    discoveredProperties: [],
    conditionalProperties: [],
    temporalProperties: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
    usageCount: 0,
  },
  {
    id: 'it-camara-fotografica',
    name: 'Cámara de placas',
    shortDescription: 'Heredada, más vieja que él y mejor que él. Placas de vidrio, no película: cada toma cuesta ' +
      'tiempo y no se repite fácil.',
    owner: TOMAS.id,
    carried: true,
    roto: false,
    publicProperties: [],
    hiddenProperties: [],
    discoveredProperties: [],
    conditionalProperties: [],
    temporalProperties: [],
    canon: { truth: 'CANON_SETTING', disclosure: 'PUBLIC', source: 'scenario' },
    usageCount: 0,
  },
];
