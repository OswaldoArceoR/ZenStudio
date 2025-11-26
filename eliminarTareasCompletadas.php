<?php
// eliminarTareasCompletadas.php
ini_set('display_errors', 1); error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/INCLUDES/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit();
}
$usuario_id = (int)$_SESSION['user_id'];
try {
    $stmt = $conexion->prepare('DELETE FROM tareas_enfoque WHERE usuario_id = ? AND completada = 1');
    if (!$stmt) throw new Exception('Error preparar sentencia: ' . $conexion->error);
    $stmt->bind_param('i', $usuario_id);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    echo json_encode(['success' => true, 'eliminadas' => $affected]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}
