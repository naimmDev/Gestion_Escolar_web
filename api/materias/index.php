<?php
require '../config/db.php';
require '../config/auth_middleware.php';

//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    requireRole($pdo, ['admin', 'profesor', 'estudiante']);

    if ($authUser['rol'] !== 'admin') {
        $stmt = $pdo->query("
            SELECT id, nombre AS name, codigo AS code, creditos AS credits, profesor_id AS teacherId
            FROM materia ORDER BY nombre ASC
        ");
        sendSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    $page    = max(1, intval($_GET['page']     ?? 1));
    $perPage = max(1, min(100, intval($_GET['per_page'] ?? 10)));
    $search  = trim($_GET['search'] ?? '');
    $offset  = ($page - 1) * $perPage;

    $where  = [];
    $params = [];

    if ($search !== '') {
        $where[]  = "(nombre LIKE ? OR codigo LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $whereSQL = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM materia $whereSQL");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    // LIMIT y OFFSET como enteros directos, no como parámetros
    $stmt = $pdo->prepare("
        SELECT id, nombre AS name, codigo AS code, creditos AS credits, profesor_id AS teacherId
        FROM materia
        $whereSQL
        ORDER BY nombre ASC
        LIMIT $perPage OFFSET $offset
    ");
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
    validateRequired($data, ['name', 'code']);

    $check = $pdo->prepare("SELECT id FROM materia WHERE codigo = ?");
    $check->execute([$data['code']]);
    if ($check->fetch()) {
        sendError("Ya existe una materia con ese código", 409);
    }

    $stmt = $pdo->prepare("INSERT INTO materia (nombre, codigo, creditos, profesor_id) VALUES (?, ?, ?, ?)");
    $stmt->execute([$data['name'], $data['code'], $data['credits'] ?? 3, $data['teacherId'] ?? null]);

    sendCreated(["id" => $pdo->lastInsertId()]);
}

elseif ($method === 'PUT') {
    requireRole($pdo, 'admin');
    $data = json_decode(file_get_contents("php://input"), true);
    validateRequired($data, ['id', 'name', 'code']);

    $check = $pdo->prepare("SELECT id FROM materia WHERE codigo = ? AND id != ?");
    $check->execute([$data['code'], $data['id']]);
    if ($check->fetch()) {
        sendError("Ese código ya está en uso", 409);
    }

    $pdo->prepare("UPDATE materia SET nombre=?, codigo=?, creditos=?, profesor_id=? WHERE id=?")
        ->execute([$data['name'], $data['code'], $data['credits'] ?? 3, $data['teacherId'] ?? null, $data['id']]);

    sendSuccess(["message" => "Materia actualizada"]);
}

else {
    sendError("Método no permitido", 405);
}
?>