<?php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'http://localhost'));
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    http_response_code(200);
    exit;
}
require '../config/db.php';

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError("Método no permitido", 405);
}

$data     = json_decode(file_get_contents("php://input"), true);
$email    = trim($data['email']    ?? '');
$password = trim($data['password'] ?? '');

if (!$email || !$password) {
    sendError("Email y contraseña son requeridos", 400);
}

$stmt = $pdo->prepare("SELECT * FROM usuario WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Cuenta bloqueada temporalmente por demasiados intentos fallidos
if ($user && $user['bloqueado_hasta'] !== null && strtotime($user['bloqueado_hasta']) > time()) {
    $minutosRestantes = (int) ceil((strtotime($user['bloqueado_hasta']) - time()) / 60);
    sendError("Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en $minutosRestantes minuto(s).", 429);
}

$valid = false;
if ($user) {
    if (password_verify($password, $user['password_hash'])) {
        $valid = true;
    } elseif ($user['password_hash'] === hash('sha256', $password)) {
        $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $pdo->prepare("UPDATE usuario SET password_hash = ? WHERE id = ?")
            ->execute([$newHash, $user['id']]);
        $valid = true;
    }
}

if (!$valid) {
    if ($user) {
        $intentos = $user['intentos_fallidos'] + 1;

        if ($intentos >= MAX_INTENTOS) {
            $bloqueadoHasta = date('Y-m-d H:i:s', strtotime('+' . MINUTOS_BLOQUEO . ' minutes'));
            $pdo->prepare("UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = ? WHERE id = ?")
                ->execute([$bloqueadoHasta, $user['id']]);
        } else {
            $pdo->prepare("UPDATE usuario SET intentos_fallidos = ? WHERE id = ?")
                ->execute([$intentos, $user['id']]);
        }
    }
    sendError("Credenciales incorrectas", 401);
}

// Login exitoso: resetear contador y bloqueo
$pdo->prepare("UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?")
    ->execute([$user['id']]);

$pdo->prepare("UPDATE sesion SET activa = 0 WHERE usuario_id = ?")
    ->execute([$user['id']]);

$token     = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+8 hours'));

$pdo->prepare("INSERT INTO sesion (usuario_id, token, expires_at, activa) VALUES (?, ?, ?, 1)")
    ->execute([$user['id'], $token, $expiresAt]);

setcookie('sesion_token', $token, [
    'expires'  => strtotime('+8 hours'),
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);

sendSuccess([
    "rol"           => $user['rol'],
    "nombre"        => $user['nombre'],
    "id_referencia" => $user['id_referencia'],
    "password_cambiada" => (bool) $user['password_cambiada'],
    "preguntas_configuradas" => (bool) $user['preguntas_configuradas']
]);
?>