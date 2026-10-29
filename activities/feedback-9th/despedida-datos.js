/* Una sola carta general para el grupo de Noveno; el NIE solo personaliza el sobre
   y el nombre del comprobante. Los datos son públicos al alojarlos en GitHub Pages. */
(function (global) {
  'use strict';
  const cartaGeneral = Object.freeze({
    saludo: '¡Hola, noveno!',
    parrafos: Object.freeze([
      'Soy Rigo, su camaleón de confianza, escribiendo desde una oficina en Santo Domingo llena de recuerdos, lápices mordidos y una planta que insiste en que ella también hizo las tareas. Llegamos al cierre de este año escolar y quería dedicarles unas palabras a todas y todos, porque cada persona del grupo fue parte de esta historia.',
      'Este año hubo actividades que salieron a la primera, unas que se hicieron al azar, otras que nos hicieron pensar un poquito más y alguna que seguramente provocó el clásico: «¿Y esto cuándo había que entregarlo?». Pero aprender no es acertar siempre. También es volver a intentarlo, hacer preguntas, ayudar a un compañero y descubrir que hoy podemos hacer algo que ayer parecía difícil.',
      'Ojalá se lleven de noveno mucho más que una nota: la curiosidad para seguir aprendiendo, el valor de expresar sus ideas, el respeto por quienes piensan diferente y la confianza para enfrentar retos nuevos. En inglés, en cualquier materia y fuera del salón, cada pequeño esfuerzo cuenta. Y recuerden: nadie necesita ser perfecto para seguir creciendo.',
      'Gracias por las risas, por las ocurrencias, por las preguntas inesperadas y también por las sugerencias para mejorar nuestras actividades. Ahora les toca a ustedes: respondan la encuesta con sinceridad. Sus opiniones nos ayudarán a hacer que las próximas actividades sean más claras, interesantes y divertidas. Prometo escuchar sin poner cara de camaleón ofendido.',
      'Les deseo una nueva etapa llena de oportunidades, amistades bonitas y motivos para sentirse orgullosos de lo que construyen. Sigan avanzando a su propio ritmo, sin dejar de esforzarse. Y si algún día una tarea parece imposible, recuerden que hasta yo aprendí a usar una computadora teniendo patas de lagarto. ¡Un abrazo enorme para todo noveno!'
    ]),
    firma: 'Con mucho cariño, Rigo, su camaleón de confianza.'
  });

  // La información del alumno viene de students.js, no de 24 cartas copiadas.
  global.RIGO_DESPEDIDA_CARTAS = Object.freeze(Object.fromEntries(
    Object.entries(STUDENTS)
      .filter(([nie, alumno]) => alumno.grade === 'Noveno')
      .map(([nie, alumno]) => [nie, Object.freeze({nombre: alumno.name, ...cartaGeneral})])
  ));
})(window);
