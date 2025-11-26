<?php
// obtenerConfiguracion.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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
    $sql = 'SELECT escena_id, fondo_global_id, fondo_usuario_id, sonido_global_id, sonido_usuario_id, volumen_ambiente, fecha_ultima_carga FROM configuraciones WHERE usuario_id = ? LIMIT 1';
    $stmt = $conexion->prepare($sql);
    if (!$stmt) throw new Exception('Error preparando consulta: ' . $conexion->error);
    $stmt->bind_param('i', $usuario_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();

    if (!$row) {
        echo json_encode(['success' => true, 'config' => null]);
        exit();
    }

    // Resolver URLs para fondo y sonido según IDs
    $background = null; // { url, mime, scope: 'global'|'user' }
    if (!empty($row['fondo_global_id'])) {
        $id = (int)$row['fondo_global_id'];
        // Reusar endpoint blobs globales
        // Necesitamos mime y nombre; podemos formar URL directa a verBlobGlobal
        $bgUrl = 'verBlobGlobal.php?tipo=fondo&id=' . $id;
        $background = ['url' => $bgUrl, 'mime' => 'image/gif', 'scope' => 'global'];
    } elseif (!empty($row['fondo_usuario_id'])) {
        $id = (int)$row['fondo_usuario_id'];
        $bgUrl = 'verFondoUsuario.php?id=' . $id;
        $background = ['url' => $bgUrl, 'mime' => 'image/gif', 'scope' => 'user'];
    }

    $sound = null; // { url, type: 'global'|'user', id }
    if (!empty($row['sonido_global_id'])) {
        $id = (int)$row['sonido_global_id'];
        $soundUrl = 'verBlobGlobal.php?tipo=sonido&id=' . $id . '&file=sound_' . $id . '.mp3';
        $sound = ['url' => $soundUrl, 'type' => 'global', 'id' => $id];
    } elseif (!empty($row['sonido_usuario_id'])) {
        $id = (int)$row['sonido_usuario_id'];
        $soundUrl = 'verSonidoUsuario.php?id=' . $id;
        $sound = ['url' => $soundUrl, 'type' => 'user', 'id' => $id];
    }

    echo json_encode([
        'success' => true,
        'config' => [
            'escena_id' => $row['escena_id'],
            'background' => $background,
            'sound' => $sound,
            'volumen_ambiente' => $row['volumen_ambiente'],
            'fecha_ultima_carga' => $row['fecha_ultima_carga']
        ]
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}
