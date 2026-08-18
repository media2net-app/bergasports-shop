import "server-only";

import { formatRalexCategoryName, type RalexCategoriesFile } from "@/lib/ralex-categories";
import {
  clearRalexCategoryImportMarker,
  markRalexCategoryFullyImported,
  readRalexCategoriesFile,
} from "@/lib/ralex-categories-file";
import { applyRalexPriceMarkup, shouldApplyRalexPriceMarkup } from "@/lib/ralex-price-markup";
import type { TrendyolJsonProduct, WcVariationJson } from "@/lib/products";
import { extractBrandNameFromAttributes, preserveProductBrand } from "@/lib/brands-shared";
import { getProductRawById, upsertProductRaw } from "@/lib/trendyol-json-store";
import type { WcStoreProduct } from "@/lib/ralex-wc-store-api";
import {
  fetchAllWcStoreProductsForCategory,
  fetchWcStoreVariationsForParents,
} from "@/lib/ralex-wc-store-api";

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toMajorUnits(amount: string | undefined, minorUnit: number): number {
  if (!amount) {
    return 0;
  }
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return n / 10 ** minorUnit;
}

function wcStoreVariationToJson(v: WcStoreProduct): WcVariationJson {
  const minor = v.prices?.currency_minor_unit ?? 2;
  const display = toMajorUnits(v.prices?.price, minor);
  const regular = toMajorUnits(v.prices?.regular_price, minor);
  const onSale = Boolean(v.on_sale && regular > display && display >= 0);
  const label =
    typeof v.variation === "string" && v.variation.trim() ? v.variation.trim() : `Variatie #${v.id}`;
  const img = v.images?.[0]?.src?.trim();
  return {
    id: v.id,
    label,
    price: display,
    regularPrice: regular,
    onSale,
    sku: typeof v.sku === "string" && v.sku.trim() ? v.sku.trim() : undefined,
    url: v.permalink,
    image: img || undefined,
  };
}

export function wcStoreProductToTrendyolJson(
  p: WcStoreProduct,
  categoryLabel: string,
  variationRows?: WcStoreProduct[],
): TrendyolJsonProduct {
  const minor = p.prices?.currency_minor_unit ?? 2;
  const display = toMajorUnits(p.prices?.price, minor);
  const regular = toMajorUnits(p.prices?.regular_price, minor);
  const onSale = Boolean(p.on_sale && regular > display && display >= 0);
  const imgs = (p.images ?? []).map((i) => i.src).filter(Boolean);
  const primary = imgs[0] ?? "";

  let discount: number | { discountName?: string } | undefined;
  if (onSale && regular > 0) {
    discount = Math.min(99, Math.max(1, Math.round(((regular - display) / regular) * 100)));
  }

  const name = stripHtml(p.name) || `Product ${p.id}`;

  const shortHtml = typeof p.short_description === "string" ? p.short_description.trim() : "";
  const longHtml = typeof p.description === "string" ? p.description.trim() : "";
  const sku = typeof p.sku === "string" ? p.sku.trim() : "";
  const wcCategories =
    Array.isArray(p.categories) && p.categories.length > 0
      ? p.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
      : undefined;

  const currencyCode = p.prices?.currency_code?.trim() || "EUR";
  const currency =
    currencyCode === "EUR" ? "EUR" : currencyCode === "RON" ? "Lei" : currencyCode;

  const brand = extractBrandNameFromAttributes(
    p.attributes?.map((attr) => ({
      name: attr.name,
      slug: attr.taxonomy,
      terms: attr.terms,
    })),
  );

  const base: TrendyolJsonProduct = {
    id: p.id,
    name,
    brand,
    category: categoryLabel,
    url: p.permalink,
    image: primary,
    images: imgs.length > 0 ? imgs : [primary].filter(Boolean),
    currency,
    priceCurrent: onSale ? regular : display,
    priceCurrentText: (onSale ? regular : display).toFixed(2),
    priceDiscounted: display,
    priceDiscountedText: display.toFixed(2),
    priceOld: onSale ? regular : 0,
    discount,
    freeCargo: true,
    sameDayShipping: false,
    hasFastDeliveryTag: false,
    hasFlashSaleTag: false,
    promotions: [],
    badges: {},
    socialProof: [],
    catalogSource: shouldApplyRalexPriceMarkup() ? "ralex" : "manual",
  };

  if (variationRows && variationRows.length > 0) {
    const mapped = variationRows.map(wcStoreVariationToJson);
    const prices = mapped.map((x) => x.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    base.wcVariations = mapped;
    base.priceRangeMax = maxP;
    base.priceDiscounted = minP;
    base.priceDiscountedText = minP.toFixed(2);
    base.priceCurrent = minP;
    base.priceCurrentText = minP.toFixed(2);
    base.priceOld = 0;
    base.discount = undefined;
  }

  if (shortHtml) {
    base.wcShortDescriptionHtml = shortHtml;
  }
  if (longHtml) {
    base.wcDescriptionHtml = longHtml;
  }
  if (sku) {
    base.wcSku = sku;
  }
  if (p.slug) {
    base.wcSlug = p.slug;
  }
  if (p.type) {
    base.wcProductType = p.type;
  }
  if (p.average_rating !== undefined && String(p.average_rating).trim() !== "") {
    base.wcAverageRating = String(p.average_rating);
  }
  if (typeof p.review_count === "number") {
    base.wcReviewCount = p.review_count;
  }
  if (typeof p.price_html === "string" && p.price_html.trim()) {
    base.wcPriceHtml = p.price_html.trim();
  }
  if (wcCategories) {
    base.wcCategories = wcCategories;
  }

  return applyRalexPriceMarkup(base);
}

function resolveCategoryLabel(snapshot: RalexCategoriesFile, categoryId: number): string {
  const row = snapshot.categories.find((c) => c.id === categoryId);
  return row ? formatRalexCategoryName(row.name, row.slug) : `Categorie ${categoryId}`;
}

export async function importRalexProductsForCategory(categoryId: number): Promise<{
  imported: number;
  categoryLabel: string;
  pagesFetched: number;
  importComplete: boolean;
}> {
  const [snapshot, { products: remote, pagesFetched }] = await Promise.all([
    readRalexCategoriesFile(),
    fetchAllWcStoreProductsForCategory(categoryId),
  ]);
  const categoryLabel = resolveCategoryLabel(snapshot, categoryId);

  const variableParentIds = remote
    .filter((p) => p.type === "variable" && (p.variations?.length ?? 0) > 0)
    .map((p) => p.id);

  const variationsByParent =
    variableParentIds.length > 0
      ? await fetchWcStoreVariationsForParents(variableParentIds, { concurrency: 8, delayMs: 70 })
      : new Map<number, WcStoreProduct[]>();

  const mapped = remote.map((p) => {
    const rows = variationsByParent.get(p.id);
    return wcStoreProductToTrendyolJson(p, categoryLabel, rows);
  });

  for (const product of mapped) {
    const existing = product.brand?.trim() ? null : await getProductRawById(product.id);
    await upsertProductRaw(preserveProductBrand(product, existing));
  }

  const row = snapshot.categories.find((c) => c.id === categoryId);
  const expectedCount = row?.count ?? 0;
  const importedCount = remote.length;
  const importComplete =
    (expectedCount === 0 && importedCount === 0) ||
    (expectedCount > 0 && importedCount >= expectedCount);

  if (importComplete) {
    await markRalexCategoryFullyImported(categoryId, importedCount);
  } else {
    await clearRalexCategoryImportMarker(categoryId);
  }

  return { imported: remote.length, categoryLabel, pagesFetched, importComplete };
}
