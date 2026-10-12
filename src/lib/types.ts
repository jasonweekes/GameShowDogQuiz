export const QUESTION_COUNTS = [5, 10, 15, 20] as const;
export const MAX_TEAMS = 4;
export const SECONDS_PER_QUESTION = 15;

// Scoring: a correct answer is worth 3 points. Hints are taken out of that value.
export const POINTS_PER_QUESTION = 3;
/** Total points lost on a question by hint level: 0 = no hint, 1 = slight hint, 2 = bigger hint. */
export const HINT_COSTS = [0, 1, 2] as const;
export type HintLevel = 0 | 1 | 2;

export type Option = { value: string; label: string };

export type Question = {
  id: number;
  imageUrl: string;
  options: Option[]; // always 4, shuffled
  answer: string; // breed value of the correct option
};

export type TeamResultInput = {
  teamName: string;
  score: number; // points
  total: number; // max points
  correct: number;
  hintsUsed: number;
  timeSeconds: number;
};

/** How a tie for first place was settled (see components/TieBreaker.tsx). */
export type TieBreakResult = {
  teams: string[]; // the teams that were level on points
  winner: string | null; // null = still level after everything
  reason: "buzzer" | "time" | "tie"; // won by answering the photo, by fastest total time, or still tied
};
