<?php
/**
 * Verificación de sesión en servidor para páginas HTML de /frontend.
 * No reutiliza db.php porque ese archivo fija cabeceras JSON/CORS
 * que romperían la respuesta HTML.
 */
function verificarSesionPagina($rolesPermitidos): void {
    if (!is_array($rolesPermitidos)) $rolesPermitidos = [$rolesPermitidos];

    $token = $_COOKIE['sesion_token'] ?? null;
    if (!$token) {
        header('Location: index.html');
        exit;
    }

    try {
        $pdo = new PDO("mysql:host=localhost;dbname=gestion_escolar;charset=utf8", "root", "");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        header('Location: index.html');
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT u.rol
        FROM sesion s
        JOIN usuario u ON s.usuario_id = u.id
        WHERE s.token = ? AND s.activa = 1 AND s.expires_at > NOW()
    ");
    $stmt->execute([$token]);
    $sesion = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$sesion || !in_array($sesion['rol'], $rolesPermitidos, true)) {
        header('Location: index.html');
        exit;
    }
}