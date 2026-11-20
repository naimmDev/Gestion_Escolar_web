<?php
$origenesPermitidos = [
    // Orígenes para desarrollo local cuando frontend y API están separados.
    // En producción, frontend y API bajo el mismo origen no requieren CORS.
    'http://localhost',
    'http://localhost:3000',
];

function aplicarCORS(array $origenesPermitidos): void
{
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origen, $origenesPermitidos, true)) {
        header("Access-Control-Allow-Origin: $origen");
    }
    header("Access-Control-Allow-Credentials: true");
}