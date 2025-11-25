<?php
require_once __DIR__ . '/INCLUDES/conexion.php';
session_start(); // Iniciar sesión para obtener el ID del usuario

header('Content-Type: application/json'); // Asegurar que la respuesta sea JSON

try {
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

    if (!isset($_FILES['background']) || $_FILES['background']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Error al subir el archivo: ' . ($_FILES['background']['error'] ?? 'Archivo no recibido.'));
    }

    // Verificar si el usuario existe
    $stmt = $conexion->prepare("SELECT id FROM usuarios WHERE id = ?");
    if (!$stmt) {
        throw new Exception('Error al preparar la consulta para verificar el usuario: ' . $conexion->error);
    }

    $stmt->bind_param('i', $usuario_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception('El usuario con ID ' . $usuario_id . ' no existe.');
    }

    $stmt->close();

    $nombre = $_FILES['background']['name'];
    $archivoTmp = $_FILES['background']['tmp_name'];
    $mime = mime_content_type($archivoTmp) ?: 'application/octet-stream';
    $size = filesize($archivoTmp);

    // Validaciones básicas
    $extPermitidas = ['gif','mp4','png','jpg','jpeg'];
    $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
    if (!in_array($ext, $extPermitidas)) {
        throw new Exception('Tipo de archivo no permitido. Solo: gif, mp4, png, jpg, jpeg');
    }
    if ($size === false || $size <= 0) {
        throw new Exception('Archivo vacío o tamaño inválido.');
    }
    // Límite razonable (ej: 60MB) ajustar según necesidades
    if ($size > 60 * 1024 * 1024) {
        throw new Exception('El archivo excede el límite de 60MB.');
    }

    $archivoContenido = file_get_contents($archivoTmp);

    if ($archivoContenido === false) {
        throw new Exception('No se pudo leer el contenido del archivo.');
    }

    // Inserción como BLOB. Si la tabla aún no tiene mime_type puedes omitir ese campo.
    // Intentar agregar campo mime_type si existe.
    $tieneMime = false;
    $resCols = $conexion->query("SHOW COLUMNS FROM fondos_usuario");
    if ($resCols) {
        while ($col = $resCols->fetch_assoc()) {
            if (strcasecmp($col['Field'], 'mime_type') === 0) { $tieneMime = true; break; }
        }
    }
    if ($tieneMime) {
        $stmt = $conexion->prepare("INSERT INTO fondos_usuario (usuario_id, nombre, mime_type, archivo_fondo) VALUES (?, ?, ?, ?)");
        if (!$stmt) throw new Exception('Error preparar INSERT con mime_type: ' . $conexion->error);
        // Usamos placeholder vacío para blob y luego send_long_data
        $blobPlaceholder = null; // será llenado con send_long_data
        $stmt->bind_param('issb', $usuario_id, $nombre, $mime, $blobPlaceholder);
        $stmt->send_long_data(3, $archivoContenido); // índice 3 = cuarto parámetro
    } else {
        $stmt = $conexion->prepare("INSERT INTO fondos_usuario (usuario_id, nombre, archivo_fondo) VALUES (?, ?, ?)");
        if (!$stmt) throw new Exception('Error preparar INSERT: ' . $conexion->error);
        $blobPlaceholder = null;
        $stmt->bind_param('isb', $usuario_id, $nombre, $blobPlaceholder);
        $stmt->send_long_data(2, $archivoContenido); // índice 2 = tercer parámetro
    }
    if (!$stmt->execute()) throw new Exception('Error al guardar en la base de datos: ' . $stmt->error);

    echo json_encode([
        'success' => true,
        'message' => 'Fondo subido exitosamente como BLOB.',
        'nombre' => $nombre,
        'size' => $size,
        'mime' => $mime,
        'hasMimeColumn' => $tieneMime
    ]);
} catch (Exception $e) {
    error_log('[SUBIR_FONDO][ERROR] ' . $e->getMessage());
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
?>