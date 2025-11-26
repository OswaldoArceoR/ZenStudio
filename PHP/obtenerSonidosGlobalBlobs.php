<?php
// obtenerSonidosGlobalBlobs.php

require_once __DIR__ . '/../INCLUDES/conexion.php';
header('Content-Type: application/json; charset=utf-8');

function errorJson($msg) {
  http_response_code(500);
  echo json_encode(["error" => $msg]);
  exit;
}

try {
  if (!isset($conexion) || !$conexion) errorJson("No hay conexión a la base de datos");
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
  if (!$stmt) errorJson("Error preparando consulta: " . $conexion->error);
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
      // Forzar extensión .mp3 para mejor compatibilidad con el objeto Audio
      'url'    => "verBlobGlobal.php?tipo=sonido&id=" . (int)$row['id'] . "&file=sound_" . (int)$row['id'] . ".mp3",
    ];
  }

  echo json_encode($sonidos);
} catch (Exception $e) {
  errorJson($e->getMessage());
}
