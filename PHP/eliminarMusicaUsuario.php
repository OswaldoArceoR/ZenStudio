<?php
require_once __DIR__ . '/../INCLUDES/conexion.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

function ensureMusicTable(mysqli $cx) {
    $rs = $cx->query("SHOW TABLES LIKE 'musica_usuario'");
    if ($rs && $rs->num_rows > 0) {
        $desc = $cx->query("SHOW COLUMNS FROM musica_usuario");
        $hasAuto=false; $hasId=false; $hasMime=false; $hasFecha=false; $hasUsuario=false; $hasArchivo=false; $hasNombre=false;
        while ($desc && ($col = $desc->fetch_assoc())) {
            $field = $col['Field'];
            if ($field === 'id_musica_usuario') { $hasId=true; if (stripos($col['Extra'], 'auto_increment') !== false) $hasAuto=true; }
            elseif ($field === 'usuario_id') $hasUsuario=true;
            elseif ($field === 'nombre') $hasNombre=true;
            elseif ($field === 'archivo_musica') $hasArchivo=true;
            elseif ($field === 'mime_type') $hasMime=true;
            elseif ($field === 'fecha_subida') $hasFecha=true;
        }
        if ($hasId && !$hasAuto) {
            $cx->query("ALTER TABLE musica_usuario MODIFY id_musica_usuario INT(11) NOT NULL AUTO_INCREMENT");
            $pkCheck = $cx->query("SHOW INDEX FROM musica_usuario WHERE Key_name='PRIMARY'");
            if (!$pkCheck || $pkCheck->num_rows === 0) { $cx->query("ALTER TABLE musica_usuario ADD PRIMARY KEY (id_musica_usuario)"); }
        }
        $idx = $cx->query("SHOW INDEX FROM musica_usuario WHERE Key_name='usuario_id'");
        if (!$idx || $idx->num_rows === 0) { $cx->query("ALTER TABLE musica_usuario ADD INDEX usuario_id (usuario_id)"); }
        if (!$hasMime) { $cx->query("ALTER TABLE musica_usuario ADD mime_type VARCHAR(60) DEFAULT NULL AFTER archivo_musica"); }
        if (!$hasFecha) { $cx->query("ALTER TABLE musica_usuario ADD fecha_subida DATETIME DEFAULT current_timestamp() AFTER mime_type"); }
        return 'musica_usuario';
    }
    $create = "CREATE TABLE musica_usuario (\n        id_musica_usuario INT AUTO_INCREMENT PRIMARY KEY,\n        usuario_id INT NOT NULL,\n        nombre VARCHAR(150) NOT NULL,\n        archivo_musica LONGBLOB DEFAULT NULL,\n        mime_type VARCHAR(60) DEFAULT NULL,\n        fecha_subida DATETIME DEFAULT current_timestamp(),\n        INDEX(usuario_id)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if ($cx->query($create)) return 'musica_usuario';
    throw new Exception('No se pudo crear tabla musica_usuario');
}

$resp = ['success' => false, 'message' => '', 'deleted' => 0];
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Método no permitido');
    if (!isset($_SESSION['user_id'])) throw new Exception('No autenticado');
    $usuario_id = (int)$_SESSION['user_id'];

    $musicTable = ensureMusicTable($conexion);

    // Permitir JSON: { "ids": [1,2,3] } o POST único: id=1
    $raw = file_get_contents('php://input');
    $json = null;
    if ($raw) {
        $json = json_decode($raw, true);
    }

    $ids = [];
    if (is_array($json) && isset($json['ids']) && is_array($json['ids'])) {
        foreach ($json['ids'] as $v) {
            $v = (int)$v;
            if ($v > 0) $ids[] = $v;
        }
    } else {
        $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
        if ($id > 0) $ids[] = $id;
    }

    if (empty($ids)) throw new Exception('IDs inválidos o no proporcionados');

    $stmt = $conexion->prepare("DELETE FROM $musicTable WHERE id_musica_usuario = ? AND usuario_id = ?");
    if (!$stmt) throw new Exception('Error preparar DELETE: ' . $conexion->error);
    foreach ($ids as $idDel) {
        $stmt->bind_param('ii', $idDel, $usuario_id);
        if (!$stmt->execute()) throw new Exception('Error al eliminar: ' . $stmt->error);
        if ($stmt->affected_rows > 0) {
            $resp['deleted']++;
        }
    }
    $stmt->close();

    if ($resp['deleted'] === 0) throw new Exception('No encontrado(s) o sin permisos');

    $resp['success'] = true;
} catch (Exception $e) {
    $resp['message'] = $e->getMessage();
}
echo json_encode($resp);
if (isset($conexion) && $conexion instanceof mysqli) $conexion->close();
?>
