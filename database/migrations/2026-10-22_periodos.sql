-- Panel de períodos académicos (Propuesta de Mejoras 6.3)
-- Ejecutar una sola vez en phpMyAdmin (base `gestion_escolar`). Es seguro repetirlo:
-- no recrea la tabla ni cambia el estado de filas existentes.

CREATE TABLE IF NOT EXISTS `periodo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trimestre` enum('I Trimestre','II Trimestre','III Trimestre') NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `estado` enum('abierto','cerrado') NOT NULL DEFAULT 'cerrado',
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_periodo_trimestre` (`trimestre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Estado inicial (uso real): solo el trimestre vigente abierto.
-- Ajustar desde el panel de admin o con un UPDATE si el vigente es otro.
INSERT INTO `periodo` (`trimestre`, `estado`) VALUES
  ('I Trimestre',   'cerrado'),
  ('II Trimestre',  'cerrado'),
  ('III Trimestre', 'abierto')
ON DUPLICATE KEY UPDATE `trimestre` = `trimestre`;
