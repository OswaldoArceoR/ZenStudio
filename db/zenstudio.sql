-- --------------------------------------------------------
-- Base de datos: `zenstudio`
-- --------------------------------------------------------

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- --------------------------------------------------------
-- Tabla: usuarios
-- --------------------------------------------------------
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `contrasenia` varchar(255) NOT NULL,
  `rol` varchar(30) NOT NULL DEFAULT 'cliente',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `usuarios` (`username`, `nombre`, `email`, `contrasenia`, `rol`) VALUES
('Beno1we2', 'Oswaldo Arceo', 'beno1we2@maildrop.cc', '$2y$10$vHIt.6ktB4fc7RmjuEI5L.ypABUIvXJ1GcZof1HUuQop.fZpzsIcu', 'cliente');

-- --------------------------------------------------------
-- Tabla: escenas
-- --------------------------------------------------------
CREATE TABLE `escenas` (
  `id_escena` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_escena`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `escenas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Tabla: fondos_globales
-- --------------------------------------------------------
CREATE TABLE `fondos_globales` (
  `id_fondo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(90) NOT NULL,
  `categoria` varchar(90) NOT NULL,
  `url_imagen` text NOT NULL,
  PRIMARY KEY (`id_fondo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Tabla: fondos_usuario
-- --------------------------------------------------------
CREATE TABLE `fondos_usuario` (
  `id_fondo_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `archivo_fondo` blob DEFAULT NULL,
  `fecha_subida` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_fondo_usuario`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fondos_usuario_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Tabla: sonidos_globales
-- --------------------------------------------------------
CREATE TABLE `sonidos_globales` (
  `id_sonido` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `categoria` varchar(50) NOT NULL,
  `url_audio` text NOT NULL,
  PRIMARY KEY (`id_sonido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Tabla: sonidos_usuario
-- --------------------------------------------------------
CREATE TABLE `sonidos_usuario` (
  `id_sonido_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `archivo_sonido` blob DEFAULT NULL,
  `fecha_subida` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_sonido_usuario`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `sonidos_usuario_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- Tabla: elementos_interactivos
-- --------------------------------------------------------
CREATE TABLE `elementos_interactivos` (
  `id_elemento` int(11) NOT NULL AUTO_INCREMENT,
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

-- --------------------------------------------------------
-- Tabla: configuraciones
-- --------------------------------------------------------
CREATE TABLE `configuraciones` (
  `id_config` int(11) NOT NULL AUTO_INCREMENT,
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

COMMIT;
