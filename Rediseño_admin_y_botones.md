# Rediseño de navegación — Panel Admin + ajuste del botón Boletín

Documento para la compañera de frontend. Cubre 3 cambios independientes entre sí (se pueden aplicar en el orden que convenga):

1. Fusionar "Estudiantes" y "Profesores" en un solo ítem "Usuarios" (solo navegación, cero cambio de lógica).
2. Nueva vista "Reportes" en el panel admin (usa el endpoint `exportar.php` ya habilitado para rol `admin`).
3. Reubicar el botón "Exportar Boletín" en la vista de estudiante (hoy queda al fondo de la página).

Ninguno de los 3 toca `api/` — es trabajo 100% de `frontend/`.

---

## 1. Fusionar Estudiantes + Profesores → "Usuarios"

### Objetivo
Un solo botón en el sidebar en vez de dos, para liberar espacio y agrupar lo que conceptualmente es "gestión de personas". Las tablas, modales y llamadas a la API de estudiantes y profesores **no se tocan** — solo cambia cómo se navega entre ellas.

### `admin.php`

**Sidebar — reemplazar estos 2 botones:**
```html
<button class="nav-btn" data-view="students"><i class="fas fa-user-graduate"></i> <span> Estudiantes</span></button>
<button class="nav-btn" data-view="professors"><i class="fas fa-chalkboard-user"></i> <span> Profesores</span></button>
```
**por 1 solo:**
```html
<button class="nav-btn" data-view="users"><i class="fas fa-users"></i> <span> Usuarios</span></button>
```

**Contenido — envolver las 2 vistas existentes en un contenedor nuevo con tabs internos.**

Busca:
```html
<div id="studentsView" class="view">
    ...todo el contenido actual...
</div>

<div id="professorsView" class="view">
    ...todo el contenido actual...
</div>
```

Reemplaza por (el contenido interno de cada `div` NO cambia, solo la clase y el envoltorio):
```html
<div id="usersView" class="view">
    <div class="users-tabs">
        <button class="user-tab-btn active" data-usertab="students">
            <i class="fas fa-user-graduate"></i> Estudiantes
        </button>
        <button class="user-tab-btn" data-usertab="professors">
            <i class="fas fa-chalkboard-user"></i> Profesores
        </button>
    </div>

    <div id="studentsView" class="user-tab-panel active">
        ...todo el contenido actual de studentsView, SIN CAMBIOS...
    </div>

    <div id="professorsView" class="user-tab-panel">
        ...todo el contenido actual de professorsView, SIN CAMBIOS...
    </div>
</div>
```

> Importante: `studentsView` y `professorsView` cambian su clase de `view` a `user-tab-panel`. Ya no son ellos los que se muestran/ocultan por la navegación principal — ahora los maneja el tab interno. `usersView` es quien tiene la clase `view`.

### `js/admin.js`

**En el listener de navegación principal** (busca `document.querySelectorAll('.nav-btn').forEach`), donde están los `if (view === '...')`, agrega:
```js
if (view === 'users') {
    loadStudentsPage();
    loadProfessorsPage();
}
```
y puedes quitar (o dejar, no hace daño) las líneas viejas `if (view === 'students') ...` y `if (view === 'professors') ...` ya que ese `data-view` no existe más.

**Agregar un listener nuevo, aparte, para los tabs internos** (puede ir justo después del bloque de navegación principal):
```js
document.querySelectorAll('.user-tab-btn').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.user-tab-btn').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.user-tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${this.dataset.usertab}View`).classList.add('active');
    });
});
```

### `css/admin.css` — agregar (no reemplaza nada existente)

```css
.users-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.user-tab-btn {
    padding: 10px 18px;
    border: 1px solid var(--parchment, #e8dec6);
    border-radius: 8px;
    background: var(--ivory, #faf6ee);
    color: var(--crimson-deep, #5c0000);
    font-family: 'Quicksand', sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.user-tab-btn:hover {
    background: var(--gold-pale, #f5e6b8);
}

.user-tab-btn.active {
    background: var(--crimson, #8b0000);
    color: #fff;
    border-color: var(--crimson, #8b0000);
}

.user-tab-panel { display: none; }
.user-tab-panel.active { display: block; }
```

Ajusta los nombres de variables CSS (`--crimson`, `--parchment`, etc.) a los que ya existan en `admin.css` — usa los mismos que ya tienen definidos ahí, esto es solo referencia de la paleta que ya manejan.

### Qué NO cambia
- `loadStudentsPage()`, `loadProfessorsPage()`, modales de crear/editar/eliminar, paginación, búsqueda — todo igual.
- Las llamadas a `/estudiantes/` y `/profesores/` — igual.

---

## 2. Nueva vista "Reportes" (panel admin)

### Contexto
El backend ya soporta que `admin` exporte 3 tipos de reporte sin restricción de "materia propia" (eso solo aplica a profesor):

| Qué llena el admin | Qué genera `exportar.php` |
|---|---|
| Solo estudiante | Boletín completo (todas sus materias, 3 trimestres + nota final) |
| Estudiante + materia | Individual: esa materia, por trimestre + nota final del curso |
| Materia (+ grado opcional) | Grupal: todos los matriculados de esa materia (o de ese grado) |

El formato (PDF/Excel) y trimestre se piden con los diálogos que ya existen en `reportes.js` (`elegirFormatoExportacion()`, `elegirTrimestreExportacion()`) — no se reescriben.

### `admin.php` — agregar botón en sidebar (donde quedó el espacio libre tras la fusión del punto 1)

```html
<button class="nav-btn" data-view="reports"><i class="fas fa-file-export"></i> <span> Reportes</span></button>
```

### `admin.php` — nueva vista

```html
<div id="reportsView" class="view">
    <h2 class="page-title"><i class="fas fa-file-export"></i> Reportes</h2>

    <div class="card reports-card">
        <p class="reports-help">
            Elige qué quieres exportar. Si solo seleccionas un estudiante, se genera su boletín completo.
            Si además eliges una materia, se genera el reporte de esa materia. Si solo eliges una materia
            (sin estudiante), se genera el reporte grupal — puedes acotarlo a un grado.
        </p>

        <div class="report-form">
            <label>
                Estudiante (opcional)
                <select id="reportStudentSelect">
                    <option value="">— Todos / no aplica —</option>
                    <!-- se llena dinámicamente con todos los estudiantes -->
                </select>
            </label>

            <label>
                Materia (opcional si eliges estudiante solo)
                <select id="reportSubjectSelect">
                    <option value="">— Ninguna —</option>
                    <!-- se llena dinámicamente con todas las materias -->
                </select>
            </label>

            <label>
                Grado (solo aplica si eliges Materia sin Estudiante)
                <select id="reportGradeSelect">
                    <option value="">— Todos los grados —</option>
                    <!-- se llena dinámicamente con los grados existentes -->
                </select>
            </label>

            <button class="btn-exportar-individual" onclick="exportarReporteAdmin()">
                <i class="fas fa-file-export"></i> Exportar
            </button>
        </div>
    </div>
</div>
```

### `js/admin.js` — agregar

```js
if (view === 'reports') loadReportsPage();
```
dentro del mismo bloque de navegación del punto 1.

**Función para llenar los selects** (usa los mismos endpoints que ya usan `loadStudentsPage`/`loadSubjectsPage` — ajusta nombres si tus funciones de fetch ya traen esta data cacheada y no hace falta pedirla de nuevo):

```js
async function loadReportsPage() {
    const estudiantes = await apiGet('/estudiantes/?per_page=100');
    const materias     = await apiGet('/materias/');

    const studentSelect = document.getElementById('reportStudentSelect');
    const subjectSelect = document.getElementById('reportSubjectSelect');
    const gradeSelect   = document.getElementById('reportGradeSelect');

    studentSelect.innerHTML = '<option value="">— Todos / no aplica —</option>' +
        (estudiantes.items || estudiantes).map(e =>
            `<option value="${e.id}">${escapeHtml(e.name)} — ${escapeHtml(e.grade || 'Sin grado')}</option>`
        ).join('');

    subjectSelect.innerHTML = '<option value="">— Ninguna —</option>' +
        materias.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.code)})</option>`).join('');

    const grados = [...new Set((estudiantes.items || estudiantes).map(e => e.grade).filter(Boolean))].sort();
    gradeSelect.innerHTML = '<option value="">— Todos los grados —</option>' +
        grados.map(g => `<option value="${g}">${escapeHtml(g)}</option>`).join('');
}

async function exportarReporteAdmin() {
    const estudianteId = document.getElementById('reportStudentSelect').value || null;
    const materiaId     = document.getElementById('reportSubjectSelect').value || null;
    const grado         = document.getElementById('reportGradeSelect').value || null;

    if (!estudianteId && !materiaId) {
        Swal.fire('Falta información', 'Elige al menos un estudiante o una materia.', 'warning');
        return;
    }

    const format = await elegirFormatoExportacion();
    if (!format) return;

    const trimestre = await elegirTrimestreExportacion();
    if (trimestre === null) return;

    await exportarReporte({
        format,
        estudiante_id: estudianteId || undefined,
        materia_id: materiaId || undefined,
        grado: (!estudianteId && grado) ? grado : undefined,
        trimestre: trimestre === 'TODOS' ? undefined : trimestre
    });
}
```

> Ajusta `apiGet('/estudiantes/?per_page=100')` si la paginación por defecto es menor a tu número real de estudiantes, o usa el endpoint que ya tengan para traer la lista completa sin paginar.

### `css/admin.css` — agregar

```css
.reports-card { padding: 24px; }
.reports-help { color: #8a7055; margin-bottom: 18px; font-size: 14px; }
.report-form { display: flex; flex-direction: column; gap: 16px; max-width: 420px; }
.report-form label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; color: var(--crimson-deep, #5c0000); }
.report-form select { padding: 10px; border-radius: 8px; border: 1px solid var(--parchment, #e8dec6); font-family: 'Quicksand', sans-serif; }
```

---

## 3. Reubicar el botón "Exportar Boletín" en la vista de estudiante

### Problema
En `js/estudiante.js`, dentro de `renderGradesReport()`, el botón de boletín completo (`.btn-exportar-boletin-completo`, dentro de `.boletin-completo-card`) se agrega **después** de renderizar los 3 bloques de trimestre — queda al final de la página, hay que hacer scroll para verlo.

### Solución
Mover ese mismo bloque HTML (sin cambiarlo) de después del `for` de trimestres, a justo después del header del reporte (`.report-header`, donde está el promedio general) — así queda visible sin scroll, junto al resumen.

**Busca este fragmento dentro de `renderGradesReport()`:**
```js
let html = `
    <div class="report-header">
        <h3><i class="fas fa-chart-line"></i> Reporte Académico</h3>
        <div class="general-average">
            <div class="label"><i class="fas fa-chart-simple"></i> Promedio General</div>
            <div class="value">${generalAvg}</div>
        </div>
    </div>
`;

for (const trimestre of TRIMESTRES) {
    html += renderTrimestreSection(trimestre);
}

html += `
    <div class="boletin-completo-card">
        <div class="boletin-completo-text">
            <i class="fas fa-scroll"></i>
            <span>Descarga tu boletín completo con los tres trimestres y tu nota final por materia</span>
        </div>
        <button class="btn-exportar-boletin-completo" onclick="exportarBoletinCompleto()">
            <i class="fas fa-file-export"></i> Exportar Boletín
        </button>
    </div>
`;
```

**Reemplázalo por (mismo contenido, solo se movió el bloque `.boletin-completo-card` antes del `for`):**
```js
let html = `
    <div class="report-header">
        <h3><i class="fas fa-chart-line"></i> Reporte Académico</h3>
        <div class="general-average">
            <div class="label"><i class="fas fa-chart-simple"></i> Promedio General</div>
            <div class="value">${generalAvg}</div>
        </div>
    </div>

    <div class="boletin-completo-card">
        <div class="boletin-completo-text">
            <i class="fas fa-scroll"></i>
            <span>Descarga tu boletín completo con los tres trimestres y tu nota final por materia</span>
        </div>
        <button class="btn-exportar-boletin-completo" onclick="exportarBoletinCompleto()">
            <i class="fas fa-file-export"></i> Exportar Boletín
        </button>
    </div>
`;

for (const trimestre of TRIMESTRES) {
    html += renderTrimestreSection(trimestre);
}
```

No se necesita ningún cambio de CSS — la clase `.boletin-completo-card` ya existe y se ve igual, solo cambió su posición en el flujo del HTML.

### Nota sobre el botón "Exportar Notas" por trimestre
Ese botón (`.btn-exportar-boletin`, dentro de cada `trimestre-header`) ya está visible de entrada — no se toca, solo se confirma que no hace falta moverlo.

---

## Resumen de archivos que usarás

| Archivo | Cambios |
|---|---|
| `frontend/admin.php` | Fusión de sidebar + contenedor `usersView` con tabs · nueva vista `reportsView` |
| `frontend/js/admin.js` | Listener de tabs internos de Usuarios · `loadReportsPage()` · `exportarReporteAdmin()` |
| `frontend/css/admin.css` | Estilos de `.users-tabs`/`.user-tab-btn` · `.reports-card`/`.report-form` |
| `frontend/js/estudiante.js` | Reordenar el bloque `.boletin-completo-card` dentro de `renderGradesReport()` |

Ningún archivo de `api/` se toca en este documento — el backend de exportación para admin ya está listo.