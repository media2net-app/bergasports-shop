import "server-only";

import { normalizeCategoryShopLink } from "@/lib/category-shop-link";
import type { RalexCategoriesFile, RalexCategoryNode, RalexCategoryRecord } from "@/lib/ralex-categories";
import { filterShopCategoryRecords } from "@/lib/ralex-categories";
import {
  clearRalexCategoryImportMarkerInDb,
  markRalexCategoryFullyImportedInDb,
  readRalexCategoriesFromDb,
  writeRalexCategoriesToDb,
} from "@/lib/categories-db";
import { isDatabaseWritable } from "@/lib/products-db";

export async function readRalexCategoriesFile(): Promise<RalexCategoriesFile> {
  return readRalexCategoriesFromDb();
}

export async function writeRalexCategoriesFile(data: RalexCategoriesFile): Promise<void> {
  if (!isDatabaseWritable()) {
    throw new Error("DATABASE_URL ontbreekt — categorieën kunnen niet worden opgeslagen.");
  }
  await writeRalexCategoriesToDb(data);
}

/** Bouwt de boom uit de platte `categories`-lijst (inclusief optionele import-velden). */
export function buildCategoryTreeFromRecords(slim: RalexCategoryRecord[]): RalexCategoryNode[] {
  const sorted = [...slim].sort((a, b) => a.parent - b.parent || a.name.localeCompare(b.name));

  function children(pid: number): RalexCategoryNode[] {
    return sorted
      .filter((c) => c.parent === pid)
      .map((c) => ({ ...c, children: children(c.id) }));
  }

  const treeRoots = sorted.filter((c) => c.parent === 0);
  return treeRoots.map((c) => ({ ...c, children: children(c.id) }));
}

export function mergeCategoryImportMarkers(fresh: RalexCategoriesFile, old: RalexCategoriesFile): RalexCategoriesFile {
  const oldById = new Map(old.categories.map((c) => [c.id, c]));
  const categories = fresh.categories.map((c) => {
    const prev = oldById.get(c.id);
    const prevComplete =
      prev &&
      prev.importCompletedAt &&
      typeof prev.importedProductCount === "number" &&
      ((prev.count === 0 && prev.importedProductCount === 0) ||
        (prev.count > 0 && prev.importedProductCount >= prev.count));
    if (prevComplete && prev && c.count === prev.count) {
      return {
        ...c,
        importCompletedAt: prev.importCompletedAt,
        importedProductCount: prev.importedProductCount,
      };
    }
    return { ...c };
  });
  return {
    ...fresh,
    categories,
    tree: buildCategoryTreeFromRecords(categories),
  };
}

export async function markRalexCategoryFullyImported(categoryId: number, importedProductCount: number): Promise<void> {
  await markRalexCategoryFullyImportedInDb(categoryId, importedProductCount);
}

export async function clearRalexCategoryImportMarker(categoryId: number): Promise<void> {
  await clearRalexCategoryImportMarkerInDb(categoryId);
}

type WpProductCat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  link: string;
};

import { wcProductCategoriesEndpoint } from "@/lib/wc-store-config";

/** Haalt alle product_cat op van de WooCommerce-bron (bergasports.com). */
export async function fetchRalexCategoriesFromRemote(): Promise<RalexCategoriesFile> {
  let page = 1;
  const all: WpProductCat[] = [];
  for (;;) {
    const url = `${wcProductCategoriesEndpoint()}?per_page=100&page=${page}`;
    const r = await fetch(url);
    if (!r.ok) {
      throw new Error(`HTTP ${r.status} ${url}`);
    }
    const batch = (await r.json()) as WpProductCat[];
    if (!batch.length) {
      break;
    }
    all.push(...batch);
    if (batch.length < 100) {
      break;
    }
    page += 1;
  }
  const categories: RalexCategoryRecord[] = filterShopCategoryRecords(
    all.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parent: c.parent,
      count: c.count,
      link: normalizeCategoryShopLink(c.slug, c.link),
    })),
  );
  return {
    source: "https://www.bergasports.com/",
    sourceApi: wcProductCategoriesEndpoint(),
    fetchedAt: new Date().toISOString(),
    totalCategories: categories.length,
    categories,
    tree: buildCategoryTreeFromRecords(categories),
  };
}
