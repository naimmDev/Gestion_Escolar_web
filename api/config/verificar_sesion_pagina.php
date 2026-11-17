<?php
/**
 * Verificación de sesión en servidor para páginas HTML de /frontend.
 * No reutiliza db.php porque ese archivo fija cabeceras JSON/CORS
 * que romperían la respuesta HTML.
 */

/** Devuelve ['rol', 'password_cambiada', 'preguntas_configuradas'] de la sesión vigente, o null. */
function datosSesionActual(): ?array {
    $token = $_COOKIE['sesion_token'] ?? null;
    if (!$token) return null;

    try {
        $cred = require __DIR__ . '/credenciales.php';
        $pdo = new PDO("mysql:host={$cred['host']};dbname={$cred['db']};charset=utf8", $cred['user'], $cred['pass']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        return null;
    }

    $stmt = $pdo->prepare("
        SELECT u.rol, u.password_cambiada, u.preguntas_configuradas
        FROM sesion s
        JOIN usuario u ON s.usuario_id = u.id
        WHERE s.token = ? AND s.activa = 1 AND s.expires_at > NOW()
    ");
    $stmt->execute([hash('sha256', $token)]);
    $fila = $stmt->fetch(PDO::FETCH_ASSOC);
    return $fila ?: null;
}

/** Página a la que debe ir un usuario con sesión vigente (misma lógica que login.js). */
function rutaInicialPorSesion(array $sesion): string {
    if ($sesion['rol'] === 'admin') return 'admin.php';
    if (!$sesion['password_cambiada']) return 'cambiar_password.php';
    if (!$sesion['preguntas_configuradas']) return 'configurar_preguntas.php';
    return $sesion['rol'] === 'profesor' ? 'profesor.php' : 'estudiante.php';
}

function verificarSesionPagina($rolesPermitidos): void {
    // El HTML de un panel nunca debe guardarse en caché (navegador ni Service Worker)
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');

    if (!is_array($rolesPermitidos)) $rolesPermitidos = [$rolesPermitidos];

    $sesion = datosSesionActual();
    if (!$sesion || !in_array($sesion['rol'], $rolesPermitidos, true)) {
        header('Location: index.html');
        exit;
    }
}