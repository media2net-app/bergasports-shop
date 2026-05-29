import "server-only";

import { requirePrisma } from "@/lib/database";
import { readTrendyolDatabase } from "@/lib/trendyol-json-store";
import { productIdToBigInt } from "@/lib/prisma-mappers";
import type { Prisma } from "@/generated/prisma/client";

const BATCH_SIZE = 50;

export type SyncProductsToSupabaseResult = {
  ok: true;
  productCount: number;
  batches: number;
  ms: number;
};

/** @deprecated Naam behouden voor API-route; schrijft naar Prisma Postgres. */
export async function syncAllProductsToSupabase(): Promise<SyncProductsToSupabaseResult> {
  const prisma = requirePrisma();
  const started = Date.now();
  const db = await readTrendyolDatabase();

  let batches = 0;
  for (let i = 0; i < db.products.length; i += BATCH_SIZE) {
    const chunk = db.products.slice(i, i + BATCH_SIZE);
    for (const p of chunk) {
      await prisma.product.upsert({
        where: { id: productIdToBigInt(p.id) },
        create: {
          id: productIdToBigInt(p.id),
          data: p as unknown as Prisma.InputJsonValue,
        },
        update: {
          data: p as unknown as Prisma.InputJsonValue,
        },
      });
    }
    batches += 1;
  }

  return {
    ok: true,
    productCount: db.products.length,
    batches,
    ms: Date.now() - started,
  };
}
