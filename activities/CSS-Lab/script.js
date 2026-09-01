/*
 * CSS Lab
 * Aplicación estática educativa: HTML + CSS + JavaScript vanilla.
 * Las lecciones viven en el arreglo LESSONS para que sea sencillo agregar más.
 */

const LESSONS = [
  {
    id: "lesson-1",
    number: 1,
    kind: "lesson",
    title: "Colores y texto",
    description: "Experimenta con colores, tamaño, grosor y alineación sin empezar desde cero.",
    properties: ["color", "background-color", "font-size", "font-weight", "text-align"],
    mission: [
      "Cambia el color del título.",
      "Haz el párrafo más grande.",
      "Prueba un fondo diferente en la tarjeta.",
      "Cambia la alineación del texto.",
      "Prueba un grosor distinto en el subtítulo."
    ],
    hint: "Busca color, font-size y text-align en el CSS. Cambia un valor cada vez para notar mejor el efecto.",
    tryNext: "Prueba un color que conozcas por nombre, como tomato, teal, gold o purple.",
    quick: {
      title: "Tamaño del título",
      selector: ".demo-title",
      property: "font-size",
      values: ["24px", "32px", "44px", "60px"]
    },
    html: `<!-- ✏️ También puedes cambiar el texto entre las etiquetas -->
<section class="text-card">
  <p class="eyebrow-demo">MI PRIMER CSS</p>
  <h1 class="demo-title">Explorar cambia todo</h1>
  <h2 class="demo-subtitle">Un cambio pequeño puede verse enorme</h2>
  <p class="demo-text">
    Edita el CSS de la izquierda y observa esta tarjeta en tiempo real.
  </p>
</section>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background-color: #f3f6fb;
  font-family: Arial, sans-serif;
}

.text-card {
  width: 75%;
  max-width: 520px;
  padding: 32px;
  border-radius: 22px;
  background-color: white; /* 🎨 Cambia este fondo */
  box-shadow: 0 18px 40px rgba(27, 39, 68, 0.12);
  text-align: left; /* ↔️ Prueba center o right */
}

.eyebrow-demo {
  margin: 0 0 10px;
  color: #6a5acd;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
}

.demo-title {
  margin: 0;
  color: #17233c; /* 🎨 Prueba otro color */
  font-size: 44px; /* 📏 Prueba 24px, 32px o 60px */
  line-height: 1.05;
}

.demo-subtitle {
  margin: 16px 0 8px;
  color: #536078;
  font-size: 20px;
  font-weight: 600; /* 💪 Prueba 400, 700 o 900 */
}

.demo-text {
  margin: 0;
  color: #6b7280;
  font-size: 17px;
  line-height: 1.6;
}`
  },
  {
    id: "lesson-2",
    number: 2,
    kind: "lesson",
    title: "Modelo de caja",
    description: "Descubre cómo margin, border y padding rodean al contenido.",
    properties: ["width", "height", "padding", "margin", "border", "border-radius"],
    mission: [
      "Aumenta el padding de la caja de contenido.",
      "Haz el borde más grueso.",
      "Prueba un margin mayor o menor.",
      "Cambia el border-radius.",
      "Modifica el ancho y observa cuánto espacio ocupa."
    ],
    hint: "Piensa desde afuera hacia adentro: margin → border → padding → content.",
    tryNext: "Haz una caja casi cuadrada y luego conviértela en una caja muy redondeada.",
    quick: {
      title: "Esquinas de la caja",
      selector: ".content-box",
      property: "border-radius",
      values: ["0px", "10px", "24px", "50px"]
    },
    html: `<main class="stage">
  <div class="legend">
    <span class="margin-key">MARGIN</span>
    <span class="border-key">BORDER</span>
    <span class="padding-key">PADDING</span>
    <span class="content-key">CONTENT</span>
  </div>

  <div class="margin-box">
    <div class="content-box">
      <strong>CONTENT</strong>
      <span>Este texto vive dentro del padding.</span>
    </div>
  </div>

  <p class="tip">MARGIN → BORDER → PADDING → CONTENT</p>
</main>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f5f7fb;
  font-family: Arial, sans-serif;
  color: #1f2937;
}

.stage {
  width: min(90%, 650px);
  text-align: center;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 18px;
}

.legend span {
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.margin-key { background: #ffe2b8; }
.border-key { background: #ffd1d1; }
.padding-key { background: #ccebdc; }
.content-key { background: #cfe3ff; }

.margin-box {
  width: 360px; /* 📏 Cambia el ancho */
  margin: 40px auto; /* 🟠 Espacio exterior */
  padding: 28px;
  background: #ffe2b8;
  outline: 2px dashed #d18b26;
}

.content-box {
  min-height: 130px;
  padding: 34px; /* 🟢 Espacio entre borde y contenido */
  border: 10px solid #e56b6f; /* 🔴 Prueba 2px o 18px */
  border-radius: 24px; /* 🔵 ¿Qué pasa si llega a 50px? */
  background: #dcecff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.content-box strong {
  font-size: 26px;
}

.content-box span,
.tip {
  color: #536078;
}

.tip {
  font-weight: 700;
}`
  },
  {
    id: "lesson-3",
    number: 3,
    kind: "lesson",
    title: "Tarjetas",
    description: "Transforma un conjunto de cards modificando fondo, espacio, borde y sombra.",
    properties: ["background", "padding", "border-radius", "box-shadow", "border"],
    mission: [
      "Cambia el fondo de las tarjetas.",
      "Aumenta o reduce el padding.",
      "Haz las esquinas más redondeadas.",
      "Modifica la sombra.",
      "Cambia el estilo del botón de una tarjeta."
    ],
    hint: "Busca .card. Casi toda la apariencia principal está concentrada en ese selector.",
    tryNext: "Intenta crear una versión sin sombra: cambia box-shadow por none.",
    quick: {
      title: "Redondeado de las cards",
      selector: ".card",
      property: "border-radius",
      values: ["0px", "12px", "24px", "40px"]
    },
    html: `<section class="cards">
  <article class="card">
    <div class="icon">🎧</div>
    <h2>Música</h2>
    <p>Una tarjeta puede agrupar información relacionada.</p>
    <button>Explorar</button>
  </article>

  <article class="card">
    <div class="icon">📚</div>
    <h2>Lectura</h2>
    <p>Prueba cambiar colores, bordes y espacios.</p>
    <button>Explorar</button>
  </article>

  <article class="card">
    <div class="icon">💻</div>
    <h2>Tecnología</h2>
    <p>Observa cómo una regla afecta varias tarjetas a la vez.</p>
    <button>Explorar</button>
  </article>
</section>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #edf2f7;
  font-family: Arial, sans-serif;
  color: #17233c;
}

.cards {
  width: min(92%, 880px);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.card {
  background: white; /* 🎨 Prueba #fff7ed o #eef9ff */
  padding: 26px; /* 📏 Prueba 14px o 40px */
  border: 1px solid #dbe3ef;
  border-radius: 24px; /* 🔵 Cambia la forma */
  box-shadow: 0 14px 28px rgba(31, 41, 55, 0.10); /* 🌫️ Prueba none */
}

.icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: #eef0ff;
  font-size: 27px;
}

.card h2 {
  margin: 18px 0 8px;
}

.card p {
  min-height: 66px;
  margin: 0 0 18px;
  color: #657084;
  line-height: 1.45;
}

.card button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  background: #5b5bd6;
  color: white;
  font-weight: 700;
}

@media (max-width: 680px) {
  .cards {
    grid-template-columns: 1fr;
    padding: 24px 0;
  }
}`
  },
  {
    id: "lesson-4",
    number: 4,
    kind: "lesson",
    title: "Botones",
    description: "Personaliza botones y descubre cómo :hover cambia su estado al pasar el cursor.",
    properties: ["background-color", "color", "border", "border-radius", "padding", "font-size", ":hover"],
    mission: [
      "Cambia el color principal del botón.",
      "Prueba un borde visible.",
      "Haz un botón tipo píldora con border-radius.",
      "Aumenta el padding.",
      "Cambia el estilo del botón al hacer hover."
    ],
    hint: "El selector .primary:hover solo se aplica cuando el puntero está sobre ese botón.",
    tryNext: "Prueba un hover que cambie solo el color, y luego uno que también mueva el botón.",
    quick: {
      title: "Forma del botón principal",
      selector: ".primary",
      property: "border-radius",
      values: ["0px", "8px", "18px", "999px"]
    },
    html: `<section class="button-demo">
  <h1>Botones con personalidad</h1>
  <p>Pasa el cursor sobre ellos y luego cambia sus reglas.</p>

  <div class="button-row">
    <button class="primary">Guardar</button>
    <button class="secondary">Cancelar</button>
    <button class="outline">Más información</button>
  </div>
</section>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f6f8fc;
  font-family: Arial, sans-serif;
  color: #17233c;
}

.button-demo {
  width: min(88%, 620px);
  padding: 36px;
  border-radius: 24px;
  background: white;
  text-align: center;
}

.button-demo p {
  color: #667085;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 26px;
}

button {
  cursor: pointer;
  font-size: 16px; /* 🔤 Prueba 12px o 20px */
  font-weight: 700;
  padding: 12px 18px; /* 📏 Hazlos más grandes */
  transition: 0.2s ease;
}

.primary {
  background-color: #5b5bd6; /* 🎨 Cambia este color */
  color: white;
  border: 2px solid #5b5bd6;
  border-radius: 18px; /* 🔵 Prueba 999px */
}

.primary:hover {
  background-color: #3838a8; /* 🖱️ Solo aparece al pasar el cursor */
  transform: translateY(-3px);
}

.secondary {
  background-color: #e7f8f2;
  color: #187b57;
  border: 2px solid transparent;
  border-radius: 18px;
}

.outline {
  background-color: transparent;
  color: #334155;
  border: 2px solid #aeb9c8;
  border-radius: 18px;
}`
  },
  {
    id: "lesson-5",
    number: 5,
    kind: "lesson",
    title: "Flexbox",
    description: "Mueve elementos con flex-direction, justify-content, align-items y gap.",
    properties: ["display: flex", "flex-direction", "justify-content", "align-items", "gap"],
    mission: [
      "Cambia flex-direction de row a column.",
      "Prueba justify-content: center y space-between.",
      "Cambia align-items.",
      "Aumenta el gap entre cajas.",
      "Combina dos propiedades y observa el resultado."
    ],
    hint: "El contenedor .flex-playground controla la posición de todas las cajas de colores.",
    tryNext: "Usa column y luego cambia justify-content. Nota que el eje principal también cambia.",
    quick: {
      title: "Dirección de Flexbox",
      selector: ".flex-playground",
      property: "flex-direction",
      values: ["row", "column", "row-reverse", "column-reverse"]
    },
    html: `<section class="lesson-wrap">
  <h1>Flexbox Playground</h1>
  <p>Cambia las propiedades del contenedor y mira cómo viajan las cajas.</p>

  <div class="axis-note">CONTENEDOR FLEX</div>
  <div class="flex-playground">
    <div class="box one">1</div>
    <div class="box two">2</div>
    <div class="box three">3</div>
    <div class="box four">4</div>
  </div>
</section>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f5f7fb;
  font-family: Arial, sans-serif;
  color: #17233c;
}

.lesson-wrap {
  width: min(90%, 760px);
}

.lesson-wrap h1,
.lesson-wrap p {
  text-align: center;
}

.lesson-wrap p {
  color: #667085;
}

.axis-note {
  width: max-content;
  margin: 20px auto 8px;
  padding: 5px 9px;
  border-radius: 999px;
  background: #e9ecff;
  color: #5151b8;
  font-size: 12px;
  font-weight: 800;
}

.flex-playground {
  height: 360px;
  padding: 20px;
  border: 3px dashed #aab5c5;
  border-radius: 20px;
  background: white;

  display: flex; /* 🧩 Activa Flexbox */
  flex-direction: row; /* ↔️ Prueba column */
  justify-content: space-between; /* 🎯 Prueba center */
  align-items: center; /* ↕️ Prueba flex-start o flex-end */
  gap: 16px; /* 📏 Espacio entre elementos */
}

.box {
  width: 90px;
  height: 90px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: white;
  font-size: 28px;
  font-weight: 800;
  flex: 0 0 auto;
}

.one { background: #5b5bd6; }
.two { background: #e66a4e; }
.three { background: #1f9d7a; }
.four { background: #d49b22; }`
  },
  {
    id: "lesson-6",
    number: 6,
    kind: "lesson",
    title: "Tablas",
    description: "Cambia bordes, espacios, colores y alineación en una tabla sencilla.",
    properties: ["border", "padding", "background-color", "text-align", "border-collapse"],
    mission: [
      "Cambia el color del encabezado.",
      "Aumenta el padding de las celdas.",
      "Prueba border-collapse: separate.",
      "Cambia la alineación de una columna.",
      "Haz los bordes más visibles."
    ],
    hint: "th controla las celdas del encabezado; td controla las celdas de datos.",
    tryNext: "Prueba border-collapse: separate y agrega border-spacing: 8px a la tabla.",
    quick: {
      title: "Espacio de las celdas",
      selector: "th, td",
      property: "padding",
      values: ["6px", "12px", "20px", "28px"]
    },
    html: `<section class="table-card">
  <h1>Resultados del equipo</h1>
  <p>Edita la tabla desde el CSS.</p>

  <table>
    <thead>
      <tr>
        <th>Estudiante</th>
        <th>Proyecto</th>
        <th>Progreso</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Ana</td><td>Tarjetas</td><td>90%</td></tr>
      <tr><td>David</td><td>Flexbox</td><td>75%</td></tr>
      <tr><td>Sofía</td><td>Colores</td><td>100%</td></tr>
      <tr><td>Mateo</td><td>Botones</td><td>60%</td></tr>
    </tbody>
  </table>
</section>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #eef2f7;
  font-family: Arial, sans-serif;
  color: #17233c;
}

.table-card {
  width: min(90%, 720px);
  padding: 30px;
  border-radius: 22px;
  background: white;
}

.table-card h1 {
  margin-top: 0;
}

.table-card p {
  color: #667085;
}

table {
  width: 100%;
  border-collapse: collapse; /* 🧱 Prueba separate */
  margin-top: 22px;
}

th, td {
  border: 1px solid #d5dce7; /* ✏️ Haz el borde más grueso */
  padding: 12px; /* 📏 Prueba 20px */
  text-align: left; /* ↔️ Prueba center */
}

th {
  background-color: #5b5bd6; /* 🎨 Cambia el encabezado */
  color: white;
}

tbody tr:nth-child(even) {
  background-color: #f7f8fc;
}

td:last-child,
th:last-child {
  text-align: center;
  font-weight: 700;
}`
  },
  {
    id: "lesson-7",
    number: 7,
    kind: "lesson",
    title: "Barras de progreso",
    description: "Visualiza porcentajes cambiando ancho, alto, color y redondeado.",
    properties: ["width", "height", "background-color", "border-radius"],
    mission: [
      "Cambia el alto de todas las barras.",
      "Modifica el color de una barra.",
      "Prueba diferentes border-radius.",
      "Cambia el width de una barra y observa el porcentaje visual.",
      "Crea una barra muy delgada y otra más gruesa."
    ],
    hint: "El porcentaje visual está en width. Por ejemplo, width: 75% ocupa tres cuartas partes del contenedor.",
    tryNext: "Cambia .p50 a width: 10% y luego a 95%. El texto no cambia automáticamente: eso también forma parte del experimento.",
    quick: {
      title: "Altura de las barras",
      selector: ".bar",
      property: "height",
      values: ["8px", "14px", "24px", "36px"]
    },
    html: `<section class="progress-card-demo">
  <h1>Progreso del proyecto</h1>

  <div class="item">
    <div class="label"><span>HTML</span><strong>25%</strong></div>
    <div class="track"><div class="bar p25"></div></div>
  </div>

  <div class="item">
    <div class="label"><span>CSS</span><strong>50%</strong></div>
    <div class="track"><div class="bar p50"></div></div>
  </div>

  <div class="item">
    <div class="label"><span>Flexbox</span><strong>75%</strong></div>
    <div class="track"><div class="bar p75"></div></div>
  </div>

  <div class="item">
    <div class="label"><span>Proyecto final</span><strong>100%</strong></div>
    <div class="track"><div class="bar p100"></div></div>
  </div>
</section>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f4f7fb;
  font-family: Arial, sans-serif;
  color: #17233c;
}

.progress-card-demo {
  width: min(86%, 580px);
  padding: 32px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 16px 34px rgba(31, 41, 55, 0.10);
}

.progress-card-demo h1 {
  margin: 0 0 26px;
}

.item {
  margin: 20px 0;
}

.label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.track {
  width: 100%;
  background-color: #e6eaf0;
  border-radius: 999px;
  overflow: hidden;
}

.bar {
  height: 14px; /* 📏 Prueba 8px, 24px o 36px */
  background-color: #5b5bd6; /* 🎨 Cambia el color */
  border-radius: 999px; /* 🔵 Prueba 0px */
}

.p25 { width: 25%; }
.p50 { width: 50%; background-color: #e26f49; }
.p75 { width: 75%; background-color: #1e9f7a; }
.p100 { width: 100%; background-color: #d49b22; }`
  },
  {
    id: "lesson-8",
    number: 8,
    kind: "lesson",
    title: "Iconos y elementos visuales",
    description: "Combina iconos simples, texto, botones y tarjetas sin librerías externas.",
    properties: ["display", "gap", "background", "width", "height", "border-radius"],
    mission: [
      "Cambia el tamaño de los iconos.",
      "Prueba otra forma para el fondo del icono.",
      "Modifica el espacio entre icono y texto.",
      "Cambia el botón con icono.",
      "Sustituye un emoji por otro directamente en el HTML."
    ],
    hint: "Aquí los iconos son caracteres Unicode/emoji, así que no dependen de una librería ni de Internet.",
    tryNext: "Cambia 🎨 por 🚀, ⭐, 🧠 o cualquier otro símbolo y luego modifica su fondo desde CSS.",
    quick: {
      title: "Tamaño del contenedor del icono",
      selector: ".icon-box",
      property: "width",
      values: ["38px", "52px", "70px", "90px"]
    },
    html: `<section class="visual-demo">
  <div class="icon-text">
    <div class="icon-box">💡</div>
    <div>
      <strong>Icono + texto</strong>
      <p>Los símbolos Unicode funcionan sin dependencias.</p>
    </div>
  </div>

  <button class="icon-button"><span>🚀</span> Lanzar proyecto</button>

  <article class="visual-card">
    <div class="icon-box big">🎨</div>
    <h2>Diseña a tu manera</h2>
    <p>HTML organiza. CSS transforma.</p>
  </article>
</section>`,
    css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f3f6fb;
  font-family: Arial, sans-serif;
  color: #17233c;
}

.visual-demo {
  width: min(86%, 600px);
  display: grid;
  gap: 20px;
}

.icon-text,
.visual-card {
  background: white;
  border: 1px solid #dfe5ee;
  border-radius: 22px;
  padding: 24px;
}

.icon-text {
  display: flex; /* 🧩 Icono y texto en una fila */
  align-items: center;
  gap: 16px; /* 📏 Separa icono y texto */
}

.icon-text p,
.visual-card p {
  margin-bottom: 0;
  color: #667085;
}

.icon-box {
  width: 52px; /* 📐 Prueba 70px */
  height: 52px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 16px; /* 🔵 Prueba 50% */
  background: #e9ecff;
  font-size: 26px;
}

.icon-box.big {
  width: 72px;
  height: 72px;
  font-size: 34px;
}

.icon-button {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 0;
  border-radius: 14px;
  padding: 12px 16px;
  background: #17233c;
  color: white;
  font-weight: 800;
}

.visual-card {
  text-align: center;
}

.visual-card .icon-box {
  margin: 0 auto;
}`
  },
  {
    id: "lesson-9",
    number: 9,
    kind: "lesson",
    title: "Mini interfaz",
    description: "Combina encabezado, navegación, tarjetas, botones, tabla, progreso e iconos.",
    properties: ["layout", "colors", "cards", "buttons", "table", "progress"],
    mission: [
      "Cambia el color principal de toda la interfaz.",
      "Transforma las tarjetas con otro borde y sombra.",
      "Modifica la navegación.",
      "Cambia la tabla y las barras de progreso.",
      "Haz al menos tres cambios que se noten a simple vista."
    ],
    hint: "Busca el color #5b5bd6: aparece en varias partes. Cambiarlo en varios lugares crea una nueva identidad visual.",
    tryNext: "Intenta convertir esta interfaz morada en una interfaz verde, naranja o azul cambiando solo unas pocas reglas.",
    quick: {
      title: "Redondeado general de las cards",
      selector: ".stat-card",
      property: "border-radius",
      values: ["0px", "12px", "20px", "34px"]
    },
    html: `<div class="app-demo">
  <header>
    <div class="logo">⚡ CodeClub</div>
    <nav>
      <a href="#">Inicio</a>
      <a href="#">Proyectos</a>
      <a href="#">Equipo</a>
    </nav>
    <button>Nuevo proyecto</button>
  </header>

  <main>
    <section class="hero">
      <div>
        <span class="badge">SEMANA 4</span>
        <h1>Panel de aprendizaje</h1>
        <p>Una pequeña interfaz hecha solo con HTML y CSS.</p>
      </div>
      <div class="hero-icon">🎯</div>
    </section>

    <section class="stats">
      <article class="stat-card"><span>📘</span><strong>8</strong><small>Lecciones</small></article>
      <article class="stat-card"><span>🧪</span><strong>14</strong><small>Experimentos</small></article>
      <article class="stat-card"><span>🏆</span><strong>3</strong><small>Retos</small></article>
    </section>

    <section class="content-grid">
      <article class="panel">
        <h2>Progreso</h2>
        <div class="progress-row"><span>HTML</span><div class="track"><i style="width: 80%"></i></div></div>
        <div class="progress-row"><span>CSS</span><div class="track"><i style="width: 65%"></i></div></div>
        <div class="progress-row"><span>Flexbox</span><div class="track"><i style="width: 45%"></i></div></div>
      </article>

      <article class="panel">
        <h2>Equipo</h2>
        <table>
          <tr><th>Nombre</th><th>Nivel</th></tr>
          <tr><td>Ana</td><td>Avanzando</td></tr>
          <tr><td>Leo</td><td>Explorando</td></tr>
          <tr><td>Sofía</td><td>Completado</td></tr>
        </table>
      </article>
    </section>
  </main>
</div>`,
    css: `* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: #f4f7fb;
  color: #17233c;
  font-family: Arial, sans-serif;
}

.app-demo {
  width: min(94%, 980px);
  margin: 24px auto;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 18px;
  border-radius: 18px;
  background: white;
}

.logo {
  font-weight: 900;
}

nav {
  display: flex;
  gap: 16px;
}

nav a {
  color: #667085;
  text-decoration: none;
  font-size: 14px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  background: #5b5bd6; /* 🎨 Color principal */
  color: white;
  font-weight: 700;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 20px 0;
  padding: 28px;
  border-radius: 24px;
  background: #27284f;
  color: white;
}

.hero h1 {
  margin: 8px 0;
  font-size: 34px;
}

.hero p {
  margin: 0;
  color: #c9cbed;
}

.badge {
  color: #c9cbed;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
}

.hero-icon {
  font-size: 62px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.stat-card {
  display: grid;
  gap: 5px;
  padding: 20px; /* 📏 Prueba 30px */
  border: 1px solid #dfe5ee;
  border-radius: 20px; /* 🔵 Cambia la forma */
  background: white;
  box-shadow: 0 10px 20px rgba(31, 41, 55, 0.06);
}

.stat-card span { font-size: 24px; }
.stat-card strong { font-size: 30px; }
.stat-card small { color: #667085; }

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 14px;
}

.panel {
  padding: 22px;
  border-radius: 20px;
  background: white;
}

.panel h2 {
  margin-top: 0;
}

.progress-row {
  display: grid;
  grid-template-columns: 70px 1fr;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}

.track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf2;
}

.track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #5b5bd6;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px;
  border-bottom: 1px solid #e5e9f0;
  text-align: left;
}

th {
  color: #667085;
  font-size: 13px;
}

@media (max-width: 680px) {
  header, .hero {
    align-items: flex-start;
    flex-direction: column;
  }

  nav {
    flex-wrap: wrap;
  }

  .stats,
  .content-grid {
    grid-template-columns: 1fr;
  }
}`
  },
  {
    id: "final-challenge",
    number: 10,
    kind: "challenge",
    title: "🏆 Construye tu estilo",
    description: "No hay una única respuesta correcta: usa lo aprendido para crear una interfaz con tu propia identidad.",
    properties: ["tu estilo", "colores", "espaciado", "tarjetas", "botones", "tablas", "progreso"],
    mission: [
      "Elige una paleta de colores propia.",
      "Personaliza las tarjetas y botones.",
      "Modifica al menos un layout con Flexbox o Grid.",
      "Cambia tabla, barras de progreso e iconos.",
      "Haz que el resultado final se vea claramente diferente al original."
    ],
    hint: "Empieza por una sola decisión: elige un color principal. Después úsalo en botones, títulos, iconos y barras.",
    tryNext: "No busques que quede “perfecto”. Haz una versión seria, futurista, minimalista, retro o totalmente tuya.",
    quick: {
      title: "Redondeado de las tarjetas",
      selector: ".project-card",
      property: "border-radius",
      values: ["0px", "12px", "24px", "42px"]
    },
    html: `<div class="final-app">
  <header class="site-header">
    <div class="brand">✦ Nova Lab</div>
    <nav>
      <a href="#">Inicio</a>
      <a href="#">Proyectos</a>
      <a href="#">Progreso</a>
    </nav>
    <button class="primary-btn">Crear</button>
  </header>

  <main>
    <section class="intro">
      <div>
        <span class="tag">🏆 DESAFÍO FINAL</span>
        <h1>Construye tu estilo</h1>
        <p>Cambia este diseño hasta que se sienta realmente tuyo.</p>
        <div class="actions">
          <button class="primary-btn">Empezar</button>
          <button class="secondary-btn">Ver ideas</button>
        </div>
      </div>
      <div class="intro-icon">🎨</div>
    </section>

    <section class="project-grid">
      <article class="project-card">
        <div class="project-icon">💻</div>
        <h2>Mi sitio</h2>
        <p>Experimenta con colores, espacios y formas.</p>
        <button class="secondary-btn">Editar</button>
      </article>

      <article class="project-card">
        <div class="project-icon">📚</div>
        <h2>Mis recursos</h2>
        <p>Una segunda tarjeta para probar estilos consistentes.</p>
        <button class="secondary-btn">Abrir</button>
      </article>

      <article class="project-card">
        <div class="project-icon">🚀</div>
        <h2>Mi reto</h2>
        <p>Haz que esta tarjeta sea diferente sin romper el conjunto.</p>
        <button class="secondary-btn">Explorar</button>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <h2>Progreso</h2>
        <div class="progress-item">
          <div><span>HTML</span><strong>90%</strong></div>
          <div class="progress-track-demo"><span style="width: 90%"></span></div>
        </div>
        <div class="progress-item">
          <div><span>CSS</span><strong>72%</strong></div>
          <div class="progress-track-demo"><span style="width: 72%"></span></div>
        </div>
        <div class="progress-item">
          <div><span>Diseño</span><strong>55%</strong></div>
          <div class="progress-track-demo"><span style="width: 55%"></span></div>
        </div>
      </article>

      <article class="panel">
        <h2>Equipo creativo</h2>
        <table>
          <thead><tr><th>Nombre</th><th>Proyecto</th><th>Estado</th></tr></thead>
          <tbody>
            <tr><td>Ana</td><td>Portfolio</td><td>Listo</td></tr>
            <tr><td>David</td><td>Landing</td><td>En proceso</td></tr>
            <tr><td>Sofía</td><td>Dashboard</td><td>Probando</td></tr>
          </tbody>
        </table>
      </article>
    </section>
  </main>

  <footer>
    <span>✦ Nova Lab</span>
    <span>Hecho experimentando con HTML + CSS</span>
  </footer>
</div>`,
    css: `/* 🏆 DESAFÍO FINAL
   No hay una respuesta única. Cambia lo que quieras. */

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: #f4f6fa; /* 🎨 Empieza por el fondo */
  color: #1e293b;
  font-family: Arial, sans-serif;
}

.final-app {
  width: min(94%, 1050px);
  margin: 22px auto;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 18px;
  border: 1px solid #dde4ee;
  border-radius: 18px;
  background: white;
}

.brand {
  font-size: 20px;
  font-weight: 900;
}

nav {
  display: flex;
  gap: 16px;
}

nav a {
  color: #64748b;
  text-decoration: none;
}

.primary-btn,
.secondary-btn {
  border-radius: 12px;
  padding: 11px 15px;
  font-weight: 800;
  cursor: pointer;
}

.primary-btn {
  border: 0;
  background: #5b5bd6; /* 🎨 Tu color principal */
  color: white;
}

.secondary-btn {
  border: 1px solid #ced6e2;
  background: white;
  color: #334155;
}

.intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 18px 0;
  padding: 38px;
  border-radius: 26px;
  background: #20233e;
  color: white;
}

.intro h1 {
  margin: 10px 0;
  font-size: 42px;
}

.intro p {
  color: #c9cee8;
  font-size: 18px;
}

.tag {
  color: #c9cee8;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.intro-icon {
  font-size: 78px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.project-card {
  padding: 24px; /* 📏 ¿Más compacto o más espacioso? */
  border: 1px solid #dde4ee;
  border-radius: 24px; /* 🔵 Prueba otras formas */
  background: white;
  box-shadow: 0 10px 24px rgba(31, 41, 55, 0.07);
}

.project-card p {
  min-height: 54px;
  color: #64748b;
  line-height: 1.5;
}

.project-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: #ececff;
  font-size: 26px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 14px;
  margin-top: 14px;
}

.panel {
  padding: 24px;
  border: 1px solid #dde4ee;
  border-radius: 22px;
  background: white;
}

.panel h2 { margin-top: 0; }

.progress-item {
  margin: 17px 0;
}

.progress-item > div:first-child {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
}

.progress-track-demo {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf2;
}

.progress-track-demo span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #5b5bd6;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 11px;
  border-bottom: 1px solid #e5e9f0;
  text-align: left;
}

th {
  color: #64748b;
  font-size: 13px;
}

footer {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-top: 14px;
  padding: 20px 4px 30px;
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 720px) {
  .site-header,
  .intro,
  footer {
    align-items: flex-start;
    flex-direction: column;
  }

  nav { flex-wrap: wrap; }

  .project-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}`
  }
];

const STORAGE_PREFIX = "cssLab.v1";
const STORAGE_CURRENT = `${STORAGE_PREFIX}.currentLesson`;
const STORAGE_COMPLETED = `${STORAGE_PREFIX}.completedLessons`;

const elements = {
  lessonSelect: document.getElementById("lessonSelect"),
  lessonCounter: document.getElementById("lessonCounter"),
  lessonKind: document.getElementById("lessonKind"),
  lessonTitle: document.getElementById("lessonTitle"),
  lessonDescription: document.getElementById("lessonDescription"),
  propertyChips: document.getElementById("propertyChips"),
  missionList: document.getElementById("missionList"),
  hintText: document.getElementById("hintText"),
  hintBtn: document.getElementById("hintBtn"),
  quickControlsCard: document.getElementById("quickControlsCard"),
  quickControlsTitle: document.getElementById("quickControlsTitle"),
  quickControls: document.getElementById("quickControls"),
  htmlEditor: document.getElementById("htmlEditor"),
  cssEditor: document.getElementById("cssEditor"),
  htmlLines: document.getElementById("htmlLines"),
  cssLines: document.getElementById("cssLines"),
  htmlHighlight: document.getElementById("htmlHighlight"),
  cssHighlight: document.getElementById("cssHighlight"),
  previewFrame: document.getElementById("previewFrame"),
  liveStatus: document.getElementById("liveStatus"),
  resetLessonBtn: document.getElementById("resetLessonBtn"),
  completeBtn: document.getElementById("completeBtn"),
  nextLessonBtn: document.getElementById("nextLessonBtn"),
  tryNextText: document.getElementById("tryNextText"),
  progressText: document.getElementById("progressText"),
  progressPercent: document.getElementById("progressPercent"),
  progressFill: document.getElementById("progressFill"),
  downloadWorkBtn: document.getElementById("downloadWorkBtn"),
  panelTabs: [...document.querySelectorAll(".panel-tab")],
  panels: [...document.querySelectorAll(".lab-panel")]
};

let currentLesson = null;
let previewTimer = null;
const saveTimers = new Map();
let completedLessons = loadCompletedLessons();

function storageKey(lessonId, type) {
  return `${STORAGE_PREFIX}.${lessonId}.${type}`;
}

function loadCompletedLessons() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_COMPLETED) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function saveCompletedLessons() {
  localStorage.setItem(STORAGE_COMPLETED, JSON.stringify([...completedLessons]));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCode(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function codeToken(className, value) {
  return `<span class="${className}">${escapeCode(value)}</span>`;
}

/*
 * Resaltador HTML pequeño y tolerante a errores.
 * No intenta validar el código: solo añade color visual al editor.
 */
function highlightHtmlTag(tagSource) {
  if (/^<!--/.test(tagSource)) {
    return codeToken("tok-comment", tagSource);
  }

  if (/^<!doctype/i.test(tagSource)) {
    return codeToken("tok-tag", tagSource);
  }

  const opening = tagSource.match(/^(<\/?)([^\s/>]+)/);
  if (!opening) return codeToken("tok-text", tagSource);

  let output = codeToken("tok-punc", opening[1]);
  output += codeToken("tok-tag", opening[2]);

  let index = opening[0].length;
  let expectingValue = false;
  const rest = tagSource.slice(index);
  const tokenRegex = /(\s+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([=/>])|([^\s=/>]+)/g;
  let match;

  while ((match = tokenRegex.exec(rest))) {
    const [raw, whitespace, quoted, punctuation, word] = match;

    if (whitespace) {
      output += escapeCode(whitespace);
    } else if (quoted) {
      output += codeToken("tok-string", quoted);
      expectingValue = false;
    } else if (punctuation) {
      output += codeToken("tok-punc", punctuation);
      expectingValue = punctuation === "=";
    } else if (word) {
      output += codeToken(expectingValue ? "tok-string" : "tok-attr", word);
      expectingValue = false;
    } else {
      output += escapeCode(raw);
    }
  }

  return output;
}

function highlightHtml(source) {
  const tagRegex = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[A-Za-z][^>]*>?/gi;
  let output = "";
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(source))) {
    if (match.index > lastIndex) {
      output += codeToken("tok-text", source.slice(lastIndex, match.index));
    }
    output += highlightHtmlTag(match[0]);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    output += codeToken("tok-text", source.slice(lastIndex));
  }

  return output;
}

function highlightCssValue(value) {
  let output = "";
  let lastIndex = 0;
  const specialRegex = /!important\b|-?(?:\d*\.)?\d+(?:px|rem|em|%|vh|vw|s|ms|deg)?\b/gi;
  let match;

  while ((match = specialRegex.exec(value))) {
    if (match.index > lastIndex) {
      output += codeToken("tok-value", value.slice(lastIndex, match.index));
    }
    output += codeToken(/^!important/i.test(match[0]) ? "tok-important" : "tok-number", match[0]);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    output += codeToken("tok-value", value.slice(lastIndex));
  }
  return output;
}

/* Resaltador CSS por estados: selector → propiedad → valor. */
function highlightCss(source) {
  let output = "";
  let index = 0;
  let depth = 0;
  let state = "selector";

  const nextIndexOf = (characters, from) => {
    let nearest = -1;
    characters.forEach((character) => {
      const found = source.indexOf(character, from);
      if (found !== -1 && (nearest === -1 || found < nearest)) nearest = found;
    });
    return nearest;
  };

  while (index < source.length) {
    if (source.startsWith("/*", index)) {
      const commentEnd = source.indexOf("*/", index + 2);
      const end = commentEnd === -1 ? source.length : commentEnd + 2;
      output += codeToken("tok-comment", source.slice(index, end));
      index = end;
      continue;
    }

    const char = source[index];
    if (char === '"' || char === "'") {
      const quote = char;
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === "\\") {
          end += 2;
          continue;
        }
        if (source[end] === quote) {
          end += 1;
          break;
        }
        end += 1;
      }
      output += codeToken("tok-string", source.slice(index, end));
      index = end;
      continue;
    }

    if (state === "selector") {
      const braceIndex = source.indexOf("{", index);
      const commentIndex = source.indexOf("/*", index);
      const stop = [braceIndex, commentIndex].filter((v) => v !== -1).sort((a, b) => a - b)[0];

      if (stop === undefined) {
        output += codeToken("tok-selector", source.slice(index));
        break;
      }
      if (stop > index) {
        output += codeToken("tok-selector", source.slice(index, stop));
        index = stop;
        continue;
      }
      if (source[index] === "{") {
        output += codeToken("tok-punc", "{");
        depth += 1;
        state = "property";
        index += 1;
        continue;
      }
    }

    if (state === "property") {
      const commentIndex = source.indexOf("/*", index);
      const delimiterIndex = nextIndexOf([":", ";", "{", "}"], index);
      let stop = delimiterIndex;
      if (commentIndex !== -1 && (stop === -1 || commentIndex < stop)) stop = commentIndex;

      if (stop === -1) {
        output += codeToken("tok-property", source.slice(index));
        break;
      }
      if (stop > index) {
        const chunk = source.slice(index, stop);
        const nextChar = source[stop];
        output += codeToken(nextChar === "{" ? "tok-selector" : "tok-property", chunk);
        index = stop;
        continue;
      }

      if (source[index] === ":") {
        output += codeToken("tok-punc", ":");
        state = "value";
        index += 1;
        continue;
      }
      if (source[index] === ";") {
        output += codeToken("tok-punc", ";");
        index += 1;
        continue;
      }
      if (source[index] === "{") {
        output += codeToken("tok-punc", "{");
        depth += 1;
        index += 1;
        continue;
      }
      if (source[index] === "}") {
        output += codeToken("tok-punc", "}");
        depth = Math.max(0, depth - 1);
        state = depth === 0 ? "selector" : "property";
        index += 1;
        continue;
      }
    }

    if (state === "value") {
      const commentIndex = source.indexOf("/*", index);
      const delimiterIndex = nextIndexOf([";", "}"], index);
      let stop = delimiterIndex;
      if (commentIndex !== -1 && (stop === -1 || commentIndex < stop)) stop = commentIndex;

      if (stop === -1) {
        output += highlightCssValue(source.slice(index));
        break;
      }
      if (stop > index) {
        output += highlightCssValue(source.slice(index, stop));
        index = stop;
        continue;
      }
      if (source[index] === ";") {
        output += codeToken("tok-punc", ";");
        state = "property";
        index += 1;
        continue;
      }
      if (source[index] === "}") {
        output += codeToken("tok-punc", "}");
        depth = Math.max(0, depth - 1);
        state = depth === 0 ? "selector" : "property";
        index += 1;
        continue;
      }
    }

    // Fallback para código incompleto o caracteres inesperados.
    output += escapeCode(source[index]);
    index += 1;
  }

  return output;
}

function updateSyntaxHighlight(editor) {
  const isHtml = editor === elements.htmlEditor;
  const highlight = isHtml ? elements.htmlHighlight : elements.cssHighlight;
  highlight.innerHTML = (isHtml ? highlightHtml(editor.value) : highlightCss(editor.value)) + "&#8203;";
  highlight.scrollTop = editor.scrollTop;
  highlight.scrollLeft = editor.scrollLeft;
}

function populateLessonSelect() {
  elements.lessonSelect.innerHTML = "";

  LESSONS.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    option.textContent = lesson.kind === "challenge"
      ? lesson.title
      : `Lección ${lesson.number} — ${lesson.title}`;
    elements.lessonSelect.appendChild(option);
  });
}

function getStoredCode(lesson, type) {
  const saved = localStorage.getItem(storageKey(lesson.id, type));
  return saved === null ? lesson[type] : saved;
}

function lessonHasChanges(lesson = currentLesson) {
  if (!lesson) return false;
  return elements.htmlEditor.value !== lesson.html || elements.cssEditor.value !== lesson.css;
}

function renderLesson(lessonId) {
  const lesson = LESSONS.find((item) => item.id === lessonId) || LESSONS[0];
  currentLesson = lesson;
  localStorage.setItem(STORAGE_CURRENT, lesson.id);

  elements.lessonSelect.value = lesson.id;
  elements.lessonKind.textContent = lesson.kind === "challenge" ? "DESAFÍO FINAL" : "LECCIÓN";
  elements.lessonTitle.textContent = lesson.title;
  elements.lessonDescription.textContent = lesson.description;
  elements.tryNextText.textContent = lesson.tryNext;

  elements.lessonCounter.textContent = lesson.kind === "challenge"
    ? "🏆 Desafío final"
    : `Lección ${lesson.number} de 9`;

  elements.propertyChips.innerHTML = "";
  lesson.properties.forEach((property) => {
    const chip = document.createElement("span");
    chip.className = "property-chip";
    chip.textContent = property;
    elements.propertyChips.appendChild(chip);
  });

  elements.missionList.innerHTML = "";
  lesson.mission.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    elements.missionList.appendChild(item);
  });

  elements.hintText.textContent = lesson.hint;
  hideHint();
  renderQuickControls(lesson);

  elements.htmlEditor.value = getStoredCode(lesson, "html");
  elements.cssEditor.value = getStoredCode(lesson, "css");

  updateSyntaxHighlight(elements.htmlEditor);
  updateSyntaxHighlight(elements.cssEditor);
  updateLineNumbers(elements.htmlEditor, elements.htmlLines);
  updateLineNumbers(elements.cssEditor, elements.cssLines);
  updatePreview();
  updateProgressUI();
  updateCompleteButton();
  updateFinalDownloadUI();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderQuickControls(lesson) {
  const quick = lesson.quick;
  elements.quickControls.innerHTML = "";

  if (!quick) {
    elements.quickControlsCard.hidden = true;
    return;
  }

  elements.quickControlsCard.hidden = false;
  elements.quickControlsTitle.textContent = quick.title;

  quick.values.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-option";
    button.textContent = value;
    button.addEventListener("click", () => applyQuickCssChange(quick.selector, quick.property, value));
    elements.quickControls.appendChild(button);
  });
}

function applyQuickCssChange(selector, property, value) {
  const css = elements.cssEditor.value;
  const selectorPattern = escapeRegExp(selector);
  const blockRegex = new RegExp(`(${selectorPattern}\\s*\\{)([\\s\\S]*?)(\\})`, "m");
  const match = css.match(blockRegex);

  if (!match) {
    elements.liveStatus.classList.add("updating");
    elements.liveStatus.lastChild.textContent = " Selector no encontrado";
    setTimeout(() => {
      elements.liveStatus.classList.remove("updating");
      elements.liveStatus.lastChild.textContent = " Actualización automática";
    }, 1400);
    return;
  }

  const blockBody = match[2];
  const propertyPattern = escapeRegExp(property);
  const propertyRegex = new RegExp(`(^|\\n)(\\s*)${propertyPattern}\\s*:\\s*[^;\\n}]*(;?)`, "m");

  let newBody;
  if (propertyRegex.test(blockBody)) {
    newBody = blockBody.replace(propertyRegex, (full, lineStart, indent, semicolon) => {
      return `${lineStart}${indent}${property}: ${value}${semicolon || ";"}`;
    });
  } else {
    newBody = `${blockBody.trimEnd()}\n  ${property}: ${value};\n`;
  }

  elements.cssEditor.value = css.replace(blockRegex, `$1${newBody}$3`);
  handleEditorInput(elements.cssEditor, elements.cssLines);
  elements.cssEditor.focus();
}

function buildPreviewDocument(html, css) {
  // Impide que el CSS del estudiante cierre prematuramente la etiqueta <style>.
  const safeCss = css.replace(/<\/style/gi, "<\\/style");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; frame-src 'none'; form-action 'none'; base-uri 'none'">
<style>
html { min-height: 100%; }
${safeCss}
</style>
</head>
<body>
${html}
</body>
</html>`;
}

function updatePreview() {
  if (!currentLesson) return;

  elements.liveStatus.classList.remove("updating");
  elements.liveStatus.lastChild.textContent = " Actualización automática";

  const documentSource = buildPreviewDocument(
    elements.htmlEditor.value,
    elements.cssEditor.value
  );

  elements.previewFrame.srcdoc = documentSource;
}

function queuePreviewUpdate() {
  clearTimeout(previewTimer);
  elements.liveStatus.classList.add("updating");
  elements.liveStatus.lastChild.textContent = " Actualizando…";

  previewTimer = setTimeout(updatePreview, 90);
}

function queueSave() {
  if (!currentLesson) return;

  // Cada actividad mantiene su propio temporizador. Así, cambiar de lección
  // rápidamente no cancela el guardado pendiente de la actividad anterior.
  const lessonId = currentLesson.id;
  const html = elements.htmlEditor.value;
  const css = elements.cssEditor.value;
  const previousTimer = saveTimers.get(lessonId);

  if (previousTimer) clearTimeout(previousTimer);

  const timer = setTimeout(() => {
    localStorage.setItem(storageKey(lessonId, "html"), html);
    localStorage.setItem(storageKey(lessonId, "css"), css);
    saveTimers.delete(lessonId);
  }, 180);

  saveTimers.set(lessonId, timer);
}

function clearPendingSave(lessonId) {
  const timer = saveTimers.get(lessonId);
  if (!timer) return;
  clearTimeout(timer);
  saveTimers.delete(lessonId);
}

function updateLineNumbers(editor, container) {
  const lineCount = Math.max(1, editor.value.split("\n").length);
  container.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
  syncLineScroll(editor, container);
}

function syncLineScroll(editor, container) {
  container.scrollTop = editor.scrollTop;
  const highlight = editor === elements.htmlEditor ? elements.htmlHighlight : elements.cssHighlight;
  highlight.scrollTop = editor.scrollTop;
  highlight.scrollLeft = editor.scrollLeft;
}

function handleEditorInput(editor, lineContainer) {
  updateSyntaxHighlight(editor);
  updateLineNumbers(editor, lineContainer);
  queuePreviewUpdate();
  queueSave();
}

function restoreCurrentLesson() {
  if (!currentLesson) return;

  if (lessonHasChanges()) {
    const confirmed = window.confirm("Has realizado cambios en esta actividad. ¿Quieres restaurar el HTML y CSS originales?");
    if (!confirmed) return;
  }

  clearPendingSave(currentLesson.id);
  elements.htmlEditor.value = currentLesson.html;
  elements.cssEditor.value = currentLesson.css;
  localStorage.removeItem(storageKey(currentLesson.id, "html"));
  localStorage.removeItem(storageKey(currentLesson.id, "css"));
  updateSyntaxHighlight(elements.htmlEditor);
  updateSyntaxHighlight(elements.cssEditor);
  updateLineNumbers(elements.htmlEditor, elements.htmlLines);
  updateLineNumbers(elements.cssEditor, elements.cssLines);
  updatePreview();
}

function hideHint() {
  elements.hintText.classList.add("hint-hidden");
  elements.hintText.classList.remove("hint-visible");
  elements.hintBtn.textContent = "Mostrar pista";
}

function toggleHint() {
  const hidden = elements.hintText.classList.contains("hint-hidden");
  elements.hintText.classList.toggle("hint-hidden", !hidden);
  elements.hintText.classList.toggle("hint-visible", hidden);
  elements.hintBtn.textContent = hidden ? "Ocultar pista" : "Mostrar pista";
}

function updateProgressUI() {
  const lessonIds = LESSONS.filter((lesson) => lesson.kind === "lesson").map((lesson) => lesson.id);
  const completedCount = lessonIds.filter((id) => completedLessons.has(id)).length;
  const percent = Math.round((completedCount / lessonIds.length) * 100);

  elements.progressText.textContent = `${completedCount} de 9 lecciones exploradas`;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressFill.style.width = `${percent}%`;
}

function updateCompleteButton() {
  if (!currentLesson) return;

  if (currentLesson.kind === "challenge") {
    const challengeDone = completedLessons.has(currentLesson.id);
    elements.completeBtn.textContent = challengeDone ? "★ Desafío guardado" : "★ Marcar desafío y guardar progreso";
    elements.completeBtn.classList.toggle("completed", challengeDone);
    return;
  }

  const completed = completedLessons.has(currentLesson.id);
  elements.completeBtn.textContent = completed ? "✓ Lección explorada" : "✓ Marcar como explorada";
  elements.completeBtn.classList.toggle("completed", completed);
}

function updateFinalDownloadUI() {
  const lessonNine = LESSONS.find((lesson) => lesson.kind === "lesson" && lesson.number === 9);
  const lessonNineCompleted = lessonNine ? completedLessons.has(lessonNine.id) : false;
  const isAtEnd = currentLesson?.id === lessonNine?.id || currentLesson?.kind === "challenge";

  // La entrega aparece al terminar la lección 9 y sigue disponible en el desafío final.
  elements.downloadWorkBtn.hidden = !(lessonNineCompleted && isAtEnd);
  // Mantén la navegación disponible también en el desafío final.
  // Al pulsar «Siguiente actividad» desde allí, se vuelve a la primera lección.
  elements.nextLessonBtn.hidden = false;
}

function escapeHtmlAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeDocumentText(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDownloadDocument() {
  const lessonCards = LESSONS
    .filter((lesson) => lesson.kind === "lesson")
    .map((lesson) => {
      const html = getStoredCode(lesson, "html");
      const css = getStoredCode(lesson, "css");
      const previewDocument = buildPreviewDocument(html, css);

      return `
    <figure class="exercise-preview">
      <figcaption>${lesson.number}. ${escapeDocumentText(lesson.title)}</figcaption>
      <iframe
        title="Ejercicio ${lesson.number}: ${escapeHtmlAttribute(lesson.title)}"
        sandbox=""
        referrerpolicy="no-referrer"
        srcdoc="${escapeHtmlAttribute(previewDocument)}"
      ></iframe>
    </figure>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="CSS Lab">
  <title>Mis 9 ejercicios — CSS Lab</title>
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 18px;
      background: #eef2f7;
      color: #17233c;
      font-family: Arial, sans-serif;
    }

    .work-grid {
      width: min(1800px, 100%);
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .exercise-preview {
      min-width: 0;
      margin: 0;
      overflow: hidden;
      border: 1px solid #d9e0ea;
      border-radius: 18px;
      background: white;
      box-shadow: 0 8px 22px rgba(30, 41, 59, 0.08);
    }

    .exercise-preview figcaption {
      padding: 10px 13px;
      border-bottom: 1px solid #e3e8ef;
      background: #f8fafc;
      font-size: 13px;
      font-weight: 800;
    }

    .exercise-preview iframe {
      display: block;
      width: 100%;
      height: 420px;
      border: 0;
      background: white;
    }

    @media (max-width: 1050px) {
      .work-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 680px) {
      body { padding: 10px; }
      .work-grid { grid-template-columns: 1fr; }
      .exercise-preview iframe { height: 500px; }
    }
  </style>
</head>
<body>
  <main class="work-grid">${lessonCards}
  </main>
</body>
</html>`;
}

function downloadFinalWork() {
  const lessonNine = LESSONS.find((lesson) => lesson.kind === "lesson" && lesson.number === 9);
  if (!lessonNine || !completedLessons.has(lessonNine.id)) return;

  // Fuerza el guardado del editor actual antes de reunir las nueve vistas previas.
  if (currentLesson) {
    localStorage.setItem(storageKey(currentLesson.id, "html"), elements.htmlEditor.value);
    localStorage.setItem(storageKey(currentLesson.id, "css"), elements.cssEditor.value);
  }

  const source = buildDownloadDocument();
  const blob = new Blob([source], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "css-lab-mis-9-ejercicios.html";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toggleCurrentComplete() {
  if (!currentLesson) return;

  if (completedLessons.has(currentLesson.id)) {
    completedLessons.delete(currentLesson.id);
  } else {
    completedLessons.add(currentLesson.id);
  }

  saveCompletedLessons();
  updateProgressUI();
  updateCompleteButton();
  updateFinalDownloadUI();
}

function goToNextLesson() {
  if (!currentLesson) return;
  const currentIndex = LESSONS.findIndex((lesson) => lesson.id === currentLesson.id);
  const nextIndex = (currentIndex + 1) % LESSONS.length;
  renderLesson(LESSONS[nextIndex].id);
}

function switchMobilePanel(panelName) {
  elements.panelTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.panel === panelName);
  });

  elements.panels.forEach((panel) => {
    panel.classList.toggle("active-mobile", panel.dataset.panelName === panelName);
  });
}

function insertTab(event) {
  if (event.key !== "Tab") return;
  event.preventDefault();

  const editor = event.currentTarget;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const indent = "  ";

  editor.value = editor.value.slice(0, start) + indent + editor.value.slice(end);
  editor.selectionStart = editor.selectionEnd = start + indent.length;

  const lineContainer = editor === elements.htmlEditor ? elements.htmlLines : elements.cssLines;
  handleEditorInput(editor, lineContainer);
}

function bindEvents() {
  elements.lessonSelect.addEventListener("change", (event) => renderLesson(event.target.value));
  elements.resetLessonBtn.addEventListener("click", restoreCurrentLesson);
  elements.completeBtn.addEventListener("click", toggleCurrentComplete);
  elements.nextLessonBtn.addEventListener("click", goToNextLesson);
  elements.downloadWorkBtn.addEventListener("click", downloadFinalWork);
  elements.hintBtn.addEventListener("click", toggleHint);

  elements.htmlEditor.addEventListener("input", () => handleEditorInput(elements.htmlEditor, elements.htmlLines));
  elements.cssEditor.addEventListener("input", () => handleEditorInput(elements.cssEditor, elements.cssLines));

  elements.htmlEditor.addEventListener("scroll", () => syncLineScroll(elements.htmlEditor, elements.htmlLines));
  elements.cssEditor.addEventListener("scroll", () => syncLineScroll(elements.cssEditor, elements.cssLines));

  elements.htmlEditor.addEventListener("keydown", insertTab);
  elements.cssEditor.addEventListener("keydown", insertTab);

  elements.panelTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMobilePanel(tab.dataset.panel));
  });
}

function init() {
  populateLessonSelect();
  bindEvents();

  const savedLessonId = localStorage.getItem(STORAGE_CURRENT);
  const initialLesson = LESSONS.some((lesson) => lesson.id === savedLessonId)
    ? savedLessonId
    : LESSONS[0].id;

  renderLesson(initialLesson);
}

init();
