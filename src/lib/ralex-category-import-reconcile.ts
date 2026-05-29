import "server-only";

import { formatRalexCategoryName, isRalexCategoryImportComplete, type RalexCategoriesFile } from "@/lib/ralex-categories";
import { buildCategoryTreeFromRecords, readRalexCategoriesFile, writeRalexCategoriesFile } from "@/lib/ralex-categories-file";
import { normalizeCatalogSource, type TrendyolJsonProduct } from "@/lib/products";
import { isDatabaseWritable } from "@/lib/products-db";
import { readTrendyolDatabase } from "@/lib/trendyol-json-store";

export function countRalexProductsByCategoryLabel(products: TrendyolJsonProduct[], label: string): number {
  const ids = new Set<number>();
  for (const p of products) {
    if (normalizeCatalogSource(p.catalogSource) !== "ralex") {
      continue;
    }
    if (p.category === label) {
      ids.add(p.id);
    }
  }
  return ids.size;
}

/**
 * Zet import-markers op basis van bestaande producten (fix oude imports vóór markers)
 * en markeert lege categorieën (count 0) als klaar.
 */
export async function reconcileRalexCategoryImportMarkers(): Promise<{ patched: number; data: RalexCategoriesFile }> {
  const data = await readRalexCategoriesFile();
  if (!isDatabaseWritable()) {
    return { patched: 0, data };
  }
  const db = await readTrendyolDatabase();
  let patched = 0;
  const categories = data.categories.map((c) => {
    if (isRalexCategoryImportComplete(c)) {
      return c;
    }
    if (c.count === 0) {
      patched++;
      return {
        ...c,
        importCompletedAt: new Date().toISOString(),
        importedProductCount: 0,
      };
    }
    const label = formatRalexCategoryName(c.name);
    const n = countRalexProductsByCategoryLabel(db.products, label);
    if (n >= c.count) {
      patched++;
      return {
        ...c,
        importCompletedAt: new Date().toISOString(),
        importedProductCount: n,
      };
    }
    return c;
  });

  const changed = categories.some((c, i) => c !== data.categories[i]);
  if (!changed) {
    return { patched: 0, data };
  }

  const next: RalexCategoriesFile = {
    ...data,
    categories,
    tree: buildCategoryTreeFromRecords(categories),
  };
  await writeRalexCategoriesFile(next);
  return { patched, data: next };
}
