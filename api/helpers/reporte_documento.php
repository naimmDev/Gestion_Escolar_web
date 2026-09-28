<?php
require_once __DIR__ . '/reporte_data.php';

function fmtNota($v): string {
    return $v === null ? 'S/N' : number_format((float)$v, 1);
}

function ahoraPanama(): DateTime {
    return new DateTime('now', new DateTimeZone('America/Panama'));
}

function textoGrupo(array $est): string {
    $g = trim((string)($est['grado'] ?? ''));
    $s = trim((string)($est['seccion'] ?? ''));
    if ($g === '' && $s === '') return 'N/D';
    return $g . ($s !== '' ? ' - Sección ' . $s : '');
}

function estadoNota($n): string {
    if ($n === null) return '—';
    return $n >= 3 ? 'Aprobado' : 'En proceso';
}

function infoEstudiante(array $est): array {
    return [
        [['label' => 'Nombre', 'value' => $est['nombre']], ['label' => 'Año Lectivo', 'value' => ahoraPanama()->format('Y')]],
        [['label' => 'Identificación', 'value' => $est['identificacion'] ?? 'N/D'], ['label' => 'Fecha', 'value' => ahoraPanama()->format('d/m/Y')]],
    ];
}

/** Un estudiante en una materia: una fila por trimestre (o solo el trimestre pedido). */
function documentoIndividual(PDO $pdo, int $estudianteId, int $materiaId, ?string $trimestre): ?array {
    $rep = armarReporteIndividual($pdo, $estudianteId, $materiaId);
    if (!$rep) return null;
    $est = $rep['estudiante']; $mat = $rep['materia']; $res = $rep['resumen'];

    $filas = [];
    foreach (TRIMESTRES_REPORTE as $tri) {
        if ($trimestre !== null && $tri !== $trimestre) continue;
        $d = $res[$tri];
        $filas[] = [$tri, fmtNota($d['promedio_parciales']), fmtNota($d['promedio_apreciacion']),
                    fmtNota($d['examen_trimestral']), fmtNota($d['nota_trimestral'])];
    }

    $info = infoEstudiante($est);
    $info[] = [['label' => 'Grupo', 'value' => textoGrupo($est)],
               ['label' => 'Materia', 'value' => "{$mat['nombre']} ({$mat['codigo']})"]];

    return [
        'titulo'    => 'REPORTE INDIVIDUAL DE NOTAS',
        'info'      => $info,
        'subtitulo' => $trimestre !== null ? strtoupper($trimestre) : 'TRIMESTRES',
        'columnas'  => ['Trimestre', 'Prom. Parciales', 'Prom. Apreciación', 'Nota Examen', 'Nota Trimestral'],
        'filas'     => $filas,
        'pie'       => $trimestre === null ? [['label' => 'Nota Final del Curso', 'value' => fmtNota($res['promedio_final'])]] : [],
        'archivo'   => implode('_', array_filter(['reporte', $est['nombre'], $mat['nombre'], $trimestre]))
    ];
}

/** Boletín multi-materia del propio estudiante: un trimestre (detalle) o los tres (notas por trimestre + final). */
function documentoBoletinEstudiante(PDO $pdo, int $estudianteId, ?string $trimestre): ?array {
    $b = armarBoletinEstudiante($pdo, $estudianteId);
    if (!$b) return null;
    $est = $b['estudiante'];

    $filas = [];
    foreach ($b['filas'] as $f) {
        $res = $f['resumen'];
        if ($trimestre !== null) {
            $d = $res[$trimestre];
            $filas[] = [$f['materia']['nombre'], fmtNota($d['promedio_parciales']), fmtNota($d['promedio_apreciacion']),
                        fmtNota($d['examen_trimestral']), fmtNota($d['nota_trimestral'])];
        } else {
            $filas[] = [$f['materia']['nombre'],
                        ...array_map(fn($t) => fmtNota($res[$t]['nota_trimestral']), TRIMESTRES_REPORTE),
                        fmtNota($res['promedio_final'])];
        }
    }

    $info = infoEstudiante($est);
    $info[] = [['label' => 'Grupo', 'value' => textoGrupo($est)]];

    return [
        'titulo'    => $trimestre !== null ? 'REPORTE DE NOTAS' : 'BOLETÍN DE CALIFICACIONES',
        'info'      => $info,
        'subtitulo' => $trimestre !== null ? strtoupper($trimestre) : 'TRIMESTRES',
        'columnas'  => $trimestre !== null
            ? ['Asignaturas', 'Prom. Parciales', 'Prom. Apreciación', 'Nota Examen', 'Nota Trimestral']
            : ['Asignaturas', 'I', 'II', 'III', 'Nota Final'],
        'filas'     => $filas,
        'pie'       => [],
        'archivo'   => implode('_', array_filter([$trimestre !== null ? 'reporte_notas' : 'boletin', $est['nombre'], $trimestre]))
    ];
}

/** Grupal de una materia (opcional: un grado y/o un trimestre) con resumen del grupo. */
function documentoGrupal(PDO $pdo, int $materiaId, ?string $grado, ?string $trimestre): ?array {
    $rep = armarReporteGrupal($pdo, $materiaId, $grado);
    if (!$rep) return null;
    $mat = $rep['materia'];

    $filas = [];
    $valores = [];
    foreach ($rep['filas'] as $f) {
        $est = $f['estudiante']; $res = $f['resumen'];
        $clave = $trimestre !== null ? $res[$trimestre]['nota_trimestral'] : $res['promedio_final'];
        if ($clave !== null) $valores[] = $clave;

        if ($trimestre !== null) {
            $d = $res[$trimestre];
            $filas[] = [$est['nombre'], textoGrupo($est), fmtNota($d['promedio_parciales']), fmtNota($d['promedio_apreciacion']),
                        fmtNota($d['examen_trimestral']), fmtNota($d['nota_trimestral'])];
        } else {
            $filas[] = [$est['nombre'], textoGrupo($est),
                        ...array_map(fn($t) => fmtNota($res[$t]['nota_trimestral']), TRIMESTRES_REPORTE),
                        fmtNota($res['promedio_final']), estadoNota($res['promedio_final'])];
        }
    }

    $total     = count($filas);
    $aprobados = count(array_filter($valores, fn($v) => $v >= 3));
    $promedio  = count($valores) > 0 ? array_sum($valores) / count($valores) : null;

    return [
        'titulo'    => 'REPORTE GRUPAL DE NOTAS',
        'info'      => [
            [['label' => 'Materia', 'value' => "{$mat['nombre']} ({$mat['codigo']})"], ['label' => 'Año Lectivo', 'value' => ahoraPanama()->format('Y')]],
            [['label' => 'Grupo', 'value' => $grado ?? 'Todos los grados'], ['label' => 'Fecha', 'value' => ahoraPanama()->format('d/m/Y')]],
        ],
        'subtitulo' => $trimestre !== null ? strtoupper($trimestre) : 'TRIMESTRES',
        'columnas'  => $trimestre !== null
            ? ['Estudiante', 'Grupo', 'Prom. Parciales', 'Prom. Apreciación', 'Nota Examen', 'Nota Trimestral']
            : ['Estudiante', 'Grupo', 'I', 'II', 'III', 'Nota Final', 'Estado'],
        'filas'     => $filas,
        'pie'       => [
            ['label' => 'Total de estudiantes', 'value' => (string)$total],
            ['label' => 'Promedio del grupo',   'value' => fmtNota($promedio)],
            ['label' => 'Aprobados',            'value' => (string)$aprobados],
            ['label' => 'En proceso',           'value' => (string)($total - $aprobados)],
        ],
        'archivo'   => implode('_', array_filter(['reporte_grupal', $mat['nombre'], $grado, $trimestre]))
    ];
}