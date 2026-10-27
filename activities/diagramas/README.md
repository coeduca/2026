# S12 · Diagramas de flujo

Cuestionario interactivo de **Ciencias de la computación · Bachillerato**, adaptado del ZIP de COEDUCA y de la presentación `S12 Diagramas de Flujo.pptx` de Google Drive.

## Funciones

- 18 estudiantes definidos en `students.js`, con acceso mediante NIE.
- Dos bancos equivalentes de preguntas (A/B), 30 preguntas por banco: selección múltiple y verdadero/falso.
- Rigo original interactivo y con mensajes personalizados sobre diagramas de flujo.
- Nota automática sobre 10, progreso en el dispositivo y exportación individual de reporte PDF.
- Recursos cargados **localmente**, sin CDN ni conexiones al Classroom del ZIP original.
- Adaptable a móvil y escritorio.

## Publicar en GitHub Pages

1. Descomprime el ZIP y sube **todos sus archivos** al directorio raíz de un repositorio GitHub (con `index.html` en la raíz).
2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**; elige `main` y carpeta `/ (root)`.
3. Abre la URL de Pages publicada para iniciar sesión con el NIE de un estudiante.
4. Al finalizar, usa **Descargar mi reporte PDF** para enviar el resultado al docente por el medio que este indique.

## Consideraciones importantes

- **Privacidad:** GitHub Pages es público y el archivo `students.js` contiene nombres y NIE legibles. Utiliza este formato únicamente si dispones de autorización para publicar esos datos. Para uso público sin exponer NIE, se necesita un sistema privado de autenticación con backend.
- **Notas y respuestas:** Se guardan en `localStorage` del navegador. No se envían automáticamente al profesor ni se comparten entre dispositivos.
- **Seguridad académica:** Al ser un sitio estático, las respuestas correctas quedan en el JavaScript. Es una actividad formativa, no una evaluación protegida contra inspección o manipulación.
- **Cambios:** Las preguntas y el contenido de las notas están en `quiz-data.js`; los estudiantes en `students.js`; el diseño en `styles.css`.

**Presentación usada:** S12 Diagramas de Flujo.pptx (Google Drive, clase S12).
