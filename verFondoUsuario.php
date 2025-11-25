<?php
// Sirve el BLOB de un fondo de usuario
require_once __DIR__ . '/INCLUDES/conexion.php';
session_start();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    exit('ID inválido');
}
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    exit('No autenticado');
}
$usuario_id = (int)$_SESSION['user_id'];

// Verificar que el fondo pertenece al usuario
$sql = 'SELECT archivo_fondo, nombre FROM fondos_usuario WHERE id_fondo_usuario = ? AND usuario_id = ? LIMIT 1';
$stmt = $conexion->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    exit('Error preparar consulta');
}
$stmt->bind_param('ii', $id, $usuario_id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row || empty($row['archivo_fondo'])) {
    http_response_code(404);
    exit('No encontrado');
}
$data = $row['archivo_fondo'];
$size = strlen($data);
$nombre = $row['nombre'];

// Detectar MIME por contenido o extensión
$mime = 'application/octet-stream';
$finfo = new finfo(FILEINFO_MIME_TYPE);
$detected = $finfo->buffer($data);
if ($detected) { $mime = $detected; }
else {
    $lower = strtolower($nombre);
    if (str_ends_with($lower, '.mp4')) $mime = 'video/mp4';
    elseif (str_ends_with($lower, '.png')) $mime = 'image/png';
    elseif (str_ends_with($lower, '.jpg') || str_ends_with($lower, '.jpeg')) $mime = 'image/jpeg';
    elseif (str_ends_with($lower, '.gif')) $mime = 'image/gif';
}

header('Content-Type: ' . $mime);
header('Content-Length: ' . $size);
header('Accept-Ranges: bytes');

// Soporte de rango simple
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
    header("Content-Range: bytes {$start}-{$end}/{$size}");
    header('Content-Length: ' . $length);
    http_response_code(206);
    echo substr($data, $start, $length);
    exit;
}

echo $data;
exit;
