import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse one client across dev hot-reloads so we don't open a new connection pool each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Add it to .env locally, or to the host's environment variables.");
  }
  const url = new URL(raw);
  // `pgbouncer=true` is a Prisma-engine hint that the pg driver doesn't understand.
  url.searchParams.delete("pgbouncer");
  const adapter = new PrismaPg({
    connectionString: url.toString(),
    // Supabase requires TLS; its pooler certificate isn't in Node's default trust store.
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

// The client is created on first use, not when this file is imported. That keeps `next build` working
// without database access, and turns a missing DATABASE_URL into a clear runtime error instead of a build crash.
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => Reflect.get(getClient(), prop),
});
