import { prisma } from "@/lib/prisma";
import {
  MAX_TEAMS,
  POINTS_PER_QUESTION,
  QUESTION_COUNTS,
  type TeamResultInput,
} from "@/lib/types";

// POST /api/scores  { questionCount, results: [{ teamName, score, total, correct, hintsUsed, timeSeconds }] }
// Saves one Game with a TeamResult per team.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    questionCount?: number;
    results?: TeamResultInput[];
  } | null;

  const { questionCount, results } = body ?? {};
  const maxPoints = (questionCount ?? 0) * POINTS_PER_QUESTION;
  const valid =
    typeof questionCount === "number" &&
    (QUESTION_COUNTS as readonly number[]).includes(questionCount) &&
    Array.isArray(results) &&
    results.length >= 1 &&
    results.length <= MAX_TEAMS &&
    results.every(
      (r) =>
        typeof r.teamName === "string" &&
        r.teamName.trim().length > 0 &&
        r.teamName.length <= 20 &&
        [r.score, r.total, r.correct, r.hintsUsed, r.timeSeconds].every(Number.isInteger) &&
        r.total === maxPoints &&
        r.score >= 0 &&
        r.score <= maxPoints &&
        r.correct >= 0 &&
        r.correct <= questionCount &&
        r.hintsUsed >= 0 &&
        r.timeSeconds >= 0,
    );
  if (!valid) return Response.json({ error: "Invalid score data" }, { status: 400 });

  const game = await prisma.game.create({
    data: {
      questionCount,
      results: {
        create: results.map((r) => ({
          teamName: r.teamName.trim(),
          score: r.score,
          total: r.total,
          correct: r.correct,
          hintsUsed: r.hintsUsed,
          timeSeconds: r.timeSeconds,
        })),
      },
    },
    select: { id: true },
  });
  return Response.json({ gameId: game.id }, { status: 201 });
}

// GET /api/scores -> top 20 results, most points first, ties broken by faster time.
export async function GET() {
  const rows = await prisma.teamResult.findMany({
    orderBy: [{ score: "desc" }, { timeSeconds: "asc" }],
    take: 20,
    select: {
      id: true,
      teamName: true,
      score: true,
      total: true,
      correct: true,
      hintsUsed: true,
      timeSeconds: true,
      createdAt: true,
    },
  });
  return Response.json({ scores: rows });
}
