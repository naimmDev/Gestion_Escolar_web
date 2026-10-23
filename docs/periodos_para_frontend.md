# Panel de períodos — traspaso al frontend

**Feature:** Propuesta de Mejoras 6.3 — abrir/cerrar trimestres.
**Backend:** versión 2.5.0 de `documentacion_backend.md`.
**Regla de negocio:** un trimestre **cerrado** no permite crear, editar ni eliminar notas. Solo el admin abre/cierra trimestres. Las lecturas (listados, resumen, exportación PDF/Excel, vista del estudiante) **no** cambian.

---

## 1. Qué hay que hacer ANTES de probar (orden de despliegue)

1. Quien maneja el backend ejecuta en phpMyAdmin `database/migraciones/2026-10-22_periodos.sql` (crea la tabla `periodo` y la deja con **III Trimestre abierto, I y II cerrados**).
2. Subir/actualizar `api/` (`periodos/index.php`, `helpers/periodos.php`, `notas/index.php`).
3. Después, el frontend.

> **Efecto inmediato esperado:** al migrar, las notas de prueba de I y II Trimestre quedan en **solo lectura**. Para probar sobre ellos, el admin los abre desde el nuevo panel (o `UPDATE periodo SET estado='abierto' WHERE trimestre='I Trimestre';`).

---

## 2. Contrato de la API

### `GET /api/periodos/` — roles: admin, profesor, estudiante

Respuesta 200 (siempre 3 elementos, ordenados I, II, III):

```json
{
  "success": true,
  "data": [
    { "id": 1, "trimestre": "I Trimestre",   "estado": "cerrado", "abierto": false,
      "fecha_inicio": "2026-03-02", "fecha_fin": "2026-05-29", "fecha_actualizacion": "2026-10-22 20:10:00" },
    { "id": 2, "trimestre": "II Trimestre",  "estado": "cerrado", "abierto": false,
      "fecha_inicio": null, "fecha_fin": null, "fecha_actualizacion": "2026-10-22 20:10:00" },
    { "id": 3, "trimestre": "III Trimestre", "estado": "abierto", "abierto": true,
      "fecha_inicio": null, "fecha_fin": null, "fecha_actualizacion": "2026-10-22 20:10:00" }
  ]
}
```

- Usar el booleano `abierto` para la lógica; `estado` es el texto.
- `fecha_inicio` / `fecha_fin` pueden ser `null`. Formato `AAAA-MM-DD` (compatible con `<input type="date">`).
- Las fechas son **solo informativas**: no abren ni cierran nada solas.

### `PUT /api/periodos/` — rol: admin

Body (`trimestre` obligatorio; el resto opcional, pero al menos uno):

```json
{ "trimestre": "I Trimestre", "estado": "abierto", "fecha_inicio": "2026-03-02", "fecha_fin": "2026-05-29" }
```

- `estado`: `"abierto"` | `"cerrado"`.
- Para **borrar** una fecha, enviar `null` o `""`.
- Responde 200 con la **lista completa actualizada** (mismo formato del GET), así que basta reemplazar el arreglo local.
- Errores (formato habitual `{ success:false, error, code }`):

| Código | Cuándo |
|---|---|
| 400 | trimestre/estado inválido, fecha inválida, inicio posterior a fin, o body sin campos a actualizar |
| 403 | el usuario no es admin (`apiFetch` ya lo convierte en `Error`) |

No existe POST ni DELETE: los 3 trimestres siempre existen.

### Cambio en `/api/notas/` (POST, PUT, DELETE)

Si el trimestre está cerrado, responde **409**:

```json
{
  "success": false,
  "error": "Este trimestre ya fue cerrado",
  "code": 409,
  "details": { "codigo": "TRIMESTRE_CERRADO", "trimestre": "I Trimestre" }
}
```

- En **PUT**, aplica al trimestre actual de la nota y, si se mueve a otro trimestre, también al destino.
- El mensaje viene en `error.error`; para distinguirlo de otros 409 (examen duplicado, etc.) usar `details.codigo === 'TRIMESTRE_CERRADO'`.

---

## 3. Qué pasa si el frontend no se toca (no se rompe nada)

- `profesor.js → addNewGrade()` ya muestra `error.error` en un Swal "Aviso" cuando llega un 409. Verá "Este trimestre ya fue cerrado".
- `profesor.js → deleteGrade()` ya muestra `error.error` en un Swal "Error".
- No hay edición de notas en la interfaz hoy (el `PUT /notas/` no se usa), así que no hay impacto.
- Estudiante y exportaciones: sin cambios.

Es decir, el bloqueo ya funciona; lo que sigue es **mejorar la experiencia** y darle al admin su panel.

---

## 4. Tareas de frontend

### A. Admin — nueva vista "Períodos"

- Nuevo botón en el menú lateral de `admin.php`: `<button class="nav-btn" data-view="periods">` (ícono sugerido `fa-calendar-check`) y su `<div class="view" id="periodsView">`. Recordar la regla del proyecto: **no anidar** una vista dentro de otra (queda oculta).
- Al entrar a la vista: `GET /periodos/` (con `apiGet('/periodos/')`).
- Una tarjeta por trimestre con:
  - Badge **Abierto** (verde) / **Cerrado** (rojo/gris) según `abierto`.
  - Botón "Abrir" / "Cerrar" → `PUT /periodos/` con `{ trimestre, estado }`. Pedir confirmación con Swal al **cerrar** ("Los profesores no podrán registrar, editar ni eliminar notas de este trimestre").
  - Inputs `type="date"` de inicio y fin + botón "Guardar fechas" → `PUT` con `fecha_inicio` y `fecha_fin`. Mostrar el mensaje de error del backend si inicio > fin.
- Tras cada PUT exitoso: reemplazar el arreglo local por `json.data`, repintar, `showToast(...)` y `addActivity(...)`.
- Texto de ayuda en la vista: "Las fechas son informativas; el cierre es manual."
- Agregar la vista al enrutador de vistas de `admin.js` (el mismo que usa `currentActiveView`).

### B. Profesor — mostrar el estado y evitar errores evitables

El backend es la autoridad; esto es para que el profesor no choque con el error.

1. En la carga inicial de `profesor.js` (donde hoy está el `Promise.all` de materias/matrículas/notas/comentarios) agregar `apiFetch('/periodos/')` y guardar un mapa, por ejemplo `periodos = { 'I Trimestre': false, 'II Trimestre': false, 'III Trimestre': true }` (valor = `abierto`).
2. En `renderTrimestreContent()`:
   - Si `currentTrimestre !== 'Todas'` y ese trimestre está cerrado:
     - **No renderizar** el bloque `.add-grade-section` y mostrar en su lugar un aviso tipo banner: "Este trimestre está cerrado: solo lectura".
     - **No renderizar** el botón "Eliminar" de `renderGradeHistoryItem(grade)` cuando `periodos[grade.trimestre] === false` (importante porque la vista "Todas" mezcla trimestres: decidir **por nota**, no por la pestaña).
   - En la pestaña "Todas" el alta ya está bloqueada por `addNewGrade()`; no requiere cambio.
3. Refrescar `GET /periodos/` cuando se abra el modal de un estudiante (el admin pudo cambiar el estado mientras el profesor tenía la página abierta).
4. En `addNewGrade()` y `deleteGrade()`: si la respuesta es 409 con `details.codigo === 'TRIMESTRE_CERRADO'`, mostrar el mensaje, **refrescar `periodos`** y repintar (`renderTrimestreContent()`), para que la UI quede coherente.
5. Si `GET /periodos/` falla, **no bloquear** la interfaz (tratar como abierto): el backend rechazará lo que corresponda.

### C. Estudiante — opcional

Sin cambios obligatorios. Opcional: etiqueta "Trimestre cerrado" junto al encabezado de cada trimestre en `renderGradesReport()`.

### D. Textos y documentación

- `ayuda.js`: agregar una pregunta en `AYUDA_ADMIN` ("¿Cómo abro o cierro un trimestre?") y una en `AYUDA_PROFESOR` ("¿Por qué no puedo registrar o eliminar notas?" → trimestre cerrado, contactar al administrador).
- `documentacion_frontend.md`: documentar la vista Períodos y el comportamiento del profesor; quitar "Panel de períodos" de la sección 13 (pendientes).
- Subir el `?v=` de los `.js`/`.css` modificados (hoy está en `?v=3`).

---

## 5. Cosas que NO hay que hacer (para no romper nada)

- **No** confiar solo en la UI: aunque se oculten los botones, el backend ya valida.
- **No** asumir que el trimestre abierto es siempre el III: puede haber varios abiertos a la vez (el admin decide, por ejemplo para corregir un trimestre anterior).
- **No** usar las fechas para decidir si algo está abierto; usar `abierto`.
- **No** llamar a `POST`/`DELETE` sobre `/periodos/` (devuelven 405).
- **No** cambiar `/notas/` GET, el resumen ni la exportación por el estado del período.

---

## 6. Checklist de pruebas

- [ ] Con la migración aplicada: profesor en **III Trimestre** puede agregar y eliminar notas.
- [ ] Profesor en **I o II Trimestre**: no aparece el formulario de alta ni los botones Eliminar; se ve el aviso de solo lectura.
- [ ] Vista "Todas": las notas de I y II no tienen botón Eliminar; las de III sí.
- [ ] Admin abre I Trimestre → el profesor (tras reabrir el modal) puede registrar notas en I.
- [ ] Admin cierra el trimestre mientras el profesor tiene el modal abierto → al guardar, sale "Este trimestre ya fue cerrado" y la UI se actualiza.
- [ ] Admin guarda fechas válidas; con inicio > fin muestra el error del backend.
- [ ] Un profesor/estudiante que intente `PUT /periodos/` recibe 403.
- [ ] Estudiante sigue viendo sus notas de todos los trimestres; exportar PDF/Excel funciona igual en trimestres cerrados.
- [ ] Recarga fuerte (`Ctrl+F5`) tras subir los archivos con el nuevo `?v=`.
