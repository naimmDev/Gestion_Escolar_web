<?php
require '../config/db.php';
require '../config/auth_middleware.php';

//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError("Método no permitido", 405);
}

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['password_actual']) || empty($data['password_nueva'])) {
    sendError("Se requieren la contraseña actual y la nueva", 400);
}

if (strlen($data['password_nueva']) < 6) {
    sendError("La nueva contraseña debe tener al menos 6 caracteres", 400);
}

// Verificar que la contraseña actual sea correcta
$stmt = $pdo->prepare("SELECT password_hash FROM usuario WHERE id = ?");
$stmt->execute([$authUser['usuario_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($data['password_actual'], $user['password_hash'])) {
    sendError("La contraseña actual es incorrecta", 401);
}

if ($data['password_actual'] === $data['password_nueva']) {
    sendError("La nueva contraseña no puede ser igual a la actual", 400);
}

$newHash = password_hash($data['password_nueva'], PASSWORD_BCRYPT, ['cost' => 12]);

$pdo->prepare("UPDATE usuario SET password_hash = ?, password_cambiada = 1 WHERE id = ?")
    ->execute([$newHash, $authUser['usuario_id']]);

sendSuccess(["message" => "Contraseña actualizada correctamente"]);