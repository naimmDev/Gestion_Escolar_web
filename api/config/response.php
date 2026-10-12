<?php
/**
 * Helper centralizado para respuestas JSON uniformes.
 * Todos los endpoints lo usan en lugar de echo json_encode() directo.
 */

function sendSuccess($data = [], int $code = 200): void {
    http_response_code($code);
    echo json_encode([
        "success" => true,
        "data"    => $data
    ]);
    exit;
}

function sendError(string $message, int $code = 400, array $details = []): void {
    http_response_code($code);
    $body = [
        "success" => false,
        "error"   => $message,
        "code"    => $code
    ];
    if (!empty($details)) $body["details"] = $details;
    echo json_encode($body);
    exit;
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