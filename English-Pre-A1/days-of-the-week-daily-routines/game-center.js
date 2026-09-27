/** Catalogo de juegos con ranking para los paquetes de GitHub Pages. */
(function () {
  'use strict';

  const config = window.GAME_CENTER_CONFIG || {};
  const core = window.CIVICA || window.COEDUCA;
  const games = [
    { id: 'hangman', name: 'Ahorcado', image: 'ahorcado.webp', accent: '#b45c14', description: 'Adivina palabras del banco y suma aciertos.' },
    { id: 'dino', name: 'Dino Runner', image: 'dino-runner.webp', accent: '#25833a', description: 'Corre, salta obstáculos y llega cada vez más lejos.' },
    { id: 'flappy', name: 'Flappy', image: 'flappy.webp', accent: '#087ca5', description: 'Cruza tubos sin chocar y supera tu récord.' },
    { id: 'doodle', name: 'Salto infinito', image: 'salto-infinito.webp', accent: '#7856d8', description: 'Sube por plataformas y acumula altura.' },
    { id: 'snake', name: 'Snake', image: 'snake.webp', accent: '#1b8362', description: 'Recoge comida para subir tu puntuación.' },
    { id: 'pills', name: 'Píldoras', image: 'pildoras.webp', accent: '#a03895', description: 'Sobrevive, recoge puntos y persigue una nueva marca.' },
    { id: 'sandwich', name: 'Torre sándwich', image: 'torre-de-sandwhich.webp', accent: '#b8582b', description: 'Apila ingredientes sin detenerte.' }
  ];
  const byId = Object.fromEntries(games.map(game => [game.id, game]));
  const selectedId = new URLSearchParams(location.search).get('juego');
  const selected = byId[selectedId] || null;
  const key = (document.body.dataset.framework === 'civica' ? 'civica_' : 'coeduca_') +
    (config.id || (config.topic || 'page').replace(/\W+/g, '_').toLowerCase()) + '_state';
  const loginRequiredKey = key + '_hubLoginRequired';
  const catalog = document.getElementById('gc-catalog');
  const loginSection = document.getElementById('gc-login');
  const playSection = document.getElementById('gc-play');
  const studentBadge = document.getElementById('gc-student');
  const result = document.getElementById('gc-result');
  let student = null;

  function readSnapshot() {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch (e) { return null; }
  }

  function writeSnapshot(snapshot) {
    try { localStorage.setItem(key, JSON.stringify(snapshot)); }
    catch (e) { result.textContent = 'No se pudo guardar el punto extra en este dispositivo.'; }
  }

  function findStudent(nie) {
    if (typeof STUDENTS === 'undefined' || !STUDENTS || !Object.prototype.hasOwnProperty.call(STUDENTS, nie)) return null;
    const entry = STUDENTS[nie];
    return { nie: nie, name: entry.name, grade: entry.grade };
  }

  function allowed(studentRecord) {
    if (studentRecord.nie === '1999') return true;
    if (document.body.dataset.framework === 'civica') return studentRecord.grade === 'Octavo';
    const levels = {
      'A1+': ['Noveno', 'Primer Ano', 'Primer Año', 'Segundo Ano', 'Segundo Año'],
      'PreA1': ['Séptimo', 'Septimo', 'Octavo']
    };
    return !levels[config.level] || levels[config.level].includes(studentRecord.grade);
  }

  function updateResult(kind) {
    const points = { win: 1, tie: 0.5, lose: 0 };
    const snapshot = readSnapshot();
    if (!snapshot || !snapshot.student || String(snapshot.student.nie) !== student.nie) return;
    const previous = Number(snapshot.extraPoints) || 0;
    const earned = points[kind];
    if (earned > previous) {
      snapshot.extraPoints = earned;
      snapshot.gameResult = kind;
      writeSnapshot(snapshot);
    }
    result.textContent = kind === 'win'
      ? '¡Conseguiste 1 punto extra para tu nota final!'
      : kind === 'tie'
        ? (previous >= 1 ? 'Conservas tu punto extra anterior.' : 'Conseguiste 0.5 puntos extra para tu nota final.')
        : (previous > 0 ? 'Conservas tus puntos extra anteriores.' : 'Sigue intentando superar tu marca.');
  }

  function addBalloonBonus() {
    const snapshot = readSnapshot();
    if (!snapshot || !snapshot.student || String(snapshot.student.nie) !== student.nie) return;
    if ((Number(snapshot.balloonBonus) || 0) >= 1) return;
    snapshot.balloonBonus = 1;
    writeSnapshot(snapshot);
    result.textContent = '¡Encontraste el bonus especial de 1 punto extra!';
  }

  function gameConfig(game) {
    const day = config.game && config.game.type === game.id ? config.game : {};
    const selectedConfig = Object.assign({ type: game.id }, day);
    if (game.id === 'hangman' && (!Array.isArray(selectedConfig.words) || !selectedConfig.words.length)) {
      selectedConfig.words = Array.isArray(window.COEDUCA_HANGMAN_WORDS)
        ? window.COEDUCA_HANGMAN_WORDS : ['ESCUELA', 'APRENDER', 'RESPETO'];
    }
    return selectedConfig;
  }

  function showGame() {
    if (!selected || !student) return;
    loginSection.hidden = true;
    playSection.hidden = false;
    studentBadge.hidden = false;
    studentBadge.textContent = student.name + ' · ' + student.grade;
    document.getElementById('gc-play-title').textContent = selected.name;
    const container = document.getElementById('gc-game');
    const renderer = core && core.getGameRenderer && core.getGameRenderer(selected.id);
    if (!renderer) {
      result.textContent = 'Este juego no está disponible en el paquete.';
      return;
    }
    try {
      renderer({
        container: container,
        config: gameConfig(selected),
        student: student,
        onWin: () => updateResult('win'),
        onTie: () => updateResult('tie'),
        onLose: () => updateResult('lose'),
        onBalloonBonus: addBalloonBonus
      });
    } catch (error) {
      console.error('No se pudo abrir el juego', selected.id, error);
      result.textContent = 'No se pudo abrir este juego.';
    }
    const soundToggle = container.querySelector('.coeduca-game-sound-toggle');
    if (soundToggle) {
      const soundSlot = document.getElementById('gc-sound-slot');
      soundSlot.appendChild(soundToggle);
      soundSlot.hidden = false;
    }
    requestAnimationFrame(() => playSection.scrollIntoView({ block: 'start' }));
  }

  function renderCatalog() {
    document.getElementById('gc-project-title').textContent = config.topic || 'Elige un juego y supera tu mejor puntuación.';
    document.getElementById('gc-count').textContent = games.length + ' juegos';
    games.forEach((game, index) => {
      const card = document.createElement('a');
      card.className = 'gc-card';
      card.href = 'juegos.html?juego=' + encodeURIComponent(game.id);
      card.style.setProperty('--gc-card-accent', game.accent);
      if (selected && selected.id === game.id) card.setAttribute('aria-current', 'page');
      const art = document.createElement('span');
      art.className = 'gc-card-art';
      const image = document.createElement('img');
      image.className = 'gc-card-image';
      image.src = game.image;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      const number = document.createElement('span');
      number.className = 'gc-card-number';
      number.textContent = String(index + 1).padStart(2, '0');
      art.append(image, number);
      const body = document.createElement('span');
      body.className = 'gc-card-body';
      const title = document.createElement('span');
      title.className = 'gc-card-title';
      title.textContent = game.name;
      const description = document.createElement('span');
      description.className = 'gc-card-description';
      description.textContent = game.description;
      const action = document.createElement('span');
      action.className = 'gc-card-action';
      action.textContent = 'Jugar';
      body.append(title, description, action);
      card.append(art, body);
      catalog.appendChild(card);
    });
  }

  function init() {
    renderCatalog();
    const navigation = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    const reloaded = navigation ? navigation.type === 'reload' : performance.navigation && performance.navigation.type === 1;
    if (reloaded) {
      try { sessionStorage.setItem(loginRequiredKey, '1'); } catch (e) {}
    }
    if (!selected) return;
    const saved = readSnapshot();
    let loginRequired = false;
    try { loginRequired = sessionStorage.getItem(loginRequiredKey) === '1'; } catch (e) {}
    if (!loginRequired && saved && saved.student) {
      const savedStudent = findStudent(String(saved.student.nie || ''));
      if (savedStudent && allowed(savedStudent)) student = savedStudent;
    }
    if (student) {
      showGame();
      return;
    }
    loginSection.hidden = false;
    requestAnimationFrame(() => loginSection.scrollIntoView({ block: 'start' }));
    document.getElementById('gc-login-form').addEventListener('submit', event => {
      event.preventDefault();
      const nie = document.getElementById('gc-nie').value.trim();
      const found = findStudent(nie);
      const error = document.getElementById('gc-login-error');
      if (!found) { error.textContent = 'No encontramos ese NIE en este paquete.'; return; }
      if (!allowed(found)) { error.textContent = 'Este grado no tiene acceso a la actividad.'; return; }
      error.textContent = '';
      const prior = readSnapshot();
      const sameStudent = prior && prior.student && String(prior.student.nie) === nie;
      writeSnapshot(Object.assign(sameStudent ? prior : {}, { student: found }));
      try { sessionStorage.removeItem(loginRequiredKey); } catch (e) {}
      student = found;
      showGame();
    });
  }

  init();
})();
