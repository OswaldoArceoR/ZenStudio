<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/INCLUDES/conexion.php';

$response = [ 'success' => false, 'fondos' => [], 'message' => '' ];

try {
    if (!isset($_SESSION['user_id'])) {
        throw new Exception('No se ha iniciado sesión.');
    }
    $usuario_id = (int)$_SESSION['user_id'];

    // Preparar consulta
    $sql = 'SELECT id_fondo_usuario AS id, nombre FROM fondos_usuario WHERE usuario_id = ? ORDER BY id_fondo_usuario DESC';
    $stmt = $conexion->prepare($sql);
    if (!$stmt) {
        throw new Exception('Error al preparar consulta: ' . $conexion->error);
    }
    $stmt->bind_param('i', $usuario_id);
    if (!$stmt->execute()) {
        throw new Exception('Error al ejecutar consulta: ' . $stmt->error);
    }
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $nombre = $row['nombre'];
        $lower = strtolower($nombre);
        $mime = 'application/octet-stream';
        if (str_ends_with($lower, '.mp4')) $mime = 'video/mp4';
        elseif (str_ends_with($lower, '.png')) $mime = 'image/png';
        elseif (str_ends_with($lower, '.jpg') || str_ends_with($lower, '.jpeg')) $mime = 'image/jpeg';
        elseif (str_ends_with($lower, '.gif')) $mime = 'image/gif';

        $response['fondos'][] = [
            'id' => (int)$row['id'],
            'nombre' => $nombre,
            'mime' => $mime,
            'url' => 'verFondoUsuario.php?id=' . (int)$row['id']
        ];
    }
    $stmt->close();

    $response['success'] = true;
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
    error_log('[OBTENER_FONDOS_USUARIO][ERROR] ' . $e->getMessage());
}

// Evitar problemas de encoding
echo json_encode($response, JSON_UNESCAPED_UNICODE);

if (isset($conexion) && $conexion instanceof mysqli) {
    $conexion->close();
}
?>