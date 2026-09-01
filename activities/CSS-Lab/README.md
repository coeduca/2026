# CSS Lab

**CSS Lab** es una aplicación web educativa estática para aprender HTML y CSS mediante experimentación directa:

> ver código → modificarlo → observar inmediatamente qué cambia.

## Contenido

- 9 lecciones progresivas.
- Desafío final **🏆 Construye tu estilo**.
- Editores de HTML y CSS con resaltado de sintaxis ligero y sin librerías externas.
- HTML y CSS apilados en una columna de trabajo y previsualización flotante en escritorio.
- Previsualización automática en un `iframe` aislado.
- Misiones, pistas y controles rápidos.
- Restauración del ejercicio actual.
- Progreso y código guardados en `localStorage`.
- Descarga del desafío final como un único archivo `.html` listo para entregar.
- Diseño responsive para escritorio, tablet y móvil.
- Sin backend, npm, frameworks ni dependencias externas.

## Ejecutar localmente

No requiere instalación.

1. Descarga o clona este proyecto.
2. Abre `index.html` en un navegador moderno.

También puedes servir la carpeta con cualquier servidor web estático, pero no es obligatorio.

## Publicar con GitHub Pages

1. Crea un repositorio en GitHub, por ejemplo `css-lab`.
2. Sube estos archivos a la raíz del repositorio:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`
3. En GitHub abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Elige la rama `main` y la carpeta `/ (root)`.
6. Guarda los cambios.

La aplicación utiliza rutas relativas (`./styles.css` y `./script.js`), por lo que funciona correctamente en direcciones como:

`https://usuario.github.io/css-lab/`

## Agregar nuevas lecciones

Las actividades están definidas en el arreglo `LESSONS` dentro de `script.js`.

Cada lección usa una estructura similar a:

```js
{
  id: "lesson-10",
  number: 10,
  kind: "lesson",
  title: "Nueva lección",
  description: "Descripción breve.",
  properties: ["propiedad-css"],
  mission: ["Una misión"],
  hint: "Una pista breve.",
  tryNext: "Una idea para seguir experimentando.",
  quick: {
    title: "Control rápido",
    selector: ".clase",
    property: "border-radius",
    values: ["0px", "10px", "20px"]
  },
  html: `...`,
  css: `...`
}
```

No se recopilan datos personales. Todo el progreso se conserva únicamente en el navegador del estudiante mediante `localStorage`.

## Entrega del estudiante

Al terminar la lección 9 y marcarla como explorada, aparece **Descargar mi trabajo**. El archivo generado contiene las nueve vistas previas con los cambios guardados por el estudiante, organizadas en una cuadrícula 3 × 3 en pantallas grandes. No incluye los editores ni las instrucciones del laboratorio.
