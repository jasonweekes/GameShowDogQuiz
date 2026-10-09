-- Vector database for the chatbot, using Supabase's pgvector extension.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- CreateTable
CREATE TABLE "DocChunk" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" extensions.vector(384) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocChunk_source_chunkIndex_key" ON "DocChunk"("source", "chunkIndex");

-- Approximate nearest-neighbour index for cosine similarity search.
CREATE INDEX "DocChunk_embedding_idx" ON "DocChunk" USING hnsw ("embedding" extensions.vector_cosine_ops);

-- Same lock-down as the other tables: no public API access, Prisma/pg connect as the owner and bypass RLS.
ALTER TABLE "DocChunk" ENABLE ROW LEVEL SECURITY;
