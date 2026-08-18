import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { requirePrisma } from "@/lib/database";
import { invalidateCategoriesCache } from "@/lib/categories-db";
import { normalizeCategoryShopLink } from "@/lib/category-shop-link";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import { hydrateCategoryTranslations } from "@/lib/i18n/hydrate";
import { compactLocaleMap, type CategoryLocaleFields, type LocaleMap } from "@/lib/i18n/translations";
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
  "en",
  "de",
  "fr",
  "es",
  "it",
  "nl",
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
  translations: LocaleMap<CategoryLocaleFields>;
};

export type AdminCategoryInput = {
  name: string;
  slug?: string;
  parentId?: number;
  seoIntro?: string | null;
  seoFooterHtml?: string | null;
  seoMetaTitle?: string | null;
  seoMetaDescription?: string | null;
  translations?: LocaleMap<CategoryLocaleFields>;
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
    translations?: unknown;
  },
  childCount: number,
): AdminCategory {
  return {
    id: row.id,
    name: formatRalexCategoryName(row.name, row.slug),
    slug: row.slug,
    parentId: row.parentId,
    productCount: row.productCount,
    childCount,
    seoIntro: row.seoIntro ?? "",
    seoFooterHtml: row.seoFooterHtml ?? "",
    seoMetaTitle: row.seoMetaTitle ?? "",
    seoMetaDescription: row.seoMetaDescription ?? "",
    translations: hydrateCategoryTranslations(row),
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function resolveNlCopy(input: AdminCategoryInput): {
  name: string;
  slug: string;
  seoIntro: string | null;
  seoFooterHtml: string | null;
  seoMetaTitle: string | null;
  seoMetaDescription: string | null;
  translations: LocaleMap<CategoryLocaleFields>;
} {
  const translations = compactLocaleMap(
    hydrateCategoryTranslations({
      name: input.name,
      slug: input.slug ?? "",
      seoIntro: input.seoIntro,
      seoFooterHtml: input.seoFooterHtml,
      seoMetaTitle: input.seoMetaTitle,
      seoMetaDescription: input.seoMetaDescription,
      translations: input.translations,
    }),
  );
  const nl = translations[DEFAULT_LOCALE] ?? {};
  const name = normalizeName(nl.name || input.name, nl.slug || input.slug);
  const slug = normalizeSlug(nl.slug || input.slug, name);
  translations[DEFAULT_LOCALE] = {
    ...nl,
    name,
    slug,
    description: nl.description ?? input.seoIntro ?? "",
    seoFooterHtml: nl.seoFooterHtml ?? input.seoFooterHtml ?? "",
    seoTitle: nl.seoTitle ?? input.seoMetaTitle ?? "",
    seoDescription: nl.seoDescription ?? input.seoMetaDescription ?? "",
  };
  return {
    name,
    slug,
    seoIntro: trimOrNull(translations[DEFAULT_LOCALE]?.description),
    seoFooterHtml: trimOrNull(translations[DEFAULT_LOCALE]?.seoFooterHtml),
    seoMetaTitle: trimOrNull(translations[DEFAULT_LOCALE]?.seoTitle),
    seoMetaDescription: trimOrNull(translations[DEFAULT_LOCALE]?.seoDescription),
    translations,
  };
}

function normalizeName(raw: string, slug?: string): string {
  const name = formatRalexCategoryName(raw, slug);
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
  const copy = resolveNlCopy(input);
  const parentId = normalizeParentId(input.parentId);
  await assertSlugAvailable(copy.slug);
  await assertParentExists(parentId);

  const prisma = requirePrisma();
  const id = await nextAdminCategoryId();
  const row = await prisma.category.create({
    data: {
      id,
      name: copy.name,
      slug: copy.slug,
      parentId,
      productCount: 0,
      link: normalizeCategoryShopLink(copy.slug),
      seoIntro: copy.seoIntro,
      seoFooterHtml: copy.seoFooterHtml,
      seoMetaTitle: copy.seoMetaTitle,
      seoMetaDescription: copy.seoMetaDescription,
      translations: asJson(copy.translations),
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

  const copy = resolveNlCopy(input);
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
  await assertSlugAvailable(copy.slug, id);
  await assertParentExists(parentId);

  if (current.name !== copy.name) {
    await retargetProductCategory(current.name, copy.name);
  }

  const row = await prisma.category.update({
    where: { id },
    data: {
      name: copy.name,
      slug: copy.slug,
      parentId,
      link: normalizeCategoryShopLink(copy.slug),
      seoIntro: copy.seoIntro,
      seoFooterHtml: copy.seoFooterHtml,
      seoMetaTitle: copy.seoMetaTitle,
      seoMetaDescription: copy.seoMetaDescription,
      translations: asJson(copy.translations),
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
