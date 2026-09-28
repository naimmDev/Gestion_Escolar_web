<?php
require_once __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

const COLOR_CRIMSON      = '8B0000';
const COLOR_CRIMSON_DEEP = '5C0000';
const COLOR_GOLD_PALE    = 'F5E6B8';
const COLOR_IVORY_DARK   = 'F0E8D5';
const COLOR_PARCHMENT    = 'E8DEC6';

/** Escribe un valor sin permitir que se interprete como fórmula. */
function celda($sheet, string $ref, $valor): void {
    if (is_int($valor) || is_float($valor)) {
        $sheet->setCellValueExplicit($ref, $valor, DataType::TYPE_NUMERIC);
    } else {
        $sheet->setCellValueExplicit($ref, (string)$valor, DataType::TYPE_STRING);
    }
}

function escribirFila($sheet, int $row, array $valores): void {
    foreach (array_values($valores) as $i => $v) {
        // Notas ya formateadas ("4.2") se guardan como número; todo lo demás, como texto.
        if ($i > 0 && is_string($v) && preg_match('/^\d+\.\d$/', $v)) $v = (float)$v;
        celda($sheet, Coordinate::stringFromColumnIndex($i + 1) . $row, $v);
    }
}

function estilizarEncabezados($sheet, string $rango): void {
    $sheet->getStyle($rango)->applyFromArray([
        'font' => ['bold' => true, 'color' => ['rgb' => COLOR_GOLD_PALE]],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => COLOR_CRIMSON]],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => COLOR_PARCHMENT]]]
    ]);
}

function estilizarCuerpo($sheet, string $rango): void {
    $sheet->getStyle($rango)->applyFromArray([
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => COLOR_PARCHMENT]]],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
    ]);
    $sheet->getStyle($rango)->getNumberFormat()->setFormatCode('0.0');
}

function estilizarFilaFinal($sheet, string $rango): void {
    $sheet->getStyle($rango)->applyFromArray([
        'font' => ['bold' => true, 'color' => ['rgb' => COLOR_CRIMSON_DEEP]],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => COLOR_IVORY_DARK]],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => COLOR_PARCHMENT]]]
    ]);
}

function generarExcelDocumento(array $doc): string {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Reporte');

    $n      = count($doc['columnas']);
    $ultima = Coordinate::stringFromColumnIndex($n);
    $mitad  = max(1, (int)ceil($n / 2));
    $row    = 1;

    // Encabezado institucional
    celda($sheet, "A$row", 'SISTEMA DE GESTIÓN ESCOLAR');
    $sheet->mergeCells("A$row:$ultima$row");
    $sheet->getStyle("A$row")->getFont()->setBold(true)->setSize(14)->getColor()->setRGB(COLOR_CRIMSON_DEEP);
    $row++;
    celda($sheet, "A$row", $doc['titulo']);
    $sheet->mergeCells("A$row:$ultima$row");
    $sheet->getStyle("A$row")->getFont()->setBold(true)->setSize(12);
    $row += 2;

    // Datos (celdas combinadas para que no afecten el ancho de las columnas)
    foreach ($doc['info'] as $fila) {
        if (count($fila) === 1) {
            celda($sheet, "A$row", "{$fila[0]['label']}: {$fila[0]['value']}");
            $sheet->mergeCells("A$row:$ultima$row");
        } else {
            $finA = Coordinate::stringFromColumnIndex($mitad);
            $iniB = Coordinate::stringFromColumnIndex($mitad + 1);
            celda($sheet, "A$row", "{$fila[0]['label']}: {$fila[0]['value']}");
            $sheet->mergeCells("A$row:$finA$row");
            celda($sheet, "$iniB$row", "{$fila[1]['label']}: {$fila[1]['value']}");
            $sheet->mergeCells("$iniB$row:$ultima$row");
        }
        $row++;
    }
    $row++;

    // Subtítulo
    celda($sheet, "A$row", $doc['subtitulo']);
    $sheet->mergeCells("A$row:$ultima$row");
    $sheet->getStyle("A$row")->getFont()->setBold(true)->setSize(11);
    $sheet->getStyle("A$row")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
    $row++;

    // Tabla
    escribirFila($sheet, $row, $doc['columnas']);
    estilizarEncabezados($sheet, "A$row:$ultima$row");
    $row++;

    $desde = $row;
    foreach ($doc['filas'] as $fila) {
        escribirFila($sheet, $row, $fila);
        $row++;
    }
    if ($row > $desde) {
        estilizarCuerpo($sheet, "A$desde:$ultima" . ($row - 1));
        $sheet->getStyle("A$desde:A" . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
    }

    // Pie
    if (!empty($doc['pie'])) {
        $row++;
        foreach ($doc['pie'] as $p) {
            celda($sheet, "A$row", "{$p['label']}: {$p['value']}");
            $sheet->mergeCells("A$row:$ultima$row");
            estilizarFilaFinal($sheet, "A$row:$ultima$row");
            $row++;
        }
    }

    for ($i = 1; $i <= $n; $i++) {
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
    }

    $writer = new Xlsx($spreadsheet);
    ob_start();
    $writer->save('php://output');
    return ob_get_clean();
}