import "server-only";

import type { TrendyolJsonProduct } from "@/lib/products";
import {
  deleteProductRaw,
  deleteProductsRaw,
  fetchAllProductsRaw,
  getProductRawById,
  isDatabaseWritable,
  nextProductId,
  readProductsDatabase,
  upsertProductRaw,
  type ProductsDatabase,
} from "@/lib/products-db";

export type TrendyolDatabase = ProductsDatabase;

export function isWritableFilesystem(): boolean {
  return isDatabaseWritable();
}

export async function readTrendyolDatabase(): Promise<TrendyolDatabase> {
  return readProductsDatabase();
}

export async function writeTrendyolDatabase(_data: TrendyolDatabase): Promise<void> {
  throw new Error(
    "writeTrendyolDatabase is vervangen door upsertProductRaw/deleteProductRaw tegen Prisma.",
  );
}

export {
  getProductRawById,
  upsertProductRaw,
  deleteProductRaw,
  deleteProductsRaw,
  nextProductId,
};
