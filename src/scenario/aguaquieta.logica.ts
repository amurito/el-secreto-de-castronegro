/**
 * LA LÓGICA DE LAS ESCENAS DE AGUA QUIETA — lo único que no puede ser dato.
 *
 * Todo lo demás de esta aventura vive en `agua-quieta.contenido.json`:
 * lugares, objetos, NPC, documentos, temas de conversación, botones,
 * desenlaces, y las condiciones de CUÁNDO responde cada escena.
 *
 * Acá queda `resolver` —con sus `antes`/`prueba`—, que es prosa que se arma
 * distinto según cómo salió la tirada y qué se descubrió antes. Eso no es una
 * pregunta de sí/no que un árbol de condiciones pueda expresar: es
 * composición de texto con estado, y por eso sigue siendo código.
 *
 * Lo que devuelve sigue siendo declarativo, como siempre: la escena no toca
 * el estado, lo propone, y el motor lo ejecuta con las herramientas que
 * valida.
 *
 * El `id` de cada entrada la casa con su declaración en el JSON. Si sobra o
 * falta una de un lado, `validarContenido` lo rechaza al cargar.
 */

import type { GameState } from '../shared/types.ts';
import type { IntencionLeida } from './escena.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';
import { evaluarCondicion } from './condiciones.ts';

// ── AYUDAS ───────────────────────────────────────────────────────────────────

const pista = (s: GameState, frag: string) =>
  s.board.clues.some((c) => c.description.includes(frag));

const propiedadVista = (s: GameState, item: string) =>
  (s.items[item]?.discoveredProperties.length ?? 0) > 0;

const oculta = (s: GameState, item: string) =>
  s.items[item]?.hiddenProperties[0]?.description ?? '';

/** Lleva su propia cámara —Tomás, o quien haya nacido con `Ocupacion.itemInicial` de fotógrafo/periodista. */
const conCamara = (s: GameState) =>
  evaluarCondicion({ op: 'lleva', item: 'it-camara-fotografica' }, { estado: s });

const aqui = (s: GameState) => s.world.currentLocation;
const hora = (s: GameState) => Number(s.world.time.iso.slice(11, 13));
const esDeNoche = (s: GameState) => hora(s) >= 19 || hora(s) < 6;

const dice = (i: IntencionLeida, re: RegExp) => re.test(i.norm);

// ─────────────────────────────────────────────────────────────────────────────

export const AGUA_QUIETA_LOGICA: LogicaDeEscenas = [
  // ══ DESENLACES ════════════════════════════════════════════════════════════
  // Prioridad alta: cierran la aventura, así que se comprueban antes que
  // cualquier lectura más suave de la misma frase.

  {
    id: 'fin-sostener',
    antes: (s) => aqui(s) !== 'patio' ? null : ({
      texto: [
        'Apoyás los codos en el brocal y decidís no apartar la vista. Es una decisión, no un descuido: ' +
        'las dos cosas se parecen desde afuera y no se parecen en nada por dentro.\n\n' +
        'El primer minuto no pasa nada. El segundo tampoco.',
      ],
    }),
    prueba: (s) => aqui(s) !== 'patio' ? null : ({
      skill: 'POW', difficulty: 'hard',
      reason: 'sostener la mirada sobre el agua hasta que el agua conteste',
      stakes_success: 'seguís siendo quien mira cuando termina',
      stakes_failure: 'para cuando termina, ya no está claro quién miraba a quién',
      penalty_dice: 1, modifier_reason: 'nadie sostiene esto sin pagarlo',
    }),
    resolver: ({ estado, tirada }) => {
      if (aqui(estado) !== 'patio') return { texto: ['El aljibe está en el patio.'] };
      const firme = tirada?.exito ?? false;
      const grado = tirada?.grado;
      // Con penalizador de por medio, esta tirada pifia más seguido que la
      // mayoría, y es el momento de la aventura donde más importa que pifie
      // distinto a fallar. Un crítico, en cambio, es el único momento en que
      // el investigador se va con algo a favor.
      const pifio = grado === 'fumble';
      const critico = grado === 'critical';
      return [
        {
          exposicion: { amount: pifio ? 24 : 18, source: 'aljibe:respuesta', cause: 'sostener la mirada hasta que el reflejo respondió' },
          estabilidad: { amount: pifio ? -30 : critico ? -8 : firme ? -12 : -22, cause: 'que el reflejo dejara de imitar' },
          // Cordura de verdad, además de Estabilidad: el reflejo dejando de
          // imitar es percepción directa de algo que no debería poder
          // percibirse, y eso es Cordura, no Umbral. Con la pifia, seis
          // puntos de golpe cruzan el piso de crisis temporal (5) que el
          // motor aplica solo — ver toolApplySanityLoss.
          cordura: {
            amount: pifio ? 6 : critico ? 2 : firme ? 3 : 4,
            cause: 'ver con claridad que el reflejo actúa por su cuenta',
            // Si esto cruza el piso de crisis (lo cruza seguro con la pifia,
            // y puede cruzarlo igual con Exposición alta), se lleva ESTA
            // fobia y no una genérica. Hipervigilante y desorientada no es
            // sabor: es -1 dado real en Psicología y Orientarse mientras dure.
            crisis: {
              nombre: 'Horror a las superficies quietas', tipo: 'phobia',
              descripcion:
                'Desde el aljibe, cualquier superficie que no se mueve —un charco, un vidrio, un plato hondo— ' +
                'tarda un segundo de más en dejar de parecer que está por hacer algo. No es que tenga miedo al ' +
                'agua: es que dejó de confiar en que las cosas quietas estén realmente quietas.',
              afecta: [{ skill: 'psicologia', dados: 1 }, { skill: 'orientarse', dados: 1 }],
            },
          },
          pistas: [{
            description: 'El reflejo del aljibe dejó de imitar y se movió por su cuenta. No es un efecto óptico: hay algo que usa el agua para mirar.',
            kind: 'experiential', source: 'observación sostenida hasta la respuesta', reliability: 'reliable',
          }],
          consecuencia: {
            description: pifio
              ? 'El investigador sostuvo la mirada hasta que el fenómeno del aljibe respondió, y algo se quedó mirando de vuelta más tiempo del que debía.'
              : 'El investigador sostuvo la mirada hasta que el fenómeno del aljibe respondió.',
            scope: 'campaign', permanent: true,
            worldReminder: pifio
              ? 'El agua no sólo respondió: se quedó un rato mirando de más antes de irse. Lo que sea que mira desde el aljibe conoce a este investigador mejor de lo que a este investigador le gustaría.'
              : 'El agua respondió a este investigador. Lo que sea que mira desde el aljibe ahora sabe qué cara tiene.',
          },
          texto: [
            'En algún momento del tercero, la cara del agua deja de copiarte.\n\n' +
            'No hace nada espectacular. Simplemente sigue ahí, con tu cara, quieta, mientras vos parpadeás. ' +
            'Y después, sin apuro, ladea la cabeza hacia un lado al que vos no la ladeaste.'
            + (pifio
              ? '\n\nY se queda así. Uno, dos, tres segundos de más, mirándote ladeada, como si estuviera terminando de anotar algo.'
              : critico
                ? '\n\nY volvés en vos casi al instante, con la certeza incómoda de haber entendido más de lo que tardaste en entenderlo.'
                : ''),
          ],
          desenlace: {
            id: 'mirar', title: 'Lo que devuelve la mirada',
            text: pifio
              ? 'No te apartás del brocal: te caés hacia atrás, de espaldas, y quedás mirando el cielo un rato antes de poder ' +
                'sentarte.\n\n' +
                'Rosa sale corriendo del galpón y no pregunta nada, porque te vio la cara —la que tenías cuando te asomaste, ' +
                'no la de ahora— y algo en ella ya lo sabía de antes.\n\n' +
                'Vos entendiste qué es el aljibe, de la peor manera posible: entendiendo, también, con exactitud, cuánto rato ' +
                'más se quedó mirándote después de que vos ya habías dejado de mirar.\n\n' +
                'Eso no se lo vas a poder contar a nadie de un modo que no suene a delirio. Y vas a tener razón en no contarlo, ' +
                'porque una parte de vos —la parte que se cayó de espaldas— sabe que contarlo es otra forma de invitarlo.'
              : firme
                ? 'Te apartás del brocal por decisión propia, que es más de lo que la mayoría podría decir.\n\n' +
                  'Rosa está en la puerta de la cocina con el repasador en las manos y no pregunta nada, porque te vio la cara ' +
                  'y ya sabe. Adentro pone la pava, y las dos toman mate sin hablar hasta que se hace de noche.\n\n' +
                  'Vos entendiste qué es el aljibe. No lo vas a poder escribir en el informe de una manera que sirva, ' +
                  'y vas a volver a Buenos Aires con eso adentro.\n\n' +
                  (critico
                    ? 'Lo que no sabías es que ibas a poder volver a mirarlo sin que te cueste nada: la comprensión, esta vez, ' +
                      'se te acomodó adentro sin pelearse con el resto de vos. No es que te haya dolido menos. Es que entró bien.'
                    : 'Lo que no vas a saber nunca es si el aljibe entendió qué sos vos, o si le alcanzó con verte.')
                : 'No sabés cómo llegaste al suelo del patio. Rosa te está sacudiendo el hombro y el sol está en otro lado del cielo, ' +
                  'mucho más abajo, y ella dice que estuviste tres horas asomada sin contestarle.\n\n' +
                  'Te levantás. Te lavás la cara en el balde, no en el aljibe, y esa distinción te parece la cosa más importante ' +
                  'que decidiste en tu vida.\n\n' +
                  'Entendiste qué es el aljibe. También entendiste, con la misma claridad, que el aljibe tuvo tres horas ' +
                  'para entenderte a vos, y que vos no te acordás de ninguna.',
          },
        },
      ];
    },
  },

  {
    id: 'fin-quedarse',
    resolver: () => ({
      tiempo: { minutes: 8 * 60, reason: 'pasar la noche en Los Álamos' },
      exposicion: { amount: 14, source: 'noche-en-la-casa', cause: 'dormir a veinte metros del aljibe' },
      estabilidad: { amount: -15, cause: 'una noche entera de agua quieta al lado' },
      consecuencia: {
        description: 'El investigador pasó la noche en Los Álamos. Rosa Quintana no estaba a la mañana.',
        scope: 'world', permanent: true,
        worldReminder: 'Rosa Quintana desapareció la noche que el investigador se quedó en la casa. El aljibe quedó abierto.',
      },
      texto: [
        'Rosa te arma el catre en la cocina, que es el cuarto más lejos del patio, y no dice que lo eligió por eso.\n\n' +
        'Te dormís tarde. Un aljibe hace ruido y este no hace ninguno, y resulta que el silencio de una cosa que ' +
        'debería sonar es más difícil de tolerar que el ruido.',
      ],
      desenlace: {
        id: 'quedarse', title: 'Lo que se queda',
        text:
          'A las cuatro y veinte de la mañana te despierta el frío, porque la puerta de la cocina está abierta de par en par.\n\n' +
          'El catre de Rosa está hecho. Sus zapatos están al lado de la cama, los dos, prolijos.\n\n' +
          'En el patio no hay nadie. El brocal está mojado en todo el borde, como si alguien se hubiera apoyado con ' +
          'las dos manos y después con todo el cuerpo, y el agua abajo está perfectamente quieta.\n\n' +
          'Gritás el nombre de ella hasta que se te va la voz. El aljibe no devuelve eco. Eso ya lo sabías.\n\n' +
          'La chata del correo pasa a las siete. Subís sola, con el cuaderno y las fotografías en el bolso, y ' +
          'con dos desaparecidos donde antes había uno.',
      },
    }),
  },

  {
    id: 'fin-sellar',
    resolver: () => ({
      consecuencia: {
        description: 'El aljibe de Los Álamos quedó sellado.', scope: 'world', permanent: true,
        worldReminder: 'El aljibe de Los Álamos está sellado por decisión del investigador. Nadie volvió a mirar esa agua. Lo que estuviera ahí sigue estando.',
      },
      desenlace: {
        id: 'sellar', title: 'Lo que se tapa',
        text:
          'Tablas del galpón, los clavos que había, y encima las piedras del cerco viejo. Rosa te alcanza las cosas sin ' +
          'que se lo pidas y no dice una palabra en las dos horas que lleva.\n\n' +
          'Cuando terminás ya es de noche. El patio se ve más grande sin el brocal a la vista.\n\n' +
          'Rosa se queda mirando el montón de tablas un rato largo. Después dice: «¿Y si él está ahí?».\n\n' +
          'No es una pregunta que quiera respuesta. Es una pregunta que se va a quedar en la casa después de que usted ' +
          'se vaya, y también después de que se vaya ella.',
      },
    }),
  },

  {
    id: 'fin-irse',
    resolver: () => ({
      consecuencia: {
        description: 'El investigador se fue de Los Álamos sin resolver la desaparición.', scope: 'world', permanent: true,
        worldReminder: 'El aljibe de Los Álamos quedó abierto y sin vigilancia. Rosa Quintana se quedó sola en la casa.',
      },
      desenlace: {
        id: 'llevarse', title: 'Lo que se lleva',
        text:
          'La chata del correo pasa a las siete. Rosa no sale a despedirla.\n\n' +
          'En el bolso llevás el cuaderno, la carta de Rausch y las dos fotografías, que Rosa te dio sin discutir, ' +
          'como si se sacara algo de encima.\n\n' +
          'A los seis meses vas a volver a abrir la carpeta, y las fotografías van a seguir mostrando lo mismo. ' +
          'Esa es la parte que no te vas a poder explicar: que sigan mostrando lo mismo.',
      },
    }),
  },

  {
    id: 'fin-bajar',
    antes: (s) => aqui(s) !== 'patio' ? null : ({
      texto: [
        'Apoyás las manos en el brocal. La roldana no tiene soga: Rosa la sacó, y ya sabés por qué o estás por saberlo.\n\n' +
        'Son poco más de dos metros hasta el agua, y el agua tiene menos de un metro. Se puede bajar. ' +
        'Bajar es fácil. Lo que no está claro es lo otro.',
      ],
    }),
    prueba: (s) => aqui(s) !== 'patio' ? null : ({
      skill: 'trepar', difficulty: 'regular',
      reason: 'descolgarte por el brocal sin soga',
      stakes_success: 'bajás controlando el descenso',
      stakes_failure: 'te resbalás en el ladrillo húmedo',
      penalty_dice: 1, modifier_reason: 'sin soga y con ladrillo húmedo',
    }),
    resolver: ({ estado, tirada }) => {
      if (aqui(estado) !== 'patio') return { texto: ['El aljibe está en el patio.'] };
      const caida = tirada && !tirada.exito
        ? {
            dano: { amount: 3, cause: 'caída de dos metros contra el fondo del aljibe' },
            texto: ['El musgo cede. Caés los dos metros de golpe y el agua no amortigua casi nada.'],
          }
        : {};
      return [
        caida,
        {
          exposicion: { amount: 12, source: 'aljibe:dentro', cause: 'entrar en contacto físico con el agua del aljibe' },
          estabilidad: { amount: -10, cause: 'estar dentro del agua quieta' },
          consecuencia: {
            description: 'El investigador bajó al aljibe de Los Álamos.', scope: 'campaign', permanent: true,
            worldReminder: 'El investigador estuvo dentro del agua del aljibe. Sea lo que sea que el agua registra, lo registró a él.',
          },
          texto: [
            'El agua te llega a la cintura y está más fría de lo que corresponde a octubre. Desde acá abajo, el círculo de ' +
            'cielo en la boca del aljibe se ve chico y muy lejos.\n\n' +
            'No hay cuerpo. No hay ropa. No hay nada más que ladrillo, musgo y una moneda vieja.\n\n' +
            'Y sin embargo el agua alrededor de tus piernas sigue completamente quieta.',
          ],
          desenlace: {
            id: 'bajar', title: 'Lo que está abajo',
            text:
              'Salís sola, con las manos peladas de agarrarte del ladrillo, y Rosa está arriba con el farol aunque es de día ' +
              'y aunque juró que no se acercaba.\n\n' +
              'Te ayuda a pasar la pierna por el brocal. Cuando estás afuera te mira la ropa mojada y no dice nada de la ropa.\n\n' +
              '—¿Se vio? —pregunta.\n\n' +
              'Y es una pregunta rarísima, y las dos entienden perfectamente lo que quiere decir.',
          },
        },
      ];
    },
  },

  // ══ ESCENAS DE INVESTIGACIÓN ══════════════════════════════════════════════

  {
    // Comparar las dos fotografías. Antes que la placa: nombra las dos.
    id: 'comparar-fotos',
    resolver: ({ estado }) => {
      if (!propiedadVista(estado, 'it-fotoreciente')) {
        return {
          texto: [
            'Ponés las dos imágenes una al lado de la otra. La de 1897 muestra a la familia delante del aljibe recién ' +
            'levantado. La de Ignacio muestra el mismo brocal, veintisiete años después, vacío.\n\n' +
            'Vacío, salvo por el agua. Y en el agua todavía no viste nada, porque no miraste la placa con atención.',
          ],
        };
      }
      return [
        {
          texto: ['Acercás las dos imágenes hasta que se tocan por el borde y las inclinás para que les dé la misma luz.'],
          descubre: {
            itemId: 'it-foto1897', propertyId: 'p-1897-rostro',
            how: 'comparando las dos fotografías bajo la misma luz',
            comparedWith: 'it-fotoreciente',
          },
        },
        {
          texto: [oculta(estado, 'it-foto1897')],
          pistas: [{
            description: 'El hombre del fondo de la fotografía de 1897 y la figura reflejada en la placa de Ignacio son la misma persona.',
            kind: 'physical', source: 'comparación de las dos fotografías', reliability: 'reliable',
          }],
          estabilidad: { amount: -8, cause: 'dos imágenes separadas por veintisiete años que no pueden mostrar a la misma persona' },
          exposicion: { amount: 4, source: 'rostro-repetido', cause: 'reconocer el rostro repetido' },
          contradiccion: {
            description: 'La misma persona aparece en dos fotografías separadas por veintisiete años, sin haber envejecido.',
            between: 'Fotografía de 1897 | Placa de Ignacio, octubre de 1924',
          },
        },
      ];
    },
  },

  {
    id: 'reloj-sobre-agua',
    antes: (s) => propiedadVista(s, 'it-reloj') ? null : ({
      texto: ['Te asomás lo justo y extendés el brazo con el reloj colgando de la cadena, encima del círculo de agua.'],
    }),
    prueba: (s) => propiedadVista(s, 'it-reloj') ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'seguir el segundero de un reloj a un metro de distancia, sobre el agua',
      stakes_success: 'notás lo que hace',
      stakes_failure: 'un reloj parado sobre un pozo, y el brazo cansado',
    }),
    resolver: ({ estado, tirada, variante }) => {
      if (propiedadVista(estado, 'it-reloj')) {
        return { texto: [`Volvés a sostenerlo sobre el agua. ${oculta(estado, 'it-reloj')}`] };
      }
      if (!tirada?.exito) {
        return {
          texto: [variante([
            'Lo sostenés un buen rato con el brazo estirado. Está parado a las cuatro y veinte, como siempre. ' +
            'Se te cansa el hombro antes de que pase nada que puedas jurar.',
            'Otra vez, con más paciencia. El segundero no se mueve, o se mueve tan poco que no lo podés sostener ' +
            'como observación. Podés volver a intentarlo.',
          ])],
        };
      }
      return [
        {
          descubre: {
            itemId: 'it-reloj', propertyId: 'p-reloj-atras',
            how: 'sosteniendo el reloj sobre la boca del aljibe',
          },
        },
        {
          texto: [oculta(estado, 'it-reloj')],
          pistas: [{
            description: 'El reloj de Ignacio retrocede seis o siete segundos cuando está sobre el agua del aljibe, y vuelve a detenerse en las cuatro y veinte.',
            kind: 'experiential', source: 'experimento directo sobre el aljibe', reliability: 'reliable',
          }],
          estabilidad: { amount: -8, cause: 'un mecanismo que retrocede sobre el agua y no fuera de ella' },
          exposicion: { amount: 6, source: 'reloj-sobre-agua', cause: 'presenciar una anomalía inequívoca en el aljibe' },
          pregunta: '¿Por qué las cuatro y veinte, y por qué siempre el mismo tramo?',
        },
      ];
    },
  },

  {
    id: 'mirar-agua',
    prueba: (s, i) =>
      aqui(s) !== 'patio' && aqui(s) !== 'orilla' ? null : ({
        skill: 'POW', difficulty: 'regular',
        reason: i.sustained ? 'sostener la mirada sobre el agua quieta' : 'asomarte al agua y observar el reflejo',
        stakes_success: 'ves lo que hay que ver y podés apartar la vista cuando querés',
        stakes_failure: 'la mirada se te va sola, y tardás en volver',
        penalty_dice: i.sustained ? 1 : 0,
        modifier_reason: i.sustained ? 'mirar sostenidamente es exponerse más' : '',
      }),
    resolver: ({ estado, intencion, tirada, variante }) => {
      const donde = aqui(estado);
      if (donde !== 'patio' && donde !== 'orilla') {
        return { texto: ['Desde acá no ves el agua. El aljibe está en el patio; la laguna, más allá del pastizal.'] };
      }

      if (donde === 'orilla') {
        return {
          texto: [variante([
            'La laguna es ancha y baja, y no tiene olas. Los pájaros de la orilla caminan paralelos al agua, nunca hacia ella. ' +
            'El cielo está entero ahí adentro, del derecho, sin una arruga.\n\n' +
            'Es la misma quietud del aljibe, pero repartida en cien hectáreas: más grande, y por eso más fácil de no ver.',
            'Volvés a mirar la laguna. Sigue sin tener olas. Cien hectáreas de agua sin una sola onda es una cosa que uno mira dos veces y sigue sin poder sostener.',
          ])],
          exposicion: {
            amount: intencion.sustained ? 3 : 2, source: 'laguna:mirar',
            cause: 'observar la superficie de la Laguna Mansa',
          },
        };
      }

      const apertura = {
        texto: [variante([
          'Te inclinás sobre el brocal. El agua está a menos de dos metros y se ve el fondo, el musgo en los ladrillos, ' +
          'una moneda vieja. No hay una sola onda. Ni siquiera donde debería haberla, alrededor de tu propio aliento.\n\n' +
          'Tu cara está ahí abajo, mirándote.',
          'Volvés al brocal. Ahí está tu cara otra vez, esperándote con la paciencia de quien no tiene otra cosa que hacer.',
          'Te asomás de nuevo. A esta altura ya sabés qué vas a ver y lo ves igual, que es lo peor.',
        ])],
      };

      const exposicion = {
        exposicion: {
          amount: intencion.sustained ? 6 : 3, source: 'aljibe:mirar',
          cause: intencion.sustained
            ? 'observación deliberada y sostenida del agua del aljibe'
            : 'asomarse al agua del aljibe',
        },
      };

      // Una pifia en esta tirada no es «perdiste el hilo un rato»: es la
      // versión mala de eso. 96-100 (o sólo 100 con POW ≥50) siempre pierde,
      // y acá pierde peor —lo que en la mesa el manual deja a criterio del
      // Keeper, escrito de antemano porque acá no hay uno en vivo.
      if (tirada?.grado === 'fumble') {
        return [apertura, {
          texto: [
            'Pasa un rato largo. Cuando por fin lográs apartar la vista, no fue decisión tuya: fue Rosa, ' +
            'sacudiéndote del hombro y diciendo tu nombre por segunda o tercera vez.\n\n' +
            'No sabés cuánto estuviste así. No sabés, tampoco, en qué momento dejaste de mirar vos y empezaste ' +
            'a ser mirado.',
          ],
          estabilidad: { amount: -14, cause: 'perder el control de la mirada, no sólo la cuenta del tiempo' },
        }, exposicion];
      }
      if (!tirada?.exito) {
        return [apertura, {
          texto: [variante([
            'Pasa un rato. No sabrías decir cuánto. Cuando te enderezás tenés las manos frías y la sensación incómoda de haber estado por entender algo que se te fue.',
            'Perdés el hilo. Volvés en vos con la nuca dura y el sol en otro lugar del cielo.',
          ])],
          estabilidad: { amount: -5, cause: 'perder la cuenta del tiempo sobre el agua' },
        }, exposicion];
      }

      // Un crítico (01) es éxito automático, como cualquier éxito. La
      // diferencia que declara esta escena es que sale limpio: se entiende lo
      // mismo, sin que la comprensión cueste tanto.
      const critico = tirada.grado === 'critical';

      // Lo que se descubre depende de lo que TODAVÍA NO SE DESCUBRIÓ, no de
      // cuántas veces se intentó. Atado a los intentos, si la primera tirada
      // fallaba la pista del retardo quedaba fuera de alcance para siempre.
      if (!pista(estado, 'retardo perceptible')) {
        return [apertura, {
          texto: [
            'Y entonces lo notás, porque estabas atento: cuando ladeás la cabeza, la cara del agua ladea la cabeza una fracción de segundo después. Poco. Lo que tarda un vidrio de tren. Pero un vidrio de tren tiene una excusa.'
            + (critico
              ? '\n\nLo notás sin esfuerzo, además, como quien encuentra algo que en realidad estaba buscando: no te cuesta creerlo. Eso, después, te va a costar más que el descubrimiento en sí.'
              : ''),
          ],
          pistas: [{
            description: 'El reflejo del aljibe imita al observador con un retardo perceptible, constante, de una fracción de segundo.',
            kind: 'experiential', source: 'observación directa del aljibe', reliability: 'reliable',
          }],
        }, exposicion];
      }

      if (!pista(estado, 'aumenta con la velocidad')) {
        return [apertura, {
          texto: [variante([
            'El retardo sigue ahí. Lo medís contra tu propio pulso: uno, y la cara de abajo llega en el uno y medio.',
            'Probás a moverte rápido, a ver si el retraso se agranda. Se agranda. La cara del agua completa el gesto que vos ya dejaste de hacer.',
          ])],
          pistas: [{
            description: 'El retardo del reflejo aumenta con la velocidad del movimiento: no es un efecto óptico constante.',
            kind: 'experiential', source: 'observación repetida del aljibe', reliability: 'reliable',
          }],
          // Con un crítico, entender esto no descoloca: se comprueba y listo.
          ...(critico ? {} : { estabilidad: { amount: -5, cause: 'comprobar que el retardo responde al movimiento' } }),
        }, exposicion];
      }

      return [apertura, {
        texto: [variante([
          'Cerrás los ojos y contás hasta cinco. Cuando los abrís, la cara del agua todavía los tiene cerrados. No mucho tiempo. El suficiente.',
          'Todo sigue igual que la última vez, y eso ya no es un consuelo: significa que es estable, y las cosas estables se pueden estudiar, y algo que se puede estudiar existe.',
        ])],
      }, exposicion];
    },
  },

  {
    id: 'placa-fotografica',
    prueba: (s) => propiedadVista(s, 'it-fotoreciente') ? null : ({
      skill: 'fotografia', difficulty: 'regular',
      reason: 'leer la placa como quien revela una foto, no como quien mira un objeto',
      stakes_success: 'notás lo que hay en el círculo de agua',
      stakes_failure: 'sólo ves un aljibe fotografiado con demasiado cuidado',
    }),
    resolver: ({ estado, tirada, variante }) => {
      if (propiedadVista(estado, 'it-fotoreciente')) {
        return { texto: [`Volvés sobre la placa. ${oculta(estado, 'it-fotoreciente')}`] };
      }
      if (!tirada?.exito && !conCamara(estado)) {
        return {
          texto: [variante([
            'La levantás contra la luz y la mirás un buen rato. Un aljibe. El brocal, la roldana sin soga, el círculo del agua abajo.\n\nAlguien se tomó el trabajo de encuadrar esto con mucho cuidado, y después de darla vuelta contra la pared.',
            'La mirás otra vez. Sigue siendo un aljibe fotografiado con una atención que no le corresponde a un aljibe.',
          ])],
        };
      }
      return [
        {
          texto: ['Levantás la placa contra la ventana. El encuadre es de alguien que sabía exactamente qué quería fotografiar, y eso ya dice algo.'],
          descubre: {
            itemId: 'it-fotoreciente', propertyId: 'p-rec-figura',
            how: 'estudiando la placa contra la luz',
          },
        },
        {
          texto: [oculta(estado, 'it-fotoreciente')],
          pistas: [{
            description: 'En la placa que tomó Ignacio hay un hombre reflejado en el agua del aljibe, mirando hacia la cámara. No había nadie en el patio.',
            kind: 'physical', source: 'placa fotográfica de Ignacio Vera', reliability: 'reliable',
          }],
          exposicion: { amount: 4, source: 'placa-figura', cause: 'ver la figura en el reflejo de la placa' },
        },
      ];
    },
  },

  {
    id: 'revisar-paginas',
    prueba: (s) => s.documents['doc-carta']?.obtainedAt ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'revisar el cuaderno hoja por hoja',
      stakes_success: 'encontrás algo que Ignacio guardó entre las páginas',
      stakes_failure: 'sólo cuentas de almacén y una lista de nombres de vacas',
    }),
    resolver: ({ estado, tirada, variante }) => {
      if (estado.documents['doc-carta']?.obtainedAt) {
        return { texto: ['Ya encontraste lo que había entre las hojas. Está en tus documentos.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [variante([
            'Lo sacudís por el lomo y lo hojeás dos veces. Cuentas del almacén. Una lista de nombres de vacas. Nada más.',
            'Otra pasada, hoja por hoja, con más paciencia. Nada todavía. Podés seguir intentando.',
          ])],
        };
      }
      return {
        texto: ['Entre las últimas hojas hay un papel doblado en cuatro, de otro papel y de otra tinta.'],
        documento: { id: 'doc-carta', how: 'estaba doblada en cuatro entre las últimas hojas' },
        pistas: [{
          description: 'En 1897 desapareció un hombre en el mismo aljibe. No hubo cuerpo. La viuda sostuvo que siguió viéndolo tres días, con la cara más vieja.',
          kind: 'documentary', source: 'carta del Dr. Emilio Rausch, 1911', reliability: 'reliable',
        }],
        estabilidad: { amount: -5, cause: 'un testimonio de 1911 que describe lo mismo' },
      };
    },
  },

  {
    id: 'leer-cuaderno',
    resolver: ({ estado }) => {
      if (estado.documents['doc-cuaderno']?.obtainedAt) {
        return { texto: ['Volvés sobre el cuaderno. Ya lo leíste entero; está en tus documentos.'] };
      }
      if (aqui(estado) !== 'cuarto') {
        return { texto: ['El cuaderno estaba en el cuarto de Ignacio, sobre el cajón que le hacía de mesa.'] };
      }
      return {
        texto: ['Es un cuaderno de tapas de hule, de los que se venden en el almacén. La letra empieza prolija y se va apurando. Lo leés entero de pie, sin sentarte.'],
        documento: { id: 'doc-cuaderno', how: 'lo levantás del cajón y lo leés de principio a fin' },
        pistas: [
          {
            description: 'Ignacio medía el nivel del aljibe y no bajaba, aunque sacara dos baldes por día durante diecinueve días.',
            kind: 'documentary', source: 'cuaderno de Ignacio Vera', reliability: 'reliable',
          },
          {
            description: 'Ignacio concluyó que el agua "guarda" como una placa fotográfica, por un fenómeno mineral de la napa.',
            kind: 'documentary', source: 'cuaderno de Ignacio Vera', reliability: 'false',
          },
        ],
        pregunta: '¿Qué quiso decir Ignacio con "tengo que ver si estoy"?',
        estabilidad: { amount: -5, cause: 'la última entrada del cuaderno' },
        // La consecuencia NO es «aprendiste algo»: es que quedaste anotado.
        // Alcance mundo y permanente, que es lo único que `sembrarHerencia`
        // deja cruzar a la aventura siguiente — y lo que le permite al
        // Círculo Rojo saber, más adelante, quién anduvo preguntando. El
        // fragmento «del Círculo Rojo» es el que buscan las condiciones.
        consecuencia: {
          description: 'Leyó lo que Ignacio anotó sobre la marca del Círculo Rojo en el brocal de Los Álamos.',
          scope: 'world',
          permanent: true,
          worldReminder:
            'Sabe que Rosa repinta ese círculo todos los inviernos y que se calló cuando le preguntaron si ' +
            'había visto otro igual en otro campo. Ese silencio tiene dueño, y el dueño se entera.',
        },
      };
    },
  },

  {
    // Regla de escenario, no del motor: Rosa no habla en el patio de noche.
    // Vivía escrita a mano dentro del resolvedor social; acá es una escena más.
    id: 'rosa-no-habla-de-noche',
    resolver: () => ({
      texto: ['—Adentro —dice Rosa desde el umbral, sin salir—. Yo acá afuera de noche no hablo.'],
    }),
  },
  // == RAMAS QUE VIVIAN DENTRO DE LOS VERBOS GENERICOS ======================
  // El espejo, el farol, gritar, romper, cavar, dormir, tocar el agua. Cada
  // una era un `if` de Agua Quieta dentro de un verbo del motor. Mientras
  // estuvieran ahi, la segunda aventura no podia tener su propia version de
  // "romper algo" sin editar el resolvedor.

  {
    id: 'espejo-sobre-aljibe',
    antes: (s) => propiedadVista(s, 'it-espejo') ? null : ({
      texto: ['Te parás de espaldas al brocal y levantás el espejo hasta que el agua aparece adentro del marco.'],
    }),
    prueba: (s) => propiedadVista(s, 'it-espejo') ? null : ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'comparar dos reflejos del mismo gesto al mismo tiempo',
      stakes_success: 'ves cuál de los dos llega tarde',
      stakes_failure: 'dos reflejos, y el cuello torcido',
    }),
    resolver: ({ estado, tirada, variante }) => {
      const texto = estado.items['it-espejo']?.conditionalProperties[0]?.description ?? '';
      if (propiedadVista(estado, 'it-espejo')) return { texto: [texto] };
      if (!tirada?.exito) {
        return {
          texto: [variante([
            'Sostenés el espejo un rato largo, buscando el ángulo. Ves tu cara dos veces y las dos te miran igual. ' +
            'Puede ser que no haya nada. Puede ser que no lo estés viendo.',
            'Probás de nuevo, con el brazo más alto. Nada concluyente todavía.',
          ])],
        };
      }
      return [
        {
          descubre: {
            itemId: 'it-espejo', propertyId: 'p-espejo-indirecto',
            how: 'mirando el aljibe a través del espejo en vez de asomarse',
          },
        },
        {
          texto: [texto],
          pistas: [{
            description: 'El retardo del reflejo se hace evidente al comparar el aljibe con un espejo. El agua parece no registrar a quien no la mira de frente.',
            kind: 'experiential', source: 'experimento con el espejo de mano', reliability: 'reliable',
          }],
          exposicion: { amount: 2, source: 'aljibe:espejo', cause: 'observar el aljibe de forma indirecta' },
        },
      ];
    },
  },

  {
    id: 'romper-espejo',
    resolver: () => ({
      texto: ['El espejo se parte contra el ladrillo. Los pedazos quedan boca arriba en la tierra, cada uno con su porción de cielo, y todos con la misma fracción de segundo de retraso.'],
      exposicion: { amount: 4, source: 'espejo-roto', cause: 'ver el fenómeno multiplicado en los fragmentos' },
      npc: { id: 'npc-rosa', attitudeDelta: -15, cause: 'le rompieron el espejo' },
      consecuencia: {
        description: 'El investigador rompió el espejo de mano de Rosa.', scope: 'location', permanent: true,
        worldReminder: 'El espejo de Rosa está roto. Ella lo notó y no lo dijo.',
      },
    }),
  },

  {
    id: 'encender-farol',
    resolver: ({ estado }) => ({
      tiempo: { minutes: 1, reason: 'encender el farol' },
      texto: [esDeNoche(estado)
        ? 'Encendés el farol. El círculo de luz llega hasta el brocal y ahí se detiene, más nítido de lo que la física recomienda.'
        : 'Encendés el farol, aunque todavía hay luz. La llama se queda perfectamente vertical.'],
    }),
  },

  {
    id: 'gritar-al-aljibe',
    resolver: ({ estado, variante }) => {
      const primeraVez = !pista(estado, 'no devuelve eco');
      const rosaAca = Boolean(estado.npcs['npc-rosa']?.present)
        && Boolean(estado.world.locations['patio']?.npcsPresent.includes('npc-rosa'));
      return [
        {
          texto: [variante([
            'Gritás el nombre hacia el aljibe. La voz sale, cruza el patio y se va al campo.\n\nEl aljibe no devuelve eco. Un pozo de dos metros con agua abajo devuelve eco. Este no.',
            'Volvés a llamar. Nada. Ni siquiera el eco que te devolvió la primera vez, que tampoco fue.',
          ])],
          exposicion: { amount: 3, source: 'aljibe:llamar', cause: 'gritar hacia el aljibe y no recibir eco' },
          pistas: primeraVez ? [{
            description: 'El aljibe no devuelve eco, aunque tiene la profundidad y el agua para hacerlo.',
            kind: 'experiential' as const, source: 'llamar hacia el aljibe', reliability: 'reliable' as const,
          }] : [],
        },
        rosaAca ? {
          texto: ['Rosa se mete en la casa sin decir nada y cierra la puerta con el hombro.'],
          npc: { id: 'npc-rosa', attitudeDelta: -5, cause: 'gritarle al aljibe delante de ella' },
        } : {},
      ];
    },
  },

  {
    id: 'romper-el-brocal',
    prueba: () => ({
      skill: 'STR', difficulty: 'hard',
      reason: 'romper el brocal a golpes',
      stakes_success: 'saltan lascas de piedra',
      stakes_failure: 'la piedra aguanta y vos no',
    }),
    resolver: ({ tirada }) => ({
      texto: [tirada?.exito
        ? 'Saltan un par de lascas y se te va el brazo. El brocal tiene doscientos años de estar ahí y piensa quedarse.'
        : 'La piedra no cede. Te queda la mano ardiendo y la sensación ridícula de haberle pegado a una pared.'],
      dano: { amount: 1, cause: 'golpearse la mano contra la piedra' },
    }),
  },

  {
    id: 'cavar-junto-al-aljibe',
    antes: () => ({ tiempo: { minutes: 45, reason: 'cavar en el patio' } }),
    prueba: () => ({
      skill: 'STR', difficulty: 'regular',
      reason: 'cavar junto al aljibe',
      stakes_success: 'llegás a lo que hay abajo',
      stakes_failure: 'tierra apisonada y nada más',
    }),
    resolver: ({ tirada }) => tirada?.exito
      ? {
          texto: [
            'Cuarenta y cinco minutos de pala. A medio metro la tierra se pone húmeda, y a los sesenta centímetros ' +
            'aparece agua: la misma napa. Se queda quieta en el pozo que acabás de hacer, en el acto, sin decantar.',
          ],
          pistas: [{
            description: 'La napa está a sesenta centímetros y el agua se queda inmóvil apenas aflora, incluso en un pozo recién cavado.',
            kind: 'physical' as const, source: 'excavación en el patio', reliability: 'reliable' as const,
          }],
          exposicion: { amount: 5, source: 'napa-cavada', cause: 'ver el fenómeno en agua recién descubierta' },
        }
      : { texto: ['Cuarenta y cinco minutos de pala para nada. Tierra apisonada, un pedazo de loza, la ampolla del pulgar.'] },
  },

  {
    id: 'dormir',
    resolver: ({ estado }) => {
      const exp = estado.investigators[estado.activeInvestigator]?.umbral.exposure ?? 0;
      const base = {
        tiempo: { minutes: 300, reason: 'dormir' },
        estabilidad: { amount: 5, cause: 'descanso' },
      };
      if (exp < 20) {
        return { ...base, texto: ['Dormís unas horas en el catre del cuarto de al lado. Sin sueños que valga la pena contar.'] };
      }
      return {
        ...base,
        texto: [
          'Dormís mal. Soñás con el patio de día, con la luz exacta de esta tarde, y en el sueño el aljibe está tapado ' +
          'con tablas que todavía no pusiste. Te despertás con la certeza de haberlo visto, no de haberlo soñado.',
        ],
        exposicion: { amount: 3, source: 'sueno', cause: 'un sueño con contenido que no le pertenece' },
      };
    },
  },

  {
    id: 'tocar-el-agua',
    resolver: () => ({
      texto: ['El agua no opone nada. Ni frío de más, ni corriente, ni el tironeo mínimo que tiene siempre el agua de un pozo. Sacás la mano seca antes de darte cuenta de que la sacaste seca.'],
      exposicion: { amount: 5, source: 'aljibe:tocar', cause: 'contacto físico con el agua quieta' },
      estabilidad: { amount: -4, cause: 'sacar la mano seca del agua' },
    }),
  },
];
