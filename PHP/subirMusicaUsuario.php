<?php
require_once __DIR__ . '/../INCLUDES/conexion.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

// Asegura existencia de la tabla singular musica_usuario
function ensureMusicTable(mysqli $cx) {
    // Si existe, validar estructura mínima y corregir si falta AUTO_INCREMENT / PK
    $rs = $cx->query("SHOW TABLES LIKE 'musica_usuario'");
    if ($rs && $rs->num_rows > 0) {
        $desc = $cx->query("SHOW COLUMNS FROM musica_usuario");
        $hasAuto = false; $hasId = false; $hasUsuario = false; $hasNombre=false; $hasArchivo=false; $hasMime=false; $hasFecha=false;
        while ($desc && ($col = $desc->fetch_assoc())) {
            $field = $col['Field'];
            if ($field === 'id_musica_usuario') { $hasId = true; if (stripos($col['Extra'], 'auto_increment') !== false) $hasAuto = true; }
            elseif ($field === 'usuario_id') $hasUsuario = true;
            elseif ($field === 'nombre') $hasNombre = true;
            elseif ($field === 'archivo_musica') $hasArchivo = true;
            elseif ($field === 'mime_type') $hasMime = true;
            elseif ($field === 'fecha_subida') $hasFecha = true;
        }
        // Ajustar PRIMARY KEY y luego AUTO_INCREMENT (orden correcto para evitar error)
        if ($hasId) {
            $pkCheck = $cx->query("SHOW INDEX FROM musica_usuario WHERE Key_name='PRIMARY'");
            $hasPK = ($pkCheck && $pkCheck->num_rows > 0);
            // Si falta PK, agregar primero (sin AUTO_INCREMENT).
            if (!$hasPK) {
                $cx->query("ALTER TABLE musica_usuario ADD PRIMARY KEY (id_musica_usuario)");
            }
            // Si falta AUTO_INCREMENT, aplicarlo ahora (ya es clave o se acaba de crear)
            if (!$hasAuto) {
                $cx->query("ALTER TABLE musica_usuario MODIFY id_musica_usuario INT(11) NOT NULL AUTO_INCREMENT");
            }
        }
        // Añadir índice usuario_id si falta
        $idx = $cx->query("SHOW INDEX FROM musica_usuario WHERE Key_name='usuario_id'");
        if (!$idx || $idx->num_rows === 0) {
            $cx->query("ALTER TABLE musica_usuario ADD INDEX usuario_id (usuario_id)");
        }
        // Añadir columna mime_type si faltara
        if (!$hasMime) {
            $cx->query("ALTER TABLE musica_usuario ADD mime_type VARCHAR(60) DEFAULT NULL AFTER archivo_musica");
        }
        // Añadir fecha_subida si faltara
        if (!$hasFecha) {
            $cx->query("ALTER TABLE musica_usuario ADD fecha_subida DATETIME DEFAULT current_timestamp() AFTER mime_type");
        }
        return 'musica_usuario';
    }
    // Crear con estructura correcta si no existe
    $create = "CREATE TABLE musica_usuario (\n        id_musica_usuario INT AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        nombre VARCHAR(150) NOT NULL,\n        archivo_musica LONGBLOB DEFAULT NULL,\n        mime_type VARCHAR(60) DEFAULT NULL,\n        fecha_subida DATETIME DEFAULT current_timestamp(),\n        INDEX(usuario_id)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if ($cx->query($create)) return 'musica_usuario';
    throw new Exception('No se pudo crear tabla musica_usuario');
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('No autenticado');
    }
    $usuario_id = (int)$_SESSION['user_id'];

    // Verificar tabla
    $musicTable = ensureMusicTable($conexion);

    // Aceptar campo 'music' principal y fallback a otros posibles nombres
    $fileField = null;
    foreach (['music','sound','file','audio'] as $candidate) {
        if (isset($_FILES[$candidate])) { $fileField = $candidate; break; }
    }
    if (!$fileField || $_FILES[$fileField]['error'] !== UPLOAD_ERR_OK) {
        $err = $fileField ? $_FILES[$fileField]['error'] : 'Archivo no recibido';
        throw new Exception('Error al subir el archivo: ' . $err);
    }

    $name = $_FILES[$fileField]['name'] ?? 'archivo';
    $tmp = $_FILES[$fileField]['tmp_name'];
    if (!is_uploaded_file($tmp)) {
        throw new Exception('Upload inválido');
    }
    $size = filesize($tmp);
    if ($size === false || $size <= 0) throw new Exception('Archivo vacío');

    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $allowed = ['mp3','wav','ogg','m4a','aac','webm'];
    if (!in_array($ext, $allowed, true)) {
        throw new Exception('Formato no permitido. Usa mp3, wav, ogg, m4a, aac, webm');
    }
    if ($size > 100 * 1024 * 1024) { // 100MB
        throw new Exception('Archivo supera 100MB');
    }

    // mime_content_type puede fallar si la extensión fileinfo no está habilitada
    $mime = function_exists('mime_content_type') ? (mime_content_type($tmp) ?: '') : '';
    if (!$mime || $mime === 'application/octet-stream') {
        // Heurística por extensión
        $map = [
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'm4a' => 'audio/mp4',
            'aac' => 'audio/aac',
            'webm' => 'audio/webm'
        ];
        $mime = $map[$ext] ?? 'application/octet-stream';
    }

    $data = file_get_contents($tmp);
    if ($data === false) throw new Exception('No se pudo leer el archivo');

    $stmt = $conexion->prepare("INSERT INTO $musicTable (usuario_id, nombre, archivo_musica, mime_type) VALUES (?, ?, ?, ?)");
    if (!$stmt) throw new Exception('Error preparar INSERT: ' . $conexion->error);
    $null = null;
    $stmt->bind_param('isbs', $usuario_id, $name, $null, $mime);
    $stmt->send_long_data(2, $data);
    if (!$stmt->execute()) throw new Exception('Error al guardar: ' . $stmt->error);
    $newId = $conexion->insert_id;
    $stmt->close();

    echo json_encode([
        'success' => true,
        'id' => $newId,
        'name' => $name,
        'mime' => $mime,
        'size' => $size
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
if (isset($conexion) && $conexion instanceof mysqli) { $conexion->close(); }
?>
