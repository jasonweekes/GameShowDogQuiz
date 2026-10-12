// Text embeddings from Voyage AI (the embeddings provider Anthropic recommends alongside Claude).
// An embedding turns a sentence into a list of numbers; sentences with similar meaning get similar numbers,
// which is what lets the vector database find the document passages closest to a question.
// Relative imports only: also used by scripts/ingest.ts (via tsx).

export const EMBEDDING_DIMS = 512; // must match the "embedding" column type in the DocChunk table
const MODEL = "voyage-4-lite";
const ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 32;
const DEFAULT_ATTEMPTS = 5;

/** "document" for passages we store, "query" for a player's question (Voyage tunes each differently). */
export type EmbedKind = "query" | "document";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function embedBatch(texts: string[], kind: EmbedKind, maxAttempts: number): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set (get a free key at https://www.voyageai.com/)");

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: texts, model: MODEL, input_type: kind, output_dimension: EMBEDDING_DIMS }),
    });

    if (res.ok) {
      const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }

    // Rate limited (429) or a temporary Voyage problem (5xx): wait and try again.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === maxAttempts) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new Error(`Voyage embeddings failed (${res.status}): ${detail}`);
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    // Wait as long as Voyage asks, otherwise back off 2s, 4s, 8s... but never more than 25s at a time.
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** (attempt - 1);
    await sleep(Math.min(waitMs, 25_000));
  }
}

/** Embed texts into unit-length vectors (so cosine similarity == dot product).
 *
 * `maxAttempts` is how many times to try when Voyage is rate limited. Ingest can afford to wait it out;
 * a player waiting on a chat answer cannot, so queries use fewer attempts.
 */
export async function embed(texts: string[], kind: EmbedKind, maxAttempts = DEFAULT_ATTEMPTS): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE), kind, maxAttempts)));
  }
  return out;
}
