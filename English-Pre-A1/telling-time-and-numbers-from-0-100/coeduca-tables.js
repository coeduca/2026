/** Shared mixed-cell tables for English activities, exams and Citizenship. */
(function (global) {
  'use strict';
  const C = global.CIVICA || global.COEDUCA;
  if (!C) return;

  if (!document.getElementById('worksheet-table-styles')) {
    const style = document.createElement('style');
    style.id = 'worksheet-table-styles';
    style.textContent = `
      .worksheet-table-exercise {
        --table-surface: var(--civica-surface, var(--coeduca-surface, #fff));
        --table-text: var(--civica-text, var(--coeduca-text, #1a1a1a));
        --table-border: var(--civica-divider, var(--coeduca-stroke, #ccc));
        --table-accent: var(--civica-accent, var(--coeduca-accent, #60a5fa));
        --table-control: var(--coeduca-theme-control, var(--civica-surface-2, var(--coeduca-item-bg, #eef2ff)));
        --table-shadow: var(--civica-shadow-sm, var(--coeduca-shadow-sm, 3px 3px 0 #000));
        color: var(--table-text);
        max-width:100%; min-width:0;
      }
      .worksheet-table-exercise, .worksheet-table-exercise * { box-sizing:border-box; }
      .worksheet-table-scroll { width:100%; overflow-x:auto; margin:14px 0; padding:0; border:3px solid #000; border-radius:12px; background:var(--table-control); box-shadow:var(--table-shadow); }
      .worksheet-table { width:100%; border-collapse:collapse; background:var(--table-surface); }
      .worksheet-table th, .worksheet-table td { border:1px solid var(--table-border); padding:10px; min-width:110px; vertical-align:middle; overflow-wrap:anywhere; }
      .worksheet-table th { background:var(--table-accent); font-weight:800; white-space:nowrap; }
      .worksheet-table-token img { display:block; width:100%; height:100%; object-fit:cover; pointer-events:none; }
      .worksheet-table input, .worksheet-table textarea, .worksheet-table select { width:100%; min-width:100px; box-sizing:border-box; padding:8px; font:inherit; color:inherit; background:var(--table-surface); border:1px solid var(--table-border); border-radius:6px; }
      .worksheet-table textarea { resize:vertical; min-height:64px; user-select:text; -webkit-user-select:text; }
      .worksheet-table textarea::placeholder, .worksheet-table input::placeholder { font-style:italic; color:var(--table-text); opacity:0.55; }
      .worksheet-table-placeholder { font-style:italic; font-weight:400; opacity:0.55; }
      .worksheet-table-bank { display:flex; flex-wrap:wrap; gap:10px; padding:14px; margin:12px 0; border:2px solid #000; border-radius:12px; background:var(--table-control); box-shadow:var(--table-shadow); }
      .worksheet-table-bank-title { flex-basis:100%; padding-bottom:6px; margin-bottom:2px; border-bottom:2px solid var(--table-accent); font-weight:800; }
      .worksheet-table-token { display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box; max-width:100%; padding:8px 12px; border:2px solid var(--civica-divider-2, var(--coeduca-stroke, #000)); border-radius:10px; background:var(--civica-surface, var(--coeduca-surface, #fff)); color:var(--civica-text, var(--coeduca-text, #1a1a1a)); box-shadow:var(--civica-shadow-sm, var(--coeduca-shadow-sm, 3px 3px 0 #000)); font:inherit; font-weight:700; font-style:normal; cursor:grab; user-select:none; touch-action:none; }
      .worksheet-table-token[data-kind="image"] { width:104px; height:104px; padding:0; overflow:hidden; flex-shrink:0; }
      .worksheet-table-token:focus-visible { outline:3px solid var(--civica-accent, var(--coeduca-accent, #60a5fa)); outline-offset:3px; }
      .worksheet-table-drop { text-align:center; background:var(--table-control); }
      .worksheet-table-drop.has-token > .worksheet-table-token { box-shadow:none; }
      .worksheet-table-drop[data-kind="image"], .worksheet-table-cell-image { position:relative; height:140px; padding:0; }
      .worksheet-table-drop[data-kind="image"] > .worksheet-table-token, .worksheet-table-cell-image > img { position:absolute; inset:0; width:100%; height:100%; padding:0; border:0; border-radius:0; overflow:hidden; }
      .worksheet-table-drop[data-kind="image"] > .worksheet-table-token img, .worksheet-table-cell-image > img { width:100%; height:100%; object-fit:cover; border-radius:0; }
      .worksheet-table-drop.is-hover { outline:3px solid var(--table-accent); outline-offset:-3px; }
      .worksheet-table td.worksheet-table-check { text-align:center; min-width:130px; }
      .worksheet-table-check-options { display:grid; gap:8px; width:100%; }
      .worksheet-table-check-options button { width:100%; font:inherit; min-height:40px; padding:6px 8px; border:1px solid var(--table-border); border-radius:8px; background:var(--table-surface); color:inherit; white-space:nowrap; cursor:pointer; }
      .worksheet-table-check-options button[aria-pressed="true"] { background-color:var(--table-accent); font-weight:700; }
      .worksheet-table-check-options button:focus-visible { outline:3px solid var(--table-accent); outline-offset:2px; }
      .worksheet-table .is-correct { background:#ecfdf5; box-shadow:inset 0 0 0 2px #15803d; }
      .worksheet-table .is-wrong { background:#fef2f2; box-shadow:inset 0 0 0 2px #b91c1c; }
      .worksheet-table-drop[data-kind="image"].is-correct::after, .worksheet-table-drop[data-kind="image"].is-wrong::after { content:''; position:absolute; inset:0; border:3px solid #15803d; pointer-events:none; }
      .worksheet-table-drop[data-kind="image"].is-wrong::after { border-color:#b91c1c; }

      /* Use the same theme attribute and palette as the other activity exercises. */
      html[data-coeduca-ui-theme="PopArt"] .worksheet-table-scroll,
      html[data-coeduca-ui-theme="PopArt"] .worksheet-table-bank {
        background-image:radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 1.5px);
        background-size:12px 12px;
      }
      html[data-coeduca-ui-theme="PopArt"] .worksheet-table th { border-bottom:3px solid #000; }
      html[data-coeduca-ui-theme="PopArt"] .worksheet-table input,
      html[data-coeduca-ui-theme="PopArt"] .worksheet-table textarea,
      html[data-coeduca-ui-theme="PopArt"] .worksheet-table select,
      html[data-coeduca-ui-theme="PopArt"] .worksheet-table-check-options button { border:2px solid #000; box-shadow:2px 2px 0 #000; }

      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table-scroll {
        border-width:2px; border-radius:18px;
        background-color:var(--coeduca-theme-control);
        background-image:repeating-linear-gradient(0deg, transparent 0 23px, color-mix(in srgb, var(--coeduca-primary) 15%, transparent) 23px 24px);
        box-shadow:var(--coeduca-shadow-sm);
      }
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table-bank {
        background:var(--coeduca-theme-cream-deep); border:1px dashed var(--coeduca-primary); border-radius:14px; box-shadow:none;
      }
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table-bank-title,
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table th { font-family:Georgia, Cambria, serif; font-weight:700; }
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table-token {
        background:var(--coeduca-theme-control); border:1px solid rgba(107,94,82,0.5); border-radius:12px; box-shadow:none; font-weight:600;
      }
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table input,
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table textarea,
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table select,
      html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-table-check-options button { background-color:var(--coeduca-theme-control); border-color:rgba(107,94,82,0.5); box-shadow:none; }

      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table-scroll {
        border-width:2px; border-radius:10px; background:var(--coeduca-theme-cream-deep);
        box-shadow:0 2px 5px rgba(25,34,42,0.22) inset, 0 1px 0 rgba(255,255,255,0.7), var(--coeduca-shadow-sm);
      }
      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table-bank {
        background-color:var(--coeduca-theme-cream-deep);
        background-image:linear-gradient(180deg, rgba(0,0,0,0.08), rgba(255,255,255,0.3));
        border:1px solid #68747e; border-radius:10px;
        box-shadow:0 2px 5px rgba(25,34,42,0.2) inset, 0 1px 0 rgba(255,255,255,0.62);
      }
      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table th { background-image:linear-gradient(180deg, rgba(255,255,255,0.35), rgba(0,0,0,0.12)); text-shadow:0 1px 0 rgba(255,255,255,0.55); }
      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table-token {
        background-color:var(--coeduca-theme-control);
        background-image:linear-gradient(180deg, rgba(255,255,255,0.48), rgba(255,255,255,0.08) 48%, rgba(0,0,0,0.08) 52%, rgba(0,0,0,0.13));
        border:1px solid #405463; border-radius:9px;
        box-shadow:0 1px 0 rgba(255,255,255,0.92) inset, 0 2px 4px rgba(25,34,42,0.28); text-shadow:0 1px 0 rgba(255,255,255,0.7);
      }
      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table input,
      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table textarea,
      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table select { background:var(--coeduca-theme-control); border-color:#68747e; box-shadow:0 1px 3px rgba(25,34,42,0.18) inset; }
      html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-table-check-options button { border-color:#405463; box-shadow:0 2px 4px rgba(25,34,42,0.24); background-image:linear-gradient(180deg, rgba(255,255,255,0.48), rgba(0,0,0,0.13)); }
      html[data-coeduca-ui-theme] .worksheet-table-check-options button[aria-pressed="true"] { background-color:var(--table-accent); }

      /* Placed image cards remain flush with the cell in every theme. */
      html[data-coeduca-ui-theme] .worksheet-table-drop[data-kind="image"] > .worksheet-table-token { border:0; border-radius:0; box-shadow:none; }
    `;
    document.head.appendChild(style);
  }

  // Keep the existing cv_table ID so saved projects and publication payloads remain compatible.
  C.registerExercise('cv_table', function (ctx) {
    const data = ctx.data || {};
    const rows = (data.rows || []).map(row => Array.isArray(row) ? row : (row.cells || []));
    const wrap = document.createElement('div');
    wrap.className = 'worksheet-table-exercise';
    const refs = [];
    const tokens = [];
    let restoring = true;
    let reviewQueued = false;
    let lastSnapshot = '';
    let wasPerfect = false;
    let lastDrag = 0;
    const banks = {};
    const dropType = type => type === 'drop_image' ? 'image' : 'text';
    const same = (left, right) => C.normalize(left) === C.normalize(right);

    function image(src, alt) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      img.draggable = false;
      return img;
    }

    function getBank(kind) {
      if (banks[kind]) return banks[kind];
      const bank = document.createElement('div');
      bank.className = 'worksheet-table-bank';
      bank.dataset.kind = kind;
      const title = document.createElement('div');
      title.className = 'worksheet-table-bank-title';
      title.textContent = kind === 'image' ? 'Banco de imágenes' : 'Banco de palabras';
      bank.appendChild(title);
      banks[kind] = bank;
      wrap.appendChild(bank);
      return bank;
    }

    function clearCell(td) {
      td.replaceChildren();
      const placeholder = document.createElement('span');
      placeholder.className = 'worksheet-table-placeholder';
      placeholder.textContent = td.dataset.placeholder;
      td.appendChild(placeholder);
      td.classList.remove('has-token');
    }

    function returnToBank(token) {
      const previous = token.parentElement;
      getBank(token.dataset.kind).appendChild(token);
      if (previous?.classList.contains('worksheet-table-drop')) clearCell(previous);
      maybeReview();
    }

    function targetFor(token, under) {
      const td = under?.closest?.('.worksheet-table-drop');
      return td && wrap.contains(td) && td.dataset.kind === token.dataset.kind ? td : null;
    }

    function place(token, td) {
      if (!td || token.parentElement === td) return;
      const previous = token.parentElement;
      const existing = td.querySelector('.worksheet-table-token');
      if (existing) returnToBank(existing);
      td.replaceChildren(token);
      td.classList.add('has-token');
      if (previous?.classList.contains('worksheet-table-drop')) clearCell(previous);
      maybeReview();
    }

    function makeToken(item) {
      const token = document.createElement('button');
      token.type = 'button';
      token.className = 'worksheet-table-token';
      token.dataset.kind = item.kind;
      token.dataset.value = item.value;
      if (item.kind === 'image') token.appendChild(image(item.value, item.alt));
      else token.textContent = item.value;
      getBank(item.kind).appendChild(token);
      C.makeDraggable(token, {
        onPickup() { lastDrag = Date.now(); },
        onMove({ under }) {
          wrap.querySelectorAll('.is-hover').forEach(td => td.classList.remove('is-hover'));
          targetFor(token, under)?.classList.add('is-hover');
        },
        onDrop({ under }) {
          lastDrag = Date.now();
          wrap.querySelectorAll('.is-hover').forEach(td => td.classList.remove('is-hover'));
          const td = targetFor(token, under);
          if (td && token.parentElement === td) returnToBank(token);
          else if (td) place(token, td);
          else if (under && banks[token.dataset.kind]?.contains(under)) returnToBank(token);
        }
      });
      token.addEventListener('click', () => {
        if (Date.now() - lastDrag > 250 && token.parentElement.classList.contains('worksheet-table-drop')) returnToBank(token);
      });
    }

    const textBank = (Array.isArray(data.bank) ? data.bank : []).filter(value => String(value).trim()).map(String);
    const needed = new Map();
    rows.flat().forEach(cell => {
      if (cell?.type === 'drop' && String(cell.answer || '').trim()) {
        const answer = String(cell.answer);
        const key = C.normalize(answer);
        const count = (needed.get(key) || 0) + 1;
        needed.set(key, count);
        if (textBank.filter(value => C.normalize(value) === key).length < count) textBank.push(answer);
      }
      if (cell?.type === 'drop_image' && cell.src) tokens.push({kind:'image', value:cell.src, alt:cell.alt});
    });
    if (rows.flat().some(cell => cell?.type === 'drop')) textBank.forEach(value => tokens.push({kind:'text', value}));
    C.shuffle(tokens).forEach(makeToken);

    const scroll = document.createElement('div');
    scroll.className = 'worksheet-table-scroll';
    const table = document.createElement('table');
    table.className = 'worksheet-table';
    if (data.columns?.length) {
      const head = table.createTHead().insertRow();
      data.columns.forEach(label => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = label;
        head.appendChild(th);
      });
    }
    const body = table.createTBody();
    rows.forEach((row, r) => {
      const tr = body.insertRow();
      refs[r] = [];
      row.forEach((definition, c) => {
        const cell = definition || {type:'text'};
        const td = document.createElement(cell.type === 'header' ? 'th' : 'td');
        tr.appendChild(td);
        const ref = {td, cell, control:null};
        refs[r][c] = ref;
        if (cell.type === 'image') {
          td.className = 'worksheet-table-cell-image';
          td.appendChild(image(cell.src, cell.alt));
        }
        else if (cell.type === 'input') {
          const input = document.createElement('textarea');
          input.className = 'civica-input-allow-copy';
          input.rows = cell.answer ? 1 : 3;
          input.placeholder = cell.placeholder || 'Escribe aquí';
          input.autocomplete = 'off';
          input.setAttribute('aria-label', data.columns?.[c] || 'Respuesta');
          td.appendChild(input);
          ref.control = input;
        } else if (cell.type === 'select') {
          const select = document.createElement('select');
          select.add(new Option('— Selecciona —', ''));
          (cell.options || []).forEach((label, index) => select.add(new Option(label, String(index))));
          select.setAttribute('aria-label', data.columns?.[c] || 'Respuesta');
          td.appendChild(select);
          ref.control = select;
        } else if (cell.type === 'drop' || cell.type === 'drop_image') {
          td.className = 'worksheet-table-drop';
          td.dataset.kind = dropType(cell.type);
          td.dataset.placeholder = cell.placeholder || (cell.type === 'drop_image' ? 'Arrastra una imagen' : 'Arrastra una palabra');
          clearCell(td);
        } else if (cell.type === 'check') {
          td.className = 'worksheet-table-check';
          const segments = document.createElement('div');
          segments.className = 'worksheet-table-check-options';
          segments.setAttribute('role', 'group');
          segments.setAttribute('aria-label', data.columns?.[c] || 'Verdadero o falso');
          segments.dataset.state = '';
          ['true', 'false'].forEach(value => {
            const option = document.createElement('button');
            option.type = 'button';
            option.dataset.value = value;
            option.textContent = value === 'true' ? 'Verdadero' : 'Falso';
            option.setAttribute('aria-pressed', 'false');
            option.addEventListener('click', () => {
              setCheckState(segments, value);
              maybeReview();
            });
            segments.appendChild(option);
          });
          td.appendChild(segments);
          ref.control = segments;
        } else td.textContent = cell.value || '';
      });
    });
    scroll.appendChild(table);
    wrap.appendChild(scroll);

    function valueOf(ref) {
      const {td, cell, control} = ref;
      if (cell.type === 'input' || cell.type === 'select') return control.value.trim();
      if (cell.type === 'check') return control.dataset.state;
      if (cell.type === 'drop' || cell.type === 'drop_image') return td.querySelector('.worksheet-table-token')?.dataset.value || '';
      return null;
    }

    function setCheckState(segments, value) {
      segments.dataset.state = value;
      segments.querySelectorAll('button').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.value === value)));
    }

    function review(record = true) {
      let score = 0, total = 0;
      const details = [];
      const gradingRows = refs.map((row, r) => row.map((ref, c) => {
        const value = valueOf(ref);
        if (value === null) return null;
        const cell = ref.cell;
        total++;
        let ok = false;
        if (cell.type === 'input') ok = cell.answer ? !!value && same(value, cell.answer) : value.length >= 16;
        if (cell.type === 'select') ok = value !== '' && value === String(cell.answer);
        if (cell.type === 'drop') ok = !!value && same(value, cell.answer || '');
        if (cell.type === 'drop_image') ok = !!value && value === cell.src;
        if (cell.type === 'check') ok = value !== '' && (value === 'true') === !!cell.answer;
        if (ok) score++;
        ref.td.classList.toggle('is-correct', !ctx.examMode && value !== '' && ok);
        ref.td.classList.toggle('is-wrong', !ctx.examMode && value !== '' && !ok);
        details.push(`F${r + 1}C${c + 1}: ${value || 'vacío'}${ctx.examMode ? '' : (ok ? ' (OK)' : ' (X)')}`);
        return value;
      }));
      const userAnswer = {rows:gradingRows, gradingRows, liveTable:true};
      const snapshot = JSON.stringify(gradingRows);
      if (record && snapshot !== lastSnapshot) ctx.recordAnswer(score, total || 1, details, userAnswer);
      lastSnapshot = snapshot;
      const perfect = total > 0 && score === total;
      if (record && !ctx.examMode && perfect && !wasPerfect) ctx.cheer();
      wasPerfect = perfect;
    }

    // Check and save the current table after every edit; keep cells editable.
    function maybeReview() {
      if (restoring || reviewQueued) return;
      reviewQueued = true;
      queueMicrotask(() => {
        reviewQueued = false;
        review();
      });
    }
    wrap.addEventListener('input', event => {
      if (!event.isComposing) maybeReview();
    });
    wrap.addEventListener('compositionend', maybeReview);
    wrap.addEventListener('change', maybeReview);
    ctx.container.appendChild(wrap);

    // Restore live drafts without turning a partially filled table into a completed summary.
    const savedRows = ctx.previousAnswer?.gradingRows || ctx.previousAnswer?.rows;
    if (savedRows) {
      refs.forEach((row, r) => row.forEach((ref, c) => {
        const value = savedRows[r]?.[c];
        if (value == null || value === '') return;
        if (ref.cell.type === 'input' || ref.cell.type === 'select') ref.control.value = String(value);
        else if (ref.cell.type === 'check') setCheckState(ref.control, String(value));
        else if (ref.cell.type === 'drop' || ref.cell.type === 'drop_image') {
          const kind = dropType(ref.cell.type);
          const token = [...(banks[kind]?.querySelectorAll('.worksheet-table-token') || [])].find(item => item.dataset.value === value);
          if (token) place(token, ref.td);
        }
      }));
      review(false);
    }
    restoring = false;
  });
})(typeof window !== 'undefined' ? window : this);
