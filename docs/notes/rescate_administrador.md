# Procedimiento de rescate de la cuenta de administrador

Úsalo si el administrador no puede entrar (contraseña olvidada, cuenta bloqueada o recuperación por preguntas no disponible). Requiere acceso a la base de datos (phpMyAdmin o consola `mysql`) y a PHP del servidor.

> Solo lo debe ejecutar quien administre el servidor. Después de usarlo, cambia la contraseña desde el panel.

## 1. Generar el hash de la contraseña temporal

Crea un archivo `hash.php` **fuera de la carpeta del proyecto** (o bórralo al terminar):

```php
<?php
echo password_hash('CAMBIAR_ESTA_CLAVE', PASSWORD_BCRYPT, ['cost' => 12]), PHP_EOL;
```

Cambia `CAMBIAR_ESTA_CLAVE` por una contraseña temporal y ejecútalo:

```
C:\xampp\php\php.exe hash.php
```

Copia el resultado completo (empieza con `$2y$12$` y mide 60 caracteres).

## 2. Restablecer al administrador

Ejecuta en la base de datos del sistema (por defecto `gestion_escolar`), pegando el hash en `HASH_AQUI`. Cambia el correo si el administrador usa otro:

```sql
UPDATE usuario
SET password_hash = 'HASH_AQUI',
    password_cambiada = 0,
    intentos_fallidos = 0,
    bloqueado_hasta = NULL
WHERE rol = 'admin' AND email = 'admin@escuela.edu';

DELETE FROM sesion
WHERE usuario_id = (SELECT id FROM usuario WHERE rol = 'admin' AND email = 'admin@escuela.edu');
```

- `password_cambiada = 0` fuerza el cambio de contraseña en el siguiente ingreso.
- Se borran las sesiones del admin por seguridad.
- Verifica que se afectó 1 fila. Si afectó 0, el correo no coincide: consulta `SELECT id, email, rol FROM usuario WHERE rol = 'admin';`.

## 3. Solo desbloquear (sin cambiar contraseña)

```sql
UPDATE usuario
SET intentos_fallidos = 0, bloqueado_hasta = NULL
WHERE rol = 'admin';
```

## 4. Si la fila del administrador no existe

Inserta una nueva, con el hash del paso 1:

```sql
INSERT INTO usuario (email, password_hash, rol, nombre, id_referencia, password_cambiada, preguntas_configuradas)
VALUES ('admin@escuela.edu', 'HASH_AQUI', 'admin', 'Administrador', NULL, 0, 0);
```

## 5. Al terminar

1. Entra con la contraseña temporal y cámbiala cuando el sistema lo pida.
2. Vuelve a configurar las preguntas de seguridad si `preguntas_configuradas` quedó en 0.
3. Borra `hash.php` y no guardes la contraseña temporal en ningún archivo ni chat.

## Prevención

- Mantener las preguntas de seguridad del admin configuradas con respuestas que solo él conozca.
- Usar un correo real para el admin (recibe el aviso de cuenta bloqueada).
- Guardar la contraseña del admin en un gestor de contraseñas y hacer copias de la base de datos con regularidad.
- Mejora futura planificada: varios administradores (ver "Implementaciones futuras").
