/**
 * sw.js — Service Worker del SGE.
 * Reglas de seguridad (NO cambiar sin revisar):
 *  1. Nunca intercepta nada que contenga "/api/": los datos académicos no se guardan.
 *  2. Nunca guarda páginas HTML (los paneles dependen de la sesión del servidor).
 *  3. Solo responde a peticiones GET.
 * Para publicar una versión nueva, cambiar VERSION.
 */
const VERSION = 'sge-v2';
const CACHE_PROPIO  = `${VERSION}-propio`;
const CACHE_EXTERNO = `${VERSION}-externo`;

const RAIZ = new URL('./', self.location).href;       // .../frontend/
const RUTA_RAIZ = new URL(RAIZ).pathname;
const OFFLINE_URL = RAIZ + 'offline.html';

const PRECACHE = [
    'offline.html',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/apple-touch-icon.png',
    'icons/favicon-32.png'
].map(p => RAIZ + p);

const HOSTS_EXTERNOS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_PROPIO).then(cache =>
            // allSettled: si falta un ícono, la instalación no se cae
            Promise.allSettled(PRECACHE.map(url => cache.add(new Request(url, { cache: 'reload' }))))
        )
    );
    // Sin skipWaiting automático: la versión nueva espera a que el usuario acepte (ver pwa.js)
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(claves => Promise.all(
                claves.filter(k => !k.startsWith(VERSION + '-')).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    if (url.origin === self.location.origin) {
        // Regla 1: la API jamás pasa por el Service Worker
        if (url.pathname.includes('/api/')) return;

        // Páginas: red primero; sin conexión, pantalla offline (regla 2: no se guardan)
        if (req.mode === 'navigate') {
            event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
            return;
        }

        if (!url.pathname.startsWith(RUTA_RAIZ)) return;

        if (/\.(css|js)$/i.test(url.pathname)) {
            event.respondWith(redPrimero(req));
        } else if (/\.(png|svg|ico|webp|woff2?)$/i.test(url.pathname)) {
            event.respondWith(cachePrimero(req, CACHE_PROPIO));
        }
        return;
    }

    if (HOSTS_EXTERNOS.includes(url.hostname)) {
        event.respondWith(externo(req));
    }
});

/** CSS/JS propios: siempre lo más nuevo; la caché solo respalda si no hay red. */
async function redPrimero(req) {
    try {
        const res = await fetch(req);
        if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE_PROPIO).then(c => c.put(req, copia));
        }
        return res;
    } catch (e) {
        const guardado = await caches.match(req);
        if (guardado) return guardado;
        throw e;
    }
}

/** Íconos/fuentes propias: casi nunca cambian. */
async function cachePrimero(req, nombreCache) {
    const guardado = await caches.match(req);
    if (guardado) return guardado;
    const res = await fetch(req);
    if (res.ok) {
        const copia = res.clone();
        caches.open(nombreCache).then(c => c.put(req, copia));
    }
    return res;
}

/** Librerías externas: sirve la copia guardada y la actualiza en segundo plano. */
async function externo(req) {
    const cache = await caches.open(CACHE_EXTERNO);
    const guardado = await cache.match(req);
    const red = fetch(req)
        .then(res => {
            // type "opaque" = respuesta de otro dominio sin CORS; se puede guardar igual
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
        })
        .catch(() => null);
    return guardado || (await red) || Response.error();
}