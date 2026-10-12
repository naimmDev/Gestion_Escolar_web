<?php
require '../config/db.php';

// Forzar respuesta JSON incluso en errores fatales
error_reporting(E_ALL);
ini_set('display_errors', 0); // No mostrar errores en pantalla, solo en log

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError("Método no permitido", 405);
}

$data = getJsonBody(); // Función que decodifica JSON y maneja errores de parseo

if (empty($data['identificacion']) || empty($data['respuesta']) || empty($data['password_nueva']) || empty($data['pregunta_id'])) {
    sendError("Faltan datos requeridos (identificación, pregunta, respuesta o nueva contraseña)", 400);
}

$identificacion = trim($data['identificacion']);
$respuesta      = trim($data['respuesta']);
$passwordNueva  = trim($data['password_nueva']);
$preguntaId     = $data['pregunta_id'];

if (strlen($passwordNueva) < 6) {
    sendError("La nueva contraseña debe tener al menos 6 caracteres", 400);
}

// Mensaje genérico único para todo fallo de este flujo: identificación inexistente,
// pregunta que no corresponde al usuario, o respuesta incorrecta. Así no se puede
// usar este endpoint para averiguar qué identificaciones están registradas (DEF-01).
$errorGenerico = "Identificación, pregunta o respuesta incorrecta";

// Buscar usuario por identificación
$stmt = $pdo->prepare("
    SELECT u.id, u.intentos_fallidos, u.bloqueado_hasta FROM usuario u
    JOIN estudiante e ON u.id_referencia = e.id AND u.rol = 'estudiante'
    WHERE e.identificacion = ?
    UNION
    SELECT u.id, u.intentos_fallidos, u.bloqueado_hasta FROM usuario u
    JOIN profesor p ON u.id_referencia = p.id AND u.rol = 'profesor'
    WHERE p.identificacion = ?
");
$stmt->execute([$identificacion, $identificacion]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    // No revelamos que la identificación no existe: mismo mensaje y código que
    // una respuesta incorrecta.
    sendError($errorGenerico, 401);
}

// Misma lógica de bloqueo que login.php, reutilizando las columnas de usuario
// (el contador es por cuenta, no por IP).
if ($user['bloqueado_hasta'] !== null && strtotime($user['bloqueado_hasta']) > time()) {
    $minutosRestantes = (int) ceil((strtotime($user['bloqueado_hasta']) - time()) / 60);
    sendError("Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en $minutosRestantes minuto(s).", 429);
}

// Obtener el hash de la respuesta para la pregunta específica que el usuario
// tiene configurada con ese pregunta_id (si no coincide, $storedHash queda null
// y cae al mismo mensaje genérico que una respuesta incorrecta).
$stmt = $pdo->prepare("
    SELECT respuesta_hash FROM usuario_pregunta
    WHERE usuario_id = ? AND pregunta_id = ?
");
$stmt->execute([$user['id'], $preguntaId]); 
$storedHash = $stmt->fetchColumn();

$respuestaValida = $storedHash && password_verify(strtolower($respuesta), $storedHash);

if (!$respuestaValida) {
    $intentos = $user['intentos_fallidos'] + 1;

    if ($intentos >= MAX_INTENTOS) {
        $bloqueadoHasta = date('Y-m-d H:i:s', strtotime('+' . MINUTOS_BLOQUEO . ' minutes'));
        $pdo->prepare("UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = ? WHERE id = ?")
            ->execute([$bloqueadoHasta, $user['id']]);
    } else {
        $pdo->prepare("UPDATE usuario SET intentos_fallidos = ? WHERE id = ?")
            ->execute([$intentos, $user['id']]);
    }

    sendError($errorGenerico, 401);
}

// Éxito: resetear contador de intentos, actualizar contraseña e invalidar
// todas las sesiones activas de este usuario (por si alguien más las tenía abiertas).
$newHash = password_hash($passwordNueva, PASSWORD_BCRYPT, ['cost' => 12]);

$pdo->prepare("UPDATE usuario SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?")
    ->execute([$newHash, $user['id']]);

$pdo->prepare("UPDATE sesion SET activa = 0 WHERE usuario_id = ?")
    ->execute([$user['id']]);

sendSuccess(["message" => "Contraseña actualizada correctamente"]);
?>
