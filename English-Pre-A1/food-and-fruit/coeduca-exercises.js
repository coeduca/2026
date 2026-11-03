/**
 * COEDUCA Framework v1 - Exercises
 * 15 tipos de ejercicios reutilizables.
 * Depende de coeduca-core.js.
 *
 * Cada ejercicio recibe ctx = {
 *   container, exerciseId, data, config,
 *   recordAnswer(score, total, details), cheer(), comfort()
 * }
 */
(function (global) {
  'use strict';
  if (!global.COEDUCA) {
    console.error('coeduca-core.js debe cargarse antes que coeduca-exercises.js');
    return;
  }
  const C = global.COEDUCA;
  const reg = (type, fn) => C.registerExercise(type, fn);

  // Inyectar estilos auxiliares una sola vez (placeholder de reorder_sentences)
  (function injectAuxStyles() {
    if (document.getElementById('coeduca-aux-styles')) return;
    const style = document.createElement('style');
    style.id = 'coeduca-aux-styles';
    style.textContent =
      '.ro-target[data-show-placeholder]::before{' +
        'content:attr(data-placeholder);' +
        'position:absolute;' +
        'top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:calc(100% - 20px);' +
        'text-align:center;' +
        'color:#9aa0a6;' +
        'font-style:italic;' +
        'font-size:13px;' +
        'pointer-events:none;' +
        'line-height:1.3;' +
      '}';
    document.head.appendChild(style);
  })();

  // Helper: feedback visual junto a un input/elemento
  function feedback(target, ok, ctx) {
    const span = document.createElement('span');
    span.className = 'coeduca-feedback ' + (ok ? 'correct' : 'wrong');
    span.textContent = ok ? 'OK' : 'X';
    target.parentNode.insertBefore(span, target.nextSibling);
    if (ok) ctx.cheer(); else ctx.comfort();
  }

  function gradeButton(onCheck, ctx) {
    const btn = document.createElement('button');
    btn.className = 'coeduca-btn coeduca-btn-success';
    btn.style.display = 'none';
    btn.addEventListener('click', onCheck);
    queueMicrotask(() => autoSaveAnswers(btn, ctx, onCheck));
    return btn;
  }

  // Save drafts as well as complete answers. Feedback mutations must not create new attempts.
  function autoSaveAnswers(btn, ctx, onCheck) {
    const root = ctx.container;
    const choices = new Map(), picked = new Set();
    const snapshot = () => JSON.stringify([
      [...root.querySelectorAll('input,textarea,select')].map(input => [input.value, input.checked]),
      [...root.querySelectorAll('.ro-target')].map(target => [...target.querySelectorAll('[data-word]')].map(chip => chip.textContent)),
      [...root.querySelectorAll('.cat-drop [data-idx]')].map(chip => [chip.dataset.idx, chip.closest('.cat-drop').dataset.cat]),
      [...root.querySelectorAll('.civica-cell-checkable,.civica-cell-drop')].map(cell => [cell.dataset.state, cell.dataset.tokenLabel]),
      [...choices], [...picked].sort()
    ]);
    let lastSnapshot = snapshot();
    const check = () => {
      if (!btn.isConnected) { observer.disconnect(); return; }
      const next = snapshot();
      if (next === lastSnapshot) return;
      lastSnapshot = next;
      onCheck();
    };
    const observer = new MutationObserver(check);
    observer.observe(root, {subtree:true, childList:true, attributes:true, attributeFilter:['data-state','data-token-label']});
    root.addEventListener('input', event => { if (!event.isComposing) check(); });
    root.addEventListener('compositionend', check);
    root.addEventListener('change', check);
    root.addEventListener('click', event => {
      const choice = event.target.closest('.se-word,.tf-btn');
      if (choice) choices.set(choice.dataset.i, choice.dataset.j ?? choice.dataset.v);
      const word = event.target.closest('.wsel-word');
      if (word) {
        const key = word.dataset.i + ':' + word.dataset.ti;
        if (picked.has(key)) picked.delete(key); else picked.add(key);
      }
      check();
    });
  }

  // =====================================================================
  // 1. WORDSEARCH (sopa de letras con celdas compartidas)
  // =====================================================================
  reg('wordsearch', function (ctx) {
    const data = ctx.data || {};
    const words = (data.words || []).map(w => String(w).toUpperCase().replace(/\s+/g, ''));
    const directions = [
      [0, 1], [1, 0], [1, 1], [-1, 1]  // H, V, diag down-right, diag up-right
    ];

    // Estrategia de colocación:
    //   1) Buscar una pareja con una letra común y colocarla primero para
    //      garantizar al menos un cruce real.
    //   2) La primera palabra siempre va en diagonal. Las siguientes alternan
    //      sus direcciones preferidas para dar variedad al tablero.
    //   3) Salvo la pareja inicial, sólo permitir un cruce cuando ya no exista
    //      ninguna posición libre válida para esa palabra.
    //   4) Si alguna no cabe, agrandar la grilla y reintentar sin descartarla.

    const minSize = data.gridSize || Math.max(10, ...words.map(w => w.length + 2));
    let size, grid, placements;

    function getPlacementOrder() {
      const ordered = words.slice().sort((a, b) => b.length - a.length);
      let pairA = -1;
      let pairB = -1;
      let bestPairLength = -1;
      for (let i = 0; i < ordered.length; i++) {
        for (let j = i + 1; j < ordered.length; j++) {
          const sharesLetter = Array.from(ordered[i]).some(letter => ordered[j].includes(letter));
          const pairLength = ordered[i].length + ordered[j].length;
          if (sharesLetter && pairLength > bestPairLength) {
            pairA = i;
            pairB = j;
            bestPairLength = pairLength;
          }
        }
      }
      if (pairA < 0) return { ordered, hasCrossingPair: false };
      return {
        ordered: [ordered[pairA], ordered[pairB], ...ordered.filter((_, i) => i !== pairA && i !== pairB)],
        hasCrossingPair: true
      };
    }

    function findBestPlacement(grid, size, word, options) {
      const freeCandidates = [];
      const crossingCandidates = [];
      const allowedDirections = options.allowedDirections || directions.map((_, i) => i);
      const hasOccupiedCells = grid.some(row => row.some(cell => cell !== ''));
      for (let d = 0; d < directions.length; d++) {
        if (!allowedDirections.includes(d)) continue;
        const [dr, dc] = directions[d];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const endR = r + dr * (word.length - 1);
            const endC = c + dc * (word.length - 1);
            if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;
            let overlap = 0;
            let nearby = 0;
            let ok = true;
            for (let i = 0; i < word.length; i++) {
              const cell = grid[r + dr * i][c + dc * i];
              if (cell === '') continue;
              if (cell === word[i]) overlap++;
              else { ok = false; break; }
            }
            if (!ok) continue;

            // Medir la densidad alrededor de la posición candidata. Las
            // celdas cercanas pesan más que las que están a dos casillas.
            for (let i = 0; i < word.length; i++) {
              const cellR = r + dr * i;
              const cellC = c + dc * i;
              for (let rr = Math.max(0, cellR - 2); rr <= Math.min(size - 1, cellR + 2); rr++) {
                for (let cc = Math.max(0, cellC - 2); cc <= Math.min(size - 1, cellC + 2); cc++) {
                  if (grid[rr][cc] === '') continue;
                  const distance = Math.max(Math.abs(rr - cellR), Math.abs(cc - cellC));
                  nearby += distance === 0 ? 0 : (distance === 1 ? 3 : 1);
                }
              }
            }

            // La primera palabra se mantiene cerca del centro para que la
            // segunda tenga suficientes opciones para cruzarla.
            const midR = r + dr * (word.length - 1) / 2;
            const midC = c + dc * (word.length - 1) / 2;
            const centerPenalty = hasOccupiedCells ? 0
              : (Math.abs(midR - (size - 1) / 2) + Math.abs(midC - (size - 1) / 2));
            const directionPenalty = d === options.preferredDirection ? 0 : 0.25;
            const score = nearby + centerPenalty + directionPenalty + overlap * 100;
            const candidate = { r, c, dr, dc, score };
            (overlap > 0 ? crossingCandidates : freeCandidates).push(candidate);
          }
        }
      }
      // La pareja inicial exige cruce. Después se elige una posición sin
      // cruce siempre que exista; sólo un tablero lleno habilita otro cruce.
      const candidates = options.requireOverlap
        ? crossingCandidates
        : (freeCandidates.length ? freeCandidates : crossingCandidates);
      if (!candidates.length) return null;
      const bestScore = Math.min(...candidates.map(candidate => candidate.score));
      const bestCandidates = candidates.filter(candidate => candidate.score === bestScore);
      // Desempate aleatorio entre las mejores opciones
      return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    }

    function attemptLayout(targetSize) {
      const g = Array.from({ length: targetSize }, () => Array(targetSize).fill(''));
      const place = [];
      const order = getPlacementOrder();
      for (let index = 0; index < order.ordered.length; index++) {
        const word = order.ordered[index];
        const firstDirection = place.length
          ? directions.findIndex(([dr, dc]) => dr === place[0].dr && dc === place[0].dc)
          : -1;
        const pick = findBestPlacement(g, targetSize, word, {
          requireOverlap: order.hasCrossingPair && index === 1,
          allowedDirections: index === 0
            ? [2, 3]
            : (order.hasCrossingPair && index === 1
              ? directions.map((_, i) => i).filter(i => i !== firstDirection)
              : null),
          preferredDirection: index % directions.length
        });
        if (!pick) return null; // falla: hay que crecer la grilla
        const { r, c, dr, dc } = pick;
        for (let i = 0; i < word.length; i++) g[r + dr * i][c + dc * i] = word[i];
        place.push({ word, r, c, dr, dc });
      }
      return { g, place };
    }

    // Buscar el tamaño mínimo que acomode todas las palabras.
    // Se hacen varios reintentos por tamaño porque la elección aleatoria de
    // desempates puede llevar a un callejón sin salida en una corrida concreta.
    size = minSize;
    let layout = null;
    while (!layout) {
      for (let retry = 0; retry < 12 && !layout; retry++) {
        layout = attemptLayout(size);
      }
      if (!layout) size++;
    }
    grid = layout.g;
    placements = layout.place;

    // Rellenar celdas vacías con letras aleatorias.
    // Sesgar el relleno hacia letras que YA aparecen en las palabras objetivo
    // hace que la sopa se sienta menos "rellena de ruido" y más coherente.
    const targetLetters = words.join('') || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fallbackLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === '') {
          // 70% letras del pool de palabras, 30% alfabeto general
          const pool = Math.random() < 0.7 ? targetLetters : fallbackLetters;
          grid[r][c] = pool[Math.floor(Math.random() * pool.length)];
        }
      }
    }

    // Render
    const wrap = document.createElement('div');
    // Font size dinámico: cada celda ocupa ~(100/size)% del ancho del grid.
    // Queremos que la letra ocupe ~55% de la celda. Mínimo absoluto 9px.
    // cqw funciona porque .ws-grid tiene container-type: inline-size.
    const cellFontSize = `max(9px, ${(55 / size).toFixed(2)}cqw)`;
    wrap.innerHTML = `
      <div class="ws-grid-wrap">
        <div id="ws-grid-${ctx.exerciseId}" class="ws-grid"
             style="grid-template-columns:repeat(${size},1fr); --ws-cell-font:${cellFontSize};"></div>
        <div class="ws-list">
          <div class="ws-list-title">Palabras</div>
          <ul id="ws-list-${ctx.exerciseId}">
            ${words.map(w => `<li data-w="${w}">${w}</li>`).join('')}
          </ul>
          <div class="ws-progress" id="ws-progress-${ctx.exerciseId}">0 / ${words.length}</div>
        </div>
      </div>
    `;
    ctx.container.appendChild(wrap);

    const gridEl = wrap.querySelector('#ws-grid-' + ctx.exerciseId);
    const listEl = wrap.querySelector('#ws-list-' + ctx.exerciseId);
    const progressEl = wrap.querySelector('#ws-progress-' + ctx.exerciseId);

    // Capa SVG sobrepuesta para dibujar las "marcas resaltadoras" sobre las palabras
    // encontradas (estilo marcador pop art).
    gridEl.style.position = 'relative';
    const overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlaySvg.setAttribute('class', 'ws-overlay');
    overlaySvg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:visible;';
    gridEl.appendChild(overlaySvg);

    // Paleta rotativa para los "marcadores" de palabras encontradas
    const highlighterColors = [
      '#FFD700', // dorado
      '#FF6B9D', // rosa
      '#4FC3F7', // celeste
      '#9B5DE5', // morado
      '#FF9F1C', // naranja
      '#4CAF50'  // verde
    ];
    let foundColorIndex = 0;

    let cellIdx = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.textContent = grid[r][c];
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.className = 'ws-cell';
        // Índice usado por el CSS para animación escalonada (cellIn)
        cell.style.setProperty('--i', cellIdx++);
        gridEl.appendChild(cell);
      }
    }

    // Dibuja el trazo de marcador sobre la palabra encontrada
    function drawHighlight(cells) {
      if (!cells || cells.length === 0) return;
      const gridRect = gridEl.getBoundingClientRect();
      const first = cells[0].getBoundingClientRect();
      const last = cells[cells.length - 1].getBoundingClientRect();
      const x1 = first.left + first.width / 2 - gridRect.left;
      const y1 = first.top + first.height / 2 - gridRect.top;
      const x2 = last.left + last.width / 2 - gridRect.left;
      const y2 = last.top + last.height / 2 - gridRect.top;
      // Grosor proporcional al tamaño de la celda
      const thickness = first.width * 0.78;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const color = highlighterColors[foundColorIndex++ % highlighterColors.length];
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', color);
      // SVG no interpreta rgba de forma consistente en Android WebView. La
      // opacidad separada mantiene visibles las letras en todos los navegadores.
      line.setAttribute('stroke-opacity', '0.40');
      line.style.strokeOpacity = '0.40';
      line.setAttribute('stroke-width', thickness);
      line.setAttribute('stroke-linecap', 'round');
      line.style.mixBlendMode = 'multiply';
      // Animación: el trazo se "dibuja" desde el inicio
      const len = Math.hypot(x2 - x1, y2 - y1);
      line.setAttribute('stroke-dasharray', len);
      line.setAttribute('stroke-dashoffset', len);
      line.style.transition = 'stroke-dashoffset 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      overlaySvg.appendChild(line);
      // Triggear la animación en el siguiente frame
      requestAnimationFrame(() => { line.setAttribute('stroke-dashoffset', 0); });
    }

    // Burst de confeti pop art al encontrar una palabra
    function popConfetti(cells) {
      if (!cells || !cells.length) return;
      const mid = cells[Math.floor(cells.length / 2)];
      const rect = mid.getBoundingClientRect();
      const gridRect = gridEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - gridRect.left;
      const cy = rect.top + rect.height / 2 - gridRect.top;
      const colors = ['#7C5CFF', '#FF5C8A', '#4FD1C5', '#F6B93B', '#5B8DEF', '#FF9A8B'];
      const layer = document.createElement('div');
      layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;overflow:visible;';
      gridEl.appendChild(layer);
      const N = 14;
      for (let i = 0; i < N; i++) {
        const dot = document.createElement('span');
        const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
        const dist = 40 + Math.random() * 60;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const color = colors[i % colors.length];
        const isStar = i % 2 === 0;
        dot.style.cssText = `
          position:absolute; left:${cx}px; top:${cy}px;
          width:${isStar ? 10 : 7}px; height:${isStar ? 10 : 7}px;
          background:${color};
          box-shadow: 0 0 8px ${color}80;
          border-radius:${isStar ? '3px' : '50%'};
          transform: translate(-50%,-50%) rotate(0deg);
          transition: transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.7s ease-out;
          opacity: 1;
        `;
        layer.appendChild(dot);
        requestAnimationFrame(() => {
          dot.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${(Math.random()*720-360)|0}deg) scale(${0.4 + Math.random()*0.6})`;
          dot.style.opacity = '0';
        });
      }
      setTimeout(() => layer.remove(), 800);
    }

    let selecting = false;
    let startCell = null;
    let currentSelection = [];
    const found = new Set((ctx.previousAnswer || []).filter(word => words.includes(word)));
    found.forEach(word => {
      const placement = placements.find(item => item.word === word);
      if (!placement) return;
      const cells = [...word].map((_, i) => gridEl.querySelector(`[data-r="${placement.r + placement.dr * i}"][data-c="${placement.c + placement.dc * i}"]`));
      cells.forEach(cell => cell?.classList.add('ws-found'));
      drawHighlight(cells);
      listEl.querySelector(`[data-w="${word}"]`)?.classList.add('ws-li-found');
    });
    if (progressEl) progressEl.textContent = found.size + ' / ' + words.length;

    function clearTempHighlight() {
      gridEl.querySelectorAll('.ws-cell').forEach(c => {
        if (!c.classList.contains('ws-found')) c.classList.remove('ws-active');
      });
    }

    function getCellFromPoint(x, y) {
      const el = document.elementFromPoint(x, y);
      if (el && el.dataset && el.dataset.r !== undefined) return el;
      return null;
    }

    function getLineCells(a, b) {
      const r1 = +a.dataset.r, c1 = +a.dataset.c;
      const r2 = +b.dataset.r, c2 = +b.dataset.c;
      const dr = r2 - r1, dc = c2 - c1;
      const len = Math.max(Math.abs(dr), Math.abs(dc));
      if (len === 0) return [a];
      // Solo aceptamos H, V o diagonales perfectas
      if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
      const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
      const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
      const cells = [];
      for (let i = 0; i <= len; i++) {
        const cell = gridEl.querySelector(`[data-r="${r1 + stepR * i}"][data-c="${c1 + stepC * i}"]`);
        if (!cell) return null;
        cells.push(cell);
      }
      return cells;
    }

    function start(e) {
      const point = e.touches ? e.touches[0] : e;
      const cell = getCellFromPoint(point.clientX, point.clientY);
      if (!cell) return;
      selecting = true;
      startCell = cell;
      currentSelection = [cell];
      clearTempHighlight();
      cell.classList.add('ws-active');
      e.preventDefault();
    }
    function move(e) {
      if (!selecting) return;
      const point = e.touches ? e.touches[0] : e;
      const cell = getCellFromPoint(point.clientX, point.clientY);
      if (!cell) return;
      const cells = getLineCells(startCell, cell);
      if (!cells) return;
      clearTempHighlight();
      cells.forEach(c => { if (!c.classList.contains('ws-found')) c.classList.add('ws-active'); });
      currentSelection = cells;
      e.preventDefault();
    }
    function end() {
      if (!selecting) return;
      selecting = false;
      if (!currentSelection.length) return;
      const word = currentSelection.map(c => c.textContent).join('');
      const reverse = word.split('').reverse().join('');
      const target = words.find(w => (w === word || w === reverse) && !found.has(w));
      if (target) {
        found.add(target);
        const cellsCopy = currentSelection.slice(); // referencia estable
        currentSelection.forEach((c, i) => {
          c.classList.remove('ws-active');
          // Stagger the pop animation across the word
          setTimeout(() => c.classList.add('ws-found'), i * 60);
        });
        // Trazo resaltador SVG y confeti pop art
        drawHighlight(cellsCopy);
        popConfetti(cellsCopy);
        const li = listEl.querySelector(`[data-w="${target}"]`);
        if (li) li.classList.add('ws-li-found');
        if (progressEl) progressEl.textContent = found.size + ' / ' + words.length;
        if (!ctx.examMode) ctx.cheer();
        ctx.recordAnswer(found.size, words.length,
          words.map(w => found.has(w) ? w + ': encontrada' : w + ': no encontrada'), [...found]);
      } else {
        clearTempHighlight();
      }
      currentSelection = [];
    }

    gridEl.addEventListener('mousedown', start);
    gridEl.addEventListener('mousemove', move);
    gridEl.addEventListener('mouseup', end);
    gridEl.addEventListener('touchstart', start, { passive: false });
    gridEl.addEventListener('touchmove', move, { passive: false });
    gridEl.addEventListener('touchend', end);
  });

  // =====================================================================
  // 2. MATCHLINES (unir con líneas usando SVG)
  // =====================================================================
  reg('matchlines', function (ctx) {
    // Acepta tanto [{left,right}, ...] como { pairs: [{left,right}, ...] }
    const raw = ctx.data || [];
    const pairs = Array.isArray(raw) ? raw : (Array.isArray(raw.pairs) ? raw.pairs : []);
    const left = C.shuffle(pairs.map((p, i) => ({ id: i, text: p.left })));
    const right = C.shuffle(pairs.map((p, i) => ({ id: i, text: p.right })));

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="ml-stage" style="position:relative; padding:20px 3px; width:100%; min-width:0; box-sizing:border-box;">
        <svg id="ml-svg-${ctx.exerciseId}" style="position:absolute;inset:0;width:100%;height:100%;
             pointer-events:none;z-index:1; overflow:visible;"></svg>
        <div class="ml-board" style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:clamp(24px,12%,120px); position:relative; z-index:2;">
          <div id="ml-left-${ctx.exerciseId}" style="display:flex; flex-direction:column; justify-content:center; gap:15px; min-width:0;"></div>
          <div id="ml-right-${ctx.exerciseId}" style="display:flex; flex-direction:column; justify-content:center; gap:15px; min-width:0;"></div>
        </div>
      </div>
    `;
    ctx.container.appendChild(wrap);

    const svg = wrap.querySelector('#ml-svg-' + ctx.exerciseId);
    const leftCol = wrap.querySelector('#ml-left-' + ctx.exerciseId);
    const rightCol = wrap.querySelector('#ml-right-' + ctx.exerciseId);

    function makeItem(item, side) {
      const el = document.createElement('div');
      el.textContent = item.text;
      el.dataset.id = item.id;
      el.dataset.side = side;
      
      const bgGrad = side === 'L'
        ? 'linear-gradient(135deg, rgba(91,141,239,0.18) 0%, rgba(79,209,197,0.18) 100%)'
        : 'linear-gradient(135deg, rgba(246,185,59,0.20) 0%, rgba(255,154,139,0.20) 100%)';
      const brdColor = side === 'L' ? 'rgba(91,141,239,0.4)' : 'rgba(246,185,59,0.45)';

      el.style.cssText = `background:${bgGrad}; border:1.5px solid ${brdColor}; border-radius:12px;
        padding:10px clamp(6px,2vw,20px); font-weight:600; cursor:pointer; box-sizing: border-box;
        color: var(--coeduca-text); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        text-align:center; box-shadow:0 4px 12px rgba(56,38,130,0.10); transition:transform 0.18s, box-shadow 0.18s;
        width:100%; min-width:0; max-width:100%; white-space:normal; overflow-wrap:anywhere; position:relative; z-index:2;`;
        
      return el;
    }
    
    left.forEach(it => leftCol.appendChild(makeItem(it, 'L')));
    right.forEach(it => rightCol.appendChild(makeItem(it, 'R')));

    const connections = []; // {leftId, rightId, lineEl}
    (ctx.previousAnswer || []).forEach(pair => {
      if (!Number.isInteger(pair.leftId) || !Number.isInteger(pair.rightId) ||
          pair.leftId < 0 || pair.rightId < 0 || pair.leftId >= pairs.length || pair.rightId >= pairs.length ||
          connections.some(item => item.leftId === pair.leftId || item.rightId === pair.rightId)) return;
      connections.push({...pair, correct:pair.leftId === pair.rightId});
    });
    let activeLeft = null;

    function getConnectionPoint(el, side) {
      const rect = el.getBoundingClientRect();
      const parent = wrap.getBoundingClientRect();
      const x = side === 'L' ? rect.right : rect.left;
      return { 
        x: x - parent.left, 
        y: rect.top + rect.height / 2 - parent.top 
      };
    }

    function drawLine(a, b, color) {
      const p1 = getConnectionPoint(a, 'L');
      const p2 = getConnectionPoint(b, 'R');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      const offset = Math.abs(p2.x - p1.x) * 0.5; 
      // Aquí está corregida la línea del error
      const d = `M ${p1.x},${p1.y} C ${p1.x + offset},${p1.y} ${p2.x - offset},${p2.y} ${p2.x},${p2.y}`;
      
      path.setAttribute('d', d);
      path.setAttribute('stroke', color || '#7C5CFF');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      
      svg.appendChild(path);
      return path;
    }

    function redrawAll() {
      svg.innerHTML = '';
      const r = wrap.getBoundingClientRect();
      // Aquí también se corrigieron las comillas invertidas
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      svg.style.height = r.height + 'px';
      
      connections.forEach(con => {
        // Y aquí
        const a = leftCol.querySelector(`[data-id="${con.leftId}"]`);
        const b = rightCol.querySelector(`[data-id="${con.rightId}"]`);
        con.lineEl = drawLine(a, b, ctx.examMode ? '#7C5CFF' : (con.correct ? '#38B26A' : '#E63946'));
      });
    }

    [leftCol, rightCol].forEach(col => {
      col.addEventListener('click', e => {
        const item = e.target.closest('[data-id]');
        if (!item) return;
        
        if (item.dataset.side === 'L') {
          const idx = connections.findIndex(c => c.leftId == item.dataset.id);
          if (idx >= 0) {
            connections.splice(idx, 1);
            redrawAll();
            checkAll();
          }
          
          leftCol.querySelectorAll('[data-id]').forEach(el => el.style.background = '#E1F5FE');
          
          activeLeft = item;
          item.style.background = '#FFD700';
        } else if (activeLeft) {
          const idx = connections.findIndex(c => c.rightId == item.dataset.id);
          if (idx >= 0) connections.splice(idx, 1);
          
          const correct = activeLeft.dataset.id === item.dataset.id;
          connections.push({
            leftId: activeLeft.dataset.id,
            rightId: item.dataset.id,
            correct
          });
          
          if (!ctx.examMode) {
            if (correct) ctx.cheer(); else ctx.comfort();
            activeLeft.style.background = correct ? '#A8E6CF' : '#FFCDD2';
          } else {
            activeLeft.style.background = '#E1F5FE';
          }
          activeLeft = null;
          redrawAll();
          checkAll();
        }
      });
    });

    function checkAll() {
      const correct = connections.filter(c => c.correct).length;
      // Y aquí en el registro final
      ctx.recordAnswer(correct, pairs.length,
        connections.map(c => `${c.leftId} -> ${c.rightId}: ${c.correct ? 'OK' : 'X'}`), connections.map(c=>({leftId:Number(c.leftId),rightId:Number(c.rightId)})));
    }

    // El texto determina la altura; las líneas siguen los bordes al cambiar
    // el ancho del contenedor, la fuente o la orientación de la pantalla.
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        if (!wrap.isConnected) { observer.disconnect(); return; }
        redrawAll();
      });
      observer.observe(wrap);
    } else {
      window.addEventListener('resize', redrawAll);
      if (document.fonts) document.fonts.ready.then(redrawAll);
    }
    requestAnimationFrame(redrawAll);
});

  // =====================================================================
  // 3. DRAGBANK (arrastrar palabras de un banco a huecos)
  // =====================================================================
  reg('dragbank', function (ctx) {
    // data: { sentences: [{text: 'I ___ to school', answer: 'go'}, ...], bank: ['extra', 'words'] }
    const sentences = (ctx.data && ctx.data.sentences) || [];
    const extraBank = (ctx.data && ctx.data.bank) || [];
    const allWords = C.shuffle([...sentences.map(s => s.answer), ...extraBank]);

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="db-bank-${ctx.exerciseId}" class="coeduca-panel-soft" style="display:flex;flex-wrap:wrap;gap:8px;
           margin-bottom:16px;min-height:50px;">
      </div>
      <div id="db-sentences-${ctx.exerciseId}"></div>
    `;
    ctx.container.appendChild(wrap);

    const bankEl = wrap.querySelector('#db-bank-' + ctx.exerciseId);
    const sentEl = wrap.querySelector('#db-sentences-' + ctx.exerciseId);

    function makeWord(w) {
      const el = document.createElement('div');
      el.textContent = w;
      el.className = 'db-word coeduca-chip coeduca-chip-accent';
      el.dataset.word = w;
      el.style.cursor = 'grab';
      attachDrag(el);
      return el;
    }
    allWords.forEach(w => bankEl.appendChild(makeWord(w)));

    sentences.forEach((s, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'margin:10px 0;font-size:16px;line-height:2;font-weight:600;';
      const parts = s.text.split('___');
      const slot = `<span class="db-slot coeduca-slot" data-i="${i}" data-answer="${C.escapeHTML(s.answer)}"></span>`;
      row.innerHTML = (i + 1) + '. ' + C.escapeHTML(parts[0]) + slot + C.escapeHTML(parts[1] || '');
      sentEl.appendChild(row);
    });

    function attachDrag(el) {
      C.makeDraggable(el, {
        onMove: ({ under }) => {
          document.querySelectorAll('.db-slot').forEach(s => s.classList.remove('coeduca-drop-hover'));
          const slot = under && under.closest && under.closest('.db-slot');
          if (slot) slot.classList.add('coeduca-drop-hover');
        },
        onDrop: ({ under }) => {
          document.querySelectorAll('.db-slot').forEach(s => s.classList.remove('coeduca-drop-hover'));
          
          if (!under) return;
          const slot = under.closest && under.closest('.db-slot');
          if (slot) {
            const existing = slot.querySelector('.db-word');
            if (existing) bankEl.appendChild(existing);
            slot.appendChild(el);
            
            if (C.normalize(el.textContent) === C.normalize(slot.dataset.answer)) {
              if (!ctx.examMode) ctx.cheer();
            } else {
              if (!ctx.examMode) ctx.comfort();
            }
            // -------------------------------
            check();
          } else {
            if (el.parentElement && !el.parentElement.classList.contains('db-slot')) {
            } else {
              bankEl.appendChild(el);
            }
          }
        }
      });
    }

    function check() {
      let correct = 0;
      const details = [];
      sentEl.querySelectorAll('.db-slot').forEach(slot => {
        const w = slot.querySelector('.db-word');
        const ans = slot.dataset.answer;
        if (w && C.normalize(w.textContent) === C.normalize(ans)) {
          correct++;
          if (!ctx.examMode) {
            slot.style.borderColor = 'var(--coeduca-success)';
            slot.style.background = 'rgba(56,178,106,0.12)';
          }
          details.push(ans + ': OK');
        } else {
          if (!ctx.examMode) {
            slot.style.borderColor = w ? 'var(--coeduca-error)' : 'rgba(124,92,255,0.4)';
            slot.style.background = w ? 'rgba(230,57,70,0.10)' : 'rgba(255,255,255,0.6)';
          }
          details.push(ans + ': ' + (w ? w.textContent + ' (X)' : 'vacio'));
        }
      });
      ctx.recordAnswer(correct, sentences.length, details, [...sentEl.querySelectorAll('.db-slot')].map(slot => slot.querySelector('.db-word')?.textContent || ''));
      if (!ctx.examMode && correct === sentences.length) ctx.cheer();
    }
  });

  // NOTA: 'listenfill' (escuchar y rellenar) se logra usando type:'dragbank'
  // con la propiedad 'audio' a nivel de ejercicio. El core renderiza el
  // reproductor automáticamente arriba del banco de palabras.

  // =====================================================================
  // 5. REORDER_SENTENCES (reordenar oraciones desordenadas) - MEJORADO
  // =====================================================================
  reg('reorder_sentences', function (ctx) {
    // data: [{ words: ['I', 'go', 'to', 'school'], es: 'Voy a la escuela' }]
    //   o   [{ sentence: 'I go to school', es: 'Voy a la escuela' }]
    // El campo `es` es opcional. Si se incluye, se muestra como placeholder
    // dentro de la caja vacía donde el alumno arma la oración: una pista en
    // español para que sepa qué oración tiene que armar.
    const items = (ctx.data || []).map((it, idx) => {
      const words = it.words || it.sentence.split(/\s+/);
      return {
        idx,
        original: words.slice(),
        shuffled: C.shuffle(words.slice()),
        es: it.es || ''
      };
    });

    const wrap = document.createElement('div');

    items.forEach((it, i) => {
      const rowWrap = document.createElement('div');
      rowWrap.className = 'coeduca-panel';
      rowWrap.style.cssText = 'margin:14px 0;';

      const header = document.createElement('div');
      header.style.cssText = 'font-weight:700;margin-bottom:12px;color:var(--coeduca-text);';
      header.textContent = `${i + 1}. Ordena las palabras para formar la oración:`;
      rowWrap.appendChild(header);

      // Si el item incluye traducción al español, la mostramos arriba de las cajas
      // como una pista clara y leíble (con icono y estilo distinto de las fichas).
      if (it.es) {
        const hint = document.createElement('div');
        hint.style.cssText = 'margin:0 0 10px 0;padding:8px 14px;background:rgba(246,185,59,0.12);' +
          'border:1px solid rgba(246,185,59,0.4);border-left:3px solid var(--coeduca-amber);' +
          'border-radius:8px;font-style:italic;font-size:14px;' +
          'color:var(--coeduca-text-soft);';
        hint.innerHTML = '<b>Pista en español:</b> ' + C.escapeHTML(it.es);
        rowWrap.appendChild(hint);
      }

      // Contenedor responsivo
      const flexContainer = document.createElement('div');
      flexContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:10px;';

      // Caja 1: Banco (Origen)
      const sourceBox = document.createElement('div');
      sourceBox.className = 'ro-source';
      sourceBox.style.cssText = 'flex:1 1 200px; display:flex; flex-wrap:wrap; align-content:flex-start; gap:6px; min-height:48px; padding:10px; background:rgba(255,255,255,0.45); border:1.5px dashed rgba(124,92,255,0.3); border-radius:10px;';

      // Caja 2: Zona (Destino).
      // Usamos un placeholder CSS-only mediante `data-placeholder` + ::before
      // para que se muestre solo cuando la caja esté vacía. Si no hay traducción,
      // usamos un texto neutro que invita a soltar las palabras aquí.
      const targetBox = document.createElement('div');
      targetBox.className = 'ro-target';
      targetBox.dataset.i = i;
      const placeholderText = it.es
        ? '"' + it.es + '"  -  arma la oración en inglés aquí'
        : 'Suelta las palabras aquí';
      targetBox.dataset.placeholder = placeholderText;
      targetBox.style.cssText = 'position:relative; flex:1 1 200px; display:flex; flex-wrap:wrap; align-content:flex-start; gap:6px; min-height:48px; padding:10px; background:rgba(255,255,255,0.85); border:1.5px solid rgba(124,92,255,0.25); border-radius:10px; box-shadow:inset 0 2px 6px rgba(0,0,0,0.04);';

      flexContainer.appendChild(sourceBox);
      flexContainer.appendChild(targetBox);
      rowWrap.appendChild(flexContainer);
      wrap.appendChild(rowWrap);

      // Helper: muestra/oculta el placeholder según el contenido de targetBox
      const updatePlaceholder = () => {
        const hasChips = targetBox.querySelector('[data-word]');
        if (hasChips) {
          targetBox.removeAttribute('data-show-placeholder');
        } else {
          targetBox.setAttribute('data-show-placeholder', '1');
        }
      };
      updatePlaceholder();

      // Crear las fichas
      it.shuffled.forEach((w) => {
        const chip = document.createElement('div');
        chip.textContent = w;
        chip.dataset.word = w;
        chip.className = 'coeduca-chip coeduca-chip-info';
        chip.style.cssText += 'cursor:grab; user-select:none; position:relative; z-index:2;';

        // Variables para detectar si fue arrastre o solo un clic rápido
        let pX = 0, pY = 0;

        // Aplicar sistema de Drag & Drop del core
        C.makeDraggable(chip, {
          onPickup: ({ clientX, clientY }) => {
            pX = clientX;
            pY = clientY;
          },
          onMove: ({ under }) => {
            sourceBox.style.borderColor = 'rgba(124,92,255,0.3)';
            targetBox.style.borderColor = 'rgba(124,92,255,0.25)';
            const hoverBox = under && under.closest ? under.closest('.ro-source, .ro-target') : null;
            if (hoverBox) hoverBox.style.borderColor = 'var(--coeduca-primary)';
          },
          onDrop: ({ under, clientX, clientY }) => {
            sourceBox.style.borderColor = 'rgba(124,92,255,0.3)';
            targetBox.style.borderColor = 'rgba(124,92,255,0.25)';

            // DETECTOR DE CLIC: Si movió menos de 5px, lo tomamos como un clic/tap
            if (Math.abs(clientX - pX) < 5 && Math.abs(clientY - pY) < 5) {
              if (chip.parentElement === sourceBox) {
                targetBox.appendChild(chip);
              } else {
                sourceBox.appendChild(chip);
              }
              updatePlaceholder();
              return;
            }

            // Lógica normal de soltar al arrastrar
            const dropBox = under && under.closest ? under.closest('.ro-source, .ro-target') : null;
            if (dropBox) {
              const siblings = [...dropBox.querySelectorAll('[data-word]')].filter(c => c !== chip);
              let insertBeforeNode = null;
              for (const sibling of siblings) {
                const rect = sibling.getBoundingClientRect();
                if (clientX < rect.left + rect.width / 2) {
                  insertBeforeNode = sibling;
                  break;
                }
              }
              if (insertBeforeNode) {
                dropBox.insertBefore(chip, insertBeforeNode);
              } else {
                dropBox.appendChild(chip);
              }
            } else {
              if (chip.parentElement !== targetBox) {
                sourceBox.appendChild(chip);
              }
            }
            updatePlaceholder();

            const tBox = wrap.querySelector(`.ro-target[data-i="${i}"]`);
            const got = [...tBox.querySelectorAll('[data-word]')].map(c => c.textContent);
            if (got.length === it.original.length) {
              if (!ctx.examMode) {
                if (got.join(' ') === it.original.join(' ')) ctx.cheer();
                else ctx.comfort();
              }
            }
          }
        });

        sourceBox.appendChild(chip);
      });
    });

    // Validar las respuestas
    const btn = gradeButton(() => {
      let correct = 0;
      const details = [];
      items.forEach((it, i) => {
        const targetBox = wrap.querySelector(`.ro-target[data-i="${i}"]`);
        const got = [...targetBox.querySelectorAll('[data-word]')].map(c => c.textContent);

        const ok = got.length === it.original.length && got.join(' ') === it.original.join(' ');

        if (ok) correct++;
        if (!ctx.examMode) {
          targetBox.style.background = ok ? 'rgba(56,178,106,0.10)' : 'rgba(230,57,70,0.08)';
          targetBox.style.borderColor = ok ? 'var(--coeduca-success)' : 'var(--coeduca-error)';
        }
        details.push(it.original.join(' ') + ': ' + (ok ? 'OK' : (got.join(' ') || 'vacio')));
      });
      ctx.recordAnswer(correct, items.length, details, items.map((it, i) => [...wrap.querySelector(`.ro-target[data-i="${i}"]`).querySelectorAll('[data-word]')].map(c => c.textContent)));
      if (!ctx.examMode) {
        if (correct === items.length) ctx.cheer(); else ctx.comfort();
      }
    }, ctx);
    wrap.appendChild(btn);

    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // 6. REORDER_LETTERS (formar palabra)
  // =====================================================================
  reg('reorder_letters', function (ctx) {
    // data: [{ word: 'SCHOOL', hint: 'Lugar de estudio' }]
    const items = (ctx.data || []).map((it, idx) => ({
      idx,
      word: it.word.toUpperCase(),
      hint: it.hint || '',
      shuffled: C.shuffle(it.word.toUpperCase().split('')).join('')
    }));

    const wrap = document.createElement('div');
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'coeduca-panel';
      row.style.cssText = 'margin:12px 0;';
      
      // Envolvemos las letras y el input en un div con flexbox
      row.innerHTML = `
        <div style="font-weight:700;margin-bottom:10px;color:var(--coeduca-text);">${i + 1}. ${C.escapeHTML(it.hint || 'Forma la palabra')}</div>
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:12px;">
          <div style="font-family:'JetBrains Mono', 'Courier New', monospace;font-size:22px;letter-spacing:6px;font-weight:800;
               background:linear-gradient(135deg, rgba(124,92,255,0.10) 0%, rgba(255,92,138,0.10) 100%);
               border:1.5px solid rgba(124,92,255,0.25);border-radius:10px;padding:8px 14px;
               color:var(--coeduca-primary);">
            ${it.shuffled}
          </div>
          <input type="text" class="coeduca-input rl-input" data-i="${i}" placeholder="Escribe la palabra"
                 autocomplete="off" autocapitalize="characters" style="flex:1; min-width:180px;">
        </div>
      `;
      wrap.appendChild(row);
    });
    wrap.querySelectorAll('.rl-input').forEach(inp => {
      inp.addEventListener('blur', () => {
        if (!inp.value.trim() || ctx.examMode) return;
        const it = items[+inp.dataset.i];
        if (C.normalize(inp.value) === C.normalize(it.word)) ctx.cheer();
        else ctx.comfort();
      });
    });
    wrap.appendChild(gradeButton(() => {
      let correct = 0;
      const details = [];
      items.forEach(it => {
        const inp = wrap.querySelector(`.rl-input[data-i="${it.idx}"]`);
        const ok = C.normalize(inp.value) === C.normalize(it.word);
        if (ok) correct++;
        if (!ctx.examMode) {
          inp.classList.toggle('correct', ok);
          inp.classList.toggle('wrong', !ok);
        }
        details.push(it.word + ': ' + (ok ? 'OK' : inp.value || 'vacio'));
      });
      ctx.recordAnswer(correct, items.length, details, items.map(it => wrap.querySelector(`.rl-input[data-i="${it.idx}"]`).value));
      if (!ctx.examMode) {
        if (correct === items.length) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));
    ctx.container.appendChild(wrap);
  });

 // =====================================================================
  // 7. EMOJIPHRASE (escribir frase que describa emojis)
  // =====================================================================
  reg('emojiphrase', function (ctx) {
    // data: [{ emojis: '🔍📰', accept: ['look', 'newspaper'], example: 'I look for news' }]
    const items = ctx.data || [];
    const wrap = document.createElement('div');
    
    // Contenedor Grid: 1 columna si solo hay un ítem, si hay más usa columnas adaptables
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid; 
      grid-template-columns: ${items.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))'}; 
      gap: 24px; 
      margin-top: 10px;
    `;

    // Gradientes suaves alternados para las cards (glass)
    const cardGrads = [
      'linear-gradient(135deg, rgba(91,141,239,0.16) 0%, rgba(79,209,197,0.18) 100%)',
      'linear-gradient(135deg, rgba(246,185,59,0.18) 0%, rgba(255,154,139,0.18) 100%)',
      'linear-gradient(135deg, rgba(255,92,138,0.16) 0%, rgba(124,92,255,0.16) 100%)',
      'linear-gradient(135deg, rgba(56,178,106,0.16) 0%, rgba(79,209,197,0.18) 100%)'
    ];

    items.forEach((it, i) => {
      const bgGrad = cardGrads[i % cardGrads.length];
      const card = document.createElement('div');
      
      card.style.cssText = `
        position: relative;
        background: ${bgGrad};
        border: 1px solid var(--coeduca-glass-brd);
        border-radius: var(--coeduca-radius);
        padding: 26px 18px 18px;
        box-shadow: var(--coeduca-shadow-sm);
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      `;

      card.innerHTML = `
        <div style="position: absolute; top: -12px; left: -12px; background: linear-gradient(135deg, var(--coeduca-primary) 0%, var(--coeduca-accent) 100%); color: #fff; border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; width: 34px; height: 34px; display: grid; place-items: center; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(124,92,255,0.4); z-index: 2;">
          ${i + 1}
        </div>
        <div style="font-size: 56px; line-height: 1.2; margin-bottom: 14px;">
          ${C.escapeHTML(it.emojis)}
        </div>
        <div style="font-weight: 700; font-size: 12px; margin-bottom: 10px; color: var(--coeduca-text-soft); text-transform: uppercase; letter-spacing: 1px;">
          Escribe tu respuesta
        </div>
        <input type="text" class="coeduca-input ep-input" data-i="${i}"
               style="width: 100%; text-align: center; font-size: 16px;" autocomplete="off" placeholder="Responde en inglés">
        <div class="ep-fb" data-i="${i}" style="margin-top: 8px; font-size: 13px; font-weight: 700; min-height: 20px;"></div>
      `;
      grid.appendChild(card);
    });

    wrap.appendChild(grid);

    // Envolver el botón en un div para centrarlo bien
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'text-align: center; margin-top: 24px;';
    
    btnWrap.appendChild(gradeButton(() => {
      let correct = 0;
      const details = [];
      items.forEach((it, i) => {
        const inp = wrap.querySelector(`.ep-input[data-i="${i}"]`);
        const fb = wrap.querySelector(`.ep-fb[data-i="${i}"]`);
        const text = C.normalize(inp.value);
        
        // Criterio de validación
        const accept = (it.accept || []).map(C.normalize);
        const hasAll = accept.length > 0 && accept.every(a => text.includes(a));
        const matchExample = it.example && C.normalize(it.example) === text;
        const strict = hasAll || matchExample;
        
        if (strict) correct++;
        
        if (!ctx.examMode) {
          inp.classList.toggle('correct', strict);
          inp.classList.toggle('wrong', !strict);
          
          fb.textContent = strict ? '¡EXCELENTE!' : (it.example ? 'Ejemplo: ' + it.example : 'Inténtalo de nuevo');
          fb.style.color = strict ? '#4CAF50' : '#E63946';
        }
        
        details.push(it.emojis + ': ' + (inp.value || 'vacio') + ' (' + (strict ? 'OK' : 'X') + ')');
      });
      
      ctx.recordAnswer(correct, items.length, details, items.map((it, i) => wrap.querySelector(`.ep-input[data-i="${i}"]`).value));
      if (!ctx.examMode) {
        if (correct === items.length) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));

    wrap.appendChild(btnWrap);
    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // 8. MULTIPLECHOICE (selección múltiple, radio buttons estilizados)
  // =====================================================================
  reg('multiplechoice', function (ctx) {
    // data: [{ q: '___ a teacher', options: ['I am', 'I is'], answer: 0 }]
    const items = ctx.data || [];
    const wrap = document.createElement('div');
    
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'coeduca-panel';
      row.style.cssText = 'margin:14px 0;';
      
      // Creamos las opciones con una clase específica para poder manipularlas luego
      let optsHTML = it.options.map((opt, j) => `
        <label class="mc-lbl-${ctx.exerciseId}-${i}" style="display:flex; align-items:center; background:rgba(255,255,255,0.7); 
               border:1.5px solid rgba(124,92,255,0.20); border-radius:12px; padding:11px 14px; margin:8px 0; 
               font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(56,38,130,0.06); 
               color:var(--coeduca-text);
               backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
               transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;">
          <input type="radio" name="mc-${ctx.exerciseId}-${i}" value="${j}" 
                 style="margin-right:12px; cursor:pointer; transform: scale(1.2); accent-color: var(--coeduca-primary);">
          <span style="flex:1;">${C.escapeHTML(opt)}</span>
        </label>
      `).join('');
      
      row.innerHTML = `<div style="font-weight:700; margin-bottom:12px; font-size:16px; color:var(--coeduca-text);">${i + 1}. ${C.escapeHTML(it.q)}</div>${optsHTML}`;
      wrap.appendChild(row);

      // --- MEJORA 1: Interactividad al seleccionar ---
      const inputs = row.querySelectorAll(`input[name="mc-${ctx.exerciseId}-${i}"]`);
      const labels = row.querySelectorAll(`.mc-lbl-${ctx.exerciseId}-${i}`);
      
      inputs.forEach(inp => {
        inp.addEventListener('change', () => {
          // Resetear todas las etiquetas de esta pregunta
          labels.forEach(l => {
            l.style.background = 'rgba(255,255,255,0.7)';
            l.style.transform = 'translate(0, 0)';
            l.style.boxShadow = '0 2px 8px rgba(56,38,130,0.06)';
            l.style.borderColor = 'rgba(124,92,255,0.20)';
          });
          // Iluminar la seleccionada (glass)
          if (inp.checked) {
            const activeLabel = inp.closest('label');
            activeLabel.style.background = 'linear-gradient(135deg, rgba(124,92,255,0.14) 0%, rgba(255,92,138,0.12) 100%)';
            activeLabel.style.transform = 'translateY(-1px)';
            activeLabel.style.boxShadow = '0 6px 16px rgba(124,92,255,0.22)';
            activeLabel.style.borderColor = 'var(--coeduca-primary)';
            
            if (!ctx.examMode) {
              if (+inp.value === it.answer) ctx.cheer(); 
              else ctx.comfort();
            }
          }
        });
      });
    });

    wrap.appendChild(gradeButton(() => {
      let correct = 0;
      const details = [];
      
      items.forEach((it, i) => {
        const sel = wrap.querySelector(`input[name="mc-${ctx.exerciseId}-${i}"]:checked`);
        const ok = sel && +sel.value === it.answer;
        if (ok) correct++;
        
        if (!ctx.examMode) {
          // --- MODO NORMAL: Evaluar, colorear y bloquear ---
          wrap.querySelectorAll(`input[name="mc-${ctx.exerciseId}-${i}"]`).forEach(r => {
            r.disabled = true;
            
            const lbl = r.closest('label');
            lbl.style.cursor = 'default';
            lbl.style.transform = 'translate(0, 0)';
            lbl.style.boxShadow = '0 2px 8px rgba(56,38,130,0.06)';
            
            if (+r.value === it.answer) {
              lbl.style.background = 'rgba(56,178,106,0.15)'; 
              lbl.style.borderColor = 'var(--coeduca-success)';
            } else if (r.checked) {
              lbl.style.background = 'rgba(230,57,70,0.10)';
              lbl.style.borderColor = 'var(--coeduca-error)';
            } else {
              lbl.style.background = 'rgba(255,255,255,0.4)';
              lbl.style.opacity = '0.55';
            }
          });
        }
        
        details.push(it.q + ': ' + (ok ? 'OK' : 'X (correcta: ' + it.options[it.answer] + ')'));
      });
      
      ctx.recordAnswer(correct, items.length, details, items.map((it, i) => { const selected = wrap.querySelector(`input[name="mc-${ctx.exerciseId}-${i}"]:checked`); return selected ? Number(selected.value) : null; }));
      if (!ctx.examMode) {
        if (correct === items.length) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));
    
    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // 9. SPOTERROR (clic en la palabra incorrecta)
  // =====================================================================
  reg('spoterror', function (ctx) {
    // data: [{ words: ['She', 'are', 'happy'], errorIndex: 1, fix: 'is' }]
    const items = ctx.data || [];
    const selected = {}; // { itemIdx: wordIdx }
    let graded = false;

    const wrap = document.createElement('div');
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'coeduca-panel';
      row.style.cssText = 'margin:14px 0;';
      
      const wordSpans = it.words.map((w, j) => `
        <span class="se-word se-word-${ctx.exerciseId}-${i}" data-i="${i}" data-j="${j}"
              style="display:inline-block; background:rgba(255,255,255,0.9); border:1.5px solid rgba(124,92,255,0.20);
                     border-radius:10px; padding:6px 14px; margin:4px 3px; font-weight:700; font-size:17px; cursor:pointer;
                     box-shadow:0 3px 10px rgba(56,38,130,0.08); transition:transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
                     color:var(--coeduca-text); position:relative;">
          ${C.escapeHTML(w)}
        </span>
      `).join('');
      
      // Envolvemos la oración en su propia cajita centrada para separarla del texto
      row.innerHTML = `
        <div style="font-weight:700; font-size:16px; margin-bottom:4px; color:var(--coeduca-text);">
          ${i + 1}. Toca la palabra incorrecta:
        </div>
        <div style="line-height:2.8; margin-top:16px; text-align:center; background:rgba(255,255,255,0.45); 
                    padding:14px 12px; border-radius:12px; border:1px dashed rgba(124,92,255,0.20);">
          ${wordSpans}
        </div>
        <div class="se-fix-feedback" data-fix-i="${i}" role="status"
             style="display:none; margin-top:12px; padding:10px 14px; align-items:center; justify-content:center;
                    gap:8px; flex-wrap:wrap; background:rgba(56,178,106,0.14);
                    border:1.5px solid var(--coeduca-success); border-radius:12px;
                    color:var(--coeduca-text); font-size:16px; font-weight:700;"></div>`;
      wrap.appendChild(row);
    });

    wrap.addEventListener('click', e => {
      if (graded) return;

      const w = e.target.closest('.se-word');
      if (!w) return;
      const i = +w.dataset.i;
      
      wrap.querySelectorAll(`.se-word-${ctx.exerciseId}-${i}`).forEach(s => {
        s.style.background = 'rgba(255,255,255,0.9)';
        s.style.transform = 'translate(0, 0)';
        s.style.boxShadow = '0 3px 10px rgba(56,38,130,0.08)';
        s.style.borderColor = 'rgba(124,92,255,0.20)';
      });
      
      w.style.background = 'linear-gradient(135deg, rgba(124,92,255,0.18) 0%, rgba(255,92,138,0.16) 100%)';
      w.style.transform = 'translateY(-2px)';
      w.style.boxShadow = '0 6px 16px rgba(124,92,255,0.28)';
      w.style.borderColor = 'var(--coeduca-primary)';
      selected[i] = +w.dataset.j;
      
      if (!ctx.examMode) {
        const it = items[i];
        if (+w.dataset.j === it.errorIndex) ctx.cheer(); 
        else ctx.comfort();
      }
    });

    wrap.appendChild(gradeButton(() => {
      if (graded) return;
      graded = !ctx.examMode;
      
      let correct = 0;
      const details = [];
      
      items.forEach((it, i) => {
        const ok = selected[i] === it.errorIndex;
        if (ok) correct++;
        
        const allWords = wrap.querySelectorAll(`.se-word-${ctx.exerciseId}-${i}`);
        const fixFeedback = wrap.querySelector(`.se-fix-feedback[data-fix-i="${i}"]`);

        if (!ctx.examMode && fixFeedback && it.fix) {
          const wrongWord = it.words[it.errorIndex] || '';
          fixFeedback.innerHTML = `
            <span>Corrección:</span>
            <s>${C.escapeHTML(wrongWord)}</s>
            <span aria-hidden="true">→</span>
            <strong>${C.escapeHTML(it.fix)}</strong>`;
          fixFeedback.style.display = 'flex';
        }
        
        if (!ctx.examMode) {
          allWords.forEach(w => {
            w.style.cursor = 'default';
            w.style.transform = 'translate(0,0)';
          
            const j = +w.dataset.j;
          
            if (j === it.errorIndex) {
              // Palabra correcta a corregir (verde)
              w.style.background = 'rgba(56,178,106,0.18)';
              w.style.borderColor = 'var(--coeduca-success)';
              w.style.color = 'var(--coeduca-text)';
              w.style.boxShadow = '0 4px 12px rgba(56,178,106,0.25)';
            
              if (it.fix && !fixFeedback) {
                const fixBadge = document.createElement('div');
                // Bocadillo moderno con la corrección
                fixBadge.innerHTML = `
                  <div style="background:linear-gradient(135deg, var(--coeduca-success) 0%, var(--coeduca-cyan) 100%); color:#fff; font-size:13px; padding:6px 14px; border-radius:50px; 
                              font-weight:700; letter-spacing:0.5px; box-shadow:0 4px 12px rgba(56,178,106,0.35);">
                    ${C.escapeHTML(it.fix)}
                  </div>
                  <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; 
                              border-top:8px solid var(--coeduca-success); margin: 0 auto;"></div>
                `;
                fixBadge.style.cssText = `position:absolute; bottom:110%; left:50%; transform:translateX(-50%); 
                                          display:flex; flex-direction:column; align-items:center; z-index:10; 
                                          margin-bottom:4px; animation: coeducaPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);`;
                w.appendChild(fixBadge);
              }
            } else if (j === selected[i]) {
              // Error del estudiante (rojo)
              w.style.background = 'rgba(230,57,70,0.14)';
              w.style.borderColor = 'var(--coeduca-error)';
              w.style.boxShadow = '0 4px 12px rgba(230,57,70,0.20)';
            } else {
              // Palabras neutras (gris sin sombra)
              w.style.background = 'rgba(255,255,255,0.4)';
              w.style.borderColor = 'rgba(0,0,0,0.08)';
              w.style.color = 'var(--coeduca-text-muted)';
              w.style.boxShadow = 'none';
            }
          });
        }

        details.push(it.words.join(' ') + ' -> error: ' + it.words[it.errorIndex] +
          ' (corrige: ' + (it.fix || '') + ')' + ' [' + (ok ? 'OK' : 'X') + ']');
      });
      
      ctx.recordAnswer(correct, items.length, details, items.map((it, i) => selected[i] ?? null));
      if (!ctx.examMode) {
        if (correct === items.length) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));
    
    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // 10. CATEGORIZE (clasificar arrastrando a columnas)
  // =====================================================================
  reg('categorize', function (ctx) {
    // data: { categories: ['Verbs', 'Nouns'], items: [{text:'run', cat:0}, ...] }
    const cats = ctx.data.categories || [];
    const items = C.shuffle((ctx.data.items || []).slice());

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="cat-bank-${ctx.exerciseId}" class="coeduca-panel-soft" style="display:flex;flex-wrap:wrap;gap:6px;
           margin-bottom:14px;min-height:50px;"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;">
        ${cats.map((c, i) => `
          <div class="cat-col coeduca-panel" data-cat="${i}" style="padding:12px;min-height:130px;display:flex;flex-direction:column;">
            <h4 style="margin:0 0 10px;text-align:center;background:linear-gradient(135deg, var(--coeduca-primary) 0%, var(--coeduca-accent) 100%);color:#fff;border:1px solid rgba(255,255,255,0.3);
                border-radius:50px;padding:6px 10px;text-transform:uppercase;font-size:12px;letter-spacing:1px;font-weight:700;
                box-shadow:0 4px 10px rgba(124,92,255,0.25);">
              ${C.escapeHTML(c)}
            </h4>
            <div class="cat-drop" data-cat="${i}" style="min-height:80px;flex:1;"></div>
          </div>
        `).join('')}
      </div>
    `;
    ctx.container.appendChild(wrap);

    const bank = wrap.querySelector('#cat-bank-' + ctx.exerciseId);
    items.forEach((it, idx) => {
      const chip = document.createElement('div');
      chip.textContent = it.text;
      chip.dataset.cat = it.cat;
      chip.dataset.idx = idx;
      chip.className = 'coeduca-chip coeduca-chip-accent';
      chip.style.cssText += 'cursor:grab; user-select:none;';
      bank.appendChild(chip);
      C.makeDraggable(chip, {
        onDrop: ({ under }) => {
          const column = under && under.closest && under.closest('.cat-col');
          const drop = column && column.querySelector('.cat-drop');
          if (drop) {
            drop.appendChild(chip);
            if (!ctx.examMode) {
              if (+drop.dataset.cat === it.cat) ctx.cheer(); 
              else ctx.comfort();
            }
          } else {
            bank.appendChild(chip);
          }
          check();
        }
      });
    });

    function check() {
      let correct = 0;
      const details = [];
      items.forEach((it, idx) => {
        const chip = wrap.querySelector(`[data-idx="${idx}"]`);
        const parent = chip.closest('.cat-drop');
        if (parent && +parent.dataset.cat === it.cat) {
          correct++;
          if (!ctx.examMode) chip.style.background = '#4CAF50';
          details.push(it.text + ' -> ' + cats[it.cat] + ': OK');
        } else {
          if (!ctx.examMode) chip.style.background = '#FF6B9D';
          details.push(it.text + ' -> ' + cats[it.cat] + ': ' +
            (parent ? 'puesto en ' + cats[+parent.dataset.cat] : 'sin colocar'));
        }
      });
      ctx.recordAnswer(correct, items.length, details, items.map((it, idx) => { const chip=wrap.querySelector(`[data-idx="${idx}"]`); const parent=chip.closest('.cat-drop'); return {index:ctx.data.items.indexOf(it),text:it.text,cat:parent?Number(parent.dataset.cat):null}; }));
    }
  });

  // =====================================================================
  // 11. DROPDOWN (select dentro de oración)
  // =====================================================================
  reg('dropdown', function (ctx) {
    // data: [{ before: 'I', options: ['am','is','are'], answer: 0, after: 'happy' }]
    const items = ctx.data || [];
    const wrap = document.createElement('div');
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'coeduca-panel';
      row.style.cssText = 'margin:10px 0;font-size:16px;font-weight:500;color:var(--coeduca-text);';
      const opts = it.options.map((o, j) =>
        `<option value="${j}">${C.escapeHTML(o)}</option>`).join('');
      row.innerHTML = `${i + 1}. ${C.escapeHTML(it.before || '')}
        <select class="coeduca-input dd-sel" data-i="${i}" style="font-size:15px;padding:4px 8px;">
          <option value="">-- elegir --</option>${opts}
        </select>
        ${C.escapeHTML(it.after || '')}`;
      wrap.appendChild(row);
    });
    wrap.querySelectorAll('.dd-sel').forEach(sel => {
      sel.addEventListener('change', () => {
        if (sel.value === '' || ctx.examMode) return;
        const i = +sel.dataset.i;
        const it = items[i];
        if (+sel.value === it.answer) ctx.cheer(); 
        else ctx.comfort();
      });
    });
    wrap.appendChild(gradeButton(() => {
      let correct = 0;
      const details = [];
      items.forEach((it, i) => {
        const sel = wrap.querySelector(`.dd-sel[data-i="${i}"]`);
        const ok = sel.value !== '' && +sel.value === it.answer;
        if (ok) correct++;
        if (!ctx.examMode) {
          sel.classList.toggle('correct', ok);
          sel.classList.toggle('wrong', sel.value !== '' && !ok);
        }
        details.push((it.before || '') + ' [' + it.options[it.answer] + '] ' +
          (it.after || '') + ': ' + (ok ? 'OK' : 'X'));
      });
      ctx.recordAnswer(correct, items.length, details, items.map((it, i) => { const v=wrap.querySelector(`.dd-sel[data-i="${i}"]`).value; return v === '' ? null : Number(v); }));
      if (!ctx.examMode) {
        if (correct === items.length) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));
    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // 12. MATCHIMAGE (arrastrar texto a imagen/emoji)
  // =====================================================================
  reg('matchimage', function (ctx) {
    // data: [{ word: 'Cat', emoji: '🐈', image: 'files/cat.png' }]
    const pairs = (ctx.data || []).map((p, i) => ({ ...p, idx: i }));
    const shuffled = C.shuffle(pairs.slice());

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="mi-bank-${ctx.exerciseId}" class="coeduca-panel-soft" style="display:flex;flex-wrap:wrap;gap:8px;
           margin-bottom:14px;"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;">
        ${pairs.map(p => `
          <div class="mi-target coeduca-panel" data-idx="${p.idx}"
               style="padding:10px;text-align:center;min-height:110px;display:flex;
                      flex-direction:column;align-items:center;justify-content:center;">
            ${p.image
              ? `<img src="${C.escapeHTML(p.image)}" style="max-width:80px;max-height:80px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.08);">`
              : `<div style="font-size:46px;">${C.escapeHTML(p.emoji || '?')}</div>`}
            <div class="mi-slot" style="margin-top:8px;min-height:30px;width:100%;
                 border:1.5px dashed rgba(124,92,255,0.35);border-radius:8px;padding:3px;background:rgba(255,255,255,0.5);"></div>
          </div>
        `).join('')}
      </div>
    `;
    ctx.container.appendChild(wrap);

    const bank = wrap.querySelector('#mi-bank-' + ctx.exerciseId);
    shuffled.forEach(p => {
      const chip = document.createElement('div');
      chip.textContent = p.word;
      chip.dataset.idx = p.idx;
      chip.className = 'coeduca-chip coeduca-chip-info';
      chip.style.cssText += 'cursor:grab; user-select:none;';
      bank.appendChild(chip);
      C.makeDraggable(chip, {
        // --- AGREGA ESTO ---
        onMove: ({ under }) => {
          document.querySelectorAll('.mi-slot').forEach(s => s.classList.remove('coeduca-drop-hover'));
          const slot = under && under.closest && under.closest('.mi-slot');
          if (slot) slot.classList.add('coeduca-drop-hover');
        },
        // -------------------
        onDrop: ({ under }) => {
          document.querySelectorAll('.mi-slot').forEach(s => s.classList.remove('coeduca-drop-hover'));
          
          const slot = under && under.closest && under.closest('.mi-slot');
          if (slot) {
            const existing = slot.querySelector('[data-idx]');
            if (existing) bank.appendChild(existing);
            slot.appendChild(chip);
            
            // --- NUEVO: Reacción de Rigo ---
            const target = slot.closest('.mi-target');
            if (!ctx.examMode) {
              if (target && +chip.dataset.idx === +target.dataset.idx) {
                ctx.cheer();
              } else {
                ctx.comfort();
              }
            }
            // -------------------------------
          } else {
            bank.appendChild(chip);
          }
          check();
        }
      });
    });

    function check() {
      let correct = 0;
      const details = [];
      pairs.forEach(p => {
        const target = wrap.querySelector(`.mi-target[data-idx="${p.idx}"]`);
        const slot = target.querySelector('.mi-slot');
        const chip = slot.querySelector('[data-idx]');
        const ok = chip && +chip.dataset.idx === p.idx;
        if (ok) {
          correct++;
          if (!ctx.examMode) target.style.background = '#E8F5E9';
        } else {
          if (!ctx.examMode) target.style.background = chip ? '#FFEBEE' : '#fff';
        }
        details.push(p.word + ': ' + (ok ? 'OK' : 'X'));
      });
      ctx.recordAnswer(correct, pairs.length, details, pairs.map(p => {const chip=wrap.querySelector(`.mi-target[data-idx="${p.idx}"] .mi-slot [data-idx]`);return chip?Number(chip.dataset.idx):null;}));
    }
  });

  // =====================================================================
  // 13. FILLBLANK (escribir respuesta con teclado)
  // =====================================================================
  reg('fillblank', function (ctx) {
    // data: [{ text: 'I ___ to school', answer: 'go' }] o multiple ___ con answers array
    const items = ctx.data || [];
    const wrap = document.createElement('div');
    items.forEach((it, i) => {
      const answers = Array.isArray(it.answer) ? it.answer : [it.answer];
      const parts = it.text.split('___');
      let html = (i + 1) + '. ';
      parts.forEach((p, j) => {
        html += C.escapeHTML(p);
        if (j < parts.length - 1) {
          const ans = answers[j] || '';
          html += `<input type="text" class="coeduca-input fb-input" data-i="${i}" data-j="${j}"
                          data-answer="${C.escapeHTML(ans)}"
                          style="width:${Math.max(70, ans.length * 14)}px;margin:0 4px;"
                          autocomplete="off">`;
        }
      });
      const row = document.createElement('div');
      row.style.cssText = 'margin:12px 0;font-size:16px;font-weight:bold;line-height:2;';
      row.innerHTML = html;
      wrap.appendChild(row);
    });
	wrap.querySelectorAll('.fb-input').forEach(inp => {
      inp.addEventListener('blur', () => {
        if (!inp.value.trim() || ctx.examMode) return;
        const ans = inp.dataset.answer;
        if (C.normalize(inp.value) === C.normalize(ans)) ctx.cheer();
        else ctx.comfort();
      });
    });
    wrap.appendChild(gradeButton(() => {
      let correct = 0, total = 0;
      const details = [];
      items.forEach((it, i) => {
        const answers = Array.isArray(it.answer) ? it.answer : [it.answer];
        answers.forEach((ans, j) => {
          total++;
          const inp = wrap.querySelector(`.fb-input[data-i="${i}"][data-j="${j}"]`);
          const ok = C.normalize(inp.value) === C.normalize(ans);
          if (ok) correct++;
          if (!ctx.examMode) {
            inp.classList.toggle('correct', ok);
            inp.classList.toggle('wrong', !ok);
          }
          details.push(ans + ': ' + (ok ? 'OK' : (inp.value || 'vacio')));
        });
      });
      ctx.recordAnswer(correct, total, details, items.flatMap((it, i) => (Array.isArray(it.answer)?it.answer:[it.answer]).map((ans,j)=>wrap.querySelector(`.fb-input[data-i="${i}"][data-j="${j}"]`).value)));
      if (!ctx.examMode) {
        if (correct === total) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));
    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // 14. TRUEFALSE (verdadero / falso)
  // =====================================================================
  reg('truefalse', function (ctx) {
    // data: [{ statement: '...', answer: true }]
    const items = ctx.data || [];
    const selections = {};
    const wrap = document.createElement('div');
    items.forEach((it, i) => {
      const row = document.createElement('div');
      row.className = 'coeduca-panel';
      row.style.cssText = 'margin:10px 0;';
      row.innerHTML = `
        <div style="font-weight:600;margin-bottom:10px;color:var(--coeduca-text);">${i + 1}. ${C.escapeHTML(it.statement)}</div>
        <div style="display:flex;gap:10px;">
          <button class="coeduca-btn coeduca-btn-success tf-btn" data-i="${i}" data-v="true"
                  style="flex:1;">TRUE</button>
          <button class="coeduca-btn coeduca-btn-accent tf-btn" data-i="${i}" data-v="false"
                  style="flex:1;">FALSE</button>
        </div>
      `;
      wrap.appendChild(row);
    });
    wrap.addEventListener('click', e => {
      const b = e.target.closest('.tf-btn');
      if (!b) return;
      const i = +b.dataset.i;
      selections[i] = b.dataset.v === 'true';
      wrap.querySelectorAll(`.tf-btn[data-i="${i}"]`).forEach(btn => {
        btn.style.outline = btn === b ? '3px solid var(--coeduca-primary)' : 'none';
        btn.style.outlineOffset = btn === b ? '2px' : '0';
      });
      
      if (!ctx.examMode) {
        const it = items[i];
        if (selections[i] === it.answer) ctx.cheer(); 
        else ctx.comfort();
      }
    });
    wrap.appendChild(gradeButton(() => {
      let correct = 0;
      const details = [];
      items.forEach((it, i) => {
        const ok = selections[i] === it.answer;
        if (ok) correct++;
        details.push(it.statement.substring(0, 40) + ': ' +
          (ok ? 'OK' : 'X (correcta: ' + (it.answer ? 'TRUE' : 'FALSE') + ')'));
      });
      ctx.recordAnswer(correct, items.length, details, items.map((it,i)=>selections[i] ?? null));
      if (!ctx.examMode) {
        if (correct === items.length) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));
    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // WORDSELECT (seleccionar palabras clave dentro de un texto)
  // =====================================================================
  reg('wordselect', function (ctx) {
    const items = ctx.data || [];
    const itemState = [];

    const wrap = document.createElement('div');

    const counterEl = document.createElement('div');
    counterEl.className = 'wsel-counter-global';
    counterEl.style.cssText = 'margin:0 0 10px;font-size:13px;color:#555;font-weight:bold;text-align:right;';

    items.forEach((it, i) => {
      const tokens = [];
      const re = /\[([^\]]+)\]|([^\[\]]+)/g;
      let m;
      while ((m = re.exec(String(it.text || ''))) !== null) {
        const isTarget = m[1] != null;
        const chunk = isTarget ? m[1] : m[2];
        const pieces = chunk.match(/[\p{L}\p{N}'’\-]+|\s+|[^\p{L}\p{N}\s]+/gu) || [chunk];
        pieces.forEach(piece => {
          const isWord = /[\p{L}\p{N}]/u.test(piece);
          tokens.push({ text: piece, isTarget: isWord ? isTarget : false, picked: false, sep: !isWord });
        });
      }
      const targetCount = tokens.filter(t => t.isTarget).length;
      itemState.push({ tokens, targetCount });

      const block = document.createElement('div');
      block.className = 'wsel-block';
      block.dataset.i = i;
      block.style.cssText = 'margin:14px 0;padding:14px;background:#FFF8E7;border:3px solid #1a1a1a;border-radius:12px;box-shadow:3px 3px 0 #1a1a1a;';
      const hintHtml = it.hint
        ? '<div style="font-weight:900;text-transform:uppercase;font-size:12px;background:#FFD700;border:2px solid #1a1a1a;border-radius:50px;padding:4px 12px;display:inline-block;margin-bottom:10px;letter-spacing:0.5px;">' + C.escapeHTML(it.hint) + '</div>'
        : '';
      const wordsHtml = tokens.map((t, ti) => {
        if (t.sep) return C.escapeHTML(t.text).replace(/\n/g, '<br>');
        return '<span class="wsel-word" data-i="' + i + '" data-ti="' + ti + '" '
          + 'style="cursor:pointer;border-radius:4px;padding:1px 2px;transition:background 0.15s;">'
          + C.escapeHTML(t.text) + '</span>';
      }).join('');
      block.innerHTML = hintHtml + '<div style="line-height:1.7;font-size:16px;word-wrap:break-word;">' + wordsHtml + '</div>';
      wrap.appendChild(block);
    });

    const totalTargets = itemState.reduce((acc, s) => acc + s.targetCount, 0);
    function refreshCounter() {
      const sel = itemState.reduce((acc, s) =>
        acc + s.tokens.filter(t => t.picked && (ctx.examMode || t.isTarget)).length, 0);
      counterEl.textContent = 'Seleccionadas: ' + sel + ' / ' + totalTargets;
    }
    refreshCounter();
    if (totalTargets > 0) wrap.appendChild(counterEl);

    wrap.addEventListener('click', e => {
      const w = e.target.closest('.wsel-word');
      if (!w) return;
      const i = +w.dataset.i;
      const ti = +w.dataset.ti;
      const tok = itemState[i].tokens[ti];
      tok.picked = !tok.picked;
      if (tok.picked) {
        w.style.background = '#FFD700';
        w.style.fontWeight = '900';
        w.style.boxShadow = 'inset 0 -3px 0 #1a1a1a';
        if (!ctx.examMode) { if (tok.isTarget) ctx.cheer(); else ctx.comfort(); }
      } else {
        w.style.background = '';
        w.style.fontWeight = '';
        w.style.boxShadow = '';
      }
      refreshCounter();
    });

    wrap.appendChild(gradeButton(() => {
      let correctTargets = 0;
      let wrongPicks = 0;
      let total = 0;
      const details = [];
      itemState.forEach((s, i) => {
        s.tokens.forEach((t, ti) => {
          if (t.sep) return;
          if (t.isTarget) total++;
          const w = wrap.querySelector('.wsel-word[data-i="' + i + '"][data-ti="' + ti + '"]');
          if (t.isTarget && t.picked) {
            correctTargets++;
            if (w && !ctx.examMode) { w.style.background = '#4CAF50'; w.style.color = '#fff'; w.style.fontWeight = '900'; w.style.boxShadow = ''; }
          } else if (t.isTarget && !t.picked) {
            if (w && !ctx.examMode) { w.style.background = '#FFE0E0'; w.style.boxShadow = 'inset 0 -2px 0 #E63946'; }
          } else if (!t.isTarget && t.picked) {
            wrongPicks++;
            if (w && !ctx.examMode) { w.style.background = '#E63946'; w.style.color = '#fff'; w.style.textDecoration = 'line-through'; w.style.boxShadow = ''; }
          }
        });
        details.push('Texto ' + (i + 1) + ': ' + correctTargets + '/' + total + ' correctas, ' + wrongPicks + ' erróneas');
      });
      const score = Math.max(0, correctTargets - wrongPicks);
      ctx.recordAnswer(score, total || 1, details, itemState.map(s=>s.tokens.flatMap((t,i)=>t.picked?[i]:[])));
      if (!ctx.examMode) {
        if (score === total && wrongPicks === 0) ctx.cheer(); else ctx.comfort();
      }
    }, ctx));
    ctx.container.appendChild(wrap);
  });

  // =====================================================================
  // MEMORY (memorama / encuentra la pareja)
  // =====================================================================
  (function injectMemoryStyles() {
    if (document.getElementById('coeduca-memory-styles')) return;
    const s = document.createElement('style');
    s.id = 'coeduca-memory-styles';
    s.textContent = ''
      + '@keyframes memPop {0%{transform:scale(1)}40%{transform:scale(1.12) rotate(-3deg)}100%{transform:scale(1)}}'
      + '@keyframes memBurst {0%{opacity:1;transform:scale(0.4)}100%{opacity:0;transform:scale(1.6)}}'
      + '@keyframes memConfetti {0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--cx,0),var(--cy,40px)) rotate(var(--cr,180deg))}}'
      + '.mem-card .mem-inner{position:absolute;inset:0;transition:transform 0.5s;transform-style:preserve-3d}'
      + '.mem-card .mem-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:11px;display:grid;place-items:center}'
      + '.mem-card .mem-front{transform:rotateY(180deg)}'
      + '.mem-card.is-flipped .mem-inner{transform:rotateY(180deg)}'
      + '.mem-card.mem-matched{animation:memPop 0.6s ease}';
    document.head.appendChild(s);
  })();

  reg('memory', function (ctx) {
    const pairs = (ctx.data || []).filter(p => p && (p.left || p.right));
    if (!pairs.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:14px;font-style:italic;color:#666;';
      empty.textContent = 'Sin pares definidos.';
      ctx.container.appendChild(empty);
      return;
    }

    let cards = [];
    pairs.forEach((p, i) => {
      cards.push({ pairId: i, text: p.left || '?' });
      cards.push({ pairId: i, text: p.right || '?' });
    });
    cards = C.shuffle(cards);

    const total = cards.length;
    const cols = total <= 6 ? Math.min(3, total)
               : total <= 12 ? 4
               : total <= 20 ? 5 : 6;

    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="mem-info" style="text-align:center;margin-bottom:12px;font-weight:900;font-size:14px;background:#fff;border:3px solid #1a1a1a;border-radius:50px;padding:6px 14px;display:inline-block;left:50%;position:relative;transform:translateX(-50%);box-shadow:2px 2px 0 #1a1a1a;">'
      +   'Movimientos: <span class="mem-moves">0</span> &nbsp;·&nbsp; Pares: <span class="mem-found">0</span> / ' + pairs.length
      + '</div>'
      + '<div id="mem-grid-' + ctx.exerciseId + '" class="mem-grid" '
      +   'style="display:grid;grid-template-columns:repeat(' + cols + ',minmax(0,1fr));gap:10px;max-width:560px;margin:0 auto;"></div>';
    ctx.container.appendChild(wrap);

    const gridEl = wrap.querySelector('#mem-grid-' + ctx.exerciseId);
    const infoMoves = wrap.querySelector('.mem-moves');
    const infoFound = wrap.querySelector('.mem-found');

    let firstCard = null;
    let busy = false;
    let moves = 0;
    const matched = new Set((ctx.previousAnswer || []).filter(i => Number.isInteger(i) && i >= 0 && i < pairs.length));
    let foundPairs = matched.size;
    infoFound.textContent = foundPairs;
    const startTs = Date.now();

    const palette = ['#FF6B9D', '#4FC3F7', '#FFD700', '#9B5DE5', '#FF9F1C', '#43B069', '#E63946', '#29B6F6'];

    cards.forEach((card, idx) => {
      const el = document.createElement('div');
      el.className = 'mem-card';
      el.dataset.idx = idx;
      el.dataset.pair = card.pairId;
      el.style.cssText = 'position:relative;aspect-ratio:1/1;border:3px solid #1a1a1a;border-radius:14px;cursor:pointer;background:transparent;box-shadow:3px 3px 0 #1a1a1a;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;';
      el.innerHTML =
        '<div class="mem-inner">'
        +   '<div class="mem-face mem-back" style="background:repeating-linear-gradient(45deg,#FFD700 0 10px,#FF6B9D 10px 20px);color:#1a1a1a;font-weight:900;font-size:30px;text-shadow:2px 2px 0 #fff;">?</div>'
        +   '<div class="mem-face mem-front" style="background:' + palette[card.pairId % palette.length] + ';color:#fff;font-weight:900;text-shadow:1px 1px 0 #1a1a1a;font-size:clamp(14px,4.2vw,22px);text-align:center;padding:6px;word-break:break-word;line-height:1.15;">' + C.escapeHTML(card.text) + '</div>'
        + '</div>';
      gridEl.appendChild(el);
    });

    function flipFront(el) { el.classList.add('is-flipped'); }
    function flipBack(el) { el.classList.remove('is-flipped'); }

    function popMatch(elA, elB) {
      [elA, elB].forEach(el => {
        el.classList.add('mem-matched');
        el.style.pointerEvents = 'none';
        const burst = document.createElement('div');
        burst.style.cssText = 'position:absolute;inset:-6px;border-radius:18px;background:radial-gradient(circle,rgba(255,215,0,0.65) 0%,transparent 70%);pointer-events:none;animation:memBurst 0.7s ease forwards;z-index:2;';
        el.appendChild(burst);
        const colors = ['#FFD700', '#FF6B9D', '#4FC3F7', '#9B5DE5', '#43B069'];
        for (let k = 0; k < 6; k++) {
          const c = document.createElement('div');
          const dx = (Math.random() * 80 - 40) + 'px';
          const dy = (Math.random() * 60 + 20) + 'px';
          const dr = (Math.random() * 360 - 180) + 'deg';
          c.style.cssText = 'position:absolute;left:50%;top:50%;width:8px;height:8px;background:' + colors[k % colors.length] + ';border:1.5px solid #1a1a1a;border-radius:2px;pointer-events:none;animation:memConfetti 0.8s ease forwards;--cx:' + dx + ';--cy:' + dy + ';--cr:' + dr + ';z-index:3;';
          el.appendChild(c);
        }
        setTimeout(() => {
          burst.remove();
          el.querySelectorAll('div[style*="memConfetti"]').forEach(n => n.remove());
        }, 900);
      });
    }

    gridEl.querySelectorAll('.mem-card').forEach(card => {
      if (matched.has(Number(card.dataset.pair))) {
        flipFront(card);
        card.classList.add('mem-matched');
        card.style.pointerEvents = 'none';
      }
    });
    gridEl.addEventListener('click', e => {
      if (busy) return;
      const card = e.target.closest('.mem-card');
      if (!card || card.classList.contains('mem-matched')) return;
      if (firstCard === card) return;
      if (card.classList.contains('is-flipped')) return;

      flipFront(card);
      if (!firstCard) { firstCard = card; return; }

      moves++;
      infoMoves.textContent = moves;
      const ok = firstCard.dataset.pair === card.dataset.pair;
      if (ok) {
        popMatch(firstCard, card);
        matched.add(Number(card.dataset.pair));
        foundPairs++;
        infoFound.textContent = foundPairs;
        if (!ctx.examMode) ctx.cheer();
        firstCard = null;
      } else {
        if (!ctx.examMode) ctx.comfort();
        busy = true;
        const a = firstCard;
        const b = card;
        firstCard = null;
        setTimeout(() => {
          flipBack(a);
          flipBack(b);
          busy = false;
        }, 900);
      }
      if (ctx.examMode || foundPairs === pairs.length) {
        const seconds = Math.max(1, Math.round((Date.now() - startTs) / 1000));
        ctx.recordAnswer(foundPairs, pairs.length, ['Movimientos: ' + moves, 'Tiempo: ' + seconds + 's'], [...matched]);
      }
    });
  });

  // =====================================================================
  // COMICDIALOGUE (cómic / chat con burbujas a completar)
  // =====================================================================
  reg('comicdialogue', function (ctx) {
    const panels = ctx.data || [];

    const wrap = document.createElement('div');

    const bankEl = document.createElement('div');
    bankEl.className = 'cd-bank';
    bankEl.id = 'cd-bank-' + ctx.exerciseId;
    bankEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:14px;background:#FFF8E7;border:3px dashed #1a1a1a;border-radius:12px;margin-bottom:16px;min-height:50px;box-shadow:2px 2px 0 rgba(0,0,0,0.1);';
    wrap.appendChild(bankEl);

    const allAnswers = [];
    panels.forEach(panel => {
      (panel.bubbles || []).forEach(b => { if (b.blank && b.answer) allAnswers.push(String(b.answer)); });
      (panel.bank || []).forEach(w => { if (w) allAnswers.push(String(w)); });
    });
    const banked = C.shuffle(allAnswers.slice());

    panels.forEach((panel, pIdx) => {
      const panelEl = document.createElement('div');
      panelEl.className = 'cd-panel';
      panelEl.style.cssText = 'background:#fff;border:4px solid #1a1a1a;border-radius:14px;padding:14px 14px 12px;margin-bottom:18px;box-shadow:4px 4px 0 #1a1a1a;position:relative;overflow:hidden;';
      const dots = document.createElement('div');
      dots.style.cssText = 'position:absolute;top:6px;right:10px;width:54px;height:24px;background-image:radial-gradient(circle,#FF6B9D 1.5px,transparent 2px);background-size:8px 8px;opacity:0.55;pointer-events:none;';
      panelEl.appendChild(dots);

      if (panel.title) {
        const t = document.createElement('div');
        t.style.cssText = 'background:#FFD700;border:3px solid #1a1a1a;border-radius:10px;padding:5px 14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-block;margin:-26px 0 12px -4px;transform:rotate(-1.5deg);box-shadow:2px 2px 0 #1a1a1a;position:relative;z-index:1;';
        t.textContent = panel.title;
        panelEl.appendChild(t);
      }

      (panel.bubbles || []).forEach((b, bIdx) => {
        const row = document.createElement('div');
        const isA = b.author !== 'B';
        row.style.cssText = 'display:flex;justify-content:' + (isA ? 'flex-start' : 'flex-end') + ';margin:8px 0;gap:8px;align-items:flex-end;';

        const avatar = document.createElement('div');
        avatar.style.cssText = 'flex-shrink:0;width:38px;height:38px;border:3px solid #1a1a1a;border-radius:50%;background:' + (isA ? '#4FC3F7' : '#FF6B9D') + ';color:#fff;font-weight:900;display:grid;place-items:center;font-size:16px;text-shadow:1px 1px 0 #1a1a1a;box-shadow:2px 2px 0 #1a1a1a;';
        avatar.textContent = b.author === 'B' ? 'B' : 'A';

        const bubble = document.createElement('div');
        bubble.style.cssText = 'position:relative;max-width:75%;padding:10px 14px;border:3px solid #1a1a1a;border-radius:18px;font-weight:bold;font-size:15px;line-height:1.35;background:' + (isA ? '#FFFEF0' : '#E1F5FE') + ';box-shadow:2px 2px 0 #1a1a1a;';

        if (b.blank) {
          const slot = document.createElement('span');
          slot.className = 'cd-slot';
          slot.dataset.answer = b.answer || '';
          slot.dataset.pidx = pIdx;
          slot.dataset.bidx = bIdx;
          slot.style.cssText = 'display:inline-block;min-width:120px;min-height:24px;padding:3px 10px;background:#fff;border:3px dashed #1a1a1a;border-radius:10px;vertical-align:middle;';
          bubble.appendChild(slot);
        } else {
          bubble.appendChild(document.createTextNode(b.text || ''));
        }

        if (isA) { row.appendChild(avatar); row.appendChild(bubble); }
        else     { row.appendChild(bubble); row.appendChild(avatar); }
        panelEl.appendChild(row);
      });
      wrap.appendChild(panelEl);
    });

    banked.forEach(w => {
      const chip = document.createElement('div');
      chip.className = 'cd-chip';
      chip.textContent = w;
      chip.style.cssText = 'background:#FFD700;color:#1a1a1a;border:3px solid #1a1a1a;border-radius:10px;padding:6px 12px;font-weight:900;cursor:grab;box-shadow:2px 2px 0 #1a1a1a;user-select:none;-webkit-user-select:none;';
      attachDrag(chip);
      bankEl.appendChild(chip);
    });

    function attachDrag(el) {
      C.makeDraggable(el, {
        onMove: function (ev) {
          const under = ev.under;
          document.querySelectorAll('.cd-slot').forEach(s => s.classList.remove('coeduca-drop-hover'));
          const slot = under && under.closest && under.closest('.cd-slot');
          if (slot) slot.classList.add('coeduca-drop-hover');
        },
        onDrop: function (ev) {
          const under = ev.under;
          document.querySelectorAll('.cd-slot').forEach(s => s.classList.remove('coeduca-drop-hover'));
          const slot = under && under.closest && under.closest('.cd-slot');
          if (slot) {
            const existing = slot.querySelector('.cd-chip');
            if (existing) bankEl.appendChild(existing);
            slot.appendChild(el);
            if (!ctx.examMode) {
              if (C.normalize(el.textContent) === C.normalize(slot.dataset.answer)) ctx.cheer();
              else ctx.comfort();
            }
            check();
          } else {
            const parent = el.parentElement;
            if (!parent || !parent.classList.contains('cd-slot')) {
              bankEl.appendChild(el);
            }
          }
        }
      });
    }

    function check() {
      const slots = wrap.querySelectorAll('.cd-slot');
      let correct = 0;
      const details = [];
      slots.forEach(slot => {
        const chip = slot.querySelector('.cd-chip');
        const ans = slot.dataset.answer;
        if (chip && C.normalize(chip.textContent) === C.normalize(ans)) {
          correct++;
          slot.style.borderColor = '#4CAF50';
          slot.style.background = '#E8F5E9';
          details.push(ans + ': OK');
        } else {
          slot.style.borderColor = chip ? '#E63946' : '#1a1a1a';
          slot.style.background = chip ? '#FFEBEE' : '#fff';
          details.push(ans + ': ' + (chip ? chip.textContent + ' (X)' : 'vacío'));
        }
      });
      ctx.recordAnswer(correct, slots.length || 1, details, [...slots].map(slot=>slot.querySelector('.cd-chip')?.textContent || ''));
      if (!ctx.examMode && slots.length > 0 && correct === slots.length) ctx.cheer();
    }

    ctx.container.appendChild(wrap);
  });

})(typeof window !== 'undefined' ? window : this);
