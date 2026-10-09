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

/**
 * Build `count` questions with distinct answer breeds. We start a few extra
 * candidates so a failed image fetch doesn't leave the quiz short.
 */
export async function buildQuestions(count: number): Promise<Question[]> {
  const candidates = shuffle(QUIZ_BREEDS).slice(0, count + 5);
  const settled = await Promise.allSettled(
    candidates.map(async (breed) => ({
      breed,
      imageUrl: await getRandomImage(breed.value),
    })),
  );

  const good = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (good.length < count) {
    throw new Error("Could not load enough dog pictures. Please try again.");
  }

  return good.slice(0, count).map(({ breed, imageUrl }, i) => ({
    id: i,
    imageUrl,
    answer: breed.value,
    options: shuffle([breed, ...pickDistractors(breed)]).map(toOption),
  }));
}
