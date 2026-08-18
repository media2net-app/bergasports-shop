import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import type { AdminProductSearchHit } from "@/lib/admin-product-search-types";
import { belongsToBergasportsCatalog } from "@/lib/bergasports-catalog";
import { requirePrisma } from "@/lib/database";
import { catalogSalePrice, catalogSku, decodeImportedProductTitle, type TrendyolJsonProduct } from "@/lib/products";
import { getProductsRawByIds } from "@/lib/products-db";
import { bigIntToNumber, productIdToBigInt } from "@/lib/prisma-mappers";

export type { AdminProductSearchHit } from "@/lib/admin-product-search-types";

export function toAdminProductSearchHit(product: TrendyolJsonProduct): AdminProductSearchHit {
  return {
    id: product.id,
    name: decodeImportedProductTitle(product.name),
    sku: catalogSku(product),
    image: product.image?.trim() || null,
    price: catalogSalePrice(product),
  };
}

export async function searchAdminProducts(rawQuery: string, limit = 10): Promise<AdminProductSearchHit[]> {
  const q = rawQuery.trim();
  if (q.length < 2) {
    return [];
  }

  const cap = Math.min(20, Math.max(1, Math.floor(limit)));
  const prisma = requirePrisma();
  const or: Prisma.ProductWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
    { brand: { contains: q, mode: "insensitive" } },
    { data: { path: ["wcSku"], string_contains: q, mode: "insensitive" } },
    { data: { path: ["easySalesSku"], string_contains: q, mode: "insensitive" } },
  ];
  const asId = Number.parseInt(q, 10);
  if (Number.isFinite(asId) && String(asId) === q) {
    or.unshift({ id: productIdToBigInt(asId) });
  }

  const rows = await prisma.product.findMany({
    where: {
      AND: [
        { OR: or },
        {
          OR: [
            { url: { contains: "bergasports.com", mode: "insensitive" } },
            { catalogSource: "manual" },
          ],
        },
      ],
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: Math.max(cap * 2, 20),
  });

  const products = await getProductsRawByIds(rows.map((row) => bigIntToNumber(row.id)));
  const byId = new Map(products.map((product) => [product.id, product]));
  const hits: AdminProductSearchHit[] = [];
  for (const row of rows) {
    const product = byId.get(bigIntToNumber(row.id));
    if (!product || !belongsToBergasportsCatalog(product)) {
      continue;
    }
    hits.push(toAdminProductSearchHit(product));
    if (hits.length >= cap) {
      break;
    }
  }
  return hits;
}
