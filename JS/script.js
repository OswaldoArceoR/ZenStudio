document.addEventListener('DOMContentLoaded', () => {
    const scrollIndicator = document.querySelector('.landing-hero__scroll-indicator');
    const actionsSection = document.getElementById('actions-root');

    // Cuando se hace clic en el indicador de scroll, desplaza suavemente a la sección de acciones.
    if (scrollIndicator && actionsSection) {
        scrollIndicator.addEventListener('click', () => {
            actionsSection.scrollIntoView({ behavior: 'smooth' });
        });
    }
});