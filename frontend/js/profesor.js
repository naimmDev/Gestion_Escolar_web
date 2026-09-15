// ==================== VARIABLES GLOBALES ====================
let currentTeacher        = null;
let mySubjects            = [];
let myEnrollments         = [];
let myGrades              = [];
let myComments            = [];
let myStudents            = [];

let currentSubjectId       = null;
let currentStudentForModal = null;
let currentTrimestre       = 'I Trimestre';
let studentGradeSearch     = '';

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

// ==================== NORMALIZACIÓN ====================
function normalizeGrade(g) {
    return {
        id: g.id,
        studentId: parseInt(g.estudiante_id),
        subjectId: parseInt(g.materia_id),
        type: g.tipo,
        tipoActividad: g.tipo_actividad || '',
        nombre: g.nombre || '',
        score: parseFloat(g.puntaje),
        trimestre: g.trimestre,
        comment: g.comentario || '',
        date: g.fecha_registro ? g.fecha_registro.split(' ')[0] : new Date().toLocaleDateString(),
        studentName: g.estudiante_nombre,
        subjectName: g.materia_nombre
    };
}

function normalizeEnrollment(e) {
    return {
        id:           e.id,
        studentId:    parseInt(e.studentId),
        subjectId:    parseInt(e.subjectId),
        studentName:  e.studentName  || '',
        studentGrade: e.studentGrade || '',
        studentEmail: e.studentEmail || '',
        studentSeccion: e.studentSeccion || '',
        subjectName:  e.subjectName  || ''
    };
}

// ==================== CARGA DE DATOS ====================
async function loadData() {
    currentTeacher = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentTeacher || currentTeacher.rol !== 'profesor') {
        window.location.href = 'index.html';
        return;
    }
    
    if (!currentTeacher.password_cambiada && !currentTeacher.password_skipped) {
        window.location.href = 'cambiar_password.html';
        return;
    }

    document.getElementById('teacherName').textContent = currentTeacher.nombre || 'Profesor';
    document.getElementById('welcomeName').textContent = currentTeacher.nombre || 'Profesor';

    try {
        const [subjectsRes, enrollmentsRes, gradesRes, commentsRes] = await Promise.all([
            apiFetch('/materias/'),
            apiFetch('/matriculas/'),
            apiFetch('/notas/'),
            apiFetch('/comentarios/')
        ]);

        if (!subjectsRes.ok) throw new Error('Error cargando materias');
        if (!enrollmentsRes.ok) throw new Error('Error cargando matrículas');
        if (!gradesRes.ok) throw new Error('Error cargando notas');
        if (!commentsRes.ok) throw new Error('Error cargando comentarios');

        const subjectsJson = await subjectsRes.json();
        const enrollmentsJson = await enrollmentsRes.json();
        const gradesJson = await gradesRes.json();
        const commentsJson = await commentsRes.json();

        const allSubjects = subjectsJson.data ?? subjectsJson;
        const allEnrollments = enrollmentsJson.data ?? enrollmentsJson;
        const allGrades = gradesJson.data ?? gradesJson;
        myComments = commentsJson.data ?? commentsJson;

        mySubjects = allSubjects.filter(s => parseInt(s.teacherId) === currentTeacher.id_referencia);
        myEnrollments = allEnrollments.map(normalizeEnrollment);
        myGrades = allGrades.map(normalizeGrade);

        const studentMap = {};
        myEnrollments.forEach(e => {
            if (!studentMap[e.studentId]) {
                studentMap[e.studentId] = {
                    id: e.studentId,
                    name: e.studentName,
                    grade: e.studentGrade,
                    email: e.studentEmail,
                    seccion: e.studentSeccion || ''
                };
            }
        });
        myStudents = Object.values(studentMap);

        updateDashboard();
        renderSubjects();
        renderComments();
        loadSubjectSelect();

    } catch (error) {
        console.error('Error cargando datos:', error);
        Swal.fire('Error', 'No se pudieron cargar los datos: ' + error.message, 'error');
    }
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    const uniqueStudentIds = [...new Set(myEnrollments.map(e => e.studentId))];
    document.getElementById('mySubjectsCount').textContent = mySubjects.length;
    document.getElementById('myStudentsCount').textContent = uniqueStudentIds.length;
    document.getElementById('myGradesCount').textContent   = myGrades.length;
}

// ==================== FILTRADO ====================
function getStudentsForSubject(subjectId) {
    const studentIds = myEnrollments
        .filter(e => e.subjectId === subjectId)
        .map(e => e.studentId);
    return myStudents.filter(s => studentIds.includes(s.id));
}

function filterStudentSearch(s) {
    if (!studentGradeSearch) return true;
    const q = studentGradeSearch.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) ||
           (s.email || '').toLowerCase().includes(q) ||
           (s.seccion || '').toLowerCase().includes(q);
}

function getGradesForStudent(studentId, subjectId = null, trimestre = null) {
    let grades = myGrades.filter(g => g.studentId === studentId);
    if (subjectId) grades = grades.filter(g => g.subjectId === subjectId);
    if (trimestre && trimestre !== 'Todas') grades = grades.filter(g => g.trimestre === trimestre);
    return grades.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ==================== FUNCIONES DE CÁLCULO ====================
function calcularNotaTrimestral(studentId, subjectId, trimestre) {
    const grades = myGrades.filter(g => 
        g.studentId === studentId && 
        g.subjectId === subjectId && 
        g.trimestre === trimestre
    );

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

function calcularPromedioFinal(studentId, subjectId) {
    const trimestres = ['I Trimestre', 'II Trimestre', 'III Trimestre'];
    const notas = trimestres.map(t => calcularNotaTrimestral(studentId, subjectId, t));
    if (notas.some(n => n === null)) return null;
    return notas.reduce((s, n) => s + n, 0) / notas.length;
}

function generarResumenTrimestre(studentId, subjectId, trimestre) {
    const grades = myGrades.filter(g => g.studentId === studentId && g.subjectId === subjectId && g.trimestre === trimestre);
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
function calcularPromedioSimple(studentId, subjectId) {
    const grades = myGrades.filter(g => g.studentId === studentId && g.subjectId === subjectId);
    if (grades.length === 0) return null;
    const sum = grades.reduce((s, g) => s + g.score, 0);
    return sum / grades.length;
}

// ==================== MATERIAS ====================
function renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (mySubjects.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center; padding:40px;"><i class="fas fa-info-circle"></i> Aún no tienes materias asignadas</div>';
        return;
    }
    container.innerHTML = mySubjects.map(s => {
        const students = getStudentsForSubject(s.id);
        return `
            <div class="subject-card" onclick="selectSubjectForGrades(${s.id})">
                <h4><i class="fas fa-book"></i> ${escapeHtml(s.name)}</h4>
                <p><i class="fas fa-code"></i> Código: ${s.code}</p>
                <p><i class="fas fa-star"></i> Créditos: ${s.credits}</p>
                <p><i class="fas fa-users"></i> Estudiantes: ${students.length}</p>
            </div>
        `;
    }).join('');
}

function loadSubjectSelect() {
    const select = document.getElementById('gradeSubject');
    select.innerHTML = '<option value="">-- Seleccionar una materia --</option>' +
        mySubjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.code})</option>`).join('');
}

function selectSubjectForGrades(subjectId) {
    currentSubjectId = subjectId;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="grades"]').classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('gradesView').classList.add('active');
    document.getElementById('gradeSubject').value = subjectId;
    changeSubject();
}

// ==================== GESTIÓN DE NOTAS ====================
function changeSubject() {
    const val = document.getElementById('gradeSubject').value;
    currentSubjectId = val ? parseInt(val) : null;
    if (currentSubjectId) {
        renderStudentsByGrade();
        updateQuickStats();
        document.getElementById('quickStats').style.display = 'flex';
    } else {
        document.getElementById('studentsByGrade').innerHTML = '<div class="card" style="text-align:center; padding:40px;"><i class="fas fa-hand-point-left"></i> Selecciona una materia para ver los estudiantes</div>';
        document.getElementById('quickStats').style.display = 'none';
    }
}

document.getElementById('searchStudentGrade')?.addEventListener('input', function (e) {
    studentGradeSearch = e.target.value;
    if (currentSubjectId) renderStudentsByGrade();
});

// ==================== DASHBOARD ESTADÍSTICAS ====================
function updateQuickStats() {
    const students = getStudentsForSubject(currentSubjectId);
    let totalPromedios = 0, countWithGrades = 0;
    let approved = 0, inProgress = 0;

    students.forEach(s => {
        const hasExam = myGrades.some(g => 
            g.studentId === s.id && 
            g.subjectId === currentSubjectId && 
            g.type === 'EXAMEN_TRIMESTRAL'
        );
        const hasAnyNote = myGrades.some(g => g.studentId === s.id && g.subjectId === currentSubjectId);
        const avg = calcularPromedioSimple(s.id, currentSubjectId);

        if (hasExam) {
            if (avg !== null && avg >= 3) {
                approved++;
            } else {
                inProgress++;
            }
            if (avg !== null) {
                totalPromedios += avg;
                countWithGrades++;
            }
        } else {
            inProgress++;
            if (avg !== null) {
                totalPromedios += avg;
                countWithGrades++;
            }
        }
    });

    document.getElementById('statTotalStudents').textContent = students.length;
    document.getElementById('statAvgGrade').textContent      = countWithGrades > 0 ? (totalPromedios / countWithGrades).toFixed(1) : 0;
    document.getElementById('statApproved').textContent      = approved;
    document.getElementById('statFailed').textContent        = inProgress;
}

function renderStudentsByGrade() {
    const students    = getStudentsForSubject(currentSubjectId).filter(filterStudentSearch);
    const container   = document.getElementById('studentsByGrade');
    const gradesOrder = ['7°', '8°', '9°', '10°', '11°', '12°'];
    const grouped     = {};

    if (students.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center; padding:40px;"><i class="fas fa-user-graduate"></i> ${studentGradeSearch ? 'No se encontraron estudiantes con ese criterio' : 'No hay estudiantes matriculados en esta materia'}</div>`;
        return;
    }

    students.sort((a, b) => a.name.localeCompare(b.name));
    students.forEach(s => {
        const g = s.grade || 'Sin grado';
        if (!grouped[g]) grouped[g] = [];
        grouped[g].push(s);
    });

    const sortedGrades = Object.keys(grouped).sort((a, b) => {
        const ia = gradesOrder.indexOf(a), ib = gradesOrder.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1; if (ib === -1) return -1;
        return ia - ib;
    });

 container.innerHTML = sortedGrades.map(grade => `
    <div class="grade-section">
        <div class="grade-header" onclick="toggleGradeSection(this)">
            <span><i class="fas fa-graduation-cap"></i> Grado ${grade} (${grouped[grade].length} estudiantes)</span>
            <div style="display:flex; align-items:center; gap:14px;">
                <button class="btn-exportar-grupo" onclick="event.stopPropagation(); exportarBoletinGrupo('${grade}')">
                    <i class="fas fa-file-export"></i> Exportar Notas
                </button>
                <i class="fas fa-chevron-down"></i>
            </div>
        </div>
        <div class="grade-students">
            ${grouped[grade].map(s => renderStudentCard(s)).join('')}
        </div>
    </div>
`).join('');
}

function renderStudentCard(student) {
    const avg = calcularPromedioSimple(student.id, currentSubjectId);
    const hasNotes = myGrades.some(g => g.studentId === student.id && g.subjectId === currentSubjectId);
    return `
        <div class="student-grade-card" onclick="openStudentGradesModal(${student.id})">
            <div class="student-info">
                <div class="student-name">
                    <i class="fas fa-user"></i> ${escapeHtml(student.name)}
                    ${student.seccion ? `<span style="font-size:12px; color:#8a7055; margin-left:8px;">(${escapeHtml(student.seccion)})</span>` : ''}
                </div>
                <div class="student-email"><i class="fas fa-envelope"></i> ${escapeHtml(student.email || '')}</div>
            </div>
            <div class="grades-info">
                ${avg !== null ? `
                    <div class="current-grade">
                        <i class="fas fa-chart-line"></i> Promedio: <strong>${avg.toFixed(1)}</strong>
                        <span class="${avg >= 3 ? 'grade-badge' : 'grade-badge low'}" style="margin-left:8px;">
                            ${avg >= 3 ? '<i class="fas fa-check"></i> Aprobado' : '<i class="fas fa-rotate"></i> En proceso'}
                        </span>
                    </div>
                ` : `
                    <div class="current-grade">
                        ${hasNotes ? `<i class="fas fa-info-circle"></i> Notas registradas` : `<i class="fas fa-info-circle"></i> Sin notas registradas`}
                    </div>
                `}
                <div style="font-size:12px; color:#8a7055; margin-top:6px;"><i class="fas fa-mouse-pointer"></i> Click para ver detalle</div>
            </div>
        </div>
    `;
}

function toggleGradeSection(element) {
    element.classList.toggle('collapsed');
    element.nextElementSibling.classList.toggle('collapsed');
}

// ==================== MODAL DE NOTAS ====================
function openStudentGradesModal(studentId) {
    currentStudentForModal = myStudents.find(s => s.id === studentId);
    if (!currentStudentForModal) return;
    renderStudentModal();
    document.getElementById('studentGradesModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeStudentModal() {
    document.getElementById('studentGradesModal').style.display = 'none';
    document.body.style.overflow = '';
}

function renderStudentModal() {
    const container = document.getElementById('studentModalContent');
    const subject   = mySubjects.find(s => s.id === currentSubjectId);

    container.innerHTML = `
        <div class="student-header">
            <div class="student-avatar"><i class="fas fa-user-graduate"></i></div>
            <div class="student-details">
                <h3>${escapeHtml(currentStudentForModal.name)}${currentStudentForModal.seccion ? `<span style="font-size:14px; font-weight:400; color:#8a7055; margin-left:10px;">— Sección ${escapeHtml(currentStudentForModal.seccion)}</span>` : ''}</h3>
                <p><i class="fas fa-envelope"></i> ${escapeHtml(currentStudentForModal.email || '')} | <i class="fas fa-graduation-cap"></i> Grado ${currentStudentForModal.grade}</p>
                <p><i class="fas fa-book"></i> ${escapeHtml(subject?.name || '')} (${subject?.code || ''})</p>
            </div>
        </div>
       <div class="trimestre-tabs">
    ${['I Trimestre', 'II Trimestre', 'III Trimestre', 'Todas'].map(t => `
        <button class="trimestre-tab ${currentTrimestre === t ? 'active' : ''}" data-trimestre="${t}" onclick="changeTrimestre('${t}')">
            <i class="fas fa-calendar-alt"></i> ${t}
        </button>
    `).join('')}
    <button class="btn-exportar-individual" onclick="exportarBoletinIndividual()">
        <i class="fas fa-file-export"></i> Exportar Notas
    </button>
</div>
        <div id="modalTrimestreContent"></div>
    `;

    renderTrimestreContent();
}

function renderTrimestreContent() {
    const container = document.getElementById('modalTrimestreContent');
    const grades    = getGradesForStudent(
        currentStudentForModal.id, currentSubjectId,
        currentTrimestre === 'Todas' ? null : currentTrimestre
    );
    const notaTrimestral = currentTrimestre !== 'Todas'
        ? calcularNotaTrimestral(currentStudentForModal.id, currentSubjectId, currentTrimestre)
        : null;

    const examenExistente = currentTrimestre !== 'Todas' && myGrades.some(g => 
        g.studentId === currentStudentForModal.id &&
        g.subjectId === currentSubjectId &&
        g.trimestre === currentTrimestre &&
        g.type === 'EXAMEN_TRIMESTRAL'
    );

    container.innerHTML = `
        ${notaTrimestral !== null ? `
            <div class="period-avg">
                <i class="fas fa-chart-line"></i> Nota Trimestral: <span>${notaTrimestral.toFixed(1)}</span>
                ${notaTrimestral >= 3 ? '<i class="fas fa-trophy"></i> Aprobado' : '<i class="fas fa-rotate"></i> En proceso'}
            </div>
        ` : `
            <div class="period-avg" style="background: var(--ivory-dark);">
                <i class="fas fa-hourglass-half"></i> ${grades.length > 0 ? 'Notas registradas' : 'Sin notas registradas'}
            </div>
        `}

        <div class="add-grade-section">
            <div class="add-grade-title"><i class="fas fa-plus-circle"></i> Agregar nueva evaluación</div>
            <div class="grade-form-row">
                <div class="form-group" style="flex:1;">
                    <label>Tipo de evaluación</label>
                    ${examenExistente ? `<div style="color:#b8860b; font-weight:bold; margin-bottom:5px;">✓ Examen trimestral ya registrado</div>` : ''}
                    <select id="newGradeType" class="grade-type-select">
                        <option value="PARCIAL">Parcial</option>
                        <option value="EXAMEN_TRIMESTRAL" ${examenExistente ? 'disabled style="color:#999;"' : ''}>
                            ${examenExistente ? 'Examen Trimestral (ya registrado)' : 'Examen Trimestral'}
                        </option>
                        <option value="APRECIACION">Apreciación</option>
                    </select>
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Tipo de actividad (opcional)</label>
                    <select id="newGradeTipoActividad" class="grade-type-select">
                        <option value="">-- Seleccionar --</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Parcial">Parcial</option>
                        <option value="Taller">Taller</option>
                        <option value="Tarea">Tarea</option>
                        <option value="Proyecto">Proyecto</option>
                        <option value="Investigacion">Investigación</option>
                        <option value="Exposicion">Exposición</option>
                        <option value="Laboratorio">Laboratorio</option>
                        <option value="Participacion">Participación</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
            </div>
            <div class="grade-form-row">
                <div class="form-group" style="flex:1;">
                    <label>Nombre de la actividad (opcional)</label>
                    <input type="text" id="newGradeNombre" placeholder="Ej: Quiz #1">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Nota (1.0 - 5.0)</label>
                    <input type="number" id="newGradeScore" step="0.1" min="1" max="5" placeholder="Ej: 4.5">
                </div>
            </div>
            <div class="grade-form-row">
                <div class="form-group" style="flex:2;">
                    <label>Comentario</label>
                    <input type="text" id="newGradeComment" placeholder="Descripción...">
                </div>
                <div class="form-group" style="flex:0;">
                    <button class="btn-primary" onclick="addNewGrade()" style="margin-top:22px;">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                </div>
            </div>
        </div>

        <div class="grades-history">
            <div class="grades-history-title">
                <i class="fas fa-history"></i>
                ${currentTrimestre === 'Todas' ? 'Historial completo' : `Notas del ${currentTrimestre}`}
                (${grades.length} registros)
            </div>
            <div id="gradesHistoryList">
                ${grades.length === 0
                    ? '<div style="text-align:center; padding:40px; color:#8a7055;"><i class="fas fa-inbox"></i> No hay notas en este período</div>'
                    : grades.map(g => renderGradeHistoryItem(g)).join('')
                }
            </div>
        </div>
    `;

    const resumen = generarResumenTrimestre(currentStudentForModal.id, currentSubjectId, currentTrimestre);
    if (resumen && grades.length > 0) {
        container.innerHTML += `
            <div style="margin-top: 20px; border-top: 2px solid var(--parchment); padding-top: 16px;">
                <h4 style="font-family: 'Cinzel', serif; color: var(--crimson-deep);">Resumen del Trimestre</h4>
                <table style="width:100%; border-collapse:collapse; max-width:420px; margin:0 auto;">
                    <tr><td style="padding:6px 0; color:var(--ink-soft);"><strong>Promedio Parciales</strong></td><td style="text-align:right; font-family:'Cinzel',serif; color:var(--crimson);">${resumen.promParciales !== null ? resumen.promParciales.toFixed(1) : 'Sin datos'}</td></tr>
                    <tr><td style="padding:6px 0; color:var(--ink-soft);"><strong>Promedio Apreciación</strong></td><td style="text-align:right; font-family:'Cinzel',serif; color:var(--crimson);">${resumen.promApreciacion !== null ? resumen.promApreciacion.toFixed(1) : 'Sin datos'}</td></tr>
                    <tr><td style="padding:6px 0; color:var(--ink-soft);"><strong>Examen Trimestral</strong></td><td style="text-align:right; font-family:'Cinzel',serif; color:var(--crimson);">${resumen.examen !== null ? resumen.examen.toFixed(1) : 'Sin registrar'}</td></tr>
                    <tr style="font-weight:bold; border-top:2px solid var(--crimson);">
                        <td style="padding:10px 0; font-family:'Cinzel',serif; color:var(--crimson-deep);">Nota Trimestral</td>
                        <td style="text-align:right; font-family:'Cinzel',serif; font-size:18px; color:var(--crimson-deep);">${resumen.notaTrimestral !== null ? resumen.notaTrimestral.toFixed(1) : '<span style="color:#8a7055; font-size:14px;">En curso</span>'}</td>
                    </tr>
                </table>
            </div>
        `;
    }
}

function renderGradeHistoryItem(grade) {
    let nombreDisplay = grade.nombre;
    if (!nombreDisplay || nombreDisplay.trim() === '') {
        const typeLabels = {
            'PARCIAL': 'Parcial',
            'EXAMEN_TRIMESTRAL': 'Examen Trimestral',
            'APRECIACION': 'Apreciación'
        };
        const mismasNotas = myGrades.filter(g => 
            g.studentId === grade.studentId && 
            g.subjectId === grade.subjectId && 
            g.trimestre === grade.trimestre && 
            g.type === grade.type &&
            g.id <= grade.id
        );
        const numero = mismasNotas.length;
        nombreDisplay = `${typeLabels[grade.type] || grade.type} ${numero}`;
    }

    const typeLabels = {
        'PARCIAL': '<i class="fas fa-pen"></i> Parcial',
        'EXAMEN_TRIMESTRAL': '<i class="fas fa-star"></i> Examen Trimestral',
        'APRECIACION': '<i class="fas fa-hand-peace"></i> Apreciación'
    };
    return `
        <div class="grade-history-item ${grade.type}">
            <div class="grade-info">
                <div>
                    <span class="grade-type-badge ${grade.type}">${typeLabels[grade.type] || grade.type}</span>
                    ${grade.tipoActividad ? `<span class="badge" style="background:var(--ivory-dark); padding:2px 8px; border-radius:2px; margin-left:6px;">${escapeHtml(grade.tipoActividad)}</span>` : ''}
                    <span class="grade-score">${grade.score.toFixed(1)}</span>
                </div>
                <div style="font-size:13px; color:var(--ink-soft); margin-top:4px;">
                    <strong>${escapeHtml(nombreDisplay)}</strong>
                </div>
                ${grade.comment ? `<div class="grade-comment"><i class="fas fa-quote-left"></i> ${escapeHtml(grade.comment)}</div>` : ''}
                <div class="grade-date"><i class="fas fa-calendar-alt"></i> ${grade.date} | ${grade.trimestre}</div>
            </div>
            <div class="grade-actions">
                <button class="delete-grade-btn" onclick="deleteGrade(${grade.id})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `;
}

function changeTrimestre(trimestre) {
    currentTrimestre = trimestre;
    document.querySelectorAll('.trimestre-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.trimestre === trimestre);
    });
    renderTrimestreContent();
}

// ==================== AGREGAR NOTA ====================
async function addNewGrade() {
    const type = document.getElementById('newGradeType').value;
    const tipoActividad = document.getElementById('newGradeTipoActividad').value;
    const nombre = document.getElementById('newGradeNombre').value.trim();
    const score = parseFloat(document.getElementById('newGradeScore').value);
    const comment = document.getElementById('newGradeComment').value.trim();
    const trimestre = currentTrimestre === 'Todas' ? 'I Trimestre' : currentTrimestre;

    if (isNaN(score) || score < 1 || score > 5) {
        Swal.fire('Error', 'La nota debe ser un número entre 1.0 y 5.0', 'error');
        return;
    }

    if (type === 'EXAMEN_TRIMESTRAL') {
        const existing = myGrades.find(g => 
            g.studentId === currentStudentForModal.id &&
            g.subjectId === currentSubjectId &&
            g.trimestre === trimestre &&
            g.type === 'EXAMEN_TRIMESTRAL'
        );
        if (existing) {
            Swal.fire({
                title: 'nota de examen final existente',
                icon: 'info',
                timer: 2000,
                showConfirmButton: false
            });
            return;
        }
    }

    const payload = {
        estudiante_id: currentStudentForModal.id,
        materia_id: currentSubjectId,
        tipo: type,
        puntaje: score,
        trimestre: trimestre,
        comentario: comment || null,
        tipo_actividad: tipoActividad || null,
        nombre: nombre || null
    };

    try {
        const res = await apiFetch('/notas/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            Swal.fire({ title: '¡Nota registrada!', icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
            await reloadGradesAndRefresh();
        } else {
            const error = await res.json();
            if (res.status === 409) {
                Swal.fire({
                    title: 'nota de examen final existente',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', error.error || 'No se pudo guardar la nota', 'error');
            }
        }
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
}

// ==================== ELIMINAR NOTA ====================
async function deleteGrade(gradeId) {
    const result = await Swal.fire({
        title: '¿Eliminar esta nota?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8B0000',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await apiFetch('/notas/', { method: 'DELETE', body: JSON.stringify({ id: gradeId }) });
            if (res.ok) {
                Swal.fire({ title: 'Nota eliminada', icon: 'success', timer: 1200, showConfirmButton: false });
                await reloadGradesAndRefresh();
            } else {
                const error = await res.json();
                Swal.fire('Error', error.error || 'No se pudo eliminar', 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

async function reloadGradesAndRefresh() {
    const gradesRes = await apiFetch('/notas/');
    const gradesJson = await gradesRes.json();
    const allGrades = gradesJson.data ?? gradesJson;
    myGrades = allGrades.map(normalizeGrade);

    renderTrimestreContent();
    renderStudentsByGrade();
    updateQuickStats();
    updateDashboard();
}

// ==================== EXPORTAR BOLETÍN (PDF / Excel) ====================
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

// ---------- GRUPAL (por grado, dentro de una materia) ----------
function construirFilasBoletinGrupo(grado) {
    const fmt = (v) => (v !== null && v !== undefined) ? v.toFixed(1) : 'S/N';
    const estudiantesGrado = getStudentsForSubject(currentSubjectId)
        .filter(s => (s.grade || 'Sin grado') === grado)
        .sort((a, b) => a.name.localeCompare(b.name));

    return estudiantesGrado.map(s => {
        const notas = myGrades.filter(g => g.studentId === s.id && g.subjectId === currentSubjectId);
        const parciales = notas.filter(g => g.type === 'PARCIAL');
        const apreciaciones = notas.filter(g => g.type === 'APRECIACION');
        const examenes = notas.filter(g => g.type === 'EXAMEN_TRIMESTRAL');

        const promParciales = parciales.length ? parciales.reduce((a, g) => a + g.score, 0) / parciales.length : null;
        const promApreciacion = apreciaciones.length ? apreciaciones.reduce((a, g) => a + g.score, 0) / apreciaciones.length : null;
        const promExamen = examenes.length ? examenes.reduce((a, g) => a + g.score, 0) / examenes.length : null;
        const notaFinal = calcularPromedioFinal(s.id, currentSubjectId);

        return [s.name, fmt(promParciales), fmt(promApreciacion), fmt(promExamen), fmt(notaFinal)];
    });
}

async function exportarBoletinGrupo(grado) {
    const subject = mySubjects.find(s => s.id === currentSubjectId);
    if (!subject) {
        Swal.fire('Error', 'Selecciona una materia primero', 'error');
        return;
    }

    const filas = construirFilasBoletinGrupo(grado);
    if (!filas.length) {
        Swal.fire('Sin estudiantes', 'No hay estudiantes en este grado para exportar', 'info');
        return;
    }

    const formato = await elegirFormatoExportacion();
    if (!formato) return;

    const nombreMateria = (subject.name || 'materia').replace(/\s+/g, '_');
    const gradoLimpio = String(grado).replace(/[°\s]+/g, '');

    if (formato === 'pdf') {
        generarPdfBoletinGrupo(subject, grado, filas, nombreMateria, gradoLimpio);
    } else {
        generarExcelBoletinGrupo(subject, grado, filas, nombreMateria, gradoLimpio);
    }
}

function generarPdfBoletinGrupo(subject, grado, filas, nombreMateria, gradoLimpio) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(92, 0, 0);
    doc.text('Reporte Grupal de Notas', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Materia: ${subject.name} (${subject.code})`, 14, 28);
    doc.text(`Grado: ${grado}`, 14, 34);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 40);

    doc.autoTable({
        startY: 46,
        head: [['Estudiante', 'Total Parciales', 'Total Apreciación', 'Examen Trimestral', 'Nota Final']],
        body: filas,
        headStyles: { fillColor: [139, 0, 0], textColor: [245, 230, 184], halign: 'center' },
        alternateRowStyles: { fillColor: [250, 246, 238] },
        styles: { fontSize: 9, halign: 'center', cellPadding: 4 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    doc.save(`reporte_grupal_${nombreMateria}_${gradoLimpio}.pdf`);
}

function generarExcelBoletinGrupo(subject, grado, filas, nombreMateria, gradoLimpio) {
    const encabezado = [
        ['Reporte Grupal de Notas'],
        [`Materia: ${subject.name} (${subject.code})`],
        [`Grado: ${grado}`],
        [`Fecha de emisión: ${new Date().toLocaleDateString()}`],
        [],
        ['Estudiante', 'Total Parciales', 'Total Apreciación', 'Examen Trimestral', 'Nota Final']
    ];

    const ws = XLSX.utils.aoa_to_sheet(encabezado.concat(filas));
    ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Grupal');
    XLSX.writeFile(wb, `reporte_grupal_${nombreMateria}_${gradoLimpio}.xlsx`);
}

// ---------- INDIVIDUAL (por estudiante, dentro del modal) ----------
function construirFilasBoletinIndividual() {
    const fmt = (v) => (v !== null && v !== undefined) ? v.toFixed(1) : 'S/N';
    const trimestres = ['I Trimestre', 'II Trimestre', 'III Trimestre'];

    return trimestres.map(tri => {
        const resumen = generarResumenTrimestre(currentStudentForModal.id, currentSubjectId, tri);
        return [tri, fmt(resumen.promParciales), fmt(resumen.promApreciacion), fmt(resumen.examen), fmt(resumen.notaTrimestral)];
    });
}

async function exportarBoletinIndividual() {
    if (!currentStudentForModal || !currentSubjectId) {
        Swal.fire('Error', 'No se pudo identificar al estudiante o la materia', 'error');
        return;
    }

    const formato = await elegirFormatoExportacion();
    if (!formato) return;

    const subject = mySubjects.find(s => s.id === currentSubjectId);
    const filas = construirFilasBoletinIndividual();
    const notaFinal = calcularPromedioFinal(currentStudentForModal.id, currentSubjectId);
    const notaFinalTxt = (notaFinal !== null && notaFinal !== undefined) ? notaFinal.toFixed(1) : 'S/N';

    const nombreLimpio = (currentStudentForModal.name || 'estudiante').replace(/\s+/g, '_');
    const nombreMateria = (subject?.name || 'materia').replace(/\s+/g, '_');

    if (formato === 'pdf') {
        generarPdfBoletinIndividual(subject, filas, notaFinalTxt, nombreLimpio, nombreMateria);
    } else {
        generarExcelBoletinIndividual(subject, filas, notaFinalTxt, nombreLimpio, nombreMateria);
    }
}

function generarPdfBoletinIndividual(subject, filas, notaFinalTxt, nombreLimpio, nombreMateria) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(92, 0, 0);
    doc.text('Boletín Individual de Notas', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Estudiante: ${currentStudentForModal.name}`, 14, 28);
    doc.text(`Materia: ${subject?.name || ''} (${subject?.code || ''})`, 14, 34);
    doc.text(`Grado: ${currentStudentForModal.grade || ''} ${currentStudentForModal.seccion ? '- Sección ' + currentStudentForModal.seccion : ''}`, 14, 40);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 46);

    doc.autoTable({
        startY: 52,
        head: [['Trimestre', 'Total Parciales', 'Total Apreciación', 'Examen Trimestral', 'Nota Trimestral']],
        body: filas,
        headStyles: { fillColor: [139, 0, 0], textColor: [245, 230, 184], halign: 'center' },
        alternateRowStyles: { fillColor: [250, 246, 238] },
        styles: { fontSize: 9, halign: 'center', cellPadding: 4 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(92, 0, 0);
    doc.text(`Nota Final: ${notaFinalTxt}`, 14, finalY);

    doc.save(`boletin_${nombreLimpio}_${nombreMateria}.pdf`);
}

function generarExcelBoletinIndividual(subject, filas, notaFinalTxt, nombreLimpio, nombreMateria) {
    const encabezado = [
        ['Boletín Individual de Notas'],
        [`Estudiante: ${currentStudentForModal.name}`],
        [`Materia: ${subject?.name || ''} (${subject?.code || ''})`],
        [`Grado: ${currentStudentForModal.grade || ''} ${currentStudentForModal.seccion ? '- Sección ' + currentStudentForModal.seccion : ''}`],
        [`Fecha de emisión: ${new Date().toLocaleDateString()}`],
        [],
        ['Trimestre', 'Total Parciales', 'Total Apreciación', 'Examen Trimestral', 'Nota Trimestral']
    ];

    const datos = encabezado.concat(filas);
    datos.push([]);
    datos.push(['Nota Final', notaFinalTxt]);

    const ws = XLSX.utils.aoa_to_sheet(datos);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Boletin Individual');
    XLSX.writeFile(wb, `boletin_${nombreLimpio}_${nombreMateria}.xlsx`);
}

// ==================== COMENTARIOS ====================
function renderComments() {
    const container = document.getElementById('commentsList');
    if (!container) return;

    if (myComments.length === 0) {
        container.innerHTML = '<div class="comment-card"><i class="fas fa-comment-dots"></i> Aún no hay comentarios de estudiantes</div>';
        return;
    }

    container.innerHTML = myComments.map(c => `
        <div class="comment-card">
            <div class="student"><i class="fas fa-user-graduate"></i> ${escapeHtml(c.estudiante_nombre)}</div>
            <div class="subject"><i class="fas fa-book"></i> ${escapeHtml(c.materia_nombre)}</div>
            <div class="comment"><i class="fas fa-quote-left"></i> "${escapeHtml(c.comentario)}"</div>
            <div class="date"><i class="fas fa-calendar-alt"></i> ${c.fecha ? c.fecha.split(' ')[0] : ''}</div>
        </div>
    `).join('');
}

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
        if (view === 'subjects')  renderSubjects();
        if (view === 'grades')    { loadSubjectSelect(); if (currentSubjectId) { document.getElementById('gradeSubject').value = currentSubjectId; changeSubject(); } }
        if (view === 'comments')  renderComments();
    });
});

window.addEventListener('click', function (event) {
    if (event.target.id === 'studentGradesModal') {
        closeStudentModal();
        return;
    }
    document.querySelectorAll('.modal').forEach(modal => {
        if (event.target === modal && modal.id !== 'studentGradesModal') {
            closeModal(modal.id);
        }
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