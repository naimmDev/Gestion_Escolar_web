# Actualizar tu entorno local — módulo de correo ya en `main`

Sigue estos pasos **en orden** en tu PC antes de seguir trabajando. Así tu entorno queda igual al del backend y evitas errores raros.

## 1. Traer los cambios
Desde la carpeta del proyecto (`C:\xampp\htdocs\gestion_escolar`), en PowerShell:
```
git checkout main
git pull
```
Si tienes cambios sin guardar, haz commit o `git stash` primero. Si trabajas en otra rama (por ejemplo la de PWA), créala **desde `main` ya actualizado**.

## 2. Instalar la librería de correo (PHPMailer)
No hace falta reinstalar Composer: ya lo tienes. Solo ejecútalo dentro de `api`:
```
cd api
composer install
```
Debe terminar sin errores y dejar `api/vendor/phpmailer/`. Si dice que `composer.lock` no está al día, avísale a Naim; no corras `composer update`.

## 3. Base de datos
Hay una tabla nueva: `correo_log`. Elige UNA opción:
- **Si vas a recrear la BD** (recomendado si no tienes datos que conservar): importa en phpMyAdmin, en este orden, `database/schema.sql`, `database/datos_iniciales.sql` y, si quieres datos de ejemplo, `database/datos_prueba.sql`.
- **Si conservas tu BD actual:** en phpMyAdmin, pestaña SQL, ejecuta el contenido de `database/migrations/2026-11-02_correo_log.sql`. Es seguro repetirlo (usa `IF NOT EXISTS`).

## 4. Credenciales (`api/config/credenciales.php`)
Este archivo es **solo tuyo**: no está en Git y **nunca** debe subirse. Ábrelo y agrega, dentro del mismo arreglo y con coma después de cada bloque, esto (el modelo completo está en `credenciales.php.example`):
```php
'correo' => [
    'activo'           => false,
    'host'             => 'smtp.gmail.com',
    'puerto'           => 587,
    'seguridad'        => 'tls',
    'usuario'          => '',
    'clave'            => '',
    'remitente'        => '',
    'nombre_remitente' => 'Sistema de Gestión Escolar',
    'desvio'           => '',
    'url_sistema'      => 'http://localhost/gestion_escolar/frontend/index.html',
],

'contacto_admin' => [
    'correo'   => 'admin@escuela.edu',
    'telefono' => '',
    'horario'  => '',
],
```
- **Si no necesitas probar correos**, déjalo con `'activo' => false`. El sistema funciona igual; solo no envía nada.
- **Si quieres probarlos:** pon `'activo' => true` y usa **tu propia** cuenta de Gmail con una *contraseña de aplicación* (requiere verificación en dos pasos; se crea en tu cuenta de Google, sección Seguridad). Ponla en `usuario`, `remitente` y `clave` (sin espacios). **No uses las credenciales de otra persona ni las compartas por chat o Git.**
- **Importante para pruebas:** en `desvio` pon **tu propio correo**. Así todos los correos llegan a ti (con el destinatario real en el asunto) y no se envía nada a las direcciones inventadas de los datos de prueba, que podrían ser de personas reales.

## 5. Probar que todo quedó bien
1. Recarga fuerte el navegador (`Ctrl+F5`).
2. Inicia sesión como admin (`admin@escuela.edu` / `admin123` si usas `datos_iniciales.sql`).
3. Crea un estudiante: debe aparecer el aviso de correo según tu configuración (enviado, fallido o nada si está apagado).
4. En phpMyAdmin revisa la tabla `correo_log`: con el envío activo, cada correo queda registrado con su estado. Si falla, la columna `error` dice por qué.
5. Entra a **Ayuda** como profesor o estudiante: debe aparecer "¿Cómo contacto al administrador?".

## 6. Si algo falla
| Síntoma | Causa probable |
|---|---|
| No llega ningún correo y `correo_log` está vacío | `'activo' => false`, o falta la tabla `correo_log` |
| `correo_log` dice "PHPMailer no instalado" | Falta `composer install` dentro de `api` |
| Error de autenticación SMTP | La contraseña de aplicación es incorrecta o tiene espacios |
| Los correos van a tu bandeja y no al usuario | Es normal: es el `desvio` |
| Ayuda no muestra el contacto | Falta el bloque `contacto_admin`, o no recargaste con `Ctrl+F5` |

Mira también la carpeta de spam. Los correos de prueba de Gmail a Gmail a veces caen ahí.

## 7. Pendientes tuyos del frontend (cuando puedas)
- **`ayuda.js`:** agregar en `AYUDA_COMUN` la pregunta "¿Recibiré correos del sistema?", explicando que los correos son automáticos, que no se responden y que las notas y comentarios se ven entrando al sistema. Subir el `?v=` de `ayuda.js`.
- **`docs/documentacion_frontend.md`:** documentar lo nuevo: el aviso de correo en el admin al crear y restablecer usuarios (`notaCorreo` y `avisarFalloCorreo` en `admin.js`), el contacto del administrador en Ayuda (`cargarContactoAdmin`, que consume `/contacto/admin.php`), y que `ayuda.html` ahora carga `api.js`. Subir la versión del documento.
- **Rutas viejas:** en `documentacion_frontend.md` (línea ~421) y `docs/features/periodos_para_frontend.md`, cambiar `database/migraciones/` por `database/migrations/`.

## 8. Reglas para no romper nada
- No subas `api/config/credenciales.php` ni la carpeta `api/vendor/` (ya están en `.gitignore`; no los fuerces con `git add -f`).
- No cambies la estructura de `credenciales.php.example` sin avisar.
- Los correos nunca bloquean una acción: si algo de correo falla, el usuario, la nota o el comentario igual se guardan.
