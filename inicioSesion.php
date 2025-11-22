<?php
session_start();
require_once __DIR__ . '/INCLUDES/conexion.php';

function post($k){ return isset($_POST[$k]) ? trim($_POST[$k]) : null; }

// Si la petición es POST → procesar login
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $user_or_email = post('user_or_email');
    $password = post('password');

    if (!$user_or_email || !$password) {
        $error = urlencode("Usuario/correo y contraseña son obligatorios");
        header("Location: inicioSesion.php?error=$error");
        exit();
    }

    // Buscar usuario
    $stmt = $conexion->prepare(
        'SELECT id, username, nombre, email, contrasenia 
        FROM usuarios 
        WHERE username = ? OR email = ? 
        LIMIT 1'
    );

    if (!$stmt) {
        $error = urlencode("Error en la consulta de la base de datos.");
        header("Location: inicioSesion.php?error=$error");
        exit();
    }

    $stmt->bind_param('ss', $user_or_email, $user_or_email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        $error = urlencode("Usuario o correo no encontrado.");
        header("Location: inicioSesion.php?error=$error");
        exit();
    }

    $row = $result->fetch_assoc();

    // Verificar contraseña corrupta
    if (empty($row['contrasenia']) || strlen($row['contrasenia']) < 8) {
        $error = urlencode("La contraseña almacenada está corrupta. Vuelve a registrarte o solicita reinicio de contraseña.");
        header("Location: inicioSesion.php?error=$error");
        exit();
    }

    // Verificar contraseña correcta
    if (!password_verify($password, $row['contrasenia'])) {
        $error = urlencode("Contraseña incorrecta. Inténtalo de nuevo.");
        header("Location: inicioSesion.php?error=$error");
        exit();
    }

    // LOGIN EXITOSO - Guardar todos los datos en sesión
    $_SESSION['user_id'] = $row['id'];
    $_SESSION['username'] = $row['username'];
    $_SESSION['nombre'] = $row['nombre'];
    $_SESSION['email'] = $row['email'];
    $_SESSION['avatar'] = 'https://ui-avatars.com/api/?name=' . urlencode($row['nombre']) . '&background=5882FA&color=fff&size=128';

    header("Location: paginaprincipal.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión - ZenStudio</title>

    <link rel="stylesheet" href="CSS/general.css">
    <link rel="stylesheet" href="CSS/inicioSesion.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>

<body>

    <div class="toggle-container" style="right: 110px;">
        <input type="checkbox" id="themeToggle">
        <label for="themeToggle" class="toggle">
            <span class="sun"></span>
            <span class="moon"></span>
        </label>
    </div>

    <audio id="ambient-sound" loop>
        <source src="sonidodelluvia.mp3" type="audio/mpeg">
    </audio>

    <div class="form-container">
        <h2>Iniciar Sesión</h2>

        <!-- Mostrar errores -->
        <?php if (isset($_GET['error'])): ?>
            <p style="color:red; text-align:center; margin-bottom:10px;">
                <?= htmlspecialchars($_GET['error']) ?>
            </p>
        <?php endif; ?>

        <form action="inicioSesion.php" method="POST">
            <input type="text" name="user_or_email" placeholder="Correo electrónico o nombre de usuario" required>
            
            <div class="password-container">
                <input type="password" name="password" id="password" placeholder="Contraseña" required>
                <span class="toggle-password" id="togglePassword">
                    <i class="fas fa-eye"></i>
                </span>
            </div>
            
            <button type="submit" class="btn login">Entrar</button>
        </form>

        <p class="alt-text">
            ¿No tienes una cuenta?
            <a href="registro.html">Crea una aquí</a>
        </p>
    </div>

    <script>
        /* ============================
            FADE-IN DEL SONIDO
        ============================= */
        function fadeInAudio(audio, targetVolume = 0.30, duration = 3000) {
            audio.volume = 0;
            audio.play();

            let step = targetVolume / (duration / 100);

            let fade = setInterval(() => {
                if (audio.volume < targetVolume) {
                    audio.volume = Math.min(audio.volume + step, targetVolume);
                } else {
                    clearInterval(fade);
                }
            }, 100);
        }

        const audio = document.getElementById("ambient-sound");
        fadeInAudio(audio);

        /* ============================
            SWITCH ANIMADO (THEME TOGGLE)
        ============================= */
        const toggle = document.getElementById("themeToggle");

        // Aplicar estado guardado
        if (localStorage.getItem("theme") === "dark") {
            document.body.classList.add("dark-mode");
            if (toggle) toggle.checked = true;
        }

        // Cambios en el switch
        if (toggle) {
            toggle.addEventListener("change", () => {
                if (toggle.checked) {
                    document.body.classList.add("dark-mode");
                    localStorage.setItem("theme", "dark");
                } else {
                    document.body.classList.remove("dark-mode");
                    localStorage.setItem("theme", "light");
                }
            });
        }

        /* ============================
            TOGGLE VISIBILIDAD CONTRASEÑA
        ============================ */
        const passwordInput = document.getElementById('password');
        const togglePassword = document.getElementById('togglePassword');

        togglePassword.addEventListener('click', function() {
            // Cambiar el tipo de input
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Cambiar el icono
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    </script>

</body>
</html>