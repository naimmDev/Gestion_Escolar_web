// La API vive junto al frontend (../api). Funciona en localhost, en la IP de la red local
// y en producción sin tocar nada. Si algún día la API queda en otro dominio,
// definir window.SGE_API_URL antes de cargar este archivo.
const API_URL = (window.SGE_API_URL || new URL('../api', window.location.href).href).replace(/\/$/, '');

async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers ?? {})
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    // Solo se considera sesión expirada si el 401 es por el token.
    // Otros 401 (ej. "La contraseña actual es incorrecta") se devuelven al llamador.
    if (response.status === 401) {
        const err = await response.clone().json().catch(() => ({}));
        if (/token/i.test(err.error || '')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
            return new Promise(() => {}); // detiene al llamador sin errores mientras redirige
        }
    }

    if (response.status === 403) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? 'Acción no permitida');
    }

    return response;
}

/**
 * Hace fetch y devuelve directamente el array/objeto en data[].
 * Para GET que esperan una lista o un objeto de la API.
 */
async function apiGet(endpoint) {
    const res = await apiFetch(endpoint);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
    }
    const json = await res.json();
    return json.data ?? json;
}