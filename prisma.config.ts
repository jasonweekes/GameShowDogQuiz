import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrate, studio) needs a session-mode connection, so it uses DIRECT_URL
// (Supabase session pooler, port 5432). The running app uses DATABASE_URL (see src/lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
