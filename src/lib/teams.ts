// One signature colour per team slot (team 1..4), used for badges, glows and the podium.
export const TEAM_COLORS = ["#dd6b00", "#2563eb", "#db2777", "#15803d"] as const;

export const teamColor = (index: number) => TEAM_COLORS[index % TEAM_COLORS.length];

const NAME_IDEAS = [
  "Good Boys",
  "Barking Mad",
  "Top Dogs",
  "Paw Patrol",
  "Fetch Fanatics",
  "Sit Happens",
  "The Pawsome Foursome",
  "Bark Side",
  "Wag Team",
  "Howlers",
  "Treat Seekers",
  "Alpha Pack",
  "Snout Out",
  "Pup Culture",
  "Retriever Rebels",
  "Lead Pack",
  "Hot Diggity Dogs",
  "Fur Real",
  "Tail Waggers",
  "Doggo Dynasty",
  "Muddy Paws",
  "Leash Resort",
  "Bone Voyage",
  "Nacho Average Dogs",
];

/** `count` distinct fun team names, avoiding any in `exclude` (case-insensitive). */
export function suggestNames(count: number, exclude: string[] = []): string[] {
  const taken = new Set(exclude.map((n) => n.trim().toLowerCase()));
  const pool = NAME_IDEAS.filter((n) => !taken.has(n.toLowerCase()));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export const MAX_NAME_LENGTH = 20;
