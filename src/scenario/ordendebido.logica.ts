/**
 * LA LÓGICA DE LAS ESCENAS DE EL ORDEN DEBIDO — lo único que no puede ser dato.
 *
 * Todo lo demás vive en `orden-debido.contenido.json`.
 *
 * Lo propio de esta sexta aventura:
 *
 *   1. ES LA PRIMERA QUE VUELVE. Las cinco anteriores iban hacia afuera; ésta
 *      cruza el partido hacia adentro, cerrando los puntos del mapa de Delfina
 *      Arce que quedaron colgando desde 1926. Cada locación está más al oeste
 *      que la anterior y termina a la vista del pueblo que nadie nombra.
 *
 *   2. EL TEMA ES CAUSALIDAD, y el motor ya era una máquina de causalidad
 *      antes de que la aventura existiera: `sembrarHerencia` viene arrastrando
 *      consecuencias permanentes desde Agua Quieta. Acá esa mecánica se vuelve
 *      el asunto. La pregunta no es qué son estos lugares: es cuál fue primero.
 *
 *   3. LA IMAGEN CENTRAL ES UN UMBRAL LITERAL. El marco de una puerta sin
 *      casa, pintado en las cuatro caras cuando dos de ellas todavía estaban
 *      adentro. Estaba escrito en el contenido de El Invierno Debido —el mapa
 *      de la escuela— desde hacía dos aventuras y nadie lo había visitado.
 *
 *   4. ESTRENA TRES HABILIDADES. `mecanica` y `credito` no se habían pedido
 *      NUNCA en cinco aventuras, y `orientarse` se había pedido una sola vez.
 *      Acá son los tres pilares: medir una base, que te abran una tranquera, y
 *      reconstruir cuándo estás parado.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CANON. Sexto Umbral — causalidad (Biblia v0.7 §11, y `canon.ts`). Se apoya
 * además en §4 (memoria futura incompleta, desordenada o mal interpretada) y
 * en §2 (reciprocidad). El reflejo que tarda de Agua Quieta vuelve acá con el
 * signo invertido: lo que cruza el vano no llega tarde, llega temprano.
 *
 * NO ASCIENDE NADA A CANON NUEVO, y sobre todo NO ENTRA AL PUEBLO. El obelisco
 * se ve de lejos y no se nombra; el módulo original es la séptima. Ver
 * `CANON-MODULO-ORIGINAL.md`.
 */

import type { GameState } from '../shared/types.ts';
import type { LogicaDeEscenas } from './cargarAventura.ts';
import { evaluarCondicion } from './condiciones.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const consecuencia = (s: GameState, frag: string) =>
  s.consequences.some((c) => c.description.includes(frag));
const documento = (s: GameState, id: string) => Boolean(s.documents[id]?.obtainedAt);
const aqui = (s: GameState) => s.world.currentLocation;
/** Lleva su propia libreta de actas —`Ocupacion.itemInicial` de comisario de campaña. */
const conLibretaActas = (s: GameState) =>
  evaluarCondicion({ op: 'lleva', item: 'it-libreta-actas' }, { estado: s });

// ══ ECOS DE LAS CINCO ANTERIORES ═══════════════════════════════════════════
//
// Ésta es la aventura donde más rinden, porque su tema ES la cadena de
// consecuencias. Todos son narrativos salvo donde se aclara.

/** Agua Quieta: sostuvo la mirada al aljibe hasta que contestó, o bajó adentro. */
const vioElReflejoTardar = (s: GameState) =>
  consecuencia(s, 'sostuvo la mirada hasta que el fenómeno del aljibe respondió')
  || consecuencia(s, 'bajó al aljibe de Los Álamos');

/** La Legua Perdida: caminó la línea del oeste y volvió contando. */
const caminoLaLineaAntes = (s: GameState) =>
  consecuencia(s, 'caminó el alambrado del oeste de punta a punta');

/** La Legua Perdida: levantó el acta que demostraba y no le sirvió a nadie. */
const demostroYNoSirvio = (s: GameState) =>
  consecuencia(s, 'Se levantó un acta con la medición del lado oeste');

/** La Firma Ajena: tuvo que decidir si un papel decía la verdad sobre alguien. */
const juzgoUnaIdentidad = (s: GameState) =>
  consecuencia(s, 'avaló la identidad de Alejo Ferreyra')
  || consecuencia(s, 'desmintió la identidad del hombre que dice ser Alejo Ferreyra');

/** El Invierno Debido: pintó el círculo con sus propias manos y quedó anotado. */
const pintoElTurno = (s: GameState) => consecuencia(s, 'cumplió el turno de 1926');

/** El Invierno Debido: sacó el libro del pueblo. */
const llevoElLibro = (s: GameState) => consecuencia(s, 'para llevarlo a un juzgado');

/** El Sueño Debido: bajó al fondo del brocal del sueño. */
const bajoAlSueno = (s: GameState) => consecuencia(s, 'bajó tres veces al sueño de Villa Requena');

/** El Sueño Debido: se anotó en la quinta hoja en lugar de Aurelio. */
const seAnotoEnLaLista = (s: GameState) => consecuencia(s, 'se anotó en la quinta hoja');

/**
 * Cuántas veces eligió irse sin contestar. Mismo criterio que El Sueño Debido:
 * las tres que registran esa decisión la escriben con el mismo prefijo.
 */
const vecesQueSeFue = (s: GameState) =>
  s.consequences.filter((c) => c.description.includes('El investigador se fue de')).length;

export const ORDEN_DEBIDO_LOGICA: LogicaDeEscenas = [
  // ══ VILLA REQUENA ════════════════════════════════════════════════════════

  {
    id: 'leer-carta',
    resolver: ({ estado }) => {
      if (documento(estado, 'doc-carta')) {
        return { texto: ['La volvés a leer. La posdata sigue diciendo lo mismo, y sigue siendo lo peor: el punto que faltaba para que el mapa cerrara lo puso ella, después de que vos preguntaras.'] };
      }
      return {
        texto: [
          'La sacás del bolsillo. Está doblada en cuatro y con el doblez blando de haberla leído en el tren.',
          'Delfina escribe como habla: sin adornos y sin pedir permiso. Dice que no le escribe por Aurelio. Dice que fue a Del Valle en noviembre, que encontró el renglón del setenta y ocho y que no se lo manda por carta.',
          'Y dice que volviendo, desde la ventanilla, reconoció un lugar que tenía anotado sin saber dónde quedaba, por cómo se lo habían contado. Que lo puso en el mapa y que con ése los puntos quedaron en línea.',
          'La posdata está escrita con otra tinta, después, seguramente en otro momento del día: que el punto que faltaba para que cerrara lo puso ella el año pasado, después de que vos preguntaras por el brocal. Y que eso es lo que no la deja dormir.',
        ],
        documento: { id: 'doc-carta', how: 'la venías leyendo en el tren' },
      };
    },
  },

  {
    id: 'medir-mapa',
    // La regla del pizarrón y las marcas del canto. No es una tirada de
    // Descubrir: el dato ya está a la vista y Delfina lo dijo. Lo que hace
    // falta es medir, que es trabajo y no perspicacia.
    resolver: ({ estado }) => ({
      texto: [
        'Le pedís la regla. Delfina te la alcanza sin decir nada y se corre de adelante del mapa, y en cómo se corre se nota que esperaba que alguien lo hiciera.',
        'Los siete puntos, medidos, no están en una recta: están en un arco. Un arco abierto, larguísimo, que se va cerrando de a poco, y que si se lo prolonga con la regla apoyada de canto termina rodeando una zona del oeste.',
        'Y ahí, en el medio, el mapa impreso tiene el nombre de un pueblo y Delfina no marcó nada. Ni un punto, ni una raya, ni una nota al margen. Es el único vacío del papel.',
        caminoLaLineaAntes(estado)
          ? 'Y mientras medís, contás los puntos en voz alta sin decidirlo, porque desde el alambrado del oeste no podés tener una fila de cosas delante y no contarla. Siete. Los contás tres veces y las tres veces son siete, y eso te tranquiliza de una manera que sabés que no corresponde.'
          : '',
        demostroYNoSirvio(estado)
          ? 'Medís como mediste aquella vez: tres pasadas, anotando cada una, buscando el error propio antes que el ajeno. Te sale solo. Es el mismo gesto que terminó en un acta impecable que no le sirvió a nadie para nada.'
          : '',
      ].filter(Boolean),
      exposicion: { amount: 4, source: 'mapa:arco', cause: 'medir el arco y ver qué rodea' },
      estabilidad: { amount: -3, cause: 'que el vacío del mapa esté en el medio y no en el borde' },
      descubre: { itemId: 'it-mapa', propertyId: 'p-mapa-linea', how: 'midiendo con la regla del pizarrón en vez de mirar el dibujo', comparedWith: 'el orden en que Delfina los anotó' },
      pistas: [{
        description: 'Medidos con regla, los siete puntos del mapa forman un arco abierto que se cierra despacio alrededor de una zona del oeste donde Delfina nunca marcó nada.',
        kind: 'documentary' as const, source: 'el mapa de la escuela', reliability: 'reliable' as const,
      }],
    }),
  },

  {
    id: 'copiar-mapa',
    // No se lleva el mapa: lo copia. El original se queda clavado con cuatro
    // chinches, y eso importa para dos de los cuatro desenlaces —quemar la
    // copia no apaga el original, y ella lo va a volver a medir el mes que
    // viene—.
    resolver: () => ({
      texto: [
        'Le pedís papel. Delfina te da una hoja de cuaderno cuadriculado y se sienta enfrente a mirar cómo lo copiás, que es su manera de no ayudar y no irse.',
        'Copiás los siete puntos, el arco, y el vacío del medio. El original se queda donde está, clavado con cuatro chinches.',
        'Cuando terminás, ella mira tu hoja un rato largo.',
        '—Ahora somos dos —dice.',
        'Y no se le nota si eso la alivia.',
      ],
      pistas: [{
        description: 'Copió el mapa a mano en una hoja de cuaderno. El original sigue clavado en la pared del aula.',
        kind: 'documentary' as const, source: 'la escuela de Villa Requena', reliability: 'reliable' as const,
      }],
    }),
  },

  {
    id: 'curato',
    resolver: ({ estado }) => ({
      texto: [
        'Delfina te alcanza las tres hojas dobladas y se pone a corregir cuadernos para no mirarte leer.',
        'Los dos primeros asientos son de rutina y son terribles por eso: un bautismo de urgencia en junio de 1878, sin nombre del bautizado «por hallarse el sujeto impedido de declararlo», y al margen, con otra tinta, «no consta defunción». Y el pedido de 1881 de Evaristo Requena para dejar constancia de que su hermano Benicio no ha fallecido.',
        'El tercero no es del libro. Es media hoja suelta, metida entre los folios de 1878 y 1879, escrita con la misma letra de las notas al margen:',
        '«Queda anotado el que fue en lugar de otro. La cuenta no se altera: se corre. Lo que se debía en el setenta y ocho se debe igual, y se debe en otra parte.»',
        'Abajo, una circunferencia atravesada por una línea vertical.',
        seAnotoEnLaLista(estado)
          ? 'Leés «se corre» dos veces. Después una tercera. Vos escribiste tu apellido en un renglón fresco hace un año, con la mano, en una hoja que tampoco estaba cosida a ningún libro. Si la cuenta no se altera y se corre, entonces lo que hiciste no canceló nada: lo mudó, y lo mudó a vos.'
          : 'La palabra es «se corre», y no «se salda» ni «se perdona». Quien escribió esa media hoja tenía muy claro que lo que estaba anotando no era un pago.',
      ].filter(Boolean),
      exposicion: { amount: 6, source: 'curato:hoja', cause: 'una hoja que no es del libro y explica la contabilidad' },
      estabilidad: { amount: -5, cause: 'que la cuenta no se salde nunca, sólo cambie de lugar' },
      documento: { id: 'doc-curato', how: 'copiada a mano por Delfina en el curato de Del Valle' },
      pistas: [{
        description: 'Entre los folios de 1878 del curato hay media hoja que no es del libro: «Queda anotado el que fue en lugar de otro. La cuenta no se altera: se corre.» Firmada con la circunferencia atravesada del Círculo Rojo.',
        kind: 'documentary' as const, source: 'la copia del curato de Del Valle', reliability: 'reliable' as const,
      }],
    }),
  },

  {
    id: 'libro-fiado',
    prueba: () => ({
      skill: 'descubrir', difficulty: 'regular',
      reason: 'encontrar un renglón que se repite entre trescientos que no',
      stakes_success: 'ver qué entra al pueblo dos veces por año',
      stakes_failure: 'cuentas de bolsas y kerosén',
    }),
    resolver: ({ estado, tirada }) => {
      const exito = Boolean(tirada?.exito) || conLibretaActas(estado);
      return {
      texto: [
        'El almacenero te deja mirar el cuaderno del fiado con la indiferencia de quien no tiene nada que esconder y tampoco ganas de charlar.',
        exito
          ? 'Entre bolsas, kerosén y yerba hay un renglón que se repite dos veces por año, siempre en marzo y en septiembre, siempre por la misma cantidad: «almagre, preparado, 1 lata», a nombre de Ubaldo Leiva.\n\nPreguntás quién lo trae. El almacenero dice que ya viene con el pedido general, desde la cabecera, y que él lo único que hace es apartarlo. Nunca le pareció una pregunta.'
          : 'Trescientos renglones de bolsas, kerosén, yerba y grasa de eje, en cuatro letras distintas de cuatro almaceneros distintos. Si hay algo raro ahí adentro, no salta a la primera pasada.',
      ],
      // Marcador INCONDICIONAL. Regla que este proyecto ya aprendió dos veces
      // por bug reportado jugando: la pista que apaga el botón no puede
      // depender de acertar la tirada, o quien falla se queda con la acción
      // ofrecida para siempre. Lo que cambia con el éxito es la pista rica.
      pistas: [
        {
          description: 'Revisó el libro de fiado del almacén, renglón por renglón.',
          kind: 'documentary' as const, source: 'el almacén de Villa Requena', reliability: 'reliable' as const,
        },
        ...(exito ? [{
          description: 'Al almacén llega, dos veces al año y con el pedido general de la cabecera, una lata de almagre ya preparado a nombre de Ubaldo Leiva. Nadie sabe quién la manda.',
          kind: 'documentary' as const, source: 'el libro de fiado del almacén', reliability: 'reliable' as const,
        }] : []),
      ],
      ...(exito
        ? { exposicion: { amount: 2, source: 'almacen:fiado', cause: 'un pedido que llega solo desde hace décadas' } }
        : {}),
      };
    },
  },

  // ══ EL CAMPO DEL MARCO ═══════════════════════════════════════════════════

  {
    id: 'mano',
    // La escena central de la aventura, y a propósito NO tiene tirada: mirarse
    // la propia mano no es una habilidad. Lo que pasa, pasa.
    resolver: ({ estado }) => ({
      texto: [
        'No cruzás. Estirás el brazo y pasás la mano al otro lado, y la mirás.',
        'La mano está donde tiene que estar. Los dedos son los tuyos. No hay frío, ni cosquilleo, ni nada de lo que uno esperaría después de un año como el que tuviste.',
        'Movés el índice.',
        'Y el índice del otro lado ya se había movido. No mucho antes: lo que tarda un parpadeo, lo que tarda el aire en salir de la boca antes de que suene la palabra. Pero primero se movió y después lo decidiste, y eso lo viste con los ojos abiertos y a plena luz de marzo.',
        vioElReflejoTardar(estado)
          ? 'Y ahí lo entendés, porque ya lo viste una vez del otro lado: en Los Álamos el reflejo llegaba tarde. Acá la mano llega temprano. Es la misma cosa medida desde el otro extremo, y saber eso no te tranquiliza ni un poco.'
          : 'Sacás la mano. La volvés a pasar. Pasa igual, las veces que quieras, con la puntualidad de un mecanismo bien hecho.',
        'Ubaldo, a veinte metros, no está mirando. Se dio vuelta antes de que estiraras el brazo.',
      ],
      exposicion: { amount: 9, source: 'marco:mano', cause: 'la propia mano moviéndose antes de la orden' },
      estabilidad: { amount: -7, cause: 'ver el efecto llegar antes que la causa, en la propia mano' },
      cordura: {
        amount: 3,
        cause: 'que la propia mano se adelante a la decisión de moverla',
      },
      pistas: [{
        description: 'Pasando sólo la mano por el vano del marco, la mano se le adelanta: el dedo del otro lado se mueve una fracción antes de que él decida moverlo. Repetible a voluntad.',
        kind: 'experiential' as const, source: 'el marco del campo de Leiva', reliability: 'reliable' as const,
      }],
      contradiccion: {
        description: 'La mano cruza un vano que no tiene puerta, no está a otra temperatura y no lleva a ninguna parte, y del otro lado se mueve antes de que se le ordene.',
        between: 'lo que hay ahí / lo que hace',
      },
    }),
  },

  {
    id: 'cruzar',
    // ORIENTARSE, y no POD. Lo que se pone en juego no es aguantar: es saber
    // CUÁNDO estás parado cuando salís del otro lado. Es la habilidad que el
    // sistema tiene para «reconstruir un recorrido», aplicada a un recorrido de
    // tres pasos que salió desordenado. Se pidió UNA vez en cinco aventuras.
    prueba: (s) => ({
      skill: 'orientarse', difficulty: 'regular',
      reason: 'reconstruir en qué orden pasó lo que acaba de pasar',
      stakes_success: 'salís sabiendo qué parte todavía no ocurrió',
      stakes_failure: 'salís con todo junto y sin saber qué va antes',
      ...(pista(s, 'la mano se le adelanta')
        ? { bonus_dice: 1, modifier_reason: 'ya lo probaste con la mano y sabés qué esperar' }
        : {}),
    }),
    antes: () => ({
      texto: [
        'Son tres pasos. Se ve el horizonte del otro lado igual que a los costados, y no hay nada en el medio.',
        'Ubaldo se da vuelta y se va caminando para el rancho sin decir una palabra, y ésa es toda la opinión que va a dar.',
      ],
    }),
    resolver: ({ tirada, estado }) => {
      const firme = tirada?.exito ?? false;
      const pifio = tirada?.grado === 'fumble';
      return {
        texto: [
          'Cruzás.',
          'Del otro lado hay pasto, el mismo pasto, y la tarde sigue donde estaba. Por un segundo entero no pasa absolutamente nada y llegás a pensar que con vos no funciona.',
          'Después te acordás de cosas que no pasaron todavía.',
          firme
            ? 'No es una visión ni un desmayo: es exactamente la textura de acordarse. Te acordás de la cara de Adelmo Pais dejando la llave sobre la base. Te acordás de una mujer muy vieja diciendo una palabra que no es el nombre de un pueblo. Te acordás de vos mismo mirando una arboleda con el sol bajo.\n\nY podés ordenarlos. Con trabajo, como quien reconstruye un camino de vuelta: eso todavía no pasó, eso tampoco, eso es de recién. Sabés qué parte del atardecer te falta.'
            : pifio
              ? 'No es una visión ni un desmayo: es exactamente la textura de acordarse, y viene todo junto, sin orden y sin borde. Una llave sobre una base. Una mujer muy vieja. Una arboleda. Tu propia voz diciendo algo con una decisión que todavía no tomaste.\n\nY entre todo eso hay una cosa más, que no vas a poder ubicar nunca en el resto de tu vida: te acordás de estar cruzando este marco. No de ahora. De otra vez.'
              : 'No es una visión ni un desmayo: es exactamente la textura de acordarse, y viene todo junto y desordenado. Una llave sobre una base. Una mujer muy vieja diciendo una palabra. Una arboleda con el sol bajo. Sabés que son de esta tarde y no sabés en qué orden, y tratar de ordenarlos es como tratar de acordarse de un sueño mientras uno se está despertando.',
          'Cuando levantás la cabeza estás del otro lado del marco, con las dos manos en las rodillas, y no te acordás de haberte agachado.',
        ],
        exposicion: { amount: pifio ? 18 : 14, source: 'marco:cruzar', cause: 'cruzar el vano y traerse la tarde desordenada' },
        estabilidad: { amount: pifio ? -14 : firme ? -8 : -11, cause: 'acordarse de lo que todavía no pasó' },
        cordura: {
          amount: pifio ? 5 : firme ? 2 : 3,
          cause: 'la memoria de lo que no ocurrió, con la textura de lo que sí',
          crisis: {
            nombre: 'El adelanto',
            descripcion:
              'Desde el marco, cada tanto sabe lo que alguien va a decir un instante antes de que lo diga. Nunca lo suficiente para servir de algo y siempre lo suficiente para perder el hilo de la conversación. Lo peor no es acertar: es no poder distinguir, después, si acertó o si lo recordó al revés.',
            tipo: 'phobia' as const,
            afecta: [{ skill: 'psicologia', dados: 1 }],
          },
        },
        pistas: [{
          description: 'Cruzó el vano del marco y salió del otro lado acordándose de cosas de esa misma tarde que todavía no habían ocurrido. No fue una visión: tenía la textura de un recuerdo.',
          kind: 'experiential' as const, source: 'el marco del campo de Leiva', reliability: 'unknown' as const,
        }],
        ...(firme ? {
          jugadorNota: {
            statement: 'Su investigador acaba de recibir información del final de la tarde antes de que la tarde termine, y va a usarla sin poder citarla. Cuando dentro de un rato «se le ocurra» algo, tenga presente que puede no habérsele ocurrido.',
            source: 'el vano del marco',
            reliability: 'unknown' as const,
          },
        } : {}),
        consecuencia: {
          description: 'El investigador cruzó el vano del marco del campo de Leiva y volvió con recuerdos de lo que todavía no había pasado.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Cruzó un umbral que no era una puerta y la memoria le volvió desordenada. Eso no se deshace.',
        },
      };
    },
  },

  {
    id: 'tarro-luz',
    resolver: ({ estado }) => ({
      texto: [
        'Levantás la lata contra el sol de la tarde y la inclinás despacio, para que el polvo caiga en cortina.',
        'No es sólo tierra colorada. Entre el rojo hay una fracción más clara y más fina, molida aparte y mezclada después. Mineral, no vegetal. Y no de esta llanura, donde no hay una piedra en cien leguas.',
        pintoElTurno(estado)
          ? 'Y lo sabés con el cuerpo antes que con la cabeza, porque tuviste esta misma mezcla en las manos toda una noche de julio, apretando una brocha de cerda dura contra un brocal hasta que se te acalambró el pulgar. Es la misma. No parecida: la misma.'
          : 'Es la misma mezcla del tarro que hay en el estante de la escribanía de Villa Requena, a ocho leguas de acá, que alguien viene usando desde antes de que naciera nadie que se acuerde.',
        'Ubaldo dice que él no la prepara. Que la compra hecha. Que viene en la lata así.',
      ],
      exposicion: { amount: 5, source: 'tarro:mezcla', cause: 'la misma mezcla a ocho leguas de distancia' },
      descubre: { itemId: 'it-tarro', propertyId: 'p-tarro-igual', how: 'mirando el polvo contra la luz', comparedWith: 'el tarro de la escribanía de Villa Requena' },
      pistas: [{
        description: 'El almagre del tarro de Ubaldo es la misma mezcla que el de la escribanía de Villa Requena, a ocho leguas: tierra colorada con un mineral más fino molido aparte y agregado después. Ubaldo no la prepara: la compra hecha.',
        kind: 'physical' as const, source: 'el tarro del rancho de Leiva', reliability: 'reliable' as const,
      }],
      contradiccion: {
        description: 'Dos hombres que no se conocen, a ocho leguas uno del otro, pintan dos cosas distintas con una mezcla idéntica que ninguno de los dos prepara.',
        between: 'el tarro de la escribanía / el tarro del puesto',
      },
    }),
  },

  // ══ LA BASE SIN MOLINO ═══════════════════════════════════════════════════

  {
    id: 'pernos-medir',
    // MECÁNICA, primera vez en toda la campaña. Y es el lugar exacto donde
    // corresponde: la contradicción no se ve mirando, se ve midiendo una
    // separación de pernos y sabiendo qué modelo la usa.
    prueba: (s) => ({
      skill: 'mecanica', difficulty: 'regular',
      reason: 'leer una base y decir qué torre estuvo montada ahí',
      stakes_success: 'saber qué modelo pide esa separación, y desde cuándo existe',
      stakes_failure: 'cuatro fierros parados en el cemento',
      ...(pista(s, 'monta encima de bases que ya están')
        ? { bonus_dice: 1, modifier_reason: 'Adelmo ya te explicó que el trabajo es la base y no el molino' }
        : {}),
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Te arrodillás al lado de la base con la cinta del sulky y medís de perno a perno, y después las diagonales, que es como se mide en serio.',
        tirada?.exito
          ? 'La huella del asiento está marcada alrededor de cada perno: décadas de una torre apoyada ahí, con el óvalo de desgaste que deja el balanceo del viento año tras año. Eso no se falsifica y no se hace en una temporada.\n\nY la separación es de un metro sesenta con diagonal de dos veintiséis, que no es la medida de ninguna torre de las que se armaban cuando esta base se levantó. Es la medida de un modelo bastante posterior.'
          : 'Cuatro pernos de hierro forjado, parados, con la rosca entera. La mampostería está gastada alrededor y podría ser de cualquier cosa: agua, viento, sesenta años de pisadas. Para decir qué estuvo montado acá hace falta saber más de molinos que vos.',
        tirada?.grado === 'extreme' || tirada?.grado === 'critical'
          ? 'Y hay una cosa más, que hace falta haber medido muchas para ver: los pernos no fueron amurados con la base. Se los puso después, en agujeros abiertos a mano en cemento ya fraguado, y se los puso en la posición exacta que iba a hacer falta.'
          : '',
      ].filter(Boolean),
      exposicion: { amount: tirada?.exito ? 6 : 2, source: 'base:pernos', cause: 'una base gastada por lo que todavía no existía' },
      ...(tirada?.exito ? {
        estabilidad: { amount: -6, cause: 'el desgaste de décadas de algo posterior' },
        pistas: [{
          description: 'La base tiene el desgaste de décadas de una torre encima, y la separación de sus pernos corresponde a un modelo que no podía existir todavía cuando la base se levantó.',
          kind: 'physical' as const, source: 'la base sin molino', reliability: 'reliable' as const,
        }],
        contradiccion: {
          description: 'Una base de 1889 está gastada por una torre que se empezó a fabricar en 1911, y el desgaste es de décadas.',
          between: 'la fecha de la base / el modelo que la gastó',
        },
      } : {}),
    }),
  },

  {
    id: 'libreta-pedir',
    resolver: ({ estado }) => ({
      texto: [
        'Adelmo no te da la libreta. Se sienta en el estribo del sulky, se la apoya en la rodilla y la lee él en voz alta, que era exactamente lo que había dicho que iba a hacer.',
        'Campo, dueño, marca, modelo, fecha, y qué le hizo. Veintidós años. La letra grande de alguien que escribe apoyado en la rodilla.',
        'Los molinos que levantó cerca de los puntos de tu mapa son todos del mismo modelo. Lo dice sin que se lo señales, porque para él es la parte aburrida.',
        'Y las bases —lo repite sin darse cuenta de que lo está repitiendo— él no las hizo. Ya estaban.',
        juzgoUnaIdentidad(estado)
          ? 'Escuchás las columnas como aprendiste a escuchar un papel que dice quién es alguien: no lo que afirma, sino qué tendría que ser cierto para que lo que afirma sea posible. Y lo que tendría que ser cierto acá no lo es.'
          : '',
      ].filter(Boolean),
      exposicion: { amount: 4, source: 'libreta:modelos', cause: 'veintidós años de trabajos que no cierran' },
      descubre: { itemId: 'it-libreta', propertyId: 'p-libreta-modelos', how: 'escuchándolo leer las columnas de marca y modelo', comparedWith: 'las fechas de las bases' },
      pistas: [{
        description: 'Los molinos que Adelmo levantó cerca de los puntos del mapa son todos del mismo modelo, posterior a las bases sobre las que los montó. Ninguna de esas bases la hizo él: ya estaban.',
        kind: 'documentary' as const, source: 'la libreta de Adelmo Pais', reliability: 'reliable' as const,
      }],
    }),
  },

  // ══ LA VUELTA PELADA ═════════════════════════════════════════════════════

  {
    id: 'piedra',
    prueba: () => ({
      skill: 'ciencia_naturales', difficulty: 'regular',
      reason: 'decir de qué es una piedra y si pudo llegar sola',
      stakes_success: 'saber que no salió de esta llanura',
      stakes_failure: 'una piedra chata, y bastante',
    }),
    resolver: ({ tirada, estado }) => ({
      texto: [
        'La desenterrás con las manos, que es poco trabajo: está a un palmo y la tierra está suelta.',
        'Es chata, de unos cuarenta centímetros, gris con vetas más oscuras. Pesa más de lo que parece.',
        tirada?.exito
          ? 'No es de acá. En la pampa la piedra hay que traerla: el suelo es limo y arcilla hasta donde alcanza cualquier pozo, y la cantera más próxima está a cientos de kilómetros. Ésta llegó en algo, o la trajo alguien, y no fue este siglo.\n\nY una de las caras está trabajada. No tallada con dibujo: alisada, prolija, plana como una mesa, con el trabajo de alguien que quería una superficie y no un adorno.'
          : 'Gris, con vetas. Podría ser cualquier cosa y venir de cualquier lado, y vos no tenés con qué decir de dónde. Lo que sí ves, porque salta, es que una de las caras está mucho más lisa que las otras.',
        'Alrededor no hay ninguna otra. Cavás medio metro más en tres puntos y no aparece nada: es una sola piedra en el centro exacto de cuarenta metros de tierra pelada.',
        bajoAlSueno(estado)
          ? 'Y te queda la cara alisada mirando para arriba, chata en el pasto, del tamaño y la forma de una tapa. De algo que se tapa. Sabés cómo se ven las cosas que se tapan.'
          : '',
      ].filter(Boolean),
      exposicion: { amount: tirada?.exito ? 8 : 4, source: 'vuelta:piedra', cause: 'una piedra trabajada en una llanura sin piedras' },
      estabilidad: { amount: -5, cause: 'que alguien haya traído eso hasta acá y lo haya dejado en el centro' },
      pistas: [{
        description: tirada?.exito
          ? 'La piedra del centro está trabajada —una cara alisada a propósito— y no puede haber salido de esta llanura: no hay canteras en cientos de kilómetros. Es la única piedra en cuarenta metros.'
          : 'La piedra del centro está trabajada al menos en una cara, mucho más lisa que las otras, y es la única en cuarenta metros de tierra pelada.',
        kind: 'physical' as const, source: 'el centro de la vuelta pelada', reliability: 'reliable' as const,
      }],
    }),
  },

  {
    id: 'escritura',
    resolver: ({ estado }) => ({
      texto: [
        'La carpeta está atada con una cinta de zapato y adentro hay menos de lo que uno esperaría de sesenta años de campo: la escritura, dos boletas de contribución y un plano de mensura de 1904.',
        'Lo normal ocupa dos carillas. En la tercera, entre las cláusulas de estilo, hay una que no es de estilo:',
        '«El comprador se obliga, por sí y por sus sucesores a perpetuidad, a mantener despejada de siembra, arboleda y edificación la fracción circular señalada en el croquis, y a no impedir el paso por ella. Esta obligación se transmite con el dominio y no admite dispensa.»',
        'El croquis está al pie. Es un círculo, sin medidas, sin coordenadas y sin nombre.',
        'Y falta lo único que una cláusula así tiene que tener: no dice a favor de quién. No hay beneficiario, no hay contraparte, no hay a quién reclamarle el incumplimiento. Es una obligación sin acreedor, y se viene cumpliendo desde 1868.',
        juzgoUnaIdentidad(estado)
          ? 'Ya leíste papeles buscando si decían la verdad sobre alguien. Éste no miente en nada: está bien redactado, bien sellado y es perfectamente válido. Lo que tiene de imposible no es una falsedad, es un hueco — y un hueco no se puede desmentir.'
          : '',
        demostroYNoSirvio(estado)
          ? 'Y sabés exactamente qué pasaría si lo llevaras a un juzgado, porque ya llevaste algo parecido a uno: dirían que hay un error material evidente, y tendrían razón, y no serviría de nada.'
          : '',
      ].filter(Boolean),
      exposicion: { amount: 7, source: 'escritura:clausula', cause: 'una obligación perpetua sin acreedor' },
      estabilidad: { amount: -6, cause: 'sesenta años cumpliendo una cláusula que nadie exige' },
      documento: { id: 'doc-escritura', how: 'Remigia la dejó sobre la mesa y le dijo que la leyera él' },
      pistas: [{
        description: 'La escritura de 1868 obliga a perpetuidad a mantener despejada una fracción circular y a no impedir el paso por ella. No nombra beneficiario: es una obligación sin acreedor, y se cumple desde hace sesenta años.',
        kind: 'documentary' as const, source: 'la escritura del campo de los Ithurbide', reliability: 'reliable' as const,
      }],
      contradiccion: {
        description: 'Una obligación perpetua que tres generaciones cumplieron sin falta no tiene, en el papel, a nadie a favor de quien esté constituida.',
        between: 'la cláusula / la falta de contraparte',
      },
    }),
  },

  {
    id: 'mirar-oeste',
    // El guiño, y todo el guiño. Se ve, no se nombra, no se explica y no se
    // camina hasta ahí dentro de esta aventura.
    resolver: ({ estado }) => ({
      texto: [
        'Te ponés de espaldas al sol y mirás para el oeste con la mano de visera.',
        'A unas tres leguas hay una arboleda que no es una cortina de estancia: es demasiado ancha, demasiado desprolija y demasiado oscura, y no sigue ninguna línea de alambrado.',
        'Y por encima de los árboles asoma algo angosto y derecho. A esta distancia y con esta luz no se puede decir qué es. Podría ser un campanario. Podría ser un molino sin aspas. Podría ser una piedra parada.',
        'Lo mirás el tiempo suficiente como para estar seguro de que no se mueve, que es una cosa rarísima para necesitar comprobar.',
        'Detrás tuyo, Remigia deja de hablar. No dice nada más en un rato largo, y cuando vuelve a hablar es para preguntar si vas a querer agua para el camino de vuelta.',
      ],
      exposicion: { amount: 7, source: 'oeste:arboleda', cause: 'lo que asoma por encima de los árboles' },
      estabilidad: { amount: -4, cause: 'haber necesitado comprobar que no se movía' },
      pistas: [{
        description: 'Se quedó mirando la arboleda del oeste el tiempo suficiente como para comprobar que lo que asoma por encima de los árboles no se mueve.',
        kind: 'physical' as const, source: 'el campo de los Ithurbide', reliability: 'unknown' as const,
      }],
      ...(pista(estado, 'no es para nosotros') ? {
        jugadorNota: {
          statement: 'Su investigador está mirando, a tres leguas, el centro del arco que Delfina no marcó nunca en el mapa. Todo lo que averiguó en cinco aventuras ocurrió alrededor de ese punto y ninguna lo tocó.',
          source: 'el campo de los Ithurbide, con el sol bajo',
          reliability: 'unknown' as const,
        },
      } : {}),
    }),
  },

  {
    id: 'ordenar',
    // La escena de la tesis. No tiene tirada: ordenar por fecha lo que uno ya
    // tiene anotado es trabajo de escritorio, y la aventura no va a cobrarle
    // una tirada al jugador por sacar la conclusión que vino a sacar.
    resolver: ({ estado }) => {
      const sabeBase = pista(estado, 'no podía existir todavía');
      const sabeMarco = pista(estado, 'Se pintó para cómo está ahora');
      const sabeVuelta = pista(estado, 'desde antes de 1871');
      return {
        texto: [
          'Te sentás con la copia del mapa y la libreta y ponés cada cosa al lado de su año, que es lo único que se puede hacer con un montón de hechos que no se dejan explicar.',
          sabeVuelta
            ? '1868, o antes: la vuelta pelada ya está, y en la escritura del campo hay una cláusula perpetua que obliga a mantenerla despejada. La cláusula no dice quién la exige. Es el punto más cercano al oeste y es el más viejo de todos.'
            : 'La vuelta pelada es la más vieja de todas y es la más cercana al oeste. Eso ya lo sabías.',
          sabeBase
            ? '1889: se levanta una base de mampostería para un molino que no existe, con los pernos puestos después, en la posición exacta que iba a hacer falta veintidós años más tarde.'
            : '',
          sabeMarco
            ? '1902: desarman una casa ladrillo por ladrillo y dejan el marco parado. Pero el marco estaba pintado en las cuatro caras desde antes, incluidas las dos que en 1902 todavía estaban adentro de la casa.'
            : '',
          '1927: Delfina agrega el punto de Villa Requena y el arco cierra.',
          'Y ahí está el problema, y no es que las fechas no cierren. Cierran perfecto. El problema es que se leen igual de bien en los dos sentidos.',
          'Leído para adelante: algo empezó en el oeste hace más de sesenta años y se fue corriendo hacia afuera, marcando un punto cada tanto, y el último lo marcaste vos preguntando por un brocal.',
          'Leído para atrás: los puntos no son marcas de algo que se aleja. Son preparativos. Cada uno se dispuso antes de hacer falta —la base antes de la torre, la pintura antes de la ruina— y todos apuntan al mismo lugar, y ese lugar es adonde se llega yendo, no de donde se viene.',
          'Los mismos hechos. Las mismas fechas. Las dos lecturas completas y ninguna manera de decidir cuál es.',
          seAnotoEnLaLista(estado)
            ? 'Y hay una tercera cosa, que no ponés en la hoja porque no tiene fecha: vos ya estás en una lista. Escribiste tu apellido con la mano en un renglón fresco. Si esto es una cuenta que se corre, hace un año que se corre hacia vos.'
            : '',
          llevoElLibro(estado)
            ? 'Anotás al margen, sin pensarlo, que el libro de turnos está en el sótano de un juzgado. Y te queda la duda de si eso lo sacó de la cuenta o simplemente lo cambió de estante.'
            : '',
        ].filter(Boolean),
        exposicion: { amount: 6, source: 'orden:tesis', cause: 'que las fechas se lean igual de bien en los dos sentidos' },
        estabilidad: { amount: -8, cause: 'tener toda la información y menos certeza que antes' },
        pistas: [{
          description: 'El orden no es el que parecía. Puestos por fecha, los puntos se leen igual de bien como marcas de algo que se aleja del oeste y como preparativos dispuestos de antemano para algo que apunta hacia allá. Los mismos hechos sostienen las dos lecturas.',
          kind: 'experiential' as const, source: 'poner las fechas en una hoja', reliability: 'reliable' as const,
        }],
        contradiccion: {
          description: 'Cada punto del mapa se dispuso antes de hacer falta —la base antes de la torre, la pintura antes de la ruina— y sin embargo la serie completa parece alejarse del oeste y no acercarse.',
          between: 'cada punto por separado / la serie entera',
        },
        jugadorNota: {
          statement: 'Las dos lecturas no son igual de inocentes. Si son preparativos, alguien los dispuso; si son marcas, algo los dejó. Su investigador tiene los datos para ver eso y acaba de decidir, sin notarlo, no decirlo en voz alta.',
          source: 'la hoja con las fechas en orden',
          reliability: 'unknown' as const,
        },
      };
    },
  },

  // ══ LOS CUATRO DESENLACES ════════════════════════════════════════════════
  //
  // Ninguno contesta cuál de las dos lecturas es la buena (§15). Lo que cambia
  // entre los cuatro es qué hace el investigador con no saberlo.

  {
    id: 'fin-seguir',
    antes: (s) => aqui(s) !== 'pasto' ? null : ({
      texto: [
        'Remigia te ve juntar las cosas y mirar para el oeste, y entiende antes de que se lo digas.',
        '—No cruce la vuelta —dice—. Si va a ir, dele la vuelta por afuera. Yo no le voy a explicar por qué y usted no me va a hacer caso.',
      ],
    }),
    resolver: ({ estado }) => {
      const veces = vecesQueSeFue(estado);
      return {
        texto: [
          'Le hacés caso a medias: bordeás la vuelta pelada, que es lo único que te pide, y después seguís derecho para el oeste con el sol de frente.',
          'Son tres leguas. Se hacen en dos horas largas si el campo es parejo, y es parejo.',
          'A la hora de caminar la arboleda deja de ser una línea y empieza a ser árboles, y lo angosto y derecho que asoma por encima sigue sin poder nombrarse, aunque ahora está más cerca y sigue sin moverse.',
        ],
        exposicion: { amount: 10, source: 'oeste:caminar', cause: 'caminar hacia lo que el arco rodea' },
        consecuencia: {
          description: 'El investigador cerró los siete puntos del mapa y siguió camino al oeste, hacia el pueblo que nadie del partido nombra.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Sabe que los siete puntos rodean un lugar, sabe cuál es, y fue para allá por su cuenta. Nadie lo mandó y nadie lo espera.',
        },
        desenlace: {
          id: 'seguir', title: 'Lo que se camina',
          text: [
            'Llegás con la última luz.',
            'Hay un pueblo. Tiene calles, tiene una iglesia con campanario, tiene un almacén con gente adentro, y tiene el tamaño exacto de cualquier pueblo del partido. No hay niebla, no hay silencio y no hay nada que se le note a primera vista.',
            'Lo único raro es una cosa que tardás un rato en poder decir con palabras: no hay nadie afuera mirando llegar a un desconocido. En cualquier pueblo de campo, a esta hora, hay tres personas en una vereda que dejan de hablar cuando aparece uno de afuera.',
            'Acá no. Acá siguen adentro, y desde adentro te ven pasar, y no hacen nada distinto.',
            veces >= 2
              ? 'Ya te fuiste dos veces de lugares como éste sin contestar nada, y las dos veces te salió bien. Ésta te quedaste. No sabés todavía si eso es coraje o si es que la cuenta te venía corriendo desde hace rato y hoy llegó.'
              : 'Delfina Arce tenía razón en no querer ser la única que sabía, y ahora sabe uno más y está tres leguas más adentro que ella.',
            'De lo que pasa a partir de esta noche no hay manera de escribir nada acá, porque empieza otra cosa. Lo que sí queda escrito es esto: el arco tenía centro, el centro tenía nombre en el mapa impreso, y vos caminaste hasta él por tu propia voluntad, con la luz suficiente para haber visto y haberte vuelto.',
          ].join('\n\n'),
        },
      };
    },
  },

  {
    id: 'fin-anotar',
    resolver: ({ estado }) => {
      const ordeno = pista(estado, 'El orden no es el que parecía');
      return {
        texto: [
          'Volvés a Villa Requena en el sulky de Adelmo, que va para ese lado y no pregunta nada en cuatro horas de camino, que es su mejor cualidad.',
          'Delfina te espera con la escuela abierta aunque son las nueve de la noche.',
        ],
        estabilidad: { amount: -3, cause: 'dejar por escrito algo que no se puede probar' },
        consecuencia: {
          description: 'Quedó escrito y en manos de otra persona el mapa completo de los siete puntos, con las fechas de cada uno y las dos lecturas posibles.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Existe un papel, en una escuela rural, que ordena los siete puntos por fecha. Delfina Arce lo tiene y no lo va a tirar.',
        },
        desenlace: {
          id: 'anotar', title: 'Lo que queda anotado',
          text: [
            'Se quedan hasta la una de la mañana pasando en limpio.',
            'Ella escribe y vos dictás, que sale mejor así: ella tiene la letra y la costumbre de anotar sin adornar, y vos tenés las fechas.',
            ordeno
              ? 'Cuando terminan, la hoja dice las dos lecturas, una debajo de la otra, sin decidir. Delfina la lee entera dos veces y después dice: «Está bien así. Si eligiéramos una, mentiríamos». Y la firma con fecha, que es lo que hace una maestra con un documento.'
              : 'Cuando terminan, la hoja tiene los siete puntos, sus fechas y lo que se sabe de cada uno. No alcanza para una conclusión y ninguno de los dos la fuerza.',
            'A la mañana siguiente te vas en el tren de las siete y ella se queda con el papel.',
            'Lo que hiciste no resuelve nada y va a durar más que vos. Dentro de treinta años alguien va a abrir un cajón en una escuela rural y va a encontrar una hoja firmada por una maestra en 1928, con siete puntos, dos lecturas y ninguna certeza. Y esa persona va a tener que empezar por donde vos terminaste, que es infinitamente más de lo que vos tuviste.',
            'Delfina pidió el traslado en septiembre. Se llevó una copia. Dejó la otra en el cajón del escritorio del aula, que era exactamente lo que había que hacer.',
          ].join('\n\n'),
        },
      };
    },
  },

  {
    id: 'fin-quemar',
    resolver: () => ({
      texto: [
        'Hacés fuego con pasto seco y unas ramas de tala, y quemás la copia hoja por hoja, que es como se queman los papeles que importan: despacio, mirando que no quede nada legible.',
      ],
      estabilidad: { amount: -6, cause: 'elegir que nadie más pueda seguir la línea' },
      consecuencia: {
        description: 'El investigador destruyó su copia del mapa de los siete puntos para que nadie más pudiera caminar la línea.',
        scope: 'world' as const,
        permanent: true,
        worldReminder: 'La copia no existe. El original sigue clavado con cuatro chinches en un aula de Villa Requena, y Delfina Arce sigue midiéndolo.',
      },
      desenlace: {
        id: 'quemar', title: 'Lo que no se sigue',
        text: [
          'Lo pensaste todo el camino de vuelta y lo hiciste al llegar, antes de entrar al pueblo, para no tener que explicarlo.',
          'El razonamiento es bueno y lo sabés: siete puntos y un centro es una invitación, y una invitación escrita en un papel viaja sola. Los viajeros le contaron a Delfina. Delfina te contó a vos. Vos ibas a contarle a alguien.',
          'Lo que no resuelve el fuego es el mapa de la escuela, que sigue clavado con cuatro chinches, ni la mujer que lo midió tres veces con la regla del pizarrón y que va a volver a medirlo el mes que viene.',
          'Se lo decís. Ella escucha hasta el final —eso hay que reconocérselo— y después dice una sola cosa:',
          '—Usted vino porque yo le escribí. Si yo no le hubiera escrito, ¿esto no estaba pasando?',
          'No tenés una respuesta que sirva, porque la pregunta es exactamente la de la aventura y vos ya sabés que se lee bien en los dos sentidos.',
          'Te vas en el tren de las siete. Ella no va a la estación.',
          'El almagre sigue llegando al almacén dos veces por año, en marzo y en septiembre, con el pedido general de la cabecera. Eso no lo apaga ningún fuego, y para eso no hacía falta ningún mapa.',
        ].join('\n\n'),
      },
    }),
  },

  {
    id: 'fin-pintar',
    resolver: ({ estado }) => {
      const sabeMezcla = pista(estado, 'la misma mezcla que el de la escribanía');
      return {
        texto: [
          'Le pedís la lata a Ubaldo. Te la da sin preguntar para qué, que es la respuesta más inquietante que te dio en todo el día.',
        ],
        exposicion: { amount: 12, source: 'pintar:siguiente', cause: 'agregar un punto a la cuenta con la propia mano' },
        estabilidad: { amount: -9, cause: 'haber pasado de mirar la cuenta a llevarla' },
        consecuencia: {
          description: 'El investigador pintó de almagre el punto siguiente del arco, con su propia mano, y con eso entró en la cuenta en lugar de mirarla desde afuera.',
          scope: 'world' as const,
          permanent: true,
          worldReminder: 'Hay un octavo punto y lo puso él. Sea lo que sea que lleva esta cuenta, ahora tiene una entrada suya, hecha voluntariamente y a plena luz.',
        },
        desenlace: {
          id: 'pintar', title: 'Lo que se continúa',
          text: [
            'El arco tiene una forma y una forma se prolonga. Con la regla, sobre la copia, el punto siguiente cae a unas seis leguas al noreste del campo del marco, en un cuadro de campo que en el mapa impreso no tiene ni nombre.',
            'Tardás dos días en llegar. Cuando llegás no hay nada esperándote: hay un potrero con un bebedero de cemento partido al medio, abandonado, y una tranquera vieja.',
            'Pintás la tranquera. Los dos postes, las cuatro caras, hasta la altura de un hombre, con la brocha de cerda dura y sin apurarte, porque en algún momento entre el primer poste y el segundo dejás de hacerlo como una prueba y empezás a hacerlo bien.',
            sabeMezcla
              ? 'La mezcla es la misma que hay en la escribanía de Villa Requena y la misma que compra Ubaldo sin saber a quién. Ahora también es la que usaste vos.'
              : 'La mezcla agarra distinto que la pintura común: seca dura, mate, y queda del color de la tierra de otro lado.',
            'Volvés a la cabecera y hacés una última cosa, que no habías planeado y que hacés igual: dejás dicho en el correo que si alguna vez llega un giro sin remitente a ese nombre, es para el puestero de ese campo.',
            'No hay ningún puestero en ese campo. Todavía.',
            'Dentro de unos años, alguien va a contarle a una maestra que hay una tranquera que se pinta y no se toca, y la maestra va a poner un punto en un mapa. Y el arco va a estar un poco más cerrado que antes, y el centro va a seguir donde estaba.',
            'Vos sabés cuál es el centro. Eso es lo único que te diferencia de todos los que pintaron antes que vos, y no estás seguro de que sea una diferencia a tu favor.',
          ].join('\n\n'),
        },
      };
    },
  },
];
