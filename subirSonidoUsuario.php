<?php
require_once __DIR__ . '/INCLUDES/conexion.php';
session_start(); // Iniciar sesión para obtener el ID del usuario

header('Content-Type: application/json'); // Asegurar que la respuesta sea JSON

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

    // Verificar si se recibió un archivo
    if (!isset($_FILES['sound']) || $_FILES['sound']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir el archivo: ' . ($_FILES['sound']['error'] ?? 'Archivo no recibido.'));
    }

    // Depuración: Verificar detalles del archivo recibido
    error_log('Detalles del archivo recibido: ' . print_r($_FILES['sound'], true));

    $nombre = $_FILES['sound']['name'];
    $archivoTmp = $_FILES['sound']['tmp_name'];
    $size = filesize($archivoTmp);
    $mime = mime_content_type($archivoTmp) ?: 'application/octet-stream';

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

    // Detectar si existe columna mime_type en sonidos_usuario
    $tieneMime = false;
    $cols = $conexion->query("SHOW COLUMNS FROM sonidos_usuario");
    if ($cols) {
        while ($c = $cols->fetch_assoc()) {
            if (strcasecmp($c['Field'], 'mime_type') === 0) { $tieneMime = true; break; }
        }
    }

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