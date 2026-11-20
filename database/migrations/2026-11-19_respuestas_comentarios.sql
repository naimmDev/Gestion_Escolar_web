-- Estado de lectura y respuesta del profesor para comentarios.
-- Ejecutar una sola vez en bases existentes. Los comentarios anteriores quedan como leídos.

ALTER TABLE `comentario`
  ADD COLUMN `fecha_lectura` datetime DEFAULT NULL AFTER `fecha`,
  ADD COLUMN `respuesta` text DEFAULT NULL AFTER `fecha_lectura`,
  ADD COLUMN `fecha_respuesta` datetime DEFAULT NULL AFTER `respuesta`;

UPDATE `comentario`
SET `fecha_lectura` = COALESCE(`fecha`, CURRENT_TIMESTAMP)
WHERE `fecha_lectura` IS NULL;
