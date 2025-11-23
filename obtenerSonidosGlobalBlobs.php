
<?php
// obtenerSonidosGlobalBlobs.php
require_once __DIR__ . '/INCLUDES/conexion.php';
header('Content-Type: application/json; charset=utf-8');

try {
  $stmt = $conexion->prepare("
    SELECT id_sonido AS id,
           nombre,
           categoria,
           mime_type,
           tamaño,
           (archivo_blob IS NOT NULL) AS tiene_blob
    FROM sonidos_globales
    WHERE archivo_blob IS NOT NULL
    ORDER BY id_sonido DESC
  ");
  $stmt->execute();
  $result = $stmt->get_result();

  $sonidos = [];
  while ($row = $result->fetch_assoc()) {
    $sonidos[] = [
      'id'     => (int)$row['id'],
      'nombre' => $row['nombre'],
      'categoria' => $row['categoria'],
      'mime'   => $row['mime_type'] ?: 'application/octet-stream',
      'size'   => (int)$row['tamaño'],
      'url'    => "verBlobGlobal.php?tipo=sonido&id=" . (int)$row['id'],
    ];
  }

  echo json_encode($sonidos);
} catch (Exception $e) {
  echo json_encode([]);
}
