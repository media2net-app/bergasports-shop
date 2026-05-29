import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ontbreekt.");
  }
  const pool = new pg.Pool({ connectionString });
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
