/** Themed exercise selects. Native values and input/change events remain authoritative. */
(function (global) {
  'use strict';
  if (global.COEDUCA_SELECT) return;
  const selector = '.coeduca-exercise-body select, .civica-exercise-body select, .worksheet-table select, .civica-cell-select select, select.dd-sel';
  const controls = new WeakMap();
  let sequence = 0, active = null, frame = 0;

  const style = document.createElement('style');
  style.id = 'worksheet-select-styles';
  style.textContent = `
    .worksheet-select, .worksheet-select-menu {
      --ws-select-surface:var(--civica-surface,var(--coeduca-theme-control,var(--coeduca-surface,#fff)));
      --ws-select-text:var(--civica-text,var(--coeduca-text,#1f2240));
      --ws-select-accent:var(--civica-primary,var(--coeduca-primary,#7c5cff));
      --ws-select-border:var(--civica-divider-2,var(--coeduca-glass-brd-2,var(--coeduca-stroke,#d0d0d0)));
      --ws-select-success:var(--civica-success,var(--coeduca-success,#15803d));
      --ws-select-error:var(--civica-error,var(--coeduca-error,#b91c1c));
      --ws-select-radius:12px; --ws-select-line:1px;
      --ws-select-shadow:var(--civica-shadow-sm,var(--coeduca-shadow-sm,0 6px 18px #0002));
      box-sizing:border-box; color:var(--ws-select-text); font:inherit;
    }
    .worksheet-select { display:inline-block; position:relative; vertical-align:middle; max-width:min(100%,420px); margin:4px 3px; }
    .worksheet-select[hidden] { display:none; }
    select.worksheet-select-native { display:none!important; }
    .worksheet-select > .worksheet-select-trigger {
      appearance:none; display:flex; align-items:center; justify-content:space-between; gap:12px;
      width:100%; max-width:100%; min-width:140px; min-height:44px; padding:9px 12px;
      border:var(--ws-select-line) solid var(--ws-select-border); border-radius:var(--ws-select-radius);
      background:var(--ws-select-surface); color:var(--ws-select-text); box-shadow:var(--ws-select-shadow);
      font:inherit; font-size:15px; font-weight:600; line-height:1.35; text-align:start; cursor:pointer;
    }
    .worksheet-select-label { flex:1; min-width:0; overflow-wrap:anywhere; }
    .worksheet-select[data-empty="true"] .worksheet-select-label { opacity:0.65; font-weight:400; }
    .worksheet-select-arrow { flex:none; width:8px; height:8px; border-right:2px solid currentColor; border-bottom:2px solid currentColor; transform:rotate(45deg) translateY(-2px); }
    .worksheet-select-trigger[aria-expanded="true"] .worksheet-select-arrow { transform:rotate(225deg) translate(-1px,-1px); }
    .worksheet-select > .worksheet-select-trigger:focus-visible { outline:3px solid var(--ws-select-accent); outline-offset:3px; }
    .worksheet-select > .worksheet-select-trigger:disabled { opacity:0.55; cursor:default; box-shadow:none; }
    .worksheet-select[data-state="correct"] > .worksheet-select-trigger { border-color:var(--ws-select-success); }
    .worksheet-select[data-state="wrong"] > .worksheet-select-trigger { border-color:var(--ws-select-error); }
    .worksheet-select-menu {
      position:fixed; z-index:10020; overflow:auto; overscroll-behavior:contain; touch-action:pan-y;
      padding:5px; margin:0; border:var(--ws-select-line) solid var(--ws-select-border);
      border-radius:var(--ws-select-radius); background:var(--ws-select-surface); box-shadow:var(--ws-select-shadow);
      text-align:start; scrollbar-width:thin;
    }
    .worksheet-select-option { display:flex; align-items:center; justify-content:space-between; gap:12px; position:relative; min-height:44px; padding:10px 12px; border-radius:8px; cursor:pointer; line-height:1.35; }
    .worksheet-select-option > .worksheet-select-option-label { flex:1; min-width:0; overflow-wrap:anywhere; }
    .worksheet-select-option[aria-selected="true"] { background:var(--ws-select-surface); background:color-mix(in srgb,var(--ws-select-accent) 20%,var(--ws-select-surface)); font-weight:700; }
    .worksheet-select-option.is-active { outline:2px solid var(--ws-select-accent); outline-offset:-2px; }
    .worksheet-select-option[aria-disabled="true"] { opacity:0.45; cursor:default; }
    .worksheet-select-option.is-placeholder { font-style:italic; }
    .worksheet-select-mark { flex:none; display:grid; place-items:center; width:20px; height:20px; border:1.5px solid currentColor; border-radius:50%; font:700 12px/1 system-ui,sans-serif; visibility:hidden; }
    .worksheet-select-option[aria-selected="true"] .worksheet-select-mark { visibility:visible; }
    .worksheet-select-group { padding:9px 12px 4px; font-size:0.85em; font-weight:700; opacity:0.7; }
    .worksheet-table td > .worksheet-select, .civica-cell-select > .worksheet-select { display:block; width:100%; max-width:100%; margin:0; }
    .worksheet-table .worksheet-select-trigger, .civica-cell-select .worksheet-select-trigger { min-width:0; }
    html[data-coeduca-ui-theme="PopArt"] .worksheet-select,
    html[data-coeduca-ui-theme="PopArt"] .worksheet-select-menu { --ws-select-line:2px; --ws-select-radius:10px; --ws-select-border:var(--coeduca-stroke,#1a1a1a); --ws-select-shadow:3px 3px 0 var(--coeduca-stroke,#1a1a1a); }
    html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-select,
    html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-select-menu { --ws-select-radius:14px; --ws-select-border:#a69784; --ws-select-shadow:0 5px 16px #483a2d22; }
    html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-select > .worksheet-select-trigger,
    html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-select-menu { border-style:dashed; background-color:var(--ws-select-surface); }
    html[data-coeduca-ui-theme="HollyHobbie"] .worksheet-select-option { border-radius:10px; }
    html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-select,
    html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-select-menu { --ws-select-radius:9px; --ws-select-border:#68747e; --ws-select-shadow:0 1px 0 #fff9 inset,0 3px 7px #19222a33; }
    html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-select > .worksheet-select-trigger { background-image:linear-gradient(180deg,#ffffff80,#ffffff0a 48%,#0000000a 52%,#00000014); }
    html[data-coeduca-ui-theme="Skeuomorphic"] .worksheet-select-menu { box-shadow:0 1px 0 #fff9 inset,0 8px 22px #19222a44; }
    @media(forced-colors:active) {
      .worksheet-select > .worksheet-select-trigger, .worksheet-select-menu { border:1px solid ButtonText; }
      .worksheet-select-option.is-active { outline-color:Highlight; }
      .worksheet-select-option[aria-selected="true"] { background:Highlight; color:HighlightText; }
    }
  `;
  document.head.appendChild(style);

  function sourceDisabled(select) {
    return select.matches(':disabled') || select.getAttribute('aria-disabled') === 'true';
  }
  function optionDisabled(option) {
    return option.disabled || (option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled);
  }
  function optionVisible(option) {
    return !option.hidden && !option.parentElement.hidden;
  }
  function enabledOptions(select) {
    return Array.from(select.options).filter(option => optionVisible(option) && !optionDisabled(option));
  }
  function accessibleLabel(select) {
    if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
    const labelledBy = (select.getAttribute('aria-labelledby') || '').split(/\s+/)
      .map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
    if (labelledBy) return labelledBy;
    const labels = Array.from(select.labels || []).map(label => label.textContent.trim()).join(' ');
    if (labels) return labels;
    const cell = select.closest('td');
    if (cell) {
      const heading = cell.closest('table')?.rows[0]?.cells[cell.cellIndex]?.textContent.trim();
      return (heading || 'Selecciona una opción') + ', fila ' + cell.parentElement.rowIndex;
    }
    const sentence = Array.from(select.parentElement.childNodes)
      .filter(node => node.nodeType === 3).map(node => node.textContent).join(' ').replace(/\s+/g, ' ').trim();
    return sentence || 'Selecciona una opción';
  }
  function sync(control) {
    const { select, wrapper, trigger, label } = control;
    const option = select.options[select.selectedIndex];
    const text = option ? option.label : 'Selecciona una opción';
    if (label.textContent !== text) label.textContent = text;
    if (wrapper.hidden !== select.hidden) wrapper.hidden = select.hidden;
    trigger.disabled = sourceDisabled(select) || enabledOptions(select).length === 0;
    trigger.setAttribute('aria-label', control.name + ': ' + text);
    const describedBy = select.getAttribute('aria-describedby');
    if (describedBy) trigger.setAttribute('aria-describedby', describedBy);
    else trigger.removeAttribute('aria-describedby');
    trigger.setAttribute('aria-required', String(select.required));
    wrapper.dataset.empty = String(select.value === '');
    const cell = select.closest('td');
    const wrong = select.classList.contains('wrong') || select.classList.contains('is-wrong') || cell?.classList.contains('is-wrong');
    const correct = select.classList.contains('correct') || select.classList.contains('is-correct') || cell?.classList.contains('is-correct');
    wrapper.dataset.state = wrong ? 'wrong' : (correct ? 'correct' : '');
    if (select.validity.valid) control.invalid = false;
    if (wrong || select.getAttribute('aria-invalid') === 'true' || control.invalid) trigger.setAttribute('aria-invalid', 'true');
    else trigger.removeAttribute('aria-invalid');
    if (active?.control === control) {
      if (trigger.disabled || select.hidden) close();
      else active.rows.forEach((row, index) => row.setAttribute('aria-selected', String(index === select.selectedIndex)));
    }
  }
  function close() {
    if (!active) return;
    const current = active;
    active = null;
    current.control.trigger.setAttribute('aria-expanded', 'false');
    current.control.trigger.removeAttribute('aria-activedescendant');
    current.control.trigger.removeAttribute('aria-controls');
    current.menu.remove();
  }
  function appearance() {
    if (!active) return;
    const computed = getComputedStyle(active.control.trigger);
    ['surface','text','accent','border','success','error','radius','line','shadow'].forEach(key => {
      const name = '--ws-select-' + key;
      active.menu.style.setProperty(name, computed.getPropertyValue(name));
    });
    active.menu.style.fontFamily = computed.fontFamily;
    active.menu.style.fontSize = computed.fontSize;
    active.menu.style.direction = computed.direction;
  }
  function position() {
    frame = 0;
    if (!active) return;
    const { control, menu } = active;
    if (!control.trigger.isConnected) { close(); return; }
    const box = control.trigger.getBoundingClientRect(), viewport = global.visualViewport;
    const leftEdge = viewport?.offsetLeft || 0, topEdge = viewport?.offsetTop || 0;
    const width = viewport?.width || global.innerWidth, height = viewport?.height || global.innerHeight;
    if (box.bottom < topEdge || box.top > topEdge + height || box.right < leftEdge || box.left > leftEdge + width) { close(); return; }
    const menuWidth = Math.min(Math.max(box.width, 220), width - 16);
    menu.style.width = menuWidth + 'px';
    menu.style.left = Math.max(leftEdge + 8, Math.min(box.left, leftEdge + width - menuWidth - 8)) + 'px';
    const below = topEdge + height - box.bottom - 12, above = box.top - topEdge - 12;
    const upwards = below < Math.min(menu.scrollHeight, 280) && above > below;
    const maxHeight = Math.min(280, Math.max(44, upwards ? above : below));
    menu.style.maxHeight = maxHeight + 'px';
    const actualHeight = menu.getBoundingClientRect().height;
    const top = upwards ? box.top - actualHeight - 6 : box.bottom + 6;
    menu.style.top = Math.max(topEdge + 8, Math.min(top, topEdge + height - actualHeight - 8)) + 'px';
  }
  function reposition() {
    if (active && !frame) frame = requestAnimationFrame(position);
  }
  function highlight(index) {
    if (!active || !active.rows.has(index)) return;
    active.index = index;
    active.rows.forEach((row, key) => row.classList.toggle('is-active', key === index));
    const row = active.rows.get(index), menu = active.menu;
    active.control.trigger.setAttribute('aria-activedescendant', row.id);
    if (row.offsetTop < menu.scrollTop) menu.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = row.offsetTop + row.offsetHeight - menu.clientHeight;
  }
  function choose(control, index) {
    const option = control.select.options[index];
    if (!option || sourceDisabled(control.select) || optionDisabled(option) || !optionVisible(option)) return;
    control.select.selectedIndex = index;
    close();
    sync(control);
    if (control.trigger.isConnected) control.trigger.focus({ preventScroll: true });
    control.select.dispatchEvent(new Event('input', { bubbles: true }));
    control.select.dispatchEvent(new Event('change', { bubbles: true }));
    sync(control);
  }
  function buildOptions() {
    if (!active) return;
    const current = active, { control, menu } = current;
    current.rows = new Map();
    menu.replaceChildren();
    function append(option, parent = menu) {
      if (!optionVisible(option)) return;
      const row = document.createElement('div');
      row.id = menu.id + '-option-' + option.index;
      row.className = 'worksheet-select-option';
      row.classList.toggle('is-placeholder', option.value === '');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(option.index === control.select.selectedIndex));
      row.setAttribute('aria-disabled', String(optionDisabled(option)));
      const label = document.createElement('span');
      label.className = 'worksheet-select-option-label';
      label.textContent = option.label;
      const mark = document.createElement('span');
      mark.className = 'worksheet-select-mark';
      mark.textContent = '✓'; mark.setAttribute('aria-hidden', 'true');
      row.append(label, mark);
      row.addEventListener('click', () => choose(control, option.index));
      row.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse' && !optionDisabled(option)) highlight(option.index);
      });
      current.rows.set(option.index, row);
      parent.appendChild(row);
    }
    Array.from(control.select.children).forEach(child => {
      if (child.tagName === 'OPTION') append(child);
      else if (child.tagName === 'OPTGROUP' && !child.hidden) {
        const group = document.createElement('div');
        group.setAttribute('role', 'group'); group.setAttribute('aria-label', child.label);
        const heading = document.createElement('div');
        heading.className = 'worksheet-select-group'; heading.textContent = child.label;
        heading.setAttribute('aria-hidden', 'true');
        group.appendChild(heading); menu.appendChild(group);
        Array.from(child.children).forEach(option => append(option, group));
      }
    });
    const enabled = enabledOptions(control.select);
    if (!enabled.some(option => option.index === current.index)) current.index = enabled[0]?.index ?? -1;
    position();
    if (active) highlight(current.index);
  }
  function open(control, last) {
    sync(control);
    if (control.trigger.disabled || control.select.hidden || !control.trigger.isConnected) return;
    close();
    const menu = document.createElement('div');
    menu.className = 'worksheet-select-menu'; menu.id = control.id + '-list';
    menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', control.name);
    menu.addEventListener('mousedown', event => event.preventDefault());
    const options = enabledOptions(control.select);
    const selected = options.find(option => option.index === control.select.selectedIndex);
    active = { control, menu, rows: new Map(), index: selected?.index ?? (last ? options[options.length - 1].index : options[0].index) };
    control.trigger.setAttribute('aria-expanded', 'true');
    control.trigger.setAttribute('aria-controls', menu.id);
    document.body.appendChild(menu);
    appearance(); buildOptions();
  }
  function keydown(control, event) {
    const key = event.key;
    if (event.ctrlKey || event.metaKey || (event.altKey && key !== 'ArrowDown' && key !== 'ArrowUp')) return;
    if (key === 'Tab') { if (active?.control === control) close(); return; }
    if (key === 'Escape') { if (active?.control === control) { event.preventDefault(); close(); } return; }
    if (key === 'ArrowUp' && event.altKey && active?.control === control) { event.preventDefault(); close(); return; }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (active?.control === control) choose(control, active.index);
      else open(control);
      return;
    }
    const navigation = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'];
    if (navigation.includes(key)) {
      event.preventDefault();
      if (active?.control !== control) {
        open(control, key === 'ArrowUp' || key === 'End');
        if (!active || key === 'ArrowDown' || key === 'ArrowUp') return;
      }
      const options = enabledOptions(control.select), index = options.findIndex(option => option.index === active.index);
      if (!options.length) { close(); return; }
      const step = key === 'ArrowUp' ? -1 : key === 'PageDown' ? 5 : key === 'PageUp' ? -5 : 1;
      const next = key === 'Home' ? 0 : key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + step));
      highlight(options[next].index);
    } else if (key.length === 1 && !event.altKey) {
      event.preventDefault();
      if (active?.control !== control) open(control);
      if (!active) return;
      const now = Date.now();
      control.search = (now - control.typedAt < 750 ? control.search : '') + key.toLocaleLowerCase();
      control.typedAt = now;
      const options = enabledOptions(control.select), start = options.findIndex(option => option.index === active.index);
      const ordered = options.slice(start + 1).concat(options.slice(0, start + 1));
      let match = ordered.find(option => option.label.toLocaleLowerCase().startsWith(control.search));
      if (!match) {
        control.search = key.toLocaleLowerCase();
        match = ordered.find(option => option.label.toLocaleLowerCase().startsWith(control.search));
      }
      if (match) highlight(match.index);
    }
  }
  function enhance(select) {
    if (controls.has(select)) { sync(controls.get(select)); return; }
    if (!select.isConnected || select.multiple || select.size > 1 || select.hidden) return;
    const wrapper = document.createElement('span'); wrapper.className = 'worksheet-select';
    const trigger = document.createElement('button'); trigger.type = 'button';
    trigger.className = 'worksheet-select-trigger'; trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
    const label = document.createElement('span'); label.className = 'worksheet-select-label';
    const arrow = document.createElement('span'); arrow.className = 'worksheet-select-arrow'; arrow.setAttribute('aria-hidden', 'true');
    trigger.append(label, arrow);
    const control = { select, wrapper, trigger, label, id: 'worksheet-select-' + (++sequence), name: accessibleLabel(select), search: '', typedAt: 0 };
    controls.set(select, control);
    select.before(wrapper); wrapper.append(select, trigger);
    select.classList.add('worksheet-select-native'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
    trigger.addEventListener('click', () => active?.control === control ? close() : open(control));
    trigger.addEventListener('keydown', event => keydown(control, event));
    trigger.addEventListener('focus', () => sync(control));
    ['input', 'change'].forEach(type => select.addEventListener(type, () => sync(control)));
    select.addEventListener('invalid', event => { event.preventDefault(); control.invalid = true; sync(control); trigger.focus(); open(control); });
    sync(control);
  }
  function refresh(root = document) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.matches?.(selector)) enhance(root);
    root.querySelectorAll(selector).forEach(enhance);
  }
  const observer = new MutationObserver(records => {
    const changed = new Set();
    records.forEach(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target === document.documentElement && record.type === 'attributes' && active) { appearance(); reposition(); }
      const select = target?.closest('select');
      if (select && controls.has(select)) changed.add(select);
      if (record.type === 'childList') record.addedNodes.forEach(refresh);
      else if (record.type === 'attributes' && target && !select &&
        ((target.tagName === 'TD' && record.attributeName === 'class') ||
         (target.tagName === 'FIELDSET' && record.attributeName === 'disabled'))) refresh(target);
    });
    changed.forEach(select => {
      sync(controls.get(select));
      if (active?.control.select === select) buildOptions();
    });
    if (active && !active.control.trigger.isConnected) close();
  });
  observer.observe(document.documentElement, { subtree:true, childList:true, characterData:true, attributes:true,
    attributeFilter:['class','disabled','required','selected','hidden','label','style','aria-label','aria-labelledby','aria-describedby','aria-invalid','aria-disabled','data-coeduca-ui-theme'] });
  document.addEventListener('pointerdown', event => {
    if (active && !active.control.wrapper.contains(event.target) && !active.menu.contains(event.target)) close();
  }, true);
  document.addEventListener('focusin', event => {
    if (active && !active.control.wrapper.contains(event.target) && !active.menu.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) close(); });
  document.addEventListener('reset', event => setTimeout(() => refresh(event.target), 0), true);
  document.addEventListener('click', event => {
    const label = event.target.closest?.('label');
    const control = label?.control && controls.get(label.control);
    if (control && !control.wrapper.contains(event.target)) { event.preventDefault(); control.trigger.focus(); open(control); }
  });
  document.addEventListener('scroll', event => { if (active && event.target !== active.menu) reposition(); }, true);
  global.addEventListener('resize', reposition);
  global.visualViewport?.addEventListener('resize', reposition);
  global.visualViewport?.addEventListener('scroll', reposition);
  global.COEDUCA_SELECT = { refresh };
  refresh(document);
})(typeof window !== 'undefined' ? window : this);
