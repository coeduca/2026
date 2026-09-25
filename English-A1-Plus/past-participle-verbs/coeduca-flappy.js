/**
 * Flappy para COEDUCA. Mecánica de vuelo entre obstáculos dibujada en Canvas,
 * sin imágenes ni dependencias externas. Referencia investigada:
 * https://github.com/varunpant/CrappyBird (MIT); este código es propio.
 */
(function (global) {
  'use strict';

  const core = global.COEDUCA || global.CIVICA;
  if (!core || typeof core.registerGame !== 'function') return;

  if (!document.getElementById('coeduca-flappy-styles')) {
    const style = document.createElement('style');
    style.id = 'coeduca-flappy-styles';
    style.textContent = `
      .cf-game { max-width: 390px; margin: 0 auto; color: #22324a; font-family: system-ui, sans-serif; text-align: center; }
      .cf-game * { box-sizing: border-box; }
      .cf-heading { margin: 0 0 10px; font-size: 25px; font-weight: 900; }
      .cf-stats { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
      .cf-stat { flex: 1; padding: 8px 10px; border: 2px solid #22324a; border-radius: 13px; background: #fff; text-align: left; }
      .cf-stat:first-child { background: #ffe58b; }
      .cf-stat small { display: block; font-size: 10px; font-weight: 800; letter-spacing: 1px; }
      .cf-stat strong { display: block; font-size: 25px; line-height: 1.1; font-variant-numeric: tabular-nums; }
      .cf-canvas { display: block; width: 100%; height: auto; border: 3px solid #22324a; border-radius: 18px; background: #8eddf5; touch-action: none; box-shadow: 0 5px 0 #9fb5ba; cursor: pointer; }
      .cf-controls { display: flex; gap: 10px; margin-top: 14px; }
      .cf-button { flex: 1; min-height: 50px; padding: 8px 12px; border: 2px solid #22324a; border-radius: 13px; background: #fff; color: #22324a; font: 800 15px system-ui, sans-serif; cursor: pointer; box-shadow: 0 3px 0 #22324a; touch-action: manipulation; }
      .cf-button:active { transform: translateY(2px); box-shadow: 0 1px 0 #22324a; }
      .cf-button:focus-visible, .cf-canvas:focus-visible { outline: 3px solid #147b69; outline-offset: 3px; }
      .cf-primary { background: #ffe066; }
      .cf-help { margin: 12px 0 4px; font-size: 12px; line-height: 1.5; }
      .cf-status { min-height: 22px; margin: 5px 0; font-size: 13px; font-weight: 700; }
    `;
    document.head.appendChild(style);
  }

  core.registerGame('flappy', function (ctx) {
    const W = 360, H = 500, GROUND = 452;
    const BIRD_X = 92, BIRD_R = 14, PIPE_W = 64;
    const GRAVITY = 700, FLAP = -255;
    const goal = 10;

    const wrap = document.createElement('div');
    wrap.className = 'cf-game';
    wrap.tabIndex = 0;
    wrap.innerHTML = `
      <h3 class="cf-heading">🐦 Flappy</h3>
      <div class="cf-stats">
        <div class="cf-stat"><small>TUBOS SUPERADOS</small><strong class="cf-score" aria-live="polite">0</strong></div>
        <div class="cf-stat"><small>BONUS +1 EN NOTA</small><strong class="cf-goal"></strong></div>
      </div>
      <canvas class="cf-canvas" width="720" height="1000" tabindex="0"
        role="button" aria-label="Jugar Flappy. Toca o presiona espacio para aletear."></canvas>
      <div class="cf-controls">
        <button class="cf-button cf-primary cf-start" type="button">▶ Empezar</button>
        <button class="cf-button cf-flap" type="button">↑ Aletear</button>
      </div>
      <p class="cf-help">Supera 10 tubos para ganar un punto extra en tu nota final. Toca la pantalla, usa ↑, ESPACIO o Aletear.</p>
      <div class="cf-status" aria-live="polite">Pulsa Empezar para jugar.</div>
    `;
    ctx.container.appendChild(wrap);

    const canvas = wrap.querySelector('.cf-canvas');
    const paint = canvas.getContext('2d');
    if (!paint) {
      wrap.querySelector('.cf-status').textContent = 'Canvas no está disponible.';
      return;
    }
    paint.scale(2, 2);
    const scoreEl = wrap.querySelector('.cf-score');
    const goalEl = wrap.querySelector('.cf-goal');
    const statusEl = wrap.querySelector('.cf-status');
    const startButton = wrap.querySelector('.cf-start');
    goalEl.textContent = `${goal} tubos`;

    const leaderboard = global.COEDUCA_LEADERBOARD
      ? global.COEDUCA_LEADERBOARD.create(ctx, 'flappy', 1)
      : { submit: () => Promise.resolve(false) };

    let birdY = H * 0.45, birdVelocity = 0;
    let pipes = [], spawnClock = 0, score = 0, bonusEarned = false;
    let phase = 'ready', previousFrame = 0, frameId = null, scenery = 0;

    function reset() {
      birdY = H * 0.45;
      birdVelocity = 0;
      pipes = [];
      spawnClock = 0;
      score = 0;
      bonusEarned = false;
      scenery = 0;
      scoreEl.textContent = '0';
      phase = 'ready';
      previousFrame = 0;
    }

    function spawnPipe() {
      const gap = Math.max(132, 166 - score * 2);
      const half = gap / 2;
      const gapCenter = 115 + half + Math.random() * (GROUND - 150 - gap);
      pipes.push({ x: W + 10, top: gapCenter - half, bottom: gapCenter + half, passed: false });
    }

    function start() {
      if (frameId !== null) global.cancelAnimationFrame(frameId);
      reset();
      phase = 'playing';
      birdVelocity = FLAP;
      spawnClock = 0.9;
      startButton.textContent = '↻ Reiniciar';
      statusEl.textContent = '¡Aletea para pasar entre los tubos!';
      wrap.focus();
      frameId = global.requestAnimationFrame(tick);
    }

    function flap() {
      if (phase === 'ready' || phase === 'over') { start(); return; }
      if (phase === 'paused') {
        phase = 'playing';
        previousFrame = 0;
        statusEl.textContent = '¡Sigue volando!';
        frameId = global.requestAnimationFrame(tick);
      }
      if (phase !== 'playing') return;
      birdVelocity = FLAP;
    }

    function overlapsPipe(pipe) {
      if (BIRD_X + BIRD_R <= pipe.x || BIRD_X - BIRD_R >= pipe.x + PIPE_W) return false;
      const nearestX = Math.max(pipe.x, Math.min(BIRD_X, pipe.x + PIPE_W));
      const topY = Math.max(0, Math.min(birdY, pipe.top));
      const bottomY = Math.max(pipe.bottom, Math.min(birdY, GROUND));
      const topDx = BIRD_X - nearestX, topDy = birdY - topY;
      const bottomDy = birdY - bottomY;
      return topDx * topDx + topDy * topDy < BIRD_R * BIRD_R ||
        topDx * topDx + bottomDy * bottomDy < BIRD_R * BIRD_R;
    }

    function finish() {
      if (phase !== 'playing') return;
      phase = 'over';
      frameId = null;
      startButton.textContent = '↻ Reintentar';
      statusEl.textContent = score ? `Fin de la partida: ${score} tubos superados.` : 'Fin de la partida. ¡Inténtalo otra vez!';
      leaderboard.submit(score);
      if (!bonusEarned) ctx.onLose();
      draw();
    }

    function step(dt) {
      birdVelocity += GRAVITY * dt;
      birdY += birdVelocity * dt;
      scenery += dt * 45;
      spawnClock += dt;
      if (spawnClock >= Math.max(1.36, 1.65 - score * 0.012)) {
        spawnClock = 0;
        spawnPipe();
      }
      const speed = Math.min(178, 132 + score * 2);
      pipes.forEach(pipe => {
        pipe.x -= speed * dt;
        if (!pipe.passed && pipe.x + PIPE_W < BIRD_X - BIRD_R) {
          pipe.passed = true;
          score++;
          scoreEl.textContent = String(score);
          if (!bonusEarned && score >= goal) {
            bonusEarned = true;
            statusEl.textContent = '¡Ganaste +1 punto en tu nota final! Sigue para subir en el ranking.';
            ctx.onWin();
          }
        }
      });
      pipes = pipes.filter(pipe => pipe.x + PIPE_W > -4);
      if (birdY - BIRD_R <= 0 || birdY + BIRD_R >= GROUND || pipes.some(overlapsPipe)) finish();
    }

    function cloud(x, y, size) {
      paint.fillStyle = 'rgba(255,255,255,.82)';
      paint.beginPath();
      paint.arc(x, y, size * 0.55, 0, Math.PI * 2);
      paint.arc(x + size * 0.55, y - size * 0.15, size * 0.7, 0, Math.PI * 2);
      paint.arc(x + size * 1.2, y, size * 0.5, 0, Math.PI * 2);
      paint.fill();
    }

    function drawPipe(pipe) {
      paint.fillStyle = '#276b4f';
      paint.fillRect(pipe.x, 0, PIPE_W, pipe.top);
      paint.fillRect(pipe.x, pipe.bottom, PIPE_W, GROUND - pipe.bottom);
      paint.fillStyle = '#43b56a';
      paint.fillRect(pipe.x + 6, 0, 10, pipe.top);
      paint.fillRect(pipe.x + 6, pipe.bottom, 10, GROUND - pipe.bottom);
      paint.fillStyle = '#1d593f';
      paint.fillRect(pipe.x - 5, pipe.top - 22, PIPE_W + 10, 22);
      paint.fillRect(pipe.x - 5, pipe.bottom, PIPE_W + 10, 22);
      paint.fillStyle = '#62cc7a';
      paint.fillRect(pipe.x, pipe.top - 19, 10, 17);
      paint.fillRect(pipe.x, pipe.bottom + 2, 10, 17);
    }

    function drawBird() {
      paint.save();
      paint.translate(BIRD_X, birdY);
      paint.rotate(Math.max(-0.45, Math.min(1.0, birdVelocity / 400)));
      paint.lineJoin = 'round';
      paint.lineCap = 'round';

      // Cola de dos plumas, detrás del cuerpo.
      paint.fillStyle = '#d97535';
      paint.strokeStyle = '#78412f';
      paint.lineWidth = 2;
      paint.beginPath();
      paint.moveTo(-13, -3);
      paint.quadraticCurveTo(-20, -9, -25, -11);
      paint.lineTo(-22, -1);
      paint.lineTo(-28, 5);
      paint.quadraticCurveTo(-19, 8, -12, 5);
      paint.closePath();
      paint.fill();
      paint.stroke();

      // Pequeño copete para que la silueta se lea incluso en movimiento.
      paint.fillStyle = '#e9903f';
      paint.beginPath();
      paint.moveTo(-6, -12);
      paint.quadraticCurveTo(-8, -21, -2, -22);
      paint.quadraticCurveTo(0, -16, 1, -15);
      paint.quadraticCurveTo(3, -21, 7, -19);
      paint.lineTo(6, -12);
      paint.closePath();
      paint.fill();
      paint.stroke();

      const body = paint.createLinearGradient(-12, -15, 13, 14);
      body.addColorStop(0, '#fff1a3');
      body.addColorStop(0.52, '#ffd45c');
      body.addColorStop(1, '#ee993c');
      paint.fillStyle = body;
      paint.shadowColor = 'rgba(54, 67, 48, .25)';
      paint.shadowBlur = 5;
      paint.shadowOffsetY = 3;
      paint.beginPath();
      paint.ellipse(0, 0, 17, 15, 0, 0, Math.PI * 2);
      paint.fill();
      paint.shadowBlur = 0;
      paint.shadowOffsetY = 0;
      paint.stroke();

      // Barriga clara y ala que se mueve con el vuelo.
      paint.fillStyle = '#fff3bf';
      paint.beginPath();
      paint.ellipse(2, 6, 10, 6, -0.12, 0, Math.PI * 2);
      paint.fill();
      paint.save();
      paint.translate(-6, 2);
      paint.rotate(phase === 'playing' ? Math.sin(scenery * 0.32) * 0.42 : -0.18);
      paint.fillStyle = '#f5a844';
      paint.strokeStyle = '#a75c34';
      paint.lineWidth = 1.7;
      paint.beginPath();
      paint.ellipse(0, 0, 9, 6, -0.26, 0, Math.PI * 2);
      paint.fill();
      paint.stroke();
      paint.beginPath();
      paint.moveTo(-4, 1);
      paint.quadraticCurveTo(0, 4, 5, 1);
      paint.stroke();
      paint.restore();

      // Pico dividido, ojo brillante y mejilla.
      paint.fillStyle = '#e97832';
      paint.strokeStyle = '#88412b';
      paint.lineWidth = 1.6;
      paint.beginPath();
      paint.moveTo(12, 1);
      paint.quadraticCurveTo(22, 0, 28, 5);
      paint.quadraticCurveTo(21, 10, 13, 8);
      paint.closePath();
      paint.fill();
      paint.stroke();
      paint.beginPath();
      paint.moveTo(17, 5);
      paint.lineTo(26, 5);
      paint.stroke();
      paint.fillStyle = 'rgba(239, 118, 78, .42)';
      paint.beginPath();
      paint.arc(9, 6, 3.1, 0, Math.PI * 2);
      paint.fill();
      paint.fillStyle = '#fffdf5';
      paint.strokeStyle = '#78412f';
      paint.lineWidth = 1.5;
      paint.beginPath();
      paint.ellipse(8, -6, 5.5, 6.5, 0, 0, Math.PI * 2);
      paint.fill();
      paint.stroke();
      paint.fillStyle = '#213445';
      paint.beginPath();
      paint.arc(10, -5.5, 2.5, 0, Math.PI * 2);
      paint.fill();
      paint.fillStyle = '#fff';
      paint.beginPath();
      paint.arc(10.8, -6.5, 0.9, 0, Math.PI * 2);
      paint.fill();
      paint.restore();
    }

    function draw() {
      const sky = paint.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, '#67c7ef');
      sky.addColorStop(1, '#d4f4f5');
      paint.fillStyle = sky;
      paint.fillRect(0, 0, W, H);
      paint.fillStyle = '#ffe58b';
      paint.beginPath(); paint.arc(300, 74, 33, 0, Math.PI * 2); paint.fill();
      cloud(42 - scenery * 0.12 % 460, 83, 21);
      cloud(255 - scenery * 0.08 % 480, 150, 15);
      cloud(390 - scenery * 0.1 % 500, 45, 20);
      paint.fillStyle = '#a4d9a5';
      paint.beginPath();
      paint.moveTo(0, GROUND);
      for (let x = 0; x <= W; x += 6) paint.lineTo(x, GROUND - 35 - Math.sin((x + scenery * 0.3) / 33) * 15);
      paint.lineTo(W, GROUND); paint.closePath(); paint.fill();
      pipes.forEach(drawPipe);
      paint.fillStyle = '#457e4b';
      paint.fillRect(0, GROUND, W, H - GROUND);
      paint.fillStyle = '#8fd275';
      paint.fillRect(0, GROUND, W, 8);
      for (let x = -(scenery % 28); x < W; x += 28) {
        paint.fillStyle = '#6fa85e';
        paint.fillRect(x, GROUND + 18, 14, 3);
      }
      drawBird();
      if (phase === 'ready' || phase === 'over') {
        paint.fillStyle = 'rgba(26, 45, 58, .78)';
        paint.fillRect(31, 180, W - 62, 96);
        paint.fillStyle = '#fff';
        paint.textAlign = 'center';
        paint.font = '900 23px system-ui';
        paint.fillText(phase === 'ready' ? '¡A volar!' : 'Fin de la partida', W / 2, 219);
        paint.font = '700 14px system-ui';
        paint.fillText(phase === 'ready' ? 'Toca o pulsa Empezar' : 'Toca o pulsa Reintentar', W / 2, 247);
      }
    }

    function tick(now) {
      if (phase !== 'playing') return;
      if (!document.body.contains(wrap)) { cleanup(); return; }
      const dt = previousFrame ? Math.min((now - previousFrame) / 1000, 0.033) : 0;
      previousFrame = now;
      if (dt) step(dt);
      draw();
      if (phase === 'playing') frameId = global.requestAnimationFrame(tick);
    }

    function onKey(event) {
      if (event.key !== ' ' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      flap();
    }

    function onVisibility() {
      if (document.hidden && phase === 'playing') {
        if (frameId !== null) global.cancelAnimationFrame(frameId);
        frameId = null;
        phase = 'paused';
        statusEl.textContent = 'Partida en pausa. Toca para continuar.';
      }
    }

    let observer = null;

    function cleanup() {
      if (frameId !== null) global.cancelAnimationFrame(frameId);
      frameId = null;
      wrap.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      if (observer) observer.disconnect();
    }

    wrap.addEventListener('keydown', onKey);
    startButton.addEventListener('click', start);
    wrap.querySelector('.cf-flap').addEventListener('click', () => {
      wrap.focus();
      flap();
    });
    canvas.addEventListener('pointerdown', event => {
      event.preventDefault();
      wrap.focus();
      flap();
    });
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (!document.body.contains(wrap)) cleanup();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    draw();
  });
})(window);
