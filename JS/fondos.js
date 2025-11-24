// fondos.js - Gestión de fondos animados

document.addEventListener('DOMContentLoaded', function() {
    const fondosList = document.getElementById('fondos-list');

    // Cargar fondos existentes desde blobs
    loadExistingFondosBlobs();

    function loadExistingFondosBlobs() {
        fetch('obtenerFondosGlobalBlobs.php')
            .then(response => response.json())
            .then(fondos => {
                fondosList.innerHTML = '';
                fondos.forEach(fondo => {
                    const fondoItem = createFondoItemBlob(fondo);
                    fondosList.appendChild(fondoItem);
                });
            })
            .catch(error => {
                console.error('Error cargando fondos:', error);
                fondosList.innerHTML = '<p>Error al cargar los fondos</p>';
            });
    }

    function createFondoItemBlob(fondo) {
      const item = document.createElement('div');
      item.className = 'fondo-item';

      let mediaElement;
      if (fondo.mime && fondo.mime.startsWith('image/')) {
        mediaElement = document.createElement('img');
        mediaElement.src = fondo.url; // verBlobGlobal.php
        mediaElement.alt = fondo.nombre || '';
        mediaElement.className = 'fondo-media';
      } else if (fondo.mime && fondo.mime.startsWith('video/')) {
        mediaElement = document.createElement('video');
        mediaElement.src = fondo.url;
        mediaElement.muted = true;
        mediaElement.autoplay = true;
        mediaElement.loop = true;
        mediaElement.playsInline = true;
        mediaElement.className = 'fondo-media';
      }

      if (mediaElement) item.appendChild(mediaElement);

      const info = document.createElement('div');
      info.className = 'fondo-info';
      info.innerHTML = `
        <div class="fondo-name">${fondo.nombre}</div>
        <div class="fondo-meta">${fondo.categoria}</div>
        <div class="fondo-meta">${(fondo.size / 1024 / 1024).toFixed(2)} MB</div>
        <button class="delete-btn" onclick="deleteFondo(${fondo.id})">Eliminar</button>
      `;

      item.appendChild(info);
      return item;
    }

    // Función global para eliminar fondos
    window.deleteFondo = function(fondoId) {
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