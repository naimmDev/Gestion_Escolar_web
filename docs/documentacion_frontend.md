# Documentación Frontend — Sistema de Gestión Escolar
**Versión:** 2.4.1
**Stack:** HTML5 · CSS3 · JavaScript (vanilla, sin frameworks) · SweetAlert2 · Font Awesome 6
**Consumo de API:** `http://localhost/gestion_escolar/api` (ver `documentacion_backend.md`, v2.5.0)
**Fecha:** Octubre 2026

> Este documento complementa `documentacion_backend.md`. Cubre la estructura de
> páginas, los scripts JS, el flujo de autenticación/primer ingreso, la exportación de
> reportes, el **sistema de Ayuda** y el **panel de períodos**.
>
> **Cambios de la v2.4.0 a la v2.4.1:**
> - Profesor → **Gestionar Notas**: al elegir una materia, los grados y sus secciones aparecen
>   contraídos; al buscar, se despliegan únicamente los grados y secciones con resultados.
> - El aviso de trimestre cerrado aparece antes del resumen/encabezado de notas registradas.
>   Se documentan también los estilos visuales de los campos y del botón deshabilitados.
>
> **Cambios de la v2.3.0 a la v2.4.0:**
> - Admin → nueva vista **Períodos**: abrir/cerrar trimestres y editar fechas informativas.
> - Profesor: en un trimestre **cerrado** el formulario de notas queda deshabilitado (campos y
>   botón "Guardar" en gris, con aviso) y se ocultan los botones **Eliminar** de esas notas.
>   Un `409 TRIMESTRE_CERRADO` del backend se maneja con aviso y refresco de estado.
> - Ayuda: preguntas nuevas sobre períodos (admin y profesor).
> - Limpieza de pendientes ya resueltos (versionado `?v=`, orden de scripts, código sin uso,
>   ayuda desactualizada, panel de períodos).
>
> **Cambios de la v2.2.1 a la v2.3.0:**
> - Recuperación de contraseña: el **servidor** elige la pregunta (ya no el frontend), con
>   pregunta señuelo y mensaje de error genérico.
> - Admin → **Reportes**: nuevo filtro por **sección**, buscador de estudiantes **en el
>   servidor**, buscador de materias y **vista previa** del reporte a generar.
> - Admin → **Matrículas**: filtros de grado/sección/búsqueda para el estudiante y
>   selección **múltiple** de materias.
> - Admin → **Materias**: selector de profesor con buscador; columnas "Profesor" y "Materias"
>   calculadas con la lista completa (no solo la página actual).
> - Profesor: estudiantes agrupados por **grado → sección**, con exportación grupal por
>   sección.
> - Orden de diálogos de exportación unificado: **trimestre → formato**.
> - Limpieza de CSS/HTML y de `escapeHtml` ya resuelta (se retiran de pendientes).

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

Las páginas `.php` empiezan con `verificarSesionPagina(...)`
(`api/config/verificar_sesion_pagina.php`). Si no hay sesión válida o el rol no coincide,
redirigen a `index.html`. Roles permitidos por página:

| Página | Roles |
|---|---|
| `admin.php` | `admin` |
| `profesor.php` | `profesor` |
| `estudiante.php` | `estudiante` |
| `cambiar_password.php` | `profesor`, `estudiante` |
| `configurar_preguntas.php` | `profesor`, `estudiante` |

**No deben existir versiones `.html` de esas cinco páginas** (anularían la protección). Una
página interna nueva debe ser `.php` y llevar esta línea como primera línea del archivo:

```php
<?php require_once '../api/config/verificar_sesion_pagina.php'; verificarSesionPagina('ROL_AQUI'); ?>
```

Orden de scripts (igual en los tres paneles): `api.js`, `reportes.js` y por último el script
del panel. `reportes.js` se carga en `admin.php`, `profesor.php` y `estudiante.php` porque lo
usan los tres.

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
Hace `apiFetch`, lanza `Error` si `!res.ok` y devuelve `json.data ?? json`. Lo usan
`fetchAllPages()`, `buscarEstudiantes()`, `cargarSecciones()` y `loadPeriodsPage()` de
`admin.js`.

> **Nota:** las cargas principales de `admin.js` (`loadXxxPage`), `profesor.js` y
> `estudiante.js` no usan `apiGet` y repiten `const json = await res.json(); const data =
> json.data ?? json;`. Candidato a refactor.

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
- **Guardas en cada panel:** `profesor.js` y `estudiante.js` redirigen a `index.html` si no
  hay `currentUser` o el rol no coincide, y a `cambiar_password.php` si
  `!password_cambiada && !password_skipped`. `admin.js` solo verifica rol `admin`.

No existe refresco de sesión: a las 8 h la cookie vence y el siguiente `apiFetch` devuelve
401 con mensaje de token y redirige a `index.html`. Cada panel recarga la página si se
restaura desde bfcache (evento `pageshow`), para no mostrar datos de una sesión cerrada.

> **Importante al probar con varios roles:** la cookie `sesion_token` es **una sola por
> navegador**. Iniciar sesión como profesor en otra pestaña reemplaza la cookie del admin: la
> pestaña del admin sigue abierta, pero el servidor ya la trata como profesor (por ejemplo, un
> `PUT /periodos/` responde 403 "No tienes permisos para esta acción"). Para probar dos roles a
> la vez hay que usar **dos navegadores distintos** o una ventana normal y una de incógnito.

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
  mensaje se muestra con SweetAlert2. Para desbloquear antes hay que resetear
  `intentos_fallidos` / `bloqueado_hasta` en la tabla `usuario`.
- Si el `fetch` falla por completo, muestra "No se pudo conectar con el servidor. Verifica
  que XAMPP esté corriendo." Un 500 con HTML (en vez de JSON) provoca el mismo mensaje; en
  ese caso revisar el log de Apache y que la base de datos tenga las columnas
  `intentos_fallidos` y `bloqueado_hasta`.

### `cambiar_password.php` / `cambiar_password.js`
- Accesible para profesor y estudiante. Se autoprotege: si no hay `currentUser`, redirige a
  `index.html`; si `password_cambiada` ya es `true`, redirige al panel (o a
  `configurar_preguntas.php` si faltan las preguntas).
- Envía `POST /auth/cambiar_password.php` con `password_actual` y `password_nueva`
  (mínimo 6 caracteres, validado también en el cliente).
- Botón **"Más tarde"** (`skipPasswordChange()`): si el rol es `admin`, va a `admin.php`; si
  es profesor/estudiante, marca `password_skipped = true` y continúa el flujo (preguntas de
  seguridad o panel).

### `configurar_preguntas.php` / `configurar_preguntas.js`
- Permite acceso si `password_cambiada` **o** `password_skipped` es verdadero.
- Carga las 8 preguntas predefinidas vía `GET /auth/preguntas_seguridad.php`.
- Renderiza 3 selects independientes; cada uno excluye las preguntas ya elegidas en los
  otros dos (`getOpcionesDisponibles`), conservando lo escrito en las respuestas al repintar.
- Al enviar, hace `POST /auth/configurar_preguntas.php` con
  `{ preguntas: [{pregunta_id, respuesta}, ...] }` (exactamente 3, sin repetir).
- Actualiza `preguntas_configuradas = true` y redirige al panel según rol.

---

## 5. Recuperación de Contraseña

Implementada íntegramente en `index.html` (modal `#recoveryModal`) y `login.js`, **sin
requerir sesión activa**:

1. **Paso 1** — el usuario ingresa su número de identificación
   (`checkUserAndLoadQuestions()` → `GET /auth/preguntas_usuario.php?identificacion=`).
2. **El servidor elige la pregunta**: el endpoint devuelve **una sola**
   `{ pregunta_id, pregunta }`, escogida al azar entre las que el usuario configuró. Si la
   identificación no existe o el usuario no tiene preguntas, devuelve una **pregunta
   señuelo** con la misma forma de respuesta. Por eso el frontend **ya no elige
   aleatoriamente** (se retiró `Math.random`) y el paso 2 siempre se muestra: el error
   aparece recién al enviar la respuesta. Esto evita que el flujo revele qué
   identificaciones existen.
3. El frontend guarda `identificacion` y `pregunta_id` (`recoveryUserData`,
   `selectedPreguntaId`) y muestra la pregunta.
4. **Paso 2** — el usuario responde y define su nueva contraseña
   (`POST /auth/recuperar_password.php` con `identificacion`, `pregunta_id`, `respuesta`,
   `password_nueva`; validación local: mínimo 6 caracteres y confirmación igual).
5. Si es exitoso, se cierra el modal y se limpian los campos del login. El backend **no**
   modifica `password_cambiada`, pero sí **cierra todas las sesiones activas** del usuario.

**Errores que puede mostrar el modal:**
- `401` — "Identificación, pregunta o respuesta incorrecta" (mensaje único para identificación
  inexistente, pregunta que no corresponde y respuesta incorrecta).
- `429` — cuenta bloqueada temporalmente. El contador de intentos es **el mismo** que el del
  login (5 intentos / 15 minutos).

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
| Materias | CRUD paginado server-side, con asignación de profesor mediante buscador. |
| Matrículas | Alta (múltiple) y baja de matrícula estudiante–materia, paginado y con búsqueda. |
| **Reportes** | Exportación PDF/Excel de cualquier estudiante, materia, grado o sección (ver abajo). |
| **Períodos** | Una tarjeta por trimestre con badge Abierto/Cerrado, botón Abrir/Cerrar y fechas informativas (ver abajo). |

### Estructura de `admin.php`
Las vistas son **hermanas** dentro de `<main class="main-content">`, en este orden:
`dashboardView`, `usersView`, `subjectsView`, `enrollmentsView`, `reportsView`,
`periodsView`, los modales y el cierre `</main>`. Cada vista cierra con su propio `</div>`
antes de que empiece la siguiente. Una vista anidada dentro de otra (por ejemplo
`reportsView` o `periodsView`) queda oculta y rompe la página.

### Comportamientos generales
- `openModal(id)` / `closeModal(id)` son globales (`display:flex` + clase `show`, y bloqueo
  del scroll del `body`).
- Los modales se cierran con **Esc** y con clic fuera del contenido (un solo listener).
- La sesión se verifica al cargar: si `currentUser.rol !== 'admin'` redirige a `index.html`.

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
- **Columnas:** Estudiantes → N°, Identificación, Contraseña Inicial, Nombre, Email, Grado,
  Sección, Acciones. Profesores → N°, Identificación, Contraseña Inicial, Nombre, Email,
  Especialidad, Materias, Acciones.
- **Contraseña Inicial:** el backend solo la devuelve mientras el usuario no haya cambiado su
  contraseña; después llega `null` y la tabla muestra `......`.
- **Columna "Materias" (profesores):** se calcula con la lista **completa** de materias
  (`allSubjectsCache`, vía `getAllSubjects()`), no solo con la página actual; se usa la
  página actual solo como respaldo si la carga falla.

### Materias
- **Columna "Profesor"** en la tabla: usa `allTeachersCache` (lista completa de profesores,
  `getAllTeachers()`), con la página actual como respaldo.
- **Modal de materia** (crear/editar): el profesor se elige con un buscador
  (`#subjectTeacherSearch` + `<select id="subjectTeacher" size="6">`) montado por
  `montarBuscadorProfesores(BUSCADOR_PROFESOR, profesores, seleccionadoId)`. Busca por
  nombre, identificación, email o especialidad (sin distinguir acentos, con
  `normalizarTexto`), muestra un máximo de 100 opciones e **incluye siempre el profesor ya
  asignado** aunque no entre en el corte. La opción vacía "-- Ninguno --" deja la materia sin
  profesor.
- **Cachés:** `invalidateTeachersCache()` se llama tras crear/editar/eliminar un profesor;
  `loadSubjectsPage()` reinicia `allSubjectsCache` y `loadProfessorsPage()` lo vuelve a cargar.

### Matrículas: asignación múltiple
- `openEnrollmentModal()` muestra:
  - **Estudiante:** filtros de **grado** y **sección** + caja de búsqueda + lista
    (`#enrollmentStudent`, `size=6`), con búsqueda en el servidor (ver "Buscador de
    estudiantes").
  - **Materias:** lista de casillas con buscador por nombre o código
    (`#enrollmentSubjectList`). La selección vive en `matriculaSel` (Set) y se conserva al
    filtrar. Las materias se cargan completas con `fetchAllPages('/materias/')`.
- El submit envía `{ studentId, subjectIds }` a `POST /matriculas/` y muestra cuántas se
  crearon y cuántas ya existían.

### Buscador de estudiantes (búsqueda en el servidor)
Usado por **Reportes** (`BUSCADOR_REPORTES`) y por el modal de **Matrículas**
(`BUSCADOR_MATRICULA`). No precarga la lista de estudiantes: cada filtro o escritura consulta
al backend.

- `montarBuscadorEstudiantes(cfg)`: enlaza una sola vez los eventos (`cfg.enlazado`) y lanza
  la primera búsqueda.
- Al cambiar el **grado** se recargan las secciones (`cargarSecciones` →
  `GET /estudiantes/?secciones=1&grado=`) y se busca de nuevo. Al cambiar la **sección** se
  busca de nuevo.
- Al escribir se aplica un *debounce* de 300 ms.
- `buscarEstudiantes(cfg)` pide `GET /estudiantes/?page=1&per_page=50&search=&grado=&seccion=`
  (máximo 50 resultados). Cada petición lleva un `reqId`; si llega una respuesta vieja se
  descarta.
- Cada opción se muestra como `Nombre · identificación · grado sección`. Debajo, un texto
  indica "N estudiante(s)", "Mostrando X de Y…" o "Sin resultados con esos filtros".
- Conserva la selección previa si el estudiante sigue en los resultados.

### Reportes (admin)
Formulario (`#reportsView`) con estos controles:

| Control | Detalle |
|---|---|
| **Grado** | Lista fija 7°–12° (`#reportGradeSelect`). Filtra la lista de estudiantes y acota el reporte grupal. |
| **Sección** | `#reportSectionFilter`. Sus opciones se cargan del backend según el grado elegido. |
| **Estudiante (opcional)** | Buscador en el servidor (ver arriba). |
| **Materia (opcional si hay estudiante)** | Buscador local (`montarBuscadorMaterias`) sobre todas las materias cargadas con `fetchAllPages('/materias/')`. |
| **Vista previa** | Línea `#reportPreview` que dice qué reporte se generará (`actualizarVistaPreviaReporte`). |

Combinaciones soportadas por `exportar.php`:

| Selección | Resultado |
|---|---|
| Solo estudiante | Boletín completo del estudiante (todas sus materias, I/II/III + nota final) |
| Estudiante + materia | Reporte individual de esa materia |
| Solo materia (+ grado y/o sección opcionales) | Reporte grupal |

- `exportarReporteAdmin()` valida que haya al menos estudiante o materia, pide primero el
  **trimestre** y luego el **formato** (diálogos de `reportes.js`), e invoca
  `exportarReporte()`.
- **Grado y sección solo se envían si no hay estudiante seleccionado** (en reportes
  individuales y boletines el backend los ignora).
- `fetchAllPages(endpoint)` recorre todas las páginas de un endpoint paginado en paralelo (el
  backend limita `per_page` a 100). Es necesario porque para admin `/materias/` y
  `/profesores/` devuelven un objeto paginado, no un array.

### Períodos (admin)
Vista `#periodsView` (botón `data-view="periods"`, ícono `fa-calendar-check`). Permite abrir y
cerrar trimestres; un trimestre **cerrado** impide a los profesores crear, editar o eliminar
notas (la regla la aplica el backend; ver `documentacion_backend.md`, sección 8).

- `loadPeriodsPage()` se ejecuta al entrar a la vista: pide `GET /periodos/` con `apiGet` y
  guarda el resultado en el arreglo `periods`. Si falla, muestra "No se pudieron cargar los
  períodos" y un `Swal` con el error.
- `renderPeriods()` pinta una tarjeta (`.period-card`) por trimestre, con borde verde si está
  abierto y crimson si está cerrado, badge **Abierto/Cerrado** según el booleano `abierto`,
  dos `<input type="date">` (inicio y fin) y dos botones:
  - **Guardar fechas** → `guardarFechasPeriodo(trimestre, id)`: `PUT /periodos/` con
    `{ trimestre, fecha_inicio, fecha_fin }` (`null` si el campo está vacío, lo que borra la
    fecha). Si inicio > fin, el backend responde 400 y se muestra su mensaje.
  - **Cerrar / Abrir** → `cambiarEstadoPeriodo(trimestre, estado)`: `PUT /periodos/` con
    `{ trimestre, estado }`. **Cerrar pide confirmación** ("Los profesores no podrán
    registrar, editar ni eliminar notas de este trimestre"); **Abrir no**.
- `actualizarPeriodo(payload, mensajeOk, actividad)` centraliza los `PUT`: tras una respuesta
  correcta reemplaza `periods` por `json.data` (el backend devuelve la lista completa
  actualizada), repinta, muestra el toast y agrega la actividad reciente.
- **Las fechas son solo informativas**: no abren ni cierran nada solas. La lógica usa siempre
  `abierto`, nunca las fechas.
- Pueden estar abiertos **varios trimestres a la vez** (por ejemplo, para corregir uno
  anterior). No se asume que solo el III esté abierto.
- No existe alta ni baja de períodos: los tres trimestres siempre existen.
- Requisito de despliegue: la tabla `periodo` debe existir (migración
  `database/migraciones/2026-10-22_periodos.sql`). Sin ella, `GET /periodos/` responde 500
  "Error interno del servidor" y, además, registrar o eliminar notas también falla.

### Paginación y búsqueda
Cada entidad mantiene su propio estado (`currentStudentPage`, `studentSearch`, `perPage`,
etc.) y su propio total, consultando `page`, `per_page` y `search` contra el backend. El
selector "por página" (10/25/50) reinicia todas las páginas a 1.

### Gestión de contraseña inicial
- `generatePassword()`: contraseña aleatoria de 6 caracteres alfanuméricos.
- Botón regenerar (🔄): reemplaza el valor, siempre en modo solo lectura.
- Botón editar (✏️): habilita el campo para escritura libre (`togglePasswordEdit`).
- Al guardar, la contraseña (mínimo 6 caracteres) se envía como `initialPassword` solo si es
  alumno/profesor nuevo o si el admin la cambió.

### Restablecer acceso (`resetStudentAccess` / `resetTeacherAccess`)
Genera una nueva contraseña y hace `PUT` reenviando los campos del usuario más
`initialPassword`. El backend resetea `password_cambiada` y `preguntas_configuradas`, y
borra sus preguntas de seguridad, forzando de nuevo el flujo de primer ingreso. El frontend
muestra la nueva contraseña en un `Swal.fire` para que el admin la comunique. No limpia un
bloqueo por intentos fallidos (ver sección 4).

### Eliminaciones
`deleteStudent` y `deleteSubject` piden confirmación y, si el backend responde `409` con
`details.requiresConfirmation === 'comentarios'`, muestran una segunda confirmación y repiten
la petición con `confirmar_comentarios: true`. Si el registro tiene notas, el backend lo
rechaza y se muestra su mensaje.

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
- `myStudents`: se deriva de `myEnrollments`, deduplicando por `studentId` (incluye grado,
  email y sección).
- Después llama a `cargarPeriodos()` para conocer qué trimestres están abiertos (ver
  "Períodos").

### Gestión de notas
- Selección de materia → estudiantes agrupados por **grado y, dentro de cada grado, por
  sección** (`renderStudentsByGrade`):
  - Los grados se ordenan 7° → 12° (los desconocidos, al final).
  - Las secciones se ordenan A, B, C… y **"Sin sección"** va al final. Si un grado solo tiene
    estudiantes sin sección, se listan directamente sin sub-bloques.
  - Al elegir una materia, los grados aparecen contraídos; las secciones dentro de cada grado
    también aparecen contraídas cuando el grado tiene sub-secciones. Cada encabezado se puede
    expandir o contraer manualmente.
  - La búsqueda local por nombre, email o sección (`studentGradeSearch`) filtra los resultados
    y abre sus grados y secciones coincidentes; los grupos sin coincidencias no se muestran.
- Estadísticas rápidas (`updateQuickStats`): total de estudiantes, promedio del grupo,
  aprobados y en proceso. Usan el **promedio simple** de las notas del estudiante en esa
  materia; un estudiante cuenta como "aprobado" solo si tiene examen trimestral registrado y
  promedio ≥ 3, de lo contrario cuenta como "en proceso".
- Modal de detalle por estudiante (`openStudentGradesModal`, `async`), con pestañas por
  trimestre (`I`, `II`, `III`, `Todas`). El encabezado muestra nombre, sección, email, grado y
  materia. Al abrirlo vuelve a llamar a `cargarPeriodos()`, por si el admin cambió un estado
  mientras la página estaba abierta.
- **Cálculo de nota trimestral en el cliente** (`calcularNotaTrimestral`,
  `generarResumenTrimestre`): replica la fórmula del backend
  (`(promedio_parciales + promedio_apreciacion + examen) / 3`, solo si los tres componentes
  existen). Se usa únicamente para la vista en pantalla.
- **Alta de nota** (`addNewGrade`): campos tipo de evaluación (Parcial / Examen Trimestral /
  Apreciación), tipo de actividad (opcional), nombre de la actividad (opcional), nota y
  comentario (opcionales). Valida, en este orden: que se haya elegido un trimestre concreto
  (no "Todas"), que ese trimestre esté **abierto** (`trimestreAbierto`), el rango 1.0–5.0 y
  que no exista ya un "Examen Trimestral" para ese estudiante/materia/trimestre. Un `409` del
  backend se muestra como aviso.
- **Historial**: si una nota no tiene nombre, se muestra con un nombre automático
  (`Parcial 1`, `Apreciación 2`, …) según el orden de registro dentro del mismo trimestre y
  tipo.
- **Eliminación** de nota: confirmación con SweetAlert2 antes de `DELETE /notas/`. La
  interfaz **no** ofrece editar notas, aunque el backend sí tiene `PUT /notas/`.
- Tras cualquier alta/baja, `reloadGradesAndRefresh()` vuelve a pedir `/notas/` y recalcula
  estadísticas y vistas dependientes.

### Períodos (profesor)
El backend es la autoridad: rechaza con `409` cualquier alta o baja de notas en un trimestre
cerrado. El frontend solo evita que el profesor choque con ese error.

- `periodos` es un mapa `{ 'I Trimestre': true|false, ... }` (`true` = abierto), llenado por
  `cargarPeriodos()` desde `GET /periodos/`.
- `trimestreAbierto(t)` devuelve `periodos[t] !== false`: si no hay dato o la carga falló, se
  **asume abierto** y el backend decide.
- **Trimestre cerrado** (pestaña I, II o III): en `renderTrimestreContent()` el formulario
  "Agregar nueva evaluación" **sigue visible pero deshabilitado**: todos sus campos y el botón
  **Guardar** quedan en gris (`disabled`, tooltip "Trimestre cerrado"). El banner
  `.period-closed-banner` ("Este trimestre está cerrado: solo lectura") se muestra encima del
  resumen trimestral o del encabezado "Notas registradas", antes del formulario.
- **Botón Eliminar:** se decide **por nota** (`trimestreAbierto(grade.trimestre)` en
  `renderGradeHistoryItem`), no por la pestaña. Por eso la pestaña "Todas", que mezcla
  trimestres, solo muestra Eliminar en las notas de trimestres abiertos.
- **Respuesta 409:** `manejarTrimestreCerrado(error)` detecta
  `details.codigo === 'TRIMESTRE_CERRADO'`, muestra el aviso, refresca `periodos` y repinta el
  modal para que la interfaz quede coherente. Se usa en `addNewGrade()` y `deleteGrade()`.
  Otros 409 (por ejemplo, examen duplicado) siguen mostrándose como aviso normal.
- Las lecturas no cambian: el profesor sigue viendo las notas, el resumen del trimestre y
  puede exportar reportes de trimestres cerrados.

### Exportación de reportes PDF / Excel
**Ya no se genera nada en el navegador.** Los archivos los produce
`GET /api/notas/exportar.php` (DomPDF y PhpSpreadsheet) y `reportes.js` solo pide las
opciones y descarga el resultado (ver sección 11). No se usan jsPDF ni SheetJS.

- **Grupal por grado o por sección** (`exportarReporteGrupal(grado, seccion = null)`):
  - Botón **"Exportar Notas"** junto al encabezado de cada grado → reporte del grado completo.
  - Botón **"Exportar {grado} {sección}"** dentro del encabezado de cada sección → reporte de
    esa sección.
  - Antes de pedir nada verifica que haya estudiantes en esa selección. Pide **trimestre**,
    luego **formato**, y envía `materia_id` + `grado` (+ `seccion`) + `trimestre`. El reporte
    trae una fila por estudiante y un pie con total de estudiantes, promedio del grupo,
    aprobados y en proceso. La sección "Sin sección" se envía tal cual y el backend la
    interpreta como vacía.
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

*Sin cambios por el panel de períodos: el estudiante ve sus notas de los tres trimestres
aunque estén cerrados.*

### Carga inicial (`loadData`)
Trae `matriculas`, `notas` y `materias` en paralelo, y filtra `mySubjects` a solo las
materias en las que el estudiante está matriculado.

### Dashboard
Muestra número de materias, promedio general y materias aprobadas. Ambos valores se calculan
con el **promedio simple** de todas las notas registradas por materia (`calcularPromedioSimple`);
una materia cuenta como aprobada si ese promedio es ≥ 3. Es una métrica informativa distinta
de la "nota trimestral" oficial.

### Reporte de notas por trimestre
- `renderGradesReport()` construye, en este orden: el encabezado con el promedio general, la
  tarjeta de **Exportar Boletín** y una sección por cada uno de los 3 trimestres, mostrando
  por materia: botón "Ver notas (N)", nota trimestral (o "En curso" si falta algún
  componente) y un badge de estado (Aprobado / En proceso / Incompleto / Sin definir).
- Los trimestres son colapsables (clic en el encabezado).
- **Modal de detalle** (`openGradesDetailModal`): agrupa las notas por tipo (Parciales,
  Apreciación, Examen Trimestral) con su promedio y muestra el resumen del trimestre.

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
| `AYUDA_COMUN` | Login, primer ingreso, preguntas de seguridad, recuperación de contraseña, cambio de contraseña desde el panel, **bloqueo de cuenta tras 5 intentos fallidos** y cerrar sesión. Se muestra siempre. |
| `AYUDA_ADMIN` | Dashboard, sección **Usuarios** (pestañas), alta/baja/edición de estudiantes y profesores, materias, **matrícula múltiple**, **Reportes** (filtros por grado y sección, vista previa y qué reporte se genera según la selección), **restablecer acceso** y **cómo abrir o cerrar un trimestre**. |
| `AYUDA_PROFESOR` | Dashboard, materias asignadas, registrar y eliminar notas, exportar notas de un grado o de una sección, exportar el reporte de un estudiante, ver comentarios y **por qué no se pueden registrar o eliminar notas (trimestre cerrado)**. |
| `AYUDA_ESTUDIANTE` | Dashboard, consultar notas por trimestre, descargar notas/boletín, enviar comentarios y por qué una nota trimestral aparece "En curso". |
| `AYUDA_FAQ` | Preguntas transversales. Incluye un ítem solo para `admin` (`roles: ['admin']`) sobre por qué no se puede eliminar un registro con calificaciones asociadas. |

> **Al editar `ayuda.js`:** cada ítem de un arreglo debe terminar con coma salvo el último. Una
> coma olvidada al agregar una pregunta es un error de sintaxis que deja **toda** la página
> de ayuda vacía.

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
1. Agregar `{ q: '...', a: '...' }` al array correspondiente (sin olvidar la coma del ítem
   anterior).
2. Si es exclusiva de un rol dentro de `AYUDA_FAQ`, agregar `roles: ['admin' | 'profesor' | 'estudiante']`.
3. No hace falta tocar nada más: el renderizado es dinámico.
4. Subir el `?v=` del `<script>` de `ayuda.js` (y del `<link>` de `ayuda.css` si se editan
   estilos); ver sección 12.

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
- Componentes de **admin**: `.users-tabs`, `.user-tab-btn` (activa en crimson), `.card`,
  `.reports-card`, `.reports-help`, `.report-form`, y los del buscador:
  `.search-box` (caja con ícono de lupa), `.student-list` (select `size=6`),
  `.student-count`, `.check-list`, `.check-item` y `.check-empty` (lista de casillas de
  materias en Matrículas).
- Componentes de **períodos (admin)**: `.periods-grid` (cuadrícula responsive),
  `.period-card` (con modificadores `.open` / `.closed`: borde verde o crimson),
  `.period-card-header`, `.period-title`, `.period-badge` (`.open` / `.closed`),
  `.period-dates` (dos columnas inicio/fin) y `.period-actions`.
- Componentes de **profesor**: `.section-block`, `.section-header` (sub-secciones A, B, C…
  dentro de cada grado), `.section-header-actions` y `.btn-exportar-seccion`, además de
  `.btn-exportar-grupo` e `.btn-exportar-individual`. La flecha de colapsado rota solo el
  ícono `.fa-chevron-down`.
- **Trimestre cerrado (profesor):** `.period-closed-banner` (aviso crimson con candado) y los
  estados `:disabled` de `.btn-primary` y de los campos de `.add-grade-section` (fondo gris,
  `cursor: not-allowed`, sin sombra; el botón tampoco se desplaza al pasar el cursor).
- **Gestión de notas (profesor):** `.grade-header` y `.section-header` controlan el despliegue
  de `.grade-students` y `.section-students`. Los grupos empiezan contraídos y la búsqueda
  renderiza expandidos solo los grupos que contienen estudiantes coincidentes.
- Componentes de **estudiante**: `.boletin-completo-card`, `.btn-exportar-boletin`,
  `.btn-exportar-boletin-completo` y el modal de detalle `.gd-*`.
- Cada CSS de panel (`admin.css`, `profesor.css`, `estudiante.css`) tiene **un único bloque**
  `.modal` / `.modal-content`; ese bloque se repite entre archivos (ver sección 13).
- SweetAlert2 se usa de forma consistente para confirmaciones, errores y toasts; todos los CSS
  suben su `z-index` (`.swal2-container { z-index: 99999 !important; }`) para que quede por
  encima de los modales.

---

## 11. Exportación de Reportes (`reportes.js`)

Archivo compartido por los tres paneles. El archivo lo genera el backend
(`GET /notas/exportar.php`); aquí solo se piden las opciones y se descarga. La exportación
**no depende del estado de los períodos**: funciona igual en trimestres cerrados.

| Función | Qué hace |
|---|---|
| `elegirFormatoExportacion()` | Diálogo PDF / Excel / Cancelar. Devuelve `'pdf'`, `'excel'` o `null`. |
| `elegirTrimestreExportacion()` | Selector de trimestre o "Todos los trimestres". Devuelve `'I Trimestre'`, `'II Trimestre'`, `'III Trimestre'`, `'TODOS'` o `null` si se cancela. |
| `exportarReporte({format, materia_id, estudiante_id, trimestre, grado, seccion})` | Arma la query, llama a `/notas/exportar.php`, toma el nombre del header `Content-Disposition` y descarga el blob. Si `trimestre` es `'TODOS'` o vacío, no filtra por trimestre. Si el backend responde error, lo muestra con SweetAlert2. |

**Orden de diálogos:** en todos los casos que piden ambos datos (admin y profesor grupal) el
orden es **trimestre → formato**. Donde no se pide trimestre (estudiante, profesor
individual) solo se pide el formato.

**Quién llama a qué:**
| Panel | Acción | Parámetros enviados |
|---|---|---|
| Estudiante | Exportar Boletín | `format` |
| Estudiante | Exportar Notas (trimestre) | `format`, `trimestre` |
| Profesor | Grupal por grado | `format`, `materia_id`, `grado`, `trimestre` |
| Profesor | Grupal por sección | `format`, `materia_id`, `grado`, `seccion`, `trimestre` |
| Profesor | Individual | `format`, `materia_id`, `estudiante_id` |
| Admin | Reportes | `format`, `trimestre`, `estudiante_id`, `materia_id`, `grado`, `seccion` (según selección; grado y sección solo sin estudiante) |

**Nombres de archivo:** los define el backend (sin acentos ni espacios, máx. 80
caracteres), con extensión `.pdf` o `.xlsx`. Por ejemplo:
`reporte_grupal_<materia>[_<grado>][_Seccion_<sección>][_<trimestre>]`,
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
<script src="js/admin.js?v=4"></script>
```
Cada valor distinto de `?v=` fuerza al navegador a descargar el archivo de nuevo. Solo es
necesario mientras se edita activamente el archivo.

Estado del versionado (según los archivos entregados; todos llevan `?v=`):

| Archivo | `?v=` |
|---|---|
| `ayuda.css` (en `ayuda.html`) | `?v=3.0` |
| `ayuda.js` (en `ayuda.html`) | `?v=3` |
| `admin.css` / `admin.js` (en `admin.php`) | `?v=3` |
| `profesor.css` / `profesor.js` (en `profesor.php`) | `?v=3` |
| `estudiante.css` / `estudiante.js` (en `estudiante.php`) | `?v=3` |
| `login.css`, `login.js`, `api.js`, `reportes.js`, etc. | `?v=3` |

> **Tras los cambios de la v2.4.0 (períodos)** hay que subir el `?v=` de `admin.css`,
> `admin.js`, `profesor.css`, `profesor.js` y `ayuda.js` (por ejemplo a `?v=5`) y recargar con
> `Ctrl+F5`; de lo contrario el navegador puede seguir mostrando la versión anterior.

---

## 13. Pendientes / Mejoras Sugeridas

| Área | Descripción |
|---|---|
| **Refresco de sesión** | No hay renovación ni aviso antes del vencimiento (8 h); el usuario es desconectado en la siguiente llamada a `apiFetch`. |
| **Actividad reciente (admin)** | Solo en memoria (`activities` en `admin.js`); se pierde al recargar. Podría persistirse en backend. |
| **Reglas `.modal` duplicadas entre archivos** | El mismo bloque está en `admin.css`, `profesor.css` y `estudiante.css`; consolidar en un CSS compartido. |
| **Uso inconsistente de `apiGet`** | Las cargas principales de los paneles repiten `json.data ?? json` en vez de usar `apiGet`. |
| **Fuente `Quicksand`** | Se carga en el `<head>` de varias páginas pero no se usa; se puede eliminar el `<link>`. |
| **Admin: comentarios** | La matriz de permisos del backend permite al admin ver todos los comentarios, pero no hay vista. |
| **Profesor: editar notas** | El backend tiene `PUT /notas/` (con auditoría en `nota_auditoria`), pero la interfaz solo permite agregar y eliminar. Si se implementa, deberá respetar `trimestreAbierto()` igual que el alta. |
| **Estudiante: etiqueta de trimestre cerrado** | Opcional: mostrar "Trimestre cerrado" junto al encabezado de cada trimestre en `renderGradesReport()`. No es obligatorio. |
| **Verificar código sin uso** | Confirmar que ya no queden `calcularPromedioFinal`, `openChangePasswordModal` en `admin.js` ni `allStudentsCache` (no aparecen en los archivos actuales). |

**Resueltos en la v2.4.0 (retirados de la lista):** panel de períodos (vista admin y
bloqueo/aviso en profesor); ayuda actualizada (filtro por sección, buscadores, vista previa,
exportación por sección del profesor, bloqueo de cuenta y períodos); versionado `?v=` presente
en todos los archivos; orden de scripts de `estudiante.php` igualado al de los otros paneles;
campo "Materias" del modal de profesor eliminado.

**Resueltos desde la v2.2.1:** diálogos de exportación unificados (trimestre → formato);
selects de Matrículas y Materias que usaban solo la página actual (ahora usan búsqueda en
servidor, `fetchAllPages` y cachés completas); HTML de `profesor.php` y duplicados de
CSS/SweetAlert en `estudiante.php` y `admin.php`; `escapeHtml` ya escapa comillas y los textos
con apóstrofos no rompen el modal de notas del estudiante; bloques `.modal` duplicados dentro
de un mismo CSS.

**Resueltos en la v1.1:** fusión Estudiantes/Profesores en "Usuarios", vista Reportes del
admin, reubicación del botón "Exportar Boletín", filtro de trimestre en el reporte grupal,
boletín individual y grupal del profesor, exportación del boletín consolidado del estudiante.

---

*Documentación de frontend generada para uso interno del equipo de desarrollo, como
complemento a `documentacion_backend.md`.*