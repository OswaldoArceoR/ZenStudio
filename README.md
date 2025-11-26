
# ZenStudio

ZenStudio es una aplicación web diseñada para mejorar tu flujo de trabajo mediante un entorno personalizable y libre de distracciones. Combina herramientas esenciales de gestión de tiempo con una atmósfera relajante ajustada a tus gustos. Esta aplicación funciona como una "Single Page Application" (SPA) construida con tecnologías web estándar, ofreciendo una experiencia fluida sin recargas constantes.


## Demo
[Link de la paguina en el server, pendiente!](https://github.com/OswaldoArceoR/ZenStudio.git)




## Screenshots

![App Screenshot](assets/IMAGENES/inicio.png)

![App Screenshot](assets/IMAGENES/pagina1.png)

##  Características Principales

* **Sistema de Usuarios:** Registro y autenticación segura (`registro.html`, `inicioSesion.php`).
* **Persistencia en Base de Datos:** Toda tu configuración, tareas y notas se guardan en una base de datos SQL, permitiendo acceder a tu cuenta desde cualquier dispositivo.
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


---

##  Tecnologías Utilizadas

### Frontend (Cliente)
* **HTML5:** Estructura semántica de las vistas (`index.html`, `registro.html`).
* **CSS3:** Hojas de estilo modulares (`principal.css`, `perfil.css`, `inicioSesion.css`) y variables para temas.
* **JavaScript (Vanilla ES6+):** Lógica del cliente modularizada (`principal.js`, `fondos.js`, `perfil.js`).
* **React.js (JSX):** Componentes dinámicos para la Landing Page (`inicio.index.jsx`).

### Backend (Servidor)
* **PHP:** Lógica del servidor, manejo de sesiones, subida de archivos y API REST interna (`paginaprincipal.php`, `guardarConfiguracion.php`, `subirMusicaUsuario.php`).

### Base de Datos
* **SQL:** Base de datos relacional para usuarios, configuración y contenido multimedia (`zenstudio.sql`).

---

##  Estructura del Proyecto

```text
ZenStudio/
├── CSS/                       # Hojas de estilo modulares
│   ├── general.css            # Estilos base
│   ├── inicioSesion.css
│   ├── perfil.css
│   ├── principal.css          # Estilos del Dashboard
│   ├── registro.css
│   └── styleprueba.css
├── JS/                        # Lógica del Frontend
│   ├── fondos.js              # Gestión de fondos animados
│   ├── perfil.js              # Gestión de usuario
│   ├── principal.js           # Core del Dashboard
│   ├── principalP1.js a P5.js # Módulos divididos del dashboard
│   └── script.js
├── PHP/                       # Lógica del Backend (API & Controladores)
│   ├── inicioSesion.php
│   ├── registroUsuario.php
│   ├── paginaprincipal.php    # Vista protegida del Dashboard
│   ├── guardarConfiguracion.php
│   ├── subirFondoUsuario.php
│   └── ... (otros controladores)
├── db/                        # Base de Datos
│   └── zenstudio.sql          # Script de creación de tablas
├── JSX/                       # Componentes React
│   └── inicio.index.jsx
├── IMAGENES/                  # Recursos gráficos (Avatares, GIFs)
├── SONIDOS/                   # Recursos de audio base
├── index.html                 # Landing Page (Bienvenida)
├── registro.html              # Formulario de Registro
└── README.md                  # Documentación
```
## CREDITS AND AUTHORS

- Jesus Daniel Bacelis Santos - Desarrollador Frontend
- Oswaldo D'karlo Arceo Ramirez - Desarrollador Backend
- Jenrri Armin Puch Dzul - Desarrollador Backend
- Didier Francisco Cupul Tec - Desarrollador Frontend
