const envelope = document.getElementById("envelope");
const envelopeStage = document.getElementById("envelopeStage");
const invitation = document.getElementById("invitation");
const hint = document.getElementById("hint");
const canvas = document.getElementById("fireworks");
const ctx = canvas.getContext("2d");
const soundtrack = document.getElementById("soundtrack");
const musicToggle = document.getElementById("musicToggle");
const progress = document.getElementById("progress");

const EVENT_DATE = new Date("2026-10-03T11:00:00+10:00");
const COLORS = ["#f4d27a", "#fff4d8", "#f08a5d", "#e23e3e", "#7ec8e3", "#f7a1c4", "#ffe066"];

let opened = false;
let touchStartY = 0;
let fireworksAnimation = 0;
let musicEnabled = true;
let fireworksActive = false;

function resizeCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function random(min, max) {
  return min + Math.random() * (max - min);
}

function createBurst(x, y, color) {
  const count = 70 + Math.floor(Math.random() * 36);
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + random(-0.18, 0.18);
    const speed = random(2.2, 8.2);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: random(0.008, 0.015),
      size: random(2.2, 4.4),
      color: Math.random() > 0.7 ? "#fff7e4" : color,
      gravity: 0.038,
    });
  }
  return particles;
}

function createRocket() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const leftSide = Math.random() > 0.5;
  return {
    x: leftSide
      ? random(canvas.width * 0.06, canvas.width * 0.28)
      : random(canvas.width * 0.72, canvas.width * 0.94),
    y: canvas.height + 8,
    vy: random(-9.5, -7.2),
    vx: random(-0.55, 0.55),
    targetY: random(canvas.height * 0.1, canvas.height * 0.38),
    color,
    trail: [],
  };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMusicAudible() {
  return musicEnabled && !soundtrack.paused && !soundtrack.muted;
}

function shouldLaunchFireworks(startedAt, now) {
  if (prefersReducedMotion()) return false;
  if (isMusicAudible()) return true;
  return now - startedAt < 2500;
}

function startFireworks() {
  if (prefersReducedMotion() || fireworksActive) return;
  window.cancelAnimationFrame(fireworksAnimation);
  fireworksActive = true;

  const rockets = [];
  const sparks = [];
  const startedAt = performance.now();
  let nextLaunchAt = startedAt + 480;

  const launch = () => rockets.push(createRocket());
  const boom = (xRatio, yRatio, color) => {
    sparks.push(...createBurst(canvas.width * xRatio, canvas.height * yRatio, color));
  };

  launch();
  launch();
  boom(0.14, 0.18, COLORS[0]);
  boom(0.86, 0.14, COLORS[2]);
  boom(0.08, 0.32, COLORS[6]);
  boom(0.92, 0.3, COLORS[4]);

  function tick(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    if (shouldLaunchFireworks(startedAt, now) && now >= nextLaunchAt) {
      launch();
      if (Math.random() > 0.42) {
        boom(random(0.06, 0.24), random(0.1, 0.34), COLORS[Math.floor(Math.random() * COLORS.length)]);
      }
      if (Math.random() > 0.55) {
        boom(random(0.76, 0.95), random(0.1, 0.34), COLORS[Math.floor(Math.random() * COLORS.length)]);
      }
      nextLaunchAt = now + random(520, 980);
    }

    for (let i = rockets.length - 1; i >= 0; i -= 1) {
      const rocket = rockets[i];
      rocket.x += rocket.vx;
      rocket.y += rocket.vy;
      rocket.vy += 0.05;
      rocket.trail.push({ x: rocket.x, y: rocket.y });
      if (rocket.trail.length > 12) rocket.trail.shift();

      if (rocket.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = rocket.color;
        ctx.lineWidth = 2.4;
        ctx.globalAlpha = 0.9;
        ctx.moveTo(rocket.trail[0].x, rocket.trail[0].y);
        rocket.trail.forEach((dot) => ctx.lineTo(dot.x, dot.y));
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff8dc";
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 3, 0, Math.PI * 2);
      ctx.fill();

      if (rocket.y <= rocket.targetY || rocket.vy >= -0.3) {
        sparks.push(...createBurst(rocket.x, rocket.y, rocket.color));
        rockets.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i];
      spark.vx *= 0.986;
      spark.vy *= 0.986;
      spark.vy += spark.gravity;
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.life -= spark.decay;

      if (spark.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = spark.life;
      ctx.fillStyle = spark.color;
      ctx.shadowBlur = 16;
      ctx.shadowColor = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (shouldLaunchFireworks(startedAt, now) || rockets.length || sparks.length) {
      fireworksAnimation = window.requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      fireworksActive = false;
    }
  }

  fireworksAnimation = window.requestAnimationFrame(tick);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function updateCountdown() {
  const now = Date.now();
  const distance = Math.max(0, EVENT_DATE.getTime() - now);
  const days = Math.floor(distance / 86400000);
  const hours = Math.floor((distance % 86400000) / 3600000);
  const minutes = Math.floor((distance % 3600000) / 60000);
  const seconds = Math.floor((distance % 60000) / 1000);

  document.getElementById("days").textContent = pad(days);
  document.getElementById("hours").textContent = pad(hours);
  document.getElementById("minutes").textContent = pad(minutes);
  document.getElementById("seconds").textContent = pad(seconds);
}

function startCountdown() {
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
}

function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? window.scrollY / max : 0;
  progress.style.transform = `scaleY(${Math.min(1, Math.max(0, ratio))})`;
}

function syncMusicButton() {
  const playing = !soundtrack.paused && !soundtrack.muted;
  musicToggle.classList.toggle("is-muted", !playing);
  musicToggle.setAttribute("aria-label", playing ? "Mute music" : "Play music");
}

function playMusic() {
  if (!musicEnabled) return;
  soundtrack.muted = false;
  soundtrack.volume = 0.42;
  const playPromise = soundtrack.play();
  if (playPromise) {
    playPromise.then(syncMusicButton).catch(syncMusicButton);
  } else {
    syncMusicButton();
  }
}

function toggleMusic(event) {
  event.stopPropagation();
  if (soundtrack.paused || soundtrack.muted) {
    musicEnabled = true;
    playMusic();
    return;
  }
  musicEnabled = false;
  soundtrack.pause();
  syncMusicButton();
}

function revealInvitation() {
  invitation.hidden = false;
  envelopeStage.classList.add("is-leaving");
  musicToggle.hidden = false;
  document.body.classList.add("is-open");
  window.setTimeout(() => {
    envelopeStage.style.display = "none";
  }, 850);
}

function openEnvelope() {
  if (opened) return;
  opened = true;
  envelope.classList.add("open");
  envelope.setAttribute("aria-label", "Housewarming invitation");
  hint.classList.add("hidden");
  playMusic();
  window.setTimeout(startFireworks, 200);
  window.setTimeout(revealInvitation, 1400);
}

function handleEnvelopeGesture() {
  playMusic();
  openEnvelope();
}

envelope.addEventListener("pointerdown", handleEnvelopeGesture);
envelope.addEventListener("click", handleEnvelopeGesture);
envelope.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleEnvelopeGesture();
  }
});

musicToggle.addEventListener("click", toggleMusic);
soundtrack.addEventListener("playing", () => {
  syncMusicButton();
  if (opened) startFireworks();
});
soundtrack.addEventListener("pause", syncMusicButton);
soundtrack.addEventListener("ended", syncMusicButton);
soundtrack.addEventListener("canplay", () => {
  if (opened && musicEnabled && soundtrack.paused) playMusic();
});

window.addEventListener(
  "pointerdown",
  (event) => {
    if (musicToggle.contains(event.target)) return;
    if (opened && musicEnabled && soundtrack.paused) playMusic();
  },
  { passive: true }
);
window.addEventListener("scroll", updateProgress, { passive: true });

window.addEventListener(
  "wheel",
  (event) => {
    if (!opened && event.deltaY > 24) openEnvelope();
  },
  { passive: true }
);

window.addEventListener(
  "touchstart",
  (event) => {
    touchStartY = event.touches[0].clientY;
  },
  { passive: true }
);

window.addEventListener(
  "touchend",
  (event) => {
    const distance = touchStartY - event.changedTouches[0].clientY;
    if (!opened && distance > 48) openEnvelope();
  },
  { passive: true }
);

startCountdown();
updateProgress();
