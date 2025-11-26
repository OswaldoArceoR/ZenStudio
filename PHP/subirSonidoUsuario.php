<?php
require_once __DIR__ . '/../INCLUDES/conexion.php';
session_start();
header('Content-Type: application/json');

// Garantiza existencia y estructura de la tabla sonidos_usuario
function ensureSoundTable(mysqli $cx) {
    $rs = $cx->query("SHOW TABLES LIKE 'sonidos_usuario'");
    if ($rs && $rs->num_rows > 0) {
        $desc = $cx->query("SHOW COLUMNS FROM sonidos_usuario");
        $hasId=false; $hasAuto=false; $hasUsuario=false; $hasNombre=false; $hasArchivo=false; $hasMime=false; $hasFecha=false;
        while ($desc && ($c = $desc->fetch_assoc())) {
            $f = $c['Field'];
            if ($f === 'id_sonido_usuario') { $hasId=true; if (stripos($c['Extra'], 'auto_increment') !== false) $hasAuto=true; }
            elseif ($f === 'usuario_id') $hasUsuario=true;
            elseif ($f === 'nombre') $hasNombre=true;
            elseif ($f === 'archivo_sonido') $hasArchivo=true;
            elseif ($f === 'mime_type') $hasMime=true;
            elseif ($f === 'fecha_subida') $hasFecha=true;
        }
        if ($hasId && !$hasAuto) {
            $cx->query("ALTER TABLE sonidos_usuario MODIFY id_sonido_usuario INT(11) NOT NULL AUTO_INCREMENT");
            $pk = $cx->query("SHOW INDEX FROM sonidos_usuario WHERE Key_name='PRIMARY'");
            if (!$pk || $pk->num_rows === 0) { $cx->query("ALTER TABLE sonidos_usuario ADD PRIMARY KEY (id_sonido_usuario)"); }
        }
        $idx = $cx->query("SHOW INDEX FROM sonidos_usuario WHERE Key_name='usuario_id'");
        if (!$idx || $idx->num_rows === 0) { $cx->query("ALTER TABLE sonidos_usuario ADD INDEX usuario_id (usuario_id)"); }
        if (!$hasMime) { $cx->query("ALTER TABLE sonidos_usuario ADD mime_type VARCHAR(60) DEFAULT NULL AFTER archivo_sonido"); }
        if (!$hasFecha) { $cx->query("ALTER TABLE sonidos_usuario ADD fecha_subida DATETIME DEFAULT current_timestamp() AFTER mime_type"); }
        return 'sonidos_usuario';
    }
    $create = "CREATE TABLE sonidos_usuario (\n        id_sonido_usuario INT AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        nombre VARCHAR(150) NOT NULL,\n        archivo_sonido LONGBLOB DEFAULT NULL,\n        mime_type VARCHAR(60) DEFAULT NULL,\n        fecha_subida DATETIME DEFAULT current_timestamp(),\n        INDEX(usuario_id)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if ($cx->query($create)) return 'sonidos_usuario';
    throw new Exception('No se pudo crear sonidos_usuario');
}

try {
    // Verificar el método de la solicitud
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido.');
    }

    // Depuración: Verificar si la sesión está activa y el ID de sesión
    error_log('ID de sesión: ' . session_id());
    error_log('Contenido de $_SESSION: ' . print_r($_SESSION, true));

    if (!isset($_SESSION['user_id'])) {
        throw new Exception('No se ha iniciado sesión.');
    }

    $usuario_id = $_SESSION['user_id']; // Obtener el ID del usuario desde la sesión

    // Asegurar tabla correcta
    ensureSoundTable($conexion);

    // Verificar si se recibió un archivo
    if (!isset($_FILES['sound']) || $_FILES['sound']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir el archivo: ' . ($_FILES['sound']['error'] ?? 'Archivo no recibido.'));
    }

    // Depuración: Verificar detalles del archivo recibido
    error_log('Detalles del archivo recibido: ' . print_r($_FILES['sound'], true));

    $nombre = $_FILES['sound']['name'];
    $archivoTmp = $_FILES['sound']['tmp_name'];
    $size = filesize($archivoTmp);
    $mime = function_exists('mime_content_type') ? (mime_content_type($archivoTmp) ?: '') : '';
    if (!$mime || $mime === 'application/octet-stream') {
        $map = [
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'm4a' => 'audio/mp4',
            'aac' => 'audio/aac',
            'webm'=> 'audio/webm'
        ];
        $mime = $map[$ext] ?? 'application/octet-stream';
    }

    // Validaciones básicas
    if ($size === false || $size <= 0) {
        throw new Exception('Archivo vacío o no legible.');
    }
    // Extensiones/mime permitidos
    $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
    $extPermitidas = ['mp3','wav','ogg','m4a','aac','webm'];
    if (!in_array($ext, $extPermitidas)) {
        throw new Exception('Formato no permitido. Usa mp3, wav, ogg, m4a, aac, webm');
    }
    if ($size > 50 * 1024 * 1024) { // 50MB
        throw new Exception('El archivo excede el límite de 50MB.');
    }

    $archivoContenido = file_get_contents($archivoTmp);
    if ($archivoContenido === false) {
        throw new Exception('No se pudo leer el contenido del archivo.');
    }

    // Columna mime_type ya validada en ensureSoundTable
    $tieneMime = true;

    if ($tieneMime) {
        $stmt = $conexion->prepare("INSERT INTO sonidos_usuario (usuario_id, nombre, mime_type, archivo_sonido) VALUES (?, ?, ?, ?)");
        if (!$stmt) throw new Exception('Error al preparar INSERT (mime): ' . $conexion->error);
        $blob = null;
        $stmt->bind_param('issb', $usuario_id, $nombre, $mime, $blob);
        $stmt->send_long_data(3, $archivoContenido); // cuarto parámetro índice 3
    } else {
        $stmt = $conexion->prepare("INSERT INTO sonidos_usuario (usuario_id, nombre, archivo_sonido) VALUES (?, ?, ?)");
        if (!$stmt) throw new Exception('Error al preparar INSERT: ' . $conexion->error);
        $blob = null;
        $stmt->bind_param('isb', $usuario_id, $nombre, $blob);
        $stmt->send_long_data(2, $archivoContenido); // tercer parámetro índice 2
    }

    if (!$stmt->execute()) {
        throw new Exception('Error al guardar en la base de datos: ' . $stmt->error);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Sonido subido exitosamente.',
        'id' => $conexion->insert_id ?? null,
        'mime' => $mime,
        'size' => $size,
        'hasMimeColumn' => $tieneMime
    ]);
} catch (Exception $e) {
    // Depuración: Registrar el error en el log
    error_log('Error en subirSonidoUsuario.php: ' . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($stmt) && $stmt instanceof mysqli_stmt) {
        $stmt->close();
    }
    if (isset($conexion) && $conexion instanceof mysqli) {
        $conexion->close();
    }
}

// Depuración adicional
error_log('Fin del script subirSonidoUsuario.php');
?>