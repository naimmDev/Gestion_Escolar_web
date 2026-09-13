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
    $data = json_decode(file_get_contents("php://input"), true);
    validateRequired($data, ['studentId', 'subjectId']);

    $checkEst = $pdo->prepare("SELECT id FROM estudiante WHERE id = ?");
    $checkEst->execute([$data['studentId']]);
    if (!$checkEst->fetch()) sendError("El estudiante no existe", 404);

    $checkMat = $pdo->prepare("SELECT id FROM materia WHERE id = ?");
    $checkMat->execute([$data['subjectId']]);
    if (!$checkMat->fetch()) sendError("La materia no existe", 404);

    $check = $pdo->prepare("SELECT id FROM matricula WHERE estudiante_id = ? AND materia_id = ?");
    $check->execute([$data['studentId'], $data['subjectId']]);
    if ($check->fetch()) sendError("Este estudiante ya está matriculado en esta materia", 409);

    $pdo->prepare("INSERT INTO matricula (estudiante_id, materia_id, fecha_asignacion) VALUES (?, ?, CURDATE())")
        ->execute([$data['studentId'], $data['subjectId']]);

    sendCreated(["id" => $pdo->lastInsertId()]);
}

elseif ($method === 'DELETE') {
    requireRole($pdo, 'admin');
    $data = json_decode(file_get_contents("php://input"), true);
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