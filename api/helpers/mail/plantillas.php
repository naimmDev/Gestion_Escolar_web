<?php
/**
 * Plantillas de los correos. Cada función devuelve ['asunto', 'html', 'texto'].
 * Todo dato dinámico se escapa con h(). Nunca se incluyen datos que no sean necesarios.
 */

function h($v): string {
    return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}

function urlSistema(): string {
    return function_exists('configCorreo') ? (string)(configCorreo()['url_sistema'] ?? '') : '';
}

/** Marco común: encabezado, contenido, botón opcional al sistema y pie. */
function marcoCorreo(string $titulo, string $contenidoHtml, bool $boton = true): string {
    $url = urlSistema();
    $btn = ($boton && $url !== '')
        ? '<p style="text-align:center;margin:28px 0 8px;"><a href="' . h($url) . '" style="background:#8B0000;color:#f5e6b8;padding:12px 28px;text-decoration:none;border-radius:2px;font-family:Georgia,serif;letter-spacing:1px;">Ir al sistema</a></p>'
        : '';
    return '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f4efe3;font-family:Georgia,serif;color:#2b2118;">'
        . '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-top:4px solid #c9a84c;border-radius:2px;">'
        . '<div style="background:#8B0000;color:#f5e6b8;padding:18px 28px;font-size:18px;letter-spacing:1px;">Sistema de Gestión Escolar</div>'
        . '<div style="padding:28px;">'
        . '<h2 style="margin:0 0 16px;font-size:20px;color:#8B0000;">' . h($titulo) . '</h2>'
        . $contenidoHtml . $btn
        . '</div>'
        . '<div style="padding:14px 28px;background:#faf6ee;font-size:12px;color:#8a7055;">Este es un mensaje automático, por favor no respondas a este correo.</div>'
        . '</div></body></html>';
}

function filaDato(string $etiqueta, string $valor): string {
    return '<tr><td style="padding:6px 12px 6px 0;color:#8a7055;">' . h($etiqueta) . '</td><td style="padding:6px 0;"><strong>' . h($valor) . '</strong></td></tr>';
}

function plantillaUsuarioCreado(string $nombre, string $rol, string $email, string $password): array {
    $html = marcoCorreo('Tu cuenta fue creada',
        '<p>Hola <strong>' . h($nombre) . '</strong>, el administrador creó tu cuenta de ' . h($rol) . '.</p>'
        . '<table style="border-collapse:collapse;margin:12px 0;">' . filaDato('Usuario (correo)', $email) . filaDato('Contraseña inicial', $password) . '</table>'
        . '<p>Por seguridad, el sistema te pedirá <strong>cambiar esta contraseña</strong> en tu primer ingreso. No la compartas con nadie.</p>');
    return ['asunto' => 'Tu cuenta fue creada', 'html' => $html,
        'texto' => "Hola $nombre, el administrador creó tu cuenta de $rol.\nUsuario: $email\nContraseña inicial: $password\nCámbiala en tu primer ingreso.\n" . urlSistema()];
}

function plantillaAccesoRestablecido(string $nombre, string $email, string $password): array {
    $html = marcoCorreo('Tu acceso fue restablecido',
        '<p>Hola <strong>' . h($nombre) . '</strong>, el administrador restableció tu acceso al sistema.</p>'
        . '<table style="border-collapse:collapse;margin:12px 0;">' . filaDato('Usuario (correo)', $email) . filaDato('Nueva contraseña inicial', $password) . '</table>'
        . '<p>Deberás <strong>cambiarla</strong> y configurar de nuevo tus preguntas de seguridad en tu próximo ingreso. Si no esperabas este cambio, avisa al administrador.</p>');
    return ['asunto' => 'Tu acceso fue restablecido', 'html' => $html,
        'texto' => "Hola $nombre, el administrador restableció tu acceso.\nUsuario: $email\nNueva contraseña inicial: $password\nCámbiala en tu próximo ingreso.\n" . urlSistema()];
}

function plantillaNotaNueva(string $estudiante, string $materia, string $tipo, float $puntaje, string $trimestre, ?string $actividad): array {
    $tipos = ['PARCIAL' => 'Parcial', 'EXAMEN_TRIMESTRAL' => 'Examen trimestral', 'APRECIACION' => 'Apreciación'];
    $tipoTxt = $tipos[$tipo] ?? $tipo;
    $nota = number_format($puntaje, 1);
    $filas = filaDato('Materia', $materia) . filaDato('Evaluación', $tipoTxt)
        . (($actividad !== null && $actividad !== '') ? filaDato('Actividad', $actividad) : '')
        . filaDato('Trimestre', $trimestre) . filaDato('Nota', $nota);
    $html = marcoCorreo('Nueva nota registrada',
        '<p>Hola <strong>' . h($estudiante) . '</strong>, tu profesor registró una nueva nota.</p><table style="border-collapse:collapse;margin:12px 0;">' . $filas . '</table>');
    return ['asunto' => "Nueva nota en $materia: $nota", 'html' => $html,
        'texto' => "Hola $estudiante, se registró una nueva nota en $materia ($tipoTxt, $trimestre): $nota.\n" . urlSistema()];
}

function plantillaTrimestreCerrado(string $profesor, string $trimestre): array {
    $html = marcoCorreo('Trimestre cerrado',
        '<p>Hola <strong>' . h($profesor) . '</strong>, el administrador cerró el <strong>' . h($trimestre) . '</strong>.</p>'
        . '<p>A partir de ahora no es posible registrar, editar ni eliminar notas de ese trimestre. Si necesitas hacer una corrección, contacta al administrador para que lo abra de nuevo.</p>');
    return ['asunto' => "$trimestre cerrado", 'html' => $html,
        'texto' => "Hola $profesor, el administrador cerró el $trimestre. Ya no se pueden registrar, editar ni eliminar notas de ese trimestre.\n" . urlSistema()];
}

function plantillaComentarioNuevo(string $profesor, string $estudiante, string $materia, string $comentario): array {
    $extracto = mb_strlen($comentario) > 300 ? mb_substr($comentario, 0, 300) . '…' : $comentario;
    $html = marcoCorreo('Nuevo comentario de un estudiante',
        '<p>Hola <strong>' . h($profesor) . '</strong>, <strong>' . h($estudiante) . '</strong> dejó un comentario en <strong>' . h($materia) . '</strong>:</p>'
        . '<blockquote style="margin:12px 0;padding:10px 16px;border-left:3px solid #c9a84c;background:#faf6ee;">' . nl2br(h($extracto)) . '</blockquote>');
    return ['asunto' => "Nuevo comentario en $materia", 'html' => $html,
        'texto' => "Hola $profesor, $estudiante dejó un comentario en $materia:\n\n$extracto\n\n" . urlSistema()];
}

function plantillaCuentaBloqueada(string $nombre, int $minutos): array {
    $html = marcoCorreo('Tu cuenta fue bloqueada temporalmente',
        '<p>Hola <strong>' . h($nombre) . '</strong>, detectamos varios intentos fallidos de ingreso a tu cuenta, por lo que la bloqueamos durante <strong>' . $minutos . ' minutos</strong>.</p>'
        . '<p>Si fuiste tú, espera ese tiempo e intenta de nuevo (o usa "Olvidé mi contraseña"). Si no fuiste tú, avisa al administrador.</p>', false);
    return ['asunto' => 'Tu cuenta fue bloqueada temporalmente', 'html' => $html,
        'texto' => "Hola $nombre, tu cuenta fue bloqueada $minutos minutos por varios intentos fallidos de ingreso. Si no fuiste tú, avisa al administrador."];
}
