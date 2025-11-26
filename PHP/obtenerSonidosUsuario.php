<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../INCLUDES/conexion.php';

// Compatibilidad PHP<8: helper para ends_with
if (!function_exists('zen_ends_with')) {
    function zen_ends_with($haystack, $needle) {
        if ($needle === '') return true;
        $hlen = strlen($haystack); $nlen = strlen($needle);
        if ($nlen > $hlen) return false;
        return substr($haystack, -$nlen) === $needle;
    }
}

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

$response = ['success' => false, 'sonidos' => [], 'message' => ''];
try {
    if (!isset($_SESSION['user_id'])) throw new Exception('No autenticado');
    $usuario_id = (int)$_SESSION['user_id'];

    // Asegurar tabla y estructura
    ensureSoundTable($conexion);
    $tieneMime = true; // tras ensure siempre existe

    $sql = 'SELECT id_sonido_usuario AS id, nombre, ' . ($tieneMime ? 'mime_type' : 'NULL AS mime_type') . ' FROM sonidos_usuario WHERE usuario_id = ? ORDER BY id_sonido_usuario DESC';
    $stmt = $conexion->prepare($sql);
    if (!$stmt) throw new Exception('Error preparar consulta: ' . $conexion->error);
    $stmt->bind_param('i', $usuario_id);
    if (!$stmt->execute()) throw new Exception('Error ejecutar consulta: ' . $stmt->error);
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $nombre = $row['nombre'];
        $lower = strtolower($nombre);
        $mime = $row['mime_type'] ?: 'application/octet-stream';
        if ($mime === 'application/octet-stream') {
            if (zen_ends_with($lower, '.mp3')) $mime = 'audio/mpeg';
            elseif (zen_ends_with($lower, '.wav')) $mime = 'audio/wav';
            elseif (zen_ends_with($lower, '.ogg')) $mime = 'audio/ogg';
            elseif (zen_ends_with($lower, '.m4a') || zen_ends_with($lower, '.aac')) $mime = 'audio/aac';
            elseif (zen_ends_with($lower, '.webm')) $mime = 'audio/webm';
        }
        $response['sonidos'][] = [
            'id' => (int)$row['id'],
            'nombre' => $nombre,
            'mime' => $mime,
            'url' => 'verSonidoUsuario.php?id=' . (int)$row['id']
        ];
    }
    $stmt->close();
    $response['success'] = true;
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    error_log('[OBTENER_SONIDOS_USUARIO][ERROR] ' . $e->getMessage());
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
if (isset($conexion) && $conexion instanceof mysqli) $conexion->close();
