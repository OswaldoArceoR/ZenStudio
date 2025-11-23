// fondos.js - Gestión de fondos animados

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fondos');
    const filePreview = document.getElementById('file-preview');
    const fondosList = document.getElementById('fondos-list');

    // Preview de archivos seleccionados
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
                video.src = url;
                video.muted = true;
                video.autoplay = true;
                video.loop = true;
                previewItem.appendChild(video);
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

    // Cargar fondos existentes
    loadExistingFondos();

    function loadExistingFondos() {
        fetch('obtenerFondos.php')
            .then(response => response.json())
            .then(fondos => {
                fondosList.innerHTML = '';
                fondos.forEach(fondo => {
                    const fondoItem = createFondoItem(fondo);
                    fondosList.appendChild(fondoItem);
                });
            })
            .catch(error => {
                console.error('Error cargando fondos:', error);
                fondosList.innerHTML = '<p>Error al cargar los fondos</p>';
            });
    }

    
function createFondoItem(fondo) {
  const item = document.createElement('div');
  item.className = 'fondo-item';

  let mediaElement;
  if (fondo.tipo_archivo.startsWith('image/')) {
    mediaElement = document.createElement('img');
    mediaElement.src = fondo.ruta_archivo;         // ← ruta directa
  } else if (fondo.tipo_archivo.startsWith('video/')) {
    mediaElement = document.createElement('video');
    mediaElement.src = fondo.ruta_archivo;         // ← ruta directa
    mediaElement.muted = true;
    mediaElement.autoplay = true;
    mediaElement.loop = true;
    mediaElement.playsInline = true;
  }
  mediaElement.className = 'fondo-media';

  const info = document.createElement('div');
  info.className = 'fondo-info';
  info.innerHTML = `
    <div class="fondo-name">${fondo.nombre}</div>
    <div class="fondo-meta">${fondo.categoria}</div>
    <div class="fondo-meta">${(fondo.tamaño / 1024 / 1024).toFixed(2)} MB</div>
    <button class="delete-btn" onclick="deleteFondo(${fondo.id_fondo})">Eliminar</button>
  `;

  item.appendChild(mediaElement);
  item.appendChild(info);
  return item;
}


// Función global para eliminar fondos

function deleteFondo(fondoId) {
  if (confirm('¿Estás seguro de que quieres eliminar este fondo?')) {
    fetch('deleteContenido', { // o 'deleteContenido.php' según tu nombre real
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'fondo', id: fondoId })
    })
    .then(r => r.json())
    .then(result => {
      if (result.status === 'success') {
        location.reload();
      } else {
        alert('Error al eliminar el fondo: ' + result.msg);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Error al eliminar el fondo');
    });
  }
}

});