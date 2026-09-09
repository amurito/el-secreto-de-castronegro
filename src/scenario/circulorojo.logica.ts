/**
 * EL CÍRCULO ROJO — lógica de escenas.
 *
 * Ver `circulorojo.ts` para el marco entero. Tres reglas que esta aventura
 * no puede romper, citadas escena por escena donde importan:
 *
 *   · Quiénes construyeron el primer aro —y si existe un primero— está
 *     SELLADO (CANON.md). El inventario dice «recuperado», nunca «hecho»,
 *     y la cadena de copias no tiene principio anotado.
 *   · La piedra negra la levantó gente MUY anterior al grupo, para MARCAR
 *     UN LÍMITE — no para invocar a nadie (CANON.md §8). Los que la
 *     pusieron quedan sin nombre y sin fecha.
 *   · No existe una única tribu que haya custodiado esto durante milenios.
 *     Hay una piedra vieja debajo de otra piedra vieja, y nada más.
 *
 * Cada escena declara su `tiempo`. Reportado jugándola: sin eso el reloj no
 * se movía —la prosa decía «se te va la tarde» y marcaba las nueve y veinte—
 * y, peor, la espera entre lanzamientos de «Cerrarle el paso» (dos horas)
 * era inalcanzable: fallar el primer intento dejaba el hechizo muerto por el
 * resto de la aventura, porque no había con qué hacer pasar el tiempo.
 */

import type { LogicaDeEscenas } from './cargarAventura.ts';

export const EL_CIRCULO_ROJO_LOGICA: LogicaDeEscenas = [
  // ══ EL PUESTO: LOS PAPELES ════════════════════════════════════════════════

  {
    id: 'leer-instruccion',
    prueba: () => ({
      skill: 'biblioteca', difficulty: 'regular',
      reason: 'seguir una copia mal copiada, con las abreviaturas resueltas de dos maneras distintas',
      stakes_success: 'sacás las tres partes y la advertencia del pie',
      stakes_failure: 'sacás las tres partes y nada más',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Dos hojas cosidas con hilo de otro color que el papel. No es un original: el que copiaba dudaba en las abreviaturas y las resolvió distinto dos veces en la misma hoja.',
        'Tres partes. Del límite: no se pinta, se graba — la pintura se va con el agua y el asunto no se va con el agua. De lo que se recupera: se anota qué, dónde y cuándo, y nunca para quién. De lo que no se puede anotar: hay lo que se ve y no entra en el papel, y ésa es la parte que hay que poner igual. Debajo, ocho renglones que no son palabras. Son la manera.',
        tirada?.exito
          ? 'Y al pie, con la misma mano que copió todo lo demás, una línea que no es instrucción: «Yo copié esto de otro que lo había copiado. No sé de quién es. El que lo escribió primero no puso su nombre, y ahora me parece que no lo puso a propósito.»'
          : 'Hay una línea más al pie, en la misma mano, y no la podés desarmar: la tinta se corrió y las abreviaturas son las que este copista resolvía de dos maneras.',
      ],
      documento: { id: 'doc-instruccion-vieja', how: 'del arca del puesto' },
      tiempo: { minutes: 30, reason: 'seguir la copia renglón por renglón' },
      cordura: { amount: tirada?.exito ? 1 : 0, cause: 'leer una instrucción escrita para alguien que todavía no existe' },
      exposicion: { amount: 3, source: 'circulorojo:instruccion', cause: 'leer la manera de anotar lo que no se anota' },
      pistas: [{
        description: tirada?.exito
          ? 'La instrucción del Círculo es copia de otra copia, y el que la copió anotó que no sabe de quién es el original: quien lo escribió primero no dejó nombre, y él sospecha que no fue por descuido.'
          : 'La instrucción del Círculo —grabar el límite, anotar qué y dónde pero nunca para quién, y una manera para lo que no entra en el papel— es una copia de otra copia.',
        kind: 'documentary',
        source: 'el arca del puesto',
        reliability: 'reliable',
      }],
    }),
  },

  {
    id: 'leer-inventario',
    prueba: () => ({
      skill: 'buscar_libros', difficulty: 'regular',
      reason: 'leer tres años de renglones buscando lo que no está en ninguna columna',
      stakes_success: 'encontrás la media línea tachada',
      stakes_failure: 'leés los renglones, que ya es bastante',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Tres años de renglones en la letra apretada del fraile. Qué, dónde, cuándo. No hay columna para quién, y no es olvido: la instrucción dice que no la haya.',
        'La palabra que se repite en cada renglón es **recuperado**. Nunca «hecho», nunca «hallado por primera vez». Recuperado, como quien devuelve algo a un estante del que ya salió antes.',
        tirada?.exito
          ? 'Y después del último renglón, ya fuera de la columna, hay media línea escrita y tachada. Debajo de la tachadura, si insistís con la vela cerca: «no sé si es el primero».'
          : 'Después del último renglón hay algo tachado, media línea, y la tachadura está hecha con ganas: no se lee.',
      ],
      documento: { id: 'doc-inventario-abierto', how: 'del arca del puesto' },
      tiempo: { minutes: 45, reason: 'leer tres años de renglones' },
      exposicion: { amount: 2, source: 'circulorojo:inventario', cause: 'ver tres años de cosas recuperadas de ninguna parte' },
      pistas: [{
        description: tirada?.exito
          ? 'El inventario del Círculo dice siempre «recuperado», nunca «hecho». Y el fraile escribió y tachó, sobre el aro: «no sé si es el primero».'
          : 'El inventario del Círculo dice siempre «recuperado», nunca «hecho»: nadie del grupo sostiene haber fabricado nada.',
        kind: 'documentary',
        source: 'el inventario del Círculo',
        reliability: 'reliable',
      }],
    }),
  },

  {
    // SELLADO: acá es donde el jugador más va a querer que le contesten quién
    // hizo el aro, y acá es donde la aventura tiene que no contestarlo. La
    // tirada da MÁS información y MENOS certeza, que es la regla de oro
    // (CANON.md §15): sale que lo hizo una mano humana copiando algo, y con
    // eso la pregunta de qué copiaba queda peor que antes.
    id: 'mirar-aro',
    prueba: () => ({
      skill: 'ocultismo', difficulty: 'hard',
      reason: 'mirar la hechura de una cosa así sin ponerle encima lo que uno querría que fuera',
      stakes_success: 'sacás cómo está hecho',
      stakes_failure: 'sacás que pesa poco y está frío',
    }),
    resolver: ({ tirada }) => ({
      texto: [
        'Pesa menos de lo que debería pesar y está más frío que el aire del cuarto. La piedra roja no tiene talla: es como si la hubieran metido ahí caliente y se hubiera enfriado sola.',
        tirada?.exito
          ? 'Adentro del aro hay marcas de herramienta. Torpes, repetidas, encimadas: alguien estuvo copiando una forma que no terminaba de entender, y lo intentó más de una vez sobre la misma pieza.'
          : 'Le das vueltas media hora y lo único que sacás en limpio es lo que ya sabías al levantarlo: pesa poco, está frío, y no querés dejarlo sobre la mesa sin el paño debajo.',
        tirada?.exito
          ? 'Lo hizo una mano humana. Eso es lo único que se puede afirmar, y no alcanza para nada: no dice de cuándo, no dice de quién, y sobre todo no dice si es el primero que se hizo así o el número treinta de una fila de intentos que empezó en algún lado que nadie anotó.'
          : '',
      ].filter(Boolean),
      ...(tirada?.exito ? {
        descubre: {
          itemId: 'it-aro-recuperado', propertyId: 'p-aro-hechura',
          how: 'mirando la hechura de adentro del aro con la vela cerca',
        },
      } : {}),
      tiempo: { minutes: 30, reason: 'darle vueltas al aro con la vela cerca' },
      cordura: { amount: tirada?.exito ? 2 : 1, cause: 'tener en la mano algo hecho por alguien que no dejó ni nombre ni fecha' },
      exposicion: { amount: 5, source: 'circulorojo:aro', cause: 'mirar de cerca lo que salió del fondo' },
      ...(tirada?.exito ? {
        pistas: [{
          description: 'El aro lo trabajó una mano humana, copiando torpemente una forma que no entendía. No hay manera de saber de cuándo es, de quién, ni si es el primero o el número treinta de una fila de intentos.',
          kind: 'physical' as const,
          source: 'examinar el aro recuperado',
          reliability: 'reliable' as const,
        }],
      } : {}),
    }),
  },

  // ══ LA PIEDRA NEGRA ═══════════════════════════════════════════════════════

  {
    // EL EJE DE LA AVENTURA. Canon fijo (§8): los constructores NO invocaban
    // nada, marcaban el límite de una zona que ya se portaba mal. Doscientos
    // años después Bernardo va a leer esta misma piedra como una puerta, y
    // doscientos cincuenta después Villa Requena va a repintar un círculo sin
    // saber por qué. Acá se lo entiende bien, una sola vez, y ese
    // entendimiento es lo que no sobrevive.
    id: 'leer-la-piedra',
    // Mismo criterio que `aprender-cerrar`: es difícil y se puede insistir, así
    // que insistir tiene que servir. Sin el dado extra hacían falta siete u
    // ocho vueltas, y con lo que tarda cada una el reloj se iba a las dos de
    // la mañana en una aventura que dura un día.
    prueba: (s) => {
      const yaMiro = s.narrative.some((n) => n.text.includes('Se te va un buen rato y no'));
      return {
        skill: 'ocultismo', difficulty: 'hard',
        reason: 'leer para qué está puesta una piedra, en vez de para qué le gustaría a uno que estuviera',
        stakes_success: 'entendés qué es y qué no es',
        stakes_failure: 'entendés que es vieja',
        ...(yaMiro
          ? { bonus_dice: 1, modifier_reason: 'ya le diste una vuelta y sabés qué mirar' }
          : {}),
      };
    },
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'Tres metros de piedra negra, picada y no cortada, sin una marca de pintura en ningún lado. Vieja de una manera que no se puede medir mirándola.',
            'Lo que sacás es que es anterior a todo lo que hay alrededor, y que quien la puso se tomó un trabajo enorme para ponerla acá y no dos leguas más allá.',
            'Para qué, no. Se te va un buen rato y no.',
          ],
          tiempo: { minutes: 45, reason: 'darle una vuelta entera a la piedra sin sacar nada' },
          exposicion: { amount: 6, source: 'circulorojo:piedra', cause: 'estar parado adentro del anillo de pasto enfermo' },
          cordura: { amount: 1, cause: 'seis pasos donde no se oye un pájaro' },
          pistas: [{
            description: 'La piedra negra es muy anterior a todo lo que hay alrededor, y quien la puso eligió este punto exacto a costa de un trabajo enorme.',
            kind: 'physical',
            source: 'el claro de la piedra negra',
            reliability: 'reliable',
          }],
        };
      }
      return {
        texto: [
          'Te lleva la tarde entera y sale de tres cosas juntas, ninguna de las cuales alcanza sola.',
          'La primera: el anillo de pasto enfermo tiene el borde limpio. Un veneno correría con el agua y ensuciaría el borde. Éste no corre. El pasto no está enfermo POR la piedra: la piedra está adentro de algo que ya estaba enfermo, y el borde de la enfermedad es una línea que se puede seguir con el pie.',
          'La segunda: la piedra está asentada sobre otra piedra, más vieja, casi enterrada. Alguien reemplazó una marca anterior en el mismo lugar exacto. Dos veces, por lo menos, hubo gente que consideró que este punto había que dejarlo señalado.',
          'La tercera: no hay nada tallado. Ni una figura, ni un signo, ni un lugar donde apoyar nada. Ningún altar del mundo carece de un lugar donde apoyar algo.',
          'Y con las tres juntas queda lo único que se puede decir en voz alta sin inventar: **esto no es un altar. Es un cartel.** Alguien que no dejó nombre, ni fecha, ni la intención de dejarlos, se tomó un trabajo enorme para dejar dicho, a quien pasara, dónde termina una cosa. No para llamar a nada. Para avisar.',
          'Lo que no dice, y no va a decir nunca, es qué cosa.',
        ],
        tiempo: { minutes: 180, reason: 'entender la piedra, que lleva la tarde entera' },
        exposicion: { amount: 9, source: 'circulorojo:piedra', cause: 'entender para qué está puesta la piedra' },
        cordura: {
          amount: 3,
          cause: 'entender que alguien creyó necesario avisar de esto, y que el aviso lleva ahí más tiempo del que hay memoria',
          crisis: {
            nombre: 'La línea que se sigue con el pie',
            descripcion: 'Camina bordeando cosas. Umbrales, sombras, el borde de una alfombra: los rodea sin darse cuenta y se pone incómodo si alguien los pisa.',
            tipo: 'mania' as const,
            afecta: [{ skill: 'sigilo', dados: 1 }],
          },
        },
        pistas: [{
          description: 'La piedra negra no es un altar: es una marca de límite. No tiene nada tallado ni dónde apoyar nada, está sobre otra piedra más vieja en el mismo punto, y el anillo de pasto enfermo ya estaba ahí antes que ella. Quien la puso avisaba dónde termina algo, sin decir qué.',
          kind: 'experiential',
          source: 'el claro de la piedra negra',
          reliability: 'reliable',
        }],
        jugadorNota: {
          statement: 'Doscientos cinco años después de esta tarde, un español con plata y libros ajenos va a mirar esta misma piedra y va a leerla como una puerta. Doscientos cincuenta y cuatro años después, dos familias de un pueblo que todavía no existe van a repintarle un círculo cada San Juan sin que nadie sepa explicar para qué. Lo que el Círculo entiende hoy, bien, no lo va a heredar nadie.',
          source: 'el claro de la piedra negra',
          reliability: 'unknown',
        },
        consecuencia: {
          description: 'El Círculo Rojo entendió, en 1674, que la piedra negra no es un altar sino una marca de límite puesta por gente muy anterior, sin nombre y sin fecha.',
          scope: 'world',
          permanent: true,
          worldReminder: 'Alguien entendió bien la piedra, una vez, doscientos años antes de que la entendieran mal.',
        },
      };
    },
  },

  {
    id: 'sacar-lasca',
    prueba: () => ({
      skill: 'pelea', difficulty: 'regular',
      reason: 'sacarle un pedazo a una piedra que ya viene resistiéndose hace más años de los que hay cuenta',
      stakes_success: 'sale una lasca con filo',
      stakes_failure: 'sale una lasca',
    }),
    resolver: ({ estado, tirada }) => ({
      texto: [
        'Golpeás la base con otra piedra, del lado que ya está astillado. Suena mal: suena a metal frío, no a piedra.',
        tirada?.exito
          ? 'Salta una lasca larga, con un filo que no le corresponde a una piedra partida a golpes. Corta el cuero del guante sin que uno apriete.'
          : 'Salta una lasca corta y despareja. Sirve, si uno insiste, y hay que insistir.',
        'Queda una marca clara en la base, del tamaño de una mano. No se va a cerrar sola.',
      ],
      traslada: {
        itemId: 'it-lasca-tallada', a: estado.activeInvestigator, carried: true,
        cause: 'la desprende de la base de la piedra negra',
      },
      tiempo: { minutes: 25, reason: 'golpear la base hasta que salte algo que sirva' },
      exposicion: { amount: 4, source: 'circulorojo:lasca', cause: 'sacarle un pedazo a la marca' },
      cordura: { amount: 1, cause: 'romper, aunque sea un poco, lo que alguien puso para que durara' },
      jugadorNota: {
        statement: 'En 1928 va a haber, entre el pasto al pie de esta piedra, una lasca suelta del tamaño de una moneda grande que nadie va a poder explicar. Ésta es la tarde en que se desprendió la primera.',
        source: 'la base de la piedra negra',
        reliability: 'unknown',
      },
    }),
  },

  // ══ EL AGUA ═══════════════════════════════════════════════════════════════

  {
    id: 'tocar-agua',
    prueba: () => ({
      skill: 'COR', difficulty: 'regular',
      reason: 'meter la mano en el agua de la que salió el aro, sabiendo lo que le pasó al último que se metió entero',
      stakes_success: 'la sacás entera y sabiendo algo',
      stakes_failure: 'la sacás entera',
    }),
    resolver: ({ tirada }) => {
      const numero = tirada?.numero ?? 1;
      const perdidaSiFalla = tirada?.grado === 'fumble' ? 6 : 1 + (numero % 5);
      return {
        texto: [
          'Te agachás en la costra y metés la mano hasta la muñeca. Está fría, y es agua: pesa lo que pesa el agua y moja lo que moja el agua.',
          tirada?.exito
            ? 'Y las ondas salen mal. Salen del punto donde entró tu mano, se abren un palmo y vuelven — no se apagan, vuelven, como si a un palmo de tu mano hubiera un borde contra el cual rebotar, en todas las direcciones a la vez.'
            : 'Y tardás en sentir el frío. Un segundo largo con la mano adentro sin sentir nada, y después el frío entero de golpe, como si el agua hubiera tenido que enterarse primero de que había una mano.',
          'La sacás más rápido de lo que la metiste, y te la secás en la ropa dos veces más de las necesarias.',
        ],
        tiempo: { minutes: 15, reason: 'bajar hasta la costra y volver' },
        cordura: { amount: tirada?.exito ? 1 : perdidaSiFalla, cause: 'meter una parte del cuerpo en el agua que devolvió un hombre distinto' },
        exposicion: { amount: tirada?.exito ? 6 : 4, source: 'circulorojo:agua', cause: 'tocar la superficie que refleja' },
        estabilidad: { amount: -4, cause: 'comprobar con la mano que el agua no se comporta como agua' },
        ...(tirada?.exito ? {
          pistas: [{
            description: 'Las ondas que hace una mano en la laguna no se apagan: rebotan contra un borde que está a un palmo de la mano, en todas las direcciones a la vez. El agua tiene un límite que no coincide con su orilla.',
            kind: 'experiential' as const,
            source: 'la orilla de la laguna',
            reliability: 'reliable' as const,
          }],
        } : {}),
      };
    },
  },

  // ══ LO QUE EL GRUPO FABRICA ═══════════════════════════════════════════════

  {
    // El punzón. Existe ya, publicado, escondido en el sótano de la Casa de
    // Díaz en 1928 (`elvigesimo.contenido.json`, `it-punzon-circulo`) — ésta
    // es la tarde en que se lo hace, y la razón por la que sirve para lo que
    // sirve doscientos cincuenta años después: es la herramienta de marcar
    // límites, usada sobre alguien que se salió del suyo.
    id: 'hacer-punzon',
    resolver: ({ estado }) => ({
      texto: [
        'Hierro corto, mango de cuero mojado que va a apretar solo al secarse. No hace falta más: la instrucción no pide un instrumento consagrado, pide uno que grabe y no se gaste.',
        'Fray Mateo le marca un círculo chico en la base, del tamaño de una uña, sin decir para qué. Cuando le preguntan, contesta que para reconocerlo si aparece en manos de otro.',
        'Queda una herramienta fea y buena. Sirve para grabar piedra.',
      ],
      traslada: {
        itemId: 'it-punzon', a: estado.activeInvestigator, carried: true,
        cause: 'lo prepara en la mesa del puesto',
      },
      tiempo: { minutes: 60, reason: 'forjar el punzón y marcarle el círculo de la base' },
      jugadorNota: {
        statement: 'Doscientos cincuenta y cuatro años después, este punzón va a estar en un cajón con candado nuevo en el sótano de una casa que todavía no se construyó, y va a ser lo único con lo que se pueda parar al hombre que la construya. El círculo de la base es cómo se lo reconoce.',
        source: 'la mesa del puesto',
        reliability: 'unknown',
      },
    }),
  },

  {
    // «Contar lo que no se puede anotar» nace acá: son los ocho renglones que
    // la instrucción llama «la manera». El mismo hechizo que en 1928 se
    // aprende leyendo un libro heredado, dos veces copiado.
    id: 'aprender-anotar',
    // La habilidad sale de quién lo esté intentando: el fraile los lee como
    // texto, la comadre no —tiene Biblioteca 20— y para ella la única manera
    // de entrar es por el lado del que ya vio cosas así. Sin esto, la mitad
    // del elenco tenía el hechizo fuera de alcance.
    prueba: (s) => {
      const inv = s.investigators[s.activeInvestigator];
      const porLibro = (inv?.skills.biblioteca ?? 0) >= (inv?.skills.ocultismo ?? 0);
      const yaLoIntento = s.narrative.some((n) => n.text.includes('Volvés a empezar dos veces'));
      return {
        skill: porLibro ? 'biblioteca' : 'ocultismo', difficulty: 'hard',
        reason: 'seguir ocho renglones que no son palabras, escritos por alguien que ya no está para explicarlos',
        stakes_success: 'la manera funciona',
        stakes_failure: 'ocho renglones y una mano cansada',
        ...(yaLoIntento
          ? { bonus_dice: 1, modifier_reason: 'ya sabés en qué renglón se te va el hilo' }
          : {}),
      };
    },
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'Los seguís renglón por renglón, y a la mitad se te va el hilo de una manera que no es distracción: el hilo se va solo.',
            'Volvés a empezar dos veces y las dos veces se va en el mismo lugar. Hoy no.',
          ],
          tiempo: { minutes: 40, reason: 'volver a empezar los ocho renglones dos veces' },
          cordura: { amount: 1, cause: 'perder el hilo tres veces en el mismo renglón' },
        };
      }
      return {
        texto: [
          'Los ocho renglones no se leen: se hacen. Se hace lo que dicen mientras se mira lo que hay que anotar, y la mano va sola por donde no iría si uno la dejara elegir.',
          'Lo que sale del otro lado es una hoja con algo escrito que uno no recuerda haber decidido escribir, y que dice bien lo que había que decir.',
          'Queda hecho y no se deshace: la manera está aprendida.',
        ],
        aprenderHechizo: {
          id: 'contar-lo-que-no-se-anota',
          source: 'los ocho renglones de la instrucción copiada, en el puesto',
        },
        tiempo: { minutes: 90, reason: 'hacer los ocho renglones hasta el final' },
        cordura: { amount: 2, cause: 'escribir con la mano propia algo que no se decidió escribir' },
        exposicion: { amount: 4, source: 'circulorojo:manera', cause: 'usar la manera por primera vez' },
        pistas: [{
          description: 'Los ocho renglones de la instrucción son una manera de poner en el papel lo que no entra en el papel. Funciona, y quien la usa no recuerda haber decidido lo que escribió.',
          kind: 'experiential',
          source: 'la instrucción copiada',
          reliability: 'reliable',
        }],
      };
    },
  },

  {
    // El hechizo de daño, y el único del juego: sale de haber entendido la
    // piedra. Si el borde está marcado, el borde se puede cerrar.
    id: 'aprender-cerrar',
    // Reportado probándolo: fallar costaba 3 de Estabilidad por intento, y la
    // Estabilidad baja agrega dados de penalización a TODAS las tiradas
    // siguientes (`stabilityPenaltyDice`, engine.ts) — o sea que insistir te
    // hundía: veinticuatro intentos, Estabilidad de 100 a 22 y el hechizo sin
    // salir. Ahora fallar no cuesta Estabilidad y encima deja la próxima más
    // fácil: se entiende de a poco, no de golpe.
    prueba: (s) => {
      const yaLoPenso = s.narrative.some((n) => n.text.includes('La idea sigue entera y sigue sin dejarse agarrar'));
      return {
        skill: 'ocultismo', difficulty: 'hard',
        reason: 'sacar de una marca de límite una manera de usar el límite',
        stakes_success: 'se puede cerrar sobre algo',
        stakes_failure: 'queda en una idea que no se deja agarrar',
        ...(yaLoPenso
          ? { bonus_dice: 1, modifier_reason: 'ya le diste vueltas antes y algo quedó ordenado' }
          : {}),
      };
    },
    resolver: ({ tirada }) => {
      if (!tirada?.exito) {
        return {
          texto: [
            'La idea está entera y no se deja agarrar: si la piedra dice dónde termina una cosa, entonces esa cosa termina, y lo que termina se puede hacer terminar antes.',
            'Le das vueltas un rato largo. La idea sigue entera y sigue sin dejarse agarrar.',
          ],
          tiempo: { minutes: 45, reason: 'darle vueltas a una idea que no se deja agarrar' },
        };
      }
      return {
        texto: [
          'La instrucción no lo dice y no hacía falta que lo dijera: si alguien se tomó el trabajo de marcar dónde termina una cosa, es porque la cosa termina en algún lado. Y lo que termina en algún lado se puede hacer terminar acá.',
          'No hay fuego, no hay luz, no hay nada que se vea. Hay algo que estaba abierto y deja de estarlo, con lo que sea que haya quedado adentro.',
          'Sale a la tercera prueba, contra un cuero viejo colgado del palenque. El cuero queda con un corte limpio que no hizo nadie, y el aire alrededor huele a sal.',
          'Se puede cerrar sobre algo. Ojalá no hiciera falta.',
        ],
        aprenderHechizo: {
          id: 'cerrarle-el-paso',
          source: 'la piedra negra, entendida como lo que es',
        },
        tiempo: { minutes: 120, reason: 'probarlo tres veces contra un cuero del palenque' },
        cordura: { amount: 3, cause: 'sacar un arma de un aviso' },
        exposicion: { amount: 6, source: 'circulorojo:cerrar', cause: 'usar el límite en vez de sólo marcarlo' },
        estabilidad: { amount: -5, cause: 'haber convertido un cartel en una herramienta' },
        pistas: [{
          description: 'El límite que marca la piedra se puede cerrar sobre algo que lo cruzó. El Círculo sacó un arma de un aviso, y funciona.',
          kind: 'experiential',
          source: 'el trabajo de la piedra negra',
          reliability: 'reliable',
        }],
      };
    },
  },

  {
    // El primer círculo grabado de la piedra del alto. En 1679 van a ser
    // ocho, «el primero tembló, el octavo no» (hombreagua.logica.ts,
    // `mirar-circulos`). Éste es el que tiembla.
    id: 'grabar-primero',
    resolver: () => ({
      texto: [
        'La cara norte es la lisa y es la que mira a las dos cosas: el agua y la piedra negra. Si alguien va a dejar dicho dónde termina algo, se dice desde acá.',
        'Con el punzón lleva más de lo que parece. La piedra del alto es blanda comparada con la otra, y aun así hay que apoyarse con todo el cuerpo y volver sobre la misma línea cuatro veces para que quede honda de verdad.',
        'El primero tiembla. Se nota que tiembla, y va a seguir notándose dentro de mucho tiempo: la línea sale despareja en el tramo de abajo, donde la mano se cansó.',
        'No está pintado. Está grabado, hondo, hecho para que no se lo lleve nada.',
      ],
      tiempo: { minutes: 45, reason: 'volver cuatro veces sobre la misma línea' },
      exposicion: { amount: 3, source: 'circulorojo:grabar', cause: 'dejar una marca a propósito en un lugar así' },
      pistas: [{
        description: 'El primer círculo grabado en la piedra del alto quedó con el pulso temblando en el tramo de abajo. Está grabado y no pintado, a propósito: la pintura se va con el agua.',
        kind: 'physical',
        source: 'la piedra marcada del alto',
        reliability: 'reliable',
      }],
      consecuencia: {
        description: 'El Círculo Rojo grabó, en 1674, el primer círculo en la piedra del alto — hondo y no pintado, con el pulso temblando en el tramo de abajo.',
        scope: 'world',
        permanent: true,
        worldReminder: 'Hay un primer círculo grabado en la piedra del alto, y se le nota el pulso.',
      },
      jugadorNota: {
        statement: 'En 1679 esa piedra va a tener ocho círculos grabados uno encima del otro, con el pulso cada vez más firme. El primero tiembla. Éste es el primero.',
        source: 'la piedra marcada del alto',
        reliability: 'unknown',
      },
    }),
  },

  // ══ EL QUE VOLVIÓ MOJADO ══════════════════════════════════════════════════

  {
    id: 'enfrentar-al-que-volvio',
    resolver: () => ({
      texto: [
        'Se levanta cuando te ve venir, que es lo primero que hace en todo el día.',
        'De cerca es peor que de lejos, y no por nada que se pueda señalar: es un hombre parado, mojado, mirando el oeste. Lo que está mal es el ritmo. Respira cada tanto, no cada rato, y entre respiración y respiración no pasa nada — ni el pecho, ni los ojos, ni los dedos. Es un hombre en el que sólo pasa algo de a intervalos.',
        'Cuando le cerrás el paso hacia la laguna, no discute. Se te viene encima con la calma con que se corre una silla.',
      ],
      iniciaCombate: {
        npcIds: ['npc-el-que-volvio'],
        reason: 'Le cerraste el paso a la laguna y no discutió: se te vino encima.',
      },
      combate: { accion: 'atacar', npcId: 'npc-el-que-volvio', armaId: 'desarmado' },
      cordura: { amount: 2, cause: 'ver de cerca a alguien en quien sólo pasa algo de a intervalos' },
      exposicion: { amount: 7, source: 'circulorojo:mojado', cause: 'ponerse en el camino de lo que vuelve al agua' },
      consecuencia: {
        description: 'El Círculo le cerró el paso al peón que volvió mojado de la laguna, y hubo pelea de verdad.',
        scope: 'campaign',
        permanent: true,
        worldReminder: 'Alguien se puso en el medio entre el agua y lo que el agua quería de vuelta.',
      },
    }),
  },

  // ══ DESENLACES ════════════════════════════════════════════════════════════

  {
    id: 'fin-guardar',
    resolver: () => ({
      texto: [
        'Once brazas desde el junco grande. Melchor no entra: se queda en la costra, de espaldas, y no le pidas otra cosa.',
        'El aro entra sin ruido y sin ondas — o con las ondas que ya sabés que hace esta agua, que se abren un palmo y vuelven.',
      ],
      consecuencia: {
        description: 'En 1674, el Círculo Rojo devolvió el aro recuperado al fondo de la laguna, en el mismo punto del que había salido.',
        scope: 'world',
        permanent: true,
        worldReminder: 'El aro volvió al agua por decisión de alguien, no por accidente. Y sigue ahí.',
      },
      desenlace: {
        id: 'guardar',
        title: 'Lo que se devuelve',
        text: [
          'Don Gaspar no habla en tres días y después vuelve a hablar de otra cosa, que es su manera de aceptar una derrota.',
          'Lo que queda anotado en el inventario es una línea sola: «Devuelto al mismo punto, por acuerdo de los tres.» No dice por qué. La instrucción no pide por qué.',
          'Lo que ninguno de los tres puede saber es cuánto dura una decisión así. Un aro en el fondo de un agua baja, a once brazas de un junco, en un paraje sin pueblo, sin camino y sin nombre. Va a estar ahí mientras nadie lo busque.',
          'Y alguien lo va a buscar. No ustedes, y no pronto: dentro de cinco años, un español recién bajado del barco va a pararse en esta misma orilla a mirar el agua todos los días hasta que el agua le conteste algo. Va a entrar vestido. Va a salir con la mano cerrada.',
          'Ustedes lo devolvieron. Eso es lo que hicieron, y es todo lo que se puede hacer con una cosa así: devolverla, y no estar cuando la saquen de nuevo.',
        ],
      },
    }),
  },

  {
    id: 'fin-anotar',
    resolver: () => ({
      texto: [
        'Se hace en una noche, sobre la mesa del puesto, con la vela hasta el final.',
        'No es un juramento ni una fundación: es una lista de qué hay que hacer, quién lo hace, y cada cuánto. Grabar el límite —no pintarlo—. Anotar qué, dónde y cuándo. Nunca para quién.',
      ],
      consecuencia: {
        description: 'En 1674, el Círculo Rojo dejó la costumbre por escrito: grabar el límite, anotar lo que no se puede anotar, y pasarlo a quien viniera después.',
        scope: 'world',
        permanent: true,
        worldReminder: 'La costumbre quedó escrita para que la siguiera gente que no iba a entenderla.',
      },
      desenlace: {
        id: 'anotar',
        title: 'Lo que queda escrito',
        text: [
          'Fray Mateo lo copia dos veces, porque una copia sola es una cosa que se pierde.',
          'Y ahí está el problema entero de lo que acaban de hacer, y ninguno de los tres lo ve esa noche: **una instrucción sobrevive mejor que su motivo.** Lo que ustedes entendieron esta semana —que la piedra es un cartel, que el límite ya estaba, que anotar es lo único que se puede hacer sin romper nada— no entra en una lista de pasos. Lo que entra en la lista son los pasos.',
          'Dentro de doscientos cincuenta años va a haber dos familias en un pueblo de seiscientas personas repintando un círculo con tierra colorada en la semana de San Juan, sin que ninguna sepa decir para qué. Van a hacerlo bien. Van a hacerlo puntualmente. Y cuando alguien les pregunte por qué, se van a mirar entre ellas.',
          'Van a pintarlo, además, en vez de grabarlo. Eso también se va a perder.',
          'Lo hicieron bien. Fue lo mejor que se podía hacer y va a durar más que cualquier otra cosa de esta tarde. Nada de eso lo vuelve suficiente.',
        ],
      },
    }),
  },

  {
    id: 'fin-corregir',
    resolver: () => ({
      texto: [
        'Es media hoja, y la media hoja tarda más que las dos que copió Fray Mateo la semana pasada.',
        'Qué se vio, en qué familia, y qué se hizo. Lo que se hizo todavía no se hizo: se hace a los cuatro años, con una cuerda y una tabla, como se hizo siempre. Pero queda escrito antes, que es lo que lo vuelve obligación.',
      ],
      consecuencia: {
        description: 'En 1674, el Círculo Rojo dejó escrito el caso del recién nacido zurdo de los Quiroga y el procedimiento para corregirlo, convirtiendo una costumbre de familia en una obligación anotada.',
        scope: 'world',
        permanent: true,
        worldReminder: 'La corrección de los que nacen mirando para el otro lado quedó anotada, en una familia, para siempre.',
      },
      desenlace: {
        id: 'corregir',
        title: 'Lo que se corrige',
        text: [
          'Ana no llora ni discute. Pide leerlo, y no sabe leer, y lo mira igual un rato largo antes de devolverlo.',
          '—Ahora ya está —dice—. Ahora ya no es lo que hacemos nosotros. Ahora es lo que hay que hacer.',
          'Tiene razón, y ninguno de los tres puede contestarle nada, porque acaban de convertir una costumbre de una familia en una línea de un registro. Una costumbre se discute. Un registro se cumple.',
          'Doscientos veintiún años después, en un libro parroquial de un partido que todavía no tiene nombre, un cura va a escribir al margen de un bautismo que a un tal M. de F. se le corrigió la mano «según costumbre», y va a agregar, en una hoja suelta que no cose al resto del libro, que al Círculo Rojo le corresponde anotar lo que la parroquia no puede. Va a terminar la nota así: «No es la primera vez que se anota esto en esta familia. No va a ser la última.»',
          'La primera vez es hoy.',
        ],
      },
    }),
  },

  {
    id: 'fin-dispersar',
    resolver: () => ({
      texto: [
        'No hay pelea. Es más triste que eso: hay tres personas cansadas alrededor de una mesa a las que se les acabó la razón para seguir juntándose.',
        'Don Gaspar se lleva el arca, que es suya. Melchor se vuelve a su rancho. Fray Mateo se queda hasta el final apagando la vela.',
      ],
      consecuencia: {
        description: 'En 1674, el Círculo Rojo se disolvió sin dejar la costumbre escrita ni la piedra marcada: tres años de trabajo quedaron en un arca de un hombre solo.',
        scope: 'world',
        permanent: true,
        worldReminder: 'El Círculo se deshizo sin dejar instrucciones. Lo que sobrevivió, sobrevivió por accidente.',
      },
      desenlace: {
        id: 'dispersar',
        title: 'Lo que no queda',
        text: [
          'Los papeles no se pierden: los papeles casi nunca se pierden. Quedan en un arca, y el arca pasa a un heredero que no la abre, y después a otro que la vende con el mueble.',
          'Dentro de cinco años, un español que acaba de bajar del barco va a comprar en el pueblo grande, entre otras cosas, un arca vieja con papeles adentro que el vendedor no supo tasar. Los va a leer. Va a leerlos MUY bien, mejor de lo que ustedes hubieran querido, porque va a leerlos sin nadie al lado que le diga qué parte estaba en duda.',
          'De ustedes tres no va a saber nada. Ni los nombres, ni que eran tres, ni que discutieron esta noche hasta que se apagó la vela. Va a encontrar una instrucción sin firma y un inventario sin columna para quién, y va a suponer, razonablemente, que quien escribió eso sabía lo que hacía.',
          'Lo que no queda escrito no se pierde: se hereda mal. Es peor.',
        ],
      },
    }),
  },
];
