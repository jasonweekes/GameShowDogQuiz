import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// A signed "game ticket". /api/questions hands one out with every quiz, and /api/scores only saves
// results that carry a valid, unexpired ticket matching the quiz size. That means a score cannot be
// posted for a game the server never served, or one that finished impossibly fast.
// The ticket does NOT prove the answers were honest: answers still live in the browser (see CLAUDE.md).

const MAX_AGE_MS = 3 * 60 * 60 * 1000; // a game must be saved within 3 hours
export const MIN_SECONDS_PER_QUESTION = 1; // across all teams; nobody reads a photo and answers faster

export type GameTicket = { count: number; teams: number; issuedAt: number };

/** Key for signing. GAME_TOKEN_SECRET if set, otherwise derived from DATABASE_URL (already secret, already on every host). */
function key(): Buffer {
  const secret = process.env.GAME_TOKEN_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("Set GAME_TOKEN_SECRET (or DATABASE_URL) to sign game tickets");
  return createHash("sha256").update(`dogquiz.game-ticket:${secret}`).digest();
}

const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export function issueGameToken(count: number, teams: number): string {
  const payload = `${count}.${teams}.${Date.now()}.${randomBytes(8).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

/** The ticket's contents if the signature is valid and it hasn't expired, otherwise null. */
export function verifyGameToken(token: unknown): GameTicket | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [count, teams, issuedAt, nonce, signature] = parts;

  let expected: Buffer;
  try {
    expected = Buffer.from(sign(`${count}.${teams}.${issuedAt}.${nonce}`));
  } catch {
    return null; // no signing secret configured
  }
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const ticket = { count: Number(count), teams: Number(teams), issuedAt: Number(issuedAt) };
  const age = Date.now() - ticket.issuedAt;
  if (!Number.isInteger(ticket.count) || !Number.isInteger(ticket.teams) || age < 0 || age > MAX_AGE_MS) return null;
  return ticket;
}
