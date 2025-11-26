<?php
session_start();
// Verificar si el usuario está logueado
if (!isset($_SESSION['user_id'])) {
    header("Location: inicioSesion.php");
    exit();
}

// Datos del usuario desde sesión (usar nombres únicos para evitar colisiones con conexion.php)
$session_username = $_SESSION['username'];
$session_nombre = $_SESSION['nombre'];
$session_email = $_SESSION['email'];

// Determinar avatar a mostrar:
// Si en BD hay un avatar (ruta) úsalo; si es NULL/ vacío, usa el de sesión (e.g. Google/UI-Avatars)
$avatar = isset($_SESSION['avatar']) ? $_SESSION['avatar'] : null;

require_once __DIR__ . '/../INCLUDES/conexion.php';
$userId = $_SESSION['user_id'];
if ($conexion) {
    if ($stmt = $conexion->prepare('SELECT avatar FROM usuarios WHERE id = ? LIMIT 1')) {
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $stmt->bind_result($dbAvatar);
        if ($stmt->fetch()) {
            // Usar el avatar de BD si tiene valor válido distinto de NULL/ vacío
            if (!empty($dbAvatar) && strtoupper($dbAvatar) !== 'NULL') {
                $avatar = $dbAvatar;
            }
        }
        $stmt->close();
    }
}
?>
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>ZenStudio</title>

    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap">
    <link rel="stylesheet" href="../CSS/principalP1.css">
    <link rel="stylesheet" href="../CSS/principalP2.css">
    <link rel="icon" href=".../IMAGENES/ZenStudioLogo.png" type="image/png">
</head>
<body>

    <!-- Loader mínimo: overlay sólido con fade-out -->
    <div id="page-loader" style="position:fixed; inset:0; background:#0b0f14; z-index:9999; transition:opacity 0.6s ease; display:flex; align-items:center; justify-content:center;">
        <div class="loader-spinner" style="width:36px; height:36px; border:3px solid rgba(255,255,255,0.2); border-top-color:#8ab4f8; border-radius:50%; animation: spin 0.8s linear infinite;"></div>
        <span style="position:absolute; left:-9999px;">Cargando…</span>
    </div>
    <style>
        /* Spinner animation */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        /* Fade-out al marcar como loaded */
        #page-loader.loaded { opacity: 0; pointer-events: none; }
        /* Tamaño más pequeño para miniaturas del usuario */
        #user-background-gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        #user-background-gallery .bg-item { height: 120px; border-radius: 10px; overflow: hidden; position: relative; }
        #user-background-gallery .bg-item img, 
        #user-background-gallery .bg-item video { width: 100%; height: 100%; object-fit: cover; display: block; }
        #user-background-gallery.bulk-delete-mode .bg-item { outline: 2px dashed rgba(255,255,255,0.2); }
        #user-background-gallery .bg-item.selected { outline: 2px solid #8af8a8; box-shadow: 0 0 0 2px rgba(138, 248, 168, 0.4) inset; }
        #user-background-gallery .bg-item.deleted { opacity: 0; transform: scale(0.98); transition: opacity .25s ease, transform .25s ease; }
    </style>

    <div class="zen-interface">
        <div id="background-container" class="background-container"></div>

        <aside class="sidebar" role="navigation" aria-label="Barra lateral de navegación">
            <button class="sidebar-btn" data-section="spaces" title="Espacios" aria-pressed="true">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18V3H3zm9 13.5V7.5M7.5 12h9"></path></svg>
            </button>

            <nav class="sidebar-nav" aria-hidden="false">
                <button class="sidebar-btn" data-section="calendar" title="Calendario">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </button>
                <button class="sidebar-btn" data-section="timer" title="Temporizador">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </button>
                <button class="sidebar-btn" data-section="tasks" title="Tareas">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                </button>
                <button class="sidebar-btn" data-section="notes" title="Notas Rápidas">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                </button>
                <button class="sidebar-btn" data-section="media" aria-label="Abrir panel de música" title="Música / Media">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-music">
                        <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
                    </svg>
                </button>
                <button class="sidebar-btn" data-section="sounds" title="Sonidos Ambientales">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2V15H6L11 19V5Z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                </button>
            </nav>

            <button class="sidebar-btn" id="theme-toggle" title="Alternar Tema" aria-pressed="false">
                <svg id="moon-icon" class="icon-toggle" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>

                <svg id="sun-icon" class="icon-toggle" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
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
        </aside>

        <header class="topbar" role="banner">
            <div class="topbar-left">
                <div class="focus-dropdown-container">
                    <button class="focus-btn" id="zenstudio-dropdown-toggle" aria-expanded="false" aria-controls="zenstudio-menu">
                        ZenStudio <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="focus-menu" id="zenstudio-menu" role="menu" aria-hidden="true">
                        <a role="menuitem" href="#" id="show-credits-btn">Créditos</a>
                    </div>
                </div>

                <button id="sound-toggle" class="sound-indicator" title="Silenciar/Activar Sonido Global" aria-pressed="false" aria-label="Toggle sonido global">
                    <svg id="sound-on-icon" class="icon-toggle" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    <svg id="sound-off-icon" class="icon-toggle" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                </button>
            </div>

            <div class="topbar-right">
                <div class="user-avatar-container">
                    <img src="<?php echo $avatar; ?>" alt="Avatar" id="avatar-toggle" class="user-avatar" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
                    <div class="focus-menu avatar-menu" id="avatar-menu" role="menu" aria-hidden="true">
                        <div class="avatar-menu-profile">
                            <img src="<?php echo $avatar; ?>" alt="Avatar de usuario" id="menu-avatar-img" class="menu-avatar">
                            <div class="menu-user-info">
                                <span id="menu-account-name" class="menu-user-name"><?php echo htmlspecialchars($session_username); ?></span>
                                <span id="menu-user-email" class="menu-user-email"><?php echo htmlspecialchars($session_email); ?></span>
                            </div>
                        </div>
                        <div class="menu-separator"></div>
                        <a role="menuitem" href="perfil.php">Perfil/Ajustes Básicos</a>
                        <a role="menuitem" href="cerrarSesion.php" class="cerrarSesion">Cerrar Sesión</a>
                    </div>
                </div>
            </div>
        </header>


        <main class="main-content" id="main-content">

            <!-- Galería de Fondos Globales desde la base de datos -->
            <section id="content-backgrounds" class="floating-panel" style="left: 350px; top: 100px; width: 420px;" aria-hidden="true">
                <div class="panel-handle">
                    <h2>Fondos Animados</h2>
                    <button class="close-panel" data-target="backgrounds" aria-label="Cerrar fondos animados">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div id="fondos-list" class="fondos-list"></div>
            </section>

            <!-- Mensaje de Bienvenida (diseño original con botón de cierre) -->
            <section id="welcome-message" aria-labelledby="welcome-title">
                <button id="close-welcome-btn" aria-label="Cerrar bienvenida">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <h1 id="welcome-title">Bienvenido a ZenFocus.</h1>
                <p>Se recomienda el uso de auriculares para una mejor experiencia de escucha.</p>
            </section>

            <section id="content-calendar" class="floating-panel" style="left: 100px; top: 150px; width: 450px;" aria-hidden="true">
                <div class="panel-handle">
                    <h2>Vista de Calendario</h2>
                    <button class="close-panel" data-target="calendar" aria-label="Cerrar calendario">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="calendar-panel" id="calendar-panel">
                    
                    <div class="calendar-controls">
                        <button id="prev-month-btn" aria-label="Mes anterior" class="calendar-nav-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>

                        <h4 id="calendar-month-year">Noviembre 2025</h4> <button id="next-month-btn" aria-label="Mes siguiente" class="calendar-nav-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>

                    <div class="calendar-actions" style="justify-content: flex-end;"> 
                        <button id="add-event-btn" class="action-btn primary-btn">Programar Nuevo</button>
                    </div>

                    <div class="calendar-grid" id="calendar-grid">
                        </div>
                </div>
            </section>

            <section id="content-timer" class="floating-panel pomodoro-panel" style="left: 600px; top: 150px; width: 350px;" aria-hidden="true">
                <div class="panel-handle">
                    <h2>Temporizador Pomodoro</h2>
                    <button class="close-panel" data-target="timer" aria-label="Cerrar temporizador">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="timer-config">
                    <label for="minutes-input">Minutos de Enfoque:</label>
                    <input type="number" id="minutes-input" name="minutes-input" value="25" min="1" max="120" aria-label="Minutos de enfoque">
                </div>
                <div id="timer-display" class="timer-display">25:00</div>
                <div class="timer-actions">
                    <button id="start-timer" class="action-btn primary-btn" aria-pressed="false">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <span class="btn-text">Start</span>
                    </button>
                    <button id="reset-timer" class="action-btn secondary-btn" title="Reiniciar temporizador">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-rotate-cw">
                            <polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        <span class="btn-text">Reset</span>
                    </button>
                </div>
            </section>

            <section id="content-tasks" class="floating-panel" style="left: 150px; top: 350px; width: 400px;" aria-hidden="true">
                <div class="panel-handle">
                    <h2>Mis Tareas de Enfoque</h2>
                    <button class="close-panel" data-target="tasks" aria-label="Cerrar tareas">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="task-input-group">
                    <input type="text" id="new-task-input" name="new-task-input" placeholder="Añadir nueva tarea..." aria-label="Nueva tarea">
                    <button id="add-task-btn" class="action-btn primary-btn">Añadir</button>
                </div>
                <ul id="task-list" class="task-list">
                    </ul>
                <button id="clear-completed-btn" class="action-btn secondary-btn" style="width: 100%; margin-top: 10px;">Limpiar Completadas</button>
            </section>

            <section id="content-notes" class="floating-panel" style="left: 600px; top: 350px; width: 300px;" aria-hidden="true">
                <div class="panel-handle">
                    <h3>Notas Rápidas</h3>
                    <button class="close-panel" data-target="notes" aria-label="Cerrar notas">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="notes-toolbar">
                    <button id="notes-bold-btn" class="format-btn" title="Negrita (Ctrl+B)">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
                    </button>
                    <button id="notes-italic-btn" class="format-btn" title="Cursiva (Ctrl+I)">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
                    </button>
                    <button id="notes-underline-btn" class="format-btn" title="Subrayado (Ctrl+U)">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>
                    </button>
                    <button id="notes-list-btn" class="format-btn" title="Lista">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </button>
                    <!-- Custom Font Size Dropdown -->
                    <div id="notes-fontsize-dropdown" class="format-dropdown-container">
                        <button id="notes-fontsize-toggle" class="format-btn" title="Tamaño de fuente">
                            <span id="notes-fontsize-current">Normal</span>
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        <div id="notes-fontsize-menu" class="format-dropdown-menu" aria-hidden="true">
                            <button class="format-dropdown-item" data-size="1">Más pequeño</button>
                            <button class="format-dropdown-item" data-size="2">Pequeño</button>
                            <button class="format-dropdown-item active" data-size="3">Normal</button>
                            <button class="format-dropdown-item" data-size="4">Mediano</button>
                            <button class="format-dropdown-item" data-size="5">Grande</button>
                            <button class="format-dropdown-item" data-size="6">Muy grande</button>
                            <button class="format-dropdown-item" data-size="7">Máximo</button>
                        </div>
                    </div>
                </div>
                <div class="panel-content">
                    <div id="quick-notes" contenteditable="true" spellcheck="false" data-placeholder="Escribe tus notas rápidas aquí. Usa **negritas** y listas con - o * al inicio de línea. Pulsa Ctrl+Enter para guardar la nota."></div>
                </div>
                <!-- Handle para redimensionar el panel -->
                <div class="resize-handle"></div>
            </section>

            <section id="content-media" class="floating-panel" style="left: 150px; top: 550px; width: 400px;" aria-hidden="true">
                <div class="panel-handle">
                    <h2>Reproductor de Media</h2>
                    <button class="close-panel" data-target="media" aria-label="Cerrar reproductor">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <!-- Pestañas del reproductor -->
                <div class="media-tabs">
                    <button type="button" class="media-tab-btn active" data-tab="youtube">YouTube</button>
                    <button type="button" class="media-tab-btn" data-tab="local">Archivos Personales</button>
                </div>

                <!-- Contenido de las pestañas -->
                <div class="media-tab-content active" id="media-youtube-content">
                    <div class="media-url-input-group">
                        <input type="text" id="youtube-url-input" name="youtube-url-input" placeholder="Pega una URL de YouTube aquí..." aria-label="URL de YouTube">
                        <button id="load-youtube-btn" class="action-btn primary-btn">Cargar</button>
                    </div>
                    <div id="youtube-player-container" class="youtube-player-container">
                        <p class="youtube-placeholder">El video aparecerá aquí.</p>
                    </div>
                </div>

                <div class="media-tab-content" id="media-local-content">
                    <div class="local-player-display">
                        <div id="local-player-track-info">
                            <span id="local-player-track-title">Ninguna canción seleccionada</span>
                        </div>
                        <div class="local-player-controls">
                            <button id="local-player-prev" class="media-control-btn secondary-btn" title="Anterior"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg></button>
                            <button id="local-player-play" class="media-control-btn primary-btn large" title="Reproducir/Pausar"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></button>
                            <button id="local-player-next" class="media-control-btn secondary-btn" title="Siguiente"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg></button>
                        </div>
                        <div class="local-player-volume">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
                            <input type="range" id="local-player-volume-slider" name="local-player-volume-slider" min="0" max="1" step="0.01" value="0.8">
                        </div>
                    </div>
                    <button id="upload-local-music-btn" class="action-btn secondary-btn" style="width: 100%; margin-top: 15px;">Subir Música</button>
                    <input type="file" id="local-music-input" name="local-music-input" accept="audio/*" multiple style="display: none;">
                    <ul id="local-playlist" class="local-playlist"></ul>
                </div>
            </section>

            <section id="content-sounds" class="floating-panel" style="left: 600px; top: 550px; width: 350px;" aria-hidden="true">
                <div class="panel-handle">
                    <h2>Sonidos Ambientales</h2>
                    <button class="close-panel" data-target="sounds" aria-label="Cerrar sonidos">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <p class="panel-info">Mezcla tus sonidos favoritos para crear tu ambiente perfecto.</p>
                <div id="sound-list-container" class="sound-list">
                    </div>
                <button id="upload-sound-btn" class="action-btn secondary-btn" style="width: 100%; margin-top: 10px;">
                    Subir Sonido Propio
                </button>
                <input type="file" id="sound-file-input" name="sound-file-input" style="display:none;" accept="audio/*">
                <button id="toggle-user-sounds-btn" class="action-btn secondary-btn" style="width:100%; margin-top:10px;">
                    Mostrar Sonidos del Usuario
                </button>
                <div id="user-sounds-section" style="display:none; margin-top:12px;">
                    <h3 style="margin:4px 0;">Mis Sonidos Subidos</h3>
                    <button id="refresh-user-sounds-btn" class="action-btn tertiary-btn" style="width:100%; margin-bottom:8px;">Actualizar Lista</button>
                    <div id="user-sound-list" class="sound-list">
                </div>
                <button id="delete-user-sound-btn" class="action-btn secondary-btn" style="width:100%; margin-top:8px;" disabled>Eliminar Sonido Usuario</button>
            </section>
        </main>

        <div id="schedule-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-hidden="true">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-title">Eventos del Día (<span id="modal-date-display"></span>)</h3>
                    <button class="close-modal-btn" aria-label="Cerrar diálogo">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div id="event-list">
                        </div>
                    <div class="event-input-group" style="margin-top: 15px;">
                        <input type="text" id="new-event-text" name="new-event-text" placeholder="Añadir nuevo evento (ej: Reunión 10:00)" aria-label="Nuevo evento">
                        <button id="add-event-modal-btn" class="action-btn primary-btn">Añadir</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Créditos -->
        <div id="credits-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="credits-modal-title" aria-hidden="true">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="credits-modal-title">Créditos de ZenStudio</h3>
                    <button class="close-modal-btn" data-target="credits-modal" aria-label="Cerrar diálogo">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="modal-body credits-modal-content">
                    <div class="credit-card">
                        <span class="credit-name">Jesus Daniel Bacelis Santos</span>
                        <p class="credit-role">Desarrollador Frontend</p>
                        <p class="credit-description">Estudiante de la Licenciatura en Ingeniería de Software en la Facultad de Matemáticas de la UADY.</p>
                        <a href="mailto:jesusdanielbacelissantos@gmail.com" class="credit-email">jesusdanielbacelissantos@gmail.com</a>
                    </div>
                    <!-- Aquí puedes agregar las otras 3 tarjetas de créditos -->
                    <div class="credit-card placeholder">
                        <span class="credit-name">Nombre del Colaborador</span>
                        <p class="credit-role">Rol en el Proyecto</p>
                    </div>
                    <!-- Añade más tarjetas según necesites -->
                </div>
            </div>
        </div>

        <!-- Panel de Fondos Animados -->
        <section id="content-spaces" class="floating-panel" style="left: 350px; top: 80px; width: 420px;" aria-hidden="true">
            <div class="panel-handle">
                <h2>Fondos Animados</h2>
                <button class="close-panel" data-target="spaces" aria-label="Cerrar fondos">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <p class="panel-info">Selecciona un fondo para cambiar el ambiente de tu espacio de trabajo.</p>
            <div id="background-gallery" class="background-gallery">
                <!-- Los fondos se añadirán aquí desde JS -->
            </div>
            <h3 style="margin-top:12px;">Mis Fondos</h3>
            <div id="user-background-gallery" class="background-gallery" aria-multiselectable="true">
                <!-- Los fondos del usuario se añadirán aquí desde JS -->
            </div>
            <br>
            <!-- Acciones de usuario: subir y eliminar múltiples -->
            <div class="upload-background-btn-container" style="display:flex; gap:8px; flex-wrap:wrap;">
                <button id="upload-background-btn" class="action-btn primary-btn">Subir Fondo Animado</button>
                <input type="file" id="background-file-input" accept="image/gif, video/mp4" style="display: none;">
                <button id="clear-background-btn" class="action-btn secondary-btn">Quitar Fondo</button>
                <button id="bulk-delete-toggle-btn" class="action-btn danger-btn">Eliminar Fondos</button>
            </div>
        </section>

    </div>

    <script src="../JS/PrincipalP1.js"></script>
    <script src="../JS/PrincipalP2.js"></script>
    <script src="../JS/PrincipalP3.js"></script>
    <script src="../JS/PrincipalP4.js"></script>
    <script src="../JS/PrincipalP5.js"></script>
    
    <!-- Loader: ocultar después de que la ventana haya cargado completamente -->
    <script>
        window.addEventListener('load', () => {
            const loader = document.getElementById('page-loader');
            if (!loader) return;
            // Añadir clase para animar fade-out y luego eliminar del DOM
            loader.classList.add('loaded');
            setTimeout(() => {
                try { loader.remove(); } catch (e) { loader.style.display = 'none'; }
            }, 600);
        });
    </script>
    
</body>
</html>