<?php
/**
 * Reglas de período académico: un trimestre cerrado no admite crear, editar ni eliminar notas.
 * Falla cerrado: si el trimestre no tiene fila en `periodo`, se considera cerrado.
 */
const TRIMESTRES_PERIODO = ['I Trimestre', 'II Trimestre', 'III Trimestre'];

function trimestreAbierto(PDO $pdo, string $trimestre): bool {
    $stmt = $pdo->prepare("SELECT estado FROM periodo WHERE trimestre = ?");
    $stmt->execute([$trimestre]);
    return $stmt->fetchColumn() === 'abierto';
}

function exigirTrimestreAbierto(PDO $pdo, string $trimestre): void {
    if (!trimestreAbierto($pdo, $trimestre)) {
        sendError("Este trimestre ya fue cerrado", 409, [
            "codigo"    => "TRIMESTRE_CERRADO",
            "trimestre" => $trimestre
        ]);
    }
}
