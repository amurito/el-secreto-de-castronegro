/**
 * PRUEBA DEL TRATAMIENTO — `npm run prueba:tratamiento`
 *
 * Bug real, reportado jugando: la prosa decía «doctora» sin importar quién
 * jugaba. Un investigador armado a mano —Nico, anticuario, varón— seguía
 * siendo tratado de médica, mal en género Y en profesión, porque el texto
 * tenía la palabra escrita a mano en vez de resolverla desde la ficha.
 *
 * Esta prueba verifica que el arreglo cierre en los dos niveles:
 *   1. `calcularTratamiento` da la forma correcta para cada ocupación y género.
 *   2. Jugando de verdad con un investigador no-Elena, «doctora» no aparece
 *      en ningún momento de la narración — ni en la apertura, ni en el juego.
 */

import { createCampaign, Turn } from './engine/engine.ts';
import { AGUA_QUIETA } from './scenario/aguaquieta.ts';
import { runOfflineTurn } from './keeper/offline.ts';
import { useStore } from './engine/store.ts';
import { fileStore } from './engine/store.node.ts';
import { calcularTratamiento, conTrato } from './rules/tratamiento.ts';
import { OCUPACION_POR_ID } from './scenario/ocupaciones.ts';
import { crearInvestigador } from './rules/ficha.ts';
import type { Investigator, Characteristics } from './shared/types.ts';

useStore(fileStore);

let fallos = 0;
const check = (n: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`);
  if (!ok) fallos++;
};

function fijo(n: number) { return () => n; }

/**
 * Un investigador VARÓN con la ocupación de Elena — a propósito. El bug real
 * no era sólo de ocupación (Nico, anticuario, seguía siendo «doctora»): era
 * de género. Si hasta un MÉDICO varón queda bien tratado («doctor», no
 * «doctora»), el arreglo cierra también para cuando la ocupación coincide y
 * lo único que cambia es a quién se le pregunta.
 */
function armarNico(): Investigator {
  // Mismas características fijas que `prueba-creacion.ts` usa para su armado
  // completo, y el mismo reparto «legal»: lo único que cambia acá es
  // `genero: 'm'`. Así la prueba aísla una sola variable.
  const ch: Characteristics = { STR: 50, CON: 60, SIZ: 55, DEX: 60, APP: 55, INT: 70, POW: 60, EDU: 75 };
  const tirada = { caracteristicas: ch, suerte: 55 };
  const ocupacion = OCUPACION_POR_ID['medico-rural']!;
  const r = crearInvestigador(
    tirada,
    {
      nombre: 'Nico', genero: 'm', edad: 44, descripcion: 'Un médico varón, para probar el género.',
      ocupacionId: 'medico-rural',
      restaFisica: { STR: 3, CON: 2 },
      reparto: {
        ocupacion: { medicina: 60, primeros_auxilios: 40, psicologia: 40, biblioteca: 40,
          buscar_libros: 40, descubrir: 30, ciencia_naturales: 20, credito: 30 },
        personal: { escuchar: 40, historia: 30, orientarse: 30, trepar: 20, nadar: 20 },
      },
      trasfondo: [
        { id: 'a1', kind: 'personas', text: 'Un socio en Buenos Aires.' },
        { id: 'a2', kind: 'lugares', text: 'Su consultorio.' },
        { id: 'a3', kind: 'rasgos', text: 'Desconfiado.' },
      ],
      conexionClave: 'a1',
    },
    ocupacion, fijo(99), fijo(4),
  );
  if (!r.ok) throw new Error(`No se pudo armar a Nico: ${r.problemas.map((p) => p.mensaje).join(' | ')}`);
  return r.investigador!;
}

async function main() {
  console.log('\n1. calcularTratamiento POR OCUPACIÓN Y GÉNERO');
  const medico = OCUPACION_POR_ID['medico-rural']!;
  check('médica rural, femenino → doctora',
    calcularTratamiento('Elena', 'f', medico) === 'doctora');
  check('médico rural, masculino → doctor',
    calcularTratamiento('Elena', 'm', medico) === 'doctor');
  const anticuario = OCUPACION_POR_ID['anticuario']!;
  check('anticuario, sin tratamiento propio → don + nombre',
    calcularTratamiento('Nico', 'm', anticuario) === 'don Nico');
  check('anticuaria, sin tratamiento propio → doña + nombre',
    calcularTratamiento('Nora', 'f', anticuario) === 'doña Nora');
  const comisario = OCUPACION_POR_ID['comisario']!;
  check('comisaria, femenino → comisaria',
    calcularTratamiento('Ana', 'f', comisario) === 'comisaria');

  console.log('\n2. JUGANDO CON UN INVESTIGADOR NO-ELENA, "DOCTORA" NO APARECE');
  const nico = armarNico();
  check('el investigador arma con el tratamiento calculado', nico.treatment === 'doctor', nico.treatment);

  const id = await createCampaign(AGUA_QUIETA, 'TRATAMIENTO', 'w'.repeat(64), undefined, nico);
  const t0 = await Turn.open(id);
  // La apertura pasa por `conTrato` en api.local.ts/server, no en el motor:
  // acá se reproduce ese paso a mano para no depender de la capa HTTP.
  const acumulado: string[] = [conTrato(AGUA_QUIETA.opening, nico)];

  const guion = [
    'Voy a la casa', 'Le pregunto qué pasó esa noche', 'Le pregunto por el aljibe',
    'Le pregunto a Rosa por el hermano', 'Le pregunto a Rosa qué vio ella',
    ...['Insistirle: qué vio ella'],
  ];
  for (const accion of guion) {
    const t = await Turn.open(id);
    t.submitIntent(accion, 'jugador-local');
    const r = await runOfflineTurn(t, AGUA_QUIETA, accion, () => {});
    t.narrate(r.narration, r.options);
    await t.commit();
    acumulado.push(r.narration);
  }

  const texto = acumulado.join('\n');
  check('nunca dice «doctora» (Nico es varón)', !/doctora/i.test(texto));
  check('nunca deja el token {trato} sin resolver', !texto.includes('{trato}'));
  check('sí lo trata de «doctor» en algún momento', /doctor\b/.test(texto));

  console.log(fallos === 0 ? '\nTODO OK\n' : `\n${fallos} PROBLEMAS\n`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
