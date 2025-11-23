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
    let isMutedGlobally = false;
    let eventsByDate = JSON.parse(localStorage.getItem(LS.EVENTS) || '{}');
    let panelPositions = JSON.parse(localStorage.getItem(LS.POS) || '{}');
    let panelSizes = JSON.parse(localStorage.getItem(LS.SIZES) || '{}');
    let pendingSoundFile = null;

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
            try {
                const bgData = JSON.parse(savedBg);
                applyBackground(bgData.file, bgData.type);
            } catch (e) {
                // Fallback para versiones antiguas
                bgContainer.style.backgroundImage = `url(${savedBg})`;
            }
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

    // ---------- Fondos Animados (Desde Base de Datos) ----------
    


function loadFondosGlobalBlobs() {
  fetch('obtenerFondosGlobalBlobs.php')
    .then(r => r.json())
    .then(fondos => {
      const gallery = document.querySelector('#background-gallery');
      if (!gallery) return;

      // Si quieres reemplazar lo anterior, descomenta:
      // gallery.innerHTML = '';

      fondos.forEach(f => {
        const item = document.createElement('div');
        item.className = 'background-item';
        item.dataset.bgFile = f.url;    // URL de verBlobGlobal.php
        item.dataset.bgType = f.mime;   // MIME

        if (f.mime.startsWith('image/')) {
          item.innerHTML = `
            ${f.url}
            <div class="background-name">${f.nombre}</div>
          `;
        } else if (f.mime.startsWith('video/')) {
          item.innerHTML = `
            <video muted loop autoplay playsinline>
              ${f.url}
            </video>
            <div class="background-name">${f.nombre}</div>
          `;
        } else {
          item.innerHTML = `<div class="background-name">${f.nombre}</div>`;
        }

        gallery.appendChild(item);
      });

      // Reusar tu lógica de click → applyBackground(...)
      reassignBackgroundEvents();
    })
    .catch(err => console.error('Error BLOB fondos globales:', err));
}


function loadGlobalSoundsBlobs() {
  fetch('obtenerSonidosGlobalBlobs.php')
    .then(r => r.json())
    .then(sonidos => {
      const container = document.querySelector('#sound-list-container');
      if (!container) return;

      container.innerHTML = ''; // para ver solo los nuevos

      sonidos.forEach(s => {
        const row = document.createElement('div');
        row.className = 'sound-item';
        row.innerHTML = `
          <div class="sound-info-group">
            <button class="sound-toggle-btn" title="Play/Pause">▶</button>
            <span>${s.nombre}</span>
          </div>
          <div class="volume-control-group">
            <input class="volume-slider" type="range" min="0" max="1" step="0.01" value="0.8">
          </div>
        `;

        const btn = row.querySelector('.sound-toggle-btn');
        const vol = row.querySelector('.volume-slider');

        const audio = new Audio(s.url);  // BLOB servido por verBlobGlobal.php
        audio.loop = true;
        audio.volume = parseFloat(vol.value);

        btn.addEventListener('click', () => {
          if (audio.paused) {
            audio.play().then(() => row.classList.add('playing'));
          } else {
            audio.pause();
            row.classList.remove('playing');
          }
        });

        vol.addEventListener('input', () => {
          audio.volume = parseFloat(vol.value);
        });

        container.appendChild(row);
      });
    })
    .catch(err => console.error('Error BLOB sonidos globales:', err));
}



    function renderDefaultBackgrounds() {
        const backgroundGallery = $('#background-gallery');
        if (!backgroundGallery) return;
        
        const defaultFondos = [
            { id: 'hoguera', name: 'Hoguera Relajante', file: 'IMAGENES/hoguera.gif' },
            { id: 'anime', name: 'Paisaje Anime', file: 'IMAGENES/anime.gif' }
        ];
        
        backgroundGallery.innerHTML = '';
        defaultFondos.forEach(bg => {
            const item = document.createElement('div');
            item.className = 'background-item';
            item.dataset.bgFile = bg.file;
            item.dataset.bgType = 'image/gif';
            item.innerHTML = `
                <img src="${bg.file}" alt="${bg.name}" loading="lazy">
                <div class="background-name">${bg.name}</div>
            `;
            backgroundGallery.appendChild(item);
        });
        
        reassignBackgroundEvents();
    }


function reassignBackgroundEvents() {
  const gallery = document.querySelector('#background-gallery');
  if (!gallery) return;
  gallery.addEventListener('click', (e) => {
    const item = e.target.closest('.background-item');
    if (!item) return;
    const bgFile = item.dataset.bgFile;
    const bgType = item.dataset.bgType || 'image/gif';
    applyBackground(bgFile, bgType);
    localStorage.setItem('zen_active_background', JSON.stringify({ file: bgFile, type: bgType }));
    showPanel('spaces'); // si quieres cerrar el panel tras seleccionar
  });
}

    
    function applyBackground(bgFile, bgType) {
    const bgContainer = document.querySelector('#background-container');
    if (!bgContainer) return;

    bgContainer.innerHTML = '';
    bgContainer.style.backgroundImage = 'none';

    if (bgType.startsWith('image/')) {
        bgContainer.style.backgroundImage = `url(${bgFile})`;
        bgContainer.style.backgroundSize = 'cover';
        bgContainer.style.backgroundPosition = 'center';
        bgContainer.style.backgroundRepeat = 'no-repeat';
    } else if (bgType.startsWith('video/')) {
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
        bgContainer.appendChild(video);
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
    const defaultSounds = [
        { id: 'rain_thunder', name: 'Lluvia y Truenos', file: 'SONIDOS/Sonidodelluvia.mp3' },
        { id: 'ocean_relax', name: 'Océano Relajante', file: 'SONIDOS/Sonidodeoceano.mp3' }
    ];

    
    

    
function loadFondosGlobalBlobs() {
  fetch('obtenerFondosGlobalBlobs.php')
    .then(r => r.json())
    .then(fondos => {
      const gallery = document.querySelector('#background-gallery');
      if (!gallery) return;

      gallery.innerHTML = ''; // para ver solo los nuevos

      fondos.forEach(f => {
        const item = document.createElement('div');
        item.className = 'background-item';
        item.dataset.bgFile = f.url;
        item.dataset.bgType = f.mime;

        if (f.mime.startsWith('image/')) {
          item.innerHTML = `
            ${f.url}
            <div class="background-name">${f.nombre}</div>
          `;
        } else if (f.mime.startsWith('video/')) {
          item.innerHTML = `
            <video muted loop autoplay playsinline>
              ${f.url}
            </video>
            <div class="background-name">${f.nombre}</div>
          `;
        }

        gallery.appendChild(item);
      });

      // Tus eventos para click y aplicar fondo
      reassignBackgroundEvents();
    })
    .catch(err => console.error('Error BLOB fondos globales:', err));
}




    let userSounds = JSON.parse(localStorage.getItem(LS.USER_SOUNDS) || '[]');
    let soundsData = [...defaultSounds, ...userSounds];

    const soundListContainer = $('#sound-list-container');
    const uploadSoundBtn = $('#upload-sound-btn');
    const soundFileInput = $('#sound-file-input');

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

        if (player.paused) {
            player.play().catch(e => console.error(`Error al reproducir ${name}:`, e));
        } else {
            player.pause();
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
        
        container.dataset.soundId = sound.id;

        return container;
    }

    function updateSoundItemUI(soundId) {
        const container = soundListContainer.querySelector(`[data-sound-id="${soundId}"]`);
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
        soundListContainer.innerHTML = '';
        soundsData = [...defaultSounds, ...userSounds];
        soundsData.forEach(s => soundListContainer.appendChild(createSoundItem(s)));
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
                    file: event.target.result
                };
                userSounds.push(newSound);
                localStorage.setItem(LS.USER_SOUNDS, JSON.stringify(userSounds));
                renderSoundList();
                closeNameSoundModal();
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

    // ---------- Media Player (con Pestañas) ----------
    const mediaPanel = $('#content-media');
    const mediaTabs = $$('.media-tab-btn', mediaPanel);
    const mediaTabContents = $$('.media-tab-content', mediaPanel);

    mediaTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            mediaTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

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

    const playBtn = $('#local-player-play');
    const prevBtn = $('#local-player-prev');
    const nextBtn = $('#local-player-next');
    const volumeSlider = $('#local-player-volume-slider');
    const trackTitle = $('#local-player-track-title');
    const playlistEl = $('#local-playlist');
    const uploadBtn = $('#upload-local-music-btn');
    const fileInput = $('#local-music-input');

    function playTrack(index) {
        if (index < 0 || index >= localPlaylistFiles.length) return;
        currentTrackIndex = index;
        const track = localPlaylistFiles[index];
        localPlayer.src = URL.createObjectURL(track);
        localPlayer.muted = isMutedGlobally;
        localPlayer.play();
        trackTitle.textContent = track.name.replace(/\.[^/.]+$/, "");
        playBtn.innerHTML = pauseSVG();
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
            playTrack(0);
        }
    }

    function updatePlaylistUI() {
        playlistEl.innerHTML = '';
        localPlaylistFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.textContent = file.name.replace(/\.[^/.]+$/, "");
            li.classList.toggle('playing', index === currentTrackIndex);
            li.addEventListener('click', () => playTrack(index));
            playlistEl.appendChild(li);
        });
    }

    playBtn?.addEventListener('click', togglePlayPause);
    nextBtn?.addEventListener('click', () => playTrack((currentTrackIndex + 1) % localPlaylistFiles.length));
    prevBtn?.addEventListener('click', () => playTrack((currentTrackIndex - 1 + localPlaylistFiles.length) % localPlaylistFiles.length));
    volumeSlider?.addEventListener('input', (e) => localPlayer.volume = e.target.value);
    localPlayer.addEventListener('ended', () => nextBtn.click());

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

    function saveTasks() {
        localStorage.setItem(LS.TASKS, JSON.stringify(tasks));
    }

    clearCompletedBtn?.addEventListener('click', () => {
        tasks = tasks.filter(task => !task.completed);
        renderTasks();
        saveTasks();
    });

    function addTask() {
        const text = newTaskInput.value.trim();
        if (text) {
            tasks.unshift({ text, completed: false });
            newTaskInput.value = '';
            renderTasks();
            saveTasks();
        }
    }
    addTaskBtn?.addEventListener('click', addTask);
    newTaskInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
    });

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
                completeSound.muted = isMutedGlobally;
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

        document.execCommand('fontSize', false, size);
        
        if (fontSizeCurrent) fontSizeCurrent.textContent = text;
        $$('.format-dropdown-item', fontSizeMenu).forEach(item => item.classList.remove('active'));
        target.classList.add('active');

        fontSizeMenu.classList.remove('open');
        fontSizeMenu.setAttribute('aria-hidden', 'true');
        quickNotes.focus();
    });

    document.addEventListener('click', (e) => {
        if (!fontSizeMenu?.contains(e.target) && !fontSizeToggle?.contains(e.target)) {
            fontSizeMenu?.classList.remove('open');
        }
    });

    if (quickNotes) {
        const savedNotes = localStorage.getItem(LS_NOTES_KEY) || '';
        quickNotes.innerHTML = localStorage.getItem(LS_NOTES_KEY + '_html') || '';

        let saveTimeout;
        quickNotes.addEventListener('input', (e) => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                localStorage.setItem(LS_NOTES_KEY, quickNotes.innerText);
                localStorage.setItem(LS_NOTES_KEY + '_html', quickNotes.innerHTML);
            }, 300);
        });

        // Atajo de teclado para negrita
        quickNotes.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
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
        (function init() {
            renderCalendar(calendarDate);
            renderSoundList();
            loadFondosGlobalBlobs();
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

        //  Restaurar el Fondo de Pantalla
        const savedBg = localStorage.getItem('zen_active_background'); // o LS.ACTIVE_BG
        const bgContainer = document.getElementById('background-container');
        if (savedBg && bgContainer) {
            bgContainer.style.backgroundImage = `url(${savedBg})`;
            document.body.style.backgroundImage = 'none';
        }

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

    //  Restaurar sonidos
    function restoreActiveSounds() {
        const activeIds = JSON.parse(localStorage.getItem('zen_active_sounds') || '[]');
        // soundsData es tu variable original con la lista de sonidos
        if(typeof soundsData !== 'undefined') {
            activeIds.forEach(id => {
                // Si el sonido ya está sonando, lo ignoramos
                if (activeAudios && activeAudios[id]) return;

                const sound = soundsData.find(s => s.id === id);
                if (sound) {
                    // Llamamos a tu función original toggleSound
                    // Nota: Asegúrate que tu función toggleSound acepte estos 3 parámetros
                    toggleSound(id, sound.name, sound.file);
                }
            });
        }
    }
    // --- [FIN] BLOQUE DE MEMORIA ---
})();