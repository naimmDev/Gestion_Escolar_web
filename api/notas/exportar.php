<?php
require '../config/db.php';
require '../config/auth_middleware.php';
require '../helpers/reporte_data.php';

//para que el analizador y editor de código reconozca la variable $authUser y su tipo, se agrega esta anotación:
/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError("Método no permitido", 405);
}

requireRole($pdo, ['profesor', 'estudiante']);

$format     = $_GET['format']       ?? '';
$materiaId  = isset($_GET['materia_id']) ? (int)$_GET['materia_id'] : null;
$estudianteId = isset($_GET['estudiante_id']) ? (int)$_GET['estudiante_id'] : null;
$trimestre  = $_GET['trimestre']    ?? null;

if (!in_array($format, ['pdf', 'excel'])) {
    sendError("Formato inválido, use 'pdf' o 'excel'", 400);
}
if (!$materiaId) {
    sendError("materia_id requerido", 400);
}

// ---------- Resolver permisos según rol ----------
if ($authUser['rol'] === 'estudiante') {
    // El estudiante solo puede exportar su propio reporte individual
    $estudianteId = $authUser['id_referencia'];
    $esGrupal = false;

    if (!estaMatriculado($pdo, $estudianteId, $materiaId)) {
        sendError("No estás matriculado en esta materia", 403);
    }
} else {
    // Profesor: debe ser dueño de la materia
    $checkMateria = $pdo->prepare("SELECT id FROM materia WHERE id = ? AND profesor_id = ?");
    $checkMateria->execute([$materiaId, $authUser['id_referencia']]);
    if (!$checkMateria->fetch()) {
        sendError("No tienes permiso sobre esta materia", 403);
    }
    $esGrupal = empty($estudianteId);

    // Si el profesor pide un estudiante específico, también debe estar matriculado
    if (!$esGrupal && !estaMatriculado($pdo, $estudianteId, $materiaId)) {
        sendError("El estudiante no está matriculado en esta materia", 404);
    }
}

// ---------- Armar datos ----------
if ($esGrupal) {
    $reporte = armarReporteGrupal($pdo, $materiaId);
} else {
    $reporte = armarReporteIndividual($pdo, $estudianteId, $materiaId);
}

if (!$reporte) {
    sendError("No se encontraron datos para exportar", 404);
}

// ---------- Filtrar por trimestre si se especificó (solo individual) ----------
if ($trimestre && !$esGrupal && isset($reporte['resumen'][$trimestre])) {
    $reporte['resumen'] = [$trimestre => $reporte['resumen'][$trimestre]];
}

// ---------- Generar archivo ----------
$nombreBase = $esGrupal
    ? 'reporte_' . preg_replace('/\s+/', '_', $reporte['materia']['nombre'])
    : 'notas_' . preg_replace('/\s+/', '_', $reporte['estudiante']['nombre']);

if ($format === 'pdf') {
    require_once '../helpers/pdf_reporte.php';
    $contenido = $esGrupal ? generarPdfGrupal($reporte) : generarPdfIndividual($reporte);
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $nombreBase . '.pdf"');
} else {
    require_once '../helpers/excel_reporte.php';
    $contenido = $esGrupal ? generarExcelGrupal($reporte) : generarExcelIndividual($reporte);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $nombreBase . '.xlsx"');
}

header('Content-Length: ' . strlen($contenido));
echo $contenido;
exit;