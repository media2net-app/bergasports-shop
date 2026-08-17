import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function normalizeDatabaseUrl(raw: string): string {
  // Strip sslmode — newer `pg` treats require as verify-full and breaks on some hosts.
  // SSL is configured explicitly on the Pool instead.
  return raw
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/\?$/, "");
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL ontbreekt.");
  }
  const connectionString = normalizeDatabaseUrl(raw);
  const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString);
  // Serverless (Vercel): keep pool tiny. Supabase session pooler (5432) caps ~15 clients;
  // prefer transaction pooler (:6543) in DATABASE_URL for production.
  const pool = new pg.Pool(
    isLocal
      ? { connectionString, max: 5 }
      : {
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: 1,
          idleTimeoutMillis: 10_000,
          connectionTimeoutMillis: 15_000,
          allowExitOnIdle: true,
        },
  );
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/** Prisma client singleton (server-only). Returns null when DATABASE_URL is unset. */
export function getPrisma(): PrismaClient | null {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export function isPrismaConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
