import "server-only";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

import { nextBrandSlug, toShopBrand } from "@/lib/brands-write";
import type { ShopBrand } from "@/lib/brands-shared";
import { requirePrisma } from "@/lib/database";
import { brandSlugFromName, isShopNameBrand } from "@/lib/brands-shared";

export type { ShopBrand };

function invalidateBrandPages() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/brands");
}

export async function listAdminBrands(): Promise<ShopBrand[]> {
  const prisma = requirePrisma();
  await backfillBrandsFromProducts();
  const rows = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toShopBrand);
}

export async function listVisibleBrands(): Promise<ShopBrand[]> {
  const rows = await listShopBrands().catch(() => []);
  return rows.filter((row) => row.visible && !isShopNameBrand(row.name));
}

export async function listShopBrands(): Promise<ShopBrand[]> {
  const prisma = requirePrisma();
  const rows = await prisma.brand.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toShopBrand);
}

export async function backfillBrandsFromProducts(): Promise<number> {
  const prisma = requirePrisma();
  const orphans = await prisma.product.findMany({
    where: {
      brandId: null,
      brand: { not: null },
    },
    select: { id: true, brand: true, data: true },
    take: 2000,
  });
  const pending = orphans.filter((row) => {
    const name = (row.brand ?? "").trim();
    return name.length > 0 && !isShopNameBrand(name);
  });
  if (!pending.length) {
    return 0;
  }

  const cache = new Map<string, { id: number; name: string; slug: string }>();
  const existing = await prisma.brand.findMany({ select: { id: true, name: true, slug: true } });
  for (const row of existing) {
    cache.set(row.slug, row);
  }

  let linked = 0;
  for (const product of pending) {
    const name = product.brand!.trim();
    const slug = brandSlugFromName(name) || "merk";
    let brand = cache.get(slug);
    if (!brand) {
      const created = await prisma.brand.create({
        data: { name, slug, visible: true, sortOrder: 0 },
      });
      brand = { id: created.id, name: created.name, slug: created.slug };
      cache.set(slug, brand);
    }
    const data = (product.data ?? {}) as Record<string, unknown>;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        brandId: brand.id,
        brand: brand.name,
        data: { ...data, brand: brand.name, brandId: brand.id } as Prisma.InputJsonValue,
      },
    });
    linked += 1;
  }
  return linked;
}

export type BrandWriteInput = {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  visible?: boolean;
  sortOrder?: number;
};

export async function createAdminBrand(input: BrandWriteInput): Promise<ShopBrand> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Naam is verplicht.");
  }
  const prisma = requirePrisma();
  const slug = (input.slug?.trim() && brandSlugFromName(input.slug)) || (await nextBrandSlug(prisma, name));
  try {
    const row = await prisma.brand.create({
      data: {
        name,
        slug,
        logoUrl: input.logoUrl?.trim() || null,
        visible: input.visible !== false,
        sortOrder: Number.isFinite(input.sortOrder) ? Math.floor(input.sortOrder!) : 0,
      },
    });
    invalidateBrandPages();
    return toShopBrand(row);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Deze slug bestaat al.");
    }
    throw e;
  }
}

export async function updateAdminBrand(id: number, input: Partial<BrandWriteInput>): Promise<ShopBrand> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Ongeldige id.");
  }
  const prisma = requirePrisma();
  const existing = await prisma.brand.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Merk niet gevonden.");
  }
  const name = input.name != null ? input.name.trim() : existing.name;
  if (!name) {
    throw new Error("Naam is verplicht.");
  }
  const slug =
    input.slug != null
      ? brandSlugFromName(input.slug) || (await nextBrandSlug(prisma, name, id))
      : existing.slug;
  try {
    const row = await prisma.brand.update({
      where: { id },
      data: {
        name,
        slug,
        logoUrl: input.logoUrl === undefined ? existing.logoUrl : input.logoUrl?.trim() || null,
        visible: input.visible ?? existing.visible,
        sortOrder:
          input.sortOrder == null || !Number.isFinite(input.sortOrder)
            ? existing.sortOrder
            : Math.floor(input.sortOrder),
      },
    });
    if (row.name !== existing.name) {
      await prisma.$executeRaw`
        update public.products
        set brand = ${row.name},
            data = jsonb_set(coalesce(data, '{}'::jsonb), '{brand}', to_jsonb(${row.name}::text), true)
        where brand_id = ${id}
      `;
    }
    invalidateBrandPages();
    return toShopBrand(row);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      throw new Error("Deze slug bestaat al.");
    }
    throw e;
  }
}

export async function deleteAdminBrand(id: number): Promise<void> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Ongeldige id.");
  }
  const prisma = requirePrisma();
  try {
    await prisma.brand.delete({ where: { id } });
  } catch {
    throw new Error("Merk niet gevonden.");
  }
  invalidateBrandPages();
}
