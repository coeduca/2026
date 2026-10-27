/**
 * COEDUCA Framework v1 - Core
 * Profesor Eliseo - COEDUCA
 *
 * Maneja: login (NIE), PDF (con fix iOS), anti-copy, hooks de Rigo,
 *         pool A/B, score global, drag&drop con touch + auto-scroll,
 *         renderizado declarativo de ejercicios y juegos.
 *
 * Uso:
 *   COEDUCA.init({
 *     container: '#app',
 *     topic: 'Present Simple',
 *     level: 'Noveno',
 *     colors: { primary: '#FFD700', accent: '#8E44AD' },
 *     exercises: [...],
 *     game: { type: 'hangman', words: [...] }
 *   });
 */
(function (global) {
  'use strict';

  const STORAGE_KEY_PREFIX = 'coeduca_';
  const VERSION = '1.2.0';

  function activityStorageId(config) {
    if (config.id) return String(config.id);
    const topicId = (config.topic || 'page').replace(/\W+/g, '_').toLowerCase();
    // Paquetes antiguos no tienen id. Conservar su progreso si la carpeta
    // coincide con el título; una carpeta distinta (p. ej. "...2") debe
    // usar su propio estado, aunque el título normalizado sea idéntico.
    const path = (global.location.pathname || '')
      .replace(/\/(?:index|juegos)\.html$/i, '/')
      .replace(/\/+$/, '');
    const folder = path.split('/').pop().replace(/\W+/g, '_').toLowerCase();
    return folder && folder !== topicId
      ? path.split('/').filter(Boolean).slice(-2).join('-').toLowerCase()
      : topicId;
  }

  // =====================================================================
  // FILTRO DE NIVEL POR GRADO
  // =====================================================================
  // El profesor puede pasar level: 'A1+' o 'PreA1' a COEDUCA.init para
  // restringir qué estudiantes pueden acceder. El NIE de prueba (José Eliseo)
  // siempre está permitido en cualquier nivel.
  // OJO: en students.js los grados de bachillerato vienen sin tilde
  //      ("Primer Ano", "Segundo Ano"). Cuidado con la inconsistencia.
  const LEVEL_FILTERS = {
    'A1+':   ['Noveno', 'Primer Ano', 'Primer Año', 'Segundo Ano', 'Segundo Año'],
    'PreA1': ['Séptimo', 'Septimo', 'Octavo']
  };
  const TEST_NIE = '1999'; // José Eliseo - siempre permitido
  const RIGO_NIE = '12379'; // Cuenta fija de Rigo

  // =====================================================================
  // 1. STATE GLOBAL
  // =====================================================================
  const state = {
    config: null,
    student: null,        // { nie, name, grade }
    partner: null,        // { nie, name, grade } | null  (compatibilidad: primer compañero)
    partners: [],         // array de hasta 4 compañeros
    poolVersion: null,    // 'A' | 'B'
    answers: {},          // { exerciseId: { score, total, details } }
    balloonBonus: 0,      // +1 si atrapo el globo del Dino Runner (una sola vez)
    extraPoints: 0,       // mejor resultado del juego final (NO acumula entre rondas)
    gameResult: null,     // 'win' | 'tie' | 'lose' | null  - último resultado del juego
    storageKey: '',
    appRoot: null,
    exerciseRegistry: {}, // tipos registrados por coeduca-exercises.js
    gameRegistry: {}      // tipos registrados por coeduca-games.js
  };

  // =====================================================================
  // SFX (efectos de sonido) - solo en actividades de inglés.
  // El framework de examen vive en otra carpeta y NO carga este archivo.
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
  // 2. SANITIZADOR PARA PDF (Latin-1 only)
  // =====================================================================
  function sanitizeForPDF(text) {
    if (text === null || text === undefined) return '';
    let s = String(text);

    // 1) Strip HTML preservando texto
    s = s.replace(/<br\s*\/?>/gi, '\n')
         .replace(/<\/p>/gi, '\n')
         .replace(/<[^>]*>/g, '');

    // 2) Decodificar entidades HTML básicas
    s = s.replace(/&nbsp;/g, ' ')
         .replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"')
         .replace(/&#39;/g, "'");

    // 3) Reemplazos seguros (flechas, comillas, dashes, ellipsis)
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

    // 4) Eliminar emojis y todo char fuera de Latin-1 (0-255)
    s = s.split('').filter(ch => ch.charCodeAt(0) <= 255).join('');

    return s.trim();
  }

  // =====================================================================
  // 3. ANTI-COPY
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

  // =====================================================================
  // 4. NO TRANSLATE (refuerzo)
  // =====================================================================
  function ensureNoTranslate() {
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.lang = 'es';
    if (!document.querySelector('meta[name="google"]')) {
      const m = document.createElement('meta');
      m.name = 'google';
      m.content = 'notranslate';
      document.head.appendChild(m);
    }
    if (!document.querySelector('meta[http-equiv="Content-Language"]')) {
      const m = document.createElement('meta');
      m.setAttribute('http-equiv', 'Content-Language');
      m.content = 'es';
      document.head.appendChild(m);
    }
  }

  // =====================================================================
  // 4b. ANTI-BFCACHE
  // =====================================================================
  // Cuando el alumno navega "atrás" desde otra pestaña, Safari/Chrome móvil
  // pueden restaurar la página desde el back-forward cache. En ese caso el DOM
  // se restaura tal cual (incluyendo botones del hangman ya marcados como
  // disabled, fichas arrastradas, etc.) pero el JavaScript NO se vuelve a
  // ejecutar, así que el estado visual queda inconsistente con state.answers.
  // Forzamos un reload completo en ese caso para que todo vuelva a montarse
  // limpio, leyendo el progreso real desde localStorage.
  function setupBfCacheGuard() {
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) {
        // La página viene del bfcache: recargar para reconstruir UI desde state.
        try { sessionStorage.setItem(state.storageKey + 'resumeAfterHistory', '1'); } catch (err) {}
        location.reload();
      }
    });
  }

  // =====================================================================
  // 5. POOL A/B SELECTOR (persistente)
  // =====================================================================
  function pickPoolVersion() {
    const key = state.storageKey + 'pool';
    let v = null;
    try { v = localStorage.getItem(key); } catch (e) {}
    if (v !== 'A' && v !== 'B') {
      v = Math.random() < 0.5 ? 'A' : 'B';
      try { localStorage.setItem(key, v); } catch (e) {}
    }
    state.poolVersion = v;
    return v;
  }

  function getPoolData(exercise) {
    if (exercise.dataA && exercise.dataB) {
      return state.poolVersion === 'A' ? exercise.dataA : exercise.dataB;
    }
    return exercise.data || exercise.dataA || exercise.dataB;
  }

  // =====================================================================
  // 6. STORAGE HELPERS
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
    } catch (e) { /* silencioso */ }
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
    if (ex.type === 'reorder_letters') return all(raw, data.length, (value, i) => filled(value) && String(value).length === String(data[i].word).length);
    if (['emojiphrase','reorder_letters'].includes(ex.type)) return all(raw, data.length);
    if (ex.type === 'cv_textanswer') return all(raw, data.length, item => String(item?.a || '').trim().length >= 16);
    return true;
  }

  function restoreExerciseDraft(body, ex, raw) {
    if (!raw || ex.type === 'cv_table') return; // Tables restore their own tokens.
    const inputs = body.querySelectorAll('.fb-input,.ep-input,.rl-input,.cv-ta-input,.dd-sel');
    inputs.forEach((input, i) => { if (raw[i] != null) input.value = String(ex.type === 'cv_textanswer' ? raw[i].a || '' : raw[i]); });
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
    // userAnswer: snapshot crudo de lo que el alumno respondió.
    // Si el renderer no lo manda (renderers viejos), se preserva el que ya hubiera.
    const prev = state.answers[exerciseId] || {};
    state.answers[exerciseId] = {
      score,
      total,
      details: details || null,
      userAnswer: (userAnswer !== undefined ? userAnswer : (prev.userAnswer || null)),
      completedAt: Date.now()
    };
    saveState();
    updateScoreDisplay();
  }

  // Calcula cuántos puntos debería valer un ejercicio que aún no se ha respondido.
  // Usamos el promedio del puntaje "total" de los ejercicios ya respondidos,
  // o un valor por defecto de 1 punto por ítem si aún no hay ninguno respondido.
  // De este modo la nota refleja el progreso real, no se infla cuando solo se ha
  // respondido un ejercicio.
  function estimatePendingTotal() {
    const cfg = state.config;
    if (!cfg || !cfg.exercises) return 0;
    const answered = state.answers;
    let answeredTotalsSum = 0;
    let answeredCount = 0;
    Object.values(answered).forEach(a => {
      if (a && typeof a.total === 'number' && a.total > 0) {
        answeredTotalsSum += a.total;
        answeredCount++;
      }
    });
    // Promedio del "peso" de los ejercicios ya respondidos. Si aún no hay ninguno
    // respondido, asumimos 1 punto por cada ejercicio pendiente (estimación
    // conservadora que evita mostrar 10 cuando todavía no se ha hecho nada).
    const avgTotal = answeredCount > 0 ? (answeredTotalsSum / answeredCount) : 1;
    let pendingPoints = 0;
    cfg.exercises.forEach((ex, idx) => {
      if (ex.type === 'note') return;
      const id = 'ex_' + idx;
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
    // Sumar el "peso estimado" de los ejercicios pendientes para que la nota
    // refleje el avance real del estudiante sobre toda la tarea.
    const pending = estimatePendingTotal();
    total += pending;

    if (total === 0) return { earned: 0, total: 0, grade: '0.0', baseGrade: '0.0' };
    const baseGrade = (earned / total) * 10;
    return {
      earned, total,
      grade: Math.min(10, baseGrade + state.extraPoints + state.balloonBonus).toFixed(1),
      baseGrade: baseGrade.toFixed(1)
    };
  }

  function updateScoreDisplay() {
    const badge = document.getElementById('coeduca-extra-badge');
    if (badge) {
      badge.querySelector('.cocean-bonus-number').textContent = (state.extraPoints + state.balloonBonus).toFixed(1);
        badge.style.display = (state.extraPoints + state.balloonBonus) > 0 ? 'flex' : 'none';
    }
    const finalDisplay = document.getElementById('coeduca-final-score-display');
    if (finalDisplay) {
      const s = getTotalScore();
      const cfg = state.config;
      const realExercises = (cfg && cfg.exercises ? cfg.exercises : []).filter(e => e.type !== 'note');
      const answeredCount = (cfg?.exercises || []).filter((ex, idx) => ex.type !== 'note' && isCompletedAnswer(ex, state.answers['ex_' + idx])).length;
      const totalCount = realExercises.length;
      const allDone = totalCount > 0 && answeredCount >= totalCount;
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

  // Tabla de puntos extra por resultado del juego.
  // El juego final SOLO da puntos por el MEJOR resultado obtenido en toda la sesión.
  // Si el alumno gana y luego pierde, conserva el +1 del win.
  // Si pierde y luego gana, sube de 0 a +1.
  // Nunca puede sumar dos veces aunque juegue varias rondas.
  const GAME_RESULT_POINTS = { win: 1, tie: 0.5, lose: 0 };
  const GAME_RESULT_RANK   = { win: 3, tie: 2, lose: 1 };

  function setGameResult(result) {
    // result: 'win' | 'tie' | 'lose'
    if (!GAME_RESULT_POINTS.hasOwnProperty(result)) return;
    const prevRank = state.gameResult ? GAME_RESULT_RANK[state.gameResult] : 0;
    const newRank  = GAME_RESULT_RANK[result];
    // Solo actualiza si el nuevo resultado es mejor o igual
    // (igual permite repintar la UI con el mismo valor sin acumular)
    if (newRank >= prevRank) {
      state.gameResult = result;
      state.extraPoints = GAME_RESULT_POINTS[result];
    }
    saveState();
    updateScoreDisplay();
  }

  // Compatibilidad con renderers viejos que llamen addExtraPoints directamente.
  // Convierte el monto en un resultado equivalente.
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
  // VALIDACIÓN DE NIVEL
  // =====================================================================
  function isAllowedAtLevel(student) {
    if (global.COEDUCA_CLASSROOM) return !!student;
    if (!student) return false;
    if (student.nie === TEST_NIE || student.nie === RIGO_NIE) return true;
    const lvl = state.config && state.config.level;
    if (!lvl) return true; // sin filtro
    const allowed = LEVEL_FILTERS[lvl];
    if (!allowed) return true; // si el level no es 'A1+' ni 'PreA1', no filtrar
    return allowed.indexOf(student.grade) >= 0;
  }

  function getLevelLabel() {
    const lvl = state.config && state.config.level;
    if (lvl === 'A1+') return 'Noveno, Primer Año o Segundo Año';
    if (lvl === 'PreA1') return 'Séptimo u Octavo';
    return '';
  }

  async function resumeStudentIfReturning() {
    const saved = loadState();
    const auth = global.COEDUCA_FIXED_AUTH;
    const remembered = auth && auth.lastStudent() || '';
    const nie = remembered || String(saved && saved.student && saved.student.nie || '');
    if (!nie) return false;
    let db = null;
    try { db = global.STUDENTS; } catch (e) {}
    if (!db) { try { db = STUDENTS; } catch (e) {} }
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
    if (!isAllowedAtLevel(found)) return false;
    if (saved && saved.student && String(saved.student.nie) !== nie) archiveAccountState(saved);
    const own = saved && saved.student && String(saved.student.nie) === nie ? saved : loadAccountState(nie);
    state.answers = own && own.answers || {};
    state.extraPoints = Number(own && own.extraPoints) || 0;
    state.balloonBonus = Number(own && own.balloonBonus) || 0;
    state.gameResult = own && own.gameResult || null;
    if (own && own.poolVersion) state.poolVersion = own.poolVersion;
    state.student = found;
    state.partners = own && (own.partners || (own.partner ? [own.partner] : [])) || [];
    state.partner = state.partners[0] || null;
    if (auth) auth.remember(nie);
    saveState();
    if (global.rigo && global.rigo.setGrade) global.rigo.setGrade(found.grade);
    return true;
  }

  // =====================================================================
  // 7. LOGIN MODAL
  // =====================================================================
  function showLoginModal(fresh = false) {
    return new Promise((resolve) => {
      const MAX_PARTNERS = 4;

      // Limpiar posición previa de Rigo (por si quedó arrastrado fuera del lado derecho)
      try { localStorage.removeItem('rigo_pos'); } catch (e) {}

      // Llamar welcome de Rigo apenas exista. Se mantiene en su esquina por defecto
      // (abajo-derecha). El bocadillo se dibuja hacia arriba-izquierda desde Rigo
      // (CSS bottom: 110%; right: 10%), así que en abajo-derecha queda visible sin
      // chocar con el modal centrado.
      const tryWelcome = () => {
        if (global.rigo && typeof global.rigo.welcome === 'function') {
          global.rigo.welcome();
          // Forzar la esquina inferior derecha por si una posición previa quedó aplicada inline.
          try {
            const rigoEl = global.rigo;
            rigoEl.style.top = 'auto';
            rigoEl.style.left = 'auto';
            rigoEl.style.right = '20px';
            rigoEl.style.bottom = '20px';
            rigoEl.style.zIndex = '10000';
          } catch (e) {}
        } else {
          setTimeout(tryWelcome, 200);
        }
      };
      tryWelcome();

      const overlay = document.createElement('div');
      overlay.className = 'coeduca-login-overlay';
      overlay.innerHTML = `
        <div class="coeduca-login-modal">
          <div class="coeduca-login-header">
            <div class="coeduca-login-badge">COEDUCA</div>
            <h2>BIENVENIDO</h2>
            <p>Ingresa tu NIE para comenzar</p>
          </div>

          <div class="coeduca-login-modal-scroll">
            <div class="coeduca-login-field" data-role="main">
              <label><span class="coeduca-login-icon">1</span> NIE del estudiante</label>
              <input type="text" id="coeduca-nie-input" class="coeduca-input coeduca-input-allow-copy"
                     inputmode="numeric" autocomplete="off" placeholder="Ej. 12379">
              <div class="coeduca-login-info" id="coeduca-nie-info"></div>
              <div class="coeduca-login-error" id="coeduca-nie-error">NIE no encontrado</div>
            </div>

            <div id="coeduca-partners-list"></div>
          </div>

          <div class="coeduca-login-actions">
            <button class="coeduca-btn coeduca-btn-info" id="coeduca-add-partner-btn" type="button">
              + Compañero <span id="coeduca-partner-counter" style="font-size:11px;opacity:0.85;"></span>
            </button>
            <button class="coeduca-btn coeduca-btn-success" id="coeduca-login-submit" disabled type="button">
              Comenzar
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const nieInput = overlay.querySelector('#coeduca-nie-input');
      const nieInfo = overlay.querySelector('#coeduca-nie-info');
      const nieError = overlay.querySelector('#coeduca-nie-error');
      const partnersList = overlay.querySelector('#coeduca-partners-list');
      const addPartnerBtn = overlay.querySelector('#coeduca-add-partner-btn');
      const partnerCounter = overlay.querySelector('#coeduca-partner-counter');
      const submitBtn = overlay.querySelector('#coeduca-login-submit');

      let mainStudent = null;
      const partners = []; // [{ student, fieldEl, inputEl }]

      async function lookupNIE(nie) {
        if (global.COEDUCA_CLASSROOM) return global.COEDUCA_CLASSROOM.lookup(nie);
        // STUDENTS puede estar como global (var) o lexical (const/let).
        let DB = null;
        try { DB = global.STUDENTS; } catch (e) {}
        if (!DB) { try { DB = STUDENTS; } catch (e) {} }
        if (!DB) return null;
        const clean = String(nie || '').trim();
        return clean && DB[clean] ? { nie: clean, ...DB[clean] } : null;
      }

      function updateCounter() {
        if (partners.length === 0) {
          partnerCounter.textContent = '';
        } else {
          partnerCounter.textContent = '(' + partners.length + '/' + MAX_PARTNERS + ')';
        }
        addPartnerBtn.disabled = partners.length >= MAX_PARTNERS;
        addPartnerBtn.style.opacity = partners.length >= MAX_PARTNERS ? '0.5' : '1';
      }

      async function validateMain() {
        const value = nieInput.value; mainStudent = null; submitBtn.disabled = true;
        let found;
        try { found = await lookupNIE(value); }
        catch (error) { if (nieInput.value !== value) return; nieError.textContent = error.message; nieError.classList.add('show'); return; }
        if (nieInput.value !== value) return;
        if (found) {
          if (!isAllowedAtLevel(found)) {
            mainStudent = null;
            nieInfo.classList.remove('show');
            nieError.textContent = 'Este ejercicio es para ' + getLevelLabel();
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
        const num = partners.length + 2; // 2,3,4,5
        const field = document.createElement('div');
        field.className = 'coeduca-login-field coeduca-login-field-partner';
        field.innerHTML = `
          <label>
            <span class="coeduca-login-icon">${num}</span>
            NIE del compañero ${num - 1}
            <button type="button" class="coeduca-login-remove" title="Quitar">×</button>
          </label>
          <input type="text" class="coeduca-input coeduca-input-allow-copy coeduca-partner-input"
                 inputmode="numeric" autocomplete="off" placeholder="NIE del compañero">
          <div class="coeduca-login-info"></div>
          <div class="coeduca-login-error">NIE no encontrado</div>
        `;
        partnersList.appendChild(field);

        const inp = field.querySelector('input');
        const info = field.querySelector('.coeduca-login-info');
        const err = field.querySelector('.coeduca-login-error');
        const removeBtn = field.querySelector('.coeduca-login-remove');

        slot.fieldEl = field;
        slot.inputEl = inp;

        const validate = async () => {
          slot.student = null;
          const v = inp.value.trim();
          if (!v) {
            slot.student = null;
            info.classList.remove('show');
            err.classList.remove('show');
            return;
          }
          // Evitar duplicados
          if (mainStudent && mainStudent.nie === v) {
            slot.student = null;
            info.classList.remove('show');
            err.textContent = 'Ya está como estudiante principal';
            err.classList.add('show');
            return;
          }
          if (partners.some(p => p !== slot && p.student && p.student.nie === v)) {
            slot.student = null;
            info.classList.remove('show');
            err.textContent = 'NIE ya agregado';
            err.classList.add('show');
            return;
          }
          let found;
          try { found = await lookupNIE(v); }
          catch (error) { if (inp.value.trim() !== v) return; err.textContent = error.message; err.classList.add('show'); return; }
          if (inp.value.trim() !== v || !field.isConnected) return;
          if (found) {
            if (!isAllowedAtLevel(found)) {
              slot.student = null;
              info.classList.remove('show');
              err.textContent = 'Este ejercicio es para ' + getLevelLabel();
              err.classList.add('show');
              return;
            }
            slot.student = found;
            info.innerHTML = '<b>' + escapeHTML(found.name) + '</b><br><small>' + escapeHTML(found.grade) + '</small>';
            info.classList.add('show');
            err.classList.remove('show');
          } else {
            slot.student = null;
            info.classList.remove('show');
            if (v.length >= 4) {
              err.textContent = 'NIE no encontrado';
              err.classList.add('show');
            } else {
              err.classList.remove('show');
            }
          }
        };
        inp.addEventListener('input', validate);

        removeBtn.addEventListener('click', () => {
          const idx = partners.indexOf(slot);
          if (idx >= 0) partners.splice(idx, 1);
          field.style.transition = 'opacity 0.2s, transform 0.2s';
          field.style.opacity = '0';
          field.style.transform = 'translateX(20px)';
          setTimeout(() => {
            field.remove();
            renumberPartners();
            updateCounter();
          }, 200);
        });

        partners.push(slot);
        updateCounter();
        setTimeout(() => inp.focus(), 50);
      }

      function renumberPartners() {
        partners.forEach((p, i) => {
          const num = i + 2;
          const label = p.fieldEl.querySelector('label');
          // Reemplazar solo el texto del badge y el número de compañero
          label.innerHTML = `
            <span class="coeduca-login-icon">${num}</span>
            NIE del compañero ${num - 1}
            <button type="button" class="coeduca-login-remove" title="Quitar">×</button>
          `;
          // Reasignar listener al nuevo botón
          label.querySelector('.coeduca-login-remove').addEventListener('click', () => {
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
        // Solo guardamos compañeros válidos
        state.partners = partners.filter(p => p.student).map(p => p.student);
        // Compatibilidad: state.partner = el primero (si hay)
        state.partner = state.partners[0] || null;
        saveState();
        if (global.COEDUCA_FIXED_AUTH) global.COEDUCA_FIXED_AUTH.remember(mainStudent.nie);
        if (global.rigo && global.rigo.loginSuccess) {
          global.rigo.loginSuccess(mainStudent.name);
        }
        // Mantener Rigo en la esquina inferior derecha tras el login.
        try {
          const rigoEl = global.rigo;
          if (rigoEl) {
            rigoEl.style.top = 'auto';
            rigoEl.style.left = 'auto';
            rigoEl.style.right = '20px';
            rigoEl.style.bottom = '20px';
            rigoEl.style.zIndex = '9999';
          }
        } catch (e) {}
        overlay.style.transition = 'opacity 0.3s';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 300);
      };

      submitBtn.addEventListener('click', finish);
      nieInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !submitBtn.disabled) finish();
      });

      // Restaurar sesión si existe
      const prev = loadState();
      if (!fresh && prev && prev.student) {
        nieInput.value = prev.student.nie;
        validateMain();
        // Restaurar compañeros (soporta state.partners[] nuevo o state.partner viejo)
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
  // 8. RENDER LAYOUT
  // =====================================================================
  function applyTheme(colors) {
    if (!colors) return;
    const root = document.documentElement;
    if (colors.primary) root.style.setProperty('--coeduca-primary', colors.primary);
    if (colors.accent) root.style.setProperty('--coeduca-accent', colors.accent);
    if (colors.bg) root.style.setProperty('--coeduca-bg', colors.bg);
    // Nuevos colores: surface = fondo de tarjetas, text = color de texto.
    if (colors.cardBg) root.style.setProperty('--coeduca-surface', colors.cardBg);
    if (colors.itemBg) root.style.setProperty('--coeduca-item-bg', colors.itemBg);
    if (colors.text) root.style.setProperty('--coeduca-text', colors.text);
  }

  function applyInterfaceTheme(theme) {
    const themeId = String(theme || 'PopArt').toLowerCase();
    const selected = themeId === 'hollyhobbie'
      ? 'HollyHobbie'
      : themeId === 'skeuomorphic'
        ? 'Skeuomorphic'
        : 'PopArt';
    document.documentElement.setAttribute('data-coeduca-ui-theme', selected);
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
      appRoot = document.createElement('div');
      appRoot.id = 'app';
      document.body.appendChild(appRoot);
    }
    appRoot.className = 'coeduca-app';
    appRoot.innerHTML = `
      <div class="coeduca-extra-badge" id="coeduca-extra-badge" style="display:none" aria-label="Puntos extra"><img class="cocean-bonus-icon" src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IS0tIFVwbG9hZGVkIHRvOiBTVkcgUmVwbywgd3d3LnN2Z3JlcG8uY29tLCBHZW5lcmF0b3I6IFNWRyBSZXBvIE1peGVyIFRvb2xzIC0tPg0KPHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCjxwYXRoIGQ9Ik00IDEySDIwTTEyIDRWMjAiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4NCjwvc3ZnPg==" alt=""><span class="cocean-bonus-number">0.0</span></div>
      <header class="coeduca-header">
        <h1>${escapeHTML(cfg.topic || 'Ejercicio de Inglés')}</h1>
        <p>${escapeHTML(cfg.level || '')} - COEDUCA - Prof. Eliseo</p>
        <div class="coeduca-header-students" id="coeduca-header-students"></div>
        <div class="coeduca-header-actions">
          <button class="coeduca-btn coeduca-btn-info coeduca-add-member-btn" id="coeduca-add-member-btn" type="button">
            + Agregar miembro
          </button>
          <button class="coeduca-btn coeduca-btn-info coeduca-switch-account-btn" id="coeduca-switch-account-btn"
                  type="button" aria-label="Cambiar de cuenta" title="Cambiar de cuenta">
            <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PgoNPCEtLSBVcGxvYWRlZCB0bzogU1ZHIFJlcG8sIHd3dy5zdmdyZXBvLmNvbSwgR2VuZXJhdG9yOiBTVkcgUmVwbyBNaXhlciBUb29scyAtLT4KPHN2ZyB3aWR0aD0iODAwcHgiIGhlaWdodD0iODAwcHgiIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiB2ZXJzaW9uPSIxLjEiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgoNPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6IzMzMzMzMzt9DQoJLnN0MXtmaWxsOm5vbmU7c3Ryb2tlOiMzMzMzMzM7c3Ryb2tlLXdpZHRoOjMyO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9DQo8L3N0eWxlPgoNPGcgaWQ9IkxheWVyXzEiLz4KDTxnIGlkPSJMYXllcl8yIj4KDTxnPgoNPGc+Cg08ZWxsaXBzZSBjbGFzcz0ic3QwIiBjeD0iMTM5LjYxIiBjeT0iMjczLjciIHJ4PSI2My45NiIgcnk9IjYzLjk2IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjkyMzkgLTAuMzgyNyAwLjM4MjcgMC45MjM5IC05NC4xMTE4IDc0LjI2MSkiLz4KDTwvZz4KDTxnPgoNPHBhdGggY2xhc3M9InN0MCIgZD0iTTE1MS44LDM4NS4yMmgtMjQuMzdjLTQ2LjM1LDAtODMuOTMsMzcuNTctODMuOTMsODMuOTNsMCwwaDE5Mi4yMmwwLDAgICAgIEMyMzUuNzIsNDIyLjc5LDE5OC4xNSwzODUuMjIsMTUxLjgsMzg1LjIyeiIvPgoNPC9nPgoNPGc+Cg08ZWxsaXBzZSBjbGFzcz0ic3QwIiBjeD0iMzcyLjM5IiBjeT0iMTA2LjgyIiByeD0iNjMuOTYiIHJ5PSI2My45NiIgdHJhbnNmb3JtPSJtYXRyaXgoMC44NTA3IC0wLjUyNTcgMC41MjU3IDAuODUwNyAtMC41NDA4IDIxMS43MjkyKSIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzg0LjU3LDIxOC4zNEgzNjAuMmMtNDYuMzUsMC04My45MywzNy41Ny04My45Myw4My45M3YwSDQ2OC41djBDNDY4LjUsMjU1LjkxLDQzMC45MywyMTguMzQsMzg0LjU3LDIxOC4zNCAgICAgeiIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzgzLjcxLDM0OS42MWMtMC4zOC0wLjM4LTAuNzctMC43My0xLjE4LTEuMDdjLTAuMTgtMC4xNC0wLjM2LTAuMjctMC41NC0wLjQxICAgICBjLTAuMjQtMC4xOC0wLjQ3LTAuMzYtMC43MS0wLjUzYy0wLjIyLTAuMTUtMC40NS0wLjI4LTAuNjgtMC40MWMtMC4yMi0wLjEzLTAuNDQtMC4yNy0wLjY2LTAuMzljLTAuMjMtMC4xMi0wLjQ3LTAuMjMtMC43MS0wLjM0ICAgICBjLTAuMjQtMC4xMS0wLjQ3LTAuMjMtMC43MS0wLjMzYy0wLjIzLTAuMS0wLjQ3LTAuMTctMC43LTAuMjZjLTAuMjYtMC4wOS0wLjUxLTAuMTktMC43OC0wLjI3Yy0wLjIzLTAuMDctMC40Ny0wLjEyLTAuNy0wLjE4ICAgICBjLTAuMjctMC4wNy0wLjU0LTAuMTQtMC44Mi0wLjJjLTAuMjYtMC4wNS0wLjUzLTAuMDgtMC44LTAuMTJjLTAuMjUtMC4wNC0wLjUtMC4wOC0wLjc1LTAuMTFjLTAuNDgtMC4wNS0wLjk1LTAuMDctMS40My0wLjA3ICAgICBjLTAuMDUsMC0wLjEtMC4wMS0wLjE0LTAuMDFjLTAuMDYsMC0wLjExLDAuMDEtMC4xNywwLjAxYy0wLjQ3LDAtMC45NCwwLjAzLTEuNDEsMC4wN2MtMC4yNiwwLjAzLTAuNTEsMC4wNy0wLjc3LDAuMTEgICAgIGMtMC4yNiwwLjA0LTAuNTIsMC4wNy0wLjc4LDAuMTJjLTAuMjgsMC4wNi0wLjU2LDAuMTMtMC44NCwwLjJjLTAuMjMsMC4wNi0wLjQ2LDAuMTEtMC42OCwwLjE4Yy0wLjI3LDAuMDgtMC41MywwLjE4LTAuOCwwLjI4ICAgICBjLTAuMjMsMC4wOC0wLjQ2LDAuMTYtMC42OCwwLjI1Yy0wLjI1LDAuMS0wLjQ4LDAuMjItMC43MywwLjM0Yy0wLjIzLDAuMTEtMC40NywwLjIxLTAuNywwLjMzYy0wLjIzLDAuMTItMC40NSwwLjI2LTAuNjcsMC40ICAgICBjLTAuMjIsMC4xMy0wLjQ1LDAuMjYtMC42NywwLjQxYy0wLjI1LDAuMTYtMC40OCwwLjM1LTAuNzEsMC41MmMtMC4xOCwwLjE0LTAuMzcsMC4yNi0wLjU1LDAuNDFjLTAuNDEsMC4zNC0wLjgsMC42OS0xLjE3LDEuMDYgICAgIGwtMjkuNDQsMjkuNDRjLTYuMjUsNi4yNS02LjI1LDE2LjM4LDAsMjIuNjNjMy4xMiwzLjEyLDcuMjIsNC42OSwxMS4zMSw0LjY5YzQuMDksMCw4LjE5LTEuNTYsMTEuMzEtNC42OWwyLjEzLTIuMTN2MzYuOTYgICAgIGgtNzYuNzVjLTguODQsMC0xNiw3LjE2LTE2LDE2czcuMTYsMTYsMTYsMTZoOTIuNzVjOC44NCwwLDE2LTcuMTYsMTYtMTZ2LTUyLjk2bDIuMTMsMi4xM2MzLjEyLDMuMTIsNy4yMiw0LjY5LDExLjMxLDQuNjkgICAgIGM0LjA5LDAsOC4xOS0xLjU2LDExLjMxLTQuNjljNi4yNS02LjI1LDYuMjUtMTYuMzgsMC0yMi42M0wzODMuNzEsMzQ5LjYxeiIvPgoNPC9nPgoNPGc+Cg08cGF0aCBjbGFzcz0ic3QwIiBkPSJNMjMyLjQxLDQ1LjAyaC05Mi43NWMtOC44NCwwLTE2LDcuMTYtMTYsMTZ2NTIuOTZsLTIuMTMtMi4xM2MtNi4yNS02LjI1LTE2LjM4LTYuMjUtMjIuNjMsMCAgICAgYy02LjI1LDYuMjUtNi4yNSwxNi4zOCwwLDIyLjYzbDI5LjQzLDI5LjQzYzAuMzgsMC4zOCwwLjc3LDAuNzMsMS4xOCwxLjA3YzAuMTgsMC4xNSwwLjM2LDAuMjcsMC41NSwwLjQxICAgICBjMC4yNCwwLjE4LDAuNDcsMC4zNiwwLjcxLDAuNTJjMC4yMiwwLjE1LDAuNDYsMC4yOCwwLjY4LDAuNDJjMC4yMiwwLjEzLDAuNDMsMC4yNywwLjY2LDAuMzljMC4yNCwwLjEzLDAuNDgsMC4yMywwLjcyLDAuMzUgICAgIGMwLjIzLDAuMTEsMC40NiwwLjIzLDAuNywwLjMyYzAuMjQsMC4xLDAuNDgsMC4xOCwwLjcxLDAuMjZjMC4yNSwwLjA5LDAuNSwwLjE5LDAuNzYsMC4yN2MwLjI0LDAuMDcsMC40OCwwLjEzLDAuNzIsMC4xOSAgICAgYzAuMjYsMC4wNywwLjUzLDAuMTQsMC44LDAuMTljMC4yOCwwLjA2LDAuNTYsMC4wOSwwLjg0LDAuMTNjMC4yNCwwLjAzLDAuNDcsMC4wOCwwLjcxLDAuMWMwLjUyLDAuMDUsMS4wNSwwLjA4LDEuNTgsMC4wOCAgICAgczEuMDUtMC4wMywxLjU4LTAuMDhjMC4yNC0wLjAyLDAuNDctMC4wNywwLjcxLTAuMWMwLjI4LTAuMDQsMC41Ni0wLjA3LDAuODQtMC4xM2MwLjI3LTAuMDUsMC41My0wLjEzLDAuNzktMC4xOSAgICAgYzAuMjQtMC4wNiwwLjQ4LTAuMTEsMC43Mi0wLjE5YzAuMjYtMC4wOCwwLjUxLTAuMTgsMC43Ni0wLjI3YzAuMjQtMC4wOSwwLjQ4LTAuMTYsMC43MS0wLjI2YzAuMjQtMC4xLDAuNDctMC4yMSwwLjctMC4zMiAgICAgYzAuMjQtMC4xMSwwLjQ4LTAuMjIsMC43Mi0wLjM1YzAuMjItMC4xMiwwLjQ0LTAuMjYsMC42Ni0wLjM5YzAuMjMtMC4xNCwwLjQ2LTAuMjcsMC42OS0wLjQyYzAuMjQtMC4xNiwwLjQ3LTAuMzUsMC43MS0wLjUyICAgICBjMC4xOC0wLjE0LDAuMzctMC4yNiwwLjU1LTAuNDFjMC40MS0wLjM0LDAuODEtMC42OSwxLjE4LTEuMDdsMjkuNDMtMjkuNDNjNi4yNS02LjI1LDYuMjUtMTYuMzgsMC0yMi42MyAgICAgYy02LjI1LTYuMjUtMTYuMzgtNi4yNS0yMi42MywwbC0yLjEzLDIuMTNWNzcuMDJoNzYuNzVjOC44NCwwLDE2LTcuMTYsMTYtMTZTMjQxLjI0LDQ1LjAyLDIzMi40MSw0NS4wMnoiLz4KDTwvZz4KDTwvZz4KDTwvZz4KDTwvc3ZnPg==" alt="" aria-hidden="true">
          </button>
        </div>
      </header>
      <div id="coeduca-exercises"></div>
      <div id="coeduca-game-section"></div>
      <div class="coeduca-final-score" id="coeduca-final-score-display">
        <h2>Tu puntaje</h2>
        <span class="score-number">- / 10</span>
        <p>Completa los ejercicios</p>
      </div>
      <div class="coeduca-center coeduca-pdf-actions">
        <button class="coeduca-btn coeduca-btn-accent" id="coeduca-pdf-btn" type="button">
          Descargar mi reporte PDF
        </button>
        <button class="coeduca-pdf-view-btn" id="coeduca-pdf-view-btn" type="button">
          Ver PDF
        </button>
        <p class="coeduca-pdf-help">
          En iPhone: usa Compartir &rarr; Guardar en Archivos.
        </p>
      </div>
    `;
    state.appRoot = appRoot;
    if (global.COEDUCA_OCEAN) global.COEDUCA_OCEAN.mount(cfg.examMode ? null : {
      student: state.student,
      activityId: 'ingles:' + (cfg.id || (cfg.topic + '|' + cfg.level)),
      badgeId: 'coeduca-extra-badge',
      getGrade: () => getTotalScore().grade
    });

    // Mostrar nombres en el header
    renderHeaderStudents();

    // Botón de agregar miembro durante el ejercicio
    document.getElementById('coeduca-add-member-btn').addEventListener('click', showAddMemberModal);
    document.getElementById('coeduca-switch-account-btn').addEventListener('click', switchAccount);

    // Botón de PDF
    document.getElementById('coeduca-pdf-btn').addEventListener('click', function () {
      generatePDF({ download: true });
    });
    document.getElementById('coeduca-pdf-view-btn').addEventListener('click', function () {
      generatePDF({ view: true });
    });

    if (global.COEDUCA_CLASSROOM) global.COEDUCA_CLASSROOM.mount(state, syncGameBonus);

    // Renderizar ejercicios
    const container = document.getElementById('coeduca-exercises');
    let exerciseNumber = 0;
    (cfg.exercises || []).forEach((ex, idx) => {
      if (ex.type === 'note') {
        const note = document.createElement('div');
        note.className = 'coeduca-note';
        note.innerHTML = ex.html || '';
        container.appendChild(note);
        return;
      }
      exerciseNumber++;
      const wrap = document.createElement('div');
      wrap.className = 'coeduca-exercise';
      wrap.id = 'coeduca-ex-' + idx;
      const title = ex.title || ('Ejercicio ' + exerciseNumber);
      let inner = `<div class="coeduca-exercise-title">${escapeHTML(title)}</div>`;
      if (ex.instruction) {
        inner += `<div class="coeduca-exercise-instruction">${escapeHTML(ex.instruction)}</div>`;
      }
      if (ex.image) {
        inner += `<img src="${escapeAttr(ex.image)}" alt="" class="coeduca-exercise-image">`;
      }
      if (ex.audio) {
        inner += renderAudioPlayer(ex.audio, idx);
      }
      inner += `<div class="coeduca-exercise-body" id="coeduca-ex-body-${idx}"></div>`;
      wrap.innerHTML = inner;
      container.appendChild(wrap);

      // Decidir: si ya hay respuesta previa, mostrar resumen con botón retry.
      // Si no, montar el ejercicio normalmente.
      const exerciseId = 'ex_' + idx;
      const previousAnswer = state.answers[exerciseId];
      if (isCompletedAnswer(ex, previousAnswer)) {
        renderCompletedSummary(idx, ex, previousAnswer);
      } else {
        mountExercise(idx, ex);
      }
    });

    // Renderizar juego
    if (cfg.game) {
      renderGame(cfg.game);
    } else {
      document.getElementById('coeduca-game-section').replaceChildren();
    }
  }

  // =====================================================================
  // 8b. MOUNT / RE-MOUNT DE UN EJERCICIO
  // =====================================================================
  // Monta el ejercicio en su body delegando al renderer registrado.
  // Se usa tanto en el render inicial como cuando el alumno hace "Volver a intentar".
  function mountExercise(idx, ex) {
    const body = document.getElementById('coeduca-ex-body-' + idx);
    if (!body) return;
    body.innerHTML = '';

    const renderer = state.exerciseRegistry[ex.type];
    if (!renderer) {
      body.innerHTML = '<p style="color:red">Tipo de ejercicio desconocido: ' + escapeHTML(ex.type) + '</p>';
      return;
    }
    try {
      const previous = state.answers['ex_' + idx];
      let restoringDraft = previous && !isCompletedAnswer(ex, previous);
      renderer({
        container: body,
        exerciseId: 'ex_' + idx,
        data: getPoolData(ex),
        config: ex,
        previousAnswer: state.answers['ex_' + idx]?.userAnswer,
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

  // Pinta un resumen "ya completado" con score y botón para reintentar.
  // Usa solo CSS vars del framework e inline styles, sin tocar coeduca-core.css.
  function renderCompletedSummary(idx, ex, ans) {
    const body = document.getElementById('coeduca-ex-body-' + idx);
    if (!body) return;
    const pct = ans.total > 0 ? Math.round((ans.score / ans.total) * 100) : 0;
    const isPerfect = ans.score === ans.total;
    const accentBg = isPerfect ? 'var(--coeduca-success, #4CAF50)' : 'var(--coeduca-primary, #FFD700)';
    const accentColor = isPerfect ? '#fff' : 'var(--coeduca-stroke, #1a1a1a)';

    body.innerHTML = `
      <div style="
        padding:18px;
        background:#FFF8E7;
        border:3px dashed var(--coeduca-stroke, #1a1a1a);
        border-radius:12px;
        text-align:center;
      ">
        <div style="
          display:inline-block;
          background:${accentBg};
          color:${accentColor};
          border:3px solid var(--coeduca-stroke, #1a1a1a);
          border-radius:50px;
          padding:6px 18px;
          font-weight:900;
          font-size:13px;
          letter-spacing:1px;
          text-transform:uppercase;
          box-shadow:3px 3px 0 var(--coeduca-stroke, #1a1a1a);
          margin-bottom:10px;
        ">
          ${isPerfect ? 'COMPLETADO PERFECTO' : 'YA COMPLETADO'}
        </div>
        <div style="font-size:32px; font-weight:900; color:var(--coeduca-stroke, #1a1a1a); margin:6px 0;">
          ${ans.score} / ${ans.total}
        </div>
        <div style="font-size:14px; font-weight:bold; color:var(--coeduca-stroke, #1a1a1a); margin-bottom:14px;">
          ${pct}% de aciertos
        </div>
        <button type="button"
          class="coeduca-btn coeduca-btn-info"
          data-retry-idx="${idx}"
          style="margin-top:6px;">
          Volver a intentar
        </button>
      </div>
    `;

    const retryBtn = body.querySelector('[data-retry-idx]');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        retryExercise(idx);
      });
    }
  }

  // Borra la respuesta guardada de un ejercicio y lo vuelve a montar limpio.
  function retryExercise(idx) {
    const exId = 'ex_' + idx;
    delete state.answers[exId];
    saveState();
    updateScoreDisplay();

    const cfg = state.config;
    const ex = (cfg.exercises || [])[idx];
    if (ex) mountExercise(idx, ex);
  }

  // =====================================================================
  // HEADER: nombres de estudiantes + agregar miembro durante el ejercicio
  // =====================================================================
  function renderHeaderStudents() {
    const el = document.getElementById('coeduca-header-students');
    if (!el) return;
    const stu = state.student;
    const partners = state.partners || [];
    if (!stu) { el.textContent = ''; return; }

    const names = [stu.name].concat(partners.map(p => p.name));
    
    // MEJORA 2: Extraer grados únicos
    const uniqueGrades = [...new Set([stu.grade].concat(partners.map(p => p.grade)))];
    const gradesHtml = uniqueGrades.map(g => 
      `<span class="coeduca-header-student-pill" style="background:var(--coeduca-info)">${escapeHTML(g)}</span>`
    ).join(' ');

    el.innerHTML = `
      <div style="margin-bottom: 8px;">
        <span class="coeduca-header-students-label">Grado:</span> ${gradesHtml}
      </div>
      <div>
        <span class="coeduca-header-students-label">Trabajo de:</span> 
        ${names.map(n => '<span class="coeduca-header-student-pill">' + escapeHTML(n) + '</span>').join(' ')}
      </div>
    `;
    // Si ya estamos en el límite, deshabilitar el botón de agregar
    const addBtn = document.getElementById('coeduca-add-member-btn');
    if (addBtn) {
      const atMax = partners.length >= 4;
      addBtn.disabled = atMax;
      addBtn.style.opacity = atMax ? '0.5' : '1';
      addBtn.style.cursor = atMax ? 'not-allowed' : 'pointer';
      if (atMax) addBtn.textContent = 'Equipo lleno (4/4)';
      else addBtn.textContent = '+ Agregar miembro' + (partners.length > 0 ? ' (' + partners.length + '/4)' : '');
    }
  }

  function showAddMemberModal() {
    if ((state.partners || []).length >= 4) return;

    const overlay = document.createElement('div');
    overlay.className = 'coeduca-login-overlay';
    overlay.innerHTML = `
      <div class="coeduca-login-modal" style="max-width: 400px;">
        <div class="coeduca-login-header">
          <div class="coeduca-login-badge">COEDUCA</div>
          <h2 style="font-size: 26px;">+ MIEMBRO</h2>
          <p>Ingresa el NIE del compañero que llegó tarde</p>
        </div>
        <div class="coeduca-login-modal-scroll" style="padding: 18px 24px 8px;">
          <div class="coeduca-login-field">
            <label><span class="coeduca-login-icon">+</span> NIE del compañero</label>
            <input type="text" id="coeduca-add-member-nie" class="coeduca-input coeduca-input-allow-copy"
                   inputmode="numeric" autocomplete="off" placeholder="Ej. 12379">
            <div class="coeduca-login-info" id="coeduca-add-member-info"></div>
            <div class="coeduca-login-error" id="coeduca-add-member-error">NIE no encontrado</div>
          </div>
        </div>
        <div class="coeduca-login-actions">
          <button class="coeduca-btn" id="coeduca-add-member-cancel" type="button">Cancelar</button>
          <button class="coeduca-btn coeduca-btn-success" id="coeduca-add-member-ok" disabled type="button">Agregar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const inp = overlay.querySelector('#coeduca-add-member-nie');
    const info = overlay.querySelector('#coeduca-add-member-info');
    const err = overlay.querySelector('#coeduca-add-member-error');
    const okBtn = overlay.querySelector('#coeduca-add-member-ok');
    const cancelBtn = overlay.querySelector('#coeduca-add-member-cancel');
    let candidate = null;

    async function lookup(nie) {
        if (global.COEDUCA_CLASSROOM) return global.COEDUCA_CLASSROOM.lookup(nie);
      let DB = null;
      try { DB = global.STUDENTS; } catch (e) {}
      if (!DB) { try { DB = STUDENTS; } catch (e) {} }
      if (!DB) return null;
      const clean = String(nie || '').trim();
      return clean && DB[clean] ? { nie: clean, ...DB[clean] } : null;
    }

    async function validate() {
      const v = inp.value.trim();
      candidate = null;
      okBtn.disabled = true;
      if (!v) { info.classList.remove('show'); err.classList.remove('show'); return; }
      // Duplicados
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
      let found;
      try { found = await lookup(v); }
      catch (error) { if (inp.value.trim() !== v) return; err.textContent = error.message; err.classList.add('show'); return; }
      if (inp.value.trim() !== v || !overlay.isConnected) return;
      if (!found) {
        info.classList.remove('show');
        if (v.length >= 4) { err.textContent = 'NIE no encontrado'; err.classList.add('show'); }
        else err.classList.remove('show');
        return;
      }
      if (!isAllowedAtLevel(found)) {
        info.classList.remove('show');
        err.textContent = 'Este ejercicio es para ' + getLevelLabel();
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
      // Compatibilidad: state.partner = primer compañero
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
      <div class="coeduca-audio" data-audio-player="${idx}">
        <button class="coeduca-audio-btn" data-audio-idx="${idx}" type="button"
                aria-label="Reproducir audio" aria-pressed="false">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="coeduca-audio-main">
          <div class="coeduca-audio-heading">
            <span class="coeduca-audio-label">Listen</span>
            <span class="coeduca-audio-time" aria-live="off">0:00 / --:--</span>
          </div>
          <div class="coeduca-audio-controls">
            <input class="coeduca-audio-progress" data-audio-idx="${idx}"
                   type="range" min="0" max="1" value="0" step="0.01"
                   aria-label="Progreso del audio" aria-valuetext="0:00 de --:--" disabled>
            <label class="coeduca-audio-speed-wrap">
              <select class="coeduca-audio-speed" data-audio-idx="${idx}"
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
        <audio id="coeduca-audio-${idx}" src="${escapeAttr(src)}" preload="metadata"></audio>
      </div>
    `;
  }

  function renderGame(gameCfg) {
    if (global.rigo && global.rigo.inviteGame) global.rigo.inviteGame();
    const section = document.getElementById('coeduca-game-section');
    section.innerHTML = `
      <div class="coeduca-exercise">
        <div class="coeduca-exercise-title">Juego del día</div>
        <div id="coeduca-game-body"></div>
      </div>
    `;
    const renderer = state.gameRegistry[gameCfg.type];
    if (renderer) {
      try {
        renderer({
          container: document.getElementById('coeduca-game-body'),
          config: gameCfg,
          student: state.student,
          hideAvatarButton: true,
          onWin: () => {
            const wasWin = state.gameResult === 'win';
            if (global.rigo) global.rigo.setEmotion && global.rigo.setEmotion('excited');
            if (global.rigo) global.rigo.say && global.rigo.say(
              wasWin
                ? 'Sigues siendo bueno en este juego, mantienes tu punto extra'
                : 'Felicidades, eres bueno en este juego, ten 1 punto extra',
              4500
            );
            setGameResult('win');
          },
          onTie: () => {
            const hadWin = state.gameResult === 'win';
            if (global.rigo) global.rigo.setEmotion && global.rigo.setEmotion('neutral');
            if (global.rigo) global.rigo.say && global.rigo.say(
              hadWin
                ? 'Estuvo cerca, pero conservas tu punto extra anterior'
                : 'Estamos a mano, ten 0.5 extra para tu nota',
              4500
            );
            setGameResult('tie');
          },
          onLose: () => {
            if (global.rigo) global.rigo.setEmotion && global.rigo.setEmotion('sad');
            if (global.rigo) global.rigo.say && global.rigo.say('Oops, mas suerte para la proxima.', 4500);
            setGameResult('lose');
          }
        });
      } catch (err) {
        console.error('Error rendering game', gameCfg.type, err);
        document.getElementById('coeduca-game-body').innerHTML =
          '<p style="color:red">Error: juego "' + gameCfg.type + '" no disponible</p>';
      }
    }
  }

  // =====================================================================
  // 9. AUDIO BUTTONS WIRING
  // =====================================================================
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
    const player = audio.closest('.coeduca-audio');
    if (!player) return;
    const btn = player.querySelector('.coeduca-audio-btn');
    if (!btn) return;
    const svg = btn.querySelector('svg');
    if (svg) svg.innerHTML = isPlaying ? AUDIO_PAUSE_ICON : AUDIO_PLAY_ICON;
    btn.classList.toggle('coeduca-playing', isPlaying);
    btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    btn.setAttribute('aria-label', isPlaying ? 'Pausar audio' : 'Reproducir audio');
  }

  function syncAudioProgress(audio, preferredTime) {
    const player = audio.closest('.coeduca-audio');
    if (!player) return;
    const progress = player.querySelector('.coeduca-audio-progress');
    const time = player.querySelector('.coeduca-audio-time');
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
      progress.style.setProperty('--coeduca-audio-progress', percent + '%');
      progress.setAttribute('aria-valuetext', currentLabel + ' de ' + durationLabel);
    }
    if (time) time.textContent = currentLabel + ' / ' + durationLabel;
  }

  function initializeAudioPlayer(audio) {
    if (!audio || audio.dataset.enhancedControls === 'true') return;
    audio.dataset.enhancedControls = 'true';
    audio.preservesPitch = true;
    if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;

    const player = audio.closest('.coeduca-audio');
    if (!player) return;
    const progress = player.querySelector('.coeduca-audio-progress');
    const speed = player.querySelector('.coeduca-audio-speed');
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
      const time = player.querySelector('.coeduca-audio-time');
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
    document.querySelectorAll('.coeduca-audio audio').forEach(initializeAudioPlayer);

    document.body.addEventListener('click', e => {
      const btn = e.target.closest('.coeduca-audio-btn');
      if (!btn) return;
      const idx = btn.dataset.audioIdx;
      const audio = document.getElementById('coeduca-audio-' + idx);
      if (!audio) return;
      initializeAudioPlayer(audio);
      if (audio.paused) {
        document.querySelectorAll('.coeduca-audio audio').forEach(otherAudio => {
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
  // 10. PDF GENERATION (Multi-Diseño con fix iOS)
  //
  // Cada diseño tiene su propia identidad visual: PopArt usa puntos
  // halftone + bordes gruesos estilo comic; HollyHobbie usa lineas
  // discontinuas y tipografia serif; Colorido pone a los integrantes en
  // cards separadas, Pastel es minimal limpio, PopArtVibrant usa bandas
  // diagonales rayadas. Todos respetan los colores definidos por el
  // usuario en "Generalidades - Color del tema".
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
        // Continuar hacia el visor; aun estamos dentro del toque del usuario.
      }
    }

    const url = URL.createObjectURL(blob);
    const wantsViewer = !!opts.view || !!opts.preview;
    if (wantsViewer || isIOSDevice()) {
      const opened = openPDFUrl(url, preparedViewer, !!opts.view || isIOSDevice());
      if (!opened) {
        alert('Safari bloqueo el visor. Permite las ventanas emergentes y pulsa "Ver PDF" otra vez.');
      }
      // iOS puede tardar en cargar o guardar el documento. Diez minutos
      // dejan tiempo suficiente para abrir Compartir y guardarlo.
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
      return { error: 'state.config no está inicializado (llamar COEDUCA.init primero)' };
    }
    const design = cfg.pdfDesign || 'PopArt';

    const stu = state.student || { nie: '-', name: '-', grade: '-' };
    const partners = (state.partners && state.partners.length)
      ? state.partners
      : (state.partner ? [state.partner] : []);
    const score = getTotalScore();
    const today = new Date().toLocaleDateString('es-SV');

    const userColors = cfg.colors || {};
    const T = buildThemeFromUserColors(design, userColors);
    const S = SEMANTIC_COLORS;

    const helpers = makePdfHelpers(doc, T);

    const ctx = {
      doc, design, T, S, helpers, cfg, stu, partners, score, today,
      state, sanitize: sanitizeForPDF,
    };

    const iosDownload = !opts.returnDataUrl && !opts.view && !opts.preview && isIOSDevice();
    const shareOnIOS = iosDownload && canSharePDFFile();
    const preparedViewer = !opts.returnDataUrl &&
      (!!opts.view || (iosDownload && !shareOnIOS))
      ? preparePDFViewer()
      : null;

    try {
      const renderer = DESIGN_RENDERERS[design] || DESIGN_RENDERERS['PopArt'];
      renderer(ctx);

      // Nombre del PDF: tema primero, estudiante después. Así, cuando un
      // estudiante acumula varios PDFs, identifica rápido cuál es cuál.
      const filename = sanitizeForPDF(cfg.topic || 'tarea').replace(/\s+/g, '_') + '_' +
                       sanitizeForPDF(stu.name).replace(/\s+/g, '_') + '.pdf';
      // Modo de previsualización desde el editor Android: devolver dataURL
      // base64 para que el host pueda mostrarlo en un visor in-app.
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

  // -------- Colores semanticos fijos (estados de respuesta) --------
  const SEMANTIC_COLORS = {
    white:     [255, 255, 255],
    green:     [56,  161, 62],
    red:       [210, 50,  50],
    amber:     [230, 160, 30],
    lightGray: [238, 238, 238],
    gray:      [130, 130, 130],
    darkGray:  [60,  60,  60]
  };

  // -------- Conversion #RRGGBB -> [r,g,b] --------
  function hexToRgb(hex, fallback) {
    if (!hex || typeof hex !== 'string') return fallback;
    const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }

  // Calcula luminancia para decidir si poner texto blanco o negro encima.
  function luminance(rgb) {
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }
  function readableOn(rgb) {
    return luminance(rgb) > 160 ? [26, 26, 26] : [255, 255, 255];
  }
  function mix(a, b, t) {
    return [
      Math.round(a[0] * (1 - t) + b[0] * t),
      Math.round(a[1] * (1 - t) + b[1] * t),
      Math.round(a[2] * (1 - t) + b[2] * t)
    ];
  }
  function lighten(rgb, t) { return mix(rgb, [255, 255, 255], t); }
  function darken(rgb, t)  { return mix(rgb, [0, 0, 0], t); }

  // -------- Construye el tema "T" combinando defaults del diseño
  //          con los colores del usuario --------
  function vibrantPdfColor(color, fallback) {
    const low = Math.min.apply(null, color), high = Math.max.apply(null, color);
    if (high - low < 20) return fallback.slice();
    return color.map(function (channel) { return Math.round(24 + (channel - low) * 231 / (high - low)); });
  }

  function buildThemeFromUserColors(design, colors) {
    const designDefaults = {
      'PopArt': {
        useStrokes: true,
        useHalftone: true,
        font: 'helvetica',
        radius: 3,
      },
      'PopArtVibrant': {
        useStrokes: true,
        useStripes: true,
        font: 'helvetica',
        radius: 0,
      },
      'Colorido': {
        useStrokes: false,
        useCards: true,
        font: 'helvetica',
        radius: 2,
      },
      'Pastel': {
        useStrokes: false,
        useSoft: true,
        font: 'helvetica',
        radius: 4,
      },
      'HollyHobbie': {
        useStrokes: false,
        useDashed: true,
        font: 'times',
        radius: 1,
      }
    };
    const fallbackPrimary = [255, 215, 0];
    const fallbackAccent  = [255, 107, 157];
    const fallbackBg      = [255, 248, 231];
    const fallbackCardBg  = [255, 255, 255];
    const fallbackText    = [26, 26, 26];

    const primary = hexToRgb(colors.primary, fallbackPrimary);
    const accent  = hexToRgb(colors.accent,  fallbackAccent);
    const bg      = hexToRgb(colors.bg,      fallbackBg);
    const cardBg  = hexToRgb(colors.cardBg,  fallbackCardBg);
    const text    = hexToRgb(colors.text,    fallbackText);
    const opts = designDefaults[design] || designDefaults['PopArt'];

    const theme = Object.assign({}, opts, {
      primary:   primary,
      accent:    accent,
      bg:        bg,
      cardBg:    cardBg,
      text:      text,
      dark:      text,
      onPrimary: readableOn(primary),
      onAccent:  readableOn(accent),
      onCardBg:  readableOn(cardBg),
      divider:   mix(text, cardBg, 0.7), // gris coherente con texto y card
      mutedText: mix(text, cardBg, 0.45),
      softBg:    lighten(bg, 0.3),
    });
    if (opts.useStripes) {
      theme.primary = vibrantPdfColor(primary, [24, 128, 255]);
      theme.accent = vibrantPdfColor(accent, [255, 45, 122]);
      theme.text = theme.dark = [22, 20, 38];
      theme.cardBg = [255, 255, 255];
      theme.bg = [255, 252, 242];
      theme.softBg = [255, 254, 249];
      theme.onPrimary = vibrantTextOn(theme.primary);
      theme.onAccent = vibrantTextOn(theme.accent);
      theme.onCardBg = theme.text;
      theme.divider = mix(theme.text, theme.cardBg, 0.65);
      theme.mutedText = mix(theme.text, theme.cardBg, 0.24);
      theme.vibrantYellow = [255, 220, 0];
      theme.vibrantPink = [255, 45, 122];
      theme.vibrantCyan = [0, 214, 234];
    }
    if (opts.useDashed) return prepareHollyTheme(theme);
    if (opts.useSoft) return preparePastelTheme(theme);
    if (opts.useCards) return prepareColoridoTheme(theme);
    return theme;
  }

  // -------- Helpers de dibujo --------
  function makePdfHelpers(doc, T) {
    function boxRadius(w, h, radius) {
      const value = radius === undefined && T.useHalftone ? T.radius : (radius || 0);
      return Math.min(value, w / 2, h / 2);
    }
    function fillBox(x, y, w, h, color, radius) {
      radius = boxRadius(w, h, radius);
      doc.setFillColor(color[0], color[1], color[2]);
      if (radius && radius > 0) doc.roundedRect(x, y, w, h, radius, radius, 'F');
      else doc.rect(x, y, w, h, 'F');
    }
    function borderedBox(x, y, w, h, fill, borderColor, lineW, radius) {
      radius = boxRadius(w, h, radius);
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(lineW || 0.5);
      if (radius && radius > 0) doc.roundedRect(x, y, w, h, radius, radius, 'FD');
      else doc.rect(x, y, w, h, 'FD');
    }
    function shadowBox(x, y, w, h, fill, radius) {
      const offset = T.useStripes ? 2 : 1.5;
      radius = boxRadius(w, h, radius);
      if (T.useStrokes) {
        doc.setFillColor(T.text[0], T.text[1], T.text[2]);
        if (radius && radius > 0) doc.roundedRect(x + offset, y + offset, w, h, radius, radius, 'F');
        else doc.rect(x + offset, y + offset, w, h, 'F');
      }
      fillBox(x, y, w, h, fill, radius);
    }
    function shadowBorderedBox(x, y, w, h, fill, borderColor, lineW, radius) {
      const offset = T.useStripes ? 2 : 1.5;
      radius = boxRadius(w, h, radius);
      if (T.useStrokes) {
        doc.setFillColor(T.text[0], T.text[1], T.text[2]);
        if (radius && radius > 0) doc.roundedRect(x + offset, y + offset, w, h, radius, radius, 'F');
        else doc.rect(x + offset, y + offset, w, h, 'F');
      }
      borderedBox(x, y, w, h, fill, borderColor, lineW, radius);
    }
    function setText(color, style, size) {
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont(T.font, style || 'normal');
      doc.setFontSize(size || 10);
    }
    function hline(x1, x2, y, color, lineW) {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(lineW || 0.3);
      doc.line(x1, y, x2, y);
    }
    function dashedLine(x1, y1, x2, y2, color, lineW, dash) {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(lineW || 0.4);
      doc.setLineDashPattern([dash || 1.2, dash ? dash * 0.8 : 1.0], 0);
      doc.line(x1, y1, x2, y2);
      doc.setLineDashPattern([], 0);
    }
    function dashedRect(x, y, w, h, color, lineW, dash) {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(lineW || 0.4);
      doc.setLineDashPattern([dash || 1.4, (dash || 1.4) * 0.8], 0);
      doc.rect(x, y, w, h);
      doc.setLineDashPattern([], 0);
    }
    // Patrón de puntos halftone para fondos pop-art.
    function halftone(x, y, w, h, color, step, radius) {
      doc.setFillColor(color[0], color[1], color[2]);
      const s = step || 2.6;
      const r = radius || 0.45;
      for (let py = y + s / 2; py < y + h; py += s) {
        let offX = ((Math.floor((py - y) / s)) % 2 === 0) ? 0 : s / 2;
        for (let px = x + s / 2 + offX; px < x + w; px += s) {
          doc.circle(px, py, r, 'F');
        }
      }
    }
    // Rayas diagonales (pop art vibrante).
    function stripes(x, y, w, h, color, gap, lineW) {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(lineW || 0.4);
      const g = gap || 2.2;
      doc.saveGraphicsState && doc.saveGraphicsState();
      // Clip al rectangulo
      doc.rect(x, y, w, h);
      doc.clip ? doc.clip() : null;
      doc.discardPath ? doc.discardPath() : null;
      for (let i = -h; i < w + h; i += g) {
        doc.line(x + i, y, x + i + h, y + h);
      }
      doc.restoreGraphicsState && doc.restoreGraphicsState();
    }
    // Estampita: gridcito de cuadritos pequeños (estilo Holly Hobbie cuaderno).
    function notebookGrid(x, y, w, h, color, step) {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(0.12);
      const s = step || 4;
      for (let gx = x; gx <= x + w + 0.01; gx += s) doc.line(gx, y, gx, y + h);
      for (let gy = y; gy <= y + h + 0.01; gy += s) doc.line(x, gy, x + w, gy);
    }
    return {
      fillBox, borderedBox, shadowBox, shadowBorderedBox,
      setText, hline, dashedLine, dashedRect, halftone, stripes, notebookGrid
    };
  }

  // ===================== RENDERERS POR DISEÑO =====================
  // Cada renderer construye el PDF entero a su manera. Comparten utilidades
  // de "render por ejercicio" para que el detalle de respuestas sea común.

  // Página letter en mm
  const PAGE = { W: 215.9, H: 279.4 };

  function renderExerciseRow(ctx, ex, idx, exNum, y, opts) {
    if (ctx.T.useDashed) return renderHollyExercise(ctx, ex, idx, exNum, y,
      Object.assign({}, opts, { exam: false }));
    if (ctx.T.useSoft) return renderPastelExercise(ctx, ex, idx, exNum, y,
      Object.assign({}, opts, { exam: false }));
    if (ctx.T.useCards) return renderColoridoExercise(ctx, ex, idx, exNum, y,
      Object.assign({}, opts, { exam: false }));
    if (ctx.T.useStripes) return renderVibrantExercise(ctx, ex, idx, exNum, y,
      Object.assign({}, opts, { exam: false }));
    const { doc, T, S, helpers, sanitize, state, cfg } = ctx;
    const { setText, fillBox, hline, dashedLine, borderedBox } = helpers;
    const M = opts.M, contentW = opts.contentW, right = opts.right;

    const ans = state.answers['ex_' + idx];
    const title = sanitize(ex.title || ('Ejercicio ' + exNum));

    let isNewPage = false;
    if (y > PAGE.H - 35) { doc.addPage(); y = 18; isNewPage = true; }

    if (exNum > 1 && !isNewPage) {
      const dividerY = y - (T.useHalftone ? 9 : 5);
      if (T.useDashed) dashedLine(M, dividerY, right, dividerY, T.divider, 0.3, 0.9);
      else hline(M, right, dividerY, T.divider, 0.25);
    }

    // Marcador de número: círculo en PopArt, cuadrado en PopArtVibrant,
    // tag con sello en HollyHobbie, redondito limpio en Pastel/Colorido.
    if (T.useStrokes) {
      // PopArt / PopArtVibrant: con borde grueso negro
      doc.setFillColor(T.primary[0], T.primary[1], T.primary[2]);
      doc.setDrawColor(T.text[0], T.text[1], T.text[2]);
      doc.setLineWidth(0.5);
      if (T.useStripes) doc.rect(M + 1, y - 3.5, 6, 6, 'FD');
      else doc.circle(M + 4, y - 0.8, 3, 'FD');
    } else if (T.useDashed) {
      // HollyHobbie: cuadradito con líneas discontinuas
      helpers.dashedRect(M + 1, y - 3.5, 6, 6, T.primary, 0.4, 0.7);
      doc.setFillColor(T.cardBg[0], T.cardBg[1], T.cardBg[2]);
      doc.rect(M + 1.5, y - 3, 5, 5, 'F');
      helpers.dashedRect(M + 1, y - 3.5, 6, 6, T.primary, 0.4, 0.7);
    } else {
      doc.setFillColor(T.primary[0], T.primary[1], T.primary[2]);
      doc.circle(M + 4, y - 0.8, 3, 'F');
    }

    setText(T.useStripes || T.useStrokes ? T.onPrimary : (T.useDashed ? T.primary : T.onPrimary),
      'bold', 8);
    doc.text(String(exNum), M + 4, y + 0.5, { align: 'center' });

    setText(T.text, 'bold', 10);
    doc.text(title, M + 10, y);

    // Badge resultado
    let badgeColor = S.lightGray;
    let badgeText  = 'pendiente';
    let badgeTC    = S.gray;
    if (ans) {
      const pct = ans.total > 0 ? ans.score / ans.total : 0;
      badgeText = ans.score + ' / ' + ans.total;
      if (pct >= 0.7)      { badgeColor = S.green;  badgeTC = S.white; }
      else if (pct >= 0.4) { badgeColor = S.amber;  badgeTC = T.text;  }
      else                 { badgeColor = S.red;    badgeTC = S.white; }
    }
    const bw = 28, bh = 6;
    const bx = right - bw;
    const by = y - 4.5;
    if (T.useStrokes) {
      // sombra dura
      fillBox(bx + 1, by + 1, bw, bh, T.text, T.radius);
    }
    if (T.radius && T.radius > 0) {
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(bx, by, bw, bh, T.radius, T.radius, 'F');
    } else {
      fillBox(bx, by, bw, bh, badgeColor);
    }
    setText(badgeTC, 'bold', 8);
    doc.text(badgeText, bx + bw / 2, by + 4.2, { align: 'center' });

    y += T.useHalftone ? 7 : 5;

    if (ans && ans.details && Array.isArray(ans.details) && ans.details.length) {
      if (T.useHalftone) {
        return renderExerciseDetailsColumns(ctx, ans.details, y, {
          M: M, contentW: contentW, exNum: exNum,
        }) + 13;
      }
      setText(T.mutedText, 'normal', 8);
      ans.details.forEach(function (d) {
        if (y > PAGE.H - 20) { doc.addPage(); y = 18; }
        const line = '  ' + sanitize(d);
        const split = doc.splitTextToSize(line, contentW - 10);
        doc.text(split, M + 9, y);
        y += split.length * 3.6;
      });
      y += 1;
    }
    return y + (T.useHalftone ? 13 : 8);
  }

  // Respuestas por pares: cada dato conserva su orden y su propio ajuste de líneas.
  function renderExerciseDetailsColumns(ctx, details, y, opts) {
    const { doc, T, helpers, sanitize } = ctx;
    const columnCount = details.length > 1 && opts.contentW >= 140 ? 2 : 1;
    const gutter = 8, inset = 9, lineH = 3.2, rowGap = 0.8;
    const columnW = (opts.contentW - inset - gutter * (columnCount - 1)) / columnCount;
    const bottom = PAGE.H - 20;
    const detailText = T.useCards || T.useSoft || T.useDashed ? T.onBg : T.mutedText;
    helpers.setText(detailText, 'normal', 8);
    const blocks = details.map(function (detail) {
      return doc.splitTextToSize(sanitize(detail) || '-', columnW);
    });
    function nextPage() {
      if (T.useCards) coloridoPage(ctx, true);
      else if (T.useSoft) pastelPage(ctx, true);
      else if (T.useDashed) hollyPage(ctx, true);
      else doc.addPage();
      helpers.setText(detailText, 'italic', 8);
      doc.text('Ejercicio ' + opts.exNum + ' (continuación)', opts.M + inset, 18);
      helpers.setText(detailText, 'normal', 8);
      y = 24;
    }
    for (let first = 0; first < blocks.length; first += columnCount) {
      const row = blocks.slice(first, first + columnCount);
      const lineCount = Math.max.apply(null, row.map(function (block) { return block.length; }));
      let offset = 0;
      while (offset < lineCount) {
        if (y + lineH > bottom) nextPage();
        const visibleLines = Math.min(lineCount - offset, Math.floor((bottom - y) / lineH));
        row.forEach(function (block, column) {
          const x = opts.M + inset + column * (columnW + gutter);
          if (T.useCards && offset === 0 && block.length) {
            coloridoDot(ctx, x - 2.5, y + 1.4, 0.65, T.coloridoConfetti[(first + column) % 4]);
          }
          block.slice(offset, offset + visibleLines).forEach(function (line, index) {
            doc.text(line, x, y + index * lineH, { baseline: 'top' });
          });
        });
        y += visibleLines * lineH;
        offset += visibleLines;
        if (offset < lineCount) nextPage();
      }
      y += rowGap;
    }
    return y;
  }

  // PopArt Vibrante: tinta oscura, bloques planos y sombras rectas.
  function vibrantTextOn(color) {
    const linear = color.map(function (channel) {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    const light = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    return light > 0.19 ? [22, 20, 38] : [255, 255, 255];
  }

  function vibrantBox(ctx, x, y, w, h, color, lineW) {
    ctx.helpers.shadowBox(x, y, w, h, color, 0);
    ctx.helpers.borderedBox(x, y, w, h, color, ctx.T.text, lineW || 0.7, 0);
  }

  // El patrón se recorta al adorno y nunca cruza las zonas de texto.
  function vibrantStripes(ctx, x, y, w, h, color) {
    const doc = ctx.doc;
    doc.saveGraphicsState();
    doc.rect(x, y, w, h, null);
    doc.clip();
    doc.discardPath();
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.6);
    for (let offset = -h; offset < w; offset += 3) {
      doc.line(x + offset, y + h, x + offset + h, y);
    }
    doc.restoreGraphicsState();
  }

  function renderVibrantHeader(ctx, opts) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = opts.M, w = opts.contentW;
    [T.primary, T.vibrantPink, T.vibrantYellow, T.vibrantCyan].forEach(function (color, index) {
      helpers.fillBox(index * PAGE.W / 4, 0, PAGE.W / 4, 3, color, 0);
    });
    helpers.fillBox(M, 9, w, 8, T.text, 0);
    helpers.setText([255, 255, 255], 'bold', 8);
    doc.text('COEDUCA / ENGLISH', M + 4, 13, { baseline: 'middle' });
    helpers.setText(T.vibrantYellow, 'bold', 8);
    doc.text(today, M + w - 4, 13, { baseline: 'middle', align: 'right' });

    const title = sanitize(cfg.topic || (opts.exam ? 'Examen de Inglés' : 'Actividad de Inglés')).toUpperCase();
    let fontSize = 22, titleLines;
    do {
      helpers.setText(T.onPrimary, 'bold', fontSize);
      titleLines = doc.splitTextToSize(title, w - 42);
      if (titleLines.length <= 4 || fontSize <= 12) break;
      fontSize -= 2;
    } while (true);
    const lineH = fontSize / doc.internal.scaleFactor * 1.12;
    const top = 21, height = Math.max(30, 16 + titleLines.length * lineH);
    vibrantBox(ctx, M, top, w, height, T.primary, 0.9);
    helpers.fillBox(M + w - 26, top, 26, height, T.vibrantYellow, 0);
    vibrantStripes(ctx, M + w - 26, top, 26, height, T.text);
    helpers.hline(M, M + w, top, T.text, 0.9);
    helpers.hline(M, M + w, top + height, T.text, 0.9);
    doc.setDrawColor(T.text[0], T.text[1], T.text[2]);
    doc.line(M + w - 26, top, M + w - 26, top + height);
    doc.line(M + w, top, M + w, top + height);
    helpers.setText(T.onPrimary, 'bold', 8);
    doc.text(opts.exam ? 'EXAMEN' : 'ACTIVIDAD', M + 5, top + 6);
    helpers.setText(T.onPrimary, 'bold', fontSize);
    titleLines.forEach(function (line, index) {
      doc.text(line, M + 5, top + 11 + index * lineH, { baseline: 'top' });
    });
    return top + height + 9;
  }

  function renderVibrantSummary(ctx, y, opts) {
    const { doc, T, helpers, score, state, today } = ctx;
    const M = opts.M, w = opts.contentW, height = 32, mainW = 58, gap = 5;
    if (y + height > PAGE.H - 20) { doc.addPage(); y = 18; }
    if (opts.exam) {
      vibrantBox(ctx, M, y, mainW, height, T.vibrantPink);
      helpers.setText(vibrantTextOn(T.vibrantPink), 'bold', 8);
      doc.text('EXAMEN', M + 5, y + 8);
      helpers.setText(vibrantTextOn(T.vibrantPink), 'bold', 16);
      doc.text('ENTREGADO', M + 5, y + 23);
      vibrantBox(ctx, M + mainW + gap, y, w - mainW - gap, height, T.cardBg);
      helpers.setText(T.text, 'bold', 8);
      doc.text('COMPROBANTE DE ENTREGA', M + mainW + gap + 5, y + 8);
      helpers.setText(T.text, 'bold', 13);
      doc.text('Tarea entregada', M + mainW + gap + 5, y + 18);
      helpers.setText(T.mutedText, 'normal', 9);
      doc.text(today, M + mainW + gap + 5, y + 26);
    } else {
      vibrantBox(ctx, M, y, mainW, height, T.vibrantYellow);
      helpers.setText(T.text, 'bold', 8);
      doc.text('NOTA FINAL', M + 5, y + 7);
      helpers.setText(T.text, 'bold', 32);
      doc.text(String(score.grade), M + 5, y + 25);
      helpers.setText(T.text, 'bold', 10);
      doc.text('/ 10', M + mainW - 5, y + 25, { align: 'right' });
      const stats = [
        { label: 'ACIERTOS', value: score.earned + ' / ' + score.total, color: T.primary },
        { label: 'NOTA BASE', value: score.baseGrade + ' / 10', color: T.accent },
      ];
      const extra = (Number(state.extraPoints) || 0) + (Number(state.balloonBonus) || 0);
      if (extra > 0) stats.push({ label: 'PUNTOS EXTRA', value: '+' + extra.toFixed(1), color: T.vibrantCyan });
      const available = w - mainW - gap;
      const statW = (available - gap * (stats.length - 1)) / stats.length;
      stats.forEach(function (stat, index) {
        const x = M + mainW + gap + index * (statW + gap);
        vibrantBox(ctx, x, y, statW, height, stat.color);
        helpers.setText(vibrantTextOn(stat.color), 'bold', 7);
        doc.text(stat.label, x + 4, y + 8);
        helpers.setText(vibrantTextOn(stat.color), 'bold', 13);
        const valueLines = doc.splitTextToSize(stat.value, statW - 8);
        valueLines.forEach(function (line, lineIndex) {
          doc.text(line, x + 4, y + 21 + lineIndex * 5);
        });
      });
    }
    return y + height + 10;
  }

  function renderVibrantDetailsHeader(ctx, y, opts) {
    const { doc, T, helpers } = ctx;
    const firstExercise = (ctx.cfg.exercises || []).find(function (ex) { return ex.type !== 'note'; });
    helpers.setText(T.text, 'bold', 9.5);
    const firstLines = firstExercise
      ? doc.splitTextToSize(ctx.sanitize(firstExercise.title || 'Ejercicio 1'), opts.contentW - 54).length : 1;
    const firstHeaderH = Math.max(10, firstLines * 4.2 + 4);
    if (y + 18 + firstHeaderH + 10 > PAGE.H - 20) { doc.addPage(); y = 18; }
    vibrantBox(ctx, opts.M, y, opts.contentW, 8, T.text);
    helpers.fillBox(opts.M, y, 2, 8, T.vibrantYellow, 0);
    helpers.fillBox(opts.M + opts.contentW - 22, y, 22, 8, T.vibrantCyan, 0);
    vibrantStripes(ctx, opts.M + opts.contentW - 22, y, 22, 8, T.text);
    helpers.setText([255, 255, 255], 'bold', 9);
    doc.text('DETALLE POR EJERCICIO', opts.M + 6, y + 4, { baseline: 'middle' });
    return y + 18;
  }

  function renderVibrantExercise(ctx, ex, idx, exNum, y, opts) {
    const { doc, T, S, helpers, sanitize, state, cfg } = ctx;
    const M = opts.M, w = opts.contentW, right = M + w;
    const ans = state.answers['ex_' + idx];
    helpers.setText(T.text, 'bold', 9.5);
    const titleLines = doc.splitTextToSize(sanitize(ex.title || ('Ejercicio ' + exNum)), w - 54);
    const lineH = 4.2, headerH = Math.max(10, titleLines.length * lineH + 4);
    let newPage = false;
    if (y + headerH + 10 > PAGE.H - 20) { doc.addPage(); y = 18; newPage = true; }
    if (exNum > 1 && !newPage) helpers.hline(M, right, y - 7, T.divider, 0.3);

    vibrantBox(ctx, M, y, w, headerH, T.cardBg, 0.5);
    const numberColor = [T.primary, T.vibrantPink, T.vibrantYellow][(exNum - 1) % 3];
    helpers.borderedBox(M, y, 8, headerH, numberColor, T.text, 0.5, 0);
    helpers.setText(vibrantTextOn(numberColor), 'bold', 9);
    doc.text(String(exNum), M + 4, y + headerH / 2, { baseline: 'middle', align: 'center' });
    helpers.setText(T.text, 'bold', 9.5);
    const firstY = y + headerH / 2 - (titleLines.length - 1) * lineH / 2;
    titleLines.forEach(function (line, index) {
      doc.text(line, M + 12, firstY + index * lineH, { baseline: 'middle' });
    });

    let badgeText = 'Pendiente', badgeColor = S.lightGray;
    if (ans) {
      if (opts.exam) {
        badgeText = isCompletedAnswer(ex, ans) ? 'Completado' : 'En progreso';
        badgeColor = T.vibrantYellow;
      } else {
        const fraction = ans.total > 0 ? ans.score / ans.total : 0;
        badgeText = ans.score + ' / ' + ans.total;
        badgeColor = fraction >= 0.7 ? S.green : (fraction >= 0.4 ? S.amber : S.red);
      }
    }
    const badgeY = y + (headerH - 6) / 2;
    helpers.borderedBox(right - 36, badgeY, 32, 6, badgeColor, T.text, 0.35, 0);
    helpers.setText(vibrantTextOn(badgeColor), 'bold', 7.5);
    doc.text(badgeText, right - 20, badgeY + 3, { baseline: 'middle', align: 'center' });
    y += headerH + 6;
    // En modo examen se conserva la ocultación de respuestas del comprobante.
    if (!cfg.examMode && !cfg.pdfHideDetails && ans && Array.isArray(ans.details) && ans.details.length) {
      y = renderExerciseDetailsColumns(ctx, ans.details, y, { M: M, contentW: w, exNum: exNum });
    }
    return y + 13;
  }

  function renderVibrantGame(ctx, y, opts) {
    const { doc, T, helpers, sanitize } = ctx;
    if (y + 18 > PAGE.H - 20) { doc.addPage(); y = 18; }
    y += 4;
    vibrantBox(ctx, opts.M, y, opts.contentW, 10, T.vibrantYellow);
    helpers.fillBox(opts.M, y, 3, 10, T.vibrantPink, 0);
    helpers.setText(T.text, 'bold', 9);
    doc.text('JUEGO FINAL', opts.M + 7, y + 5, { baseline: 'middle' });
    helpers.setText(T.text, 'bold', 8);
    doc.text(sanitize(ctx.cfg.game.type).toUpperCase(), opts.M + opts.contentW - 5, y + 5,
      { baseline: 'middle', align: 'right' });
    return y + 16;
  }

  // Colorido hereda los fondos del tema y elige texto legible para cada relleno.
  function coloridoTextOn(background, preferred) {
    function light(color) {
      const channels = color.map(function (channel) {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    const bgLight = light(background);
    function contrast(color) {
      const value = light(color);
      return (Math.max(value, bgLight) + 0.05) / (Math.min(value, bgLight) + 0.05);
    }
    if (preferred && contrast(preferred) >= 4.5) return preferred;
    const ink = [24, 31, 52], white = [255, 255, 255];
    return contrast(ink) >= contrast(white) ? ink : white;
  }

  function prepareColoridoTheme(theme) {
    theme.radius = 5;
    theme.bg = lighten(theme.bg, 0.2);
    theme.onBg = coloridoTextOn(theme.bg, theme.text);
    theme.onPrimary = coloridoTextOn(theme.primary, theme.text);
    theme.onAccent = coloridoTextOn(theme.accent, theme.text);
    theme.onCardBg = coloridoTextOn(theme.cardBg, theme.text);
    theme.text = theme.onCardBg;
    theme.mutedText = theme.onCardBg;
    theme.coloridoSoft = mix(theme.cardBg, theme.primary, 0.18);
    theme.coloridoRole = mix(theme.cardBg, theme.primary, 0.28);
    theme.coloridoNie = mix(theme.cardBg, theme.accent, 0.2);
    theme.coloridoBadge = mix(theme.cardBg, theme.accent, 0.25);
    // Solo se usan en detalles pequeños: el tema sigue siendo protagonista.
    theme.coloridoConfetti = [[255, 118, 131], [255, 195, 72], [45, 187, 157], [75, 150, 248]];
    return theme;
  }

  function coloridoDot(ctx, x, y, radius, color) {
    ctx.doc.setFillColor(color[0], color[1], color[2]);
    ctx.doc.circle(x, y, radius, 'F');
  }

  function coloridoPage(ctx, addPage) {
    if (addPage) ctx.doc.addPage();
    ctx.helpers.fillBox(0, 0, PAGE.W, PAGE.H, ctx.T.bg, 0);
    if (addPage) {
      ctx.helpers.fillBox(14, 8, 20, 1.5, ctx.T.primary, 0.75);
      ctx.helpers.fillBox(36, 8, 7, 1.5, ctx.T.accent, 0.75);
      ctx.T.coloridoConfetti.slice(0, 3).forEach(function (color, index) {
        coloridoDot(ctx, PAGE.W - 15 - index * 4, 8.75, 0.8, color);
      });
    }
  }

  function renderColoridoHeader(ctx, opts) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = opts.M, w = opts.contentW, top = 17;
    coloridoPage(ctx, false);
    helpers.setText(T.onBg, 'bold', 8);
    doc.text('COEDUCA / ENGLISH', M, 10);
    helpers.setText(T.onBg, 'normal', 8);
    doc.text(today, M + w, 10, { align: 'right' });

    const title = sanitize(cfg.topic || (opts.exam ? 'Examen de Inglés' : 'Actividad de Inglés'));
    let fontSize = 22, titleLines;
    do {
      helpers.setText(T.onPrimary, 'bold', fontSize);
      titleLines = doc.splitTextToSize(title, w - 43);
      if (titleLines.length <= 4 || fontSize <= 12) break;
      fontSize -= 2;
    } while (true);
    const lineH = fontSize / doc.internal.scaleFactor * 1.14;
    const height = Math.max(36, 20 + titleLines.length * lineH);
    helpers.fillBox(M, top, w, height, T.primary, T.radius);
    // Figuras recortadas en el extremo derecho, fuera de la columna del título.
    doc.saveGraphicsState();
    doc.roundedRect(M, top, w, height, T.radius, T.radius, null);
    doc.clip();
    doc.discardPath();
    coloridoDot(ctx, M + w - 8, top + height - 7, 13, T.accent);
    coloridoDot(ctx, M + w - 17, top + 10, 2.2, T.coloridoConfetti[1]);
    coloridoDot(ctx, M + w - 7, top + 6, 1.4, T.coloridoConfetti[2]);
    doc.restoreGraphicsState();
    helpers.fillBox(M + 6, top + 5, 27, 6, T.accent, 3);
    helpers.setText(T.onAccent, 'bold', 7.5);
    doc.text(opts.exam ? 'EXAMEN' : 'ACTIVIDAD', M + 19.5, top + 8,
      { baseline: 'middle', align: 'center' });
    helpers.setText(T.onPrimary, 'bold', fontSize);
    titleLines.forEach(function (line, index) {
      doc.text(line, M + 6, top + 15 + index * lineH, { baseline: 'top' });
    });
    return top + height + 9;
  }

  function renderColoridoSummary(ctx, y, opts) {
    const { doc, T, helpers, score, state, today } = ctx;
    const M = opts.M, w = opts.contentW, h = 31, mainW = 52;
    if (y + h > PAGE.H - 20) { coloridoPage(ctx, true); y = 18; }
    helpers.fillBox(M, y, w, h, T.cardBg, T.radius);
    doc.saveGraphicsState();
    doc.roundedRect(M, y, w, h, T.radius, T.radius, null);
    doc.clip();
    doc.discardPath();
    helpers.fillBox(M, y, mainW, h, T.accent, 0);
    doc.restoreGraphicsState();
    helpers.setText(T.onAccent, 'bold', 7.5);
    doc.text(opts.exam ? 'ENTREGA' : 'NOTA FINAL', M + 6, y + 7);
    if (opts.exam) {
      helpers.setText(T.onAccent, 'bold', 15);
      doc.text('RECIBIDA', M + 6, y + 23);
      helpers.setText(T.onCardBg, 'bold', 8);
      doc.text('COMPROBANTE DE ENTREGA', M + mainW + 7, y + 7);
      helpers.setText(T.onCardBg, 'bold', 13);
      doc.text('Tarea entregada', M + mainW + 7, y + 17);
      helpers.setText(T.onCardBg, 'normal', 9);
      doc.text(today, M + mainW + 7, y + 25);
      coloridoDot(ctx, M + w - 7, y + 7, 1.5, T.coloridoConfetti[2]);
    } else {
      helpers.setText(T.onAccent, 'bold', 30);
      doc.text(String(score.grade), M + 6, y + 24);
      helpers.setText(T.onAccent, 'bold', 9);
      doc.text('/ 10', M + mainW - 5, y + 24, { align: 'right' });
      const stats = [
        { label: 'ACIERTOS', value: score.earned + ' / ' + score.total },
        { label: 'NOTA BASE', value: score.baseGrade + ' / 10' },
      ];
      const extra = (Number(state.extraPoints) || 0) + (Number(state.balloonBonus) || 0);
      if (extra > 0) stats.push({ label: 'PUNTOS EXTRA', value: '+' + extra.toFixed(1) });
      const columnW = (w - mainW - 12) / stats.length;
      stats.forEach(function (stat, index) {
        const x = M + mainW + 6 + index * columnW;
        coloridoDot(ctx, x + 1, y + 7, 1, T.coloridoConfetti[index]);
        helpers.setText(T.onCardBg, 'bold', 7);
        doc.text(stat.label, x + 4, y + 7, { baseline: 'middle' });
        helpers.setText(T.onCardBg, 'bold', 12);
        const valueLines = doc.splitTextToSize(stat.value, columnW - 5);
        valueLines.forEach(function (line, lineIndex) {
          doc.text(line, x + 1, y + 19 + lineIndex * 4.5);
        });
      });
    }
    return y + h + 10;
  }

  function renderColoridoDetailsHeader(ctx, y, opts) {
    const { doc, T, helpers } = ctx;
    const firstExercise = (ctx.cfg.exercises || []).find(function (ex) { return ex.type !== 'note'; });
    helpers.setText(T.onCardBg, 'bold', 9.5);
    const count = firstExercise
      ? doc.splitTextToSize(ctx.sanitize(firstExercise.title || 'Ejercicio 1'), opts.contentW - 55).length : 1;
    if (y + 17 + Math.max(11, count * 4.2 + 4) + 10 > PAGE.H - 20) {
      coloridoPage(ctx, true); y = 18;
    }
    helpers.setText(T.onBg, 'bold', 10);
    doc.text('DETALLE POR EJERCICIO', opts.M, y + 3.5, { baseline: 'middle' });
    helpers.fillBox(opts.M, y + 8, 22, 1.5, T.primary, 0.75);
    helpers.fillBox(opts.M + 24, y + 8, 9, 1.5, T.accent, 0.75);
    helpers.fillBox(opts.M + 35, y + 8, 4, 1.5, T.coloridoConfetti[0], 0.75);
    return y + 17;
  }

  function renderColoridoExercise(ctx, ex, idx, exNum, y, opts) {
    const { doc, T, helpers, sanitize, state, cfg, S } = ctx;
    const M = opts.M, w = opts.contentW, right = M + w;
    const ans = state.answers['ex_' + idx];
    const headerText = coloridoTextOn(T.coloridoSoft, T.text);
    helpers.setText(headerText, 'bold', 9.5);
    const titleLines = doc.splitTextToSize(sanitize(ex.title || ('Ejercicio ' + exNum)), w - 55);
    const lineH = 4.2, headerH = Math.max(11, titleLines.length * lineH + 4);
    if (y + headerH + 10 > PAGE.H - 20) { coloridoPage(ctx, true); y = 18; }
    helpers.fillBox(M, y, w, headerH, T.coloridoSoft, 4);
    helpers.fillBox(M + 2, y + (headerH - 7) / 2, 8, 7, T.primary, 2.5);
    helpers.setText(T.onPrimary, 'bold', 9);
    doc.text(String(exNum), M + 6, y + headerH / 2, { baseline: 'middle', align: 'center' });
    helpers.setText(headerText, 'bold', 9.5);
    const firstY = y + headerH / 2 - (titleLines.length - 1) * lineH / 2;
    titleLines.forEach(function (line, index) {
      doc.text(line, M + 14, firstY + index * lineH, { baseline: 'middle' });
    });

    let badgeText = 'Pendiente', dotColor = S.gray;
    if (ans) {
      if (opts.exam) {
        badgeText = isCompletedAnswer(ex, ans) ? 'Completado' : 'En progreso';
        dotColor = T.primary;
      } else {
        badgeText = ans.score + ' / ' + ans.total;
        const fraction = ans.total > 0 ? ans.score / ans.total : 0;
        dotColor = fraction >= 0.7 ? S.green : (fraction >= 0.4 ? S.amber : S.red);
      }
    }
    const badgeY = y + (headerH - 6) / 2;
    helpers.fillBox(right - 36, badgeY, 32, 6, T.coloridoBadge, 3);
    coloridoDot(ctx, right - 32.5, badgeY + 3, 0.8, dotColor);
    helpers.setText(coloridoTextOn(T.coloridoBadge, T.text), 'bold', 7.5);
    doc.text(badgeText, right - 19, badgeY + 3, { baseline: 'middle', align: 'center' });
    y += headerH + 5;
    if (!cfg.examMode && !cfg.pdfHideDetails && ans && Array.isArray(ans.details) && ans.details.length) {
      y = renderExerciseDetailsColumns(ctx, ans.details, y, { M: M, contentW: w, exNum: exNum });
    }
    return y + 12;
  }

  function renderColoridoGame(ctx, y, opts) {
    const { doc, T, helpers, sanitize } = ctx;
    if (y + 19 > PAGE.H - 20) { coloridoPage(ctx, true); y = 18; }
    y += 3;
    helpers.fillBox(opts.M, y, opts.contentW, 12, T.coloridoSoft, 4);
    coloridoDot(ctx, opts.M + 4.5, y + 6, 1.4, T.coloridoConfetti[1]);
    helpers.setText(coloridoTextOn(T.coloridoSoft, T.text), 'bold', 9);
    doc.text('JUEGO FINAL', opts.M + 9, y + 6, { baseline: 'middle' });
    helpers.setText(coloridoTextOn(T.coloridoSoft, T.text), 'bold', 8);
    doc.text(sanitize(ctx.cfg.game.type).toUpperCase(), opts.M + opts.contentW - 5, y + 6,
      { baseline: 'middle', align: 'right' });
    return y + 18;
  }

  // Pastel: papel marfil y tonos cálidos derivados del tema, sin sombras.
  function preparePastelTheme(theme) {
    theme.radius = 6;
    theme.bg = mix(theme.bg, [255, 247, 235], 0.94);
    theme.cardBg = mix(theme.cardBg, [255, 252, 247], 0.96);
    theme.primary = mix(lighten(theme.primary, 0.55), [255, 225, 199], 0.12);
    theme.accent = mix(lighten(theme.accent, 0.58), [255, 215, 204], 0.12);
    theme.onBg = coloridoTextOn(theme.bg, theme.text);
    theme.onCardBg = coloridoTextOn(theme.cardBg, theme.text);
    theme.onPrimary = coloridoTextOn(theme.primary, theme.text);
    theme.onAccent = coloridoTextOn(theme.accent, theme.text);
    theme.text = theme.onCardBg;
    theme.mutedText = coloridoTextOn(theme.bg, mix(theme.text, theme.bg, 0.25));
    theme.pastelRow = mix(theme.cardBg, theme.primary, 0.38);
    theme.pastelLine = mix(theme.text, theme.cardBg, 0.82);
    theme.pastelHero = mix(theme.primary, theme.cardBg, 0.18);
    return theme;
  }

  function pastelPage(ctx, addPage) {
    const { doc, T, helpers } = ctx;
    if (addPage) doc.addPage();
    helpers.fillBox(0, 0, PAGE.W, PAGE.H, T.bg, 0);
    if (addPage) {
      helpers.setText(T.mutedText, 'normal', 7);
      doc.text('COEDUCA / ENGLISH', 14, 10);
      helpers.fillBox(PAGE.W - 38, 8, 24, 1.5, T.accent, 0.75);
    }
  }

  function renderPastelHeader(ctx, opts) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = opts.M, w = opts.contentW, center = M + w / 2, top = 16;
    pastelPage(ctx, false);
    helpers.setText(T.mutedText, 'bold', 7.5);
    doc.text('COEDUCA / ENGLISH', center, 10, { align: 'center' });
    const title = sanitize(cfg.topic || (opts.exam ? 'Examen de Inglés' : 'Actividad de Inglés'));
    let fontSize = 21, titleLines;
    do {
      helpers.setText(T.text, 'bold', fontSize);
      titleLines = doc.splitTextToSize(title, w - 24);
      if (titleLines.length <= 4 || fontSize <= 13) break;
      fontSize -= 2;
    } while (true);
    const lineH = fontSize / doc.internal.scaleFactor * 1.17;
    const height = Math.max(41, 29 + titleLines.length * lineH);
    helpers.fillBox(M, top, w, height, T.pastelHero, T.radius);
    helpers.fillBox(center - 15, top + 5, 30, 6, T.accent, 3);
    helpers.setText(T.onAccent, 'bold', 7);
    doc.text(opts.exam ? 'EXAMEN' : 'ACTIVIDAD', center, top + 8,
      { baseline: 'middle', align: 'center' });
    helpers.setText(coloridoTextOn(T.pastelHero, T.text), 'bold', fontSize);
    titleLines.forEach(function (line, index) {
      doc.text(line, center, top + 15 + index * lineH, { baseline: 'top', align: 'center' });
    });
    helpers.setText(coloridoTextOn(T.pastelHero, T.mutedText), 'normal', 8);
    doc.text('Prof. Jose Eliseo Martinez  /  ' + today, center, top + height - 6,
      { align: 'center' });
    return top + height + 9;
  }

  function renderPastelSummary(ctx, y, opts) {
    const { doc, T, helpers, score, state, today } = ctx;
    const M = opts.M, w = opts.contentW, center = M + w / 2, h = opts.exam ? 24 : 45;
    if (y + h > PAGE.H - 20) { pastelPage(ctx, true); y = 18; }
    helpers.borderedBox(M, y, w, h, T.cardBg, T.pastelLine, 0.25, T.radius);
    helpers.setText(T.mutedText, 'bold', 7.5);
    doc.text(opts.exam ? 'ESTADO DE LA ENTREGA' : 'NOTA FINAL', center, y + 6, { align: 'center' });
    if (opts.exam) {
      helpers.setText(T.text, 'bold', 13);
      doc.text('Tarea entregada', center, y + 15, { align: 'center' });
      helpers.setText(T.mutedText, 'normal', 8);
      doc.text(today, M + w - 6, y + 18, { align: 'right' });
    } else {
      helpers.setText(T.text, 'bold', 30);
      doc.text(String(score.grade), center, y + 21, { align: 'center' });
      helpers.setText(T.mutedText, 'normal', 9);
      doc.text('/ 10', center + 17, y + 21);
      const stats = [
        { label: 'ACIERTOS', value: score.earned + ' / ' + score.total },
        { label: 'NOTA BASE', value: score.baseGrade + ' / 10' },
      ];
      const extra = (Number(state.extraPoints) || 0) + (Number(state.balloonBonus) || 0);
      if (extra > 0) stats.push({ label: 'PUNTOS EXTRA', value: '+' + extra.toFixed(1) });
      const gap = 4, chipW = (w - 12 - gap * (stats.length - 1)) / stats.length;
      stats.forEach(function (stat, index) {
        const x = M + 6 + index * (chipW + gap);
        const fill = index % 2 ? T.accent : T.pastelRow;
        helpers.fillBox(x, y + 28, chipW, 12, fill, 3);
        helpers.setText(coloridoTextOn(fill, T.mutedText), 'bold', 7);
        doc.text(stat.label, x + chipW / 2, y + 31.5, { baseline: 'middle', align: 'center' });
        helpers.setText(coloridoTextOn(fill, T.text), 'bold', 10);
        doc.text(stat.value, x + chipW / 2, y + 36.5, { baseline: 'middle', align: 'center' });
      });
    }
    return y + h + 10;
  }

  function renderPastelDetailsHeader(ctx, y, opts) {
    const { doc, T, helpers } = ctx;
    const exercises = (ctx.cfg.exercises || []).filter(function (ex) { return ex.type !== 'note'; });
    helpers.setText(T.text, 'bold', 9.5);
    const count = exercises.length
      ? doc.splitTextToSize(ctx.sanitize(exercises[0].title || 'Ejercicio 1'), opts.contentW - 55).length : 1;
    if (y + 18 + Math.max(11, count * 4.2 + 4) + 10 > PAGE.H - 20) {
      pastelPage(ctx, true); y = 18;
    }
    helpers.setText(T.onBg, 'bold', 12);
    doc.text('Detalle de ejercicios', opts.M, y + 4, { baseline: 'middle' });
    helpers.fillBox(opts.M + opts.contentW - 32, y + 1, 32, 6, T.primary, 3);
    helpers.setText(T.onPrimary, 'normal', 8);
    doc.text(exercises.length + (exercises.length === 1 ? ' ejercicio' : ' ejercicios'),
      opts.M + opts.contentW - 16, y + 4, { baseline: 'middle', align: 'center' });
    helpers.hline(opts.M, opts.M + opts.contentW, y + 10, T.pastelLine, 0.2);
    return y + 18;
  }

  function renderPastelExercise(ctx, ex, idx, exNum, y, opts) {
    const { doc, T, helpers, sanitize, state, cfg, S } = ctx;
    const M = opts.M, w = opts.contentW, right = M + w;
    const ans = state.answers['ex_' + idx];
    helpers.setText(T.text, 'bold', 9.5);
    const titleLines = doc.splitTextToSize(sanitize(ex.title || ('Ejercicio ' + exNum)), w - 55);
    const lineH = 4.2, headerH = Math.max(11, titleLines.length * lineH + 4);
    let newPage = false;
    if (y + headerH + 10 > PAGE.H - 20) { pastelPage(ctx, true); y = 18; newPage = true; }
    if (exNum > 1 && !newPage) helpers.hline(M + 12, right, y - 7, T.pastelLine, 0.2);
    helpers.fillBox(M, y, w, headerH, T.cardBg, 4);
    helpers.fillBox(M + 1.5, y + (headerH - 8) / 2, 8, 8, T.primary, 4);
    helpers.setText(T.onPrimary, 'bold', 9);
    doc.text(String(exNum), M + 5.5, y + headerH / 2, { baseline: 'middle', align: 'center' });
    helpers.setText(T.text, 'bold', 9.5);
    const firstY = y + headerH / 2 - (titleLines.length - 1) * lineH / 2;
    titleLines.forEach(function (line, index) {
      doc.text(line, M + 14, firstY + index * lineH, { baseline: 'middle' });
    });
    let badgeText = 'Pendiente', badgeFill = T.pastelRow;
    if (ans) {
      if (opts.exam) {
        badgeText = isCompletedAnswer(ex, ans) ? 'Completado' : 'En progreso';
        badgeFill = T.accent;
      } else {
        badgeText = ans.score + ' / ' + ans.total;
        const fraction = ans.total > 0 ? ans.score / ans.total : 0;
        const resultColor = fraction >= 0.7 ? S.green : (fraction >= 0.4 ? S.amber : S.red);
        badgeFill = mix(T.cardBg, resultColor, 0.12);
      }
    }
    const badgeY = y + (headerH - 6) / 2;
    helpers.fillBox(right - 36, badgeY, 32, 6, badgeFill, 3);
    helpers.setText(coloridoTextOn(badgeFill, T.text), 'bold', 7.5);
    doc.text(badgeText, right - 20, badgeY + 3, { baseline: 'middle', align: 'center' });
    y += headerH + 5;
    if (!cfg.examMode && !cfg.pdfHideDetails && ans && Array.isArray(ans.details) && ans.details.length) {
      y = renderExerciseDetailsColumns(ctx, ans.details, y, { M: M, contentW: w, exNum: exNum });
    }
    return y + 13;
  }

  function renderPastelGame(ctx, y, opts) {
    const { doc, T, helpers, sanitize } = ctx;
    if (y + 19 > PAGE.H - 20) { pastelPage(ctx, true); y = 18; }
    y += 3;
    helpers.borderedBox(opts.M, y, opts.contentW, 12, T.cardBg, T.pastelLine, 0.25, 4);
    helpers.fillBox(opts.M + 3, y + 3, 6, 6, T.accent, 3);
    helpers.setText(T.text, 'bold', 9);
    doc.text('Juego final', opts.M + 12, y + 6, { baseline: 'middle' });
    helpers.setText(T.mutedText, 'normal', 8);
    doc.text(sanitize(ctx.cfg.game.type).toUpperCase(), opts.M + opts.contentW - 5, y + 6,
      { baseline: 'middle', align: 'right' });
    return y + 18;
  }

  // Holly Hobbie: papel crema, retazos de tela, flores y costuras.
  function prepareHollyTheme(theme) {
    theme.radius = 4;
    theme.bg = mix(theme.bg, [255, 249, 235], 0.96);
    theme.cardBg = mix(theme.cardBg, [255, 253, 245], 0.97);
    theme.primary = mix(theme.primary, [124, 175, 199], 0.4);
    theme.accent = mix(theme.accent, [223, 142, 157], 0.35);
    theme.text = coloridoTextOn(theme.cardBg, mix(theme.text, [77, 59, 46], 0.5));
    theme.onBg = coloridoTextOn(theme.bg, theme.text);
    theme.onCardBg = theme.text;
    theme.onPrimary = coloridoTextOn(theme.primary, theme.text);
    theme.onAccent = coloridoTextOn(theme.accent, theme.text);
    theme.mutedText = coloridoTextOn(theme.bg, mix(theme.text, theme.bg, 0.2));
    theme.hollyBlue = [122, 168, 195];
    theme.hollySage = [156, 183, 137];
    theme.hollyGold = [239, 190, 93];
    theme.hollyPalette = [theme.primary, theme.accent, theme.hollyBlue, theme.hollySage, theme.hollyGold];
    theme.hollyThread = mix(theme.text, theme.bg, 0.48);
    theme.hollyLine = mix(theme.text, theme.cardBg, 0.76);
    theme.hollyShadow = mix(theme.bg, theme.text, 0.09);
    return theme;
  }

  function hollyStitch(ctx, x, y, w, h, color, radius) {
    const doc = ctx.doc;
    doc.saveGraphicsState();
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1, 0.85], 0);
    if (radius) doc.roundedRect(x, y, w, h, radius, radius, 'S');
    else doc.rect(x, y, w, h, 'S');
    doc.restoreGraphicsState();
  }

  function hollyPatch(ctx, x, y, w, h, color) {
    ctx.helpers.fillBox(x + 0.8, y + 1.2, w, h, ctx.T.hollyShadow, 3);
    ctx.helpers.fillBox(x, y, w, h, color, 3);
    hollyStitch(ctx, x + 1.2, y + 1.2, w - 2.4, h - 2.4, ctx.T.hollyThread, 2);
  }

  // Cuadros de tela recortados al adorno; las zonas de texto quedan lisas.
  function hollyFabric(ctx, x, y, w, h, color) {
    const { doc, T, helpers } = ctx;
    const base = mix(T.cardBg, color, 0.14);
    const stripe = mix(T.cardBg, color, 0.35);
    const cross = mix(T.cardBg, color, 0.58);
    doc.saveGraphicsState();
    doc.rect(x, y, w, h, null);
    doc.clip();
    doc.discardPath();
    helpers.fillBox(x, y, w, h, base, 0);
    for (let dx = 0; dx < w; dx += 5) helpers.fillBox(x + dx, y, 2.5, h, stripe, 0);
    for (let dy = 0; dy < h; dy += 5) helpers.fillBox(x, y + dy, w, 2.5, stripe, 0);
    for (let dx = 0; dx < w; dx += 5) {
      for (let dy = 0; dy < h; dy += 5) helpers.fillBox(x + dx, y + dy, 2.5, 2.5, cross, 0);
    }
    doc.restoreGraphicsState();
  }

  function hollyFlower(ctx, x, y, size, color) {
    const doc = ctx.doc;
    doc.setFillColor(ctx.T.hollySage[0], ctx.T.hollySage[1], ctx.T.hollySage[2]);
    doc.ellipse(x + size * 0.65, y + size * 0.75, size * 0.5, size * 0.2, 'F');
    doc.setFillColor(color[0], color[1], color[2]);
    for (let petal = 0; petal < 5; petal++) {
      const angle = petal * Math.PI * 2 / 5 - Math.PI / 2;
      doc.circle(x + Math.cos(angle) * size * 0.53, y + Math.sin(angle) * size * 0.53, size * 0.38, 'F');
    }
    doc.setFillColor(ctx.T.hollyGold[0], ctx.T.hollyGold[1], ctx.T.hollyGold[2]);
    doc.circle(x, y, size * 0.27, 'F');
  }

  function hollyButton(ctx, x, y, radius, color) {
    const { doc, T } = ctx;
    doc.saveGraphicsState();
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(T.hollyThread[0], T.hollyThread[1], T.hollyThread[2]);
    doc.setLineWidth(0.2);
    doc.circle(x, y, radius, 'FD');
    doc.setFillColor(T.cardBg[0], T.cardBg[1], T.cardBg[2]);
    [-1, 1].forEach(function (direction) {
      doc.circle(x + direction * radius * 0.3, y, radius * 0.14, 'F');
    });
    doc.line(x - radius * 0.3, y, x + radius * 0.3, y);
    doc.restoreGraphicsState();
  }

  function hollyPage(ctx, addPage) {
    const { doc, T, helpers } = ctx;
    if (addPage) doc.addPage();
    helpers.fillBox(0, 0, PAGE.W, PAGE.H, T.bg, 0);
    hollyFabric(ctx, 0, 0, PAGE.W, 5, T.hollyBlue);
    hollyFabric(ctx, 0, PAGE.H - 5, PAGE.W, 5, T.accent);
    if (addPage) {
      helpers.setText(T.mutedText, 'italic', 8);
      doc.text('COEDUCA / Cuaderno de inglés', 14, 12);
      hollyFlower(ctx, PAGE.W - 18, 11.5, 2.7, T.accent);
    }
  }

  function renderHollyHeader(ctx, opts) {
    const { doc, T, helpers, sanitize, cfg, today } = ctx;
    const M = opts.M, w = opts.contentW, center = M + w / 2, top = 20;
    hollyPage(ctx, false);
    helpers.setText(T.mutedText, 'italic', 9);
    doc.text('COEDUCA / Cuaderno de inglés', center, 13, { align: 'center' });
    const title = sanitize(cfg.topic || (opts.exam ? 'Examen de Inglés' : 'Actividad de Inglés'));
    let fontSize = 23, titleLines;
    do {
      helpers.setText(T.text, 'bolditalic', fontSize);
      titleLines = doc.splitTextToSize(title, w - 54);
      if (titleLines.length <= 3 || fontSize <= 13) break;
      fontSize -= 2;
    } while (true);
    const lineH = fontSize / doc.internal.scaleFactor * 1.15;
    const height = Math.max(43, 32 + titleLines.length * lineH);
    helpers.fillBox(M + 0.8, top + 1.2, w, height, T.hollyShadow, 4);
    helpers.fillBox(M, top, w, height, T.cardBg, 4);
    doc.saveGraphicsState();
    doc.roundedRect(M, top, w, height, 4, 4, null);
    doc.clip();
    doc.discardPath();
    hollyFabric(ctx, M, top, 20, height, T.hollyBlue);
    hollyFabric(ctx, M + w - 20, top, 20, height, T.accent);
    doc.restoreGraphicsState();
    hollyStitch(ctx, M + 1.5, top + 1.5, w - 3, height - 3, T.hollyThread, 3);
    hollyFlower(ctx, M + 10, top + height - 11, 4.5, T.accent);
    hollyFlower(ctx, M + w - 10, top + 11, 4.5, T.hollyBlue);
    hollyButton(ctx, M + 10, top + 10, 2.5, T.hollyGold);
    hollyButton(ctx, M + w - 10, top + height - 10, 2.5, T.hollySage);
    helpers.fillBox(center - 16, top + 5, 32, 7, mix(T.cardBg, T.hollyGold, 0.4), 2);
    helpers.setText(T.text, 'bold', 8);
    doc.text(opts.exam ? 'EXAMEN' : 'ACTIVIDAD', center, top + 8.5,
      { baseline: 'middle', align: 'center' });
    helpers.setText(T.text, 'bolditalic', fontSize);
    titleLines.forEach(function (line, index) {
      doc.text(line, center, top + 18 + index * lineH, { baseline: 'top', align: 'center' });
    });
    helpers.setText(T.mutedText, 'normal', 8);
    doc.text('Prof. Jose Eliseo Martinez / ' + today, center, top + height - 6, { align: 'center' });
    return top + height + 9;
  }

  function renderHollySummary(ctx, y, opts) {
    const { doc, T, helpers, score, state, today } = ctx;
    const M = opts.M, w = opts.contentW, h = 32, mainW = 51, gap = 5;
    if (y + h + 2 > PAGE.H - 20) { hollyPage(ctx, true); y = 18; }
    const noteFill = mix(T.cardBg, T.hollyGold, 0.4);
    hollyPatch(ctx, M, y, mainW, h, noteFill);
    helpers.setText(coloridoTextOn(noteFill, T.text), 'bold', 8);
    doc.text(opts.exam ? 'EXAMEN' : 'NOTA FINAL', M + 6, y + 8);
    if (opts.exam) {
      helpers.setText(T.text, 'bold', 16);
      doc.text('RECIBIDO', M + 6, y + 24);
      const x = M + mainW + gap, width = w - mainW - gap;
      hollyPatch(ctx, x, y, width, h, T.cardBg);
      helpers.setText(T.mutedText, 'bold', 8);
      doc.text('COMPROBANTE DE ENTREGA', x + 6, y + 8);
      helpers.setText(T.text, 'bold', 14);
      doc.text('Tarea entregada', x + 6, y + 18);
      helpers.setText(T.mutedText, 'normal', 9);
      doc.text(today, x + 6, y + 26);
      hollyFlower(ctx, x + width - 10, y + 20, 3.5, T.accent);
    } else {
      helpers.setText(T.text, 'bold', 30);
      doc.text(String(score.grade), M + 6, y + 25);
      helpers.setText(T.mutedText, 'normal', 9);
      doc.text('/ 10', M + mainW - 5, y + 25, { align: 'right' });
      const stats = [
        { label: 'ACIERTOS', value: score.earned + ' / ' + score.total, color: T.hollyBlue },
        { label: 'NOTA BASE', value: score.baseGrade + ' / 10', color: T.accent },
      ];
      const extra = (Number(state.extraPoints) || 0) + (Number(state.balloonBonus) || 0);
      if (extra > 0) stats.push({ label: 'PUNTOS EXTRA', value: '+' + extra.toFixed(1), color: T.hollySage });
      const statW = (w - mainW - gap - gap * (stats.length - 1)) / stats.length;
      stats.forEach(function (stat, index) {
        const x = M + mainW + gap + index * (statW + gap);
        const fill = mix(T.cardBg, stat.color, 0.35);
        hollyPatch(ctx, x, y, statW, h, fill);
        helpers.setText(coloridoTextOn(fill, T.text), 'bold', 7.5);
        doc.text(stat.label, x + 5, y + 8);
        helpers.setText(coloridoTextOn(fill, T.text), 'bold', 12);
        doc.text(stat.value, x + 5, y + 23);
      });
    }
    return y + h + 10;
  }

  function renderHollyDetailsHeader(ctx, y, opts) {
    const { doc, T, helpers } = ctx;
    const exercises = (ctx.cfg.exercises || []).filter(function (ex) { return ex.type !== 'note'; });
    helpers.setText(T.text, 'bold', 10);
    const lines = exercises.length
      ? doc.splitTextToSize(ctx.sanitize(exercises[0].title || 'Ejercicio 1'), opts.contentW - 55).length : 1;
    if (y + 19 + Math.max(12, lines * 4.2 + 5) + 10 > PAGE.H - 20) { hollyPage(ctx, true); y = 18; }
    const fill = mix(T.cardBg, T.hollySage, 0.35);
    hollyPatch(ctx, opts.M, y, opts.contentW, 10, fill);
    hollyFlower(ctx, opts.M + 6, y + 5, 2.5, T.accent);
    helpers.setText(coloridoTextOn(fill, T.text), 'bold', 11);
    doc.text('Detalle de ejercicios', opts.M + 12, y + 5, { baseline: 'middle' });
    helpers.setText(coloridoTextOn(fill, T.mutedText), 'normal', 8);
    doc.text(exercises.length + (exercises.length === 1 ? ' ejercicio' : ' ejercicios'),
      opts.M + opts.contentW - 6, y + 5, { baseline: 'middle', align: 'right' });
    return y + 19;
  }

  function renderHollyExercise(ctx, ex, idx, exNum, y, opts) {
    const { doc, T, helpers, sanitize, state, cfg, S } = ctx;
    const M = opts.M, w = opts.contentW, right = M + w;
    const ans = state.answers['ex_' + idx];
    helpers.setText(T.text, 'bold', 10);
    const titleLines = doc.splitTextToSize(sanitize(ex.title || ('Ejercicio ' + exNum)), w - 55);
    const lineH = 4.2, headerH = Math.max(12, titleLines.length * lineH + 5);
    if (y + headerH + 10 > PAGE.H - 20) { hollyPage(ctx, true); y = 18; }
    hollyPatch(ctx, M, y, w, headerH, T.cardBg);
    const marker = mix(T.cardBg, T.hollyPalette[(exNum - 1) % T.hollyPalette.length], 0.5);
    helpers.fillBox(M + 2, y + (headerH - 8) / 2, 8, 8, marker, 2);
    helpers.setText(coloridoTextOn(marker, T.text), 'bold', 10);
    doc.text(String(exNum), M + 6, y + headerH / 2, { baseline: 'middle', align: 'center' });
    helpers.setText(T.text, 'bold', 10);
    const firstY = y + headerH / 2 - (titleLines.length - 1) * lineH / 2;
    titleLines.forEach(function (line, index) {
      doc.text(line, M + 14, firstY + index * lineH, { baseline: 'middle' });
    });
    let badgeText = 'Pendiente', badgeFill = mix(T.cardBg, T.hollyBlue, 0.18);
    if (ans) {
      if (opts.exam) {
        badgeText = isCompletedAnswer(ex, ans) ? 'Completado' : 'En progreso';
        badgeFill = mix(T.cardBg, T.hollySage, 0.35);
      } else {
        badgeText = ans.score + ' / ' + ans.total;
        const fraction = ans.total > 0 ? ans.score / ans.total : 0;
        const resultColor = fraction >= 0.7 ? S.green : (fraction >= 0.4 ? S.amber : S.red);
        badgeFill = mix(T.cardBg, resultColor, 0.15);
      }
    }
    const badgeY = y + (headerH - 6) / 2;
    helpers.fillBox(right - 36, badgeY, 31, 6, badgeFill, 2);
    helpers.setText(coloridoTextOn(badgeFill, T.text), 'bold', 8);
    doc.text(badgeText, right - 20.5, badgeY + 3, { baseline: 'middle', align: 'center' });
    y += headerH + 6;
    if (!cfg.examMode && !cfg.pdfHideDetails && ans && Array.isArray(ans.details) && ans.details.length) {
      y = renderExerciseDetailsColumns(ctx, ans.details, y, { M: M, contentW: w, exNum: exNum });
    }
    return y + 13;
  }

  function renderHollyGame(ctx, y, opts) {
    const { doc, T, helpers, sanitize } = ctx;
    if (y + 20 > PAGE.H - 20) { hollyPage(ctx, true); y = 18; }
    y += 3;
    const fill = mix(T.cardBg, T.hollySage, 0.3);
    hollyPatch(ctx, opts.M, y, opts.contentW, 13, fill);
    hollyButton(ctx, opts.M + 6, y + 6.5, 2.5, T.accent);
    helpers.setText(coloridoTextOn(fill, T.text), 'bold', 10);
    doc.text('Juego final', opts.M + 12, y + 6.5, { baseline: 'middle' });
    helpers.setText(coloridoTextOn(fill, T.mutedText), 'normal', 9);
    doc.text(sanitize(ctx.cfg.game.type).toUpperCase(), opts.M + opts.contentW - 6, y + 6.5,
      { baseline: 'middle', align: 'right' });
    return y + 19;
  }

  // Tabla común: filas compactas y paginación; cada diseño define sus rellenos.
  function renderStudentTable(ctx, y, opts) {
    const { doc, T, helpers, sanitize, stu, partners, cfg } = ctx;
    const M = opts.M, w = opts.contentW, bottom = PAGE.H - 20;
    const lineH = 4.2, padding = 4;
    const headingColor = T.useStripes ? T.text : (T.useDashed ? mix(T.cardBg, T.primary, 0.5) : T.primary);
    const headingText = T.useDashed ? coloridoTextOn(headingColor, T.text) : (T.useStripes ? [255, 255, 255] : T.onPrimary);
    const gridColor = T.useSoft ? T.pastelLine : (T.useDashed ? T.hollyLine : T.text);
    const gridWidth = T.useSoft || T.useDashed ? 0.2 : 0.5;
    function lines(text, width, style, size) {
      helpers.setText(T.text, style, size);
      return doc.splitTextToSize(sanitize(text) || '-', width);
    }
    function centeredCell(textLines, x, top, height, factor, align) {
      const step = doc.getFontSize() / doc.internal.scaleFactor * factor;
      const firstY = top + height / 2 - (textLines.length - 1) * step / 2;
      textLines.forEach(function (text, index) {
        doc.text(text, x, firstY + index * step, { baseline: 'middle', align: align || 'left' });
      });
    }
    let grade = sanitize(stu.grade || '-');
    if (cfg.level) grade += ' / Nivel: ' + sanitize(cfg.level);
    const gradeLines = lines(grade, w * 0.44, 'normal', 7.5);
    const headingH = Math.max(8, gradeLines.length * 3.4 + padding);
    const entries = [{ label: 'Estudiante', person: stu }].concat(partners.map(function (person, index) {
      return { label: 'Compañero ' + (index + 1), person: person };
    }));
    const maxLines = Math.max(1, Math.floor((bottom - 18 - headingH - padding) / lineH));
    const rows = [];
    entries.forEach(function (entry) {
      const names = lines(entry.person.name || '-', w - 79, 'bold', 9);
      const nies = lines('NIE: ' + (entry.person.nie || '-'), 34, 'normal', 8);
      const count = Math.max(names.length, nies.length);
      for (let offset = 0; offset < count; offset += maxLines) {
        const nameLines = names.slice(offset, offset + maxLines);
        const nieLines = nies.slice(offset, offset + maxLines);
        rows.push({ label: entry.label, nameLines: nameLines, nieLines: nieLines,
          height: Math.max(10, Math.max(nameLines.length, nieLines.length) * lineH + padding) });
      }
    });
    if (T.useStripes || T.useCards || T.useSoft || T.useDashed) {
      const rowHeight = Math.max.apply(null, rows.map(function (row) { return row.height; }));
      rows.forEach(function (row) { row.height = rowHeight; });
    }

    function nextTablePage() {
      if (T.useCards) coloridoPage(ctx, true);
      else if (T.useSoft) pastelPage(ctx, true);
      else if (T.useDashed) hollyPage(ctx, true);
      else doc.addPage();
      y = 18;
    }
    let first = 0;
    while (first < rows.length) {
      if (y + headingH + rows[first].height > bottom) nextTablePage();
      let end = first, tableH = headingH;
      while (end < rows.length && y + tableH + rows[end].height <= bottom) {
        tableH += rows[end].height;
        end += 1;
      }
      if (T.useDashed) helpers.fillBox(M + 0.8, y + 1.2, w, tableH, T.hollyShadow, T.radius);
      helpers.shadowBox(M, y, w, tableH, T.cardBg, T.radius);
      doc.saveGraphicsState();
      if (T.radius > 0) doc.roundedRect(M, y, w, tableH, T.radius, T.radius, null);
      else doc.rect(M, y, w, tableH, null);
      doc.clip();
      doc.discardPath();
      // El relleno del encabezado es plano dentro del contorno común.
      helpers.fillBox(M, y, w, headingH, headingColor, 0);
      if (T.useCards) {
        let rowTop = y + headingH;
        for (let index = first; index < end; index += 1) {
          const rowHeight = rows[index].height;
          helpers.fillBox(M, rowTop, w, rowHeight, index % 2 ? T.coloridoSoft : T.cardBg, 0);
          helpers.fillBox(M, rowTop, 31, rowHeight, T.coloridoRole, 0);
          helpers.fillBox(M + w - 41, rowTop, 41, rowHeight, T.coloridoNie, 0);
          rowTop += rowHeight;
        }
      } else if (T.useStripes || T.useSoft || T.useDashed) {
        let stripeY = y + headingH;
        for (let index = first; index < end; index += 1) {
          if (index % 2) helpers.fillBox(M, stripeY, w, rows[index].height,
            T.useSoft ? T.pastelRow : (T.useDashed ? mix(T.cardBg, T.hollyBlue, 0.13) : lighten(T.primary, 0.94)), 0);
          stripeY += rows[index].height;
        }
      }
      doc.restoreGraphicsState();
      if (T.useDashed) hollyButton(ctx, M + 4.5, y + headingH / 2, 1.6, T.hollyGold);
      helpers.setText(headingText, 'bold', 8);
      doc.text(partners.length ? 'EQUIPO DE TRABAJO' : 'DATOS DEL ESTUDIANTE', M + (T.useDashed ? 9 : 5), y + headingH / 2,
        { baseline: 'middle' });
      helpers.setText(T.useStripes ? T.vibrantYellow : headingText, 'normal', 7.5);
      centeredCell(gradeLines, M + w - 5, y, headingH, 1.25, 'right');

      if (!T.useCards) {
        helpers.hline(M, M + w, y + headingH, gridColor, gridWidth);
        doc.line(M + 31, y + headingH, M + 31, y + tableH);
        doc.line(M + w - 41, y + headingH, M + w - 41, y + tableH);
      }
      let rowY = y + headingH;
      for (let index = first; index < end; index += 1) {
        const row = rows[index];
        if (index > first && !T.useCards) helpers.hline(M, M + w, rowY, gridColor, T.useSoft || T.useDashed ? 0.2 : 0.35);
        helpers.setText(T.useCards ? coloridoTextOn(T.coloridoRole, T.text) : T.text,
          T.useCards ? 'bold' : 'normal', 8);
        doc.text(row.label, M + 5, rowY + row.height / 2, { baseline: 'middle' });
        helpers.setText(T.useCards ? coloridoTextOn(index % 2 ? T.coloridoSoft : T.cardBg, T.text) : T.text,
          'bold', 9);
        centeredCell(row.nameLines, M + 36, rowY, row.height, 1.3);
        helpers.setText(T.useCards ? coloridoTextOn(T.coloridoNie, T.text) : T.text, 'normal', 8);
        centeredCell(row.nieLines, M + w - 37, rowY, row.height, 1.45);
        rowY += row.height;
      }
      if (T.useDashed) {
        hollyStitch(ctx, M + 1, y + 1, w - 2, tableH - 2, T.hollyThread, 3);
      } else if (!T.useCards) {
        doc.setDrawColor(gridColor[0], gridColor[1], gridColor[2]);
        doc.setLineWidth(T.useSoft ? 0.25 : 0.85);
        if (T.radius > 0) doc.roundedRect(M, y, w, tableH, T.radius, T.radius, 'S');
        else doc.rect(M, y, w, tableH, 'S');
      }
      y += tableH;
      first = end;
      if (first < rows.length) nextTablePage();
    }
    return y + 9;
  }

  function renderTeamLinear(ctx, y, opts) {
    if (ctx.T.useHalftone || ctx.T.useStripes || ctx.T.useSoft || ctx.T.useDashed) return renderStudentTable(ctx, y, opts);
    const { T, S, helpers, sanitize, stu, partners, cfg } = ctx;
    const M = opts.M, contentW = opts.contentW;
    const { borderedBox, fillBox, setText, hline, dashedLine } = helpers;

    const teamRows = 2 + partners.length;
    const teamH = 10 + teamRows * 7 + 4;
    borderedBox(M, y, contentW, teamH, T.cardBg, T.divider, 0.4, T.radius);
    fillBox(M, y, 3, teamH, T.primary);

    setText(T.text, 'bold', 8);
    ctx.doc.text('EQUIPO', M + 8, y + 6.5);

    if (T.useDashed) dashedLine(M + 3, y + 8.5, M + contentW, y + 8.5, T.divider, 0.35, 0.8);
    else hline(M + 3, M + contentW, y + 8.5, T.divider, 0.3);

    let yy = y + 13;
    const col1 = M + 8;
    const col2 = M + 38;

    setText(T.text, 'bold', 9);
    ctx.doc.text('Estudiante:', col1, yy);
    setText(T.mutedText, 'normal', 9);
    ctx.doc.text(sanitize(stu.name) + '  (NIE: ' + sanitize(stu.nie) + ')', col2, yy);
    yy += 7;

    setText(T.text, 'bold', 9);
    ctx.doc.text('Grado:', col1, yy);
    setText(T.mutedText, 'normal', 9);
    var gradeLevel = sanitize(stu.grade);
    if (cfg.level) gradeLevel += '   Nivel: ' + sanitize(cfg.level);
    ctx.doc.text(gradeLevel, col2, yy);
    yy += 7;

    if (partners.length === 0) {
      setText(S.gray, 'italic', 9);
      ctx.doc.text('Trabajo individual', col1, yy);
    } else {
      partners.forEach(function (p, i) {
        setText(T.text, 'bold', 9);
        ctx.doc.text('Compañero ' + (i + 1) + ':', col1, yy);
        setText(T.mutedText, 'normal', 9);
        ctx.doc.text(sanitize(p.name) + '  (NIE: ' + sanitize(p.nie) + ')', col2, yy);
        yy += 7;
      });
    }

    return y + teamH + 10;
  }

  // Layout "Colorido": equipo en cards separadas con avatares de iniciales.
  function renderTeamCards(ctx, y, opts) {
    const { T, helpers, sanitize, stu, partners } = ctx;
    const doc = ctx.doc;
    const M = opts.M, contentW = opts.contentW;
    const all = [{ role: 'Estudiante', p: stu, primary: true }].concat(
      partners.map(function (p, i) {
        return { role: 'Compañero ' + (i + 1), p: p, primary: false };
      })
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
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = M + col * (cardW + GAP);
      const cy = y + row * (cardH + GAP);
      const fillC = entry.primary ? T.primary : T.cardBg;
      const txt = entry.primary ? T.onPrimary : T.text;

      if (T.useStrokes) {
        doc.setFillColor(T.text[0], T.text[1], T.text[2]);
        doc.rect(cx + 1.2, cy + 1.2, cardW, cardH, 'F');
      }
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

      // Avatar circular con inicial
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

  // ----- DISEÑO 1: POP ART (puntos halftone + bordes gruesos) -----
  function renderPopArt(ctx) {
    const { doc, T, helpers, sanitize, cfg, score, today } = ctx;
    const { fillBox, shadowBox, shadowBorderedBox, setText, halftone } = helpers;
    const M = 13, right = PAGE.W - M, contentW = right - M;

    // ----- HEADER con halftone -----
    const headerH = 26;
    shadowBox(0, 0, PAGE.W, headerH, T.primary, 0);
    // Puntos halftone arriba a la derecha en accent
    doc.saveGraphicsState();
    doc.rect(0, 0, PAGE.W, headerH, null);
    doc.clip();
    doc.discardPath();
    halftone(PAGE.W - 50, 0, 50, headerH, lighten(T.accent, 0.1), 2.8, 0.6);
    doc.restoreGraphicsState();

    setText(T.onPrimary, 'bold', 20);
    doc.text(
      sanitize(cfg.topic || 'Ejercicio de Ingles').toUpperCase(),
      M, 15
    );
    setText(T.onPrimary, 'bold', 9);
    doc.text('COEDUCA  |  Prof. Jose Eliseo Martinez  |  ' + today, M, 22);

    // banda negra inferior con sello
    fillBox(0, headerH, PAGE.W, 4, T.text, 0);
    let y = headerH + 12;

    // ----- HERO: nota gigante con burst pop-art -----
    const heroH = 38;
    shadowBorderedBox(M, y, contentW, heroH, T.cardBg, T.text, 1.2);
    // Burst de puntos al fondo izquierda
    halftone(M + 2, y + 2, contentW * 0.45, heroH - 4, lighten(T.primary, 0.4), 2.4, 0.5);

    setText(T.text, 'bold', 9);
    doc.text('NOTA FINAL', M + contentW / 2, y + 9, { align: 'center' });
    setText(T.accent, 'bold', 42);
    doc.text(String(score.grade), M + contentW / 2, y + 30, { align: 'center' });

    const gradeStrW = doc.getStringUnitWidth(String(score.grade)) * 42 / doc.internal.scaleFactor;
    setText(T.text, 'normal', 11);
    doc.text('/ 10', M + contentW / 2 + gradeStrW / 2 + 3, y + 30, { align: 'left' });
    y += heroH + 6;

    // Pills
    y = renderPills(ctx, y, { M: M, contentW: contentW });
    y += 4;
    // Equipo
    y = renderTeamLinear(ctx, y, { M: M, contentW: contentW });

    // Detalle por ejercicio
    if (y + 34 > PAGE.H - 20) { doc.addPage(); y = 18; }
    fillBox(M, y, contentW, 8, T.primary);
    setText(T.onPrimary, 'bold', 9);
    doc.text('DETALLE POR EJERCICIO', M + 5, y + 5.5);
    y += 18;

    let exNum = 0;
    (cfg.exercises || []).forEach(function (ex, idx) {
      if (ex.type === 'note') return;
      exNum++;
      y = renderExerciseRow(ctx, ex, idx, exNum, y, {
        M: M, contentW: contentW, right: right
      });
    });

    y = renderGameFinal(ctx, y, { M: M, contentW: contentW });
    renderFooter(ctx, { M: M, right: right });
  }

  // ----- DISEÑO 2: POP ART VIBRANTE (bloques saturados y tinta) -----
  function renderPopArtVibrant(ctx) {
    const M = 13, right = PAGE.W - M, contentW = right - M;
    const layout = { M: M, right: right, contentW: contentW, exam: false };
    let y = renderVibrantHeader(ctx, layout);
    y = renderVibrantSummary(ctx, y, layout);
    y = renderStudentTable(ctx, y, layout);
    y = renderVibrantDetailsHeader(ctx, y, layout);
    let exNum = 0;
    (ctx.cfg.exercises || []).forEach(function (ex, idx) {
      if (ex.type === 'note') return;
      exNum++;
      y = renderExerciseRow(ctx, ex, idx, exNum, y, layout);
    });
    y = renderGameFinal(ctx, y, layout);
    renderFooter(ctx, layout);
  }

  // ----- DISEÑO 3: COLORIDO (superficies del tema sin contornos) -----
  function renderColorido(ctx) {
    const M = 14, right = PAGE.W - M, contentW = right - M;
    const layout = { M: M, right: right, contentW: contentW, exam: false };
    let y = renderColoridoHeader(ctx, layout);
    y = renderColoridoSummary(ctx, y, layout);
    y = renderStudentTable(ctx, y, layout);
    y = renderColoridoDetailsHeader(ctx, y, layout);
    let exNum = 0;
    (ctx.cfg.exercises || []).forEach(function (ex, idx) {
      if (ex.type === 'note') return;
      exNum++;
      y = renderExerciseRow(ctx, ex, idx, exNum, y, layout);
    });
    y = renderGameFinal(ctx, y, layout);
    renderFooter(ctx, layout);
  }

  // ----- DISEÑO 4: PASTEL (minimal, esquinas redondeadas) -----
  function renderPastel(ctx) {
    const M = 14, right = PAGE.W - M, contentW = right - M;
    const layout = { M: M, right: right, contentW: contentW, exam: false };
    let y = renderPastelHeader(ctx, layout);
    y = renderStudentTable(ctx, y, layout);
    y = renderPastelSummary(ctx, y, layout);
    y = renderPastelDetailsHeader(ctx, y, layout);
    let exNum = 0;
    (ctx.cfg.exercises || []).forEach(function (ex, idx) {
      if (ex.type === 'note') return;
      exNum++;
      y = renderExerciseRow(ctx, ex, idx, exNum, y, layout);
    });
    y = renderGameFinal(ctx, y, layout);
    renderFooter(ctx, layout);
  }

  // ----- DISEÑO 5: HOLLY HOBBIE (telas, flores y costuras) -----
  function renderHollyHobbie(ctx) {
    const M = 14, right = PAGE.W - M, contentW = right - M;
    const layout = { M: M, right: right, contentW: contentW, exam: false };
    let y = renderHollyHeader(ctx, layout);
    y = renderStudentTable(ctx, y, layout);
    y = renderHollySummary(ctx, y, layout);
    y = renderHollyDetailsHeader(ctx, y, layout);
    let exNum = 0;
    (ctx.cfg.exercises || []).forEach(function (ex, idx) {
      if (ex.type === 'note') return;
      exNum++;
      y = renderExerciseRow(ctx, ex, idx, exNum, y, layout);
    });
    y = renderGameFinal(ctx, y, layout);
    renderFooter(ctx, layout);
  }

  // ---- Stats pills (linea de 2-3 pills horizontal) ----
  function renderPills(ctx, y, opts) {
    const { T, helpers } = ctx;
    const M = opts.M, contentW = opts.contentW;
    const { shadowBox, setText, fillBox } = helpers;

    const hasExtra = (ctx.state.extraPoints + (ctx.state.balloonBonus || 0)) > 0;
    const pillCount = hasExtra ? 3 : 2;
    const pillGap = 4;
    const pillW = (contentW - pillGap * (pillCount - 1)) / pillCount;
    const pillH = 11;

    const pills = [
      { label: 'ACIERTOS', value: ctx.score.earned + ' de ' + ctx.score.total }
    ];
    if (hasExtra) {
      pills.push({ label: 'NOTA BASE', value: ctx.score.baseGrade + ' / 10' });
      pills.push({ label: 'PUNTOS EXTRA', value: '+' + (ctx.state.extraPoints + (ctx.state.balloonBonus || 0)).toFixed(1), highlight: true });
    } else {
      pills.push({ label: 'NOTA BASE', value: ctx.score.baseGrade + ' / 10' });
    }

    pills.forEach(function (pill, i) {
      const px = M + i * (pillW + pillGap);
      const fillColor = pill.highlight ? T.accent : T.primary;
      const textColor = pill.highlight ? T.onAccent : T.onPrimary;
      if (T.useStrokes) shadowBox(px, y, pillW, pillH, fillColor, T.radius);
      else if (T.radius > 0) {
        ctx.doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        ctx.doc.roundedRect(px, y, pillW, pillH, T.radius, T.radius, 'F');
      }
      else fillBox(px, y, pillW, pillH, fillColor);
      setText(textColor, 'bold', 7);
      ctx.doc.text(pill.label, px + pillW / 2, y + 4, { align: 'center' });
      setText(textColor, 'bold', 9);
      ctx.doc.text(pill.value, px + pillW / 2, y + 9, { align: 'center' });
    });
    return y + pillH + 6;
  }

  // Pills dashed para HollyHobbie
  function renderPillsDashed(ctx, y, opts) {
    const { T, helpers } = ctx;
    const M = opts.M, contentW = opts.contentW;
    const { dashedRect, setText } = helpers;

    const hasExtra = (ctx.state.extraPoints + (ctx.state.balloonBonus || 0)) > 0;
    const pillCount = hasExtra ? 3 : 2;
    const pillGap = 4;
    const pillW = (contentW - pillGap * (pillCount - 1)) / pillCount;
    const pillH = 13;

    const pills = [
      { label: 'aciertos', value: ctx.score.earned + ' / ' + ctx.score.total }
    ];
    if (hasExtra) {
      pills.push({ label: 'nota base', value: ctx.score.baseGrade + ' / 10' });
      pills.push({ label: 'extra', value: '+' + (ctx.state.extraPoints + (ctx.state.balloonBonus || 0)).toFixed(1) });
    } else {
      pills.push({ label: 'nota base', value: ctx.score.baseGrade + ' / 10' });
    }
    pills.forEach(function (pill, i) {
      const px = M + i * (pillW + pillGap);
      dashedRect(px, y, pillW, pillH, T.primary, 0.5, 1.0);
      setText(T.text, 'italic', 7);
      ctx.doc.text(pill.label, px + pillW / 2, y + 5, { align: 'center' });
      setText(T.accent, 'bold', 10);
      ctx.doc.text(pill.value, px + pillW / 2, y + 11, { align: 'center' });
    });
    return y + pillH + 4;
  }

  function renderGameFinal(ctx, y, opts) {
    if (!ctx.cfg.game) return y;
    if (ctx.T.useDashed) return renderHollyGame(ctx, y, opts);
    if (ctx.T.useSoft) return renderPastelGame(ctx, y, opts);
    if (ctx.T.useCards) return renderColoridoGame(ctx, y, opts);
    if (ctx.T.useStripes) return renderVibrantGame(ctx, y, opts);
    const { T, helpers, sanitize, doc } = ctx;
    const M = opts.M, contentW = opts.contentW;
    if (y > PAGE.H - 25) { doc.addPage(); y = 18; }
    y += 4;
    if (T.useDashed) {
      helpers.dashedRect(M, y, contentW, 10, T.accent, 0.5, 1.0);
    } else {
      helpers.borderedBox(M, y, contentW, 10, T.cardBg, T.accent, 0.8, T.radius);
      if (T.useHalftone) helpers.fillBox(M + 2.5, y + 2.5, 3, 5, T.accent, 1.5);
      else helpers.fillBox(M, y, 3, 10, T.accent);
    }
    helpers.setText(T.text, 'bold', 9);
    doc.text('JUEGO FINAL:', M + 8, y + 6.5);
    helpers.setText(T.mutedText, 'normal', 9);
    doc.text(sanitize(ctx.cfg.game.type).toUpperCase(), M + 42, y + 6.5);
    return y + 14;
  }

  function renderFooter(ctx, opts) {
    const { doc, T, helpers } = ctx;
    const totalPages = doc.internal.getNumberOfPages();
    const footerY = PAGE.H - 8;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      if (T.useSoft) {
        helpers.hline(opts.M, opts.right, footerY - 4, T.pastelLine, 0.2);
      } else if (T.useCards) {
        helpers.fillBox(opts.M, footerY - 5, 17, 1.2, T.primary, 0.6);
        helpers.fillBox(opts.M + 19, footerY - 5, 7, 1.2, T.accent, 0.6);
        helpers.fillBox(opts.M + 28, footerY - 5, 3, 1.2, T.coloridoConfetti[0], 0.6);
      } else if (T.useStripes) {
        const width = (opts.right - opts.M) / 3;
        [T.primary, T.vibrantPink, T.vibrantYellow].forEach(function (color, index) {
          helpers.fillBox(opts.M + index * width, footerY - 4, width, 0.9, color, 0);
        });
      }
      else if (T.useDashed) {
        helpers.dashedLine(opts.M, footerY - 4, opts.right - 10, footerY - 4, T.hollyThread, 0.25, 1.1);
        hollyFlower(ctx, opts.right - 3, footerY - 4, 2.5, T.accent);
      }
      else helpers.hline(opts.M, opts.right, footerY - 4, T.divider, 0.3);
      helpers.setText(T.useCards ? T.onBg : T.mutedText, 'italic', 7);
      doc.text('COEDUCA · Prof. Jose Eliseo Martinez', opts.M, footerY);
      helpers.setText(T.useCards ? T.onBg : T.mutedText, 'normal', 7);
      doc.text('Pag. ' + p + ' de ' + totalPages, PAGE.W / 2, footerY, { align: 'center' });
    }
  }

  const DESIGN_RENDERERS = {
    'PopArt':         renderPopArt,
    'PopArtVibrant':  renderPopArtVibrant,
    'Colorido':       renderColorido,
    'Pastel':         renderPastel,
    'HollyHobbie':    renderHollyHobbie,
  };

  // =====================================================================
  // 11. UTILS
  // =====================================================================
  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
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
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // =====================================================================
  // 12. DRAG & DROP HELPER (touch + auto-scroll 70px)
  // =====================================================================
  function makeDraggable(el, opts) {
    opts = opts || {};
    const onPickup = opts.onPickup || (() => {});
    const onMove = opts.onMove || (() => {});
    const onDrop = opts.onDrop || (() => {});
    const SCROLL_ZONE = 70;
    const SCROLL_SPEED = 12;
    let dragging = false;
    let scrollInterval = null;
    let lastClientY = 0;
    let ghost = null;
    let startX = 0, startY = 0;

    function startScroll() {
      if (scrollInterval) return;
      scrollInterval = setInterval(() => {
        if (!dragging) return;
        const y = lastClientY;
        if (y < SCROLL_ZONE) {
          window.scrollBy(0, -SCROLL_SPEED);
        } else if (y > window.innerHeight - SCROLL_ZONE) {
          window.scrollBy(0, SCROLL_SPEED);
        }
      }, 16);
    }
    function stopScroll() {
      if (scrollInterval) clearInterval(scrollInterval);
      scrollInterval = null;
    }

    function pickup(e) {
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
      dragging = true;
      lastClientY = point.clientY;

      // Crear ghost
      const rect = el.getBoundingClientRect();
      ghost = el.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.zIndex = '9999';
      ghost.style.transform = 'rotate(3deg) scale(1.05)';
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
        const dx = point.clientX - startX;
        const dy = point.clientY - startY;
        ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(3deg) scale(1.05)`;
      }
      // Detectar elemento debajo
      ghost && (ghost.style.display = 'none');
      const under = document.elementFromPoint(point.clientX, point.clientY);
      ghost && (ghost.style.display = '');
      onMove({ el, ghost, clientX: point.clientX, clientY: point.clientY, under });
      e.preventDefault();
    }

    function drop(e) {
      if (!dragging) return;
      dragging = false;
      stopScroll();
      const point = e.changedTouches ? e.changedTouches[0] : e;
      ghost && (ghost.style.display = 'none');
      const under = document.elementFromPoint(point.clientX, point.clientY);
      ghost && ghost.remove();
      ghost = null;
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
  // 13. PUBLIC API
  // =====================================================================
  const COEDUCA = {
    version: VERSION,
    sanitizeForPDF,
    shuffle,
    normalize,
    escapeHTML,
    makeDraggable,
    addExtraPoints,
    addBalloonBonus,
    setGameResult,
    recordAnswer,
    generatePDF, // expuesto para previsualización desde la app

    registerExercise(type, renderer) {
      state.exerciseRegistry[type] = renderer;
    },
    registerGame(type, renderer) {
      state.gameRegistry[type] = renderer;
    },
    getGameRenderer(type) {
      return state.gameRegistry[type] || null;
    },

    init(config) {
      state.config = config;
      state.storageKey = STORAGE_KEY_PREFIX + activityStorageId(config) + '_';

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
      applyInterfaceTheme(config.uiTheme);
      pickPoolVersion();

      // Restaurar progreso
      const prev = loadState();
      if (prev) {
        state.answers = prev.answers || {};
        state.extraPoints = prev.extraPoints || 0;
        state.balloonBonus = prev.balloonBonus || 0;
        state.gameResult = prev.gameResult || null;
      }

      // Esperar DOM
      const start = () => {
        const login = resumeStudentIfReturning().then(resumed => resumed ? undefined : showLoginModal());
        login.then(() => {
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

    // Borra la respuesta guardada de un ejercicio (por exerciseId tipo 'ex_3')
    // y lo vuelve a montar limpio. También se llama internamente desde el
    // botón "Volver a intentar".
    retryExercise(exerciseIdOrIdx) {
      let idx;
      if (typeof exerciseIdOrIdx === 'number') {
        idx = exerciseIdOrIdx;
      } else {
        const m = String(exerciseIdOrIdx).match(/^ex_(\d+)$/);
        if (!m) return;
        idx = parseInt(m[1], 10);
      }
      retryExercise(idx);
    }
  };

  global.COEDUCA = COEDUCA;
})(typeof window !== 'undefined' ? window : this);
