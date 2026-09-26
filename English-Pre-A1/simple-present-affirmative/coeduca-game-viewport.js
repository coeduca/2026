/* Vista ampliada compartida por los juegos de las páginas generadas. */
(function (global) {
  'use strict';

  if (!document.getElementById('coeduca-game-viewport-styles')) {
    const style = document.createElement('style');
    style.id = 'coeduca-game-viewport-styles';
    style.textContent = `
      html.coeduca-viewport-open, body.coeduca-viewport-open { overflow:hidden !important; overscroll-behavior:none; }
      .coeduca-game-viewport { position:fixed; inset:0; z-index:2147483647; display:flex; flex-direction:column; width:100vw; height:100vh; height:100dvh; padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left)); background:#eaf7ff; color:#22324a; font-family:system-ui,sans-serif; box-sizing:border-box; }
      .coeduca-game-viewport * { box-sizing:border-box; }
      .coeduca-viewport-header { display:flex; align-items:center; justify-content:space-between; gap:12px; flex:none; width:min(100%,1000px); margin:0 auto 10px; }
      .coeduca-viewport-title { min-width:0; margin:0; font-size:clamp(18px,3vw,26px); font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .coeduca-viewport-actions { display:flex; align-items:center; gap:10px; flex:none; }
      .coeduca-viewport-actions .coeduca-game-sound-toggle { position:static !important; inset:auto !important; margin:0 !important; flex:none; }
      .coeduca-viewport-close { min-height:42px; padding:8px 14px; border:2px solid #22324a; border-radius:12px; background:#fff; color:#22324a; font:800 13px system-ui,sans-serif; cursor:pointer; }
      .coeduca-viewport-close:focus-visible { outline:3px solid #147b69; outline-offset:3px; }
      .coeduca-viewport-content { display:flex; flex-direction:column; flex:1; min-height:0; width:100%; overflow:auto; overscroll-behavior:contain; }
      .coeduca-viewport-content > * { width:min(100%,var(--viewport-game-width,700px)); max-width:none !important; margin:auto !important; flex:none; }
      .coeduca-viewport-content canvas, .coeduca-viewport-content svg { max-width:100%; }
      .coeduca-game-viewport[data-game="snake"] { --viewport-game-width:600px; touch-action:none; }
      .coeduca-game-viewport[data-game="snake"] .coeduca-viewport-content { overflow:hidden; }
      .coeduca-game-viewport[data-game="snake"] #snake-canvas { display:block; max-width:100%; height:auto; margin-inline:auto; }
      .coeduca-game-viewport[data-game="snake"] .cg-snake-controls, .coeduca-game-viewport[data-game="snake"] .cv-snake-controls { margin-top:6px; gap:4px; }
      .coeduca-game-viewport[data-game="snake"] .cg-snake-dpad, .coeduca-game-viewport[data-game="snake"] .cv-snake-dpad { display:flex; justify-content:center; gap:6px; }
      .coeduca-game-viewport[data-game="snake"] .cg-snake-dpad > span, .coeduca-game-viewport[data-game="snake"] .cv-snake-dpad > span { display:none; }
      .coeduca-game-viewport[data-game="snake"] .cg-snake-dir, .coeduca-game-viewport[data-game="snake"] .cv-snake-dir { flex:none; width:48px; height:48px; }
      .coeduca-game-viewport[data-game="snake"] #snake-start:disabled { display:none; }
      .coeduca-game-viewport[data-game="snake"] #snake-status { margin-top:4px; }
      .coeduca-game-viewport[data-game="pills"] { --viewport-game-width:550px; }
      .coeduca-game-viewport[data-game="pills"] #pl-canvas { display:block; max-width:100%; height:auto; margin-inline:auto; }
      .coeduca-game-viewport[data-game="pills"] .cg-snake-controls, .coeduca-game-viewport[data-game="pills"] .cv-snake-controls { margin-top:6px; gap:4px; }
      .coeduca-game-viewport[data-game="pills"] .cg-snake-dpad, .coeduca-game-viewport[data-game="pills"] .cv-snake-dpad { display:flex; justify-content:center; gap:6px; }
      .coeduca-game-viewport[data-game="pills"] .cg-snake-dpad > span, .coeduca-game-viewport[data-game="pills"] .cv-snake-dpad > span { display:none; }
      .coeduca-game-viewport[data-game="pills"] .cg-snake-dir, .coeduca-game-viewport[data-game="pills"] .cv-snake-dir { flex:none; width:48px; height:48px; }
      .coeduca-game-viewport[data-game="pills"] #pl-start:disabled { display:none; }
      .coeduca-game-viewport[data-game="pills"] .cg-snake-controls > div:last-child, .coeduca-game-viewport[data-game="pills"] .cv-snake-controls > div:last-child { display:none; }
      .coeduca-game-viewport[data-game="pills"] .cg-progress-bar, .coeduca-game-viewport[data-game="pills"] .cv-progress-bar { margin-block:4px 8px; }
      .coeduca-game-viewport[data-game="pills"] #pl-status { margin-top:4px; }
      .coeduca-game-viewport[data-game="dino"] { --viewport-game-width:1000px; touch-action:none; }
      .coeduca-game-viewport[data-game="dino"] .coeduca-viewport-content > * { margin:0 auto !important; }
      .coeduca-game-viewport[data-game="dino"] #dino-canvas { width:100%; height:auto; }
      .coeduca-game-viewport[data-game="sandwich"] { --viewport-game-width:620px; }
      .coeduca-game-viewport[data-game="sandwich"] #sw-canvas { display:block; max-width:100%; height:auto; margin-inline:auto; }
      .coeduca-game-viewport[data-game="sandwich"] .sw-help { display:none; }
      .coeduca-game-viewport[data-game="sandwich"] .sw-heading { margin-bottom:6px; }
      .coeduca-game-viewport[data-game="sandwich"] .sw-goal { margin-top:6px; }
      .coeduca-game-viewport[data-game="sandwich"] .sw-progress { margin-bottom:6px; }
      .coeduca-game-viewport[data-game="sandwich"] .sw-balance { margin-block:6px; }
      .coeduca-game-viewport[data-game="sandwich"] .sw-status { margin-bottom:0; }
      .coeduca-game-viewport[data-game="doodle"] { --viewport-game-width:620px; }
      .coeduca-game-viewport[data-game="doodle"] .cj-canvas { width:min(100%,max(220px,calc(72dvh - 166px))); height:auto; margin-inline:auto; }
      .coeduca-game-viewport[data-game="tictactoe"] { --viewport-game-width:660px; }
      .coeduca-game-viewport[data-game="hangman"] { --viewport-game-width:760px; }
      .coeduca-game-viewport[data-game="trivia"] { --viewport-game-width:800px; }
      .coeduca-result-screen { position:absolute; z-index:5; display:flex; align-items:center; justify-content:center; padding:8px; border-radius:16px; background:rgba(18,34,55,.84); box-sizing:border-box; }
      .coeduca-result-screen.is-inline { position:relative; width:100%; min-height:240px; margin-top:14px; }
      .coeduca-result-card { width:min(100%,440px); max-height:100%; overflow:auto; padding:12px; border:3px solid #22324a; border-radius:18px; background:#fff9ed; color:#22324a; box-shadow:4px 4px 0 #22324a; font-family:system-ui,sans-serif; text-align:center; box-sizing:border-box; }
      .coeduca-result-kicker { margin:0 0 2px; color:#147b69; font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
      .coeduca-result-title { margin:0; font-size:clamp(19px,4vw,27px); line-height:1.1; }
      .coeduca-result-outcome { margin:4px 0 9px; font-size:12px; font-weight:800; overflow-wrap:anywhere; }
      .coeduca-result-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }
      .coeduca-result-stat { min-width:0; padding:5px 4px; border:2px solid #22324a; border-radius:10px; background:#eaf7ff; }
      .coeduca-result-stat:first-child { grid-column:1 / -1; background:#fff0b8; }
      .coeduca-result-stat small { display:block; font-size:9px; font-weight:900; line-height:1.15; letter-spacing:.02em; text-transform:uppercase; }
      .coeduca-result-stat strong { display:block; margin-top:2px; font-size:clamp(17px,4vw,25px); line-height:1.05; overflow-wrap:anywhere; }
      .coeduca-result-stat span { display:block; margin-top:1px; font-size:9px; font-weight:700; }
      .coeduca-result-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin-top:9px; }
      .coeduca-result-actions button { min-height:34px; padding:5px 9px; border:2px solid #22324a; border-radius:9px; background:#fff; color:#22324a; box-shadow:2px 2px 0 #22324a; font:800 11px system-ui,sans-serif; cursor:pointer; }
      .coeduca-result-actions .coeduca-result-replay { background:#ffd747; }
      .coeduca-result-actions button:focus-visible { outline:3px solid #147b69; outline-offset:3px; }
      .coeduca-result-screen.is-short .coeduca-result-card { width:min(100%,540px); padding:6px 9px; }
      .coeduca-result-screen.is-short .coeduca-result-kicker { display:none; }
      .coeduca-result-screen.is-short .coeduca-result-title { font-size:16px; }
      .coeduca-result-screen.is-short .coeduca-result-outcome { margin:2px 0 4px; font-size:10px; }
      .coeduca-result-screen.is-short .coeduca-result-stats { grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; }
      .coeduca-result-screen.is-short .coeduca-result-stat { padding:3px; }
      .coeduca-result-screen.is-short .coeduca-result-stat:first-child { grid-column:auto; }
      .coeduca-result-screen.is-short .coeduca-result-stat small, .coeduca-result-screen.is-short .coeduca-result-stat span { font-size:8px; }
      .coeduca-result-screen.is-short .coeduca-result-stat strong { font-size:17px; }
      .coeduca-result-screen.is-short .coeduca-result-actions { margin-top:4px; }
      .coeduca-result-screen.is-short .coeduca-result-actions button { min-height:26px; padding:2px 7px; }
      .coeduca-result-screen.is-tiny { padding:3px; }
      .coeduca-result-screen.is-tiny .coeduca-result-card { padding:3px 5px; }
      .coeduca-result-screen.is-tiny .coeduca-result-title, .coeduca-result-screen.is-tiny .coeduca-result-outcome, .coeduca-result-screen.is-tiny .coeduca-result-stat span { display:none; }
      .coeduca-result-screen.is-tiny .coeduca-result-actions { margin-top:3px; }
      .coeduca-result-screen.is-narrow .coeduca-result-card { padding:7px; }
      .coeduca-result-screen.is-narrow .coeduca-result-stat strong { font-size:18px; }
      @media (prefers-reduced-motion:no-preference) { .coeduca-result-card { animation:coeduca-result-in .24s ease-out; } }
      @keyframes coeduca-result-in { from { opacity:0; transform:translateY(18px) scale(.96); } to { opacity:1; transform:none; } }
      @media (max-height:600px) { .coeduca-viewport-content > * { margin:0 auto !important; } }
      @media (max-width:480px) { .coeduca-viewport-header { gap:8px; } .coeduca-viewport-close { padding-inline:10px; } }
    `;
    document.head.appendChild(style);
  }

  function create(wrap, options) {
    const game = options.game;
    const title = options.title;
    const soundToggle = options.soundToggle || null;
    let placeholder = null;
    let overlay = null;
    let soundParent = null;
    let soundNextSibling = null;
    let fullscreenRequest = null;
    let animation = null;
    let closing = false;
    let destroyed = false;
    const dinoHolder = game === 'dino' ? wrap.querySelector('#dino-canvas')?.parentElement : null;
    const dinoHolderWidth = dinoHolder ? dinoHolder.style.width : '';
    const tallCanvas = game === 'snake' ? wrap.querySelector('#snake-canvas')
      : game === 'pills' ? wrap.querySelector('#pl-canvas')
      : game === 'sandwich' ? wrap.querySelector('#sw-canvas') : null;
    const onBackgroundPress = options.onBackgroundPress;
    const onBackgroundRelease = options.onBackgroundRelease;
    let backgroundPointerId = null;

    function releaseBackgroundPointer(event) {
      if (backgroundPointerId === null || event.pointerId !== backgroundPointerId) return;
      backgroundPointerId = null;
      if (onBackgroundRelease) onBackgroundRelease(event);
    }

    function fitTallGame() {
      if (!overlay || !tallCanvas) return;
      const content = overlay.querySelector('.coeduca-viewport-content');
      tallCanvas.style.width = '';
      const canvasHeight = tallCanvas.getBoundingClientRect().height;
      const otherHeight = Math.max(0, wrap.scrollHeight - canvasHeight);
      const availableHeight = Math.max(120, content.clientHeight - otherHeight - 8);
      const width = Math.min(wrap.clientWidth, availableHeight * tallCanvas.width / tallCanvas.height);
      tallCanvas.style.width = Math.max(1, width) + 'px';
    }

    function reducedMotion() {
      return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function restore() {
      if (!placeholder) return;
      if (backgroundPointerId !== null) {
        backgroundPointerId = null;
        if (onBackgroundRelease) onBackgroundRelease();
      }
      if (animation) { animation.cancel(); animation = null; }
      if (placeholder.parentNode) placeholder.parentNode.insertBefore(wrap, placeholder);
      else wrap.remove();
      placeholder.remove();
      placeholder = null;
      if (soundToggle && soundParent && soundParent.isConnected) {
        soundParent.insertBefore(soundToggle,
          soundNextSibling && soundNextSibling.parentNode === soundParent ? soundNextSibling : null);
      }
      soundParent = null;
      soundNextSibling = null;
      if (dinoHolder) dinoHolder.style.width = dinoHolderWidth;
      if (tallCanvas) tallCanvas.style.width = '';
      if (overlay) overlay.remove();
      overlay = null;
      fullscreenRequest = null;
      closing = false;
      document.documentElement.classList.remove('coeduca-viewport-open');
      document.body.classList.remove('coeduca-viewport-open');
      global.removeEventListener('resize', fitTallGame);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' && placeholder) leave();
    }

    function onFullscreenChange() {
      if (document.fullscreenElement === overlay) fitTallGame();
      if (placeholder && !closing && fullscreenRequest && !document.fullscreenElement) leave();
    }

    function enter() {
      if (placeholder || closing || destroyed || !wrap.parentNode) return;
      const startRect = wrap.getBoundingClientRect();
      placeholder = document.createElement('div');
      placeholder.style.cssText = `width:${startRect.width}px;height:${startRect.height}px;margin:0 auto;`;
      wrap.parentNode.insertBefore(placeholder, wrap);
      overlay = document.createElement('div');
      overlay.className = 'coeduca-game-viewport';
      overlay.dataset.game = game;
      const header = document.createElement('div');
      header.className = 'coeduca-viewport-header';
      const heading = document.createElement('h2');
      heading.className = 'coeduca-viewport-title';
      heading.textContent = title;
      const actions = document.createElement('div');
      actions.className = 'coeduca-viewport-actions';
      if (soundToggle) {
        soundParent = soundToggle.parentNode;
        soundNextSibling = soundToggle.nextSibling;
        actions.appendChild(soundToggle);
      }
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'coeduca-viewport-close';
      close.textContent = '↙ Reducir';
      close.setAttribute('aria-label', 'Salir de la vista ampliada');
      close.addEventListener('click', leave);
      actions.appendChild(close);
      header.append(heading, actions);
      const content = document.createElement('div');
      content.className = 'coeduca-viewport-content';
      content.appendChild(wrap);
      if (dinoHolder) dinoHolder.style.width = '100%';
      overlay.append(header, content);
      if (onBackgroundPress) {
        overlay.addEventListener('pointerdown', event => {
          if (backgroundPointerId !== null || !event.isPrimary) return;
          if (event.target.closest('.coeduca-viewport-actions, button, a, input, select, textarea, canvas')) return;
          if (onBackgroundPress(event) === false) return;
          backgroundPointerId = event.pointerId;
          overlay.setPointerCapture(event.pointerId);
          if (event.pointerType === 'touch') event.preventDefault();
        });
        overlay.addEventListener('pointerup', releaseBackgroundPointer);
        overlay.addEventListener('pointercancel', releaseBackgroundPointer);
        overlay.addEventListener('lostpointercapture', releaseBackgroundPointer);
      }
      document.body.appendChild(overlay);
      document.documentElement.classList.add('coeduca-viewport-open');
      document.body.classList.add('coeduca-viewport-open');
      global.addEventListener('resize', fitTallGame);
      fitTallGame();
      if (tallCanvas) global.requestAnimationFrame(fitTallGame);
      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('fullscreenchange', onFullscreenChange);
      if (overlay.animate && !reducedMotion()) {
        const endRect = overlay.getBoundingClientRect();
        animation = overlay.animate([
          { transform: `translate(${startRect.left - endRect.left}px,${startRect.top - endRect.top}px) scale(${startRect.width / endRect.width},${startRect.height / endRect.height})`, opacity:0.8 },
          { transform:'none', opacity:1 }
        ], { duration:320, easing:'ease-out' });
        animation.onfinish = () => { animation = null; };
      }
      if (overlay.requestFullscreen) {
        try {
          fullscreenRequest = Promise.resolve(overlay.requestFullscreen({ navigationUI:'hide' }))
            .catch(() => {})
            .then(() => { if ((closing || destroyed) && document.fullscreenElement === overlay) return document.exitFullscreen(); });
        } catch (_) { /* La vista fija funciona sin la API de pantalla completa. */ }
      }
    }

    function leave() {
      if (!placeholder || closing) return;
      closing = true;
      overlay.style.pointerEvents = 'none';
      Promise.resolve(fullscreenRequest).catch(() => {}).then(() => {
        if (document.fullscreenElement === overlay) return document.exitFullscreen().catch(() => {});
      }).finally(() => {
        if (!placeholder) return;
        if (animation) { animation.cancel(); animation = null; }
        if (!overlay.animate || reducedMotion() || !placeholder.isConnected) { restore(); return; }
        const from = overlay.getBoundingClientRect();
        const to = placeholder.getBoundingClientRect();
        animation = overlay.animate([
          { transform:'none', opacity:1 },
          { transform:`translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})`, opacity:0.85 }
        ], { duration:380, easing:'ease-in-out' });
        animation.onfinish = restore;
      });
    }

    function destroy() {
      destroyed = true;
      if (document.fullscreenElement === overlay && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      closing = true;
      restore();
      observer.disconnect();
    }

    const observer = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => {
          if (placeholder && !placeholder.isConnected) destroy();
          else if (!placeholder && !wrap.isConnected) observer.disconnect();
        })
      : { observe() {}, disconnect() {} };
    observer.observe(document.body, { childList:true, subtree:true });
    return { enter, leave, destroy };
  }

  global.COEDUCA_GAME_VIEWPORT = { create };

  let activeResult = null;
  function createResult(ctx, game, wrap) {
    const studentId = ctx && ctx.student && ctx.student.nie ? String(ctx.student.nie) : 'anon';
    const bestKey = 'coeduca-game-best-v1-' + game + '-' + studentId;
    let screen = null;
    let previousFocus = null;
    let removalObserver = null;
    let sizeObserver = null;
    let positionedHost = null;
    let originalPosition = '';
    const startSelector = {
      tictactoe:'#ttt-reset', snake:'#snake-start', dino:'#dino-start',
      hangman:'#hm-reset', pills:'#pl-start', sandwich:'#sw-start',
      flappy:'.cf-start', doodle:'.cj-start'
    }[game];

    function validScore(value) {
      if (value === null || value === '') return null;
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) return null;
      return game === 'tictactoe'
        ? (number <= 1 && number * 2 === Math.round(number * 2) ? number : null)
        : (Number.isSafeInteger(number) ? number : null);
    }

    function readBest(key) {
      try { return validScore(localStorage.getItem(key)); }
      catch (_) { return null; }
    }

    function placeOnCanvas(canvas, host) {
      if (!screen || !canvas.isConnected || !host.isConnected) return;
      const canvasRect = canvas.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      screen.style.left = (canvasRect.left - hostRect.left + host.scrollLeft - host.clientLeft) + 'px';
      screen.style.top = (canvasRect.top - hostRect.top + host.scrollTop - host.clientTop) + 'px';
      screen.style.width = canvasRect.width + 'px';
      screen.style.height = canvasRect.height + 'px';
      screen.classList.toggle('is-short', canvasRect.height < 230);
      screen.classList.toggle('is-tiny', canvasRect.height < 135);
      screen.classList.toggle('is-narrow', canvasRect.width < 280);
    }

    function hide() {
      if (!screen) return;
      if (removalObserver) { removalObserver.disconnect(); removalObserver = null; }
      if (sizeObserver) { sizeObserver.disconnect(); sizeObserver = null; }
      global.removeEventListener('resize', updatePosition);
      wrap.removeEventListener('click', onGameControlClick, true);
      const hadFocus = screen.contains(document.activeElement);
      screen.remove();
      screen = null;
      if (positionedHost) positionedHost.style.position = originalPosition;
      positionedHost = null;
      if (activeResult === hide) activeResult = null;
      if (hadFocus && previousFocus && previousFocus.isConnected) previousFocus.focus();
      previousFocus = null;
    }

    function onGameControlClick(event) {
      if (screen && startSelector && event.target.closest(startSelector)) hide();
    }

    function updatePosition() {
      if (screen && positionedHost) placeOnCanvas(wrap.querySelector('canvas'), positionedHost);
    }

    function afterGameRestores(callback) {
      const expanded = () => Boolean(wrap.closest('.coeduca-game-viewport')) ||
        wrap.classList.contains('is-expanded');
      if (!expanded()) { if (wrap.isConnected) callback(); return; }
      const observer = new MutationObserver(() => {
        if (!wrap.isConnected) { observer.disconnect(); return; }
        if (expanded()) return;
        observer.disconnect();
        callback();
      });
      observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    }

    function show({ score = 0, points = 0, outcome = '', unit = 'puntos', replay }) {
      if (activeResult) activeResult();
      const currentScore = validScore(score) ?? 0;
      const localBest = readBest(bestKey) ?? 0;
      const rankingBest = studentId === 'anon' ? 0 : (readBest('coeduca-ranking-' + game + '-' + studentId) ?? 0);
      let previousBest = Math.max(localBest, rankingBest);
      try {
        if (currentScore > localBest) localStorage.setItem(bestKey, String(currentScore));
      } catch (_) { /* El resultado sigue visible si el almacenamiento está deshabilitado. */ }
      const format = value => Number(value).toLocaleString('es-ES', {
        maximumFractionDigits:game === 'tictactoe' ? 1 : 0
      });
      const formatPoints = value => Number(value).toLocaleString('es-ES', { maximumFractionDigits:1 });
      previousFocus = document.activeElement;
      screen = document.createElement('div');
      screen.className = 'coeduca-result-screen';
      const card = document.createElement('section');
      card.className = 'coeduca-result-card';
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', 'Resultado de la partida');
      const kicker = document.createElement('p');
      kicker.className = 'coeduca-result-kicker';
      kicker.textContent = 'Resultado de la partida';
      const title = document.createElement('h2');
      title.className = 'coeduca-result-title';
      title.textContent = 'FIN DE PARTIDA';
      const summary = document.createElement('p');
      summary.className = 'coeduca-result-outcome';
      summary.textContent = outcome;
      const stats = document.createElement('div');
      stats.className = 'coeduca-result-stats';
      for (const [label, value, caption] of [
        ['Puntaje', format(currentScore), unit],
        ['Puntos extra', '+' + formatPoints(Math.max(0, Number(points) || 0)), 'bonos logrados'],
        ['Mejor puntaje', format(Math.max(currentScore, previousBest)), currentScore > previousBest ? '¡Nueva marca personal!' : unit + ' · marca personal']
      ]) {
        const stat = document.createElement('div');
        stat.className = 'coeduca-result-stat';
        const small = document.createElement('small');
        small.textContent = label;
        const strong = document.createElement('strong');
        strong.textContent = value;
        const note = document.createElement('span');
        note.textContent = caption;
        stat.append(small, strong, note);
        stats.appendChild(stat);
      }
      const bestValue = stats.lastElementChild.querySelector('strong');
      const bestCaption = stats.lastElementChild.querySelector('span');
      bestValue.setAttribute('aria-live', 'polite');
      const actions = document.createElement('div');
      actions.className = 'coeduca-result-actions';
      if (replay) {
        const again = document.createElement('button');
        again.type = 'button';
        again.className = 'coeduca-result-replay';
        again.textContent = '↻ Jugar otra vez';
        again.addEventListener('click', () => { hide(); afterGameRestores(replay); });
        actions.appendChild(again);
      }
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Cerrar';
      close.addEventListener('click', hide);
      actions.appendChild(close);
      card.append(kicker, title, summary, stats, actions);
      screen.appendChild(card);
      const canvas = wrap.querySelector('canvas');
      if (canvas && canvas.parentElement) {
        positionedHost = canvas.parentElement;
        originalPosition = positionedHost.style.position;
        if (global.getComputedStyle(positionedHost).position === 'static') positionedHost.style.position = 'relative';
        positionedHost.appendChild(screen);
        updatePosition();
        if (typeof ResizeObserver !== 'undefined') {
          sizeObserver = new ResizeObserver(updatePosition);
          sizeObserver.observe(canvas);
          sizeObserver.observe(positionedHost);
        }
        global.addEventListener('resize', updatePosition);
        global.requestAnimationFrame(updatePosition);
      } else {
        screen.classList.add('is-inline');
        wrap.appendChild(screen);
      }
      if (typeof MutationObserver !== 'undefined') {
        removalObserver = new MutationObserver(() => { if (!wrap.isConnected) hide(); });
        removalObserver.observe(document.body, { childList:true, subtree:true });
      }
      if (startSelector) wrap.addEventListener('click', onGameControlClick, true);
      activeResult = hide;
      if (studentId !== 'anon' && global.COEDUCA_LEADERBOARD &&
          typeof global.COEDUCA_LEADERBOARD.getPersonalBest === 'function') {
        const currentScreen = screen;
        global.COEDUCA_LEADERBOARD.getPersonalBest(ctx, game).then(remoteBest => {
          if (screen !== currentScreen || remoteBest === null) return;
          previousBest = Math.max(previousBest, remoteBest);
          bestValue.textContent = format(Math.max(currentScore, previousBest));
          bestCaption.textContent = currentScore > previousBest ? '¡Nueva marca personal!' : unit + ' · marca personal';
          try {
            const savedBest = readBest(bestKey) ?? 0;
            if (remoteBest > savedBest) localStorage.setItem(bestKey, String(remoteBest));
          } catch (_) { /* El ranking remoto sigue visible aunque falle el almacenamiento. */ }
        }).catch(error => console.warn('No se pudo consultar la mejor marca personal', error));
      }
      (actions.querySelector('.coeduca-result-replay') || close).focus();
    }

    return { show, hide };
  }

  global.COEDUCA_GAME_RESULTS = { create: createResult };
})(window);
