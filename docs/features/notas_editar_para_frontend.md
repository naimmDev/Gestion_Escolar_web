# Editar notas (profesor) — traspaso al frontend

**Feature:** el profesor puede editar una nota ya registrada (hoy solo puede agregar y eliminar).
**Backend:** ya está listo y probado: `PUT /api/notas/` (con auditoría) y bloqueo por trimestre cerrado. No requiere cambios en backend para empezar.
**Archivos que se tocan:** `frontend/js/profesor.js`, `frontend/css/profesor.css`, `frontend/profesor.php` (solo `?v=`), `frontend/js/ayuda.js`, `docs/documentacion_frontend.md`.

---

## 1. Contrato de la API

### `PUT /api/notas/` — rol: profesor

```json
{
  "id": 42,
  "puntaje": 4.5,
  "tipo_actividad": "Quiz",
  "nombre": "Quiz #1",
  "comentario": "Mejoró en el segundo intento"
}
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `id` | Sí | Id de la nota. Debe ser del profesor en sesión |
| `puntaje` | Sí | Número entre 1.0 y 5.0 (1 decimal) |
| `tipo_actividad` | No | Uno de: `Quiz, Parcial, Taller, Tarea, Proyecto, Investigacion, Exposicion, Laboratorio, Participacion, Otro`. **`""` o `null` la borra**. Si el campo no se envía, se conserva |
| `nombre` | No | Máx. 100 caracteres. `""` o `null` lo borra; si no se envía, se conserva |
| `comentario` | No | Máx. 255 caracteres. `""` o `null` lo borra; si no se envía, se conserva |
| `tipo`, `trimestre` | No | **La interfaz NO los envía** (ver sección 3) |

Respuesta 200: `{ "success": true, "data": { "message": "Nota actualizada" } }`. No devuelve la nota: hay que recargar (`reloadGradesAndRefresh()`).

### Errores

| Código | Cuándo | Qué hacer |
|---|---|---|
| 400 | Puntaje fuera de rango, tipo de actividad inválido, body inválido | Mostrar `error.error` |
| 403 | La nota no es del profesor / no existe | `apiFetch` ya lo lanza como `Error`; mostrar el mensaje |
| 409 | `details.codigo === 'TRIMESTRE_CERRADO'` | Usar `manejarTrimestreCerrado(error)` (ya existe en `profesor.js`) |
| 500 | Error interno (ej. texto demasiado largo si se salta el `maxlength`) | Mostrar mensaje genérico |

### Reglas de negocio que ya aplica el backend

- Solo el profesor dueño de la nota puede editarla.
- El trimestre de la nota debe estar **abierto** (igual que para crear/eliminar).
- La auditoría (`nota_auditoria`) se registra **solo si cambia el puntaje**; cambiar nombre, comentario o tipo de actividad no genera registro.
- No existe (todavía) una pantalla para consultar la auditoría; no hay que construirla.

---

## 2. Tareas de frontend

### A. Botón "Editar" en el historial de notas

En `renderGradeHistoryItem(grade)`, dentro de `.grade-actions`, agregar un botón **Editar** antes del de Eliminar:

```html
<button class="edit-grade-btn" onclick="editGrade(${grade.id})">
    <i class="fas fa-pen"></i> Editar
</button>
```

- Mostrarlo **solo si `trimestreAbierto(grade.trimestre)`** (mismo criterio que ya se usa para el botón Eliminar; el bloque `.grade-actions` ya está condicionado, así que basta con agregarlo ahí dentro).
- Estilo `.edit-grade-btn` en `profesor.css`: mismo tamaño/tipografía que `.delete-grade-btn`, pero con la paleta dorada/neutra (no carmesí) para distinguirlo de la acción destructiva. Revisar que ambos botones queden alineados y no se rompan en pantallas angostas.

### B. Diálogo de edición (nueva función `editGrade(gradeId)`)

Usar **SweetAlert2 con `html:`** (no crear un `.modal` nuevo: evita los problemas de `z-index`/`overflow` ya conocidos con `openModal`/`closeModal`).

1. Buscar la nota: `const grade = myGrades.find(g => g.id === gradeId)`; si no existe, salir.
2. Si `!trimestreAbierto(grade.trimestre)`, mostrar el aviso de trimestre cerrado y salir (por si el estado cambió).
3. Campos, precargados con los valores actuales (escapar con `escapeHtml` al insertarlos en el HTML):
   - **Nota** `<input type="number" step="0.1" min="1" max="5">`.
   - **Tipo de actividad** `<select>` con la opción vacía "-- Seleccionar --" + las 10 opciones. Hoy esas opciones están escritas a mano dentro de `renderTrimestreContent()`: **extraerlas a una constante** (`TIPOS_ACTIVIDAD`) y usarla en el alta y en la edición para no duplicarlas.
   - **Nombre de la actividad** `<input type="text" maxlength="100">`.
   - **Comentario** `<input type="text" maxlength="255">`.
   - Mostrar de forma **solo lectura** (texto, no input) el tipo de evaluación y el trimestre, para que el profesor sepa qué edita.
4. `preConfirm`: validar que la nota sea numérica y esté entre 1.0 y 5.0 (`Swal.showValidationMessage(...)` si no) y redondear con `Math.round(x * 10) / 10`.
5. Si no cambió ningún campo respecto a la nota original, **no llamar al backend**: cerrar con un aviso "Sin cambios".
6. Enviar `PUT /notas/` con `{ id, puntaje, tipo_actividad, nombre, comentario }`. Para borrar un campo opcional, enviar `""` (el backend lo guarda como vacío). **No enviar `tipo` ni `trimestre`.**
7. Respuesta:
   - `res.ok` → toast "Nota actualizada" y `await reloadGradesAndRefresh()` (ya conserva los grados/secciones abiertos).
   - Error → `const error = await res.json().catch(() => ({}))`; `if (await manejarTrimestreCerrado(error)) return;` y si no, `Swal.fire('Error', error.error || 'No se pudo actualizar la nota', 'error')`.
   - Envolver en `try/catch` y mostrar `error.message` (los 403 los lanza `apiFetch`).

### C. Límites en el formulario de alta

Agregar `maxlength="100"` a `#newGradeNombre` y `maxlength="255"` a `#newGradeComment` en `renderTrimestreContent()`. Sin esto, un texto largo hace fallar el guardado con un error genérico.

### D. Textos y documentación

- `ayuda.js` (`AYUDA_PROFESOR`):
  - Nueva pregunta: **"¿Cómo edito una nota?"** → en el historial del trimestre, presionar **Editar**, cambiar nota, tipo de actividad, nombre o comentario y guardar. Los cambios de nota quedan en el registro de auditoría. No se puede cambiar el tipo de evaluación ni el trimestre: para eso, eliminar la nota y registrarla de nuevo.
  - Ajustar **"¿Por qué no puedo registrar o eliminar notas?"** para incluir "editar".
- `docs/documentacion_frontend.md`: documentar `editGrade()`, la constante `TIPOS_ACTIVIDAD` y quitar "Profesor: editar notas" de la sección 13 (pendientes). Subir la versión del documento.
- Subir el `?v=` de `profesor.js` y `profesor.css` en `profesor.php`.

---

## 3. Decisiones de alcance (para no complicar de más)

- **No se edita el tipo de evaluación ni el trimestre desde la interfaz.** El backend lo permite, pero cambiar el tipo altera la numeración automática ("Parcial 1, 2…") y la regla de un solo examen trimestral, y mover entre trimestres exige validar dos períodos. Si se necesita, se elimina y se vuelve a registrar.
- **No se muestra historial de cambios.** La auditoría se guarda, pero no hay vista (fuera de este alcance).
- **Estudiante y admin: sin cambios.** El estudiante verá el puntaje actualizado en su próxima carga.

---

## 4. Qué NO hacer

- No mostrar "Editar" en trimestres cerrados (aunque el backend lo rechace igual).
- No enviar `tipo`/`trimestre` en el PUT.
- No enviar `tipo_actividad: null` esperando "no cambiar": para conservarlo, enviar el valor actual (o no enviar el campo). `""`/`null` significan **borrar**.
- No crear un `.modal` nuevo para la edición; usar SweetAlert2.
- No olvidar `escapeHtml` al precargar nombre y comentario en el HTML del diálogo.

---

## 5. Checklist de pruebas

- [ ] En un trimestre abierto, el botón **Editar** aparece junto a Eliminar; en uno cerrado no aparece ninguno de los dos.
- [ ] Editar solo el puntaje (ej. 3.0 → 4.5): se actualiza el historial, la nota trimestral y el promedio.
- [ ] Editar solo el comentario: se actualiza y **no** se crea registro de auditoría (verificar en la tabla `nota_auditoria`).
- [ ] Editar el puntaje: sí se crea un registro de auditoría con el valor anterior y el nuevo.
- [ ] Borrar el nombre/comentario/tipo de actividad (dejar vacío) y guardar: quedan vacíos.
- [ ] Puntaje `0.5`, `5.5` o vacío: el diálogo lo rechaza antes de enviar.
- [ ] Guardar sin cambios: aviso "Sin cambios" y no se hace la petición.
- [ ] Nombre de más de 100 o comentario de más de 255 caracteres: el `maxlength` lo impide.
- [ ] El admin cierra el trimestre con el diálogo abierto → al guardar sale "Este trimestre ya fue cerrado" y la interfaz se actualiza.
- [ ] Un texto con comillas o `<` en nombre/comentario se precarga bien en el diálogo (sin romper el HTML).
- [ ] Después de editar, los grados y secciones abiertos siguen abiertos.
- [ ] Recarga fuerte (`Ctrl+F5`) tras subir los archivos con el nuevo `?v=`.
