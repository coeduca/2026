(() => {
  'use strict';

  const STORAGE_KEY = 'web_rrompt_builder_v1';

  const form = document.getElementById('profileForm');
  const fullName = document.getElementById('fullName');
  const age = document.getElementById('age');
  const nie = document.getElementById('nie');
  const institution = document.getElementById('institution');
  const grade = document.getElementById('grade');
  const aboutMe = document.getElementById('aboutMe');
  const customHobbies = document.getElementById('customHobbies');
  const aboutCount = document.getElementById('aboutCount');
  const presets = [...document.querySelectorAll('.preset')];
  const promptOutput = document.getElementById('promptOutput');
  const copyButton = document.getElementById('copyButton');
  const copyLabel = document.getElementById('copyLabel');
  const resetButton = document.getElementById('resetButton');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const progressHint = document.getElementById('progressHint');
  const saveStatus = document.getElementById('saveStatus');

  let selectedHobbies = new Set();
  let saveTimer = null;
  let hasWelcomed = false;

  const clean = (value) => value.trim().replace(/\s+/g, ' ');

  const escapePromptValue = (value) => clean(value).replace(/[<>]/g, '');

  function currentData() {
    return {
      fullName: clean(fullName.value),
      age: clean(age.value),
      nie: clean(nie.value),
      institution: clean(institution.value),
      grade: grade.value,
      aboutMe: aboutMe.value.trim(),
      hobbies: [...selectedHobbies],
      customHobbies: clean(customHobbies.value)
    };
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData()));
      saveStatus.textContent = 'Guardado automático ✓';
      saveStatus.classList.remove('saving');
    } catch (error) {
      saveStatus.textContent = 'No se pudo guardar';
      saveStatus.classList.remove('saving');
    }
  }

  function queueSave() {
    saveStatus.textContent = 'Guardando…';
    saveStatus.classList.add('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveData, 250);
  }

  function restoreData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      fullName.value = data.fullName || '';
      age.value = data.age || '';
      nie.value = data.nie || '';
      institution.value = data.institution || '';
      grade.value = data.grade || '';
      aboutMe.value = data.aboutMe || '';
      customHobbies.value = data.customHobbies || '';
      selectedHobbies = new Set(Array.isArray(data.hobbies) ? data.hobbies : []);

      presets.forEach((button) => {
        button.classList.toggle('active', selectedHobbies.has(button.dataset.value));
        button.setAttribute('aria-pressed', String(selectedHobbies.has(button.dataset.value)));
      });
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function hobbiesText(data) {
    const all = [...data.hobbies];
    if (data.customHobbies) all.push(data.customHobbies);
    return all.length ? all.join(', ') : '[Add hobbies and interests here]';
  }

  function buildPrompt(data) {
    const name = escapePromptValue(data.fullName) || '[Student full name]';
    const studentAge = escapePromptValue(data.age) || '[Age]';
    const studentNie = escapePromptValue(data.nie) || '[NIE]';
    const school = escapePromptValue(data.institution) || '[Educational institution]';
    const studentGrade = escapePromptValue(data.grade) || '[Grade]';
    const about = data.aboutMe.trim() || '[Short personal description]';
    const interests = hobbiesText(data);

    return `Create a complete personal presentation website for a student and make it ready to publish with GitHub Pages.

STUDENT INFORMATION
- Full name: ${name}
- Age: ${studentAge}
- NIE: ${studentNie}
- Educational institution: ${school}
- Grade: ${studentGrade}
- About me: ${about}
- Interests and hobbies: ${interests}

WEBSITE GOAL
Build a friendly, modern, youthful personal presentation page that works like a digital introduction wall. The visitor should quickly understand who the student is, where they study, and what they enjoy.

REQUIRED CONTENT
1. A strong hero section with the student's full name and grade.
2. A profile photo using exactly this relative path: perfil.jpg
3. A clear personal information area that includes the student's age, educational institution, and grade.
4. Treat the NIE as private student information: keep it available in the project only if needed for the assignment, but do not display the full NIE publicly on the GitHub Pages website.
5. An "About Me" section based only on the information provided above. Do not invent personal facts.
6. An "Interests & Hobbies" section that presents the student's interests in an attractive visual way.
7. The educational institution should appear clearly but naturally.
8. A short positive closing section or footer.

DESIGN REQUIREMENTS
- Make the design visually attractive, youthful, clean, and suitable for a student portfolio.
- Use responsive design so it looks excellent on phones and computers.
- Use semantic HTML and accessible contrast.
- Make the profile image look intentional and prominent.
- Add tasteful cards, badges, shapes, or decorative details without making the page crowded.
- Use only HTML and CSS. Do not use frameworks.
- Do not require external JavaScript.
- Do not use placeholder stock photos. The student's photo is already located at perfil.jpg.
- Add a useful alt attribute to the profile image using the student's name.

FILES TO CREATE
Create exactly these two files:
1. index.html
2. styles.css

The HTML must link to styles.css using a relative path, and all paths must work on GitHub Pages.

OUTPUT
If your interface can create downloadable files, provide index.html and styles.css as downloadable files. Otherwise, return the complete code in two separate, clearly labeled code blocks: first index.html and then styles.css. Do not omit any code and do not replace sections with comments such as "same as above".`;
  }

  function completionState(data) {
    const checks = [
      Boolean(data.fullName),
      Boolean(data.age),
      Boolean(data.nie),
      Boolean(data.institution),
      Boolean(data.grade),
      data.aboutMe.trim().length >= 20,
      data.hobbies.length > 0 || Boolean(data.customHobbies)
    ];

    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  function updateProgress(data) {
    const progress = completionState(data);
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;

    if (progress === 100) {
      progressHint.textContent = '¡Listo! Tu prompt ya tiene todo lo necesario.';
      copyButton.disabled = false;
    } else if (progress >= 60) {
      progressHint.textContent = 'Casi listo. Completa los campos que faltan.';
      copyButton.disabled = true;
    } else if (progress >= 20) {
      progressHint.textContent = 'Vas bien. Cada detalle ayuda a la IA a entenderte mejor.';
      copyButton.disabled = true;
    } else {
      progressHint.textContent = 'Empieza con tu nombre. Rigo no juzga… mucho.';
      copyButton.disabled = true;
    }
  }

  function updateAll({ save = true } = {}) {
    const data = currentData();
    promptOutput.value = buildPrompt(data);
    aboutCount.textContent = aboutMe.value.length;
    updateProgress(data);

    if (window.rigo && data.grade) {
      window.rigo.setGrade(data.grade);
    }

    if (save) queueSave();
  }

  async function copyPrompt() {
    if (copyButton.disabled) {
      window.rigo?.setEmotion('thinking');
      window.rigo?.say('Completa todo primero y luego copiamos ✍️', 3500);
      return;
    }

    try {
      await navigator.clipboard.writeText(promptOutput.value);
    } catch (error) {
      promptOutput.focus();
      promptOutput.select();
      document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
    }

    copyButton.classList.add('copied');
    copyLabel.textContent = '¡Copiado!';
    window.rigo?.setEmotion('excited');
    window.rigo?.say('¡Prompt copiado! Ahora pásaselo a la IA 🚀', 4500);

    setTimeout(() => {
      copyButton.classList.remove('copied');
      copyLabel.textContent = 'Copiar prompt';
      window.rigo?.setEmotion('happy');
    }, 2200);
  }

  function resetData() {
    const confirmed = window.confirm('¿Borrar todos los datos guardados en este dispositivo?');
    if (!confirmed) return;

    form.reset();
    selectedHobbies.clear();
    presets.forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-pressed', 'false');
    });
    localStorage.removeItem(STORAGE_KEY);
    updateAll({ save: false });
    saveStatus.textContent = 'Datos borrados';
    window.rigo?.setEmotion('neutral');
    window.rigo?.say('Página limpia. Empezamos de nuevo 🧹', 3500);
  }

  presets.forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const value = button.dataset.value;
      if (selectedHobbies.has(value)) {
        selectedHobbies.delete(value);
      } else {
        selectedHobbies.add(value);
      }

      const active = selectedHobbies.has(value);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      updateAll();

      if (active && selectedHobbies.size === 1) {
        window.rigo?.setEmotion('happy');
        window.rigo?.say('Buen hobby 😎 Puedes elegir más de uno.', 3000);
      }
    });
  });

  [fullName, age, nie, institution, grade, aboutMe, customHobbies].forEach((field) => {
    field.addEventListener('input', () => updateAll());
    field.addEventListener('change', () => updateAll());
  });

  fullName.addEventListener('blur', () => {
    if (fullName.value.trim() && !hasWelcomed) {
      hasWelcomed = true;
      const firstName = clean(fullName.value).split(' ')[0];
      window.rigo?.setEmotion('welcome');
      window.rigo?.say(`¡Hola, ${firstName}! Vamos a construir tu prompt.`, 4200);
    }
  });

  aboutMe.addEventListener('focus', () => {
    window.rigo?.setEmotion('thinking');
    window.rigo?.say('Aquí escribe algo real sobre ti. La IA no necesita una novela 😌', 4200);
  });

  grade.addEventListener('change', () => {
    if (grade.value) {
      window.rigo?.setGrade(grade.value);
      window.rigo?.say(`${grade.value}: modo creador web activado 💻`, 3500);
    }
  });

  copyButton.addEventListener('click', copyPrompt);
  resetButton.addEventListener('click', resetData);

  window.addEventListener('DOMContentLoaded', () => {
    restoreData();
    updateAll({ save: false });

    setTimeout(() => {
      if (window.rigo) {
        window.rigo.setEmotion('welcome');
        window.rigo.say('¡Hola! Soy Rigo. Completa tus datos y yo cuido tu prompt 🦎', 6000);
      }
    }, 450);
  });
})();
