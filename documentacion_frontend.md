# Documentación Frontend — Sistema de Gestión Escolar
**Versión:** 1.1
**Stack:** HTML5 · CSS3 · JavaScript (vanilla, sin frameworks) · SweetAlert2 · Font Awesome 6
**Consumo de API:** `http://localhost/gestion_escolar/api` (ver `documentacion_backend_v2.3.md`)
**Fecha:** Octubre 2026

> Este documento complementa `documentacion_backend_v2.3.md`. Cubre la estructura de
> páginas, los scripts JS, el flujo de autenticación/primer ingreso, la exportación de
> reportes y el **sistema de Ayuda**.
>
> **Cambios de la v1.1:** sesión por cookie `httpOnly` (sin token en `localStorage`),
> páginas internas migradas a `.php`, exportación PDF/Excel generada en el servidor
> (`reportes.js`), panel admin con **Usuarios** (pestañas) y **Reportes**, y botón
> "Exportar Boletín" reubicado en la vista de estudiante.

---

## Índice
1. [Estructura del Proyecto](#1-estructura-del-proyecto)
2. [Módulo de Conexión a la API (`api.js`)](#2-módulo-de-conexión-a-la-api-apijs)
3. [Sesión de Usuario en el Cliente](#3-sesión-de-usuario-en-el-cliente)
4. [Flujo de Autenticación y Primer Ingreso](#4-flujo-de-autenticación-y-primer-ingreso)
5. [Recuperación de Contraseña](#5-recuperación-de-contraseña)
6. [Panel de Administrador](#6-panel-de-administrador)
7. [Panel de Profesor](#7-panel-de-profesor)
8. [Panel de Estudiante](#8-panel-de-estudiante)
9. [Sistema de Ayuda (`ayuda.html` / `ayuda.js`)](#9-sistema-de-ayuda-ayudahtml--ayudajs)
10. [Estilos y Convenciones Visuales](#10-estilos-y-convenciones-visuales)
11. [Exportación de Reportes (`reportes.js`)](#11-exportación-de-reportes-reportesjs)
12. [Notas Técnicas y Caché del Navegador](#12-notas-técnicas-y-caché-del-navegador)
13. [Pendientes / Mejoras Sugeridas](#13-pendientes--mejoras-sugeridas)

---

## 1. Estructura del Proyecto

```
frontend/
├── index.html                  # Login + modal de recuperación (público)
├── ayuda.html                  # Centro de ayuda (público, común a los 3 roles)
├── admin.php                   # Panel admin (requiere sesión rol admin)
├── profesor.php                # Panel profesor (requiere sesión rol profesor)
├── estudiante.php              # Panel estudiante (requiere sesión rol estudiante)
├── cambiar_password.php        # Cambio de contraseña de primer ingreso (profesor/estudiante)
├── configurar_preguntas.php    # 3 preguntas de seguridad (profesor/estudiante)
├── css/
│   ├── login.css               # Login, recuperación de contraseña, preguntas de seguridad
│   ├── admin.css
│   ├── profesor.css
│   ├── estudiante.css
│   └── ayuda.css
└── js/
    ├── api.js                  # Helper central de fetch (cookie de sesión)
    ├── reportes.js             # Diálogos y descarga de exportaciones PDF/Excel
    ├── login.js                # Lógica de index.html (login + recuperación)
    ├── cambiar_password.js     # Lógica de cambiar_password.php
    ├── configurar_preguntas.js # Lógica de configurar_preguntas.php
    ├── admin.js                # Lógica de admin.php
    ├── profesor.js             # Lógica de profesor.php
    ├── estudiante.js           # Lógica de estudiante.php
    └── ayuda.js                # Lógica de ayuda.html
```

Las páginas `.php` empiezan con `verificarSesionPagina('rol')`
(`api/config/verificar_sesion_pagina.php`). Si no hay sesión válida o el rol no coincide,
redirigen a `index.html`. **No deben existir versiones `.html` de esas cinco páginas**
(anularían la protección). Una página interna nueva debe ser `.php` y llevar esa línea como
primera línea del archivo.

Orden de scripts: `api.js` antes de cualquier script de panel. `reportes.js` se carga en
`admin.php`, `profesor.php` y `estudiante.php`, antes del script del panel, porque lo usan
los tres.

---

## 2. Módulo de Conexión a la API (`api.js`)

Punto único de configuración de la URL base:

```js
const API_URL = 'http://localhost/gestion_escolar/api';
```

### `apiFetch(endpoint, options)`
- Agrega `Content-Type: application/json` y siempre usa `credentials: 'include'`, para que
  el navegador adjunte la cookie `sesion_token`. **Ya no lee ningún token ni manda el
  header `Authorization`.**
- **401**: solo se trata como sesión expirada si el mensaje de error contiene "token";
  entonces limpia `localStorage.currentUser` y redirige a `index.html`. Otros 401 (por
  ejemplo "La contraseña actual es incorrecta") se devuelven al llamador.
- **403**: lanza un `Error` con el mensaje devuelto por el backend (`err.error`).
- En cualquier otro caso devuelve el `Response` sin procesar; quien llama decide si hace
  `.json()` y valida `res.ok`.

### `apiGet(endpoint)`
Hace `apiFetch`, lanza `Error` si `!res.ok` y devuelve `json.data ?? json`.

> **Nota:** varias vistas (`admin.js`, `profesor.js`, `estudiante.js`) no usan `apiGet` y
> repiten `const json = await res.json(); const data = json.data ?? json;`. Candidato a
> refactor. La excepción es `fetchAllPages()` de `admin.js`, que sí usa `apiGet`.

---

## 3. Sesión de Usuario en el Cliente

La sesión real vive en la cookie `sesion_token` (`httpOnly`, `samesite=Lax`, 8 horas),
inaccesible desde JavaScript. `localStorage.currentUser` guarda solo datos de interfaz,
**sin campo `token`**:

```json
{
  "email": "...",
  "rol": "admin | profesor | estudiante",
  "nombre": "...",
  "id_referencia": null,
  "password_cambiada": true,
  "preguntas_configuradas": true,
  "password_skipped": true
}
```

- `id_referencia`: `null` para admin; para profesor/estudiante es su `id` en la tabla
  correspondiente. Se usa para filtrar datos propios (ej. `profesor.js` compara
  `teacherId === id_referencia`).
- `password_cambiada` / `preguntas_configuradas`: controlan el flujo de primer ingreso.
- `password_skipped` (solo cliente): se agrega al presionar **"Más tarde"**. Nunca se envía
  al backend.

No existe refresco de sesión: a las 8 h la cookie vence y el siguiente `apiFetch` devuelve
401 con mensaje de token y redirige a `index.html`. Cada panel recarga la página si se
restaura desde bfcache (evento `pageshow`), para no mostrar datos de una sesión cerrada.

---

## 4. Flujo de Autenticación y Primer Ingreso

```
index.html (login)
      │
      ▼
 rol === 'admin'? ──► sí ──► admin.php (omite todo el flujo de primer ingreso)
      │ no
      ▼
 password_cambiada === false? ──► sí ──► cambiar_password.php
      │ no                                    │
      ▼                                       │ (guardar o "Más tarde")
 preguntas_configuradas === false? ──► sí ──► configurar_preguntas.php
      │ no                                    │
      ▼                                       ▼
 profesor.php / estudiante.php  ◄─────────────┘
```

### `login.js`
- Hace `POST /auth/login.php` directamente con `fetch` y `credentials: 'include'` (no usa
  `apiFetch`, porque aún no hay sesión).
- Guarda en `localStorage.currentUser` los campos recibidos (sin token).
- Redirige según `rol`, `password_cambiada` y `preguntas_configuradas` (ver diagrama).
- El backend bloquea la cuenta 15 minutos tras 5 intentos fallidos seguidos (HTTP 429); el
  mensaje se muestra con SweetAlert2.
- Si el `fetch` falla por completo, muestra "No se pudo conectar con el servidor". Un 500
  con HTML (en vez de JSON) provoca el mismo mensaje; en ese caso revisar el log de Apache
  y que la base de datos tenga las columnas `intentos_fallidos` y `bloqueado_hasta`.

### `cambiar_password.php` / `cambiar_password.js`
- Accesible para profesor y estudiante. Se autoprotege: si no hay `currentUser`, redirige a
  `index.html`; si `password_cambiada` ya es `true`, redirige al panel (o a
  `configurar_preguntas.php` si faltan las preguntas).
- Envía `POST /auth/cambiar_password.php` con `password_actual` y `password_nueva`.
- Botón **"Más tarde"** (`skipPasswordChange()`): si el rol es `admin`, va a `admin.php`; si
  es profesor/estudiante, marca `password_skipped = true` y continúa el flujo (preguntas de
  seguridad o panel).

### `configurar_preguntas.php` / `configurar_preguntas.js`
- Permite acceso si `password_cambiada` **o** `password_skipped` es verdadero.
- Carga las 8 preguntas predefinidas vía `GET /auth/preguntas_seguridad.php`.
- Renderiza 3 selects independientes; cada uno excluye las preguntas ya elegidas en los
  otros dos (`getOpcionesDisponibles`).
- Al enviar, hace `POST /auth/configurar_preguntas.php` con
  `{ preguntas: [{pregunta_id, respuesta}, ...] }` (exactamente 3).
- Actualiza `preguntas_configuradas = true` y redirige al panel según rol.

---

## 5. Recuperación de Contraseña

Implementada íntegramente en `index.html` (modal `#recoveryModal`) y `login.js`, **sin
requerir sesión activa**:

1. **Paso 1** — el usuario ingresa su número de identificación
   (`checkUserAndLoadQuestions()` → `GET /auth/preguntas_usuario.php?identificacion=`).
2. El frontend elige **una pregunta aleatoria** entre las configuradas por ese usuario
   (`Math.floor(Math.random() * preguntas.length)`) y la muestra.
3. **Paso 2** — el usuario responde la pregunta y define su nueva contraseña
   (`POST /auth/recuperar_password.php` con `identificacion`, `pregunta_id`, `respuesta`,
   `password_nueva`).
4. Si es exitoso, se limpia el formulario de login para que el usuario inicie sesión con la
   nueva contraseña. Este flujo **no** modifica `password_cambiada` en el backend.

> El modal se cierra con la `x`, haciendo clic fuera de él (`window.onclick`), o al
> completar la recuperación.

---

## 6. Panel de Administrador

**Archivos:** `admin.php` + `js/admin.js` + `css/admin.css` (+ `js/reportes.js`)

### Vistas (sidebar, `data-view`)
| Vista | Descripción |
|---|---|
| Dashboard | Tarjetas con totales (estudiantes, profesores, materias, matrículas) + actividad reciente **local** (no persiste al recargar). |
| **Usuarios** | Contenedor `#usersView` con dos pestañas internas: **Estudiantes** y **Profesores**. Cada pestaña conserva su CRUD paginado, búsqueda y gestión de contraseña inicial. |
| Materias | CRUD paginado server-side, con asignación de profesor. |
| Matrículas | Alta/baja de matrícula estudiante–materia, paginado y con búsqueda. |
| **Reportes** | Exportación PDF/Excel de cualquier estudiante, materia o grado (ver abajo). |

### Estructura de `admin.php`
Las vistas son **hermanas** dentro de `<main class="main-content">`, en este orden:
`dashboardView`, `usersView`, `subjectsView`, `enrollmentsView`, `reportsView`, los modales
y el cierre `</main>`. Cada vista cierra con su propio `</div>` antes de que empiece la
siguiente. Un `reportsView` anidado dentro de otra vista queda oculto y rompe la página.

### Usuarios: pestañas internas
- `#studentsView` y `#professorsView` tienen la clase `user-tab-panel` (no `view`). La
  navegación principal solo muestra u oculta `#usersView`; las pestañas (`.user-tab-btn`,
  `data-usertab`) alternan los paneles.
- **Estado sincronizado:** `loadStudentsPage()` y `loadProfessorsPage()` solo pintan la
  tabla si `currentActiveView` es `'students'` o `'professors'`. Por eso, al entrar a
  Usuarios, `currentActiveView` toma el valor de `currentUserTab` (la pestaña activa) y se
  actualiza al cambiar de pestaña. Si se rompe esta sincronía, las tablas quedan vacías.
- Al cambiar de pestaña no se vuelven a pedir datos; solo se llama a `renderStudents()` o
  `renderTeachers()`. Al entrar a Usuarios desde el sidebar sí se cargan ambas listas.

### Reportes (admin)
Formulario (`#reportsView`) con tres selects: Estudiante (opcional), Materia (opcional) y
Grado (lista fija 7°–12°). Combinaciones soportadas por `exportar.php`:

| Selección | Resultado |
|---|---|
| Solo estudiante | Boletín completo del estudiante (todas sus materias, I/II/III + nota final) |
| Estudiante + materia | Reporte individual de esa materia |
| Solo materia (+ grado opcional) | Reporte grupal |

- `loadReportsPage()` llena los selects con `fetchAllPages(endpoint)`, que recorre todas las
  páginas (el backend limita `per_page` a 100). Es necesario porque para admin `/materias/`
  y `/estudiantes/` devuelven un objeto paginado, no un array.
- `exportarReporteAdmin()` valida que haya al menos estudiante o materia, pide **formato** y
  luego **trimestre** (diálogos de `reportes.js`), e invoca `exportarReporte()`.
- El grado se ignora si hay un estudiante seleccionado.

### Paginación y búsqueda
Cada entidad mantiene su propio estado (`currentStudentPage`, `studentSearch`, `perPage`,
etc.) y su propio total, consultando `page`, `per_page` y `search` contra el backend. El
selector "por página" reinicia todas las páginas a 1.

### Gestión de contraseña inicial
- `generatePassword()`: contraseña aleatoria de 6 caracteres alfanuméricos.
- Botón regenerar (🔄): reemplaza el valor, siempre en modo solo lectura.
- Botón editar (✏️): habilita el campo para escritura libre (`togglePasswordEdit`).
- Al guardar, la contraseña se envía como `initialPassword` solo si es alumno/profesor nuevo
  o si el admin la cambió.

### Restablecer acceso (`resetStudentAccess` / `resetTeacherAccess`)
Genera una nueva contraseña y hace `PUT` reenviando los campos del usuario más
`initialPassword`. El backend resetea `password_cambiada` y `preguntas_configuradas`, y
borra sus preguntas de seguridad, forzando de nuevo el flujo de primer ingreso. El frontend
muestra la nueva contraseña en un `Swal.fire` para que el admin la comunique.

### Cambio de contraseña propia
Modal `#changePasswordModal`, disponible en el sidebar de los tres paneles
(`POST /auth/cambiar_password.php`).

---

## 7. Panel de Profesor

**Archivos:** `profesor.php` + `js/profesor.js` + `css/profesor.css` (+ `js/reportes.js`)

### Carga inicial (`loadData`)
Trae en paralelo (`Promise.all`) `materias`, `matriculas`, `notas` y `comentarios`, y luego
filtra en el cliente:
- `mySubjects`: materias donde `teacherId === id_referencia` del profesor.
- `myEnrollments` / `myGrades`: ya vienen filtrados por el backend según el rol.
- `myStudents`: se deriva de `myEnrollments`, deduplicando por `studentId`.

### Gestión de notas
- Selección de materia → lista de estudiantes agrupados por grado (`renderStudentsByGrade`),
  con búsqueda local por nombre, email o sección (`studentGradeSearch`).
- Modal de detalle por estudiante (`openStudentGradesModal`), con pestañas por trimestre
  (`I`, `II`, `III`, `Todas`).
- **Cálculo de nota trimestral en el cliente** (`calcularNotaTrimestral`,
  `generarResumenTrimestre`): replica la fórmula del backend
  (`(promedio_parciales + promedio_apreciacion + examen) / 3`, solo si los tres componentes
  existen). Se usa únicamente para la vista en pantalla.
- Alta de nota: valida rango 1.0–5.0 en el cliente, exige elegir un trimestre concreto (no
  "Todas") y bloquea la opción "Examen Trimestral" si ya existe uno para ese
  estudiante/materia/trimestre.
- Eliminación de nota: confirmación con SweetAlert2 antes de `DELETE /notas/`. La interfaz
  **no** ofrece editar notas, aunque el backend sí tiene `PUT /notas/`.
- Tras cualquier alta/baja, `reloadGradesAndRefresh()` vuelve a pedir `/notas/` y recalcula
  estadísticas y vistas dependientes.

### Exportación de reportes PDF / Excel
**Ya no se genera nada en el navegador.** Los archivos los produce
`GET /api/notas/exportar.php` (DomPDF y PhpSpreadsheet) y `reportes.js` solo pide las
opciones y descarga el resultado (ver sección 11). No se usan jsPDF ni SheetJS.

- **Grupal por grado** (`exportarReporteGrupal(grado)`): botón "Exportar Notas" junto al
  encabezado de cada grado en "Gestionar Notas". Pide **trimestre**, luego **formato**, y
  envía `materia_id` + `grado` + `trimestre`. Agrega una fila por estudiante e incluye un
  pie con total de estudiantes, promedio del grupo, aprobados y en proceso.
- **Individual** (`exportarReporteIndividual()`): botón "Exportar Notas" junto a las
  pestañas de trimestre del modal de estudiante. Pide formato y envía `materia_id` +
  `estudiante_id`, sin filtro de trimestre: incluye una fila por trimestre y la **Nota
  Final del Curso**, sin importar qué pestaña esté activa.
- Los valores sin registros se muestran como `S/N` (nunca como 0).
- Los cálculos los hace el backend (`notas_calculo.php`), la misma fuente que usa
  `GET /notas/?resumen=1`.

### Comentarios
Vista de solo lectura con los comentarios enviados por estudiantes en las materias del
profesor (`GET /comentarios/`, ya filtrado por rol en backend).

---

## 8. Panel de Estudiante

**Archivos:** `estudiante.php` + `js/estudiante.js` + `css/estudiante.css` (+ `js/reportes.js`)

### Carga inicial (`loadData`)
Trae `matriculas`, `notas` y `materias` en paralelo, y filtra `mySubjects` a solo las
materias en las que el estudiante está matriculado.

### Reporte de notas por trimestre
- `renderGradesReport()` construye una sección por cada uno de los 3 trimestres, mostrando
  por materia: botón "Ver notas (N)", nota trimestral (o "En curso" si falta algún
  componente) y un badge de estado (Aprobado / En proceso / Incompleto / Sin definir).
- Los trimestres son colapsables (clic en el encabezado).
- **Modal de detalle** (`openGradesDetailModal`): agrupa las notas por tipo (Parciales,
  Apreciación, Examen Trimestral) con su promedio y muestra el resumen del trimestre.
- El promedio general del dashboard (`myAverage`) es un promedio simple de todas las notas
  registradas por materia (no el promedio trimestral ponderado); es una métrica
  informativa distinta de la "nota trimestral" oficial.

### Exportación de boletines PDF / Excel
**Ya no se genera nada en el navegador**: todo pasa por `GET /api/notas/exportar.php` a
través de `exportarReporte()` de `reportes.js`. El backend fuerza siempre el `estudiante_id`
propio, así que el estudiante solo puede exportar sus datos.

- **Exportar Boletín** (`exportarBoletinCompleto()`): la tarjeta `.boletin-completo-card`
  está **justo bajo el header del Reporte Académico** (junto al promedio general), para
  verse sin hacer scroll. Pide el formato y genera el boletín con una fila por materia y
  columnas I, II, III y Nota Final.
- **Exportar Notas por trimestre** (`exportarBoletin(trimestre)`): botón en el encabezado de
  cada trimestre. Pide el formato y exporta ese trimestre en todas las materias, con
  columnas Prom. Parciales, Prom. Apreciación, Nota Examen y Nota Trimestral.
- Regla de `S/N`: si un componente no tiene notas, la celda muestra `S/N` en lugar de 0.
- `.boletin-completo-card` tiene `margin-bottom` para separarla del primer trimestre.

### Comentarios
El estudiante puede enviar un comentario sobre una materia en la que esté matriculado
(`POST /comentarios/`, valida en backend la matrícula) y ver el historial de sus propios
comentarios enviados.

---

## 9. Sistema de Ayuda (`ayuda.html` / `ayuda.js`)

Módulo de FAQ **contextual por rol**, accesible desde el botón "Ayuda" del sidebar en los
tres paneles (`admin.php`, `profesor.php`, `estudiante.php`), enlazando a `ayuda.html`
(que sigue siendo `.html` y público).

### Detección del rol activo
```js
function getCurrentRole() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    return user?.rol || null;
}
```
No requiere `apiFetch` ni llamadas a la API: la información es **estática**, definida como
arrays de objetos `{ q, a }` en `ayuda.js`. Si no hay usuario en sesión (o el rol no
coincide), se muestran **todas** las secciones como fallback.

### Contenido por bloques
| Constante | Contenido |
|---|---|
| `AYUDA_COMUN` | Login, primer ingreso, preguntas de seguridad, recuperación de contraseña, cambio de contraseña desde el panel, cerrar sesión. Se muestra siempre. |
| `AYUDA_ADMIN` | Dashboard, alta/baja/edición de estudiantes y profesores, materias, matrículas y **restablecer acceso**. |
| `AYUDA_PROFESOR` | Dashboard, materias asignadas, registrar y eliminar notas, ver comentarios. |
| `AYUDA_ESTUDIANTE` | Dashboard, consultar notas por trimestre, enviar comentarios y por qué una nota trimestral aparece "En curso". |
| `AYUDA_FAQ` | Preguntas transversales. Incluye un ítem solo para `admin` (`roles: ['admin']`) sobre por qué no se puede eliminar un registro con calificaciones asociadas. |

> **Contenido pendiente de actualizar** (ver sección 13): las preguntas de admin deberían
> indicar que estudiantes y profesores están en **Usuarios**, y faltan preguntas sobre
> Reportes y exportación de boletines. La pregunta "¿Cómo edito o elimino una nota?" del
> profesor debe decir solo "eliminar".

### Construcción dinámica de secciones (`buildSections(role)`)
1. Siempre agrega "Acceso al sistema" (`AYUDA_COMUN`).
2. Según el rol, agrega solo la sección correspondiente (admin, profesor o estudiante). Sin
   rol detectado, agrega las tres.
3. Filtra `AYUDA_FAQ` con `item.roles`, para que preguntas específicas de un rol no
   aparezcan a otros.
4. Siempre agrega "Preguntas frecuentes" al final.

### Renderizado y comportamiento de UI
- `renderAyuda(sections)` genera un acordeón: cada pregunta es clicable
  (`toggleAyudaItem`) y expande/colapsa su respuesta animando `max-height`.
- Las respuestas (`item.a`) permiten HTML con `<strong>`; las preguntas y títulos se
  escapan con `escapeHtmlAyuda()`.
- **Búsqueda en vivo** (`#ayudaSearch`): filtra preguntas y respuestas por subcadena
  (case-insensitive) contra `allSectionsCache`, ocultando secciones sin resultados y
  mostrando "No se encontraron resultados." si no hay coincidencias.
- `volverAlPanel()`: vuelve al panel según el rol (`admin.php`, `profesor.php`,
  `estudiante.php`); sin rol, cae a `index.html`.

### Cómo extender el contenido de ayuda
1. Agregar `{ q: '...', a: '...' }` al array correspondiente.
2. Si es exclusiva de un rol dentro de `AYUDA_FAQ`, agregar `roles: ['admin' | 'profesor' | 'estudiante']`.
3. No hace falta tocar nada más: el renderizado es dinámico.
4. Si se editan estilos, subir el `?v=` del `<link>` de `ayuda.css` (ver sección 12).

---

## 10. Estilos y Convenciones Visuales

Todas las hojas de estilo comparten una paleta de variables CSS (`:root`) con temática
"realeza / pergamino":

```css
--crimson:  #8B0000;   --crimson-deep: #5C0000;   --crimson-light: #B22222;
--gold:     #C9A84C;   --gold-light:   #E2C97E;   --gold-pale:     #F5E6B8;
--ivory:    #FAF6EE;   --ivory-dark:   #F0E8D5;   --parchment:     #E8DEC6;
--ink:      #1A0A0A;   --ink-soft:     #3B1A1A;
```

- Tipografías: `Cinzel` (títulos, mayúsculas espaciadas), `Cormorant Garamond` (texto
  itálico/decorativo), `EB Garamond` (cuerpo), cargadas vía Google Fonts. Los componentes
  nuevos deben usar estas, con bordes de 2px (no `Quicksand` ni `border-radius: 8px`).
- Iconografía: Font Awesome 6 (CDN).
- Cada panel reutiliza la misma estructura de sidebar fijo + `.main-content`, y el patrón
  `.view` / `.view.active` para alternar secciones sin recargar (SPA simple por
  ocultamiento de `div`s). Dentro de "Usuarios" se usa `.user-tab-panel` /
  `.user-tab-panel.active` con el mismo principio.
- Componentes de admin añadidos: `.users-tabs`, `.user-tab-btn` (activa en crimson),
  `.card` (antes solo existía en `profesor.css` y `estudiante.css`), `.reports-card`,
  `.reports-help` y `.report-form`.
- Los modales comparten la clase `.modal` / `.modal-content`, con un bloque duplicado al
  final de `admin.css`, `profesor.css` y `estudiante.css` (redundante, candidato a limpieza).
- SweetAlert2 se usa de forma consistente para confirmaciones, errores y toasts.

---

## 11. Exportación de Reportes (`reportes.js`)

Archivo compartido por los tres paneles. El archivo lo genera el backend
(`GET /notas/exportar.php`); aquí solo se piden las opciones y se descarga.

| Función | Qué hace |
|---|---|
| `elegirFormatoExportacion()` | Diálogo PDF / Excel / Cancelar. Devuelve `'pdf'`, `'excel'` o `null`. |
| `elegirTrimestreExportacion()` | Selector de trimestre o "Todos los trimestres". Devuelve `'I Trimestre'`, `'II Trimestre'`, `'III Trimestre'`, `'TODOS'` o `null` si se cancela. |
| `exportarReporte({format, materia_id, estudiante_id, trimestre, grado})` | Arma la query, llama a `/notas/exportar.php`, toma el nombre del header `Content-Disposition` y descarga el blob. Si `trimestre` es `'TODOS'` o vacío, no filtra por trimestre. Si el backend responde error, lo muestra con SweetAlert2. |

Antes, `elegirFormatoExportacion` estaba duplicada en `estudiante.js` y `profesor.js`; ahora
es una sola.

**Quién llama a qué:**
| Panel | Acción | Parámetros enviados |
|---|---|---|
| Estudiante | Exportar Boletín | `format` |
| Estudiante | Exportar Notas (trimestre) | `format`, `trimestre` |
| Profesor | Grupal por grado | `format`, `materia_id`, `grado`, `trimestre` |
| Profesor | Individual | `format`, `materia_id`, `estudiante_id` |
| Admin | Reportes | `format`, `trimestre`, `estudiante_id`, `materia_id`, `grado` (según selección) |

**Nombres de archivo:** los define el backend (sin acentos ni espacios, máx. 80
caracteres), con extensión `.pdf` o `.xlsx`. Por ejemplo: `reporte_grupal_<materia>[_<grado>][_<trimestre>]`,
`reporte_<estudiante>_<materia>[_<trimestre>]`, `boletin_<estudiante>` y
`reporte_notas_<estudiante>_<trimestre>`.

---

## 12. Notas Técnicas y Caché del Navegador

Varios archivos (`ayuda.css`, `admin.css`, `admin.js`) incluyen comentarios sobre un
problema recurrente: los cambios no se reflejan aunque se recargue con `Ctrl+Shift+R`,
por caché agresiva del archivo estático.

**Solución:** en la etiqueta `<link>` o `<script>` que carga el archivo, subir manualmente
el parámetro de versión:
```html
<link rel="stylesheet" href="css/ayuda.css?v=3.0" />
<script src="js/admin.js?v=2"></script>
```
Cada valor distinto de `?v=` fuerza al navegador a descargar el archivo de nuevo. Solo es
necesario mientras se edita activamente el archivo.

> `ayuda.html` ya usa `?v=3.0`; las páginas `admin.php`, `profesor.php` y `estudiante.php`
> referencian sus CSS/JS **sin** versión. Conviene unificar el criterio si el equipo sigue
> iterando.

---

## 13. Pendientes / Mejoras Sugeridas

| Área | Descripción |
|---|---|
| **Refresco de sesión** | No hay renovación ni aviso antes del vencimiento (8 h); el usuario es desconectado en la siguiente llamada a `apiFetch`. |
| **Actividad reciente (admin)** | Solo en memoria (`activities` en `admin.js`); se pierde al recargar. Podría persistirse en backend. |
| **Reglas `.modal` duplicadas** | Se repiten en los tres CSS de panel; consolidar en un CSS compartido. |
| **Uso inconsistente de `apiGet`** | Varias vistas repiten `json.data ?? json` en vez de usar `apiGet`. |
| **Versionado de caché `?v=`** | Falta en la mayoría de páginas fuera de `ayuda.html`. |
| **Selects paginados (admin)** | "Asignar materia" y el modal de materia usan solo la página actual de estudiantes/profesores/materias; la columna Profesor de Materias puede mostrar "Sin asignar" si el profesor no está en la página cargada. Se puede reutilizar `fetchAllPages()`. |
| **HTML mal formado** | `profesor.php` cierra `</html>` antes de sus scripts; `estudiante.php` repite CSS y SweetAlert; `admin.php` carga SweetAlert dos veces si no se limpia. |
| **Escapado** | `escapeHtml` no escapa comillas; `openGradesDetailModal` se rompe con un apóstrofo en el nombre de la materia, y varios `<option>` insertan valores sin escapar. |
| **Ayuda desactualizada** | Actualizar `ayuda.js`: admin (Usuarios, Reportes), profesor (quitar "editar" nota, agregar Exportar Notas) y estudiante (Exportar Boletín). |
| **Orden de diálogos de exportación** | Admin pide formato → trimestre; profesor grupal pide trimestre → formato. Conviene unificar. |
| **Admin: comentarios** | La matriz de permisos del backend permite al admin ver todos los comentarios, pero no hay vista. |
| **Panel de períodos** | Pendiente en backend (tabla `periodo`). Al implementarse, el frontend de profesor deberá deshabilitar el alta de notas fuera del período activo. |

**Resueltos en la v1.1 (retirados de la lista):** fusión Estudiantes/Profesores en
"Usuarios", vista Reportes del admin, reubicación del botón "Exportar Boletín", filtro de
trimestre en el reporte grupal, boletín individual y grupal del profesor, exportación del
boletín consolidado del estudiante.

---

*Documentación de frontend generada para uso interno del equipo de desarrollo, como
complemento a `documentacion_backend_v2.3.md`.*