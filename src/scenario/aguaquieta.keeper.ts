/**
 * ★★★ SPOILERS ★★★ — Instrucciones de dirección de "Agua Quieta".
 *
 * Este módulo lo importa ÚNICAMENTE el Keeper IA (`keeper/context.ts`).
 * En el build estático, donde narra el motor, nadie lo importa y el
 * empaquetador lo descarta entero: no llega al navegador.
 *
 * Si alguna vez algo del modo gratuito necesita leer de acá, pará y pensá:
 * probablemente signifique que estás por mandarle la solución de la aventura
 * al jugador.
 */

import type { KeeperBriefing } from './types.ts';

export const AGUA_QUIETA_KEEPER: KeeperBriefing = {
  deepTruth:
    'SECRETO DEL KEEPER. El aljibe y la laguna comparten una napa donde el agua permanece anormalmente ' +
    'quieta. En esas condiciones la superficie refleja con retardo, y a veces refleja momentos que no son ' +
    'este. Ignacio lo observó bien y lo interpretó mal: creyó que el agua "guarda" como una placa ' +
    'fotográfica, un fenómeno mineral. Lo que en realidad ocurrió es que miró lo suficiente como para ser ' +
    'mirado de vuelta, y la noche del 15 fue a comprobar si ya estaba del otro lado. ' +
    'Dónde está Ignacio AHORA no está determinado y esta aventura NO LO DETERMINA. ' +
    'Si puede volver, tampoco. El escenario termina con esa pregunta abierta, no con una respuesta.',

  sealedFromKeeper: [
    'La identidad del Primer Rostro.',
    'La naturaleza completa del Umbral y su relación exacta con Yog-Sothoth.',
    'La historia del anillo y sus creadores.',
    'Si Los Álamos es o no uno de los Siete Umbrales. NO lo es que se sepa, y no debe insinuarse que lo sea.',
    'Qué es exactamente lo que devuelve el agua.',
  ],

  guidance:
    'ESTRUCTURA (una hora aprox.):\n' +
    '  0-10  Llegada, Rosa, el patio. Sembrá la quietud del agua sin señalarla.\n' +
    ' 10-25  Investigación: la casa, el cuarto, el cuaderno. Primeras contradicciones.\n' +
    ' 25-40  La anomalía se vuelve innegable: la comparación de fotografías, o el reloj sobre el agua.\n' +
    ' 40-55  Decisión crítica: mirar, bajar, sellar, irse. Consecuencia.\n' +
    ' 55-60  Cierre parcial + una pregunta nueva.\n\n' +
    'TRES RUTAS a la revelación central (nunca dependas de una sola):\n' +
    '  · Física: el reloj sobre el agua del aljibe (it-reloj en patio).\n' +
    '  · Documental: el cuaderno de Ignacio + la carta de Rausch.\n' +
    '  · Testimonial: lo que Rosa vio y calla (actitud ≥ 40).\n' +
    'Y una cuarta, la más fuerte: comparar las dos fotografías.\n\n' +
    'FALSOS CAMINOS PLAUSIBLES (dejalos vivir, no los desmientas de entrada):\n' +
    '  · Ignacio debía plata y se fue. Rosa lo sostiene sinceramente.\n' +
    '  · La explicación mineral del propio Ignacio: el agua "guarda" como una placa. Es coherente y es falsa.\n' +
    '  · El hermano de Ignacio, del que Rosa no quiere hablar. Existe, no tiene nada que ver, y su silencio ' +
    'es familiar, no siniestro.\n\n' +
    'LO QUE NO PODÉS HACER:\n' +
    '  · Explicar qué es el reflejo. Nadie lo sabe. Vos tampoco.\n' +
    '  · Nombrar a Yog-Sothoth, el Umbral, Agua Blanca (el lugar), Castronegro, Bernardo o el anillo. ' +
    'La única aparición permitida del nombre es la del registro catastral en el cuaderno, y ahí significa otra cosa.\n' +
    '  · Resolver dónde está Ignacio.\n' +
    '  · Hacer que el fenómeno ataque. No es una criatura. No persigue. Sólo devuelve, y tarde.\n\n' +
    'CONSECUENCIA PERSISTENTE — registrala SIEMPRE, sea cual sea el final. El mundo tiene que recordar ' +
    'qué se hizo con el aljibe y qué se hizo con Rosa. Es el criterio de éxito del prototipo.',

  locationNotes: {
    patio:
      'El aljibe es el centro de gravedad de la aventura. El agua está a menos de dos metros y se ve el fondo. ' +
      'El reflejo funciona: tarda una fracción de segundo de más en imitar a quien se asoma. ' +
      'NO lo expliques. Que el jugador lo note o no lo note. ' +
      'Si el investigador se asoma sin tirar nada: exposición 2. Si mira sostenidamente: pedí POW o Descubrir ' +
      'y exposición 4-6.',
    casa:
      'Rosa está acá casi siempre. El sombrero es el detalle que abre conversación. ' +
      'La fotografía de 1897 está enmarcada sobre el aparador, a la vista: no hace falta tirada para verla, ' +
      'sólo para notar el rostro. Rosa NO va a ir al patio de noche bajo ninguna circunstancia.',
    cuarto:
      'El cuaderno (doc-cuaderno) está a la vista. La fotografía reciente está DADA VUELTA: alguien la puso así. ' +
      'Ignacio la puso así. Notar que está al revés no requiere tirada; entender por qué, sí. ' +
      'La carta del médico (doc-carta) está entre las páginas del cuaderno: requiere Descubrir o Investigar.',
    orilla:
      'La laguna y el aljibe comparten la napa. Eso es un HECHO del escenario que un investigador con ' +
      'Ciencias Naturales puede deducir; no lo regales. La laguna es la versión grande y débil del fenómeno: ' +
      'menos intensa que el aljibe porque el agua se mueve más, aunque se mueva poco. ' +
      'Exposición acá: la mitad que en el patio.',
  },
};
