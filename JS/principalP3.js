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
