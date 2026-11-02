<?php
require '../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError("Método no permitido", 405);
}

$cred = require '../config/credenciales.php';
$c = is_array($cred['contacto_admin'] ?? null) ? $cred['contacto_admin'] : [];

sendSuccess([
    "correo"   => $c['correo']   ?? null,
    "telefono" => $c['telefono'] ?? null,
    "horario"  => $c['horario']  ?? null
]);