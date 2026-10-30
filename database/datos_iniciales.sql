-- Datos iniciales del SGE (ejecutar DESPUÉS de schema.sql, sobre la BD vacía).
-- Crea: preguntas de seguridad (8) y el administrador.
--   Admin: admin@escuela.edu / admin123  (cambiar la contraseña en producción)

INSERT INTO `pregunta_seguridad` (`id`, `pregunta`) VALUES
(1, '¿Cuál es el nombre de tu primera mascota?'),
(2, '¿En qué ciudad naciste?'),
(3, '¿Cuál es el apellido de tu madre?'),
(4, '¿Cuál fue el nombre de tu primera escuela?'),
(5, '¿Cuál es tu comida favorita?'),
(6, '¿Cuál es el nombre de tu mejor amigo de infancia?'),
(7, '¿Cuál fue tu primer número de teléfono?'),
(8, '¿Cuál es el modelo de tu primer auto?');

INSERT INTO `usuario` (`email`, `password_hash`, `rol`, `nombre`, `id_referencia`, `password_cambiada`, `preguntas_configuradas`) VALUES
('admin@escuela.edu', '$2y$12$kxBNnam4GaKdpVnunJzqJej6KM4DqLtt9czVJH3YcIC.tjI4U6YTy', 'admin', 'Administrador', NULL, 1, 1);
