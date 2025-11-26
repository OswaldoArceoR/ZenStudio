<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../INCLUDES/conexion.php';

$resp = ['success' => false, 'musica' => [], 'message' => ''];
try {
    if (!isset($_SESSION['user_id'])) throw new Exception('No autenticado');
    $usuario_id = (int)$_SESSION['user_id'];

    $sql = 'SELECT id_musica_usuario AS id, nombre, mime_type FROM musica_usuario WHERE usuario_id = ? ORDER BY id_musica_usuario DESC';
    $stmt = $conexion->prepare($sql);
    if (!$stmt) throw new Exception('Error preparar consulta: ' . $conexion->error);
    $stmt->bind_param('i', $usuario_id);
    if (!$stmt->execute()) throw new Exception('Error ejecutar consulta: ' . $stmt->error);
    $rs = $stmt->get_result();
    while ($row = $rs->fetch_assoc()) {
        $nombre = $row['nombre'];
        $mime = $row['mime_type'] ?: 'application/octet-stream';
        $lower = strtolower($nombre);
        if ($mime === 'application/octet-stream') {
            if (str_ends_with($lower, '.mp3')) $mime = 'audio/mpeg';
            elseif (str_ends_with($lower, '.wav')) $mime = 'audio/wav';
            elseif (str_ends_with($lower, '.ogg')) $mime = 'audio/ogg';
            elseif (str_ends_with($lower, '.m4a') || str_ends_with($lower, '.aac')) $mime = 'audio/aac';
            elseif (str_ends_with($lower, '.webm')) $mime = 'audio/webm';
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
