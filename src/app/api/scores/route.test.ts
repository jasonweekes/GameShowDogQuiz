import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueGameToken } from "@/lib/gameToken";
import { GET, POST } from "@/app/api/scores/route";

// The database is replaced by spies: these tests check what the route asks for and what it lets in.
const { findMany, create } = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { teamResult: { findMany }, game: { create } },
}));

const NOW = new Date("2026-01-01T12:00:00Z");
const SECOND = 1000;

type Result = Record<string, unknown> | null;

/** A believable result for a 5-question game: 3 right, no hints, 20 seconds. */
const result = (overrides: Result = {}): Result =>
  overrides === null
    ? null
    : { teamName: "Barkers", score: 9, total: 15, correct: 3, hintsUsed: 0, timeSeconds: 20, ...overrides };

let ip = 0;
/** POST /api/scores. Every call comes from a new client address unless one is given, so rate limits don't leak between tests. */
function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3000/api/scores", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vercel-forwarded-for": `10.0.0.${++ip}`,
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

/** A finished 5-question game for 2 teams with a valid ticket, played for `playedSeconds` since the ticket was issued. */
function finishedGame({
  results = [result(), result({ teamName: "Growlers" })],
  count = 5,
  teams = 2,
  playedSeconds = 120,
}: { results?: Result[]; count?: number; teams?: number; playedSeconds?: number } = {}) {
  vi.setSystemTime(NOW);
  const token = issueGameToken(count, teams);
  vi.setSystemTime(NOW.getTime() + playedSeconds * SECOND);
  return { token, questionCount: count, results };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("GAME_TOKEN_SECRET", "test-secret");
  create.mockResolvedValue({ id: 42 });
  findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/scores (the leaderboard)", () => {
  it("asks for the top 20, most points first, ties broken by the faster time", async () => {
    await GET();
    expect(findMany).toHaveBeenCalledTimes(1);
    const query = findMany.mock.calls[0][0];
    expect(query.orderBy).toEqual([{ score: "desc" }, { timeSeconds: "asc" }]);
    expect(query.take).toBe(20);
  });

  it("returns the rows it was given under `scores`", async () => {
    const rows = [
      { id: 2, teamName: "Fast", score: 15, total: 15, correct: 5, hintsUsed: 0, timeSeconds: 30, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: 1, teamName: "Slow", score: 15, total: 15, correct: 5, hintsUsed: 0, timeSeconds: 50, createdAt: "2026-01-01T00:00:00.000Z" },
    ];
    findMany.mockResolvedValue(rows);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scores: rows });
  });

  it("returns an empty list when nobody has played yet", async () => {
    expect(await (await GET()).json()).toEqual({ scores: [] });
  });

  it("selects only the public score fields, never other columns", async () => {
    await GET();
    const allowed = ["id", "teamName", "score", "total", "correct", "hintsUsed", "timeSeconds", "createdAt"];
    const selected = Object.keys(findMany.mock.calls[0][0].select);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.filter((field) => !allowed.includes(field))).toEqual([]);
  });
});

describe("POST /api/scores: saving a game", () => {
  describe("a valid game", () => {
    it("is saved with one result per team, and the new game id comes back", async () => {
      const response = await post(finishedGame());
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ gameId: 42 });
      expect(create).toHaveBeenCalledTimes(1);
      const data = create.mock.calls[0][0].data;
      expect(data.questionCount).toBe(5);
      expect(data.results.create).toEqual([
        { teamName: "Barkers", score: 9, total: 15, correct: 3, hintsUsed: 0, timeSeconds: 20 },
        { teamName: "Growlers", score: 9, total: 15, correct: 3, hintsUsed: 0, timeSeconds: 20 },
      ]);
    });

    it("trims spaces around team names before saving", async () => {
      await post(finishedGame({ results: [result({ teamName: "  Barkers  " }), result({ teamName: "Growlers" })] }));
      expect(create.mock.calls[0][0].data.results.create[0].teamName).toBe("Barkers");
    });

    it("accepts a 20-character name", async () => {
      const name = "A".repeat(20);
      expect((await post(finishedGame({ results: [result({ teamName: name }), result()] }))).status).toBe(201);
    });

    it("accepts a solo game", async () => {
      expect((await post(finishedGame({ teams: 1, results: [result()] }))).status).toBe(201);
    });

    it("accepts four teams", async () => {
      const teams = ["A", "B", "C", "D"].map((teamName) => result({ teamName }));
      expect((await post(finishedGame({ teams: 4, results: teams }))).status).toBe(201);
    });

    it("accepts the extremes: a perfect game, and a game with every answer wrong", async () => {
      const perfect = result({ score: 15, correct: 5, timeSeconds: 10 });
      const allWrong = result({ teamName: "Oops", score: 0, correct: 0, timeSeconds: 75 });
      expect((await post(finishedGame({ results: [perfect, allWrong] }))).status).toBe(201);
    });

    it("accepts scores lowered by hints (each hint costs a point)", async () => {
      // 3 correct = 9 points, minus 2 hints = 7
      expect((await post(finishedGame({ results: [result({ score: 7, hintsUsed: 2 }), result()] }))).status).toBe(201);
    });

    it.each([
      [5, 15],
      [10, 30],
      [15, 45],
      [20, 60],
    ])("accepts a %i-question game worth %i points", async (count, total) => {
      const teamResult = result({ total, score: total, correct: count, timeSeconds: count * 2 });
      expect((await post(finishedGame({ count, teams: 1, results: [teamResult] }))).status).toBe(201);
    });
  });

  describe("the game ticket", () => {
    const invalid = async (body: unknown) => {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid score data" });
      expect(create).not.toHaveBeenCalled();
    };

    it("is required", async () => {
      const { questionCount, results } = finishedGame();
      await invalid({ questionCount, results });
    });

    it("must be genuine", async () => {
      const { questionCount, results } = finishedGame();
      await invalid({ token: "5.2.1767268800000.abc.forged", questionCount, results });
    });

    it("must not have been edited", async () => {
      const game = finishedGame();
      const [, teams, ...rest] = game.token.split(".");
      await invalid({ ...game, token: ["5", String(Number(teams) + 1), ...rest].join(".") });
    });

    it("must not be older than 3 hours", async () => {
      await invalid(finishedGame({ playedSeconds: 3 * 60 * 60 + 1 }));
    });

    it("must be at least one second per question and team old (nobody finishes a game instantly)", async () => {
      await invalid(finishedGame({ playedSeconds: 9 })); // 5 questions x 2 teams = 10 seconds minimum
      expect((await post(finishedGame({ playedSeconds: 10 }))).status).toBe(201);
    });

    it("must be for the same number of questions", async () => {
      const game = finishedGame({ count: 5 });
      await invalid({ ...game, questionCount: 10, results: [result({ total: 30, score: 9, correct: 3, timeSeconds: 40 }), result()] });
    });

    it("must be for the same number of teams", async () => {
      await invalid(finishedGame({ teams: 3 })); // ticket says 3 teams, 2 results sent
      await invalid(finishedGame({ teams: 1 })); // ticket says 1 team, 2 results sent
    });
  });

  describe("the shape of the request", () => {
    it.each([
      ["a missing body", ""],
      ["text that is not JSON", "not json"],
      ["JSON null", "null"],
      ["an empty object", "{}"],
      ["an array", "[]"],
    ])("rejects %s", async (_name, body) => {
      expect((await post(body)).status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("rejects a question count that is not offered", async () => {
      expect((await post(finishedGame({ count: 7, teams: 1, results: [result({ total: 21 })] }))).status).toBe(400);
    });

    it("rejects an empty list of results", async () => {
      expect((await post(finishedGame({ teams: 1, results: [] }))).status).toBe(400);
    });

    it("rejects results that are not a list", async () => {
      const game = finishedGame();
      expect((await post({ ...game, results: "all of them" })).status).toBe(400);
    });

    it("rejects more than four teams", async () => {
      const five = ["A", "B", "C", "D", "E"].map((teamName) => result({ teamName }));
      expect((await post(finishedGame({ teams: 5, results: five }))).status).toBe(400);
    });

    it("rejects a null entry instead of crashing", async () => {
      expect((await post(finishedGame({ results: [null, result()] }))).status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("rejects an entry that is not an object", async () => {
      expect((await post({ ...finishedGame(), results: ["Barkers", 5] })).status).toBe(400);
    });

    it("refuses a body that is not application/json", async () => {
      const response = await post(finishedGame(), { "content-type": "text/plain" });
      expect(response.status).toBe(415);
      expect(create).not.toHaveBeenCalled();
    });

    it("refuses a request with no content type", async () => {
      const response = await post(finishedGame(), { "content-type": "" });
      expect(response.status).toBe(415);
    });
  });

  describe("team names", () => {
    it.each([
      ["empty", ""],
      ["only spaces", "    "],
      ["21 characters", "A".repeat(21)],
      ["not text", 123],
      ["missing", undefined],
    ])("rejects a name that is %s", async (_name, teamName) => {
      expect((await post(finishedGame({ results: [result({ teamName }), result()] }))).status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe("the numbers must be possible", () => {
    // Every case changes one thing in an otherwise valid 5-question result (3 correct, 9 points, 20 s).
    it.each([
      ["more points than 3 per correct answer", { score: 12, correct: 3 }],
      ["a perfect score with no correct answers", { score: 15, correct: 0, timeSeconds: 20 }],
      ["fewer points than one per correct answer", { score: 2, correct: 3 }],
      ["fewer points than hints could have cost", { score: 5, correct: 3, hintsUsed: 1 }],
      ["a total that is not 3 points x questions", { total: 20 }],
      ["a score above the maximum", { score: 16, correct: 5, total: 15 }],
      ["a negative score", { score: -1 }],
      ["more correct answers than questions", { correct: 6, score: 9 }],
      ["a negative number of correct answers", { correct: -1 }],
      ["more than 2 hints per question", { hintsUsed: 11 }],
      ["a negative number of hints", { hintsUsed: -1 }],
      ["more than 15 seconds per question", { timeSeconds: 76 }],
      ["faster than half a second per question", { timeSeconds: 1 }],
      ["no time at all", { timeSeconds: 0 }],
      ["a negative time", { timeSeconds: -5 }],
      ["a fractional score", { score: 8.5 }],
      ["a fractional time", { timeSeconds: 20.5 }],
      ["a score sent as text", { score: "9" }],
      ["a time that is not a number", { timeSeconds: NaN }],
      ["an enormous time", { timeSeconds: 99_999_999_999 }],
    ])("rejects %s", async (_name, overrides) => {
      const response = await post(finishedGame({ results: [result(overrides), result()] }));
      expect(response.status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("rejects the whole game if any one team's numbers are impossible", async () => {
      const response = await post(finishedGame({ results: [result(), result({ teamName: "Cheaters", score: 15, correct: 0 })] }));
      expect(response.status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("rejects the classic forgery: a perfect score in zero seconds with no correct answers", async () => {
      const forged = result({ teamName: "Top dog", score: 15, correct: 0, hintsUsed: 0, timeSeconds: 0 });
      expect((await post(finishedGame({ results: [forged, result()] }))).status).toBe(400);
    });
  });

  describe("who may post", () => {
    it("refuses a browser request from another website", async () => {
      const response = await post(finishedGame(), { origin: "https://evil.example", host: "localhost:3000" });
      expect(response.status).toBe(403);
      expect(create).not.toHaveBeenCalled();
    });

    it("refuses an Origin header that is not a URL", async () => {
      expect((await post(finishedGame(), { origin: "not a url", host: "localhost:3000" })).status).toBe(403);
    });

    it("accepts a request from the game's own website", async () => {
      const response = await post(finishedGame(), { origin: "http://localhost:3000", host: "localhost:3000" });
      expect(response.status).toBe(201);
    });

    it("accepts a request with no Origin header (the ticket and rate limit still apply)", async () => {
      expect((await post(finishedGame())).status).toBe(201);
    });
  });

  describe("rate limit", () => {
    it("allows 30 saves per client in 10 minutes, then answers 429", async () => {
      const client = { "x-vercel-forwarded-for": "203.0.113.7" };
      const statuses: number[] = [];
      for (let i = 0; i < 31; i++) statuses.push((await post("{}", client)).status);
      expect(statuses.slice(0, 30).every((status) => status === 400)).toBe(true); // reached validation
      expect(statuses[30]).toBe(429);
    });

    it("does not limit a different client", async () => {
      const busy = { "x-vercel-forwarded-for": "203.0.113.8" };
      for (let i = 0; i < 31; i++) await post("{}", busy);
      expect((await post("{}", busy)).status).toBe(429);
      expect((await post(finishedGame(), { "x-vercel-forwarded-for": "203.0.113.9" })).status).toBe(201);
    });

    it("lets a client back in after the 10 minutes are over", async () => {
      const client = { "x-vercel-forwarded-for": "203.0.113.10" };
      for (let i = 0; i < 31; i++) await post("{}", client);
      expect((await post("{}", client)).status).toBe(429);
      vi.setSystemTime(Date.now() + 10 * 60 * SECOND + 1);
      expect((await post("{}", client)).status).toBe(400);
    });

    it("counts by the address the host adds, not by one the caller makes up", async () => {
      // The first x-forwarded-for entry is written by the caller; only the last is added by the proxy.
      const statuses: number[] = [];
      for (let i = 0; i < 31; i++) {
        const response = await POST(
          new Request("http://localhost:3000/api/scores", {
            method: "POST",
            headers: { "content-type": "application/json", "x-forwarded-for": `6.6.6.${i}, 198.51.100.4` },
            body: "{}",
          }),
        );
        statuses.push(response.status);
      }
      expect(statuses[30]).toBe(429);
    });
  });
});
