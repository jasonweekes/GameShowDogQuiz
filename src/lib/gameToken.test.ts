import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issueGameToken, verifyGameToken } from "@/lib/gameToken";

const NOW = new Date("2026-01-01T12:00:00Z");
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("GAME_TOKEN_SECRET", "test-secret");
  vi.stubEnv("DATABASE_URL", "");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("game ticket", () => {
  it("round-trips the quiz size and issue time", () => {
    expect(verifyGameToken(issueGameToken(10, 3))).toEqual({ count: 10, teams: 3, issuedAt: NOW.getTime() });
  });

  it("gives every ticket a different value", () => {
    expect(issueGameToken(5, 2)).not.toBe(issueGameToken(5, 2));
  });

  it("is still valid just under 3 hours later, and expired just after", () => {
    const token = issueGameToken(5, 1);
    vi.setSystemTime(NOW.getTime() + 3 * HOUR);
    expect(verifyGameToken(token)).not.toBeNull();
    vi.setSystemTime(NOW.getTime() + 3 * HOUR + 1);
    expect(verifyGameToken(token)).toBeNull();
  });

  it("rejects a ticket dated in the future", () => {
    const token = issueGameToken(5, 1);
    vi.setSystemTime(NOW.getTime() - 1000);
    expect(verifyGameToken(token)).toBeNull();
  });

  describe("tampering", () => {
    it.each([
      ["question count", (p: string[]) => ((p[0] = "20"), p)],
      ["team count", (p: string[]) => ((p[1] = "1"), p)],
      ["issue time", (p: string[]) => ((p[2] = String(Number(p[2]) - 10 * HOUR)), p)],
      ["nonce", (p: string[]) => ((p[3] = "0000000000000000"), p)],
      ["signature", (p: string[]) => ((p[4] = p[4].replace(/^./, (c) => (c === "A" ? "B" : "A"))), p)],
    ])("rejects a ticket whose %s was edited", (_name, edit) => {
      const parts = issueGameToken(5, 2).split(".");
      expect(verifyGameToken(edit(parts).join("."))).toBeNull();
    });

    it("rejects a ticket signed with a different secret", () => {
      const token = issueGameToken(5, 2);
      vi.stubEnv("GAME_TOKEN_SECRET", "another-secret");
      expect(verifyGameToken(token)).toBeNull();
    });
  });

  describe("malformed input", () => {
    it.each([
      ["undefined", undefined],
      ["null", null],
      ["a number", 12345],
      ["an object", { token: "x" }],
      ["an empty string", ""],
      ["too few parts", "5.2.1.abc"],
      ["too many parts", "5.2.1.abc.def.ghi"],
      ["a very long string", "a.".repeat(300)],
    ])("rejects %s", (_name, value) => {
      expect(verifyGameToken(value)).toBeNull();
    });
  });

  describe("signing key", () => {
    it("falls back to a key derived from DATABASE_URL when GAME_TOKEN_SECRET is not set", () => {
      vi.stubEnv("GAME_TOKEN_SECRET", "");
      vi.stubEnv("DATABASE_URL", "postgresql://user:pw@host/db");
      expect(verifyGameToken(issueGameToken(5, 2))).not.toBeNull();
    });

    it("does not accept a ticket after the DATABASE_URL fallback key changes", () => {
      vi.stubEnv("GAME_TOKEN_SECRET", "");
      vi.stubEnv("DATABASE_URL", "postgresql://user:pw@host/db");
      const token = issueGameToken(5, 2);
      vi.stubEnv("DATABASE_URL", "postgresql://user:other@host/db");
      expect(verifyGameToken(token)).toBeNull();
    });

    it("refuses to issue tickets with no secret at all, and rejects everything it is shown", () => {
      const token = issueGameToken(5, 2);
      vi.stubEnv("GAME_TOKEN_SECRET", "");
      vi.stubEnv("DATABASE_URL", "");
      expect(() => issueGameToken(5, 2)).toThrow(/GAME_TOKEN_SECRET/);
      expect(verifyGameToken(token)).toBeNull();
    });
  });
});
