import "server-only";

import { getFreeShippingThresholdSetting } from "@/lib/shop-runtime";
import { listActiveShippingRates } from "@/lib/shipping-rates-db";

export type ShippingQuote = {
  method: string;
  label: string;
  price: number;
  estimatedDays?: string;
};

const DEFAULT_RATES: Record<string, ShippingQuote[]> = {
  NL: [
    { method: "pickup", label: "Afhalen in Dedemsvaart", price: 0, estimatedDays: "Op afspraak" },
    { method: "standard", label: "Verzending Nederland", price: 6.95, estimatedDays: "1–3 werkdagen" },
  ],
  BE: [{ method: "standard", label: "Verzending België", price: 12.95, estimatedDays: "2–4 werkdagen" }],
  DE: [{ method: "standard", label: "Verzending Duitsland", price: 14.95, estimatedDays: "2–5 werkdagen" }],
  EU: [{ method: "standard", label: "Verzending EU", price: 24.95, estimatedDays: "3–7 werkdagen" }],
};

const DEFAULT_FREE_SHIPPING_NL = 150;

type RateCandidate = ShippingQuote & { freeAbove: number | null };

export async function quoteShipping(input: {
  countryCode: string;
  subtotal: number;
}): Promise<ShippingQuote[]> {
  const cc = input.countryCode.toUpperCase();
  const freeAboveGlobal = await getFreeShippingThresholdSetting().catch(() => DEFAULT_FREE_SHIPPING_NL);

  let candidates: RateCandidate[] = [];
  try {
    const dbRates = await listActiveShippingRates();
    const forCountry = dbRates.filter((r) => r.countryCode === cc);
    const chosen = forCountry.length > 0 ? forCountry : dbRates.filter((r) => r.countryCode === "EU");
    candidates = chosen.map((rate) => ({
      method: rate.method,
      label: rate.label,
      price: rate.price,
      estimatedDays: rate.estimatedDays ?? undefined,
      freeAbove: rate.freeAbove,
    }));
  } catch {
    candidates = [];
  }

  if (candidates.length === 0) {
    candidates = (DEFAULT_RATES[cc] ?? DEFAULT_RATES.EU).map((rate) => ({
      ...rate,
      freeAbove: rate.method === "pickup" ? null : freeAboveGlobal,
    }));
  }

  return candidates.map((rate) => {
    const threshold = rate.freeAbove ?? (rate.method === "pickup" || rate.price <= 0 ? null : freeAboveGlobal);
    if (threshold != null && input.subtotal >= threshold && rate.price > 0) {
      return { method: rate.method, label: `${rate.label} (gratis)`, price: 0, estimatedDays: rate.estimatedDays };
    }
    return { method: rate.method, label: rate.label, price: rate.price, estimatedDays: rate.estimatedDays };
  });
}

export async function getShippingQuote(
  countryCode: string,
  method: string,
  subtotal: number,
): Promise<ShippingQuote | null> {
  return (await quoteShipping({ countryCode, subtotal })).find((r) => r.method === method) ?? null;
}
