/**
 * LA LÓGICA DE LAS ESCENAS DE EL VIGÉSIMO — lo único que no puede ser dato.
 *
 * Séptimo Umbral, segundo acto. Todo lo demás vive en
 * `elvigesimo.contenido.json`.
 *
 * Bernardo SÍ aparece acá —es la pieza central de la 7b— pero sigue sin
 * confirmar lo sellado (v0.7 §7, y ver ROADMAP §3.2-terdecies). El combate
 * contra él es real y es obligatorio como clímax; lo que se hace CON esa
 * pelea —rematarlo, ponerse el anillo, huir, denunciar— es lo que abre los
 * cuatro finales.
 */

import type { GameState } from '../shared/types.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';
import type { EfectoEscena } from './escena.ts';
import { evaluarCondicion } from './condiciones.ts';

const ruido = (s: GameState) =>
  s.consequences.filter((c) => c.description.includes('hizo ruido en la Casa')).length;

/**
 * Umbrales de la bonificación de preparación contra Bernardo (ver
 * `bernardo-enfrentar`, más abajo). Afinación de esta única pelea de esta
 * única aventura, no una regla genérica —por eso vive acá y no en
 * `rules/social.config.ts`—: de siete hechos posibles que el investigador
 * puede haber juntado antes de confrontarlo, 0-1 no da nada, 2-4 da un
 * dado, 5-7 da dos.
 */
const PREPARACION_BERNARDO = { dosDados: 5, unDado: 2 } as const;

export const EL_VIGESIMO_LOGICA: LogicaDeEscenas = [
  // ══ LA BIBLIOTECA ═════════════════════════════════════════════════════════

  {
    id: 'diario-turno',
    prueba: (s) => (s.items['it-diario-bernardo']?.discoveredProperties.length ?? 0) > 0 ? null : ({
      skill: 'buscar_libros', difficulty: 'regular',
      reason: 'seguir la letra de Bernardo más allá de la página que el atril deja ver',
      stakes_success: 'encontrás la lista que sigue después de la página abierta',
      stakes_failure: 'páginas sueltas, sin orden que se entienda',
    }),
    resolver: ({ estado, tirada }) => {
      if ((estado.items['it-diario-bernardo']?.discoveredProperties.length ?? 0) > 0) {
        return { texto: ['Volvés a la lista de nombres. El último sigue sin tachar.'] };
      }
      if (!tirada?.exito) {
        return { texto: ['Pasás páginas sin encontrar nada que siga a lo que ya leíste. La letra cambia demasiado entre una hoja y otra.'] };
      }
      return [
        { descubre: { itemId: 'it-diario-bernardo', propertyId: 'p-diario-turno', how: 'siguiendo la letra de Bernardo más allá de la página del atril' } },
        {
          texto: [
            'Más adelante, con la misma mano treinta años más vieja, hay una lista de nombres con una edad al lado de cada uno.\n\nEl último de la lista no tiene tachadura. Los anteriores, todos, sí.',
          ],
          exposicion: { amount: 6, source: 'diario:lista', cause: 'una lista de nombres tachados, uno por uno, salvo el último' },
          pregunta: '¿Por qué el último nombre de la lista de Bernardo todavía no tiene tachadura?',
        },
      ];
    },
  },

  // ══ EL DORMITORIO DE BERNARDO ═════════════════════════════════════════════

  {
    id: 'dormitorio-buscar-sigilo',
    prueba: () => ({
      skill: 'sigilo', difficulty: 'regular',
      reason: 'registrar un cuarto que nadie te invitó a registrar sin que se note desde el pasillo',
      stakes_success: 'nadie se entera de que estuviste acá',
      stakes_failure: 'un ruido que se escucha más lejos de lo que pensaste',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        const critico = tirada?.grado === 'fumble';
        const efectos: EfectoEscena[] = [{
          texto: critico
            ? ['Golpeás el ropero con la cadera al dar la vuelta, y el ruido no se queda en el cuarto: baja por la escalera, entero.\n\nAlgo, abajo, deja de hacer lo que estaba haciendo.']
            : ['Un cajón que no cierra parejo hace un ruido chico, seco, que en cualquier otra casa no importaría.'],
          consecuencia: {
            description: 'El investigador hizo ruido en la Casa, registrando el dormitorio principal sin permiso.',
            scope: 'campaign',
            permanent: true,
            worldReminder: 'Alguien, en algún piso de la casa, sabe que hubo un ruido que no tenía que estar.',
          },
        }];
        if (critico) {
          efectos.push({
            texto: ['Pasos, abajo, que no son los de Ercilia: más pesados, sin apuro, viniendo hacia la escalera.'],
            combate: { accion: 'atacar', npcId: 'npc-guardian-sotano', armaId: 'desarmado' },
            iniciaCombate: { npcIds: ['npc-guardian-sotano'] },
          });
        }
        return efectos;
      }
      return {
        texto: [
          'Te movés despacio, contra la pared, evitando la tabla que ya viste que cruje.\n\nNo hacía falta tanto cuidado: nadie sube a este piso a esta hora salvo vos.',
        ],
      };
    },
  },

  // ══ EL GUARDIÁN DEL SÓTANO ════════════════════════════════════════════════

  {
    id: 'sotano-pasar-sigilo',
    prueba: (s) => ({
      skill: 'sigilo',
      difficulty: ruido(s) > 0 ? 'hard' : 'regular',
      reason: 'pasar al lado de algo que custodia esa puerta hace más generaciones que las que nadie cuenta',
      stakes_success: 'llegás a la entrada del laberinto sin que note que pasaste',
      stakes_failure: 'te ve pasar, y no hace falta que diga nada para que se note',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: [
            'Se mueve apenas, orientando la cabeza hacia un sonido que no hiciste vos, y en ese segundo pasás.\n\nLlegás a la puerta del fondo sin que gire a mirarte.',
          ],
        };
      }
      return {
        texto: [
          'Gira la cabeza antes de que termines de dar el primer paso. No hace falta que diga nada: los dos saben que ya te vio.',
        ],
      };
    },
  },

  {
    id: 'sotano-enfrentar',
    resolver: () => ({
      texto: [
        'No hay otra manera de pasar por esta puerta que no sea al lado de él, y él ya decidió que no vas a pasar gratis.',
      ],
      combate: { accion: 'atacar', npcId: 'npc-guardian-sotano', armaId: 'desarmado' },
      iniciaCombate: {
        npcIds: ['npc-guardian-sotano'],
        reason: 'No hay otra manera de pasar por esta puerta que no sea al lado de él.',
        salidaPacifica: {
          npcId: 'npc-guardian-sotano',
          pistaCalma: {
            description: 'Se hizo a un lado sin que quede claro si entendió una palabra de lo que le dijiste, o si simplemente ya estaba autorizado y vos no lo sabías.',
            kind: 'experiential',
            source: 'el trastero del sótano',
            reliability: 'reliable',
          },
          consecuenciaDisparo: {
            description: 'En el sótano de la Casa de Díaz, el investigador le disparó a lo que custodiaba la entrada al laberinto.',
            scope: 'campaign',
            permanent: true,
            worldReminder: 'Usó un arma de fuego contra algo que no llegó a identificar del todo, adentro de la propia casa de Bernardo.',
          },
        },
      },
      exposicion: { amount: 8, source: 'sotano:guardian', cause: 'pelear cuerpo a cuerpo con algo que ya no tiene nombre para nadie' },
    }),
  },

  {
    // Pedido después de jugarlo: (1) una tirada de Cordura DE VERDAD —no un
    // descuento fijo sin dados— y (2) que examinar algo así deje Mitos de
    // Cthulhu ganado, no sólo Cordura perdida. La identidad de Casimiro ya
    // NO depende de una tirada: depende de haber visto el retrato del
    // salón, como cualquier otra pista cruzada de esta aventura —así la
    // única tirada de la escena puede ser, de verdad, la de Cordura.
    id: 'examinar-cadaver-guardian',
    prueba: () => ({
      skill: 'COR', difficulty: 'regular',
      reason: 'sostener la mirada sobre lo que quedó, sin que se te vaya la cabeza',
      stakes_success: 'te cuesta menos de lo que podría',
      stakes_failure: 'te cuesta más de lo que esperabas',
    }),
    resolver: ({ estado, tirada }) => {
      const vioRetratos = evaluarCondicion(
        { op: 'detalleVisto', lugar: 'salon', feature: 'f-retratos' },
        { estado },
      );
      // Sin segunda tirada (el motor sólo admite una por intención): el
      // Mitos ganado sale del mismo d100 que ya salió para la Cordura,
      // acotado a 1-3 —el «1D3» pedido, sin inventar una fórmula de dados
      // nueva en el contenido.
      const mitosGanado = 1 + ((tirada?.numero ?? 1) % 3);
      const comun: EfectoEscena = {
        texto: ['Te arrodillás junto al cuerpo. La espalda encorvada, las muñecas finas, los dientes largos no se acomodan solos cuando ya no hay nadie sosteniéndolos así.'],
        cordura: {
          amount: tirada?.exito ? 2 : 5,
          cause: 'arrodillarse junto a lo que quedó, sea o no reconocible',
          ...(tirada?.exito ? {} : {
            crisis: {
              nombre: 'Horror a los cadáveres',
              descripcion: 'No puede acercarse a un cuerpo sin que le tiemblen las manos, ni siquiera uno que ya conocía bien de antes. La crisis dura hasta el final de la escena.',
              tipo: 'phobia' as const,
              afecta: [{ skill: 'medicina', dados: 1 }],
            },
          }),
        },
        mitos: { amount: mitosGanado, source: 'cadaver:guardian' },
      };
      if (vioRetratos) {
        return [comun, {
          texto: [
            'Bajo la deformidad hay una arquitectura de hueso que reconocés: la frente corrida hacia atrás, la mandíbula demasiado larga para el resto de la cara. Es la misma cara rara del marco más viejo del salón, el que decía «Casimiro Díaz, 1889—1909».\n\nCasimiro no murió a los veinte años. Lo dejaron acá, en la puerta, y dejaron de contar los años.',
          ],
          exposicion: { amount: 10, source: 'cadaver:guardian:nombrado', cause: 'reconocer, con nombre y apellido, en qué se convierte el que no llega a ser el vigésimo' },
          pistas: [{
            description: 'El cuerpo de lo que custodiaba la puerta del sótano es Casimiro Díaz, retratado en el salón con una muerte falsa en 1909, a los veinte años. No murió: lo dejaron en la puerta.',
            kind: 'physical',
            source: 'examen directo del cuerpo, cruzado con el retrato del salón',
            reliability: 'reliable',
          }],
        }];
      }
      return [comun, {
        texto: [
          'Bajo la deformidad hay una arquitectura de hueso que no es al azar: la misma familia que vive arriba, en otro cuerpo, con otro tiempo encima. No sabrías decir a cuál se parece —no llegaste a mirar bien los retratos del salón— pero el parecido está, y es demasiado exacto para ser casualidad.',
        ],
        exposicion: { amount: 8, source: 'cadaver:guardian', cause: 'reconocer el parentesco sin poder ponerle nombre' },
        pistas: [{
          description: 'El cuerpo de lo que custodiaba la puerta del sótano comparte arquitectura ósea con la familia Díaz, aunque no hay forma de decir con cuál retrato se corresponde.',
          kind: 'physical',
          source: 'examen directo del cuerpo',
          reliability: 'reliable',
        }],
      }];
    },
  },

  // ══ EL MAUSOLEO ═══════════════════════════════════════════════════════════
  // Contenido secundario, explorable en cualquier momento: nunca es de ida,
  // a diferencia del sótano. Adapta la IDEA del mausoleo de la aventura
  // original (una cripta familiar con lugares numerados, uno vacío) sin
  // tocar su texto: los nombres, fechas y números de acá son propios.

  {
    id: 'mausoleo-forzar-candado',
    prueba: () => ({
      // Pedido del usuario: Mecánica es una habilidad rara en las fichas
      // (Elena 15%), así que exigirla hacía el candado casi imposible para
      // casi cualquier investigador. `DEX` a dificultad `hard` es, tal cual
      // la interpreta el motor, la mitad de la característica —lo mismo que
      // pedir «DES/2»— sin necesidad de ninguna fórmula nueva.
      skill: 'DEX', difficulty: 'hard',
      reason: 'forzar un candado viejo sin herramienta pensada para eso',
      stakes_success: 'cede',
      stakes_failure: 'no cede todavía',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return { texto: ['Forcejeás con el candado. Está viejo, pero no lo suficiente. Podés volver a intentarlo.'] };
      }
      return {
        texto: ['El candado cede de golpe, con un chasquido seco que no esperabas después de tanto forcejear. Adentro, la oscuridad no es la misma que la de afuera.'],
        pistas: [{
          description: 'El candado del mausoleo cede: adentro hay una cámara con nichos.',
          kind: 'physical',
          source: 'la puerta del mausoleo de los Díaz',
          reliability: 'reliable',
        }],
      };
    },
  },

  {
    id: 'mausoleo-examinar-nichos',
    prueba: () => ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'distinguir una placa en particular entre diecinueve iguales',
      stakes_success: 'un nombre se separa del resto',
      stakes_failure: 'diecinueve nichos, y ninguno se distingue del resto',
    }),
    resolver: ({ tirada }) => {
      // Ver diecinueve cuerpos conservados en fila cuesta Cordura de
      // verdad, no sólo Exposición —pedido del usuario—: es perturbador se
      // distinga o no una placa en particular, así que el costo va acá,
      // antes de la rama de éxito/fracaso de la tirada de Descubrir.
      const comun: EfectoEscena = {
        texto: [
          'Cada nicho sellado tiene, además del nombre y las fechas, una figurita tallada apoyada contra la placa —siempre la misma figura, hecha por manos distintas en épocas distintas—. El nicho abierto no tiene ninguna.',
        ],
        // Pedido después de jugarlo: que la pérdida se sienta, no que sea un
        // número que baja en silencio. 5 puntos de golpe ya cruza el piso
        // que el motor usa para una crisis de locura temporal automática
        // (CoC 7e p. 166); sin `crisis` acá salía con el nombre genérico.
        // Con nombre y efecto propios, contar los nichos dos veces en esta
        // aventura (acá y en cualquier fila repetida después) deja una marca
        // real en la ficha, no sólo una frase.
        cordura: {
          amount: 5,
          cause: 'ver diecinueve cuerpos de la misma familia guardados como quien guarda algo, no como quien entierra a alguien',
          crisis: {
            nombre: 'Manía de contar',
            descripcion: 'Necesita contar cualquier fila de cosas repetidas antes de poder pensar en otra cosa —nichos, escalones, latidos—. Si alguien la interrumpe a mitad de la cuenta, hay que volver a empezar.',
            tipo: 'mania',
            afecta: [{ skill: 'escuchar', dados: 1 }],
          },
        },
        exposicion: { amount: 8, source: 'mausoleo:nichos', cause: 'entender de un vistazo lo que Bernardo tardó trescientos años en decir con palabras' },
      };
      if (!tirada?.exito) {
        return [comun, { texto: ['Todas las placas dicen más o menos lo mismo a esta distancia: un nombre, dos fechas, veinte años entre una y otra. Ninguna se separa del resto.'] }];
      }
      return [comun, {
        texto: [
          'Una placa sí se separa del resto, cerca del nicho vacío: «Casimiro Díaz, 1889—1909». El bronce alrededor del sello está rayado, como si algo hubiera intentado abrirlo desde ADENTRO y después se hubiera dado por vencido, o hubiera encontrado otra salida.',
        ],
        pistas: [{
          description: 'En el mausoleo de los Díaz, la placa de «Casimiro Díaz, 1889—1909» tiene el bronce rayado desde adentro. Diecinueve nichos sellados, veinte años entre las dos fechas de cada uno, y uno —el más cercano a la puerta— abierto y vacío.',
          kind: 'physical',
          source: 'la cámara del mausoleo de los Díaz',
          reliability: 'reliable',
        }],
      }];
    },
  },

  // ══ BERNARDO ══════════════════════════════════════════════════════════════

  {
    // El clímax obligatorio. No hay salida de palabra: se entra en combate de
    // verdad, y lo que se hace DESPUÉS —rematarlo, ponerse el anillo, huir,
    // salir a denunciar— es lo que abre los cuatro finales. `resolve_flee`
    // sigue disponible dentro del combate como cualquier otro: no hacía falta
    // inventar una salida nueva para eso.
    //
    // Pedido del usuario: que llegar sin haber investigado nada sea más
    // difícil que llegar con pistas juntadas. Se cuenta cuántos de estos
    // siete hechos ya conoce el investigador —tablero de pistas para seis,
    // `discoveredProperties` para el diario, que no pasa por el tablero— y
    // el conteo se traduce en dados de bonificación para toda la pelea
    // (`ActiveCombat.preparacion`, motor genérico: no sabe qué es Bernardo,
    // sólo aplica el número que declara la escena).
    id: 'bernardo-enfrentar',
    resolver: ({ estado }) => {
      const pista = (contiene: string) => evaluarCondicion({ op: 'pista', contiene }, { estado });
      const hechos = [
        pista('retratos del salón repite un patrón'),
        pista('nueve recortes de diario'),
        (estado.items['it-diario-bernardo']?.discoveredProperties ?? []).some((d) => d.propertyId === 'p-diario-turno'),
        pista('no fabricó el anillo'),
        pista('no sabe si el ciclo de nacimientos'),
        pista('custodiaba la puerta del sótano'),
        pista('el bronce rayado desde adentro'),
      ].filter(Boolean).length;

      const dice = hechos >= PREPARACION_BERNARDO.dosDados ? 2 : hechos >= PREPARACION_BERNARDO.unDado ? 1 : 0;
      const previo = dice === 2
        ? 'Sabés bien con qué estás por meterte, y eso no te hace sentir mejor.'
        : dice === 1
          ? 'Algo sabés de con qué estás por meterte. No todo.'
          : 'No tenés ni idea de con qué estás por meterte.';

      return {
        texto: [
          `Bernardo no se para. Ni siquiera suelta al Ahijado del brazo del sillón.\n\n—Ya lo veía venir —dice, y por primera vez en trescientos años no suena aliviado de que así sea.\n\n${previo}`,
        ],
        combate: { accion: 'atacar', npcId: 'npc-bernardo', armaId: 'desarmado' },
        iniciaCombate: {
          npcIds: ['npc-bernardo'],
          reason: 'Bernardo no se para. Ya lo veía venir, y esta vez no va a bastar con hablar.',
          ...(dice > 0 ? { preparacion: { dice, motivo: 'llegó sabiendo con qué se enfrentaba' } } : {}),
        },
        consecuencia: {
          description: 'El investigador entró en combate real contra Bernardo Díaz, en el laboratorio de la Casa.',
          scope: 'campaign',
          permanent: true,
          worldReminder: 'Hubo pelea de verdad con Bernardo Díaz, con las manos o con lo que tenía encima. Lo que haya pasado después de eso es harina de otro costal.',
        },
      };
    },
  },

  // ══ BERNARDO CAÍDO: EL MOMENTO DEL ANILLO ═════════════════════════════════

  {
    // Faltaba el beat entre ganar la pelea y elegir qué hacer: se pasaba de
    // un asalto de combate directo a los cuatro botones de desenlace, sin que
    // el anillo —que es de lo que trata toda la aventura— llegara a estar en
    // cuadro. Reportado jugando. No es un desenlace: es la pausa antes.
    id: 'bernardo-caido',
    resolver: () => ({
      texto: [
        'Está en el piso, contra la pata de la mesa de piedra, y respira. Trescientos años y respira como cualquiera que acaba de perder una pelea. La herida de la mano ya dejó de sangrar: se cerró sola, una vez más, la última vez que le hace falta cerrarse.',
        'La mano izquierda está abierta hacia arriba, con el anillo puesto. No la cierra. No la esconde. Si quisiera dificultarte esto, no lo estaría haciendo así.',
        '—Sáquemelo —dice—. O póngaselo. Las dos cosas terminan conmigo, y a esta altura las dos me dan igual.\n\n—Lo que no le va a dar igual a usted es cuál de las dos eligió, y eso lo va a saber recién dentro de unos años.',
        'El Ahijado bajó del sillón. No se acerca a vos ni a él: se queda en el medio, mirando la mano abierta, esperando.',
        '—Decida rápido —dice Bernardo—. No por mí: hace trescientos años que espero. Es que acá, quedarse pensando ya es una respuesta, y no la que usted quiere dar.',
        'Detrás del sillón, el laberinto sigue. Ya no suena a nada que responda a nadie.',
      ],
      exposicion: { amount: 9, source: 'laboratorio:anillo', cause: 'el anillo ofrecido en una mano abierta' },
      estabilidad: { amount: -8, cause: 'que el que perdió la pelea te ofrezca las dos salidas con la misma voz' },
      pregunta: '¿Por qué le da lo mismo a Bernardo cuál de las dos elijas?',
    }),
  },

  // ══ EL LABERINTO, DESPUÉS DE BERNARDO ═════════════════════════════════════
  // Contenido opcional: los botones de desenlace (cortar/heredar) quedan
  // disponibles apenas cae Bernardo, sin depender de esto —`reach_ending` es
  // definitivo y no hay forma de ofrecer nada DESPUÉS de un final (ver
  // ROADMAP)—. Esto es lo que hay para quien decide no apurarse: dos
  // parientes propios, ninguno con quien se pueda hablar, y una tirada de
  // Escuchar por ala en vez de un encuentro garantizado.

  {
    id: 'laberinto-avanzar-este',
    prueba: () => ({
      skill: 'escuchar', difficulty: 'regular',
      reason: 'notar a lo que vive acá antes de que te note a vos',
      stakes_success: 'cruzás sin que note que pasaste',
      stakes_failure: 'te escucha antes de que termines de decidir si seguir',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: ['La paja se mueve una vez, hacia el ruido que no hiciste, y cruzás sin que la paja vuelva a moverse.'],
          pistas: [{
            description: 'En el ala este del laberinto, bajo la paja amontonada, hay un fragmento de hueso tallado con la misma figura que se repite en las placas del mausoleo —más viejo que cualquiera de los veinte nichos.',
            kind: 'physical',
            source: 'el ala este del laberinto',
            reliability: 'reliable',
          }],
        };
      }
      return {
        texto: ['Se levanta de la paja de un solo movimiento, sin la torpeza que el resto del cuerpo prometía.'],
        combate: { accion: 'atacar', npcId: 'npc-pariente-abelardo', armaId: 'desarmado' },
        iniciaCombate: {
          npcIds: ['npc-pariente-abelardo'],
          reason: 'Se levanta de la paja de un solo movimiento, y no hay con quién hablar para evitar esto.',
          salidaPacifica: {
            npcId: 'npc-pariente-abelardo',
            pistaCalma: {
              description: 'Retrocedió hacia la paja sin que quede claro si entendió la amenaza o si simplemente perdió interés.',
              kind: 'experiential',
              source: 'el ala este del laberinto',
              reliability: 'reliable',
            },
            consecuenciaDisparo: {
              description: 'En el laberinto bajo la Casa de Díaz, el investigador le disparó a un pariente degenerado de la familia.',
              scope: 'campaign',
              permanent: true,
              worldReminder: 'Usó un arma de fuego contra algo que ya no podía defenderse con palabras, adentro de los túneles de la propia familia.',
            },
          },
        },
      };
    },
  },

  {
    id: 'laberinto-avanzar-oeste',
    prueba: () => ({
      skill: 'escuchar', difficulty: 'regular',
      reason: 'notar a lo que vive acá antes de que te note a vos',
      stakes_success: 'cruzás sin que note que pasaste',
      stakes_failure: 'te escucha antes de que termines de decidir si seguir',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: ['El canturreo no cambia de ritmo cuando pasás al lado: cruzás sin que el canturreo se corte ni una vez.'],
          pistas: [{
            description: 'En el ala oeste del laberinto, entre las marcas de uñas de la pared, hay una fecha rayada con algo filoso: el mismo año que el nicho vacío del mausoleo, escrito mucho antes de que ese nicho existiera.',
            kind: 'physical',
            source: 'el ala oeste del laberinto',
            reliability: 'reliable',
          }],
        };
      }
      return {
        texto: ['El canturreo se corta a la mitad de una nota, y lo que sigue no es silencio.'],
        combate: { accion: 'atacar', npcId: 'npc-pariente-felisa', armaId: 'desarmado' },
        iniciaCombate: {
          npcIds: ['npc-pariente-felisa'],
          reason: 'El canturreo se corta a la mitad de una nota, y no hay con quién hablar para evitar esto.',
          salidaPacifica: {
            npcId: 'npc-pariente-felisa',
            pistaCalma: {
              description: 'Volvió al rincón y retomó el canturreo exactamente donde lo había dejado, como si nada hubiera pasado.',
              kind: 'experiential',
              source: 'el ala oeste del laberinto',
              reliability: 'reliable',
            },
            consecuenciaDisparo: {
              description: 'En el laberinto bajo la Casa de Díaz, el investigador le disparó a un pariente degenerado de la familia.',
              scope: 'campaign',
              permanent: true,
              worldReminder: 'Usó un arma de fuego contra algo que ya no podía defenderse con palabras, adentro de los túneles de la propia familia.',
            },
          },
        },
      };
    },
  },

  // ══ DESENLACES ════════════════════════════════════════════════════════════

  {
    id: 'fin-cortar',
    resolver: () => ({
      traslada: { itemId: 'it-anillo-rubi', a: 'perdido', carried: false, cause: 'lo tira al horno del laboratorio antes de arrepentirse' },
      consecuencia: {
        description: 'El investigador le sacó el anillo a Bernardo Díaz y lo destruyó en el horno del laboratorio, cortando el ciclo sin saber si hacía falta que siguiera.',
        scope: 'world',
        permanent: true,
        worldReminder: 'El anillo de rubí ya no existe. Nadie sabe todavía qué significa eso para el pueblo, ni si significa algo.',
      },
      desenlace: {
        id: 'cortar', title: 'El vigésimo, vacío',
        text: [
          'El anillo pesa en la mano más de lo que un anillo debería pesar, y el horno del laboratorio sigue prendido, como si alguien lo mantuviera encendido justo para esto.',
          'Lo tirás adentro antes de terminar de pensarlo, porque pensarlo un segundo más era no hacerlo nunca.',
          'No pasa nada que se pueda describir. No hay grito, no hay luz, no hay temblor. El Ahijado deja de moverse en el brazo del sillón, despacio, como algo que se queda dormido de verdad por primera vez.',
          'El mausoleo va a tener veinte lugares y diecinueve momias, para siempre. El vigésimo va a seguir vacío.\n\nNo sabés si estaba bien que siguiera. Ahora no va a seguir, y esa es la única certeza que te llevás de la Casa de Díaz.',
        ],
      },
    }),
  },

  {
    id: 'fin-heredar',
    resolver: () => ({
      traslada: { itemId: 'it-anillo-rubi', a: 'investigador', carried: true, cause: 'se lo saca de la mano a Bernardo y se lo pone antes de que nadie pueda impedirlo' },
      anillo: {
        itemId: 'it-anillo-rubi',
        cause: 'ponerse el anillo de un hombre de trescientos años, en su propio laboratorio, con el cuerpo todavía tibio',
        removalLethal: true,
      },
      cordura: { amount: 8, cause: 'sentir que el anillo lo sostiene a uno igual que sostenía al anterior' },
      consecuencia: {
        description: 'El investigador se puso el anillo de rubí de Bernardo Díaz en el laboratorio de la Casa, y quedó vinculado a él.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Hay un vigésimo lugar en el mausoleo, y ahora tiene nombre. La cuenta de Castronegro sigue, con otra mano.',
      },
      desenlace: {
        id: 'heredar', title: 'El vigésimo, ocupado',
        text: [
          'Se lo sacás de la mano izquierda mientras todavía respira, porque después de muerto no vas a poder, y te lo ponés vos antes de terminar de decidir si es lo que querés hacer.',
          'No arde. No aprieta. Se acomoda, como si el dedo hubiera estado esperando ese anillo específico desde antes de que nacieras.',
          'Y ves, en el mismo segundo, algo que no le habías preguntado a nadie: una forma, del otro lado de algo que no es agua ni es espejo, que te estaba esperando con más paciencia de la que vos tuviste con Bernardo.\n\nNo dice su nombre. Vos tampoco le preguntás el tuyo.',
          'El Ahijado se acerca, despacio, y se enrosca en tu brazo exactamente como se enroscaba en el de Bernardo.\n\nEl mausoleo tiene veinte lugares. El vigésimo ya no está vacío, y ya no tiene la fecha en blanco: tiene la de hoy.',
        ],
      },
    }),
  },

  {
    id: 'fin-denunciar-vigesimo',
    resolver: () => ({
      consecuencia: {
        description: 'El investigador escapó de la Casa de Díaz sin el anillo, para llevar lo que sabe a un juzgado.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Hay una denuncia en algún lado sobre la Casa de Díaz, presentada por alguien que estuvo ahí adentro. Bernardo sigue vivo.',
      },
      desenlace: {
        id: 'denunciar', title: 'Lo que se saca de la casa',
        text: [
          'Salís de la Casa sin el anillo y sin mirar atrás, con lo que ya sabés pesando más que cualquier objeto que hubieras podido llevarte.',
          'Ya lo probaste una vez, con otra denuncia y otro juzgado: un papel bien hecho no es lo mismo que una respuesta. Lo hacés igual, porque la alternativa era no hacer nada, y no hacer nada ya lo hiciste demasiadas veces esta noche.',
          'Bernardo se va a quedar en su laboratorio, con el Ahijado, esperando la próxima visita que sepa llegar tan lejos.\n\nNo sabés cuánto tiempo va a pasar hasta esa próxima vez. Trescientos años, hasta ahora, no le enseñaron impaciencia.',
        ],
      },
    }),
  },

  {
    id: 'fin-irse-vigesimo',
    resolver: () => ({
      consecuencia: {
        description: 'El investigador salió de la Casa de Díaz sin el anillo y sin denunciar nada, la misma noche que se enfrentó a Bernardo.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Estuvo en la Casa, peleó, y se fue sin llevarse ni el anillo ni una decisión. Bernardo sigue exactamente donde estaba.',
      },
      desenlace: {
        id: 'irse-vigesimo', title: 'La quinta vez',
        text: [
          'Salís de la Casa por donde entraste, con la luz de la araña del vestíbulo todavía prendida a tus espaldas.',
          'Es la quinta vez que llegás hasta el punto exacto donde había que decidir algo, y elegís el camino de vuelta. Las cuatro anteriores tuviste una razón buena. Ésta también la tenés, y esta vez la razón es que ya peleaste, ya sangraste un poco o hiciste sangrar, y no te alcanzó para saber qué hacer con lo que quedó parado en el laboratorio.',
          'Castronegro va a seguir llamándose Castronegro. La Casa va a seguir en la loma. Y en algún momento, no esta noche, alguien va a tener que volver a subir.',
        ],
      },
    }),
  },
];
