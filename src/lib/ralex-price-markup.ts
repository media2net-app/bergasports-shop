import type { TrendyolJsonProduct } from "@/lib/products";
import { getWcStoreBaseUrl } from "@/lib/wc-store-config";

/** Ralex catalog prices are stored at 2× the WooCommerce source (100% markup). */
export const RALEX_PRICE_MARKUP_FACTOR = 2;

/** Alleen Ralex-bron krijgt retail-markup; Bergasports/hotel houden WC-prijzen. */
export function shouldApplyRalexPriceMarkup(): boolean {
  const base = getWcStoreBaseUrl().toLowerCase();
  if (process.env.RALEX_PRICE_MARKUP === "0" || process.env.RALEX_PRICE_MARKUP === "false") {
    return false;
  }
  return base.includes("ralex");
}

function mulPrice(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return value;
  }
  return Math.round(value * RALEX_PRICE_MARKUP_FACTOR * 100) / 100;
}

function priceText(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value.toFixed(2);
}

/** Apply Ralex retail markup to imported or stored product JSON. */
export function applyRalexPriceMarkup(product: TrendyolJsonProduct): TrendyolJsonProduct {
  if (!shouldApplyRalexPriceMarkup()) {
    return product;
  }
  const next: TrendyolJsonProduct = { ...product };

  next.priceCurrent = mulPrice(next.priceCurrent);
  next.priceDiscounted = mulPrice(next.priceDiscounted);
  next.priceOld = mulPrice(next.priceOld);
  next.priceRangeMax = mulPrice(next.priceRangeMax);

  if (next.priceCurrent != null) {
    next.priceCurrentText = priceText(next.priceCurrent);
  }
  if (next.priceDiscounted != null) {
    next.priceDiscountedText = priceText(next.priceDiscounted);
  }

  if (next.wcVariations?.length) {
    next.wcVariations = next.wcVariations.map((v) => ({
      ...v,
      price: mulPrice(v.price) ?? v.price,
      regularPrice: mulPrice(v.regularPrice) ?? v.regularPrice,
    }));
    const prices = next.wcVariations.map((v) => v.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    next.priceDiscounted = minP;
    next.priceDiscountedText = priceText(minP);
    next.priceCurrent = minP;
    next.priceCurrentText = priceText(minP);
    next.priceRangeMax = maxP;
  }

  if (next.landingPromo) {
    next.landingPromo = {
      ...next.landingPromo,
      price: mulPrice(next.landingPromo.price) ?? next.landingPromo.price,
      oldPrice: mulPrice(next.landingPromo.oldPrice) ?? next.landingPromo.oldPrice,
    };
  }

  if (next.cartBundlePromos?.tiers?.length) {
    next.cartBundlePromos = {
      tiers: next.cartBundlePromos.tiers.map((tier) => ({
        ...tier,
        price: mulPrice(tier.price) ?? tier.price,
        listSubtotal: mulPrice(tier.listSubtotal) ?? tier.listSubtotal,
      })),
    };
  }

  return next;
}
