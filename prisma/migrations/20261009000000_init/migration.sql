-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamResult" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "timeSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamResult_score_timeSeconds_idx" ON "TeamResult"("score", "timeSeconds");

-- AddForeignKey
ALTER TABLE "TeamResult" ADD CONSTRAINT "TeamResult_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public tables through its REST API using the anon key.
-- Turning on Row Level Security with no policies blocks that API entirely.
-- The app connects through Prisma as the table owner (postgres), which bypasses RLS, so it is unaffected.
ALTER TABLE "Game" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamResult" ENABLE ROW LEVEL SECURITY;
