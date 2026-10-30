<?php
require '../config/db.php';
require '../config/auth_middleware.php';
require '../helpers/nombres.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    requireRole($pdo, 'admin');

    $page    = max(1, intval($_GET['page']     ?? 1));
    $perPage = max(1, min(100, intval($_GET['per_page'] ?? 10)));
    $search  = trim($_GET['search'] ?? '');
    $grado   = trim($_GET['grado']   ?? '');
    $seccion = trim($_GET['seccion'] ?? '');
    $offset  = ($page - 1) * $perPage;

    // ===== Modo ligero: solo las secciones existentes (opcionalmente filtrando por grado) =====
    // Debe ir ANTES de $whereSQL y de la consulta paginada.
    // Devuelve: ["A", "B", "C"] (array de strings).
    if (!empty($_GET['secciones'])) {
        $sqlSec = "SELECT DISTINCT UPPER(TRIM(seccion)) AS s FROM estudiante
                   WHERE seccion IS NOT NULL AND TRIM(seccion) <> ''";
        $pSec = [];
        if ($grado !== '') {
            $sqlSec .= " AND grado = ?";
            $pSec[] = $grado;
        }
        $sqlSec .= " ORDER BY s";
        $stSec = $pdo->prepare($sqlSec);
        $stSec->execute($pSec);
        sendSuccess($stSec->fetchAll(PDO::FETCH_COLUMN));
        exit;
    }

    // ===== Filtros de la consulta paginada =====
    $where  = [];
    $params = [];

    if ($search !== '') {
        $where[]  = "(e.nombre LIKE ? OR e.apellido LIKE ? OR CONCAT_WS(' ', e.nombre, e.apellido) LIKE ? OR e.email LIKE ? OR e.identificacion LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    if ($grado !== '') {
        $where[]  = "e.grado = ?";
        $params[] = $grado;
    }

    if ($seccion !== '') {
        $where[]  = "UPPER(TRIM(e.seccion)) = UPPER(?)";
        $params[] = $seccion;
    }

    $whereSQL = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM estudiante e $whereSQL");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT e.id, CONCAT_WS(' ', e.nombre, e.apellido) AS name, e.nombre AS firstName, e.apellido AS lastName, e.email, e.identificacion, e.grado AS grade,
               e.seccion,
               CASE WHEN u.password_cambiada = 1 THEN NULL ELSE e.password_inicial END AS initialPassword
        FROM estudiante e
        LEFT JOIN usuario u ON u.id_referencia = e.id AND u.rol = 'estudiante'
        $whereSQL
        ORDER BY e.apellido ASC, e.nombre ASC
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
    $data = getJsonBody();
    validateRequired($data, ['email', 'identificacion']);
    [$nombre, $apellido, $nombreCompleto] = leerNombreApellido($data);

    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        sendError("Email no válido", 400);
    }

    if (!empty($data['initialPassword']) && strlen($data['initialPassword']) < 6) {
        sendError("La contraseña inicial debe tener al menos 6 caracteres", 400);
    }

    $check = $pdo->prepare("SELECT id FROM estudiante WHERE identificacion = ? OR email = ?");
    $check->execute([$data['identificacion'], $data['email']]);
    if ($check->fetch()) {
        sendError("Ya existe un estudiante con ese email o identificación", 409);
    }

    $checkEmailUsuario = $pdo->prepare("SELECT id FROM usuario WHERE email = ?");
    $checkEmailUsuario->execute([$data['email']]);
    if ($checkEmailUsuario->fetch()) {
        sendError("Ya existe una cuenta con ese email", 409);
    }

    // Contraseña: usar la personalizada si viene, si no usar la identificación
    $passwordPlain = !empty($data['initialPassword'])
        ? $data['initialPassword']
        : $data['identificacion'];

    $stmt = $pdo->prepare("
        INSERT INTO estudiante (nombre, apellido, email, identificacion, grado, seccion, password_inicial)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $nombre, $apellido, $data['email'], $data['identificacion'],
        $data['grade'] ?? null, $data['seccion'] ?? null, $passwordPlain
    ]);
    $estudianteId = $pdo->lastInsertId();

    $passwordHash = password_hash($passwordPlain, PASSWORD_BCRYPT, ['cost' => 12]);
    $userCheck = $pdo->prepare("SELECT id FROM usuario WHERE email = ?");
    $userCheck->execute([$data['email']]);
    if (!$userCheck->fetch()) {
        $pdo->prepare("INSERT INTO usuario (email, password_hash, rol, nombre, id_referencia) VALUES (?, ?, 'estudiante', ?, ?)")
            ->execute([$data['email'], $passwordHash, $nombreCompleto, $estudianteId]);
    }

    sendCreated([
        "id"              => $estudianteId,
        "initialPassword" => $passwordPlain,
        "message"         => "Estudiante creado. Contraseña inicial: $passwordPlain"
    ]);
}

elseif ($method === 'PUT') {
    requireRole($pdo, 'admin');
    $data = getJsonBody();
    validateRequired($data, ['id', 'email', 'identificacion']);
    [$nombre, $apellido, $nombreCompleto] = leerNombreApellido($data);

    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        sendError("Email no válido", 400);
    }

    if (!empty($data['initialPassword']) && strlen($data['initialPassword']) < 6) {
        sendError("La contraseña inicial debe tener al menos 6 caracteres", 400);
    }

    $check = $pdo->prepare("SELECT id FROM estudiante WHERE (identificacion = ? OR email = ?) AND id != ?");
    $check->execute([$data['identificacion'], $data['email'], $data['id']]);
    if ($check->fetch()) {
        sendError("Ese email o identificación ya está en uso", 409);
    }

    $checkEmailUsuario = $pdo->prepare("SELECT id FROM usuario WHERE email = ? AND NOT (id_referencia = ? AND rol = 'estudiante')");
    $checkEmailUsuario->execute([$data['email'], $data['id']]);
    if ($checkEmailUsuario->fetch()) {
        sendError("Ya existe una cuenta con ese email", 409);
    }

    $passwordPlain = !empty($data['initialPassword']) ? $data['initialPassword'] : null;

    $pdo->prepare("
        UPDATE estudiante SET nombre=?, apellido=?, email=?, identificacion=?, grado=?, seccion=?,
        password_inicial = COALESCE(?, password_inicial)
        WHERE id=?
    ")->execute([
        $nombre, $apellido, $data['email'], $data['identificacion'],
        $data['grade'] ?? null, $data['seccion'] ?? null,
        $passwordPlain, $data['id']
    ]);

    $pdo->prepare("UPDATE usuario SET email=?, nombre=? WHERE id_referencia=? AND rol='estudiante'")
        ->execute([$data['email'], $nombreCompleto, $data['id']]);

    if ($passwordPlain) {
        $newHash = password_hash($passwordPlain, PASSWORD_BCRYPT, ['cost' => 12]);
        $pdo->prepare("UPDATE usuario SET password_hash=?, password_cambiada=0, preguntas_configuradas=0 WHERE id_referencia=? AND rol='estudiante'")
            ->execute([$newHash, $data['id']]);
        $usuarioStmt = $pdo->prepare("SELECT id FROM usuario WHERE id_referencia=? AND rol='estudiante'");
        $usuarioStmt->execute([$data['id']]);
        $usuarioId = $usuarioStmt->fetchColumn();
        if ($usuarioId) {
            $pdo->prepare("DELETE FROM usuario_pregunta WHERE usuario_id=?")->execute([$usuarioId]);
        }
    }

    sendSuccess(["message" => "Estudiante actualizado"]);
}

else {
    sendError("Método no permitido", 405);
}