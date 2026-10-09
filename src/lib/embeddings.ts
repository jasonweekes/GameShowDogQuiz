// Local text embeddings (no API key, no network after the first model download).
// all-MiniLM-L6-v2 turns a sentence into 384 numbers; similar meanings give similar vectors.
// Relative imports only: also used by scripts/ingest.ts (via tsx).

export const EMBEDDING_DIMS = 384;
const MODEL = "Xenova/all-MiniLM-L6-v2";

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

// Load the model once per server process (it takes ~2s and ~100MB of RAM); survives dev hot reloads.
const globalForEmbedder = globalThis as unknown as { embedder?: Promise<Extractor> };

function getExtractor(): Promise<Extractor> {
  globalForEmbedder.embedder ??= (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    return (await pipeline("feature-extraction", MODEL)) as unknown as Extractor;
  })();
  return globalForEmbedder.embedder;
}

/** Embed texts into unit-length vectors (so cosine similarity == dot product). */
export async function embed(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}
