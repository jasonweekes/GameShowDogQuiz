// A circular countdown. `remaining` and `max` are in seconds.

export default function TimerRing({
  remaining,
  max,
  paused = false,
}: {
  remaining: number;
  max: number;
  paused?: boolean;
}) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remaining / max));
  const tone = remaining > 8 ? "var(--cyan)" : remaining > 4 ? "var(--amber)" : "var(--bad)";
  const urgent = remaining <= 4 && !paused;
  return (
    <div
      role="timer"
      aria-label={`${Math.ceil(remaining)} seconds left`}
      className={`relative size-[4.75rem] ${urgent ? "animate-pulse-ring" : ""}`}
    >
      <svg viewBox="0 0 76 76" className="size-full -rotate-90 overflow-visible">
        <circle cx="38" cy="38" r={r} fill="rgb(255 255 255 / 0.92)" stroke="rgb(40 36 100 / 0.12)" strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke 0.3s", filter: `drop-shadow(0 0 6px ${tone})` }}
        />
      </svg>
      <span className="font-display absolute inset-0 grid place-items-center text-2xl tabular-nums" style={{ color: tone }}>
        {Math.ceil(remaining)}
      </span>
    </div>
  );
}
