/** Alleen catalogus van bergasports.com tonen — geen Hotelink/Ralex-database. */

export const BERGASPORTS_CATALOG_SOURCE_HOST = "bergasports.com";

export const LEGACY_HOTELINK_CATEGORY_SLUGS = new Set([
  "baie-si-piscina",
  "camera-hotel",
  "elemente-lenjerie-pat",
  "halate-baie",
  "lenjerii-de-pat",
  "papuci-hotel-spa",
  "perne",
  "pilote",
  "prosoape",
  "protectii-saltea",
  "restaurant",
  "bumbac",
  "uncategorized",
  "uncategorized-2",
  "bike-groups",
]);

export function isBergasportsCatalogSource(source: string | null | undefined): boolean {
  const s = source?.trim().toLowerCase() ?? "";
  return s.includes(BERGASPORTS_CATALOG_SOURCE_HOST);
}

export function isBergasportsProductUrl(url: string | null | undefined): boolean {
  const u = url?.trim().toLowerCase() ?? "";
  return u.includes(BERGASPORTS_CATALOG_SOURCE_HOST);
}

export function isLegacyHotelinkCategorySlug(slug: string): boolean {
  return LEGACY_HOTELINK_CATEGORY_SLUGS.has(slug.trim().toLowerCase());
}
