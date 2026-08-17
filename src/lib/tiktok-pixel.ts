"use client";

import type { CartItem } from "@/components/cart/CartProvider";
import { readMarketingConsentSync } from "@/lib/cookie-consent";
import type { Product } from "@/lib/products";

type TikTokContent = {
  content_id: string;
  content_type: "product";
  content_name: string;
  content_category?: string;
  price?: number;
  num_items?: number;
  brand?: string;
};

type TikTokQueue = {
  track: (
    event: string,
    params?: Record<string, unknown>,
    options?: { event_id?: string },
  ) => void;
  page: () => void;
  load: (id: string, options?: Record<string, unknown>) => void;
  identify: (params: Record<string, string>) => void;
};

declare global {
  interface Window {
    ttq?: TikTokQueue;
  }
}

function tikTokCurrency(currency: string): string {
  const c = currency.trim().toLowerCase();
  if (c === "lei" || c === "ron") return "RON";
  return currency.trim().toUpperCase() || "RON";
}

function ttqTrack(
  event: string,
  params?: Record<string, unknown>,
  options?: { event_id?: string },
) {
  if (typeof window === "undefined" || !window.ttq || !readMarketingConsentSync()) {
    return;
  }
  if (options?.event_id) {
    window.ttq.track(event, params, options);
  } else {
    window.ttq.track(event, params);
  }
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhoneForHash(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("40")) return digits;
  if (digits.startsWith("0")) return `4${digits}`;
  return digits;
}

/** Hashed PII for Advanced Matching (call before checkout / purchase events). */
export async function tikTokIdentify(params: {
  email?: string;
  phone?: string;
  externalId?: string;
}): Promise<void> {
  if (
    typeof window === "undefined" ||
    !window.ttq?.identify ||
    !readMarketingConsentSync()
  ) {
    return;
  }

  const payload: Record<string, string> = {};

  const email = params.email?.trim().toLowerCase();
  if (email) {
    payload.email = await sha256Hex(email);
  }

  const phoneNorm = params.phone ? normalizePhoneForHash(params.phone) : "";
  if (phoneNorm) {
    payload.phone_number = await sha256Hex(phoneNorm);
  }

  const externalId = params.externalId?.trim();
  if (externalId) {
    payload.external_id = await sha256Hex(externalId);
  }

  if (Object.keys(payload).length > 0) {
    window.ttq.identify(payload);
  }
}

function productToContent(product: Product, quantity = 1): TikTokContent {
  return {
    content_id: String(product.id),
    content_type: "product",
    content_name: product.name,
    content_category: product.category,
    price: product.price,
    num_items: quantity,
    brand: product.brand,
  };
}

function cartLinePaidUnit(item: CartItem): number {
  return item.price;
}

export function tikTokContentsFromCart(items: CartItem[]): TikTokContent[] {
  return items.map((item) => ({
    content_id: String(item.productId),
    content_type: "product",
    content_name: item.name,
    price: cartLinePaidUnit(item),
    num_items: item.quantity,
  }));
}

function cartPaidTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + cartLinePaidUnit(item) * item.quantity, 0);
}

function eventPayload(
  contents: TikTokContent[],
  value: number,
  currency: string,
  extra?: Record<string, unknown>,
) {
  return {
    contents,
    value,
    currency: tikTokCurrency(currency),
    ...extra,
  };
}

export function trackTikTokViewContent(product: Product) {
  ttqTrack(
    "ViewContent",
    eventPayload([productToContent(product)], product.price, product.currency),
  );
}

export function trackTikTokAddToCart(product: Product, quantity: number, unitPrice: number) {
  ttqTrack(
    "AddToCart",
    eventPayload([productToContent(product, quantity)], unitPrice * quantity, product.currency),
  );
}

export function trackTikTokInitiateCheckout(items: CartItem[]) {
  if (!items.length) return;
  const currency = items[0]?.currency ?? "EUR";
  ttqTrack(
    "InitiateCheckout",
    eventPayload(tikTokContentsFromCart(items), cartPaidTotal(items), currency),
  );
}

export function trackTikTokAddPaymentInfo(items: CartItem[], total: number, currency: string) {
  if (!items.length) return;
  ttqTrack(
    "AddPaymentInfo",
    eventPayload(tikTokContentsFromCart(items), total, currency, {
      status: "submitted",
      description: "cash_on_delivery",
    }),
  );
}

export function trackTikTokSearch(
  searchString: string,
  hits: Array<{ id: number; name: string }>,
) {
  const contents: TikTokContent[] = hits.slice(0, 10).map((hit) => ({
    content_id: String(hit.id),
    content_type: "product",
    content_name: hit.name,
  }));
  ttqTrack("Search", {
    contents,
    search_string: searchString,
    currency: "RON",
    value: hits.length,
  });
}

export function trackTikTokPurchase(
  items: CartItem[],
  total: number,
  currency: string,
  orderNumber: string,
) {
  const contents = tikTokContentsFromCart(items);
  const payload = eventPayload(contents, total, currency, {
    status: "submitted",
    description: "cash_on_delivery",
  });

  const dedupe = { event_id: orderNumber };
  ttqTrack("Purchase", { ...payload, order_id: orderNumber }, dedupe);
  ttqTrack("PlaceAnOrder", { ...payload, order_id: orderNumber }, dedupe);
}

/** @deprecated Use trackTikTokPurchase — kept for compatibility */
export function trackTikTokCompletePayment(
  items: CartItem[],
  total: number,
  currency: string,
  orderNumber: string,
) {
  trackTikTokPurchase(items, total, currency, orderNumber);
}
