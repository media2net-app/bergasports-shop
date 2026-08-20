import type { CategoryLocaleFields, LocaleMap } from "@/lib/i18n/translations";

export type RalexCategoryRecord = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  link: string;
  importCompletedAt?: string;
  importedProductCount?: number;
  translations?: LocaleMap<CategoryLocaleFields>;
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
import { categoryDisplayName, stripCategoryNamePrefix } from "@/lib/category-meta";

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

/** Strip legacy "* " prefix; map Woo/EN namen naar shop-labels voor de locale. */
export function formatRalexCategoryName(name: string, slug?: string, locale: string = "nl") {
  return categoryDisplayName(slug, stripCategoryNamePrefix(name), locale);
}

/** Publieke NL-naam op een DB/JSON-record (slug blijft Woo/canoniek). */
export function withPublicCategoryLabel<T extends { slug: string; name: string }>(record: T): T {
  return { ...record, name: formatRalexCategoryName(record.name, record.slug) };
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
