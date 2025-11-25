<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit();
}

$userId = (int)$_SESSION['user_id'];
$id = null;
if (isset($_POST['id'])) $id = $_POST['id'];
elseif (isset($_GET['id'])) $id = $_GET['id'];

if (!$id || !ctype_digit($id)) {
    echo json_encode(['success' => false, 'message' => 'ID inválido']);
    exit();
}

require_once __DIR__ . '/INCLUDES/conexion.php';

try {
    // Verificar pertenencia
    $stmt = $conexion->prepare('SELECT id_sonido_usuario FROM sonidos_usuario WHERE id_sonido_usuario = ? AND usuario_id = ? LIMIT 1');
    if (!$stmt) throw new Exception('Error preparar verificación: ' . $conexion->error);
    $stmt->bind_param('ii', $id, $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Sonido no encontrado o no pertenece al usuario']);
        $stmt->close();
        exit();
    }
    $stmt->close();

    // Eliminar
    $del = $conexion->prepare('DELETE FROM sonidos_usuario WHERE id_sonido_usuario = ? AND usuario_id = ?');
    if (!$del) throw new Exception('Error preparar eliminación: ' . $conexion->error);
    $del->bind_param('ii', $id, $userId);
    if (!$del->execute()) {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar', 'error_detalle' => $del->error]);
        $del->close();
        exit();
    }
    $del->close();

    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    error_log('[eliminarSonidoUsuario] ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Excepción en servidor']);
}

if (isset($conexion) && $conexion instanceof mysqli) $conexion->close();
