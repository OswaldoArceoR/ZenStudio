<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../INCLUDES/conexion.php';

$resp = ['success' => false, 'musica' => [], 'message' => ''];

function ensureMusicTable(mysqli $cx) {
    $rs = $cx->query("SHOW TABLES LIKE 'musica_usuario'");
    if ($rs && $rs->num_rows > 0) {
        $desc = $cx->query("SHOW COLUMNS FROM musica_usuario");
        $hasAuto = false; $hasId = false; $hasMime=false; $hasFecha=false; $hasUsuario=false; $hasArchivo=false; $hasNombre=false;
        while ($desc && ($col = $desc->fetch_assoc())) {
            $field = $col['Field'];
            if ($field === 'id_musica_usuario') { $hasId = true; if (stripos($col['Extra'], 'auto_increment') !== false) $hasAuto = true; }
            elseif ($field === 'usuario_id') $hasUsuario=true;
            elseif ($field === 'nombre') $hasNombre=true;
            elseif ($field === 'archivo_musica') $hasArchivo=true;
            elseif ($field === 'mime_type') $hasMime=true;
            elseif ($field === 'fecha_subida') $hasFecha=true;
        }
        if ($hasId && !$hasAuto) {
            $cx->query("ALTER TABLE musica_usuario MODIFY id_musica_usuario INT(11) NOT NULL AUTO_INCREMENT");
            $pkCheck = $cx->query("SHOW INDEX FROM musica_usuario WHERE Key_name='PRIMARY'");
            if (!$pkCheck || $pkCheck->num_rows === 0) {
                $cx->query("ALTER TABLE musica_usuario ADD PRIMARY KEY (id_musica_usuario)");
            }
        }
        $idx = $cx->query("SHOW INDEX FROM musica_usuario WHERE Key_name='usuario_id'");
        if (!$idx || $idx->num_rows === 0) { $cx->query("ALTER TABLE musica_usuario ADD INDEX usuario_id (usuario_id)"); }
        if (!$hasMime) { $cx->query("ALTER TABLE musica_usuario ADD mime_type VARCHAR(60) DEFAULT NULL AFTER archivo_musica"); }
        if (!$hasFecha) { $cx->query("ALTER TABLE musica_usuario ADD fecha_subida DATETIME DEFAULT current_timestamp() AFTER mime_type"); }
        return 'musica_usuario';
    }
    $create = "CREATE TABLE musica_usuario (\n        id_musica_usuario INT AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        nombre VARCHAR(150) NOT NULL,\n        archivo_musica LONGBLOB DEFAULT NULL,\n        mime_type VARCHAR(60) DEFAULT NULL,\n        fecha_subida DATETIME DEFAULT current_timestamp(),\n        INDEX(usuario_id)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if ($cx->query($create)) return 'musica_usuario';
    throw new Exception('No se pudo crear tabla musica_usuario');
}

try {
    if (!isset($_SESSION['user_id'])) throw new Exception('No autenticado');
    $usuario_id = (int)$_SESSION['user_id'];

    $musicTable = ensureMusicTable($conexion);
    $sql = "SELECT id_musica_usuario AS id, nombre, mime_type FROM $musicTable WHERE usuario_id = ? ORDER BY id_musica_usuario DESC";
    $stmt = $conexion->prepare($sql);
    if (!$stmt) throw new Exception('Error preparar consulta: ' . $conexion->error);
    $stmt->bind_param('i', $usuario_id);
    if (!$stmt->execute()) throw new Exception('Error ejecutar consulta: ' . $stmt->error);
    $rs = $stmt->get_result();
    while ($row = $rs->fetch_assoc()) {
        $nombre = $row['nombre'];
        $mime = $row['mime_type'] ?: 'application/octet-stream';
        // Compatibilidad PHP<8 para ends_with
        if (!function_exists('zen_ends_with')) {
            function zen_ends_with($haystack, $needle) {
                if ($needle === '') return true;
                $hlen = strlen($haystack); $nlen = strlen($needle);
                if ($nlen > $hlen) return false;
                return substr($haystack, -$nlen) === $needle;
            }
        }
        $lower = strtolower($nombre);
        if ($mime === 'application/octet-stream') {
            if (zen_ends_with($lower, '.mp3')) $mime = 'audio/mpeg';
            elseif (zen_ends_with($lower, '.wav')) $mime = 'audio/wav';
            elseif (zen_ends_with($lower, '.ogg')) $mime = 'audio/ogg';
            elseif (zen_ends_with($lower, '.m4a') || zen_ends_with($lower, '.aac')) $mime = 'audio/aac';
            elseif (zen_ends_with($lower, '.webm')) $mime = 'audio/webm';
        }
        $resp['musica'][] = [
            'id' => (int)$row['id'],
            'nombre' => $nombre,
            'mime' => $mime,
            'url' => 'verMusicaUsuario.php?id=' . (int)$row['id']
        ];
    }
    $stmt->close();
    $resp['success'] = true;
} catch (Exception $e) {
    $resp['message'] = $e->getMessage();
}
echo json_encode($resp, JSON_UNESCAPED_UNICODE);
if (isset($conexion) && $conexion instanceof mysqli) $conexion->close();
?>
