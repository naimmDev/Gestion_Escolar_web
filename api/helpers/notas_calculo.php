<?php
const TRIMESTRES_REPORTE = ['I Trimestre', 'II Trimestre', 'III Trimestre'];

/**
 * Calcula resumen por trimestre + promedio final a partir de las filas de `nota`
 * de UN estudiante en UNA materia.
 */
function calcularResumenNotas(array $notas): array {
    $resultado = [];
    $notasTrimestrales = [];

    foreach (TRIMESTRES_REPORTE as $tri) {
        $delTrimestre  = array_values(array_filter($notas, fn($n) => $n['trimestre'] === $tri));
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