"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { QUIZ_BREEDS, breedLabel } from "@/data/breeds";
import { playSfx } from "@/lib/sfx";
import { saveSetup } from "@/lib/session";
import { MAX_NAME_LENGTH, suggestNames, teamColor } from "@/lib/teams";
import {
  MAX_TEAMS,
  POINTS_PER_QUESTION,
  QUESTION_COUNTS,
  SECONDS_PER_QUESTION,
} from "@/lib/types";

const LEVELS: Record<number, { title: string; emoji: string }> = {
  5: { title: "Quick Sniff", emoji: "🐾" },
  10: { title: "Good Boy", emoji: "🦴" },
  15: { title: "Top Dog", emoji: "🏅" },
  20: { title: "Alpha", emoji: "👑" },
};

const SQUADS: Record<number, { title: string; blurb: string }> = {
  1: { title: "Solo", blurb: "Just you vs the clock" },
  2: { title: "Duel", blurb: "Head to head" },
  3: { title: "Trio", blurb: "Three-way showdown" },
  4: { title: "Pack", blurb: "Full house" },
};

const STEPS = ["Questions", "Teams", "Names"] as const;

// A deterministic slice of breeds for the scrolling ticker (no randomness, so no hydration mismatch).
const TICKER = QUIZ_BREEDS.filter((_, i) => i % 4 === 0).map((b) => breedLabel(b.value));

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mx-auto flex w-full max-w-md items-center gap-2" aria-label="Setup progress">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={`grid size-7 flex-none place-items-center rounded-full text-xs font-extrabold transition-colors ${
                done
                  ? "bg-good text-white"
                  : current
                    ? "bg-amber text-[#1b0f00] shadow-[0_0_0_4px_rgb(224_123_0/0.22)]"
                    : "bg-surface-strong text-muted"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={`hidden text-sm font-bold sm:block ${current ? "text-text" : "text-muted"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded bg-line">
                <span
                  className="absolute inset-y-0 left-0 bg-amber transition-[width] duration-500"
                  style={{ width: done ? "100%" : "0%" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Setup() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [count, setCount] = useState<number>(10);
  const [teamCount, setTeamCount] = useState(2);
  const [names, setNames] = useState<string[]>(Array(MAX_TEAMS).fill(""));
  const [touched, setTouched] = useState<boolean[]>(Array(MAX_TEAMS).fill(false));

  const active = names.slice(0, teamCount).map((n) => n.trim());
  const lower = active.map((n) => n.toLowerCase());
  const problems = active.map((n, i) => {
    if (!n) return "Give this team a name";
    if (lower.indexOf(n.toLowerCase()) !== i) return "Names must be different";
    return "";
  });
  const valid = problems.every((p) => !p);

  function go(to: number) {
    playSfx("click");
    setStep(to);
  }

  function shuffleNames() {
    playSfx("hint");
    const ideas = suggestNames(teamCount);
    setNames((prev) => prev.map((n, i) => (i < teamCount ? ideas[i] : n)));
    setTouched(Array(MAX_TEAMS).fill(true));
  }

  function start(e: React.FormEvent) {
    e.preventDefault();
    setTouched(Array(MAX_TEAMS).fill(true));
    if (!valid) return;
    playSfx("fanfare");
    saveSetup({ teams: active, count });
    router.push("/play");
  }

  return (
    <div className="flex flex-col gap-10">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center gap-4 text-center animate-rise">
        <span className="rounded-full border border-line bg-surface px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-muted">
          1–4 teams · live scoreboard · beat the clock
        </span>
        <h1 className="font-display text-[clamp(3.4rem,13vw,8rem)] leading-[0.95] title-gradient">
          BREED
          <br className="sm:hidden" /> RUSH
        </h1>
        <p className="max-w-xl text-lg text-muted sm:text-xl">
          Name that dog. Beat the clock. <strong className="text-text">Rule the pack.</strong>
        </p>
      </section>

      {/* ── Wizard ── */}
      <section className="glass mx-auto w-full max-w-3xl p-5 sm:p-8">
        <Stepper step={step} />

        <div key={step} className="mt-8 animate-rise">
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold">How many questions?</h2>
                <p className="mt-1 text-muted">
                  Each dog is worth {POINTS_PER_QUESTION} points. You get {SECONDS_PER_QUESTION}s per photo.
                </p>
              </div>
              <div role="radiogroup" aria-label="Number of questions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {QUESTION_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={count === n}
                    onClick={() => {
                      playSfx("click");
                      setCount(n);
                    }}
                    className="choice flex flex-col items-center gap-1 px-3 py-5"
                  >
                    <span className="text-2xl" aria-hidden="true">{LEVELS[n].emoji}</span>
                    <span className="font-display text-4xl leading-none">{n}</span>
                    <span className="mt-1 text-sm font-extrabold">{LEVELS[n].title}</span>
                    <span className="text-xs text-muted">≈ {Math.ceil((n * 11) / 60)} min per team</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-2xl font-extrabold">How many teams?</h2>
                <p className="mt-1 text-muted">Teams take turns on the same questions.</p>
              </div>
              <div role="radiogroup" aria-label="Number of teams" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: MAX_TEAMS }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={teamCount === n}
                    onClick={() => {
                      playSfx("click");
                      setTeamCount(n);
                    }}
                    className="choice flex flex-col items-center gap-2 px-3 py-5"
                  >
                    <span className="flex gap-1" aria-hidden="true">
                      {Array.from({ length: n }, (_, k) => (
                        <span
                          key={k}
                          className="size-3.5 rounded-full"
                          style={{ background: teamColor(k), boxShadow: `0 0 12px ${teamColor(k)}` }}
                        />
                      ))}
                    </span>
                    <span className="font-display text-4xl leading-none">{n}</span>
                    <span className="text-sm font-extrabold">{SQUADS[n].title}</span>
                    <span className="text-xs text-muted">{SQUADS[n].blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={start} className="flex flex-col gap-6" noValidate>
              <div className="text-center">
                <h2 className="text-2xl font-extrabold">Name your {teamCount > 1 ? "teams" : "team"}</h2>
                <p className="mt-1 text-muted">Make it legendary. Up to {MAX_NAME_LENGTH} characters.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: teamCount }, (_, i) => (
                  <label
                    key={i}
                    className="flex flex-col gap-2"
                    style={{ "--team": teamColor(i) } as CSSProperties}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-muted">
                      <span
                        className="grid size-6 place-items-center rounded-full text-xs font-extrabold text-white"
                        style={{ background: teamColor(i) }}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      Team {i + 1}
                    </span>
                    <input
                      className="text-input"
                      value={names[i]}
                      maxLength={MAX_NAME_LENGTH}
                      autoFocus={i === 0}
                      autoComplete="off"
                      placeholder={["Good Boys", "Barking Mad", "Top Dogs", "Paw Patrol"][i]}
                      onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                      onBlur={() => setTouched((prev) => prev.map((t, j) => (j === i ? true : t)))}
                      aria-invalid={touched[i] && !!problems[i]}
                    />
                    <span className="min-h-5 text-sm font-semibold text-bad" role="alert">
                      {touched[i] && problems[i]}
                    </span>
                  </label>
                ))}
              </div>

              <button type="button" onClick={shuffleNames} className="btn btn-ghost self-center text-sm">
                <span aria-hidden="true">🎲</span> Surprise me with names
              </button>

              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-line bg-inset p-4 text-center text-sm">
                <div>
                  <div className="font-display text-2xl text-amber">{count}</div>
                  <div className="text-muted">questions</div>
                </div>
                <div>
                  <div className="font-display text-2xl text-cyan">{teamCount}</div>
                  <div className="text-muted">{teamCount === 1 ? "team" : "teams"}</div>
                </div>
                <div>
                  <div className="font-display text-2xl text-good">{count * POINTS_PER_QUESTION}</div>
                  <div className="text-muted">max points</div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => go(1)} className="btn btn-ghost">
                  ← Back
                </button>
                <button type="submit" className="btn btn-primary text-lg sm:min-w-64">
                  Start the showdown <span aria-hidden="true">🐾</span>
                </button>
              </div>
            </form>
          )}

          {step < 2 && (
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {step > 0 ? (
                <button type="button" onClick={() => go(step - 1)} className="btn btn-ghost">
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => go(step + 1)} className="btn btn-primary sm:min-w-48">
                Continue →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Breed ticker ── */}
      <div className="marquee-mask overflow-hidden" aria-hidden="true">
        <div className="flex w-max animate-marquee gap-3 whitespace-nowrap">
          {[...TICKER, ...TICKER].map((b, i) => (
            <span key={i} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold text-muted">
              {b}
            </span>
          ))}
        </div>
      </div>
      <p className="-mt-6 text-center text-sm text-muted">
        {QUIZ_BREEDS.length} breeds to master · hints available (they cost points) · pause any time
      </p>
    </div>
  );
}
