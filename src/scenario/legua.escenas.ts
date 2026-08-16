/**
 * LAS ESCENAS DE LA LEGUA PERDIDA.
 *
 * La aventura se juega con una herramienta: la rueda de agrimensor. Medir es el
 * verbo central, como mirar lo era en Agua Quieta.
 *
 * Y hay una escena que las otras aventuras no tienen: **cotejar los
 * testimonios**. Tres personas dicen tres cosas incompatibles y ninguna miente;
 * la escena que las pone una al lado de la otra es donde la aventura se resuelve,
 * y es la que por fin usa el tablero de contradicciones.
 */

import type { GameState } from '../shared/types.ts';
import type { Escenas, IntencionLeida } from './escena.ts';

// ── AYUDAS ───────────────────────────────────────────────────────────────────

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const propiedadVista = (s: GameState, item: string) =>
  (s.items[item]?.discoveredProperties.length ?? 0) > 0;
const oculta = (s: GameState, item: string) => s.items[item]?.hiddenProperties[0]?.description ?? '';
const aqui = (s: GameState) => s.world.currentLocation;
const lleva = (s: GameState, item: string) => s.items[item]?.owner === s.activeInvestigator;
const dice = (i: IntencionLeida, re: RegExp) => re.test(i.norm);
const pistas = (s: GameState) => s.board.clues.length;

/** ¿Ya tiene con qué demostrar que el campo no cierra? */
export function puedeDemostrar(s: GameState): boolean {
  return propiedadVista(s, 'it-rueda') && pista(s, '843 postes');
}

export const LEGUA_ESCENAS: Escenas = [
  // ══ DESENLACES ════════════════════════════════════════════════════════════

  {
    id: 'fin-caminar', prioridad: 96,
    cuando: (s, i) =>
      dice(i, /camino el alambrado|caminar el alambrado|de punta a punta|recorro el alambrado a pie/)
      && pistas(s) >= 5,
    antes: () => ({
      texto: [
        'Le decís a Casimiro que vas a caminar el alambrado del oeste de punta a punta. Casimiro no discute. ' +
        'Va hasta el galpón, vuelve con una cantimplora llena y te la da con las dos manos, que es una manera ' +
        'de decir algo.\n\n' +
        '—Salga temprano —dice—. Y si le parece que está tardando, no apure. Apurar es peor.',
      ],
      tiempo: { minutes: 60, reason: 'llegar al mojón y empezar a caminar' },
    }),
    prueba: () => ({
      skill: 'CON', difficulty: 'hard',
      reason: 'caminar la línea entera sin quedarse',
      stakes_success: 'llegás a la otra punta y volvés',
      stakes_failure: 'llegás, y volver es otra cosa',
      penalty_dice: 1, modifier_reason: 'nadie sabe cuántos kilómetros son',
    }),
    resolver: ({ tirada }) => {
      const entera = tirada?.exito ?? false;
      return [{
        tiempo: { minutes: 11 * 60, reason: 'caminar el alambrado del oeste' },
        exposicion: { amount: 20, source: 'oeste:caminar', cause: 'caminar la línea entera de punta a punta' },
        estabilidad: { amount: entera ? -18 : -28, cause: 'contar postes hasta perder la cuenta de las horas' },
        pistas: [{
          description: 'Caminar el alambrado del oeste lleva más tiempo del que permite su longitud, y de vuelta lleva más que de ida.',
          kind: 'experiential', source: 'la caminata', reliability: 'reliable',
        }],
        consecuencia: {
          description: 'El investigador caminó el alambrado del oeste de punta a punta.',
          scope: 'campaign', permanent: true,
          worldReminder: 'El investigador caminó la línea entera. Sea lo que sea que le pasa al espacio en ese campo, le pasó a él durante once horas.',
        },
        texto: [
          'Contás postes. Es lo único que se puede hacer y es lo que hacen todos: contar postes.\n\n' +
          'A los trescientos el sol está donde debería. A los seiscientos también. A los ochocientos cuarenta y ' +
          'tres llegás a la esquina, y son las cuatro y media de la tarde, y saliste a las siete de la mañana.\n\n' +
          'Ocho kilómetros y medio en nueve horas y media es la velocidad de una persona muy vieja o de una ' +
          'persona que se detuvo mucho. Vos no te detuviste.',
        ],
        desenlace: {
          id: 'caminar', title: 'Lo que camina',
          text: entera
            ? 'Volvés de noche, por adentro del campo y no por la línea, porque la línea ya la caminaste y no ' +
              'querés saber cuánto mide de vuelta.\n\n' +
              'Casimiro está en el portón del corral con un farol. No pregunta nada. Te alcanza el mate y se sienta ' +
              'en el escalón, al lado tuyo, y se quedan los dos mirando el campo negro.\n\n' +
              '—Ahora sabe —dice.\n\n' +
              'Y sí. Ahora sabe. Lo que no sabe es qué hacer con eso, y a los sesenta y siete años de Casimiro ' +
              'nadie le encontró una respuesta a esa parte.\n\n' +
              'Elena Sartori firmó el certificado de defunción de Fermín Arce al día siguiente. Puso ' +
              '«deshidratación» y puso el lugar que le pedía el formulario, y las dos cosas eran ciertas y ninguna ' +
              'era verdad.'
            : 'No volvés esa noche.\n\n' +
              'Casimiro te encuentra a la mañana siguiente sentada contra un poste, con la cantimplora todavía ' +
              'por la mitad, contando en voz baja. Ibas por ochocientos noventa y uno.\n\n' +
              'No estás deshidratada, no estás insolada y no estás herida. Estás contando.\n\n' +
              'Te lleva al casco a caballo y no le cuenta a nadie en qué estado te encontró. Vos tampoco te lo ' +
              'contás del todo.\n\n' +
              'Y durante el resto de tu vida, cada vez que camines al lado de un alambrado, la primera cosa que ' +
              'va a hacer tu cabeza —antes de pensarlo, antes de decidirlo— es empezar a contar postes.',
        },
      }];
    },
  },

  {
    id: 'fin-medir', prioridad: 95,
    cuando: (s, i) =>
      dice(i, /demuestro|demostrar|levanto acta|acta de la medicion|dejo constancia/)
      && puedeDemostrar(s),
    resolver: () => ({
      tiempo: { minutes: 4 * 60, reason: 'medir, contar y escribir el acta' },
      exposicion: { amount: 8, source: 'oeste:demostrar', cause: 'medir hasta que no quede duda' },
      estabilidad: { amount: -10, cause: 'tener la prueba y que la prueba no sirva' },
      consecuencia: {
        description: 'Se levantó un acta con la medición del lado oeste de La Perseverancia, firmada por dos testigos.',
        scope: 'world', permanent: true,
        worldReminder: 'Existe un acta que demuestra que La Perseverancia no cierra. Nadie sabe qué hacer con ella.',
      },
      texto: [
        'Cuatro horas. La rueda, los postes contados en voz alta por Roldán, la cinta para verificar el tramo ' +
        'de control, y todo anotado con hora, testigos y firma.\n\n' +
        'El acta dice: lado norte 5.210, lado este 5.198, lado sur 5.204, lado oeste 8.430. Ángulos rectos ' +
        'verificados en las cuatro esquinas. Perímetro cerrado y continuo.\n\n' +
        'Es un cuadrilátero que existe y que no puede existir, medido tres veces, con testigos.',
      ],
      desenlace: {
        id: 'medir', title: 'Lo que no cierra',
        text:
          'Roldán firma primero. Le tiembla la mano y firma igual, y cuando termina se queda mirando su propia ' +
          'firma un rato largo.\n\n' +
          '—Veintidós años —dice, y no aclara veintidós años de qué.\n\n' +
          'Herminia firma segunda, y en el momento de firmar entiende, con una claridad que se le ve en la cara, ' +
          'que acaba de perder al comprador.\n\n' +
          'El acta va al departamento topográfico de La Plata en abril. En julio contestan: se solicita nueva ' +
          'mensura por profesional distinto, ya que la presentada contiene un error material evidente.\n\n' +
          'Y tienen razón. Desde La Plata, con el papel sobre el escritorio, lo único que se puede concluir es ' +
          'que alguien midió mal.\n\n' +
          'Eso es lo que descubrió usted, {trato}: no que el campo no cierra. Que se puede demostrar que no ' +
          'cierra, con testigos y con firma, y que la demostración no le sirve a nadie para nada.',
      },
    }),
  },

  {
    id: 'fin-borrar', prioridad: 94,
    cuando: (s, i) =>
      dice(i, /quemo|destruyo|hago desaparecer|escondo la mensura|me llevo la mensura sin/)
      && Boolean(s.documents['doc-mensura1903']?.obtainedAt),
    resolver: () => ({
      estabilidad: { amount: -6, cause: 'elegir que el problema no exista' },
      consecuencia: {
        description: 'La mensura de 1903 de La Perseverancia dejó de existir.',
        scope: 'world', permanent: true,
        worldReminder: 'La mensura de 1903 fue destruida. Queda la de 1924, sin firma, y el título de 1887. El campo sigue sin cerrar y ahora hay menos papeles que lo digan.',
      },
      texto: [
        'La quemás en el brasero del galpón, hoja por hoja, que es como se queman los papeles importantes: ' +
        'despacio, para que no quede nada legible.',
      ],
      desenlace: {
        id: 'borrar', title: 'Lo que se borra',
        text:
          'Sin la mensura de 1903 no hay contradicción, y sin contradicción no hay pleito. Herminia vende en ' +
          'septiembre, a un precio razonable, a un señor de Buenos Aires que no va a venir nunca.\n\n' +
          'Roldán se entera por el diario y no dice nada. Muere en el invierno del veintiocho, en el pueblo, ' +
          'siendo para todo el mundo el agrimensor que midió bien.\n\n' +
          'Eso último no era mentira y ahora tampoco se puede probar. Le hizo un favor y él nunca lo supo, ' +
          'que es la única clase de favor que se le puede hacer a alguien así.\n\n' +
          'El campo sigue midiendo lo que mide. Lo van a volver a medir en algún momento —siempre se vuelve a ' +
          'medir— y quien lo haga va a encontrar exactamente lo mismo, sin ninguno de los papeles que le habrían ' +
          'servido para entenderlo.',
      },
    }),
  },

  {
    id: 'fin-firmar', prioridad: 93,
    cuando: (s, i) => dice(i, /firmo el certificado|firmar el certificado|extiendo el certificado/)
      && pistas(s) >= 3,
    resolver: () => ({
      consecuencia: {
        description: 'Se firmó el certificado de defunción de Fermín Arce con causa «deshidratación» y lugar «casco de la estancia».',
        scope: 'world', permanent: true,
        worldReminder: 'El certificado de Fermín Arce consigna un lugar que el investigador sabe que no corresponde. Nadie lo va a revisar.',
      },
      texto: [
        'Sacás el formulario, lo apoyás en la mesa del comedor y lo llenás con la letra de imprenta que te ' +
        'enseñaron a usar para esto.',
      ],
      desenlace: {
        id: 'firmar', title: 'Lo que se firma',
        text:
          'Causa: deshidratación aguda. Lugar del hecho: casco de la estancia La Perseverancia. Fecha probable: ' +
          '10 de marzo de 1925.\n\n' +
          'Las tres cosas son defendibles y ninguna es exacta. El lugar del hecho, sobre todo, es una decisión ' +
          'administrativa disfrazada de dato.\n\n' +
          'Herminia lo agradece con una formalidad que es casi cariño. Casimiro lo mira desde la puerta y no dice ' +
          'nada, y ese no decir nada le va a durar a usted bastante más que el viaje de vuelta.\n\n' +
          'Roldán se va en el break del mediodía sin despedirse.\n\n' +
          'El campo sigue sin cerrar. Usted firmó que sí.',
      },
    }),
  },

  {
    id: 'fin-irse', prioridad: 92,
    cuando: (_s, i) => i.verb === 'irse',
    resolver: () => ({
      consecuencia: {
        description: 'El investigador se fue de La Perseverancia sin firmar el certificado.',
        scope: 'world', permanent: true,
        worldReminder: 'La Perseverancia quedó sin certificado de defunción y con las dos mensuras enfrentadas. Herminia no pudo vender.',
      },
      desenlace: {
        id: 'llevarse', title: 'Lo que se lleva',
        text:
          'El break pasa a las cinco. Se va sin firmar, que en su oficio es algo que se paga.\n\n' +
          'En el bolso lleva copias de las dos mensuras, el título de 1887 y la libreta de campo de Roldán, ' +
          'que el viejo le dio sin que se la pidiera y sin decir una palabra al dársela.\n\n' +
          'En Buenos Aires, un profesor de la Facultad de Ingeniería que le debe un favor va a mirar los tres ' +
          'papeles durante veinte minutos y va a decirle que hay un error de transcripción en el lado oeste, que ' +
          'es lo que dice cualquiera que mire los papeles y no el campo.\n\n' +
          'Ese es el problema con este asunto, y usted lo va a entender del todo recién años después: sólo se ' +
          'puede ver estando adentro, y todo el que está adentro se acostumbra.',
      },
    }),
  },

  // ══ ESCENAS DE INVESTIGACIÓN ══════════════════════════════════════════════

  {
    // La escena central de la aventura: medir con la rueda, ida y vuelta.
    id: 'medir-con-la-rueda', prioridad: 80,
    cuando: (s, i) =>
      dice(i, /mido|medir|paso la rueda|uso la rueda/) && lleva(s, 'it-rueda')
      && ['alambrado', 'molino', 'rastro'].includes(aqui(s)),
    antes: () => ({
      texto: [
        'Apoyás la rueda en el mojón, ponés el contador en cero y empezás a caminar empujándola. Es un trabajo ' +
        'tonto y tranquilizador: la rueda hace clic cada vuelta y cada vuelta es un metro.',
      ],
      tiempo: { minutes: 150, reason: 'medir la línea con la rueda, ida y vuelta' },
    }),
    resolver: ({ estado }) => {
      if (propiedadVista(estado, 'it-rueda')) {
        return {
          texto: [
            'Volvés a medir. Te da otro número, y a esta altura eso ya no te sorprende: te ordena. ' +
            'Un fenómeno que se repite es un fenómeno, y un fenómeno se puede describir aunque no se entienda.',
          ],
          exposicion: { amount: 4, source: 'oeste:medir', cause: 'volver a medir la línea del oeste' },
        };
      }
      return [
        {
          // Ida y vuelta son dos usos, y la propiedad pide dos: sin registrarlos
          // el gate rechaza el descubrimiento y la escena narra algo que el
          // motor no dejó pasar.
          usa: { itemId: 'it-rueda', times: 2, cause: 'medir la línea de ida y de vuelta' },
          descubre: { itemId: 'it-rueda', propertyId: 'p-rueda-dos-numeros', how: 'midiendo la misma línea de ida y de vuelta' },
        },
        {
          texto: [oculta(estado, 'it-rueda')],
          pistas: [{
            description: 'La misma línea medida con rueda da 6.100 metros de ida y 5.400 de vuelta, sin levantar la rueda del suelo.',
            kind: 'experiential', source: 'medición propia con rueda de agrimensor', reliability: 'reliable',
          }],
          exposicion: { amount: 10, source: 'oeste:medir', cause: 'medir la misma línea dos veces y obtener dos números' },
          estabilidad: { amount: -10, cause: 'que un contador mecánico dé dos resultados sobre el mismo suelo' },
          contradiccion: {
            description: 'La misma línea, medida con el mismo instrumento en la misma tarde, mide 6.100 metros en un sentido y 5.400 en el otro.',
            between: 'Medición de ida | Medición de vuelta',
          },
          pregunta: '¿De qué depende el número: de la dirección, de la hora, o de quién mide?',
        },
      ];
    },
  },

  {
    // Cotejar los testimonios. Acá se usa el tablero de contradicciones.
    id: 'cotejar-testimonios', prioridad: 78,
    cuando: (_s, i) => dice(i, /cotejo|comparo lo que dicen|contrasto|pongo en fila lo que|los tres numeros/),
    resolver: ({ estado }) => {
      const h = pista(estado, 'Herminia: veinte minutos');
      const c = pista(estado, 'Casimiro: media hora');
      const r = pista(estado, 'Roldán midió tres veces');

      if (!(h && c)) {
        return {
          texto: [
            'Sacás la libreta y ponés en una columna lo que te dijo cada uno. Todavía te falta gente por escuchar: ' +
            'con un solo número no hay nada que cotejar, y con dos números que no chocan, tampoco.',
          ],
        };
      }

      const efectos: any[] = [{
        texto: [
          'Ponés los tres en fila, con la letra chica de las historias clínicas.\n\n' +
          'HERMINIA: veinte minutos y cuarenta segundos. Cronometrado dos veces. Idéntico.\n' +
          'CASIMIRO: media hora. Toda la vida. Y su padre, cuarenta.\n' +
          (r ? 'ROLDÁN: tres mediciones, tres números, en cuatro días de febrero de 1903.\n' : '') +
          '\nY acá está lo que te desordena, y te lleva un rato entenderlo: **ninguno se contradice a sí mismo.**\n\n' +
          'Herminia cronometró dos veces y le dio lo mismo las dos veces. Casimiro tarda media hora hoy y hace ' +
          'treinta años. Cada uno es perfectamente consistente consigo mismo, durante años.\n\n' +
          'Lo que no cierra es ponerlos juntos. Y no hay manera de que dos personas tarden distinto en el mismo ' +
          'trayecto durante décadas, cada una con una regularidad de reloj.',
        ],
        estabilidad: { amount: -8, cause: 'tres testimonios consistentes y mutuamente imposibles' },
        exposicion: { amount: 5, source: 'testimonios:cotejar', cause: 'entender que ninguno de los tres se equivoca' },
        contradiccion: {
          description: 'Tres personas recorren el mismo trayecto en tiempos distintos, cada una con total regularidad a lo largo de años. Ninguna se equivoca y ninguna miente.',
          between: 'Herminia Lastra | Casimiro Pinto | Eusebio Roldán',
        },
        pistas: [{
          description: 'El tiempo que lleva cruzar el campo es distinto para cada persona y constante para cada una. No es un error de medición: es una propiedad del lugar respecto de quien lo cruza.',
          kind: 'experiential', source: 'cotejo de los tres testimonios', reliability: 'reliable',
        }],
      }];

      if (pista(estado, '843 postes')) {
        efectos.push({
          texto: [
            'Y todavía queda el alambrado, que no tiene opinión: ochocientos cuarenta y tres postes cada diez ' +
            'metros. Los postes no se acuerdan de nada y no se acostumbran a nada.\n\n' +
            'Los postes dicen ocho mil cuatrocientos treinta. La mensura firmada dice cinco mil doscientos. ' +
            'Y las cuatro esquinas son ángulos rectos.',
          ],
          contradiccion: {
            description: 'El lado oeste mide 8.430 m contados en postes y 5.200 m según la mensura registrada, y sin embargo el cuadrilátero cierra en el terreno con cuatro ángulos rectos.',
            between: 'Recuento de postes | Mensura de 1903 | El alambrado existente',
          },
        });
      }
      return efectos;
    },
  },

  {
    id: 'leer-mensuras', prioridad: 76,
    cuando: (s, i) =>
      dice(i, /mensura|planos|los papeles|expediente/) && aqui(s) === 'escritorio',
    prueba: (s) => s.documents['doc-mensura1903']?.obtainedAt ? null : ({
      skill: 'buscar_libros', difficulty: 'regular',
      reason: 'ordenar veinte años de papeles de campo',
      stakes_success: 'encontrás las dos mensuras y el título',
      stakes_failure: 'boletos de marca y cuentas del almacén',
    }),
    resolver: ({ estado, tirada, variante }) => {
      if (estado.documents['doc-mensura1903']?.obtainedAt) {
        return { texto: ['Ya tenés las mensuras y el título. Están en tus documentos.'] };
      }
      if (!tirada?.exito) {
        return {
          texto: [variante([
            'Media hora entre legajos. Boletos de marca, cuentas del almacén de Rufino, una carpeta entera de ' +
            'recibos de alambre. Nada de lo que buscás.',
            'Otra pasada por los estantes, con más método. Todavía no. Se puede seguir buscando.',
          ])],
        };
      }
      return [
        {
          texto: ['En la letra M del fichero, las dos carpetas. Y en el estante de abajo, el legajo del título.'],
          documento: { id: 'doc-mensura1903', how: 'estaba en la letra M, con el lomo gastado' },
        },
        { documento: { id: 'doc-mensura1924', how: 'al lado de la anterior, impecable salvo una esquina doblada' } },
        {
          documento: { id: 'doc-titulo', how: 'en el estante de abajo, con el resto de los legajos de 1887' },
          pistas: [{
            description: 'El título de 1887 llama a la fracción «la legua que no se acaba» y el comprador renunció por escrito a reclamar por diferencia de superficie.',
            kind: 'documentary', source: 'título de propiedad, 1887', reliability: 'reliable',
          }],
          estabilidad: { amount: -5, cause: 'un escribano de 1887 que ya sabía' },
          pregunta: '¿Por qué el escribano de 1887 hizo renunciar al comprador antes de que hubiera un problema?',
        },
      ];
    },
  },

  {
    id: 'leer-libreta', prioridad: 74,
    cuando: (_s, i) => dice(i, /libreta|cuaderno de roldan|anotaciones de roldan/),
    prueba: (s) => propiedadVista(s, 'it-libreta') ? null : ({
      skill: 'buscar_libros', difficulty: 'regular',
      reason: 'seguir la letra de un agrimensor a través de cuatro días de febrero de 1903',
      stakes_success: 'encontrás la jornada del 11',
      stakes_failure: 'columnas de números que no dicen nada todavía',
    }),
    resolver: ({ estado, tirada }) => {
      if (propiedadVista(estado, 'it-libreta')) {
        return { texto: [`Volvés sobre la jornada del 11 de febrero. ${oculta(estado, 'it-libreta')}`] };
      }
      if (!tirada?.exito) {
        return { texto: ['Columnas de rumbos y distancias, todo prolijo, todo firmado. Sin saber qué buscás, es sólo trabajo bien hecho.'] };
      }
      return [
        { descubre: { itemId: 'it-libreta', propertyId: 'p-libreta-doble', how: 'siguiendo la jornada del 11 de febrero de 1903' } },
        {
          texto: [oculta(estado, 'it-libreta')],
          pistas: [{
            description: 'La libreta de Roldán tiene la jornada del 11 de febrero de 1903 anotada dos veces, con dos distancias, y una nota: «Anoto la que coincide con el título. Que la corrija otro.»',
            kind: 'documentary', source: 'libreta de campo de Eusebio Roldán', reliability: 'reliable',
          }],
          estabilidad: { amount: -6, cause: 'veintidós años de alguien esperando que otro lo corrija' },
          exposicion: { amount: 3, source: 'libreta-doble', cause: 'la anotación tachada de manera que se siga leyendo' },
        },
      ];
    },
  },

  {
    id: 'examinar-cantimplora', prioridad: 72,
    cuando: (_s, i) => i.objetivo.id === 'it-cantimplora' && ['mirar', 'examinar', 'oler', 'buscar'].includes(i.verb),
    prueba: (s) => propiedadVista(s, 'it-cantimplora') ? null : ({
      skill: 'ciencia_naturales', difficulty: 'regular',
      reason: 'establecer hace cuánto está seca una cantimplora',
      stakes_success: 'lo establecés',
      stakes_failure: 'está vacía, y eso ya lo sabías',
    }),
    resolver: ({ estado, tirada }) => {
      if (propiedadVista(estado, 'it-cantimplora')) {
        return { texto: [oculta(estado, 'it-cantimplora')] };
      }
      if (!tirada?.exito) {
        return { texto: ['Vacía. Abollada. La correa cortada limpio. Nada que un peón muerto de sed no tenga.'] };
      }
      return [
        { descubre: { itemId: 'it-cantimplora', propertyId: 'p-cant-seca', how: 'oliendo el interior y buscando depósito' } },
        {
          texto: [oculta(estado, 'it-cantimplora')],
          pistas: [{
            description: 'La cantimplora de Fermín no tiene rastro de haber contenido agua, y lo vieron llenarla antes de salir.',
            kind: 'physical', source: 'la cantimplora', reliability: 'reliable',
          }],
          exposicion: { amount: 5, source: 'cantimplora', cause: 'una cantimplora que no recuerda haber tenido agua' },
          estabilidad: { amount: -5, cause: 'agua que estuvo y no dejó marca' },
        },
      ];
    },
  },

  {
    id: 'caminar-al-tanque', prioridad: 70,
    cuando: (s, i) =>
      dice(i, /camino hasta el tanque|voy caminando al tanque|hago el camino de fermin|doscientos metros/)
      && ['rastro', 'molino'].includes(aqui(s)),
    antes: () => ({
      texto: [
        'Te parás donde estaba Fermín, mirás el tanque —se ve, se ve clarísimo— y empezás a caminar hacia él ' +
        'contando los pasos.',
      ],
    }),
    resolver: () => ({
      tiempo: { minutes: 25, reason: 'caminar doscientos metros' },
      texto: [
        'Doscientos ochenta y cuatro pasos. Llegás. Tocás el borde del tanque, que está frío y mojado y es ' +
        'completamente real, y tomás agua con la mano.\n\n' +
        'Después mirás el reloj.\n\n' +
        'Veinticinco minutos.\n\n' +
        'Doscientos ochenta y cuatro pasos en veinticinco minutos, sin haberte detenido, sin haberte distraído, ' +
        'contando en voz alta todo el tiempo para no distraerte.\n\n' +
        'Y Fermín hizo este mismo camino, según sus huellas, ochenta y cinco veces.',
      ],
      exposicion: { amount: 9, source: 'rastro:caminar', cause: 'hacer los doscientos metros que Fermín no pudo hacer' },
      estabilidad: { amount: -12, cause: 'veinticinco minutos para doscientos metros, con el reloj en la mano' },
      pistas: [{
        description: 'Doscientos metros hasta el tanque llevan veinticinco minutos caminando sin detenerse. Fermín hizo ese trayecto ochenta y cinco veces.',
        kind: 'experiential', source: 'caminata propia con reloj', reliability: 'reliable',
      }],
      contradiccion: {
        description: 'Doscientos ochenta y cuatro pasos llevan veinticinco minutos, cuando deberían llevar tres.',
        between: 'La distancia medida en pasos | El tiempo medido en reloj',
      },
    }),
  },

  {
    id: 'certificar-fermin', prioridad: 68,
    cuando: (s, i) =>
      dice(i, /autopsia|reviso el cuerpo|examino a fermin|certifico la causa/) && aqui(s) === 'galpon',
    prueba: () => ({
      skill: 'medicina', difficulty: 'regular',
      reason: 'establecer causa y tiempo de muerte',
      stakes_success: 'establecés las dos cosas',
      stakes_failure: 'murió de sed, y eso lo dice cualquiera',
    }),
    resolver: ({ tirada }) => tirada?.exito
      ? {
          texto: [
            'Deshidratación, sin lugar a dudas, y no menos de dos días de agonía. Eso es lo fácil.\n\n' +
            'Lo otro son los pies: ampollas reventadas y vueltas a hacer encima, en capas. Eso no se hace en dos ' +
            'días. Eso son cinco o seis jornadas de caminata continua.\n\n' +
            'Fermín salió el lunes a la mañana y apareció el miércoles. Cuarenta y ocho horas.\n\n' +
            'Y tiene los pies de alguien que caminó una semana.',
          ],
          pistas: [{
            description: 'Los pies de Fermín muestran cinco o seis días de caminata continua. Estuvo desaparecido cuarenta y ocho horas.',
            kind: 'physical', source: 'examen del cuerpo', reliability: 'reliable',
          }],
          exposicion: { amount: 6, source: 'cuerpo:examinar', cause: 'un cuerpo que caminó más días de los que estuvo afuera' },
          estabilidad: { amount: -8, cause: 'seis días de ampollas en cuarenta y ocho horas' },
          contradiccion: {
            description: 'Fermín estuvo desaparecido dos días y tiene los pies de alguien que caminó seis.',
            between: 'Fecha de salida y hallazgo | Estado de los pies',
          },
        }
      : {
          texto: [
            'Murió de sed. Eso se ve desde la puerta y no hace falta ser médica para verlo.\n\n' +
            'Para decir algo más que eso hace falta mirarlo mejor, y con esta luz no se puede.',
          ],
        },
  },
];
