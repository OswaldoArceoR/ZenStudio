// Función para establecer cookies
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

// Función auxiliar para leer cookies (para verificar el estado inicial)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

/* ========== SCROLL REVEAL ========== */
const observer = new IntersectionObserver(entries =>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){
            entry.target.classList.add("show");
        }
    });
});
document.querySelectorAll(".hidden").forEach(el => observer.observe(el));


/* ========== SONIDO PERSISTENTE ========== */
const soundBtn = document.getElementById("sound-btn");
const audio = document.getElementById("ambient-sound");

// Recuperamos la preferencia guardada (localStorage)
// Si no existe, asumimos que está silenciado (true)
let savedMutedState = localStorage.getItem("zen_index_muted");
let muted = savedMutedState === 'false' ? false : true;

if (soundBtn && audio) {
    //  Aplicar estado inicial
    if (muted) {
        audio.muted = true;
        soundBtn.textContent = "🔇";
    } else {
        audio.muted = false;
        soundBtn.textContent = "🔊";
        // Intentar reproducir automáticamente
        audio.play().catch(error => {
            console.log("Reproducción automática bloqueada por el navegador hasta interacción del usuario.");
        });
    }

    //  Manejar el clic
    soundBtn.onclick = () => {
        muted = !muted;
        if (muted) {
            audio.pause();
            soundBtn.textContent = "🔇";
        } else {
            audio.play();
            soundBtn.textContent = "🔊";
        }
        // Guardar preferencia para la próxima vez
        localStorage.setItem("zen_index_muted", muted);
    };
}


/* ========== SWITCH ANIMADO (COOKIES - ZEN_THEME) ========== */
const toggle = document.getElementById("themeToggle");

// 1. Sincronizar estado inicial
// Verificamos si la cookie 'zen_theme' es 'dark' o si el body ya tiene la clase
if (getCookie("zen_theme") === "dark" || document.body.classList.contains("dark-mode")) {
    document.body.classList.add("dark-mode");
    if (toggle) toggle.checked = true;
}

//  Cambios en el switch
if (toggle) {
    toggle.addEventListener("change", () => {
        if (toggle.checked) {
            // Activar modo oscuro
            document.body.classList.add("dark-mode");
            setCookie("zen_theme", "dark", 365); // Guardar cookie por 1 año
        } else {
            // Desactivar modo oscuro
            document.body.classList.remove("dark-mode");
            setCookie("zen_theme", "light", 365); // Guardar cookie por 1 año
        }
    });
}