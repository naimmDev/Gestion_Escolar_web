// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {

    // ==================== LOGIN ====================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email    = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_URL}/auth/login.php`, {
                    method:  'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ email, password })
                });

                const json = await response.json();

                if (!response.ok) {
                    Swal.fire('Error', json.error || 'Credenciales incorrectas', 'error');
                    return;
                }

                const data = json.data;

                localStorage.setItem('currentUser', JSON.stringify({
                    email,
                    rol:           data.rol,
                    nombre:        data.nombre,
                    id_referencia: data.id_referencia,
                    password_cambiada:  data.password_cambiada,
                    preguntas_configuradas: data.preguntas_configuradas
                }));

                if (data.rol === 'admin') {
                    window.location.href = 'admin.php';
                    return;
                }

                if (!data.password_cambiada) {
                    window.location.href = 'cambiar_password.php';
                    return;
                }

                if (!data.preguntas_configuradas) {
                    window.location.href = 'configurar_preguntas.php';
                    return;
                }
                
                const routes = { profesor: 'profesor.php', estudiante: 'estudiante.php' };
                window.location.href = routes[data.rol];

            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'No se pudo conectar con el servidor. Verifica que XAMPP esté corriendo.', 'error');
            }
        });
    } else {
        console.error('No se encontró el formulario de login');
    }

    // ==================== RECUPERAR CONTRASEÑA ====================
    let recoveryUserData = null;
    let selectedPreguntaId = null;

    window.showRecoveryModal = function() {
        const modal = document.getElementById('recoveryModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('step1').style.display = 'block';
            document.getElementById('step2').style.display = 'none';
            document.getElementById('recoveryIdentificacion').value = '';
            document.getElementById('respuestaSeguridad').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
            recoveryUserData = null;
            selectedPreguntaId = null;
        }
    };

    window.closeRecoveryModal = function() {
        const modal = document.getElementById('recoveryModal');
        if (modal) modal.style.display = 'none';
    };

    window.checkUserAndLoadQuestions = async function() {
        const identificacion = document.getElementById('recoveryIdentificacion').value.trim();
        
        if (!identificacion) {
            Swal.fire('Error', 'Ingresa tu número de identificación', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/auth/preguntas_usuario.php?identificacion=${encodeURIComponent(identificacion)}`);
            const json = await response.json();
            
            if (!response.ok) {
                Swal.fire('Error', json.error || 'Usuario no encontrado o no tiene preguntas configuradas', 'error');
                return;
            }
            
            const preguntas = json.data || json;
            if (!preguntas.length) {
                Swal.fire('Error', 'Este usuario no tiene preguntas de seguridad configuradas', 'error');
                return;
            }
            
            const randomIndex = Math.floor(Math.random() * preguntas.length);
            const preguntaAleatoria = preguntas[randomIndex];
            
            recoveryUserData = { identificacion: identificacion };
            selectedPreguntaId = preguntaAleatoria.pregunta_id;
            
            document.getElementById('preguntaRecuperacion').innerHTML = `
                <p style="background: rgba(240,232,213,0.6); padding: 12px 16px; border-radius: 2px;
                          border-left: 3px solid var(--crimson); font-family: 'EB Garamond', serif;
                          font-size: 15px; color: var(--ink); margin-bottom: 5px;">
                    <i class="fas fa-question-circle" style="color:var(--gold); margin-right:6px;"></i>
                    ${escapeHtml(preguntaAleatoria.pregunta)}
                </p>
            `;
            
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('respuestaSeguridad').focus();
            
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
        }
    };

    // Submit manual del formulario de recuperación
    const recoveryForm = document.getElementById('recoveryForm');
    if (recoveryForm) {
        recoveryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nuevaPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;
            const respuesta = document.getElementById('respuestaSeguridad').value.trim();
            
            if (nuevaPassword !== confirmPassword) {
                Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (nuevaPassword.length < 6) {
                Swal.fire('Error', 'La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
            if (!respuesta) {
                Swal.fire('Error', 'Responde la pregunta de seguridad', 'error');
                return;
            }
            
            if (!recoveryUserData || !selectedPreguntaId) {
                Swal.fire('Error', 'No se pudo verificar la pregunta. Intenta de nuevo.', 'error');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/auth/recuperar_password.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identificacion: recoveryUserData.identificacion,
                        pregunta_id: selectedPreguntaId,
                        respuesta: respuesta,
                        password_nueva: nuevaPassword
                    })
                });
                
                const json = await response.json();
                
                if (response.ok) {
                    Swal.fire({
                        title: '¡Contraseña actualizada!',
                        text: 'Ahora puedes iniciar sesión con tu nueva contraseña',
                        icon: 'success'
                    }).then(() => {
                        closeRecoveryModal();
                        document.getElementById('email').value = '';
                        document.getElementById('password').value = '';
                    });
                } else {
                    Swal.fire('Error', json.error || 'No se pudo cambiar la contraseña', 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
            }
        });
    } else {
        console.error('No se encontró el formulario de recuperación');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    window.onclick = function(event) {
        const modal = document.getElementById('recoveryModal');
        if (event.target === modal) closeRecoveryModal();
    };

}); // Fin DOMContentLoaded