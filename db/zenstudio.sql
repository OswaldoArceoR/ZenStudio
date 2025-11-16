-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 15-11-2025 a las 05:45:50
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
-- Base de datos: `zenstudio`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `contrasenia` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `username`, `nombre`, `email`, `contrasenia`) VALUES
(0, 'Beno1we2', 'Oswaldo Arceo', 'beno1we2@maildrop.cc', '$2y$10$vHIt.6ktB4fc7RmjuEI5L.ypABUIvXJ1GcZof1HUuQop.fZpzsIcu');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- Añadir columna rol a la tabla usuarios
ALTER TABLE `usuarios` 
ADD COLUMN `rol` VARCHAR(30) NOT NULL DEFAULT 'cliente' AFTER `contrasenia`;

-- Actualizar manualmente algún usuario a admin si es necesario
-- UPDATE `usuarios` SET `rol` = 'admin' WHERE `id` = [id_del_usuario];

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `escenas`
-- --------------------------------------------------------

CREATE TABLE `escenas` (
  `id_escena` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_escena`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `escenas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- AUTO_INCREMENT de la tabla `escenas`
--
ALTER TABLE `escenas`
  MODIFY `id_escena` int(11) NOT NULL AUTO_INCREMENT;


-- --------------------------------------------------------
-- Estructura de tabla para la tabla `fondos_usuario`
-- --------------------------------------------------------

CREATE TABLE `fondos_usuario` (
  `id_fondo_usuario` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `archivo_fondo` blob DEFAULT NULL,
  `fecha_subida` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_fondo_usuario`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fondos_usuario_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- AUTO_INCREMENT de la tabla `fondos_usuario`
--
ALTER TABLE `fondos_usuario`
  MODIFY `id_fondo_usuario` int(11) NOT NULL AUTO_INCREMENT;}


-- --------------------------------------------------------
-- Estructura de tabla para la tabla `elementos_interactivos`
-- --------------------------------------------------------

CREATE TABLE `elementos_interactivos` (
  `id_elemento` int(11) NOT NULL,
  `nombre` varchar(180) NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `usuario_creador_id` int(11) NOT NULL,
  `url_virtual` text DEFAULT NULL,
  `posicion_x` float DEFAULT 0,
  `posicion_y` float DEFAULT 0,
  `escena_id` int(11) NOT NULL,
  PRIMARY KEY (`id_elemento`),
  KEY `usuario_creador_id` (`usuario_creador_id`),
  KEY `escena_id` (`escena_id`),
  CONSTRAINT `elementos_interactivos_ibfk_1` FOREIGN KEY (`usuario_creador_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `elementos_interactivos_ibfk_2` FOREIGN KEY (`escena_id`) REFERENCES `escenas` (`id_escena`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- AUTO_INCREMENT de la tabla `elementos_interactivos`
--
ALTER TABLE `elementos_interactivos`
  MODIFY `id_elemento` int(11) NOT NULL AUTO_INCREMENT;


-- --------------------------------------------------------
-- Estructura de tabla para la tabla `sonidos_usuario`
-- --------------------------------------------------------

CREATE TABLE `sonidos_usuario` (
  `id_sonido_usuario` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `archivo_sonido` blob DEFAULT NULL,
  `fecha_subida` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_sonido_usuario`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `sonidos_usuario_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- AUTO_INCREMENT de la tabla `sonidos_usuario`
--
ALTER TABLE `sonidos_usuario`
  MODIFY `id_sonido_usuario` int(11) NOT NULL AUTO_INCREMENT;



-- --------------------------------------------------------
-- Estructura de tabla para la tabla `configuraciones`
-- --------------------------------------------------------

CREATE TABLE `configuraciones` (
  `id_config` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `escena_id` int(11) NOT NULL,
  `fondo_global_id` int(11) DEFAULT NULL,
  `fondo_usuario_id` int(11) DEFAULT NULL,
  `sonido_global_id` int(11) DEFAULT NULL,
  `sonido_usuario_id` int(11) DEFAULT NULL,
  `volumen_ambiente` int(11) DEFAULT 50,
  `fecha_ultima_carga` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_config`),
  KEY `usuario_id` (`usuario_id`),
  KEY `escena_id` (`escena_id`),
  KEY `fondo_global_id` (`fondo_global_id`),
  KEY `fondo_usuario_id` (`fondo_usuario_id`),
  KEY `sonido_global_id` (`sonido_global_id`),
  KEY `sonido_usuario_id` (`sonido_usuario_id`),
  CONSTRAINT `configuraciones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `configuraciones_ibfk_2` FOREIGN KEY (`escena_id`) REFERENCES `escenas` (`id_escena`) ON DELETE CASCADE,
  CONSTRAINT `configuraciones_ibfk_3` FOREIGN KEY (`fondo_global_id`) REFERENCES `fondos_globales` (`id_fondo`),
  CONSTRAINT `configuraciones_ibfk_4` FOREIGN KEY (`fondo_usuario_id`) REFERENCES `fondos_usuario` (`id_fondo_usuario`),
  CONSTRAINT `configuraciones_ibfk_5` FOREIGN KEY (`sonido_global_id`) REFERENCES `sonidos_globales` (`id_sonido`),
  CONSTRAINT `configuraciones_ibfk_6` FOREIGN KEY (`sonido_usuario_id`) REFERENCES `sonidos_usuario` (`id_sonido_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- AUTO_INCREMENT de la tabla `configuraciones`
--
ALTER TABLE `configuraciones`
  MODIFY `id_config` int(11) NOT NULL AUTO_INCREMENT;


-- --------------------------------------------------------
-- Estructura de tabla para la tabla `fondos_globales`
-- --------------------------------------------------------

CREATE TABLE `fondos_globales` (
  `id_fondo` int(11) NOT NULL,
  `nombre` varchar(90) NOT NULL,
  `categoria` varchar(90) NOT NULL,
  `url_imagen` text NOT NULL,
  PRIMARY KEY (`id_fondo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- AUTO_INCREMENT de la tabla `fondos_globales`
--
ALTER TABLE `fondos_globales`
  MODIFY `id_fondo` int(11) NOT NULL AUTO_INCREMENT;


-- --------------------------------------------------------
-- Estructura de tabla para la tabla `sonidos_globales`
-- --------------------------------------------------------

CREATE TABLE `sonidos_globales` (
  `id_sonido` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `categoria` varchar(50) NOT NULL,
  `url_audio` text NOT NULL,
  PRIMARY KEY (`id_sonido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- AUTO_INCREMENT de la tabla `sonidos_globales`
--
ALTER TABLE `sonidos_globales`
  MODIFY `id_sonido` int(11) NOT NULL AUTO_INCREMENT;
