<?php
require_once __DIR__ . '/cors.php';
aplicarCORS($origenesPermitidos);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    http_response_code(200);
    exit;
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Capturar errores fatales y devolverlos como JSON
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => "Error interno del servidor",
        "code"    => 500
    ]);
    exit;
});  


require_once __DIR__ . '/response.php';

$cred = require __DIR__ . '/credenciales.php';

try {
    $pdo = new PDO("mysql:host={$cred['host']};dbname={$cred['db']};charset=utf8", $cred['user'], $cred['pass']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    sendError("Conexión fallida con la base de datos", 500);
}
?>