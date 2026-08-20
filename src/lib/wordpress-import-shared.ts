/**
 * WordPress / WooCommerce import: fetch, mapping en merge-regels.
 * Geen server-only — bruikbaar vanuit admin én `scripts/import-wordpress.ts`.
 */

import { categoryDisplayName } from "@/lib/category-meta";
import {
  extractBrandNameFromAttributes,
  extractBrandNameFromTaxonomy,
  inferProductBrandName,
  isBrandAttributeKey,
  preserveProductBrand,
} from "@/lib/brands-shared";
import { toCanonicalWcSlug, toPublicCategorySlug } from "@/lib/category-slugs";
import { DEFAULT_LOCALE, isLocaleCode } from "@/lib/i18n/locale-codes";
import { localeFromHost } from "@/lib/i18n/locale-shared";
import {
  compactLocaleMap,
  parseLocaleMap,
  setLocaleFields,
  type CategoryLocaleFields,
  type NewsLocaleFields,
  type PageLocaleFields,
  type ProductLocaleFields,
} from "@/lib/i18n/translations";
import {
  decodeImportedProductTitle,
  type TrendyolJsonProduct,
  type WcProductAttributeJson,
  type WcVariationJson,
} from "@/lib/products";
import { uniqueProductSlug } from "@/lib/product-slug";
import { isExcludedShopCategorySlug } from "@/lib/ralex-categories";
import { normalizeNewsCategoryNl } from "@/lib/news-format";

export const WORDPRESS_IMPORT_TYPES = [
  "products",
  "categories",
  "attributes",
  "customers",
  "orders",
  "news",
  "pages",
] as const;

export type WordpressImportType = (typeof WORDPRESS_IMPORT_TYPES)[number];

export type WpAuth = { key: string; secret: string };

export type WordpressImportCredentials = {
  baseUrl: string;
  /** WooCommerce REST (ck_/cs_) — alleen `/wc/v3/*`. */
  auth: WpAuth | null;
  /** WordPress application password — alleen `/wp/v2/*` (optioneel; anders publiek). */
  wpAuth: WpAuth | null;
};

/** Auth voor WP core REST. Nooit Woo ck_/cs_ — WP ziet dat als gebruikersnaam. */
export function wpRestAuth(creds: Pick<WordpressImportCredentials, "wpAuth">): WpAuth | null {
  const key = creds.wpAuth?.key?.trim() ?? "";
  const secret = creds.wpAuth?.secret?.trim() ?? "";
  return key && secret ? { key, secret } : null;
}

export function wpAuthFromEnv(env: Record<string, string | undefined> = process.env): WpAuth | null {
  const key = env.WP_APP_USER?.trim() ?? "";
  const secret = env.WP_APP_PASSWORD?.trim() ?? "";
  return key && secret ? { key, secret } : null;
}

export type WooCommerceOrderLineItem = {
  id: number;
  name: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  total: string;
  price?: number;
  sku?: string;
};

export type WooCommerceOrder = {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  discount_total: string;
  payment_method: string;
  payment_method_title: string;
  customer_note: string;
  date_created: string;
  date_created_gmt?: string;
  date_modified?: string;
  billing: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shipping: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items: WooCommerceOrderLineItem[];
};

export type WooCommerceCustomer = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  shipping?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export type WpRendered = { rendered?: string };

export type WpPost = {
  id: number;
  slug: string;
  link?: string;
  status?: string;
  date?: string;
  date_gmt?: string;
  title?: WpRendered | string;
  excerpt?: WpRendered | string;
  content?: WpRendered | string;
  jetpack_featured_media_url?: string;
  yoast_head_json?: { title?: string; description?: string; og_image?: { url?: string }[] };
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string }[];
    "wp:term"?: { name?: string; taxonomy?: string }[][];
  };
};

export type WpPage = WpPost & {
  parent?: number;
};

type WcRestImage = { src?: string };
type WcRestCategory = { id: number; name?: string; slug?: string };
export type WcRestAttribute = {
  id?: number;
  name?: string;
  slug?: string;
  option?: string;
  options?: string[];
  visible?: boolean;
  variation?: boolean;
};

export type WcRestProductCategory = {
  id: number;
  name?: string;
  slug?: string;
  parent?: number;
  count?: number;
  description?: string;
  permalink?: string;
};

export type WcRestGlobalAttribute = {
  id: number;
  name?: string;
  slug?: string;
  type?: string;
  order_by?: string;
  has_archives?: boolean;
};

export type WcRestAttributeTerm = {
  id: number;
  name?: string;
  slug?: string;
  menu_order?: number;
  count?: number;
};

export type WcRestProduct = {
  id: number;
  name: string;
  slug?: string;
  permalink?: string;
  type?: string;
  status?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  description?: string;
  short_description?: string;
  price_html?: string;
  average_rating?: string;
  rating_count?: number;
  stock_status?: string;
  images?: WcRestImage[];
  categories?: WcRestCategory[];
  tags?: WcRestCategory[];
  brands?: WcRestCategory[];
  attributes?: WcRestAttribute[];
  /** WPML: { en: "11863", nl: "11867" } */
  lang?: string;
  translations?: Record<string, string | number>;
};

export type WcRestVariation = {
  id: number;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  permalink?: string;
  image?: { src?: string };
  attributes?: WcRestAttribute[];
};

export type MappedNewsPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  coverImage: string | null;
  category: string | null;
  publishedAt: Date | null;
  sourceUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type MappedSitePage = {
  slug: string;
  path: string;
  title: string;
  heading: string;
  bodyHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  socialImage: string | null;
};

/** CMS-slugs die we niet vanuit WordPress overschrijven. */
export const WORDPRESS_PROTECTED_PAGE_SLUGS = new Set([
  "home",
  "about",
  "contact",
  "terms",
  "privacy",
  "cookies",
  "payment",
  "onderhoud",
  "afspraak",
  "merken",
  "lafuga",
  "nimbl",
  "shipping",
  "shop",
  "cart",
  "checkout",
  "account",
  "my-account",
  "winkelwagen",
  "afrekenen",
  "mijn-account",
  "privacybeleid",
  "algemene-voorwaarden",
  "over-ons",
  "verzending",
  "retouren",
  "betalen",
  "admin",
  "api",
  "product",
  "nieuws",
  "news",
  "cart-2",
  "winkel",
]);

export function normalizeWpBaseUrl(raw: string): string {
  return raw.trim().replace(/\/$/, "") || "https://www.bergasports.com";
}

/**
 * Woo/WP REST draait op bergasports.com (WPML).
 * bergasports.nl is de Nederlandse shop-host zonder /wp-json — die geeft HTML terug.
 */
export function wordpressRestBaseUrl(configured: string): string {
  const normalized = normalizeWpBaseUrl(configured);
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    if (host === "bergasports.nl" || host === "www.bergasports.nl" || host.endsWith(".bergasports.nl")) {
      return "https://www.bergasports.com";
    }
  } catch {
    /* ignore */
  }
  return normalized;
}

/**
 * Taal van de importbron: bergasports.nl → nl, bergasports.com → en.
 * Zelfde regel als de storefront host-locale.
 */
export function importLocaleFromBaseUrl(baseUrl: string): string {
  try {
    return localeFromHost(new URL(normalizeWpBaseUrl(baseUrl)).hostname);
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Expliciete `--locale` / admin-keuze, anders afgeleid van de bron-URL. */
export function resolveWordpressImportLocale(
  explicit: string | null | undefined,
  baseUrl: string,
): string {
  const code = (explicit || "").trim().toLowerCase();
  if (code && isLocaleCode(code)) return code;
  return importLocaleFromBaseUrl(baseUrl);
}

export function isDefaultImportLocale(locale: string): boolean {
  return locale === DEFAULT_LOCALE;
}

export function stripHtml(value: string | undefined | null): string {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function decodeHtmlEntities(text: string): string {
  let s = String(text || "");
  while (s.includes("&amp;")) s = s.replace(/&amp;/g, "&");
  return s
    .replace(/&#x([0-9a-fA-F]+);/gi, (full, hex: string) => {
      const cp = Number.parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    })
    .replace(/&#(\d+);/g, (full, dec: string) => {
      const cp = Number.parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function slugifyWp(value: string): string {
  return (
    decodeHtmlEntities(value)
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || `item-${Date.now()}`
  );
}

function rendered(value: WpRendered | string | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.rendered || "";
}

function money(value: string | number | undefined): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export async function fetchWordpressJson<T>(
  url: string,
  auth: WpAuth | null,
): Promise<{ ok: true; data: T; total: number; totalPages: number } | { ok: false; status: number; text: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth?.key && auth.secret) {
    headers.Authorization = `Basic ${Buffer.from(`${auth.key}:${auth.secret}`).toString("base64")}`;
  }
  const res = await fetch(url, { headers, cache: "no-store", redirect: "follow" });
  const text = await res.text().catch(() => "");
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML")) {
    return {
      ok: false,
      status: res.status,
      text:
        "HTML in plaats van JSON — dit is geen WooCommerce REST-endpoint. Gebruik https://www.bergasports.com (met lang=nl/en). bergasports.nl heeft geen /wp-json.",
    };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, text: text.slice(0, 240) };
  }
  try {
    const data = JSON.parse(text) as T;
    const total = Number.parseInt(res.headers.get("X-WP-Total") || "0", 10) || 0;
    const totalPages = Number.parseInt(res.headers.get("X-WP-TotalPages") || "0", 10) || 0;
    return { ok: true, data, total, totalPages };
  } catch {
    return {
      ok: false,
      status: res.status,
      text: `Ongeldige JSON van ${url.slice(0, 80)}… (${text.slice(0, 120).replace(/\s+/g, " ")})`,
    };
  }
}

export async function fetchWordpressPages<T>(options: {
  urlForPage: (page: number, perPage: number) => string;
  auth: WpAuth | null;
  perPage?: number;
  maxPages?: number;
  label: string;
  log?: (message: string) => void;
}): Promise<{ items: T[]; total: number; pages: number }> {
  const perPage = Math.min(100, Math.max(1, options.perPage ?? 50));
  const maxPages = options.maxPages ?? 200;
  const items: T[] = [];
  let page = 1;
  let total = 0;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    options.log?.(`${options.label}: ophalen pagina ${page}${totalPages > 1 ? `/${totalPages}` : ""}…`);
    const result = await fetchWordpressJson<T[]>(options.urlForPage(page, perPage), options.auth);
    if (!result.ok) {
      if (page > 1 && (result.status === 400 || result.status === 404)) break;
      throw new Error(`${options.label} ${result.status}: ${result.text}`);
    }
    if (!Array.isArray(result.data) || result.data.length === 0) break;
    items.push(...result.data);
    total = result.total || items.length;
    totalPages = result.totalPages || Math.max(1, Math.ceil(total / perPage));
    options.log?.(
      `${options.label}: pagina ${page}/${totalPages} · ${items.length}/${total || items.length} items`,
    );
    page += 1;
  }

  return { items, total: total || items.length, pages: Math.max(0, page - 1) };
}

export function wcV3Url(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const suffix = qs.toString();
  return `${wordpressRestBaseUrl(baseUrl)}/wp-json/wc/v3/${path.replace(/^\//, "")}${suffix ? `?${suffix}` : ""}`;
}

export function wpV2Url(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const suffix = qs.toString();
  return `${wordpressRestBaseUrl(baseUrl)}/wp-json/wp/v2/${path.replace(/^\//, "")}${suffix ? `?${suffix}` : ""}`;
}

/** WPML-vertalings-IDs van een Woo-product (eigen id + linked locales). */
export function wpmlTranslationIds(product: {
  id: number;
  translations?: unknown;
  wpmlTranslations?: Record<string, number> | null;
}): number[] {
  const ids = new Set<number>();
  if (Number.isFinite(product.id) && product.id > 0) ids.add(product.id);
  // Alleen wpmlTranslations of Woo-style translations (id-map), niet i18n LocaleMap
  const raw = product.wpmlTranslations ?? (
    product.translations &&
    typeof product.translations === "object" &&
    !Array.isArray(product.translations) &&
    Object.values(product.translations).every(
      (v) => typeof v === "string" || typeof v === "number",
    )
      ? (product.translations as Record<string, string | number>)
      : null
  );
  if (raw && typeof raw === "object") {
    for (const value of Object.values(raw)) {
      const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
      if (Number.isFinite(n) && n > 0) ids.add(n);
    }
  }
  return [...ids];
}

/** Canonieke product-id: liever NL-vertaling (WPML), anders de huidige id. */
export function canonicalWpmlProductId(product: WcRestProduct): number {
  const nl = product.translations?.nl;
  if (nl != null) {
    const n = typeof nl === "number" ? nl : Number.parseInt(String(nl), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return product.id;
}

export function wpmlTranslationsMap(
  product: Pick<WcRestProduct, "id" | "lang" | "translations">,
): Record<string, number> | undefined {
  const out: Record<string, number> = {};
  if (product.translations && typeof product.translations === "object") {
    for (const [code, value] of Object.entries(product.translations)) {
      const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
      if (Number.isFinite(n) && n > 0) out[code] = n;
    }
  }
  if (product.lang && !out[product.lang]) out[product.lang] = product.id;
  if (!out.en && !out.nl) out[product.lang || "en"] = product.id;
  return Object.keys(out).length ? out : undefined;
}

export function mapWcAttributeOptions(attr: WcRestAttribute): string[] {
  const raw = attr.options?.length ? attr.options : attr.option ? [attr.option] : [];
  return raw.map((item) => decodeHtmlEntities(stripHtml(item)).trim()).filter(Boolean);
}

export function mapWcRestAttributes(attrs: WcRestAttribute[] | undefined): WcProductAttributeJson[] {
  if (!attrs?.length) return [];
  const out: WcProductAttributeJson[] = [];
  for (const attr of attrs) {
    const name = decodeHtmlEntities(stripHtml(attr.name || "")).trim();
    const options = mapWcAttributeOptions(attr);
    if (!name || !options.length) continue;
    out.push({
      id: typeof attr.id === "number" ? attr.id : 0,
      name,
      slug: attr.slug?.trim() || undefined,
      visible: attr.visible !== false,
      variation: Boolean(attr.variation),
      options,
    });
  }
  return out;
}

/** Woo eigenschappen → specsText (niet in de HTML-beschrijving). Merk gaat naar het Brand-model. */
export function specsTextFromWcAttributes(attrs: WcRestAttribute[] | undefined): string {
  return mapWcRestAttributes(attrs)
    .filter((attr) => attr.visible && !isBrandAttributeKey(attr.name, attr.slug))
    .map((attr) => `${attr.name}: ${attr.options.join(", ")}`)
    .join("\n");
}

export function extractWcProductBrand(p: WcRestProduct): string | undefined {
  return (
    extractBrandNameFromTaxonomy(p.brands) ||
    extractBrandNameFromAttributes(p.attributes) ||
    extractBrandNameFromTaxonomy(p.tags?.filter((tag) => isBrandAttributeKey(tag.name, tag.slug))) ||
    inferProductBrandName({ name: p.name, wcCategories: p.categories })
  );
}

export function applyGlobalAttributeTerms(
  attrs: WcRestAttribute[] | undefined,
  termsByAttrId: Map<number, string[]>,
): WcRestAttribute[] {
  if (!attrs?.length) return [];
  return attrs.map((attr) => {
    const existing = mapWcAttributeOptions(attr);
    if (existing.length || !attr.id || !termsByAttrId.has(attr.id)) return attr;
    const terms = termsByAttrId.get(attr.id) ?? [];
    return terms.length ? { ...attr, options: terms } : attr;
  });
}

export function wooCategoryAliasSlugs(slug: string): string[] {
  const s = slug.trim().toLowerCase();
  if (!s) return [];
  const aliases = new Set<string>([s]);
  aliases.add(toCanonicalWcSlug(s, "nl"));
  aliases.add(toPublicCategorySlug(s, "nl"));
  aliases.add(toCanonicalWcSlug(s, "en"));
  aliases.add(toPublicCategorySlug(s, "en"));
  return [...aliases].filter(Boolean);
}

const PLACEHOLDER_PRODUCT_CATEGORIES = new Set(["shop", "bergasports", "uncategorized", "ongecategoriseerd"]);

export function isPlaceholderProductCategory(value: string | undefined | null): boolean {
  const s = value?.trim().toLowerCase() ?? "";
  return !s || PLACEHOLDER_PRODUCT_CATEGORIES.has(s);
}

export function shouldReplaceImportedCategory(
  existing: string | undefined,
  incoming: string | undefined,
  wcSlugs: string[],
): boolean {
  const next = incoming?.trim() ?? "";
  if (!next) return false;
  if (isPlaceholderProductCategory(existing)) return true;
  const current = existing!.trim();
  if (current.toLowerCase() === next.toLowerCase()) return true;
  const currentSlug = current
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const aliases = new Set(wcSlugs.flatMap((slug) => wooCategoryAliasSlugs(slug)));
  return aliases.has(currentSlug);
}

export function isSkippedWooCategorySlug(slug: string | undefined | null): boolean {
  const s = slug?.trim().toLowerCase() ?? "";
  return !s || isExcludedShopCategorySlug(s);
}

export function sortWooCategoriesParentsFirst(cats: WcRestProductCategory[]): WcRestProductCategory[] {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const depthOf = (cat: WcRestProductCategory, seen: Set<number>): number => {
    const parent = cat.parent ?? 0;
    if (!parent || seen.has(cat.id)) return 0;
    seen.add(cat.id);
    const parentCat = byId.get(parent);
    return parentCat ? 1 + depthOf(parentCat, seen) : 0;
  };
  return [...cats].sort((a, b) => depthOf(a, new Set()) - depthOf(b, new Set()) || a.id - b.id);
}

export function mapWcVariation(v: WcRestVariation): WcVariationJson {
  const display = money(v.price || v.sale_price || v.regular_price);
  const regular = money(v.regular_price || v.price);
  const label =
    (v.attributes || [])
      .map((a) => a.option?.trim())
      .filter(Boolean)
      .join(" / ") || `Variatie #${v.id}`;
  return {
    id: v.id,
    label,
    price: display,
    regularPrice: regular,
    onSale: Boolean(v.on_sale && regular > display),
    sku: v.sku?.trim() || undefined,
    url: v.permalink || "",
    image: v.image?.src?.trim() || undefined,
  };
}

export function mapWcRestProductToJson(
  p: WcRestProduct,
  variations?: WcRestVariation[],
): TrendyolJsonProduct {
  const imgs = (p.images ?? []).map((i) => i.src?.trim() || "").filter(Boolean);
  const primary = imgs[0] ?? "";
  const display = money(p.price || p.sale_price || p.regular_price);
  const regular = money(p.regular_price || p.price);
  const onSale = Boolean(p.on_sale && regular > display && display >= 0);
  const name = decodeImportedProductTitle(decodeHtmlEntities(stripHtml(p.name) || `Product ${p.id}`));
  const sku = p.sku?.trim() || "";
  const primaryCat = p.categories?.find((c) => c.name || c.slug) ?? p.categories?.[0];
  const category = primaryCat
    ? categoryDisplayName(
        primaryCat.slug,
        decodeHtmlEntities(stripHtml(primaryCat.name || primaryCat.slug || "")),
      ) || "Shop"
    : "Shop";

  let discount: number | undefined;
  if (onSale && regular > 0) {
    discount = Math.min(99, Math.max(1, Math.round(((regular - display) / regular) * 100)));
  }

  const base: TrendyolJsonProduct = {
    id: canonicalWpmlProductId(p),
    name,
    brand: extractWcProductBrand(p),
    category,
    url: p.permalink || `https://www.bergasports.com/product/${p.slug || p.id}`,
    image: primary,
    images: imgs.length > 0 ? imgs : primary ? [primary] : [],
    currency: "EUR",
    priceCurrent: onSale ? regular : display,
    priceCurrentText: (onSale ? regular : display).toFixed(2),
    priceDiscounted: display,
    priceDiscountedText: display.toFixed(2),
    priceOld: onSale ? regular : 0,
    discount,
    freeCargo: true,
    catalogSource: "manual",
    productStatus: p.status === "publish" ? "published" : "concept",
    inStock: p.stock_status ? p.stock_status !== "outofstock" : true,
  };

  const wpml = wpmlTranslationsMap(p);
  if (wpml) base.wpmlTranslations = wpml;

  if (variations?.length) {
    const mapped = variations.map(mapWcVariation);
    const prices = mapped.map((x) => x.price).filter((n) => Number.isFinite(n));
    const minP = prices.length ? Math.min(...prices) : display;
    const maxP = prices.length ? Math.max(...prices) : display;
    base.wcVariations = mapped;
    base.priceRangeMax = maxP;
    base.priceDiscounted = minP;
    base.priceDiscountedText = minP.toFixed(2);
    base.priceCurrent = minP;
    base.priceCurrentText = minP.toFixed(2);
    base.priceOld = 0;
    base.discount = undefined;
  }

  const shortHtml = p.short_description?.trim() || "";
  const longHtml = p.description?.trim() || "";
  if (shortHtml) base.wcShortDescriptionHtml = shortHtml;
  if (longHtml) base.wcDescriptionHtml = longHtml;
  if (sku) base.wcSku = sku;
  if (p.slug) base.wcSlug = p.slug;
  if (p.type) base.wcProductType = p.type;
  if (p.average_rating != null && String(p.average_rating).trim() !== "") {
    base.wcAverageRating = String(p.average_rating);
  }
  if (typeof p.rating_count === "number") base.wcReviewCount = p.rating_count;
  if (p.price_html?.trim()) base.wcPriceHtml = p.price_html.trim();
  if (p.categories?.length) {
    base.wcCategories = p.categories.map((c) => ({
      id: c.id,
      name: categoryDisplayName(c.slug, decodeHtmlEntities(c.name || "")),
      slug: c.slug || "",
    }));
  }
  const wcAttributes = mapWcRestAttributes(p.attributes);
  if (wcAttributes.length) base.wcAttributes = wcAttributes;
  const specs = specsTextFromWcAttributes(p.attributes);
  if (specs) base.specsText = specs;

  return base;
}

/**
 * Bestaande Easy Sales-voorraad, featured-flag, handmatige specs/SEO blijven staan.
 * Categorie alleen overschrijven als die nog leeg/placeholder is of al een Woo-categorie is.
 * Match op WooCommerce-id, anders op SKU.
 */
export function mergeImportedProduct(
  incoming: TrendyolJsonProduct,
  existing: TrendyolJsonProduct | null,
  usedBySlug: Map<string, number>,
): TrendyolJsonProduct {
  if (!existing) {
    const slug = uniqueProductSlug(incoming.wcSlug || incoming.slug || incoming.name, incoming.id, usedBySlug);
    usedBySlug.set(slug, incoming.id);
    return {
      ...incoming,
      slug,
      catalogSource: "manual",
      featuredOnHomepage: false,
      stockQuantity: undefined,
      reservedStock: undefined,
      easySalesProductId: undefined,
      easySalesSku: undefined,
      stockSyncedAt: undefined,
    };
  }

  const slug = existing.slug?.trim() || uniqueProductSlug(incoming.wcSlug || incoming.name, existing.id, usedBySlug);
  usedBySlug.set(slug, existing.id);
  const hasEasySalesStock =
    typeof existing.stockQuantity === "number" && Number.isFinite(existing.stockQuantity);
  const withBrand = preserveProductBrand(incoming, existing);

  return {
    ...withBrand,
    id: existing.id,
    slug,
    featuredOnHomepage: Boolean(existing.featuredOnHomepage),
    productStatus: existing.productStatus ?? incoming.productStatus,
    stockQuantity: existing.stockQuantity,
    reservedStock: existing.reservedStock,
    inStock: hasEasySalesStock ? existing.inStock : incoming.inStock,
    easySalesProductId: existing.easySalesProductId,
    easySalesSku: existing.easySalesSku,
    stockSyncedAt: existing.stockSyncedAt,
    catalogSource: existing.catalogSource || "manual",
    landingPromo: existing.landingPromo,
    cartBundlePromos: existing.cartBundlePromos,
    specsText: existing.specsText?.trim() ? existing.specsText : incoming.specsText,
    wcAttributes: incoming.wcAttributes?.length ? incoming.wcAttributes : existing.wcAttributes,
    category: shouldReplaceImportedCategory(
      existing.category,
      incoming.category,
      (incoming.wcCategories ?? []).map((c) => c.slug),
    )
      ? incoming.category || existing.category
      : existing.category,
    seoTitle: existing.seoTitle,
    seoDescription: existing.seoDescription,
    ogTitle: existing.ogTitle,
    ogDescription: existing.ogDescription,
    socialImage: existing.socialImage,
    imageAlt: existing.imageAlt,
    noindex: existing.noindex,
  };
}

export function productLocaleFieldsFromImport(product: TrendyolJsonProduct): ProductLocaleFields {
  const fields: ProductLocaleFields = {};
  if (product.name?.trim()) fields.name = product.name.trim();
  if (product.slug?.trim()) fields.slug = product.slug.trim();
  if (product.wcShortDescriptionHtml?.trim()) fields.shortDescriptionHtml = product.wcShortDescriptionHtml.trim();
  if (product.wcDescriptionHtml?.trim()) fields.descriptionHtml = product.wcDescriptionHtml.trim();
  if (product.specsText?.trim()) fields.specsText = product.specsText.trim();
  if (product.seoTitle?.trim()) fields.seoTitle = product.seoTitle.trim();
  if (product.seoDescription?.trim()) fields.seoDescription = product.seoDescription.trim();
  if (product.ogTitle?.trim()) fields.ogTitle = product.ogTitle.trim();
  if (product.ogDescription?.trim()) fields.ogDescription = product.ogDescription.trim();
  if (product.imageAlt?.trim()) fields.imageAlt = product.imageAlt.trim();
  return fields;
}

/**
 * NL (default): tekstvelden bijwerken + translations.nl; andere talen in translations behouden.
 * Andere taal: nooit primaire NL-tekst overschrijven — alleen translations[locale].
 * Nieuw product in EN: alleen naam/sku/prijs/beeld in primary; teksten uitsluitend in translations.en.
 */
export function mergeImportedProductForLocale(
  incoming: TrendyolJsonProduct,
  existing: TrendyolJsonProduct | null,
  usedBySlug: Map<string, number>,
  locale: string,
): TrendyolJsonProduct {
  const localeFields = productLocaleFieldsFromImport(incoming);
  const existingTranslations = parseLocaleMap<ProductLocaleFields>(existing?.translations);

  if (isDefaultImportLocale(locale)) {
    const merged = mergeImportedProduct(incoming, existing, usedBySlug);
    const map = setLocaleFields(
      { ...existingTranslations, ...parseLocaleMap<ProductLocaleFields>(merged.translations) },
      DEFAULT_LOCALE,
      localeFields,
    );
    // Behoud EN (en andere) vertalingen bij NL-import
    for (const [code, fields] of Object.entries(existingTranslations)) {
      if (code === DEFAULT_LOCALE) continue;
      if (!map[code]) map[code] = fields;
      else map[code] = { ...fields, ...map[code] };
    }
    return { ...merged, translations: compactLocaleMap(map) };
  }

  if (!existing) {
    const created = mergeImportedProduct(incoming, null, usedBySlug);
    const map = setLocaleFields({}, locale, localeFields);
    return {
      ...created,
      // Geen vreemde taal in NL-kolommen — alleen korte naam zodat het product bestaat
      wcShortDescriptionHtml: undefined,
      wcDescriptionHtml: undefined,
      specsText: undefined,
      seoTitle: undefined,
      seoDescription: undefined,
      ogTitle: undefined,
      ogDescription: undefined,
      imageAlt: undefined,
      translations: compactLocaleMap(map, locale),
    };
  }

  const kept = mergeImportedProduct(
    {
      ...incoming,
      name: existing.name,
      wcShortDescriptionHtml: existing.wcShortDescriptionHtml,
      wcDescriptionHtml: existing.wcDescriptionHtml,
      specsText: existing.specsText,
      seoTitle: existing.seoTitle,
      seoDescription: existing.seoDescription,
      ogTitle: existing.ogTitle,
      ogDescription: existing.ogDescription,
      imageAlt: existing.imageAlt,
      slug: existing.slug,
      translations: existing.translations,
    },
    existing,
    usedBySlug,
  );
  const map = setLocaleFields(existingTranslations, locale, localeFields);
  return {
    ...kept,
    name: existing.name,
    wcShortDescriptionHtml: existing.wcShortDescriptionHtml,
    wcDescriptionHtml: existing.wcDescriptionHtml,
    specsText: existing.specsText,
    seoTitle: existing.seoTitle,
    seoDescription: existing.seoDescription,
    ogTitle: existing.ogTitle,
    ogDescription: existing.ogDescription,
    imageAlt: existing.imageAlt,
    slug: existing.slug,
    translations: compactLocaleMap(map),
  };
}

/** Simpele NL/EN-check op producttekst (voor herstel na verkeerde .com-import). */
export function textLooksDutch(text: string): boolean {
  const t = text.toLowerCase();
  if (!t.trim()) return false;
  const dutchHits = (
    t.match(
      /\b(de|het|een|van|voor|met|op|bij|naar|fiets|fietsen|schoenen|kleding|gratis|verzending|advies|maat|kleur|omschrijving|bekijk|bestel|onze|jouw|niet|zijn|wordt|worden)\b/g,
    ) || []
  ).length;
  const englishHits = (
    t.match(
      /\b(the|and|with|for|from|bike|bikes|shoes|shipping|free|your|this|that|description|view|order|size|color|colour|our|are|is|will)\b/g,
    ) || []
  ).length;
  return dutchHits > englishHits;
}

export type RepairPrimaryAsEnglishResult = {
  movedToEn: boolean;
  clearedPrimaryCopy: boolean;
  product: TrendyolJsonProduct;
};

/**
 * Herstel: Engelse teksten stonden per ongeluk in NL-primary.
 * → kopieer naar translations.en, wis lange NL-primary copy (naam blijft tot NL-herimport).
 */
export function repairProductPrimaryEnglishContamination(
  product: TrendyolJsonProduct,
): RepairPrimaryAsEnglishResult {
  const map = parseLocaleMap<ProductLocaleFields>(product.translations);
  const primary = productLocaleFieldsFromImport(product);
  const sample = [primary.name, primary.shortDescriptionHtml, primary.descriptionHtml, primary.specsText]
    .filter(Boolean)
    .join("\n");
  const enExisting = map.en;
  const hasEn = Boolean(
    enExisting &&
      [enExisting.name, enExisting.shortDescriptionHtml, enExisting.descriptionHtml]
        .some((v) => Boolean(v?.trim())),
  );

  // Alleen verplaatsen als primary Engels oogt en EN nog leeg is
  if (!sample.trim() || textLooksDutch(sample) || hasEn) {
    return { movedToEn: false, clearedPrimaryCopy: false, product };
  }

  const nextMap = setLocaleFields(map, "en", primary);
  return {
    movedToEn: true,
    clearedPrimaryCopy: true,
    product: {
      ...product,
      wcShortDescriptionHtml: undefined,
      wcDescriptionHtml: undefined,
      specsText: undefined,
      seoTitle: undefined,
      seoDescription: undefined,
      ogTitle: undefined,
      ogDescription: undefined,
      imageAlt: undefined,
      translations: compactLocaleMap(nextMap),
    },
  };
}

export function categoryLocaleFieldsFromWoo(name: string, description?: string | null): CategoryLocaleFields {
  const fields: CategoryLocaleFields = {};
  if (name.trim()) fields.name = name.trim();
  if (description?.trim()) fields.description = description.trim();
  return fields;
}

export function newsLocaleFieldsFromMapped(mapped: {
  title: string;
  slug: string;
  excerpt: string | null;
  bodyHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
}): NewsLocaleFields {
  const fields: NewsLocaleFields = {};
  if (mapped.title.trim()) fields.title = mapped.title.trim();
  if (mapped.slug.trim()) fields.slug = mapped.slug.trim();
  if (mapped.excerpt?.trim()) fields.excerpt = mapped.excerpt.trim();
  if (mapped.bodyHtml.trim()) fields.bodyHtml = mapped.bodyHtml.trim();
  if (mapped.seoTitle?.trim()) fields.seoTitle = mapped.seoTitle.trim();
  if (mapped.seoDescription?.trim()) fields.seoDescription = mapped.seoDescription.trim();
  return fields;
}

export function pageLocaleFieldsFromMapped(mapped: {
  title: string;
  heading: string | null;
  slug: string;
  path: string;
  bodyHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
}): PageLocaleFields {
  const fields: PageLocaleFields = {};
  if (mapped.title.trim()) fields.title = mapped.title.trim();
  if (mapped.heading?.trim()) fields.heading = mapped.heading.trim();
  if (mapped.slug.trim()) fields.slug = mapped.slug.trim();
  if (mapped.path.trim()) fields.path = mapped.path.trim();
  if (mapped.bodyHtml.trim()) fields.bodyHtml = mapped.bodyHtml.trim();
  if (mapped.metaTitle?.trim()) fields.metaTitle = mapped.metaTitle.trim();
  if (mapped.metaDescription?.trim()) fields.metaDescription = mapped.metaDescription.trim();
  return fields;
}

export function mapWpPostToNews(post: WpPost): MappedNewsPost {
  const title = decodeHtmlEntities(stripHtml(rendered(post.title) || post.slug));
  const slug = slugifyWp(post.slug || title);
  const excerpt = stripHtml(rendered(post.excerpt)).slice(0, 400) || null;
  const bodyHtml = rendered(post.content) || "";
  const cover =
    post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
    post.jetpack_featured_media_url ||
    post.yoast_head_json?.og_image?.[0]?.url ||
    null;
  const terms = post._embedded?.["wp:term"]?.flat() ?? [];
  const categoryRaw =
    terms.find((t) => t.taxonomy === "category")?.name ||
    terms[0]?.name ||
    "Nieuws";
  const category = normalizeNewsCategoryNl(categoryRaw);
  const publishedAt = post.date_gmt || post.date ? new Date(post.date_gmt || post.date || "") : null;
  return {
    slug,
    title,
    excerpt,
    bodyHtml,
    coverImage: cover,
    category,
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    sourceUrl: post.link || null,
    seoTitle: post.yoast_head_json?.title?.trim() || null,
    seoDescription: post.yoast_head_json?.description?.trim() || null,
  };
}

export function mapWpPageToSitePage(page: WpPage): MappedSitePage | null {
  const slug = slugifyWp(page.slug || rendered(page.title));
  if (!slug || WORDPRESS_PROTECTED_PAGE_SLUGS.has(slug)) return null;
  const title = decodeHtmlEntities(stripHtml(rendered(page.title) || slug));
  return {
    slug,
    path: `/${slug}`,
    title,
    heading: title,
    bodyHtml: rendered(page.content) || "",
    metaTitle: page.yoast_head_json?.title?.trim() || null,
    metaDescription: page.yoast_head_json?.description?.trim() || stripHtml(rendered(page.excerpt)).slice(0, 160) || null,
    socialImage: page._embedded?.["wp:featuredmedia"]?.[0]?.source_url || page.yoast_head_json?.og_image?.[0]?.url || null,
  };
}

/** Lokale nieuwsberichten zonder WP-bron niet overschrijven. */
export function shouldUpdateImportedNews(existing: {
  sourceUrl: string | null;
} | null): boolean {
  if (!existing) return true;
  const url = existing.sourceUrl?.trim() || "";
  return url.includes("bergasports.com") || url.includes("/wp/") || url.includes("wordpress");
}

export function wooCustomerDisplayName(customer: WooCommerceCustomer): string {
  const fromNames = `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  if (fromNames) return fromNames;
  const billing = `${customer.billing?.first_name || ""} ${customer.billing?.last_name || ""}`.trim();
  if (billing) return billing;
  return customer.email;
}

export function wooCustomerPhone(customer: WooCommerceCustomer): string | null {
  return customer.billing?.phone?.trim() || null;
}

export function wooCustomerAddress(customer: WooCommerceCustomer): {
  label: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  isDefault: boolean;
} | null {
  const b = customer.billing;
  const line1 = b?.address_1?.trim() || "";
  const city = b?.city?.trim() || "";
  const postalCode = b?.postcode?.trim() || "";
  if (!line1 || !city || !postalCode) return null;
  return {
    label: "Factuuradres",
    line1,
    line2: b?.address_2?.trim() || null,
    postalCode,
    city,
    country: (b?.country?.trim() || "NL").toUpperCase(),
    isDefault: true,
  };
}

export function parseImportTypes(raw: unknown): WordpressImportType[] {
  if (!Array.isArray(raw)) return [...WORDPRESS_IMPORT_TYPES];
  const allowed = new Set<string>(WORDPRESS_IMPORT_TYPES);
  const picked = raw.filter((item): item is WordpressImportType => typeof item === "string" && allowed.has(item));
  if (raw.length > 0 && picked.length === 0) {
    throw new Error(`Onbekend import-type. Kies: ${WORDPRESS_IMPORT_TYPES.join(", ")}`);
  }
  return picked.length ? picked : [...WORDPRESS_IMPORT_TYPES];
}
