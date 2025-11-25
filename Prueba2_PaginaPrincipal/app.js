/* app.js - ZenFocus: código JS optimizado y modular (PRO + micro-interacciones) */
(() => {
    'use strict';

    // ---------- Helpers ----------
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const qsExists = (sel) => !!document.querySelector(sel);

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
    const menuAvatarImg = $('#menu-avatar-img');
    const menuAccountName = $('#menu-account-name');
    const menuUserEmail = $('#menu-user-email');
    const DEFAULT_AVATAR = 'https://via.placeholder.com/100';

    // Persistent storage keys
    const LS = {
        THEME: 'zen_theme',
        TASKS: 'zen_tasks',
        NOTES: 'zen_notes',
        POS: 'zen_panel_positions', 
        PROFILE: 'zen_profile_data',
        SIZES: 'zen_panel_sizes', // Nueva clave para tamaños
        EVENTS: 'zen_events',
        USER_SOUNDS: 'zen_user_sounds',
        ACTIVE_BG: 'zen_active_background',
        WELCOME_CLOSED: 'zen_welcome_closed',
        CUSTOM_BGS: 'zen_custom_backgrounds' // Clave para fondos personalizados
    };

    // In-memory state
    let activeAudios = {}; // {id: {player:Audio, name, file}}
    let tasks = JSON.parse(localStorage.getItem(LS.TASKS) || 'null') || [{ text: "Crear estructura inicial del proyecto", completed: true }];
    let isMutedGlobally = false;
    let eventsByDate = JSON.parse(localStorage.getItem(LS.EVENTS) || '{}');
    let panelPositions = JSON.parse(localStorage.getItem(LS.POS) || '{}');
    let panelSizes = JSON.parse(localStorage.getItem(LS.SIZES) || '{}');
    let pendingSoundFile = null; // Para guardar el archivo mientras se nombra

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

    // Cargar fondo guardado al inicio
    (() => {
        const savedBg = localStorage.getItem(LS.ACTIVE_BG);
        const bgContainer = $('#background-container');
        if (savedBg && bgContainer) {
            bgContainer.style.backgroundImage = `url(${savedBg})`;
        }
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
        });
    });

    // Lógica para cerrar el mensaje de bienvenida
    const closeWelcomeBtn = $('#close-welcome-btn');
    closeWelcomeBtn?.addEventListener('click', () => {
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        sessionStorage.setItem(LS.WELCOME_CLOSED, 'true');
    });

    // ---------- Fondos Animados (Espacios) ----------
    const defaultBackgrounds = [
        { id: 'hoguera', name: 'Hoguera Relajante', file: 'hogera.gif', isDefault: true },
        { id: 'anime', name: 'Paisaje Anime', file: 'anime.gif', isDefault: true }
    ];
    let customBackgrounds = JSON.parse(localStorage.getItem(LS.CUSTOM_BGS) || '[]');
    let allBackgrounds = [...defaultBackgrounds, ...customBackgrounds];

    // Botón para eliminar fondos personalizados
    const deleteCustomBgsBtn = $('#delete-custom-bgs-btn');

    const backgroundGallery = $('#background-gallery');
    const clearBackgroundBtn = $('#clear-background-btn');
    const uploadBackgroundBtn = $('#upload-background-btn');
    const backgroundUploadInput = $('#background-upload-input');

    function renderBackgrounds() {
        if (!backgroundGallery) return;
        backgroundGallery.innerHTML = '';
        allBackgrounds = [...defaultBackgrounds, ...customBackgrounds]; // Actualizar lista combinada

        allBackgrounds.forEach(bg => {
            const item = document.createElement('div');
            item.className = 'background-item'; 
            // Usamos el ID para identificar de forma única cada fondo
            item.dataset.bgId = bg.id; 

            // Si el fondo es personalizado, añadimos una clase para poder seleccionarlo
            if (bg.isCustom) {
                item.classList.add('custom-background');
            }

            item.innerHTML = `
                <img src="${bg.file}" alt="${bg.name}" loading="lazy">
                <div class="background-name">${bg.name}</div>
                <div class="selection-overlay">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            `;
            backgroundGallery.appendChild(item);
        });

        // Mostrar u ocultar el botón de "Eliminar Fondos" si hay fondos personalizados
        if (deleteCustomBgsBtn) {
            deleteCustomBgsBtn.style.display = customBackgrounds.length > 0 ? 'inline-flex' : 'none';
        }
    }

    backgroundGallery?.addEventListener('click', (e) => {
        const item = e.target.closest('.background-item');
        if (!item) return;

        // Si estamos en modo de eliminación, gestionamos la selección
        if (body.classList.contains('is-deleting-bgs')) {
            // Solo los fondos personalizados se pueden seleccionar
            if (item.classList.contains('custom-background')) {
                item.classList.toggle('selected-for-deletion');
            }
            return; // Evitamos que se aplique el fondo
        }

        const bgId = item.dataset.bgId;
        const selectedBg = allBackgrounds.find(bg => bg.id === bgId);
        if (!selectedBg) return;

        // Aplicamos el fondo al contenedor dedicado para no interferir con otros estilos del body
        const bgContainer = $('#background-container');
        if (bgContainer) bgContainer.style.backgroundImage = `url(${selectedBg.file})`;
        document.body.style.backgroundImage = 'none'; // Aseguramos que el body no tenga fondo
        
        localStorage.setItem(LS.ACTIVE_BG, selectedBg.file);

        // Opcional: cerrar el panel después de seleccionar
        const panel = $('#content-spaces');
        const btn = $('.sidebar-btn[data-section="spaces"]');
        panel?.classList.remove('active');
        panel?.setAttribute('aria-hidden', 'true');
        btn?.classList.remove('selected');
    });

    clearBackgroundBtn?.addEventListener('click', () => {
        const bgContainer = $('#background-container');
        if (bgContainer) bgContainer.style.backgroundImage = 'none';
        document.body.style.backgroundImage = 'none'; // Limpiamos también el body por si acaso
        localStorage.removeItem(LS.ACTIVE_BG);
    });

    // --- Lógica para subir fondos personalizados ---
    uploadBackgroundBtn?.addEventListener('click', () => {
        backgroundUploadInput.click();
    });

    backgroundUploadInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];

        if (file && file.type === 'image/gif') {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const newBackground = {
                    id: `custom-${Date.now()}`,
                    name: file.name.replace(/\.gif$/i, ''), // Elimina la extensión .gif del nombre
                    file: reader.result, // La URL de datos del GIF (base64)
                    isCustom: true
                };

                customBackgrounds.push(newBackground);
                localStorage.setItem(LS.CUSTOM_BGS, JSON.stringify(customBackgrounds));
                renderBackgrounds(); // Volver a renderizar la galería con el nuevo fondo
            };
        } else if (file) {
            alert('Por favor, selecciona un archivo en formato .gif.');
        }
        event.target.value = ''; // Limpiar el input para permitir subir el mismo archivo de nuevo
    });

    // --- Lógica para el modo de eliminación de fondos ---
    deleteCustomBgsBtn?.addEventListener('click', () => {
        const isInDeleteMode = body.classList.toggle('is-deleting-bgs');

        if (isInDeleteMode) {
            // Entramos en modo de eliminación
            deleteCustomBgsBtn.textContent = 'Confirmar Eliminación';
            deleteCustomBgsBtn.classList.add('confirm-delete');
            // Desactivamos otros botones para evitar acciones conflictivas
            uploadBackgroundBtn.disabled = true;
            clearBackgroundBtn.disabled = true;
        } else {
            // Salimos del modo de eliminación y borramos los seleccionados
            const itemsToDelete = $$('.background-item.selected-for-deletion', backgroundGallery);
            const idsToDelete = itemsToDelete.map(item => item.dataset.bgId);

            if (idsToDelete.length > 0) {
                if (confirm(`¿Estás seguro de que quieres eliminar ${idsToDelete.length} fondo(s)?`)) {
                    customBackgrounds = customBackgrounds.filter(bg => !idsToDelete.includes(bg.id));
                    localStorage.setItem(LS.CUSTOM_BGS, JSON.stringify(customBackgrounds));
                    renderBackgrounds();
                }
            }

            // Restaurar estado normal de los botones
            deleteCustomBgsBtn.textContent = 'Eliminar Fondos';
            deleteCustomBgsBtn.classList.remove('confirm-delete');
            uploadBackgroundBtn.disabled = false;
            clearBackgroundBtn.disabled = false;

            // Limpiar la selección visual por si el usuario cancela
            $$('.background-item.selected-for-deletion').forEach(item => item.classList.remove('selected-for-deletion'));
        }
    });

    // ---------- Drag / Pointer events for panels ----------
    // Use pointerdown/move/up for robustness (mouse + touch + pen)
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
            // do not start dragging when clicking a control inside handle (like close button)
            if (ev.target.closest('button')) return;

            dragging = true;
            panel.classList.add('dragging');
            panel.style.transition = 'none';

            start.x = ev.clientX;
            start.y = ev.clientY;

            const rect = panel.getBoundingClientRect();
            origin.x = rect.left;
            origin.y = rect.top;

            // capture pointer to the panel to receive move/up even outside
            if (ev.pointerId) handle.setPointerCapture?.(ev.pointerId);

            // bring to front
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

            // Keep within parent bounds
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

            // save position
            const left = parseFloat(panel.style.left || 0);
            const top = parseFloat(panel.style.top || 0);
            panelPositions[panel.id] = { x: left, y: top };
            localStorage.setItem(LS.POS, JSON.stringify(panelPositions));

            // release pointer capture
            if (ev.pointerId) handle.releasePointerCapture?.(ev.pointerId);
        };

        handle.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    floatingPanels.forEach(makeDraggable);

    // ---------- Resize panels ----------
    function makeResizable(panel) {
        // Hacemos que solo el panel de notas sea redimensionable.
        // Si el panel no es el de notas, no continuamos.
        if (panel.id !== 'content-notes') return;

        const handle = panel.querySelector('.resize-handle');
        if (!handle) return;

        let resizing = false;
        let start = { x: 0, y: 0 };
        let startSize = { w: 0, h: 0 };

        const onPointerDown = (ev) => {
            ev.stopPropagation(); // Evitar que se active el drag del panel
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

            // Usamos las constantes MIN_WIDTH y MIN_HEIGHT para mayor claridad.
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

            // Guardar el nuevo tamaño
            panelSizes[panel.id] = { w: panel.offsetWidth, h: panel.offsetHeight };
            localStorage.setItem(LS.SIZES, JSON.stringify(panelSizes));

            if (ev.pointerId) handle.releasePointerCapture?.(ev.pointerId);
        };

        handle.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }

    // Aplicamos la funcionalidad de redimensionar a todos los paneles flotantes.
    floatingPanels.forEach(makeResizable);

    // ---------- Theme toggle ----------
    const themeToggle = $('#theme-toggle');
    themeToggle?.addEventListener('click', () => {
        const current = body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', next);
        localStorage.setItem(LS.THEME, next);
        
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
        // Close other dropdown
        zenstudioMenu.classList.remove('open');
    });

    zenstudioToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        zenstudioMenu.classList.toggle('open');
        zenstudioMenu.setAttribute('aria-hidden', String(!zenstudioMenu.classList.contains('open')));
        const expanded = zenstudioToggle.getAttribute('aria-expanded') === 'true';
        zenstudioToggle.setAttribute('aria-expanded', String(!expanded));
        // Close other dropdown
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

    // --- Credits Modal Logic ---
    const creditsModal = $('#credits-modal');
    const showCreditsBtn = $('#show-credits-btn');
    const closeCreditsBtn = creditsModal?.querySelector('.close-modal-btn');

    showCreditsBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        creditsModal?.classList.add('active');
        creditsModal?.setAttribute('aria-hidden', 'false');
        // Close the dropdown it came from
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
                // gentle notification
                try { window.navigator.vibrate?.(200); } catch (e) {}
                // small sound (if available) could be played here
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
    const defaultSounds = [
        { id: 'rain_thunder', name: 'Lluvia y Truenos', file: 'Sonidodelluvia.mp3' },
        { id: 'ocean_relax', name: 'Océano Relajante', file: 'Sonidodeoceano.mp3' }
    ];
    let userSounds = JSON.parse(localStorage.getItem(LS.USER_SOUNDS) || '[]');
    let soundsData = [...defaultSounds, ...userSounds];

    const soundListContainer = $('#sound-list-container');
    const uploadSoundBtn = $('#upload-sound-btn');
    const soundFileInput = $('#sound-file-input');
    const deleteCustomSoundsBtn = $('#delete-custom-sounds-btn');

    function setGlobalMute(muted) {
        isMutedGlobally = muted;

        // Actualizar el botón de la barra superior
        if (soundIndicator) {
            soundIndicator.classList.toggle('muted', isMutedGlobally);
            soundIndicator.setAttribute('aria-pressed', String(isMutedGlobally));
        }

        // Silenciar/desilenciar todos los audios de la página (ambientales, locales, etc.)
        $$('audio').forEach(audio => {
            audio.muted = isMutedGlobally;
        });

        // Silenciar/desilenciar los sonidos de ambiente activos
        setAmbientSoundsMute(isMutedGlobally);

        // Silenciar/desilenciar el reproductor de música local
        if (localPlayer) localPlayer.muted = isMutedGlobally;

        // Manejar el reproductor de YouTube si existe
        if (window.youtubePlayer && typeof window.youtubePlayer.mute === 'function') {
            if (isMutedGlobally) {
                window.youtubePlayer.mute();
            } else {
                window.youtubePlayer.unMute();
            }
        }
    }

    function setAmbientSoundsMute(muted) {
        // Itera sobre los audios de ambiente activos y aplica el estado de silencio
        for (const soundId in activeAudios) {
            activeAudios[soundId].player.muted = muted;
        }
    }

    soundIndicator?.addEventListener('click', () => {
        setGlobalMute(!isMutedGlobally);
    });

    function toggleSound(id, name, file, shouldPlay) {
        if (!activeAudios[id]) {
            const audio = new Audio(encodeURI(file));
            audio.loop = true;
            const soundItemUI = soundListContainer.querySelector(`[data-sound-id="${id}"]`);
            const slider = soundItemUI?.querySelector('.volume-slider');
            audio.volume = slider ? parseFloat(slider.value) : 0.5;
            activeAudios[id] = { player: audio, name, file };
            audio.muted = isMutedGlobally;
        }
    
        const soundInfo = activeAudios[id];
        const player = soundInfo.player;
    
        const isPlaying = !player.paused;
    
        if (shouldPlay && !isPlaying) {
            player.play().catch(e => console.error(`Error al reproducir ${name}:`, e));
        } else if (!shouldPlay && isPlaying) {
            player.pause();
        }
    
        updateSoundItemUI(id);
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
        btn.innerHTML = isPlaying ? pauseSVG() : playSVG(); // Estado inicial
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Se determina si el sonido debe reproducirse o pausarse.
            // Si el audio no existe o está pausado, debe reproducirse (true).
            // Si ya está sonando, debe pausarse (false, porque !player.paused será false).
            const shouldPlay = !activeAudios[sound.id] || activeAudios[sound.id].player.paused;
            toggleSound(sound.id, sound.name, sound.file, activeAudios[sound.id]?.player.paused);
        });
        infoGroup.appendChild(btn);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = sound.name;
        infoGroup.appendChild(nameSpan);

        // Añadir clase y overlay para sonidos de usuario
        if (isUserSound) {
            container.classList.add('user-sound');
            container.innerHTML += `
                <div class="selection-overlay">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            `;
        }

        container.appendChild(infoGroup);

        // Creamos el control de volumen pero lo dejamos oculto por defecto
        const volGroup = document.createElement('div');
        volGroup.className = 'volume-control-group';
        // Un único SVG que contiene la bocina + ondas para evitar separación visual
        volGroup.innerHTML = `
            <svg class="speaker-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path class="wave-1" d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path class="wave-2" d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <input type="range" min="0" max="1" step="0.01" class="volume-slider" value="0.5">
    `;
    // Detenemos la propagación del clic en el grupo de volumen para evitar
    // que se active el toggle de reproducción del item completo.
    volGroup.addEventListener('click', (e) => {
        e.stopPropagation();
    });
        const range = volGroup.querySelector('.volume-slider');
        range.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (activeAudios[sound.id] && activeAudios[sound.id].player) activeAudios[sound.id].player.volume = v;
        });
        container.appendChild(volGroup);
        
        // Asignamos un ID único al contenedor para poder encontrarlo después
        container.dataset.soundId = sound.id;

        // Evento de clic para selección en modo borrado
        container.addEventListener('click', () => {
            const panel = $('#content-sounds');
            if (panel.classList.contains('is-deleting-sounds') && container.classList.contains('user-sound')) {
                container.classList.toggle('selected-for-deletion');
            } else {
                toggleSound(sound.id, sound.name, sound.file, !activeAudios[sound.id] || activeAudios[sound.id].player.paused);
            }
        });

        return container;
    }

    function updateSoundItemUI(soundId) {
        const container = soundListContainer.querySelector(`[data-sound-id="${soundId}"]`);
        if (!container) return;

        const soundInfo = activeAudios[soundId];
        const isPlaying = soundInfo && soundInfo.player && !soundInfo.player.paused;
    
        container.classList.toggle('playing', isPlaying);
    
        const btn = container.querySelector('.sound-toggle-btn');
        if (btn) btn.innerHTML = isPlaying ? pauseSVG() : playSVG();
    
        const volGroup = container.querySelector('.volume-control-group');
        // La visibilidad del volumen ahora se controla por CSS con la clase 'playing'
        if (volGroup) volGroup.style.visibility = isPlaying ? 'visible' : 'hidden';
    }

    function renderSoundList() {
        if (!soundListContainer) return;
        soundListContainer.innerHTML = '';
        soundsData = [...defaultSounds, ...userSounds]; // Actualizamos la lista combinada
        soundsData.forEach(s => soundListContainer.appendChild(createSoundItem(s)));

        // Mostrar u ocultar el botón de eliminar si hay sonidos de usuario
        if (deleteCustomSoundsBtn) {
            deleteCustomSoundsBtn.style.display = userSounds.length > 0 ? 'inline-flex' : 'none';
        }
    }

    // --- Funcionalidad de subida y borrado de sonidos ---
    uploadSoundBtn?.addEventListener('click', () => {
        soundFileInput.click();
    });

    soundFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            alert('Por favor, selecciona un archivo de audio válido.');
            return;
        }

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
                    file: event.target.result // Guardamos el audio como Data URL (base64)
                };
                userSounds.push(newSound);
                localStorage.setItem(LS.USER_SOUNDS, JSON.stringify(userSounds));
                renderSoundList();
                closeNameSoundModal();
            };
            reader.readAsDataURL(pendingSoundFile);
            soundFileInput.value = ''; // Reset input para poder subir el mismo archivo de nuevo
        }
    }

    // --- Lógica para el modo de eliminación de sonidos ---
    deleteCustomSoundsBtn?.addEventListener('click', (e) => {
        e.stopPropagation(); // CRÍTICO: Evita que el clic se propague al panel y lo autoseleccione.
        const panel = $('#content-sounds');
        const isInDeleteMode = panel.classList.toggle('is-deleting-sounds');

        if (isInDeleteMode) {
            deleteCustomSoundsBtn.textContent = 'Confirmar';
            deleteCustomSoundsBtn.classList.add('confirm-delete');
            uploadSoundBtn.disabled = true;
        } else {
            const itemsToDelete = $$('.sound-item.selected-for-deletion', panel);
            const idsToDelete = itemsToDelete.map(item => item.dataset.soundId);

            if (idsToDelete.length > 0) {
                if (confirm(`¿Estás seguro de que quieres eliminar ${idsToDelete.length} sonido(s)?`)) {
                    // Detener y eliminar los audios activos
                    idsToDelete.forEach(id => {
                        if (activeAudios[id]) {
                            activeAudios[id].player.pause();
                            delete activeAudios[id];
                        }
                    });
                    userSounds = userSounds.filter(s => !idsToDelete.includes(s.id));
                    localStorage.setItem(LS.USER_SOUNDS, JSON.stringify(userSounds));
                    renderSoundList();
                }
            }
            deleteCustomSoundsBtn.textContent = 'Eliminar';
            deleteCustomSoundsBtn.classList.remove('confirm-delete');
            uploadSoundBtn.disabled = false;
        }
    });

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

    // ---------- Fin de la lógica de sonidos ----------

    // small SVG helpers
    function playSVG() {
        return '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
    function pauseSVG() {
        return '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    }

    // ---------- Media Player (con Pestañas) ----------
    const mediaPanel = $('#content-media');
    const mediaTabs = $$('.media-tab-btn', mediaPanel);
    const mediaTabContents = $$('.media-tab-content', mediaPanel);

    mediaTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Actualizar botones de pestañas
            mediaTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Actualizar contenido visible
            mediaTabContents.forEach(content => {
                content.classList.toggle('active', content.id === `media-${tabName}-content`);
            });
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
        // Destruir reproductor anterior si existe
        if (window.youtubePlayer) {
            window.youtubePlayer.destroy();
            window.youtubePlayer = null;
        }

        const videoId = getYoutubeVideoId(youtubeUrlInput.value);
        if (videoId) {
            // Limpiamos el contenedor y creamos un div para el nuevo reproductor
            youtubePlayerContainer.innerHTML = '<div id="youtube-player-div"></div>';

            window.youtubePlayer = new YT.Player('youtube-player-div', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: { 'autoplay': 1, 'rel': 0, 'playsinline': 1 },
                events: {
                    'onReady': (event) => {
                        // Aplicar el estado de silencio global cuando el video esté listo
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

    const playBtn = $('#local-player-play');
    const prevBtn = $('#local-player-prev');
    const nextBtn = $('#local-player-next');
    const volumeSlider = $('#local-player-volume-slider');
    const trackTitle = $('#local-player-track-title');
    const playlistEl = $('#local-playlist');
    const uploadBtn = $('#upload-local-music-btn');
    const fileInput = $('#local-music-input');
    const deleteLocalTracksBtn = $('#delete-local-tracks-btn');

    function playTrack(index) {
        // Si el índice no es válido o la lista está vacía, no hacemos nada.
        if (index < 0 || index >= localPlaylistFiles.length || localPlaylistFiles.length === 0) {
            // Si la lista está vacía, reseteamos la UI del reproductor.
            trackTitle.textContent = 'Ninguna canción seleccionada';
            playBtn.innerHTML = playSVG();
            return;
        }
    
        currentTrackIndex = index;
        const track = localPlaylistFiles[index];
        localPlayer.src = URL.createObjectURL(track);
        localPlayer.muted = isMutedGlobally; // Aplicar estado de silencio
        
        // Intentamos reproducir y actualizamos la UI en consecuencia.
        localPlayer.play().then(() => {
            playBtn.innerHTML = pauseSVG();
        }).catch(e => console.error("Error al reproducir audio:", e));
    
        trackTitle.textContent = track.name.replace(/\.[^/.]+$/, "");
        updatePlaylistUI();
    }

    function togglePlayPause() {
        if (localPlayer.src) {
            if (localPlayer.paused) {
                localPlayer.play();
                playBtn.innerHTML = pauseSVG();
            } else {
                localPlayer.pause();
                playBtn.innerHTML = playSVG();
            }
        } else if (localPlaylistFiles.length > 0) {
            playTrack(0); // Si no hay nada, empieza con la primera canción
        }
    }

    function updatePlaylistUI() {
        playlistEl.innerHTML = '';
        localPlaylistFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.dataset.trackIndex = index; // Añadimos índice para identificarlo
            li.innerHTML = `
                <span class="playlist-track-name">${file.name.replace(/\.[^/.]+$/, "")}</span>
                <div class="selection-overlay">
                    <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            `;
            li.classList.toggle('playing', index === currentTrackIndex);
            
            li.addEventListener('click', () => {
                const panel = $('#content-media');
                if (panel.classList.contains('is-deleting-tracks')) {
                    li.classList.toggle('selected-for-deletion');
                } else {
                    playTrack(index);
                }
            });
            playlistEl.appendChild(li);
        });

        // Mostrar u ocultar botón de eliminar
        deleteLocalTracksBtn.style.display = localPlaylistFiles.length > 0 ? 'inline-flex' : 'none';
    }

    // --- Lógica para el modo de eliminación de canciones ---
    deleteLocalTracksBtn?.addEventListener('click', (e) => {
        e.stopPropagation(); // CRÍTICO: Evita que el clic se propague al panel y lo autoseleccione.
        const panel = $('#content-media');
        const isInDeleteMode = panel.classList.toggle('is-deleting-tracks');

        if (isInDeleteMode) {
            deleteLocalTracksBtn.textContent = 'Confirmar';
            deleteLocalTracksBtn.classList.add('confirm-delete');
            uploadBtn.disabled = true;
        } else {
            const itemsToDelete = $$('.playlist-item.selected-for-deletion', panel);
            const indicesToDelete = itemsToDelete.map(item => parseInt(item.dataset.trackIndex, 10)).sort((a, b) => b - a); // Ordenar descendente para no afectar índices

            if (indicesToDelete.length > 0) {
                if (confirm(`¿Estás seguro de que quieres eliminar ${indicesToDelete.length} canción(es)?`)) {
                    indicesToDelete.forEach(index => {
                        if (index === currentTrackIndex) {
                            localPlayer.pause(); localPlayer.src = ''; trackTitle.textContent = 'Ninguna canción seleccionada'; playBtn.innerHTML = playSVG();
                        }
                        localPlaylistFiles.splice(index, 1);
                        if (currentTrackIndex > index) currentTrackIndex--;
                    });
                    updatePlaylistUI();
                }
            }
            deleteLocalTracksBtn.textContent = 'Eliminar';
            deleteLocalTracksBtn.classList.remove('confirm-delete');
            uploadBtn.disabled = false;
            $$('.playlist-item.selected-for-deletion').forEach(item => item.classList.remove('selected-for-deletion'));
        }
    });

    playBtn?.addEventListener('click', togglePlayPause);
    nextBtn?.addEventListener('click', () => playTrack((currentTrackIndex + 1) % localPlaylistFiles.length));
    prevBtn?.addEventListener('click', () => playTrack((currentTrackIndex - 1 + localPlaylistFiles.length) % localPlaylistFiles.length));
    volumeSlider?.addEventListener('input', (e) => localPlayer.volume = e.target.value);
    
    // Eventos del reproductor para actualizar UI
    localPlayer.addEventListener('ended', () => nextBtn?.click());

    uploadBtn?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (e) => {
        localPlaylistFiles.push(...e.target.files);
        updatePlaylistUI();
        if (localPlayer.paused && localPlayer.src === '') {
            playTrack(currentTrackIndex === -1 ? 0 : currentTrackIndex);
        }
    });


    // ---------- Tasks ----------
    const taskList = $('#task-list');
    const newTaskInput = $('#new-task-input');
    const addTaskBtn = $('#add-task-btn');
    const clearCompletedBtn = $('#clear-completed-btn');

    function renderTasks() {
        if (!taskList) return;
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const item = document.createElement('li');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <label class="task-checkbox-container">
                    <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </label>
                <button class="delete-task-btn" data-index="${index}" aria-label="Eliminar tarea">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            taskList.appendChild(item);
        });
    }

    taskList?.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[type="checkbox"]');
        if (checkbox) {
            const index = parseInt(checkbox.dataset.index, 10);
            tasks[index].completed = checkbox.checked;
            if (checkbox.checked) {
                const completeSound = new Audio('task-complete.mp3');
                completeSound.volume = 0.3;
                completeSound.muted = isMutedGlobally; // Respetar el silencio global
                completeSound.play().catch(err => console.log("No se pudo reproducir sonido.", err));
            }
            renderTasks();
            saveTasks();
        }
    });

    taskList?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-task-btn');
        if (deleteBtn) {
            const index = parseInt(deleteBtn.dataset.index, 10);
            const taskItem = deleteBtn.closest('.task-item');
            taskItem.classList.add('fade-out');
            setTimeout(() => { tasks.splice(index, 1); renderTasks(); saveTasks(); }, 400);
        }
    });

    // ---------- Notes ----------
    const quickNotes = $('#quick-notes');
    const LS_NOTES_KEY = LS.NOTES;
    
    // --- Manejadores para los nuevos botones de formato ---
    const boldBtn = $('#notes-bold-btn');
    const italicBtn = $('#notes-italic-btn');
    const underlineBtn = $('#notes-underline-btn');
    const listBtn = $('#notes-list-btn');
    // Custom font size dropdown elements
    const fontSizeToggle = $('#notes-fontsize-toggle');
    const fontSizeMenu = $('#notes-fontsize-menu');
    const fontSizeCurrent = $('#notes-fontsize-current');

    boldBtn?.addEventListener('click', () => {
        document.execCommand('bold');
        quickNotes.focus();
    });

    italicBtn?.addEventListener('click', () => {
        document.execCommand('italic');
        quickNotes.focus();
    });

    underlineBtn?.addEventListener('click', () => {
        document.execCommand('underline');
        quickNotes.focus();
    });

    listBtn?.addEventListener('click', () => {
        document.execCommand('insertUnorderedList');
        quickNotes.focus();
    });

    // --- Lógica para el nuevo dropdown de tamaño de fuente ---
    fontSizeToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = fontSizeMenu.classList.toggle('open');
        fontSizeMenu.setAttribute('aria-hidden', String(!isOpen));
    });

    fontSizeMenu?.addEventListener('click', (e) => {
        const target = e.target.closest('.format-dropdown-item');
        if (!target) return;

        const size = target.dataset.size;
        const text = target.textContent;

        // Aplicar el comando de formato
        document.execCommand('fontSize', false, size);
        
        // Actualizar UI del dropdown
        if (fontSizeCurrent) fontSizeCurrent.textContent = text;
        $$('.format-dropdown-item', fontSizeMenu).forEach(item => item.classList.remove('active'));
        target.classList.add('active');

        // Cerrar menú y enfocar editor
        fontSizeMenu.classList.remove('open');
        fontSizeMenu.setAttribute('aria-hidden', 'true');
        quickNotes.focus();
    });

    // Cerrar el dropdown si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!fontSizeMenu?.contains(e.target) && !fontSizeToggle?.contains(e.target)) {
            fontSizeMenu?.classList.remove('open');
        }
    });

    if (quickNotes) {
        // Load notes
        const savedNotes = localStorage.getItem(LS_NOTES_KEY) || '';
        // Al cargar, ya no usamos escapeHtml, sino que insertamos el HTML guardado directamente.
        // La sanitización se hará al guardar.
        // Para mantener el formato, guardaremos el innerHTML.
        quickNotes.innerHTML = localStorage.getItem(LS_NOTES_KEY + '_html') || '';

    
        let saveTimeout;
        quickNotes.addEventListener('input', (e) => {
            // Para evitar guardar en cada pulsación, usamos un debounce
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                // Guardamos el contenido como texto plano para mantener los marcadores
                // Y también el HTML para preservar el formato.
                localStorage.setItem(LS_NOTES_KEY, quickNotes.innerText); // Para compatibilidad o búsqueda
                localStorage.setItem(LS_NOTES_KEY + '_html', quickNotes.innerHTML);
            }, 300);
        });

        // Atajo de teclado para negrita
        quickNotes.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault(); // Evitar la acción por defecto del navegador
                document.execCommand('bold');
            }
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                document.execCommand('italic');
            }
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                document.execCommand('underline');
            }
        });


    }
    

    // ---------- Calendar ----------
    const calendarGrid = $('#calendar-grid');
    const calendarFullDate = $('#calendar-full-date');
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
        const startWeekDay = firstDay.getDay(); // 0..6 (Sun..Sat)
        const totalDays = lastDay.getDate();
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        daysOfWeek.forEach(d => {
            const el = document.createElement('div');
            el.className = 'day header';
            el.textContent = d;
            calendarGrid.appendChild(el);
        });

        // fill blanks
        for (let i = 0; i < startWeekDay; i++) {
            const blank = document.createElement('div');
            blank.className = 'day muted';
            blank.textContent = '';
            calendarGrid.appendChild(blank);
        }

        // days
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

            // Al hacer clic en un día se abre el modal, reemplaza la función del botón eliminado
            el.addEventListener('click', () => openScheduleModal(dtKey)); 
            calendarGrid.appendChild(el);
        }

        // now we only show the full date in the single header (handled elsewhere)
    }

    // Formatea una fecha a: "Lunes 24 de noviembre de 2025"
    function formatFullDate(date) {
        if (!date) return '';
        const s = date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        // El resultado suele venir como "lunes, 24 de noviembre de 2025" — limpiamos la coma y capitalizamos la primera letra
        return s.replace(',', '').replace(/^./, c => c.toUpperCase()).trim();
    }

    // Actualiza el texto del encabezado del calendario con una transición suave
    function setCalendarHeaderDate(date) {
        if (!calendarFullDate) return;
        calendarFullDate.classList.remove('fade-in');
        calendarFullDate.classList.add('fade-out');
        setTimeout(() => {
            calendarFullDate.textContent = formatFullDate(date);
            calendarFullDate.classList.remove('fade-out');
            calendarFullDate.classList.add('fade-in');
            setTimeout(() => calendarFullDate.classList.remove('fade-in'), 300);
        }, 160);
    }

    function navigateMonth(delta) {
        calendarDate.setMonth(calendarDate.getMonth() + delta);
        renderCalendar(calendarDate);
        // Mostrar por defecto el primer día del mes en el encabezado al navegar
        const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
        setCalendarHeaderDate(firstDay);
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
            // Usamos escapeHtml para sanear antes de insertar
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
        const d = new Date(year, month - 1, day);
        const dateStr = formatFullDate(d);
        modalDateDisplay.textContent = dateStr;
        // También actualizamos el encabezado del calendario para mostrar el día seleccionado (con animación)
        setCalendarHeaderDate(d);
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

    // --- MANEJADORES DE EVENTOS CALENDARIO (CORREGIDOS) ---
    
    // Calendar Navigation
    prevMonthBtn?.addEventListener('click', () => navigateMonth(-1));
    nextMonthBtn?.addEventListener('click', () => navigateMonth(1));

    // Add Event (Main Panel Button) - Ahora abre el modal para el día de hoy.
    addEventMainBtn?.addEventListener('click', () => { 
        const today = new Date();
        const dtKey = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        openScheduleModal(dtKey);
    });

    // Add Event (Modal Button)
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

    // Close Modal Button
    closeModalBtn?.addEventListener('click', closeScheduleModal);

    newEventText?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addEventModalBtn.click();
    });

    // --- FIN MANEJADORES DE EVENTOS CALENDARIO (CORREGIDOS) ---

    // ---------- Utilities ----------
    // MODIFICADA para soportar negritas y listas ligeras (Markdown)
    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        let html = String(str).trim();
        
        // 1. Escapar caracteres HTML para evitar XSS
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
            
        // 2. Proceso de Formato Ligeros
        // NOTA: El orden de reemplazo es importante. Primero las listas, luego negritas, finalmente saltos de línea.
        
        // 2.1. Reemplazar saltos de línea por un marcador temporal
        html = html.replace(/\n/g, '---EOL---');

        // 2.2. Manejo de Listas (- item o * item)
        // Buscamos líneas que empiezan con "---EOL---" seguido de cero o más espacios, y luego * o -
        html = html.replace(/(\s*---EOL---)(\s*)[*|-]\s*([^\-EOL]*)/g, '---EOL---<li>$3</li>');

        // Si la primera línea es un elemento de lista, añadir <li>
        html = html.replace(/^(\s*)[*|-]\s*([^\-EOL]*)/g, '<li>$2</li>');
        
        // Envolver los bloques de <li> en <ul>
        let inList = false;
        const listRegex = /<li>.*?<\/li>/g;
        let finalHtml = '';
        let lastIndex = 0;
        let match;

        while ((match = listRegex.exec(html)) !== null) {
            const preListContent = html.substring(lastIndex, match.index);
            if (inList) {
                // Si la lista continua
                finalHtml += match[0];
            } else {
                // Si es el inicio de una lista
                finalHtml += preListContent.replace(/---EOL---/g, '<br>'); // Renderizar contenido previo
                finalHtml += '<ul>' + match[0];
                inList = true;
            }
            lastIndex = match.index + match[0].length;
        }

        // Contenido después de la última lista
        const postListContent = html.substring(lastIndex);
        if (inList) {
            finalHtml += '</ul>'; // Cerrar la última lista si la hubo
        }
        finalHtml += postListContent.replace(/---EOL---/g, '<br>'); // Renderizar el contenido final
        
        html = finalHtml;

        // 2.3. Negritas: **texto** -> <strong>texto</strong>
        // Se aplica DESPUÉS del manejo de listas, ya que las listas no deberían afectar esto.
        html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
        
        // 2.4. Limpiar cualquier marcador EOL restante (Si una línea no fue lista, se mantiene el salto de línea)
        html = html.replace(/---EOL---/g, '<br>'); 
        
        return html;
    }

    // ---------- Profile Data Loading for Menu ----------
    function loadProfileForMenu() {
        const data = JSON.parse(localStorage.getItem(LS.PROFILE)) || {};

        const avatarUrl = data.avatar || DEFAULT_AVATAR;
        if (avatarToggle) avatarToggle.src = avatarUrl;
        if (menuAvatarImg) menuAvatarImg.src = avatarUrl;

        if (menuAccountName) menuAccountName.textContent = data.accountName || 'Usuario';
        if (menuUserEmail) menuUserEmail.textContent = data.email || 'email@ejemplo.com';
    }

    // Actualizar el menú si los datos del perfil cambian en otra pestaña
    window.addEventListener('storage', (e) => {
        if (e.key === LS.PROFILE) {
            loadProfileForMenu();
        }
    });

    // --- Logout Logic ---
    $('#logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'acceso.html';
    });
    // ---------- Init ----------
    document.addEventListener('DOMContentLoaded', () => {
        (function init() {
            renderCalendar(calendarDate);
            // Mostrar la fecha completa del día actual en el encabezado al cargar
            setCalendarHeaderDate(calendarDate);
            renderSoundList();
            renderBackgrounds(); // Añadido para poblar la galería de fondos
            renderTasks();
            loadProfileForMenu(); // Cargar datos del perfil en el menú
    
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
    });
})();