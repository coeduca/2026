/**
 * Salto infinito para COEDUCA. Juego Canvas original inspirado en la mecánica
 * de plataformas ascendentes de https://gist.github.com/straker/b96a4a68bd6d79cf75a833d98a2b654f
 * (CC0 1.0). Los gráficos y la implementación de esta versión son propios.
 */
(function (global) {
  'use strict';
  const iconButton = global.COEDUCA_GAME_ICONS.button;
  const arrowIcon = global.COEDUCA_GAME_ICONS.arrow;

  const core = global.COEDUCA || global.CIVICA;
  if (!core || typeof core.registerGame !== 'function') return;

  if (!document.getElementById('coeduca-doodle-styles')) {
    const style = document.createElement('style');
    style.id = 'coeduca-doodle-styles';
    style.textContent = `
      .cj-game { max-width: 390px; margin: 0 auto; color: #23334d; font-family: system-ui, sans-serif; text-align: center; }
      .cj-game * { box-sizing: border-box; }
      .cj-heading { margin: 0 0 10px; font-size: 25px; font-weight: 900; }
      .cj-stats { display: flex; gap: 10px; margin-bottom: 10px; }
      .cj-stat { flex: 1; padding: 8px 10px; border: 2px solid #23334d; border-radius: 13px; background: #fff; text-align: left; }
      .cj-stat:first-child { background: #fff0a8; }
      .cj-stat small { display: block; font-size: 10px; font-weight: 800; letter-spacing: .7px; }
      .cj-stat strong { display: block; font-size: 24px; line-height: 1.15; font-variant-numeric: tabular-nums; }
      .cj-canvas { display: block; width: 100%; height: auto; border: 3px solid #23334d; border-radius: 18px; background: #bceeff; box-shadow: 0 5px 0 #a9bfca; touch-action: auto; }
      .cj-game.is-playing .cj-canvas, .cj-game.is-playing .cj-left, .cj-game.is-playing .cj-right { touch-action: none; }
      .cj-controls { display: flex; gap: 8px; margin-top: 13px; }
      .cj-button { flex: 1; min-height: 48px; padding: 8px; border: 2px solid #23334d; border-radius: 12px; background: #fff; color: #23334d; font: 800 14px system-ui, sans-serif; cursor: pointer; box-shadow: 0 3px 0 #23334d; touch-action: manipulation; user-select: none; }
      .cj-button:active { transform: translateY(2px); box-shadow: 0 1px 0 #23334d; }
      .cj-start:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
      .cj-button:focus-visible, .cj-game:focus-visible { outline: 3px solid #158b79; outline-offset: 3px; }
      .cj-primary { flex: 1.5; background: #ffe071; }
      .cj-status { min-height: 22px; margin: 5px 0; font-size: 13px; font-weight: 700; }
    `;
    document.head.appendChild(style);
  }

  core.registerGame('doodle', function (ctx) {
    const W = 360, H = 500, BASE_Y = 48;
    const PLAYER_W = 32, PLAYER_H = 34, PLAYER_DRAW_RADIUS = 28;
    const GRAVITY = 750, BOUNCE = 525, RUN_SPEED = 245;
    const SPRING_PUSH = .18, SPRING_BOUNCE = 760;
    const RELEASE_GRAVITY = 260, RELEASE_DURATION = 1.05, RELEASE_LIFT = 115;
    const SINGLE_PATH_HEIGHT = 8000;
    const MOVING_PATH_HEIGHT = 16000, FAST_MOVING_HEIGHT = 24000;
    const NIGHT_START_HEIGHT = 16000, NIGHT_TRANSITION_HEIGHT = 4000;
    const goal = 1000;

    const wrap = document.createElement('div');
    wrap.className = 'cj-game';
    wrap.tabIndex = 0;
    wrap.innerHTML = `
      <h3 class="cj-heading">☁️ Salto infinito</h3>
      <div class="cj-stats">
        <div class="cj-stat"><small>ALTURA MÁXIMA</small><strong class="cj-score" aria-live="polite">0</strong></div>
        <div class="cj-stat"><small>BONUS +1 EN NOTA</small><strong class="cj-goal">1000</strong></div>
      </div>
      <canvas class="cj-canvas" width="720" height="1000" aria-label="Juego de plataformas. Muévete con A, D o las flechas; en móvil, inclina el teléfono."></canvas>
      <div class="cj-controls">
        <button class="cj-button cj-left" type="button" aria-label="Mover a la izquierda">${arrowIcon('left')}</button>
        <button class="cj-button cj-primary cj-start" type="button">${iconButton('play', 'Empezar')}</button>
        <button class="cj-button cj-right" type="button" aria-label="Mover a la derecha">${arrowIcon('right')}</button>
      </div>
      <button class="cj-button cj-center" type="button" style="margin-top:8px;width:100%">${iconButton('center', 'Recentrar inclinación')}</button>
      <div class="cj-status" aria-live="polite">Pulsa Empezar para jugar.</div>
    `;
    ctx.container.appendChild(wrap);
    global.COEDUCA_GAME_HELP.attach(wrap, 'doodle', 'Salto infinito', '.cj-heading');

    const soundKey = 'coeduca_snd_muted';
    const soundFiles = {
      jump: 'doodle-jump.aac',
      spring: 'doodle-spring.aac',
      hat: 'doodle-helicopter.aac',
      rocket: 'doodle-rocket.aac',
      broken: 'doodle-break.aac'
    };
    const soundVolumes = { jump: .35, spring: 1, hat: .45, rocket: .5, broken: .3 };
    const sounds = {};
    for (const [kind, file] of Object.entries(soundFiles)) {
      const audio = new Audio(file);
      audio.preload = 'auto';
      audio.volume = soundVolumes[kind];
      audio.loop = kind === 'hat' || kind === 'rocket';
      sounds[kind] = audio;
    }
    let activeFlightSound = null;
    const isMuted = () => {
      try { return localStorage.getItem(soundKey) === '1'; } catch (_) { return false; }
    };
    function stopFlightSound() {
      if (!activeFlightSound) return;
      activeFlightSound.pause();
      try { activeFlightSound.currentTime = 0; } catch (_) {}
      activeFlightSound = null;
    }
    function stopAllSounds() {
      for (const audio of Object.values(sounds)) {
        audio.pause();
        try { audio.currentTime = 0; } catch (_) {}
      }
      activeFlightSound = null;
    }
    function playSound(kind) {
      if (isMuted() || !document.body.contains(wrap)) return;
      const audio = sounds[kind];
      if (!audio) return;
      try {
        audio.pause();
        audio.currentTime = 0;
        const playback = audio.play();
        if (playback && playback.catch) playback.catch(() => {});
      } catch (_) { /* El navegador puede bloquear audio sin interacción previa. */ }
    }
    function startFlightSound(kind) {
      stopFlightSound();
      if (isMuted()) return;
      activeFlightSound = sounds[kind] || null;
      playSound(kind);
    }

    const soundHost = wrap.closest('.coeduca-exercise, .civica-section--consolidate') || wrap;
    soundHost.style.position = 'relative';
    const soundToggle = document.createElement('button');
    soundToggle.type = 'button';
    soundToggle.className = 'coeduca-game-sound-toggle';
    soundToggle.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;width:42px;height:42px;' +
      'display:grid;place-items:center;color:#1a1a1a;border:3px solid #1a1a1a;' +
      'border-radius:12px;background:#fff;cursor:pointer;box-shadow:2px 2px 0 #1a1a1a;padding:0;';
    const soundOnIcon = '<svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M640-440v-80h160v80H640Zm48 280-128-96 48-64 128 96-48 64Zm-80-480-48-64 128-96 48 64-128 96ZM120-360v-240h160l200-200v640L280-360H120Z"/></svg>';
    const soundOffIcon = '<svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="m616-320-56-56 104-104-104-104 56-56 104 104 104-104 56 56-104 104-104 104-56 56-104-104-104 104Zm-496-40v-240h160l200-200v640L280-360H120Z"/></svg>';
    function renderSoundToggle() {
      const muted = isMuted();
      soundToggle.innerHTML = muted ? soundOffIcon : soundOnIcon;
      soundToggle.title = muted ? 'Activar sonido' : 'Desactivar sonido';
      soundToggle.setAttribute('aria-label', soundToggle.title);
      soundToggle.setAttribute('aria-pressed', String(muted));
    }
    soundToggle.addEventListener('click', () => {
      const muted = !isMuted();
      try { localStorage.setItem(soundKey, muted ? '1' : '0'); } catch (_) {}
      renderSoundToggle();
      if (muted) stopFlightSound();
      else if (phase === 'playing' && flightKind && flightTimer > 0) startFlightSound(flightKind);
    });
    renderSoundToggle();
    soundHost.appendChild(soundToggle);
    const viewport = global.COEDUCA_GAME_VIEWPORT
      ? global.COEDUCA_GAME_VIEWPORT.create(wrap, { game: 'doodle', title: 'Salto infinito', soundToggle })
      : { enter() {}, leave() {}, destroy() {} };

    const canvas = wrap.querySelector('.cj-canvas');
    const paint = canvas.getContext('2d');
    const scoreEl = wrap.querySelector('.cj-score');
    const statusEl = wrap.querySelector('.cj-status');
    const startButton = wrap.querySelector('.cj-start');
    if (!paint) {
      statusEl.textContent = 'Canvas no está disponible.';
      return;
    }
    paint.scale(2, 2);

    const leaderboard = global.COEDUCA_LEADERBOARD
      ? global.COEDUCA_LEADERBOARD.create(ctx, 'doodle', 1)
      : { submit: () => Promise.resolve(false) };
    const results = global.COEDUCA_GAME_RESULTS
      ? global.COEDUCA_GAME_RESULTS.create(ctx, 'doodle', wrap)
      : { show() {} };

    let phase = 'ready', frameId = null, previousFrame = 0, startToken = 0;
    let helpOpen = false, helpPaused = false;
    let playerX = W / 2, playerY = BASE_Y, velocityY = 0;
    let cameraY = 0, highestY = BASE_Y, score = 0, bonusEarned = false;
    let platforms = [], lastPlatformY = BASE_Y, lastPlatformX = 132, platformCount = 0;
    let flightKind = null, flightTimer = 0, flightSpeed = 0, springEffect = 0;
    let springPlatform = null, springPush = 0, springBoostActive = false;
    let releaseTimer = 0, fallingBoosters = [];
    let tiltRaw = null, tiltCenter = null, tiltTarget = 0, tiltSmooth = 0;
    let sensorSeen = false, sensorListening = false, sensorTimer = null;
    let leftDown = false, rightDown = false, touchDirection = 0;
    let observer = null;
    const rigoSprite = new global.Image();
    const rigoDizzySprite = new global.Image();
    let rigoReady = false, rigoDizzyReady = false;
    let dizzyTimeLeft = 0, nextDizzyIn = 0;

    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    const screenY = worldY => H - (worldY - cameraY);
    const stars = [
      [21, 38, 1], [56, 123, 1.5], [89, 62, 1], [118, 194, 1.2],
      [145, 34, 1.3], [172, 137, 1], [205, 79, 1.5], [239, 207, 1],
      [263, 29, 1.2], [335, 122, 1], [27, 260, 1.3], [75, 347, 1],
      [126, 284, 1.4], [183, 374, 1], [226, 318, 1.2], [326, 277, 1.4],
      [44, 432, 1], [154, 462, 1.2], [275, 420, 1], [341, 470, 1.3]
    ];

    function loadRigoSprite() {
      const mascot = document.createElement('rigo-mascot');
      if (typeof mascot.getSVG !== 'function') return;
      for (const [emotion, sprite, color] of [
        ['neutral', rigoSprite, '#7ED957'],
        ['dizzy', rigoDizzySprite, '#A8C97A']
      ]) {
        // Usa las dos expresiones originales de Rigo, con el color dentro del SVG.
        const svg = mascot.getSVG(emotion)
          .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
          .replace('width="100%" height="100%"', 'width="200" height="200"')
          .replace('<defs>', `<defs><style>.rigo-skin{fill:${color}}.rigo-skin-stroke{stroke:${color}}</style>`);
        sprite.onload = () => {
          if (emotion === 'neutral') rigoReady = true;
          else rigoDizzyReady = true;
          if (document.body.contains(wrap)) draw();
        };
        sprite.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      }
    }

    function addPlatforms() {
      while (lastPlatformY < cameraY + H + 120) {
        const progress = Math.max(0, lastPlatformY - BASE_Y);
        const challenge = clamp((progress - 4500) / 5000, 0, 1);
        const singlePath = progress >= SINGLE_PATH_HEIGHT;
        const width = Math.round(94 - challenge * 42);
        // El salto normal alcanza unos 184 px; estos espacios siguen siendo posibles.
        // En la ruta única, dos espacios juntos superan esa altura y no se puede saltar una etapa.
        const gap = 70 + challenge * 48 + Math.random() * (12 + challenge * 18);
        const previousY = lastPlatformY;
        lastPlatformY += gap;
        const shift = 35 + challenge * 35 + Math.random() * (65 + challenge * 35);
        const direction = Math.random() < .5 ? -1 : 1;
        let nextX = lastPlatformX + direction * shift;
        if (nextX < 12 || nextX > W - width - 12) nextX = lastPlatformX - direction * shift;
        lastPlatformX = clamp(nextX, 12, W - width - 12);
        platformCount++;
        const typeRoll = Math.random();
        // Desde 16 000, móviles y fugaces tienen la misma probabilidad.
        const type = progress >= MOVING_PATH_HEIGHT
          ? (typeRoll < .45 ? 'moving' : typeRoll < .90 ? 'vanishing' : 'normal')
          : singlePath ? (typeRoll < .07 ? 'moving' : typeRoll < .25 ? 'normal' : 'vanishing')
          : progress < 350 ? 'normal'
          : typeRoll < .23 ? 'moving'
          : typeRoll < .43 ? 'vanishing' : 'normal';
        const boosterRoll = Math.random();
        // Los impulsos siguen presentes, pero son menos frecuentes en la zona alta.
        const springChance = .16 - challenge * .08;
        const hatChance = .045 - challenge * .025;
        const rocketChance = .02 - challenge * .01;
        const booster = progress < 160 ? null
          : boosterRoll < springChance ? 'spring'
          : boosterRoll < springChance + hatChance ? 'hat'
          : boosterRoll < springChance + hatChance + rocketChance ? 'rocket' : null;
        const platform = {
          x: lastPlatformX, y: lastPlatformY, width, type, booster,
          boosterUsed: false, fading: -1, broken: false, fall: 0,
          minX: clamp(lastPlatformX - 42, 12, W - width - 12),
          maxX: clamp(lastPlatformX + 42, 12, W - width - 12),
          direction: Math.random() < .5 ? -1 : 1,
          speed: progress >= FAST_MOVING_HEIGHT ? 135 + Math.random() * 25 : 45 + challenge * 35
        };
        platforms.push(platform);

        // Las rotas rellenan los lados como señuelos; nunca sustituyen al único apoyo real.
        const decoyCount = progress >= MOVING_PATH_HEIGHT ? 1 + Number(Math.random() < .2)
          : singlePath ? 1 + Number(Math.random() < .45)
          : Number(progress > 500 && platformCount % 3 === 0 && Math.random() < .8);
        for (let i = 0; i < decoyCount; i++) {
          const brokenWidth = Math.max(48, width - 10);
          const maxX = W - brokenWidth - 12;
          const side = (lastPlatformX < maxX / 2 ? 1 : -1) * (i === 0 ? 1 : -1);
          const offset = width + 12 + Math.random() * 30;
          const brokenX = clamp(lastPlatformX + side * offset, 12, maxX);
          if (Math.abs(brokenX - lastPlatformX) < width * .7) continue;
          platforms.push({
            x: brokenX, y: previousY + gap * (.38 + Math.random() * .3),
            width: brokenWidth, type: 'broken', booster: null,
            boosterUsed: true, fading: -1, broken: false, fall: 0
          });
        }
      }
    }

    function reset() {
      stopAllSounds();
      playerX = W / 2;
      playerY = BASE_Y;
      velocityY = BOUNCE;
      cameraY = 0;
      highestY = BASE_Y;
      score = 0;
      bonusEarned = false;
      platforms = [{ x: 132, y: BASE_Y, width: 96 }];
      lastPlatformY = BASE_Y;
      lastPlatformX = 132;
      platformCount = 0;
      flightKind = null;
      flightTimer = 0;
      flightSpeed = 0;
      springEffect = 0;
      springPlatform = null;
      springPush = 0;
      springBoostActive = false;
      releaseTimer = 0;
      fallingBoosters = [];
      dizzyTimeLeft = 0;
      nextDizzyIn = 6 + Math.random() * 9;
      previousFrame = 0;
      tiltCenter = tiltRaw;
      tiltTarget = 0;
      tiltSmooth = 0;
      touchDirection = 0;
      leftDown = false;
      rightDown = false;
      scoreEl.textContent = '0';
      addPlatforms();
    }

    function onOrientation(event) {
      if (!Number.isFinite(event.gamma)) return;
      sensorSeen = true;
      tiltRaw = event.gamma;
      if (tiltCenter === null) tiltCenter = tiltRaw;
      const difference = clamp(tiltRaw - tiltCenter, -35, 35);
      tiltTarget = Math.abs(difference) < 4 ? 0 : clamp((Math.abs(difference) - 4) / 22, 0, 1) * Math.sign(difference);
    }

    function listenToSensor() {
      if (sensorListening) return;
      global.addEventListener('deviceorientation', onOrientation);
      sensorListening = true;
      if (sensorTimer !== null) global.clearTimeout(sensorTimer);
      sensorTimer = global.setTimeout(() => {
        sensorTimer = null;
        if (!sensorSeen && phase === 'playing') {
          statusEl.textContent = 'No se detectó inclinación. Usa los botones ◀ ▶ para moverte.';
        }
      }, 1800);
    }

    async function start() {
      if (helpOpen || phase === 'playing') return;
      if (phase === 'paused') {
        viewport.enter();
        phase = 'playing';
        wrap.classList.add('is-playing');
        startButton.innerHTML = iconButton('retry', 'Reiniciar');
        startButton.disabled = true;
        previousFrame = 0;
        statusEl.textContent = '¡Sigue subiendo!';
        if (flightKind && flightTimer > 0) startFlightSound(flightKind);
        frameId = global.requestAnimationFrame(tick);
        return;
      }
      const token = ++startToken;
      if (frameId !== null) global.cancelAnimationFrame(frameId);
      reset();
      phase = 'playing';
      wrap.classList.add('is-playing');
      viewport.enter();
      startButton.innerHTML = iconButton('retry', 'Reiniciar');
      startButton.disabled = true;
      statusEl.textContent = 'Salta automáticamente. ¡Sube tan alto como puedas!';
      wrap.focus();
      playSound('jump');
      draw();
      // En los navegadores que lo exigen, el permiso debe pedirse al pulsar Jugar.
      if (!sensorListening && typeof global.DeviceOrientationEvent !== 'undefined') {
        if (typeof global.DeviceOrientationEvent.requestPermission === 'function') {
          try {
            const permission = await global.DeviceOrientationEvent.requestPermission();
            if (token !== startToken || !document.body.contains(wrap)) return;
            if (permission === 'granted') listenToSensor();
            else statusEl.textContent = 'Usa A/D, ←/→ o los botones para moverte.';
          } catch (_) {
            if (token !== startToken || !document.body.contains(wrap)) return;
            statusEl.textContent = 'Usa A/D, ←/→ o los botones para moverte.';
          }
        } else {
          listenToSensor();
        }
      }
      if (phase === 'playing') frameId = global.requestAnimationFrame(tick);
    }

    function finish() {
      if (phase !== 'playing') return;
      phase = 'over';
      wrap.classList.remove('is-playing');
      viewport.leave();
      stopFlightSound();
      dizzyTimeLeft = 0;
      frameId = null;
      startButton.innerHTML = iconButton('retry', 'Reintentar');
      startButton.disabled = false;
      statusEl.textContent = `Fin de la partida: ${score} de altura. ${bonusEarned ? '¡Conservas tu +1!' : '¡Inténtalo otra vez!'}`;
      leaderboard.submit(score);
      if (!bonusEarned) ctx.onLose();
      draw();
      results.show({
        score, points: bonusEarned ? 1 : 0, unit: 'de altura',
        outcome: '🚀 Alcanzaste ' + score + ' de altura',
        replay: () => startButton.click()
      });
    }

    function wrappedDistance(x, target) {
      return Math.min(Math.abs(x - target), Math.abs(x - W - target), Math.abs(x + W - target));
    }

    function dropBooster(kind, x, y) {
      fallingBoosters.push({ kind, x, y, velocity: -65, angle: 0, life: 1.5 });
    }

    function beginRecovery(withLift = false) {
      // El resorte ya llegó a su cima: añadir velocidad aquí parecería otro salto.
      if (withLift) velocityY = RELEASE_LIFT;
      releaseTimer = RELEASE_DURATION;
    }

    function activateBooster(platform) {
      if (!platform.booster || platform.boosterUsed) return;
      platform.boosterUsed = true;
      if (flightKind === 'rocket' && platform.booster === 'hat') return;
      if (platform.booster === 'spring') {
        playSound('spring');
        springPlatform = platform;
        springPush = SPRING_PUSH;
        velocityY = SPRING_BOUNCE;
        springEffect = .8;
        springBoostActive = true;
        releaseTimer = 0;
        statusEl.textContent = '¡Resorte! Salta más alto y busca la siguiente plataforma.';
      } else if (platform.booster === 'hat') {
        startFlightSound('hat');
        if (flightKind) dropBooster(flightKind, playerX, playerY + PLAYER_H);
        springBoostActive = false;
        flightKind = 'hat';
        flightTimer = 1.4;
        flightSpeed = 305;
        velocityY = 0;
        releaseTimer = 0;
        statusEl.textContent = '¡Gorra con hélice! Vuela y dirige el movimiento.';
      } else if (platform.booster === 'rocket') {
        startFlightSound('rocket');
        if (flightKind) dropBooster(flightKind, playerX, playerY + PLAYER_H);
        springBoostActive = false;
        flightKind = 'rocket';
        flightTimer = 1.9;
        flightSpeed = 420;
        velocityY = 0;
        releaseTimer = 0;
        statusEl.textContent = '¡Cohete! Vuela más alto que con la hélice.';
      }
    }

    function updatePlatforms(dt) {
      for (const platform of platforms) {
        if (platform.type === 'moving') {
          platform.x += platform.direction * platform.speed * dt;
          if (platform.x <= platform.minX || platform.x >= platform.maxX) {
            platform.x = clamp(platform.x, platform.minX, platform.maxX);
            platform.direction *= -1;
          }
        }
        if (platform.fading > 0) platform.fading = Math.max(0, platform.fading - dt);
        if (platform.broken) {
          platform.breakAge += dt;
          platform.fall += 230 * dt;
        }
      }
    }

    function step(dt) {
      updatePlatforms(dt);
      if (dizzyTimeLeft > 0) {
        dizzyTimeLeft = Math.max(0, dizzyTimeLeft - dt);
      } else if (rigoDizzyReady) {
        nextDizzyIn -= dt;
        if (nextDizzyIn <= 0) {
          dizzyTimeLeft = 1.4 + Math.random() * .4;
          nextDizzyIn = 8 + Math.random() * 12;
        }
      }
      if (springPush > 0) {
        springPush = Math.max(0, springPush - dt);
        if (springPush === 0 && springPlatform) {
          dropBooster('spring', springPlatform.x + springPlatform.width / 2, springPlatform.y + 18);
          springPlatform = null;
        }
      }
      for (const booster of fallingBoosters) {
        booster.velocity -= 680 * dt;
        booster.y += booster.velocity * dt;
        booster.angle += dt * 4;
        booster.life -= dt;
      }
      fallingBoosters = fallingBoosters.filter(booster => booster.life > 0 && booster.y > cameraY - 90);
      const keyDirection = Number(rightDown) - Number(leftDown);
      tiltSmooth += (tiltTarget - tiltSmooth) * Math.min(1, dt * 12);
      const direction = keyDirection || touchDirection || tiltSmooth;
      playerX += direction * RUN_SPEED * dt;
      if (playerX < -PLAYER_W / 2) playerX = W + PLAYER_W / 2;
      if (playerX > W + PLAYER_W / 2) playerX = -PLAYER_W / 2;

      const previousY = playerY;
      const wasFlying = flightTimer > 0;
      if (wasFlying) {
        playerY += flightSpeed * dt;
        flightTimer = Math.max(0, flightTimer - dt);
        if (flightTimer === 0) {
          stopFlightSound();
          dropBooster(flightKind, playerX, playerY + PLAYER_H);
          flightKind = null;
          beginRecovery(true);
        }
      } else if (releaseTimer > 0) {
        const progress = 1 - releaseTimer / RELEASE_DURATION;
        const recoveryGravity = RELEASE_GRAVITY + (GRAVITY - RELEASE_GRAVITY) * progress;
        velocityY -= recoveryGravity * dt;
        playerY += velocityY * dt;
        releaseTimer = Math.max(0, releaseTimer - dt);
      } else {
        velocityY -= GRAVITY * dt;
        playerY += velocityY * dt;
      }
      springEffect = Math.max(0, springEffect - dt);

      let landed = false;
      if (!wasFlying && velocityY <= 0) {
        // Al cruzar más de una superficie en un fotograma, toca primero la más alta.
        for (const platform of platforms.slice().sort((a, b) => b.y - a.y)) {
          if (platform.broken || platform.fading === 0) continue;
          const overlapsX = [playerX - W, playerX, playerX + W].some(x =>
            x + PLAYER_W / 2 > platform.x && x - PLAYER_W / 2 < platform.x + platform.width);
          if (previousY >= platform.y && playerY <= platform.y && overlapsX) {
            if (platform.type === 'broken') {
              playSound('broken');
              platform.broken = true;
              platform.breakAge = 0;
              statusEl.textContent = '¡La plataforma se rompió! Busca otra antes de caer.';
              break;
            }
            playerY = platform.y;
            velocityY = BOUNCE;
            landed = true;
            springBoostActive = false;
            releaseTimer = 0;
            if (platform.type === 'vanishing') platform.fading = .35;
            if (platform.booster === 'spring' &&
                wrappedDistance(playerX, platform.x + platform.width / 2) < 27) {
              activateBooster(platform);
            } else {
              playSound('jump');
            }
            break;
          }
        }
      }

      // La gorra y el cohete se recogen al tocar su dibujo, también en el aire.
      for (const platform of platforms) {
        if (platform.boosterUsed || platform.fading === 0 ||
            (platform.booster !== 'hat' && platform.booster !== 'rocket')) continue;
        const itemY = platform.y + (platform.booster === 'rocket' ? 35 : 30);
        const itemRadius = platform.booster === 'rocket' ? 18 : 14;
        if (playerY <= itemY + itemRadius && playerY + PLAYER_H >= itemY - itemRadius &&
            wrappedDistance(playerX, platform.x + platform.width / 2) < 25) {
          activateBooster(platform);
          break;
        }
      }
      if (springBoostActive && !landed && velocityY <= 0) {
        springBoostActive = false;
        beginRecovery();
      }

      highestY = Math.max(highestY, playerY);
      const newScore = Math.floor(highestY - BASE_Y);
      if (newScore !== score) {
        score = newScore;
        scoreEl.textContent = String(score);
        if (!bonusEarned && score >= goal) {
          bonusEarned = true;
          statusEl.textContent = '¡Ganaste +1 punto en tu nota final! Sigue subiendo para mejorar tu récord.';
          ctx.onWin();
        }
      }
      cameraY = Math.max(cameraY, highestY - H * .57);
      addPlatforms();
      platforms = platforms.filter(platform =>
        platform.y > cameraY - 45 && platform.fading !== 0 &&
        (!platform.broken || platform.breakAge < .7));
      if (playerY < cameraY - PLAYER_H) finish();
    }

    function cloud(x, y, size, alpha) {
      paint.fillStyle = `rgba(255,255,255,${alpha})`;
      paint.beginPath();
      paint.arc(x, y, size * .6, 0, Math.PI * 2);
      paint.arc(x + size * .55, y - size * .25, size * .72, 0, Math.PI * 2);
      paint.arc(x + size * 1.2, y, size * .55, 0, Math.PI * 2);
      paint.fill();
    }

    function paintBoosterIcon(kind, springHeight = 25, active = true) {
      paint.lineJoin = 'round';
      if (kind === 'spring') {
        paint.fillStyle = '#3c4d6b';
        paint.fillRect(-18, -6, 36, 7);
        paint.fillStyle = '#91aec5';
        paint.fillRect(-15, -6, 30, 2);
        paint.beginPath();
        paint.moveTo(-11, -7);
        for (let coil = 1; coil <= 6; coil++) {
          paint.lineTo(coil % 2 ? 11 : -11, -7 - (springHeight - 7) * coil / 6);
        }
        paint.strokeStyle = '#684667';
        paint.lineWidth = 5;
        paint.stroke();
        paint.strokeStyle = '#ff985e';
        paint.lineWidth = 2.5;
        paint.stroke();
        const plate = paint.createLinearGradient(0, -springHeight - 8, 0, -springHeight);
        plate.addColorStop(0, '#ffe88e');
        plate.addColorStop(1, '#f58d57');
        paint.fillStyle = plate;
        paint.fillRect(-17, -springHeight - 8, 34, 8);
        paint.strokeStyle = '#96506a';
        paint.lineWidth = 1.5;
        paint.strokeRect(-17, -springHeight - 8, 34, 8);
        paint.fillStyle = '#fff6c8';
        paint.fillRect(-13, -springHeight - 6, 19, 2);
        paint.fillStyle = '#96506a';
        paint.beginPath(); paint.arc(12, -springHeight - 4, 1.5, 0, Math.PI * 2); paint.fill();
      } else if (kind === 'hat') {
        const dome = paint.createLinearGradient(-14, -37, 13, -18);
        dome.addColorStop(0, '#d7fbff');
        dome.addColorStop(.5, '#50cae7');
        dome.addColorStop(1, '#1e82b7');
        paint.fillStyle = dome;
        paint.strokeStyle = '#225b78';
        paint.lineWidth = 2;
        paint.beginPath(); paint.ellipse(0, -24, 17, 11, 0, Math.PI, Math.PI * 2); paint.fill(); paint.stroke();
        paint.fillStyle = '#f9d268';
        paint.fillRect(-16, -25, 32, 4);
        paint.fillStyle = '#275f84';
        paint.beginPath(); paint.ellipse(0, -21, 22, 4, 0, 0, Math.PI * 2); paint.fill();
        paint.fillStyle = '#8ce9f5';
        paint.beginPath(); paint.ellipse(0, -22, 19, 2, 0, 0, Math.PI * 2); paint.fill();
        paint.strokeStyle = '#285b78';
        paint.lineWidth = 3;
        paint.beginPath(); paint.moveTo(0, -35); paint.lineTo(0, -42); paint.stroke();
        paint.save();
        paint.translate(0, -43);
        paint.scale(Math.max(.2, Math.abs(Math.cos(previousFrame * .035))), 1);
        paint.fillStyle = '#e9f7ff';
        paint.strokeStyle = '#31769a';
        paint.lineWidth = 1.5;
        paint.beginPath(); paint.ellipse(0, 0, 21, 3.5, 0, 0, Math.PI * 2); paint.fill(); paint.stroke();
        paint.restore();
        paint.fillStyle = '#ffd76c';
        paint.beginPath(); paint.arc(0, -43, 3, 0, Math.PI * 2); paint.fill();
      } else if (kind === 'rocket') {
        if (active) {
          const flame = 12 + Math.sin(previousFrame * .04) * 3;
          paint.fillStyle = '#f08049';
          paint.beginPath();
          paint.moveTo(-6, -10); paint.lineTo(0, flame); paint.lineTo(6, -10); paint.fill();
          paint.fillStyle = '#ffe57c';
          paint.beginPath();
          paint.moveTo(-3, -9); paint.lineTo(0, flame - 5); paint.lineTo(3, -9); paint.fill();
        }
        paint.fillStyle = '#8d405e';
        paint.beginPath();
        paint.moveTo(-9, -21); paint.lineTo(-18, -9); paint.lineTo(-7, -12);
        paint.moveTo(9, -21); paint.lineTo(18, -9); paint.lineTo(7, -12); paint.fill();
        const body = paint.createLinearGradient(-10, -34, 11, -18);
        body.addColorStop(0, '#ffb579');
        body.addColorStop(.5, '#f4655d');
        body.addColorStop(1, '#b63c59');
        paint.fillStyle = body;
        paint.strokeStyle = '#813a59';
        paint.lineWidth = 2;
        paint.beginPath();
        paint.moveTo(0, -52);
        paint.quadraticCurveTo(11, -41, 11, -28);
        paint.lineTo(9, -11); paint.lineTo(-9, -11);
        paint.lineTo(-11, -28);
        paint.quadraticCurveTo(-11, -41, 0, -52);
        paint.fill(); paint.stroke();
        paint.fillStyle = '#fff2ae';
        paint.beginPath(); paint.moveTo(0, -52); paint.lineTo(7, -41); paint.lineTo(-7, -41); paint.fill();
        paint.fillStyle = '#d8f8ff';
        paint.strokeStyle = '#3889a3';
        paint.beginPath(); paint.arc(0, -31, 6, 0, Math.PI * 2); paint.fill(); paint.stroke();
        paint.fillStyle = '#fff';
        paint.beginPath(); paint.arc(-2, -33, 2, 0, Math.PI * 2); paint.fill();
        paint.fillStyle = '#4d5573';
        paint.fillRect(-7, -12, 14, 4);
      }
    }

    function drawBooster(platform, y) {
      if (!platform.booster || (platform.boosterUsed && springPlatform !== platform)) return;
      let springHeight = 25;
      if (springPlatform === platform && springPush > 0) {
        const elapsed = SPRING_PUSH - springPush;
        const compression = elapsed < .05 ? elapsed / .05 : Math.max(0, 1 - (elapsed - .05) / (SPRING_PUSH - .05));
        springHeight -= 16 * compression;
      }
      paint.save();
      paint.translate(platform.x + platform.width / 2, y);
      paintBoosterIcon(platform.booster, springHeight);
      paint.restore();
    }

    function drawFallingBooster(booster) {
      const y = screenY(booster.y);
      if (y < -60 || y > H + 60) return;
      paint.save();
      paint.translate(booster.x, y);
      paint.rotate(booster.angle);
      paint.scale(.78, .78);
      paint.globalAlpha = Math.min(1, booster.life * 1.5);
      paintBoosterIcon(booster.kind, 25, false);
      paint.restore();
    }

    function drawPlatform(platform) {
      const y = screenY(platform.y - (platform.broken ? platform.fall : 0));
      if (y < -60 || y > H + 60) return;
      paint.save();
      if (platform.type === 'broken') {
        const x = platform.x, width = platform.width;
        if (platform.broken) {
          const age = Math.min(platform.breakAge, .7);
          const half = width / 2;
          for (let side = 0; side < 2; side++) {
            const left = side === 0;
            paint.save();
            paint.translate(x + (left ? half / 2 - age * 13 : width - half / 2 + age * 13), y + 7 + age * 8);
            paint.rotate((left ? -1 : 1) * (.12 + age * .85));
            paint.fillStyle = '#754957';
            paint.fillRect(-half / 2, -4, half, 14);
            paint.fillStyle = '#df9c67';
            paint.beginPath();
            if (left) {
              paint.moveTo(-half / 2, -7); paint.lineTo(half / 2 - 3, -7);
              paint.lineTo(half / 2 - 7, -1); paint.lineTo(half / 2 + 1, 3);
              paint.lineTo(half / 2 - 4, 7); paint.lineTo(-half / 2, 7);
            } else {
              paint.moveTo(-half / 2 + 3, -7); paint.lineTo(half / 2, -7);
              paint.lineTo(half / 2, 7); paint.lineTo(-half / 2 + 4, 7);
              paint.lineTo(-half / 2 - 1, 3); paint.lineTo(-half / 2 + 7, -1);
            }
            paint.closePath(); paint.fill();
            paint.fillStyle = '#fbd193';
            paint.fillRect(-half / 2 + 5, -5, Math.max(7, half - 13), 2);
            paint.fillStyle = '#674859';
            paint.beginPath(); paint.arc(left ? -half / 2 + 9 : half / 2 - 9, 1, 2, 0, Math.PI * 2); paint.fill();
            paint.restore();
          }
        } else {
          paint.fillStyle = '#754957';
          paint.fillRect(x, y + 3, width, 14);
          paint.fillStyle = '#df9c67';
          paint.fillRect(x + 1, y, width - 2, 12);
          paint.fillStyle = '#fbd193';
          paint.fillRect(x + 5, y + 2, width - 10, 3);
          paint.fillStyle = '#674859';
          paint.beginPath(); paint.arc(x + 10, y + 8, 2, 0, Math.PI * 2); paint.fill();
          paint.beginPath(); paint.arc(x + width - 10, y + 8, 2, 0, Math.PI * 2); paint.fill();
          paint.strokeStyle = '#754957';
          paint.lineWidth = 2.5;
          paint.beginPath();
          paint.moveTo(x + width * .46, y);
          paint.lineTo(x + width * .53, y + 4);
          paint.lineTo(x + width * .47, y + 8);
          paint.lineTo(x + width * .55, y + 16);
          paint.moveTo(x + width * .47, y + 8);
          paint.lineTo(x + width * .37, y + 11);
          paint.stroke();
        }
      } else {
        if (platform.type === 'vanishing' && platform.fading >= 0) {
          paint.globalAlpha = Math.max(.1, platform.fading / .35);
        }
        paint.fillStyle = '#365f73';
        paint.fillRect(platform.x, y + 3, platform.width, 13);
        paint.fillStyle = platform.type === 'moving' ? '#66b8f2'
          : platform.type === 'vanishing' ? '#b58be7' : '#5ed1a0';
        paint.fillRect(platform.x, y, platform.width, 10);
        paint.fillStyle = 'rgba(255,255,255,.55)';
        paint.fillRect(platform.x + 9, y + 2, Math.max(12, platform.width - 22), 2);
        if (platform.type === 'moving') {
          paint.fillStyle = '#244e79';
          paint.font = '900 14px system-ui';
          paint.textAlign = 'center';
          paint.fillText('↔', platform.x + platform.width / 2, y + 1);
        } else if (platform.type === 'vanishing') {
          paint.fillStyle = '#7347ad';
          paint.fillRect(platform.x + 5, y + 4, 5, 3);
          paint.fillRect(platform.x + platform.width - 10, y + 4, 5, 3);
        }
      }
      paint.restore();
      if (!platform.broken && platform.fading !== 0) drawBooster(platform, y);
    }

    function drawPlayer(atX) {
      const y = screenY(playerY);
      paint.save();
      const touchingSpring = springPush > SPRING_PUSH - .05;
      paint.translate(atX, y - PLAYER_H / 2 + (touchingSpring ? 3 : 0));
      if (touchingSpring) paint.scale(1.1, .88);
      paint.lineJoin = 'round';
      if (springEffect > 0) {
        paint.fillStyle = `rgba(255,194,65,${springEffect})`;
        paint.beginPath(); paint.arc(-12, 24, 4, 0, Math.PI * 2); paint.fill();
        paint.beginPath(); paint.arc(12, 28, 3, 0, Math.PI * 2); paint.fill();
      }
      if (flightKind === 'rocket') {
        paint.save();
        // Va sujeto a la espalda: Rigo tapa el centro, pero asoman la aleta y la llama.
        paint.translate(9, 23);
        paint.scale(.82, .82);
        paintBoosterIcon('rocket');
        paint.restore();
      }
      if (rigoReady) {
        // Agrandado sin cambiar la colisión; los pies siguen sobre la plataforma.
        const sprite = dizzyTimeLeft > 0 && rigoDizzyReady ? rigoDizzySprite : rigoSprite;
        paint.drawImage(sprite, -32, -40, 64, 64);
      } else {
        // Imagen provisional mientras se carga el SVG del framework.
        paint.fillStyle = '#7ed957';
        paint.strokeStyle = '#1a1a1a';
        paint.lineWidth = 2.5;
        paint.beginPath(); paint.ellipse(0, 0, 17, 17, 0, 0, Math.PI * 2); paint.fill(); paint.stroke();
        paint.fillStyle = '#fff';
        paint.beginPath(); paint.arc(-6, -5, 5, 0, Math.PI * 2); paint.arc(6, -5, 5, 0, Math.PI * 2); paint.fill();
        paint.fillStyle = '#1a1a1a';
        paint.beginPath(); paint.arc(-6, -5, 2, 0, Math.PI * 2); paint.arc(6, -5, 2, 0, Math.PI * 2); paint.fill();
      }
      if (flightKind === 'hat') {
        paint.save();
        paint.translate(0, -1);
        paint.scale(.82, .82);
        paintBoosterIcon('hat');
        paint.restore();
      }
      paint.restore();
    }

    function draw() {
      const nightProgress = clamp((score - NIGHT_START_HEIGHT) / NIGHT_TRANSITION_HEIGHT, 0, 1);
      const night = nightProgress * nightProgress * (3 - 2 * nightProgress);
      const sky = paint.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#8bcefa');
      sky.addColorStop(1, '#e4f9ff');
      paint.fillStyle = sky;
      paint.fillRect(0, 0, W, H);
      if (night > 0) {
        const nightSky = paint.createLinearGradient(0, 0, 0, H);
        nightSky.addColorStop(0, '#0c1739');
        nightSky.addColorStop(1, '#304b78');
        paint.save();
        paint.globalAlpha = night;
        paint.fillStyle = nightSky;
        paint.fillRect(0, 0, W, H);
        for (const [index, star] of stars.entries()) {
          paint.globalAlpha = night * (.7 + index % 3 * .12);
          paint.fillStyle = '#f5f6d9';
          paint.beginPath(); paint.arc(star[0], star[1], star[2], 0, Math.PI * 2); paint.fill();
        }
        paint.globalAlpha = night;
        paint.fillStyle = '#f6f1d4';
        paint.beginPath(); paint.arc(292, 64, 24, 0, Math.PI * 2); paint.fill();
        paint.fillStyle = '#ddd9c4';
        paint.beginPath(); paint.arc(284, 58, 3, 0, Math.PI * 2); paint.fill();
        paint.beginPath(); paint.arc(302, 68, 4, 0, Math.PI * 2); paint.fill();
        paint.restore();
      }
      if (night < 1) {
        paint.save();
        paint.globalAlpha = 1 - night;
        paint.fillStyle = '#fff2ab';
        paint.beginPath(); paint.arc(292, 64, 28, 0, Math.PI * 2); paint.fill();
        paint.restore();
      }
      const drift = cameraY * .12;
      if (night < 1) {
        cloud(34 - drift % 430, 92, 20, .8 * (1 - night));
        cloud(225 - drift * .6 % 460, 175, 15, .65 * (1 - night));
        cloud(380 - drift * .8 % 470, 320, 24, .7 * (1 - night));
      }

      for (const platform of platforms) drawPlatform(platform);
      for (const booster of fallingBoosters) drawFallingBooster(booster);
      drawPlayer(playerX);
      if (playerX < PLAYER_DRAW_RADIUS) drawPlayer(playerX + W);
      if (playerX > W - PLAYER_DRAW_RADIUS) drawPlayer(playerX - W);

      if (phase === 'ready' || phase === 'over' || phase === 'paused') {
        paint.fillStyle = 'rgba(29,48,73,.68)';
        paint.fillRect(0, 0, W, H);
        paint.textAlign = 'center';
        paint.fillStyle = '#fff';
        paint.font = '900 27px system-ui';
        paint.fillText(phase === 'ready' ? '¡Salta hasta las nubes!' : phase === 'paused' ? 'Pausa' : 'Fin de la partida', W / 2, 215);
        paint.font = '700 14px system-ui';
        paint.fillText(phase === 'paused' ? 'Pulsa Continuar' : 'Pulsa Empezar para jugar', W / 2, 245);
      }
    }

    function tick(now) {
      if (phase !== 'playing') return;
      if (!document.body.contains(wrap)) { cleanup(); return; }
      const dt = previousFrame ? Math.min((now - previousFrame) / 1000, .033) : 0;
      previousFrame = now;
      if (dt) step(dt);
      draw();
      if (phase === 'playing') frameId = global.requestAnimationFrame(tick);
    }

    function onKeyDown(event) {
      if (phase !== 'playing') return;
      if (!wrap.contains(document.activeElement) && document.activeElement !== wrap) return;
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        leftDown = true; event.preventDefault();
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        rightDown = true; event.preventDefault();
      }
    }

    function onKeyUp(event) {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') leftDown = false;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') rightDown = false;
    }

    function bindDirection(button, direction) {
      button.addEventListener('pointerdown', event => {
        if (phase !== 'playing') return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        touchDirection = direction;
      });
      const release = () => { if (touchDirection === direction) touchDirection = 0; };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    }

    function onVisibility() {
      if (document.hidden && phase === 'playing') {
        stopFlightSound();
        if (frameId !== null) global.cancelAnimationFrame(frameId);
        frameId = null;
        phase = 'paused';
        wrap.classList.remove('is-playing');
        startButton.innerHTML = iconButton('play', 'Continuar');
        startButton.disabled = false;
        statusEl.textContent = 'Partida en pausa. Pulsa Continuar.';
        draw();
      }
    }

    function onHelpOpen() {
      helpOpen = true;
      helpPaused = phase === 'playing';
      if (!helpPaused) return;
      stopFlightSound();
      if (frameId !== null) global.cancelAnimationFrame(frameId);
      frameId = null;
      phase = 'paused';
      statusEl.textContent = 'Partida en pausa.';
    }

    function onHelpClose() {
      helpOpen = false;
      if (helpPaused && phase === 'paused' && !document.hidden) {
        phase = 'playing';
        previousFrame = 0;
        statusEl.textContent = '¡Sigue subiendo!';
        if (flightKind && flightTimer > 0) startFlightSound(flightKind);
        frameId = global.requestAnimationFrame(tick);
      } else if (helpPaused && document.hidden) {
        wrap.classList.remove('is-playing');
        startButton.innerHTML = iconButton('play', 'Continuar');
        startButton.disabled = false;
        statusEl.textContent = 'Partida en pausa. Pulsa Continuar.';
      }
      helpPaused = false;
    }

    function onSoundStorage(event) {
      if (event.key !== soundKey) return;
      renderSoundToggle();
      if (isMuted()) stopFlightSound();
      else if (phase === 'playing' && flightKind && flightTimer > 0) startFlightSound(flightKind);
    }

    function cleanup() {
      startToken++;
      wrap.classList.remove('is-playing');
      stopAllSounds();
      viewport.destroy();
      if (frameId !== null) global.cancelAnimationFrame(frameId);
      if (sensorTimer !== null) global.clearTimeout(sensorTimer);
      if (sensorListening) global.removeEventListener('deviceorientation', onOrientation);
      global.removeEventListener('keydown', onKeyDown);
      global.removeEventListener('keyup', onKeyUp);
      global.removeEventListener('storage', onSoundStorage);
      document.removeEventListener('visibilitychange', onVisibility);
      wrap.removeEventListener('coeduca-game-help-open', onHelpOpen);
      wrap.removeEventListener('coeduca-game-help-close', onHelpClose);
      if (observer) observer.disconnect();
    }

    startButton.addEventListener('click', start);
    wrap.querySelector('.cj-center').addEventListener('click', () => {
      tiltCenter = tiltRaw;
      tiltTarget = 0;
      tiltSmooth = 0;
      statusEl.textContent = tiltRaw === null ? 'No se detectó inclinación. Usa los botones ◀ ▶.' : 'Inclinación recentrada.';
      wrap.focus();
    });
    bindDirection(wrap.querySelector('.cj-left'), -1);
    bindDirection(wrap.querySelector('.cj-right'), 1);
    global.addEventListener('keydown', onKeyDown);
    global.addEventListener('keyup', onKeyUp);
    global.addEventListener('storage', onSoundStorage);
    document.addEventListener('visibilitychange', onVisibility);
    wrap.addEventListener('coeduca-game-help-open', onHelpOpen);
    wrap.addEventListener('coeduca-game-help-close', onHelpClose);
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (!document.body.contains(wrap)) cleanup();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    reset();
    phase = 'ready';
    draw();
    loadRigoSprite();
  });
})(window);
