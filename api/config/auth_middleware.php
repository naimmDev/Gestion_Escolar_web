<?php
function getAuthToken(): ?string {
    return $_COOKIE['sesion_token'] ?? null;
}

function validateToken(PDO $pdo): array {
    $token = getAuthToken();

    if (!$token) {
        sendError("Token no proporcionado", 401);
    }

    $stmt = $pdo->prepare("
        SELECT s.id AS sesion_id, s.token,
               u.id AS usuario_id, u.rol, u.nombre, u.id_referencia
        FROM sesion s
        JOIN usuario u ON s.usuario_id = u.id
        WHERE s.token = ? AND s.activa = 1 AND s.expires_at > NOW()
    ");
    $stmt->execute([$token]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        sendError("Token inválido o expirado", 401);
    }

    return $session;
}

function requireRole(PDO $pdo, $roles): void {
    global $authUser;
    if (!is_array($roles)) $roles = [$roles];

    if (!in_array($authUser['rol'], $roles)) {
        sendError("No tienes permisos para esta acción", 403);
    }
}

global $authUser;
$authUser = validateToken($pdo);
?>