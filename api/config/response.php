<?php
/**
 * Helper centralizado para respuestas JSON uniformes.
 * Todos los endpoints lo usan en lugar de echo json_encode() directo.
 */

function emitirJson(array $body, int $code): void {
    http_response_code($code);
    $json = json_encode($body);
    if (function_exists('hayCorreosPendientes') && hayCorreosPendientes()) {
        // Cierra la conexión con el navegador; los correos se envían después (shutdown function)
        ignore_user_abort(true);
        header('Content-Length: ' . strlen($json));
        header('Connection: close');
        echo $json;
        while (ob_get_level() > 0) ob_end_flush();
        flush();
        if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    } else {
        echo $json;
    }
    exit;
}

function sendSuccess($data = [], int $code = 200): void {
    emitirJson(["success" => true, "data" => $data], $code);
}

function sendError(string $message, int $code = 400, array $details = []): void {
    $body = ["success" => false, "error" => $message, "code" => $code];
    if (!empty($details)) $body["details"] = $details;
    emitirJson($body, $code);
}

function sendCreated($data = []): void {
    sendSuccess($data, 201);
}

function validateRequired(array $data, array $fields): void {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
            $missing[] = $field;
        }
    }
    if (!empty($missing)) {
        sendError("Campos obligatorios faltantes", 400, ["campos" => $missing]);
    }
}


function getJsonBody(): array {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!is_array($data)) {
        sendError("Cuerpo de la petición inválido", 400);
    }
    return $data;
}
?>