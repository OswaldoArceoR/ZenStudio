<?php
require("conection.php");

// Obtener datos del formulario
$nombre = $_POST['nombre'];             
$username = $_POST['username'];         // Nombre de usuario (para login)
$email = $_POST['email'];
$password = $_POST['password'];
$confirm_password = $_POST['confirm_password'];

// Validar contraseña
if ($password !== $confirm_password) {
    header("Location: register.php?error=" . urlencode("Las contraseñas no coinciden."));
    exit();
}

// Validar que username no se duplique
$stmt = $conexion->prepare("SELECT id FROM usuarios WHERE username = ? LIMIT 1");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    header("Location: register.php?error=" . urlencode("El nombre de usuario ya está en uso."));
    exit();
}

// Validar que email no haya sido usado
$stmt = $conexion->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    header("Location: register.php?error=" . urlencode("El correo ya está registrado."));
    exit();
}

// Encriptacion de la contraseña
$password_hash = password_hash($password, PASSWORD_DEFAULT);

// Insertar usuario nuevo
$stmt = $conexion->prepare(
    "INSERT INTO usuarios (username, nombre, email, contrasenia)
    VALUES (?, ?, ?, ?)"
);

if ($stmt) {
    $stmt->bind_param("ssss", $username, $nombre, $email, $password_hash);
    
    if ($stmt->execute()) {
        header("Location: login.php?success=" . urlencode("Cuenta creada correctamente. Ahora inicia sesión."));
        exit();
    } else {
        echo "Error al registrar el usuario: " . $stmt->error;
    }

    $stmt->close();
} else {
    echo "Error en la consulta: " . $conexion->error;
}

$conexion->close();
?>
