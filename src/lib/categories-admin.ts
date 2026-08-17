import "server-only";

import { requirePrisma } from "@/lib/database";
import { invalidateCategoriesCache } from "@/lib/categories-db";
import { normalizeCategoryShopLink } from "@/lib/category-shop-link";
import { formatRalexCategoryName } from "@/lib/ralex-categories";
import { slugifyNl } from "@/lib/slugify";

const ADMIN_CATEGORY_ID_FLOOR = 100_000;

const RESERVED_CATEGORY_SLUGS = new Set([
  "admin",
  "api",
  "shop",
  "product",
  "categorii",
  "contact",
  "despre-noi",
  "over-ons",
  "onderhoud",
  "afspraak",
  "about-us",
  "service",
  "nieuws",
  "news",
  "verzending",
  "shipping",
  "retouren",
  "returns",
  "account",
  "checkout",
  "privacy",
  "privacybeleid",
  "cookiebeleid",
  "algemene-voorwaarden",
  "betaalmethoden",
  "merken",
  "_next",
]);

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  productCount: number;
  childCount: number;
  seoIntro: string;
  seoFooterHtml: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
};

export type AdminCategoryInput = {
  name: string;
  slug?: string;
  parentId?: number;
  seoIntro?: string | null;
  seoFooterHtml?: string | null;
  seoMetaTitle?: string | null;
  seoMetaDescription?: string | null;
};

function toAdminCategory(
  row: {
    id: number;
    name: string;
    slug: string;
    parentId: number;
    productCount: number;
    seoIntro: string | null;
    seoFooterHtml: string | null;
    seoMetaTitle: string | null;
    seoMetaDescription: string | null;
  },
  childCount: number,
): AdminCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    productCount: row.productCount,
    childCount,
    seoIntro: row.seoIntro ?? "",
    seoFooterHtml: row.seoFooterHtml ?? "",
    seoMetaTitle: row.seoMetaTitle ?? "",
    seoMetaDescription: row.seoMetaDescription ?? "",
  };
}

function normalizeName(raw: string): string {
  const name = formatRalexCategoryName(raw);
  if (!name) {
    throw new Error("Naam is verplicht.");
  }
  return name;
}

function normalizeSlug(raw: string | undefined, name: string): string {
  const slug = slugifyNl(raw?.trim() || name);
  if (!slug) {
    throw new Error("Slug is verplicht.");
  }
  if (RESERVED_CATEGORY_SLUGS.has(slug)) {
    throw new Error(`Slug “${slug}” is gereserveerd.`);
  }
  return slug;
}

function normalizeParentId(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return Math.trunc(raw);
}

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim() ?? "";
  return t || null;
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const prisma = requirePrisma();
  const rows = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });
  const childCounts = new Map<number, number>();
  for (const row of rows) {
    if (row.parentId) {
      childCounts.set(row.parentId, (childCounts.get(row.parentId) ?? 0) + 1);
    }
  }
  return rows.map((row) => toAdminCategory(row, childCounts.get(row.id) ?? 0));
}

async function assertSlugAvailable(slug: string, exceptId?: number): Promise<void> {
  const prisma = requirePrisma();
  const existing = await prisma.category.findFirst({
    where: exceptId ? { slug, id: { not: exceptId } } : { slug },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Slug “${slug}” bestaat al.`);
  }
}

async function assertParentExists(parentId: number): Promise<void> {
  if (parentId === 0) {
    return;
  }
  const prisma = requirePrisma();
  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true },
  });
  if (!parent) {
    throw new Error("Bovenliggende categorie bestaat niet.");
  }
}

async function descendantIds(id: number): Promise<Set<number>> {
  const prisma = requirePrisma();
  const rows = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const children = new Map<number, number[]>();
  for (const row of rows) {
    const list = children.get(row.parentId) ?? [];
    list.push(row.id);
    children.set(row.parentId, list);
  }
  const out = new Set<number>();
  const walk = (current: number) => {
    for (const child of children.get(current) ?? []) {
      if (out.has(child)) {
        continue;
      }
      out.add(child);
      walk(child);
    }
  };
  walk(id);
  return out;
}

async function nextAdminCategoryId(): Promise<number> {
  const prisma = requirePrisma();
  const agg = await prisma.category.aggregate({ _max: { id: true } });
  const maxId = agg._max.id ?? 0;
  return Math.max(maxId + 1, ADMIN_CATEGORY_ID_FLOOR);
}

async function retargetProductCategory(oldName: string, newName: string): Promise<void> {
  if (oldName === newName) {
    return;
  }
  const prisma = requirePrisma();
  const formattedOld = formatRalexCategoryName(oldName);
  await prisma.$executeRaw`
    UPDATE products
    SET
      category = ${newName},
      data = jsonb_set(COALESCE(data, '{}'::jsonb), '{category}', to_jsonb(${newName}::text), true)
    WHERE category = ${oldName} OR category = ${formattedOld}
  `;
}

export async function createAdminCategory(input: AdminCategoryInput): Promise<AdminCategory> {
  const name = normalizeName(input.name);
  const slug = normalizeSlug(input.slug, name);
  const parentId = normalizeParentId(input.parentId);
  await assertSlugAvailable(slug);
  await assertParentExists(parentId);

  const prisma = requirePrisma();
  const id = await nextAdminCategoryId();
  const row = await prisma.category.create({
    data: {
      id,
      name,
      slug,
      parentId,
      productCount: 0,
      link: normalizeCategoryShopLink(slug),
      seoIntro: trimOrNull(input.seoIntro),
      seoFooterHtml: trimOrNull(input.seoFooterHtml),
      seoMetaTitle: trimOrNull(input.seoMetaTitle),
      seoMetaDescription: trimOrNull(input.seoMetaDescription),
    },
  });
  invalidateCategoriesCache();
  return toAdminCategory(row, 0);
}

export async function updateAdminCategory(id: number, input: AdminCategoryInput): Promise<AdminCategory> {
  const prisma = requirePrisma();
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Categorie niet gevonden.");
  }

  const name = normalizeName(input.name);
  const slug = normalizeSlug(input.slug, name);
  const parentId = normalizeParentId(input.parentId);
  if (parentId === id) {
    throw new Error("Een categorie kan niet onder zichzelf hangen.");
  }
  if (parentId !== 0) {
    const descendants = await descendantIds(id);
    if (descendants.has(parentId)) {
      throw new Error("Een categorie kan niet onder een eigen subcategorie hangen.");
    }
  }
  await assertSlugAvailable(slug, id);
  await assertParentExists(parentId);

  if (current.name !== name) {
    await retargetProductCategory(current.name, name);
  }

  const row = await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
      parentId,
      link: normalizeCategoryShopLink(slug),
      seoIntro: trimOrNull(input.seoIntro),
      seoFooterHtml: trimOrNull(input.seoFooterHtml),
      seoMetaTitle: trimOrNull(input.seoMetaTitle),
      seoMetaDescription: trimOrNull(input.seoMetaDescription),
    },
  });
  invalidateCategoriesCache();
  const childCount = await prisma.category.count({ where: { parentId: id } });
  return toAdminCategory(row, childCount);
}

export async function deleteAdminCategory(id: number): Promise<void> {
  const prisma = requirePrisma();
  const current = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!current) {
    throw new Error("Categorie niet gevonden.");
  }
  const childCount = await prisma.category.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new Error("Verwijder eerst de subcategorieën.");
  }
  await prisma.category.delete({ where: { id } });
  invalidateCategoriesCache();
}
