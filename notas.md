# Cambios en el sistema de sesión — resumen para frontend

Se migró cómo funciona el login, por seguridad (hallazgos de un checklist de pruebas). Esto es lo que te afecta directamente.

## Qué cambió

**Antes:** al loguearse, el backend devolvía un `token` en el JSON, y el frontend lo guardaba en `localStorage` para mandarlo a mano en cada petición (`Authorization: Bearer ...`).

**Ahora:** el backend pone el token en una **cookie** (`sesion_token`, `httpOnly`). El navegador la manda solo en cada petición — ya no hay que leerla ni guardarla a mano.

## Archivos que ya cambié (no los toques sin avisar)

- **`js/api.js`** — `apiFetch()` ya no lee ningún token ni manda header `Authorization`. Ahora manda `credentials: 'include'` para que el navegador adjunte la cookie.
- **`js/login.js`** — el `fetch` de login también tiene `credentials: 'include'`. El objeto que se guarda en `localStorage` (`currentUser`) ya **no tiene campo `token`** — solo `email`, `rol`, `nombre`, `id_referencia`, `password_cambiada`, `preguntas_configuradas`. Esos datos siguen ahí para mostrar en pantalla, solo que ya no cargan el token.
- **5 páginas renombradas de `.html` a `.php`:** `admin.php`, `profesor.php`, `estudiante.php`, `cambiar_password.php`, `configurar_preguntas.php`. Los `.html` viejos ya no existen — se borraron a propósito. Cada uno tiene una línea de PHP al inicio que verifica la sesión en el servidor antes de mostrar la página (antes, cualquiera podía pedir esas páginas por URL sin estar logueado, y aunque no veía datos reales porque la API seguía protegida, sí veía la interfaz vacía).
- Actualicé todas las referencias `.html → .php` de esas 5 páginas en `login.js`, `estudiante.js`, `profesor.js`, `cambiar_password.js`, `configurar_preguntas.js`, `ayuda.js`.
- `index.html` y `ayuda.html` **no cambiaron** — siguen siendo `.html`.

## Qué significa esto para tu trabajo de aquí en adelante

- **No hay nada que hacer distinto al llamar la API.** Sigues usando `apiFetch()`/`apiGet()` normal — la cookie se manda sola, no necesitas tocar headers ni tokens en ningún código nuevo que escribas.
- **No intentes leer `currentUser.token`** en ningún lado — ya no existe. Si necesitas saber el rol o nombre del usuario, sigue en `currentUser.rol` / `currentUser.nombre` igual que antes.
- **Si creas una página nueva que requiera sesión** (otro panel, otra pantalla interna), debe ser `.php` (no `.html`) y necesita esta línea como primera línea del archivo, antes de `<!DOCTYPE html>`:
  ```php
  <?php require_once '../api/config/verificar_sesion_pagina.php'; verificarSesionPagina('ROL_AQUI'); ?>
  ```
  `'ROL_AQUI'` es `'admin'`, `'profesor'`, `'estudiante'`, o un array como `['profesor', 'estudiante']` si varios roles pueden entrar.
- **No recrees ningún `.html` para admin/profesor/estudiante/cambiar_password/configurar_preguntas** — si vuelve a aparecer un `.html` de esos, anula la protección (quedaría accesible sin sesión en paralelo al `.php` protegido).

## Otro cambio relacionado (no afecta tu código)

Agregué bloqueo de cuenta tras 5 intentos de login fallidos seguidos (15 min de bloqueo). Si pruebas el login y te sale un error de "cuenta bloqueada temporalmente", es eso — espera o pide que te resetee el contador desde la base de datos (columna `intentos_fallidos` / `bloqueado_hasta` en `usuario`).

## Si algo no carga o redirige solo a `index.html`

Lo más probable es que no haya sesión válida (cookie vencida o borrada) — es el comportamiento esperado, no un bug. Si pasa estando recién logueado, avísame para revisar.