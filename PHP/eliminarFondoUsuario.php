<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([ 'success' => false, 'message' => 'No autenticado' ]);
    exit();
}

$userId = $_SESSION['user_id'];

// Aceptar id vía POST o GET
$id = null;
if (isset($_POST['id'])) $id = $_POST['id'];
elseif (isset($_GET['id'])) $id = $_GET['id'];

if (!$id || !ctype_digit($id)) {
    echo json_encode([ 'success' => false, 'message' => 'ID inválido' ]);
    exit();
}

require_once __DIR__ . '/../INCLUDES/conexion.php';

try {
    // Verificar pertenencia: columna correcta es usuario_id
    $stmt = $conexion->prepare('SELECT id_fondo_usuario FROM fondos_usuario WHERE id_fondo_usuario = ? AND usuario_id = ? LIMIT 1');
    $stmt->bind_param('ii', $id, $userId);
    $stmt->execute();
    $stmt->store_result();
    if ($stmt->num_rows === 0) {
        echo json_encode([ 'success' => false, 'message' => 'Fondo no encontrado o no pertenece al usuario' ]);
        exit();
    }
    $stmt->close();

    // Eliminar
    $del = $conexion->prepare('DELETE FROM fondos_usuario WHERE id_fondo_usuario = ? AND usuario_id = ?');
    $del->bind_param('ii', $id, $userId);
    if (!$del->execute()) {
        echo json_encode([ 'success' => false, 'message' => 'Error al eliminar', 'error_detalle' => $del->error ]);
        exit();
    }
    $del->close();

    echo json_encode([ 'success' => true ]);
} catch (Throwable $e) {
    error_log('[eliminarFondoUsuario] '.$e->getMessage());
    echo json_encode([ 'success' => false, 'message' => 'Excepción en servidor', 'error' => $e->getMessage() ]);
}
?>