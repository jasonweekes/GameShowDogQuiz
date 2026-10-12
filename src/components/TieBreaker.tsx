"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import TimerRing from "@/components/TimerRing";
import { fireConfetti } from "@/lib/confetti";
import { formatTime } from "@/lib/format";
import { playSfx } from "@/lib/sfx";
import { teamColor } from "@/lib/teams";
import type { Question, TieBreakResult } from "@/lib/types";

// A buzzer round that settles a tie for first place:
//  1. A fresh photo appears. The first tied team to tap its buzzer gets to answer (4 choices).
//  2. A wrong answer, or running out of time, passes the question to the teams that haven't tried yet
//     (the wrong choice is crossed out for them).
//  3. If nobody gets it right, the team with the fastest total time wins.

export type TiedTeam = { index: number; name: string; seconds: number };

const BUZZ_SECONDS = 20;
const ANSWER_SECONDS = 10;
const KEYS = ["A", "B", "C", "D"];

type Phase = "intro" | "countdown" | "buzz" | "answer" | "result";
type Outcome = { winner: string | null; reason: TieBreakResult["reason"]; message: string };

export default function TieBreaker({
  teams,
  question,
  score,
  onDone,
}: {
  teams: TiedTeam[];
  question: Question;
  score: number;
  onDone: (result: { winner: string | null; reason: TieBreakResult["reason"] }) => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(3);
  const [eligible, setEligible] = useState<number[]>(teams.map((t) => t.index)); // team indexes that may still buzz
  const [buzzer, setBuzzer] = useState<number | null>(null);
  const [wrong, setWrong] = useState<string[]>([]); // choices already tried and missed
  const [notice, setNotice] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [left, setLeft] = useState(BUZZ_SECONDS);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const deadline = useRef<number | null>(null);

  const nameOf = useCallback((index: number) => teams.find((t) => t.index === index)?.name ?? "", [teams]);
  const answerLabel = question.options.find((o) => o.value === question.answer)?.label ?? "";

  // Load the photo early (hidden) so nobody waits on it once the round starts.
  useEffect(() => {
    new window.Image().src = question.imageUrl;
    const t = setTimeout(() => setImageReady(true), 6000); // never let a slow photo freeze the game
    return () => clearTimeout(t);
  }, [question.imageUrl]);

  const finish = useCallback((o: Outcome) => {
    setOutcome(o);
    setPhase("result");
    if (o.winner) {
      playSfx("fanfare");
      fireConfetti({ count: 120, origin: { x: 0.5, y: 0.55 }, spread: 80 });
    }
  }, []);

  /** Nobody got it right: the fastest total time wins; identical times stay a tie. */
  const decideByTime = useCallback(
    (prefix: string) => {
      const best = Math.min(...teams.map((t) => t.seconds));
      const fastest = teams.filter((t) => t.seconds === best);
      if (fastest.length === 1) {
        finish({
          winner: fastest[0].name,
          reason: "time",
          message: `${prefix} The fastest total time wins: ${fastest[0].name} (${formatTime(best)}).`,
        });
      } else {
        finish({ winner: null, reason: "tie", message: `${prefix} Level on points and on time, so it's a tie!` });
      }
    },
    [teams, finish],
  );

  const noBuzz = useCallback(() => {
    decideByTime(wrong.length ? "Nobody got it right." : "Nobody buzzed in.");
  }, [decideByTime, wrong.length]);

  const submit = useCallback(
    (choice: string | null) => {
      if (phase !== "answer" || buzzer === null) return;
      if (choice !== null && choice === question.answer) {
        finish({ winner: nameOf(buzzer), reason: "buzzer", message: `${nameOf(buzzer)} buzzed in first and got it right!` });
        return;
      }
      playSfx("wrong");
      const remaining = eligible.filter((i) => i !== buzzer);
      const nextWrong = choice ? [...wrong, choice] : wrong;
      setWrong(nextWrong);
      if (remaining.length === 0) {
        decideByTime("Nobody got it right.");
        return;
      }
      setEligible(remaining);
      setNotice(
        `${nameOf(buzzer)} ${choice === null ? "ran out of time" : "missed it"}. ${remaining.map(nameOf).join(" and ")} can buzz in now!`,
      );
      setBuzzer(null);
      deadline.current = null;
      setLeft(BUZZ_SECONDS);
      setPhase("buzz");
    },
    [phase, buzzer, question.answer, eligible, wrong, nameOf, finish, decideByTime],
  );

  const buzz = useCallback(
    (teamIndex: number) => {
      if (phase !== "buzz" || !imageReady || !eligible.includes(teamIndex)) return;
      playSfx("click");
      setBuzzer(teamIndex);
      setNotice("");
      deadline.current = null;
      setLeft(ANSWER_SECONDS);
      setPhase("answer");
    },
    [phase, imageReady, eligible],
  );

  function start() {
    playSfx("click");
    setCount(3);
    setPhase("countdown");
  }

  // 3 - 2 - 1, then the photo is revealed and the buzzers go live.
  useEffect(() => {
    if (phase !== "countdown") return;
    playSfx("tick");
    const t = setTimeout(() => {
      if (count > 1) {
        setCount((c) => c - 1);
      } else {
        deadline.current = null;
        setLeft(BUZZ_SECONDS);
        setPhase("buzz");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [phase, count]);

  // The clock for the current step (waiting for a buzz, or answering) starts once the photo is showing.
  useEffect(() => {
    if ((phase !== "buzz" && phase !== "answer") || !imageReady) return;
    const seconds = phase === "buzz" ? BUZZ_SECONDS : ANSWER_SECONDS;
    deadline.current ??= performance.now() + seconds * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, ((deadline.current ?? 0) - performance.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        if (phase === "buzz") noBuzz();
        else submit(null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, imageReady, noBuzz, submit]);

  // Keyboard: in the buzz step press your team's number; when answering use A-D or 1-4.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (phase === "buzz") {
        const n = "1234".indexOf(k);
        if (n >= 0) buzz(n);
      } else if (phase === "answer") {
        const idx = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
        const option = question.options[idx];
        if (option && !wrong.includes(option.value)) submit(option.value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, buzz, submit, question.options, wrong]);

  const showPhoto = phase === "buzz" || phase === "answer" || phase === "result";
  const answering = buzzer !== null ? nameOf(buzzer) : "";
  const answeringColor = buzzer !== null ? teamColor(buzzer) : "var(--amber)";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 py-4 text-center">
      <div className="animate-rise">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted">Level on {score} points</p>
        <h1 className="font-display title-gradient mt-1 text-[clamp(2.6rem,9vw,4.5rem)] leading-tight">TIE-BREAKER</h1>
      </div>

      {/* Who is in the tie */}
      <ul className="flex flex-wrap justify-center gap-2" aria-label="Teams in the tie-breaker">
        {teams.map((t) => {
          const out = phase !== "intro" && phase !== "result" && !eligible.includes(t.index) && buzzer !== t.index;
          return (
            <li
              key={t.index}
              style={{ "--team": teamColor(t.index) } as CSSProperties}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
                out ? "border-line bg-surface text-muted line-through opacity-60" : "border-[var(--team)] bg-[color-mix(in_srgb,var(--team)_16%,transparent)]"
              }`}
            >
              <span className="size-2.5 rounded-full bg-[var(--team)]" aria-hidden="true" />
              {t.name}
            </li>
          );
        })}
      </ul>

      {phase === "intro" && (
        <div className="glass w-full max-w-xl p-6 text-left animate-pop sm:p-8">
          <h2 className="font-display text-2xl">How it works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
            <li>A brand-new photo appears after a 3-2-1 countdown.</li>
            <li>
              <strong className="text-text">Tap your team&apos;s buzzer first</strong> to earn the answer.
            </li>
            <li>The team that buzzes picks the breed. Get it right and <strong className="text-text">you win</strong>.</li>
            <li>A wrong answer passes the question to the other team, which can buzz in.</li>
            <li>If nobody gets it right, <strong className="text-text">the fastest total time wins</strong>.</li>
          </ol>
          <button onClick={start} autoFocus className="btn btn-primary mt-6 w-full text-xl">
            Start the tie-breaker <span aria-hidden="true">⚡</span>
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="grid h-56 place-items-center" aria-live="assertive">
          <span key={count} className="font-display title-gradient animate-pop text-[7rem] leading-none">
            {count}
          </span>
        </div>
      )}

      {/* The photo stays mounted (hidden) during the countdown so it is loaded the moment the round begins. */}
      {(phase === "countdown" || showPhoto) && (
        <div
          className={`glass relative h-[34vh] min-h-52 w-full overflow-hidden p-2 sm:h-[24rem] ${showPhoto ? "" : "absolute -left-[9999px] size-px opacity-0"}`}
          aria-hidden={!showPhoto}
        >
          <div className="relative size-full overflow-hidden rounded-2xl bg-inset">
            <Image
              src={question.imageUrl}
              alt="A dog. Which breed is it?"
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 768px"
              className={`object-contain transition-opacity duration-500 ${showPhoto && imageReady ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageReady(true)}
              onError={() => setImageReady(true)}
            />
          </div>
          {(phase === "buzz" || phase === "answer") && (
            <div className="absolute left-4 top-4">
              <TimerRing remaining={left} max={phase === "buzz" ? BUZZ_SECONDS : ANSWER_SECONDS} />
            </div>
          )}
        </div>
      )}

      {phase === "buzz" && (
        <div className="flex w-full flex-col items-center gap-4 animate-rise">
          <p className="font-display text-2xl">{notice || "Who knows this dog? Buzz in!"}</p>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            {teams.map((t) => {
              const can = eligible.includes(t.index);
              return (
                <button
                  key={t.index}
                  onClick={() => buzz(t.index)}
                  disabled={!can || !imageReady}
                  style={{ "--team": teamColor(t.index) } as CSSProperties}
                  className={`btn flex-col !gap-0 !py-5 text-xl text-white ${can ? "bg-[var(--team)] shadow-[0_14px_30px_-12px_var(--team)] hover:brightness-110" : "bg-track !text-muted"}`}
                >
                  <span className="font-display text-3xl">{can ? "BUZZ!" : "Already tried"}</span>
                  <span className="max-w-full truncate text-base font-bold">{t.name}</span>
                  {can && <span className="mt-1 text-xs font-semibold opacity-80">or press {t.index + 1}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === "answer" && (
        <div className="flex w-full flex-col gap-3 animate-rise">
          <p className="font-display text-2xl">
            <span style={{ color: answeringColor }}>{answering}</span> is answering!
          </p>
          <div role="group" aria-label="Answer choices" className="flex flex-col gap-2.5 text-left">
            {question.options.map((o, i) => {
              const tried = wrong.includes(o.value);
              return (
                <button
                  key={o.value}
                  data-state={tried ? "eliminated" : "idle"}
                  disabled={tried}
                  onClick={() => submit(o.value)}
                  className="answer"
                >
                  <span className="key" aria-hidden="true">{KEYS[i]}</span>
                  <span className="flex-1">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === "result" && outcome && (
        <div className="glass w-full max-w-xl p-6 animate-pop sm:p-8" aria-live="polite">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-muted">
            {outcome.winner ? "Tie-breaker winner" : "Still level"}
          </p>
          <h2 className="font-display title-gradient mt-1 text-4xl leading-tight">
            {outcome.winner ?? "It's a tie!"}
          </h2>
          <p className="mt-3 text-muted">{outcome.message}</p>
          <p className="mt-2 text-sm text-muted">
            The answer was <strong className="text-text">{answerLabel}</strong>.
          </p>
          <button
            onClick={() => onDone({ winner: outcome.winner, reason: outcome.reason })}
            autoFocus
            className="btn btn-primary mt-6 w-full text-lg"
          >
            See results 🏆
          </button>
        </div>
      )}
    </div>
  );
}
