<?php
require '../config/db.php';
require '../config/auth_middleware.php';
require '../helpers/periodos.php';
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

$method = $_SERVER['REQUEST_METHOD'];

function listarPeriodos(PDO $pdo): array {
    $rows = $pdo->query("SELECT id, trimestre, estado, fecha_inicio, fecha_fin, fecha_actualizacion FROM periodo")
                ->fetchAll(PDO::FETCH_ASSOC);
    usort($rows, fn($a, $b) => array_search($a['trimestre'], TRIMESTRES_PERIODO) <=> array_search($b['trimestre'], TRIMESTRES_PERIODO));
    foreach ($rows as &$r) {
        $r['id']     = (int)$r['id'];
        $r['abierto'] = $r['estado'] === 'abierto';
    }
    return $rows;
}

function fechaValida($v): bool {
    $d = DateTime::createFromFormat('Y-m-d', (string)$v);
    return $d && $d->format('Y-m-d') === $v;
}

if ($method === 'GET') {
    requireRole($pdo, ['admin', 'profesor', 'estudiante']);
    sendSuccess(listarPeriodos($pdo));
}

elseif ($method === 'PUT') {
    requireRole($pdo, 'admin');
    $data = getJsonBody();
    validateRequired($data, ['trimestre']);

    if (!in_array($data['trimestre'], TRIMESTRES_PERIODO, true)) sendError("Trimestre no válido", 400);

    $cambios = [];
    if (array_key_exists('estado', $data)) {
        if (!in_array($data['estado'], ['abierto', 'cerrado'], true)) sendError("Estado no válido", 400);
        $cambios['estado'] = $data['estado'];
    }
    foreach (['fecha_inicio', 'fecha_fin'] as $campo) {
        if (!array_key_exists($campo, $data)) continue;
        $v = $data[$campo];
        if ($v === null || $v === '') { $cambios[$campo] = null; continue; }
        if (!is_string($v) || !fechaValida($v)) sendError("Fecha no válida en '$campo' (use AAAA-MM-DD)", 400);
        $cambios[$campo] = $v;
    }
    if (count($cambios) === 0) sendError("No hay campos para actualizar", 400);

    $stmt = $pdo->prepare("SELECT fecha_inicio, fecha_fin FROM periodo WHERE trimestre = ?");
    $stmt->execute([$data['trimestre']]);
    $actual = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$actual) sendError("El período no existe", 404);

    $inicio = array_key_exists('fecha_inicio', $cambios) ? $cambios['fecha_inicio'] : $actual['fecha_inicio'];
    $fin    = array_key_exists('fecha_fin', $cambios)    ? $cambios['fecha_fin']    : $actual['fecha_fin'];
    if ($inicio !== null && $fin !== null && $inicio > $fin) {
        sendError("La fecha de inicio no puede ser posterior a la fecha de fin", 400);
    }

    $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($cambios)));
    $pdo->prepare("UPDATE periodo SET $set WHERE trimestre = ?")
        ->execute([...array_values($cambios), $data['trimestre']]);

    sendSuccess(listarPeriodos($pdo));
}

else {
    sendError("Método no permitido", 405);
}
?>
