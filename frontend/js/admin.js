/*
 * NOTA SOBRE CACHÉ DEL NAVEGADOR:
 * Si editas el archivo y los cambios no se aplican al recargar la página,
 * agrega o sube el parámetro de versión en el <script> que carga el archivo,
 * ej: js/admin.js?v=2 -> ?v=3
 */

// ==================== VERIFICACIÓN DE SESIÓN ====================
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.rol !== 'admin') {
    window.location.href = 'index.html';
}

window.Swal = window.Swal.mixin({ scrollbarPadding: false });

// Forzar recarga si la página se restaura desde bfcache (botón Atrás/Adelante)
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});

// ==================== FUNCIONES GLOBALES ====================
window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        modal.classList.remove('show');
    }
};

window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        modal.classList.add('show');
    } else {
        Swal.fire('Error', 'No se pudo abrir el modal', 'error');
    }
};

// Cerrar modal con ESC
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }
});

// Cerrar modal si se hace clic fuera del contenido (UN SOLO LISTENER)
window.addEventListener('click', function (event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const nameEl = document.getElementById('adminName');
    if (nameEl) nameEl.textContent = currentUser.nombre || 'Administrador';
    loadData();
});

// ==================== ESTADO GLOBAL ====================
let students = [];
let teachers = [];
let subjects = [];
let enrollments = [];
let activities = [];
let originalStudentPassword = '';
let originalTeacherPassword = '';

let currentStudentPage = 1;
let currentProfessorPage = 1;
let currentSubjectPage = 1;
let currentEnrollmentPage = 1;
let perPage = 10;
let currentActiveView = 'dashboard';
let currentUserTab = 'students';

let studentSearch = '';
let professorSearch = '';
let subjectSearch = '';
let enrollmentSearch = '';

let studentTotal = 0;
let professorTotal = 0;
let subjectTotal = 0;
let enrollmentTotal = 0;
let periods = [];

// ==================== UTILIDADES ====================
function showToast(title, icon = 'success') {
    Swal.fire({ title, icon, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
}

async function confirmDelete(message) {
    const result = await Swal.fire({
        title: '¿Estás seguro?', text: message, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#8B0000',
        cancelButtonColor: '#aaa', confirmButtonText: 'Sí, eliminar'
    });
    return result.isConfirmed;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function normalizarTexto(s) {
    return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// ==================== CONTRASEÑA INICIAL ====================
function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pass = '';
    for (let i = 0; i < 6; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
}

function regenPassword(inputId) {
    const input = document.getElementById(inputId);
    input.value = generatePassword();
    input.readOnly = true;
    input.classList.remove('password-editable');
}

function togglePasswordEdit(inputId) {
    const input = document.getElementById(inputId);
    input.readOnly = !input.readOnly;
    input.classList.toggle('password-editable', !input.readOnly);
    if (!input.readOnly) input.focus();
}

async function logout() {
    try { await apiFetch('/auth/logout.php', { method: 'POST' }); } catch (e) { }
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ==================== CARGAR DATOS ====================
async function loadData() {
    try {
        const [subjectsRes, enrollmentsRes, teachersRes] = await Promise.all([
            apiFetch('/materias/'),
            apiFetch('/matriculas/'),
            apiFetch('/profesores/')
        ]);

        const subjectsJson = await subjectsRes.json();
        const enrollmentsJson = await enrollmentsRes.json();
        const teachersJson = await teachersRes.json();

        subjects = subjectsJson.data?.items ?? subjectsJson.data ?? subjectsJson;
        enrollments = enrollmentsJson.data?.items ?? enrollmentsJson.data ?? enrollmentsJson;
        teachers = teachersJson.data?.items ?? teachersJson.data ?? teachersJson;

        teachers.forEach(t => { if (!t.subjectIds) t.subjectIds = []; });

        setupSearch();
        await Promise.all([
            loadStudentsPage(),
            loadProfessorsPage(),
            loadSubjectsPage(),
            loadEnrollmentsPage()
        ]);

        renderActivities();
        addActivity('Datos cargados desde el servidor');

    } catch (error) {
        console.error('Error cargando datos:', error);
        Swal.fire({ title: 'Error', text: 'No se pudieron cargar los datos: ' + error.message, icon: 'error', confirmButtonColor: '#8B0000' });
    }
}

// ==================== LOADERS POR ENTIDAD ====================
async function loadStudentsPage() {
    const params = new URLSearchParams({
        page: currentStudentPage, per_page: perPage, search: studentSearch
    });
    const res = await apiFetch(`/estudiantes/?${params}`);
    const json = await res.json();
    const data = json.data ?? json;
    students = data.items ?? data;
    studentTotal = data.total ?? students.length;
    if (currentActiveView === 'students') renderStudents();
    updateStats();
}

async function loadProfessorsPage() {
    const params = new URLSearchParams({
        page: currentProfessorPage, per_page: perPage, search: professorSearch
    });
    const res = await apiFetch(`/profesores/?${params}`);
    const json = await res.json();
    const data = json.data ?? json;
    teachers = data.items ?? data;
    professorTotal = data.total ?? teachers.length;
    try { await getAllSubjects(); } catch (e) { /* usa la página actual como respaldo */ }
    teachers.forEach(t => { if (!t.subjectIds) t.subjectIds = []; });
    if (currentActiveView === 'professors') renderTeachers();
    updateStats();
}

async function loadSubjectsPage() {
    const params = new URLSearchParams({
        page: currentSubjectPage, per_page: perPage, search: subjectSearch
    });
    const res = await apiFetch(`/materias/?${params}`);
    const json = await res.json();
    const data = json.data ?? json;
    subjects = data.items ?? data;
    subjectTotal = data.total ?? subjects.length;
    allSubjectsCache = null;
    try { await getAllTeachers(); } catch (e) { /* usa la página actual como respaldo */ }
    if (currentActiveView === 'subjects') renderSubjects();
    updateStats();
}

async function loadEnrollmentsPage() {
    const params = new URLSearchParams({
        page: currentEnrollmentPage, per_page: perPage, search: enrollmentSearch
    });
    const res = await apiFetch(`/matriculas/?${params}`);
    const json = await res.json();
    const data = json.data ?? json;
    enrollments = data.items ?? data;
    enrollmentTotal = data.total ?? enrollments.length;
    if (currentActiveView === 'enrollments') renderEnrollments();
    updateStats();
}

// ==================== ACTIVIDAD RECIENTE ====================
function addActivity(action) {
    activities.unshift({ action, date: new Date().toLocaleString() });
    if (activities.length > 15) activities.pop();
    renderActivities();
}

function renderActivities() {
    const container = document.getElementById('activityList');
    if (!container) return;
    container.innerHTML = activities
        .map(a => `<div class="activity-item"><i class="fas fa-circle-dot"></i> ${escapeHtml(a.action)} — ${escapeHtml(a.date)}</div>`)
        .join('') || '<div class="activity-item">Sin actividad reciente</div>';
}

// ==================== ESTADÍSTICAS ====================
function updateStats() {
    document.getElementById('totalStudents').innerText = studentTotal || students.length;
    document.getElementById('totalTeachers').innerText = professorTotal || teachers.length;
    document.getElementById('totalSubjects').innerText = subjectTotal || subjects.length;
    document.getElementById('totalEnrollments').innerText = enrollmentTotal || enrollments.length;
}

// ==================== PAGINACIÓN SERVER-SIDE ====================
function renderServerPagination(paginationId, currentPage, totalPages, total, perPageVal, onPageChange) {
    const paginationDiv = document.getElementById(paginationId);
    if (!paginationDiv) return;

    const start = ((currentPage - 1) * perPageVal) + 1;
    const end = Math.min(currentPage * perPageVal, total);

    paginationDiv.innerHTML = `
        <div class="page-info">Mostrando ${total > 0 ? start : 0}–${end} de ${total}</div>
        <div>
            <select class="per-page-select" onchange="changePerPage('${paginationId}', this.value)">
                <option value="10"  ${perPageVal === 10 ? 'selected' : ''}>10</option>
                <option value="25"  ${perPageVal === 25 ? 'selected' : ''}>25</option>
                <option value="50"  ${perPageVal === 50 ? 'selected' : ''}>50</option>
            </select> por página
        </div>
        <div>
            <button onclick="${onPageChange}(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>Anterior</button>
            Pág. ${currentPage} de ${totalPages || 1}
            <button onclick="${onPageChange}(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
        </div>
    `;
}

function changePerPage(paginationId, value) {
    perPage = parseInt(value);
    currentStudentPage = currentProfessorPage = currentSubjectPage = currentEnrollmentPage = 1;

    if (currentActiveView === 'students') loadStudentsPage();
    else if (currentActiveView === 'professors') loadProfessorsPage();
    else if (currentActiveView === 'subjects') loadSubjectsPage();
    else if (currentActiveView === 'enrollments') loadEnrollmentsPage();
}

function refreshAllViews() {
    if (currentActiveView === 'students') renderStudents();
    else if (currentActiveView === 'professors') renderTeachers();
    else if (currentActiveView === 'subjects') renderSubjects();
    else if (currentActiveView === 'enrollments') renderEnrollments();
    updateStats();
}

// ==================== CAMBIO DE PÁGINA ====================
function changeStudentPage(page) {
    if (page < 1) return;
    currentStudentPage = page;
    loadStudentsPage();
}

function changeProfessorPage(page) {
    if (page < 1) return;
    currentProfessorPage = page;
    loadProfessorsPage();
}

function changeSubjectPage(page) {
    if (page < 1) return;
    currentSubjectPage = page;
    loadSubjectsPage();
}

function changeEnrollmentPage(page) {
    if (page < 1) return;
    currentEnrollmentPage = page;
    loadEnrollmentsPage();
}

// ==================== BÚSQUEDA SERVER-SIDE ====================
function setupSearch() {
    document.getElementById('searchStudent')?.addEventListener('input', e => {
        studentSearch = e.target.value;
        currentStudentPage = 1;
        loadStudentsPage();
    });
    document.getElementById('searchProfessor')?.addEventListener('input', e => {
        professorSearch = e.target.value;
        currentProfessorPage = 1;
        loadProfessorsPage();
    });
    document.getElementById('searchSubject')?.addEventListener('input', e => {
        subjectSearch = e.target.value;
        currentSubjectPage = 1;
        loadSubjectsPage();
    });
    document.getElementById('searchEnrollment')?.addEventListener('input', e => {
        enrollmentSearch = e.target.value;
        currentEnrollmentPage = 1;
        loadEnrollmentsPage();
    });
}

// ==================== ESTUDIANTES ====================
function renderStudents() {
    const totalPages = Math.ceil(studentTotal / perPage);
    const tbody = document.getElementById('studentsTable');
    if (tbody) {
        tbody.innerHTML = students.length
            ? students.map((s, i) => `
                <tr>
                    <td>${((currentStudentPage - 1) * perPage) + i + 1}</td>
                    <td>${escapeHtml(s.identificacion || '—')}</td>
                    <td><span class="badge password-badge">${escapeHtml(s.initialPassword || '......')}</span></td>
                    <td>${escapeHtml(s.name)}</td>
                    <td>${escapeHtml(s.email)}</td>
                    <td>${escapeHtml(s.grade) || '—'}</td>
                    <td>${escapeHtml(s.seccion || '—')}</td>
                    <td>
                        <button class="btn-edit"   onclick="editStudent(${s.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-reset"  onclick="resetStudentAccess(${s.id})" title="Restablecer acceso"><i class="fas fa-key"></i></button>
                        <button class="btn-danger" onclick="deleteStudent(${s.id})"><i class="fas fa-trash"></i></button>
                     </td>
                 </tr>
            `).join('')
            : '<tr class="empty-row"><td colspan="8">No hay estudiantes</td></tr>';
    }
    renderServerPagination('studentPagination', currentStudentPage, totalPages, studentTotal, perPage, 'changeStudentPage');
}

function openStudentModal() {
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('studentPassword').value = generatePassword();
    originalStudentPassword = '';
    document.getElementById('studentPassword').readOnly = true;
    document.getElementById('studentPassword').classList.remove('password-editable');
    openModal('studentModal');
}

function editStudent(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;
    document.getElementById('studentId').value = s.id;
    document.getElementById('studentIdentificacion').value = s.identificacion || '';
    originalStudentPassword = s.initialPassword || generatePassword();
    document.getElementById('studentPassword').value = originalStudentPassword;
    document.getElementById('studentPassword').readOnly = true;
    document.getElementById('studentPassword').classList.remove('password-editable');
    document.getElementById('studentFirstName').value = s.firstName || '';
    document.getElementById('studentLastName').value = s.lastName || '';
    document.getElementById('studentEmail').value = s.email;
    document.getElementById('studentGrade').value = s.grade;
    document.getElementById('studentSeccion').value = s.seccion || '';
    openModal('studentModal');
}

async function deleteStudent(id) {
    if (!await confirmDelete('El estudiante perderá sus matrículas')) return;
    try {
        let res = await apiFetch('/estudiantes/delete.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        let json = await res.json();

        if (res.status === 409 && json.details?.requiresConfirmation === 'comentarios') {
            if (!await confirmDelete(json.error)) return;
            res = await apiFetch('/estudiantes/delete.php', { method: 'DELETE', body: JSON.stringify({ id, confirmar_comentarios: true }) });
            json = await res.json();
        }

        if (res.ok) {
            await loadStudentsPage();
            await loadEnrollmentsPage();
            addActivity(`Eliminó estudiante ID ${id}`);
            showToast('Estudiante eliminado');
        } else {
            Swal.fire('Error', json.error || 'No se pudo eliminar', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
}

async function resetStudentAccess(id) {
    const s = students.find(s => s.id === id);
    if (!s) return;

    const result = await Swal.fire({
        title: '¿Restablecer acceso?',
        html: `Se generará una nueva contraseña para <strong>${escapeHtml(s.name)}</strong>.<br>Deberá cambiar su contraseña y configurar sus preguntas de seguridad nuevamente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8B0000',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Sí, restablecer'
    });
    if (!result.isConfirmed) return;

    const newPassword = generatePassword();
    const payload = {
        id: s.id, name: s.name, email: s.email, identificacion: s.identificacion,
        grade: s.grade, seccion: s.seccion, initialPassword: newPassword
    };

    try {
        const res = await apiFetch('/estudiantes/', { method: 'PUT', body: JSON.stringify(payload) });
        if (res.ok) {
            addActivity(`Restableció acceso de ${s.name}`);
            await loadStudentsPage();
            Swal.fire({
                title: 'Acceso restablecido',
                html: `Nueva contraseña inicial:<br><span class="password-display-full">${escapeHtml(newPassword)}</span>`,
                icon: 'success',
                confirmButtonColor: '#8B0000'
            });
        } else {
            const json = await res.json();
            Swal.fire('Error', json.error || 'No se pudo restablecer el acceso', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
}

document.getElementById('studentForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('studentId').value;
    const password = document.getElementById('studentPassword').value.trim();

    if (password.length < 6) {
        Swal.fire('Error', 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    const student = {
        ...(id ? { id: parseInt(id) } : {}),
        firstName: document.getElementById('studentFirstName').value.trim(),
        lastName: document.getElementById('studentLastName').value.trim(),
        email: document.getElementById('studentEmail').value,
        identificacion: document.getElementById('studentIdentificacion').value.trim(),
        grade: document.getElementById('studentGrade').value,
        seccion: document.getElementById('studentSeccion').value.trim(),
        ...((!id || password !== originalStudentPassword) ? { initialPassword: password } : {})
    };
    try {
        const res = await apiFetch('/estudiantes/', { method: id ? 'PUT' : 'POST', body: JSON.stringify(student) });
        if (res.ok) {
            showToast(id ? 'Estudiante actualizado' : 'Estudiante creado');
            addActivity(id ? `Editó ${student.firstName} ${student.lastName}` : `Agregó ${student.firstName} ${student.lastName}`);
            await loadStudentsPage();
            closeModal('studentModal');
        } else {
            const json = await res.json();
            Swal.fire('Error', json.error || 'No se pudo guardar', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
});

// ==================== PROFESORES ====================
function renderTeachers() {
    const totalPages = Math.ceil(professorTotal / perPage);
    const tbody = document.getElementById('professorsTable');
    if (tbody) {
        tbody.innerHTML = teachers.length
            ? teachers.map((t, i) => {
                const teacherSubjects = (allSubjectsCache || subjects)
                    .filter(s => parseInt(s.teacherId) === t.id)
                    .map(s => s.name).join(', ') || 'Sin materias';
                return `
                    <tr>
                        <td>${((currentProfessorPage - 1) * perPage) + i + 1}</td>
                        <td>${escapeHtml(t.identificacion || '—')}</td>
                        <td><span class="badge password-badge">${escapeHtml(t.initialPassword || '......')}</span></td>
                        <td>${escapeHtml(t.name)}</td>
                        <td>${escapeHtml(t.email)}</td>
                        <td>${escapeHtml(t.specialty)}</td>
                        <td><span class="badge">${escapeHtml(teacherSubjects.substring(0, 40))}${teacherSubjects.length > 40 ? '…' : ''}</span></td>
                        <td>
                            <button class="btn-edit"   onclick="editTeacher(${t.id})"><i class="fas fa-edit"></i></button>
                            <button class="btn-reset"  onclick="resetTeacherAccess(${t.id})" title="Restablecer acceso"><i class="fas fa-key"></i></button>
                            <button class="btn-danger" onclick="deleteTeacher(${t.id})"><i class="fas fa-trash"></i></button>
                         </td>
                     </tr>
                `;
            }).join('')
            : '<tr class="empty-row"><td colspan="8">No hay profesores</td></tr>';
    }
    renderServerPagination('professorPagination', currentProfessorPage, totalPages, professorTotal, perPage, 'changeProfessorPage');
}

function openProfessorModal() {
    document.getElementById('professorForm').reset();
    document.getElementById('professorId').value = '';
    document.getElementById('professorPassword').value = generatePassword();
    originalTeacherPassword = '';
    document.getElementById('professorPassword').readOnly = true;
    document.getElementById('professorPassword').classList.remove('password-editable');
    openModal('professorModal');
}

function editTeacher(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;
    document.getElementById('professorId').value = t.id;
    document.getElementById('professorIdentificacion').value = t.identificacion || '';
    originalTeacherPassword = t.initialPassword || generatePassword();
    document.getElementById('professorPassword').value = originalTeacherPassword;
    document.getElementById('professorPassword').readOnly = true;
    document.getElementById('professorPassword').classList.remove('password-editable');
    document.getElementById('professorFirstName').value = t.firstName || '';
    document.getElementById('professorLastName').value = t.lastName || '';
    document.getElementById('professorEmail').value = t.email;
    document.getElementById('professorSpecialty').value = t.specialty;
    openModal('professorModal');
}

async function deleteTeacher(id) {
    if (!await confirmDelete('Las materias quedarán sin profesor')) return;
    try {
        const res = await apiFetch('/profesores/delete.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.ok) {
            invalidateTeachersCache();
            await loadProfessorsPage();
            await loadSubjectsPage();
            addActivity(`Eliminó profesor ID ${id}`);
            showToast('Profesor eliminado');
        } else {
            const json = await res.json();
            Swal.fire('Error', json.error || 'No se pudo eliminar', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
}

async function resetTeacherAccess(id) {
    const t = teachers.find(t => t.id === id);
    if (!t) return;

    const result = await Swal.fire({
        title: '¿Restablecer acceso?',
        html: `Se generará una nueva contraseña para <strong>${escapeHtml(t.name)}</strong>.<br>Deberá cambiar su contraseña y configurar sus preguntas de seguridad nuevamente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#8B0000',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Sí, restablecer'
    });
    if (!result.isConfirmed) return;

    const newPassword = generatePassword();
    const payload = {
        id: t.id, name: t.name, email: t.email, identificacion: t.identificacion,
        specialty: t.specialty, initialPassword: newPassword
    };

    try {
        const res = await apiFetch('/profesores/', { method: 'PUT', body: JSON.stringify(payload) });
        if (res.ok) {
            addActivity(`Restableció acceso de ${t.name}`);
            await loadProfessorsPage();
            Swal.fire({
                title: 'Acceso restablecido',
                html: `Nueva contraseña inicial:<br><span class="password-display-full">${escapeHtml(newPassword)}</span>`,
                icon: 'success',
                confirmButtonColor: '#8B0000'
            });
        } else {
            const json = await res.json();
            Swal.fire('Error', json.error || 'No se pudo restablecer el acceso', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
}

document.getElementById('professorForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('professorId').value;
    const password = document.getElementById('professorPassword').value.trim();

    if (password.length < 6) {
        Swal.fire('Error', 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    const teacher = {
        ...(id ? { id: parseInt(id) } : {}),
        firstName: document.getElementById('professorFirstName').value.trim(),
        lastName: document.getElementById('professorLastName').value.trim(),
        email: document.getElementById('professorEmail').value,
        identificacion: document.getElementById('professorIdentificacion').value.trim(),
        specialty: document.getElementById('professorSpecialty').value,
        ...((!id || password !== originalTeacherPassword) ? { initialPassword: password } : {})
    };
    try {
        const res = await apiFetch('/profesores/', { method: id ? 'PUT' : 'POST', body: JSON.stringify(teacher) });
        if (res.ok) {
            invalidateTeachersCache();
            showToast(id ? 'Profesor actualizado' : 'Profesor creado');
            addActivity(id ? `Editó ${teacher.firstName} ${teacher.lastName}` : `Agregó ${teacher.firstName} ${teacher.lastName}`);
            await loadProfessorsPage();
            closeModal('professorModal');
        } else {
            const json = await res.json();
            Swal.fire('Error', json.error || 'No se pudo guardar', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
});

// ==================== MATERIAS ====================
function renderSubjects() {
    const totalPages = Math.ceil(subjectTotal / perPage);
    const tbody = document.getElementById('subjectsTable');
    if (tbody) {
        tbody.innerHTML = subjects.length
            ? subjects.map(s => {
                const teacher = (allTeachersCache || teachers).find(t => t.id === parseInt(s.teacherId));
                const teacherName = s.teacherName || (teacher ? teacher.name : null);
                return `
                    <tr>
                        <td>${s.id}</td>
                        <td>${escapeHtml(s.code)}</td>
                        <td>${escapeHtml(s.name)}</td>
                        <td>${escapeHtml(s.credits)}</td>
                        <td>${teacherName ? escapeHtml(teacherName) : 'Sin asignar'}</td>
                        <td>
                            <button class="btn-edit"   onclick="editSubject(${s.id})"><i class="fas fa-edit"></i></button>
                            <button class="btn-danger" onclick="deleteSubject(${s.id})"><i class="fas fa-trash"></i></button>
                         </td>
                     </tr>
                `;
            }).join('')
            : '<tr class="empty-row"><td colspan="6">No hay materias</td></tr>';
    }
    renderServerPagination('subjectPagination', currentSubjectPage, totalPages, subjectTotal, perPage, 'changeSubjectPage');
}

async function openSubjectModal() {
    document.getElementById('subjectForm').reset();
    document.getElementById('subjectId').value = '';
    document.getElementById('subjectCredits').value = 3;
    document.getElementById('subjectTeacherSearch').value = '';

    const selProf = document.getElementById('subjectTeacher');
    selProf.innerHTML = '<option value="">Cargando profesores...</option>';

    openModal('subjectModal');

    await new Promise(r => setTimeout(r, 50));

    try {
        const profesores = await getAllTeachers();
        montarBuscadorProfesores(BUSCADOR_PROFESOR, profesores, null);
    } catch (error) {
        Swal.fire('Error', 'No se pudieron cargar los profesores: ' + error.message, 'error');
    }
}

async function editSubject(id) {
    const s = subjects.find(s => s.id === id);
    if (!s) return;

    document.getElementById('subjectId').value = s.id;
    document.getElementById('subjectCode').value = s.code;
    document.getElementById('subjectName').value = s.name;
    document.getElementById('subjectCredits').value = s.credits;
    document.getElementById('subjectTeacherSearch').value = '';

    const selProf = document.getElementById('subjectTeacher');
    selProf.innerHTML = '<option value="">Cargando profesores...</option>';

    openModal('subjectModal');

    await new Promise(r => setTimeout(r, 50));

    try {
        const profesores = await getAllTeachers();
        montarBuscadorProfesores(BUSCADOR_PROFESOR, profesores, s.teacherId);
    } catch (error) {
        Swal.fire('Error', 'No se pudieron cargar los profesores: ' + error.message, 'error');
    }
}

async function deleteSubject(id) {
    if (!await confirmDelete('Se eliminarán las matrículas asociadas')) return;
    try {
        let res = await apiFetch('/materias/delete.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        let json = await res.json();

        if (res.status === 409 && json.details?.requiresConfirmation === 'comentarios') {
            if (!await confirmDelete(json.error)) return;
            res = await apiFetch('/materias/delete.php', { method: 'DELETE', body: JSON.stringify({ id, confirmar_comentarios: true }) });
            json = await res.json();
        }

        if (res.ok) {
            await loadSubjectsPage();
            await loadEnrollmentsPage();
            addActivity(`Eliminó materia ID ${id}`);
            showToast('Materia eliminada');
        } else {
            Swal.fire('Error', json.error || 'No se pudo eliminar', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
}

document.getElementById('subjectForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('subjectId').value;
    const teacherId = document.getElementById('subjectTeacher').value;
    const subject = {
        ...(id ? { id: parseInt(id) } : {}),
        code: document.getElementById('subjectCode').value,
        name: document.getElementById('subjectName').value,
        credits: parseInt(document.getElementById('subjectCredits').value),
        teacherId: teacherId ? parseInt(teacherId) : null
    };
    try {
        const res = await apiFetch('/materias/', { method: id ? 'PUT' : 'POST', body: JSON.stringify(subject) });
        if (res.ok) {
            showToast(id ? 'Materia actualizada' : 'Materia creada');
            addActivity(id ? `Editó ${subject.name}` : `Agregó ${subject.name}`);
            await loadSubjectsPage();
            closeModal('subjectModal');
        } else {
            const json = await res.json();
            Swal.fire('Error', json.error || 'No se pudo guardar', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
});

// ==================== MATRÍCULAS ====================
function renderEnrollments() {
    const totalPages = Math.ceil(enrollmentTotal / perPage);
    const tbody = document.getElementById('enrollmentsTable');
    if (tbody) {
        tbody.innerHTML = enrollments.length
            ? enrollments.map((e, i) => `
                <tr>
                    <td>${((currentEnrollmentPage - 1) * perPage) + i + 1}</td>
                    <td><strong>${escapeHtml(e.studentName)}</strong><br><small class="badge">${escapeHtml(e.studentGrade) || '—'}</small></td>
                    <td>${escapeHtml(e.subjectName)}</td>
                    <td>${escapeHtml(e.teacherName || 'Sin asignar')}</td>
                    <td>${escapeHtml(e.enrollmentDate) || '—'}</td>
                    <td><button class="btn-danger" onclick="deleteEnrollment(${e.id})"><i class="fas fa-trash"></i></button></td>
                 </tr>
            `).join('')
            : '<tr class="empty-row"><td colspan="6">No hay matrículas</td></tr>';
    }
    renderServerPagination('enrollmentPagination', currentEnrollmentPage, totalPages, enrollmentTotal, perPage, 'changeEnrollmentPage');
}

async function deleteEnrollment(id) {
    const enrollment = enrollments.find(e => e.id === id);
    const result = await Swal.fire({
        title: '¿Eliminar matrícula?',
        html: `Estás por eliminar la matrícula de <strong>${escapeHtml(enrollment?.studentName)}</strong> en <strong>${escapeHtml(enrollment?.subjectName)}</strong>`,
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#8B0000',
        confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
        try {
            const res = await apiFetch('/matriculas/', { method: 'DELETE', body: JSON.stringify({ id }) });
            if (res.ok) {
                await loadEnrollmentsPage();
                updateStats();
                addActivity(`Eliminó matrícula ID ${id}`);
                showToast('Matrícula eliminada');
            } else {
                const json = await res.json();
                Swal.fire('Error', json.error || 'No se pudo eliminar', 'error');
            }
        } catch (error) { Swal.fire('Error', error.message, 'error'); }
    }
}

let matriculaMaterias = [];
const matriculaSel = new Set();

function pintarMateriasMatricula() {
    const q = normalizarTexto(document.getElementById('enrollmentSubjectSearch').value);
    const cont = document.getElementById('enrollmentSubjectList');
    const lista = matriculaMaterias.filter(m =>
        !q || normalizarTexto(m.name).includes(q) || normalizarTexto(m.code).includes(q));

    cont.innerHTML = lista.length
        ? lista.map(m => `
            <label class="check-item">
                <input type="checkbox" value="${m.id}" ${matriculaSel.has(String(m.id)) ? 'checked' : ''}>
                <span>${escapeHtml(m.name)} (${escapeHtml(m.code)})</span>
            </label>`).join('')
        : '<div class="check-empty">Sin resultados</div>';

    document.getElementById('enrollmentSubjectCount').textContent =
        `${matriculaSel.size} materia(s) seleccionada(s)`;
}

async function openEnrollmentModal() {
    document.getElementById('enrollmentForm').reset();
    matriculaSel.clear();
    matriculaMaterias = [];
    const cont = document.getElementById('enrollmentSubjectList');
    cont.innerHTML = '<div class="check-empty">Cargando materias...</div>';
    document.getElementById('enrollmentSubjectCount').textContent = '';
    openModal('enrollmentModal');

    try {
        montarBuscadorEstudiantes(BUSCADOR_MATRICULA);
    } catch (error) {
        console.error('Buscador de estudiantes:', error);
        const count = document.getElementById('enrollmentStudentCount');
        if (count) count.textContent = 'Error al iniciar el buscador: ' + error.message;
    }

    cont.onchange = (e) => {
        if (e.target.type !== 'checkbox') return;
        if (e.target.checked) matriculaSel.add(e.target.value);
        else matriculaSel.delete(e.target.value);
        document.getElementById('enrollmentSubjectCount').textContent =
            `${matriculaSel.size} materia(s) seleccionada(s)`;
    };
    document.getElementById('enrollmentSubjectSearch').oninput = pintarMateriasMatricula;

    try {
        matriculaMaterias = await fetchAllPages('/materias/');
        pintarMateriasMatricula();
    } catch (error) {
        console.error('Materias:', error);
        cont.innerHTML = '<div class="check-empty">No se pudieron cargar las materias</div>';
        Swal.fire('Error', 'No se pudieron cargar las materias: ' + error.message, 'error');
    }
}

document.getElementById('enrollmentForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const studentId = parseInt(document.getElementById('enrollmentStudent').value);
    const subjectIds = [...matriculaSel].map(Number);

    if (!studentId || subjectIds.length === 0) {
        Swal.fire('Error', 'Selecciona un estudiante y al menos una materia', 'error');
        return;
    }

    try {
        const res = await apiFetch('/matriculas/', { method: 'POST', body: JSON.stringify({ studentId, subjectIds }) });
        const json = await res.json();
        if (res.ok) {
            const { created = 0, skipped = 0 } = json.data ?? {};
            await loadEnrollmentsPage();
            updateStats();
            addActivity(`Matriculó ${created} materia(s)`);
            showToast(skipped > 0
                ? `${created} creada(s), ${skipped} ya existía(n)`
                : `${created} matrícula(s) creada(s)`);
            closeModal('enrollmentModal');
        } else {
            Swal.fire('Error', json.error || 'No se pudo crear', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
});

// ==================== CAMBIO CONTRASEÑA ====================
document.getElementById('changePasswordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const actual = document.getElementById('cpActual').value;
    const nueva = document.getElementById('cpNueva').value;
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
        const res = await apiFetch('/auth/cambiar_password.php', {
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

        currentActiveView = (view === 'users') ? currentUserTab : view;

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}View`).classList.add('active');

        if (view === 'enrollments') loadEnrollmentsPage();
        if (view === 'users') {
            loadStudentsPage();
            loadProfessorsPage();
        }
        if (view === 'subjects') loadSubjectsPage();
        if (view === 'reports') loadReportsPage();
        if (view === 'periods') loadPeriodsPage();
    });
});

// Tabs internos de "Usuarios"
document.querySelectorAll('.user-tab-btn').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.user-tab-btn').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.user-tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${this.dataset.usertab}View`).classList.add('active');

        currentUserTab = this.dataset.usertab;
        currentActiveView = currentUserTab;

        if (currentUserTab === 'students') renderStudents();
        else renderTeachers();
    });
});

// ==================== BUSCADOR DE ESTUDIANTES (búsqueda en servidor) ====================
// No precarga la lista: cada filtro/escritura consulta al backend (50 resultados máx.).
const BUSCADOR_REPORTES = {
    grade: 'reportGradeSelect', section: 'reportSectionFilter', search: 'reportStudentSearch',
    select: 'reportStudentSelect', count: 'reportStudentCount',
    placeholder: '— Ninguno (sin estudiante) —', enlazado: false, timer: null, reqId: 0
};

const BUSCADOR_MATRICULA = {
    grade: 'enrollmentGradeFilter', section: 'enrollmentSectionFilter', search: 'enrollmentStudentSearch',
    select: 'enrollmentStudent', count: 'enrollmentStudentCount',
    placeholder: '-- Seleccionar Estudiante --', enlazado: false, timer: null, reqId: 0
};

const MAX_OPCIONES_ESTUDIANTES = 100;      // lo sigue usando el buscador de profesores
const RESULTADOS_POR_BUSQUEDA = 50;

function montarBuscadorEstudiantes(cfg) {
    if (!cfg.enlazado) {
        document.getElementById(cfg.grade).addEventListener('change', async () => {
            await cargarSecciones(cfg);
            buscarEstudiantes(cfg);
        });
        document.getElementById(cfg.section).addEventListener('change', () => buscarEstudiantes(cfg));
        document.getElementById(cfg.search).addEventListener('input', () => {
            clearTimeout(cfg.timer);
            cfg.timer = setTimeout(() => buscarEstudiantes(cfg), 300); // espera a que dejes de escribir
        });
        cfg.enlazado = true;
    }
    cargarSecciones(cfg);
    buscarEstudiantes(cfg);
}

async function cargarSecciones(cfg) {
    const grado  = document.getElementById(cfg.grade).value;
    const selSec = document.getElementById(cfg.section);
    const actual = selSec.value;
    try {
        const secciones = await apiGet(`/estudiantes/?secciones=1&grado=${encodeURIComponent(grado)}`);
        selSec.innerHTML = '<option value="">Todas las secciones</option>' +
            secciones.map(s => `<option value="${escapeHtml(s)}">Sección ${escapeHtml(s)}</option>`).join('');
        if (secciones.includes(actual)) selSec.value = actual;
    } catch (e) {
        // si falla, queda "Todas las secciones"
        console.warn('No se pudieron cargar secciones:', e.message);
    }
}

async function buscarEstudiantes(cfg) {
    const id     = ++cfg.reqId;                    // descarta respuestas viejas
    const sel    = document.getElementById(cfg.select);
    const count  = document.getElementById(cfg.count);
    const previo = sel.value;

    const params = new URLSearchParams({
        page: 1,
        per_page: RESULTADOS_POR_BUSQUEDA,
        search: document.getElementById(cfg.search).value.trim(),
        grado: document.getElementById(cfg.grade).value,
        seccion: document.getElementById(cfg.section).value
    });

    try {
        const data = await apiGet(`/estudiantes/?${params}`);
        if (id !== cfg.reqId) return; // llegó tarde: ya hay una búsqueda más reciente

        const items = data.items ?? [];
        sel.innerHTML = `<option value="">${escapeHtml(cfg.placeholder)}</option>` +
            items.map(e =>
                `<option value="${e.id}">${escapeHtml(e.name)} · ${escapeHtml(e.identificacion || 's/id')} · ` +
                `${escapeHtml(e.grade || 'Sin grado')}${e.seccion ? ' ' + escapeHtml(e.seccion) : ''}</option>`
            ).join('');
        if (previo && items.some(e => String(e.id) === previo)) sel.value = previo;
                if (cfg === BUSCADOR_REPORTES) actualizarVistaPreviaReporte();

        const total = data.total ?? items.length;
        count.textContent = total === 0
            ? 'Sin resultados con esos filtros'
            : total > items.length
                ? `Mostrando ${items.length} de ${total}. Escribe o usa los filtros para acotar.`
                : `${total} estudiante(s)`;
    } catch (error) {
        if (id === cfg.reqId) count.textContent = 'No se pudo buscar: ' + error.message;
    }
}

// ==================== BUSCADOR DE PROFESORES (modal Materias) ====================
let allTeachersCache = null;

async function getAllTeachers(force = false) {
    if (!force && allTeachersCache) return allTeachersCache;
    allTeachersCache = await fetchAllPages('/profesores/');
    return allTeachersCache;
}

let allSubjectsCache = null;

async function getAllSubjects(force = false) {
    if (!force && allSubjectsCache) return allSubjectsCache;
    allSubjectsCache = await fetchAllPages('/materias/');
    return allSubjectsCache;
}

function invalidateTeachersCache() {
    allTeachersCache = null;
}

const BUSCADOR_PROFESOR = {
    search: 'subjectTeacherSearch',
    select: 'subjectTeacher',
    count: 'subjectTeacherCount',
    placeholder: '-- Ninguno --',
    lista: [],
    enlazado: false,
    seleccionado: null
};

function montarBuscadorProfesores(cfg, profesores, seleccionadoId = null) {
    cfg.lista = profesores;
    cfg.seleccionado = seleccionadoId ? String(seleccionadoId) : null;
    if (!cfg.enlazado) {
        document.getElementById(cfg.search)?.addEventListener('input', () => refrescarListaProfesores(cfg));
        document.getElementById(cfg.select)?.addEventListener('change', () => {
            cfg.seleccionado = document.getElementById(cfg.select).value || null;
        });
        cfg.enlazado = true;
    }
    refrescarListaProfesores(cfg);
}

function refrescarListaProfesores(cfg) {
    const texto  = normalizarTexto(document.getElementById(cfg.search).value);
    const sel    = document.getElementById(cfg.select);
    const previo = cfg.seleccionado || sel.value;

    const filtrados = cfg.lista.filter(p => {
        if (!texto) return true;
        return normalizarTexto(p.name).includes(texto) ||
               normalizarTexto(p.identificacion).includes(texto) ||
               normalizarTexto(p.email).includes(texto) ||
               normalizarTexto(p.specialty).includes(texto);
    });

    let mostrados = filtrados.slice(0, MAX_OPCIONES_ESTUDIANTES);

    // Incluir siempre el profesor seleccionado aunque no entre en el corte,
    // para que al editar una materia no se pierda el profesor asignado.
    if (previo && !mostrados.some(p => String(p.id) === String(previo))) {
        const selProf = cfg.lista.find(p => String(p.id) === String(previo));
        if (selProf) mostrados = [selProf, ...mostrados];
    }

    sel.innerHTML = `<option value="">${escapeHtml(cfg.placeholder)}</option>` +
        mostrados.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)} · ${escapeHtml(p.identificacion || 's/id')} · ${escapeHtml(p.specialty || 'Sin especialidad')}</option>`
        ).join('');

    if (previo && mostrados.some(p => String(p.id) === String(previo))) sel.value = previo;

    const count = document.getElementById(cfg.count);
    if (count) {
        count.textContent = filtrados.length === 0
            ? 'Sin resultados'
            : filtrados.length > MAX_OPCIONES_ESTUDIANTES
                ? `Mostrando ${MAX_OPCIONES_ESTUDIANTES} de ${filtrados.length}. Usa la búsqueda para acotar.`
                : `${filtrados.length} profesor(es)`;
    }
}

// ==================== REPORTES (ADMIN) ====================
// Trae todas las páginas de un endpoint paginado en paralelo (más rápido)
async function fetchAllPages(endpoint) {
    const first = await apiGet(`${endpoint}?page=1&per_page=100`);
    let all = first.items ?? first;
    const totalPages = first.total_pages ?? 1;
    if (totalPages > 1) {
        const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
                apiGet(`${endpoint}?page=${i + 2}&per_page=100`))
        );
        rest.forEach(r => { all = all.concat(r.items ?? r); });
    }
    return all;
}

async function loadReportsPage() {
    // Buscador aislado: si falla, no bloquea la carga de materias
    try {
        montarBuscadorEstudiantes(BUSCADOR_REPORTES);
    } catch (error) {
        console.error('Buscador de reportes:', error);
        const count = document.getElementById('reportStudentCount');
        if (count) count.textContent = 'Error al iniciar el buscador: ' + error.message;
    }

        const sel = document.getElementById('reportSubjectSelect');
        sel.innerHTML = '<option value="">Cargando materias...</option>';
    try {
        const materias = await fetchAllPages('/materias/');
        montarBuscadorMaterias('reportSubjectSelect', 'reportSubjectSearch', materias,
            '— Ninguna —', actualizarVistaPreviaReporte);
    } catch (error) {
        console.error('Materias:', error);
        sel.innerHTML = '<option value="">No se pudieron cargar las materias</option>';
        Swal.fire('Error', 'No se pudieron cargar las materias: ' + error.message, 'error');
    }
    ['reportStudentSelect', 'reportGradeSelect', 'reportSectionFilter'].forEach(id => {
        document.getElementById(id).onchange = actualizarVistaPreviaReporte;
    });
        actualizarVistaPreviaReporte();
}

async function exportarReporteAdmin() {
    const estudianteId = document.getElementById('reportStudentSelect').value || null;
    const materiaId    = document.getElementById('reportSubjectSelect').value || null;
    const grado        = document.getElementById('reportGradeSelect').value || null;
    const seccion      = document.getElementById('reportSectionFilter').value || null;

    if (!estudianteId && !materiaId) {
        Swal.fire('Falta información', 'Elige al menos un estudiante o una materia.', 'warning');
        return;
    }

    const trimestre = await elegirTrimestreExportacion();
    if (trimestre === null) return;

    const format = await elegirFormatoExportacion();
    if (!format) return;

    await exportarReporte({
        format,
        estudiante_id: estudianteId || undefined,
        materia_id: materiaId || undefined,
        grado: (!estudianteId && grado) ? grado : undefined,
        seccion: (!estudianteId && seccion) ? seccion : undefined,
        trimestre: trimestre === 'TODOS' ? undefined : trimestre
    });
}

function montarBuscadorMaterias(selectId, searchId, materias, placeholder, onChange) {
    const sel = document.getElementById(selectId);
    const inp = document.getElementById(searchId);
    inp.value = '';
    const pintar = () => {
        const q = normalizarTexto(inp.value);
        const previo = sel.value;
        const lista = materias.filter(m =>
            !q || normalizarTexto(m.name).includes(q) || normalizarTexto(m.code).includes(q));
        sel.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` +
            lista.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.code)})</option>`).join('');
        if (previo && lista.some(m => String(m.id) === previo)) sel.value = previo;
        if (onChange) onChange();
    };
    inp.oninput = pintar;
    sel.onchange = () => { if (onChange) onChange(); };
    pintar();
}

function actualizarVistaPreviaReporte() {
    const est = document.getElementById('reportStudentSelect');
    const mat = document.getElementById('reportSubjectSelect');
    const grado = document.getElementById('reportGradeSelect').value;
    const sec = document.getElementById('reportSectionFilter').value;
    const estTxt = est.value ? est.options[est.selectedIndex].text.split(' · ')[0] : null;
    const matTxt = mat.value ? mat.options[mat.selectedIndex].text : null;

    let txt;
    if (estTxt && matTxt) txt = `Reporte individual de ${estTxt} en ${matTxt}`;
    else if (estTxt) txt = `Boletín completo de ${estTxt}`;
    else if (matTxt) txt = `Reporte grupal de ${matTxt} — ${grado || 'todos los grados'}${sec ? ' sección ' + sec : ''}`;
    else txt = 'Elige un estudiante o una materia para exportar';

    document.getElementById('reportPreview').textContent = txt;
}
async function loadPeriodsPage() {
    const cont = document.getElementById('periodsList');
    cont.innerHTML = '<div class="check-empty">Cargando períodos...</div>';
    try {
        periods = await apiGet('/periodos/');
        renderPeriods();
    } catch (error) {
        cont.innerHTML = '<div class="check-empty">No se pudieron cargar los períodos</div>';
        Swal.fire('Error', error.message, 'error');
    }
}

function renderPeriods() {
    const cont = document.getElementById('periodsList');
    cont.innerHTML = periods.map(p => `
        <div class="period-card ${p.abierto ? 'open' : 'closed'}">
            <div class="period-card-header">
                <span class="period-title"><i class="fas fa-calendar-alt"></i> ${escapeHtml(p.trimestre)}</span>
                <span class="period-badge ${p.abierto ? 'open' : 'closed'}">${p.abierto ? 'Abierto' : 'Cerrado'}</span>
            </div>
            <div class="period-dates">
                <div class="form-group">
                    <label>Inicio</label>
                    <input type="date" id="pInicio_${p.id}" value="${escapeHtml(p.fecha_inicio || '')}">
                </div>
                <div class="form-group">
                    <label>Fin</label>
                    <input type="date" id="pFin_${p.id}" value="${escapeHtml(p.fecha_fin || '')}">
                </div>
            </div>
            <div class="period-actions">
                <button class="btn-edit" onclick="guardarFechasPeriodo('${escapeHtml(p.trimestre)}', ${p.id})">
                    <i class="fas fa-save"></i> Guardar fechas
                </button>
                <button class="${p.abierto ? 'btn-danger' : 'btn-primary'}" onclick="cambiarEstadoPeriodo('${escapeHtml(p.trimestre)}', ${p.abierto ? "'cerrado'" : "'abierto'"})">
                    ${p.abierto ? '<i class="fas fa-lock"></i> Cerrar' : '<i class="fas fa-lock-open"></i> Abrir'}
                </button>
            </div>
        </div>
    `).join('');
}

async function actualizarPeriodo(payload, mensajeOk, actividad) {
    try {
        const res = await apiFetch('/periodos/', { method: 'PUT', body: JSON.stringify(payload) });
        const json = await res.json();
        if (res.ok) {
            periods = json.data ?? json;
            renderPeriods();
            showToast(mensajeOk);
            addActivity(actividad);
        } else {
            Swal.fire('Error', json.error || 'No se pudo actualizar el período', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
}

async function cambiarEstadoPeriodo(trimestre, estado) {
    if (estado === 'cerrado') {
        const r = await Swal.fire({
            title: `¿Cerrar ${trimestre}?`,
            text: 'Los profesores no podrán registrar, editar ni eliminar notas de este trimestre.',
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#8B0000', cancelButtonColor: '#aaa',
            confirmButtonText: 'Sí, cerrar', cancelButtonText: 'Cancelar'
        });
        if (!r.isConfirmed) return;
    }
    await actualizarPeriodo({ trimestre, estado },
        estado === 'cerrado' ? 'Trimestre cerrado' : 'Trimestre abierto',
        `${estado === 'cerrado' ? 'Cerró' : 'Abrió'} el ${trimestre}`);
}

async function guardarFechasPeriodo(trimestre, id) {
    const inicio = document.getElementById('pInicio_' + id).value;
    const fin    = document.getElementById('pFin_' + id).value;
    await actualizarPeriodo(
        { trimestre, fecha_inicio: inicio || null, fecha_fin: fin || null },
        'Fechas guardadas', `Actualizó fechas del ${trimestre}`);
}