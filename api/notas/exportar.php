<?php
require '../config/db.php';
require '../config/auth_middleware.php';
require_once '../helpers/reporte_documento.php';

/** @var array{usuario_id: int, rol: string, id_referencia: int|null} $authUser */

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError("Método no permitido", 405);
}

requireRole($pdo, ['profesor', 'estudiante']);

function paramEntero(string $nombre): ?int {
    if (!isset($_GET[$nombre]) || $_GET[$nombre] === '') return null;
    if (!ctype_digit((string)$_GET[$nombre])) sendError("Parámetro '$nombre' inválido", 400);
    return (int)$_GET[$nombre];
}

function nombreArchivoSeguro(string $s): string {
    $s = strtr($s, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n',
                    'Á'=>'A','É'=>'E','Í'=>'I','Ó'=>'O','Ú'=>'U','Ü'=>'U','Ñ'=>'N']);
    $s = preg_replace('/\s+/', '_', trim($s));
    $s = preg_replace('/[^A-Za-z0-9_\-]/', '', $s);
    return $s !== '' ? substr($s, 0, 80) : 'reporte';
}

$format       = $_GET['format'] ?? '';
$materiaId    = paramEntero('materia_id');
$estudianteId = paramEntero('estudiante_id');
$trimestre    = isset($_GET['trimestre']) && $_GET['trimestre'] !== '' ? $_GET['trimestre'] : null;
$grado        = isset($_GET['grado']) && trim($_GET['grado']) !== '' ? trim($_GET['grado']) : null;

if (!in_array($format, ['pdf', 'excel'], true)) {
    sendError("Formato inválido, use 'pdf' o 'excel'", 400);
}
if ($trimestre !== null && !in_array($trimestre, TRIMESTRES_REPORTE, true)) {
    sendError("Trimestre inválido", 400);
}

// ---------- Permisos y selección del tipo de reporte ----------
if ($authUser['rol'] === 'estudiante') {
    // Siempre el propio estudiante; nunca grupal.
    $estudianteId = (int)$authUser['id_referencia'];

    if ($materiaId === null) {
        $documento = documentoBoletinEstudiante($pdo, $estudianteId, $trimestre);
    } else {
        if (!estaMatriculado($pdo, $estudianteId, $materiaId)) {
            sendError("No estás matriculado en esta materia", 403);
        }
        $documento = documentoIndividual($pdo, $estudianteId, $materiaId, $trimestre);
    }
} else {
    if ($materiaId === null) {
        sendError("materia_id requerido", 400);
    }
    $checkMateria = $pdo->prepare("SELECT id FROM materia WHERE id = ? AND profesor_id = ?");
    $checkMateria->execute([$materiaId, $authUser['id_referencia']]);
    if (!$checkMateria->fetch()) {
        sendError("No tienes permiso sobre esta materia", 403);
    }

    if ($estudianteId !== null) {
        if (!estaMatriculado($pdo, $estudianteId, $materiaId)) {
            sendError("El estudiante no está matriculado en esta materia", 404);
        }
        $documento = documentoIndividual($pdo, $estudianteId, $materiaId, $trimestre);
    } else {
        $documento = documentoGrupal($pdo, $materiaId, $grado, $trimestre);
    }
}

if (!$documento || empty($documento['filas'])) {
    sendError("No se encontraron datos para exportar", 404);
}

// ---------- Generar archivo ----------
$nombreBase = nombreArchivoSeguro($documento['archivo']);

if ($format === 'pdf') {
    require_once '../helpers/pdf_reporte.php';
    $contenido = generarPdfDocumento($documento);
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $nombreBase . '.pdf"');
} else {
    require_once '../helpers/excel_reporte.php';
    $contenido = generarExcelDocumento($documento);
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $nombreBase . '.xlsx"');
}

header('Access-Control-Expose-Headers: Content-Disposition');
header('X-Content-Type-Options: nosniff');
header('Content-Length: ' . strlen($contenido));
echo $contenido;
exit;