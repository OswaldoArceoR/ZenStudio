document.addEventListener('DOMContentLoaded', () => {
    const scrollIndicator = document.querySelector('.landing-hero__scroll-indicator');
    const mainContent = document.getElementById('main-content');

    // Cuando se hace clic en el indicador de scroll, se desplaza suavemente a la sección de acciones.
    if (scrollIndicator && mainContent) {
        scrollIndicator.addEventListener('click', () => {
            mainContent.scrollIntoView({ behavior: 'smooth' });
        });
    }

});