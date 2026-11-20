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
               c.fecha_lectura, c.respuesta, c.fecha_respuesta,
               CASE
                   WHEN c.respuesta IS NOT NULL THEN 'respondido'
                   WHEN c.fecha_lectura IS NOT NULL THEN 'leido'
                   ELSE 'nuevo'
               END AS estado,
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
        enviarCorreoDiferido($pdo, 'comentario_nuevo', $d['email'],
            plantillaComentarioNuevo($d['profesor'], $d['estudiante'] ?? 'Un estudiante', $d['materia']));
    }

    sendCreated(["id" => $comentarioId]);
}

elseif ($method === 'PUT') {
    requireRole($pdo, 'profesor');
    $data = getJsonBody();
    validateRequired($data, ['id', 'accion']);

    $comentarioId = filter_var($data['id'], FILTER_VALIDATE_INT);
    if (!$comentarioId || $comentarioId < 1) sendError("ID de comentario no válido", 400);
    if (!in_array($data['accion'], ['leer', 'responder'], true)) {
        sendError("Acción de comentario no válida", 400);
    }

    if ($data['accion'] === 'leer') {
        try {
            $pdo->beginTransaction();
            $check = $pdo->prepare("
                SELECT c.respuesta
                FROM comentario c
                JOIN materia m ON m.id = c.materia_id
                WHERE c.id = ? AND m.profesor_id = ?
                FOR UPDATE
            ");
            $check->execute([$comentarioId, $authUser['id_referencia']]);
            $comentario = $check->fetch(PDO::FETCH_ASSOC);
            if (!$comentario) {
                $pdo->rollBack();
                sendError("Comentario no encontrado", 404);
            }

            if ($comentario['respuesta'] === null) {
                $pdo->prepare("UPDATE comentario SET fecha_lectura = COALESCE(fecha_lectura, NOW()) WHERE id = ?")
                    ->execute([$comentarioId]);
            }
            $pdo->commit();
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('Marcar comentario como leído: ' . $e->getMessage());
            sendError("No se pudo actualizar el comentario", 500);
        }

        sendSuccess([
            "id" => $comentarioId,
            "estado" => $comentario['respuesta'] === null ? 'leido' : 'respondido'
        ]);
    }

    validateRequired($data, ['respuesta']);
    if (!is_string($data['respuesta'])) sendError("La respuesta debe ser texto", 400);
    $respuesta = trim($data['respuesta']);
    if ($respuesta === '') sendError("La respuesta no puede estar vacía", 400);
    if (mb_strlen($respuesta) > 2000) sendError("La respuesta no puede superar 2000 caracteres", 400);

    try {
        $pdo->beginTransaction();

        $dest = $pdo->prepare("
            SELECT c.respuesta, e.email AS estudiante_email,
                   CONCAT_WS(' ', e.nombre, e.apellido) AS estudiante_nombre,
                   CONCAT_WS(' ', p.nombre, p.apellido) AS profesor_nombre,
                   m.nombre AS materia_nombre
            FROM comentario c
            JOIN estudiante e ON e.id = c.estudiante_id
            JOIN materia m ON m.id = c.materia_id
            JOIN profesor p ON p.id = m.profesor_id
            WHERE c.id = ? AND p.id = ?
            FOR UPDATE
        ");
        $dest->execute([$comentarioId, $authUser['id_referencia']]);
        $comentario = $dest->fetch(PDO::FETCH_ASSOC);
        if (!$comentario) {
            $pdo->rollBack();
            sendError("Comentario no encontrado", 404);
        }
        if ($comentario['respuesta'] !== null) {
            $pdo->rollBack();
            sendError("Este comentario ya fue respondido", 409);
        }

        $pdo->prepare("
            UPDATE comentario
            SET respuesta = ?, fecha_respuesta = NOW(),
                fecha_lectura = COALESCE(fecha_lectura, NOW())
            WHERE id = ? AND respuesta IS NULL
        ")->execute([$respuesta, $comentarioId]);
        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Responder comentario: ' . $e->getMessage());
        sendError("No se pudo guardar la respuesta", 500);
    }

    enviarCorreoDiferido(
        $pdo,
        'comentario_respondido',
        $comentario['estudiante_email'],
        plantillaRespuestaComentario(
            $comentario['estudiante_nombre'],
            $comentario['profesor_nombre'],
            $comentario['materia_nombre']
        )
    );

    sendSuccess(["id" => $comentarioId, "estado" => "respondido"]);
}

else {
    sendError("Método no permitido", 405);
}
?>