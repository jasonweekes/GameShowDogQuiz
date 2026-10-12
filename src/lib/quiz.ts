import { QUIZ_BREEDS, breedLabel, type Breed } from "@/data/breeds";
import { getRandomImage } from "@/lib/dog";
import type { Option, Question } from "@/lib/types";

function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const toOption = (b: Breed): Option => ({
  value: b.value,
  label: breedLabel(b.value),
});

/** First word of the id ("terrier", "bulldog", "hound"...) groups look-alike breeds. */
const family = (value: string) => value.split("-")[0];

function pickDistractors(answer: Breed, count = 3): Breed[] {
  const others = QUIZ_BREEDS.filter((b) => b.value !== answer.value);
  const lookAlikes = shuffle(
    others.filter((b) => family(b.value) === family(answer.value)),
  );
  // Half the time, make the question harder with up to 2 look-alikes.
  const wantLookAlikes = Math.random() < 0.5 ? 2 : 0;
  const chosen = lookAlikes.slice(0, Math.min(wantLookAlikes, count));
  const rest = shuffle(
    others.filter((b) => !chosen.some((c) => c.value === b.value)),
  );
  return [...chosen, ...rest.slice(0, count - chosen.length)];
}

/** Fetch one photo per breed with a few requests in flight at a time (kind to dog.ceo). */
async function fetchPhotos(breeds: Breed[], concurrency = 10) {
  const results: ({ breed: Breed; imageUrl: string } | null)[] = new Array(breeds.length).fill(null);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, breeds.length) }, async () => {
      while (next < breeds.length) {
        const i = next++;
        try {
          results[i] = { breed: breeds[i], imageUrl: await getRandomImage(breeds[i].value) };
        } catch {
          results[i] = null; // that breed's photo failed; the spare candidates cover for it
        }
      }
    }),
  );
  return results.flatMap((r) => (r ? [r] : []));
}

export type Quiz = {
  /** One list of questions per team. No breed or photo appears twice anywhere in the quiz. */
  sets: Question[][];
  /** One extra question, never shown in the sets, held back for a tie-breaker (null for a solo game). */
  tiebreak: Question | null;
};

/**
 * Build a quiz where every team gets its OWN questions, so a team can't learn from watching another
 * team's turn. All answer breeds are distinct across the whole quiz. We start a few spare candidates so
 * a failed photo doesn't leave the quiz short.
 */
export async function buildQuiz(count: number, teams: number): Promise<Quiz> {
  const needTiebreak = teams > 1;
  const total = count * teams + (needTiebreak ? 1 : 0);

  const candidates = shuffle(QUIZ_BREEDS).slice(0, total + 8);
  const photos = await fetchPhotos(candidates);
  if (photos.length < total) {
    throw new Error("Could not load enough dog pictures. Please try again.");
  }

  const questions: Question[] = photos.slice(0, total).map(({ breed, imageUrl }, i) => ({
    id: i,
    imageUrl,
    answer: breed.value,
    options: shuffle([breed, ...pickDistractors(breed)]).map(toOption),
  }));

  const sets = Array.from({ length: teams }, (_, t) => questions.slice(t * count, (t + 1) * count));
  return { sets, tiebreak: needTiebreak ? questions[total - 1] : null };
}
