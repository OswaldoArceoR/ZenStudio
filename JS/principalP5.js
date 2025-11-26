    // ---------- Calendar ----------
    const calendarGrid = $('#calendar-grid');
    const monthYearDisplay = $('#calendar-month-year');
    const prevMonthBtn = $('#prev-month-btn');
    const nextMonthBtn = $('#next-month-btn');
    const scheduleModal = $('#schedule-modal');
    const modalDateDisplay = $('#modal-date-display');
    const eventListEl = $('#event-list');
    const newEventText = $('#new-event-text');
    const addEventModalBtn = $('#add-event-modal-btn');
    const closeModalBtn = $('.close-modal-btn');
    const addEventMainBtn = $('#add-event-btn');

    let calendarDate = new Date();
    let currentModalDateKey = '';

    // Save and load events
    function saveEvents() {
        localStorage.setItem(LS.EVENTS, JSON.stringify(eventsByDate));
    }

    function renderCalendar(date) {
        if (!calendarGrid) return;
        calendarGrid.innerHTML = '';

        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startWeekDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        daysOfWeek.forEach(d => {
            const el = document.createElement('div');
            el.className = 'day header';
            el.textContent = d;
            calendarGrid.appendChild(el);
        });

        for (let i = 0; i < startWeekDay; i++) {
            const blank = document.createElement('div');
            blank.className = 'day muted';
            blank.textContent = '';
            calendarGrid.appendChild(blank);
        }

        for (let d = 1; d <= totalDays; d++) {
            const el = document.createElement('div');
            el.className = 'day';
            el.textContent = String(d);

            const dtKey = `${year}-${(month+1).toString().padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            if (eventsByDate[dtKey] && eventsByDate[dtKey].length) {
                el.classList.add('event');
            }

            const today = new Date();
            if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d) {
                el.classList.add('current');
            }

            el.addEventListener('click', () => openScheduleModal(dtKey)); 
            calendarGrid.appendChild(el);
        }

        monthYearDisplay.textContent = `${date.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`;
    }

    function navigateMonth(delta) {
        calendarDate.setMonth(calendarDate.getMonth() + delta);
        renderCalendar(calendarDate);
    }

    function renderEvents(dateKey) {
        eventListEl.innerHTML = '';
        const events = eventsByDate[dateKey] || [];

        if (events.length === 0) {
            eventListEl.innerHTML = '<p style="text-align:center; color: var(--clr-text-muted);">No hay eventos programados para este día.</p>';
            return;
        }

        events.forEach((event, index) => {
            const item = document.createElement('div');
            item.className = 'event-item';
            item.innerHTML = `<span>${escapeHtml(event)}</span> <button class="delete-event-btn secondary-btn" data-index="${index}" aria-label="Eliminar evento" style="padding: 5px 8px; font-size: 0.8rem;"> Eliminar </button>`;
            eventListEl.appendChild(item);
        });

        $$('.delete-event-btn', eventListEl).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index, 10);
                eventsByDate[dateKey].splice(index, 1);
                if (eventsByDate[dateKey].length === 0) {
                    delete eventsByDate[dateKey];
                }
                saveEvents();
                renderEvents(dateKey);
                renderCalendar(calendarDate);
            });
        });
    }

    function openScheduleModal(dateKey) {
        currentModalDateKey = dateKey;
        const [year, month, day] = dateKey.split('-');
        const dateStr = new Date(year, month - 1, day).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        modalDateDisplay.textContent = dateStr;
        renderEvents(dateKey);
        scheduleModal.classList.add('active');
        scheduleModal.setAttribute('aria-hidden', 'false');
        newEventText.focus();
    }

    function closeScheduleModal() {
        scheduleModal.classList.remove('active');
        scheduleModal.setAttribute('aria-hidden', 'true');
        newEventText.value = '';
    }

    // --- MANEJADORES DE EVENTOS CALENDARIO ---
    prevMonthBtn?.addEventListener('click', () => navigateMonth(-1));
    nextMonthBtn?.addEventListener('click', () => navigateMonth(1));

    addEventMainBtn?.addEventListener('click', () => { 
        const today = new Date();
        const dtKey = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        openScheduleModal(dtKey);
    });

    addEventModalBtn?.addEventListener('click', () => {
        const text = newEventText.value.trim();
        if (text && currentModalDateKey) {
            if (!eventsByDate[currentModalDateKey]) {
                eventsByDate[currentModalDateKey] = [];
            }
            eventsByDate[currentModalDateKey].push(text);
            saveEvents();
            newEventText.value = '';
            renderEvents(currentModalDateKey);
            renderCalendar(calendarDate);
            newEventText.focus();
        }
    });

    closeModalBtn?.addEventListener('click', closeScheduleModal);

    newEventText?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addEventModalBtn.click();
    });

    // ---------- Utilities ----------
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        let html = String(str).trim();
        
        //  Escapar caracteres HTML para evitar XSS
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
            
        //  Proceso de Formato Ligeros
        // NOTA: El orden de reemplazo es importante. Primero las listas, luego negritas, finalmente saltos de línea.
        
        //  Reemplazar saltos de línea por un marcador temporal
        html = html.replace(/\n/g, '---EOL---');

        //  Manejo de Listas (- item o * item)
        // Buscamos líneas que empiezan con "---EOL---" seguido de cero o más espacios, y luego * o -
        html = html.replace(/(\s*---EOL---)(\s*)[*|-]\s*([^\-EOL]*)/g, '---EOL---<li>$3</li>');
        html = html.replace(/^(\s*)[*|-]\s*([^\-EOL]*)/g, '<li>$2</li>');
        
        let inList = false;
        const listRegex = /<li>.*?<\/li>/g;
        let finalHtml = '';
        let lastIndex = 0;
        let match;

        while ((match = listRegex.exec(html)) !== null) {
            const preListContent = html.substring(lastIndex, match.index);
            if (inList) {
                finalHtml += match[0];
            } else {
                finalHtml += preListContent.replace(/---EOL---/g, '<br>');
                finalHtml += '<ul>' + match[0];
                inList = true;
            }
            lastIndex = match.index + match[0].length;
        }

        const postListContent = html.substring(lastIndex);
        if (inList) {
            finalHtml += '</ul>';
        }
        finalHtml += postListContent.replace(/---EOL---/g, '<br>');

        //  Negritas: **texto** -> <strong>texto</strong>
        // Se aplica DESPUÉS del manejo de listas, ya que las listas no deberían afectar esto.
        html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</stro  ng>');
        
        //  Limpiar cualquier marcador EOL restante (Si una línea no fue lista, se mantiene el salto de línea)
        html = html.replace(/---EOL---/g, '<br>'); 
        
        return html;
    }

    // ---------- Init ----------
    document.addEventListener('DOMContentLoaded', () => {
                        // Solo marcar interacción si el usuario da clic en los botones de play/pause
                        window.__zenstudio_user_interacted = false;
                        function markUserInteraction() { window.__zenstudio_user_interacted = true; }
                        document.body.addEventListener('click', function(e) {
                            // Botón play/pause de sonidos ambientales
                            if (e.target.closest('.sound-toggle-btn')) {
                                markUserInteraction();
                            }
                            // Botón play/pause del reproductor local
                            if (e.target.closest('#local-player-play')) {
                                markUserInteraction();
                            }
                        }, true);
                    // Marcar que el usuario ha interactuado tras cualquier clic, teclado o touch
                    window.__zenstudio_user_interacted = false;
                    function markUserInteraction() { window.__zenstudio_user_interacted = true; }
                    window.addEventListener('click', markUserInteraction, { once: true, capture: true });
                    window.addEventListener('keydown', markUserInteraction, { once: true, capture: true });
                    window.addEventListener('touchstart', markUserInteraction, { once: true, capture: true });
                // Fuerza explícitamente el error de autoplay en todos los medios de ingreso
                function forceAutoplayBlock() {
                    setTimeout(() => {
                        document.querySelectorAll('audio').forEach(audio => {
                            try {
                                audio.muted = true;
                                audio.pause();
                                audio.currentTime = 0;
                                audio.play().catch(e => {
                                    console.log('[DEBUG] Autoplay block forced:', audio.src, e.name, e.message);
                                });
                            } catch(e){}
                        });
                        for (const id in activeAudios) {
                            if (activeAudios[id] && activeAudios[id].player) {
                                try {
                                    const player = activeAudios[id].player;
                                    player.muted = true;
                                    player.pause();
                                    player.currentTime = 0;
                                    player.play().catch(e => {
                                        console.log('[DEBUG] Autoplay block forced (activeAudios):', player.src, e.name, e.message);
                                    });
                                } catch(e){}
                            }
                        }
                    }, 200);
                }
                forceAutoplayBlock();
                window.addEventListener('pageshow', forceAutoplayBlock);
            // Refuerza: en cada ingreso nuevo, fuerza mute y pausa de todos los sonidos y elimina cualquier intento de restauración automática
            window.addEventListener('pageshow', function() {
                for (const id in activeAudios) {
                    if (activeAudios[id] && activeAudios[id].player) {
                        try {
                            activeAudios[id].player.pause();
                            activeAudios[id].player.currentTime = 0;
                            activeAudios[id].player.muted = true;
                            console.log('[DEBUG] pageshow: mute/pause', id, activeAudios[id].player.src, activeAudios[id].player.paused, activeAudios[id].player.muted);
                        } catch(e){}
                    }
                }
                activeAudios = {};
                document.querySelectorAll('audio').forEach(audio => {
                    try {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.muted = true;
                        console.log('[DEBUG] pageshow: mute/pause <audio>', audio.src, audio.paused, audio.muted);
                    } catch(e){}
                });
            });
        // Solución definitiva: fuerza mute y pausa de todos los sonidos antes de cualquier inicialización
        for (const id in activeAudios) {
            if (activeAudios[id] && activeAudios[id].player) {
                try {
                    activeAudios[id].player.pause();
                    activeAudios[id].player.currentTime = 0;
                    activeAudios[id].player.muted = true;
                    console.log('[DEBUG] DOMContentLoaded: mute/pause', id, activeAudios[id].player.src, activeAudios[id].player.paused, activeAudios[id].player.muted);
                } catch(e){}
            }
        }
        activeAudios = {};
        document.querySelectorAll('audio').forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = true;
                console.log('[DEBUG] DOMContentLoaded: mute/pause <audio>', audio.src, audio.paused, audio.muted);
            } catch(e){}
        });

        (function init() {
            // Solución definitiva: limpiar y pausar todos los audios antes de restaurar sonidos
            for (const id in activeAudios) {
                if (activeAudios[id] && activeAudios[id].player) {
                    try {
                        activeAudios[id].player.pause();
                        activeAudios[id].player.currentTime = 0;
                        activeAudios[id].player.muted = true;
                        console.log('[DEBUG] init(): mute/pause', id, activeAudios[id].player.src, activeAudios[id].player.paused, activeAudios[id].player.muted);
                    } catch(e){}
                }
            }
            activeAudios = {};
            document.querySelectorAll('audio').forEach(audio => {
                try {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = true;
                    console.log('[DEBUG] init(): mute/pause <audio>', audio.src, audio.paused, audio.muted);
                } catch(e){}
            });

            // Forzar silencio global al iniciar
            isMutedGlobally = true;
            if (soundIndicator) {
                soundIndicator.classList.add('muted');
                soundIndicator.setAttribute('aria-pressed', 'true');
            }
            $$('audio').forEach(audio => {
                audio.muted = true;
            });

            renderCalendar(calendarDate);
            renderSoundList();
            loadFondosGlobalBlobs(); // Solo cargar desde base de datos
            loadGlobalSoundsBlobs();
            renderTasks();

            // restore panel positions class/visibility from localStorage if any were active
            Object.keys(panelPositions).forEach(id => {
                const p = document.getElementById(id);
                if (p) {
                    const pos = panelPositions[id];
                    p.style.left = `${pos.x}px`;
                    p.style.top = `${pos.y}px`;
                }
                if (panelSizes[id]) {
                    const size = panelSizes[id];
                    p.style.width = `${size.w}px`;
                    p.style.height = `${size.h}px`;
                }
            });

        })();
        //  Restaurar Ventanas que dejaste abiertas
        restoreOpenPanels();    

        // No restaurar fondo desde localStorage; ahora proviene de la BD

        //  Restaurar la música (con un pequeño retraso para que no falle)
        setTimeout(() => {
            restoreActiveSounds(); 
        }, 500);

    });
       // --- [INICIO] BLOQUE DE MEMORIA (PEGAR AL FINAL) ---

    //  Guardar ventanas abiertas
    function saveOpenPanels() {
        const openIds = [];
        // Busca todos los paneles que tengan la clase 'active'
        document.querySelectorAll('.floating-panel.active').forEach(p => {
            // Guarda el nombre (ej: calendar) quitando el prefijo 'content-'
            openIds.push(p.id.replace('content-', ''));
        });
        localStorage.setItem('zen_open_panels', JSON.stringify(openIds));
    }

    //  Restaurar ventanas al entrar
    function restoreOpenPanels() {
        const openIds = JSON.parse(localStorage.getItem('zen_open_panels') || '[]');
        openIds.forEach(section => {
            const panel = document.getElementById('content-' + section);
            // Si existe y no está abierto, simular click en el botón sidebar para abrirlo correctamente
            if (panel && !panel.classList.contains('active')) {
                const btn = document.querySelector(`.sidebar-btn[data-section="${section}"]`);
                if(btn) btn.click(); 
            }
        });
    }

    //  Guardar sonidos activos
    function saveActiveSounds() {
        // activeAudios es tu variable original donde guardas los audios sonando
        if(typeof activeAudios !== 'undefined') {
            const activeIds = Object.keys(activeAudios);
            localStorage.setItem('zen_active_sounds', JSON.stringify(activeIds));
        }
    }

    //  Restaurar sonidos (deshabilitado: no restaurar sonidos activos automáticamente)
    function restoreActiveSounds() {} // NO restaurar sonidos automáticamente
    // --- [FIN] BLOQUE DE MEMORIA ---

    // --- Fondo de Usuario: Carga dinámica y subida al servidor ---
    const uploadBackgroundBtn = document.getElementById('upload-background-btn');
    const backgroundFileInput = document.getElementById('background-file-input');
    const deleteUserBackgroundBtn = document.getElementById('delete-user-background-btn');
    let currentUserBackgroundId = null; // ID del fondo de usuario actualmente aplicado

    if (uploadBackgroundBtn && backgroundFileInput) {
        uploadBackgroundBtn.addEventListener('click', () => backgroundFileInput.click());
        backgroundFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!['video/mp4', 'image/gif', 'image/png', 'image/jpeg'].includes(file.type)) {
                alert('Solo se permiten archivos MP4, GIF, PNG o JPG.');
                return;
            }
            const formData = new FormData();
            formData.append('background', file);
            fetch('subirFondoUsuario.php', { method: 'POST', body: formData })
                .then(async r => {
                    const raw = await r.text();
                    let data;
                    try { data = JSON.parse(raw); } catch (e) {
                        console.error('[UPLOAD][DEBUG] Fallo parse JSON. Raw respuesta:', raw);
                        alert('Respuesta no válida del servidor (ver consola).');
                        return;
                    }
                    if (data.success) {
                        console.log('[UPLOAD] Fondo usuario subido OK', data);
                        loadUserBackgrounds();
                        loadFondosGlobalBlobs();
                        showToast('Fondo subido exitosamente');
                    } else {
                        alert('Error al subir el fondo: ' + (data.message || 'Sin mensaje.'));
                        console.warn('[UPLOAD] Error data:', data);
                    }
                })
                .catch(err => {
                    console.error('[UPLOAD] Error de red/fetch:', err);
                    alert('Error de red al subir el fondo (ver consola).');
                });
        });
    }

    // Galería de fondos del usuario (simple listado por nombre)
    function cargarFondosUsuarioListado() {
        const userBackgroundGallery = document.getElementById('user-background-gallery');
        if (!userBackgroundGallery) return;
        fetch('obtenerFondosUsuario.php')
            .then(r => r.json())
            .then(data => {
                if (!data.success) {
                    console.warn('Error al cargar lista fondos usuario:', data.message);
                    return;
                }
                userBackgroundGallery.innerHTML = '';
                data.fondos.forEach(fondo => {
                    const fondoItem = document.createElement('div');
                    fondoItem.className = 'fondo-item';
                    fondoItem.textContent = fondo.nombre;
                    userBackgroundGallery.appendChild(fondoItem);
                });
            })
            .catch(err => console.error('Error listado fondos usuario:', err));
    }

    // Versión con miniaturas clicables para aplicar como fondo
    function loadUserBackgrounds() {
        const gallery = document.getElementById('user-background-gallery');
        if (!gallery) return;
        fetch('obtenerFondosUsuario.php')
            .then(resp => resp.ok ? resp.json() : Promise.reject('Respuesta HTTP inválida'))
            .then(data => {
                if (!data.success) {
                    console.warn('Error respuesta fondos usuario:', data.message);
                    return;
                }
                gallery.innerHTML = '';
                data.fondos.forEach(fondo => {
                    const nombre = fondo.nombre || 'Fondo';
                    const url = fondo.url || `verFondoUsuario.php?id=${fondo.id}`;
                    const mime = fondo.mime || 'image/gif';
                    const isVideo = mime.startsWith('video');

                    const item = document.createElement('div');
                    item.className = 'bg-item';
                    item.dataset.bgFile = url;
                    item.dataset.bgType = mime;
                    item.setAttribute('data-id', String(fondo.id));
                    item.dataset.userBgId = fondo.id;

                    if (isVideo) {
                        const video = document.createElement('video');
                        video.src = url;
                        video.muted = true;
                        video.loop = true;
                        video.autoplay = true;
                        video.playsInline = true;
                        item.appendChild(video);
                    } else {
                        const img = document.createElement('img');
                        img.src = url;
                        img.alt = nombre;
                        img.loading = 'lazy';
                        item.appendChild(img);
                    }

                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'background-name';
                    nameDiv.textContent = nombre.replace(/\.(mp4|gif|png|jpe?g)$/i,'');
                    item.appendChild(nameDiv);

                    // Click: aplicar fondo solo si NO estamos en modo eliminación múltiple
                    item.addEventListener('click', (e) => {
                        const galleryEl = document.getElementById('user-background-gallery');
                        const inBulkMode = galleryEl && galleryEl.classList.contains('bulk-delete-mode');
                        if (inBulkMode) {
                            // En modo bulk: seleccionar/deseleccionar sin aplicar fondo
                            e.preventDefault();
                            e.stopPropagation();
                            item.classList.toggle('selected');
                            return;
                        }
                        applyBackground(item.dataset.bgFile, item.dataset.bgType);
                        localStorage.setItem('zen_active_background', JSON.stringify({ file: item.dataset.bgFile, type: item.dataset.bgType, userBgId: fondo.id, scope: 'user' }));
                        currentUserBackgroundId = fondo.id;
                        if (deleteUserBackgroundBtn) deleteUserBackgroundBtn.disabled = false;
                        showToast('Fondo aplicado');
                        // Guardar selección de fondo del usuario en servidor
                        if (fondo.id) {
                            const uid = parseInt(fondo.id, 10);
                            if (Number.isInteger(uid)) saveConfig({ fondo_usuario_id: uid, fondo_global_id: null });
                        }
                    });

                    gallery.appendChild(item);
                });
            })
            .catch(err => console.error('Error al cargar fondos usuario:', err));
    }

    // Lanzar carga inicial tras DOM listo si existe contenedor
    document.addEventListener('DOMContentLoaded', () => {
        cargarFondosUsuarioListado();
        loadUserBackgrounds();
    });

    // --- Eliminación múltiple (escuchar evento del panel y llamar al PHP) ---
    const userBackgroundGalleryEl = document.getElementById('user-background-gallery');
    if (userBackgroundGalleryEl) {
        userBackgroundGalleryEl.addEventListener('deleteUserBackgrounds', async (e) => {
            try {
                const ids = (e.detail && e.detail.ids) || [];
                if (!ids.length) return;
                const results = await Promise.all(ids.map(async (id) => {
                    try {
                        const resp = await fetch('eliminarFondoUsuario.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
                            body: new URLSearchParams({ id: String(id) })
                        });
                        const data = await resp.json().catch(() => ({ success:false }));
                        return { id, ok: !!data.success };
                    } catch { return { id, ok: false }; }
                }));

                const deletedIds = results.filter(r => r.ok).map(r => r.id);
                const failedCount = results.length - deletedIds.length;

                if (deletedIds.length) {
                    // Limpiar activo si coincide
                    const saved = localStorage.getItem('zen_active_background');
                    if (saved) {
                        try {
                            const parsed = JSON.parse(saved);
                            if (parsed.scope === 'user' && deletedIds.includes(String(parsed.userBgId))) {
                                localStorage.removeItem('zen_active_background');
                                const bgC = document.getElementById('background-container');
                                if (bgC) { bgC.style.backgroundImage='none'; bgC.innerHTML=''; }
                            }
                        } catch {}
                    }
                    // avisar a la UI para remover
                    const evt = new CustomEvent('userBackgroundsDeleted', { detail: { ids: deletedIds } });
                    userBackgroundGalleryEl.dispatchEvent(evt);
                }
                if (failedCount > 0) {
                    showToast(`No se pudieron eliminar ${failedCount} elemento(s)`);
                } else if (deletedIds.length) {
                    showToast('Fondos eliminados');
                }
            } catch {
                showToast('Error al eliminar fondos');
            }
        });
    }

    // Eliminar fondo de usuario seleccionado
    if (deleteUserBackgroundBtn) {
        deleteUserBackgroundBtn.addEventListener('click', async () => {
            if (!currentUserBackgroundId) return;
            if (!confirm('¿Eliminar el fondo de usuario seleccionado?')) return;
            try {
                const resp = await fetch('eliminarFondoUsuario.php', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: new URLSearchParams({ id: String(currentUserBackgroundId) })
                });
                const data = await resp.json().catch(() => ({ success:false, message:'Respuesta inválida'}));
                if (!data.success) {
                    showToast('No se pudo eliminar');
                    return;
                }
                // Si el fondo eliminado era el activo, limpiar
                const saved = localStorage.getItem('zen_active_background');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed.userBgId == currentUserBackgroundId) {
                            localStorage.removeItem('zen_active_background');
                            const bgC = document.getElementById('background-container');
                            if (bgC) { bgC.style.backgroundImage='none'; bgC.innerHTML=''; }
                        }
                    } catch(e){}
                }
                // Quitar elemento de la galería
                const gallery = document.getElementById('user-background-gallery');
                if (gallery) {
                    const el = gallery.querySelector(`[data-user-bg-id="${currentUserBackgroundId}"]`);
                    if (el) el.remove();
                }
                currentUserBackgroundId = null;
                deleteUserBackgroundBtn.disabled = true;
                showToast('Fondo eliminado');
                // Recargar lista para mantener consistencia
                loadUserBackgrounds();
            } catch (err) {
                console.error('Error eliminando fondo usuario:', err);
                showToast('Error al eliminar');
            }
        });
    }

    // Al aplicar un fondo global, desactivar botón de eliminar
    function markGlobalBackgroundSelection() {
        currentUserBackgroundId = null;
        if (deleteUserBackgroundBtn) deleteUserBackgroundBtn.disabled = true;
    }
    // Reasignar también en selección global
    const originalReassign = reassignBackgroundEvents;
    reassignBackgroundEvents = function() {
        originalReassign();
        const gallery = document.querySelector('#background-gallery');
        if (!gallery) return;
        gallery.addEventListener('click', markGlobalBackgroundSelection, true);
    };

    // Utilidad simple para avisos flotantes
    function showToast(msg, duration = 2500) {
        let container = document.getElementById('zen-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'zen-toast-container';
            Object.assign(container.style, {
                position: 'fixed', bottom: '1.25rem', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem', zIndex: '9999'
            });
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.textContent = msg;
        Object.assign(toast.style, {
            background: 'var(--clr-bg-panel, rgba(0,0,0,0.8))', color: 'var(--clr-text, #fff)', padding: '.6rem .9rem', borderRadius: '.6rem', boxShadow: '0 3px 10px rgba(0,0,0,.25)', fontSize: '.85rem', opacity: '0', transform: 'translateY(6px)', transition: 'opacity .25s, transform .25s'
        });
        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(6px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
