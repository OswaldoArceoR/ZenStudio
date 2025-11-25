(() => {
    'use strict';

    // Claves para el LocalStorage
    const LS_THEME = 'zen_theme';

    // Elementos del DOM
    const $ = (sel) => document.querySelector(sel);
    const avatarImg = $('#profile-avatar-img');
    const avatarUploadInput = $('#avatar-upload-input');

    // --- Subida de avatar ---
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', function() {
            const file = avatarUploadInput.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('avatar', file);
            fetch('actualizarPerfil.php', {
                method: 'POST',
                body: formData
            })
            .then(async res => {
                try {
                    const data = await res.json();
                    if (data.status === 'ok' && data.avatar) {
                        avatarImg.src = data.avatar + '?t=' + Date.now();
                        alert('Avatar actualizado con éxito.');
                    } else {
                        alert(data.msg || 'Error al actualizar avatar.');
                    }
                } catch (e) {
                    alert('Error inesperado: la respuesta no es JSON válido.');
                }
            })
            .catch((err) => alert('Error de red o formato: ' + err));
        });
    }
    const usernameInput = $('#username-input');
    const accountNameInput = $('#accountname-input');
    const emailInput = $('#email-input');
    const currentPasswordInput = $('#current-password-input');
    const newPasswordInput = $('#new-password-input');
    const confirmPasswordInput = $('#confirm-password-input');
    const saveBtn = $('#save-profile-btn');
    const themeToggle = $('#theme-toggle');

    // --- Cargar y aplicar tema ---
    function applyTheme() {
        const savedTheme = localStorage.getItem(LS_THEME) || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', savedTheme === 'dark');
        }
    }
    applyTheme();

    // --- Datos del perfil ya vienen de PHP ---
    function loadProfileData() {
        console.log('Datos del perfil cargados desde sesión PHP');
    }

    // --- Guardar datos del perfil ---
    function saveProfileData() {

        const username = usernameInput.value.trim();
        const nombre = accountNameInput.value.trim();
        const email = emailInput.value.trim();
        const currentPassword = currentPasswordInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // === SOLUCIÓN 1 ===
        const quiereCambiarPwd = newPassword !== '' || confirmPassword !== '';

        // Si quiere cambiar contraseña → validar
        if (quiereCambiarPwd) {

            if (newPassword === '' || confirmPassword === '') {
                alert("Debes llenar la nueva contraseña y su confirmación.");
                return;
            }

            if (newPassword.length < 6) {
                alert("La nueva contraseña debe tener al menos 6 caracteres.");
                return;
            }

            if (newPassword !== confirmPassword) {
                alert("Las contraseñas nuevas no coinciden.");
                return;
            }

            if (currentPassword === '') {
                alert("Debes ingresar tu contraseña actual para autorizar el cambio.");
                return;
            }
        }

        // Construir payload EXACTO como lo pide el PHP
        const payload = {
            username,
            nombre,
            email,
            currentPassword,
            newPassword,
            confirmPassword
        };

        fetch("actualizarPerfil.php", {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {

            if (data.status === "error") {
                alert(data.msg);
                return;
            }

            alert("¡Perfil actualizado con éxito!");

            // Limpiar campos de contraseña SIEMPRE
            currentPasswordInput.value = "";
            newPasswordInput.value = "";
            confirmPasswordInput.value = "";
        })
        .catch(err => {
            console.error("Error:", err);
            alert("Ocurrió un error al actualizar el perfil.");
        });
    }

    // --- Subida de avatar ---
    function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida.');
            return;
        }

        const reader = new FileReader();
        reader.onload = e => avatarImg.src = e.target.result;
        reader.readAsDataURL(file);
    }

    // --- Listeners ---
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
