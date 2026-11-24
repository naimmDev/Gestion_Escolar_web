# Documentación Frontend — Sistema de Gestión Escolar

**Versión:** 2.9.0
**Stack:** HTML5 · CSS3 · JavaScript (vanilla, sin frameworks) · SweetAlert2 · Font Awesome 6.4.0 · PWA (Service Worker)
**Consumo de API:** Ruta relativa `../api` bajo el mismo origen (ver `documentacion_backend.md`)
**Fecha:** Noviembre 2026

> Este documento complementa `documentacion_backend.md`. Cubre la estructura de páginas, los scripts JS, el flujo de autenticación/primer ingreso, la exportación de reportes, el sistema de Ayuda, el panel de períodos, los comentarios con respuesta, los avisos de correo, el diseño responsive, la PWA y las decisiones de arquitectura frontend.

---

## 📝 Registro de Cambios (Changelog)

### Cambios de la v2.8.0 a la v2.9.0
- **PWA:** Generación e inclusión de los íconos PNG reales (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `icon-maskable-512.png`) en la carpeta `icons/`, resolviendo el error 404 y habilitando la instalación nativa en navegadores Chromium.
- **Reportes PDF:** Blindaje de la función `fmtNota` en `reporte_documento.php` para devolver `S/N` limpio cuando no hay nota. Rediseño institucional en `pdf_reporte.php` con la paleta oficial (crimson/gold), zebra striping y ajustes de padding.
- **Profesor:** La nota trimestral del modal de notas (`.period-avg`) solo se calcula en las pestañas de trimestre concreto; en la pestaña "Todas" se muestra "Notas registradas" / "Sin notas registradas". Se eliminó además el bloque residual de `renderTrimestreContent()` que agregaba un texto literal `...` al final del modal (y la función `generarResumenTrimestre`, que ya no se usaba en este panel).
- **Seguridad (Preguntas):** `configurar_preguntas.js` pinta el contenedor una sola vez; al elegir una pregunta, `refrescarSelects()` reconstruye solo las opciones de los 3 selects (deshabilitando en cada slot las preguntas elegidas en los otros) sin tocar los campos de respuesta ya escritos.
- **UI/UX Modales:** El cierre con `Esc` en `common.js` solo cierra el modal superior (cediendo el paso a SweetAlert2 si está abierto). Se agregó soporte de `Esc` al modal de detalle de notas del estudiante.
- **Iconografía:** Actualización de nombres de íconos de Font Awesome 6 (ej. `fa-pen-to-square`, `fa-right-from-bracket`) y CDN en la v6.4.0. Algunos alias, como `fa-edit`, se mantienen porque siguen funcionando en la v6.
- **Corrección de CSS:** Reparación de reglas anidadas inválidas en `login.css` que afectaban la visualización de ciertos modales.
- **Documentación:** Alineada con el código vigente: comentarios con respuesta, avisos de correo, versionado de caché (`?v=`), contacto del administrador en Ayuda y detalle de cada panel.

### Cambios de la v2.7.1 a la v2.8.0
- **Estructura compartida:** nuevos `css/base.css`, `css/shell.css`, `css/components.css` y `js/common.js`, `js/shell.js`. Las funciones y reglas que estaban repetidas en cada panel viven ahora ahí.
- **Responsive:** teléfono (menú tipo cajón + barra superior), tablet (carril de íconos), laptop (barra completa) y monitor grande (contenido centrado). Las tablas pasan a tarjetas en teléfono.
- **PWA:** `manifest.webmanifest`, `sw.js`, `offline.html`, `entrar.php` y `js/pwa.js` (instalar app, aviso de versión nueva, pantalla sin conexión).
- **Profesor:** ya se pueden **editar notas** desde la interfaz (`editGrade`, `PUT /notas/`).
- **Estudiante:** etiqueta **"Cerrado"** junto al trimestre cerrado.

---

## Índice
1. [Estructura del Proyecto](#1-estructura-del-proyecto)
2. [Arquitectura y Patrones Frontend](#2-arquitectura-y-patrones-frontend)
3. [Módulo de Conexión a la API (`api.js`)](#3-módulo-de-conexión-a-la-api-apijs)
4. [Sesión de Usuario en el Cliente](#4-sesión-de-usuario-en-el-cliente)
5. [Flujo de Autenticación y Primer Ingreso](#5-flujo-de-autenticación-y-primer-ingreso)
6. [Recuperación de Contraseña](#6-recuperación-de-contraseña)
7. [Panel de Administrador](#7-panel-de-administrador)
8. [Panel de Profesor](#8-panel-de-profesor)
9. [Panel de Estudiante](#9-panel-de-estudiante)
10. [Sistema de Ayuda](#10-sistema-de-ayuda)
11. [Exportación de Reportes](#11-exportación-de-reportes-reportesjs)
12. [Diseño, Responsive y Convenciones Visuales](#12-diseño-responsive-y-convenciones-visuales)
13. [Scripts Compartidos (`common.js`, `shell.js`)](#13-scripts-compartidos-commonjs-shelljs)
14. [PWA y Service Worker](#14-pwa-y-service-worker)
15. [Manejo de Errores y UX](#15-manejo-de-errores-y-ux)
16. [Decisiones de Arquitectura](#16-decisiones-de-arquitectura)
17. [Pendientes y Mejoras Sugeridas](#17-pendientes-y-mejoras-sugeridas)

---

## 1. Estructura del Proyecto

```text
frontend/
├── index.html                  # Login + modal de recuperación (público)
├── ayuda.html                  # Centro de ayuda (común a los 3 roles)
├── offline.html                # Pantalla sin conexión (la sirve el Service Worker)
├── entrar.php                  # Puerta de entrada de la app instalada (start_url)
├── admin.php                   # Panel admin (requiere sesión rol admin)
├── profesor.php                # Panel profesor (requiere sesión rol profesor)
├── estudiante.php              # Panel estudiante (requiere sesión rol estudiante)
├── cambiar_password.php        # Cambio de contraseña de primer ingreso
├── configurar_preguntas.php    # 3 preguntas de seguridad
├── manifest.webmanifest        # Manifiesto PWA
├── sw.js                       # Service Worker
├── .htaccess                   # Tipo MIME del manifest y no-cache de sw.js / manifest
├── icons/                      # icon.svg, icon-192/512.png, apple-touch-icon.png, favicon-32.png, icon-maskable-512.png
├── css/
│   ├── base.css                # Paleta, reset, tipografías, puntos de quiebre, táctil
│   ├── shell.css               # Barra lateral, topbar y cajón (los 3 paneles)
│   ├── components.css          # .view, .page-title, .card, stats, botones, formularios, modales, comentarios
│   ├── login.css               # Login, recuperación, preguntas de seguridad (autocontenido)
│   ├── admin.css               # Solo lo exclusivo del admin
│   ├── profesor.css            # Solo lo exclusivo del profesor
│   ├── estudiante.css          # Solo lo exclusivo del estudiante
│   └── ayuda.css
└── js/
    ├── api.js                  # Helper central de fetch (cookie de sesión)
    ├── common.js               # Funciones compartidas (escapeHtml, modales, tablas, cambio de contraseña)
    ├── shell.js                # Barra superior y cajón del menú (paneles)
    ├── pwa.js                  # Manifest, Service Worker, botón "Instalar app"
    ├── reportes.js             # Diálogos y descarga de exportaciones PDF/Excel
    ├── login.js                # Lógica de index.html (login + recuperación)
    ├── cambiar_password.js     # Lógica de cambiar_password.php
    ├── configurar_preguntas.js # Lógica de configurar_preguntas.php
    ├── admin.js                # Lógica de admin.php
    ├── profesor.js             # Lógica de profesor.php
    ├── estudiante.js           # Lógica de estudiante.php
    └── ayuda.js                # Lógica de ayuda.html
```

### Reglas de Seguridad por Página

Las páginas `.php` empiezan con `verificarSesionPagina(...)` (en `api/config/verificar_sesion_pagina.php`). Si no hay sesión válida o el rol no coincide, redirigen a `index.html`. Además, envían `Cache-Control: no-store` para que ni el navegador ni el Service Worker guarden el HTML de un panel.

| Página | Roles Permitidos | Línea de Seguridad (primera línea del archivo) |
| :--- | :--- | :--- |
| `admin.php` | `admin` | `verificarSesionPagina('admin');` |
| `profesor.php` | `profesor` | `verificarSesionPagina('profesor');` |
| `estudiante.php` | `estudiante` | `verificarSesionPagina('estudiante');` |
| `cambiar_password.php` | `profesor`, `estudiante` | `verificarSesionPagina(['profesor', 'estudiante']);` |
| `configurar_preguntas.php` | `profesor`, `estudiante` | `verificarSesionPagina(['profesor', 'estudiante']);` |

**No deben existir versiones `.html` de esas cinco páginas.** Una nueva vista protegida debe ser `.php` e iniciar con:
`<?php require_once '../api/config/verificar_sesion_pagina.php'; verificarSesionPagina('ROL'); ?>`

`index.html` y `ayuda.html` son públicas a nivel de servidor (ver §17 sobre Ayuda sin sesión). `entrar.php` no es una vista: redirige según la sesión (ver §14.3).

### Orden de Carga de CSS y Scripts

| Página | Hojas de estilo | Orden de Scripts |
| :--- | :--- | :--- |
| **Paneles** | `base`, `shell`, `components`, `<panel>` | SweetAlert2 (en `<head>`), `api.js`, `common.js`, `shell.js`, `reportes.js`, `<panel>.js`, `pwa.js` (defer) |
| **index.html** | `base`, `components`, `login` | SweetAlert2, `api.js`, `common.js`, `login.js`, `pwa.js` |
| **cambiar_password / configurar_preguntas** | `base`, `login` | SweetAlert2 (en `<head>`), `api.js`, `common.js`, `<script>.js`, `pwa.js` |
| **ayuda.html** | `base`, `ayuda` | SweetAlert2, `api.js`, `common.js`, `ayuda.js`, `pwa.js` |

> `common.js` va siempre después de `api.js` y antes del script de la página.

### Versionado de caché (`?v=`)

Cada `<link>`/`<script>` lleva un parámetro `?v=N` que se sube al modificar el archivo para forzar la descarga. Valores actuales:

| Archivo | `?v=` | Archivo | `?v=` |
| :--- | :--- | :--- | :--- |
| `base.css` | 1 | `api.js` | 3 |
| `shell.css` | 1 | `common.js` | 1 |
| `components.css` | 2 (index, admin) · 3 (profesor, estudiante) | `shell.js` | 1 |
| `login.css` | 4 | `reportes.js` | 4 |
| `admin.css` | 10 | `login.js` | 4 |
| `profesor.css` | 6 | `cambiar_password.js` | 4 |
| `estudiante.css` | 5 | `configurar_preguntas.js` | 4 |
| `ayuda.css` | 4 | `admin.js` | 12 |
| `profesor.js` | 11 | `estudiante.js` | 7 |
| `ayuda.js` | 9 | `pwa.js` | sin parámetro |

> Si `components.css` se modifica, subir la versión en **todas** las páginas que la cargan (`index.html`, `admin.php`, `profesor.php`, `estudiante.php`).

---

## 2. Arquitectura y Patrones Frontend

### 2.1. Patrón de Vistas (SPA Simple)

Cada panel (`admin`, `profesor`, `estudiante`) es un **SPA simple** basado en ocultamiento de `div`s. En lugar de recargar la página al cambiar de sección:

1. Todos los contenedores de vista (`<div id="dashboardView" class="view">`) existen en el HTML.
2. Solo el que tiene `.active` se muestra (`display: block`); el resto está oculto (`display: none`).
3. El sidebar (`data-view`) escucha el clic y alterna la clase `.active` en el `div` correspondiente.
4. El botón de menú activo también recibe `.active` para resaltarse.
5. **No se anida una vista dentro de otra** (quedaría oculta junto con su padre).

**Ejemplo (`profesor.js`):**
```js
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        if (!this.dataset.view) return;

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const view = this.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}View`).classList.add('active');

        // Refrescos propios de cada vista
        if (view === 'subjects') renderSubjects();
        if (view === 'grades')   { loadSubjectSelect(); /* restaura la materia seleccionada */ }
        if (view === 'comments') cargarComentariosProfesor().catch(error => Swal.fire('Error', error.message, 'error'));
    });
});
```

Cada panel refresca distinto al navegar:
- **Admin:** vuelve a pedir datos de la vista (ver §7.2).
- **Profesor:** `subjects` repinta; `grades` recarga el selector de materias; `comments` vuelve a pedir `/comentarios/`.
- **Estudiante:** `grades` repinta el reporte; `comments` recarga el selector de materias y la lista de comentarios.

### 2.2. Estructura de Módulos JS

Cada script de panel sigue el mismo esqueleto:

```js
// 1. Variables globales de estado
let currentTeacher = null;
let mySubjects = [];
let myGrades = [];
let currentTrimestre = 'I Trimestre';

// 2. Normalización de datos (adaptar JSON del backend al frontend)
function normalizeGrade(g) { ... }

// 3. Carga inicial (fetch y transformación)
async function loadData() { ... }

// 4. Funciones de cálculo (lógica de negocio)
function calcularNotaTrimestral() { ... }

// 5. Funciones de renderizado (generan HTML dinámico)
function renderSubjects() { ... }
function renderStudentModal() { ... }

// 6. Manejadores de eventos (formularios, modales, clics)
async function addNewGrade() { ... }
function changeTrimestre() { ... }

// 7. Inicialización
loadData();
```

> `admin.js` difiere: verifica la sesión al inicio del archivo, llama a `loadData()` desde `DOMContentLoaded` y organiza el código por entidad (loaders `load*Page`, renders, formularios).

### 2.3. Manejo del DOM y Renderizado

- **No hay frameworks reactivos.** Todo se renderiza con `innerHTML` y template literals.
- **Escapado obligatorio:** toda variable que venga del backend y se inserte en `innerHTML` pasa por `escapeHtml()` (`common.js`). Esto evita inyección de XSS.
  ```js
  container.innerHTML = mySubjects.map(s => `
      <h4>${escapeHtml(s.name)}</h4>
  `).join('');
  ```
- **Eventos:** predominan los `onclick` inline (`onclick="editGrade(${grade.id})"`); los formularios y buscadores usan `addEventListener`. Cuando se pasa texto a un handler inline se usa `data-*` (ej. `data-grado`, `data-seccion`) en lugar de interpolarlo en el atributo.
- **Excepción deliberada:** el HTML de la Ayuda (`item.a`) no se escapa porque es contenido estático propio con etiquetas; los datos dinámicos de contacto sí se escapan (ver §10).

### 2.4. Gestión de Estado

No hay un store central. El estado se guarda en variables globales de cada script:

| Variable | Propósito | Dónde vive |
| :--- | :--- | :--- |
| `currentUser` | Sesión del usuario | `localStorage.currentUser` (en `admin.js` también constante global) |
| `currentTeacher` / `currentStudent` | Usuario del panel (leído de `localStorage`) | `profesor.js` / `estudiante.js` |
| `mySubjects` | Materias del usuario | `profesor.js`, `estudiante.js` |
| `myEnrollments` | Matrículas visibles | `profesor.js`, `estudiante.js` |
| `myGrades` | Notas normalizadas | `profesor.js`, `estudiante.js` |
| `myStudents` | Estudiantes derivados de las matrículas | `profesor.js` |
| `myComments` | Comentarios de sus materias | `profesor.js` |
| `periodos` | Mapa `{ 'I Trimestre': true/false }` (true = abierto) | `profesor.js`, `estudiante.js` |
| `currentSubjectId` | Materia seleccionada | `profesor.js` |
| `currentStudentForModal` | Estudiante abierto en el modal | `profesor.js` |
| `currentTrimestre` | Pestaña activa (I, II, III, Todas) | `profesor.js` |
| `studentGradeSearch` | Texto del buscador de estudiantes | `profesor.js` |
| `seccionesAbiertas` | `Set` de claves de grados/secciones expandidos | `profesor.js` |
| `students`, `teachers`, `subjects`, `enrollments` | Página actual de cada listado | `admin.js` |
| `*Total`, `current*Page`, `perPage` | Paginación server-side | `admin.js` |
| `periods` | Lista de períodos (array) | `admin.js` |
| `allTeachersCache`, `allSubjectsCache` | Listas completas cacheadas | `admin.js` |
| `matriculaSel` | `Set` de ids de materias marcadas en el modal de matrícula | `admin.js` |
| `activities` | Actividad reciente (máx. 15, solo en memoria) | `admin.js` |

Cuando el estado cambia (ej. se registra una nota), se llama a una función de refresco que vuelve a pedir los datos afectados y repinta (ej. `reloadGradesAndRefresh()` en `profesor.js`, `load*Page()` en `admin.js`).

---

## 3. Módulo de Conexión a la API (`api.js`)

`api.js` es el punto de contacto con el backend, salvo `login.js`, que usa `fetch` directo para el login y la recuperación de contraseña.

### 3.1. Cálculo de `API_URL`
```js
const API_URL = (window.SGE_API_URL || new URL('../api', window.location.href).href).replace(/\/$/, '');
```
- Se calcula **relativo** a la ubicación del frontend, permitiendo despliegues en subcarpetas (`/gestion_escolar/`), IP de red local y producción sin cambios.
- `window.SGE_API_URL` es opcional (definirlo antes de cargar `api.js`) si la API queda en otro dominio.

### 3.2. `apiFetch(endpoint, options)`
```js
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers ?? {})
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    if (response.status === 401) {
        const err = await response.clone().json().catch(() => ({}));
        if (/token/i.test(err.error || '')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return new Promise(() => {}); // detiene al llamador mientras redirige
        }
    }

    if (response.status === 403) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? 'Acción no permitida');
    }

    return response;
}
```
**Reglas:**
- Siempre usa `credentials: 'include'` para enviar la cookie `sesion_token`.
- **401 cuyo mensaje contiene "token":** sesión expirada → limpia `localStorage`, redirige a `index.html` y devuelve una promesa que nunca resuelve (el llamador queda detenido sin errores).
- **401 sin "token"** (ej. "La contraseña actual es incorrecta"): se devuelve la respuesta al llamador.
- **403:** se lanza como `Error` con el mensaje del backend; las vistas lo capturan en su `try/catch` y lo muestran con SweetAlert2.
- Los demás códigos (400, 404, 409, 429, 500) se devuelven como respuesta; cada llamador revisa `res.ok`.

### 3.3. `apiGet(endpoint)`
```js
async function apiGet(endpoint) {
    const res = await apiFetch(endpoint);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
    }
    const json = await res.json();
    return json.data ?? json;
}
```
Devuelve directamente `data`. **Usado por:** `fetchAllPages()`, `buscarEstudiantes()`, `cargarSecciones()`, `loadPeriodsPage()`, `cargarComentariosProfesor()` y `cargarContactoAdmin()`.

---

## 4. Sesión de Usuario en el Cliente

### 4.1. Cookie `sesion_token`
- La sesión real vive en una cookie **httpOnly** (`sesion_token`), inaccesible desde JavaScript.
- Expira a las 8 horas. El backend la emite en cada login exitoso.
- **No hay refresco de sesión:** al vencer, el siguiente `apiFetch` devuelve 401 con "token" y redirige a `index.html`.

### 4.2. `localStorage.currentUser`
Guarda solo datos de interfaz (nunca el token). Lo escribe `login.js`:
```json
{
  "email": "profesor@escuela.edu",
  "rol": "profesor",
  "nombre": "Juan Pérez",
  "id_referencia": 5,
  "password_cambiada": true,
  "preguntas_configuradas": true
}
```

- `id_referencia`: se usa para filtrar datos propios. En `profesor.js`:
  ```js
  mySubjects = allSubjects.filter(s => parseInt(s.teacherId) === currentTeacher.id_referencia);
  ```
- `password_cambiada` / `preguntas_configuradas`: controlan el flujo de primer ingreso. `common.js` pone `password_cambiada = true` al cambiar la contraseña desde el panel; `configurar_preguntas.js` pone `preguntas_configuradas = true` al guardar.
- `password_skipped`: no viene del login; se agrega al presionar "Más tarde" en `cambiar_password.php` y se elimina al cambiar la contraseña. Nunca se envía al backend. **Se pierde al volver a iniciar sesión** (el login reescribe el objeto), por lo que un usuario que la saltó vuelve a ver `cambiar_password.php` en su siguiente ingreso.

### 4.3. Guardas de Sesión en Paneles
- **`profesor.js` y `estudiante.js`** (dentro de `loadData`):
  ```js
  // 1. Verificar rol
  if (!currentUser || currentUser.rol !== 'profesor') { window.location.href = 'index.html'; return; }
  // 2. Verificar primer ingreso
  if (!currentUser.password_cambiada && !currentUser.password_skipped) { window.location.href = 'cambiar_password.php'; return; }
  // 3. Verificar preguntas de seguridad
  if (!currentUser.preguntas_configuradas) { window.location.href = 'configurar_preguntas.php'; return; }
  ```
- **`admin.js`:** solo verifica `rol === 'admin'` al inicio del archivo. El admin omite el flujo de primer ingreso.

### 4.4. Cierre de Sesión
```js
window.logout = async function () {
    try { await apiFetch('/auth/logout.php', { method: 'POST' }); } catch (e) { /* se cierra igual */ }
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
};
```
El backend marca la sesión como inactiva (`activa = 0`) y limpia la cookie.

### 4.5. bfcache
```js
window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });
```
Si el usuario usa "Atrás/Adelante" y la página se restaura desde bfcache, se recarga para no mostrar una sesión cerrada.

---

## 5. Flujo de Autenticación y Primer Ingreso

### 5.1. Diagrama de Flujo

```text
index.html (login)
      │
      ▼
 rol === 'admin'? ──► sí ──► admin.php (omite el flujo)
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

### 5.2. `login.js`

- **Endpoint:** `POST /auth/login.php` con `{ email, password }` (`fetch` directo con `credentials: 'include'`).
- **Respuesta:**
  ```json
  {
    "success": true,
    "data": {
      "rol": "profesor",
      "nombre": "Juan Pérez",
      "id_referencia": 5,
      "password_cambiada": false,
      "preguntas_configuradas": false
    }
  }
  ```
- **Manejo de errores:**
  - `401`: se muestra `json.error` ("Credenciales incorrectas"; no revela si el email existe).
  - `429`: se muestra el mensaje del backend ("Cuenta bloqueada temporalmente... N minuto(s)").
  - Error de red: "No se pudo conectar con el servidor. Verifica que XAMPP esté corriendo."

### 5.3. `cambiar_password.js`

- **Guarda:** sin `currentUser` → `index.html`; si `password_cambiada` ya es `true` → redirige a `configurar_preguntas.php` o al panel.
- **Endpoint:** `POST /auth/cambiar_password.php` con `{ password_actual, password_nueva }`.
- **Validación local:** mínimo 6 caracteres; la confirmación debe coincidir.
- **Respuesta exitosa:** pone `password_cambiada = true`, elimina `password_skipped`, muestra aviso de 2 s y redirige a `configurar_preguntas.php` (o al panel si ya configuró las preguntas).
- **Botón "Más tarde" (`skipPasswordChange()`):**
  - Profesor/Estudiante → marca `password_skipped = true` y va a `configurar_preguntas.php` (o al panel si ya tiene preguntas).
  - La rama de `admin` (→ `admin.php`) existe en el código, pero la página solo admite `profesor` y `estudiante` (el admin nunca llega aquí).

### 5.4. `configurar_preguntas.js`

- **Guarda:** requiere `password_cambiada` o `password_skipped`; si `preguntas_configuradas` ya es `true`, redirige al panel.
- **Endpoint GET:** `/auth/preguntas_seguridad.php` (las 8 preguntas predefinidas). El botón "Guardar y continuar" inicia deshabilitado y se habilita al cargarlas.
- **Endpoint POST:** `/auth/configurar_preguntas.php` con `{ preguntas: [{ pregunta_id, respuesta }] }` (exactamente 3).
- **Renderizado:** `renderPreguntas()` pinta una sola vez los 3 bloques (select + input). Al elegir una pregunta, `actualizarSlot(i)` actualiza `seleccionadas[]` y `refrescarSelects()` reconstruye únicamente las opciones de los 3 selects, deshabilitando en cada slot las preguntas elegidas en los otros dos. Los inputs de respuesta no se tocan.
- **Validación local:** los 3 slots completos (pregunta y respuesta) y sin preguntas repetidas.
- **Éxito:** pone `preguntas_configuradas = true`, muestra aviso de 2 s y redirige a `profesor.php` o `estudiante.php` según el rol.

---

## 6. Recuperación de Contraseña

Implementada en `index.html` (modal `#recoveryModal`) y `login.js`. Usa `fetch` directo (sin sesión). El modal se abre con `showRecoveryModal()` y se cierra con `closeRecoveryModal()` o con clic fuera / `Esc` (`common.js`).

### 6.1. Flujo

1. **Paso 1:** el usuario ingresa su identificación y presiona "Verificar usuario" (`checkUserAndLoadQuestions()`).
   - **Endpoint:** `GET /auth/preguntas_usuario.php?identificacion=...`
   - **Respuesta:** `{ pregunta_id, pregunta }` (el backend elige una sola pregunta al azar entre las del usuario).
   - **Pregunta señuelo:** si la identificación no existe o el usuario no tiene preguntas, el backend devuelve una pregunta del catálogo con la misma forma, para evitar enumeración de usuarios. El frontend no puede distinguir ambos casos.
2. **Paso 2:** el usuario responde la pregunta y define una nueva contraseña.
   - **Validación local:** contraseñas iguales, mínimo 6 caracteres, respuesta no vacía.
   - **Endpoint:** `POST /auth/recuperar_password.php` con `{ identificacion, pregunta_id, respuesta, password_nueva }`.
   - **Errores:**
     - `401`: "Identificación, pregunta o respuesta incorrecta" (mensaje genérico).
     - `429`: "Cuenta bloqueada temporalmente...".
3. **Éxito:** aviso "¡Contraseña actualizada!", se cierra el modal y se limpian los campos de login.

### 6.2. Seguridad
- El backend **cierra todas las sesiones activas** del usuario tras una recuperación exitosa.
- El contador de intentos es el **mismo** que el del login (5 intentos / 15 minutos); además, al bloquearse la cuenta el backend envía un correo de aviso al dueño.

---

## 7. Panel de Administrador

**Archivos:** `admin.php` + `js/admin.js` + `css/admin.css` (+ `reportes.js`, `common.js`, `shell.js`)

### 7.1. Carga Inicial y Estado (`loadData`)

Al iniciar (`DOMContentLoaded`) se muestra el nombre del admin y se llama a `loadData()`:

1. `Promise.all` con `GET /materias/`, `GET /matriculas/` y `GET /profesores/` (llenan `subjects`, `enrollments`, `teachers` de forma inicial).
2. `setupSearch()` (enlaza los 4 buscadores).
3. `Promise.all` de `loadStudentsPage()`, `loadProfessorsPage()`, `loadSubjectsPage()` y `loadEnrollmentsPage()`. Cada una pide su página al backend, repinta su tabla **solo si** `currentActiveView` coincide y llama a `updateStats()`.
4. `renderActivities()` y `addActivity('Datos cargados desde el servidor')`.

`updateStats()` actualiza las tarjetas del Dashboard (`totalStudents`, `totalTeachers`, `totalSubjects`, `totalEnrollments`) con los totales de la paginación.

**Actividad reciente:** `addActivity(texto)` guarda hasta 15 eventos solo en memoria (se pierden al recargar).

### 7.2. Navegación y Pestañas Internas (Usuarios)

Al elegir una opción del menú:
```js
currentActiveView = (view === 'users') ? currentUserTab : view;
if (view === 'enrollments') loadEnrollmentsPage();
if (view === 'users')       { loadStudentsPage(); loadProfessorsPage(); }
if (view === 'subjects')    loadSubjectsPage();
if (view === 'reports')     loadReportsPage();
if (view === 'periods')     loadPeriodsPage();
```

`#usersView` contiene dos paneles con la clase `.user-tab-panel` (no `.view`): `#studentsView` y `#professorsView`. Al cambiar de pestaña:
```js
currentUserTab = this.dataset.usertab;   // 'students' | 'professors'
currentActiveView = currentUserTab;
if (currentUserTab === 'students') renderStudents(); else renderTeachers();
```
> **Importante:** `load*Page()` solo pinta la tabla si `currentActiveView` coincide. Si esta sincronía falla, las tablas quedan vacías.

### 7.3. Paginación y Búsqueda (server-side)

- Los 4 listados (estudiantes, profesores, materias, matrículas) piden al backend `page`, `per_page` y `search`.
- `renderServerPagination()` pinta "Mostrando X–Y de N", selector de **10 / 25 / 50** por página y botones Anterior/Siguiente. `perPage` es global: `changePerPage()` lo cambia y reinicia todas las páginas a 1.
- Los buscadores (`#searchStudent`, `#searchProfessor`, `#searchSubject`, `#searchEnrollment`) disparan la consulta en cada `input` (sin debounce) y reinician a la página 1.
- `fetchAllPages(endpoint)` trae todas las páginas (`per_page=100`) en paralelo; se usa para listas completas (materias, profesores).

### 7.4. Estudiantes y Profesores

- **Tabla estudiantes:** N°, Identificación, Contraseña Inicial, Nombre, Email, Grado, Sección, Acciones. **Tabla profesores:** N°, Identificación, Contraseña Inicial, Nombre, Email, Especialidad, Materias (resumen truncado a 40 caracteres), Acciones.
- **Contraseña inicial:** el backend la devuelve como `initialPassword` solo mientras el usuario no haya cambiado su contraseña; después llega `null` y se muestra `......`.
- **Crear / Editar:** `POST` o `PUT` a `/estudiantes/` o `/profesores/`. Envía `firstName`, `lastName`, `email`, `identificacion`, `grade`/`seccion` (estudiante) o `specialty` (profesor) e `initialPassword` solo si es alta o si se modificó respecto a la original (`originalStudentPassword` / `originalTeacherPassword`). Mínimo 6 caracteres.
- **Contraseña inicial en el modal:** generada con `generatePassword()` (6 caracteres alfanuméricos). Botones para regenerar (`regenPassword`) o editar manualmente (`togglePasswordEdit`).
- **Restablecer acceso** (ícono de llave): confirma, genera una nueva contraseña y hace `PUT` con los datos completos más `initialPassword`. El backend resetea `password_cambiada`, `preguntas_configuradas` y borra las preguntas del usuario. Se muestra la nueva contraseña en un Swal.
- **Eliminar:**
  - Estudiante: `DELETE /estudiantes/delete.php` con `{ id }`. 409 si tiene notas. Si tiene comentarios, 409 con `details.requiresConfirmation === 'comentarios'`: se pide una segunda confirmación y se repite con `confirmar_comentarios: true`.
  - Profesor: `DELETE /profesores/delete.php`. 409 si tiene notas. No pide confirmación de comentarios; sus materias quedan sin profesor. Invalida `allTeachersCache`.

### 7.5. Materias

- **Tabla:** ID, Código, Nombre, Créditos, Profesor, Acciones.
- **Modal:** código, nombre, créditos y **buscador de profesores** (§7.7). `POST` o `PUT` a `/materias/` con `{ code, name, credits, teacherId }`.
- **Eliminar:** `DELETE /materias/delete.php`. 409 si tiene notas; si tiene comentarios, misma confirmación adicional que en estudiantes. Elimina también sus matrículas.

### 7.6. Matrículas

- **Tabla:** ID (número de fila), Estudiante (con grado), Materia, Profesor, Fecha, Acciones. Buscador por nombre del estudiante o materia.
- **Modal "Asignar Materia"** (`openEnrollmentModal`):
  - Filtros de **Grado** y **Sección** + buscador de estudiantes (`BUSCADOR_MATRICULA`, §7.7).
  - Lista de **materias con checkboxes** (cargadas con `fetchAllPages('/materias/')`), con buscador por nombre/código y contador. La selección vive en `matriculaSel` (`Set`).
  - Envía `POST /matriculas/` con `{ studentId, subjectIds: [...] }`.
  - La respuesta incluye `created` y `skipped`; el toast indica "N matrícula(s) creada(s)" o "N creada(s), M ya existía(n)".
- **Eliminar:** confirma con nombre del estudiante y materia → `DELETE /matriculas/`.

### 7.7. Buscadores

**Estudiantes (server-side)** — usados en el modal de matrícula y en Reportes. Configuración en `BUSCADOR_MATRICULA` y `BUSCADOR_REPORTES`:
- `montarBuscadorEstudiantes(cfg)` enlaza los eventos una sola vez (`cfg.enlazado`), carga las secciones y ejecuta la primera búsqueda.
- **Secciones:** `cargarSecciones(cfg)` → `GET /estudiantes/?secciones=1&grado=...` (modo ligero del backend, devuelve `["A","B"]`). Se vuelve a llamar al cambiar el grado.
- **Búsqueda:** `buscarEstudiantes(cfg)` → `GET /estudiantes/?page=1&per_page=50&search=&grado=&seccion=`. Debounce de **300 ms** al escribir. Cada petición lleva un `reqId` incremental: si llega una respuesta vieja, se descarta.
- **Opciones del `<select size=6>`:** `Nombre · Identificación (o "s/id") · Grado Sección`.
- **Contador:** "Mostrando N de M. Escribe o usa los filtros para acotar." / "Sin resultados con esos filtros".

**Profesores (client-side)** — modal de Materias (`BUSCADOR_PROFESOR`):
- Usa `getAllTeachers()` (cacheado en `allTeachersCache`, invalidado con `invalidateTeachersCache()` al crear/editar/eliminar profesores).
- Filtra por nombre, identificación, email y especialidad (`normalizarTexto` ignora tildes y mayúsculas).
- Muestra máximo 100 opciones (`MAX_OPCIONES_ESTUDIANTES`) e **incluye siempre el profesor seleccionado** aunque quede fuera del corte, para no perder la asignación al editar.

**Materias** — `montarBuscadorMaterias()` (Reportes): filtra por nombre/código sobre la lista completa.

### 7.8. Reportes (Admin)

- **Carga (`loadReportsPage`):** monta el buscador de estudiantes (aislado en `try/catch` para no bloquear lo demás) y carga todas las materias con `fetchAllPages`.
- **Formulario:** Grado, Sección, buscador de estudiante (opcional) y buscador de materia (opcional si hay estudiante).
- **Vista previa (`actualizarVistaPreviaReporte`):** indica qué reporte se generará:
  - Estudiante + materia → "Reporte individual de X en Y".
  - Solo estudiante → "Boletín completo de X".
  - Solo materia → "Reporte grupal de Y — grado [sección]".
  - Ninguno → "Elige un estudiante o una materia para exportar".
- **Exportar (`exportarReporteAdmin`):**
  1. Exige al menos estudiante o materia.
  2. Pide **trimestre** (`elegirTrimestreExportacion`; `null` = cancelado) y luego **formato**.
  3. Llama a `exportarReporte` con `estudiante_id`, `materia_id`, `trimestre` (omitido si es `TODOS`) y `grado`/`seccion` **solo si no hay estudiante seleccionado** (el backend los ignora en reportes individuales).

### 7.9. Períodos

- **Carga:** `loadPeriodsPage()` → `apiGet('/periodos/')` (3 trimestres) y `renderPeriods()`.
- **Tarjeta por trimestre:** badge Abierto/Cerrado, inputs `type="date"` de inicio y fin (`pInicio_<id>`, `pFin_<id>`), botón "Guardar fechas" y botón Abrir/Cerrar. Texto de ayuda: "Las fechas son informativas; el cierre es manual."
- **PUT `/periodos/`:** `{ trimestre, estado }` o `{ trimestre, fecha_inicio, fecha_fin }` (`null` borra la fecha). **Cerrar** pide confirmación con SweetAlert2 ("Los profesores no podrán registrar, editar ni eliminar notas de este trimestre"); **Abrir** no.
- **Respuesta:** el backend devuelve la lista completa actualizada; `actualizarPeriodo()` reemplaza `periods`, repinta, muestra toast y registra la actividad. Los errores del backend (ej. inicio posterior a fin) se muestran con Swal.
- Al pasar un trimestre de abierto a cerrado, el backend avisa por correo a todos los profesores (no afecta al frontend).

### 7.10. Avisos de Correo

Las respuestas de `POST`/`PUT` de `/estudiantes/` y `/profesores/` incluyen `data.correo`: `enviado` | `fallido` | `desactivado` | `no_aplica`.

| Función | Comportamiento |
| :--- | :--- |
| `notaCorreo(correo)` | Devuelve una nota HTML: `enviado` → "Se envió un correo al usuario."; `fallido` → "No se pudo enviar el correo: entrega la contraseña manualmente."; otros → vacío. Se agrega al Swal de "Acceso restablecido". |
| `avisarFalloCorreo(correo)` | Si `fallido`, muestra un Swal de advertencia "Guardado, pero el correo no se envió" (el usuario sí quedó registrado). Se usa tras crear/editar. |

Al crear/editar, el toast agrega " · correo enviado" cuando `correo === 'enviado'`. Un fallo de correo nunca revierte la acción.

---

## 8. Panel de Profesor

**Archivos:** `profesor.php` + `js/profesor.js` + `css/profesor.css` (+ `reportes.js`, `common.js`, `shell.js`)

### 8.1. Carga Inicial (`loadData`)

Tras las guardas de sesión (§4.3), `profesor.js` trae en paralelo:
- `GET /materias/` → se filtra `mySubjects` por `teacherId === id_referencia`.
- `GET /matriculas/` → `myEnrollments` (normalizadas con `normalizeEnrollment`).
- `GET /notas/` → `myGrades` (normalizadas con `normalizeGrade`).
- `GET /comentarios/` → `myComments`.

Luego deriva `myStudents` de `myEnrollments` (deduplicando por `studentId`; incluye `lastName` y `seccion`), llama a `cargarPeriodos()` y ejecuta `updateDashboard()`, `renderSubjects()`, `renderComments()` y `loadSubjectSelect()`.

### 8.2. Mis Materias y Gestión de Notas

- **Mis Materias:** tarjetas con nombre, código, créditos y cantidad de estudiantes. Al hacer clic, `selectSubjectForGrades()` abre la vista "Gestionar Notas" con esa materia.
- **Gestionar Notas:** selector de materia + buscador de estudiantes (nombre, email o sección). Al elegir materia se muestran las estadísticas rápidas y los estudiantes agrupados.
- **Estadísticas rápidas (`updateQuickStats`):** total de estudiantes, promedio del grupo (media de los promedios simples de cada estudiante con notas), "Aprobados" (tiene Examen Trimestral y promedio ≥ 3) y "En proceso" (el resto).
- **Agrupación (`renderStudentsByGrade`)** por **Grado → Sección**:
  ```js
  // grouped = { '10°': { 'A': [est1, est2], 'B': [est3] }, '11°': { ... } }
  ```
  - Grados en orden 7° a 12° (desconocidos al final); secciones A, B, C… con "Sin sección" al final. Si un grado solo tiene "Sin sección", los estudiantes se listan directo, sin bloque de sección.
  - Estudiantes ordenados por apellido y nombre.
  - **Expansión:** `seccionesAbiertas` (Set) guarda las claves `g|grado` y `s|grado|seccion`; las cabeceras llevan `data-key`. Mientras hay texto en el buscador, todos los grupos se muestran expandidos.
  - **Tarjeta de estudiante:** nombre, sección, email y promedio simple de sus notas en la materia (badge Aprobado ≥ 3 / En proceso). Al hacer clic abre el modal.
  - **Exportar:** botón en la cabecera de cada grado y de cada sección (§8.9).

### 8.3. Modal de Notas

`openStudentGradesModal(studentId)` refresca `periodos` con `cargarPeriodos()`, pinta el modal (datos del estudiante, materia y pestañas) y lo abre. Pestañas:
- **I, II, III Trimestre:** historial del trimestre + formulario de alta + nota trimestral.
- **Todas:** historial completo. La nota trimestral no se calcula en esta pestaña (se muestra "Notas registradas" / "Sin notas registradas") y el alta de notas está bloqueada (`addNewGrade` pide elegir un trimestre).

**Nota trimestral (frontend, solo visual):**
```js
function calcularNotaTrimestral(studentId, subjectId, trimestre) {
    // requiere al menos un PARCIAL, una APRECIACION y un EXAMEN_TRIMESTRAL; si no, null
    return (promParciales + promApreciacion + examen) / 3;
}
```
Se muestra con `toFixed(1)` y estado Aprobado (≥ 3) / En proceso. El backend calcula lo mismo redondeado a 1 decimal (`notas_calculo.php`), que es la fuente de verdad para los reportes.

**Historial (`renderGradeHistoryItem`):** tipo, tipo de actividad, puntaje, nombre (si está vacío se genera "Parcial N" según el orden de registro), comentario y fecha. Los botones **Editar** y **Eliminar** aparecen **solo si el trimestre de esa nota está abierto** (se decide por nota, no por pestaña).

### 8.4. Alta de Nota (`addNewGrade`)

**Validación (en orden):**
1. Trimestre concreto (no "Todas").
2. Trimestre abierto (`trimestreAbierto`).
3. Rango 1.0–5.0.
4. No duplicar Examen Trimestral (si ya existe en el estudiante/materia/trimestre, aviso informativo).

**Payload (`POST /notas/`):**
```json
{
  "estudiante_id": 12,
  "materia_id": 3,
  "tipo": "PARCIAL",
  "puntaje": 4.5,
  "trimestre": "I Trimestre",
  "tipo_actividad": "Quiz",
  "nombre": "Quiz #1",
  "comentario": "Buen desempeño"
}
```
`tipo_actividad`, `nombre` y `comentario` se envían como `null` si están vacíos. Los tipos de actividad válidos están en la constante `TIPOS_ACTIVIDAD` (Quiz, Parcial, Taller, Tarea, Proyecto, Investigación, Exposición, Laboratorio, Participación, Otro); los valores coinciden con los que valida el backend. En éxito: toast y `reloadGradesAndRefresh()`. El backend avisa por correo al estudiante (sin incluir el puntaje).

**Errores:** `manejarTrimestreCerrado()` primero; un `409` se muestra como "Aviso", los demás como "Error".

### 8.5. Edición de Nota (`editGrade`)

- Verifica que el trimestre esté abierto y abre un Swal con puntaje, tipo de actividad, nombre y comentario.
- **No permite cambiar `tipo` ni `trimestre`** (para eso, se elimina la nota y se registra de nuevo).
- Si no hubo cambios, avisa "Sin cambios" y no llama al backend.
- Envía `PUT /notas/` con `{ id, puntaje, tipo_actividad, nombre, comentario }`; `""` borra un campo opcional.
- **Auditoría:** el backend registra en `nota_auditoria` solo si cambia el puntaje.

### 8.6. Eliminación de Nota (`deleteGrade`)

Confirmación con SweetAlert2 → `DELETE /notas/` con `{ id }`. Si el trimestre está cerrado, el backend devuelve 409 con `TRIMESTRE_CERRADO`.

### 8.7. Manejo de Trimestres Cerrados

- `cargarPeriodos()` llena `periodos` (`{ 'I Trimestre': true|false }`). `trimestreAbierto(t)` devuelve `periodos[t] !== false`: **si no hay dato o la carga falla, se asume abierto** (el backend rechaza lo que corresponda).
- Si el trimestre de la pestaña está cerrado: banner `.period-closed-banner` ("solo lectura") y el formulario de alta queda deshabilitado (inputs, selects y botón con `title="Trimestre cerrado"`).
- Los botones Editar/Eliminar se ocultan por nota.
- **409 `TRIMESTRE_CERRADO` del backend:** `manejarTrimestreCerrado(error)` muestra el aviso, refresca `periodos` y repinta con `renderTrimestreContent()`.
- No se asume que el trimestre abierto sea siempre el III: pueden estar varios abiertos.

### 8.8. Dashboard

Tres contadores: materias asignadas, estudiantes únicos matriculados en ellas y notas registradas. La vista de bienvenida muestra el nombre del profesor.

### 8.9. Exportación

- **Grupal por grado:** `exportarReporteGrupal(grado)` → `materia_id`, `grado`, `trimestre`.
- **Grupal por sección:** `exportarReporteGrupal(grado, seccion)` → `materia_id`, `grado`, `seccion`, `trimestre`.
- Ambas validan que haya materia seleccionada y estudiantes en el grupo; piden **trimestre** y luego **formato**. "Sin grado" y "Sin sección" se envían tal cual (el backend los interpreta como vacío).
- **Individual:** `exportarReporteIndividual()` (botón en el modal) → `materia_id`, `estudiante_id` (solo pide formato; sin trimestre incluye los 3 y la nota final).

### 8.10. Comentarios

Vista "Comentarios" (`#commentsList`). Se recarga con `cargarComentariosProfesor()` (`apiGet('/comentarios/')`) al entrar a la vista y tras cada acción.

- **Estados:** `nuevo` (etiqueta "Nuevo"), `leido` ("Leído") y `respondido` ("Respondido"); clase `.comment-status--<estado>`.
- **Acciones** (solo si el comentario aún no tiene respuesta):
  - **Marcar leído** (solo si está `nuevo`): `PUT /comentarios/` con `{ id, accion: 'leer' }`.
  - **Responder** (`responderComentario`): Swal con textarea (máx. 2000 caracteres, no vacío) → `PUT /comentarios/` con `{ id, accion: 'responder', respuesta }`. Solo se responde una vez; el backend responde 409 si ya fue respondido.
- Una respuesta existente se muestra en el bloque "Tu respuesta" con su fecha.
- El estudiante recibe un correo de aviso (sin el texto de la respuesta; la lee en su panel).

---

## 9. Panel de Estudiante

**Archivos:** `estudiante.php` + `js/estudiante.js` + `css/estudiante.css` (+ `reportes.js`, `common.js`, `shell.js`)

### 9.1. Carga Inicial (`loadData`)

Tras las guardas de sesión (§4.3), trae en paralelo `GET /matriculas/`, `GET /notas/` y `GET /materias/`; filtra `mySubjects` a las materias en las que está matriculado. Luego `cargarPeriodos()` (informativo: si falla, no se muestran etiquetas), `updateDashboard()`, `renderGradesReport()`, `loadCommentSubjects()` y `renderMyComments()`.

### 9.2. Dashboard

- `calcularPromedioSimple(subjectId)`: media de todas las notas de la materia (sin ponderación).
- `updateDashboard()`: cuenta materias, calcula el promedio general (media de los promedios simples por materia) y materias aprobadas (`avg >= 3`).

### 9.3. Reporte de Notas por Trimestre

`renderGradesReport()` construye:
- Encabezado con el promedio general (mismo cálculo simple del Dashboard).
- Tarjeta **Exportar Boletín**.
- Una sección por trimestre (`renderTrimestreSection`) con: botón "Ver notas (N)" por materia, nota trimestral (o "En curso") y badge de estado (Aprobado / En proceso / Incompleto / Sin definir).
- **Colapsado inicial:** un trimestre inicia expandido solo si su período está abierto (`periodos[t] === true`); si los períodos no cargaron, todos inician colapsados. El encabezado alterna la expansión al hacer clic.
- **Etiqueta "Cerrado":** `.trimestre-closed-badge` junto al título cuando `periodos[t] === false`.

### 9.4. Modal de Detalle de Notas

`openGradesDetailModal(subjectId, trimestre)`:
- Overlay `.gd-modal-overlay` (hoja inferior en móvil).
- Agrupa por tipo (Parciales, Apreciación, Examen Trimestral) con promedio por grupo y un resumen final con la nota trimestral.
- Se cierra con `Esc`, clic fuera o la X (`closeGradesDetailModal`). Mientras está abierto bloquea el scroll del `body` compensando el ancho de la barra de desplazamiento.

### 9.5. Exportación

- **Exportar Boletín** (`exportarBoletinCompleto`): `format` (sin `materia_id` ni `trimestre`; incluye los tres trimestres y la nota final por materia).
- **Exportar Notas** de un trimestre (`exportarBoletin(trimestre)`): `format` y `trimestre`.
- El backend fuerza el `estudiante_id` propio. Ambas validan que haya materias matriculadas.

### 9.6. Comentarios

- **Enviar (`sendComment`):** materia (solo las matriculadas) y texto → `POST /comentarios/` con `{ materia_id, comentario }`. El profesor de la materia recibe un correo de aviso.
- **Lista (`renderMyComments`):** `GET /comentarios/` (solo los propios). Cada comentario muestra su estado: `nuevo` → "Pendiente de revisión", `leido` → "En revisión", `respondido` → "Respondido". Si hay respuesta, aparece el bloque "Respuesta del profesor" con su fecha.

---

## 10. Sistema de Ayuda

**Archivos:** `ayuda.html` + `js/ayuda.js` + `css/ayuda.css`

### 10.1. Detección de Rol
```js
function getCurrentRole() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    return user?.rol || null;
}
```
Sin rol, se muestran las secciones de los tres paneles.

### 10.2. Bloques de Contenido
- `AYUDA_COMUN`: login, primer ingreso, preguntas de seguridad, recuperación, cambio de contraseña, bloqueo por intentos fallidos, cerrar sesión, instalar app y uso sin conexión.
- `AYUDA_ADMIN`: Dashboard, usuarios, estudiantes, profesores, materias, matrículas, reportes, qué reporte se genera, restablecer acceso, abrir/cerrar trimestres.
- `AYUDA_PROFESOR`: Dashboard, materias, registrar/editar/eliminar notas, exportar grado e individual, comentarios (leer y responder), trimestre cerrado.
- `AYUDA_ESTUDIANTE`: Dashboard, consultar notas, descargar, enviar comentarios (con estados y respuesta), "En curso".
- `AYUDA_FAQ`: transversales; un ítem puede llevar `roles: [...]` para filtrarse (ej. "¿Por qué no puedo eliminar...?" solo para admin).

`buildSections(role)` arma las secciones según el rol y filtra las FAQ. El HTML de las respuestas (`item.a`) es contenido estático propio y no se escapa; las preguntas (`item.q`) sí.

### 10.3. Contacto con el Administrador

`cargarContactoAdmin(role)` (omitida para `admin`) llama a `GET /contacto/admin.php` con `apiGet`; si falla usa un texto genérico. Agrega con `unshift` al inicio de `AYUDA_COMUN` la pregunta "¿Cómo contacto al administrador?" con correo (enlace `mailto:`), teléfono y horario (todos escapados con `escapeHtml`). Como `ayuda.html` carga `api.js` y `common.js`, este endpoint requiere sesión (ver §17).

### 10.4. UI

- Acordeón con animación `max-height` (`toggleAyudaItem`).
- Búsqueda en vivo (`#ayudaSearch`) sobre `allSectionsCache` (busca en pregunta y respuesta, sin distinguir mayúsculas).
- Botón "Volver" (`volverAlPanel`): redirige al panel según el rol, o a `index.html` si no hay rol.

---

## 11. Exportación de Reportes (`reportes.js`)

### 11.1. Funciones Principales

| Función | Descripción |
| :--- | :--- |
| `elegirFormatoExportacion()` | Diálogo PDF / Excel / Cancelar. Devuelve `'pdf'`, `'excel'` o `null`. |
| `elegirTrimestreExportacion()` | Diálogo con select. Devuelve `'I Trimestre'`, `'II Trimestre'`, `'III Trimestre'`, `'TODOS'` o `null` (cancelado). |
| `exportarReporte({ format, materia_id, estudiante_id, trimestre, grado, seccion })` | Arma la URL de `GET /notas/exportar.php`, descarga el Blob y lo guarda con el nombre del header `Content-Disposition` (si falta, `reporte.pdf` / `reporte.xlsx`). `trimestre` `'TODOS'` o vacío = sin filtro. Los errores del backend se muestran en un Swal. |

### 11.2. Orden de Diálogos

- **Admin (todas las combinaciones) y Profesor (grupal):** Trimestre → Formato.
- **Estudiante y Profesor (individual):** solo Formato.

### 11.3. Tabla de Parámetros por Panel

| Panel | Acción | Parámetros enviados |
| :--- | :--- | :--- |
| Estudiante | Exportar Boletín | `format` |
| Estudiante | Exportar Notas (trimestre) | `format`, `trimestre` |
| Profesor | Grupal por grado | `format`, `materia_id`, `grado`, `trimestre` |
| Profesor | Grupal por sección | `format`, `materia_id`, `grado`, `seccion`, `trimestre` |
| Profesor | Individual | `format`, `materia_id`, `estudiante_id` |
| Admin | Reportes | `format`, `estudiante_id?`, `materia_id?`, `trimestre?` (omitido si es `TODOS`), `grado?` y `seccion?` (solo sin estudiante) |

### 11.4. Backend (PDF/Excel)

- **`fmtNota()` en `reporte_documento.php`:** devuelve `'S/N'` para valores nulos, vacíos o no numéricos y formatea el resto con 1 decimal.
- **`pdf_reporte.php`:** diseño crimson/gold con zebra striping y padding para evitar desbordes; escapa toda salida con `htmlspecialchars`.
- **`excel_reporte.php`:** escribe las celdas con `setCellValueExplicit` para evitar inyección de fórmulas.

---

## 12. Diseño, Responsive y Convenciones Visuales

### 12.1. Paleta de Colores
Variables CSS en `:root` (`base.css`):
```css
--crimson:  #8B0000;   --crimson-deep: #5C0000;   --crimson-mid: #A00010;   --crimson-light: #B22222;
--gold:     #C9A84C;   --gold-light:   #E2C97E;   --gold-pale:   #F5E6B8;
--ivory:    #FAF6EE;   --ivory-dark:   #F0E8D5;   --parchment:   #E8DEC6;
--ink:      #1A0A0A;   --ink-soft:     #3B1A1A;   --shadow: rgba(92, 0, 0, 0.25);
```
Variables de layout: `--sidebar-w` (280px), `--rail-w` (72px), `--drawer-w`, `--topbar-h` (56px), `--space-page`, `--content-max` (1400px), `--fs-title`. Las variables CSS no funcionan dentro de `@media`, por lo que los puntos de quiebre se respetan a mano.

### 12.2. Tipografía
- **Títulos:** `Cinzel` (serif, mayúsculas espaciadas).
- **Cuerpo:** `EB Garamond` (serif).
- **Decorativo:** `Cormorant Garamond` (itálico).
- **Iconografía:** Font Awesome 6.4.0 (CDN).
- Las fuentes se importan desde Google Fonts en `base.css` (y en `login.css`, que es autocontenido).

### 12.3. Dónde vive cada regla CSS

| Archivo | Contenido |
| :--- | :--- |
| `base.css` | Reset, variables, táctil (`pointer: coarse`: inputs a 16px y áreas de toque de 44px), `prefers-reduced-motion`, z-index de SweetAlert (`99999`), `.sr-only`. |
| `shell.css` | `.app-container`, `.sidebar`, `.nav-btn`, `.main-content`, `.topbar`, cajón móvil, carril de íconos. |
| `components.css` | `.view`, `.page-title`, `.card`, stats, `.btn-primary`, `.form-group`, `.modal`, comentarios (`.comment-card`, `.comment-status--*`, `.comment-response`), tablas como tarjetas. |
| `login.css` | Login, recuperación, preguntas de seguridad (autocontenido). |
| `admin.css` / `profesor.css` / `estudiante.css` | Solo lo exclusivo de cada panel. |
| `ayuda.css` | Centro de ayuda. |

### 12.4. Puntos de Quiebre

| Dispositivo | Rango | Comportamiento |
| :--- | :--- | :--- |
| **Teléfono** | < 768px | Menú cajón + barra superior, tablas como tarjetas, modales tipo hoja inferior. |
| **Tablet** | 768–1023px | Barra lateral reducida a carril de íconos (72px). |
| **Laptop** | ≥ 1024px | Barra lateral completa (280px). |
| **Monitor** | ≥ 1440px | Contenido centrado con ancho máximo (`--content-max`: 1400px). |

### 12.5. Tablas en Teléfono

`common.js` usa un `MutationObserver` que añade `data-label` a los `<td>` según los `<th>` de las tablas `table.data-table` y `table.subjects-table` (se omiten las filas con `colspan`, es decir, las filas vacías):
```js
function etiquetar(tabla) {
    const heads = [...tabla.querySelectorAll('thead th')].map(th => th.textContent.replace(/\s+/g, ' ').trim());
    tabla.querySelectorAll('tbody tr').forEach(tr => {
        if (tr.children.length !== heads.length) return;
        [...tr.children].forEach((td, i) => { if (heads[i]) td.setAttribute('data-label', heads[i]); });
    });
}
```
Luego, en `components.css`, bajo `max-width: 767px`, cada fila pasa a ser una tarjeta y la etiqueta se pinta con `td::before { content: attr(data-label); }`. La celda "Acciones" no muestra etiqueta.

---

## 13. Scripts Compartidos (`common.js`, `shell.js`)

### 13.1. `common.js`

| Elemento | Detalle |
| :--- | :--- |
| `escapeHtml(str)` | Escapa `& < > " '`; `null`/`undefined` → `''`. |
| `showToast(title, icon)` | Toast de SweetAlert2 (arriba a la derecha, 1.5 s). |
| `openModal(id)` / `closeModal(id)` | `display:flex` + clase `show` y bloqueo/restauración del scroll del `body`. |
| `openChangePasswordModal()` | Resetea y abre `#changePasswordModal`. |
| **Esc** | Cierra el último `.modal` visible; si hay un SweetAlert2 abierto (`.swal2-container`), le cede el control. |
| **Clic fuera** | Cierra cualquier `.modal` con `id` al hacer clic sobre el fondo. |
| `logout()` | `POST /auth/logout.php`, borra `currentUser` y va a `index.html`. |
| `pageshow` | Recarga si la página vuelve desde bfcache. |
| **Cambio de contraseña** | Maneja el submit de `#changePasswordForm` (`POST /auth/cambiar_password.php`; valida coincidencia y mínimo 6) y marca `password_cambiada = true` en `localStorage`. |
| `MutationObserver` | Pone `data-label` a las tablas (§12.5). |

### 13.2. `shell.js`

- Pone `title` (tooltip) a los botones del menú, de cambiar contraseña y de cerrar sesión; se aprovecha sobre todo en el carril de íconos, donde el texto está oculto.
- Crea la barra superior móvil (`.topbar`) y el fondo oscuro (`.sidebar-backdrop`); el título de la barra sigue a la vista activa.
- Controla el cajón (`body.nav-open`, `aria-expanded`, `aria-label`).
- Cierra el cajón al elegir una opción del menú, al hacer clic en el fondo, con `Esc` o al pasar a un ancho ≥ 768px.

---

## 14. PWA y Service Worker

### 14.1. `pwa.js`

Calcula la raíz del frontend a partir de su propia URL (funciona en cualquier subcarpeta o dominio) y:
- **Inyecta en `<head>`:** manifest, `theme-color` (`#8B0000`), favicon 32px, meta tags de iOS y `apple-touch-icon` (sin duplicar etiquetas).
- **Registra el Service Worker** (`sw.js`, con `scope` en la raíz) al evento `load`.
- **Actualización:** si hay una versión esperando (`reg.waiting` o `updatefound`), muestra un Swal "Nueva versión disponible"; al aceptar envía `SKIP_WAITING`. Cuando el nuevo SW toma el control, la página se recarga una sola vez (no en la primera instalación). Busca nuevas versiones cada vez que el usuario vuelve a la app (`visibilitychange`).
- **Instalar app:** captura `beforeinstallprompt` y crea el botón "Instalar app" en la barra lateral (con la apariencia de "Cambiar contraseña", antes de "Cerrar sesión") o, en el login, como enlace bajo "¿Olvidaste tu contraseña?". En iOS muestra instrucciones de Safari. Se oculta si la app ya está instalada (`display-mode: standalone`).
- Expone `window.SGE_PWA` (`raiz`, `estaInstalada`, `instalar`, `ayudaIOS`).

### 14.2. `sw.js`

**3 Reglas de oro (no cambiar sin revisar):**
1. **Nunca** intercepta rutas que contengan `/api/`: los datos académicos no se guardan.
2. **Nunca** guarda HTML de páginas: los paneles dependen de la sesión del servidor.
3. Solo responde a `GET`.

**Estrategias** (versión de caché actual: `VERSION = 'sge-v2'`; cambiarla para publicar una versión nueva):

| Recurso | Estrategia |
| :--- | :--- |
| **Navegación (HTML)** | Red primero; sin conexión, sirve `offline.html` (precacheado en la instalación). |
| **CSS/JS propios** | Red primero; la caché solo respalda si no hay red. |
| **Imágenes/fuentes propias** | Caché primero. |
| **CDNs externos** (`fonts.googleapis.com`, `fonts.gstatic.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`) | Sirve la copia guardada y la actualiza en segundo plano. |

La instalación precachea `offline.html` y los íconos. La versión nueva espera a que el usuario acepte (no hay `skipWaiting` automático). Al activarse se borran las cachés de versiones anteriores.

### 14.3. `manifest.webmanifest` y `entrar.php`

- `start_url`: `./entrar.php`; `scope`: `./`; `display`: `standalone`; `lang`: `es`.
- Colores: `#FAF6EE` (fondo), `#8B0000` (tema). Íconos: 192, 512 y maskable 512.
- `entrar.php` es la puerta de entrada de la app instalada: con sesión vigente redirige al panel correspondiente (misma lógica que `login.js`, vía `rutaInicialPorSesion`); sin sesión, a `index.html`. Responde con `Cache-Control: no-store`.
- `.htaccess` fija el tipo MIME del manifest y evita la caché de `sw.js` y del manifest.

---

## 15. Manejo de Errores y UX

### 15.1. SweetAlert2
- Se usa para confirmaciones (eliminar, cerrar trimestre, restablecer acceso), errores y toasts.
- El `z-index` se eleva (`.swal2-container { z-index: 99999 !important; }`) para quedar sobre los modales. En `admin.js` el Swal se configura con `scrollbarPadding: false`.

### 15.2. Errores Comunes y Respuestas del Frontend

| Código | Origen | Respuesta del Frontend |
| :--- | :--- | :--- |
| `401` (credenciales) | Login incorrecto / contraseña actual incorrecta | Swal con el mensaje del backend. |
| `401` (token) | Sesión expirada | `apiFetch` limpia `localStorage` y redirige a `index.html`. |
| `403` | Sin permisos | `apiFetch` lanza `Error`; la vista lo muestra en un Swal. |
| `409` (conflicto) | Duplicados, examen ya registrado, borrado bloqueado | Swal con el mensaje del backend. |
| `409` (`requiresConfirmation: 'comentarios'`) | Borrar estudiante/materia con comentarios | Segunda confirmación y reintento con `confirmar_comentarios: true`. |
| `409` (`TRIMESTRE_CERRADO`) | Notas en trimestre cerrado | `manejarTrimestreCerrado()` avisa, refresca períodos y repinta. |
| `429` | Cuenta bloqueada | Swal con el tiempo restante que indica el backend. |

### 15.3. Estados de Carga
- No hay un indicador de carga global ni se deshabilitan los botones durante el envío de formularios (la única deshabilitación es la del formulario de notas en trimestres cerrados).
- Donde hay esperas visibles se usan textos de carga: "Cargando períodos...", "Cargando materias...", "Cargando profesores..." y el spinner de las preguntas de seguridad.
- Si falla la carga de períodos, el panel de profesor lo trata como abierto y el de estudiante no muestra etiquetas; el backend es la autoridad.

---

## 16. Decisiones de Arquitectura

| Tema | Decisión | Razón |
| :--- | :--- | :--- |
| **No usar frameworks (React, Vue, Angular)** | Vanilla JS | El proyecto es académico y busca demostrar fundamentos. Un framework habría añadido complejidad innecesaria para el tamaño del sistema. |
| **SPA simple por ocultamiento de `div`s** | `.view` y `.active` | Evita recargar la página al cambiar de sección. Es más simple que un router. |
| **`localStorage` solo para datos de interfaz** | No guardar tokens | El token vive en la cookie httpOnly, inaccesible desde JS. Esto mitiga XSS. |
| **El backend es la autoridad** | La UI oculta/deshabilita, el servidor valida | Trimestres cerrados, permisos y duplicados se validan siempre en el backend; la UI solo evita errores evitables. |
| **CSS modular por responsabilidad** | `base`, `shell`, `components`, `<panel>` | Evita duplicación y facilita el mantenimiento. |
| **SweetAlert2 para diálogos** | En lugar de `alert()`/`confirm()` | Mejor UX, consistente con el diseño. |
| **MutationObserver para tablas responsivas** | En lugar de etiquetar manualmente | Automatiza el `data-label` en cualquier tabla, sin tocar el HTML. |
| **Búsqueda y paginación en servidor (admin)** | Listados paginados y buscador de estudiantes con `reqId` | Escala con muchos registros y evita que respuestas viejas pisen a las nuevas. |
| **Correo no bloqueante** | El frontend solo informa el resultado (`data.correo`) | Un fallo de correo nunca revierte la acción; el admin entrega la contraseña manualmente si falla. |
| **PWA sin caché de API/HTML** | Regla de seguridad | Los datos académicos son sensibles y dependen de la sesión. |
| **Service Worker con red primero para CSS/JS** | En lugar de caché primero | Asegura que los cambios se vean al recargar; la caché solo respalda sin conexión. |

---

## 17. Pendientes y Mejoras Sugeridas

| Área | Descripción |
| :--- | :--- |
| **Ayuda: correos** | Agregar en `AYUDA_COMUN` "¿Recibiré correos del sistema?" (automáticos, no se responden, el detalle se ve entrando al sistema) y subir el `?v=` de `ayuda.js`. |
| **Ayuda sin sesión** | `cargarContactoAdmin` llama a un endpoint con sesión; sin sesión, `apiFetch` redirige al login. Decidir si la ayuda debe seguir siendo pública. |
| **Refresco de sesión** | No hay aviso de vencimiento de sesión (8 h). |
| **`password_skipped`** | Se pierde al volver a iniciar sesión (el login reescribe `currentUser`), por lo que "Más tarde" solo vale para la sesión actual. |
| **Actividad reciente (admin)** | Solo en memoria; se pierde al recargar. |
| **Admin: comentarios** | No hay vista de comentarios en el panel de admin (el backend ya permite consultarlos). |
| **Admin: debounce** | Los buscadores de las 4 tablas consultan en cada tecla; solo los buscadores de estudiantes tienen debounce (300 ms). |
| **Refactor de `apiGet`** | Las cargas principales de `profesor.js`/`estudiante.js` repiten `json.data ?? json` en vez de usar `apiGet`. |
| **Limpieza `configurar_preguntas.js`** | `refrescarSelects()` está definida dos veces (idénticas); dejar una. |
| **Limpieza `reportes.js`** | Comentario sobrante `// ✅ NUEVO` en `exportarReporte`. |
| **Docs históricos** | `docs/features/periodos_para_frontend.md` es un traspaso de feature ya implementado: usa la ruta vieja `database/migraciones/` (la real es `database/migrations/`) y afirma que no hay edición de notas en la interfaz (ya existe). Tratarlo como histórico. |

**Resueltos en la v2.9.0:**
Generación de íconos PWA, formato `S/N` y diseño de PDFs, cierre de modales con `Esc` (solo el superior), `configurar_preguntas.js` conserva las respuestas escritas y deshabilita opciones repetidas, nota trimestral solo en pestañas de trimestre, texto residual `...` en el modal de notas del profesor, actualización de fuentes e íconos.

**Resueltos en la v2.8.0:**
Reglas `.modal` duplicadas, edición de notas del profesor, etiqueta "Trimestre cerrado", fuente `Quicksand` eliminada.

---

*Documentación de frontend generada para uso interno del equipo de desarrollo, como complemento a `documentacion_backend.md`.*