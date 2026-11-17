/**
 * shell.js — comportamiento de la barra lateral (los 3 paneles).
 * Crea la barra superior y el fondo oscuro del menú tipo cajón (solo se ven en teléfono),
 * pone tooltips en el modo carril de íconos y mantiene el título de la barra superior.
 */
(function () {
    'use strict';

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.id = sidebar.id || 'sidebar';

    sidebar.querySelectorAll('.nav-btn, .btn-cambiar-pass, .logout-btn').forEach(el => {
        const t = el.textContent.trim();
        if (t && !el.title) el.title = t;
    });

    const tituloBase = (sidebar.querySelector('.logo')?.textContent || '').trim();

    const barra = document.createElement('header');
    barra.className = 'topbar';
    barra.innerHTML =
        '<button type="button" class="topbar-toggle" aria-controls="' + sidebar.id + '" aria-expanded="false" aria-label="Abrir menú">' +
        '<i class="fas fa-bars"></i></button><span class="topbar-title"></span>';
    const boton = barra.querySelector('.topbar-toggle');
    const titulo = barra.querySelector('.topbar-title');

    const fondo = document.createElement('div');
    fondo.className = 'sidebar-backdrop';

    document.body.prepend(barra);
    document.body.appendChild(fondo);

    function abrir(si) {
        document.body.classList.toggle('nav-open', si);
        boton.setAttribute('aria-expanded', String(si));
        boton.setAttribute('aria-label', si ? 'Cerrar menú' : 'Abrir menú');
    }

    function actualizarTitulo() {
        const activo = sidebar.querySelector('.nav-btn.active span');
        titulo.textContent = activo ? activo.textContent.trim() : tituloBase;
    }

    boton.addEventListener('click', () => abrir(!document.body.classList.contains('nav-open')));
    fondo.addEventListener('click', () => abrir(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrir(false); });

    // Al elegir una opción del menú, se cierra el cajón
    sidebar.addEventListener('click', (e) => {
        if (e.target.closest('.nav-btn, .btn-cambiar-pass, .logout-btn')) abrir(false);
    });

    // Si se pasa a tablet/laptop (rotar el equipo, redimensionar), se cierra
    window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => { if (e.matches) abrir(false); });

    // El título sigue a la vista activa (también cuando el panel cambia de vista por código)
    new MutationObserver(actualizarTitulo).observe(sidebar, { attributes: true, subtree: true, attributeFilter: ['class'] });
    actualizarTitulo();
})();