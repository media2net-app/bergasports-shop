import "server-only";

import { revalidatePath } from "next/cache";

import { matchEasySalesProductsToShop } from "@/lib/easy-sales-product-match";
import type { EasySalesCatalogProduct } from "@/lib/easy-sales-products";
import { fetchAllEasySalesProducts, updateEasySalesProductStock } from "@/lib/easy-sales-products";
import { getEasySalesConfig } from "@/lib/easy-sales";
import type { OrderItemInput } from "@/lib/orders";
import type { TrendyolJsonProduct } from "@/lib/products";
import { isProductInStock, productAvailableStock } from "@/lib/stock";
import {
  fetchAllProductsRaw,
  getProductsRawByIds,
  saveProductRawWithoutImageMirror,
} from "@/lib/products-db";

export type EasySalesStockSyncSummary = {
  ok: boolean;
  easySalesProductCount: number;
  shopProductCount: number;
  matched: number;
  matchedByWebsiteId: number;
  matchedBySku: number;
  matchedByName: number;
  updated: number;
  unchanged: number;
  unmatchedEasySales: number;
  error?: string;
};

function applyEasySalesStockToProduct(
  shop: TrendyolJsonProduct,
  es: EasySalesCatalogProduct,
  syncedAt: string,
): TrendyolJsonProduct {
  const stockQuantity = typeof es.stock === "number" && Number.isFinite(es.stock) ? Math.max(0, es.stock) : 0;
  const reservedStock =
    typeof es.reserved_stock === "number" && Number.isFinite(es.reserved_stock)
      ? Math.max(0, es.reserved_stock)
      : 0;
  const next: TrendyolJsonProduct = {
    ...shop,
    stockQuantity,
    reservedStock,
    easySalesProductId: es.id,
    easySalesSku: es.sku?.trim() || undefined,
    stockSyncedAt: syncedAt,
  };
  next.inStock = isProductInStock(next);
  return next;
}

function stockFieldsChanged(a: TrendyolJsonProduct, b: TrendyolJsonProduct): boolean {
  return (
    a.stockQuantity !== b.stockQuantity ||
    a.reservedStock !== b.reservedStock ||
    a.easySalesProductId !== b.easySalesProductId ||
    a.easySalesSku !== b.easySalesSku ||
    a.inStock !== b.inStock
  );
}

export async function syncStockFromEasySales(): Promise<EasySalesStockSyncSummary> {
  const config = await getEasySalesConfig();
  if (!config) {
    return {
      ok: false,
      easySalesProductCount: 0,
      shopProductCount: 0,
      matched: 0,
      matchedByWebsiteId: 0,
      matchedBySku: 0,
      matchedByName: 0,
      updated: 0,
      unchanged: 0,
      unmatchedEasySales: 0,
      error: "Easy-Sales is not configured (EASY_SALES_API_TOKEN / EASY_SALES_WEBSITE_TOKEN).",
    };
  }

  try {
    const [esProducts, shopProducts] = await Promise.all([
      fetchAllEasySalesProducts(config),
      fetchAllProductsRaw(),
    ]);

    const matches = matchEasySalesProductsToShop(esProducts, shopProducts);
    const matchedEsIds = new Set(matches.map((m) => m.es.id));
    const unmatchedEasySales = esProducts.length - matchedEsIds.size;

    const shopById = new Map(shopProducts.map((p) => [p.id, p]));
    const syncedAt = new Date().toISOString();
    let matchedByWebsiteId = 0;
    let matchedBySku = 0;
    let matchedByName = 0;
    let updated = 0;
    let unchanged = 0;

    for (const match of matches) {
      if (match.method === "website_id") matchedByWebsiteId++;
      else if (match.method === "sku") matchedBySku++;
      else matchedByName++;

      const shop = shopById.get(match.shopId);
      if (!shop) continue;

      const patched = applyEasySalesStockToProduct(shop, match.es, syncedAt);
      if (!stockFieldsChanged(shop, patched)) {
        unchanged++;
        continue;
      }
      await saveProductRawWithoutImageMirror(patched);
      shopById.set(match.shopId, patched);
      updated++;
    }

    if (updated > 0) {
      revalidatePath("/");
      revalidatePath("/shop");
      revalidatePath("/admin/products");
    }

    return {
      ok: true,
      easySalesProductCount: esProducts.length,
      shopProductCount: shopProducts.length,
      matched: matches.length,
      matchedByWebsiteId,
      matchedBySku,
      matchedByName,
      updated,
      unchanged,
      unmatchedEasySales,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stock sync failed";
    return {
      ok: false,
      easySalesProductCount: 0,
      shopProductCount: 0,
      matched: 0,
      matchedByWebsiteId: 0,
      matchedBySku: 0,
      matchedByName: 0,
      updated: 0,
      unchanged: 0,
      unmatchedEasySales: 0,
      error: message,
    };
  }
}

export type StockDeductionResult = {
  productId: number;
  deducted: number;
  newStock: number | null;
  easySalesPush?: { ok: boolean; error?: string };
};

export async function deductStockForOrderItems(
  items: Pick<OrderItemInput, "productId" | "quantity">[],
): Promise<StockDeductionResult[]> {
  const qtyByProduct = new Map<number, number>();
  for (const item of items) {
    if (!item.productId || item.quantity < 1) continue;
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
  }
  const ids = [...qtyByProduct.keys()];
  if (!ids.length) return [];

  const products = await getProductsRawByIds(ids);
  const results: StockDeductionResult[] = [];

  for (const product of products) {
    const deduct = qtyByProduct.get(product.id) ?? 0;
    if (deduct < 1) continue;

    const available = productAvailableStock(product);
    let newStock: number | null = null;

    if (available !== null) {
      newStock = Math.max(0, available - deduct);
      const totalStock =
        typeof product.stockQuantity === "number"
          ? Math.max(0, product.stockQuantity - deduct)
          : newStock;

      const patched: TrendyolJsonProduct = {
        ...product,
        stockQuantity: totalStock,
        inStock: newStock > 0,
        stockSyncedAt: new Date().toISOString(),
      };
      await saveProductRawWithoutImageMirror(patched);

      let easySalesPush: StockDeductionResult["easySalesPush"];
      if (product.easySalesProductId) {
        easySalesPush = await updateEasySalesProductStock(product.easySalesProductId, totalStock);
      }

      results.push({ productId: product.id, deducted: deduct, newStock, easySalesPush });
    } else {
      // Unmanaged stock (no stockQuantity): keep the manual inStock flag.
      // Flipping to false here caused false OOS after unpaid Mollie attempts.
      results.push({ productId: product.id, deducted: 0, newStock: null });
    }
  }

  return results;
}

/** For admin UI — how many catalog rows already have synced stock. */
export async function countProductsWithSyncedStock(): Promise<number> {
  const products = await fetchAllProductsRaw();
  return products.filter((p) => typeof p.stockQuantity === "number" && Number.isFinite(p.stockQuantity)).length;
}
