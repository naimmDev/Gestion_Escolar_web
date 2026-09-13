<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

const COLOR_CRIMSON      = '8B0000';
const COLOR_CRIMSON_DEEP = '5C0000';
const COLOR_GOLD_PALE    = 'F5E6B8';
const COLOR_IVORY_DARK   = 'F0E8D5';
const COLOR_PARCHMENT    = 'E8DEC6';

function estilizarTitulo($sheet, string $celda, string $texto, int $tamano = 14): void {
    $sheet->setCellValue($celda, $texto);
    $sheet->getStyle($celda)->getFont()->setBold(true)->setSize($tamano)
        ->getColor()->setRGB(COLOR_CRIMSON_DEEP);
}

function estilizarSubtitulo($sheet, string $celda, string $texto): void {
    $sheet->setCellValue($celda, $texto);
    $sheet->getStyle($celda)->getFont()->setItalic(true)->setSize(11);
}

function estilizarEncabezados($sheet, string $rango): void {
    $sheet->getStyle($rango)->applyFromArray([
        'font' => ['bold' => true, 'color' => ['rgb' => COLOR_GOLD_PALE]],
        'fill' => [
            'fillType' => Fill::FILL_SOLID,
            'startColor' => ['rgb' => COLOR_CRIMSON]
        ],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => COLOR_PARCHMENT]]]
    ]);
}

function estilizarCuerpo($sheet, string $rango): void {
    $sheet->getStyle($rango)->applyFromArray([
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => COLOR_PARCHMENT]]],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
}

function estilizarFilaFinal($sheet, string $rango): void {
    $sheet->getStyle($rango)->applyFromArray([
        'font' => ['bold' => true, 'color' => ['rgb' => COLOR_CRIMSON_DEEP]],
        'fill' => [
            'fillType' => Fill::FILL_SOLID,
            'startColor' => ['rgb' => COLOR_IVORY_DARK]
        ],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => COLOR_PARCHMENT]]]
    ]);
}

function autoAjustarColumnas($sheet, int $cantidadColumnas): void {
    $letras = range('A', chr(64 + $cantidadColumnas));
    foreach ($letras as $letra) {
        $sheet->getColumnDimension($letra)->setAutoSize(true);
    }
}

function generarExcelIndividual(array $reporte): string {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Reporte');

    $est = $reporte['estudiante'];
    $mat = $reporte['materia'];
    $res = $reporte['resumen'];

    estilizarTitulo($sheet, 'A1', 'Reporte Académico');
    estilizarSubtitulo($sheet, 'A2', "Estudiante: {$est['nombre']} — Grado {$est['grado']} {$est['seccion']}");
    estilizarSubtitulo($sheet, 'A3', "Materia: {$mat['nombre']} ({$mat['codigo']})");

    $headers = ['Trimestre', 'Prom. Parciales', 'Prom. Apreciación', 'Examen Trimestral', 'Nota Trimestral'];
    $sheet->fromArray($headers, null, 'A5');
    estilizarEncabezados($sheet, 'A5:E5');

    $row = 6;
    foreach ($res as $tri => $datos) {
        if ($tri === 'promedio_final') continue;
        $sheet->fromArray([
            $tri,
            $datos['promedio_parciales'] ?? 'Sin datos',
            $datos['promedio_apreciacion'] ?? 'Sin datos',
            $datos['examen_trimestral'] ?? 'Sin registrar',
            $datos['nota_trimestral'] ?? 'En curso'
        ], null, "A$row");
        $row++;
    }
    estilizarCuerpo($sheet, "A6:E" . ($row - 1));

    $sheet->setCellValue("A$row", 'Promedio Final');
    $sheet->mergeCells("A$row:D$row");
    $sheet->setCellValue("E$row", $res['promedio_final'] ?? 'En curso');
    estilizarFilaFinal($sheet, "A$row:E$row");

    autoAjustarColumnas($sheet, 5);

    return exportarSpreadsheet($spreadsheet);
}

function generarExcelGrupal(array $reporte): string {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Reporte Grupal');

    $mat = $reporte['materia'];
    $ag  = $reporte['agregados'];

    estilizarTitulo($sheet, 'A1', 'Reporte Grupal');
    estilizarSubtitulo($sheet, 'A2', "Materia: {$mat['nombre']} ({$mat['codigo']})");
    estilizarSubtitulo($sheet, 'A3', "Total estudiantes: {$ag['total_estudiantes']}  |  Promedio de grupo: " . ($ag['promedio_grupo'] ?? 'Sin datos'));
    estilizarSubtitulo($sheet, 'A4', "Aprobados: {$ag['aprobados']}  |  En proceso: {$ag['en_proceso']}");

    $headers = ['Estudiante', 'Grado', 'Sección', 'Promedio Final', 'Estado'];
    $sheet->fromArray($headers, null, 'A6');
    estilizarEncabezados($sheet, 'A6:E6');

    $row = 7;
    foreach ($reporte['filas'] as $fila) {
        $est = $fila['estudiante'];
        $final = $fila['resumen']['promedio_final'];
        $estado = $final === null ? '—' : ($final >= 3 ? 'Aprobado' : 'En proceso');
        $sheet->fromArray([
            $est['nombre'], $est['grado'], $est['seccion'],
            $final ?? 'En curso', $estado
        ], null, "A$row");
        $row++;
    }
    estilizarCuerpo($sheet, "A7:E" . ($row - 1));

    autoAjustarColumnas($sheet, 5);

    return exportarSpreadsheet($spreadsheet);
}

function exportarSpreadsheet(Spreadsheet $spreadsheet): string {
    $writer = new Xlsx($spreadsheet);
    ob_start();
    $writer->save('php://output');
    return ob_get_clean();
}