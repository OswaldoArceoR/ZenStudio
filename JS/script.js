/* ========== SCROLL REVEAL ========== */
const observer = new IntersectionObserver(entries =>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){
            entry.target.classList.add("show");
        }
    });
});
document.querySelectorAll(".hidden").forEach(el => observer.observe(el));


/* ========== SONIDO ========== */
const soundBtn = document.getElementById("sound-btn");
const audio = document.getElementById("ambient-sound");
let muted = true;

if (soundBtn && audio) {
    soundBtn.onclick = () =>{
        muted = !muted;
        if(muted){
            audio.pause();
            soundBtn.textContent = "🔇";
        }else{
            audio.play();
            soundBtn.textContent = "🔊";
        }
    };
}


/* ========== SWITCH ANIMADO (THEME TOGGLE) ========== */
const toggle = document.getElementById("themeToggle");

// Aplicar estado guardado
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    if (toggle) toggle.checked = true;
}

// Cambios en el switch
if (toggle) {
    toggle.addEventListener("change", () => {
        if (toggle.checked) {
            document.body.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("theme", "light");
        }
    });
}

// Se elimina el código del botón simple de tema, ya que se reemplazó por el switch en todas las páginas.