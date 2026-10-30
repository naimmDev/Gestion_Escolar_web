# Ajustes pendientes — nombre y apellido (frontend)

Lo principal (formularios de admin) ya está funcionando. Quedan estos retoques. Backend ya listo: `/matriculas/` devuelve `studentLastName`.

Archivos: `frontend/js/profesor.js`, `frontend/js/ayuda.js`, `frontend/profesor.php` (`?v=`), `docs/documentacion_frontend.md`.

## 1. Orden de estudiantes en la vista de profesor (`profesor.js`)

Hoy `renderStudentsByGrade()` ordena por `name` ("Nombre Apellido"), o sea por nombre de pila. Debe ordenar por apellido, luego nombre.

a) En `normalizeEnrollment` (junto a `studentName`, ≈ línea 59) agregar:
```js
studentLastName: e.studentLastName || '',
```

b) En la construcción de `studentMap` (≈ línea 115), junto a `name: e.studentName,` agregar:
```js
lastName: e.studentLastName || '',
```

c) En `renderStudentsByGrade()` (≈ línea 345) reemplazar el sort por:
```js
students.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '') || a.name.localeCompare(b.name));
```

Opcional: en `filterStudentSearch` nada cambia (`name` ya incluye el apellido).

## 2. Textos de ayuda (`ayuda.js`)

- "¿Cómo registro un nuevo estudiante?": cambiar "Complete identificación, nombre, correo, grado y sección" por "Complete identificación, nombre, apellido, correo, grado y sección".
- "¿Cómo gestiono profesores?": cambiar "indicando nombre, identificación, correo y especialidad" por "indicando nombre, apellido, identificación, correo y especialidad".
- "¿Cómo busco, edito o elimino un estudiante?": cambiar "filtrar por nombre, correo o identificación" por "filtrar por nombre, apellido, correo o identificación".

## 3. Limpieza menor
- `profesor.js` ≈ línea 123: alinear la indentación de `await cargarPeriodos();`.

## 4. Docs y versiones
- `documentacion_frontend.md`: agregar a la nota de la versión que la vista del profesor ordena a los estudiantes por apellido (`studentLastName`) y subir la versión (p. ej. 2.5.1).
- Subir el `?v=` de `profesor.js` y `ayuda.js` donde se incluyan.

## Checklist
- [ ] En la vista del profesor, dentro de cada grado/sección, los estudiantes salen ordenados por apellido (probar con dos estudiantes de apellido igual y distinto nombre).
- [ ] La búsqueda por nombre o apellido sigue encontrando.
- [ ] La ayuda muestra los textos nuevos.
- [ ] `Ctrl+F5` tras subir los `?v=`.
