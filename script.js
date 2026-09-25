const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
let particles = [];
let mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
let W, H;
let adminMode = false;

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
    ctx.fillStyle = adminMode ? "#ff3b4b" : p.color;
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

// ---- join instructions device tabs ----
const joinTabs = [...document.querySelectorAll(".join-tab")];
joinTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    joinTabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
      document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    });
  });
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
    const response = await fetch("https://api.mcstatus.io/v2/status/java/serwer5d.ivhs.pl");
    const data = await response.json();

    if (data.online) {
      showOnline(data);
    } else {
      showOffline();
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
function showToast(text, duration = 1800) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

// ---- crew admin easter egg and profile management ----
const crewTitle = document.getElementById("crew-title");
const adminToolbar = document.getElementById("admin-toolbar");
const adminDialog = document.getElementById("admin-dialog");
const photoDialog = document.getElementById("photo-dialog");
const loginView = document.getElementById("admin-login-view");
const panelView = document.getElementById("admin-panel-view");
const loginError = document.getElementById("login-error");
const passwordError = document.getElementById("password-error");
const photoError = document.getElementById("photo-error");
const cropCanvas = document.getElementById("crop-canvas");
const cropCtx = cropCanvas.getContext("2d");
const photoZoom = document.getElementById("photo-zoom");
let titleClicks = [];
let crewSession = null;
let cropImage = null;
let cropObjectUrl = null;
let cropZoom = 1;
let cropRotation = 0;
let cropOffset = { x: 0, y: 0 };
let dragPoint = null;

crewTitle.addEventListener("click", () => {
  const now = Date.now();
  titleClicks = titleClicks.filter((stamp) => now - stamp < 60000);
  titleClicks.push(now);
  if (titleClicks.length >= 15 && !adminMode) {
    adminMode = true;
    document.body.classList.add("admin-mode");
    adminToolbar.hidden = false;
    showToast("Tryb administratora aktywny, odśwież stronę aby wyłączyć", 5000);
  }
});

async function crewApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (crewSession?.token) headers.set("authorization", `Bearer ${crewSession.token}`);
  if (options.body && !(options.body instanceof Blob)) headers.set("content-type", "application/json");
  const response = await fetch(path, { ...options, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Nie udało się wykonać tej operacji.");
  return result;
}

function openAdminDialog() {
  adminDialog.hidden = false;
  document.body.classList.add("modal-open");
  loginView.hidden = !!crewSession;
  panelView.hidden = !crewSession;
  loginError.textContent = "";
  if (crewSession) loadAdminProfiles();
  else adminDialog.querySelector('[name="username"]').focus();
}

function closeAdminDialog() {
  adminDialog.hidden = true;
  document.body.classList.remove("modal-open");
}

document.getElementById("admin-open").addEventListener("click", openAdminDialog);
adminDialog.querySelectorAll("[data-close-modal], .modal-close").forEach((el) => {
  el.addEventListener("click", closeAdminDialog);
});

document.getElementById("admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  loginError.textContent = "";
  submit.disabled = true;
  try {
    crewSession = await crewApi("/api/crew/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.elements.username.value,
        password: form.elements.password.value
      })
    });
    form.reset();
    loginView.hidden = true;
    panelView.hidden = false;
    await loadAdminProfiles();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

async function loadCrewProfiles() {
  try {
    const { profiles } = await crewApi("/api/crew/profiles");
    applyCrewAvatars(profiles);
  } catch {
    // The public crew list remains available if the backend is not enabled yet.
  }
}

function applyCrewAvatars(profiles) {
  profiles.forEach((profile) => {
    const member = [...document.querySelectorAll("#crew .member")]
      .find((row) => row.querySelector(".member-name")?.textContent.trim() === profile.username);
    const image = member?.querySelector(".avatar-image");
    const initial = member?.querySelector(".avatar > span");
    const editButton = member?.querySelector(".member-photo-edit");
    if (!image || !initial) return;
    if (profile.avatar_url) {
      image.src = profile.avatar_url;
      image.hidden = false;
      initial.hidden = true;
    } else {
      image.removeAttribute("src");
      image.hidden = true;
      initial.hidden = false;
    }
    if (editButton) {
      editButton.hidden = !crewSession || crewSession.username !== profile.username;
      editButton.onclick = () => openPhotoEditor(profile.username);
    }
  });
}

async function loadAdminProfiles() {
  const list = document.getElementById("admin-profile-list");
  list.replaceChildren();
  document.getElementById("admin-session-label").textContent = `Zalogowano jako ${crewSession.username}`;
  document.getElementById("password-controls").hidden = !crewSession.canManagePasswords;
  try {
    const { profiles } = await crewApi("/api/crew/profiles");
    applyCrewAvatars(profiles);
    profiles.forEach((profile) => {
      const row = document.createElement("div");
      row.className = "admin-profile-row";
      const name = document.createElement("span");
      name.className = "admin-profile-name";
      name.textContent = profile.username;
      const button = document.createElement("button");
      button.className = "quiet-action";
      button.type = "button";
      button.textContent = "Zmiana zdjęcia profilowego";
      button.disabled = profile.username !== crewSession.username;
      button.addEventListener("click", () => openPhotoEditor(profile.username));
      row.append(name, button);
      list.append(row);
    });
  } catch (error) {
    showToast(error.message);
  }
}

document.getElementById("password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  passwordError.textContent = "";
  submit.disabled = true;
  try {
    await crewApi("/api/crew/password", {
      method: "POST",
      body: JSON.stringify({
        username: form.elements.username.value,
        password: form.elements.password.value
      })
    });
    form.elements.password.value = "";
    showToast("Hasło zostało zapisane.");
  } catch (error) {
    passwordError.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

document.getElementById("admin-logout").addEventListener("click", () => {
  crewSession = null;
  loginView.hidden = false;
  panelView.hidden = true;
  document.getElementById("admin-login-form").reset();
  loadCrewProfiles();
});

function openPhotoEditor(username) {
  if (username !== crewSession?.username) return;
  cropImage = null;
  if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
  cropObjectUrl = null;
  cropZoom = 1;
  cropRotation = 0;
  cropOffset = { x: 0, y: 0 };
  photoZoom.value = "1";
  photoError.textContent = "";
  document.getElementById("photo-file").value = "";
  document.getElementById("save-photo").disabled = true;
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  photoDialog.hidden = false;
}

function closePhotoEditor() {
  photoDialog.hidden = true;
  cropImage = null;
  if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
  cropObjectUrl = null;
}

photoDialog.querySelectorAll("[data-close-photo], .modal-close").forEach((el) => {
  el.addEventListener("click", closePhotoEditor);
});
document.getElementById("pick-photo").addEventListener("click", () => {
  document.getElementById("photo-file").click();
});

function drawCrop() {
  cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.fillStyle = "#111722";
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  if (!cropImage) return;
  const fit = cropCanvas.width / Math.min(cropImage.naturalWidth, cropImage.naturalHeight);
  const scale = fit * cropZoom;
  const quarterTurn = cropRotation % 180 !== 0;
  const renderedWidth = (quarterTurn ? cropImage.naturalHeight : cropImage.naturalWidth) * scale;
  const renderedHeight = (quarterTurn ? cropImage.naturalWidth : cropImage.naturalHeight) * scale;
  cropOffset.x = Math.max(-(renderedWidth - cropCanvas.width) / 2, Math.min((renderedWidth - cropCanvas.width) / 2, cropOffset.x));
  cropOffset.y = Math.max(-(renderedHeight - cropCanvas.height) / 2, Math.min((renderedHeight - cropCanvas.height) / 2, cropOffset.y));
  cropCtx.save();
  cropCtx.translate(cropCanvas.width / 2 + cropOffset.x, cropCanvas.height / 2 + cropOffset.y);
  cropCtx.rotate(cropRotation * Math.PI / 180);
  cropCtx.scale(scale, scale);
  cropCtx.drawImage(cropImage, -cropImage.naturalWidth / 2, -cropImage.naturalHeight / 2);
  cropCtx.restore();
}

document.getElementById("photo-file").addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0];
  photoError.textContent = "";
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
    photoError.textContent = "Wybierz zdjęcie w formacie obrazu do 10 MB.";
    return;
  }
  try {
    const image = new Image();
    if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
    cropObjectUrl = URL.createObjectURL(file);
    image.src = cropObjectUrl;
    await image.decode();
    cropImage = image;
    cropZoom = 1;
    cropRotation = 0;
    cropOffset = { x: 0, y: 0 };
    photoZoom.value = "1";
    document.getElementById("save-photo").disabled = false;
    drawCrop();
  } catch {
    photoError.textContent = "Nie udało się odczytać tego pliku.";
  }
});

photoZoom.addEventListener("input", () => {
  cropZoom = Number(photoZoom.value);
  drawCrop();
});
document.getElementById("rotate-photo").addEventListener("click", () => {
  cropRotation = (cropRotation + 90) % 360;
  drawCrop();
});

cropCanvas.addEventListener("pointerdown", (event) => {
  if (!cropImage) return;
  cropCanvas.setPointerCapture(event.pointerId);
  dragPoint = { x: event.clientX, y: event.clientY };
});
cropCanvas.addEventListener("pointermove", (event) => {
  if (!dragPoint) return;
  const rect = cropCanvas.getBoundingClientRect();
  const factor = cropCanvas.width / rect.width;
  cropOffset.x += (event.clientX - dragPoint.x) * factor;
  cropOffset.y += (event.clientY - dragPoint.y) * factor;
  dragPoint = { x: event.clientX, y: event.clientY };
  drawCrop();
});
cropCanvas.addEventListener("pointerup", () => { dragPoint = null; });
cropCanvas.addEventListener("pointercancel", () => { dragPoint = null; });

document.getElementById("save-photo").addEventListener("click", async (event) => {
  if (!cropImage) return;
  const button = event.currentTarget;
  photoError.textContent = "";
  button.disabled = true;
  cropCanvas.toBlob(async (blob) => {
    try {
      if (!blob) throw new Error("Nie udało się przygotować zdjęcia.");
      const headers = { "content-type": "image/webp" };
      if (crewSession?.token) headers.authorization = `Bearer ${crewSession.token}`;
      const response = await fetch("/api/crew/avatar", { method: "POST", headers, body: blob });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać zdjęcia.");
      await loadCrewProfiles();
      closePhotoEditor();
      await loadAdminProfiles();
      showToast("Zdjęcie profilowe zostało zapisane.");
    } catch (error) {
      photoError.textContent = error.message;
      button.disabled = false;
    }
  }, "image/webp", 0.9);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAdminDialog();
    closePhotoEditor();
  }
});

loadCrewProfiles();

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
