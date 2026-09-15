# Documentación Frontend — Sistema de Gestión Escolar
**Versión:** 1.0
**Stack:** HTML5 · CSS3 · JavaScript (vanilla, sin frameworks) · SweetAlert2 · Font Awesome 6
**Consumo de API:** `http://localhost/gestion_escolar/api` (ver `documentacion_backend_v2.md`)
**Fecha:** Julio 2026

> Este documento complementa `documentacion_backend_v2.md`, que dejaba la sección de frontend
> pendiente ("documentación a cargo de otro integrante del equipo"). Cubre la estructura de
> páginas, los scripts JS, el flujo de autenticación/primer ingreso y, en particular, el
> **sistema de Ayuda**, que no estaba documentado.

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
11. [Notas Técnicas y Caché del Navegador](#11-notas-técnicas-y-caché-del-navegador)
12. [Pendientes / Mejoras Sugeridas](#12-pendientes--mejoras-sugeridas)

---

## 1. Estructura del Proyecto

```
frontend/
├── index.html                  # Login + modal de recuperación de contraseña
├── cambiar_password.html       # Cambio obligatorio de contraseña (primer ingreso)
├── configurar_preguntas.html   # Configuración de 3 preguntas de seguridad (primer ingreso)
├── admin.html                  # Panel del administrador
├── profesor.html                # Panel del profesor
├── estudiante.html             # Panel del estudiante
├── ayuda.html                  # Centro de ayuda (común a los 3 roles)
├── css/
│   ├── login.css                # Login, recuperación de contraseña, preguntas de seguridad
│   ├── admin.css
│   ├── profesor.css
│   ├── estudiante.css
│   └── ayuda.css
└── js/
    ├── api.js                   # Helper central de fetch hacia la API
    ├── login.js                 # Lógica de index.html (login + recuperación)
    ├── cambiar_password.js      # Lógica de cambiar_password.html
    ├── configurar_preguntas.js  # Lógica de configurar_preguntas.html
    ├── admin.js                 # Lógica de admin.html
    ├── profesor.js               # Lógica de profesor.html
    ├── estudiante.js            # Lógica de estudiante.html
    └── ayuda.js                 # Lógica de ayuda.html
```

Cada página HTML carga siempre `js/api.js` antes de su script específico, ya que todos
dependen de `apiFetch()` / `apiGet()` para comunicarse con el backend.

---

## 2. Módulo de Conexión a la API (`api.js`)

Punto único de configuración de la URL base:

```js
const API_URL = 'http://localhost/gestion_escolar/api';
```

### `getToken()`
Lee `currentUser` de `localStorage` y devuelve `user.token` (o `null` si no hay sesión).

### `apiFetch(endpoint, options)`
Wrapper sobre `fetch()` que:
- Agrega automáticamente el header `Content-Type: application/json`.
- Agrega `Authorization: Bearer <token>` si existe sesión.
- Si la respuesta es **401** (token inválido/expirado): limpia `localStorage.currentUser` y
  redirige a `index.html` — esto ocurre de forma silenciosa en cualquier página, funcionando
  como un "logout forzado" ante expiración de sesión (la sesión dura 8 horas, ver backend).
- Si la respuesta es **403**: lanza un `Error` con el mensaje devuelto por el backend
  (`err.error`), para que el código que llama pueda mostrarlo (usualmente vía SweetAlert2).
- En cualquier otro caso, devuelve el objeto `Response` sin procesar — quien llama decide si
  hace `.json()` y valida `res.ok`.

### `apiGet(endpoint)`
Azúcar sintáctica sobre `apiFetch` para peticiones `GET` que solo necesitan el payload:
hace `res.json()` y retorna `json.data ?? json` (compatibilidad con endpoints que devuelven
el array directo o envuelto en `{ success, data }`).

> **Nota:** varias vistas (`admin.js`, `profesor.js`, `estudiante.js`) no usan `apiGet` y en su
> lugar repiten el patrón `const json = await res.json(); const data = json.data ?? json;`
> manualmente. Es candidato a refactor para unificar en `apiGet`.

---

## 3. Sesión de Usuario en el Cliente

Toda la sesión se guarda en `localStorage.currentUser` como JSON, con esta forma:

```json
{
  "email": "...",
  "token": "...",
  "rol": "admin | profesor | estudiante",
  "nombre": "...",
  "id_referencia": null,
  "password_cambiada": true,
  "preguntas_configuradas": true,
  "password_skipped": true
}
```

- `id_referencia`: `null` para admin; para profesor/estudiante es su `id` en la tabla
  correspondiente (`estudiante.id` o `profesor.id`). Se usa para filtrar datos propios en el
  frontend (ej. `profesor.js` filtra `mySubjects` comparando `teacherId === id_referencia`).
- `password_cambiada` / `preguntas_configuradas`: controlan el flujo de primer ingreso
  (sección 4).
- `password_skipped` (opcional, solo en cliente): se agrega cuando el usuario presiona
  **"Más tarde"** al cambiar la contraseña. Permite navegar al panel sin haber cambiado la
  contraseña, pero **no** se envía nunca al backend; es puramente una bandera de UX local.

No existe refresco de token: al expirar la sesión (8h), cualquier llamada a `apiFetch`
devuelve 401 y el usuario es redirigido a `index.html`.

---

## 4. Flujo de Autenticación y Primer Ingreso

```
index.html (login)
      │
      ▼
 rol === 'admin'? ──► sí ──► admin.html (omite todo el flujo de primer ingreso)
      │ no
      ▼
 password_cambiada === false? ──► sí ──► cambiar_password.html
      │ no                                    │
      ▼                                       │ (guardar o "Más tarde")
 preguntas_configuradas === false? ──► sí ──► configurar_preguntas.html
      │ no                                    │
      ▼                                       ▼
 profesor.html / estudiante.html  ◄───────────┘
```

### `login.js`
- Hace `POST /auth/login.php` directamente con `fetch` (no usa `apiFetch`, porque aún no hay
  token).
- Guarda la sesión en `localStorage` con los campos recibidos del backend.
- Redirige según `rol`, `password_cambiada` y `preguntas_configuradas` (ver diagrama arriba).

### `cambiar_password.html` / `cambiar_password.js`
- Se autoprotege: si no hay `currentUser` en `localStorage`, redirige a `index.html`; si
  `password_cambiada` ya es `true`, redirige directo al panel correspondiente (o a
  `configurar_preguntas.html` si faltan las preguntas).
- Envía `POST /auth/cambiar_password.php` con `password_actual` y `password_nueva`.
- Botón **"Más tarde"** (`skipPasswordChange()`): si el rol es `admin`, va directo a
  `admin.html`; si es profesor/estudiante, marca `password_skipped = true` en `localStorage` y
  continúa el flujo (preguntas de seguridad o panel).

### `configurar_preguntas.html` / `configurar_preguntas.js`
- Permite acceso si `password_cambiada` **o** `password_skipped` es verdadero (para no bloquear
  a quien pospuso el cambio de contraseña).
- Carga las 8 preguntas predefinidas vía `GET /auth/preguntas_seguridad.php`.
- Renderiza 3 selects independientes; cada uno excluye las preguntas ya elegidas en los otros
  dos slots (`getOpcionesDisponibles`), evitando duplicados sin depender solo de la validación
  del backend.
- Al enviar, hace `POST /auth/configurar_preguntas.php` con `{ preguntas: [{pregunta_id,
  respuesta}, ...] }` (exactamente 3).
- Actualiza `preguntas_configuradas = true` en `localStorage` y redirige al panel según rol.

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

> El modal se cierra con la `x`, haciendo clic fuera de él (`window.onclick`), o al completar
> la recuperación exitosamente.

---

## 6. Panel de Administrador

**Archivos:** `admin.html` + `js/admin.js` + `css/admin.css`

### Vistas (navegación por `data-view` en `.nav-btn`)
| Vista | Descripción |
|---|---|
| Dashboard | Tarjetas con totales (estudiantes, profesores, materias, matrículas) + actividad reciente **local** (no persiste al recargar, se reconstruye solo con acciones de la sesión actual). |
| Estudiantes | CRUD paginado server-side, con búsqueda y gestión de contraseña inicial. |
| Profesores | CRUD paginado server-side, con búsqueda, gestión de contraseña inicial y materias asignadas. |
| Materias | CRUD paginado server-side, con asignación de profesor. |
| Matrículas | Alta/baja de matrícula estudiante–materia, paginado y con búsqueda. |

### Paginación y búsqueda
Cada entidad mantiene su propio estado independiente (`currentStudentPage`,
`studentSearch`, `perPage`, etc.) y su propio total (`studentTotal`, etc.), consultando los
parámetros `page`, `per_page`, `search` contra el backend (ver sección 7 de
`documentacion_backend_v2.md`). El selector de "por página" (`per-page-select`) reinicia todas
las páginas a 1 al cambiar.

### Gestión de contraseña inicial
- `generatePassword()`: genera una contraseña aleatoria de 6 caracteres alfanuméricos.
- Botón de **regenerar** (🔄): reemplaza el valor del campo, siempre en modo solo lectura.
- Botón de **editar manualmente** (✏️): habilita el campo para escritura libre
  (`togglePasswordEdit`).
- Al guardar (crear o editar estudiante/profesor), la contraseña se envía como
  `initialPassword`.

### Restablecer acceso (`resetStudentAccess` / `resetTeacherAccess`)
Genera una nueva contraseña aleatoria y hace `PUT` reenviando todos los campos del usuario más
`initialPassword`. Esto dispara en el backend el reseteo de `password_cambiada` y
`preguntas_configuradas` (ver documentación backend, sección de `PUT /estudiantes` y
`PUT /profesores`), forzando al usuario a repetir el flujo de primer ingreso. El frontend
muestra la nueva contraseña en un `Swal.fire` para que el admin la comunique manualmente.

### Cambio de contraseña propia
Modal `#changePasswordModal`, disponible en el sidebar de las tres vistas (admin, profesor,
estudiante) con la misma lógica: `POST /auth/cambiar_password.php`.

---

## 7. Panel de Profesor

**Archivos:** `profesor.html` + `js/profesor.js` + `css/profesor.css`

### Carga inicial (`loadData`)
Trae en paralelo (`Promise.all`) `materias`, `matriculas`, `notas` y `comentarios`, y luego
filtra en el cliente:
- `mySubjects`: materias donde `teacherId === id_referencia` del profesor.
- `myEnrollments` / `myGrades`: ya vienen filtrados por el backend según el rol del token.
- `myStudents`: se deriva de `myEnrollments`, deduplicando por `studentId`.

### Gestión de notas
- Selección de materia → lista de estudiantes agrupados por grado (`renderStudentsByGrade`),
  con búsqueda local por nombre, email o sección (`studentGradeSearch`).
- Modal de detalle por estudiante (`openStudentGradesModal`), con pestañas por trimestre
  (`I`, `II`, `III`, `Todas`).
- **Cálculo de nota trimestral en el cliente** (`calcularNotaTrimestral`,
  `generarResumenTrimestre`): replica la misma fórmula que el backend
  (`(promedio_parciales + promedio_apreciacion + examen) / 3`, solo si los tres componentes
  existen) — usado para mostrar retroalimentación inmediata sin esperar al endpoint de resumen.
- Alta de nota: valida rango 1.0–5.0 en el cliente antes de enviar, y bloquea visualmente
  (`disabled`) la opción "Examen Trimestral" en el select si ya existe uno registrado para ese
  estudiante/materia/trimestre.
- Eliminación de nota: confirmación con SweetAlert2 antes de `DELETE /notas/`.
- Tras cualquier alta/baja, `reloadGradesAndRefresh()` vuelve a pedir `/notas/` completo y
  recalcula estadísticas y vistas dependientes.

  ### Exportación de boletines en PDF / Excel (nuevo)

Se agregaron tres puntos de exportación, todos generados 100% en el navegador (sin
depender del endpoint de backend `/api/notas/exportar.php`, reservado para exportación
por materia individual desde otro flujo):

**Librerías añadidas (CDN):** jsPDF 2.5.1, jspdf-autotable 3.8.2, SheetJS (xlsx) 0.18.5.
Cargadas en `estudiante.html` y `profesor.html`.

**Selector de formato:** al presionar cualquier botón "Exportar Notas", se muestra un
`Swal.fire` con tres opciones (PDF, Excel, Cancelar) mediante la función
`elegirFormatoExportacion()`, duplicada en `estudiante.js` y `profesor.js` por ser
scripts independientes.

**1. Boletín del estudiante (`estudiante.js` — `exportarBoletin(trimestre)`):**
Botón junto al badge de cada trimestre en el Reporte Académico. Genera una tabla
horizontal con una fila por materia matriculada: Total Parciales, Total Apreciación,
Examen Trimestral y Nota Final (resultado de ese trimestre específico, vía
`generarResumenTrimestre`). Cualquier componente sin registros se muestra como `S/N`
en vez de `0`. Incluye un renglón de promedio general del trimestre al pie, calculado
sobre la columna Nota Final. No se incluye el promedio final anual del curso en este
boletín (por trimestre) para evitar ambigüedad entre "nota del trimestre" y "nota final
del año" bajo el mismo nombre de columna; ese dato solo aparece en el boletín individual
generado desde el panel de profesor, donde ambos valores tienen sentido en el mismo
documento (una fila por trimestre + una fila final aparte).
**2. Reporte grupal por grado (`profesor.js` — `exportarBoletinGrupo(grado)`):**
Botón junto al encabezado de cada grupo de grado en "Gestionar Notas" (ej. "Grado 10°").
Exporta una fila por estudiante de ese grado matriculado en la materia seleccionada, con
columnas: Total Parciales, Total Apreciación, Examen Trimestral y Nota Final. Los
promedios se calculan sobre **todas** las notas de ese tipo registradas en la materia,
sin filtrar por trimestre (puede haber hasta 3 exámenes, uno por trimestre). Si el
estudiante no tiene ningún registro de un tipo, se muestra `S/N`.

**3. Boletín individual del estudiante (`profesor.js` — `exportarBoletinIndividual()`):**
Botón junto a las pestañas de trimestre dentro del modal de detalle de un estudiante.
Exporta una fila por cada uno de los 3 trimestres (Total Parciales, Total Apreciación,
Examen Trimestral, Nota Trimestral) más una línea final con la **Nota Final** del curso
(`calcularPromedioFinal(estudianteId, materiaId)`), independientemente de qué pestaña de
trimestre esté activa en el modal al momento de exportar.

**Consistencia de cálculos:** las tres exportaciones reutilizan las mismas funciones que
ya alimentan las vistas en pantalla (`generarResumenTrimestre`, `calcularPromedioFinal`),
por lo que los valores del PDF/Excel nunca pueden divergir de lo que el usuario ve en la
interfaz.

**Nombres de archivo generados:**
- Estudiante: `boletin_<estudiante>_<trimestre>.pdf` / `.xlsx`
- Grupal: `reporte_grupal_<materia>_<grado>.pdf` / `.xlsx`
- Individual (profesor): `boletin_<estudiante>_<materia>.pdf` / `.xlsx`

### Comentarios
Vista de solo lectura con los comentarios enviados por estudiantes en las materias del
profesor (`GET /comentarios/`, ya filtrado por rol en backend).

---

## 8. Panel de Estudiante

**Archivos:** `estudiante.html` + `js/estudiante.js` + `css/estudiante.css`

### Carga inicial (`loadData`)
Trae `matriculas`, `notas` y `materias` en paralelo, y filtra `mySubjects` a solo las materias
en las que el estudiante está matriculado.

### Reporte de notas por trimestre
- `renderGradesReport()` construye una tabla por cada uno de los 3 trimestres, mostrando por
  materia: cantidad de notas, nota trimestral (o "En curso" si falta algún componente) y un
  badge de estado (Aprobado / En proceso / Incompleto / Sin definir).
- Los trimestres son colapsables (clic en el encabezado).
- **Modal de detalle** (`openGradesDetailModal`): agrupa las notas por tipo (Parciales,
  Apreciación, Examen Trimestral) con su promedio, y muestra el resumen final del trimestre.
- El promedio general del dashboard (`myAverage`) es un promedio simple de todas las notas
  registradas por materia (no el promedio trimestral ponderado); es una métrica informativa
  distinta de la "nota trimestral" oficial.

  ### Exportación de boletín en PDF (nuevo)

Cada acordeón de trimestre (I, II, III) incluye un botón **"Exportar Notas"** ubicado junto
al badge que indica si hay o no notas registradas en ese período.

- **Librerías:** jsPDF 2.5.1 + jspdf-autotable 3.8.2, cargadas por CDN en `estudiante.html`.
  No requiere backend: el PDF se genera enteramente en el navegador con los datos ya cargados
  en memoria (`mySubjects`, `myGrades`).
- **Función:** `exportarBoletinTrimestre(trimestre)` en `estudiante.js`.
- **Formato del boletín:** una fila horizontal por cada materia en la que el estudiante está
  matriculado (`mySubjects`), con columnas: Materia, Total Parciales, Total Apreciación,
  Examen Trimestral, Nota Trimestral. Reutiliza `generarResumenTrimestre(subjectId, trimestre)`,
  la misma función que alimenta el modal de detalle en pantalla, garantizando que el PDF y la
  vista web nunca muestren cifras distintas.
- **Regla de "S/N":** si una materia no tiene ninguna nota del componente correspondiente
  (parcial, apreciación o examen) en ese trimestre, la celda muestra `S/N` en lugar de `0`.
  Si el componente tiene una sola nota, se muestra ese puntaje; si tiene varias, se muestra
  el promedio, igual que en la fórmula oficial de nota trimestral.
- **Pie del documento:** promedio general del trimestre, calculado como el promedio de las
  notas trimestrales de las materias que sí tienen los tres componentes completos (ignora
  las `S/N` en ese cálculo, no las trata como 0).
- **Nombre del archivo:** `boletin_<estudiante>_<trimestre>.pdf`.
- **Diferencia con el endpoint de backend (`GET /api/notas/exportar.php`, ver
  `contrato_exportacion_frontend.md`):** ese endpoint exporta una sola materia por llamada
  (o el grupal de una materia, en el panel de profesor) y requiere `materia_id` obligatorio.
  Esta nueva función resuelve un caso distinto: un boletín consolidado con **todas** las
  materias matriculadas del estudiante en un solo PDF, por lo que se optó por generarlo
  100% en cliente en vez de extender el endpoint existente.

### Comentarios
El estudiante puede enviar un comentario sobre una materia en la que esté matriculado
(`POST /comentarios/`, valida en backend que exista la matrícula) y ver el historial de sus
propios comentarios enviados.

---

## 9. Sistema de Ayuda (`ayuda.html` / `ayuda.js`)

Módulo de FAQ **contextual por rol**, accesible desde el botón "Ayuda" del sidebar en los tres
paneles (`admin.html`, `profesor.html`, `estudiante.html`), enlazando a `ayuda.html`.

### Detección del rol activo
```js
function getCurrentRole() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    return user?.rol || null;
}
```
No requiere `apiFetch` ni llamadas a la API: toda la información de ayuda es **estática**,
definida como arrays de objetos `{ q, a }` directamente en `ayuda.js`. Si no hay usuario en
sesión (o el rol no coincide con ninguno conocido), se muestran **todas** las secciones de
todos los roles como fallback.

### Contenido por bloques
| Constante | Contenido |
|---|---|
| `AYUDA_COMUN` | Login, primer ingreso, preguntas de seguridad, recuperación de contraseña, cambio de contraseña desde el panel, cerrar sesión. Se muestra siempre, sin importar el rol. |
| `AYUDA_ADMIN` | Dashboard, alta/baja/edición de estudiantes y profesores, gestión de materias, asignación de matrículas, y **restablecer acceso** de un usuario (explica que se genera una nueva contraseña inicial y se repite el flujo de primer ingreso). |
| `AYUDA_PROFESOR` | Dashboard, ver materias asignadas, registrar/editar/eliminar notas, ver comentarios de estudiantes. |
| `AYUDA_ESTUDIANTE` | Dashboard, consultar notas por trimestre, enviar comentarios, y por qué una nota trimestral puede aparecer como "En curso" (explica que falta algún componente: Parciales, Apreciación o Examen Trimestral). |
| `AYUDA_FAQ` | Preguntas transversales (contraseña olvidada, preguntas de seguridad olvidadas). Incluye un ítem exclusivo para `admin` (campo `roles: ['admin']`) explicando por qué no se puede eliminar un estudiante/profesor/materia con calificaciones asociadas. |

### Construcción dinámica de secciones (`buildSections(role)`)
1. Siempre agrega "Acceso al sistema" (`AYUDA_COMUN`).
2. Según el rol, agrega **solo** la sección correspondiente (`admin` → panel del
   administrador; `profesor` → panel del profesor; `estudiante` → panel del estudiante). Si no
   hay rol detectado, agrega las tres.
3. Filtra `AYUDA_FAQ` con `item.roles`, para que preguntas específicas de un rol (como la de
   eliminación con notas asociadas) no aparezcan a usuarios de otros roles.
4. Siempre agrega "Preguntas frecuentes" al final.

### Renderizado y comportamiento de UI
- `renderAyuda(sections)` genera un acordeón: cada pregunta es clicable
  (`toggleAyudaItem`) y expande/colapsa su respuesta animando `max-height` según
  `scrollHeight`.
- Las respuestas (`item.a`) permiten HTML enriquecido con `<strong>` para resaltar botones o
  acciones referenciadas (ej. `<strong>"Guardar y continuar"</strong>`); el resto del texto se
  escapa con `escapeHtmlAyuda()` para evitar inyección al mostrar preguntas.
- **Búsqueda en vivo** (`#ayudaSearch`, evento `input`): filtra tanto preguntas como
  respuestas por coincidencia de subcadena (case-insensitive) contra
  `allSectionsCache`, ocultando secciones que quedan sin resultados y mostrando el mensaje
  "No se encontraron resultados." si la búsqueda no arroja nada.
- `volverAlPanel()`: navega de regreso al panel correspondiente al rol detectado
  (`admin.html`, `profesor.html`, `estudiante.html`); si no hay rol, cae a `index.html`.

### Cómo extender el contenido de ayuda
Para agregar una nueva pregunta:
1. Agregar `{ q: '...', a: '...' }` al array correspondiente (`AYUDA_COMUN`, `AYUDA_ADMIN`,
   `AYUDA_PROFESOR`, `AYUDA_ESTUDIANTE` o `AYUDA_FAQ`).
2. Si es una pregunta exclusiva de un rol dentro de `AYUDA_FAQ`, agregar
   `roles: ['admin' | 'profesor' | 'estudiante']`.
3. No se requiere tocar `ayuda.js` fuera de estos arrays ni tocar `ayuda.html`: el
   renderizado es completamente dinámico.
4. Recordar subir el parámetro de versión en el `<link>` de `ayuda.css` (`?v=`) si se editan
   estilos, para evitar problemas de caché (ver sección 11).

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
  itálico/decorativo), `EB Garamond` (cuerpo de texto), cargadas vía Google Fonts.
- Iconografía: Font Awesome 6 (CDN).
- Cada panel (`admin`, `profesor`, `estudiante`) reutiliza la misma estructura de sidebar fijo
  + `.main-content`, y el mismo patrón de `.view` / `.view.active` para alternar secciones sin
  recargar la página (SPA simple por ocultamiento de `div`s).
- Los modales comparten la clase `.modal` / `.modal-content` con una variante duplicada de
  reglas en cada hoja de estilo (existe una segunda definición idéntica de `.modal` al final
  de `admin.css`, `profesor.css` y `estudiante.css` — redundante, candidato a limpieza).
- SweetAlert2 se usa de forma consistente para confirmaciones, errores y notificaciones tipo
  toast en las tres vistas de rol.

---

## 11. Notas Técnicas y Caché del Navegador

Varios archivos (`ayuda.css`, `admin.css`, `admin.js`) incluyen comentarios explícitos sobre
un problema recurrente: los cambios no se reflejan en el navegador aunque se recargue con
`Ctrl+Shift+R`, debido a caché agresiva del archivo estático.

**Solución documentada en el propio código:** en la etiqueta `<link>` o `<script>` que carga el
archivo, subir manualmente el parámetro de versión:
```html
<link rel="stylesheet" href="css/ayuda.css?v=3.0" />
```
Cada valor distinto de `?v=` fuerza al navegador a tratarlo como una URL nueva y descargar el
archivo actualizado. Solo es necesario mientras se edita activamente el archivo; una vez
estable, puede dejarse el número como está.

> Actualmente `ayuda.html` ya usa `?v=3.0`; el resto de páginas (`admin.html`, `profesor.html`,
> `estudiante.html`) referencian sus CSS/JS **sin** parámetro de versión. Se recomienda
> unificar el criterio si el equipo sigue iterando sobre esos archivos.

---

## 12. Pendientes / Mejoras Sugeridas

| Área | Descripción |
|---|---|
| **Refresco de sesión** | No hay renovación de token; al expirar (8h) el usuario es desconectado sin aviso previo (solo redirige en el próximo `apiFetch`). |
| **Actividad reciente (admin)** | Es puramente local (`activities` en memoria de `admin.js`); se pierde al recargar la página. Podría persistirse en backend. |
| **Duplicación de reglas `.modal`** | Cada hoja de estilo de panel repite dos veces el bloque `.modal` / `.modal-content`. Se puede consolidar en un archivo CSS compartido. |
| **Uso inconsistente de `apiGet`** | `admin.js`, `profesor.js` y `estudiante.js` repiten manualmente `json.data ?? json` en vez de usar la función `apiGet` ya disponible en `api.js`. |
| **Versionado de caché** | Falta parámetro `?v=` en la mayoría de páginas fuera de `ayuda.html` (ver sección 11). |
| **Panel de períodos (referencia backend)** | Cuando se implemente la tabla `periodo` y el bloqueo de trimestres cerrados (pendiente documentado en el backend), el frontend de profesor deberá deshabilitar el formulario de alta de notas fuera del período activo. |
| **Boletín consolidado (estudiante)** | Implementado en frontend (jsPDF, cliente). Pendiente: extender el mismo patrón de boletín horizontal al panel de profesor (exportar boletín de un estudiante en todas sus materias, o de un grupo completo por materia usando el endpoint ya existente `/api/notas/exportar.php`). |

| **Filtro de trimestre en reporte grupal** | El reporte grupal por grado actualmente agrega notas de todos los trimestres sin distinción. Si se requiere exportar solo un trimestre específico a nivel grupal, hay que agregar un selector de trimestre en la vista "Gestionar Notas" (fuera del modal de estudiante). |
---

*Documentación de frontend generada para uso interno del equipo de desarrollo, como
complemento a `documentacion_backend_v2.md`.*
