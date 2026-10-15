const clickSound = new Audio("uploads/minecraft-click-cropped.mp3");
clickSound.preload = "auto";

document.addEventListener("click", () => {
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}, true);

const siteNav = document.getElementById("site-nav");
function updateNavScrollState() {
  siteNav.classList.toggle("scrolled", window.scrollY > 0);
}
updateNavScrollState();
window.addEventListener("scroll", updateNavScrollState, { passive: true });
