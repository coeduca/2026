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
  function activityStorageId(config) {
    if (config.id) return String(config.id);
    const topicId = (config.topic || 'page').replace(/\W+/g, '_').toLowerCase();
    const path = (location.pathname || '')
      .replace(/\/(?:index|juegos)\.html$/i, '/')
      .replace(/\/+$/, '');
    const folder = path.split('/').pop().replace(/\W+/g, '_').toLowerCase();
    return folder && folder !== topicId
      ? path.split('/').filter(Boolean).slice(-2).join('-').toLowerCase()
      : topicId;
  }
  const key = (document.body.dataset.framework === 'civica' ? 'civica_' : 'coeduca_') +
    activityStorageId(config) + '_state';
  const catalog = document.getElementById('gc-catalog');
  const loginSection = document.getElementById('gc-login');
  const playSection = document.getElementById('gc-play');
  const studentBadge = document.getElementById('gc-student');
  const result = document.getElementById('gc-result');
  const infoButton = document.getElementById('gc-info-button');
  const INFO_HTML = '<div class="gc-info-overlay" id="gc-info-overlay"><section class="gc-info-dialog" role="dialog" aria-modal="true" aria-labelledby="gc-info-title"><h2 id="gc-info-title">Cómo funciona el Centro de Juegos</h2><p>Los juegos del Centro de Juegos no dan puntos extra para la nota por sí solos.</p><p>Solo el juego del día puede otorgar puntos extra cuando está configurado dentro de la actividad.</p><p>Aun así, puedes jugar cualquier juego para mejorar tu puntaje en el ranking y desbloquear avatares.</p><div class="gc-info-actions"><button class="gc-info-close" type="button">Entendido</button></div></section></div>';
  let student = null;
  let infoOverlay = null;

  function closeInfo() {
    if (!infoOverlay) return;
    infoOverlay.remove();
    infoOverlay = null;
    if (infoButton) infoButton.focus();
  }

  function openInfo() {
    if (infoOverlay) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = INFO_HTML;
    infoOverlay = wrapper.firstElementChild;
    document.body.appendChild(infoOverlay);
    const closeButton = infoOverlay.querySelector('.gc-info-close');
    closeButton.addEventListener('click', closeInfo);
    infoOverlay.addEventListener('click', event => { if (event.target === infoOverlay) closeInfo(); });
    closeButton.focus();
  }

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
    if (studentRecord.nie === '1999' || studentRecord.nie === '12379') return true;
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
    const grantsExtraPoints = !!(config.game && config.game.type === selected.id);
    try {
      renderer({
        container: container,
        config: gameConfig(selected),
        student: student,
        onWin: () => { if (grantsExtraPoints) updateResult('win'); },
        onTie: () => { if (grantsExtraPoints) updateResult('tie'); },
        onLose: () => { if (grantsExtraPoints) updateResult('lose'); },
        onBalloonBonus: () => { if (grantsExtraPoints) addBalloonBonus(); }
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

  async function init() {
    renderCatalog();
    if (infoButton) infoButton.addEventListener('click', openInfo);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && infoOverlay) closeInfo(); });
    if (!selected) return;
    const saved = readSnapshot();
    const auth = window.COEDUCA_FIXED_AUTH;
    const remembered = auth && auth.lastStudent() || '';
    const nie = remembered || String(saved && saved.student && saved.student.nie || '');
    const savedStudent = findStudent(nie);
    if (savedStudent && allowed(savedStudent)) {
      if (nie === '1999' || nie === '12379') {
        try { if (auth && await auth.hasSession(nie)) student = savedStudent; }
        catch (_) { /* Solicitar acceso si no se pudo validar el token. */ }
      } else student = savedStudent;
    }
    if (student) {
      if (!saved || !saved.student || String(saved.student.nie) !== student.nie) {
        writeSnapshot({student: student});
      }
      if (auth) auth.remember(student.nie);
      showGame();
      return;
    }
    loginSection.hidden = false;
    requestAnimationFrame(() => loginSection.scrollIntoView({ block: 'start' }));
    document.getElementById('gc-login-form').addEventListener('submit', async event => {
      event.preventDefault();
      const nie = document.getElementById('gc-nie').value.trim();
      const found = findStudent(nie);
      const error = document.getElementById('gc-login-error');
      if (!found) { error.textContent = 'No encontramos ese NIE en este paquete.'; return; }
      if (!allowed(found)) { error.textContent = 'Este grado no tiene acceso a la actividad.'; return; }
      if (nie === '1999' || nie === '12379') {
        const auth = window.COEDUCA_FIXED_AUTH;
        if (!auth) { error.textContent = 'No se pudo cargar el acceso protegido.'; return; }
        const accepted = await auth.requestLogin(nie);
        if (!accepted) return;
      }
      error.textContent = '';
      const prior = readSnapshot();
      const sameStudent = prior && prior.student && String(prior.student.nie) === nie;
      writeSnapshot(Object.assign(sameStudent ? prior : {}, { student: found }));
      if (window.COEDUCA_FIXED_AUTH) window.COEDUCA_FIXED_AUTH.remember(nie);
      student = found;
      showGame();
    });
  }

  init();
})();
