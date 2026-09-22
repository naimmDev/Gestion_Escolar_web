// ==================== reportes.js ====================
// Funciones compartidas para exportación de reportes en PDF y Excel.
// Formato institucional: título + caja de datos + subtítulo de trimestre + tabla.

function fmtNota(valor) {
    return (valor !== null && valor !== undefined) ? valor.toFixed(1) : 'S/N';
}

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

function elegirTrimestreExportacion() {
    return Swal.fire({
        title: 'Seleccionar trimestre',
        text: '¿Qué trimestre deseas exportar?',
        icon: 'question',
        input: 'select',
        inputOptions: {
            'I Trimestre': 'I Trimestre',
            'II Trimestre': 'II Trimestre',
            'III Trimestre': 'III Trimestre'
        },
        inputPlaceholder: 'Selecciona un trimestre',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8B0000'
    }).then(result => result.isConfirmed ? result.value : null);
}

/**
 * Dibuja el encabezado institucional estilo boletín oficial:
 * nombre del sistema, título del documento, caja con datos en filas
 * (cada fila puede tener 1 o 2 campos lado a lado) y un subtítulo
 * centrado (ej. "TRIMESTRE I" o "TRIMESTRES") antes de la tabla.
 *
 * filasInfo: array de filas; cada fila es un array de 1 o 2 objetos {label, value}
 * subtitulo: texto centrado que va justo antes de la tabla
 *
 * Devuelve el eje Y donde debe iniciar la tabla (doc.autoTable startY).
 */
function dibujarEncabezadoPDF(doc, tituloDocumento, filasInfo, subtitulo) {
    doc.setTextColor(20, 20, 20);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(13);
    doc.text('SISTEMA DE GESTIÓN ESCOLAR', 105, 16, { align: 'center' });

    doc.setFontSize(11);
    doc.text(tituloDocumento, 105, 23, { align: 'center' });

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    const boxX = 14;
    const boxWidth = 182;
    const rowHeight = 8.5;
    const boxY = 32;
    const boxHeight = filasInfo.length * rowHeight;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(boxX, boxY, boxWidth, boxHeight);

    filasInfo.forEach((fila, i) => {
        const rowY = boxY + (i * rowHeight) + 5.5;
        if (i > 0) doc.line(boxX, boxY + i * rowHeight, boxX + boxWidth, boxY + i * rowHeight);

        if (fila.length === 1) {
            doc.setFont(undefined, 'bold');
            doc.text(`${fila[0].label}:`, boxX + 4, rowY);
            doc.setFont(undefined, 'normal');
            doc.text(`${fila[0].value}`, boxX + 4 + doc.getTextWidth(`${fila[0].label}: `) + 2, rowY);
        } else {
            doc.setFont(undefined, 'bold');
            doc.text(`${fila[0].label}:`, boxX + 4, rowY);
            doc.setFont(undefined, 'normal');
            doc.text(`${fila[0].value}`, boxX + 4 + doc.getTextWidth(`${fila[0].label}: `) + 2, rowY);

            doc.setFont(undefined, 'bold');
            doc.text(`${fila[1].label}:`, boxX + boxWidth / 2 + 4, rowY);
            doc.setFont(undefined, 'normal');
            doc.text(`${fila[1].value}`, boxX + boxWidth / 2 + 4 + doc.getTextWidth(`${fila[1].label}: `) + 2, rowY);
        }
        doc.line(boxX + boxWidth / 2, boxY + i * rowHeight, boxX + boxWidth / 2, boxY + (i + 1) * rowHeight);
    });

    let y = boxY + boxHeight + 10;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text(subtitulo, 105, y, { align: 'center' });

    return y + 6;
}

/**
 * Genera las filas de encabezado para Excel, con la misma estructura
 * de datos (título, campos institucionales, subtítulo de trimestre).
 */
function construirEncabezadoExcel(tituloDocumento, filasInfo, subtitulo) {
    const filas = [
        ['SISTEMA DE GESTIÓN ESCOLAR'],
        [tituloDocumento],
        []
    ];
    filasInfo.forEach(fila => {
        if (fila.length === 1) {
            filas.push([`${fila[0].label}: ${fila[0].value}`]);
        } else {
            filas.push([`${fila[0].label}: ${fila[0].value}`, '', `${fila[1].label}: ${fila[1].value}`]);
        }
    });
    filas.push([]);
    filas.push([subtitulo]);
    filas.push([]);
    return filas;
}

/**
 * Estilo de tabla institucional (bordes negros, encabezado en negrita
 * con fondo blanco, sin colores llamativos) para usar en doc.autoTable.
 */
function estiloTablaInstitucional() {
    return {
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.3 },
        bodyStyles: { textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
        styles: { fontSize: 9, halign: 'center', cellPadding: 4 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    };
}