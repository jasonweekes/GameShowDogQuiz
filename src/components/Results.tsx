"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { fireConfetti } from "@/lib/confetti";
import { formatTime } from "@/lib/format";
import { loadFinished, saveFinished, type FinishedGame } from "@/lib/session";
import { playSfx } from "@/lib/sfx";
import { teamColor } from "@/lib/teams";
import type { TeamResultInput } from "@/lib/types";

type SaveState = "saving" | "saved" | "failed";
type Ranked = TeamResultInput & { color: string };

const MEDALS = ["🥇", "🥈", "🥉", "4"];
// Podium block heights by place (index 0 = 1st).
const BLOCK = ["h-40", "h-28", "h-20"];

export default function Results() {
  const [game, setGame] = useState<FinishedGame | null | undefined>(undefined);
  const [save, setSave] = useState<SaveState>("saving");
  const started = useRef(false);
  const celebrated = useRef(false);

  useEffect(() => {
    async function init() {
      const g = loadFinished();
      setGame(g);
      if (!g) return;
      if (!celebrated.current) {
        celebrated.current = true;
        playSfx("fanfare");
        fireConfetti({ count: 140, origin: { x: 0.2, y: 0.75 }, spread: 40, power: 1.4 });
        fireConfetti({ count: 140, origin: { x: 0.8, y: 0.75 }, spread: 40, power: 1.4 });
        setTimeout(() => fireConfetti({ count: 160, origin: { x: 0.5, y: 0.5 }, spread: 90, power: 1.2 }), 450);
      }
      if (g.saved) {
        setSave("saved");
        return;
      }
      if (started.current) return; // StrictMode runs effects twice in dev
      started.current = true;
      await persist(g);
    }
    init();
  }, []);

  async function persist(g: FinishedGame) {
    setSave("saving");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionCount: g.questionCount, results: g.results }),
      });
      if (!res.ok) throw new Error();
      saveFinished({ ...g, saved: true }); // remember so a page reload doesn't save it again
      setSave("saved");
    } catch {
      setSave("failed");
    }
  }

  if (game === undefined) return null;

  if (game === null) {
    return (
      <div className="glass mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center animate-rise">
        <span className="text-5xl" aria-hidden="true">🐕‍🦺</span>
        <p className="text-muted">No finished game found.</p>
        <Link href="/" className="btn btn-primary">
          Start a new game
        </Link>
      </div>
    );
  }

  // Most points wins. Teams level on the top score were settled by the tie-breaker round: its winner
  // goes first, then the usual rule (faster total time) orders everyone else.
  const tieBreak = game.tieBreak;
  const tbWinner = tieBreak?.winner ?? null;
  const ranked: Ranked[] = game.results
    .map((r, i) => ({ ...r, color: teamColor(i) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.teamName === tbWinner) - Number(a.teamName === tbWinner) ||
        a.timeSeconds - b.timeSeconds,
    );
  const [top, second] = ranked;
  const tied = !tbWinner && !!second && second.score === top.score && second.timeSeconds === top.timeSeconds;
  const stats = `${top.score} of ${top.total} points · ${top.correct}/${game.questionCount} correct · ${formatTime(top.timeSeconds)}`;
  const winNote =
    tieBreak?.winner && tieBreak.reason === "buzzer"
      ? `Won the tie-breaker round. ${stats}`
      : tieBreak?.winner && tieBreak.reason === "time"
        ? `Won on fastest total time after the tie-breaker. ${stats}`
        : stats;
  const solo = ranked.length === 1;
  const podium = ranked.slice(0, 3);
  // Visual order puts 1st in the middle: 2nd, 1st, 3rd.
  const podiumOrder = podium.length === 1 ? [0] : podium.length === 2 ? [1, 0] : [1, 0, 2];

  return (
    <div className="flex flex-col gap-10">
      <div className="text-center animate-rise">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted">
          {solo ? "Final score" : tied ? "Dead heat" : "Champion"}
        </p>
        <h1 className="font-display mt-2 text-[clamp(2.8rem,9vw,5.5rem)] leading-tight title-gradient">
          {tied ? "IT'S A TIE!" : top.teamName.toUpperCase()}
        </h1>
        <p className="mt-2 text-lg text-muted">
          {tied ? "Same points, same time, and the tie-breaker could not split them. Rematch?" : winNote}
        </p>
      </div>

      {/* Podium */}
      <div className="mx-auto flex w-full max-w-xl items-end justify-center gap-2 sm:gap-4">
        {podiumOrder.map((place) => {
          const t = podium[place];
          return (
            <div
              key={t.teamName}
              className="flex min-w-0 flex-1 flex-col items-center animate-rise"
              style={{ "--team": t.color, animationDelay: `${(2 - place) * 0.18}s` } as CSSProperties}
            >
              <span className="text-4xl" aria-hidden="true">{place === 0 ? "👑" : ""}</span>
              <span className="mt-1 max-w-full truncate text-base font-extrabold sm:text-lg">{t.teamName}</span>
              <span className="font-display text-3xl tabular-nums" style={{ color: t.color }}>{t.score}</span>
              <div
                className={`mt-2 grid w-full place-items-start justify-items-center rounded-t-2xl pt-3 ${BLOCK[place]}`}
                style={{
                  background: `linear-gradient(180deg, ${t.color}, ${t.color}22)`,
                  boxShadow: `0 -10px 50px -12px ${t.color}`,
                }}
              >
                <span className="font-display text-3xl text-white drop-shadow">{place + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full table */}
      <section className="glass overflow-hidden" aria-label="Final standings">
        <ol className="divide-y divide-line">
          {ranked.map((r, i) => (
            <li
              key={r.teamName}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 sm:grid-cols-[auto_1fr_repeat(4,auto)]"
              style={{ "--team": r.color } as CSSProperties}
            >
              <span className="grid size-9 place-items-center text-2xl">{MEDALS[i] ?? i + 1}</span>
              <span className="flex min-w-0 items-center gap-2 text-lg font-extrabold">
                <span className="size-3 flex-none rounded-full bg-[var(--team)]" aria-hidden="true" />
                <span className="truncate">{r.teamName}</span>
              </span>
              <span className="hidden text-center text-sm text-muted sm:block">
                <b className="block text-base text-text">{r.correct}/{game.questionCount}</b>correct
              </span>
              <span className="hidden text-center text-sm text-muted sm:block">
                <b className="block text-base text-text">{r.hintsUsed}</b>hints
              </span>
              <span className="hidden text-center text-sm text-muted sm:block">
                <b className="block text-base text-text">{formatTime(r.timeSeconds)}</b>time
              </span>
              <span className="text-right">
                <span className="font-display block text-2xl tabular-nums text-amber">{r.score}</span>
                <span className="block text-xs text-muted sm:hidden">
                  {r.correct}/{game.questionCount} · {formatTime(r.timeSeconds)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-center text-sm text-muted" role="status">
        {save === "saving" && "Saving scores…"}
        {save === "saved" && "✓ Scores saved to the leaderboard."}
        {save === "failed" && (
          <>
            Couldn&apos;t save scores.{" "}
            <button onClick={() => persist(game)} className="font-bold text-amber hover:underline">
              Retry
            </button>
          </>
        )}
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary text-lg">
          Play again <span aria-hidden="true">🐾</span>
        </Link>
        <Link href="/leaderboard" className="btn btn-ghost text-lg">
          <span aria-hidden="true">🏆</span> Leaderboard
        </Link>
      </div>
    </div>
  );
}
