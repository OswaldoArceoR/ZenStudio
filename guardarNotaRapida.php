<?php
// guardarNotaRapida.php
// Inserta una nota rápida (versión histórica) limitada a 255 caracteres
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
$contenido = isset($data['contenido']) ? trim($data['contenido']) : '';
if ($contenido === '') {
    echo json_encode(['success' => false, 'message' => 'Contenido vacío']);
    exit();
}
// Limitar a 255
if (mb_strlen($contenido) > 255) {
    $contenido = mb_substr($contenido, 0, 255);
}
$usuario_id = (int)$_SESSION['user_id'];
try {
    $stmt = $conexion->prepare('INSERT INTO notas_rapidas_usuarios (usuario_id, contenido_nota) VALUES (?, ?)');
    if (!$stmt) throw new Exception('Error preparar sentencia: ' . $conexion->error);
    $stmt->bind_param('is', $usuario_id, $contenido);
    $stmt->execute();
    $newId = $stmt->insert_id;
    $stmt->close();
    echo json_encode(['success' => true, 'id' => $newId, 'contenido' => $contenido]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}
