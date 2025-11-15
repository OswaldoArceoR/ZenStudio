// Actualizar reloj en tiempo real
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  document.getElementById("clock").textContent = `${hours}:${minutes} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// Mostrar/ocultar la tarjeta de Birds Chirping y reproducir audio
const leftCheckbox = document.getElementById("left-checkbox");
const rightCheckbox = document.getElementById("right-checkbox");
const birdsBox = document.getElementById("birds");
const birdsCheckbox = document.getElementById("birds-checkbox");
const birdsAudio = document.getElementById("birds-audio");

// Mostrar/ocultar Birds Chirping box
leftCheckbox.addEventListener("change", () => {
  if (leftCheckbox.checked) {
    birdsBox.classList.remove("hidden");
  } else {
    birdsBox.classList.add("hidden");
    birdsCheckbox.checked = false;
    birdsAudio.pause();
    birdsAudio.currentTime = 0;
  }
});

rightCheckbox.addEventListener("change", () => {
  if (rightCheckbox.checked) {
    birdsBox.classList.add("hidden");
    leftCheckbox.checked = false;
    birdsCheckbox.checked = false;
    birdsAudio.pause();
    birdsAudio.currentTime = 0;
  }
});

// Selección/deselección y reproducción de audio
birdsCheckbox.addEventListener("change", () => {
  if (birdsCheckbox.checked) {
    birdsAudio.currentTime = 0;
    birdsAudio.play();
  } else {
    birdsAudio.pause();
    birdsAudio.currentTime = 0;
  }
});
