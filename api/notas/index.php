<?php
require '../config/db.php';
require '../config/auth_middleware.php';
//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

$method = $_SERVER['REQUEST_METHOD'];

const TIPOS_VALIDOS = ['PARCIAL', 'EXAMEN_TRIMESTRAL', 'APRECIACION'];
const TIPOS_ACTIVIDAD_VALIDOS = ['Quiz','Parcial','Taller','Tarea','Proyecto','Investigacion','Exposicion','Laboratorio','Participacion','Otro'];
const TRIMESTRES_VALIDOS = ['I Trimestre', 'II Trimestre', 'III Trimestre'];

if ($method === 'GET') {
    requireRole($pdo, ['admin', 'profesor', 'estudiante']);

    // ---------- MODO RESUMEN ----------
    if (!empty($_GET['resumen']) && !empty($_GET['estudiante_id']) && !empty($_GET['materia_id'])) {
        $estudianteId = $_GET['estudiante_id'];
        $materiaId    = $_GET['materia_id'];

        if ($authUser['rol'] === 'estudiante' && (int)$authUser['id_referencia'] !== (int)$estudianteId) {
            sendError("No tienes permiso para ver este resumen", 403);
        }

        if ($authUser['rol'] === 'profesor') {
            $check = $pdo->prepare("SELECT id FROM materia WHERE id = ? AND profesor_id = ?");
            $check->execute([$materiaId, $authUser['id_referencia']]);
            if (!$check->fetch()) sendError("No tienes permiso para ver este resumen", 403);
        }

        $stmt = $pdo->prepare("SELECT * FROM nota WHERE estudiante_id = ? AND materia_id = ? ORDER BY fecha_registro ASC");
        $stmt->execute([$estudianteId, $materiaId]);
        $notas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $resultado = [];
        $notasTrimestrales = [];

        foreach (TRIMESTRES_VALIDOS as $tri) {
            $delTrimestre = array_values(array_filter($notas, fn($n) => $n['trimestre'] === $tri));

            $parciales     = array_values(array_filter($delTrimestre, fn($n) => $n['tipo'] === 'PARCIAL'));
            $apreciaciones = array_values(array_filter($delTrimestre, fn($n) => $n['tipo'] === 'APRECIACION'));

            $examen = null;
            foreach ($delTrimestre as $n) {
                if ($n['tipo'] === 'EXAMEN_TRIMESTRAL') { $examen = $n; break; }
            }

            $promParciales = count($parciales) > 0
                ? array_sum(array_map(fn($n) => (float)$n['puntaje'], $parciales)) / count($parciales)
                : null;

            $promApreciacion = count($apreciaciones) > 0
                ? array_sum(array_map(fn($n) => (float)$n['puntaje'], $apreciaciones)) / count($apreciaciones)
                : null;

            $examenScore = $examen ? (float)$examen['puntaje'] : null;

            $notaTrimestral = null;
            if ($promParciales !== null && $promApreciacion !== null && $examenScore !== null) {
                $notaTrimestral = round(($promParciales + $promApreciacion + $examenScore) / 3, 2);
                $notasTrimestrales[] = $notaTrimestral;
            }

            $resultado[$tri] = [
                "parciales"            => $parciales,
                "promedio_parciales"   => $promParciales   !== null ? round($promParciales, 2)   : null,
                "apreciaciones"        => $apreciaciones,
                "promedio_apreciacion" => $promApreciacion !== null ? round($promApreciacion, 2) : null,
                "examen_trimestral"    => $examenScore,
                "nota_trimestral"      => $notaTrimestral
            ];
        }

        $resultado["promedio_final"] = count($notasTrimestrales) === 3
            ? round(array_sum($notasTrimestrales) / 3, 2)
            : null;

        sendSuccess($resultado);
    }

    // ---------- LISTADO NORMAL ----------
    $where = []; $params = [];

    if ($authUser['rol'] === 'profesor') {
        $where[] = "n.profesor_id = ?"; $params[] = $authUser['id_referencia'];
        if (!empty($_GET['materia_id']))    { $where[] = "n.materia_id = ?";    $params[] = $_GET['materia_id']; }
        if (!empty($_GET['estudiante_id'])) { $where[] = "n.estudiante_id = ?"; $params[] = $_GET['estudiante_id']; }
        if (!empty($_GET['trimestre']))     { $where[] = "n.trimestre = ?";     $params[] = $_GET['trimestre']; }
    } elseif ($authUser['rol'] === 'estudiante') {
        $where[] = "n.estudiante_id = ?"; $params[] = $authUser['id_referencia'];
        if (!empty($_GET['trimestre']))     { $where[] = "n.trimestre = ?";     $params[] = $_GET['trimestre']; }
    } else {
        if (!empty($_GET['estudiante_id'])) { $where[] = "n.estudiante_id = ?"; $params[] = $_GET['estudiante_id']; }
        if (!empty($_GET['materia_id']))    { $where[] = "n.materia_id = ?";    $params[] = $_GET['materia_id']; }
        if (!empty($_GET['trimestre']))     { $where[] = "n.trimestre = ?";     $params[] = $_GET['trimestre']; }
        if (!empty($_GET['profesor_id']))   { $where[] = "n.profesor_id = ?";   $params[] = $_GET['profesor_id']; }
    }

    $whereSQL = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";

    $stmt = $pdo->prepare("
        SELECT n.*, e.nombre AS estudiante_nombre, m.nombre AS materia_nombre, p.nombre AS profesor_nombre
        FROM nota n
        JOIN estudiante e ON n.estudiante_id = e.id
        JOIN materia    m ON n.materia_id    = m.id
        JOIN profesor   p ON n.profesor_id   = p.id
        $whereSQL
        ORDER BY n.fecha_registro DESC
    ");
    $stmt->execute($params);
    sendSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
}

elseif ($method === 'POST') {
    requireRole($pdo, 'profesor');
    $data = json_decode(file_get_contents("php://input"), true);
    validateRequired($data, ['estudiante_id', 'materia_id', 'tipo', 'puntaje', 'trimestre']);

    $puntaje = floatval($data['puntaje']);
    if ($puntaje < 1.0 || $puntaje > 5.0) sendError("La nota debe estar entre 1.0 y 5.0", 400);
    if (!in_array($data['tipo'], TIPOS_VALIDOS)) sendError("Tipo de evaluación no válido", 400);
    if (!in_array($data['trimestre'], TRIMESTRES_VALIDOS)) sendError("Trimestre no válido", 400);

    $tipoActividad = $data['tipo_actividad'] ?? null;
    if ($tipoActividad !== null && !in_array($tipoActividad, TIPOS_ACTIVIDAD_VALIDOS)) {
        sendError("Tipo de actividad no válido", 400);
    }

    $profesorId = $authUser['id_referencia'];

    $checkMateria = $pdo->prepare("SELECT id FROM materia WHERE id = ? AND profesor_id = ?");
    $checkMateria->execute([$data['materia_id'], $profesorId]);
    if (!$checkMateria->fetch()) sendError("No tienes asignada esta materia", 403);

    $checkMatricula = $pdo->prepare("SELECT id FROM matricula WHERE estudiante_id = ? AND materia_id = ?");
    $checkMatricula->execute([$data['estudiante_id'], $data['materia_id']]);
    if (!$checkMatricula->fetch()) sendError("El estudiante no está matriculado en esta materia", 409);

    // Unicidad: solo EXAMEN_TRIMESTRAL puede existir una vez por estudiante/materia/trimestre
    if ($data['tipo'] === 'EXAMEN_TRIMESTRAL') {
        $checkUnico = $pdo->prepare("SELECT id FROM nota WHERE estudiante_id = ? AND materia_id = ? AND trimestre = ? AND tipo = 'EXAMEN_TRIMESTRAL'");
        $checkUnico->execute([$data['estudiante_id'], $data['materia_id'], $data['trimestre']]);
        if ($checkUnico->fetch()) sendError("Ya existe un Examen Trimestral registrado para este estudiante en este trimestre", 409);
    }

    $pdo->prepare("INSERT INTO nota (estudiante_id, materia_id, profesor_id, tipo, tipo_actividad, nombre, puntaje, trimestre, comentario, fecha_registro) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())")
        ->execute([
            $data['estudiante_id'], $data['materia_id'], $profesorId,
            $data['tipo'], $tipoActividad, $data['nombre'] ?? null,
            $puntaje, $data['trimestre'], $data['comentario'] ?? null
        ]);

    sendCreated(["id" => $pdo->lastInsertId()]);
}

elseif ($method === 'PUT') {
    requireRole($pdo, 'profesor');
    $data = json_decode(file_get_contents("php://input"), true);
    validateRequired($data, ['id', 'puntaje']);

    $puntaje = floatval($data['puntaje']);
    if ($puntaje < 1.0 || $puntaje > 5.0) sendError("La nota debe estar entre 1.0 y 5.0", 400);

    $notaActual = $pdo->prepare("SELECT * FROM nota WHERE id = ? AND profesor_id = ?");
    $notaActual->execute([$data['id'], $authUser['id_referencia']]);
    $anterior = $notaActual->fetch(PDO::FETCH_ASSOC);
    if (!$anterior) sendError("Nota no encontrada o sin permiso para editarla", 403);

    $tipo = $data['tipo'] ?? $anterior['tipo'];
    if (!in_array($tipo, TIPOS_VALIDOS)) sendError("Tipo de evaluación no válido", 400);

    $tipoActividad = $data['tipo_actividad'] ?? $anterior['tipo_actividad'];
    if ($tipoActividad !== null && !in_array($tipoActividad, TIPOS_ACTIVIDAD_VALIDOS)) {
        sendError("Tipo de actividad no válido", 400);
    }

    $trimestre = $data['trimestre'] ?? $anterior['trimestre'];

    if ($tipo === 'EXAMEN_TRIMESTRAL') {
        $checkUnico = $pdo->prepare("SELECT id FROM nota WHERE estudiante_id = ? AND materia_id = ? AND trimestre = ? AND tipo = 'EXAMEN_TRIMESTRAL' AND id != ?");
        $checkUnico->execute([$anterior['estudiante_id'], $anterior['materia_id'], $trimestre, $data['id']]);
        if ($checkUnico->fetch()) sendError("Ya existe un Examen Trimestral registrado para este estudiante en este trimestre", 409);
    }

    $pdo->prepare("UPDATE nota SET puntaje=?, tipo=?, tipo_actividad=?, nombre=?, comentario=?, trimestre=? WHERE id=?")
        ->execute([
            $puntaje, $tipo, $tipoActividad,
            $data['nombre'] ?? $anterior['nombre'],
            $data['comentario'] ?? $anterior['comentario'],
            $trimestre, $data['id']
        ]);

    $pdo->prepare("INSERT INTO nota_auditoria (nota_id, editor_id, puntaje_anterior, puntaje_nuevo, fecha_cambio) VALUES (?, ?, ?, ?, NOW())")
        ->execute([$data['id'], $authUser['usuario_id'], $anterior['puntaje'], $puntaje]);

    sendSuccess(["message" => "Nota actualizada"]);
}

elseif ($method === 'DELETE') {
    requireRole($pdo, 'profesor');
    $data = json_decode(file_get_contents("php://input"), true);
    $id   = $data['id'] ?? null;

    if (!$id) sendError("ID requerido", 400);

    $check = $pdo->prepare("SELECT id FROM nota WHERE id = ? AND profesor_id = ?");
    $check->execute([$id, $authUser['id_referencia']]);
    if (!$check->fetch()) sendError("Nota no encontrada o sin permiso para eliminarla", 403);

    $pdo->prepare("DELETE FROM nota WHERE id = ?")->execute([$id]);
    sendSuccess(["message" => "Nota eliminada"]);
}

else {
    sendError("Método no permitido", 405);
}
?>