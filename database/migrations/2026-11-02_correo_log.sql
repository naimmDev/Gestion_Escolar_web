-- Registro de correos enviados por el sistema (notificaciones por correo, propuesta 6.2).
-- Ejecutar en phpMyAdmin sobre bases de datos existentes. En instalaciones nuevas ya viene en schema.sql.
-- No guarda contraseñas ni el cuerpo del correo.

CREATE TABLE IF NOT EXISTS `correo_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `evento` varchar(40) NOT NULL,
  `destinatario` varchar(100) NOT NULL,
  `asunto` varchar(200) DEFAULT NULL,
  `estado` enum('enviado','fallido') NOT NULL,
  `error` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_correo_log_fecha` (`fecha`),
  KEY `idx_correo_log_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
