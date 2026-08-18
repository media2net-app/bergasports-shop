import type { PrismaClient } from "@/generated/prisma/client";
import { brandSlugFromName, type ShopBrand } from "@/lib/brands-shared";
import type { TrendyolJsonProduct } from "@/lib/products";

type BrandRow = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  visible: boolean;
  sortOrder: number;
};

export function toShopBrand(row: BrandRow): ShopBrand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl,
    visible: row.visible,
    sortOrder: row.sortOrder,
  };
}

function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "merk";
  if (!taken.has(root)) {
    return root;
  }
  let n = 2;
  while (taken.has(`${root}-${n}`)) {
    n += 1;
  }
  return `${root}-${n}`;
}

export async function ensureBrandRow(
  prisma: PrismaClient,
  name: string,
  cache?: Map<string, BrandRow>,
): Promise<BrandRow | null> {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }
  const slug = brandSlugFromName(trimmed) || "merk";
  const cached = cache?.get(slug);
  if (cached) {
    return cached;
  }
  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) {
    cache?.set(slug, existing);
    return existing;
  }
  const created = await prisma.brand.create({
    data: {
      name: trimmed,
      slug,
      visible: true,
      sortOrder: 0,
    },
  });
  cache?.set(slug, created);
  return created;
}

export async function assignBrandOnProduct(
  prisma: PrismaClient,
  product: TrendyolJsonProduct,
  cache?: Map<string, BrandRow>,
): Promise<TrendyolJsonProduct> {
  const name = product.brand?.trim() ?? "";
  const brandId =
    typeof product.brandId === "number" && Number.isFinite(product.brandId) && product.brandId > 0
      ? Math.floor(product.brandId)
      : null;

  if (!name && brandId == null) {
    const next = { ...product };
    delete next.brand;
    delete next.brandId;
    return next;
  }

  let row: BrandRow | null = null;
  if (brandId != null) {
    row = (await prisma.brand.findUnique({ where: { id: brandId } })) ?? null;
    if (row) {
      cache?.set(row.slug, row);
    }
  }
  if (!row && name) {
    row = await ensureBrandRow(prisma, name, cache);
  }

  if (!row) {
    const next = { ...product };
    delete next.brandId;
    if (!name) delete next.brand;
    return next;
  }

  return {
    ...product,
    brand: row.name,
    brandId: row.id,
  };
}

export async function nextBrandSlug(prisma: PrismaClient, name: string, exceptId?: number): Promise<string> {
  const base = brandSlugFromName(name) || "merk";
  const rows = await prisma.brand.findMany({
    where: exceptId != null ? { id: { not: exceptId } } : undefined,
    select: { slug: true },
  });
  return uniqueSlug(base, new Set(rows.map((row) => row.slug)));
}
