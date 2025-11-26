<?php
require_once __DIR__ . '/INCLUDES/conexion.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$resp = ['success' => false, 'message' => ''];
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Método no permitido');
    if (!isset($_SESSION['user_id'])) throw new Exception('No autenticado');
    $usuario_id = (int)$_SESSION['user_id'];
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    if ($id <= 0) throw new Exception('ID inválido');

    $stmt = $conexion->prepare('DELETE FROM musica_usuario WHERE id_musica_usuario = ? AND usuario_id = ?');
    if (!$stmt) throw new Exception('Error preparar DELETE: ' . $conexion->error);
    $stmt->bind_param('ii', $id, $usuario_id);
    if (!$stmt->execute()) throw new Exception('Error al eliminar: ' . $stmt->error);
    if ($stmt->affected_rows === 0) throw new Exception('No encontrado o sin permisos');
    $stmt->close();
    $resp['success'] = true;
} catch (Exception $e) {
    $resp['message'] = $e->getMessage();
}
echo json_encode($resp);
if (isset($conexion) && $conexion instanceof mysqli) $conexion->close();
?>
