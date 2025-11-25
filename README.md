
# ZenStudio

ZenStudio es una aplicación web diseñada para mejorar tu flujo de trabajo mediante un entorno personalizable y libre de distracciones. Combina herramientas esenciales de gestión de tiempo con una atmósfera relajante ajustada a tus gustos. Esta aplicación funciona como una "Single Page Application" (SPA) construida con tecnologías web estándar, ofreciendo una experiencia fluida sin recargas constantes.


## Demo
[Link de la paguina en el server, pendiente!](https://github.com/OswaldoArceoR/ZenStudio.git)




## Screenshots

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)

![App Screenshot](https://via.placeholder.com/468x300?text=App+Screenshot+Here)


## Features

- **Temporizador Pomodoro**: Totalmente personalizable y con notificaciones visuales para gestionar tus ciclos de trabajo y descanso.
- **Mezclador de Sonidos Ambientales:**
 - Incluye sonidos predefinidos de alta calidad (Lluvia, Océano,Río, etc.).
 - Capacidad de subir tus propios audios desde tu equipo.
 - Control de volumen independiente para cada sonido (mezcla a tu gusto).
 - Interruptor "Master Mute" en la barra superior para silenciar todo al instante.
- **Fondos Animados (Espacios)**: Cambia la atmósfera visual con fondos GIF (anime, hoguera, disco) o sube tus propias imágenes.
- **Notas Rápidas**: Editor de texto enriquecido que soporta formato básico (negritas, cursivas, listas) y guarda todo automáticamente.
- **Calendario y Eventos**: Un planificador visual interactivo para organizar tu día.
- **Gestor de Tareas**: Lista tipo "To-Do" simple con efectos de sonido al completar tareas.
- **Reproductor Multimedia**: Integración para ver videos de YouTube sin salir de la app y reproductor de archivos locales (MP3).
- **Interfaz Flotante**: Paneles estilo "ventanas" que puedes arrastrar (drag & drop), abrir y cerrar según lo necesites.
- **Modo Oscuro/Claro**: Detección automática de preferencia de sistema y botón de cambio manual.
- **Persistencia de Datos**: Todo tu progreso (tareas, notas, configuración, fondos personalizados) se guarda automáticamente en la memoria del navegador.


## Tech Stack

**HTML:** Estructura semántica y accesibilidad.

**CSS3:** Variables CSS para manejo de temas, Flexbox/Grid para el diseño y animaciones suaves.

**JavaScript (Vanilla ES6+):** Lógica modular, manipulación del DOM y gestión de estado local sin frameworks pesados.

**React.js (v18):** Utilizado específicamente en la página de inicio para crear componentes modulares (Hero, Secciones) y controlar estados de animación mediante Hooks .


## File structure

El proyecto se organiza en dos directorios principales:

1. **IMAGENES/:** Carpeta externa que contiene los recursos gráficos globales (fondos GIF, etc.).

2. **Prueba2_PaginaPrincipal/**: Carpeta principal que contiene el código fuente y recursos locales:
o **Páginas (HTML):**
 - inicio.html: Página de Aterrizaje (Landing Page).
 - paginaprincipal.html: Dashboard principal (App).
 - acceso.html: Pantalla de Login/Registro.
 - profile.html: Configuración de perfil de usuario.
o **Estilos (CSS):**
 - styles.css: Variables globales y estilos del dashboard.
 - inicio.css, acceso.css, profile.css: Estilos específicos de cada sección.
o **Lógica (JS & JSX):**
 - app.js: Cerebro principal de la aplicación (Lógica del Dashboard).
 - inicio.jsx: Componentes React para la bienvenida.
 - components.jsx: Componentes React compartidos.
 - inicio.js, acceso.js, profile.js: Scripts de soporte.
o **Recursos Multimedia (Locales):**
 - Imágenes: logo.jpeg, zenstudio.png, anime.gif, hogera.gif.
 - Audio: gato.mp3, rio.mp3, Sonidodelluvia.mp3, Sonidodeoceano.mp3.
 

## CREDITS AND AUTHORS

- Jesus Daniel Bacelis Santos - Desarrollador Frontend
- Oswaldo D'karlo Arceo Ramirez - Desarrollador Backend
- Jenrri Armin Puch Dzul - Desarrollador Backend
- Didier Francisco Cupul Tec - Desarrollador Frontend
