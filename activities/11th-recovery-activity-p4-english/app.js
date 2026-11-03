(() => {
  const app = document.getElementById('app');
  const nie = new URLSearchParams(location.search).get('nie') || '';
  const student = STUDENTS[nie];
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const words = text => text.match(/[\p{L}']+/gu) || [];
  const normalize = text => String(text).trim().toLowerCase().replace(/[.!?,;:]+$/g, '').replace(/\s+/g, ' ');
  const key = `mystery-p4:progress:${nie}`;
  const reflectionKey = `mystery-p4:reflection:${nie}`;
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k,v) { try { localStorage.setItem(k,v); } catch (_) {} }
  };
  function shuffledPositions(id) {
    const positions = Array.from({length:20}, (_,i) => i + 2);
    let seed = Number(id) || 1;
    for (let i=positions.length-1; i>0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i+1);
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return positions;
  }
  async function start() {
    if (!student) throw Error('Abre el QR de tu sobre para entrar a tu expediente.');
    const [mRes, cRes] = await Promise.all([fetch('missions.json'), fetch('challenges.json')]);
    if (!mRes.ok || !cRes.ok) throw Error('No se pudo cargar la actividad. Comprueba tu conexión.');
    const [missions, challenges] = await Promise.all([mRes.json(), cRes.json()]);
    const phrase = missions[nie];
    const tokens = words(phrase || '');
    if (tokens.length !== 21 || challenges.length !== 20) throw Error('El expediente está incompleto.');
    let done;
    try { done = new Set(JSON.parse(storage.get(key) || '[]').filter(n => Number.isInteger(n) && n >= 0 && n < 20)); }
    catch (_) { done = new Set(); }
    const positions = shuffledPositions(nie);
    const firstSeen = storage.get(`mystery-p4:first:${nie}`) === '1';
    const chapterNames = [...new Set(challenges.map(c => c.chapter))];
    app.innerHTML = `<header class="hero"><div class="eyebrow">English · Recuperación · Período 4</div><h1>The Mystery Phrase</h1><p>Resuelve veinte desafíos de <strong>present perfect</strong>, participios regulares e irregulares y experiencias de vida. Cada respuesta correcta libera una palabra y su número en el álbum.</p><span class="student">${escape(student.name)} · ${escape(nie)}</span><div class="chips"><span class="chip">20 desafíos</span><span class="chip">21 palabras</span><span class="chip">4 capítulos</span><span class="chip">Sin penalización por reintentos</span></div></header>
      <section class="panel"><h2>Tu avance</h2><p id="progress-text"></p><div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>${firstSeen ? `<p class="badge">✓ Primera palabra encontrada con el QR interior.</p>` : `<div class="notice">Antes de empezar, escanea el QR que está dentro del álbum. Allí encontrarás la palabra 01.</div>`}<p>Los retos se pueden hacer en cualquier orden. Anota cada palabra en el número que aparezca, no en el orden en que resuelves los retos.</p></section>
      <div class="chapters" id="chapters"></div>
      <section class="panel reflection"><h2>Tu historia también cuenta</h2><p>Después de descubrir la frase, escribe tres oraciones verdaderas sobre tus experiencias. Usa <strong>have/has + participle</strong>. Puedes copiar estas oraciones al álbum.</p><label>1. I have…<textarea data-reflection="0" placeholder="I have visited…"></textarea></label><label>2. I have never…<textarea data-reflection="1" placeholder="I have never…"></textarea></label><label>3. Have you ever…? <small>Escribe una pregunta para un compañero.</small><textarea data-reflection="2" placeholder="Have you ever…?"></textarea></label><p>Estas respuestas se guardan únicamente en este navegador. El docente revisa las oraciones escritas en el álbum.</p></section>
      <section class="panel" id="final-section"><h2>La frase misteriosa</h2><p>Cuando tengas las 21 palabras en tu álbum, escríbela aquí para comprobar el orden.</p><textarea id="final-input" class="final-input" placeholder="Escribe la frase completa…"></textarea><button class="action" id="check-final">Comprobar frase</button><div class="feedback" id="final-feedback" role="status"></div></section><p class="footer-note">Actividad estática de COEDUCA Worksheets. La web guarda el avance en este dispositivo; entrega el álbum físico como evidencia.</p>`;
    const chaptersEl = document.getElementById('chapters');
    chapterNames.forEach((chapter, chapterIndex) => {
      const section = document.createElement('section');
      section.innerHTML = `<h2 class="chapter-title"><span>${chapterIndex+1}</span>${escape(chapter)}</h2><div class="challenge-grid"></div>`;
      const grid = section.querySelector('.challenge-grid');
      challenges.forEach((challenge, index) => {
        if (challenge.chapter !== chapter) return;
        const card = document.createElement('article');
        card.className = 'challenge' + (done.has(index) ? ' done' : '');
        card.dataset.index = index;
        card.innerHTML = `<div class="number">Desafío ${String(index+1).padStart(2,'0')}</div><h3>${escape(challenge.title)}</h3><div class="prompt">${escape(challenge.prompt)}</div><div class="answers"></div><div class="feedback" role="status"></div>`;
        grid.appendChild(card);
        renderAnswer(card, challenge, index);
      });
      chaptersEl.appendChild(section);
    });
    function renderAnswer(card, challenge, index) {
      const area = card.querySelector('.answers');
      if (done.has(index)) {
        card.querySelector('.feedback').textContent = challenge.explanation;
        card.querySelector('.feedback').className = 'feedback good';
        const reward = document.createElement('div');
        reward.className = 'reward';
        reward.innerHTML = `Álbum ${String(positions[index]).padStart(2,'0')} → <strong>${escape(tokens[positions[index]-1].toUpperCase())}</strong>`;
        card.appendChild(reward);
        return;
      }
      const feedback = card.querySelector('.feedback');
      const submit = value => {
        const accepted = [challenge.answer, ...(challenge.also || [])].map(normalize);
        if (accepted.includes(normalize(value))) {
          done.add(index);
          storage.set(key, JSON.stringify([...done]));
          card.classList.add('done');
          area.replaceChildren();
          card.querySelector('.hint-btn')?.remove();
          feedback.className = 'feedback good';
          feedback.textContent = challenge.explanation;
          renderAnswer(card, challenge, index);
          updateProgress();
          window.rigo?.cheer?.();
        } else {
          feedback.className = 'feedback try';
          feedback.textContent = `Todavía no. Pista: ${challenge.hint}`;
          window.rigo?.comfort?.();
        }
      };
      if (challenge.type === 'choice') {
        challenge.options.forEach(option => {
          const button = document.createElement('button');
          button.className = 'option'; button.type = 'button'; button.textContent = option;
          button.addEventListener('click', () => submit(option)); area.appendChild(button);
        });
      } else {
        const row = document.createElement('form'); row.className = 'answer-row';
        row.innerHTML = '<input aria-label="Tu respuesta en inglés" autocomplete="off" spellcheck="false" required><button class="small-btn" type="submit">Revisar</button>';
        row.addEventListener('submit', event => { event.preventDefault(); submit(row.querySelector('input').value); });
        area.appendChild(row);
      }
      const hint = document.createElement('button');
      hint.className = 'hint-btn'; hint.type = 'button'; hint.textContent = 'Necesito una pista';
      hint.addEventListener('click', () => { feedback.className = 'feedback try'; feedback.textContent = challenge.hint; window.rigo?.say?.(challenge.hint, 4500); });
      card.appendChild(hint);
    }
    function updateProgress() {
      document.getElementById('progress-text').textContent = `${done.size} de 20 desafíos resueltos`;
      document.getElementById('progress-fill').style.width = `${done.size*5}%`;
    }
    updateProgress();
    let savedReflection = [];
    try { savedReflection = JSON.parse(storage.get(reflectionKey) || '[]'); } catch (_) {}
    document.querySelectorAll('[data-reflection]').forEach(area => {
      const i = Number(area.dataset.reflection);
      area.value = savedReflection[i] || '';
      area.addEventListener('input', () => {
        const values = [...document.querySelectorAll('[data-reflection]')].map(el => el.value);
        storage.set(reflectionKey, JSON.stringify(values));
      });
    });
    document.getElementById('check-final').addEventListener('click', () => {
      const feedback = document.getElementById('final-feedback');
      if (done.size !== 20 || storage.get(`mystery-p4:first:${nie}`) !== '1') {
        feedback.className = 'feedback try';
        feedback.textContent = 'Encuentra primero la palabra del QR interior y resuelve los veinte desafíos.';
        return;
      }
      const typed = words(document.getElementById('final-input').value).map(normalize);
      const target = tokens.map(normalize);
      const correct = typed.length === target.length && typed.every((word, i) => word === target[i]);
      feedback.className = `feedback ${correct ? 'good' : 'try'}`;
      feedback.textContent = correct ? '¡Misión completa! Entrega tu álbum con la frase y tus tres oraciones.' : 'El orden todavía no coincide. Revisa los números del álbum y vuelve a intentarlo.';
      if (correct) window.rigo?.say?.('¡Misión completa! Tu historia también merece ser contada.', 5000);
    });
  }
  start().catch(error => { app.innerHTML = `<div class="panel error"><h1>No se pudo abrir el expediente</h1><p>${escape(error.message)}</p></div>`; });
})();
