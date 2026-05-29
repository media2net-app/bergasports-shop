import type { TrendyolJsonProduct } from "@/lib/products";

/** Sellable units when stock has been synced from Easy Sales (or set manually). */
export function productAvailableStock(
  product: Pick<TrendyolJsonProduct, "stockQuantity" | "reservedStock" | "inStock">,
): number | null {
  if (typeof product.stockQuantity === "number" && Number.isFinite(product.stockQuantity)) {
    const reserved =
      typeof product.reservedStock === "number" && Number.isFinite(product.reservedStock)
        ? Math.max(0, product.reservedStock)
        : 0;
    return Math.max(0, Math.floor(product.stockQuantity - reserved));
  }
  return null;
}

export function isProductInStock(
  product: Pick<TrendyolJsonProduct, "stockQuantity" | "reservedStock" | "inStock">,
): boolean {
  const available = productAvailableStock(product);
  if (available !== null) {
    return available > 0;
  }
  return product.inStock !== false;
}

export function hasStockQuantity(product: Pick<TrendyolJsonProduct, "stockQuantity">): boolean {
  return typeof product.stockQuantity === "number" && Number.isFinite(product.stockQuantity);
}
