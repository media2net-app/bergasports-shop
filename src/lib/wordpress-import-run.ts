/**
 * WordPress/WooCommerce import persist (Prisma). Geen `server-only` / next/cache,
 * zodat het script dezelfde merge-regels gebruikt als de admin-API.
 */

import { randomBytes } from "node:crypto";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { hashAdminPassword } from "@/lib/admin-password-hash";
import { assignBrandOnProduct } from "@/lib/brands-write";
import { publicCategoryPath } from "@/lib/category-slugs";
import { normalizeCategoryShopLink } from "@/lib/category-shop-link";
import { productIdToBigInt } from "@/lib/prisma-mappers";
import type { TrendyolJsonProduct } from "@/lib/products";
import { seedStaticSeoRedirects, upsertSeoRedirects } from "@/lib/seo-redirects-persist";
import {
  WORDPRESS_PAGE_CANONICALS,
  wordpressSourcePaths,
  wpQueryRedirectSource,
} from "@/lib/seo-redirects-static";
import { formatRalexCategoryName } from "@/lib/ralex-categories";
import {
  applyGlobalAttributeTerms,
  decodeHtmlEntities,
  fetchWordpressJson,
  fetchWordpressPages,
  isSkippedWooCategorySlug,
  mapWcRestProductToJson,
  mapWpPageToSitePage,
  mapWpPostToNews,
  mergeImportedProduct,
  shouldReplaceImportedCategory,
  shouldUpdateImportedNews,
  sortWooCategoriesParentsFirst,
  stripHtml,
  wcV3Url,
  wooCategoryAliasSlugs,
  wooCustomerAddress,
  wooCustomerDisplayName,
  wooCustomerPhone,
  wpRestAuth,
  wpV2Url,
  type MappedSitePage,
  type WcRestAttribute,
  type WcRestAttributeTerm,
  type WcRestGlobalAttribute,
  type WcRestProduct,
  type WcRestProductCategory,
  type WcRestVariation,
  type WooCommerceCustomer,
  type WooCommerceOrder,
  type WordpressImportCredentials,
  type WordpressImportType,
  type WpPage,
  type WpPost,
} from "@/lib/wordpress-import-shared";

export type WordpressImportTypeResult = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  pages: number;
};

export type WordpressImportResult = {
  ok: boolean;
  dryRun: boolean;
  baseUrl: string;
  wooConfigured: boolean;
  types: WordpressImportType[];
  products?: WordpressImportTypeResult;
  categories?: WordpressImportTypeResult;
  attributes?: WordpressImportTypeResult;
  customers?: WordpressImportTypeResult;
  orders?: WordpressImportTypeResult;
  news?: WordpressImportTypeResult;
  pages?: WordpressImportTypeResult;
  redirects?: WordpressImportTypeResult;
  warnings: string[];
  errors: Partial<Record<WordpressImportType, string>>;
};

export type WordpressImportRunOptions = {
  types: WordpressImportType[];
  dryRun?: boolean;
  maxPages?: number;
  log?: (message: string) => void;
};

function emptyResult(): WordpressImportTypeResult {
  return { fetched: 0, created: 0, updated: 0, skipped: 0, pages: 0 };
}

function formatTypeCounts(row: WordpressImportTypeResult): string {
  return `${row.fetched} opgehaald, ${row.created} nieuw, ${row.updated} bijgewerkt, ${row.skipped} overgeslagen (${row.pages} pagina's)`;
}

function dutchTypeLabel(type: WordpressImportType): string {
  switch (type) {
    case "products":
      return "Producten";
    case "categories":
      return "Categorieën";
    case "attributes":
      return "Eigenschappen";
    case "customers":
      return "Klanten";
    case "orders":
      return "Orders";
    case "news":
      return "Nieuws";
    case "pages":
      return "Pagina's";
  }
}

function formatTypeError(type: WordpressImportType, error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const label = dutchTypeLabel(type);
  if (
    (type === "news" || type === "pages") &&
    (/invalid_username/i.test(raw) || /\b401\b/.test(raw))
  ) {
    return `${label} overgeslagen: WordPress REST weigerde de WooCommerce-sleutel als inlog. Nieuws/pagina's gaan via de publieke API (zonder ck_/cs_). Voor concepten: WP_APP_USER / WP_APP_PASSWORD. (${raw})`;
  }
  return `${label} overgeslagen: ${raw}`;
}

function logProgress(options: WordpressImportRunOptions, every: number, index: number, total: number, label: string) {
  const n = index + 1;
  if (n === 1 || n === total || n % every === 0) {
    options.log?.(`${label} ${n}/${total}…`);
  }
}

function addRedirectCounts(
  target: WordpressImportTypeResult,
  part: { created: number; updated: number; skipped: number },
) {
  target.created += part.created;
  target.updated += part.updated;
  target.skipped += part.skipped;
  target.fetched += part.created + part.updated + part.skipped;
}

function requireAuth(creds: WordpressImportCredentials, type: string): { key: string; secret: string } {
  if (!creds.auth?.key || !creds.auth.secret) {
    throw new Error(`WooCommerce REST-sleutels ontbreken voor ${type}-import.`);
  }
  return creds.auth;
}

async function fetchWcVariations(
  creds: WordpressImportCredentials,
  productId: number,
): Promise<WcRestVariation[]> {
  const auth = creds.auth;
  if (!auth) return [];
  const { items } = await fetchWordpressPages<WcRestVariation>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, `products/${productId}/variations`, { page, per_page: perPage }),
    auth,
    perPage: 100,
    maxPages: 5,
    label: `Woo variaties ${productId}`,
  });
  return items;
}

export async function upsertWooCommerceOrderRecord(
  prisma: PrismaClient,
  order: WooCommerceOrder,
): Promise<"created" | "updated" | "skipped"> {
  const orderNumber = `WC-${order.number || order.id}`;
  const total = Number.parseFloat(String(order.total ?? "0"));
  const discountTotal = Number.parseFloat(String(order.discount_total ?? "0"));
  const safeTotal = Number.isFinite(total) ? Math.round(total * 100) / 100 : 0;
  const safeDiscount = Number.isFinite(discountTotal) ? Math.round(discountTotal * 100) / 100 : 0;
  const subtotal = Math.round((safeTotal + safeDiscount) * 100) / 100;
  const currency = (order.currency || "EUR").toUpperCase();
  const createdAt = new Date(order.date_created_gmt || order.date_created || Date.now());
  const b = order.billing || {};
  const s = order.shipping || {};
  const customerName =
    `${b.first_name || ""} ${b.last_name || ""}`.trim() ||
    `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
    b.email?.trim() ||
    `WC #${order.number}`;
  const phone = b.phone?.trim() || b.email?.trim() || "—";
  const shippingAddress = s.address_1?.trim() || b.address_1?.trim() || "—";
  const shippingCity = s.city?.trim() || b.city?.trim() || "—";

  let status = "pending";
  switch (order.status) {
    case "pending":
    case "checkout-draft":
      status = "awaiting_payment";
      break;
    case "on-hold":
      status = "pending";
      break;
    case "processing":
      status = "processing";
      break;
    case "completed":
      status = "delivered";
      break;
    case "cancelled":
    case "refunded":
    case "failed":
      status = "cancelled";
      break;
    default:
      status = "pending";
  }

  const existing = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, molliePaymentId: true },
  });

  if (existing?.molliePaymentId) {
    return "skipped";
  }

  const itemCreates = (order.line_items || []).map((item) => {
    const lineTotal = Number.parseFloat(String(item.total ?? "0"));
    const qty = Math.max(1, item.quantity || 1);
    const unitPrice =
      item.price != null && Number.isFinite(item.price)
        ? Math.round(Number(item.price) * 100) / 100
        : Math.round(((Number.isFinite(lineTotal) ? lineTotal : 0) / qty) * 100) / 100;
    return {
      productId: item.product_id ? productIdToBigInt(item.product_id) : null,
      lineId: `wc-${item.id}`,
      name: item.name || `Product ${item.product_id}`,
      quantity: qty,
      unitPrice,
      lineTotal: Number.isFinite(lineTotal) ? Math.round(lineTotal * 100) / 100 : 0,
      currency,
      image: null,
      variationLabel: item.variation_id ? `var ${item.variation_id}` : null,
      bundleTierId: null,
    };
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
      await tx.order.update({
        where: { id: existing.id },
        data: {
          status,
          customerName,
          customerEmail: b.email?.trim() || null,
          customerPhone: phone,
          shippingAddress,
          shippingCity,
          shippingCounty: s.state?.trim() || b.state?.trim() || null,
          shippingPostalCode: s.postcode?.trim() || b.postcode?.trim() || null,
          notes: order.customer_note?.trim() || null,
          paymentMethod: order.payment_method_title || order.payment_method || "woocommerce",
          currency,
          subtotal,
          discountTotal: safeDiscount,
          total: safeTotal,
          items: { create: itemCreates },
        },
      });
    });
    return "updated";
  }

  await prisma.order.create({
    data: {
      orderNumber,
      status,
      customerName,
      customerEmail: b.email?.trim() || null,
      customerPhone: phone,
      shippingAddress,
      shippingCity,
      shippingCounty: s.state?.trim() || b.state?.trim() || null,
      shippingPostalCode: s.postcode?.trim() || b.postcode?.trim() || null,
      notes: order.customer_note?.trim() || null,
      paymentMethod: order.payment_method_title || order.payment_method || "woocommerce",
      currency,
      subtotal,
      discountTotal: safeDiscount,
      total: safeTotal,
      marketingConsent: false,
      createdAt,
      items: { create: itemCreates },
    },
  });
  return "created";
}

async function importProducts(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
  redirectCounts: WordpressImportTypeResult,
): Promise<WordpressImportTypeResult> {
  const auth = requireAuth(creds, "producten");
  const log = options.log;
  const maxPages = options.maxPages ?? 200;
  const { items, pages } = await fetchWordpressPages<WcRestProduct>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, "products", {
        page,
        per_page: perPage,
        status: "publish",
        orderby: "id",
        order: "asc",
      }),
    auth,
    perPage: 50,
    maxPages,
    label: "WooCommerce producten",
    log,
  });

  const result = emptyResult();
  result.fetched = items.length;
  result.pages = pages;
  log?.(`Producten opgehaald: ${items.length}`);

  const existingRows = await prisma.product.findMany({
    select: { id: true, data: true, slug: true },
  });
  const byId = new Map<number, TrendyolJsonProduct>();
  const bySku = new Map<string, TrendyolJsonProduct>();
  const usedBySlug = new Map<string, number>();
  const brandCache = new Map<
    string,
    { id: number; name: string; slug: string; logoUrl: string | null; visible: boolean; sortOrder: number }
  >();
  for (const row of existingRows) {
    const data = row.data as TrendyolJsonProduct;
    const id = Number(row.id);
    const product = { ...data, id, slug: row.slug ?? data.slug };
    byId.set(id, product);
    const sku = product.wcSku?.trim().toLowerCase();
    if (sku && !bySku.has(sku)) bySku.set(sku, product);
    if (product.slug) usedBySlug.set(product.slug, id);
  }

  for (const raw of items) {
    if (!raw?.id) {
      result.skipped += 1;
      continue;
    }
    let variations: WcRestVariation[] | undefined;
    if (raw.type === "variable") {
      variations = await fetchWcVariations(creds, raw.id);
    }
    const incoming = mapWcRestProductToJson(raw, variations);
    const skuKey = incoming.wcSku?.trim().toLowerCase();
    const existing = byId.get(incoming.id) ?? (skuKey ? bySku.get(skuKey) ?? null : null);
    const merged = mergeImportedProduct(incoming, existing, usedBySlug);
    const withBrand = await assignBrandOnProduct(prisma, merged, brandCache);

    if (options.dryRun) {
      if (existing) result.updated += 1;
      else result.created += 1;
      continue;
    }

    const featuredOnHomepage = Boolean(withBrand.featuredOnHomepage);
    const catalogSource = withBrand.catalogSource === "ralex" ? "ralex" : "manual";
    const data = { ...withBrand, featuredOnHomepage, catalogSource } as Prisma.InputJsonValue;
    await prisma.product.upsert({
      where: { id: productIdToBigInt(withBrand.id) },
      create: {
        id: productIdToBigInt(withBrand.id),
        data,
        slug: withBrand.slug ?? null,
        name: withBrand.name,
        brand: withBrand.brand ?? null,
        brandId: typeof withBrand.brandId === "number" ? withBrand.brandId : null,
        category: withBrand.category ?? null,
        catalogSource,
        priceCurrent: withBrand.priceCurrent ?? null,
        priceDiscounted: withBrand.priceDiscounted ?? null,
        currency: withBrand.currency ?? "EUR",
        image: withBrand.image || null,
        url: withBrand.url,
        featuredOnHomepage,
      },
      update: {
        data,
        slug: withBrand.slug ?? null,
        name: withBrand.name,
        brand: withBrand.brand ?? null,
        brandId: typeof withBrand.brandId === "number" ? withBrand.brandId : null,
        category: withBrand.category ?? null,
        catalogSource,
        priceCurrent: withBrand.priceCurrent ?? null,
        priceDiscounted: withBrand.priceDiscounted ?? null,
        currency: withBrand.currency ?? "EUR",
        image: withBrand.image || null,
        url: withBrand.url,
        featuredOnHomepage,
      },
    });
    if (existing) result.updated += 1;
    else result.created += 1;
    byId.set(withBrand.id, withBrand);
    if (skuKey) bySku.set(skuKey, withBrand);

    const dest = `/product/${withBrand.slug || incoming.wcSlug || incoming.id}`;
    const sources = wordpressSourcePaths(raw.permalink, [
      raw.slug ? `/product/${raw.slug}` : "",
      incoming.wcSlug ? `/product/${incoming.wcSlug}` : "",
      raw.slug ? `/winkel/product/${raw.slug}` : "",
      raw.slug ? `/shop/product/${raw.slug}` : "",
    ]);
    addRedirectCounts(redirectCounts, await upsertSeoRedirects(prisma, sources, dest, "product"));
  }

  try {
    addRedirectCounts(redirectCounts, await persistWooCategoryRedirects(prisma, creds, options));
  } catch {
    /* categorie-redirects zijn extra; productimport mag niet stranden */
  }

  return result;
}

type WcProductCategory = WcRestProductCategory;

async function persistWooCategoryRedirects(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
): Promise<{ created: number; updated: number; skipped: number }> {
  const counts = { created: 0, updated: 0, skipped: 0 };
  if (options.dryRun) return counts;
  const auth = creds.auth?.key && creds.auth.secret ? creds.auth : null;
  if (!auth) return counts;

  const { items } = await fetchWordpressPages<WcProductCategory>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, "products/categories", {
        page,
        per_page: perPage,
        orderby: "id",
        order: "asc",
        hide_empty: "0",
      }),
    auth,
    perPage: 50,
    maxPages: options.maxPages ?? 20,
    label: "WooCommerce categorieën (redirects)",
  });

  for (const cat of items) {
    const slug = cat.slug?.trim();
    if (!slug) continue;
    const dest = publicCategoryPath(slug, "nl");
    const sources = wordpressSourcePaths(cat.permalink, [
      `/product-category/${slug}`,
      `/product-categorie/${slug}`,
    ]);
    const part = await upsertSeoRedirects(prisma, sources, dest, "category");
    counts.created += part.created;
    counts.updated += part.updated;
    counts.skipped += part.skipped;
  }
  return counts;
}

type ExistingCategoryRow = {
  id: number;
  name: string;
  slug: string;
  parentId: number;
  productCount: number;
  link: string | null;
};

function nextFreeCategoryId(used: Set<number>): number {
  let id = 1;
  while (used.has(id)) id += 1;
  return id;
}

function findMatchingCategory(
  woo: WcRestProductCategory,
  byId: Map<number, ExistingCategoryRow>,
  bySlug: Map<string, ExistingCategoryRow>,
): ExistingCategoryRow | null {
  for (const alias of wooCategoryAliasSlugs(woo.slug || "")) {
    const hit = bySlug.get(alias);
    if (hit) return hit;
  }
  return byId.get(woo.id) ?? null;
}

async function importCategories(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
  redirectCounts: WordpressImportTypeResult,
): Promise<WordpressImportTypeResult> {
  const auth = requireAuth(creds, "categorieën");
  const { items, pages } = await fetchWordpressPages<WcRestProductCategory>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, "products/categories", {
        page,
        per_page: perPage,
        orderby: "id",
        order: "asc",
        hide_empty: 0,
      }),
    auth,
    perPage: 50,
    maxPages: options.maxPages ?? 20,
    label: "WooCommerce categorieën",
    log: options.log,
  });

  const result = emptyResult();
  result.fetched = items.length;
  result.pages = pages;
  options.log?.(`Categorieën opgehaald: ${items.length}`);

  const existingRows = await prisma.category.findMany();
  const byId = new Map(existingRows.map((row) => [row.id, row as ExistingCategoryRow]));
  const bySlug = new Map(existingRows.map((row) => [row.slug.toLowerCase(), row as ExistingCategoryRow]));
  const usedIds = new Set(byId.keys());
  const wooIdToLocal = new Map<number, number>();
  const sorted = sortWooCategoriesParentsFirst(items);

  for (const woo of sorted) {
    const slug = woo.slug?.trim().toLowerCase() || "";
    if (isSkippedWooCategorySlug(slug)) {
      result.skipped += 1;
      continue;
    }
    const name = formatRalexCategoryName(decodeHtmlEntities(stripHtml(woo.name || slug)), slug);
    const parentWoo = woo.parent ?? 0;
    const parentId = parentWoo ? (wooIdToLocal.get(parentWoo) ?? 0) : 0;
    const match = findMatchingCategory(woo, byId, bySlug);

    if (match) {
      wooIdToLocal.set(woo.id, match.id);
      const nextParent = parentId === match.id ? match.parentId : parentId;
      const dutchName = name || match.name;
      const changed =
        match.name !== dutchName ||
        match.parentId !== nextParent ||
        match.productCount !== (woo.count ?? match.productCount);
      if (options.dryRun) {
        result.updated += 1;
        continue;
      }
      if (changed) {
        const updated = await prisma.category.update({
          where: { id: match.id },
          data: {
            name: dutchName,
            parentId: nextParent,
            productCount: woo.count ?? match.productCount,
            link: normalizeCategoryShopLink(match.slug, match.link),
          },
        });
        const row: ExistingCategoryRow = {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          parentId: updated.parentId,
          productCount: updated.productCount,
          link: updated.link,
        };
        byId.set(row.id, row);
        bySlug.set(row.slug.toLowerCase(), row);
        result.updated += 1;
      } else {
        result.skipped += 1;
      }
      continue;
    }

    if (options.dryRun) {
      result.created += 1;
      continue;
    }

    const id = usedIds.has(woo.id) ? nextFreeCategoryId(usedIds) : woo.id;
    usedIds.add(id);
    const created = await prisma.category.create({
      data: {
        id,
        name: name || slug,
        slug,
        parentId,
        productCount: woo.count ?? 0,
        link: normalizeCategoryShopLink(slug, woo.permalink),
      },
    });
    const row: ExistingCategoryRow = {
      id: created.id,
      name: created.name,
      slug: created.slug,
      parentId: created.parentId,
      productCount: created.productCount,
      link: created.link,
    };
    byId.set(row.id, row);
    bySlug.set(row.slug.toLowerCase(), row);
    wooIdToLocal.set(woo.id, row.id);
    result.created += 1;
  }

  if (!options.dryRun) {
    await prisma.catalogMeta.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        source: "https://www.bergasports.com/",
        sourceApi: `${creds.baseUrl}/wp-json/wc/v3/products/categories`,
        fetchedAt: new Date().toISOString(),
      },
      update: {
        source: "https://www.bergasports.com/",
        sourceApi: `${creds.baseUrl}/wp-json/wc/v3/products/categories`,
        fetchedAt: new Date().toISOString(),
      },
    });

    addRedirectCounts(redirectCounts, await persistWooCategoryRedirects(prisma, creds, options));

    const productRows = await prisma.product.findMany({ select: { id: true, data: true, category: true } });
    for (const row of productRows) {
      const data = row.data as TrendyolJsonProduct;
      const wcCats = data.wcCategories ?? [];
      if (!wcCats.length) continue;
      let matched: ExistingCategoryRow | null = null;
      for (const wc of wcCats) {
        for (const alias of wooCategoryAliasSlugs(wc.slug)) {
          const hit = bySlug.get(alias);
          if (hit) matched = hit;
        }
      }
      if (!matched) continue;
      const newName = formatRalexCategoryName(matched.name, matched.slug);
      const wcSlugs = wcCats.map((c) => c.slug);
      if (!shouldReplaceImportedCategory(row.category ?? data.category, newName, wcSlugs)) continue;
      if ((row.category || "") === newName && (data.category || "") === newName) continue;
      await prisma.product.update({
        where: { id: row.id },
        data: {
          category: newName,
          data: { ...data, category: newName } as Prisma.InputJsonValue,
        },
      });
    }
  }

  return result;
}

async function importAttributes(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
): Promise<WordpressImportTypeResult> {
  const auth = requireAuth(creds, "eigenschappen");
  const termsByAttrId = new Map<number, string[]>();

  const { items: globalAttrs } = await fetchWordpressPages<WcRestGlobalAttribute>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, "products/attributes", { page, per_page: perPage, orderby: "id", order: "asc" }),
    auth,
    perPage: 100,
    maxPages: 5,
    label: "WooCommerce eigenschappen",
    log: options.log,
  });
  options.log?.(`Globale eigenschappen: ${globalAttrs.length}`);

  for (const attr of globalAttrs) {
    if (!attr.id) continue;
    const { items: terms } = await fetchWordpressPages<WcRestAttributeTerm>({
      urlForPage: (page, perPage) =>
        wcV3Url(creds.baseUrl, `products/attributes/${attr.id}/terms`, {
          page,
          per_page: perPage,
          orderby: "id",
          order: "asc",
        }),
      auth,
      perPage: 100,
      maxPages: 10,
      label: `Termen ${attr.name || attr.slug || attr.id}`,
    });
    termsByAttrId.set(
      attr.id,
      terms.map((term) => decodeHtmlEntities(stripHtml(term.name || term.slug || ""))).filter(Boolean),
    );
  }

  const { items, pages } = await fetchWordpressPages<WcRestProduct>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, "products", {
        page,
        per_page: perPage,
        status: "publish",
        orderby: "id",
        order: "asc",
      }),
    auth,
    perPage: 50,
    maxPages: options.maxPages ?? 200,
    label: "Producteigenschappen",
    log: options.log,
  });

  const result = emptyResult();
  result.fetched = items.length;
  result.pages = pages;
  options.log?.(`Producten voor eigenschappen: ${items.length}`);

  const existingRows = await prisma.product.findMany({ select: { id: true, data: true } });
  const byId = new Map<number, { id: bigint; data: TrendyolJsonProduct }>();
  const bySku = new Map<string, { id: bigint; data: TrendyolJsonProduct }>();
  for (const row of existingRows) {
    const data = row.data as TrendyolJsonProduct;
    const rec = { id: row.id, data: { ...data, id: Number(row.id) } };
    byId.set(Number(row.id), rec);
    const sku = data.wcSku?.trim().toLowerCase();
    if (sku && !bySku.has(sku)) bySku.set(sku, rec);
  }

  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i]!;
    logProgress(options, 25, i, items.length, "Eigenschappen schrijven");
    const existing = byId.get(raw.id) ?? (raw.sku?.trim() ? bySku.get(raw.sku.trim().toLowerCase()) : undefined);
    if (!existing) {
      result.skipped += 1;
      continue;
    }
    const attrs: WcRestAttribute[] = applyGlobalAttributeTerms(raw.attributes, termsByAttrId);
    const incoming = mapWcRestProductToJson({ ...raw, attributes: attrs });
    const specs = incoming.specsText?.trim() || "";
    const keepSpecs = Boolean(existing.data.specsText?.trim());
    const next: TrendyolJsonProduct = {
      ...existing.data,
      wcAttributes: incoming.wcAttributes?.length ? incoming.wcAttributes : existing.data.wcAttributes,
      specsText: keepSpecs ? existing.data.specsText : specs || existing.data.specsText,
    };
    const unchanged =
      JSON.stringify(next.wcAttributes ?? []) === JSON.stringify(existing.data.wcAttributes ?? []) &&
      (next.specsText ?? "") === (existing.data.specsText ?? "");
    if (unchanged) {
      result.skipped += 1;
      continue;
    }
    if (options.dryRun) {
      result.updated += 1;
      continue;
    }
    await prisma.product.update({
      where: { id: existing.id },
      data: { data: next as Prisma.InputJsonValue },
    });
    result.updated += 1;
  }

  return result;
}

async function importCustomers(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
): Promise<WordpressImportTypeResult> {
  const auth = requireAuth(creds, "klanten");
  const { items, pages } = await fetchWordpressPages<WooCommerceCustomer>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, "customers", { page, per_page: perPage, orderby: "id", order: "asc" }),
    auth,
    perPage: 50,
    maxPages: options.maxPages ?? 200,
    label: "WooCommerce klanten",
    log: options.log,
  });

  const result = emptyResult();
  result.fetched = items.length;
  result.pages = pages;
  options.log?.(`Klanten opgehaald: ${items.length}`);

  for (let i = 0; i < items.length; i += 1) {
    const customer = items[i]!;
    logProgress(options, 25, i, items.length, "Klanten schrijven");
    const email = customer.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      result.skipped += 1;
      continue;
    }
    const existing = await prisma.customer.findUnique({
      where: { email },
      include: { addresses: true },
    });
    const name = wooCustomerDisplayName(customer);
    const phone = wooCustomerPhone(customer);
    const address = wooCustomerAddress(customer);

    if (options.dryRun) {
      if (existing) result.updated += 1;
      else result.created += 1;
      continue;
    }

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: existing.name?.trim() ? existing.name : name,
          phone: existing.phone?.trim() ? existing.phone : phone,
        },
      });
      if (address && existing.addresses.length === 0) {
        await prisma.customerAddress.create({
          data: { ...address, customerId: existing.id },
        });
      }
      result.updated += 1;
      continue;
    }

    const passwordHash = hashAdminPassword(randomBytes(18).toString("base64url"));
    await prisma.customer.create({
      data: {
        email,
        name,
        phone,
        passwordHash,
        addresses: address ? { create: address } : undefined,
      },
    });
    result.created += 1;
  }

  return result;
}

async function importOrders(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
): Promise<WordpressImportTypeResult> {
  const auth = requireAuth(creds, "orders");
  const { items, pages } = await fetchWordpressPages<WooCommerceOrder>({
    urlForPage: (page, perPage) =>
      wcV3Url(creds.baseUrl, "orders", {
        page,
        per_page: perPage,
        orderby: "id",
        order: "asc",
      }),
    auth,
    perPage: 50,
    maxPages: options.maxPages ?? 200,
    label: "WooCommerce orders",
    log: options.log,
  });

  const result = emptyResult();
  result.fetched = items.length;
  result.pages = pages;
  options.log?.(`Orders opgehaald: ${items.length}`);

  for (let i = 0; i < items.length; i += 1) {
    const order = items[i]!;
    logProgress(options, 25, i, items.length, "Orders schrijven");
    if (options.dryRun) {
      const orderNumber = `WC-${order.number || order.id}`;
      const existing = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      });
      if (existing) result.updated += 1;
      else result.created += 1;
      continue;
    }
    const action = await upsertWooCommerceOrderRecord(prisma, order);
    if (action === "created") result.created += 1;
    else if (action === "updated") result.updated += 1;
    else result.skipped += 1;
  }

  return result;
}

async function importNews(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
  redirectCounts: WordpressImportTypeResult,
): Promise<WordpressImportTypeResult> {
  const wpAuth = wpRestAuth(creds);
  const { items, pages } = await fetchWordpressPages<WpPost>({
    urlForPage: (page, perPage) =>
      wpV2Url(creds.baseUrl, "posts", {
        page,
        per_page: perPage,
        _embed: "1",
        ...(wpAuth ? { status: "publish" } : {}),
      }),
    auth: wpAuth,
    perPage: 50,
    maxPages: options.maxPages ?? 50,
    label: "WordPress berichten",
    log: options.log,
  });

  const result = emptyResult();
  result.fetched = items.length;
  result.pages = pages;
  options.log?.(`Berichten opgehaald: ${items.length}`);

  for (const post of items) {
    const mapped = mapWpPostToNews(post);
    const existing = await prisma.newsPost.findUnique({
      where: { slug: mapped.slug },
      select: { id: true, sourceUrl: true, slug: true },
    });
    if (existing && !shouldUpdateImportedNews(existing)) {
      result.skipped += 1;
      if (!options.dryRun) {
        addRedirectCounts(
          redirectCounts,
          await upsertSeoRedirects(
            prisma,
            [...wordpressSourcePaths(post.link, [`/${post.slug}`, `/blog/${post.slug}`]), wpQueryRedirectSource("p", post.id)],
            `/nieuws/${existing.slug}`,
            "news",
          ),
        );
      }
      continue;
    }
    if (options.dryRun) {
      if (existing) result.updated += 1;
      else result.created += 1;
      continue;
    }
    await prisma.newsPost.upsert({
      where: { slug: mapped.slug },
      create: {
        slug: mapped.slug,
        title: mapped.title,
        excerpt: mapped.excerpt,
        bodyHtml: mapped.bodyHtml,
        coverImage: mapped.coverImage,
        category: mapped.category,
        publishedAt: mapped.publishedAt,
        sourceUrl: mapped.sourceUrl,
        seoTitle: mapped.seoTitle,
        seoDescription: mapped.seoDescription,
        isPublished: true,
        locale: "nl",
      },
      update: {
        title: mapped.title,
        excerpt: mapped.excerpt,
        bodyHtml: mapped.bodyHtml,
        coverImage: mapped.coverImage,
        category: mapped.category,
        publishedAt: mapped.publishedAt ?? undefined,
        sourceUrl: mapped.sourceUrl,
        seoTitle: mapped.seoTitle,
        seoDescription: mapped.seoDescription,
      },
    });
    if (existing) result.updated += 1;
    else result.created += 1;

    const dest = `/nieuws/${mapped.slug}`;
    const sources = [
      ...wordpressSourcePaths(post.link, [`/${post.slug}`, `/blog/${post.slug}`]),
      wpQueryRedirectSource("p", post.id),
    ];
    addRedirectCounts(redirectCounts, await upsertSeoRedirects(prisma, sources, dest, "news"));
  }

  return result;
}

async function importPages(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
  redirectCounts: WordpressImportTypeResult,
): Promise<WordpressImportTypeResult> {
  const wpAuth = wpRestAuth(creds);
  const { items, pages } = await fetchWordpressPages<WpPage>({
    urlForPage: (page, perPage) =>
      wpV2Url(creds.baseUrl, "pages", {
        page,
        per_page: perPage,
        _embed: "1",
        ...(wpAuth ? { status: "publish" } : {}),
      }),
    auth: wpAuth,
    perPage: 50,
    maxPages: options.maxPages ?? 20,
    label: "WordPress pagina's",
    log: options.log,
  });

  const result = emptyResult();
  result.fetched = items.length;
  result.pages = pages;
  options.log?.(`Pagina's opgehaald: ${items.length}`);

  for (const page of items) {
    const wpSlug = (page.slug || "").trim().toLowerCase();
    const mapped: MappedSitePage | null = mapWpPageToSitePage(page);
    const canonical = WORDPRESS_PAGE_CANONICALS[wpSlug];
    const dest = canonical || mapped?.path || null;

    const recordRedirects = async (destination: string) => {
      if (options.dryRun) return;
      const sources = [
        ...wordpressSourcePaths(page.link, wpSlug ? [`/${wpSlug}`] : []),
        wpQueryRedirectSource("page_id", page.id),
      ];
      addRedirectCounts(redirectCounts, await upsertSeoRedirects(prisma, sources, destination, "page"));
    };

    if (!mapped) {
      if (dest) await recordRedirects(dest);
      result.skipped += 1;
      continue;
    }
    const existing = await prisma.sitePage.findUnique({
      where: { slug: mapped.slug },
      select: { id: true, path: true },
    });
    if (existing) {
      await recordRedirects(existing.path || mapped.path);
      result.skipped += 1;
      continue;
    }
    if (options.dryRun) {
      result.created += 1;
      continue;
    }
    await prisma.sitePage.create({
      data: {
        slug: mapped.slug,
        path: mapped.path,
        title: mapped.title,
        heading: mapped.heading,
        bodyHtml: mapped.bodyHtml,
        metaTitle: mapped.metaTitle,
        metaDescription: mapped.metaDescription,
        socialImage: mapped.socialImage,
        isPublished: true,
        sortOrder: 200,
      },
    });
    await recordRedirects(mapped.path);
    result.created += 1;
  }

  return result;
}

export async function runWordpressImport(
  prisma: PrismaClient,
  creds: WordpressImportCredentials,
  options: WordpressImportRunOptions,
): Promise<WordpressImportResult> {
  const warnings: string[] = [];
  const wooConfigured = Boolean(creds.auth?.key && creds.auth.secret);
  const types = options.types;
  const result: WordpressImportResult = {
    ok: true,
    dryRun: Boolean(options.dryRun),
    baseUrl: creds.baseUrl,
    wooConfigured,
    types,
    warnings,
    errors: {},
  };

  const needsWoo = types.some(
    (t) => t === "products" || t === "categories" || t === "attributes" || t === "customers" || t === "orders",
  );
  if (needsWoo && !wooConfigured) {
    throw new Error("WC_CONSUMER_KEY / WC_CONSUMER_SECRET ontbreken voor producten, klanten of orders.");
  }

  if (types.some((t) => t === "news" || t === "pages")) {
    const ping = await fetchWordpressJson<unknown[]>(
      wpV2Url(creds.baseUrl, "posts", { per_page: 1 }),
      wpRestAuth(creds),
    );
    if (!ping.ok) {
      warnings.push(
        `WordPress REST (publiek) reageerde ${ping.status}. Nieuws/pagina's kunnen mislukken. Woo-sleutels worden niet naar /wp/v2 gestuurd.`,
      );
    }
  }

  const redirectCounts = emptyResult();
  if (!options.dryRun) {
    try {
      await seedStaticSeoRedirects(prisma);
    } catch (e) {
      warnings.push(
        `SEO-redirects-tabel ontbreekt nog (${e instanceof Error ? e.message : "onbekend"}). Draai de migratie seo_redirects.`,
      );
    }
  }

  for (const type of types) {
    options.log?.(`Import ${dutchTypeLabel(type).toLowerCase()}…`);
    try {
      if (type === "products") result.products = await importProducts(prisma, creds, options, redirectCounts);
      if (type === "categories") result.categories = await importCategories(prisma, creds, options, redirectCounts);
      if (type === "attributes") result.attributes = await importAttributes(prisma, creds, options);
      if (type === "customers") result.customers = await importCustomers(prisma, creds, options);
      if (type === "orders") result.orders = await importOrders(prisma, creds, options);
      if (type === "news") result.news = await importNews(prisma, creds, options, redirectCounts);
      if (type === "pages") result.pages = await importPages(prisma, creds, options, redirectCounts);
      const row = result[type];
      if (row) options.log?.(`${dutchTypeLabel(type)} klaar: ${formatTypeCounts(row)}`);
    } catch (error) {
      const message = formatTypeError(type, error);
      result.ok = false;
      result.errors[type] = message;
      options.log?.(message);
    }
  }

  result.redirects = redirectCounts;

  return result;
}
