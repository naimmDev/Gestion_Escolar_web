# Exportación de Reportes — Contrato para Frontend (v2)

Reemplaza a la v1. El endpoint ahora cubre **todos** los reportes que hoy se generan en el navegador con jsPDF/SheetJS, así que esas funciones pueden sustituirse por una llamada al backend.

```
GET /api/notas/exportar.php
```

Se llama con `apiFetch()` (ya manda el `Authorization: Bearer`).

## Parámetros

| Param | Obligatorio | Valores |
|---|---|---|
| `format` | Sí | `pdf` o `excel` |
| `materia_id` | Profesor: sí. Estudiante: no | id de la materia |
| `estudiante_id` | No (solo profesor) | Si se envía → reporte individual de ese alumno |
| `trimestre` | No | `I Trimestre`, `II Trimestre`, `III Trimestre`. Cualquier otro valor → 400 |
| `grado` | No (solo profesor, grupal) | Ej. `10°`. `Sin grado` para estudiantes sin grado |

## Qué devuelve cada combinación

| Rol | Parámetros | Reporte |
|---|---|---|
| Estudiante | `format` | Boletín completo: todas sus materias, columnas I, II, III y Nota Final |
| Estudiante | `format` + `trimestre` | Todas sus materias, detalle de ese trimestre |
| Estudiante | `format` + `materia_id` | Una materia, un renglón por trimestre + Nota Final del Curso |
| Profesor | `format` + `materia_id` + `estudiante_id` | Individual de un alumno en su materia |
| Profesor | `format` + `materia_id` | Grupal de la materia (todos los grados) |
| Profesor | `format` + `materia_id` + `grado` | Grupal de un grado |
| Profesor | cualquiera de los grupales + `trimestre` | Grupal con detalle de ese trimestre |

El estudiante nunca puede pedir datos de otro: el backend ignora su `estudiante_id`.

## Equivalencias con las funciones actuales

| Función actual (frontend) | Llamada nueva |
|---|---|
| `estudiante.js` → `exportarBoletin(trimestre)` | `exportarReporte({ format, trimestre })` |
| `estudiante.js` → `exportarBoletinCompleto()` | `exportarReporte({ format })` |
| `profesor.js` → `exportarReporteGrupal(grado)` | `exportarReporte({ format, materia_id, grado, trimestre })` |
| `profesor.js` → `exportarReporteIndividual()` | `exportarReporte({ format, materia_id, estudiante_id })` |

`elegirFormatoExportacion()` y `elegirTrimestreExportacion()` se siguen usando para obtener `format` y `trimestre`.

## Respuesta

- **Éxito:** archivo binario (no JSON). `Content-Disposition: attachment; filename="..."` con el nombre sugerido por el backend.
- **Error:** JSON `{success:false, error, code}`.

| Código | Causa |
|---|---|
| 400 | `format` o `trimestre` inválidos, parámetro no numérico, falta `materia_id` (profesor) |
| 403 | Sin permiso sobre la materia, o estudiante no matriculado |
| 404 | Estudiante+materia sin matrícula, o no hay datos para exportar (ej. estudiante sin materias, grado sin alumnos) |

## Función de descarga

No se puede usar `<a href>` directo porque hace falta el header `Authorization`.

```js
async function exportarReporte({ format, materia_id, estudiante_id, trimestre, grado }) {
    const params = new URLSearchParams({ format });
    if (materia_id)    params.append('materia_id', materia_id);
    if (estudiante_id) params.append('estudiante_id', estudiante_id);
    if (trimestre)     params.append('trimestre', trimestre);
    if (grado)         params.append('grado', grado);

    try {
        const res = await apiFetch(`/notas/exportar.php?${params}`);

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            Swal.fire('Error', error.error || 'No se pudo exportar', 'error');
            return;
        }

        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/);
        const nombre = match ? match[1] : `reporte.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
}
```

Nota: `apiFetch` lanza un `Error` en 403, por eso el `try/catch` también captura ese caso; conviene mostrar `err.message` si viene de ahí.

## Diferencias visibles respecto a los reportes actuales

- La columna "Nota Final" de los reportes por trimestre pasa a llamarse **Nota Trimestral**; "Nota Final" queda solo para el promedio anual del curso.
- "Total Parciales" / "Total Apreciación" pasan a **Prom. Parciales** / **Prom. Apreciación**, porque son promedios.
- La **Identificación** ahora sale real (antes `N/D`).
- Los promedios los calcula el backend; en casos límite puede haber diferencia de ±0.1 respecto a lo que calculaba el navegador.

## Pendiente (decisión consciente)

CSV y exportación desde admin siguen fuera; quedan como "posibles mejoras, no confirmadas".
