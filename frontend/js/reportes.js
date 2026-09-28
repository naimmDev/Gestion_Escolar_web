// ==================== reportes.js ====================
// Exportación de reportes PDF/Excel. El archivo lo genera el backend
// (GET /notas/exportar.php); aquí solo se piden las opciones y se descarga.

function elegirFormatoExportacion() {
    return Swal.fire({
        title: 'Exportar',
        text: '¿En qué formato deseas descargar el documento?',
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-file-pdf"></i> PDF',
        denyButtonText: '<i class="fas fa-file-excel"></i> Excel',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8B0000',
        denyButtonColor: '#2a5c2a'
    }).then(result => {
        if (result.isConfirmed) return 'pdf';
        if (result.isDenied) return 'excel';
        return null;
    });
}

// Devuelve 'I Trimestre' | 'II Trimestre' | 'III Trimestre' | 'TODOS' | null (cancelado)
function elegirTrimestreExportacion() {
    return Swal.fire({
        title: 'Seleccionar trimestre',
        text: '¿Qué trimestre deseas exportar?',
        icon: 'question',
        input: 'select',
        inputOptions: {
            'I Trimestre': 'I Trimestre',
            'II Trimestre': 'II Trimestre',
            'III Trimestre': 'III Trimestre',
            'TODOS': 'Todos los trimestres'
        },
        inputPlaceholder: 'Selecciona un trimestre',
        inputValidator: (value) => (!value ? 'Debes seleccionar una opción' : undefined),
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8B0000'
    }).then(result => result.isConfirmed ? result.value : null);
}

/**
 * Pide el reporte al backend y lo descarga.
 * Parámetros: { format, materia_id, estudiante_id, trimestre, grado }
 * trimestre 'TODOS' (o vacío) = sin filtro de trimestre.
 */
async function exportarReporte({ format, materia_id, estudiante_id, trimestre, grado }) {
    const params = new URLSearchParams({ format });
    if (materia_id)    params.append('materia_id', materia_id);
    if (estudiante_id) params.append('estudiante_id', estudiante_id);
    if (trimestre && trimestre !== 'TODOS') params.append('trimestre', trimestre);
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
        Swal.fire('Error', err.message || 'No se pudo conectar con el servidor', 'error');
    }
}