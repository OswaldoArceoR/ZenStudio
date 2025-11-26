<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

function ensureSoundTable(mysqli $cx) {
    $rs = $cx->query("SHOW TABLES LIKE 'sonidos_usuario'");
    if ($rs && $rs->num_rows > 0) {
        $desc = $cx->query("SHOW COLUMNS FROM sonidos_usuario");
        $hasId=false; $hasAuto=false; $hasMime=false; $hasFecha=false; $hasUsuario=false; $hasNombre=false; $hasArchivo=false;
        while ($desc && ($c = $desc->fetch_assoc())) {
            $f = $c['Field'];
            if ($f === 'id_sonido_usuario') { $hasId=true; if (stripos($c['Extra'], 'auto_increment') !== false) $hasAuto=true; }
            elseif ($f === 'usuario_id') $hasUsuario=true; elseif ($f === 'nombre') $hasNombre=true; elseif ($f === 'archivo_sonido') $hasArchivo=true; elseif ($f === 'mime_type') $hasMime=true; elseif ($f === 'fecha_subida') $hasFecha=true;
        }
        if ($hasId && !$hasAuto) {
            $cx->query("ALTER TABLE sonidos_usuario MODIFY id_sonido_usuario INT(11) NOT NULL AUTO_INCREMENT");
            $pk = $cx->query("SHOW INDEX FROM sonidos_usuario WHERE Key_name='PRIMARY'");
            if (!$pk || $pk->num_rows === 0) { $cx->query("ALTER TABLE sonidos_usuario ADD PRIMARY KEY (id_sonido_usuario)"); }
        }
        $idx = $cx->query("SHOW INDEX FROM sonidos_usuario WHERE Key_name='usuario_id'");
        if (!$idx || $idx->num_rows === 0) { $cx->query("ALTER TABLE sonidos_usuario ADD INDEX usuario_id (usuario_id)"); }
        if (!$hasMime) { $cx->query("ALTER TABLE sonidos_usuario ADD mime_type VARCHAR(60) DEFAULT NULL AFTER archivo_sonido"); }
        if (!$hasFecha) { $cx->query("ALTER TABLE sonidos_usuario ADD fecha_subida DATETIME DEFAULT current_timestamp() AFTER mime_type"); }
        return 'sonidos_usuario';
    }
    $create = "CREATE TABLE sonidos_usuario (\n        id_sonido_usuario INT AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        nombre VARCHAR(150) NOT NULL,\n        archivo_sonido LONGBLOB DEFAULT NULL,\n        mime_type VARCHAR(60) DEFAULT NULL,\n        fecha_subida DATETIME DEFAULT current_timestamp(),\n        INDEX(usuario_id)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if ($cx->query($create)) return 'sonidos_usuario';
    throw new Exception('No se pudo crear sonidos_usuario');
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit();
}

$userId = (int)$_SESSION['user_id'];
$id = null;
if (isset($_POST['id'])) $id = $_POST['id'];
elseif (isset($_GET['id'])) $id = $_GET['id'];

if (!$id || !ctype_digit($id)) {
    echo json_encode(['success' => false, 'message' => 'ID inválido']);
    exit();
}

require_once __DIR__ . '/../INCLUDES/conexion.php';
ensureSoundTable($conexion);

try {
    // Verificar pertenencia
    $stmt = $conexion->prepare('SELECT id_sonido_usuario FROM sonidos_usuario WHERE id_sonido_usuario = ? AND usuario_id = ? LIMIT 1');
    if (!$stmt) throw new Exception('Error preparar verificación: ' . $conexion->error);
    $stmt->bind_param('ii', $id, $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Sonido no encontrado o no pertenece al usuario']);
        $stmt->close();
        exit();
    }
    $stmt->close();

    // Eliminar
    $del = $conexion->prepare('DELETE FROM sonidos_usuario WHERE id_sonido_usuario = ? AND usuario_id = ?');
    if (!$del) throw new Exception('Error preparar eliminación: ' . $conexion->error);
    $del->bind_param('ii', $id, $userId);
    if (!$del->execute()) {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar', 'error_detalle' => $del->error]);
        $del->close();
        exit();
    }
    $del->close();

    echo json_encode(['success' => true]);
} catch (Throwable $e) {
    error_log('[eliminarSonidoUsuario] ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Excepción en servidor']);
}

if (isset($conexion) && $conexion instanceof mysqli) $conexion->close();
