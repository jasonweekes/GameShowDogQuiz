-- Embeddings now come from Voyage AI (512 dimensions) instead of a local 384-dimension model,
-- so the vector column is resized. Vectors from different models can't be compared, which means the
-- old rows are useless here: they are removed and `npm run ingest` re-creates them.
DROP INDEX IF EXISTS "DocChunk_embedding_idx";
DELETE FROM "DocChunk";
ALTER TABLE "DocChunk" ALTER COLUMN "embedding" TYPE extensions.vector(512);
CREATE INDEX "DocChunk_embedding_idx" ON "DocChunk" USING hnsw ("embedding" extensions.vector_cosine_ops);
