-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 08-09-2026 a las 21:10:10
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `gestion_escolar`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comentario`
--

CREATE TABLE `comentario` (
  `id` int(11) NOT NULL,
  `estudiante_id` int(11) NOT NULL,
  `materia_id` int(11) NOT NULL,
  `comentario` text NOT NULL,
  `fecha` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `comentario`
--

INSERT INTO `comentario` (`id`, `estudiante_id`, `materia_id`, `comentario`, `fecha`) VALUES
(1, 2, 1, 'pongame uno profe', '2026-06-01 01:47:42'),
(2, 4, 3, 'Profe pongame 5 >:/', '2026-06-20 13:49:22'),
(3, 4, 4, 'La tarea sobre el mapa la quiere impresa o en pdf ?', '2026-06-23 01:24:58'),
(4, 4, 2, 'ghghkg', '2026-07-08 21:42:40');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estudiante`
--

CREATE TABLE `estudiante` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `identificacion` varchar(20) NOT NULL,
  `grado` varchar(10) DEFAULT NULL,
  `seccion` varchar(10) DEFAULT NULL,
  `password_inicial` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `estudiante`
--

INSERT INTO `estudiante` (`id`, `nombre`, `email`, `identificacion`, `grado`, `seccion`, `password_inicial`) VALUES
(2, 'Escott Pilgrim', 'escotpilgrim@gmail.com', '9021', '10°', 'B', 'asucar'),
(3, 'Arnó Dorian', 'arnodorian@gmail.com', '8-456-321', '12°', 'C', '7BHQXC'),
(4, 'Asia', 'asia@gmail.com', '8-456-987', '10°', 'B', 'NEWuW7'),
(5, 'Emily Flores', 'emilyflores@gmail.com', '8509987', '9°', 'D', 'WUcmfY'),
(6, 'Rober Limerio', 'robertlime@gmail.com', '89032100', '10°', 'B', 'Ruwn0Q'),
(7, 'Sonia Paredes', 'soniap@gmail.com', '86443211', '10°', 'D', 'NfUMDM'),
(8, 'Berni Santero', 'bernisan@gmail.com', '8-788-453', '12°', 'C', 'Cub6Q2'),
(9, 'Yuliet Gómez', 'yuli@gmail.com', '3-677-4', '11°', 'A', 'wg9Kqf'),
(10, 'Patricia Veruz', 'patricia@gmail.com', '8-711-899', '11°', 'A', 'H41dPC'),
(11, 'Natzu Hill', 'natzu@gmail.com', '8-908-003', '11°', 'A', 'zVAIVI'),
(12, 'Terrence Yelly', 'terrence@gmail.com', '8-904-112', '12°', 'C', 'xJRodE'),
(13, 'Genesis Peralta', 'genesis@gmail.com', '8-544-650', '7°', 'A', 'lq39iq'),
(14, 'Kairo Lima', 'kairo@gmail.com', '8-112-32', '8°', 'A', 'gt8bjP'),
(15, 'Lineth Rosario', 'linethrosa@gmail.com', '8-778-908', '9°', 'A', '54tjKk');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materia`
--

CREATE TABLE `materia` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `creditos` int(11) DEFAULT 3,
  `profesor_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `materia`
--

INSERT INTO `materia` (`id`, `codigo`, `nombre`, `creditos`, `profesor_id`) VALUES
(1, 'CN01', 'Ciencias Naturales', 3, 1),
(2, 'ESP01', 'Español', 3, 4),
(3, 'FIS01', 'Física', 3, 2),
(4, 'GEO01', 'Geografía', 3, 3);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `matricula`
--

CREATE TABLE `matricula` (
  `id` int(11) NOT NULL,
  `estudiante_id` int(11) NOT NULL,
  `materia_id` int(11) NOT NULL,
  `fecha_asignacion` date DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `matricula`
--

INSERT INTO `matricula` (`id`, `estudiante_id`, `materia_id`, `fecha_asignacion`) VALUES
(1, 2, 1, '2026-06-01'),
(2, 4, 1, '2026-06-11'),
(3, 4, 3, '2026-06-11'),
(4, 4, 4, '2026-06-22'),
(5, 5, 2, '2026-06-22'),
(6, 4, 2, '2026-06-22'),
(7, 6, 2, '2026-06-22'),
(8, 3, 2, '2026-06-22'),
(9, 3, 1, '2026-06-23'),
(10, 2, 2, '2026-06-23'),
(11, 6, 1, '2026-06-23'),
(12, 6, 3, '2026-06-23'),
(13, 8, 3, '2026-06-23'),
(14, 11, 2, '2026-06-23'),
(15, 10, 2, '2026-06-23'),
(16, 15, 2, '2026-07-08');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `nota`
--

CREATE TABLE `nota` (
  `id` int(11) NOT NULL,
  `estudiante_id` int(11) NOT NULL,
  `materia_id` int(11) NOT NULL,
  `profesor_id` int(11) NOT NULL,
  `tipo` enum('PARCIAL','EXAMEN_TRIMESTRAL','APRECIACION') NOT NULL,
  `tipo_actividad` varchar(50) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `puntaje` decimal(3,1) NOT NULL CHECK (`puntaje` >= 1.0 and `puntaje` <= 5.0),
  `trimestre` enum('I Trimestre','II Trimestre','III Trimestre') NOT NULL,
  `comentario` varchar(255) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `nota`
--

INSERT INTO `nota` (`id`, `estudiante_id`, `materia_id`, `profesor_id`, `tipo`, `tipo_actividad`, `nombre`, `puntaje`, `trimestre`, `comentario`, `fecha_registro`) VALUES
(2, 2, 1, 1, 'PARCIAL', NULL, NULL, 3.4, 'I Trimestre', 'Revisar la ultima parte', '2026-06-01 01:42:11'),
(3, 2, 1, 1, 'PARCIAL', NULL, NULL, 3.4, 'I Trimestre', 'No leyó jajajaja', '2026-06-03 22:38:39'),
(4, 2, 1, 1, 'PARCIAL', NULL, NULL, 4.6, 'I Trimestre', NULL, '2026-06-03 22:38:53'),
(5, 2, 1, 1, 'PARCIAL', NULL, NULL, 5.0, 'I Trimestre', NULL, '2026-06-03 22:38:59'),
(6, 2, 1, 1, 'PARCIAL', NULL, NULL, 5.0, 'I Trimestre', NULL, '2026-06-03 22:39:05'),
(7, 2, 1, 1, 'PARCIAL', NULL, NULL, 3.7, 'I Trimestre', 'Faltó información', '2026-06-03 22:39:18'),
(8, 4, 3, 2, 'APRECIACION', 'Taller', 'Taller 1', 5.0, 'I Trimestre', 'Bien hecho', '2026-06-20 13:54:11'),
(9, 4, 3, 2, 'PARCIAL', 'Parcial', 'Parcial 1', 3.4, 'I Trimestre', NULL, '2026-06-20 13:58:22'),
(11, 4, 3, 2, 'PARCIAL', 'Parcial', 'Parcial 2', 4.0, 'I Trimestre', NULL, '2026-06-20 14:00:10'),
(12, 4, 3, 2, 'APRECIACION', 'Investigacion', 'Investigación 1', 5.0, 'I Trimestre', NULL, '2026-06-20 14:00:54'),
(13, 4, 3, 2, 'PARCIAL', 'Parcial', NULL, 3.0, 'I Trimestre', NULL, '2026-06-20 14:01:43'),
(14, 4, 3, 2, 'PARCIAL', 'Parcial', 'Parcial 3', 5.0, 'I Trimestre', NULL, '2026-06-20 14:03:04'),
(15, 4, 3, 2, 'APRECIACION', 'Exposicion', NULL, 4.0, 'I Trimestre', NULL, '2026-06-20 14:03:50'),
(16, 4, 3, 2, 'EXAMEN_TRIMESTRAL', 'Otro', 'Trimestral', 4.5, 'I Trimestre', NULL, '2026-06-20 14:04:51'),
(17, 4, 1, 1, 'PARCIAL', 'Parcial', 'Parcial 1', 4.6, 'I Trimestre', NULL, '2026-06-20 14:12:21'),
(18, 4, 1, 1, 'APRECIACION', 'Taller', 'Taller 1', 4.0, 'I Trimestre', NULL, '2026-06-20 14:12:38'),
(19, 4, 1, 1, 'APRECIACION', 'Taller', 'Taller 2', 4.7, 'I Trimestre', NULL, '2026-06-20 14:12:53'),
(20, 4, 1, 1, 'APRECIACION', 'Tarea', 'Tarea de la mitocondria', 4.4, 'I Trimestre', NULL, '2026-06-20 14:13:41'),
(21, 4, 1, 1, 'PARCIAL', 'Parcial', 'Parcial 2', 4.0, 'I Trimestre', NULL, '2026-06-20 14:15:52'),
(22, 4, 1, 1, 'PARCIAL', 'Parcial', 'Parcial 3', 4.1, 'I Trimestre', NULL, '2026-06-20 14:16:59'),
(23, 4, 1, 1, 'APRECIACION', 'Investigacion', 'Investigación 1', 4.3, 'I Trimestre', 'Fue sobre las celulas eucariotas', '2026-06-20 14:18:01'),
(24, 4, 1, 1, 'EXAMEN_TRIMESTRAL', NULL, NULL, 3.9, 'I Trimestre', NULL, '2026-06-20 14:18:38'),
(25, 4, 3, 2, 'APRECIACION', 'Taller', 'Taller 2', 5.0, 'I Trimestre', 'No me acuerdo que se hizo aqui jajs', '2026-06-20 14:27:41'),
(26, 4, 3, 2, 'APRECIACION', 'Exposicion', 'Exposición 2', 4.1, 'I Trimestre', 'Bien', '2026-06-22 16:40:56'),
(28, 5, 2, 4, 'PARCIAL', 'Parcial', 'Parcial 1', 4.6, 'I Trimestre', NULL, '2026-06-22 23:37:00'),
(31, 5, 2, 4, 'APRECIACION', 'Quiz', 'Quiz 1', 4.2, 'I Trimestre', NULL, '2026-06-23 00:17:51'),
(32, 5, 2, 4, 'PARCIAL', 'Parcial', 'Parcial 2', 4.3, 'I Trimestre', NULL, '2026-06-23 00:24:21'),
(33, 5, 2, 4, 'APRECIACION', 'Quiz', 'Quiz 2', 4.0, 'I Trimestre', NULL, '2026-06-23 00:38:41'),
(34, 5, 2, 4, 'APRECIACION', 'Quiz', 'Quiz 3', 2.1, 'I Trimestre', NULL, '2026-06-23 00:39:42'),
(35, 5, 2, 4, 'PARCIAL', 'Parcial', 'Parcial 3', 5.0, 'I Trimestre', NULL, '2026-06-23 00:46:15'),
(36, 3, 2, 4, 'APRECIACION', 'Investigacion', 'Investigación 1', 5.0, 'I Trimestre', NULL, '2026-06-23 00:48:51'),
(37, 8, 3, 2, 'APRECIACION', 'Investigacion', 'Investigación 1', 5.0, 'I Trimestre', NULL, '2026-06-23 13:55:13'),
(38, 11, 2, 4, 'APRECIACION', 'Investigacion', 'Libros perdidos', 4.0, 'I Trimestre', 'Faltó bibliografía e indice', '2026-06-25 09:14:10'),
(40, 5, 2, 4, 'APRECIACION', 'Quiz', 'Quiz 3', 2.1, 'I Trimestre', 'Fue hecho en grupo de 2', '2026-06-30 11:37:57'),
(41, 4, 3, 2, 'PARCIAL', 'Parcial', NULL, 4.8, 'I Trimestre', NULL, '2026-07-08 20:56:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `nota_auditoria`
--

CREATE TABLE `nota_auditoria` (
  `id` int(11) NOT NULL,
  `nota_id` int(11) NOT NULL,
  `editor_id` int(11) NOT NULL,
  `puntaje_anterior` decimal(3,1) NOT NULL,
  `puntaje_nuevo` decimal(3,1) NOT NULL,
  `fecha_cambio` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pregunta_seguridad`
--

CREATE TABLE `pregunta_seguridad` (
  `id` int(11) NOT NULL,
  `pregunta` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pregunta_seguridad`
--

INSERT INTO `pregunta_seguridad` (`id`, `pregunta`) VALUES
(1, '¿Cuál es el nombre de tu primera mascota?'),
(2, '¿En qué ciudad naciste?'),
(3, '¿Cuál es el apellido de tu madre?'),
(4, '¿Cuál fue el nombre de tu primera escuela?'),
(5, '¿Cuál es tu comida favorita?'),
(6, '¿Cuál es el nombre de tu mejor amigo de infancia?'),
(7, '¿Cuál fue tu primer número de teléfono?'),
(8, '¿Cuál es el modelo de tu primer auto?');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `profesor`
--

CREATE TABLE `profesor` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `identificacion` varchar(20) NOT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  `password_inicial` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `profesor`
--

INSERT INTO `profesor` (`id`, `nombre`, `email`, `identificacion`, `especialidad`, `password_inicial`) VALUES
(1, 'Jose Tobares', 'profesorTobares@gmail.com', '7070', 'Ciencias ', 'sal'),
(2, 'Profe 1', 'profe1@gmail.com', '8675489', 'Física', 'EwjYG'),
(3, 'Julio Perez', 'julioperez@gmail.com', '890904667', 'Geografia', 'VIiB6R'),
(4, 'Penelope Bonswit', 'penelopeb@gmail.com', '8567876', 'Comunicación oral y escrita', 'DQeoqF');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesion`
--

CREATE TABLE `sesion` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `activa` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sesion`
--

INSERT INTO `sesion` (`id`, `usuario_id`, `token`, `expires_at`, `activa`, `created_at`) VALUES
(1, 1, '57f1d273e076537341dcae1883ebcb38b23d91b76b0fb2a7010ba4738c853541', '2026-06-01 15:56:01', 0, '2026-06-01 00:56:01'),
(2, 1, '454795a074fad7adb2507e1ab890951a1df1f778c08b785db3d21bc0ca6eaf56', '2026-06-01 15:56:01', 0, '2026-06-01 00:56:01'),
(3, 1, 'eb945f99eb89358b794e0007659ae32cbf9b578dffeb54612db565d1648a9073', '2026-06-01 16:11:45', 0, '2026-06-01 01:11:45'),
(4, 1, '3dc4f647588b30f4a2e2a1f6ceb3e6e21fa8b72d156b76ff2a2f7084e7369aa1', '2026-06-01 16:32:47', 0, '2026-06-01 01:32:47'),
(5, 3, 'ca47a2ec4abc010896055d3443b1066515f296b6e71a4f059f9ed46f69f9c9eb', '2026-06-01 16:39:46', 0, '2026-06-01 01:39:46'),
(6, 2, '32716c4ae37a84af8357561dee19f9e3099838a8603ab0bc8adca5a122bcfb47', '2026-06-01 16:43:13', 0, '2026-06-01 01:43:13'),
(7, 1, '77ad81371d47b6c8d60890769396c87480c95df5200572553329047caf336a02', '2026-06-01 16:59:50', 0, '2026-06-01 01:59:50'),
(8, 1, 'aa50f1542ad1ce81bfdaccc0c48036a33857748a56e08320489ddf645a9b758f', '2026-06-02 12:15:28', 0, '2026-06-01 21:15:28'),
(9, 2, 'f59eed8ec7c7f051921e7892f2c62288df27bb6fb82f951a729c697a225a8316', '2026-06-02 12:18:23', 0, '2026-06-01 21:18:23'),
(10, 1, '0cf1697377b49fc1e3a5e1cf332832dfb8f4814861317280b41ec78ecefc30ea', '2026-06-02 12:21:52', 0, '2026-06-01 21:21:52'),
(11, 1, 'bbd32166ae99aea210896a4818bbb5266e43eb002ecf5ecb045bcdfe5014401f', '2026-06-03 04:28:28', 0, '2026-06-02 13:28:28'),
(12, 2, '975d7600a58383d13979b0cf2e8edef50841bca9b41b2b1a98614b5c4de42386', '2026-06-03 04:39:01', 0, '2026-06-02 13:39:01'),
(13, 3, '549fb953f6ba529903823c2e7d2cfd04ebbe6b39be84190bb63d5e79353a9ab8', '2026-06-03 04:49:14', 0, '2026-06-02 13:49:14'),
(14, 1, 'd94989819fa3228e34221222af8fe353abbd86aa2825a3ab40f981ef2ecb6bdb', '2026-06-03 04:49:36', 0, '2026-06-02 13:49:36'),
(15, 1, 'b78f72d40ab53b524393c87fd35bcef62a2c5935b90931d11584d30a63ebdff6', '2026-06-04 08:16:06', 0, '2026-06-03 17:16:06'),
(16, 1, 'f7b2df69368a648220536758e9418c0c19dda8bda955e69989547f8a3fb28b57', '2026-06-04 08:32:29', 0, '2026-06-03 17:32:29'),
(17, 1, '0648833853c6c5d190221cf93436cc124a14fa8e3462a7ab6cd2b2a359542b5d', '2026-06-04 08:44:21', 0, '2026-06-03 17:44:21'),
(18, 2, '19093ec33bde43bdcd82d69a73e996d301e7f1bc28de566839b46464dea6c511', '2026-06-04 08:58:46', 0, '2026-06-03 17:58:46'),
(19, 1, 'e74166cce1eaabe53a7427957255f6139a133191f51557a7cf2ba54512d6eae0', '2026-06-04 09:04:52', 0, '2026-06-03 18:04:52'),
(20, 2, '6d0208525a0ce96937252677d29c71255a7fe18f4b351e822483e1c9dd317d30', '2026-06-04 09:05:42', 0, '2026-06-03 18:05:42'),
(21, 1, '3ac209e36d92d796b5ccf7bd742087bd7292196233966e76152c127b147dbbdf', '2026-06-04 09:06:00', 0, '2026-06-03 18:06:00'),
(22, 1, '2bfef502e318db63df51634c94e87acf0bad370ef093e0c30afbaaa6e41dd29d', '2026-06-04 09:30:01', 0, '2026-06-03 18:30:01'),
(23, 1, '007493b57b2065b6a7cda57d4bf18732fff305f7bc7e27082cd6f5144b89e2e0', '2026-06-04 13:24:56', 0, '2026-06-03 22:24:56'),
(24, 2, '71aafdcd2fb4cea4ca0ab2eead3efc02dd169eb9784d3abd0d67705cd900a9dc', '2026-06-04 13:33:15', 0, '2026-06-03 22:33:15'),
(25, 1, '34b6a70ceac6369fe8ffd371ca315d566c605e85e2af47917dea7fd18500766e', '2026-06-04 13:36:52', 0, '2026-06-03 22:36:52'),
(26, 3, 'eee328dbb11bdca305206d533b8b075594e41d0f9222cd9a604043c7c6296496', '2026-06-04 13:37:16', 0, '2026-06-03 22:37:16'),
(27, 2, '6180436a661f4595737a151c8a589bc8b49e46f22bb07a7895d845e6a75cc667', '2026-06-04 13:42:21', 0, '2026-06-03 22:42:21'),
(28, 1, 'eeb6adacbcda3182afe90e3e457bafb1f6e78a8975f81986e7ed59cf3fb28e6a', '2026-06-04 13:45:01', 0, '2026-06-03 22:45:01'),
(29, 1, '76cbabb38f24f3e77937ec6d831982902d14075c870db1affd6c53cb4c0d20a5', '2026-06-04 13:57:25', 0, '2026-06-03 22:57:25'),
(30, 1, 'b079c610544c39804796f0b15a9dbc22e784db1c4c00a0f13b997f31a2eee226', '2026-06-04 15:11:11', 0, '2026-06-04 00:11:11'),
(31, 1, 'cf00e9d895a48a2a3ed3b09ec58ee2e4d08c2a945def780d5dd3a6529531aa01', '2026-06-04 15:22:03', 0, '2026-06-04 00:22:03'),
(32, 1, '62530f2b4a34bb868d845cbddc2079a786d53826153b97f814bc3f854dd625ec', '2026-06-04 15:24:52', 0, '2026-06-04 00:24:52'),
(33, 1, 'eb82645ce333c9b75551ca896c7fece2ebf8a32bf8f8d38c36a1e08370280989', '2026-06-04 15:45:24', 0, '2026-06-04 00:45:24'),
(34, 3, '063c8c2f572ff30446e76696bb088159d9a8af2f05996de7d15d596495ede23a', '2026-06-04 15:46:11', 0, '2026-06-04 00:46:11'),
(35, 3, 'f445deab638a70ee0e3d904d11f3d345ba99d60d6b641dabbb2abde53264e75f', '2026-06-04 15:48:19', 0, '2026-06-04 00:48:19'),
(36, 2, '5ed83491522366a8b024859850b5b7b91d4a115e8326c659246f8c979089bbcc', '2026-06-04 15:48:56', 0, '2026-06-04 00:48:56'),
(37, 1, 'c9dfc96b42def64e3e7a75d88d1b51222dc9c742107452588f1feb2129f6ced1', '2026-06-04 15:51:57', 0, '2026-06-04 00:51:57'),
(38, 1, '60050f875f17dbd837fa1d42ade5286c9c7f3123839e1fa3b2a3ffe565a3cbac', '2026-06-04 16:53:47', 0, '2026-06-04 01:53:47'),
(39, 2, '75affb536758df6ee50341624a10a76fa0c65debaec75d5f770fd03b702460f0', '2026-06-04 16:57:01', 0, '2026-06-04 01:57:01'),
(40, 3, '727b2397cf5220a35bde666b055a8aa95220df46469f406b477c96a19b1aa9e4', '2026-06-04 16:58:39', 0, '2026-06-04 01:58:39'),
(41, 1, 'd3aa4524b6d8dace8e9be407d1727d9439648f5603fcc2eadd75bba31e474ae2', '2026-06-05 09:22:41', 0, '2026-06-04 18:22:41'),
(42, 2, '24abdb949b1f077ee05e8d4cdc8d55ead9854e66bbc9bff2ff56715c49d9f55b', '2026-06-05 09:24:03', 0, '2026-06-04 18:24:03'),
(43, 3, '9c0cb26fa573f7ca53a1db3cab9027c78386b5362da02bd8d318e568193b3a22', '2026-06-05 09:41:14', 0, '2026-06-04 18:41:14'),
(44, 1, '33b877eedf678da21e6616cf749865c4a4e41ea50da9557151fb72cdf28cf88f', '2026-06-05 09:49:38', 0, '2026-06-04 18:49:38'),
(45, 1, '3affeffb7bc716ec8c0bba4348bb53ec26e1a82c50b577ba6e4c104b1dcc8d87', '2026-06-05 10:27:00', 0, '2026-06-04 19:27:00'),
(46, 2, '343a3b21ac0773ab8926fdac36d563ea3df623f10596e60fb39177b8d5f1d6b4', '2026-06-05 10:48:41', 0, '2026-06-04 19:48:41'),
(47, 1, 'a43050b56208c9fc546e8b2c6c15fe5a40b89f338945f06631f143ba785b7f1e', '2026-06-05 10:51:43', 0, '2026-06-04 19:51:43'),
(48, 1, '6a709446d71a921dfb77ca49548b70544d2d336b63fe0544ade20ca37b0cb8f3', '2026-06-08 07:05:17', 0, '2026-06-07 16:05:17'),
(49, 2, 'dd5d02d88b0b404feeffb34bdced8e95244fe40909eaca9ed47219f298411c2e', '2026-06-12 10:41:23', 0, '2026-06-11 19:41:23'),
(50, 1, '3890204e4604019d7382734177dfba03374755351c0e006c7418feca4c4ba21c', '2026-06-12 10:42:44', 0, '2026-06-11 19:42:44'),
(51, 1, '0d87a5d8d178a71e6ccfeba5b18279b042a9cb397b10d1dc9a464a5ad95e07e4', '2026-06-13 09:44:56', 0, '2026-06-12 18:44:56'),
(52, 1, '54d224c3b942b8886e469af2b10291aa8bec04331e77e4c91f569b8dcaae965e', '2026-06-13 09:44:57', 0, '2026-06-12 18:44:57'),
(53, 3, 'd5eb755eb4412ca5e672278c5a5423ece95e0653aff7fa03d66feaa88274c810', '2026-06-14 07:21:32', 0, '2026-06-13 16:21:32'),
(54, 1, 'e29f6f070efe31ec26799a9a839e78b907177786701bee61cb69bbe279d58d91', '2026-06-21 04:45:01', 0, '2026-06-20 13:45:01'),
(55, 6, '28d2a762a778e5ba96d552afeef37fb732cb460d9d76da3490af6a3dd2cd2607', '2026-06-21 04:47:33', 0, '2026-06-20 13:47:33'),
(56, 6, 'ba0723ae6c613205306d95a2e11ba9b0336bbd7cd1125bda0c14b35ae696167e', '2026-06-21 04:49:57', 0, '2026-06-20 13:49:57'),
(57, 6, '264f77275ed98d5a3b0c676e0b57fe0c0705addd4af86b2fbffe3b8465774374', '2026-06-21 04:50:31', 0, '2026-06-20 13:50:31'),
(58, 1, 'ef15f39a8d5847cfd709be5f43f1f6afe7cdc6db2e72c5695531ff2a7c6e79eb', '2026-06-21 04:50:54', 0, '2026-06-20 13:50:54'),
(59, 5, 'cb424535fe9189d6b163f8a58011e9c49187bd7fe912dcfb3c959e226e566b38', '2026-06-21 04:52:21', 0, '2026-06-20 13:52:21'),
(60, 6, '975f0ce15e247f76ae6f76aeb97e3d99c00fff6da30043ae952dcff8b11cecc8', '2026-06-21 05:05:54', 0, '2026-06-20 14:05:54'),
(61, 1, '04408a4a8ed0a58b76ce506aebc925902b930efcac86eed1c45a60477b5a2656', '2026-06-21 05:11:11', 0, '2026-06-20 14:11:11'),
(62, 3, '0f0019b82ae6667cb2c270882db469a362a690fc4242f3f0cc644e59710a388a', '2026-06-21 05:11:31', 0, '2026-06-20 14:11:31'),
(63, 6, 'ed780e40e8430ce154ce0c426423fa77c88ac9f4d64d877c8ae0ccf972722d3a', '2026-06-21 05:19:04', 0, '2026-06-20 14:19:04'),
(64, 1, '83ba609260763f892003a776539c06194341ec88c8538b450224cfa28133d140', '2026-06-21 05:21:17', 0, '2026-06-20 14:21:17'),
(65, 1, 'd58a13d0c875132a80d7aa7c1376f4c523183764814bf5f35519fd4e3d5b6588', '2026-06-21 05:26:02', 0, '2026-06-20 14:26:02'),
(66, 5, '93f6ea4ee533fbcc0c6be483ba2c19986686c8d9b8f545188fb4ff01b6a44c7b', '2026-06-21 05:26:30', 0, '2026-06-20 14:26:30'),
(67, 1, '0e6ace858ffd0a6df419d1b0c9c512d22412b14d93b06fa528bcbb3b87fce53b', '2026-06-23 07:37:49', 0, '2026-06-22 16:37:49'),
(68, 5, '350b13a42cb8e845c4f9ca4985615acdd26b6b5e4eecf139ece7610d14da231e', '2026-06-23 07:39:13', 0, '2026-06-22 16:39:13'),
(69, 1, '7827efb9b8a20d4787776421047ce6cb10a943f65c1d78de4d39073c3ef013b4', '2026-06-23 07:47:21', 0, '2026-06-22 16:47:21'),
(70, 5, 'ca8266e7d7904013feea8470850994430615d769117f2f7c48217e81a7622fd0', '2026-06-23 08:10:25', 0, '2026-06-22 17:10:25'),
(71, 6, '9b27a5362bf7fcbbac6e786d19569042ca2b3b9ccf43c488bb253b49831505fa', '2026-06-23 09:04:42', 0, '2026-06-22 18:04:42'),
(72, 5, '404fc0a8d7cb31ba32033eaef4358cd6cce155cb4597960fa9c390c0468dae94', '2026-06-23 09:05:54', 0, '2026-06-22 18:05:54'),
(73, 6, 'b7dc0792d46e495f4725ffba2b6ce41fa43fae20b8297c75af103b0c74dffac3', '2026-06-23 09:35:51', 0, '2026-06-22 18:35:51'),
(74, 1, 'ea2d28c7523d1a57805261e4d6f2a83b623e6363f1e632c8a5bea3b0bad43398', '2026-06-23 10:18:28', 0, '2026-06-22 19:18:28'),
(75, 5, '03c5c45c6cc1c6bd5ade8fca2631cc0890402c506768991e4774eba620d83f4c', '2026-06-23 11:17:15', 0, '2026-06-22 20:17:15'),
(76, 6, 'f889b98cf98fabbb9c03ad86ada9b0b6867ef20dbbbf2318b6e657c2b265fc2c', '2026-06-23 11:31:35', 0, '2026-06-22 20:31:35'),
(77, 5, '746b59888f2b02665520fdecb53efe2e2c3e2ebd35b65e40447556fc948a02c9', '2026-06-23 11:34:13', 0, '2026-06-22 20:34:13'),
(78, 1, '39493e33c5d5bd9c12b68338149d47c72db395498e8e07a6d33051e95099dcf6', '2026-06-23 11:36:41', 0, '2026-06-22 20:36:41'),
(79, 5, '2e47d8a06a408503b4ee0f5cc21c95b13c1ea22cf6dd4adbd9ef84052f904b0c', '2026-06-23 14:17:40', 0, '2026-06-22 23:17:40'),
(80, 1, 'fa4feffbbf29040df389a28a5c25663d26675fcab7c90df7b1354dd7178c5c0c', '2026-06-23 14:19:59', 0, '2026-06-22 23:19:59'),
(81, 1, 'a4319255fbde833ad58864e9ea761ca9fba36c73e8a604c3ac8299da49bf8c7d', '2026-06-23 14:24:57', 0, '2026-06-22 23:24:57'),
(82, 11, 'c28ef31a53b86e41682e8a347b6991c3c774f48392301f7d799e9f91471abb4e', '2026-06-23 14:25:22', 0, '2026-06-22 23:25:22'),
(83, 6, '59f1706b25b6d90d2a9ed9d14f8d4325a0717029c762074d14b88a45b809643a', '2026-06-23 16:20:09', 0, '2026-06-23 01:20:09'),
(84, 1, 'e7f7b8ee7bf9d7ab2e349055ff22552613a889f0b981fe1a4c5276d92d52533b', '2026-06-23 16:25:44', 0, '2026-06-23 01:25:44'),
(85, 1, '4ec513c2accc9d5b513f9b60a97a016156c9e0a5ca39fb767322d4ae18f6954c', '2026-06-23 16:52:43', 0, '2026-06-23 01:52:43'),
(86, 10, 'd27ea62db512893fa85c804de62c7e82a7ab150a03054f36027fed49724afc97', '2026-06-23 16:53:25', 0, '2026-06-23 01:53:25'),
(87, 1, '3c0959bfeb1b14c470831761ac288da5c2fe58678a07ded72451897d369934d3', '2026-06-24 04:43:25', 0, '2026-06-23 13:43:25'),
(88, 5, '415a76b23805dd35d1873c617b5d764dd07351a12d233e3fafc271f67a598f99', '2026-06-24 04:52:32', 0, '2026-06-23 13:52:32'),
(89, 1, '60e1d42c1a007a8bd1de632b1ddcfa80dd7ee83fb3d3837532f014b2f6d034f0', '2026-06-24 05:42:19', 0, '2026-06-23 14:42:19'),
(90, 11, 'a1b1b166251ed94f039407395ea82a7158efa03ed4ab6bdcfae762d243c7bf7a', '2026-06-24 06:06:44', 0, '2026-06-23 15:06:44'),
(91, 1, 'e8985fb0a17757a9868a85ab77a14582295a8746d5351598a371d7ace7e14191', '2026-06-26 00:01:20', 0, '2026-06-25 09:01:20'),
(92, 1, '292cc4c155a1d2bcf690c5362f93f051c09c1751958baac24b3bc4a8f5f991b3', '2026-06-26 00:07:23', 0, '2026-06-25 09:07:23'),
(93, 1, '82f42ce098886a6c322e078a9d15fc606c41586b0b0a7289176f14335b81a85d', '2026-06-26 00:08:05', 0, '2026-06-25 09:08:05'),
(94, 6, '7c677a2d8a1f5712a0ba6033d85d4478c4eac3bb4065b00f8df250d3a2cbdb3a', '2026-06-26 00:08:19', 0, '2026-06-25 09:08:19'),
(95, 5, 'ae17f16fc9769349ea4a1bdfacc2f3249ef3b83e04770a46dac4e55dc68f7ced', '2026-06-26 00:09:55', 0, '2026-06-25 09:09:55'),
(96, 11, '664ea15f33d92acd349259114398fa241129f2d9d974855edfb9f060b5bd6a4d', '2026-06-26 00:10:53', 0, '2026-06-25 09:10:53'),
(97, 1, '2d7dbeea744fda5fc61366a928e4841c14275866b19295a277414618dbb28a1a', '2026-06-26 00:21:46', 0, '2026-06-25 09:21:46'),
(98, 1, 'c7d18791a24b9fa182032577062d1a2473e356959faba636b82cb4b654b69d3b', '2026-06-28 07:27:46', 0, '2026-06-27 16:27:46'),
(99, 6, 'd4d18f6601054e22f1c4f56361a956a7ee27616cb881ad19e1d6734d9ec031c3', '2026-06-28 07:53:06', 0, '2026-06-27 16:53:06'),
(100, 1, '25d3e5a6cd189aa88da0e9991436452da3ca68f6abd935a1b2ebd92486597b2e', '2026-06-28 07:53:44', 0, '2026-06-27 16:53:44'),
(101, 1, '0072a785dc3510c52941f67ab549b43a3d5237bb3b4daaefcf5182eadb9fa156', '2026-06-28 08:34:08', 0, '2026-06-27 17:34:08'),
(102, 6, 'd284a516f8c20d68a38d0875f43531ea1a0c73a0cc283b41284d06f88671367f', '2026-06-28 08:34:28', 0, '2026-06-27 17:34:28'),
(103, 5, 'afd42ae41f6ffae061a1fdeca77dc4f43624b8c2f49d2ad0b35710378c48f00b', '2026-06-28 08:38:20', 0, '2026-06-27 17:38:20'),
(104, 6, '906a8c3203c0671d8d064b21a8e4a8c5970a4d9ec845b34e39e327c75a359279', '2026-06-28 08:40:33', 0, '2026-06-27 17:40:33'),
(105, 1, '4e423252f40a8a5340bf4967c0799f9e408745a489f9f1c6cec2324bbce4ab89', '2026-06-28 08:41:03', 0, '2026-06-27 17:41:03'),
(106, 6, 'd218b9cccf4f1169c8b5b71d189183257566dd08107a0c810f180244845de1f5', '2026-06-28 09:08:10', 0, '2026-06-27 18:08:10'),
(107, 1, '25ffa6d9852087471d1b470924e6b8ecc8a6ebc99056b18d19ca15a3fe4418ea', '2026-06-28 09:19:56', 0, '2026-06-27 18:19:56'),
(108, 6, 'b6852600666aec7f9260063bc30cbbb028dd1807fde5a1fe86c295f22dfa4291', '2026-06-28 09:53:10', 0, '2026-06-27 18:53:10'),
(109, 1, 'b4bdba8ae2324492fc2b7f72ed77f7c64328d2b8cbd34e6e531319b8a654ef89', '2026-06-28 09:56:04', 0, '2026-06-27 18:56:04'),
(110, 6, '4a0704184aa1e7107e531a081f7f88036ddb8e1670e29d92354c98ffe3af364c', '2026-06-28 09:59:44', 0, '2026-06-27 18:59:44'),
(111, 5, 'bd988df2c31df4bc54a7b19e9be156c560ddca29f2c9ef7634c93b8da201e41b', '2026-06-28 10:01:24', 0, '2026-06-27 19:01:24'),
(112, 1, '4ace653a41449e67caa30da1d24c73b65e1562d48803dc0eaa45a381932bccfc', '2026-07-01 02:27:36', 0, '2026-06-30 11:27:36'),
(113, 11, '20a5529f5206af54ce425d7601baacfc9871154af6cf2aa52e800653c3714cf5', '2026-07-01 02:31:34', 0, '2026-06-30 11:31:34'),
(114, 1, '9dd798e282cb76c8e6c9cbf0c83b1d21333685d0890066d06378cd978bafa412', '2026-07-04 02:53:03', 0, '2026-07-03 11:53:03'),
(115, 5, '4488a1efb94cf7877a8272aa92d38f4ace033a9eb8b603e4c80e1eec9c428404', '2026-07-04 02:58:19', 0, '2026-07-03 11:58:19'),
(116, 1, '5c0de51c14967615026b0941755af3c7f7a1b39cca2c5940554759f0faee5b96', '2026-07-07 09:44:27', 0, '2026-07-06 18:44:27'),
(117, 1, '9cacbf3f12ba5e8695ecf1495a2e489511a6d1cb071925d8311b8eb4091cd38a', '2026-07-09 10:02:18', 0, '2026-07-08 19:02:18'),
(118, 5, '51abd0b54bfcb78135c6abddbb505801c3a49692c0d4e43a9dec412a36bd0a21', '2026-07-09 11:53:39', 0, '2026-07-08 20:53:39'),
(119, 6, 'bc250263e4d32601bfb9b77feda455cd6fa74756db8127df217c2fb89379dc60', '2026-07-09 11:56:30', 0, '2026-07-08 20:56:30'),
(120, 1, '5ef6edbed484c89546a5e73de33a54e2c6b4ebb61be5d7af08527a5177ec9a9c', '2026-07-09 12:34:01', 0, '2026-07-08 21:34:01'),
(121, 5, '516e1972dfe5aff50c3678fb856ee43014008ad4c61891f59ee8b6d10b547992', '2026-07-09 12:38:34', 0, '2026-07-08 21:38:34'),
(122, 6, '6257a0795cd80ebe4ea396e1e08ca296ceec14af45f7e867bba9c17e10522906', '2026-07-09 12:41:26', 0, '2026-07-08 21:41:26');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('admin','profesor','estudiante') NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `id_referencia` int(11) DEFAULT NULL,
  `password_cambiada` tinyint(1) DEFAULT 0,
  `preguntas_configuradas` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id`, `email`, `password_hash`, `rol`, `nombre`, `id_referencia`, `password_cambiada`, `preguntas_configuradas`) VALUES
(1, 'admin@escuela.edu', '$2y$12$kxBNnam4GaKdpVnunJzqJej6KM4DqLtt9czVJH3YcIC.tjI4U6YTy', 'admin', 'Administrador', NULL, 1, 1),
(2, 'escotpilgrim@gmail.com', '$2y$12$zTB/newMGZwUfB2nvGTKYeA4z55MEEmkWxsWLtvQwOjXMnQ2gCEOG', 'estudiante', 'Escott Pilgrim', 2, 1, 1),
(3, 'profesorTobares@gmail.com', '$2y$12$krM6fLObOqTBpdrpoYsUIOjJykdIJy/O2RHOxsHczHDKnyeTCZVYK', 'profesor', 'Jose Tobares', 1, 1, 1),
(4, 'arnodorian@gmail.com', '$2y$12$o1/qaJZ9fNaS5YapSeQTB.o5D7bDdoqzPxdy/6NlDTpC.RpjufNkC', 'estudiante', 'Arnó Dorian', 3, 0, 0),
(5, 'profe1@gmail.com', '$2y$12$U9Mi0Qm2yp.ENQGdeoCAe.JKEvu2dmwA0SxoxPhSVYHQzqniJJa7W', 'profesor', 'Profe 1', 2, 1, 1),
(6, 'asia@gmail.com', '$2y$12$v4CKkK9hxtS3zw5Wc10AxO5Mm2cpyhBZGLbAyi5f14EGe3FJyWMRC', 'estudiante', 'Asia', 4, 1, 1),
(7, 'emilyflores@gmail.com', '$2y$12$gpzUEl.za4WyejUisBuYk.untHkoU/0cSJMCiSbSRtPa1.8vEQyfG', 'estudiante', 'Emily Flores', 5, 0, 0),
(8, 'robertlime@gmail.com', '$2y$12$k8L9oiuAkzOr3sBUl3q.x.mkYSw1woUIvnrwJI1co2D/9r.t8wG4.', 'estudiante', 'Rober Limerio', 6, 0, 0),
(9, 'soniap@gmail.com', '$2y$12$TkKENouMeUdI7TWzH3jNlupMZY.xVbkCdXi.4KWlCXa3Jriro4Mhu', 'estudiante', 'Sonia Paredes', 7, 0, 0),
(10, 'julioperez@gmail.com', '$2y$12$zssaAG5Eoj2E0IawiDgq4u8t.L/ugstSsQS9oHgWPi.4JLn9IBe4m', 'profesor', 'Julio Perez', 3, 1, 1),
(11, 'penelopeb@gmail.com', '$2y$12$1yw1rft4tO.W7UYNJ5kZXeuKHbnhheeixT.HeaYgl7JfpgXPZ51Ci', 'profesor', 'Penelope Bonswit', 4, 1, 1),
(12, 'bernisan@gmail.com', '$2y$12$SJusSYd0rU19GplonQdgVur1UmMC1psllSjVvmlo0RTSGDM9m.0tS', 'estudiante', 'Berni Santero', 8, 0, 0),
(13, 'yuli@gmail.com', '$2y$12$kKbd04c45u8lQ9X/OzrkquTB6FOaHadiXvfR1Y9PybNk7MpjkTt6G', 'estudiante', 'Yuliet Gómez', 9, 0, 0),
(14, 'patricia@gmail.com', '$2y$12$nPy0sWisQC.LexfNRTI8XOd8tkRkk3xiCF2HrGQU57WlzV49i4B.y', 'estudiante', 'Patricia Veruz', 10, 0, 0),
(15, 'natzu@gmail.com', '$2y$12$FMMfpIQ/d85wxqu8x5XBaOrAb6Ihws0H5iNmQJD2S.T8zwde6B2we', 'estudiante', 'Natzu Hill', 11, 0, 0),
(16, 'terrence@gmail.com', '$2y$12$hvDkX6Pufw0gCsOOxKX0CuzOl4hxILzlnrhOtouYpve2UYH1Q7mYy', 'estudiante', 'Terrence Yelly', 12, 0, 0),
(17, 'genesis@gmail.com', '$2y$12$u1kw7pJyD9yXgafenk7lrOylnG.SOAX1EH0eQKwWK3LO0WkFpk5xC', 'estudiante', 'Genesis Peralta', 13, 0, 0),
(18, 'kairo@gmail.com', '$2y$12$cjSxX9FXvUZSTZm3..Azxel/2hU49AWkVciMXjcARdQclaOrdzioq', 'estudiante', 'Kairo Lima', 14, 0, 0),
(19, 'linethrosa@gmail.com', '$2y$12$eR/ZmixpZGXT4KFirJ5uc.MYivuxsdUXfCF9xajYQhWOqQYz95D3y', 'estudiante', 'Lineth Rosario', 15, 0, 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_pregunta`
--

CREATE TABLE `usuario_pregunta` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `pregunta_id` int(11) NOT NULL,
  `respuesta_hash` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario_pregunta`
--

INSERT INTO `usuario_pregunta` (`id`, `usuario_id`, `pregunta_id`, `respuesta_hash`) VALUES
(1, 2, 1, '$2y$10$MZUQmTnnaKG3f5oj0j1UO.OHB73WeqzGCAlPFPvrSnrzN.rDhGsDC'),
(2, 2, 5, '$2y$10$1.tFrYeA9MJUCM1uTk2NkOdumq7l9MmUyesUbkgNBb4AS6GF2DO6e'),
(3, 2, 2, '$2y$10$IcQ4jFdG/4R2wqCVdMGjS.SGE.rQwnyHWaUurEytL5pAIpfaiud5e'),
(4, 3, 1, '$2y$10$./jyjDPmoBaiAADtFSPRGOvLLpaKhQKTUwDOlNg37rbRYm68ymkke'),
(5, 3, 2, '$2y$10$gF3ho8RilMQ1cKMFXEnV7uH6rQ0nFv.BlQnb32zTOBUHBEqr9gu0a'),
(6, 3, 5, '$2y$10$TAMFu1iTyVZDjYbhWL27cuvq9CQmEf2kjNzKOZLVeB.bn4ToIorEa'),
(10, 5, 4, '$2y$10$vSUr9GYGqusKbjoQ1t7CaeIyOzfDifTpf/OKf4GWDlBUZ1fMNuATS'),
(11, 5, 2, '$2y$10$f.r5H/M44O6GpX5W31XmCucmPk3ZEuFgQozPTzTodnWcaa9v9Ylyq'),
(12, 5, 5, '$2y$10$I0AdRmh/KTZ2UztlxbNZYODdMkEshZ9kZ21lTOnwWWzC67L1.bzPq'),
(13, 11, 1, '$2y$10$94MVDUZVzAZ95VYDtQovTel/8CerwG5CurMguaPs2dqMBQ2/JxI.q'),
(14, 11, 2, '$2y$10$4oTZTD4HuA1wS8742ZpNAOxOYr4BEzowytW/n/eQGmbj.Bohc.xD2'),
(15, 11, 3, '$2y$10$tuKSDHMaEIK2d4A9bKzD4u8ytp/WswT6HtALRy58mkDOntdfIGhTu'),
(16, 10, 2, '$2y$10$9me3ezXa3f/KwHoa2w/7k./MtBnwaAX76MofAjPhjUEsewO2Lgr.a'),
(17, 10, 5, '$2y$10$39xpnM9iawcF7LJBy2DYkuJi4ulWjqVgJ0qI4vTlVEHs3e8Ha/Ewa'),
(18, 10, 4, '$2y$10$ZVT5rKVoYN3KGMHtzzlmh.91XlIqZq4UwWbjdfG.PZ68FgfGvNRpC'),
(22, 6, 1, '$2y$10$Lg6MniIf1uEUHg1tzKsUHu8SnUcRW4/iZhcOe0SSO99gQB7AbTzFe'),
(23, 6, 2, '$2y$10$ZWFQ5Kom5gy56qE0V2plpeUF5GFpHnI1flukT6p17FhkWZtKEx.WC'),
(24, 6, 3, '$2y$10$f79vdRCNj56o4T1/tK2oP.tPJBb1SE0wpXk/i1V5s9kFOp8IPQ8na');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `comentario`
--
ALTER TABLE `comentario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_estudiante` (`estudiante_id`),
  ADD KEY `idx_materia` (`materia_id`);

--
-- Indices de la tabla `estudiante`
--
ALTER TABLE `estudiante`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `identificacion` (`identificacion`);

--
-- Indices de la tabla `materia`
--
ALTER TABLE `materia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD KEY `profesor_id` (`profesor_id`);

--
-- Indices de la tabla `matricula`
--
ALTER TABLE `matricula`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_matricula` (`estudiante_id`,`materia_id`),
  ADD KEY `materia_id` (`materia_id`);

--
-- Indices de la tabla `nota`
--
ALTER TABLE `nota`
  ADD PRIMARY KEY (`id`),
  ADD KEY `estudiante_id` (`estudiante_id`),
  ADD KEY `materia_id` (`materia_id`),
  ADD KEY `profesor_id` (`profesor_id`);

--
-- Indices de la tabla `nota_auditoria`
--
ALTER TABLE `nota_auditoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `nota_id` (`nota_id`),
  ADD KEY `editor_id` (`editor_id`);

--
-- Indices de la tabla `pregunta_seguridad`
--
ALTER TABLE `pregunta_seguridad`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `profesor`
--
ALTER TABLE `profesor`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `identificacion` (`identificacion`);

--
-- Indices de la tabla `sesion`
--
ALTER TABLE `sesion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indices de la tabla `usuario_pregunta`
--
ALTER TABLE `usuario_pregunta`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_usuario_pregunta` (`usuario_id`,`pregunta_id`),
  ADD KEY `fk_up_pregunta` (`pregunta_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `comentario`
--
ALTER TABLE `comentario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `estudiante`
--
ALTER TABLE `estudiante`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `materia`
--
ALTER TABLE `materia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `matricula`
--
ALTER TABLE `matricula`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `nota`
--
ALTER TABLE `nota`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT de la tabla `nota_auditoria`
--
ALTER TABLE `nota_auditoria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pregunta_seguridad`
--
ALTER TABLE `pregunta_seguridad`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `profesor`
--
ALTER TABLE `profesor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `sesion`
--
ALTER TABLE `sesion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=123;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT de la tabla `usuario_pregunta`
--
ALTER TABLE `usuario_pregunta`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `comentario`
--
ALTER TABLE `comentario`
  ADD CONSTRAINT `comentario_ibfk_1` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiante` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comentario_ibfk_2` FOREIGN KEY (`materia_id`) REFERENCES `materia` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `materia`
--
ALTER TABLE `materia`
  ADD CONSTRAINT `materia_ibfk_1` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `matricula`
--
ALTER TABLE `matricula`
  ADD CONSTRAINT `matricula_ibfk_1` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiante` (`id`),
  ADD CONSTRAINT `matricula_ibfk_2` FOREIGN KEY (`materia_id`) REFERENCES `materia` (`id`);

--
-- Filtros para la tabla `nota`
--
ALTER TABLE `nota`
  ADD CONSTRAINT `nota_ibfk_1` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiante` (`id`),
  ADD CONSTRAINT `nota_ibfk_2` FOREIGN KEY (`materia_id`) REFERENCES `materia` (`id`),
  ADD CONSTRAINT `nota_ibfk_3` FOREIGN KEY (`profesor_id`) REFERENCES `profesor` (`id`);

--
-- Filtros para la tabla `nota_auditoria`
--
ALTER TABLE `nota_auditoria`
  ADD CONSTRAINT `nota_auditoria_ibfk_1` FOREIGN KEY (`nota_id`) REFERENCES `nota` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `nota_auditoria_ibfk_2` FOREIGN KEY (`editor_id`) REFERENCES `profesor` (`id`);

--
-- Filtros para la tabla `sesion`
--
ALTER TABLE `sesion`
  ADD CONSTRAINT `sesion_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuario_pregunta`
--
ALTER TABLE `usuario_pregunta`
  ADD CONSTRAINT `fk_up_pregunta` FOREIGN KEY (`pregunta_id`) REFERENCES `pregunta_seguridad` (`id`),
  ADD CONSTRAINT `fk_up_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
