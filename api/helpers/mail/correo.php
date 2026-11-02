<?php
/**
 * Envío de correos con PHPMailer + registro en correo_log.
 *
 * Regla de oro: un fallo de correo NUNCA debe romper ni revertir la acción que lo originó.
 * enviarCorreo() no lanza excepciones; devuelve 'enviado' | 'fallido' | 'desactivado'.
 */
require_once __DIR__ . '/plantillas.php';

use PHPMailer\PHPMailer\PHPMailer;

function configCorreo(): array {
    static $cfg = null;
    if ($cfg === null) {
        $cred = require __DIR__ . '/../../config/credenciales.php';
        $cfg = array_merge([
            'activo' => false, 'host' => '', 'puerto' => 587, 'seguridad' => 'tls',
            'usuario' => '', 'clave' => '', 'remitente' => '', 'nombre_remitente' => 'Sistema de Gestión Escolar',
            'desvio' => '', 'url_sistema' => '',
        ], is_array($cred['correo'] ?? null) ? $cred['correo'] : []);
    }
    return $cfg;
}

/** Guarda el resultado en correo_log. Si la tabla no existe todavía, se ignora en silencio. */
function registrarCorreo(PDO $pdo, string $evento, string $destinatario, string $asunto, string $estado, ?string $error = null): void {
    try {
        $pdo->prepare("INSERT INTO correo_log (evento, destinatario, asunto, estado, error, fecha) VALUES (?, ?, ?, ?, ?, NOW())")
            ->execute([
                mb_substr($evento, 0, 40), mb_substr($destinatario, 0, 100), mb_substr($asunto, 0, 200),
                $estado, $error === null ? null : mb_substr($error, 0, 255),
            ]);
    } catch (Throwable $e) {
        error_log('correo_log: ' . $e->getMessage());
    }
}

/**
 * @param array $plantilla ['asunto' => string, 'html' => string, 'texto' => string]
 * @return string 'enviado' | 'fallido' | 'desactivado'
 */
function enviarCorreo(PDO $pdo, string $evento, ?string $destinatario, array $plantilla): string {
    $cfg = configCorreo();
    if (empty($cfg['activo'])) return 'desactivado';

    $destinatario = trim((string)$destinatario);
    $asunto = $plantilla['asunto'];

    if (!filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
        registrarCorreo($pdo, $evento, $destinatario, $asunto, 'fallido', 'Destinatario inválido');
        return 'fallido';
    }

    $autoload = __DIR__ . '/../../vendor/autoload.php';
    if (!is_file($autoload)) {
        registrarCorreo($pdo, $evento, $destinatario, $asunto, 'fallido', 'PHPMailer no instalado (ejecutar composer install)');
        return 'fallido';
    }

    try {
        require_once $autoload;
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host    = $cfg['host'];
        $mail->Port    = (int)$cfg['puerto'];
        $mail->Timeout = 8;
        $mail->CharSet = 'UTF-8';

        $mail->SMTPAuth = $cfg['usuario'] !== '';
        if ($mail->SMTPAuth) {
            $mail->Username = $cfg['usuario'];
            $mail->Password = $cfg['clave'];
        }
        if ($cfg['seguridad'] === 'tls') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($cfg['seguridad'] === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }

        $mail->setFrom($cfg['remitente'] ?: $cfg['usuario'], $cfg['nombre_remitente']);

        if ($cfg['desvio'] !== '') {
            $mail->addAddress($cfg['desvio']);
            $asunto = "[PRUEBA → $destinatario] $asunto";
        } else {
            $mail->addAddress($destinatario);
        }

        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body    = $plantilla['html'];
        $mail->AltBody = $plantilla['texto'];
        $mail->send();

        registrarCorreo($pdo, $evento, $destinatario, $plantilla['asunto'], 'enviado');
        return 'enviado';
    } catch (Throwable $e) {
        registrarCorreo($pdo, $evento, $destinatario, $plantilla['asunto'], 'fallido', $e->getMessage());
        return 'fallido';
    }
}
