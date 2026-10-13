import { issueGameToken } from "@/lib/gameToken";
import { buildQuiz } from "@/lib/quiz";
import { clientKey, createRateLimiter } from "@/lib/ratelimit";
import { MAX_TEAMS, QUESTION_COUNTS } from "@/lib/types";

// Fetching up to ~90 dog photos can exceed a serverless host's ~10s default.
export const maxDuration = 30;

// Every call fans out into dozens of dog.ceo requests and hands out a game ticket, so cap it per client.
// 30 per 10 minutes leaves room for a whole class behind one address.
const rateLimited = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 });

// GET /api/questions?count=10&teams=2
// -> { sets: Question[][], tiebreak: Question | null, token: string | null }
// `token` is the signed game ticket that /api/scores requires when the results are saved.
// Every team gets its own set of questions (no breed or photo is shared between teams), and one more
// question is held back for a tie-breaker.
// Note: the correct answers are included in the response. That's fine for a local class game, but a
// competitive deployment would verify answers server-side.
export async function GET(request: Request) {
  if (rateLimited(clientKey(request))) {
    return Response.json({ error: "Too many games started, try again in a few minutes." }, { status: 429 });
  }
  const params = new URL(request.url).searchParams;
  const count = Number(params.get("count"));
  const teams = Number(params.get("teams") ?? 1);

  if (!(QUESTION_COUNTS as readonly number[]).includes(count)) {
    return Response.json({ error: `count must be one of ${QUESTION_COUNTS.join(", ")}` }, { status: 400 });
  }
  if (!Number.isInteger(teams) || teams < 1 || teams > MAX_TEAMS) {
    return Response.json({ error: `teams must be between 1 and ${MAX_TEAMS}` }, { status: 400 });
  }

  try {
    const quiz = await buildQuiz(count, teams);
    let token: string | null = null;
    try {
      token = issueGameToken(count, teams);
    } catch {
      // No signing secret configured: the quiz still plays, but its score can't be saved.
    }
    return Response.json({ ...quiz, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load questions";
    return Response.json({ error: message }, { status: 502 });
  }
}
