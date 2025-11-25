<?php
// Stream de sonido subido por usuario
require_once __DIR__ . '/INCLUDES/conexion.php';
session_start();

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
if ($mime === 'application/octet-stream') {
    // Detección rápida por extensión
    $lower = strtolower($nombre);
    if (str_ends_with($lower, '.mp3')) $mime = 'audio/mpeg';
    elseif (str_ends_with($lower, '.wav')) $mime = 'audio/wav';
    elseif (str_ends_with($lower, '.ogg')) $mime = 'audio/ogg';
    elseif (str_ends_with($lower, '.m4a') || str_ends_with($lower, '.aac')) $mime = 'audio/aac';
    elseif (str_ends_with($lower, '.webm')) $mime = 'audio/webm';
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
