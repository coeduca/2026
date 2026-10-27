/* Cuestionario S12 basado en la presentación S12 Diagramas de Flujo.pptx.
   Dos bancos equivalentes, A y B, elegidos por el motor COEDUCA. */
COEDUCA.init({
  "id": "s12-diagramas-de-flujo-bachillerato-2026",
  "container": "#app",
  "topic": "S12 · Diagramas de flujo",
  "level": "Bachillerato · Ciencias de la computación",
  "uiTheme": "PopArt",
  "pdfDesign": "PopArt",
  "colors": {
    "primary": "#ACF46A",
    "accent": "#4057D6",
    "bg": "#F4F7FB",
    "cardBg": "#FFFFFF",
    "itemBg": "#EDF3FD",
    "text": "#17263F"
  },
  "exercises": [
    {
      "type": "note",
      "title": "Tu misión",
      "html": "\n<div class=\"lesson-cover\">\n  <div class=\"lesson-intro-kicker\"><span class=\"live-dot\"></span> MISIÓN S12 · CIENCIAS DE LA COMPUTACIÓN</div>\n  <h2>Piensa como<br><em>programador.</em></h2>\n  <p>Para resolver este cuestionario, sigue rutas, evalúa decisiones y conecta acciones con sus consecuencias. ¡No necesitas escribir código!</p>\n  <div class=\"lesson-tags\"><span>◇ Lógica</span><span>→ Decisiones</span><span>🎮 Juegos</span></div>\n  <div class=\"four-pillars\">\n    <div class=\"pillar\"><b>01</b><span>Observo</span></div>\n    <div class=\"pillar\"><b>02</b><span>Decido</span></div>\n    <div class=\"pillar\"><b>03</b><span>Actúo</span></div>\n    <div class=\"pillar\"><b>04</b><span>Resultado</span></div>\n  </div>\n</div>\n<div class=\"symbols-wrap\">\n  <h3>Recordatorio rápido de símbolos</h3>\n  <p>Un <strong>algoritmo</strong> es una secuencia de pasos. El <strong>diagrama de flujo</strong> representa esos pasos con símbolos conectados por flechas.</p>\n  <div class=\"symbols-grid\">\n    <div class=\"symbol-box\"><div class=\"symbol-sample symbol-oval\">Inicio</div><strong>Óvalo</strong><small>Inicio o fin</small></div>\n    <div class=\"symbol-box\"><div class=\"symbol-sample symbol-rect\">Actúo</div><strong>Rectángulo</strong><small>Proceso o acción</small></div>\n    <div class=\"symbol-box\"><div class=\"symbol-sample symbol-diamond\"><span>¿Sí?</span></div><strong>Rombo</strong><small>Pregunta / decisión</small></div>\n    <div class=\"symbol-box\"><div class=\"symbol-sample symbol-arrow\">⟶</div><strong>Flecha</strong><small>Dirección del flujo</small></div>\n  </div>\n  <div class=\"mission-tip\">💡 <strong>Regla de oro:</strong> en las decisiones, cada salida se identifica con <strong>SÍ</strong> o <strong>NO</strong>.</div>\n</div>\n"
    },
    {
      "type": "multiplechoice",
      "title": "01 · Conceptos básicos",
      "instruction": "Reconoce algoritmos y diagramas de flujo: elige una respuesta por pregunta.",
      "dataA": [
        {
          "q": "¿Qué es un algoritmo?",
          "options": [
            "Una secuencia de pasos para resolver una tarea",
            "Un símbolo de inicio",
            "Una carta especial de UNO",
            "Una imagen sin instrucciones"
          ],
          "answer": 0
        },
        {
          "q": "¿Qué representa un diagrama de flujo?",
          "options": [
            "El puntaje de una partida",
            "Los pasos y decisiones mediante símbolos y flechas",
            "Solamente el final de un juego",
            "Un lenguaje de programación obligatorio"
          ],
          "answer": 1
        },
        {
          "q": "¿Cuál es la secuencia explicada en la presentación?",
          "options": [
            "Actúo → Resultado → Observo → Decido",
            "Decido → Observo → Resultado → Actúo",
            "Observo → Decido → Actúo → Resultado",
            "Resultado → Actúo → Decido → Observo"
          ],
          "answer": 2
        },
        {
          "q": "¿Qué idea resume la clase S12?",
          "options": [
            "Primero programar, luego pensar",
            "Los juegos no usan decisiones",
            "Todas las decisiones llevan al mismo resultado",
            "Pensar primero, programar después"
          ],
          "answer": 3
        }
      ],
      "dataB": [
        {
          "q": "Para describir cómo preparar una bebida paso a paso, ¿qué elaborarías primero?",
          "options": [
            "Un algoritmo",
            "Una contraseña",
            "Una puntuación",
            "Un archivo de sonido"
          ],
          "answer": 0
        },
        {
          "q": "¿Para qué sirven los símbolos y flechas en un diagrama de flujo?",
          "options": [
            "Para decorar las preguntas",
            "Para mostrar visualmente la secuencia y las rutas",
            "Para cambiar las reglas del juego",
            "Para escribir nombres de los jugadores"
          ],
          "answer": 1
        },
        {
          "q": "Después de «Decido», ¿qué etapa sigue en el ejemplo de la clase?",
          "options": [
            "Observo",
            "Resultado",
            "Actúo",
            "Inicio"
          ],
          "answer": 2
        },
        {
          "q": "¿Qué necesitas saber antes de leer diagramas de flujo sencillos?",
          "options": [
            "Dominar un lenguaje complicado",
            "Ser profesional de Free Fire",
            "Comprar programas especiales",
            "Comprender condiciones y acciones"
          ],
          "answer": 3
        }
      ]
    },
    {
      "type": "multiplechoice",
      "title": "02 · Los símbolos del flujo",
      "instruction": "Relaciona cada forma con su función dentro de un diagrama.",
      "dataA": [
        {
          "q": "¿Qué figura representa una pregunta o condición?",
          "options": [
            "Rectángulo",
            "Rombo",
            "Óvalo",
            "Flecha"
          ],
          "answer": 1
        },
        {
          "q": "¿Cuál es la figura que marca inicio o fin?",
          "options": [
            "Óvalo",
            "Rectángulo",
            "Rombo",
            "Triángulo"
          ],
          "answer": 0
        },
        {
          "q": "Si necesitas escribir «Recargo munición», ¿qué símbolo corresponde?",
          "options": [
            "Flecha",
            "Rombo",
            "Rectángulo",
            "Óvalo"
          ],
          "answer": 2
        },
        {
          "q": "¿Qué indica una flecha en un diagrama?",
          "options": [
            "El costo de la carta",
            "La dificultad del juego",
            "El número de preguntas",
            "La dirección que sigue el proceso"
          ],
          "answer": 3
        }
      ],
      "dataB": [
        {
          "q": "¿Dónde se coloca «¿Tengo suficientes vidas?»?",
          "options": [
            "En un rombo",
            "En un rectángulo",
            "En una flecha",
            "En un título"
          ],
          "answer": 0
        },
        {
          "q": "Para mostrar la acción «Juego una carta», usarías…",
          "options": [
            "Un óvalo",
            "Un rectángulo",
            "Un rombo",
            "Una flecha sin texto"
          ],
          "answer": 1
        },
        {
          "q": "¿Qué figura usarías para señalar «Partida terminada» como punto final?",
          "options": [
            "Rombo",
            "Flecha",
            "Óvalo",
            "Rectángulo"
          ],
          "answer": 2
        },
        {
          "q": "La conexión que permite seguir el recorrido entre figuras es…",
          "options": [
            "La portada",
            "Un color de la carta",
            "Un puntaje",
            "Una flecha"
          ],
          "answer": 3
        }
      ]
    },
    {
      "type": "note",
      "title": "Ejemplo de flujo",
      "html": "\n<div class=\"diagram-note\">\n  <div class=\"note-heading\"><span class=\"note-index\">RUTA 01</span><h3>¿Cómo se lee un diagrama?</h3><p>Ejemplo de la clase: Free Fire. Si tienes munición, evalúas disparar; si no, buscas cobertura y recargas.</p></div>\n  <svg class=\"flow-svg\" viewBox=\"0 0 720 324\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"Inicio: veo un rival. Decisión: ¿Tengo munición? Sí: evalúo disparar. No: me cubro y recargo.\">\n    <defs><marker id=\"flow-arrow\" markerWidth=\"9\" markerHeight=\"9\" refX=\"7\" refY=\"4.5\" orient=\"auto\"><path d=\"M1 1 L8 4.5 L1 8\" fill=\"none\" stroke=\"#303c55\" stroke-width=\"1.7\"/></marker></defs>\n    <rect x=\"262\" y=\"8\" width=\"196\" height=\"49\" rx=\"24.5\" fill=\"#def4e9\" stroke=\"#167c5c\" stroke-width=\"2.5\"/>\n    <text x=\"360\" y=\"38\" fill=\"#175942\" font-size=\"19\" font-weight=\"700\" text-anchor=\"middle\">Veo a un rival</text>\n    <path d=\"M360 57V100\" fill=\"none\" stroke=\"#303c55\" stroke-width=\"2.6\" marker-end=\"url(#flow-arrow)\"/>\n    <polygon points=\"360,103 485,172 360,241 235,172\" fill=\"#fff1d5\" stroke=\"#aa7017\" stroke-width=\"2.5\"/>\n    <text x=\"360\" y=\"168\" fill=\"#64400c\" text-anchor=\"middle\" font-size=\"18\" font-weight=\"750\">¿Tengo</text>\n    <text x=\"360\" y=\"191\" fill=\"#64400c\" text-anchor=\"middle\" font-size=\"18\" font-weight=\"750\">munición?</text>\n    <path d=\"M235 172H124V257\" fill=\"none\" stroke=\"#303c55\" stroke-width=\"2.6\" marker-end=\"url(#flow-arrow)\"/>\n    <text x=\"186\" y=\"157\" fill=\"#b45309\" font-weight=\"800\" font-size=\"16\" text-anchor=\"middle\">NO</text>\n    <path d=\"M485 172H596V257\" fill=\"none\" stroke=\"#303c55\" stroke-width=\"2.6\" marker-end=\"url(#flow-arrow)\"/>\n    <text x=\"536\" y=\"157\" fill=\"#15803d\" font-weight=\"800\" font-size=\"16\" text-anchor=\"middle\">SÍ</text>\n    <rect x=\"23\" y=\"261\" width=\"202\" height=\"52\" rx=\"12\" fill=\"#fce7e5\" stroke=\"#cb5349\" stroke-width=\"2.5\"/>\n    <text x=\"124\" y=\"283\" text-anchor=\"middle\" fill=\"#8a2e2b\" font-weight=\"750\" font-size=\"18\">Me cubro</text>\n    <text x=\"124\" y=\"302\" text-anchor=\"middle\" fill=\"#8a2e2b\" font-weight=\"750\" font-size=\"18\">y recargo</text>\n    <rect x=\"495\" y=\"261\" width=\"202\" height=\"52\" rx=\"12\" fill=\"#e1ebfe\" stroke=\"#446ebd\" stroke-width=\"2.5\"/>\n    <text x=\"596\" y=\"283\" text-anchor=\"middle\" fill=\"#274b90\" font-weight=\"750\" font-size=\"18\">Evalúo</text>\n    <text x=\"596\" y=\"302\" text-anchor=\"middle\" fill=\"#274b90\" font-weight=\"750\" font-size=\"18\">disparar</text>\n  </svg>\n  <div class=\"mini-scenes\"><div><b>🎯 FREE FIRE</b><span>¿Tengo munición?</span></div><div><b>⚔️ CLASH ROYALE</b><span>¿Tengo al menos 4 de elixir?</span></div><div><b>🃏 UNO</b><span>¿Coincide color o número?</span></div></div>\n</div>\n"
    },
    {
      "type": "multiplechoice",
      "title": "03 · Sigue la flecha correcta",
      "instruction": "Lee la condición completa antes de decidir por dónde continúa el algoritmo.",
      "dataA": [
        {
          "q": "En «¿Tengo vidas?», tu respuesta es NO. ¿Qué pasa según la presentación?",
          "options": [
            "Continúo jugando",
            "Obtengo elixir",
            "Partida terminada",
            "Reinicio la pregunta"
          ],
          "answer": 2
        },
        {
          "q": "En «¿Tengo munición?» del ejemplo Free Fire, la respuesta es NO. ¿Qué acción sigue?",
          "options": [
            "Me cubro y recargo",
            "Disparo inmediatamente",
            "Gano la partida",
            "Juego una carta"
          ],
          "answer": 0
        },
        {
          "q": "Si una flecha dice «SÍ», significa que…",
          "options": [
            "Se ignora la pregunta",
            "La condición evaluada se cumple",
            "El proceso siempre termina",
            "Se debe elegir al azar"
          ],
          "answer": 1
        },
        {
          "q": "¿Qué representa el rombo «¿Tengo munición?»?",
          "options": [
            "La acción de recargar",
            "El resultado final",
            "La entrada del jugador",
            "La condición que determina la ruta"
          ],
          "answer": 3
        }
      ],
      "dataB": [
        {
          "q": "En el ejemplo de las vidas, ¿qué sucede cuando la respuesta a «¿Tengo vidas?» es SÍ?",
          "options": [
            "Continúo jugando",
            "Termina la partida",
            "Robo carta de UNO",
            "Espero elixir"
          ],
          "answer": 0
        },
        {
          "q": "En el diagrama de Free Fire, si SÍ tienes munición, ¿qué haces primero?",
          "options": [
            "Me cubro y recargo sin comprobar",
            "Termino la partida",
            "Evalúo si conviene disparar",
            "Dejo de jugar automáticamente"
          ],
          "answer": 2
        },
        {
          "q": "Una salida del rombo marcada «NO» corresponde a…",
          "options": [
            "Una acción opcional sin relación",
            "Una condición que no se cumple",
            "Un resultado con recompensa",
            "Una flecha de inicio"
          ],
          "answer": 1
        },
        {
          "q": "¿Por qué conviene leer las flechas antes de elegir un resultado?",
          "options": [
            "Porque todas terminan igual",
            "Porque el rectángulo tiene dos preguntas",
            "Porque el color lo decide todo",
            "Porque cada respuesta puede abrir una ruta distinta"
          ],
          "answer": 3
        }
      ]
    },
    {
      "type": "multiplechoice",
      "title": "04 · Free Fire y Clash Royale",
      "instruction": "Aplica condiciones de munición y elixir en situaciones de la clase.",
      "dataA": [
        {
          "q": "Free Fire: aparece un rival y tienes solo 2 balas. ¿Qué propone verificar primero la clase?",
          "options": [
            "Munición, distancia y cobertura",
            "El color del arma",
            "Quién ganará sin observar",
            "Cuánto elixir tienes"
          ],
          "answer": 0
        },
        {
          "q": "Clash Royale: tu carta defensiva cuesta 4 de elixir y tienes 3. ¿La puedes jugar ahora?",
          "options": [
            "Sí, porque 3 es mayor que 4",
            "Sí, pero pierdes la torre",
            "No, debes esperar o elegir otra carta",
            "Sí, porque es defensiva"
          ],
          "answer": 2
        },
        {
          "q": "En Clash Royale, si tienes 5 de elixir y la carta cuesta 4, ¿qué ruta sigues?",
          "options": [
            "NO, no tengo suficiente",
            "SÍ, puedo jugar la carta defensiva",
            "Se ignora la condición",
            "Termina automáticamente el juego"
          ],
          "answer": 1
        },
        {
          "q": "¿Cuál es la condición correcta para jugar una carta de costo 4?",
          "options": [
            "Tener exactamente 3 de elixir",
            "Tener menos de 4",
            "Que el rival no ataque",
            "Tener al menos 4 de elixir"
          ],
          "answer": 3
        }
      ],
      "dataB": [
        {
          "q": "¿Qué busca evitar la verificación previa en el ejemplo de Free Fire?",
          "options": [
            "Actuar sin revisar los recursos",
            "Usar las flechas de flujo",
            "Comparar distintas opciones",
            "Tomar decisiones tácticas"
          ],
          "answer": 0
        },
        {
          "q": "Clash Royale: tienes 2 de elixir y necesitas 4 para la carta. ¿Qué corresponde?",
          "options": [
            "Jugar la carta inmediatamente",
            "Seguir la ruta SÍ",
            "Esperar o utilizar otra carta",
            "Cambiar el significado de SÍ"
          ],
          "answer": 2
        },
        {
          "q": "Clash Royale: tienes exactamente 4 de elixir para una carta de costo 4. ¿Qué ocurre?",
          "options": [
            "No alcanza",
            "Sí, puedes jugarla",
            "Siempre pierdes",
            "Tienes que robar una carta de UNO"
          ],
          "answer": 1
        },
        {
          "q": "En el ejemplo de Clash Royale, ¿qué dato debes comparar?",
          "options": [
            "El número de vidas",
            "El tamaño de la torre",
            "El color de las cartas",
            "Elixir disponible y costo de la carta"
          ],
          "answer": 3
        }
      ]
    },
    {
      "type": "multiplechoice",
      "title": "05 · UNO también usa algoritmos",
      "instruction": "Considera únicamente las cartas numéricas del ejemplo, sin comodines ni cartas especiales.",
      "dataA": [
        {
          "q": "En UNO, ¿qué debe coincidir para jugar una carta numérica sobre otra?",
          "options": [
            "Color O número",
            "Color Y número obligatoriamente",
            "Solo el tamaño",
            "Siempre la misma ilustración"
          ],
          "answer": 0
        },
        {
          "q": "Hay un 7 rojo en la mesa. ¿Cuál de estas cartas numéricas puedes jugar?",
          "options": [
            "Un 2 azul",
            "Un 5 verde",
            "Un 7 verde",
            "Un 3 amarillo"
          ],
          "answer": 2
        },
        {
          "q": "Con un 7 rojo en la mesa, ¿qué otra carta numérica es válida por color?",
          "options": [
            "Un 3 azul",
            "Un 2 rojo",
            "Un 5 verde",
            "Un 8 amarillo"
          ],
          "answer": 1
        },
        {
          "q": "Si no tienes una carta numérica del mismo color ni número, ¿qué acción indica el modelo básico?",
          "options": [
            "Jugar cualquier carta",
            "Terminar la partida",
            "Sumar elixir",
            "Robar una carta"
          ],
          "answer": 3
        }
      ],
      "dataB": [
        {
          "q": "En el modelo simplificado de UNO, basta con que una carta numérica tenga…",
          "options": [
            "El mismo número o el mismo color",
            "El mismo número y color al mismo tiempo",
            "Mayor valor que la carta en la mesa",
            "Un dibujo diferente"
          ],
          "answer": 0
        },
        {
          "q": "La carta en la mesa es un 5 azul. ¿Qué opción es válida por número?",
          "options": [
            "Un 2 verde",
            "Un 8 rojo",
            "Un 5 rojo",
            "Un 3 amarillo"
          ],
          "answer": 2
        },
        {
          "q": "Sobre un 5 azul, ¿qué opción es válida por color?",
          "options": [
            "Un 7 rojo",
            "Un 2 azul",
            "Un 1 verde",
            "Un 9 amarillo"
          ],
          "answer": 1
        },
        {
          "q": "Según el modelo básico de la clase, si no tienes carta válida, primero…",
          "options": [
            "Pasas a Clash Royale",
            "Disparas al rival",
            "Terminas el juego",
            "Robas una carta"
          ],
          "answer": 3
        }
      ]
    },
    {
      "type": "note",
      "title": "La lógica en los juegos",
      "html": "\n<div class=\"recap-note\">\n  <div><span class=\"note-index\">ANTES DEL ÚLTIMO RETO</span><h3>Tres juegos. Una misma lógica.</h3></div>\n  <div class=\"recap-list\"><span>CONDICIÓN</span><b>→</b><span>ACCIÓN</span><b>→</b><span>CONSECUENCIA</span></div>\n  <p>En <strong>Clash Royale</strong>, 3 de elixir no alcanzan para una carta que cuesta 4. En <strong>UNO</strong>, para cartas numéricas basta con coincidir en el <strong>color o el número</strong>. Si robas una carta que puede jugarse, puedes decidir jugarla ese turno, según las reglas habituales.</p>\n</div>\n"
    },
    {
      "type": "multiplechoice",
      "title": "06 · Diseña tu propio diagrama",
      "instruction": "Piensa como diseñador de algoritmos: interpreta condiciones, rutas y requisitos.",
      "dataA": [
        {
          "q": "¿Qué requisitos tenía la misión de diseñar un diagrama en parejas?",
          "options": [
            "Solo una imagen sin conexiones",
            "Un inicio, dos decisiones, tres acciones y flechas Sí/No",
            "Cinco óvalos sin acciones",
            "Un programa ya codificado"
          ],
          "answer": 1
        },
        {
          "q": "Situación: «La zona se cierra. ¿Tienes vehículo?». ¿Qué símbolo lleva esa pregunta?",
          "options": [
            "Flecha",
            "Rectángulo",
            "Rombo",
            "Óvalo de fin"
          ],
          "answer": 2
        },
        {
          "q": "Si quieres representar «Busco un vehículo», ¿qué símbolo usarías?",
          "options": [
            "Rectángulo",
            "Rombo",
            "Flecha de condición",
            "Óvalo de inicio"
          ],
          "answer": 0
        },
        {
          "q": "¿Qué elemento faltaría si dibujas acciones aisladas sin un camino que las conecte?",
          "options": [
            "La portada del juego",
            "Más preguntas de teoría",
            "Un cronómetro",
            "Flechas que indiquen el orden"
          ],
          "answer": 3
        }
      ],
      "dataB": [
        {
          "q": "Para completar el reto de diseño, ¿cuántas decisiones se pedían como mínimo?",
          "options": [
            "Una",
            "Dos",
            "Cuatro",
            "Ninguna"
          ],
          "answer": 1
        },
        {
          "q": "«¿Tengo suficiente elixir?» pertenece a un símbolo de…",
          "options": [
            "Fin",
            "Acción",
            "Decisión",
            "Movimiento de carta"
          ],
          "answer": 2
        },
        {
          "q": "¿Cuál de las siguientes frases es una acción, no una pregunta?",
          "options": [
            "Espero a reunir elixir",
            "¿Tengo vidas?",
            "¿Coincide color o número?",
            "¿Hay un vehículo?"
          ],
          "answer": 0
        },
        {
          "q": "¿Por qué debes rotular SÍ y NO en las salidas de una decisión?",
          "options": [
            "Para decorar la hoja",
            "Para sumar más puntos",
            "Para reemplazar los símbolos",
            "Para distinguir las rutas de cada respuesta"
          ],
          "answer": 3
        }
      ]
    },
    {
      "type": "truefalse",
      "title": "07 · Verdad o mito — Reto final",
      "instruction": "Marca verdadero o falso. Son seis afirmaciones basadas en la presentación.",
      "dataA": [
        {
          "statement": "Un algoritmo puede describir los pasos de una estrategia de juego.",
          "answer": true
        },
        {
          "statement": "El rombo representa una acción, nunca una pregunta.",
          "answer": false
        },
        {
          "statement": "En Clash Royale, 3 de elixir alcanzan para una carta que cuesta 4.",
          "answer": false
        },
        {
          "statement": "En UNO con cartas numéricas, puede bastar con coincidir en color.",
          "answer": true
        },
        {
          "statement": "Las flechas SÍ y NO representan diferentes rutas de una decisión.",
          "answer": true
        },
        {
          "statement": "Para crear diagramas de flujo sencillos es obligatorio saber programar.",
          "answer": false
        }
      ],
      "dataB": [
        {
          "statement": "Un diagrama de flujo usa símbolos y flechas para representar pasos.",
          "answer": true
        },
        {
          "statement": "El óvalo se usa para escribir cualquier pregunta.",
          "answer": false
        },
        {
          "statement": "Si una carta cuesta 4 de elixir y tengo 5, la puedo jugar en el ejemplo.",
          "answer": true
        },
        {
          "statement": "En el modelo de UNO, un 7 verde no coincide con un 7 rojo en número.",
          "answer": false
        },
        {
          "statement": "El rectángulo representa una acción o proceso.",
          "answer": true
        },
        {
          "statement": "Si la respuesta a una condición es NO, debo seguir la flecha SÍ.",
          "answer": false
        }
      ]
    }
  ]
});
