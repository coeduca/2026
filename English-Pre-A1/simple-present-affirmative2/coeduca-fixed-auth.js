/* Acceso de las cuentas fijas; la contraseña se verifica en Supabase. */
(function (global) {
  'use strict';
  const URL = 'https://pxoxmcyyhjpjggbseqcr.supabase.co';
  const KEY = 'sb_publishable_uBmOVK8akx2H73wpKDxT-w_vtTTcPr9';
  const fixed = new Set(['1999', '12379']);
  let account = null;
  let token = null;
  let promptOpen = null;

  async function login(nie, password) {
    const selected = String(nie || '').trim();
    if (!fixed.has(selected)) return true;
    account = null;
    token = null;
    if (!password) return false;
    const response = await fetch(URL + '/rest/v1/rpc/coeduca_fixed_account_login', {
      method: 'POST',
      headers: {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({p_nie: selected, p_password: password})
    });
    if (!response.ok) throw new Error('No se pudo verificar la contraseña. Inténtalo de nuevo.');
    const value = await response.json();
    if (typeof value !== 'string' || !value) return false;
    account = selected;
    token = value;
    return true;
  }

  function requestLogin(nie) {
    const selected = String(nie || '').trim();
    if (!fixed.has(selected)) return Promise.resolve(true);
    if (promptOpen) return promptOpen;
    promptOpen = new Promise(resolve => {
      if (!document.getElementById('coeduca-fixed-auth-style')) {
        const style = document.createElement('style');
        style.id = 'coeduca-fixed-auth-style';
        style.textContent = '.coeduca-fixed-auth-backdrop{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:16px;background:#102044b8;box-sizing:border-box}.coeduca-fixed-auth-card{width:min(390px,100%);box-sizing:border-box;padding:24px;border:3px solid #302259;border-radius:18px;background:#fffaf0;box-shadow:5px 6px 0 #302259;color:#302259;font:16px/1.45 system-ui,sans-serif}.coeduca-fixed-auth-card h2{margin:0 0 8px;font-size:23px}.coeduca-fixed-auth-card p{margin:0 0 18px}.coeduca-fixed-auth-card label{display:block;margin-bottom:7px;font-weight:800}.coeduca-fixed-auth-card input{width:100%;box-sizing:border-box;padding:12px;border:2px solid #826ab1;border-radius:10px;font:17px system-ui,sans-serif}.coeduca-fixed-auth-error{min-height:24px;margin:9px 0;color:#a52b44;font-size:13px}.coeduca-fixed-auth-actions{display:flex;justify-content:flex-end;gap:9px}.coeduca-fixed-auth-actions button{padding:10px 14px;border:2px solid #523484;border-radius:10px;background:#fff;color:#523484;font:800 14px system-ui,sans-serif;cursor:pointer}.coeduca-fixed-auth-actions button[type=submit]{background:#7650ad;color:#fff}.coeduca-fixed-auth-actions button:disabled{opacity:.6;cursor:wait}';
        document.head.appendChild(style);
      }
      const overlay = document.createElement('div');
      overlay.className = 'coeduca-fixed-auth-backdrop';
      overlay.innerHTML = '<form class="coeduca-fixed-auth-card" role="dialog" aria-modal="true" aria-labelledby="coeduca-fixed-auth-title"><h2 id="coeduca-fixed-auth-title">Acceso protegido</h2><p>Ingresa la contraseña de ' + (selected === '12379' ? 'Rigo' : 'Eliseo') + ' para entrar a esta cuenta.</p><label for="coeduca-fixed-auth-password">Contraseña</label><input id="coeduca-fixed-auth-password" type="password" autocomplete="current-password" required><div class="coeduca-fixed-auth-error" role="alert" aria-live="polite"></div><div class="coeduca-fixed-auth-actions"><button type="button" class="coeduca-fixed-auth-cancel">Cancelar</button><button type="submit">Entrar</button></div></form>';
      document.body.appendChild(overlay);
      const form = overlay.querySelector('form');
      const input = overlay.querySelector('input');
      const error = overlay.querySelector('.coeduca-fixed-auth-error');
      const buttons = [...overlay.querySelectorAll('button')];
      let settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        input.value = '';
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        promptOpen = null;
        resolve(value);
      }
      function onKey(event) { if (event.key === 'Escape' && !buttons[0].disabled) finish(false); }
      document.addEventListener('keydown', onKey);
      overlay.querySelector('.coeduca-fixed-auth-cancel').addEventListener('click', () => finish(false));
      form.addEventListener('submit', async event => {
        event.preventDefault();
        buttons.forEach(button => { button.disabled = true; });
        error.textContent = '';
        try {
          if (await login(selected, input.value)) { finish(true); return; }
          error.textContent = 'Contraseña incorrecta.';
        } catch (failure) {
          error.textContent = failure.message || 'No se pudo verificar la contraseña.';
        }
        buttons.forEach(button => { button.disabled = false; });
        input.select();
      });
      input.focus();
    });
    return promptOpen;
  }

  global.COEDUCA_FIXED_AUTH = {
    isFixed: nie => fixed.has(String(nie || '').trim()),
    login,
    requestLogin,
    tokenFor: nie => account === String(nie || '').trim() ? token : null,
    clear() { account = null; token = null; }
  };
})(window);
