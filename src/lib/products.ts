import { productSlugLookupCandidates, resolveProductSlug } from "@/lib/product-slug";
import type { LocaleMap, ProductLocaleFields } from "@/lib/i18n/translations";
import { overlayTranslation, parseLocaleMap, pickTranslation } from "@/lib/i18n/translations";

export const CATALOG_SOURCES = ["trendyol", "ralex", "manual"] as const;
export type CatalogSource = (typeof CATALOG_SOURCES)[number];

export function normalizeCatalogSource(value: string | undefined | null): CatalogSource {
  if (value === "ralex" || value === "manual") {
    return value;
  }
  return "trendyol";
}

export type LandingPromo = {
  oldPrice: number;
  price: number;
  phone?: string;
  phoneHours?: string;
};

export type CartBundleBadgeTone = "pink" | "purple" | "gradient";

export type CartBundleTier = {
  id: string;
  title: string;
  listSubtotal: number;
  price: number;
  badge: { text: string; tone: CartBundleBadgeTone };
  defaultSelected?: boolean;
};

export type CartBundlePromos = {
  tiers: CartBundleTier[];
};

/** Woo variatie (afmeting etc.) met eigen prijs — uit Store API `type=variation&parent=`. */
export type WcVariationJson = {
  id: number;
  label: string;
  price: number;
  regularPrice: number;
  onSale: boolean;
  sku?: string;
  url: string;
  image?: string;
};

export type WcProductAttributeJson = {
  id: number;
  name: string;
  slug?: string;
  visible: boolean;
  variation: boolean;
  options: string[];
};

export type TrendyolJsonProduct = {
  id: number;
  name: string;
  brand?: string;
  brandId?: number;
  category?: string;
  url: string;
  image: string;
  images?: string[];
  currency?: string;
  priceCurrent?: number;
  priceCurrentText?: string;
  priceDiscounted?: number;
  priceDiscountedText?: string;
  priceOld?: number;
  discount?: number | { discountName?: string };
  freeCargo?: boolean;
  sameDayShipping?: boolean;
  hasFastDeliveryTag?: boolean;
  hasFlashSaleTag?: boolean;
  promotions?: unknown;
  badges?: unknown;
  socialProof?: string | unknown[];
  merchantId?: number;
  landingPromo?: LandingPromo;
  cartBundlePromos?: CartBundlePromos;
  /** trendyol | ralex | manual — ontbreekt in JSON wordt als trendyol gelezen. */
  catalogSource?: string;
  /** Toon op homepage onder „Produse populare”. */
  featuredOnHomepage?: boolean;
  /** concept = alleen admin, niet op shop / sitemap / zoeken */
  productStatus?: "published" | "concept";
  imageBroken?: boolean;
  /** false = afisat ca epuizat in magazin (fallback when stockQuantity is unset) */
  inStock?: boolean;
  /** Total units in Easy Sales / warehouse (admin). */
  stockQuantity?: number;
  reservedStock?: number;
  /** Easy Sales internal product id — required to push stock updates. */
  easySalesProductId?: number;
  easySalesSku?: string;
  stockSyncedAt?: string;
  /** Canonical SEO slug (from title); used in /product/{slug}. */
  slug?: string;
  /** WooCommerce Store API (Ralex) — HTML, getoond op productpagina. */
  wcShortDescriptionHtml?: string;
  wcDescriptionHtml?: string;
  wcSku?: string;
  wcSlug?: string;
  wcProductType?: string;
  wcAverageRating?: string;
  wcReviewCount?: number;
  wcPriceHtml?: string;
  wcCategories?: { id: number; name: string; slug: string }[];
  wcAttributes?: WcProductAttributeJson[];
  wcVariations?: WcVariationJson[];
  priceRangeMax?: number;
  /** Extra specificaties (Label: waarde, één per regel). */
  specsText?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  socialImage?: string;
  imageAlt?: string;
  noindex?: boolean;
  translations?: LocaleMap<ProductLocaleFields>;
  /** WPML Woo ids per locale, bijv. { nl: 11867, en: 11863 }. */
  wpmlTranslations?: Record<string, number>;
};

type TrendyolRawProduct = TrendyolJsonProduct;

import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";

/**
 * Product title structure (storefront + import):
 *   `{Brand} {Model} – {Type/Descriptor} – {Color/Size/Variant}`
 *
 * Shared rules (NL + EN):
 * - Drop trailing `| category` / `| Bergasports` SEO tags
 * - Segment separator is always en-dash ` – ` (spaced `-` / emdash normalize to this)
 * - Brand + model stay in the lead segment (no `Brand – Model` when the 2nd segment is a model line)
 * - Color pairs use `Color/Color` (no spaces around `/`)
 * - No double spaces; each segment starts with a capital; shouting ALL-CAPS is softened
 * - Locale word swaps run after structure (NL may Dutchify leftover EN; EN never Dutchifies)
 */
export function decodeImportedProductTitle(text: string, locale: string = DEFAULT_LOCALE): string {
  try {
    let s = String(text ?? "");
    while (s.includes("&amp;")) {
      s = s.replace(/&amp;/g, "&");
    }
    if (s.includes("&")) {
      s = s
        .replace(/&#x([0-9a-fA-F]+);/gi, (full, hex: string) => {
          const cp = Number.parseInt(hex, 16);
          return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
        })
        .replace(/&#(\d+);/g, (full, dec: string) => {
          const cp = Number.parseInt(dec, 10);
          return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
        })
        .replace(/&nbsp;/gi, " ")
        .replace(/&ndash;/gi, "\u2013")
        .replace(/&mdash;/gi, "\u2014")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    if (locale === "en") return normalizeProductTitleEn(s);
    return normalizeProductTitleNl(s);
  } catch {
    return String(text ?? "").trim();
  }
}

const PRODUCT_TITLE_COLOR_NL: Record<string, string> = {
  blue: "Blauw",
  yellow: "Geel",
  white: "Wit",
  black: "Zwart",
  red: "Rood",
  green: "Groen",
  orange: "Oranje",
  purple: "Paars",
  pink: "Roze",
  gold: "Goud",
  silver: "Zilver",
  grey: "Grijs",
  gray: "Grijs",
};

/** Multi-word brands first (longest match wins). */
const PRODUCT_TITLE_BRANDS = [
  "Cycling Ceramic",
  "Double FF",
  "Ride 100%",
  "100%",
  "Assioma",
  "Campagnolo",
  "Cipollini",
  "Colnago",
  "DMT",
  "Fulcrum",
  "Kask",
  "LaFuga",
  "LGO",
  "MPC",
  "Nimbl",
  "Orbea",
  "Polygon",
  "Scope",
  "Sensa",
  "Shokz",
  "Wahoo",
] as const;

/** 2nd en-dash segment looks like a product type → do not merge into brand+model. */
const PRODUCT_TITLE_TYPE_SEGMENT =
  /^(cycling|fiets|fietsschoenen|wielrenschoenen|gravel|racefiets|road\b|mtb|mountain|inline|skeeler|carbon\s+wheel|wheel|wiel|helmet|helm|jersey|shirt|jack|jacket|bib|frames?|frame|powermeter|pedalen|glasses|bril|shoes|schoenen|oordopjes|fietscomputer|race\s*bike|road\s*bike|gravel\s*bike|full\s*suspension|hardtail)/i;

const PRODUCT_TITLE_ACRONYMS: Record<string, string> = {
  di2: "Di2",
  gps: "GPS",
  grx: "GRX",
  sram: "SRAM",
  mtb: "MTB",
  xl: "XL",
  xs: "XS",
  sl: "SL",
  ss: "SS",
  gs: "GS",
  wto: "WTO",
  nx: "NX",
  xt: "XT",
  axs: "AXS",
  etap: "eTap",
  odc: "ODC",
  hiper: "HiPER",
  ff: "FF",
  nk1k: "NK1K",
  dmt: "DMT",
  mpc: "MPC",
  lgo: "LGO",
  roam: "ROAM",
  elemnt: "ELEMNT",
  km0: "KM0",
  gx: "GX",
  duo: "Duo",
  pro: "Pro",
  aero: "Aero",
};

function capitalizeTitleSegmentStart(segment: string): string {
  if (!segment) return segment;
  return segment.replace(/^(\s*)(\S)/, (_full, lead: string, ch: string) => lead + ch.toUpperCase());
}

function softTitleCaseSegment(segment: string): string {
  const letters = segment.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (letters.length < 4) return capitalizeTitleSegmentStart(segment);
  const upper = (segment.match(/[A-ZÀ-Ý]/g) || []).length;
  const lower = (segment.match(/[a-zà-ÿ]/g) || []).length;
  const shouting = upper >= 4 && upper > lower * 2;
  if (!shouting) return capitalizeTitleSegmentStart(segment);
  return segment.replace(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9']*/g, (word) => {
    const key = word.toLowerCase();
    if (PRODUCT_TITLE_ACRONYMS[key]) return PRODUCT_TITLE_ACRONYMS[key];
    if (/^[A-Z0-9]{2,4}$/.test(word) && /\d/.test(word)) return word.toUpperCase();
    if (word.length <= 2) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

function matchTitleBrand(lead: string): string | null {
  const lower = lead.trim().toLowerCase();
  for (const brand of PRODUCT_TITLE_BRANDS) {
    if (lower === brand.toLowerCase()) return brand;
  }
  return null;
}

const PRODUCT_TITLE_COLOR_WORDS = new Set(
  [...Object.keys(PRODUCT_TITLE_COLOR_NL), ...Object.values(PRODUCT_TITLE_COLOR_NL)].map((w) =>
    w.toLowerCase(),
  ),
);

function titleCaseColorToken(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function isColorTitleSegment(segment: string): boolean {
  const t = segment.trim().toLowerCase();
  if (PRODUCT_TITLE_COLOR_WORDS.has(t)) return true;
  const parts = t.split("/");
  return parts.length === 2 && parts.every((p) => PRODUCT_TITLE_COLOR_WORDS.has(p));
}

function normalizeSlashColorPair(segment: string): string {
  return segment.replace(/\b([a-zà-ÿ]+)\/([a-zà-ÿ]+)\b/gi, (full, a: string, b: string) => {
    if (
      !PRODUCT_TITLE_COLOR_WORDS.has(a.toLowerCase()) ||
      !PRODUCT_TITLE_COLOR_WORDS.has(b.toLowerCase())
    ) {
      return full;
    }
    return `${titleCaseColorToken(a)}/${titleCaseColorToken(b)}`;
  });
}

/**
 * Shared structural conversion toward:
 * `{Brand} {Model} – {Type/Descriptor} – {Color/Size/Variant}`
 */
export function normalizeProductTitleStructure(raw: string): string {
  try {
    let s = String(raw || "").trim();
    if (!s) return s;

    // SEO / category pipe suffix
    s = s.replace(/\s*\|[^|]*$/g, "").trim();
    s = s.replace(/[.\u2026]+$/g, "").trim();

    // Known typos / glue words
    s = s.replace(/\bRid\s+100%/gi, "Ride 100%");
    s = s.replace(/\bCyclingshoes\b/gi, "Cycling shoes");
    s = s.replace(/\bCycling\s*shoes?\b/gi, "Cycling shoes");
    s = s.replace(/\bWheel\s*sets?\b/gi, "Wheelset");
    s = s.replace(/\bWiel\s*sets?\b/gi, "Wielset");
    s = s.replace(/\bHiper\b/gi, "HiPER");

    // Separators → en-dash (keep hyphens inside tokens like X-Firm, Entry-Level)
    s = s.replace(/\s*[–—―]\s*/g, " – ");
    s = s.replace(/\s+-\s+/g, " – ");

    let segments = s
      .split(" – ")
      .map((part) => part.trim())
      .filter(Boolean);

    if (segments.length >= 2) {
      const brand = matchTitleBrand(segments[0]!);
      if (brand && !PRODUCT_TITLE_TYPE_SEGMENT.test(segments[1]!)) {
        segments = [`${brand} ${segments[1]}`, ...segments.slice(2)];
      }
    }

    // Adjacent colour-only segments → Color/Color
    const colorMerged: string[] = [];
    for (const part of segments) {
      const prev = colorMerged[colorMerged.length - 1];
      if (
        prev &&
        isColorTitleSegment(prev) &&
        !prev.includes("/") &&
        isColorTitleSegment(part) &&
        !part.includes("/")
      ) {
        colorMerged[colorMerged.length - 1] = `${prev}/${part}`;
      } else {
        colorMerged.push(part);
      }
    }
    segments = colorMerged;

    segments = segments.map((part) => {
      let p = part.replace(/\s*\/\s*/g, "/");
      p = normalizeSlashColorPair(p);
      p = softTitleCaseSegment(p);
      p = normalizeSlashColorPair(p);
      return p.trim();
    });

    s = segments.join(" – ");
    s = normalizeSlashColorPair(s);
    s = s.replace(/\bHiper\b/gi, "HiPER");
    s = s.replace(/\s{2,}/g, " ").trim();
    return s;
  } catch {
    return String(raw || "").trim();
  }
}

function finalizeProductTitleSpacing(raw: string): string {
  return String(raw || "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([–,])/g, " $1")
    .replace(/([–,])\s+/g, "$1 ")
    .trim();
}

/** Lichte opschoning voor Engelse titels — geen NL-vertaling van kleuren/and. */
export function normalizeProductTitleEn(raw: string): string {
  let s = normalizeProductTitleStructure(raw);
  if (!s) return s;
  s = s.replace(/\b(\d+)\s*CM\b/gi, "$1 cm");
  s = s.replace(/\bGrx\b/g, "GRX");
  s = s.replace(/\bSram\b/g, "SRAM");
  s = s.replace(/\bFulcrum lite\b/gi, "Fulcrum Lite");
  return finalizeProductTitleSpacing(s);
}

/**
 * Engelse importresten in producttitels opschonen voor de NL-shop.
 * Merknamen en officiële productcodes blijven staan.
 */
export function normalizeProductTitleNl(raw: string): string {
  let s = normalizeProductTitleStructure(raw);
  if (!s) return s;

  // Maten: "52 CM and 54 cm" → "52 en 54 cm"
  s = s.replace(/\b(\d+)\s*CM\b/gi, "$1 cm");
  s = s.replace(/\b(\d+)\s*cm\s+and\s+(\d+)\s*cm\b/gi, "$1 en $2 cm");
  s = s.replace(/\b(\d+)\s+and\s+(\d+)\s*cm\b/gi, "$1 en $2 cm");

  // Groepsets / componenten
  s = s.replace(/\bGrx\b/g, "GRX");
  s = s.replace(/\bSram\b/g, "SRAM");
  s = s.replace(/\bFulcrum lite\b/gi, "Fulcrum Lite");

  // Categorie-termen
  s = s.replace(/\bCycling shoes?\b/gi, "Wielrenschoenen");
  s = s.replace(/\bGravel shoes?\b/gi, "Gravelwielrenschoenen");
  s = s.replace(/\bRace bikes?\b/gi, "Racefiets");
  s = s.replace(/\bRoad bikes?\b/gi, "Racefiets");
  s = s.replace(/\bMountain bikes?\b/gi, "Mountainbike");
  s = s.replace(/\bBib shorts?\b/gi, "Fietsbroek met bretels");

  // Kleuren: slash-paar of segment na scheidingsteken (geen losse "Black Magic")
  s = s.replace(/\b([A-Za-zÀ-ÿ]+)\/([A-Za-zÀ-ÿ]+)\b/g, (full, a: string, b: string) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const aNl = PRODUCT_TITLE_COLOR_NL[al];
    const bNl = PRODUCT_TITLE_COLOR_NL[bl];
    const aOk = aNl || PRODUCT_TITLE_COLOR_WORDS.has(al);
    const bOk = bNl || PRODUCT_TITLE_COLOR_WORDS.has(bl);
    if (!aOk || !bOk) return full;
    const aOut = aNl ?? a.charAt(0).toUpperCase() + a.slice(1).toLowerCase();
    const bOut = bNl ?? b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
    return `${aOut}/${bOut}`;
  });
  const colorWord = Object.keys(PRODUCT_TITLE_COLOR_NL).join("|");
  s = s.replace(
    new RegExp(`\\b(${colorWord})\\s+(?:and|en)\\s+(${colorWord})\\b`, "gi"),
    (_full, a: string, b: string) =>
      `${PRODUCT_TITLE_COLOR_NL[a.toLowerCase()]}/${PRODUCT_TITLE_COLOR_NL[b.toLowerCase()]}`,
  );
  s = s.replace(
    new RegExp(`([–|,]\\s*)(${colorWord})\\b`, "gi"),
    (_full, sep: string, word: string) => `${sep}${PRODUCT_TITLE_COLOR_NL[word.toLowerCase()]}`,
  );

  // Overige "and" → "en" (maten/lijsten)
  s = s.replace(/\band\b/gi, "en");

  return finalizeProductTitleSpacing(s);
}

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: string;
  brand?: string;
  brandId?: number;
  price: number;
  oldPrice?: number;
  currency: string;
  image: string;
  images: string[];
  externalUrl: string;
  discount?: number;
  freeCargo?: boolean;
  sameDayShipping?: boolean;
  hasFastDeliveryTag?: boolean;
  hasFlashSaleTag?: boolean;
  socialProof?: string;
  tag?: string;
  landingPromo?: LandingPromo;
  cartBundlePromos?: CartBundlePromos;
  catalogSource: CatalogSource;
  productStatus?: "published" | "concept";
  inStock?: boolean;
  stockQuantity?: number;
  reservedStock?: number;
  easySalesProductId?: number;
  easySalesSku?: string;
  stockSyncedAt?: string;
  wcShortDescriptionHtml?: string;
  wcDescriptionHtml?: string;
  wcSku?: string;
  wcSlug?: string;
  wcProductType?: string;
  wcAverageRating?: string;
  wcReviewCount?: number;
  wcPriceHtml?: string;
  wcCategories?: { id: number; name: string; slug: string }[];
  wcAttributes?: WcProductAttributeJson[];
  wcVariations?: WcVariationJson[];
  priceRangeMax?: number;
  specsText?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  socialImage?: string;
  imageAlt?: string;
  noindex?: boolean;
  featuredOnHomepage?: boolean;
  translations?: LocaleMap<ProductLocaleFields>;
};

function wcLayerFromRaw(p: TrendyolJsonProduct): Partial<Product> {
  const out: Partial<Product> = {};
  if (p.wcShortDescriptionHtml) {
    out.wcShortDescriptionHtml = p.wcShortDescriptionHtml;
  }
  if (p.wcDescriptionHtml) {
    out.wcDescriptionHtml = p.wcDescriptionHtml;
  }
  if (p.wcSku) {
    out.wcSku = p.wcSku;
  }
  if (p.wcSlug) {
    out.wcSlug = p.wcSlug;
  }
  if (p.wcProductType) {
    out.wcProductType = p.wcProductType;
  }
  if (p.wcAverageRating !== undefined && p.wcAverageRating !== "") {
    out.wcAverageRating = String(p.wcAverageRating);
  }
  if (typeof p.wcReviewCount === "number") {
    out.wcReviewCount = p.wcReviewCount;
  }
  if (p.wcPriceHtml) {
    out.wcPriceHtml = p.wcPriceHtml;
  }
  if (p.wcCategories?.length) {
    out.wcCategories = p.wcCategories;
  }
  if (p.wcAttributes?.length) {
    out.wcAttributes = p.wcAttributes;
  }
  if (p.wcVariations?.length) {
    out.wcVariations = p.wcVariations;
  }
  if (typeof p.priceRangeMax === "number") {
    out.priceRangeMax = p.priceRangeMax;
  }
  if (p.specsText) out.specsText = p.specsText;
  if (p.seoTitle) out.seoTitle = p.seoTitle;
  if (p.seoDescription) out.seoDescription = p.seoDescription;
  if (p.ogTitle) out.ogTitle = p.ogTitle;
  if (p.ogDescription) out.ogDescription = p.ogDescription;
  if (p.socialImage) out.socialImage = p.socialImage;
  if (p.imageAlt) out.imageAlt = p.imageAlt;
  if (p.noindex) out.noindex = true;
  return out;
}

function variationPriceOverlay(product: TrendyolRawProduct): Partial<Product> {
  const v = product.wcVariations;
  if (!v?.length) {
    return {};
  }
  const prices = v.map((x) => x.price);
  return {
    price: Math.min(...prices),
    priceRangeMax: Math.max(...prices),
    oldPrice: undefined,
    discount: undefined,
    tag: undefined,
  };
}

import { isProductInStock } from "@/lib/stock";

export { isProductInStock, productAvailableStock, hasStockQuantity } from "@/lib/stock";

export function mapTrendyolJsonToProduct(product: TrendyolJsonProduct): Product {
  const currentPrice = typeof product.priceCurrent === "number" ? product.priceCurrent : 0;
  const rawDiscounted =
    typeof product.priceDiscounted === "number" ? product.priceDiscounted : undefined;
  // Woo zet priceDiscounted vaak gelijk aan de normale prijs → géén echte sale.
  const discountedPrice =
    rawDiscounted != null && Number.isFinite(rawDiscounted) && rawDiscounted < currentPrice - 0.005
      ? rawDiscounted
      : undefined;
  const oldPrice = typeof product.priceOld === "number" && product.priceOld > 0 ? product.priceOld : undefined;
  const effectiveOld =
    oldPrice && oldPrice > (discountedPrice ?? currentPrice) + 0.005
      ? oldPrice
      : discountedPrice != null && currentPrice > discountedPrice + 0.005
        ? currentPrice
        : undefined;
  const onSale = Boolean(discountedPrice != null && effectiveOld != null);

  return {
    id: product.id,
    slug: resolveProductSlug(product),
    name: product.name,
    category: product.category || "Bergasports",
    brand: product.brand,
    brandId: typeof product.brandId === "number" && product.brandId > 0 ? product.brandId : undefined,
    price: discountedPrice ?? currentPrice,
    oldPrice: onSale ? effectiveOld : undefined,
    currency: product.currency || "EUR",
    image: product.image,
    images: product.images && product.images.length > 0 ? product.images : [product.image],
    externalUrl: product.url,
    discount: typeof product.discount === "number" ? product.discount : undefined,
    freeCargo: product.freeCargo,
    sameDayShipping: product.sameDayShipping,
    hasFastDeliveryTag: product.hasFastDeliveryTag,
    hasFlashSaleTag: product.hasFlashSaleTag,
    socialProof: typeof product.socialProof === "string" ? product.socialProof : undefined,
    tag: onSale ? "Aanbieding" : undefined,
    landingPromo: product.landingPromo,
    cartBundlePromos: product.cartBundlePromos,
    catalogSource: normalizeCatalogSource(product.catalogSource),
    productStatus: product.productStatus === "concept" ? "concept" : "published",
    inStock: isProductInStock(product),
    stockQuantity: product.stockQuantity,
    reservedStock: product.reservedStock,
    easySalesProductId: product.easySalesProductId,
    stockSyncedAt: product.stockSyncedAt,
    featuredOnHomepage: Boolean(product.featuredOnHomepage),
    translations: parseLocaleMap<ProductLocaleFields>(product.translations),
    ...wcLayerFromRaw(product),
    ...variationPriceOverlay(product),
  };
}

export function hydrateProductTranslations(product: TrendyolJsonProduct): LocaleMap<ProductLocaleFields> {
  const existing = parseLocaleMap<ProductLocaleFields>(product.translations);
  const fromColumns: ProductLocaleFields = {
    name: product.name ?? "",
    slug: product.slug ?? "",
    shortDescriptionHtml: product.wcShortDescriptionHtml ?? "",
    descriptionHtml: product.wcDescriptionHtml ?? "",
    specsText: product.specsText ?? "",
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    ogTitle: product.ogTitle ?? "",
    ogDescription: product.ogDescription ?? "",
    imageAlt: product.imageAlt ?? "",
  };
  // Primary-kolommen = NL. Als daar nog Engelse restanten staan die al in en zitten, niet als NL presenteren.
  const en = existing.en;
  const nlBase: ProductLocaleFields = { ...fromColumns };
  if (en) {
    for (const key of Object.keys(nlBase) as (keyof ProductLocaleFields)[]) {
      const primaryVal = (nlBase[key] ?? "").trim();
      const enVal = (en[key] ?? "").trim();
      if (primaryVal && enVal && primaryVal === enVal) {
        nlBase[key] = "";
      }
    }
  }
  return { ...existing, nl: { ...nlBase, ...existing.nl } };
}

export function productMatchesSlug(
  product: Pick<TrendyolJsonProduct, "slug" | "wcSlug" | "name" | "id" | "translations">,
  slug: string,
): boolean {
  const wanted = slug.trim().toLowerCase();
  if (!wanted) return false;
  const needles = new Set(productSlugLookupCandidates(wanted));
  const hit = (value?: string | null): boolean => {
    if (!value?.trim()) return false;
    return productSlugLookupCandidates(value).some((candidate) => needles.has(candidate));
  };
  if (hit(product.slug) || hit(product.wcSlug) || hit(resolveProductSlug(product))) return true;
  const map = parseLocaleMap<ProductLocaleFields>(product.translations);
  return Object.values(map).some((fields) => hit(fields.slug));
}

export function localizeProduct(product: Product, locale: string): Product {
  /* Non-default locales: only apply that locale’s overlay — never fall back to NL
   * copy (that would keep Dutch body/titles on EN when translations.en is missing). */
  const overlay =
    locale === DEFAULT_LOCALE
      ? pickTranslation(product.translations, locale)
      : pickTranslation(product.translations, locale, locale);
  if (!overlay) {
    return {
      ...product,
      name: decodeImportedProductTitle(product.name, locale),
      tag:
        product.tag === "Aanbieding" || product.tag === "Sale"
          ? locale === "en"
            ? "Sale"
            : "Aanbieding"
          : product.tag,
    };
  }
  const merged = overlayTranslation(
    {
      name: product.name,
      slug: product.slug,
      shortDescriptionHtml: product.wcShortDescriptionHtml ?? "",
      descriptionHtml: product.wcDescriptionHtml ?? "",
      specsText: product.specsText ?? "",
      seoTitle: product.seoTitle ?? "",
      seoDescription: product.seoDescription ?? "",
      ogTitle: product.ogTitle ?? "",
      ogDescription: product.ogDescription ?? "",
      imageAlt: product.imageAlt ?? "",
    },
    overlay,
  );
  return {
    ...product,
    name: decodeImportedProductTitle(merged.name || product.name, locale),
    slug: merged.slug?.trim() || product.slug,
    wcShortDescriptionHtml: merged.shortDescriptionHtml || product.wcShortDescriptionHtml,
    wcDescriptionHtml: merged.descriptionHtml || product.wcDescriptionHtml,
    specsText: merged.specsText || product.specsText,
    seoTitle: merged.seoTitle || product.seoTitle,
    seoDescription: merged.seoDescription || product.seoDescription,
    ogTitle: merged.ogTitle || product.ogTitle,
    ogDescription: merged.ogDescription || product.ogDescription,
    imageAlt: merged.imageAlt || product.imageAlt,
    tag:
      product.tag === "Aanbieding" || product.tag === "Sale"
        ? locale === "en"
          ? "Sale"
          : "Aanbieding"
        : product.tag,
  };
}

export function resolveBundleTierForAdd(
  product: Product,
  bundleTierId?: string,
): CartBundleTier | null {
  const tiers = product.cartBundlePromos?.tiers;
  if (!tiers?.length) {
    return null;
  }
  if (bundleTierId) {
    const match = tiers.find((t) => t.id === bundleTierId);
    if (match) {
      return match;
    }
  }
  return tiers.find((t) => t.defaultSelected) ?? tiers[1] ?? tiers[0] ?? null;
}

export function getBundleTierById(product: Product, tierId: string): CartBundleTier | null {
  return product.cartBundlePromos?.tiers.find((t) => t.id === tierId) ?? null;
}

/** Catalogusverkoopprijs: saleprijs als die gezet is, anders de huidige prijs. */
export function catalogSalePrice(
  product: Pick<TrendyolJsonProduct, "priceDiscounted" | "priceCurrent">,
): number {
  const discounted = typeof product.priceDiscounted === "number" ? product.priceDiscounted : undefined;
  const current = typeof product.priceCurrent === "number" ? product.priceCurrent : 0;
  const value = discounted ?? current;
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

export function catalogSku(
  product: Pick<TrendyolJsonProduct, "wcSku" | "easySalesSku">,
): string | null {
  const sku = product.wcSku?.trim() || product.easySalesSku?.trim() || "";
  return sku || null;
}

export const formatProductPrice = (value: number, currency: string) => {
  if (currency === "Lei") {
    return `${value.toFixed(2)} Lei`;
  }

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatProductPriceRange = (min: number, max: number, currency: string) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return formatProductPrice(min, currency);
  }
  if (Math.abs(min - max) < 0.005) {
    return formatProductPrice(min, currency);
  }
  if (currency === "Lei") {
    return `${min.toFixed(2)} – ${max.toFixed(2)} Lei`;
  }
  return `${formatProductPrice(min, currency)} – ${formatProductPrice(max, currency)}`;
};

/** Prijs op kaarten / productpagina: bij variaties laagste – hoogste tarief. */
export function formatProductCardPrice(product: Product) {
  const max = product.priceRangeMax;
  if (typeof max === "number" && max > product.price + 0.005) {
    return formatProductPriceRange(product.price, max, product.currency);
  }
  return formatProductPrice(product.price, product.currency);
}

