document.addEventListener('DOMContentLoaded', () => {
    const flipper = document.getElementById('form-flipper');
    const switchLinks = document.querySelectorAll('.form-switch-link');

    // Lógica para girar la tarjeta al hacer clic en los enlaces
    switchLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Evita que el enlace recargue la página
            flipper.classList.toggle('is-flipped');
        });
    });

    // --- LÓGICA PARA EL CAMBIO DE TEMA (CLARO/OSCURO) ---
    // Este código es idéntico al de tus otras páginas para mantener consistencia
    const themeToggleButton = document.getElementById('theme-toggle');
    
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('zen_theme', theme);
        if (themeToggleButton) {
            themeToggleButton.setAttribute('aria-pressed', theme === 'dark');
        }
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    // Aplicar tema guardado al cargar
    const savedTheme = localStorage.getItem('zen_theme') || 'light';
    applyTheme(savedTheme);

    // --- LÓGICA PARA MOSTRAR EL FORMULARIO CORRECTO ---
    // Revisa si la URL contiene "?form=register"
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('form') === 'register') {
        // Si es así, gira la tarjeta para mostrar el formulario de registro
        flipper.classList.add('is-flipped');
    }
});