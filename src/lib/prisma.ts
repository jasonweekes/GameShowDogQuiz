import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse one client across dev hot-reloads so we don't open a new connection pool each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = new URL(process.env.DATABASE_URL ?? "");
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

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
