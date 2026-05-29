import { SITE_DEFAULT_CURRENCY } from "@/lib/site-brand";
import { formatProductPrice } from "@/lib/products";

export const RETURNS_POLICY_PATH = "/livrare-si-retur";
export const RETURNS_DAYS = 14;
export const ESTIMATED_DELIVERY_DAYS_MIN = 2;
export const ESTIMATED_DELIVERY_DAYS_MAX = 5;

const DEFAULT_FREE_SHIPPING_EUR = 50;

export function freeShippingThresholdAmount(): number {
  const raw = process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR ?? String(DEFAULT_FREE_SHIPPING_EUR);
  const eur = Number.parseFloat(raw);
  return Number.isFinite(eur) && eur > 0 ? eur : DEFAULT_FREE_SHIPPING_EUR;
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

export function formatFreeShippingThreshold(currency = SITE_DEFAULT_CURRENCY): string {
  return formatProductPrice(freeShippingThresholdAmount(), currency);
}
