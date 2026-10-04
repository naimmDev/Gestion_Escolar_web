<?php require_once '../api/config/verificar_sesion_pagina.php'; verificarSesionPagina(['profesor', 'estudiante']); ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preguntas de Seguridad — Gestión Escolar</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="css/login.css">
</head>
<body>
    <div class="login-container">
        <div class="login-card wide-card preguntas-card">
            <div class="decorative-ribbon"></div>
            <div class="login-header">
                <h1><i class="fas fa-shield-halved"></i> Preguntas de Seguridad</h1>
                <p>Selecciona y responde 3 preguntas de seguridad. Las usarás si olvidas tu contraseña.</p>
            </div>
            <form id="preguntasForm">
                <div id="preguntasContainer" class="preguntas-grid">
                    <!-- Las 3 preguntas se generan aquí por JS -->
                    <p style="text-align:center; color:#8a7055; grid-column: span 3;"><i class="fas fa-spinner fa-spin"></i> Cargando preguntas...</p>
                </div>
                <button type="submit" class="login-btn" id="btnGuardar" style="margin-top:30px;" disabled>
                    <i class="fas fa-shield-halved"></i> Guardar y continuar
                </button>
            </form>
        </div>
    </div>
    <script src="js/api.js"></script>
    <script src="js/configurar_preguntas.js"></script>
</body>
</html>