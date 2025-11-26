// Función para establecer cookies 
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
/* app.js - ZenFocus: código JS optimizado y modular (PRO + micro-interacciones) */

    // ---------- Helpers ----------
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const qsExists = (sel) => !!document.querySelector(sel);

    // Persistir configuración del usuario en servidor
    async function saveConfig(partial) {
        try {
            const resp = await fetch('guardarConfiguracion.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partial || {})
            });
            // Opcional: log de respuesta
            const data = await resp.json().catch(() => null);
            if (!resp.ok || (data && data.status === 'error')) {
                console.warn('[CONFIG] No se pudo guardar configuración', data);
            }
        } catch (e) {
            console.warn('[CONFIG] Error de red al guardar configuración', e);
        }
    }

    // ---------- State & Cached DOM ----------
    const body = document.body;
    const mainContent = $('#main-content');
    const sidebarButtons = $$('.sidebar-btn');
    const floatingPanels = $$('.floating-panel');
    const closeButtons = $$('.close-panel');
    const soundIndicator = $('#sound-toggle');
    const zenstudioToggle = $('#zenstudio-dropdown-toggle');
    const zenstudioMenu = $('#zenstudio-menu');
    const avatarToggle = $('#avatar-toggle');
    const avatarMenu = $('#avatar-menu');

    // Persistent storage keys
    const LS = {
        THEME: 'zen_theme',
        TASKS: 'zen_tasks',
        NOTES: 'zen_notes',
        POS: 'zen_panel_positions', 
        PROFILE: 'zen_profile_data',
        SIZES: 'zen_panel_sizes',
        EVENTS: 'zen_events',
        USER_SOUNDS: 'zen_user_sounds',
        ACTIVE_BG: 'zen_active_background',
        WELCOME_CLOSED: 'zen_welcome_closed'
    };

    // In-memory state
    let activeAudios = {};
    let tasks = JSON.parse(localStorage.getItem(LS.TASKS) || 'null') || [{ text: "Crear estructura inicial del proyecto", completed: true }];
    let isMutedGlobally = true;
    let eventsByDate = JSON.parse(localStorage.getItem(LS.EVENTS) || '{}');
    let panelPositions = JSON.parse(localStorage.getItem(LS.POS) || '{}');
    let panelSizes = JSON.parse(localStorage.getItem(LS.SIZES) || '{}');
    let pendingSoundFile = null;
    // --- Solo reproducir sonidos tras click explícito en el botón play/pause de cada sonido ---
    window.__zenstudio_user_interacted = false;
    function setUserInteracted() {
        window.__zenstudio_user_interacted = true;
        document.removeEventListener('pointerdown', setUserInteracted, true);
        document.removeEventListener('keydown', setUserInteracted, true);
    }
    // Solo marcar interacción si el click es en un botón de play/pause de sonido
    document.addEventListener('click', function(e) {
        if (e.target.closest('.sound-toggle-btn')) {
            setUserInteracted();
        }
    }, true);

    // Setup theme from localStorage
    (() => {
        const saved = localStorage.getItem(LS.THEME) || 'light';
        body.setAttribute('data-theme', saved);
        const themeBtn = $('#theme-toggle');
        if (themeBtn) themeBtn.setAttribute('aria-pressed', saved === 'dark');
    })();

    // Cargar la API de IFrame de YouTube de forma asíncrona
    (() => {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
    })();

    // Cargar configuración desde servidor (sin depender de caché local)
    (async () => {
        try {
            const resp = await fetch('obtenerConfiguracion.php', { headers: { 'Accept': 'application/json' } });
            if (!resp.ok) return;
            const data = await resp.json();
            if (!data.success || !data.config) return;
            const bg = data.config.background;
            if (bg && bg.url && bg.mime) {
                applyBackground(bg.url, bg.mime);
                // No guardar en localStorage para evitar caché persistente
            }
            const snd = data.config.sound;
            if (snd && snd.url) {
                // No auto-reproducir; crear ítem activo opcional
                // Podríamos marcar en UI el sonido seleccionado si se desea
            }
        } catch (e) { /* silencioso */ }
    })();

    // Ocultar mensaje de bienvenida si ya fue cerrado
    const welcomeMessage = $('#welcome-message');
    if (sessionStorage.getItem(LS.WELCOME_CLOSED) === 'true') {
        if (welcomeMessage) welcomeMessage.style.display = 'none';
    }

    // ---------- UI: Panel show/hide ----------
    function showPanel(section) {
        const panel = $(`#content-${section}`);
        const btn = document.querySelector(`.sidebar-btn[data-section="${section}"]`);
        if (!panel || !btn) return;

        const willOpen = !panel.classList.contains('active');

        // Toggle
        panel.classList.toggle('active', willOpen);
        panel.setAttribute('aria-hidden', !willOpen);
        btn.classList.toggle('selected', willOpen);
        btn.setAttribute('aria-pressed', willOpen);

        // if opened: bring to front and save z
        if (willOpen) {
            let maxZ = 15;
            floatingPanels.forEach(p => {
                const z = parseInt(p.style.zIndex) || 15;
                if (z > maxZ) maxZ = z;
            });
            panel.style.zIndex = maxZ + 1;
        }
        saveOpenPanels(); 
    }

    // Sidebar click (delegated)
    document.querySelector('.sidebar').addEventListener('click', (e) => {
        const btn = e.target.closest('.sidebar-btn');
        if (!btn) return;

        const section = btn.dataset.section;
        if (!section) return;

        showPanel(section);
    });

    // Close buttons
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.dataset.target;
            if (!target) return;
            
            const panel = $(`#content-${target}`);
            if (!panel) return;
            panel.classList.remove('active');
            panel.setAttribute('aria-hidden', 'true');

            const sideBtn = document.querySelector(`.sidebar-btn[data-section="${target}"]`);
            if (sideBtn) {
                sideBtn.classList.remove('selected');
                sideBtn.setAttribute('aria-pressed', 'false');
            }
            saveOpenPanels();
        });
    });

    // Lógica para cerrar el mensaje de bienvenida
    const closeWelcomeBtn = $('#close-welcome-btn');
    closeWelcomeBtn?.addEventListener('click', () => {
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        sessionStorage.setItem(LS.WELCOME_CLOSED, 'true');
    });



    // ---------- Fondos Animados (Desde Base de Datos, solo background-gallery) ----------
    // (Eliminada segunda definición duplicada de loadFondosGlobalBlobs para evitar conflictos)

    // Asignar eventos para seleccionar fondo desde la galería principal
    function reassignBackgroundEvents() {
        const gallery = document.querySelector('#background-gallery');
        if (!gallery) return;
        gallery.addEventListener('click', (e) => {
            const item = e.target.closest('.background-item');
            if (!item) return;
            const bgFile = item.dataset.bgFile;
            const bgType = item.dataset.bgType || 'image/gif';
            console.log('[FONDO] Click fondo:', { bgFile, bgType, item });
            if (!bgFile) {
                alert('No se encontró la URL del fondo (bgFile)');
                return;
            }
            if (!bgType) {
                alert('No se encontró el tipo MIME del fondo (bgType)');
                return;
            }
            applyBackground(bgFile, bgType);
            localStorage.setItem('zen_active_background', JSON.stringify({ file: bgFile, type: bgType }));
            // Guardar selección de fondo global si hay id disponible
            const gid = item.dataset.bgGlobalId ? parseInt(item.dataset.bgGlobalId, 10) : null;
            if (gid && Number.isInteger(gid)) {
                saveConfig({ fondo_global_id: gid, fondo_usuario_id: null });
            }
        });
    }

    // Cargar fondos al iniciar
    document.addEventListener('DOMContentLoaded', function() {
        loadFondosGlobalBlobs();
        // Inicializar lógica de eliminación múltiple de fondos de usuario
        initUserBackgroundBulkDelete();
    });



function loadGlobalSoundsBlobs() {
    fetch('obtenerSonidosGlobalBlobs.php')
        .then(r => r.json())
        .then(sonidos => {
            // Mapear los sonidos globales a formato compatible con createSoundItem
            // id, name, file
            const globalSounds = Array.isArray(sonidos) ? sonidos.map(s => ({
                id: 'global_' + s.id,
                name: s.nombre,
                file: s.url
            })) : [];
            // Actualizar la lista de sonidos globales
            window.globalSoundsData = globalSounds;
            // Unir con sonidos de usuario
            soundsData = [...globalSounds, ...userSounds];
            renderSoundList();
        })
        .catch(err => console.error('Error BLOB sonidos globales:', err));
}

    function applyBackground(bgFile, bgType) {
        const bgContainer = document.querySelector('#background-container');
        if (!bgContainer) return;

        bgContainer.innerHTML = '';
        bgContainer.style.backgroundImage = 'none';

        if (typeof bgType !== 'string') {
            console.error('Tipo de fondo no definido:', bgType);
            bgContainer.innerHTML = '<div style="color:red;text-align:center;">Tipo de fondo no definido</div>';
            return;
        }

        // Permitir tipo personalizado 'user' proveniente de fondos de usuario
        if (bgType === 'user') {
            // Tratarlo como imagen genérica (gif) para compatibilidad
            bgType = 'image/gif';
        }

        if (bgType.startsWith('image/')) {
            // Imagen (incluye GIF, PNG, JPG, etc). Para GIF forzamos recarga para reiniciar animación.
            const isGif = bgType === 'image/gif' || /\.gif($|\?)/i.test(bgFile);
            const img = document.createElement('img');
            img.alt = 'Fondo';
            // Forzar reinicio animación GIF evitando caché
            img.src = isGif ? (bgFile + (bgFile.includes('?') ? '&' : '?') + 't=' + Date.now()) : bgFile;
            Object.assign(img.style, {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: '0',
                left: '0',
                zIndex: '-1',
                pointerEvents: 'none'
            });
            img.onerror = function() {
                bgContainer.innerHTML = '<div style="color:red;text-align:center;">No se pudo cargar la imagen del fondo.</div>';
                console.error('No se pudo cargar la imagen:', bgFile);
            };
            bgContainer.appendChild(img);
        } else if (bgType.startsWith('video/')) {
            // Video
            const video = document.createElement('video');
            video.src = bgFile;
            video.autoplay = true;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            Object.assign(video.style, {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: '0', left: '0', zIndex: '-1'
            });
            video.onerror = function() {
                bgContainer.innerHTML = '<div style="color:red;text-align:center;">No se pudo cargar el video del fondo.</div>';
                console.error('No se pudo cargar el video:', bgFile);
            };
            bgContainer.appendChild(video);
        } else {
            bgContainer.innerHTML = '<div style="color:red;text-align:center;">Tipo de fondo no soportado: ' + bgType + '</div>';
            console.warn('Tipo de fondo no soportado:', bgType, bgFile);
        }
    }


    const clearBackgroundBtn = $('#clear-background-btn');
    clearBackgroundBtn?.addEventListener('click', () => {
        const bgContainer = $('#background-container');
        if (bgContainer) {
            bgContainer.style.backgroundImage = 'none';
            bgContainer.innerHTML = '';
        }
        localStorage.removeItem(LS.ACTIVE_BG);
        // Limpiar configuración de fondo en servidor
        saveConfig({ fondo_global_id: null, fondo_usuario_id: null });
    });

    // ---------- Drag / Pointer events for panels ----------
    function makeDraggable(panel) {
        const handle = panel.querySelector('.panel-handle');
        if (!handle) return;

        // restore position if saved
        const id = panel.id;
        if (panelPositions[id]) {
            const pos = panelPositions[id];
            panel.style.left = `${pos.x}px`;
            panel.style.top = `${pos.y}px`;
        }
        // Restaurar tamaño si está guardado
        if (panelSizes[id]) {
            const size = panelSizes[id];
            panel.style.width = `${size.w}px`;
            panel.style.height = `${size.h}px`;
        }

        let dragging = false;
        let start = { x: 0, y: 0 };
        let origin = { x: 0, y: 0 };

        const onPointerDown = (ev) => {
            if (ev.target.closest('button')) return;

            dragging = true;
            panel.classList.add('dragging');
            panel.style.transition = 'none';

            start.x = ev.clientX;
            start.y = ev.clientY;

            const rect = panel.getBoundingClientRect();
            origin.x = rect.left;
            origin.y = rect.top;

            if (ev.pointerId) handle.setPointerCapture?.(ev.pointerId);

            let maxZ = 15;
            floatingPanels.forEach(p => {
                const z = parseInt(p.style.zIndex) || 15;
                if (z > maxZ) maxZ = z;
            });
            panel.style.zIndex = maxZ + 1;
        };

        const onPointerMove = (ev) => {
            if (!dragging) return;
            const dx = ev.clientX - start.x;
            const dy = ev.clientY - start.y;

            const parentRect = panel.parentElement.getBoundingClientRect();
            const newLeft = clamp(origin.x + dx - parentRect.left, 0, parentRect.width - panel.offsetWidth);
            const newTop = clamp(origin.y + dy - parentRect.top, 0, parentRect.height - panel.offsetHeight);

            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
        };

        const onPointerUp = (ev) => {
            if (!dragging) return;
            dragging = false;
            panel.classList.remove('dragging');
            panel.style.transition = '';

            const left = parseFloat(panel.style.left || 0);
            const top = parseFloat(panel.style.top || 0);
            panelPositions[panel.id] = { x: left, y: top };
            localStorage.setItem(LS.POS, JSON.stringify(panelPositions));

            if (ev.pointerId) handle.releasePointerCapture?.(ev.pointerId);
        };

        handle.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    floatingPanels.forEach(makeDraggable);

    // ---------- Resize panels ----------
    function makeResizable(panel) {
        if (panel.id !== 'content-notes') return;

        const handle = panel.querySelector('.resize-handle');
        if (!handle) return;

        let resizing = false;
        let start = { x: 0, y: 0 };
        let startSize = { w: 0, h: 0 };

        const onPointerDown = (ev) => {
            ev.stopPropagation();
            resizing = true;
            panel.classList.add('resizing');
            panel.style.transition = 'none';

            start.x = ev.clientX;
            start.y = ev.clientY;

            const rect = panel.getBoundingClientRect();
            startSize.w = rect.width;
            startSize.h = rect.height;

            if (ev.pointerId) handle.setPointerCapture?.(ev.pointerId);
        };

        const onPointerMove = (ev) => {
            if (!resizing) return;
            const dx = ev.clientX - start.x;
            const dy = ev.clientY - start.y;

            const MIN_WIDTH = 250;
            const MIN_HEIGHT = 150;
            const newWidth = clamp(startSize.w + dx, MIN_WIDTH, window.innerWidth - panel.offsetLeft);
            const newHeight = clamp(startSize.h + dy, MIN_HEIGHT, window.innerHeight - panel.offsetTop);

            panel.style.width = `${newWidth}px`;
            panel.style.height = `${newHeight}px`;
        };

        const onPointerUp = (ev) => {
            if (!resizing) return;
            resizing = false;
            panel.classList.remove('resizing');
            panel.style.transition = '';

            panelSizes[panel.id] = { w: panel.offsetWidth, h: panel.offsetHeight };
            localStorage.setItem(LS.SIZES, JSON.stringify(panelSizes));

            if (ev.pointerId) handle.releasePointerCapture?.(ev.pointerId);
        };

        handle.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    floatingPanels.forEach(makeResizable);

    // ---------- Theme toggle ----------
    const themeToggle = $('#theme-toggle');
    themeToggle?.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        document.documentElement.setAttribute('data-theme', next); // Aseguramos en HTML también
        
        // 2.(Guardar la Cookie)
        setCookie('zen_theme', next, 365);

        // La lógica de animación (rotación y cambio de icono) ahora es manejada por CSS.
        themeToggle.style.transition = 'none';
        setTimeout(() => themeToggle.style.transition = '', 50); 
    });

    // ---------- Dropdowns (avatar & zenstudio) ----------
    avatarToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarMenu.classList.toggle('open');
        avatarMenu.setAttribute('aria-hidden', String(!avatarMenu.classList.contains('open')));
        avatarToggle.setAttribute('aria-expanded', String(avatarMenu.classList.contains('open')));
        zenstudioMenu.classList.remove('open');
    });

    zenstudioToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        zenstudioMenu.classList.toggle('open');
        zenstudioMenu.setAttribute('aria-hidden', String(!zenstudioMenu.classList.contains('open')));
        const expanded = zenstudioToggle.getAttribute('aria-expanded') === 'true';
        zenstudioToggle.setAttribute('aria-expanded', String(!expanded));
        avatarMenu.classList.remove('open');
    });

    document.addEventListener('click', (e) => {
        if (!avatarMenu.contains(e.target) && !avatarToggle.contains(e.target)) {
            avatarMenu.classList.remove('open');
            avatarMenu.setAttribute('aria-hidden', 'true');
            avatarToggle.setAttribute('aria-expanded', 'false');
        }
        if (!zenstudioMenu.contains(e.target) && !zenstudioToggle.contains(e.target)) {
            zenstudioMenu.classList.remove('open');
            zenstudioMenu.setAttribute('aria-hidden', 'true');
            zenstudioToggle.setAttribute('aria-expanded', 'false');
        }
    });

    const logoutLink = document.querySelector('.logout');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                window.location.href = 'cerrarSesion.php';
            }
        });
    }

    // ---------- Fondos de Usuario: eliminación múltiple conectada a BD ----------
    function initUserBackgroundBulkDelete() {
        const userGallery = document.getElementById('user-background-gallery');
        const bulkToggle = document.getElementById('bulk-delete-toggle-btn');
        if (!userGallery || !bulkToggle) return;

        let bulkMode = false;

        function setBulkMode(enabled) {
            bulkMode = !!enabled;
            userGallery.classList.toggle('bulk-delete-mode', bulkMode);
            bulkToggle.classList.toggle('success-btn', bulkMode);
            bulkToggle.classList.toggle('danger-btn', !bulkMode);
            bulkToggle.textContent = bulkMode ? 'Confirmar Eliminación' : 'Eliminar Fondos';
            if (!bulkMode) {
                Array.from(userGallery.querySelectorAll('.bg-item.selected')).forEach(el => el.classList.remove('selected'));
            }
        }

        bulkToggle.addEventListener('click', () => {
            if (!bulkMode) {
                setBulkMode(true);
                return;
            }
            const selected = Array.from(userGallery.querySelectorAll('.bg-item.selected'));
            if (!selected.length) { setBulkMode(false); return; }
            const ids = selected.map(el => el.getAttribute('data-id')).filter(Boolean);
            deleteUserBackgrounds(ids).then(deletedIds => {
                const evt = new CustomEvent('userBackgroundsDeleted', { detail: { ids: deletedIds } });
                userGallery.dispatchEvent(evt);
                setBulkMode(false);
            });
        });

        userGallery.addEventListener('click', (e) => {
            const card = e.target.closest('.bg-item');
            if (!card || !bulkMode) return;
            // En modo bulk, solo seleccionar; evitar que otros listeners apliquen el fondo
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            card.classList.toggle('selected');
        });

        userGallery.addEventListener('userBackgroundsDeleted', (e) => {
            const ids = (e.detail && e.detail.ids) || [];
            ids.forEach(id => {
                const el = userGallery.querySelector(`.bg-item[data-id="${id}"]`);
                if (el) {
                    el.classList.add('deleted');
                    setTimeout(() => el.remove(), 250);
                }
            });
        });
    }

    async function deleteUserBackgrounds(ids) {
        const deleted = [];
        for (const id of ids) {
            try {
                const form = new FormData();
                form.append('id', id);
                const resp = await fetch('eliminarFondoUsuario.php', { method: 'POST', body: form });
                const data = await resp.json().catch(() => ({ success: false }));
                if (resp.ok && data && data.success) {
                    deleted.push(id);
                    // Si el fondo activo era éste, limpiar configuración
                    const active = JSON.parse(localStorage.getItem('zen_active_background') || 'null');
                    const el = document.querySelector(`#user-background-gallery .bg-item[data-id="${id}"]`);
                    const isActiveUserBg = el && el.classList.contains('active-user-bg');
                    if (isActiveUserBg) {
                        localStorage.removeItem('zen_active_background');
                        saveConfig({ fondo_usuario_id: null });
                        const bgContainer = document.querySelector('#background-container');
                        if (bgContainer) { bgContainer.style.backgroundImage = 'none'; bgContainer.innerHTML = ''; }
                    }
                } else {
                    console.warn('No se pudo eliminar fondo usuario id=', id, data);
                }
            } catch (e) {
                console.error('Error eliminando fondo usuario id=', id, e);
            }
        }
        return deleted;
    }

    // --- Credits Modal Logic ---
    const creditsModal = $('#credits-modal');
    const showCreditsBtn = $('#show-credits-btn');
    const closeCreditsBtn = creditsModal?.querySelector('.close-modal-btn');

    showCreditsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        creditsModal?.classList.add('active');
        creditsModal?.setAttribute('aria-hidden', 'false');
        zenstudioMenu.classList.remove('open');
        zenstudioToggle.setAttribute('aria-expanded', 'false');
    });

    closeCreditsBtn?.addEventListener('click', () => {
        creditsModal?.classList.remove('active');
        creditsModal?.setAttribute('aria-hidden', 'true');
    });

    // ---------- Timer ----------
    const timerDisplay = $('#timer-display');
    const minutesInput = $('#minutes-input');
    const startButton = $('#start-timer');
    const resetButton = $('#reset-timer');

    let countdownId = null;
    let timeRemaining = (parseInt(minutesInput?.value || '25', 10) || 25) * 60;
    let timerRunning = false;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };

    const updateTimerDisplay = () => {
        timerDisplay.textContent = formatTime(timeRemaining);
    };

    function stopTimerUI() {
        if (countdownId) {
            clearInterval(countdownId);
            countdownId = null;
        }
        timerRunning = false;
        startButton.setAttribute('aria-pressed', 'false');
        startButton.querySelector('.btn-text').textContent = 'Start';
    }

    function startTimer() {
        if (timerRunning) return;
        const minutes = parseInt(minutesInput.value, 10);
        if (isNaN(minutes) || minutes <= 0) {
            alert('Por favor, ingresa un número de minutos válido.');
            return;
        }
        timeRemaining = minutes * 60;
        updateTimerDisplay();

        timerRunning = true;
        startButton.setAttribute('aria-pressed', 'true');
        startButton.querySelector('.btn-text').textContent = 'Pause';

        countdownId = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();

            if (timeRemaining <= 0) {
                stopTimerUI();
                timerDisplay.textContent = '¡Hecho!';
                try { window.navigator.vibrate?.(200); } catch (e) {}
                alert('¡Tiempo de enfoque terminado!');
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!timerRunning) return;
        if (countdownId) clearInterval(countdownId);
        timerRunning = false;
        startButton.setAttribute('aria-pressed', 'false');
        startButton.querySelector('.btn-text').textContent = 'Start';
    }

    function resetTimer() {
        if (countdownId) clearInterval(countdownId);
        timerRunning = false;
        const minutes = parseInt(minutesInput.value, 10) || 25;
        timeRemaining = minutes * 60;
        updateTimerDisplay();
        startButton.querySelector('.btn-text').textContent = 'Start';
        startButton.setAttribute('aria-pressed', 'false');
    }

    startButton?.addEventListener('click', () => {
        if (timerRunning) pauseTimer();
        else startTimer();
    });
    resetButton?.addEventListener('click', resetTimer);
    minutesInput?.addEventListener('change', resetTimer);

    updateTimerDisplay();

    // ---------- Sounds (ambient) ----------

    // Los sonidos globales ahora se cargan solo desde la base de datos (no desde SONIDOS/ locales)
    const defaultSounds = [];

    
    

    
function loadFondosGlobalBlobs() {
  fetch('obtenerFondosGlobalBlobs.php')
    .then(r => r.json())
    .then(fondos => {
      const gallery = document.querySelector('#background-gallery');
      if (!gallery) return;

            gallery.innerHTML = '';
            if (!Array.isArray(fondos) || fondos.length === 0) {
                gallery.innerHTML = '<div style="color:red;text-align:center;padding:1em;">No hay fondos globales disponibles en la base de datos.</div>';
                console.warn('Fondos globales vacíos:', fondos);
                return;
            }

            fondos.forEach(f => {
                const item = document.createElement('div');
                item.className = 'background-item';
                // fallback MIME si no existe
                const mime = f.mime || 'image/gif';
                item.dataset.bgFile = f.url;
                item.dataset.bgType = mime;
                if (typeof f.id !== 'undefined') item.dataset.bgGlobalId = String(f.id);

                // Crear elemento multimedia según MIME
                if (mime.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = f.url;
                    img.alt = f.nombre || '';
                    img.loading = 'lazy';
                    item.appendChild(img);
                } else if (mime.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = f.url;
                    video.muted = true;
                    video.loop = true;
                    video.autoplay = true;
                    video.playsInline = true;
                    item.appendChild(video);
                } else {
                    item.innerHTML = '<div style="color:gray;">Tipo no soportado: ' + mime + '</div>';
                }

                const nameDiv = document.createElement('div');
                nameDiv.className = 'background-name';
                nameDiv.textContent = f.nombre || '';
                item.appendChild(nameDiv);

                gallery.appendChild(item);
            });

            // Reasignar eventos para permitir aplicar el fondo seleccionado
            reassignBackgroundEvents();
    })
        .catch(err => {
            const gallery = document.querySelector('#background-gallery');
            if (gallery) {
                gallery.innerHTML = '<div style="color:red;text-align:center;padding:1em;">Error al cargar los fondos globales.</div>';
            }
            console.error('Error BLOB fondos globales:', err);
        });
    }
