<?php
$origenesPermitidos = [
    'http://localhost',
    'http://localhost:3000',
    //aquí irá el dominio real cuando se despliegue
];

function aplicarCORS(array $origenesPermitidos): void
{
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origen, $origenesPermitidos, true)) {
        header("Access-Control-Allow-Origin: $origen");
    }
    header("Access-Control-Allow-Credentials: true");
}