const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const nie = params.get('nie');
const slot = Number(params.get('reto'));
let data, student, emotion;

const route = (n, s) => `index.html?nie=${encodeURIComponent(n)}${s ? `&reto=${s}` : ''}`;
const key = (suffix) => `archivo-emociones-p4:${nie}:${suffix}`;
const saved = (suffix, fallback) => {
  try { return JSON.parse(localStorage.getItem(key(suffix))) ?? fallback; }
  catch { return fallback; }
};
const save = (suffix, value) => localStorage.setItem(key(suffix), JSON.stringify(value));
const mix = (items, shift) => items.map((_, i) => items[(i + shift) % items.length]);

async function start() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('No se pudieron cargar los expedientes.');
    data = await response.json();
    student = data.students[nie];
    if (!student) { renderPicker(); return; }
    document.documentElement.style.setProperty('--accent', student.pale);
    document.documentElement.style.setProperty('--pale', student.pale);
    $('#student-name').textContent = student.name;
    $('#student-id').textContent = `NIE ${nie}`;
    document.title = `${student.name.split(' ')[0]} · Archivo de emociones`;
    if (Number.isInteger(slot) && slot >= 1 && slot <= 8) renderChallenge();
    else renderMain();
  } catch (error) {
    $('#student-name').textContent = 'No pudimos abrir el archivo';
    $('#student-id').textContent = error.message;
  }
}

function renderPicker() {
  $('#student-name').textContent = 'Elige tu expediente';
  $('#picker').hidden = false;
  $('#student-list').innerHTML = Object.entries(data.students).map(([id, value]) =>
    `<a href="${route(id)}"><strong>${value.name}</strong><small>NIE ${id}</small></a>`).join('');
}

function renderMain() {
  $('#main-board').hidden = false;
  const codes = saved('entered', Array(8).fill(''));
  const completed = saved('completed', []);
  $('#code-grid').innerHTML = student.emotions.map((emotionId, index) => `
    <article class="code-card" data-slot="${index + 1}">
      <div class="card-inner">
        <div class="card-face card-front">
          <div class="card-top"><span class="slot-num">${String(index + 1).padStart(2, '0')}</span><span aria-hidden="true">✦</span></div>
          <span class="card-mystery" aria-hidden="true">?</span>
          <h3>Carta por descubrir</h3>
          <div class="card-entry"><label for="code-${index}">CÓDIGO ${index + 1}</label>
          <input id="code-${index}" inputmode="text" maxlength="3" autocomplete="off" spellcheck="false" aria-label="Código de la carta ${index + 1}" value="${codes[index] || ''}" placeholder="A00"></div>
          <a class="route-link" href="${route(nie, index + 1)}">${completed.includes(index + 1) ? '↗ VER RETO' : '↗ ABRIR RETO'}</a>
        </div>
        <div class="card-face card-back" aria-hidden="true" inert>
          <span class="card-back-label">CARTA ${String(index + 1).padStart(2, '0')} · ${data.emotions[emotionId].kind.toUpperCase()}</span>
          <span class="emotion-icon" role="img" aria-label="${data.emotions[emotionId].name}">${data.emotions[emotionId].icon}</span>
          <h3>${data.emotions[emotionId].name}</h3>
          <span class="card-code">${student.codes[index]}</span>
          <button class="flip-back" type="button" aria-label="Editar código de la carta ${index + 1}">EDITAR CÓDIGO ↶</button>
        </div>
      </div>
    </article>`).join('');
  $('#code-grid').addEventListener('input', (event) => {
    if (!event.target.matches('input')) return;
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    const values = [...document.querySelectorAll('.code-card input')].map(input => input.value);
    save('entered', values);
    const card = event.target.closest('.code-card');
    const index = Number(card.dataset.slot) - 1;
    checkCodes(true);
    if (values[index] === student.codes[index]) {
      event.target.blur();
      $('#code-message').textContent = values.every((value, i) => value === student.codes[i])
        ? '¡Revelaste las ocho cartas! Tu álbum final está disponible abajo.'
        : `¡Carta ${index + 1} revelada! Ya puedes ver su emoción.`;
    } else if (values[index].length === 3) {
      card.classList.add('invalid');
      $('#code-message').textContent = `El código de la carta ${index + 1} no coincide. Revísalo en tu álbum.`;
    } else {
      $('#code-message').textContent = 'Escribe el código de tres caracteres que obtuviste en el reto.';
    }
  });
  $('#code-grid').addEventListener('click', (event) => {
    const button = event.target.closest('.flip-back');
    if (!button) return;
    const input = button.closest('.code-card').querySelector('input');
    input.value = '';
    save('entered', [...document.querySelectorAll('.code-card input')].map(field => field.value));
    checkCodes(true);
    input.focus();
    $('#code-message').textContent = 'Escribe de nuevo el código de esta carta.';
  });
  $('#check-codes').addEventListener('click', () => checkCodes(false));
  checkCodes(true);
}

function checkCodes(quiet) {
  const values = [...document.querySelectorAll('.code-card input')].map(input => input.value.trim().toUpperCase());
  const correct = values.map((value, i) => value === student.codes[i]);
  document.querySelectorAll('.code-card').forEach((card, i) => {
    card.classList.toggle('valid', correct[i]);
    card.classList.toggle('flipped', correct[i]);
    card.classList.toggle('invalid', !correct[i] && values[i].length === 3 && !quiet);
    card.querySelector('.card-front').inert = correct[i];
    card.querySelector('.card-front').setAttribute('aria-hidden', String(correct[i]));
    card.querySelector('.card-back').inert = !correct[i];
    card.querySelector('.card-back').setAttribute('aria-hidden', String(!correct[i]));
  });
  const count = correct.filter(Boolean).length;
  $('#progress-count').textContent = `${count} / 8`;
  $('#progress-fill').style.width = `${count * 12.5}%`;
  if (count === 8) {
    $('#code-message').textContent = '¡Encontraste los ocho códigos!';
    $('#pdf-link').href = `revelacion/album-${nie}.pdf`;
    $('#final-reveal').hidden = false;
    if (!quiet) $('#final-reveal').scrollIntoView({behavior: 'smooth', block: 'nearest'});
  } else {
    $('#final-reveal').hidden = true;
    if (!quiet) $('#code-message').textContent = `Tienes ${count} de 8 códigos correctos. Revisa las casillas marcadas y termina los retos que faltan.`;
  }
}

function renderChallenge() {
  document.body.classList.add('challenge-mode');
  $('#challenge').hidden = false;
  $('#back-link').href = route(nie);
  $('#challenge-count').textContent = `RETO ${String(slot).padStart(2, '0')} / 08`;
  emotion = data.emotions[student.emotions[slot - 1]];
  if (saved('completed', []).includes(slot)) { revealCard(); return; }
  const renderers = [gameName, gameSignal, gameChoice, gameSequence, gameMyth, gameTraffic, gamePairs, gamePromise];
  renderers[slot - 1]();
}

function gameShell(label, title, instructions, extra = '') {
  $('#challenge-content').innerHTML = `<span class="challenge-kicker">${label}</span><h2>${title}</h2><p>${instructions}</p>${extra}<div id="game-body"></div><p id="feedback" class="feedback" role="status" aria-live="polite"></p>`;
}

function feedback(message, good = false) {
  const el = $('#feedback');
  el.textContent = message;
  el.className = `feedback ${good ? 'good' : 'bad'}`;
}

function choices(options, right, onRight = revealCard) {
  const wrap = document.createElement('div');
  wrap.className = 'options';
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.textContent = option;
    button.addEventListener('click', () => {
      if (index === right) {
        button.classList.add('correct');
        feedback('¡Bien pensado! Carta desbloqueada.', true);
        wrap.querySelectorAll('button').forEach(b => b.disabled = true);
        setTimeout(onRight, 650);
      } else {
        button.classList.add('wrong');
        feedback('Piénsalo de nuevo. Puedes intentarlo sin perder puntos.');
        setTimeout(() => button.classList.remove('wrong'), 650);
      }
    });
    wrap.append(button);
  });
  $('#game-body').append(wrap);
}

function otherEmotions() {
  return student.emotions.filter(id => id !== student.emotions[slot - 1]).slice(0, 2).map(id => data.emotions[id]);
}

function gameName() {
  gameShell('01 / DETECTIVE', '¿Qué emoción se esconde?', 'Lee la situación y elige la emoción que mejor la describe.', `<div class="scenario">${emotion.scenario}</div>`);
  const names = mix([emotion.name, ...otherEmotions().map(e => e.name)], 1);
  choices(names, names.indexOf(emotion.name));
}

function gameSignal() {
  gameShell('02 / RADAR CORPORAL', 'Escucha al cuerpo', 'Una emoción también puede dar señales físicas. ¿Qué señal encaja mejor con esta situación?', `<div class="scenario">${emotion.scenario}</div>`);
  const signals = mix([emotion.signal, ...otherEmotions().map(e => e.signal)], 2);
  choices(signals, signals.indexOf(emotion.signal));
}

function gameChoice() {
  gameShell('03 / DECISIÓN', 'Elige una respuesta que cuide', 'Puedes sentir cualquier emoción. Lo importante es elegir una acción respetuosa.', `<div class="scenario">${emotion.scenario}</div>`);
  const options = mix([emotion.helpful, 'Actuar de inmediato sin escuchar a nadie.', 'Burlarte o culpar a otra persona para sentirte mejor.'], 1);
  choices(options, options.indexOf(emotion.helpful));
}

function gameSequence() {
  gameShell('04 / RUTA DE LA PAUSA', 'Ordena tres pasos', 'Toca las tarjetas en el orden que te ayude a manejar una emoción intensa.', `<div class="scenario">${emotion.scenario}</div><div id="picked" class="steps-picked">Tu secuencia: —</div>`);
  const steps = ['Hago una pausa y respiro.', 'Reconozco lo que siento.', 'Elijo una acción respetuosa.'];
  let next = 0;
  const wrap = document.createElement('div'); wrap.className = 'sequence';
  [2, 0, 1].forEach(i => {
    const button = document.createElement('button'); button.className = 'sequence-button'; button.type = 'button'; button.textContent = steps[i];
    button.addEventListener('click', () => {
      if (i !== next) { feedback('Prueba de nuevo: comienza con una pausa antes de actuar.'); return; }
      button.disabled = true; button.classList.add('correct'); next++;
      $('#picked').textContent = `Tu secuencia: ${steps.slice(0, next).join(' → ')}`;
      if (next === 3) { feedback('¡Buena secuencia! Carta desbloqueada.', true); setTimeout(revealCard, 650); }
      else feedback('Bien. ¿Qué paso sigue?', true);
    }); wrap.append(button);
  });
  $('#game-body').append(wrap);
}

function gameMyth() {
  gameShell('05 / MITO O REALIDAD', 'Encuentra la idea equivocada', 'Piensa en la situación. Dos afirmaciones ayudan a comprender las emociones. Una puede causar daño. Selecciónala.', `<div class="scenario">${emotion.scenario}</div>`);
  const options = ['Todas las emociones pueden darnos información.', 'Podemos aprender a elegir cómo actuar cuando sentimos algo.', 'Sentir una emoción justifica lastimar a otra persona.'];
  choices(options, 2);
}

function gameTraffic() {
  gameShell('06 / SEMÁFORO', 'Del impulso a la decisión', 'Relaciona cada color con el paso adecuado antes de actuar.', `<div class="scenario">${emotion.scenario}</div>`);
  const values = ['Pauso y respiro', 'Identifico lo que siento', 'Actúo con respeto'];
  const wrap = document.createElement('div'); wrap.className = 'traffic';
  ['🔴 ROJO', '🟡 AMARILLO', '🟢 VERDE'].forEach((color, i) => {
    const label = document.createElement('label'); label.textContent = color;
    const select = document.createElement('select'); select.setAttribute('aria-label', `Paso para ${color}`);
    select.innerHTML = '<option value="">Elige una acción</option>' + values.map((v, j) => `<option value="${j}">${v}</option>`).join('');
    label.append(select); wrap.append(label);
  });
  $('#game-body').append(wrap);
  const button = document.createElement('button'); button.className = 'primary-button challenge-action'; button.type = 'button'; button.textContent = 'COMPROBAR SEMÁFORO';
  button.addEventListener('click', () => {
    if ([...wrap.querySelectorAll('select')].every((select, i) => Number(select.value) === i && select.value !== '')) { feedback('¡Elegiste una ruta respetuosa!', true); setTimeout(revealCard, 650); }
    else feedback('Revisa el orden: primero pausa, después nombra la emoción y finalmente decide.');
  }); $('#game-body').append(button);
}

function gamePairs() {
  gameShell('07 / CONEXIONES', 'Une la situación con la ayuda', 'Toca una situación y después la acción que corresponde. Completa los tres pares.', `<div class="scenario">${emotion.scenario}</div>`);
  const pairs = [
    ['Mi emoción es muy intensa.', 'Hago una pausa y respiro.'],
    ['No entiendo qué me pasa.', 'Pongo nombre a lo que siento.'],
    ['Necesito apoyo.', 'Hablo con alguien de confianza.']
  ];
  let picked = null; const matched = new Set();
  const wrap = document.createElement('div'); wrap.className = 'memory';
  [0, 1, 2, 3, 4, 5].forEach(n => {
    const id = n % 3, side = Math.floor(n / 3);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'memory-button'; button.textContent = pairs[id][side];
    button.addEventListener('click', () => {
      if (matched.has(id)) return;
      if (!picked) { if (side !== 0) { feedback('Empieza por una situación.'); return; } picked = {id, button}; button.classList.add('selected'); feedback('Ahora elige la ayuda que le corresponde.', true); return; }
      if (side === 0) { picked.button.classList.remove('selected'); picked = {id, button}; button.classList.add('selected'); return; }
      if (id === picked.id) {
        matched.add(id); button.classList.add('matched'); picked.button.classList.remove('selected'); picked.button.classList.add('matched'); picked = null;
        if (matched.size === 3) { feedback('¡Uniste los tres pares!', true); setTimeout(revealCard, 650); }
        else feedback(`${matched.size} de 3 pares correctos.`, true);
      } else { picked.button.classList.remove('selected'); picked = null; feedback('Ese par no corresponde. Inténtalo otra vez.'); }
    }); wrap.append(button);
  }); $('#game-body').append(wrap);
}

function gamePromise() {
  gameShell('08 / MI DECISIÓN', 'Piensa y escribe', 'Elige la mejor respuesta y escribe una acción concreta que tú podrías hacer.', `<div class="scenario">${emotion.scenario}</div>`);
  const helpful = emotion.helpful;
  const options = [helpful, 'Ignorar a todas las personas y ocultar lo que siento.', 'Responder de forma agresiva para acabar rápido.'];
  const wrap = document.createElement('div'); wrap.className = 'options'; let chosen = false;
  options.forEach((value, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'option'; b.textContent = value;
    b.addEventListener('click', () => { wrap.querySelectorAll('.option').forEach(x => x.classList.remove('correct', 'wrong')); b.classList.add(i === 0 ? 'correct' : 'wrong'); chosen = i === 0; feedback(chosen ? 'Ahora escribe tu propia acción.' : 'Busca una acción que te cuide y respete a los demás.', chosen); }); wrap.append(b);
  }); $('#game-body').append(wrap);
  const response = document.createElement('label'); response.className = 'response-box'; response.innerHTML = `<strong>¿Qué harías tú?</strong><textarea maxlength="400" placeholder="Yo podría..."></textarea>`; $('#game-body').append(response);
  const button = document.createElement('button'); button.className = 'primary-button challenge-action'; button.type = 'button'; button.textContent = 'GUARDAR MI DECISIÓN';
  button.addEventListener('click', () => { const text = response.querySelector('textarea').value.trim(); if (!chosen) { feedback('Primero elige la respuesta respetuosa.'); return; } if (text.length < 25) { feedback('Escribe al menos una oración completa sobre lo que harías.'); return; } save('my-decision', text); revealCard(); }); $('#game-body').append(button);
}

function revealCard() {
  const completed = saved('completed', []);
  if (!completed.includes(slot)) { completed.push(slot); save('completed', completed); }
  const code = student.codes[slot - 1];
  $('#challenge-content').innerHTML = `<div class="collectible"><div class="revealed-card"><small>CARTA ${String(slot).padStart(2, '0')} · ${emotion.kind}</small><span class="icon" aria-hidden="true">${emotion.icon}</span><strong>${emotion.name}</strong><small>ARCHIVO DE EMOCIONES</small></div><div class="reveal-copy"><span class="challenge-kicker">¡CARTA DESBLOQUEADA!</span><h2>${emotion.name}</h2><p>${emotion.definition}</p><p>Guarda este código en la casilla ${slot} de tu álbum de papel. Después, escríbelo en el tablero principal.</p><span class="reveal-code" aria-label="Código ${code}">${code}</span><br><a class="primary-button" href="${route(nie)}">ABRIR WEB PRINCIPAL →</a></div></div>`;
}

start();
