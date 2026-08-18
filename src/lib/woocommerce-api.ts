import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";
import { getWcStoreBaseUrl } from "@/lib/wc-store-config";
import type { WooCommerceOrder } from "@/lib/wordpress-import-shared";

export type {
  WooCommerceOrder,
  WooCommerceOrderLineItem,
} from "@/lib/wordpress-import-shared";

export async function isWooCommerceApiConfigured(): Promise<boolean> {
  const [key, secret] = await Promise.all([
    getRuntimeSetting("WC_CONSUMER_KEY"),
    getRuntimeSetting("WC_CONSUMER_SECRET"),
  ]);
  return Boolean(key && secret);
}

export async function getWooCommerceCredentials(): Promise<{
  baseUrl: string;
  key: string;
  secret: string;
} | null> {
  const [key, secret, base] = await Promise.all([
    getRuntimeSetting("WC_CONSUMER_KEY"),
    getRuntimeSetting("WC_CONSUMER_SECRET"),
    getRuntimeSetting("WC_STORE_BASE_URL"),
  ]);
  if (!key || !secret) return null;
  return {
    key,
    secret,
    baseUrl: (base || getWcStoreBaseUrl()).replace(/\/$/, ""),
  };
}

async function getCredentials(): Promise<{ key: string; secret: string }> {
  const creds = await getWooCommerceCredentials();
  if (!creds) {
    throw new Error("WC_CONSUMER_KEY / WC_CONSUMER_SECRET ontbreken.");
  }
  return { key: creds.key, secret: creds.secret };
}

export type FetchWcOrdersResult = {
  orders: WooCommerceOrder[];
  total: number;
  totalPages: number;
  page: number;
};

export async function fetchWooCommerceOrders(options: {
  page?: number;
  perPage?: number;
  modifiedAfter?: string;
  order?: "asc" | "desc";
}): Promise<FetchWcOrdersResult> {
  const { key, secret } = await getCredentials();
  const page = Math.max(1, options.page ?? 1);
  const perPage = Math.min(100, Math.max(1, options.perPage ?? 50));
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    orderby: "date",
    order: options.order ?? "desc",
  });
  if (options.modifiedAfter) {
    params.set("modified_after", options.modifiedAfter);
  }

  const base =
    (await getRuntimeSetting("WC_STORE_BASE_URL")) || getWcStoreBaseUrl();
  const url = `${base.replace(/\/$/, "")}/wp-json/wc/v3/orders?${params}`;
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WooCommerce orders ${res.status}: ${text.slice(0, 200)}`);
  }

  const orders = (await res.json()) as WooCommerceOrder[];
  const total = Number.parseInt(res.headers.get("X-WP-Total") || "0", 10) || orders.length;
  const totalPages =
    Number.parseInt(res.headers.get("X-WP-TotalPages") || "0", 10) ||
    Math.max(1, Math.ceil(total / perPage));

  return { orders, total, totalPages, page };
}
