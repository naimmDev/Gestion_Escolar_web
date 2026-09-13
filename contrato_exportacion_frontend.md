# Exportación de Reportes — Contrato para Frontend

Endpoint ya probado y funcionando en backend (PDF y Excel, individual y grupal).

---

## Endpoint

```
GET /api/notas/exportar.php
```

Se usa igual que cualquier otra llamada: con `apiFetch()`, que ya agrega el header `Authorization: Bearer` automáticamente.

---

## Query params

| Param | Obligatorio | Valores |
|---|---|---|
| `format` | Sí | `pdf` o `excel` |
| `materia_id` | Sí | id de la materia |
| `estudiante_id` | No | Si se envía → reporte de ese estudiante. Si se omite (solo en vista de profesor) → reporte grupal de toda la materia |
| `trimestre` | No | `I Trimestre`, `II Trimestre`, `III Trimestre` — si se omite, trae los 3 + promedio final |

---

## Comportamiento esperado por vista

- **Vista estudiante:** siempre manda su propio `estudiante_id` (o puede omitirlo, el backend lo autocompleta con el suyo igual) — nunca puede pedir el grupal.
- **Vista profesor con un estudiante seleccionado** (el modal que ya existe en `profesor.js`): manda `estudiante_id` del alumno.
- **Vista profesor sin estudiante seleccionado** (lista general de la materia): omite `estudiante_id` → trae el grupal automáticamente.

---

## Respuesta

- **Éxito:** no es JSON, es el archivo binario directo.
  - `Content-Type`: `application/pdf` o `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="..."` con nombre sugerido por el backend
- **Error:** JSON normal `{success:false, error, code}` — mismo patrón que el resto de la API, se maneja con `Swal.fire` igual que siempre.

**Códigos de error posibles:**
| Código | Causa |
|---|---|
| 400 | `format` inválido o falta `materia_id` |
| 403 | Sin permiso sobre la materia, o estudiante no matriculado |
| 404 | Materia inexistente, o combinación estudiante+materia sin matrícula |

---

## Importante: cómo descargar el archivo

Como la petición requiere el header `Authorization`, **no se puede usar un `<a href="...">` directo** — el navegador no manda el Bearer token en un clic simple de enlace.

El flujo correcto es pedir el archivo con `fetch`, convertirlo a blob, y disparar la descarga manualmente:

```js
async function exportarReporte(materiaId, estudianteId, format) {
    const params = new URLSearchParams({ format, materia_id: materiaId });
    if (estudianteId) params.append('estudiante_id', estudianteId);

    try {
        const res = await apiFetch(`/notas/exportar.php?${params}`);

        if (!res.ok) {
            const error = await res.json();
            Swal.fire('Error', error.error || 'No se pudo exportar', 'error');
            return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

    } catch (err) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
}
```

---

## Ejemplos de uso

**Estudiante exportando su propio reporte en PDF:**
```js
exportarReporte(materiaId, currentStudent.id_referencia, 'pdf');
```

**Profesor exportando reporte individual de un alumno en Excel:**
```js
exportarReporte(currentSubjectId, currentStudentForModal.id, 'excel');
```

**Profesor exportando reporte grupal de toda la materia en PDF:**
```js
exportarReporte(currentSubjectId, null, 'pdf');
```

---

## Pendiente / no implementado por ahora (decisión consciente, no olvido)

- Formato CSV — no incluido, solo PDF y Excel.
- Exportación desde el panel de admin — no habilitada en esta versión.
- Paginación/límite de estudiantes en reporte grupal — no aplica al volumen actual del sistema.

Si surge alguna duda sobre el comportamiento del backend, cualquier caso no cubierto aquí, avisar antes de asumir.
