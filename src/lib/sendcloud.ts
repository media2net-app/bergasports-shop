import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";
import { parseOrderCheckoutNotes, type OrderWithItems } from "@/lib/orders";

const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v2";

export type SendcloudParcel = {
  id: number;
  tracking_number?: string | null;
  tracking_url?: string | null;
  carrier?: { code?: string; name?: string } | null;
  label?: { label_printer?: string; normal_printer?: string[] } | null;
};

export type SendcloudLabelAttachResult =
  | {
      ok: true;
      parcelId: number;
      trackingCode: string | null;
      trackingUrl: string | null;
      labelUrl: string | null;
      carrier: string | null;
    }
  | {
      ok: false;
      skipped?: boolean;
      error: string;
    };

async function sendcloudAuthHeader(): Promise<string | null> {
  const publicKey = (await getRuntimeSetting("SENDCLOUD_PUBLIC_KEY")).trim();
  const secretKey = (await getRuntimeSetting("SENDCLOUD_SECRET_KEY")).trim();
  if (!publicKey || !secretKey) {
    return null;
  }
  return `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}`;
}

export async function isSendcloudConfigured(): Promise<boolean> {
  return Boolean(await sendcloudAuthHeader());
}

async function sendcloudFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await sendcloudAuthHeader();
  if (!auth) {
    throw new Error("Sendcloud is niet geconfigureerd.");
  }
  const res = await fetch(`${SENDCLOUD_API}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.error?.message || body.message || `Sendcloud HTTP ${res.status}`);
  }
  return body as T;
}

function splitHouseNumber(address: string): { address: string; house_number: string } {
  const match = address.trim().match(/^(.*?)[\s,]+(\d+\s*[a-zA-Z-]*)$/);
  if (!match) {
    return { address: address.trim() || "—", house_number: "1" };
  }
  return { address: match[1].trim(), house_number: match[2].trim() };
}

async function resolveShippingMethodId(): Promise<number | null> {
  const raw = (await getRuntimeSetting("SENDCLOUD_SHIPPING_METHOD_ID")).trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  return null;
}

export function shippingCountryFromOrder(order: Pick<OrderWithItems, "notes" | "shipping_county">): string {
  const meta = parseOrderCheckoutNotes(order.notes);
  const fromNotes = meta.shippingCountry?.trim().toUpperCase();
  if (fromNotes && /^[A-Z]{2}$/.test(fromNotes)) return fromNotes;
  const county = order.shipping_county?.trim().toUpperCase() ?? "";
  if (/^[A-Z]{2}$/.test(county)) return county;
  return "NL";
}

export async function createSendcloudParcel(input: {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  email?: string | null;
  telephone?: string | null;
  orderNumber: string;
  country?: string;
}): Promise<SendcloudParcel> {
  const split = splitHouseNumber(input.address);
  const methodId = await resolveShippingMethodId();
  const parcel: Record<string, unknown> = {
    name: input.name,
    address: split.address,
    house_number: split.house_number,
    city: input.city,
    postal_code: input.postalCode.replace(/\s+/g, ""),
    country: (input.country ?? "NL").toUpperCase(),
    email: input.email || undefined,
    telephone: input.telephone || undefined,
    order_number: input.orderNumber,
    weight: "1.000",
    request_label: true,
    apply_shipping_rules: true,
  };
  if (methodId != null) {
    parcel.shipment = { id: methodId };
  }
  const data = await sendcloudFetch<{ parcel: SendcloudParcel }>("/parcels", {
    method: "POST",
    body: JSON.stringify({ parcel }),
  });
  return data.parcel;
}
