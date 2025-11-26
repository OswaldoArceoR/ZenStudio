const LandingHero = () => {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <header className={`landing-hero ${isVisible ? 'visible' : ''}`}>
            <div className="landing-hero__content">
                <h1>ZenStudio</h1>
                <p>Tu espacio para la concentración y la productividad.</p>
                <div className="landing-hero__scroll-indicator">
                    <span>Desliza hacia abajo</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                </div>
            </div>
        </header>
    );
};

const LandingActions = () => {
    return (
        <section className="landing-actions-section">
            <div className="landing-actions__container">
                <h2 className="landing-actions__title">¿Listo para empezar?</h2>
                {/* Unificamos acceso en una sola página PHP con React */}
                <a href="PHP/acceso.php" className="landing-actions__button">Iniciar Sesión</a>
                <a href="PHP/acceso.php?form=register" className="landing-actions__button landing-actions__button--secondary">Registrarse</a>
            </div>
        </section>
    );
};

const AboutSection = () => {
    return (
        <section className="about-section">
            <div className="about-section__container">
                <div className="about-section__image-container">
                    <img src="Final_UI/ZenStudioLogo.png" alt="Vista previa de la aplicación ZenStudio" />
                </div>
                <div className="about-section__text-container">
                    <h2>¿Qué es ZenStudio?</h2>
                    <p>
                        ZenStudio es una aplicación web diseñada para ser tu santuario digital de productividad. Te permite crear un espacio de trabajo personalizado combinando herramientas como un temporizador Pomodoro, listas de tareas, notas rápidas, y sonidos ambientales para ayudarte a mantener la concentración y alcanzar tus metas.
                    </p>
                </div>
            </div>
        </section>
    );
};
