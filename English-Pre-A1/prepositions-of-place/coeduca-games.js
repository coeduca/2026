/**
 * COEDUCA Framework v2 - Games (Pop Art ENHANCED)
 * 7 juegos: tictactoe, snake, dino, hangman, trivia, pills, sandwich
 * Depende de coeduca-core.js.
 *
 * Cada juego recibe ctx = { container, config, onWin, onTie, onLose }
 * onWin: +1 pt extra, onTie: +0.5, onLose: 0.
 *
 * Mascota: Rigo 🦊
 */
(function (global) {
  'use strict';
  if (!global.COEDUCA) {
    console.error('coeduca-core.js debe cargarse antes que coeduca-games.js');
    return;
  }
  const C = global.COEDUCA;
  const reg = (type, fn) => C.registerGame(type, fn);

  // ---------- Estilos compartidos por los juegos (inyectados una sola vez) ----------
  if (!document.getElementById('coeduca-games-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'coeduca-games-styles';
    styleEl.textContent = `
      /* === Animaciones compartidas para juegos === */
      @keyframes cgSlideInRight {
        from { opacity: 0; transform: translateX(60px) rotate(2deg); }
        to   { opacity: 1; transform: translateX(0) rotate(0); }
      }
      @keyframes cgSlideOutLeft {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(-60px); }
      }
      @keyframes cgShakeX {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-6px); }
        80% { transform: translateX(6px); }
      }
      @keyframes cgPopBounce {
        0%   { transform: scale(0.3); opacity: 0; }
        60%  { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); }
      }
      @keyframes cgPulseGlow {
        0%, 100% { box-shadow: 3px 3px 0 var(--coeduca-stroke), 0 0 0 0 rgba(76,175,80,0.6); }
        50%      { box-shadow: 3px 3px 0 var(--coeduca-stroke), 0 0 0 12px rgba(76,175,80,0); }
      }
      @keyframes cgThinking {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40%           { transform: scale(1);   opacity: 1; }
      }
      @keyframes cgConfettiFall {
        0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
        100% { transform: translateY(220px) rotate(720deg); opacity: 0; }
      }
      @keyframes cgDrawLine {
        from { stroke-dashoffset: 200; }
        to   { stroke-dashoffset: 0; }
      }
      @keyframes cgHeartBeat {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.2); }
      }
      @keyframes cgWiggle {
        0%, 100% { transform: rotate(-3deg); }
        50%      { transform: rotate(3deg); }
      }

      #snake-start:disabled,
      #dino-start:disabled,
      #pl-start:disabled,
      #sw-start:disabled {
        opacity: 0.52;
        cursor: not-allowed;
        filter: grayscale(0.3);
        transform: none !important;
        box-shadow: 1px 1px 0 var(--coeduca-stroke, #1a1a1a) !important;
      }

      /* === Avatar de jugador / Rigo === */
      .cg-avatar {
        display: inline-flex; align-items: center; gap: 8px;
        background: var(--coeduca-surface);
        border: 3px solid var(--coeduca-stroke);
        border-radius: 50px;
        padding: 4px 14px 4px 4px;
        font-weight: 900; text-transform: uppercase;
        box-shadow: 3px 3px 0 var(--coeduca-stroke);
        font-size: 14px;
        letter-spacing: 0.5px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .cg-avatar-circle {
        width: 36px; height: 36px;
        border-radius: 50%;
        border: 2px solid var(--coeduca-stroke);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px;
        background: var(--coeduca-primary);
      }
      .cg-avatar.is-active {
        animation: coeducaBadgePulse 1.4s ease-in-out infinite;
      }
      .cg-avatar.is-thinking .cg-avatar-circle {
        animation: cgWiggle 0.6s ease-in-out infinite;
      }

      /* === Dot loader (Rigo está pensando) === */
      .cg-dots { display: inline-flex; gap: 4px; align-items: center; }
      .cg-dots span {
        width: 8px; height: 8px; border-radius: 50%;
        background: var(--coeduca-stroke);
        animation: cgThinking 1.2s infinite ease-in-out;
      }
      .cg-dots span:nth-child(2) { animation-delay: 0.15s; }
      .cg-dots span:nth-child(3) { animation-delay: 0.3s; }

      /* === TicTacToe celda === */
      .cg-ttt-cell {
        width: 90px; height: 90px;
        background: #FFF8E7;
        border: 3px solid var(--coeduca-stroke);
        font-size: 54px; font-weight: 900;
        cursor: pointer; border-radius: 8px;
        transition: transform 0.12s, background 0.2s;
        box-shadow: inset -2px -2px 0 rgba(0,0,0,0.08);
        display: flex; justify-content: center; align-items: center; padding: 0;
        font-family: inherit;
      }
      .cg-ttt-cell:not(:disabled):hover {
        background: #FFFEF0;
        transform: translate(-1px, -1px);
      }
      .cg-ttt-cell:not(:disabled):active { transform: scale(0.95); }
      .cg-ttt-cell.is-x { color: var(--coeduca-accent); background: #FFE4E1; }
      .cg-ttt-cell.is-o { color: var(--coeduca-info);   background: #E0F7FA; }
      .cg-ttt-cell .cg-mark {
        animation: cgPopBounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      /* === Trivia card === */
      .cg-trivia-card {
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        color: var(--coeduca-primary);
        border: 4px solid var(--coeduca-primary);
        border-radius: 14px;
        padding: 20px 18px;
        margin-bottom: 16px;
        font-weight: 900;
        font-size: 17px;
        line-height: 1.4;
        text-shadow: 2px 2px 0 #000;
        box-shadow: 5px 5px 0 var(--coeduca-stroke);
        position: relative;
        overflow: hidden;
        animation: cgSlideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .cg-trivia-card.is-leaving { animation: cgSlideOutLeft 0.3s ease-in forwards; }
      .cg-trivia-card::before {
        content: '?';
        position: absolute;
        top: -20px; right: -10px;
        font-size: 120px;
        color: rgba(255, 215, 0, 0.08);
        font-weight: 900;
        pointer-events: none;
      }
      .cg-trivia-opt {
        text-align: left !important;
        padding: 12px 14px !important;
        font-size: 14px !important;
        transition: transform 0.15s, box-shadow 0.15s, outline 0.2s;
      }
      .cg-trivia-opt.is-correct {
        outline: 4px solid var(--coeduca-success);
        outline-offset: 2px;
        animation: cgPulseGlow 0.8s ease-out 1;
      }
      .cg-trivia-opt.is-wrong {
        outline: 4px solid var(--coeduca-error);
        outline-offset: 2px;
        animation: cgShakeX 0.5s;
      }
      .cg-progress-bar {
        height: 14px;
        background: var(--coeduca-surface);
        border: 3px solid var(--coeduca-stroke);
        border-radius: 50px;
        overflow: hidden;
        margin: 8px auto 14px;
        max-width: 320px;
        box-shadow: 2px 2px 0 var(--coeduca-stroke);
      }
      .cg-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--coeduca-accent), var(--coeduca-primary));
        transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        border-right: 2px solid var(--coeduca-stroke);
      }

      /* === Hangman === */
      .cg-hm-wrap { text-align: center; }
      .cg-hm-stage {
        background: linear-gradient(180deg, #B3E5FC 0%, #FFF8E7 100%);
        border: 4px solid var(--coeduca-stroke);
        border-radius: 12px;
        box-shadow: 5px 5px 0 var(--coeduca-stroke);
        width: 240px;
        height: 240px;
        margin: 0 auto;
      }
      .cg-hm-hearts {
        margin-top: 10px;
        font-size: 22px;
        letter-spacing: 4px;
        min-height: 28px;
      }
      .cg-hm-hearts span { display: inline-block; }
      .cg-hm-hearts .heart-lost { opacity: 0.25; filter: grayscale(1); }
      .cg-hm-hearts .heart-active { animation: cgHeartBeat 1.1s ease-in-out infinite; }
      .cg-hm-word {
        font-family: 'Courier New', monospace;
        font-size: 30px;
        letter-spacing: 6px;
        font-weight: 900;
        margin: 14px 0;
        color: var(--coeduca-stroke);
        background: var(--coeduca-surface);
        border: 3px dashed var(--coeduca-stroke);
        border-radius: 10px;
        padding: 10px;
        display: inline-block;
        min-width: 200px;
      }
      .cg-hm-word .letter-revealed {
        color: var(--coeduca-success);
        animation: cgPopBounce 0.3s;
        display: inline-block;
      }
      .cg-hm-keys {
        display: grid;
        gap: 4px;
        max-width: 420px;
        margin: 0 auto;
      }
      .cg-hm-keys-row { display: flex; gap: 4px; justify-content: center; }
      .cg-hm-key {
        min-width: 32px; height: 36px;
        padding: 0 8px;
        font-size: 14px;
        font-weight: 900;
        border-radius: 8px;
        border: 2px solid var(--coeduca-stroke);
        background: var(--coeduca-surface);
        cursor: pointer;
        transition: transform 0.1s, background 0.2s;
        box-shadow: 2px 2px 0 var(--coeduca-stroke);
        font-family: inherit;
        text-transform: uppercase;
      }
      .cg-hm-key:not(:disabled):hover { transform: translate(-1px, -1px); }
      .cg-hm-key.is-hit  { background: var(--coeduca-success); color: #fff; }
      .cg-hm-key.is-miss { background: var(--coeduca-error);   color: #fff; }
      .cg-hm-key:disabled { cursor: not-allowed; box-shadow: 1px 1px 0 var(--coeduca-stroke); }

      /* === Snake === */
      .cg-snake-wrap { text-align: center; }
      .cg-snake-canvas {
        border: 4px solid var(--coeduca-stroke);
        border-radius: 12px;
        background: #1d3b1f;
        max-width: 100%;
        height: auto;
        touch-action: none;
        box-shadow: 5px 5px 0 var(--coeduca-stroke);
        display: block;
        margin: 0 auto;
      }
      .cg-snake-controls {
        margin-top: 14px;
        display: flex; flex-direction: column; align-items: center; gap: 10px;
      }
      .cg-snake-dpad {
        display: grid;
        grid-template-columns: repeat(3, 56px);
        gap: 6px;
      }
      .cg-snake-dir {
        height: 56px;
        font-size: 22px;
        padding: 0 !important;
      }
      .cg-snake-start {
        font-size: 16px !important;
        padding: 14px 36px !important;
        letter-spacing: 1.5px;
      }
      .cg-snake-score {
        display: inline-flex; gap: 14px; align-items: center;
        background: var(--coeduca-stroke);
        color: var(--coeduca-primary);
        padding: 8px 18px;
        border-radius: 50px;
        font-weight: 900;
        letter-spacing: 1px;
        margin-bottom: 10px;
        box-shadow: 3px 3px 0 var(--coeduca-stroke);
      }

      /* === Dino === */
      .cg-dino-canvas {
        border: 4px solid var(--coeduca-stroke);
        border-radius: 12px;
        max-width: 100%;
        height: auto;
        touch-action: none;
        cursor: pointer;
        box-shadow: 5px 5px 0 var(--coeduca-stroke);
        display: block;
      }

      /* === Confetti === */
      .cg-confetti-layer {
        position: absolute; inset: 0; pointer-events: none; overflow: hidden;
      }
      .cg-confetti {
        position: absolute;
        width: 10px; height: 14px;
        top: -20px;
        animation: cgConfettiFall 1.4s ease-in forwards;
        border: 1px solid rgba(0,0,0,0.4);
      }

      /* === Game status text === */
      .cg-status {
        margin-top: 16px;
        font-weight: 900;
        font-size: 20px;
        min-height: 28px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .cg-status.is-win  { color: var(--coeduca-success); animation: coeducaPopIn 0.5s; }
      .cg-status.is-lose { color: var(--coeduca-error);   animation: cgShakeX 0.5s; }
      .cg-status.is-tie  { color: var(--coeduca-stroke); }

      @media (max-width: 480px) {
        .cg-ttt-cell { width: 72px; height: 72px; font-size: 42px; }
        .cg-hm-stage { width: 200px; height: 200px; }
        .cg-hm-word { font-size: 24px; letter-spacing: 4px; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ---------- Helpers compartidos ----------
  const RIGO_EMOJI = '🐸';
  const PLAYER_EMOJI = '😎';

  // Cara real de Rigo: el favicon que viaja dentro de cada paquete.
  // Si la imagen no carga (paquete viejo sin favicon), cae al emoji.
  const RIGO_IMG = '<img src="favicon.png" alt="Rigo" ' +
    'style="width:100%;height:100%;object-fit:cover;border-radius:50%;" ' +
    'onerror="this.outerHTML=\'' + RIGO_EMOJI + '\'">';

  // Los juegos escuchan el teclado a nivel de documento. Si el estudiante está
  // escribiendo en un campo de texto (p. ej. emojiphrase), no debemos robarle
  // las teclas ni bloquear el espacio con preventDefault.
  function isTypingTarget(e) {
    const t = e.target;
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
  }

  // ---------- Sonido: efectos sintetizados con WebAudio (sin archivos) ----------
  const SND_KEY = 'coeduca_snd_muted';
  let sndCtx = null;
  function sndMuted() {
    try { return localStorage.getItem(SND_KEY) === '1'; } catch (e) { return false; }
  }
  function sndSetMuted(m) {
    try { localStorage.setItem(SND_KEY, m ? '1' : '0'); } catch (e) {}
  }
  // beep(f0, f1, dur, type, vol, delay): tono corto con deslizamiento de frecuencia
  function beep(f0, f1, dur, type, vol, delay) {
    if (sndMuted()) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!sndCtx) sndCtx = new AC();
      if (sndCtx.state === 'suspended') sndCtx.resume();
      const t0 = sndCtx.currentTime + (delay || 0);
      const osc = sndCtx.createOscillator();
      const g = sndCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1 || f0), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(sndCtx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    } catch (e) { /* dispositivo sin audio */ }
  }
  const SFX = {
    tap:     () => beep(420, 420, 0.06, 'square', 0.07),
    place:   () => beep(320, 320, 0.07, 'square', 0.08),
    jump:    () => beep(240, 520, 0.14, 'square', 0.09),
    eat:     () => { beep(660, 660, 0.07, 'square', 0.09); beep(880, 880, 0.09, 'square', 0.09, 0.07); },
    correct: () => { beep(700, 700, 0.09, 'triangle', 0.12); beep(1050, 1050, 0.12, 'triangle', 0.12, 0.09); },
    wrong:   () => beep(190, 150, 0.28, 'sawtooth', 0.1),
    pop:     () => { beep(950, 250, 0.09, 'square', 0.12); beep(1200, 1200, 0.08, 'triangle', 0.1, 0.09); beep(1600, 1600, 0.1, 'triangle', 0.1, 0.17); },
    die:     () => beep(300, 70, 0.4, 'sawtooth', 0.12),
    win:     () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, f, 0.14, 'triangle', 0.12, i * 0.11)); },
    lose:    () => { [330, 262, 196].forEach((f, i) => beep(f, f, 0.18, 'sawtooth', 0.09, i * 0.15)); },
    tie:     () => { beep(440, 440, 0.12, 'triangle', 0.1); beep(440, 440, 0.12, 'triangle', 0.1, 0.14); }
  };

  // Iconos Material proporcionados para el estado activo y silenciado.
  const SOUND_ON_ICON = '<svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M640-440v-80h160v80H640Zm48 280-128-96 48-64 128 96-48 64Zm-80-480-48-64 128-96 48 64-128 96ZM120-360v-240h160l200-200v640L280-360H120Z"/></svg>';
  const SOUND_OFF_ICON = '<svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="m616-320-56-56 104-104-104-104 56-56 104 104 104-104 56 56-104 104 104 104-56 56-104-104-104 104Zm-496-40v-240h160l200-200v640L280-360H120Z"/></svg>';

  // Botón de sonido en la esquina de la card de Juego final.
  function makeSoundToggle(wrap) {
    const host = wrap.closest('.coeduca-exercise, .civica-section--consolidate') || wrap;
    host.style.position = 'relative';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'coeduca-game-sound-toggle';
    b.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;width:42px;height:42px;' +
      'display:grid;place-items:center;color:#1a1a1a;border:3px solid #1a1a1a;' +
      'border-radius:12px;background:#fff;cursor:pointer;box-shadow:2px 2px 0 #1a1a1a;' +
      'padding:0;line-height:1;transition:transform .15s ease,box-shadow .15s ease;';
    const renderState = () => {
      const muted = sndMuted();
      b.innerHTML = muted ? SOUND_OFF_ICON : SOUND_ON_ICON;
      b.title = muted ? 'Activar sonido' : 'Desactivar sonido';
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-pressed', String(muted));
    };
    b.addEventListener('pointerdown', () => {
      b.style.transform = 'translate(2px,2px)';
      b.style.boxShadow = '0 0 0 #1a1a1a';
    });
    const releaseButton = () => {
      b.style.transform = '';
      b.style.boxShadow = '2px 2px 0 #1a1a1a';
    };
    b.addEventListener('pointerup', releaseButton);
    b.addEventListener('pointercancel', releaseButton);
    b.addEventListener('pointerleave', releaseButton);
    b.addEventListener('click', () => {
      sndSetMuted(!sndMuted());
      renderState();
      if (!sndMuted()) SFX.tap();
    });
    renderState();
    host.appendChild(b);
    return b;
  }

  // Pausa automatica: llama a onHide cuando la pestana se oculta y a onShow al
  // volver. Se auto-limpia cuando el juego sale del DOM.
  function autoPause(wrap, onHide, onShow) {
    const handler = () => {
      if (!document.body.contains(wrap)) {
        document.removeEventListener('visibilitychange', handler);
        return;
      }
      if (document.hidden) onHide(); else onShow();
    };
    document.addEventListener('visibilitychange', handler);
  }

  function avatarHTML(name, emoji, bgColor, opts = {}) {
    const cls = opts.active ? 'cg-avatar is-active' : 'cg-avatar';
    return `
      <div class="${cls}" data-avatar="${name}">
        <div class="cg-avatar-circle" style="background:${bgColor};">${emoji}</div>
        <span>${name}</span>
      </div>
    `;
  }

  function spawnConfetti(container, count = 30) {
    const layer = document.createElement('div');
    layer.className = 'cg-confetti-layer';
    const colors = ['#FFD700', '#FF6B9D', '#4FC3F7', '#4CAF50', '#9B5DE5', '#FF9F1C'];
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'cg-confetti';
      c.style.left = (Math.random() * 100) + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.animationDuration = (1.0 + Math.random() * 0.8) + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      layer.appendChild(c);
    }
    container.appendChild(layer);
    setTimeout(() => layer.remove(), 2400);
  }

  // =====================================================================
  // 1. TICTACTOE — Tú (X) vs Rigo (O), línea ganadora trazada en SVG
  // =====================================================================
  reg('tictactoe', function (ctx) {
    let board = Array(9).fill('');
    let gameOver = false;
    let winLine = [];
    let playerTurn = true;

    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.innerHTML = `
      <div style="text-align:center;">
        <div style="display:flex;justify-content:center;gap:14px;margin-bottom:18px;flex-wrap:wrap;">
          ${avatarHTML('Tú', PLAYER_EMOJI, '#FFE4E1', { active: true })}
          <div style="display:flex;align-items:center;font-weight:900;font-size:18px;color:var(--coeduca-stroke);">VS</div>
          ${avatarHTML('Rigo', RIGO_IMG, '#E0F7FA')}
        </div>

        <div style="position:relative;display:inline-block;">
          <div id="ttt-grid" style="display:grid;grid-template-columns:repeat(3,90px);
               gap:8px;justify-content:center;background:var(--coeduca-stroke);padding:8px;
               border-radius:14px;box-shadow:5px 5px 0 var(--coeduca-stroke);"></div>
          <svg id="ttt-line" viewBox="0 0 290 290"
               style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></svg>
        </div>

        <div id="ttt-status" class="cg-status"></div>
        <button class="coeduca-btn coeduca-btn-success" id="ttt-reset"
                style="margin-top:14px;display:none;">🔄 Volver a jugar</button>
      </div>
    `;
    ctx.container.appendChild(wrap);

    makeSoundToggle(wrap);
    const grid = wrap.querySelector('#ttt-grid');
    const lineSvg = wrap.querySelector('#ttt-line');
    const statusEl = wrap.querySelector('#ttt-status');
    const resetBtn = wrap.querySelector('#ttt-reset');
    const playerAvatar = wrap.querySelector('[data-avatar="Tú"]');
    const rigoAvatar = wrap.querySelector('[data-avatar="Rigo"]');

    function setActiveAvatar(who) {
      playerAvatar.classList.toggle('is-active', who === 'player');
      rigoAvatar.classList.toggle('is-active', who === 'rigo');
      rigoAvatar.classList.toggle('is-thinking', who === 'rigo');
    }

    function render() {
      grid.innerHTML = '';
      board.forEach((c, i) => {
        const cell = document.createElement('button');
        cell.className = 'cg-ttt-cell';
        if (c === 'X') cell.classList.add('is-x');
        else if (c === 'O') cell.classList.add('is-o');
        if (c) cell.innerHTML = `<span class="cg-mark">${c}</span>`;
        cell.disabled = c !== '' || gameOver || !playerTurn;
        cell.addEventListener('click', () => playerMove(i));
        grid.appendChild(cell);
      });
    }

    function drawWinLine(line) {
      // Centros de las celdas en el viewBox 290x290 (3 celdas de 90 + 2 gaps de 8 + padding 8)
      // Cada celda ocupa: padding(8) + idx*98 + 45 (centro)
      const center = idx => {
        const col = idx % 3, row = Math.floor(idx / 3);
        return { x: 8 + col * 98 + 45, y: 8 + row * 98 + 45 };
      };
      const a = center(line[0]);
      const b = center(line[2]);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      lineSvg.innerHTML = `
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
              stroke="var(--coeduca-accent)" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${len}" stroke-dashoffset="${len}"
              style="animation: cgDrawLine 0.5s ease-out forwards;"/>
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
              stroke="var(--coeduca-stroke)" stroke-width="3" stroke-linecap="round"
              stroke-dasharray="${len}" stroke-dashoffset="${len}"
              style="animation: cgDrawLine 0.5s ease-out forwards;"/>
      `;
    }

    function checkWinner(b) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const line of lines) {
        const [a, c, d] = line;
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line };
      }
      return b.includes('') ? null : { winner: 'tie', line: [] };
    }

    function playerMove(i) {
      if (board[i] || gameOver || !playerTurn) return;
      board[i] = 'X';
      SFX.place();
      playerTurn = false;
      render();
      const res = checkWinner(board);
      if (res) return endGame(res.winner, res.line);

      setActiveAvatar('rigo');
      statusEl.innerHTML = `Rigo está pensando <span class="cg-dots"><span></span><span></span><span></span></span>`;
      statusEl.className = 'cg-status';
      setTimeout(rigoMove, 700);
    }

    function minimax(newBoard, player) {
      const availSpots = newBoard.reduce((acc, el, i) => (el === '' ? acc.concat(i) : acc), []);
      const result = checkWinner(newBoard);
      if (result) {
        if (result.winner === 'X') return { score: -10 };
        if (result.winner === 'O') return { score: 10 };
        return { score: 0 };
      }
      const moves = [];
      for (let i = 0; i < availSpots.length; i++) {
        const move = { index: availSpots[i] };
        newBoard[availSpots[i]] = player;
        move.score = minimax(newBoard, player === 'O' ? 'X' : 'O').score;
        newBoard[availSpots[i]] = '';
        moves.push(move);
      }
      let bestMove;
      if (player === 'O') {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
          if (moves[i].score > bestScore) { bestScore = moves[i].score; bestMove = i; }
        }
      } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
          if (moves[i].score < bestScore) { bestScore = moves[i].score; bestMove = i; }
        }
      }
      return moves[bestMove];
    }

    function rigoMove() {
      if (gameOver) return;
      let moveIndex;
      // 12% de probabilidad de error humano para que sea ganable
      if (Math.random() < 0.12) {
        const empty = board.map((c, i) => c === '' ? i : -1).filter(i => i >= 0);
        moveIndex = empty[Math.floor(Math.random() * empty.length)];
      } else {
        moveIndex = minimax([...board], 'O').index;
      }
      if (moveIndex !== undefined) { board[moveIndex] = 'O'; SFX.tap(); }
      playerTurn = true;
      setActiveAvatar('player');
      statusEl.innerHTML = '';
      render();
      const res = checkWinner(board);
      if (res) endGame(res.winner, res.line);
    }

    function endGame(winner, line) {
      gameOver = true;
      winLine = line || [];
      setActiveAvatar(null);
      render();
      if (line && line.length) drawWinLine(line);

      resetBtn.style.display = 'inline-block';
      resetBtn.style.animation = 'coeducaPopIn 0.4s';

      if (winner === 'X') {
        SFX.win();
        statusEl.textContent = '🎉 ¡Ganaste a Rigo!';
        statusEl.className = 'cg-status is-win';
        spawnConfetti(wrap, 30);
        ctx.onWin();
      } else if (winner === 'O') {
        SFX.lose();
        statusEl.textContent = `${RIGO_EMOJI} Rigo ganó esta vez`;
        statusEl.className = 'cg-status is-lose';
        ctx.onLose();
      } else {
        SFX.tie();
        statusEl.textContent = '🤝 ¡Empate!';
        statusEl.className = 'cg-status is-tie';
        ctx.onTie();
      }
    }

    resetBtn.addEventListener('click', () => {
      board = Array(9).fill('');
      gameOver = false;
      winLine = [];
      playerTurn = true;
      lineSvg.innerHTML = '';
      statusEl.textContent = '';
      statusEl.className = 'cg-status';
      resetBtn.style.display = 'none';
      setActiveAvatar('player');
      render();
    });

    setActiveAvatar('player');
    render();
  });

  // =====================================================================
  // 2. SNAKE — diseño mejorado, cabeza con ojos, comida tipo manzana
  // =====================================================================
  reg('snake', function (ctx) {
    const SIZE = 15, CELL = 22;
    const START_STEP_MS = 250;
    const PRE_BOOST_MIN_STEP_MS = 150;
    const HIGH_SCORE_STEP_MS = 120;
    const SPEED_UP_SCORE = 20;
    const MAX_SNAKE_LENGTH = 30;
    let snake, dir, nextDir, food, score, gameOver, loop, foodPulse = 0, stepMs = 250, paused = false;
    let previousSnake = [], animationFrame = null, lastStepAt = 0;
    let bonusEarned = false;

    const wrap = document.createElement('div');
    wrap.className = 'cg-snake-wrap';
    wrap.innerHTML = `
      <div class="cg-snake-score">
        <span>🍎</span>
        <span>PUNTOS: <span id="snake-score-val">0</span></span>
        <span>·</span>
        <span>BONUS: <span id="snake-meta">5</span></span>
      </div>
      <canvas class="cg-snake-canvas" id="snake-canvas"
              width="${SIZE * CELL}" height="${SIZE * CELL}"></canvas>

      <div class="cg-snake-controls">
        <button class="coeduca-btn coeduca-btn-success cg-snake-start" id="snake-start">▶ START</button>
        <div class="cg-snake-dpad">
          <span></span>
          <button class="coeduca-btn cg-snake-dir" data-d="up">↑</button>
          <span></span>
          <button class="coeduca-btn cg-snake-dir" data-d="left">←</button>
          <button class="coeduca-btn cg-snake-dir" data-d="down">↓</button>
          <button class="coeduca-btn cg-snake-dir" data-d="right">→</button>
        </div>
      </div>
      <div id="snake-status" class="cg-status"></div>
    `;
    ctx.container.appendChild(wrap);

    makeSoundToggle(wrap);
    const canvas = wrap.querySelector('#snake-canvas');
    const cctx = canvas.getContext('2d');
    const scoreVal = wrap.querySelector('#snake-score-val');
    const statusEl = wrap.querySelector('#snake-status');
    const winThreshold = (ctx.config && ctx.config.winScore) || 5;
    wrap.querySelector('#snake-meta').textContent = winThreshold;
    const leaderboard = global.COEDUCA_LEADERBOARD
      ? global.COEDUCA_LEADERBOARD.create(ctx, 'snake', winThreshold)
      : { submit: () => Promise.resolve(false) };
    const SWIPE_THRESHOLD = 18;
    const touchCapable = 'ontouchstart' in global || (navigator.maxTouchPoints || 0) > 0;
    let touchControlsActive = false;
    let touchStart = null;
    let previousBodyTouchAction = '';
    let previousOverscrollBehavior = '';

    function handleGameTouchStart(event) {
      if (!touchControlsActive) return;
      if (!document.body.contains(wrap)) { unlockTouchControls(); return; }
      const touch = event.touches[0];
      if (!touch) return;
      touchStart = { x: touch.clientX, y: touch.clientY };
      event.preventDefault();
    }

    function handleGameTouchMove(event) {
      if (!touchControlsActive) return;
      event.preventDefault();
      if (!touchStart) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
      setDir(Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up'));
      // Permite encadenar varios giros sin levantar el dedo.
      touchStart = { x: touch.clientX, y: touch.clientY };
    }

    function handleGameTouchEnd(event) {
      if (!touchControlsActive) return;
      event.preventDefault();
      touchStart = null;
    }

    function lockTouchControls() {
      if (!touchCapable || touchControlsActive) return false;
      touchControlsActive = true;
      previousBodyTouchAction = document.body.style.touchAction;
      previousOverscrollBehavior = document.documentElement.style.overscrollBehavior;
      document.body.style.touchAction = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      document.addEventListener('touchstart', handleGameTouchStart, { passive: false, capture: true });
      document.addEventListener('touchmove', handleGameTouchMove, { passive: false, capture: true });
      document.addEventListener('touchend', handleGameTouchEnd, { passive: false, capture: true });
      document.addEventListener('touchcancel', handleGameTouchEnd, { passive: false, capture: true });
      return true;
    }

    function unlockTouchControls() {
      if (!touchControlsActive) return;
      touchControlsActive = false;
      touchStart = null;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overscrollBehavior = previousOverscrollBehavior;
      document.removeEventListener('touchstart', handleGameTouchStart, true);
      document.removeEventListener('touchmove', handleGameTouchMove, true);
      document.removeEventListener('touchend', handleGameTouchEnd, true);
      document.removeEventListener('touchcancel', handleGameTouchEnd, true);
    }

    function reset() {
      snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      previousSnake = snake.map(segment => ({ ...segment }));
      placeFood();
      score = 0;
      stepMs = START_STEP_MS;
      gameOver = false;
      bonusEarned = false;
      scoreVal.textContent = '0';
      statusEl.textContent = '';
      statusEl.className = 'cg-status';
    }

    function placeFood() {
      do {
        food = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
      } while (snake.some(s => s.x === food.x && s.y === food.y));
    }

    function stopSmoothRendering() {
      if (animationFrame !== null) global.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    function renderSmoothFrame(now) {
      if (gameOver || paused) { animationFrame = null; return; }
      foodPulse = (now / 16) % 60;
      const progress = lastStepAt ? Math.min(1, (now - lastStepAt) / stepMs) : 1;
      draw(progress);
      animationFrame = global.requestAnimationFrame(renderSmoothFrame);
    }

    function startSmoothRendering() {
      stopSmoothRendering();
      previousSnake = snake.map(segment => ({ ...segment }));
      lastStepAt = performance.now();
      animationFrame = global.requestAnimationFrame(renderSmoothFrame);
    }

    function step() {
      if (gameOver) return;
      previousSnake = snake.map(segment => ({ ...segment }));
      lastStepAt = performance.now();
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE ||
          snake.some(s => s.x === head.x && s.y === head.y)) {
        SFX.die();
        return end();
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        scoreVal.textContent = score;
        SFX.eat();
        // Acelera gradualmente y recibe un impulso adicional a los 20 puntos.
        stepMs = score >= SPEED_UP_SCORE
          ? HIGH_SCORE_STEP_MS
          : Math.max(PRE_BOOST_MIN_STEP_MS, START_STEP_MS - score * 5);
        clearInterval(loop);
        loop = setInterval(step, stepMs);
        // Pop animado del score
        scoreVal.style.animation = 'cgPopBounce 0.3s';
        setTimeout(() => { scoreVal.style.animation = ''; }, 300);
        if (score >= winThreshold) awardBonus();
        placeFood();
        // Al llegar a 30 segmentos continúa sumando, pero deja de crecer.
        if (snake.length > MAX_SNAKE_LENGTH) snake.pop();
      } else {
        snake.pop();
      }
    }

    function draw(interpolation = 1) {
      // Fondo con grid sutil
      cctx.fillStyle = '#1d3b1f';
      cctx.fillRect(0, 0, canvas.width, canvas.height);
      cctx.strokeStyle = 'rgba(255,255,255,0.04)';
      cctx.lineWidth = 1;
      for (let i = 1; i < SIZE; i++) {
        cctx.beginPath();
        cctx.moveTo(i * CELL, 0); cctx.lineTo(i * CELL, canvas.height); cctx.stroke();
        cctx.beginPath();
        cctx.moveTo(0, i * CELL); cctx.lineTo(canvas.width, i * CELL); cctx.stroke();
      }

      // Comida (manzana con brillo y pulso)
      const fx = food.x * CELL + CELL / 2;
      const fy = food.y * CELL + CELL / 2;
      const pulse = 1 + Math.sin(foodPulse * 0.15) * 0.08;
      const r = (CELL / 2 - 3) * pulse;
      // sombra/glow
      cctx.fillStyle = 'rgba(255, 107, 157, 0.4)';
      cctx.beginPath(); cctx.arc(fx, fy, r + 4, 0, Math.PI * 2); cctx.fill();
      // cuerpo manzana
      const grad = cctx.createRadialGradient(fx - 2, fy - 2, 1, fx, fy, r);
      grad.addColorStop(0, '#FF8FB1');
      grad.addColorStop(1, '#E63946');
      cctx.fillStyle = grad;
      cctx.beginPath(); cctx.arc(fx, fy, r, 0, Math.PI * 2); cctx.fill();
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 2;
      cctx.stroke();
      // hojita
      cctx.fillStyle = '#4CAF50';
      cctx.beginPath();
      cctx.ellipse(fx + 2, fy - r - 1, 3, 5, -0.6, 0, Math.PI * 2);
      cctx.fill();
      cctx.stroke();

      // Serpiente
      snake.forEach((s, i) => {
        const previous = previousSnake[i] || s;
        const x = (previous.x + (s.x - previous.x) * interpolation) * CELL;
        const y = (previous.y + (s.y - previous.y) * interpolation) * CELL;
        const isHead = i === 0;
        const t = i / Math.max(snake.length - 1, 1);
        // Color: cabeza más oscura, cola más clara
        const lightness = isHead ? 35 : 45 + t * 18;
        cctx.fillStyle = `hsl(135, 60%, ${lightness}%)`;
        cctx.strokeStyle = '#1a1a1a';
        cctx.lineWidth = 2;
        // Segmento redondeado
        const pad = isHead ? 1 : 2;
        if (cctx.roundRect) {
          cctx.beginPath();
          cctx.roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, isHead ? 7 : 5);
          cctx.fill(); cctx.stroke();
        } else {
          cctx.fillRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2);
          cctx.strokeRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2);
        }
        // Ojos en la cabeza
        if (isHead) {
          const cx = x + CELL / 2, cy = y + CELL / 2;
          // Posición de ojos según dirección
          const eyeOffsetX = dir.x * 4;
          const eyeOffsetY = dir.y * 4;
          const sideX = Math.abs(dir.y) * 5; // perpendicular
          const sideY = Math.abs(dir.x) * 5;
          cctx.fillStyle = '#fff';
          cctx.beginPath();
          cctx.arc(cx + eyeOffsetX - sideX, cy + eyeOffsetY - sideY, 3, 0, Math.PI * 2);
          cctx.arc(cx + eyeOffsetX + sideX, cy + eyeOffsetY + sideY, 3, 0, Math.PI * 2);
          cctx.fill();
          cctx.fillStyle = '#1a1a1a';
          cctx.beginPath();
          cctx.arc(cx + eyeOffsetX * 1.4 - sideX, cy + eyeOffsetY * 1.4 - sideY, 1.5, 0, Math.PI * 2);
          cctx.arc(cx + eyeOffsetX * 1.4 + sideX, cy + eyeOffsetY * 1.4 + sideY, 1.5, 0, Math.PI * 2);
          cctx.fill();
        }
      });
    }

    function end() {
      gameOver = true; clearInterval(loop);
      stopSmoothRendering();
      draw(1);
      unlockTouchControls();
      snakeStartButton.disabled = false;
      statusEl.textContent = '💥 GAME OVER';
      statusEl.className = 'cg-status is-lose';
      leaderboard.submit(score);
      if (!bonusEarned) ctx.onLose();
    }
    function awardBonus() {
      if (bonusEarned) return;
      bonusEarned = true;
      statusEl.textContent = '🎉 ¡PUNTO EXTRA! Sigue jugando para mejorar tu récord.';
      statusEl.className = 'cg-status is-win';
      SFX.win();
      spawnConfetti(wrap, 35);
      ctx.onWin();
    }

    function setDir(d) {
      if (gameOver) return;
      // Validar contra dirección actual de movimiento (no nextDir) para evitar 180º
      if (d === 'up'    && dir.y !==  1) nextDir = { x:  0, y: -1 };
      if (d === 'down'  && dir.y !== -1) nextDir = { x:  0, y:  1 };
      if (d === 'left'  && dir.x !==  1) nextDir = { x: -1, y:  0 };
      if (d === 'right' && dir.x !== -1) nextDir = { x:  1, y:  0 };
    }

    wrap.querySelectorAll('.cg-snake-dir').forEach(b => {
      b.addEventListener('click', () => setDir(b.dataset.d));
    });
    document.addEventListener('keydown', e => {
      if (gameOver || isTypingTarget(e)) return;
      const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (map[e.key]) { setDir(map[e.key]); e.preventDefault(); }
    });
    // Pausa automatica si la pestana pierde el foco (evita muertes injustas)
    autoPause(wrap,
      () => {
        if (!gameOver && loop) {
          clearInterval(loop); loop = null; paused = true;
          stopSmoothRendering(); draw(1);
        }
      },
      () => {
        if (!paused) return;
        paused = false;
        setTimeout(() => {
          if (gameOver || paused) return;
          clearInterval(loop);
          loop = setInterval(step, stepMs);
          startSmoothRendering();
        }, 600);
      }
    );

    const snakeStartButton = wrap.querySelector('#snake-start');
    snakeStartButton.addEventListener('click', () => {
      stopSmoothRendering();
      reset(); draw();
      snakeStartButton.disabled = true;
      clearInterval(loop);
      loop = setInterval(step, stepMs);
      startSmoothRendering();
      lockTouchControls();
      if (touchControlsActive) {
        statusEl.textContent = '📱 Desliza en cualquier dirección para controlar la serpiente.';
      }
    });
    reset(); draw();
  });

  // =====================================================================
  // 3. DINO RUNNER — física mejorada (salto variable), parallax de fondo,
  //    umbral de bonus, carrera continua y globo sorpresa de +1 punto extra.
  // =====================================================================
  reg('dino', function (ctx) {
    const W = 600, H = 180;
    const GROUND_H = 8;
    const winThreshold = (ctx.config && ctx.config.winScore) || 500;

    // --- Física (tick de 22ms ≈ 45fps) ---
    const TICK_MS = 22;
    const GRAVITY_UP = 0.85;      // subiendo: más flotante
    const GRAVITY_DOWN = 1.5;     // cayendo: más pesado → el salto se siente ágil
    const HOLD_LIFT = 0.12;       // mantener pulsado da un poco más de altura
    const JUMP_VELOCITY = -13;
    const JUMP_CUT_VELOCITY = -5; // al soltar se recorta el salto (saltos cortos)
    const BUFFER_FRAMES = 6;      // si pulsa justo antes de aterrizar, salta al tocar suelo
    const START_SPEED = 5.2;
    const MAX_SPEED = 17;
    const SPEED_GAIN_PER_FRAME = 0.0028;
    const PTS_PER_DIST = 1 / 24;  // puntos mostrados por píxel recorrido
    const GRACE_FRAMES = 50;

    let dino, obstacles, clouds, mountains, hills, vy, onGround, gameOver, loop, speed;
    let frames, sunX, groundOffset, dustParticles, started;
    let distance, finishDist, gate, jumpBuffer, jumpHeld;
    let balloon, balloonSpawned, balloonFx, plusOne;
    let bonusEarned = false;

    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.innerHTML = `
      <div style="text-align:center;">
        <div id="dino-score" style="font-weight:900;margin-bottom:8px;font-size:18px;
             background:var(--coeduca-stroke);color:var(--coeduca-primary);
             display:inline-block;padding:6px 18px;border-radius:50px;letter-spacing:1.5px;
             box-shadow:3px 3px 0 var(--coeduca-stroke);">
          🏃 PUNTOS: <span id="dino-score-val">0</span> &nbsp;·&nbsp; ⭐ BONUS: ${winThreshold}
        </div>
        <div class="cg-progress-bar" style="max-width:${W - 40}px;">
          <div id="dino-progress" class="cg-progress-fill" style="width:0%"></div>
        </div>
        <div style="position:relative;display:inline-block;max-width:100%;">
          <canvas class="cg-dino-canvas" id="dino-canvas" width="${W}" height="${H}"></canvas>
        </div>
        <div style="margin-top:10px;font-size:13px;font-weight:bold;color:var(--coeduca-stroke);">
          Mantén pulsado para saltar alto, suelta pronto para saltos cortos.
          Toca el área de juego o presiona <kbd style="background:#fff;border:2px solid var(--coeduca-stroke);border-radius:4px;padding:1px 6px;font-family:inherit;">ESPACIO</kbd>
          · 🎈 ¡Atrapa el globo para +1 extra!
        </div>
        <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="coeduca-btn coeduca-btn-success" id="dino-start" style="display:inline-flex;align-items:center;gap:6px;">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M320-200v-560l440 280-440 280Z"/></svg>
            <span>START</span>
          </button>
          <button class="coeduca-btn coeduca-btn-accent" id="dino-jump-btn" style="display:inline-flex;align-items:center;gap:6px;">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M360-160v-120H160l320-360 320 360H600v120H360ZM160-480l320-360 320 360H693L480-720 267-480H160Z"/></svg>
            <span>SALTAR</span>
          </button>
        </div>
        <div id="dino-status" class="cg-status"></div>
      </div>
    `;
    ctx.container.appendChild(wrap);
    makeSoundToggle(wrap);

    const canvas = wrap.querySelector('#dino-canvas');
    const cctx = canvas.getContext('2d');
    const scoreVal = wrap.querySelector('#dino-score-val');
    const progressEl = wrap.querySelector('#dino-progress');
    const statusEl = wrap.querySelector('#dino-status');
    const leaderboard = global.COEDUCA_LEADERBOARD
      ? global.COEDUCA_LEADERBOARD.create(ctx, 'dino', winThreshold)
      : { submit: () => Promise.resolve(false) };

    function reset() {
      dino = { x: 50, y: H - 42 - GROUND_H, w: 36, h: 42 };
      obstacles = [];
      clouds = [
        { x: 100, y: 30, w: 44, h: 16 },
        { x: 280, y: 55, w: 56, h: 18 },
        { x: 460, y: 28, w: 38, h: 14 }
      ];
      mountains = [];
      hills = [];
      for (let i = 0; i < 4; i++) {
        mountains.push({ x: i * 190 + Math.random() * 60, w: 150 + Math.random() * 80, h: 45 + Math.random() * 25 });
        hills.push({ x: i * 170 + Math.random() * 50, w: 130 + Math.random() * 70, h: 22 + Math.random() * 14 });
      }
      vy = 0; onGround = true;
      gameOver = false; speed = START_SPEED;
      bonusEarned = false;
      frames = 0;
      sunX = W - 60;
      groundOffset = 0;
      dustParticles = [];
      started = false;
      distance = 0;
      finishDist = winThreshold / PTS_PER_DIST;
      gate = null;
      jumpBuffer = 0; jumpHeld = false;
      balloon = null; balloonSpawned = false; balloonFx = []; plusOne = null;
      scoreVal.textContent = '0';
      progressEl.style.width = '0%';
      statusEl.textContent = '';
      statusEl.className = 'cg-status';
    }

    function displayedScore() {
      return Math.floor(distance * PTS_PER_DIST);
    }

    function spawnDust(n, cx, dirY) {
      for (let i = 0; i < n; i++) {
        dustParticles.push({
          x: cx + (Math.random() - 0.5) * 12,
          y: H - GROUND_H,
          vx: (Math.random() - 0.5) * 2.5,
          vy: dirY * Math.random() * 1.5,
          life: 14 + Math.random() * 8,
          size: 2 + Math.random() * 2
        });
      }
    }

    // El salto se pide (buffer) y se ejecuta en el tick cuando hay suelo:
    // así, pulsar un instante antes de aterrizar también funciona.
    function pressJump() {
      if (gameOver || !started) return;
      jumpHeld = true;
      jumpBuffer = BUFFER_FRAMES;
    }
    function releaseJump() {
      jumpHeld = false;
      if (!onGround && vy < JUMP_CUT_VELOCITY) vy = JUMP_CUT_VELOCITY;
    }

    function spawnObstacle() {
      const r = Math.random();
      if (r < 0.45) {
        obstacles.push({ x: W, y: H - 30 - GROUND_H, w: 16, h: 30, type: 'cactus_s' });
      } else if (r < 0.8) {
        obstacles.push({ x: W, y: H - 44 - GROUND_H, w: 22, h: 44, type: 'cactus_l' });
      } else {
        obstacles.push({ x: W, y: H - 70 - GROUND_H, w: 28, h: 20, type: 'bird', flap: 0 });
      }
    }

    // 🎈 Al tocar el globo: explota, muestra +1 y suma un punto extra real
    // (el core lo limita a una vez por sesión y lo mete en la nota web y PDF).
    function popBalloon(bx, by) {
      balloon = null;
      const colors = ['#FF6B9D', '#FFD700', '#4FC3F7', '#E63946', '#fff'];
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const v = 1.5 + Math.random() * 2;
        balloonFx.push({
          x: bx, y: by,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v - 1,
          life: 22 + Math.random() * 10,
          size: 2 + Math.random() * 2.5,
          color: colors[i % colors.length]
        });
      }
      plusOne = { x: bx, y: by - 6, life: 55 };
      SFX.pop();
      if (C.addBalloonBonus) C.addBalloonBonus();
      if (global.rigo && global.rigo.say) {
        global.rigo.say('¡Atrapaste el globo! +1 punto extra 🎈', 4000);
      }
      spawnConfetti(wrap, 15);
    }

    function step() {
      if (gameOver) return;
      frames++;

      // --- Salto con buffer ---
      if (jumpBuffer > 0) {
        jumpBuffer--;
        if (onGround) {
          vy = JUMP_VELOCITY;
          onGround = false;
          jumpBuffer = 0;
          spawnDust(6, dino.x + dino.w / 2, -1);
          SFX.jump();
        }
      }

      // --- Gravedad asimétrica: flotante al subir, pesada al caer ---
      vy += (vy < 0 ? GRAVITY_UP : GRAVITY_DOWN);
      if (jumpHeld && vy < 0) vy -= HOLD_LIFT;
      dino.y += vy;

      const groundYPos = H - dino.h - GROUND_H;
      if (dino.y >= groundYPos) {
        if (!onGround) spawnDust(4, dino.x + dino.w / 2, -0.6);
        dino.y = groundYPos; vy = 0; onGround = true;
      }

      // Polvo de carrera (continuo)
      if (onGround && frames % 6 === 0) {
        dustParticles.push({
          x: dino.x + 4,
          y: H - GROUND_H,
          vx: -speed * 0.4 - Math.random(),
          vy: -Math.random() * 0.5,
          life: 12,
          size: 2 + Math.random() * 1.5
        });
      }
      dustParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life--; });
      dustParticles = dustParticles.filter(p => p.life > 0);

      // --- Avance y puntaje por distancia recorrida ---
      distance += speed;
      scoreVal.textContent = displayedScore();
      progressEl.style.width = Math.min(100, (distance / finishDist) * 100) + '%';
      if (displayedScore() >= winThreshold) awardBonus();

      // --- Obstáculos ---
      obstacles.forEach(o => {
        o.x -= speed;
        if (o.type === 'bird') o.flap = (o.flap + 1) % 20;
      });
      obstacles = obstacles.filter(o => o.x + o.w > 0);

      // La carrera no termina en la meta: los obstaculos siguen apareciendo.
      if (frames > GRACE_FRAMES) {
        const last = obstacles.length ? obstacles[obstacles.length - 1].x : -Infinity;
        const difficulty = Math.min(1, frames / 3200);
        // Con el tiempo aparecen antes y, al subir la velocidad, hay menos
        // segundos de descanso entre ellos sin crear combinaciones imposibles.
        const gap = 285 - difficulty * 70 + speed * 5;
        const chance = 0.055 + difficulty * 0.045;
        if (W - last >= gap && Math.random() < chance) spawnObstacle();
      }

      // --- Globo de bonus: aparece UNA sola vez, casi al final (80% del
      //     recorrido), a la altura de las aves. El margen de 900px garantiza
      //     que llegue hasta el dino antes de la META aunque la meta sea corta.
      //     Si pasa de largo, ya no vuelve en esta partida. ---
      const balloonAt = Math.max(0, Math.min(finishDist * 0.8, finishDist - 900));
      if (!balloonSpawned && distance >= balloonAt) {
        balloonSpawned = true;
        balloon = { x: W + 30, y: H - GROUND_H - 78, r: 13, bob: Math.random() * 6 };
      }
      if (balloon) {
        balloon.x -= speed;
        balloon.bob += 0.12;
        const by = balloon.y + Math.sin(balloon.bob) * 5;
        // Colisión círculo-rectángulo con el dino
        const nx = Math.max(dino.x, Math.min(balloon.x, dino.x + dino.w));
        const ny = Math.max(dino.y, Math.min(by, dino.y + dino.h));
        const dx = balloon.x - nx, dy = by - ny;
        if (dx * dx + dy * dy <= (balloon.r + 2) * (balloon.r + 2)) {
          popBalloon(balloon.x, by);
        } else if (balloon.x < -30) {
          balloon = null;
        }
      }
      balloonFx.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; });
      balloonFx = balloonFx.filter(p => p.life > 0);
      if (plusOne) {
        plusOne.y -= 0.8;
        plusOne.life--;
        if (plusOne.life <= 0) plusOne = null;
      }

      // --- Parallax: nubes, montañas, lomas, sol, suelo ---
      clouds.forEach(c => {
        c.x -= speed * 0.3;
        if (c.x + c.w < 0) {
          c.x = W + Math.random() * 100;
          c.y = 15 + Math.random() * 50;
          c.w = 36 + Math.random() * 30;
          c.h = 12 + Math.random() * 8;
        }
      });
      mountains.forEach(m => {
        m.x -= speed * 0.12;
        if (m.x + m.w < 0) {
          m.x = W + Math.random() * 80;
          m.w = 150 + Math.random() * 80;
          m.h = 45 + Math.random() * 25;
        }
      });
      hills.forEach(hh => {
        hh.x -= speed * 0.25;
        if (hh.x + hh.w < 0) {
          hh.x = W + Math.random() * 60;
          hh.w = 130 + Math.random() * 70;
          hh.h = 22 + Math.random() * 14;
        }
      });
      sunX -= speed * 0.05;
      if (sunX < -30) sunX = W + 30;
      groundOffset = (groundOffset + speed) % 28;

      // --- Colisión con obstáculos ---
      const pad = 5;
      for (const o of obstacles) {
        if (dino.x + pad < o.x + o.w &&
            dino.x + dino.w - pad > o.x &&
            dino.y + pad < o.y + o.h &&
            dino.y + dino.h - pad > o.y) {
          return end();
        }
      }

      // Aceleración continua: se nota desde los primeros segundos y sigue
      // aumentando hasta una velocidad realmente desafiante.
      speed = Math.min(MAX_SPEED, START_SPEED + frames * SPEED_GAIN_PER_FRAME);

      draw();
    }

    function drawCloud(c) {
      cctx.fillStyle = '#fff';
      cctx.beginPath();
      cctx.ellipse(c.x + c.w * 0.3, c.y, c.w * 0.35, c.h * 0.7, 0, 0, Math.PI * 2);
      cctx.ellipse(c.x + c.w * 0.6, c.y - 3, c.w * 0.32, c.h * 0.8, 0, 0, Math.PI * 2);
      cctx.ellipse(c.x + c.w * 0.85, c.y + 2, c.w * 0.28, c.h * 0.6, 0, 0, Math.PI * 2);
      cctx.fill();
    }

    function drawMountain(m) {
      const baseY = H - GROUND_H;
      cctx.fillStyle = '#AECBDD';
      cctx.beginPath();
      cctx.moveTo(m.x, baseY);
      cctx.lineTo(m.x + m.w / 2, baseY - m.h);
      cctx.lineTo(m.x + m.w, baseY);
      cctx.closePath();
      cctx.fill();
      // Nieve en la cima
      cctx.fillStyle = 'rgba(255,255,255,0.9)';
      cctx.beginPath();
      cctx.moveTo(m.x + m.w / 2, baseY - m.h);
      cctx.lineTo(m.x + m.w / 2 - 12, baseY - m.h + 14);
      cctx.lineTo(m.x + m.w / 2 - 4, baseY - m.h + 10);
      cctx.lineTo(m.x + m.w / 2 + 3, baseY - m.h + 16);
      cctx.lineTo(m.x + m.w / 2 + 12, baseY - m.h + 14);
      cctx.closePath();
      cctx.fill();
    }

    // Arbustos verde amarillento con bayas rojas y zarcillos rizados (curlys)
    function drawHill(hh) {
      const baseY = H - GROUND_H;
      const cx = hh.x + hh.w / 2;

      // Cuerpo del arbusto en dos tonos
      cctx.fillStyle = '#C9D96A';
      cctx.beginPath();
      cctx.ellipse(cx, baseY, hh.w / 2, hh.h, 0, Math.PI, Math.PI * 2);
      cctx.fill();
      cctx.fillStyle = '#DCE799';
      cctx.beginPath();
      cctx.ellipse(cx - hh.w * 0.22, baseY, hh.w * 0.22, hh.h * 0.75, 0, Math.PI, Math.PI * 2);
      cctx.ellipse(cx + hh.w * 0.2, baseY, hh.w * 0.26, hh.h * 0.85, 0, Math.PI, Math.PI * 2);
      cctx.fill();

      // Zarcillos rizados que asoman por arriba
      cctx.strokeStyle = '#A4B84D';
      cctx.lineWidth = 1.5;
      cctx.lineCap = 'round';
      const curls = [[-0.18, 1.0, 1], [0.08, 1.08, -1], [0.3, 0.82, 1]];
      curls.forEach(cd => {
        const px = cx + cd[0] * hh.w;
        const py = baseY - cd[1] * hh.h;
        const dir = cd[2];
        // tallo
        cctx.beginPath();
        cctx.moveTo(px, py + 9);
        cctx.quadraticCurveTo(px - 2 * dir, py + 4, px, py);
        cctx.stroke();
        // rizo en espiral
        cctx.beginPath();
        cctx.arc(px + 2 * dir, py - 2, 3, Math.PI * 0.5, Math.PI * 2.2);
        cctx.stroke();
        cctx.beginPath();
        cctx.arc(px + 2 * dir, py - 2, 1.4, Math.PI * 0.5, Math.PI * 1.8);
        cctx.stroke();
      });
      cctx.lineCap = 'butt';

      // Bayas (posiciones fijas relativas para que no parpadeen)
      const berries = [[-0.3, 0.35], [-0.1, 0.6], [0.15, 0.4], [0.32, 0.5], [0.02, 0.22]];
      cctx.fillStyle = '#E63946';
      berries.forEach(b => {
        cctx.beginPath();
        cctx.arc(cx + b[0] * hh.w, baseY - b[1] * hh.h, 1.7, 0, Math.PI * 2);
        cctx.fill();
      });
      // Brillito de las bayas
      cctx.fillStyle = 'rgba(255,255,255,0.7)';
      berries.forEach(b => {
        cctx.beginPath();
        cctx.arc(cx + b[0] * hh.w - 0.5, baseY - b[1] * hh.h - 0.5, 0.5, 0, Math.PI * 2);
        cctx.fill();
      });
    }

    // Dino cartoon: cresta ARRIBA (cabeza y lomo), panza clara, cola curva,
    // hocico con fosa nasal y ojo grande con brillo.
    function drawDino() {
      cctx.save();
      const x = dino.x, y = dino.y, w = dino.w, h = dino.h;

      // Sombra en el suelo
      cctx.fillStyle = 'rgba(0,0,0,0.2)';
      const shadowScale = onGround ? 1 : Math.max(0.3, 1 - (groundY() - dino.y) / 80);
      cctx.beginPath();
      cctx.ellipse(x + w / 2, H - 6, (w / 2 + 2) * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
      cctx.fill();

      const bodyGrad = cctx.createLinearGradient(x, y, x, y + h);
      bodyGrad.addColorStop(0, '#66BB6A');
      bodyGrad.addColorStop(1, '#388E3C');
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 2.5;

      // Cresta: picos hacia ARRIBA sobre la cabeza y bajando por el lomo
      cctx.fillStyle = '#2E7D32';
      const spikes = [
        [x + 17, y - 1, x + 20, y - 8, x + 24, y - 1],   // sobre la cabeza
        [x + 10, y + 4, x + 13, y - 3, x + 17, y + 4],   // nuca
        [x + 4, y + 12, x + 7, y + 5, x + 11, y + 12],   // lomo alto
        [x - 1, y + 20, x + 2, y + 13, x + 6, y + 20]    // lomo bajo
      ];
      spikes.forEach(s => {
        cctx.beginPath();
        cctx.moveTo(s[0], s[1]);
        cctx.lineTo(s[2], s[3]);
        cctx.lineTo(s[4], s[5]);
        cctx.closePath();
        cctx.fill(); cctx.stroke();
      });

      // Cola curva
      cctx.fillStyle = bodyGrad;
      cctx.beginPath();
      cctx.moveTo(x + 7, y + 18);
      cctx.quadraticCurveTo(x - 7, y + 17, x - 10, y + 27);
      cctx.quadraticCurveTo(x - 3, y + 27, x + 7, y + 31);
      cctx.closePath();
      cctx.fill(); cctx.stroke();

      // Cuerpo
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(x + 3, y + 10, 24, h - 16, 8);
      else cctx.rect(x + 3, y + 10, 24, h - 16);
      cctx.fill(); cctx.stroke();

      // Cabeza con hocico
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(x + 12, y - 2, 24, 16, 6);
      else cctx.rect(x + 12, y - 2, 24, 16);
      cctx.fill(); cctx.stroke();
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(x + 28, y + 4, 12, 10, 4);
      else cctx.rect(x + 28, y + 4, 12, 10);
      cctx.fill(); cctx.stroke();

      // Panza clara (sin borde, es un matiz)
      cctx.fillStyle = '#A5D6A7';
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(x + 8, y + 18, 12, h - 26, 6);
      else cctx.rect(x + 8, y + 18, 12, h - 26);
      cctx.fill();

      // Patas (animadas al correr, recogidas en el aire)
      cctx.fillStyle = '#388E3C';
      const runStep = Math.floor(frames / 5) % 2;
      if (onGround) {
        const off1 = runStep ? 0 : 4;
        const off2 = runStep ? 4 : 0;
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(x + 6, y + h - 8 + off1, 6, 8 - off1, 2);
        else cctx.rect(x + 6, y + h - 8 + off1, 6, 8 - off1);
        cctx.fill(); cctx.stroke();
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(x + 20, y + h - 8 + off2, 6, 8 - off2, 2);
        else cctx.rect(x + 20, y + h - 8 + off2, 6, 8 - off2);
        cctx.fill(); cctx.stroke();
      } else {
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(x + 8, y + h - 6, 7, 6, 2);
        else cctx.rect(x + 8, y + h - 6, 7, 6);
        cctx.fill(); cctx.stroke();
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(x + 20, y + h - 6, 7, 6, 2);
        else cctx.rect(x + 20, y + h - 6, 7, 6);
        cctx.fill(); cctx.stroke();
      }

      // Bracito
      cctx.fillStyle = '#4CAF50';
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(x + 22, y + 18, 8, 5, 2);
      else cctx.rect(x + 22, y + 18, 8, 5);
      cctx.fill(); cctx.stroke();

      // Ojo grande con brillo (parpadea)
      const blink = (frames % 200) < 6;
      if (blink) {
        cctx.strokeStyle = '#1a1a1a';
        cctx.lineWidth = 2;
        cctx.beginPath();
        cctx.moveTo(x + 24, y + 5);
        cctx.lineTo(x + 30, y + 5);
        cctx.stroke();
      } else {
        cctx.fillStyle = '#fff';
        cctx.strokeStyle = '#1a1a1a';
        cctx.lineWidth = 1.5;
        cctx.beginPath();
        cctx.arc(x + 27, y + 5, 4, 0, Math.PI * 2);
        cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#1a1a1a';
        cctx.beginPath();
        cctx.arc(x + 28.5, y + 5, 2, 0, Math.PI * 2);
        cctx.fill();
        cctx.fillStyle = '#fff';
        cctx.beginPath();
        cctx.arc(x + 29.3, y + 4.2, 0.8, 0, Math.PI * 2);
        cctx.fill();
      }

      // Fosa nasal y sonrisa
      cctx.fillStyle = '#1a1a1a';
      cctx.beginPath();
      cctx.arc(x + 37, y + 7.5, 1.1, 0, Math.PI * 2);
      cctx.fill();
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 1.5;
      cctx.beginPath();
      cctx.arc(x + 33, y + 11, 3.5, Math.PI * 0.15, Math.PI * 0.85);
      cctx.stroke();

      cctx.restore();
    }
    function groundY() { return H - dino.h - GROUND_H; }

    // Nopal amable: tronco redondeado, brazos que suben en codo,
    // flor rosada en los grandes y pares de espinitas blancas.
    function drawCactus(o, large) {
      const cx = o.x + o.w / 2;
      const grad = cctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y);
      grad.addColorStop(0, '#4CAF50');
      grad.addColorStop(0.5, '#388E3C');
      grad.addColorStop(1, '#2E7D32');
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 2;
      const armW = 6;

      // Brazo izquierdo: codo horizontal + antebrazo hacia arriba
      cctx.fillStyle = grad;
      const armY = o.y + o.h * 0.45;
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(o.x, armY, cx - o.x, armW, 3);
      else cctx.rect(o.x, armY, cx - o.x, armW);
      cctx.fill(); cctx.stroke();
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(o.x, o.y + o.h * 0.18, armW, armY - (o.y + o.h * 0.18) + armW, 3);
      else cctx.rect(o.x, o.y + o.h * 0.18, armW, armY - (o.y + o.h * 0.18) + armW);
      cctx.fill(); cctx.stroke();

      // Brazo derecho (solo el nopal grande), un poco más alto
      if (large) {
        const armY2 = o.y + o.h * 0.28;
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(cx, armY2, o.x + o.w - cx, armW, 3);
        else cctx.rect(cx, armY2, o.x + o.w - cx, armW);
        cctx.fill(); cctx.stroke();
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(o.x + o.w - armW, o.y + o.h * 0.05, armW, armY2 - (o.y + o.h * 0.05) + armW, 3);
        else cctx.rect(o.x + o.w - armW, o.y + o.h * 0.05, armW, armY2 - (o.y + o.h * 0.05) + armW);
        cctx.fill(); cctx.stroke();
      }

      // Tronco al final (tapa las uniones de los codos)
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(cx - 5, o.y, 10, o.h, 5);
      else cctx.rect(cx - 5, o.y, 10, o.h);
      cctx.fill(); cctx.stroke();

      // Flor rosada en la punta (solo grandes)
      if (large) {
        cctx.fillStyle = '#FF6B9D';
        for (let a = 0; a < 5; a++) {
          const ang = (a * Math.PI * 2) / 5 - Math.PI / 2;
          cctx.beginPath();
          cctx.arc(cx + Math.cos(ang) * 3.4, o.y - 2 + Math.sin(ang) * 3.4, 2.6, 0, Math.PI * 2);
          cctx.fill();
        }
        cctx.fillStyle = '#FFD700';
        cctx.beginPath();
        cctx.arc(cx, o.y - 2, 2.2, 0, Math.PI * 2);
        cctx.fill();
        cctx.strokeStyle = '#1a1a1a';
        cctx.lineWidth = 1;
        cctx.stroke();
        cctx.lineWidth = 2;
      }

      // Espinitas: pares de puntitos blancos alternados
      cctx.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) {
        const sy = o.y + 6 + i * (o.h / 5);
        cctx.fillRect(cx - 3, sy, 2, 2);
        cctx.fillRect(cx + 2, sy + 3, 2, 2);
      }
    }

    // Ave amable mirando hacia la IZQUIERDA (su dirección de vuelo):
    // cabeza y pico al frente, cola de dos plumas atrás, ala que aletea.
    function drawBird(o) {
      cctx.save();
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      const up = o.flap < 10;
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 2;

      // Cola (dos plumas, atrás = derecha)
      cctx.fillStyle = '#E4568A';
      cctx.beginPath();
      cctx.moveTo(o.x + o.w - 6, cy);
      cctx.lineTo(o.x + o.w + 7, cy - 6);
      cctx.lineTo(o.x + o.w + 3, cy);
      cctx.lineTo(o.x + o.w + 7, cy + 5);
      cctx.closePath();
      cctx.fill(); cctx.stroke();

      // Cuerpo
      const grad = cctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
      grad.addColorStop(0, '#FF8FB1');
      grad.addColorStop(1, '#FF6B9D');
      cctx.fillStyle = grad;
      cctx.beginPath();
      cctx.ellipse(cx + 2, cy, o.w / 2 - 4, o.h / 2 - 1, 0.15, 0, Math.PI * 2);
      cctx.fill(); cctx.stroke();

      // Cabeza (al frente = izquierda)
      cctx.beginPath();
      cctx.arc(o.x + 6, o.y + 5, 6.5, 0, Math.PI * 2);
      cctx.fill(); cctx.stroke();

      // Pico dorado apuntando a la izquierda
      cctx.fillStyle = '#FFD700';
      cctx.beginPath();
      cctx.moveTo(o.x, o.y + 3);
      cctx.lineTo(o.x - 7, o.y + 5);
      cctx.lineTo(o.x, o.y + 7);
      cctx.closePath();
      cctx.fill(); cctx.stroke();

      // Ala curva (aletea)
      cctx.fillStyle = '#E4568A';
      cctx.beginPath();
      if (up) {
        cctx.moveTo(cx + 5, cy - 2);
        cctx.quadraticCurveTo(cx + 3, cy - 16, cx - 8, cy - 12);
        cctx.quadraticCurveTo(cx - 4, cy - 4, cx + 5, cy - 2);
      } else {
        cctx.moveTo(cx + 5, cy);
        cctx.quadraticCurveTo(cx + 3, cy + 13, cx - 8, cy + 9);
        cctx.quadraticCurveTo(cx - 4, cy + 2, cx + 5, cy);
      }
      cctx.closePath();
      cctx.fill(); cctx.stroke();

      // Ojo con brillo (mirando al frente)
      cctx.fillStyle = '#fff';
      cctx.beginPath();
      cctx.arc(o.x + 5, o.y + 4, 2.6, 0, Math.PI * 2);
      cctx.fill();
      cctx.fillStyle = '#1a1a1a';
      cctx.beginPath();
      cctx.arc(o.x + 4.4, o.y + 4.2, 1.3, 0, Math.PI * 2);
      cctx.fill();
      cctx.fillStyle = '#fff';
      cctx.beginPath();
      cctx.arc(o.x + 4, o.y + 3.6, 0.5, 0, Math.PI * 2);
      cctx.fill();
      cctx.restore();
    }

    // Globo rojo con brillo, nudo y cuerda ondulada; bobea suavemente.
    function drawBalloon(b) {
      const by = b.y + Math.sin(b.bob) * 5;
      cctx.save();
      // Cuerda
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 1.5;
      cctx.beginPath();
      cctx.moveTo(b.x, by + b.r + 4);
      cctx.quadraticCurveTo(b.x + 4, by + b.r + 14, b.x - 2, by + b.r + 24);
      cctx.stroke();
      // Globo
      const grad = cctx.createRadialGradient(b.x - 4, by - 5, 2, b.x, by, b.r + 2);
      grad.addColorStop(0, '#FF8FB1');
      grad.addColorStop(1, '#E63946');
      cctx.fillStyle = grad;
      cctx.lineWidth = 2;
      cctx.beginPath();
      cctx.ellipse(b.x, by, b.r - 1, b.r + 1, 0, 0, Math.PI * 2);
      cctx.fill(); cctx.stroke();
      // Nudo
      cctx.fillStyle = '#E63946';
      cctx.beginPath();
      cctx.moveTo(b.x - 3, by + b.r);
      cctx.lineTo(b.x + 3, by + b.r);
      cctx.lineTo(b.x, by + b.r + 4);
      cctx.closePath();
      cctx.fill(); cctx.stroke();
      // Brillo
      cctx.fillStyle = 'rgba(255,255,255,0.75)';
      cctx.beginPath();
      cctx.ellipse(b.x - 4, by - 5, 3, 4.5, -0.5, 0, Math.PI * 2);
      cctx.fill();
      // Etiqueta +1
      cctx.fillStyle = '#fff';
      cctx.font = 'bold 10px Comic Sans MS, system-ui';
      cctx.textAlign = 'center';
      cctx.fillText('+1', b.x, by + 4);
      cctx.restore();
    }

    // La META: dos postes con franjas, pancarta a cuadros con cartel "META"
    // y línea de meta a cuadros pintada en el suelo.
    function drawGate(g) {
      const gx = g.x;
      const poleW = 6, span = 64;
      const poleTop = 12, poleH = H - GROUND_H - poleTop;

      // Línea de meta en el suelo (banda a cuadros)
      const gsq = 4;
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < 4; k++) {
          cctx.fillStyle = ((r + k) % 2 === 0) ? '#1a1a1a' : '#fff';
          cctx.fillRect(gx + span / 2 - 5 + k * gsq, H - GROUND_H + r * gsq, gsq, gsq);
        }
      }

      // Postes con franjas rojas
      [gx, gx + span].forEach(px => {
        cctx.fillStyle = '#fff';
        cctx.strokeStyle = '#1a1a1a';
        cctx.lineWidth = 2;
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(px, poleTop, poleW, poleH, 2);
        else cctx.rect(px, poleTop, poleW, poleH);
        cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#E63946';
        for (let yy = poleTop + 4; yy < poleTop + poleH - 6; yy += 16) {
          cctx.fillRect(px + 1, yy, poleW - 2, 8);
        }
      });

      // Pancarta a cuadros
      const bx = gx - 4, by = poleTop - 2, bw = span + poleW + 8, bh = 20;
      cctx.fillStyle = '#fff';
      cctx.fillRect(bx, by, bw, bh);
      cctx.fillStyle = '#1a1a1a';
      const sq = 5;
      for (let r = 0; r < 4; r++) {
        for (let k = 0; k < Math.ceil(bw / sq); k++) {
          if ((r + k) % 2 === 0) {
            cctx.fillRect(bx + k * sq, by + r * sq, Math.min(sq, bx + bw - (bx + k * sq)), sq);
          }
        }
      }
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 2.5;
      cctx.strokeRect(bx, by, bw, bh);

      // Cartel "META"
      cctx.fillStyle = '#FFD700';
      cctx.fillRect(bx + bw / 2 - 24, by + bh - 8, 48, 16);
      cctx.strokeRect(bx + bw / 2 - 24, by + bh - 8, 48, 16);
      cctx.fillStyle = '#1a1a1a';
      cctx.font = 'bold 11px Comic Sans MS, system-ui';
      cctx.textAlign = 'center';
      cctx.fillText('META', bx + bw / 2, by + bh + 4);
    }

    function draw() {
      // Cielo gradiente
      const sky = cctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#87CEEB');
      sky.addColorStop(0.6, '#B3E5FC');
      sky.addColorStop(1, '#FFE4B5');
      cctx.fillStyle = sky;
      cctx.fillRect(0, 0, W, H);

      // Sol: halo, rayos giratorios y carita feliz con cachetes
      const haloGrad = cctx.createRadialGradient(sunX, 35, 18, sunX, 35, 42);
      haloGrad.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
      haloGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      cctx.fillStyle = haloGrad;
      cctx.fillRect(sunX - 42, -7, 84, 84);
      // Rayos
      cctx.save();
      cctx.translate(sunX, 35);
      cctx.rotate((frames * 0.004) % (Math.PI * 2));
      cctx.fillStyle = '#FFD700';
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        cctx.rotate(Math.PI / 4);
        cctx.beginPath();
        cctx.moveTo(21, -4);
        cctx.lineTo(29, 0);
        cctx.lineTo(21, 4);
        cctx.closePath();
        cctx.fill(); cctx.stroke();
      }
      cctx.restore();
      // Disco
      cctx.fillStyle = '#FFD700';
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 2;
      cctx.beginPath();
      cctx.arc(sunX, 35, 18, 0, Math.PI * 2);
      cctx.fill(); cctx.stroke();
      // Ojos felices (arcos ∩)
      cctx.lineWidth = 2;
      cctx.lineCap = 'round';
      cctx.beginPath();
      cctx.arc(sunX - 6, 33, 3, Math.PI * 1.1, Math.PI * 1.9);
      cctx.stroke();
      cctx.beginPath();
      cctx.arc(sunX + 6, 33, 3, Math.PI * 1.1, Math.PI * 1.9);
      cctx.stroke();
      // Cachetes
      cctx.fillStyle = 'rgba(255, 107, 157, 0.45)';
      cctx.beginPath();
      cctx.arc(sunX - 9, 39, 2.8, 0, Math.PI * 2);
      cctx.arc(sunX + 9, 39, 2.8, 0, Math.PI * 2);
      cctx.fill();
      // Sonrisa
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 2;
      cctx.beginPath();
      cctx.arc(sunX, 38, 6, Math.PI * 0.15, Math.PI * 0.85);
      cctx.stroke();
      cctx.lineCap = 'butt';

      // Parallax lejano: montañas y lomas
      mountains.forEach(drawMountain);
      hills.forEach(drawHill);

      // Nubes
      clouds.forEach(drawCloud);

      // Suelo
      cctx.fillStyle = '#D2B48C';
      cctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      cctx.strokeStyle = '#1a1a1a';
      cctx.lineWidth = 3;
      cctx.beginPath();
      cctx.moveTo(0, H - GROUND_H);
      cctx.lineTo(W, H - GROUND_H);
      cctx.stroke();

      // Piedras/marcas (parallax)
      cctx.fillStyle = '#8B6F47';
      for (let i = -1; i < W / 28 + 1; i++) {
        const gx = i * 28 - groundOffset;
        cctx.fillRect(gx + 4, H - 4, 7, 2);
        cctx.fillRect(gx + 18, H - 5, 4, 2);
      }

      // Polvo
      dustParticles.forEach(p => {
        const alpha = p.life / 20;
        cctx.fillStyle = `rgba(180, 150, 110, ${alpha})`;
        cctx.beginPath();
        cctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        cctx.fill();
      });

      // Obstáculos
      obstacles.forEach(o => {
        if (o.type === 'bird') drawBird(o);
        else drawCactus(o, o.type === 'cactus_l');
      });

      // Globo de bonus
      if (balloon) drawBalloon(balloon);

      // META (detrás del dino para que el dino la cruce por delante)
      if (gate) drawGate(gate);

      // Dino
      drawDino();

      // Partículas de la explosión del globo
      balloonFx.forEach(p => {
        cctx.globalAlpha = Math.max(0, p.life / 26);
        cctx.fillStyle = p.color;
        cctx.beginPath();
        cctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        cctx.fill();
      });
      cctx.globalAlpha = 1;

      // "+1" flotante al explotar el globo
      if (plusOne) {
        cctx.save();
        cctx.globalAlpha = Math.min(1, plusOne.life / 20);
        cctx.font = 'bold 22px Comic Sans MS, system-ui';
        cctx.textAlign = 'center';
        cctx.strokeStyle = '#1a1a1a';
        cctx.lineWidth = 4;
        cctx.strokeText('+1', plusOne.x, plusOne.y);
        cctx.fillStyle = '#FFD700';
        cctx.fillText('+1', plusOne.x, plusOne.y);
        cctx.restore();
      }

      // Indicador inicial
      if (started && frames < GRACE_FRAMES && frames > 0) {
        const remaining = Math.ceil((GRACE_FRAMES - frames) / 28);
        cctx.fillStyle = 'rgba(26,26,26,0.85)';
        cctx.fillRect(W / 2 - 80, H / 2 - 22, 160, 38);
        cctx.strokeStyle = '#FFD700';
        cctx.lineWidth = 3;
        cctx.strokeRect(W / 2 - 80, H / 2 - 22, 160, 38);
        cctx.fillStyle = '#FFD700';
        cctx.font = 'bold 22px Comic Sans MS, system-ui';
        cctx.textAlign = 'center';
        cctx.fillText('LISTO... ' + remaining, W / 2, H / 2 + 4);
      }
      // Mensaje "Presiona Start"
      if (!started) {
        cctx.fillStyle = 'rgba(26,26,26,0.85)';
        cctx.fillRect(W / 2 - 110, H / 2 - 22, 220, 38);
        cctx.strokeStyle = '#FFD700';
        cctx.lineWidth = 3;
        cctx.strokeRect(W / 2 - 110, H / 2 - 22, 220, 38);
        cctx.fillStyle = '#FFD700';
        cctx.font = 'bold 18px Comic Sans MS, system-ui';
        cctx.textAlign = 'center';
        cctx.fillText('▶ PRESIONA START', W / 2, H / 2 + 4);
      }
    }

    function end() {
      gameOver = true; clearInterval(loop);
      dinoStartButton.disabled = false;
      SFX.die();
      statusEl.textContent = '💥 GAME OVER';
      statusEl.className = 'cg-status is-lose';
      leaderboard.submit(displayedScore());
      if (!bonusEarned) ctx.onLose();
    }
    function awardBonus() {
      if (bonusEarned) return;
      bonusEarned = true;
      SFX.win();
      statusEl.textContent = '🏁 ¡PUNTO EXTRA! Sigue corriendo para mejorar tu récord.';
      statusEl.className = 'cg-status is-win';
      spawnConfetti(wrap, 50);
      ctx.onWin();
    }

    // Pausa automática si la pestaña pierde el foco (evita muertes injustas)
    let paused = false;
    function drawOverlayBox(text) {
      cctx.fillStyle = 'rgba(26,26,26,0.85)';
      cctx.fillRect(W / 2 - 90, H / 2 - 22, 180, 38);
      cctx.strokeStyle = '#FFD700';
      cctx.lineWidth = 3;
      cctx.strokeRect(W / 2 - 90, H / 2 - 22, 180, 38);
      cctx.fillStyle = '#FFD700';
      cctx.font = 'bold 20px Comic Sans MS, system-ui';
      cctx.textAlign = 'center';
      cctx.fillText(text, W / 2, H / 2 + 4);
    }
    autoPause(wrap,
      () => {
        if (started && !gameOver && loop) {
          clearInterval(loop); loop = null;
          paused = true; jumpHeld = false;
          drawOverlayBox('⏸ PAUSA');
        }
      },
      () => {
        if (!paused) return;
        paused = false;
        draw();
        drawOverlayBox('LISTO...');
        setTimeout(() => {
          if (gameOver || !started || paused) return;
          clearInterval(loop);
          loop = setInterval(step, TICK_MS);
        }, 900);
      }
    );

    canvas.addEventListener('mousedown', e => { pressJump(); e.preventDefault(); });
    canvas.addEventListener('mouseup', releaseJump);
    canvas.addEventListener('mouseleave', releaseJump);
    canvas.addEventListener('touchstart', e => { pressJump(); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchend', releaseJump);
    canvas.addEventListener('touchcancel', releaseJump);
    document.addEventListener('keydown', e => {
      if (isTypingTarget(e)) return;
      if (e.code === 'Space' && started && !gameOver) {
        if (!e.repeat) pressJump();
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'Space') releaseJump();
    });
    const jumpBtn = wrap.querySelector('#dino-jump-btn');
    jumpBtn.addEventListener('mousedown', pressJump);
    jumpBtn.addEventListener('mouseup', releaseJump);
    jumpBtn.addEventListener('mouseleave', releaseJump);
    jumpBtn.addEventListener('touchstart', e => { pressJump(); e.preventDefault(); }, { passive: false });
    jumpBtn.addEventListener('touchend', releaseJump);
    const dinoStartButton = wrap.querySelector('#dino-start');
    dinoStartButton.addEventListener('click', () => {
      reset(); started = true; draw();
      dinoStartButton.disabled = true;
      clearInterval(loop);
      loop = setInterval(step, TICK_MS);
    });
    reset(); draw();
  });

  // =====================================================================
  // 4. HANGMAN — horca colorida, teclado QWERTY, vidas con corazones
  // =====================================================================
  reg('hangman', function (ctx) {
    // Estilos del rediseño del ahorcado (tiles de letras, teclas grandes).
    // Framework-agnóstico: cubre los prefijos cg- (coeduca) y cv- (civica).
    if (!document.getElementById('coeduca-hm2-styles')) {
      const st = document.createElement('style');
      st.id = 'coeduca-hm2-styles';
      st.textContent = `
        @keyframes hm2Pop {
          0%   { transform: scale(0.3); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        .cg-hm-word, .cv-hm-word {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 4px 0 !important;
          min-width: 0 !important;
          letter-spacing: 0 !important;
          font-family: inherit !important;
          display: inline-flex !important;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .hm2-tile {
          width: 34px; height: 42px;
          display: inline-flex; align-items: center; justify-content: center;
          background: #fff;
          border: 3px solid #1a1a1a;
          border-radius: 8px;
          box-shadow: 2px 2px 0 #1a1a1a;
          font-size: 22px; font-weight: 900;
          color: #1a1a1a;
        }
        .hm2-hidden {
          background: #FFF3CD;
          border-style: dashed;
          color: rgba(26,26,26,0.2);
          box-shadow: inset 2px 2px 4px rgba(0,0,0,0.08);
        }
        .hm2-revealed { color: #2E7D32; animation: hm2Pop 0.35s; }
        .hm2-missed {
          background: #FFEBEE; color: #E63946; border-color: #E63946;
          animation: hm2Pop 0.35s;
        }
        .cg-hm-key, .cv-hm-key {
          min-width: 38px !important;
          height: 44px !important;
          font-size: 16px !important;
          border-radius: 10px !important;
        }
        .hm2-powerups {
          display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;
          margin: 8px 0 12px;
        }
        .hm2-powerup {
          min-height: 42px; padding: 7px 12px;
          display: inline-flex; align-items: center; gap: 6px;
          border: 3px solid #1a1a1a; border-radius: 12px;
          background: #fff; color: #1a1a1a;
          box-shadow: 3px 3px 0 #1a1a1a;
          font-family: inherit; font-size: 13px; font-weight: 800; line-height: 1.1;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .hm2-powerup:not(:disabled):active {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0 #1a1a1a;
        }
        .hm2-powerup:disabled { cursor: not-allowed; opacity: 0.42; }
        .hm2-powerup.is-used { text-decoration: line-through; filter: grayscale(1); }
        .hm2-powerup-icon { font-size: 19px; text-decoration: none; }
        .hm2-key-eliminated {
          opacity: 0.38 !important;
          background: #e9ecef !important;
          color: #6c757d !important;
        }
        @media (max-width: 480px) {
          .cg-hm-key, .cv-hm-key { min-width: 31px !important; height: 42px !important; }
          .hm2-tile { width: 28px; height: 36px; font-size: 18px; }
          .hm2-powerup { padding: 7px 9px; font-size: 12px; }
        }
      `;
      document.head.appendChild(st);
    }

    function shuffleInPlace(items) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    }

    const configuredWords = (ctx.config && ctx.config.words) || [];
    const sourceWords = configuredWords.length ? configuredWords : ['CASA', 'ESCUELA', 'APRENDER'];
    const words = Array.from(new Set(
      sourceWords.map(item => String(item).trim().toUpperCase()).filter(Boolean)
    ));
    shuffleInPlace(words);
    const thematicWords = new Set(words.map(item => String(item).toUpperCase()));
    const fallbackWords = Array.isArray(global.COEDUCA_HANGMAN_WORDS)
      ? global.COEDUCA_HANGMAN_WORDS.filter(item => !thematicWords.has(String(item).toUpperCase()))
      : [];
    const winThreshold = (ctx.config && ctx.config.winScore) || 3;
    const RANKING_MIN_SCORE = 3;
    let word, guessed, mistakes, gameOver, score, bonusEarned, wordIndex, powerups;
    let fallbackDeck, fallbackIndex, previousFallbackWord;
    const MAX = 6;

    function shuffleFallbackDeck() {
      fallbackDeck = fallbackWords.slice();
      for (let i = fallbackDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fallbackDeck[i], fallbackDeck[j]] = [fallbackDeck[j], fallbackDeck[i]];
      }
      // Evita repetir justo en la unión entre dos vueltas completas al banco.
      if (fallbackDeck.length > 1 && fallbackDeck[0] === previousFallbackWord) {
        [fallbackDeck[0], fallbackDeck[1]] = [fallbackDeck[1], fallbackDeck[0]];
      }
      fallbackIndex = 0;
    }

    function nextFallbackWord() {
      if (!fallbackWords.length) {
        const repeated = String(words[wordIndex % words.length]);
        wordIndex++;
        return repeated;
      }
      if (!fallbackDeck.length || fallbackIndex >= fallbackDeck.length) shuffleFallbackDeck();
      const next = fallbackDeck[fallbackIndex++];
      previousFallbackWord = next;
      return next;
    }

    // Normaliza letras para comparar: quita acentos (Á -> A) pero conserva la Ñ.
    function normLetter(ch) {
      const up = ch.toUpperCase();
      if (up === 'Ñ') return 'Ñ';
      return up.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    const wrap = document.createElement('div');
    wrap.className = 'cg-hm-wrap';
    wrap.style.position = 'relative';
    wrap.innerHTML = `
      <div class="cg-snake-score" style="margin-bottom:12px;">
        <span>🔤</span>
        <span>PALABRAS: <span id="hm-score">0</span></span>
        <span>·</span>
        <span>BONUS: ${winThreshold}</span>
      </div>
      <svg id="hm-svg" class="cg-hm-stage" viewBox="0 0 240 240"></svg>
      <div id="hm-hearts" class="cg-hm-hearts"></div>
      <div id="hm-powerups" class="hm2-powerups" aria-label="Comodines">
        <button type="button" class="hm2-powerup" data-power="life" title="Recupera una vida perdida">
          <span class="hm2-powerup-icon">❤️</span><span>Vida extra</span>
        </button>
        <button type="button" class="hm2-powerup" data-power="reveal" title="Revela una letra correcta">
          <span class="hm2-powerup-icon">💡</span><span>Revelar letra</span>
        </button>
        <button type="button" class="hm2-powerup" data-power="remove" title="Descarta tres letras incorrectas">
          <span class="hm2-powerup-icon">✨</span><span>Descartar 3</span>
        </button>
      </div>
      <div id="hm-word" class="cg-hm-word"></div>
      <div id="hm-keys" class="cg-hm-keys"></div>
      <div id="hm-status" class="cg-status"></div>
      <button class="coeduca-btn coeduca-btn-success" id="hm-reset" style="margin-top:10px;">🔄 Reiniciar partida</button>
    `;
    ctx.container.appendChild(wrap);

    makeSoundToggle(wrap);
    const svg = wrap.querySelector('#hm-svg');
    const heartsEl = wrap.querySelector('#hm-hearts');
    const powerupsEl = wrap.querySelector('#hm-powerups');
    const wordEl = wrap.querySelector('#hm-word');
    const keysEl = wrap.querySelector('#hm-keys');
    const statusEl = wrap.querySelector('#hm-status');
    const scoreEl = wrap.querySelector('#hm-score');
    const leaderboard = global.COEDUCA_LEADERBOARD
      ? global.COEDUCA_LEADERBOARD.create(ctx, 'hangman', RANKING_MIN_SCORE)
      : { submit: () => Promise.resolve(false) };

    function updatePowerups() {
      powerupsEl.querySelectorAll('[data-power]').forEach(btn => {
        const type = btn.dataset.power;
        const used = Boolean(powerups && powerups[type]);
        btn.classList.toggle('is-used', used);
        btn.disabled = gameOver || used || (type === 'life' && mistakes === 0);
      });
    }

    function drawHangman() {
      // Escena alegre + muñeco que se revela con cada error.
      // La carita se va preocupando: 1 feliz -> 2-3 nervioso -> 4-5 triste -> 6 KO.
      const mood = mistakes >= 6 ? 'ko' : mistakes >= 4 ? 'sad' : mistakes >= 2 ? 'worried' : 'ok';
      let face;
      if (mood === 'ok') {
        face = `<circle cx="154" cy="74" r="2.2" fill="#1a1a1a"/>
          <circle cx="166" cy="74" r="2.2" fill="#1a1a1a"/>
          <path d="M152 83 Q160 89 168 83" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>`;
      } else if (mood === 'worried') {
        face = `<circle cx="154" cy="74" r="2.2" fill="#1a1a1a"/>
          <circle cx="166" cy="74" r="2.2" fill="#1a1a1a"/>
          <line x1="154" y1="85" x2="166" y2="85" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
          <path d="M148 68 Q151 66 154 68" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>
          <path d="M166 68 Q169 66 172 68" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>`;
      } else if (mood === 'sad') {
        face = `<circle cx="154" cy="75" r="2.2" fill="#1a1a1a"/>
          <circle cx="166" cy="75" r="2.2" fill="#1a1a1a"/>
          <path d="M152 87 Q160 81 168 87" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
          <line x1="148" y1="69" x2="156" y2="71" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="172" y1="69" x2="164" y2="71" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>`;
      } else {
        face = `<path d="M151 71 L157 77 M157 71 L151 77" stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M163 71 L169 77 M169 71 L163 77" stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round"/>
          <ellipse cx="160" cy="86" rx="3.5" ry="2.5" fill="#1a1a1a"/>`;
      }

      const head = mistakes >= 1 ? `
        <circle cx="160" cy="76" r="16" fill="#FFE0B2" stroke="#1a1a1a" stroke-width="3" style="animation: hm2Pop 0.4s;"/>
        <path d="M146 68 Q149 58 160 60 Q171 58 174 68 Q167 63 160 64 Q153 63 146 68 Z"
              fill="#6D4C41" stroke="#1a1a1a" stroke-width="2"/>
        ${face}` : '';
      const body = mistakes >= 2 ? `
        <rect x="149" y="91" width="22" height="36" rx="9" fill="#4FC3F7" stroke="#1a1a1a" stroke-width="3" style="animation: hm2Pop 0.3s;"/>
        <line x1="160" y1="98" x2="160" y2="120" stroke="#0288D1" stroke-width="1.5"/>` : '';
      const armL = mistakes >= 3 ? `
        <line x1="152" y1="100" x2="134" y2="116" stroke="#FFE0B2" stroke-width="5" stroke-linecap="round" style="animation: hm2Pop 0.3s;"/>
        <circle cx="133" cy="117" r="3.5" fill="#FFE0B2" stroke="#1a1a1a" stroke-width="1.5"/>` : '';
      const armR = mistakes >= 4 ? `
        <line x1="168" y1="100" x2="186" y2="116" stroke="#FFE0B2" stroke-width="5" stroke-linecap="round" style="animation: hm2Pop 0.3s;"/>
        <circle cx="187" cy="117" r="3.5" fill="#FFE0B2" stroke="#1a1a1a" stroke-width="1.5"/>` : '';
      const legL = mistakes >= 5 ? `
        <line x1="155" y1="126" x2="146" y2="152" stroke="#1976D2" stroke-width="6" stroke-linecap="round" style="animation: hm2Pop 0.3s;"/>
        <ellipse cx="143" cy="155" rx="6" ry="3.5" fill="#E63946" stroke="#1a1a1a" stroke-width="1.5"/>` : '';
      const legR = mistakes >= 6 ? `
        <line x1="165" y1="126" x2="174" y2="152" stroke="#1976D2" stroke-width="6" stroke-linecap="round" style="animation: hm2Pop 0.3s;"/>
        <ellipse cx="177" cy="155" rx="6" ry="3.5" fill="#E63946" stroke="#1a1a1a" stroke-width="1.5"/>` : '';
      const rope = mistakes >= 1 ? `
        <line x1="160" y1="40" x2="160" y2="60" stroke="#8B4513" stroke-width="3"/>
        <line x1="157" y1="45" x2="163" y2="43" stroke="#5D4037" stroke-width="1.5"/>
        <line x1="157" y1="51" x2="163" y2="49" stroke="#5D4037" stroke-width="1.5"/>` : '';

      svg.innerHTML = `
        <!-- Sol sonriente -->
        <circle cx="40" cy="40" r="13" fill="#FFD700" stroke="#1a1a1a" stroke-width="2.5"/>
        <line x1="40" y1="20" x2="40" y2="26" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="40" y1="54" x2="40" y2="60" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="20" y1="40" x2="26" y2="40" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="54" y1="40" x2="60" y2="40" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="26" y1="26" x2="30" y2="30" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="50" y1="50" x2="54" y2="54" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="54" y1="26" x2="50" y2="30" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="30" y1="50" x2="26" y2="54" stroke="#E6A800" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="36" cy="38" r="1.6" fill="#1a1a1a"/>
        <circle cx="44" cy="38" r="1.6" fill="#1a1a1a"/>
        <path d="M35 43 Q40 47 45 43" fill="none" stroke="#1a1a1a" stroke-width="1.6" stroke-linecap="round"/>

        <!-- Nubes -->
        <ellipse cx="205" cy="30" rx="17" ry="8" fill="#fff"/>
        <ellipse cx="193" cy="34" rx="12" ry="6" fill="#fff"/>
        <ellipse cx="120" cy="18" rx="14" ry="6" fill="#fff"/>

        <!-- Mariposa -->
        <ellipse cx="215" cy="120" rx="4" ry="6" fill="#FF6B9D" transform="rotate(-25 215 120)"/>
        <ellipse cx="223" cy="120" rx="4" ry="6" fill="#FFD700" transform="rotate(25 223 120)"/>
        <line x1="219" y1="112" x2="219" y2="128" stroke="#1a1a1a" stroke-width="1.5"/>

        <!-- Pasto con matitas -->
        <rect x="0" y="210" width="240" height="30" fill="#7CB342"/>
        <path d="M0 210 Q60 205 120 210 T240 210 L240 240 L0 240 Z" fill="#558B2F"/>
        <path d="M20 210 l3 -7 l3 7 M55 212 l3 -7 l3 7 M148 212 l3 -7 l3 7 M215 211 l3 -7 l3 7"
              fill="none" stroke="#33691E" stroke-width="1.5" stroke-linecap="round"/>

        <!-- Flores -->
        <line x1="30" y1="222" x2="30" y2="212" stroke="#33691E" stroke-width="1.5"/>
        <circle cx="27" cy="210" r="2.5" fill="#FF6B9D"/><circle cx="33" cy="210" r="2.5" fill="#FF6B9D"/>
        <circle cx="30" cy="207" r="2.5" fill="#FF6B9D"/><circle cx="30" cy="210" r="2" fill="#FFD700"/>
        <line x1="200" y1="224" x2="200" y2="214" stroke="#33691E" stroke-width="1.5"/>
        <circle cx="197" cy="212" r="2.5" fill="#9B5DE5"/><circle cx="203" cy="212" r="2.5" fill="#9B5DE5"/>
        <circle cx="200" cy="209" r="2.5" fill="#9B5DE5"/><circle cx="200" cy="212" r="2" fill="#FFD700"/>

        <!-- Horca de madera con tornillos -->
        <rect x="40" y="204" width="100" height="9" rx="3" fill="#8B4513" stroke="#1a1a1a" stroke-width="2.5"/>
        <rect x="78" y="28" width="11" height="180" rx="3" fill="#A0522D" stroke="#1a1a1a" stroke-width="2.5"/>
        <rect x="78" y="28" width="94" height="11" rx="3" fill="#A0522D" stroke="#1a1a1a" stroke-width="2.5"/>
        <line x1="89" y1="52" x2="112" y2="39" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="83" cy="33" r="1.5" fill="#1a1a1a"/>
        <circle cx="166" cy="33" r="1.5" fill="#1a1a1a"/>
        <circle cx="83" cy="203" r="1.5" fill="#1a1a1a"/>

        ${rope}
        ${head}
        ${body}
        ${armL}
        ${armR}
        ${legL}
        ${legR}
      `;
    }

    function renderHearts() {
      const remaining = MAX - mistakes;
      let html = '';
      for (let i = 0; i < MAX; i++) {
        if (i < remaining) {
          const activeCls = (i === remaining - 1 && remaining <= 2) ? ' heart-active' : '';
          html += `<span class="${activeCls}">❤️</span>`;
        } else {
          html += `<span class="heart-lost">🖤</span>`;
        }
      }
      heartsEl.innerHTML = html;
    }

    function renderWord(revealAll) {
      wordEl.innerHTML = word.split('').map(c => {
        if (guessed.has(normLetter(c))) return `<span class="hm2-tile hm2-revealed">${c}</span>`;
        if (revealAll) return `<span class="hm2-tile hm2-missed">${c}</span>`;
        return `<span class="hm2-tile hm2-hidden">•</span>`;
      }).join('');
    }

    function buildKeys() {
      const rows = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];
      keysEl.innerHTML = rows.map(row => {
        const keys = row.split('').map(letter =>
          `<button class="cg-hm-key" data-letter="${letter}">${letter}</button>`
        ).join('');
        return `<div class="cg-hm-keys-row">${keys}</div>`;
      }).join('');
      keysEl.querySelectorAll('.cg-hm-key').forEach(btn => {
        btn.addEventListener('click', () => guess(btn.dataset.letter, btn));
      });
    }

    function startWord() {
      if (wordIndex < words.length) {
        word = String(words[wordIndex++]).toUpperCase();
      } else {
        word = String(nextFallbackWord()).toUpperCase();
      }
      guessed = new Set();
      mistakes = 0;
      gameOver = false;
      statusEl.textContent = '';
      statusEl.className = 'cg-status';
      // Defensa contra restauración de DOM (bfcache / iOS): limpiar cualquier
      // estado residual antes de reconstruir, así el juego siempre arranca
      // desde cero aunque el navegador hubiera guardado el HTML previo.
      keysEl.innerHTML = '';
      wordEl.innerHTML = '';
      svg.innerHTML = '';
      buildKeys();
      drawHangman();
      renderHearts();
      renderWord();
      updatePowerups();
    }

    function reset() {
      score = 0;
      bonusEarned = false;
      wordIndex = 0;
      powerups = { life: false, reveal: false, remove: false };
      shuffleInPlace(words);
      fallbackDeck = [];
      fallbackIndex = 0;
      previousFallbackWord = '';
      scoreEl.textContent = '0';
      startWord();
    }

    function completeWord() {
      if (gameOver) return;
      gameOver = true;
      updatePowerups();
      score++;
      scoreEl.textContent = score;
      if (score === RANKING_MIN_SCORE) leaderboard.submit(score);
      SFX.win();
      statusEl.textContent = `🎉 ${word} correcta. Preparando la siguiente…`;
      statusEl.className = 'cg-status is-win';
      spawnConfetti(wrap, 30);
      if (!bonusEarned && score >= winThreshold) {
        bonusEarned = true;
        ctx.onWin();
      }
      setTimeout(() => {
        if (document.body.contains(wrap)) startWord();
      }, 1200);
    }

    function usePowerup(type) {
      if (gameOver || !powerups || powerups[type]) return;

      if (type === 'life') {
        if (mistakes === 0) return;
        powerups.life = true;
        mistakes--;
        drawHangman();
        renderHearts();
        statusEl.textContent = '❤️ Recuperaste una vida.';
      } else if (type === 'reveal') {
        const candidates = Array.from(new Set(word.split('').map(normLetter)))
          .filter(letter => !guessed.has(letter));
        if (!candidates.length) return;
        powerups.reveal = true;
        const letter = candidates[Math.floor(Math.random() * candidates.length)];
        guessed.add(letter);
        const key = keysEl.querySelector(`[data-letter="${letter}"]`);
        if (key) {
          key.disabled = true;
          key.classList.add('is-hit');
        }
        SFX.correct();
        renderWord();
        statusEl.textContent = `💡 Se reveló la letra ${letter}.`;
        if (word.split('').every(c => guessed.has(normLetter(c)))) completeWord();
      } else if (type === 'remove') {
        const wordLetters = new Set(word.split('').map(normLetter));
        const candidates = Array.from(keysEl.querySelectorAll('[data-letter]'))
          .filter(btn => !btn.disabled && !wordLetters.has(btn.dataset.letter));
        if (!candidates.length) return;
        powerups.remove = true;
        shuffleInPlace(candidates).slice(0, 3).forEach(btn => {
          guessed.add(btn.dataset.letter);
          btn.disabled = true;
          btn.classList.add('hm2-key-eliminated');
        });
        statusEl.textContent = '✨ Se descartaron tres letras incorrectas.';
      }
      statusEl.className = 'cg-status';
      updatePowerups();
    }

    function guess(letter, btn) {
      if (gameOver || guessed.has(letter)) return;
      guessed.add(letter);
      btn.disabled = true;
      if (word.split('').some(c => normLetter(c) === letter)) {
        btn.classList.add('is-hit');
        SFX.correct();
        renderWord();
        if (word.split('').every(c => guessed.has(normLetter(c)))) {
          completeWord();
        }
      } else {
        btn.classList.add('is-miss');
        SFX.wrong();
        // Shake del SVG
        svg.style.animation = 'cgShakeX 0.4s';
        setTimeout(() => { svg.style.animation = ''; }, 400);
        mistakes++;
        drawHangman();
        renderHearts();
        if (mistakes >= MAX) {
          gameOver = true;
          SFX.lose();
          renderWord(true);
          statusEl.textContent = `💀 Game Over. La palabra era ${word}`;
          statusEl.className = 'cg-status is-lose';
          leaderboard.submit(score);
          if (!bonusEarned) ctx.onLose();
        }
        updatePowerups();
      }
    }

    // Soporte teclado físico
    const keyHandler = e => {
      if (gameOver || isTypingTarget(e)) return;
      // Si el juego ya no está en el DOM (re-render del layout), salir.
      if (!document.body.contains(wrap)) return;
      const letter = e.key.toUpperCase();
      if (/^[A-ZÑ]$/.test(letter) && !guessed.has(letter)) {
        const btn = keysEl.querySelector(`[data-letter="${letter}"]`);
        if (btn && !btn.disabled) guess(letter, btn);
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Cleanup automático: si el wrap es removido del DOM, removemos el listener
    // para evitar fugas y duplicados al re-renderizar el juego.
    if (typeof MutationObserver !== 'undefined') {
      const cleanupObserver = new MutationObserver(() => {
        if (!document.body.contains(wrap)) {
          document.removeEventListener('keydown', keyHandler);
          cleanupObserver.disconnect();
        }
      });
      cleanupObserver.observe(document.body, { childList: true, subtree: true });
    }

    powerupsEl.addEventListener('click', event => {
      const button = event.target.closest('[data-power]');
      if (button && powerupsEl.contains(button)) usePowerup(button.dataset.power);
    });
    wrap.querySelector('#hm-reset').addEventListener('click', reset);
    reset();
  });

  // =====================================================================
  // 5. TRIVIA — animaciones cuidadas, barra de progreso, transiciones
  // =====================================================================
  reg('trivia', function (ctx) {
    // Barajar preguntas y opciones: repetir la trivia sirve para aprender,
    // no para memorizar posiciones.
    const rawQuestions = (ctx.config && ctx.config.questions) || [];
    const questions = C.shuffle(rawQuestions.slice()).map(q => {
      const order = C.shuffle((q.options || []).map((_, j) => j));
      return {
        q: q.q,
        options: order.map(j => q.options[j]),
        answer: order.indexOf(q.answer)
      };
    });
    const winThreshold = Math.ceil(questions.length * 0.7);
    const tieThreshold = Math.floor(questions.length / 2);
    let idx = 0, correct = 0, wrong = 0, finished = false, transitioning = false;
    let doubleActive = false, doublePick = null;
    let used5050 = false, usedDouble = false, usedRigo = false;

    const wrap = document.createElement('div');
    wrap.style.position = 'relative';
    wrap.innerHTML = `
      <div style="text-align:center;">
        <div id="tr-progress-text" style="font-weight:900;margin-bottom:4px;font-size:14px;
             text-transform:uppercase;letter-spacing:1px;"></div>
        <div class="cg-progress-bar"><div id="tr-progress-fill" class="cg-progress-fill" style="width:0%"></div></div>

        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
          <span style="background:var(--coeduca-success);color:#fff;border:2px solid var(--coeduca-stroke);
                       border-radius:50px;padding:4px 14px;font-weight:900;font-size:13px;
                       box-shadow:2px 2px 0 var(--coeduca-stroke);">
            ✓ Aciertos: <span id="tr-correct">0</span>
          </span>
          <span style="background:var(--coeduca-error);color:#fff;border:2px solid var(--coeduca-stroke);
                       border-radius:50px;padding:4px 14px;font-weight:900;font-size:13px;
                       box-shadow:2px 2px 0 var(--coeduca-stroke);">
            ✗ Fallos: <span id="tr-wrong">0</span>
          </span>
        </div>

        <div id="tr-lifelines" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px;"></div>
        <div id="tr-card-container" style="min-height:100px;"></div>
        <div id="tr-options" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>
        <div id="tr-status" class="cg-status"></div>
      </div>
    `;
    ctx.container.appendChild(wrap);

    makeSoundToggle(wrap);
    const cardContainer = wrap.querySelector('#tr-card-container');
    const opts = wrap.querySelector('#tr-options');
    const progText = wrap.querySelector('#tr-progress-text');
    const progFill = wrap.querySelector('#tr-progress-fill');
    const correctEl = wrap.querySelector('#tr-correct');
    const wrongEl = wrap.querySelector('#tr-wrong');
    const statusEl = wrap.querySelector('#tr-status');
    const colors = ['#FF6B9D', '#4FC3F7', '#FFD700', '#A8E6CF'];

    // --- Comodines: cada uno se usa UNA sola vez por partida ---
    const llWrap = wrap.querySelector('#tr-lifelines');
    function lifelineBtn(iconHTML, label, title) {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = title;
      b.setAttribute('aria-label', title);
      b.innerHTML = '<span style="font-size:18px;line-height:1;display:inline-flex;align-items:center;justify-content:center;">' + iconHTML + '</span>' +
        '<span style="font-size:10px;font-weight:900;letter-spacing:0.5px;">' + label + '</span>';
      b.style.cssText = 'display:inline-flex;flex-direction:column;align-items:center;gap:3px;' +
        'padding:8px 14px;min-width:66px;min-height:48px;background:#fff;border:3px solid #1a1a1a;' +
        'border-radius:12px;cursor:pointer;box-shadow:3px 3px 0 #1a1a1a;' +
        'transition:transform 0.1s, opacity 0.2s;font-family:inherit;color:#1a1a1a;';
      llWrap.appendChild(b);
      return b;
    }
    function spendLifeline(b) {
      b.disabled = true;
      b.style.opacity = '0.35';
      b.style.boxShadow = '1px 1px 0 #1a1a1a';
      b.style.cursor = 'not-allowed';
    }
    function denyLifeline(b) {
      // Aviso suave: esta pregunta tiene muy pocas opciones para este comodín
      if (b.animate) {
        b.animate([
          { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }
        ], { duration: 300 });
      }
      SFX.tap();
    }

    const btn5050 = lifelineBtn('✂️', '50/50', 'Elimina la mitad de las opciones incorrectas');
    const btnDouble = lifelineBtn('✌️', 'DOBLE', 'Elige dos respuestas en esta pregunta');
    const btnRigo = lifelineBtn(
      '<span style="display:inline-block;width:22px;height:22px;">' + RIGO_IMG + '</span>',
      'RIGO', 'Rigo te dice cuál cree que es la respuesta');

    btn5050.addEventListener('click', () => {
      if (used5050 || finished || transitioning || !questions[idx]) return;
      const q = questions[idx];
      const active = [...opts.children].filter(b => !b.disabled);
      if (active.length <= 2) return denyLifeline(btn5050);
      used5050 = true;
      spendLifeline(btn5050);
      SFX.tap();
      const wrongBtns = active.filter(b => +b.dataset.j !== q.answer);
      C.shuffle(wrongBtns).slice(0, active.length - 2).forEach(b => {
        b.disabled = true;
        b.style.transition = 'opacity 0.3s';
        b.style.opacity = '0.25';
      });
    });

    btnDouble.addEventListener('click', () => {
      if (usedDouble || finished || transitioning || !questions[idx]) return;
      const active = [...opts.children].filter(b => !b.disabled);
      if (active.length <= 2) return denyLifeline(btnDouble);
      usedDouble = true;
      doubleActive = true;
      doublePick = null;
      spendLifeline(btnDouble);
      SFX.tap();
      statusEl.textContent = '✌️ Elige DOS respuestas';
    });

    btnRigo.addEventListener('click', () => {
      if (usedRigo || finished || transitioning || !questions[idx]) return;
      usedRigo = true;
      spendLifeline(btnRigo);
      SFX.tap();
      const q = questions[idx];
      const letter = 'ABCD'[q.answer] || '';
      const msg = 'Mmm... yo diría que es la ' + letter + ': "' + q.options[q.answer] + '" 😉';
      // rigo.say() acepta cualquier texto al vuelo, así que no hace falta
      // registrar mensajes nuevos en rigo.js.
      if (global.rigo && global.rigo.say) {
        if (global.rigo.setEmotion) global.rigo.setEmotion('sneaky');
        global.rigo.say(msg, 5000);
      } else {
        // Fallback si la mascota no está en la página: burbuja temporal
        const bubble = document.createElement('div');
        bubble.textContent = '🐸 ' + msg;
        bubble.style.cssText = 'margin:0 auto 10px;max-width:420px;background:#E8F5E9;' +
          'border:3px solid #1a1a1a;border-radius:12px;padding:10px 14px;font-weight:bold;' +
          'box-shadow:3px 3px 0 #1a1a1a;';
        cardContainer.parentNode.insertBefore(bubble, cardContainer);
        setTimeout(() => bubble.remove(), 5000);
      }
    });


    function updateProgress() {
      const pct = (idx / questions.length) * 100;
      progFill.style.width = pct + '%';
      progText.textContent = `Pregunta ${Math.min(idx + 1, questions.length)} de ${questions.length}`;
      correctEl.textContent = correct;
      wrongEl.textContent = wrong;
    }

    function render() {
      if (idx >= questions.length || finished) return finish();
      transitioning = false;
      doubleActive = false;
      doublePick = null;
      updateProgress();
      const q = questions[idx];

      // Card nueva con animación de entrada
      cardContainer.innerHTML = `<div class="cg-trivia-card">${C.escapeHTML(q.q)}</div>`;
      // Opciones
      opts.innerHTML = '';
      q.options.forEach((o, j) => {
        const b = document.createElement('button');
        b.className = 'coeduca-btn cg-trivia-opt';
        b.style.background = colors[j % 4];
        b.style.color = '#1a1a1a';
        b.style.animation = `cgPopBounce 0.35s ${j * 0.06}s both`;
        b.innerHTML = `<b>${'ABCD'[j]}.</b> ${C.escapeHTML(o)}`;
        b.dataset.j = j;
        b.addEventListener('click', () => answer(j, b, q.answer));
        opts.appendChild(b);
      });
    }

    function answer(picked, btn, correctIdx) {
      if (finished || transitioning) return;

      // Comodín DOBLE activo: la primera elección se marca en amarillo,
      // la segunda resuelve. Acierta si CUALQUIERA de las dos es la correcta.
      if (doubleActive) {
        if (doublePick === null) {
          doublePick = picked;
          btn.style.outline = '4px dashed #FFD700';
          btn.style.outlineOffset = '2px';
          SFX.tap();
          return;
        }
        if (picked === doublePick) return;
        const hit = picked === correctIdx || doublePick === correctIdx;
        const picks = [picked, doublePick];
        doubleActive = false;
        doublePick = null;
        resolve(picks, correctIdx, hit);
        return;
      }

      resolve([picked], correctIdx, picked === correctIdx);
    }

    function resolve(picks, correctIdx, isCorrect) {
      transitioning = true;
      statusEl.textContent = '';
      const allBtns = [...opts.children];
      allBtns.forEach((b, j) => {
        b.disabled = true;
        b.style.outline = '';
        b.style.outlineOffset = '';
        if (j === correctIdx) b.classList.add('is-correct');
        else if (picks.indexOf(j) >= 0) b.classList.add('is-wrong');
      });

      if (isCorrect) {
        correct++;
        SFX.correct();
        // Confetti pequeño
        spawnConfetti(wrap, 12);
      } else {
        wrong++;
        SFX.wrong();
      }
      correctEl.textContent = correct;
      wrongEl.textContent = wrong;

      setTimeout(() => {
        // Animación de salida de la card actual
        const card = cardContainer.querySelector('.cg-trivia-card');
        if (card) card.classList.add('is-leaving');
        // Apagar las opciones también
        allBtns.forEach(b => {
          b.style.transition = 'opacity 0.25s';
          b.style.opacity = '0';
        });
        setTimeout(() => {
          idx++;
          render();
        }, 320);
      }, 1100);
    }

    function finish() {
      finished = true;
      llWrap.querySelectorAll('button').forEach(spendLifeline);
      cardContainer.innerHTML = '';
      opts.innerHTML = '';
      progFill.style.width = '100%';
      progText.textContent = 'Resultado final';
      const pct = Math.round((correct / questions.length) * 100);
      let icon, msgClass;
      if (correct >= winThreshold) {
        icon = '🏆'; msgClass = 'is-win';
        SFX.win();
        spawnConfetti(wrap, 50);
        ctx.onWin();
      } else if (correct >= tieThreshold) {
        icon = '👍'; msgClass = 'is-tie';
        SFX.tie();
        ctx.onTie();
      } else {
        icon = '📚'; msgClass = 'is-lose';
        SFX.lose();
        ctx.onLose();
      }
      statusEl.innerHTML = `${icon} ${correct} / ${questions.length} (${pct}%)`;
      statusEl.className = 'cg-status ' + msgClass;
    }

    if (questions.length === 0) {
      cardContainer.innerHTML = `<div class="cg-trivia-card">No hay preguntas configuradas.</div>`;
      return;
    }
    render();
  });

  // =====================================================================
  // 6. PILLS — puzle de píldoras bicolores (estilo Dr. Mario / Columns).
  //    ESPACIO (o ⟳ / tocar el tablero) gira, las flechas mueven.
  //    Se borran 3 o más del mismo color en horizontal, vertical o diagonal;
  //    el resto cae y puede encadenar combos. La caída se acelera con el
  //    tiempo. Se gana al llegar al puntaje meta.
  //    Una vez por partida cae una píldora DORADA "+1" (ambas mitades del
  //    mismo color): si el estudiante la destruye antes de ganar, suma
  //    +1 punto extra real (máximo 2 extra junto con el +1 de ganar).
  //    Muy rara vez aparece una mitad ARCOÍRIS que destruye su vecindad 3x3.
  // =====================================================================
  reg('pills', function (ctx) {
    const COLS = 9, ROWS = 14, CELL = 24;
    const winThreshold = (ctx.config && ctx.config.winScore) || 300;
    const COLORS = ['#E63946', '#4FC3F7', '#FFD700', '#4CAF50', '#9B5DE5', '#FF9F1C'];
    const DARK   = ['#8E1B26', '#0277BD', '#B8960B', '#2E7D32', '#6A3AB2', '#C67207'];
    // Velocidad: arranca suave y acelera con cada pieza fijada
    const START_TICK = 600, MIN_TICK = 180, TICK_STEP = 12;
    // Probabilidad de píldora normal con ambas mitades iguales (raras a propósito)
    const SAME_COLOR_CHANCE = 0.1;
    // Aproximadamente una de cada 67 piezas contiene una mitad arcoíris.
    const RAINBOW_CHANCE = 0.015;
    // dir: posición de la segunda mitad respecto al pivote (derecha/abajo/izq/arriba)
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

    let grid, piece, loop, running, gameOver, score, paused, bonusEarned;
    let bonusSpawned, bonusAwarded, bonusAtScore, clearingSet, floats;
    let tickMs, piecesLocked;
    let scrollLocked = false, previousBodyTouchAction = '', previousOverscrollBehavior = '';

    const wrap = document.createElement('div');
    wrap.className = 'cg-snake-wrap';
    wrap.innerHTML = `
      <div class="cg-snake-score">
        <span>💊</span>
        <span>PUNTOS: <span id="pl-score">0</span></span>
        <span>·</span>
        <span>BONUS: ${winThreshold}</span>
      </div>
      <div class="cg-progress-bar" style="max-width:${COLS * CELL}px;">
        <div id="pl-progress" class="cg-progress-fill" style="width:0%"></div>
      </div>
      <canvas class="cg-snake-canvas" id="pl-canvas" width="${COLS * CELL}" height="${ROWS * CELL}"
              style="background:#221a3a;"></canvas>
      <div class="cg-snake-controls">
        <button class="coeduca-btn coeduca-btn-success cg-snake-start" id="pl-start">▶ START</button>
        <div class="cg-snake-dpad">
          <span></span>
          <button class="coeduca-btn cg-snake-dir" id="pl-rot" title="Girar" aria-label="Girar">⟳</button>
          <span></span>
          <button class="coeduca-btn cg-snake-dir" data-m="left" aria-label="Mover a la izquierda">←</button>
          <button class="coeduca-btn cg-snake-dir" data-m="down" aria-label="Bajar">↓</button>
          <button class="coeduca-btn cg-snake-dir" data-m="right" aria-label="Mover a la derecha">→</button>
        </div>
        <div style="font-size:12px;font-weight:bold;color:var(--coeduca-stroke);max-width:300px;">
          PC: ESPACIO gira · ← → mueven · ↓ baja · Haz líneas rectas o diagonales de 3+ ·
          🌈 El arcoíris explota alrededor · 💛 La píldora dorada da +1 extra
        </div>
      </div>
      <div id="pl-status" class="cg-status"></div>
    `;
    ctx.container.appendChild(wrap);
    makeSoundToggle(wrap);

    const canvas = wrap.querySelector('#pl-canvas');
    const cctx = canvas.getContext('2d');
    const scoreEl = wrap.querySelector('#pl-score');
    const progressEl = wrap.querySelector('#pl-progress');
    const statusEl = wrap.querySelector('#pl-status');
    const leaderboard = global.COEDUCA_LEADERBOARD
      ? global.COEDUCA_LEADERBOARD.create(ctx, 'pills', winThreshold)
      : { submit: () => Promise.resolve(false) };

    function preventGameScroll(event) {
      if (scrollLocked) event.preventDefault();
    }

    function lockGameScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      previousBodyTouchAction = document.body.style.touchAction;
      previousOverscrollBehavior = document.documentElement.style.overscrollBehavior;
      document.body.style.touchAction = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      document.addEventListener('touchmove', preventGameScroll, { passive: false, capture: true });
    }

    function unlockGameScroll() {
      if (!scrollLocked) return;
      scrollLocked = false;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overscrollBehavior = previousOverscrollBehavior;
      document.removeEventListener('touchmove', preventGameScroll, true);
    }

    function reset() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      piece = null;
      running = false; gameOver = false; paused = false;
      score = 0;
      bonusEarned = false;
      bonusSpawned = false; bonusAwarded = false;
      // La píldora dorada aparece una vez, entre el 30% y el 60% de la meta
      bonusAtScore = Math.floor(winThreshold * (0.3 + Math.random() * 0.3));
      clearingSet = null;
      floats = [];
      tickMs = START_TICK;
      piecesLocked = 0;
      scoreEl.textContent = '0';
      progressEl.style.width = '0%';
      statusEl.textContent = '';
      statusEl.className = 'cg-status';
    }

    function cellsOf(p) {
      const d = DIRS[p.dir];
      return [
        { c: p.x, r: p.y, color: p.colors[0], rainbow: p.rainbowIndex === 0 },
        { c: p.x + d[0], r: p.y + d[1], color: p.colors[1], rainbow: p.rainbowIndex === 1 }
      ];
    }

    function collides(p) {
      return cellsOf(p).some(({ c, r }) =>
        c < 0 || c >= COLS || r < 0 || r >= ROWS || !!grid[r][c]);
    }

    function spawnPiece() {
      const isBonus = !bonusSpawned && score >= bonusAtScore;
      const isRainbow = !isBonus && Math.random() < RAINBOW_CHANCE;
      const c1 = Math.floor(Math.random() * COLORS.length);
      let c2;
      if (isBonus || Math.random() < SAME_COLOR_CHANCE) {
        c2 = isBonus ? c1 : Math.floor(Math.random() * COLORS.length);
      } else {
        // Forzar mitades de colores distintos (las monocromas son raras)
        c2 = (c1 + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length;
      }
      const p = {
        x: Math.floor(COLS / 2) - 1,
        y: 0,
        dir: 0,
        colors: [c1, c2],
        bonus: isBonus,
        rainbowIndex: isRainbow ? Math.floor(Math.random() * 2) : -1
      };
      if (isBonus) bonusSpawned = true;
      if (collides(p)) return end();
      piece = p;
    }

    function tryMove(dx, dy) {
      if (!piece) return false;
      const p = {
        x: piece.x + dx, y: piece.y + dy, dir: piece.dir,
        colors: piece.colors, bonus: piece.bonus, rainbowIndex: piece.rainbowIndex
      };
      if (collides(p)) return false;
      piece = p;
      draw();
      return true;
    }

    function tryRotate() {
      if (!piece) return;
      // Con "kicks": si la rotación no cabe, intenta desplazar el pivote
      const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1]];
      for (let i = 0; i < kicks.length; i++) {
        const p = {
          x: piece.x + kicks[i][0], y: piece.y + kicks[i][1],
          dir: (piece.dir + 1) % 4, colors: piece.colors,
          bonus: piece.bonus, rainbowIndex: piece.rainbowIndex
        };
        if (!collides(p)) { piece = p; SFX.tap(); draw(); return; }
      }
    }

    function softDrop() {
      if (!piece) return;
      if (!tryMove(0, 1)) lockPiece();
    }

    function lockPiece() {
      if (!piece) return;
      const bonus = piece.bonus;
      const rainbowCells = [];
      cellsOf(piece).forEach(({ c, r, color, rainbow }) => {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          grid[r][c] = { color, bonus, rainbow };
          if (rainbow) rainbowCells.push([r, c]);
        }
      });
      piece = null;
      SFX.place();
      // La caída se acelera con cada pieza fijada
      piecesLocked++;
      tickMs = Math.max(MIN_TICK, START_TICK - piecesLocked * TICK_STEP);
      if (running && loop) {
        clearInterval(loop);
        loop = setInterval(stepTick, tickMs);
      }
      if (rainbowCells.length) resolveRainbow(rainbowCells);
      else resolveBoard();
    }

    // Líneas rectas de 3+ del mismo color: horizontal, vertical y dos diagonales.
    function findGroups() {
      const mark = {};
      const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = grid[r][c];
          if (!cell || cell.rainbow) continue;
          directions.forEach(([dr, dc]) => {
            const previousR = r - dr, previousC = c - dc;
            const previous = previousR >= 0 && previousR < ROWS &&
              previousC >= 0 && previousC < COLS ? grid[previousR][previousC] : null;
            if (previous && !previous.rainbow && previous.color === cell.color) return;

            const run = [];
            let nextR = r, nextC = c;
            while (nextR >= 0 && nextR < ROWS && nextC >= 0 && nextC < COLS) {
              const next = grid[nextR][nextC];
              if (!next || next.rainbow || next.color !== cell.color) break;
              run.push([nextR, nextC]);
              nextR += dr;
              nextC += dc;
            }
            if (run.length >= 3) {
              run.forEach(([runR, runC]) => { mark[runR * COLS + runC] = true; });
            }
          });
        }
      }
      return Object.keys(mark).map(i => {
        const n = +i;
        return [Math.floor(n / COLS), n % COLS];
      });
    }

    function awardGoldenBonus(bonusHit) {
      if (!bonusHit || bonusAwarded) return false;
      bonusAwarded = true;
      SFX.pop();
      spawnConfetti(wrap, 15);
      floats.push({ x: (COLS * CELL) / 2, y: (ROWS * CELL) / 2, life: 55, text: '+1 EXTRA' });
      // +1 real en la nota (el core lo limita a una vez por sesión)
      if (C.addBalloonBonus) C.addBalloonBonus();
      if (global.rigo && global.rigo.say) {
        global.rigo.say('¡Rompiste la píldora dorada! +1 punto extra 💊', 4000);
      }
      return true;
    }

    function resolveRainbow(centers) {
      const targets = {};
      centers.forEach(([centerR, centerC]) => {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = centerR + dr, c = centerC + dc;
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c]) {
              targets[r * COLS + c] = [r, c];
            }
          }
        }
      });
      const toClear = Object.values(targets);
      clearingSet = {};
      toClear.forEach(([r, c]) => { clearingSet[r * COLS + c] = true; });
      draw();
      setTimeout(() => {
        if (gameOver) return;
        let bonusHit = false;
        toClear.forEach(([r, c]) => {
          const cell = grid[r][c];
          if (cell && cell.bonus) bonusHit = true;
          grid[r][c] = null;
        });
        clearingSet = null;
        score += toClear.length * 10;
        scoreEl.textContent = score;
        progressEl.style.width = Math.min(100, (score / winThreshold) * 100) + '%';
        SFX.pop();
        spawnConfetti(wrap, 12);
        awardGoldenBonus(bonusHit);
        floats.push({
          x: (centers[0][1] + 0.5) * CELL,
          y: (centers[0][0] + 0.5) * CELL,
          life: 45,
          text: '🌈'
        });
        pumpFloats();
        applyGravity();
        draw();
        setTimeout(resolveBoard, 200);
      }, 180);
    }

    function applyGravity() {
      for (let c = 0; c < COLS; c++) {
        let write = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (grid[r][c]) {
            if (write !== r) { grid[write][c] = grid[r][c]; grid[r][c] = null; }
            write--;
          }
        }
      }
    }

    // Borra grupos, deja caer lo demás y repite (combos en cadena)
    function resolveBoard() {
      if (gameOver) return;
      const toClear = findGroups();
      if (!toClear.length) {
        if (score >= winThreshold) win();
        spawnPiece();
        draw();
        return;
      }
      // Flash blanco antes de borrar
      clearingSet = {};
      toClear.forEach(rc => { clearingSet[rc[0] * COLS + rc[1]] = true; });
      draw();
      setTimeout(() => {
        if (gameOver) return;
        let bonusHit = false;
        toClear.forEach(rc => {
          const cell = grid[rc[0]][rc[1]];
          if (cell && cell.bonus) bonusHit = true;
          grid[rc[0]][rc[1]] = null;
        });
        clearingSet = null;
        score += toClear.length * 10;
        scoreEl.textContent = score;
        progressEl.style.width = Math.min(100, (score / winThreshold) * 100) + '%';
        SFX.eat();
        if (awardGoldenBonus(bonusHit)) pumpFloats();
        applyGravity();
        draw();
        setTimeout(resolveBoard, 200);
      }, 180);
    }

    function pumpFloats() {
      if (!floats.length) return;
      floats.forEach(f => { f.y -= 0.9; f.life--; });
      floats = floats.filter(f => f.life > 0);
      draw();
      setTimeout(pumpFloats, 60);
    }

    function drawCell(c, r, colorIdx, bonus, rainbow) {
      const x = c * CELL, y = r * CELL;
      const clearing = clearingSet && clearingSet[r * COLS + c];
      if (clearing) {
        cctx.fillStyle = '#fff';
        cctx.strokeStyle = '#fff';
      } else if (rainbow) {
        const gradient = cctx.createLinearGradient(x + 2, y + 2, x + CELL - 2, y + CELL - 2);
        gradient.addColorStop(0, '#E63946');
        gradient.addColorStop(0.2, '#FF9F1C');
        gradient.addColorStop(0.4, '#FFD700');
        gradient.addColorStop(0.6, '#4CAF50');
        gradient.addColorStop(0.8, '#4FC3F7');
        gradient.addColorStop(1, '#9B5DE5');
        cctx.fillStyle = gradient;
        cctx.strokeStyle = '#fff';
      } else {
        cctx.fillStyle = COLORS[colorIdx];
        cctx.strokeStyle = DARK[colorIdx];
      }
      cctx.lineWidth = 2;
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 7);
      else cctx.rect(x + 2, y + 2, CELL - 4, CELL - 4);
      cctx.fill(); cctx.stroke();
      if (!clearing) {
        // Brillo de píldora
        cctx.fillStyle = 'rgba(255,255,255,0.35)';
        cctx.beginPath();
        cctx.ellipse(x + CELL * 0.35, y + CELL * 0.32, CELL * 0.18, CELL * 0.12, -0.6, 0, Math.PI * 2);
        cctx.fill();
      }
      if (rainbow && !clearing) {
        cctx.fillStyle = '#fff';
        cctx.font = 'bold 13px system-ui';
        cctx.textAlign = 'center';
        cctx.fillText('✦', x + CELL / 2, y + CELL / 2 + 5);
      }
      if (bonus) {
        // Anillo dorado + etiqueta "+1"
        cctx.strokeStyle = '#FFD700';
        cctx.lineWidth = 2.5;
        cctx.beginPath();
        if (cctx.roundRect) cctx.roundRect(x + 1, y + 1, CELL - 2, CELL - 2, 8);
        else cctx.rect(x + 1, y + 1, CELL - 2, CELL - 2);
        cctx.stroke();
        cctx.fillStyle = '#1a1a1a';
        cctx.font = 'bold 9px Comic Sans MS, system-ui';
        cctx.textAlign = 'center';
        cctx.fillText('+1', x + CELL / 2, y + CELL / 2 + 3);
      }
    }

    function overlayBox(text) {
      const W = COLS * CELL, H = ROWS * CELL;
      cctx.fillStyle = 'rgba(26,26,26,0.85)';
      cctx.fillRect(W / 2 - 92, H / 2 - 22, 184, 38);
      cctx.strokeStyle = '#FFD700';
      cctx.lineWidth = 3;
      cctx.strokeRect(W / 2 - 92, H / 2 - 22, 184, 38);
      cctx.fillStyle = '#FFD700';
      cctx.font = 'bold 16px Comic Sans MS, system-ui';
      cctx.textAlign = 'center';
      cctx.fillText(text, W / 2, H / 2 + 5);
    }

    function draw() {
      const W = COLS * CELL, H = ROWS * CELL;
      cctx.fillStyle = '#221a3a';
      cctx.fillRect(0, 0, W, H);
      // Grid sutil
      cctx.strokeStyle = 'rgba(255,255,255,0.05)';
      cctx.lineWidth = 1;
      for (let i = 1; i < COLS; i++) {
        cctx.beginPath(); cctx.moveTo(i * CELL, 0); cctx.lineTo(i * CELL, H); cctx.stroke();
      }
      for (let i = 1; i < ROWS; i++) {
        cctx.beginPath(); cctx.moveTo(0, i * CELL); cctx.lineTo(W, i * CELL); cctx.stroke();
      }
      // Celdas fijas
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) drawCell(c, r, grid[r][c].color, grid[r][c].bonus, grid[r][c].rainbow);
        }
      }
      // Pieza en caída
      if (piece) cellsOf(piece).forEach(cl => drawCell(cl.c, cl.r, cl.color, piece.bonus, cl.rainbow));
      // Textos flotantes (+1 EXTRA)
      floats.forEach(f => {
        cctx.save();
        cctx.globalAlpha = Math.min(1, f.life / 20);
        cctx.font = 'bold 18px Comic Sans MS, system-ui';
        cctx.textAlign = 'center';
        cctx.strokeStyle = '#1a1a1a';
        cctx.lineWidth = 4;
        cctx.strokeText(f.text, f.x, f.y);
        cctx.fillStyle = '#FFD700';
        cctx.fillText(f.text, f.x, f.y);
        cctx.restore();
      });
      if (!running && !gameOver) overlayBox('▶ PRESIONA START');
      if (paused) overlayBox('⏸ PAUSA');
    }

    function end() {
      gameOver = true; running = false; clearInterval(loop);
      unlockGameScroll();
      pillsStartButton.disabled = false;
      SFX.die();
      statusEl.textContent = '💥 GAME OVER';
      statusEl.className = 'cg-status is-lose';
      leaderboard.submit(score);
      if (!bonusEarned) ctx.onLose();
      draw();
    }

    function win() {
      if (bonusEarned) return;
      bonusEarned = true;
      SFX.win();
      statusEl.textContent = '🎉 ¡PUNTO EXTRA! Sigue jugando para mejorar tu récord.';
      statusEl.className = 'cg-status is-win';
      spawnConfetti(wrap, 40);
      ctx.onWin();
      draw();
    }

    function stepTick() {
      if (gameOver || !running || !piece) return;
      if (!tryMove(0, 1)) lockPiece();
    }

    // Teclado físico: ESPACIO gira; izquierda/derecha mueven y abajo acelera.
    document.addEventListener('keydown', e => {
      if (isTypingTarget(e) || !running || gameOver) return;
      if (e.code === 'Space') { tryRotate(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { tryMove(-1, 0); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { tryMove(1, 0); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { softDrop(); e.preventDefault(); }
    });

    // Botones táctiles
    wrap.querySelectorAll('[data-m]').forEach(b => {
      b.addEventListener('click', () => {
        if (!running || gameOver) return;
        if (b.dataset.m === 'left') tryMove(-1, 0);
        else if (b.dataset.m === 'right') tryMove(1, 0);
        else if (b.dataset.m === 'down') softDrop();
      });
    });
    wrap.querySelector('#pl-rot').addEventListener('click', () => {
      if (running && !gameOver) tryRotate();
    });

    // Táctil sobre el tablero: tap = girar, swipe = mover/bajar
    let tS = null;
    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      tS = { x: t.clientX, y: t.clientY };
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      if (!tS || !running || gameOver) { tS = null; return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - tS.x, dy = t.clientY - tS.y;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) tryRotate();
      else if (Math.abs(dx) > Math.abs(dy)) tryMove(dx > 0 ? 1 : -1, 0);
      else if (dy > 0) softDrop();
      tS = null;
    });
    canvas.addEventListener('click', () => { if (running && !gameOver) tryRotate(); });

    // Pausa automática si la pestaña pierde el foco
    autoPause(wrap,
      () => {
        if (running && !gameOver && loop) {
          clearInterval(loop); loop = null;
          paused = true;
          unlockGameScroll();
          draw();
        }
      },
      () => {
        if (!paused) return;
        paused = false;
        lockGameScroll();
        draw();
        setTimeout(() => {
          if (gameOver || !running || paused) return;
          clearInterval(loop);
          loop = setInterval(stepTick, tickMs);
        }, 600);
      }
    );

    if (typeof MutationObserver !== 'undefined') {
      const cleanupObserver = new MutationObserver(() => {
        if (!document.body.contains(wrap)) {
          unlockGameScroll();
          cleanupObserver.disconnect();
        }
      });
      cleanupObserver.observe(document.body, { childList: true, subtree: true });
    }

    const pillsStartButton = wrap.querySelector('#pl-start');
    pillsStartButton.addEventListener('click', () => {
      reset();
      running = true;
      pillsStartButton.disabled = true;
      lockGameScroll();
      spawnPiece();
      draw();
      clearInterval(loop);
      loop = setInterval(stepTick, tickMs);
    });

    reset();
    draw();
  });

  // =====================================================================
  // 7. TORRE SÁNDWICH — atrapa, centra y equilibra los ingredientes.
  // =====================================================================
  reg('sandwich', function (ctx) {
    const W = 360, H = 470, PLATE_Y = 356, FLOOR_Y = 438;
    const winThreshold = Math.max(1, (ctx.config && ctx.config.winScore) || 500);
    const INGREDIENTS = {
      bottom: { name: 'PAN', width: 104, height: 22 },
      cheese: { name: 'QUESO', width: 92, height: 14 },
      meat: { name: 'CARNE', width: 88, height: 19 },
      tomato: { name: 'TOMATE', width: 82, height: 13 },
      lettuce: { name: 'LECHUGA', width: 96, height: 16 },
      bacon: { name: 'TOCINO', width: 82, height: 12 },
      onion: { name: 'CEBOLLA', width: 76, height: 12 },
      pickle: { name: 'PEPINILLO', width: 72, height: 11 },
      egg: { name: 'HUEVO', width: 84, height: 14 },
      avocado: { name: 'AGUACATE', width: 78, height: 13 },
      top: { name: 'PAN', width: 104, height: 27 }
    };

    let stack, order, falling, plateX, score, sandwiches, landedTotal;
    let running, gameOver, paused, serving, bonusEarned, lastAt, raf;
    let leftHeld = false, rightHeld = false, pointerActive = false;
    let scrollLocked = false, previousTouchAction = '', previousOverscroll = '';
    let wobble = 0, floatText = null;
    let collapsePieces = [], collapseStartedAt = 0, collapseLastAt = 0, lossAnimating = false;
    let towerTilt = 0, targetTowerTilt = 0, balanceRatio = 0, imbalanceTime = 0;

    const wrap = document.createElement('div');
    wrap.className = 'cg-snake-wrap cv-snake-wrap';
    wrap.innerHTML = `
      <div class="cg-snake-score cv-snake-score" style="background:#3b2417;color:#ffe06a;">
        <span>🥪</span>
        <span>PUNTOS: <span id="sw-score">0</span></span>
        <span>·</span>
        <span>SÁNDWICHES: <span id="sw-count">0</span></span>
      </div>
      <div class="cg-progress-bar cv-progress-bar" style="max-width:${W - 36}px;">
        <div id="sw-progress" class="cg-progress-fill cv-progress-fill" style="width:0%"></div>
      </div>
      <canvas id="sw-canvas" class="cg-snake-canvas cv-snake-canvas"
              width="${W}" height="${H}" style="background:#bde8ff;touch-action:none;"></canvas>
      <div class="cg-snake-controls cv-snake-controls">
        <button class="coeduca-btn coeduca-btn-success civica-btn civica-btn-success cg-snake-start cv-snake-start"
                id="sw-start">▶ START</button>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button class="coeduca-btn civica-btn cg-snake-dir cv-snake-dir" data-sw-dir="left" aria-label="Mover a la izquierda">←</button>
          <button class="coeduca-btn civica-btn cg-snake-dir cv-snake-dir" data-sw-dir="right" aria-label="Mover a la derecha">→</button>
        </div>
        <div style="font-size:12px;font-weight:bold;color:#3b2417;max-width:330px;line-height:1.45;">
          PC: ← → o A/D · Móvil: arrastra el plato · Centra cada ingrediente para que la torre no caiga
        </div>
      </div>
      <div id="sw-status" class="cg-status cv-status"></div>
    `;
    ctx.container.appendChild(wrap);
    makeSoundToggle(wrap);

    const canvas = wrap.querySelector('#sw-canvas');
    const cctx = canvas.getContext('2d');
    const scoreEl = wrap.querySelector('#sw-score');
    const countEl = wrap.querySelector('#sw-count');
    const progressEl = wrap.querySelector('#sw-progress');
    const statusEl = wrap.querySelector('#sw-status');
    const startButton = wrap.querySelector('#sw-start');
    const leaderboard = global.COEDUCA_LEADERBOARD
      ? global.COEDUCA_LEADERBOARD.create(ctx, 'sandwich', winThreshold)
      : { submit: () => Promise.resolve(false) };

    function preventScroll(event) { if (scrollLocked) event.preventDefault(); }
    function lockScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      previousTouchAction = document.body.style.touchAction;
      previousOverscroll = document.documentElement.style.overscrollBehavior;
      document.body.style.touchAction = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
    }
    function unlockScroll() {
      if (!scrollLocked) return;
      scrollLocked = false;
      document.body.style.touchAction = previousTouchAction;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
      document.removeEventListener('touchmove', preventScroll, true);
    }

    function shuffledMiddle() {
      const middle = ['cheese', 'meat', 'tomato', 'lettuce', 'bacon', 'onion', 'pickle', 'egg', 'avocado'];
      for (let i = middle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = middle[i]; middle[i] = middle[j]; middle[j] = tmp;
      }
      return ['bottom'].concat(middle, ['top']);
    }

    function reset() {
      cancelAnimationFrame(raf);
      stack = [];
      order = shuffledMiddle();
      falling = null;
      plateX = W / 2;
      score = 0;
      sandwiches = 0;
      landedTotal = 0;
      running = false;
      gameOver = false;
      paused = false;
      serving = false;
      bonusEarned = false;
      lastAt = 0;
      wobble = 0;
      floatText = null;
      collapsePieces = [];
      collapseStartedAt = 0;
      collapseLastAt = 0;
      lossAnimating = false;
      towerTilt = 0;
      targetTowerTilt = 0;
      balanceRatio = 0;
      imbalanceTime = 0;
      leftHeld = false;
      rightHeld = false;
      scoreEl.textContent = '0';
      countEl.textContent = '0';
      progressEl.style.width = '0%';
      statusEl.textContent = '';
      statusEl.className = 'cg-status cv-status';
    }

    function horizontalOverlap(leftA, rightA, leftB, rightB) {
      return Math.max(0, Math.min(rightA, rightB) - Math.max(leftA, leftB));
    }

    function mergedLength(intervals) {
      if (!intervals.length) return 0;
      const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
      let total = 0, start = sorted[0][0], end = sorted[0][1];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i][0] <= end) end = Math.max(end, sorted[i][1]);
        else {
          total += end - start;
          start = sorted[i][0];
          end = sorted[i][1];
        }
      }
      return total + end - start;
    }

    function worldPose(item) {
      const cos = Math.cos(towerTilt), sin = Math.sin(towerTilt);
      const localCenterX = item.offset;
      const localCenterY = item.y + item.height / 2 - PLATE_Y;
      const centerX = plateX + localCenterX * cos - localCenterY * sin;
      const centerY = PLATE_Y + localCenterX * sin + localCenterY * cos;
      return {
        centerX,
        centerY,
        left: centerX - (Math.abs(cos) * item.width + Math.abs(sin) * item.height) / 2,
        right: centerX + (Math.abs(cos) * item.width + Math.abs(sin) * item.height) / 2,
        top: centerY - (Math.abs(cos) * item.height + Math.abs(sin) * item.width) / 2
      };
    }

    function worldToLocal(worldX, worldY, height) {
      const cos = Math.cos(towerTilt), sin = Math.sin(towerTilt);
      const dx = worldX - plateX;
      const dy = worldY + height / 2 - PLATE_Y;
      return {
        offset: dx * cos + dy * sin,
        y: PLATE_Y + (-dx * sin + dy * cos) - height / 2
      };
    }

    function findLanding(item) {
      const itemLeft = item.x - item.width / 2;
      const itemRight = item.x + item.width / 2;
      const surfaces = stack.map(support => {
        const pose = worldPose(support);
        return { top: pose.top, left: pose.left, right: pose.right };
      });
      // Solo el primer pan se apoya directamente en el plato.
      if (item.type === 'bottom') {
        surfaces.push({ top: PLATE_Y, left: plateX - 52, right: plateX + 52 });
      }
      const candidates = surfaces
        .map(surface => Object.assign({}, surface, {
          y: surface.top - item.height,
          overlap: horizontalOverlap(itemLeft, itemRight, surface.left, surface.right)
        }))
        .filter(surface =>
          surface.overlap > 0 &&
          surface.y >= item.y - 1.5 &&
          !(item.sliding && Math.abs(surface.y - item.ignoreLandingY) < 3)
        );
      if (!candidates.length) {
        return { floor: true, y: FLOOR_Y - item.height, overlapRatio: 0 };
      }

      // Colisión continua: se detiene en la primera superficie que toque,
      // incluso si solo alcanza una esquina.
      const landingY = Math.min.apply(null, candidates.map(surface => surface.y));
      const supports = candidates.filter(surface => Math.abs(surface.y - landingY) < 0.75);
      const intervals = supports.map(surface => [
        Math.max(itemLeft, surface.left),
        Math.min(itemRight, surface.right)
      ]);
      const supportLeft = Math.min.apply(null, supports.map(surface => surface.left));
      const supportRight = Math.max.apply(null, supports.map(surface => surface.right));
      return {
        floor: false,
        y: landingY,
        overlapRatio: mergedLength(intervals) / item.width,
        left: supportLeft,
        right: supportRight,
        center: (supportLeft + supportRight) / 2
      };
    }

    function spawnIngredient() {
      if (!running || gameOver || serving || falling) return;
      if (!order.length) order = shuffledMiddle();
      const type = order.shift();
      const spec = INGREDIENTS[type];
      const margin = spec.width / 2 + 8;
      falling = {
        type,
        name: spec.name,
        width: spec.width,
        height: spec.height,
        x: margin + Math.random() * (W - margin * 2),
        y: -spec.height - 8,
        speed: Math.min(255, 112 + landedTotal * 5.5)
      };
    }

    function centerOfMass(items) {
      let total = 0, weighted = 0;
      items.forEach(item => {
        const weight = item.width * item.height;
        total += weight;
        weighted += item.offset * weight;
      });
      return total ? weighted / total : 0;
    }

    function calculateBalance() {
      const base = stack.find(item => item.type === 'bottom');
      if (!base || !stack.length) return 0;
      const supportLeft = Math.max(-52, base.offset - base.width / 2);
      const supportRight = Math.min(52, base.offset + base.width / 2);
      const supportCenter = (supportLeft + supportRight) / 2;
      const supportHalf = Math.max(7, (supportRight - supportLeft) / 2);
      return (centerOfMass(stack) - supportCenter) / (supportHalf * 0.82);
    }

    function updateTowerBalance(dt) {
      balanceRatio = calculateBalance();
      targetTowerTilt = Math.max(-0.32, Math.min(0.32, balanceRatio * 0.16));
      towerTilt += (targetTowerTilt - towerTilt) * Math.min(1, dt * 4.2);
      if (Math.abs(balanceRatio) > 1) {
        imbalanceTime += dt;
        if (imbalanceTime > 0.18 && !gameOver) {
          statusEl.textContent = '⚠️ ¡EL PESO ESTÁ VENCIENDO LA TORRE!';
          statusEl.className = 'cg-status cv-status is-tie';
        }
        if (imbalanceTime > 0.72) end('¡EL PESO VOLCÓ EL SÁNDWICH!');
      } else {
        imbalanceTime = Math.max(0, imbalanceTime - dt * 1.8);
        if (statusEl.textContent.indexOf('EL PESO ESTÁ') >= 0) {
          statusEl.textContent = '';
          statusEl.className = 'cg-status cv-status';
        }
      }
    }

    function awardBonus() {
      if (bonusEarned || score < winThreshold) return;
      bonusEarned = true;
      SFX.win();
      statusEl.textContent = '🎉 ¡PUNTO EXTRA! Sigue apilando para mejorar tu récord.';
      statusEl.className = 'cg-status cv-status is-win';
      spawnConfetti(wrap, 45);
      ctx.onWin();
    }

    function prepareCollapse() {
      const pieces = [];
      stack.forEach(item => {
        const pose = worldPose(item);
        pieces.push(Object.assign({}, item, {
          x: pose.centerX,
          y: pose.centerY - item.height / 2,
          vx: (pose.centerX - plateX) * 1.8 + (Math.random() - 0.5) * 85,
          vy: -95 - Math.random() * 95,
          angle: towerTilt,
          spin: (Math.random() - 0.5) * 7,
          bounces: 0
        }));
      });
      if (falling) {
        pieces.push(Object.assign({}, falling, {
          vx: (falling.x - plateX) * 1.15 + (Math.random() - 0.5) * 70,
          vy: -45 - Math.random() * 75,
          angle: falling.angle || 0,
          spin: (Math.random() - 0.5) * 8,
          bounces: 0
        }));
      }
      collapsePieces = pieces;
      stack = [];
      falling = null;
    }

    function collapseFrame(now) {
      if (!lossAnimating) return;
      if (!collapseStartedAt) {
        collapseStartedAt = now;
        collapseLastAt = now;
      }
      const dt = Math.min(0.034, (now - collapseLastAt) / 1000);
      collapseLastAt = now;
      collapsePieces.forEach(piece => {
        piece.vy += 690 * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;
        const floor = FLOOR_Y - piece.height;
        if (piece.y >= floor) {
          piece.y = floor;
          if (Math.abs(piece.vy) > 42 && piece.bounces < 2) {
            piece.vy *= -0.28;
            piece.vx *= 0.68;
            piece.spin *= 0.62;
            piece.bounces++;
          } else {
            piece.vy = 0;
            piece.vx *= 0.86;
            piece.spin *= 0.72;
          }
        }
      });
      draw();
      if (now - collapseStartedAt < 1800) {
        raf = requestAnimationFrame(collapseFrame);
      } else {
        lossAnimating = false;
        draw();
      }
    }

    function end(reason) {
      if (gameOver) return;
      gameOver = true;
      running = false;
      serving = false;
      leftHeld = false;
      rightHeld = false;
      cancelAnimationFrame(raf);
      unlockScroll();
      startButton.disabled = false;
      prepareCollapse();
      lossAnimating = true;
      collapseStartedAt = 0;
      collapseLastAt = 0;
      SFX.die();
      statusEl.textContent = '💥 ' + (reason || '¡LA TORRE CAYÓ!');
      statusEl.className = 'cg-status cv-status is-lose';
      leaderboard.submit(score);
      if (!bonusEarned) ctx.onLose();
      draw();
      raf = requestAnimationFrame(collapseFrame);
    }

    function landIngredient(landing) {
      if (!falling || !landing) return;
      if (landing.floor) {
        end('¡EL INGREDIENTE NO TUVO APOYO!');
        return;
      }
      const centerSupported = falling.x >= landing.left - 3 && falling.x <= landing.right + 3;
      if (!centerSupported) {
        const direction = falling.x < landing.center ? -1 : 1;
        falling.sliding = true;
        falling.ignoreLandingY = landing.y;
        falling.slideLeft = landing.left;
        falling.slideRight = landing.right;
        falling.vx = direction * (78 + Math.min(55, landedTotal * 3));
        falling.angle = direction * 0.08;
        SFX.tap();
        return;
      }
      const delta = falling.x - landing.center;
      const tolerance = Math.max(1, falling.width / 2);
      const local = worldToLocal(falling.x, landing.y, falling.height);

      const placed = {
        type: falling.type,
        name: falling.name,
        width: falling.width,
        height: falling.height,
        offset: local.offset,
        y: local.y
      };

      const centering = Math.max(0, 1 - Math.abs(delta) / tolerance);
      const accuracy = Math.min(1, landing.overlapRatio * 0.55 + centering * 0.45);
      const gained = 25 + Math.round(accuracy * 75);
      stack.push(placed);
      landedTotal++;
      score += gained;
      scoreEl.textContent = score;
      progressEl.style.width = Math.min(100, score / winThreshold * 100) + '%';
      floatText = { text: '+' + gained + (accuracy > 0.86 ? ' ¡PERFECTO!' : ''), life: 65 };
      wobble = Math.max(wobble, (1 - accuracy) * 13);
      SFX.place();
      falling = null;
      awardBonus();

      if (placed.type === 'top') {
        serving = true;
        sandwiches++;
        score += 225;
        scoreEl.textContent = score;
        countEl.textContent = sandwiches;
        progressEl.style.width = Math.min(100, score / winThreshold * 100) + '%';
        floatText = { text: '+225 ¡SÁNDWICH LISTO!', life: 85 };
        SFX.eat();
        spawnConfetti(wrap, 20);
        awardBonus();
        setTimeout(() => {
          if (gameOver || !running) return;
          stack = [];
          order = shuffledMiddle();
          serving = false;
          towerTilt = 0;
          targetTowerTilt = 0;
          balanceRatio = 0;
          imbalanceTime = 0;
          spawnIngredient();
        }, 950);
      } else {
        setTimeout(() => {
          if (!gameOver && running && !paused) spawnIngredient();
        }, 230);
      }
    }

    function roundedRect(x, y, width, height, radius) {
      cctx.beginPath();
      if (cctx.roundRect) cctx.roundRect(x, y, width, height, radius);
      else cctx.rect(x, y, width, height);
    }

    function drawIngredient(item, x, y) {
      const left = x - item.width / 2;
      cctx.save();
      cctx.lineWidth = 2.5;
      cctx.strokeStyle = '#4a2919';
      if (item.type === 'bottom' || item.type === 'top') {
        const gradient = cctx.createLinearGradient(0, y, 0, y + item.height);
        gradient.addColorStop(0, '#ffd88b'); gradient.addColorStop(1, '#d88a3d');
        cctx.fillStyle = gradient;
        roundedRect(left, y, item.width, item.height, item.type === 'top' ? 18 : 8);
        cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#fff1b6';
        for (let i = 0; i < 5; i++) {
          cctx.beginPath();
          cctx.ellipse(left + 18 + i * 20, y + 8 + (i % 2) * 5, 2.5, 1.2, -0.5, 0, Math.PI * 2);
          cctx.fill();
        }
      } else if (item.type === 'cheese') {
        cctx.fillStyle = '#ffd633';
        roundedRect(left, y, item.width, item.height, 4); cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#f4b400';
        [0.24, 0.7].forEach(pos => { cctx.beginPath(); cctx.arc(left + item.width * pos, y + 6, 2.5, 0, Math.PI * 2); cctx.fill(); });
      } else if (item.type === 'meat') {
        cctx.fillStyle = '#7a3f24';
        cctx.beginPath(); cctx.ellipse(x, y + item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2); cctx.fill(); cctx.stroke();
        cctx.strokeStyle = '#b66a3a'; cctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) { cctx.beginPath(); cctx.moveTo(x + i * 17 - 7, y + 7); cctx.lineTo(x + i * 17 + 6, y + 14); cctx.stroke(); }
      } else if (item.type === 'tomato') {
        cctx.fillStyle = '#f04444';
        roundedRect(left, y, item.width, item.height, 7); cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#ffd36a';
        for (let i = 0; i < 4; i++) { cctx.beginPath(); cctx.arc(left + 16 + i * 22, y + 7, 1.8, 0, Math.PI * 2); cctx.fill(); }
      } else if (item.type === 'lettuce') {
        const leafGradient = cctx.createLinearGradient(left, y, left + item.width, y + item.height);
        leafGradient.addColorStop(0, '#9be564');
        leafGradient.addColorStop(0.5, '#55bd4a');
        leafGradient.addColorStop(1, '#278c3c');
        cctx.fillStyle = leafGradient;
        const segments = 8, step = item.width / segments;
        cctx.beginPath();
        cctx.moveTo(left, y + item.height / 2);
        for (let i = 0; i < segments; i++) {
          cctx.quadraticCurveTo(
            left + (i + 0.5) * step,
            y + (i % 2 ? 1 : 5),
            left + (i + 1) * step,
            y + item.height / 2
          );
        }
        for (let i = segments - 1; i >= 0; i--) {
          cctx.quadraticCurveTo(
            left + (i + 0.5) * step,
            y + item.height - (i % 2 ? 1 : 5),
            left + i * step,
            y + item.height / 2
          );
        }
        cctx.closePath(); cctx.fill(); cctx.stroke();
        cctx.strokeStyle = '#247c35'; cctx.lineWidth = 1.4;
        cctx.beginPath(); cctx.moveTo(left + 8, y + item.height / 2); cctx.lineTo(left + item.width - 8, y + item.height / 2); cctx.stroke();
        for (let i = 1; i < 6; i++) {
          const veinX = left + item.width * i / 6;
          cctx.beginPath(); cctx.moveTo(veinX, y + item.height / 2);
          cctx.lineTo(veinX + (i % 2 ? 7 : -7), y + (i % 2 ? 3 : item.height - 3)); cctx.stroke();
        }
      } else if (item.type === 'bacon') {
        cctx.fillStyle = '#e56b6f';
        roundedRect(left, y, item.width, item.height, 5); cctx.fill(); cctx.stroke();
        cctx.strokeStyle = '#ffe0c2'; cctx.lineWidth = 3;
        cctx.beginPath(); cctx.moveTo(left + 8, y + 4); cctx.bezierCurveTo(x - 22, y + 12, x + 22, y, left + item.width - 8, y + 9); cctx.stroke();
      } else if (item.type === 'onion') {
        cctx.fillStyle = '#ead7f4';
        roundedRect(left, y, item.width, item.height, 7); cctx.fill(); cctx.stroke();
        cctx.strokeStyle = '#9b59b6'; cctx.lineWidth = 2;
        [-0.28, 0, 0.28].forEach(offset => {
          cctx.beginPath();
          cctx.ellipse(x + item.width * offset, y + item.height / 2, 10, 4, 0, 0, Math.PI * 2);
          cctx.stroke();
        });
      } else if (item.type === 'pickle') {
        const pickleGradient = cctx.createLinearGradient(left, y, left + item.width, y);
        pickleGradient.addColorStop(0, '#2f8f46'); pickleGradient.addColorStop(0.5, '#75c84f'); pickleGradient.addColorStop(1, '#2f8f46');
        cctx.fillStyle = pickleGradient;
        roundedRect(left, y, item.width, item.height, 6); cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#d4ec72';
        for (let i = 0; i < 5; i++) {
          cctx.beginPath(); cctx.arc(left + 10 + i * 13, y + 5 + (i % 2) * 2, 1.4, 0, Math.PI * 2); cctx.fill();
        }
      } else if (item.type === 'egg') {
        cctx.fillStyle = '#fffdf0';
        cctx.beginPath();
        cctx.ellipse(x, y + item.height / 2, item.width / 2, item.height / 2, 0, 0, Math.PI * 2);
        cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#ffb400';
        cctx.beginPath(); cctx.ellipse(x + 5, y + item.height / 2, 13, 5, 0, 0, Math.PI * 2); cctx.fill();
      } else if (item.type === 'avocado') {
        cctx.fillStyle = '#7fbe42';
        roundedRect(left, y, item.width, item.height, 7); cctx.fill(); cctx.stroke();
        cctx.fillStyle = '#c7e879';
        roundedRect(left + 8, y + 3, item.width - 16, item.height - 6, 4); cctx.fill();
        cctx.fillStyle = '#8a5a2b';
        cctx.beginPath(); cctx.ellipse(x + 12, y + item.height / 2, 5, 3.5, 0, 0, Math.PI * 2); cctx.fill();
      }
      cctx.restore();
    }

    function drawScene() {
      const sky = cctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#bde8ff'); sky.addColorStop(0.7, '#f8f3d4'); sky.addColorStop(1, '#f2c879');
      cctx.fillStyle = sky; cctx.fillRect(0, 0, W, H);
      cctx.fillStyle = 'rgba(255,255,255,0.75)';
      [[45,48,32],[270,76,39],[155,112,25]].forEach(cloud => {
        cctx.beginPath(); cctx.arc(cloud[0], cloud[1], cloud[2] * 0.55, 0, Math.PI * 2); cctx.arc(cloud[0] + 22, cloud[1] + 3, cloud[2] * 0.42, 0, Math.PI * 2); cctx.fill();
      });
      cctx.fillStyle = '#d59a50'; cctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
      cctx.strokeStyle = '#a6672f'; cctx.lineWidth = 3; cctx.beginPath(); cctx.moveTo(0, FLOOR_Y); cctx.lineTo(W, FLOOR_Y); cctx.stroke();
    }

    function drawCompletedSandwiches() {
      if (!sandwiches) return;
      const positions = [18, 45, 72, 99, W - 99, W - 72, W - 45, W - 18];
      const visible = Math.min(sandwiches, positions.length);
      cctx.save();
      cctx.font = '23px system-ui';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      for (let i = 0; i < visible; i++) cctx.fillText('🥪', positions[i], 457);
      if (sandwiches > positions.length) {
        cctx.font = 'bold 11px Comic Sans MS, system-ui';
        cctx.fillStyle = '#3b2417';
        cctx.fillText('+' + (sandwiches - positions.length), W - 18, 444);
      }
      cctx.restore();
    }

    function drawCharacter() {
      cctx.save();
      cctx.strokeStyle = '#3b2417'; cctx.lineWidth = 5; cctx.lineCap = 'round';
      cctx.fillStyle = '#4f86f7'; roundedRect(plateX - 25, 411, 50, 42, 12); cctx.fill(); cctx.stroke();
      cctx.fillStyle = '#f4b183'; cctx.beginPath(); cctx.arc(plateX, 399, 23, 0, Math.PI * 2); cctx.fill(); cctx.stroke();
      cctx.fillStyle = '#3b2417'; cctx.beginPath(); cctx.arc(plateX - 7, 397, 2.3, 0, Math.PI * 2); cctx.arc(plateX + 7, 397, 2.3, 0, Math.PI * 2); cctx.fill();
      cctx.beginPath(); cctx.arc(plateX, 405, 7, 0.2, Math.PI - 0.2); cctx.stroke();
      cctx.beginPath(); cctx.moveTo(plateX - 21, 421); cctx.lineTo(plateX - 48, 373); cctx.moveTo(plateX + 21, 421); cctx.lineTo(plateX + 48, 373); cctx.stroke();
      cctx.fillStyle = '#f4b183'; cctx.beginPath(); cctx.arc(plateX - 48, 373, 7, 0, Math.PI * 2); cctx.arc(plateX + 48, 373, 7, 0, Math.PI * 2); cctx.fill();
      cctx.fillStyle = '#f7f7f7';
      cctx.beginPath(); cctx.ellipse(plateX, PLATE_Y + 9, 60, 12, 0, 0, Math.PI * 2); cctx.fill(); cctx.strokeStyle = '#64808d'; cctx.lineWidth = 3; cctx.stroke();
      cctx.fillStyle = '#d8edf2'; cctx.beginPath(); cctx.ellipse(plateX, PLATE_Y + 7, 46, 6, 0, 0, Math.PI * 2); cctx.fill();
      cctx.restore();
    }

    function overlay(text) {
      cctx.fillStyle = 'rgba(59,36,23,0.88)'; roundedRect(W / 2 - 118, 185, 236, 48, 12); cctx.fill();
      cctx.strokeStyle = '#ffe06a'; cctx.lineWidth = 3; cctx.stroke();
      cctx.fillStyle = '#ffe06a'; cctx.font = 'bold 18px Comic Sans MS, system-ui'; cctx.textAlign = 'center';
      cctx.fillText(text, W / 2, 216);
    }

    function draw() {
      drawScene();
      drawCharacter();
      if (collapsePieces.length) {
        collapsePieces.forEach(piece => {
          cctx.save();
          cctx.translate(piece.x, piece.y + piece.height / 2);
          cctx.rotate(piece.angle);
          drawIngredient(piece, 0, -piece.height / 2);
          cctx.restore();
        });
      } else {
        const sway = wobble ? Math.sin(performance.now() / 65) * wobble : 0;
        cctx.save();
        cctx.translate(plateX, PLATE_Y);
        cctx.rotate(towerTilt);
        cctx.translate(-plateX, -PLATE_Y);
        stack.forEach((item, index) => {
          drawIngredient(
            item,
            plateX + item.offset + sway * (index + 1) / Math.max(1, stack.length),
            item.y
          );
        });
        cctx.restore();
        if (falling) {
          cctx.save();
          cctx.translate(falling.x, falling.y + falling.height / 2);
          cctx.rotate(falling.angle || 0);
          drawIngredient(falling, 0, -falling.height / 2);
          cctx.restore();
        }
      }
      drawCompletedSandwiches();
      if (floatText && floatText.life > 0) {
        cctx.save(); cctx.globalAlpha = Math.min(1, floatText.life / 20);
        cctx.font = 'bold 17px Comic Sans MS, system-ui'; cctx.textAlign = 'center';
        cctx.strokeStyle = '#3b2417'; cctx.lineWidth = 5; cctx.strokeText(floatText.text, W / 2, 150);
        cctx.fillStyle = '#ffe06a'; cctx.fillText(floatText.text, W / 2, 150); cctx.restore();
      }
      if (!running && !gameOver) overlay('▶ PRESIONA START');
      if (paused) overlay('⏸ PAUSA');
    }

    function movePlateTo(x) {
      plateX = Math.max(58, Math.min(W - 58, x));
    }

    function frame(now) {
      if (!running || gameOver || paused) return;
      const dt = lastAt ? Math.min(0.034, (now - lastAt) / 1000) : 0;
      lastAt = now;
      if (leftHeld) movePlateTo(plateX - 245 * dt);
      if (rightHeld) movePlateTo(plateX + 245 * dt);
      updateTowerBalance(dt);
      if (gameOver) return;
      if (falling) {
        let heldByEdge = false;
        if (falling.sliding) {
          falling.x += falling.vx * dt;
          falling.angle += Math.sign(falling.vx) * 1.45 * dt;
          heldByEdge = horizontalOverlap(
            falling.x - falling.width / 2,
            falling.x + falling.width / 2,
            falling.slideLeft,
            falling.slideRight
          ) > 0;
          if (heldByEdge) {
            falling.y = falling.ignoreLandingY;
          } else {
            falling.sliding = false;
            falling.y += 1.6;
          }
        }
        if (!heldByEdge) {
          const landing = findLanding(falling);
          const nextY = falling.y + falling.speed * dt;
          if (nextY >= landing.y) {
            falling.y = landing.y;
            landIngredient(landing);
          } else {
            falling.y = nextY;
          }
        }
      }
      if (gameOver) return;
      if (wobble > 0.05) wobble *= Math.pow(0.16, dt); else wobble = 0;
      if (floatText && --floatText.life <= 0) floatText = null;
      draw();
      raf = requestAnimationFrame(frame);
    }

    document.addEventListener('keydown', event => {
      if (isTypingTarget(event) || !running || gameOver) return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { leftHeld = true; event.preventDefault(); }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { rightHeld = true; event.preventDefault(); }
    });
    document.addEventListener('keyup', event => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') leftHeld = false;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') rightHeld = false;
    });

    function pointerX(event) {
      const rect = canvas.getBoundingClientRect();
      return (event.clientX - rect.left) * W / rect.width;
    }
    canvas.addEventListener('pointerdown', event => {
      if (!running || gameOver) return;
      pointerActive = true;
      if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
      movePlateTo(pointerX(event));
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointerActive || !running || gameOver) return;
      movePlateTo(pointerX(event));
      event.preventDefault();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, () => { pointerActive = false; }));

    wrap.querySelectorAll('[data-sw-dir]').forEach(button => {
      const direction = button.dataset.swDir;
      const setHeld = value => {
        if (direction === 'left') leftHeld = value;
        else rightHeld = value;
      };
      button.addEventListener('pointerdown', event => { if (running && !gameOver) { setHeld(true); event.preventDefault(); } });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => button.addEventListener(type, () => setHeld(false)));
    });

    autoPause(wrap,
      () => {
        if (running && !gameOver) {
          paused = true;
          cancelAnimationFrame(raf);
          unlockScroll();
          draw();
        }
      },
      () => {
        if (!paused || gameOver) return;
        paused = false;
        lastAt = 0;
        lockScroll();
        if (!falling && !serving) spawnIngredient();
        draw();
        raf = requestAnimationFrame(frame);
      }
    );

    if (typeof MutationObserver !== 'undefined') {
      const cleanupObserver = new MutationObserver(() => {
        if (!document.body.contains(wrap)) {
          running = false;
          gameOver = true;
          leftHeld = false;
          rightHeld = false;
          cancelAnimationFrame(raf);
          unlockScroll();
          cleanupObserver.disconnect();
        }
      });
      cleanupObserver.observe(document.body, { childList: true, subtree: true });
    }

    startButton.addEventListener('click', () => {
      reset();
      running = true;
      startButton.disabled = true;
      lockScroll();
      spawnIngredient();
      lastAt = 0;
      raf = requestAnimationFrame(frame);
    });

    reset();
    draw();
  });

})(typeof window !== 'undefined' ? window : this);
