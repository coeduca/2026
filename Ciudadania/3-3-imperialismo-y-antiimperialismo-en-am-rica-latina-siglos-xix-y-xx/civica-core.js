/**
 * CIVICA Framework v1 - Core
 * Profesor José Eliseo Martínez - Ciudadanía y Valores
 *
 * Adaptación del framework COEDUCA para la materia de Ciudadanía y Valores.
 * Diferencias clave respecto a COEDUCA:
 *   - Solo Octavo grado (level: 'Octavo')
 *   - Ejercicios agrupados en 3 secciones: Exploración, Profundización, Consolidación
 *   - Soporte para "Abrir libro" por ejercicio (bookUrl + bookPage)
 *   - Diseño Colorful Notion Style
 *   - Nuevos tipos: cv_textanswer, cv_table
 *
 * Uso:
 *   CIVICA.init({
 *     id: 'tema_lec_1',
 *     container: '#app',
 *     topic: 'La dignidad humana',
 *     unit: 'Unidad 1: Persona y Sociedad',
 *     book: { url: 'https://drive.google.com/...', label: 'Libro Octavo' },
 *     colors: { primary: '#4F46E5', accent: '#F59E0B', bg: '#FAFAF7' },
 *     sections: {
 *       explore:     [ {type:'multiplechoice', ...}, ... ],
 *       deepen:      [ ... ],
 *       consolidate: [ ... ]
 *     },
 *     game: { type: 'trivia', questions: [...] }   // opcional
 *   });
 *
 * Compatibilidad: también acepta `exercises: [...]` plano (sin secciones),
 * en cuyo caso todo cae dentro de "Exploración".
 */
(function (global) {
  'use strict';

  const STORAGE_KEY_PREFIX = 'civica_';
  const VERSION = '1.0.0';

  // =====================================================================
  // FILTRO DE NIVEL: solo Octavo (excepto NIE de prueba)
  // =====================================================================
  const ALLOWED_GRADES = ['Octavo'];
  const TEST_NIE = '1999'; // José Eliseo - siempre permitido

  // =====================================================================
  // METADATA DE SECCIONES
  // =====================================================================
  const SECTIONS = [
    { key: 'explore',     eyebrow: 'Etapa 1', title: 'Exploración',     icon: '🧭' },
    { key: 'deepen',      eyebrow: 'Etapa 2', title: 'Profundización',  icon: '📖' },
    { key: 'consolidate', eyebrow: 'Etapa 3', title: 'Consolidación',   icon: '🎯' }
  ];

  // =====================================================================
  // STATE GLOBAL
  // =====================================================================
  const state = {
    config: null,
    student: null,
    partner: null,
    partners: [],
    poolVersion: null,    // 'A' | 'B' | 'C' | 'D'
    answers: {},
    extraPoints: 0,
    gameResult: null,
    storageKey: '',
    appRoot: null,
    exerciseRegistry: {},
    gameRegistry: {},
    flatExercises: [],    // ejercicios planos con metadata { ex, sectionKey, idx }
  };

  // =====================================================================
  // SFX (efectos de sonido) - solo activos en modo actividad, no en examen.
  // Los archivos victory.ogg / error.ogg se incluyen junto al index.html.
  // =====================================================================
  const sfx = {
    _ready: false,
    victory: null,
    error: null,
    _prep: function () {
      if (this._ready) return;
      this._ready = true;
      try {
        this.victory = new Audio('victory.ogg');
        this.error   = new Audio('error.ogg');
        this.victory.preload = 'auto';
        this.error.preload   = 'auto';
        this.victory.volume = 0.6;
        this.error.volume   = 0.5;
      } catch (e) { /* silencioso */ }
    },
    play: function (kind) {
      // Examen → no reproducir.
      if (state.config && state.config.examMode) return;
      this._prep();
      const a = this[kind];
      if (!a) return;
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (e) { /* silencioso */ }
    }
  };

  // =====================================================================
  // SANITIZER PARA PDF (Latin-1 only)
  // =====================================================================
  function sanitizeForPDF(text) {
    if (text === null || text === undefined) return '';
    let s = String(text);
    s = s.replace(/<br\s*\/?>/gi, '\n')
         .replace(/<\/p>/gi, '\n')
         .replace(/<[^>]*>/g, '');
    s = s.replace(/&nbsp;/g, ' ')
         .replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'");
    const replacements = {
      '\u2192': '->', '\u2190': '<-', '\u2191': '^', '\u2193': 'v',
      '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'",
      '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',
      '\u2013': '-',  '\u2014': '-', '\u2015': '-',
      '\u2026': '...',
      '\u00A0': ' ', '\u2009': ' ', '\u200A': ' ', '\u200B': '',
      '\u2022': '*', '\u00B7': '*',
      '\u2713': 'OK', '\u2714': 'OK', '\u2717': 'X', '\u2718': 'X',
      '\u00BF': '?', '\u00A1': '!'
    };
    s = s.replace(/[\u2013\u2014\u2015\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2022\u00B7\u2026\u00A0\u2009\u200A\u200B\u2190\u2191\u2192\u2193\u2713\u2714\u2717\u2718\u00BF\u00A1]/g,
      ch => replacements[ch] || '');
    s = s.split('').filter(ch => ch.charCodeAt(0) <= 255).join('');
    return s.trim();
  }

  // =====================================================================
  // ANTI-COPY
  // =====================================================================
  function setupAntiCopy() {
    const block = e => { e.preventDefault(); return false; };
    ['contextmenu', 'copy', 'cut', 'paste', 'selectstart', 'dragstart']
      .forEach(evt => document.addEventListener(evt, block, { passive: false }));
    document.addEventListener('copy', e => {
      const t = e.target;
      if (t && t.classList && t.classList.contains('civica-input-allow-copy')) return;
      e.preventDefault();
    }, true);
  }

  function ensureNoTranslate() {
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.lang = 'es';
    if (!document.querySelector('meta[name="google"]')) {
      const m = document.createElement('meta');
      m.name = 'google'; m.content = 'notranslate';
      document.head.appendChild(m);
    }
    if (!document.querySelector('meta[http-equiv="Content-Language"]')) {
      const m = document.createElement('meta');
      m.setAttribute('http-equiv', 'Content-Language'); m.content = 'es';
      document.head.appendChild(m);
    }
  }

  function setupBfCacheGuard() {
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) location.reload();
    });
  }

  // =====================================================================
  // POOL A/B/C/D SELECTOR (persistente)
  // =====================================================================
  function pickPoolVersion() {
    const key = state.storageKey + 'pool';
    let v = null;
    try { v = localStorage.getItem(key); } catch (e) {}

    const cfg = state.config;
    const allowedPools = cfg && cfg.examMode ? ['A', 'B', 'C', 'D'] : ['A', 'B'];

    if (cfg && cfg.examPools && state.student) {
      const fixed = cfg.examPools[state.student.nie];
      if (fixed && allowedPools.includes(fixed)) {
        v = fixed;
        try { localStorage.setItem(key, v); } catch (e) {}
        state.poolVersion = v;
        return v;
      }
    }

    if (!allowedPools.includes(v)) {
      v = allowedPools[Math.floor(Math.random() * allowedPools.length)];
      try { localStorage.setItem(key, v); } catch (e) {}
    }
    state.poolVersion = v;
    return v;
  }

  function getPoolData(exercise) {
    const target = exercise['data' + state.poolVersion];
    if (target) return target;
    return exercise.data || exercise.dataA || exercise.dataB;
  }

  // =====================================================================
  // STORAGE
  // =====================================================================
  function saveState() {
    try {
      const snapshot = {
        student: state.student,
        partner: state.partner,
        partners: state.partners,
        poolVersion: state.poolVersion,
        answers: state.answers,
        extraPoints: state.extraPoints,
        gameResult: state.gameResult
      };
      localStorage.setItem(state.storageKey + 'state', JSON.stringify(snapshot));
    } catch (e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(state.storageKey + 'state');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function recordAnswer(exerciseId, score, total, details, userAnswer) {
    const prev = state.answers[exerciseId] || {};
    state.answers[exerciseId] = {
      score, total,
      details: details || null,
      userAnswer: (userAnswer !== undefined ? userAnswer : (prev.userAnswer || null)),
      completedAt: Date.now()
    };
    saveState();
    updateScoreDisplay();
  }

  function estimatePendingTotal() {
    const answered = state.answers;
    let answeredTotalsSum = 0;
    let answeredCount = 0;
    Object.values(answered).forEach(a => {
      if (a && typeof a.total === 'number' && a.total > 0) {
        answeredTotalsSum += a.total;
        answeredCount++;
      }
    });
    const avgTotal = answeredCount > 0 ? (answeredTotalsSum / answeredCount) : 1;
    let pendingPoints = 0;
    state.flatExercises.forEach(item => {
      if (item.ex.type === 'note') return;
      const id = 'ex_' + item.idx;
      if (!answered[id]) pendingPoints += avgTotal;
    });
    return pendingPoints;
  }

  function getTotalScore() {
    let earned = 0, total = 0;
    Object.values(state.answers).forEach(a => {
      earned += a.score;
      total += a.total;
    });
    total += estimatePendingTotal();
    if (total === 0) return { earned: 0, total: 0, grade: '0.0', baseGrade: '0.0' };
    const baseGrade = (earned / total) * 10;
    return {
      earned, total,
      grade: Math.min(10, baseGrade + state.extraPoints).toFixed(1),
      baseGrade: baseGrade.toFixed(1)
    };
  }

  function updateScoreDisplay() {
    const isExam = state.config && state.config.examMode;
    const badge = document.getElementById('civica-extra-badge');
    if (badge) {
      if (isExam) {
        badge.style.display = 'none';
      } else {
        badge.textContent = '+' + state.extraPoints.toFixed(1) + ' pts extra';
        badge.style.display = state.extraPoints > 0 ? 'block' : 'none';
      }
    }
    const finalDisplay = document.getElementById('civica-final-score-display');
    if (finalDisplay) {
      const realExercises = state.flatExercises.filter(it => it.ex.type !== 'note');
      const answeredCount = Object.keys(state.answers).length;
      const totalCount = realExercises.length;
      const allDone = totalCount > 0 && answeredCount >= totalCount;

      if (isExam) {
        const progressLine = allDone
          ? 'Has completado todos los ejercicios. Descarga tu PDF.'
          : `Has completado ${answeredCount} de ${totalCount} ejercicios`;
        finalDisplay.innerHTML = `
          <h2>Tu progreso</h2>
          <span class="score-number">${answeredCount} / ${totalCount}</span>
          <p>${progressLine}</p>
          <p style="font-size:12px;opacity:0.7;">Versión ${state.poolVersion || '?'}</p>
        `;
      } else {
        const s = getTotalScore();
        const progressLine = allDone
          ? `${s.earned} de ${s.total} respuestas correctas`
          : `Has completado ${answeredCount} de ${totalCount} ejercicios`;
        finalDisplay.innerHTML = `
          <h2>Tu puntaje</h2>
          <span class="score-number">${s.grade} / 10</span>
          <p>${progressLine}
          ${state.extraPoints > 0 ? '+ ' + state.extraPoints.toFixed(1) + ' puntos extra' : ''}</p>
        `;
      }
    }
  }

  const GAME_RESULT_POINTS = { win: 1, tie: 0.5, lose: 0 };
  const GAME_RESULT_RANK   = { win: 3, tie: 2, lose: 1 };

  function setGameResult(result) {
    if (!GAME_RESULT_POINTS.hasOwnProperty(result)) return;
    const prevRank = state.gameResult ? GAME_RESULT_RANK[state.gameResult] : 0;
    const newRank  = GAME_RESULT_RANK[result];
    if (newRank >= prevRank) {
      state.gameResult = result;
      state.extraPoints = GAME_RESULT_POINTS[result];
    }
    saveState();
    updateScoreDisplay();
  }

  function addExtraPoints(pts) {
    if (pts >= 1) return setGameResult('win');
    if (pts > 0)  return setGameResult('tie');
    return setGameResult('lose');
  }

  // =====================================================================
  // VALIDACIÓN DE NIVEL (solo Octavo)
  // =====================================================================
  function isAllowedAtLevel(student) {
    if (!student) return false;
    if (student.nie === TEST_NIE) return true;
    return ALLOWED_GRADES.indexOf(student.grade) >= 0;
  }
  function getLevelLabel() { return ALLOWED_GRADES.join(' u '); }

  // =====================================================================
  // LOGIN MODAL
  // =====================================================================
  function showLoginModal() {
    return new Promise((resolve) => {
      const MAX_PARTNERS = 4;
      try { localStorage.removeItem('rigo_pos'); } catch (e) {}

      const tryWelcome = () => {
        if (global.rigo && typeof global.rigo.welcome === 'function') {
          global.rigo.welcome();
          try {
            const rigoEl = global.rigo;
            rigoEl.style.top = 'auto'; rigoEl.style.left = 'auto';
            rigoEl.style.right = '20px'; rigoEl.style.bottom = '20px';
            rigoEl.style.zIndex = '10000';
          } catch (e) {}
        } else {
          setTimeout(tryWelcome, 200);
        }
      };
      tryWelcome();

      const overlay = document.createElement('div');
      overlay.className = 'civica-login-overlay';
      overlay.innerHTML = `
        <div class="civica-login-modal">
          <div class="civica-login-header">
            <div class="civica-login-badge">CIVICA · CIUDADANÍA Y VALORES</div>
            <h2>BIENVENIDO</h2>
            <p>Ingresa tu NIE para comenzar</p>
          </div>
          <div class="civica-login-modal-scroll">
            <div class="civica-login-field" data-role="main">
              <label><span class="civica-login-icon">1</span> NIE del estudiante</label>
              <input type="text" id="civica-nie-input" class="civica-input civica-input-allow-copy"
                     inputmode="numeric" autocomplete="off" placeholder="Ej. 20176655">
              <div class="civica-login-info" id="civica-nie-info"></div>
              <div class="civica-login-error" id="civica-nie-error">NIE no encontrado</div>
            </div>
            <div id="civica-partners-list"></div>
          </div>
          <div class="civica-login-actions">
            <button class="civica-btn civica-btn-info" id="civica-add-partner-btn" type="button">
              + Compañero <span id="civica-partner-counter" style="font-size:11px;opacity:0.85;"></span>
            </button>
            <button class="civica-btn civica-btn-success" id="civica-login-submit" disabled type="button">
              Comenzar
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      if (state.config && state.config.examMode) {
        const partnerBtn = overlay.querySelector('#civica-add-partner-btn');
        if (partnerBtn) partnerBtn.style.display = 'none';
      }

      const nieInput = overlay.querySelector('#civica-nie-input');
      const nieInfo = overlay.querySelector('#civica-nie-info');
      const nieError = overlay.querySelector('#civica-nie-error');
      const partnersList = overlay.querySelector('#civica-partners-list');
      const addPartnerBtn = overlay.querySelector('#civica-add-partner-btn');
      const partnerCounter = overlay.querySelector('#civica-partner-counter');
      const submitBtn = overlay.querySelector('#civica-login-submit');

      let mainStudent = null;
      const partners = [];

      function lookupNIE(nie) {
        let DB = null;
        try { DB = global.STUDENTS; } catch (e) {}
        if (!DB) { try { DB = STUDENTS; } catch (e) {} }
        if (!DB) return null;
        const clean = String(nie || '').trim();
        return clean && DB[clean] ? { nie: clean, ...DB[clean] } : null;
      }

      function updateCounter() {
        partnerCounter.textContent = partners.length === 0
          ? '' : '(' + partners.length + '/' + MAX_PARTNERS + ')';
        addPartnerBtn.disabled = partners.length >= MAX_PARTNERS;
        addPartnerBtn.style.opacity = partners.length >= MAX_PARTNERS ? '0.5' : '1';
      }

      function validateMain() {
        const found = lookupNIE(nieInput.value);
        if (found) {
          if (!isAllowedAtLevel(found)) {
            mainStudent = null;
            nieInfo.classList.remove('show');
            nieError.textContent = 'Esta actividad es solo para ' + getLevelLabel();
            nieError.classList.add('show');
            submitBtn.disabled = true;
            return;
          }
          mainStudent = found;
          nieInfo.innerHTML = '<b>' + escapeHTML(found.name) + '</b><br><small>' + escapeHTML(found.grade) + '</small>';
          nieInfo.classList.add('show');
          nieError.classList.remove('show');
          if (global.rigo && global.rigo.setGrade) global.rigo.setGrade(found.grade);
          submitBtn.disabled = false;
        } else {
          mainStudent = null;
          nieInfo.classList.remove('show');
          if (nieInput.value.trim().length >= 4) {
            nieError.textContent = 'NIE no encontrado';
            nieError.classList.add('show');
          } else {
            nieError.classList.remove('show');
          }
          submitBtn.disabled = true;
        }
      }

      function addPartnerField() {
        if (partners.length >= MAX_PARTNERS) return;
        const slot = { student: null };
        const num = partners.length + 2;
        const field = document.createElement('div');
        field.className = 'civica-login-field civica-login-field-partner';
        field.innerHTML = `
          <label>
            <span class="civica-login-icon">${num}</span>
            NIE del compañero ${num - 1}
            <button type="button" class="civica-login-remove" title="Quitar">×</button>
          </label>
          <input type="text" class="civica-input civica-input-allow-copy"
                 inputmode="numeric" autocomplete="off" placeholder="NIE del compañero">
          <div class="civica-login-info"></div>
          <div class="civica-login-error">NIE no encontrado</div>
        `;
        partnersList.appendChild(field);

        const inp = field.querySelector('input');
        const info = field.querySelector('.civica-login-info');
        const err = field.querySelector('.civica-login-error');
        const removeBtn = field.querySelector('.civica-login-remove');
        slot.fieldEl = field;
        slot.inputEl = inp;

        const validate = () => {
          const v = inp.value.trim();
          if (!v) { slot.student = null; info.classList.remove('show'); err.classList.remove('show'); return; }
          if (mainStudent && mainStudent.nie === v) {
            slot.student = null; info.classList.remove('show');
            err.textContent = 'Ya está como estudiante principal'; err.classList.add('show'); return;
          }
          if (partners.some(p => p !== slot && p.student && p.student.nie === v)) {
            slot.student = null; info.classList.remove('show');
            err.textContent = 'NIE ya agregado'; err.classList.add('show'); return;
          }
          const found = lookupNIE(v);
          if (found) {
            if (!isAllowedAtLevel(found)) {
              slot.student = null; info.classList.remove('show');
              err.textContent = 'Esta actividad es solo para ' + getLevelLabel();
              err.classList.add('show'); return;
            }
            slot.student = found;
            info.innerHTML = '<b>' + escapeHTML(found.name) + '</b><br><small>' + escapeHTML(found.grade) + '</small>';
            info.classList.add('show'); err.classList.remove('show');
          } else {
            slot.student = null; info.classList.remove('show');
            if (v.length >= 4) { err.textContent = 'NIE no encontrado'; err.classList.add('show'); }
            else err.classList.remove('show');
          }
        };
        inp.addEventListener('input', validate);
        removeBtn.addEventListener('click', () => {
          const idx = partners.indexOf(slot);
          if (idx >= 0) partners.splice(idx, 1);
          field.style.transition = 'opacity 0.2s';
          field.style.opacity = '0';
          setTimeout(() => { field.remove(); renumberPartners(); updateCounter(); }, 200);
        });
        partners.push(slot);
        updateCounter();
        setTimeout(() => inp.focus(), 50);
      }

      function renumberPartners() {
        partners.forEach((p, i) => {
          const num = i + 2;
          const label = p.fieldEl.querySelector('label');
          label.innerHTML = `
            <span class="civica-login-icon">${num}</span>
            NIE del compañero ${num - 1}
            <button type="button" class="civica-login-remove" title="Quitar">×</button>
          `;
          label.querySelector('.civica-login-remove').addEventListener('click', () => {
            const idx = partners.indexOf(p);
            if (idx >= 0) partners.splice(idx, 1);
            p.fieldEl.style.transition = 'opacity 0.2s';
            p.fieldEl.style.opacity = '0';
            setTimeout(() => { p.fieldEl.remove(); renumberPartners(); updateCounter(); }, 200);
          });
        });
      }

      nieInput.addEventListener('input', validateMain);
      addPartnerBtn.addEventListener('click', addPartnerField);

      const finish = () => {
        if (!mainStudent) return;
        const prev = loadState();
        if (prev && prev.student && prev.student.nie !== mainStudent.nie) {
          state.answers = {}; state.extraPoints = 0; state.gameResult = null;
        }
        state.student = mainStudent;
        state.partners = partners.filter(p => p.student).map(p => p.student);
        state.partner = state.partners[0] || null;
        saveState();
        if (global.rigo && global.rigo.loginSuccess) global.rigo.loginSuccess(mainStudent.name);
        try {
          const rigoEl = global.rigo;
          if (rigoEl) {
            rigoEl.style.top = 'auto'; rigoEl.style.left = 'auto';
            rigoEl.style.right = '20px'; rigoEl.style.bottom = '20px';
            rigoEl.style.zIndex = '9999';
          }
        } catch (e) {}
        overlay.style.transition = 'opacity 0.3s';
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.remove(); resolve(); }, 300);
      };

      submitBtn.addEventListener('click', finish);
      nieInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !submitBtn.disabled) finish();
      });

      const prev = loadState();
      if (prev && prev.student) {
        nieInput.value = prev.student.nie;
        validateMain();
        const prevPartners = prev.partners || (prev.partner ? [prev.partner] : []);
        prevPartners.forEach(p => {
          addPartnerField();
          const last = partners[partners.length - 1];
          if (last) {
            last.inputEl.value = p.nie;
            last.inputEl.dispatchEvent(new Event('input'));
          }
        });
      }
      updateCounter();
      setTimeout(() => nieInput.focus(), 400);
    });
  }

  // =====================================================================
  // RENDER LAYOUT
  // =====================================================================
  function applyTheme(colors) {
    if (!colors) return;
    const root = document.documentElement;
    if (colors.primary) root.style.setProperty('--civica-primary', colors.primary);
    if (colors.accent)  root.style.setProperty('--civica-accent', colors.accent);
    if (colors.bg)      root.style.setProperty('--civica-bg', colors.bg);
    if (colors.explore) root.style.setProperty('--civica-explore', colors.explore);
    if (colors.deepen)  root.style.setProperty('--civica-deepen', colors.deepen);
    if (colors.consolidate) root.style.setProperty('--civica-consolidate', colors.consolidate);
  }

  // Construye la lista plana de ejercicios desde sections o exercises
  function buildFlatExercises() {
    const cfg = state.config;
    const out = [];
    let idx = 0;
    if (cfg.sections && typeof cfg.sections === 'object') {
      SECTIONS.forEach(secMeta => {
        const list = cfg.sections[secMeta.key] || [];
        list.forEach(ex => {
          out.push({ ex, sectionKey: secMeta.key, idx });
          idx++;
        });
      });
    } else if (Array.isArray(cfg.exercises)) {
      cfg.exercises.forEach(ex => {
        out.push({ ex, sectionKey: 'explore', idx });
        idx++;
      });
    }
    state.flatExercises = out;
  }

  function renderLayout() {
    const cfg = state.config;
    const containerSel = cfg.container || '#app';
    let appRoot = document.querySelector(containerSel);
    if (!appRoot) {
      appRoot = document.createElement('div'); appRoot.id = 'app';
      document.body.appendChild(appRoot);
    }
    appRoot.className = 'civica-app';
    const subjectLabel = cfg.subjectLabel || 'Ciudadanía y Valores';
    appRoot.innerHTML = `
      <div class="civica-extra-badge" id="civica-extra-badge" style="display:none">+0 pts extra</div>
      <header class="civica-header">
        <div class="civica-subject-pill">${escapeHTML(subjectLabel)}</div>
        <h1>${escapeHTML(cfg.topic || 'Sesión de Ciudadanía y Valores')}</h1>
        <p>${escapeHTML(cfg.unit || 'Octavo Grado')} · CIVICA · Prof. José Eliseo Martínez</p>
        <div class="civica-header-students" id="civica-header-students"></div>
        <button class="civica-btn civica-btn-info civica-add-member-btn" id="civica-add-member-btn" type="button">
          + Agregar miembro
        </button>
      </header>
      <div id="civica-sections"></div>
      <div id="civica-game-section"></div>
      <div class="civica-final-score" id="civica-final-score-display">
        <h2>Tu puntaje</h2>
        <span class="score-number">- / 10</span>
        <p>Completa los ejercicios</p>
      </div>
      <div class="civica-center">
        <button class="civica-btn civica-btn-accent" id="civica-pdf-btn">
          Descargar PDF para Classroom
        </button>
      </div>
    `;
    state.appRoot = appRoot;
    renderHeaderStudents();

    if (cfg.examMode) {
      const addMemberBtn = document.getElementById('civica-add-member-btn');
      if (addMemberBtn) addMemberBtn.style.display = 'none';
    }

    document.getElementById('civica-add-member-btn').addEventListener('click', showAddMemberModal);
    document.getElementById('civica-pdf-btn').addEventListener('click', generatePDF);

    // Render por secciones
    const sectionsRoot = document.getElementById('civica-sections');
    const grouped = {};
    state.flatExercises.forEach(it => {
      grouped[it.sectionKey] = grouped[it.sectionKey] || [];
      grouped[it.sectionKey].push(it);
    });

    SECTIONS.forEach(secMeta => {
      const list = grouped[secMeta.key];
      if (!list || !list.length) return;

      const secEl = document.createElement('section');
      secEl.className = 'civica-section civica-section--' + secMeta.key;
      secEl.innerHTML = `
        <div class="civica-section-header">
          <div class="civica-section-icon">${secMeta.icon}</div>
          <div class="civica-section-titles">
            <div class="civica-section-eyebrow">${secMeta.eyebrow}</div>
            <div class="civica-section-title">${secMeta.title}</div>
          </div>
        </div>
      `;
	  
	  sectionsRoot.appendChild(secEl);

      let exNumberInSection = 0;
      list.forEach(item => {
        const ex = item.ex;
        if (ex.type === 'note') {
          const note = document.createElement('div');
          note.className = 'civica-note';
          note.innerHTML = ex.html || '';
          secEl.appendChild(note);
          return;
        }
        exNumberInSection++;
        const wrap = document.createElement('div');
        wrap.className = 'civica-exercise';
        wrap.id = 'civica-ex-' + item.idx;

        const title = ex.title || ('Ejercicio ' + exNumberInSection);
        let inner = `
          <div class="civica-exercise-title">
            <span class="civica-exercise-number">${exNumberInSection}</span>
            ${escapeHTML(title)}
          </div>
        `;

        const bookHtml = renderBookBar(ex);
        if (ex.instruction || bookHtml) {
          inner += `<div class="civica-exercise-meta-card">`;
          
          if (ex.instruction) {
            inner += `<div class="civica-exercise-instruction">${escapeHTML(ex.instruction)}</div>`;
          }
          
          if (ex.instruction && bookHtml) {
            inner += `<div class="civica-meta-divider"></div>`;
          }
          
          if (bookHtml) {
            inner += bookHtml;
          }
          
          inner += `</div>`;
        }

        if (ex['image' + state.poolVersion] || ex.image) {
          inner += `<img src="${escapeAttr(ex['image' + state.poolVersion] || ex.image)}" alt="" class="civica-exercise-image">`;
        }
        const audioSrc = ex['audio' + state.poolVersion] || ex.audio;
        if (audioSrc) inner += renderAudioPlayer(audioSrc, item.idx);

        inner += `<div class="civica-exercise-body" id="civica-ex-body-${item.idx}"></div>`;
        wrap.innerHTML = inner;
        secEl.appendChild(wrap);

        const exerciseId = 'ex_' + item.idx;
        const previousAnswer = state.answers[exerciseId];
        if (previousAnswer && previousAnswer.total > 0) {
          renderCompletedSummary(item.idx, ex, previousAnswer);
        } else {
          mountExercise(item.idx, ex);
        }
      });

    });

    if (cfg.game) renderGame(cfg.game);
  }

  // =====================================================================
  // BOOK BAR (botón "Abrir libro")
  // =====================================================================
  function renderBookBar(ex) {
    const cfg = state.config;
    // Resolver URL del libro: ejercicio > config global
    const exUrl = ex.bookUrl || (ex.book && ex.book.url) || null;
    const cfgUrl = cfg.book && cfg.book.url ? cfg.book.url : null;
    const url = exUrl || cfgUrl;
    const page = ex.bookPage != null ? ex.bookPage : (ex.book && ex.book.page);

    // Si no hay URL, no mostramos nada
    if (!url) return '';

    const label = ex.bookLabel || (ex.book && ex.book.label) || (cfg.book && cfg.book.label) || 'Libro';

    let textHtml;
    if (page != null && page !== '') {
      textHtml = `<b>Este ejercicio</b> se encuentra en la página <b>${escapeHTML(String(page))}</b> del ${escapeHTML(label)}.`;
    } else {
      textHtml = `Consulta el ${escapeHTML(label)} para apoyarte en este ejercicio.`;
    }

    return `
      <div class="civica-book-bar">
        <span class="civica-book-bar-icon">📖</span>
        <span class="civica-book-bar-text">${textHtml}</span>
        <a class="civica-book-bar-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">
          Abrir libro
        </a>
      </div>
    `;
  }

  function mountExercise(idx, ex) {
    const body = document.getElementById('civica-ex-body-' + idx);
    if (!body) return;
    body.innerHTML = '';
    const renderer = state.exerciseRegistry[ex.type];
    if (!renderer) {
      body.innerHTML = '<p style="color:red">Tipo de ejercicio desconocido: ' + escapeHTML(ex.type) + '</p>';
      return;
    }
    try {
      renderer({
        container: body,
        exerciseId: 'ex_' + idx,
        data: getPoolData(ex),
        config: ex,
        examMode: !!(state.config && state.config.examMode),
        recordAnswer: (score, total, details, userAnswer) =>
          recordAnswer('ex_' + idx, score, total, details, userAnswer),
        cheer: () => {
          if (global.rigo && global.rigo.cheer) global.rigo.cheer();
          sfx.play('victory');
        },
        comfort: () => {
          if (global.rigo && global.rigo.comfort) global.rigo.comfort();
          sfx.play('error');
        }
      });
    } catch (err) {
      console.error('Error rendering exercise', ex.type, err);
      body.innerHTML = '<p style="color:red">Error: tipo "' + ex.type + '" no disponible</p>';
    }
  }

  function renderCompletedSummary(idx, ex, ans) {
    const body = document.getElementById('civica-ex-body-' + idx);
    if (!body) return;
    const isExam = state.config && state.config.examMode;

    if (isExam) {
      body.innerHTML = `
        <div style="
          padding:16px;
          background:var(--civica-consolidate-soft);
          border:2px dashed var(--civica-consolidate);
          border-radius:var(--civica-radius);
          text-align:center;
        ">
          <div style="
            display:inline-block;
            background:var(--civica-consolidate);
            color:#1F1F1F;
            border-radius:50px;
            padding:5px 16px;
            font-weight:700;
            font-size:12px;
            letter-spacing:1px;
            text-transform:uppercase;
            margin-bottom:8px;
          ">
            YA COMPLETADO
          </div>
          <div style="font-size:14px; font-weight:600; color:var(--civica-text);">
            Tu respuesta ha sido registrada.
          </div>
        </div>
      `;
      return;
    }

    const pct = ans.total > 0 ? Math.round((ans.score / ans.total) * 100) : 0;
    const isPerfect = ans.score === ans.total;
    const accentBg = isPerfect ? 'var(--civica-success)' : 'var(--civica-primary)';

    body.innerHTML = `
      <div style="
        padding:18px;
        background:var(--civica-surface-2);
        border:1px solid var(--civica-divider);
        border-radius:var(--civica-radius);
        text-align:center;
      ">
        <div style="
          display:inline-block;
          background:${accentBg};
          color:#fff;
          border-radius:50px;
          padding:5px 16px;
          font-weight:700;
          font-size:12px;
          letter-spacing:1px;
          text-transform:uppercase;
          margin-bottom:10px;
        ">
          ${isPerfect ? 'COMPLETADO PERFECTO' : 'YA COMPLETADO'}
        </div>
        <div style="font-size:30px; font-weight:800; color:var(--civica-text); margin:6px 0;">
          ${ans.score} / ${ans.total}
        </div>
        <div style="font-size:13px; font-weight:600; color:var(--civica-text-soft); margin-bottom:14px;">
          ${pct}% de aciertos
        </div>
        <button type="button" class="civica-btn civica-btn-info" data-retry-idx="${idx}" style="margin-top:6px;">
          Volver a intentar
        </button>
      </div>
    `;

    const retryBtn = body.querySelector('[data-retry-idx]');
    if (retryBtn) retryBtn.addEventListener('click', () => retryExercise(idx));
  }

  function retryExercise(idx) {
    const exId = 'ex_' + idx;
    delete state.answers[exId];
    saveState();
    updateScoreDisplay();
    const item = state.flatExercises.find(it => it.idx === idx);
    if (item) mountExercise(idx, item.ex);
  }

  function renderHeaderStudents() {
    const el = document.getElementById('civica-header-students');
    if (!el) return;
    const stu = state.student;
    const partners = state.partners || [];
    if (!stu) { el.textContent = ''; return; }

    const names = [stu.name].concat(partners.map(p => p.name));
    const uniqueGrades = [...new Set([stu.grade].concat(partners.map(p => p.grade)))];
    const gradesHtml = uniqueGrades.map(g =>
      `<span class="civica-header-student-pill">${escapeHTML(g)}</span>`
    ).join(' ');

    el.innerHTML = `
      <div style="margin-bottom: 6px;">
        <span class="civica-header-students-label">Grado:</span> ${gradesHtml}
      </div>
      <div>
        <span class="civica-header-students-label">Trabajo de:</span>
        ${names.map(n => '<span class="civica-header-student-pill">' + escapeHTML(n) + '</span>').join(' ')}
      </div>
    `;
    const addBtn = document.getElementById('civica-add-member-btn');
    if (addBtn) {
      const atMax = partners.length >= 4;
      addBtn.disabled = atMax;
      addBtn.style.opacity = atMax ? '0.5' : '1';
      addBtn.style.cursor = atMax ? 'not-allowed' : 'pointer';
      addBtn.textContent = atMax
        ? 'Equipo lleno (4/4)'
        : '+ Agregar miembro' + (partners.length > 0 ? ' (' + partners.length + '/4)' : '');
    }
  }

  function showAddMemberModal() {
    if ((state.partners || []).length >= 4) return;

    const overlay = document.createElement('div');
    overlay.className = 'civica-login-overlay';
    overlay.innerHTML = `
      <div class="civica-login-modal" style="max-width: 400px;">
        <div class="civica-login-header">
          <div class="civica-login-badge">CIVICA</div>
          <h2 style="font-size: 22px;">+ MIEMBRO</h2>
          <p>Ingresa el NIE del compañero que llegó tarde</p>
        </div>
        <div class="civica-login-modal-scroll" style="padding: 18px 24px 8px;">
          <div class="civica-login-field">
            <label><span class="civica-login-icon">+</span> NIE del compañero</label>
            <input type="text" id="civica-add-member-nie" class="civica-input civica-input-allow-copy"
                   inputmode="numeric" autocomplete="off" placeholder="Ej. 20176655">
            <div class="civica-login-info" id="civica-add-member-info"></div>
            <div class="civica-login-error" id="civica-add-member-error">NIE no encontrado</div>
          </div>
        </div>
        <div class="civica-login-actions">
          <button class="civica-btn" id="civica-add-member-cancel" type="button">Cancelar</button>
          <button class="civica-btn civica-btn-success" id="civica-add-member-ok" disabled type="button">Agregar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const inp = overlay.querySelector('#civica-add-member-nie');
    const info = overlay.querySelector('#civica-add-member-info');
    const err = overlay.querySelector('#civica-add-member-error');
    const okBtn = overlay.querySelector('#civica-add-member-ok');
    const cancelBtn = overlay.querySelector('#civica-add-member-cancel');
    let candidate = null;

    function lookup(nie) {
      let DB = null;
      try { DB = global.STUDENTS; } catch (e) {}
      if (!DB) { try { DB = STUDENTS; } catch (e) {} }
      if (!DB) return null;
      const clean = String(nie || '').trim();
      return clean && DB[clean] ? { nie: clean, ...DB[clean] } : null;
    }

    function validate() {
      const v = inp.value.trim();
      candidate = null;
      okBtn.disabled = true;
      if (!v) { info.classList.remove('show'); err.classList.remove('show'); return; }
      if (state.student && state.student.nie === v) {
        info.classList.remove('show');
        err.textContent = 'Ya está como estudiante principal';
        err.classList.add('show'); return;
      }
      if ((state.partners || []).some(p => p.nie === v)) {
        info.classList.remove('show');
        err.textContent = 'Ya está agregado al equipo';
        err.classList.add('show'); return;
      }
      const found = lookup(v);
      if (!found) {
        info.classList.remove('show');
        if (v.length >= 4) { err.textContent = 'NIE no encontrado'; err.classList.add('show'); }
        else err.classList.remove('show');
        return;
      }
      if (!isAllowedAtLevel(found)) {
        info.classList.remove('show');
        err.textContent = 'Esta actividad es solo para ' + getLevelLabel();
        err.classList.add('show'); return;
      }
      candidate = found;
      info.innerHTML = '<b>' + escapeHTML(found.name) + '</b><br><small>' + escapeHTML(found.grade) + '</small>';
      info.classList.add('show');
      err.classList.remove('show');
      okBtn.disabled = false;
    }

    inp.addEventListener('input', validate);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !okBtn.disabled) okBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });
    cancelBtn.addEventListener('click', () => {
      overlay.style.transition = 'opacity 0.2s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    });
    okBtn.addEventListener('click', () => {
      if (!candidate) return;
      state.partners = state.partners || [];
      state.partners.push(candidate);
      if (!state.partner) state.partner = candidate;
      saveState();
      renderHeaderStudents();
      if (global.rigo && global.rigo.say) {
        global.rigo.say('¡Bienvenido ' + candidate.name.split(' ')[0] + '!', 3000);
      }
      overlay.style.transition = 'opacity 0.2s';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    });
    setTimeout(() => inp.focus(), 200);
  }

  function renderAudioPlayer(src, idx) {
    return `
      <div class="civica-audio">
        <button class="civica-audio-btn" data-audio-idx="${idx}" type="button" aria-label="Play audio">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <span class="civica-audio-label">Escuchar</span>
        <audio id="civica-audio-${idx}" src="${escapeAttr(src)}" preload="metadata"></audio>
      </div>
    `;
  }

  function renderGame(gameCfg) {
    if (global.rigo && global.rigo.inviteGame) global.rigo.inviteGame();
    const section = document.getElementById('civica-game-section');
    section.innerHTML = `
      <div class="civica-section civica-section--consolidate" style="margin-top:32px;">
        <div class="civica-section-header">
          <div class="civica-section-icon">🎮</div>
          <div class="civica-section-titles">
            <div class="civica-section-eyebrow">Bonus</div>
            <div class="civica-section-title">Juego final</div>
          </div>
        </div>
        <div class="civica-exercise">
          <div id="civica-game-body"></div>
        </div>
      </div>
    `;
    const renderer = state.gameRegistry[gameCfg.type];
    if (renderer) {
      try {
        renderer({
          container: document.getElementById('civica-game-body'),
          config: gameCfg,
          onWin: () => {
            const wasWin = state.gameResult === 'win';
            if (global.rigo) global.rigo.setEmotion && global.rigo.setEmotion('excited');
            if (global.rigo) global.rigo.say && global.rigo.say(
              wasWin ? 'Sigues siendo bueno en este juego, mantienes tu punto extra'
                     : 'Felicidades, eres bueno en este juego, ten 1 punto extra',
              4500
            );
            setGameResult('win');
          },
          onTie: () => {
            const hadWin = state.gameResult === 'win';
            if (global.rigo) global.rigo.setEmotion && global.rigo.setEmotion('neutral');
            if (global.rigo) global.rigo.say && global.rigo.say(
              hadWin ? 'Estuvo cerca, pero conservas tu punto extra anterior'
                     : 'Estamos a mano, ten 0.5 extra para tu nota',
              4500
            );
            setGameResult('tie');
          },
          onLose: () => {
            if (global.rigo) global.rigo.setEmotion && global.rigo.setEmotion('sad');
            if (global.rigo) global.rigo.say && global.rigo.say('Oops, más suerte para la próxima.', 4500);
            setGameResult('lose');
          }
        });
      } catch (err) {
        console.error('Error rendering game', gameCfg.type, err);
        document.getElementById('civica-game-body').innerHTML =
          '<p style="color:red">Error: juego "' + gameCfg.type + '" no disponible</p>';
      }
    }
  }

  function setupAudioButtons() {
    document.body.addEventListener('click', e => {
      const btn = e.target.closest('.civica-audio-btn');
      if (!btn) return;
      const idx = btn.dataset.audioIdx;
      const audio = document.getElementById('civica-audio-' + idx);
      if (!audio) return;
      if (audio.paused) {
        document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
        audio.play().catch(() => {});
        btn.querySelector('svg').innerHTML = '<path d="M6 6h4v12H6zm8 0h4v12h-4z"/>';
      } else {
        audio.pause();
        btn.querySelector('svg').innerHTML = '<path d="M8 5v14l11-7z"/>';
      }
      audio.onended = () => {
        btn.querySelector('svg').innerHTML = '<path d="M8 5v14l11-7z"/>';
      };
    });
  }

  // =====================================================================
  // PDF HELPERS
  // =====================================================================
  function toRoman(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N';
    const n = Math.max(0, Math.floor(num));
    if (n === 0) return 'N';
    const map = [
      [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
      [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
      [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
    ];
    let result = '', remaining = n;
    for (const [val, sym] of map) {
      while (remaining >= val) { result += sym; remaining -= val; }
    }
    return result;
  }
  function gradeToRoman(gradeStr) {
    const s = String(gradeStr || '0.0');
    const parts = s.split('.');
    const intPart = parseInt(parts[0], 10) || 0;
    const decPart = parseInt((parts[1] || '0')[0], 10) || 0;
    return toRoman(intPart) + '-' + (decPart === 0 ? 'N' : toRoman(decPart));
  }
  function shortHash4(str) {
    let h = 5381;
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) + s.charCodeAt(i);
      h = h & 0xffffffff;
    }
    const u = (h >>> 0).toString(36).toUpperCase();
    return ('0000' + u).slice(-4);
  }
  function buildReferenceCode(grade, nie, topic) {
    const romans = gradeToRoman(grade);
    const year = new Date().getFullYear();
    const hash = shortHash4((nie || '') + '|' + (topic || '') + '|' + year);
    return 'Ref. ' + romans + '-' + year + '-' + hash;
  }

  // =====================================================================
  // PDF GENERATION (Colorful Notion design)
  // =====================================================================
  function generatePDF() {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      alert('Error: jsPDF no está cargado');
      return;
    }
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });

    const cfg = state.config;
    const stu = state.student || { nie: '-', name: '-', grade: '-' };
    const partners = (state.partners && state.partners.length)
      ? state.partners
      : (state.partner ? [state.partner] : []);
    const score = getTotalScore();
    const today = new Date().toLocaleDateString('es-SV');

    // Paleta Notion para PDF
    const T = {
      primary:    [79, 70, 229],
      accent:     [245, 158, 11],
      explore:    [56, 189, 248],
      deepen:     [34, 197, 94],
      consolidate:[250, 204, 21],
      dark:       [31, 31, 31],
      textSoft:   [74, 74, 74],
      textMuted:  [138, 138, 138],
      onPrimary:  [255, 255, 255],
      bg:         [255, 255, 255],
      bgSoft:     [247, 246, 243],
      bgSofter:   [250, 250, 247],
      divider:    [229, 229, 224],
      divider2:   [208, 208, 203],
      font:       'helvetica'
    };
    const S = {
      white:[255,255,255], green:[34,197,94], red:[220,38,38],
      amber:[245,158,11], gray:[138,138,138], darkGray:[74,74,74]
    };

    function fillBox(x,y,w,h,c) { doc.setFillColor(c[0],c[1],c[2]); doc.rect(x,y,w,h,'F'); }
    function borderedBox(x,y,w,h,fill,brd,lw) {
      doc.setFillColor(fill[0],fill[1],fill[2]);
      doc.setDrawColor(brd[0],brd[1],brd[2]);
      doc.setLineWidth(lw||0.4);
      doc.rect(x,y,w,h,'FD');
    }
    function setText(c,style,size) {
      doc.setTextColor(c[0],c[1],c[2]);
      doc.setFont(T.font, style||'normal');
      doc.setFontSize(size||10);
    }
    function hline(x1,x2,y,c,lw) {
      doc.setDrawColor(c[0],c[1],c[2]);
      doc.setLineWidth(lw||0.3);
      doc.line(x1,y,x2,y);
    }

    const PW = 215.9, PH = 279.4, M = 14;
    const right = PW - M, contentW = right - M;

    // Header con franja tricolor (las 3 etapas)
    fillBox(0, 0, PW, 4, T.explore);
    fillBox(PW/3, 0, PW/3, 4, T.deepen);
    fillBox((PW/3)*2, 0, PW/3, 4, T.consolidate);

    // Subject pill
    setText(T.textMuted, 'bold', 8);
    doc.text((cfg.subjectLabel || 'CIUDADANÍA Y VALORES').toUpperCase(), M, 13);

    // Topic
    setText(T.dark, 'bold', 18);
    doc.text(sanitizeForPDF(cfg.topic || 'Sesión'), M, 22);

    // Subtitle
    setText(T.textSoft, 'normal', 10);
    doc.text(sanitizeForPDF((cfg.unit || 'Octavo Grado') + ' · CIVICA · Prof. Jose Eliseo Martinez · ' + today), M, 28);

    hline(M, right, 32, T.divider, 0.4);

    let y = 40;

    // Estado
    borderedBox(M, y, contentW, 14, T.bgSoft, T.divider, 0.4);
    fillBox(M, y, 3, 14, T.primary);
    setText(T.textMuted, 'bold', 8);
    doc.text('ESTADO', M + 8, y + 5.5);
    setText(T.dark, 'bold', 11);
    doc.text('Tarea entregada', M + 8, y + 11);
    setText(T.textSoft, 'normal', 9);
    doc.text(today, right - 5, y + 9, { align: 'right' });
    y += 20;

    // Equipo
    const teamRows = 2 + partners.length;
    const teamH = 10 + teamRows * 7 + 4;
    borderedBox(M, y, contentW, teamH, T.bg, T.divider, 0.4);
    fillBox(M, y, 3, teamH, T.primary);
    setText(T.textMuted, 'bold', 8);
    doc.text('EQUIPO', M + 8, y + 6);
    hline(M + 3, M + contentW, y + 8.5, T.divider, 0.3);

    let yy = y + 13;
    const col1 = M + 8, col2 = M + 38;
    setText(T.dark, 'bold', 9);
    doc.text('Estudiante:', col1, yy);
    setText(S.darkGray, 'normal', 9);
    doc.text(sanitizeForPDF(stu.name) + '  (NIE: ' + sanitizeForPDF(stu.nie) + ')', col2, yy);
    yy += 7;

    setText(T.dark, 'bold', 9);
    doc.text('Grado:', col1, yy);
    setText(S.darkGray, 'normal', 9);
    doc.text(sanitizeForPDF(stu.grade), col2, yy);
    yy += 7;

    if (partners.length === 0) {
      setText(S.gray, 'italic', 9);
      doc.text('Trabajo individual', col1, yy);
    } else {
      partners.forEach((p, i) => {
        setText(T.dark, 'bold', 9);
        doc.text('Compañero ' + (i + 1) + ':', col1, yy);
        setText(S.darkGray, 'normal', 9);
        doc.text(sanitizeForPDF(p.name) + '  (NIE: ' + sanitizeForPDF(p.nie) + ')', col2, yy);
        yy += 7;
      });
    }
    y += teamH + 10;

    // Detalle por sección y ejercicio
    const grouped = {};
    state.flatExercises.forEach(it => {
      grouped[it.sectionKey] = grouped[it.sectionKey] || [];
      grouped[it.sectionKey].push(it);
    });

    SECTIONS.forEach(secMeta => {
      const list = grouped[secMeta.key];
      if (!list || !list.filter(it => it.ex.type !== 'note').length) return;

      if (y > PH - 40) { doc.addPage(); y = 18; }

      const secColor = T[secMeta.key];

      // Cabecera de sección
      borderedBox(M, y, contentW, 11, T.bgSoft, secColor, 0.5);
      fillBox(M, y, 4, 11, secColor);
      setText(T.textMuted, 'bold', 7);
      doc.text(secMeta.eyebrow.toUpperCase(), M + 9, y + 4.5);
      setText(T.dark, 'bold', 11);
      doc.text(secMeta.title.toUpperCase(), M + 9, y + 9);
      y += 16;

      let exNum = 0;
      list.forEach(item => {
        const ex = item.ex;
        if (ex.type === 'note') return;
        exNum++;
        const ans = state.answers['ex_' + item.idx];
        const title = sanitizeForPDF(ex.title || ('Ejercicio ' + exNum));

        let isNewPage = false;
        if (y > PH - 35) { doc.addPage(); y = 18; isNewPage = true; }
        if (exNum > 1 && !isNewPage) hline(M + 4, right, y - 4, T.divider, 0.25);

        // Numerito
        doc.setFillColor(secColor[0], secColor[1], secColor[2]);
        doc.roundedRect(M, y - 4, 7, 7, 1.5, 1.5, 'F');
        setText(T.onPrimary, 'bold', 8);
        doc.text(String(exNum), M + 3.5, y + 0.7, { align: 'center' });

        setText(T.dark, 'bold', 10);
        doc.text(title, M + 10, y);

        // Badge estado
        let badgeColor = T.bgSoft, badgeText = 'Pendiente', badgeTC = S.gray, dotColor = null;
        if (ans) {
          const pct = ans.total > 0 ? ans.score / ans.total : 0;
          badgeText = 'Completado';
          badgeColor = T.bgSoft; badgeTC = T.textSoft;
          if (pct >= 0.7)      dotColor = S.green;
          else if (pct >= 0.4) dotColor = S.amber;
          else                 dotColor = S.red;
        }
        const bw = 32, bh = 6;
        const bx = right - bw, by = y - 4.5;
        borderedBox(bx, by, bw, bh, badgeColor, T.divider, 0.3);
        setText(badgeTC, 'bold', 7.5);
        if (dotColor) {
          doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
          doc.circle(bx + 3.2, by + 3, 1.1, 'F');
          doc.text(badgeText, bx + bw / 2 + 1.2, by + 4.1, { align: 'center' });
        } else {
          doc.text(badgeText, bx + bw / 2, by + 4.1, { align: 'center' });
        }
        y += 5;

        // Detalles
        if (!cfg.pdfHideDetails && ans && ans.details && Array.isArray(ans.details) && ans.details.length) {
          setText(T.textMuted, 'normal', 8);
          ans.details.forEach(d => {
            if (y > PH - 20) { doc.addPage(); y = 18; }
            const line = '  ' + sanitizeForPDF(d);
            const split = doc.splitTextToSize(line, contentW - 10);
            doc.text(split, M + 9, y);
            y += split.length * 3.6;
          });
          y += 1;
        }
        y += 8;
      });
    });

    // Juego final
    if (cfg.game) {
      if (y > PH - 25) { doc.addPage(); y = 18; }
      y += 4;
      borderedBox(M, y, contentW, 10, T.bgSoft, T.accent, 0.5);
      fillBox(M, y, 4, 10, T.accent);
      setText(T.dark, 'bold', 9);
      doc.text('JUEGO FINAL:', M + 9, y + 6.5);
      setText(T.textSoft, 'normal', 9);
      doc.text(sanitizeForPDF(cfg.game.type).toUpperCase(), M + 42, y + 6.5);
      y += 13;
    }

    // Footer
    const refCode = buildReferenceCode(score.grade, stu.nie, cfg.topic);
    const totalPages = doc.internal.getNumberOfPages();
    const footerY = PH - 8;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      hline(M, right, footerY - 4, T.divider, 0.3);
      setText(T.textMuted, 'italic', 7);
      doc.text('CIVICA - Ciudadania y Valores - Prof. Jose Eliseo Martinez', M, footerY);
      setText(T.textMuted, 'normal', 7);
      doc.text('Pag. ' + p + ' de ' + totalPages, PW / 2, footerY, { align: 'center' });
      setText(T.textMuted, 'normal', 7);
      doc.text(refCode, right, footerY, { align: 'right' });
    }

    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const filename = 'civica_' + sanitizeForPDF(stu.name).replace(/\s+/g, '_') + '_' +
                       sanitizeForPDF(cfg.topic || 'tarea').replace(/\s+/g, '_') + '.pdf';
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
    } catch (e) {
      console.error('PDF error:', e);
      alert('No se pudo generar el PDF. Recarga e intenta de nuevo.');
    }
  }

  // =====================================================================
  // UTILS
  // =====================================================================
  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHTML(s); }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function normalize(s) {
    return String(s || '').toLowerCase().trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // =====================================================================
  // DRAG & DROP HELPER (compartido)
  // =====================================================================
  function makeDraggable(el, opts) {
    opts = opts || {};
    const onPickup = opts.onPickup || (() => {});
    const onMove = opts.onMove || (() => {});
    const onDrop = opts.onDrop || (() => {});
    const SCROLL_ZONE = 70, SCROLL_SPEED = 12;
    let dragging = false, scrollInterval = null, lastClientY = 0;
    let ghost = null, startX = 0, startY = 0;

    function startScroll() {
      if (scrollInterval) return;
      scrollInterval = setInterval(() => {
        if (!dragging) return;
        const y = lastClientY;
        if (y < SCROLL_ZONE) window.scrollBy(0, -SCROLL_SPEED);
        else if (y > window.innerHeight - SCROLL_ZONE) window.scrollBy(0, SCROLL_SPEED);
      }, 16);
    }
    function stopScroll() { if (scrollInterval) clearInterval(scrollInterval); scrollInterval = null; }

    function pickup(e) {
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX; startY = point.clientY;
      dragging = true; lastClientY = point.clientY;
      const rect = el.getBoundingClientRect();
      ghost = el.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px'; ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px'; ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none'; ghost.style.opacity = '0.85';
      ghost.style.zIndex = '9999';
      ghost.style.transform = 'rotate(2deg) scale(1.04)';
      ghost.style.transition = 'none';
      document.body.appendChild(ghost);
      el.style.opacity = '0.3';
      onPickup({ el, ghost, clientX: point.clientX, clientY: point.clientY });
      startScroll();
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      const point = e.touches ? e.touches[0] : e;
      lastClientY = point.clientY;
      if (ghost) {
        const dx = point.clientX - startX, dy = point.clientY - startY;
        ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(2deg) scale(1.04)`;
      }
      ghost && (ghost.style.display = 'none');
      const under = document.elementFromPoint(point.clientX, point.clientY);
      ghost && (ghost.style.display = '');
      onMove({ el, ghost, clientX: point.clientX, clientY: point.clientY, under });
      e.preventDefault();
    }
    function drop(e) {
      if (!dragging) return;
      dragging = false; stopScroll();
      const point = e.changedTouches ? e.changedTouches[0] : e;
      ghost && (ghost.style.display = 'none');
      const under = document.elementFromPoint(point.clientX, point.clientY);
      ghost && ghost.remove(); ghost = null;
      el.style.opacity = '';
      onDrop({ el, clientX: point.clientX, clientY: point.clientY, under });
    }
    el.addEventListener('mousedown', pickup);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', drop);
    el.addEventListener('touchstart', pickup, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', drop);
  }

  // =====================================================================
  // PUBLIC API
  // =====================================================================
  const CIVICA = {
    version: VERSION,
    sanitizeForPDF, shuffle, normalize, escapeHTML,
    makeDraggable, addExtraPoints, setGameResult, recordAnswer,

    registerExercise(type, renderer) { state.exerciseRegistry[type] = renderer; },
    registerGame(type, renderer) { state.gameRegistry[type] = renderer; },

    init(config) {
      state.config = config;
      state.storageKey = STORAGE_KEY_PREFIX +
        (config.id || (config.topic || 'page').replace(/\W+/g, '_').toLowerCase()) + '_';

      ensureNoTranslate();
      setupBfCacheGuard();
      setupAntiCopy();
      applyTheme(config.colors);

      if (!config.examMode) pickPoolVersion();

      const prev = loadState();
      if (prev) {
        state.answers = prev.answers || {};
        state.extraPoints = prev.extraPoints || 0;
        state.gameResult = prev.gameResult || null;
      }

      const start = () => {
        showLoginModal().then(() => {
          if (config.examMode) pickPoolVersion();
          buildFlatExercises();
          renderLayout();
          setupAudioButtons();
          updateScoreDisplay();
        });
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    },

    reset() {
      try { localStorage.removeItem(state.storageKey + 'state'); } catch (e) {}
      try { localStorage.removeItem(state.storageKey + 'pool'); } catch (e) {}
      location.reload();
    },

    retryExercise(exerciseIdOrIdx) {
      let idx;
      if (typeof exerciseIdOrIdx === 'number') idx = exerciseIdOrIdx;
      else {
        const m = String(exerciseIdOrIdx).match(/^ex_(\d+)$/);
        if (!m) return;
        idx = parseInt(m[1], 10);
      }
      retryExercise(idx);
    }
  };

  global.CIVICA = CIVICA;
})(typeof window !== 'undefined' ? window : this);
