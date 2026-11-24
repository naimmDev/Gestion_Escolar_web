# Documentación Frontend — Sistema de Gestión Escolar

**Versión:** 2.9.0
**Stack:** HTML5 · CSS3 · JavaScript (vanilla, sin frameworks) · SweetAlert2 · Font Awesome 6.4.0 · PWA (Service Worker)
**Consumo de API:** Ruta relativa `../api` bajo el mismo origen (ver `documentacion_backend.md`)
**Fecha:** Noviembre 2026

> Este documento complementa `documentacion_backend.md`. Cubre la estructura de páginas, los scripts JS, el flujo de autenticación/primer ingreso, la exportación de reportes, el sistema de Ayuda, el panel de períodos, el diseño responsive, la PWA y las decisiones de arquitectura frontend.

---

## 📝 Registro de Cambios (Changelog)

### Cambios de la v2.8.0 a la v2.9.0
- **PWA:** Generación e inclusión de los íconos PNG reales (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `icon-maskable-512.png`) en la carpeta `icons/`, resolviendo el error 404 y habilitando la instalación nativa en navegadores Chromium.
- **Reportes PDF:** Blindaje de la función `fmtNota` en `reporte_documento.php` para evitar formatos erróneos (como `S/N.` o `S/N,`). Rediseño institucional en `pdf_reporte.php` con la paleta de colores oficial (crimson/gold), zebra striping y ajustes de padding.
- **Profesor:** Corrección del resumen del trimestre en el modal de notas. Se oculta cuando se selecciona la pestaña "Todas" para evitar mostrar un bloque de "Sin datos" falso.
- **Seguridad (Preguntas):** Optimización en `configurar_preguntas.js`. Ya no se re-renderiza el DOM completo al cambiar una opción, preservando el foco y las respuestas escritas; además, las preguntas ya seleccionadas se deshabilitan visualmente en los otros slots.
- **UI/UX Modales:** El cierre con la tecla `Esc` en `common.js` ahora solo cierra el modal superior (cediendo el paso a SweetAlert2 si está abierto). Se agregó soporte de `Esc` al modal de detalle de notas del estudiante.
- **Iconografía:** Corrección de nombres de íconos deprecados de FontAwesome (ej. `fa-pen-to-square`, `fa-right-from-bracket`) y actualización del CDN a la v6.4.0.
- **Corrección de CSS:** Reparación de reglas anidadas inválidas en `login.css` que afectaban la visualización de ciertos modales.

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
11. [Exportación de Reportes](#11-exportación-de-reportes)
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
├── icons/                      # icon.svg, icon-192/512.png, apple-touch-icon.png, maskable
├── css/
│   ├── base.css                # Paleta, reset, tipografías, puntos de quiebre, táctil
│   ├── shell.css               # Barra lateral, topbar y cajón (los 3 paneles)
│   ├── components.css          # .view, .page-title, .card, stats, botones, formularios, modales
│   ├── login.css               # Login, recuperación, preguntas de seguridad (autocontenido)
│   ├── admin.css               # Solo lo exclusivo del admin
│   ├── profesor.css            # Solo lo exclusivo del profesor
│   ├── estudiante.css          # Solo lo exclusivo del estudiante
│   └── ayuda.css
└── js/
    ├── api.js                  # Helper central de fetch (cookie de sesión)
    ├── common.js               # Funciones compartidas (escapeHtml, modales, tablas)
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

| Página | Roles Permitidos | Línea de Seguridad (Primera línea del archivo) |
| :--- | :--- | :--- |
| `admin.php` | `admin` | `verificarSesionPagina('admin');` |
| `profesor.php` | `profesor` | `verificarSesionPagina('profesor');` |
| `estudiante.php` | `estudiante` | `verificarSesionPagina('estudiante');` |
| `cambiar_password.php` | `profesor`, `estudiante` | `verificarSesionPagina(['profesor', 'estudiante']);` |
| `configurar_preguntas.php` | `profesor`, `estudiante` | `verificarSesionPagina(['profesor', 'estudiante']);` |

**No deben existir versiones `.html` de esas cinco páginas.** Una nueva vista protegida debe ser `.php` e iniciar con:
`<?php require_once '../api/config/verificar_sesion_pagina.php'; verificarSesionPagina('ROL'); ?>`

### Orden de Carga de CSS y Scripts

| Página | Hojas de estilo | Orden de Scripts |
| :--- | :--- | :--- |
| **Paneles** | `base`, `shell`, `components`, `<panel>` | `api.js`, `common.js`, `shell.js`, `reportes.js`, `<panel>.js`, `pwa.js` (defer) |
| **index.html** | `base`, `components`, `login` | SweetAlert2, `api.js`, `common.js`, `login.js`, `pwa.js` |
| **cambiar_password / configurar_preguntas** | `base`, `login` | `api.js`, `common.js`, `<script>.js`, `pwa.js` |
| **ayuda.html** | `base`, `ayuda` | SweetAlert2, `api.js`, `common.js`, `ayuda.js`, `pwa.js` |

> `common.js` va siempre después de `api.js` y antes del script de la página.

---

## 2. Arquitectura y Patrones Frontend

### 2.1. Patrón de Vistas (SPA Simple)

Cada panel (`admin`, `profesor`, `estudiante`) es un **SPA simple** basado en ocultamiento de `div`s. En lugar de recargar la página al cambiar de sección:

1.  Todos los contenedores de vista (`<div id="dashboardView" class="view">`) existen en el HTML.
2.  Solo el que tiene `.active` se muestra (`display: block`); el resto está oculto (`display: none`).
3.  El sidebar (`data-view`) escucha el clic y alterna la clase `.active` en el `div` correspondiente.
4.  El botón de menú activo también recibe `.active` para resaltarse.

**Ejemplo de la lógica (`estudiante.js`, `profesor.js`, `admin.js`):**
```js
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        if (!this.dataset.view) return;
        
        // 1. Quitar .active de todos los botones y vistas
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // 2. Activar el botón y la vista seleccionada
        this.classList.add('active');
        document.getElementById(`${this.dataset.view}View`).classList.add('active');
        
        // 3. Refrescar datos si es necesario (ej. comentarios)
        if (this.dataset.view === 'comments') renderComments();
    });
});
```

### 2.2. Estructura de Módulos JS

Cada script de panel sigue el mismo esqueleto:

```js
// 1. Variables globales de estado
let currentUser = null;
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

### 2.3. Manejo del DOM y Renderizado

- **No hay frameworks reactivos.** Todo se renderiza usando `innerHTML` con template literals (strings de HTML).
- **Escapado obligatorio:** Toda variable que venga del backend y se inserte en `innerHTML` pasa por `escapeHtml()` (`common.js`). Esto evita inyección de XSS.
  ```js
  container.innerHTML = mySubjects.map(s => `
      <h4>${escapeHtml(s.name)}</h4>
  `).join('');
  ```
- **Event delegation:** En tablas dinámicas se usan `onclick` inline (`onclick="editGrade(${grade.id})"`) o `addEventListener` en el contenedor padre.

### 2.4. Gestión de Estado

No hay un store central (tipo Redux/Vuex). El estado se guarda en variables globales de cada script:

| Variable | Propósito | Dónde vive |
| :--- | :--- | :--- |
| `currentUser` | Sesión del usuario | `localStorage.currentUser` |
| `mySubjects` | Materias asignadas | `profesor.js`, `estudiante.js` |
| `myGrades` | Notas del usuario | `profesor.js`, `estudiante.js` |
| `myComments` | Comentarios | `profesor.js`, `estudiante.js` |
| `periodos` | Estado de los trimestres | `profesor.js`, `estudiante.js` |
| `currentSubjectId` | Materia seleccionada | `profesor.js` |
| `currentStudentForModal` | Estudiante en el modal | `profesor.js` |
| `currentTrimestre` | Pestaña activa (I, II, III, Todas) | `profesor.js` |

Cuando el estado cambia (ej. se registra una nota), se llama a una función de "refresco" que vuelve a pedir datos al backend y repinta la vista.

---

## 3. Módulo de Conexión a la API (`api.js`)

`api.js` es el único punto de contacto con el backend.

### 3.1. Cálculo de `API_URL`
```js
const API_URL = (window.SGE_API_URL || new URL('../api', window.location.href).href).replace(/\/$/, '');
```
- Se calcula **relativo** a la ubicación del frontend, permitiendo despliegues en subcarpetas (`/gestion_escolar/`).
- `window.SGE_API_URL` es opcional para despliegues separados (ej. frontend en Vercel, API en otro dominio).

### 3.2. `apiFetch(endpoint, options)`
```js
async function apiFetch(endpoint, options = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    // Manejo de 401 (sesión expirada)
    if (res.status === 401) {
        const err = await res.clone().json().catch(() => ({}));
        if (err.error?.includes('token')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    }
    if (res.status === 403) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Acceso denegado');
    }
    return res;
}
```
**Reglas:**
- Siempre usa `credentials: 'include'` para enviar la cookie `sesion_token`.
- **401 con "token" en el mensaje:** Se trata como sesión expirada → limpia `localStorage` y redirige a `index.html`.
- **401 sin "token":** Se devuelve al llamador (ej. "Contraseña actual incorrecta" en el modal de cambio de contraseña).
- **403:** Se lanza como error para que la vista lo maneje (ej. "No tienes permiso sobre esta materia").

### 3.3. `apiGet(endpoint)`
```js
async function apiGet(endpoint) {
    const res = await apiFetch(endpoint);
    if (!res.ok) throw new Error('Error en la petición');
    const json = await res.json();
    return json.data ?? json;
}
```
**Usado por:** `fetchAllPages()`, `buscarEstudiantes()`, `cargarSecciones()`, `loadPeriodsPage()`, `cargarContactoAdmin()`.

---

## 4. Sesión de Usuario en el Cliente

### 4.1. Cookie `sesion_token`
- La sesión real vive en una cookie **httpOnly** (`sesion_token`), inaccesible desde JavaScript.
- Expira a las 8 horas. El backend la renueva en cada login exitoso.
- **No hay refresco de sesión:** Al vencer, el siguiente `apiFetch` devuelve 401 y redirige a `index.html`.

### 4.2. `localStorage.currentUser`
Guarda solo datos de interfaz (nunca el token):
```json
{
  "email": "profesor@escuela.edu",
  "rol": "profesor",
  "nombre": "Juan Pérez",
  "id_referencia": 5,
  "password_cambiada": true,
  "preguntas_configuradas": true,
  "password_skipped": false
}
```

- `id_referencia`: Se usa para filtrar datos propios. En `profesor.js`:
  ```js
  mySubjects = allSubjects.filter(s => parseInt(s.teacherId) === currentTeacher.id_referencia);
  ```
- `password_cambiada` / `preguntas_configuradas`: Controlan el flujo de primer ingreso.
- `password_skipped`: Se agrega al presionar "Más tarde" en `cambiar_password.php`. Nunca se envía al backend.

### 4.3. Guardas de Sesión en Paneles
Cada panel (`profesor.js`, `estudiante.js`, `admin.js`) verifica al cargar:
```js
// 1. Verificar rol
if (!currentUser || currentUser.rol !== 'profesor') {
    window.location.href = 'index.html';
    return;
}
// 2. Verificar primer ingreso (solo profesor/estudiante)
if (!currentUser.password_cambiada && !currentUser.password_skipped) {
    window.location.href = 'cambiar_password.php';
    return;
}
// 3. Verificar preguntas de seguridad
if (!currentUser.preguntas_configuradas) {
    window.location.href = 'configurar_preguntas.php';
    return;
}
```

> **Importante:** El admin omite el flujo de primer ingreso. Solo se verifica el rol.

### 4.4. Cierre de Sesión
```js
window.logout = async function () {
    try { await apiFetch('/auth/logout.php', { method: 'POST' }); } catch (e) {}
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
};
```
El backend marca la sesión como inactiva (`activa = 0`).

### 4.5. bfcache
```js
window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });
```
Si el usuario usa el botón "Atrás" del navegador y la página se restaura desde bfcache, se recarga para evitar mostrar datos de una sesión cerrada.

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

- **Endpoint:** `POST /auth/login.php` con `{ email, password }`.
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
  - `401`: "Credenciales incorrectas" (no revela si el email existe).
  - `429`: "Cuenta bloqueada temporalmente...".
  - Error de red: "No se pudo conectar con el servidor. Verifica que XAMPP esté corriendo."

### 5.3. `cambiar_password.js`

- **Endpoint:** `POST /auth/cambiar_password.php` con `{ password_actual, password_nueva }`.
- **Validación local:** Mínimo 6 caracteres. Confirmación igual.
- **Respuesta exitosa:** Actualiza `password_cambiada = true` en `localStorage` y redirige al flujo de preguntas (o al panel si ya las configuró).
- **Botón "Más tarde" (`skipPasswordChange()`):**
  - Admin → `admin.php`.
  - Profesor/Estudiante → Marca `password_skipped = true` en `localStorage` y va a `configurar_preguntas.php`.

### 5.4. `configurar_preguntas.js`

- **Endpoint GET:** `/auth/preguntas_seguridad.php` (devuelve las 8 preguntas predefinidas).
- **Endpoint POST:** `/auth/configurar_preguntas.php` con `{ preguntas: [{ pregunta_id, respuesta }] }` (exactamente 3).
- **Renderizado optimizado (v2.9.0):**
  - Los 3 selects se renderizan una vez con todas las preguntas.
  - Al seleccionar una pregunta en un slot, `refrescarSelects()` deshabilita esa opción en los otros dos slots sin destruir el DOM.
  - Preserva el foco y las respuestas escritas.
- **Validación local:** No se pueden repetir preguntas (el frontend verifica `new Set(ids).size !== 3`).

---

## 6. Recuperación de Contraseña

Implementada en `index.html` (modal `#recoveryModal`) y `login.js`.

### 6.1. Flujo

1.  **Paso 1:** El usuario ingresa su identificación.
    - **Endpoint:** `GET /auth/preguntas_usuario.php?identificacion=...`
    - **Respuesta:** `{ pregunta_id, pregunta }` (el backend elige una sola pregunta al azar).
    - **Pregunta señuelo:** Si la identificación no existe, el backend devuelve una pregunta falsa con la misma forma para evitar enumeración de usuarios.
2.  **Paso 2:** El usuario responde y define una nueva contraseña.
    - **Endpoint:** `POST /auth/recuperar_password.php` con `{ identificacion, pregunta_id, respuesta, password_nueva }`.
    - **Errores:**
      - `401`: "Identificación, pregunta o respuesta incorrecta" (mensaje genérico).
      - `429`: "Cuenta bloqueada temporalmente".
3.  **Éxito:** Se cierra el modal y se limpian los campos.

### 6.2. Seguridad
- El backend **cierra todas las sesiones activas** del usuario tras una recuperación exitosa.
- El contador de intentos es el **mismo** que el del login (5 intentos / 15 minutos).

---

## 7. Panel de Administrador

**Archivos:** `admin.php` + `js/admin.js` + `css/admin.css` (+ `reportes.js`, `common.js`, `shell.js`)

### 7.1. Carga Inicial (`loadData`)

`admin.js` se inicializa verificando el rol y luego ejecuta en paralelo:
- `GET /estudiantes/`
- `GET /profesores/`
- `GET /materias/`
- `GET /matriculas/`

Luego llama a `updateDashboard()` y `loadActivities()`.

### 7.2. Pestañas Internas (Usuarios)

`#usersView` contiene dos paneles con la clase `.user-tab-panel` (no `.view`):
- `#studentsView`
- `#professorsView`

**Sincronización de estado:**
```js
// admin.js
let currentUserTab = 'students';
let currentActiveView = 'dashboard';

// Al cambiar de pestaña
document.querySelectorAll('.user-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        currentUserTab = this.dataset.usertab; // 'students' o 'professors'
        document.querySelectorAll('.user-tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.user-tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(this.dataset.usertab + 'View').classList.add('active');
        
        // Solo renderiza (no vuelve a pedir datos)
        if (currentUserTab === 'students') renderStudents();
        else renderTeachers();
    });
});
```

> **Importante:** `loadStudentsPage()` y `loadProfessorsPage()` solo pintan la tabla si `currentActiveView` coincide. Si esta sincronía falla, las tablas quedan vacías.

### 7.3. CRUD de Estudiantes y Profesores

- **Crear / Editar:** `POST /estudiantes/` o `PUT /estudiantes/`. Envía `firstName`, `lastName`, `email`, `identificacion`, `grade`, `seccion`, `initialPassword` (opcional).
- **Contraseña inicial:** Generada con `generatePassword()` (6 caracteres). El admin puede regenerarla o editarla manualmente.
- **Restablecer acceso:** `PUT` con `initialPassword`. El backend resetea `password_cambiada` y `preguntas_configuradas`.
- **Eliminar:** `DELETE /estudiantes/delete.php` con `{ id }`. Si tiene notas, 409. Si tiene comentarios, 409 con `requiresConfirmation: 'comentarios'` y el frontend pide confirmación adicional.

### 7.4. Buscador de Estudiantes (Server-Side)

- **Debounce:** 300ms.
- **Endpoint:** `GET /estudiantes/?page=1&per_page=50&search=...&grado=...&seccion=...`
- **Cancelación:** Cada petición lleva un `reqId` incremental. Si llega una respuesta vieja, se descarta.
- **Renderizado:** El `<select size=6>` se llena con `"Nombre · Identificación · Grado Sección"`.

### 7.5. Reportes (Admin)

- **Endpoint:** `GET /notas/exportar.php` (ver sección 11).
- **Validación:** Debe haber al menos estudiante o materia seleccionada.
- **Parámetros:**
  - Si hay estudiante: `estudiante_id`, `materia_id?`, `trimestre`.
  - Si hay materia: `materia_id`, `grado?`, `seccion?`, `trimestre`.
- **Grado y sección** solo se envían si no hay estudiante seleccionado (el backend los ignora en reportes individuales).

### 7.6. Períodos

- **Endpoint GET:** `GET /periodos/` (devuelve los 3 trimestres).
- **Endpoint PUT:** `PUT /periodos/` con `{ trimestre, estado }` o `{ trimestre, fecha_inicio, fecha_fin }`.
- **Cerrar:** Pide confirmación con SweetAlert2. **Abrir:** No pide confirmación.
- **Respuesta:** El backend devuelve la lista completa actualizada. El frontend reemplaza `periods` y repinta.

---

## 8. Panel de Profesor

**Archivos:** `profesor.php` + `js/profesor.js` + `css/profesor.css` (+ `reportes.js`, `common.js`, `shell.js`)

### 8.1. Carga Inicial (`loadData`)

`profesor.js` trae en paralelo:
- `GET /materias/` → Filtra `mySubjects` por `teacherId === id_referencia`.
- `GET /matriculas/` → `myEnrollments`.
- `GET /notas/` → `myGrades`.
- `GET /comentarios/` → `myComments`.

Luego deriva `myStudents` de `myEnrollments` (deduplicando por `studentId`).

### 8.2. Agrupación de Estudiantes

`renderStudentsByGrade()` agrupa por **Grado → Sección**:
```js
// Estructura:
// grouped = { '10°': { 'A': [est1, est2], 'B': [est3] }, '11°': { ... } }
```

- Grados 7° a 12° (desconocidos al final).
- Secciones A, B, C... y "Sin sección" al final.
- **Estado de expansión:** `seccionesAbiertas` (Set) guarda las claves `g|grado` y `s|grado|seccion`.
- **Búsqueda local:** `studentGradeSearch` (nombre, email o sección). Expande los grupos con coincidencias.

### 8.3. Modal de Notas

`openStudentGradesModal(studentId)` abre el modal con pestañas:
- **I Trimestre, II Trimestre, III Trimestre:** Muestran el historial y el formulario de alta.
- **Todas:** Muestra el historial completo (sin resumen de trimestre).

**Cálculo de nota trimestral (frontend):**
```js
function calcularNotaTrimestral(studentId, subjectId, trimestre) {
    const grades = myGrades.filter(g => g.studentId === studentId && g.subjectId === subjectId && g.trimestre === trimestre);
    const parciales = grades.filter(g => g.type === 'PARCIAL');
    const apreciaciones = grades.filter(g => g.type === 'APRECIACION');
    const examenes = grades.filter(g => g.type === 'EXAMEN_TRIMESTRAL');
    
    if (parciales.length === 0 || apreciaciones.length === 0 || examenes.length === 0) return null;
    
    const promParciales = parciales.reduce((s, g) => s + g.score, 0) / parciales.length;
    const promApreciacion = apreciaciones.reduce((s, g) => s + g.score, 0) / apreciaciones.length;
    const examen = examenes[0].score;
    
    return (promParciales + promApreciacion + examen) / 3;
}
```

### 8.4. Alta de Nota (`addNewGrade`)

**Validación (en orden):**
1.  Trimestre concreto (no "Todas").
2.  Trimestre abierto (`trimestreAbierto`).
3.  Rango 1.0–5.0.
4.  No duplicar Examen Trimestral.

**Payload:**
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

### 8.5. Edición de Nota (`editGrade`, v2.8.0)

- Abre un `Swal` con los campos actuales.
- **No permite cambiar `tipo` ni `trimestre`** (para eso, se elimina y se registra de nuevo).
- Envía `PUT /notas/` con `{ id, puntaje, tipo_actividad, nombre, comentario }`.
- Envía `""` para borrar un campo opcional.
- **Auditoría:** El backend registra en `nota_auditoria` solo si cambia el puntaje.

### 8.6. Eliminación de Nota (`deleteGrade`)

- Confirmación con SweetAlert2.
- `DELETE /notas/` con `{ id }`.
- Si el trimestre está cerrado, el backend devuelve 409 con `TRIMESTRE_CERRADO`.

### 8.7. Manejo de Trimestres Cerrados

- `periodos` mapea `{ 'I Trimestre': true|false }`.
- Si el trimestre está cerrado:
  - El formulario de alta se deshabilita (`disabled` en inputs y botón).
  - Aparece el banner `.period-closed-banner`.
  - Los botones **Editar** y **Eliminar** se ocultan (`trimestreAbierto(grade.trimestre)`).
- **409 del backend:** `manejarTrimestreCerrado(error)` detecta `details.codigo === 'TRIMESTRE_CERRADO'`, avisa, refresca `periodos` y repinta.

### 8.8. Exportación

- **Grupal por grado:** `exportarReporteGrupal(grado)` → `materia_id`, `grado`, `trimestre`.
- **Grupal por sección:** `exportarReporteGrupal(grado, seccion)` → `materia_id`, `grado`, `seccion`, `trimestre`.
- **Individual:** `exportarReporteIndividual()` → `materia_id`, `estudiante_id` (sin trimestre: incluye los 3 y nota final).

---

## 9. Panel de Estudiante

**Archivos:** `estudiante.php` + `js/estudiante.js` + `css/estudiante.css` (+ `reportes.js`, `common.js`, `shell.js`)

### 9.1. Carga Inicial (`loadData`)

- `GET /matriculas/` → `myEnrollments`.
- `GET /notas/` → `myGrades`.
- `GET /materias/` → Filtra `mySubjects` a las que está matriculado.

### 9.2. Dashboard

- `calcularPromedioSimple(subjectId)`: Media de todas las notas de la materia (sin ponderación).
- `updateDashboard()`: Cuenta materias, calcula promedio general y materias aprobadas (`avg >= 3`).

### 9.3. Reporte de Notas por Trimestre

- `renderGradesReport()` construye:
  - Encabezado con promedio general.
  - Tarjeta de **Exportar Boletín**.
  - Sección por cada trimestre con: botón "Ver notas (N)", nota trimestral (o "En curso") y badge de estado.
- **Trimestres colapsables:** Al entrar, se expande el período abierto.
- **Etiqueta "Cerrado":** `.trimestre-closed-badge` junto al título.

### 9.4. Modal de Detalle de Notas

`openGradesDetailModal(subjectId, trimestre)`:
- Overlay `.gd-modal-overlay` con diseño de hoja inferior en móvil.
- Agrupa por tipo (Parciales, Apreciación, Examen).
- Muestra promedios y resumen.
- Se cierra con `Esc` (v2.9.0), clic fuera o la X.

### 9.5. Exportación

- **Exportar Boletín:** `GET /notas/exportar.php?format=...` (sin `materia_id` ni `trimestre`).
- **Exportar Notas (Trimestre):** `GET /notas/exportar.php?format=...&trimestre=...`.
- El backend fuerza el `estudiante_id` propio.

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
Sin rol, se muestran todas las secciones.

### 10.2. Bloques de Contenido
- `AYUDA_COMUN`: Login, primer ingreso, preguntas de seguridad, recuperación, cambio de contraseña, bloqueo, instalar app, uso sin conexión.
- `AYUDA_ADMIN`: Dashboard, usuarios, materias, matrículas, reportes, períodos.
- `AYUDA_PROFESOR`: Dashboard, materias, registrar/editar/eliminar notas, exportar, comentarios, trimestre cerrado.
- `AYUDA_ESTUDIANTE`: Dashboard, consultar notas, descargar, enviar comentarios, "En curso".
- `AYUDA_FAQ`: Transversales. Soporta `roles: ['admin']`.

### 10.3. Contacto con el Administrador

- `cargarContactoAdmin()` llama a `GET /contacto/admin.php` y hace `unshift` en `AYUDA_COMUN`.
- Muestra correo (enlace `mailto:`), teléfono y horario.

### 10.4. UI

- Acordeón con animación `max-height` (`toggleAyudaItem`).
- Búsqueda en vivo (`#ayudaSearch`) sobre `allSectionsCache`.

---

## 11. Exportación de Reportes (`reportes.js`)

### 11.1. Funciones Principales

| Función | Descripción |
| :--- | :--- |
| `elegirFormatoExportacion()` | Diálogo PDF / Excel / Cancelar. Devuelve `'pdf'`, `'excel'` o `null`. |
| `elegirTrimestreExportacion()` | Devuelve `'I Trimestre'`, `'II Trimestre'`, `'III Trimestre'`, `'TODOS'` o `null`. |
| `exportarReporte()` | Arma la URL con los parámetros, descarga el Blob y lo guarda con el nombre del header `Content-Disposition`. |

### 11.2. Orden de Diálogos

- **Admin y Profesor (grupal):** Trimestre → Formato.
- **Estudiante y Profesor (individual):** Solo formato.

### 11.3. Tabla de Parámetros por Panel

| Panel | Acción | Parámetros enviados |
| :--- | :--- | :--- |
| Estudiante | Exportar Boletín | `format` |
| Estudiante | Exportar Notas (trimestre) | `format`, `trimestre` |
| Profesor | Grupal por grado | `format`, `materia_id`, `grado`, `trimestre` |
| Profesor | Grupal por sección | `format`, `materia_id`, `grado`, `seccion`, `trimestre` |
| Profesor | Individual | `format`, `materia_id`, `estudiante_id` |
| Admin | Reportes | `format`, `trimestre`, `estudiante_id`, `materia_id`, `grado`, `seccion` (según selección) |

### 11.4. Backend (PDF/Excel)

- **`fmtNota()` en `reporte_documento.php`:** Blindada para devolver `'S/N'` limpiamente y evitar formatos erróneos como `S/N.`.
- **`pdf_reporte.php`:** Aplica diseño crimson/gold con zebra striping y padding para evitar desbordes.

---

## 12. Diseño, Responsive y Convenciones Visuales

### 12.1. Paleta de Colores
Variables CSS en `:root` (`base.css`):
```css
--crimson:  #8B0000;   --crimson-deep: #5C0000;   --crimson-light: #B22222;
--gold:     #C9A84C;   --gold-light:   #E2C97E;   --gold-pale:     #F5E6B8;
--ivory:    #FAF6EE;   --ivory-dark:   #F0E8D5;   --parchment:     #E8DEC6;
--ink:      #1A0A0A;   --ink-soft:     #3B1A1A;
```

### 12.2. Tipografía
- **Títulos:** `Cinzel` (serif, mayúsculas espaciadas).
- **Cuerpo:** `EB Garamond` (serif).
- **Decorativo:** `Cormorant Garamond` (itálico).
- **Iconografía:** Font Awesome 6.4.0 (CDN).

### 12.3. Dónde vive cada regla CSS

| Archivo | Contenido |
| :--- | :--- |
| `base.css` | Reset, variables de layout (`--sidebar-w`, `--rail-w`), táctil, accesibilidad (`prefers-reduced-motion`), z-index de SweetAlert. |
| `shell.css` | `.app-container`, `.sidebar`, `.nav-btn`, `.main-content`, `.topbar`, cajón móvil. |
| `components.css` | `.view`, `.page-title`, `.card`, `.modal`, `.btn-primary`, `.form-group`, tablas responsivas. |
| `login.css` | Login, recuperación, preguntas de seguridad (autocontenido). |
| `admin.css` / `profesor.css` / `estudiante.css` | Solo lo exclusivo de cada panel. |

### 12.4. Puntos de Quiebre

| Dispositivo | Rango | Comportamiento |
| :--- | :--- | :--- |
| **Teléfono** | < 768px | Menú cajón, tablas como tarjetas, modales tipo hoja inferior. |
| **Tablet** | 768–1023px | Barra lateral reducida a carril de íconos (72px). |
| **Laptop** | ≥ 1024px | Barra lateral completa (280px). |
| **Monitor** | ≥ 1440px | Contenido centrado (max-width: 1400px). |

### 12.5. Tablas en Teléfono

`common.js` usa un `MutationObserver` para añadir `data-label` a los `<td>` basándose en los `<th>`:
```js
function etiquetar(tabla) {
    const heads = [...tabla.querySelectorAll('thead th')].map(th => th.textContent.trim());
    tabla.querySelectorAll('tbody tr').forEach(tr => {
        [...tr.children].forEach((td, i) => {
            if (heads[i]) td.setAttribute('data-label', heads[i]);
        });
    });
}
```
Luego, en CSS (`components.css`):
```css
@media (max-width: 767px) {
    .data-table td::before {
        content: attr(data-label);
        font-family: 'Cinzel', serif;
        font-size: 10px;
        color: var(--crimson);
    }
}
```

---

## 13. Scripts Compartidos (`common.js`, `shell.js`)

### 13.1. `common.js`

| Elemento | Detalle |
| :--- | :--- |
| `escapeHtml(str)` | Escapa `& < > " '`; `null`/`undefined` → `''`. |
| `showToast(title, icon)` | Toast de SweetAlert2 (arriba a la derecha, 1.5 s). |
| `openModal(id)` / `closeModal(id)` | `display:flex` + clase `show` y bloqueo del scroll del `body`. |
| `openChangePasswordModal()` | Resetea y abre `#changePasswordModal`. |
| **Esc** | Cierra el último `.modal` visible. Si SweetAlert2 está abierto, le cede el control. |
| **Clic fuera** | Cierra cualquier `.modal` con `id`. |
| `logout()` | `POST /auth/logout.php`, borra `currentUser` y va a `index.html`. |
| `pageshow` | Recarga si la página vuelve desde bfcache. |
| **Cambio de contraseña** | Maneja el submit de `#changePasswordForm`. |
| `MutationObserver` | Pone `data-label` a las tablas. |

### 13.2. `shell.js`

- Añade tooltips al menú de íconos.
- Crea la barra superior móvil (`.topbar`) y el fondo oscuro (`.sidebar-backdrop`).
- Controla el cajón (`body.nav-open`, `aria-expanded`).
- Cierra el cajón al elegir una opción, al hacer clic fuera o con `Esc`.

---

## 14. PWA y Service Worker

### 14.1. `pwa.js`

- **Inyección en `<head>`:** manifest, theme-color, favicon, iOS meta tags.
- **Registro del SW:** `navigator.serviceWorker.register('sw.js')`.
- **Actualización:** Detecta `reg.waiting` y muestra un `Swal` "Nueva versión disponible". Al aceptar, envía `SKIP_WAITING` y recarga.
- **Instalar App:** Captura `beforeinstallprompt` y muestra el botón. En iOS muestra instrucciones de Safari. Se oculta si `display-mode: standalone`.

### 14.2. `sw.js`

**3 Reglas de oro:**
1.  **Nunca** intercepta rutas con `/api/`: Los datos académicos no se guardan.
2.  **Nunca** guarda HTML: Los paneles dependen de la sesión del servidor.
3.  Solo responde a `GET`.

**Estrategias:**

| Recurso | Estrategia |
| :--- | :--- |
| **Navegación (HTML)** | Red primero + `offline.html` en caso de fallo. |
| **CSS/JS propios** | Red primero (caché solo como respaldo). |
| **Imágenes/Fuentes** | Caché primero. |
| **CDNs externos** | Caché + actualización en segundo plano (*stale-while-revalidate*). |

### 14.3. `manifest.webmanifest` y `entrar.php`

- `start_url`: `./entrar.php` (redirige según la sesión).
- `display`: `standalone`.
- Colores: `#FAF6EE` (background), `#8B0000` (theme).
- Íconos: 192, 512 y maskable.

---

## 15. Manejo de Errores y UX

### 15.1. SweetAlert2
- Se usa para confirmaciones (eliminar, restablecer acceso), errores y toasts.
- El `z-index` se eleva (`.swal2-container { z-index: 99999 !important; }`) para quedar sobre los modales.

### 15.2. Errores Comunes y Respuestas del Frontend

| Código | Origen | Respuesta del Frontend |
| :--- | :--- | :--- |
| `401` (credenciales) | Login incorrecto | `Swal` "Credenciales incorrectas". |
| `401` (token) | Sesión expirada | Limpia `localStorage` y redirige a `index.html`. |
| `403` | Sin permisos | `Swal` con el mensaje del backend. |
| `409` (conflicto) | Datos duplicados | `Swal` con el mensaje del backend. |
| `409` (`TRIMESTRE_CERRADO`) | Notas en trimestre cerrado | `manejarTrimestreCerrado()` avisa y refresca. |
| `429` | Cuenta bloqueada | `Swal` con el tiempo restante. |

### 15.3. Estados de Carga
- Los formularios se deshabilitan mientras se envía la petición.
- El botón "Guardar" se vuelve a habilitar al recibir respuesta (éxito o error).

---

## 16. Decisiones de Arquitectura

| Tema | Decisión | Razón |
| :--- | :--- | :--- |
| **No usar frameworks (React, Vue, Angular)** | Vanilla JS | El proyecto es académico y busca demostrar fundamentos. Un framework habría añadido complejidad innecesaria para el tamaño del sistema. |
| **SPA simple por ocultamiento de `div`s** | `.view` y `.active` | Evita recargar la página al cambiar de sección, mejorando la UX. Es más simple que un router. |
| **`localStorage` solo para datos de interfaz** | No guardar tokens | El token vive en la cookie httpOnly, inaccesible desde JS. Esto mitiga XSS. |
| **CSS modular por responsabilidad** | `base`, `shell`, `components`, `<panel>` | Evita duplicación y facilita el mantenimiento. `base.css` tiene las variables, `components.css` los elementos reutilizables, y cada panel solo lo suyo. |
| **SweetAlert2 para modales** | En lugar de `alert()`/`confirm()` | Mejor UX, consistente con el diseño. |
| **MutationObserver para tablas responsivas** | En lugar de etiquetar manualmente | Automatiza el `data-label` en cualquier tabla, sin tocar el HTML. |
| **PWA sin caché de API/HTML** | Regla de seguridad | Los datos académicos son sensibles y dependen de la sesión. Cachearlos sería un riesgo. |
| **Service Worker con `redPrimero` para CSS/JS** | En lugar de `cachePrimero` | Asegura que los cambios se vean al recargar, usando la caché solo como respaldo offline. |

---

## 17. Pendientes y Mejoras Sugeridas

| Área | Descripción |
| :--- | :--- |
| **Ayuda: correos** | Agregar en `AYUDA_COMUN` "¿Recibiré correos del sistema?". |
| **Ayuda sin sesión** | `cargarContactoAdmin` redirige al login sin sesión; decidir si la ayuda debe seguir siendo pública. |
| **Refresco de sesión** | No hay aviso de vencimiento de sesión (8h). |
| **Actividad reciente (admin)** | Solo en memoria; se pierde al recargar. |
| **Admin: comentarios** | No hay vista de comentarios en el panel de admin. |
| **Refactor de `apiGet`** | Las cargas principales repiten `json.data ?? json` en vez de usar `apiGet`. |

**Resueltos en la v2.9.0:**
Generación de íconos PWA, corrección de desborde y formato `S/N` en PDFs, cierre de modales con `Esc` (solo el superior), optimización de `configurar_preguntas.js` (mantiene foco y deshabilita opciones), corrección del resumen en `profesor.js` (vista "Todas"), actualización de fuentes e íconos deprecados.

**Resueltos en la v2.8.0:**
Reglas `.modal` duplicadas, edición de notas del profesor, etiqueta "Trimestre cerrado", fuente `Quicksand` eliminada.

---

*Documentación de frontend generada para uso interno del equipo de desarrollo, como complemento a `documentacion_backend.md`.*