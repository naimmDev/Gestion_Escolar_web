<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

function e($v): string {
    return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}

function generarPdfDocumento(array $doc): string {
    $options = new Options();
    $options->set('isRemoteEnabled', false);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml(htmlDocumento($doc));
    $dompdf->setPaper('letter', 'portrait');
    $dompdf->render();
    return $dompdf->output();
}

function estiloInstitucional(): string {
    return "
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
        .inst { text-align: center; font-size: 14px; font-weight: bold; margin: 0; }
        .tit  { text-align: center; font-size: 12px; font-weight: bold; margin: 4px 0 14px; }
        .sub  { text-align: center; font-size: 12px; font-weight: bold; margin: 0 0 6px; }
        table { width: 100%; border-collapse: collapse; }
        table.info { border: 1px solid #000; margin-bottom: 14px; }
        table.info td { border: 1px solid #000; padding: 6px 8px; width: 50%; }
        table.datos th, table.datos td { border: 1px solid #000; padding: 6px 8px; text-align: center; }
        table.datos th { font-weight: bold; }
        table.datos td.izq { text-align: left; font-weight: bold; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .pie { margin-top: 12px; font-weight: bold; }
    ";
}

function htmlDocumento(array $doc): string {
    $info = '';
    foreach ($doc['info'] as $fila) {
        if (count($fila) === 1) {
            $info .= "<tr><td colspan='2'><strong>" . e($fila[0]['label']) . ":</strong> " . e($fila[0]['value']) . "</td></tr>";
        } else {
            $info .= "<tr>"
                . "<td><strong>" . e($fila[0]['label']) . ":</strong> " . e($fila[0]['value']) . "</td>"
                . "<td><strong>" . e($fila[1]['label']) . ":</strong> " . e($fila[1]['value']) . "</td>"
                . "</tr>";
        }
    }

    $head = '';
    foreach ($doc['columnas'] as $c) $head .= "<th>" . e($c) . "</th>";

    $body = '';
    foreach ($doc['filas'] as $fila) {
        $body .= "<tr>";
        foreach ($fila as $i => $celda) {
            $body .= "<td" . ($i === 0 ? " class='izq'" : "") . ">" . e($celda) . "</td>";
        }
        $body .= "</tr>";
    }

    $pie = '';
    foreach ($doc['pie'] as $p) {
        $pie .= "<div class='pie'>" . e($p['label']) . ": " . e($p['value']) . "</div>";
    }

    return "<html><head><meta charset='UTF-8'><style>" . estiloInstitucional() . "</style></head><body>"
        . "<p class='inst'>SISTEMA DE GESTIÓN ESCOLAR</p>"
        . "<p class='tit'>" . e($doc['titulo']) . "</p>"
        . "<table class='info'>$info</table>"
        . "<p class='sub'>" . e($doc['subtitulo']) . "</p>"
        . "<table class='datos'><thead><tr>$head</tr></thead><tbody>$body</tbody></table>"
        . $pie
        . "</body></html>";
}