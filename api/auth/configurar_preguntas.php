<?php
require '../config/db.php';
require '../config/auth_middleware.php';

//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError("Método no permitido", 405);
}

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['preguntas']) || !is_array($data['preguntas']) || count($data['preguntas']) !== 3) {
    sendError("Se requieren exactamente 3 preguntas de seguridad", 400);
}

$preguntaIds = array_column($data['preguntas'], 'pregunta_id');
if (count(array_unique($preguntaIds)) !== 3) {
    sendError("No puedes repetir preguntas de seguridad", 400);
}

foreach ($data['preguntas'] as $item) {
    if (empty($item['pregunta_id']) || !isset($item['respuesta']) || trim($item['respuesta']) === '') {
        sendError("Cada pregunta debe tener un ID y una respuesta", 400);
    }
}

$placeholders = implode(',', array_fill(0, 3, '?'));
$check = $pdo->prepare("SELECT COUNT(*) FROM pregunta_seguridad WHERE id IN ($placeholders)");
$check->execute($preguntaIds);
if ((int)$check->fetchColumn() !== 3) {
    sendError("Una o más preguntas no son válidas", 400);
}

$pdo->prepare("DELETE FROM usuario_pregunta WHERE usuario_id = ?")
    ->execute([$authUser['usuario_id']]);

$stmt = $pdo->prepare("INSERT INTO usuario_pregunta (usuario_id, pregunta_id, respuesta_hash) VALUES (?, ?, ?)");
foreach ($data['preguntas'] as $item) {
    $hash = password_hash(strtolower(trim($item['respuesta'])), PASSWORD_BCRYPT, ['cost' => 10]);
    $stmt->execute([$authUser['usuario_id'], $item['pregunta_id'], $hash]);
}

$pdo->prepare("UPDATE usuario SET preguntas_configuradas = 1 WHERE id = ?")
    ->execute([$authUser['usuario_id']]);

sendSuccess(["message" => "Preguntas de seguridad configuradas correctamente"]);
