import { buildQuiz } from "@/lib/quiz";
import { MAX_TEAMS, QUESTION_COUNTS } from "@/lib/types";

// Fetching up to ~90 dog photos can exceed a serverless host's ~10s default.
export const maxDuration = 30;

// GET /api/questions?count=10&teams=2
// -> { sets: Question[][], tiebreak: Question | null }
// Every team gets its own set of questions (no breed or photo is shared between teams), and one more
// question is held back for a tie-breaker.
// Note: the correct answers are included in the response. That's fine for a local class game, but a
// competitive deployment would verify answers server-side.
export async function GET(request: Request) {
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
    return Response.json(await buildQuiz(count, teams));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load questions";
    return Response.json({ error: message }, { status: 502 });
  }
}
