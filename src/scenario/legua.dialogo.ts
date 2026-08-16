/**
 * LO QUE SE LE PUEDE PREGUNTAR EN LA PERSEVERANCIA.
 *
 * Tres personas midieron el mismo campo y dan tres números distintos. **Ninguna
 * miente.** Ése es el motor de la aventura y la razón de que la mecánica social
 * cambie de función: en Agua Quieta, Psicología servía para saber si Rosa
 * decía la verdad. Acá todos dicen la verdad, así que Psicología sirve para
 * otra cosa — para entender POR QUÉ están tan seguros.
 *
 * Las pistas que dejan estos temas son deliberadamente incompatibles entre sí.
 * El tablero de contradicciones, que existía desde el principio y no se usaba
 * nunca, es donde la aventura se resuelve.
 */

import type { GameState } from '../shared/types.ts';
import type { Conversaciones } from './conversacion.ts';

const pista = (s: GameState, frag: string) => s.board.clues.some((c) => c.description.includes(frag));
const dicho = (s: GameState, frag: string) =>
  s.narrative.some((n) => n.kind === 'keeper' && n.text.includes(frag));
const doc = (s: GameState, id: string) => Boolean(s.documents[id]?.obtainedAt);
const propiedad = (s: GameState, item: string) =>
  (s.items[item]?.discoveredProperties.length ?? 0) > 0;

export const LEGUA_TEMAS: Conversaciones = [
  // ══ HERMINIA — la dueña. Quiere un número y quiere vender. ════════════════
  {
    id: 'h-fermin', npc: 'npc-herminia', orden: 10,
    etiqueta: 'Preguntarle qué pasó con Fermín',
    intencion: 'Le pregunto a Herminia qué pasó con Fermín',
    claves: ['que paso con fermin', 'fermin', 'el peon', 'la muerte'],
    agotado: (s) => pista(s, 'salió el lunes a la mañana'),
    cede: {
      actitud: 3,
      texto: [
        '—Salió el lunes a la mañana a revisar el alambrado del oeste. Se llevó la cantimplora llena, yo lo vi ' +
        'llenarla en la bomba. —Habla mirando el mapa de la pared, no a usted—. Volvía a la tarde. No volvió.\n\n' +
        '—El miércoles Casimiro lo encontró al lado del tanque. Del tanque, {trato}. Lleno.\n\n' +
        'Se queda un momento y después dice, más rápido:\n\n—Necesito el certificado. Tengo una operación en curso.',
      ],
      pista: {
        description: 'Fermín salió el lunes a la mañana con la cantimplora llena a revisar el alambrado del oeste. Apareció el miércoles junto al tanque.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
  },
  {
    id: 'h-distancia', npc: 'npc-herminia', orden: 12,
    etiqueta: 'Preguntarle cuánto hay del casco al molino',
    intencion: 'Le pregunto a Herminia cuánto hay del casco al molino',
    claves: ['cuanto hay del casco', 'distancia al molino', 'cuanto se tarda'],
    agotado: (s) => pista(s, 'Herminia: veinte minutos'),
    cede: {
      actitud: 2,
      texto: [
        '—Veinte minutos a caballo. —Contesta sin pensarlo, como quien contesta la hora—. Lo cronometré dos veces, ' +
        'con reloj, porque acá nadie sabe medir nada.\n\n' +
        'Y agrega, con una precisión que suena a defensa:\n\n—Veinte minutos y cuarenta segundos la primera vez. ' +
        'Veinte minutos y cuarenta segundos la segunda.',
      ],
      pista: {
        description: 'Herminia: veinte minutos y cuarenta segundos del casco al molino, cronometrados dos veces, idénticos.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
  },
  {
    id: 'h-mensuras', npc: 'npc-herminia', orden: 14,
    etiqueta: 'Preguntarle por las dos mensuras',
    intencion: 'Le pregunto a Herminia por las mensuras',
    claves: ['mensura', 'las dos mediciones', 'los planos'],
    disponible: (s) => doc(s, 'doc-mensura1903') || doc(s, 'doc-mensura1924'),
    agotado: (s) => dicho(s, 'no me quiso firmar el plano'),
    prueba: {
      skill: 'persuasion', difficulty: 'regular',
      razon: 'que admita que la segunda mensura no le sirvió para nada',
    },
    cede: {
      actitud: 4,
      texto: [
        '—La de 1903 no coincidía con el título, así que mandé a hacer otra. Bermúdez estuvo tres semanas. ' +
        'Midió el oeste cuatro veces, con dos aparatos distintos, y le dio siempre lo mismo.\n\n' +
        '—Y después no me quiso firmar el plano. —Ahora sí lo mira a usted—. Le pagué igual. Un profesional que ' +
        'mide cuatro veces y no firma no es un profesional que se equivocó, {trato}. Es un profesional que vio algo.',
      ],
      pista: {
        description: 'El agrimensor de 1924 midió el oeste cuatro veces con dos instrumentos, obtuvo siempre 8.430 m, y se negó a firmar el plano.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
    esquiva: {
      texto: [
        '—Papeles viejos. —Se encoge de hombros—. Un agrimensor midió mal en 1903 y ahora me cuesta vender. ' +
        'Es un problema de escribanía, no de otra cosa.\n\n' +
        'Lo dice bien, con seguridad. Pero no le sostiene la mirada mientras lo dice.',
      ],
    },
  },
  {
    id: 'h-roldan', npc: 'npc-herminia', orden: 16,
    etiqueta: 'Preguntarle qué opina de Roldán',
    intencion: 'Le pregunto a Herminia qué opina de Roldán',
    claves: ['roldan', 'el agrimensor viejo', 'el viejo del traje'],
    disponible: (s) => pista(s, 'salió el lunes a la mañana'),
    agotado: (s) => dicho(s, 'nadie lo llamó'),
    cede: {
      actitud: 1,
      texto: [
        '—Nadie lo llamó. —Baja la voz, aunque el viejo está afuera—. Se enteró en el pueblo y vino solo, en el ' +
        'break, con el traje puesto. Setenta y un años.\n\n' +
        '—Yo creo que falseó la mensura para favorecer al viejo Lastra, y que vino a ver si lo descubren. ' +
        'Es lo único que se me ocurre.\n\nY es lo único que se le ocurre, se le nota. No es que esté convencida.',
      ],
    },
  },
  {
    id: 'h-oeste', npc: 'npc-herminia', orden: 18,
    etiqueta: 'Preguntarle por qué no va al alambrado del oeste',
    intencion: 'Le pregunto a Herminia por qué no va al oeste',
    claves: ['por que no va al oeste', 'el alambrado del oeste', 'que le paso a ella'],
    disponible: (s) => pista(s, 'Herminia: veinte minutos'),
    agotado: (s) => pista(s, 'nueve horas') || dicho(s, 'No tengo por qué ir'),
    prueba: {
      skill: 'psicologia', difficulty: 'hard', actitudMinima: 15,
      razon: 'que cuente lo que le pasó a ella y no lo que le pasó al campo',
    },
    cede: {
      actitud: 6,
      texto: [
        'Herminia deja el mate sin haberlo tomado.\n\n' +
        '—Fui una vez. Con la rueda. Salí a las once y volví… —se detiene, y arranca de nuevo—. Para mí volví a la ' +
        'una. Dos horas. Tengo el reloj de pulsera y lo miré.\n\n' +
        '—Acá me esperaron hasta las ocho de la noche. Casimiro había salido a buscarme dos veces.\n\n' +
        '—No estoy loca, {trato}. Miré el reloj.',
      ],
      pista: {
        description: 'Herminia midió el oeste durante dos horas según su reloj. En el casco la esperaron nueve. Ninguna de las dos versiones se corrigió después.',
        kind: 'testimonial', reliability: 'reliable',
      },
      exposicion: 5,
      revelaSecreto: 's-h-vuelta',
    },
    esquiva: {
      actitud: 2,
      texto: [
        '—No tengo por qué ir. Para eso está el capataz. —Levanta el mate y se lo lleva a la boca sin tomar—. ' +
        'Yo administro, no recorro.\n\nEs una respuesta razonable dicha por alguien que compró una rueda de ' +
        'agrimensor para medir el campo con sus propias manos.',
      ],
    },
    cerrado: {
      // {trato} a mitad de frase: ver la nota de `keeper/social.ts` sobre por
      // qué el token nunca abre la oración.
      texto: ['—Usted, {trato}, vino a firmar un papel. —Y sonríe con la boca nada más.'],
    },
  },

  // ══ CASIMIRO — el capataz. El que más adentro estuvo. ═════════════════════
  {
    id: 'c-encontro', npc: 'npc-casimiro', orden: 20,
    etiqueta: 'Preguntarle cómo lo encontró',
    intencion: 'Le pregunto a Casimiro cómo encontró a Fermín',
    claves: ['como lo encontro', 'como encontro', 'cuando lo encontro'],
    agotado: (s) => pista(s, 'boca arriba, mirando el tanque'),
    cede: {
      actitud: 3,
      texto: [
        '—Miércoles, temprano. Venía por el bajo y lo vi de lejos, en el pastizal. —Se saca el sombrero para hablar ' +
        'y lo tiene en la mano todo el rato—. Estaba boca arriba, mirando el tanque.\n\n' +
        '—Doscientos metros, {trato}. Yo los caminé para estar seguro. Doscientos y pico.\n\n' +
        'Y después, más bajo:\n\n—Tenía los ojos abiertos y estaba mirando para allá. Para el agua.',
      ],
      pista: {
        description: 'Fermín apareció boca arriba, mirando el tanque, a doscientos metros. Casimiro caminó la distancia para confirmarla.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
  },
  {
    id: 'c-huellas', npc: 'npc-casimiro', orden: 22,
    etiqueta: 'Preguntarle por las huellas que contó',
    intencion: 'Le pregunto a Casimiro por las huellas',
    claves: ['las huellas', 'los pasos', 'diecisiete kilometros', 'lo que conto'],
    disponible: (s) => pista(s, 'boca arriba, mirando el tanque'),
    agotado: (s) => pista(s, 'dieciséis mil quinientos'),
    prueba: {
      skill: 'persuasion', difficulty: 'regular',
      razon: 'que le explique a alguien de afuera cómo se cuentan pasos en la tierra',
    },
    cede: {
      actitud: 4,
      texto: [
        '—Se cuenta por tramo. —Se agacha y dibuja en la tierra con el dedo mientras habla—. Uno mide la zancada ' +
        'del hombre, mide un tramo de diez zancadas, y después cuenta los tramos.\n\n' +
        '—Dieciséis mil quinientos pasos. Diecisiete kilómetros, más o menos.\n\n' +
        'Se para y se sacude la mano en el pantalón.\n\n' +
        '—El campo mide cinco por cinco, {trato}. Para caminar diecisiete kilómetros derecho para el mismo lado ' +
        'hay que salirse tres veces. Y el alambre está entero.',
      ],
      pista: {
        description: 'Casimiro contó dieciséis mil quinientos pasos en línea recta hacia el tanque. Diecisiete kilómetros dentro de un campo de cinco por cinco, con el alambrado intacto.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
    esquiva: {
      texto: [
        '—Conté. —Y no dice más. Se pone el sombrero y mira el molino.\n\n' +
        'Contó bien, se le nota. Lo que no quiere es explicar qué significa lo que contó.',
      ],
    },
  },
  {
    id: 'c-distancia', npc: 'npc-casimiro', orden: 24,
    etiqueta: 'Preguntarle cuánto hay del casco al molino',
    intencion: 'Le pregunto a Casimiro cuánto hay del casco al molino',
    claves: ['casimiro cuanto hay', 'media hora', 'cuanto tarda a caballo'],
    agotado: (s) => pista(s, 'Casimiro: media hora'),
    cede: {
      actitud: 2,
      texto: [
        '—Media hora a caballo. —Lo dice como se dice el nombre de uno.\n\n' +
        'Usted le comenta que la patrona dice veinte minutos. Casimiro no se ofende ni discute.\n\n' +
        '—Y sí. Para ella son veinte. —Se queda pensando si decir lo que sigue, y lo dice—: Para mi padre eran ' +
        'cuarenta. Yo lo acompañé de chico y eran cuarenta.\n\n' +
        '—Cada uno tiene su media hora, {trato}. Uno se acostumbra.',
      ],
      pista: {
        description: 'Casimiro: media hora del casco al molino. Su padre tardaba cuarenta minutos en el mismo trayecto. Ninguno cree que el otro se equivoque.',
        kind: 'testimonial', reliability: 'reliable',
      },
      exposicion: 4,
    },
  },
  {
    id: 'c-1911', npc: 'npc-casimiro', orden: 26,
    etiqueta: 'Preguntarle si pasó antes',
    intencion: 'Le pregunto a Casimiro si esto pasó antes',
    claves: ['paso antes', 'otra vez', 'hubo otro', 'alguna vez'],
    disponible: (s) => pista(s, 'dieciséis mil quinientos'),
    agotado: (s) => pista(s, '1911'),
    prueba: {
      skill: 'psicologia', difficulty: 'hard', actitudMinima: 20,
      razon: 'que suelte lo que calla desde hace catorce años',
    },
    cede: {
      actitud: 8,
      texto: [
        'Casimiro se queda mirando el sombrero que tiene en la mano.\n\n' +
        '—El once. —Y lo dice como quien apoya algo pesado—. Un muchacho, Zabaleta. Igualito. Cerca del agua, ' +
        'seco como un cuero.\n\n' +
        '—El patrón viejo mandó a enterrarlo atrás del monte y me dijo que si yo hablaba me iba del campo. Yo tenía ' +
        'veinte años y me quedé callado.\n\n' +
        'Levanta la vista por primera vez en toda la conversación.\n\n' +
        '—Usted es la primera que pregunta bien. Los otros preguntaban qué pasó. Usted preguntó si pasó antes.',
      ],
      pista: {
        description: 'En 1911 apareció otro peón muerto igual, cerca del agua. Lo enterraron sin acta y a Casimiro le prohibieron hablar.',
        kind: 'testimonial', reliability: 'reliable',
      },
      exposicion: 4,
      revelaSecreto: 's-c-1911',
    },
    esquiva: {
      texto: [
        '—No sé. —Se pone el sombrero—. Hace mucho que estoy acá y pasan cosas.\n\n' +
        'Es una respuesta que no dice nada y que tarda demasiado en llegar.',
      ],
    },
    cerrado: {
      texto: [
        '—Yo trabajo acá, {trato}. —Y con eso contesta todo lo que hace falta contestar por ahora.',
      ],
    },
  },
  {
    id: 'c-miedo', npc: 'npc-casimiro', orden: 28,
    etiqueta: 'Preguntarle por qué no va al oeste después del mediodía',
    intencion: 'Le pregunto a Casimiro por qué no va al oeste después del mediodía',
    claves: ['despues del mediodia', 'por que no va', 'le tiene miedo'],
    disponible: (s) => pista(s, '1911'),
    agotado: (s) => pista(s, 'de vuelta se hace más largo'),
    cede: {
      actitud: 5,
      texto: [
        '—Porque de ida se hace corto y de vuelta se hace más largo. —No baja la voz: lo dice como un dato de ' +
        'trabajo, igual que diría que el bajo se inunda—. Si salís al mediodía, volvés de noche. Si salís a la ' +
        'mañana, volvés a la tarde.\n\n' +
        '—No es que sea peligroso. Es que hay que tener en cuenta.\n\n' +
        'Y ahí está lo peor de todo: que Casimiro no está asustado. Casimiro se acostumbró.',
      ],
      pista: {
        description: 'Para Casimiro, ir al oeste es más corto que volver del oeste. Lo trata como una condición del terreno, igual que un bajo que se inunda.',
        kind: 'testimonial', reliability: 'reliable',
      },
      exposicion: 5,
    },
  },

  // ══ EUSEBIO — el agrimensor. Vino sin que lo llamaran. ════════════════════
  {
    id: 'e-porque', npc: 'npc-eusebio', orden: 30,
    etiqueta: 'Preguntarle por qué vino',
    intencion: 'Le pregunto a Eusebio por qué vino',
    claves: ['por que vino', 'quien lo llamo', 'que hace aca'],
    agotado: (s) => dicho(s, 'Vine porque leí «cerca del agua»'),
    cede: {
      actitud: 3,
      texto: [
        '—Vine porque leí «cerca del agua» en el diario del pueblo. —Tiene las manos apoyadas en el bastón y no ' +
        'las mueve—. Muerto de sed cerca del agua.\n\n' +
        '—Yo medí este campo en 1903, señora. Tengo setenta y un años y no vine a ofrecer mis servicios.\n\n' +
        'Se queda callado el tiempo justo para que quede claro que eso no es todo lo que vino a decir.',
      ],
    },
  },
  {
    id: 'e-1903', npc: 'npc-eusebio', orden: 32,
    etiqueta: 'Preguntarle por la mensura de 1903',
    intencion: 'Le pregunto a Eusebio por la mensura de 1903',
    claves: ['mensura de 1903', 'lo que midio', 'su mensura'],
    disponible: (s) => doc(s, 'doc-mensura1903'),
    agotado: (s) => pista(s, 'Roldán midió tres veces'),
    prueba: {
      skill: 'persuasion', difficulty: 'regular',
      razon: 'que hable de la mensura como agrimensor y no como acusado',
    },
    cede: {
      actitud: 5,
      texto: [
        '—Medí el lado oeste tres veces en cuatro días. —Habla con la precisión de quien ensayó esto durante ' +
        'veintidós años—. Cinco mil doscientos. Seis mil ciento veinte. Y una tercera.\n\n' +
        '—Anoté cinco mil doscientos porque era el número que coincidía con el título de 1887, y porque un ' +
        'agrimensor que entrega tres números no entrega ninguno.\n\n' +
        'Golpea el bastón contra el escalón, una vez.\n\n' +
        '—No falseé nada, señora. Elegí. Que no es lo mismo y es peor.',
      ],
      pista: {
        description: 'Roldán midió tres veces el lado oeste en 1903 y obtuvo tres valores distintos. Anotó el que coincidía con el título.',
        kind: 'testimonial', reliability: 'reliable',
      },
    },
    esquiva: {
      texto: [
        '—Está firmada y está registrada. —Cierra las dos manos sobre el bastón—. Si alguien tiene una objeción, ' +
        'que la presente por escrito ante el departamento topográfico.\n\n' +
        'Es la respuesta de un hombre que preparó una defensa y no una conversación.',
      ],
    },
  },
  {
    id: 'e-tercera', npc: 'npc-eusebio', orden: 34,
    etiqueta: 'Preguntarle cuál fue la tercera medición',
    intencion: 'Le pregunto a Eusebio cuál fue la tercera medición',
    claves: ['la tercera', 'tercera medicion', 'el tercer numero'],
    disponible: (s) => pista(s, 'Roldán midió tres veces'),
    agotado: (s) => pista(s, 'la midió de noche'),
    prueba: {
      skill: 'psicologia', difficulty: 'hard', actitudMinima: 25,
      razon: 'que diga el número que no anotó en ninguna parte',
    },
    cede: {
      actitud: 8,
      texto: [
        'El viejo tarda mucho en contestar. Cuando contesta, no la mira.\n\n' +
        '—La tercera la hice de noche, con lámpara, porque quería descartar el error del anteojo. —Traga—. ' +
        'Ocho mil cuatrocientos treinta.\n\n' +
        '—Ése es el número que le da a usted si cuenta los postes. Lo sé porque los conté yo también, esa noche, ' +
        'uno por uno, hasta que se me acabó el querosén.\n\n' +
        '—Y entonces entendí que el número dependía de la hora. Y que eso no se puede escribir en una mensura, ' +
        'señora, porque una mensura es un papel que después firma un juez.',
      ],
      pista: {
        description: 'La tercera medición de Roldán la hizo de noche: 8.430 metros, exactamente lo que da contar los postes. El número depende de la hora.',
        kind: 'testimonial', reliability: 'reliable',
      },
      exposicion: 6,
      revelaSecreto: 's-e-tercera',
    },
    // Un 01 es éxito automático, y acá significa que Eusebio no sólo contesta:
    // contesta la pregunta que usted todavía no le hizo.
    critico: {
      actitud: 12,
      texto: [
        'El viejo tarda mucho en contestar. Cuando contesta, no la mira, y por primera vez en veintidós años ' +
        'termina la idea entera.\n\n' +
        '—La tercera la hice de noche, con lámpara, porque quería descartar el error del anteojo. —Traga—. ' +
        'Ocho mil cuatrocientos treinta.\n\n' +
        '—Ése es el número que le da a usted si cuenta los postes. Lo sé porque los conté yo también, esa noche, ' +
        'uno por uno, hasta que se me acabó el querosén.\n\n' +
        '—Y entonces entendí que el número dependía de la hora. Y que eso no se puede escribir en una mensura, ' +
        'porque una mensura es un papel que después firma un juez.\n\n' +
        'Se queda callado un rato. Después agrega lo que veintidós años nunca le sacaron a nadie:\n\n' +
        '—La medí una cuarta vez. Al amanecer, con la primera luz. Dio nueve mil once. Esa no la firmé ni se la ' +
        'conté a nadie, porque una mensura que cambia con la hora del día no es una mensura: es una pregunta ' +
        'disfrazada de número, y a mí me pagaban por números.',
      ],
      pista: {
        description: 'Roldán midió una cuarta vez, al amanecer: 9.011 metros. No la registró ni la contó a nadie hasta ahora. El campo no tiene un solo número que no cierra: tiene varios, todos distintos, todos según la hora.',
        kind: 'testimonial', reliability: 'reliable',
      },
      exposicion: 6,
      revelaSecreto: 's-e-tercera',
    },
    esquiva: {
      texto: [
        '—La tercera la descarté. —Y ahí se le nota la edad por primera vez—. Un instrumento descalibrado. ' +
        'Pasaba, en esa época.\n\n' +
        'Lo dice mirando el bastón. Veintidós años diciendo lo mismo no le alcanzaron para aprender a decirlo bien.',
      ],
    },
    // Una pifia en Psicología acá no es que Eusebio esquive: es que usted
    // presiona mal a un viejo que lleva veintidós años protegiendo esto, y
    // él se cierra de una manera que ya no se puede reabrir con otra tirada.
    pifia: {
      actitud: -10,
      texto: [
        'Algo en cómo lo pregunta lo cierra de golpe, como una puerta que se golpea sola con el viento.\n\n' +
        '—La tercera la descarté —dice, y esta vez no le tiembla la voz ni le falla la mirada. Es la primera ' +
        'vez que miente bien.\n\n' +
        'Se levanta, apoyado en el bastón, y usted entiende que la conversación terminó de una manera distinta ' +
        'a las otras veces: no porque él se cansó, sino porque decidió que con usted no valía la pena seguir ' +
        'intentando decirlo.',
      ],
    },
    cerrado: {
      // Antes decía «usted es médica», que asumía a la vez género y ocupación
      // —el mismo error que «doctora», con otras palabras—. La broma de
      // Eusebio no necesita saber qué estudió el investigador: necesita saber
      // que no es agrimensor, y eso vale para cualquiera.
      texto: [
        '—Con todo respeto, {trato}: medir no es su oficio. —Y no lo dice con desprecio, sino con cansancio—. ' +
        'Tráigame a alguien que sepa medir y hablamos.',
      ],
    },
  },
  {
    id: 'e-mojon', npc: 'npc-eusebio', orden: 36,
    etiqueta: 'Preguntarle por el círculo grabado en el mojón',
    intencion: 'Le pregunto a Eusebio por el círculo del mojón',
    claves: ['el circulo', 'el mojon', 'la marca grabada', 'la linea vertical'],
    disponible: (s) => pista(s, 'circunferencia atravesada'),
    agotado: (s) => pista(s, 'ya estaba en 1903'),
    cede: {
      actitud: 4,
      texto: [
        '—Ya estaba en 1903. —Contesta rápido, casi con alivio de que le pregunten algo que puede contestar—. ' +
        'Lo anoté en la libreta y después taché la anotación, porque no venía al caso.\n\n' +
        '—No es una marca de deslinde. Yo conozco todas las marcas de deslinde de esta provincia y ésa no es ' +
        'ninguna. La grabó alguien que no era agrimensor.\n\n' +
        'Se queda pensando.\n\n—Lo que nunca supe es si la grabó antes o después de que el campo empezara a no cerrar.',
      ],
      pista: {
        description: 'El círculo atravesado del mojón ya estaba en 1903 y no es una marca de deslinde conocida. La grabó alguien que no era agrimensor.',
        kind: 'testimonial', reliability: 'reliable',
      },
      pregunta: '¿Quién grabó el círculo atravesado en el mojón, y cuándo?',
    },
  },
  {
    id: 'e-medir', npc: 'npc-eusebio', orden: 38,
    etiqueta: 'Pedirle que mida con usted',
    intencion: 'Le pido a Eusebio que mida conmigo',
    claves: ['que mida conmigo', 'medir juntos', 'que me acompane a medir'],
    disponible: (s) => pista(s, 'la midió de noche') || propiedad(s, 'it-rueda'),
    agotado: (s) => dicho(s, 'Yo ya no mido'),
    cede: {
      actitud: 3,
      texto: [
        '—Yo ya no mido. —Levanta las manos del bastón y se las muestra: tiemblan, no mucho, lo justo—. ' +
        'Con esto no se sostiene una mira.\n\n' +
        '—Pero la acompaño. Y le cuento los postes en voz alta mientras usted empuja la rueda, que es lo único ' +
        'que puedo hacer todavía y lo hago bien.\n\n' +
        'Y ahí está: setenta y un años, traje de pueblo, y vino desde el pueblo sin que nadie lo llamara para ' +
        'que alguien por fin midiera con él.',
      ],
    },
  },
];
