<?php
// No BOM, no espacios antes de este PHP
// verBlobGlobal.php
require_once __DIR__ . '/INCLUDES/conexion.php';

$tipo = $_GET['tipo'] ?? '';
$id   = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!in_array($tipo, ['fondo', 'sonido'], true) || $id <= 0) {
  http_response_code(400);
  exit('Parámetros inválidos');
}

if ($tipo === 'fondo') {
  $sql = "SELECT archivo_blob AS blob_data, mime_type FROM fondos_globales WHERE id_fondo = ?";
} else {
  $sql = "SELECT archivo_blob AS blob_data, mime_type FROM sonidos_globales WHERE id_sonido = ?";
}

$stmt = $conexion->prepare($sql);
$stmt->bind_param('i', $id);
$stmt->execute();
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row || empty($row['blob_data'])) {
  http_response_code(404);
  exit('No encontrado');
}

$data = $row['blob_data'];
$size = strlen($data);

// Modo depuración: guardar el blob servido en disco para comparar
if (isset($_GET['debug']) && $_GET['debug'] == '1') {
  $debugFile = __DIR__ . '/debug_blob_' . $tipo . '_' . $id . '.bin';
  file_put_contents($debugFile, $data);
}

// MIME: usa columna si existe; si no, detecta

$mime = !empty($row['mime_type']) ? $row['mime_type'] : 'application/octet-stream';
if ($mime === 'application/octet-stream') {
  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $detected = $finfo->buffer($data);
  if ($detected) $mime = $detected;
}


// Seguridad y compatibilidad
header("Content-Type: {$mime}");
header("Accept-Ranges: bytes");

$range = $_SERVER['HTTP_RANGE'] ?? null;
if ($range && preg_match('/bytes=(\\d*)-(\\d*)/i', $range, $m)) {
  $start = ($m[1] !== '') ? (int)$m[1] : 0;
  $end   = ($m[2] !== '') ? (int)$m[2] : ($size - 1);

  if ($start > $end || $start >= $size) {
    header("Content-Range: bytes */{$size}");
    http_response_code(416);
    exit;
  }

  $length = $end - $start + 1;
  header("Content-Range: bytes {$start}-{$end}/{$size}");
  header("Content-Length: {$length}");
  http_response_code(206);
  echo substr($data, $start, $length);
  exit;
}

header("Content-Length: {$size}");
http_response_code(200);
echo $data;
exit;

$range = $_SERVER['HTTP_RANGE'] ?? null;
if ($range && preg_match('/bytes=(\d*)-(\d*)/i', $range, $m)) {
  $start = ($m[1] !== '') ? (int)$m[1] : 0;
  $end   = ($m[2] !== '') ? (int)$m[2] : ($size - 1);

  if ($start > $end || $start >= $size) {
    header("Content-Range: bytes */{$size}");
    http_response_code(416);
    exit;
  }

  $length = $end - $start + 1;
  header("Content-Range: bytes {$start}-{$end}/{$size}");
  header("Content-Length: {$length}");
  http_response_code(206);
  echo substr($data, $start, $length);
  exit;
}

header("Content-Length: {$size}");
http_response_code(200);
echo $data;
exit;
