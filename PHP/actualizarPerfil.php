<?php
// --- Mitigación de errores: siempre JSON ---
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ob_start();
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    $msg = "PHP Error [$errno] $errstr en $errfile:$errline";
    echo json_encode(['status' => 'error', 'msg' => $msg]);
    ob_end_flush();
    exit();
});
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        $msg = "Fatal error: {$error['message']} en {$error['file']}:{$error['line']}";
        echo json_encode(['status' => 'error', 'msg' => $msg]);
        ob_end_flush();
        exit();
    }
});

session_start();
require_once __DIR__ . '/../INCLUDES/conexion.php';
header('Content-Type: application/json; charset=utf-8');

// Forzar logging de errores a archivo para depuración
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log');

// Si la petición no es POST, rechazar
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'msg' => 'Método no permitido']);
    exit();
}

// --- Soporte para subida de avatar ---
if (isset($_FILES['avatar'])) {
    $user_id = $_SESSION['user_id'];
    $file = $_FILES['avatar'];
    if ($file['error'] === UPLOAD_ERR_OK) {
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'avatar_' . $user_id . '_' . time() . '.' . $ext;
        $dest = 'IMAGENES/' . $filename;
        if (!is_dir('IMAGENES')) mkdir('IMAGENES', 0777, true);
        if (move_uploaded_file($file['tmp_name'], $dest)) {
            // Eliminar avatar anterior si existe y no es el default
            $stmt_old = $conexion->prepare("SELECT avatar FROM usuarios WHERE id = ?");
            $stmt_old->bind_param("i", $user_id);
            $stmt_old->execute();
            $stmt_old->bind_result($old_avatar);
            $stmt_old->fetch();
            $stmt_old->close();
            if (!empty($old_avatar) && file_exists($old_avatar) && $old_avatar !== $dest) {
                // Opcional: si tienes una imagen por defecto, exclúyela aquí
                if (strpos($old_avatar, 'avatar_') === 0 || strpos($old_avatar, 'IMAGENES/avatar_') === 0) {
                    @unlink($old_avatar);
                }
            }
            // Actualizar ruta en la base
            if (!isset($conexion)) {
                require_once __DIR__ . '/../INCLUDES/conexion.php';
            }
            $stmt = $conexion->prepare("UPDATE usuarios SET avatar = ? WHERE id = ?");
            if (!$stmt) {
                error_log('Error al preparar la consulta de avatar: ' . $conexion->error);
                echo json_encode(['status' => 'error', 'msg' => 'Error al preparar la consulta de avatar.']);
                exit();
            }
            $stmt->bind_param("si", $dest, $user_id);
            if (!$stmt->execute()) {
                error_log('Error al actualizar avatar en la base de datos: ' . $stmt->error);
                $stmt->close();
                echo json_encode(['status' => 'error', 'msg' => 'Error al actualizar avatar en la base de datos.']);
                exit();
            }
            $stmt->close();
            // Actualizar sesión
            $_SESSION['avatar'] = $dest;
            echo json_encode(['status' => 'ok', 'avatar' => $dest]);
            exit();
        } else {
            error_log('Error al guardar el archivo: ' . $file['tmp_name'] . ' -> ' . $dest);
            echo json_encode(['status' => 'error', 'msg' => 'Error al guardar el archivo.']);
            exit();
        }
    } else {
        error_log('Error al subir el archivo: ' . $file['error']);
        echo json_encode(['status' => 'error', 'msg' => 'Error al subir el archivo.']);
        exit();
    }
}
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'msg' => 'No autorizado']);
    exit();
}

$user_id = $_SESSION['user_id'];

// Recibir los datos enviados por AJAX (JSON)
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    echo json_encode(['status' => 'error', 'msg' => 'Datos inválidos']);
    exit();
}

$username    = isset($data['username']) ? trim($data['username']) : '';
$nombre      = isset($data['nombre']) ? trim($data['nombre']) : '';
$email       = isset($data['email']) ? trim($data['email']) : '';
$pwd_actual  = isset($data['currentPassword']) ? trim($data['currentPassword']) : '';
$nueva_pwd   = isset($data['newPassword']) ? trim($data['newPassword']) : '';
$confirm_pwd = isset($data['confirmPassword']) ? trim($data['confirmPassword']) : '';

// 1. Obtener la contraseña actual de la BD
$stmt = $conexion->prepare("SELECT contrasenia FROM usuarios WHERE id = ?");
if (!$stmt) {
    echo json_encode(['status' => 'error', 'msg' => 'Error en la consulta (prepare).']);
    exit();
}
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    echo json_encode(['status' => 'error', 'msg' => 'Usuario no encontrado']);
    exit();
}

$contraseniaBD = $user['contrasenia'];

// Caso A: el usuario NO quiere cambiar la contraseña
if ($nueva_pwd === '' && $confirm_pwd === '') {
    // Actualizar sólo username, nombre y email
    $stmt_update = $conexion->prepare("UPDATE usuarios SET username = ?, nombre = ?, email = ? WHERE id = ?");
    if (!$stmt_update) {
        echo json_encode(['status' => 'error', 'msg' => 'Error al preparar actualización.']);
        exit();
    }
    $stmt_update->bind_param("sssi", $username, $nombre, $email, $user_id);
    if (!$stmt_update->execute()) {
        $stmt_update->close();
        echo json_encode(['status' => 'error', 'msg' => 'Error al actualizar perfil.']);
        exit();
    }
    $stmt_update->close();
} else {
    // Caso B: el usuario quiere cambiar la contraseña -> aplicar validaciones
    // Deben venir nueva y confirm
    if ($nueva_pwd === '' || $confirm_pwd === '') {
        echo json_encode(['status' => 'error', 'msg' => 'Debe completar la nueva contraseña y su confirmación.']);
        exit();
    }
    // Verificar que la nueva y la confirmación coincidan
    if ($nueva_pwd !== $confirm_pwd) {
        echo json_encode(['status' => 'error', 'msg' => 'Las nuevas contraseñas no coinciden.']);
        exit();
    }
    // Validar longitud mínima
    if (strlen($nueva_pwd) < 6) {
        echo json_encode(['status' => 'error', 'msg' => 'La nueva contraseña debe tener al menos 6 caracteres.']);
        exit();
    }
    // Debe proporcionar la contraseña actual para autorizar el cambio
    if ($pwd_actual === '') {
        echo json_encode(['status' => 'error', 'msg' => 'Debe ingresar la contraseña actual para cambiarla.']);
        exit();
    }
    // Verificar contraseña actual con password_verify
    if (!password_verify($pwd_actual, $contraseniaBD)) {
        echo json_encode(['status' => 'error', 'msg' => 'La contraseña actual es incorrecta.']);
        exit();
    }
    // Todo OK -> hashear la nueva contraseña y actualizar 
    $passwordHash = password_hash($nueva_pwd, PASSWORD_BCRYPT);
    $stmt_update = $conexion->prepare("UPDATE usuarios SET username = ?, nombre = ?, email = ?, contrasenia = ? WHERE id = ?");
    if (!$stmt_update) {
        echo json_encode(['status' => 'error', 'msg' => 'Error al preparar actualización con contraseña.']);
        exit();
    }
    $stmt_update->bind_param("ssssi", $username, $nombre, $email, $passwordHash, $user_id);
    if (!$stmt_update->execute()) {
        $stmt_update->close();
        echo json_encode(['status' => 'error', 'msg' => 'Error al actualizar perfil y contraseña.']);
        exit();
    }
    $stmt_update->close();
}
// 4. Actualizar sesión con los nuevos valores
$_SESSION['username'] = $username;
$_SESSION['nombre']   = $nombre;
$_SESSION['email']    = $email;

echo json_encode(['status' => 'success', 'msg' => 'Perfil actualizado correctamente']);
exit();
