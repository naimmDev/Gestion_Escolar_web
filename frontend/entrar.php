<?php
// Puerta de entrada de la app instalada (start_url del manifest):
// con sesión vigente va directo al panel; sin ella, al login.
require_once '../api/config/verificar_sesion_pagina.php';

header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

$sesion = datosSesionActual();
header('Location: ' . ($sesion ? rutaInicialPorSesion($sesion) : 'index.html'));
exit;