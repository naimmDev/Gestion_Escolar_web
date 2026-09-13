<?php
const TRIMESTRES_REPORTE = ['I Trimestre', 'II Trimestre', 'III Trimestre'];

/**
 * Calcula el resumen completo (por trimestre + promedio final) de un estudiante en una materia.
 * Misma lógica que el modo resumen de /api/notas/index.php
 */
function calcularResumenEstudiante(PDO $pdo, int $estudianteId, int $materiaId): array {
    $stmt = $pdo->prepare("SELECT * FROM nota WHERE estudiante_id = ? AND materia_id = ? ORDER BY fecha_registro ASC");
    $stmt->execute([$estudianteId, $materiaId]);
    $notas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $resultado = [];
    $notasTrimestrales = [];

    foreach (TRIMESTRES_REPORTE as $tri) {
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

    return $resultado;
}

/**
 * Devuelve id, nombre y datos básicos del estudiante.
 */
function obtenerEstudiante(PDO $pdo, int $estudianteId): ?array {
    $stmt = $pdo->prepare("SELECT id, nombre, grado, seccion FROM estudiante WHERE id = ?");
    $stmt->execute([$estudianteId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * Devuelve datos básicos de la materia.
 */
function obtenerMateria(PDO $pdo, int $materiaId): ?array {
    $stmt = $pdo->prepare("SELECT id, nombre, codigo, profesor_id FROM materia WHERE id = ?");
    $stmt->execute([$materiaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * Lista de estudiantes matriculados en una materia (para reporte grupal).
 */
function obtenerEstudiantesMatriculados(PDO $pdo, int $materiaId): array {
    $stmt = $pdo->prepare("
        SELECT e.id, e.nombre, e.grado, e.seccion
        FROM matricula m
        JOIN estudiante e ON m.estudiante_id = e.id
        WHERE m.materia_id = ?
        ORDER BY e.nombre ASC
    ");
    $stmt->execute([$materiaId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Arma el reporte completo para un estudiante individual: datos + resumen.
 */
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

/**
 * Arma el reporte grupal: un resumen por cada estudiante matriculado + agregados de la materia.
 */
function armarReporteGrupal(PDO $pdo, int $materiaId): ?array {
    $materia = obtenerMateria($pdo, $materiaId);
    if (!$materia) return null;

    $estudiantes = obtenerEstudiantesMatriculados($pdo, $materiaId);

    $filas = [];
    $promediosFinales = [];

    foreach ($estudiantes as $est) {
        $resumen = calcularResumenEstudiante($pdo, $est['id'], $materiaId);
        $filas[] = [
            "estudiante" => $est,
            "resumen"    => $resumen
        ];
        if ($resumen['promedio_final'] !== null) {
            $promediosFinales[] = $resumen['promedio_final'];
        }
    }

    $promedioGrupo = count($promediosFinales) > 0
        ? round(array_sum($promediosFinales) / count($promediosFinales), 2)
        : null;

    $aprobados  = count(array_filter($promediosFinales, fn($p) => $p >= 3));
    $enProceso  = count($filas) - $aprobados;

    return [
        "materia" => $materia,
        "filas"   => $filas,
        "agregados" => [
            "total_estudiantes" => count($filas),
            "promedio_grupo"    => $promedioGrupo,
            "aprobados"         => $aprobados,
            "en_proceso"        => $enProceso
        ]
    ];
}

//Verifica si un estudiante está matriculado en una materia.
function estaMatriculado(PDO $pdo, int $estudianteId, int $materiaId): bool {
    $stmt = $pdo->prepare("SELECT id FROM matricula WHERE estudiante_id = ? AND materia_id = ?");
    $stmt->execute([$estudianteId, $materiaId]);
    return (bool) $stmt->fetch();
}