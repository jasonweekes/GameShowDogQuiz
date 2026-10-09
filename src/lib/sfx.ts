// Tiny synthesized sound effects (Web Audio, no asset files). Muting is remembered in localStorage.

export type Sfx = "click" | "correct" | "wrong" | "tick" | "hint" | "pause" | "fanfare";

const KEY = "breedrush.muted";
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY, muted ? "1" : "0");
  } catch {
    /* storage unavailable: mute just won't persist */
  }
  listeners.forEach((l) => l());
}

/** For useSyncExternalStore. */
export function subscribeMuted(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.07,
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t0 = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playSfx(name: Sfx) {
  if (isMuted()) return;
  const c = audio();
  if (!c) return;
  switch (name) {
    case "click":
      tone(c, 520, 0, 0.07, "triangle", 0.05);
      break;
    case "correct": // bright rising arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, i * 0.07, 0.22, "triangle", 0.07));
      break;
    case "wrong": // low descending buzz
      tone(c, 220, 0, 0.18, "sawtooth", 0.05);
      tone(c, 165, 0.13, 0.28, "sawtooth", 0.05);
      break;
    case "tick":
      tone(c, 880, 0, 0.05, "square", 0.025);
      break;
    case "hint":
      tone(c, 659.25, 0, 0.12, "sine", 0.06);
      tone(c, 987.77, 0.1, 0.18, "sine", 0.05);
      break;
    case "pause":
      tone(c, 392, 0, 0.1, "triangle", 0.05);
      tone(c, 294, 0.09, 0.14, "triangle", 0.05);
      break;
    case "fanfare":
      [392, 392, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(c, f, i * 0.11, 0.3, "triangle", 0.07),
      );
      break;
  }
}
