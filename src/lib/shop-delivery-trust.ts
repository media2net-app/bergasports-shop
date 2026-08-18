import { SITE_DEFAULT_CURRENCY } from "@/lib/site-brand";
import { formatProductPrice } from "@/lib/products";

export const RETURNS_POLICY_PATH = "/verzending";
export const RETURNS_DAYS = 14;
export const ESTIMATED_DELIVERY_DAYS_MIN = 2;
export const ESTIMATED_DELIVERY_DAYS_MAX = 5;

/** Canonieke fallback als admin-instelling en env leeg zijn. */
export const DEFAULT_FREE_SHIPPING_THRESHOLD_EUR = 150;

export function parseFreeShippingThreshold(raw: string | undefined | null): number {
  const n = Number.parseFloat((raw ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_SHIPPING_THRESHOLD_EUR;
}

export function freeShippingThresholdAmount(): number {
  return parseFreeShippingThreshold(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR);
}

export function meetsFreeShippingThreshold(subtotal: number, threshold: number): boolean {
  return threshold > 0 && subtotal >= threshold - 0.005;
}

/** @deprecated Gebruik freeShippingThresholdAmount */
export function freeShippingThresholdRon(): number {
  return freeShippingThresholdAmount();
}

export function formatEstimatedDeliveryRange(now = new Date()): string {
  const start = new Date(now);
  start.setDate(start.getDate() + ESTIMATED_DELIVERY_DAYS_MIN);
  const end = new Date(now);
  end.setDate(end.getDate() + ESTIMATED_DELIVERY_DAYS_MAX);
  return `${start.toLocaleDateString("nl-NL")} – ${end.toLocaleDateString("nl-NL")}`;
}

export function formatFreeShippingThreshold(currency = SITE_DEFAULT_CURRENCY, amount?: number): string {
  return formatProductPrice(amount ?? freeShippingThresholdAmount(), currency);
}
