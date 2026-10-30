<?php
/**
 * Nombre y apellido de estudiantes/profesores.
 * Valida firstName/lastName del body y devuelve [nombre, apellido, nombreCompleto].
 * El nombre completo ("Nombre Apellido") es lo que se guarda en usuario.nombre.
 */
function leerNombreApellido(array $data): array {
    $nombre   = trim((string)($data['firstName'] ?? ''));
    $apellido = trim((string)($data['lastName']  ?? ''));
    $faltan = [];
    if ($nombre === '')   $faltan[] = 'firstName';
    if ($apellido === '') $faltan[] = 'lastName';
    if ($faltan) {
        sendError("Campos obligatorios faltantes", 400, ["campos" => $faltan]);
    }
    if (mb_strlen($nombre) > 100)   sendError("El nombre no puede superar 100 caracteres", 400);
    if (mb_strlen($apellido) > 100) sendError("El apellido no puede superar 100 caracteres", 400);
    return [$nombre, $apellido, $nombre . ' ' . $apellido];
}
