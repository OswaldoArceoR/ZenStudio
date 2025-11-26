    let userSounds = JSON.parse(localStorage.getItem(LS.USER_SOUNDS) || '[]');
    let soundsData = []; // Se llenará dinámicamente con globales + usuario


    const soundListContainer = $('#sound-list-container');
    const uploadSoundBtn = $('#upload-sound-btn');
    const soundFileInput = $('#sound-file-input');
    const userSoundsSection = document.getElementById('user-sounds-section');
    const toggleUserSoundsBtn = document.getElementById('toggle-user-sounds-btn');
    const refreshUserSoundsBtn = document.getElementById('refresh-user-sounds-btn');
    const userSoundList = document.getElementById('user-sound-list');

    // --- Cargar sonidos globales desde la base de datos al iniciar ---
    document.addEventListener('DOMContentLoaded', function() {
        loadGlobalSoundsBlobs();
        // Silencio inmediato y refuerzo posterior (sin espera audible)
        forceMuteAllAudios();
        setTimeout(forceMuteAllAudios, 600);
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
            audio.loop = false;
            const soundItemUI = soundListContainer.querySelector(`[data-sound-id="${id}"]`);
            const slider = soundItemUI?.querySelector('.volume-slider');
            audio.volume = slider ? parseFloat(slider.value) : 0.5;
            audio.muted = true;
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
        selectedServerUserSoundId = null;
        const deleteBtn = document.getElementById('delete-user-sound-btn');
        if (deleteBtn) deleteBtn.disabled = true;
        serverUserSounds.forEach(s => {
            const el = createSoundItem(s);
            // Selección para eliminación (solo sonidos servidor usuario prefijo srv_user_)
            el.addEventListener('click', (e) => {
                // Evitar que botones internos (play) cambien selección accidentalmente
                if (e.target.closest('.sound-toggle-btn')) return;
                // Limpiar selección previa
                userSoundList.querySelectorAll('.selected-sound').forEach(n => n.classList.remove('selected-sound'));
                el.classList.add('selected-sound');
                // Guardar ID numérico (remover prefijo)
                selectedServerUserSoundId = s.id.replace('srv_user_', '');
                if (deleteBtn) deleteBtn.disabled = false;
            });
            userSoundList.appendChild(el);
        });
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
            const serverUserSounds = data.sonidos.map(s => ({
                id: 'srv_user_' + s.id,
                name: s.nombre,
                file: s.url,
                mime: s.mime || 'audio/mpeg'
            }));
            soundsData = [...soundsData, ...serverUserSounds];
            renderUserServerSounds(serverUserSounds);
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

    refreshUserSoundsBtn?.addEventListener('click', () => loadServerUserSounds());

    // --- Eliminación de sonido de servidor ---
    let selectedServerUserSoundId = null; // ID numérico de la fila seleccionada
    const deleteServerSoundBtn = document.getElementById('delete-user-sound-btn');

    async function deleteSelectedServerUserSound() {
        if (!selectedServerUserSoundId) return;
        if (!confirm('¿Eliminar el sonido seleccionado del servidor?')) return;
        try {
            const resp = await fetch('eliminarSonidoUsuario.php?id=' + encodeURIComponent(selectedServerUserSoundId), { method: 'GET' });
            const data = await resp.json().catch(() => ({ success:false, message:'Respuesta no válida' }));
            if (!data.success) {
                if (typeof showToast === 'function') showToast('No se pudo eliminar: ' + (data.message || 'Error')); else alert('Error al eliminar: ' + (data.message || ''));
                return;
            }
            if (typeof showToast === 'function') showToast('Sonido eliminado');
            // Recargar lista
            loadServerUserSounds();
        } catch (err) {
            console.error('Error eliminando sonido usuario:', err);
            if (typeof showToast === 'function') showToast('Error eliminando sonido');
        } finally {
            selectedServerUserSoundId = null;
            if (deleteServerSoundBtn) deleteServerSoundBtn.disabled = true;
        }
    }

    deleteServerSoundBtn?.addEventListener('click', deleteSelectedServerUserSound);

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

        // Intento opcional de subida al servidor (no bloquea flujo local)
        try {
            const formData = new FormData();
            formData.append('sound', file);
            const resp = await fetch('subirSonidoUsuario.php', { method: 'POST', body: formData });
            if (resp.ok) {
                const result = await resp.json().catch(() => null);
                if (result && result.success) {
                    console.log('[UPLOAD] Sonido subido al servidor:', result);
                    if (typeof showToast === 'function') showToast('Sonido subido exitosamente.');
                } else {
                    console.log('[UPLOAD] Respuesta servidor no exitosa:', result);
                    if (typeof showToast === 'function') showToast('No se pudo guardar en servidor');
                }
            } else {
                console.warn('[UPLOAD] Falló la petición de subida (status)', resp.status);
                if (typeof showToast === 'function') showToast('Error al subir al servidor');
            }
        } catch (err) {
            console.warn('[UPLOAD] Error subiendo sonido al servidor (continuará modo local):', err);
            if (typeof showToast === 'function') showToast('Fallo subida servidor; se guardará local');
        }

        // Flujo local existente
        pendingSoundFile = file;
        openNameSoundModal();
    });

    function saveUserSound(soundName) {
        if (pendingSoundFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const newSound = {
                    id: `user_${Date.now()}`,
                    name: soundName.trim(),
                    file: event.target.result
                };
                userSounds.push(newSound);
                localStorage.setItem(LS.USER_SOUNDS, JSON.stringify(userSounds));
                renderSoundList();
                closeNameSoundModal();
                if (typeof showToast === 'function') showToast('Sonido subido exitosamente.');
            };
            reader.readAsDataURL(pendingSoundFile);
            soundFileInput.value = '';
        }
    }

    function deleteUserSound(soundId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este sonido?')) return;

        if (activeAudios[soundId] && !activeAudios[soundId].player.paused) {
            toggleSound(soundId);
        }
        delete activeAudios[soundId];

        userSounds = userSounds.filter(s => s.id !== soundId);
        localStorage.setItem(LS.USER_SOUNDS, JSON.stringify(userSounds));
        renderSoundList();
    }

    // --- Lógica del Modal para nombrar sonidos ---
    const nameSoundModal = $('#name-sound-modal');
    const newSoundNameInput = $('#new-sound-name-input');
    const saveSoundNameBtn = $('#save-sound-name-btn');
    const closeNameSoundModalBtn = nameSoundModal?.querySelector('.close-modal-btn[data-target="name-sound-modal"]');

    function openNameSoundModal() {
        newSoundNameInput.value = 'Mi Sonido Personalizado';
        nameSoundModal?.classList.add('active');
        nameSoundModal?.setAttribute('aria-hidden', 'false');
        newSoundNameInput.focus();
        newSoundNameInput.select();
    }

    function closeNameSoundModal() {
        nameSoundModal?.classList.remove('active');
        nameSoundModal?.setAttribute('aria-hidden', 'true');
        pendingSoundFile = null;
        newSoundNameInput.value = '';
    }

    saveSoundNameBtn?.addEventListener('click', () => {
        const soundName = newSoundNameInput.value.trim();
        if (soundName) {
            saveUserSound(soundName);
        } else {
            alert('Se requiere un nombre para el sonido.');
        }
    });

    newSoundNameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveSoundNameBtn.click();
        }
    });

    closeNameSoundModalBtn?.addEventListener('click', closeNameSoundModal);

    // small SVG helpers
    function playSVG() {
        return '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
    function pauseSVG() {
        return '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    }
