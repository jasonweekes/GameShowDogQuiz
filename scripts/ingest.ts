// npm run ingest - reads docs/*.md, splits them into passages, embeds them with Voyage AI and
// stores them in the Supabase vector database (table "DocChunk"). Safe to re-run any time.
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chunkMarkdown, type Chunk } from "../src/lib/chunking";
import { countChunks, getPool, replaceDocuments } from "../src/lib/vector";

const DOCS_DIR = join(process.cwd(), "docs");

async function main() {
  // README.md describes the folder; it isn't one of the chatbot's documents.
  const files = readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();
  if (files.length === 0) throw new Error(`No documents found in ${DOCS_DIR}`);

  const chunks: Chunk[] = [];
  for (const file of files) {
    const doc = chunkMarkdown(file, readFileSync(join(DOCS_DIR, file), "utf8"));
    console.log(`  ${file}: ${doc.length} passages`);
    chunks.push(...doc);
  }

  console.log(`Embedding ${chunks.length} passages with Voyage AI...`);
  await replaceDocuments(chunks);
  console.log(`Done. ${await countChunks()} passages from ${files.length} documents are in the vector database.`);
}

main()
  .catch((err) => {
    console.error("Ingest failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
