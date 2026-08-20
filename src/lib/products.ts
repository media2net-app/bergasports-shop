import { resolveProductSlug } from "@/lib/product-slug";
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

/** Titels uit import-JSON (`&#8211;` etc.) leesbaar; NL-opschoning alleen voor NL. */
export function decodeImportedProductTitle(text: string, locale: string = DEFAULT_LOCALE): string {
  let s = text;
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

/** Lichte opschoning voor Engelse titels — geen NL-vertaling van kleuren/and. */
export function normalizeProductTitleEn(raw: string): string {
  let s = String(raw || "").trim();
  if (!s) return s;
  s = s.replace(/\s+-\s+/g, " – ");
  s = s.replace(/\b(\d+)\s*CM\b/gi, "$1 cm");
  s = s.replace(/\bGrx\b/g, "GRX");
  s = s.replace(/\bSram\b/g, "SRAM");
  s = s.replace(/\bFulcrum lite\b/gi, "Fulcrum Lite");
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([–|,])/g, " $1").replace(/([–|,])\s+/g, "$1 ").trim();
  return s;
}

/**
 * Engelse importresten in producttitels opschonen voor de NL-shop.
 * Merknamen en officiële productcodes blijven staan.
 */
export function normalizeProductTitleNl(raw: string): string {
  let s = String(raw || "").trim();
  if (!s) return s;

  // Scheidingstekens: " - " → en-dash
  s = s.replace(/\s+-\s+/g, " – ");

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

  // Kleuren: alleen als variantsegment (na scheidingsteken) of kleur/kleur-paar
  const colorWord = Object.keys(PRODUCT_TITLE_COLOR_NL).join("|");
  s = s.replace(
    new RegExp(`\\b(${colorWord})\\s*(?:\\/|and|en)\\s*(${colorWord})\\b`, "gi"),
    (_full, a: string, b: string) =>
      `${PRODUCT_TITLE_COLOR_NL[a.toLowerCase()]} / ${PRODUCT_TITLE_COLOR_NL[b.toLowerCase()]}`,
  );
  s = s.replace(
    new RegExp(`([–|,]\\s*)(${colorWord})\\s*$`, "i"),
    (_full, sep: string, word: string) => `${sep}${PRODUCT_TITLE_COLOR_NL[word.toLowerCase()]}`,
  );

  // Overige "and" → "en" (maten/lijsten)
  s = s.replace(/\band\b/gi, "en");

  // Spaties opruimen
  s = s.replace(/\s{2,}/g, " ").replace(/\s+([–|,])/g, " $1").replace(/([–|,])\s+/g, "$1 ").trim();
  return s;
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
  const discountedPrice =
    typeof product.priceDiscounted === "number" ? product.priceDiscounted : undefined;
  const currentPrice = typeof product.priceCurrent === "number" ? product.priceCurrent : 0;
  const oldPrice = typeof product.priceOld === "number" && product.priceOld > 0 ? product.priceOld : undefined;

  return {
    id: product.id,
    slug: resolveProductSlug(product),
    name: decodeImportedProductTitle(product.name),
    category: product.category || "Bergasports",
    brand: product.brand,
    brandId: typeof product.brandId === "number" && product.brandId > 0 ? product.brandId : undefined,
    price: discountedPrice ?? currentPrice,
    oldPrice: oldPrice && oldPrice > (discountedPrice ?? currentPrice) ? oldPrice : undefined,
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
    tag: discountedPrice ? "Aanbieding" : undefined,
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
  product: Pick<TrendyolJsonProduct, "slug" | "wcSlug" | "translations">,
  slug: string,
): boolean {
  const wanted = slug.trim().toLowerCase();
  if (!wanted) return false;
  if (product.slug?.trim().toLowerCase() === wanted) return true;
  if (product.wcSlug?.trim().toLowerCase() === wanted) return true;
  const map = parseLocaleMap<ProductLocaleFields>(product.translations);
  return Object.values(map).some((fields) => fields.slug?.trim().toLowerCase() === wanted);
}

export function localizeProduct(product: Product, locale: string): Product {
  const overlay = pickTranslation(product.translations, locale);
  if (!overlay) return product;
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

