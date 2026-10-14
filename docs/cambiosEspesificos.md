# Cambios — SGE (Admin: reportes, búsquedas y limpieza)

## 1. Limpieza de código duplicado

| Archivo | Cambio |
|---|---|
| `frontend/js/estudiante.js` | Eliminar `container.innerHTML = html;` duplicado en `renderGradesReport()` |
| `frontend/css/estudiante.css` | Eliminar el segundo bloque de modal ("MODAL (superpuesto sobre toda la página)") |
| `frontend/css/profesor.css` | Eliminar el primer bloque `.modal { ... z-index: 1050 }` (el segundo lo sobrescribe) |
| `api/auth/login.php` | Quitar `require_once cors.php`, `aplicarCORS()` y el bloque OPTIONS (ya los hace `db.php`) |

Verificar: modal "Cambiar contraseña" (estudiante/profesor), reporte del estudiante, login desde el navegador.

## 2. Selector de materias con buscador (Reportes y Matrículas)

Motivo: el `<select>` nativo se abría a pantalla completa y no se puede limitar con CSS.

**`admin.php`**
- `reportsView`: materia pasa a caja de búsqueda `#reportSubjectSearch` + `<select id="reportSubjectSelect" class="student-list" size="6">`.
- `enrollmentModal`: igual con `#enrollmentSubjectSearch` + `#enrollmentSubject`.
- `<p class="reports-help">` reemplazado por `<p class="reports-help" id="reportPreview">` (vista previa dinámica).

**`admin.js`**
- Nueva `montarBuscadorMaterias(selectId, searchId, materias, placeholder, onChange)`.
- Nueva `actualizarVistaPreviaReporte()` (muestra qué se va a generar: boletín, individual o grupal con grado/sección).
- `loadReportsPage()`: usa `montarBuscadorMaterias` y enlaza `onchange` de estudiante, grado y sección a la vista previa.
- `openEnrollmentModal()`: usa `montarBuscadorMaterias` para materias.
- `buscarEstudiantes()`: tras repintar, `if (cfg === BUSCADOR_REPORTES) actualizarVistaPreviaReporte();`.
- `exportarReporteAdmin()`: orden unificado **trimestre → formato** (igual que el profesor).

**`admin.css`**
- Reemplazar (no duplicar) la regla existente:
```css
.form-group select.student-list {
    min-height: 130px;
    max-height: 160px;
    padding: 6px;
}
```

## 3. Fix: columnas "Materias" (profesores) y "Profesor" (materias)

Bug: se calculaban con la página actual (10 registros), mostrando "Sin materias" / "Sin asignar" por error.

**`admin.js`**
- Nuevo `allSubjectsCache` + `getAllSubjects(force)` junto a `getAllTeachers`.
- `loadSubjectsPage()`: tras `subjectTotal`, `allSubjectsCache = null;` y `await getAllTeachers()` (en try/catch).
- `loadProfessorsPage()`: tras `professorTotal`, `await getAllSubjects()` (en try/catch).
- `renderTeachers()`: `subjects` → `(allSubjectsCache || subjects)`.
- `renderSubjects()`: `teachers.find` → `(allTeachersCache || teachers).find`.

## 4. Pendientes menores (opcionales)

- Quitar el `<select multiple id="professorSubjects">` del modal de profesor (no se envía al backend).
- Eliminar código sin uso: `calcularPromedioFinal` (profesor.js, estudiante.js), `openChangePasswordModal` (admin.js), `allStudentsCache`.
- Actualizar `ayuda.js` y `documentacion_frontend.md`: filtro por sección, buscador de materias y vista previa de reportes.
- Idea: Permitir matricular varias materias a la vez en Matrículas.
