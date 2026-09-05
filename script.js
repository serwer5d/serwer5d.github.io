const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
let particles = [];
let mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const COLORS = ["#6f7bff", "#4fd17e", "#ff8c42", "#a98bff"];

function makeParticle() {
  const speed = 0.2 + Math.random() * 0.35;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 1 + Math.random() * 2.2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 0.3 + Math.random() * 0.5,
    tw: 0.5 + Math.random() * 1.2,
    phase: Math.random() * Math.PI * 2
  };
}

const COUNT = Math.min(90, Math.floor((W * H) / 16000));
for (let i = 0; i < COUNT; i++) particles.push(makeParticle());

canvas.addEventListener("mousemove", (e) => {
  mouse.tx = e.clientX;
  mouse.ty = e.clientY;
});
canvas.addEventListener("mouseleave", () => {
  mouse.tx = -9999;
  mouse.ty = -9999;
});
window.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  mouse.tx = t.clientX;
  mouse.ty = t.clientY;
}, { passive: true });

let t = 0;
function loop() {
  t += 0.016;
  mouse.x += (mouse.tx - mouse.x) * 0.12;
  mouse.y += (mouse.ty - mouse.y) * 0.12;

  ctx.clearRect(0, 0, W, H);

  for (let p of particles) {
    p.x += p.vx;
    p.y += p.vy;

    const dx = p.x - mouse.x;
    const dy = p.y - mouse.y;
    const dist = Math.hypot(dx, dy);
    const R = 130;
    if (dist < R && dist > 0.01) {
      const force = (R - dist) / R;
      p.x += (dx / dist) * force * 2.2;
      p.y += (dy / dist) * force * 2.2;
    }

    if (p.x < -20) p.x = W + 20;
    if (p.x > W + 20) p.x = -20;
    if (p.y < -20) p.y = H + 20;
    if (p.y > H + 20) p.y = -20;

    const twinkle = 0.75 + 0.25 * Math.sin(t * p.tw + p.phase);
    ctx.globalAlpha = p.alpha * twinkle;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(loop);
}
loop();

// ---- typing animation ----
const typedEl = document.querySelector(".typed");
const TEXT = "Wspólny serwer Minecraft klasy 5D.";
let i = 0;
function type() {
  if (i <= TEXT.length) {
    typedEl.textContent = TEXT.slice(0, i);
    i++;
    setTimeout(type, 42);
  }
}
type();

// ---- play button scrolls to "jak dołączyć" ----
const playBtn = document.getElementById("playBtn");
playBtn.addEventListener("click", () => {
  const joinCard = document.getElementById("join");
  joinCard.scrollIntoView({ behavior: "smooth", block: "start" });
  joinCard.classList.add("flash");
  setTimeout(() => joinCard.classList.remove("flash"), 1500);
});

// ---- nav buttons scroll to their sections ----
document.querySelectorAll(".nav-links button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.scroll);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ---- mobile nav toggle ----
const nav = document.querySelector(".nav");
document.querySelector(".nav-toggle").addEventListener("click", () => {
  nav.classList.toggle("open");
});
// close menu when a link is clicked
document.querySelectorAll(".nav-links button").forEach((b) => b.addEventListener("click", () => nav.classList.remove("open")));

// ---- lightbox ----
const lightbox = document.getElementById("lightbox");
const lbImg = lightbox.querySelector(".lb-img");
document.querySelectorAll(".photo img").forEach((img) => {
  img.addEventListener("click", () => {
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("show"));
    document.body.style.overflow = "hidden";
  });
});
function closeLightbox() {
  lightbox.classList.remove("show");
  setTimeout(() => { lightbox.hidden = true; }, 250);
  document.body.style.overflow = "";
}
lightbox.addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// ---- live server status ----
async function updateServer() {
  const statusEl = document.getElementById("server-status");
  const playersLine = document.getElementById("players-line");
  const motdLine = document.getElementById("motd-line");
  const offlineMsg = document.getElementById("offline-msg");

  function showOffline() {
    statusEl.className = "offline";
    statusEl.innerHTML = '<span class="dot"></span>OFFLINE';
    playersLine.style.display = "none";
    motdLine.style.display = "none";
    offlineMsg.hidden = false;
    document.getElementById("server-icon").src = "assets/server-icon.png";
  }
  function showOnline(data) {
    statusEl.className = "online";
    statusEl.innerHTML = '<span class="dot"></span>ONLINE';
    playersLine.style.display = "";
    motdLine.style.display = "";
    offlineMsg.hidden = true;
    document.getElementById("server-icon").style.display = "";
    document.getElementById("players").textContent =
      `${data.players?.online ?? 0} / ${data.players?.max ?? 0}`;
    document.getElementById("motd").textContent =
      (() => {
        const m = (data.motd?.clean || "Brak MOTD").replace(/\n+/g, " ").trim();
        return m.length > 200 ? m.slice(0, 200) + "..." : m;
      })();
    if (data.icon) document.getElementById("server-icon").src = data.icon;
  }

  try {
    const response = await fetch("https://api.mcstatus.io/v2/status/java/serwer5d.minekeep.gg");
    const data = await response.json();

    const motd = (data.motd?.clean || "") + "";
    const offlineFlag =
      motd.includes("is offline! It will be started if you connect.");

    if (offlineFlag) {
      showOffline();
    } else {
      showOnline(data);
    }
  } catch (error) {
    statusEl.className = "";
    statusEl.textContent = "⚠️ Nie udało się sprawdzić serwera";
    playersLine.style.display = "none";
    motdLine.style.display = "none";
    offlineMsg.hidden = true;
  }
}

updateServer();
setInterval(updateServer, 30000);

// progress bar animates over each 30s refresh cycle
const progressFill = document.getElementById("progress-fill");
const refreshLabel = document.getElementById("refresh-label");
const numEl = refreshLabel.querySelector(".num");
const CYCLE = 30000;
let refreshStart = Date.now();
let lastSec = null;

function tickProgress() {
  const elapsed = Date.now() - refreshStart;
  const remaining = Math.max(0, CYCLE - elapsed);
  const sec = Math.ceil(remaining / 1000);

  if (sec !== lastSec) {
    lastSec = sec;
    numEl.classList.remove("roll");
    void numEl.offsetWidth;
    numEl.textContent = sec;
    numEl.classList.add("roll");
  }

  progressFill.style.width = ((elapsed / CYCLE) * 100) + "%";
  requestAnimationFrame(tickProgress);
}
tickProgress();

setInterval(() => { refreshStart = Date.now(); }, CYCLE);

const toast = document.getElementById("toast");
let toastTimer = null;
function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.dataset.copy;
    const old = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    btn.textContent = "Skopiowano!";
    showToast("Adres skopiowany do schowka.");
    setTimeout(() => { btn.textContent = old; }, 1500);
  });
});

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));