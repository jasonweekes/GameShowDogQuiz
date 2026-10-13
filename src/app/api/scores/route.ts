import { MIN_SECONDS_PER_QUESTION, verifyGameToken } from "@/lib/gameToken";
import { prisma } from "@/lib/prisma";
import { clientKey, createRateLimiter } from "@/lib/ratelimit";
import {
  HINT_COSTS,
  MAX_TEAMS,
  POINTS_PER_QUESTION,
  QUESTION_COUNTS,
  SECONDS_PER_QUESTION,
  type TeamResultInput,
} from "@/lib/types";

// Saving a game is rare; this only stops a script. 30 per 10 minutes leaves room for a whole class behind one address.
const rateLimited = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 });

/** Browsers always send Origin on a cross-site POST. If it is there and isn't this site, refuse. */
function crossSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false; // not a browser (curl, server): the game ticket and rate limit still apply
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

// POST /api/scores  { token, questionCount, results: [{ teamName, score, total, correct, hintsUsed, timeSeconds }] }
// Saves one Game with a TeamResult per team. `token` is the game ticket from /api/questions.
export async function POST(request: Request) {
  if (crossSite(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  if (rateLimited(clientKey(request))) {
    return Response.json({ error: "Too many saves, try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as {
    token?: string;
    questionCount?: number;
    results?: TeamResultInput[];
  } | null;

  const { token, questionCount, results } = body ?? {};
  const maxPoints = (questionCount ?? 0) * POINTS_PER_QUESTION;
  // The ticket proves the quiz was served by us, for this many questions and teams, and not too long ago.
  const ticket = verifyGameToken(token);
  const elapsedSeconds = ticket ? (Date.now() - ticket.issuedAt) / 1000 : 0;
  const valid =
    ticket !== null &&
    typeof questionCount === "number" &&
    (QUESTION_COUNTS as readonly number[]).includes(questionCount) &&
    ticket.count === questionCount &&
    Array.isArray(results) &&
    results.length >= 1 &&
    results.length <= MAX_TEAMS &&
    results.length === ticket.teams &&
    elapsedSeconds >= questionCount * ticket.teams * MIN_SECONDS_PER_QUESTION &&
    results.every(
      (r) =>
        r !== null &&
        typeof r === "object" &&
        typeof r.teamName === "string" &&
        r.teamName.trim().length > 0 &&
        r.teamName.length <= 20 &&
        [r.score, r.total, r.correct, r.hintsUsed, r.timeSeconds].every(Number.isInteger) &&
        r.total === maxPoints &&
        r.correct >= 0 &&
        r.correct <= questionCount &&
        // A right answer is worth 1 to 3 points: 3 minus the hint cost, and each hint used costs 1 point.
        r.score >= r.correct * (POINTS_PER_QUESTION - HINT_COSTS[2]) &&
        r.score <= r.correct * POINTS_PER_QUESTION &&
        r.score >= r.correct * POINTS_PER_QUESTION - r.hintsUsed &&
        r.score <= maxPoints &&
        r.hintsUsed >= 0 &&
        r.hintsUsed <= questionCount * 2 &&
        // Nobody answers faster than half a second a question, and a question costs at most 15 seconds.
        r.timeSeconds >= Math.floor(questionCount / 2) &&
        r.timeSeconds <= questionCount * SECONDS_PER_QUESTION,
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
