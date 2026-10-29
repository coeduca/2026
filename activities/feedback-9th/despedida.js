/* Carta general de Noveno 2026. No envía calificaciones ni encuestas al servidor.
   El PDF se genera localmente con jsPDF y se entrega MANUALMENTE en Google Classroom. */
(function (global) {
  'use strict';
  const cartas = global.RIGO_DESPEDIDA_CARTAS || {};
  const app = document.getElementById('app');
  const YEAR = '2026';
  const KEY_PREFIX = 'coeduca-rigo-cierre-9no-' + YEAR + '-';
  const FIXED = new Set(['1999', '12379']);
  let estudiante = null;
  let isPreview = false;
  let pdfBusy = false;

  // Iconos propios en SVG: comparten trazo y no requieren recursos externos.
  const icons = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5 16c0-3 6-3 6 0m3-6h4m-4 4h4"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>',
    love: '<circle cx="12" cy="12" r="9"/><path d="M7 8.5c-2-2-4 1 0 3 4-2 2-5 0-3Zm10 0c-2-2-4 1 0 3 4-2 2-5 0-3ZM8 15c2 3 6 3 8 0"/>',
    happy: '<circle cx="12" cy="12" r="9"/><path d="M8 9v.5m8-.5v.5M7.5 14a4.7 4.7 0 0 0 9 0"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 9v.5m8-.5v.5M8.5 14.5c2 2 5 2 7 0"/>',
    neutral: '<circle cx="12" cy="12" r="9"/><path d="M8 9v.5m8-.5v.5M8.5 15h7"/>',
    unsure: '<circle cx="12" cy="12" r="9"/><path d="M8 9v.5m8-.5v.5M8.5 16l7-2"/>',
    sad: '<circle cx="12" cy="12" r="9"/><path d="M8 9v.5m8-.5v.5M8 16c2-2.5 6-2.5 8 0"/>',
    thumb: '<path d="M7 10h-3v10h3m0-10 5-7c2 0 2 2 1 6h5a3 3 0 0 1 3 3l-2 6a3 3 0 0 1-3 2H7V10Z"/>',
    balance: '<path d="M12 3v17m-5 1h10M4 7h16M6 7l-4 7h8L6 7Zm12 0-4 7h8l-4-7Z"/>',
    steps: '<path d="M3 20h6v-6h6V8h6M15 3h6v6"/>',
    sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    wand: '<path d="m4 20 12-12 4 4L8 24m5-13 4 4M5 3v4m-2-2h4m12-3v4m-2-2h4" transform="translate(0 -2)"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
    message: '<path d="M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4Z"/><path d="M7 8h10M7 12h7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>'
  };
  function icon(name) {
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[name] || icons.sparkle}</svg>`;
  }

  const questions = [
    { key: 'experiencia', title: '¿Qué te parecieron las actividades de Classroom?',
      options: [['5', '¡Me encantaron!', 'love'], ['4', 'Me gustaron', 'happy'], ['3', 'Estuvieron bien', 'smile'], ['2', 'No mucho', 'unsure'], ['1', 'No me gustaron', 'sad']] },
    { key: 'rigo', title: '¿Te gustó trabajar con las actividades de Rigo?',
      options: [['mucho', '¡Muchísimo!', 'love'], ['si', 'Sí', 'thumb'], ['masomenos', 'Más o menos', 'neutral'], ['no', 'No mucho', 'unsure']] },
    { key: 'facilidad', title: '¿Te resultó fácil realizar las actividades?',
      options: [['si', 'Sí, casi siempre', 'thumb'], ['aveces', 'Unas sí y otras no', 'balance'], ['dificil', 'Me costaron bastante', 'steps']] },
    { key: 'proximo', title: '¿Te gustaría que Rigo estuviera el próximo año?',
      options: [['sii', '¡Sí, que vuelva!', 'sparkle'], ['mejoras', 'Sí, con algunas mejoras', 'wand'], ['otra', 'Prefiero probar otras actividades', 'compass']] },
    { key: 'favorita', title: '¿Qué tipo de actividad te ayudó más a aprender?',
      options: [['juegos', 'Juegos y retos', 'sparkle'], ['ejercicios', 'Ejercicios interactivos', 'steps'], ['equipo', 'Actividades en equipo', 'love'], ['lecturas', 'Lecturas y preguntas', 'message']] }
  ];
  const textQuestions = [
    { key: 'improve', title: '¿Qué cosas debería mejorar Rigo o las actividades de Classroom?',
      help: 'Podés dar ideas, sugerencias o escribir «Nada por ahora» si así lo sentís.', placeholder: 'Me gustaría que Rigo...' },
    { key: 'recuerdo', title: '¿Qué aprendizaje o recuerdo de noveno te gustaría llevarte al próximo año?',
      help: 'Contá qué aprendiste, qué disfrutaste o qué momento de clase fue especial para vos.', placeholder: 'De noveno me llevo...' }
  ];
  const TOTAL_REQUIRED = questions.length + textQuestions.length;

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function firstName(person) { return person.nombre.split(' ')[0]; }
  function sayRigo(message, duration = 18000, emotion = 'happy') {
    const rigo = global.rigo || document.querySelector('rigo-mascot');
    if (!rigo || !rigo.say) return;
    try {
      rigo.setEmotion(emotion);
      rigo.say(message, duration);
      rigo.style.right = '12px';
      rigo.style.bottom = '14px';
      rigo.style.left = 'auto';
      rigo.style.top = 'auto';
      rigo.style.zIndex = '1000';
    } catch (_) { /* La carta funciona aunque Rigo esté indispuesto. */ }
  }
  function readDraft(nie) {
    try { return JSON.parse(localStorage.getItem(KEY_PREFIX + nie) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function writeDraft(data) {
    if (!estudiante || isPreview) return;
    try { localStorage.setItem(KEY_PREFIX + estudiante.nie, JSON.stringify(data)); }
    catch (_) { /* Almacenamiento opcional. */ }
  }
  function renderLogin() {
    estudiante = null;
    isPreview = false;
    document.body.classList.remove('opened-letter');
    document.body.classList.add('login-view');
    app.innerHTML = `
      <header class="welcome-brand"><span>COEDUCA<span class="brand-dot">·</span>RIGO</span><span>CIERRE DE AÑO ${YEAR}</span></header>
      <section class="card access-card" aria-labelledby="access-title">
        <div class="welcome-mail" aria-hidden="true">${icon('mail')}<span>${icon('sparkle')}</span></div>
        <div class="tiny-overline">UN MENSAJE PARA TODO NOVENO</div>
        <h1 id="access-title">Una última <em>carta</em><br>para ti<span class="headline-dot">.</span></h1>
        <p class="welcome-copy">Rigo tiene una carta para todo noveno.<br>Ingresá tu NIE para abrirla y responder la encuesta desde tu celular o computadora.</p>
        <form id="login-form" novalidate>
          <label for="student-nie">NIE del estudiante</label>
          <div class="input-line"><div class="nie-field">${icon('id')}<input id="student-nie" name="nie" type="text" inputmode="numeric" pattern="[0-9]+" maxlength="12" autocomplete="off" autocapitalize="off" enterkeyhint="go" aria-describedby="login-note login-error" placeholder="Escribí tu NIE" required></div><button class="primary-btn" type="submit">Ver mi carta ${icon('arrow')}</button></div>
          <p class="form-error" id="login-error" role="alert" aria-live="assertive"></p>
        </form>
        <div class="access-note" id="login-note">${icon('info')}<span>Tu NIE registra tu nombre en el PDF.<br>No es una contraseña ni un acceso privado.</span></div>
      </section>
      <div class="welcome-signoff">Un sobre, un recuerdo y mucho cariño. <span aria-hidden="true">♡</span></div>`;
    document.getElementById('login-form').addEventListener('submit', login);
    document.getElementById('student-nie').addEventListener('input', event => {
      event.target.value = event.target.value.replace(/\D+/g, '').slice(0, 12);
      event.target.removeAttribute('aria-invalid');
      document.getElementById('login-error').textContent = '';
    });
    document.getElementById('student-nie').focus({preventScroll:true});
  }
  async function login(event) {
    event.preventDefault();
    const input = document.getElementById('student-nie');
    const error = document.getElementById('login-error');
    const btn = event.currentTarget.querySelector('[type=submit]');
    const nie = input.value.trim().replace(/\s/g, '');
    error.textContent = '';
    if (FIXED.has(nie)) {
      const auth = global.COEDUCA_FIXED_AUTH;
      if (!auth || typeof auth.requestLogin !== 'function') {
        error.textContent = 'No se pudo abrir el acceso protegido de vista previa.';
        return;
      }
      btn.disabled = true;
      try {
        if (await auth.requestLogin(nie)) { renderTeacherPreview(); return; }
      } catch (_) { error.textContent = 'No se pudo validar el acceso de docente. Reintentá con conexión.'; }
      finally { btn.disabled = false; }
      return;
    }
    if (!/^[0-9]{4,12}$/.test(nie) || !Object.prototype.hasOwnProperty.call(cartas, nie)) {
      error.textContent = 'Ese NIE no aparece entre los destinatarios de esta despedida. Revisalo o consultá al profesor.';
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    estudiante = Object.assign({nie}, cartas[nie]);
    renderEnvelope();
  }
  function renderTeacherPreview() {
    document.body.classList.remove('login-view');
    app.innerHTML = `<section class="card preview-card"><div class="tiny-overline">ACCESO PROTEGIDO</div><h1>Vista previa del profesor</h1><p>Elegí un estudiante para revisar la carta general. La encuesta no se guarda en vista previa.</p><label for="preview-nie">Carta de:</label><select id="preview-nie"><option value="">Elegí un estudiante</option>${Object.entries(cartas).map(([nie, c]) => `<option value="${escapeHTML(nie)}">${escapeHTML(c.nombre)}</option>`).join('')}</select><button class="text-link" id="exit-preview" type="button">← Salir</button></section>`;
    document.getElementById('exit-preview').addEventListener('click', () => {
      if (global.COEDUCA_FIXED_AUTH) global.COEDUCA_FIXED_AUTH.clear();
      renderLogin();
    });
    document.getElementById('preview-nie').addEventListener('change', event => {
      const nie = event.target.value;
      if (!cartas[nie]) return;
      estudiante = Object.assign({nie}, cartas[nie]);
      isPreview = true;
      renderEnvelope();
    });
    sayRigo('¡Acceso VIP! Profesor, prometo que las cartas no contienen mis expedientes fiscales.', 12000, 'sneaky');
  }
  function renderEnvelope() {
    if (!estudiante) return renderLogin();
    document.body.classList.remove('opened-letter', 'login-view');
    const p = estudiante;
    app.innerHTML = `
      <div class="ribbon"><span class="ribbon-dot"></span> ÚLTIMA ACTIVIDAD DEL AÑO <span class="ribbon-dot"></span></div>
      <div class="top-nav"><span class="nav-student">Para: <strong>${escapeHTML(p.nombre)}</strong></span><button class="text-link" id="switch-student" type="button">Cambiar de cuenta ↗</button></div>
      <header class="hero letter-hero"><div class="tiny-overline">UN MENSAJE MUY ESPECIAL</div><h1>¡Tenés <em>correo</em>!</h1><p>La oficina postal de Rigo confirma que esta carta es para todo noveno. ¡Con sello y un poquito de drama!</p></header>
      <section class="envelope-area" aria-label="Sobre de Rigo para ${escapeHTML(p.nombre)}">
        <span class="orbit-star orbit-star-one" aria-hidden="true">✦</span><span class="orbit-star orbit-star-two" aria-hidden="true">✳</span>
        <div class="envelope-stage" id="envelope-stage">
          <div class="envelope" id="envelope">
            <div class="envelope-back" aria-hidden="true"></div>
            <div class="envelope-flap" aria-hidden="true"></div>
            <div class="envelope-face" aria-hidden="true"></div>
            <div class="envelope-address"><span>CORREO EXTRAORDINARIO</span><strong>Para ${escapeHTML(firstName(p))}</strong><small>De Rigo · Entrega especial</small></div>
            <button id="wax-seal" class="wax-seal" type="button" aria-label="Romper el sello y abrir la carta de Rigo"><span aria-hidden="true">R</span><small>ABRIR</small></button>
          </div>
          <p id="envelope-hint" class="envelope-hint">✦ Tocá el sello rojo para romperlo y abrir tu carta ✦</p>
        </div>
      </section>
      <section class="parchment-frame" id="letter-section" aria-label="Carta general de Rigo para noveno" aria-hidden="true">
        <div class="parchment-curl top" aria-hidden="true"></div>
        <article class="parchment">
          <header class="letter-heading"><div><span class="letter-eyebrow">DEL ESCRITORIO DE RIGO</span><div class="letter-stamp">Una carta para guardar</div></div><div class="letter-postmark" aria-hidden="true"><span>ENTREGA ESPECIAL</span><strong>R</strong><small>COEDUCA · ${YEAR}</small></div></header>
          <div class="letter-rule" aria-hidden="true"><span>✦</span></div>
          <p class="letter-date">Últimos días de nuestro año escolar · ${YEAR}</p>
          <h2>${escapeHTML(p.saludo)}</h2>
          <div class="letter-body">${p.parrafos.map(t=>`<p>${escapeHTML(t)}</p>`).join('')}</div>
          <footer class="letter-closing"><p class="letter-signature">${escapeHTML(p.firma)}</p><span class="letter-seal" aria-hidden="true"><span>R</span></span></footer>
        </article>
        <div class="parchment-curl bottom" aria-hidden="true"></div>
      </section>
      <section id="survey-section" class="survey-shell" aria-hidden="true">
        <div class="section-label"><span>SEGUNDA PARTE</span><span>✦</span><span>TU VOZ IMPORTA</span></div>
        <h2>Ahora Rigo <em>te escucha.</em></h2>
        <p class="survey-intro">Antes de despedirnos, contame qué tal te parecieron nuestras actividades. No hay respuestas correctas, puntos secretos ni lagartijas juzgándote. Tu opinión es de verdad y la encuesta está pensada para responderse cómodamente también desde el celular.</p>
        <div class="survey-progress"><div><span>Tu opinión cuenta</span><span id="survey-count">0 de ${TOTAL_REQUIRED}</span></div><progress id="survey-progress" value="0" max="${TOTAL_REQUIRED}" aria-label="Respuestas completas">0 de ${TOTAL_REQUIRED}</progress></div>
        <form id="feedback-form" class="feedback-form" novalidate>
          ${questions.map((q,i)=>`<fieldset class="question-card"><legend><span class="q-number">0${i+1}</span> ${escapeHTML(q.title)}</legend><div class="answer-options" style="--option-count:${q.options.length}">${q.options.map(([value,label,symbol])=>`<label class="option"><input type="radio" name="${q.key}" value="${escapeHTML(value)}" required><span class="option-card"><span class="option-icon">${icon(symbol)}</span><span class="option-label">${escapeHTML(label)}</span><span class="option-check">${icon('check')}</span></span></label>`).join('')}</div></fieldset>`).join('')}
          ${textQuestions.map((q,i)=>`<div class="question-card text-question"><label for="${q.key}"><span class="q-number">${String(questions.length+i+1).padStart(2,'0')}</span> ${escapeHTML(q.title)}</label><p>${escapeHTML(q.help)}</p><textarea id="${q.key}" name="${q.key}" maxlength="600" rows="4" placeholder="${escapeHTML(q.placeholder)}" required></textarea><small>Máximo 600 caracteres · Respondé con sinceridad.</small></div>`).join('')}
          <div class="question-card text-question optional"><label for="message"><span class="q-number">${icon('message')}</span> Bonus sentimental: ¿querés decirle algo a Rigo?</label><p>Esta parte es opcional. Acepto agradecimientos, quejas y recomendaciones de higiene reptiliana.</p><textarea id="message" name="message" maxlength="600" rows="3" placeholder="Querido Rigo..."></textarea></div>
          <section class="submission-box"><div class="submission-symbol" aria-hidden="true">${icon('download')}</div><h3>¡Tu último recuerdo para Classroom!</h3><p>Respondé las ${TOTAL_REQUIRED} preguntas, descargá tu PDF y <strong>adjuntalo a esta tarea en Google Classroom</strong>. Luego pulsá <strong>Entregar</strong> allí.</p><p id="completion-status" class="completion-status" role="status">0 de ${TOTAL_REQUIRED} respuestas completas</p><button class="primary-btn download-btn" id="download-pdf" type="submit">${icon('download')} Descargar mi carta y encuesta en PDF</button><p id="download-message" class="download-message" role="status" aria-live="polite"></p><small>El PDF se guarda en tu dispositivo. Esta página no envía tu encuesta automáticamente al profesor ni marca la tarea como entregada.</small></section>
        </form>
      </section>
      <div class="end-marker">FIN DEL AÑO. NO DEL CARIÑO. ♥</div>`;
    document.getElementById('switch-student').addEventListener('click', () => {
      if (isPreview && global.COEDUCA_FIXED_AUTH) global.COEDUCA_FIXED_AUTH.clear();
      renderLogin();
    });
    document.getElementById('wax-seal').addEventListener('click', openEnvelope, {once:true});
    const form = document.getElementById('feedback-form');
    const draft = isPreview ? {} : readDraft(p.nie);
    Object.entries(draft).forEach(([key,value]) => {
      if (textQuestions.some(q => q.key === key) || key === 'message') {
        const el = form.elements.namedItem(key);
        if (el && typeof value === 'string') el.value = value;
      } else {
        const radio = [...form.querySelectorAll('input[type=radio]')].find(el=>el.name === key && el.value === value);
        if (radio) radio.checked = true;
      }
    });
    form.addEventListener('input', formChanged);
    form.addEventListener('change', formChanged);
    form.addEventListener('submit', downloadPDF);
    updateCompletion();
    window.scrollTo({top:0,behavior:'auto'});
    sayRigo('¡Hola, noveno! Tengo una carta para todo el grupo. ¡Rompé el sello, que mi emoción no cabe en un sobre!', 150000, 'excited');
  }
  function openEnvelope() {
    document.body.classList.add('opened-letter');
    document.getElementById('envelope-stage').classList.add('is-open');
    const button = document.getElementById('wax-seal');
    button.disabled = true;
    document.getElementById('envelope-hint').textContent = '¡Correo entregado! Tu carta está aquí abajo.';
    const letter = document.getElementById('letter-section');
    const survey = document.getElementById('survey-section');
    letter.setAttribute('aria-hidden','false');
    survey.setAttribute('aria-hidden','false');
    sayRigo('¡SOBRE ABIERTO! Se me escapó una lágrima... ¡pero soy un camaleón, nadie sabe de qué ojo salió!', 15000, 'love');
    setTimeout(() => letter.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}), 950);
  }
  function answersFromForm() {
    const form = document.getElementById('feedback-form');
    const fd = new FormData(form);
    const values = {};
    for (const q of questions) values[q.key] = fd.get(q.key) || '';
    for (const q of textQuestions) values[q.key] = String(fd.get(q.key) || '').trim();
    values.message = String(fd.get('message') || '').trim();
    return values;
  }
  function updateCompletion() {
    const a = answersFromForm();
    const complete = questions.filter(q=>a[q.key]).length + textQuestions.filter(q=>a[q.key].length>0).length;
    const status = document.getElementById('completion-status');
    status.textContent = complete + ' de ' + TOTAL_REQUIRED + ' respuestas completas';
    if (complete === TOTAL_REQUIRED) status.textContent += ' · ¡Listo para descargar!';
    document.getElementById('survey-count').textContent = complete + ' de ' + TOTAL_REQUIRED;
    const progress = document.getElementById('survey-progress');
    progress.value = complete;
    progress.textContent = complete + ' de ' + TOTAL_REQUIRED;
    return complete;
  }
  function formChanged() {
    const a = answersFromForm();
    writeDraft(a);
    updateCompletion();
    const status = document.getElementById('download-message');
    if (status) status.textContent = '';
  }
  function answerText(key,value) {
    const q = questions.find(q=>q.key===key);
    return q?.options.find(([v])=>v===value)?.[1] || 'Sin respuesta';
  }
  function pdfText(value) {
    // Las fuentes PDF integradas usan WinAnsi: reemplazar signos no disponibles sin perder tildes.
    return String(value || '').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[—–]/g,'-').replace(/…/g,'...').replace(/[^\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, '');
  }
  function pdfMake(person, answers) {
    const jsPDF = global.jspdf?.jsPDF;
    if (!jsPDF) throw new Error('No se pudo cargar el generador PDF. Recargá la página e intentá otra vez.');
    const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const W = 210, H = 297, margin = 22, contentWidth = W - 2*margin;
    let page = 0, y = 0;
    const ink = [46, 42, 68], purple=[69,48,110], orange=[190,99,48];
    function newPage(section) {
      if (page) doc.addPage();
      page++;
      doc.setFillColor(251, 248, 239); doc.rect(0,0,W,H,'F');
      doc.setFillColor(...purple);doc.rect(0,0,W,10,'F');
      doc.setDrawColor(204,168,112);doc.setLineWidth(.6);doc.line(margin,21,W-margin,21);
      doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...purple);
      doc.text('COEDUCA   /   RIGO   /   NOVENO   /   ' + YEAR, margin,17);
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(99,91,103);
      doc.text(pdfText(section),W-margin,17,{align:'right'});
      y=30;
    }
    function writeText(text, opts={}) {
      const size=opts.size||10.8, line=opts.line||6.25;
      doc.setFont('helvetica',opts.bold?'bold': 'normal');
      doc.setFontSize(size);doc.setTextColor(...(opts.color||ink));
      const lines=doc.splitTextToSize(pdfText(text), contentWidth);
      for (const row of lines) {
        if (y+line > H-23) newPage('CONTINUACIÓN');
        doc.text(row,margin,y); y+=line;
      }
      y += opts.after == null ? 5 : opts.after;
    }
    newPage('CARTA GENERAL');
    doc.setFont('times','bolditalic');doc.setTextColor(...purple);doc.setFontSize(23);
    doc.text('Una carta para noveno',margin,y+5);y+=17;
    writeText(person.nombre,{size:12,bold:true,color:orange,after:9});
    writeText(person.saludo,{size:12,bold:true,after:8});
    person.parrafos.forEach(par=>writeText(par,{size:10.8,line:6.3,after:7}));
    y+=3;
    writeText(person.firma,{size:11,bold:true,color:purple,after:2});
    newPage('ENCUESTA DE CIERRE');
    doc.setFont('times','bolditalic');doc.setFontSize(22);doc.setTextColor(...purple);
    doc.text('Mi experiencia con Rigo',margin,y+4);y+=18;
    writeText('Estudiante: '+person.nombre,{bold:true,size:11,after:1});
    writeText('NIE: '+person.nie+'    |    Noveno grado    |    '+YEAR,{size:9.5,after:10});
    for (let i=0;i<questions.length;i++) {
      const q=questions[i];
      writeText((i+1)+'. '+q.title,{bold:true,size:11,color:purple,after:1});
      writeText(answerText(q.key,answers[q.key]),{size:10.8,after:9});
    }
    textQuestions.forEach((q,i) => {
      writeText((questions.length+i+1)+'. '+q.title,{bold:true,size:11,color:purple,after:2});
      writeText(answers[q.key],{size:10.8,after:10});
    });
    writeText('Mensaje adicional a Rigo (opcional):',{bold:true,size:11,color:purple,after:2});
    writeText(answers.message||'Sin mensaje adicional.',{size:10.8,after:8});
    // No añadir una página casi vacía solo por este recordatorio.
    if (y + 25 <= H - 23) {
      doc.setDrawColor(204,168,112);doc.line(margin,y,W-margin,y);y+=9;
      writeText('Esta encuesta se respondió individualmente. El estudiante debe adjuntar el PDF y pulsar Entregar en Google Classroom.',{size:8.6,color:[98,89,103],line:5.2,after:0});
    }
    const total=doc.getNumberOfPages();
    for(let i=1;i<=total;i++){
      doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(112,100,113);
      doc.text('Rigo: "El fin del curso no es el fin de las buenas historias."',margin,H-12);
      doc.text(String(i)+' / '+String(total),W-margin,H-12,{align:'right'});
    }
    return doc;
  }
  function downloadPDF(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.getElementById('download-message');
    if (pdfBusy) return;
    const answers=answersFromForm();
    if (updateCompletion() < TOTAL_REQUIRED || !form.checkValidity()) {
      message.textContent='Faltan respuestas. Completá las ' + TOTAL_REQUIRED + ' preguntas antes de descargar tu PDF.';
      form.querySelector(':invalid')?.focus();
      return;
    }
    pdfBusy=true;
    const button=document.getElementById('download-pdf');button.disabled=true;
    message.textContent='Preparando tu recuerdo...';
    try {
      const pdf=pdfMake(estudiante,answers);
      const filename='Rigo_Cierre_Noveno_'+estudiante.nie+'.pdf';
      pdf.save(filename);
      message.textContent='¡PDF generado! Ahora adjuntalo a la tarea en Classroom y presioná Entregar. La descarga por sí sola no entrega la tarea.';
      sayRigo('¡Listo, '+firstName(estudiante)+'! Tu PDF va rumbo a Classroom. ¡No olvidés adjuntarlo y tocar ENTREGAR!',17000,'excited');
    } catch(error) {
      message.textContent=error.message||'Hubo un problema generando tu PDF. Reintentá.';
    } finally {pdfBusy=false;button.disabled=false;}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',renderLogin,{once:true});
  else renderLogin();
})(window);
