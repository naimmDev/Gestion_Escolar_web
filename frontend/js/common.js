/**
 * common.js — funciones compartidas por todas las páginas.
 * Reemplaza las copias que había en admin.js, profesor.js, estudiante.js, login.js, etc.
 * Requiere api.js cargado antes (usa apiFetch) y SweetAlert2.
 */
(function () {
    'use strict';

    window.escapeHtml = function (str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    };

    window.showToast = function (title, icon = 'success') {
        Swal.fire({ title, icon, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    };

    // ---------- Modales ----------
    window.openModal = function (id) {
        const m = document.getElementById(id);
        if (!m) return;
        m.style.display = 'flex';
        m.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    window.closeModal = function (id) {
        const m = document.getElementById(id);
        if (!m) return;
        m.style.display = 'none';
        m.classList.remove('show');
        document.body.style.overflow = '';
    };

    window.openChangePasswordModal = function () {
        document.getElementById('changePasswordForm')?.reset();
        openModal('changePasswordModal');
    };

    // Esc y clic fuera cierran cualquier .modal visible
    document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Si SweetAlert está abierto, dejamos que lo maneje él
    if (document.querySelector('.swal2-container')) return;
    const visibles = [...document.querySelectorAll('.modal')]
        .filter(m => m.id && getComputedStyle(m).display !== 'none');
    if (visibles.length) closeModal(visibles[visibles.length - 1].id);
});

    window.addEventListener('click', (e) => {
        if (e.target.classList && e.target.classList.contains('modal') && e.target.id) closeModal(e.target.id);
    });

    // ---------- Sesión ----------
    window.logout = async function () {
        try { await apiFetch('/auth/logout.php', { method: 'POST' }); } catch (e) { /* se cierra igual */ }
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    };

    // Si la página vuelve desde bfcache (botón Atrás/Adelante), se recarga para no mostrar una sesión cerrada
    window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });

    // ---------- Cambio de contraseña desde el panel (admin, profesor, estudiante) ----------
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('changePasswordForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const actual    = document.getElementById('cpActual').value;
            const nueva     = document.getElementById('cpNueva').value;
            const confirmar = document.getElementById('cpConfirmar').value;

            if (nueva !== confirmar) { Swal.fire('Error', 'Las contraseñas nuevas no coinciden', 'error'); return; }
            if (nueva.length < 6)    { Swal.fire('Error', 'La nueva contraseña debe tener al menos 6 caracteres', 'error'); return; }

            try {
                const res = await apiFetch('/auth/cambiar_password.php', {
                    method: 'POST',
                    body: JSON.stringify({ password_actual: actual, password_nueva: nueva })
                });
                const json = await res.json();
                if (res.ok) {
                    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    user.password_cambiada = true;
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    form.reset();
                    closeModal('changePasswordModal');
                    Swal.fire({ title: '¡Contraseña actualizada!', icon: 'success', timer: 1500, showConfirmButton: false });
                } else {
                    Swal.fire('Error', json.error || 'No se pudo actualizar', 'error');
                }
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        });
    });

    // ---------- Tablas → tarjetas en teléfono: pone data-label a cada celda según su encabezado ----------
    const SELECTOR_TABLAS = 'table.data-table, table.subjects-table';

    function etiquetar(tabla) {
        const heads = [...tabla.querySelectorAll('thead th')].map(th => th.textContent.replace(/\s+/g, ' ').trim());
        tabla.querySelectorAll('tbody tr').forEach(tr => {
            if (tr.children.length !== heads.length) return;   // filas vacías con colspan
            [...tr.children].forEach((td, i) => { if (heads[i]) td.setAttribute('data-label', heads[i]); });
        });
    }

    let pendiente = false;
    function programar() {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => {
            pendiente = false;
            document.querySelectorAll(SELECTOR_TABLAS).forEach(etiquetar);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        new MutationObserver(programar).observe(document.body, { childList: true, subtree: true });
        programar();
    });
})();