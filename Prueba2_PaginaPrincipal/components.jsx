'use strict';

const { useState, useEffect } = React;

/**
 * Componente para el botón de cambio de tema (Claro/Oscuro).
 * Gestiona su propio estado y la lógica para aplicar el tema.
 */
function ThemeToggleButton() {
  // 1. Estado: 'theme' guarda el tema actual ('light' o 'dark').
  // Lo inicializamos desde localStorage o por defecto a 'light'.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('zen_theme') || 'light';
  });

  // 2. Efecto: Se ejecuta cuando el estado 'theme' cambia.
  // Se encarga de actualizar el atributo en <html> y guardar en localStorage.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zen_theme', theme);
  }, [theme]); // El efecto solo se re-ejecuta si 'theme' cambia.

  // 3. Función para cambiar el tema.
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // 4. Renderizado del botón.
  // Usamos el estado 'theme' para determinar qué icono mostrar.
  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title="Alternar Tema"
      aria-pressed={theme === 'dark'}
    >
      <svg id="moon-icon" className="icon-toggle" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <svg id="sun-icon" className="icon-toggle" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    </button>
  );
}