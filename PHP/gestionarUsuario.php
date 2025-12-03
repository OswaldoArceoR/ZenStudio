<?php
session_start();
require_once __DIR__ . '/../INCLUDES/conexion.php';

// Solo administradores
if (empty($_SESSION['rol']) || $_SESSION['rol'] !== 'admin') {
    header('Location: paginaprincipal.php');
    exit;
}

// Utilidades
function safe_str($s) { return trim(filter_var($s, FILTER_SANITIZE_STRING)); }
function flash($msg, $cls = 'success') {
    $_SESSION['flash_message'] = $msg;
    $_SESSION['flash_class'] = $cls;
}

// CRUD básico sobre tabla usuarios: id, username, nombre, email, rol, avatar
$errors = [];
$success = null;

// Crear/Actualizar/Eliminar vía POST (PRG)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = isset($_POST['accion']) ? strtolower(trim($_POST['accion'])) : '';

    try {
        if ($accion === 'crear') {
            $username = safe_str($_POST['username'] ?? '');
            $nombre   = safe_str($_POST['nombre'] ?? '');
            $email    = safe_str($_POST['email'] ?? '');
            $rol      = safe_str($_POST['rol'] ?? 'usuario');
            $avatar   = safe_str($_POST['avatar'] ?? '');

            if ($username === '' || $email === '') { throw new Exception('Username y Email son obligatorios'); }

            $stmt = $conexion->prepare('INSERT INTO usuarios (username, nombre, email, rol, avatar) VALUES (?, ?, ?, ?, NULLIF(?, ""))');
            if (!$stmt) { throw new Exception('Error preparando INSERT: ' . $conexion->error); }
            $stmt->bind_param('sssss', $username, $nombre, $email, $rol, $avatar);
            if ($stmt->execute()) {
                flash('Usuario creado correctamente', 'success');
            } else {
                throw new Exception('Error al crear usuario: ' . $stmt->error);
            }
            $stmt->close();
        } elseif ($accion === 'actualizar') {
            $id       = (int)($_POST['id'] ?? 0);
            $username = safe_str($_POST['username'] ?? '');
            $nombre   = safe_str($_POST['nombre'] ?? '');
            $email    = safe_str($_POST['email'] ?? '');
            $rol      = safe_str($_POST['rol'] ?? 'usuario');
            $avatar   = safe_str($_POST['avatar'] ?? '');

            if ($id <= 0) { throw new Exception('ID inválido'); }

            $stmt = $conexion->prepare('UPDATE usuarios SET username = ?, nombre = ?, email = ?, rol = ?, avatar = NULLIF(?, "") WHERE id = ?');
            if (!$stmt) { throw new Exception('Error preparando UPDATE: ' . $conexion->error); }
            $stmt->bind_param('sssssi', $username, $nombre, $email, $rol, $avatar, $id);
            if ($stmt->execute()) {
                flash('Usuario actualizado correctamente', 'success');
            } else {
                throw new Exception('Error al actualizar usuario: ' . $stmt->error);
            }
            $stmt->close();
        } elseif ($accion === 'eliminar') {
            $id = (int)($_POST['id'] ?? 0);
            if ($id <= 0) { throw new Exception('ID inválido'); }
            // Evitar que un admin se elimine a sí mismo por accidente
            if (!empty($_SESSION['user_id']) && $id === (int)$_SESSION['user_id']) {
                throw new Exception('No puedes eliminar tu propio usuario');
            }

            $stmt = $conexion->prepare('DELETE FROM usuarios WHERE id = ?');
            if (!$stmt) { throw new Exception('Error preparando DELETE: ' . $conexion->error); }
            $stmt->bind_param('i', $id);
            if ($stmt->execute() && $stmt->affected_rows > 0) {
                flash('Usuario eliminado correctamente', 'success');
            } else {
                throw new Exception('No se encontró el usuario a eliminar');
            }
            $stmt->close();
        } else {
            throw new Exception('Acción no válida');
        }
    } catch (Exception $e) {
        flash('Error: ' . $e->getMessage(), 'error');
    }

    header('Location: gestionarUsuario.php');
    exit;
}

// Listar usuarios (GET)
$usuarios = [];
try {
    $res = $conexion->query('SELECT id, username, nombre, email, rol, avatar FROM usuarios ORDER BY id DESC LIMIT 200');
    if ($res) { while ($row = $res->fetch_assoc()) { $usuarios[] = $row; } }
} catch (Exception $e) { /* silencioso */ }

?>
<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestionar Usuarios - ZenStudio</title>
    <link rel="stylesheet" href="../CSS/fondos.css">
    <link rel="stylesheet" href="../CSS/subirMinimalista.css">
    <link rel="icon" href="../IMAGENES/ZenStudioLogo.png" type="image/png">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
      .list-section h2 { margin-top: 0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      .card { border: 1px solid var(--border); background: var(--surface); border-radius: 12px; padding: 12px; }
      .card-header { display:flex; align-items:center; justify-content:space-between; }
      .avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; background: var(--surface-2); }
      .field { display:flex; flex-direction:column; gap:6px; margin: 6px 0; }
      .field label { font-size: .85rem; color: var(--text-muted); }
      .field input, .field select { background: var(--surface-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
      .card-actions { display:flex; gap:8px; margin-top: 8px; }
      .message { margin-bottom: 12px; }
    </style>
</head>
<body data-theme="dark">
  <div class="background-container">
    <div class="zen-interface">
      <header class="topbar">
        <h1>Gestionar Usuarios</h1>
        <div>
          <a class="action-btn secondary-btn" href="paginaprincipal.php">Volver</a>
        </div>
      </header>

      <main class="main-content">
        <?php if (!empty($_SESSION['flash_message'])): ?>
          <div class="message <?php echo $_SESSION['flash_class'] ?? 'success'; ?>">
            <?php echo $_SESSION['flash_message']; unset($_SESSION['flash_message'], $_SESSION['flash_class']); ?>
          </div>
        <?php endif; ?>

     

        <section class="list-section active" id="users-list">
          <h2>Usuarios</h2>
          <div class="grid">
            <?php foreach ($usuarios as $u): ?>
              <div class="card">
                <div class="card-header">
                  <strong>#<?php echo (int)$u['id']; ?> — <?php echo htmlspecialchars($u['username']); ?></strong>
                  <?php if (!empty($u['avatar'])): ?>
                    <img class="avatar" src="<?php echo htmlspecialchars($u['avatar']); ?>" alt="avatar">
                  <?php else: ?>
                    <div class="avatar"></div>
                  <?php endif; ?>
                </div>
                <form method="post" action="gestionarUsuario.php">
                  <input type="hidden" name="accion" value="actualizar">
                  <input type="hidden" name="id" value="<?php echo (int)$u['id']; ?>">

                  <div class="field">
                    <label>Username</label>
                    <input type="text" name="username" value="<?php echo htmlspecialchars($u['username']); ?>">
                  </div>
                  <div class="field">
                    <label>Nombre</label>
                    <input type="text" name="nombre" value="<?php echo htmlspecialchars($u['nombre']); ?>">
                  </div>
                  <div class="field">
                    <label>Email</label>
                    <input type="email" name="email" value="<?php echo htmlspecialchars($u['email']); ?>">
                  </div>
                  <div class="field">
                    <label>Rol</label>
                    <select name="rol" class="form-select">
                      <option value="usuario" <?php echo ($u['rol']==='usuario') ? 'selected' : ''; ?>>Usuario</option>
                      <option value="admin" <?php echo ($u['rol']==='admin') ? 'selected' : ''; ?>>Admin</option>
                    </select>
                  </div>
                  <div class="field">
                    <label>Avatar (URL)</label>
                    <input type="text" name="avatar" value="<?php echo htmlspecialchars($u['avatar']); ?>" placeholder="https://...">
                  </div>

                  <div class="card-actions">
                    <button type="submit" class="action-btn primary-btn">Guardar</button>
                    </form>
                    <form method="post" action="gestionarUsuario.php" onsubmit="return confirm('¿Eliminar usuario?');">
                      <input type="hidden" name="accion" value="eliminar">
                      <input type="hidden" name="id" value="<?php echo (int)$u['id']; ?>">
                      <button type="submit" class="action-btn danger-btn">Eliminar</button>
                    </form>
                  </div>
              </div>
            <?php endforeach; ?>
          </div>
        </section>
      </main>
    </div>
  </div>

  <script src="../JS/gestionarUsuario.js"></script>
</body>
</html>
