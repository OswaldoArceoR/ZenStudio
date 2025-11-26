<?php
// marcarTareaEnfoque.php
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
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
$id = isset($data['id']) ? (int)$data['id'] : 0;
$completed = isset($data['completed']) ? (bool)$data['completed'] : false;
if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID inválido']);
    exit();
}
$usuario_id = (int)$_SESSION['user_id'];
try {
    $stmt = $conexion->prepare('UPDATE tareas_enfoque SET completada = ? WHERE id = ? AND usuario_id = ?');
    if (!$stmt) throw new Exception('Error preparar sentencia: ' . $conexion->error);
    $cmp = $completed ? 1 : 0;
    $stmt->bind_param('iii', $cmp, $id, $usuario_id);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();
    if ($affected === 0) {
        echo json_encode(['success' => false, 'message' => 'No se encontró la tarea para actualizar']);
    } else {
        echo json_encode(['success' => true, 'id' => $id, 'completed' => $completed]);
    }
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}
