/**
 * CONTRATO DE HERRAMIENTAS DEL KEEPER
 *
 * El modelo actúa EXCLUSIVAMENTE por estas herramientas. No hay salida en texto
 * que el motor interprete como comando. Cada una se valida en el motor antes de
 * aplicarse; el rechazo queda registrado.
 *
 * Herramientas que NO existen y NO deben existir:
 *   set_hp · set_san · roll_dice · edit_past_event · reveal_secret · override_roll
 * La ausencia es la garantía. Análisis Técnico v1.1 §7.2.
 */

export interface ToolDef {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
  strict?: boolean;
}

const str = (description: string) => ({ type: 'string', description });
const int = (description: string, min?: number, max?: number) => ({
  type: 'integer', description,
  ...(min !== undefined ? { minimum: min } : {}),
  ...(max !== undefined ? { maximum: max } : {}),
});
const enumOf = (values: string[], description: string) => ({ type: 'string', enum: values, description });

export const KEEPER_TOOLS: ToolDef[] = [
  {
    name: 'request_roll',
    description:
      'Pide al motor que ejecute una tirada de D100. Usala cuando la acción tenga un resultado incierto Y relevante. ' +
      'NO tires por acciones triviales. Vas a comprometerte con la habilidad, la dificultad y las apuestas ANTES de ' +
      'conocer el resultado: el motor tira el dado y te devuelve el número. Una sola tirada por intención del jugador.',
    input_schema: {
      type: 'object',
      properties: {
        skill: str('ID de habilidad (ej: "descubrir") o característica ("POW", "INT"). Debe existir en la ficha.'),
        difficulty: enumOf(['regular', 'hard', 'extreme'], 'Dificultad exigida.'),
        reason: str('Por qué se tira, en una frase, en lenguaje del mundo. Se le muestra al jugador.'),
        stakes_success: str('Qué consigue el investigador si supera la tirada.'),
        stakes_failure: str('Qué ocurre si falla. Un fracaso nunca es "no pasa nada".'),
        bonus_dice: int('Dados de bonificación (0-2).', 0, 2),
        penalty_dice: int('Dados de penalización (0-2).', 0, 2),
        modifier_reason: str('Por qué hay dados de bonificación o penalización. Cadena vacía si no hay.'),
      },
      required: ['skill', 'difficulty', 'reason', 'stakes_success', 'stakes_failure', 'bonus_dice', 'penalty_dice', 'modifier_reason'],
      additionalProperties: false,
    },
  },
  {
    name: 'apply_damage',
    description: 'Aplica daño físico a un investigador. El motor actualiza los puntos de vida y evalúa inconsciencia o muerte.',
    input_schema: {
      type: 'object',
      properties: {
        amount: int('Puntos de vida perdidos (positivo).', 1),
        cause: str('Causa concreta del daño.'),
      },
      required: ['amount', 'cause'],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_attack',
    description:
      'Resuelve un asalto entero contra un personaje que puede pelear: tira por el investigador, ' +
      'tira por el que se defiende, compara los dos resultados y aplica el daño a quien corresponda. ' +
      'Si hay MÁS de un rival presente con estadísticas de combate, también actúan este mismo asalto, ' +
      'en el orden que les toque por Destreza — los más rápidos que el investigador antes del golpe ' +
      'declarado, los más lentos después. Es UNA herramienta y no tres a propósito: una tirada ' +
      'enfrentada que se pueda pedir a pedazos es una que se puede abandonar cuando el primer dado ' +
      'sale mal. Si el personaje no tiene estadísticas de combate, el motor lo rechaza: esa pelea no ' +
      'está contemplada y no hay que inventarle puntos de vida.',
    input_schema: {
      type: 'object',
      properties: {
        npc_id: str('Id del personaje al que se ataca.'),
        weapon_id: str('Id del arma que usa el investigador. Sin esto, pelea a mano limpia.'),
        reason: str('Qué está intentando hacer, en una frase.'),
        apuntando: enumOf(['true', 'false'], 'Sólo con arma de fuego: pasó el turno anterior apuntando. Da un dado de bonificación.'),
        punto_blanco: enumOf(['true', 'false'], 'Sólo con arma de fuego: dispara a quemarropa. Da un dado de bonificación.'),
        cubierto: enumOf(['true', 'false'], 'Sólo con arma de fuego: el blanco está parcialmente cubierto. Da un dado de penalización.'),
        blanco_movil: enumOf(['true', 'false'], 'Sólo con arma de fuego: el blanco se mueve rápido. Da un dado de penalización.'),
      },
      required: ['npc_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_flee',
    description:
      'Sale de una pelea a mitad de asalto. Cuesta el turno entero —no se ataca— y cada rival ' +
      'presente que todavía pueda pelear se lleva un golpe de oportunidad con ventaja, porque quien ' +
      'huye no se está defendiendo. Puede fallar: si el golpe de oportunidad tumba al investigador, ' +
      'no llega a irse.',
    input_schema: {
      type: 'object',
      properties: {
        weapon_id: str('Con qué se defiende el investigador si algún rival lo alcanza al huir. Sin esto, a mano limpia.'),
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_maneuver',
    description:
      'Una maniobra de combate contra alguien que puede pelear: desarmar, derribar o sujetar. Se ' +
      'resuelve como un Contraataque —Pelea contra Pelea— pero si gana la maniobra, en vez de daño ' +
      'aplica su efecto (le vuela el arma, lo tira al piso, lo sujeta). Si pierde, el otro conecta un ' +
      'golpe normal, con su arma. La Corpulencia de los dos decide si es posible: con 3 puntos o más ' +
      'de diferencia en contra, ni se ofrece como opción.',
    input_schema: {
      type: 'object',
      properties: {
        npc_id: str('Id del personaje al que se le hace la maniobra.'),
        type: enumOf(['desarmar', 'derribar', 'sujetar'], 'Qué maniobra.'),
        reason: str('Qué está intentando hacer, en una frase.'),
      },
      required: ['npc_id', 'type'],
      additionalProperties: false,
    },
  },
  {
    name: 'apply_sanity_loss',
    description:
      'Aplica pérdida de Cordura. Sólo después de una tirada de SAN, o de un horror que no admita tirada. ' +
      'El motor puede sumar pérdida extra si la Exposición al Umbral del investigador es alta.',
    input_schema: {
      type: 'object',
      properties: {
        amount: int('Puntos de SAN perdidos (positivo).', 0),
        cause: str('Qué vio o comprendió el investigador.'),
      },
      required: ['amount', 'cause'],
      additionalProperties: false,
    },
  },
  {
    name: 'apply_mythos_knowledge',
    description:
      'Suma puntos de Mitos de Cthulhu: el investigador entendió algo del marco que explica el fenómeno. ' +
      'BAJA PARA SIEMPRE el techo de Cordura (99 − Mitos) y recorta la Cordura actual si queda por encima. ' +
      'Es irreversible y no se recupera nunca. Usala SÓLO cuando el jugador eligió deliberadamente leer, ' +
      'mirar o escuchar algo que le fue advertido, nunca como castigo por investigar bien ni por sorpresa.',
    input_schema: {
      type: 'object',
      properties: {
        amount: int('Puntos de Mitos (1-10). Un texto completo del culto: 3-5. Un fragmento: 1-2.', 1, 10),
        source: str('Qué leyó, vio o entendió. Va a la narración y queda en el log.'),
      },
      required: ['amount', 'source'],
      additionalProperties: false,
    },
  },
  {
    name: 'apply_umbral_exposure',
    description:
      'Aumenta la EXPOSICIÓN al Umbral: contacto acumulado con el fenómeno. No es cordura y no es miedo. ' +
      'Observación pasiva 2 · observación deliberada 4 · presenciar anomalía 6 · eco temporal 9 · visión 14 · contacto físico 18.',
    input_schema: {
      type: 'object',
      properties: {
        amount: int('Puntos de exposición (1-20).', 1, 20),
        cause: str('Qué contacto con el Umbral lo produjo.'),
        source: str(
          'Identificador ESTABLE del origen, en minúsculas y sin espacios: "agua-aljibe", ' +
          '"feature:f-alamos", "testimonio-rosa". La misma fuente rinde cada vez menos, así que ' +
          'dos contactos con la misma cosa tienen que usar el mismo identificador, y dos cosas ' +
          'distintas nunca el mismo.',
        ),
      },
      required: ['amount', 'cause', 'source'],
      additionalProperties: false,
    },
  },
  {
    name: 'apply_stability_shift',
    description:
      'Modifica la ESTABILIDAD: coherencia de la percepción temporal. Negativo cuando el investigador recibe ' +
      'información temporalmente incoherente; positivo cuando algo externo confirma su versión de los hechos.',
    input_schema: {
      type: 'object',
      properties: {
        amount: int('Negativo para pérdida, positivo para recuperación.', -30, 10),
        cause: str('Qué causó el desplazamiento.'),
      },
      required: ['amount', 'cause'],
      additionalProperties: false,
    },
  },
  {
    name: 'apply_condition',
    description: 'Aplica una herida, un estado o un trastorno mental (fobia, manía) al investigador activo.',
    input_schema: {
      type: 'object',
      properties: {
        name: str('Nombre corto de la condición.'),
        description: str('Cómo se manifiesta.'),
        kind: enumOf(['wound', 'mental', 'status', 'phobia', 'mania'], 'Tipo de condición.'),
        temporary: enumOf(['true', 'false'], '¿Es temporal?'),
      },
      required: ['name', 'description', 'kind', 'temporary'],
      additionalProperties: false,
    },
  },
  {
    name: 'discover_property',
    description:
      'Revela una propiedad OCULTA de un objeto. El motor verifica la condición de descubrimiento; si no se cumple, ' +
      'la propuesta se rechaza. No inventes propiedades: sólo podés revelar las que el objeto ya tiene.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: str('ID del objeto.'),
        property_id: str('ID de la propiedad oculta.'),
        how: str('Cómo lo descubrió el investigador, en lenguaje del mundo.'),
        compared_with: str('ID del objeto con el que lo comparó, si la propiedad lo requiere. Cadena vacía si no aplica.'),
      },
      required: ['item_id', 'property_id', 'how', 'compared_with'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_clue',
    description:
      'Agrega una pista al tablero de investigación. Una pista es evidencia concreta que el investigador obtuvo, ' +
      'no una conclusión. Puede ser poco fiable o directamente falsa.',
    input_schema: {
      type: 'object',
      properties: {
        description: str('Qué evidencia obtuvo, en una o dos frases.'),
        kind: enumOf(['physical', 'documentary', 'testimonial', 'experiential'], 'Tipo de pista.'),
        source: str('De dónde salió: objeto, testigo, documento, experiencia directa.'),
        reliability: enumOf(['reliable', 'unreliable', 'false', 'unknown'], 'Fiabilidad real. El jugador no la ve.'),
      },
      required: ['description', 'kind', 'source', 'reliability'],
      additionalProperties: false,
    },
  },
  {
    name: 'note_contradiction',
    description: 'Registra que dos elementos de evidencia no pueden ser ciertos al mismo tiempo.',
    input_schema: {
      type: 'object',
      properties: {
        description: str('En qué consiste la incompatibilidad.'),
        between: str('Los elementos implicados, separados por " | ".'),
      },
      required: ['description', 'between'],
      additionalProperties: false,
    },
  },
  {
    name: 'raise_question',
    description: 'Agrega una pregunta abierta al tablero: un misterio que el grupo todavía no puede responder.',
    input_schema: {
      type: 'object',
      properties: { question: str('La pregunta, tal como la formularía el investigador.') },
      required: ['question'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_fact',
    description:
      'Propone promover una hipótesis a HECHO confirmado. El motor exige al menos 3 pistas de apoyo, de 2 tipos ' +
      'distintos, sin contradicciones, y al menos una fuente fiable. Si no se cumple, se rechaza y sigue siendo hipótesis.',
    input_schema: {
      type: 'object',
      properties: {
        hypothesis_id: str('ID de la hipótesis a promover.'),
        statement: str('El hecho, redactado de forma verificable.'),
      },
      required: ['hypothesis_id', 'statement'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_npc',
    description:
      'Crea un personaje no jugador nuevo. El motor le asigna el ID y lo registra como CANON DE CAMPAÑA: ' +
      'vincula a esta partida, nunca al canon global. Dale objetivos, miedos y límites propios.',
    input_schema: {
      type: 'object',
      properties: {
        name: str('Nombre del personaje.'),
        description: str('Aspecto y manera, en dos o tres frases.'),
        motivation: str('Qué quiere. No lo que el grupo necesita que quiera.'),
        knows: str('Qué sabe que sea relevante. Puede estar equivocado.'),
        fears: str('Qué teme o qué no va a hacer bajo ninguna circunstancia.'),
      },
      required: ['name', 'description', 'motivation', 'knows', 'fears'],
      additionalProperties: false,
    },
  },
  {
    name: 'change_npc_state',
    description: 'Cambia el estado de un NPC: si sigue presente, si vive, o cómo cambió su actitud hacia el investigador.',
    input_schema: {
      type: 'object',
      properties: {
        npc_id: str('ID del NPC.'),
        status: enumOf(['alive', 'dead', 'missing', 'unknown', 'unchanged'], 'Nuevo estado vital.'),
        present: enumOf(['true', 'false', 'unchanged'], '¿Sigue en la escena?'),
        attitude_delta: int('Cambio de actitud hacia el investigador activo (-50 a 50). 0 si no cambia.', -50, 50),
        patience_delta: int('Cambio de paciencia: negativo si la conversación lo cansó. 0 si no cambia.', -10, 10),
        dodged_topic: str('ID del tema que acaba de esquivar, si esquivó alguno. Vacío si no.'),
        cause: str('Qué lo provocó.'),
      },
      required: ['npc_id', 'status', 'present', 'attitude_delta', 'cause'],
      additionalProperties: false,
    },
  },
  {
    name: 'use_item',
    description:
      'Registra que el investigador USÓ un objeto para lo que sirve. Sube su contador de usos, que es lo que ' +
      'destraba las propiedades cuya condición de descubrimiento es haberlo usado varias veces.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: str('ID del objeto.'),
        times: int('Cuántos usos registrar de una vez (1-5).', 1, 5),
        cause: str('Para qué se usó.'),
      },
      required: ['item_id', 'times', 'cause'],
      additionalProperties: false,
    },
  },
  {
    name: 'reveal_document',
    description:
      'Entrega al investigador un documento del escenario que ya existe (diario, carta, recorte, fotografía). ' +
      'El texto completo se le muestra al jugador. Un documento puede ser auténtico y estar equivocado.',
    input_schema: {
      type: 'object',
      properties: {
        document_id: str('ID del documento del escenario.'),
        how: str('Cómo llegó a sus manos.'),
      },
      required: ['document_id', 'how'],
      additionalProperties: false,
    },
  },
  {
    name: 'transfer_item',
    description: 'Mueve un objeto: el investigador lo toma, lo suelta, lo entrega o lo pierde.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: str('ID del objeto.'),
        to: str('Destino: ID de investigador, de NPC, de localización, o "perdido".'),
        carried: enumOf(['true', 'false'], '¿Queda encima del investigador?'),
        cause: str('Qué lo movió.'),
      },
      required: ['item_id', 'to', 'carried', 'cause'],
      additionalProperties: false,
    },
  },
  {
    name: 'move_to_location',
    description: 'Mueve al investigador a otra localización conectada con la actual.',
    input_schema: {
      type: 'object',
      properties: {
        location_id: str('ID de la localización de destino.'),
        minutes: int('Minutos diegéticos que toma el traslado.', 0, 600),
      },
      required: ['location_id', 'minutes'],
      additionalProperties: false,
    },
  },
  {
    name: 'advance_time',
    description: 'Avanza el tiempo diegético. Sólo hacia adelante.',
    input_schema: {
      type: 'object',
      properties: {
        minutes: int('Minutos a avanzar.', 1, 1440),
        reason: str('Qué ocupó ese tiempo.'),
      },
      required: ['minutes', 'reason'],
      additionalProperties: false,
    },
  },
  {
    name: 'record_consequence',
    description:
      'Registra una consecuencia persistente: algo que el mundo va a recordar. Usala cuando la acción del jugador ' +
      'cambie el mundo de forma que deba notarse más adelante, incluso después de la muerte del investigador.',
    input_schema: {
      type: 'object',
      properties: {
        description: str('Qué cambió.'),
        scope: enumOf(['scene', 'location', 'campaign', 'world'], 'Alcance del cambio.'),
        permanent: enumOf(['true', 'false'], '¿Es irreversible?'),
        world_reminder: str('Recordatorio en segunda persona para vos mismo en turnos futuros: qué tenés que tener en cuenta a partir de ahora.'),
      },
      required: ['description', 'scope', 'permanent', 'world_reminder'],
      additionalProperties: false,
    },
  },
  {
    name: 'temporal_echo',
    description:
      'El investigador recibe un eco temporal: información que pertenece a otro momento. Aumenta la permeabilidad ' +
      'del mundo. Usalo con moderación: cada manifestación del Umbral debe tener un costo o una limitación.',
    input_schema: {
      type: 'object',
      properties: {
        description: str('Qué percibe, sin explicarlo.'),
        exposure: int('Exposición que produce (5-15).', 5, 15),
      },
      required: ['description', 'exposure'],
      additionalProperties: false,
    },
  },
  {
    name: 'reach_ending',
    description:
      'Cierra la aventura. Sólo cuando el investigador llegue a un desenlace real: resolución, huida, derrota, ' +
      'revelación o costo asumido. No lo uses para cortar una escena.',
    input_schema: {
      type: 'object',
      properties: {
        ending_id: str('ID del final del escenario, o "propio" si emergió del juego.'),
        title: str('Título del final.'),
        text: str('Cierre narrativo. Termina con una pregunta nueva, no con una explicación.'),
      },
      required: ['ending_id', 'title', 'text'],
      additionalProperties: false,
    },
  },
];

/** Las herramientas van SIEMPRE en el mismo orden: reordenarlas invalida el caché. */
export const KEEPER_TOOLS_SORTED = [...KEEPER_TOOLS].sort((a, b) => a.name.localeCompare(b.name));
