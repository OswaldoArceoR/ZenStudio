<?php
// agregarTareaEnfoque.php
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
$descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
if ($descripcion === '') {
    echo json_encode(['success' => false, 'message' => 'Descripción vacía']);
    exit();
}
if (mb_strlen($descripcion) > 255) {
    $descripcion = mb_substr($descripcion, 0, 255);
}
$usuario_id = (int)$_SESSION['user_id'];
try {
    $stmt = $conexion->prepare('INSERT INTO tareas_enfoque (usuario_id, descripcion_tarea) VALUES (?, ?)');
    if (!$stmt) throw new Exception('Error preparar sentencia: ' . $conexion->error);
    $stmt->bind_param('is', $usuario_id, $descripcion);
    $stmt->execute();
    $newId = $stmt->insert_id;
    $stmt->close();
    echo json_encode(['success' => true, 'id' => $newId, 'text' => $descripcion, 'completed' => false]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}
