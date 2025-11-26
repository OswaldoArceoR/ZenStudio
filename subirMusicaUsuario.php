<?php
require_once __DIR__ . '/INCLUDES/conexion.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método no permitido');
    }
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('No autenticado');
    }
    $usuario_id = (int)$_SESSION['user_id'];

    if (!isset($_FILES['music']) || $_FILES['music']['error'] !== UPLOAD_ERR_OK) {
        $err = $_FILES['music']['error'] ?? 'Archivo no recibido';
        throw new Exception('Error al subir el archivo: ' . $err);
    }

    $name = $_FILES['music']['name'] ?? 'archivo';
    $tmp = $_FILES['music']['tmp_name'];
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

    $mime = mime_content_type($tmp) ?: 'application/octet-stream';
    $data = file_get_contents($tmp);
    if ($data === false) throw new Exception('No se pudo leer el archivo');

    $stmt = $conexion->prepare('INSERT INTO musica_usuario (usuario_id, nombre, archivo_musica, mime_type) VALUES (?, ?, ?, ?)');
    if (!$stmt) throw new Exception('Error preparar INSERT: ' . $conexion->error);
    $null = null;
    // Usar tipo 'b' para BLOB y send_long_data en el índice del parámetro BLOB
    $stmt->bind_param('isbs', $usuario_id, $name, $null, $mime);
    $stmt->send_long_data(2, $data);
    if (!$stmt->execute()) throw new Exception('Error al guardar: ' . $stmt->error);
    $newId = $conexion->insert_id;
    $stmt->close();

    echo json_encode(['success' => true, 'id' => $newId, 'name' => $name]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
if (isset($conexion) && $conexion instanceof mysqli) { $conexion->close(); }
?>
