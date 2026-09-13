<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

function generarPdfIndividual(array $reporte): string {
    $html = htmlReporteIndividual($reporte);
    return renderizarPdf($html);
}

function generarPdfGrupal(array $reporte): string {
    $html = htmlReporteGrupal($reporte);
    return renderizarPdf($html);
}

function renderizarPdf(string $html): string {
    $options = new Options();
    $options->set('isRemoteEnabled', false);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('letter', 'portrait');
    $dompdf->render();
    return $dompdf->output();
}

function estiloBase(): string {
    return "
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1A0A0A; }
        h1 { font-size: 18px; color: #5C0000; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #8B0000; margin-top: 20px; margin-bottom: 6px; }
        p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #E8DEC6; padding: 6px 8px; text-align: left; }
        th { background: #F0E8D5; color: #5C0000; }
        .final { font-weight: bold; background: #FAF6EE; }
        .aprobado { color: #2a5c2a; }
        .proceso { color: #8B0000; }
    ";
}

function filaTrimestre(string $nombreTri, array $datos): string {
    $nota = $datos['nota_trimestral'] !== null ? number_format($datos['nota_trimestral'], 1) : 'En curso';
    return "
        <tr>
            <td>$nombreTri</td>
            <td>" . ($datos['promedio_parciales']   ?? 'Sin datos') . "</td>
            <td>" . ($datos['promedio_apreciacion'] ?? 'Sin datos') . "</td>
            <td>" . ($datos['examen_trimestral']    ?? 'Sin registrar') . "</td>
            <td><strong>$nota</strong></td>
        </tr>
    ";
}

function htmlReporteIndividual(array $reporte): string {
    $est = $reporte['estudiante'];
    $mat = $reporte['materia'];
    $res = $reporte['resumen'];

    $filas = '';
    foreach ($res as $tri => $datos) {
        if ($tri === 'promedio_final') continue;
        $filas .= filaTrimestre($tri, $datos);
    }

    $final = $res['promedio_final'] !== null ? number_format($res['promedio_final'], 1) : 'En curso';

    return "
        <html><head><style>" . estiloBase() . "</style></head>
        <body>
            <h1>Reporte Académico</h1>
            <p><strong>Estudiante:</strong> {$est['nombre']} — Grado {$est['grado']} {$est['seccion']}</p>
            <p><strong>Materia:</strong> {$mat['nombre']} ({$mat['codigo']})</p>
            <table>
                <thead>
                    <tr><th>Trimestre</th><th>Prom. Parciales</th><th>Prom. Apreciación</th><th>Examen Trimestral</th><th>Nota Trimestral</th></tr>
                </thead>
                <tbody>$filas</tbody>
                <tfoot>
                    <tr class='final'><td colspan='4'>Promedio Final</td><td>$final</td></tr>
                </tfoot>
            </table>
        </body></html>
    ";
}

function htmlReporteGrupal(array $reporte): string {
    $mat = $reporte['materia'];
    $ag  = $reporte['agregados'];

    $filasHtml = '';
    foreach ($reporte['filas'] as $fila) {
        $est = $fila['estudiante'];
        $final = $fila['resumen']['promedio_final'];
        $finalTxt = $final !== null ? number_format($final, 1) : 'En curso';
        $estado = $final === null ? '—' : ($final >= 3 ? "<span class='aprobado'>Aprobado</span>" : "<span class='proceso'>En proceso</span>");
        $filasHtml .= "<tr><td>{$est['nombre']}</td><td>{$est['grado']} {$est['seccion']}</td><td>$finalTxt</td><td>$estado</td></tr>";
    }

    $promGrupo = $ag['promedio_grupo'] !== null ? number_format($ag['promedio_grupo'], 1) : 'Sin datos';

    return "
        <html><head><style>" . estiloBase() . "</style></head>
        <body>
            <h1>Reporte Grupal</h1>
            <p><strong>Materia:</strong> {$mat['nombre']} ({$mat['codigo']})</p>
            <p><strong>Total estudiantes:</strong> {$ag['total_estudiantes']} — 
               <strong>Promedio de grupo:</strong> $promGrupo — 
               <strong>Aprobados:</strong> {$ag['aprobados']} — 
               <strong>En proceso:</strong> {$ag['en_proceso']}</p>
            <table>
                <thead><tr><th>Estudiante</th><th>Grado/Sección</th><th>Promedio Final</th><th>Estado</th></tr></thead>
                <tbody>$filasHtml</tbody>
            </table>
        </body></html>
    ";
}