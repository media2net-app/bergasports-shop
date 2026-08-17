import type { TrendyolJsonProduct } from "@/lib/products";

export const PRODUCT_STATUSES = ["published", "concept"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  published: "Gepubliceerd",
  concept: "Concept",
};

export function normalizeProductStatus(value: unknown): ProductStatus {
  return value === "concept" ? "concept" : "published";
}

export function isProductVisibleOnShop(
  product: Pick<TrendyolJsonProduct, "productStatus">,
): boolean {
  return normalizeProductStatus(product.productStatus) === "published";
}
