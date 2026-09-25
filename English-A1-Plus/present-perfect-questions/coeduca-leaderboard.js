/**
 * Ranking compartido de minijuegos COEDUCA.
 * La clave publishable es publica por diseno; la seguridad real vive en las
 * funciones SQL de Supabase y la tabla no concede acceso directo.
 */
(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://pxoxmcyyhjpjggbseqcr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_uBmOVK8akx2H73wpKDxT-w_vtTTcPr9';
  const SUPPORTED_GAMES = new Set(['snake', 'dino', 'pills', 'hangman', 'sandwich', 'flappy', 'doodle']);

  function ensureStyles() {
    if (document.getElementById('coeduca-leaderboard-styles')) return;
    const style = document.createElement('style');
    style.id = 'coeduca-leaderboard-styles';
    style.textContent = `
      .cg-leaderboard {
        margin-top: 22px; padding: 16px;
        color: var(--coeduca-text, #1a1a1a);
        background: var(--coeduca-surface, #fff);
        border: 3px solid var(--coeduca-stroke, #1a1a1a);
        border-radius: 14px;
        box-shadow: 4px 4px 0 var(--coeduca-stroke, #1a1a1a);
      }
      .game-center-link + .cg-leaderboard { margin-top: 10px; }
      .cg-leaderboard-title { margin: 0 0 4px; font-size: 18px; font-weight: 900; text-align: center; }
      .cg-leaderboard-note { margin: 0 0 6px; font-size: 12px; text-align: center; opacity: .72; }
      .cg-leaderboard-status { margin: 2px 0 6px; font-size: 12px; text-align: center; opacity: .72; }
      .cg-leaderboard-status:empty { display: none; }
      .cg-leaderboard-grades { display: flex; justify-content: center; flex-wrap: wrap; gap: 7px; padding: 2px 2px 8px; }
      .cg-leaderboard-chip {
        flex: none; padding: 6px 11px; color: var(--coeduca-text, #1a1a1a);
        background: var(--coeduca-surface, #fff);
        border: 2px solid var(--coeduca-stroke, #1a1a1a); border-radius: 999px;
        font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      }
      .cg-leaderboard-chip[aria-pressed="true"] { background: var(--coeduca-primary, #ffd700); }
      .cg-leaderboard-chip:focus-visible { outline: 3px solid var(--coeduca-primary, #ffd700); outline-offset: 2px; }
      .cg-leaderboard-grids { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .cg-leaderboard-board {
        min-width: 0; padding: 10px;
        background: color-mix(in srgb, var(--coeduca-primary, #ffd700) 12%, white);
        border: 2px solid var(--coeduca-stroke, #1a1a1a); border-radius: 10px;
      }
      .cg-leaderboard-board h4 { margin: 0 0 8px; text-align: center; font-size: 14px; }
      .cg-leaderboard-list { list-style: none; margin: 0; padding: 0; }
      .cg-leaderboard-row {
        display: grid; grid-template-columns: 32px minmax(0, 1fr) auto;
        align-items: center; gap: 8px; margin-top: 5px; padding: 7px 6px;
        border: 1px solid transparent; border-top-color: rgba(26, 26, 26, .16);
        border-radius: 9px; font-size: 12px;
      }
      .cg-leaderboard-row:first-child { margin-top: 0; }
      .cg-leaderboard-row.is-me {
        outline: 2px solid var(--coeduca-primary, #ffd700);
        outline-offset: -2px; font-weight: 800;
      }
      .cg-leaderboard-row.is-me:not(.is-podium) {
        background: color-mix(in srgb, var(--coeduca-primary, #ffd700) 24%, transparent);
      }
      .cg-leaderboard-row.is-podium {
        position: relative; isolation: isolate; overflow: hidden;
        padding: 9px 7px; border-width: 2px;
      }
      .cg-leaderboard-row.is-podium > * { position: relative; z-index: 1; }
      .cg-leaderboard-row.is-podium::after {
        content: ''; position: absolute; z-index: 0; inset: -80% auto -80% -25%;
        width: 16%; transform: rotate(18deg);
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent);
        animation: cgLeaderboardShine 4.5s ease-in-out infinite;
        pointer-events: none;
      }
      .cg-leaderboard-row.rank-1 {
        color: #4b3100;
        padding-top: 14px; padding-bottom: 8px;
        background: linear-gradient(135deg, #fff8c9 0%, #f8d45e 48%, #d99b18 100%);
        border-color: #b97808;
        box-shadow: 0 4px 10px rgba(185, 120, 8, .28), inset 0 1px 0 rgba(255,255,255,.72);
      }
      .cg-leaderboard-row.rank-1[role="button"] { cursor: pointer; }
      .cg-leaderboard-row.rank-1[role="button"]:hover { filter: brightness(1.04); }
      .cg-leaderboard-row.rank-1[role="button"]:focus-visible {
        outline: 3px solid var(--coeduca-primary, #ffd700); outline-offset: 2px;
      }
      .cg-leaderboard-row.rank-2 {
        color: #30343a;
        background: linear-gradient(135deg, #fbfcfd 0%, #d8dde3 48%, #9ca4ad 100%);
        border-color: #7d8792;
        box-shadow: 0 4px 10px rgba(90, 101, 114, .23), inset 0 1px 0 rgba(255,255,255,.9);
      }
      .cg-leaderboard-row.rank-3 {
        color: #48240d;
        background: linear-gradient(135deg, #ffe0bd 0%, #cf854c 48%, #965127 100%);
        border-color: #7d3f1e;
        box-shadow: 0 4px 10px rgba(125, 63, 30, .25), inset 0 1px 0 rgba(255,255,255,.62);
      }
      .cg-leaderboard-rank {
        display: grid; place-items: center; width: 28px; height: 28px;
        color: #525866; background: rgba(255,255,255,.72);
        border: 2px solid currentColor; border-radius: 50%;
        box-shadow: 0 2px 0 rgba(26,26,26,.14);
        font-size: 14px; line-height: 1; font-weight: 1000; text-align: center;
      }
      .rank-1 .cg-leaderboard-rank {
        position: relative; color: #a86500; background: #fff5b5;
        text-shadow: 0 1px 0 #fff3a0, 0 0 7px rgba(255,199,25,.7);
        animation: cgLeaderboardRankFloat 1.7s ease-in-out infinite;
      }
      .rank-1 .cg-leaderboard-rank::before {
        content: ''; position: absolute; z-index: 2; top: -13px; left: 0;
        width: 26px; height: 18px;
        background:
          radial-gradient(circle at 26% 72%, #e84b55 0 1.5px, transparent 2px),
          radial-gradient(circle at 50% 72%, #36a9e1 0 1.5px, transparent 2px),
          radial-gradient(circle at 74% 72%, #e84b55 0 1.5px, transparent 2px),
          linear-gradient(135deg, #fff4a3 0%, #ffc928 42%, #d98b00 100%);
        clip-path: polygon(5% 30%, 18% 48%, 24% 4%, 39% 48%, 50% 4%, 61% 48%, 76% 4%, 82% 48%, 95% 30%, 88% 100%, 12% 100%);
        filter: drop-shadow(0 2px 1px rgba(89, 49, 0, .38));
        transform-origin: 50% 100%;
        animation: cgLeaderboardCrown 2.2s ease-in-out infinite;
        pointer-events: none;
      }
      .rank-2 .cg-leaderboard-rank {
        color: #6f7883; background: #f8fafc;
        text-shadow: 0 1px 0 #fff, 0 0 7px rgba(158,170,184,.65);
        animation: cgLeaderboardRankFloat 1.7s .18s ease-in-out infinite;
      }
      .rank-3 .cg-leaderboard-rank {
        color: #914a20; background: #ffd8b0;
        text-shadow: 0 1px 0 #ffe6ce, 0 0 7px rgba(184,96,46,.55);
        animation: cgLeaderboardRankFloat 1.7s .36s ease-in-out infinite;
      }
      .cg-leaderboard-student { min-width: 0; }
      .cg-leaderboard-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
      .cg-leaderboard-grade { display: block; opacity: .66; font-size: 10px; }
      .cg-leaderboard-score {
        min-width: 38px; padding: 3px 7px; text-align: center; font-weight: 900;
        background: var(--coeduca-primary, #ffd700); border: 1px solid var(--coeduca-stroke, #1a1a1a); border-radius: 20px;
      }
      .is-podium .cg-leaderboard-score { background: rgba(255,255,255,.72); }
      .cg-leaderboard-empty { padding: 12px 4px; text-align: center; font-size: 12px; opacity: .62; }
      @keyframes cgLeaderboardRankFloat {
        0%, 100% { transform: translateY(0) rotate(-2deg) scale(1); }
        50% { transform: translateY(-3px) rotate(2deg) scale(1.07); }
      }
      @keyframes cgLeaderboardShine {
        0%, 58% { left: -25%; opacity: 0; }
        66% { opacity: .85; }
        88%, 100% { left: 115%; opacity: 0; }
      }
      @keyframes cgLeaderboardCrown {
        0%, 100% { transform: translateY(0) rotate(7deg); }
        50% { transform: translateY(-2px) rotate(3deg) scale(1.06); }
      }
      @media (prefers-reduced-motion: reduce) {
        .cg-leaderboard-row.is-podium::after,
        .cg-leaderboard-row.rank-1 .cg-leaderboard-rank::before,
        .cg-leaderboard-row.is-podium .cg-leaderboard-rank { animation: none; }
      }
      @media (max-width: 620px) { .cg-leaderboard-grids { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  async function hashStudentId(value) {
    const data = new TextEncoder().encode('coeduca-ranking-v1|' + String(value || ''));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function rpc(name, body) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Ranking HTTP ${response.status}`);
    return response.status === 204 ? null : response.json();
  }

  function configuredGrades() {
    const grades = [];
    if (typeof COEDUCA_AVAILABLE_GRADES !== 'undefined' && Array.isArray(COEDUCA_AVAILABLE_GRADES)) {
      grades.push(...COEDUCA_AVAILABLE_GRADES);
    }
    // Los paquetes anteriores no incluyen la lista de aulas; sus alumnos
    // siguen aportando los grados disponibles en ese proyecto.
    if (typeof STUDENTS !== 'undefined' && STUDENTS) {
      grades.push(...Object.values(STUDENTS).map(student => student && student.grade));
    }
    return grades;
  }

  function createList(title, rows, limit, onRefresh) {
    const board = document.createElement('section');
    board.className = 'cg-leaderboard-board';
    const heading = document.createElement('h4');
    heading.textContent = title;
    board.appendChild(heading);

    if (!rows || !rows.length) {
      const empty = document.createElement('div');
      empty.className = 'cg-leaderboard-empty';
      empty.textContent = 'Aun no hay puntuaciones. ¡Se el primero!';
      board.appendChild(empty);
      return board;
    }

    const list = document.createElement('ol');
    list.className = 'cg-leaderboard-list';
    rows.slice(0, limit).forEach((row, index) => {
      const item = document.createElement('li');
      const podiumClass = index < 3 ? ` is-podium rank-${index + 1}` : '';
      item.className = 'cg-leaderboard-row' + podiumClass + (row.is_me ? ' is-me' : '');
      if (index === 0 && typeof onRefresh === 'function') {
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.title = 'Actualizar rankings';
        item.setAttribute('aria-label', 'Actualizar rankings de puntuaciones');
        item.addEventListener('click', onRefresh);
        item.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onRefresh();
        });
      }

      const rank = document.createElement('span');
      rank.className = 'cg-leaderboard-rank';
      rank.textContent = String(index + 1);

      const student = document.createElement('span');
      student.className = 'cg-leaderboard-student';
      const name = document.createElement('span');
      name.className = 'cg-leaderboard-name';
      name.textContent = row.student_name || 'Estudiante';
      const grade = document.createElement('span');
      grade.className = 'cg-leaderboard-grade';
      grade.textContent = row.grade || '';
      student.append(name, grade);

      const score = document.createElement('span');
      score.className = 'cg-leaderboard-score';
      score.textContent = String(row.score || 0);
      item.append(rank, student, score);
      list.appendChild(item);
    });
    board.appendChild(list);
    return board;
  }

  function create(ctx, game, minimumScore) {
    const noOp = { submit: async () => false, refresh: async () => {} };
    const student = ctx && ctx.student;
    if (!SUPPORTED_GAMES.has(game) || !student || !student.nie) return noOp;

    ensureStyles();
    const root = document.createElement('section');
    root.className = 'cg-leaderboard';
    const title = document.createElement('h3');
    title.className = 'cg-leaderboard-title';
    title.textContent = '🏆 Ranking de puntuaciones';
    const note = document.createElement('p');
    note.className = 'cg-leaderboard-note';
    const scoreUnit = game === 'hangman' ? 'palabras' : game === 'flappy' ? 'tubos' : game === 'doodle' ? 'unidades de altura' : 'puntos';
    const singularUnit = game === 'hangman' ? 'palabra' : game === 'flappy' ? 'tubo' : game === 'doodle' ? 'unidad de altura' : 'punto';
    note.textContent = `Tu marca se guarda desde ${minimumScore} ${minimumScore === 1 ? singularUnit : scoreUnit} y solo si mejora la anterior.`;
    const status = document.createElement('div');
    status.className = 'cg-leaderboard-status';
    const gradeChips = document.createElement('div');
    gradeChips.className = 'cg-leaderboard-grades';
    gradeChips.setAttribute('aria-label', 'Grados del ranking');
    const grids = document.createElement('div');
    grids.className = 'cg-leaderboard-grids';
    root.append(title, note, status);
    const isTeacher = String(student.grade || '').trim().toLowerCase() === 'maestro';
    if (isTeacher) root.appendChild(gradeChips);
    root.appendChild(grids);
    ctx.container.appendChild(root);

    let studentKeyPromise = null;
    // Solo usamos la mejor marca confirmada durante esta sesión. Una respuesta
    // rechazada por el servidor nunca debe impedir un reintento posterior.
    let bestSent = 0;
    let requestRunning = false;
    let selectedGrade = student.grade || '';
    let availableGrades = configuredGrades();
    let refreshNumber = 0;

    function renderGradeChips() {
      if (!isTeacher) return;
      const grades = [...new Set([selectedGrade, ...availableGrades]
        .filter(grade => typeof grade === 'string' && grade.trim())
        .map(grade => grade.trim()))].sort((a, b) => a.localeCompare(b, 'es'));
      gradeChips.replaceChildren(...grades.map(grade => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cg-leaderboard-chip';
        chip.textContent = grade;
        chip.setAttribute('aria-pressed', String(grade === selectedGrade));
        chip.addEventListener('click', () => {
          if (grade === selectedGrade) return;
          selectedGrade = grade;
          renderGradeChips();
          refresh();
        });
        return chip;
      }));
    }

    renderGradeChips();

    const getStudentKey = () => {
      if (!studentKeyPromise) studentKeyPromise = hashStudentId(student.nie);
      return studentKeyPromise;
    };

    async function refresh() {
      const currentRefresh = ++refreshNumber;
      const gradeToLoad = selectedGrade;
      try {
        status.textContent = 'Actualizando ranking…';
        const key = await getStudentKey();
        const data = await rpc('get_game_leaderboards', {
          p_game: game,
          p_grade: gradeToLoad,
          p_student_key: key
        });
        if (currentRefresh !== refreshNumber) return;
        if (isTeacher && Array.isArray(data && data.grades)) {
          availableGrades = [...availableGrades, ...data.grades];
          renderGradeChips();
        }
        grids.replaceChildren(
          createList('🌎 Top 10 global', data && data.global, 10, refresh),
          createList(`🎓 Top 10 · ${gradeToLoad || 'mi grado'}`, data && data.grade, 10, refresh)
        );
        status.textContent = '';
      } catch (error) {
        if (currentRefresh !== refreshNumber) return;
        console.warn('No se pudo cargar el ranking', error);
        status.textContent = 'Ranking no disponible temporalmente.';
      }
    }

    async function submit(score) {
      score = Math.max(0, Math.floor(Number(score) || 0));
      if (score < minimumScore || score <= bestSent || requestRunning) return false;
      requestRunning = true;
      try {
        status.textContent = 'Guardando tu mejor puntuacion…';
        const key = await getStudentKey();
        const improved = await rpc('submit_game_score', {
          p_student_key: key,
          p_student_name: student.name || 'Estudiante',
          p_grade: student.grade || 'Sin grado',
          p_game: game,
          p_score: score
        });
        if (improved === true) {
          bestSent = Math.max(bestSent, score);
          localStorage.setItem(`coeduca-ranking-${game}-${student.nie}`, String(bestSent));
        }
        await refresh();
        return improved === true;
      } catch (error) {
        console.warn('No se pudo guardar la puntuacion', error);
        status.textContent = 'No se pudo guardar la marca; se intentara en la proxima partida.';
        return false;
      } finally {
        requestRunning = false;
      }
    }

    refresh();
    return { submit, refresh };
  }

  global.COEDUCA_LEADERBOARD = { create };
})(window);
