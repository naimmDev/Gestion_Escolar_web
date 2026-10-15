<?php
require '../config/db.php';
require '../config/auth_middleware.php';

//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    requireRole($pdo, ['admin', 'profesor', 'estudiante']);

    $where  = [];
    $params = [];

    if ($authUser['rol'] === 'estudiante') {
        $where[]  = "m.estudiante_id = ?";
        $params[] = $authUser['id_referencia'];
    } elseif ($authUser['rol'] === 'profesor') {
        $where[]  = "s.profesor_id = ?";
        $params[] = $authUser['id_referencia'];
    }

    if ($authUser['rol'] === 'admin') {
        $search = trim($_GET['search'] ?? '');
        if ($search !== '') {
            $where[]  = "(e.nombre LIKE ? OR s.nombre LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
    }

    $whereSQL = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

    $baseQuery = "
        FROM matricula m
        JOIN estudiante e ON m.estudiante_id = e.id
        JOIN materia    s ON m.materia_id    = s.id
        LEFT JOIN profesor p ON s.profesor_id = p.id
        $whereSQL
    ";

    $selectFields = "
        SELECT m.id, m.estudiante_id AS studentId, m.materia_id AS subjectId,
           m.fecha_asignacion AS enrollmentDate,
           e.nombre AS studentName, e.grado AS studentGrade, e.email AS studentEmail,
           e.seccion AS studentSeccion,
           s.nombre AS subjectName, s.codigo AS subjectCode,
           p.nombre AS teacherName
    ";

    // Profesor y estudiante reciben todo sin paginar
    if ($authUser['rol'] !== 'admin') {
        $stmt = $pdo->prepare("$selectFields $baseQuery ORDER BY e.nombre ASC");
        $stmt->execute($params);
        sendSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    $page    = max(1, intval($_GET['page']     ?? 1));
    $perPage = max(1, min(100, intval($_GET['per_page'] ?? 10)));
    $offset  = ($page - 1) * $perPage;

    $countStmt = $pdo->prepare("SELECT COUNT(*) $baseQuery");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("$selectFields $baseQuery ORDER BY e.nombre ASC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);

    sendSuccess([
        "items"       => $stmt->fetchAll(PDO::FETCH_ASSOC),
        "total"       => $total,
        "page"        => $page,
        "per_page"    => $perPage,
        "total_pages" => (int) ceil($total / $perPage)
    ]);
}

elseif ($method === 'POST') {
    requireRole($pdo, 'admin');
    $data = getJsonBody();
    validateRequired($data, ['studentId']);

    $subjectIds = $data['subjectIds'] ?? (isset($data['subjectId']) ? [$data['subjectId']] : []);
    if (!is_array($subjectIds) || count($subjectIds) === 0) {
        sendError("Selecciona al menos una materia", 400);
    }
    $subjectIds = array_values(array_unique(array_filter(array_map('intval', $subjectIds))));
    if (count($subjectIds) === 0 || count($subjectIds) > 50) {
        sendError("Lista de materias inválida", 400);
    }

    $checkEst = $pdo->prepare("SELECT id FROM estudiante WHERE id = ?");
    $checkEst->execute([$data['studentId']]);
    if (!$checkEst->fetch()) sendError("El estudiante no existe", 404);

    $checkMat = $pdo->prepare("SELECT id FROM materia WHERE id = ?");
    $check    = $pdo->prepare("SELECT id FROM matricula WHERE estudiante_id = ? AND materia_id = ?");
    $insert   = $pdo->prepare("INSERT INTO matricula (estudiante_id, materia_id, fecha_asignacion) VALUES (?, ?, CURDATE())");

    $creadas = 0;
    $omitidas = 0;
    $ultimoId = null;

    try {
        $pdo->beginTransaction();
        foreach ($subjectIds as $sid) {
            $checkMat->execute([$sid]);
            if (!$checkMat->fetch()) {
                $pdo->rollBack();
                sendError("Una de las materias no existe", 404);
            }
            $check->execute([$data['studentId'], $sid]);
            if ($check->fetch()) { $omitidas++; continue; }

            $insert->execute([$data['studentId'], $sid]);
            $ultimoId = $pdo->lastInsertId();
            $creadas++;
        }
        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        sendError("No se pudo crear la matrícula", 500);
    }

    if ($creadas === 0) {
        sendError("Este estudiante ya está matriculado en las materias seleccionadas", 409);
    }

    sendCreated(["id" => $ultimoId, "created" => $creadas, "skipped" => $omitidas]);
}

elseif ($method === 'DELETE') {
    requireRole($pdo, 'admin');
    $data = getJsonBody();
    $id   = $data['id'] ?? null;

    if (!$id) sendError("ID requerido", 400);

    $check = $pdo->prepare("SELECT id FROM matricula WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) sendError("Matrícula no encontrada", 404);

    $pdo->prepare("DELETE FROM matricula WHERE id = ?")->execute([$id]);
    sendSuccess(["message" => "Matrícula eliminada"]);
}

else {
    sendError("Método no permitido", 405);
}
?>