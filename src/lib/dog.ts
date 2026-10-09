const API = "https://dog.ceo/api";

/**
 * Turn a breed id from the dropdown into the dog.ceo URL path.
 * The API nests sub-breeds, so split on the FIRST hyphen:
 *   "bulldog-boston" -> "bulldog/boston", "rough-collie" -> "rough/collie".
 * Single-word ids stay flat ("mix", "affenpinscher").
 */
export function breedPath(value: string): string {
  const i = value.indexOf("-");
  return i === -1 ? value : `${value.slice(0, i)}/${value.slice(i + 1)}`;
}

/** Fetch one random image URL for a breed. Throws if the API says it failed. */
export async function getRandomImage(value: string): Promise<string> {
  const res = await fetch(`${API}/breed/${breedPath(value)}/images/random`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`dog.ceo ${res.status} for ${value}`);
  const data = (await res.json()) as { message: string; status: string };
  if (data.status !== "success") throw new Error(`dog.ceo failed for ${value}`);
  return data.message;
}
