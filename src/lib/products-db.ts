import "server-only";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

import { canWriteProductsToDatabase, requirePrisma } from "@/lib/database";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import { getRequestLocale } from "@/lib/i18n/locale";
import type { TrendyolJsonProduct } from "@/lib/products";
import { isProductVisibleOnShop } from "@/lib/product-status";
import {
  localizeProduct,
  mapTrendyolJsonToProduct,
  normalizeCatalogSource,
  productMatchesSlug,
  type Product,
} from "@/lib/products";
import {
  productSlugBase,
  resolveProductSlug,
  uniqueProductSlug,
  withProductSlug,
} from "@/lib/product-slug";
import {
  belongsToBergasportsCatalog,
  isBergasportsCatalogSource,
} from "@/lib/bergasports-catalog";
import { assignBrandOnProduct } from "@/lib/brands-write";
import { mirrorProductImagesIfNeeded } from "@/lib/product-image-storage";
import { bigIntToNumber, decimalToNumber, productIdToBigInt } from "@/lib/prisma-mappers";

function ensureShopProductUrl(product: TrendyolJsonProduct): TrendyolJsonProduct {
  const slug = resolveProductSlug(product);
  const existing = product.url?.trim() ?? "";
  if (existing && belongsToBergasportsCatalog({ url: existing, catalogSource: product.catalogSource })) {
    return { ...product, slug };
  }
  return {
    ...product,
    slug,
    url: `https://www.bergasports.com/product/${slug}`,
  };
}

async function assertBergasportsCatalogOrEmpty(): Promise<boolean> {
  const prisma = requirePrisma();
  const meta = await prisma.catalogMeta.findUnique({
    where: { id: 1 },
    select: { source: true },
  });
  if (!meta?.source) {
    return true;
  }
  if (!isBergasportsCatalogSource(meta.source)) {
    console.error(
      `[catalog] Verkeerde database: catalog_meta.source is "${meta.source}" — verwacht bergasports.com. Zet DATABASE_URL op het Bergasports Prisma-project en herstart \`npm run dev\`.`,
    );
    return false;
  }
  return true;
}

export type ProductsDatabaseMeta = {
  count: number;
  seller?: string;
  sellerId?: number;
  scrapedAt?: string;
  source?: string;
};

export type ProductsDatabase = ProductsDatabaseMeta & {
  products: TrendyolJsonProduct[];
};

function rowToProduct(row: { id: bigint; data: unknown }): TrendyolJsonProduct {
  const data = row.data as TrendyolJsonProduct;
  const id = bigIntToNumber(row.id);
  return { ...data, id: typeof data.id === "number" ? data.id : id };
}

const productSelect = { id: true, data: true } as const;

/** Alle producten uit database (server). */
export async function fetchAllProductsRaw(): Promise<TrendyolJsonProduct[]> {
  const prisma = requirePrisma();
  if (!(await assertBergasportsCatalogOrEmpty())) {
    return [];
  }
  const pageSize = 1000;
  const out: TrendyolJsonProduct[] = [];
  let skip = 0;

  while (true) {
    const batch = await prisma.product.findMany({
      where: {
        OR: [
          { url: { contains: "bergasports.com", mode: "insensitive" } },
          { catalogSource: "manual" },
        ],
      },
      select: productSelect,
      orderBy: { id: "asc" },
      skip,
      take: pageSize,
    });
    if (!batch.length) {
      break;
    }
    for (const row of batch) {
      const product = rowToProduct(row);
      if (belongsToBergasportsCatalog(product)) {
        out.push(product);
      }
    }
    if (batch.length < pageSize) {
      break;
    }
    skip += pageSize;
  }

  return out;
}

export async function readProductsDatabase(): Promise<ProductsDatabase> {
  const products = await fetchAllProductsRaw();
  const first = products[0];
  return {
    count: products.length,
    seller: "Bergasports",
    sellerId: first?.merchantId,
    products,
  };
}

export async function getProductRawById(id: number): Promise<TrendyolJsonProduct | null> {
  const prisma = requirePrisma();
  const row = await prisma.product.findUnique({
    where: { id: productIdToBigInt(id) },
    select: productSelect,
  });
  return row ? rowToProduct(row) : null;
}

export async function getProductsRawByIds(ids: number[]): Promise<TrendyolJsonProduct[]> {
  const unique = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  if (!unique.length) {
    return [];
  }
  const prisma = requirePrisma();
  const rows = await prisma.product.findMany({
    where: { id: { in: unique.map(productIdToBigInt) } },
    select: productSelect,
  });
  return rows.map(rowToProduct);
}

function invalidateCatalogCache() {
  revalidatePath("/");
  revalidatePath("/shop");
}

function productToDbRow(product: TrendyolJsonProduct) {
  const featuredOnHomepage = Boolean(product.featuredOnHomepage);
  const slug = resolveProductSlug(product);
  const data = { ...product, slug, featuredOnHomepage } as Prisma.InputJsonValue;
  return {
    id: productIdToBigInt(product.id),
    data,
    slug,
    name: product.name,
    brand: product.brand ?? null,
    brandId: typeof product.brandId === "number" && product.brandId > 0 ? product.brandId : null,
    category: product.category ?? null,
    catalogSource: normalizeCatalogSource(product.catalogSource),
    priceCurrent: product.priceCurrent ?? null,
    priceDiscounted: product.priceDiscounted ?? null,
    currency: product.currency ?? "EUR",
    image: product.image,
    url: product.url,
    featuredOnHomepage,
  };
}

async function upsertRaw(product: TrendyolJsonProduct): Promise<void> {
  const prisma = requirePrisma();
  const all = await fetchAllProductsRaw();
  const withBrand = await assignBrandOnProduct(prisma, product);
  const withSlug = ensureShopProductUrl(withProductSlug(withBrand, all));
  const row = productToDbRow(withSlug);
  await prisma.product.upsert({
    where: { id: row.id },
    create: row,
    update: row,
  });
  invalidateCatalogCache();
}

export async function upsertProductRaw(product: TrendyolJsonProduct): Promise<void> {
  const { product: mirrored } = await mirrorProductImagesIfNeeded(product);
  await upsertRaw(mirrored);
}

export async function saveProductRawWithoutImageMirror(product: TrendyolJsonProduct): Promise<void> {
  await upsertRaw(product);
}

export async function deleteProductRaw(id: number): Promise<boolean> {
  const prisma = requirePrisma();
  try {
    await prisma.product.delete({ where: { id: productIdToBigInt(id) } });
    invalidateCatalogCache();
    return true;
  } catch {
    return false;
  }
}

export async function deleteProductsRaw(ids: number[]): Promise<number> {
  const idSet = [...new Set(ids.filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0))];
  if (!idSet.length) {
    return 0;
  }
  const prisma = requirePrisma();
  const result = await prisma.product.deleteMany({
    where: { id: { in: idSet.map(productIdToBigInt) } },
  });
  invalidateCatalogCache();
  return result.count;
}

export async function nextProductId(): Promise<number> {
  const prisma = requirePrisma();
  const row = await prisma.product.findFirst({
    select: { id: true },
    orderBy: { id: "desc" },
  });
  const max = row ? bigIntToNumber(row.id) : 0;
  return max + 1;
}

export { canWriteProductsToDatabase as isDatabaseWritable };

async function localeForCatalog(): Promise<string> {
  try {
    return await getRequestLocale();
  } catch {
    return DEFAULT_LOCALE;
  }
}

const loadCatalogProductsCached = cache(async (): Promise<Product[]> => {
  const raw = await fetchAllProductsRaw();
  return raw.filter(isProductVisibleOnShop).map(mapTrendyolJsonToProduct);
});

export async function loadCatalogProducts(): Promise<Product[]> {
  const [products, locale] = await Promise.all([loadCatalogProductsCached(), localeForCatalog()]);
  return products.map((product) => localizeProduct(product, locale));
}

export async function loadFeaturedProducts(limit = 8): Promise<Product[]> {
  const prisma = requirePrisma();
  const rows = await prisma.product.findMany({
    where: { featuredOnHomepage: true },
    select: productSelect,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const featured = rows
    .map(rowToProduct)
    .filter(isProductVisibleOnShop)
    .map(mapTrendyolJsonToProduct);

  const locale = await localeForCatalog();
  if (featured.length >= limit) {
    return featured.slice(0, limit).map((product) => localizeProduct(product, locale));
  }

  const need = limit - featured.length;
  const featuredIds = new Set(featured.map((p) => p.id));
  const fallbackRows = await prisma.product.findMany({
    where: {
      OR: [
        { url: { contains: "bergasports.com", mode: "insensitive" } },
        { catalogSource: "manual" },
      ],
    },
    select: productSelect,
    orderBy: { updatedAt: "desc" },
    take: need + featuredIds.size,
  });

  const fallback = fallbackRows
    .map(rowToProduct)
    .filter(
      (p) =>
        belongsToBergasportsCatalog(p) && isProductVisibleOnShop(p) && !featuredIds.has(p.id),
    )
    .slice(0, need)
    .map(mapTrendyolJsonToProduct);

  return [...featured, ...fallback].map((product) => localizeProduct(product, locale));
}

export async function loadProductById(id: number): Promise<Product | null> {
  const raw = await getProductRawById(id);
  if (!raw) return null;
  return localizeProduct(mapTrendyolJsonToProduct(raw), await localeForCatalog());
}

export async function loadProductBySlug(slug: string): Promise<Product | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const prisma = requirePrisma();
  const row = await prisma.product.findFirst({
    where: { slug: normalized },
    select: productSelect,
  });

  const locale = await localeForCatalog();
  if (row) {
    const raw = rowToProduct(row);
    if (!isProductVisibleOnShop(raw)) {
      return null;
    }
    return localizeProduct(mapTrendyolJsonToProduct(raw), locale);
  }

  const all = await fetchAllProductsRaw();
  const matches = all.filter((p) => isProductVisibleOnShop(p) && productMatchesSlug(p, normalized));
  if (!matches.length) return null;
  const picked = matches.sort((a, b) => a.id - b.id)[0]!;
  return localizeProduct(mapTrendyolJsonToProduct(picked), locale);
}

export async function loadProductFromPathSegment(segment: string): Promise<Product | null> {
  const param = segment.trim();
  if (!param) {
    return null;
  }
  let product: Product | null = null;
  if (/^\d+$/.test(param)) {
    product = await loadProductById(Number.parseInt(param, 10));
  } else {
    product = await loadProductBySlug(param);
  }
  if (product?.productStatus === "concept") {
    return null;
  }
  return product;
}

export async function backfillAllProductSlugs(): Promise<number> {
  const all = await fetchAllProductsRaw();
  const sorted = [...all].sort((a, b) => a.id - b.id);
  const used = new Map<string, number>();
  let updated = 0;

  for (const p of sorted) {
    const slug = uniqueProductSlug(productSlugBase(p), p.id, used);
    used.set(slug, p.id);
    if (p.slug === slug) {
      continue;
    }
    await upsertRaw({ ...p, slug });
    updated += 1;
  }

  invalidateCatalogCache();
  return updated;
}
