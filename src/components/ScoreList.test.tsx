import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ScoreList, { type ScoreRow } from "@/components/ScoreList";

const row = (id: number, overrides: Partial<ScoreRow> = {}): ScoreRow => ({
  id,
  teamName: `Team ${id}`,
  score: 9,
  total: 15,
  correct: 3,
  hintsUsed: 0,
  timeSeconds: 42,
  ...overrides,
});

const html = (scores: ScoreRow[]) => renderToStaticMarkup(<ScoreList scores={scores} />);
/** The visible text of the markup, tags removed and whitespace collapsed. */
const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
/** One string per leaderboard row. */
const rows = (markup: string) => [...markup.matchAll(/<li\b[\s\S]*?<\/li>/g)].map((m) => text(m[0]));

describe("ScoreList", () => {
  describe("empty board", () => {
    it("invites the first team to play instead of rendering an empty list", () => {
      const markup = html([]);
      expect(text(markup)).toContain("The board is empty");
      expect(text(markup)).toContain("Be the first team to claim the top spot.");
      expect(markup).not.toContain("<ol");
      expect(markup).not.toContain("<li");
    });
  });

  describe("ranking", () => {
    it("shows rows in the order given, one per result", () => {
      const markup = html([row(1, { teamName: "Alpha" }), row(2, { teamName: "Bravo" }), row(3, { teamName: "Charlie" })]);
      const list = rows(markup);
      expect(list).toHaveLength(3);
      expect(list[0]).toContain("Alpha");
      expect(list[1]).toContain("Bravo");
      expect(list[2]).toContain("Charlie");
    });

    it("gives medals to the top three and plain numbers after that", () => {
      const list = rows(html([1, 2, 3, 4, 5].map((id) => row(id))));
      expect(list[0]).toMatch(/^🥇/);
      expect(list[1]).toMatch(/^🥈/);
      expect(list[2]).toMatch(/^🥉/);
      expect(list[3]).toMatch(/^4 /);
      expect(list[4]).toMatch(/^5 /);
    });

    it("highlights only the leader", () => {
      const items = html([row(1), row(2), row(3)]).match(/<li\b[^>]*>/g)!;
      expect(items[0]).toContain("from-amber/15");
      expect(items[1]).not.toContain("from-amber/15");
      expect(items[2]).not.toContain("from-amber/15");
    });

    it("renders a full top 20", () => {
      const list = rows(html(Array.from({ length: 20 }, (_, i) => row(i + 1))));
      expect(list).toHaveLength(20);
      expect(list[19]).toMatch(/^20 /);
    });

    it("keeps teams with identical results as separate rows", () => {
      const list = rows(html([row(1, { teamName: "Twins" }), row(2, { teamName: "Twins" })]));
      expect(list).toHaveLength(2);
    });
  });

  describe("row details", () => {
    it("shows the score out of the maximum points", () => {
      const [first] = rows(html([row(1, { score: 12, total: 15 })]));
      expect(first).toContain("12");
      expect(first).toContain("of 15 pts");
    });

    it("shows correct answers out of the number of questions (total points / 3)", () => {
      expect(rows(html([row(1, { correct: 7, total: 30 })]))[0]).toContain("7/10 correct");
      expect(rows(html([row(1, { correct: 20, total: 60 })]))[0]).toContain("20/20 correct");
      expect(rows(html([row(1, { correct: 0, total: 15 })]))[0]).toContain("0/5 correct");
    });

    it("uses singular and plural for hints", () => {
      expect(rows(html([row(1, { hintsUsed: 0 })]))[0]).toContain("0 hints");
      expect(rows(html([row(1, { hintsUsed: 1 })]))[0]).toContain("1 hint ·");
      expect(rows(html([row(1, { hintsUsed: 1 })]))[0]).not.toContain("1 hints");
      expect(rows(html([row(1, { hintsUsed: 2 })]))[0]).toContain("2 hints");
    });

    it.each([
      [42, "42s"],
      [60, "1:00"],
      [75, "1:15"],
      [305, "5:05"],
    ])("formats a time of %i seconds as %s", (timeSeconds, shown) => {
      expect(rows(html([row(1, { timeSeconds })]))[0]).toContain(shown);
    });

    it("puts the whole stats line together", () => {
      const [first] = rows(html([row(1, { teamName: "Barkers", score: 8, total: 15, correct: 3, hintsUsed: 1, timeSeconds: 75 })]));
      expect(first).toBe("🥇 Barkers 3/5 correct · 1 hint · 1:15 8 of 15 pts");
    });
  });

  describe("safety", () => {
    it("escapes team names so markup typed into a name is shown as text", () => {
      const markup = html([row(1, { teamName: '<img src=x onerror="alert(1)">' })]);
      expect(markup).not.toContain("<img");
      expect(markup).toContain("&lt;img");
    });

    it("escapes script tags in team names", () => {
      const markup = html([row(1, { teamName: "<script>alert(1)</script>" })]);
      expect(markup).not.toContain("<script");
      expect(markup).toContain("&lt;script&gt;");
    });

    it("does not let a name break the row layout", () => {
      const markup = html([row(1, { teamName: "</li><li>fake</li>" })]);
      expect(markup.match(/<li\b/g)).toHaveLength(1);
    });
  });
});
