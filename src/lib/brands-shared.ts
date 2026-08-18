import { slugifyNl } from "@/lib/slugify";

export type ShopBrand = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  visible: boolean;
  sortOrder: number;
};

const BRAND_ATTR_KEYS = new Set(["merk", "brand", "marca", "product_brand", "pa_merk", "pa_brand", "pa_marca"]);

export function isBrandAttributeKey(name?: string | null, slug?: string | null): boolean {
  const keys = [name, slug]
    .map((value) => (value ?? "").trim().toLowerCase().replace(/^pa_/, "pa_"))
    .filter(Boolean);
  return keys.some((key) => BRAND_ATTR_KEYS.has(key) || BRAND_ATTR_KEYS.has(key.replace(/^pa_/, "")));
}

export function brandSlugFromName(name: string): string {
  return slugifyNl(name);
}

export function extractBrandNameFromAttributes(
  attrs:
    | {
        name?: string | null;
        slug?: string | null;
        taxonomy?: string | null;
        options?: string[] | null;
        option?: string | null;
        terms?: { name?: string | null }[] | null;
      }[]
    | undefined,
): string | undefined {
  if (!attrs?.length) {
    return undefined;
  }
  for (const attr of attrs) {
    if (!isBrandAttributeKey(attr.name, attr.slug ?? attr.taxonomy)) {
      continue;
    }
    const fromOptions = (attr.options ?? []).map((item) => item.trim()).filter(Boolean);
    if (fromOptions[0]) {
      return fromOptions[0];
    }
    const option = attr.option?.trim();
    if (option) {
      return option;
    }
    const term = attr.terms?.map((row) => row.name?.trim()).find(Boolean);
    if (term) {
      return term;
    }
  }
  return undefined;
}

export function extractBrandNameFromTaxonomy(
  rows: { name?: string | null }[] | undefined,
): string | undefined {
  const name = rows?.map((row) => row.name?.trim()).find(Boolean);
  return name || undefined;
}

export function preserveProductBrand<T extends { brand?: string; brandId?: number }>(
  incoming: T,
  existing: T | null | undefined,
): T {
  const incomingHas =
    Boolean(incoming.brand?.trim()) ||
    (typeof incoming.brandId === "number" && Number.isFinite(incoming.brandId) && incoming.brandId > 0);
  if (incomingHas || !existing) {
    return incoming;
  }
  return {
    ...incoming,
    brand: existing.brand,
    brandId: existing.brandId,
  };
}
