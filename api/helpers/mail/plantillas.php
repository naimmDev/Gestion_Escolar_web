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
    return '<!DOCTYPE html><html><body style="margin:0;padding:12px;background:#f4efe3;font-family:Georgia,serif;color:#2b2118;">'
        . '<div style="max-width:560px;width:100%;margin:0 auto;background:#ffffff;border-top:4px solid #c9a84c;border-radius:2px;">'
        . '<div style="background:#8B0000;color:#f5e6b8;padding:16px 20px;font-size:18px;letter-spacing:1px;">Sistema de Gestión Escolar</div>'
        . '<div style="padding:22px 20px;">'
        . '<h2 style="margin:0 0 16px;font-size:20px;color:#8B0000;">' . h($titulo) . '</h2>'
        . $contenidoHtml . $btn
        . '</div>'
        . '<div style="padding:14px 20px;background:#faf6ee;font-size:12px;color:#8a7055;">Este es un mensaje automático, por favor no respondas a este correo.</div>'
        . '</div></body></html>';
}

function contactoAdmin(): array {
    $cred = require __DIR__ . '/../../config/credenciales.php';
    return is_array($cred['contacto_admin'] ?? null) ? $cred['contacto_admin'] : [];
}

function lineaContactoAdmin(): string {
    $c = contactoAdmin();
    $partes = [];
    if (!empty($c['correo']))   $partes[] = '<a href="mailto:' . h($c['correo']) . '">' . h($c['correo']) . '</a>';
    if (!empty($c['telefono'])) $partes[] = h($c['telefono']);
    $detalle = $partes ? ': ' . implode(' · ', $partes) : '';
    return '<p>Puedes contactar al administrador' . $detalle . '. También encontrarás esta información en la sección <strong>Ayuda</strong> del sistema.</p>';
}

function filaDato(string $etiqueta, string $valor): string {
    // Etiqueta arriba y valor debajo (apilado): no se desborda en pantallas angostas aunque el valor sea largo.
    return '<div style="margin:0 0 12px;">'
        . '<div style="font-size:13px;color:#8a7055;">' . h($etiqueta) . '</div>'
        . '<div style="font-size:16px;font-weight:bold;word-break:break-all;overflow-wrap:anywhere;">' . h($valor) . '</div>'
        . '</div>';
}

function plantillaUsuarioCreado(string $nombre, string $rol, string $email, string $password): array {
    $html = marcoCorreo('Tu cuenta fue creada',
        '<p>Hola <strong>' . h($nombre) . '</strong>, el administrador creó tu cuenta de ' . h($rol) . '.</p>'
        . '<div style="margin:12px 0;">' . filaDato('Usuario (correo)', $email) . filaDato('Contraseña inicial', $password) . '</div>'
        . '<p>Por seguridad, el sistema te pedirá <strong>cambiar esta contraseña</strong> en tu primer ingreso. No la compartas con nadie.</p>');
    return ['asunto' => 'Tu cuenta fue creada', 'html' => $html,
        'texto' => "Hola $nombre, el administrador creó tu cuenta de $rol.\nUsuario: $email\nContraseña inicial: $password\nCámbiala en tu primer ingreso.\n" . urlSistema()];
}

function plantillaAccesoRestablecido(string $nombre, string $email, string $password): array {
    $html = marcoCorreo('Tu acceso fue restablecido',
        '<p>Hola <strong>' . h($nombre) . '</strong>, el administrador restableció tu acceso al sistema.</p>'
        . '<div style="margin:12px 0;">' . filaDato('Usuario (correo)', $email) . filaDato('Nueva contraseña inicial', $password) . '</div>'
        . '<p>Deberás <strong>cambiarla</strong> y configurar de nuevo tus preguntas de seguridad en tu próximo ingreso.</p>'
        . '<p><strong>¿No esperabas este cambio?</strong> Avisa al administrador cuanto antes.</p>'
        . lineaContactoAdmin());
    $c = contactoAdmin();
    return ['asunto' => 'Tu acceso fue restablecido', 'html' => $html,
        'texto' => "Hola $nombre, el administrador restableció tu acceso.\nUsuario: $email\nNueva contraseña inicial: $password\nCámbiala en tu próximo ingreso. Si no esperabas este cambio, avisa al administrador" . (!empty($c['correo']) ? " ({$c['correo']})" : '') . ".\n" . urlSistema()];
}

function plantillaNotaNueva(string $estudiante, string $materia, string $tipo, string $trimestre, ?string $actividad): array {
    $tipos = ['PARCIAL' => 'Parcial', 'EXAMEN_TRIMESTRAL' => 'Examen trimestral', 'APRECIACION' => 'Apreciación'];
    $tipoTxt = $tipos[$tipo] ?? $tipo;
    $filas = filaDato('Materia', $materia) . filaDato('Evaluación', $tipoTxt)
        . (($actividad !== null && $actividad !== '') ? filaDato('Actividad', $actividad) : '')
        . filaDato('Trimestre', $trimestre);
    $html = marcoCorreo('Nueva nota registrada',
        '<p>Hola <strong>' . h($estudiante) . '</strong>, tu profesor registró una nueva nota. Ingresa al sistema para consultarla.</p>'
        . '<div style="margin:12px 0;">' . $filas . '</div>');
    return ['asunto' => "Nueva nota en $materia", 'html' => $html,
        'texto' => "Hola $estudiante, se registró una nueva nota en $materia ($tipoTxt, $trimestre). Ingresa al sistema para consultarla.\n" . urlSistema()];
}

function plantillaTrimestreCerrado(string $profesor, string $trimestre): array {
    $html = marcoCorreo('Trimestre cerrado',
        '<p>Hola <strong>' . h($profesor) . '</strong>, el <strong>' . h($trimestre) . '</strong> ha cerrado.</p>'
        . '<p>Ya no es posible registrar, editar ni eliminar notas en ese trimestre.</p>'
        . lineaContactoAdmin());
    return ['asunto' => "$trimestre cerrado", 'html' => $html,
        'texto' => "Hola $profesor, el $trimestre ha cerrado. Ya no es posible registrar, editar ni eliminar notas en ese trimestre.\n" . urlSistema()];
}

function plantillaComentarioNuevo(string $profesor, string $estudiante, string $materia): array {
    $html = marcoCorreo('Nuevo comentario de un estudiante',
        '<p>Hola <strong>' . h($profesor) . '</strong>, <strong>' . h($estudiante) . '</strong> dejó un comentario en <strong>' . h($materia) . '</strong>.</p>'
        . '<p>Ingresa al sistema, sección <strong>Comentarios</strong>, para leerlo.</p>');
    return ['asunto' => "Nuevo comentario en $materia", 'html' => $html,
        'texto' => "Hola $profesor, $estudiante dejó un comentario en $materia. Ingresa al sistema (sección Comentarios) para leerlo.\n" . urlSistema()];
}

function plantillaCuentaBloqueada(string $nombre, int $minutos): array {
    $html = marcoCorreo('Tu cuenta fue bloqueada temporalmente',
        '<p>Hola <strong>' . h($nombre) . '</strong>, detectamos varios intentos fallidos de ingreso a tu cuenta, por lo que la bloqueamos durante <strong>' . $minutos . ' minutos</strong>.</p>'
        . '<p>Si fuiste tú, espera ese tiempo e intenta de nuevo (o usa "¿Olvidaste tu contraseña?"). <strong>Si no fuiste tú</strong>, avisa al administrador.</p>'
        . lineaContactoAdmin(), false);
    return ['asunto' => 'Tu cuenta fue bloqueada temporalmente', 'html' => $html,
        'texto' => "Hola $nombre, tu cuenta fue bloqueada $minutos minutos por varios intentos fallidos de ingreso. Si no fuiste tú, avisa al administrador."];
}