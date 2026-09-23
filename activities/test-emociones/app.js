(() => {
  'use strict';

  const AREAS = [
    { id: 'recognize', name: 'Reconozco mis emociones', short: 'Reconocer', icon: '🧠' },
    { id: 'regulate', name: 'Manejo lo que siento', short: 'Regular', icon: '🧘' },
    { id: 'cope', name: 'Afronto dificultades', short: 'Afrontar', icon: '💪' },
    { id: 'empathy', name: 'Comprendo a los demás', short: 'Empatía', icon: '❤️' },
    { id: 'communicate', name: 'Me comunico y resuelvo conflictos', short: 'Comunicar', icon: '🤝' }
  ];

  const QUESTIONS = [
    ['recognize', 'Puedo reconocer si estoy alegre, triste, enojado/a, nervioso/a o preocupado/a.'],
    ['recognize', 'Puedo explicar qué situación provocó una emoción en mí.'],
    ['recognize', 'Me doy cuenta cuando una emoción está empezando a afectar mi comportamiento.'],
    ['recognize', 'Reconozco qué cosas suelen hacerme sentir bien y cuáles me hacen sentir mal.'],
    ['recognize', 'Puedo diferenciar entre lo que pienso y lo que siento.'],

    ['regulate', 'Cuando estoy muy enojado/a, puedo detenerme antes de reaccionar.'],
    ['regulate', 'Cuando estoy nervioso/a o preocupado/a, conozco alguna forma de tranquilizarme.'],
    ['regulate', 'Puedo expresar que algo me molesta sin insultar ni lastimar a otras personas.'],
    ['regulate', 'Aunque esté de mal humor, intento no descargar mi enojo con otras personas.'],
    ['regulate', 'Después de una emoción fuerte, puedo recuperar poco a poco la calma.'],

    ['cope', 'Cuando algo no me sale bien, intento nuevamente o busco otra solución.'],
    ['cope', 'Puedo aceptar que equivocarme forma parte de aprender.'],
    ['cope', 'Cuando recibo una crítica respetuosa, intento escuchar antes de responder.'],
    ['cope', 'Aunque una actividad sea difícil, puedo seguir esforzándome.'],
    ['cope', 'Cuando tengo un problema que me supera, puedo pedir ayuda a alguien de confianza.'],

    ['empathy', 'Puedo darme cuenta cuando otra persona está triste, preocupada o molesta.'],
    ['empathy', 'Intento comprender cómo se siente otra persona antes de juzgarla.'],
    ['empathy', 'Escucho cuando alguien me cuenta algo importante para él o ella.'],
    ['empathy', 'Respeto que otras personas puedan sentir o pensar diferente a mí.'],
    ['empathy', 'Si noto que alguien lo está pasando mal, intento tratarlo con consideración.'],

    ['communicate', 'Cuando tengo un problema con alguien, intento hablarlo en lugar de empeorarlo.'],
    ['communicate', 'Puedo decir “no” de manera respetuosa cuando algo me incomoda o considero que está mal.'],
    ['communicate', 'Si lastimo a alguien con mis palabras o acciones, puedo reconocerlo y disculparme.'],
    ['communicate', 'Durante una discusión, puedo escuchar el punto de vista de la otra persona.'],
    ['communicate', 'Intento buscar soluciones donde ambas partes puedan llegar a un acuerdo.']
  ].map(([area, text], index) => ({ id: index + 1, area, text }));

  const OPTIONS = [
    { value: 1, label: 'Nunca' },
    { value: 2, label: 'A veces' },
    { value: 3, label: 'Casi siempre' },
    { value: 4, label: 'Siempre' }
  ];

  const $ = (id) => document.getElementById(id);
  const views = ['loginView', 'introView', 'testView', 'resultView'];
  const defaultTitle = 'Mi Termómetro Emocional · Octavo';

  let currentStudent = null;
  let currentNIE = null;
  let currentIndex = 0;
  let answers = Array(QUESTIONS.length).fill(null);

  function rigoSay(text, emotion = 'thinking', duration = 4300) {
    const mascot = window.rigo || document.querySelector('rigo-mascot');
    if (!mascot) return;
    mascot.setEmotion?.(emotion);
    mascot.say?.(text, duration);
    window.setTimeout(() => mascot.setEmotion?.('neutral'), duration);
  }

  function showView(id) {
    views.forEach(v => $(v).classList.toggle('active', v === id));
    document.body.dataset.view = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function firstName(fullName) {
    return (fullName || '').trim().split(/\s+/)[0] || 'estudiante';
  }

  function formatDate(dateLike) {
    const date = dateLike ? new Date(dateLike) : new Date();
    return new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }

  function storageKey(suffix) {
    return `emotionTest:${currentNIE}:${suffix}`;
  }

  function saveProgress() {
    if (!currentNIE) return;
    localStorage.setItem(storageKey('progress'), JSON.stringify({ answers, currentIndex }));
  }

  function loadProgress() {
    if (!currentNIE) return null;
    try {
      const data = JSON.parse(localStorage.getItem(storageKey('progress')) || 'null');
      if (!data || !Array.isArray(data.answers) || data.answers.length !== QUESTIONS.length) return null;
      return data;
    } catch {
      return null;
    }
  }

  function clearProgress() {
    if (!currentNIE) return;
    localStorage.removeItem(storageKey('progress'));
  }

  function updateStudentLabels(student) {
    $('studentChip').textContent = `${student.name} · ${student.grade}`;
    $('resultStudentChip').textContent = `${student.name} · ${student.grade}`;
    $('resultStudentName').textContent = student.name;
    $('resultStudentGrade').textContent = student.grade;
  }

  function login(nie) {
    const student = STUDENTS[nie];
    $('loginError').textContent = '';

    if (!student) {
      $('loginError').textContent = 'No encontré ese NIE. Revisa los números e intenta de nuevo.';
      rigoSay('Ese NIE se me escondió 👀. Revísalo con calma.', 'confused');
      return;
    }

    const allowed = student.grade === 'Octavo' || student.grade === 'Maestro';
    if (!allowed) {
      $('loginError').textContent = 'Esta actividad está habilitada únicamente para Octavo grado.';
      rigoSay('Este termómetro está preparado para Octavo grado.', 'neutral');
      return;
    }

    currentStudent = student;
    currentNIE = nie;
    const mascot = window.rigo || document.querySelector('rigo-mascot');
    mascot?.setGrade?.(student.grade === 'Maestro' ? 'Octavo' : student.grade);
    mascot?.loginSuccess?.(firstName(student.name));

    updateStudentLabels(student);

    const saved = loadProgress();
    $('resumeBtn').hidden = !(saved && saved.answers.some(v => v !== null));
    showView('introView');
  }

  function logout() {
    currentStudent = null;
    currentNIE = null;
    currentIndex = 0;
    answers = Array(QUESTIONS.length).fill(null);
    document.title = defaultTitle;
    $('nieInput').value = '';
    showView('loginView');
    window.setTimeout(() => (window.rigo || document.querySelector('rigo-mascot'))?.welcome?.(), 250);
  }

  function startFresh() {
    answers = Array(QUESTIONS.length).fill(null);
    currentIndex = 0;
    clearProgress();
    renderQuestion();
    showView('testView');
    rigoSay('No busques la respuesta “correcta”. Busca la más sincera.', 'love', 5200);
  }

  function resume() {
    const saved = loadProgress();
    if (!saved) return startFresh();
    answers = saved.answers;
    currentIndex = Math.min(Math.max(Number(saved.currentIndex) || 0, 0), QUESTIONS.length - 1);
    renderQuestion();
    showView('testView');
    rigoSay('Seguimos desde donde quedaste. Sin prisa.', 'happy');
  }

  function getArea(areaId) {
    return AREAS.find(a => a.id === areaId);
  }

  function renderQuestion() {
    const q = QUESTIONS[currentIndex];
    const area = getArea(q.area);
    $('areaLabel').textContent = `${area.icon} ${area.short}`;
    $('progressLabel').textContent = `${currentIndex + 1} de ${QUESTIONS.length}`;
    $('progressBar').style.width = `${((currentIndex + 1) / QUESTIONS.length) * 100}%`;
    $('areaIcon').textContent = area.icon;
    $('questionNumber').textContent = `Pregunta ${currentIndex + 1}`;
    $('questionText').textContent = q.text;
    $('answerHint').textContent = '';
    $('prevBtn').disabled = currentIndex === 0;
    $('nextBtn').textContent = currentIndex === QUESTIONS.length - 1 ? 'Ver mi resultado' : 'Siguiente';

    const wrap = $('answerOptions');
    wrap.innerHTML = '';
    OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer-btn' + (answers[currentIndex] === opt.value ? ' selected' : '');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', answers[currentIndex] === opt.value ? 'true' : 'false');
      btn.innerHTML = `<span class="answer-num">${opt.value}</span><span>${opt.label}</span>`;
      btn.addEventListener('click', () => chooseAnswer(opt.value));
      wrap.appendChild(btn);
    });
  }

  function chooseAnswer(value) {
    answers[currentIndex] = value;
    saveProgress();
    renderQuestion();
  }

  function goNext() {
    if (answers[currentIndex] == null) {
      $('answerHint').textContent = 'Selecciona una opción antes de continuar.';
      rigoSay('Una respuesta por aquí y seguimos 🌱', 'confused', 2800);
      return;
    }

    if (currentIndex === QUESTIONS.length - 1) {
      finishTest();
      return;
    }

    currentIndex += 1;
    saveProgress();
    renderQuestion();

    if ([5, 10, 15, 20].includes(currentIndex)) {
      const area = getArea(QUESTIONS[currentIndex].area);
      const messages = {
        regulate: 'Nueva zona: manejar lo que sentimos. Respirar también cuenta como estrategia.',
        cope: 'Ahora veremos cómo afrontas dificultades. Equivocarse no invalida tu esfuerzo.',
        empathy: 'Turno de la empatía: entender a alguien no significa pensar igual que esa persona.',
        communicate: 'Última zona: comunicación y conflictos. Ya casi llegamos.'
      };
      rigoSay(messages[area.id], 'thinking', 4800);
    }
  }

  function goPrev() {
    if (currentIndex === 0) return;
    currentIndex -= 1;
    saveProgress();
    renderQuestion();
  }

  function normalizeScore(raw) {
    return Math.round(100 + ((raw - 25) / 75) * 200);
  }

  function overallStatus(score) {
    if (score <= 166) return {
      key: 'red', emoji: '🔴', label: 'Necesito fortalecer algunas habilidades', color: '#ca5757', bg: '#ffeaea',
      message: 'Tus respuestas muestran que varias situaciones emocionales pueden costarte en este momento. El objetivo no es juzgarte: es identificar qué puedes practicar y a quién puedes pedir apoyo cuando lo necesites.'
    };
    if (score <= 233) return {
      key: 'yellow', emoji: '🟡', label: 'Estoy desarrollando mis habilidades', color: '#d09d13', bg: '#fff6d7',
      message: 'Ya utilizas algunas estrategias para comprender y manejar lo que sientes, aunque ciertas situaciones todavía pueden ser difíciles. Fíjate en tus áreas más bajas: allí tienes una buena pista sobre qué practicar.'
    };
    return {
      key: 'green', emoji: '🟢', label: 'Tengo buenas herramientas emocionales', color: '#2f8f5b', bg: '#e7f5ec',
      message: 'Tus respuestas reflejan recursos frecuentes para reconocer emociones, regular reacciones, comprender a otras personas y resolver dificultades. Sigue practicándolos: incluso con buenas herramientas todos tenemos días complicados.'
    };
  }

  function areaStatus(score) {
    if (score <= 9) return { emoji: '🔴', label: 'Conviene practicar', color: '#ca5757' };
    if (score <= 14) return { emoji: '🟡', label: 'En desarrollo', color: '#d09d13' };
    return { emoji: '🟢', label: 'Fortaleza frecuente', color: '#2f8f5b' };
  }

  function computeResult() {
    const raw = answers.reduce((sum, n) => sum + n, 0);
    const score = normalizeScore(raw);
    const areas = AREAS.map(area => {
      const values = QUESTIONS.map((q, i) => q.area === area.id ? answers[i] : null).filter(v => v !== null);
      const subtotal = values.reduce((sum, n) => sum + n, 0);
      return { ...area, subtotal, status: areaStatus(subtotal) };
    });
    return { raw, score, status: overallStatus(score), areas, completedAt: new Date().toISOString() };
  }

  function finishTest() {
    if (answers.some(v => v == null)) return;
    const result = computeResult();
    localStorage.setItem(storageKey('result'), JSON.stringify({ ...result, answers }));
    clearProgress();
    renderResult(result);
    loadReflection();
    showView('resultView');

    const first = firstName(currentStudent?.name);
    const rigoMessages = {
      red: `${first}, este resultado no es una etiqueta. Mira tus zonas rojas como habilidades que puedes entrenar.`,
      yellow: `${first}, vas construyendo herramientas. Tu zona amarilla es para practicar, no para castigarte.`,
      green: `${first}, tienes varias herramientas emocionales. Sigue usándolas también en los días difíciles.`
    };
    rigoSay(rigoMessages[result.status.key], result.status.key === 'green' ? 'excited' : 'love', 6500);
  }

  function renderResult(result) {
    $('scoreValue').textContent = result.score;
    $('resultScoreMini').textContent = `${result.score} / 300`;
    $('resultDate').textContent = formatDate(result.completedAt);
    updateStudentLabels(currentStudent);
    document.title = `Resultado emocional - ${currentStudent?.name || 'Estudiante'}`;

    const degrees = Math.round((result.score / 300) * 360);
    $('gauge').style.setProperty('--pct', `${degrees}deg`);
    $('gauge').style.setProperty('--gauge-color', result.status.color);
    $('gauge').setAttribute('aria-label', `Puntaje emocional ${result.score} de 300. ${result.status.label}`);

    $('resultBadge').textContent = `${result.status.emoji} ${result.status.label}`;
    $('resultBadge').style.color = result.status.color;
    $('resultBadge').style.background = result.status.bg;
    $('resultMessage').textContent = result.status.message;

    const wrap = $('areaResults');
    wrap.innerHTML = '';
    result.areas.forEach(area => {
      const card = document.createElement('div');
      card.className = 'area-card';
      const pct = Math.round((area.subtotal / 20) * 100);
      card.innerHTML = `
        <span class="area-emoji" aria-hidden="true">${area.icon}</span>
        <div><strong>${area.name}</strong><small>${area.status.emoji} ${area.status.label}</small></div>
        <span class="area-score">${area.subtotal}/20</span>
        <div class="area-status" aria-hidden="true"><span style="width:${pct}%;background:${area.status.color}"></span></div>`;
      wrap.appendChild(card);
    });
  }

  function saveReflection() {
    if (!currentNIE) return;
    const reflection = {
      strength: $('strengthText').value,
      improve: $('improveText').value,
      action: $('actionText').value
    };
    localStorage.setItem(storageKey('reflection'), JSON.stringify(reflection));
    $('reflectionSaved').textContent = 'Guardado en este dispositivo ✓';
    clearTimeout(saveReflection.timer);
    saveReflection.timer = setTimeout(() => $('reflectionSaved').textContent = '', 1800);
  }

  function loadReflection() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(storageKey('reflection')) || 'null'); } catch {}
    $('strengthText').value = data?.strength || '';
    $('improveText').value = data?.improve || '';
    $('actionText').value = data?.action || '';
  }

  function restart() {
    if (!confirm('¿Quieres repetir el test? Se reemplazará tu progreso actual.')) return;
    localStorage.removeItem(storageKey('result'));
    localStorage.removeItem(storageKey('reflection'));
    startFresh();
  }

  function printReport() {
    if (currentStudent?.name) {
      document.title = `Resultado emocional - ${currentStudent.name}`;
    }
    window.print();
  }

  function init() {
    $('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const nie = $('nieInput').value.replace(/\D/g, '');
      if (!nie) return;
      login(nie);
    });

    $('nieInput').addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g, ''));
    $('logoutBtn').addEventListener('click', logout);
    $('resultLogoutBtn').addEventListener('click', logout);
    $('startBtn').addEventListener('click', startFresh);
    $('resumeBtn').addEventListener('click', resume);
    $('backToIntroBtn').addEventListener('click', () => { saveProgress(); showView('introView'); $('resumeBtn').hidden = false; });
    $('prevBtn').addEventListener('click', goPrev);
    $('nextBtn').addEventListener('click', goNext);
    $('printBtn').addEventListener('click', printReport);
    $('restartBtn').addEventListener('click', restart);
    ['strengthText', 'improveText', 'actionText'].forEach(id => $(id).addEventListener('input', saveReflection));

    window.setTimeout(() => (window.rigo || document.querySelector('rigo-mascot'))?.welcome?.(), 350);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
