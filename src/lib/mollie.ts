/** Mollie Payments API (v2) — thin fetch wrapper. */
import "server-only";

import {
  filterShopMollieMethods,
  mollieLocaleForCountry,
  type MollieMethodPublic,
} from "@/lib/mollie-methods";
import { getRuntimeSetting } from "@/lib/site-settings-db";

const MOLLIE_API = "https://api.mollie.com/v2";

export type MollieAmount = { currency: string; value: string };

export type MolliePayment = {
  id: string;
  status: string;
  amount: MollieAmount;
  description: string;
  metadata?: Record<string, string> | string | null;
  redirectUrl?: string | null;
  webhookUrl?: string | null;
  profileId?: string;
  _links?: {
    checkout?: { href: string; type: string };
  };
};

async function getApiKey(): Promise<string> {
  const key = await getRuntimeSetting("MOLLIE_API_KEY");
  if (!key) {
    throw new Error("MOLLIE_API_KEY ontbreekt.");
  }
  return key;
}

export async function isMollieConfigured(): Promise<boolean> {
  return Boolean(await getRuntimeSetting("MOLLIE_API_KEY"));
}

export function formatMollieAmount(total: number, currency: string): MollieAmount {
  const value = (Math.round(total * 100) / 100).toFixed(2);
  return { currency: currency.toUpperCase(), value };
}

async function mollieFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = await getApiKey();
  const timeoutMs = path.startsWith("/methods") ? 8000 : 20000;
  const res = await fetch(`${MOLLIE_API}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    detail?: string;
    title?: string;
    status?: number;
  };
  if (!res.ok) {
    const msg = body.detail || body.title || `Mollie HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function createMolliePayment(input: {
  amount: number;
  currency: string;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  metadata: Record<string, string>;
  method?: string | string[];
  locale?: string;
}): Promise<MolliePayment> {
  const profileId = await getRuntimeSetting("MOLLIE_PROFILE_ID");
  const payload: Record<string, unknown> = {
    amount: formatMollieAmount(input.amount, input.currency),
    description: input.description.slice(0, 255),
    redirectUrl: input.redirectUrl,
    webhookUrl: input.webhookUrl,
    metadata: input.metadata,
    locale: input.locale || "nl_NL",
  };
  if (profileId) {
    payload.profileId = profileId;
  }
  if (input.method) {
    payload.method = input.method;
  }
  return mollieFetch<MolliePayment>("/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type MollieMethod = MollieMethodPublic;

type MollieMethodsListResponse = {
  count?: number;
  data?: Array<MollieMethodPublic & { status?: string }>;
  _embedded?: { methods?: Array<MollieMethodPublic & { status?: string }> };
};

function parseMollieMethodsList(body: MollieMethodsListResponse): MollieMethodPublic[] {
  const raw = body._embedded?.methods ?? body.data ?? [];
  return raw
    .filter((m) => Boolean(m?.id) && (!m.status || m.status === "activated"))
    .map((m) => ({
      id: m.id,
      description: m.description || m.id,
      image: m.image,
    }));
}

const methodsCache = new Map<string, { expires: number; methods: MollieMethodPublic[] }>();
const METHODS_CACHE_MS = 60_000;

/** Available Mollie methods for amount/locale/country (Dashboard-enabled only). */
export async function listMollieMethods(input: {
  amount: number;
  currency: string;
  locale?: string;
  billingCountry?: string;
}): Promise<MollieMethodPublic[]> {
  const amount = formatMollieAmount(input.amount, input.currency);
  const locale = input.locale || mollieLocaleForCountry(input.billingCountry || "NL");
  const billingCountry = input.billingCountry?.toUpperCase() || "";
  const cacheKey = `${amount.currency}:${amount.value}:${locale}:${billingCountry}`;
  const cached = methodsCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.methods;
  }

  const qs = new URLSearchParams({
    "amount[currency]": amount.currency,
    "amount[value]": amount.value,
    resource: "payments",
    includeWallets: "applepay",
    sequenceType: "oneoff",
    locale,
  });
  if (billingCountry) qs.set("billingCountry", billingCountry);

  let methods: MollieMethodPublic[] = [];
  try {
    methods = filterShopMollieMethods(
      parseMollieMethodsList(await mollieFetch<MollieMethodsListResponse>(`/methods?${qs.toString()}`)),
    );
  } catch {
    methods = [];
  }
  if (methods.length === 0) {
    const qsAll = new URLSearchParams({
      resource: "payments",
      includeWallets: "applepay",
      sequenceType: "oneoff",
      locale,
    });
    methods = filterShopMollieMethods(
      parseMollieMethodsList(await mollieFetch<MollieMethodsListResponse>(`/methods?${qsAll.toString()}`)),
    );
  }
  if (methods.length > 0) {
    methodsCache.set(cacheKey, { expires: Date.now() + METHODS_CACHE_MS, methods });
  }
  return methods;
}

export async function getMolliePayment(paymentId: string): Promise<MolliePayment> {
  return mollieFetch<MolliePayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function refundMolliePayment(
  paymentId: string,
  amount: MollieAmount,
): Promise<{ id: string; status: string }> {
  return mollieFetch(`/payments/${encodeURIComponent(paymentId)}/refunds`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

const CANCELLABLE_MOLLIE = new Set(["open", "pending", "authorized"]);

export function isMolliePaymentCancellable(status: string): boolean {
  return CANCELLABLE_MOLLIE.has(status);
}

/** Cancel an unpaid Mollie payment (open / pending / authorized). */
export async function cancelMolliePayment(paymentId: string): Promise<MolliePayment> {
  return mollieFetch<MolliePayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "DELETE",
  });
}

export function mollieCheckoutUrl(payment: MolliePayment): string | null {
  return payment._links?.checkout?.href ?? null;
}

export function parseMollieMetadata(
  metadata: MolliePayment["metadata"],
): Record<string, string> {
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as Record<string, string>;
    } catch {
      return {};
    }
  }
  return metadata;
}
