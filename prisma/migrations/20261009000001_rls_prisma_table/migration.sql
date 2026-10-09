-- Prisma's own bookkeeping table is also in the public schema, so Supabase would expose it through its REST API.
-- Lock it down the same way as the app tables (Prisma connects as the owner and bypasses RLS).
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
