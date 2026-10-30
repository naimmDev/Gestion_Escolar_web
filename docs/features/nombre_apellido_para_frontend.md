# Nombre y apellido separados (estudiante y profesor) — traspaso al frontend

**Backend:** ya listo (`api/helpers/nombres.php` + endpoints). **Archivos front:** `admin.php`, `admin.js`, `profesor.js`, `ayuda.js`, `docs/documentacion_frontend.md`, `?v=` de los modificados.

## 1. Contrato

### GET `/estudiantes/` y `/profesores/` — cada item trae
`name` (completo "Nombre Apellido", **igual que antes**, para no romper tablas), más `firstName` y `lastName`.

### POST / PUT — cambia el body
- **Ya NO se envía `name`.** Enviar `firstName` y `lastName` (obligatorios, máx. 100 c/u, se hace trim).
- Falta alguno → 400 `details.campos: ["firstName"|"lastName"]`. Enviar `name` solo → 400.
- El resto (`email`, `identificacion`, `grade`, `seccion`, `specialty`, `initialPassword`) sin cambios.

### Búsqueda (`search`)
Ahora cubre nombre, apellido y "nombre apellido" juntos.

### Orden
Listados ordenados por **apellido, nombre**.

### Otros endpoints (solo lectura, sin cambios de forma)
- `/matriculas/`: `studentName` = completo; nuevo `studentLastName` (útil para ordenar).
- `/notas/` GET: `estudiante_nombre` y `profesor_nombre` = completos.
- `/comentarios/`: `estudiante_nombre` = completo.
- `login`, sesión, `nombre` del usuario (saludos): siguen siendo el nombre completo.
- Reportes PDF/Excel: individual "Nombre Apellido"; grupal "Apellido, Nombre" ordenado por apellido (lo hace el backend).

## 2. Tareas

**A. `admin.php`:** en los modales de estudiante y profesor reemplazar `studentName`/`professorName` por dos inputs: Nombre (`studentFirstName`) y Apellido (`studentLastName`) — igual para profesor — `maxlength="100"`, `required`.

**B. `admin.js`**
- Al editar: precargar con `s.firstName` / `s.lastName` (≈ líneas 408 y 561).
- Al guardar: enviar `firstName`/`lastName` en vez de `name` (≈ 489 y 635); validar ambos no vacíos antes de enviar.
- Tablas, búsquedas locales, mensajes de confirmación, selects (~30 usos de `s.name`/`t.name`): **no cambiar**, `name` sigue siendo el completo.
- Al limpiar/abrir el modal "nuevo", vaciar ambos campos.

**C. `profesor.js`:** ordenar la lista de estudiantes por apellido: usar `studentLastName` (matrículas) y luego `studentName` en vez de `a.name.localeCompare(b.name)` (≈ línea 345). Mostrar igual `studentName`.

**D. `estudiante.js` / `login.js`:** sin cambios.

**E. Textos/docs:** `ayuda.js` (crear estudiante/profesor: "Nombre" y "Apellido"); `documentacion_frontend.md` (campos del formulario, nota de `firstName`/`lastName`).

## 3. Base de datos (¡importante!)
Cambió el esquema (`apellido NOT NULL` en `estudiante` y `profesor`) y se decidió **BD vacía**:
1. Borrar la BD y recrearla.
2. Importar `database/schema.sql`, luego `database/datos_iniciales.sql` (8 preguntas + admin `admin@escuela.edu` / `admin123`).
3. Los estudiantes/profesores de prueba se vuelven a crear desde el admin (con nombre y apellido).

## 4. Qué NO hacer
- No enviar `name` en POST/PUT.
- No armar el nombre completo concatenando en el front al leer: usar `name`.
- No parsear `name` para separar nombre/apellido: usar `firstName`/`lastName`.

## 5. Checklist
- [ ] Crear estudiante y profesor con nombre y apellido; aparece "Nombre Apellido" en tablas.
- [ ] Editar: ambos campos precargados; guardar actualiza y el saludo del usuario muestra el nombre completo (tras re-login).
- [ ] Dejar uno vacío: no envía / muestra error.
- [ ] Buscar por apellido, por nombre y por "nombre apellido".
- [ ] Listas ordenadas por apellido (admin y profesor).
- [ ] Matrículas muestran el nombre completo.
- [ ] Reporte grupal PDF/Excel: "Apellido, Nombre"; individual y boletín: "Nombre Apellido".
- [ ] Login admin con `admin@escuela.edu`/`admin123` en BD nueva.
- [ ] `Ctrl+F5` tras subir los `?v=`.
