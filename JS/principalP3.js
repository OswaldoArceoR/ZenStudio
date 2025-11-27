    // ---------- Media Player (con Pestañas) ----------
    const mediaPanel = $('#content-media');
    const mediaTabs = $$('.media-tab-btn', mediaPanel);
    const mediaTabContents = $$('.media-tab-content', mediaPanel);

    const mediaTabsBar = mediaPanel?.querySelector('.media-tabs');
    mediaTabsBar?.addEventListener('click', (ev) => {
        const tab = ev.target.closest('.media-tab-btn');
        if (!tab || !mediaTabs.includes(tab)) return;
        const tabName = tab.dataset.tab;

        mediaTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        mediaTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `media-${tabName}-content`);
        });
    });

    // --- Pestaña 1: YouTube ---
    const youtubeUrlInput = $('#youtube-url-input');
    const loadYoutubeBtn = $('#load-youtube-btn');
    const youtubePlayerContainer = $('#youtube-player-container');

    function getYoutubeVideoId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function loadYoutubeVideo() {
        if (window.youtubePlayer) {
            window.youtubePlayer.destroy();
            window.youtubePlayer = null;
        }

        const videoId = getYoutubeVideoId(youtubeUrlInput.value);
        if (videoId) {
            youtubePlayerContainer.innerHTML = '<div id="youtube-player-div"></div>';

            window.youtubePlayer = new YT.Player('youtube-player-div', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: { 'autoplay': 1, 'rel': 0, 'playsinline': 1 },
                events: {
                    'onReady': (event) => {
                        if (isMutedGlobally) {
                            event.target.mute();
                        }
                    }
                }
            });
        } else {
            alert('La URL de YouTube no es válida.');
        }
    }
    loadYoutubeBtn?.addEventListener('click', loadYoutubeVideo);
    youtubeUrlInput?.addEventListener('keydown', (e) => e.key === 'Enter' && loadYoutubeVideo());

    // --- Pestaña 2: Archivos Locales ---
    const localPlayer = new Audio();
    let localPlaylistFiles = [];
    let currentTrackIndex = -1;
    let serverTrackIdsInPlaylist = new Set();
    // Modo eliminación múltiple (renombrado para evitar colisión global)
    let musicDeleteMode = false;
    let selectedServerMusicIds = new Set();
    let deleteBtnRef = null;
    let deletePreview = null;

    const playBtn = $('#local-player-play');
    const prevBtn = $('#local-player-prev');
    const nextBtn = $('#local-player-next');
    const volumeSlider = $('#local-player-volume-slider');
    const trackTitle = $('#local-player-track-title');
    const playlistEl = $('#local-playlist');
    const uploadBtn = $('#upload-local-music-btn');
    const fileInput = $('#local-music-input');
    // Helper: construir ruta relativa correcta a carpeta PHP desde la página actual
    function getPhpPath(scriptName) {
        const path = window.location.pathname || '';
        const inPhpDir = /\/php\//i.test(path);
        const clean = String(scriptName).replace(/^\/+/, '');
        return inPhpDir ? `../PHP/${clean}` : `PHP/${clean}`;
    }

    function playTrack(index) {
        if (index < 0 || index >= localPlaylistFiles.length) return;
        currentTrackIndex = index;
        const track = localPlaylistFiles[index];
        localPlayer.src = URL.createObjectURL(track);
        localPlayer.muted = isMutedGlobally;
        // Solo reproducir si hay interacción del usuario
        if (window.__zenstudio_user_interacted) {
            localPlayer.play();
        }
        trackTitle.textContent = track.name.replace(/\.[^/.]+$/, "");
        playBtn.innerHTML = pauseSVG();
        updatePlaylistUI();
    }

    function togglePlayPause() {
        if (localPlayer.src) {
            if (localPlayer.paused) {
                if (window.__zenstudio_user_interacted) {
                    localPlayer.play();
                }
                playBtn.innerHTML = pauseSVG();
            } else {
                localPlayer.pause();
                playBtn.innerHTML = playSVG();
            }
        } else if (localPlaylistFiles.length > 0) {
            playTrack(0);
        }
    }

    function updatePlaylistUI() {
        playlistEl.innerHTML = '';
        localPlaylistFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            // Contenido: checkbox (sólo en deleteMode) + texto
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';

            if (musicDeleteMode && file._serverId) {
                const cb = document.createElement('span');
                cb.className = 'srv-del-checkbox';
                cb.style.display = 'inline-flex';
                cb.style.width = '16px';
                cb.style.height = '16px';
                cb.style.border = '2px solid var(--clr-text-muted, #9aa3af)';
                cb.style.borderRadius = '4px';
                cb.style.alignItems = 'center';
                cb.style.justifyContent = 'center';
                cb.style.marginRight = '8px';
                cb.style.fontSize = '12px';
                cb.style.lineHeight = '1';
                cb.style.userSelect = 'none';
                const selected = selectedServerMusicIds.has(file._serverId);
                if (selected) {
                    cb.textContent = '✓';
                    cb.style.background = 'var(--clr-primary, #22c55e)';
                    cb.style.color = '#fff';
                    cb.style.borderColor = 'var(--clr-primary, #22c55e)';
                } else {
                    cb.textContent = '';
                    cb.style.background = 'transparent';
                    cb.style.color = 'transparent';
                }
                row.appendChild(cb);
                li.style.cursor = 'pointer';
            } else {
                li.style.cursor = '';
            }

            const label = document.createElement('span');
            label.textContent = baseName + (file._serverId ? '' : ' (local)');
            row.appendChild(label);
            li.appendChild(row);
            li.classList.toggle('playing', index === currentTrackIndex);
            // Click: en modo eliminación, seleccionar; de lo contrario, reproducir
            li.addEventListener('click', (ev) => {
                if (musicDeleteMode && file._serverId) {
                    ev.preventDefault();
                    const sid = file._serverId;
                    if (selectedServerMusicIds.has(sid)) {
                        selectedServerMusicIds.delete(sid);
                        // re-render para actualizar checkbox
                        updatePlaylistUI();
                    } else {
                        selectedServerMusicIds.add(sid);
                        updatePlaylistUI();
                    }
                    updateDeletePreview();
                    return;
                }
                playTrack(index);
            });
            if (file._serverId) li.dataset.serverId = String(file._serverId);
            playlistEl.appendChild(li);
        });
    }

    function updateDeletePreview() {
        if (!deletePreview) return;
        const count = selectedServerMusicIds.size;
        deletePreview.textContent = count > 0 ? `Seleccionados: ${count}` : '';
    }

    function updateDeleteControlsVisibility() {
        if (!deleteBtnRef) return;
        const hasServerMusic = serverTrackIdsInPlaylist.size > 0;
        deleteBtnRef.style.display = hasServerMusic ? '' : 'none';
        if (!hasServerMusic && musicDeleteMode) {
            // Salir de selección si ya no hay músicas
            musicDeleteMode = false;
            selectedServerMusicIds.clear();
            deleteBtnRef.setAttribute('aria-pressed', 'false');
            deleteBtnRef.classList.add('danger-btn');
            deleteBtnRef.classList.remove('primary-btn');
            deleteBtnRef.textContent = 'Eliminar música (selección)';
            updateDeletePreview();
            updatePlaylistUI();
        }
    }

    playBtn?.addEventListener('click', togglePlayPause);
    nextBtn?.addEventListener('click', () => playTrack((currentTrackIndex + 1) % localPlaylistFiles.length));
    prevBtn?.addEventListener('click', () => playTrack((currentTrackIndex - 1 + localPlaylistFiles.length) % localPlaylistFiles.length));
    volumeSlider?.addEventListener('input', (e) => localPlayer.volume = e.target.value);
    localPlayer.addEventListener('ended', () => nextBtn.click());

    uploadBtn?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        for (const f of files) {
            if (!f.type?.startsWith('audio/')) {
                if (typeof showToast === 'function') showToast('Archivo no es audio');
                continue;
            }
            try {
                const fd = new FormData();
                fd.append('music', f);
                // Ruta relativa robusta hacia carpeta PHP
                const resp = await fetch(getPhpPath('subirMusicaUsuario.php'), { method: 'POST', body: fd });
                const data = await resp.json().catch(() => null);
                if (!resp.ok || !data || !data.success) {
                    const msg = (data && data.message) ? String(data.message) : 'Error al subir música';
                    if (typeof showToast === 'function') showToast(msg);
                } else {
                    if (typeof showToast === 'function') showToast('Música subida');
                }
            } catch(err) {
                if (typeof showToast === 'function') showToast('Fallo de red al subir');
            }
        }
        await loadServerMusicToPlaylist();
        e.target.value = '';
    });

    // --- Integración Música Servidor (musica_usuario) ---
    async function loadServerMusicToPlaylist() {
        try {
            // Rutas consistentes: acceder a scripts dentro de carpeta PHP
            const resp = await fetch(getPhpPath('obtenerMusicaUsuario.php'));
            const data = await resp.json().catch(() => null);
            if (!data || !data.success || !Array.isArray(data.musica)) return;
            for (const m of data.musica) {
                if (serverTrackIdsInPlaylist.has(m.id)) continue;
                try {
                    // Asegurar que m.url apunta a la ruta dentro de PHP si viene relativa
                    let url = m.url;
                    if (typeof url === 'string' && !/^https?:\/\//i.test(url) && !/^PHP\//i.test(url)) {
                        url = getPhpPath(url.replace(/^\/?/, ''));
                    }
                    const br = await fetch(url); // m.url apunta a verMusicaUsuario.php?id=...
                    if (!br.ok) continue;
                    const blob = await br.blob();
                    const file = new File([blob], m.nombre, { type: m.mime || 'audio/mpeg' });
                    file._serverId = m.id;
                    file._serverUrl = url;
                    localPlaylistFiles.push(file);
                    serverTrackIdsInPlaylist.add(m.id);
                } catch(e) { /* silencioso */ }
            }
            updatePlaylistUI();
            ensureDeleteButton();
            updateDeleteControlsVisibility();
        } catch(e) { /* silencioso */ }
    }

    // Contenedor de la playlist (para otros botones auxiliares)
    const playlistContainer = playlistEl?.parentElement;

    // Cargar inicialmente al abrir panel (si existe)
    if (mediaPanel) {
        loadServerMusicToPlaylist();
    }

    // Actualizar playlist si se sube nuevo sonido (evento disparado en principalP2.js)
    document.addEventListener('userSoundUploaded', () => {
        loadServerMusicToPlaylist();
    });

    // Contenedor de la playlist (para otros botones auxiliares)

    function ensureDeleteButton() {
        if (!playlistContainer) return;
        if (document.getElementById('toggle-delete-server-music-btn')) return;
        deleteBtnRef = document.createElement('button');
        deleteBtnRef.id = 'toggle-delete-server-music-btn';
        deleteBtnRef.className = 'action-btn danger-btn';
        deleteBtnRef.textContent = 'Eliminar música (selección)';
        deleteBtnRef.style.marginTop = '8px';
        playlistContainer.appendChild(deleteBtnRef);

        deletePreview = document.createElement('div');
        deletePreview.id = 'server-music-delete-preview';
        deletePreview.style.marginTop = '6px';
        deletePreview.style.fontSize = '.9rem';
        deletePreview.style.color = 'var(--clr-text-muted)';
        playlistContainer.appendChild(deletePreview);

        deleteBtnRef.addEventListener('click', async () => {
            if (!musicDeleteMode) {
                // Entrar en modo selección
                musicDeleteMode = true;
                selectedServerMusicIds.clear();
                deleteBtnRef.setAttribute('aria-pressed', 'true');
                deleteBtnRef.classList.remove('danger-btn');
                deleteBtnRef.classList.add('primary-btn');
                deleteBtnRef.textContent = 'Confirmar eliminación';
                updateDeletePreview();
                updatePlaylistUI();
                return;
            }
            // Confirmar eliminación
            if (selectedServerMusicIds.size === 0) {
                // Si no hay selección, salir del modo selección
                musicDeleteMode = false;
                selectedServerMusicIds.clear();
                deleteBtnRef.setAttribute('aria-pressed', 'false');
                deleteBtnRef.classList.add('danger-btn');
                deleteBtnRef.classList.remove('primary-btn');
                deleteBtnRef.textContent = 'Eliminar música (selección)';
                updateDeletePreview();
                updatePlaylistUI();
                return;
            }
            try {
                const ids = Array.from(selectedServerMusicIds);
                const r = await fetch(getPhpPath('eliminarMusicaUsuario.php'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids })
                });
                const data = await r.json().catch(() => ({ success:false }));
                if (!data.success) {
                    if (typeof showToast === 'function') showToast('No se pudo eliminar en servidor');
                    return;
                }
                // Filtrar playlist y set de ids de servidor
                const delSet = new Set(ids);
                localPlaylistFiles = localPlaylistFiles.filter(f => !(f._serverId && delSet.has(f._serverId)));
                ids.forEach(id => serverTrackIdsInPlaylist.delete(id));
                currentTrackIndex = Math.min(currentTrackIndex, localPlaylistFiles.length - 1);
                if (typeof showToast === 'function') showToast('Música eliminada');
            } catch(err) {
                if (typeof showToast === 'function') showToast('Error eliminando');
            } finally {
                // Salir de modo selección
                musicDeleteMode = false;
                selectedServerMusicIds.clear();
                deleteBtnRef.setAttribute('aria-pressed', 'false');
                deleteBtnRef.classList.add('danger-btn');
                deleteBtnRef.classList.remove('primary-btn');
                deleteBtnRef.textContent = 'Eliminar música (selección)';
                updateDeletePreview();
                updatePlaylistUI();
                updateDeleteControlsVisibility();
            }
        });
        updateDeleteControlsVisibility();
    }

    // Intentar crear el botón al inicio por si el DOM ya está listo
    ensureDeleteButton();
