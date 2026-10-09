// The vector database: Supabase Postgres + pgvector, queried with raw SQL
// (Prisma can't read/write the vector column). Relative imports only: also used by scripts/ingest.ts.
import { Pool } from "pg";
import type { Chunk } from "./chunking";
import { embed } from "./embeddings";

export type Match = {
  source: string;
  title: string;
  heading: string;
  content: string;
  score: number; // cosine similarity, 0 (unrelated) to 1 (identical meaning)
};

const globalForPool = globalThis as unknown as { vectorPool?: Pool };

export function getPool(): Pool {
  if (!globalForPool.vectorPool) {
    const url = new URL(process.env.DATABASE_URL ?? "");
    url.searchParams.delete("pgbouncer"); // Prisma-only hint
    globalForPool.vectorPool = new Pool({
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false }, // Supabase pooler cert isn't in Node's trust store
      max: 3,
    });
  }
  return globalForPool.vectorPool;
}

const literal = (v: number[]) => `[${v.join(",")}]`;

/** The document that tells Tiffee which dog breeds make good companions for different moods. */
export const COMPANION_SOURCE = "08-companion-dogs.md";

/** Turn a question into the vector used for searching (do this once, then search as often as needed). */
export async function embedQuery(question: string): Promise<number[]> {
  const [vec] = await embed([question]);
  return vec;
}

/** The k passages closest to a query vector; `source` limits the search to one document. */
export async function searchByVector(vec: number[], k = 4, source?: string): Promise<Match[]> {
  const { rows } = await getPool().query(
    `select source, title, heading, content,
            1 - (embedding <=> $1::vector) as score
       from "DocChunk"
      where ($3::text is null or source = $3)
      order by embedding <=> $1::vector
      limit $2`,
    [literal(vec), k, source ?? null],
  );
  return rows.map((r) => ({ ...r, score: Number(r.score) }));
}

/** The k passages whose meaning is closest to the question. */
export async function searchChunks(question: string, k = 4, source?: string): Promise<Match[]> {
  return searchByVector(await embedQuery(question), k, source);
}

/** Replace the whole knowledge base with fresh chunks + embeddings (also drops passages of deleted docs). */
export async function replaceDocuments(chunks: Chunk[]): Promise<void> {
  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += 16) {
    vectors.push(...(await embed(chunks.slice(i, i + 16).map((c) => c.content))));
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query('delete from "DocChunk"');
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      await client.query(
        `insert into "DocChunk" (source, title, heading, "chunkIndex", content, embedding)
         values ($1, $2, $3, $4, $5, $6::vector)`,
        [c.source, c.title, c.heading, c.chunkIndex, c.content, literal(vectors[i])],
      );
    }
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function countChunks(): Promise<number> {
  const { rows } = await getPool().query('select count(*)::int as n from "DocChunk"');
  return rows[0].n;
}
