/**
 * pwa.js — único punto de enganche PWA para todas las páginas.
 *  - Inyecta manifest, color de barra y etiquetas de iOS.
 *  - Registra el Service Worker y avisa cuando hay una versión nueva.
 *  - Muestra "Instalar app" en el menú lateral (paneles) y en el login.
 * Rutas calculadas desde este archivo: funciona en cualquier subcarpeta o dominio.
 */
(function () {
    'use strict';

    const script = document.currentScript;
    if (!script) return;
    const raiz = new URL('../', script.src).href;   // .../frontend/

    // ---------- Etiquetas del <head> ----------
    function agregar(tag, atributos) {
        const clave = tag + JSON.stringify(atributos);
        if ([...document.head.querySelectorAll('[data-pwa]')].some(e => e.getAttribute('data-pwa') === clave)) return;
        const el = document.createElement(tag);
        Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
        el.setAttribute('data-pwa', clave);
        document.head.appendChild(el);
    }

    agregar('link', { rel: 'manifest', href: raiz + 'manifest.webmanifest' });
    agregar('meta', { name: 'theme-color', content: '#8B0000' });
    agregar('link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: raiz + 'icons/favicon-32.png' });
    agregar('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    agregar('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    agregar('meta', { name: 'apple-mobile-web-app-title', content: 'SGE' });
    agregar('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });
    agregar('link', { rel: 'apple-touch-icon', href: raiz + 'icons/apple-touch-icon.png' });

    // ---------- Service Worker + actualizaciones ----------
    let avisoMostrado = false;

    function avisarActualizacion(worker) {
        if (avisoMostrado) return;
        avisoMostrado = true;
        const aplicar = () => worker.postMessage({ type: 'SKIP_WAITING' });

        if (window.Swal) {
            Swal.fire({
                title: 'Nueva versión disponible',
                text: 'Actualiza para usar la versión más reciente del sistema.',
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: 'Actualizar',
                cancelButtonText: 'Después',
                confirmButtonColor: '#8B0000'
            }).then(r => { if (r.isConfirmed) aplicar(); else avisoMostrado = false; });
        } else if (window.confirm('Hay una nueva versión del sistema. ¿Actualizar ahora?')) {
            aplicar();
        } else {
            avisoMostrado = false;
        }
    }

    if ('serviceWorker' in navigator) {
        const teniaControlador = !!navigator.serviceWorker.controller;
        let recargando = false;

        // Al activarse la versión nueva se recarga una sola vez (no en la primera instalación)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!teniaControlador || recargando) return;
            recargando = true;
            window.location.reload();
        });

        window.addEventListener('load', async () => {
            try {
                const reg = await navigator.serviceWorker.register(raiz + 'sw.js', { scope: raiz });

                if (reg.waiting && navigator.serviceWorker.controller) avisarActualizacion(reg.waiting);

                reg.addEventListener('updatefound', () => {
                    const nuevo = reg.installing;
                    if (!nuevo) return;
                    nuevo.addEventListener('statechange', () => {
                        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
                            avisarActualizacion(nuevo);
                        }
                    });
                });

                // Busca versión nueva cada vez que el usuario vuelve a la app
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') reg.update().catch(() => {});
                });
            } catch (e) {
                console.warn('Service Worker no disponible:', e.message);
            }
        });
    }

    // ---------- Instalación ----------
    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    let eventoInstalacion = null;

    const estaInstalada = () =>
        window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

    function ayudaIOS() {
        const html = 'En <strong>Safari</strong>:<br>1. Toca el botón <strong>Compartir</strong> (cuadro con flecha hacia arriba).<br>'
            + '2. Elige <strong>"Agregar a pantalla de inicio"</strong>.<br>3. Toca <strong>"Agregar"</strong>.';
        if (window.Swal) {
            Swal.fire({ title: 'Instalar en iPhone / iPad', html, icon: 'info', confirmButtonColor: '#8B0000' });
        } else {
            alert('En Safari: Compartir → Agregar a pantalla de inicio → Agregar.');
        }
    }

    async function instalar() {
        if (eventoInstalacion) {
            eventoInstalacion.prompt();
            await eventoInstalacion.userChoice;
            eventoInstalacion = null;
            actualizarBotones();
        } else if (esIOS) {
            ayudaIOS();
        }
    }

    function crearBoton() {
        const lateral = document.querySelector('.sidebar');
        if (lateral) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn-cambiar-pass';            // misma apariencia que "Cambiar contraseña"
            b.title = 'Instalar app';
            b.setAttribute('data-pwa-instalar', '');
            b.innerHTML = '<i class="fas fa-download"></i> <span> Instalar app</span>';
            b.addEventListener('click', instalar);
            const salir = lateral.querySelector('.logout-btn');
            lateral.insertBefore(b, salir || null);
            return;
        }
        // Login (index.html): enlace discreto bajo "¿Olvidaste tu contraseña?"
        const tarjeta = document.querySelector('.login-card');
        if (tarjeta && document.getElementById('loginForm')) {
            const d = document.createElement('div');
            d.setAttribute('data-pwa-instalar', '');
            d.style.cssText = 'text-align:center;margin-top:14px;';
            d.innerHTML = '<a href="#" style="color:var(--gold);font-size:13px;font-family:\'Cinzel\',serif;text-decoration:none;">'
                + '<i class="fas fa-download"></i> Instalar app</a>';
            d.querySelector('a').addEventListener('click', (e) => { e.preventDefault(); instalar(); });
            tarjeta.appendChild(d);
        }
    }

    function actualizarBotones() {
        const visible = !estaInstalada() && (eventoInstalacion !== null || esIOS);
        const existente = document.querySelector('[data-pwa-instalar]');
        if (visible && !existente) crearBoton();
        if (!visible && existente) existente.remove();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        eventoInstalacion = e;
        actualizarBotones();
    });

    window.addEventListener('appinstalled', () => {
        eventoInstalacion = null;
        actualizarBotones();
    });

    actualizarBotones();   // iOS no dispara beforeinstallprompt

    window.SGE_PWA = { raiz, estaInstalada, instalar, ayudaIOS };
})();