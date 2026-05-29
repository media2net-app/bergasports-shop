import type { Product } from "@/lib/products";
import { isProductInStock } from "@/lib/products";

export type ShopMerchView = "reduceri" | "noi" | "top";

export const SHOP_MERCH_VIEWS: {
  id: ShopMerchView;
  title: string;
  description: string;
}[] = [
  {
    id: "reduceri",
    title: "Aanbiedingen",
    description: "Producten met korting.",
  },
  {
    id: "top",
    title: "Populair",
    description: "Gesorteerd op aantal reviews.",
  },
  {
    id: "noi",
    title: "Nieuw",
    description: "Nieuwste producten in de catalogus.",
  },
];

export function parseShopMerchView(raw: string | undefined | null): ShopMerchView | null {
  if (raw === "reduceri" || raw === "noi" || raw === "top") {
    return raw;
  }
  return null;
}

export function applyShopMerchView(products: Product[], view: ShopMerchView | null): Product[] {
  if (!view) {
    return products;
  }
  const inStock = products.filter((p) => isProductInStock(p));
  switch (view) {
    case "reduceri":
      return inStock
        .filter((p) => p.oldPrice != null && p.oldPrice > p.price + 0.005)
        .sort((a, b) => b.oldPrice! - b.price - (a.oldPrice! - a.price));
    case "noi":
      return [...inStock].sort((a, b) => b.id - a.id);
    case "top":
      return inStock
        .filter((p) => (p.wcReviewCount ?? 0) > 0)
        .sort((a, b) => (b.wcReviewCount ?? 0) - (a.wcReviewCount ?? 0));
    default:
      return products;
  }
}

export function shopMerchViewLabel(view: ShopMerchView): string {
  return SHOP_MERCH_VIEWS.find((v) => v.id === view)?.title ?? view;
}
