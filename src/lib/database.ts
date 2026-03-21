import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL;

  // Prisma 7 + pg adapter requires standard postgresql:// URL.
  // prisma+postgres:// from `prisma dev` is not compatible with the pg driver.
  if (!connectionString || connectionString.startsWith("prisma+postgres")) {
    connectionString = "postgresql://localhost:5432/ai_life_admin";
  }
  // Do NOT add sslmode=require for Supabase: pg parses it and overrides our ssl config.
  // We use ssl: { rejectUnauthorized: false } in poolConfig instead.

  // Supabase: use PoolConfig with ssl.rejectUnauthorized to avoid "self-signed certificate in certificate chain"
  const poolConfig = connectionString.includes("supabase")
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false },
      }
    : { connectionString };

  const adapter = new PrismaPg(poolConfig);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
