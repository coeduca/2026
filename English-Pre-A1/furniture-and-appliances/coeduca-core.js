/**
 * COEDUCA Framework v1 - Core
 * Profesor José Eliseo Martínez - COEDUCA
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
    ['contextmenu', 'copy', 'cut', 'paste', 'selectstart', 'dragstart']
      .forEach(evt => document.addEventListener(evt, block, { passive: false }));

    // Permitir copy/paste solo en inputs específicos del login
    document.addEventListener('copy', e => {
      const t = e.target;
      if (t && t.classList && t.classList.contains('coeduca-input-allow-copy')) return;
      e.preventDefault();
    }, true);
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
      badge.textContent = '+' + (state.extraPoints + state.balloonBonus).toFixed(1) + ' pts extra';
      badge.style.display = (state.extraPoints + state.balloonBonus) > 0 ? 'block' : 'none';
    }
    const finalDisplay = document.getElementById('coeduca-final-score-display');
    if (finalDisplay) {
      const s = getTotalScore();
      const cfg = state.config;
      const realExercises = (cfg && cfg.exercises ? cfg.exercises : []).filter(e => e.type !== 'note');
      const answeredCount = Object.keys(state.answers).length;
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
    if (!student) return false;
    if (student.nie === TEST_NIE) return true; // José Eliseo siempre pasa
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

  // =====================================================================
  // 7. LOGIN MODAL
  // =====================================================================
  function showLoginModal() {
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

      function lookupNIE(nie) {
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

      function validateMain() {
        const found = lookupNIE(nieInput.value);
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

        const validate = () => {
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
          const found = lookupNIE(v);
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

      const finish = () => {
        if (!mainStudent) return;
        
        const prev = loadState();
        if (prev && prev.student && prev.student.nie !== mainStudent.nie) {
          // Si hay un cambio de estudiante principal, limpiamos el progreso
          state.answers = {};
          state.extraPoints = 0; state.balloonBonus = 0;
          state.gameResult = null;
        }

        state.student = mainStudent;
        // Solo guardamos compañeros válidos
        state.partners = partners.filter(p => p.student).map(p => p.student);
        // Compatibilidad: state.partner = el primero (si hay)
        state.partner = state.partners[0] || null;
        saveState();
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
      if (prev && prev.student) {
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
    if (colors.text) root.style.setProperty('--coeduca-text', colors.text);
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
      <div class="coeduca-extra-badge" id="coeduca-extra-badge" style="display:none">+0 pts extra</div>
      <header class="coeduca-header">
        <h1>${escapeHTML(cfg.topic || 'Ejercicio de Inglés')}</h1>
        <p>${escapeHTML(cfg.level || '')} - COEDUCA - Prof. José Eliseo Martínez</p>
        <div class="coeduca-header-students" id="coeduca-header-students"></div>
        <button class="coeduca-btn coeduca-btn-info coeduca-add-member-btn" id="coeduca-add-member-btn" type="button">
          + Agregar miembro
        </button>
      </header>
      <div id="coeduca-exercises"></div>
      <div id="coeduca-game-section"></div>
      <div class="coeduca-final-score" id="coeduca-final-score-display">
        <h2>Tu puntaje</h2>
        <span class="score-number">- / 10</span>
        <p>Completa los ejercicios</p>
      </div>
      <div class="coeduca-center">
        <button class="coeduca-btn coeduca-btn-accent" id="coeduca-pdf-btn">
          Descargar PDF para Classroom
        </button>
      </div>
    `;
    state.appRoot = appRoot;

    // Mostrar nombres en el header
    renderHeaderStudents();

    // Botón de agregar miembro durante el ejercicio
    document.getElementById('coeduca-add-member-btn').addEventListener('click', showAddMemberModal);

    // Botón de PDF
    document.getElementById('coeduca-pdf-btn').addEventListener('click', generatePDF);

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
      if (previousAnswer && previousAnswer.total > 0) {
        renderCompletedSummary(idx, ex, previousAnswer);
      } else {
        mountExercise(idx, ex);
      }
    });

    // Renderizar juego
    if (cfg.game) {
      renderGame(cfg.game);
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
      renderer({
        container: body,
        exerciseId: 'ex_' + idx,
        data: getPoolData(ex),
        config: ex,
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
      const found = lookup(v);
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
      <div class="coeduca-audio">
        <button class="coeduca-audio-btn" data-audio-idx="${idx}" type="button" aria-label="Play audio">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <span class="coeduca-audio-label">Listen</span>
        <audio id="coeduca-audio-${idx}" src="${escapeAttr(src)}" preload="metadata"></audio>
      </div>
    `;
  }

  function renderGame(gameCfg) {
    if (global.rigo && global.rigo.inviteGame) global.rigo.inviteGame();
    const section = document.getElementById('coeduca-game-section');
    section.innerHTML = `
      <div class="coeduca-exercise">
        <div class="coeduca-exercise-title">Juego final</div>
        <div id="coeduca-game-body"></div>
      </div>
    `;
    const renderer = state.gameRegistry[gameCfg.type];
    if (renderer) {
      try {
        renderer({
          container: document.getElementById('coeduca-game-body'),
          config: gameCfg,
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
  function setupAudioButtons() {
    document.body.addEventListener('click', e => {
      const btn = e.target.closest('.coeduca-audio-btn');
      if (!btn) return;
      const idx = btn.dataset.audioIdx;
      const audio = document.getElementById('coeduca-audio-' + idx);
      if (!audio) return;
      if (audio.paused) {
        // Pausar otros
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
  // 10. PDF GENERATION (Multi-Diseño con fix iOS)
  //
  // Cada diseño tiene su propia identidad visual: PopArt usa puntos
  // halftone + bordes gruesos estilo comic; HollyHobbie usa lineas
  // discontinuas y tipografia serif; Colorido pone a los integrantes en
  // cards separadas, Pastel es minimal limpio, PopArtVibrant usa bandas
  // diagonales rayadas. Todos respetan los colores definidos por el
  // usuario en "Generalidades - Color del tema".
  // =====================================================================
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
      const url = URL.createObjectURL(blob);
      if (opts.preview) {
        try { global.open(url, '_blank'); } catch (_) {}
        setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
        return { blob: blob, url: url, filename: filename };
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
      return { blob: blob, url: url, filename: filename };
    } catch (e) {
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
  function buildThemeFromUserColors(design, colors) {
    const designDefaults = {
      'PopArt': {
        useStrokes: true,
        useHalftone: true,
        font: 'helvetica',
        radius: 0,
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

    return Object.assign({}, opts, {
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
  }

  // -------- Helpers de dibujo --------
  function makePdfHelpers(doc, T) {
    function fillBox(x, y, w, h, color, radius) {
      doc.setFillColor(color[0], color[1], color[2]);
      if (radius && radius > 0) doc.roundedRect(x, y, w, h, radius, radius, 'F');
      else doc.rect(x, y, w, h, 'F');
    }
    function borderedBox(x, y, w, h, fill, borderColor, lineW, radius) {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(lineW || 0.5);
      if (radius && radius > 0) doc.roundedRect(x, y, w, h, radius, radius, 'FD');
      else doc.rect(x, y, w, h, 'FD');
    }
    function shadowBox(x, y, w, h, fill, radius) {
      if (T.useStrokes) {
        doc.setFillColor(T.text[0], T.text[1], T.text[2]);
        if (radius && radius > 0) doc.roundedRect(x + 1.5, y + 1.5, w, h, radius, radius, 'F');
        else doc.rect(x + 1.5, y + 1.5, w, h, 'F');
      }
      fillBox(x, y, w, h, fill, radius);
    }
    function shadowBorderedBox(x, y, w, h, fill, borderColor, lineW, radius) {
      if (T.useStrokes) {
        doc.setFillColor(T.text[0], T.text[1], T.text[2]);
        if (radius && radius > 0) doc.roundedRect(x + 1.5, y + 1.5, w, h, radius, radius, 'F');
        else doc.rect(x + 1.5, y + 1.5, w, h, 'F');
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
    const { doc, T, S, helpers, sanitize, state, cfg } = ctx;
    const { setText, fillBox, hline, dashedLine, borderedBox } = helpers;
    const M = opts.M, contentW = opts.contentW, right = opts.right;

    const ans = state.answers['ex_' + idx];
    const title = sanitize(ex.title || ('Ejercicio ' + exNum));

    let isNewPage = false;
    if (y > PAGE.H - 35) { doc.addPage(); y = 18; isNewPage = true; }

    if (exNum > 1 && !isNewPage) {
      if (T.useDashed) dashedLine(M, y - 5, right, y - 5, T.divider, 0.3, 0.9);
      else hline(M, right, y - 5, T.divider, 0.25);
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
      doc.setFillColor(T.text[0], T.text[1], T.text[2]);
      doc.rect(bx + 1, by + 1, bw, bh, 'F');
    }
    if (T.radius && T.radius > 0) {
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(bx, by, bw, bh, T.radius, T.radius, 'F');
    } else {
      fillBox(bx, by, bw, bh, badgeColor);
    }
    setText(badgeTC, 'bold', 8);
    doc.text(badgeText, bx + bw / 2, by + 4.2, { align: 'center' });

    y += 5;

    if (ans && ans.details && Array.isArray(ans.details) && ans.details.length) {
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
    return y + 8;
  }

  function renderTeamLinear(ctx, y, opts) {
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
    shadowBox(0, 0, PAGE.W, headerH, T.primary);
    // Puntos halftone arriba a la derecha en accent
    halftone(PAGE.W - 50, 0, 50, headerH, lighten(T.accent, 0.1), 2.8, 0.6);

    setText(T.onPrimary, 'bold', 20);
    doc.text(
      sanitize(cfg.topic || 'Ejercicio de Ingles').toUpperCase(),
      M, 15
    );
    setText(T.onPrimary, 'bold', 9);
    doc.text('COEDUCA  |  Prof. Jose Eliseo Martinez  |  ' + today, M, 22);

    // banda negra inferior con sello
    fillBox(0, headerH, PAGE.W, 4, T.text);
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
    fillBox(M, y, contentW, 8, T.primary);
    setText(T.onPrimary, 'bold', 9);
    doc.text('DETALLE POR EJERCICIO', M + 5, y + 5.5);
    y += 12;

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

  // ----- DISEÑO 2: POP ART VIBRANTE (rayas diagonales sobre header) -----
  function renderPopArtVibrant(ctx) {
    const { doc, T, helpers, sanitize, cfg, score, today } = ctx;
    const { fillBox, shadowBox, shadowBorderedBox, setText, stripes } = helpers;
    const M = 13, right = PAGE.W - M, contentW = right - M;

    // Header bicolor con rayas
    const headerH = 30;
    fillBox(0, 0, PAGE.W, headerH, T.primary);
    fillBox(PAGE.W * 0.6, 0, PAGE.W * 0.4, headerH, T.accent);
    stripes(0, 0, PAGE.W, headerH, darken(T.primary, 0.3), 3.0, 0.5);
    // banda negra inferior
    fillBox(0, headerH, PAGE.W, 5, T.text);

    setText(T.onPrimary, 'bold', 22);
    doc.text(
      sanitize(cfg.topic || 'Ejercicio de Ingles').toUpperCase(),
      M, 16
    );
    setText(T.onPrimary, 'bold', 9);
    doc.text('COEDUCA  |  ' + today, M, 24);

    let y = headerH + 15;

    // Hero
    shadowBorderedBox(M, y, contentW, 36, T.cardBg, T.text, 1);
    stripes(M + 2, y + 2, contentW - 4, 32, lighten(T.accent, 0.65), 4, 0.3);
    setText(T.text, 'bold', 9);
    doc.text('NOTA FINAL', M + contentW / 2, y + 9, { align: 'center' });
    setText(T.accent, 'bold', 40);
    doc.text(String(score.grade), M + contentW / 2, y + 27, { align: 'center' });
    const gradeStrW = doc.getStringUnitWidth(String(score.grade)) * 40 / doc.internal.scaleFactor;
    setText(T.text, 'normal', 10);
    doc.text('/ 10', M + contentW / 2 + gradeStrW / 2 + 3, y + 27, { align: 'left' });
    y += 42;

    y = renderPills(ctx, y, { M: M, contentW: contentW });
    y += 3;
    y = renderTeamLinear(ctx, y, { M: M, contentW: contentW });

    fillBox(M, y, contentW, 8, T.text);
    setText(T.cardBg, 'bold', 9);
    doc.text('DETALLE POR EJERCICIO', M + 5, y + 5.5);
    y += 12;

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

  // ----- DISEÑO 3: COLORIDO (cards modulares con avatares) -----
  function renderColorido(ctx) {
    const { doc, T, helpers, sanitize, cfg, score, today } = ctx;
    const { fillBox, borderedBox, setText } = helpers;
    const M = 14, right = PAGE.W - M, contentW = right - M;

    // Header tipo banner con 3 bloques
    const headerH = 24;
    fillBox(0, 0, PAGE.W * 0.35, headerH, T.primary);
    fillBox(PAGE.W * 0.35, 0, PAGE.W * 0.35, headerH, T.accent);
    fillBox(PAGE.W * 0.70, 0, PAGE.W * 0.30, headerH, T.text);

    setText(T.onPrimary, 'bold', 9);
    doc.text('COEDUCA', M, 9);
    setText(T.onPrimary, 'bold', 16);
    doc.text(sanitize(cfg.topic || 'Ejercicio').toUpperCase(), M, 18);
    setText(T.cardBg, 'normal', 9);
    doc.text(today, PAGE.W - M, 16, { align: 'right' });

    let y = headerH + 10;

    // Card de nota (con accent gigante a la izquierda)
    if (T.radius > 0) {
      doc.setFillColor(T.cardBg[0], T.cardBg[1], T.cardBg[2]);
      doc.roundedRect(M, y, contentW, 32, T.radius, T.radius, 'F');
      doc.setDrawColor(T.divider[0], T.divider[1], T.divider[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(M, y, contentW, 32, T.radius, T.radius);
    } else {
      borderedBox(M, y, contentW, 32, T.cardBg, T.divider, 0.4);
    }
    // bloque acento a la izquierda
    doc.setFillColor(T.accent[0], T.accent[1], T.accent[2]);
    doc.roundedRect(M, y, 50, 32, T.radius, T.radius, 'F');
    setText(T.onAccent, 'bold', 7);
    doc.text('NOTA', M + 25, y + 8, { align: 'center' });
    setText(T.onAccent, 'bold', 32);
    doc.text(String(score.grade), M + 25, y + 26, { align: 'center' });
    // Stats a la derecha
    setText(T.text, 'bold', 8);
    doc.text('ACIERTOS', M + 58, y + 9);
    setText(T.mutedText, 'normal', 11);
    doc.text(score.earned + ' de ' + score.total, M + 58, y + 16);
    setText(T.text, 'bold', 8);
    doc.text('NOTA BASE', M + 58, y + 22);
    setText(T.mutedText, 'normal', 11);
    doc.text(score.baseGrade + ' / 10', M + 58, y + 29);
    if ((state.extraPoints + state.balloonBonus) > 0) {
      setText(T.text, 'bold', 8);
      doc.text('EXTRA', M + contentW - 28, y + 9);
      setText(T.accent, 'bold', 11);
      doc.text('+' + (state.extraPoints + state.balloonBonus).toFixed(1), M + contentW - 28, y + 16);
    }
    y += 38;

    // EQUIPO en cards (la firma distintiva de este diseño)
    y = renderTeamCards(ctx, y, { M: M, contentW: contentW });

    // Detalle
    setText(T.text, 'bold', 11);
    doc.text('EJERCICIOS', M, y);
    setText(T.primary, 'bold', 11);
    doc.text('—', M + 28, y);
    y += 4;

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

  // ----- DISEÑO 4: PASTEL (minimal, esquinas redondeadas) -----
  function renderPastel(ctx) {
    const { doc, T, helpers, sanitize, cfg, score, today } = ctx;
    const { fillBox, setText } = helpers;
    const M = 14, right = PAGE.W - M, contentW = right - M;

    // Banda decorativa superior fina
    fillBox(0, 0, PAGE.W, 3, T.primary);

    setText(T.mutedText, 'bold', 7);
    doc.text('COEDUCA  ·  ENGLISH', M, 11);
    setText(T.text, 'bold', 22);
    doc.text(sanitize(cfg.topic || 'Ejercicio'), M, 21);
    setText(T.mutedText, 'normal', 9);
    doc.text(today + '  ·  Prof. Jose Eliseo Martinez', M, 26);

    // Linea divisoria suave
    doc.setDrawColor(T.divider[0], T.divider[1], T.divider[2]);
    doc.setLineWidth(0.3);
    doc.line(M, 30, right, 30);

    let y = 38;

    // Hero discreto
    doc.setFillColor(T.cardBg[0], T.cardBg[1], T.cardBg[2]);
    doc.roundedRect(M, y, contentW, 30, 4, 4, 'F');
    doc.setDrawColor(T.divider[0], T.divider[1], T.divider[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, contentW, 30, 4, 4);

    setText(T.mutedText, 'bold', 7);
    doc.text('NOTA FINAL', M + 6, y + 8);
    setText(T.text, 'bold', 30);
    doc.text(String(score.grade), M + 6, y + 24);
    setText(T.mutedText, 'normal', 9);
    doc.text('/ 10', M + 6 + 22, y + 24);

    // pill accent a la derecha del hero
    doc.setFillColor(T.accent[0], T.accent[1], T.accent[2]);
    const pillX = right - 50, pillY = y + 9, pillW = 44, pillH = 12;
    doc.roundedRect(pillX, pillY, pillW, pillH, 6, 6, 'F');
    setText(T.onAccent, 'bold', 9);
    doc.text(score.earned + ' / ' + score.total + ' aciertos',
      pillX + pillW / 2, pillY + 7.5, { align: 'center' });

    y += 36;

    // Equipo: estilo lista limpia
    y = renderTeamLinear(ctx, y, { M: M, contentW: contentW });

    // Detalle: solo título con guion
    setText(T.text, 'bold', 12);
    doc.text('Detalle de ejercicios', M, y);
    y += 5;

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

  // ----- DISEÑO 5: HOLLY HOBBIE (lineas discontinuas + cuadricula) -----
  function renderHollyHobbie(ctx) {
    const { doc, T, helpers, sanitize, cfg, score, today } = ctx;
    const { fillBox, setText, dashedRect, dashedLine, notebookGrid } = helpers;
    const M = 14, right = PAGE.W - M, contentW = right - M;

    // Marco decorativo dashed alrededor del header
    notebookGrid(0, 0, PAGE.W, 30, lighten(T.primary, 0.7), 6);
    dashedLine(M - 2, 28, right + 2, 28, T.primary, 0.5, 1.2);

    setText(T.text, 'italic', 9);
    doc.text('COEDUCA - Cuaderno de Inglés', M, 9);
    setText(T.text, 'bold', 21);
    doc.text(sanitize(cfg.topic || 'Ejercicio'), M, 20);
    setText(T.mutedText, 'italic', 9);
    doc.text(today, right, 20, { align: 'right' });

    let y = 36;

    // Hero con borde dashed
    dashedRect(M, y, contentW, 32, T.primary, 0.6, 1.4);
    setText(T.text, 'bold', 8);
    doc.text('· Nota final ·', M + contentW / 2, y + 9, { align: 'center' });
    setText(T.accent, 'bold', 36);
    doc.text(String(score.grade), M + contentW / 2, y + 26, { align: 'center' });
    const gradeStrW = doc.getStringUnitWidth(String(score.grade)) * 36 / doc.internal.scaleFactor;
    setText(T.text, 'italic', 10);
    doc.text('/ 10', M + contentW / 2 + gradeStrW / 2 + 3, y + 26, { align: 'left' });
    y += 38;

    // Pills con borde dashed
    y = renderPillsDashed(ctx, y, { M: M, contentW: contentW });
    y += 3;

    // Equipo: una tarjeta con marco dashed
    const teamRows = 2 + ctx.partners.length;
    const teamH = 10 + teamRows * 7 + 4;
    dashedRect(M, y, contentW, teamH, T.primary, 0.5, 1.2);
    setText(T.text, 'bold', 8);
    doc.text('· EQUIPO ·', M + contentW / 2, y + 6, { align: 'center' });
    let yy = y + 13;
    const col1 = M + 8, col2 = M + 38;
    setText(T.text, 'italic', 9.5);
    doc.text('Estudiante:', col1, yy);
    setText(T.mutedText, 'normal', 9);
    doc.text(sanitize(ctx.stu.name) + '  (NIE: ' + sanitize(ctx.stu.nie) + ')', col2, yy);
    yy += 7;
    setText(T.text, 'italic', 9.5);
    doc.text('Grado:', col1, yy);
    setText(T.mutedText, 'normal', 9);
    doc.text(sanitize(ctx.stu.grade), col2, yy);
    yy += 7;
    if (ctx.partners.length === 0) {
      setText(T.mutedText, 'italic', 9);
      doc.text('— Trabajo individual —', col1, yy);
    } else {
      ctx.partners.forEach(function (p, i) {
        setText(T.text, 'italic', 9.5);
        doc.text('Compañero ' + (i + 1) + ':', col1, yy);
        setText(T.mutedText, 'normal', 9);
        doc.text(sanitize(p.name) + '  (NIE: ' + sanitize(p.nie) + ')', col2, yy);
        yy += 7;
      });
    }
    y += teamH + 10;

    // Detalle
    setText(T.text, 'bold', 11);
    doc.text('· Detalle por ejercicio ·', M + contentW / 2, y, { align: 'center' });
    y += 4;
    dashedLine(M, y, right, y, T.primary, 0.4, 1.0);
    y += 4;

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
    const { T, helpers, sanitize, doc } = ctx;
    const M = opts.M, contentW = opts.contentW;
    if (y > PAGE.H - 25) { doc.addPage(); y = 18; }
    y += 4;
    if (T.useDashed) {
      helpers.dashedRect(M, y, contentW, 10, T.accent, 0.5, 1.0);
    } else {
      helpers.borderedBox(M, y, contentW, 10, T.cardBg, T.accent, 0.8, T.radius);
      helpers.fillBox(M, y, 3, 10, T.accent);
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
      if (T.useDashed) helpers.dashedLine(opts.M, footerY - 4, opts.right, footerY - 4, T.divider, 0.3, 0.8);
      else helpers.hline(opts.M, opts.right, footerY - 4, T.divider, 0.3);
      helpers.setText(T.mutedText, 'italic', 7);
      doc.text('COEDUCA · Prof. Jose Eliseo Martinez', opts.M, footerY);
      helpers.setText(T.mutedText, 'normal', 7);
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

    init(config) {
      state.config = config;
      state.storageKey = STORAGE_KEY_PREFIX +
        (config.id || (config.topic || 'page').replace(/\W+/g, '_').toLowerCase()) + '_';

      ensureNoTranslate();
      setupBfCacheGuard();
      setupAntiCopy();
      applyTheme(config.colors);
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
        showLoginModal().then(() => {
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