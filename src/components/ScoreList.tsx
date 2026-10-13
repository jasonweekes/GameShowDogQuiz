import { formatTime } from "@/lib/format";
import { POINTS_PER_QUESTION } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export type ScoreRow = {
  id: number;
  teamName: string;
  score: number;
  total: number;
  correct: number;
  hintsUsed: number;
  timeSeconds: number;
};

/** The leaderboard table. Rows are shown in the order given (the page asks the database for them ranked). */
export default function ScoreList({ scores }: { scores: ScoreRow[] }) {
  if (scores.length === 0) {
    return (
      <div className="glass flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="text-5xl" aria-hidden="true">🐕</span>
        <p className="text-lg font-bold">The board is empty</p>
        <p className="text-muted">Be the first team to claim the top spot.</p>
      </div>
    );
  }

  return (
    <ol className="glass divide-y divide-line overflow-hidden">
      {scores.map((s, i) => (
        <li
          key={s.id}
          className={`grid grid-cols-[3rem_1fr_auto] items-center gap-x-3 px-4 py-4 sm:px-6 ${
            i === 0 ? "bg-gradient-to-r from-amber/15 to-transparent" : ""
          }`}
        >
          <span className="text-center text-2xl font-extrabold text-muted">{MEDALS[i] ?? i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-extrabold">{s.teamName}</span>
            <span className="block text-sm text-muted">
              {s.correct}/{s.total / POINTS_PER_QUESTION} correct · {s.hintsUsed} hint{s.hintsUsed === 1 ? "" : "s"} ·{" "}
              {formatTime(s.timeSeconds)}
            </span>
          </span>
          <span className="text-right">
            <span className="font-display text-2xl tabular-nums text-amber">{s.score}</span>
            <span className="block text-xs text-muted">of {s.total} pts</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
