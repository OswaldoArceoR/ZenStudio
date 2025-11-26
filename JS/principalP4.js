    // ---------- Tasks (conexión a servidor) ----------
    const taskList = $('#task-list');
    const newTaskInput = $('#new-task-input');
    const addTaskBtn = $('#add-task-btn');
    const clearCompletedBtn = $('#clear-completed-btn');

    // Estructura esperada por servidor: { id, text, completed }
    async function fetchTasks() {
        try {
            const r = await fetch('obtenerTareasEnfoque.php', { headers: { 'Accept': 'application/json' } });
            const data = await r.json().catch(() => ({ success:false }));
            if (data.success) {
                tasks = Array.isArray(data.tareas) ? data.tareas : [];
                renderTasks();
            }
        } catch(e) { /* silencioso */ }
    }

    async function addTaskServer(text) {
        try {
            const r = await fetch('agregarTareaEnfoque.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ descripcion: text })
            });
            const data = await r.json().catch(() => ({ success:false }));
            if (data.success) {
                tasks.unshift({ id: data.id, text: data.text, completed: !!data.completed });
                renderTasks();
            }
        } catch(e) { /* silencioso */ }
    }

    async function markTaskServer(id, completed) {
        try {
            await fetch('marcarTareaEnfoque.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, completed })
            });
        } catch(e) { /* silencioso */ }
    }

    async function deleteTaskServer(id, taskItemEl) {
        try {
            const r = await fetch('eliminarTareaEnfoque.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await r.json().catch(() => ({ success:false }));
            if (data.success) {
                // Animación y eliminación en memoria
                if (taskItemEl) taskItemEl.classList.add('fade-out');
                setTimeout(() => {
                    tasks = tasks.filter(t => t.id !== id);
                    renderTasks();
                }, 300);
            }
        } catch(e) { /* silencioso */ }
    }

    async function clearCompletedServer() {
        try {
            const r = await fetch('eliminarTareasCompletadas.php', { method: 'POST' });
            const data = await r.json().catch(() => ({ success:false }));
            if (data.success) {
                tasks = tasks.filter(t => !t.completed);
                renderTasks();
            }
        } catch(e) { /* silencioso */ }
    }

    clearCompletedBtn?.addEventListener('click', () => {
        clearCompletedServer();
    });

    function addTask() {
        const text = newTaskInput.value.trim();
        if (!text) return;
        newTaskInput.value = '';
        addTaskServer(text);
    }
    addTaskBtn?.addEventListener('click', addTask);
    newTaskInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
    });

    function renderTasks() {
        if (!taskList) return;
        taskList.innerHTML = '';
        tasks.forEach((task) => {
            const item = document.createElement('li');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <label class="task-checkbox-container">
                    <input type="checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </label>
                <button class="delete-task-btn" data-id="${task.id}" aria-label="Eliminar tarea">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            taskList.appendChild(item);
        });
    }

    taskList?.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[type="checkbox"]');
        if (!checkbox) return;
        const id = parseInt(checkbox.dataset.id, 10);
        const completed = !!checkbox.checked;
        // Optimista: actualizar en memoria y UI
        tasks = tasks.map(t => t.id === id ? { ...t, completed } : t);
        renderTasks();
        // Sonido opcional
        if (completed) {
            const completeSound = new Audio('task-complete.mp3');
            completeSound.volume = 0.3;
            completeSound.muted = isMutedGlobally;
            if (window.__zenstudio_user_interacted) {
                completeSound.play().catch(() => {});
            }
        }
        // Persistir en servidor
        markTaskServer(id, completed);
    });

    taskList?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-task-btn');
        if (!deleteBtn) return;
        const id = parseInt(deleteBtn.dataset.id, 10);
        deleteTaskServer(id, deleteBtn.closest('.task-item'));
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
        // Cargar última nota desde servidor (ya no dependemos de localStorage)
        (async () => {
            try {
                const r = await fetch('obtenerNotasRapidas.php');
                if (!r.ok) return;
                const data = await r.json();
                if (data.success && data.ultima && data.ultima.contenido) {
                    // Mostrar contenido simple; se guarda raw texto
                    quickNotes.textContent = data.ultima.contenido;
                }
            } catch(e) { /* silencioso */ }
        })();

        let saveTimeout;
        quickNotes.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                const plain = quickNotes.innerText.trim();
                if (!plain) return;
                try {
                    await fetch('guardarNotaRapida.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contenido: plain })
                    });
                } catch (e) { /* silencioso */ }
            }, 500); // ligera espera para no saturar
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
