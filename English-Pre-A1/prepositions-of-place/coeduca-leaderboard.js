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
  // Conservamos los valores emoji del servidor para respetar las elecciones anteriores.
  const AVATAR_IMAGES = [
    { kind:'rigo', emoji:null, name:'Rigo', file:'avatar-rigo.webp' },
    { kind:'emoji', emoji:'🐱', name:'Gato', file:'avatar-gato.webp' },
    { kind:'emoji', emoji:'🐶', name:'Perro', file:'avatar-perro.webp' },
    { kind:'emoji', emoji:'🦊', name:'Loro', file:'avatar-loro.webp' },
    { kind:'emoji', emoji:'🐼', name:'Caracol', file:'avatar-caracol.webp' },
    { kind:'emoji', emoji:'🐸', name:'Oruga', file:'avatar-oruga.webp' },
    { kind:'emoji', emoji:'🐯', name:'León', file:'avatar-leon.webp' },
    { kind:'emoji', emoji:'🦄', name:'Caballo', file:'avatar-caballo.webp' },
    { kind:'emoji', emoji:'🐧', name:'Pingüino', file:'avatar-pinguino.webp' },
    { kind:'emoji', emoji:'🐙', name:'Medusa', file:'avatar-medusa.webp' },
    { kind:'emoji', emoji:'🚀', name:'Delfín', file:'avatar-delfin.webp' },
    { kind:'emoji', emoji:'⭐', name:'Pollo', file:'avatar-pollo.webp' },
    { kind:'emoji', emoji:'⚡', name:'Murciélago', file:'avatar-murcielago.webp' },
    { kind:'emoji', emoji:'🐻', name:'Camello', file:'avatar-camello.webp' },
    { kind:'emoji', emoji:'🦋', name:'Mariposa', file:'avatar-mariposa.webp' }
  ];
  const AVATAR_COLORS = [
    ['Cielo', '#EAF7FF'], ['Blanco', '#FFFFFF'], ['Crema', '#FFF3D6'],
    ['Amarillo', '#FFE27A'], ['Naranja', '#FFC078'], ['Durazno', '#FFD4B8'],
    ['Coral', '#FFA69E'], ['Rosa', '#FFC8DD'], ['Frambuesa', '#F5A3D7'],
    ['Lila', '#EBD6FF'], ['Lavanda', '#D2C0F5'], ['Azul claro', '#C8E5FF'],
    ['Azul', '#A9D6FF'], ['Aguamarina', '#A6ECF1'], ['Turquesa', '#9DE6E0'],
    ['Menta', '#BDF3D2'], ['Lima', '#E5F28C'], ['Verde', '#CBEF9A'],
    ['Arena', '#E9D3B3'], ['Gris', '#D9E1E8'],
    ['Rojo intenso', '#F44336'], ['Fucsia intenso', '#D81B60'],
    ['Morado intenso', '#8E24AA'], ['Violeta intenso', '#673AB7'],
    ['Azul intenso', '#1E88E5'], ['Azul rey', '#1565C0'],
    ['Turquesa intenso', '#00ACC1'], ['Verde esmeralda', '#00897B'],
    ['Verde vivo', '#43A047'], ['Naranja intenso', '#F57C00']
  ];
  const DEFAULT_AVATAR_BG = '#EAF7FF';
  const AVATAR_BUCKET = 'game-avatars';
  let activeAvatarDialog = null;

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
      .cg-leaderboard-heading { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:10px; }
      .cg-leaderboard-heading .cg-leaderboard-title { margin:0; }
      .cg-leaderboard-own-avatar { display:flex; align-items:center; gap:5px; border:0; background:transparent; color:inherit; font:800 12px system-ui,sans-serif; cursor:pointer; }
      .cg-leaderboard-own-avatar[hidden] { display:none; }
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
      .cg-leaderboard-board-heading { display:flex; align-items:center; justify-content:center; gap:7px; margin-bottom:8px; }
      .cg-leaderboard-board-heading h4 { margin:0; }
      .cg-leaderboard-board-heading button { display:inline-grid; place-items:center; width:24px; height:24px; padding:2px; border:0; background:transparent; color:inherit; cursor:pointer; }
      .cg-leaderboard-board-heading button svg { display:block; width:18px; height:18px; }
      .cg-leaderboard-list { list-style: none; margin: 0; padding: 0; }
      .cg-leaderboard-row {
        display: grid; grid-template-columns: 28px 34px minmax(0, 1fr) auto;
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
      .rank-1 .cg-leaderboard-rank { color: #a86500; background: #fff5b5; text-shadow: 0 1px 0 #fff3a0; }
      .cg-leaderboard-avatar-wrap { position:relative; display:block; width:34px; height:34px; }
      .rank-1 .cg-leaderboard-avatar-wrap { animation:cgLeaderboardRankFloat 1.7s ease-in-out infinite; }
      .rank-1 .cg-leaderboard-avatar-wrap::before {
        content: ''; position: absolute; z-index: 2; top: -13px; left: 3px;
        width: 28px; height: 18px;
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
      .cg-leaderboard-avatar { display:grid; place-items:center; width:34px; height:34px; padding:0; overflow:hidden; border:2px solid #22324a; border-radius:50%; background:#fff; font:20px system-ui,sans-serif; line-height:1; }
      .cg-leaderboard-placeholder { display:block; font-size:26px; line-height:1; transform:translate(0px, 5px) scale(1.02); }
      button.cg-leaderboard-avatar { cursor:pointer; }
      button.cg-leaderboard-avatar:hover { transform:scale(1.08); }
      .cg-leaderboard-avatar img { display:block; width:100%; height:100%; object-fit:contain; }
      .cg-leaderboard-avatar[data-kind="photo"] img { object-fit:cover; }
      .cg-leaderboard-avatar:focus-visible, .cg-leaderboard-own-avatar:focus-visible { outline:3px solid #147b69; outline-offset:2px; }
      .cg-leaderboard-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
      .cg-leaderboard-grade { display: block; opacity: .66; font-size: 10px; }
      .cg-leaderboard-score {
        min-width: 38px; padding: 3px 7px; text-align: center; font-weight: 900;
        background: var(--coeduca-primary, #ffd700); border: 1px solid var(--coeduca-stroke, #1a1a1a); border-radius: 20px;
      }
      .is-podium .cg-leaderboard-score { background: rgba(255,255,255,.72); }
      .cg-leaderboard-empty { padding: 12px 4px; text-align: center; font-size: 12px; opacity: .62; }
      .cg-avatar-dialog-backdrop { position:fixed; inset:0; z-index:2147483647; display:grid; place-items:center; padding:16px; background:#16293cbb; }
      .cg-avatar-dialog { width:min(100%,420px); max-height:min(94dvh,780px); overflow:auto; padding:20px; border:3px solid #22324a; border-radius:20px; background:#fff9ed; color:#22324a; box-shadow:6px 6px 0 #22324a; font-family:system-ui,sans-serif; text-align:center; }
      .cg-avatar-dialog h3 { margin:0 0 5px; font-size:24px; }
      .cg-avatar-dialog p { margin:4px 0 12px; font-size:13px; }
      .cg-avatar-dialog-preview { display:grid; place-items:center; width:76px; height:76px; margin:4px auto 8px; border:2px solid #22324a; border-radius:50%; overflow:hidden; background:#eaf7ff; }
      .cg-avatar-dialog-preview img { display:block; width:100%; height:100%; object-fit:contain; }
      .cg-avatar-dialog-options { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; margin:12px 0; }
      .cg-avatar-dialog-options button { display:grid; place-items:center; aspect-ratio:1; padding:0; overflow:hidden; border:2px solid #22324a; border-radius:50%; background:#fff; cursor:pointer; }
      .cg-avatar-dialog-options button[aria-pressed="true"] { outline:2px solid #22324a; outline-offset:2px; }
      .cg-avatar-dialog-preview[hidden], .cg-avatar-dialog-color-label[hidden], .cg-avatar-dialog-options[hidden], .cg-avatar-dialog-colors[hidden], .cg-avatar-dialog-upload[hidden], .cg-avatar-dialog-actions button[hidden] { display:none; }
      .cg-avatar-dialog-options img { display:block; width:100%; height:100%; object-fit:contain; }
      .cg-avatar-dialog-colors { display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:7px; margin:8px 0 12px; }
      .cg-avatar-dialog-colors button { width:100%; aspect-ratio:1; border:2px solid #22324a; border-radius:50%; cursor:pointer; }
      .cg-avatar-dialog-colors button[aria-pressed="true"] { outline:3px solid #147b69; outline-offset:2px; }
      .cg-avatar-dialog-colors button:focus-visible, .cg-avatar-dialog-options button:focus-visible { outline:3px solid #147b69; outline-offset:2px; }
      .cg-avatar-dialog-upload { display:block; width:100%; min-height:42px; padding:9px; border:2px solid #22324a; border-radius:10px; background:#d9f3ff; color:#22324a; font:800 13px system-ui,sans-serif; cursor:pointer; }
      .cg-avatar-dialog-actions { position:sticky; bottom:-20px; z-index:1; display:flex; justify-content:center; gap:8px; margin-top:10px; padding:8px 0 4px; background:#fff9ed; }
      .cg-avatar-dialog-actions button { min-height:38px; padding:7px 12px; border:2px solid #22324a; border-radius:9px; background:#fff; color:#22324a; font:800 12px system-ui,sans-serif; cursor:pointer; }
      .cg-avatar-dialog-actions .cg-avatar-dialog-save { background:#ffe27a; }
      .cg-avatar-dialog-status { min-height:18px; font-size:12px; font-weight:700; }
      .cg-avatar-dialog button:disabled { opacity:.55; cursor:wait; }
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
        .cg-leaderboard-row.rank-1 .cg-leaderboard-avatar-wrap::before,
        .cg-leaderboard-row.is-podium .cg-leaderboard-rank,
        .cg-leaderboard-row.rank-1 .cg-leaderboard-avatar-wrap { animation: none; }
      }
      @media (max-width: 620px) { .cg-leaderboard-grids { grid-template-columns: 1fr; } }
      @media (max-width: 360px) { .cg-avatar-dialog { padding:14px; } .cg-avatar-dialog-options { grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px; margin:8px 0; } .cg-avatar-dialog-colors { grid-template-columns:repeat(8,minmax(0,1fr)); gap:5px; } .cg-avatar-dialog-actions { bottom:-14px; } }
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

  function avatarPath(studentKey) {
    return studentKey + '.webp';
  }

  async function storageRequest(method, path, body, extraHeaders) {
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${AVATAR_BUCKET}${path}`, {
      method,
      headers: { apikey: SUPABASE_KEY, ...extraHeaders },
      body
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Avatar HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }
    return response;
  }

  async function resizePhoto(file) {
    if (!file || !file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
      throw new Error('Selecciona una imagen de hasta 12 MB.');
    }
    let image, objectUrl;
    try {
      if (global.createImageBitmap) image = await global.createImageBitmap(file);
      else {
        objectUrl = URL.createObjectURL(file);
        image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error('No se pudo abrir la imagen.'));
          image.src = objectUrl;
        });
      }
      const width = image.width, height = image.height;
      if (!width || !height) throw new Error('No se pudo abrir la imagen.');
      const square = Math.min(width, height);
      const canvas = document.createElement('canvas');
      const sizes = [250, 220, 190];
      for (const size of sizes) {
        canvas.width = canvas.height = size;
        const paint = canvas.getContext('2d');
        if (!paint) throw new Error('Canvas no está disponible para preparar la foto.');
        paint.clearRect(0, 0, size, size);
        paint.drawImage(image, (width - square) / 2, (height - square) / 2,
          square, square, 0, 0, size, size);
        for (const quality of [.78, .62, .48]) {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
          if (!blob || blob.type !== 'image/webp') throw new Error('Este navegador no puede convertir fotos a WebP.');
          if (blob.size <= 120 * 1024) return blob;
        }
      }
      throw new Error('La foto sigue siendo demasiado grande después de comprimirla.');
    } finally {
      if (image && image.close) image.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  function avatarBackground(profile) {
    const color = profile && profile.avatar_bg;
    return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
      ? color : DEFAULT_AVATAR_BG;
  }

  function avatarImage(profile) {
    return AVATAR_IMAGES.find(choice => choice.kind === profile?.avatar_kind &&
      (choice.kind !== 'emoji' || choice.emoji === profile.avatar_emoji));
  }

  function fillAvatar(element, profile) {
    element.replaceChildren();
    element.dataset.kind = profile?.avatar_kind || 'none';
    element.style.backgroundColor = avatarBackground(profile);
    function placeholder() {
      const icon = document.createElement('span');
      icon.className = 'cg-leaderboard-placeholder';
      icon.textContent = '👤';
      element.replaceChildren(icon);
    }
    const kind = profile && profile.avatar_kind;
    if (kind === 'photo' && /^[0-9a-f]{64}\.webp$/.test(profile.avatar_path || '')) {
      const img = document.createElement('img');
      img.src = `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${profile.avatar_path}?v=${Number(profile.photo_version) || 0}`;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => { if (img.parentNode === element) placeholder(); };
      element.appendChild(img);
    } else if (avatarImage(profile)) {
      const img = document.createElement('img');
      img.src = avatarImage(profile).file;
      img.alt = '';
      img.onerror = () => { if (img.parentNode === element) placeholder(); };
      element.appendChild(img);
    } else {
      placeholder();
    }
  }

  function hasAvatar(profile) {
    return Boolean(profile && profile.avatar_kind && profile.avatar_kind !== 'none');
  }

  async function getPersonalBest(ctx, game) {
    const student = ctx && ctx.student;
    if (!SUPPORTED_GAMES.has(game) || !student || !student.nie) return null;
    const data = await rpc('get_game_leaderboards', {
      p_game: game,
      p_grade: student.grade || '',
      p_student_key: await hashStudentId(student.nie)
    });
    // Las páginas que todavía usan la función SQL anterior también pueden
    // recuperar la marca cuando el alumno figura en cualquiera de los top 10.
    const scores = data && data.personal_best != null ? [data.personal_best] : [];
    for (const row of [...(data && Array.isArray(data.global) ? data.global : []),
      ...(data && Array.isArray(data.grade) ? data.grade : [])]) {
      if (row.is_me) scores.push(row.score);
    }
    const valid = scores.map(Number).filter(value => Number.isSafeInteger(value) && value >= 0);
    return valid.length ? Math.max(...valid) : null;
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

  function createList(title, rows, limit, onRefresh, canChooseAvatar, onAvatarClick) {
    const board = document.createElement('section');
    board.className = 'cg-leaderboard-board';
    const boardHeading = document.createElement('div');
    boardHeading.className = 'cg-leaderboard-board-heading';
    const heading = document.createElement('h4');
    heading.textContent = title;
    boardHeading.appendChild(heading);
    if (typeof onRefresh === 'function') {
      const reload = document.createElement('button');
      reload.type = 'button';
      reload.innerHTML = global.COEDUCA_GAME_ICONS.icon('retry');
      reload.title = 'Actualizar rankings';
      reload.setAttribute('aria-label', 'Actualizar rankings de puntuaciones');
      reload.addEventListener('click', onRefresh);
      boardHeading.appendChild(reload);
    }
    board.appendChild(boardHeading);

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
      const rank = document.createElement('span');
      rank.className = 'cg-leaderboard-rank';
      rank.textContent = String(index + 1);

      // El propio placeholder también es interactivo cuando el avatar sigue
      // bloqueado: así el modal puede explicar cómo se desbloquea.
      const editable = Boolean(row.is_me);
      const avatarWrap = document.createElement('span');
      avatarWrap.className = 'cg-leaderboard-avatar-wrap';
      const avatar = document.createElement(editable ? 'button' : 'span');
      avatar.className = 'cg-leaderboard-avatar';
      if (editable) {
        avatar.type = 'button';
        const avatarAction = canChooseAvatar
          ? 'Elegir o cambiar mi avatar'
          : hasAvatar(row) ? 'Administrar mi avatar' : 'Ver cómo desbloquear mi avatar';
        avatar.setAttribute('aria-label', avatarAction);
        avatar.title = avatarAction;
        avatar.addEventListener('click', onAvatarClick);
      } else avatar.setAttribute('aria-hidden', 'true');
      fillAvatar(avatar, row);
      avatarWrap.appendChild(avatar);

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
      item.append(rank, avatarWrap, student, score);
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
    const heading = document.createElement('div');
    heading.className = 'cg-leaderboard-heading';
    const title = document.createElement('h3');
    title.className = 'cg-leaderboard-title';
    title.textContent = '🏆 Ranking de puntuaciones';
    const ownAvatarButton = document.createElement('button');
    ownAvatarButton.type = 'button';
    ownAvatarButton.className = 'cg-leaderboard-own-avatar';
    ownAvatarButton.hidden = true;
    ownAvatarButton.setAttribute('aria-label', 'Cambiar mi avatar');
    const ownAvatarImage = document.createElement('span');
    ownAvatarImage.className = 'cg-leaderboard-avatar';
    ownAvatarButton.append(ownAvatarImage, document.createTextNode('Mi avatar'));
    ownAvatarButton.addEventListener('click', openAvatarDialog);
    heading.append(title, ownAvatarButton);
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
    root.append(heading, note, status);
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
    let ownProfile = null;

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

    async function openAvatarDialog() {
      if (activeAvatarDialog) activeAvatarDialog();
      const previousFocus = document.activeElement;
      const backdrop = document.createElement('div');
      backdrop.className = 'cg-avatar-dialog-backdrop';
      const dialog = document.createElement('section');
      dialog.className = 'cg-avatar-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', 'Elegir avatar');
      const heading = document.createElement('h3');
      heading.textContent = 'Elige tu avatar';
      const hint = document.createElement('p');
      hint.textContent = 'Elige un animal y un color de fondo. También puedes subir una foto.';
      const preview = document.createElement('div');
      preview.className = 'cg-avatar-dialog-preview';
      preview.setAttribute('aria-label', 'Vista previa del avatar');
      const options = document.createElement('div');
      options.className = 'cg-avatar-dialog-options';
      options.setAttribute('aria-label', 'Animales disponibles');
      const colorLabel = document.createElement('p');
      colorLabel.className = 'cg-avatar-dialog-color-label';
      colorLabel.textContent = 'Color de fondo';
      const colors = document.createElement('div');
      colors.className = 'cg-avatar-dialog-colors';
      colors.setAttribute('aria-label', 'Colores de fondo');
      const statusLine = document.createElement('div');
      statusLine.className = 'cg-avatar-dialog-status';
      statusLine.setAttribute('role', 'status');
      const upload = document.createElement('button');
      upload.type = 'button';
      upload.className = 'cg-avatar-dialog-upload';
      upload.textContent = '📷 Subir una foto';
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.hidden = true;
      const actions = document.createElement('div');
      actions.className = 'cg-avatar-dialog-actions';
      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'cg-avatar-dialog-save';
      saveButton.textContent = 'Guardar avatar';
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.textContent = 'Eliminar avatar';
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.textContent = 'Cerrar';
      actions.append(saveButton, clear, closeButton);
      dialog.append(heading, hint, preview, options, colorLabel, colors, upload, input, statusLine, actions);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      let busy = false;
      let unlocked = false;
      let canDelete = hasAvatar(ownProfile);
      let studentKey = null;
      let selectedChoice = avatarImage(ownProfile) || null;
      let selectedColor = avatarBackground(ownProfile);
      function close() {
        backdrop.remove();
        document.removeEventListener('keydown', onKeyDown, true);
        if (activeAvatarDialog === close) activeAvatarDialog = null;
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      }
      function onKeyDown(event) {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
      }
      function setBusy(value, message) {
        busy = value;
        options.hidden = upload.hidden = !unlocked;
        clear.hidden = !canDelete;
        options.querySelectorAll('button').forEach(button => { button.disabled = value || !unlocked; });
        colors.querySelectorAll('button').forEach(button => { button.disabled = value || !unlocked; });
        upload.disabled = value || !unlocked;
        clear.disabled = value || !canDelete;
        renderSelection();
        statusLine.textContent = message || '';
      }
      function renderSelection() {
        preview.hidden = !selectedChoice;
        colorLabel.hidden = colors.hidden = !unlocked || !selectedChoice;
        saveButton.hidden = !unlocked;
        saveButton.disabled = busy || !unlocked || !selectedChoice;
        if (selectedChoice) fillAvatar(preview, {
          avatar_kind:selectedChoice.kind, avatar_emoji:selectedChoice.emoji, avatar_bg:selectedColor
        });
        options.querySelectorAll('button').forEach(button => {
          button.setAttribute('aria-pressed', String(selectedChoice &&
            button.dataset.kind === selectedChoice.kind &&
            (selectedChoice.kind !== 'emoji' || button.dataset.emoji === selectedChoice.emoji)));
          button.style.backgroundColor = selectedColor;
        });
        colors.querySelectorAll('button').forEach(button =>
          button.setAttribute('aria-pressed', String(button.dataset.color === selectedColor)));
      }
      async function save(kind, emoji) {
        if (busy || (kind === 'none' ? !canDelete : !unlocked)) return;
        setBusy(true, 'Guardando avatar…');
        try {
          const hadPhoto = ownProfile && ownProfile.avatar_kind === 'photo';
          const saved = kind === 'none'
            ? await rpc('set_game_avatar', {
              p_student_key:studentKey, p_kind:kind, p_emoji:null
            })
            : await rpc('set_game_avatar_with_color', {
              p_student_key:studentKey, p_kind:kind, p_emoji:emoji || null, p_bg:selectedColor
            });
          if (saved !== true) throw new Error(kind === 'none'
            ? 'No se pudo eliminar el avatar.'
            : 'Ya no estás en el Top 1 global o no se pudo guardar el avatar.');
          ownProfile = { avatar_kind:kind, avatar_emoji:emoji || null,
            avatar_bg:selectedColor, avatar_path:null };
          fillAvatar(ownAvatarImage, ownProfile);
          if (hadPhoto) {
            try {
              await storageRequest('DELETE', '', JSON.stringify({ prefixes:[avatarPath(studentKey)] }),
                { 'Content-Type':'application/json' });
            } catch (error) {
              console.warn('No se pudo retirar la foto anterior', error);
            }
          }
          close();
          refresh();
        } catch (error) {
          console.warn('No se pudo cambiar el avatar', error);
          setBusy(false, error.message || 'No se pudo cambiar el avatar.');
        }
      }
      function addChoice(choice) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.kind = choice.kind;
        if (choice.emoji) button.dataset.emoji = choice.emoji;
        button.setAttribute('aria-label', choice.name);
        button.title = choice.name;
        const img = document.createElement('img');
        img.src = choice.file;
        img.alt = '';
        button.appendChild(img);
        button.addEventListener('click', () => {
          selectedChoice = choice;
          renderSelection();
        });
        options.appendChild(button);
      }
      AVATAR_IMAGES.forEach(addChoice);
      AVATAR_COLORS.forEach(([label, color]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.color = color;
        button.style.backgroundColor = color;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.addEventListener('click', () => {
          selectedColor = color;
          renderSelection();
        });
        colors.appendChild(button);
      });
      renderSelection();
      saveButton.addEventListener('click', () => {
        if (selectedChoice) save(selectedChoice.kind, selectedChoice.emoji);
      });
      upload.addEventListener('click', () => { if (!busy && unlocked) input.click(); });
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (!file || busy || !unlocked) return;
        setBusy(true, 'Preparando foto WebP…');
        try {
          const blob = await resizePhoto(file);
          setBusy(true, 'Subiendo foto…');
          await storageRequest('POST', '/' + avatarPath(studentKey), blob,
            { 'Content-Type':'image/webp', 'x-upsert':'true', 'cache-control':'max-age=3600' });
          const saved = await rpc('set_game_avatar', {
            p_student_key:studentKey, p_kind:'photo', p_emoji:null
          });
          if (saved !== true) throw new Error('La foto se subió, pero no se pudo activar.');
          ownProfile = { avatar_kind:'photo', avatar_path:avatarPath(studentKey), photo_version:Date.now() };
          fillAvatar(ownAvatarImage, ownProfile);
          close();
          refresh();
        } catch (error) {
          console.warn('No se pudo subir el avatar', error);
          setBusy(false, error.message || 'No se pudo subir la foto.');
        }
      });
      clear.addEventListener('click', () => save('none', null));
      closeButton.addEventListener('click', close);
      backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
      document.addEventListener('keydown', onKeyDown, true);
      activeAvatarDialog = close;
      closeButton.focus();
      setBusy(true, 'Comprobando tu Top 1…');
      try {
        studentKey = await getStudentKey();
        unlocked = await rpc('unlock_game_avatar', { p_student_key:studentKey }) === true;
        if (backdrop.isConnected) {
          canDelete = hasAvatar(ownProfile);
          if (unlocked) {
            heading.textContent = 'Elige tu avatar';
            hint.textContent = 'Elige un animal y uno de los 30 colores de fondo. También puedes subir una foto.';
            setBusy(false, '');
          } else if (canDelete) {
            heading.textContent = 'Tu avatar';
            hint.textContent = 'Ya no lideras el Top 1 global. Tu avatar seguirá visible hasta que decidas eliminarlo.';
            setBusy(false, '');
          } else {
            heading.textContent = 'Avatar bloqueado';
            hint.textContent = 'Para escoger una foto de perfil debes estar en el puesto 1 global de cualquier juego.';
            setBusy(false, 'Llega al puesto 1 global de cualquier juego para elegir tu avatar.');
          }
        }
      } catch (error) {
        console.warn('No se pudo comprobar el avatar', error);
        if (backdrop.isConnected) setBusy(false, 'No se pudo conectar con el ranking.');
      }
    }

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
        const canChooseAvatar = Boolean(data && data.can_choose_avatar);
        ownProfile = data && data.my_avatar;
        ownAvatarButton.hidden = !canChooseAvatar && !hasAvatar(ownProfile);
        ownAvatarButton.setAttribute('aria-label', canChooseAvatar ? 'Elegir o cambiar mi avatar' : 'Eliminar mi avatar');
        fillAvatar(ownAvatarImage, ownProfile);
        if (isTeacher && Array.isArray(data && data.grades)) {
          availableGrades = [...availableGrades, ...data.grades];
          renderGradeChips();
        }
        grids.replaceChildren(
          createList('🌎 Top 10 global', data && data.global, 10, refresh, canChooseAvatar, openAvatarDialog),
          createList(`🎓 Top 10 · ${gradeToLoad || 'mi grado'}`, data && data.grade, 10, refresh, canChooseAvatar, openAvatarDialog)
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

  global.COEDUCA_LEADERBOARD = { create, getPersonalBest };
})(window);
