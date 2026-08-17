import type { Product } from "@/lib/products";

export type ProductContentTier = "small" | "medium" | "premium";

const BIKE_HINT =
  /fiets|bike|colnago|orbea|basso|cervelo|cervélo|cipollini|titici|sensa|gravel|mtb|orca|terra|oiz/i;
const WHEEL_HINT = /wiel|wheel|scope|campagnolo|ere |princeton/i;

/** Depth of PDP content based on price + category signals. */
export function resolveProductContentTier(product: Product): ProductContentTier {
  const price = product.price || 0;
  const hay = `${product.name} ${product.category ?? ""} ${product.brand ?? ""}`;

  if (price >= 2500 || BIKE_HINT.test(hay)) return "premium";
  if (price >= 250 || WHEEL_HINT.test(hay) || /schoen|shoe|nimbl|lafuga/i.test(hay)) {
    return "medium";
  }
  return "small";
}
