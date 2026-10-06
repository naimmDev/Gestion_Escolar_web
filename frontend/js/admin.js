/*
 * NOTA SOBRE CACHÉ DEL NAVEGADOR:
 *Si editas el archivo y los cambios no se aplican al recargar la página
 *(botones que siguen con el comportamiento viejo, lógica que no cambia) y 
 *ya revisaste que el archivo subido al servidor tiene los cambios, entonces
 *es probable que el navegador esté usando una copia cacheada del JS.
 *
 * Solución: en el <script> que carga el archivo, agrega o sube el parámetro
 * de versión, ej: js/ayuda.js?v=2 -> ?v=3
 * Cada valor distinto de "?v=" obliga al navegador a pedir el archivo de
 * nuevo al servidor en vez de usar el caché.
 *
 * Útil mientras se está desarrollando/ajustando el archivo seguido.
 * Una vez estable, no es necesario seguir subiéndolo.
 */

// ==================== VERIFICACIÓN DE SESIÓN ====================
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser || currentUser.rol !== 'admin') {
    window.location.href = 'index.html';
}

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
let currentUserTab = 'students';   // NUEVO: pestaña activa dentro de "Usuarios"

let studentSearch = '';
let professorSearch = '';
let subjectSearch = '';
let enrollmentSearch = '';

let studentTotal = 0;
let professorTotal = 0;
let subjectTotal = 0;
let enrollmentTotal = 0;

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
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
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
        .map(a => `<div class="activity-item"><i class="fas fa-circle-dot"></i> ${a.action} — ${a.date}</div>`)
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
                    <td><span class="badge password-badge">${escapeHtml(s.initialPassword || '—')}</span></td>
                    <td>${escapeHtml(s.name)}</td>
                    <td>${escapeHtml(s.email)}</td>
                    <td>${s.grade || '—'}</td>
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
    document.getElementById('studentName').value = s.name;
    document.getElementById('studentEmail').value = s.email;
    document.getElementById('studentGrade').value = s.grade;
    document.getElementById('studentSeccion').value = s.seccion || '';
    openModal('studentModal');
}

async function deleteStudent(id) {
    if (!await confirmDelete('El estudiante perderá sus matrículas')) return;
    try {
        const res = await apiFetch('/estudiantes/delete.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.ok) {
            await loadStudentsPage();
            await loadEnrollmentsPage();
            addActivity(`Eliminó estudiante ID ${id}`);
            showToast('Estudiante eliminado');
        } else {
            const json = await res.json();
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
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        identificacion: document.getElementById('studentIdentificacion').value.trim(),
        grade: document.getElementById('studentGrade').value,
              seccion: document.getElementById('studentSeccion').value.trim(),
        // Solo se envía si es alumno nuevo o el admin cambió la contraseña
        // (el backend resetea el acceso cuando recibe initialPassword)
        ...((!id || password !== originalStudentPassword) ? { initialPassword: password } : {})
    };
    try {
        const res = await apiFetch('/estudiantes/', { method: id ? 'PUT' : 'POST', body: JSON.stringify(student) });
        if (res.ok) {
            showToast(id ? 'Estudiante actualizado' : 'Estudiante creado');
            addActivity(id ? `Editó ${student.name}` : `Agregó ${student.name}`);
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
                const teacherSubjects = subjects
                    .filter(s => parseInt(s.teacherId) === t.id)
                    .map(s => s.name).join(', ') || 'Sin materias';
                return `
                    <tr>
                        <td>${((currentProfessorPage - 1) * perPage) + i + 1}</td>
                        <td>${escapeHtml(t.identificacion || '—')}</td>
                        <td><span class="badge password-badge">${escapeHtml(t.initialPassword || '—')}</span></td>
                        <td>${escapeHtml(t.name)}</td>
                        <td>${escapeHtml(t.email)}</td>
                        <td>${escapeHtml(t.specialty)}</td>
                        <td><span class="badge">${teacherSubjects.substring(0, 40)}${teacherSubjects.length > 40 ? '…' : ''}</span></td>
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
    document.getElementById('professorSubjects').innerHTML = subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
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
    document.getElementById('professorSubjects').innerHTML = subjects.map(s =>
        `<option value="${s.id}" ${t.subjectIds?.includes(s.id) ? 'selected' : ''}>${s.name}</option>`
    ).join('');
    document.getElementById('professorId').value = t.id;
    document.getElementById('professorIdentificacion').value = t.identificacion || '';
        originalTeacherPassword = t.initialPassword || generatePassword();
    document.getElementById('professorPassword').value = originalTeacherPassword;
    document.getElementById('professorPassword').readOnly = true;
    document.getElementById('professorPassword').classList.remove('password-editable');
    document.getElementById('professorName').value = t.name;
    document.getElementById('professorEmail').value = t.email;
    document.getElementById('professorSpecialty').value = t.specialty;
    openModal('professorModal');
}

async function deleteTeacher(id) {
    if (!await confirmDelete('Las materias quedarán sin profesor')) return;
    try {
        const res = await apiFetch('/profesores/delete.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.ok) {
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
        name: document.getElementById('professorName').value,
        email: document.getElementById('professorEmail').value,
        identificacion: document.getElementById('professorIdentificacion').value.trim(),
                specialty: document.getElementById('professorSpecialty').value,
        ...((!id || password !== originalTeacherPassword) ? { initialPassword: password } : {})
    };
    try {
        const res = await apiFetch('/profesores/', { method: id ? 'PUT' : 'POST', body: JSON.stringify(teacher) });
        if (res.ok) {
            showToast(id ? 'Profesor actualizado' : 'Profesor creado');
            addActivity(id ? `Editó ${teacher.name}` : `Agregó ${teacher.name}`);
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
                const teacher = teachers.find(t => t.id === parseInt(s.teacherId));
                return `
                    <tr>
                        <td>${s.id}</td>
                        <td>${escapeHtml(s.code)}</td>
                        <td>${escapeHtml(s.name)}</td>
                        <td>${s.credits}</td>
                        <td>${teacher ? escapeHtml(teacher.name) : 'Sin asignar'}</td>
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

function openSubjectModal() {
    document.getElementById('subjectTeacher').innerHTML =
        '<option value="">-- Ninguno --</option>' +
        teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    document.getElementById('subjectForm').reset();
    document.getElementById('subjectId').value = '';
    document.getElementById('subjectCredits').value = 3;
    openModal('subjectModal');
}

function editSubject(id) {
    const s = subjects.find(s => s.id === id);
    if (!s) return;
    document.getElementById('subjectTeacher').innerHTML =
        '<option value="">-- Ninguno --</option>' +
        teachers.map(t => `<option value="${t.id}" ${t.id === parseInt(s.teacherId) ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('');
    document.getElementById('subjectId').value = s.id;
    document.getElementById('subjectCode').value = s.code;
    document.getElementById('subjectName').value = s.name;
    document.getElementById('subjectCredits').value = s.credits;
    openModal('subjectModal');
}

async function deleteSubject(id) {
    if (!await confirmDelete('Se eliminarán las matrículas asociadas')) return;
    try {
        const res = await apiFetch('/materias/delete.php', { method: 'DELETE', body: JSON.stringify({ id }) });
        if (res.ok) {
            await loadSubjectsPage();
            await loadEnrollmentsPage();
            addActivity(`Eliminó materia ID ${id}`);
            showToast('Materia eliminada');
        } else {
            const json = await res.json();
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
                    <td><strong>${escapeHtml(e.studentName)}</strong><br><small class="badge">${e.studentGrade || '—'}</small></td>
                    <td>${escapeHtml(e.subjectName)}</td>
                    <td>${escapeHtml(e.teacherName || 'Sin asignar')}</td>
                    <td>${e.enrollmentDate || '—'}</td>
                    <td><button class="btn-danger" onclick="deleteEnrollment(${e.id})"><i class="fas fa-trash"></i></button></td>
                 </tr>
            `).join('')
            : '<tr class="empty-row"><td colspan="6">No hay matrículas</td></tr>';
    }
    renderServerPagination('enrollmentPagination', currentEnrollmentPage, totalPages, enrollmentTotal, perPage, 'changeEnrollmentPage');
    updateEnrollmentSelects();
}

function updateEnrollmentSelects() {
    const studentSelect = document.getElementById('enrollmentStudent');
    const subjectSelect = document.getElementById('enrollmentSubject');
    if (studentSelect) studentSelect.innerHTML =
        '<option value="">-- Seleccionar Estudiante --</option>' +
        students.map(s => `<option value="${s.id}">${escapeHtml(s.name)} — ${s.grade || ''}</option>`).join('');
    if (subjectSelect) subjectSelect.innerHTML =
        '<option value="">-- Seleccionar Materia --</option>' +
        subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)} (${s.code})</option>`).join('');
}

async function deleteEnrollment(id) {
    const enrollment = enrollments.find(e => e.id === id);
    const result = await Swal.fire({
        title: '¿Eliminar matrícula?',
        html: `Estás por eliminar la matrícula de <strong>${enrollment?.studentName}</strong> en <strong>${enrollment?.subjectName}</strong>`,
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

function openEnrollmentModal() {
    updateEnrollmentSelects();
    document.getElementById('enrollmentForm').reset();
    openModal('enrollmentModal');
}

document.getElementById('enrollmentForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const studentId = parseInt(document.getElementById('enrollmentStudent').value);
    const subjectId = parseInt(document.getElementById('enrollmentSubject').value);

    if (!studentId || !subjectId) {
        Swal.fire('Error', 'Selecciona un estudiante y una materia', 'error');
        return;
    }

    try {
        const res = await apiFetch('/matriculas/', { method: 'POST', body: JSON.stringify({ studentId, subjectId }) });
        if (res.ok) {
            await loadEnrollmentsPage();
            updateStats();
            addActivity(`Nueva matrícula creada`);
            showToast('Matrícula creada');
            closeModal('enrollmentModal');
        } else {
            const json = await res.json();
            Swal.fire('Error', json.error || 'No se pudo crear', 'error');
        }
    } catch (error) { Swal.fire('Error', error.message, 'error'); }
});

// ==================== CAMBIO CONTRASEÑA ====================
function openChangePasswordModal() {
    document.getElementById('changePasswordForm').reset();
    document.getElementById('changePasswordModal').style.display = 'flex';
}

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
        // Si el botón no tiene data-view, ignorar (evita error con otros botones del sidebar)
        if (!this.dataset.view) return;

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const view = this.dataset.view;

        // "users" agrupa estudiantes y profesores: la vista activa para el render
        // es la de la pestaña interna que esté seleccionada
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
    });
});

// Tabs internos de "Usuarios"
document.querySelectorAll('.user-tab-btn').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.user-tab-btn').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.user-tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${this.dataset.usertab}View`).classList.add('active');

        // Mantener sincronizado el estado para que el render y la paginación funcionen
        currentUserTab = this.dataset.usertab;
        currentActiveView = currentUserTab;

        // Los datos ya están cargados; solo se vuelve a pintar la tabla activa
        if (currentUserTab === 'students') renderStudents();
        else renderTeachers();
    });
});

// ==================== REPORTES (ADMIN) ====================
// Trae todas las páginas de un endpoint paginado (el backend limita per_page a 100)
async function fetchAllPages(endpoint) {
    let page = 1, totalPages = 1, all = [];
    do {
        const data = await apiGet(`${endpoint}?page=${page}&per_page=100`);
        all = all.concat(data.items ?? data);
        totalPages = data.total_pages ?? 1;
        page++;
    } while (page <= totalPages);
    return all;
}

async function loadReportsPage() {
    try {
        const [estudiantes, materias] = await Promise.all([
            fetchAllPages('/estudiantes/'),
            fetchAllPages('/materias/')
        ]);

        document.getElementById('reportStudentSelect').innerHTML =
            '<option value="">— Todos / no aplica —</option>' +
            estudiantes.map(e =>
                `<option value="${e.id}">${escapeHtml(e.name)} — ${escapeHtml(e.grade || 'Sin grado')}</option>`
            ).join('');

        document.getElementById('reportSubjectSelect').innerHTML =
            '<option value="">— Ninguna —</option>' +
            materias.map(m =>
                `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.code)})</option>`
            ).join('');
    } catch (error) {
        Swal.fire('Error', 'No se pudieron cargar las listas: ' + error.message, 'error');
    }
}

async function exportarReporteAdmin() {
    const estudianteId = document.getElementById('reportStudentSelect').value || null;
    const materiaId    = document.getElementById('reportSubjectSelect').value || null;
    const grado        = document.getElementById('reportGradeSelect').value || null;

    if (!estudianteId && !materiaId) {
        Swal.fire('Falta información', 'Elige al menos un estudiante o una materia.', 'warning');
        return;
    }

    const format = await elegirFormatoExportacion();
    if (!format) return;

    const trimestre = await elegirTrimestreExportacion();
    if (trimestre === null) return;

    await exportarReporte({
        format,
        estudiante_id: estudianteId || undefined,
        materia_id: materiaId || undefined,
        grado: (!estudianteId && grado) ? grado : undefined,
        trimestre: trimestre === 'TODOS' ? undefined : trimestre
    });
}