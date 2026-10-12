<?php
require '../config/db.php';
require '../config/auth_middleware.php';

//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError("Método no permitido", 405);
}

$data = getJsonBody();

$passwordActual = trim($data['password_actual'] ?? '');
$passwordNueva  = trim($data['password_nueva']   ?? '');

if (empty($passwordActual) || empty($passwordNueva)) {
    sendError("Se requieren la contraseña actual y la nueva", 400);
}

if (strlen($passwordNueva) < 6) {
    sendError("La nueva contraseña debe tener al menos 6 caracteres", 400);
}

// Verificar que la contraseña actual sea correcta
$stmt = $pdo->prepare("SELECT password_hash FROM usuario WHERE id = ?");
$stmt->execute([$authUser['usuario_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($passwordActual, $user['password_hash'])) {
    sendError("La contraseña actual es incorrecta", 401);
}

if ($passwordActual === $passwordNueva) {
    sendError("La nueva contraseña no puede ser igual a la actual", 400);
}

$newHash = password_hash($passwordNueva, PASSWORD_BCRYPT, ['cost' => 12]);

$pdo->prepare("UPDATE usuario SET password_hash = ?, password_cambiada = 1 WHERE id = ?")
    ->execute([$newHash, $authUser['usuario_id']]);

sendSuccess(["message" => "Contraseña actualizada correctamente"]);