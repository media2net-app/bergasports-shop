import "server-only";

import { getPrisma, isPrismaConfigured } from "@/lib/prisma";

export function requirePrisma() {
  const client = getPrisma();
  if (!client) {
    throw new Error("DATABASE_URL ontbreekt.");
  }
  return client;
}

export function canWriteProductsToDatabase(): boolean {
  return isPrismaConfigured();
}

export function isDatabaseConfigured(): boolean {
  return isPrismaConfigured();
}
