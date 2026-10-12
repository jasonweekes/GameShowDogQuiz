import { buildQuestions } from "@/lib/quiz";
import { QUESTION_COUNTS } from "@/lib/types";

// Fetching up to 25 dog photos in parallel can exceed a serverless host's ~10s default.
export const maxDuration = 30;

// GET /api/questions?count=10
// Note: the correct answer is included in the response. That's fine for a
// local class game, but a competitive deployment would verify answers server-side.
export async function GET(request: Request) {
  const count = Number(new URL(request.url).searchParams.get("count"));
  if (!(QUESTION_COUNTS as readonly number[]).includes(count)) {
    return Response.json(
      { error: `count must be one of ${QUESTION_COUNTS.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    return Response.json({ questions: await buildQuestions(count) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load questions";
    return Response.json({ error: message }, { status: 502 });
  }
}
