    // Uso exclusivo de BLOB en BD: se elimina almacenamiento local/base64
    let userSounds = [];
    let soundsData = []; // Se llenará dinámicamente con globales + usuario (servidor)


    const soundListContainer = $('#sound-list-container');
    const uploadSoundBtn = $('#upload-sound-btn');
    const soundFileInput = $('#sound-file-input');
    const userSoundsSection = document.getElementById('user-sounds-section');
    const toggleUserSoundsBtn = document.getElementById('toggle-user-sounds-btn');
    const refreshUserSoundsBtn = document.getElementById('refresh-user-sounds-btn');
    const userSoundList = document.getElementById('user-sound-list');
    // Dinámica: botón de eliminar sonidos subidos (aparece tras subir)
    let deleteUploadedSoundsBtn = null;
    let onUserSoundsDeleteClickBound = null;
    let onUserSoundsDeleteDelegated = null; // deprecated: no longer used
    let deleteHandlerBusy = false;
    let uploadedPreviewContainer = null;
    let recentlyUploadedSoundIds = [];
    let selectedForDeletionIds = new Set();
    let deleteMode = false;

    function updateUploadedPreview() {
        if (!uploadedPreviewContainer) return;
        if (selectedForDeletionIds.size === 0) {
            uploadedPreviewContainer.textContent = '';
            return;
        }
        uploadedPreviewContainer.textContent = 'Seleccionados: ' + Array.from(selectedForDeletionIds).join(', ');
    }

    function ensureDeleteUploadedButton() {
        // Reutiliza botón fijo si existe, o créalo al vuelo bajo la lista
        if (!deleteUploadedSoundsBtn) {
            deleteUploadedSoundsBtn = document.getElementById('delete-user-sound-btn');
        }
        if (!deleteUploadedSoundsBtn) {
            try {
                deleteUploadedSoundsBtn = document.createElement('button');
                deleteUploadedSoundsBtn.id = 'delete-user-sound-btn';
                deleteUploadedSoundsBtn.className = 'action-btn danger-btn';
                deleteUploadedSoundsBtn.textContent = 'Eliminar Sonido Usuario';
                if (userSoundList) {
                    userSoundList.insertAdjacentElement('afterend', deleteUploadedSoundsBtn);
                } else if (userSoundsSection) {
                    userSoundsSection.appendChild(deleteUploadedSoundsBtn);
                } else if (uploadSoundBtn) {
                    uploadSoundBtn.insertAdjacentElement('afterend', deleteUploadedSoundsBtn);
                } else {
                    document.body.appendChild(deleteUploadedSoundsBtn);
                }
            } catch(_) {}
        }
        if (!deleteUploadedSoundsBtn) return;

        // Crear contenedor de vista previa si no existe (debajo del botón)
        if (!uploadedPreviewContainer) {
            uploadedPreviewContainer = document.getElementById('uploaded-delete-preview');
        }
        if (!uploadedPreviewContainer) {
            uploadedPreviewContainer = document.createElement('div');
            uploadedPreviewContainer.id = 'uploaded-delete-preview';
            uploadedPreviewContainer.style.marginTop = '8px';
            uploadedPreviewContainer.style.fontSize = '.9rem';
            uploadedPreviewContainer.style.color = 'var(--clr-text-muted)';
            deleteUploadedSoundsBtn.insertAdjacentElement('afterend', uploadedPreviewContainer);
        }

        deleteUploadedSoundsBtn.setAttribute('aria-pressed', 'false');
        deleteUploadedSoundsBtn.title = 'Selecciona y confirma eliminación';
        deleteUploadedSoundsBtn.classList.add('danger-btn');
        deleteUploadedSoundsBtn.classList.remove('primary-btn');
        deleteUploadedSoundsBtn.type = 'button';
        deleteUploadedSoundsBtn.disabled = false;
        deleteUploadedSoundsBtn.textContent = 'Eliminar Sonido Usuario';
        // Colocar un salto visual por debajo de la lista
        try { deleteUploadedSoundsBtn.style.marginTop = '12px'; } catch(_) {}

        // Core handler (can be used by button or delegated)
        const coreDeleteHandler = async (ev) => {
            if (deleteHandlerBusy) return;
            deleteHandlerBusy = true;
            try {
                ev?.preventDefault?.();
                try { console.log('[Sonidos] Click en botón eliminar (estado inicial)', { pressed: deleteUploadedSoundsBtn.getAttribute('aria-pressed'), deleteMode, selected: Array.from(selectedForDeletionIds) }); } catch(_){ }
                // Usar únicamente deleteMode como fuente de verdad
                const inDeleteMode = !!deleteMode;
                if (!inDeleteMode) {
                    // Entrar en modo eliminación
                    deleteMode = true;
                    deleteUploadedSoundsBtn.setAttribute('aria-pressed', 'true');
                    deleteUploadedSoundsBtn.classList.remove('danger-btn');
                    deleteUploadedSoundsBtn.classList.add('primary-btn');
                    deleteUploadedSoundsBtn.textContent = 'Confirmar eliminación';
                    applyDeleteModeToUserSoundList();
                    try { console.log('[Sonidos] Activado modo eliminación'); } catch(_){ }
                } else {
                    // Segundo click: si no hay selección, cancelar modo eliminación
                    if (selectedForDeletionIds.size === 0) {
                        deleteMode = false;
                        deleteUploadedSoundsBtn.setAttribute('aria-pressed', 'false');
                        deleteUploadedSoundsBtn.classList.add('danger-btn');
                        deleteUploadedSoundsBtn.classList.remove('primary-btn');
                        deleteUploadedSoundsBtn.textContent = 'Eliminar Sonido Usuario';
                        applyDeleteModeToUserSoundList();
                        if (typeof showToast === 'function') showToast('Selección cancelada');
                        try { console.log('[Sonidos] Cancelado modo eliminación por no selección'); } catch(_){ }
                        return;
                    }
                    // Hay elementos seleccionados: confirmar y eliminar
                    const proceed = typeof confirm === 'function' ? confirm('¿Confirmar eliminación de los sonidos seleccionados?') : true;
                    if (!proceed) {
                        // Cancelar y salir de modo eliminación
                        deleteMode = false;
                        deleteUploadedSoundsBtn.setAttribute('aria-pressed', 'false');
                        deleteUploadedSoundsBtn.classList.add('danger-btn');
                        deleteUploadedSoundsBtn.classList.remove('primary-btn');
                        deleteUploadedSoundsBtn.textContent = 'Eliminar Sonido Usuario';
                        applyDeleteModeToUserSoundList();
                        try { console.log('[Sonidos] Eliminación cancelada por usuario'); } catch(_){ }
                        return;
                    }
                    const ids = Array.from(selectedForDeletionIds);
                    try { console.log('[Sonidos] Eliminando ids', ids); } catch(_){ }
                    try {
                        let ok = 0;
                        for (const id of ids) {
                            try {
                                const r = await fetch('eliminarSonidoUsuario.php', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                    body: new URLSearchParams({ id: String(id) })
                                });
                                const data = await r.json().catch(() => ({ success:false }));
                                if (data.success) {
                                    ok++;
                                    selectedForDeletionIds.delete(id);
                                    recentlyUploadedSoundIds = recentlyUploadedSoundIds.filter(x => x !== id);
                                }
                            } catch(_) { }
                        }
                        await loadServerUserSounds();
                        updateUploadedPreview();
                        if (typeof showToast === 'function') showToast(ok === ids.length ? 'Sonidos eliminados' : 'Eliminación parcial');
                    } catch(e) {
                        if (typeof showToast === 'function') showToast('Error al eliminar');
                    } finally {
                        // Salir de modo eliminación
                        deleteMode = false;
                        deleteUploadedSoundsBtn.setAttribute('aria-pressed', 'false');
                        deleteUploadedSoundsBtn.classList.add('danger-btn');
                        deleteUploadedSoundsBtn.classList.remove('primary-btn');
                        deleteUploadedSoundsBtn.textContent = 'Eliminar Sonido Usuario';
                        applyDeleteModeToUserSoundList();
                    }
                }
            } finally {
                deleteHandlerBusy = false;
            }
        };

        // Bind directly to the button
        if (onUserSoundsDeleteClickBound) {
            deleteUploadedSoundsBtn.removeEventListener('click', onUserSoundsDeleteClickBound);
        }
        onUserSoundsDeleteClickBound = coreDeleteHandler;
        deleteUploadedSoundsBtn.addEventListener('click', onUserSoundsDeleteClickBound);

        // Remove any old delegated listener if present (avoid double triggers)
        if (onUserSoundsDeleteDelegated) {
            document.removeEventListener('click', onUserSoundsDeleteDelegated, true);
            onUserSoundsDeleteDelegated = null;
        }
    }

    // Eliminar y recrear desde cero el botón e indicadores
    function recreateDeleteUserSoundButton() {
        try {
            document.querySelectorAll('#delete-user-sound-btn').forEach(n => n.remove());
            if (userSoundsSection) {
                userSoundsSection.querySelectorAll('button').forEach(b => {
                    const txt = (b.textContent || '').trim().toLowerCase();
                    if (txt.includes('eliminar sonido usuario')) b.remove();
                });
            }
            const prev = document.getElementById('uploaded-delete-preview');
            if (prev) prev.remove();
        } catch(_) {}

        deleteUploadedSoundsBtn = null;
        uploadedPreviewContainer = null;
        selectedForDeletionIds.clear();
        deleteMode = false;
        ensureDeleteUploadedButton();
        applyDeleteModeToUserSoundList();
    }

    // --- Cargar sonidos globales desde la base de datos al iniciar ---
    document.addEventListener('DOMContentLoaded', function() {
        loadGlobalSoundsBlobs();
        // Silencio inmediato y refuerzo posterior (sin espera audible)
        forceMuteAllAudios();
        setTimeout(forceMuteAllAudios, 600);
        // Eliminar/ocultar botón "Actualizar Lista" (por id y por texto como respaldo)
        try {
            if (refreshUserSoundsBtn) refreshUserSoundsBtn.remove();
            else if (userSoundsSection) {
                const btns = userSoundsSection.querySelectorAll('button');
                btns.forEach(b => {
                    if ((b.textContent || '').trim().toLowerCase().includes('actualizar lista')) {
                        b.remove();
                    }
                });
            }
        } catch(_) {}
        // Recrear botón fijo de eliminación multi-selección justo después de la lista
        recreateDeleteUserSoundButton();
    });

    // --- Utilidad central para pausar y mutear todo ---
    function forceMuteAllAudios() {
        try {
            const audios = document.querySelectorAll('audio');
            audios.forEach(a => {
                a.pause();
                a.currentTime = 0;
                a.muted = true;
            });
        } catch(e) {}
        for (const id in activeAudios) {
            const obj = activeAudios[id];
            if (obj && obj.player) {
                try {
                    obj.player.pause();
                    obj.player.currentTime = 0;
                    obj.player.muted = true;
                } catch(e) {}
            }
        }
    }

    // Asegurar silencio al ocultar la página (cambio de pestaña / navegación a otra vista)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            forceMuteAllAudios();
        }
    });

    // Silenciar justo antes de descargar la página (navegar a perfil, cerrar pestaña, etc.)
    window.addEventListener('beforeunload', () => {
        forceMuteAllAudios();
    });

    // pageshow: cuando se vuelve desde bfcache (historial atrás) o navegación con historial
    window.addEventListener('pageshow', (e) => {
        forceMuteAllAudios();
        activeAudios = {}; // limpiar referencias para evitar reactivación involuntaria
        resetAmbientUI();
    });

    function setGlobalMute(muted) {
        isMutedGlobally = muted;

        if (soundIndicator) {
            soundIndicator.classList.toggle('muted', isMutedGlobally);
            soundIndicator.setAttribute('aria-pressed', String(isMutedGlobally));
        }

        $$('audio').forEach(audio => {
            audio.muted = isMutedGlobally;
        });

        setAmbientSoundsMute(isMutedGlobally);

        if (window.youtubePlayer && typeof window.youtubePlayer.mute === 'function') {
            if (isMutedGlobally) {
                window.youtubePlayer.mute();
            } else {
                window.youtubePlayer.unMute();
            }
        }
    }

    function setAmbientSoundsMute(muted) {
        for (const soundId in activeAudios) {
            activeAudios[soundId].player.muted = muted;
        }
    }

    soundIndicator?.addEventListener('click', () => {
        setGlobalMute(!isMutedGlobally);
    });

    function toggleSound(id, name, file) {
        // Si ya existe, usar la misma instancia
        if (!activeAudios[id]) {
            if (activeAudios[id] && activeAudios[id].player) {
                try { activeAudios[id].player.pause(); } catch(e){}
                delete activeAudios[id];
            }
            const audio = new Audio(file);
            audio.loop = true;
            const soundItemUI = soundListContainer.querySelector(`[data-sound-id="${id}"]`);
            const slider = soundItemUI?.querySelector('.volume-slider');
            audio.volume = slider ? parseFloat(slider.value) : 0.5;
            audio.muted = true;
            // Fallback por si loop es ignorado por el navegador
            try {
                audio.addEventListener('ended', () => {
                    if (!audio.paused) return; // si ya fue pausado por UI, no relanzar
                    audio.currentTime = 0;
                    audio.play().catch(() => {});
                });
            } catch(_) {}
            activeAudios[id] = { player: audio, name, file };
        }

        const soundInfo = activeAudios[id];
        const player = soundInfo.player;

        if (!window.__zenstudio_user_interacted) {
            console.log(`[DEBUG] Ignorado play/pause de '${name}' porque el usuario no ha interactuado`);
            updateSoundItemUI(id);
            return;
        }

        if (player.paused) {
            player.loop = true;
            player.muted = false;
            console.log(`[DEBUG] Intentando reproducir '${name}'`);
            player.play().catch(e => {
                if (e.name === 'NotSupportedError') {
                    delete activeAudios[id];
                }
                console.error(`[DEBUG] Error al reproducir ${name}:`, e);
            });
            // Guardar selección de sonido (global o usuario del servidor)
            if (id.startsWith('global_')) {
                const sid = parseInt(id.replace('global_', ''), 10);
                if (Number.isInteger(sid)) saveConfig({ sonido_global_id: sid, sonido_usuario_id: null });
            } else if (id.startsWith('srv_user_')) {
                const sid = parseInt(id.replace('srv_user_', ''), 10);
                if (Number.isInteger(sid)) saveConfig({ sonido_usuario_id: sid, sonido_global_id: null });
            }
        } else {
            player.pause();
            player.loop = false;
            player.muted = true;
            console.log(`[DEBUG] Pausado y muteado '${name}'`);
        }

        updateSoundItemUI(id);
        saveActiveSounds();
    }

    function createSoundItem(sound) {
        const isPlaying = activeAudios[sound.id] && !activeAudios[sound.id].player.paused;
        const isUserSound = sound.id.startsWith('user_');
        const container = document.createElement('div');
        container.className = `sound-item ${isPlaying ? 'playing' : ''}`;

        const infoGroup = document.createElement('div');
        infoGroup.className = 'sound-info-group';

        const btn = document.createElement('button');
        btn.className = 'sound-toggle-btn';
        btn.innerHTML = isPlaying ? pauseSVG() : playSVG();
        btn.addEventListener('click', (e) => toggleSound(sound.id, sound.name, sound.file));
        infoGroup.appendChild(btn);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = sound.name;
        infoGroup.appendChild(nameSpan);

        if (isUserSound) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-sound-btn';
            deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            deleteBtn.title = 'Eliminar sonido';
            deleteBtn.addEventListener('click', () => deleteUserSound(sound.id));
            infoGroup.appendChild(deleteBtn);
        }

        container.appendChild(infoGroup);

        const volGroup = document.createElement('div');
        volGroup.className = 'volume-control-group';
        volGroup.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
            <input type="range" min="0" max="1" step="0.01" class="volume-slider" value="0.5">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        `;
        const range = volGroup.querySelector('.volume-slider');
        range.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (activeAudios[sound.id] && activeAudios[sound.id].player) activeAudios[sound.id].player.volume = v;
        });
        container.appendChild(volGroup);
        // Ocultar el control de volumen hasta que el sonido esté realmente reproduciéndose
        volGroup.style.display = 'none';
        
        container.dataset.soundId = sound.id;

        return container;
    }

    function updateSoundItemUI(soundId) {
        // Buscar en ambas listas (global y usuario servidor)
        const container = document.querySelector(`[data-sound-id="${soundId}"]`);
        if (!container) return;

        const soundInfo = activeAudios[soundId];
        const isPlaying = soundInfo && soundInfo.player && !soundInfo.player.paused;

        container.classList.toggle('playing', isPlaying);

        const btn = container.querySelector('.sound-toggle-btn');
        if (btn) {
            btn.innerHTML = isPlaying ? pauseSVG() : playSVG();
        }

        const volGroup = container.querySelector('.volume-control-group');
        if (volGroup) {
            volGroup.style.display = isPlaying ? 'flex' : 'none';
        }
    }

    function renderSoundList() {
        if (!soundListContainer) return;
        // Limpiar todos los audios activos antes de renderizar la lista
        for (const id in activeAudios) {
            if (activeAudios[id] && activeAudios[id].player) {
                try {
                    activeAudios[id].player.pause();
                    activeAudios[id].player.currentTime = 0;
                    activeAudios[id].player.muted = true;
                    console.log('[DEBUG] renderSoundList: mute/pause', id, activeAudios[id].player.src, activeAudios[id].player.paused, activeAudios[id].player.muted);
                } catch(e){}
            }
        }
        activeAudios = {};

        soundListContainer.innerHTML = '';
        // soundsData ya contiene globales + usuario
        soundsData.forEach(s => soundListContainer.appendChild(createSoundItem(s)));

        // Refuerza la pausa y mute de todos los sonidos cada vez que se renderiza la lista
        setTimeout(() => {
            for (const id in activeAudios) {
                if (activeAudios[id] && activeAudios[id].player) {
                    try {
                        activeAudios[id].player.pause();
                        activeAudios[id].player.currentTime = 0;
                        activeAudios[id].player.muted = true;
                        console.log('[DEBUG] renderSoundList (timeout): mute/pause', id, activeAudios[id].player.src, activeAudios[id].player.paused, activeAudios[id].player.muted);
                    } catch(e){}
                }
            }
            document.querySelectorAll('audio').forEach(audio => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = true;
                    console.log('[DEBUG] renderSoundList (timeout): mute/pause <audio>', audio.src, audio.paused, audio.muted);
                } catch(e){}
            });
            resetAmbientUI();
        }, 300);
    }

    // Renderizado separado para sonidos del servidor (sección usuario)
    function renderUserServerSounds(serverUserSounds) {
        if (!userSoundList) return;
        userSoundList.innerHTML = '';
        serverUserSounds.forEach(s => {
            const el = createSoundItem(s);
            userSoundList.appendChild(el);

            // Checkbox para selección múltiple y resaltar subidos recientemente
            const idNum = parseInt(s.id.replace('srv_user_', ''), 10);
            if (!Number.isNaN(idNum)) {
                let sel = el.querySelector('.uploaded-select-checkbox');
                if (!sel) {
                    sel = document.createElement('input');
                    sel.type = 'checkbox';
                    sel.className = 'uploaded-select-checkbox';
                    sel.style.marginRight = '8px';
                    el.querySelector('.sound-info-group')?.insertAdjacentElement('afterbegin', sel);
                    sel.addEventListener('change', (ev) => {
                        if (ev.target.checked) {
                            selectedForDeletionIds.add(idNum);
                        } else {
                            selectedForDeletionIds.delete(idNum);
                        }
                        updateUploadedPreview();
                    });
                }
                // Mostrar sólo en modo eliminación
                sel.style.display = deleteMode ? 'inline-block' : 'none';
                if (recentlyUploadedSoundIds.includes(idNum)) {
                    el.classList.add('recent-upload');
                }
            }
        });
    }

    function applyDeleteModeToUserSoundList() {
        if (!userSoundList) return;
        userSoundList.querySelectorAll('.uploaded-select-checkbox').forEach(cb => {
            cb.style.display = deleteMode ? 'inline-block' : 'none';
            if (!deleteMode) cb.checked = false;
        });
        if (!deleteMode) {
            selectedForDeletionIds.clear();
            updateUploadedPreview();
        }
    }

    async function loadServerUserSounds() {
        try {
            const resp = await fetch('obtenerSonidosUsuario.php');
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            if (!data.success) {
                console.warn('Error sonidos usuario:', data.message);
                if (typeof showToast === 'function') showToast('Error listando sonidos usuario');
                return;
            }
            // Eliminar anteriores srv_user_ de soundsData
            soundsData = soundsData.filter(s => !s.id.startsWith('srv_user_'));
            const serverUserSounds = (data.sonidos || []).map(s => ({
                id: 'srv_user_' + s.id,
                name: s.nombre,
                file: s.url,
                mime: s.mime || 'audio/mpeg'
            }));
            soundsData = [...soundsData, ...serverUserSounds];
            renderUserServerSounds(serverUserSounds);
            // Asegurar botón recreado y checkboxes en estado correcto
            recreateDeleteUserSoundButton();
            applyDeleteModeToUserSoundList();
            if (typeof showToast === 'function') showToast('Sonidos usuario cargados');
        } catch (err) {
            console.error('Fallo al cargar sonidos usuario:', err);
            if (typeof showToast === 'function') showToast('Fallo al cargar sonidos usuario');
        }
    }

    toggleUserSoundsBtn?.addEventListener('click', () => {
        if (!userSoundsSection) return;
        const visible = userSoundsSection.style.display !== 'none';
        userSoundsSection.style.display = visible ? 'none' : 'block';
        toggleUserSoundsBtn.textContent = visible ? 'Mostrar Sonidos del Usuario' : 'Ocultar Sonidos del Usuario';
        if (!visible) loadServerUserSounds();
    });

    // Botón "Actualizar Lista" eliminado del DOM

    // (Eliminado) Botón "Eliminar sonido usuario" y su lógica de selección/confirmación

    // Asegura que la UI de sonidos muestre todo como detenido/silencioso
    function resetAmbientUI() {
        if (!soundListContainer) return;
        soundListContainer.querySelectorAll('.sound-item').forEach(item => {
            item.classList.remove('playing');
            const btn = item.querySelector('.sound-toggle-btn');
            if (btn) btn.innerHTML = playSVG();
            const vol = item.querySelector('.volume-control-group');
            if (vol) vol.style.display = 'none';
        });
    }

    // --- Funcionalidad de subida y borrado de sonidos ---
    uploadSoundBtn?.addEventListener('click', () => {
        soundFileInput.click();
    });

    soundFileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            alert('Por favor, selecciona un archivo de audio válido.');
            return;
        }

        // Subida única al servidor (sin flujo local)
        try {
            const formData = new FormData();
            // Backend de sonidos espera el campo 'sound' en subirSonidoUsuario.php
            formData.append('sound', file);
            const resp = await fetch('subirSonidoUsuario.php', { method: 'POST', body: formData });
            if (resp.ok) {
                const result = await resp.json().catch(() => null);
                if (result && result.success) {
                    console.log('[UPLOAD] Sonido subido al servidor:', result);
                    if (typeof showToast === 'function') showToast('Sonido subido exitosamente.');
                    if (typeof result.id === 'number') {
                        recentlyUploadedSoundIds.push(result.id);
                    }
                    // Asegurar visibilidad y recargar sonidos del usuario
                    if (userSoundsSection) {
                        userSoundsSection.style.display = 'block';
                        if (toggleUserSoundsBtn) toggleUserSoundsBtn.textContent = 'Ocultar Sonidos del Usuario';
                    }
                    await loadServerUserSounds();
                    applyDeleteModeToUserSoundList();
                    // Notificar a reproductor de media para agregar pista al playlist local
                    try { document.dispatchEvent(new CustomEvent('userSoundUploaded', { detail: { id: result.id, name: result.name } })); } catch(e) {}
                } else {
                    console.log('[UPLOAD] Respuesta servidor no exitosa:', result);
                    if (typeof showToast === 'function') showToast('No se pudo guardar en servidor');
                }
            } else {
                console.warn('[UPLOAD] Falló la petición de subida (status)', resp.status);
                if (typeof showToast === 'function') showToast('Error al subir al servidor');
            }
        } catch (err) {
            console.warn('[UPLOAD] Error subiendo sonido al servidor:', err);
            if (typeof showToast === 'function') showToast('Error al subir sonido al servidor');
        }

        // Sin flujo local: no se intenta guardar en localStorage ni variables temporales.
    });

    // Eliminado almacenamiento local/base64
    function saveUserSound(soundName) { /* no-op */ }

    function deleteUserSound(soundId) { /* no-op: sólo servidor */ }

    // --- Lógica del Modal para nombrar sonidos ---
    // Modal eliminado (ya no se nombra sonido local)
    const nameSoundModal = null;
    const newSoundNameInput = null;
    const saveSoundNameBtn = null;
    const closeNameSoundModalBtn = null;

    function openNameSoundModal() { /* no-op */ }
    function closeNameSoundModal() { /* no-op */ }

    // Eliminados listeners del modal

    // small SVG helpers
    function playSVG() {
        return '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
    function pauseSVG() {
        return '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    }
