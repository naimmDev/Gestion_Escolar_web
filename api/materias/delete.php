<?php
require '../config/db.php';
require '../config/auth_middleware.php';
requireRole($pdo, 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendError("Método no permitido", 405);
}

$data = getJsonBody();
$id   = $data['id'] ?? null;

if (!$id) sendError("ID requerido", 400);

$checkNotas = $pdo->prepare("SELECT id FROM nota WHERE materia_id = ? LIMIT 1");
$checkNotas->execute([$id]);
if ($checkNotas->fetch()) {
    sendError("No se puede eliminar: la materia tiene calificaciones activas", 409);
}

if (empty($data['confirmar_comentarios'])) {
    $checkComentarios = $pdo->prepare("SELECT COUNT(*) FROM comentario WHERE materia_id = ?");
    $checkComentarios->execute([$id]);
    $totalComentarios = (int) $checkComentarios->fetchColumn();
    if ($totalComentarios > 0) {
        sendError(
            "Esta materia tiene $totalComentarios comentario(s) registrado(s) que se eliminarán junto con ella. Confirma para continuar.",
            409,
            ["requiresConfirmation" => "comentarios", "count" => $totalComentarios]
        );
    }
}

try {
    $pdo->beginTransaction();

    $pdo->prepare("DELETE FROM matricula WHERE materia_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM materia WHERE id = ?")->execute([$id]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    sendError("No se pudo eliminar la materia", 500);
}

sendSuccess(["message" => "Materia eliminada"]);
?>