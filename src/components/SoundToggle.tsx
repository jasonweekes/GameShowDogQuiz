"use client";

import { useSyncExternalStore } from "react";
import { isMuted, playSfx, setMuted, subscribeMuted } from "@/lib/sfx";

export default function SoundToggle({ className = "" }: { className?: string }) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);

  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        if (muted) playSfx("click"); // confirm that sound is back on
      }}
      aria-pressed={!muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      title={muted ? "Sound off" : "Sound on"}
      className={`btn btn-ghost !px-3 !py-2 text-lg ${className}`}
    >
      <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
