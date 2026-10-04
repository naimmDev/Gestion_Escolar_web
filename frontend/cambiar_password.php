<?php require_once '../api/config/verificar_sesion_pagina.php'; verificarSesionPagina(['profesor', 'estudiante']); ?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cambiar Contraseña — Gestión Escolar</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link rel="stylesheet" href="css/login.css">
</head>

<body>
    <div class="login-container">
        <div class="login-card">
            <div class="decorative-ribbon"></div>
            <div class="login-header">
                <h1><i class="fas fa-key"></i> Cambiar Contraseña</h1>
                <p>Por seguridad, debes establecer una nueva contraseña.</p>
            </div>
            <form id="cambiarPasswordForm">
                <div class="input-group">
                    <label>Contraseña actual (inicial)</label>
                    <input type="password" id="cpActual" placeholder="Contraseña que te dieron" required>
                </div>
                <div class="input-group">
                    <label>Nueva contraseña</label>
                    <input type="password" id="cpNueva" placeholder="Mínimo 6 caracteres" required>
                </div>
                <div class="input-group">
                    <label>Confirmar nueva contraseña</label>
                    <input type="password" id="cpConfirmar" placeholder="Repite la nueva contraseña" required>
                </div>
                <button type="submit" class="login-btn"><i class="fas fa-save"></i> Guardar y continuar</button>

                <!-- Botón Más tarde -->
                <button type="button" class="login-btn" onclick="skipPasswordChange()"
                    style="background: linear-gradient(135deg, #666, #444); margin-top: 10px;">
                    <i class="fas fa-clock"></i> Más tarde
                </button>
            </form>
        </div>
    </div>
    <script src="js/api.js"></script>
    <script src="js/cambiar_password.js"></script>
</body>

</html>