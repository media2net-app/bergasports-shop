import "server-only";

export type ShippingQuote = {
  method: string;
  label: string;
  price: number;
  estimatedDays?: string;
};

const DEFAULT_RATES: Record<string, ShippingQuote[]> = {
  NL: [
    {
      method: "pickup",
      label: "Afhalen in Dedemsvaart",
      price: 0,
      estimatedDays: "Op afspraak",
    },
    {
      method: "standard",
      label: "Verzending Nederland",
      price: 6.95,
      estimatedDays: "1–3 werkdagen",
    },
  ],
  BE: [
    {
      method: "standard",
      label: "Verzending België",
      price: 12.95,
      estimatedDays: "2–4 werkdagen",
    },
  ],
  DE: [
    {
      method: "standard",
      label: "Verzending Duitsland",
      price: 14.95,
      estimatedDays: "2–5 werkdagen",
    },
  ],
  EU: [
    {
      method: "standard",
      label: "Verzending EU",
      price: 24.95,
      estimatedDays: "3–7 werkdagen",
    },
  ],
};

const FREE_SHIPPING_NL_ABOVE = 150;

export function quoteShipping(input: {
  countryCode: string;
  subtotal: number;
}): ShippingQuote[] {
  const cc = input.countryCode.toUpperCase();
  const base = DEFAULT_RATES[cc] ?? DEFAULT_RATES.EU;
  return base.map((rate) => {
    if (
      cc === "NL" &&
      rate.method === "standard" &&
      input.subtotal >= FREE_SHIPPING_NL_ABOVE
    ) {
      return { ...rate, price: 0, label: `${rate.label} (gratis)` };
    }
    return rate;
  });
}

export function getShippingQuote(
  countryCode: string,
  method: string,
  subtotal: number,
): ShippingQuote | null {
  return (
    quoteShipping({ countryCode, subtotal }).find((r) => r.method === method) ?? null
  );
}
