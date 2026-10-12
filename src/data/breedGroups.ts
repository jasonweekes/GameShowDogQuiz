// What kind of dog each breed is. Used for the first (gentle) hint, which describes the job or
// character of the breed without naming letters. Groups follow the AKC-style grouping described in
// docs/03-breed-groups.md; "regional", "wild" and "mixed" cover dogs that aren't kennel-club breeds.

export type BreedGroup =
  | "sporting"
  | "hound"
  | "working"
  | "terrier"
  | "toy"
  | "nonsporting"
  | "herding"
  | "regional"
  | "wild"
  | "mixed";

const GROUPS: Record<BreedGroup, string[]> = {
  sporting: [
    "clumber", "labrador", "pointer-german", "pointer-germanlonghair", "retriever-chesapeake",
    "retriever-curly", "retriever-flatcoated", "retriever-golden", "setter-english", "setter-gordon",
    "setter-irish", "spaniel-brittany", "spaniel-cocker", "spaniel-irish", "spaniel-sussex",
    "spaniel-welsh", "springer-english", "vizsla", "weimaraner",
  ],
  hound: [
    "basenji", "beagle", "bluetick", "borzoi", "coonhound", "dachshund", "deerhound-scottish",
    "elkhound-norwegian", "hound-afghan", "hound-basset", "hound-blood", "hound-english", "hound-ibizan",
    "hound-plott", "hound-walker", "otterhound", "redbone", "ridgeback-rhodesian", "saluki",
    "segugio-italian", "whippet", "wolfhound-irish",
  ],
  working: [
    "akita", "appenzeller", "boxer", "dane-great", "doberman", "husky", "komondor", "kuvasz", "leonberg",
    "malamute", "mastiff-bull", "mastiff-english", "mastiff-tibetan", "mountain-bernese", "mountain-swiss",
    "newfoundland", "ovcharka-caucasian", "pyrenees", "rottweiler", "samoyed", "schnauzer-giant", "stbernard",
  ],
  terrier: [
    "airedale", "bullterrier-staffordshire", "pitbull", "schnauzer-miniature", "terrier-american",
    "terrier-andalusian", "terrier-australian", "terrier-bedlington", "terrier-border", "terrier-cairn",
    "terrier-dandie", "terrier-fox", "terrier-irish", "terrier-kerryblue", "terrier-lakeland",
    "terrier-norfolk", "terrier-norwich", "terrier-patterdale", "terrier-russell", "terrier-scottish",
    "terrier-sealyham", "terrier-welsh", "terrier-westhighland", "terrier-wheaten",
  ],
  toy: [
    "affenpinscher", "brabancon", "chihuahua", "cotondetulear", "greyhound-italian", "havanese", "maltese",
    "papillon", "pekinese", "pinscher-miniature", "pomeranian", "poodle-toy", "pug", "shihtzu",
    "spaniel-blenheim", "spaniel-japanese", "terrier-silky", "terrier-toy", "terrier-yorkshire",
  ],
  nonsporting: [
    "bulldog-boston", "bulldog-english", "bulldog-french", "chow", "dalmatian", "eskimo", "frise-bichon",
    "keeshond", "lhasa", "mexicanhairless", "poodle-medium", "poodle-miniature", "poodle-standard",
    "schipperke", "sharpei", "shiba", "spitz-japanese", "terrier-boston", "terrier-tibetan",
  ],
  herding: [
    "australian-kelpie", "australian-shepherd", "bouvier", "briard", "buhund-norwegian", "cattledog-australian",
    "collie-border", "corgi-cardigan", "entlebucher", "finnish-lapphund", "german-shepherd", "groenendael",
    "kelpie", "malinois", "pembroke", "rough-collie", "sheepdog-english", "sheepdog-shetland", "tervuren",
    "waterdog-spanish",
  ],
  regional: [
    "bakharwal-indian", "chippiparai-indian", "danishswedish-farmdog", "gaddi-indian", "greyhound-indian",
    "kombai", "mastiff-indian", "mudhol-indian", "pariah-indian", "rajapalayam-indian", "sheepdog-indian",
    "spitz-indian",
  ],
  wild: ["african-wild", "dhole", "dingo"],
  mixed: ["cavapoo", "cockapoo", "labradoodle", "mix", "puggle"],
};

const GROUP_BY_BREED = new Map<string, BreedGroup>(
  (Object.entries(GROUPS) as [BreedGroup, string[]][]).flatMap(([group, breeds]) =>
    breeds.map((b) => [b, group] as const),
  ),
);

/** A gentle clue about the breed's job or character. It never names the group or any letters. */
const NUDGE: Record<BreedGroup, string> = {
  sporting: "A hunter's helper, bred to find and fetch birds.",
  hound: "Bred to chase or track game, by nose or by speed.",
  working: "A strong helper, bred to guard, pull or rescue.",
  terrier: "Feisty and fearless, bred to chase critters out of burrows.",
  toy: "Small enough to ride in a bag: a pocket-sized companion.",
  nonsporting: "A companion with a distinctive look and no single job.",
  herding: "Quick and clever, bred to gather and move livestock.",
  regional: "A regional dog, shaped by the place it comes from.",
  wild: "Not really a pet breed: think wild, free-ranging dogs.",
  mixed: "A cross between two breeds, a popular \"designer\" mix.",
};

export const groupOf = (breed: string): BreedGroup | undefined => GROUP_BY_BREED.get(breed);

/** First hint text for a breed id. */
export function hintNudge(breed: string): string {
  const g = groupOf(breed);
  return g ? NUDGE[g] : "A dog with a character all its own.";
}
