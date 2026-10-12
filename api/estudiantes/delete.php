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

$checkNotas = $pdo->prepare("SELECT id FROM nota WHERE estudiante_id = ? LIMIT 1");
$checkNotas->execute([$id]);
if ($checkNotas->fetch()) {
    sendError("No se puede eliminar: el estudiante tiene notas registradas", 409);
}

// Avisar si tiene comentarios: se borran en cascada por el FK (ON DELETE CASCADE),
// así que sin esta confirmación el admin no se entera de que se pierden (DEF-07).
if (empty($data['confirmar_comentarios'])) {
    $checkComentarios = $pdo->prepare("SELECT COUNT(*) FROM comentario WHERE estudiante_id = ?");
    $checkComentarios->execute([$id]);
    $totalComentarios = (int) $checkComentarios->fetchColumn();
    if ($totalComentarios > 0) {
        sendError(
            "Este estudiante tiene $totalComentarios comentario(s) registrado(s) que se eliminarán junto con él. Confirma para continuar.",
            409,
            ["requiresConfirmation" => "comentarios", "count" => $totalComentarios]
        );
    }
}

try {
    $pdo->beginTransaction();

    $pdo->prepare("DELETE FROM matricula WHERE estudiante_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM usuario WHERE id_referencia = ? AND rol = 'estudiante'")->execute([$id]);
    $pdo->prepare("DELETE FROM estudiante WHERE id = ?")->execute([$id]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    sendError("No se pudo eliminar el estudiante", 500);
}

sendSuccess(["message" => "Estudiante eliminado"]);
?>