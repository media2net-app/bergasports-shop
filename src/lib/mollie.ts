/** Mollie Payments API (v2) — thin fetch wrapper. */
import "server-only";

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
  const res = await fetch(`${MOLLIE_API}${path}`, {
    ...init,
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
}): Promise<MolliePayment> {
  const profileId = await getRuntimeSetting("MOLLIE_PROFILE_ID");
  const payload: Record<string, unknown> = {
    amount: formatMollieAmount(input.amount, input.currency),
    description: input.description.slice(0, 255),
    redirectUrl: input.redirectUrl,
    webhookUrl: input.webhookUrl,
    metadata: input.metadata,
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

export type MollieMethod = {
  id: string;
  description: string;
  image?: { size1x?: string; size2x?: string };
};

/** Available Mollie methods for amount/locale (Dashboard-configured). */
export async function listMollieMethods(input: {
  amount: number;
  currency: string;
  locale?: string;
}): Promise<MollieMethod[]> {
  const qs = new URLSearchParams({
    "amount[currency]": input.currency.toUpperCase(),
    "amount[value]": formatMollieAmount(input.amount, input.currency).value,
    resource: "payments",
  });
  if (input.locale) qs.set("locale", input.locale);
  const data = await mollieFetch<{ data: MollieMethod[] }>(`/methods?${qs.toString()}`);
  return data.data ?? [];
}

export async function getMolliePayment(paymentId: string): Promise<MolliePayment> {
  return mollieFetch<MolliePayment>(`/payments/${encodeURIComponent(paymentId)}`);
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
