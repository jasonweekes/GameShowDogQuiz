import type { TeamResultInput, TieBreakResult } from "@/lib/types";

// The game hands data between pages via sessionStorage (per browser tab, gone when closed).
export type GameSetup = { teams: string[]; count: number };
export type FinishedGame = {
  id: string; // unique per finished game, used to avoid saving the same game twice
  questionCount: number;
  results: TeamResultInput[];
  tieBreak?: TieBreakResult; // set when teams were level on points and a tie-breaker was played
  saved?: boolean;
};

const SETUP_KEY = "dogquiz.setup";
const FINISHED_KEY = "dogquiz.finished";

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked (private mode etc.) - the game just can't be resumed across pages
  }
}

export const loadSetup = () => read<GameSetup>(SETUP_KEY);
export const saveSetup = (s: GameSetup) => write(SETUP_KEY, s);
export const loadFinished = () => read<FinishedGame>(FINISHED_KEY);
export const saveFinished = (g: FinishedGame) => write(FINISHED_KEY, g);
