// Dependency-free canvas confetti. Call fireConfetti() from event handlers / effects.

type Options = {
  count?: number;
  /** 0–1 position on screen, default centre-ish. */
  origin?: { x: number; y: number };
  /** Spread angle in degrees, default 70. */
  spread?: number;
  /** Launch speed multiplier, default 1. */
  power?: number;
  colors?: string[];
};

const COLORS = ["#f59e0b", "#ff4d8d", "#0b7fd6", "#12a150", "#7c3aed", "#fb923c"];

export function fireConfetti({
  count = 90,
  origin = { x: 0.5, y: 0.6 },
  spread = 70,
  power = 1,
  colors = COLORS,
}: Options = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "100",
  });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d");
  if (!g) {
    canvas.remove();
    return;
  }
  g.scale(dpr, dpr);

  const ox = origin.x * window.innerWidth;
  const oy = origin.y * window.innerHeight;
  const rad = (d: number) => (d * Math.PI) / 180;

  const parts = Array.from({ length: count }, () => {
    const angle = rad(-90 + (Math.random() - 0.5) * spread * 2);
    const speed = (6 + Math.random() * 10) * power;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 7,
      h: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      ttl: 70 + Math.random() * 60,
    };
  });

  let frame = 0;
  function step() {
    g!.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = 0;
    for (const p of parts) {
      p.life++;
      if (p.life > p.ttl) continue;
      alive++;
      p.vy += 0.28; // gravity
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      g!.save();
      g!.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
      g!.translate(p.x, p.y);
      g!.rotate(p.rot);
      g!.fillStyle = p.color;
      g!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      g!.restore();
    }
    if (alive > 0 && frame++ < 400) requestAnimationFrame(step);
    else canvas.remove();
  }
  requestAnimationFrame(step);
}
