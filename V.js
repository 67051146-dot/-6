"use strict";

const book = document.getElementById("book");
const sheets = Array.from(document.querySelectorAll(".sheet")).reverse();
const status = document.getElementById("page-status");
const canvas = document.getElementById("magic-canvas");
const ctx = canvas.getContext("2d");
const motion = matchMedia("(prefers-reduced-motion: reduce)");

let position = 0;
let turning = false;
let audioContext;
let particles = [];
let lastDustAt = 0;

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

addEventListener("resize", resize);
resize();

function burst() {
  if (motion.matches) return;

  const rect = book.getBoundingClientRect();

  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;

    particles.push({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1
    });
  }
}

// สร้างประกาย Pixie Dust ตามตำแหน่งเมาส์
addEventListener("pointermove", event => {
  if (motion.matches || event.pointerType === "touch") return;

  const now = performance.now();

  // จำกัดความถี่เพื่อให้แอนิเมชันลื่น
  if (now - lastDustAt < 16) return;
  lastDustAt = now;

  for (let i = 0; i < 3; i++) {
    particles.push({
      x: event.clientX + (Math.random() - 0.5) * 12,
      y: event.clientY + (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 1.8,
      vy: -Math.random() * 1.8 - 0.3,
      life: 0.5 + Math.random() * 0.5
    });
  }

  if (particles.length > 180) {
    particles.splice(0, particles.length - 180);
  }
}, { passive: true });

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.life > 0);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.025;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(246,215,132,${Math.max(0, p.life)})`;
    ctx.fill();
  }

  requestAnimationFrame(animate);
}

animate();

function sound() {
  try {
    audioContext ??= new (
      window.AudioContext || window.webkitAudioContext
    )();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      230,
      audioContext.currentTime
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      85,
      audioContext.currentTime + 0.2
    );

    gain.gain.setValueAtTime(
      0.045,
      audioContext.currentTime
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.22
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.23);
  } catch (_) {
    // หากเล่นเสียงไม่ได้ หนังสือยังใช้งานต่อได้
  }
}

function render() {
  book.classList.toggle("opened", position > 0);

  sheets.forEach((sheet, index) => {
    sheet.classList.toggle("flipped", index < position);

    sheet.style.zIndex = index < position
      ? String(index + 1)
      : String(sheets.length - index + 1);
  });

  if (position === 0) {
    status.textContent = "หน้าปก";
  } else if (position === sheets.length) {
    status.textContent = "ปกหลัง";
  } else {
    const leftPage = position * 2 - 1;
    status.textContent = `หน้า ${leftPage}–${leftPage + 1}`;
  }
}

function turn(direction) {
  if (turning || (direction < 0 && position === 0)) return;

  if (direction > 0 && position === sheets.length) {
    position = 0;
    render();
    sound();
    burst();
    return;
  }

  turning = true;
  const from = position;
  position += direction;
  render();

  sheets[direction > 0 ? from : position].style.zIndex = "10";

  sound();
  burst();

  setTimeout(() => {
    turning = false;
    render();
  }, motion.matches ? 20 : 980);
}

book.addEventListener("click", event => {
  if (event.target.closest("video")) return;
  if (position === 0 || position === sheets.length) {
    turn(1);
    return;
  }

  const center = book.getBoundingClientRect().left;
  turn(event.clientX < center ? -1 : 1);
});

addEventListener("keydown", event => {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    turn(1);
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    turn(-1);
  }
});

render();