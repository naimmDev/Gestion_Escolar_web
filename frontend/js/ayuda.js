// ==================== CONTENIDO ====================
const AYUDA_COMUN = [
    { q: '¿Cómo inicio sesión en el sistema?', a: 'Ingrese su correo electrónico y contraseña en la pantalla de inicio, luego presione <strong>"Iniciar sesión"</strong>. Según su rol, el sistema lo redirigirá automáticamente a su panel correspondiente.' },
    { q: '¿Qué hago en mi primer ingreso al sistema?', a: 'El sistema le pedirá cambiar su contraseña inicial. Ingrese la contraseña actual (la asignada), la nueva contraseña (mínimo 6 caracteres), confírmela y presione <strong>"Guardar y continuar"</strong>. También puede presionar <strong>"Más tarde"</strong> para posponerlo.' },
    { q: '¿Para qué sirven las preguntas de seguridad?', a: 'Se usan para recuperar el acceso si olvida su contraseña. Debe seleccionar 3 preguntas distintas y responderlas, luego presionar <strong>"Guardar y continuar"</strong>.' },
    { q: '¿Cómo recupero mi contraseña si la olvidé?', a: 'Desde la pantalla de inicio de sesión, presione <strong>"¿Olvidaste tu contraseña?"</strong>, ingrese su número de identificación, responda la pregunta de seguridad que se le presente y defina su nueva contraseña.' },
    { q: '¿Cómo cambio mi contraseña desde mi panel?', a: 'Presione el botón <strong>"Cambiar contraseña"</strong> en el menú lateral, complete el formulario con su contraseña actual y la nueva, y presione <strong>"Guardar"</strong>.' },
    { q: '¿Qué pasa si fallo varias veces al iniciar sesión o al recuperar mi contraseña?', a: 'Tras <strong>5 intentos fallidos</strong> la cuenta se bloquea temporalmente por <strong>15 minutos</strong>. Pasado ese tiempo puede intentar de nuevo; si necesita acceso de inmediato, contacte al Administrador.' },
    { q: '¿Cómo cierro sesión?', a: 'Presione el botón <strong>"Cerrar sesión"</strong> en la parte inferior del menú lateral.' }
];

const AYUDA_ADMIN = [
    { q: '¿Qué muestra el Dashboard?', a: 'Un resumen general: total de estudiantes, profesores, materias y matrículas registradas, además de la actividad reciente de su sesión actual (se reinicia al recargar la página).' },
    { q: '¿Qué es la sección "Usuarios"?', a: 'Agrupa la gestión de estudiantes y profesores en un solo lugar. Al entrar en <strong>"Usuarios"</strong> verá dos pestañas: <strong>"Estudiantes"</strong> y <strong>"Profesores"</strong>. Cambie entre ellas para administrar cada tipo de usuario; cada pestaña tiene su propio buscador y paginación.' },
    { q: '¿Cómo registro un nuevo estudiante?', a: 'En el menú lateral seleccione <strong>"Usuarios"</strong>, abra la pestaña <strong>"Estudiantes"</strong> y presione <strong>"+ Agregar"</strong>. Complete identificación, nombre, correo, grado y sección. La contraseña inicial se genera automáticamente (puede regenerarla o editarla) y presione <strong>"Guardar"</strong>.' },
    { q: '¿Cómo busco, edito o elimino un estudiante?', a: 'En <strong>"Usuarios"</strong> → pestaña <strong>"Estudiantes"</strong>, use el campo de búsqueda para filtrar por nombre, correo o identificación. El ícono de lápiz edita los datos; el ícono de papelera elimina (no se permite si el estudiante tiene notas registradas, y si tiene comentarios se le pedirá confirmación).' },
    { q: '¿Cómo gestiono profesores?', a: 'En <strong>"Usuarios"</strong> → pestaña <strong>"Profesores"</strong>. El proceso es igual al de estudiantes: agregar, buscar, editar y eliminar, indicando nombre, identificación, correo y especialidad.' },
    { q: '¿Cómo creo o edito una materia?', a: 'Seleccione <strong>"Materias"</strong> → <strong>"+ Agregar"</strong> (código, nombre, créditos y profesor asignado). No se puede eliminar una materia con calificaciones registradas.' },
    { q: '¿Cómo matriculo a un estudiante en una o varias materias?', a: 'Seleccione <strong>"Matrículas"</strong> → <strong>"Asignar Materia"</strong>. Elija el estudiante (puede filtrar por grado, sección o buscar por nombre), marque <strong>una o varias materias</strong> (puede buscarlas por nombre o código) y presione <strong>"Asignar"</strong>. Las materias en las que ya estaba matriculado se omiten automáticamente.' },
    { q: '¿Qué es la sección "Reportes" y cómo exporto un reporte?', a: 'En <strong>"Reportes"</strong> puede descargar reportes de notas en PDF o Excel de cualquier estudiante o materia. Elija las opciones (estudiante, materia, y opcionalmente grado y sección) y presione <strong>"Exportar"</strong>; luego seleccione el trimestre (uno en particular o todos) y el formato (PDF o Excel). Debe elegir al menos un estudiante o una materia. Debajo del formulario se muestra una vista previa de qué reporte se va a generar.' },
    { q: '¿Qué reporte se genera según lo que elija en "Reportes"?', a: '<strong>Solo estudiante:</strong> boletín completo con todas sus materias. <strong>Estudiante y materia:</strong> reporte individual de ese estudiante en esa materia. <strong>Solo materia:</strong> reporte grupal de todos los matriculados; opcionalmente puede acotarlo a un grado y a una sección (ambos filtros solo aplican cuando no se elige estudiante).' },
    { q: '¿Cómo restablezco el acceso de un usuario que olvidó su contraseña y sus preguntas de seguridad?', a: 'En <strong>"Usuarios"</strong>, en la tabla de Estudiantes o Profesores, presione el botón <strong>"Restablecer acceso"</strong> (ícono de llave) junto al usuario. Se generará una nueva contraseña inicial y el usuario deberá repetir el cambio de contraseña y la configuración de preguntas de seguridad en su próximo ingreso, como si fuera un usuario nuevo.' } ,
    { q: '¿Cómo abro o cierro un trimestre?', a: 'En <strong>"Períodos"</strong> verá una tarjeta por trimestre. Presione <strong>"Cerrar"</strong> o <strong>"Abrir"</strong> para cambiar su estado. Un trimestre cerrado impide a los profesores registrar, editar o eliminar notas; la consulta y la exportación de reportes no se ven afectadas. Las fechas de inicio y fin son solo informativas: el cierre es siempre manual.' }
];

const AYUDA_PROFESOR = [
    { q: '¿Qué muestra mi Dashboard?', a: 'Un resumen de sus materias asignadas, el total de estudiantes a su cargo y la cantidad de notas registradas.' },
    { q: '¿Cómo veo mis materias?', a: 'En <strong>"Mis Materias"</strong> se listan las materias asignadas con la cantidad de estudiantes matriculados en cada una. Al seleccionar una, se accede directamente a la gestión de notas.' },
    { q: '¿Cómo registro una nota?', a: 'En <strong>"Gestionar Notas"</strong>, elija la materia y el estudiante. Dentro del detalle, seleccione el trimestre (I, II o III), el tipo de evaluación, ingrese la nota y, opcionalmente, un comentario. Presione <strong>"Guardar"</strong>. Solo puede existir un Examen Trimestral por estudiante en cada trimestre.' },
    { q: '¿Cómo elimino una nota?', a: 'Las notas registradas aparecen en el historial del trimestre seleccionado. Presione <strong>"Eliminar"</strong> para borrar una nota (requiere confirmación).' },
    { q: '¿Cómo exporto las notas de un grado completo?', a: 'En <strong>"Gestionar Notas"</strong>, seleccione la materia y presione <strong>"Exportar Notas"</strong> junto al encabezado del grado. Elija el trimestre (o todos) y el formato (PDF o Excel). Si el grado tiene varias secciones, cada sección tiene su propio botón de exportar para descargar solo a esos estudiantes.' },
    { q: '¿Cómo exporto el reporte de un estudiante?', a: 'Abra el detalle del estudiante y presione <strong>"Exportar Notas"</strong>, junto a las pestañas de trimestre. Elija PDF o Excel; el reporte incluye los tres trimestres y la nota final del curso.' },
    { q: '¿Dónde veo los comentarios de mis estudiantes?', a: 'En la sección <strong>"Comentarios"</strong> se muestran los comentarios enviados por los estudiantes sobre las materias que usted tiene asignadas.' },
    { q: '¿Por qué no puedo registrar o eliminar notas?', a: 'Probablemente el trimestre está <strong>cerrado</strong>. En ese caso solo puede consultar las notas. Si necesita modificar algo, contacte al Administrador para que lo abra.' }
];

const AYUDA_ESTUDIANTE = [
    { q: '¿Qué muestra mi Dashboard?', a: 'Un resumen con el número de materias matriculadas, su promedio general y la cantidad de materias aprobadas.' },
    { q: '¿Cómo consulto mis notas?', a: 'En <strong>"Mis Notas"</strong>, el reporte se organiza por trimestre. Presione sobre un trimestre para expandirlo y luego sobre <strong>"Ver notas"</strong> junto a una materia para ver el detalle de cada evaluación.' },
    { q: '¿Cómo descargo mis notas?', a: 'Para un trimestre, presione <strong>"Exportar Notas"</strong> en el encabezado de ese trimestre. Para el boletín con los tres trimestres y la nota final por materia, presione <strong>"Exportar Boletín"</strong> al inicio del reporte. En ambos casos elija PDF o Excel.' },
    { q: '¿Cómo envío un comentario sobre una materia?', a: 'En <strong>"Comentarios"</strong>, elija la materia, escriba su comentario y presione <strong>"Enviar Comentario"</strong>. Sus comentarios enviados se listan debajo del formulario.' },
    { q: '¿Por qué mi nota trimestral aparece como "En curso"?', a: 'Esto ocurre cuando aún falta registrar alguno de los componentes de evaluación del trimestre (Parciales, Apreciación o Examen Trimestral).' }
];

const AYUDA_FAQ = [
    { q: '¿Qué hago si olvido mi contraseña?', a: 'Use el enlace <strong>"¿Olvidaste tu contraseña?"</strong> en la pantalla de inicio de sesión y siga el proceso de recuperación con sus preguntas de seguridad.' },
    { q: '¿Qué hago si olvido la respuesta a mis preguntas de seguridad?', a: 'Contacte al Administrador del sistema para que restablezca su acceso.' },
    { q: '¿Por qué no puedo eliminar un estudiante, profesor o materia?', a: 'El sistema lo impide si el registro tiene calificaciones asociadas, para proteger la integridad de la información académica.', roles: ['admin'] }
];

// ==================== LÓGICA ====================
function getCurrentRole() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    return user?.rol || null;
}

function buildSections(role) {
    const sections = [{ title: 'Acceso al sistema', icon: 'fa-door-open', items: AYUDA_COMUN }];

    if (role === 'admin') {
        sections.push({ title: 'Panel del administrador', icon: 'fa-user-tie', items: AYUDA_ADMIN });
    } else if (role === 'profesor') {
        sections.push({ title: 'Panel del profesor', icon: 'fa-chalkboard-user', items: AYUDA_PROFESOR });
    } else if (role === 'estudiante') {
        sections.push({ title: 'Panel del estudiante', icon: 'fa-user-graduate', items: AYUDA_ESTUDIANTE });
    } else {
        sections.push({ title: 'Panel del administrador', icon: 'fa-user-tie', items: AYUDA_ADMIN });
        sections.push({ title: 'Panel del profesor', icon: 'fa-chalkboard-user', items: AYUDA_PROFESOR });
        sections.push({ title: 'Panel del estudiante', icon: 'fa-user-graduate', items: AYUDA_ESTUDIANTE });
    }

    const faqFiltrado = AYUDA_FAQ.filter(item => !item.roles || !role || item.roles.includes(role));
    sections.push({ title: 'Preguntas frecuentes', icon: 'fa-circle-question', items: faqFiltrado });

    return sections;
}

function renderAyuda(sections) {
    const container = document.getElementById('ayudaContent');
    const html = sections.map(section => {
        if (section.items.length === 0) return '';
        const itemsHtml = section.items.map(item => `
            <div class="ayuda-item">
                <div class="ayuda-question" onclick="toggleAyudaItem(this)">
                    <span>${escapeHtmlAyuda(item.q)}</span>
                    <i class="fas fa-chevron-down chevron"></i>
                </div>
               <div class="ayuda-answer"><div class="ayuda-answer-inner">${item.a}</div></div>
            </div>
        `).join('');
        return `
            <div class="ayuda-section">
                <div class="ayuda-section-title"><i class="fas ${section.icon}"></i> ${escapeHtmlAyuda(section.title)}</div>
                ${itemsHtml}
            </div>
        `;
    }).join('');
    container.innerHTML = html || '<div class="ayuda-no-results">No se encontraron resultados.</div>';
}

window.toggleAyudaItem = function (questionEl) {
    const item = questionEl.parentElement;
    const answer = item.querySelector('.ayuda-answer');

    if (item.classList.contains('open')) {
        item.classList.remove('open');
        answer.style.maxHeight = '0px';
    } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
    }
};

function escapeHtmlAyuda(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

// ==================== BÚSQUEDA ====================
let allSectionsCache = [];

document.getElementById('ayudaSearch').addEventListener('input', function (e) {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
        renderAyuda(allSectionsCache);
        return;
    }
    const filtered = allSectionsCache
        .map(section => ({
            ...section,
            items: section.items.filter(item =>
                item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
            )
        }))
        .filter(section => section.items.length > 0);
    renderAyuda(filtered);
});

// ==================== NAVEGACIÓN ====================
window.volverAlPanel = function () {
    const role = getCurrentRole();
    const routes = { admin: 'admin.php', profesor: 'profesor.php', estudiante: 'estudiante.php' };
    window.location.href = routes[role] || 'index.html';
};

// ==================== INICIALIZAR ====================
const role = getCurrentRole();
allSectionsCache = buildSections(role);
renderAyuda(allSectionsCache);