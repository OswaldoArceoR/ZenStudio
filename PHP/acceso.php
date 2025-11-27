<?php
// Página unificada de Acceso (Login + Registro) con UI React
session_start();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso - ZenStudio</title>

    <!-- Estilos base y específicos de la UI -->
    <link rel="stylesheet" href="../CSS/styles.css">
    <link rel="stylesheet" href="../CSS/acceso.css">
    <link rel="icon" href="../IMAGENES/ZenStudioLogo.png" type="image/png">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap">

    <style>
        .theme-toggle-btn { position: fixed; top: 20px; left: 20px; z-index: 1000; width: 50px; height: 50px; border-radius: 12px; background: var(--clr-panel); border: 1px solid var(--clr-border); cursor: pointer; color: var(--clr-text-muted); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: color .18s, background .18s, transform .18s, box-shadow .18s; }
        .error-box { background: #ffdddd; color: #b30000; padding: 10px 14px; margin: 0 0 15px; border-radius: 8px; border-left: 5px solid #e60000; font-weight: 500; }
        .form-container { max-width: 480px; margin: 0 auto; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display:block; font-weight:600; margin-bottom:6px; }
        .form-group input { width:100%; padding:10px; border:1px solid var(--clr-border); border-radius:10px; background: var(--clr-hover); color: var(--clr-text); }
        .form-switch-text { text-align:center; margin-top: 12px; }
        .form-switch-link { color: var(--clr-primary); text-decoration:none; font-weight:700; }
        .form-switch-link:hover { text-decoration:underline; }
        .form-scene { min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 40px 16px; }
    </style>
</head>
<body>
    <!-- Contenedor para el componente React del botón de tema -->
    <div id="theme-toggle-root"></div>

    <div class="form-scene">
        <div class="form-flipper" id="form-flipper">
            <!-- Cara frontal: Inicio de Sesión -->
            <div class="form-face form-front">
                <div class="form-container">
                    <h2>Iniciar Sesión</h2>
                    <p>Bienvenido de nuevo a tu espacio de enfoque.</p>

                    <?php if (isset($_GET['error']) && (!isset($_GET['form']) || $_GET['form'] !== 'register')): ?>
                        <div class="error-box"><?= htmlspecialchars($_GET['error']) ?></div>
                    <?php endif; ?>

                    <form action="inicioSesion.php" method="POST">
                        <div class="form-group">
                            <label for="login-user-or-email">Correo o Usuario</label>
                            <input type="text" id="login-user-or-email" name="user_or_email" placeholder="tu@correo.com o usuario" required>
                        </div>
                        <div class="form-group">
                            <label for="login-password">Contraseña</label>
                            <input type="password" id="login-password" name="password" placeholder="••••••••" required>
                        </div>
                        <button type="submit" class="action-btn primary-btn" style="width:100%">Acceder</button>
                    </form>

                    <p class="form-switch-text">¿No tienes una cuenta? <a href="#" class="form-switch-link">Regístrate aquí</a></p>
                </div>
            </div>

            <!-- Cara trasera: Registro -->
            <div class="form-face form-back">
                <div class="form-container">
                    <h2>Crear Cuenta</h2>
                    <p>Únete a ZenStudio y potencia tu productividad.</p>

                    <?php if (isset($_GET['error']) && (isset($_GET['form']) && $_GET['form'] === 'register')): ?>
                        <div class="error-box"><?= htmlspecialchars($_GET['error']) ?></div>
                    <?php endif; ?>

                    <form action="registroUsuario.php" method="POST">
                        <div class="form-group"><label for="register-nombre">Nombre Completo</label><input type="text" id="register-nombre" name="nombre" placeholder="Nombre y apellidos" required></div>
                        <div class="form-group"><label for="register-username">Nombre de Usuario</label><input type="text" id="register-username" name="username" placeholder="Ej: zen_master" required></div>
                        <div class="form-group"><label for="register-email">Correo Electrónico</label><input type="email" id="register-email" name="email" placeholder="tu@correo.com" required></div>
                        <div class="form-group"><label for="register-password">Contraseña</label><input type="password" id="register-password" name="password" placeholder="Mínimo 6 caracteres" required></div>
                        <div class="form-group"><label for="register-confirm">Confirmar Contraseña</label><input type="password" id="register-confirm" name="confirm_password" placeholder="Repite tu contraseña" required></div>
                        <button type="submit" class="action-btn primary-btn" style="width:100%">Registrarse</button>
                    </form>

                    <p class="form-switch-text">¿Ya tienes una cuenta? <a href="#" class="form-switch-link">Inicia sesión</a></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Lógica de flip y tema -->
    <script src="../JS/acceso.js"></script>

    <!-- React y Babel -->
    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <!-- Componentes compartidos (ThemeToggleButton) -->
    <script type="text/babel" src="../JSX/components.jsx"></script>

    <script type="text/babel">
        const themeRoot = ReactDOM.createRoot(document.getElementById('theme-toggle-root'));
        themeRoot.render(<ThemeToggleButton />);

        // Si llega con ?form=register, mostrar la cara de registro
        const urlParams = new URLSearchParams(window.location.search);
        const flipper = document.getElementById('form-flipper');
        if (urlParams.get('form') === 'register') {
            flipper?.classList.add('is-flipped');
        }
    </script>
</body>
</html>
