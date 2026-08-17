import "server-only";

import { hashEmail, hashExternalId, hashPhone } from "@/lib/tiktok-hash";
import { getRuntimeSetting } from "@/lib/site-settings-db";

const EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

async function getTikTokEventsConfig(): Promise<{ pixelId: string; token: string }> {
  const [pixel, token] = await Promise.all([
    getRuntimeSetting("NEXT_PUBLIC_TIKTOK_PIXEL_ID"),
    getRuntimeSetting("TIKTOK_EVENTS_API_ACCESS_TOKEN"),
  ]);
  return {
    pixelId: pixel.trim() || process.env.TIKTOK_PIXEL_ID?.trim() || "",
    token: token.trim(),
  };
}

function tikTokCurrency(currency: string): string {
  const c = currency.trim().toLowerCase();
  if (c === "lei" || c === "ron") return "RON";
  return currency.trim().toUpperCase() || "RON";
}

export type TikTokServerEventItem = {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type SendTikTokPurchaseInput = {
  eventId: string;
  orderNumber: string;
  total: number;
  currency: string;
  items: TikTokServerEventItem[];
  customerEmail?: string | null;
  customerPhone?: string | null;
  ttclid?: string | null;
  pageUrl?: string;
  referrer?: string;
  ip?: string | null;
  userAgent?: string | null;
};

type TikTokEventPayload = {
  event_source: "web";
  event_source_id: string;
  data: Array<{
    event: string;
    event_time: number;
    event_id: string;
    user?: Record<string, string>;
    page?: { url?: string; referrer?: string };
    properties?: Record<string, unknown>;
  }>;
};

function buildUser(input: SendTikTokPurchaseInput): Record<string, string> | undefined {
  const user: Record<string, string> = {};
  const email = hashEmail(input.customerEmail);
  const phone = hashPhone(input.customerPhone);
  const externalId = hashExternalId(input.eventId);

  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (externalId) user.external_id = externalId;
  if (input.ttclid?.trim()) user.ttclid = input.ttclid.trim();
  if (input.ip?.trim()) user.ip = input.ip.trim();
  if (input.userAgent?.trim()) user.user_agent = input.userAgent.trim();

  return Object.keys(user).length > 0 ? user : undefined;
}

function buildProperties(input: SendTikTokPurchaseInput) {
  return {
    currency: tikTokCurrency(input.currency),
    value: input.total,
    order_id: input.orderNumber,
    contents: input.items.map((item) => ({
      content_id: String(item.productId),
      content_type: "product",
      content_name: item.name,
      quantity: item.quantity,
      price: item.unitPrice,
    })),
    status: "submitted",
  };
}

async function postEvents(payload: TikTokEventPayload): Promise<{ ok: boolean; message?: string }> {
  const { pixelId, token } = await getTikTokEventsConfig();
  if (!token || !pixelId) {
    return { ok: false, message: "TikTok Events API not configured" };
  }

  const res = await fetch(EVENTS_API_URL, {
    method: "POST",
    headers: {
      "Access-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: { code?: number; message?: string } = {};
  if (text) {
    try {
      json = JSON.parse(text) as { code?: number; message?: string };
    } catch {
      json = { message: text.slice(0, 500) };
    }
  }

  if (!res.ok || (json.code != null && json.code !== 0)) {
    return {
      ok: false,
      message: json.message ?? `HTTP ${res.status}`,
    };
  }

  return { ok: true };
}

async function sendEvent(
  eventName: string,
  input: SendTikTokPurchaseInput,
): Promise<{ ok: boolean; message?: string }> {
  const eventTime = Math.floor(Date.now() / 1000);
  const user = buildUser(input);
  const properties = buildProperties(input);

  const data: TikTokEventPayload["data"][0] = {
    event: eventName,
    event_time: eventTime,
    event_id: input.eventId,
    properties,
  };

  if (user) data.user = user;
  if (input.pageUrl || input.referrer) {
    data.page = {
      url: input.pageUrl,
      referrer: input.referrer,
    };
  }

  const { pixelId } = await getTikTokEventsConfig();
  return postEvents({
    event_source: "web",
    event_source_id: pixelId,
    data: [data],
  });
}

/** Server-side Purchase + PlaceAnOrder (dedupe with pixel via matching event_id). */
export async function sendTikTokPurchaseEvents(
  input: SendTikTokPurchaseInput,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  const purchase = await sendEvent("Purchase", input);
  if (!purchase.ok && purchase.message) {
    errors.push(`Purchase: ${purchase.message}`);
  }

  const place = await sendEvent("PlaceAnOrder", input);
  if (!place.ok && place.message) {
    errors.push(`PlaceAnOrder: ${place.message}`);
  }

  return { ok: errors.length === 0, errors };
}

export async function isTikTokEventsApiConfigured(): Promise<boolean> {
  const { pixelId, token } = await getTikTokEventsConfig();
  return Boolean(token && pixelId);
}
