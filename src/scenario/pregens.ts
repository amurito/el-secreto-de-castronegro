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

import type { Investigator, SkillValue, SkillId, Characteristics } from '../shared/types.ts';
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
  description: string,
  ch: Characteristics,
  luck: number,
  skills: Record<SkillId, number>,
  backstory: Investigator['backstory'],
): Investigator {
  const derived = computeDerived(ch, { luck });
  // Esquivar = DEX/2 salvo que la ocupación lo suba.
  const finalSkills = buildSkills({ ...skills, esquivar: skills.esquivar ?? Math.floor(ch.DEX / 2) });
  return {
    id,
    playerId: 'jugador-local',
    status: 'alive',
    name,
    age,
    occupation,
    nationality: 'Argentina',
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
  };
}

export const ELENA: Investigator = make(
  'inv-elena',
  'Elena Sartori',
  34,
  'Médica rural',
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
