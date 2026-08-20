/** Client-safe Mollie method helpers (no API key). */

export type MollieMethodPublic = {
  id: string;
  description: string;
  image?: { size1x?: string; size2x?: string; svg?: string };
};

/** Preferred display order for NL/BE shop. Only shown if Mollie has them enabled. */
export const SHOP_MOLLIE_METHOD_ORDER = [
  "ideal",
  "bancontact",
  "creditcard",
  "applepay",
  "googlepay",
  "paypal",
  "in3",
  "klarnapaylater",
  "klarnapaynow",
  "klarnasliceit",
  "riverty",
  "banktransfer",
  "kbc",
  "belfius",
  "giftcard",
  "payconiq",
] as const;

const METHOD_LABELS: Record<string, string> = {
  ideal: "iDEAL",
  bancontact: "Bancontact",
  creditcard: "Creditcard",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  paypal: "PayPal",
  in3: "iDEAL in3",
  klarnapaylater: "Klarna Achteraf betalen",
  klarnapaynow: "Klarna Pay now",
  klarnasliceit: "Klarna Slice it",
  banktransfer: "Overboeking",
  kbc: "KBC/CBC",
  belfius: "Belfius",
  giftcard: "Cadeaukaart",
  payconiq: "Payconiq",
  sofort: "SOFORT",
  eps: "EPS",
  giropay: "giropay",
  przelewy24: "Przelewy24",
  paysafecard: "paysafecard",
  billie: "Billie",
  riverty: "Riverty",
  trustly: "Trustly",
};

export function mollieLocaleForCountry(country: string): string {
  const cc = country.trim().toUpperCase();
  if (cc === "BE") return "nl_BE";
  if (cc === "DE") return "de_DE";
  return "nl_NL";
}

export function mollieBillingCountry(country: string): string | undefined {
  const cc = country.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cc) && cc !== "EU") return cc;
  return undefined;
}

export function mollieMethodLabel(id: string): string {
  const key = id.trim().toLowerCase();
  return METHOD_LABELS[key] ?? id.trim();
}

export function mollieMethodImageUrl(method: MollieMethodPublic): string | undefined {
  return method.image?.svg || method.image?.size2x || method.image?.size1x;
}

/** Keep NL/BE-relevant methods in a stable order; append any extra methods Mollie returned. */
export function filterShopMollieMethods(methods: MollieMethodPublic[]): MollieMethodPublic[] {
  const byId = new Map(methods.map((m) => [m.id, m]));
  const preferred = SHOP_MOLLIE_METHOD_ORDER.map((id) => byId.get(id)).filter(
    (m): m is MollieMethodPublic => Boolean(m),
  );
  const preferredIds = new Set(preferred.map((m) => m.id));
  const rest = methods.filter((m) => Boolean(m?.id) && !preferredIds.has(m.id));
  if (preferred.length === 0 && rest.length === 0) return [];
  return [...preferred, ...rest];
}

/** Shown in checkout when Mollie is down or not configured, so customers can still pick a method. */
const FALLBACK_SHOP_METHOD_IDS = [
  "ideal",
  "bancontact",
  "creditcard",
  "applepay",
  "googlepay",
  "paypal",
  "in3",
  "banktransfer",
] as const;

export function fallbackShopMollieMethods(): MollieMethodPublic[] {
  return FALLBACK_SHOP_METHOD_IDS.map((id) => ({
    id,
    description: METHOD_LABELS[id] ?? id,
    image: {
      svg: `https://www.mollie.com/external/icons/payment-methods/${id}.svg`,
    },
  }));
}

export function formatMollieMethodNames(methods: MollieMethodPublic[] | undefined, max = 4): string {
  const names = (methods ?? [])
    .map((m) => m.description?.trim() || mollieMethodLabel(m.id))
    .filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")}…`;
}

export function sanitizeMollieMethodId(raw: string | undefined | null): string | undefined {
  const id = raw?.trim().toLowerCase();
  if (!id || id.length > 32 || !/^[a-z][a-z0-9]*$/.test(id)) return undefined;
  return id;
}
