<?php
session_start();
require_once __DIR__ . '/../INCLUDES/conexion.php';

// ===== Límites razonables de subida (como ya tenías) =====
ini_set('upload_max_filesize', '100M');
ini_set('post_max_size', '100M');
ini_set('max_execution_time', '300');

// ===== Utilidades =====
function getUploadError($errorCode) {
  $errors = [
    UPLOAD_ERR_INI_SIZE    => 'El archivo excede el tamaño máximo permitido por el servidor',
    UPLOAD_ERR_FORM_SIZE   => 'El archivo excede el tamaño máximo permitido por el formulario',
    UPLOAD_ERR_PARTIAL     => 'El archivo fue subido parcialmente',
    UPLOAD_ERR_NO_FILE     => 'No se subió ningún archivo',
    UPLOAD_ERR_NO_TMP_DIR  => 'Falta el directorio temporal',
    UPLOAD_ERR_CANT_WRITE  => 'No se pudo escribir el archivo en el disco',
    UPLOAD_ERR_EXTENSION   => 'Una extensión de PHP detuvo la subida del archivo'
  ];
  return $errors[$errorCode] ?? 'Error desconocido';
}

// ===============================
// Procesamiento de la solicitud
// ===============================
$message = null;
$successCount = 0;
$errorCount   = 0;
$errors       = [];
$fondosListado = [];
$sonidosListado = [];


// Eliminar contenido (PRG)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion']) && $_POST['accion'] === 'eliminar') {
  try {
    $deleteId   = isset($_POST['delete_id']) ? (int)$_POST['delete_id'] : 0;
    $deleteTipo = isset($_POST['delete_tipo']) ? strtolower(trim($_POST['delete_tipo'])) : '';
    if ($deleteId <= 0 || ($deleteTipo !== 'fondos' && $deleteTipo !== 'sonidos')) {
      throw new Exception('Solicitud de eliminación inválida');
    }
    if ($deleteTipo === 'fondos') {
      // Obtener posible ruta para borrar archivo del servidor
      $res = $conexion->query("SELECT ruta_archivo FROM fondos_globales WHERE id_fondo = " . $deleteId);
      $ruta = null;
      if ($res && $res->num_rows) {
        $row = $res->fetch_assoc();
        $ruta = $row['ruta_archivo'];
      }
      $conexion->query("DELETE FROM fondos_globales WHERE id_fondo = " . $deleteId);
      if ($conexion->affected_rows > 0) {
        if ($ruta) {
          $path = realpath(__DIR__ . '/' . $ruta);
          if ($path && file_exists($path)) { @unlink($path); }
        }
        $_SESSION['flash_message'] = 'Fondo eliminado correctamente';
        $_SESSION['flash_class']   = 'success';
      } else {
        throw new Exception('No se encontró el fondo');
      }
    } else {
      $res = $conexion->query("SELECT ruta_archivo FROM sonidos_globales WHERE id_sonido = " . $deleteId);
      $ruta = null;
      if ($res && $res->num_rows) {
        $row = $res->fetch_assoc();
        $ruta = $row['ruta_archivo'];
      }
      $conexion->query("DELETE FROM sonidos_globales WHERE id_sonido = " . $deleteId);
      if ($conexion->affected_rows > 0) {
        if ($ruta) {
          $path = realpath(__DIR__ . '/' . $ruta);
          if ($path && file_exists($path)) { @unlink($path); }
        }
        $_SESSION['flash_message'] = 'Sonido eliminado correctamente';
        $_SESSION['flash_class']   = 'success';
      } else {
        throw new Exception('No se encontró el sonido');
      }
    }
  } catch (Exception $e) {
    $_SESSION['flash_message'] = 'Error al eliminar: ' . $e->getMessage();
    $_SESSION['flash_class']   = 'error';
  }
  header('Location: subirContenido.php');
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Normaliza y valida
  $modo      = isset($_POST['modo']) ? strtolower(trim($_POST['modo'])) : 'blob';
  $tipo      = isset($_POST['tipo']) ? strtolower(trim($_POST['tipo'])) : '';
  $categoria = $_POST['categoria'] ?? 'General';

  // Si no llegó 'tipo', intentamos inferirlo del primer archivo
  if ($tipo === '' && isset($_FILES['archivos']) && isset($_FILES['archivos']['type'][0])) {
    $firstMime = $_FILES['archivos']['type'][0];
    if (strpos($firstMime, 'image/') === 0 || strpos($firstMime, 'video/') === 0) {
      $tipo = 'fondos';
    } else if (strpos($firstMime, 'audio/') === 0) {
      $tipo = 'sonidos';
    }
  }

  // Asigna flujo según tipo
  if ($tipo === 'fondos' && isset($_FILES['archivos'])) {
    if ($modo === 'blob') {
      procesarFondosBlob($categoria, $_FILES['archivos'], $successCount, $errorCount, $errors);
    } else {
      procesarFondosRuta($categoria, $_FILES['archivos'], $successCount, $errorCount, $errors);
    }
  } elseif ($tipo === 'sonidos' && isset($_FILES['archivos'])) {
    if ($modo === 'blob') {
      procesarSonidosBlob($categoria, $_FILES['archivos'], $successCount, $errorCount, $errors);
    } else {
      procesarSonidosRuta($categoria, $_FILES['archivos'], $successCount, $errorCount, $errors);
    }
  } else {
    $errors[] = "Tipo de contenido no válido";
    $errorCount++;
  }

    $message = "Subida completada: {$successCount} archivos subidos";
    if ($errorCount > 0) {
      $message .= ", {$errorCount} errores";
      if (!empty($errors)) {
        $message .= "<br>Errores:<br>" . implode("<br>", $errors);
      }
    }

    // Flash message + PRG (Post/Redirect/Get)
    $_SESSION['flash_message'] = $message;
    $_SESSION['flash_class']   = ($errorCount > 0) ? 'error' : 'success';
    header('Location: subirContenido.php');
    exit;
}

// Listar elementos existentes (GET)
try {
  $qF = $conexion->query("SELECT id_fondo AS id, nombre, categoria, tipo_archivo, tamaño, ruta_archivo, mime_type FROM fondos_globales ORDER BY id_fondo DESC LIMIT 100");
  if ($qF) { while ($r = $qF->fetch_assoc()) { $fondosListado[] = $r; } }
  $qS = $conexion->query("SELECT id_sonido AS id, nombre, categoria, tipo_archivo, tamaño, ruta_archivo, mime_type FROM sonidos_globales ORDER BY id_sonido DESC LIMIT 100");
  if ($qS) { while ($r = $qS->fetch_assoc()) { $sonidosListado[] = $r; } }
} catch (Exception $e) {
  // Silencioso: no romper la página si listado falla
}

// ===============================
// Implementaciones MODO BLOB
// ===============================
function procesarFondosBlob($categoria, $uploadedFiles, &$successCount, &$errorCount, &$errors) {
  global $conexion;

  // Tipos permitidos (fondos)
  $allowedTypes = ['image/gif', 'image/webp', 'image/apng', 'video/mp4'];
  $maxSize      = 50 * 1024 * 1024; // 50 MB

  // Prepara INSERT (globales en BLOB)
  // Usamos archivo_blob (LONGBLOB) y guardamos mime_type para servir correcto
  $stmt = $conexion->prepare("
    INSERT INTO fondos_globales (nombre, categoria, ruta_archivo, tipo_archivo, tamaño, mime_type, archivo_blob)
    VALUES (?, ?, NULL, ?, ?, ?, ?)
  ");
  if (!$stmt) {
    throw new Exception("Error preparando consulta (fondos_blob): " . $conexion->error);
  }

  for ($i = 0; $i < count($uploadedFiles['name']); $i++) {
    try {
      if ($uploadedFiles['error'][$i] !== UPLOAD_ERR_OK) {
        $errors[] = "Error en {$uploadedFiles['name'][$i]}: " . getUploadError($uploadedFiles['error'][$i]);
        $errorCount++;
        continue;
      }

      $nombre       = pathinfo($uploadedFiles['name'][$i], PATHINFO_FILENAME);
      $tipo_archivo = $uploadedFiles['type'][$i];
      $tamaño       = (int)$uploadedFiles['size'][$i];
      $tmp          = $uploadedFiles['tmp_name'][$i];

      // Validaciones
      if (!in_array($tipo_archivo, $allowedTypes)) {
        $errors[] = "{$uploadedFiles['name'][$i]}: Tipo de archivo no permitido para fondos (".$tipo_archivo.")";
        $errorCount++;
        continue;
      }
      if ($tamaño > $maxSize) {
        $errors[] = "{$uploadedFiles['name'][$i]}: El archivo es muy grande (máximo 50MB)";
        $errorCount++;
        continue;
      }

      // Leer contenido como BLOB
      $blob = @file_get_contents($tmp);
      if ($blob === false || strlen($blob) === 0) {
        $errors[] = "{$uploadedFiles['name'][$i]}: No se pudo leer el archivo o está vacío";
        $errorCount++;
        continue;
      }

      // Validar que el blob es realmente una imagen válida (opcional, solo para GIF)
      if (strpos($tipo_archivo, 'image/') === 0 && substr($blob, 0, 6) !== 'GIF89a' && substr($blob, 0, 6) !== 'GIF87a') {
        $errors[] = "{$uploadedFiles['name'][$i]}: El archivo no parece ser un GIF válido";
        $errorCount++;
        continue;
      }

      $blobParam = null;
      $stmt->bind_param('sssisb', $nombre, $categoria, $tipo_archivo, $tamaño, $tipo_archivo, $blobParam);
      $stmt->send_long_data(5, $blob);

      if ($stmt->execute()) {
        $successCount++;
      } else {
        throw new Exception("Error DB: " . $stmt->error);
      }

    } catch (Exception $e) {
      $errors[] = "{$uploadedFiles['name'][$i]}: " . $e->getMessage();
      $errorCount++;
    }
  }

  $stmt->close();
}

function procesarSonidosBlob($categoria, $uploadedFiles, &$successCount, &$errorCount, &$errors) {
  global $conexion;

  // Tipos permitidos (sonidos)
  $allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a'];
  $maxSize      = 20 * 1024 * 1024; // 20 MB

  // Prepara INSERT (globales en BLOB)
  $stmt = $conexion->prepare("
    INSERT INTO sonidos_globales (nombre, categoria, ruta_archivo, tipo_archivo, tamaño, mime_type, archivo_blob)
    VALUES (?, ?, NULL, ?, ?, ?, ?)
  ");
  if (!$stmt) {
    throw new Exception("Error preparando consulta (sonidos_blob): " . $conexion->error);
  }

  for ($i = 0; $i < count($uploadedFiles['name']); $i++) {
    try {
      if ($uploadedFiles['error'][$i] !== UPLOAD_ERR_OK) {
        $errors[] = "Error en {$uploadedFiles['name'][$i]}: " . getUploadError($uploadedFiles['error'][$i]);
        $errorCount++;
        continue;
      }

      $nombre       = pathinfo($uploadedFiles['name'][$i], PATHINFO_FILENAME);
      $tipo_archivo = $uploadedFiles['type'][$i];
      $tamaño       = (int)$uploadedFiles['size'][$i];
      $tmp          = $uploadedFiles['tmp_name'][$i];

      // Validaciones
      if (!in_array($tipo_archivo, $allowedTypes)) {
        $errors[] = "{$uploadedFiles['name'][$i]}: Tipo de archivo no permitido para sonidos";
        $errorCount++;
        continue;
      }
      if ($tamaño > $maxSize) {
        $errors[] = "{$uploadedFiles['name'][$i]}: El archivo es muy grande (máximo 20MB)";
        $errorCount++;
        continue;
      }

      // Leer contenido como BLOB
      $blob = @file_get_contents($tmp);
      if ($blob === false) {
        $errors[] = "{$uploadedFiles['name'][$i]}: No se pudo leer el archivo";
        $errorCount++;
        continue;
      }

      // Bind (blob → 'b' y send_long_data)
      $blobParam = null;
      $stmt->bind_param('sssisb', $nombre, $categoria, $tipo_archivo, $tamaño, $tipo_archivo, $blobParam);
      $stmt->send_long_data(5, $blob);

      if ($stmt->execute()) {
        $successCount++;
      } else {
        throw new Exception("Error DB: " . $stmt->error);
      }

    } catch (Exception $e) {
      $errors[] = "{$uploadedFiles['name'][$i]}: " . $e->getMessage();
      $errorCount++;
    }
  }

  $stmt->close();
}

// ===============================
// Implementaciones MODO RUTA (originales)
// ===============================
// Se mantienen por compatibilidad (si algún día envías modo=ruta)
function procesarFondosRuta($categoria, $uploadedFiles, &$successCount, &$errorCount, &$errors) {
  global $conexion;

  $allowedTypes = ['image/gif', 'image/webp', 'image/apng', 'video/mp4'];
  $maxSize      = 50 * 1024 * 1024; // 50MB

  for ($i = 0; $i < count($uploadedFiles['name']); $i++) {
    if ($uploadedFiles['error'][$i] !== UPLOAD_ERR_OK) {
      $errors[] = "Error en {$uploadedFiles['name'][$i]}: " . getUploadError($uploadedFiles['error'][$i]);
      $errorCount++;
      continue;
    }

    $nombre       = pathinfo($uploadedFiles['name'][$i], PATHINFO_FILENAME);
    $tipo_archivo = $uploadedFiles['type'][$i];
    $tamaño       = (int)$uploadedFiles['size'][$i];
    $tmp          = $uploadedFiles['tmp_name'][$i];

    if (!in_array($tipo_archivo, $allowedTypes)) {
      $errors[] = "{$uploadedFiles['name'][$i]}: Tipo de archivo no permitido para fondos";
      $errorCount++;
      continue;
    }
    if ($tamaño > $maxSize) {
      $errors[] = "{$uploadedFiles['name'][$i]}: El archivo es muy grande (máximo 50MB)";
      $errorCount++;
      continue;
    }

    try {
      $uploadDir = __DIR__ . '/FONDOS_UPLOAD/';
      if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
      }
      $extension     = pathinfo($uploadedFiles['name'][$i], PATHINFO_EXTENSION);
      $nombreArchivo = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $nombre) . '.' . $extension;
      $rutaDestino   = $uploadDir . $nombreArchivo;

      if (move_uploaded_file($tmp, $rutaDestino)) {
        $stmt = $conexion->prepare("
          INSERT INTO fondos_globales (nombre, categoria, ruta_archivo, tipo_archivo, tamaño)
          VALUES (?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
          throw new Exception("Error preparando consulta: " . $conexion->error);
        }
        $rutaRelativa = 'FONDOS_UPLOAD/' . $nombreArchivo;
        $stmt->bind_param("ssssi", $nombre, $categoria, $rutaRelativa, $tipo_archivo, $tamaño);
        if ($stmt->execute()) {
          $successCount++;
        } else {
          unlink($rutaDestino);
          throw new Exception("Error en base de datos: " . $stmt->error);
        }
        $stmt->close();
      } else {
        throw new Exception("No se pudo mover el archivo al servidor");
      }
    } catch (Exception $e) {
      $errors[] = "{$uploadedFiles['name'][$i]}: " . $e->getMessage();
      $errorCount++;
    }
  }
}

function procesarSonidosRuta($categoria, $uploadedFiles, &$successCount, &$errorCount, &$errors) {
  global $conexion;

  $allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-m4a'];
  $maxSize      = 20 * 1024 * 1024; // 20MB

  for ($i = 0; $i < count($uploadedFiles['name']); $i++) {
    if ($uploadedFiles['error'][$i] !== UPLOAD_ERR_OK) {
      $errors[] = "Error en {$uploadedFiles['name'][$i]}: " . getUploadError($uploadedFiles['error'][$i]);
      $errorCount++;
      continue;
    }

    $nombre       = pathinfo($uploadedFiles['name'][$i], PATHINFO_FILENAME);
    $tipo_archivo = $uploadedFiles['type'][$i];
    $tamaño       = (int)$uploadedFiles['size'][$i];
    $tmp          = $uploadedFiles['tmp_name'][$i];

    if (!in_array($tipo_archivo, $allowedTypes)) {
      $errors[] = "{$uploadedFiles['name'][$i]}: Tipo de archivo no permitido para sonidos";
      $errorCount++;
      continue;
    }
    if ($tamaño > $maxSize) {
      $errors[] = "{$uploadedFiles['name'][$i]}: El archivo es muy grande (máximo 20MB)";
      $errorCount++;
      continue;
    }

    try {
      $uploadDir = __DIR__ . '/SONIDOS_UPLOAD/';
      if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
      }
      $extension     = pathinfo($uploadedFiles['name'][$i], PATHINFO_EXTENSION);
      $nombreArchivo = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $nombre) . '.' . $extension;
      $rutaDestino   = $uploadDir . $nombreArchivo;

      if (move_uploaded_file($tmp, $rutaDestino)) {
        $stmt = $conexion->prepare("
          INSERT INTO sonidos_globales (nombre, categoria, ruta_archivo, tipo_archivo, tamaño)
          VALUES (?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
          throw new Exception("Error preparando consulta: " . $conexion->error);
        }
        $rutaRelativa = 'SONIDOS_UPLOAD/' . $nombreArchivo;
        $stmt->bind_param("ssssi", $nombre, $categoria, $rutaRelativa, $tipo_archivo, $tamaño);
        if ($stmt->execute()) {
          $successCount++;
        } else {
          unlink($rutaDestino);
          throw new Exception("Error en base de datos: " . $stmt->error);
        }
        $stmt->close();
      } else {
        throw new Exception("No se pudo mover el archivo al servidor");
      }
    } catch (Exception $e) {
      $errors[] = "{$uploadedFiles['name'][$i]}: " . $e->getMessage();
      $errorCount++;
    }
  }
}
?>
<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subir Contenido - ZenStudio Minimalista</title>
  <link rel="stylesheet" href="../CSS/fondos.css">
  <link rel="stylesheet" href="../CSS/subirMinimalista.css">
  <link rel="icon" href="../IMAGENES/ZenStudioLogo.png" type="image/png">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    /* Asegura que solo la sección activa se muestre */
    .list-section { display: none; }
    .list-section.active { display: block; }
    /* Opcional: mantiene los contenedores de formulario en sincronía con el selector */
    .upload-form { display: none; }
    .upload-form.active { display: block; }
  </style>
</head>
<body data-theme="dark">
  <div class="background-container">
    <div class="zen-interface">
      <header class="topbar">
        <div class="topbar-left">
          <h1>Subir Contenido</h1>
        </div>
        <div class="topbar-right">
          <a href="paginaprincipal.php" class="action-btn secondary-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-arrow-left">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Volver
          </a>
        </div>
      </header>
      <main class="main-content">
        <?php if (isset($_SESSION['flash_message'])): ?>
          <div class="message <?php echo $_SESSION['flash_class'] ?? 'success'; ?>">
            <?php echo $_SESSION['flash_message']; ?>
          </div>
          <?php unset($_SESSION['flash_message'], $_SESSION['flash_class']); ?>
        <?php endif; ?>

        <!-- Selector de tipo -->
        <div class="type-selector">
          <button class="type-btn active" data-type="fondos">🎨 Fondos Animados</button>
          <button class="type-btn" data-type="sonidos">🎵 Sonidos Ambientales</button>
        </div>

        <!-- Formulario Fondos -->
        <form action="subirContenido.php" method="POST" enctype="multipart/form-data" class="upload-form active" id="form-fondos">
          <input type="hidden" name="tipo" value="fondos">
          <div class="form-group">
            <label for="categoria-fondos">Categoría:</label>
            <select name="categoria" id="categoria-fondos" required class="form-select">
              <option value="Naturaleza">Naturaleza</option>
              <option value="Abstracto">Abstracto</option>
              <option value="Ciudad">Ciudad</option>
              <option value="Espacio">Espacio</option>
              <option value="Animación">Animación</option>
            </select>
          </div>
          <div class="form-group">
            <label>Archivos de Fondos</label>
            <div class="file-drop-area">
              <span class="file-msg">Arrastra y suelta los archivos aquí</span>
              <span class="file-btn">o selecciona archivos</span>
              <input type="file" name="archivos[]" id="archivos-fondos" multiple
                     accept=".gif,.webp,.apng,.mp4" required>
            </div>
          </div>
          <small>Formatos permitidos: GIF, WebP, APNG, MP4 (max 50MB c/u)</small>
          <div id="file-preview-fondos" class="file-preview"></div>
          <button type="submit" class="action-btn primary-btn">Subir Fondos</button>
        </form>

          <!-- Listado de Fondos Subidos -->
          <section class="list-section" id="fondos-section">
            <h2 class="section-toggle" data-target="fondos-list">Fondos Subidos</h2>
            <div class="file-preview collapsible open" id="fondos-list">
              <?php foreach ($fondosListado as $item): ?>
                <div class="preview-item">
                  <?php
                    $isImg = (strpos($item['tipo_archivo'], 'image/') === 0);
                    $isVid = (strpos($item['tipo_archivo'], 'video/') === 0);
                    $src   = null;
                    if (!empty($item['ruta_archivo'])) {
                      // usar la ruta relativa almacenada (desde PHP/)
                      $src = $item['ruta_archivo'];
                    } else {
                      // si es BLOB, servir directamente desde el viewer
                      $src = 'verBlobGlobal.php?tipo=fondos&id=' . $item['id'];
                    }
                  ?>
                  <?php if ($isImg): ?>
                    <img src="<?php echo htmlspecialchars($src); ?>" alt="<?php echo htmlspecialchars($item['nombre']); ?>" class="preview-click" data-src="<?php echo htmlspecialchars($src); ?>" data-title="<?php echo htmlspecialchars($item['nombre']); ?>">
                  <?php elseif ($isVid): ?>
                    <video src="<?php echo htmlspecialchars($src); ?>" muted autoplay loop class="preview-click" data-src="<?php echo htmlspecialchars($src); ?>" data-title="<?php echo htmlspecialchars($item['nombre']); ?>"></video>
                  <?php endif; ?>
                  <div class="preview-info">
                    <strong><?php echo htmlspecialchars($item['nombre']); ?></strong>
                    <div><?php echo htmlspecialchars($item['categoria']); ?> · <?php echo number_format(($item['tamaño']/1024/1024), 2); ?> MB</div>
                  </div>
                  <form method="POST" action="subirContenido.php" class="inline-form">
                    <input type="hidden" name="accion" value="eliminar">
                    <input type="hidden" name="delete_tipo" value="fondos">
                    <input type="hidden" name="delete_id" value="<?php echo (int)$item['id']; ?>">
                    <button type="submit" class="action-btn secondary-btn">Eliminar</button>
                  </form>
                </div>
              <?php endforeach; ?>
              <?php if (empty($fondosListado)): ?>
                <p class="muted">Aún no hay fondos subidos.</p>
              <?php endif; ?>
            </div>
          </section>

        <!-- Formulario Sonidos -->
        <form action="subirContenido.php" method="POST" enctype="multipart/form-data" class="upload-form" id="form-sonidos">
          <input type="hidden" name="tipo" value="sonidos">
          <div class="form-group">
            <label for="categoria-sonidos">Categoría:</label>
            <select name="categoria" id="categoria-sonidos" required class="form-select">
              <option value="Naturaleza">Naturaleza</option>
              <option value="Agua">Agua</option>
              <option value="Ciudad">Ciudad</option>
              <option value="Instrumental">Instrumental</option>
              <option value="Ambiental">Ambiental</option>
              <option value="Blanco">Ruido Blanco</option>
            </select>
          </div>
          <div class="form-group">
            <label>Archivos de Sonido</label>
            <div class="file-drop-area">
              <span class="file-msg">Arrastra y suelta los archivos aquí</span>
              <span class="file-btn">o selecciona archivos</span>
              <input type="file" name="archivos[]" id="archivos-sonidos" multiple
                     accept=".mp3,.wav,.ogg,.m4a" required>
            </div>
          </div>
          <small>Formatos permitidos: MP3, WAV, OGG, M4A (max 20MB c/u)</small>
          <div id="file-preview-sonidos" class="file-preview"></div>
          <button type="submit" class="action-btn primary-btn">Subir Sonidos</button>
        </form>

          <!-- Listado de Sonidos Subidos -->
          <section class="list-section" id="sonidos-section">
            <h2 class="section-toggle" data-target="sonidos-list">Sonidos Subidos</h2>
            <div class="file-preview collapsible open" id="sonidos-list">
              <?php foreach ($sonidosListado as $item): ?>
                <div class="preview-item">
                  <?php
                    $src = null;
                    if (!empty($item['ruta_archivo'])) {
                      $src = $item['ruta_archivo'];
                    } else {
                      $src = 'verBlobGlobal.php?tipo=sonidos&id=' . $item['id'];
                    }
                  ?>
                  <div class="audio-icon" style="font-size:2rem;text-align:center;padding:20px;">🎵</div>
                  <audio src="<?php echo htmlspecialchars($src); ?>" controls></audio>
                  <div class="preview-info">
                    <strong><?php echo htmlspecialchars($item['nombre']); ?></strong>
                    <div><?php echo htmlspecialchars($item['categoria']); ?> · <?php echo number_format(($item['tamaño']/1024/1024), 2); ?> MB</div>
                  </div>
                  <form method="POST" action="subirContenido.php" class="inline-form">
                    <input type="hidden" name="accion" value="eliminar">
                    <input type="hidden" name="delete_tipo" value="sonidos">
                    <input type="hidden" name="delete_id" value="<?php echo (int)$item['id']; ?>">
                    <button type="submit" class="action-btn secondary-btn">Eliminar</button>
                  </form>
                </div>
              <?php endforeach; ?>
              <?php if (empty($sonidosListado)): ?>
                <p class="muted">Aún no hay sonidos subidos.</p>
              <?php endif; ?>
            </div>
          </section>

      </main>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const typeButtons = document.querySelectorAll('.type-btn');
      const forms       = document.querySelectorAll('.upload-form');
      const sections    = document.querySelectorAll('.list-section');

      typeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const type = this.dataset.type;
          typeButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          forms.forEach(form => {
            form.classList.remove('active');
            if (form.id === `form-${type}`) form.classList.add('active');
          });

          sections.forEach(sec => {
            sec.classList.remove('active');
          });
          const targetSec = document.getElementById(`${type}-section`);
          if (targetSec) targetSec.classList.add('active');
        });
      });

      setupFilePreview('archivos-fondos',  'file-preview-fondos');
      setupFilePreview('archivos-sonidos','file-preview-sonidos');

      // Estado inicial: mostrar fondos
      document.getElementById('fondos-section')?.classList.add('active');

      // Toggle sections
      document.querySelectorAll('.section-toggle').forEach(h => {
        h.addEventListener('click', () => {
          const id = h.dataset.target;
          const el = document.getElementById(id);
          if (!el) return;
          el.classList.toggle('open');
        });
      });

      // Lightbox for previews
      const lb = createLightbox();
      document.querySelectorAll('.preview-click').forEach(el => {
        el.addEventListener('click', () => {
          const src = el.dataset.src || el.getAttribute('src');
          const title = el.dataset.title || '';
          const isVideo = el.tagName.toLowerCase() === 'video';
          lb.open(src, title, isVideo);
        });
      });

      // Lógica para el área de drag and drop
      document.querySelectorAll('.file-drop-area').forEach(area => {
        area.addEventListener('dragover', (e) => {
          e.preventDefault();
          area.classList.add('dragover');
        });
        area.addEventListener('dragleave', () => {
          area.classList.remove('dragover');
        });
        area.addEventListener('drop', () => {
          area.classList.remove('dragover');
        });
      });
    });

    function setupFilePreview(inputId, previewId) {
      const fileInput   = document.getElementById(inputId);
      const filePreview = document.getElementById(previewId);
      const handleFiles = (e) => {
        filePreview.innerHTML = '';
        const files = Array.from(e.target.files);
        files.forEach(file => {
          const previewItem = document.createElement('div');
          previewItem.className = 'preview-item';
          const url = URL.createObjectURL(file);

          if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = url;
            previewItem.appendChild(img);
          } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = url; video.muted = true; video.autoplay = true; video.loop = true;
            previewItem.appendChild(video);
          } else if (file.type.startsWith('audio/')) {
            const icon = document.createElement('div');
            icon.className = 'audio-icon';
            icon.innerText = '🎵';
            icon.style.fontSize = '2rem';
            icon.style.textAlign = 'center';
            icon.style.padding = '20px';
            previewItem.appendChild(icon);
          }

          const info = document.createElement('div');
          info.className = 'preview-info';
          info.innerHTML = `
            <strong>${file.name}</strong>
            <div>${(file.size / 1024 / 1024).toFixed(2)} MB</div>
          `;
          previewItem.appendChild(info);
          filePreview.appendChild(previewItem);
        });
      };

      fileInput.addEventListener('change', handleFiles);
    }

    function createLightbox() {
      const overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      const content = document.createElement('div');
      content.className = 'lightbox-content';
      const header = document.createElement('div');
      header.className = 'lightbox-header';
      const titleEl = document.createElement('div');
      titleEl.className = 'lightbox-title';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'action-btn secondary-btn';
      closeBtn.textContent = 'Cerrar';
      header.appendChild(titleEl);
      header.appendChild(closeBtn);
      const body = document.createElement('div');
      body.className = 'lightbox-body';
      content.appendChild(header);
      content.appendChild(body);
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      function open(src, title, isVideo) {
        titleEl.textContent = title;
        body.innerHTML = '';
        if (isVideo) {
          const v = document.createElement('video');
          v.src = src; v.controls = true; v.autoplay = true; v.loop = true;
          body.appendChild(v);
        } else {
          const img = document.createElement('img');
          img.src = src;
          body.appendChild(img);
        }
        overlay.classList.add('open');
      }
      function close() { overlay.classList.remove('open'); }
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      return { open, close };
    }
  </script>
</body>
</html>