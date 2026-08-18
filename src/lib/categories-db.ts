import "server-only";

import { cache } from "react";
import { revalidatePath } from "next/cache";

import categoriesJson from "@/data/ralex-categories.json";
import { isBergasportsCatalogSource } from "@/lib/bergasports-catalog";
import { requirePrisma, isDatabaseConfigured } from "@/lib/database";
import { normalizeCategoryShopLink } from "@/lib/category-shop-link";
import type { RalexCategoriesFile, RalexCategoryNode, RalexCategoryRecord } from "@/lib/ralex-categories";
import {
  filterShopCategoryRecords,
  formatRalexCategoryName,
  isExcludedShopCategorySlug,
  withPublicCategoryLabel,
} from "@/lib/ralex-categories";
import { buildCategoryTreeFromRecords } from "@/lib/ralex-categories-file";

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  parent_id: number;
  product_count: number;
  link: string | null;
  import_completed_at: string | null;
  imported_product_count: number | null;
  seo_intro?: string | null;
  seo_footer_html?: string | null;
  seo_meta_title?: string | null;
  seo_meta_description?: string | null;
};

function rowToRecord(row: CategoryRow): RalexCategoryRecord {
  const rec: RalexCategoryRecord = {
    id: row.id,
    name: formatRalexCategoryName(row.name, row.slug),
    slug: row.slug,
    parent: row.parent_id,
    count: row.product_count,
    link: normalizeCategoryShopLink(row.slug, row.link),
  };
  if (row.import_completed_at) {
    rec.importCompletedAt = row.import_completed_at;
  }
  if (row.imported_product_count != null) {
    rec.importedProductCount = row.imported_product_count;
  }
  return rec;
}

function prismaRowToCategoryRow(row: {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  productCount: number;
  link: string | null;
  importCompletedAt: Date | null;
  importedProductCount: number | null;
}): CategoryRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent_id: row.parentId,
    product_count: row.productCount,
    link: row.link,
    import_completed_at: row.importCompletedAt?.toISOString() ?? null,
    imported_product_count: row.importedProductCount,
  };
}

function recordToRow(rec: RalexCategoryRecord) {
  return {
    id: rec.id,
    name: rec.name,
    slug: rec.slug,
    parentId: rec.parent,
    productCount: rec.count,
    link: normalizeCategoryShopLink(rec.slug, rec.link),
    importCompletedAt: rec.importCompletedAt ? new Date(rec.importCompletedAt) : null,
    importedProductCount: rec.importedProductCount ?? null,
  };
}

async function fetchAllCategoryRows(): Promise<CategoryRow[]> {
  const prisma = requirePrisma();
  const pageSize = 500;
  const out: CategoryRow[] = [];
  let skip = 0;
  while (true) {
    const batch = await prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      skip,
      take: pageSize,
    });
    if (!batch.length) {
      break;
    }
    out.push(...batch.map(prismaRowToCategoryRow));
    if (batch.length < pageSize) {
      break;
    }
    skip += pageSize;
  }
  return out;
}

async function fetchCatalogMetaRow() {
  const prisma = requirePrisma();
  const data = await prisma.catalogMeta.findUnique({ where: { id: 1 } });
  if (!data) {
    return null;
  }
  return {
    source: data.source,
    source_api: data.sourceApi,
    fetched_at: data.fetchedAt,
    seller: data.seller,
    seller_id: data.sellerId,
    scraped_at: data.scrapedAt,
  };
}

export function invalidateCategoriesCache() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/categorii");
  revalidatePath("/admin/categories");
  revalidatePath("/sitemap.xml");
}

export async function readRalexCategoriesFromDb(): Promise<RalexCategoriesFile> {
  const [rows, meta] = await Promise.all([fetchAllCategoryRows(), fetchCatalogMetaRow()]);
  if (meta?.source && !isBergasportsCatalogSource(meta.source)) {
    console.error(
      `[categories] Verkeerde database: "${meta.source}" — verwacht bergasports.com. Geen Hotelink-categorieën geladen.`,
    );
    return loadRalexCategoriesFromJson();
  }
  const categories = filterShopCategoryRecords(rows.map(rowToRecord));
  return {
    source: meta?.source ?? "https://www.bergasports.com/",
    sourceApi: meta?.source_api ?? "Bergasports catalog (Prisma)",
    fetchedAt: meta?.fetched_at ?? new Date().toISOString(),
    totalCategories: categories.length,
    categories,
    tree: buildCategoryTreeFromRecords(categories),
  };
}

const loadCategoriesCached = cache(async () => readRalexCategoriesFromDb());

function loadRalexCategoriesFromJson(): RalexCategoriesFile {
  const raw = categoriesJson as RalexCategoriesFile;
  const source = raw.source ?? "https://www.bergasports.com/";
  if (!isBergasportsCatalogSource(source)) {
    console.error(`[categories] JSON-fallback is geen Bergasports-catalogus: ${source}`);
    return {
      source: "https://www.bergasports.com/",
      sourceApi: "Bergasports (leeg — verkeerde fallback)",
      fetchedAt: new Date().toISOString(),
      totalCategories: 0,
      categories: [],
      tree: [],
    };
  }
  const categories = filterShopCategoryRecords(raw.categories ?? []).map(withPublicCategoryLabel);
  return {
    source,
    sourceApi: raw.sourceApi ?? "Bergasports catalog (JSON fallback)",
    fetchedAt: raw.fetchedAt ?? new Date().toISOString(),
    totalCategories: categories.length,
    categories,
    tree: buildCategoryTreeFromRecords(categories),
  };
}

export async function loadRalexCategories(): Promise<RalexCategoriesFile> {
  if (!isDatabaseConfigured()) {
    return loadRalexCategoriesFromJson();
  }
  try {
    return await loadCategoriesCached();
  } catch (err) {
    console.warn("[categories] DB unavailable, using JSON fallback:", err);
    return loadRalexCategoriesFromJson();
  }
}

export async function listShopCategoryOptions(): Promise<{ slug: string; name: string; group: string }[]> {
  const file = await loadRalexCategories();
  const seen = new Set<string>();
  const out: { slug: string; name: string; group: string }[] = [];

  const walk = (nodes: RalexCategoryNode[], parentName: string) => {
    for (const node of nodes) {
      if (isExcludedShopCategorySlug(node.slug)) {
        continue;
      }
      const slug = node.slug.trim().toLowerCase();
      if (!slug || seen.has(slug)) {
        continue;
      }
      seen.add(slug);
      const name = formatRalexCategoryName(node.name, node.slug);
      out.push({ slug, name, group: parentName });
      walk(node.children ?? [], name);
    }
  };

  walk(file.tree, "");
  return out;
}

export async function writeRalexCategoriesToDb(data: RalexCategoriesFile): Promise<void> {
  const prisma = requirePrisma();

  await prisma.catalogMeta.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      source: data.source,
      sourceApi: data.sourceApi,
      fetchedAt: data.fetchedAt,
    },
    update: {
      source: data.source,
      sourceApi: data.sourceApi,
      fetchedAt: data.fetchedAt,
    },
  });

  const rows = filterShopCategoryRecords(data.categories).map(recordToRow);
  for (const row of rows) {
    await prisma.category.upsert({
      where: { id: row.id },
      create: row,
      update: {
        productCount: row.productCount,
        importCompletedAt: row.importCompletedAt,
        importedProductCount: row.importedProductCount,
      },
    });
  }
  const excludedIds = data.categories.filter((c) => !rows.some((r) => r.id === c.id)).map((c) => c.id);
  if (excludedIds.length) {
    await prisma.category.deleteMany({ where: { id: { in: excludedIds } } });
  }
  invalidateCategoriesCache();
}

export async function markRalexCategoryFullyImportedInDb(
  categoryId: number,
  importedProductCount: number,
): Promise<void> {
  const prisma = requirePrisma();
  await prisma.category.update({
    where: { id: categoryId },
    data: {
      importCompletedAt: new Date(),
      importedProductCount,
    },
  });
  invalidateCategoriesCache();
}

export async function clearRalexCategoryImportMarkerInDb(categoryId: number): Promise<void> {
  const prisma = requirePrisma();
  await prisma.category.update({
    where: { id: categoryId },
    data: {
      importCompletedAt: null,
      importedProductCount: null,
    },
  });
  invalidateCategoriesCache();
}

export type CategoriesBootstrap = {
  tree: RalexCategoryNode[];
  meta: { source: string; fetchedAt: string; totalCategories: number };
};

export const loadCategoriesBootstrap = cache(async (): Promise<CategoriesBootstrap> => {
  const file = await loadRalexCategories();
  return {
    tree: file.tree,
    meta: {
      source: file.source,
      fetchedAt: file.fetchedAt,
      totalCategories: file.totalCategories,
    },
  };
});

export type CategorySeoOverrides = {
  seoIntro: string | null;
  seoFooterHtml: string | null;
  seoMetaTitle: string | null;
  seoMetaDescription: string | null;
};

export async function updateCategorySeoInDb(
  slug: string,
  seoIntro: string | null,
  seoFooterHtml: string | null,
  seoMetaTitle: string | null,
  seoMetaDescription: string | null,
): Promise<void> {
  const prisma = requirePrisma();
  const normalized = slug.trim().toLowerCase();
  await prisma.category.updateMany({
    where: { slug: normalized },
    data: {
      seoIntro: seoIntro?.trim() || null,
      seoFooterHtml: seoFooterHtml?.trim() || null,
      seoMetaTitle: seoMetaTitle?.trim() || null,
      seoMetaDescription: seoMetaDescription?.trim() || null,
    },
  });
  invalidateCategoriesCache();
}

export async function loadCategorySeoOverrides(slug: string): Promise<CategorySeoOverrides | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const prisma = requirePrisma();
  const data = await prisma.category.findFirst({
    where: { slug: normalized },
    select: {
      seoIntro: true,
      seoFooterHtml: true,
      seoMetaTitle: true,
      seoMetaDescription: true,
    },
  });
  if (!data) {
    return null;
  }
  return {
    seoIntro: data.seoIntro,
    seoFooterHtml: data.seoFooterHtml,
    seoMetaTitle: data.seoMetaTitle,
    seoMetaDescription: data.seoMetaDescription,
  };
}
