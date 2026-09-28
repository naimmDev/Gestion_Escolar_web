<?php
require_once __DIR__ . '/notas_calculo.php';

function calcularResumenEstudiante(PDO $pdo, int $estudianteId, int $materiaId): array {
    $stmt = $pdo->prepare("SELECT * FROM nota WHERE estudiante_id = ? AND materia_id = ? ORDER BY fecha_registro ASC");
    $stmt->execute([$estudianteId, $materiaId]);
    return calcularResumenNotas($stmt->fetchAll(PDO::FETCH_ASSOC));
}

function obtenerEstudiante(PDO $pdo, int $estudianteId): ?array {
    $stmt = $pdo->prepare("SELECT id, nombre, identificacion, grado, seccion FROM estudiante WHERE id = ?");
    $stmt->execute([$estudianteId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function obtenerMateria(PDO $pdo, int $materiaId): ?array {
    $stmt = $pdo->prepare("SELECT id, nombre, codigo, profesor_id FROM materia WHERE id = ?");
    $stmt->execute([$materiaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/** Estudiantes matriculados en una materia, opcionalmente filtrados por grado ('Sin grado' = sin grado asignado). */
function obtenerEstudiantesMatriculados(PDO $pdo, int $materiaId, ?string $grado = null): array {
    $sql = "SELECT e.id, e.nombre, e.identificacion, e.grado, e.seccion
            FROM matricula m
            JOIN estudiante e ON m.estudiante_id = e.id
            WHERE m.materia_id = ?";
    $params = [$materiaId];

    if ($grado !== null) {
        if ($grado === 'Sin grado') {
            $sql .= " AND (e.grado IS NULL OR e.grado = '')";
        } else {
            $sql .= " AND e.grado = ?";
            $params[] = $grado;
        }
    }
    $sql .= " ORDER BY e.nombre ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/** Materias en las que está matriculado un estudiante. */
function obtenerMateriasDeEstudiante(PDO $pdo, int $estudianteId): array {
    $stmt = $pdo->prepare("
        SELECT s.id, s.nombre, s.codigo
        FROM matricula m
        JOIN materia s ON m.materia_id = s.id
        WHERE m.estudiante_id = ?
        ORDER BY s.nombre ASC
    ");
    $stmt->execute([$estudianteId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function estaMatriculado(PDO $pdo, int $estudianteId, int $materiaId): bool {
    $stmt = $pdo->prepare("SELECT id FROM matricula WHERE estudiante_id = ? AND materia_id = ?");
    $stmt->execute([$estudianteId, $materiaId]);
    return (bool) $stmt->fetch();
}

function armarReporteIndividual(PDO $pdo, int $estudianteId, int $materiaId): ?array {
    $estudiante = obtenerEstudiante($pdo, $estudianteId);
    $materia    = obtenerMateria($pdo, $materiaId);
    if (!$estudiante || !$materia) return null;

    return [
        "estudiante" => $estudiante,
        "materia"    => $materia,
        "resumen"    => calcularResumenEstudiante($pdo, $estudianteId, $materiaId)
    ];
}

/** Boletín: todas las materias matriculadas de un estudiante. */
function armarBoletinEstudiante(PDO $pdo, int $estudianteId): ?array {
    $estudiante = obtenerEstudiante($pdo, $estudianteId);
    if (!$estudiante) return null;

    $filas = [];
    foreach (obtenerMateriasDeEstudiante($pdo, $estudianteId) as $materia) {
        $filas[] = [
            "materia" => $materia,
            "resumen" => calcularResumenEstudiante($pdo, $estudianteId, (int)$materia['id'])
        ];
    }
    return ["estudiante" => $estudiante, "filas" => $filas];
}

/** Grupal: un resumen por estudiante matriculado (opcionalmente de un solo grado), ordenado por grado y nombre. */
function armarReporteGrupal(PDO $pdo, int $materiaId, ?string $grado = null): ?array {
    $materia = obtenerMateria($pdo, $materiaId);
    if (!$materia) return null;

    $estudiantes = obtenerEstudiantesMatriculados($pdo, $materiaId, $grado);
    usort($estudiantes, function ($a, $b) {
        $ga = ((int)$a['grado']) ?: 99;
        $gb = ((int)$b['grado']) ?: 99;
        return $ga <=> $gb ?: strcmp($a['nombre'], $b['nombre']);
    });

    $filas = [];
    foreach ($estudiantes as $est) {
        $filas[] = [
            "estudiante" => $est,
            "resumen"    => calcularResumenEstudiante($pdo, (int)$est['id'], $materiaId)
        ];
    }
    return ["materia" => $materia, "filas" => $filas];
}