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

$checkNotas = $pdo->prepare("SELECT id FROM nota WHERE profesor_id = ? LIMIT 1");
$checkNotas->execute([$id]);
if ($checkNotas->fetch()) {
    sendError("No se puede eliminar: el profesor tiene notas registradas", 409);
}

try {
    $pdo->beginTransaction();

    $pdo->prepare("UPDATE materia SET profesor_id = NULL WHERE profesor_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM usuario WHERE id_referencia = ? AND rol = 'profesor'")->execute([$id]);
    $pdo->prepare("DELETE FROM profesor WHERE id = ?")->execute([$id]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    sendError("No se pudo eliminar el profesor", 500);
}

sendSuccess(["message" => "Profesor eliminado"]);
?>