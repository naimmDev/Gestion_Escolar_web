
// Forzar recarga si la página se restaura desde bfcache (botón Atrás/Adelante)
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        window.location.reload();
    }
});

(function() {
const user = JSON.parse(localStorage.getItem('currentUser'));
if (!user) {
    window.location.href = 'index.html';
    return;
}

// Si ya cambió la contraseña, redirigir
if (user.password_cambiada) {
    if (user.preguntas_configuradas) {
        const routes = { profesor: 'profesor.php', estudiante: 'estudiante.php' };
        window.location.href = routes[user.rol] || 'index.html';
    } else {
        window.location.href = 'configurar_preguntas.php';
    }
    return;
}

document.getElementById('cambiarPasswordForm').addEventListener('submit', async function(e) {
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
            // Actualizar usuario en localStorage
            user.password_cambiada = true;
            delete user.password_skipped; // Limpiar flag de "más tarde"
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            Swal.fire({
                title: '¡Contraseña actualizada!',
                text: 'Serás redirigido para configurar tus preguntas de seguridad',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            setTimeout(() => {
                if (user.preguntas_configuradas) {
                    const routes = { profesor: 'profesor.php', estudiante: 'estudiante.php' };
                    window.location.href = routes[user.rol] || 'index.html';
                } else {
                    window.location.href = 'configurar_preguntas.php';
                }
            }, 2000);
        } else {
            Swal.fire('Error', json.error || 'No se pudo actualizar la contraseña', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
});

})();

// Función global para "Más tarde"
window.skipPasswordChange = function() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.rol === 'admin') {
        window.location.href = 'admin.php';
    } else {
        // Guardar que ya vio el mensaje pero no cambió contraseña
        user.password_skipped = true;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (user.preguntas_configuradas) {
            const routes = { profesor: 'profesor.php', estudiante: 'estudiante.php' };
            window.location.href = routes[user.rol];
        } else {
            window.location.href = 'configurar_preguntas.php';
        }
    }
};