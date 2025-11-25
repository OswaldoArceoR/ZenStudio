(() => {
    'use strict';

    // Claves para el LocalStorage
    const LS_PROFILE_KEY = 'zen_profile_data';
    const LS_THEME = 'zen_theme';

    // Elementos del DOM
    const $ = (sel) => document.querySelector(sel);
    const avatarImg = $('#profile-avatar-img');
    const avatarUploadInput = $('#avatar-upload-input');
    const removeAvatarBtn = $('#remove-avatar-btn');
    const usernameInput = $('#username-input');
    const accountNameInput = $('#accountname-input');
    const emailInput = $('#email-input');
    const currentPasswordInput = $('#current-password-input');
    const newPasswordInput = $('#new-password-input');
    const confirmPasswordInput = $('#confirm-password-input');
    const saveBtn = $('#save-profile-btn');
    const themeToggle = $('#theme-toggle');

    // --- Cargar y aplicar el tema guardado ---
    function applyTheme() {
        const savedTheme = localStorage.getItem(LS_THEME) || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', savedTheme === 'dark');
        }
    }

    // Aplicar tema al cargar la página
    applyTheme();

    // --- Cargar datos del perfil ---
    function loadProfileData() {
        const data = JSON.parse(localStorage.getItem(LS_PROFILE_KEY)) || {};

        usernameInput.value = data.username || '';
        accountNameInput.value = data.accountName || '';
        emailInput.value = data.email || '';
        if (data.avatar) {
            avatarImg.src = data.avatar;
        }
    }

    // --- Guardar datos del perfil ---
    function saveProfileData() {
        // Validar cambio de contraseña
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword || confirmPassword) {
            if (newPassword.length < 6) {
                alert('La nueva contraseña debe tener al menos 6 caracteres.');
                return;
            }
            if (newPassword !== confirmPassword) {
                alert('Las nuevas contraseñas no coinciden.');
                return;
            }
            // En una aplicación real, aquí se haría una llamada a un servidor.
            // Por seguridad, no guardamos contraseñas en localStorage.
            alert('¡Contraseña actualizada con éxito! (Simulado)');
        }

        // Guardar el resto de la información
        const data = {
            username: usernameInput.value.trim(),
            accountName: accountNameInput.value.trim(),
            email: emailInput.value.trim(),
            avatar: avatarImg.src.startsWith('data:image') ? avatarImg.src : null
        };

        localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(data));

        // Limpiar campos de contraseña
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';

        alert('¡Perfil guardado con éxito!');
    }

    // --- Manejar subida de imagen ---
    function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar que es una imagen
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecciona un archivo de imagen.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Mostrar la imagen previsualizada
            avatarImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- Asignar Event Listeners ---
    document.addEventListener('DOMContentLoaded', loadProfileData);
    saveBtn.addEventListener('click', saveProfileData);
    avatarUploadInput.addEventListener('change', handleAvatarUpload);
    // Botón para eliminar la foto de perfil (confirma antes de borrar y actualiza localStorage)
    removeAvatarBtn?.addEventListener('click', () => {
        // Confirmación del usuario
        const ok = window.confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?');
        if (!ok) return;

        // Restablecer a la imagen por defecto
        if (avatarImg) avatarImg.src = 'https://via.placeholder.com/100';

        // Actualizar storage: eliminar avatar (guardar null)
        try {
            const data = JSON.parse(localStorage.getItem(LS_PROFILE_KEY)) || {};
            data.avatar = null;
            localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('No se pudo actualizar localStorage al eliminar avatar:', e);
        }
    });
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(LS_THEME, newTheme);
        applyTheme();
    });

    // También actualiza el avatar en la página principal si se cambia
    window.addEventListener('storage', (e) => {
        if (e.key === LS_PROFILE_KEY) {
            loadProfileData();
        }
    });
})();