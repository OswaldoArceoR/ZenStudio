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
<html lang="es" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subir Contenido - ZenStudio</title>
  <link rel="stylesheet" href="../CSS/principalP1.css">
  <link rel="stylesheet" href="../CSS/principalP2.css">
  <link rel="stylesheet" href="../CSS/fondos.css">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body data-theme="light">
  <div class="background-container">
    <div class="zen-interface">
      <header class="topbar">
        <div class="topbar-left">
          <h1>Subir Contenido</h1>
        </div>
        <div class="topbar-right">
          <button id="theme-toggle" class="icon-toggle">
            <span id="sun-icon">☀️</span>
            <span id="moon-icon">🌙</span>
          </button>
          <a href="paginaprincipal.php" class="primary-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-arrow-left">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </a>
        </div>
      </header>
      <main class="main-content">
        <?php if (isset($message)): ?>
          <div class="message <?php echo ($errorCount > 0) ? 'error' : 'success'; ?>">
            <?php echo $message; ?>
          </div>
        <?php endif; ?>

        <!-- Selector de tipo (sin cambios) -->
        <div class="type-selector">
          <button class="type-btn active" data-type="fondos">🎨 Fondos Animados</button>
          <button class="type-btn" data-type="sonidos">🎵 Sonidos Ambientales</button>
        </div>

        <!-- Formulario Fondos → ahora guarda en BLOB por defecto -->
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
            <label for="archivos-fondos">Seleccionar fondos animados:</label>
            <input type="file" name="archivos[]" id="archivos-fondos" multiple
                   accept=".gif,.webp,.apng,.mp4" required class="form-file">
            <small>Formatos: GIF, WebP, APNG, MP4 (max 50MB cada uno)</small>
          </div>
          <div id="file-preview-fondos" class="file-preview"></div>
          <button type="submit" class="action-btn primary-btn">Subir Fondos</button>
        </form>

        <!-- Formulario Sonidos → ahora guarda en BLOB por defecto -->
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
            <label for="archivos-sonidos">Seleccionar sonidos ambientales:</label>
            <input type="file" name="archivos[]" id="archivos-sonidos" multiple
                   accept=".mp3,.wav,.ogg,.m4a,.mp4" required class="form-file">
            <small>Formatos: MP3, WAV, OGG, M4A (max 20MB cada uno)</small>
          </div>
          <div id="file-preview-sonidos" class="file-preview"></div>
          <button type="submit" class="action-btn primary-btn">Subir Sonidos</button>
        </form>

        <!-- Contenido existente (sin cambios visuales) -->
        <div class="content-sections">
          <div class="content-section active" id="section-fondos">
            <h2>Fondos Existentes</h2>
            <div id="fondos-list" class="fondos-grid"></div>
          </div>
          <div class="content-section" id="section-sonidos">
            <h2>Sonidos Existentes</h2>
            <div id="sonidos-list" class="sonidos-grid"></div>
          </div>
        </div>
      </main>
    </div>
  </div>

  <script>
    // ---- UI (sin cambios relevantes; solo aseguramos previews) ----
    document.addEventListener('DOMContentLoaded', function() {
      const typeButtons     = document.querySelectorAll('.type-btn');
      const forms           = document.querySelectorAll('.upload-form');
      const contentSections = document.querySelectorAll('.content-section');

      typeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const type = this.dataset.type;
          typeButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          forms.forEach(form => {
            form.classList.remove('active');
            if (form.id === `form-${type}`) form.classList.add('active');
          });

          contentSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `section-${type}`) section.classList.add('active');
          });
        });
      });

      setupFilePreview('archivos-fondos',  'file-preview-fondos');
      setupFilePreview('archivos-sonidos','file-preview-sonidos');
    });

    function setupFilePreview(inputId, previewId) {
      const fileInput   = document.getElementById(inputId);
      const filePreview = document.getElementById(previewId);
      fileInput.addEventListener('change', function(e) {
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
            <div><strong>${file.name}</strong></div>
            <div>${(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <div>${file.type}</div>
          `;
          previewItem.appendChild(info);
          filePreview.appendChild(previewItem);
        });
      });
    }

    // ---- Tema (nuevo código) ----
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', newTheme);
    });
  </script>
</body>
</html>
