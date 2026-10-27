/* Adaptador de sesión local para la edición estática de GitHub Pages. */
(function (global) {
  'use strict';
  const KEY = 's12-flujo-ultimo-nie';
  const get = () => { try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; } };
  global.COEDUCA_FIXED_AUTH = {
    isFixed: () => false,
    login: async () => true,
    requestLogin: async () => true,
    hasSession: async () => true,
    lastStudent: get,
    remember(nie) {
      const id = String(nie || '').trim();
      if (!/^\d{4,}$/.test(id)) return;
      try { localStorage.setItem(KEY, id); } catch (_) {}
    },
    tokenFor: () => null,
    clear() { try { localStorage.removeItem(KEY); } catch (_) {} }
  };
})(window);
