<?php
session_start();
require_once __DIR__ . '/INCLUDES/conexion.php';

function post($k){ return isset($_POST[$k]) ? trim($_POST[$k]) : null; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombre = post('nombre');
    $username = post('username');
    $email = post('email');
    $password = post('password');
    $confirm_password = post('confirm_password');

    // Validaciones básicas
    if (!$nombre || !$username || !$email || !$password) {
        $error = urlencode("Todos los campos son obligatorios");
        header("Location: registro.html?error=$error");
        exit();
    }

    if ($password !== $confirm_password) {
        $error = urlencode("Las contraseñas no coinciden");
        header("Location: registro.html?error=$error");
        exit();
    }

    if (strlen($password) < 6) {
        $error = urlencode("La contraseña debe tener al menos 6 caracteres");
        header("Location: registro.html?error=$error");
        exit();
    }

    // Verificar si usuario o email ya existen
    $stmt = $conexion->prepare('SELECT id FROM usuarios WHERE username = ? OR email = ?');
    $stmt->bind_param('ss', $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $error = urlencode("El usuario o email ya existen");
        header("Location: registro.html?error=$error");
        exit();
    }

    // Hash de contraseña
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // Insertar usuario
    $stmt = $conexion->prepare('INSERT INTO usuarios (username, nombre, email, contrasenia) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssss', $username, $nombre, $email, $password_hash);

    if ($stmt->execute()) {
        // Login automático después del registro
        $_SESSION['user_id'] = $stmt->insert_id;
        $_SESSION['username'] = $username;
        $_SESSION['nombre'] = $nombre;
        $_SESSION['email'] = $email;
        $_SESSION['avatar'] = 'https://ui-avatars.com/api/?name=' . urlencode($nombre) . '&background=5882FA&color=fff&size=128';
        
        header("Location: paginaprincipal.php");
        exit();
    } else {
        $error = urlencode("Error al crear la cuenta");
        header("Location: registro.html?error=$error");
        exit();
    }
}
?>