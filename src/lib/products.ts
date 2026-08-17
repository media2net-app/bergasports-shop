import { resolveProductSlug } from "@/lib/product-slug";

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

export type TrendyolJsonProduct = {
  id: number;
  name: string;
  brand?: string;
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
};

type TrendyolRawProduct = TrendyolJsonProduct;

/** Titels uit import-JSON (`&#8211;` etc.) leesbaar in UI. */
export function decodeImportedProductTitle(text: string): string {
  let s = text;
  while (s.includes("&amp;")) {
    s = s.replace(/&amp;/g, "&");
  }
  if (!s.includes("&")) {
    return s;
  }
  return s
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

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: string;
  brand?: string;
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
  /** Admin: homepage „Produse populare”. */
  featuredOnHomepage?: boolean;
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
    ...wcLayerFromRaw(product),
    ...variationPriceOverlay(product),
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

