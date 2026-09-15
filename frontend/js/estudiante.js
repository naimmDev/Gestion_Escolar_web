// ==================== VARIABLES GLOBALES ====================
let currentStudent = null;
let myEnrollments  = [];
let myGrades       = [];
let mySubjects     = [];

const TRIMESTRES = ['I Trimestre', 'II Trimestre', 'III Trimestre'];

// Función global para cerrar modal
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};
window.openChangePasswordModal = function() {
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

// ==================== CARGA DE DATOS ====================
async function loadData() {
    currentStudent = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentStudent || currentStudent.rol !== 'estudiante') {
        window.location.href = 'index.html';
        return;
    }
    
    if (!currentStudent.password_cambiada && !currentStudent.password_skipped) {
        window.location.href = 'cambiar_password.html';
        return;
    }

    document.getElementById('studentName').textContent = currentStudent.nombre || 'Estudiante';
    document.getElementById('welcomeName').textContent = currentStudent.nombre || 'Estudiante';

    try {
        const [enrollmentsRes, gradesRes, subjectsRes] = await Promise.all([
            apiFetch('/matriculas/'),
            apiFetch('/notas/'),
            apiFetch('/materias/')
        ]);

        if (!enrollmentsRes.ok) throw new Error('Error cargando matrículas');
        if (!gradesRes.ok) throw new Error('Error cargando notas');
        if (!subjectsRes.ok) throw new Error('Error cargando materias');

        const enrollmentsJson = await enrollmentsRes.json();
        const gradesJson = await gradesRes.json();
        const subjectsJson = await subjectsRes.json();

        myEnrollments = enrollmentsJson.data ?? enrollmentsJson;
        myGrades = gradesJson.data?.map ? gradesJson.data.map(normalizeGrade) : gradesJson.map(normalizeGrade);
        mySubjects = subjectsJson.data ?? subjectsJson;

        const enrolledSubjectIds = myEnrollments.map(e => parseInt(e.subjectId));
        mySubjects = mySubjects.filter(s => enrolledSubjectIds.includes(parseInt(s.id)));

        updateDashboard();
        renderGradesReport();
        loadCommentSubjects();
        await renderMyComments();

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudieron cargar los datos: ' + error.message, 'error');
    }
}

// ==================== NORMALIZACIÓN ====================
function normalizeGrade(g) {
    return {
        id: g.id,
        subjectId: parseInt(g.materia_id),
        type: g.tipo,
        tipoActividad: g.tipo_actividad || '',
        nombre: g.nombre || '',
        score: parseFloat(g.puntaje),
        trimestre: g.trimestre,
        comment: g.comentario || '',
        date: g.fecha_registro ? g.fecha_registro.split(' ')[0] : ''
    };
}

// ==================== FILTRADO ====================
function getGradesForSubjectTrimestre(subjectId, trimestre) {
    return myGrades.filter(g => g.subjectId === subjectId && g.trimestre === trimestre);
}

// ==================== FUNCIONES DE CÁLCULO ====================
function calcularNotaTrimestral(subjectId, trimestre) {
    const grades = myGrades.filter(g => g.subjectId === subjectId && g.trimestre === trimestre);
    
    const parciales = grades.filter(g => g.type === 'PARCIAL');
    const apreciaciones = grades.filter(g => g.type === 'APRECIACION');
    const examenes = grades.filter(g => g.type === 'EXAMEN_TRIMESTRAL');

    if (parciales.length === 0 || apreciaciones.length === 0 || examenes.length === 0) {
        return null;
    }

    const promParciales = parciales.reduce((s, g) => s + g.score, 0) / parciales.length;
    const promApreciacion = apreciaciones.reduce((s, g) => s + g.score, 0) / apreciaciones.length;
    const examen = examenes[0].score;

    return (promParciales + promApreciacion + examen) / 3;
}

function calcularPromedioFinal(subjectId) {
    const notas = TRIMESTRES.map(t => calcularNotaTrimestral(subjectId, t));
    if (notas.some(n => n === null)) return null;
    return notas.reduce((s, n) => s + n, 0) / notas.length;
}

function generarResumenTrimestre(subjectId, trimestre) {
    const grades = myGrades.filter(g => g.subjectId === subjectId && g.trimestre === trimestre);
    const parciales = grades.filter(g => g.type === 'PARCIAL');
    const apreciaciones = grades.filter(g => g.type === 'APRECIACION');
    const examenes = grades.filter(g => g.type === 'EXAMEN_TRIMESTRAL');

    const promParciales = parciales.length ? parciales.reduce((s, g) => s + g.score, 0) / parciales.length : null;
    const promApreciacion = apreciaciones.length ? apreciaciones.reduce((s, g) => s + g.score, 0) / apreciaciones.length : null;
    const examen = examenes.length ? examenes[0].score : null;

    let notaTrimestral = null;
    if (promParciales !== null && promApreciacion !== null && examen !== null) {
        notaTrimestral = (promParciales + promApreciacion + examen) / 3;
    }

    return { promParciales, promApreciacion, examen, notaTrimestral };
}

// ==================== PROMEDIO SIMPLE PARA DASHBOARD ====================
function calcularPromedioSimple(subjectId) {
    const grades = myGrades.filter(g => g.subjectId === subjectId);
    if (grades.length === 0) return null;
    const sum = grades.reduce((s, g) => s + g.score, 0);
    return sum / grades.length;
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    document.getElementById('mySubjectsCount').textContent = mySubjects.length;
    
    let total = 0, count = 0;
    for (const subject of mySubjects) {
        const avg = calcularPromedioSimple(subject.id);
        if (avg !== null) {
            total += avg;
            count++;
        }
    }
    document.getElementById('myAverage').textContent = count > 0 ? (total / count).toFixed(1) : 0;
    
    let approved = 0;
    for (const subject of mySubjects) {
        const avg = calcularPromedioSimple(subject.id);
        if (avg !== null && avg >= 3) approved++;
    }
    document.getElementById('approvedCount').textContent = approved;
}

// ==================== REPORTE DE NOTAS ====================
function renderGradesReport() {
    const container = document.getElementById('gradesReport');
    
    let total = 0, count = 0;
    for (const subject of mySubjects) {
        const avg = calcularPromedioSimple(subject.id);
        if (avg !== null) {
            total += avg;
            count++;
        }
    }
    const generalAvg = count > 0 ? (total / count).toFixed(1) : 0;

    if (mySubjects.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <i class="fas fa-info-circle" style="font-size:50px; color:var(--gold);"></i>
                <p style="margin-top:15px; font-family:'Cinzel',serif; color:var(--crimson-deep);">Aún no estás matriculado en ninguna materia</p>
                <p style="font-size:13px; color:#8a7055;">Contacta al administrador para asignar tus materias</p>
            </div>
        `;
        return;
    }

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

    container.innerHTML = html;

    document.querySelectorAll('.trimestre-header').forEach(header => {
        header.addEventListener('click', function () {
            this.classList.toggle('collapsed');
            this.nextElementSibling.classList.toggle('collapsed');
        });
    });
}

function renderTrimestreSection(trimestre) {
    let hasAnyGrade = false;
    let trimestreTotal = 0;
    let trimestreCount = 0;

    const subjectRows = mySubjects.map(subject => {
        const grades = getGradesForSubjectTrimestre(subject.id, trimestre);
        const notaTrim = calcularNotaTrimestral(subject.id, trimestre);
        if (grades.length > 0) {
            hasAnyGrade = true;
            if (notaTrim !== null) {
                trimestreTotal += notaTrim;
                trimestreCount++;
            }
        }
        return renderSubjectRow(subject, grades, notaTrim, trimestre);
    }).join('');

    const trimestreAvg = trimestreCount > 0 ? (trimestreTotal / trimestreCount).toFixed(1) : null;

    return `
        <div class="trimestre-container">
            <div class="trimestre-header">
                <div class="trimestre-title"><i class="fas fa-calendar-alt"></i> ${trimestre}</div>
                <div class="trimestre-header-actions">
                    <div class="trimestre-average">
                        ${trimestreAvg !== null
                            ? `<span class="value">Promedio: ${trimestreAvg}</span>`
                            : `<span class="empty"><i class="fas fa-chart-simple"></i> ${hasAnyGrade ? 'Notas registradas' : 'Sin notas registradas'}</span>`
                        }
                    </div>
                    <button class="btn-exportar-boletin"
                            onclick="event.stopPropagation(); exportarBoletin('${trimestre}')"
                            ${mySubjects.length === 0 ? 'disabled title="No hay materias matriculadas"' : ''}>
                        <i class="fas fa-file-pdf"></i> Exportar Notas
                    </button>
                </div>
            </div>
            <div class="trimestre-content">
                ${hasAnyGrade ? `
                    <table class="subjects-table">
                        <thead>
                            <tr>
                                <th><i class="fas fa-book"></i> Materia</th>
                                <th><i class="fas fa-list"></i> Notas</th>
                                <th><i class="fas fa-bullseye"></i> Nota Trimestral</th>
                                <th><i class="fas fa-circle-check"></i> Estado</th>
                            </tr>
                        </thead>
                        <tbody>${subjectRows}</tbody>
                    </table>
                ` : `
                    <div style="text-align:center; padding:30px; color:#8a7055;">
                        <i class="fas fa-inbox" style="font-size:40px; margin-bottom:10px; display:block;"></i>
                        No hay notas registradas en ${trimestre.toLowerCase()}
                    </div>
                `}
            </div>
        </div>
    `;
}
function renderSubjectRow(subject, grades, notaTrim, trimestre) {
    const notasBtn = grades.length > 0
        ? `<button class="btn-ver-notas" onclick="openGradesDetailModal(${subject.id}, '${escapeHtml(subject.name)}', '${trimestre}')">
               <i class="fas fa-eye"></i> Ver notas (${grades.length})
           </button>`
        : `<span class="no-grades"><i class="fas fa-minus-circle"></i> Sin notas</span>`;

    let statusHtml = '<span class="status-badge empty"><i class="fas fa-question-circle"></i> Sin definir</span>';
    if (notaTrim !== null) {
        statusHtml = notaTrim >= 3
            ? '<span class="status-badge approved"><i class="fas fa-check"></i> Aprobado</span>'
            : '<span class="status-badge failed"><i class="fas fa-clock"></i> En proceso</span>';
    } else if (grades.length > 0) {
        statusHtml = '<span class="status-badge waiting"><i class="fas fa-hourglass-half"></i> Incompleto</span>';
    }

    return `
        <tr>
            <td class="subject-name">${escapeHtml(subject.name)}</td>
            <td>${notasBtn}</td>
            <td class="subject-average">${notaTrim !== null ? `<span class="value">${notaTrim.toFixed(1)}</span>` : '<span class="empty">En curso</span>'}</td>
            <td>${statusHtml}</td>
        </tr>
    `;
}

// ==================== MODAL DETALLE DE NOTAS ====================
function openGradesDetailModal(subjectId, subjectName, trimestre) {
    const grades = getGradesForSubjectTrimestre(subjectId, trimestre);
    const resumen = generarResumenTrimestre(subjectId, trimestre);
    
    const parciales = grades.filter(g => g.type === 'PARCIAL');
    const apreciaciones = grades.filter(g => g.type === 'APRECIACION');
    const examenes = grades.filter(g => g.type === 'EXAMEN_TRIMESTRAL');

    const notaTrimestral = resumen.notaTrimestral;
    const isApproved = notaTrimestral !== null && notaTrimestral >= 3;

    let contentHtml = '';

    if (parciales.length) {
        contentHtml += renderGradeGroup('Parciales', parciales, resumen.promParciales, 'var(--crimson)');
    }
    if (apreciaciones.length) {
        contentHtml += renderGradeGroup('Apreciación', apreciaciones, resumen.promApreciacion, 'var(--gold)');
    }
    if (examenes.length) {
        const examen = examenes[0];
        contentHtml += `
            <div class="gd-group">
                <div class="gd-group-header" style="border-left-color:#8a7055;">
                    <span class="gd-group-title"><i class="fas fa-star"></i> Examen Trimestral</span>
                    <span class="gd-group-avg" style="color:#8a7055;">${examen.score.toFixed(1)}</span>
                </div>
                <div class="gd-items">
                    <div class="gd-item">
                        <div class="gd-item-left">
                            <span class="gd-item-name">${escapeHtml(examen.nombre || 'Examen Trimestral')}</span>
                            <span class="gd-item-date"><i class="fas fa-calendar-alt"></i> ${examen.date || ''}</span>
                        </div>
                        <div class="gd-item-score" style="color:#8a7055;">${examen.score.toFixed(1)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    if (!parciales.length && !apreciaciones.length && !examenes.length) {
        contentHtml = `
            <div style="text-align:center; padding:40px; color:#8a7055;">
                <i class="fas fa-inbox" style="font-size:40px; display:block; margin-bottom:10px;"></i>
                No hay notas registradas en este trimestre
            </div>
        `;
    } else {
        contentHtml += `
            <div style="margin-top: 20px; border-top: 2px solid var(--parchment); padding-top: 16px;">
                <table style="width:100%; border-collapse:collapse; max-width:420px; margin:0 auto;">
                    <tr><td style="padding:6px 0; color:var(--ink-soft);"><strong>Promedio Parciales:</strong></td><td style="text-align:right; font-family:'Cinzel',serif; color:var(--crimson);">${resumen.promParciales !== null ? resumen.promParciales.toFixed(1) : 'Sin datos'}</td></tr>
                    <tr><td style="padding:6px 0; color:var(--ink-soft);"><strong>Promedio Apreciación:</strong></td><td style="text-align:right; font-family:'Cinzel',serif; color:var(--crimson);">${resumen.promApreciacion !== null ? resumen.promApreciacion.toFixed(1) : 'Sin datos'}</td></tr>
                    <tr><td style="padding:6px 0; color:var(--ink-soft);"><strong>Examen Trimestral:</strong></td><td style="text-align:right; font-family:'Cinzel',serif; color:var(--crimson);">${resumen.examen !== null ? resumen.examen.toFixed(1) : 'Sin registrar'}</td></tr>
                    <tr style="border-top:2px solid var(--crimson);">
                        <td style="padding:10px 0; font-family:'Cinzel',serif; font-weight:bold; color:var(--crimson-deep);">Nota Trimestral</td>
                        <td style="text-align:right; font-family:'Cinzel',serif; font-size:18px; font-weight:bold; color:var(--crimson-deep);">${notaTrimestral !== null ? notaTrimestral.toFixed(1) : '<span style="color:#8a7055; font-size:14px;">En curso</span>'}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    const modalHtml = `
        <div class="gd-modal-overlay" id="gradesDetailOverlay" onclick="closeGradesDetailModal(event)">
            <div class="gd-modal">
                <button class="gd-close" onclick="closeGradesDetailModal(null)"><i class="fas fa-times"></i></button>
                <div class="gd-header">
                    <div class="gd-subject-name"><i class="fas fa-book"></i> ${escapeHtml(subjectName)}</div>
                    <div class="gd-trimestre"><i class="fas fa-calendar-alt"></i> ${trimestre}</div>
                    <div class="gd-avg-badge ${isApproved ? 'approved' : 'failed'}">
                        <span class="gd-avg-label">Nota Trimestral</span>
                        <span class="gd-avg-value">${notaTrimestral !== null ? notaTrimestral.toFixed(1) : 'En curso'}</span>
                        <span class="gd-avg-status">${isApproved ? '<i class="fas fa-check"></i> Aprobado' : notaTrimestral !== null ? '<i class="fas fa-clock"></i> En proceso' : ''}</span>
                    </div>
                </div>
                <div class="gd-body">
                    ${contentHtml}
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('gradesDetailOverlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = scrollbarWidth + 'px';
    requestAnimationFrame(() => {
        document.getElementById('gradesDetailOverlay').classList.add('visible');
    });
}

/// ==================== EXPORTAR BOLETÍN (PDF / Excel) ====================
function elegirFormatoExportacion() {
    return Swal.fire({
        title: 'Exportar boletín',
        text: '¿En qué formato deseas descargar el reporte?',
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

function construirFilasBoletinEstudiante(trimestre) {
    const fmt = (v) => (v !== null && v !== undefined) ? v.toFixed(1) : 'S/N';
    return mySubjects.map(subject => {
        const resumen = generarResumenTrimestre(subject.id, trimestre);
        return [
            subject.name,
            fmt(resumen.promParciales),
            fmt(resumen.promApreciacion),
            fmt(resumen.examen),
            fmt(resumen.notaTrimestral)
        ];
    });
}

async function exportarBoletin(trimestre) {
    if (!mySubjects.length) {
        Swal.fire('Sin materias', 'No tienes materias matriculadas para exportar', 'info');
        return;
    }

    const formato = await elegirFormatoExportacion();
    if (!formato) return;

    const filas = construirFilasBoletinEstudiante(trimestre);
    const nombreLimpio = (currentStudent.nombre || 'estudiante').replace(/\s+/g, '_');
    const trimestreLimpio = trimestre.replace(/\s+/g, '_');

    if (formato === 'pdf') {
        generarPdfBoletinEstudiante(trimestre, filas, nombreLimpio, trimestreLimpio);
    } else {
        generarExcelBoletinEstudiante(trimestre, filas, nombreLimpio, trimestreLimpio);
    }
}

function generarPdfBoletinEstudiante(trimestre, filas, nombreLimpio, trimestreLimpio) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(92, 0, 0);
    doc.text('Boletín de Notas', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Estudiante: ${currentStudent.nombre || ''}`, 14, 28);
    doc.text(`Trimestre: ${trimestre}`, 14, 34);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 40);

    doc.autoTable({
        startY: 46,
        head: [['Materia', 'Total Parciales', 'Total Apreciación', 'Examen Trimestral', 'Nota Final']],
        body: filas,
        headStyles: { fillColor: [139, 0, 0], textColor: [245, 230, 184], halign: 'center' },
        alternateRowStyles: { fillColor: [250, 246, 238] },
        styles: { fontSize: 9, halign: 'center', cellPadding: 4 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    const validos = filas.map(f => f[4]).filter(v => v !== 'S/N').map(Number);
    const promedioTxt = validos.length ? (validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(1) : 'S/N';

    doc.setFontSize(11);
    doc.setTextColor(92, 0, 0);
    doc.text(`Promedio general del trimestre: ${promedioTxt}`, 14, finalY);

    doc.save(`boletin_${nombreLimpio}_${trimestreLimpio}.pdf`);
}

function generarExcelBoletinEstudiante(trimestre, filas, nombreLimpio, trimestreLimpio) {
    const encabezado = [
        ['Boletín de Notas'],
        [`Estudiante: ${currentStudent.nombre || ''}`],
        [`Trimestre: ${trimestre}`],
        [`Fecha de emisión: ${new Date().toLocaleDateString()}`],
        [],
        ['Materia', 'Total Parciales', 'Total Apreciación', 'Examen Trimestral', 'Nota Final']
    ];

    const ws = XLSX.utils.aoa_to_sheet(encabezado.concat(filas));
    ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Boletin');
    XLSX.writeFile(wb, `boletin_${nombreLimpio}_${trimestreLimpio}.xlsx`);
}
function renderGradeGroup(title, items, promedio, color) {
    return `
        <div class="gd-group">
            <div class="gd-group-header" style="border-left-color:${color}">
                <span class="gd-group-title"><i class="fas fa-list"></i> ${title}</span>
                <span class="gd-group-avg" style="color:${color}">Promedio: ${promedio !== null ? promedio.toFixed(1) : 'Sin datos'}</span>
            </div>
            <div class="gd-items">
                ${items.map(g => `
                    <div class="gd-item">
                        <div class="gd-item-left">
                            <span class="gd-item-name">${escapeHtml(g.nombre || g.tipoActividad || 'Sin nombre')}</span>
                            <span class="gd-item-date"><i class="fas fa-calendar-alt"></i> ${g.date || ''}</span>
                        </div>
                        <div class="gd-item-score" style="color:${color}">${g.score.toFixed(1)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function closeGradesDetailModal(event) {
    if (event && event.target.id !== 'gradesDetailOverlay') return;
    const overlay = document.getElementById('gradesDetailOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            overlay.remove();
        }, { once: true });
    }
}

// ==================== COMENTARIOS ====================
function loadCommentSubjects() {
    const select = document.getElementById('commentSubject');
    if (mySubjects.length === 0) {
        select.innerHTML = '<option value="">-- No hay materias disponibles --</option>';
        return;
    }
    select.innerHTML = '<option value="">-- Seleccionar materia --</option>' +
        mySubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

async function sendComment() {
    const subjectId = parseInt(document.getElementById('commentSubject').value);
    const comment   = document.getElementById('commentText').value.trim();

    if (!subjectId || !comment) {
        Swal.fire('Error', 'Por favor selecciona una materia y escribe tu comentario', 'error');
        return;
    }

    try {
        const res = await apiFetch('/comentarios/', {
            method: 'POST',
            body: JSON.stringify({ materia_id: subjectId, comentario: comment })
        });

        if (res.ok) {
            Swal.fire({ title: '¡Comentario enviado!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
            document.getElementById('commentText').value    = '';
            document.getElementById('commentSubject').value = '';
            await renderMyComments();
        } else {
            const error = await res.json();
            Swal.fire('Error', error.error || 'No se pudo enviar el comentario', 'error');
        }
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

async function renderMyComments() {
    const container = document.getElementById('myCommentsList');
    try {
        const res = await apiFetch('/comentarios/');
        if (!res.ok) throw new Error();
        const json     = await res.json();
        const comments = json.data ?? json;

        if (comments.length === 0) {
            container.innerHTML = '<div class="comment-card"><i class="fas fa-comment-dots"></i> Aún no has enviado comentarios</div>';
            return;
        }

        container.innerHTML = comments.map(c => `
            <div class="comment-card">
                <div class="subject"><i class="fas fa-book"></i> ${escapeHtml(c.materia_nombre)}</div>
                <div class="comment">"${escapeHtml(c.comentario)}"</div>
                <div class="date"><i class="fas fa-calendar-alt"></i> ${c.fecha ? c.fecha.split(' ')[0] : ''}</div>
            </div>
        `).join('');
    } catch {
        container.innerHTML = '<div class="comment-card">Error al cargar comentarios</div>';
    }
}

// ==================== CAMBIO CONTRASEÑA ====================
document.getElementById('changePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const actual    = document.getElementById('cpActual').value;
    const nueva     = document.getElementById('cpNueva').value;
    const confirmar = document.getElementById('cpConfirmar').value;

    if (nueva !== confirmar) {
        Swal.fire('Error', 'Las contraseñas nuevas no coinciden', 'error');
        return;
    }
    if (nueva.length < 6) {
        Swal.fire('Error', 'La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        const res  = await apiFetch('/auth/cambiar_password.php', {
            method: 'POST',
            body: JSON.stringify({ password_actual: actual, password_nueva: nueva })
        });
        const json = await res.json();
        if (res.ok) {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            user.password_cambiada = true;
            localStorage.setItem('currentUser', JSON.stringify(user));
            closeModal('changePasswordModal');
            Swal.fire({ title: '¡Contraseña actualizada!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire('Error', json.error || 'No se pudo actualizar', 'error');
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
});

// ==================== NAVEGACIÓN ====================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        if (!this.dataset.view) return;
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const view = this.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}View`).classList.add('active');
        if (view === 'grades')   renderGradesReport();
        if (view === 'comments') { loadCommentSubjects(); renderMyComments(); }
    });
});

window.addEventListener('click', function (event) {
    document.querySelectorAll('.modal').forEach(modal => {
        if (event.target === modal) closeModal(modal.id);
    });
});

// ==================== LOGOUT ====================
async function logout() {
    try { await apiFetch('/auth/logout.php', { method: 'POST' }); } catch (e) {}
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ==================== UTILIDADES ====================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// ==================== INICIALIZAR ====================
loadData();