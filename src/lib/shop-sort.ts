import { decodeImportedProductTitle, type Product } from "@/lib/products";
import { normalizeForShopSearch, scoreProductForSearch } from "@/lib/shop-category-filter";

export type ShopSort = "relevance" | "price_asc" | "price_desc" | "name_asc" | "newest";

export const SHOP_SORT_OPTIONS: { id: ShopSort; label: string }[] = [
  { id: "relevance", label: "Relevantie" },
  { id: "price_asc", label: "Prijs: laag → hoog" },
  { id: "price_desc", label: "Prijs: hoog → laag" },
  { id: "name_asc", label: "Naam A–Z" },
  { id: "newest", label: "Nieuwste" },
];

export function parseShopSortParam(raw: string | undefined | null): ShopSort {
  if (raw === "price_asc" || raw === "price_desc" || raw === "name_asc" || raw === "newest") {
    return raw;
  }
  return "relevance";
}

export function applyShopSort(
  products: Product[],
  sort: ShopSort,
  searchQuery: string | null | undefined,
): Product[] {
  const list = [...products];

  if (sort === "relevance" && searchQuery?.trim()) {
    const trimmed = searchQuery.trim();
    const needle = normalizeForShopSearch(trimmed);
    if (needle) {
      return list
        .map((p) => ({ p, score: scoreProductForSearch(p, trimmed) }))
        .filter((x) => Number.isFinite(x.score))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.p);
    }
  }

  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => a.price - b.price || a.id - b.id);
    case "price_desc":
      return list.sort((a, b) => b.price - a.price || b.id - a.id);
    case "name_asc":
      return list.sort((a, b) =>
        decodeImportedProductTitle(a.name).localeCompare(
          decodeImportedProductTitle(b.name),
          "nl",
          { sensitivity: "base" },
        ),
      );
    case "newest":
      return list.sort((a, b) => b.id - a.id);
    default:
      return list.sort((a, b) =>
        decodeImportedProductTitle(a.name).localeCompare(
          decodeImportedProductTitle(b.name),
          "nl",
          { sensitivity: "base" },
        ),
      );
  }
}
