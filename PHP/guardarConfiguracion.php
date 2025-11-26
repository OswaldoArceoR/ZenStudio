<?php
// guardarConfiguracion.php
// Persiste la configuración del usuario evitando caché y aplicando reglas de exclusión
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
session_start();
require_once __DIR__ . '/../INCLUDES/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'msg' => 'Método no permitido']);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'msg' => 'No autenticado']);
    exit();
}

function body_json() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$data = body_json();
$usuario_id = (int)$_SESSION['user_id'];

// Campos admitidos desde el cliente (pueden venir vacíos o no presentes)
$fondo_global_id   = isset($data['fondo_global_id']) ? (int)$data['fondo_global_id'] : null;
$fondo_usuario_id  = isset($data['fondo_usuario_id']) ? (int)$data['fondo_usuario_id'] : null;
$sonido_global_id  = isset($data['sonido_global_id']) ? (int)$data['sonido_global_id'] : null;
$sonido_usuario_id = isset($data['sonido_usuario_id']) ? (int)$data['sonido_usuario_id'] : null;
$volumen_ambiente  = null; // por requerimiento

// Regla: fondo_global_id y fondo_usuario_id son mutuamente excluyentes
if (!empty($fondo_usuario_id)) {
    $fondo_global_id = null;
}
if (!empty($fondo_global_id)) {
    $fondo_usuario_id = null;
}
// Regla: sonido_global_id y sonido_usuario_id son mutuamente excluyentes
if (!empty($sonido_usuario_id)) {
    $sonido_global_id = null;
}
if (!empty($sonido_global_id)) {
    $sonido_usuario_id = null;
}

// Fecha del último cambio: ahora
$fecha_ultima_carga = date('Y-m-d H:i:s');

try {
    // Upsert por usuario: si ya existe fila de configuraciones para este usuario, actualiza; si no, inserta
    // Primero, verificar existencia
    $stmtSel = $conexion->prepare('SELECT id_config FROM configuraciones WHERE usuario_id = ? LIMIT 1');
    $stmtSel->bind_param('i', $usuario_id);
    $stmtSel->execute();
    $stmtSel->bind_result($id_config);
    $exists = $stmtSel->fetch();
    $stmtSel->close();

    if ($exists) {
        // Actualizar: no tocar escena_id para evitar NOT NULL, dejar valor existente
        $sqlUpd = 'UPDATE configuraciones SET fondo_global_id = ?, fondo_usuario_id = ?, sonido_global_id = ?, sonido_usuario_id = ?, volumen_ambiente = NULL, fecha_ultima_carga = ? WHERE id_config = ? AND usuario_id = ?';
        $stmtUpd = $conexion->prepare($sqlUpd);
        if (!$stmtUpd) { throw new Exception('Error preparando UPDATE: ' . $conexion->error); }
        $stmtUpd->bind_param('iiiisii', $fondo_global_id, $fondo_usuario_id, $sonido_global_id, $sonido_usuario_id, $fecha_ultima_carga, $id_config, $usuario_id);
        $stmtUpd->execute();
        $stmtUpd->close();
    } else {
        // Insertar: obtener una escena válida para cumplir FK (primer registro de 'escenas')
        $defaultEscenaId = null;
        if ($stmtEsc = $conexion->prepare('SELECT id_escena FROM escenas ORDER BY id_escena ASC LIMIT 1')) {
            $stmtEsc->execute();
            $stmtEsc->bind_result($defaultEscenaId);
            $stmtEsc->fetch();
            $stmtEsc->close();
        }
        if ($defaultEscenaId === null) {
            throw new Exception('No hay escenas disponibles para asignar (FK escena_id).');
        }
        $sqlIns = 'INSERT INTO configuraciones (usuario_id, escena_id, fondo_global_id, fondo_usuario_id, sonido_global_id, sonido_usuario_id, volumen_ambiente, fecha_ultima_carga) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)';
        $stmtIns = $conexion->prepare($sqlIns);
        if (!$stmtIns) { throw new Exception('Error preparando INSERT: ' . $conexion->error); }
        $stmtIns->bind_param('iiiiiis', $usuario_id, $defaultEscenaId, $fondo_global_id, $fondo_usuario_id, $sonido_global_id, $sonido_usuario_id, $fecha_ultima_carga);
        $stmtIns->execute();
        $stmtIns->close();
    }

    echo json_encode([
        'status' => 'success',
        'msg' => 'Configuración guardada',
        'config' => [
            'usuario_id' => $usuario_id,
            'escena_id' => null,
            'fondo_global_id' => $fondo_global_id,
            'fondo_usuario_id' => $fondo_usuario_id,
            'sonido_global_id' => $sonido_global_id,
            'sonido_usuario_id' => $sonido_usuario_id,
            'volumen_ambiente' => null,
            'fecha_ultima_carga' => $fecha_ultima_carga,
        ]
    ]);
    exit();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'msg' => $e->getMessage()]);
    exit();
}
