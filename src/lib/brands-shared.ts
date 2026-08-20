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

export type ShopNavBrand = {
  name: string;
  slug: string;
};

export function shopBrandListingHref(slug: string): string {
  return `/shop?merk=${encodeURIComponent(slug)}`;
}

function normalizeBrandText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/|]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Shop name — never a product manufacturer. */
export function isShopNameBrand(name?: string | null): boolean {
  const n = normalizeBrandText(name ?? "").replace(/[.-]/g, " ").replace(/\s+/g, " ");
  return n === "bergasports" || n === "berga sports";
}

export type KnownProductBrand = {
  name: string;
  aliases: string[];
  sortOrder: number;
};

/** Canonical manufacturer names (homepage first, then extra catalog brands). */
export const KNOWN_PRODUCT_BRANDS: KnownProductBrand[] = [
  { name: "Colnago", aliases: ["colnago"], sortOrder: 10 },
  { name: "Orbea", aliases: ["orbea"], sortOrder: 20 },
  { name: "Basso", aliases: ["basso"], sortOrder: 30 },
  { name: "Cervélo", aliases: ["cervelo", "cervélo"], sortOrder: 40 },
  { name: "Cipollini", aliases: ["cipollini"], sortOrder: 50 },
  { name: "Titici", aliases: ["titici"], sortOrder: 60 },
  { name: "Sensa", aliases: ["sensa"], sortOrder: 70 },
  { name: "Scope", aliases: ["scope"], sortOrder: 80 },
  { name: "Nimbl", aliases: ["nimbl"], sortOrder: 90 },
  { name: "LaFuga", aliases: ["lafuga", "la fuga"], sortOrder: 100 },
  { name: "Double FF", aliases: ["double ff", "doubleff", "double-ff"], sortOrder: 110 },
  { name: "KASK", aliases: ["kask"], sortOrder: 120 },
  { name: "100%", aliases: ["ride 100%", "rid 100%", "ride 100", "rid 100", "100%"], sortOrder: 200 },
  { name: "Polygon", aliases: ["polygon"], sortOrder: 210 },
  { name: "DMT", aliases: ["dmt"], sortOrder: 220 },
  { name: "Favero", aliases: ["favero", "assioma"], sortOrder: 230 },
  { name: "CyclingCeramic", aliases: ["cycling ceramic", "cyclingceramic"], sortOrder: 240 },
  { name: "MPC", aliases: ["mpc"], sortOrder: 250 },
  { name: "Powerslide", aliases: ["powerslide"], sortOrder: 260 },
  { name: "Wahoo", aliases: ["wahoo", "elemnt"], sortOrder: 270 },
  { name: "Shokz", aliases: ["shokz"], sortOrder: 280 },
  { name: "LGO", aliases: ["lgo"], sortOrder: 290 },
];

const CATEGORY_BRAND_HINTS: Record<string, string> = {
  "lafuga-wear": "LaFuga",
  lafuga: "LaFuga",
  "scope-outlet": "Scope",
  "cycling-helmets": "KASK",
  helmen: "KASK",
};

function isBoundaryChar(ch: string | undefined): boolean {
  return !ch || /[^a-z0-9]/.test(ch);
}

export function canonicalizeBrandName(raw?: string | null): string | undefined {
  const value = (raw ?? "").trim();
  if (!value || isShopNameBrand(value)) {
    return undefined;
  }
  const needle = normalizeBrandText(value);
  const exact = KNOWN_PRODUCT_BRANDS.find(
    (brand) =>
      normalizeBrandText(brand.name) === needle || brand.aliases.some((alias) => normalizeBrandText(alias) === needle),
  );
  return exact?.name ?? value;
}

export function findKnownBrandInText(text?: string | null): string | undefined {
  const hay = normalizeBrandText(text ?? "");
  if (!hay) {
    return undefined;
  }
  let best: { name: string; index: number; len: number } | undefined;
  for (const brand of KNOWN_PRODUCT_BRANDS) {
    for (const alias of brand.aliases) {
      const needle = normalizeBrandText(alias);
      if (!needle) continue;
      let from = 0;
      while (from <= hay.length) {
        const idx = hay.indexOf(needle, from);
        if (idx < 0) break;
        const before = idx === 0 ? undefined : hay[idx - 1];
        const after = hay[idx + needle.length];
        if (isBoundaryChar(before) && isBoundaryChar(after)) {
          if (!best || idx < best.index || (idx === best.index && needle.length > best.len)) {
            best = { name: brand.name, index: idx, len: needle.length };
          }
          break;
        }
        from = idx + 1;
      }
    }
  }
  return best?.name;
}

type BrandAttributeSource = {
  name?: string | null;
  slug?: string | null;
  taxonomy?: string | null;
  options?: string[] | null;
  option?: string | null;
  terms?: { name?: string | null }[] | null;
};

export function extractBrandNameFromAttributes(attrs: BrandAttributeSource[] | undefined): string | undefined {
  if (!attrs?.length) {
    return undefined;
  }
  for (const attr of attrs) {
    if (!isBrandAttributeKey(attr.name, attr.slug ?? attr.taxonomy)) {
      continue;
    }
    const fromOptions = (attr.options ?? []).map((item) => item.trim()).filter(Boolean);
    if (fromOptions[0]) {
      return canonicalizeBrandName(fromOptions[0]);
    }
    const option = attr.option?.trim();
    if (option) {
      return canonicalizeBrandName(option);
    }
    const term = attr.terms?.map((row) => row.name?.trim()).find(Boolean);
    if (term) {
      return canonicalizeBrandName(term);
    }
  }
  return undefined;
}

export function extractBrandNameFromTaxonomy(rows: { name?: string | null }[] | undefined): string | undefined {
  const name = rows?.map((row) => row.name?.trim()).find(Boolean);
  return canonicalizeBrandName(name);
}

function brandFromSpecsText(specsText?: string | null): string | undefined {
  if (!specsText?.trim()) {
    return undefined;
  }
  for (const line of specsText.split(/\r?\n/)) {
    const sep = line.indexOf(":");
    if (sep < 1) continue;
    const name = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (!value || !isBrandAttributeKey(name, name)) continue;
    const canonical = canonicalizeBrandName(value);
    if (canonical) return canonical;
  }
  return undefined;
}

function brandFromCategoryHint(
  category?: string | null,
  wcCategories?: { slug?: string | null; name?: string | null }[],
): string | undefined {
  const slugs = [
    ...(wcCategories ?? []).map((row) => row.slug),
    ...(wcCategories ?? []).map((row) => row.name),
    category,
  ]
    .map((value) => slugifyNl(value ?? ""))
    .filter(Boolean);
  for (const slug of slugs) {
    const hinted = CATEGORY_BRAND_HINTS[slug];
    if (hinted) return hinted;
  }
  return undefined;
}

export type ProductBrandSource = {
  brand?: string | null;
  name?: string | null;
  category?: string | null;
  specsText?: string | null;
  wcAttributes?: BrandAttributeSource[];
  attributes?: BrandAttributeSource[];
  wcCategories?: { slug?: string | null; name?: string | null }[];
  tags?: { name?: string | null; slug?: string | null }[];
};

/**
 * Real manufacturer for a product. Shop name (Bergasports) is ignored.
 * Priority: Woo Merk/Brand → specs → product name → category hint.
 */
export function inferProductBrandName(product: ProductBrandSource): string | undefined {
  const stored = canonicalizeBrandName(product.brand);
  if (stored) {
    return stored;
  }
  const fromAttrs =
    extractBrandNameFromAttributes(product.wcAttributes) || extractBrandNameFromAttributes(product.attributes);
  if (fromAttrs) {
    return fromAttrs;
  }
  const fromSpecs = brandFromSpecsText(product.specsText);
  if (fromSpecs) {
    return fromSpecs;
  }
  const fromTags = extractBrandNameFromTaxonomy(
    product.tags?.filter((tag) => isBrandAttributeKey(tag.name, tag.slug)),
  );
  if (fromTags) {
    return fromTags;
  }
  const fromName = findKnownBrandInText(product.name);
  if (fromName) {
    return fromName;
  }
  return brandFromCategoryHint(product.category, product.wcCategories);
}

function hasRealIncomingBrand(incoming: { brand?: string; brandId?: number }): boolean {
  if (isShopNameBrand(incoming.brand)) {
    return false;
  }
  if (incoming.brand?.trim()) {
    return true;
  }
  return typeof incoming.brandId === "number" && Number.isFinite(incoming.brandId) && incoming.brandId > 0;
}

export function preserveProductBrand<T extends { brand?: string; brandId?: number }>(
  incoming: T,
  existing: T | null | undefined,
): T {
  if (hasRealIncomingBrand(incoming) || !existing) {
    return incoming;
  }
  if (!hasRealIncomingBrand(existing)) {
    return incoming;
  }
  return {
    ...incoming,
    brand: existing.brand,
    brandId: existing.brandId,
  };
}
