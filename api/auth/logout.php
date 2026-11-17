<?php
require '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError("Método no permitido", 405);
}

$token = $_COOKIE['sesion_token'] ?? null;

if ($token) {
    $pdo->prepare("UPDATE sesion SET activa = 0 WHERE token = ?")
        ->execute([hash('sha256', $token)]);
}

cookieSesion('', time() - 3600);

sendSuccess(["message" => "Sesión cerrada"]);
?>