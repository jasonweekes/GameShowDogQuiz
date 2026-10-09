// Tiffee: a cartoon dog in side view. The legs, tail, ears and speed lines animate (see "Tiffee the dog"
// in globals.css) when the parent .chat-fab is hovered/focused, or when `running` is true.

export default function DogRunner({
  running = false,
  className = "",
}: {
  running?: boolean;
  className?: string;
}) {
  const fur = "#e8a15b";
  const furDark = "#c77a2e";
  const cream = "#f6d9a8";
  const brown = "#8a4b1e";

  return (
    <svg
      viewBox="0 0 140 104"
      className={`dog-svg ${running ? "is-running" : ""} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* Speed lines trailing behind the dog */}
      <g className="dog-speed" stroke="#8e93c4" strokeWidth="3.5" strokeLinecap="round">
        <line x1="6" y1="40" x2="22" y2="40" />
        <line x1="0" y1="54" x2="18" y2="54" />
        <line x1="8" y1="68" x2="22" y2="68" />
      </g>

      <g className="dog-body">
        {/* Tail */}
        <g className="dog-tail">
          <path d="M32 50 C 18 44, 12 30, 20 20" stroke={fur} strokeWidth="9" fill="none" strokeLinecap="round" />
        </g>

        {/* Far legs (behind the body) */}
        <g className="dog-leg dog-leg-a">
          <rect x="36" y="62" width="11" height="30" rx="5.5" fill={furDark} />
          <ellipse cx="42.5" cy="93" rx="8" ry="4.5" fill={brown} />
        </g>
        <g className="dog-leg dog-leg-b">
          <rect x="84" y="62" width="11" height="30" rx="5.5" fill={furDark} />
          <ellipse cx="90.5" cy="93" rx="8" ry="4.5" fill={brown} />
        </g>

        {/* Body and belly */}
        <ellipse cx="64" cy="56" rx="38" ry="20" fill={fur} />
        <ellipse cx="68" cy="67" rx="26" ry="9" fill={cream} />

        {/* Near legs (in front of the body) */}
        <g className="dog-leg dog-leg-b">
          <rect x="50" y="62" width="12" height="32" rx="6" fill={fur} />
          <ellipse cx="56.5" cy="95" rx="8.5" ry="4.8" fill={brown} />
        </g>
        <g className="dog-leg dog-leg-a">
          <rect x="72" y="62" width="12" height="32" rx="6" fill={fur} />
          <ellipse cx="78.5" cy="95" rx="8.5" ry="4.8" fill={brown} />
        </g>

        {/* Neck, head and muzzle */}
        <ellipse cx="92" cy="44" rx="12" ry="17" transform="rotate(28 92 44)" fill={fur} />
        <circle cx="104" cy="36" r="18" fill={fur} />
        <ellipse cx="118" cy="43" rx="14" ry="10" fill={cream} />
        <ellipse cx="130" cy="39" rx="5.5" ry="4.2" fill="#2b1b17" />
        <path d="M114 50 Q121 55 127 50" stroke="#2b1b17" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="121" cy="55" rx="3.6" ry="5" fill="#ff6b8b" />

        {/* Eye */}
        <circle cx="108" cy="32" r="3.4" fill="#2b1b17" />
        <circle cx="109.2" cy="30.8" r="1.1" fill="#fff" />

        {/* Floppy ear */}
        <g className="dog-ear">
          <path d="M96 20 C 84 20, 80 38, 88 50 C 98 46, 102 30, 96 20 Z" fill={brown} />
        </g>
      </g>
    </svg>
  );
}
