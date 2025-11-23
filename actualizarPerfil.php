<?php
session_start();
require_once __DIR__ . '/INCLUDES/conexion.php';

header('Content-Type: application/json; charset=utf-8');

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
x
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
