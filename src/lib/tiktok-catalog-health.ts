import "server-only";

import { isProductVisibleOnShop } from "@/lib/product-status";
import { mapTrendyolJsonToProduct } from "@/lib/products";
import { fetchAllProductsRaw } from "@/lib/products-db";
import { getTikTokAdminStatus } from "@/lib/tiktok-admin-status";

export type TikTokCatalogHealth = {
  pixel: ReturnType<typeof getTikTokAdminStatus>;
  productsVisible: number;
  productsWithImage: number;
  productsInStock: number;
  feedReady: boolean;
  notes: string[];
};

export async function getTikTokCatalogHealth(): Promise<TikTokCatalogHealth> {
  const pixel = getTikTokAdminStatus();
  const raw = await fetchAllProductsRaw();
  const products = raw.filter(isProductVisibleOnShop).map(mapTrendyolJsonToProduct);

  let withImage = 0;
  let inStock = 0;
  for (const p of products) {
    if (p.image?.trim()) {
      withImage += 1;
    }
    if (p.inStock !== false) {
      inStock += 1;
    }
  }

  const notes: string[] = [];
  if (!pixel.pixelConfigured) {
    notes.push("Set NEXT_PUBLIC_TIKTOK_PIXEL_ID for TikTok tracking.");
  }
  if (!pixel.eventsApiConfigured) {
    notes.push("Set TIKTOK_ACCESS_TOKEN for server-side Purchase events.");
  }
  if (withImage < products.length) {
    notes.push(`${products.length - withImage} visible products missing a primary image.`);
  }
  notes.push("TikTok Shop catalog: export/sync via Easy Sales or TikTok Seller Center — align SKU & stock with shop.");

  const feedReady =
    pixel.pixelConfigured &&
    products.length >= 20 &&
    withImage >= Math.min(products.length, 20) &&
    inStock >= Math.floor(products.length * 0.5);

  return {
    pixel,
    productsVisible: products.length,
    productsWithImage: withImage,
    productsInStock: inStock,
    feedReady,
    notes,
  };
}
