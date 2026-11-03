(() => {
  const app = document.getElementById('app');
  const nie = new URLSearchParams(location.search).get('nie') || '';
  const student = STUDENTS[nie];
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function start() {
    if (!student) throw Error('Este QR no corresponde a un estudiante de esta actividad.');
    const response = await fetch('missions.json');
    if (!response.ok) throw Error('No se pudo abrir la pista. Comprueba tu conexión.');
    const missions = await response.json();
    const first = missions[nie]?.match(/[\p{L}']+/gu)?.[0];
    if (!first) throw Error('No se encontró la frase de este expediente.');
    try { localStorage.setItem(`mystery-p4:first:${nie}`, '1'); } catch (_) {}
    app.innerHTML = `<section class="clue-card"><div class="eyebrow">Top secret · Pista 01</div><h1>Tu primera palabra</h1><p class="student">${escape(student.name)}</p><div class="clue-word">${escape(first.toUpperCase())}</div><p>Escribe esta palabra en el espacio <strong>01</strong> de tu álbum. El QR del sobre abre los veinte desafíos que revelarán las demás.</p><a class="action" style="display:inline-block;text-decoration:none;margin-top:15px" href="index.html?nie=${encodeURIComponent(nie)}">Ir a mis desafíos →</a></section>`;
    window.rigo?.say?.('¡Primera pista encontrada! Escribe la palabra en tu álbum.', 4500);
  }
  start().catch(error => { app.innerHTML = `<div class="panel error"><h1>No se pudo abrir la pista</h1><p>${escape(error.message)}</p></div>`; });
})();
