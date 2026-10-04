<?php require_once '../api/config/verificar_sesion_pagina.php'; verificarSesionPagina('admin'); ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin — Gestión Escolar</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap"
        rel="stylesheet">
    <!-- SweetAlert + Font Awesome para mejor UX -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="css/admin.css">
</head>

<body>
    <div class="app-container">
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo"> Administrador</div>
                <div class="user-info">
                    <span class="user-avatar"><i class="fas fa-user-tie"></i></span>
                    <span id="adminName">Admin</span>
                </div>
            </div>
            <nav class="nav-menu">
                <button class="nav-btn active" data-view="dashboard"><i class="fas fa-chart-line"></i> <span>
                        Dashboard</span></button>
                <button class="nav-btn" data-view="students"><i class="fas fa-user-graduate"></i> <span>
                        Estudiantes</span></button>
                <button class="nav-btn" data-view="professors"><i class="fas fa-chalkboard-user"></i> <span>
                        Profesores</span></button>
                <button class="nav-btn" data-view="subjects"><i class="fas fa-book"></i> <span> Materias</span></button>
                <button class="nav-btn" data-view="enrollments"><i class="fas fa-list-check"></i> <span>
                        Matrículas</span></button>
            </nav>

            <!-- Botón de cambiar contraseña: SIN clase nav-btn para no interferir con la navegación -->
            <button class="btn-cambiar-pass" onclick="openModal('changePasswordModal')">
                <i class="fas fa-key"></i> <span> Cambiar contraseña</span> </button>
            <a href="ayuda.html" class="btn-cambiar-pass" style="text-decoration:none;">
                <i class="fas fa-circle-question"></i> <span> Ayuda</span></a>
            <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> <span> Cerrar
                    sesión</span></button>
        </aside>

        <main class="main-content">
            <!-- Dashboard View -->
            <div id="dashboardView" class="view active">
                <h2 class="page-title"><i class="fas fa-chart-simple"></i> Dashboard</h2>
                <div class="stats-grid">
                    <div class="stat-card pink">
                        <div class="stat-icon"><i class="fas fa-user-graduate"></i></div>
                        <div>
                            <div class="stat-number" id="totalStudents">0</div>
                            <div class="stat-label">Estudiantes</div>
                        </div>
                    </div>
                    <div class="stat-card lavender">
                        <div class="stat-icon"><i class="fas fa-chalkboard-user"></i></div>
                        <div>
                            <div class="stat-number" id="totalTeachers">0</div>
                            <div class="stat-label">Profesores</div>
                        </div>
                    </div>
                    <div class="stat-card peach">
                        <div class="stat-icon"><i class="fas fa-book"></i></div>
                        <div>
                            <div class="stat-number" id="totalSubjects">0</div>
                            <div class="stat-label">Materias</div>
                        </div>
                    </div>
                    <div class="stat-card mint">
                        <div class="stat-icon"><i class="fas fa-clipboard-list"></i></div>
                        <div>
                            <div class="stat-number" id="totalEnrollments">0</div>
                            <div class="stat-label">Matrículas</div>
                        </div>
                    </div>
                </div>
                <div class="recent-section">
                    <h3><i class="fas fa-clock"></i> Actividad Reciente</h3>
                    <div class="activity-list" id="activityList"></div>
                </div>
            </div>

            <!-- Students View -->
            <div id="studentsView" class="view">
                <div class="view-header">
                    <h2 class="page-title"><i class="fas fa-user-graduate"></i> Estudiantes</h2><button
                        class="btn-primary" onclick="openStudentModal()">+ Agregar</button>
                </div>
                <div class="search-bar"><input type="text" id="searchStudent"
                        placeholder="Buscar por nombre, email o identificación..."></div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Identificación</th>
                                <th>Contraseña Inicial</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Grado</th>
                                <th>Sección</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="studentsTable"></tbody>
                    </table>
                </div>
                <div id="studentPagination" class="pagination"></div>
            </div>

            <!-- Professors View -->
            <div id="professorsView" class="view">
                <div class="view-header">
                    <h2 class="page-title"><i class="fas fa-chalkboard-user"></i> Profesores</h2><button
                        class="btn-primary" onclick="openProfessorModal()">+ Agregar</button>
                </div>
                <div class="search-bar"><input type="text" id="searchProfessor"
                        placeholder="Buscar por nombre, email o especialidad..."></div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Identificación</th>
                                <th>Contraseña Inicial</th>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Especialidad</th>
                                <th>Materias</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="professorsTable"></tbody>
                    </table>
                </div>
                <div id="professorPagination" class="pagination"></div>
            </div>

            <!-- Subjects View -->
            <div id="subjectsView" class="view">
                <div class="view-header">
                    <h2 class="page-title"><i class="fas fa-book"></i> Materias</h2><button class="btn-primary"
                        onclick="openSubjectModal()">+ Agregar</button>
                </div>
                <div class="search-bar"><input type="text" id="searchSubject"
                        placeholder="Buscar por código o nombre..."></div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Créditos</th>
                                <th>Profesor</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="subjectsTable"></tbody>
                    </table>
                </div>
                <div id="subjectPagination" class="pagination"></div>
            </div>

            <!-- Enrollments View - MEJORADA CON BÚSQUEDA Y PAGINACIÓN -->
            <div id="enrollmentsView" class="view">
                <div class="view-header">
                    <h2 class="page-title"><i class="fas fa-list-check"></i> Matrículas</h2>
                    <button class="btn-primary" onclick="openEnrollmentModal()"><i class="fas fa-plus"></i> Asignar
                        Materia</button>
                </div>

                <!-- Buscador para matrículas -->
                <div class="search-bar">
                    <label for="searchEnrollment">Buscar matrículas:</label>
                    <input type="text" id="searchEnrollment" aria-label="Buscar por nombre del estudiante o materia"
                        placeholder="Buscar por nombre del estudiante o materia...">
                </div>

                <!-- Tabla de matrículas -->
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th><i class="fas fa-user-graduate"></i> Estudiante</th>
                                <th><i class="fas fa-book"></i> Materia</th>
                                <th><i class="fas fa-chalkboard-user"></i> Profesor</th>
                                <th><i class="fas fa-calendar-alt"></i> Fecha</th>
                                <th><i class="fas fa-cog"></i> Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="enrollmentsTable"></tbody>
                    </table>
                </div>

                <!-- Paginación para matrículas -->
                <div id="enrollmentPagination" class="pagination"></div>
            </div>

            <!-- Modales-->
            <div id="studentModal" class="modal">
                <div class="modal-content"><button type="button" class="close" onclick="closeModal('studentModal')"
                        aria-label="Cerrar modal" title="Cerrar">&times;</button>
                    <h3><i class="fas fa-user-graduate"></i> Estudiante</h3>
                    <form id="studentForm"><input type="hidden" id="studentId">
                        <div class="form-group"><label for="studentIdentificacion">Número de Identificación</label>
                            <input id="studentIdentificacion" placeholder="Ej: 1234567890" required>
                        </div>
                        <div class="form-group"><label for="studentPassword">Contraseña Inicial</label>
                            <div class="password-field-group"><input id="studentPassword" class="password-input"
                                    readonly placeholder="Se generará automáticamente"><button type="button"
                                    class="btn-pass-regen" onclick="regenPassword('studentPassword')"
                                    title="Regenerar"><i class="fas fa-sync-alt"></i></button><button type="button"
                                    class="btn-pass-edit" onclick="togglePasswordEdit('studentPassword')"
                                    title="Editar manualmente"><i class="fas fa-pencil-alt"></i></button></div>
                        </div>
                        <div class="form-group"><label for="studentName">Nombre</label><input id="studentName"
                                placeholder="Ej: Juan Pérez" required></div>
                        <div class="form-group"><label for="studentEmail">Email</label><input type="email"
                                id="studentEmail" placeholder="ejemplo@correo.com" required></div>
                        <div class="form-group"><label for="studentGrade">Grado</label>
                            <select id="studentGrade">
                                <option>7°</option>
                                <option>8°</option>
                                <option>9°</option>
                                <option>10°</option>
                                <option>11°</option>
                                <option>12°</option>
                            </select>
                        </div>
                        <div class="form-group"><label for="studentSeccion">Sección</label><input id="studentSeccion"
                                placeholder="Ej: A, B, C"></div>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </form>
                </div>
            </div>

            <div id="professorModal" class="modal">
                <div class="modal-content">
                    <button type="button" class="close" onclick="closeModal('professorModal')" aria-label="Cerrar modal"
                        title="Cerrar">&times;</button>
                    <h3><i class="fas fa-chalkboard-user"></i> Profesor</h3>
                    <form id="professorForm">
                        <input type="hidden" id="professorId">

                        <div class="form-group">
                            <label for="professorIdentificacion">Número de Identificación</label>
                            <input id="professorIdentificacion" placeholder="Ej: 1234567890"
                                title="Número de identificación del profesor" required>
                        </div>

                        <div class="form-group">
                            <label for="professorPassword">Contraseña Inicial</label>
                            <div class="password-field-group">
                                <input id="professorPassword" class="password-input" readonly
                                    placeholder="Se generará automáticamente">
                                <button type="button" class="btn-pass-regen"
                                    onclick="regenPassword('professorPassword')" title="Regenerar"><i
                                        class="fas fa-sync-alt"></i></button>
                                <button type="button" class="btn-pass-edit"
                                    onclick="togglePasswordEdit('professorPassword')" title="Editar manualmente"><i
                                        class="fas fa-pencil-alt"></i></button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="professorName">Nombre</label>
                            <input id="professorName" placeholder="Ej: María López" title="Nombre completo del profesor"
                                required>
                        </div>

                        <div class="form-group">
                            <label for="professorEmail">Email</label>
                            <input type="email" id="professorEmail" placeholder="ejemplo@correo.com"
                                title="Correo electrónico" required>
                        </div>

                        <div class="form-group">
                            <label for="professorSpecialty">Especialidad</label>
                            <input id="professorSpecialty" placeholder="Ej: Matemáticas" title="Especialidad académica"
                                required>
                        </div>

                        <div class="form-group">
                            <label for="professorSubjects">Materias</label>
                            <select id="professorSubjects" multiple size="4" title="Seleccione las materias asignadas"
                                aria-label="Materias">
                            </select>
                            <small>Ctrl+clic para múltiples</small>
                        </div>

                        <button type="submit" class="btn-primary">Guardar</button>
                    </form>
                </div>
            </div>

            <div id="subjectModal" class="modal">
                <div class="modal-content">
                    <button type="button" class="close" onclick="closeModal('subjectModal')" aria-label="Cerrar"
                        title="Cerrar">&times;</button>
                    <h3>
                        <i class="fas fa-book"></i> Materia
                    </h3>
                    <form id="subjectForm"><input type="hidden" id="subjectId">
                        <div class="form-group">
                            <label for="subjectCode">Código</label>
                            <input id="subjectCode" placeholder="Ej: MAT101" required>
                        </div>
                        <div class="form-group"><label for="subjectName">Nombre</label>
                            <input id="subjectName" placeholder="Ej: Matemáticas 1" required>
                        </div>
                        <div class="form-group"><label for="subjectCredits">Créditos</label>
                            <input type="number" id="subjectCredits" value="3" placeholder="3"
                                title="Número de créditos">
                        </div>
                        <div class="form-group"><label for="subjectTeacher">Profesor</label><select id="subjectTeacher"
                                title="Selecciona un profesor">
                                <option value="">-- Ninguno --</option>
                            </select></div><button type="submit" class="btn-primary">Guardar</button>
                    </form>
                </div>
            </div>

            <div id="enrollmentModal" class="modal">
                <div class="modal-content"><span class="close" onclick="closeModal('enrollmentModal')">&times;</span>
                    <h3><i class="fas fa-clipboard-list"></i> Asignar Materia</h3>
                    <form id="enrollmentForm">
                        <div class="form-group"><label for="enrollmentStudent">Estudiante</label><select
                                id="enrollmentStudent" title="Seleccione un estudiante"></select></div>
                        <div class="form-group"><label for="enrollmentSubject">Materia</label><select
                                id="enrollmentSubject" title="Seleccione una materia"></select></div><button
                            type="submit" class="btn-primary">Asignar</button>
                    </form>
                </div>
            </div>

            <div id="changePasswordModal" class="modal">
                <div class="modal-content">
                    <button type="button" class="close" onclick="closeModal('changePasswordModal')"
                        aria-label="Cerrar">&times;</button>
                    <h3><i class="fas fa-key"></i> Cambiar Contraseña</h3>
                    <form id="changePasswordForm">
                        <div class="form-group">
                            <label for="cpActual">Contraseña actual</label>
                            <input type="password" id="cpActual" title="Contraseña actual"
                                placeholder="Ingresa tu contraseña actual" required>
                        </div>
                        <div class="form-group">
                            <label for="cpNueva">Nueva contraseña</label>
                            <input type="password" id="cpNueva" title="Nueva contraseña"
                                placeholder="Ingresa la nueva contraseña" required>
                        </div>
                        <div class="form-group">
                            <label for="cpConfirmar">Confirmar nueva contraseña</label>
                            <input type="password" id="cpConfirmar" title="Confirmar nueva contraseña"
                                placeholder="Confirma la nueva contraseña" required>
                        </div>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </form>
                </div>
            </div>


            <script src="js/api.js"></script>
            <script src="js/admin.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</body>
</html>