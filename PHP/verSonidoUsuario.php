<?php
// Stream de sonido subido por usuario
require_once __DIR__ . '/../INCLUDES/conexion.php';
session_start();

function ensureSoundTable(mysqli $cx) {
    $rs = $cx->query("SHOW TABLES LIKE 'sonidos_usuario'");
    if ($rs && $rs->num_rows > 0) {
        $desc = $cx->query("SHOW COLUMNS FROM sonidos_usuario");
        $hasId=false; $hasAuto=false; $hasMime=false; $hasFecha=false; $hasArchivo=false; $hasNombre=false; $hasUsuario=false;
        while ($desc && ($c = $desc->fetch_assoc())) {
            $f = $c['Field'];
            if ($f === 'id_sonido_usuario') { $hasId=true; if (stripos($c['Extra'],'auto_increment')!==false) $hasAuto=true; }
            elseif ($f === 'usuario_id') $hasUsuario=true; elseif ($f==='nombre') $hasNombre=true; elseif ($f==='archivo_sonido') $hasArchivo=true; elseif ($f==='mime_type') $hasMime=true; elseif ($f==='fecha_subida') $hasFecha=true;
        }
        if ($hasId && !$hasAuto) {
            $cx->query("ALTER TABLE sonidos_usuario MODIFY id_sonido_usuario INT(11) NOT NULL AUTO_INCREMENT");
            $pk = $cx->query("SHOW INDEX FROM sonidos_usuario WHERE Key_name='PRIMARY'");
            if (!$pk || $pk->num_rows===0) { $cx->query("ALTER TABLE sonidos_usuario ADD PRIMARY KEY (id_sonido_usuario)"); }
        }
        $idx=$cx->query("SHOW INDEX FROM sonidos_usuario WHERE Key_name='usuario_id'");
        if (!$idx || $idx->num_rows===0) { $cx->query("ALTER TABLE sonidos_usuario ADD INDEX usuario_id (usuario_id)"); }
        if (!$hasMime) { $cx->query("ALTER TABLE sonidos_usuario ADD mime_type VARCHAR(60) DEFAULT NULL AFTER archivo_sonido"); }
        if (!$hasFecha) { $cx->query("ALTER TABLE sonidos_usuario ADD fecha_subida DATETIME DEFAULT current_timestamp() AFTER mime_type"); }
        return 'sonidos_usuario';
    }
    $create = "CREATE TABLE sonidos_usuario (\n        id_sonido_usuario INT AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        nombre VARCHAR(150) NOT NULL,\n        archivo_sonido LONGBLOB DEFAULT NULL,\n        mime_type VARCHAR(60) DEFAULT NULL,\n        fecha_subida DATETIME DEFAULT current_timestamp(),\n        INDEX(usuario_id)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if ($cx->query($create)) return 'sonidos_usuario';
    throw new Exception('No se pudo crear sonidos_usuario');
}

ensureSoundTable($conexion);

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) { http_response_code(400); exit('ID inválido'); }
if (!isset($_SESSION['user_id'])) { http_response_code(401); exit('No autenticado'); }
$usuario_id = (int)$_SESSION['user_id'];

$sql = 'SELECT archivo_sonido, nombre, mime_type FROM sonidos_usuario WHERE id_sonido_usuario = ? AND usuario_id = ? LIMIT 1';
$stmt = $conexion->prepare($sql);
if (!$stmt) { http_response_code(500); exit('Error preparar consulta'); }
$stmt->bind_param('ii', $id, $usuario_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row || empty($row['archivo_sonido'])) { http_response_code(404); exit('No encontrado'); }
$data = $row['archivo_sonido'];
$size = strlen($data);
$nombre = $row['nombre'];
$mime = $row['mime_type'] ?: 'application/octet-stream';
// Compatibilidad PHP<8: helper para ends_with
if (!function_exists('zen_ends_with')) {
    function zen_ends_with($haystack, $needle) {
        if ($needle === '') return true;
        $hlen = strlen($haystack); $nlen = strlen($needle);
        if ($nlen > $hlen) return false;
        return substr($haystack, -$nlen) === $needle;
    }
}
if ($mime === 'application/octet-stream') {
    // Detección rápida por extensión
    $lower = strtolower($nombre);
    if (zen_ends_with($lower, '.mp3')) $mime = 'audio/mpeg';
    elseif (zen_ends_with($lower, '.wav')) $mime = 'audio/wav';
    elseif (zen_ends_with($lower, '.ogg')) $mime = 'audio/ogg';
    elseif (zen_ends_with($lower, '.m4a') || zen_ends_with($lower, '.aac')) $mime = 'audio/aac';
    elseif (zen_ends_with($lower, '.webm')) $mime = 'audio/webm';
}

header('Content-Type: ' . $mime);
header('Accept-Ranges: bytes');

$range = $_SERVER['HTTP_RANGE'] ?? null;
if ($range && preg_match('/bytes=(\d*)-(\d*)/i', $range, $m)) {
    $start = ($m[1] !== '') ? (int)$m[1] : 0;
    $end   = ($m[2] !== '') ? (int)$m[2] : ($size - 1);
    if ($start > $end || $start >= $size) {
        header('Content-Range: bytes */' . $size);
        http_response_code(416);
        exit;
    }
    $length = $end - $start + 1;
    header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
    header('Content-Length: ' . $length);
    http_response_code(206);
    echo substr($data, $start, $length);
    exit;
}
header('Content-Length: ' . $size);
http_response_code(200);
echo $data;
exit;
