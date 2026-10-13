"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import TieBreaker, { type TiedTeam } from "@/components/TieBreaker";
import TimerRing from "@/components/TimerRing";
import { hintNudge } from "@/data/breedGroups";
import { fireConfetti } from "@/lib/confetti";
import { loadSetup, saveFinished, type GameSetup } from "@/lib/session";
import { playSfx } from "@/lib/sfx";
import { teamColor } from "@/lib/teams";
import {
  HINT_COSTS,
  POINTS_PER_QUESTION,
  SECONDS_PER_QUESTION as LIMIT,
  type HintLevel,
  type Question,
  type TieBreakResult,
} from "@/lib/types";

type Stage = "loading" | "error" | "intro" | "question" | "feedback" | "tiebreak";
type Tally = { points: number; correct: number; hints: number; ms: number };

const KEYS = ["A", "B", "C", "D"];
const NO_QUESTIONS: Question[] = []; // stable empty list while the sets are still loading

function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ScoreStrip({
  teams,
  tallies,
  active,
}: {
  teams: string[];
  tallies: Tally[];
  active: number;
}) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Scoreboard">
      {teams.map((name, i) => {
        const isActive = i === active;
        return (
          <li
            key={name}
            style={{ "--team": teamColor(i) } as CSSProperties}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold transition-all ${
              isActive
                ? "border-[var(--team)] bg-[color-mix(in_srgb,var(--team)_18%,transparent)] shadow-[0_0_24px_-6px_var(--team)]"
                : "border-line bg-surface text-muted"
            }`}
            aria-current={isActive ? "true" : undefined}
          >
            <span className="size-2.5 rounded-full bg-[var(--team)]" aria-hidden="true" />
            <span className="max-w-32 truncate">{name}</span>
            <span className="font-display tabular-nums text-text">{tallies[i]?.points ?? 0}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Play() {
  const router = useRouter();
  const [setup, setSetup] = useState<GameSetup | null>(null);
  // Every team has its own questions, so nobody can learn from another team's turn.
  const [sets, setSets] = useState<Question[][]>([]);
  const [tiebreak, setTiebreak] = useState<Question | null>(null);
  const [tied, setTied] = useState<{ teams: TiedTeam[]; score: number } | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState("");
  const [team, setTeam] = useState(0);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null); // null = timed out
  const [tallies, setTallies] = useState<Tally[]>([]);
  const [imageReady, setImageReady] = useState(false);
  const [remaining, setRemaining] = useState(LIMIT);
  const [paused, setPaused] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [hint, setHint] = useState<HintLevel>(0);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [earned, setEarned] = useState(0);

  // Time actually spent thinking on this question. Paused time never counts.
  const activeMs = useRef(0);
  const tickAt = useRef<number | null>(null);
  const answered = useRef(false);
  const lastBeep = useRef(0);
  const gameToken = useRef<string | null>(null); // signed ticket from /api/questions, sent along when the scores are saved

  const flush = useCallback(() => {
    if (tickAt.current === null) return;
    const now = performance.now();
    activeMs.current += now - tickAt.current;
    tickAt.current = now;
  }, []);

  const questions = sets[team] ?? NO_QUESTIONS; // the current team's questions

  // Load the setup from the previous page, then fetch a separate set of questions for each team.
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const s = loadSetup();
      if (!s) {
        router.replace("/");
        return;
      }
      setSetup(s);
      setTallies(s.teams.map(() => ({ points: 0, correct: 0, hints: 0, ms: 0 })));
      try {
        const res = await fetch(`/api/questions?count=${s.count}&teams=${s.teams.length}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load questions");
        setSets(data.sets);
        setTiebreak(data.tiebreak);
        gameToken.current = data.token ?? null;
        setStage("intro");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not load questions");
        setStage("error");
      }
    }
    load();
    return () => controller.abort();
  }, [router]);

  // Warm the browser cache with the next photo so the next question appears instantly.
  useEffect(() => {
    const next = sets[team]?.[qi + 1];
    if (next) new window.Image().src = next.imageUrl;
  }, [sets, team, qi]);

  const answer = useCallback(
    (choice: string | null) => {
      if (answered.current || stage !== "question") return;
      answered.current = true;
      flush();
      tickAt.current = null;
      const seconds = choice === null ? LIMIT : Math.min(LIMIT, activeMs.current / 1000);
      const correct = choice !== null && choice === questions[qi].answer;
      const points = correct ? POINTS_PER_QUESTION - HINT_COSTS[hint] : 0;
      setTallies((prev) =>
        prev.map((t, i) =>
          i === team
            ? { ...t, points: t.points + points, correct: t.correct + (correct ? 1 : 0), ms: t.ms + seconds * 1000 }
            : t,
        ),
      );
      setEarned(points);
      setPicked(choice);
      setStage("feedback");
      if (correct) {
        playSfx("correct");
        fireConfetti({ count: 70, origin: { x: 0.5, y: 0.62 }, spread: 55 });
      } else {
        playSfx("wrong");
      }
    },
    [stage, flush, questions, qi, hint, team],
  );

  const takeHint = useCallback(() => {
    if (stage !== "question" || paused || !imageReady || hint >= 2) return;
    const level = (hint + 1) as HintLevel;
    if (level === 2) {
      const q = questions[qi];
      const wrong = q.options.filter((o) => o.value !== q.answer).map((o) => o.value);
      setEliminated(shuffle(wrong).slice(0, 1)); // one wrong answer crossed out: a nudge, not a giveaway
    }
    setHint(level);
    setTallies((prev) => prev.map((t, i) => (i === team ? { ...t, hints: t.hints + 1 } : t)));
    playSfx("hint");
  }, [stage, paused, imageReady, hint, questions, qi, team]);

  const pause = useCallback(() => {
    if (stage !== "question" || paused || answered.current) return;
    flush();
    tickAt.current = null;
    setPaused(true);
    playSfx("pause");
  }, [stage, paused, flush]);

  const resume = useCallback(() => {
    setConfirmQuit(false);
    setPaused(false);
    playSfx("click");
  }, []);

  // Fallback so a slow/broken image can never freeze the game.
  useEffect(() => {
    if (stage !== "question" || imageReady || paused) return;
    const t = setTimeout(() => setImageReady(true), 6000);
    return () => clearTimeout(t);
  }, [stage, imageReady, paused]);

  // The clock only runs while a photo is on screen and the game isn't paused.
  useEffect(() => {
    if (stage !== "question" || !imageReady || paused) return;
    tickAt.current ??= performance.now();
    const id = setInterval(() => {
      flush();
      const left = Math.max(0, LIMIT - activeMs.current / 1000);
      setRemaining(left);
      const whole = Math.ceil(left);
      if (whole <= 5 && whole > 0 && whole !== lastBeep.current) {
        lastBeep.current = whole;
        playSfx("tick");
      }
      if (left <= 0) answer(null);
    }, 100);
    return () => clearInterval(id);
  }, [stage, imageReady, paused, flush, answer]);

  // Switching tabs pauses the game so nobody loses time (or peeks) in the background.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [pause]);

  function beginTurn() {
    answered.current = false;
    activeMs.current = 0;
    tickAt.current = null;
    lastBeep.current = 0;
    setImageReady(false);
    setRemaining(LIMIT);
    setPaused(false);
    setConfirmQuit(false);
    setPicked(null);
    setHint(0);
    setEliminated([]);
    setEarned(0);
    setStage("question");
    playSfx("click");
  }

  const next = useCallback(() => {
    if (!setup) return;
    if (qi + 1 < questions.length) {
      setQi(qi + 1);
      beginTurn();
    } else if (team + 1 < setup.teams.length) {
      setTeam(team + 1);
      setQi(0);
      setStage("intro");
      playSfx("click");
    } else {
      // Everyone has played. Teams level on the top score settle it with a buzzer round.
      const top = Math.max(...tallies.map((t) => t.points));
      const level = setup.teams
        .map((name, index) => ({ index, name, seconds: Math.round(tallies[index].ms / 1000) }))
        .filter((t) => tallies[t.index].points === top);
      if (level.length >= 2 && tiebreak) {
        setTied({ teams: level, score: top });
        setStage("tiebreak");
        playSfx("fanfare");
      } else {
        finishGame();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, qi, questions.length, team, tallies, tiebreak, router]);

  /** Save the finished game for the results page (and the leaderboard) and go there. */
  function finishGame(tieBreak?: TieBreakResult) {
    if (!setup) return;
    saveFinished({
      id: crypto.randomUUID(),
      token: gameToken.current ?? undefined,
      questionCount: questions.length,
      results: setup.teams.map((teamName, i) => ({
        teamName,
        score: tallies[i].points,
        total: questions.length * POINTS_PER_QUESTION,
        correct: tallies[i].correct,
        hintsUsed: tallies[i].hints,
        timeSeconds: Math.round(tallies[i].ms / 1000),
      })),
      tieBreak,
    });
    router.push("/results");
  }

  // Keyboard: A–D / 1–4 answer, H hint, P or Esc pause, Enter continues.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (stage === "question") {
        if (paused) {
          if (k === "p" || k === "escape") resume();
          return;
        }
        const idx = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
        const q = questions[qi];
        if (idx >= 0 && q?.options[idx] && imageReady && !eliminated.includes(q.options[idx].value)) {
          answer(q.options[idx].value);
        } else if (k === "h") takeHint();
        else if (k === "p" || k === "escape") pause();
      } else if (stage === "feedback" && (k === "enter" || k === " ")) {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, paused, questions, qi, imageReady, eliminated, answer, takeHint, pause, resume, next]);

  /* ───────── Screens ───────── */

  if (stage === "loading") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-24 text-center">
        <span className="animate-bounce-paw text-6xl" aria-hidden="true">🐾</span>
        <p className="font-display text-2xl tracking-wide">Fetching the good dogs…</p>
        <p className="text-muted">Sniffing out {setup?.count ?? ""} photos</p>
      </div>
    );
  }

  if (stage === "error" || !setup) {
    return (
      <div className="glass mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center animate-rise">
        <span className="text-5xl" aria-hidden="true">🙈</span>
        <p className="text-lg font-bold">The dogs ran off!</p>
        <p className="text-muted">{error || "Something went wrong."}</p>
        <button onClick={() => location.reload()} className="btn btn-primary">
          Try again
        </button>
      </div>
    );
  }

  if (stage === "tiebreak" && tied && tiebreak) {
    return (
      <TieBreaker
        teams={tied.teams}
        question={tiebreak}
        score={tied.score}
        onDone={(r) => finishGame({ teams: tied.teams.map((t) => t.name), winner: r.winner, reason: r.reason })}
      />
    );
  }

  const teamName = setup.teams[team];
  const color = teamColor(team);
  const teamVars = { "--team": color } as CSSProperties;

  if (stage === "intro") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center" style={teamVars}>
        <ScoreStrip teams={setup.teams} tallies={tallies} active={team} />
        <div className="glass relative w-full max-w-xl overflow-hidden p-8 sm:p-12 animate-pop">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: color }}
          />
          <p className="relative text-sm font-bold uppercase tracking-[0.3em] text-muted">
            Team {team + 1} of {setup.teams.length}
          </p>
          <div
            className="font-display relative mx-auto mt-5 grid size-20 place-items-center rounded-2xl text-4xl text-white animate-float"
            style={{ background: color, boxShadow: `0 12px 40px -8px ${color}` }}
            aria-hidden="true"
          >
            {team + 1}
          </div>
          <h1 className="font-display relative mt-6 break-words text-4xl leading-tight sm:text-5xl" style={{ color }}>
            {teamName}
          </h1>
          <p className="relative mt-2 text-xl font-bold">you&apos;re up!</p>

          <ul className="relative mt-7 grid grid-cols-3 gap-2 text-sm">
            <li className="rounded-xl border border-line bg-inset p-3">
              <div className="font-display text-2xl">{questions.length}</div>
              <div className="text-muted">dogs</div>
            </li>
            <li className="rounded-xl border border-line bg-inset p-3">
              <div className="font-display text-2xl">{LIMIT}s</div>
              <div className="text-muted">each</div>
            </li>
            <li className="rounded-xl border border-line bg-inset p-3">
              <div className="font-display text-2xl">{POINTS_PER_QUESTION}</div>
              <div className="text-muted">pts each</div>
            </li>
          </ul>
          <p className="relative mt-4 text-sm text-muted">
            Your team has its own set of dogs. The clock starts when the photo appears. Hints cost points, and you can pause any time.
          </p>

          <button onClick={beginTurn} autoFocus className="btn btn-primary relative mt-8 w-full text-xl">
            Let&apos;s go! <span aria-hidden="true">🐕</span>
          </button>
        </div>
      </div>
    );
  }

  const q = questions[qi];
  const answerLabel = q.options.find((o) => o.value === q.answer)?.label ?? "";
  const feedback = stage === "feedback";
  const wasCorrect = feedback && picked === q.answer;
  const timedOut = feedback && picked === null;
  const value = POINTS_PER_QUESTION - HINT_COSTS[hint];
  const isLastQuestion = qi + 1 === questions.length;
  const isLastTeam = team + 1 === setup.teams.length;

  return (
    <div className="flex flex-col gap-5" style={teamVars}>
      {/* HUD */}
      <div className="flex items-start justify-between gap-3">
        <ScoreStrip teams={setup.teams} tallies={tallies} active={team} />
        <button onClick={pause} disabled={feedback} className="btn btn-ghost flex-none !px-4 !py-2 text-sm" title="Pause (P)">
          <span aria-hidden="true">⏸</span> Pause
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-sm font-bold text-muted">
          Question <span className="text-text">{qi + 1}</span> / {questions.length}
        </span>
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                i < qi || (i === qi && feedback) ? "bg-[var(--team)]" : i === qi ? "bg-[color-mix(in_srgb,var(--team)_40%,transparent)]" : "bg-track"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Photo */}
        <div
          className="glass relative h-[30vh] min-h-52 overflow-hidden p-2 sm:h-[36vh] lg:h-[26rem]"
          style={{ boxShadow: `0 0 0 2px ${color}55, 0 30px 80px -30px ${color}` }}
        >
          <div className="relative size-full overflow-hidden rounded-2xl bg-inset">
            <Image
              key={`${team}-${qi}`}
              src={q.imageUrl}
              alt="A dog. Which breed is it?"
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 600px"
              className={`object-contain transition-opacity duration-500 ${imageReady ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageReady(true)}
              onError={() => setImageReady(true)}
            />
            {!imageReady && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="animate-bounce-paw text-5xl" aria-hidden="true">🐾</span>
              </div>
            )}
          </div>
          <div className="absolute left-4 top-4">
            <TimerRing remaining={remaining} max={LIMIT} paused={paused} />
          </div>
          <div className="absolute right-4 top-4 rounded-full border border-line bg-white/85 px-3 py-1.5 text-sm font-extrabold backdrop-blur">
            Worth{" "}
            <span key={value} className="inline-block animate-pop text-amber">
              {value} pt{value === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Answers */}
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-xl sm:text-3xl">Which breed is this?</h2>

          <div role="group" aria-label="Answer choices" className="flex flex-col gap-2.5">
            {q.options.map((o, i) => {
              const isAnswer = o.value === q.answer;
              const isPicked = o.value === picked;
              const out = eliminated.includes(o.value);
              const state = feedback
                ? isAnswer
                  ? "correct"
                  : isPicked
                    ? "wrong"
                    : "dim"
                : out
                  ? "eliminated"
                  : "idle";
              return (
                <button
                  key={o.value}
                  data-state={state}
                  disabled={feedback || !imageReady || out}
                  onClick={() => answer(o.value)}
                  className={`answer ${state === "wrong" ? "animate-shake" : ""} ${state === "correct" ? "animate-pop" : ""}`}
                >
                  <span className="key" aria-hidden="true">{KEYS[i]}</span>
                  <span className="flex-1">{o.label}</span>
                  {state === "correct" && <span aria-hidden="true">✓</span>}
                  {state === "wrong" && <span aria-hidden="true">✗</span>}
                </button>
              );
            })}
          </div>

          {!feedback && (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-inset p-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={takeHint}
                  disabled={!imageReady || hint >= 2}
                  className="btn btn-ghost whitespace-nowrap !px-4 !py-2 text-sm"
                  title="Hint (H)"
                >
                  <span aria-hidden="true">{hint === 0 ? "💡" : "🔎"}</span>
                  {hint === 0 ? "Hint" : hint === 1 ? "Bigger hint" : "No more hints"}
                  {hint < 2 && (
                    <span className="rounded-full bg-bad/20 px-2 py-0.5 text-xs text-bad">
                      −{hint === 0 ? HINT_COSTS[1] : HINT_COSTS[2] - HINT_COSTS[1]} pt
                    </span>
                  )}
                </button>
                <span className="hidden text-xs text-muted sm:block">
                  Keys: <kbd>A–D</kbd> answer · <kbd>H</kbd> hint · <kbd>P</kbd> pause
                </span>
              </div>
              {hint >= 1 && (
                <p key={hint} className="animate-rise text-sm italic text-muted" aria-live="polite">
                  <span aria-hidden="true">💡</span> {hintNudge(q.answer)}
                  {hint >= 2 && <> It starts with “{answerLabel[0].toUpperCase()}”.</>}
                </p>
              )}
            </div>
          )}

          {feedback && (
            <div className="flex flex-col gap-3 animate-rise" aria-live="polite">
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  wasCorrect ? "border-good/60 bg-good/15" : "border-bad/60 bg-bad/15"
                }`}
              >
                <p className={`font-display text-xl ${wasCorrect ? "text-good" : "text-bad"}`}>
                  {wasCorrect ? `Correct! +${earned} pt${earned === 1 ? "" : "s"}` : timedOut ? "Time's up!" : "Not quite!"}
                </p>
                <p className="text-sm text-muted">
                  {wasCorrect
                    ? hint > 0
                      ? `Hint used: ${POINTS_PER_QUESTION} → ${earned} points`
                      : "Full marks, no hints."
                    : `It was ${answerLabel}.`}
                </p>
              </div>
              <button onClick={next} autoFocus className="btn btn-primary text-lg">
                {!isLastQuestion ? "Next dog →" : !isLastTeam ? "Next team →" : "See results 🏆"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pause overlay: the photo and choices are hidden so nobody can study them while stopped. */}
      {paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
          className="fixed inset-0 z-50 grid place-items-center bg-white/95 p-4 backdrop-blur-2xl animate-rise"
        >
          <div className="glass flex w-full max-w-sm flex-col items-center gap-5 p-8 text-center">
            <span className="text-5xl" aria-hidden="true">⏸</span>
            <h2 className="font-display text-4xl">PAUSED</h2>
            <p className="text-muted">The clock is stopped and the photo is hidden.</p>
            <button onClick={resume} autoFocus className="btn btn-primary w-full text-lg">
              ▶ Resume
            </button>
            {confirmQuit ? (
              <div className="flex w-full flex-col gap-2">
                <p className="text-sm font-semibold text-bad">Quit and lose this game&apos;s progress?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setConfirmQuit(false)} className="btn btn-ghost">
                    Keep playing
                  </button>
                  <button onClick={() => router.push("/")} className="btn btn-ghost !border-bad/60 text-bad">
                    Quit
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmQuit(true)} className="btn btn-ghost w-full">
                Quit to menu
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
