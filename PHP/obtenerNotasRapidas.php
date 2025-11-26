<?php
// obtenerNotasRapidas.php
// Devuelve las notas rápidas del usuario (última primero)
ini_set('display_errors', 1); error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/../INCLUDES/conexion.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit();
}
$usuario_id = (int)$_SESSION['user_id'];
try {
    $stmt = $conexion->prepare('SELECT id, contenido_nota FROM notas_rapidas_usuarios WHERE usuario_id = ? ORDER BY id DESC LIMIT 20');
    if (!$stmt) throw new Exception('Error preparando consulta: ' . $conexion->error);
    $stmt->bind_param('i', $usuario_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $notas = [];
    while ($row = $res->fetch_assoc()) {
        $notas[] = [
            'id' => (int)$row['id'],
            'contenido' => $row['contenido_nota']
        ];
    }
    $stmt->close();
    $ultima = $notas[0] ?? null;
    echo json_encode(['success' => true, 'ultima' => $ultima, 'notas' => $notas]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}
