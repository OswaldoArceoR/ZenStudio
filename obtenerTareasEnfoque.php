<?php
// obtenerTareasEnfoque.php
ini_set('display_errors', 1); error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/INCLUDES/conexion.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit();
}
$usuario_id = (int)$_SESSION['user_id'];
try {
    $stmt = $conexion->prepare('SELECT id, descripcion_tarea, completada FROM tareas_enfoque WHERE usuario_id = ? ORDER BY id DESC');
    if (!$stmt) throw new Exception('Error preparando consulta: ' . $conexion->error);
    $stmt->bind_param('i', $usuario_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $tareas = [];
    while ($row = $res->fetch_assoc()) {
        $tareas[] = [
            'id' => (int)$row['id'],
            'text' => $row['descripcion_tarea'],
            'completed' => $row['completada'] == 1
        ];
    }
    $stmt->close();
    echo json_encode(['success' => true, 'tareas' => $tareas]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}
