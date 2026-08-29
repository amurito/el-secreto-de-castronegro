/**
 * LA LÓGICA DE LAS ESCENAS DE AGUA BLANCA — lo único que no puede ser dato.
 *
 * Séptimo Umbral, primer acto. Todo lo demás vive en
 * `agua-blanca.contenido.json`.
 *
 * Dos cosas propias de esta aventura:
 *
 *   1. Es la primera que se apoya en `arqueologia` y `geologia`, que se
 *      agregaron para ella (ROADMAP §3.2-quaterdecies). El monolito es
 *      anterior a Bernardo por canon (v0.7 §8) y hasta ahora no había con qué
 *      leerlo.
 *
 *   2. Es la primera que puede leer las SEIS anteriores. No es adorno: la
 *      aventura trata de un pueblo que lleva la cuenta de quién pregunta, y
 *      el investigador llega con seis aventuras de cuenta encima.
 *
 * Bernardo NO aparece acá. Su lugar es el segundo acto, y hasta la casa de la
 * loma no se sube: se termina sabiendo que hay que subir.
 */

import type { GameState } from '../shared/types.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';
import type { EfectoEscena } from './escena.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const consecuencia = (s: GameState, frag: string) =>
  s.consequences.some((c) => c.description.includes(frag));

// ══ ECOS DE LAS SEIS ANTERIORES ═════════════════════════════════════════════

/** Cuántas de las tres marcas del Círculo Rojo trae encima. Ver la cuarta. */
const marcasPrevias = (s: GameState) =>
  s.consequences.filter((c) => c.description.includes('del Círculo Rojo')).length;

/**
 * La Legua Perdida: caminó el alambrado del oeste de punta a punta y se trajo
 * la compulsión de contar. Acá vuelve sola, y acá tiene con qué: un círculo
 * que se puede medir.
 */
const caminoLaLinea = (s: GameState) =>
  consecuencia(s, 'caminó el alambrado del oeste de punta a punta');

/**
 * El Sueño Debido: se anotó en la quinta hoja en lugar de Aurelio. Es la
 * decisión que esta aventura vuelve a ofrecer, despierto, en el segundo acto.
 */
const seAnotoEnLaLista = (s: GameState) =>
  consecuencia(s, 'se anotó en la quinta hoja');

/** El Invierno Debido: cumplió el turno de 1926 y tuvo el almagre en la mano. */
const pintoElTurno = (s: GameState) => consecuencia(s, 'cumplió el turno de 1926');

/** La Legua Perdida: midió bien, firmó con testigos, y no le sirvió a nadie. */
const demostroYNoSirvio = (s: GameState) =>
  consecuencia(s, 'Se levantó un acta con la medición del lado oeste');

/** El Invierno Debido: se llevó el libro de turnos a un juzgado. */
const llevoElLibro = (s: GameState) => consecuencia(s, 'para llevarlo a un juzgado');

/**
 * Cuántas veces este investigador llegó hasta el final de una aventura y se
 * fue sin contestar nada. La quinta y la sexta ya llevaban esta cuenta; acá
 * es la última vez que se le puede ofrecer.
 */
const vecesQueSeFue = (s: GameState) =>
  s.consequences.filter((c) => c.description.startsWith('El investigador se fue de')).length;

export const AGUA_BLANCA_LOGICA: LogicaDeEscenas = [
  // ══ EL NOMBRE ═════════════════════════════════════════════════════════════

  {
    // El beat que le da nombre a la aventura. No pide tirada: rascar cal es
    // trabajo, no perspicacia, y el criterio de `rules/cuando-tirar.ts` dice
    // que se tira cuando fallar es interesante. Fallar acá no lo sería.
    id: 'leer-cartel',
    antes: () => ({
      texto: ['Buscás una piedra con filo y empezás por la esquina de abajo, que es donde la cal está más floja.'],
      tiempo: { minutes: 20, reason: 'rascar la cal del cartel' },
    }),
    resolver: ({ estado }) => ({
      texto: [
        'La cal salta en escamas y abajo hay pintura vieja, de otro color y de otra mano.\n\nSon dos palabras. La primera es corta y la segunda empieza con B, y cuando terminás de limpiar la segunda no hace falta limpiar la primera para saber cuál es.\n\nAGUA BLANCA.',
        'Alguien tapó el nombre de un pueblo con una mano de cal y le pintó otro encima. No lo raspó, no cambió la chapa: lo tapó. Y el que lo tapó sabía que la cal se cae, porque la cal siempre se cae, y lo tapó igual.',
        marcasPrevias(estado) > 0
          ? 'Y vos ya viste ese nombre antes, escrito una sola vez, en un asiento catastral que copió un arrendatario muerto. El escribiente que se lo explicó creía que hablaba de un mineral.'
          : 'El nombre no te dice nada. Es la clase de nombre que tuvieron mil parajes de la provincia antes de que alguien decidiera otra cosa.',
      ],
      pistas: [{
        description: 'El pueblo se llamó Agua Blanca. El nombre está debajo de una mano de cal en el cartel de la entrada, tapado y no borrado.',
        kind: 'physical',
        source: 'el cartel de la entrada',
        reliability: 'reliable',
      }],
      exposicion: { amount: 4, source: 'cartel:nombre', cause: 'el nombre que alguien tapó sin borrar' },
      // Alcance mundo y permanente: el segundo acto lo lee, y es cierto pase
      // quien pase por acá.
      consecuencia: {
        description: 'El investigador descubrió que Castronegro se llamó Agua Blanca, leyendo debajo de la cal del cartel de la entrada.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Sabe que el pueblo tuvo otro nombre y que alguien lo tapó con cal en vez de borrarlo.',
      },
      pregunta: '¿Por qué se cambia el nombre de un pueblo, y por qué se lo tapa en vez de rasparlo?',
    }),
  },

  // ══ LA LIBRETA DEL QUE VINO ANTES ═════════════════════════════════════════

  {
    id: 'leer-libreta',
    // Investigar, no Descubrir: no hay que notar la libreta —ya la tiene en la
    // mano— hay que seguir el hilo de la letra de otro a través de siete días.
    prueba: (s) => (s.items['it-libreta']?.discoveredProperties.length ?? 0) > 0 ? null : ({
      skill: 'buscar_libros', difficulty: 'regular',
      reason: 'seguir siete días de notas ajenas hasta lo que el que las escribió no llegó a ordenar',
      stakes_success: 'entendés qué había entendido él',
      stakes_failure: 'las notas de un profesor prolijo que se fue',
    }),
    resolver: ({ estado, tirada }) => {
      const efectos: EfectoEscena[] = [];
      // El documento va SIEMPRE. Es lo que apaga el botón, y la regla que este
      // proyecto ya aprendió dos veces por bug reportado: la puerta no puede
      // depender de acertar la tirada.
      efectos.push({
        texto: [
          'Son siete días de julio, y se lee de un tirón porque el hombre escribía bien.',
        ],
        documento: { id: 'doc-notas', how: 'leyendo la libreta que quedó en el estante de la yerba' },
        tiempo: { minutes: 30, reason: 'leer la libreta entera' },
      });

      if (!tirada?.exito) {
        efectos.push({
          texto: [
            'Y se termina. La última hoja escrita tiene cuatro renglones que son cuatro apellidos con un número al lado, y por más que los mirés no son edades, no son años y no son precios.\n\nAlguien que sabía leer una lista sacaría algo de ahí. Vos, hoy, no.',
          ],
        });
        return efectos;
      }

      efectos.push({
        descubre: {
          itemId: 'it-libreta', propertyId: 'p-libreta-ultima',
          how: 'siguiendo la letra de Ferrari hasta la última hoja escrita',
        },
      });
      efectos.push({
        texto: [
          'Cuatro apellidos, uno abajo del otro, con un número de dos cifras al lado de cada uno. En orden creciente. El más alto es el que va al lado de Díaz.\n\nNo son edades ni años. Son cuentas de personas: cuánta gente del pueblo lleva cada apellido. Ferrari contó el padrón, igual que se puede contar acá, y ordenó los cuatro de menor a mayor.\n\nY abajo, subrayado dos veces, la frase con la que se le terminó la libreta: «no es una familia, es un turno».',
        ],
        pistas: [{
          description: 'Ferrari contó los apellidos del padrón, los ordenó, y anotó debajo: «no es una familia, es un turno». Es la última línea que escribió antes de desaparecer.',
          kind: 'documentary',
          source: 'la libreta de Aníbal Ferrari',
          reliability: 'reliable',
        }],
        exposicion: { amount: 5, source: 'libreta:turno', cause: 'la palabra turno, escrita por alguien que después no volvió' },
        estabilidad: { amount: -6, cause: 'que el que vino antes hubiera llegado hasta acá' },
      });

      // El eco más caro de la campaña: quien jugó la cuarta y la quinta sabe
      // exactamente qué es un turno anotado en un libro, porque lo cumplió o
      // lo denunció. Va como nota de jugador y no como pista: el investigador
      // ya tiene la palabra, lo que no tiene es la cara que se le pone.
      if (pintoElTurno(estado) || llevoElLibro(estado) || seAnotoEnLaLista(estado)) {
        efectos.push({
          jugadorNota: {
            statement: 'Su investigador ya sabe qué es un turno anotado en un libro: cumplió uno, o se lo llevó a un juzgado, o escribió su propio apellido en un renglón fresco. La palabra que Ferrari subrayó dos veces antes de desaparecer es la palabra con la que su investigador viene trabajando hace dos años.',
            source: 'la libreta de Ferrari',
            reliability: 'reliable',
          },
        });
      }
      return efectos;
    },
  },

  // ══ LA SALA DEL FONDO ═════════════════════════════════════════════════════

  {
    id: 'abrir-salita',
    antes: () => ({
      texto: ['Prudencio abre, se hace a un lado y no entra. Se queda en el marco, con la llave todavía en la mano.'],
      tiempo: { minutes: 25, reason: 'revisar la sala del fondo' },
    }),
    resolver: () => ({
      texto: [
        'Es un cuarto de tres por tres, sin ventana, con diez cajones de madera apilados contra la pared del fondo y dos estantes armados con lo que había. Está seco y está frío, y no huele a humedad: huele a papel que nunca se mojó.',
        'Los libros son viejos de verdad. Latín, castellano del mil seiscientos, y tres que no están en ningún idioma que puedas nombrar. No los abrís: no porque tengas miedo, sino porque no sabrías qué estás mirando aunque los abrieras, y hay algo peor que no entender, que es creer que uno entendió.',
        'Lo que sí abrís es lo único moderno del cuarto: un libro de tapa dura, chico, apoyado arriba del primer cajón, con la palabra CONSULTAS escrita a mano en el lomo.\n\nTiene dieciocho años y dos renglones.\n\n«14 de julio de 1928 — A. Ferrari, La Plata.»\n«16 de julio de 1928 — H. Prewitt, Boston, Mass.»',
      ],
      pistas: [{
        description: 'La sala cerrada de la biblioteca guarda diez cajones de libros del siglo XVII y un registro de consultas con dos renglones en dieciocho años: Ferrari el 14 de julio y Prewitt el 16. Los dos desaparecieron esa misma semana.',
        kind: 'documentary',
        source: 'el registro de consultas de la salita',
        reliability: 'reliable',
      }],
      exposicion: { amount: 6, source: 'salita:consultas', cause: 'los dos únicos nombres del registro, y lo que les pasó después' },
      estabilidad: { amount: -8, cause: 'que consultar estos libros sea lo último que hicieron dos personas' },
      contradiccion: {
        description: 'Prudencio Herrera dice que la sala no se abre y que nadie consultó nunca los libros. El registro de consultas de esa sala tiene dos nombres, de julio de este año, y él los anotó de su puño y letra.',
        between: 'lo que dice el bibliotecario / lo que dice su propio registro',
      },
      pregunta: '¿Quién le pidió a Prudencio que llevara un registro de algo que, según él, nadie consulta?',
    }),
  },

  // ══ EL GRANERO ════════════════════════════════════════════════════════════

  {
    id: 'granero-craneos',
    prueba: (s) => pista(s, 'tres cráneos') ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'mirar el piso de tierra abajo de una mesa que está demasiado limpia',
      stakes_success: 'encontrás lo que la mesa no explica',
      stakes_failure: 'tierra pisada y paja',
    }),
    resolver: ({ estado, tirada }) => {
      if (pista(estado, 'tres cráneos')) {
        return { texto: ['Volvés a mirar la grieta y siguen estando los tres. Uno de ellos tiene un diente de oro.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [
            'Tierra apisonada, paja vieja, y las patas de la mesa hundidas cuatro dedos. Te agachás un rato largo y te levantás con las rodillas sucias y nada más.',
          ],
        };
      }
      return [
        {
          texto: [
            'Atrás de la pata del fondo, donde el pilar de ladrillo se separa de la tierra, hay una grieta de un palmo de ancho. Y adentro de la grieta, acomodados —acomodados, no tirados—, hay tres cráneos.',
            'No son viejos. Uno todavía tiene pelo pegado en la nuca. Otro tiene un diente de oro, de trabajo bueno, de los que no se hacen en la cabecera.\n\nY el tercero es de alguien joven: las suturas del hueso todavía no cerraron del todo, que es cosa de gente de menos de veinticinco.',
            'Tres. Como los tres del acta que dice «se ausentó del domicilio».',
          ],
          pistas: [{
            description: 'En una grieta del granero, acomodados y no tirados, hay tres cráneos recientes: uno con pelo, uno con un diente de oro de trabajo caro, y uno de alguien de menos de veinticinco años.',
            kind: 'physical',
            source: 'la grieta del granero',
            reliability: 'reliable',
          }],
          exposicion: { amount: 8, source: 'granero:craneos', cause: 'tres cráneos acomodados en una grieta' },
          estabilidad: { amount: -12, cause: 'que los tres que faltan estén a media legua del pueblo, adentro de un galpón sin candado' },
          cordura: {
            amount: 5,
            cause: 'los tres cráneos de la grieta del granero',
          },
          contradiccion: {
            description: 'La policía de la cabecera registró tres ausencias del domicilio. Los tres están en una grieta de un galpón que no tiene candado, a media legua del pueblo, y nadie fue a mirar.',
            between: 'el acta de la cabecera / la grieta del granero',
          },
        },
      ];
    },
  },

  // ══ MÁS ALLÁ DE LA GRIETA ═════════════════════════════════════════════════

  {
    // Único combate opcional de la aventura. No lo obliga nada: quien se
    // conforma con los tres cráneos nunca lo encuentra. Salida de palabra
    // incluida a propósito —Bernardo y el laberinto siguen sin aparecer acá;
    // esto es UN pariente suelto, no una confirmación de nada más grande.
    id: 'grieta-mas-alla',
    resolver: () => ({
      texto: [
        'La grieta sigue más allá de donde llegan los tres cráneos. Metés el brazo hasta el codo, tanteando, y por un segundo tocás algo que no es tierra ni piedra.',
        'Se mueve antes de que puedas sacar la mano. Sale de la grieta encorvado, más rápido de lo que un cuerpo así debería moverse, y te mira con unos ojos que ya viste esta mañana en la plaza.',
      ],
      combate: { accion: 'atacar', npcId: 'npc-cosa-grieta', armaId: 'desarmado' },
      iniciaCombate: {
        npcIds: ['npc-cosa-grieta'],
        reason: 'Algo salió de la grieta cuando metiste el brazo más allá de los tres cráneos.',
        salidaPacifica: {
          npcId: 'npc-cosa-grieta',
          pistaCalma: {
            description: 'Retrocedió despacio, sin correr, hasta perderse otra vez en la grieta. No te siguió.',
            kind: 'experiential',
            source: 'la grieta del granero',
            reliability: 'reliable',
          },
          consecuenciaDisparo: {
            description: 'En el granero de Castronegro, el investigador le disparó a algo que salió de la grieta, en vez de dejarlo volver adentro.',
            scope: 'world',
            permanent: true,
            worldReminder: 'Usó un arma de fuego contra algo que no llegó a identificar. No es lo mismo que espantarlo con las manos.',
          },
        },
      },
      exposicion: { amount: 6, source: 'grieta:algo', cause: 'tocar algo en la oscuridad que después tuvo cara' },
      consecuencia: {
        description: 'En el granero de Castronegro, el investigador se cruzó cuerpo a cuerpo con algo que salió de la grieta —encorvado, dientes largos, ojos verdes— y no se quedó a preguntar qué era.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Sabe, de primera mano y no de oídas, que hay algo vivo debajo de Castronegro además de la gente que se ve caminar.',
      },
    }),
  },

  // ══ EL MONOLITO ═══════════════════════════════════════════════════════════

  {
    id: 'fechar-monolito',
    // La primera tirada de Arqueología de toda la campaña. Se agregó para
    // esto: `historia` ubica un objeto en su época, y acá la época es el
    // problema.
    prueba: () => ({
      skill: 'arqueologia', difficulty: 'regular',
      reason: 'fechar una piedra trabajada y decir quiénes la trabajaron',
      stakes_success: 'sabés de cuándo es y con qué la hicieron',
      stakes_failure: 'una piedra parada en un campo',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'Le das la vuelta despacio, mirándole las caras. Está trabajada, eso es seguro: tiene planos, y los planos no se los hizo la lluvia.\n\nDe ahí no pasás. Podría tener doscientos años o dos mil, y no hay en esta piedra ni una inscripción, ni una herramienta olvidada, ni una tumba al lado que ayude a decidir.',
          ],
          tiempo: { minutes: 40, reason: 'examinar el monolito' },
        };
      }
      return {
        texto: [
          'Las caras están picadas, no cortadas. Quien las hizo golpeó la piedra con otra piedra, miles de veces, siguiendo una línea que llevaba en la cabeza: no hay marca de cincel, no hay marca de sierra, no hay una sola línea recta que se haya trazado antes de golpear.',
          'Eso ubica el trabajo antes del hierro. Y el desgaste de los bordes —redondeados parejo por todas las caras, incluida la que mira al sur, que es la que menos viento recibe— pide siglos de estar parado a la intemperie. Muchos.\n\nEsta piedra estaba acá antes de que nadie fundara nada. Es anterior a todo lo que este pueblo sabe de sí mismo, y es anterior a lo que sabían los que estaban antes que este pueblo.',
          'Y hay una última cosa, que es la que te hace apoyar la mano en la piedra y sacarla enseguida: está clavada derecha. A plomo. Alguien la levantó, la metió en un pozo y la calzó, y lo hizo con una precisión que cuesta conseguir hoy con nivel de burbuja.',
        ],
        pistas: [{
          description: 'El monolito está trabajado con herramienta de piedra —picado, no cortado— y desgastado por siglos de intemperie: es anterior a la fundación del pueblo y anterior a los pueblos que había antes. Está clavado a plomo.',
          kind: 'physical',
          source: 'el monolito',
          reliability: 'reliable',
        }],
        exposicion: { amount: 6, source: 'monolito:fechar', cause: 'saber cuántos siglos hace que está parado ahí' },
        tiempo: { minutes: 40, reason: 'examinar el monolito' },
        pregunta: '¿Qué estaban marcando, y cómo sabían dónde ponerlo?',
      };
    },
  },

  {
    // La segunda tirada de Arqueología de la campaña, y la que le da sentido
    // a la primera: el monolito está clavado en el campo y no se puede
    // llevar, pero esto entra en un bolsillo y sale del pueblo.
    id: 'fechar-estatuilla',
    prueba: (s) => (s.items['it-estatuilla']?.discoveredProperties.length ?? 0) > 0 ? null : ({
      skill: 'arqueologia', difficulty: 'regular',
      reason: 'leer las marcas de herramienta en una pieza de piedra del tamaño de una mano',
      stakes_success: 'sabés con qué la hicieron y en qué estado estuvo guardada',
      stakes_failure: 'un muñeco de piedra sin cara',
    }),
    resolver: ({ estado, tirada }) => {
      if ((estado.items['it-estatuilla']?.discoveredProperties.length ?? 0) > 0) {
        return { texto: ['La volvés a dar vuelta en la mano. Sigue sin tener una sola lasca.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [
            'Una figura de piedra gris, sin cara, con los brazos pegados al cuerpo. Está gastada de que la agarraran mucho. Más que eso no le sacás.',
          ],
        };
      }
      return [
        {
          descubre: {
            itemId: 'it-estatuilla', propertyId: 'p-estatuilla-fecha',
            how: 'mirando las marcas de herramienta a contraluz',
          },
        },
        {
          texto: [
            'El pulido no es de uso: es de fabricación. Y las marcas que quedaron abajo del pulido las dejó una herramienta de piedra, golpeando, no cortando. Es la misma manera de trabajar que el monolito, en chico.',
            'Y hay algo que no cierra, y que es peor que lo anterior: la pieza está entera. Sin una lasca, sin una veta abierta por el frío, sin el desgaste que le deja a la piedra pasar doscientos inviernos a la intemperie.\n\nUna cosa así, tirada entre la paja de un granero, tendría que estar rota. Lo que quiere decir que no estuvo tirada. Estuvo guardada, mucho tiempo, por gente que sabía cómo guardarla.',
          ],
          pistas: [{
            description: 'La estatuilla del granero está trabajada con herramienta de piedra, igual que el monolito, y está entera: no pasó siglos a la intemperie, pasó siglos guardada por alguien que sabía guardarla.',
            kind: 'physical',
            source: 'la estatuilla del granero',
            reliability: 'reliable',
          }],
          exposicion: { amount: 5, source: 'estatuilla:fechar', cause: 'una pieza de antes del hierro, entera, en un granero sin candado' },
          pregunta: '¿Quién la guardó todo ese tiempo, y por qué está ahora tirada entre la paja?',
        },
      ];
    },
  },

  {
    // La primera tirada de Geología de la campaña. En una llanura sin
    // canteras, «esto no es de acá» es media aventura: ver §3.2-quaterdecies.
    id: 'mirar-lasca',
    prueba: (s) => (s.items['it-lasca']?.discoveredProperties.length ?? 0) > 0 ? null : ({
      skill: 'geologia', difficulty: 'regular',
      reason: 'reconocer una roca y decir a qué distancia está su cantera',
      stakes_success: 'sabés de dónde salió, y cuán lejos queda eso',
      stakes_failure: 'una piedra oscura y pesada',
    }),
    resolver: ({ estado, tirada }) => {
      if ((estado.items['it-lasca']?.discoveredProperties.length ?? 0) > 0) {
        return { texto: ['La cara fresca sigue teniendo ese brillo apagado, y sigue pesando más de lo que uno calcula.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [
            'Oscura, casi negra, pesada. La raspás con el filo de una llave y no se raya. Es dura y no es de por acá, pero «no es de por acá» lo dirías de cualquier piedra en un partido donde no hay ninguna.',
          ],
        };
      }
      return [
        {
          descubre: {
            itemId: 'it-lasca', propertyId: 'p-lasca-origen',
            how: 'mirando la cara fresca y probándole la dureza',
          },
        },
        {
          texto: [
            'Es basalto. Sin lugar a dudas: la fractura, el peso, el brillo apagado de la cara fresca, la dureza.',
            'Y el basalto es roca de lava. Sale de donde hubo lava.\n\nAcá no hubo. Acá hay dos metros de tierra negra encima de arcilla, y abajo de la arcilla más arcilla, y así hasta donde llegó cualquier perforación que se haya hecho en el partido buscando agua. La sierra más cercana con basalto es Tandil, y Tandil está a ochenta leguas.',
            'Alguien trajo tres metros de piedra ochenta leguas, sin caminos y sin ruedas, y la clavó a plomo en un campo llano.\n\nY lo que te sienta mal no es que se pueda hacer. Se puede: se hizo en Egipto y se hizo en Stonehenge, y hay maneras. Lo que te sienta mal es que lo hicieran acá, donde no hay nada, para marcar un punto que desde afuera no se distingue de cualquier otro punto del campo.',
          ],
          pistas: [{
            description: 'El monolito es de basalto, y el basalto más cercano está en Tandil, a ochenta leguas. Alguien trajo tres metros de piedra esa distancia, sin caminos ni ruedas, para clavarla en un campo llano.',
            kind: 'physical',
            source: 'la lasca del monolito',
            reliability: 'reliable',
          }],
          exposicion: { amount: 7, source: 'lasca:origen', cause: 'ochenta leguas de piedra traída a un lugar que no se distingue de ningún otro' },
          estabilidad: { amount: -6, cause: 'el trabajo que costó poner esa piedra ahí' },
          pregunta: '¿Cómo supieron que el punto era éste, si desde afuera no se distingue de ningún otro?',
        },
      ];
    },
  },

  // ══ LOS DOS PAPELES ═══════════════════════════════════════════════════════

  {
    // La hoja se consigue preguntando por el libro, y NO pasando la tirada de
    // Psicología del tema `a-bautismos`. Es la regla que este proyecto ya
    // aprendió dos veces por bug reportado jugando: la puerta no puede
    // depender de acertar una tirada. Lo que cambia con el tema es qué le
    // cuesta a él darla, no si se puede conseguir.
    id: 'ver-bautismos',
    resolver: ({ estado }) => ({
      texto: [
        estado.narrative.some((n) => n.kind === 'keeper' && n.text.includes('no la mandé'))
          ? 'Ya no hace falta pedírselo. Va a la sacristía y vuelve con el libro abierto en la hoja, que está doblada en cuatro entre las páginas del veintiséis, escrita a máquina con una máquina a la que le falla la e.'
          : 'Le pedís ver el libro de bautismos y no pone ninguna objeción: se lo pide un profesional y él tiene ocho años de ganas de que alguien se lo pida.\n\nLo trae, lo apoya en el banco, y mientras lo abre se le cae una hoja doblada en cuatro de entre las páginas del veintiséis. Escrita a máquina, con una máquina a la que le falla la e. Se agacha a levantarla y se queda un segundo con ella en la mano antes de dársela.',
        '—Lléveselo —dice—. Yo ya la sé de memoria y no me sirve de nada saberla.',
      ],
      documento: { id: 'doc-bautismos', how: 'el padre Anselmo la sacó del libro de bautismos y la entregó sin que hubiera que insistir' },
      tiempo: { minutes: 10, reason: 'leer la hoja del cura' },
      pistas: [{
        description: 'En ocho años la parroquia registró once bautismos y ciento nueve defunciones, sobre seiscientos habitantes. Del Valle, con la mitad de gente, bautiza veinte por año.',
        kind: 'documentary',
        source: 'la cuenta del padre Anselmo',
        reliability: 'reliable',
      }],
      contradiccion: {
        description: 'El pueblo tiene seiscientos habitantes estables desde hace décadas, y en ocho años registró once bautismos y ciento nueve entierros. Con esos números el pueblo tendría que estar vaciándose, y no se vacía.',
        between: 'la población del padrón / los libros de la parroquia',
      },
    }),
  },

  {
    id: 'ver-recorte',
    resolver: () => ({
      texto: [
        'Prudencio no dice nada cuando abrís el último cajón. Es la única cosa de la biblioteca que no le importa que mires.',
        'Seis años de recortes del diario de la cabecera, prolijos, pegados en hojas de cuaderno con la fecha escrita al lado. El más reciente es de marzo.',
      ],
      documento: { id: 'doc-recorte', how: 'del último cajón del fichero, donde Prudencio guarda los recortes' },
      tiempo: { minutes: 15, reason: 'revisar la carpeta de recortes' },
      exposicion: { amount: 3, source: 'recorte:ganado', cause: 'seis años de lo mismo, siempre a menos de tres leguas' },
    }),
  },

  {
    id: 'medir-vuelta',
    antes: () => ({
      texto: ['Ponés el pie contra la base, elegís una marca de la piedra para saber dónde empezaste, y arrancás a caminar contando.'],
      tiempo: { minutes: 35, reason: 'medir el círculo a pasos' },
    }),
    resolver: ({ estado }) => {
      const cuenta = caminoLaLinea(estado);
      return {
        texto: [
          'Das la vuelta pegado a la piedra y te dan once pasos. La piedra tiene tres caras y pico de frente por cara, así que once está bien.',
          'Después medís el círculo de pasto enfermo, que es lo que viniste a medir. Del monolito al borde amarillo hay ocho pasos, en la dirección que elijas: ocho al norte, ocho al este, ocho al sur, ocho al oeste. Es un círculo, y es un círculo bien hecho.\n\nOcho pasos de radio son unos dieciséis de diámetro, y un círculo de dieciséis de diámetro tiene cincuenta pasos de vuelta. Cincuenta y poco.',
          'Caminás el borde amarillo pisando la línea, contando, con el cuidado de no cortar camino.\n\nTe dan cuarenta y cuatro.',
          'Lo hacés de nuevo, al revés. Cuarenta y cuatro.\n\nLos pasos no cierran. El radio es de acá y la vuelta es de otro lado, y las dos cosas están dibujadas en el mismo pasto, esta mañana, y las acabás de medir vos, con los mismos pies.',
          cuenta
            ? 'Y ya te pasó. Otro campo, otro año, una rueda de hierro en vez de dos pies, y el mismo resultado imposible medido dos veces con el mismo instrumento. La diferencia es que aquella vez tardaste una tarde en aceptarlo.\n\nEsta vez lo aceptaste a la segunda vuelta, y eso te asusta más que el número.'
            : '',
        ].filter(Boolean),
        pistas: [{
          description: 'El círculo de pasto enfermo alrededor del monolito mide ocho pasos de radio en cualquier dirección y cuarenta y cuatro de circunferencia, medido dos veces. Un círculo de ese radio tendría que medir cincuenta.',
          kind: 'experiential',
          source: 'medición propia, a pasos',
          reliability: 'reliable',
        }],
        exposicion: { amount: 9, source: 'monolito:medir', cause: 'un círculo cuyo borde y cuyo radio no son del mismo lugar' },
        estabilidad: { amount: -10, cause: 'medir dos veces y que las dos veces esté mal' },
        contradiccion: {
          description: 'El círculo del monolito tiene ocho pasos de radio y cuarenta y cuatro de vuelta. Con ese radio, la vuelta tendría que dar cincuenta.',
          between: 'el radio medido / la circunferencia medida',
        },
        ...(demostroYNoSirvio(estado)
          ? {
            jugadorNota: {
              statement: 'La vez anterior que su investigador midió algo así, lo midió tres veces, levantó un acta y la firmaron dos testigos. El acta era impecable y no le sirvió a nadie para nada. Acá no hay testigos ni acta: hay un hombre solo contando pasos en un campo.',
              source: 'el claro del monolito',
              reliability: 'reliable',
            },
          }
          : {}),
      };
    },
  },

  // ══ EL BAZAR DE HERMINIO ══════════════════════════════════════════════════

  {
    id: 'fechar-talla',
    prueba: (s) => (s.items['it-talla-verde']?.discoveredProperties.length ?? 0) > 0 ? null : ({
      skill: 'arqueologia', difficulty: 'regular',
      reason: 'reconocer la técnica de tallado de una figura que no debería estar en el mostrador de un pueblo así',
      stakes_success: 'sabés con qué herramienta se hizo y de qué tradición viene',
      stakes_failure: 'una figura verde sin cara reconocible',
    }),
    resolver: ({ estado, tirada }) => {
      if ((estado.items['it-talla-verde']?.discoveredProperties.length ?? 0) > 0) {
        return { texto: ['Le das otra vuelta a la cara de adelante. Sigue siendo la misma técnica, la misma piedra.'] };
      }
      if (!tirada?.exito) {
        return { texto: ['Piedra verde, pulida, con una cara sentada que no termina de ser humana. No le sacás más que eso.'] };
      }
      return [
        {
          descubre: { itemId: 'it-talla-verde', propertyId: 'p-talla-factura', how: 'mirando las marcas de herramienta de la cara tallada' },
        },
        {
          texto: [
            'La cara de adelante está picada, no cortada: la misma manera de trabajar la piedra que el monolito del sudoeste, golpe contra golpe, sin cincel.\n\nHerminio te mira mientras la mirás. No dice nada, pero deja de acomodar lo que estaba acomodando.',
            'Le das vuelta a la figura para ver si el reverso tiene la misma factura, y del otro lado hay algo que no termina de leerse como dibujo, y que preferirías, sin saber por qué, dejar de mirar antes de entenderlo del todo.',
          ],
          pistas: [{
            description: 'La talla verde del bazar de Herminio está trabajada con la misma técnica que el monolito —piedra contra piedra, sin cincel—, y el reverso tiene una marca que no termina de leerse como dibujo.',
            kind: 'physical',
            source: 'el bazar de Herminio',
            reliability: 'reliable',
          }],
          exposicion: { amount: 5, source: 'talla:factura', cause: 'un objeto de la misma mano que el monolito, en venta en un mostrador' },
          pregunta: '¿Cómo llegó al mostrador de un bazar algo hecho por la misma gente que clavó el monolito?',
        },
      ];
    },
  },

  {
    // El segundo y último otorgamiento de Mitos de la campaña —el primero
    // fue El Invierno Debido, §4.6—, con el mismo aviso explícito y sin
    // tirada que lo evite: la acción sólo se ofrece después de haber visto
    // el reverso (`talla-girar.visible` pide `p-talla-factura`), y el propio
    // texto de esa propiedad ya avisa que conviene no seguir mirando. El
    // jugador elige girarla igual.
    id: 'girar-talla',
    resolver: () => ({
      texto: [
        'Ya la viste una vez y ya sentiste las ganas de no seguir mirando. La das vuelta igual.',
        'El dibujo no es un dibujo: es una manera de tallar líneas que se juntan en un punto sin perspectiva, como si quien lo hizo hubiera visto ese punto desde un lugar donde las líneas se juntan de verdad.\n\nEntendés, mirándolo, que no es una representación de nada. Es una instrucción. Y entendés, sin querer entenderlo, para qué sirve esa instrucción y por qué el monolito está clavado exactamente donde está.',
        'Herminio te saca la figura de la mano, despacio, sin apuro. —Ya fue suficiente —dice, y no es una amenaza: es lo más parecido a amabilidad que le vas a escuchar en todo el pueblo.',
      ],
      mitos: { amount: 1, source: 'el reverso de la talla verde del bazar de Herminio, después de que la cara de adelante ya avisara que no valía la pena seguir mirando' },
      cordura: {
        amount: 3,
        cause: 'entender que el dibujo del reverso es una instrucción, no un adorno',
      },
      pista: {
        description: 'El reverso de la talla verde no es decorativo: es una instrucción de tallado que explica por qué el monolito está clavado exactamente donde está, no en otro punto del campo.',
        kind: 'physical',
        source: 'el reverso de la talla verde',
        reliability: 'reliable',
      },
    }),
  },

  {
    id: 'leer-cuaderno-tachado',
    prueba: (s) => (s.items['it-cuaderno-tachado']?.discoveredProperties.length ?? 0) > 0 ? null : ({
      skill: 'buscar_libros', difficulty: 'hard',
      reason: 'leer contra la luz lo que alguien tachó a propósito sin arrancar la hoja',
      stakes_success: 'ves la columna que la tachadura no llegó a esconder del todo',
      stakes_failure: 'gastos de campo, tachados, ilegibles',
    }),
    resolver: ({ estado, tirada }) => {
      if ((estado.items['it-cuaderno-tachado']?.discoveredProperties.length ?? 0) > 0) {
        return { texto: ['Ya sabés lo que dice debajo de la tachadura. Volver a mirarlo no cambia la columna.'] };
      }
      if (!tirada?.exito) {
        return { texto: ['Forraje, jornales, veterinario. Debajo de la raya no se distingue nada, por más que lo pongas contra la ventana.'] };
      }
      return [
        { descubre: { itemId: 'it-cuaderno-tachado', propertyId: 'p-cuaderno-columna', how: 'poniendo la hoja contra la luz de la vidriera' } },
        {
          texto: [
            'Contra la luz, debajo de la raya, aparece una columna que no es de gastos de campo: nombres de pila, sin apellido, con una fecha de nacimiento al lado y un espacio en blanco donde en las otras filas iría una fecha de defunción.\n\nEs la misma clase de cuenta que lleva el padre Anselmo en el libro de bautismos. Sólo que ésta la lleva alguien que no es cura, y que no la escribió para la parroquia.',
          ],
          pistas: [{
            description: 'El cuaderno de cuentas del bazar de Herminio tiene, tachada, una columna de nombres de pila con fecha de nacimiento y sin fecha de defunción: el mismo tipo de registro que el libro de bautismos de la parroquia, llevado por alguien que no es el cura.',
            kind: 'documentary',
            source: 'el cuaderno tachado del bazar',
            reliability: 'reliable',
          }],
          exposicion: { amount: 4, source: 'cuaderno:columna', cause: 'un segundo registro de nacimientos, llevado por alguien que no tenía por qué llevarlo' },
          contradiccion: {
            description: 'El padre Anselmo lleva la única cuenta de bautismos que debería existir en el pueblo. El bazar de Herminio tiene, tachada, una segunda cuenta de nacimientos, escrita por otra mano.',
            between: 'el registro de la parroquia / el cuaderno tachado del bazar',
          },
        },
      ];
    },
  },

  {
    // Sin tirada, porque la pérdida no depende de entender lo que se
    // escucha: pasa por el solo hecho de escucharlo, igual que la
    // convención real de este tipo de grabaciones. Un punto, automático.
    id: 'escuchar-cilindro',
    antes: () => ({
      texto: ['Herminio le da cuerda al fonógrafo sin que se lo pidas dos veces, como si estuviera esperando que alguien preguntara.'],
      tiempo: { minutes: 10, reason: 'escuchar el cilindro de cera' },
    }),
    resolver: () => ({
      texto: [
        'La aguja encuentra el surco y sale un canto. No tiene palabras que reconozcas de ningún idioma, y la voz que lo canta —si es una voz— no es una voz humana: no respira donde tendría que respirar, y sostiene notas más tiempo del que un pulmón sostiene nada.',
        'Dura menos de un minuto. Cuando termina, Herminio levanta la aguja sin que se lo pidas, y durante un segundo los dos se quedan mirando el cilindro en silencio, como si acabaran de hacer algo que no se puede deshacer poniendo la aguja al principio otra vez.',
      ],
      cordura: { amount: 1, cause: 'un canto que no lo canta nada con pulmones' },
      pista: {
        description: 'El cilindro de cera del bazar de Herminio contiene un canto en una lengua irreconocible, cantado por algo que no respira como algo que canta debería respirar.',
        kind: 'experiential',
        source: 'el fonógrafo del bazar',
        reliability: 'reliable',
      },
    }),
  },

  // ══ LA NOCHE EN LA FONDA ══════════════════════════════════════════════════

  {
    // Único hostigamiento nocturno de la aventura: opcional, no gatea ningún
    // desenlace, y suma como mucho una pista más al piso de `escribir`
    // (§3.2-septdecies ya lo sube a seis; esto no lo vuelve a bajar). Ata el
    // primer eje de los siete Umbrales —tiempo, observación, memoria— a un
    // objeto concreto del pueblo, en vez de dejarlo sólo en la prosa del
    // desaparecido: la Reciprocidad de v0.7 §2 ("quien mira puede ser mirado
    // desde el otro momento") tiene acá su único beat jugable de la 7a.
    id: 'noche-posada',
    antes: () => ({
      texto: ['Apagás la vela y te quedás mirando un techo de junco, que en la fonda no es de teja y por eso se oye distinto el viento.'],
      tiempo: { minutes: 180, reason: 'tratar de dormir en la fonda' },
    }),
    resolver: () => ({
      texto: [
        'No te dormís. A eso de la medianoche un sonido de agua te hace abrir los ojos: no es lluvia, es algo que cae adentro del aljibe una sola vez, como una piedra.',
        'Te asomás a la ventana. El patio está igual que a la tarde: tierra, el brocal de piedra, los caballos quietos.\n\nMenos el aljibe. La superficie está perfectamente inmóvil —sin una onda, y hace un minuto cayó algo ahí adentro— y refleja un cielo con más estrellas de las que hay esta noche sobre Castronegro.',
        'Te quedás mirando un momento de más, contra todo lo que te dice que dejes de mirar. Y entre esas estrellas que no son las de esta noche hay una forma, parada del otro lado del brocal.\n\nDel lado de acá el patio sigue vacío.',
        'La forma, en el agua, levanta una mano. Vos no levantaste la tuya.\n\nCerrás la ventana. Eso lo sabés seguro, y es lo único que sabés seguro el resto de la noche.',
      ],
      pistas: [{
        description: 'El aljibe de la fonda quedó perfectamente quieto justo después de que algo cayera adentro, y de noche reflejó un cielo con más estrellas de las que había, y una figura que levantaba la mano del lado de adentro del reflejo. Del lado de afuera no había nadie.',
        kind: 'experiential',
        source: 'la ventana de la fonda, pasada la medianoche',
        reliability: 'unknown',
      }],
      exposicion: { amount: 7, source: 'posada:aljibe', cause: 'un reflejo que no era ni el cielo de esta noche ni el de quien estaba mirando' },
      cordura: { amount: 4, cause: 'ver que algo, del otro lado del agua, devolvía un saludo que nadie de este lado hizo' },
      contradiccion: {
        description: 'El aljibe de la fonda quedó perfectamente inmóvil justo después de que algo cayera adentro, y reflejó un cielo distinto del real. Ningún aljibe hace ninguna de las dos cosas, y éste hizo las dos juntas.',
        between: 'lo que tendría que hacer un pozo de agua / lo que hizo éste',
      },
      pregunta: '¿Del otro lado de qué está mirando esa forma, si del lado de acá no hay nadie?',
    }),
  },

  // ══ DESENLACES ════════════════════════════════════════════════════════════

  {
    id: 'fin-subir',
    resolver: ({ estado }) => {
      const craneos = pista(estado, 'tres cráneos');
      return {
        consecuencia: {
          description: 'El investigador subió a la casa de la loma de Castronegro por su propia voluntad, la misma noche que llegó al pueblo.',
          scope: 'world',
          permanent: true,
          worldReminder: 'Subió solo, de noche, sabiendo lo poco que sabía, y nadie en el pueblo lo vio subir salvo el muchacho de la plaza.',
        },
        desenlace: {
          id: 'subir', title: 'Lo que hay que subir',
          text: [
            'Esperás a que oscurezca, y no porque convenga: porque no querés que te vean, y a las siete de la tarde en octubre todavía hay luz.',
            craneos
              ? 'Tenés tres cráneos en una grieta, a media legua, y un acta de la cabecera que dice que se ausentaron del domicilio. Con eso alcanza para ir a la policía y no alcanza para nada más, porque la policía ya estuvo, ya miró y ya escribió.'
              : 'No tenés casi nada. Tenés un nombre debajo de una mano de cal, una piedra que no es de acá, y un pueblo que no va a su propia iglesia. Con eso no se hace una denuncia.',
            'El camino sube en curva y está apisonado en dos huellas de rueda. No hay tranquera. No hay perro. No hay nadie que te pare, y eso —te lo dijo Sixto esta mañana y recién ahora lo entendés— es exactamente el problema.',
            'Arriba, la casa tiene doce ventanas y las doce están cerradas. Golpeás.',
            'Abre una mujer de sesenta años, con delantal, que no pregunta quién sos.',
            '—Pase —dice—. Lo estábamos esperando desde la mañana.',
          ],
        },
      };
    },
  },

  {
    id: 'fin-llamar',
    resolver: ({ estado }) => ({
      consecuencia: {
        description: 'El investigador fue a la cabecera a denunciar lo que vio en Castronegro, y no subió a la casa de la loma.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Hay una denuncia escrita en la comisaría de la cabecera sobre lo que hay en el granero de los Shephard, y el nombre del denunciante figura en ella.',
      },
      desenlace: {
        id: 'llamar', title: 'Lo que se denuncia',
        text: [
          'Salís a la cabecera con la última luz y llegás a la comisaría a las once de la noche.',
          'El comisario te atiende porque sos quien sos, te escucha veinte minutos sin interrumpir, y toma nota. Toma nota de verdad: escribe, pregunta fechas, te hace repetir lo del granero dos veces.',
          'Y cuando terminás te dice, con toda la buena fe del mundo, que mañana a primera hora manda un sargento.',
          demostroYNoSirvio(estado)
            ? 'Y vos ya sabés cómo sigue esto, porque ya lo hiciste una vez: levantaste un acta impecable, con dos testigos y tres mediciones, y no le sirvió a nadie para nada. Un papel bien hecho no es lo mismo que una respuesta.'
            : 'Y tiene razón en decirlo, y lo va a cumplir, y aun así te quedás con la sensación de haber entregado algo que no sabés si se puede recibir.',
          'El sargento va a llegar a Castronegro pasado el mediodía. Va a encontrar un galpón sin candado, con paja vieja y una mesa lavada, y una grieta atrás de un pilar de ladrillo.',
          'Lo que no sabés, y no vas a saber nunca, es si la grieta va a seguir teniendo algo adentro.',
        ],
      },
    }),
  },

  {
    id: 'fin-escribir',
    resolver: ({ estado }) => ({
      consecuencia: {
        description: 'El investigador le escribió a Delfina Arce todo lo que averiguó en Castronegro, para no ser el único que lo supiera, y no subió a la casa.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Delfina Arce tiene por escrito lo del cartel, lo del granero y lo del monolito, guardado en el cajón del escritorio de la escuela de Villa Requena.',
      },
      desenlace: {
        id: 'escribir', title: 'Lo que se le cuenta a otro',
        text: [
          'Escribís en el almacén, en una mesa que Faustino limpia dos veces sin que haga falta, y te lleva hasta las once de la noche.',
          'No adornás nada. Ponés el nombre debajo de la cal, la cuenta del padrón, los once bautismos en ocho años, la mesa lavada del granero y lo que hay en la grieta. Ponés las medidas del círculo con los dos números, el de la vuelta y el del radio, y aclarás que los medí yo, con mis pies, dos veces.',
          'Y al final ponés la frase de ella, que es la razón por la que estás escribiendo esto y no otra cosa:',
          '«No le pido que me lo explique. Le pido que lo mire, para que no sea yo sola la que lo sabe.»',
          'Ella te lo escribió en marzo, sobre un mapa con siete puntos, y vos le contestás en octubre desde adentro del último punto.',
          'La carta sale con la chata del correo a las siete de la mañana. Vos te quedás mirándola irse, y después mirás la loma, que tiene la casa, que tiene doce ventanas cerradas.',
          'Y no subís. Hoy no.',
        ],
      },
    }),
  },

  {
    id: 'fin-irse',
    resolver: ({ estado }) => {
      const veces = vecesQueSeFue(estado);
      return {
        consecuencia: {
          description: 'El investigador se fue de Castronegro sin subir a la casa y sin contarle a nadie lo que vio.',
          scope: 'world',
          permanent: true,
          worldReminder: 'Estuvo en el pueblo un día, vio lo que había para ver, y se volvió sin dejar nada escrito.',
        },
        desenlace: {
          id: 'irse', title: 'Lo que no se sigue',
          text: [
            'Volvés por la misma huella de dos surcos, con la última luz atrás.',
            'No es cobardía y lo sabés: es que hay un punto en que uno mira lo que tiene, mira lo que haría falta para seguir, y hace la resta. Vos hiciste la resta.',
            veces >= 3
              ? `Y es la cuarta vez. Los Álamos, La Perseverancia, Los Cardales, y ahora esto. Cuatro veces que su investigador llegó hasta el lugar donde había que decidir y eligió el camino de vuelta, y las cuatro veces tuvo una razón buena.`
              : veces >= 1
                ? 'Y no es la primera vez que hacés esta cuenta arriba de un sulky, volviendo de un lugar donde había algo que mirar.'
                : 'Es la primera vez que hacés esta cuenta, y no sabés todavía que la vas a repetir.',
            'A tres leguas, cuando el pueblo ya no se ve, te das cuenta de que hay una cosa que no miraste ni una vez en todo el día: la loma tiene la casa, y la casa tiene doce ventanas, y vos no levantaste la vista para ver si alguna se había abierto.',
            'No vas a volver a saber de Castronegro hasta que Castronegro sepa de vos.',
          ],
        },
      };
    },
  },
];
