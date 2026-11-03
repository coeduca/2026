/**
 * CIVICA Framework v1 - Core
 * Profesor Eliseo - Ciudadanía y Valores
 *
 * Adaptación del framework COEDUCA para la materia de Ciudadanía y Valores.
 * Diferencias clave respecto a COEDUCA:
 *   - Participan las aulas incluidas en el padrón de la actividad
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
  // CUENTAS FIJAS: el resto de estudiantes procede de las aulas seleccionadas
  // =====================================================================
  const TEST_NIE = '1999'; // José Eliseo - siempre permitido
  const RIGO_NIE = '12379'; // Cuenta fija de Rigo

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
    balloonBonus: 0,      // +1 si atrapo el globo del Dino Runner (una sola vez)
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
         .replace(/&#39;/g, "'")
         .replace(/&iquest;|&#0*191;|&#x0*bf;/gi, '\u00BF')
         .replace(/&iexcl;|&#0*161;|&#x0*a1;/gi, '\u00A1');
    const replacements = {
      '\u2192': '->', '\u2190': '<-', '\u2191': '^', '\u2193': 'v',
      '\u2018': "'", '\u2019': "'", '\u201A': "'", '\u201B': "'",
      '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',
      '\u2013': '-',  '\u2014': '-', '\u2015': '-',
      '\u2026': '...',
      '\u00A0': ' ', '\u2009': ' ', '\u200A': ' ', '\u200B': '',
      '\u2022': '*', '\u00B7': '*',
      '\u2713': 'OK', '\u2714': 'OK', '\u2717': 'X', '\u2718': 'X'
    };
    // Los signos de apertura españoles están incluidos en Latin-1.
    s = s.replace(/[\u2013\u2014\u2015\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2022\u00B7\u2026\u00A0\u2009\u200A\u200B\u2190\u2191\u2192\u2193\u2713\u2714\u2717\u2718]/g,
      ch => replacements[ch] || '');
    s = s.split('').filter(ch => ch.charCodeAt(0) <= 255).join('');
    return s.trim();
  }

  // =====================================================================
  // ANTI-COPY
  // =====================================================================
  function setupAntiCopy() {
    const block = e => { e.preventDefault(); return false; };
    ['contextmenu', 'copy', 'cut', 'selectstart', 'dragstart']
      .forEach(evt => document.addEventListener(evt, block, { passive: false }));

    // Solo los campos de respuesta: las fichas usan el arrastre propio del framework.
    function isAnswerField(target) {
      const field = target && target.closest
        ? target.closest('input, textarea, [contenteditable]') : null;
      if (!field || field.disabled || field.readOnly) return false;
      if (field.matches('input') && !['text', 'search', 'email', 'url', 'tel', 'number', 'password'].includes(field.type)) return false;
      if (field.hasAttribute('contenteditable') && !field.isContentEditable) return false;
      return !!field.closest('.coeduca-exercise-body, .civica-exercise-body');
    }

    function warnCheating() {
      const rigo = global.rigo || document.querySelector('rigo-mascot');
      if (!rigo) return;
      if (typeof rigo.warnCheating === 'function') rigo.warnCheating();
      else {
        if (typeof rigo.setEmotion === 'function') rigo.setEmotion('sad');
        if (typeof rigo.say === 'function') rigo.say('Oops, no puedes hacer trampa aquí', 4500);
      }
    }

    const capture = { capture: true, passive: false };
    const rejectAnswerInsertion = e => {
      e.preventDefault();
      e.stopPropagation();
      warnCheating();
    };
    document.addEventListener('paste', e => {
      // Conserva el bloqueo general de pegado y avisa en los ejercicios.
      e.preventDefault();
      if (isAnswerField(e.target)) rejectAnswerInsertion(e);
    }, capture);
    document.addEventListener('dragover', e => {
      // Permite recibir drop para cancelarlo antes de que el navegador inserte texto.
      if (isAnswerField(e.target)) e.preventDefault();
    }, capture);
    document.addEventListener('drop', e => {
      if (isAnswerField(e.target)) rejectAnswerInsertion(e);
    }, capture);
    document.addEventListener('beforeinput', e => {
      // También cubre pegado desde menús móviles y las rutas nativas de inserción.
      if (/^insertFrom(?:Paste|Drop)/.test(e.inputType || '') && isAnswerField(e.target)) {
        rejectAnswerInsertion(e);
      }
    }, capture);
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
      if (e.persisted) {
        try { sessionStorage.setItem(state.storageKey + 'resumeAfterHistory', '1'); } catch (err) {}
        location.reload();
      }
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
      syncGameBonus();
      const snapshot = {
        student: state.student,
        partner: state.partner,
        partners: state.partners,
        poolVersion: state.poolVersion,
        answers: state.answers,
        extraPoints: state.extraPoints,
        balloonBonus: state.balloonBonus,
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

  function accountStateKey(nie) {
    return state.storageKey + 'account_' + String(nie) + '_state';
  }

  function archiveAccountState(snapshot) {
    if (!snapshot || !snapshot.student || !snapshot.student.nie) return;
    try {
      localStorage.setItem(accountStateKey(snapshot.student.nie), JSON.stringify(snapshot));
    } catch (e) {}
  }

  function loadAccountState(nie) {
    try {
      const raw = localStorage.getItem(accountStateKey(nie));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearAccountStates() {
    try {
      const prefix = state.storageKey + 'account_';
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && key.endsWith('_state')) localStorage.removeItem(key);
      }
    } catch (e) {}
  }

  function syncGameBonus() {
    const latest = loadState();
    if (!latest || !latest.student || !state.student || latest.student.nie !== state.student.nie) return false;
    if ((Number(latest.extraPoints) || 0) > state.extraPoints) {
      state.extraPoints = Number(latest.extraPoints);
      state.gameResult = latest.gameResult || state.gameResult;
    }
    state.balloonBonus = Math.max(state.balloonBonus, Number(latest.balloonBonus) || 0);
    return true;
  }

  // A saved snapshot can still be a draft. Completion is based on answered items.
  function isCompletedAnswer(ex, answer) {
    if (!answer || !(answer.total > 0)) return false;
    const raw = answer.userAnswer;
    if (raw == null) return true; // Preserve summaries from older packages.
    const data = getPoolData(ex);
    const filled = value => value != null && String(value).trim() !== '';
    const all = (values, count, test = filled) => Array.isArray(values) && count > 0 && values.length >= count && values.slice(0, count).every(test);
    if (ex.type === 'wordsearch') return all(raw, (data.words || []).length);
    if (ex.type === 'memory') return all(raw, data.length, Number.isInteger);
    if (ex.type === 'matchlines') {
      const count = (Array.isArray(data) ? data : data.pairs || []).length;
      return Array.isArray(raw) && count > 0 && new Set(raw.map(pair => pair.leftId)).size === count && new Set(raw.map(pair => pair.rightId)).size === count;
    }
    if (ex.type === 'wordselect') {
      return all(raw, data.length, (values, i) => {
        const targets = (String(data[i].text || '').match(/\[([^\]]+)\]/g) || []).reduce((sum, chunk) =>
          sum + (chunk.match(/[\p{L}\p{N}'’\-]+/gu) || []).length, 0);
        return Array.isArray(values) && values.length >= targets;
      });
    }
    if (ex.type === 'cv_table') {
      const rows = raw.gradingRows || raw.rows || [];
      let count = 0, complete = true;
      (data.rows || []).forEach((row, r) => (row.cells || row).forEach((cell, c) => {
        if (!['input','select','drop','drop_image','check'].includes(cell.type)) return;
        count++;
        const value = rows[r]?.[c];
        if (!filled(value) || (cell.type === 'input' && !cell.answer && String(value).trim().length < 16)) complete = false;
      }));
      return count > 0 && complete;
    }
    if (ex.type === 'dragbank') return all(raw, (data.sentences || []).length);
    if (ex.type === 'comicdialogue') return all(raw, data.flatMap(panel => panel.bubbles || []).filter(bubble => bubble.blank).length);
    if (ex.type === 'categorize') return all(raw, (data.items || []).length, item => item?.cat != null);
    if (ex.type === 'matchimage') return all(raw, data.length, Number.isInteger);
    if (ex.type === 'reorder_sentences') return all(raw, data.length, (words, i) => {
      const item = data[i], expected = item.words || String(typeof item === 'string' ? item : item.sentence).split(/\s+/);
      return Array.isArray(words) && words.length === expected.length;
    });
    if (ex.type === 'fillblank') return all(raw, data.flatMap(item => Array.isArray(item.answer) ? item.answer : [item.answer]).length);
    if (['dropdown','multiplechoice','spoterror'].includes(ex.type)) return all(raw, data.length, Number.isInteger);
    if (ex.type === 'truefalse') return all(raw, data.length, value => typeof value === 'boolean');
    if (['emojiphrase','reorder_letters'].includes(ex.type)) return all(raw, data.length);
    if (ex.type === 'cv_textanswer') return all(raw, data.length, item => String(item?.a || '').trim().length >= 16);
    return true;
  }

  function restoreExerciseDraft(body, ex, raw) {
    if (!raw || ex.type === 'cv_table') return; // Tables restore their own tokens.
    const inputs = body.querySelectorAll('.fb-input,.ep-input,.rl-input,.cv-ta-input,.dd-sel');
    inputs.forEach((input, i) => { if (raw[i] != null) input.value = String(ex.type === 'cv_textanswer' ? raw[i].a || '' : raw[i]); });
    if (ex.type === 'multiplechoice') raw.forEach((value, i) => {
      if (Number.isInteger(value)) body.querySelector(`input[type="radio"][name$="-${i}"][value="${value}"]`)?.click();
    });
    if (ex.type === 'spoterror') raw.forEach((value, i) => {
      if (Number.isInteger(value)) body.querySelector(`.se-word[data-i="${i}"][data-j="${value}"]`)?.click();
    });
    if (ex.type === 'wordselect') raw.forEach((values, i) => {
      if (Array.isArray(values)) values.forEach(value => body.querySelector(`.wsel-word[data-i="${i}"][data-ti="${value}"]`)?.click());
    });
    if (ex.type === 'truefalse') raw.forEach((value, i) => {
      if (typeof value === 'boolean') body.querySelector(`.tf-btn[data-i="${i}"][data-v="${value}"]`)?.click();
    });
    function restoreTokens(slotSelector, tokenSelector, values) {
      const tokens = [...body.querySelectorAll(tokenSelector)];
      [...body.querySelectorAll(slotSelector)].forEach((slot, i) => {
        const value = values[i];
        if (value == null || value === '') return;
        const index = tokens.findIndex(token => ex.type === 'matchimage' ? Number(token.dataset.idx) === value : normalize(token.textContent) === normalize(value));
        if (index >= 0) slot.appendChild(tokens.splice(index, 1)[0]);
      });
    }
    if (ex.type === 'dragbank') restoreTokens('.db-slot', '.db-word', raw);
    if (ex.type === 'comicdialogue') restoreTokens('.cd-slot', '.cd-chip', raw);
    if (ex.type === 'matchimage') restoreTokens('.mi-slot', '[id^="mi-bank"] [data-idx]', raw);
    if (ex.type === 'categorize') {
      const tokens = [...body.querySelectorAll('[id^="cat-bank"] [data-idx]')];
      raw.forEach(item => {
        if (item?.cat == null) return;
        const index = tokens.findIndex(token => token.textContent === item.text);
        const target = body.querySelector(`.cat-drop[data-cat="${item.cat}"]`);
        if (index >= 0 && target) target.appendChild(tokens.splice(index, 1)[0]);
      });
    }
    if (ex.type === 'reorder_sentences') raw.forEach((words, i) => {
      const target = body.querySelector(`.ro-target[data-i="${i}"]`);
      const source = target?.parentElement.querySelector(".ro-source");
      if (!target || !source || !Array.isArray(words)) return;
      const tokens = [...source.querySelectorAll('[data-word]')];
      words.forEach(word => {
        const index = tokens.findIndex(token => token.textContent === word);
        if (index >= 0) { target.appendChild(tokens.splice(index, 1)[0]); target.removeAttribute("data-show-placeholder"); }
      });
    });
    if (ex.type === 'reorder_letters' && !inputs.length) raw.forEach((word, i) => {
      const row = body.querySelector(`.rl-slots[data-i="${i}"]`);
      if (!row) return;
      const tokens = [...row.parentElement.querySelectorAll(".rl-card")];
      [...String(word)].forEach((letter, j) => {
        const index = tokens.findIndex(token => token.textContent === letter);
        if (index >= 0 && row.children[j]) row.children[j].appendChild(tokens.splice(index, 1)[0]);
      });
    });
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
      grade: Math.min(10, baseGrade + state.extraPoints + state.balloonBonus).toFixed(1),
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
        badge.querySelector('.cocean-bonus-number').textContent = (state.extraPoints + state.balloonBonus).toFixed(1);
        badge.style.display = (state.extraPoints + state.balloonBonus) > 0 ? 'flex' : 'none';
      }
    }
    const finalDisplay = document.getElementById('civica-final-score-display');
    if (finalDisplay) {
      const realExercises = state.flatExercises.filter(it => it.ex.type !== 'note');
      const answeredCount = realExercises.filter(item => isCompletedAnswer(item.ex, state.answers['ex_' + item.idx])).length;
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
          ${(state.extraPoints + state.balloonBonus) > 0 ? '+ ' + (state.extraPoints + state.balloonBonus).toFixed(1) + ' puntos extra' : ''}</p>
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

  // Bonus del globo del Dino Runner: +1 punto extra independiente del resultado
  // del juego (asi el maximo extra posible es 2: ganar +1 y globo +1).
  // Solo puede obtenerse UNA vez por sesion; se guarda y entra en la nota
  // final de la web y del PDF.
  function addBalloonBonus() {
    if (state.balloonBonus >= 1) return;
    state.balloonBonus = 1;
    saveState();
    updateScoreDisplay();
  }

  // =====================================================================
  // VALIDACIÓN DEL PADRÓN (aulas seleccionadas en Datos)
  // =====================================================================
  function getStudentRoster() {
    let roster = null;
    try { roster = global.STUDENTS; } catch (e) {}
    if (!roster) { try { roster = STUDENTS; } catch (e) {} }
    return roster;
  }

  function isAllowedStudent(student) {
    if (global.COEDUCA_CLASSROOM) return !!student;
    if (!student) return false;
    const nie = String(student.nie || '').trim();
    if (nie === TEST_NIE || nie === RIGO_NIE) return true;
    const roster = getStudentRoster();
    return !!nie && !!roster && Object.prototype.hasOwnProperty.call(roster, nie) && !!roster[nie];
  }

  async function resumeStudentIfReturning() {
    const saved = loadState();
    const auth = global.COEDUCA_FIXED_AUTH;
    const remembered = auth && auth.lastStudent() || '';
    const nie = remembered || String(saved && saved.student && saved.student.nie || '');
    if (!nie) return false;
    const db = getStudentRoster();
    let found;
    if (global.COEDUCA_CLASSROOM) {
      try { found = await global.COEDUCA_CLASSROOM.lookup(nie); }
      catch (_) { found = saved && saved.student && String(saved.student.nie) === nie ? saved.student : null; }
      if (!found) return false;
    } else {
      if (!db || !db[nie]) return false;
      found = { nie, ...db[nie] };
    }
    if (nie === '1999' || nie === '12379') {
      if (!auth) return false;
      try { if (!await auth.hasSession(nie)) return false; }
      catch (_) { return false; }
    }
    if (!isAllowedStudent(found)) return false;
    if (saved && saved.student && String(saved.student.nie) !== nie) archiveAccountState(saved);
    const own = saved && saved.student && String(saved.student.nie) === nie ? saved : loadAccountState(nie);
    state.answers = own && own.answers || {};
    state.extraPoints = Number(own && own.extraPoints) || 0;
    state.balloonBonus = Number(own && own.balloonBonus) || 0;
    state.gameResult = own && own.gameResult || null;
    if (own && own.poolVersion) state.poolVersion = own.poolVersion;
    state.student = found;
    state.partners = (own && (own.partners || (own.partner ? [own.partner] : [])) || []).filter(isAllowedStudent);
    state.partner = state.partners[0] || null;
    if (auth) auth.remember(nie);
    saveState();
    if (global.rigo && global.rigo.setGrade) global.rigo.setGrade(found.grade);
    return true;
  }

  // =====================================================================
  // LOGIN MODAL
  // =====================================================================
  function showLoginModal(fresh = false) {
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

      async function lookupNIE(nie) {
        if (global.COEDUCA_CLASSROOM) return global.COEDUCA_CLASSROOM.lookup(nie);
        const DB = getStudentRoster();
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

      async function validateMain() {
        const value=nieInput.value;mainStudent=null;submitBtn.disabled=true;
        let found;try{found=await lookupNIE(value);}catch(error){if(nieInput.value!==value)return;nieError.textContent=error.message;nieError.classList.add('show');return;}
        if(nieInput.value!==value)return;
        if (found) {
          if (!isAllowedStudent(found)) {
            mainStudent = null;
            nieInfo.classList.remove('show');
            nieError.textContent = 'Este estudiante no pertenece a las aulas de esta actividad.';
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

        const validate = async () => {
          slot.student = null;
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
          let found;try{found=await lookupNIE(v);}catch(error){if(inp.value.trim()!==v)return;err.textContent=error.message;err.classList.add('show');return;}
          if(inp.value.trim()!==v||!field.isConnected)return;
          if (found) {
            if (!isAllowedStudent(found)) {
              slot.student = null; info.classList.remove('show');
              err.textContent = 'Este estudiante no pertenece a las aulas de esta actividad.';
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

      const finish = async () => {
        if (!mainStudent) return;
        const chosen = mainStudent;
        if (chosen.nie === '1999' || chosen.nie === '12379') {
          const auth = global.COEDUCA_FIXED_AUTH;
          if (!auth) {
            nieError.textContent = 'No se pudo cargar el acceso protegido.';
            nieError.classList.add('show');
            return;
          }
          submitBtn.disabled = true;
          const accepted = await auth.requestLogin(chosen.nie);
          submitBtn.disabled = false;
          if (!accepted || mainStudent !== chosen) return;
        }
        const prev = loadState();
        if (!prev || !prev.student || String(prev.student.nie) !== String(mainStudent.nie)) {
          archiveAccountState(prev);
          const savedAccount = loadAccountState(mainStudent.nie);
          state.answers = savedAccount && savedAccount.answers || {};
          state.extraPoints = Number(savedAccount && savedAccount.extraPoints) || 0;
          state.balloonBonus = Number(savedAccount && savedAccount.balloonBonus) || 0;
          state.gameResult = savedAccount && savedAccount.gameResult || null;
          if (savedAccount && savedAccount.poolVersion) state.poolVersion = savedAccount.poolVersion;
        }
        state.student = mainStudent;
        state.partners = partners.filter(p => p.student).map(p => p.student);
        state.partner = state.partners[0] || null;
        saveState();
        if (global.COEDUCA_FIXED_AUTH) global.COEDUCA_FIXED_AUTH.remember(mainStudent.nie);
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
      if (!fresh && prev && prev.student) {
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
    if (colors.cardBg)  root.style.setProperty('--civica-surface', colors.cardBg);
    if (colors.itemBg)  root.style.setProperty('--civica-item-bg', colors.itemBg);
    if (colors.text)    root.style.setProperty('--civica-text', colors.text);
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

  function switchAccount() {
    if (global.COEDUCA_FIXED_AUTH) global.COEDUCA_FIXED_AUTH.clear();
    if (global.COEDUCA_OCEAN) global.COEDUCA_OCEAN.mount(null);
    archiveAccountState(loadState());
    try { localStorage.removeItem(state.storageKey + 'state'); } catch (e) {}
    try { sessionStorage.removeItem(state.storageKey + 'resumeAfterHistory'); } catch (e) {}
    state.student = null;
    state.partner = null;
    state.partners = [];
    state.answers = {};
    state.extraPoints = 0;
    state.balloonBonus = 0;
    state.gameResult = null;
    if (state.appRoot) state.appRoot.style.display = 'none';
    showLoginModal(true).then(() => {
      if (state.appRoot) state.appRoot.style.display = '';
      renderLayout();
      updateScoreDisplay();
    });
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
      <div class="civica-extra-badge" id="civica-extra-badge" style="display:none" aria-label="Puntos extra"><img class="cocean-bonus-icon" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IS0tIFVwbG9hZGVkIHRvOiBTVkcgUmVwbywgd3d3LnN2Z3JlcG8uY29tLCBHZW5lcmF0b3I6IFNWRyBSZXBvIE1peGVyIFRvb2xzIC0tPg0KPHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxwYXRoIGQ9Ik00IDEySDIwTTEyIDRWMjAiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4NCjwvc3ZnPg==" alt=""><span class="cocean-bonus-number">0.0</span></div>
      <header class="civica-header">
        <div class="civica-subject-pill">${escapeHTML(subjectLabel)}</div>
        <h1>${escapeHTML(cfg.topic || 'Sesión de Ciudadanía y Valores')}</h1>
        <p>${escapeHTML(cfg.unit || 'Ciudadanía y Valores')} · CIVICA · Prof. Eliseo</p>
        <div class="civica-header-students" id="civica-header-students"></div>
        <div class="civica-header-actions">
          <button class="civica-btn civica-btn-info civica-add-member-btn" id="civica-add-member-btn" type="button">
            + Agregar miembro
          </button>
          <button class="civica-btn civica-btn-info civica-switch-account-btn" id="civica-switch-account-btn"
                  type="button" aria-label="Cambiar de cuenta" title="Cambiar de cuenta">
            <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PgoNPCEtLSBVcGxvYWRlZCB0bzogU1ZHIFJlcG8sIHd3dy5zdmdyZXBvLmNvbSwgR2VuZXJhdG9yOiBTVkcgUmVwbyBNaXhlciBUb29scyAtLT4KPHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB2ZXJzaW9uPSIxLjEiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgoNPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6IzMzMzMzMzt9DQoJLnN0MXtmaWxsOm5vbmU7c3Ryb2tlOiMzMzMzMzM7c3Ryb2tlLXdpZHRoOjMyO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9DQo8L3N0eWxlPgoNPGcgaWQ9IkxheWVyXzEiLz4KDTxnIGlkPSJMYXllcl8yIj4KDTxnPgoNPGc+Cg08ZWxsaXBzZSBjbGFzcz0ic3QwIiBjeD0iMTM5LjYxIiBjeT0iMjczLjciIHJ4PSI2My45NiIgcnk9IjYzLjk2IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjkyMzkgLTAuMzgyNyAwLjM4MjcgMC45MjM5IC05NC4xMTE4IDc0LjI2MSkiLz4KDTwvZz4KDTxnPgoNPHBhdGggY2xhc3M9InN0MCIgZD0iTTE1MS44LDM4NS4yMmgtMjQuMzdjLTQ2LjM1LDAtODMuOTMsMzcuNTctODMuOTMsODMuOTNsMCwwaDE5Mi4yMmwwLDAgICAgIEMyMzUuNzIsNDIyLjc5LDE5OC4xNSwzODUuMjIsMTUxLjgsMzg1LjIyeiIvPgoNPC9nPgoNPGc+Cg08ZWxsaXBzZSBjbGFzcz0ic3QwIiBjeD0iMzcyLjM5IiBjeT0iMTA2LjgyIiByeD0iNjMuOTYiIHJ5PSI2My45NiIgdHJhbnNmb3JtPSJtYXRyaXgoMC44NTA3IC0wLjUyNTcgMC41MjU3IDAuODUwNyAtMC41NDA4IDIxMS43MjkyKSIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzg0LjU3LDIxOC4zNEgzNjAuMmMtNDYuMzUsMC04My45MywzNy41Ny04My45Myw4My45M3YwSDQ2OC41djBDNDY4LjUsMjU1LjkxLDQzMC45MywyMTguMzQsMzg0LjU3LDIxOC4zNCAgICAgeiIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgzLjcxLDM0OS42MWMtMC4zOC0wLjM4LTAuNzctMC43My0xLjE4LTEuMDdjLTAuMTgtMC4xNC0wLjM2LTAuMjctMC41NC0wLjQxICAgICBjLTAuMjQtMC4xOC0wLjQ3LTAuMzYtMC43MS0wLjUzYy0wLjIyLTAuMTUtMC40NS0wLjI4LTAuNjgtMC40MWMtMC4yMi0wLjEzLTAuNDQtMC4yNy0wLjY2LTAuMzljLTAuMjMtMC4xMi0wLjQ3LTAuMjMtMC43MS0wLjM0ICAgICBjLTAuMjQtMC4xMS0wLjQ3LTAuMjMtMC43MS0wLjMzYy0wLjIzLTAuMS0wLjQ3LTAuMTctMC43LTAuMjZjLTAuMjYtMC4wOS0wLjUxLTAuMTktMC43OC0wLjI3Yy0wLjIzLTAuMDctMC40Ny0wLjEyLTAuNy0wLjE4ICAgICBjLTAuMjctMC4wNy0wLjU0LTAuMTQtMC44Mi0wLjJjLTAuMjYtMC4wNS0wLjUzLTAuMDgtMC44LTAuMTJjLTAuMjUtMC4wNC0wLjUtMC4wOC0wLjc1LTAuMTFjLTAuNDgtMC4wNS0wLjk1LTAuMDctMS40My0wLjA3ICAgICBjLTAuMDUsMC0wLjEtMC4wMS0wLjE0LTAuMDFjLTAuMDYsMC0wLjExLDAuMDEtMC4xNywwLjAxYy0wLjQ3LDAtMC45NCwwLjAzLTEuNDEsMC4wN2MtMC4yNiwwLjAzLTAuNTEsMC4wNy0wLjc3LDAuMTEgICAgIGMtMC4yNiwwLjA0LTAuNTIsMC4wNy0wLjc4LDAuMTJjLTAuMjgsMC4wNi0wLjU2LDAuMTMtMC44NCwwLjJjLTAuMjMsMC4wNi0wLjQ2LDAuMTEtMC42OCwwLjE4Yy0wLjI3LDAuMDgtMC41MywwLjE4LTAuOCwwLjI4ICAgICBjLTAuMjMsMC4wOC0wLjQ2LDAuMTYtMC42OCwwLjI1Yy0wLjI1LDAuMS0wLjQ4LDAuMjItMC43MywwLjM0Yy0wLjIzLDAuMTEtMC40NywwLjIxLTAuNywwLjMzYy0wLjIzLDAuMTItMC40NSwwLjI2LTAuNjcsMC40ICAgICBjLTAuMjIsMC4xMy0wLjQ1LDAuMjYtMC42NywwLjQxYy0wLjI1LDAuMTYtMC40OCwwLjM1LTAuNzEsMC41MmMtMC4xOCwwLjE0LTAuMzcsMC4yNi0wLjU1LDAuNDFjLTAuNDEsMC4zNC0wLjgsMC42OS0xLjE3LDEuMDYgICAgIGwtMjkuNDQsMjkuNDRjLTYuMjUsNi4yNS02LjI1LDE2LjM4LDAsMjIuNjNjMy4xMiwzLjEyLDcuMjIsNC42OSwxMS4zMSw0LjY5YzQuMDksMCw4LjE5LTEuNTYsMTEuMzEtNC42OWwyLjEzLTIuMTN2MzYuOTYgICAgIGgtNzYuNzVjLTguODQsMC0xNiw3LjE2LTE2LDE2czcuMTYsMTYsMTYsMTZoOTIuNzVjOC44NCwwLDE2LTcuMTYsMTYtMTZ2LTUyLjk2bDIuMTMsMi4xM2MzLjEyLDMuMTIsNy4yMiw0LjY5LDExLjMxLDQuNjkgICAgIGM0LjA5LDAsOC4xOS0xLjU2LDExLjMxLTQuNjljNi4yNS02LjI1LDYuMjUtMTYuMzgsMC0yMi42M0wzODMuNzEsMzQ5LjYxeiIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjMyLjQxLDQ1LjAyaC05Mi43NWMtOC44NCwwLTE2LDcuMTYtMTYsMTZ2NTIuOTZsLTIuMTMtMi4xM2MtNi4yNS02LjI1LTE2LjM4LTYuMjUtMjIuNjMsMCAgICAgYy02LjI1LDYuMjUtNi4yNSwxNi4zOCwwLDIyLjYzbDI5LjQzLDI5LjQzYzAuMzgsMC4zOCwwLjc3LDAuNzMsMS4xOCwxLjA3YzAuMTgsMC4xNSwwLjM2LDAuMjcsMC41NSwwLjQxICAgICBjMC4yNCwwLjE4LDAuNDcsMC4zNiwwLjcxLDAuNTJjMC4yMiwwLjE1LDAuNDYsMC4yOCwwLjY4LDAuNDJjMC4yMiwwLjEzLDAuNDMsMC4yNywwLjY2LDAuMzljMC4yNCwwLjEzLDAuNDgsMC4yMywwLjcyLDAuMzUgICAgIGMwLjIzLDAuMTEsMC40NiwwLjIzLDAuNywwLjMyYzAuMjQsMC4xLDAuNDgsMC4xOCwwLjcxLDAuMjZjMC4yNSwwLjA5LDAuNSwwLjE5LDAuNzYsMC4yN2MwLjI0LDAuMDcsMC40OCwwLjEzLDAuNzIsMC4xOSAgICAgYzAuMjYsMC4wNywwLjUzLDAuMTQsMC44LDAuMTljMC4yOCwwLjA2LDAuNTYsMC4wOSwwLjg0LDAuMTNjMC4yNCwwLjAzLDAuNDcsMC4wOCwwLjcxLDAuMWMwLjUyLDAuMDUsMS4wNSwwLjA4LDEuNTgsMC4wOCAgICAgczEuMDUtMC4wMywxLjU4LTAuMDhjMC4yNC0wLjAyLDAuNDctMC4wNywwLjcxLTAuMWMwLjI4LTAuMDQsMC41Ni0wLjA3LDAuODQtMC4xM2MwLjI3LTAuMDUsMC41My0wLjEzLDAuNzktMC4xOSAgICAgYzAuMjQtMC4wNiwwLjQ4LTAuMTEsMC43Mi0wLjE5YzAuMjYtMC4wOCwwLjUxLTAuMTgsMC43Ni0wLjI3YzAuMjQtMC4wOSwwLjQ4LTAuMTYsMC43MS0wLjI2YzAuMjQtMC4xLDAuNDctMC4yMSwwLjctMC4zMiAgICAgYzAuMjQtMC4xMSwwLjQ4LTAuMjIsMC43Mi0wLjM1YzAuMjItMC4xMiwwLjQ0LTAuMjYsMC42Ni0wLjM5YzAuMjMtMC4xNCwwLjQ2LTAuMjcsMC42OS0wLjQyYzAuMjQtMC4xNiwwLjQ3LTAuMzUsMC43MS0wLjUyICAgICBjMC4xOC0wLjE0LDAuMzctMC4yNiwwLjU1LTAuNDFjMC40MS0wLjM0LDAuODEtMC42OSwxLjE4LTEuMDdsMjkuNDMtMjkuNDNjNi4yNS02LjI1LDYuMjUtMTYuMzgsMC0yMi42MyAgICAgYy02LjI1LTYuMjUtMTYuMzgtNi4yNS0yMi42MywwbC0yLjEzLDIuMTNWNzcuMDJoNzYuNzVjOC44NCwwLDE2LTcuMTYsMTYtMTZTMjQxLjI0LDQ1LjAyLDIzMi40MSw0NS4wMnoiLz4KDTwvZz4KDTwvZz4KDTwvZz4KDTwvc3ZnPg==" alt="" aria-hidden="true">
          </button>
        </div>
      </header>
      <div id="civica-sections"></div>
      <div id="civica-game-section"></div>
      <div class="civica-final-score" id="civica-final-score-display">
        <h2>Tu puntaje</h2>
        <span class="score-number">- / 10</span>
        <p>Completa los ejercicios</p>
      </div>
      <div class="civica-center civica-pdf-actions">
        <button class="civica-btn civica-btn-accent" id="civica-pdf-btn" type="button">
          Descargar PDF para Classroom
        </button>
        <button class="civica-pdf-view-btn" id="civica-pdf-view-btn" type="button">
          Ver PDF
        </button>
        <p class="civica-pdf-help">
          En iPhone: usa Compartir &rarr; Guardar en Archivos.
        </p>
      </div>
    `;
    state.appRoot = appRoot;
    if (global.COEDUCA_OCEAN) global.COEDUCA_OCEAN.mount(cfg.examMode ? null : {
      student: state.student,
      activityId: 'civica:' + (cfg.id || cfg.topic),
      badgeId: 'civica-extra-badge',
      getGrade: () => getTotalScore().grade
    });
    renderHeaderStudents();

    if (cfg.examMode) {
      const addMemberBtn = document.getElementById('civica-add-member-btn');
      if (addMemberBtn) addMemberBtn.style.display = 'none';
    }

    document.getElementById('civica-add-member-btn').addEventListener('click', showAddMemberModal);
    document.getElementById('civica-switch-account-btn').addEventListener('click', switchAccount);
    document.getElementById('civica-pdf-btn').addEventListener('click', function () {
      generatePDF({ download: true });
    });
    document.getElementById('civica-pdf-view-btn').addEventListener('click', function () {
      generatePDF({ view: true });
    });

    if (global.COEDUCA_CLASSROOM) global.COEDUCA_CLASSROOM.mount(state, syncGameBonus);

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
        if (isCompletedAnswer(ex, previousAnswer)) {
          renderCompletedSummary(item.idx, ex, previousAnswer);
        } else {
          mountExercise(item.idx, ex);
        }
      });

    });

    if (cfg.game) renderGame(cfg.game);
    else document.getElementById('civica-game-section').replaceChildren();
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

  function mountExercise(idx, ex, restoreSaved = false) {
    const body = document.getElementById('civica-ex-body-' + idx);
    if (!body) return;
    body.innerHTML = '';
    const renderer = state.exerciseRegistry[ex.type];
    if (!renderer) {
      body.innerHTML = '<p style="color:red">Tipo de ejercicio desconocido: ' + escapeHTML(ex.type) + '</p>';
      return;
    }
    try {
      const previous = state.answers['ex_' + idx];
      let restoringDraft = previous && (restoreSaved || !isCompletedAnswer(ex, previous));
      renderer({
        container: body,
        exerciseId: 'ex_' + idx,
        data: getPoolData(ex),
        config: ex,
        previousAnswer: state.answers['ex_' + idx]?.userAnswer,
        examMode: !!(state.config && state.config.examMode),
        recordAnswer: (score, total, details, userAnswer) => {
          if (!restoringDraft) recordAnswer('ex_' + idx, score, total, details, userAnswer);
        },
        cheer: () => {
          if (global.rigo && global.rigo.cheer) global.rigo.cheer();
          sfx.play('victory');
        },
        comfort: () => {
          if (global.rigo && global.rigo.comfort) global.rigo.comfort();
          sfx.play('error');
        }
      });
      if (restoringDraft) restoreExerciseDraft(body, ex, previous.userAnswer);
      queueMicrotask(() => { restoringDraft = false; });
    } catch (err) {
      console.error('Error rendering exercise', ex.type, err);
      body.innerHTML = '<p style="color:red">Error: tipo "' + ex.type + '" no disponible</p>';
    }
  }

  function renderCompletedSummary(idx, ex, ans) {
    const body = document.getElementById('civica-ex-body-' + idx);
    if (!body) return;
    if (state.config?.examMode) {
      body.innerHTML = `
        <div class="civica-panel" style="padding:18px;text-align:center;">
          <strong>COMPLETADO</strong>
          <p>Respuestas guardadas automáticamente.</p>
          <button type="button" class="civica-btn civica-btn-info" data-edit-idx="${idx}">Editar respuestas</button>
          <button type="button" class="civica-btn" data-retry-idx="${idx}">Volver a intentar</button>
        </div>`;
      body.querySelector('[data-edit-idx]').addEventListener('click', () => mountExercise(idx, ex, true));
      body.querySelector('[data-retry-idx]').addEventListener('click', () => retryExercise(idx));
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

    async function lookup(nie) {
        if (global.COEDUCA_CLASSROOM) return global.COEDUCA_CLASSROOM.lookup(nie);
      const DB = getStudentRoster();
      if (!DB) return null;
      const clean = String(nie || '').trim();
      return clean && DB[clean] ? { nie: clean, ...DB[clean] } : null;
    }

    async function validate() {
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
      let found;try{found=await lookup(v);}catch(error){if(inp.value.trim()!==v)return;err.textContent=error.message;err.classList.add('show');return;}
      if(inp.value.trim()!==v||!overlay.isConnected)return;
      if (!found) {
        info.classList.remove('show');
        if (v.length >= 4) { err.textContent = 'NIE no encontrado'; err.classList.add('show'); }
        else err.classList.remove('show');
        return;
      }
      if (!isAllowedStudent(found)) {
        info.classList.remove('show');
        err.textContent = 'Este estudiante no pertenece a las aulas de esta actividad.';
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
      <div class="civica-audio" data-audio-player="${idx}">
        <button class="civica-audio-btn" data-audio-idx="${idx}" type="button"
                aria-label="Reproducir audio" aria-pressed="false">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="civica-audio-main">
          <div class="civica-audio-heading">
            <span class="civica-audio-label">Escuchar</span>
            <span class="civica-audio-time" aria-live="off">0:00 / --:--</span>
          </div>
          <div class="civica-audio-controls">
            <input class="civica-audio-progress" data-audio-idx="${idx}"
                   type="range" min="0" max="1" value="0" step="0.01"
                   aria-label="Progreso del audio" aria-valuetext="0:00 de --:--" disabled>
            <label class="civica-audio-speed-wrap">
              <select class="civica-audio-speed" data-audio-idx="${idx}"
                      aria-label="Velocidad de reproduccion">
                <option value="0.5">0.5&times;</option>
                <option value="0.75">0.75&times;</option>
                <option value="1" selected>1&times;</option>
                <option value="1.25">1.25&times;</option>
                <option value="1.5">1.5&times;</option>
                <option value="2">2&times;</option>
              </select>
            </label>
          </div>
        </div>
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
            <div class="civica-section-title">Juego del día</div>
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
          student: state.student,
          hideAvatarButton: true,
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

  const AUDIO_PLAY_ICON = '<path d="M8 5v14l11-7z"/>';
  const AUDIO_PAUSE_ICON = '<path d="M6 6h4v12H6zm8 0h4v12h-4z"/>';

  function formatAudioTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
      return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }
    return minutes + ':' + String(secs).padStart(2, '0');
  }

  function setAudioButtonState(audio, isPlaying) {
    const player = audio.closest('.civica-audio');
    if (!player) return;
    const btn = player.querySelector('.civica-audio-btn');
    if (!btn) return;
    const svg = btn.querySelector('svg');
    if (svg) svg.innerHTML = isPlaying ? AUDIO_PAUSE_ICON : AUDIO_PLAY_ICON;
    btn.classList.toggle('civica-playing', isPlaying);
    btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    btn.setAttribute('aria-label', isPlaying ? 'Pausar audio' : 'Reproducir audio');
  }

  function syncAudioProgress(audio, preferredTime) {
    const player = audio.closest('.civica-audio');
    if (!player) return;
    const progress = player.querySelector('.civica-audio-progress');
    const time = player.querySelector('.civica-audio-time');
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const requestedTime = Number.isFinite(preferredTime) ? preferredTime : audio.currentTime;
    const current = Number.isFinite(requestedTime) && requestedTime > 0
      ? Math.min(requestedTime, duration || requestedTime)
      : 0;
    const durationLabel = duration ? formatAudioTime(duration) : '--:--';
    const currentLabel = formatAudioTime(current);

    if (progress) {
      progress.max = duration || 1;
      progress.value = current;
      progress.disabled = !duration;
      const percent = duration ? Math.min(100, (current / duration) * 100) : 0;
      progress.style.setProperty('--civica-audio-progress', percent + '%');
      progress.setAttribute('aria-valuetext', currentLabel + ' de ' + durationLabel);
    }
    if (time) time.textContent = currentLabel + ' / ' + durationLabel;
  }

  function initializeAudioPlayer(audio) {
    if (!audio || audio.dataset.enhancedControls === 'true') return;
    audio.dataset.enhancedControls = 'true';
    audio.preservesPitch = true;
    if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;

    const player = audio.closest('.civica-audio');
    if (!player) return;
    const progress = player.querySelector('.civica-audio-progress');
    const speed = player.querySelector('.civica-audio-speed');
    let pendingSeekTime = null;
    let pendingSeekTimer = null;

    const syncPosition = () => syncAudioProgress(audio, pendingSeekTime);
    const finishPendingSeek = (force) => {
      if (pendingSeekTime === null) return;
      const arrivedAtSelection =
        Number.isFinite(audio.currentTime) &&
        Math.abs(audio.currentTime - pendingSeekTime) < 0.5;
      if (!force && (audio.seeking || !arrivedAtSelection)) return;
      if (pendingSeekTimer !== null) clearTimeout(pendingSeekTimer);
      pendingSeekTimer = null;
      pendingSeekTime = null;
      syncAudioProgress(audio);
    };

    audio.addEventListener('loadedmetadata', syncPosition);
    audio.addEventListener('durationchange', syncPosition);
    audio.addEventListener('timeupdate', syncPosition);
    audio.addEventListener('seeked', () => finishPendingSeek(false));
    audio.addEventListener('play', () => setAudioButtonState(audio, true));
    audio.addEventListener('pause', () => setAudioButtonState(audio, false));
    audio.addEventListener('ended', () => {
      setAudioButtonState(audio, false);
      syncAudioProgress(audio);
    });
    audio.addEventListener('error', () => {
      if (progress) progress.disabled = true;
      const time = player.querySelector('.civica-audio-time');
      if (time) time.textContent = 'Audio no disponible';
      setAudioButtonState(audio, false);
    });

    if (progress) {
      const seekToSelectedTime = () => {
        const duration = Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : 0;
        const selectedTime = Number(progress.value);
        if (!duration || !Number.isFinite(selectedTime)) return;
        const nextTime = Math.max(0, Math.min(selectedTime, duration));

        // Safari puede conservar currentTime=0 durante unos instantes mientras
        // procesa el salto. Mantenemos visible la elección hasta recibir seeked.
        pendingSeekTime = nextTime;
        syncPosition();
        try {
          audio.currentTime = nextTime;
        } catch (_) {
          finishPendingSeek(true);
          return;
        }
        if (pendingSeekTimer !== null) clearTimeout(pendingSeekTimer);
        pendingSeekTimer = setTimeout(() => finishPendingSeek(true), 1500);
      };
      progress.addEventListener('input', seekToSelectedTime);
      progress.addEventListener('change', seekToSelectedTime);
    }

    if (speed) {
      speed.addEventListener('change', () => {
        const nextRate = Number(speed.value);
        if (Number.isFinite(nextRate) && nextRate >= 0.5 && nextRate <= 2) {
          audio.playbackRate = nextRate;
          audio.defaultPlaybackRate = nextRate;
        }
      });
    }

    syncAudioProgress(audio);
  }

  function setupAudioButtons() {
    document.querySelectorAll('.civica-audio audio').forEach(initializeAudioPlayer);

    document.body.addEventListener('click', e => {
      const btn = e.target.closest('.civica-audio-btn');
      if (!btn) return;
      const idx = btn.dataset.audioIdx;
      const audio = document.getElementById('civica-audio-' + idx);
      if (!audio) return;
      initializeAudioPlayer(audio);
      if (audio.paused) {
        document.querySelectorAll('.civica-audio audio').forEach(otherAudio => {
          if (otherAudio !== audio) otherAudio.pause();
        });
        if (audio.ended) audio.currentTime = 0;
        audio.play().catch(() => setAudioButtonState(audio, false));
      } else {
        audio.pause();
      }
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
    if (state.config?.examMode) return 'Ref. ' + year + '-' + hash;
    return 'Ref. ' + romans + '-' + year + '-' + hash;
  }

  // =====================================================================
  // PDF GENERATION (paleta editorial fija, independiente del tema de la web)
  // =====================================================================
  // Safari en iPhone/iPad no siempre respeta <a download> con blob URLs.
  // En iOS preferimos compartir el File nativo. Para "Ver PDF" se abre una
  // pestana vacia durante el toque y se navega cuando el PDF esta listo.
  function isIOSDevice() {
    const nav = global.navigator || {};
    const ua = nav.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  }

  function canSharePDFFile() {
    const nav = global.navigator || {};
    if (!isIOSDevice() || typeof global.File !== 'function' ||
        typeof nav.share !== 'function' || typeof nav.canShare !== 'function') {
      return false;
    }
    try {
      const testFile = new global.File([''], 'resultado.pdf', { type: 'application/pdf' });
      return nav.canShare({ files: [testFile] });
    } catch (_) {
      return false;
    }
  }

  function preparePDFViewer() {
    try {
      const viewer = global.open('about:blank', '_blank');
      if (viewer) {
        viewer.document.title = 'Generando PDF...';
        viewer.document.body.textContent = 'Generando PDF...';
      }
      return viewer;
    } catch (_) {
      return null;
    }
  }

  function openPDFUrl(url, preparedViewer, allowSameTab) {
    try {
      if (preparedViewer && !preparedViewer.closed) {
        preparedViewer.location.replace(url);
        return true;
      }
    } catch (_) {}
    try {
      const opened = global.open(url, '_blank');
      if (opened) return true;
    } catch (_) {}
    if (allowSameTab) {
      global.location.href = url;
      return true;
    }
    return false;
  }

  function deliverPDF(blob, filename, opts, preparedViewer, shareOnIOS) {
    const nav = global.navigator || {};

    if (shareOnIOS) {
      try {
        const file = new global.File([blob], filename, { type: 'application/pdf' });
        const sharing = nav.share({
          files: [file],
          title: filename
        });
        if (sharing && typeof sharing.catch === 'function') {
          sharing.catch(function (error) {
            if (!error || error.name !== 'AbortError') {
              console.error('No se pudo compartir el PDF:', error);
              alert('No se pudo abrir el menu de iPhone. Pulsa "Ver PDF" para guardarlo manualmente.');
            }
          });
        }
        return { blob: blob, file: file, filename: filename, delivery: 'share' };
      } catch (error) {
        console.error('No se pudo iniciar la funcion Compartir:', error);
      }
    }

    const url = URL.createObjectURL(blob);
    const wantsViewer = !!opts.view || !!opts.preview;
    if (wantsViewer || isIOSDevice()) {
      const opened = openPDFUrl(url, preparedViewer, !!opts.view || isIOSDevice());
      if (!opened) {
        alert('Safari bloqueo el visor. Permite las ventanas emergentes y pulsa "Ver PDF" otra vez.');
      }
      setTimeout(function () { URL.revokeObjectURL(url); }, 10 * 60 * 1000);
      return { blob: blob, url: url, filename: filename, delivery: 'viewer' };
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
    setTimeout(function () { URL.revokeObjectURL(url); }, 60 * 1000);
    return { blob: blob, url: url, filename: filename, delivery: 'download' };
  }

  function generatePDF(opts) {
    opts = opts || {};
    if (!global.jspdf || !global.jspdf.jsPDF) {
      const msg = 'jsPDF no está cargado (revisa la conexión a internet, ' +
                  'el CDN de jspdf debe estar accesible)';
      if (!opts.returnDataUrl) alert('Error: ' + msg);
      return { error: msg };
    }
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });

    const cfg = state.config;
    if (!cfg) {
      return { error: 'state.config no está inicializado (llamar CIVICA.init primero)' };
    }
    const design = Object.prototype.hasOwnProperty.call(CV_DESIGN_RENDERERS, cfg.pdfDesign) ? cfg.pdfDesign : 'Default';
    const stu = state.student || { nie: '-', name: '-', grade: '-' };
    const partners = (state.partners && state.partners.length)
      ? state.partners
      : (state.partner ? [state.partner] : []);
    const score = getTotalScore();
    const today = new Date().toLocaleDateString('es-SV');

    // Si no se hizo login (modo de previsualización), construimos
    // flatExercises ahora para no romper los renderers.
    if (!state.flatExercises || state.flatExercises.length === 0) {
      try { buildFlatExercises(); } catch (_) {}
    }

    const T = cvBuildTheme(design);
    const S = CV_SEMANTIC_COLORS;
    const helpers = cvMakeHelpers(doc, T);
    const refCode = buildReferenceCode(score.grade, stu.nie, cfg.topic);

    const ctx = {
      doc, design, T, S, helpers, cfg, stu, partners, score, today,
      state, sanitize: sanitizeForPDF, refCode,
    };

    const iosDownload = !opts.returnDataUrl && !opts.view && !opts.preview && isIOSDevice();
    const shareOnIOS = iosDownload && canSharePDFFile();
    const preparedViewer = !opts.returnDataUrl &&
      (!!opts.view || (iosDownload && !shareOnIOS))
      ? preparePDFViewer()
      : null;

    try {
      const renderer = CV_DESIGN_RENDERERS[design];
      renderer(ctx);

      // Nombre del PDF: tema primero, estudiante después. Así, cuando un
      // estudiante acumula varios PDFs, identifica rápido cuál es cuál.
      const filename = sanitizeForPDF(cfg.topic || 'tarea').replace(/\s+/g, '_') + '_' +
                       sanitizeForPDF(stu.name).replace(/\s+/g, '_') + '.pdf';
      if (opts.returnDataUrl) {
        return { dataUrl: doc.output('datauristring'), filename: filename };
      }
      const blob = doc.output('blob');
      return deliverPDF(blob, filename, opts, preparedViewer, shareOnIOS);
    } catch (e) {
      if (preparedViewer && !preparedViewer.closed) preparedViewer.close();
      console.error('PDF error:', e);
      const msg = (e && e.message) ? e.message : String(e);
      if (!opts.returnDataUrl) alert('No se pudo generar el PDF: ' + msg);
      return { error: msg, stack: (e && e.stack) ? e.stack : null };
    }
  }

  const CV_SEMANTIC_COLORS = {
    white:[255,255,255], green:[34,197,94], red:[220,38,38],
    amber:[245,158,11], gray:[138,138,138], darkGray:[74,74,74],
    lightGray: [238, 238, 238],
  };

  function cvLum(rgb) { return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]; }
  function cvReadable(rgb) { return cvLum(rgb) > 160 ? [26,26,26] : [255,255,255]; }
  function cvMix(a, b, t) {
    return [Math.round(a[0]*(1-t)+b[0]*t), Math.round(a[1]*(1-t)+b[1]*t), Math.round(a[2]*(1-t)+b[2]*t)];
  }
  function cvLighten(rgb, t) { return cvMix(rgb, [255,255,255], t); }
  function cvDarken(rgb, t)  { return cvMix(rgb, [0,0,0], t); }

  function cvBuildTheme(design) {
    const designDefaults = {
      'Default':        { useEditorial: true,                  font: 'helvetica', radius: 3 },
      'PopArt':         { useStrokes: true,  useHalftone: true, font: 'helvetica', radius: 0 },
      'PopArtVibrant':  { useStrokes: true,  useStripes:  true, font: 'helvetica', radius: 0 },
      'Colorido':       { useStrokes: false, useCards:    true, font: 'helvetica', radius: 2 },
      'Pastel':         { useStrokes: false, useSoft:     true, font: 'helvetica', radius: 4 },
      'HollyHobbie':    { useStrokes: false, useDashed:   true, font: 'times',     radius: 1 },
    };
    // Los tres acentos pertenecen a las etapas, nunca al tema de la app/web.
    const primary = [56, 189, 248];
    const accent = [250, 204, 21];
    const bg = [255, 253, 248];
    const cardBg = [255, 255, 255];
    const text = [28, 48, 61];
    const opts = designDefaults[design] || designDefaults['Default'];

    return Object.assign({}, opts, {
      primary: primary, accent: accent, bg: bg, cardBg: cardBg, text: text,
      // Conservar acentos por sección (azul/verde/amarillo) para Civica:
      explore:     [56, 189, 248],
      deepen:      [34, 197, 94],
      consolidate: [250, 204, 21],
      dark: text,
      onPrimary: cvReadable(primary),
      onAccent:  cvReadable(accent),
      divider:   cvMix(text, cardBg, 0.7),
      mutedText: cvMix(text, cardBg, 0.28),
      bgSoft:    cvLighten(bg, 0.2),
      softBg:    cvLighten(bg, 0.35),
    });
  }

  function cvMakeHelpers(doc, T) {
    function fillBox(x, y, w, h, c, r) {
      doc.setFillColor(c[0], c[1], c[2]);
      if (r && r > 0) doc.roundedRect(x, y, w, h, r, r, 'F');
      else doc.rect(x, y, w, h, 'F');
    }
    function borderedBox(x, y, w, h, fill, brd, lw, r) {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.setDrawColor(brd[0], brd[1], brd[2]);
      doc.setLineWidth(lw || 0.4);
      if (r && r > 0) doc.roundedRect(x, y, w, h, r, r, 'FD');
      else doc.rect(x, y, w, h, 'FD');
    }
    function shadowBox(x, y, w, h, fill, r) {
      if (T.useStrokes) {
        doc.setFillColor(T.text[0], T.text[1], T.text[2]);
        if (r && r > 0) doc.roundedRect(x + 1.5, y + 1.5, w, h, r, r, 'F');
        else doc.rect(x + 1.5, y + 1.5, w, h, 'F');
      }
      fillBox(x, y, w, h, fill, r);
    }
    function setText(c, style, size) {
      doc.setTextColor(c[0], c[1], c[2]);
      doc.setFont(T.font, style || 'normal');
      doc.setFontSize(size || 10);
    }
    function hline(x1, x2, y, c, lw) {
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setLineWidth(lw || 0.3);
      doc.line(x1, y, x2, y);
    }
    function dashedLine(x1, y1, x2, y2, c, lw, d) {
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setLineWidth(lw || 0.4);
      doc.setLineDashPattern([d || 1.2, (d || 1.2) * 0.8], 0);
      doc.line(x1, y1, x2, y2);
      doc.setLineDashPattern([], 0);
    }
    function dashedRect(x, y, w, h, c, lw, d) {
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setLineWidth(lw || 0.4);
      doc.setLineDashPattern([d || 1.4, (d || 1.4) * 0.8], 0);
      doc.rect(x, y, w, h);
      doc.setLineDashPattern([], 0);
    }
    function halftone(x, y, w, h, c, step, rad) {
      doc.setFillColor(c[0], c[1], c[2]);
      const s = step || 2.6, r = rad || 0.45;
      for (let py = y + s / 2; py < y + h; py += s) {
        let offX = ((Math.floor((py - y) / s)) % 2 === 0) ? 0 : s / 2;
        for (let px = x + s / 2 + offX; px < x + w; px += s) doc.circle(px, py, r, 'F');
      }
    }
    function stripes(x, y, w, h, c, gap) {
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setLineWidth(0.4);
      const g = gap || 2.2;
      for (let i = -h; i < w + h; i += g) doc.line(x + i, y, x + i + h, y + h);
    }
    function notebookGrid(x, y, w, h, c, step) {
      doc.setDrawColor(c[0], c[1], c[2]);
      doc.setLineWidth(0.12);
      const s = step || 4;
      for (let gx = x; gx <= x + w + 0.01; gx += s) doc.line(gx, y, gx, y + h);
      for (let gy = y; gy <= y + h + 0.01; gy += s) doc.line(x, gy, x + w, gy);
    }
    return { fillBox, borderedBox, shadowBox, setText, hline, dashedLine, dashedRect, halftone, stripes, notebookGrid };
  }

  const CV_PAGE = { W: 215.9, H: 279.4 };
  const CV_CONTENT_BOTTOM = CV_PAGE.H - 25;

  function cvPdfLines(ctx, text, width, style, size) {
    ctx.helpers.setText(ctx.T.text, style || 'normal', size || 9);
    return ctx.doc.splitTextToSize(ctx.sanitize(text) || '-', width);
  }

  function cvFitPdfText(ctx, text, width) {
    let value = ctx.sanitize(text).replace(/\s+/g, ' ');
    if (ctx.doc.getTextWidth(value) <= width) return value;
    while (value.length && ctx.doc.getTextWidth(value + '...') > width) value = value.slice(0, -1);
    return value.trim() + '...';
  }

  // Curvas Bézier nativas: decoración vectorial, sin imágenes ni ilustraciones.
  function cvOrganicCorner(ctx, x, y, w, h, color, flipX, flipY) {
    ctx.doc.setFillColor(color[0], color[1], color[2]);
    ctx.doc.lines([
      [w, 0],
      [0, h * 0.45, -w * 0.32, h * 0.48, -w * 0.52, h * 0.53],
      [-w * 0.29, h * 0.02, -w * 0.22, h * 0.41, -w * 0.48, h * 0.47],
      [0, -h]
    ], x, y, [flipX ? -1 : 1, flipY ? -1 : 1], 'F', true);
  }

  function cvEditorialPage(ctx, continuation) {
    const { doc, T, helpers, cfg } = ctx;
    const W = CV_PAGE.W, H = CV_PAGE.H;
    helpers.fillBox(0, 0, W, H, T.bg);
    cvOrganicCorner(ctx, 0, 4, 38, 28, cvLighten(T.explore, 0.78));
    cvOrganicCorner(ctx, W, 4, 33, 33, cvLighten(T.consolidate, 0.72), true);
    cvOrganicCorner(ctx, 0, H, 39, 17, cvLighten(T.deepen, 0.82), false, true);
    cvOrganicCorner(ctx, W, H, 29, 18, cvLighten(T.explore, 0.84), true, true);
    doc.setDrawColor(222, 229, 224);
    doc.setLineWidth(0.3);
    doc.roundedRect(8, 8, W - 16, H - 28, 5, 5, 'S');
    [T.explore, T.deepen, T.consolidate].forEach(function (color, i) {
      helpers.fillBox(W * i / 3, 0, W / 3, 4, color);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(W - 4.5, 92 + i * 5, 0.8, 'F');
      doc.circle(4.5, 186 + i * 5, 0.8, 'F');
    });
    if (continuation) {
      helpers.setText(T.mutedText, 'bold', 7);
      doc.text('CIUDADANÍA Y VALORES / ' + (cfg.examMode ? 'EXAMEN' : 'ACTIVIDAD'), 14, 14);
      helpers.setText(T.text, 'bold', 9);
      doc.text(cvFitPdfText(ctx, cfg.topic || 'Sesión', W - 28), 14, 21);
    }
    return 31;
  }

  function cvNextPage(ctx) {
    ctx.doc.addPage();
    return ctx.T.useEditorial ? cvEditorialPage(ctx, true) : 18;
  }

  function cvEditorialTeam(ctx, y, opts) {
    const { doc, T, helpers, stu, partners } = ctx;
    const M = opts.M, w = opts.contentW;
    const headingH = 8, lineH = 4.2, rowPadding = 4, radius = 2;
    const headerColor = cvLighten(T.explore, 0.88);
    const borderColor = cvLighten(T.explore, 0.55);
    const entries = [{ label: 'Estudiante', person: stu }].concat(partners.map(function (p, i) {
      return { label: 'Compañero ' + (i + 1), person: p };
    }));
    const rows = [];
    // Una página de continuación empieza en y=31. Divide datos excepcionalmente
    // largos antes de agrupar las filas, sin perder nombres ni identificadores.
    const maxRowLines = Math.max(1, Math.floor((CV_CONTENT_BOTTOM - 31 - headingH - rowPadding) / lineH));
    entries.forEach(function (entry) {
      const nameLines = cvPdfLines(ctx, entry.person.name || '-', w - 79, 'bold', 9);
      const nieLines = cvPdfLines(ctx, 'NIE: ' + (entry.person.nie || '-'), 34, 'normal', 8);
      const lineCount = Math.max(nameLines.length, nieLines.length);
      for (let offset = 0; offset < lineCount; offset += maxRowLines) {
        const names = nameLines.slice(offset, offset + maxRowLines);
        const nies = nieLines.slice(offset, offset + maxRowLines);
        rows.push({
          label: entry.label,
          nameLines: names,
          nieLines: nies,
          height: Math.max(10, Math.max(names.length, nies.length) * lineH + rowPadding)
        });
      }
    });

    function centeredCell(lines, x, top, height, lineHeightFactor) {
      const step = doc.getFontSize() / doc.internal.scaleFactor * lineHeightFactor;
      const firstY = top + height / 2 - (lines.length - 1) * step / 2;
      lines.forEach(function (line, index) {
        doc.text(line, x, firstY + index * step, { baseline: 'middle' });
      });
    }

    let first = 0;
    while (first < rows.length) {
      // El encabezado siempre permanece junto a la primera fila del bloque.
      if (y + headingH + rows[first].height > CV_CONTENT_BOTTOM) y = cvNextPage(ctx);
      let end = first, tableH = headingH;
      while (end < rows.length && y + tableH + rows[end].height <= CV_CONTENT_BOTTOM) {
        tableH += rows[end].height;
        end += 1;
      }

      // Recorta los dos fondos al mismo contorno; solo las cuatro esquinas
      // exteriores se redondean, no la unión entre encabezado y datos.
      doc.saveGraphicsState();
      doc.roundedRect(M, y, w, tableH, radius, radius, null);
      doc.clip();
      doc.discardPath();
      helpers.fillBox(M, y, w, tableH, T.cardBg);
      helpers.fillBox(M, y, w, headingH, headerColor);
      doc.restoreGraphicsState();

      helpers.setText(T.text, 'bold', 8);
      doc.text(partners.length ? 'EQUIPO DE TRABAJO' : 'DATOS DEL ESTUDIANTE', M + 5, y + headingH / 2, { baseline: 'middle' });
      helpers.setText(T.mutedText, 'normal', 8);
      doc.text(cvFitPdfText(ctx, stu.grade || '-', w * 0.4), M + w - 5, y + headingH / 2, { align: 'right', baseline: 'middle' });
      helpers.hline(M, M + w, y + headingH, T.divider, 0.25);
      doc.line(M + 31, y + headingH, M + 31, y + tableH);
      doc.line(M + w - 41, y + headingH, M + w - 41, y + tableH);

      let rowY = y + headingH;
      for (let index = first; index < end; index += 1) {
        const row = rows[index];
        if (index > first) helpers.hline(M, M + w, rowY, T.divider, 0.25);
        helpers.setText(T.mutedText, 'normal', 8);
        doc.text(row.label, M + 5, rowY + row.height / 2, { baseline: 'middle' });
        helpers.setText(T.text, 'bold', 9);
        centeredCell(row.nameLines, M + 36, rowY, row.height, 1.3);
        helpers.setText(T.mutedText, 'normal', 8);
        centeredCell(row.nieLines, M + w - 37, rowY, row.height, 1.45);
        rowY += row.height;
      }
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, w, tableH, radius, radius, 'S');
      y += tableH;
      first = end;
      if (first < rows.length) y = cvNextPage(ctx);
    }
    return y + 9;
  }

  function cvEditorialExercise(ctx, item, exNum, y, opts) {
    const { doc, T, helpers, state, cfg } = ctx;
    const M = opts.M, w = opts.contentW, color = opts.secColor;
    const ex = item.ex, ans = state.answers['ex_' + item.idx];
    const titleLines = cvPdfLines(ctx, ex.title || ('Ejercicio ' + exNum), w - 53, 'bold', 10);
    const headerH = Math.max(15, titleLines.length * 4.6 + 8);
    if (y + headerH > CV_CONTENT_BOTTOM) {
      y = cvNextPage(ctx);
      y = cvSectionHeader(ctx, opts.secMeta, y, opts);
    }
    helpers.borderedBox(M, y, w, headerH, T.cardBg, cvLighten(color, 0.62), 0.3, 2.5);
    helpers.fillBox(M + 3, y + 4, 7, 7, cvLighten(color, 0.3), 2);
    helpers.setText(T.text, 'bold', 8);
    doc.text(String(exNum), M + 6.5, y + 8.7, { align: 'center' });
    helpers.setText(T.text, 'bold', 10);
    doc.text(titleLines, M + 13, y + 8, { lineHeightFactor: 1.3 });
    const completed = ans && isCompletedAnswer(ex, ans);
    const badgeText = completed ? 'Completado' : ans ? 'En progreso' : 'Pendiente';
    const badgeColor = completed ? cvLighten(T.deepen, 0.85) : cvLighten(T.consolidate, 0.82);
    helpers.fillBox(M + w - 33, y + (headerH - 7) / 2, 29, 7, badgeColor, 3.5);
    helpers.setText(T.text, 'bold', 7);
    doc.text(badgeText, M + w - 18.5, y + headerH / 2 + 0.9, { align: 'center' });
    y += headerH + 5;

    // El examen conserva su política: no revelar respuestas ni resultados.
    if (!cfg.examMode && !cfg.pdfHideDetails && ans && Array.isArray(ans.details)) {
      ans.details.forEach(function (detail) {
        const lines = cvPdfLines(ctx, detail, w - 18, 'normal', 8.5);
        lines.forEach(function (line) {
          if (y + 4.2 > CV_CONTENT_BOTTOM) {
            y = cvNextPage(ctx);
            y = cvSectionHeader(ctx, opts.secMeta, y, opts);
            helpers.setText(T.mutedText, 'italic', 8);
            doc.text('Ejercicio ' + exNum + ' (continuación)', M + 5, y);
            y += 6;
          }
          doc.setDrawColor(color[0], color[1], color[2]);
          doc.setLineWidth(0.5);
          doc.line(M + 4, y - 2.7, M + 4, y + 1);
          helpers.setText(T.mutedText, 'normal', 8.5);
          doc.text(line, M + 9, y);
          y += 4.2;
        });
        y += 2;
      });
    }
    return y + 3;
  }

  // Renderer común de un ejercicio civica (muestra título y badge Completado/Pendiente)
  function cvExerciseRow(ctx, item, exNum, y, opts) {
    if (ctx.T.useEditorial) return cvEditorialExercise(ctx, item, exNum, y, opts);
    const { doc, T, S, helpers, sanitize, state, cfg } = ctx;
    const { setText, fillBox, hline, dashedLine, borderedBox, dashedRect } = helpers;
    const M = opts.M, contentW = opts.contentW, right = opts.right, secColor = opts.secColor;
    const ex = item.ex;
    const ans = state.answers['ex_' + item.idx];
    const title = sanitize(ex.title || ('Ejercicio ' + exNum));
    let isNewPage = false;
    if (y > CV_PAGE.H - 35) { doc.addPage(); y = 18; isNewPage = true; }
    if (exNum > 1 && !isNewPage) {
      if (T.useDashed) dashedLine(M + 4, y - 4, right, y - 4, T.divider, 0.3, 0.9);
      else hline(M + 4, right, y - 4, T.divider, 0.25);
    }

    // Marcador numérico
    if (T.useStrokes) {
      doc.setFillColor(secColor[0], secColor[1], secColor[2]);
      doc.setDrawColor(T.text[0], T.text[1], T.text[2]);
      doc.setLineWidth(0.5);
      doc.rect(M, y - 4, 7, 7, 'FD');
    } else if (T.useDashed) {
      dashedRect(M, y - 4, 7, 7, secColor, 0.5, 0.8);
    } else {
      doc.setFillColor(secColor[0], secColor[1], secColor[2]);
      doc.roundedRect(M, y - 4, 7, 7, 1.5, 1.5, 'F');
    }
    setText(T.useDashed ? secColor : T.onPrimary, 'bold', 8);
    doc.text(String(exNum), M + 3.5, y + 0.7, { align: 'center' });

    setText(T.text, 'bold', 10);
    doc.text(title, M + 10, y);

    let badgeColor = S.lightGray, badgeText = 'Pendiente', badgeTC = S.gray, dotColor = null;
    if (ans) {
      const pct = ans.total > 0 ? ans.score / ans.total : 0;
      badgeText = isCompletedAnswer(ex, ans) ? 'Completado' : 'En progreso';
      badgeColor = T.cardBg; badgeTC = T.mutedText;
      if (!cfg.examMode) {
        if (pct >= 0.7) dotColor = S.green;
        else if (pct >= 0.4) dotColor = S.amber;
        else dotColor = S.red;
      }
    }
    const bw = 32, bh = 6, bx = right - bw, by = y - 4.5;
    borderedBox(bx, by, bw, bh, badgeColor, T.divider, 0.3, T.radius);
    setText(badgeTC, 'bold', 7.5);
    if (dotColor) {
      doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
      doc.circle(bx + 3.2, by + 3, 1.1, 'F');
      doc.text(badgeText, bx + bw / 2 + 1.2, by + 4.1, { align: 'center' });
    } else {
      doc.text(badgeText, bx + bw / 2, by + 4.1, { align: 'center' });
    }
    y += 5;
    if (!cfg.examMode && !cfg.pdfHideDetails && ans && ans.details && Array.isArray(ans.details) && ans.details.length) {
      setText(T.mutedText, 'normal', 8);
      ans.details.forEach(function (d) {
        if (y > CV_PAGE.H - 20) { doc.addPage(); y = 18; }
        const line = '  ' + sanitize(d);
        const split = doc.splitTextToSize(line, contentW - 10);
        doc.text(split, M + 9, y);
        y += split.length * 3.6;
      });
      y += 1;
    }
    return y + 8;
  }

  function cvStateBand(ctx, y, opts) {
    const { doc, T, helpers, today } = ctx;
    const M = opts.M, contentW = opts.contentW;
    const { borderedBox, fillBox, setText, dashedRect } = helpers;
    if (T.useEditorial) {
      if (y + 17 > CV_CONTENT_BOTTOM) y = cvNextPage(ctx);
      borderedBox(M, y, contentW, 16, cvLighten(T.deepen, 0.92), cvLighten(T.deepen, 0.65), 0.3, 3);
      fillBox(M + 4, y + 4, 2, 8, T.deepen, 1);
      setText(T.mutedText, 'bold', 7);
      doc.text('ESTADO DE LA ENTREGA', M + 10, y + 5.5);
      setText(T.text, 'bold', 10);
      doc.text('Tarea entregada', M + 10, y + 11.5);
      setText(T.mutedText, 'normal', 8);
      doc.text(today, opts.right - 5, y + 9.5, { align: 'right' });
      return y + 23;
    }
    if (T.useDashed) dashedRect(M, y, contentW, 14, T.primary, 0.5, 1.2);
    else {
      borderedBox(M, y, contentW, 14, T.bgSoft, T.divider, 0.4, T.radius);
      fillBox(M, y, 3, 14, T.primary);
    }
    setText(T.mutedText, 'bold', 8);
    doc.text('ESTADO', M + 8, y + 5.5);
    setText(T.text, 'bold', 11);
    doc.text('Tarea entregada', M + 8, y + 11);
    setText(T.mutedText, 'normal', 9);
    doc.text(today, opts.right - 5, y + 9, { align: 'right' });
    return y + 20;
  }

  function cvTeamLinear(ctx, y, opts) {
    if (ctx.T.useEditorial) return cvEditorialTeam(ctx, y, opts);
    const { doc, T, S, helpers, sanitize, stu, partners } = ctx;
    const M = opts.M, contentW = opts.contentW;
    const { borderedBox, fillBox, setText, hline, dashedRect, dashedLine } = helpers;
    const teamRows = 2 + partners.length;
    const teamH = 10 + teamRows * 7 + 4;
    if (T.useDashed) dashedRect(M, y, contentW, teamH, T.primary, 0.5, 1.2);
    else {
      borderedBox(M, y, contentW, teamH, T.cardBg, T.divider, 0.4, T.radius);
      fillBox(M, y, 3, teamH, T.primary);
    }
    setText(T.mutedText, 'bold', 8);
    doc.text('EQUIPO', M + 8, y + 6);
    if (T.useDashed) dashedLine(M + 3, y + 8.5, M + contentW, y + 8.5, T.divider, 0.35, 0.8);
    else hline(M + 3, M + contentW, y + 8.5, T.divider, 0.3);

    let yy = y + 13;
    const col1 = M + 8, col2 = M + 38;
    setText(T.text, 'bold', 9);
    doc.text('Estudiante:', col1, yy);
    setText(T.mutedText, 'normal', 9);
    doc.text(sanitize(stu.name) + '  (NIE: ' + sanitize(stu.nie) + ')', col2, yy);
    yy += 7;
    setText(T.text, 'bold', 9);
    doc.text('Grado:', col1, yy);
    setText(T.mutedText, 'normal', 9);
    doc.text(sanitize(stu.grade), col2, yy);
    yy += 7;
    if (partners.length === 0) {
      setText(S.gray, 'italic', 9);
      doc.text('Trabajo individual', col1, yy);
    } else {
      partners.forEach(function (p, i) {
        setText(T.text, 'bold', 9);
        doc.text('Compañero ' + (i + 1) + ':', col1, yy);
        setText(T.mutedText, 'normal', 9);
        doc.text(sanitize(p.name) + '  (NIE: ' + sanitize(p.nie) + ')', col2, yy);
        yy += 7;
      });
    }
    return y + teamH + 10;
  }

  function cvTeamCards(ctx, y, opts) {
    const { doc, T, helpers, sanitize, stu, partners } = ctx;
    const M = opts.M, contentW = opts.contentW;
    const all = [{ role: 'Estudiante', p: stu, primary: true }].concat(
      partners.map(function (p, i) { return { role: 'Compañero ' + (i + 1), p: p, primary: false }; })
    );
    const COLS = Math.min(3, Math.max(1, all.length));
    const GAP = 4;
    const cardW = (contentW - GAP * (COLS - 1)) / COLS;
    const cardH = 22;
    const sT = helpers.setText;
    sT(T.text, 'bold', 9);
    doc.text('EQUIPO', M, y);
    y += 5;
    all.forEach(function (entry, i) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = M + col * (cardW + GAP), cy = y + row * (cardH + GAP);
      const fillC = entry.primary ? T.primary : T.cardBg;
      const txt   = entry.primary ? T.onPrimary : T.text;
      if (T.radius && T.radius > 0) {
        doc.setFillColor(fillC[0], fillC[1], fillC[2]);
        doc.roundedRect(cx, cy, cardW, cardH, T.radius, T.radius, 'F');
        if (!entry.primary) {
          doc.setDrawColor(T.divider[0], T.divider[1], T.divider[2]);
          doc.setLineWidth(0.4);
          doc.roundedRect(cx, cy, cardW, cardH, T.radius, T.radius);
        }
      } else {
        doc.setFillColor(fillC[0], fillC[1], fillC[2]);
        doc.rect(cx, cy, cardW, cardH, 'F');
      }
      const initial = (entry.p.name || '?').trim().charAt(0).toUpperCase();
      doc.setFillColor(T.accent[0], T.accent[1], T.accent[2]);
      doc.circle(cx + 6.5, cy + cardH / 2, 4.2, 'F');
      sT(T.onAccent, 'bold', 11);
      doc.text(initial, cx + 6.5, cy + cardH / 2 + 1.3, { align: 'center' });
      sT(txt, 'bold', 7.5);
      doc.text(entry.role.toUpperCase(), cx + 13, cy + 6.5);
      sT(txt, 'bold', 9);
      doc.text(sanitize(entry.p.name || '-'), cx + 13, cy + 12);
      sT(txt, 'normal', 7.5);
      doc.text('NIE: ' + sanitize(entry.p.nie || '-'), cx + 13, cy + 17);
    });
    const rows = Math.ceil(all.length / COLS);
    return y + rows * cardH + (rows - 1) * GAP + 8;
  }

  function cvSectionHeader(ctx, secMeta, y, opts) {
    const { doc, T, helpers } = ctx;
    const { borderedBox, fillBox, setText, dashedRect } = helpers;
    const M = opts.M, contentW = opts.contentW;
    const secColor = T[secMeta.key] || T.primary;
    if (T.useEditorial) {
      const step = SECTIONS.indexOf(secMeta) + 1;
      borderedBox(M, y, contentW, 14, cvLighten(secColor, 0.87), cvLighten(secColor, 0.45), 0.35, 3);
      doc.setDrawColor(secColor[0], secColor[1], secColor[2]);
      doc.setLineDashPattern([1.2, 1], 0);
      doc.setLineWidth(0.25);
      doc.roundedRect(M + 1.5, y + 1.5, contentW - 3, 11, 2, 2, 'S');
      doc.setLineDashPattern([], 0);
      doc.setFillColor(secColor[0], secColor[1], secColor[2]);
      doc.circle(M + 8, y + 7, 4.2, 'F');
      setText(T.text, 'bold', 8);
      doc.text('0' + step, M + 8, y + 8.1, { align: 'center' });
      setText(T.text, 'bold', 11);
      doc.text(secMeta.title.toUpperCase(), M + 16, y + 8.6);
      setText(T.mutedText, 'bold', 7);
      doc.text(secMeta.eyebrow.toUpperCase(), M + contentW - 5, y + 8.1, { align: 'right' });
      return y + 20;
    }
    if (T.useDashed) {
      dashedRect(M, y, contentW, 11, secColor, 0.5, 1.2);
    } else {
      borderedBox(M, y, contentW, 11, T.bgSoft, secColor, 0.5, T.radius);
      fillBox(M, y, 4, 11, secColor);
    }
    setText(T.mutedText, 'bold', 7);
    doc.text(secMeta.eyebrow.toUpperCase(), M + 9, y + 4.5);
    setText(T.text, 'bold', 11);
    doc.text(secMeta.title.toUpperCase(), M + 9, y + 9);
    return y + 16;
  }

  function cvGameFinal(ctx, y, opts) {
    if (!ctx.cfg.game) return y;
    const { doc, T, helpers, sanitize } = ctx;
    const M = opts.M, contentW = opts.contentW;
    if (T.useEditorial) {
      if (y + 18 > CV_CONTENT_BOTTOM) y = cvNextPage(ctx);
      helpers.borderedBox(M, y, contentW, 13, cvLighten(T.consolidate, 0.91), cvLighten(T.consolidate, 0.4), 0.3, 3);
      helpers.fillBox(M + 4, y + 4, 5, 5, T.consolidate, 1.5);
      helpers.setText(T.text, 'bold', 8);
      doc.text('JUEGO FINAL', M + 13, y + 8);
      helpers.setText(T.mutedText, 'normal', 8);
      doc.text(cvFitPdfText(ctx, ctx.cfg.game.type, contentW - 52).toUpperCase(), M + contentW - 5, y + 8, { align: 'right' });
      return y + 20;
    }
    if (y > CV_PAGE.H - 25) { doc.addPage(); y = 18; }
    y += 4;
    if (T.useDashed) helpers.dashedRect(M, y, contentW, 10, T.accent, 0.5, 1.0);
    else {
      helpers.borderedBox(M, y, contentW, 10, T.cardBg, T.accent, 0.8, T.radius);
      helpers.fillBox(M, y, 4, 10, T.accent);
    }
    helpers.setText(T.text, 'bold', 9);
    doc.text('JUEGO FINAL:', M + 9, y + 6.5);
    helpers.setText(T.mutedText, 'normal', 9);
    doc.text(sanitize(ctx.cfg.game.type).toUpperCase(), M + 42, y + 6.5);
    return y + 14;
  }

  function cvFooter(ctx, opts) {
    const { doc, T, helpers, refCode } = ctx;
    const totalPages = doc.internal.getNumberOfPages();
    const footerY = CV_PAGE.H - 8;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      if (T.useEditorial) {
        helpers.hline(opts.M, opts.right, CV_PAGE.H - 18, T.divider, 0.25);
        helpers.setText(T.text, 'bold', 7);
        doc.text('CIUDADANÍA Y VALORES', opts.M, CV_PAGE.H - 13);
        helpers.setText(T.mutedText, 'normal', 7);
        doc.text('Página ' + p + ' de ' + totalPages, opts.right, CV_PAGE.H - 13, { align: 'right' });
        helpers.setText(T.mutedText, 'normal', 6.5);
        doc.text('Prof. José Eliseo Martínez', opts.M, CV_PAGE.H - 8);
        doc.text(refCode, opts.right, CV_PAGE.H - 8, { align: 'right' });
        continue;
      }
      if (T.useDashed) helpers.dashedLine(opts.M, footerY - 4, opts.right, footerY - 4, T.divider, 0.3, 0.8);
      else helpers.hline(opts.M, opts.right, footerY - 4, T.divider, 0.3);
      helpers.setText(T.mutedText, 'italic', 7);
      doc.text('CIVICA · Ciudadania y Valores · Prof. Jose Eliseo Martinez', opts.M, footerY);
      helpers.setText(T.mutedText, 'normal', 7);
      doc.text('Pag. ' + p + ' de ' + totalPages, CV_PAGE.W / 2, footerY, { align: 'center' });
      helpers.setText(T.mutedText, 'normal', 7);
      doc.text(refCode, opts.right, footerY, { align: 'right' });
    }
  }

  function cvRenderSections(ctx, y, opts) {
    const { doc, cfg } = ctx;
    const grouped = {};
    ctx.state.flatExercises.forEach(function (it) {
      grouped[it.sectionKey] = grouped[it.sectionKey] || [];
      grouped[it.sectionKey].push(it);
    });
    SECTIONS.forEach(function (secMeta) {
      const list = grouped[secMeta.key];
      if (!list || !list.filter(function (it) { return it.ex.type !== 'note'; }).length) return;
      if (ctx.T.useEditorial) {
        const first = list.find(function (it) { return it.ex.type !== 'note'; });
        const firstLines = cvPdfLines(ctx, first.ex.title || 'Ejercicio 1', opts.contentW - 53, 'bold', 10);
        if (y + 20 + Math.max(15, firstLines.length * 4.6 + 8) > CV_CONTENT_BOTTOM) y = cvNextPage(ctx);
      } else if (y > CV_PAGE.H - 40) { y = cvNextPage(ctx); }
      y = cvSectionHeader(ctx, secMeta, y, opts);
      const secColor = ctx.T[secMeta.key] || ctx.T.primary;
      let exNum = 0;
      list.forEach(function (item) {
        if (item.ex.type === 'note') return;
        exNum++;
        y = cvExerciseRow(ctx, item, exNum, y, Object.assign({ secColor: secColor, secMeta: secMeta }, opts));
      });
    });
    return y;
  }

  function cvRenderPopArt(ctx) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = 14, right = CV_PAGE.W - M, contentW = right - M;
    const { fillBox, shadowBox, setText, halftone } = helpers;
    shadowBox(0, 0, CV_PAGE.W, 24, T.primary);
    halftone(CV_PAGE.W - 50, 0, 50, 24, cvLighten(T.accent, 0.1), 2.8, 0.6);
    setText(T.onPrimary, 'bold', 9);
    doc.text((cfg.subjectLabel || 'CIUDADANÍA Y VALORES').toUpperCase(), M, 9);
    setText(T.onPrimary, 'bold', 18);
    doc.text(sanitize(cfg.topic || 'Sesión'), M, 18);
    fillBox(0, 24, CV_PAGE.W, 4, T.text);
    setText(T.onPrimary, 'normal', 9);
    doc.text(today, right, 9, { align: 'right' });
    let y = 38;
    y = cvStateBand(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvTeamLinear(ctx, y, { M: M, contentW: contentW });
    y = cvRenderSections(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvGameFinal(ctx, y, { M: M, contentW: contentW });
    cvFooter(ctx, { M: M, right: right });
  }

  function cvRenderPopArtVibrant(ctx) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = 14, right = CV_PAGE.W - M, contentW = right - M;
    const { fillBox, setText, stripes } = helpers;
    fillBox(0, 0, CV_PAGE.W, 28, T.primary);
    fillBox(CV_PAGE.W * 0.6, 0, CV_PAGE.W * 0.4, 28, T.accent);
    stripes(0, 0, CV_PAGE.W, 28, cvDarken(T.primary, 0.3), 3.0);
    fillBox(0, 28, CV_PAGE.W, 5, T.text);
    setText(T.onPrimary, 'bold', 9);
    doc.text((cfg.subjectLabel || 'CIUDADANÍA Y VALORES').toUpperCase(), M, 10);
    setText(T.onPrimary, 'bold', 19);
    doc.text(sanitize(cfg.topic || 'Sesión'), M, 22);
    let y = 42;
    y = cvStateBand(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvTeamLinear(ctx, y, { M: M, contentW: contentW });
    y = cvRenderSections(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvGameFinal(ctx, y, { M: M, contentW: contentW });
    cvFooter(ctx, { M: M, right: right });
  }

  function cvRenderColorido(ctx) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = 14, right = CV_PAGE.W - M, contentW = right - M;
    const { fillBox, setText } = helpers;
    fillBox(0, 0, CV_PAGE.W * 0.35, 22, T.primary);
    fillBox(CV_PAGE.W * 0.35, 0, CV_PAGE.W * 0.35, 22, T.accent);
    fillBox(CV_PAGE.W * 0.70, 0, CV_PAGE.W * 0.30, 22, T.text);
    setText(T.onPrimary, 'bold', 9);
    doc.text((cfg.subjectLabel || 'CIUDADANÍA').toUpperCase(), M, 9);
    setText(T.onPrimary, 'bold', 14);
    doc.text(sanitize(cfg.topic || 'Sesión'), M, 17);
    setText(T.cardBg, 'normal', 9);
    doc.text(today, CV_PAGE.W - M, 15, { align: 'right' });
    let y = 30;
    y = cvStateBand(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvTeamCards(ctx, y, { M: M, contentW: contentW });
    y = cvRenderSections(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvGameFinal(ctx, y, { M: M, contentW: contentW });
    cvFooter(ctx, { M: M, right: right });
  }

  function cvRenderPastel(ctx) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = 14, right = CV_PAGE.W - M, contentW = right - M;
    const { fillBox, setText } = helpers;
    fillBox(0, 0, CV_PAGE.W, 3, T.primary);
    setText(T.mutedText, 'bold', 7);
    doc.text((cfg.subjectLabel || 'CIUDADANÍA Y VALORES').toUpperCase(), M, 11);
    setText(T.text, 'bold', 20);
    doc.text(sanitize(cfg.topic || 'Sesión'), M, 21);
    setText(T.mutedText, 'normal', 9);
    doc.text(today, M, 26);
    doc.setDrawColor(T.divider[0], T.divider[1], T.divider[2]);
    doc.setLineWidth(0.3);
    doc.line(M, 30, right, 30);
    let y = 38;
    y = cvStateBand(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvTeamLinear(ctx, y, { M: M, contentW: contentW });
    y = cvRenderSections(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvGameFinal(ctx, y, { M: M, contentW: contentW });
    cvFooter(ctx, { M: M, right: right });
  }

  function cvRenderHollyHobbie(ctx) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = 14, right = CV_PAGE.W - M, contentW = right - M;
    const { setText, dashedLine, notebookGrid } = helpers;
    notebookGrid(0, 0, CV_PAGE.W, 30, cvLighten(T.primary, 0.7), 6);
    dashedLine(M - 2, 28, right + 2, 28, T.primary, 0.5, 1.2);
    setText(T.text, 'italic', 9);
    doc.text('Cuaderno de Ciudadanía', M, 9);
    setText(T.text, 'bold', 20);
    doc.text(sanitize(cfg.topic || 'Sesión'), M, 20);
    setText(T.mutedText, 'italic', 9);
    doc.text(today, right, 20, { align: 'right' });
    let y = 36;
    y = cvStateBand(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvTeamLinear(ctx, y, { M: M, contentW: contentW });
    y = cvRenderSections(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvGameFinal(ctx, y, { M: M, contentW: contentW });
    cvFooter(ctx, { M: M, right: right });
  }

  // ----- DISEÑO "Default": cuaderno editorial de Ciudadanía -----
  // Misma composición y paleta para actividad/examen. Solo cambia el rótulo;
  // las respuestas del examen siguen ocultas por las reglas del reporte.
  function cvRenderDefault(ctx) {
    const { doc, T, helpers, cfg } = ctx;
    const M = 14, right = CV_PAGE.W - M, contentW = right - M;
    const { fillBox, setText } = helpers;
    const center = CV_PAGE.W / 2;
    cvEditorialPage(ctx, false);

    const subject = ctx.sanitize(cfg.subjectLabel || 'Ciudadanía y Valores').toUpperCase();
    setText(T.text, 'bold', 8);
    const subjectW = Math.min(contentW - 20, doc.getTextWidth(subject) + 12);
    fillBox(center - subjectW / 2, 12, subjectW, 8, cvLighten(T.explore, 0.82), 4);
    doc.text(cvFitPdfText(ctx, subject, subjectW - 10), center, 17.4, { align: 'center' });

    // El alto del encabezado se adapta al tema en lugar de cortar el título.
    // Los títulos excepcionalmente largos se compactan sin tapar el cuerpo.
    let titleSize = 22;
    let titleLines = cvPdfLines(ctx, cfg.topic || 'Sesión', contentW - 16, 'bold', titleSize);
    while (titleLines.length > 6 && titleSize > 12) {
      titleSize -= 1;
      titleLines = cvPdfLines(ctx, cfg.topic || 'Sesión', contentW - 16, 'bold', titleSize);
    }
    const titleLineH = titleSize * 0.3528 * 1.15;
    let y = 31;
    titleLines.forEach(function (line) {
      if (y + titleLineH > CV_CONTENT_BOTTOM) y = cvNextPage(ctx);
      setText(T.text, 'bold', titleSize);
      doc.text(line, center, y, { align: 'center' });
      y += titleLineH;
    });
    y += 1;
    const unitLines = cvPdfLines(ctx, cfg.unit || 'Ciudadanía y Valores', contentW - 24, 'normal', 9);
    unitLines.forEach(function (line) {
      if (y + 5 > CV_CONTENT_BOTTOM) y = cvNextPage(ctx);
      setText(T.mutedText, 'normal', 9);
      doc.text(line, center, y, { align: 'center' });
      y += 4.5;
    });
    y += 1;
    if (y + 12 > CV_CONTENT_BOTTOM) y = cvNextPage(ctx);
    fillBox(center - 18, y, 36, 6.5, cvLighten(T.consolidate, 0.73), 3);
    setText(T.text, 'bold', 7);
    doc.text(cfg.examMode ? 'EXAMEN' : 'ACTIVIDAD', center, y + 4.3, { align: 'center' });
    y += 14;

    y = cvStateBand(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvTeamLinear(ctx, y, { M: M, contentW: contentW });
    y = cvRenderSections(ctx, y, { M: M, contentW: contentW, right: right });
    y = cvGameFinal(ctx, y, { M: M, contentW: contentW });
    cvFooter(ctx, { M: M, right: right });
  }

  const CV_DESIGN_RENDERERS = {
    'Default':        cvRenderDefault,
    'PopArt':         cvRenderPopArt,
    'PopArtVibrant':  cvRenderPopArtVibrant,
    'Colorido':       cvRenderColorido,
    'Pastel':         cvRenderPastel,
    'HollyHobbie':    cvRenderHollyHobbie,
  };

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
    makeDraggable, addExtraPoints, addBalloonBonus, setGameResult, recordAnswer,
    generatePDF, // expuesto para previsualización desde la app

    registerExercise(type, renderer) { state.exerciseRegistry[type] = renderer; },
    registerGame(type, renderer) { state.gameRegistry[type] = renderer; },
    getGameRenderer(type) { return state.gameRegistry[type] || null; },

    init(config) {
      state.config = config;
      state.storageKey = STORAGE_KEY_PREFIX +
        (config.id || (config.topic || 'page').replace(/\W+/g, '_').toLowerCase()) + '_';

      global.addEventListener('storage', event => {
        if (event.key === state.storageKey + 'state' && syncGameBonus()) updateScoreDisplay();
      });
      global.addEventListener('focus', () => {
        if (syncGameBonus()) updateScoreDisplay();
      });

      ensureNoTranslate();
      setupBfCacheGuard();
      setupAntiCopy();
      applyTheme(config.colors);

      if (!config.examMode) pickPoolVersion();

      const prev = loadState();
      if (prev) {
        state.answers = prev.answers || {};
        state.extraPoints = prev.extraPoints || 0;
        state.balloonBonus = prev.balloonBonus || 0;
        state.gameResult = prev.gameResult || null;
      }

      const start = () => {
        const login = resumeStudentIfReturning().then(resumed => resumed ? undefined : showLoginModal());
        login.then(() => {
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
      clearAccountStates();
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
