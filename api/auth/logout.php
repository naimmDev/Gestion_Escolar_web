<?php
require '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError("Método no permitido", 405);
}

$token = $_COOKIE['sesion_token'] ?? null;

if ($token) {
    $pdo->prepare("UPDATE sesion SET activa = 0 WHERE token = ?")
        ->execute([$token]);
}

setcookie('sesion_token', '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);

sendSuccess(["message" => "Sesión cerrada"]);
?>