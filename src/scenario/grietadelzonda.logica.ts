/**
 * LA GRIETA DEL ZONDA — lógica de escenas.
 *
 * Acto I, corto, de un final único. Las dos primeras («pedir-que-ensene»,
 * «convencer-valenzuela») son las «soluciones lógicas» que el investigador
 * puede intentar — ninguna cambia el desenlace macro (la voladura pasa
 * igual), pero las dos dejan una consecuencia de campaña distinta según
 * cómo salieron, que es lo que hace que el camino hasta la grieta se sienta
 * decidido y no impuesto. Ver el plan de la conversación con el usuario
 * para el porqué completo.
 *
 * `sabotear-dinamita` es una TERCERA vía, agregada después de jugarla y
 * recibir el comentario de que "casi no hay tiradas": mismo criterio que
 * las otras dos (no cambia la voladura, deja su propia consecuencia de
 * campaña), pero de acción directa en vez de conversación — el hueco que
 * el comentario del párrafo anterior ya dejaba entrever al llamarlas «las
 * soluciones lógicas», dos nada más.
 *
 * Las escenas de gateo comparten una frase de cierre EXACTA en sus dos
 * ramas de resolver («Ya no hay más que preguntarle.» / «...no va a
 * cambiar por nada que digas.» / «No hay tiempo para otro intento antes
 * del amanecer.») — es el gancho que usan las condiciones de otras escenas
 * para saber que un intento ya se hizo, sea cual sea el resultado. El
 * operador `narrado` compara sensible a mayúsculas (ver ROADMAP), así que
 * las frases están copiadas tal cual entre escena y condición.
 */

import type { LogicaDeEscenas } from './cargarAventura.ts';

export const LA_GRIETA_DEL_ZONDA_LOGICA: LogicaDeEscenas = [
  {
    id: 'leer-telegrama',
    resolver: () => ({
      texto: [
        'El estudio que lo contrató no explica mucho, y lo poco que explica llega en el idioma seco de los telegramas.',
        'La línea de más abajo no la escribió nadie del estudio. Alguien la agregó después, a mano, y no dice a quién había que preguntarle.',
      ],
      documento: { id: 'doc-telegrama', how: 'lo tenía desde Buenos Aires, releído más de una vez en el camión' },
    }),
  },

  {
    id: 'revisar-baul',
    prueba: () => ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'encontrar algo entre la ropa doblada y las tejas sueltas de un baúl viejo',
      stakes_success: 'encontrás una hoja de partida doblada entre dos tejas',
      stakes_failure: 'sólo encontrás ropa y una foto de estudio con los hijos de chicos',
    }),
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'El baúl de Eusebio no tiene mucho: ropa doblada y una foto de estudio con los tres hijos de chicos, tomada hace más de veinte años.',
            'Nada que explique nada. Un baúl como cualquier otro.',
          ],
        };
      }
      return {
        texto: [
          'El baúl de Eusebio no tiene mucho: ropa doblada, una foto de estudio con los tres hijos de chicos, y entre dos tejas sueltas del fondo, doblada muchas veces, una hoja de partida de la parroquia.',
          'No parece que la haya escondido de nadie en particular. Parece, más bien, que no supo dónde más ponerla.',
        ],
        documento: { id: 'doc-recorte-familia', how: 'entre dos tejas sueltas, en el fondo del baúl de Eusebio' },
      };
    },
  },

  {
    id: 'pedir-que-ensene',
    prueba: () => ({
      skill: 'persuasion', difficulty: 'hard',
      reason: 'que un viejo desconfiado le enseñe a un desconocido de la ciudad algo que su propia familia no explicó nunca del todo',
      stakes_success: 'Eusebio se lo explica, con el poco tiempo y las pocas fuerzas que le quedan',
      stakes_failure: 'Eusebio se cierra: no va a repetir de apuro algo que le costó una vida entender a medias',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: [
            'Tarda en decidirse, pero al final estira el brazo hacia el frasco de almagre y se lo alcanza.',
            '—No es la pintura. Es dónde, y cómo, y con qué mano. —Se la hace repetir dos veces, corrigiéndola con la voz porque ya no puede corregirla con la mano—. La cara que mira contra el viento. Nunca la otra. Y no se pinta apurado: se pinta como si el que mira desde adentro tuviera todo el tiempo del mundo, porque lo tiene.',
            'No dice qué mira desde adentro. No se lo pregunta: hay preguntas que se sienten como para no hacerlas todavía.',
            'Cuando termina, se deja caer contra la almohada, agotado de una manera que no se explica con la edad sola.',
            'Ya no hay más que preguntarle.',
          ],
          tiempo: { minutes: 40, reason: 'que Eusebio explique el procedimiento, despacio, corrigiéndolo dos veces' },
          exposicion: { amount: 3, source: 'grietadelzonda:ensene', cause: 'aprender de memoria un gesto que nadie le explicó del todo a quien se lo enseña' },
          pistas: [{
            description: 'Eusebio Sosa le explicó el procedimiento real del almagre antes de quedarse sin fuerzas: la cara que mira contra el viento, nunca la otra, pintado sin apuro.',
            kind: 'testimonial',
            source: 'Eusebio Sosa, en su rancho',
            reliability: 'reliable',
          }],
          consecuencia: {
            description: 'Eusebio Sosa alcanzó a explicarle a un investigador de 1930 el procedimiento real del almagre antes de perder las fuerzas: la cara que mira contra el viento, sin apuro.',
            scope: 'campaign',
            permanent: true,
            worldReminder: 'Eusebio le enseñó lo que pudo antes de quedarse sin fuerzas.',
          },
        };
      }
      return {
        texto: [
          '—No. —Ni siquiera lo dice con enojo—. Esto no se enseña en una tarde a alguien que llegó ayer. Yo tardé una vida en entenderlo a medias, y usted quiere el resumen.',
          'Se da vuelta hacia la pared, y la conversación se termina ahí, aunque nadie la haya dado por terminada en voz alta.',
          'Ya no hay más que preguntarle.',
        ],
        cordura: { amount: 1, cause: 'la certeza concreta de que algo se pierde hoy, y no se va a poder recuperar después' },
        pistas: [{
          description: 'Eusebio se negó a explicar el procedimiento del almagre de apuro, y no va a volver a intentarlo.',
          kind: 'testimonial',
          source: 'Eusebio Sosa, en su rancho',
          reliability: 'reliable',
        }],
        consecuencia: {
          description: 'Eusebio Sosa no llegó a explicarle nada a un investigador de 1930 sobre el procedimiento del almagre: se negó, agotado, y no volvió a intentarlo.',
          scope: 'campaign',
          permanent: true,
          worldReminder: 'Eusebio no le dijo nada, y ya no va a poder decírselo a nadie.',
        },
      };
    },
  },

  {
    id: 'convencer-valenzuela',
    prueba: () => ({
      skill: 'persuasion', difficulty: 'hard',
      reason: 'que un ingeniero con una orden firmada y una crisis económica encima frene una voladura por la palabra de un desconocido',
      stakes_success: 'Valenzuela termina dudando en serio, aunque la orden siga en pie',
      stakes_failure: 'Valenzuela lo despacha como a un curioso más',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: [
            'No lo convence. Pero lo hace pensar, que no es lo mismo y que Valenzuela no esperaba que le pasara.',
            '—Mire. —Baja la voz, para que los peones no lo oigan dudar—. Yo no le creo lo del círculo. Pero tampoco le creo a mi ingeniero jefe que dice que treinta peones tienen miedo de una forma rara que hace el viento. Una de las dos cosas está mal, y no sé cuál.',
            'Se endereza, y cuando habla de nuevo ya volvió a ser el ingeniero de antes.',
            '—La orden ya está dada, y no va a cambiar por nada que digas.',
          ],
          pistas: [{
            description: 'El ingeniero Valenzuela terminó dudando en serio, aunque no lo admita del todo: no le cierra ni la explicación del círculo ni la explicación oficial del miedo de los peones.',
            kind: 'testimonial',
            source: 'ingeniero Valenzuela, en el campamento de obras',
            reliability: 'reliable',
          }],
          consecuencia: {
            description: 'El ingeniero Valenzuela terminó dudando de su propia decisión después de hablar con un investigador de 1930, aunque igual no pudo pararla.',
            scope: 'campaign',
            permanent: true,
            worldReminder: 'Valenzuela dudó, en privado, y voló la piedra igual.',
          },
        };
      }
      return {
        texto: [
          'Ni siquiera lo deja terminar el argumento.',
          '—Si viene de parte del estudio a decirme que no dinamite una piedra por una historia de paisanos, dígales que no. —Lo dice fuerte, para que los peones lo escuchen dudar de otra manera: riéndose—. Tengo una fecha, tengo una plata gastada y tengo treinta familias que cobran si esto se termina. No tengo una piedra sagrada.',
          'Se da vuelta hacia los cajones de dinamita, y dos peones se ríen bajito de algo que no hace falta preguntar qué es.',
          'La orden ya está dada, y no va a cambiar por nada que digas.',
        ],
        pistas: [{
          description: 'El ingeniero Valenzuela trató al investigador de curioso delante de los peones, y no va a volver a escucharlo.',
          kind: 'testimonial',
          source: 'ingeniero Valenzuela, en el campamento de obras',
          reliability: 'reliable',
        }],
        consecuencia: {
          description: 'El ingeniero Valenzuela no le creyó una palabra a un investigador de 1930, y lo trató de curioso delante de los peones.',
          scope: 'campaign',
          permanent: true,
          worldReminder: 'Valenzuela se rió de él delante de los peones, y voló la piedra igual.',
        },
      };
    },
  },

  {
    id: 'sabotear-dinamita',
    prueba: () => ({
      skill: 'mecanica', difficulty: 'hard',
      reason: 'aflojar la mecha de unas cargas y mojar la pólvora de otras sin que ningún peón lo note',
      stakes_success: 'gana un día entero: la voladura no puede hacerse mañana como estaba previsto',
      stakes_failure: 'un peón lo sorprende a tiempo, o la manipulación queda evidente antes de irse',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: [
            'Nadie mira dos veces a alguien que revisa cajones en un campamento: es sospechoso sólo si alguien ya sospecha. Aflojar la mecha de unas cargas y mojar la pólvora de otras lleva menos tiempo del que hacía falta para que se note.',
            'No va a impedir la voladura. Va a impedir que sea mañana.',
            'No hay tiempo para otro intento antes del amanecer.',
          ],
          consecuencia: {
            description: 'Un investigador de 1930 saboteó en secreto varias cargas de dinamita en las obras del canal, sin que nadie lo notara — demoró la voladura, no la evitó.',
            scope: 'campaign',
            permanent: true,
            worldReminder: 'Nadie sabe todavía que fue él quien demoró la voladura.',
          },
        };
      }
      return {
        texto: [
          'La mecha se le resbala de los dedos justo cuando un peón dobla la esquina del galpón con una carretilla. No hace falta que diga nada: la cara que pone alcanza.',
          '—Yo no vi nada —dice, después de un silencio demasiado largo—. Pero si esto se sabe, no fui yo el que se lo dijo.',
          'No hay tiempo para otro intento antes del amanecer.',
        ],
        consecuencia: {
          description: 'Un peón de las obras del canal sorprendió a un investigador de 1930 manipulando las cargas de dinamita, y calló a cambio de no verse mezclado.',
          scope: 'campaign',
          permanent: true,
          worldReminder: 'Un peón sabe que el investigador tocó las cargas de dinamita, y calla por ahora.',
        },
      };
    },
  },

  {
    id: 'notar-silencio-peones',
    // ANTROPOLOGÍA es cara —ninguna ficha pregenerada la trae, así que sale
    // en base 1— y por eso NO GATEA NADA: el dato de que los peones tratan
    // la acequia como un asunto de familia se entrega igual, falle o
    // acierte la tirada. Lo que cambia con el éxito es cuánto se entiende
    // de por qué, no si se nota el silencio. Mismo criterio documentado en
    // `suenodebido.logica.ts` para el mismo problema con la misma habilidad.
    prueba: () => ({
      skill: 'antropologia', difficulty: 'regular',
      reason: 'reconocer qué tipo de silencio es, más allá de notar que existe',
      stakes_success: 'entendés que es un silencio de familia, no de respeto genérico',
      stakes_failure: 'notás el silencio, pero no sabés ubicar de qué clase es',
    }),
    resolver: ({ tirada }) => {
      if (tirada?.exito) {
        return {
          texto: [
            'Los peones bajan la voz cada vez que alguien nombra la acequia vieja.',
            'No es el respeto genérico de alguien que prefiere no meterse en nada: es el mismo silencio reservado que se guarda por un pariente muerto, o por algo de familia que no se cuenta afuera. Tratan la acequia como un asunto de sangre, no como una obra pública, y eso no se aprende trabajando la tierra tres temporadas.',
          ],
          pistas: [{
            description: 'El silencio de los peones sobre la acequia vieja no es respeto genérico ni miedo a la empresa: es el mismo tipo de silencio reservado para un asunto de familia, o para un muerto reciente — heredado, no aprendido en el trabajo.',
            kind: 'experiential',
            source: 'observar a los peones de las obras del canal',
            reliability: 'reliable',
          }],
        };
      }
      return {
        texto: [
          'Los peones bajan la voz cada vez que alguien nombra la acequia vieja.',
          'Hay algo particular en cómo lo hacen, pero no alcanza a ubicar qué: podría ser respeto, podría ser miedo a la empresa, podría ser otra cosa. Se queda con la certeza de que no es casualidad, nada más.',
        ],
        pistas: [{
          description: 'Los peones de la obra bajan la voz de un modo particular cada vez que se nombra la acequia vieja, aunque no está claro todavía si es respeto, miedo, o algo más.',
          kind: 'experiential',
          source: 'observar a los peones de las obras del canal',
          reliability: 'unreliable',
        }],
      };
    },
  },

  {
    id: 'ver-obras',
    resolver: () => ({
      texto: [
        'Al amanecer los peones se retiran del brocal en fila, sin que nadie tenga que repetirles la orden dos veces. Valenzuela cuenta desde lejos, con un cronómetro que no necesita.',
        'La detonación no suena como debería sonar una detonación: suena corta, y después sigue sonando un rato más de lo que cualquier eco explica.',
        'El brocal de piedra —la cara que mira contra el viento, la que tenía el círculo pintado encima de otro grabado— se abre en dos, y con él se abre algo que no tiene por qué haberse abierto: el aire adentro del zanjón empieza a vibrar, y la luz de la mañana, al pasar por ahí, sale del otro lado con un tono rojizo que no tenía antes de entrar.',
        'El viento Zonda, que ya venía fuerte, se pone feroz de golpe. Los peones corren. Valenzuela grita algo que nadie escucha. Las distancias entre las carpas del campamento y la estación, allá a lo lejos, dejan de parecer las distancias de siempre: un hombre que corre hacia la estación tarda más de lo que debería, y una carpa que estaba cerca ahora se ve como si estuviera del otro lado del Valle.',
        'Al fondo del zanjón, donde estaba el brocal partido, hay una grieta abierta al pie del brocal, más honda de lo que un solo cartucho de dinamita podría haber abierto, y el viento entra y sale de ella con un silbido que ya no es el silbido de siempre.',
      ],
      cordura: {
        amount: 4,
        cause: 'ver una explosión común abrir algo que no era sólo piedra, con el aire y la luz portándose mal alrededor',
        crisis: {
          nombre: 'Miedo al viento repentino',
          descripcion: 'Un cambio brusco de viento —una puerta que se abre de golpe, una ráfaga inesperada— trae de vuelta, por un instante, el silbido de la grieta del Zonda.',
          tipo: 'phobia',
          afecta: [{ skill: 'esquivar', dados: 1 }],
        },
      },
      exposicion: { amount: 10, source: 'grietadelzonda:voladura', cause: 'la fractura del Umbral abriéndose de golpe, a la vista de todo el campamento' },
      pistas: [{
        description: 'La voladura del brocal no solo rompió piedra: abrió una grieta que vibra, refracta la luz en rojo, y distorsiona las distancias del Valle alrededor.',
        kind: 'experiential',
        source: 'el brocal de la acequia vieja, la mañana de la voladura',
        reliability: 'reliable',
      }],
    }),
  },

  {
    id: 'caminar-la-grieta',
    resolver: () => ({
      texto: [
        'No hay a quién pedirle ayuda ni con quién discutirlo: los peones ya corrieron, Valenzuela ya grita órdenes que nadie sigue, y la grieta sigue ahí, respirando viento rojizo al pie del brocal partido.',
        'Bajar cuesta menos de lo que debería costar bajar a un pozo recién abierto por dinamita. El aire adentro es denso, como caminar contra algo que no es viento del todo, y las paredes de tierra y piedra se ven demasiado cerca y demasiado lejos al mismo tiempo, según hacia dónde se mire.',
        'El silbido se hace más agudo a cada paso, hasta que deja de ser un sonido y empieza a ser una presión pareja contra el cuerpo entero.',
        'Y entonces, sin ningún escalón que marque el cambio, el suelo deja de ser tierra removida por dinamita de 1930 y empieza a ser barro fresco, húmedo, de un cauce que nunca se secó.',
      ],
      exposicion: { amount: 8, source: 'grietadelzonda:cruce', cause: 'cruzar la grieta misma, no sólo verla desde afuera' },
      consecuencia: {
        description: 'En febrero de 1930, en el Valle de Zonda (San Juan), un investigador vio con sus propios ojos que Castronegro no es el único lugar donde el Umbral se manifiesta —y cruzó la grieta que se abrió ahí, sin saber todavía hacia cuándo.',
        scope: 'campaign',
        permanent: true,
        worldReminder: 'Sabe que hay más de un lugar donde esto pasa. No sabe cuántos, ni por qué, ni si alguien más lo sabe también.',
      },
      desenlace: {
        id: 'caminar-la-grieta',
        title: 'Caminar la Grieta',
        text: [
          'El Valle de Zonda de 1930 no se puede salvar cerrando esta grieta: lo que la abrió ya está roto, y lo que la sostenía cerrada durante generaciones era un gesto tan simple —una mano, un pincel, una piedra— que nadie pensó en escribirlo en ningún lado hasta que ya era tarde.',
          'Lo único que queda por hacer es lo único que la grieta ofrece: seguirla hacia donde va.',
          'El peso del aire cambia antes que la luz. Después cambia la luz. Y para cuando los pies dejan de pisar tierra removida por dinamita y se hunden en barro fresco de un cauce que corre de verdad, ya no queda nada del Valle de Zonda de 1930 alrededor — ni el campamento, ni Valenzuela, ni el cartel torcido de la estación.',
          'Sólo el mismo Valle, mucho antes, oliendo a un río que en 1930 hace décadas que está seco.',
        ],
      },
    }),
  },
];
