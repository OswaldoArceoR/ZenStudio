<?php
session_start();

// Verificar si el usuario está logueado
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Obtener datos actualizados del usuario desde la base de datos
require_once __DIR__ . '/INCLUDES/conexion.php';
$user_id = $_SESSION['user_id'];
$stmt = $conexion->prepare("SELECT username, nombre, email, avatar FROM usuarios WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->bind_result($username, $nombre, $email, $avatar);
$stmt->fetch();
$stmt->close();

// Fallback: si avatar en BD es NULL/ vacío, usar el avatar de la sesión (UI-Avatars/Google)
if (empty($avatar) || strtoupper($avatar) === 'NULL') {
    if (isset($_SESSION['avatar']) && !empty($_SESSION['avatar'])) {
        $avatar = $_SESSION['avatar'];
    } else {
        // Último recurso: generar uno por nombre si existe
        $displayName = isset($nombre) && !empty($nombre) ? $nombre : (isset($username) ? $username : 'Usuario');
        $avatar = 'https://ui-avatars.com/api/?name=' . urlencode($displayName) . '&background=5882FA&color=fff&size=128';
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ajustes de Perfil - ZenFocus</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap">
    <link rel="stylesheet" href="CSS/principal.css">
    <link rel="stylesheet" href="CSS/perfil.css">
</head>
<body>

    <div class="profile-container">
        <header class="profile-header">
            <h1>Ajustes de Perfil</h1>
            <div class="profile-header-actions">
                <button class="theme-toggle-btn" id="theme-toggle" title="Alternar Tema" aria-pressed="false">
                    <svg id="moon-icon" class="icon-toggle" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <svg id="sun-icon" class="icon-toggle" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                </button>
                <a href="paginaprincipal.php" class="back-link">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Volver
                </a>
            </div>
        </header>

        <main class="profile-content">
            <!-- Sección de Información Personal -->
            <section class="profile-section">
                <h2>Información Personal</h2>
                <div class="avatar-editor">
                    <img src="<?php echo $avatar; ?>" alt="Avatar de usuario" id="profile-avatar-img" class="profile-avatar">
                    <label for="avatar-upload-input" class="avatar-upload-label">Cambiar foto</label>
                    <input type="file" id="avatar-upload-input" name="avatar-upload-input" accept="image/*">
                </div>

                <div class="form-grid">
                    <div class="form-group">
                        <label for="username-input">Nombre de Usuario</label>
                        <input type="text" id="username-input" name="username-input" value="<?php echo htmlspecialchars($username); ?>" placeholder="Ej: zen_master">
                    </div>
                    <div class="form-group">
                        <label for="accountname-input">Nombre de la Cuenta</label>
                        <input type="text" id="accountname-input" name="accountname-input" value="<?php echo htmlspecialchars($nombre); ?>" placeholder="Ej: Alejandro">
                    </div>
                </div>
            </section>

            <!-- Sección de Seguridad -->
            <section class="profile-section">
                <h2>Seguridad y Cuenta</h2>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="email-input">Correo Electrónico</label>
                        <input type="email" id="email-input" name="email-input" value="<?php echo htmlspecialchars($email); ?>" placeholder="tu@correo.com">
                    </div>
                </div>
                <div class="form-group">
                    <label for="current-password-input">Contraseña Actual</label>
                    <input type="password" id="current-password-input" name="current-password-input" placeholder="••••••••">
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="new-password-input">Nueva Contraseña</label>
                        <input type="password" id="new-password-input" name="new-password-input" placeholder="••••••••">
                    </div>
                    <div class="form-group">
                        <label for="confirm-password-input">Confirmar Nueva Contraseña</label>
                        <input type="password" id="confirm-password-input" name="confirm-password-input" placeholder="••••••••">
                    </div>
                </div>
            </section>

            <footer class="profile-actions">
                <button id="save-profile-btn" class="action-btn primary-btn">Guardar Cambios</button>
            </footer>

        </main>
    </div>

    <script src="JS/perfil.js"></script>
</body>
</html>