import { isExcludedShopCategorySlug } from "@/lib/ralex-categories";
import { shopCategoryPath } from "@/lib/shop-category-filter";

/** Canonical shop URL for a category listing (path-based SEO routes). */
export function categoryShopHref(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || isExcludedShopCategorySlug(normalized)) {
    return "/shop";
  }
  return shopCategoryPath(normalized);
}

export function isExternalCategoryLink(link: string | null | undefined): boolean {
  const trimmed = link?.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith("/")) {
    return false;
  }
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (host === "localhost" || host.endsWith("bergasports.com") || host.endsWith("estorehouse.ro")) {
      return false;
    }
    return true;
  } catch {
    return /^https?:\/\//i.test(trimmed);
  }
}

/** Prefer internal shop path; rewrite legacy supplier permalinks. */
export function normalizeCategoryShopLink(slug: string, link?: string | null): string {
  const internal = categoryShopHref(slug);
  if (!link?.trim() || isExternalCategoryLink(link)) {
    return internal;
  }
  const trimmed = link.trim();
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return internal;
}
