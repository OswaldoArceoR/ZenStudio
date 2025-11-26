<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../INCLUDES/conexion.php';

$response = ['success' => false, 'sonidos' => [], 'message' => ''];
try {
    if (!isset($_SESSION['user_id'])) throw new Exception('No autenticado');
    $usuario_id = (int)$_SESSION['user_id'];

    // Verificar columnas (mime_type opcional)
    $tieneMime = false;
    $cols = $conexion->query('SHOW COLUMNS FROM sonidos_usuario');
    if ($cols) {
        while ($c = $cols->fetch_assoc()) {
            if (strcasecmp($c['Field'], 'mime_type') === 0) { $tieneMime = true; break; }
        }
    }

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
            if (str_ends_with($lower, '.mp3')) $mime = 'audio/mpeg';
            elseif (str_ends_with($lower, '.wav')) $mime = 'audio/wav';
            elseif (str_ends_with($lower, '.ogg')) $mime = 'audio/ogg';
            elseif (str_ends_with($lower, '.m4a') || str_ends_with($lower, '.aac')) $mime = 'audio/aac';
            elseif (str_ends_with($lower, '.webm')) $mime = 'audio/webm';
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
