<?php
// obtenerFondosGlobalBlobs.php

require_once __DIR__ . '/INCLUDES/conexion.php';
header('Content-Type: application/json; charset=utf-8');

function errorJson($msg) {
  http_response_code(500);
  echo json_encode(["error" => $msg]);
  exit;
}

try {
  if (!isset($conexion) || !$conexion) errorJson("No hay conexión a la base de datos");
  $stmt = $conexion->prepare("
    SELECT id_fondo AS id,
           nombre,
           categoria,
           mime_type,
           tamaño,
           (archivo_blob IS NOT NULL) AS tiene_blob
    FROM fondos_globales
    WHERE archivo_blob IS NOT NULL
    ORDER BY id_fondo DESC
  ");
  if (!$stmt) errorJson("Error preparando consulta: " . $conexion->error);
  $stmt->execute();
  $result = $stmt->get_result();

  $fondos = [];
  while ($row = $result->fetch_assoc()) {
    $id = (int)$row['id'];
    $fondos[] = [
      'id'     => $id,
      'nombre' => $row['nombre'],
      'categoria' => $row['categoria'],
      'mime'   => $row['mime_type'] ?: 'application/octet-stream',
      'size'   => (int)$row['tamaño'],
      'url'    => "verBlobGlobal.php?tipo=fondo&id=$id",
    ];
  }

  echo json_encode($fondos);
} catch (Exception $e) {
  errorJson($e->getMessage());
}
