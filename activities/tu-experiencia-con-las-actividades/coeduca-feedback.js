/* Feedback packages: opinions are accepted; completion is the only participation criterion. */
(function (global) {
  'use strict';
  const config = global.COEDUCA_FEEDBACK_CONFIG;
  const app = document.getElementById('app');
  const questions = config.exercises || [];
  const transport = config.deliveryMode === 'local' ? null : global.COEDUCA_CLASSROOM;
  const connected = Boolean(transport) && !config.preview;
  let student = null, letter = null, state = null;
  let reviewAccount = null, reviewRecipients = null;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fixed = nie => nie === '1999' || nie === '12379';
  const draftKey = () => 'worksheets-feedback:' + (config.id || 'feedback') + ':' + student.nie;
  const data = question => question.dataA;
  const icon = path => `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const checkIcon = icon('<path d="m5 12 4 4L19 6"/>');
  const downloadIcon = icon('<path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/>');
  const welcomeEnvelope = `<div class="welcome-mail" aria-hidden="true">
    <svg viewBox="0 0 240 180" fill="none" focusable="false">
      <defs>
        <linearGradient id="mail-paper" x1="86" y1="40" x2="159" y2="146" gradientUnits="userSpaceOnUse"><stop stop-color="#fffdf2"/><stop offset="1" stop-color="#fff1c5"/></linearGradient>
        <linearGradient id="mail-front" x1="54" y1="84" x2="176" y2="159" gradientUnits="userSpaceOnUse"><stop stop-color="#b6d6ff"/><stop offset="1" stop-color="#629de3"/></linearGradient>
        <linearGradient id="mail-wax" x1="110" y1="113" x2="132" y2="140" gradientUnits="userSpaceOnUse"><stop stop-color="#ffe68b"/><stop offset="1" stop-color="#d7a91f"/></linearGradient>
      </defs>
      <circle cx="120" cy="92" r="72" fill="#e2eeff"/>
      <circle cx="120" cy="92" r="82" stroke="#a9c9ee" stroke-dasharray="2 8"/>
      <ellipse class="mail-shadow" cx="120" cy="163" rx="59" ry="7" fill="#154b91" opacity=".12"/>
      <g class="mail-float">
        <path class="mail-lid" d="M49 84 120 32 191 84Z" fill="#88b6ee" stroke="#477fbd" stroke-width="1.5" stroke-linejoin="miter"/>
        <path d="M49 84H191V148Q191 156 183 156H57Q49 156 49 148Z" fill="#73a5e2" stroke="#477fbd" stroke-width="1.5"/>
        <g class="mail-note">
          <rect x="73" y="52" width="94" height="90" rx="6" fill="url(#mail-paper)" stroke="#e3cb7b"/>
          <path d="M91 92h58m-58 10h45m-45 10h52" stroke="#b3cbe6" stroke-width="3" stroke-linecap="round"/>
          <path d="M120 79s-12-7-12-13a6 6 0 0 1 12-1 6 6 0 0 1 12 1c0 6-12 13-12 13Z" fill="#d5a31d"/>
        </g>
        <path d="m49 86 71 45 71-45v62q0 9-9 9H58q-9 0-9-9Z" fill="url(#mail-front)"/>
        <path d="m50 153 52-39m88 39-52-39" stroke="#4f86c8" stroke-width="1.5"/>
        <path d="m50 87 70 44 70-44" stroke="#ddecff" stroke-width="1.5"/>
        <circle cx="120" cy="128" r="16" fill="url(#mail-wax)" stroke="#b88a13" stroke-width="1.5"/>
        <circle cx="120" cy="128" r="12" stroke="#fff4c4" stroke-opacity=".65"/>
        <path d="M116 135v-14h5a4 4 0 0 1 0 8h-5m5 0 5 6" stroke="#654d06" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g class="mail-sparkle" stroke="#c79919" stroke-width="2" stroke-linecap="round"><path d="M38 53v12m-6-6h12M197 44v16m-8-8h16"/></g>
      <g class="mail-sparkle mail-sparkle-late" fill="#72a2de"><circle cx="204" cy="115" r="3"/><circle cx="35" cy="122" r="2.5"/></g>
    </svg>
  </div>`;
  function keepRigoInView() {
    const mascot = document.querySelector('rigo-mascot');
    if (!mascot || !mascot.style.left || !mascot.style.top) return;
    const bounds = mascot.getBoundingClientRect();
    mascot.style.left = Math.max(0, Math.min(bounds.left, global.innerWidth - bounds.width)) + 'px';
    mascot.style.top = Math.max(0, Math.min(bounds.top, global.innerHeight - bounds.height)) + 'px';
  }
  global.addEventListener('resize', keepRigoInView);
  function celebrate() { const rigo = document.querySelector('rigo-mascot'); if (rigo?.cheer) rigo.cheer(); }
  function loginView() {
    transport?.unmount?.();
    student = letter = state = null;
    reviewAccount = reviewRecipients = null;
    document.body.className = 'login-view';
    app.innerHTML = `<section class="card access-card" aria-labelledby="welcome-title">${welcomeEnvelope}<div class="tiny-overline">TU VOZ IMPORTA</div><h1 id="welcome-title">${escape(config.title)}</h1><p class="welcome-copy">${escape(config.introduction)}</p><form id="login-form"><label for="student-nie">NIE del estudiante</label><div class="input-line"><input id="student-nie" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="Escribe tu NIE" required><button class="primary-btn" type="submit">Entrar ${icon('<path d="M5 12h14m-5-5 5 5-5 5"/>')}</button></div><p id="login-error" class="form-error" role="alert"></p></form><p class="welcome-signoff">Un espacio para recordar, agradecer y escucharte.</p>${config.preview ? '<p class="preview-note">Vista previa de Worksheets: los envíos están desactivados.</p>' : ''}</section>`;
    document.getElementById('login-form').addEventListener('submit', async event => {
      event.preventDefault();
      const nie = document.getElementById('student-nie').value.trim();
      const button = event.currentTarget.querySelector('button');
      const error = document.getElementById('login-error');
      button.disabled = true;
      try {
        if (fixed(nie)) {
          if (!global.COEDUCA_FIXED_AUTH?.requestLogin || !await global.COEDUCA_FIXED_AUTH.requestLogin(nie)) return;
          reviewAccount = nie;
          reviewRecipients = null;
          await teacherPreview();
          return;
        }
        let person;
        if (connected) person = await transport.lookup(nie);
        else {
          const roster = typeof STUDENTS === 'object' ? STUDENTS : {};
          if (!fixed(nie) && !config.recipientNies?.includes(nie)) throw new Error('Este NIE no está seleccionado para este Feedback.');
          if (Object.prototype.hasOwnProperty.call(roster, nie)) person = Object.assign({nie}, roster[nie]);
        }
        if (!person) throw new Error('NIE no encontrado entre los destinatarios.');
        student = person;
        letter = person.feedbackLetter || config.letters?.[nie] || null;
        render();
      } catch (err) { error.textContent = err.message || 'No se pudo abrir el Feedback.'; }
      finally { button.disabled = false; }
    });
  }
  async function teacherPreview() {
    transport?.unmount?.();
    student = letter = state = null;
    document.body.className = 'login-view';
    const roster = typeof STUDENTS === 'object' ? STUDENTS : {};
    const account = reviewAccount;
    app.innerHTML = `<section class="card preview-card"><div class="tiny-overline">${account === '12379' ? 'RIGO' : 'MI CUENTA'} · REVISIÓN</div><h1>Elige un estudiante</h1><p>Revisa sus cartas y preguntas. Esta vista no guarda respuestas ni envía participación.</p><label for="preview-student">Estudiante</label><select id="preview-student" disabled><option value="">Cargando estudiantes…</option></select><p id="preview-error" class="form-error" role="alert"></p><button id="retry-preview" class="text-link" type="button" hidden>Reintentar</button><button id="exit-preview" class="text-link" type="button">Volver al inicio</button></section>`;
    const select = document.getElementById('preview-student');
    const error = document.getElementById('preview-error');
    document.getElementById('exit-preview').addEventListener('click', loginView);
    document.getElementById('retry-preview').addEventListener('click', teacherPreview);
    try {
      const recipients = reviewRecipients || (connected
        ? await transport.feedbackRecipients(account)
        : (config.recipientNies || []).filter(nie => !fixed(nie)).map(nie => Object.assign({nie}, roster[nie])));
      if (!select.isConnected || reviewAccount !== account) return;
      reviewRecipients = recipients;
      select.innerHTML = `<option value="">${reviewRecipients.length ? 'Seleccionar estudiante' : 'Sin destinatarios disponibles'}</option>` + reviewRecipients.map(person => `<option value="${escape(person.nie)}">${escape(person.name || person.nie)} · ${escape(person.grade || person.nie)}</option>`).join('');
      select.disabled = !reviewRecipients.length;
    } catch (failure) {
      if (!select.isConnected || reviewAccount !== account) return;
      error.textContent = failure.message || 'No se pudo cargar el selector.';
      document.getElementById('retry-preview').hidden = false;
    }
    select.addEventListener('change', async event => {
      const nie = event.target.value;
      if (!nie) return;
      select.disabled = true;
      error.textContent = '';
      try {
        const person = connected ? await transport.lookup(nie) : reviewRecipients.find(person => person.nie === nie);
        if (!select.isConnected || reviewAccount !== account) return;
        if (!person) throw new Error('No se pudo abrir este estudiante.');
        student = person;
        letter = person.feedbackLetter || config.letters?.[nie] || null;
        render();
      } catch (failure) {
        if (select.isConnected) error.textContent = failure.message || 'No se pudo abrir la carta.';
      } finally { if (select.isConnected) select.disabled = false; }
    });
  }
  function questionMarkup(question, index) {
    const settings = data(question);
    const heading = `<span class="q-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span>${escape(question.title)}</span><span class="question-requirement">${settings.required ? 'Obligatoria' : 'Opcional'}</span>`;
    if (settings.type === 'choice') return `<fieldset class="question-card"><legend><span class="question-heading">${heading}</span></legend><div class="answer-options" style="--option-count:${Math.min(settings.options.length, 4)}">${settings.options.map((label, option) => `<label class="option"><input type="radio" name="ex_${index}" value="${option}" ${settings.required ? 'required' : ''}><span class="option-card"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + option)}</span><span class="option-label">${escape(label)}</span><span class="option-check">${checkIcon}</span></span></label>`).join('')}</div></fieldset>`;
    return `<div class="question-card text-question"><label class="question-heading" for="answer-${index}">${heading}</label><textarea id="answer-${index}" name="ex_${index}" rows="4" maxlength="2000" placeholder="Este espacio es tuyo…" ${settings.required ? 'required' : ''}></textarea><small>Hasta 2000 caracteres</small></div>`;
  }
  function internalEnvelope(name) {
    return `<section class="envelope-area" aria-label="Tu carta de Rigo"><div class="envelope-stage" id="envelope-stage">
      <div class="envelope">
        <div class="envelope-back"></div>
        <div class="envelope-insert" aria-hidden="true"><span>CORREO DE RIGO</span><strong>Una carta para ti</strong><i></i><i></i><i></i></div>
        <div class="envelope-face"></div>
        <div class="envelope-flap"><div class="envelope-postage" aria-hidden="true">
          <svg viewBox="0 0 54 64" fill="none"><path d="M4 4h46v56H4Z" fill="#fff8dc" stroke="#c99e27" stroke-dasharray="2 3" stroke-width="3"/><path d="M10 10h34v44H10Z" stroke="#154b91" stroke-opacity=".3"/><path d="M16 24h22v16H16Zm0 1 11 8 11-8m-22 14 8-8m14 8-8-8" stroke="#154b91" stroke-width="1.6" stroke-linejoin="round"/><path d="M19 46h16" stroke="#c99e27" stroke-width="2" stroke-linecap="round"/></svg>
        </div></div>
        <div class="envelope-postmark" aria-hidden="true"><span>RIGO</span><small>CORREO CON CARIÑO</small></div>
        <div class="envelope-airmail" aria-hidden="true"></div>
        <div class="envelope-address"><span>ENTREGA ESPECIAL PARA</span><strong title="${escape(name)}">${escape(name)}</strong></div>
        <button id="open-letter" class="wax-seal" type="button" aria-label="Romper el sello y abrir mi carta" aria-controls="letter" aria-expanded="false">
          <svg class="seal-art" viewBox="0 0 110 110" fill="none" aria-hidden="true">
            <defs><radialGradient id="postal-wax" cx=".3" cy=".2" r=".85"><stop stop-color="#fff0ac"/><stop offset=".48" stop-color="#ffd449"/><stop offset="1" stop-color="#c79919"/></radialGradient></defs>
            <path d="M55 5C63 3 67 10 74 10C83 9 84 19 91 23C100 27 96 36 102 43C109 51 101 58 102 66C104 75 94 78 91 85C88 94 78 91 72 98C66 105 58 99 51 103C43 107 38 98 30 98C21 99 20 89 13 85C5 81 10 72 5 65C0 57 8 50 6 42C4 34 14 30 16 23C19 15 29 18 35 11C41 4 48 9 55 5Z" fill="url(#postal-wax)" stroke="#b68a1c" stroke-width="1.5"/>
            <circle cx="55" cy="54" r="37" stroke="#ac7f14" stroke-width="2"/>
            <circle cx="55" cy="53" r="34" stroke="#fff2b9" stroke-width="1.5"/>
            <circle cx="55" cy="54" r="30" stroke="#b88e26" stroke-width=".8" stroke-dasharray="1 4"/>
            <path d="M43 67V32H56C70 32 71 49 56 50H43M55 50 70 67" stroke="#795b13" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M44 66V33H56" stroke="#fff0aa" stroke-width="1" stroke-linecap="round" opacity=".8"/>
            <path d="M19 43Q23 20 45 16" stroke="#fff5cd" stroke-width="3" stroke-linecap="round" opacity=".7"/>
            <text x="55" y="80" text-anchor="middle" fill="#795b13" font-family="system-ui,sans-serif" font-size="7" font-weight="800" letter-spacing="1.5">ABRIR</text>
          </svg>
        </button>
      </div><p class="envelope-hint" id="envelope-hint">${icon('<path d="m9 11 3 3 3-3M12 3v11M5 15v5h14v-5"/>')} Rompe el sello. Esta carta es para ti.</p>
    </div></section>`;
  }
  function render() {
    const classroomActive = connected && !reviewAccount;
    const mascot = document.querySelector('rigo-mascot');
    if (mascot) mascot.setAttribute('grade', student.grade || '');
    document.body.className = letter ? '' : 'opened-letter';
    state = {student, poolVersion:'A', answers:{}, gameResult:null};
    const deliveryInstructions = reviewAccount ? 'Vista de revisión. Puedes generar un PDF de ejemplo; las respuestas no se guardan ni se envían a Classroom.' : classroomActive
      ? 'Descarga tu comprobante y adjúntalo a la tarea en Classroom. Después pulsa Entregar allí.'
      : 'Descarga y guarda tu carta y tus respuestas en un PDF. Puedes compartirlo con tu docente.';
    app.innerHTML = `<header class="activity-header"><div class="header-toolbar"><div class="ribbon"><span class="ribbon-dot" aria-hidden="true"></span><span>FEEDBACK · TU OPINIÓN CUENTA</span></div><button class="account-switch-btn" id="switch-student" type="button" aria-label="Cambiar de cuenta" title="Cambiar de cuenta"><img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PgoNPCEtLSBVcGxvYWRlZCB0bzogU1ZHIFJlcG8sIHd3dy5zdmdyZXBvLmNvbSwgR2VuZXJhdG9yOiBTVkcgUmVwbyBNaXhlciBUb29scyAtLT4KPHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB2ZXJzaW9uPSIxLjEiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgoNPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6IzMzMzMzMzt9DQoJLnN0MXtmaWxsOm5vbmU7c3Ryb2tlOiMzMzMzMzM7c3Ryb2tlLXdpZHRoOjMyO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9DQo8L3N0eWxlPgoNPGcgaWQ9IkxheWVyXzEiLz4KDTxnIGlkPSJMYXllcl8yIj4KDTxnPgoNPGc+Cg08ZWxsaXBzZSBjbGFzcz0ic3QwIiBjeD0iMTM5LjYxIiBjeT0iMjczLjciIHJ4PSI2My45NiIgcnk9IjYzLjk2IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjkyMzkgLTAuMzgyNyAwLjM4MjcgMC45MjM5IC05NC4xMTE4IDc0LjI2MSkiLz4KDTwvZz4KDTxnPgoNPHBhdGggY2xhc3M9InN0MCIgZD0iTTE1MS44LDM4NS4yMmgtMjQuMzdjLTQ2LjM1LDAtODMuOTMsMzcuNTctODMuOTMsODMuOTNsMCwwaDE5Mi4yMmwwLDAgICAgIEMyMzUuNzIsNDIyLjc5LDE5OC4xNSwzODUuMjIsMTUxLjgsMzg1LjIyeiIvPgoNPC9nPgoNPGc+Cg08ZWxsaXBzZSBjbGFzcz0ic3QwIiBjeD0iMzcyLjM5IiBjeT0iMTA2LjgyIiByeD0iNjMuOTYiIHJ5PSI2My45NiIgdHJhbnNmb3JtPSJtYXRyaXgoMC44NTA3IC0wLjUyNTcgMC41MjU3IDAuODUwNyAtMC41NDA4IDIxMS43MjkyKSIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzg0LjU3LDIxOC4zNEgzNjAuMmMtNDYuMzUsMC04My45MywzNy41Ny04My45Myw4My45M3YwSDQ2OC41djBDNDY4LjUsMjU1LjkxLDQzMC45MywyMTguMzQsMzg0LjU3LDIxOC4zNCAgICAgeiIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgzLjcxLDM0OS42MWMtMC4zOC0wLjM4LTAuNzctMC43My0xLjE4LTEuMDdjLTAuMTgtMC4xNC0wLjM2LTAuMjctMC41NC0wLjQxICAgICBjLTAuMjQtMC4xOC0wLjQ3LTAuMzYtMC43MS0wLjUzYy0wLjIyLTAuMTUtMC40NS0wLjI4LTAuNjgtMC40MWMtMC4yMi0wLjEzLTAuNDQtMC4yNy0wLjY2LTAuMzljLTAuMjMtMC4xMi0wLjQ3LTAuMjMtMC43MS0wLjM0ICAgICBjLTAuMjQtMC4xMS0wLjQ3LTAuMjMtMC43MS0wLjMzYy0wLjIzLTAuMS0wLjQ3LTAuMTctMC43LTAuMjZjLTAuMjYtMC4wOS0wLjUxLTAuMTktMC43OC0wLjI3Yy0wLjIzLTAuMDctMC40Ny0wLjEyLTAuNy0wLjE4ICAgICBjLTAuMjctMC4wNy0wLjU0LTAuMTQtMC44Mi0wLjJjLTAuMjYtMC4wNS0wLjUzLTAuMDgtMC44LTAuMTJjLTAuMjUtMC4wNC0wLjUtMC4wOC0wLjc1LTAuMTFjLTAuNDgtMC4wNS0wLjk1LTAuMDctMS40My0wLjA3ICAgICBjLTAuMDUsMC0wLjEtMC4wMS0wLjE0LTAuMDFjLTAuMDYsMC0wLjExLDAuMDEtMC4xNywwLjAxYy0wLjQ3LDAtMC45NCwwLjAzLTEuNDEsMC4wN2MtMC4yNiwwLjAzLTAuNTEsMC4wNy0wLjc3LDAuMTEgICAgIGMtMC4yNiwwLjA0LTAuNTIsMC4wNy0wLjc4LDAuMTJjLTAuMjgsMC4wNi0wLjU2LDAuMTMtMC44NCwwLjJjLTAuMjMsMC4wNi0wLjQ2LDAuMTEtMC42OCwwLjE4Yy0wLjI3LDAuMDgtMC41MywwLjE4LTAuOCwwLjI4ICAgICBjLTAuMjMsMC4wOC0wLjQ2LDAuMTYtMC42OCwwLjI1Yy0wLjI1LDAuMS0wLjQ4LDAuMjItMC43MywwLjM0Yy0wLjIzLDAuMTEtMC40NywwLjIxLTAuNywwLjMzYy0wLjIzLDAuMTItMC40NSwwLjI2LTAuNjcsMC40ICAgICBjLTAuMjIsMC4xMy0wLjQ1LDAuMjYtMC42NywwLjQxYy0wLjI1LDAuMTYtMC40OCwwLjM1LTAuNzEsMC41MmMtMC4xOCwwLjE0LTAuMzcsMC4yNi0wLjU1LDAuNDFjLTAuNDEsMC4zNC0wLjgsMC42OS0xLjE3LDEuMDYgICAgIGwtMjkuNDQsMjkuNDRjLTYuMjUsNi4yNS02LjI1LDE2LjM4LDAsMjIuNjNjMy4xMiwzLjEyLDcuMjIsNC42OSwxMS4zMSw0LjY5YzQuMDksMCw4LjE5LTEuNTYsMTEuMzEtNC42OWwyLjEzLTIuMTN2MzYuOTYgICAgIGgtNzYuNzVjLTguODQsMC0xNiw3LjE2LTE2LDE2czcuMTYsMTYsMTYsMTZoOTIuNzVjOC44NCwwLDE2LTcuMTYsMTYtMTZ2LTUyLjk2bDIuMTMsMi4xM2MzLjEyLDMuMTIsNy4yMiw0LjY5LDExLjMxLDQuNjkgICAgIGM0LjA5LDAsOC4xOS0xLjU2LDExLjMxLTQuNjljNi4yNS02LjI1LDYuMjUtMTYuMzgsMC0yMi42M0wzODMuNzEsMzQ5LjYxeiIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjMyLjQxLDQ1LjAyaC05Mi43NWMtOC44NCwwLTE2LDcuMTYtMTYsMTZ2NTIuOTZsLTIuMTMtMi4xM2MtNi4yNS02LjI1LTE2LjM4LTYuMjUtMjIuNjMsMCAgICAgYy02LjI1LDYuMjUtNi4yNSwxNi4zOCwwLDIyLjYzbDI5LjQzLDI5LjQzYzAuMzgsMC4zOCwwLjc3LDAuNzMsMS4xOCwxLjA3YzAuMTgsMC4xNSwwLjM2LDAuMjcsMC41NSwwLjQxICAgICBjMC4yNCwwLjE4LDAuNDcsMC4zNiwwLjcxLDAuNTJjMC4yMiwwLjE1LDAuNDYsMC4yOCwwLjY4LDAuNDJjMC4yMiwwLjEzLDAuNDMsMC4yNywwLjY2LDAuMzljMC4yNCwwLjEzLDAuNDgsMC4yMywwLjcyLDAuMzUgICAgIGMwLjIzLDAuMTEsMC40NiwwLjIzLDAuNywwLjMyYzAuMjQsMC4xLDAuNDgsMC4xOCwwLjcxLDAuMjZjMC4yNSwwLjA5LDAuNSwwLjE5LDAuNzYsMC4yN2MwLjI0LDAuMDcsMC40OCwwLjEzLDAuNzIsMC4xOSAgICAgYzAuMjYsMC4wNywwLjUzLDAuMTQsMC44LDAuMTljMC4yOCwwLjA2LDAuNTYsMC4wOSwwLjg0LDAuMTNjMC4yNCwwLjAzLDAuNDcsMC4wOCwwLjcxLDAuMWMwLjUyLDAuMDUsMS4wNSwwLjA4LDEuNTgsMC4wOCAgICAgczEuMDUtMC4wMywxLjU4LTAuMDhjMC4yNC0wLjAyLDAuNDctMC4wNywwLjcxLTAuMWMwLjI4LTAuMDQsMC41Ni0wLjA3LDAuODQtMC4xM2MwLjI3LTAuMDUsMC41My0wLjEzLDAuNzktMC4xOSAgICAgYzAuMjQtMC4wNiwwLjQ4LTAuMTEsMC43Mi0wLjE5YzAuMjYtMC4wOCwwLjUxLTAuMTgsMC43Ni0wLjI3YzAuMjQtMC4wOSwwLjQ4LTAuMTYsMC43MS0wLjI2YzAuMjQtMC4xLDAuNDctMC4yMSwwLjctMC4zMiAgICAgYzAuMjQtMC4xMSwwLjQ4LTAuMjIsMC43Mi0wLjM1YzAuMjItMC4xMiwwLjQ0LTAuMjYsMC42Ni0wLjM5YzAuMjMtMC4xNCwwLjQ2LTAuMjcsMC42OS0wLjQyYzAuMjQtMC4xNiwwLjQ3LTAuMzUsMC43MS0wLjUyICAgICBjMC4xOC0wLjE0LDAuMzctMC4yNiwwLjU1LTAuNDFjMC40MS0wLjM0LDAuODEtMC42OSwxLjE4LTEuMDdsMjkuNDMtMjkuNDNjNi4yNS02LjI1LDYuMjUtMTYuMzgsMC0yMi42MyAgICAgYy02LjI1LTYuMjUtMTYuMzgtNi4yNS0yMi42MywwbC0yLjEzLDIuMTNWNzcuMDJoNzYuNzVjOC44NCwwLDE2LTcuMTYsMTYtMTZTMjQxLjI0LDQ1LjAyLDIzMi40MSw0NS4wMnoiLz4KDTwvZz4KDTwvZz4KDTwvZz4KDTwvc3ZnPg==" alt="" aria-hidden="true"></button></div><div class="student-heading"><span>ESTA EXPERIENCIA ES DE</span><strong>${escape(student.name)}</strong></div><div class="hero"><h1>${escape(config.title)}</h1><p>${escape(config.introduction)}</p></div></header>
      ${letter ? `${internalEnvelope(student.name)}<section id="letter" class="parchment-frame" tabindex="-1" hidden><div class="parchment-curl top"></div><article class="parchment"><div class="letter-heading"><div><span class="letter-eyebrow">PARA TI, CON CARIÑO</span><span class="letter-stamp">Una carta de Rigo</span></div><div class="letter-postmark" aria-hidden="true"><span>ENTREGA ESPECIAL</span><strong>R</strong><small>HECHA PARA TI</small></div></div><div class="letter-rule" aria-hidden="true">${icon('<path d="m12 4 5 8-5 8-5-8Z"/><path d="M3 12h4m10 0h4"/>')}</div><h2>${escape(letter.greeting)}</h2><div class="letter-body">${letter.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</div><div class="letter-closing"><p class="letter-signature">${escape(letter.signature)}</p><div class="letter-seal" aria-hidden="true"><span>R</span></div></div></article><div class="parchment-curl bottom"></div></section>` : ''}
      <section id="survey" class="survey-shell" ${letter ? 'hidden' : ''}><div class="section-label">TU EXPERIENCIA, EN TUS PALABRAS</div><h2>Ahora Rigo <em>te escucha.</em></h2><p class="survey-intro">Todas las opiniones son válidas. Completa las preguntas obligatorias ${classroomActive ? 'para registrar tu participación.' : 'y descarga tu carta y encuesta en PDF.'}</p><div class="survey-progress"><div><span>Tu recorrido</span><span id="completion" role="status" aria-live="polite"></span></div><progress id="feedback-progress" aria-label="Preguntas obligatorias completas" max="1" value="0"></progress></div><form id="feedback-form" class="feedback-form">
      ${questions.map(questionMarkup).join('')}
      <section class="submission-box"><div class="submission-symbol">${downloadIcon}</div><h3>Gracias por compartir tu experiencia</h3><p>${deliveryInstructions}</p><div><button type="button" class="primary-btn download-btn" id="coeduca-pdf-btn">${downloadIcon} Descargar PDF</button></div><p id="pdf-status" class="download-message" role="status"></p>${config.preview || reviewAccount ? '<p>Vista previa: no se guardan respuestas ni se envían a Classroom.</p>' : ''}</section></form></section><footer class="site-footer">UN CIERRE DE AÑO PARA RECORDAR · CON CARIÑO, RIGO</footer>`;
    const switchButton = document.getElementById('switch-student');
    if (reviewAccount) {
      switchButton.title = 'Seleccionar otro estudiante';
      switchButton.setAttribute('aria-label', switchButton.title);
    }
    switchButton.addEventListener('click', () => reviewAccount ? teacherPreview() : loginView());
    if (letter) document.getElementById('open-letter').addEventListener('click', () => {
      const stage = document.getElementById('envelope-stage');
      const button = document.getElementById('open-letter');
      const reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      stage.classList.add('is-open');
      button.disabled = true;
      button.setAttribute('aria-expanded', 'true');
      document.getElementById('envelope-hint').textContent = 'Abriendo tu carta…';
      global.setTimeout(() => {
        if (!stage.isConnected) return;
        document.body.classList.add('opened-letter');
        const letterView = document.getElementById('letter');
        letterView.hidden = false;
        document.getElementById('survey').hidden = false;
        document.getElementById('envelope-hint').textContent = 'Entregada con cariño. Tu carta te espera abajo.';
        celebrate();
        letterView.focus({preventScroll:true});
        letterView.scrollIntoView({behavior: reducedMotion ? 'instant' : 'smooth', block:'start'});
      }, reducedMotion ? 0 : 850);
    });
    const form = document.getElementById('feedback-form');
    let draft = {};
    if (!config.preview && !reviewAccount && !fixed(student.nie)) {
      try { const saved = JSON.parse(localStorage.getItem(draftKey()) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) draft = saved; } catch (_) {}
    }
    questions.forEach((q, i) => {
      const value = draft['ex_' + i];
      if (data(q).type === 'choice') {
        if (Number.isInteger(value)) { const radio = form.querySelector(`input[name="ex_${i}"][value="${value}"]`); if (radio) radio.checked = true; }
      } else if (typeof value === 'string') form.elements.namedItem('ex_' + i).value = value.slice(0, 2000);
    });
    function refresh() {
      const values = new FormData(form), saved = {};
      questions.forEach((q, i) => {
        const key = 'ex_' + i, raw = values.get(key);
        const value = data(q).type === 'choice' ? (raw == null ? null : Number(raw)) : String(raw || '').trim();
        saved[key] = value;
        state.answers[key] = {userAnswer:value};
      });
      if (!config.preview && !reviewAccount && !fixed(student.nie)) { try { localStorage.setItem(draftKey(), JSON.stringify(saved)); } catch (_) {} }
      const required = questions.filter(q => data(q).required).length;
      const completed = questions.filter((q, i) => data(q).required && answered(q, state.answers['ex_' + i].userAnswer)).length;
      document.getElementById('completion').textContent = `${completed} de ${required} preguntas obligatorias completas`;
      const progress = document.getElementById('feedback-progress');
      progress.max = Math.max(1, required);
      progress.value = required ? completed : 1;
    }
    form.addEventListener('input', refresh); form.addEventListener('change', refresh);
    form.addEventListener('submit', event => event.preventDefault());
    function validate() {
      refresh();
      if (questions.some((q, i) => data(q).required && !answered(q, state.answers['ex_' + i].userAnswer))) {
        form.reportValidity(); throw new Error('Completa las preguntas obligatorias. Cualquier opinión es válida.');
      }
    }
    document.getElementById('coeduca-pdf-btn').addEventListener('click', () => {
      const status = document.getElementById('pdf-status');
      try {
        validate(); downloadPDF(); celebrate();
        status.textContent = classroomActive ? 'PDF generado. Adjunta el archivo y pulsa Entregar en Classroom.' : 'PDF generado. Guárdalo o compártelo con tu docente.';
      }
      catch (error) { status.textContent = error.message; }
    });
    refresh();
    if (classroomActive) transport.mount(state, validate);
  }
  function answered(question, value) {
    return data(question).type === 'choice' ? Number.isInteger(value) && value >= 0 && value < data(question).options.length : typeof value === 'string' && value.trim().length > 0;
  }
  function downloadPDF() {
    const PDF = global.jspdf?.jsPDF;
    if (!PDF) throw new Error('No se pudo cargar el generador PDF. Recarga la página.');
    const doc = new PDF({unit:'mm', format:'a4'});
    let y = 25;
    const clean = text => String(text || '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, '-').replace(/[^\n\r\u0020-\u007e\u00a0-\u00ff]/g, '');
    function write(text, bold = false) {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 11);
      const lines = doc.splitTextToSize(clean(text), 166);
      for (const line of lines) { if (y > 273) { doc.addPage(); y = 25; } doc.text(line, 22, y); y += 6; }
      y += 5;
    }
    write(config.title, true); write(`${student.name} · NIE ${student.nie}`); write('Feedback: todas las opiniones son válidas.');
    if (letter) { write(letter.greeting, true); letter.paragraphs.forEach(p => write(p)); write(letter.signature); doc.addPage(); y = 25; write('Mi opinión', true); }
    questions.forEach((q, i) => {
      const value = state.answers['ex_' + i].userAnswer;
      write(`${i + 1}. ${q.title}`, true);
      write(data(q).type === 'choice' ? data(q).options[value] || 'Sin respuesta (opcional)' : value || 'Sin respuesta (opcional)');
    });
    write(connected && !reviewAccount
      ? 'Adjunta este PDF a la tarea y pulsa Entregar en Google Classroom. El envío de participación y la entrega del archivo son pasos independientes.'
      : 'Guarda este PDF con tu carta y tus respuestas. Puedes compartirlo con tu docente.');
    doc.save('Feedback_' + student.nie.replace(/[^0-9]/g, '') + '.pdf');
  }
  loginView();
})(window);
