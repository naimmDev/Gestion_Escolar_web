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
        @page { margin: 40px 40px; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1A0A0A; }
        
        /* Encabezados */
        .inst { text-align: center; font-size: 16px; font-weight: bold; color: #8B0000; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; }
        .tit  { text-align: center; font-size: 13px; font-weight: bold; margin: 4px 0 18px; color: #5C0000; }
        .sub  { text-align: center; font-size: 12px; font-weight: bold; margin: 0 0 10px 0; color: #8B0000; text-transform: uppercase; letter-spacing: 0.5px; }
        
        /* Tablas generales */
        table { width: 100%; border-collapse: collapse; }
        
        /* Tabla de Información (Materia, Grupo, etc) */
        table.info { margin-bottom: 20px; background-color: #FAF6EE; border: 1px solid #C9A84C; }
        table.info td { border: 1px solid #C9A84C; padding: 8px 10px; width: 50%; color: #3B1A1A; }
        
        /* Tabla de Datos (Notas) */
        table.datos { margin-bottom: 15px; }
        table.datos th, table.datos td { 
            border: 1px solid #E8DEC6; 
            padding: 8px 6px; 
            text-align: center; 
            vertical-align: middle;
        }
        table.datos th { 
            background-color: #8B0000; 
            color: #F5E6B8; 
            font-weight: bold; 
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
        }
        table.datos td.izq { text-align: left; font-weight: bold; color: #5C0000; }
        
        /* Zebra striping (filas alternas) */
        table.datos tbody tr:nth-child(even) { background-color: #FAF6EE; }
        
        /* Pie de página */
        .pie { margin-top: 20px; padding-top: 10px; border-top: 2px solid #C9A84C; font-weight: bold; color: #5C0000; }
        
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
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