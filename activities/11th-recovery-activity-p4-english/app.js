(() => {
  const app = document.getElementById('app');
  const nie = new URLSearchParams(location.search).get('nie') || '';
  const student = STUDENTS[nie];
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const words = text => text.match(/[\p{L}']+/gu) || [];
  const normalize = text => String(text).trim().toLowerCase().replace(/[.!?,;:]+$/g, '').replace(/\s+/g, ' ');
  const progressKey = `mystery-p4:v2:progress:${nie}`;
  const slideKey = `mystery-p4:v2:slide:${nie}`;
  const reflectionKey = `mystery-p4:reflection:${nie}`;
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
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
    const audioMission = challenges.find(c => c.type === 'audio')?.audioByStudent?.[nie];
    if (!audioMission) throw Error('No se encontró el audio personal de este expediente.');
    const positions = shuffledPositions(nie);
    const totalSlides = challenges.length + 3; // presentación, 20 retos, reflexión y frase
    let done;
    try { done = new Set(JSON.parse(storage.get(progressKey) || '[]').filter(n => Number.isInteger(n) && n >= 0 && n < 20)); }
    catch (_) { done = new Set(); }
    const partialMatches = new Map();
    let current = Math.min(totalSlides - 1, Math.max(0, Number(storage.get(slideKey)) || 0));

    app.innerHTML = `<div class="deck"><main id="stage" class="stage" aria-live="polite"></main><nav class="deck-nav" aria-label="Navegación de la actividad"><button id="prev-slide" type="button" class="nav-button nav-back">← Anterior</button><div class="deck-progress"><div id="slide-counter" class="slide-counter"></div><div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div><div id="challenge-counter" class="challenge-counter"></div></div><button id="next-slide" type="button" class="nav-button nav-next">Siguiente →</button></nav></div>`;
    const stage = document.getElementById('stage');
    document.getElementById('prev-slide').addEventListener('click', () => go(current - 1));
    document.getElementById('next-slide').addEventListener('click', () => go(current + 1));

    function go(index) {
      current = Math.max(0, Math.min(totalSlides - 1, index));
      storage.set(slideKey, String(current));
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateNav() {
      document.getElementById('prev-slide').disabled = current === 0;
      document.getElementById('next-slide').disabled = current === totalSlides - 1;
      document.getElementById('slide-counter').textContent = `Pantalla ${current + 1} de ${totalSlides}`;
      document.getElementById('challenge-counter').textContent = `${done.size} de 20 retos completados`;
      document.getElementById('progress-fill').style.width = `${done.size * 5}%`;
    }

    function render() {
      if (current === 0) renderIntro();
      else if (current <= 20) renderChallenge(current - 1);
      else if (current === 21) renderReflection();
      else renderFinal();
      updateNav();
    }

    function renderIntro() {
      const firstSeen = storage.get(`mystery-p4:first:${nie}`) === '1';
      stage.innerHTML = `<section class="intro-slide"><div class="intro-orb intro-orb-one"></div><div class="intro-orb intro-orb-two"></div><div class="eyebrow">TOP SECRET · ENGLISH P4 · SEGUNDO AÑO</div><h1>The Mystery<br>Phrase</h1><p class="intro-lead">Una frase de <strong>21 palabras</strong> está escondida en tu álbum. Tú puedes descubrirla.</p><div class="intro-student">Expediente de ${escape(student.name)} · ${escape(nie)}</div><div class="intro-steps"><div><span>01</span><p>Abre el sobre y escanea el QR que está dentro del álbum para obtener la primera palabra.</p></div><div><span>02</span><p>Avanza por las pantallas. Resuelve 20 retos de presente perfecto y anota cada palabra en el número que indique la web.</p></div><div><span>03</span><p>Ordena la frase, escribe tres experiencias propias y entrega tu álbum al docente.</p></div></div><div class="intro-note">${firstSeen ? '✓ Ya encontraste la palabra 01 con el QR interior.' : 'Primero busca la palabra 01 en el QR interior de tu álbum.'} Puedes volver a cualquier reto; las pistas y los reintentos no descuentan puntos.</div><button id="begin" type="button" class="begin-button">Comenzar misión →</button></section>`;
      document.getElementById('begin').addEventListener('click', () => go(1));
    }

    function chapterNumber(index) { return Math.floor(index / 5) + 1; }
    function feedback(message, good = false) {
      const el = stage.querySelector('.feedback');
      el.textContent = message;
      el.className = `feedback ${good ? 'good' : 'try'}`;
    }
    function finish(index) {
      done.add(index);
      storage.set(progressKey, JSON.stringify([...done]));
      render();
      window.rigo?.cheer?.();
    }

    function renderChallenge(index) {
      const challenge = challenges[index];
      const completed = done.has(index);
      stage.innerHTML = `<article class="exercise-slide chapter-${chapterNumber(index)} ${completed ? 'completed' : ''}" data-index="${index}"><div class="exercise-top"><span class="chapter-pill">Capítulo ${chapterNumber(index)} · ${escape(challenge.chapter)}</span><span class="exercise-count">RETO ${String(index + 1).padStart(2, '0')} / 20</span></div><h2>${escape(challenge.title)}</h2><p class="exercise-prompt">${escape(challenge.prompt)}</p><div class="exercise-body"></div><div class="feedback" role="status"></div></article>`;
      const body = stage.querySelector('.exercise-body');
      if (completed) {
        if (challenge.type === 'audio') body.innerHTML = `<audio controls preload="none" src="${escape(audioMission.file)}" aria-label="Reproducir el audio de esta actividad"></audio>`;
        if (challenge.type === 'match') body.innerHTML = '<div class="complete-mark">✓ Las tres imágenes están relacionadas correctamente.</div>';
        const explanation = challenge.type === 'audio' ? `Escuchaste el participio ${audioMission.answer}.` : challenge.explanation;
        feedback(explanation, true);
        const reward = document.createElement('div');
        reward.className = 'reward';
        reward.innerHTML = `Álbum ${String(positions[index]).padStart(2, '0')} → <strong>${escape(tokens[positions[index] - 1].toUpperCase())}</strong>`;
        stage.querySelector('.exercise-slide').appendChild(reward);
        return;
      }
      if (challenge.type === 'match') renderMatch(body, challenge, index);
      else if (challenge.type === 'audio') renderAudio(body, challenge, index);
      else if (challenge.type === 'choice') renderChoice(body, challenge, index);
      else renderInput(body, challenge, index);
      const hint = document.createElement('button');
      hint.type = 'button'; hint.className = 'hint-btn'; hint.textContent = '💡 Necesito una pista';
      hint.addEventListener('click', () => { feedback(challenge.hint); window.rigo?.say?.(challenge.hint, 4500); });
      stage.querySelector('.exercise-slide').appendChild(hint);
    }

    function submitAnswer(value, answer, challenge, index) {
      const accepted = [answer, ...(challenge.also || [])].map(normalize);
      if (accepted.includes(normalize(value))) finish(index);
      else { feedback(`Todavía no. Pista: ${challenge.hint}`); window.rigo?.comfort?.(); }
    }

    function renderChoice(body, challenge, index) {
      const group = document.createElement('div'); group.className = 'answer-options';
      challenge.options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'option'; button.textContent = option;
        button.addEventListener('click', () => submitAnswer(option, challenge.answer, challenge, index));
        group.appendChild(button);
      });
      body.appendChild(group);
    }

    function renderInput(body, challenge, index) {
      const form = document.createElement('form'); form.className = 'answer-row';
      form.innerHTML = '<input aria-label="Tu respuesta en inglés" autocomplete="off" spellcheck="false" required placeholder="Escribe el participio"><button class="check-button" type="submit">Revisar</button>';
      form.addEventListener('submit', event => { event.preventDefault(); submitAnswer(form.querySelector('input').value, challenge.answer, challenge, index); });
      body.appendChild(form);
    }

    function renderAudio(body, challenge, index) {
      const player = document.createElement('div'); player.className = 'audio-player';
      player.innerHTML = `<div class="audio-icon" aria-hidden="true">♪</div><div><strong>Escucha con atención</strong><p>Reproduce el audio y toca la palabra que oyes.</p></div><audio controls preload="none" src="${escape(audioMission.file)}" aria-label="Reproducir el participio"></audio>`;
      body.appendChild(player);
      const group = document.createElement('div'); group.className = 'audio-options';
      challenge.options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'option'; button.textContent = option;
        button.addEventListener('click', () => submitAnswer(option, audioMission.answer, challenge, index));
        group.appendChild(button);
      });
      body.appendChild(group);
    }

    function renderMatch(body, challenge, index) {
      const pairs = challenge.pairs;
      const matched = partialMatches.get(index) || new Set();
      partialMatches.set(index, matched);
      const imageOrder = index < 10 ? [0, 1, 2] : [2, 0, 1];
      const sentenceOrder = index < 10 ? [2, 0, 1] : [1, 2, 0];
      let selected = null;
      const grid = document.createElement('div'); grid.className = 'match-layout';
      const images = document.createElement('div'); images.className = 'match-images';
      const targets = document.createElement('div'); targets.className = 'match-sentences';
      imageOrder.forEach((pairIndex, displayIndex) => {
        const pair = pairs[pairIndex];
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'image-tile' + (matched.has(pair.id) ? ' matched' : '');
        button.draggable = !matched.has(pair.id); button.disabled = matched.has(pair.id);
        button.dataset.pair = pair.id;
        button.innerHTML = `<img src="${escape(pair.image)}" alt="${escape(pair.alt)}"><span>Imagen ${'ABC'[displayIndex]}${matched.has(pair.id) ? ' ✓' : ''}</span>`;
        button.addEventListener('click', () => {
          selected = pair.id;
          images.querySelectorAll('.image-tile').forEach(tile => tile.classList.toggle('selected', tile.dataset.pair === selected));
          feedback('Imagen elegida. Ahora toca la oración que corresponde.');
        });
        button.addEventListener('dragstart', event => { selected = pair.id; event.dataTransfer.setData('text/plain', pair.id); });
        images.appendChild(button);
      });
      sentenceOrder.forEach(pairIndex => {
        const pair = pairs[pairIndex];
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'sentence-target' + (matched.has(pair.id) ? ' matched' : '');
        button.disabled = matched.has(pair.id);
        button.innerHTML = `<span class="target-icon">${matched.has(pair.id) ? '✓' : '↳'}</span><span>${escape(pair.sentence)}</span>`;
        const tryMatch = imageId => {
          if (!imageId) { feedback('Primero toca o arrastra una imagen.'); return; }
          if (imageId !== pair.id) { feedback('Esa imagen no corresponde. Observa la acción e intenta otra vez.'); window.rigo?.comfort?.(); return; }
          matched.add(pair.id);
          if (matched.size === pairs.length) finish(index);
          else { renderChallenge(index); feedback(`¡Bien! ${matched.size} de 3 imágenes relacionadas.`, true); }
        };
        button.addEventListener('click', () => tryMatch(selected));
        button.addEventListener('dragover', event => event.preventDefault());
        button.addEventListener('drop', event => { event.preventDefault(); tryMatch(event.dataTransfer.getData('text/plain') || selected); });
        targets.appendChild(button);
      });
      grid.append(images, targets);
      body.appendChild(grid);
      const note = document.createElement('p'); note.className = 'match-note'; note.textContent = 'En celular: toca una imagen y luego su oración. En computadora: también puedes arrastrarla.';
      body.appendChild(note);
    }

    function renderReflection() {
      stage.innerHTML = `<section class="reflection-slide"><div class="eyebrow">TU HISTORIA TAMBIÉN CUENTA</div><h2>Tres experiencias tuyas</h2><p>Escribe ideas verdaderas. Usa <strong>have/has + participio</strong> y cópialas a la segunda página del álbum.</p><label>1. I have…<textarea data-reflection="0" placeholder="I have visited…"></textarea></label><label>2. I have never…<textarea data-reflection="1" placeholder="I have never…"></textarea></label><label>3. Have you ever…? <small>Pregunta para un compañero</small><textarea data-reflection="2" placeholder="Have you ever…?"></textarea></label><p class="privacy-note">Tus borradores quedan guardados únicamente en este navegador. El docente revisa lo que escribas en el álbum.</p></section>`;
      let saved = [];
      try { saved = JSON.parse(storage.get(reflectionKey) || '[]'); } catch (_) {}
      stage.querySelectorAll('[data-reflection]').forEach(area => {
        area.value = saved[Number(area.dataset.reflection)] || '';
        area.addEventListener('input', () => storage.set(reflectionKey, JSON.stringify([...stage.querySelectorAll('[data-reflection]')].map(el => el.value))));
      });
    }

    function renderFinal() {
      stage.innerHTML = `<section class="final-slide"><div class="eyebrow">ÚLTIMA PANTALLA</div><h2>La frase misteriosa</h2><p>Lee las 21 palabras de tu álbum en orden y escribe aquí la frase completa.</p><textarea id="final-input" class="final-input" placeholder="Escribe la frase completa…"></textarea><button class="check-button" id="check-final" type="button">Comprobar frase</button><div class="feedback" id="final-feedback" role="status"></div><div class="final-stamp" aria-hidden="true">✦</div></section>`;
      document.getElementById('check-final').addEventListener('click', () => {
        if (done.size !== 20) { feedback('Resuelve los veinte retos y completa la palabra 01 con el QR interior.'); return; }
        const typed = words(document.getElementById('final-input').value).map(normalize);
        const target = tokens.map(normalize);
        const correct = typed.length === target.length && typed.every((word, i) => word === target[i]);
        feedback(correct ? '¡Misión completa! Entrega tu álbum con la frase y tus tres oraciones.' : 'El orden todavía no coincide. Revisa los números del álbum y vuelve a intentarlo.', correct);
        if (correct) window.rigo?.say?.('¡Misión completa! Tu historia también merece ser contada.', 5000);
      });
    }

    render();
  }

  start().catch(error => { app.innerHTML = `<div class="panel error"><h1>No se pudo abrir el expediente</h1><p>${escape(error.message)}</p></div>`; });
})();
