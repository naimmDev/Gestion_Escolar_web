
// Forzar recarga si la página se restaura desde bfcache (botón Atrás/Adelante)
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});

(function() {
const user = JSON.parse(localStorage.getItem('currentUser'));
// Permitir acceso si cambió la contraseña O si la saltó (password_skipped)
if (!user || (!user.password_cambiada && !user.password_skipped)) {
    window.location.href = 'index.html';
    return;
}
if (user.preguntas_configuradas) {
    const routes = { profesor: 'profesor.php', estudiante: 'estudiante.php' };
    window.location.href = routes[user.rol] || 'index.html';
    return;
}

let todasLasPreguntas = [];
const seleccionadas = [null, null, null];

async function cargarPreguntas() {
    try {
        const res  = await apiFetch('/auth/preguntas_seguridad.php');
        const json = await res.json();
        todasLasPreguntas = json.data ?? json;
        renderPreguntas();
        document.getElementById('btnGuardar').disabled = false;
    } catch (err) {
        document.getElementById('preguntasContainer').innerHTML =
            '<p style="color:red; text-align:center; grid-column: span 3;">No se pudieron cargar las preguntas. Recarga la página.</p>';
    }
}

function getOpcionesDisponibles(slotIndex) {
    return todasLasPreguntas.filter(p => {
        for (let i = 0; i < 3; i++) {
            if (i !== slotIndex && seleccionadas[i] == p.id) return false;
        }
        return true;
    });
}

function renderPreguntas() {
    const container = document.getElementById('preguntasContainer');
    let html = '';
    for (let i = 0; i < 3; i++) {
        const opciones = getOpcionesDisponibles(i);
        html += `
        <div class="pregunta-grupo">
            <div class="input-group">
                <label><i class="fas fa-question-circle"></i> Pregunta ${i + 1}</label>
                <select id="pregunta_${i}" onchange="actualizarSlot(${i})">
                    <option value="">-- Selecciona una pregunta --</option>
                    ${opciones.map(p =>
                        `<option value="${p.id}" ${seleccionadas[i] == p.id ? 'selected' : ''}>${escapeHtml(p.pregunta)}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="input-group" style="margin-top:8px;">
                <label><i class="fas fa-pen"></i> Tu respuesta</label>
                <input type="text" id="respuesta_${i}" placeholder="Escribe tu respuesta..." autocomplete="off"
                       value="${document.getElementById('respuesta_' + i)?.value || ''}">
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

window.actualizarSlot = function(slotIndex) {
    const val = document.getElementById(`pregunta_${slotIndex}`).value;
    seleccionadas[slotIndex] = val || null;
    renderPreguntas();
    const el = document.getElementById(`pregunta_${slotIndex}`);
    if (el) el.focus();
};

document.getElementById('preguntasForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const preguntas = [];
    for (let i = 0; i < 3; i++) {
        const preguntaId = document.getElementById(`pregunta_${i}`).value;
        const respuesta  = document.getElementById(`respuesta_${i}`).value.trim();
        
        if (!preguntaId || !respuesta) {
            Swal.fire('Incompleto', `Completa la pregunta y respuesta ${i + 1}`, 'warning');
            return;
        }
        
        preguntas.push({ 
            pregunta_id: parseInt(preguntaId), 
            respuesta: respuesta 
        });
    }

    const ids = preguntas.map(r => r.pregunta_id);
    if (new Set(ids).size !== 3) {
        Swal.fire('Error', 'No puedes repetir preguntas', 'error');
        return;
    }

    const requestBody = { preguntas: preguntas };
    
    console.log('Enviando al backend:', requestBody);

    try {
        const res = await apiFetch('/auth/configurar_preguntas.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const json = await res.json();
        console.log('Respuesta del servidor:', json);

        if (res.ok) {
            user.preguntas_configuradas = true;
            localStorage.setItem('currentUser', JSON.stringify(user));
            await Swal.fire({
                title: '¡Preguntas guardadas!',
                text: 'Tu cuenta está lista.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            const routes = { profesor: 'profesor.php', estudiante: 'estudiante.php' };
            window.location.href = routes[user.rol] || 'index.html';
        } else {
            Swal.fire('Error', json.error || 'No se pudieron guardar las preguntas', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        Swal.fire('Error', 'No se pudo conectar con el servidor: ' + err.message, 'error');
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

cargarPreguntas();

})();