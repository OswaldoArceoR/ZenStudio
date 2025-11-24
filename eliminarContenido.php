<?php
session_start();
require_once __DIR__ . '/INCLUDES/conexion.php';
header('Content-Type: application/json; charset=utf-8');

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!isset($data['tipo']) || !isset($data['id'])) {
  echo json_encode(['status' => 'error', 'msg' => 'Datos incompletos']);
  exit;
}

$tipo = $data['tipo'];
$id   = intval($data['id']);

try {
  if ($tipo === 'fondo') {
    // Antes: obtenía ruta y hacía unlink()
    // Ahora: solo eliminamos el registro
    $deleteStmt = $conexion->prepare("DELETE FROM fondos_globales WHERE id_fondo = ?");
  } elseif ($tipo === 'sonido') {
    $deleteStmt = $conexion->prepare("DELETE FROM sonidos_globales WHERE id_sonido = ?");
  } else {
    throw new Exception("Tipo de contenido no válido");
  }

  $deleteStmt->bind_param("i", $id);
  if ($deleteStmt->execute()) {
    echo json_encode(['status' => 'success', 'msg' => 'Contenido eliminado correctamente']);
  } else {
    throw new Exception("Error al eliminar de la base de datos");
  }
} catch (Exception $e) {
  echo json_encode(['status' => 'error', 'msg' => 'Error: ' . $e->getMessage()]);
}
?>
