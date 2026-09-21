/**
 * EL SANTO OFICIO DE CUYO — lógica de escenas.
 *
* ESTADO: en construcción. Escritos: el arranque compartido, el Acto I de las
 * dos ramas (Iglesia: interrogatorio, encierro, archivo, huerta; huarpe: barro,
 * altar, ofrenda, espionaje, ranchada, la rastrillería encima) y el desenlace
 * de la hoguera. Pendientes: el Acto II, el Acto III y los cuatro
 * desenlaces restantes (sus escenas existen sólo para que el contenido cargue;
 * dicen «PENDIENTE»). No está registrada en `catalogo.ts`. Ver
 * `docs/SANTO-OFICIO-DISENO.md`.
 *
 * Tres convenciones que estas escenas comparten y que conviene no romper:
 *
 *  · Los «marcadores»: las acciones aparecen o desaparecen según `narrado`, así
 *    que la PRIMERA frase de cada respuesta del interrogatorio es exactamente
 *    el texto que la acción siguiente busca. Cambiarla acá sin cambiar el JSON
 *    esconde los botones (el auditor de acciones no lo ve como error).
 *  · La sospecha la mueve cada escena con su propio `sospecha`; el ítem del kit
 *    no sabe nada de ella. Un mismo reloj cuesta 0 a solas y 20 delante de un
 *    Comisario.
 *  · Ninguna tirada de acá gatea información: el éxito profundiza, el fallo
 *    igual entrega el dato básico (ver «No gatea nada» en `ROADMAP.md`).
 */

import type { GameState } from '../shared/types.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';

const sospechaDe = (s: GameState) =>
  s.investigators[s.activeInvestigator]?.derived.sospecha ?? 0;

const hayConsecuencia = (s: GameState, frag: string) =>
  s.consequences.some((c) => c.description.includes(frag));

const llevaEncima = (s: GameState, itemId: string) =>
  s.items[itemId]?.owner === s.activeInvestigator;

const actitudDeIgnacio = (s: GameState) =>
  s.npcs['npc-ignacio']?.attitude?.[s.activeInvestigator] ?? 0;

/** El kit de 1930 que hay encima, para las escenas que lo esconden o lo muestran. */
const KIT = ['it-encendedor-1930', 'it-reloj-pulsera', 'it-linterna-1930'];
const cosasDe1930 = (s: GameState) => KIT.filter((k) => llevaEncima(s, k));

/**
 * Cómo termina el interrogatorio. Lo decide la sospecha que queda DESPUÉS de
 * la última respuesta: 60 o más es «Acusado» (ver el esqueleto) y el Comisario
 * no lo suelta.
 */
function cierreDelInterrogatorio(s: GameState, delta: number) {
  const final = sospechaDe(s) + delta;
  if (final >= 60) {
    return {
      texto: [
        'La interrogación termina cuando el Comisario lo decide, no cuando uno termina de hablar. Cierra el libro con un dedo y le habla a un hermano que estaba de pie junto a la escalera, sin mirarlo:\n\n—Que se quede. Con la puerta cerrada, y que no le falte agua.',
        'Los pasos suben. La reja de arriba se cierra con un ruido de hierro viejo. La vela queda encendida, y no hay ninguna otra luz.',
      ],
      consecuencia: {
        description: 'En 1710, el Comisario Albornoz dejó al investigador encerrado en la cripta de Santo Domingo; el investigador quedó encerrado en la cripta a la espera de que alguien intervenga o de encontrar otra salida.',
        scope: 'scene' as const, permanent: false, worldReminder: '',
      },
    };
  }
  return {
    texto: [
      'La interrogación termina sin sentencia. El Comisario se queda un rato mirando lo que hay sobre la mesa, y después lo guarda todo en un pañuelo de lino, salvo lo que le devuelve, uno por uno, como quien presta.\n\n—Puede subir. La hospedería es cómoda y las paredes tienen oídos, pero no más que las de cualquier convento. No salga de la villa sin avisarme. No por miedo: por comodidad.',
    ],
    consecuencia: {
      description: 'En 1710, el Comisario Albornoz dejó al investigador en libertad vigilada en Santo Domingo: puede circular por el convento y la villa, pero no puede salir de ella.',
      scope: 'scene' as const, permanent: false, worldReminder: '',
    },
  };
}

export const EL_SANTO_OFICIO_DE_CUYO_LOGICA: LogicaDeEscenas = [
  // ─────────────────────────── ARRANQUE COMPARTIDO ───────────────────────────
  {
    id: 'alba',
    resolver: ({ estado }) => {
      const huarpe = hayConsecuencia(estado, 'se alió con Takillpa y los guardianes huarpes');
      if (huarpe) {
        return {
          texto: [
            'Se incorpora despacio, con la ropa rígida de barro seco. Antes de que le dé tiempo a mirar nada, Takillpa lo agarra del codo y lo baja otra vez detrás del talud.\n\n—Todavía no. Los perros ya pasaron el puente. Van a tardar un rato en entender que el rastro se acabó acá.',
            'A menos de un kilómetro, entre los juncos, se ven dos faroles de la rastrillería que se mueven en zigzag. No gritan. Es peor: no gritan.',
          ],
          sospecha: { amount: 20, cause: 'el Cabildo ya lo declaró prófugo y la rastrillería sigue el rastro hasta el zanjón' },
          npc: { id: 'npc-takillpa', present: true, attitudeDelta: 15, cause: 'lo sacó del zanjón antes de que llegaran los faroles' },
          consecuencia: {
            description: 'En 1710, el investigador arrancó el día en el zanjón del lado de los huarpes, con la rastrillería del Cabildo sobre el rastro.',
            scope: 'scene', permanent: false, worldReminder: '',
          },
        };
      }
      return {
        texto: [
          'Se incorpora despacio, con la ropa rígida de barro seco. Fray Ignacio está sentado en el borde del talud, con las manos sobre las rodillas, como quien espera que lo llamen a declarar.\n\n—Se hizo lo que había que hacer —dice, sin mirarlo—. Ahora hay que ver a quién le importa.',
          'Habla bajo. Cada tanto mira hacia el camino de la villa, donde a esta hora todavía no hay nadie, pero donde va a haber alguien pronto.',
          'En la villa, cuenta después, llegó anoche un Comisario del Santo Oficio. No le avisaron. No pidió alojamiento en la casa del Cabildo, sino en Santo Domingo.',
        ],
        sospecha: { amount: 35, cause: 'firmó las actas del Cabildo delante de testigos con ropa y letra que nadie de este siglo supo nombrar' },
        npc: { id: 'npc-ignacio', present: true, attitudeDelta: 15, cause: 'compartieron la noche y el secreto' },
        consecuencia: {
          description: 'En 1710, el investigador arrancó el día en el zanjón del lado de la Iglesia, con Fray Ignacio y un Comisario del Santo Oficio recién llegado a la villa.',
          scope: 'scene', permanent: false, worldReminder: '',
        },
      };
    },
  },

  // ───────────────────────────── RAMA IGLESIA ─────────────────────────────
  {
    id: 'comitiva',
    prueba: (s) => {
      const cosas = cosasDe1930(s);
      if (!cosas.length) return null;
      return {
        skill: 'sigilo', difficulty: 'regular',
        reason: 'ocultar en la ropa lo que trae de 1930 antes de que la comitiva se acerque',
        stakes_success: 'los soldados ven a un forastero mal vestido, y nada más',
        stakes_failure: 'uno de los soldados ve, o escucha, algo que no debería existir',
      };
    },
    resolver: ({ tirada, estado }) => {
      const cosas = cosasDe1930(estado);
      const base = [
        'Un jinete de sotana negra viene al paso por el camino, con dos soldados de a pie detrás y un mulero con dos baúles. No apura el caballo. No mira a los costados. Mira, a lo largo de toda la legua, exactamente hacia donde están ellos.',
        'Los soldados los flanquean sin decir nada. El jinete se detiene a tres pasos, se toca el ala del sombrero y no se presenta.',
      ];
      if (!cosas.length) return { texto: [...base, '—Puede caminar con nosotros hasta la villa. Es más corto, y más seguro. Nadie le va a pedir que hable antes de tiempo.'] };
      if (tirada?.exito) {
        return {
          texto: [...base, 'Alcanzó a acomodarse la ropa antes de que el soldado más cercano le mirara los bolsillos. Nada asoma. Nada suena. El soldado lo mira un momento de más, y decide que los forasteros mal vestidos no son asunto suyo.'],
        };
      }
      return {
        texto: [...base, 'Algo en el bolsillo hace un ruido que no es de este siglo: un tic parejo, metálico, sin cuerda, que no se detiene. El soldado más cercano baja la vista, después la sube. No dice nada. Le avisa al jinete con los ojos.'],
        sospecha: { amount: 20, cause: 'un soldado de la comitiva oyó un mecanismo que no debería sonar' },
      };
    },
  },

  {
    id: 'cripta-entrada',
    resolver: () => ({
      texto: [
        'El Comisario no se levanta. Está sentado del lado de la silla con respaldo, con las manos juntas sobre la mesa, y sobre la mesa está todo lo que traía en los bolsillos, en fila, como piezas de un expediente.',
        '—Siéntese. Puede haber tres preguntas o una sola, según lo que conteste. No le pido que jure: le pido que sea breve. Un hombre que miente largo se equivoca más.',
        'Junto a su mano hay un libro apaisado de tapa negra, abierto, con una cinta roja de marcador.',
      ],
    }),
  },

  {
    id: 'mirar-libro-cuentas',
    prueba: () => ({
      skill: 'descubrir', difficulty: 'hard',
      reason: 'leer, sin que se note, lo que dice el libro del Comisario mientras él mira otra cosa',
      stakes_success: 'ves de qué son las columnas y qué signo hay al pie',
      stakes_failure: 'ves que son columnas y no distingues de qué',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: ['Columnas apretadas, letra pequeña, cifras. Nada que lo diga en voz alta. El Comisario levanta la vista un segundo antes de que termine de mirar, y cierra el libro con una mano sin apuro.'],
          pistas: [{ description: 'El libro del Comisario Albornoz es de columnas y cifras, y él lo cierra apenas alguien lo mira.', kind: 'experiential', source: 'la cripta de Santo Domingo', reliability: 'reliable' }],
        };
      }
      return {
        texto: [
          'No son dineros. Son nombres de conventos —Mendoza, San Luis, Santiago, La Serena, Córdoba— y al lado de cada uno una fecha y un tilde o una cruz. Al pie de cada columna hay el mismo signo: un círculo pintado en almagre, tachado con una raya.',
          'El de San Juan está a medio llenar. La cruz de al lado todavía no tiene fecha.',
        ],
        pistas: [{ description: 'El libro de cuentas del Comisario lista conventos de todo Cuyo y Chile con un tilde o una cruz y un mismo signo: un círculo de almagre tachado con una raya. La entrada de San Juan está a medio llenar.', kind: 'documentary', source: 'la cripta de Santo Domingo', reliability: 'reliable' }],
        descubre: { itemId: 'it-libro-cuentas', propertyId: 'p-libro-capitulos', how: 'leyéndolo de reojo mientras el Comisario miraba otra cosa' },
        exposicion: { amount: 3, source: 'santooficio:libro', cause: 'reconocer en un libro de cuentas el mismo signo que se acaba de pintar en el zanjón' },
      };
    },
  },

  // Pregunta 1: el reloj.
  {
    id: 'q1-flandes',
    prueba: () => ({
      skill: 'persuasion', difficulty: 'regular',
      reason: 'que el Comisario acepte una explicación plausible para un mecanismo que no lo es',
      stakes_success: 'acepta que es una pieza de relojería de algún taller de Flandes',
      stakes_failure: 've que la explicación se apoya en nada',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: ['Una curiosidad de los orfebres de Flandes, dice, y lo dice con la cadencia de quien lo repitió muchas veces. El Comisario levanta el reloj con un paño de lino, lo acerca a la vela y lo mira funcionar.\n\n—Flandes —repite. Y no pregunta nada más. Lo deja sobre la mesa con un cuidado que no es de quien acepta, sino de quien anota.'],
        };
      }
      return {
        texto: ['Una curiosidad de los orfebres de Flandes, dice. El Comisario asiente, con una paciencia que le quita la fuerza a la frase.\n\n—Los orfebres de Flandes trabajan con resortes y con péndulos, y este aparato no tiene ninguno de los dos que yo pueda ver. Vuelva a intentar, y esta vez piense antes.'],
        sospecha: { amount: 15, cause: 'el Comisario no creyó la historia de los orfebres de Flandes' },
      };
    },
  },
  {
    id: 'q1-franco',
    resolver: () => ({
      texto: [
        'Del reloj sale una explicación entera, con la respiración pesada de quien decide no volver a mentir: un resorte enrollado, una rueda que lo suelta de a poco, un fleje que marca el compás. Lo dice con palabras de otro siglo y el Comisario no lo interrumpe.',
        'Cuando termina, no hay reproche en la cara del Comisario. Hay algo peor: atención. Anota, con una letra pequeña, sin dejar de mirarlo.\n\n—Gracias. No lo entendí todo, pero lo entendí lo suficiente.',
      ],
      sospecha: { amount: 20, cause: 'explicó un mecanismo que en 1710 no existe, con palabras que nadie de esta época usa' },
      pistas: [{ description: 'El investigador le explicó al Comisario Albornoz cómo funciona un reloj de pulsera, y el Comisario lo anotó sin escandalizarse.', kind: 'testimonial', source: 'la cripta de Santo Domingo', reliability: 'reliable' }],
      npc: { id: 'npc-albornoz', attitudeDelta: 2, cause: 'valoró que le contara la verdad' },
    }),
  },

  // Pregunta 2: cómo sabía la hora.
  {
    id: 'q2-signos',
    prueba: () => ({
      skill: 'historia', difficulty: 'hard',
      reason: 'citar bien los prodigios que registran las crónicas, en el orden en que un comisario los esperaría',
      stakes_success: 'el Comisario reconoce los precedentes y no insiste',
      stakes_failure: 'el Comisario reconoce que la cita está hueca',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: ['Los signos del tiempo y de la tierra, dice, y enumera lo que un hombre educado enumeraría: el viento Zonda que se adelanta, las acequias que cambian de nivel, el vuelo bajo de las aves antes de un temblor. Cita a un cronista de Chile que el Comisario reconoce.\n\n—No es teología —dice el Comisario—, pero es una lectura que un hombre serio puede hacer. La dejamos ahí.'],
        };
      }
      return {
        texto: ['Los signos del tiempo y de la tierra, dice, y se le traba la enumeración en el tercer ejemplo. El Comisario espera, sin ayudarlo.\n\n—Sabe usted lo que ha dicho, o sabe lo que le convenía decir. Es distinto, y las dos cosas quedan anotadas.'],
        sospecha: { amount: 15, cause: 'la cita de los signos del cielo no aguantó una segunda pregunta' },
      };
    },
  },
  {
    id: 'q2-nativos',
    resolver: () => ({
      texto: [
        'Se lo enseñaron los indios, dice. No dice cuáles. No dice dónde. Lo dice con una calma que no siente, y es lo bastante cierto como para no sonar a mentira.',
        'El Comisario se queda quieto. Después, con un cuidado casi amable:\n\n—Ah. Eso es más interesante que cualquier otra respuesta. Me va a hacer falta saber cuáles indios, y si están en la villa o en las lagunas. No hoy.',
      ],
      sospecha: { amount: 10, cause: 'admitió delante del Comisario que trató con los indios de las lagunas' },
      consecuencia: {
        description: 'En 1710, el investigador le dijo al Comisario Albornoz que aprendió lo que sabe de los indios de las lagunas de Guanacache.',
        scope: 'campaign', permanent: true,
        worldReminder: 'Le dijo al Comisario que trató con los huarpes de las lagunas.',
      },
    }),
  },

  // Pregunta 3: qué hay bajo el zanjón.
  {
    id: 'q3-agua',
    prueba: () => ({
      skill: 'psicologia', difficulty: 'hard',
      reason: 'sostener que no hay nada mientras se lee si el Comisario ya lo sabe',
      stakes_success: 'lo convencés de que no sabés más de lo que dijiste, y ves que él sabe más de lo que pregunta',
      stakes_failure: 'no lo convencés, y no ves qué sabe',
    }),
    resolver: ({ tirada, estado }) => {
      const cierre = cierreDelInterrogatorio(estado, tirada?.exito ? 0 : 15);
      if (tirada?.exito) {
        return [
          {
            texto: ['Nada más que agua vieja, dice: un cauce que se cerró, tierra que se movió. El Comisario le sostiene la mirada. Y por primera vez el investigador ve algo en esa mirada que no es del oficio: un cansancio de haber oído esa respuesta muchas veces, en muchos conventos.'],
            pistas: [{ description: 'El Comisario Albornoz no parece sorprendido por que haya «nada más que agua vieja» bajo el zanjón: ya escuchó esa respuesta en otros lados.', kind: 'experiential', source: 'la cripta de Santo Domingo', reliability: 'unreliable' }],
          },
          { texto: cierre.texto, consecuencia: cierre.consecuencia },
        ];
      }
      return [
        {
          texto: ['Nada más que agua vieja, dice. El Comisario deja pasar un tiempo, como si le diera oportunidad de arrepentirse.\n\n—Es una respuesta que ya oí. Nunca en boca de alguien que la haya creído.'],
          sospecha: { amount: 15, cause: 'el Comisario no creyó que no hubiera nada más bajo el zanjón' },
        },
        { texto: cierre.texto, consecuencia: cierre.consecuencia },
      ];
    },
  },
  {
    id: 'q3-frontera',
    resolver: ({ estado }) => {
      const cierre = cierreDelInterrogatorio(estado, 10);
      return [
        {
          texto: ['Es una frontera, dice: hay un límite bajo el zanjón, y ayer estaba abierto. No le dice más, pero tampoco lo niega. El Comisario baja la pluma y, por una sola vez, le sonríe.\n\n—Es lo que esperaba que dijera. Gracias por no mentir.'],
          sospecha: { amount: 10, cause: 'le dijo al Comisario que hay un límite bajo el zanjón' },
          pistas: [{ description: 'El investigador le dijo al Comisario Albornoz que hay un límite bajo el zanjón.', kind: 'testimonial', source: 'la cripta de Santo Domingo', reliability: 'reliable' }],
          npc: { id: 'npc-albornoz', attitudeDelta: 2, cause: 'valoró que le dijera la verdad' },
        },
        { texto: cierre.texto, consecuencia: cierre.consecuencia },
      ];
    },
  },

  // Encerrado en la cripta.
  {
    id: 'esperar-ignacio',
    resolver: ({ estado }) => {
      if (actitudDeIgnacio(estado) >= 20) {
        return {
          texto: [
            'Pasa una noche. Al alba, la reja se abre y baja Fray Ignacio con una vela y una jarra de agua. No habla hasta cerrar la puerta detrás de sí.\n\n—Hablé con el prior. Hablé con el alcalde. Dije que usted era un testigo de lo del zanjón y que lo necesito entero para el legajo del Cabildo. No sé si me creyeron, pero le pesa más al Comisario romper un legajo que una promesa.',
            'Lo saca por la escalera con el paso apurado de quien no quiere que lo vean caminar.',
          ],
          sospecha: { amount: -15, cause: 'Fray Ignacio intercedió ante el prior y el alcalde' },
          consecuencia: {
            description: 'En 1710, Fray Ignacio de la Cruz intercedió ante el prior Anselmo y el alcalde para que el investigador saliera de la cripta: el investigador salió de la cripta por intervención de Ignacio.',
            scope: 'scene', permanent: false, worldReminder: '',
          },
        };
      }
      return {
        texto: [
          'Pasa una noche entera. Nadie baja. Cuando la reja por fin se abre, no es Fray Ignacio: es el prior Anselmo, con un hermano de cada lado y la cara de haber discutido toda la madrugada.\n\n—Salga. El Comisario tiene cosas que hacer en otro lado, y no le conviene tenerlo a usted de testigo de que no las hace. No me agradezca. Y no vuelva a bajar.',
        ],
        consecuencia: {
          description: 'En 1710, el prior Anselmo sacó al investigador de la cripta después de una noche sin que nadie interviniera por él: el investigador salió de la cripta por gestión del prior.',
          scope: 'scene', permanent: false, worldReminder: '',
        },
      };
    },
  },
  {
    id: 'forzar-ventilacion',
    prueba: (s) => {
      const luz = llevaEncima(s, 'it-encendedor-1930');
      return {
        skill: 'trepar', difficulty: 'hard',
        reason: 'subir por un tiro de piedra de un hombre de ancho, a oscuras',
        stakes_success: 'llegás a la rejilla suelta de la huerta y la sacás',
        stakes_failure: 'te quedás trabado a mitad de camino y hacés ruido',
        ...(luz ? { bonus_dice: 1, modifier_reason: 'la llama del encendedor deja ver las hendiduras de la piedra' } : {}),
      };
    },
    resolver: ({ tirada, estado }) => {
      const conLuz = llevaEncima(estado, 'it-encendedor-1930');
      if (tirada?.exito) {
        return {
          texto: [
            conLuz
              ? 'Con la llama del encendedor entre los dientes, encuentra las hendiduras que otros fueron dejando en la piedra. Es un tiro de un ancho de hombre: se sube de costado, con las rodillas y los codos. La rejilla de arriba está floja de un lado, como si alguien la hubiera aflojado y dejado así.'
              : 'A oscuras, sube por el tiro de piedra de un ancho de hombre, a tanteo, con las rodillas y los codos. La rejilla de arriba cede de un lado, como si alguien la hubiera aflojado y dejado así.',
            'Sale a la huerta entre las parras con las manos raspadas y la ropa sucia de sal. Un hermano que riega lo ve. No grita. Baja la vista y sigue regando.',
          ],
          sospecha: { amount: 15, cause: 'se fugó de la cripta del Comisario por el tiro de ventilación' },
          consecuencia: {
            description: 'En 1710, el investigador escapó por el tiro de ventilación y salió de la cripta sin permiso del Comisario: es un fugitivo dentro del propio convento.',
            scope: 'scene', permanent: false, worldReminder: '',
          },
        };
      }
      return {
        texto: [
          'A mitad de camino el tiro se estrecha más de lo que parecía. Se queda trabado, con un brazo arriba y otro abajo, y el ruido de la ropa raspando la piedra baja por el hueco como un aviso.',
          'Arriba se oyen pasos. Una reja se abre. Lo bajan tirándole de los pies, con menos ceremonia que la primera vez, y esta vez el Comisario ni siquiera está presente para verlo.',
        ],
        sospecha: { amount: 25, cause: 'lo sorprendieron intentando fugarse de la cripta' },
      };
    },
  },

  // Archivo.
  {
    id: 'leer-legajo',
    prueba: () => ({
      skill: 'biblioteca', difficulty: 'regular',
      reason: 'leer un latín de sacristía con letra de 1562 sin perder el hilo',
      stakes_success: 'seguís el legajo completo, con la anotación al margen',
      stakes_failure: 'leés lo que se entiende y te perdés lo demás',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: [
            'El legajo cuenta la fundación en la voz seca de los escribanos: lotes, encomiendas, acequias. Pero en el margen de una página del año 1580, de mano de un hermano de esta casa, hay una línea más:\n\n«Cuando el agua se suelta de golpe, la tierra se abre por donde estaba cerrada.»',
            'La hoja que sigue no está. Fue arrancada al ras.',
          ],
          documento: { id: 'doc-legajo-fundacion', how: 'el prior le dejó leerlo a escondidas' },
          pistas: [{ description: 'Un fraile de Santo Domingo anotó en el legajo de la fundación que «cuando el agua se suelta de golpe, la tierra se abre por donde estaba cerrada»; la hoja siguiente fue arrancada al ras.', kind: 'documentary', source: 'el archivo de Santo Domingo', reliability: 'reliable' }],
        };
      }
      return {
        texto: [
          'El legajo cuenta la fundación en la voz seca de los escribanos: lotes, encomiendas, acequias, un aviso de un indio de Guanacache que nadie atendió. Se pierde en la letra apretada de un margen, sin llegar a leerlo del todo.',
          'Hay una hoja que falta. No hace falta leer latín para ver el borde: alguien la arrancó.',
        ],
        documento: { id: 'doc-legajo-fundacion', how: 'el prior le dejó leerlo a escondidas' },
      };
    },
  },
  {
    id: 'notar-borrado',
    prueba: () => ({
      skill: 'ocultismo', difficulty: 'hard',
      reason: 'entender qué hay de raro en el borde de una hoja arrancada hace sesenta años',
      stakes_success: 'entendés qué se estaba escribiendo cuando alguien decidió que no debía leerse',
      stakes_failure: 'notás lo básico: que la hoja fue arrancada con cuidado',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: ['Al ras, con una hoja de afeitar o un cuchillo fino: nadie arranca así por descuido. La hoja que falta era una hoja que alguien no quería que otro leyera, y no la rompió: la sacó como se saca un diente.'],
          pistas: [{ description: 'La hoja que falta del legajo de la fundación fue cortada con cuidado con una hoja fina, no arrancada por descuido.', kind: 'experiential', source: 'el archivo de Santo Domingo', reliability: 'reliable' }],
        };
      }
      return {
        texto: [
          'Al ras, con una hoja de afeitar o un cuchillo fino. Pero lo que llama la atención no es el corte: es la sombra de tinta que quedó en la hoja de atrás, al trasluz. Es el borde de una palabra, de un dibujo, de una cuenta.',
          'Es una cuenta. Anotaba cuánta presión soportaba la tierra de ese paraje, y cuántas veces por siglo se descargaba. La hoja no advertía de un peligro: llevaba la contabilidad de uno que no se iba, sólo se juntaba.',
        ],
        pistas: [{ description: 'La hoja arrancada del legajo llevaba una cuenta de cuánta presión acumula la tierra de este paraje y cuántas veces por siglo se descarga: el sello no elimina la presión, la junta.', kind: 'experiential', source: 'el archivo de Santo Domingo', reliability: 'reliable' }],
        exposicion: { amount: 3, source: 'santooficio:hoja', cause: 'entender que lo cerrado no desaparece sino que se acumula' },
      };
    },
  },

  // Huerta: primer momento con Ignacio.
  {
    id: 'mostrar-reloj-ignacio',
    resolver: () => ({
      texto: [
        'Ignacio no aparta la vista del reloj. Lo sostiene con las dos manos, como si fuera una cosa viva, y lo acerca al oído. Escucha un rato largo.\n\n—Cuando usted llegó, le creí porque tenía que creerle. Ahora le creo porque suena. Es distinto.',
        'Se lo devuelve con cuidado. Algo cambió: ya no habla como quien lo vigila, sino como quien comparte un peso.',
      ],
      npc: { id: 'npc-ignacio', attitudeDelta: 8, cause: 'el investigador le mostró lo que llevaba encima' },
    }),
  },
  {
    id: 'negar-a-ignacio',
    prueba: () => ({
      skill: 'psicologia', difficulty: 'regular',
      reason: 'decirle a un hombre que lleva tres años leyendo gente que no llevás nada raro',
      stakes_success: 'Ignacio no insiste',
      stakes_failure: 'Ignacio te mira los bolsillos y no dice nada',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: ['Ignacio no insiste. Asiente, con una lentitud que no es de acuerdo sino de cortesía, y cambia de tema: el prior, las parras, el tiempo que va a hacer.'],
        };
      }
      return {
        texto: ['Ignacio no insiste, pero su mirada baja un instante hacia el bolsillo donde el reloj sigue marcando lo suyo, y vuelve a subir. Ninguno de los dos dice nada. Los dos saben qué se calló.'],
        npc: { id: 'npc-ignacio', attitudeDelta: -8, cause: 'el investigador le mintió y no lo disimuló bien' },
      };
    },
  },

  // ───────────────────────────── RAMA HUARPE ─────────────────────────────
  {
    id: 'cruzar-el-barro',
    prueba: (s) => ({
      skill: 'sigilo', difficulty: 'regular',
      reason: 'pisar exactamente donde pisa Takillpa, sin hacer ruido, con los faroles cerca',
      stakes_success: 'los perros pierden el rastro en el agua',
      stakes_failure: 'un ruido de más y los faroles giran hacia vos',
      ...(llevaEncima(s, 'it-amuleto-hueso') ? { bonus_dice: 1, modifier_reason: 'el amuleto de hueso baja el ruido de alrededor' } : {}),
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: ['Takillpa cruza por donde el fondo aguanta, y el investigador pone el pie exactamente donde él lo saca. Es una danza lenta, sin música. El barro suelta cada bota con un ruido que se confunde con el de las ranas.',
            'Un farol pasa a menos de veinte pasos, se detiene, y sigue. Los perros olfatean el agua y no encuentran nada que seguir.'],
          pistas: [{ description: 'Takillpa pisa siempre donde el barro aguanta y sabe cuál es el tramo donde los perros pierden el rastro en el agua.', kind: 'experiential', source: 'el totoral de Guanacache', reliability: 'reliable' }],
        };
      }
      return {
        texto: ['Takillpa cruza por donde el fondo aguanta, pero el investigador apoya el pie medio paso a un costado. El barro cede con un chasquido húmedo y una salpicadura que en el silencio suena a disparo.',
          'Los dos faroles se detienen a la vez. Se miran entre ellos. Giran.'],
        sospecha: { amount: 15, cause: 'un chapoteo delató su posición a los faroles de la rastrillería' },
      };
    },
  },

  ...(['reloj', 'encendedor', 'linterna'] as const).map((k) => {
    const cosa = {
      reloj: { item: 'it-reloj-pulsera', nombre: 'el reloj de pulsera', cierre: 'El tic todavía se oye un momento bajo el agua, parejo, sin cuerda. Después no.' },
      encendedor: { item: 'it-encendedor-1930', nombre: 'el encendedor de bencina', cierre: 'La tapa alcanza a abrirse una vez al hundirse y una chispa chica se apaga sola bajo la superficie.' },
      linterna: { item: 'it-linterna-1930', nombre: 'la linterna eléctrica', cierre: 'La luz no se apaga: baja, blanca y fija, cada vez más abajo, hasta que el agua se la traga entera.' },
    }[k];
    return {
      id: `ofrendar-${k}`,
      resolver: ({ estado }: { estado: GameState }) => [
        {
          texto: [
            `Le extiende ${cosa.nombre} a Takillpa. El viejo no lo toma en seguida: lo mira un rato, como quien decide si una deuda se paga así. Después lo recibe con las dos manos, camina hasta el borde del agua y lo suelta.`,
            `La laguna se traga lo que le dan. ${cosa.cierre}`,
            'Takillpa vuelve y descuelga un amuleto de hueso y almagre de una rama baja. Se lo pone en la palma sin decir nada.',
          ],
          traslada: { itemId: cosa.item, a: 'npc-takillpa', carried: false, cause: 'se lo ofrendó a Takillpa, que lo arrojó a la laguna' },
          npc: { id: 'npc-takillpa', attitudeDelta: 8, cause: 'el investigador se desprendió de algo que le costaba' },
          consecuencia: {
            description: `En 1710, el investigador ofrendó ${cosa.nombre} a Takillpa, que lo arrojó a la laguna de Guanacache: dejó atrás un objeto de su tiempo para ganarse la confianza de los guardianes huarpes.`,
            scope: 'campaign' as const, permanent: true,
            worldReminder: `Se desprendió de ${cosa.nombre}, ofrendado a la laguna.`,
          },
        },
        {
          traslada: { itemId: 'it-amuleto-hueso', a: estado.activeInvestigator, carried: true, cause: 'Takillpa se lo dio a cambio de la ofrenda' },
        },
      ],
    };
  }),

  {
    id: 'guardar-el-metal',
    resolver: () => ({
      texto: [
        'Takillpa asiente sin sonreír. No dice nada durante un largo rato. Cuando habla, no es un reproche:\n\n—Es suyo. Lo que traiga, lo carga usted. Pero no lo abra cerca del agua, y no lo deje solo de noche. Lo que duerme abajo no distingue entre lo que se usa y lo que se guarda.',
        'Se da vuelta y sigue caminando. Ya no hay amuleto colgando de la rama baja: alguien lo volvió a guardar.',
      ],
      npc: { id: 'npc-takillpa', attitudeDelta: -5, cause: 'el investigador se negó a desprenderse de lo que trae de 1930' },
      exposicion: { amount: 3, source: 'santooficio:metal', cause: 'cargar cerca de la fosa objetos de un tiempo que todavía no llegó' },
    }),
  },

  {
    id: 'aprender-manto',
    prueba: () => ({
      skill: 'ocultismo', difficulty: 'hard',
      reason: 'seguir un soplo que se dice con la boca casi cerrada y contra el viento',
      stakes_success: 'lo aprendés limpio, con poco costo',
      stakes_failure: 'lo aprendés, pero te cuesta más de lo que debería',
    }),
    resolver: ({ tirada, estado }) => {
      const yaSabe = estado.investigators[estado.activeInvestigator]?.spellsKnown.some((h) => h.id === 'manto-de-la-cienaga');
      const ok = Boolean(tirada?.exito);
      return {
        texto: [
          ok
            ? 'Aprendió el soplo bajo con la segunda vez: no hace falta decirlo, hace falta dejar que salga contra el viento del Zonda con la boca casi cerrada. Takillpa lo corrige una sola vez, con dos dedos en la garganta.'
            : 'Aprendió el soplo bajo, pero le cuesta: se le va la voz, le sale por la nariz, se le mezcla con la respiración. Takillpa lo repite tres veces con paciencia. A la cuarta sale, y cuando sale, se le queda agarrado en el pecho.',
          'Es un soplo, no una palabra. Una niebla que no estaba ahí un instante antes, y que espesa lo que hay alrededor de quien lo dice.',
        ],
        cordura: { amount: ok ? 1 : 2, cause: 'aprender a espesar la niebla con la respiración y saber que funciona' },
        ...(yaSabe ? {} : { aprenderHechizo: { id: 'manto-de-la-cienaga', source: 'Takillpa, en el altar del sauce, 1710' } }),
      };
    },
  },

  {
    id: 'espiar-rastrilleria',
    prueba: (s) => ({
      skill: 'sigilo', difficulty: 'hard',
      reason: 'llegar a la orilla y escuchar a la partida de la rastrillería sin que los perros te huelan',
      stakes_success: 'oís quién los manda y por qué cobran',
      stakes_failure: 'te ven la cabeza entre los juncos',
      ...(llevaEncima(s, 'it-amuleto-hueso') ? { bonus_dice: 1, modifier_reason: 'el amuleto de hueso baja el ruido de alrededor' } : {}),
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: [
            'Desde los juncos se ve una hoguera chica y cinco hombres alrededor. Uno habla sin levantar la voz: es el que manda, un sargento mayor de cara curtida. Los otros lo llaman Ledesma.',
            '—El Comisario paga por cabeza, y más si viene con nombre. No lo quiere muerto: lo quiere vivo y hablando. Al que lo tenga, media paga por adelantado. Los indios que lo escondan, al padrón.',
            'Uno de los hombres pregunta qué es lo que tiene el forastero. Ledesma escupe al fuego.\n\n—Eso no es asunto de soldados.',
          ],
          pistas: [{ description: 'El sargento mayor Ledesma dice que el Comisario quiere al forastero «vivo y hablando», que paga por cabeza y más si viene con nombre, y que los indios que lo escondan irán al padrón.', kind: 'testimonial', source: 'la laguna somera', reliability: 'reliable' }],
        };
      }
      return {
        texto: [
          'Desde los juncos se ve una hoguera chica y cinco hombres alrededor. Uno manda: un sargento mayor, al que llaman Ledesma. Alcanza a oír el nombre, y el tono, y después el ruido de una rama que se quiebra bajo su propio peso.',
          'Un perro levanta la cabeza. El sargento no se da vuelta todavía. Hace un gesto con la mano, corto.',
        ],
        sospecha: { amount: 20, cause: 'la partida de la rastrillería lo vio entre los juncos' },
        pistas: [{ description: 'Un sargento mayor llamado Ledesma manda la partida de la rastrillería que sigue el rastro por la laguna somera.', kind: 'testimonial', source: 'la laguna somera', reliability: 'reliable' }],
      };
    },
  },

  {
    id: 'descansar-isla',
    resolver: () => ({
      texto: [
        'Dormís en el hueco de los juncos con la ropa todavía húmeda y el amuleto, si lo tenés, apretado en la mano. Nadie pasa. Los perros tampoco.',
        'Cuando despertás el cielo cambió de color. El cansancio bajó un escalón, y con él el miedo a que alguien esté a punto de aparecer.',
      ],
      sospecha: { amount: -5, cause: 'una noche sin rastro cerca en el hueco de los juncos' },
      tiempo: { minutes: 240, reason: 'dormir unas horas en la isla de los juncos' },
    }),
  },

  {
    id: 'aprender-cantar',
    prueba: () => ({
      skill: 'ocultismo', difficulty: 'hard',
      reason: 'retener de una sola vez una tonada que ningún huarpe repite igual dos veces',
      stakes_success: 'la aprendés con poco costo',
      stakes_failure: 'la aprendés, pero te deja más marcado de lo que debería',
    }),
    resolver: ({ tirada, estado }) => {
      const yaSabe = estado.investigators[estado.activeInvestigator]?.spellsKnown.some((h) => h.id === 'cantar-de-las-sombras-de-sal');
      const ok = Boolean(tirada?.exito);
      return {
        texto: [
          ok
            ? 'Aprendió el cantar de la sal escuchando una sola vez, con los ojos cerrados y las manos abiertas sobre las rodillas. No son palabras: es una tonada que sube y baja como un cauce, y que se termina cuando ya no queda nadie a quien cantarle.'
            : 'Aprendió el cantar de la sal, aunque le cuesta: se le corta el aire en la parte que sube y se le pierde la parte que baja. La anciana lo canta una vez, sin repetir. Lo que no oyó, lo termina inventando, y el resultado le suena a algo que no era para cantarse así.',
          'La anciana ya se volvió hacia el fuego. No va a preguntar si le salió.',
        ],
        cordura: { amount: ok ? 1 : 2, cause: 'aprender una tonada que borra lo que uno dejó atrás en el aire y en la tierra' },
        ...(yaSabe ? {} : { aprenderHechizo: { id: 'cantar-de-las-sombras-de-sal', source: 'María Sayanca, en la ranchada de Guanacache, 1710' } }),
      };
    },
  },

  // La rastrillería encima (sospecha 60+): no se camina, se resuelve.
  {
    id: 'rastrilleria-fuga',
    prueba: (s) => ({
      skill: 'orientarse', difficulty: 'hard',
      reason: 'perder a los perros en el agua, sin salirte del fondo firme',
      stakes_success: 'los perros pierden el rastro y la partida da la vuelta',
      stakes_failure: 'el agua te devuelve exactamente al lugar donde te buscan',
      ...(llevaEncima(s, 'it-amuleto-hueso') ? { bonus_dice: 1, modifier_reason: 'el amuleto de hueso baja el ruido de alrededor' } : {}),
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: ['Se mete en el agua hasta la cintura, sigue el borde de un canal que Takillpa le enseñó, y cuenta hasta cien sin respirar hondo. Los perros llegan al mismo lugar, ladran, giran, y ladran hacia otro lado.',
            'La rastrillería perdió el rastro. No por mucho tiempo, pero por ahora. Uno de los hombres maldice en voz baja; otro escupe al agua.'],
          sospecha: { amount: -20, cause: 'despistó a la rastrillería en el agua' },
        };
      }
      return {
        texto: ['El agua lo devuelve a la orilla por donde entró. Un perro sale de entre los juncos a tres metros, con la lengua colgando y los ojos fijos, y detrás del perro se oye una voz que da una orden corta.',
          'No hay dónde ir que no sea hacia ellos.'],
        sospecha: { amount: 25, cause: 'la fuga por el agua falló y la rastrillería lo tiene a la vista' },
      };
    },
  },
  {
    id: 'rastrilleria-combate',
    resolver: () => ({
      texto: [
        'Se para, se da vuelta y los espera. Un perro sale de entre los juncos y un rastreador detrás, con el mosquete a medio levantar.',
        'La rastrillería perdió el rastro de lo demás: ahora sólo hay un hombre y un perro delante, y el barro entre los dos.',
      ],
      npc: { id: 'npc-rastreador', present: true, cause: 'la partida de la rastrillería lo alcanzó en las lagunas' },
      iniciaCombate: { npcIds: ['npc-rastreador'], reason: 'la rastrillería del Cabildo lo alcanzó en las lagunas de Guanacache' },
      consecuencia: {
        description: 'En 1710, en las lagunas de Guanacache, el investigador se enfrentó a un rastreador de la rastrillería del Cabildo en lugar de huir.',
        scope: 'scene', permanent: false, worldReminder: '',
      },
    }),
  },

  // ─────────────────────────────── DESENLACES ───────────────────────────────
  {
    id: 'hoguera',
    resolver: () => ({
      texto: [
        'No hay sentencia. Hay un auto de fe montado en la plaza con la eficiencia de quien ya lo había montado antes: un tablado, una tarima con el estrado del Comisario, un poste en el centro.',
        'El Comisario no lo mira mientras suben la leña. Está anotando algo en el libro de cuentas, con la cinta roja entre los dedos.',
      ],
      desenlace: {
        id: 'hoguera', title: 'El Auto de Fe',
        text: [
          'El fuego prende sin apuro. La multitud de San Juan no grita: mira, como mira una misa larga. El humo sube derecho y después se dobla con el Zonda, y por un instante, en el aire que se pliega, alguien de los que miran cree ver otro cielo.',
          'En el libro de cuentas del Comisario, en la columna de San Juan, hay ahora una fecha y una cruz. La entrada dice: «resuelto».',
          'Doscientos veinte años más tarde, en un archivo de San Juan que casi nadie visita, hay un acta de un Auto de Fe de noviembre de 1710 con un solo nombre incompleto y una anotación al margen: «no era de acá».',
        ],
      },
    }),
  },
  ...['salida-1930', 'salida-1944', 'quedarse', 'muerte-en-la-mina'].map((id) => ({
    id,
    resolver: () => ({
      texto: ['[PENDIENTE] Este desenlace todavía no está escrito.'],
      desenlace: { id, title: id, text: '[PENDIENTE]' },
    }),
  })),
];
