export type RalexCategoryRecord = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  link: string;
  importCompletedAt?: string;
  importedProductCount?: number;
};

export type RalexCategoryNode = RalexCategoryRecord & {
  children: RalexCategoryNode[];
};

export type RalexCategoriesFile = {
  source: string;
  sourceApi: string;
  fetchedAt: string;
  totalCategories: number;
  categories: RalexCategoryRecord[];
  tree: RalexCategoryNode[];
};

import { LEGACY_HOTELINK_CATEGORY_SLUGS } from "@/lib/bergasports-catalog";

/** Not shown in the shop (legacy Hotelink / lege WooCommerce-categorieën). */
export const EXCLUDED_SHOP_CATEGORY_SLUGS = new Set([
  ...LEGACY_HOTELINK_CATEGORY_SLUGS,
]);

export function isExcludedShopCategorySlug(slug: string): boolean {
  return EXCLUDED_SHOP_CATEGORY_SLUGS.has(slug.trim().toLowerCase());
}

export function isExcludedShopCategory(record: Pick<RalexCategoryRecord, "slug">): boolean {
  return isExcludedShopCategorySlug(record.slug);
}

export function filterShopCategoryRecords(categories: RalexCategoryRecord[]): RalexCategoryRecord[] {
  return categories.filter((c) => !isExcludedShopCategory(c));
}

/** Ralex marcheaza unele categorii cu prefix "* ". */
export function formatRalexCategoryName(name: string) {
  return name.replace(/^\*\s*/, "").trim();
}

export function isRalexCategoryImportComplete(node: RalexCategoryRecord): boolean {
  if (!node.importCompletedAt || node.importedProductCount === undefined) {
    return false;
  }
  if (node.count === 0) {
    return node.importedProductCount === 0;
  }
  return node.importedProductCount >= node.count;
}

export function flattenRalexCategoryTree(nodes: RalexCategoryNode[]): RalexCategoryNode[] {
  const out: RalexCategoryNode[] = [];
  const walk = (n: RalexCategoryNode) => {
    out.push(n);
    for (const ch of n.children ?? []) {
      walk(ch);
    }
  };
  for (const root of nodes) {
    walk(root);
  }
  return out;
}
