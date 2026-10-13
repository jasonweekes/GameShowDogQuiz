import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import ScoreList from "@/components/ScoreList";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Leaderboard · Breed Rush" };

async function Scores() {
  await connection(); // always read fresh scores at request time
  const scores = await prisma.teamResult.findMany({
    orderBy: [{ score: "desc" }, { timeSeconds: "asc" }],
    take: 20,
  });
  return <ScoreList scores={scores} />;
}

export default function LeaderboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 animate-rise">
      <div className="text-center">
        <h1 className="font-display text-5xl title-gradient">LEADERBOARD</h1>
        <p className="mt-2 text-muted">Top 20 team results. Most points wins; ties go to the faster team.</p>
      </div>
      <Suspense fallback={<p className="text-center text-muted">Loading scores…</p>}>
        <Scores />
      </Suspense>
      <Link href="/" className="btn btn-primary self-center text-lg">
        Play a game <span aria-hidden="true">🐾</span>
      </Link>
    </div>
  );
}
