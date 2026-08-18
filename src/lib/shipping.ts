import "server-only";

import {
  DEFAULT_FREE_SHIPPING_THRESHOLD_EUR,
  meetsFreeShippingThreshold,
} from "@/lib/shop-delivery-trust";
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

type RateCandidate = ShippingQuote & { countryCode: string; freeAbove: number | null };

function resolveFreeAbove(rate: RateCandidate, globalNl: number): number | null {
  if (rate.method === "pickup" || rate.price <= 0) {
    return null;
  }
  if (rate.freeAbove != null && rate.freeAbove > 0) {
    return rate.freeAbove;
  }
  // Shopdrempel geldt alleen voor NL. BE/DE/EU: alleen bij expliciet tarief.freeAbove.
  return rate.countryCode === "NL" ? globalNl : null;
}

export async function quoteShipping(input: {
  countryCode: string;
  subtotal: number;
}): Promise<ShippingQuote[]> {
  const cc = input.countryCode.toUpperCase();
  const freeAboveGlobal = await getFreeShippingThresholdSetting().catch(
    () => DEFAULT_FREE_SHIPPING_THRESHOLD_EUR,
  );

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
      countryCode: rate.countryCode,
      freeAbove: rate.freeAbove,
    }));
  } catch {
    candidates = [];
  }

  if (candidates.length === 0) {
    const tableKey = DEFAULT_RATES[cc] ? cc : "EU";
    candidates = DEFAULT_RATES[tableKey].map((rate) => ({
      ...rate,
      countryCode: tableKey,
      freeAbove: null,
    }));
  }

  return candidates.map((rate) => {
    const threshold = resolveFreeAbove(rate, freeAboveGlobal);
    if (threshold != null && meetsFreeShippingThreshold(input.subtotal, threshold) && rate.price > 0) {
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
