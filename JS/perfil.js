(() => {
    'use strict';

    // Claves para el LocalStorage
    const LS_PROFILE_KEY = 'zen_profile_data';
    const LS_THEME = 'zen_theme';

    // Elementos del DOM
    const $ = (sel) => document.querySelector(sel);
    const avatarImg = $('#profile-avatar-img');
    const avatarUploadInput = $('#avatar-upload-input');
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
        // Los datos ya vienen precargados desde PHP en los inputs
        console.log('Datos del perfil cargados desde sesión PHP');
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
            alert('¡Contraseña actualizada con éxito! (Simulado)');
        }

        // Guardar cambios en el perfil (simulado)
        const data = {
            username: usernameInput.value.trim(),
            accountName: accountNameInput.value.trim(),
            email: emailInput.value.trim(),
            avatar: avatarImg.src
        };

        // Aquí iría una llamada AJAX para actualizar en la base de datos
        console.log('Datos a guardar:', data);
        
        // Simular guardado exitoso
        alert('¡Perfil guardado con éxito! (Los cambios se reflejarán al recargar)');

        // Limpiar campos de contraseña
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
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
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(LS_THEME, newTheme);
        applyTheme();
    });

})();