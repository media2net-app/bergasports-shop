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

/** Vanaf hoeveel stuks we in de admin waarschuwen dat de voorraad opraakt. */
export const LOW_STOCK_THRESHOLD = 3;

export type StockState = "in_stock" | "low_stock" | "out_of_stock" | "unmanaged";

type StockInput = Pick<TrendyolJsonProduct, "stockQuantity" | "reservedStock" | "inStock">;

/**
 * Voorraadstatus voor de adminlijsten. "unmanaged" betekent: geen aantal ingevuld,
 * dus we vallen terug op de handmatige schakelaar op voorraad / uitverkocht.
 */
export function productStockState(product: StockInput, lowStockThreshold = LOW_STOCK_THRESHOLD): StockState {
  const available = productAvailableStock(product);
  if (available === null) {
    return product.inStock === false ? "out_of_stock" : "unmanaged";
  }
  if (available <= 0) {
    return "out_of_stock";
  }
  return available <= lowStockThreshold ? "low_stock" : "in_stock";
}

export type StockSummary = {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  unmanaged: number;
};

export function stockStateLabel(state: StockState): string {
  switch (state) {
    case "in_stock":
      return "Op voorraad";
    case "low_stock":
      return "Bijna uitverkocht";
    case "out_of_stock":
      return "Uitverkocht";
    default:
      return "Geen aantal ingevuld";
  }
}
