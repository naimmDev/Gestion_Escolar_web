<?php
require '../config/db.php';
require '../config/auth_middleware.php';
require '../helpers/mail/correo.php';

//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    requireRole($pdo, ['admin', 'profesor', 'estudiante']);

    $where = []; $params = [];

    if ($authUser['rol'] === 'estudiante') {
        $where[] = "c.estudiante_id = ?"; $params[] = $authUser['id_referencia'];
    } elseif ($authUser['rol'] === 'profesor') {
        $where[] = "m.profesor_id = ?"; $params[] = $authUser['id_referencia'];
    }

    $whereSQL = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT c.id, c.estudiante_id, c.materia_id, c.comentario, c.fecha,
               CONCAT_WS(' ', e.nombre, e.apellido) AS estudiante_nombre, m.nombre AS materia_nombre
        FROM comentario c
        JOIN estudiante e ON c.estudiante_id = e.id
        JOIN materia    m ON c.materia_id    = m.id
        $whereSQL
        ORDER BY c.fecha DESC
    ");
    $stmt->execute($params);
    sendSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
}

elseif ($method === 'POST') {
    requireRole($pdo, 'estudiante');
    $data = getJsonBody();
    if (isset($data['comentario'])) {
        $data['comentario'] = trim($data['comentario']);
    }
    validateRequired($data, ['materia_id', 'comentario']);

    $check = $pdo->prepare("SELECT id FROM matricula WHERE estudiante_id = ? AND materia_id = ?");
    $check->execute([$authUser['id_referencia'], $data['materia_id']]);
    if (!$check->fetch()) sendError("No estás matriculado en esta materia", 403);

    $pdo->prepare("INSERT INTO comentario (estudiante_id, materia_id, comentario, fecha) VALUES (?, ?, ?, NOW())")
        ->execute([$authUser['id_referencia'], $data['materia_id'], $data['comentario']]);
    $comentarioId = $pdo->lastInsertId();

    // Aviso al profesor de la materia (si el correo falla, el comentario igual queda guardado)
    $dest = $pdo->prepare("SELECT CONCAT_WS(' ', p.nombre, p.apellido) AS profesor, p.email, m.nombre AS materia,
                                  (SELECT CONCAT_WS(' ', nombre, apellido) FROM estudiante WHERE id = ?) AS estudiante
                           FROM materia m JOIN profesor p ON p.id = m.profesor_id WHERE m.id = ?");
    $dest->execute([$authUser['id_referencia'], $data['materia_id']]);
    if ($d = $dest->fetch(PDO::FETCH_ASSOC)) {
        enviarCorreo($pdo, 'comentario_nuevo', $d['email'],
            plantillaComentarioNuevo($d['profesor'], $d['estudiante'] ?? 'Un estudiante', $d['materia'], $data['comentario']));
    }

    sendCreated(["id" => $comentarioId]);
}

else {
    sendError("Método no permitido", 405);
}
?>